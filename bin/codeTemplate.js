#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const distMain = path.join(__dirname, '..', 'dist', 'cli', 'main.js');
if (fs.existsSync(distMain)) {
  require(distMain);
} else {
  const tsMain = path.join(__dirname, '..', 'src', 'cli', 'main.ts');
  if (!fs.existsSync(tsMain)) {
    console.error('Cannot find codeTemplate source. Run "npm run build" or "npm run dev".');
    process.exit(1);
  }
  const tsxBin = path.join(__dirname, '..', 'node_modules', '.bin', 'tsx');
  const r = spawnSync(process.execPath, [tsxBin, tsMain, ...process.argv.slice(2)], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  process.exit(r.status || 0);
}
