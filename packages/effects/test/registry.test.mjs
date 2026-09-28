import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createReactorRegistry, UndeclaredEventError } from '@aof/effects/registry';

const reactor = key => Object.freeze({ key, locus: 'local', apply: async () => key });
const options = { reportDegrade() {} };

test('features contribute to the same event in explicit cascade order without executing handlers', async () => {
  const first = reactor('rollback'), second = reactor('publish');
  const registry = createReactorRegistry([
    { name: 'work', events: { completed: [first], empty: [] } },
    { name: 'mesh', events: { completed: [second] } },
  ], options);
  assert.deepEqual(registry.knownEvents(), ['completed', 'empty']);
  assert.deepEqual(await registry.applicableReactors('completed', {}), [first, second]);
  assert.equal(registry.effectsFor('completed')[0], first);
  assert.equal(registry.ownerOf('completed', 'publish'), 'mesh');
  assert.deepEqual(await registry.applicableReactors('empty', {}), []);
  assert.ok(Object.isFrozen(registry.table.completed));
});

test('duplicate keys name both owners and keys may be reused for different events', () => {
  assert.throws(() => createReactorRegistry([
    { name: 'work', events: { changed: [reactor('publish')] } },
    { name: 'mesh', events: { changed: [reactor('publish')] } },
  ], options), /Reactor collision: "changed\/publish" is claimed by both "work" and "mesh"/);
  createReactorRegistry([{ name: 'work', events: { one: [reactor('publish')], two: [reactor('publish')] } }], options);
});

test('unknown and inherited names retain the coded construction refusal', async () => {
  const registry = createReactorRegistry([{ name: 'work', events: { changed: [] } }], options);
  for (const name of ['typo', 'toString', null, undefined]) {
    assert.equal(registry.effectsFor(name), null);
    await assert.rejects(registry.applicableReactors(name, {}), error => error instanceof UndeclaredEventError &&
      error.code === 'event-not-declared' && error.status === 400 && error.event === name && error.declared[0] === 'changed');
  }
});

test('applicability preserves context and reports failed predicates without owing those steps', async () => {
  const diagnostics = [], ctx = {}, payload = {};
  const selected = reactor('always');
  const registry = createReactorRegistry([{ name: 'work', events: { changed: [selected,
    { ...reactor('no'), applies: async (p, c) => { assert.equal(p, payload); assert.equal(c, ctx); return false; } },
    { ...reactor('broken'), applies: async () => { throw new Error('configuration failed'); } },
  ] } }], { reportDegrade: (...args) => diagnostics.push(args) });
  assert.deepEqual(await registry.applicableReactors('changed', payload, ctx), [selected]);
  assert.equal(diagnostics[0][0], 'effect-applies');
  assert.equal(diagnostics[0][2].path, 'changed/broken');
  await assert.rejects(registry.applicableReactors('changed', payload, ctx, {}), { code: 'event-not-declared' });
});

test('malformed contributions and loci fail before registration', () => {
  assert.throws(() => createReactorRegistry([{}], options), /needs a name/);
  assert.throws(() => createReactorRegistry([{ name: 'work', events: { changed: [{ ...reactor('x'), apply: null }] } }], options), /Invalid reactor/);
  assert.throws(() => createReactorRegistry([{ name: 'work', events: { changed: [reactor('x')] } }], { ...options, isKnownLocus: () => false }), /Invalid reactor/);
});
