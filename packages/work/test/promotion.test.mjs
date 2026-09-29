import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,readFile,writeFile,rm,realpath} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createPromoteFindingCommand} from '@aof/work/commands/promote-finding-to-chore';
import {createPromoteGapCommand} from '@aof/work/commands/promote-gap-to-chore';

test('promotion commands use supplied insertion/cache services and preserve idempotent seeding', async()=>{
 const parent=await realpath(os.tmpdir()),root=await mkdtemp(path.join(parent,'aof-promotion-package-'));
 try {
  const calls=[],reads=[];
  const ctx={workspace:{workDir:root},globalWorkStoreOptions:{fixture:true}};
  const runInsertTopLevel=async(context,input)=>{
   calls.push(input);assert.equal(context,ctx);
   const ref=String(input.at).padStart(2,'0'),dir=path.join(root,`${ref}_chore_${input.slug}`);
   await mkdir(dir);await writeFile(path.join(dir,'CHORE.md'),`---\ntype: chore\nnumber: ${ref}\nslug: ${input.slug}\nstatus: not-started\n---\n# Chore\n\n## Definition of Done\n\n- [ ] Placeholder\n\n## Notes\n\n`);
   return {created:{ref,dir},shifted:0};
  };
  const finding=createPromoteFindingCommand({runInsertTopLevel,listItemsCacheFirst:async(workspace,options)=>{reads.push({workspace,options});return [{ref:'08',type:'milestone'}];}});
  const gap=createPromoteGapCommand({runInsertTopLevel,INSERT_FLAGS:{}});
  assert.equal(calls.length,0);assert.equal(reads.length,0,'registration is inert');
  const input={ref:'08',round:'r1',finding:{title:'Fix cache',remedy:'Read current state',location:'src/cache.mjs'}};
  const first=await finding.runPromoteFindingToChore(ctx,input);
  assert.equal(first.promoted,true);assert.equal(calls[0].type,'chore');assert.equal(calls[0].at,0);
  const seeded=await readFile(path.join(first.chore.dir,'CHORE.md'),'utf8');
  assert.match(seeded,/- \[ \] Read current state/);assert.match(seeded,/finding:08:fix cache/);
  assert.equal((await finding.runPromoteFindingToChore(ctx,input)).promoted,false);
  assert.equal(calls.length,1,'a repeated finding does not insert again');
  assert.equal(reads[0].workspace,ctx.workspace);assert.deepEqual(reads[0].options.globalWorkStoreOptions,{fixture:true});
  const result=await gap.runPromoteGapToChore(ctx,{gap:{title:'Close gap',dischargeCondition:'Gap closed'},at:4});
  assert.equal(result.promoted,true);assert.equal(calls[1].at,4,'the operator-selected gap position reaches insertion');
  assert.match(await readFile(path.join(result.chore.dir,'CHORE.md'),'utf8'),/- \[ \] Gap closed/);
 } finally {assert.equal(path.dirname(await realpath(root)),parent);await rm(root,{recursive:true,force:true});}
});
