# CLI Practices Research

- Created: 2026-05-20
- Updated: 2026-05-20

This note captures practices from Notion CLI and Stripe CLI/MCP that should inform `wcpay`.

Sources:

- Notion CLI overview: https://developers.notion.com/cli/get-started/overview
- Notion CLI authentication: https://developers.notion.com/cli/get-started/authentication
- Notion CLI API requests: https://developers.notion.com/cli/guides/api-requests
- Stripe CLI overview: https://docs.stripe.com/stripe-cli
- Stripe CLI usage: https://docs.stripe.com/stripe-cli/use-cli
- Stripe CLI keys: https://docs.stripe.com/stripe-cli/keys
- Stripe CLI triggers: https://docs.stripe.com/stripe-cli/triggers
- Stripe MCP: https://docs.stripe.com/mcp

## Practices to adopt

### 1. Terminal-native API passthrough

Notion's `ntn api` is useful because it removes auth/header boilerplate and supports inline request construction. `wcpay api` should do the same for WooCommerce/WooPayments REST APIs.

Adopt:

- leading slash optional;
- path with or without `/wp-json` accepted;
- authenticated requests by default;
- `--verbose` prints final method/URL/status with secrets redacted;
- typed inline fields;
- stdin/`--data` JSON later for larger bodies.

### 2. Typed field assignment syntax

Notion uses:

- `path=value` for string body fields;
- `path:=json` for typed JSON body fields;
- `name==value` for query parameters;
- `Header:Value` for headers.

`wcpay` should start with the simpler syntax from the product spec, then consider adopting the fuller Notion syntax for parity and power:

```bash
wcpay api get /wc/v3/payments/transactions page:=1 per_page:=25
wcpay api post /wc/v3/payments/refund order_id:=123 amount:=500 reason="CLI test"
```

Open design choice: whether to support `==` query params and `Header:Value` in v1 or defer.

### 3. Keychain-first credential storage

Notion stores tokens in the OS keychain and keeps only non-secret workspace metadata in config files. Stripe stores restricted CLI keys in local config and documents where they live. `wcpay` should be keychain-first and explicit about fallback behavior.

Adopt:

- config dir override via `WCPAY_HOME`;
- keyring toggle via `WCPAY_KEYRING=0` for CI/containers;
- env var credentials for scripts/CI;
- never print secrets;
- document storage paths.

### 4. Browser auth later, manual credentials now

Notion and Stripe both have polished browser/device login. `wcpay` v1 intentionally starts with manual WooCommerce REST API keys, but the CLI should be structured so a future WooPayments key-generation UI or browser/device flow can fit without changing command semantics.

Adopt now:

```bash
wcpay auth add
wcpay auth test
wcpay auth list
wcpay auth remove
```

Future:

```bash
wcpay login
wcpay login --no-browser
```

### 5. Sandbox/test workflows as named scenarios

Stripe CLI's `trigger` command exposes named test events and creates dependent fixtures automatically. `wcpay` should expose named WooPayments test scenarios rather than requiring users or agents to know raw Stripe card fixtures.

Adopt:

```bash
wcpay test payment create --order 123 --scenario success
wcpay test payment create --order 123 --scenario decline
wcpay test payment create --order 123 --scenario 3ds
wcpay test payment create --order 123 --scenario dispute
wcpay test payment create --order 123 --scenario fraudulent
```

Do not accept arbitrary raw card numbers. Map aliases to official Stripe test fixtures internally.

### 6. Explicit safety around money-moving actions

Stripe MCP docs recommend human confirmation and caution for AI tools. `wcpay` has an even stricter v1 rule: live-mode writes are blocked entirely. This should be visible in help output, docs, JSON errors, and MCP tool descriptions.

Adopt:

- live-mode write guard before sending requests;
- `--dry-run` for every write-capable command;
- `--yes` for non-interactive confirmation;
- MCP write tools require structured `confirm: true` or dry-run;
- read/write/safety classification in tool metadata.

### 7. Logs/webhooks are valuable but not v1 core

Stripe CLI is especially strong for `logs tail`, `listen`, `trigger`, and webhook forwarding. WooPayments equivalents would be valuable, but should follow the initial auth/safety/API foundation.

Future candidates:

```bash
wcpay logs tail
wcpay webhooks listen --forward-to localhost:8082/...
wcpay webhooks replay <event>
wcpay test event trigger <scenario>
```

### 8. Documentation inside and outside the terminal

Stripe has a docs plugin and comprehensive CLI reference. Notion exposes endpoint docs/spec help from `ntn api`. `wcpay` should be documentation-forward.

Adopt:

- strong markdown docs in `docs/`;
- `wcpay help` and command examples;
- `wcpay tools describe` for agents;
- future `wcpay api --docs` / `--spec` for allowlisted endpoints;
- docs tests or generated reference checks.

## Implications for the scaffold

The project should include early:

- a command/tool registry;
- stable JSON envelope types;
- docs directory and docs standards;
- config path conventions;
- safety classification for every command;
- tests for metadata and command construction.
