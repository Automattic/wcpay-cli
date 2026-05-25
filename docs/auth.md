# Authentication

`wcpay` authenticates with WooCommerce REST API consumer keys/secrets. The authenticated WordPress user must have the capabilities required by the WooPayments REST endpoints, typically `manage_woocommerce`.

## Commands

```bash
wcpay login
wcpay auth add
wcpay auth list
wcpay auth test [profile]
wcpay auth remove <profile>
wcpay auth remove <profile> --revoke
wcpay profile use <profile>
wcpay whoami
```

## Login

`wcpay login` uses the browser-based WooPayments connection flow when the store supports it. This flow opens WordPress/WooCommerce in your browser, asks an administrator to authorize WooPayments CLI, receives generated WooCommerce REST API credentials through a temporary localhost callback, verifies the connection unless `--no-verify` is used, and then stores credentials securely.

```bash
wcpay login --site localhost:8082
```

Browser login requires WooPayments 10.9 or later. Older stores automatically fall back to the manual WooCommerce REST API key flow, which prints the WooCommerce REST API key settings URL and prompts securely for the generated consumer key and secret. Bare remote domains default to HTTPS; bare loopback hosts such as `localhost:8082` default to HTTP for local development.

Browser login creates a read-only WooCommerce REST API key by default. Use `--scope read_write` only when you need write-capable test/dev workflows:

```bash
wcpay login --site localhost:8082 --scope read_write
```

If a default profile is already configured, interactive `wcpay login` asks for confirmation before continuing. Pass `--yes` to skip that confirmation in scripts or repeat setup flows.

<img src="assets/login-wizard.png" alt="WooPayments CLI login wizard" width="760">

In non-interactive environments, pass credentials explicitly or set environment variables:

```bash
WCPAY_CONSUMER_KEY=ck_... \
WCPAY_CONSUMER_SECRET=cs_... \
  wcpay login --site localhost:8082 --no-verify
```

Use `--no-browser` to skip browser login and go straight to the manual API key flow.

Avoid passing `--consumer-secret` directly in shared shells because command-line arguments can be captured in shell history or local process listings. Prefer browser login, interactive secret prompts, or short-lived environment variables.

## Add a profile directly

```bash
wcpay auth add \
  --site localhost:8082 \
  --consumer-key ck_... \
  --consumer-secret cs_... \
  --no-verify
```

Omit `--no-verify` to validate credentials against `/wc/v3/payments/settings` before saving.

## Remove or revoke a profile

Remove only the local profile and locally stored secret:

```bash
wcpay auth remove staging
```

For browser-created profiles on stores that support remote revocation, revoke the WooCommerce REST API key before deleting local credentials:

```bash
wcpay auth remove staging --revoke
```

If a profile was added manually and does not include a remote key ID, remove the API key in WooCommerce under **Settings > Advanced > REST API**.

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

## Browser login endpoint contract

WooPayments 10.9+ is expected to expose `POST /wc/v3/payments/cli/authorize` without existing API-key authentication. The CLI sends:

```json
{
	"app_name": "WooPayments CLI",
	"scope": "read",
	"state": "random-cli-state",
	"callback_url": "http://127.0.0.1:{port}/callback",
	"profile_name": "optional-profile-name"
}
```

A supporting store responds with:

```json
{
	"authorize_url": "https://store.example/wp-admin/...",
	"expires_at": "2026-01-01T00:00:00Z"
}
```

After administrator approval, WooPayments redirects the browser to the supplied localhost callback with `success=1`, the original `state`, and a short-lived `code`. The CLI validates `state`, exchanges the code with `POST /wc/v3/payments/cli/token`, stores the returned credentials in the configured secret store, and verifies them against `/wc/v3/payments/settings` unless `--no-verify` is passed. The CLI rejects authorization URLs that are not on the same origin as the store URL.

The token exchange response is:

```json
{
	"consumer_key": "ck_...",
	"consumer_secret": "cs_...",
	"key_id": "optional-key-id"
}
```

If the endpoint returns `404` or `405`, `wcpay login` treats the store as older than the browser-login capability and falls back to the manual API key flow.
