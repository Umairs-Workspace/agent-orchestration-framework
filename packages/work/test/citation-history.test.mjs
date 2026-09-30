import assert from 'node:assert/strict';
import test from 'node:test';
import { deletedModules, constructorHomes, moduleRelocations } from '../src/citation-history.mjs';
import { buildRenameMap, resolveCitedPath, resolveThroughRenames } from '../src/cited-path-resolve.mjs';

const deletion = target => `diff --git a/packages/core/src/old.mjs b/packages/core/src/old.mjs\ndeleted file mode 100644\n--- a/packages/core/src/old.mjs\n+++ /dev/null\n-export { value } from "${target}";\n`;

test('recorded deleted forwards reach explicit public implementations without becoming renames', () => {
  const modules = deletedModules(deletion('@aof/work/leaf'));
  assert.equal(modules.size, 1);
  const map = buildRenameMap([{ from: 'src/old.mjs', to: 'packages/core/src/old.mjs' }]);
  map.moduleLinks = moduleRelocations(modules, { exports: new Map([['@aof/work/leaf', 'packages/work/src/leaf.mjs']]), constructors: new Map() });
  const answer = resolveCitedPath('src/old.mjs:12', { renameMap: map, existsAtHead: file => file === 'packages/work/src/leaf.mjs' });
  assert.deepEqual([answer.resolved, answer.at, answer.via, answer.locator], [true, 'packages/work/src/leaf.mjs', 'module', ':12']);
  assert.equal(resolveThroughRenames('src/old.mjs', map), 'packages/core/src/old.mjs');
  assert.equal(resolveCitedPath('src/old.mjs', { renameMap: map, existsAtHead: () => false }).resolved, false);
  assert.equal(resolveCitedPath('src/never.mjs', { renameMap: map, existsAtHead: () => false }).resolved, false);
});

test('deletion parsing rejects modifications and keeps the newest recorded source', () => {
  const modified = 'diff --git a/x.mjs b/x.mjs\n--- a/x.mjs\n+++ b/x.mjs\n-export { old } from "@aof/work/old";\n+export { next } from "@aof/work/next";\n';
  assert.equal(deletedModules(modified).size, 0);
  assert.match(deletedModules(deletion('@aof/work/new') + deletion('@aof/work/old')).get('packages/core/src/old.mjs'), /work\/new/u);
});

test('complete public forwards require every explicit destination and refuse private or executable plants', () => {
  const modules = new Map([
    ['good', 'export { leaf } from "@aof/work/leaf";'],
    ['star', 'export * from "@aof/work/leaf";'],
    ['executed', 'console.log("plant"); export { leaf } from "@aof/work/leaf";'],
    ['private', 'export { leaf } from "@aof/work/src/leaf.mjs";'],
    ['unknown', 'export { leaf } from "@aof/missing/leaf";'],
    ['mixed', 'export { leaf } from "@aof/work/leaf"; export { other } from "@aof/work/other";'],
  ]);
  const links = moduleRelocations(modules, { exports: new Map([['@aof/work/leaf', 'leaf.mjs'], ['@aof/work/other', 'other.mjs']]), constructors: new Map() });
  assert.deepEqual([...links], [['good', 'leaf.mjs'], ['star', 'leaf.mjs'], ['mixed', ['leaf.mjs', 'other.mjs']]]);
  const map = new Map(); map.moduleLinks = links;
  assert.equal(resolveCitedPath('mixed', { renameMap: map, existsAtHead: file => file === 'leaf.mjs' }).resolved, false);
  const answer = resolveCitedPath('mixed', { renameMap: map, existsAtHead: file => ['leaf.mjs', 'other.mjs'].includes(file) });
  assert.deepEqual(answer.destinations, ['leaf.mjs', 'other.mjs']);
});

test('configured destinations are derived from real imported constructor calls', () => {
  const constructors = constructorHomes([{ file: 'packages/core/src/application/assemble.mjs', source: 'import { assembleRead } from "./bindings/read.mjs"; const workRead = assembleRead({}); const unused = other();' }]);
  assert.deepEqual([...constructors], [['workRead', 'packages/core/src/application/bindings/read.mjs']]);
  const modules = new Map([['old', '// Compatibility entry; construction belongs to core application assembly.\nimport { workRead } from "./application/default.mjs"; export const { read } = workRead;'], ['unknown', '// Compatibility entry; construction belongs to core application assembly.\nexport const { value } = unknown;']]);
  assert.deepEqual([...moduleRelocations(modules, { exports: new Map(), constructors })], [['old', 'packages/core/src/application/bindings/read.mjs']]);
});
