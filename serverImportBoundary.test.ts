import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(REPO_ROOT, 'server');

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

/** Matches static import/export sources and dynamic import(). */
const MODULE_SPECIFIER =
  /(?:import|export)(?:\s+type)?(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function listSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    const ext = path.extname(entry.name);
    if (SOURCE_EXTENSIONS.has(ext)) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractModuleSpecifiers(source: string): string[] {
  const specs: string[] = [];
  for (const match of source.matchAll(MODULE_SPECIFIER)) {
    const spec = match[1] ?? match[2];
    if (spec) specs.push(spec);
  }
  return specs;
}

function resolveSpecifier(fromFile: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) {
    return path.normalize(path.join(SERVER_ROOT, specifier.slice(2)));
  }
  if (!specifier.startsWith('.')) {
    return null;
  }
  return path.normalize(path.resolve(path.dirname(fromFile), specifier));
}

function escapesServerRoot(resolvedPath: string): boolean {
  const relative = path.relative(SERVER_ROOT, resolvedPath);
  return relative.startsWith('..') || path.isAbsolute(relative);
}

describe('server import boundary', () => {
  it('does not import modules outside server/', () => {
    const violations: string[] = [];

    for (const file of listSourceFiles(SERVER_ROOT)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const specifier of extractModuleSpecifiers(source)) {
        const resolved = resolveSpecifier(file, specifier);
        if (resolved === null) continue;
        if (escapesServerRoot(resolved)) {
          violations.push(`${path.relative(REPO_ROOT, file)} → ${specifier}`);
        }
      }
    }

    assert.equal(
      violations.length,
      0,
      `Server must not import outside server/:\n${violations.join('\n')}`
    );
  });
});
