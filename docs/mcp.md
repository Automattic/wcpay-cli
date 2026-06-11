# MCP

`wcpay mcp` exposes a local stdio MCP server for agent workflows.

## Scope

- stdio transport;
- local process launched by an MCP client;
- same profile/auth/config as CLI commands;
- same JSON envelope shape as CLI commands;
- read-only WooPayments REST-backed tools.

## Tools

```text
wcpay_doctor
wcpay_get_mode
wcpay_get_account_status
wcpay_get_settings
wcpay_list_transactions
wcpay_get_transactions_summary
wcpay_list_deposits
wcpay_get_deposit
wcpay_get_deposits_overview
wcpay_list_disputes
wcpay_get_dispute
wcpay_get_disputes_summary
wcpay_get_charge
wcpay_get_timeline
wcpay_list_authorizations
wcpay_api_get
```

The tool list is kept in lockstep with `src/tools/registry.ts` — a test fails if a registry entry marked `mcp: true` is missing from the server or vice versa.

Run it with:

```bash
wcpay mcp
```

MCP tools return the same JSON envelope shape used by the CLI, serialized as text content for compatibility.

## Security notes

Agents can be affected by prompt injection and tool misuse. The MCP server exposes read-only tools and uses the same local profile/auth configuration as the CLI.

MCP tools can still read financial, customer, transaction, deposit, dispute, and account data from the selected store. Only run `wcpay mcp` for trusted local agents and trusted sessions, and disconnect it when you are done.

Live-mode write blocking is part of the shared CLI safety model. If write-capable MCP tools are added later, they must reuse the same mode guard and require explicit structured confirmation.
