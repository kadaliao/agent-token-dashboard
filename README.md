# Agent Token Dashboard

A local-only dashboard for native Agent client token usage and tool-call
activity. It reads Codex and Claude Code JSONL sessions without modifying them,
stores only numeric usage metadata plus native tool names/timestamps in SQLite,
and never exposes prompt, response, code, tool arguments, tool results, or log
text in the UI.

## Start

### Install / quick start

```bash
git clone https://github.com/kadaliao/agent-token-dashboard.git
cd agent-token-dashboard
python3 -m token_dashboard serve --scan --port 8765
```

Open `http://127.0.0.1:8765`. Stop the foreground server with `Ctrl-C`.

```bash
python3 -m token_dashboard scan
python3 -m token_dashboard serve --port 8765
```

Or scan before starting in one command:

```bash
python3 -m token_dashboard serve --scan --port 8765
```

The default scan includes both available native sources:

- Codex: `~/.codex/sessions`
- Claude Code: `~/.claude/projects`
- database: `./data/token-dashboard.sqlite3`
- pricing: `./pricing.json`
- bind address: `127.0.0.1` (local machine only)

Any `--source` option replaces the default source set. Repeat it to select
multiple roots or tools; a bare path is retained as a Codex-only compatibility
form:

```bash
python3 -m token_dashboard --source codex=/path/to/codex --source claude=/path/to/claude scan
python3 -m token_dashboard --source /path/to/codex scan
```

Use `--database` or `--pricing` to override the other defaults. Run
`python3 -m token_dashboard --help` for all options.

## Data contract

Each source is owned by an explicit adapter; model names are never used to
infer tool identity. The Codex adapter reads `session_meta`, `turn_context`, `task_started`,
`task_complete`, and `event_msg/token_count` records. Token counters in Codex
logs are cumulative snapshots. The adapter subtracts adjacent snapshots and
assigns each positive delta to the active turn. A counter reset falls back to
the native `last_token_usage` snapshot and is marked as recovered precision.

The Claude Code adapter reads only top-level timestamps, working-directory
metadata, model identity, and `assistant.message.usage`. Duplicate persisted
assistant records are removed by a hashed native message identity. The latest
usage record within one transcript and the largest complete native snapshot
across duplicate transcripts are retained. Claude input is the
sum of uncached input, cache creation input, and cache read input; output is the
native output counter. Claude Code does not expose a native reasoning-token
counter in these logs, so reasoning remains unknown rather than zero.

Stored fields are limited to timestamps, model, the final path component of
the working directory (project label), hashed source/session/call identifiers,
native tool names, numeric usage counters, parse health, and estimated cost.
Raw conversation and tool arguments/results are neither stored nor returned by
the HTTP API.

`input_tokens` includes cached input in current Codex logs. Dashboard "total
tokens” is therefore input plus output; cache and reasoning are displayed as
subsets and are not added again. Reasoning tokens are already included in
output tokens for pricing.

The primary heatmap uses individual native tool names as rows and every local
day in the selected 7/30/90-day range as columns. A cell is the deduplicated
native call count for that tool-day. It shows each tool's total calls, share of
calls, and its token attribution. Agent clients and projects are secondary
drilldowns, never the default heatmap grouping. All visible cells share one
absolute logarithmic intensity scale.

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

## Tool-call token precision

Call count and tool name come directly from native Codex `response_item`
function/custom-tool calls and Claude Code `tool_use` blocks. Duplicate
transcripts are removed only when a hashed native call identity is present;
calls missing such an ID remain distinct within their source session. A tool's token value
is labelled `native` only when the source directly attributes tokens to that
individual call. It is labelled `estimated` only when a local tokenizer has
explicitly estimated tool arguments/results. Otherwise it is `unknown`.
Current native Codex and Claude Code logs supply session/turn usage but no
per-call attribution, so this dashboard deliberately reports tool tokens as
unknown and never splits message or turn tokens across calls.

## Tests

```bash
python3 -m unittest discover -s tests -v
```
