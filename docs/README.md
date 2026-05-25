# WooPayments CLI Documentation

`wcpay` is a standalone CLI for inspecting, debugging, and safely exercising WooPayments stores over REST APIs.

## Start here

1. [Getting started](getting-started.md)
2. [Authentication](auth.md)
3. [Safety model](safety.md)
4. [Command guide](commands.md)
5. [Generated command reference](command-reference.generated.md)
6. [API command syntax](api.md)
7. [Endpoint inventory](endpoint-inventory.md)
8. [Test scenarios](test-scenarios.md)
9. [MCP](mcp.md)
10. [Developer guide](developer-guide.md)
11. [Local smoke testing](local-smoke-testing.md)
12. [Packaging and release](packaging.md)

## Screenshots

Reusable screenshots live under `docs/assets/`:

- [`welcome.png`](./assets/welcome.png) — first-run welcome screen.
- [`login-wizard.png`](./assets/login-wizard.png) — guided login flow.
- [`dry-run.png`](./assets/dry-run.png) — redacted write dry-run output.

## Documentation standards

User-facing command docs should include:

- what the command does;
- required auth/capabilities;
- live-mode/test-mode behavior;
- examples for human use;
- `--json` examples for agents/scripts;
- stable error examples;
- related REST endpoints;
- redaction/PII notes where relevant.

## Generated reference

`docs/command-reference.generated.md` is generated from command metadata.

After changing command names, descriptions, or options, run:

```bash
npm run docs:generate
```

`npm run check` includes `npm run docs:check` and fails when the generated command reference is stale.
