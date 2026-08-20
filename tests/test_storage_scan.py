import json
import sqlite3
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from token_dashboard.service import scan
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
            {"timestamp": stamp, "type": "turn_context", "payload": {"turn_id": "turn", "model": "test-model"}},
            {"timestamp": stamp, "type": "event_msg", "payload": {"type": "token_count", "info": {"total_token_usage": total, "last_token_usage": total}}},
        ]
        path = self.source / "session.jsonl"
        path.write_text("".join(json.dumps(item) + "\n" for item in records), encoding="utf-8")
        return secret

    def test_repeated_scan_is_idempotent_and_raw_text_is_not_stored(self):
        secret = self.write_session()
        first = scan(self.source, self.database, self.pricing)
        second = scan(self.source, self.database, self.pricing)
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
        scan(self.source, self.database, self.pricing)
        path = self.source / "session.jsonl"
        data = json.loads(path.read_text(encoding="utf-8").splitlines()[-1])
        data["payload"]["info"]["total_token_usage"]["input_tokens"] = 200
        data["payload"]["info"]["last_token_usage"]["input_tokens"] = 200
        lines = path.read_text(encoding="utf-8").splitlines()
        lines[-1] = json.dumps(data)
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        result = scan(self.source, self.database, self.pricing)
        self.assertEqual(result["imported"], 1)
        store = Store(self.database)
        try:
            self.assertEqual(store.dashboard(30)["windows"]["30d"]["total_tokens"], 225)
        finally:
            store.close()

    def test_missing_source_is_removed_by_hashed_root_membership(self):
        self.write_session()
        scan(self.source, self.database, self.pricing)
        (self.source / "session.jsonl").unlink()
        result = scan(self.source, self.database, self.pricing)
        self.assertEqual(result["removed"], 1)
        store = Store(self.database)
        try:
            self.assertEqual(store.status()["sessions"], 0)
        finally:
            store.close()

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
