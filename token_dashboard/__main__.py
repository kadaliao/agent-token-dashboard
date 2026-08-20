from __future__ import annotations

import argparse
from pathlib import Path

from .scanner import ADAPTERS
from .service import ScanTarget, scan, serve

ROOT = Path(__file__).resolve().parent.parent


def _path(value: str) -> Path:
    return Path(value).expanduser().resolve()


def _targets(values: list[str] | None) -> list[ScanTarget]:
    specs = values or ["codex=~/.codex/sessions", "claude=~/.claude/projects"]
    targets = []
    for spec in specs:
        if "=" in spec:
            key, raw_path = spec.split("=", 1)
        else:
            key, raw_path = "codex", spec
        if key not in ADAPTERS:
            choices = ", ".join(sorted(ADAPTERS))
            raise argparse.ArgumentTypeError(f"unknown tool {key!r}; expected one of: {choices}")
        targets.append(ScanTarget(ADAPTERS[key], _path(raw_path)))
    return targets


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Local Agent client token usage dashboard")
    result.add_argument(
        "--source",
        action="append",
        metavar="TOOL=PATH",
        help="source override; repeat for multiple tools (codex or claude). A bare PATH means codex",
    )
    result.add_argument("--database", type=_path, default=ROOT / "data/token-dashboard.sqlite3", help="SQLite database")
    result.add_argument("--pricing", type=_path, default=ROOT / "pricing.json", help="Local pricing JSON")
    commands = result.add_subparsers(dest="command", required=True)
    commands.add_parser("scan", help="incrementally scan native Agent client logs")
    serve_parser = commands.add_parser("serve", help="start the web dashboard (no authentication)")
    serve_parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="bind address (default: 0.0.0.0; network-reachable devices can access the unauthenticated dashboard)",
    )
    serve_parser.add_argument("--port", type=int, default=8888, help="bind port (default: 8888)")
    serve_parser.add_argument("--scan", action="store_true", help="scan before serving")
    return result


def main() -> None:
    args = parser().parse_args()
    try:
        targets = _targets(args.source)
    except argparse.ArgumentTypeError as exc:
        parser().error(str(exc))
    if args.command == "scan":
        report = scan(targets, args.database, args.pricing)
        print(
            "Scan complete: "
            f"{report['imported']} imported, {report['skipped']} unchanged, "
            f"{report['failed']} failed, {report['removed']} removed "
            f"in {report['duration_seconds']}s"
        )
        return
    if args.scan:
        report = scan(targets, args.database, args.pricing)
        print(
            f"Scan complete: {report['imported']} imported, "
            f"{report['skipped']} unchanged, {report['failed']} failed"
        )
    serve(args.host, args.port, args.database, targets, args.pricing)


if __name__ == "__main__":
    main()
