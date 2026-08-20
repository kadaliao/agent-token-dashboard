from __future__ import annotations

import hashlib
import json
import os
from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from .pricing import PricingTable

COUNTERS = (
    "input_tokens",
    "cached_input_tokens",
    "cache_write_input_tokens",
    "output_tokens",
    "reasoning_output_tokens",
)
ADAPTER_VERSION = 4


def _timestamp(value: Any) -> str | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _project_label(cwd: Any) -> str:
    if not isinstance(cwd, str) or not cwd.strip():
        return "Unknown project"
    label = Path(cwd.rstrip(os.sep)).name.strip()
    return label or "Filesystem root"


def _usage(raw: Any) -> tuple[dict[str, int], dict[str, bool]]:
    raw = raw if isinstance(raw, dict) else {}
    values: dict[str, int] = {}
    available: dict[str, bool] = {}
    for key in COUNTERS:
        value = raw.get(key)
        available[key] = isinstance(value, (int, float)) and not isinstance(value, bool)
        values[key] = max(int(value), 0) if available[key] else 0
    return values, available


@dataclass
class Turn:
    turn_id: str
    sequence: int
    started_at: str | None = None
    ended_at: str | None = None
    model: str | None = None
    usage: dict[str, int] = field(default_factory=lambda: {key: 0 for key in COUNTERS})
    available: dict[str, bool] = field(default_factory=lambda: {key: False for key in COUNTERS})
    cost: float | None = 0.0
    pricing_known: bool = True
    cost_reason: str = "estimated_standard_api_rate"
    precision: str = "native_delta"
    pricing_usages: list[dict[str, int]] = field(default_factory=list, repr=False)

    def add_usage(
        self,
        values: dict[str, int],
        available: dict[str, bool],
        precision: str,
    ) -> None:
        for key in COUNTERS:
            self.usage[key] += values[key]
            self.available[key] = self.available[key] or available[key]
        self.pricing_usages.append(values.copy())
        if precision != "native_delta":
            self.precision = precision

    def estimate_cost(self, pricing: PricingTable) -> None:
        self.cost = 0.0
        self.pricing_known = True
        self.cost_reason = "estimated_standard_api_rate"
        for usage in self.pricing_usages:
            result = pricing.estimate(self.model, usage)
            if result.value is None:
                self.pricing_known = False
                self.cost = None
                self.cost_reason = result.reason
                return
            self.cost = float(self.cost or 0) + result.value


@dataclass
class ParsedSession:
    public_id: str
    agent: str
    project: str
    model: str | None
    started_at: str | None
    ended_at: str | None
    turns: list[Turn]
    parse_errors: int
    precision: str


def parse_codex_file(path: Path, pricing: PricingTable) -> ParsedSession:
    public_id = hashlib.sha256(str(path).encode("utf-8")).hexdigest()[:20]
    project = "Unknown project"
    session_model: str | None = None
    first_timestamp: str | None = None
    last_timestamp: str | None = None
    active_turn_id: str | None = None
    turns: OrderedDict[str, Turn] = OrderedDict()
    previous_total: dict[str, int] | None = None
    parse_errors = 0
    reset_recoveries = 0
    unattributed_index = 0

    def ensure_turn(turn_id: str, started_at: str | None = None) -> Turn:
        if turn_id not in turns:
            turns[turn_id] = Turn(turn_id=turn_id, sequence=len(turns) + 1, started_at=started_at)
        elif started_at and turns[turn_id].started_at is None:
            turns[turn_id].started_at = started_at
        return turns[turn_id]

    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            try:
                record = json.loads(line)
            except (json.JSONDecodeError, UnicodeError):
                parse_errors += 1
                continue
            if not isinstance(record, dict):
                continue

            stamp = _timestamp(record.get("timestamp"))
            if stamp:
                first_timestamp = first_timestamp or stamp
                last_timestamp = stamp
            record_type = record.get("type")
            payload = record.get("payload") if isinstance(record.get("payload"), dict) else {}

            if record_type == "session_meta":
                project = _project_label(payload.get("cwd"))
                continue

            if record_type == "turn_context":
                turn_id = payload.get("turn_id")
                if isinstance(turn_id, str) and turn_id:
                    active_turn_id = turn_id
                    turn = ensure_turn(turn_id, stamp)
                    if isinstance(payload.get("model"), str):
                        turn.model = payload["model"]
                        session_model = payload["model"]
                    if payload.get("cwd"):
                        project = _project_label(payload.get("cwd"))
                continue

            if record_type != "event_msg":
                continue
            event_type = payload.get("type")
            event_turn_id = payload.get("turn_id")
            if event_type == "task_started" and isinstance(event_turn_id, str):
                active_turn_id = event_turn_id
                ensure_turn(event_turn_id, _timestamp(payload.get("started_at")) or stamp)
                continue
            if event_type in {"task_complete", "turn_aborted"} and isinstance(event_turn_id, str):
                turn = ensure_turn(event_turn_id)
                turn.ended_at = _timestamp(payload.get("completed_at")) or stamp
                if active_turn_id == event_turn_id:
                    active_turn_id = None
                continue
            if event_type != "token_count":
                continue

            info = payload.get("info") if isinstance(payload.get("info"), dict) else {}
            total, total_available = _usage(info.get("total_token_usage"))
            last, last_available = _usage(info.get("last_token_usage"))
            if not any(total_available.values()) and not any(last_available.values()):
                continue

            precision = "native_delta"
            if previous_total is None:
                delta, available = total, total_available
            else:
                decreased = any(total[key] < previous_total[key] for key in COUNTERS if total_available[key])
                if decreased:
                    delta, available = last, last_available
                    precision = "native_last_after_reset"
                    reset_recoveries += 1
                else:
                    delta = {key: max(total[key] - previous_total[key], 0) for key in COUNTERS}
                    available = total_available
            previous_total = total

            if active_turn_id is None:
                unattributed_index += 1
                active_turn_id = f"unattributed-{unattributed_index}"
            turn = ensure_turn(active_turn_id, stamp)
            turn.ended_at = stamp
            turn.add_usage(delta, available, precision)

    parsed_turns = list(turns.values())
    for turn in parsed_turns:
        turn.started_at = turn.started_at or turn.ended_at or first_timestamp
        turn.ended_at = turn.ended_at or turn.started_at
        turn.model = turn.model or session_model
        if not any(turn.usage.values()):
            turn.pricing_known = False
            turn.cost = None
            turn.cost_reason = "no_usage_snapshot"
        else:
            turn.estimate_cost(pricing)

    return ParsedSession(
        public_id=public_id,
        agent="Codex",
        project=project,
        model=session_model,
        started_at=first_timestamp,
        ended_at=last_timestamp,
        turns=parsed_turns,
        parse_errors=parse_errors,
        precision="native_delta_with_resets" if reset_recoveries else "native_delta",
    )


def find_codex_logs(root: Path) -> Iterable[Path]:
    if not root.exists():
        return []
    return root.rglob("*.jsonl")
