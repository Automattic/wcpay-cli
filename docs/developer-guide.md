# Developer Guide

See also [AGENTS.md](https://github.com/Automattic/wcpay-cli/blob/main/AGENTS.md) for the condensed contributor guide and the invariants enforced by tests.

## Project shape

```text
src/cli.ts              # bin entrypoint
src/app.ts              # Commander program construction
src/commands/           # command registration (shared helpers: common, guarded-write, list-options)
src/core/               # REST client, profiles, secrets, mode guard, doctor, formatting
src/mcp/server.ts       # stdio MCP server (read-only tools)
src/tools/registry.ts   # command/tool metadata for docs and MCP
docs/                   # first-class user/developer docs
tests/                  # unit tests
```

## Scripts

```bash
npm run dev -- --help
npm run lint            # tsc + eslint
npm run format:check    # prettier
npm run test
npm run test:coverage
npm run build
npm run docs:generate
npm run docs:assets
npm run docs:check
npm run check           # everything CI runs; pre-push hook runs this
npm run pack:dry-run
```

## Adding a command

1. Add command metadata to the tool/command registry if user-facing or agent-facing.
2. Add a row to `docs/endpoint-inventory.md` for every REST endpoint the command touches.
3. Implement command registration in `src/commands/`.
4. If the registry entry sets `mcp: true`, register the matching MCP tool in `src/mcp/server.ts` — a sync test enforces exact registry ↔ server equality.
5. Add docs in `docs/commands.md` or a dedicated doc page, then run `npm run docs:generate`.
6. Add examples for human and JSON output.
7. Add tests for parsing, output, and safety behavior.
8. If the command writes, route it through `sendGuardedWrite` and add live-mode guard tests proving no write request is sent in live mode.

## Git hooks and repository hygiene

The repository includes Husky hooks:

- pre-commit: `npm run lint` and `npm run docs:check`
- pre-push: `npm run check`

If hooks are not installed locally and you want to enable them, run:

```bash
npx husky
```

The GitHub `main` branch is protected. Changes should go through pull requests with CI passing before merge (Typecheck, Docs, Unit tests across the Node/OS matrix, and Package smoke).

## Releasing

Releases are tag-driven; see [Packaging and release](packaging.md#releasing). Bump `package.json`, `src/core/version.ts` (a test enforces they match), the README/docs install URLs, and the changelog, then push a `v*` tag.

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
