import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,realpath,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {createWorkObserver} from '@aof/work/observe';
import {createObserveCommand} from '@aof/work/commands/observe';
import {debtCommand} from '@aof/work/commands/debt';

test('observation uses supplied reporting and configuration without work at construction',async()=>{
  const reports=[],calls=[];
  const observer=createWorkObserver({reportDegrade:(...args)=>reports.push(args)});
  let config={work:{observability:{enabled:false}}};
  const {observeCommand}=createObserveCommand({
    observabilityEnabled:observer.observabilityEnabled,
    loadWorkspace:async(cwd,file)=>{calls.push({cwd,file});return {config};},
    observeMilestone:async options=>{calls.push(options);return {fixture:true};},
  });
  assert.deepEqual(calls,[]);assert.deepEqual(reports,[]);
  assert.deepEqual(await observeCommand.run({ref:'01',ifEnabled:true,config:'fixture.json'}),{skipped:true});
  assert.deepEqual(calls,[{cwd:process.cwd(),file:'fixture.json'}]);
  config={work:{observability:{enabled:true,cacheRatioTarget:0.5}}};
  assert.deepEqual(await observeCommand.run({ref:'01',stall:'2',humanWait:'3',write:true}),{fixture:true});
  const options=calls.at(-1);
  assert.equal(options.ref,'01');assert.equal(options.stallMs,120000);assert.equal(options.humanWaitMs,180000);
  assert.equal(options.cacheRatioTarget,0.5);assert.equal(options.cacheRatioTargetConfigured,true);assert.equal(options.write,true);
  assert.equal(await observer.readAskQuestion({sessionId:null}),null);
  assert.equal(reports.length,1);assert.equal(reports[0][0],'ask-question-unreadable');
});

test('debt command previews pruning and changes only the configured ledger on explicit write',async()=>{
  const parent=await realpath(os.tmpdir()),root=await mkdtemp(path.join(parent,'aof-debt-package-'));
  try{
    const workDir=path.join(root,'work');await mkdir(workDir);
    const target=path.join(workDir,'TECH_DEBT.md');
    const text='# Tech debt\r\n\r\n## 1. Retained\r\n\r\n**Status:** open\r\n\r\n## 2. Discharged\r\n\r\n**Status:** CLOSED\r\n';
    await writeFile(target,text);const ctx={workspace:{workDir}};
    const preview=await debtCommand.run({prune:true},ctx);
    assert.equal(preview.written,false);assert.deepEqual(preview.removed.map(row=>row.number),[2]);
    assert.equal(await readFile(target,'utf8'),text);
    const result=await debtCommand.run({prune:true,write:true},ctx);assert.equal(result.written,true);
    const after=await readFile(target,'utf8');assert.match(after,/Retained/);assert.doesNotMatch(after,/Discharged/);assert.ok(after.includes('\r\n'));
    assert.equal((await debtCommand.run({prune:true,write:true},ctx)).written,false,'repeating the prune is inert');
  }finally{assert.equal(path.dirname(await realpath(root)),parent);await rm(root,{recursive:true,force:true});}
});
