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
