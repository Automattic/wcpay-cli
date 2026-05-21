# Packaging and Release

The package identity is:

- npm package: `@automattic/wcpay-cli`
- binary: `wcpay`
- repository: `Automattic/wcpay-cli`

## Local package checks

```bash
npm run check
npm run pack:dry-run
```

## Development install

```bash
npm install
npm run build
npm link
wcpay --help
```

## Shell completions

```bash
wcpay completions bash
wcpay completions zsh
```

## Planned npm install

```bash
npm install -g @automattic/wcpay-cli
```

## Release readiness checklist

- [ ] Decide when to set `private: false`.
- [ ] Confirm license with project stakeholders.
- [ ] Confirm package scope permissions for `@automattic/wcpay-cli`.
- [ ] Add release automation once the GitHub repo exists.
- [ ] Add provenance/signing if required by Automattic standards.
- [ ] Add Homebrew/standalone binary distribution after npm package stabilizes.
