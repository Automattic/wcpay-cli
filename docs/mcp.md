# MCP

`wcpay mcp` exposes a local stdio MCP server for agent workflows.

## Scope

- stdio transport;
- local process launched by an MCP client;
- same profile/auth/config as CLI commands;
- same JSON envelope shape as CLI commands;
- read-only WooPayments tools.

## Tools

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

Run it with:

```bash
wcpay mcp
```

MCP tools return the same JSON envelope shape used by the CLI, serialized as text content for compatibility.

## Security notes

Agents can be affected by prompt injection and tool misuse. The MCP server exposes read-only tools and uses the same local profile/auth configuration as the CLI.

Live-mode write blocking is part of the shared CLI safety model. If write-capable MCP tools are added later, they must reuse the same mode guard and require explicit structured confirmation.
