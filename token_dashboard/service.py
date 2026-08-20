from __future__ import annotations

import json
import mimetypes
import time
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import parse_qs, urlparse

from .pricing import PricingTable
from .scanner import Adapter
from .storage import Store, source_key


@dataclass(frozen=True)
class ScanTarget:
    adapter: Adapter
    root: Path


def scan(
    targets: Iterable[ScanTarget], database: Path, pricing_path: Path
) -> dict[str, Any]:
    started = time.monotonic()
    pricing = PricingTable.load(pricing_path)
    store = Store(database)
    report: dict[str, Any] = {
        "discovered": 0,
        "imported": 0,
        "skipped": 0,
        "failed": 0,
        "removed": 0,
        "tools": {},
    }
    try:
        for target in targets:
            adapter = target.adapter
            root = target.root
            tool_report = {
                "discovered": 0,
                "imported": 0,
                "skipped": 0,
                "failed": 0,
                "removed": 0,
            }
            present: set[str] = set()
            if not root.is_dir():
                tool_report["removed"] = store.remove_missing(adapter.key, root, present)
                store.record_root_scan(adapter.key, adapter.version, root, "missing", 0, 0)
                report["removed"] += tool_report["removed"]
                summary = report["tools"].setdefault(
                    adapter.key,
                    {"status": "missing", **{key: 0 for key in tool_report}},
                )
                if summary["status"] == "ready":
                    summary["status"] = "partial"
                for key, value in tool_report.items():
                    summary[key] += value
                continue

            for path in adapter.discover(root):
                tool_report["discovered"] += 1
                report["discovered"] += 1
                present.add(source_key(adapter.key, path))
                try:
                    stat = path.stat()
                    if store.source_unchanged(
                        adapter.key, adapter.version, path, stat.st_size, stat.st_mtime_ns
                    ):
                        tool_report["skipped"] += 1
                        report["skipped"] += 1
                        continue
                    parsed = adapter.parse(path, pricing)
                    store.replace_source(
                        adapter.key, adapter.version, root, path, stat, parsed
                    )
                    tool_report["imported"] += 1
                    report["imported"] += 1
                except (OSError, ValueError, json.JSONDecodeError):
                    tool_report["failed"] += 1
                    report["failed"] += 1
                    try:
                        store.mark_source_error(
                            adapter.key, adapter.version, root, path, path.stat()
                        )
                    except OSError:
                        pass
            tool_report["removed"] = store.remove_missing(adapter.key, root, present)
            report["removed"] += tool_report["removed"]
            store.record_root_scan(
                adapter.key,
                adapter.version,
                root,
                "ready",
                tool_report["discovered"],
                tool_report["failed"],
            )
            summary = report["tools"].setdefault(
                adapter.key,
                {"status": "ready", **{key: 0 for key in tool_report}},
            )
            if summary["status"] == "missing":
                summary["status"] = "partial"
            for key, value in tool_report.items():
                summary[key] += value
    finally:
        store.close()
    report["duration_seconds"] = round(time.monotonic() - started, 3)
    return report


class DashboardServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(
        self, address: tuple[str, int], database: Path, targets: list[ScanTarget], pricing: Path
    ):
        self.database = database
        self.targets = targets
        self.pricing = pricing
        self.static_root = Path(__file__).parent / "static"
        super().__init__(address, DashboardHandler)


class DashboardHandler(BaseHTTPRequestHandler):
    server: DashboardServer

    def log_message(self, format: str, *args: object) -> None:
        # HTTP metadata only; request bodies and source log content are never logged.
        super().log_message(format, *args)

    def _security_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
            "script-src 'self'; connect-src 'self'",
        )

    def _json(self, payload: object, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=True, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._security_headers()
        self.end_headers()
        self.wfile.write(body)

    def _store(self) -> Store:
        return Store(self.server.database)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/status":
            store = self._store()
            try:
                self._json(store.status())
            finally:
                store.close()
            return
        if parsed.path == "/api/dashboard":
            query = parse_qs(parsed.query)
            try:
                days = min(max(int(query.get("days", ["30"])[0]), 1), 365)
            except ValueError:
                days = 30
            store = self._store()
            try:
                self._json(store.dashboard(days))
            finally:
                store.close()
            return
        if parsed.path.startswith("/api/sessions/"):
            public_id = parsed.path.removeprefix("/api/sessions/")
            if not public_id or len(public_id) > 64 or not public_id.isalnum():
                self._json({"error": "invalid_session_id"}, HTTPStatus.BAD_REQUEST)
                return
            store = self._store()
            try:
                detail = store.session_detail(public_id)
            finally:
                store.close()
            if detail is None:
                self._json({"error": "session_not_found"}, HTTPStatus.NOT_FOUND)
            else:
                self._json(detail)
            return
        self._static(parsed.path)

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/scan":
            self._json({"error": "not_found"}, HTTPStatus.NOT_FOUND)
            return
        try:
            report = scan(self.server.targets, self.server.database, self.server.pricing)
            self._json(report)
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            self._json(
                {"error": "scan_failed", "detail": type(exc).__name__},
                HTTPStatus.INTERNAL_SERVER_ERROR,
            )

    def _static(self, request_path: str) -> None:
        relative = "index.html" if request_path in {"", "/"} else request_path.lstrip("/")
        candidate = (self.server.static_root / relative).resolve()
        if (
            self.server.static_root.resolve() not in candidate.parents
            and candidate != self.server.static_root.resolve()
        ):
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if not candidate.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        body = candidate.read_bytes()
        content_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header(
            "Content-Type",
            f"{content_type}; charset=utf-8" if content_type.startswith("text/") else content_type,
        )
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self._security_headers()
        self.end_headers()
        self.wfile.write(body)


def serve(
    host: str, port: int, database: Path, targets: list[ScanTarget], pricing: Path
) -> None:
    server = DashboardServer((host, port), database, targets, pricing)
    print(f"Agent Token Dashboard listening on http://{host}:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
