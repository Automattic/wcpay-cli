# Local Smoke Testing

This project should be smoke-tested against the local WooPayments development site at `http://localhost:8082` when available.

## Create a temporary WooCommerce REST API key

From `/Users/mal/projects/wcpay`:

```bash
docker compose exec -T wordpress bash -lc 'cd /var/www/html && wp eval '\''global $wpdb; $user_id = 1; $consumer_key = "ck_" . wc_rand_hash(); $consumer_secret = "cs_" . wc_rand_hash(); $wpdb->insert( $wpdb->prefix . "woocommerce_api_keys", array( "user_id" => $user_id, "description" => "wcpay-cli smoke test " . gmdate("c"), "permissions" => "read_write", "consumer_key" => wc_api_hash( $consumer_key ), "consumer_secret" => $consumer_secret, "truncated_key" => substr( $consumer_key, -7 ) ), array( "%d", "%s", "%s", "%s", "%s", "%s" ) ); echo wp_json_encode( array( "key_id" => $wpdb->insert_id, "consumer_key" => $consumer_key, "consumer_secret" => $consumer_secret ) );'\'' --allow-root'
```

Delete it afterwards:

```bash
docker compose exec -T wordpress bash -lc 'cd /var/www/html && wp eval '\''global $wpdb; $wpdb->delete( $wpdb->prefix . "woocommerce_api_keys", array( "key_id" => YOUR_KEY_ID ), array( "%d" ) );'\'' --allow-root'
```

## Smoke commands

From `/Users/mal/projects/wcpay-cli`:

```bash
npm run build
TMP_WCPAY_HOME=$(mktemp -d)
WCPAY_HOME=$TMP_WCPAY_HOME WCPAY_KEYRING=0 \
  node dist/cli.js login \
  --site http://localhost:8082 \
  --consumer-key ck_... \
  --consumer-secret cs_... \
  --json

WCPAY_HOME=$TMP_WCPAY_HOME WCPAY_KEYRING=0 node dist/cli.js auth list --json
WCPAY_HOME=$TMP_WCPAY_HOME WCPAY_KEYRING=0 node dist/cli.js doctor --json
WCPAY_HOME=$TMP_WCPAY_HOME WCPAY_KEYRING=0 node dist/cli.js mode --json
WCPAY_HOME=$TMP_WCPAY_HOME WCPAY_KEYRING=0 node dist/cli.js account status --json
WCPAY_HOME=$TMP_WCPAY_HOME WCPAY_KEYRING=0 node dist/cli.js settings get --json
WCPAY_HOME=$TMP_WCPAY_HOME WCPAY_KEYRING=0 node dist/cli.js refunds create --order 123 --amount 500 --dry-run --json
WCPAY_HOME=$TMP_WCPAY_HOME WCPAY_KEYRING=0 node dist/cli.js test order create --product 123 --quantity 1 --dry-run --json
```

## 2026-05-22 result

Validated successfully against the local WooPayments site with a connected test/dev account:

- Created a temporary WooCommerce REST API key and deleted it after testing.
- `wcpay login --json` with explicit credentials worked against `http://localhost:8082`.
- `wcpay auth list --json` returned the temporary profile.
- `wcpay doctor --json` passed profile, site URL, auth, and mode checks.
- `wcpay mode --json` returned `dev` mode with `is_test_mode_enabled`, `is_test_mode_onboarding`, and `is_dev_mode_enabled` all true.
- `wcpay account status --json` returned a connected test account.
- `wcpay settings get --json` returned WooPayments settings successfully.
- `wcpay refunds create --dry-run --json` passed the test/dev-mode guard and printed a redacted POST request without sending it.
- `wcpay test order create --dry-run --json` passed the test/dev-mode guard and printed a redacted POST request without sending it.
- `wcpay mcp --help` printed the MCP command help.

## 2026-05-21 result

Validated successfully against the local WooPayments site:

- `wcpay login` with explicit credentials worked.
- HTTP local OAuth signing worked.
- `wcpay mode --json` returned `dev` mode with `is_test_mode_enabled`, `is_test_mode_onboarding`, and `is_dev_mode_enabled` all true.
- `wcpay account status --json` returned successfully with `data: false` for the current disconnected/local account state.
- `wcpay refunds create --dry-run --json` passed the test/dev-mode guard and printed a redacted POST request without sending it.
- `wcpay test order create --dry-run --json` passed the test/dev-mode guard and printed a redacted POST request without sending it.
