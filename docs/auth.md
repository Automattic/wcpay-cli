# Authentication

`wcpay` authenticates with WooCommerce REST API consumer keys/secrets. The authenticated WordPress user must have the capabilities required by the WooPayments REST endpoints, typically `manage_woocommerce`.

## Commands

```bash
wcpay login --site https://store.example --name staging
wcpay auth add --site https://store.example --name staging --consumer-key ck_... --consumer-secret cs_...
wcpay auth list
wcpay auth test [profile]
wcpay auth remove <profile>
wcpay profile use <profile>
wcpay whoami
```

## Guided manual login

`wcpay login` guides you through manual WooCommerce REST API key setup. It prints the WooCommerce REST API key settings URL, prompts securely for the generated consumer key and secret, verifies the connection unless `--no-verify` is used, and stores credentials securely.

Bare remote domains default to HTTPS. Bare loopback hosts such as `localhost:8082` default to HTTP for local development.

```bash
wcpay login --site store.example --name staging
```

For local stores:

```bash
wcpay login --site localhost:8082 --name local
```

Avoid passing `--consumer-secret` directly in shared shells because command-line arguments can be captured in shell history or local process listings. Prefer interactive secret prompts or short-lived environment variables.

## Add a profile directly

For scripts or CI, pass credentials explicitly or through environment variables:

```bash
wcpay auth add \
  --site https://store.example \
  --name staging \
  --consumer-key "$WCPAY_CONSUMER_KEY" \
  --consumer-secret "$WCPAY_CONSUMER_SECRET"
```

## Remove a profile

Remove the local profile and locally stored secret:

```bash
wcpay auth remove staging
```

This does not revoke the WooCommerce REST API key on the store. Remove unused API keys in WooCommerce under **Settings > Advanced > REST API**.

## Storage

- Non-secret profile metadata is stored in `profiles.json`.
- Secrets are stored in the OS keychain when available.
- Set `WCPAY_KEYRING=0` to use file-backed storage for CI/containers.
- Set `WCPAY_HOME=/path/to/dir` to isolate config and credentials.

## Environment variables

| Variable                | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `WCPAY_PROFILE`         | Override default profile for one shell/session. |
| `WCPAY_CONSUMER_KEY`    | Consumer key used by `auth add` or `login`.  |
| `WCPAY_CONSUMER_SECRET` | Consumer secret used by `auth add` or `login`. |
| `WCPAY_HOME`            | Override config directory.                   |
| `WCPAY_KEYRING=0`       | Use file-backed secret storage.              |
