import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { defaultApplication as app } from 'aof/default-application';

const base='wiki/work/157_milestone_episodic-memory-is-recallable';
const arch=base+'/ARCHITECTURE.md';
const write=(file,text)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text.endsWith('\n')?text:text+'\n');};
const common=['scripts/test.mjs','scripts/test-unit.mjs','scripts/test-workspace.mjs','test/integration/support/cli-context.mjs','test/integration/support/step-registry.mjs','test/integration/support/common-steps.mjs','test/integration/support/feature-runner.mjs'];
const firstFiles=[
 'packages/knowledge/src/memory/episodic-indexing.mjs','packages/knowledge/src/memory/local-indexing.mjs','packages/knowledge/src/memory/local-retrieval.mjs','packages/knowledge/src/memory/graphify-backend.mjs','packages/knowledge/src/memory.mjs',
 'packages/core/src/application/bindings/memory/local-indexing.mjs','packages/core/src/application/assemble.mjs',
 'packages/knowledge/test/episodic-memory.suite.mjs','packages/knowledge/test/index.mjs','packages/knowledge/test/memory-retrieval.suite.mjs','packages/knowledge/test/memory-recall-block.suite.mjs','packages/knowledge/test/memory-meta-normalised.suite.mjs',
 'test/memory/memory-indexing.test.mjs','test/memory/memory-status.test.mjs','test/planning/tune-corpus.test.mjs','test/command/work-memory-command.test.mjs',
 'test/arch/memory/acd-episodic-source-provenance.test.mjs','test/arch/memory/index.mjs','test/arch/memory/acd-memory-layer-map-total.test.mjs','test/arch/memory/acd-memory-derived-index.test.mjs',
 'test/integration/features/episodic-memory.feature','test/integration/steps/episodic-memory.steps.mjs'
];
const firstReads=[...firstFiles,...common,
 'packages/work/src/declared-id.mjs','packages/work/src/feedback-records.mjs','packages/work/src/observe.mjs','packages/work/src/ref-scope.mjs','packages/work/src/memory-vocabulary.mjs','packages/work/src/memory-accounting.mjs','packages/work/src/tune/corpus.mjs','packages/execution/src/runs.mjs',
 'packages/knowledge/src/memory/local-backend.mjs','packages/knowledge/src/memory/none-backend.mjs','packages/knowledge/src/memory/recurrence.mjs','packages/knowledge/src/commands/memory.mjs',
 'packages/core/src/application/bindings/memory/graphify-backend.mjs','packages/core/src/application/bindings/run-store.mjs','packages/core/src/application/bindings/work/observe.mjs','packages/core/src/application/bindings/work-tune/corpus.mjs',
 'packages/knowledge/package.json','packages/work/package.json','test/arch/command/acd-declared-id-single-home.test.mjs','test/arch/memory/acd-memory-retrieval-eval.test.mjs','test/arch/memory/acd-memory-recall-contract.test.mjs','test/arch/memory/acd-memory-backend-interface.test.mjs','test/arch/memory/acd-import-derived-index.test.mjs','test/arch/memory/acd-recall-ledger-consumers.test.mjs','test/arch/memory/acd-memory-recurrence-calibration.test.mjs','test/memory/retrieval-eval.test.mjs','test/memory/index.mjs','test/planning/index.mjs','test/integration/cli.mjs',
 arch+'#adr-001-existing-sources-become-three-episodic-record-types',arch+'#adr-002-source-locators-grow-without-a-new-record-field',arch+'#adr-003-every-consumer-accounts-for-the-new-pool'
];
const names=['continue','verify','retrospective'];
const rendered=names.flatMap(n=>[`.agents/skills/aof-${n}/procedure.md`,`.agents/skills/aof-${n}/SKILL.md`,`.agents/skills/aof-${n}/agents/openai.yaml`,`.claude/commands/aof/${n}.md`,`.opencode/commands/aof/${n}.md`]);
const secondFiles=[...names.map(n=>`packages/core/assets/commands/${n}.md`),'packages/core/assets/variants/codex/workflow.md','packages/core/assets/manifest.json',...rendered,'.aof/aof.lock.json','.aof/aof.apply-journal.json','.codex/aof/workflows/workflow-contract.md','packages/core/assets/loops/retrospective-memory-ingest.md','.aof/loops/retrospective-memory-ingest.md','test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs'];
const secondReads=[...secondFiles,...common,'packages/core/src/work/bundle.mjs','packages/core/src/work/bundle-synthesis.mjs','packages/core/src/render-plan.mjs','packages/core/src/lock.mjs','packages/core/src/adapters.mjs','packages/core/src/application/bindings/work/init.mjs','packages/knowledge/src/memory.mjs','packages/knowledge/src/memory/local-retrieval.mjs','packages/knowledge/src/commands/memory.mjs','packages/work/src/feedback-records.mjs','packages/work/src/commands/run-start.mjs','packages/execution/src/runs.mjs','test/support/cli-spawn.mjs','test/arch/memory/index.mjs','test/arch/work/acd-memory-vocabulary-one-home.test.mjs',arch+'#adr-004-retry-triage-and-retrospective-consume-retained-recall-results'];
const stories=[
 {n:'01',slug:'episodic-sources-are-recallable',title:'Existing findings, feedback and terminal runs are recallable',depends:[],files:firstFiles,reads:firstReads,
 user:'As an AOF operator, I want existing findings, raw feedback and terminal runs to be recallable with resolvable provenance, so that past incidents can inform work without another record to maintain.',
 tasks:['01_findings-and-feedback','02_terminal-runs-and-stalls','03_complete-recall-and-consumer-parity','04_live-corpus-evidence'],
 plan:'Extend the shared item walk with a small episodic compiler. Core lends run-store and snapshot readers; retain source-owned parsing and diagnostics. Source resolution grows to JSON pointers while all old record fields stay present. Both backends share compilation, scope and base ranking.\n\nDrive a temporary mixed stream through the real ingest/recall/status CLI on both backends. Resolve every primary and secondary locator, mutate a source, and ingest again. Run the fixed live-corpus retrieval eval and existing memory controls. Demonstrate FF-15701 going red by corrupting a pointer and by introducing a nonterminal record, then restore.\n\nNo new source writer, transcript mining, tune lane, dependency or UI is in scope. Graph-assisted retrieval may be unavailable in this host; record that separately from JSON-index parity.'},
 {n:'02',slug:'workflows-recall-prior-incidents',title:'Retries, finding triage and retrospectives recall prior incidents',depends:['157/01'],files:secondFiles,reads:secondReads,
 user:'As a developer and verifier, I want previous incidents recalled where I retry, triage and compile lessons, so that a repeated failure or duplicate finding can change the next decision.',
 tasks:['01_retry-and-triage-recall','02_retrospective-evidence','03_observed-workflow-use'],
 plan:'Extend the authored workflow sources and Codex variant at their existing decision points. Retain actual recall results until decisions are recorded and submit the two new observations through the existing ledger command. Retrospective evidence uses an exhaustive scoped recall after observability and ingest. Render runtime copies through the normal renderer, preserving unrelated local changes.\n\nExtend the registered learning-edge control to inspect placement, parsed flags, scope and retained-result capture for each new edge, with negative mutations for a missing edge, an item-scoped triage and raw-only retrospective evidence. Exercise the CLI commands in a disposable mixed stream and manually run a retry and triage to show the sequence in a real session. Keep human acceptance separate.\n\nNo finding auto-closure, new ledger, source compiler or change to old recall edges is in scope.'}
];
const tracked=execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n');
for(const s of stories){
 s.dir=`${base}/stories/${s.n}_story_${s.slug}`;
 const proposal=app.work.storyContractDerive.deriveStoryContract({projectRoot:process.cwd(),subjects:s.files,declaredReads:[],declaredFiles:[],documents:[base+'/SPEC.md',arch],sourceRoots:['packages/knowledge/src','packages/core/src'],testRoots:['test','packages/knowledge/test'],allSuites:tracked.filter(f=>/\.(test|suite)\.mjs$/.test(f))});
 write(`.aof/refine-157-${s.n}-proposal.json`,JSON.stringify(proposal,null,2));
 console.log(JSON.stringify({story:s.n,proposalReads:proposal.reads.length,proposalFiles:proposal.files.length,graph:proposal.graph,complete:proposal.complete,unknownCoupling:proposal.unknownCoupling.length,conventionalSuites:proposal.files.filter(f=>f.reason==='test-lane').map(f=>f.path)}));
 const missing=s.reads.filter(f=>!f.includes('#')&&!fs.existsSync(f)&&!s.files.includes(f));
 if(missing.length)throw Error('undeclared missing reads '+missing.join(','));
 write(s.dir+'/STORY.md',`---\ntype: story\nnumber: ${s.n}\nslug: ${s.slug}\ntitle: "${s.title}"\nparent: 157\nstatus: not-started\nowner: product-owner\ncreated: 2026-10-11\nupdated: 2026-10-11\ndepends: [${s.depends.join(', ')}]\nschema: 1\naofVersion: 0.1.0\nreads: ${JSON.stringify([...new Set(s.reads)])}\nfiles: ${JSON.stringify(s.files)}\n---\n\n# 157/${s.n} · ${s.title}\n\n## User story\n\n${s.user}\n\n## Tasks\n\n${s.tasks.map(t=>'- [ ] `tasks/'+t+'.feature`').join('\n')}\n\n## Notes\n\nRead/write sets were derived from the subject files, source citations and owning-suite conventions, then narrowed; see RESEARCH. The graph is unavailable, not evidence of no coupling. Build no new source before the milestone ADRs; delivered feature files stay immutable. No dependency is a UAT gate.\n`);
 write(s.dir+'/PLAN.md',`# 157/${s.n} · Build brief\n\nAdvisory to the builder; task features are the contract.\n\n${s.plan}\n`);
}
const examples1=`# 157/01 · Episodic sources — example map

## R1 · Existing incident sources are recallable without creating new source records
- E1 · Item 157/01 has heading F-01 and table row F-02: ingest returns two findings with their own source lines [proposed]
- E2 · A ledger has raw fb-a, classification c-a and recall r-a: only fb-a becomes feedback [proposed]
- E3 · A run is failed with failureReason timeout, while a second is running: only the failed run is recalled [proposed]

## R2 · Every record resolves to its source and complete item recall is available
- E4 · A raw entry at physical line 3 resolves from FEEDBACK.ndjson:3# to that JSON object [proposed]
- E5 · An item has 7 episodic entries: default recall shows at most 5 and --all returns all 7 [proposed]
- E6 · A snapshot agent shares sessionId but belongs to 157/02: its stalls are not attached to a run of 157/01 [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-002-source-locators-grow-without-a-new-record-field · How are JSON source pointers represented and versioned?
- Q2 · technical · defaulted ARCHITECTURE.md#adr-003-every-consumer-accounts-for-the-new-pool · How does a consumer request more than the default five results?

The SPEC already settles the business rules: three types, terminal-only runs, both finding forms, both backends and resolvable provenance. These examples remain proposed; no human answer is claimed. The architect reviewed both questions as engineering choices.
`;
const examples2=`# 157/02 · Workflow recall — example map

## R1 · A retry acknowledges prior incidents before building
- E1 · Attempt 2 follows a timeout and F-01: the build record names both before implementation and records the retained recall verdicts [proposed]
- E2 · Attempt 1 has no earlier episode: the existing near-miss edge remains, but no episodic retry edge runs [proposed]
- E3 · Attempt 3 with memory off records an empty observation and explicit unavailable evidence, without inventing a failureReason [proposed]

## R2 · Finding triage searches the stream and accounts for its decision
- E4 · A candidate repeats another item's F-04 cause: triage cites that qualified finding after stream-wide recall [proposed]
- E5 · Two items both have F-01 but different causes: neither is closed solely because its bare id matches [proposed]

## R3 · Retrospective gathers incident evidence through recall
- E6 · Seven incidents exist: after refresh and ingest all seven are available to the lesson pass through scoped recall [proposed]
- E7 · Memory is off: retrospective reports no recalled evidence and does not fabricate lessons or a third decision ledger row [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-004-retry-triage-and-retrospective-consume-retained-recall-results · Which scope includes both build-run failures and verify findings?

The milestone Objective already requires retry, triage and retrospective recall. No unanswered business rule remains. Proposed examples are not human confirmations; the architect reviewed the scope choice as technical.
`;
write(stories[0].dir+'/EXAMPLES.md',examples1);
write(stories[1].dir+'/EXAMPLES.md',examples2);
let spec=fs.readFileSync(base+'/SPEC.md','utf8');
spec=spec.replace('To be broken down (`aof:refine`, once promoted).',stories.map(s=>`- [ ] ${s.n} · [${s.title}](stories/${s.n}_story_${s.slug}/STORY.md)`).join('\n'));
write(base+'/SPEC.md',spec);
write('.aof/refine-157-stories.json',JSON.stringify(stories,null,2));
