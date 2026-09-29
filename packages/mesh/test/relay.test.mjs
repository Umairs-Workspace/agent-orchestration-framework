import assert from 'node:assert/strict';import test from 'node:test';import {once} from 'node:events';import {WebSocket} from 'ws';
import {assignmentDirectiveResolution,assignmentDirectiveLaunch} from '@aof/mesh/assignment-directive';
import {buildSessionSpawnAckEnvelope} from '@aof/mesh/session-spawn-directive';
import {createSpawnOutcomeRegistry,MAX_SPAWN_OUTCOMES,SPAWN_OUTCOME_RETENTION_MS} from '@aof/mesh/session-spawn-outcome';
import {startPresenceLoop,resolvePresenceCadenceSeconds} from '@aof/mesh/presence-loop';
import {resolveSyncCadenceSeconds} from '@aof/mesh/sync-cadence';
import {createMeshRelay} from '@aof/mesh/relay';
import {createMeshRelayClient} from '@aof/mesh/relay-client';
import {createTerminalRelayBridge} from '@aof/mesh/terminal-relay-bridge';
import {createTerminalInput} from '@aof/mesh/terminal-input';
import {createTerminalMirroring} from '@aof/mesh/terminal-mirror';

test('assignment directives use the shared loop scope and cadence starts only through the supplied ticker',()=>{
 assert.deepEqual(assignmentDirectiveLaunch(assignmentDirectiveResolution('autonomous','42')),{kind:'loop',scope:'42'});
 assert.equal(assignmentDirectiveResolution('autonomous','not-a-scope').refused,true);
 assert.equal(assignmentDirectiveResolution('continue','42/01').command,'/aof:continue 42/01');
 const calls=[];let tick;const handle=startPresenceLoop({publishOnce:()=>calls.push('publish'),cadenceSeconds:resolvePresenceCadenceSeconds(7),ticker:{start:(seconds,callback)=>{calls.push(seconds);tick=callback;return 'fixture';},stop:value=>calls.push(value)}});
 assert.deepEqual(calls,[7]);tick();handle.stop();assert.deepEqual(calls,[7,'publish','fixture']);assert.equal(resolveSyncCadenceSeconds(23),23);
});

test('spawn outcomes remain tuple-scoped, bounded and expire without a timer',()=>{
 let now=1000;const registry=createSpawnOutcomeRegistry({now:()=>now});
 for(let i=0;i<=MAX_SPAWN_OUTCOMES;i++)assert.equal(registry.apply(buildSessionSpawnAckEnvelope('node',{sessionId:String(i),ok:true})),true);
 assert.equal(registry.read('node','0'),null);assert.equal(registry.read('other','1'),null);assert.equal(registry.read('node','1').ok,true);
 now+=SPAWN_OUTCOME_RETENTION_MS+1;assert.equal(registry.read('node','1'),null);
});

test('terminal frames retain tuple isolation, recent tail replay and explicit end markers',()=>{
 const bridge=createTerminalRelayBridge({reportDegrade:()=>{}});
 const relay=createMeshRelay({reportDegrade:()=>{}});
 const {createTerminalMirror}=createTerminalMirroring({...bridge,...relay,reportDegrade:()=>{}});
 const mirror=createTerminalMirror(),received=[],other=[];
 mirror.apply(bridge.buildTerminalFrameEnvelope('node','session','prior'));
 const stop=mirror.subscribe('node','session',(...args)=>received.push(args)),stopOther=mirror.subscribe('node','other',(...args)=>other.push(args));
 assert.equal(received[0][0],'prior');mirror.apply(bridge.buildTerminalFrameEnvelope('node','session','next'));
 mirror.apply(bridge.buildTerminalEndEnvelope('node','session'));assert.equal(received[1][0],'next');assert.equal(received.at(-1)[1].end,true);assert.deepEqual(other,[]);
 stop();stopOther();assert.equal(mirror.size,0);
});

test('terminal input routes through the supplied stream and reports disconnected targets once',()=>{
 const bridge=createTerminalRelayBridge({reportDegrade:()=>{}}),calls=[],logs=[];
 let sent=true;const {createTerminalInputRouter}=createTerminalInput({...bridge,reportDegrade:()=>{}});
 const router=createTerminalInputRouter({dispatchDirective:frame=>{calls.push(frame);return {sent};},onLog:entry=>logs.push(entry)});
 const envelope=bridge.buildTerminalInputEnvelope('node','session','typed bytes');assert.equal(router.apply(envelope),true);assert.equal(calls[0].bytes,'typed bytes');assert.equal(calls[0].to,'node');
 sent=false;assert.equal(router.apply(envelope),false);assert.equal(router.apply(envelope),false);assert.equal(logs.filter(entry=>entry.code==='terminal-input-target-not-connected').length,1);
});

test('relay checks fresh group admission before joining and forwards opaque envelopes', {timeout:10_000}, async()=>{
 let revoked=false,reads=0;const sockets=[];
 const api=createMeshRelay({reportDegrade:()=>{},isControlNode:()=>true,readRegistry:async()=>{reads++;return {revoked};},verifyCredential:(registry,token)=>({ok:token==='fixture-token'&&!registry.revoked})});
 const config={mesh:{nodeId:'control',relay:{controlNode:'control'}}};assert.equal(reads,0);
 const relay=await api.serveRelay({config,isGroupConnection:()=>true});
 const connect=()=>new Promise((resolve,reject)=>{
  const ws=new WebSocket(relay.url,{headers:{Authorization:'Bearer fixture-token'}});sockets.push(ws);
  ws.on('error',reject);ws.once('message',data=>{assert.equal(JSON.parse(data.toString()).type,'joined');resolve(ws);});
 });
 try{
  const sender=await connect(),receiver=await connect();assert.equal(reads,2);
  const {relayEnvelope}=createMeshRelayClient({reportDegrade:()=>{}}),wire=JSON.stringify(relayEnvelope('node',{opaque:['unchanged',42]}));
  const frame=once(receiver,'message');sender.send(wire);assert.equal((await frame)[0].toString(),wire);
  revoked=true;await assert.rejects(connect());assert.equal(reads,3);
 }finally{for(const ws of sockets)ws.terminate();await relay.stop();}
});
