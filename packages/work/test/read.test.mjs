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

// milestone 135 / story 03 — 00_the-tasks-projection-carries-each-scenarios-rule.feature. The tasks
// command is driven as `aof work tasks <story> --json` drives it (its `run` is the face's result),
// over a local story folder or over members a worker streamed.
async function withLocalTask(feature, body) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-tasks-rule-'));
  try {
    const dir = path.join(root, 'work', '07_milestone_m', 'stories', '02_story_s');
    await mkdir(path.join(dir, 'tasks'), {recursive:true});
    await writeFile(path.join(dir, 'tasks', '00_task.feature'), feature);
    const item = {ref:'07/02', dir, type:'story', slug:'s'};
    const {tasksCommand} = createTasksCommand({resolveItem:async()=>item, readStreamedItemRow:async()=>null, readWorkerDocMembers:async()=>null, meshNodeIdOf:()=>'control', reportedElsewhere:()=>false});
    return await body(await tasksCommand.run({ref:'07/02'}, {workspace:{config:{}}}));
  } finally { await rm(root, {recursive:true, force:true}); }
}
async function remoteTask(feature) {
  const item = {ref:'07/02', dir:null, type:'story', slug:'s', answeredFrom:'cache', reportedBy:'worker'};
  const {tasksCommand} = createTasksCommand({resolveItem:async()=>item, readStreamedItemRow:async()=>item, readWorkerDocMembers:async()=>({reportedBy:'worker', members:[{member:'00_task.feature', body:feature}]}), meshNodeIdOf:()=>'control', reportedElsewhere:()=>true});
  return tasksCommand.run({ref:'07/02'}, {workspace:{config:{}}});
}
const ruled = (...blocks) => ['@executable', 'Feature: loans', '', ...blocks.flat(), ''].join('\n');
const scenario = (name) => [`    Scenario: ${name}`, '      Given a member', ''];
const rule = (title, ...names) => [`  Rule: ${title}`, '', ...names.flatMap(scenario)];

test('135/03 00 E1 · scenarios under two rules carry their rules\' titles in file order', () => withLocalTask(
  ruled(rule('R1 · at most five loans', 'a', 'b'), rule('R2 · overdue blocks', 'c')),
  (result) => assert.deepEqual(result.tasks[0].scenarios.map((entry) => entry.rule), ['R1 · at most five loans', 'R1 · at most five loans', 'R2 · overdue blocks']),
));

test('135/03 00 E2 · a scenario outside any rule carries no rule', () => withLocalTask(
  ruled(scenario('loose'), rule('R1 · at most five loans', 'a', 'b')),
  (result) => {
    const [first, ...rest] = result.tasks[0].scenarios;
    assert.equal(first.rule, null);
    assert.deepEqual(rest.map((entry) => entry.rule), ['R1 · at most five loans', 'R1 · at most five loans']);
  },
));

test('135/03 00 E3 · a feature with no Rule projects every scenario with a null rule', () => withLocalTask(
  ['@executable', 'Feature: plain', '', ...scenario('one'), ...scenario('two'), '  @manual', ...scenario('three')].join('\n'),
  (result) => {
    const [task] = result.tasks;
    for (const entry of task.scenarios) {
      assert.deepEqual(Object.keys(entry), ['name', 'outline', 'lane', 'rule']);
      assert.equal(entry.rule, null);
    }
    // The per-lane counts are the parse's own lanes, as before this story: two executable, and the
    // third doubly tagged (feature @executable + its own @manual), so it has no lane.
    assert.deepEqual(task.counts, {executable:2, manual:0, uat:0});
  },
));

test('135/03 00 the projection carries the rule title and nothing else of the rule (outline: local, remote read from the cache)', async () => {
  const feature = ['Feature: loans', '', '  @manual', '  Rule: R2 · overdue blocks', '', ...scenario('c'), ...scenario('d')].join('\n');
  const check = (label, result) => {
    for (const entry of result.tasks[0].scenarios) {
      assert.deepEqual(Object.keys(entry), ['name', 'outline', 'lane', 'rule'], label);
      assert.equal(entry.rule, 'R2 · overdue blocks', label);
      assert.equal(entry.lane, 'manual', `${label}: the rule's tag is in scope, but only its title crosses`);
    }
  };
  await withLocalTask(feature, (result) => check('local', result));
  const remote = await remoteTask(feature);
  assert.equal(remote.answeredFrom, 'cache');
  check('remote, read from the cache', remote);
});
