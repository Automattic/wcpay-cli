# Test Scenarios

`wcpay test payment create` should expose named scenarios instead of requiring users or agents to enter raw card numbers.

## Initial aliases

| Alias | Intended behavior |
| --- | --- |
| `success` | Successful card payment. |
| `decline` | Generic declined card/payment. |
| `3ds` | Authentication/3D Secure flow. |
| `dispute` | Payment suitable for dispute simulation. |
| `fraudulent` | Fraud/risk scenario. |

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

The command uses the existing WooPayments payment-intents REST endpoint:

```http
POST /wc/v3/payments/payment_intents
```

It sends the order ID and mapped test payment method ID.

## Rules

- Only works in test/dev mode.
- Never accepts arbitrary raw card numbers.
- Internally maps aliases to official Stripe test fixtures or WooPayments-compatible PaymentMethod tokens.
- Current implementation maps aliases to Stripe test PaymentMethod IDs and sends them to the existing WooPayments payment-intents endpoint.
- A local/connected account smoke test still needs to confirm each alias succeeds end-to-end in WooPayments.

## References

- Stripe testing: https://docs.stripe.com/testing.md
- Stripe Radar testing: https://docs.stripe.com/radar/testing.md
