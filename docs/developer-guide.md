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
npm run docs:generate
npm run docs:assets
npm run docs:check
npm run check
npm run pack:dry-run
```

## Adding a command

1. Add command metadata to the tool/command registry if user-facing or agent-facing.
2. Implement command registration in `src/commands/`.
3. Add docs in `docs/commands.md` or a dedicated doc page.
4. Add examples for human and JSON output.
5. Add tests for parsing, output, and safety behavior.
6. If the command writes, add live-mode guard tests proving no write request is sent in live mode.

## Git hooks and repository hygiene

The repository includes Husky hooks:

- pre-commit: `npm run lint` and `npm run docs:check`
- pre-push: `npm run check`

If hooks are not installed locally and you want to enable them, run:

```bash
npx husky
```

The GitHub `main` branch is protected. Changes should go through pull requests with the `test` status check passing before merge.

## Screenshot assets

Screenshot-style docs images are generated with Chrome/Chromium:

```bash
npm run docs:assets
```

Set `CHROME_BIN=/path/to/chrome` if Chrome is not installed in a standard location.

## Generated command reference

After changing command names, descriptions, or options, run:

```bash
npm run docs:generate
```

CI/checks run `npm run docs:check` and fail if `docs/command-reference.generated.md` is stale.

## Documentation requirements

Docs must be updated in the same change as user-facing behavior. If metadata-driven docs generation is added, CI should detect drift between command metadata and docs.
