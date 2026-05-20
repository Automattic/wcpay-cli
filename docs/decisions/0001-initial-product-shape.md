# 0001: Initial Product Shape

- Status: accepted
- Date: 2026-05-20

## Context

We want a WooPayments CLI similar in spirit to Stripe and Notion CLIs: useful for humans, scripts, and agents.

## Decision

- Repository: `Automattic/wcpay-cli`
- Runtime: Node.js + TypeScript
- npm package: `@automattic/wcpay-cli`
- binary: `wcpay`
- v1 auth: manual WooCommerce REST API keys
- future auth: WooPayments settings UI for CLI key generation
- live-mode behavior: read-only
- writes: test/dev mode only
- MCP: minimal stdio server in v1
- docs: first-class product surface

## Consequences

- The CLI can ship independently of the WooPayments plugin.
- We can iterate quickly using the Woo/WooPayments frontend stack.
- Strong docs and metadata are required to make the CLI useful to agents.
- Some future work may be needed in WooPayments for better auth/key-generation UX.
