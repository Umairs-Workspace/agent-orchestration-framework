import assert from 'node:assert/strict';
import test from 'node:test';
import { createMeshContribution } from '@aof/mesh/commands';
import { createMeshAssignCommands } from '@aof/mesh/commands/assign';
import { createMeshRelayCommands } from '@aof/mesh/commands/relay';
import { createMeshSessionCommands } from '@aof/mesh/commands/session';
import { createMeshIdentityCommands } from '@aof/mesh/commands/identity';
import { guardMeshPositionals, refuseReadMiss } from '@aof/mesh/commands/face-shared';

test('mesh assembles its seventeen real command definitions without invoking configured services', async () => {
  const definitions = {};
  const services = new Proxy({}, { get: () => () => { throw Error('service invoked while registering'); } });
  for (const name of ['identity', 'heartbeat', 'relay', 'invite', 'join', 'revoke', 'serve', 'logs', 'terminal-resume', 'assign', 'recover-push', 'repo', 'ui', 'desktop']) {
    const api = await import('@aof/mesh/commands/' + name);
    const factory = 'createMesh' + name.split('-').map(n => n[0].toUpperCase() + n.slice(1)).join('') + 'Commands';
    Object.assign(definitions, api[factory](services));
  }
  const { meshContribution } = createMeshContribution(definitions);
  assert.equal(meshContribution.name, '@aof/mesh');
  assert.deepEqual(meshContribution.commands.map(c => c.id), ['mesh:identity', 'mesh:status', 'mesh:heartbeat', 'mesh:relay', 'mesh:invite', 'mesh:join', 'mesh:revoke', 'mesh:serve', 'mesh:logs', 'mesh:terminal-resume', 'mesh:assign', 'mesh:recover-push', 'mesh:repo-publish', 'mesh:ui', 'mesh:desktop-install', 'mesh:desktop-run', 'mesh:desktop-stop']);
  assert.ok(Object.isFrozen(meshContribution));
  assert.ok(Object.isFrozen(meshContribution.commands));
  assert.equal(new Set(meshContribution.commands.map(c => c.cli.route.join(' '))).size, 17);
});

test('assignment command preserves structured refusals and dispatches withdrawal through its own service', async () => {
  const workspace = {};
  const detail = { itemRef: '42/01', scopeRef: '42', assignmentId: 'held', holderNode: 'worker', state: 'running' };
  const calls = [];
  const { meshAssignCommand } = createMeshAssignCommands({
    assignWork: async (...args) => { calls.push(args); return { ok: false, code: 'item-locked-by-assignment', error: 'held', detail }; },
    withdrawWork: async (...args) => { calls.push(args); return { ok: true, withdrawn: true }; },
  });
  await assert.rejects(meshAssignCommand.run({ ref: '42/01', to: 'worker' }, { workspace }), error => error.code === 'item-locked-by-assignment' && error.detail === detail && error.scopeRef === '42');
  assert.deepEqual(await meshAssignCommand.run({ ref: '42/01', withdraw: true }, { workspace }), { ok: true, withdrawn: true });
  assert.deepEqual(calls, [[workspace, '42/01', 'worker', {}], [workspace, '42/01', {}]]);
});

test('relay command delegates its one-shot probe and preserves CLI JSON and positional rules', async () => {
  const calls = [], config = { mesh: {} }, result = { controlNode: 'control', nominated: false };
  const { meshRelayCommand } = createMeshRelayCommands({ relayStatus: value => { calls.push(value); return result; } });
  assert.equal(calls.length, 0);
  assert.equal(await meshRelayCommand.run({}, { workspace: { config } }), result);
  assert.deepEqual(calls, [config]);
  assert.equal(meshRelayCommand.cli.json(result), result);
  assert.throws(() => meshRelayCommand.cli.argv(['stray']), error => error.code === 'invalid-input');
});

test('session identity preserves stdin precedence and reports malformed input before the environment fallback', () => {
  const warnings = [];
  const { resolveSessionIdentity } = createMeshSessionCommands({ reportDegrade: code => warnings.push(code) });
  const env = { CLAUDE_SESSION_ID: 'env-session' };
  assert.deepEqual(resolveSessionIdentity({ stdinText: '{"session_id":"stdin-session"}', env }), { source: 'stdin', sessionId: 'stdin-session', payload: { session_id: 'stdin-session' } });
  assert.deepEqual(resolveSessionIdentity({ stdinText: '{', env }), { source: 'env', sessionId: 'env-session', payload: null });
  assert.deepEqual(warnings, ['commands-mesh-session']);
});

test('shared mesh presentation distinguishes absent queries from supplied missing nodes', () => {
  assert.doesNotThrow(() => refuseReadMiss(null, { positionals: [] }));
  assert.throws(() => refuseReadMiss(null, { positionals: ['missing'] }), error => error.code === 'node-not-found' && error.status === 404);
  assert.throws(() => guardMeshPositionals('status', ['a', 'b'], { max: 1 }), error => error.code === 'invalid-input');
  assert.throws(() => guardMeshPositionals('status', [''], { max: 1 }), error => error.code === 'invalid-input');
});

test('identity salt resolution preserves the configured sidecar writer and existing salts', async () => {
  const writes = [];
  const { resolveInstallSalt } = createMeshIdentityCommands({
    writeSidecarPatch: async (file, patch) => { writes.push({ file, patch }); },
  });
  assert.equal(await resolveInstallSalt('fixture-sidecar.json', { mesh: { salt: 'existing' } }), 'existing');
  assert.deepEqual(writes, []);
  const salt = await resolveInstallSalt('fixture-sidecar.json', {});
  assert.match(salt, /^[0-9a-f-]{36}$/);
  assert.deepEqual(writes, [{ file: 'fixture-sidecar.json', patch: { salt } }]);
  assert.match(await resolveInstallSalt(null, {}), /^[0-9a-f-]{36}$/);
  assert.equal(writes.length, 1, 'no sidecar path means no persistence');
  const failure = Error('fixture write refusal');
  const refusing = createMeshIdentityCommands({ writeSidecarPatch: async () => { throw failure; } });
  await assert.rejects(refusing.resolveInstallSalt('fixture-sidecar.json', {}), error => error === failure);
});
