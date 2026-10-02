import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorktreeOperations, parsePorcelainStatus, defaultGitExec, resolveExec } from '../src/worktrees.mjs';

test('worktree operations are inert and use caller paths, preparation and runner identity', async () => {
  const calls = [];
  const prepared = [];
  const api = createWorktreeOperations({
    reportDegrade: assert.fail,
    prepareWorktree: (...args) => prepared.push(args),
    identityArgs: assert.fail,
    mergeMessage: assert.fail,
  });
  assert.deepEqual(calls, []);
  const exec = async (...args) => { calls.push(args); return { status: 0, stdout: '', stderr: '' }; };
  const fault = { subject: 'caller-owned tree', fields: { key: 'fixture' } };
  const options = { exec, checkout: 'existing' };
  assert.equal(await api.runWorktreeAdd('repo', 'caller/tree', 'base', options, fault), 'caller/tree');
  assert.deepEqual(calls, [[['worktree', 'add', 'caller/tree', 'existing'], { cwd: 'repo' }]]);
  assert.deepEqual(prepared, [['repo', 'caller/tree', options, fault]]);
  const error = new Error('prepare refused');
  const failing = createWorktreeOperations({ reportDegrade: assert.fail, prepareWorktree: () => { throw error; }, identityArgs: assert.fail, mergeMessage: assert.fail });
  await assert.rejects(failing.runWorktreeAdd('repo', 'caller/tree', 'base', { exec }), candidate => candidate === error);
  assert.equal(resolveExec({ exec }), exec);
  assert.equal(resolveExec({}), defaultGitExec);
});

test('merge mechanics use supplied identity/message and abort conflicts without discarding history', async () => {
  const calls = [];
  const api = createWorktreeOperations({
    reportDegrade: assert.fail, prepareWorktree: assert.fail,
    identityArgs: node => ['-c', `user.name=${node}`],
    mergeMessage: ({ branch, base }) => `merge ${base} into ${branch}`,
  });
  const exec = async args => {
    calls.push(args);
    if (args[0] === 'symbolic-ref') return { status: 0, stdout: 'branch\n' };
    if (args[0] === 'merge-base') return { status: 1, stdout: '' };
    if (args[0] === 'status') return { status: 0, stdout: '' };
    if (args.includes('--no-ff')) return { status: 1, stdout: '', stderr: 'conflict' };
    if (args.includes('MERGE_HEAD')) return { status: 0, stdout: 'merge-head' };
    return { status: 0, stdout: args.includes('base^{commit}') ? 'resolved-base' : 'tip' };
  };
  const result = await api.advanceBranchToBase('tree', 'base', { exec, node: 'fixture' });
  assert.deepEqual(result, { outcome: 'refused', code: 'assignment-gate-propagation-conflict', branch: 'branch', base: 'resolved-base', tip: 'tip' });
  assert.ok(calls.some(args => JSON.stringify(args) === JSON.stringify(['-c', 'user.name=fixture', 'merge', '--no-ff', '--no-edit', '-m', 'merge resolved-base into branch', 'resolved-base'])));
  assert.ok(calls.some(args => args[0] === 'merge' && args[1] === '--abort'));
  assert.ok(calls.every(args => !args.includes('reset') && !args.includes('rebase')));
  assert.deepEqual(parsePorcelainStatus('R  old -> new\n?? extra\n'), [
    { index: 'R', worktree: ' ', paths: ['old', 'new'] },
    { index: '?', worktree: '?', paths: ['extra'] },
  ]);
});
