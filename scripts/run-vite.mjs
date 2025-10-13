#!/usr/bin/env node
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.ROLLUP_SKIP_NODE_BUILD) {
  process.env.ROLLUP_SKIP_NODE_BUILD = '1';
}

if (!process.env.ROLLUP_DISABLE_NATIVE) {
  process.env.ROLLUP_DISABLE_NATIVE = '1';
}

if (!process.env.ROLLUP_FORCE_JS) {
  process.env.ROLLUP_FORCE_JS = 'true';
}

const require = createRequire(import.meta.url);
const vitePkgPath = require.resolve('vite/package.json');
const viteDir = dirname(vitePkgPath);
const viteBin = join(viteDir, 'bin', 'vite.js');

process.argv = [process.argv[0], viteBin, ...process.argv.slice(2)];

const viteUrl = pathToFileURL(viteBin).href;
const module = await import(viteUrl);

if (module?.default && typeof module.default === 'function') {
  await module.default();
}