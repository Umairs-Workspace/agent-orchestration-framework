import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,writeFile,realpath,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {PassThrough} from 'node:stream';import {EventEmitter} from 'node:events';
import {createSetupServer} from '@aof/server/setup-ui';
import {createBoardApi} from '@aof/server/board-ui';
import {createBoardServer} from '@aof/server/board-serve';
import {createGraphMcpServer} from '@aof/server/graph-mcp-server';
import {createTerminalWebSocket} from '@aof/server/terminal-ws';
import {safeStaticPath,shouldServeAppShell} from '@aof/server/static-serve';

async function scratch(run){
 const parent=await realpath(os.tmpdir()),root=await mkdtemp(path.join(parent,'aof-server-package-'));
 try{await run(root);}finally{assert.equal(path.dirname(await realpath(root)),parent);await rm(root,{recursive:true,force:true});}
}

test('HTTP composition shares one origin for command routes, config and static assets',()=>scratch(async root=>{
 await writeFile(path.join(root,'index.html'),'<h1>Fixture shell</h1>');
 const calls=[];const workspace={projectRoot:root,config:{}};
 const api=createBoardApi({loadWorkspace:async()=>workspace,resolveCacheStalenessSeconds:()=>30,invoke:async(id,input,ctx)=>{calls.push({id,input,ctx});return [];}});
 let attached;
 const {serveSetupUi}=createSetupServer({...api,supportedResourceKinds:()=>['skill'],supportedRuntimes:()=>['claude','codex'],loadEditableConfig:async()=>({fixture:true}),attachTerminalWebSocket:(server,options)=>{attached={server,options};}});
 assert.deepEqual(calls,[]);assert.equal(attached,undefined);
 const {server,url}=await serveSetupUi(null,{port:0,projectDir:root,uiRoot:root});
 try{
  assert.equal(attached.server,server);assert.equal(attached.options.projectDir,root);
  const list=await fetch(new URL('/api/work/list?includeArchived=1',url));assert.equal(list.status,200);assert.deepEqual((await list.json()).items,[]);
  assert.equal(calls[0].id,'work:list');assert.deepEqual(calls[0].input,{mesh:true,all:true});assert.equal(calls[0].ctx.workspace,workspace);
  assert.deepEqual(await (await fetch(new URL('/api/config',url))).json(),{fixture:true});
  assert.match(await (await fetch(new URL('/board',url))).text(),/Fixture shell/);
  assert.equal((await fetch(new URL('/missing.js',url))).status,404);
  assert.equal((await fetch(new URL('/api/unknown',url))).status,404);
 }finally{server.closeAllConnections();await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
 assert.equal(safeStaticPath(root,'/%2e%2e/private'),null);assert.equal(safeStaticPath(root,'/%zz'),null);assert.equal(shouldServeAppShell('/missing.js'),false);
}));

test('board probe does not launch or trust a workspace and launch forwards the supplied origin',()=>scratch(async root=>{
 const dist=path.join(root,'apps','ui','dist');await mkdir(dist,{recursive:true});await writeFile(path.join(dist,'index.html'),'fixture');
 const calls=[],trust=()=>{};const api=createBoardServer({assetPath:()=>dist,ensureWorktreeTrusted:trust,serveSetupUi:async(catalog,options)=>{calls.push({catalog,options});return {server:'fixture',url:'http://127.0.0.1:4321/'};}});
 assert.equal(api.boardUiProbe({projectDir:root,repoRoot:root}).uiBuildPresent,true);assert.deepEqual(calls,[]);
 const fleetOrigin={origin:'http://127.0.0.1:4567',source:'launcher'};
 assert.equal((await api.serveBoard({projectDir:root,repoRoot:root,fleetOrigin})).boardUrl,'http://127.0.0.1:4321/board');
 assert.equal(calls[0].options.trustCwd,trust);assert.equal(calls[0].options.fleetOrigin,fleetOrigin);
}));

test('MCP uses supplied command schemas and survives malformed framing and command errors',async()=>{
 const calls=[],schema={type:'object',properties:{query:{type:'string'}}};
 const api=createGraphMcpServer({getCommand:()=>({input:schema}),invoke:async(id,args,ctx)=>{calls.push({id,args,ctx});throw Object.assign(Error('fixture refusal'),{code:'fixture-refusal'});}});
 assert.equal(api.mcpServeProbe().tools[1].inputSchema,schema);assert.deepEqual(calls,[]);
 const input=new PassThrough(),output=new PassThrough(),chunks=[];output.on('data',chunk=>chunks.push(chunk.toString()));
 const ctx={workspace:{fixture:true}},serving=api.serveStdio(ctx,{input,output});
 input.write('{broken}\n');input.write('{"id":1,"method":"tools/');
 input.end('call","params":{"name":"graph_query","arguments":{"query":"fixture"}}}\n{"id":2,"method":"ping"}\n');await serving;
 const replies=chunks.join('').trim().split('\n').map(line=>JSON.parse(line));
 assert.equal(replies.length,3);assert.equal(replies[0].error.code,-32700);
 assert.equal(replies.find(reply=>reply.id===1).result.isError,true);assert.deepEqual(replies.find(reply=>reply.id===2).result,{});
 assert.deepEqual(calls,[{id:'graph:query',args:{query:'fixture'},ctx}]);
});

test('terminal connection gate bounds early input and tears down closed sessions without loading a native PTY',()=>{
 const reports=[],api=createTerminalWebSocket({isPackaged:()=>false,reportDegrade:(...args)=>reports.push(args)});
 const ws=new EventEmitter(),gate=api.createConnectionGate(ws),received=[];let closed=0;
 for(let i=0;i<api.MAX_PRESESSION_FRAMES+2;i++)ws.emit('message',String(i),false);
 gate.open(data=>received.push(data));assert.equal(received.length,api.MAX_PRESESSION_FRAMES);assert.equal(received[0],'2');
 assert.equal(reports[0][0],api.PRESESSION_OVERFLOW_CODE);
 gate.onClose(()=>closed++);ws.emit('close');assert.equal(gate.closed,true);assert.equal(closed,1);
 gate.onClose(()=>closed++);assert.equal(closed,2);
 ws.emit('error',Error('fixture socket fault'));assert.equal(reports.at(-1)[0],api.SOCKET_ERROR_CODE);
});
