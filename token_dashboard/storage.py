from __future__ import annotations

import hashlib
import sqlite3
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

from .scanner import COUNTERS, ParsedSession

SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS sources (
    source_key TEXT PRIMARY KEY,
    adapter TEXT NOT NULL,
    root_key TEXT NOT NULL,
    size INTEGER NOT NULL,
    mtime_ns INTEGER NOT NULL,
    status TEXT NOT NULL,
    parse_errors INTEGER NOT NULL DEFAULT 0,
    adapter_version INTEGER NOT NULL DEFAULT 1,
    scanned_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    public_id TEXT PRIMARY KEY,
    source_key TEXT NOT NULL UNIQUE REFERENCES sources(source_key) ON DELETE CASCADE,
    tool TEXT NOT NULL,
    project TEXT NOT NULL,
    model TEXT,
    started_at TEXT,
    ended_at TEXT,
    parse_errors INTEGER NOT NULL,
    precision TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS turns (
    session_id TEXT NOT NULL REFERENCES sessions(public_id) ON DELETE CASCADE,
    turn_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    event_key TEXT NOT NULL,
    started_at TEXT,
    ended_at TEXT,
    model TEXT,
    input_tokens INTEGER NOT NULL,
    cached_input_tokens INTEGER NOT NULL,
    cache_write_input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    reasoning_output_tokens INTEGER NOT NULL,
    input_available INTEGER NOT NULL,
    cache_available INTEGER NOT NULL,
    cache_write_available INTEGER NOT NULL,
    output_available INTEGER NOT NULL,
    reasoning_available INTEGER NOT NULL,
    estimated_cost REAL,
    pricing_known INTEGER NOT NULL,
    cost_reason TEXT NOT NULL,
    precision TEXT NOT NULL,
    PRIMARY KEY (session_id, turn_id)
);
CREATE INDEX IF NOT EXISTS idx_turns_started ON turns(started_at);
CREATE INDEX IF NOT EXISTS idx_turns_event ON turns(event_key);
CREATE INDEX IF NOT EXISTS idx_turns_model ON turns(model);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project);
CREATE INDEX IF NOT EXISTS idx_sessions_tool ON sessions(tool);
CREATE TABLE IF NOT EXISTS tool_calls (
    session_id TEXT NOT NULL REFERENCES sessions(public_id) ON DELETE CASCADE,
    event_key TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    occurred_at TEXT,
    token_count INTEGER,
    token_precision TEXT NOT NULL CHECK(token_precision IN ('native', 'estimated', 'unknown')),
    PRIMARY KEY (session_id, event_key)
);
CREATE INDEX IF NOT EXISTS idx_tool_calls_event ON tool_calls(event_key);
CREATE INDEX IF NOT EXISTS idx_tool_calls_occurred ON tool_calls(occurred_at);
CREATE TABLE IF NOT EXISTS scan_roots (
    adapter TEXT NOT NULL,
    root_key TEXT NOT NULL,
    status TEXT NOT NULL,
    discovered INTEGER NOT NULL,
    failed INTEGER NOT NULL,
    adapter_version INTEGER NOT NULL,
    scanned_at TEXT NOT NULL,
    PRIMARY KEY (adapter, root_key)
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def source_key(adapter: str, path: Path) -> str:
    return hashlib.sha256(f"{adapter}:{path.resolve()}".encode("utf-8")).hexdigest()


def root_key(adapter: str, path: Path) -> str:
    return hashlib.sha256(f"{adapter}:{path.resolve()}".encode("utf-8")).hexdigest()


def _remove_legacy_database(path: Path) -> None:
    if not path.exists():
        return
    probe = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        exists = probe.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='sources'"
        ).fetchone()
        if not exists:
            return
        columns = {row[1] for row in probe.execute("PRAGMA table_info(sources)")}
        session_columns = {row[1] for row in probe.execute("PRAGMA table_info(sessions)")}
        turn_columns = {row[1] for row in probe.execute("PRAGMA table_info(turns)")}
        legacy = (
            "path" in columns
            or "root" in columns
            or "adapter" not in columns
            or "tool" not in session_columns
            or "event_key" not in turn_columns
            or not probe.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='tool_calls'").fetchone()
        )
    finally:
        probe.close()
    if not legacy:
        return
    # This database is derived data. Recreate it so legacy path bytes cannot
    # remain in freed SQLite pages or WAL sidecars.
    for candidate in (path, Path(f"{path}-wal"), Path(f"{path}-shm")):
        candidate.unlink(missing_ok=True)


def _parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


class Store:
    def __init__(self, path: Path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        _remove_legacy_database(path)
        self.connection = sqlite3.connect(path, timeout=30, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.connection.executescript(SCHEMA)

    def close(self) -> None:
        self.connection.close()

    def source_unchanged(
        self, adapter: str, version: int, path: Path, size: int, mtime_ns: int
    ) -> bool:
        key = source_key(adapter, path)
        row = self.connection.execute(
            "SELECT size, mtime_ns, status, adapter_version FROM sources WHERE source_key = ?", (key,)
        ).fetchone()
        return bool(
            row
            and row["status"] == "ok"
            and row["size"] == size
            and row["mtime_ns"] == mtime_ns
            and row["adapter_version"] == version
        )

    def replace_source(
        self, adapter: str, version: int, root: Path, path: Path, stat: Any, session: ParsedSession
    ) -> None:
        source_hash = source_key(adapter, path)
        root_hash = root_key(adapter, root)
        with self.connection:
            self.connection.execute(
                """INSERT INTO sources(source_key, adapter, root_key, size, mtime_ns, status, parse_errors, adapter_version, scanned_at)
                   VALUES (?, ?, ?, ?, ?, 'ok', ?, ?, ?)
                   ON CONFLICT(source_key) DO UPDATE SET adapter=excluded.adapter, root_key=excluded.root_key, size=excluded.size,
                   mtime_ns=excluded.mtime_ns, status='ok', parse_errors=excluded.parse_errors,
                   adapter_version=excluded.adapter_version, scanned_at=excluded.scanned_at""",
                (source_hash, adapter, root_hash, stat.st_size, stat.st_mtime_ns, session.parse_errors, version, _now()),
            )
            self.connection.execute("DELETE FROM sessions WHERE source_key = ?", (source_hash,))
            self.connection.execute(
                """INSERT INTO sessions(public_id, source_key, tool, project, model,
                   started_at, ended_at, parse_errors, precision)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    session.public_id,
                    source_hash,
                    session.tool,
                    session.project,
                    session.model,
                    session.started_at,
                    session.ended_at,
                    session.parse_errors,
                    session.precision,
                ),
            )
            self.connection.executemany(
                """INSERT INTO turns(session_id, turn_id, sequence, event_key, started_at, ended_at, model,
                   input_tokens, cached_input_tokens, cache_write_input_tokens, output_tokens,
                   reasoning_output_tokens, input_available, cache_available, cache_write_available,
                   output_available, reasoning_available, estimated_cost, pricing_known, cost_reason,
                   precision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                [
                    (
                        session.public_id,
                        turn.turn_id,
                        turn.sequence,
                        turn.event_key,
                        turn.started_at,
                        turn.ended_at,
                        turn.model,
                        turn.usage["input_tokens"],
                        turn.usage["cached_input_tokens"],
                        turn.usage["cache_write_input_tokens"],
                        turn.usage["output_tokens"],
                        turn.usage["reasoning_output_tokens"],
                        int(turn.available["input_tokens"]),
                        int(turn.available["cached_input_tokens"]),
                        int(turn.available["cache_write_input_tokens"]),
                        int(turn.available["output_tokens"]),
                        int(turn.available["reasoning_output_tokens"]),
                        turn.cost,
                        int(turn.pricing_known),
                        turn.cost_reason,
                        turn.precision,
                    )
                    for turn in session.turns
                ],
            )
            self.connection.executemany(
                """INSERT INTO tool_calls(session_id, event_key, tool_name, occurred_at, token_count, token_precision)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                [
                    (session.public_id, call.event_key, call.name, call.occurred_at,
                     call.token_count, call.token_precision)
                    for call in session.tool_calls
                ],
            )

    def mark_source_error(
        self, adapter: str, version: int, root: Path, path: Path, stat: Any
    ) -> None:
        source_hash = source_key(adapter, path)
        root_hash = root_key(adapter, root)
        with self.connection:
            self.connection.execute(
                """INSERT INTO sources(source_key, adapter, root_key, size, mtime_ns, status, parse_errors, adapter_version, scanned_at)
                   VALUES (?, ?, ?, ?, ?, 'error', 1, ?, ?)
                   ON CONFLICT(source_key) DO UPDATE SET adapter=excluded.adapter, root_key=excluded.root_key,
                   size=excluded.size, mtime_ns=excluded.mtime_ns,
                   status='error', adapter_version=excluded.adapter_version, scanned_at=excluded.scanned_at""",
                (source_hash, adapter, root_hash, stat.st_size, stat.st_mtime_ns, version, _now()),
            )

    def remove_missing(self, adapter: str, root: Path, present: set[str]) -> int:
        rows = self.connection.execute(
            "SELECT source_key FROM sources WHERE adapter = ? AND root_key = ?",
            (adapter, root_key(adapter, root)),
        ).fetchall()
        missing = [row["source_key"] for row in rows if row["source_key"] not in present]
        with self.connection:
            self.connection.executemany(
                "DELETE FROM sources WHERE source_key = ?", [(key,) for key in missing]
            )
        return len(missing)

    def record_root_scan(
        self,
        adapter: str,
        version: int,
        root: Path,
        status: str,
        discovered: int,
        failed: int,
    ) -> None:
        with self.connection:
            self.connection.execute(
                """INSERT INTO scan_roots(adapter, root_key, status, discovered, failed, adapter_version, scanned_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(adapter, root_key) DO UPDATE SET status=excluded.status,
                   discovered=excluded.discovered, failed=excluded.failed,
                   adapter_version=excluded.adapter_version, scanned_at=excluded.scanned_at""",
                (adapter, root_key(adapter, root), status, discovered, failed, version, _now()),
            )

    def status(self) -> dict[str, Any]:
        row = self.connection.execute(
            """SELECT COUNT(*) AS sources,
               SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) AS failed,
               MAX(scanned_at) AS last_scan FROM sources"""
        ).fetchone()
        sessions = self.connection.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
        turns = self.connection.execute("SELECT COUNT(DISTINCT event_key) FROM turns").fetchone()[0]
        calls = self.connection.execute("SELECT COUNT(DISTINCT event_key) FROM tool_calls").fetchone()[0]
        tool_rows = self.connection.execute(
            """SELECT adapter, status, discovered, failed, scanned_at
               FROM scan_roots ORDER BY adapter"""
        ).fetchall()
        return {
            "sources": row["sources"] or 0,
            "failed_sources": row["failed"] or 0,
            "sessions": sessions,
            "turns": turns,
            "tool_calls": calls,
            "last_scan": row["last_scan"],
            "tools": [dict(item) for item in tool_rows],
            "storage": "numeric usage metadata only",
        }

    def _turn_rows(self, earliest: datetime) -> list[sqlite3.Row]:
        rows = self.connection.execute(
            """SELECT t.*, s.project, s.tool, s.public_id, s.parse_errors AS session_parse_errors,
               s.precision AS session_precision
               FROM turns t JOIN sessions s ON s.public_id=t.session_id
               WHERE t.started_at >= ? ORDER BY t.started_at ASC""",
            (earliest.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),),
        ).fetchall()
        deduplicated: dict[str, sqlite3.Row] = {}
        for row in rows:
            existing = deduplicated.get(row["event_key"])
            row_total = row["input_tokens"] + row["output_tokens"]
            existing_total = (
                existing["input_tokens"] + existing["output_tokens"] if existing else -1
            )
            if existing is None or row_total > existing_total:
                deduplicated[row["event_key"]] = row
        return list(deduplicated.values())

    def _tool_call_rows(self, earliest: datetime) -> list[sqlite3.Row]:
        rows = self.connection.execute(
            """SELECT c.*, s.tool FROM tool_calls c JOIN sessions s ON s.public_id=c.session_id
               WHERE c.occurred_at >= ? ORDER BY c.occurred_at ASC""",
            (earliest.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),),
        ).fetchall()
        # A client may persist a transcript in more than one root. The native call
        # id hash survives that duplication, so retain a single event without raw ids.
        return list({row["event_key"]: row for row in rows}.values())

    @staticmethod
    def _aggregate_calls(rows: Iterable[sqlite3.Row]) -> dict[str, Any]:
        rows = list(rows)
        native = sum(row["token_count"] or 0 for row in rows if row["token_precision"] == "native")
        estimated = sum(row["token_count"] or 0 for row in rows if row["token_precision"] == "estimated")
        return {
            "calls": len(rows),
            "native_tokens": native,
            "estimated_tokens": estimated,
            "unknown_token_calls": sum(row["token_precision"] == "unknown" for row in rows),
            "token_precision": (
                "native" if rows and all(row["token_precision"] == "native" for row in rows)
                else "estimated" if rows and all(row["token_precision"] in {"native", "estimated"} for row in rows)
                else "unknown"
            ),
        }

    @staticmethod
    def _aggregate(rows: Iterable[sqlite3.Row]) -> dict[str, Any]:
        rows = list(rows)
        result: dict[str, Any] = {key: 0 for key in COUNTERS}
        total_tokens = 0
        known_cost = 0.0
        priced_tokens = 0
        sessions: set[str] = set()
        completeness = {key: 0 for key in COUNTERS}
        for row in rows:
            token_count = row["input_tokens"] + row["output_tokens"]
            total_tokens += token_count
            sessions.add(row["session_id"])
            for key in COUNTERS:
                result[key] += row[key]
            availability = {
                "input_tokens": row["input_available"],
                "cached_input_tokens": row["cache_available"],
                "cache_write_input_tokens": row["cache_write_available"],
                "output_tokens": row["output_available"],
                "reasoning_output_tokens": row["reasoning_available"],
            }
            for key, present in availability.items():
                completeness[key] += int(bool(present))
            if row["pricing_known"]:
                known_cost += row["estimated_cost"] or 0
                priced_tokens += token_count
        count = len(rows)
        return {
            **result,
            "total_tokens": total_tokens,
            "estimated_cost": round(known_cost, 6),
            "pricing_coverage": priced_tokens / total_tokens if total_tokens else None,
            "turns": count,
            "sessions": len(sessions),
            "dimension_coverage": {
                key: round(value / count, 4) if count else None for key, value in completeness.items()
            },
        }

    def dashboard(self, days: int = 30) -> dict[str, Any]:
        now_local = datetime.now().astimezone()
        today = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        earliest = today - timedelta(days=max(days, 30) - 1)
        rows = self._turn_rows(earliest)

        def in_window(row: sqlite3.Row, window_days: int) -> bool:
            stamp = _parse_time(row["started_at"])
            return bool(stamp and stamp.astimezone() >= today - timedelta(days=window_days - 1))

        windows = {
            "today": self._aggregate(row for row in rows if in_window(row, 1)),
            "7d": self._aggregate(row for row in rows if in_window(row, 7)),
            "30d": self._aggregate(row for row in rows if in_window(row, 30)),
        }
        filtered = [row for row in rows if in_window(row, days)]
        calls = self._tool_call_rows(earliest)
        filtered_calls = [
            row for row in calls
            if (stamp := _parse_time(row["occurred_at"])) and stamp.astimezone() >= today - timedelta(days=days - 1)
        ]

        dates = [
            (today - timedelta(days=offset)).date().isoformat()
            for offset in range(days - 1, -1, -1)
        ]
        tool_date_groups: dict[tuple[str, str], list[sqlite3.Row]] = defaultdict(list)
        for row in filtered:
            stamp = _parse_time(row["started_at"])
            if stamp:
                tool_date_groups[(row["tool"], stamp.astimezone().date().isoformat())].append(row)

        root_rows = self.connection.execute(
            "SELECT adapter, status, failed FROM scan_roots"
        ).fetchall()
        root_state: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"ready": False, "failed": False, "missing": False}
        )
        labels = {"codex": "Codex", "claude": "Claude Code"}
        for root in root_rows:
            state = root_state[root["adapter"]]
            state["ready"] = state["ready"] or root["status"] == "ready"
            state["failed"] = state["failed"] or bool(root["failed"])
            state["missing"] = state["missing"] or root["status"] == "missing"
        for row in filtered:
            adapter = "claude" if row["tool"] == "Claude Code" else "codex"
            root_state.setdefault(adapter, {"ready": True, "failed": False, "missing": False})

        range_summary = self._aggregate(filtered)
        tool_rows: list[dict[str, Any]] = []
        max_cell = 0
        for adapter, availability in sorted(root_state.items()):
            label = labels.get(adapter, adapter)
            grouped_rows = [row for row in filtered if row["tool"] == label]
            aggregate = self._aggregate(grouped_rows)
            if availability["ready"] and (availability["failed"] or availability["missing"]):
                availability_label = "partial"
            elif availability["ready"]:
                availability_label = "available"
            else:
                availability_label = "unavailable"
            cells = []
            for date in dates:
                if availability_label == "unavailable":
                    cells.append({"date": date, "tokens": None, "status": "unknown"})
                    continue
                cell = self._aggregate(tool_date_groups.get((label, date), []))
                max_cell = max(max_cell, cell["total_tokens"])
                cells.append(
                    {
                        "date": date,
                        "tokens": cell["total_tokens"],
                        "status": "partial" if availability_label == "partial" else "known",
                    }
                )
            tool_rows.append(
                {
                    "key": adapter,
                    "label": label,
                    "availability": availability_label,
                    "share": (
                        aggregate["total_tokens"] / range_summary["total_tokens"]
                        if range_summary["total_tokens"]
                        else 0
                    ),
                    "cells": cells,
                    **aggregate,
                }
            )
        tool_rows.sort(key=lambda item: item["total_tokens"], reverse=True)

        call_date_groups: dict[tuple[str, str], list[sqlite3.Row]] = defaultdict(list)
        for row in filtered_calls:
            stamp = _parse_time(row["occurred_at"])
            if stamp:
                call_date_groups[(row["tool_name"], stamp.astimezone().date().isoformat())].append(row)
        call_groups: dict[str, list[sqlite3.Row]] = defaultdict(list)
        for row in filtered_calls:
            call_groups[row["tool_name"]].append(row)
        range_calls = self._aggregate_calls(filtered_calls)
        max_calls = 0
        native_tool_rows = []
        for name, group in call_groups.items():
            summary = self._aggregate_calls(group)
            cells = []
            for date in dates:
                cell = self._aggregate_calls(call_date_groups.get((name, date), []))
                max_calls = max(max_calls, cell["calls"])
                cells.append({"date": date, **cell, "status": "known"})
            native_tool_rows.append({
                "key": hashlib.sha256(name.encode("utf-8")).hexdigest()[:12],
                "label": name,
                "share": summary["calls"] / range_calls["calls"] if range_calls["calls"] else 0,
                "cells": cells,
                **summary,
            })
        native_tool_rows.sort(key=lambda item: (-item["calls"], item["label"].lower()))

        def rank(key: str, limit: int = 10) -> list[dict[str, Any]]:
            groups: dict[str, list[sqlite3.Row]] = defaultdict(list)
            for row in filtered:
                label = row[key] or "Unknown"
                groups[str(label)].append(row)
            ranked = [{"label": label, **self._aggregate(group)} for label, group in groups.items()]
            return sorted(ranked, key=lambda item: item["total_tokens"], reverse=True)[:limit]

        session_groups: dict[str, list[sqlite3.Row]] = defaultdict(list)
        for row in filtered:
            session_groups[row["session_id"]].append(row)
        session_rank = []
        for session_id, group in session_groups.items():
            aggregate = self._aggregate(group)
            latest = max((row["ended_at"] or row["started_at"] for row in group), default=None)
            session_rank.append(
                {
                    "id": session_id,
                    "short_id": session_id[:8],
                    "project": group[0]["project"],
                    "tool": group[0]["tool"],
                    "model": group[-1]["model"] or "Unknown model",
                    "ended_at": latest,
                    **aggregate,
                }
            )
        session_rank.sort(key=lambda item: item["total_tokens"], reverse=True)

        return {
            "generated_at": _now(),
            "timezone": str(now_local.tzinfo),
            "range_days": days,
            "windows": windows,
            "range": range_summary,
            "heatmap": {
                "dates": dates,
                "max_calls": max_calls,
                "scale": "shared_log_absolute",
                "tools": native_tool_rows,
            },
            "rankings": {
                "native_tools": native_tool_rows,
                "clients": tool_rows,
                "models": rank("model"),
                "projects": rank("project"),
                "sessions": session_rank[:20],
            },
            "provenance": {
                "adapters": "Native call names from Codex response items and Claude Code tool-use blocks; client and project are secondary dimensions",
                "source": "Call identity/name/timestamp only; Codex token snapshots and Claude message usage remain session-level",
                "precision": "Per-tool tokens are native only when a log directly attributes them; estimated only when a local tokenizer is explicitly used; otherwise unknown. This build does not distribute turn tokens to calls.",
                "privacy": "no prompt, response, code, tool arguments, tool results, paths, or log text stored or returned",
                "dimensions": "Claude input includes uncached, cache creation, and cache read; Claude reasoning is unavailable and remains unknown",
                "cost": "estimated only where the local price table has an exact model entry",
            },
        }

    def session_detail(self, public_id: str) -> dict[str, Any] | None:
        session = self.connection.execute(
            """SELECT public_id, tool, project, model, started_at, ended_at, parse_errors, precision
               FROM sessions WHERE public_id = ?""",
            (public_id,),
        ).fetchone()
        if not session:
            return None
        rows = self.connection.execute(
            "SELECT * FROM turns WHERE session_id = ? ORDER BY sequence", (public_id,)
        ).fetchall()
        turns = []
        for row in rows:
            turns.append(
                {
                    "sequence": row["sequence"],
                    "started_at": row["started_at"],
                    "ended_at": row["ended_at"],
                    "model": row["model"] or "Unknown model",
                    "input_tokens": row["input_tokens"] if row["input_available"] else None,
                    "cached_input_tokens": row["cached_input_tokens"] if row["cache_available"] else None,
                    "cache_write_input_tokens": row["cache_write_input_tokens"] if row["cache_write_available"] else None,
                    "output_tokens": row["output_tokens"] if row["output_available"] else None,
                    "reasoning_output_tokens": row["reasoning_output_tokens"] if row["reasoning_available"] else None,
                    "total_tokens": row["input_tokens"] + row["output_tokens"],
                    "estimated_cost": row["estimated_cost"] if row["pricing_known"] else None,
                    "cost_reason": row["cost_reason"],
                    "precision": row["precision"],
                }
            )
        return {
            "id": session["public_id"],
            "short_id": session["public_id"][:8],
            "tool": session["tool"],
            "project": session["project"],
            "model": session["model"] or "Unknown model",
            "started_at": session["started_at"],
            "ended_at": session["ended_at"],
            "parse_errors": session["parse_errors"],
            "precision": session["precision"],
            "summary": self._aggregate(rows),
            "turns": turns,
        }
