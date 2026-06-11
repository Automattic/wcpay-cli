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

`npm run check` includes `npm run release:check`, which verifies release docs stay in sync with `package.json`, including the README GitHub release asset URL and the changelog heading.

## Development install

```bash
npm install
npm run build
npm link
wcpay --help
```

## Shell completions

Completions are generated from the live command tree, so new commands appear automatically:

```bash
wcpay completions bash
wcpay completions zsh
wcpay completions fish
```

## Documentation site

The Markdown docs can be rendered locally with VitePress:

```bash
npm run site:dev
npm run site:build
npm run site:preview
```

The GitHub Pages workflow deploys the built site from `docs/.vitepress/dist` on pushes to `main`.

## Package contents

`npm run pack:dry-run` shows the files included in the package. The package includes built `dist` files, Markdown documentation, `README.md`, `LICENSE`, and `package.json`.

Screenshot assets under `docs/assets/` are used by the GitHub docs but excluded from the npm package to keep installs smaller.

## npm install command

Once published to npm:

```bash
npm install -g @automattic/wcpay-cli
```

Before npm publication, the GitHub release tarball is the install source. Keep this URL aligned with `package.json` during every release; `npm run release:check` enforces that the documented release asset URL points at the current package version.

```bash
npm install -g https://github.com/Automattic/wcpay-cli/releases/download/v0.2.4/automattic-wcpay-cli-0.2.4.tgz
```

## Releasing

1. Bump the version in `package.json`, `src/core/version.ts`, the README install URL, and add a `CHANGELOG.md` heading. `npm run release:check` verifies the docs; the version test verifies `version.ts`.
2. Land the release PR, then tag and push:

    ```bash
    git tag v<version>
    git push origin v<version>
    ```

3. The Release workflow runs the full `check` suite, packs the tarball, and creates the GitHub release with the tarball attached — the URL documented in the README.
