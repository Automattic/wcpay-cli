# WooPayments CLI Documentation

Documentation is a product requirement for `wcpay`. Every user-facing feature should ship with docs, examples, JSON output notes, and safety behavior.

## Start here

1. [Product spec](spec.md)
2. [CLI practices research](cli-practices.md)
3. [Getting started](getting-started.md)
4. [Authentication](auth.md)
5. [Safety model](safety.md)
6. [API command syntax](api.md)
7. [Command guide](commands.md)
8. [Generated command reference](command-reference.generated.md)
9. [Endpoint inventory](endpoint-inventory.md)
10. [Test scenarios](test-scenarios.md)
11. [MCP](mcp.md)
12. [Developer guide](developer-guide.md)
13. [Local smoke testing](local-smoke-testing.md)
14. [Packaging and release](packaging.md)
15. [Architecture decisions](decisions/0001-initial-product-shape.md)

## Documentation standards

Each command doc should include:

- what the command does;
- required auth/capabilities;
- live-mode/test-mode behavior;
- examples for human use;
- `--json` examples for agents/scripts;
- error examples;
- related REST endpoints;
- redaction/PII notes where relevant.

## Docs-as-code plan

Command metadata should eventually generate or validate:

- `wcpay tools describe`;
- `wcpay tools schema`;
- MCP tool definitions;
- command reference pages;
- JSON output examples.

Generated docs should be checked into the repo only if it improves reviewability; otherwise, docs checks should fail when metadata and docs drift.
