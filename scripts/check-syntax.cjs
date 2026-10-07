const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const files = ['playwright.config.cjs'];
function collect(directory) {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(file);
    else if (entry.isFile() && /\.(?:cjs|js)$/.test(entry.name)) files.push(file);
  }
}
for (const directory of ['src', 'tests', 'scripts']) collect(directory);
for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checked: ${files.length} files.`);
