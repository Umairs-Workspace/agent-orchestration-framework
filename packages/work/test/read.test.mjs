import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp, mkdir, writeFile, realpath, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createWorkReader} from '@aof/work/read';
import {createWorkContentReader} from '@aof/work/content-read';
import {createWorkResolvers} from '@aof/work/commands/resolve';
import {createDocCommand} from '@aof/work/commands/doc';
import {createTasksCommand} from '@aof/work/commands/tasks';

test('read ports preserve cache provenance and keep mesh worktrees on their own disk', async () => {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-read-package-'));
  try {
    const workDir = path.join(root, 'work'), dir = path.join(workDir, '00_chore_local');
    await mkdir(dir, {recursive:true});
    await writeFile(path.join(dir, 'CHORE.md'), '---\ntype: chore\nnumber: 00\nslug: local\nstatus: not-started\n---\n# Local\n');
    await writeFile(path.join(dir, 'STATE.md'), '# Local state\n');
    const workspace = {projectRoot:root, workDir};
    let worker = false, cacheReads = 0;
    const degrades = [];
    const reader = createWorkReader({
      readCachedItemRows: async (ws) => {
        assert.equal(ws, workspace); cacheReads++;
        return {rows:new Map([['01', {ref:'01', type:'chore', slug:'remote', status:'in-progress'}]]), provenance:new Map([['01', {reportedBy:'worker', syncedAt:'fixture-instant'}]])};
      },
      reportDegrade: (...args) => degrades.push(args),
      isUnderMeshWorktreesRoot: () => worker,
      isUnderMeshSessionWorktreesRoot: () => false,
      isUnderMeshDispatchWorktreesRoot: () => false,
    });
    assert.equal(cacheReads, 0, 'constructing the reader is inert');
    const rows = await reader.listItemsCacheFirst(workspace);
    const remote = rows.find(row => row.ref === '01');
    assert.equal(remote.dir, null);
    assert.equal(remote.answeredFrom, 'cache');
    assert.equal(remote.reportedBy, 'worker');
    assert.equal(remote.syncedAt, 'fixture-instant');
    assert.equal(rows.find(row => row.ref === '00').answeredFrom, 'disk');
    assert.equal(degrades.length, 1, 'a local cache miss is reported');
    worker = true;
    const own = await reader.listItemsCacheFirst(workspace);
    assert.deepEqual(own.map(row => [row.ref,row.answeredFrom]), [['00','disk']]);
    assert.equal(cacheReads, 1, 'a worker never asks the control cache');
    assert.equal(degrades.length, 1, 'reading the worker checkout is not a degrade');
    const run = {runId:'run-fixture', state:'done'};
    const content = createWorkContentReader({readRuns:async item => { assert.equal(item.dir,dir); return [run]; }});
    const records = await content.readWorkspaceContentRecords(workspace);
    assert.deepEqual(records.runs, [{ref:'00',runId:run.runId,record:run}]);
    assert.equal(records.docs.length,1);
    assert.deepEqual(records.errors,[]);
  } finally {
    assert.equal(path.dirname(await realpath(root)), parent);
    await rm(root, {recursive:true,force:true});
  }
});

test('remote read commands consume injected content and preserve exact write resolution', async () => {
  const item = {ref:'01/00',dir:null,type:'story',slug:'remote',answeredFrom:'cache',reportedBy:'worker'};
  const ctx = {workspace:{config:{}}};
  const resolvers = createWorkResolvers({findWorkCacheFirst:async()=>[item],readRuns:async()=>[]});
  assert.equal(await resolvers.resolveItem(ctx,'remote'),item);
  assert.equal(await resolvers.resolveItemExact(ctx,'remote'),null);
  assert.throws(()=>resolvers.requireLocalCheckout(item),error=>error.code==='item-not-local' && error.status===409);
  const ports = {...resolvers,readStreamedItemRow:async()=>item,meshNodeIdOf:()=> 'control',reportedElsewhere:()=>true};
  const {docCommand} = createDocCommand({...ports,readWorkerDoc:async()=>({body:'# Remote',reportedBy:'worker',syncedAt:'fixture-instant'})});
  const doc = await docCommand.run({ref:'01/00',doc:'STORY'},ctx);
  assert.equal(doc.body,'# Remote'); assert.equal(doc.answeredFrom,'cache');
  const {tasksCommand} = createTasksCommand({...ports,readWorkerDocMembers:async()=>({reportedBy:'worker',members:[{member:'00_remote.feature',body:'Feature: Remote\n  @executable\n  Scenario: reads remotely\n    Given cached content\n'}]})});
  const tasks = await tasksCommand.run({ref:'01/00'},ctx);
  assert.equal(tasks.answeredFrom,'cache');
  assert.equal(tasks.tasks[0].feature,'Remote');
  assert.equal(tasks.tasks[0].counts.executable,1);
});
