# Endpoint Inventory

This document will track WooPayments/WooCommerce REST endpoints reviewed for CLI use.

## Classification

| Classification           | Meaning                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| `allowlisted-read`       | Safe for curated read commands.                                   |
| `allowlisted-test-write` | Safe for curated write commands, but only in test/dev mode.       |
| `raw-api-only`           | Accessible through `wcpay api`, not wrapped as a curated command. |
| `blocked`                | Should not be exposed by curated commands.                        |
| `unknown`                | Needs review.                                                     |

## Abilities compatibility

Curated read commands prefer WooPayments abilities when available and fall back to the REST endpoints below when abilities are missing, disabled, or unsupported by the store.

| CLI surface         | Preferred ability                       | REST fallback                           |
| ------------------- | --------------------------------------- | --------------------------------------- |
| `account status`    | `woocommerce-payments/get-account`      | `/wc/v3/payments/accounts`              |
| `transactions list` | `woocommerce-payments/get-transactions` | `/wc/v3/payments/transactions`          |
| `deposits list`     | `woocommerce-payments/get-deposits`     | `/wc/v3/payments/deposits`              |
| `disputes list`     | `woocommerce-payments/get-disputes`     | `/wc/v3/payments/disputes`              |
| `disputes get`      | `woocommerce-payments/get-dispute`      | `/wc/v3/payments/disputes/{dispute_id}` |
| `charges get`       | `woocommerce-payments/get-charge`       | `/wc/v3/payments/charges/{charge_id}`   |

## Initial candidates

| Method | Path                                                      | Purpose                     | Classification           | Notes                                                      |
| ------ | --------------------------------------------------------- | --------------------------- | ------------------------ | ---------------------------------------------------------- |
| GET    | `/wc/v3/payments/settings`                                | Settings and mode flags     | `allowlisted-read`       | Used for mode guard.                                       |
| POST   | `/wc/v3/payments/cli/authorize`                           | Browser login bootstrap     | `future-auth`            | Expected in WooPayments 10.9+. CLI falls back when absent. |
| POST   | `/wc/v3/payments/cli/token`                               | Browser login code exchange | `future-auth`            | Exchanges a short-lived browser login code for API keys.   |
| GET    | `/wc/v3/payments/accounts`                                | Account status              | `allowlisted-read`       | Used by `account status`.                                  |
| GET    | `/wc/v3/payments/transactions`                            | List transactions           | `allowlisted-read`       | Implemented; uses `page`, `pagesize`, date filters.        |
| GET    | `/wc/v3/payments/deposits`                                | List deposits               | `allowlisted-read`       | Implemented.                                               |
| GET    | `/wc/v3/payments/deposits/{deposit_id}`                   | Get deposit                 | `allowlisted-read`       | Implemented.                                               |
| GET    | `/wc/v3/payments/disputes`                                | List disputes               | `allowlisted-read`       | Implemented.                                               |
| GET    | `/wc/v3/payments/disputes/{dispute_id}`                   | Get dispute                 | `allowlisted-read`       | Implemented.                                               |
| GET    | `/wc/v3/payments/charges/{charge_id}`                     | Get charge                  | `allowlisted-read`       | Implemented.                                               |
| POST   | `/wc/v3/payments/refund`                                  | Create refund               | `allowlisted-test-write` | Implemented with mode guard and `--yes`/`--dry-run`.       |
| POST   | `/wc/v3/payments/orders/{order_id}/capture_authorization` | Capture authorization       | `allowlisted-test-write` | Implemented with mode guard and `--yes`/`--dry-run`.       |
| POST   | `/wc/v3/payments/orders/{order_id}/cancel_authorization`  | Cancel authorization        | `allowlisted-test-write` | Implemented with mode guard and `--yes`/`--dry-run`.       |
| POST   | `/wc/v3/orders`                                           | Create test order           | `allowlisted-test-write` | Implemented; requires existing product and test/dev mode.  |

## Review checklist

- [ ] Confirm route exists in current WooPayments.
- [ ] Confirm required capability/auth behavior.
- [ ] Confirm request args and validation.
- [ ] Confirm response shape.
- [ ] Confirm live-mode write guard applies where needed.
- [ ] Add docs and examples before wrapping in curated command.
