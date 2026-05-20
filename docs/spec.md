# Spec: WooPayments CLI

- Created: 2026-05-20
- Updated: 2026-05-20

## Goal

Create a standalone `wcpay` CLI for developers, agents, internal teams, agencies, and savvy merchants to inspect, debug, and safely exercise WooPayments stores through existing WooCommerce/WooPayments REST APIs.

## Background

Agentic CLI helpers are becoming a common way to expose platform capabilities to both humans and AI tools. Notion's CLI is a useful reference point: it authenticates users, exposes platform primitives, supports direct API requests, and provides terminal-native workflows.

WooPayments already exposes many useful admin REST endpoints under `wc/v3/payments/...`, guarded by `manage_woocommerce`, and WooCommerce already supports REST API consumer keys/secrets. This gives us a practical v1 path without needing a new authentication system.

The v1 CLI should be standalone, not WP-CLI based. It should work against remote and local stores over HTTP(S), be scriptable, be safe by default, and produce structured output suitable for agents.

## Product Principles

1. **Standalone first**: ship a `wcpay` binary that does not require shell access to the WordPress server.
2. **Use existing auth first**: v1 uses WooCommerce REST API keys; a WooPayments CLI key-generation UI can be added later.
3. **Read-only in live mode**: live-mode stores allow reads only. Any write/destructive operation must be blocked unless WooPayments is in test/dev mode.
4. **Agent-friendly by default**: stable JSON output, deterministic errors, command schemas, dry-runs, redaction controls, and non-interactive flags.
5. **Human-friendly UX**: concise tables by default, helpful warnings, profile management, and clear next actions.
6. **Thin wrapper over stable APIs**: prefer existing WooCommerce/WooPayments REST endpoints before adding new plugin endpoints.
7. **Safety over completeness**: avoid live money movement or destructive changes in v1.

## Target Users

1. Internal WooPayments developers.
2. External extension developers and agencies.
3. Savvy merchants comfortable with CLI tools.
4. Support-adjacent users who need diagnostics.
5. AI agents using terminal tools or MCP.

## Scope Summary

### In Scope for v1

- Standalone `wcpay` CLI package/binary.
- Manual WooCommerce REST API key authentication.
- Local credential/profile storage.
- Raw API passthrough command.
- Mode-aware write guard that blocks non-read requests in live mode.
- Curated read commands for common WooPayments resources.
- Initial test-mode write workflows for test orders/payments/refunds where API support exists.
- `doctor` diagnostics command.
- JSON output for every command.
- Agent/tool schema discovery.
- Minimal stdio MCP server backed by the same command/tool registry.
- Documentation and install instructions.

### Explicitly Out of Scope for v1

- WP-CLI dependency or WP-CLI command implementation.
- Browser/device-code login.
- WooPayments settings UI for generating CLI keys.
- Live-mode write/destructive actions.
- Raw card data entry or handling.
- Full support bundle generation.
- Hosted auth callback/relay service.
- Hosted/remote MCP service or daemonized MCP server.
- Replacing WooCommerce Admin or WooPayments Admin UI.

## Authentication

### v1 Auth: Manual WooCommerce REST API Keys

The CLI supports adding a site profile by manually entering existing WooCommerce REST API credentials.

Example:

```bash
wcpay auth add --site https://store.example --name production
```

Interactive prompts:

```text
Site URL: https://store.example
Consumer key: ck_...
Consumer secret: cs_...
Default output: table/json
```

The CLI validates credentials by calling a safe read endpoint, preferably:

```http
GET /wp-json/wc/v3/payments/settings
```

If WooPayments is not active or the user lacks `manage_woocommerce`, the CLI should show a specific error.

### Credential Storage

Requirements:

1. Store credentials in the OS keychain where feasible.
2. Store non-secret profile metadata in a config file.
3. Provide a fallback encrypted or permission-restricted local file only if keychain integration is unavailable.
4. Never print secrets after initial input.
5. Support multiple profiles/sites.

Example commands:

```bash
wcpay auth add
wcpay auth list
wcpay auth remove production
wcpay auth test production
wcpay profile use production
wcpay whoami
```

### Future Auth: WooPayments CLI Key UI

Future option C:

- Add a WooPayments admin settings panel for generating CLI keys.
- Internally reuse WooCommerce API key storage where possible.
- Display a one-time command:

```bash
wcpay auth add --site https://store.example --consumer-key ck_... --consumer-secret cs_...
```

This remains out of v1, but v1 auth should be designed so this can be added without changing CLI storage or request code.

## API Access Model

The CLI calls store REST endpoints directly.

Base URL:

```text
{siteUrl}/wp-json
```

WooPayments endpoints are generally under:

```text
/wc/v3/payments/...
```

Minimal WooCommerce endpoints may also be used where required to support WooPayments workflows, such as creating test orders from an existing product:

```text
/wc/v3/orders
/wc/v3/products
```

The CLI should not become a general WooCommerce API CLI in v1.

### HTTP Auth

1. For HTTPS sites, use Basic Auth with WooCommerce consumer key/secret.
2. For local HTTP sites, support WooCommerce OAuth 1.0 request signing or query-string auth if required by WooCommerce behavior.
3. Refuse to send credentials over insecure remote HTTP unless the user explicitly opts in with a local/dev flag.

Recommended insecure transport behavior:

```bash
wcpay auth add --site http://localhost:8082 --allow-insecure-local
```

Remote non-HTTPS URLs should fail unless explicitly overridden with a scary flag.

### Endpoint Exposure Policy

Curated commands should use an explicit allowlist of WooPayments and minimal WooCommerce endpoints that have been reviewed for stability and safety.

The raw `wcpay api` command may call authenticated store REST endpoints, but it must still apply the same live-mode write guard and output/error handling.

## Safety Model

### Read vs Write

Read methods:

- `GET`
- `HEAD`
- `OPTIONS`

Write/destructive methods:

- `POST`
- `PUT`
- `PATCH`
- `DELETE`

### Live-Mode Write Guard

Before any write/destructive request, the CLI must determine the WooPayments mode by calling:

```http
GET /wp-json/wc/v3/payments/settings
```

Use these response fields:

- `is_test_mode_enabled`
- `is_test_mode_onboarding`
- `is_dev_mode_enabled`

A write is allowed only when either:

- `is_test_mode_enabled === true`, or
- `is_dev_mode_enabled === true`

If the store is live mode, fail before making the write request.

Example error:

```text
Refusing to run POST /wc/v3/payments/refund because WooPayments is in live mode.

WooPayments CLI v1 only allows write operations when test/dev mode is active.
Enable test mode in WooPayments settings and retry.
```

### Dry Run

All write-capable commands must support:

```bash
--dry-run
```

Dry-run behavior:

1. Validate profile/auth.
2. Resolve request path and body.
3. Check mode guard.
4. Print the request that would be sent.
5. Do not send the write request.

### Confirmation

Interactive destructive/test-mode writes should prompt unless `--yes` is provided.

Non-interactive environments should require either:

```bash
--yes
```

or:

```bash
--dry-run
```

## Output Model

### Default Human Output

Use concise tables or summaries.

Example:

```bash
wcpay account status
```

```text
Store:        https://store.example
Mode:         test
Account:      connected
Payments:     enabled
Deposits:     enabled
Country:      US
Currency:     USD
```

### JSON Output

Every command must support:

```bash
--json
```

JSON output requirements:

1. Stable top-level object shape.
2. Include `ok: true|false`.
3. Include `data` for successful responses.
4. Include `error` object for failures.
5. Include `meta` for profile/site/mode/request info where useful.
6. Never include secrets.

Success example:

```json
{
  "ok": true,
  "data": {
    "mode": "test",
    "accountStatus": "connected"
  },
  "meta": {
    "site": "https://store.example",
    "profile": "production"
  }
}
```

Error example:

```json
{
  "ok": false,
  "error": {
    "code": "live_mode_write_blocked",
    "message": "WooPayments CLI v1 only allows write operations in test/dev mode.",
    "status": 409
  },
  "meta": {
    "method": "POST",
    "path": "/wc/v3/payments/refund",
    "mode": "live"
  }
}
```

### Redaction

Commands that may return PII should support:

```bash
--redact
--no-redact
```

Default behavior:

- Human table output should avoid sensitive details by default.
- JSON should not redact by default for developer workflows unless the command is diagnostic/support-oriented.
- `doctor` should redact by default.

## Command Surface

## Global Flags

```bash
--profile <name>
--site <url>
--json
--redact
--no-redact
--dry-run
--yes
--verbose
--debug
--timeout <seconds>
```

## Core Commands

### `wcpay auth add`

Add a site profile using WooCommerce REST API credentials.

Acceptance criteria:

- Validates site URL.
- Prompts for key/secret if not passed via flags.
- Stores credentials securely.
- Verifies credentials against a safe endpoint.
- Provides clear errors for invalid credentials, missing WooPayments, and insufficient permissions.

### `wcpay auth list`

List configured profiles without secrets.

### `wcpay auth remove <profile>`

Remove stored profile and credentials.

### `wcpay auth test [profile]`

Validate stored credentials and show store/mode summary.

### `wcpay profile use <profile>`

Set the default profile.

### `wcpay whoami`

Show authenticated site/user/context where available.

## Diagnostics Commands

### `wcpay mode`

Show WooPayments mode.

Data sources:

```http
GET /wc/v3/payments/settings
```

Output:

- `test`
- `dev`
- `live`
- onboarding mode where available

### `wcpay doctor`

Run basic diagnostics.

Checks:

1. Site reachable.
2. REST API reachable.
3. Credentials valid.
4. WooCommerce available.
5. WooPayments available.
6. User has required capability.
7. WooPayments account status readable.
8. WooPayments mode readable.
9. HTTPS status.
10. Basic plugin/version data if available from safe endpoints.

Default behavior:

```bash
wcpay doctor --redact
```

Support bundle creation is out of v1, but `doctor --json --redact` should be suitable to paste into issues/support conversations.

## Raw API Command

### `wcpay api <method> <path> [fields...]`

Make authenticated requests to the store REST API.

Examples:

```bash
wcpay api get /wc/v3/payments/accounts
wcpay api get /wc/v3/payments/settings
wcpay api get /wc/v3/payments/transactions page:=1 per_page:=25
wcpay api post /wc/v3/payments/refund order_id:=123 amount:=500 reason="CLI test"
```

Requirements:

1. Support HTTP methods: GET, POST, PUT, PATCH, DELETE.
2. Accept paths with or without `/wp-json` prefix.
3. Support simple typed field assignment:
   - `foo=bar` string
   - `foo:=123` number
   - `foo:=true` boolean
   - `foo:=null` null
4. For GET/DELETE, encode fields as query params.
5. For POST/PUT/PATCH, encode fields as JSON body.
6. Apply live-mode write guard to non-read methods.
7. Support `--dry-run`.
8. Return raw response under `data` for `--json`.

## Curated Read Commands

### `wcpay account status`

Reads:

```http
GET /wc/v3/payments/accounts
```

Shows:

- account status
- country
- test mode
- test-mode onboarding
- deposits/payment capability status where available
- default/supported currencies where available

### `wcpay settings get`

Reads:

```http
GET /wc/v3/payments/settings
```

Shows key WooPayments settings and mode flags.

### `wcpay transactions list`

Reads existing transactions endpoint.

Likely endpoint:

```http
GET /wc/v3/payments/transactions
```

Flags:

```bash
--limit <n>
--page <n>
--since <date|duration>
--until <date>
--currency <code>
--status <status>
```

### `wcpay transactions get <id>`

Reads transaction detail endpoint if available.

### `wcpay deposits list`

Reads existing deposits endpoint.

### `wcpay deposits get <id>`

Reads deposit detail endpoint if available.

### `wcpay disputes list`

Reads existing disputes endpoint.

### `wcpay disputes get <id>`

Reads dispute detail endpoint if available.

### `wcpay charges get <id>`

Reads charge detail endpoint if available.

## Test-Mode Write Commands

All commands in this section must:

1. Run only in test/dev mode.
2. Support `--dry-run`.
3. Prompt unless `--yes` is passed.
4. Return structured JSON with created resource IDs.
5. Never accept raw card numbers.

### `wcpay test order create`

Create a WooCommerce test order suitable for WooPayments flows using an existing product.

Implementation requirements:

- Use WooCommerce REST API order creation.
- Require an existing product ID in v1.
- Do not auto-create products in v1.
- Mark generated orders with CLI metadata where possible.

Example:

```bash
wcpay test order create --product 123 --quantity 1 --email test@example.com
```

### `wcpay test payment create`

Create/confirm a test payment for an order using built-in named Stripe test scenarios where supported by existing endpoints.

Examples:

```bash
wcpay test payment create --order 123 --scenario success
wcpay test payment create --order 123 --scenario decline
wcpay test payment create --order 123 --scenario 3ds
wcpay test payment create --order 123 --scenario dispute
wcpay test payment create --order 123 --scenario fraudulent
```

Constraints:

- Use Stripe/WooPayments test fixtures, test payment method tokens, or official Stripe test card scenarios internally.
- Never accept arbitrary raw card numbers from CLI input.
- Must not support live mode.
- Document the built-in scenario aliases and the Stripe test behavior each maps to.
- Discovery must verify whether the existing WooPayments payment-intent endpoint accepts known test PaymentMethod IDs directly or whether the CLI needs a small helper/tokenization path.

### `wcpay refunds create`

Create a test-mode refund.

Endpoint:

```http
POST /wc/v3/payments/refund
```

Inputs:

```bash
--order <order_id>
--charge <charge_id>
--amount <minor_units>
--reason <text>
```

Requirements:

- Require either `--order` or `--charge`.
- Amount should be explicit.
- Display currency/amount interpretation clearly.
- Block in live mode.

### `wcpay authorizations capture`

Capture a test-mode authorization where supported.

Likely endpoint:

```http
POST /wc/v3/payments/orders/{order_id}/capture_authorization
```

### `wcpay authorizations cancel`

Cancel a test-mode authorization where supported.

Likely endpoint:

```http
POST /wc/v3/payments/orders/{order_id}/cancel_authorization
```

## Agent Features

### `wcpay tools describe`

Print a machine-readable description of supported commands/tools.

Requirements:

- JSON schema for command inputs.
- Read/write classification.
- Live-mode safety classification.
- Example invocations.

### `wcpay tools schema`

Print JSON schema definitions for command outputs and errors.

### `wcpay mcp`

Run a minimal MCP server over stdio.

Requirements:

- Use the same auth/profile/config model as the CLI.
- Use the same command/tool registry as `wcpay tools describe`.
- Expose read-oriented tools in v1, plus test-mode write tools only if they reuse the same mode guard cleanly.
- Do not require interactive prompts.
- Write tools must require explicit structured confirmation input, for example `confirm: true`, unless run as dry-run.
- Do not implement a hosted, remote, or daemonized MCP service in v1.

Initial read tools:

```text
wcpay_doctor
wcpay_get_mode
wcpay_get_account_status
wcpay_get_settings
wcpay_list_transactions
wcpay_list_deposits
wcpay_list_disputes
wcpay_api_get
```

## Packaging and Distribution

Repository:

```text
Automattic/wcpay-cli
```

Runtime and package format:

- Node.js + TypeScript for v1.
- npm package name: `@automattic/wcpay-cli`.
- Binary name: `wcpay`.

Initial install target:

```bash
npm install -g @automattic/wcpay-cli
```

Future distribution targets:

```bash
curl -fsSL https://wcpay.dev/install | bash
brew install automattic/tap/wcpay
```

Standalone compiled binaries can be added after the npm package stabilizes.

## Implementation Tasks

## Milestone 0: Technical Discovery

### Task 0.1: Inventory existing endpoints

Document existing WooPayments REST endpoints, methods, arguments, and whether each is read or write.

Acceptance criteria:

- Endpoint inventory exists in the CLI repo/docs.
- Each endpoint has method, path, controller, auth requirements, and safety classification.
- Unknown or risky endpoints are flagged.

### Task 0.2: Validate WooCommerce REST API key auth

Verify auth behavior for:

- HTTPS remote-style site using Basic Auth.
- Local HTTP site.
- Invalid key.
- Read-only key hitting read endpoint.
- Read-only key hitting write endpoint.
- Key belonging to a user without `manage_woocommerce`.

Acceptance criteria:

- We know whether local HTTP needs OAuth 1.0 signing.
- We know the exact error shapes returned by WooCommerce/WooPayments.
- Auth strategy is documented.

### Task 0.3: Validate mode detection

Verify that `/wc/v3/payments/settings` is available and returns mode flags for all relevant states:

- live
- test
- dev
- test-mode onboarding
- disconnected account

Acceptance criteria:

- CLI can reliably classify mode as `live`, `test`, or `dev`.
- Failure modes are documented.

## Milestone 1: CLI Foundation

### Task 1.1: Create CLI project/package

Set up CLI source structure, build tooling, tests, linting, and command framework.

Acceptance criteria:

- `wcpay --help` works locally.
- Commands can be unit-tested.
- Project has README with local development instructions.

### Task 1.2: Implement config/profile model

Implement profile metadata storage.

Acceptance criteria:

- Can create/list/select/remove profiles without storing secrets in plain command output.
- Config file path is documented.
- Corrupt config produces recoverable errors.

### Task 1.3: Implement secret storage

Integrate OS keychain or secure fallback.

Acceptance criteria:

- Secrets are stored separately from profile metadata where possible.
- `auth remove` deletes secrets.
- `auth list` never prints secrets.
- Automated tests cover secret-store abstraction with a mock backend.

### Task 1.4: Implement HTTP client

Build WooCommerce REST HTTP client.

Acceptance criteria:

- Supports base URL normalization.
- Supports Basic Auth over HTTPS.
- Supports local HTTP strategy identified in discovery.
- Handles query params and JSON bodies.
- Normalizes errors into CLI error objects.
- Has request timeout support.

## Milestone 2: Auth Commands

### Task 2.1: Implement `auth add`

Acceptance criteria:

- Interactive and flag-based credential entry both work.
- Credentials are validated before saving by default.
- `--no-verify` exists only if needed for advanced workflows.
- Invalid credentials are not saved unless explicitly forced.

### Task 2.2: Implement `auth list/remove/test`

Acceptance criteria:

- Profiles can be listed without secrets.
- Profiles can be removed with confirmation.
- `auth test` reports site reachability, auth validity, WooPayments availability, and mode.

### Task 2.3: Implement `profile use` and profile resolution

Acceptance criteria:

- Commands use default profile when none is specified.
- `--profile` overrides default.
- `--site` can override profile site where appropriate.
- Missing profile errors are actionable.

## Milestone 3: Safety and Output Infrastructure

### Task 3.1: Implement mode service

Acceptance criteria:

- `wcpay mode` returns correct mode for validated test cases.
- Mode lookup caches within a single command execution.
- Mode lookup failure blocks write commands by default.

### Task 3.2: Implement live-mode write guard

Acceptance criteria:

- All non-read raw API requests are blocked in live mode.
- All curated write commands are blocked in live mode.
- `--dry-run` does not send writes.
- Tests prove no write request is sent when mode guard fails.

### Task 3.3: Implement output formatter

Acceptance criteria:

- Every command can emit JSON.
- Human output is readable for core commands.
- Error output follows a stable shape.
- Secrets are never emitted.

### Task 3.4: Implement redaction utilities

Acceptance criteria:

- Redacts email, phone, address, tokens/secrets, and obvious IDs where appropriate for diagnostics.
- `doctor` uses redaction by default.
- `--no-redact` can be used intentionally.

## Milestone 4: Raw API Passthrough

### Task 4.1: Implement `wcpay api`

Acceptance criteria:

- Supports GET/POST/PUT/PATCH/DELETE.
- Normalizes paths with or without `/wp-json`.
- Supports typed field assignment syntax.
- Applies mode guard to write methods.
- Supports `--dry-run`.
- Supports `--json`.

### Task 4.2: Add API command tests

Acceptance criteria:

- Query encoding is tested.
- JSON body encoding is tested.
- Typed assignment parsing is tested.
- Live-mode write blocking is tested.
- HTTP error normalization is tested.

## Milestone 5: Curated Read Commands

### Task 5.1: Implement `account status`

Acceptance criteria:

- Reads `/wc/v3/payments/accounts`.
- Shows concise human summary.
- Emits raw/enriched JSON.

### Task 5.2: Implement `settings get`

Acceptance criteria:

- Reads `/wc/v3/payments/settings`.
- Shows mode and core settings.
- Supports JSON output.

### Task 5.3: Implement transaction commands

Acceptance criteria:

- `transactions list` works with pagination flags.
- `transactions get` works if endpoint exists; otherwise defer and document.
- Output is useful in table and JSON modes.

### Task 5.4: Implement deposits/disputes/charges reads

Acceptance criteria:

- List/get commands are implemented where endpoints exist.
- Missing endpoint support is documented rather than guessed.
- All commands support `--json`.

## Milestone 6: Diagnostics

### Task 6.1: Implement `doctor`

Acceptance criteria:

- Runs defined checks.
- Produces pass/warn/fail statuses.
- Redacts by default.
- Supports `--json`.
- Gives actionable remediation hints.

### Task 6.2: Add diagnostics fixtures/tests

Acceptance criteria:

- Tests cover unreachable site, invalid credentials, WooPayments missing, insufficient permissions, live mode, and test mode.

## Milestone 7: Test-Mode Write Workflows

### Task 7.1: Implement `refunds create`

Acceptance criteria:

- Calls `/wc/v3/payments/refund`.
- Requires test/dev mode.
- Supports `--dry-run` and `--yes`.
- Supports order-based and charge-based refunds where API supports them.

### Task 7.2: Implement authorization capture/cancel

Acceptance criteria:

- Calls existing order authorization endpoints.
- Requires test/dev mode.
- Validates required IDs.
- Supports `--dry-run` and `--yes`.

### Task 7.3: Implement `test order create`

Acceptance criteria:

- Creates test order via WooCommerce REST API.
- Requires an existing product ID.
- Does not auto-create products in v1.
- Requires test/dev mode.
- Does not affect live stores.
- Created orders are identifiable as CLI-created.

### Task 7.4: Implement `test payment create`

Acceptance criteria:

- Creates/confirms payment using existing WooPayments endpoint if feasible.
- Supports built-in named Stripe test scenarios such as success, decline, 3DS, dispute, and fraudulent.
- Requires test/dev mode.
- Uses payment method tokens/fixtures or official Stripe test scenario mappings, not arbitrary raw card input.
- Returns order/payment/intent IDs.

## Milestone 8: Agent Tooling

### Task 8.1: Implement `tools describe`

Acceptance criteria:

- Outputs JSON descriptions for commands.
- Includes input schemas, output schemas, examples, read/write classification, and safety notes.

### Task 8.2: Implement `tools schema`

Acceptance criteria:

- Outputs reusable JSON schemas for standard success/error envelopes.
- Schemas are tested for validity.

### Task 8.3: Implement `wcpay mcp`

Acceptance criteria:

- Starts a stdio MCP server.
- Reuses the CLI profile/auth/config system.
- Exposes read-oriented tools for doctor, mode, account, settings, transactions, deposits, disputes, and API GET.
- Applies the same output/error model as CLI commands.
- Does not expose interactive prompts through MCP.
- If write tools are included, they require test/dev mode and explicit structured confirmation or dry-run.

### Task 8.4: Document agent usage

Acceptance criteria:

- README includes examples for agent-safe CLI and MCP usage.
- Documents `--json`, `--dry-run`, `--redact`, and live-mode write guard.

## Milestone 9: Documentation and Release Prep

### Task 9.1: Write user documentation

Acceptance criteria:

- Installation instructions.
- Auth setup instructions.
- Common workflows.
- Troubleshooting.
- Security/safety model.

### Task 9.2: Write developer documentation

Acceptance criteria:

- Architecture overview.
- Command implementation guide.
- HTTP/auth client guide.
- Testing guide.

### Task 9.3: Package MVP

Acceptance criteria:

- Package can be installed locally/global.
- Version command works.
- Smoke test runs against local WooPayments dev site.

## Acceptance Criteria for v1 Overall

- [ ] A user can install and run `wcpay --help`.
- [ ] A user can add a WooCommerce REST API key profile.
- [ ] A user can validate credentials with `wcpay auth test`.
- [ ] A user can inspect WooPayments mode with `wcpay mode`.
- [ ] A user can run `wcpay doctor --json --redact`.
- [ ] A user can call read-only WooPayments endpoints via `wcpay api get ...`.
- [ ] A user can inspect account/settings/transactions through curated commands.
- [ ] Write commands are blocked in live mode before any write request is sent.
- [ ] Write commands work in test/dev mode for the implemented workflows.
- [ ] Every command supports JSON output.
- [ ] Secrets are never printed in command output.
- [ ] Agent command schemas are available.
- [ ] `wcpay mcp` exposes the minimal v1 MCP tool set over stdio.
- [ ] Documentation clearly explains auth, safety, MCP usage, and test-mode-only writes.

## Resolved Product Decisions

1. Repository: create a new repo at `Automattic/wcpay-cli`.
2. Runtime/package: Node.js + TypeScript for v1.
3. Package: publish as `@automattic/wcpay-cli`.
4. Binary: expose the command as `wcpay`.
5. Local HTTP: support local/non-HTTPS development stores in v1.
6. Endpoint policy: curated commands use an allowlist; raw API remains available with safety guards.
7. MCP: include minimal stdio `wcpay mcp` in v1.
8. Test orders: require an existing product; do not auto-create products in v1.
9. Test payments: provide built-in named Stripe test scenarios; do not accept arbitrary raw card numbers.
10. WooCommerce scope: expose only minimal WooCommerce helpers required for WooPayments workflows.
11. Telemetry: no telemetry in v1.

## Remaining Technical Questions

1. What exact local HTTP auth mechanism is required for WooCommerce REST API keys in supported local environments?
2. Which existing endpoints pass the stability/safety review for curated command allowlisting?
3. Does the existing WooPayments payment-intent endpoint accept known Stripe test PaymentMethod IDs directly, or do we need a helper/tokenization path?
4. Which built-in Stripe test scenarios should be included in the initial alias set beyond success, decline, 3DS, dispute, and fraudulent?

## Future Enhancements

1. WooPayments admin UI for generating CLI keys.
2. Browser/device-code login.
3. Hosted callback relay for WooCommerce auth flow.
4. Hosted/remote MCP transports beyond stdio.
5. Support bundle generation.
6. Webhook/event replay tooling.
7. Log tailing and structured log search.
8. CI recipes for smoke-testing WooPayments stores.
9. Homebrew/package-manager distribution.
10. Standalone compiled binaries.
11. `llms.txt` and public agent documentation.
