---
layout: home

hero:
  name: WooPayments CLI
  text: Terminal-native WooPayments diagnostics and test-mode workflows.
  tagline: Inspect, debug, and safely exercise WooPayments stores from local terminals, scripts, CI, and agent tooling.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Command reference
      link: /command-reference.generated
    - theme: alt
      text: GitHub
      link: https://github.com/Automattic/wcpay-cli

features:
  - title: Remote-first workflows
    details: Connect to local or remote stores over WooCommerce REST APIs without shell access to the WordPress runtime.
  - title: Safe by default
    details: Live-mode stores are read-only, write commands require explicit confirmation or dry runs, and secrets are stored keychain-first.
  - title: Human and agent ready
    details: Polished terminal output, stable JSON, command metadata, Abilities support, and a read-only MCP server.
---

## Install

Install the latest tagged version directly from GitHub:

```bash
npm install -g github:Automattic/wcpay-cli#v0.2.1
```

Then connect a store:

```bash
wcpay login --site https://store.example --name staging
wcpay doctor
```

## Documentation

- [Getting started](getting-started.md)
- [Authentication](auth.md)
- [Safety model](safety.md)
- [Command guide](commands.md)
- [Generated command reference](command-reference.generated.md)
- [API command syntax](api.md)
- [MCP](mcp.md)
- [Packaging and release](packaging.md)
