import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,realpath,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {createWorkInsertion} from '@aof/work/insertion/scaffold';
import {createPromoteCommand} from '@aof/work/commands/promote';
import {createInsertChoreCommand} from '@aof/work/commands/insert-chore';
import {reindexForInsert} from '@aof/work/reindex';

test('insertion uses supplied version and transition policies and leaves command construction inert',async()=>{
 const parent=await realpath(os.tmpdir()),root=await mkdtemp(path.join(parent,'aof-insertion-package-'));
 try{
  const workDir=path.join(root,'work'),aofDir=path.join(root,'.aof');
  await mkdir(workDir);await mkdir(path.join(aofDir,'templates/work/chore'),{recursive:true});
  await writeFile(path.join(aofDir,'templates/work/chore/CHORE.md'),'---\ntype: chore\nnumber: NN\nslug: <kebab-slug>\nstatus: not-started\nschema: <schema-version>\naofVersion: <aof-version>\n---\n# NN · <Chore Title>\n');
  const calls=[];let versionReads=0;
  const workspace={projectRoot:root,workDir,aofDir,config:{}},ctx={workspace,effectsJournalOptions:{fixture:true}};
  const transitionStreamReindexed=async(ws,position,options)=>{assert.equal(ws,workspace);assert.equal(options.publisherOptions,ctx);calls.push(position);return reindexForInsert(workDir,position);};
  const insertion=createWorkInsertion({transitionStreamReindexed,packageVersionString:()=>{versionReads++;return 'fixture-1';}});
  const promotion=createPromoteCommand({...insertion,transitionStreamReindexed});
  const {insertChoreCommand}=createInsertChoreCommand({...insertion,...promotion});
  assert.equal(calls.length,0);assert.equal(versionReads,0);
  const result=await insertChoreCommand.run({slug:'example',at:0,today:'2026-09-29'},ctx);
  assert.deepEqual(calls,[{at:0,space:'top-level'}]);
  assert.equal(result.created.ref,'00');
  const text=await readFile(path.join(result.created.dir,'CHORE.md'),'utf8');
  assert.match(text,/^number: 00$/m);assert.match(text,/^aofVersion: fixture-1$/m);
  assert.ok(versionReads>0,'stamping asks the supplied version policy');
 }finally{assert.equal(path.dirname(await realpath(root)),parent);await rm(root,{recursive:true,force:true});}
});
