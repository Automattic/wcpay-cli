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

## Package contents

`npm run pack:dry-run` shows the files included in the package. The package includes built `dist` files, Markdown documentation, `README.md`, `LICENSE`, and `package.json`.

Screenshot assets under `docs/assets/` are used by the GitHub docs but excluded from the npm package to keep installs smaller.

## npm install command

```bash
npm install -g @automattic/wcpay-cli
```
