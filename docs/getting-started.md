# Getting Started

## Install

Development install:

```bash
npm install
npm run build
npm link
wcpay --help
```

Planned public install:

```bash
npm install -g @automattic/wcpay-cli
```

## Add a profile

v1 uses WooCommerce REST API keys. For a guided no-browser flow:

```bash
wcpay login --site https://store.example --name staging
```

Or pass credentials directly:

```bash
wcpay auth add \
  --site https://store.example \
  --name staging \
  --consumer-key ck_... \
  --consumer-secret cs_...
```

For local development stores:

```bash
wcpay auth add \
  --site http://localhost:8082 \
  --name local \
  --consumer-key ck_... \
  --consumer-secret cs_... \
  --no-verify
```

## Run diagnostics

```bash
wcpay doctor
wcpay doctor --json --redact
```

## Inspect WooPayments state

```bash
wcpay mode
wcpay account status
wcpay settings get
```

## Make an API request

```bash
wcpay api get /wc/v3/payments/accounts
wcpay api get /wc/v3/payments/transactions page:=1 pagesize:=25
wcpay api post /wc/v3/payments/refund order_id:=123 amount:=500 reason="CLI test" --dry-run --json
```

## Safety reminder

In v1, writes are blocked unless WooPayments is in test/dev mode.
