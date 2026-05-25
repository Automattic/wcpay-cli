# Getting Started

This guide walks through the first successful `wcpay` session: install the CLI, connect a store, confirm WooPayments is reachable, and run a few safe reads.

## 1. Install the CLI

From this checkout:

```bash
npm install
npm run build
npm link
```

Confirm the binary is available:

```bash
wcpay
```

<img src="assets/welcome.png" alt="WooPayments CLI welcome screen" width="760">

Package identity:

```bash
npm install -g @automattic/wcpay-cli
```

## 2. Connect a store

`wcpay` uses WooCommerce REST API keys. On WooPayments 10.9 or later, the guided login flow opens your browser so an administrator can authorize the CLI and send generated credentials back to a temporary localhost callback. Browser login creates a read-only key by default; use `--scope read_write` only for write-capable test/dev workflows. On older WooPayments versions, it automatically falls back to the manual API key flow. In both cases, credentials are verified and stored in the OS keychain. If you already have a default profile, it asks before continuing:

```bash
wcpay login --site store.example --name staging
```

For local development, you can omit the scheme too:

```bash
wcpay login --site localhost:8082 --name local
```

<img src="assets/login-wizard.png" alt="WooPayments CLI login wizard" width="760">

To skip browser login and use the manual API key flow directly:

```bash
wcpay login --site localhost:8082 --name local --no-browser
```

For a local development store where you want to save credentials without verification:

```bash
wcpay login --site localhost:8082 --name local --no-verify
```

You can also pass credentials directly, which is useful for scripts and CI:

```bash
wcpay auth add \
  --site https://store.example \
  --name staging \
  --consumer-key ck_... \
  --consumer-secret cs_...
```

## 3. Confirm the connection

Run diagnostics first:

```bash
wcpay doctor
```

For output that is safer to paste into an issue or support conversation:

```bash
wcpay doctor --json --redact
```

Check the selected profile and WooPayments mode:

```bash
wcpay whoami
wcpay mode
wcpay account status
```

## 4. Inspect WooPayments activity

Read commands are safe to run against live stores:

```bash
wcpay transactions list --limit 25
wcpay deposits list
wcpay disputes list
```

Use IDs from list output to inspect individual records:

```bash
wcpay deposits get po_...
wcpay disputes get dp_...
wcpay charges get ch_...
```

## 5. Preview a write without sending it

Use `--dry-run` whenever you want to see what a write command would do:

```bash
wcpay refunds create --order 123 --amount 500 --dry-run
```

Dry runs still authenticate, check WooPayments mode, resolve the HTTP request, and redact secrets from output.

<img src="assets/dry-run.png" alt="WooPayments CLI dry-run output" width="760">

## 6. Use JSON for scripts and agents

Most commands support `--json`:

```bash
wcpay transactions list --limit 10 --json
wcpay api get /wc/v3/payments/accounts --json
```

JSON responses use a stable envelope with `ok`, `data`, `error`, and `meta` fields.

## Safety reminder

Live-mode stores are read-only. Write requests are blocked unless WooPayments is in test/dev mode, and write-capable commands require `--dry-run` or `--yes`.
