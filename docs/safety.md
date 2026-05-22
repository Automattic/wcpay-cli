# Safety Model

`wcpay` is designed for developers and agents, so safety is enforced by code, not only by documentation.

## Live-mode rule

Live-mode stores are read-only.

`wcpay` blocks any write/destructive operation before sending the request unless WooPayments is in test/dev mode.

## Read methods

- `GET`
- `HEAD`
- `OPTIONS`

## Write/destructive methods

- `POST`
- `PUT`
- `PATCH`
- `DELETE`

## Mode detection

Before a write, the CLI calls:

```http
GET /wp-json/wc/v3/payments/settings
```

Writes are allowed only when one of these mode flags indicates test/dev mode:

- `is_test_mode_enabled`
- `is_test_mode_onboarding`
- `is_dev_mode_enabled`

## Dry runs

Every write-capable command supports:

```bash
--dry-run
```

Dry runs validate auth, resolve the request, check mode, print what would happen, and send no write request. Dry-run output redacts auth query parameters and authorization headers.

## Non-interactive confirmation

Interactive writes prompt for confirmation. Non-interactive writes require:

```bash
--yes
```

## Error shape

JSON errors are stable:

```json
{
  "ok": false,
  "error": {
    "code": "live_mode_write_blocked",
    "message": "WooPayments CLI only allows write operations in test/dev mode.",
    "status": 409
  },
  "meta": {
    "method": "POST",
    "path": "/wc/v3/payments/refund",
    "mode": "live"
  }
}
```
