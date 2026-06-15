#!/usr/bin/env node
// Пост-процесс: берёт собранный Chrome MV3 dist/ и копирует в dist-firefox/
// с добавлением browser_specific_settings (Firefox MV3 128+).

import fs from 'node:fs/promises';
import path from 'node:path';

const SRC = 'dist';
const DST = 'dist-firefox';
const EXTENSION_ID = 'tabvault@leothe1st.github.io';
const STRICT_MIN_VERSION = '128.0';

const srcExists = await fs.stat(SRC).then(() => true).catch(() => false);
if (!srcExists) {
  console.error(`✗ ${SRC}/ not found — run "npm run build" first.`);
  process.exit(1);
}

await fs.rm(DST, { recursive: true, force: true });
await fs.cp(SRC, DST, { recursive: true });

const manifestPath = path.join(DST, 'manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

manifest.browser_specific_settings = {
  gecko: {
    id: EXTENSION_ID,
    strict_min_version: STRICT_MIN_VERSION
  }
};

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`✓ Firefox build ready at ${DST}/`);
console.log(`  - manifest browser_specific_settings.gecko.id = ${EXTENSION_ID}`);
console.log(`  - strict_min_version = ${STRICT_MIN_VERSION}`);
