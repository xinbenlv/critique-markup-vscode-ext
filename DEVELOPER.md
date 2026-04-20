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

Put these in your shell env or `~/.env`:

```bash
VSCODE_MARKETPLACE_TOKEN=...
OPENVSX_TOKEN=...
```

### 2. Publish to VS Code Marketplace

Publish directly from the repo root:

```bash
source ~/.env
vsce publish --pat "$VSCODE_MARKETPLACE_TOKEN"
```

If you only want to upload an already-built package, you can still use `vsce publish` after ensuring `package.json` has the intended version.

After a successful publish, the extension should appear at:

```text
https://marketplace.visualstudio.com/items?itemName=xinbenlv.critique-markup-vscode-ext
```

### 3. Publish to OpenVSX

If the namespace does not exist yet, create it once:

```bash
source ~/.env
ovsx create-namespace xinbenlv -p "$OPENVSX_TOKEN"
```

Then publish the VSIX:

```bash
source ~/.env
ovsx publish critique-markup-vscode-ext-2.0.1.vsix -p "$OPENVSX_TOKEN"
```

After a successful publish, the extension should appear at:

```text
https://open-vsx.org/extension/xinbenlv/critique-markup-vscode-ext
```

## Recommended release checklist

1. Update version with `npm version <new-version> --no-git-tag-version`
2. Run `npm test`
3. Run `vsce package --no-dependencies`
4. Publish to VS Code Marketplace
5. Publish the generated `.vsix` to OpenVSX
6. Verify both public listing pages show the new version

## Repo guidance

- Keep `README.md` focused on end users
- Keep developer workflow, release instructions, and publishing steps in this file
- Keep screenshots and GIFs in `assets/screenshots/`
- Rebuild/package again before publishing if you changed extension code or docs that affect the Marketplace listing
