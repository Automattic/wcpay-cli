# API Command

`wcpay api` makes authenticated REST API requests to the selected WooCommerce/WooPayments store.

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

| Form | Meaning |
| --- | --- |
| `foo=bar` | string value |
| `foo:=123` | JSON number |
| `foo:=true` | JSON boolean |
| `foo:=null` | JSON null |

For GET/DELETE, fields become query parameters. For POST/PUT/PATCH, fields become a JSON body.

## Future syntax candidates

Inspired by Notion CLI:

| Form | Meaning |
| --- | --- |
| `name==value` | explicit query parameter |
| `Header:Value` | request header |
| `path.to.key=value` | nested body field |
| `path[key][0]=value` | nested body field with bracket notation |

## Safety

All non-read methods use the live-mode write guard. Use `--dry-run` to inspect a write request without sending it.
