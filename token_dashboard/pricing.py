from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class CostResult:
    value: float | None
    reason: str


class PricingTable:
    def __init__(self, config: dict[str, Any]):
        self.config = config
        self.models = config.get("models", {})

    @classmethod
    def load(cls, path: Path) -> "PricingTable":
        with path.open("r", encoding="utf-8") as handle:
            return cls(json.load(handle))

    def estimate(self, model: str | None, usage: dict[str, int]) -> CostResult:
        if not model or model not in self.models:
            return CostResult(None, "model_price_unknown")

        price = self.models[model]
        input_tokens = max(int(usage.get("input_tokens", 0)), 0)
        cached = max(int(usage.get("cached_input_tokens", 0)), 0)
        writes = max(int(usage.get("cache_write_input_tokens", 0)), 0)
        output = max(int(usage.get("output_tokens", 0)), 0)
        threshold = price.get("long_context_threshold")
        if threshold is not None and input_tokens > int(threshold):
            price = price.get("long", price)

        if writes and price.get("cache_write") is None:
            return CostResult(None, "cache_write_price_unknown")

        uncached = max(input_tokens - cached - writes, 0)
        cached_rate = price.get("cached_input")
        if cached and cached_rate is None:
            return CostResult(None, "cached_input_price_unknown")

        cost = (
            uncached * float(price["input"])
            + cached * float(cached_rate or 0)
            + writes * float(price.get("cache_write") or 0)
            + output * float(price["output"])
        ) / 1_000_000
        return CostResult(cost, "estimated_standard_api_rate")

