import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,realpath,rm,readFile} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import test from 'node:test';
import {createMemory} from '@aof/knowledge/memory';
import {createLocalIndexing} from '@aof/knowledge/memory/local-indexing';
import {createLocalBackend} from '@aof/knowledge/memory/local-backend';
import {createGraphBuildCommand} from '@aof/knowledge/commands/graph-build';
import {createKnowledgeContribution,KNOWLEDGE_COMMAND_IDS} from '@aof/knowledge/commands';

async function scratch(run){
 const parent=await realpath(os.tmpdir()),root=await mkdtemp(path.join(parent,'aof-knowledge-package-'));
 try{await run(root);}finally{assert.equal(path.dirname(await realpath(root)),parent);await rm(root,{recursive:true,force:true});}
}

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
 assert.ok(Object.isFrozen(contribution.commands));assert.equal(createKnowledgeContribution([commands.at(-1)]).commands[0].id,'work:memory');
 for(const value of [[],null,[{id:'work:continue',run(){}}],[{id:'graph:build'}]])assert.throws(()=>createKnowledgeContribution(value),TypeError);
});
