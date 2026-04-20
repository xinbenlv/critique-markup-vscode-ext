#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const version = pkg.version;
const vsixName = `${pkg.name}-${version}.vsix`;
const vsixPath = path.join(repoRoot, vsixName);

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function redactArgs(args) {
  const secretFlags = new Set(['--pat', '-p']);
  const redacted = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    redacted.push(arg);

    if (secretFlags.has(arg) && i + 1 < args.length) {
      redacted.push('<redacted>');
      i += 1;
    }
  }

  return redacted;
}

function run(command, args, extraEnv = {}) {
  console.log(`\n> ${command} ${redactArgs(args).join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      fail(`Command not found: ${command}. Install the required CLI first.`);
    }
    fail(`${command} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${command} exited with status ${result.status}.`);
  }
}

const missing = [];
if (!process.env.VSCODE_MARKETPLACE_TOKEN) missing.push('VSCODE_MARKETPLACE_TOKEN');
if (!process.env.OPENVSX_TOKEN) missing.push('OPENVSX_TOKEN');

if (missing.length > 0) {
  fail(
    `Missing required environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.\n`
    + 'Set both tokens before publishing. Example:\n\n'
    + '  export VSCODE_MARKETPLACE_TOKEN=...\n'
    + '  export OPENVSX_TOKEN=...\n\n'
    + 'Or if you keep them in ~/.env, run:\n\n'
    + '  source ~/.env && npm run publish:extension'
  );
}

console.log(`Publishing ${pkg.publisher}.${pkg.name} v${version}`);

run('npm', ['test']);
run('vsce', ['package', '--no-dependencies']);

if (!existsSync(vsixPath)) {
  fail(`Expected packaged VSIX not found: ${vsixPath}`);
}

run('vsce', ['publish', '--pat', process.env.VSCODE_MARKETPLACE_TOKEN]);
run('ovsx', ['publish', vsixName, '-p', process.env.OPENVSX_TOKEN]);

console.log(`\n✅ Published ${pkg.publisher}.${pkg.name} v${version} to VS Code Marketplace and OpenVSX.`);
