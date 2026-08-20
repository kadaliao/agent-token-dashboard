from __future__ import annotations

import argparse
from pathlib import Path

from .service import scan, serve

ROOT = Path(__file__).resolve().parent.parent


def _path(value: str) -> Path:
    return Path(value).expanduser().resolve()


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Local Codex token usage dashboard")
    result.add_argument("--source", type=_path, default=_path("~/.codex/sessions"), help="Codex sessions directory")
    result.add_argument("--database", type=_path, default=ROOT / "data/token-dashboard.sqlite3", help="SQLite database")
    result.add_argument("--pricing", type=_path, default=ROOT / "pricing.json", help="Local pricing JSON")
    commands = result.add_subparsers(dest="command", required=True)
    commands.add_parser("scan", help="incrementally scan Codex logs")
    serve_parser = commands.add_parser("serve", help="start the local web dashboard")
    serve_parser.add_argument("--host", default="127.0.0.1", help="bind address")
    serve_parser.add_argument("--port", type=int, default=8765, help="bind port")
    serve_parser.add_argument("--scan", action="store_true", help="scan before serving")
    return result


def main() -> None:
    args = parser().parse_args()
    if args.command == "scan":
        report = scan(args.source, args.database, args.pricing)
        print(
            "Scan complete: "
            f"{report['imported']} imported, {report['skipped']} unchanged, "
            f"{report['failed']} failed, {report['removed']} removed "
            f"in {report['duration_seconds']}s"
        )
        return
    if args.scan:
        report = scan(args.source, args.database, args.pricing)
        print(
            f"Scan complete: {report['imported']} imported, "
            f"{report['skipped']} unchanged, {report['failed']} failed"
        )
    serve(args.host, args.port, args.database, args.source, args.pricing)


if __name__ == "__main__":
    main()
