import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const roots = ['src', 'tests', 'scripts'];

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(entryPath);
    return entry.name.endsWith('.js') ? [entryPath] : [];
  }));
  return files.flat();
}

const files = (await Promise.all(roots.map(javascriptFiles))).flat();
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
console.log(`Syntax check passed for ${files.length} JavaScript files.`);
