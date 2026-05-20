# Endpoint Inventory

This document will track WooPayments/WooCommerce REST endpoints reviewed for CLI use.

## Classification

| Classification | Meaning |
| --- | --- |
| `allowlisted-read` | Safe for curated read commands. |
| `allowlisted-test-write` | Safe for curated write commands, but only in test/dev mode. |
| `raw-api-only` | Accessible through `wcpay api`, not wrapped as a curated command. |
| `blocked` | Should not be exposed by curated commands. |
| `unknown` | Needs review. |

## Initial candidates

| Method | Path | Purpose | Classification | Notes |
| --- | --- | --- | --- | --- |
| GET | `/wc/v3/payments/settings` | Settings and mode flags | `allowlisted-read` | Used for mode guard. |
| GET | `/wc/v3/payments/accounts` | Account status | `allowlisted-read` | Used by `account status`. |
| GET | `/wc/v3/payments/transactions` | List transactions | `unknown` | Confirm args and response shape. |
| GET | `/wc/v3/payments/deposits` | List deposits | `unknown` | Confirm path/args. |
| GET | `/wc/v3/payments/disputes` | List disputes | `unknown` | Confirm path/args. |
| POST | `/wc/v3/payments/refund` | Create refund | `allowlisted-test-write` candidate | Must be test/dev only. |
| POST | `/wc/v3/payments/orders/{order_id}/capture_authorization` | Capture authorization | `allowlisted-test-write` candidate | Must be test/dev only. |
| POST | `/wc/v3/payments/orders/{order_id}/cancel_authorization` | Cancel authorization | `allowlisted-test-write` candidate | Must be test/dev only. |
| POST | `/wc/v3/orders` | Create test order | `allowlisted-test-write` candidate | Requires existing product. |

## Review checklist

- [ ] Confirm route exists in current WooPayments.
- [ ] Confirm required capability/auth behavior.
- [ ] Confirm request args and validation.
- [ ] Confirm response shape.
- [ ] Confirm live-mode write guard applies where needed.
- [ ] Add docs and examples before wrapping in curated command.
