# Command Guide

This guide explains the main `wcpay` workflows. For a complete option-level reference generated from command metadata, see [Generated command reference](command-reference.generated.md).

## Connect and choose a store

Start by creating a profile for each store you work with. A profile stores the site URL and points to credentials in the OS keychain.

```bash
wcpay login --site https://store.example --name staging
wcpay auth list
wcpay profile use staging
wcpay whoami
```

Use `wcpay whoami` whenever you want to confirm which store and profile a command will use.

## Check whether the store is healthy

When debugging a store, start with diagnostics and mode detection:

```bash
wcpay doctor
wcpay doctor --json --redact
wcpay mode
wcpay account status
wcpay settings get
```

`doctor --json --redact` is the safest output to attach to an issue or support conversation. It keeps the structured response shape while avoiding sensitive values.

`doctor` checks the active profile, credential storage, REST authentication, WooPayments mode, account status, and browser-login endpoint availability.

## Inspect transactions, deposits, disputes, and charges

These commands are read-only and safe for live stores:

```bash
wcpay transactions list --limit 25
wcpay deposits list
wcpay deposits get <id>
wcpay disputes list
wcpay disputes get <id>
wcpay charges get <id>
```

Typical flow:

1. Use a list command to find the relevant record.
2. Copy the ID from the output.
3. Use the matching `get` command for details.
4. Add `--json` when piping the result into another tool.

## Make a direct REST API request

Use `wcpay api` when a specific curated command does not exist or you need to reproduce a raw endpoint call:

```bash
wcpay api get /wc/v3/payments/accounts
wcpay api get /wc/v3/payments/transactions page:=1 pagesize:=25
```

Fields use typed shell-friendly syntax:

```bash
wcpay api post /wc/v3/payments/refund order_id:=123 amount:=500 reason="CLI test" --dry-run --json
```

Read requests are allowed on live stores. Write methods use the same live-mode guard as curated write commands.

## Preview or run test/dev-mode writes

Write-capable commands are guarded in two ways:

- they run only when WooPayments is in test/dev mode;
- they require `--dry-run` or `--yes`.

Preview what would happen:

```bash
wcpay refunds create --order <id> --amount <minor-units> --dry-run
wcpay authorizations capture --order <id> --intent <payment-intent-id> --dry-run
wcpay authorizations cancel --order <id> --intent <payment-intent-id> --dry-run
```

Send the request in test/dev mode:

```bash
wcpay refunds create --charge <charge-id> --amount <minor-units> --yes
```

## Create test orders and payments

Use these commands to exercise WooPayments flows on a test/dev store:

```bash
wcpay test order create --product <id> --quantity <n> --dry-run
wcpay test payment scenarios
wcpay test payment create --order <id> --scenario success --dry-run
```

`test order create` requires an existing product and marks the order with `_wcpay_cli_created` metadata.

Supported payment scenarios: `success`, `decline`, `3ds`, `dispute`, `fraudulent`.

## Use agent tooling

```bash
wcpay tools describe
wcpay tools schema
wcpay mcp
```

`wcpay mcp` starts a local stdio MCP server with read-only tools for agents. It uses the same profiles, credentials, and safety model as the CLI.
