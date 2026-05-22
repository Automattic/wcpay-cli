# Authentication

`wcpay` authenticates with WooCommerce REST API consumer keys/secrets. The authenticated WordPress user must have the capabilities required by the WooPayments REST endpoints, typically `manage_woocommerce`.

## Commands

```bash
wcpay login
wcpay auth add
wcpay auth list
wcpay auth test [profile]
wcpay auth remove <profile>
wcpay profile use <profile>
wcpay whoami
```

## Login

`wcpay login` uses a no-browser WooCommerce REST API key flow by default. This works for local development, SSH sessions, containers, and environments where browser auth is unavailable:

```bash
wcpay login --site http://localhost:8082
```

The command prints the WooCommerce REST API key settings URL, then prompts for the generated consumer key and secret.

In non-interactive environments, pass credentials explicitly or set environment variables:

```bash
WCPAY_CONSUMER_KEY=ck_... \
WCPAY_CONSUMER_SECRET=cs_... \
  wcpay login --site http://localhost:8082 --no-verify
```

`--no-browser` is accepted as an explicit alias, but it is not required.

## Add a profile directly

```bash
wcpay auth add \
  --site http://localhost:8082 \
  --consumer-key ck_... \
  --consumer-secret cs_... \
  --no-verify
```

Omit `--no-verify` to validate credentials against `/wc/v3/payments/settings` before saving.

## Storage model

- Non-secret profile metadata is stored in `profiles.json`.
- CLI config is stored in `config.json`.
- The config directory resolves from `WCPAY_HOME`, then XDG config, then `~/.config/wcpay`.
- Secrets use the OS keychain where available:
    - macOS: Keychain via the `security` CLI.
    - Linux: Secret Service via `secret-tool` when available.
- If the OS keychain is unavailable, the CLI fails with instructions rather than silently writing secrets to disk.
- Set `WCPAY_KEYRING=0` to explicitly use file-based storage at `auth.json` with file mode `0600` for CI/containers.

## Environment variables

| Variable                | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `WCPAY_HOME`            | Override config directory.                      |
| `WCPAY_PROFILE`         | Override default profile for one shell/session. |
| `WCPAY_CONSUMER_KEY`    | Provide a consumer key for CI/scripts.          |
| `WCPAY_CONSUMER_SECRET` | Provide a consumer secret for CI/scripts.       |
| `WCPAY_KEYRING`         | Set to `0` to disable OS keychain.              |
