// ===================================================================================
// File: tools/export-memory.mjs
// Version: v0.1_001 (2025-08-30)
// ===================================================================================
// Spec:
// - Read YAML front matter from internal_docs/memory_update.md and export JSON to
//   internal_docs/riko_memory.json (pretty-printed)
// - No external dependencies; includes a tiny YAML subset parser for mapping values
//   with nested objects (2-space indent). Scalars: string/boolean/null only.
// - If no front matter is found, exits with code 1.
// ===================================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(process.cwd(), 'internal_docs/memory_update.md');
const OUT = resolve(process.cwd(), 'internal_docs/riko_memory.json');

function extractFrontMatter(md) {
  // Find the first '---' line and the following '---' line
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') { start = i; break; }
  }
  if (start === -1) return null;
  let end = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { end = i; break; }
  }
  if (end === -1) return null;
  return lines.slice(start + 1, end).join('\n');
}

function parseValue(raw) {
  const s = raw.trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseYamlSubset(yamlText) {
  // Supports mappings and nested mappings with 2-space indentation.
  const root = {};
  const stack = [{ indent: -1, obj: root }];
  const lines = yamlText.replace(/\r\n/g, '\n').split('\n');
  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.match(/^\s*/)[0].length;
    const line = raw.trim();
    // Maintain stack based on current indent
    while (stack.length && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].obj;
    // key: value or key:
    const m = line.match(/^([^:#]+):\s*(.*)$/);
    if (!m) continue; // ignore malformed lines silently
    const key = m[1].trim();
    const rest = m[2];
    if (rest === '') {
      // key: (start of nested mapping)
      const child = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
    } else {
      parent[key] = parseValue(rest);
    }
  }
  return root;
}

function main() {
  const md = readFileSync(SRC, 'utf8');
  const fm = extractFrontMatter(md);
  if (fm == null) {
    console.error('[export-memory] No YAML front matter found in internal_docs/memory_update.md');
    process.exit(1);
  }
  const data = parseYamlSubset(fm);
  writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`[export-memory] Wrote ${OUT}`);
}

main();

