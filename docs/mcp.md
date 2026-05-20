# MCP

`wcpay mcp` will expose a minimal stdio MCP server for agent workflows.

## v1 scope

- stdio transport only;
- local process launched by an MCP client;
- same profile/auth/config as CLI commands;
- same safety guard as CLI commands;
- read-oriented tools first;
- no hosted service or daemon.

## Initial tools

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

## Write tools

Write tools may be added only when they can reuse the CLI mode guard cleanly.

Requirements:

- test/dev mode only;
- `dryRun` support;
- explicit structured confirmation, e.g. `confirm: true`;
- no interactive prompts;
- stable JSON errors.

## Security notes

Agents can be affected by prompt injection and tool misuse. Users should enable human confirmation in MCP clients for write-capable tools. v1 blocks live-mode writes entirely.
