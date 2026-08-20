# Agent Token Dashboard

A local-only dashboard for native Codex token usage. It reads Codex JSONL
sessions without modifying them, stores only numeric usage metadata in SQLite,
and never exposes prompt, response, code, tool, or log text in the UI.

## Start

```bash
python3 -m token_dashboard scan
python3 -m token_dashboard serve --port 8765
```

Or scan before starting in one command:

```bash
python3 -m token_dashboard serve --scan --port 8765
```

Open `http://127.0.0.1:8765`. Stop a foreground server with `Ctrl-C`.

The defaults are:

- source: `~/.codex/sessions`
- database: `./data/token-dashboard.sqlite3`
- pricing: `./pricing.json`
- bind address: `127.0.0.1` (local machine only)

Use `--source`, `--database`, or `--pricing` to override them. Run
`python3 -m token_dashboard --help` for all options.

## Data contract

The Codex adapter reads `session_meta`, `turn_context`, `task_started`,
`task_complete`, and `event_msg/token_count` records. Token counters in Codex
logs are cumulative snapshots. The adapter subtracts adjacent snapshots and
assigns each positive delta to the active turn. A counter reset falls back to
the native `last_token_usage` snapshot and is marked as recovered precision.

Stored fields are limited to timestamps, model, the final path component of
the working directory (project label), a hashed source/session identifier,
numeric usage counters, parse health, and estimated cost. Raw conversation and
tool content is neither stored nor returned by the HTTP API.

`input_tokens` includes cached input in current Codex logs. Dashboard “total
tokens” is therefore input plus output; cache and reasoning are displayed as
subsets and are not added again. Reasoning tokens are already included in
output tokens for pricing.

## Pricing and precision

`pricing.json` is intentionally local and editable. Its bundled standard API
rates were retrieved from the official OpenAI pricing page on 2026-08-20.
Cost is an estimate, not an invoice: a ChatGPT/Codex subscription, credits,
regional processing, service tier, or account agreement can produce a
different effective cost. Unknown model IDs remain unpriced and are shown as
unknown instead of inheriting a guessed rate.

Long-context rates are selected per native usage delta when its input exceeds
the configured threshold. Cache writes, cached input, uncached input, and
output are priced separately when a model supplies those rates.

## Tests

```bash
python3 -m unittest discover -s tests -v
```
