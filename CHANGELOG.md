# Changelog

All notable changes to Agent Token Dashboard are documented here.

## [0.1.0] - 2026-08-21

Initial public release.

### Added

- Local-first, read-only scanning of Codex and Claude Code session logs.
- Incremental SQLite indexing without storing prompts, responses, tool
  arguments, tool results, full commands, paths, environment variables, or log
  text.
- Commands and Agent tools explorer dimensions with versioned taxonomies,
  exact rankings, linked filters, and restorable URL state.
- Composition, Snapshot treemap, Hierarchy sunburst, and Activity heatmap
  views with responsive and keyboard-accessible paths.
- Native token accounting where source logs provide it, plus explicitly marked
  estimated cost based on the local pricing table.
- Default unauthenticated server binding on `0.0.0.0:8888`, with an explicit
  local-only `127.0.0.1` option.

### Precision and security

- Per-tool and per-command token attribution is unknown because supported logs
  expose usage at message, turn, or session level. The dashboard never divides
  those tokens among calls or derived commands.
- Static shell commands are derived with Bash and JavaScript AST parsers;
  unsupported or dynamic forms remain `unknown` rather than being guessed.
- The server has no login or authentication. Binding to `0.0.0.0` exposes the
  dashboard and scan endpoint to every device that can reach the host, so it
  should only be used on a trusted network.

[0.1.0]: https://github.com/kadaliao/agent-token-dashboard/releases/tag/v0.1.0
