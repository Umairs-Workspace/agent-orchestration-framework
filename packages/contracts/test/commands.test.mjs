import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCommandRegistry, resolveRoute } from '@aof/contracts/commands';

const command = (id, route, run = async input => input) => ({ id, run, cli: { route } });
const contribution = (name, ...commands) => ({ name, commands });

test('independent features extend a shared CLI namespace without executing at registration', async () => {
  let calls = 0;
  const base = command('work:list', ['work']);
  const extension = command('mesh:assign', ['work', 'assign'], async (input, ctx) => {
    calls++;
    return { node: input.node, workspace: ctx.workspace };
  });
  extension.cli.spec = { flags: { node: { type: 'string' } } };
  extension.cli.argv = (_positionals, options) => ({ node: options.node });
  const registry = createCommandRegistry([
    contribution('core', base), contribution('mesh', extension),
  ]);
  assert.equal(calls, 0);
  const match = resolveRoute(['work', 'assign', '--node', 'worker-1'], registry.listCommands());
  assert.equal(match.command, extension);
  assert.deepEqual(match.rest, ['--node', 'worker-1']);
  assert.equal(match.command.cli.spec, extension.cli.spec);
  assert.deepEqual(await registry.invoke(match.command.id, extension.cli.argv([], { node: 'worker-1' }), { workspace: 'repo' }),
    { node: 'worker-1', workspace: 'repo' });
  assert.equal(calls, 1);
  assert.equal(resolveRoute(['work', '--json'], registry.listCommands()).command, base);
  assert.equal(registry.ownerOf('mesh:assign'), 'mesh');
});

test('invocation preserves input, context, results and domain errors', async () => {
  const input = {}, ctx = {}, result = {}, failure = new Error('domain failure');
  const registry = createCommandRegistry([contribution('feature',
    command('ok', ['ok'], async (receivedInput, receivedCtx) => {
      assert.equal(receivedInput, input);
      assert.equal(receivedCtx, ctx);
      return result;
    }), command('fail', ['fail'], async () => { throw failure; }),
  )]);
  assert.equal(await registry.invoke('ok', input, ctx), result);
  await assert.rejects(registry.invoke('fail', input, ctx), error => error === failure);
  await assert.rejects(registry.invoke('missing', input, ctx), { message: 'Unknown command id "missing".' });
  assert.equal(registry.getCommand('missing'), undefined);
  assert.equal(registry.hasCommand('missing'), false);
});

test('ordered groups from one owner preserve command identity and isolate list mutations', () => {
  const a = Object.freeze(command('a', ['a'])), b = command('b', ['b']), c = command('c', ['c']);
  const registry = createCommandRegistry([
    contribution('core', a), contribution('feature', b), contribution('core', c),
  ]);
  registry.listCommands().reverse().pop();
  assert.deepEqual(registry.listCommands(), [a, b, c]);
  assert.equal(registry.getCommand('a'), a);
  assert.equal(registry.hasCommand('c'), true);
});

test('duplicate command IDs fail with both owners instead of replacing a command', () => {
  assert.throws(() => createCommandRegistry([
    contribution('core', command('same', ['one'])), contribution('mesh', command('same', ['two'])),
  ]), /Command collision: "same" is claimed by both "core" and "mesh"/);
});

test('duplicate routes fail during composition before either handler can run', () => {
  assert.throws(() => createCommandRegistry([
    contribution('core', command('one', ['work', 'list'])), contribution('mesh', command('two', ['work', 'list'])),
  ]), /Route collision: "work list" is claimed by both "one" and "two"/);
});

test('malformed descriptors fail at the composition boundary', () => {
  assert.throws(() => createCommandRegistry({}), /must be an array/);
  for (const invalid of [null, {}, { name: '', commands: [] }, { name: 'feature', commands: {} }]) {
    assert.throws(() => createCommandRegistry([invalid]), /needs a name and a commands array/);
  }
  assert.throws(() => createCommandRegistry([contribution('feature', { id: 'broken' })]), /Invalid command/);
  for (const route of [[], 'work', ['work list'], [''], ['--flag'], [null]]) {
    assert.throws(() => createCommandRegistry([contribution('feature', command('broken', route))]), /Invalid CLI route/);
  }
});

test('programmatic commands need no CLI route and unknown routes remain unmatched', async () => {
  const registry = createCommandRegistry([contribution('feature', { id: 'internal', run: async () => 'ok' })]);
  assert.equal(await registry.invoke('internal'), 'ok');
  assert.equal(resolveRoute(['internal'], registry.listCommands()), null);
  assert.equal(resolveRoute([], []), null);
});

test('package internals are inaccessible through undeclared export paths', async () => {
  await assert.rejects(import('@aof/contracts/src/commands.mjs'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
});

function extensible() {
  return {
    ...command('work:place', ['work', 'place'], async input => input),
    input: { type: 'object', properties: { ref: { type: 'string' } }, required: ['ref'], additionalProperties: false },
    extensionPoints: { placement: { contributors: ['mesh'], flags: ['node', 'offline'], arguments: ['region'] } },
    cli: {
      route: ['work', 'place'],
      spec: { flags: {}, arguments: [{ name: 'ref', type: 'string' }] },
      argv: (positionals, options) => {
        assert.equal(positionals.length, 1);
        assert.equal(options.node, undefined);
        assert.equal(options.offline, undefined);
        assert.deepEqual(options._, positionals);
        return { ref: positionals[0] };
      },
    },
  };
}
const extend = extension => ({ name: 'mesh', commands: [], extensions: [{ commandId: 'work:place', point: 'placement', ...extension }] });

test('declared option and positional additions preserve the owner and validate through every invocation face', async () => {
  const owner = extensible();
  const registry = createCommandRegistry([
    extend({ flags: { node: { type: 'string', required: true }, offline: { type: 'boolean', default: false } }, arguments: [{ name: 'region', type: 'string', enum: ['west', 'east'] }] }),
    contribution('work', owner),
  ]);
  const extended = registry.getCommand(owner.id);
  assert.equal(registry.ownerOf(owner.id), 'work');
  assert.deepEqual(owner.cli.spec.flags, {});
  assert.equal(owner.input.properties.node, undefined);
  const input = await extended.cli.argv(['42', 'west'], { _: ['42', 'west'], node: 'worker' });
  assert.deepEqual(input, { ref: '42', node: 'worker', offline: false, region: 'west' });
  assert.deepEqual(await registry.invoke(owner.id, input), input);
  assert.deepEqual(await registry.invoke(owner.id, { ref: '42', node: 'worker' }), { ref: '42', node: 'worker', offline: false });
  for (const invalid of [{ ref: '42' }, { ref: '42', node: null }, { node: 'worker', offline: 'yes' }, { node: 'worker', region: 'north' }]) {
    await assert.rejects(registry.invoke(owner.id, invalid), { code: 'invalid-input' });
  }
  await assert.rejects(extended.cli.argv(['42', 'west', 'extra'], { node: 'worker' }), { code: 'invalid-input' });
});

test('independent additions compose in declared order without replacing handlers', async () => {
  const registry = createCommandRegistry([
    contribution('work', extensible()),
    extend({ flags: { node: { type: 'string' } } }),
    extend({ flags: { offline: { type: 'boolean' } } }),
  ]);
  const value = await registry.getCommand('work:place').cli.argv(['42'], { node: 'worker', offline: true });
  assert.deepEqual(await registry.invoke('work:place', value), { ref: '42', node: 'worker', offline: true });
});

test('undeclared targets, contributors, fields, replacement handlers and incompatible additions fail at registration', () => {
  const owner = extensible();
  const invalid = [
    { commandId: 'missing', flags: { node: { type: 'string' } } },
    { point: 'missing', flags: { node: { type: 'string' } } },
    { flags: { unknown: { type: 'string' } } },
    { flags: { node: { type: 'number' } } },
    { flags: { node: { type: 'string', default: false } } },
    { flags: { node: { type: 'string', enum: [] } } },
    { arguments: [{ name: 'region', type: 'boolean' }] },
    { flags: { node: { type: 'string' } }, run() {} },
    { flags: { node: { type: 'string' } }, cli: { route: ['replaced'] } },
    {},
  ];
  for (const entry of invalid) assert.throws(() => createCommandRegistry([contribution('work', owner), extend(entry)]));
  assert.throws(() => createCommandRegistry([contribution('work', owner), { ...extend({ flags: { node: { type: 'string' } } }), name: 'uninvited' }]), /not declared/);
  for (const type of ['string', 'boolean']) {
    assert.throws(() => createCommandRegistry([contribution('work', owner), extend({ flags: { node: { type: 'string' } } }), extend({ flags: { node: { type } } })]), /input collision/);
  }
  owner.input.properties.node = { type: 'string' };
  assert.throws(() => createCommandRegistry([contribution('work', owner), extend({ flags: { node: { type: 'string' } } })]), /input collision/);
});

test('common flags cannot be replaced and positional extensions require an explicit owner argument contract', () => {
  const owner = extensible();
  owner.extensionPoints.placement.flags.push('config', 'json');
  for (const name of ['config', 'json']) assert.throws(() => createCommandRegistry([contribution('work', owner), extend({ flags: { [name]: { type: 'string' } } })]), /input collision/);
  delete owner.cli.spec.arguments;
  assert.throws(() => createCommandRegistry([contribution('work', owner), extend({ arguments: [{ name: 'region', type: 'string' }] })]), /owner to declare/);
  const positionalOwner = extensible();
  positionalOwner.input.properties = {};
  positionalOwner.extensionPoints.placement.arguments.push('ref');
  assert.throws(() => createCommandRegistry([contribution('work', positionalOwner), extend({ arguments: [{ name: 'ref', type: 'string' }] })]), /input collision/);
  const arrayOwner = extensible();
  arrayOwner.input.type = 'array';
  assert.throws(() => createCommandRegistry([contribution('work', arrayOwner), extend({ flags: { node: { type: 'string' } } })]), /object input schema/);
});
