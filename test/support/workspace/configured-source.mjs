import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { applicationConstructionDetails } from './assembly-graph.mjs';
import { importSpecifiers } from '../module-family.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const details = await applicationConstructionDetails(root);
const byFactory = new Map([...details].map(([file, detail]) => [detail.factory, { file, ...detail }]));

// Dependencies include both literal imports and the actual collaborators passed by
// core. An injected edge is explicitly labelled; ready callbacks stay dynamic.
// Ordinary modules and synthetic import-only probes retain importSpecifiers' result.
export function dependencySpecifiers(source) {
  const imports = importSpecifiers(source);
  const name = source.match(/\bexport\s+function\s+(assemble\w+)\s*\(/)?.[1];
  const construction = byFactory.get(name);
  if (!construction) return imports;
  return [...imports, ...construction.dependencies.map(({ target, dynamic, parameter }) => {
    const relative = path.posix.relative(path.posix.dirname(construction.file), target);
    return { specifier: relative.startsWith('.') ? relative : './' + relative, dynamic, injected: true, parameter };
  })];
}

// Read a configured service and one of its supplied ports, plus their public
// package implementations. This follows the assembly edge without importing code.
export async function configuredPortSources(repoRoot, entry, parameter) {
  const file = path.resolve(repoRoot, entry);
  const source = await readFile(file, 'utf8');
  const supplied = dependencySpecifiers(source).find(edge => edge.parameter === parameter);
  if (!supplied) throw new Error(`${entry}: missing supplied port ${parameter}`);
  const target = path.resolve(path.dirname(file), supplied.specifier);
  const parts = new Map([[file, source], [target, await readFile(target, 'utf8')]]);
  for (const [owner, code] of [...parts]) {
    for (const { specifier } of importSpecifiers(code)) {
      if (!specifier.startsWith('@aof/')) continue;
      const implementation = createRequire(owner).resolve(specifier);
      parts.set(implementation, await readFile(implementation, 'utf8'));
    }
  }
  return [...parts.values()].join('\n');
}
