import unittest
from unittest import mock

from token_dashboard.commands import (
    command_names_from_exec_source,
    invocations_for_call,
    parse_command_names,
)


class CommandParserTests(unittest.TestCase):
    def test_pipelines_lists_multiline_and_basename(self):
        command = "A=1 /usr/local/bin/rg 'quoted value' | head -1\nfind . -type f && git status; pwd"
        self.assertEqual(
            parse_command_names(command), ["rg", "head", "find", "git", "pwd"]
        )

    def test_redirects_and_assignments_do_not_hide_executable(self):
        self.assertEqual(parse_command_names("X=y grep x < input > output"), ["grep"])

    def test_wrappers_use_ast_words_and_conservative_runtime_semantics(self):
        self.assertEqual(parse_command_names("env A=1 git status"), ["git"])
        self.assertEqual(parse_command_names("sudo -u root command -- /usr/bin/rg x"), ["rg"])
        self.assertEqual(parse_command_names("nohup python3 job.py"), ["python3"])
        self.assertEqual(parse_command_names("xargs -n 1 grep"), ["xargs"])
        self.assertEqual(parse_command_names("env --unknown git status"), ["unknown"])

    def test_static_shell_c_recurses_but_is_bounded(self):
        self.assertEqual(parse_command_names("bash -c 'rg x && grep y z'"), ["rg", "grep"])
        nested = "bash -c \"bash -c 'bash -c \\\"bash -c pwd\\\"'\""
        self.assertTrue(parse_command_names(nested))

    def test_substitution_in_argument_is_not_counted_as_a_main_command(self):
        self.assertEqual(parse_command_names("echo $(find . -type f)"), ["echo"])

    def test_dynamic_executable_words_are_unknown(self):
        for command in ("$CMD x", "${CMD} x", "$(echo rg) x", '"$CMD" x'):
            self.assertEqual(parse_command_names(command), ["unknown"])

    def test_unsafe_or_excessive_basename_is_unknown(self):
        self.assertEqual(parse_command_names("'name with space' arg"), ["unknown"])
        self.assertEqual(parse_command_names("a" * 129), ["unknown"])

    def test_malformed_and_empty_payloads_become_one_unknown_invocation(self):
        for command in ("'unterminated", "", None):
            invocations = invocations_for_call(
                parent_event_key="a" * 64,
                outer_tool="exec_command",
                occurred_at="2026-08-21T00:00:00Z",
                command=command,
            )
            self.assertEqual([item.command_name for item in invocations], ["unknown"])

    def test_parser_internal_failure_is_contained_as_unknown(self):
        with mock.patch("token_dashboard.commands.bashlex.parse", side_effect=AttributeError("parser")):
            self.assertEqual(parse_command_names("rg x"), [])

    def test_one_call_produces_deterministic_distinct_invocations(self):
        first = invocations_for_call(
            parent_event_key="b" * 64,
            outer_tool="exec_command",
            occurred_at=None,
            command="rg x | head",
        )
        second = invocations_for_call(
            parent_event_key="b" * 64,
            outer_tool="exec_command",
            occurred_at=None,
            command="rg x | head",
        )
        self.assertEqual([item.command_name for item in first], ["rg", "head"])
        self.assertEqual([item.event_key for item in first], [item.event_key for item in second])
        self.assertNotEqual(first[0].event_key, first[1].event_key)

    def test_exec_javascript_extracts_only_static_nested_shell_calls(self):
        source = """
        const a = await tools.exec_command({cmd: "rg x | head"});
        await tools.read_mcp_resource({server: "private"});
        await tools.shell_command({command: `git status && find .`});
        "grep is only text";
        """
        self.assertEqual(
            command_names_from_exec_source(source), ["rg", "head", "git", "find"]
        )

    def test_exec_javascript_dynamic_or_unparseable_shell_is_unknown(self):
        self.assertEqual(
            command_names_from_exec_source("await tools.exec_command({cmd: variable});"),
            ["unknown"],
        )
        self.assertEqual(
            command_names_from_exec_source("await tools.exec_command({cmd: `rg ${term}`});"),
            ["unknown"],
        )
        self.assertEqual(command_names_from_exec_source("const = invalid"), ["unknown"])

    def test_exec_javascript_other_tools_do_not_become_commands(self):
        self.assertEqual(
            command_names_from_exec_source("await tools.wait({cell_id: 'x'}); const word = 'rg';"),
            ["unknown"],
        )
        with mock.patch("token_dashboard.commands.esprima.parseScript", side_effect=AssertionError("parser")):
            self.assertEqual(command_names_from_exec_source("await tools.exec_command({cmd: 'rg'});"), ["unknown"])


if __name__ == "__main__":
    unittest.main()
