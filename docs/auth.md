# Authentication

## v1 approach

`wcpay` v1 uses WooCommerce REST API consumer keys/secrets.

Why:

- WooCommerce already supports API keys.
- WooPayments REST controllers already require an authenticated user with `manage_woocommerce`.
- This avoids a hosted auth service for v1.

## Commands

```bash
wcpay auth add
wcpay auth list
wcpay auth test [profile]
wcpay auth remove <profile>
wcpay profile use <profile>
```

## Storage model

Planned behavior:

- secrets in OS keychain by default;
- non-secret metadata in `profiles.json`;
- config in `config.json`;
- config dir resolved from `WCPAY_HOME`, then XDG config, then `~/.config/wcpay`;
- `WCPAY_KEYRING=0` allows file-based fallback for CI/containers.

## Environment variables

Planned variables:

| Variable | Purpose |
| --- | --- |
| `WCPAY_HOME` | Override config directory. |
| `WCPAY_PROFILE` | Override default profile for one shell/session. |
| `WCPAY_CONSUMER_KEY` | Provide a consumer key for CI/scripts. |
| `WCPAY_CONSUMER_SECRET` | Provide a consumer secret for CI/scripts. |
| `WCPAY_KEYRING` | Set to `0` to disable OS keychain. |

## Future auth

A future WooPayments settings UI can generate a CLI key and show a one-time command:

```bash
wcpay auth add --site https://store.example --consumer-key ck_... --consumer-secret cs_...
```
