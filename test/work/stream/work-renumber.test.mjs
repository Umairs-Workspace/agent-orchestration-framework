import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { withWork, writeMilestoneItem, writeStoryItem } from '../../support/work-reindex-fixture.mjs';

export const workRenumberTests = [
  { name: '182/00 renumber previews without writing, refuses collisions, and preserves lifecycle', async run() {
    const { planRenumber, applyRenumber } = await import('../../../packages/work/src/renumber.mjs');
    await withWork(async work => {
      const old = await writeMilestoneItem(work, '175', { status: 'done' });
      await writeMilestoneItem(work, '176');
      const before = await readdir(work);
      const plan = await planRenumber(work, { ref: '175', to: '181' });
      assert.deepEqual(await readdir(work), before);
      assert.equal(plan.to, '181');
      await assert.rejects(planRenumber(work, { ref: '175', to: '176' }), { code: 'renumber-target-occupied' });
      for (const to of ['../181', '-1', '181x', '175']) await assert.rejects(planRenumber(work, { ref: '175', to }), /renumber|number|different/i);
      const result = await applyRenumber(plan);
      assert.deepEqual(result.remap, [{ from: '175', to: '181' }]);
      assert.match(await readFile(path.join(result.destination, 'SPEC.md'), 'utf8'), /status: done/);
      assert.match(await readFile(path.join(result.destination, 'SPEC.md'), 'utf8'), /number: 181/);
      assert.ok((await readdir(work)).some(n => n.startsWith('176_')));
      await assert.rejects(readFile(path.join(old, 'SPEC.md')), { code: 'ENOENT' });
    });
  } },
  { name: '182/01 renumber rewrites dependencies, paths and citations and preserves historical evidence', async run() {
    const { planRenumber, applyRenumber } = await import('../../../packages/work/src/renumber.mjs');
    const { readRefHistory, remapHistoricalRef } = await import('../../../packages/work/src/ref-history.mjs');
    await withWork(async work => {
      const old = await writeMilestoneItem(work, '175', { status: 'done' });
      const child = await writeStoryItem(old, '00', '175');
      const other = await writeMilestoneItem(work, '176', { depends: ['175'] });
      await writeFile(path.join(other, 'RETROSPECTIVE.md'), '# R1 — Same cause\n**Recurs:** 175/R1\n[old](../'+path.basename(old)+'/SPEC.md)\n');
      await mkdir(path.join(old, 'verification'));
      const raw = '{"item":"175","query":"175/R1","at":"2026-01-01T00:00:00Z"}\n';
      await writeFile(path.join(old, 'verification', 'original.json'), raw);
      const plan = await planRenumber(work, { ref: '175', to: '181', now: '2026-10-30T18:00:00Z' });
      await applyRenumber(plan);
      assert.match(await readFile(path.join(other, 'SPEC.md'), 'utf8'), /depends: \[181\]/);
      const retro = await readFile(path.join(other, 'RETROSPECTIVE.md'), 'utf8');
      assert.match(retro, /181\/R1/); assert.ok(retro.includes('181_milestone_item175/SPEC.md'));
      const movedChild = path.join(plan.destination, path.relative(old, child));
      assert.match(await readFile(path.join(movedChild, 'STORY.md'), 'utf8'), /parent: 181/);
      assert.deepEqual(plan.remap, [{from:'175',to:'181'}, {from:'175/00',to:'181/00'}]);
      assert.equal(await readFile(path.join(plan.destination, 'verification', 'original.json'), 'utf8'), raw);
      const history = await readRefHistory(work);
      assert.equal(remapHistoricalRef('175', '2026-01-01T00:00:00Z', history), '181');
      assert.equal(remapHistoricalRef('175', '2027-01-01T00:00:00Z', history), '175', 'a reused number is not a permanent alias');
    });
  } },
  { name: '182/00 registered renumber verb is available with dry-run and to flags', async run() {
    const { defaultApplication } = await import('aof/default-application');
    const command = defaultApplication.listCommands().find(c => c.id === 'work:renumber');
    assert.ok(command, 'work:renumber must be registered');
  } },
];

workRenumberTests.push(
  {name:'182/00 nested renumber stays in its own space and refuses archived collisions', async run(){
    const {planRenumber,applyRenumber}=await import('../../../packages/work/src/renumber.mjs');
    await withWork(async work=>{
      const parent=await writeMilestoneItem(work,'07');
      const child=await writeStoryItem(parent,'00','07');
      await writeFile(path.join(child,'STORY.md'),(await readFile(path.join(child,'STORY.md'),'utf8'))+'# 00 · Nested title\n');
      const sibling=await writeStoryItem(parent,'01','07');
      await writeFile(path.join(parent,'SPEC.md'),(await readFile(path.join(parent,'SPEC.md'),'utf8'))+'\n[child](stories/00_story_story00/STORY.md) — m07/00/ADR-001 and 07/00\n');
      await assert.rejects(planRenumber(work,{ref:'07/00',to:'01'}),{code:'renumber-target-occupied'});
      await applyRenumber(await planRenumber(work,{ref:'07/00',to:'03'}));
      const spec=await readFile(path.join(parent,'SPEC.md'),'utf8');
      assert.match(await readFile(path.join(parent,'stories','03_story_story00','STORY.md'),'utf8'),/# 03 · Nested title/);
      assert.ok(spec.includes('03_story_story00/STORY.md')); assert.ok(spec.includes('m07/03/ADR-001')); assert.ok(spec.includes('and 07/03'));
      assert.match(await readFile(path.join(sibling,'STORY.md'),'utf8'),/number: 01/);
      await mkdir(path.join(work,'archive'),{recursive:true});
      await writeMilestoneItem(path.join(work,'archive'),'09');
      await assert.rejects(planRenumber(work,{ref:'07',to:'09'}),{code:'renumber-target-occupied'});
      await assert.rejects(planRenumber(work,{ref:'09',to:'10'}),{code:'renumber-not-live'});
    });
  }},
  {name:'182/00 lock refusal precedes writes; dry-run has no effects; exact remap reaches stream.reindexed',async run(){
    const engine=await import('../../../packages/work/src/renumber.mjs');
    const {createStreamTransitions}=await import('../../../packages/work/src/stream-transitions.mjs');
    await withWork(async work=>{
      const original=await writeMilestoneItem(work,'175');
      let held=true,events=0,locks=0;
      const seam=createStreamTransitions({...engine,resolveWorkspaceId:()=> 'fixture',lockContextFor:()=>({}),
        guardItemLock:async refs=>{locks++;assert.ok(refs.includes('175')&&refs.includes('181')); if(held)throw Object.assign(new Error('held'),{code:'item-locked'});},
        applicableReactors:async()=>[],openEffectsJournal:async()=>null,reportDegrade:()=>{},
        runEffectsEphemeral:async(name,payload)=>{events++;assert.equal(name,'stream.reindexed');assert.deepEqual(payload.remap,[{from:'175',to:'181'}]);return [];}});
      const workspace={workDir:work,projectRoot:path.dirname(work)};
      const preview=await seam.transitionStreamRenumbered(workspace,{ref:'175',to:'181',dryRun:true});
      assert.equal(preview.moved,false);assert.equal(locks,0);assert.equal(events,0);
      await assert.rejects(seam.transitionStreamRenumbered(workspace,{ref:'175',to:'181'}),{code:'item-locked'});
      assert.ok(await readFile(path.join(original,'SPEC.md'),'utf8'));
      held=false;
      const applied=await seam.transitionStreamRenumbered(workspace,{ref:'175',to:'181'});
      assert.equal(applied.moved,true);assert.equal(events,1);
    });
  }},
  {name:'182/01 full memory refresh recalls the moved lesson; original recall still accounts to it',async run(){
    const {defaultApplication}=await import('aof/default-application');
    const {withInsertFixture}=await import('../../support/work-insert-fixture.mjs');
    const {accountMemory}=await import('../../../packages/work/src/memory-accounting.mjs');
    await withInsertFixture(async fx=>{
      const item=await writeMilestoneItem(fx.workDir,'175',{status:'done'});
      await writeFile(path.join(item,'RETROSPECTIVE.md'),'# Retro\n\n## R1 — Unique renumber lesson\n\n**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer\n\nPreserve identity through a renumber.\n');
      const raw=JSON.stringify({kind:'recall',id:'historical',at:'2026-01-01T00:00:00Z',edge:'refine.architect',actor:'architect',query:'Unique renumber lesson',scope:{},records:[{item:'175',id:'R1',recordType:'lesson',verdict:'honoured'}]})+'\n';
      await writeFile(path.join(item,'FEEDBACK.ndjson'),raw);
      const ctx={workspace:fx.workspace};
      await defaultApplication.invoke('work:memory',{verb:'ingest',only:null},ctx);
      const result=await defaultApplication.invoke('work:renumber',{ref:'175',to:'181'},ctx);
      assert.equal(result.moved,true);assert.equal(result.memory.ok,true,JSON.stringify(result.memory));
      assert.ok(!JSON.stringify(result.memory).includes('"records"'), 'the CLI returns the ingestion summary, not the whole corpus');
      assert.ok(result.effects.every(effect=>effect.status!=='failed'),JSON.stringify(result.effects));
      const index=JSON.parse(await readFile(path.join(fx.repo,'.aof','aof.memory.index.json'),'utf8'));
      assert.ok(index.records.some(record=>record.item==='181'&&record.id==='R1'));
      assert.ok(!index.records.some(record=>record.item==='175'));
      assert.equal(await readFile(path.join(result.destination,'FEEDBACK.ndjson'),'utf8'),raw);
      const accounting=await accountMemory(fx.workDir,{indexed:index.records,lessons:true});
      assert.equal(accounting.lessons['181/R1'].honoured,1);
      assert.equal(accounting.lessons['181/R1'].provenance,'indexed');
    },{memory:{backend:'local'}});
  }},
  {name:'182/01 memory failure reports the completed move and recovery, never a false refusal',async run(){
    const {createRenumberCommand}=await import('../../../packages/work/src/commands/renumber.mjs');
    const {renumberCommand}=createRenumberCommand({transitionStreamRenumbered:async()=>({from:'175',to:'181',moved:true,rewritten:[],effects:[]}),refreshMemory:async()=>{throw new Error('index unavailable');}});
    const out=await renumberCommand.run({ref:'175',to:'181'},{workspace:{}});
    assert.equal(out.moved,true);assert.equal(out.memory.ok,false);assert.equal(renumberCommand.cli.exit(out),1);
    assert.match(renumberCommand.cli.render(out),/Run aof work memory ingest/);
  }},
  {name:'182/00 stale plans and invalid identity documents refuse before renaming',async run(){
    const {planRenumber,applyRenumber}=await import('../../../packages/work/src/renumber.mjs');
    await withWork(async work=>{
      const item=await writeMilestoneItem(work,'175');
      const plan=await planRenumber(work,{ref:'175',to:'181'});
      await writeFile(path.join(item,'SPEC.md'),'changed');
      await assert.rejects(applyRenumber(plan),{code:'renumber-plan-stale'});
      await assert.rejects(planRenumber(work,{ref:'175',to:'181'}),{code:'renumber-record-unusable'});
      assert.equal(await readFile(path.join(item,'SPEC.md'),'utf8'),'changed');
    });
  }},
);

workRenumberTests.push({name:'182/00 real CLI previews and renumbers a standalone done story',async run(){
  const {withInsertFixture}=await import('../../support/work-insert-fixture.mjs');
  const {spawnCliSync}=await import('../../support/cli-spawn.mjs');
  const {fileURLToPath}=await import('node:url');
  const cli=fileURLToPath(new URL('../../../packages/core/bin/aof.mjs',import.meta.url));
  await withInsertFixture(async fx=>{
    const item=path.join(fx.workDir,'175_story_loop-fixes');await mkdir(item);
    await writeFile(path.join(item,'STORY.md'),'---\ntype: story\nnumber: 175\nslug: loop-fixes\nstatus: done\nschema: 1\n---\n# 175 · Loop fixes\n');
    const run=args=>spawnCliSync(process.execPath,[cli,'work','renumber','175','--to','181',...args,'--json'],{cwd:fx.repo,encoding:'utf8',env:{...process.env,NODE_NO_WARNINGS:'1'}});
    const preview=run(['--dry-run']);assert.equal(preview.status,0,preview.stderr+preview.stdout);assert.equal(JSON.parse(preview.stdout).moved,false);
    assert.ok(await readFile(path.join(item,'STORY.md'),'utf8'));
    const applied=run([]);assert.equal(applied.status,0,applied.stderr+' '+applied.stdout);
    const out=JSON.parse(applied.stdout);assert.equal(out.to,'181');assert.equal(out.memory.ok,true);
    assert.match(await readFile(path.join(out.destination,'STORY.md'),'utf8'),/status: done/);
  },{memory:{backend:'none'}});
}});
workRenumberTests.push({name:'182/01 historical recall follows chained moves but not later reuse of a number',async run(){
  const {remapHistoricalRef}=await import('../../../packages/work/src/ref-history.mjs');
  const history=[{at:'2026-02-01T00:00:00Z',remap:[{from:'175',to:'181'}]},{at:'2026-03-01T00:00:00Z',remap:[{from:'181',to:'190'},{from:'175',to:'182'}]}];
  assert.equal(remapHistoricalRef('175','2026-01-01T00:00:00Z',history),'190');
  assert.equal(remapHistoricalRef('175','2026-02-15T00:00:00Z',history),'182');
  assert.equal(remapHistoricalRef('175','2026-04-01T00:00:00Z',history),'175');
}});

workRenumberTests.push({name:'182/00 an ordinary write failure rolls back documents and folder',async run(){
  const {planRenumber,applyRenumber}=await import('../../../packages/work/src/renumber.mjs');
  await withWork(async work=>{
    const item=await writeMilestoneItem(work,'175'); const before=await readFile(path.join(item,'SPEC.md'),'utf8');
    const plan=await planRenumber(work,{ref:'175',to:'181'}); let fail=true;
    await assert.rejects(applyRenumber(plan,{write:async(file,...args)=>{if(file===plan.historyFile&&fail){fail=false;throw new Error('simulated write failure');}return writeFile(file,...args);}}),/simulated write failure/);
    assert.equal(await readFile(path.join(item,'SPEC.md'),'utf8'),before);
    await assert.rejects(readFile(path.join(plan.destination,'SPEC.md')),{code:'ENOENT'});
    await assert.rejects(readFile(plan.historyFile),{code:'ENOENT'});
  });
}});

workRenumberTests.push({name:'182/01 quoted scalar dependencies rewrite; unsupported block-list dependencies refuse before mutation',async run(){
  const {planRenumber,applyRenumber}=await import('../../../packages/work/src/renumber.mjs');
  await withWork(async work=>{
    const item=await writeMilestoneItem(work,'175');
    const other=await writeMilestoneItem(work,'176',{depends:'"175"'});
    await applyRenumber(await planRenumber(work,{ref:'175',to:'181'}));
    assert.match(await readFile(path.join(other,'SPEC.md'),'utf8'),/depends: "181"/);
    const original=await readFile(path.join(other,'SPEC.md'),'utf8');
    await writeFile(path.join(other,'SPEC.md'),original.replace('depends: "181"','depends:\n  - 181'));
    await assert.rejects(planRenumber(work,{ref:'181',to:'183'}),{code:'renumber-depends-unsupported'});
    assert.ok((await readdir(work)).some(n=>n.startsWith('181_')));
  });
}});
