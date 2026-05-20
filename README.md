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

## Current scaffold commands

```bash
wcpay --help
wcpay tools describe
wcpay tools schema
wcpay api get /wc/v3/payments/accounts --dry-run --json
```

Most product commands are intentionally stubbed until the HTTP/auth/mode layers are implemented.

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

v1 must block all write/destructive operations on live-mode stores before sending a write request. Writes are allowed only when WooPayments is in test/dev mode.

## Package identity

- Repository: `Automattic/wcpay-cli`
- npm package: `@automattic/wcpay-cli`
- binary: `wcpay`
