from __future__ import annotations

import hashlib
import json
import os
from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable

from .pricing import PricingTable

COUNTERS = (
    "input_tokens",
    "cached_input_tokens",
    "cache_write_input_tokens",
    "output_tokens",
    "reasoning_output_tokens",
)


def _timestamp(value: Any) -> str | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _project_label(cwd: Any) -> str:
    if not isinstance(cwd, str) or not cwd.strip():
        return "Unknown project"
    label = Path(cwd.rstrip(os.sep)).name.strip()
    return label or "Filesystem root"


def _usage(raw: Any) -> tuple[dict[str, int], dict[str, bool]]:
    raw = raw if isinstance(raw, dict) else {}
    values: dict[str, int] = {}
    available: dict[str, bool] = {}
    for key in COUNTERS:
        value = raw.get(key)
        available[key] = isinstance(value, (int, float)) and not isinstance(value, bool)
        values[key] = max(int(value), 0) if available[key] else 0
    return values, available


@dataclass
class Turn:
    turn_id: str
    sequence: int
    event_key: str
    started_at: str | None = None
    ended_at: str | None = None
    model: str | None = None
    usage: dict[str, int] = field(default_factory=lambda: {key: 0 for key in COUNTERS})
    available: dict[str, bool] = field(default_factory=lambda: {key: False for key in COUNTERS})
    cost: float | None = 0.0
    pricing_known: bool = True
    cost_reason: str = "estimated_standard_api_rate"
    precision: str = "native_delta"
    pricing_usages: list[dict[str, int]] = field(default_factory=list, repr=False)

    def add_usage(
        self,
        values: dict[str, int],
        available: dict[str, bool],
        precision: str,
    ) -> None:
        for key in COUNTERS:
            self.usage[key] += values[key]
            self.available[key] = self.available[key] or available[key]
        self.pricing_usages.append(values.copy())
        if precision != "native_delta":
            self.precision = precision

    def estimate_cost(self, pricing: PricingTable) -> None:
        self.cost = 0.0
        self.pricing_known = True
        self.cost_reason = "estimated_standard_api_rate"
        for usage in self.pricing_usages:
            result = pricing.estimate(self.model, usage)
            if result.value is None:
                self.pricing_known = False
                self.cost = None
                self.cost_reason = result.reason
                return
            self.cost = float(self.cost or 0) + result.value


@dataclass(frozen=True)
class ToolCall:
    """A native call identity and name only; arguments and results are never retained."""

    event_key: str
    name: str
    occurred_at: str | None
    token_count: int | None = None
    token_precision: str = "unknown"


@dataclass
class ParsedSession:
    public_id: str
    tool: str
    project: str
    model: str | None
    started_at: str | None
    ended_at: str | None
    turns: list[Turn]
    tool_calls: list[ToolCall]
    parse_errors: int
    precision: str


def parse_codex_file(path: Path, pricing: PricingTable) -> ParsedSession:
    public_id = hashlib.sha256(f"codex:{path}".encode("utf-8")).hexdigest()[:20]
    project = "Unknown project"
    session_model: str | None = None
    first_timestamp: str | None = None
    last_timestamp: str | None = None
    active_turn_id: str | None = None
    turns: OrderedDict[str, Turn] = OrderedDict()
    previous_total: dict[str, int] | None = None
    parse_errors = 0
    reset_recoveries = 0
    unattributed_index = 0
    tool_calls: OrderedDict[str, ToolCall] = OrderedDict()
    call_ordinal = 0

    def ensure_turn(turn_id: str, started_at: str | None = None) -> Turn:
        if turn_id not in turns:
            event_key = hashlib.sha256(
                f"codex:{public_id}:{turn_id}".encode("utf-8")
            ).hexdigest()
            turns[turn_id] = Turn(
                turn_id=event_key[:20],
                sequence=len(turns) + 1,
                event_key=event_key,
                started_at=started_at,
            )
        elif started_at and turns[turn_id].started_at is None:
            turns[turn_id].started_at = started_at
        return turns[turn_id]

    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            try:
                record = json.loads(line)
            except (json.JSONDecodeError, UnicodeError):
                parse_errors += 1
                continue
            if not isinstance(record, dict):
                continue

            stamp = _timestamp(record.get("timestamp"))
            if stamp:
                first_timestamp = first_timestamp or stamp
                last_timestamp = stamp
            record_type = record.get("type")
            payload = record.get("payload") if isinstance(record.get("payload"), dict) else {}

            if record_type == "session_meta":
                project = _project_label(payload.get("cwd"))
                continue

            if record_type == "turn_context":
                turn_id = payload.get("turn_id")
                if isinstance(turn_id, str) and turn_id:
                    active_turn_id = turn_id
                    turn = ensure_turn(turn_id, stamp)
                    if isinstance(payload.get("model"), str):
                        turn.model = payload["model"]
                        session_model = payload["model"]
                    if payload.get("cwd"):
                        project = _project_label(payload.get("cwd"))
                continue

            # Native response items identify calls but do not assign token usage
            # to an individual call. Deliberately do not inspect arguments/output.
            if record_type == "response_item":
                call_type = payload.get("type")
                name = payload.get("name")
                if call_type in {"function_call", "custom_tool_call"} and isinstance(name, str) and name:
                    call_ordinal += 1
                    native_id = payload.get("call_id") or payload.get("id")
                    # Only a native id is safe to deduplicate across transcripts.
                    # Timestamp/name collisions without it are distinct calls.
                    identity = native_id if isinstance(native_id, str) and native_id else f"{public_id}:{call_ordinal}"
                    prefix = "codex-call-id" if isinstance(native_id, str) and native_id else "codex-call-local"
                    event_key = hashlib.sha256(f"{prefix}:{identity}".encode("utf-8")).hexdigest()
                    tool_calls[event_key] = ToolCall(event_key, name, stamp)
                continue

            if record_type != "event_msg":
                continue
            event_type = payload.get("type")
            event_turn_id = payload.get("turn_id")
            if event_type == "task_started" and isinstance(event_turn_id, str):
                active_turn_id = event_turn_id
                ensure_turn(event_turn_id, _timestamp(payload.get("started_at")) or stamp)
                continue
            if event_type in {"task_complete", "turn_aborted"} and isinstance(event_turn_id, str):
                turn = ensure_turn(event_turn_id)
                turn.ended_at = _timestamp(payload.get("completed_at")) or stamp
                if active_turn_id == event_turn_id:
                    active_turn_id = None
                continue
            if event_type != "token_count":
                continue

            info = payload.get("info") if isinstance(payload.get("info"), dict) else {}
            total, total_available = _usage(info.get("total_token_usage"))
            last, last_available = _usage(info.get("last_token_usage"))
            if not any(total_available.values()) and not any(last_available.values()):
                continue

            precision = "native_delta"
            if previous_total is None:
                delta, available = total, total_available
            else:
                decreased = any(total[key] < previous_total[key] for key in COUNTERS if total_available[key])
                if decreased:
                    delta, available = last, last_available
                    precision = "native_last_after_reset"
                    reset_recoveries += 1
                else:
                    delta = {key: max(total[key] - previous_total[key], 0) for key in COUNTERS}
                    available = total_available
            previous_total = total

            if active_turn_id is None:
                unattributed_index += 1
                active_turn_id = f"unattributed-{unattributed_index}"
            turn = ensure_turn(active_turn_id, stamp)
            turn.ended_at = stamp
            turn.add_usage(delta, available, precision)

    parsed_turns = list(turns.values())
    for turn in parsed_turns:
        turn.started_at = turn.started_at or turn.ended_at or first_timestamp
        turn.ended_at = turn.ended_at or turn.started_at
        turn.model = turn.model or session_model
        if not any(turn.usage.values()):
            turn.pricing_known = False
            turn.cost = None
            turn.cost_reason = "no_usage_snapshot"
        else:
            turn.estimate_cost(pricing)

    return ParsedSession(
        public_id=public_id,
        tool="Codex",
        project=project,
        model=session_model,
        started_at=first_timestamp,
        ended_at=last_timestamp,
        turns=parsed_turns,
        tool_calls=list(tool_calls.values()),
        parse_errors=parse_errors,
        precision="native_delta_with_resets" if reset_recoveries else "native_delta",
    )


def find_codex_logs(root: Path) -> Iterable[Path]:
    if not root.exists():
        return []
    return root.rglob("*.jsonl")


def parse_claude_file(path: Path, pricing: PricingTable) -> ParsedSession:
    """Parse Claude Code assistant usage without reading message content."""
    public_id = hashlib.sha256(f"claude:{path}".encode("utf-8")).hexdigest()[:20]
    project = "Unknown project"
    session_model: str | None = None
    first_timestamp: str | None = None
    last_timestamp: str | None = None
    turns: OrderedDict[str, Turn] = OrderedDict()
    parse_errors = 0
    tool_calls: OrderedDict[str, ToolCall] = OrderedDict()
    call_ordinal = 0

    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            try:
                record = json.loads(line)
            except (json.JSONDecodeError, UnicodeError):
                parse_errors += 1
                continue
            if not isinstance(record, dict):
                continue

            if record.get("cwd"):
                project = _project_label(record.get("cwd"))
            # Read only content-block type/name/id, never text, inputs, or results.
            message = record.get("message") if isinstance(record.get("message"), dict) else {}
            content = message.get("content")
            if record.get("type") == "assistant" and isinstance(content, list):
                stamp = _timestamp(record.get("timestamp"))
                for index, block in enumerate(content):
                    if not isinstance(block, dict) or block.get("type") != "tool_use":
                        continue
                    name = block.get("name")
                    if not isinstance(name, str) or not name:
                        continue
                    call_ordinal += 1
                    native_id = block.get("id")
                    identity = native_id if isinstance(native_id, str) and native_id else f"{public_id}:{call_ordinal}"
                    prefix = "claude-call-id" if isinstance(native_id, str) and native_id else "claude-call-local"
                    event_key = hashlib.sha256(f"{prefix}:{identity}".encode("utf-8")).hexdigest()
                    tool_calls[event_key] = ToolCall(event_key, name, stamp)
            if record.get("type") != "assistant":
                continue
            raw_usage = message.get("usage") if isinstance(message.get("usage"), dict) else None
            if raw_usage is None:
                continue

            native_id = message.get("id") or record.get("uuid")
            if isinstance(native_id, str) and native_id:
                message_key = native_id
            else:
                identity = {
                    "timestamp": record.get("timestamp"),
                    "model": message.get("model"),
                    "usage": {key: raw_usage.get(key) for key in (
                        "input_tokens", "cache_creation_input_tokens",
                        "cache_read_input_tokens", "output_tokens",
                    )},
                }
                message_key = json.dumps(identity, sort_keys=True, separators=(",", ":"))
            def native_counter(key: str) -> tuple[int, bool]:
                value = raw_usage.get(key)
                available = isinstance(value, (int, float)) and not isinstance(value, bool)
                return (max(int(value), 0) if available else 0, available)

            uncached, uncached_available = native_counter("input_tokens")
            cache_write, cache_write_available = native_counter("cache_creation_input_tokens")
            cache_read, cache_read_available = native_counter("cache_read_input_tokens")
            output, output_available = native_counter("output_tokens")
            input_available = uncached_available and cache_write_available and cache_read_available
            values = {
                "input_tokens": uncached + cache_write + cache_read,
                "cached_input_tokens": cache_read,
                "cache_write_input_tokens": cache_write,
                "output_tokens": output,
                "reasoning_output_tokens": 0,
            }
            available = {
                "input_tokens": input_available,
                "cached_input_tokens": cache_read_available,
                "cache_write_input_tokens": cache_write_available,
                "output_tokens": output_available,
                "reasoning_output_tokens": False,
            }
            if not any(available.values()):
                continue

            stamp = _timestamp(record.get("timestamp"))
            if stamp:
                first_timestamp = first_timestamp or stamp
                last_timestamp = stamp
            model = message.get("model") if isinstance(message.get("model"), str) else None
            session_model = model or session_model
            event_key = hashlib.sha256(f"claude:{message_key}".encode("utf-8")).hexdigest()
            turn_id = hashlib.sha256(
                f"{public_id}:{message_key}".encode("utf-8")
            ).hexdigest()[:20]
            sequence = turns[message_key].sequence if message_key in turns else len(turns) + 1
            turn = Turn(
                turn_id=turn_id,
                sequence=sequence,
                event_key=event_key,
                started_at=stamp,
                ended_at=stamp,
                model=model,
                precision="native_message_usage",
            )
            turn.add_usage(values, available, "native_message_usage")
            turn.estimate_cost(pricing)
            turns[message_key] = turn

    return ParsedSession(
        public_id=public_id,
        tool="Claude Code",
        project=project,
        model=session_model,
        started_at=first_timestamp,
        ended_at=last_timestamp,
        turns=list(turns.values()),
        tool_calls=list(tool_calls.values()),
        parse_errors=parse_errors,
        precision="native_message_usage",
    )


def find_claude_logs(root: Path) -> Iterable[Path]:
    if not root.exists():
        return []
    return root.rglob("*.jsonl")


@dataclass(frozen=True)
class Adapter:
    key: str
    label: str
    version: int
    discover: Callable[[Path], Iterable[Path]]
    parse: Callable[[Path, PricingTable], ParsedSession]


ADAPTERS = {
    "codex": Adapter("codex", "Codex", 6, find_codex_logs, parse_codex_file),
    "claude": Adapter("claude", "Claude Code", 3, find_claude_logs, parse_claude_file),
}
