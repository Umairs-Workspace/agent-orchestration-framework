import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,realpath,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {appendRawFeedback,recordFeedbackClassification,readFeedbackRecords,feedbackRecordPath} from '@aof/work/feedback-records';
import {createFeedbackCommand} from '@aof/work/commands/feedback';
import {createCountersCommand} from '@aof/work/commands/counters';
import {createRatchetCommand} from '@aof/work/commands/ratchet';

async function fixture(run){
  const parent=await realpath(os.tmpdir()),root=await mkdtemp(path.join(parent,'aof-feedback-package-'));
  try{await run(root);}finally{assert.equal(path.dirname(await realpath(root)),parent);await rm(root,{recursive:true,force:true});}
}

test('feedback records append classification after verbatim raw capture and refuse duplicate writes',()=>fixture(async dir=>{
  const item={dir},raw={id:'raw-1',text:'  verbatim\nfeedback  ',actor:'fixture',refs:'01',at:'2026-09-29T12:00:00Z'};
  await appendRawFeedback(item,raw);const before=await readFile(feedbackRecordPath(item),'utf8');
  await assert.rejects(appendRawFeedback(item,raw),{code:'feedback-id-conflict'});assert.equal(await readFile(feedbackRecordPath(item),'utf8'),before);
  await recordFeedbackClassification(item,{id:'triage-1',raw:'raw-1',at:raw.at,classification:{kind:'bug'}});
  const after=await readFile(feedbackRecordPath(item),'utf8');assert.ok(after.startsWith(before));
  const records=await readFeedbackRecords(item);assert.equal(records[0].text,raw.text);assert.equal(records[1].raw,'raw-1');
}));

test('feedback factory refuses classification before resolution and hands raw text to the transition',async()=>{
  const calls=[],item={ref:'01',type:'milestone',dir:'fixture'};
  const {feedbackCommand}=createFeedbackCommand({resolveItemExact:async()=>{calls.push('resolve');return item;},requireLocalCheckout:()=>{},transitionFeedbackAppended:async(...args)=>{calls.push(args);return {effects:[]};},threadPropagationWarnings:(value)=>value});
  const ctx={workspace:{},now:()=> '2026-09-29T12:00:00Z',feedbackId:()=> 'fixture-id'};
  await assert.rejects(feedbackCommand.run({ref:'01',note:'text',severity:'high'},ctx),{code:'feedback-classification-deferred'});assert.deepEqual(calls,[]);
  const result=await feedbackCommand.run({ref:'01',note:'  raw text  ',actor:' writer '},ctx);
  assert.equal(result.bullet,'- raw text — Raised by: writer');assert.equal(calls[1][1].raw.text,'  raw text  ');assert.equal(calls[1][0],item);
});

test('counter observation reads package records and supplied run history',()=>fixture(async workDir=>{
  const dir=path.join(workDir,'01_chore_counter');await mkdir(dir);await writeFile(path.join(dir,'CHORE.md'),'---\nstatus: done\nupdated: 2026-09-29T12:00:00Z\n---\n');
  const calls=[];const {observeCounters}=createCountersCommand({readRuns:async item=>{calls.push(item.ref);return [{runId:'fixture'}];}});
  const observations=await observeCounters({workDir},{ref:'01',parent:null});
  assert.deepEqual(calls,['01']);assert.equal(observations[0].status,'done');assert.deepEqual(observations[0].feedbackRecords,[]);assert.equal(observations[0].runs[0].runId,'fixture');
}));

test('ratchet supplies bounded Git argv through its process port and reports an unresolved base',async()=>{
  const calls=[];const {resolveRatchetBase}=createRatchetCommand({execFileAsync:async(...args)=>{calls.push(args);return {stdout:'a'.repeat(40)+'\n'};}});
  assert.deepEqual(await resolveRatchetBase({projectRoot:'fixture',recordPath:'item/STORY.md',suppliedBase:' main '}),{commit:'a'.repeat(40),source:'supplied'});
  assert.deepEqual(calls,[['git',['rev-parse','--verify','main^{commit}'],{cwd:'fixture',encoding:'utf8',timeout:15000,windowsHide:true}]]);
  const unavailable=createRatchetCommand({execFileAsync:async()=>{throw Error('git unavailable');}});
  assert.equal(await unavailable.resolveRatchetBase({projectRoot:'fixture',recordPath:'item/STORY.md',suppliedBase:'main'}),null);
});
