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
- config is stored in `config.json`;
- config dir resolves from `WCPAY_HOME`, then XDG config, then `~/.config/wcpay`;
- secrets use the OS keychain where available:
  - macOS: Keychain via the `security` CLI;
  - Linux: Secret Service via `secret-tool` when available;
- if the OS keychain is unavailable, the CLI fails with instructions rather than silently writing secrets to disk;
- set `WCPAY_KEYRING=0` to explicitly use file-based storage at `auth.json` with file mode `0600` for CI/containers.

## Environment variables

Planned variables:

| Variable | Purpose |
| --- | --- |
| `WCPAY_HOME` | Override config directory. |
| `WCPAY_PROFILE` | Override default profile for one shell/session. |
| `WCPAY_CONSUMER_KEY` | Provide a consumer key for CI/scripts. |
| `WCPAY_CONSUMER_SECRET` | Provide a consumer secret for CI/scripts. |
| `WCPAY_KEYRING` | Set to `0` to disable OS keychain. |

## Login

For now, `wcpay login` uses the no-browser WooCommerce REST API key flow by default. This works for local development, SSH sessions, containers, and environments where browser auth is unavailable:

```bash
wcpay login --site http://localhost:8082
```

The command prints the WooCommerce REST API key settings URL, then prompts for the generated consumer key and secret. In non-interactive environments, pass credentials explicitly or set env vars:

```bash
WCPAY_CONSUMER_KEY=ck_... \
WCPAY_CONSUMER_SECRET=cs_... \
  wcpay login --site http://localhost:8082 --no-verify
```

`--no-browser` is still accepted as an explicit alias, but it is no longer required.

## Add a profile directly

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
