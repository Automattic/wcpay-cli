# Command Reference

This file is currently hand-written. It should eventually be generated or checked against command metadata.

## Core/auth

### `wcpay login --no-browser`

Guided no-browser authentication with WooCommerce REST API keys.

```bash
wcpay login --no-browser --site https://store.example
```

If credentials are not provided through flags or env vars, the command prints the WooCommerce REST API key settings URL and prompts for the generated key and secret.

### `wcpay auth add`

Add a profile using WooCommerce REST API credentials.

```bash
wcpay auth add \
  --site http://localhost:8082 \
  --consumer-key ck_... \
  --consumer-secret cs_... \
  --no-verify
```

Options:

- `--site <url>`
- `--name <name>`
- `--consumer-key <key>`
- `--consumer-secret <secret>`
- `--allow-insecure-local`
- `--no-verify`
- `--json`

### Other auth/profile commands

```bash
wcpay login --no-browser
wcpay auth list
wcpay auth test [profile]
wcpay auth remove <profile>
wcpay profile use <profile>
wcpay whoami
```

## Diagnostics

```bash
wcpay doctor
wcpay doctor --json --redact
wcpay mode
wcpay mode --json
```

## API

```bash
wcpay api <method> <path> [fields...]
```

Examples:

```bash
wcpay api get /wc/v3/payments/accounts
wcpay api get /wc/v3/payments/transactions page:=1 pagesize:=25
wcpay api post /wc/v3/payments/refund order_id:=123 amount:=500 reason="CLI test" --dry-run --json
```

## Reads

```bash
wcpay account status
wcpay settings get
wcpay transactions list --limit 25
wcpay transactions get <id> # currently reports no allowlisted single endpoint
wcpay deposits list
wcpay deposits get <id>
wcpay disputes list
wcpay disputes get <id>
wcpay charges get <id>
```

## Test/dev-mode writes

```bash
wcpay refunds create --order <id> --amount <minor-units> --dry-run
wcpay refunds create --charge <charge-id> --amount <minor-units> --yes
wcpay authorizations capture --order <id> --intent <payment-intent-id> --dry-run
wcpay authorizations cancel --order <id> --intent <payment-intent-id> --dry-run
```

Safety:

- write commands run only in WooPayments test/dev mode;
- write commands require `--yes` or `--dry-run`;
- `--dry-run` still checks mode.

## Test order workflows

```bash
wcpay test order create --product <id> --quantity <n> --dry-run
wcpay test order create --product <id> --quantity <n> --yes
```

`test order create` uses `/wc/v3/orders`, requires an existing product, marks the order with `_wcpay_cli_created` metadata, and is guarded by WooPayments test/dev mode.

## Scaffolded test payment workflow

```bash
wcpay test payment create --order <id> --scenario <scenario>
```

## Agent tooling

```bash
wcpay tools describe
wcpay tools schema
wcpay mcp
```
