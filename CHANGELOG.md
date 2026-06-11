# Changelog

All notable changes to `@automattic/wcpay-cli` are documented in this file.

## 0.2.4

- Add curated read commands for WooPayments endpoints: `timeline get`, `authorizations list/get/summary`, `transactions summary`, `deposits overview`, `disputes summary`, `payment-intents get`, and `orders get` with WooPayments order metadata.
- Add `disputes close` as a guarded test/dev-mode write.
- Add REST client robustness: 30s request timeouts (`WCPAY_TIMEOUT`/`--timeout`), automatic retries for idempotent reads, structured transport errors, and `--verbose` redacted debug logging.
- Add categorical exit codes: 2 usage, 3 auth, 4 API failure, 5 live-mode write blocked.
- Add profile-less environment auth via `WCPAY_SITE_URL` for CI and containers.
- Format amounts as currency in human list output and add `--all` pagination to list commands.
- Generate bash/zsh/fish shell completions from the live command tree.
- Fix the empty `id` column in `transactions list` (the field is `transaction_id`).
- Report the package version in the User-Agent header and MCP server info, register the missing deposit/dispute/charge MCP tools, and share doctor checks between the CLI and MCP server.
- Add repo tooling: ESLint, prettier enforcement, vitest coverage, Node 20/macOS CI matrix, a tag-driven release workflow, Dependabot, and community/contributor docs.

## 0.2.3

- Remove browser-based login support; `wcpay login` now guides manual WooCommerce REST API key setup.
- Remove WooPayments Abilities API support and use reviewed WooPayments REST endpoints directly.
- Split CI into focused Typecheck, Docs, Unit tests, and Package smoke jobs.
- Use GitHub release tarballs for direct GitHub installs.

## 0.2.2

- Fix direct GitHub installs by building `dist/` during npm `prepare`.
- Add an install smoke test to verify the global install path in release checks.

## 0.2.1

- Document direct installation from the latest tagged GitHub version.

## 0.2.0

- Add browser-based WooPayments login with manual API-key fallback.
- Default browser-created keys to read-only scope, with `--scope read_write` for write-capable test/dev workflows.
- Store browser-created key IDs and add `wcpay auth remove --revoke` for remote key revocation.
- Harden browser auth with same-origin authorize URL validation and localhost-only callback expectations.
- Restrict raw API writes to reviewed paths unless `--allow-unsafe-path` is passed.
- Add dynamic WooPayments Abilities discovery/execution for read-only abilities and MCP surfaces.
- Expand doctor diagnostics and improve human-facing CLI output.
- Fix end-to-end test payment creation by creating/updating the WooPayments customer before confirming the payment intent.
- Use a valid default refund reason for WooPayments refund creation.
- Update docs for auth, safety, API usage, MCP, endpoint inventory, and test scenarios.

## 0.0.0

Current package contents:

- Manual WooCommerce REST API key login.
- Keychain-first secret storage with explicit file fallback.
- Profile management.
- REST API client with HTTPS Basic Auth and local HTTP OAuth signing.
- Live-mode write guard.
- Raw API command.
- Curated WooPayments read commands.
- Test/dev-mode write dry-runs.
- Test payment scenario aliases.
- Minimal MCP server.
- Generated command reference.
- Shell completion output for bash and zsh.
- Documentation for auth, safety, commands, API syntax, MCP, test scenarios, packaging, and local smoke testing.
