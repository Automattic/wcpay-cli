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

`npm run check` includes `npm run release:check`, which verifies release docs stay in sync with `package.json`, including the README GitHub install tag and the changelog heading.

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

Once published to npm:

```bash
npm install -g @automattic/wcpay-cli
```

Before npm publication, install the latest tagged version from GitHub. Keep this tag aligned with `package.json` during every release; `npm run release:check` enforces that the README command points at the current package version.

```bash
npm install -g github:Automattic/wcpay-cli#v0.2.1
```
