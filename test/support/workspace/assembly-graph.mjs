import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { matchedParenSpan, stripComments } from '../source-slice.mjs';

// Construction edges are source, just like imports: fooServices: foo passes the
// configured foo instance, and a ready callback returns the same instance later.
// Follow those exact bindings when auditing a configured service, rather than
// following a compatibility export into the entire default application.
export async function applicationConstructionDetails(repoRoot) {
  const instances = new Map();
  const calls = [];
  for (const entry of await readdir(path.join(repoRoot, 'packages/core/src/application'), { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.mjs')) continue;
    const rel = `packages/core/src/application/${entry.name}`;
    const source = stripComments(await readFile(path.join(repoRoot, rel), 'utf8'));
    const factories = new Map();
    for (const match of source.matchAll(/import\s*\{\s*(assemble\w+)\s*\}\s*from\s*['"]([^'"]+)['"]/g)) {
      factories.set(match[1], path.posix.normalize(path.posix.join(path.posix.dirname(rel), match[2])));
    }
    const used = new Set();
    for (const match of source.matchAll(/const\s+(\w+)\s*=\s*(assemble\w+)\s*\(/g)) {
      const file = factories.get(match[2]);
      assert.ok(file, `${rel}: constructor ${match[2]} resolves to an imported factory`);
      assert.ok(!used.has(match[2]), `${rel}: ${match[2]} is constructed only once`);
      assert.ok(!instances.has(match[1]), `${rel}: service name ${match[1]} has one construction`);
      const span = matchedParenSpan(source, source.indexOf('(', match.index));
      assert.ok(span, `${rel}: construction arguments can be read`);
      instances.set(match[1], file);
      calls.push({ file, factory: match[2], body: span.body });
      used.add(match[2]);
    }
    assert.equal(used.size, factories.size, `${rel}: every imported constructor is accounted for`);
  }
  assert.ok(calls.length >= 200, 'the actual application construction was read, not an empty graph');
  const graph = new Map();
  for (const { file, factory, body } of calls) {
    const names = [
      ...[...body.matchAll(/\b(\w+Services):\s*(\w+)/g)].map(m => ({ parameter: m[1], name: m[2], dynamic: m[2] === 'commandPort' })),
      ...[...body.matchAll(/\b(provide\w+):\s*async\s*\(\)\s*=>\s*\{\s*lifetime\.assertReady\(\);\s*return\s+(\w+)\s*;\s*\}/g)].map(m => ({ parameter: m[1], name: m[2], dynamic: true })),
    ];
    assert.equal(names.filter(edge => edge.dynamic && edge.name !== 'commandPort').length,
      [...body.matchAll(/\bprovide\w+\s*:/g)].length,
      `${file}: every supplied runtime callback asserts readiness before returning its constructed service`);
    const dependencies = [];
    for (const { name, dynamic, parameter } of names) {
      if (name === 'workspace') { dependencies.push({ target: 'packages/core/src/application/paths.mjs', dynamic, parameter }); continue; }
      const target = instances.get(name === 'commandPort' ? 'commandCore' : name);
      assert.ok(target, `${file}: collaborator ${name} has a known construction`);
      dependencies.push({ target, dynamic, parameter });
    }
    graph.set(file, { factory, dependencies });
  }
  return graph;
}

export async function applicationConstructionGraph(repoRoot) {
  const details = await applicationConstructionDetails(repoRoot);
  return new Map([...details].map(([file, { dependencies }]) => [file, [...new Set(dependencies.map(d => d.target))]]));
}
