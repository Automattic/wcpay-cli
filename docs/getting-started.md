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

v1 will use WooCommerce REST API keys.

```bash
wcpay auth add --site https://store.example --name staging
```

For local development stores:

```bash
wcpay auth add --site http://localhost:8082 --name local --allow-insecure-local
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
wcpay api get /wc/v3/payments/transactions page:=1 per_page:=25
```

## Safety reminder

In v1, writes are blocked unless WooPayments is in test/dev mode.
