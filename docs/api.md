# API Command

`wcpay api` makes authenticated REST API requests to the selected WooCommerce/WooPayments store.

Curated read commands use WooPayments Abilities API definitions when the selected store exposes them, then automatically fall back to WooPayments REST endpoints. This keeps newer WooPayments/WooCommerce 10.9+ stores aligned with the shared Abilities surface while preserving compatibility with older stores or sites where WooPayments abilities are disabled.

For dynamic discovery, use `wcpay abilities list`. Advanced users and agents can run discovered read-only WooPayments abilities with `wcpay abilities run <ability> [key=value|key:=json]`.

## Examples

```bash
wcpay api get /wc/v3/payments/accounts
wcpay api get /wc/v3/payments/settings
wcpay api get /wc/v3/payments/transactions page:=1 per_page:=25
wcpay api post /wc/v3/payments/refund order_id:=123 amount:=500 reason="CLI test"
```

## Path normalization

These should be equivalent:

```bash
wcpay api get wc/v3/payments/accounts
wcpay api get /wc/v3/payments/accounts
wcpay api get /wp-json/wc/v3/payments/accounts
```

## Inline fields

Initial syntax:

| Form        | Meaning      |
| ----------- | ------------ |
| `foo=bar`   | string value |
| `foo:=123`  | JSON number  |
| `foo:=true` | JSON boolean |
| `foo:=null` | JSON null    |

For GET/DELETE, fields become query parameters. For POST/PUT/PATCH, fields become a JSON body.

## Future syntax candidates

Inspired by Notion CLI:

| Form                 | Meaning                                 |
| -------------------- | --------------------------------------- |
| `name==value`        | explicit query parameter                |
| `Header:Value`       | request header                          |
| `path.to.key=value`  | nested body field                       |
| `path[key][0]=value` | nested body field with bracket notation |

## Safety

All non-read methods use the live-mode write guard. Use `--dry-run` to inspect a write request without sending it.

`--dry-run` still checks WooPayments mode before printing a write request. If the store is live, the command fails before resolving/sending the write.

## Current implementation notes

- HTTPS stores use Basic Auth with WooCommerce consumer key/secret.
- HTTP local stores use WooCommerce OAuth 1.0 query parameters with `HMAC-SHA256`.
- `Authorization` and OAuth signatures are redacted from dry-run output.
- For GET/DELETE, inline fields become query parameters.
- For POST/PUT/PATCH, inline fields become a JSON body.
