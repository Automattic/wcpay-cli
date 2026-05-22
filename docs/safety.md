# Safety Model

`wcpay` is designed for developers and agents, so safety must be enforced by code, not only documentation.

## v1 rule

Live-mode stores are read-only.

`wcpay` must block any write/destructive operation before sending the request unless WooPayments is in test/dev mode.

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

Before a write, call:

```http
GET /wp-json/wc/v3/payments/settings
```

Use:

- `is_test_mode_enabled`
- `is_test_mode_onboarding`
- `is_dev_mode_enabled`

Allow writes only when test/dev mode is active.

## Dry runs

Every write-capable command must support:

```bash
--dry-run
```

Dry-run should validate auth, resolve the request, check mode, print what would happen, and send no write request.

## Non-interactive confirmation

Interactive writes should prompt. Non-interactive writes must require:

```bash
--yes
```

MCP write tools must require structured confirmation such as `confirm: true`, unless run as dry-run.

## Error shape

JSON errors should be stable:

```json
{
  "ok": false,
  "error": {
    "code": "live_mode_write_blocked",
    "message": "WooPayments CLI v1 only allows write operations in test/dev mode.",
    "status": 409
  },
  "meta": {
    "method": "POST",
    "path": "/wc/v3/payments/refund",
    "mode": "live"
  }
}
```
