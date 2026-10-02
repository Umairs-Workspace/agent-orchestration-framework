import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,writeFile,realpath,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {createTestSelector} from '@aof/work/testing/select';
import {createChangedFilesReader} from '@aof/work/testing/changed';
import {createWorkToolchain} from '@aof/work/testing/toolchain';
import {createTestCommand} from '@aof/work/commands/test';

test('testing ports preserve bounded argv execution and supplied changed-set refusal codes',async()=>{
  const launches=[];
  const launch=async input=>{launches.push(input);return {outcome:'exited',exitCode:0,stdout:input.command==='git'?'?? src/new.mjs\n':'ok - fixture\n',stderr:''};};
  const reader=createChangedFilesReader({runBounded:launch,CHANGED_SET_EMPTY:'empty',CHANGED_SET_UNREADABLE:'unreadable',SINCE_REV_UNRESOLVABLE:'revision'});
  const toolchain=createWorkToolchain({runBounded:launch});
  assert.deepEqual(launches,[]);
  const changed=await reader.changedFiles({projectRoot:'fixture',deadlineMs:1234});
  assert.deepEqual(changed.changed,['src/new.mjs']);assert.equal(launches[0].command,'git');assert.equal(launches[0].deadlineMs,1234);
  const declared={program:'fixture-runner',args:['--report'],selectArgs:['--file','{file}'],deadlineMs:4567};
  const result=await toolchain.launchRunner(declared,['test/with space.test.mjs'],{cwd:'fixture'});
  assert.equal(result.verdict,'passed');
  assert.deepEqual(launches.at(-1),{command:'fixture-runner',args:['--report','--file','test/with space.test.mjs'],cwd:'fixture',env:undefined,deadlineMs:4567});
  const empty=createChangedFilesReader({runBounded:async()=>({outcome:'exited',exitCode:0,stdout:'',stderr:''}),CHANGED_SET_EMPTY:'custom-empty',CHANGED_SET_UNREADABLE:'unreadable',SINCE_REV_UNRESOLVABLE:'revision'});
  assert.equal((await empty.changedFiles({projectRoot:'fixture'})).code,'custom-empty');
});

test('selector consumes supplied graph facts and widens an unknown without launching anything',async()=>{
  const parent=await realpath(os.tmpdir()),root=await mkdtemp(path.join(parent,'aof-testing-package-'));
  try{
    const artifact=path.join(root,'graph.json');await writeFile(artifact,'fixture');let reads=0;
    const selector=createTestSelector({
      graphJsonPath:()=>artifact,graphArtifactBuiltAt:()=> 'artifact-instant',
      readGraph:file=>{assert.equal(file,artifact);reads++;return 'raw';},
      normalizeGraph:raw=>{assert.equal(raw,'raw');return 'normalized';},
      computeImpact:(graph,files)=>{assert.equal(graph,'normalized');return files.map(file=>({present:file==='src/known.mjs',dependents:['test/known.test.mjs']}));},
      registrationDecision:()=>({fixture:true}),
    });
    assert.equal(reads,0);
    const allSuites=['test/known.test.mjs','test/other.test.mjs'];
    const known=selector.selectSuites({projectRoot:root,changed:['src/known.mjs'],allSuites,roots:['test']});
    assert.deepEqual(known.selected,['test/known.test.mjs']);assert.equal(known.builtAt,'artifact-instant');
    const unknown=selector.selectSuites({projectRoot:root,changed:['src/new.mjs'],allSuites,roots:['test']});
    assert.equal(unknown.scope,'all');assert.deepEqual(unknown.selected,allSuites);assert.equal(unknown.widened[0].reason,'not-in-graph');
  }finally{assert.equal(path.dirname(await realpath(root)),parent);await rm(root,{recursive:true,force:true});}
});

test('test command composes the supplied toolchain and launches a whole run without selection argv',async()=>{
  const calls=[];const toolchain={program:'fixture',roots:['test'],report:{format:'tap'}};
  const {testCommand}=createTestCommand({
    walkSuiteFiles:async(root,roots)=>{calls.push({root,roots});return ['test/one.test.mjs'];},
    resolveTestToolchain:()=>({ok:true,toolchain}),
    launchRunner:async(tc,files,options)=>{assert.equal(tc,toolchain);calls.push({files,options});return {outcome:'exited',exitCode:0,stdout:'ok - fixture\n',stderr:'',verdict:'passed',status:0};},
    changedFiles:()=>{throw Error('whole run must not inspect changes');},
    selectSuites:()=>{throw Error('whole run must not select');},resolveItemExact:async()=>null,
  });
  assert.deepEqual(calls,[]);
  const result=await testCommand.run({scope:'all'},{workspace:{projectRoot:'fixture',config:{}}});
  assert.equal(result.exit,0);assert.equal(result.gate,true);assert.equal(result.launched,true);
  assert.deepEqual(calls.at(-1),{files:[],options:{cwd:'fixture'}});
});
