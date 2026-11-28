import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,writeFile,realpath,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {isSuiteFile} from '@aof/work/testing/suites';
import {createChangedFilesReader} from '@aof/work/testing/changed';
import {createWorkToolchain} from '@aof/work/testing/toolchain';
import {createTestCommand} from '@aof/work/commands/test';
import {createTestRecord} from '@aof/work/testing/record';

test('testing ports preserve bounded argv execution and the changed set reads the working tree only',async()=>{
  const launches=[];
  const launch=async input=>{launches.push(input);return {outcome:'exited',exitCode:0,stdout:input.command==='git'?'?? src/new.mjs\n':'ok - fixture\n',stderr:''};};
  const reader=createChangedFilesReader({runBounded:launch});
  const toolchain=createWorkToolchain({runBounded:launch});
  assert.deepEqual(launches,[]);
  const changed=await reader.changedFiles({projectRoot:'fixture',deadlineMs:1234});
  assert.deepEqual(changed.changed,['src/new.mjs']);assert.equal(launches[0].command,'git');assert.equal(launches[0].deadlineMs,1234);
  const declared={program:'fixture-runner',args:['--report'],selectArgs:['--file','{file}'],deadlineMs:4567};
  const result=await toolchain.launchRunner(declared,['test/with space.test.mjs'],{cwd:'fixture'});
  assert.equal(result.verdict,'passed');
  assert.deepEqual(launches.at(-1),{command:'fixture-runner',args:['--report','--file','test/with space.test.mjs'],cwd:'fixture',env:undefined,deadlineMs:4567});
  await toolchain.launchRunner({...declared,selectProgramArgs:['light-entry']},['a.test.mjs'],{cwd:'fixture'});
  assert.deepEqual(launches.at(-1).args,['light-entry','--file','a.test.mjs'],'a selection launches the declared selection program in place of args');
  // 210/ADR-003: an empty working tree is an answer, and only a tree git could not read is refused.
  const empty=createChangedFilesReader({runBounded:async()=>({outcome:'exited',exitCode:0,stdout:'',stderr:''})});
  assert.deepEqual(await empty.changedFiles({projectRoot:'fixture'}),{ok:true,changed:[]});
  const unreadable=createChangedFilesReader({runBounded:async()=>({outcome:'exited',exitCode:128,stdout:'',stderr:'not a git repository',attempted:'git status'})});
  assert.equal((await unreadable.changedFiles({projectRoot:'fixture'})).code,'changed-set-unreadable');
});

test('the suite predicate reads only the declared roots, suffixes and exclusions',()=>{
  // 210/ADR-008: the predicate outlives the selector; --all, a named run and the scan all ask it.
  const exclude=[{paths:['test/native/**'],why:'native'}];
  assert.equal(isSuiteFile('test/a.test.mjs',['test'],['.test.mjs'],exclude),true);
  assert.equal(isSuiteFile('test/native/b.test.mjs',['test'],['.test.mjs'],exclude),false);
  assert.equal(isSuiteFile('test/support/h.mjs',['test'],['.test.mjs'],exclude),false);
  assert.equal(isSuiteFile('test/node_modules/x.test.mjs',['test']),false);
});

test('test command composes the supplied toolchain and launches a whole run without selection argv',async()=>{
  const calls=[];const toolchain={program:'fixture',roots:['test'],report:{format:'tap'}};
  const {testCommand}=createTestCommand({
    walkSuiteFiles:async(root,roots)=>{calls.push({root,roots});return ['test/one.test.mjs'];},
    resolveTestToolchain:()=>({ok:true,toolchain}),
    launchRunner:async(tc,files,options)=>{assert.equal(tc,toolchain);calls.push({files,options});return {outcome:'exited',exitCode:0,stdout:'ok - fixture\n',stderr:'',verdict:'passed',status:0};},
    changedFiles:()=>{throw Error('whole run must not inspect changes');},
    scanImporters:()=>{throw Error('whole run must not scan');},
  });
  assert.deepEqual(calls,[]);
  const result=await testCommand.run({all:true},{workspace:{projectRoot:'fixture',config:{}}});
  assert.equal(result.exit,0);assert.equal(result.gate,true);assert.equal(result.launched,true);
  assert.deepEqual(calls.at(-1),{files:[],options:{cwd:'fixture'}});
});

test('test record performs nothing at construction and asks git only through the supplied launch',async()=>{
  // 190/00: the content key is git's answer, through the one bounded seam; outside git it is no key, never a guess.
  const launches=[];
  const record=createTestRecord({runBounded:async input=>{launches.push(input);return {outcome:'exited',exitCode:128,stdout:'',stderr:'not a git repository'};}});
  assert.deepEqual(launches,[]);
  const keyed=await record.treeKey({projectRoot:'fixture'});
  assert.deepEqual({ok:keyed.ok,reason:keyed.reason},{ok:false,reason:'no git'});
  assert.equal(launches.length,1);assert.equal(launches[0].command,'git');assert.equal(launches[0].cwd,'fixture');assert.equal(launches[0].deadlineMs,record.KEY_DEADLINE_MS);
  const env={platform:'linux',arch:'x64',node:22};
  assert.equal(record.recordAnswers({key:'k',environment:env,result:'green',selected:'all'},{key:'k',environment:env,selection:['a.test.mjs']}),true);
  assert.equal(record.recordAnswers({key:'k',environment:env,result:'red',selected:['a.test.mjs','b.test.mjs']},{key:'k',environment:env,selection:['a.test.mjs']}),false);
  assert.equal(record.recordAnswers({key:'k',environment:env,result:'green',selected:'all'},{key:'other',environment:env,selection:['a.test.mjs']}),false);
});
