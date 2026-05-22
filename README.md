# WooPayments CLI

`wcpay` is a standalone WooPayments command-line tool for inspecting, debugging, and safely exercising WooPayments stores over REST APIs.

It is designed for developers, support engineers, agencies, and local agent workflows. It works with local and remote stores, stores credentials keychain-first, emits stable JSON for scripts, and blocks live-mode writes before they can reach a store.

## Install for local development

```bash
npm install
npm run build
npm link
wcpay --help
```

Or run without linking:

```bash
npm run dev -- --help
```

## Common commands

```bash
wcpay --help
wcpay login --site http://localhost:8082
wcpay auth add --site http://localhost:8082 --consumer-key ck_... --consumer-secret cs_... --no-verify
wcpay auth list
wcpay profile use local
wcpay whoami

wcpay doctor
wcpay mode
wcpay account status
wcpay settings get

wcpay transactions list
wcpay deposits list
wcpay deposits get po_...
wcpay disputes list
wcpay disputes get dp_...
wcpay charges get ch_...

wcpay api get /wc/v3/payments/accounts --json
wcpay api post /wc/v3/payments/refund order_id:=123 amount:=500 reason="CLI test" --dry-run --json

wcpay refunds create --order 123 --amount 500 --dry-run
wcpay test order create --product 123 --quantity 1 --dry-run
wcpay test payment scenarios
wcpay test payment create --order 123 --scenario success --dry-run

wcpay tools describe
wcpay tools schema
wcpay mcp
wcpay completions bash
wcpay completions zsh
```

## Documentation

Docs are part of the product surface. Start here:

- [Documentation index](docs/README.md)
- [Getting started](docs/getting-started.md)
- [Authentication](docs/auth.md)
- [Safety model](docs/safety.md)
- [Command guide](docs/commands.md)
- [Generated command reference](docs/command-reference.generated.md)
- [API command syntax](docs/api.md)
- [MCP](docs/mcp.md)
- [Packaging and release](docs/packaging.md)

## Authentication and storage

`wcpay login` uses WooCommerce REST API consumer keys/secrets. Secrets are stored in the OS keychain when available:

- macOS: Keychain via `security`
- Linux: Secret Service via `secret-tool`

If the OS keychain is unavailable, the CLI fails with instructions instead of silently writing secrets to disk. Set `WCPAY_KEYRING=0` to explicitly use file-backed secret storage for CI/containers.

## Safety model

Live-mode stores are read-only. Any write/destructive command is blocked before the request is sent unless WooPayments is in test/dev mode. Write commands require `--yes` or `--dry-run`.

## MCP

`wcpay mcp` starts a local stdio MCP server with read-only WooPayments tools for agent workflows. It uses the same profiles, auth storage, output envelope, and safety model as CLI commands.

## Package identity

- Repository: `Automattic/wcpay-cli`
- npm package: `@automattic/wcpay-cli`
- binary: `wcpay`
