# WooPayments CLI

`wcpay` is a standalone WooPayments CLI for developers, agents, internal teams, agencies, and savvy merchants.

The CLI is currently scaffolded. The planned v1 focuses on:

- manual WooCommerce REST API key authentication;
- local and remote store profiles;
- read-only live-mode operations;
- test/dev-mode-only writes;
- raw REST API passthrough;
- curated WooPayments commands;
- strong JSON/error output for agents;
- first-class documentation;
- a minimal stdio MCP server.

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

## Implemented foundation commands

```bash
wcpay --help
wcpay auth add --site http://localhost:8082 --consumer-key ck_... --consumer-secret cs_... --no-verify
wcpay auth list
wcpay profile use local
wcpay api get /wc/v3/payments/accounts --json
wcpay api post /wc/v3/payments/refund order_id:=123 amount:=500 reason="CLI test" --dry-run --json
wcpay mode
wcpay doctor
wcpay account status
wcpay settings get
wcpay transactions list
wcpay deposits list
wcpay disputes list
wcpay charges get ch_...
wcpay refunds create --order 123 --amount 500 --dry-run
wcpay tools describe
wcpay tools schema
```

Some v1 commands remain scaffolded, including `wcpay mcp`, `wcpay test order create`, and `wcpay test payment create`.

## Documentation

Docs are a first-class part of this project. Start here:

- [Documentation index](docs/README.md)
- [Product spec](docs/spec.md)
- [CLI practices research](docs/cli-practices.md)
- [Safety model](docs/safety.md)
- [Authentication](docs/auth.md)
- [API command syntax](docs/api.md)
- [MCP](docs/mcp.md)

## Safety model

v1 blocks all write/destructive operations on live-mode stores before sending a write request. Writes are allowed only when WooPayments is in test/dev mode. Write commands require `--yes` or `--dry-run`.

## Package identity

- Repository: `Automattic/wcpay-cli`
- npm package: `@automattic/wcpay-cli`
- binary: `wcpay`
