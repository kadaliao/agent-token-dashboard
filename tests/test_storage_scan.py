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
            {"timestamp": stamp, "type": "response_item", "payload": {"type": "function_call", "call_id": "call-id", "name": "exec_command", "arguments": json.dumps({"cmd": f"rg {secret} /private/path"})}},
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
            tool_dashboard = store.dashboard(30, dimension="tools")
        finally:
            store.close()
        self.assertEqual(status["sessions"], 1)
        self.assertEqual(status["turns"], 1)
        self.assertEqual(dashboard["windows"]["30d"]["total_tokens"], 125)
        self.assertEqual(dashboard["rankings"]["native_tools"][0]["label"], "rg")
        self.assertEqual(dashboard["rankings"]["native_tools"][0]["share"], 1)
        self.assertEqual(tool_dashboard["rankings"]["native_tools"][0]["label"], "exec_command")
        composition = dashboard["tool_composition"]
        self.assertEqual(composition["taxonomy_version"], "2026-08-21.commands.v1")
        self.assertEqual(composition["grain"], "day")
        self.assertEqual(composition["total_calls"], 1)
        search = next(item for item in composition["families"] if item["key"] == "search")
        self.assertEqual(search["calls"], 1)
        self.assertEqual(search["tools"][0]["label"], "rg")
        self.assertEqual(search["tools"][0]["token_precision"], "unknown")
        self.assertEqual(composition["coverage"]["parsed_invocations"], 1)
        self.assertEqual(composition["coverage"]["shell_calls"], 1)
        self.assertEqual(composition["coverage"]["unknown_shell_calls"], 0)
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
        self.assertNotIn(b"rg PROMPT_CONTENT_MUST_NOT_BE_STORED", self.database.read_bytes())
        self.assertNotIn(b"/private/path", self.database.read_bytes())
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
            tool = store.dashboard(30, dimension="tools")["heatmap"]["tools"][0]
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
            dashboard = store.dashboard(7, dimension="tools")
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
            tools = store.dashboard(7, dimension="tools")["heatmap"]["tools"]
        finally:
            store.close()
        self.assertEqual(tools, [])

    def test_tool_taxonomy_unmapped_and_composition_conservation(self):
        stamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        records = [
            {"timestamp": stamp, "type": "session_meta", "payload": {"id": "taxonomy"}},
            {"timestamp": stamp, "type": "response_item", "payload": {"type": "function_call", "call_id": "exec", "name": "shell_command"}},
            {"timestamp": stamp, "type": "response_item", "payload": {"type": "function_call", "call_id": "file", "name": "apply_patch"}},
            {"timestamp": stamp, "type": "response_item", "payload": {"type": "function_call", "call_id": "workflow", "name": "TaskCreate"}},
            {"timestamp": stamp, "type": "response_item", "payload": {"type": "function_call", "call_id": "new", "name": "FutureTool"}},
        ]
        (self.source / "taxonomy.jsonl").write_text(
            "".join(json.dumps(item) + "\n" for item in records), encoding="utf-8"
        )
        scan([self.target()], self.database, self.pricing)
        store = Store(self.database)
        try:
            composition = store.dashboard(30, dimension="tools")["tool_composition"]
            weekly = store.dashboard(90, dimension="tools")["tool_composition"]
            forced_daily = store.dashboard(90, "day", "tools")["tool_composition"]
        finally:
            store.close()

        families = {item["key"]: item for item in composition["families"]}
        self.assertEqual(families["execution"]["calls"], 1)
        self.assertEqual(families["files"]["calls"], 1)
        self.assertEqual(families["workflow"]["calls"], 1)
        self.assertEqual(families["unmapped"]["calls"], 1)
        self.assertEqual(families["unmapped"]["tools"][0]["label"], "FutureTool")
        self.assertEqual(composition["unmapped_calls"], 1)
        self.assertEqual(sum(item["calls"] for item in families.values()), composition["total_calls"])
        self.assertEqual(sum(item["calls"] for item in composition["totals_by_period"]), composition["total_calls"])
        for family in families.values():
            self.assertEqual(sum(item["calls"] for item in family["periods"]), family["calls"])
            self.assertEqual(sum(item["calls"] for item in family["tools"]), family["calls"])
        for index, period in enumerate(composition["totals_by_period"]):
            self.assertEqual(
                sum(family["periods"][index]["calls"] for family in families.values()),
                period["calls"],
            )
        self.assertEqual(weekly["grain"], "week")
        self.assertEqual(forced_daily["grain"], "day")
        self.assertEqual(len(forced_daily["totals_by_period"]), 90)
        self.assertLessEqual(len(weekly["totals_by_period"]), 14)
        self.assertTrue(all("-W" in item["period"] for item in weekly["totals_by_period"]))

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

    def test_command_dimension_one_call_many_dedup_and_conservation(self):
        stamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        record = {
            "timestamp": stamp, "type": "response_item", "payload": {
                "type": "function_call", "call_id": "shared-shell-call",
                "name": "exec_command",
                "arguments": json.dumps({"cmd": "rg x | head && git status; find . -type f"}),
            },
        }
        (self.source / "commands.jsonl").write_text(json.dumps(record) + "\n", encoding="utf-8")
        duplicate = self.root / "duplicate-commands"
        duplicate.mkdir()
        (duplicate / "copy.jsonl").write_text(json.dumps(record) + "\n", encoding="utf-8")
        scan([self.target(), self.target(duplicate)], self.database, self.pricing)
        store = Store(self.database)
        try:
            daily = store.dashboard(30, dimension="commands")
            weekly = store.dashboard(90, "week", "commands")
            tools = store.dashboard(30, dimension="tools")
            status = store.status()
        finally:
            store.close()
        self.assertEqual(
            {item["label"] for item in daily["rankings"]["explorer"]},
            {"rg", "head", "git", "find"},
        )
        self.assertEqual(daily["tool_composition"]["total_calls"], 4)
        self.assertEqual(tools["tool_composition"]["total_calls"], 1)
        self.assertEqual(status["command_invocations"], 4)
        self.assertEqual(daily["tool_composition"]["coverage"]["shell_calls"], 1)
        self.assertEqual(daily["tool_composition"]["coverage"]["unknown_invocations"], 0)
        self.assertEqual(sum(item["calls"] for item in daily["tool_composition"]["families"]), 4)
        self.assertEqual(sum(item["calls"] for item in daily["tool_composition"]["totals_by_period"]), 4)
        self.assertEqual(weekly["tool_composition"]["grain"], "week")

    def test_command_unknown_coverage_counts_shell_parents_not_all_tools(self):
        stamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        records = [
            {"timestamp": stamp, "type": "response_item", "payload": {
                "type": "function_call", "call_id": "read", "name": "Read", "arguments": "{}"}},
            {"timestamp": stamp, "type": "response_item", "payload": {
                "type": "function_call", "call_id": "bad", "name": "exec_command", "arguments": "not-json"}},
        ]
        (self.source / "coverage.jsonl").write_text(
            "".join(json.dumps(item) + "\n" for item in records), encoding="utf-8"
        )
        scan([self.target()], self.database, self.pricing)
        store = Store(self.database)
        try:
            coverage = store.dashboard(30)["tool_composition"]["coverage"]
        finally:
            store.close()
        self.assertEqual(coverage, {
            "shell_calls": 1, "parsed_invocations": 0,
            "unknown_invocations": 1, "unknown_shell_calls": 1,
        })

    def test_pre_command_schema_is_rebuilt_for_adapter_rescan(self):
        old = self.root / "old.sqlite3"
        connection = sqlite3.connect(old)
        connection.execute(
            "CREATE TABLE sources(source_key TEXT PRIMARY KEY, adapter TEXT, root_key TEXT, size INTEGER, mtime_ns INTEGER, status TEXT, parse_errors INTEGER, adapter_version INTEGER, scanned_at TEXT)"
        )
        connection.execute(
            "CREATE TABLE sessions(public_id TEXT PRIMARY KEY, source_key TEXT, tool TEXT, project TEXT, model TEXT, started_at TEXT, ended_at TEXT, parse_errors INTEGER, precision TEXT)"
        )
        connection.execute("CREATE TABLE turns(event_key TEXT)")
        connection.execute("CREATE TABLE tool_calls(event_key TEXT)")
        connection.commit()
        connection.close()
        store = Store(old)
        try:
            table = store.connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='command_invocations'"
            ).fetchone()
        finally:
            store.close()
        self.assertIsNotNone(table)


if __name__ == "__main__":
    unittest.main()
