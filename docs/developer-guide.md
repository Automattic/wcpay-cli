# Developer Guide

## Project shape

```text
src/cli.ts              # bin entrypoint
src/app.ts              # Commander program construction
src/commands/           # command registration
src/core/               # shared config, output, errors, types
src/tools/registry.ts   # command/tool metadata for docs and MCP
docs/                   # first-class user/developer docs
tests/                  # unit tests
```

## Scripts

```bash
npm run dev -- --help
npm run lint
npm run test
npm run build
npm run check
```

## Adding a command

1. Add command metadata to the tool/command registry if user-facing or agent-facing.
2. Implement command registration in `src/commands/`.
3. Add docs in `docs/commands.md` or a dedicated doc page.
4. Add examples for human and JSON output.
5. Add tests for parsing, output, and safety behavior.
6. If the command writes, add live-mode guard tests proving no write request is sent in live mode.

## Documentation requirements

Docs must be updated in the same change as user-facing behavior. If metadata-driven docs generation is added, CI should detect drift between command metadata and docs.
