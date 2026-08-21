from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass
from typing import Any

import bashlex
import esprima


MAX_SHELL_RECURSION = 3
_ASSIGNMENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
_SAFE_NAME = re.compile(r"^[A-Za-z0-9._+@%:,=\[\]-]{1,128}$")


@dataclass(frozen=True)
class CommandInvocation:
    """Privacy-safe command identity derived from one native shell tool call."""

    event_key: str
    parent_event_key: str
    command_name: str
    occurred_at: str | None
    outer_tool: str


def _hash_invocation(parent_event_key: str, ordinal: int, name: str) -> str:
    return hashlib.sha256(
        f"command:{parent_event_key}:{ordinal}:{name}".encode("utf-8")
    ).hexdigest()


def _basename(word: str) -> str | None:
    value = word.strip()
    if not value or "\x00" in value:
        return None
    name = os.path.basename(value.rstrip("/"))
    return name if name and _SAFE_NAME.fullmatch(name) else None


def _word_values(node: Any) -> list[str | None]:
    values: list[str | None] = []
    for part in getattr(node, "parts", []):
        if part.kind != "word":
            continue
        # bashlex exposes parameter, command, process, and arithmetic expansion
        # as child nodes. An executable containing any expansion is dynamic.
        values.append(None if getattr(part, "parts", []) else part.word)
    return values


def _unwrap(words: list[str | None], depth: int) -> tuple[str | None, str | None]:
    """Return (executable, static shell payload) from AST-tokenized words.

    Dynamic expansions are deliberately rejected for executable positions. xargs
    remains xargs because its child invocation count depends on runtime input.
    """
    if not words:
        return None, None
    if words[0] is None:
        return None, None
    name = _basename(words[0])
    if not name:
        return None, None
    rest = words[1:]

    if name == "env":
        index = 0
        while index < len(rest):
            word = rest[index]
            if word is None:
                return None, None
            if word == "--":
                index += 1
                break
            if _ASSIGNMENT.match(word):
                index += 1
                continue
            if word in {"-u", "--unset", "-C", "--chdir"}:
                index += 2
                continue
            if word.startswith("--unset=") or word.startswith("--chdir="):
                index += 1
                continue
            if word.startswith("-"):
                return None, None
            break
        return _unwrap(rest[index:], depth)

    if name == "sudo":
        index = 0
        options_with_value = {
            "-C", "--close-from", "-D", "--chdir", "-g", "--group", "-h",
            "--host", "-p", "--prompt", "-R", "--chroot", "-r", "--role",
            "-t", "--type", "-U", "--other-user", "-u", "--user",
        }
        flag_options = {
            "-A", "--askpass", "-b", "--background", "-E", "--preserve-env",
            "-H", "--set-home", "-K", "--remove-timestamp", "-k", "--reset-timestamp",
            "-n", "--non-interactive", "-P", "--preserve-groups", "-S", "--stdin",
            "-V", "--version", "-v", "--validate",
        }
        while index < len(rest):
            word = rest[index]
            if word is None:
                return None, None
            if word == "--":
                index += 1
                break
            if word in options_with_value:
                index += 2
                continue
            if word in flag_options or word.startswith("--preserve-env="):
                index += 1
                continue
            if word.startswith("-"):
                return None, None
            break
        return _unwrap(rest[index:], depth)

    if name == "command":
        index = 0
        while index < len(rest) and rest[index] in {"-p", "--"}:
            index += 1
        if index < len(rest) and rest[index] in {"-v", "-V"}:
            return "command", None
        return _unwrap(rest[index:], depth)

    if name == "nohup":
        index = 1 if rest and rest[0] == "--" else 0
        if index < len(rest) and (rest[index] is None or rest[index].startswith("-")):
            return None, None
        return _unwrap(rest[index:], depth)

    # xargs is the only invocation whose count is statically known. Its child
    # command may execute zero, one, or many times depending on stdin.
    if name == "xargs":
        return "xargs", None

    if name in {"bash", "sh"} and depth < MAX_SHELL_RECURSION:
        index = 0
        while index < len(rest):
            option = rest[index]
            if option is None:
                return None, None
            if option == "--":
                break
            if option == "-c" or (option.startswith("-") and "c" in option[1:]):
                if index + 1 >= len(rest):
                    return None, None
                payload = rest[index + 1]
                return (name, payload) if payload is not None else (None, None)
            if not option.startswith("-"):
                break
            index += 1
    return name, None


def _command_nodes(nodes: list[Any]) -> list[Any]:
    found: list[Any] = []

    def visit(node: Any) -> None:
        if node.kind == "command":
            found.append(node)
            # Words can contain substitutions. They are arguments to this simple
            # command, not independently counted shell commands.
            for part in getattr(node, "parts", []):
                if part.kind not in {"word", "assignment", "redirect"}:
                    visit(part)
            return
        for part in getattr(node, "parts", []):
            visit(part)
        command = getattr(node, "command", None)
        if command is not None:
            visit(command)
        list_node = getattr(node, "list", None)
        if list_node is not None:
            for part in list_node:
                visit(part)

    for root in nodes:
        visit(root)
    return found


def parse_command_names(command: str, depth: int = 0) -> list[str]:
    if not isinstance(command, str) or not command.strip() or depth > MAX_SHELL_RECURSION:
        return []
    try:
        roots = bashlex.parse(command)
    # bashlex 0.18 can also surface internal AttributeError/IndexError for a few
    # unsupported substitution forms. No parser failure may escape or trigger a
    # fallback string guess.
    except Exception:
        return []
    names: list[str] = []
    for node in _command_nodes(roots):
        executable, payload = _unwrap(_word_values(node), depth)
        if not executable:
            names.append("unknown")
            continue
        if payload is not None:
            nested = parse_command_names(payload, depth + 1)
            names.extend(nested or ["unknown"])
        else:
            names.append(executable)
    return names


def invocations_for_call(
    *, parent_event_key: str, outer_tool: str, occurred_at: str | None, command: str | None
) -> list[CommandInvocation]:
    names = parse_command_names(command) if command is not None else []
    if not names:
        names = ["unknown"]
    return [
        CommandInvocation(
            event_key=_hash_invocation(parent_event_key, ordinal, name),
            parent_event_key=hashlib.sha256(
                f"parent:{parent_event_key}".encode("utf-8")
            ).hexdigest(),
            command_name=name,
            occurred_at=occurred_at,
            outer_tool=outer_tool,
        )
        for ordinal, name in enumerate(names, 1)
    ]


def _static_js_string(node: dict[str, Any]) -> str | None:
    if node.get("type") == "Literal" and isinstance(node.get("value"), str):
        return node["value"]
    if node.get("type") == "TemplateLiteral" and not node.get("expressions"):
        quasis = node.get("quasis")
        if isinstance(quasis, list) and len(quasis) == 1:
            value = quasis[0].get("value") if isinstance(quasis[0], dict) else None
            cooked = value.get("cooked") if isinstance(value, dict) else None
            return cooked if isinstance(cooked, str) else None
    return None


def _shell_argument(call: dict[str, Any]) -> tuple[bool, str | None]:
    callee = call.get("callee")
    if not isinstance(callee, dict) or callee.get("type") != "MemberExpression":
        return False, None
    if callee.get("computed"):
        return False, None
    owner = callee.get("object")
    prop = callee.get("property")
    if not (
        isinstance(owner, dict) and owner.get("type") == "Identifier" and owner.get("name") == "tools"
        and isinstance(prop, dict) and prop.get("type") == "Identifier"
        and prop.get("name") in {"exec_command", "shell_command"}
    ):
        return False, None
    field = "cmd" if prop["name"] == "exec_command" else "command"
    arguments = call.get("arguments")
    if not isinstance(arguments, list) or not arguments:
        return True, None
    obj = arguments[0]
    if not isinstance(obj, dict) or obj.get("type") != "ObjectExpression":
        return True, None
    matches: list[dict[str, Any]] = []
    for item in obj.get("properties", []):
        if not isinstance(item, dict) or item.get("type") != "Property" or item.get("computed"):
            return True, None
        key = item.get("key")
        key_name = key.get("name") if isinstance(key, dict) and key.get("type") == "Identifier" else key.get("value") if isinstance(key, dict) and key.get("type") == "Literal" else None
        if key_name == field:
            matches.append(item)
    if len(matches) != 1:
        return True, None
    return True, _static_js_string(matches[0].get("value", {}))


def command_names_from_exec_source(source: str) -> list[str]:
    """Extract static nested shell calls from Codex JavaScript orchestration."""
    if not isinstance(source, str) or not source.strip():
        return ["unknown"]
    try:
        # Codex orchestration is an async-module body. Wrapping permits top-level
        # await while preserving its statements and without evaluating source.
        tree = esprima.parseScript(f"async function __codex_exec__() {{\n{source}\n}}")
        raw = tree.toDict()
    # esprima 4 can surface AssertionError for nested template constructs it
    # cannot parse. Treat every parser failure as unknown; never fall back to
    # scanning JavaScript text.
    except Exception:
        return ["unknown"]

    payloads: list[str | None] = []

    def visit(value: Any) -> None:
        if isinstance(value, dict):
            if value.get("type") == "CallExpression":
                matched, payload = _shell_argument(value)
                if matched:
                    payloads.append(payload)
            for child in value.values():
                visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)

    visit(raw)
    if not payloads:
        return ["unknown"]
    names: list[str] = []
    for payload in payloads:
        names.extend(parse_command_names(payload) if payload is not None else ["unknown"])
    return names or ["unknown"]


def invocations_for_exec(
    *, parent_event_key: str, occurred_at: str | None, source: str | None
) -> list[CommandInvocation]:
    names = command_names_from_exec_source(source) if source is not None else ["unknown"]
    return [
        CommandInvocation(
            event_key=_hash_invocation(parent_event_key, ordinal, name),
            parent_event_key=hashlib.sha256(
                f"parent:{parent_event_key}".encode("utf-8")
            ).hexdigest(),
            command_name=name,
            occurred_at=occurred_at,
            outer_tool="exec",
        )
        for ordinal, name in enumerate(names, 1)
    ]
