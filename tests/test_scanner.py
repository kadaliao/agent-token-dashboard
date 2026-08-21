import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from token_dashboard.pricing import PricingTable
from token_dashboard.scanner import parse_claude_file, parse_codex_file


def record(type_, payload, timestamp="2026-08-20T01:00:00Z"):
    return {"timestamp": timestamp, "type": type_, "payload": payload}


def usage(input_, cached, output, reasoning, writes=0):
    return {
        "input_tokens": input_,
        "cached_input_tokens": cached,
        "cache_write_input_tokens": writes,
        "output_tokens": output,
        "reasoning_output_tokens": reasoning,
        "total_tokens": input_ + output,
    }


class ScannerTests(unittest.TestCase):
    def setUp(self):
        self.pricing = PricingTable(
            {"models": {"test-model": {"input": 1, "cached_input": 0.1, "cache_write": 1.25, "output": 4}}}
        )

    def write_log(self, records):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        path = Path(temp.name) / "session.jsonl"
        path.write_text("".join(json.dumps(item) + "\n" for item in records), encoding="utf-8")
        return path

    def test_cumulative_snapshots_become_turn_deltas_and_reset_recovers(self):
        first = usage(100, 10, 20, 5)
        second = usage(150, 20, 30, 6)
        reset = usage(40, 0, 5, 2)
        path = self.write_log(
            [
                record("session_meta", {"id": "native", "cwd": "/private/code/ledger"}),
                record("event_msg", {"type": "task_started", "turn_id": "turn-1"}),
                record("event_msg", {"type": "token_count", "info": {"total_token_usage": first, "last_token_usage": first}}),
                record("turn_context", {"turn_id": "turn-1", "model": "test-model", "cwd": "/private/code/ledger"}),
                record("event_msg", {"type": "token_count", "info": {"total_token_usage": second, "last_token_usage": usage(50, 10, 10, 1)}}),
                record("event_msg", {"type": "task_complete", "turn_id": "turn-1"}),
                record("event_msg", {"type": "task_started", "turn_id": "turn-2"}),
                record("turn_context", {"turn_id": "turn-2", "model": "test-model"}),
                record("event_msg", {"type": "token_count", "info": {"total_token_usage": reset, "last_token_usage": reset}}),
            ]
        )
        parsed = parse_codex_file(path, self.pricing)
        self.assertEqual(parsed.project, "ledger")
        self.assertEqual(len(parsed.turns), 2)
        self.assertEqual(parsed.turns[0].usage["input_tokens"], 150)
        self.assertEqual(parsed.turns[0].usage["output_tokens"], 30)
        self.assertEqual(parsed.turns[0].usage["reasoning_output_tokens"], 6)
        self.assertTrue(parsed.turns[0].pricing_known)
        self.assertEqual(parsed.turns[1].usage["input_tokens"], 40)
        self.assertEqual(parsed.turns[1].precision, "native_last_after_reset")
        self.assertEqual(parsed.precision, "native_delta_with_resets")

    def test_missing_dimension_remains_unavailable(self):
        partial = {"input_tokens": 10, "output_tokens": 2, "total_tokens": 12}
        path = self.write_log(
            [
                record("session_meta", {"id": "native", "cwd": "/code/project"}),
                record("turn_context", {"turn_id": "turn", "model": "test-model"}),
                record("event_msg", {"type": "token_count", "info": {"total_token_usage": partial, "last_token_usage": partial}}),
            ]
        )
        turn = parse_codex_file(path, self.pricing).turns[0]
        self.assertFalse(turn.available["reasoning_output_tokens"])
        self.assertEqual(turn.usage["reasoning_output_tokens"], 0)

    def test_codex_collects_native_call_name_without_arguments_or_turn_token_split(self):
        path = self.write_log([
            record("response_item", {"type": "function_call", "call_id": "call-native", "name": "exec_command", "arguments": json.dumps({"cmd": "rg PRIVATE_ARGUMENT | head"})}),
            record("response_item", {"type": "custom_tool_call", "call_id": "call-custom", "name": "Grab", "input": "PRIVATE_INPUT"}),
            record("event_msg", {"type": "token_count", "info": {"total_token_usage": usage(10, 0, 2, 0), "last_token_usage": usage(10, 0, 2, 0)}}),
        ])
        parsed = parse_codex_file(path, self.pricing)
        self.assertEqual([call.name for call in parsed.tool_calls], ["exec_command", "Grab"])
        self.assertTrue(all(call.token_count is None and call.token_precision == "unknown" for call in parsed.tool_calls))
        self.assertEqual(
            [item.command_name for item in parsed.command_invocations], ["rg", "head"]
        )

    def test_codex_invalid_arguments_do_not_fall_back_to_raw_string(self):
        path = self.write_log([
            record("response_item", {"type": "function_call", "call_id": "bad", "name": "exec_command", "arguments": "rg PRIVATE_PATH"}),
        ])
        parsed = parse_codex_file(path, self.pricing)
        self.assertEqual([item.command_name for item in parsed.command_invocations], ["unknown"])

    def test_codex_custom_exec_parses_javascript_orchestration_not_js_as_shell(self):
        path = self.write_log([
            record("response_item", {
                "type": "custom_tool_call", "call_id": "exec-js", "name": "exec",
                "input": "const result = await tools.exec_command({cmd: 'rg x | head'}); await tools.wait({cell_id: 'x'});",
            }),
        ])
        parsed = parse_codex_file(path, self.pricing)
        self.assertEqual([item.command_name for item in parsed.command_invocations], ["rg", "head"])

    def test_missing_call_ids_do_not_merge_same_name_and_timestamp(self):
        path = self.write_log([
            record("response_item", {"type": "function_call", "name": "exec_command"}),
            record("response_item", {"type": "function_call", "name": "exec_command"}),
        ])
        calls = parse_codex_file(path, self.pricing).tool_calls
        self.assertEqual(len(calls), 2)
        self.assertNotEqual(calls[0].event_key, calls[1].event_key)

    def test_claude_native_usage_is_deduplicated_and_reasoning_stays_unknown(self):
        message = {
            "id": "message-native-id",
            "model": "claude-test",
            "role": "assistant",
            "content": "PRIVATE_RESPONSE_MUST_NOT_BE_PARSED",
            "usage": {
                "input_tokens": 2,
                "cache_creation_input_tokens": 3,
                "cache_read_input_tokens": 5,
                "output_tokens": 7,
            },
        }
        entry = {
            "type": "assistant",
            "timestamp": "2026-08-20T02:00:00Z",
            "cwd": "/private/code/claude-project",
            "uuid": "record-native-id",
            "message": message,
        }
        updated = json.loads(json.dumps(entry))
        updated["message"]["usage"]["output_tokens"] = 11
        path = self.write_log([entry, updated])
        parsed = parse_claude_file(path, self.pricing)
        self.assertEqual(parsed.tool, "Claude Code")
        self.assertEqual(parsed.project, "claude-project")
        self.assertEqual(len(parsed.turns), 1)
        turn = parsed.turns[0]
        self.assertEqual(turn.usage["input_tokens"], 10)
        self.assertEqual(turn.usage["cached_input_tokens"], 5)
        self.assertEqual(turn.usage["cache_write_input_tokens"], 3)
        self.assertEqual(turn.usage["output_tokens"], 11)
        self.assertFalse(turn.available["reasoning_output_tokens"])
        self.assertEqual(turn.precision, "native_message_usage")

    def test_claude_collects_tool_use_name_without_input_or_message_text(self):
        path = self.write_log([{
            "type": "assistant", "timestamp": "2026-08-20T02:00:00Z", "uuid": "record-id",
            "message": {"id": "message-id", "model": "claude-test", "usage": {"input_tokens": 1, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 1},
                        "content": [{"type": "tool_use", "id": "tool-id", "name": "Read", "input": {"path": "PRIVATE_PATH"}}, {"type": "text", "text": "PRIVATE_TEXT"}]},
        }])
        parsed = parse_claude_file(path, self.pricing)
        self.assertEqual([call.name for call in parsed.tool_calls], ["Read"])
        self.assertEqual(parsed.tool_calls[0].token_precision, "unknown")

    def test_claude_bash_reads_only_structured_command_field(self):
        path = self.write_log([{
            "type": "assistant", "timestamp": "2026-08-20T02:00:00Z",
            "message": {"id": "message", "model": "claude-test", "usage": {"input_tokens": 1},
                        "content": [{"type": "tool_use", "id": "bash-id", "name": "Bash",
                                     "input": {"command": "find . -type f | grep x", "other": "PRIVATE"}}]},
        }])
        parsed = parse_claude_file(path, self.pricing)
        self.assertEqual([item.command_name for item in parsed.command_invocations], ["find", "grep"])


if __name__ == "__main__":
    unittest.main()
