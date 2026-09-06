#!/usr/bin/env node
// Wrapper around @expo/cli that fixes the entry-file path for npm workspace builds.
// The Expo CLI's export:embed command incorrectly resolves paths in monorepo setups.
const { execFileSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

// Fix --entry-file to absolute path
const idx = args.indexOf('--entry-file');
if (idx !== -1 && idx + 1 < args.length) {
  const entry = args[idx + 1];
  if (!path.isAbsolute(entry)) {
    args[idx + 1] = path.resolve(projectRoot, entry);
  }
}

// Resolve the real @expo/cli
const expoCli = require.resolve('@expo/cli', { paths: [projectRoot, path.resolve(projectRoot, '../..')] });

try {
  execFileSync(process.execPath, [expoCli, ...args], {
    stdio: 'inherit',
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' }
  });
} catch (e) {
  process.exit(e.status || 1);
}
