import assert from 'node:assert/strict';
import test from 'node:test';
import { createMeshWorktrees } from '../src/worktrees.mjs';

test('mesh keeps lane naming and lazily supplies worktree preparation at materialization', async () => {
  const calls = [];
  const prepared = [];
  let toolchainLoads = 0;
  const api = createMeshWorktrees({
    reportDegrade: assert.fail,
    loadWorkspace: async root => ({ config: { root } }),
    toolchain: async () => {
      toolchainLoads++;
      return {
        resolveWorktreePrepare: config => ({ ok: true, prepare: { command: config.root } }),
        launchStep: async (step, options) => { prepared.push({ step, options }); return { status: 0 }; },
      };
    },
  });
  assert.equal(toolchainLoads, 0);
  const exec = async args => { calls.push(args); return { status: 0, stdout: '', stderr: '' }; };
  const result = await api.addWorktree('repo', 'assignment', 'HEAD', { exec });
  assert.equal(result, api.meshWorktreePath('repo', 'assignment'));
  assert.deepEqual(calls, [['worktree', 'add', '--detach', result, 'HEAD']]);
  assert.equal(toolchainLoads, 2);
  assert.deepEqual(prepared, [{ step: { command: 'repo' }, options: { cwd: result, launch: undefined } }]);
  assert.notEqual(api.meshSessionWorktreePath('repo', 'item'), result);
  assert.notEqual(api.meshDispatchWorktreePath('repo', 'item'), result);
});

test('mesh removes a failed preparation tree through git and preserves the coded fault', async () => {
  const calls = [];
  const api = createMeshWorktrees({ reportDegrade: assert.fail, loadWorkspace: assert.fail, toolchain: assert.fail });
  const exec = async args => { calls.push(args); return { status: 0, stdout: '', stderr: '' }; };
  const tree = api.meshWorktreePath('repo', 'assignment');
  await assert.rejects(api.addWorktree('repo', 'assignment', 'HEAD', {
    exec, prepare: { ok: false, code: 'bad-prepare', message: 'invalid declaration', key: 'prepare' },
  }), error => error.code === 'bad-prepare' && error.worktreePath === tree && error.assignmentId === 'assignment');
  assert.deepEqual(calls, [['worktree', 'add', '--detach', tree, 'HEAD'], ['worktree', 'remove', '--force', tree]]);
});
