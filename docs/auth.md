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

Current implementation:

- non-secret metadata is stored in `profiles.json`;
- credentials are stored in `auth.json` with file mode `0600`;
- config is stored in `config.json`;
- config dir resolves from `WCPAY_HOME`, then XDG config, then `~/.config/wcpay`.

Planned improvement:

- secrets should move to the OS keychain by default;
- `WCPAY_KEYRING=0` should remain available for CI/containers and file-based fallback.

## Environment variables

Planned variables:

| Variable | Purpose |
| --- | --- |
| `WCPAY_HOME` | Override config directory. |
| `WCPAY_PROFILE` | Override default profile for one shell/session. |
| `WCPAY_CONSUMER_KEY` | Provide a consumer key for CI/scripts. |
| `WCPAY_CONSUMER_SECRET` | Provide a consumer secret for CI/scripts. |
| `WCPAY_KEYRING` | Set to `0` to disable OS keychain. |

## Add a profile today

```bash
wcpay auth add \
  --site http://localhost:8082 \
  --consumer-key ck_... \
  --consumer-secret cs_... \
  --no-verify
```

Omit `--no-verify` to validate credentials against `/wc/v3/payments/settings` before saving.

## Future auth

A future WooPayments settings UI can generate a CLI key and show a one-time command:

```bash
wcpay auth add --site https://store.example --consumer-key ck_... --consumer-secret cs_...
```
