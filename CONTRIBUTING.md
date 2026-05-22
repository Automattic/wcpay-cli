# Contributing

## Development

```bash
npm install
npm run dev -- --help
npm run check
```

## Documentation is required

Documentation is first-class in this project. User-facing changes should include docs in the same PR.

Before opening a PR, verify:

- [ ] New/changed commands are documented in `docs/commands.md` or a dedicated page.
- [ ] Examples include human-readable and `--json` usage where applicable.
- [ ] Safety behavior is documented for every write-capable command.
- [ ] Auth/capability requirements are documented.
- [ ] MCP/tool metadata is updated for agent-facing commands.
- [ ] Tests cover output shape and safety behavior.

## Safety requirements

Any write-capable command must prove in tests that no write request is sent when WooPayments is in live mode.

## Commit style

Use concise, descriptive commit messages. Examples:

```text
Add auth profile storage
Document API command syntax
Implement live-mode write guard
```
