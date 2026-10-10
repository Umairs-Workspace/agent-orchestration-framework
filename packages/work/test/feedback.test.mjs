import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,readdir,realpath,rm,utimes} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {appendRawFeedback,appendRecallObservation,recordFeedbackClassification,readFeedbackRecords,feedbackRecordPath} from '@aof/work/feedback-records';
import {createDocumentTransitions} from '@aof/work/doc-transitions';
import {createFeedbackCommand,createRecallRecorder} from '@aof/work/commands/feedback';
import {createCountersCommand} from '@aof/work/commands/counters';
import {createRatchetCommand} from '@aof/work/commands/ratchet';

async function fixture(run){
  const parent=await realpath(os.tmpdir()),root=await mkdtemp(path.join(parent,'aof-feedback-package-'));
  try{await run(root);}finally{assert.equal(path.dirname(await realpath(root)),parent);await rm(root,{recursive:true,force:true});}
}

test('feedback records append classification after verbatim raw capture and refuse duplicate writes',()=>fixture(async dir=>{
  const item={dir},raw={id:'raw-1',text:'  verbatim\nfeedback  ',actor:'fixture',refs:'01',at:'2026-09-29T12:00:00Z'};
  await appendRawFeedback(item,raw);const before=await readFile(feedbackRecordPath(item),'utf8');
  await assert.rejects(appendRawFeedback(item,raw),{code:'feedback-id-conflict'});assert.equal(await readFile(feedbackRecordPath(item),'utf8'),before);
  await recordFeedbackClassification(item,{id:'triage-1',raw:'raw-1',at:raw.at,classification:{kind:'bug'}});
  const after=await readFile(feedbackRecordPath(item),'utf8');assert.ok(after.startsWith(before));
  const records=await readFeedbackRecords(item);assert.equal(records[0].text,raw.text);assert.equal(records[1].raw,'raw-1');
}));

test('feedback factory refuses classification before resolution and hands raw text to the transition',async()=>{
  const calls=[],item={ref:'01',type:'milestone',dir:'fixture'};
  const {feedbackCommand}=createFeedbackCommand({resolveItemExact:async()=>{calls.push('resolve');return item;},requireLocalCheckout:()=>{},transitionFeedbackAppended:async(...args)=>{calls.push(args);return {effects:[]};},threadPropagationWarnings:(value)=>value});
  const ctx={workspace:{},now:()=> '2026-09-29T12:00:00Z',feedbackId:()=> 'fixture-id'};
  await assert.rejects(feedbackCommand.run({ref:'01',note:'text',severity:'high'},ctx),{code:'feedback-classification-deferred'});assert.deepEqual(calls,[]);
  const result=await feedbackCommand.run({ref:'01',note:'  raw text  ',actor:' writer '},ctx);
  assert.equal(result.bullet,'- raw text — Raised by: writer');assert.equal(calls[1][1].raw.text,'  raw text  ');assert.equal(calls[1][0],item);
});

test('counter observation reads package records and supplied run history',()=>fixture(async workDir=>{
  const dir=path.join(workDir,'01_chore_counter');await mkdir(dir);await writeFile(path.join(dir,'CHORE.md'),'---\nstatus: done\nupdated: 2026-09-29T12:00:00Z\n---\n');
  const calls=[];const {observeCounters}=createCountersCommand({readRuns:async item=>{calls.push(item.ref);return [{runId:'fixture'}];}});
  const observations=await observeCounters({workDir},{ref:'01',parent:null});
  assert.deepEqual(calls,['01']);assert.equal(observations[0].status,'done');assert.deepEqual(observations[0].feedbackRecords,[]);assert.equal(observations[0].runs[0].runId,'fixture');
}));

test('ratchet supplies bounded Git argv through its process port and reports an unresolved base',async()=>{
  const calls=[];const {resolveRatchetBase}=createRatchetCommand({execFileAsync:async(...args)=>{calls.push(args);return {stdout:'a'.repeat(40)+'\n'};}});
  assert.deepEqual(await resolveRatchetBase({projectRoot:'fixture',recordPath:'item/STORY.md',suppliedBase:' main '}),{commit:'a'.repeat(40),source:'supplied'});
  assert.deepEqual(calls,[['git',['rev-parse','--verify','main^{commit}'],{cwd:'fixture',encoding:'utf8',timeout:15000,windowsHide:true}]]);
  const unavailable=createRatchetCommand({execFileAsync:async()=>{throw Error('git unavailable');}});
  assert.equal(await unavailable.resolveRatchetBase({projectRoot:'fixture',recordPath:'item/STORY.md',suppliedBase:'main'}),null);
});

// ---- 153/01: completed recalls are append-only decision evidence in the same ledger --------------

const observation = (overrides = {}) => ({
  id: 'c1', at: '2026-10-10T12:00:00Z', edge: 'refine-architect', actor: 'architect', query: 'junction cleanup', scope: {area: 'architecture'},
  records: [{item: '45', id: 'R13', recordType: 'lesson', verdict: 'honoured'}, {item: '68', id: 'R10', recordType: 'lesson', verdict: 'departed'}],
  ...overrides,
});
const raw = (id) => ({id, text: 'note ' + id, actor: 'fixture', refs: '', at: '2026-10-10T11:00:00Z'});

test('153/01 E1 a completed recall appends one row retaining each identity and verdict, after an unchanged prefix', () => fixture(async dir => {
  const item = {dir};
  await appendRawFeedback(item, raw('raw-1'));
  const before = await readFile(feedbackRecordPath(item), 'utf8');
  const {record, replayed} = await appendRecallObservation(item, observation());
  assert.equal(replayed, false);
  const after = await readFile(feedbackRecordPath(item), 'utf8');
  assert.ok(after.startsWith(before), 'the existing ledger bytes remain an unchanged prefix');
  const rows = (await readFeedbackRecords(item)).filter(entry => entry.kind === 'recall');
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], record);
  assert.deepEqual(rows[0].records.map(entry => [entry.item, entry.id, entry.verdict]), [['45', 'R13', 'honoured'], ['68', 'R10', 'departed']]);
  assert.deepEqual([rows[0].actor, rows[0].edge, rows[0].query, rows[0].scope], ['architect', 'refine-architect', 'junction cleanup', {area: 'architecture'}]);
}));

test('153/01 E2 an empty recall is still one observable row with an empty records array', () => fixture(async dir => {
  const {record} = await appendRecallObservation({dir}, observation({id: 'c2', edge: 'refine-po', actor: 'product-owner', records: [], scope: {}}));
  assert.deepEqual(record.records, []);
  assert.equal((await readFeedbackRecords({dir})).length, 1);
}));

test('153/01 E3 and the defect outline: every invalid shape is refused as invalid-observation, naming the defect, with the ledger untouched', () => fixture(async dir => {
  const item = {dir};
  await appendRawFeedback(item, raw('raw-1'));
  const before = await readFile(feedbackRecordPath(item), 'utf8');
  const good = observation().records;
  const cases = [
    ['missing verdict', observation({records: [{item: '45', id: 'R13', recordType: 'lesson'}]}), /missing verdict for 45\/R13/],
    ['duplicate returned identity', observation({records: [good[0], good[0]]}), /duplicate returned identity/],
    ['verdict accepted', observation({records: [{...good[0], verdict: 'accepted'}]}), /verdict "accepted"/],
    ['blank actor', observation({actor: '  '}), /blank actor/],
    ['blank edge', observation({edge: ''}), /blank edge/],
    ['invalid capture instant', observation({at: 'yesterday'}), /invalid capture instant/],
    ['unknown top-level field', {...observation(), verdictSummary: 'x'}, /unknown top-level field "verdictSummary"/],
    ['missing record type', observation({records: [{item: '45', id: 'R13', verdict: 'honoured'}]}), /missing record type/],
  ];
  for (const [defect, input, message] of cases) {
    await assert.rejects(appendRecallObservation(item, input), error => error.code === 'invalid-observation' && message.test(error.message), defect);
    assert.equal(await readFile(feedbackRecordPath(item), 'utf8'), before, defect + ': ledger bytes unchanged');
  }
  assert.deepEqual((await readdir(dir)).sort(), ['FEEDBACK.ndjson'], 'no lock or scratch file is left behind');
}));

test('153/01 E4 concurrent identical submissions leave exactly one row and both callers name it', () => fixture(async dir => {
  const item = {dir};
  const results = await Promise.all(Array.from({length: 8}, () => appendRecallObservation(item, observation({id: 'c1'}))));
  assert.equal(results.filter(entry => entry.replayed === false).length, 1, 'exactly one submission wrote');
  assert.ok(results.every(entry => entry.record.id === 'c1' && entry.record.at === '2026-10-10T12:00:00Z'));
  assert.equal((await readFeedbackRecords(item)).filter(entry => entry.id === 'c1').length, 1);
}));

test('153/01 E5 a conflicting retry is an id conflict and cannot replace a verdict; a separate recall of the same query is its own row', () => fixture(async dir => {
  const item = {dir};
  await appendRecallObservation(item, observation());
  const before = await readFile(feedbackRecordPath(item), 'utf8');
  const changed = observation({records: [{...observation().records[0], verdict: 'irrelevant'}, observation().records[1]]});
  await assert.rejects(appendRecallObservation(item, changed), {code: 'feedback-id-conflict'});
  assert.equal(await readFile(feedbackRecordPath(item), 'utf8'), before);
  await appendRecallObservation(item, observation({id: 'c3'}));
  assert.deepEqual((await readFeedbackRecords(item)).map(entry => entry.id), ['c1', 'c3']);
  await assert.rejects(appendRecallObservation(item, observation({id: 'c1', actor: 'qa'})), {code: 'feedback-id-conflict'}, 'any field change conflicts, not just a verdict');
}));

test('153/01 a recall id cannot collide with a raw or classification id in either direction', () => fixture(async dir => {
  const item = {dir};
  await appendRawFeedback(item, raw('shared'));
  await assert.rejects(appendRecallObservation(item, observation({id: 'shared'})), {code: 'feedback-id-conflict'});
  await appendRecallObservation(item, observation({id: 'c1'}));
  await assert.rejects(appendRawFeedback(item, raw('c1')), {code: 'feedback-id-conflict'});
}));

test('153/01 E6 a mixed ledger keeps raw and classification semantics: a recall id is refused as a non-raw reference and prior bytes stay a prefix', () => fixture(async dir => {
  const item = {dir};
  await appendRawFeedback(item, raw('raw-1'));
  await appendRawFeedback(item, raw('raw-2'));
  await recordFeedbackClassification(item, {id: 'triage-1', raw: 'raw-1', at: '2026-10-10T11:30:00Z', classification: {kind: 'bug'}});
  await appendRecallObservation(item, observation({id: 'c1'}));
  await appendRecallObservation(item, observation({id: 'c2'}));
  await appendRecallObservation(item, observation({id: 'c3'}));
  const before = await readFile(feedbackRecordPath(item), 'utf8');
  await recordFeedbackClassification(item, {id: 'triage-2', raw: 'raw-2', at: '2026-10-10T12:30:00Z', classification: {kind: 'note'}});
  await assert.rejects(recordFeedbackClassification(item, {id: 'triage-3', raw: 'c1', at: '2026-10-10T12:31:00Z', classification: {kind: 'note'}}), {code: 'feedback-raw-reference-invalid'});
  assert.ok((await readFile(feedbackRecordPath(item), 'utf8')).startsWith(before));
  const records = await readFeedbackRecords(item);
  assert.deepEqual(records.map(entry => entry.kind), ['raw', 'raw', 'classification', 'recall', 'recall', 'recall', 'classification']);
}));

test('153/01 a malformed existing row is reported by line and the ledger is not rewritten', () => fixture(async dir => {
  const item = {dir};
  await appendRawFeedback(item, raw('raw-1'));
  await writeFile(feedbackRecordPath(item), (await readFile(feedbackRecordPath(item), 'utf8')) + '{"kind":"verdict","id":"x"}\n');
  const before = await readFile(feedbackRecordPath(item), 'utf8');
  await assert.rejects(appendRecallObservation(item, observation()), error => error.code === 'feedback-record-invalid' && /line 2/.test(error.message));
  assert.equal(await readFile(feedbackRecordPath(item), 'utf8'), before);
}));

test('153/01 a stale ledger lock left by a dead process is reclaimed and the lock never survives a write', () => fixture(async dir => {
  const item = {dir}, lock = feedbackRecordPath(item) + '.lock';
  await writeFile(lock, '');
  const old = new Date(Date.now() - 120000);
  await utimes(lock, old, old);
  await appendRecallObservation(item, observation());
  assert.equal((await readFeedbackRecords(item)).length, 1);
  assert.deepEqual((await readdir(dir)).sort(), ['FEEDBACK.ndjson']);
}));

test('153/01 the raw capture door still rejects recall fields before resolving anything', async () => {
  const calls = [];
  const {feedbackCommand} = createFeedbackCommand({resolveItemExact: async () => {calls.push('resolve'); return {ref: '01', type: 'milestone', dir: 'x'};}, requireLocalCheckout: () => {}, transitionFeedbackAppended: async () => {calls.push('write'); return {effects: []};}, threadPropagationWarnings: value => value});
  for (const field of ['verdict', 'records', 'query', 'edge']) {
    await assert.rejects(feedbackCommand.run({ref: '01', note: 'n', [field]: 'x'}, {workspace: {}}), {code: 'feedback-classification-deferred'}, field);
  }
  assert.deepEqual(calls, []);
});

async function recorderFixture(dir, overrides = {}) {
  const calls = [];
  const item = {ref: '153', type: 'milestone', dir};
  const {recordRecall} = createRecallRecorder({
    resolveItemExact: async (_ctx, ref) => {calls.push('resolve'); return ref === '153' ? item : ref === 'remote' ? {ref: 'remote', dir: null} : null;},
    requireLocalCheckout: row => {calls.push('local'); if (!row.dir) throw Object.assign(new Error('not local'), {code: 'item-not-local'}); return row;},
    transitionRecallRecorded: async (row, edge) => {calls.push('transition'); const out = await appendRecallObservation(row, edge.recall); return {...out, effects: []};},
    threadPropagationWarnings: value => value,
    ...overrides,
  });
  return {recordRecall, calls, item};
}

test('153/01 the recorder validates before resolving, resolves exactly and locally, and never touches the ledger on refusal', () => fixture(async dir => {
  const {recordRecall, calls} = await recorderFixture(dir);
  const file = path.join(dir, 'obs.json');
  await writeFile(file, JSON.stringify(observation({records: [{item: '45', id: 'R13', recordType: 'lesson'}]})));
  await assert.rejects(recordRecall({workspace: {}}, {ref: '153', inputPath: file}), {code: 'invalid-observation'});
  assert.deepEqual(calls, [], 'an invalid observation is refused before the item is even resolved');
  await writeFile(file, JSON.stringify(observation()));
  await assert.rejects(recordRecall({workspace: {}}, {ref: 'nope', inputPath: file}), {code: 'ref-not-found'});
  await assert.rejects(recordRecall({workspace: {}}, {ref: 'remote', inputPath: file}), {code: 'item-not-local'});
  await assert.rejects(recordRecall({workspace: {}}, {ref: '153', inputPath: path.join(dir, 'missing.json')}), {code: 'invalid-observation'});
  await assert.rejects(recordRecall({workspace: {}}, {ref: '153'}), {code: 'missing-input'});
  await assert.rejects(recordRecall({workspace: {}}, {inputPath: file}), {code: 'missing-ref'});
  assert.deepEqual(await readdir(dir), ['obs.json'], 'no ledger was created by any refusal');
  const result = await recordRecall({workspace: {}}, {ref: '153', inputPath: file});
  assert.deepEqual([result.ok, result.id, result.replayed, result.verdicts], [true, 'c1', false, 2]);
  assert.equal((await recordRecall({workspace: {}}, {ref: '153', inputPath: file})).replayed, true, 'the identical retry names the same observation');
}));

test('153/01 the recall transition raises feedback.recorded once through the existing cascade, projects no STATE bullet, and a replay raises nothing', () => fixture(async dir => {
  const events = [];
  const {transitionRecallRecorded} = createDocumentTransitions({
    applicableReactors: async () => [{key: 'publish-projection'}],
    openEffectsJournal: async () => ({close() {}}),
    appendEvent: (_journal, event) => {events.push(event); return {eventId: 'e' + events.length};},
    drainEffects: async () => [{key: 'publish-projection', status: 'ok'}],
    runEffectsEphemeral: async () => [],
    reportDegrade: () => {},
  });
  const item = {ref: '153', type: 'milestone', dir};
  const first = await transitionRecallRecorded(item, {recall: observation(), now: '2026-10-10T12:00:00Z'}, {workspace: {projectRoot: 'root'}});
  assert.equal(first.replayed, false);
  assert.equal(events.length, 1);
  assert.equal(events[0].name, 'feedback.recorded');
  assert.deepEqual([events[0].payload.doc, events[0].payload.bullet, events[0].payload.rawId, events[0].payload.recallId], ['FEEDBACK.ndjson', null, null, 'c1']);
  assert.deepEqual(await readdir(dir), ['FEEDBACK.ndjson'], 'no STATE.md bullet is projected');
  const again = await transitionRecallRecorded(item, {recall: observation(), now: '2026-10-10T12:05:00Z'}, {workspace: {projectRoot: 'root'}});
  assert.equal(again.replayed, true);
  assert.equal(events.length, 1, 'replay emits no second capture event');
}));
