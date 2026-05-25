# Test Scenarios

`wcpay test payment create` should expose named scenarios instead of requiring users or agents to enter raw card numbers.

## Initial aliases

| Alias        | Intended behavior                        |
| ------------ | ---------------------------------------- |
| `success`    | Successful card payment.                 |
| `decline`    | Generic declined card/payment.           |
| `3ds`        | Authentication/3D Secure flow.           |
| `dispute`    | Payment suitable for dispute simulation. |
| `fraudulent` | Fraud/risk scenario.                     |

## Commands

List scenarios:

```bash
wcpay test payment scenarios
```

Create a test payment:

```bash
wcpay test payment create --order 123 --scenario success --dry-run
wcpay test payment create --order 123 --scenario success --yes
```

The command uses existing WooPayments REST endpoints:

```http
POST /wc/v3/payments/orders/{order_id}/create_customer
POST /wc/v3/payments/payment_intents
```

It creates/updates the WooPayments customer for the order, then sends the order ID, mapped test payment method ID, and returned customer ID to the payment-intents endpoint.

## Rules

- Only works in test/dev mode.
- Never accepts arbitrary raw card numbers.
- Internally maps aliases to official Stripe test fixtures or WooPayments-compatible PaymentMethod tokens.
- Current implementation maps aliases to Stripe test PaymentMethod IDs and sends them to the existing WooPayments payment-intents endpoint.
- The `success` alias has been smoke-tested end-to-end against a local connected test/dev account.

## References

- Stripe testing: https://docs.stripe.com/testing.md
- Stripe Radar testing: https://docs.stripe.com/radar/testing.md
