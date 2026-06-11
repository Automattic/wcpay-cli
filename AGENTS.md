# Agent & Contributor Guide

`wcpay` is a standalone WooPayments CLI (TypeScript ESM, Node >= 20.10, commander).

## Commands

- `npm run dev -- <args>` — run the CLI from source (tsx)
- `npm run test` / `npx vitest run tests/<file>.test.ts` — vitest
- `npm run test:coverage` — vitest with v8 coverage
- `npm run lint` — tsc + eslint
- `npm run format` / `npm run format:check` — prettier
- `npm run docs:generate` — regenerate `docs/command-reference.generated.md`
- `npm run check` — everything CI runs; the pre-push hook runs this

## Architecture

- `src/core/` — REST client (timeout/retry/logging), profiles, OS-keychain secrets,
  mode guard, doctor checks, formatting, pagination. No commander imports here.
- `src/commands/` — commander registrations, one module per command group.
  Shared helpers: `common.ts` (runner/json), `guarded-write.ts`, `list-options.ts`.
- `src/mcp/server.ts` — stdio MCP server (read-only tools).
- `src/tools/registry.ts` — metadata for `wcpay tools` and the MCP surface.

## Invariants (enforced by tests/checks — keep them green)

1. **Safety model is non-negotiable.** Live stores are read-only. Write commands
   require test/dev mode (`ModeService.assertWriteAllowed`) plus `--yes` or
   `--dry-run`. Never weaken this; never bypass `sendGuardedWrite` for writes.
2. **Registry ↔ MCP sync.** A registry entry with `mcp: true` must have a matching
   MCP tool registration (`tests/mcp.test.ts` enforces exact equality).
3. **New endpoints need review.** Every endpoint a curated command touches gets a
   row in `docs/endpoint-inventory.md` with a classification.
4. **Generated files.** `docs/command-reference.generated.md` is generated — run
   `npm run docs:generate`, never hand-edit. It is prettier-ignored.
5. **Version sync.** `src/core/version.ts` must match `package.json`
   (`tests/version.test.ts` enforces).
6. **ESM imports end in `.js`** even for `.ts` sources (NodeNext resolution).
7. **Docs ship with the change.** Whenever you update functionality or change the
   API/command surface, update the affected docs in the same change: `README.md`,
   `docs/commands.md`, `docs/getting-started.md`, `docs/auth.md`, `docs/api.md`,
   and `docs/mcp.md` (its tool list is prose, not generated). Only the generated
   reference and the MCP sync are test-enforced — the prose pages are not, so
   check them deliberately; the 0.2.4 release initially shipped with a stale MCP
   tool list.

## Gotchas

- `docs/` is published to GitHub Pages by VitePress AND shipped in the npm tarball
  (`files` includes `docs/**/*.md`) — don't put internal notes there. Plans live in
  `plans/`.
- Secrets never go to disk unless `WCPAY_KEYRING=0`; keychain code is exercised with
  injected `CommandRunner` mocks, not real keychains.
- Human output goes through `printSuccess(..., { human })`; JSON envelopes are
  `{ ok, data, error, meta }`. Keep both paths working for every command.
- Exit codes are categorical (see `docs/commands.md`): printError derives them via
  `exitCodeForError` — never set `process.exitCode` manually in commands.
