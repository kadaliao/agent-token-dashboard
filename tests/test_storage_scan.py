import json
import sqlite3
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from token_dashboard.scanner import ADAPTERS
from token_dashboard.service import ScanTarget, scan
from token_dashboard.storage import Store


class StorageScanTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.source = self.root / "sessions"
        self.source.mkdir()
        self.database = self.root / "dashboard.sqlite3"
        self.pricing = self.root / "pricing.json"
        self.pricing.write_text(
            json.dumps({"models": {"test-model": {"input": 1, "cached_input": 0.1, "cache_write": 1.25, "output": 4}}}),
            encoding="utf-8",
        )

    def write_session(self):
        stamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        total = {
            "input_tokens": 100,
            "cached_input_tokens": 20,
            "cache_write_input_tokens": 0,
            "output_tokens": 25,
            "reasoning_output_tokens": 5,
            "total_tokens": 125,
        }
        secret = "PROMPT_CONTENT_MUST_NOT_BE_STORED"
        records = [
            {"timestamp": stamp, "type": "session_meta", "payload": {"id": "native-id", "cwd": "/code/private-project"}},
            {"timestamp": stamp, "type": "response_item", "payload": {"type": "message", "content": secret}},
            {"timestamp": stamp, "type": "response_item", "payload": {"type": "function_call", "call_id": "call-id", "name": "exec_command", "arguments": secret}},
            {"timestamp": stamp, "type": "turn_context", "payload": {"turn_id": "turn", "model": "test-model"}},
            {"timestamp": stamp, "type": "event_msg", "payload": {"type": "token_count", "info": {"total_token_usage": total, "last_token_usage": total}}},
        ]
        path = self.source / "session.jsonl"
        path.write_text("".join(json.dumps(item) + "\n" for item in records), encoding="utf-8")
        return secret

    def target(self, root=None, adapter="codex"):
        return ScanTarget(ADAPTERS[adapter], root or self.source)

    def test_repeated_scan_is_idempotent_and_raw_text_is_not_stored(self):
        secret = self.write_session()
        first = scan([self.target()], self.database, self.pricing)
        second = scan([self.target()], self.database, self.pricing)
        self.assertEqual(first["imported"], 1)
        self.assertEqual(second["imported"], 0)
        self.assertEqual(second["skipped"], 1)
        store = Store(self.database)
        try:
            status = store.status()
            dashboard = store.dashboard(30)
        finally:
            store.close()
        self.assertEqual(status["sessions"], 1)
        self.assertEqual(status["turns"], 1)
        self.assertEqual(dashboard["windows"]["30d"]["total_tokens"], 125)
        self.assertEqual(dashboard["rankings"]["native_tools"][0]["label"], "exec_command")
        self.assertEqual(dashboard["rankings"]["native_tools"][0]["share"], 1)
        self.assertEqual(len(dashboard["heatmap"]["dates"]), 30)
        self.assertEqual(dashboard["heatmap"]["scale"], "shared_log_absolute")
        tool = dashboard["heatmap"]["tools"][0]
        self.assertEqual(tool["calls"], 1)
        self.assertEqual(tool["token_precision"], "unknown")
        self.assertEqual(tool["native_tokens"], 0)
        self.assertEqual(dashboard["rankings"]["projects"][0]["label"], "private-project")
        self.assertNotIn(secret.encode(), self.database.read_bytes())
        self.assertNotIn(str(self.source).encode(), self.database.read_bytes())
        self.assertNotIn(str(self.root).encode(), self.database.read_bytes())
        connection = sqlite3.connect(self.database)
        try:
            source_columns = {row[1] for row in connection.execute("PRAGMA table_info(sources)")}
            session_columns = {row[1] for row in connection.execute("PRAGMA table_info(sessions)")}
        finally:
            connection.close()
        self.assertEqual(source_columns & {"path", "root"}, set())
        self.assertNotIn("source_path", session_columns)
        self.assertIn("source_key", source_columns)
        self.assertIn("root_key", source_columns)
        self.assertIn("source_key", session_columns)

    def test_changed_source_replaces_derived_rows(self):
        self.write_session()
        scan([self.target()], self.database, self.pricing)
        path = self.source / "session.jsonl"
        data = json.loads(path.read_text(encoding="utf-8").splitlines()[-1])
        data["payload"]["info"]["total_token_usage"]["input_tokens"] = 200
        data["payload"]["info"]["last_token_usage"]["input_tokens"] = 200
        lines = path.read_text(encoding="utf-8").splitlines()
        lines[-1] = json.dumps(data)
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        result = scan([self.target()], self.database, self.pricing)
        self.assertEqual(result["imported"], 1)
        store = Store(self.database)
        try:
            self.assertEqual(store.dashboard(30)["windows"]["30d"]["total_tokens"], 225)
        finally:
            store.close()

    def test_missing_source_is_removed_by_hashed_root_membership(self):
        self.write_session()
        scan([self.target()], self.database, self.pricing)
        (self.source / "session.jsonl").unlink()
        result = scan([self.target()], self.database, self.pricing)
        self.assertEqual(result["removed"], 1)
        store = Store(self.database)
        try:
            self.assertEqual(store.status()["sessions"], 0)
        finally:
            store.close()

    def test_multiple_roots_are_idempotent_and_remove_only_the_missing_root(self):
        self.write_session()
        second_root = self.root / "second-sessions"
        second_root.mkdir()
        second_path = second_root / "session.jsonl"
        second_path.write_text(
            (self.source / "session.jsonl").read_text(encoding="utf-8"), encoding="utf-8"
        )
        targets = [self.target(), self.target(second_root)]
        first = scan(targets, self.database, self.pricing)
        second = scan(targets, self.database, self.pricing)
        self.assertEqual(first["imported"], 2)
        self.assertEqual(second["skipped"], 2)
        (self.source / "session.jsonl").unlink()
        third = scan(targets, self.database, self.pricing)
        self.assertEqual(third["removed"], 1)
        store = Store(self.database)
        try:
            self.assertEqual(store.status()["sessions"], 1)
        finally:
            store.close()

    def test_missing_native_call_ids_are_not_deduplicated_across_sources(self):
        self.write_session()
        original = self.source / "session.jsonl"
        records = [json.loads(line) for line in original.read_text(encoding="utf-8").splitlines()]
        for record in records:
            payload = record.get("payload", {})
            if payload.get("type") == "function_call":
                payload.pop("call_id", None)
        original.write_text("\n".join(json.dumps(record) for record in records) + "\n", encoding="utf-8")
        duplicate_root = self.root / "duplicate-sessions"
        duplicate_root.mkdir()
        (duplicate_root / "copy.jsonl").write_text(original.read_text(encoding="utf-8"), encoding="utf-8")
        scan([self.target(), self.target(duplicate_root)], self.database, self.pricing)
        store = Store(self.database)
        try:
            tool = store.dashboard(30)["heatmap"]["tools"][0]
        finally:
            store.close()
        self.assertEqual(tool["label"], "exec_command")
        self.assertEqual(tool["calls"], 2)

    def test_native_tool_call_heatmap_deduplicates_transcripts_and_keeps_tokens_unknown(self):
        self.write_session()
        claude_root = self.root / "claude-projects"
        claude_root.mkdir()
        stamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        claude = {
            "type": "assistant",
            "timestamp": stamp,
            "cwd": "/code/claude-project",
            "message": {
                "id": "message-id",
                "model": "claude-test",
                "role": "assistant",
                "content": [{"type": "tool_use", "id": "tool-native-id", "name": "Read", "input": "CLAUDE_PRIVATE_CONTENT_MUST_NOT_BE_STORED"}],
                "usage": {
                    "input_tokens": 5,
                    "cache_creation_input_tokens": 10,
                    "cache_read_input_tokens": 20,
                    "output_tokens": 15,
                },
            },
        }
        (claude_root / "session.jsonl").write_text(
            json.dumps(claude) + "\n", encoding="utf-8"
        )
        duplicate_root = self.root / "claude-duplicate-projects"
        duplicate_root.mkdir()
        updated_claude = json.loads(json.dumps(claude))
        updated_claude["message"]["usage"]["output_tokens"] = 20
        (duplicate_root / "duplicate.jsonl").write_text(
            json.dumps(updated_claude) + "\n", encoding="utf-8"
        )
        scan(
            [
                self.target(),
                self.target(claude_root, "claude"),
                self.target(duplicate_root, "claude"),
            ],
            self.database,
            self.pricing,
        )
        store = Store(self.database)
        try:
            dashboard = store.dashboard(7)
        finally:
            store.close()
        tools = {item["label"]: item for item in dashboard["heatmap"]["tools"]}
        self.assertEqual(set(tools), {"exec_command", "Read"})
        self.assertEqual(tools["Read"]["calls"], 1)
        self.assertEqual(tools["Read"]["share"], .5)
        self.assertEqual(tools["Read"]["token_precision"], "unknown")
        self.assertEqual(sum(cell["calls"] for cell in tools["Read"]["cells"]), 1)
        self.assertNotIn(b"CLAUDE_PRIVATE_CONTENT_MUST_NOT_BE_STORED", self.database.read_bytes())

    def test_unavailable_source_does_not_invent_tool_rows(self):
        missing = self.root / "missing-claude"
        scan([self.target(missing, "claude")], self.database, self.pricing)
        store = Store(self.database)
        try:
            tools = store.dashboard(7)["heatmap"]["tools"]
        finally:
            store.close()
        self.assertEqual(tools, [])

    def test_legacy_path_schema_is_rebuilt_without_path_bytes(self):
        legacy = self.root / "legacy.sqlite3"
        connection = sqlite3.connect(legacy)
        connection.execute(
            "CREATE TABLE sources(path TEXT PRIMARY KEY, root TEXT NOT NULL, size INTEGER, mtime_ns INTEGER, status TEXT, parse_errors INTEGER, adapter_version INTEGER, scanned_at TEXT)"
        )
        connection.execute(
            "INSERT INTO sources VALUES (?, ?, 1, 1, 'ok', 0, 3, 'now')",
            ("/Users/private/source.jsonl", "/Users/private"),
        )
        connection.commit()
        connection.close()

        store = Store(legacy)
        store.close()
        self.assertNotIn(b"/Users/private", legacy.read_bytes())
        connection = sqlite3.connect(legacy)
        try:
            columns = {row[1] for row in connection.execute("PRAGMA table_info(sources)")}
        finally:
            connection.close()
        self.assertEqual(columns & {"path", "root"}, set())
        self.assertIn("source_key", columns)


if __name__ == "__main__":
    unittest.main()
