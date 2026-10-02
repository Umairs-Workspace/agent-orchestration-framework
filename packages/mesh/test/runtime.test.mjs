import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkerLaunch } from '@aof/mesh/worker-launch';
import { resolveCloneUrl, parseRepoFromCloneUrl } from '@aof/mesh/worker-repo-admission';
import { createWorkerExecutionServices } from '@aof/mesh/worker-execution';
import { createControlStreamServices, CLONE_CREDENTIAL_NOT_HOLDER, CLONE_CREDENTIAL_WORKSPACE_MISMATCH } from '@aof/mesh/control-stream-server';
import { createSessionSpawnServices } from '@aof/mesh/session-spawn-handler';

test('directive launch reads its declaration on demand and preserves declared versus absent launch', async () => {
  const reads = [], declared = { program: 'fixture-aof', args: ['work', 'loop'] };
  const api = createWorkerLaunch({ readFrozenSet: async root => { reads.push(root); return {}; }, compileFrozenSet: () => ({ unattendedLaunch: declared }) });
  assert.deepEqual(reads, []);
  assert.deepEqual(api.readDirectiveLaunch({}), { declared: false, launch: null });
  assert.deepEqual(api.readDirectiveLaunch({ launch: null }), { declared: true, launch: null });
  assert.deepEqual(await api.composeDirectiveLaunchOptions({ scope: '142', custom: true }, '/fixture'), { options: { unattended: { scope: '142', custom: true, program: 'fixture-aof', args: ['work', 'loop', '142'] }, declaredLaunch: declared } });
  assert.deepEqual(reads, ['/fixture']);
  assert.equal((await api.composeDirectiveLaunchOptions({}, '/fixture')).code, 'assignment-loop-launch-scopeless');
});

test('pure clone URL helpers preserve repository scope and distinguish SSH ports from forge API ports', () => {
  assert.equal(resolveCloneUrl({ config: { mesh: { repo: { cloneUrl: 'https://github.com/owner/repo.git' } } } }), 'https://github.com/owner/repo.git');
  assert.deepEqual(parseRepoFromCloneUrl('ssh://git@ghe.example:2222/Owner/Repo.git'), { host: 'ghe.example', owner: 'Owner', repo: 'Repo', apiBaseUrl: 'https://ghe.example/api/v3' });
  assert.equal(parseRepoFromCloneUrl('https://ghe.example:8443/Owner/Repo.git').apiBaseUrl, 'https://ghe.example:8443/api/v3');
  assert.equal(parseRepoFromCloneUrl('https://github.com/owner'), null);
});

test('worker runtime instances own separate active-worktree registries and settle by assignment identity', () => {
  const first = createWorkerExecutionServices({}), second = createWorkerExecutionServices({});
  first.registerActiveWorktree('assignment', { itemRef: '142', worktreePath: '/fixture' });
  assert.deepEqual(first.listActiveWorktrees(), [{ assignmentId: 'assignment', itemRef: '142', worktreePath: '/fixture' }]);
  assert.deepEqual(second.listActiveWorktrees(), []);
  first.clearActiveWorktree('unrelated');
  assert.equal(first.listActiveWorktrees().length, 1);
  first.clearActiveWorktree('assignment');
  assert.deepEqual(first.listActiveWorktrees(), []);
});

test('control credential admission uses the authenticated holder and assignment workspace before minting', async () => {
  const api = createControlStreamServices({});
  let minted = 0;
  const store = { db: { prepare: () => ({ get: () => ({ target_node_id: 'owner', workspace_id: 'workspace', state: 'running' }) }) } };
  const frame = { nodeId: 'owner', assignmentId: 'assignment', workspaceId: 'workspace' };
  const mintCloneCredential = () => { minted++; throw Error('must not mint'); };
  assert.equal((await api.applyCloneCredentialRequestFrame(store, frame, { nodeId: 'other', mintCloneCredential })).code, CLONE_CREDENTIAL_NOT_HOLDER);
  assert.equal((await api.applyCloneCredentialRequestFrame(store, { ...frame, workspaceId: 'foreign' }, { nodeId: 'owner', mintCloneCredential })).code, CLONE_CREDENTIAL_WORKSPACE_MISMATCH);
  assert.equal(minted, 0);
});

test('session spawn resolves platform shells without loading a PTY or spawning a process', () => {
  const fail = () => { throw Error('terminal service invoked'); };
  const api = createSessionSpawnServices({ createTerminalSpawn: () => fail, loadNodePty: fail });
  assert.equal(api.resolveDefaultShell({ ComSpec: 'fixture-shell.exe' }, 'win32'), 'fixture-shell.exe');
  assert.equal(api.resolveDefaultShell({}, 'win32'), 'cmd.exe');
  assert.equal(api.resolveDefaultShell({ SHELL: '/fixture/sh' }, 'linux'), '/fixture/sh');
  assert.equal(api.resolveDefaultShell({}, 'linux'), '/bin/bash');
});
