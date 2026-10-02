import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,writeFile,realpath,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createDoctorCommand} from '@aof/work/commands/doctor';
import {createValidateCommand} from '@aof/work/commands/validate';
import {createArchiveCommand} from '@aof/work/commands/archive';
import {createUpgradeCommand} from '@aof/work/commands/upgrade';

async function fixture(run) {
  const parent=await realpath(os.tmpdir()),root=await mkdtemp(path.join(parent,'aof-work-faces-'));
  try { await run(root); }
  finally { assert.equal(path.dirname(await realpath(root)),parent); await rm(root,{recursive:true,force:true}); }
}

test('doctor history port preserves bounded Git argv and degrades a failed read to an empty map',()=>fixture(async root=>{
  const calls=[];
  const {readRenameMap}=createDoctorCommand({execFileAsync:async(...args)=>{calls.push(args);return {stdout:'R100\tsrc/old.mjs\tsrc/new.mjs\n'};}});
  assert.equal(await readRenameMap(null),null); assert.deepEqual(calls,[]);
  assert.equal((await readRenameMap(root)).get('src/old.mjs'),'src/new.mjs');
  assert.equal(calls[0][0],'git');assert.ok(calls[0][1].includes('--name-status'));
  assert.deepEqual(calls[0][2],{cwd:root,encoding:'utf8',timeout:15000,maxBuffer:16*1024*1024,windowsHide:true});
  const failed=createDoctorCommand({execFileAsync:async()=>{throw Error('unavailable');}});
  assert.deepEqual(await failed.readRenameMap(root),new Map());
}));

test('archive refuses before its transition port, then passes the selected set through once',()=>fixture(async root=>{
  const calls=[],workspace={workDir:root};
  const {archiveCommand}=createArchiveCommand({transitionStreamArchived:async(...args)=>{calls.push(args);return {archived:[{name:'01_chore_done'}],rewritten:['linked.md'],eventId:'private'};}});
  await mkdir(path.join(root,'01_chore_done'));await writeFile(path.join(root,'01_chore_done/CHORE.md'),'---\ntitle: Done\nstatus: done\n---\n');
  await assert.rejects(archiveCommand.run({done:true},{workspace}),{code:'archive-confirm-required'});
  assert.equal(calls.length,0);
  const ctx={workspace,effectsJournalOptions:{fixture:true}};
  assert.deepEqual(await archiveCommand.run({done:true,yes:true},ctx),{archived:[{name:'01_chore_done'}],rewritten:['linked.md']});
  assert.deepEqual(calls,[[workspace,{names:['01_chore_done']},{publisherOptions:ctx,journalOptions:ctx.effectsJournalOptions}]]);
}));

test('validate preserves the configured validator and reads the rename map once',()=>fixture(async root=>{
  const calls=[],config={};const findings=[{path:path.join(root,'fixture.md'),problem:'fixture'}];
  const {validateWork}=createValidateCommand({validateCoreWork:async(...args)=>{calls.push(args);return findings;},readRenameMap:async projectRoot=>{calls.push(projectRoot);return null;}});
  assert.equal(await validateWork(root,config,'01',{projectRoot:root}),findings);
  assert.deepEqual(calls,[[root,config,'01'],root]);
}));

test('upgrade changelog bypasses the mutation port and dry-run/apply retain their meaning',async()=>{
  const calls=[];const {upgradeCommand}=createUpgradeCommand({renderChangelog:()=> 'changelog\n',runUpgrade:async(...args)=>{calls.push(args);return {fixture:true};}});
  assert.deepEqual(await upgradeCommand.run({changelog:true},{}),{changelog:true,text:'changelog\n'});assert.deepEqual(calls,[]);
  const ctx={workspace:{workDir:'fixture'}};await upgradeCommand.run({dryRun:true},ctx);await upgradeCommand.run({},ctx);
  assert.deepEqual(calls,[['fixture',{apply:false}],['fixture',{apply:true}]]);
});
