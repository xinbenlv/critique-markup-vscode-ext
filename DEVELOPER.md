# DEVELOPER.md

Everything about developing, testing, packaging, and publishing this repo lives here.

If you're looking for end-user docs, installation, screenshots, or feature overview, read [`README.md`](./README.md) instead.

## Repository purpose

This repository contains the **Critique Markup** VS Code extension published as:

- **VS Code Marketplace**: `xinbenlv.critique-markup-vscode-ext`
- **OpenVSX Registry**: `xinbenlv.critique-markup-vscode-ext`

## Local development

### Requirements

- Node.js + npm
- VS Code
- `vsce` for Marketplace packaging/publishing
- `ovsx` for OpenVSX publishing

Install the publisher CLIs if needed:

```bash
npm install -g @vscode/vsce ovsx
```

### Install dependencies

```bash
npm install
```

### Build

```bash
npm run compile
```

### Test

```bash
npm test
```

### Generate visual assets

```bash
npm run visual-regression
```

## Versioning

The extension version is stored in `package.json` and `package-lock.json`.

Update it with:

```bash
npm version <new-version> --no-git-tag-version
```

Example:

```bash
npm version 2.0.1 --no-git-tag-version
```

## Packaging

Build the VSIX package locally before publishing:

```bash
vsce package --no-dependencies
```

That produces a file like:

```bash
critique-markup-vscode-ext-2.0.1.vsix
```

## Publishing

You need two separate tokens. One for Microsoft Marketplace, one for OpenVSX. Mixing them up is how you waste an afternoon.

### 1. Configure tokens

Put these in your shell environment or `~/.env`:

```bash
VSCODE_MARKETPLACE_TOKEN=***
OPENVSX_TOKEN=***
```

### 2. Publish with the npm script

The repo ships a single publish entry point:

```bash
set -a
source ~/.env
set +a
npm run publish:extension
```

What it does:

1. Verifies both required token environment variables exist
2. Packages the extension into a `.vsix`
3. Publishes to VS Code Marketplace
4. Publishes the same package to OpenVSX

If either token is missing, the script fails immediately and prints exactly what to export.

### 3. Public listing URLs

- VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=xinbenlv.critique-markup-vscode-ext
- OpenVSX Registry: https://open-vsx.org/extension/xinbenlv/critique-markup-vscode-ext

## Recommended release checklist

1. Update version with `npm version <new-version> --no-git-tag-version`
2. Run `npm test`
3. Run `source ~/.env && npm run publish:extension`
4. Verify both public listing pages show the new version

## Repo guidance

- Keep `README.md` focused on end users
- Keep developer workflow, release instructions, and publishing steps in this file
- Keep screenshots and GIFs in `assets/screenshots/`
- Rebuild/package again before publishing if you changed extension code or docs that affect the Marketplace listing
