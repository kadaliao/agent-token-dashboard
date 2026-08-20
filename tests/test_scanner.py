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


if __name__ == "__main__":
    unittest.main()
