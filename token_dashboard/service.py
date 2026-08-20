from __future__ import annotations

import json
import mimetypes
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .pricing import PricingTable
from .scanner import find_codex_logs, parse_codex_file
from .storage import Store, source_key


def scan(source: Path, database: Path, pricing_path: Path) -> dict[str, int | float]:
    started = time.monotonic()
    pricing = PricingTable.load(pricing_path)
    store = Store(database)
    report: dict[str, int | float] = {
        "discovered": 0,
        "imported": 0,
        "skipped": 0,
        "failed": 0,
        "removed": 0,
    }
    present: set[str] = set()
    try:
        for path in find_codex_logs(source):
            report["discovered"] += 1
            present.add(source_key(path))
            try:
                stat = path.stat()
                if store.source_unchanged(path, stat.st_size, stat.st_mtime_ns):
                    report["skipped"] += 1
                    continue
                parsed = parse_codex_file(path, pricing)
                store.replace_source(source, path, stat, parsed)
                report["imported"] += 1
            except (OSError, ValueError, json.JSONDecodeError):
                report["failed"] += 1
                try:
                    store.mark_source_error(source, path, path.stat())
                except OSError:
                    pass
        report["removed"] = store.remove_missing(source, present)
    finally:
        store.close()
    report["duration_seconds"] = round(time.monotonic() - started, 3)
    return report


class DashboardServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], database: Path, source: Path, pricing: Path):
        self.database = database
        self.source = source
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
        self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'")

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
            report = scan(self.server.source, self.server.database, self.server.pricing)
            self._json(report)
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            self._json({"error": "scan_failed", "detail": type(exc).__name__}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def _static(self, request_path: str) -> None:
        relative = "index.html" if request_path in {"", "/"} else request_path.lstrip("/")
        candidate = (self.server.static_root / relative).resolve()
        if self.server.static_root.resolve() not in candidate.parents and candidate != self.server.static_root.resolve():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if not candidate.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        body = candidate.read_bytes()
        content_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8" if content_type.startswith("text/") else content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self._security_headers()
        self.end_headers()
        self.wfile.write(body)


def serve(host: str, port: int, database: Path, source: Path, pricing: Path) -> None:
    server = DashboardServer((host, port), database, source, pricing)
    print(f"Agent Token Dashboard listening on http://{host}:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
