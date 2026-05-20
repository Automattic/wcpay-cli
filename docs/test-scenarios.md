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

## Example

```bash
wcpay test payment create --order 123 --scenario success
```

## Rules

- Only works in test/dev mode.
- Never accepts arbitrary raw card numbers.
- Internally maps aliases to official Stripe test fixtures or WooPayments-compatible PaymentMethod tokens.
- Discovery must confirm whether existing WooPayments endpoints accept known Stripe test PaymentMethod IDs directly.

## References

- Stripe testing: https://docs.stripe.com/testing.md
- Stripe Radar testing: https://docs.stripe.com/radar/testing.md
