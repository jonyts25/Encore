import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const HEX_PATTERN = /#[0-9A-Fa-f]{3,8}\b/g;
const ALLOWED_PREFIXES = [
  path.join(ROOT, 'src', 'core', 'ui', 'theme'),
  path.join(ROOT, 'src', 'modules', 'live'),
];

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      await walk(fullPath, files);
      continue;
    }
    if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function isAllowed(filePath) {
  return ALLOWED_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

const srcRoot = path.join(ROOT, 'src');
const files = await walk(srcRoot);
const violations = [];

for (const file of files) {
  if (isAllowed(file)) continue;
  const content = await readFile(file, 'utf8');
  const matches = content.match(HEX_PATTERN);
  if (matches?.length) {
    violations.push({ file, matches: [...new Set(matches)] });
  }
}

if (violations.length > 0) {
  console.error('Hard-coded hex colors found outside theme/ and live/:');
  for (const violation of violations) {
    console.error(`- ${path.relative(ROOT, violation.file)}: ${violation.matches.join(', ')}`);
  }
  process.exit(1);
}

console.log('No disallowed hard-coded hex colors found.');
