# Changelog

All notable changes to `@automattic/wcpay-cli` are documented in this file.

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
