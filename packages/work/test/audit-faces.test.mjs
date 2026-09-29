import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,realpath,rm,access} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createAuditCommand} from '@aof/work/commands/audit';
import {createAcceptorCommand} from '@aof/work/commands/acceptor';
import {createAcceptorCriterion} from '@aof/work/acceptor/criterion';

async function fixture(run){
  const parent=await realpath(os.tmpdir()),root=await mkdtemp(path.join(parent,'aof-audit-faces-'));
  try{await run(root);}finally{assert.equal(path.dirname(await realpath(root)),parent);await rm(root,{recursive:true,force:true});}
}

test('audit hands project facts and all/offered populations to the configured report service',()=>fixture(async root=>{
  const workDir=path.join(root,'work');
  for(const name of ['01_chore_registered','02_chore_other']){await mkdir(path.join(workDir,name),{recursive:true});await writeFile(path.join(workDir,name,'CHORE.md'),'---\nstatus: not-started\n---\n');}
  await writeFile(path.join(workDir,'01_chore_registered/ARCHITECTURE.md'),'# Fixture register');
  const settingsPath=path.join(root,'fixture-settings.json');await writeFile(settingsPath,'{"fixture":true}');
  const calls=[],model={nodes:[]};
  const {auditCommand}=createAuditCommand({loadLoops:async()=>model,runAudit:async input=>{calls.push(input);return {limits:[],findings:[]};},AOF_HOOK_MARKER:'fixture-marker',claudeSettingsPath:()=>settingsPath,ROLE_WORDS:{'aof-product-owner':[]},declaredBoundValues:()=>({fixture:12})});
  const result=await auditCommand.run({scope:'01',now:123,deadlineMs:456},{workspace:{projectRoot:root,workDir,config:{work:{agents:{productOwner:'agent'},audit:{anchorStaleDays:2}}}}});
  assert.equal(calls.length,1);assert.equal(calls[0].model,model);assert.equal(calls[0].population.length,2);assert.equal(calls[0].items.length,1);
  assert.deepEqual(calls[0].settings,{fixture:true});assert.equal(calls[0].markerKey,'fixture-marker');assert.equal(calls[0].roleRouting['aof-product-owner'],'agent');
  assert.equal(calls[0].anchorWindowMs,2*86400000);assert.equal(calls[0].now,123);assert.equal(calls[0].deadlineMs,456);assert.deepEqual(calls[0].declaredBoundValues,{fixture:12});
  assert.match(result.limits.at(-1).answeredBy,/1 of 2/);
}));

test('acceptor snapshots its journal for reports and does not transition without an eligible explicit request',()=>fixture(async root=>{
  const criterion=createAcceptorCriterion({bundledFrozenSet:()=>({members:[]}),readFrozenSet:assert.fail}).defaultCriterion();
  const source=path.join(root,'evidence.sqlite');await writeFile(source,'original evidence');
  let snapshot,closed=0,transitions=0;
  const {acceptorCommand}=createAcceptorCommand({
    readCriterion:async()=>criterion,loadLoops:async()=>({nodes:[]}),readHarnessRulings:async()=>({records:[]}),effectsJournalPath:()=>source,
    openEffectsJournal:async options=>{snapshot=options.databasePath;assert.notEqual(snapshot,source);assert.equal(await readFile(snapshot,'utf8'),'original evidence');await writeFile(snapshot,'private migration');return {close:()=>{closed++;}};},
    readObservationCensus:journal=>{assert.equal(journal.databasePath,source);return {populations:[],findings:[]};},
    transitionHarnessRuled:async()=>{transitions++;throw Error('must not transition');},
  });
  const ctx={workspace:{projectRoot:root,config:{}}};
  const report=await acceptorCommand.run({},ctx);assert.equal(report.reportOnly,true);assert.equal(report.action,null);assert.equal(closed,1);assert.equal(transitions,0);
  assert.equal(await readFile(source,'utf8'),'original evidence');await assert.rejects(access(snapshot),{code:'ENOENT'});
  const refused=await acceptorCommand.run({commit:'undeclared'},ctx);assert.equal(refused.action.applied,false);assert.equal(transitions,0);
}));
