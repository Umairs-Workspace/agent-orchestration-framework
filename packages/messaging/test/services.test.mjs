import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import { createMessagingSecrets } from '@aof/messaging/secret';
import { createAskMessages } from '@aof/messaging/ask-messages';
import { createNotifier } from '@aof/messaging/notify';
import { createMessagingCommands } from '@aof/messaging/commands';
import { createDiscordGateway } from '@aof/messaging/gateway';
import { createDiscordCommands } from '@aof/messaging/discord-commands';
import { createDiscordReplies } from '@aof/messaging/replies';
import { createDiscordBot } from '@aof/messaging/bot';

async function scratch(run) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-messaging-package-'));
  try { await run(root); } finally {
    assert.equal(path.dirname(await realpath(root)), parent);
    await rm(root, {recursive:true, force:true});
  }
}
const unreachable = () => { throw new Error('construction must not call an application service'); };
const channel = '123456789012345678';
const messageId = '223456789012345678';
const token = Buffer.from(channel).toString('base64url') + '.synthetic.testcredential';

test('messaging factories and CLI registration are inert and expose all five owned commands', () => {
  const notifier = createNotifier({reportDegrade:unreachable, resolveWorkspaceId:unreachable, recordAskMessage:unreachable, readMessagingSecret:unreachable});
  const commands = createMessagingCommands({...notifier, readConfig:unreachable, writeConfig:unreachable, messagingSecretPath:unreachable, messagingSecretPresent:unreachable, writeMessagingSecret:unreachable});
  assert.deepEqual(commands.messagingContribution.commands.map(c=>c.id), ['messaging:init','messaging:enable','messaging:disable','messaging:status','messaging:test']);
  assert.equal(commands.messagingContribution.name, '@aof/messaging');
  assert.ok(Object.isFrozen(commands.messagingContribution.commands));
  assert.equal(commands.messagingContribution.commands[0], commands.messagingInitCommand);
  assert.equal(typeof createDiscordGateway({reportDegrade:unreachable}).startGateway, 'function');
  assert.equal(typeof createDiscordCommands({}).handleInteraction, 'function');
  assert.equal(typeof createDiscordReplies({}).handleReply, 'function');
  assert.equal(typeof createDiscordBot({}).startDiscordBot, 'function');
});

test('messaging secrets and reply records use the supplied home and preserve their persisted contracts', () => scratch(async root => {
  const secrets = createMessagingSecrets({defaultGlobalWorkspaceDir:()=>root});
  const asks = createAskMessages(secrets);
  assert.equal(await secrets.readMessagingSecret('discord'), null);
  await secrets.writeMessagingSecret('discord', token);
  assert.equal(await secrets.readMessagingSecret('discord'), token);
  assert.equal(await readFile(path.join(root,'messaging','discord.secret'),'utf8'), token+'\n');
  assert.throws(()=>secrets.messagingSecretPath('../escape'), {code:'messaging-unknown-channel'});
  const record = await asks.recordAskMessage({messageId, channelId:channel, event:'session-needs-input',ref:'42',workspaceId:'fixture',projectRoot:root}, {now:()=>new Date('2026-01-01T00:00:00Z')});
  assert.deepEqual(await asks.readAskMessage(messageId),record);
  assert.deepEqual(await asks.findAskMessage({workspaceId:'fixture',ref:'42'}),record);
  assert.equal(await asks.readAskMessage('../escape'),null);
}));

test('notifier delivers through injected transport and records reply routing using supplied identity', async () => {
  const reads=[], records=[], requests=[];
  const api=createNotifier({reportDegrade:unreachable,resolveWorkspaceId:()=> 'supplied-id',readMessagingSecret:async type=>{reads.push(type);return token;},recordAskMessage:async record=>{records.push(record);}});
  const config={work:{notify:{channels:{discord:{type:'discord',channelId:channel,allow:['323456789012345678']}}}}};
  const envelope=api.buildNotifyEnvelope('session-needs-input',{ref:'42',question:'Continue?',phase:'build'},{config});
  const fetch=async (...args)=>{requests.push(args);return new Response(JSON.stringify({id:messageId}),{status:200,headers:{'content-type':'application/json'}});};
  assert.deepEqual(await api.notify({config:{},projectRoot:'/fixture'},envelope,{env:{},fetch}),{delivered:[],failed:[],messages:[]});
  const result=await api.notify({config,projectRoot:'/fixture'},envelope,{env:{},fetch});
  assert.deepEqual(result.delivered,['discord']);
  assert.equal(requests.length,1);
  assert.deepEqual(reads,['discord']);
  assert.equal(records[0].workspaceId,'supplied-id');
  assert.equal(records[0].messageId,messageId);
  assert.ok(!JSON.stringify(result).includes(token));
});

test('messaging commands edit only notify configuration through the supplied config service', () => scratch(async root => {
  const configPath=path.join(root,'.aof','aof.config.json');
  await mkdir(path.dirname(configPath));await writeFile(configPath,'{}');
  const config={name:'fixture',work:{untouched:true}},writes=[];
  const notifier=createNotifier({});
  const commands=createMessagingCommands({...notifier,readConfig:async target=>{assert.equal(target,root);return {configPath,config};},writeConfig:async (file,value)=>{assert.equal(file,configPath);writes.push(structuredClone(value));},messagingSecretPresent:async()=>false});
  await commands.messagingEnableCommand.run({type:'discord',targetDir:root,channelId:channel});
  assert.equal(writes.length,1);
  assert.equal(writes[0].name,'fixture');assert.equal(writes[0].work.untouched,true);
  assert.deepEqual(writes[0].work.notify.channels.discord,{type:'discord',channelId:channel});
  await commands.messagingEnableCommand.run({type:'discord',targetDir:root,channelId:channel});
  assert.equal(writes.length,1,'enabling the same channel is idempotent');
  await commands.messagingDisableCommand.run({type:'discord',targetDir:root});
  assert.equal(writes.length,2);assert.equal(writes[1].work.untouched,true);
}));
