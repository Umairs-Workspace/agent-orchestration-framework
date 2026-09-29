import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,realpath,rm,readFile} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import test from 'node:test';
import {createMemory} from '@aof/knowledge/memory';
import {createLocalIndexing} from '@aof/knowledge/memory/local-indexing';
import {createLocalBackend} from '@aof/knowledge/memory/local-backend';
import {createGraphBuildCommand} from '@aof/knowledge/commands/graph-build';
import {createKnowledgeContribution,KNOWLEDGE_COMMAND_IDS} from '@aof/knowledge/commands';
import {createImportStore} from '@aof/knowledge/import/store';
import {createImportRecovery} from '@aof/knowledge/import/recovery';
import {createImportMaterializer} from '@aof/knowledge/import/materialize';
import {createImportMilestoneCommand} from '@aof/knowledge/commands/import-milestone';
import {resolveImportSource} from '@aof/knowledge/import/source';

async function scratch(run){
 const parent=await realpath(os.tmpdir()),root=await mkdtemp(path.join(parent,'aof-knowledge-package-'));
 try{await run(root);}finally{assert.equal(path.dirname(await realpath(root)),parent);await rm(root,{recursive:true,force:true});}
}

function importServices() {
 const store=createImportStore({workspacePaths:root=>({workspaceDir:path.join(root,'.aof')})});
 const recovery=createImportRecovery(store);
 const materializer=createImportMaterializer({...store,WORK_ITEM_SCHEMA_VERSION:7,
  renderDigestDocument:({values,sections},{schemaVersion})=>
   `schema: ${schemaVersion}\nsource: ${values.source}\n`+Object.entries(sections).map(([heading,body])=>`## ${heading}\n\n${body}\n`).join('\n')});
 return {...store,...recovery,...materializer};
}

test('import source resolution keeps remote previews offline and recovers a local milestone',()=>scratch(async root=>{
 const api=importServices(),dir=path.join(root,'03_milestone_fixture');await mkdir(dir);
 const spec='# 03 Fixture\n\n## Objective\n\nRecover this intent.\n\n## Scope\n\nOnly this folder.\n';
 await writeFile(path.join(dir,'SPEC.md'),spec);
 assert.equal(resolveImportSource({repo:dir}).sourceDir,dir);
 assert.deepEqual(resolveImportSource({repo:'https://example.invalid/source',dryRun:true}),{sourceDir:null,remote:true,dryRun:true});
 const candidates=await api.listRecoverableMilestones(dir);assert.equal(candidates.length,1);
 assert.equal(api.resolveCandidate(candidates,'03').dir,dir);
 assert.equal(api.resolveCandidate(candidates,'missing'),null);
 const recovered=await api.recoverMilestone(dir,'03');assert.equal(recovered.intent.objective,'Recover this intent.');
 assert.equal(await readFile(path.join(dir,'SPEC.md'),'utf8'),spec);
}));

test('import materialization previews without writes and replaces only its derived snapshot',()=>scratch(async root=>{
 const api=importServices();const input={projectRoot:root,sourceSlug:'Foreign Source',milestoneRef:'03',recovered:{intent:{objective:'Fixture intent',scope:'Fixture scope'},decisions:[],outcomes:[]}};
 const preview=await api.materializeImport(input,{preview:true});
 assert.equal(preview.dir,path.join(root,'.aof','imports','foreign-source','import-03'));
 await assert.rejects(readFile(preview.artifacts[0]),{code:'ENOENT'});
 const written=await api.materializeImport(input);assert.deepEqual(written,preview);
 const bytes=await Promise.all(written.artifacts.map(file=>readFile(file,'utf8')));
 await writeFile(path.join(written.dir,'stale.md'),'old snapshot');
 await api.materializeImport(input);await assert.rejects(readFile(path.join(written.dir,'stale.md')),{code:'ENOENT'});
 assert.deepEqual(await Promise.all(written.artifacts.map(file=>readFile(file,'utf8'))),bytes);
 assert.equal(await api.ensureImportStoreGitignore(root),false);
}));

test('import command writes a colocated digest only on execution and reindexes through its supplied backend',()=>scratch(async root=>{
 const api=importServices(),source=path.join(root,'03_milestone_fixture');await mkdir(source);
 const spec='# 03 Fixture\n\n## Objective\n\nRecall this capability.\n\n## Scope\n\nOne fixture.\n';await writeFile(path.join(source,'SPEC.md'),spec);
 const calls=[];const {importMilestoneCommand}=createImportMilestoneCommand({...api,resolveConfiguredBackend:async config=>{calls.push(config);return {reindex:async(ref,ctx)=>calls.push({ref,ctx})};}});
 const workspace={projectRoot:root,workDir:root,config:{memory:{backend:'local'}}};
 const preview=await importMilestoneCommand.run({repo:source,dryRun:true},{workspace});
 assert.equal(preview.imported,false);assert.deepEqual(calls,[]);await assert.rejects(readFile(path.join(source,'AOF.md')),{code:'ENOENT'});
 const result=await importMilestoneCommand.run({repo:source,importedAt:'2026-01-01'},{workspace});
 assert.equal(result.imported,true);assert.equal(result.dir,source);assert.equal(result.recordCount,2);
 assert.match(await readFile(path.join(source,'AOF.md'),'utf8'),/schema: 7/);
 assert.equal(await readFile(path.join(source,'SPEC.md'),'utf8'),spec);assert.equal(calls.length,2);assert.equal(calls[1].ctx.workDir,root);
 await assert.rejects(importMilestoneCommand.run({repo:source,selector:'missing'},{workspace}),{code:'no-milestone-match'});
 assert.equal(createKnowledgeContribution([importMilestoneCommand]).commands[0],importMilestoneCommand);
}));

test('memory loads only the selected backend and help never loads one',async()=>{
 const calls=[];const backend={name:'local',recall:async()=>({query:'fixture',scope:{},records:[],text:''})};
 const api=createMemory({loadLocalBackend:async()=>{calls.push('local');return backend;},loadGraphifyBackend:async()=>{calls.push('graphify');throw Error('unexpected backend');}});
 assert.deepEqual(calls,[]);
 assert.equal(await api.runMemoryVerb({verb:'reindex',help:true},{config:{memory:{backend:'graphify'}}}),api.memoryUsage());
 assert.deepEqual(calls,[]);
 assert.equal((await api.resolveConfiguredBackend({})).name,'none');
 const result=await api.runMemoryVerb({verb:'recall',query:'fixture'},{config:{memory:{backend:'local'}}});
 assert.deepEqual(result.records,[]);assert.deepEqual(calls,['local']);
 await assert.rejects(api.runMemoryVerb({verb:'unknown'},{config:{memory:{backend:'graphify'}}}));
 assert.deepEqual(calls,['local']);
});

test('local indexing and retrieval compose through supplied work services and persist a derived index',()=>scratch(async root=>{
 const workDir=path.join(root,'work'),dir=path.join(workDir,'01_milestone_fixture');await mkdir(dir,{recursive:true});
 await writeFile(path.join(dir,'ARCHITECTURE.md'),'# Architecture\n\n## ADR-001 — Preserve the boundary\n\nStatus: Accepted\n\n### Decision\n\nKeep knowledge indexing independent of command routing.\n');
 const seen=[];
 const api=createLocalIndexing({listItemsCacheFirst:async workspace=>{seen.push(workspace);return [];},localItemsOnly:()=>({items:[{type:'milestone',parent:null,ref:'01',number:'01',slug:'fixture',dir}],skipped:[]}),reportReachThroughSkips:()=>{},ensureAofGitignore:async value=>{assert.equal(value,root);},importStoreRoot:()=>path.join(root,'imports'),ARCHITECTURE_FILE:'ARCHITECTURE.md',RETROSPECTIVE_FILE:'RETROSPECTIVE.md',AOF_FILE:'AOF.md'});
 const backend=createLocalBackend(api).default;const ctx={workDir,projectRoot:root};
 assert.equal((await backend.status(ctx)).recordCount,0);
 const indexed=await backend.reindex('01',ctx);assert.ok(indexed.recordCount>0);
 const recalled=await backend.recall('knowledge',{}, {},ctx);assert.equal(recalled.records.length,indexed.recordCount);
 assert.equal(recalled.records[0].item,'01');assert.equal(seen.length,1);
 const persisted=JSON.parse(await readFile(api.memoryIndexPath(root),'utf8'));assert.equal(persisted.backend,'local');assert.equal(persisted.records.length,indexed.recordCount);
}));

test('graph build refuses prohibited egress before resolving or spawning a binary',async()=>{
 const calls=[];const {graphBuildCommand}=createGraphBuildCommand({resolveGraphifyBinary:()=>{calls.push('resolve');throw Error('unexpected resolution');}});
 assert.deepEqual(calls,[]);
 await assert.rejects(graphBuildCommand.run({path:'.',offline:true,backend:'openai'},{workspace:{projectRoot:'/fixture'}}),{code:'offline-backend-conflict'});
 assert.deepEqual(calls,[]);
});

test('knowledge owns its graph and shared work namespace contributions without altering descriptors',()=>{
 const commands=KNOWLEDGE_COMMAND_IDS.map(id=>({id,run:async()=>id}));
 const contribution=createKnowledgeContribution(commands);assert.equal(contribution.name,'@aof/knowledge');
 assert.deepEqual(contribution.commands,commands);assert.notEqual(contribution.commands,commands);
 for(let i=0;i<commands.length;i++)assert.equal(contribution.commands[i],commands[i]);
 assert.ok(Object.isFrozen(contribution.commands));assert.equal(createKnowledgeContribution([commands.at(-1)]).commands[0].id,'import:milestone');
 for(const value of [[],null,[{id:'work:continue',run(){}}],[{id:'graph:build'}]])assert.throws(()=>createKnowledgeContribution(value),TypeError);
});
