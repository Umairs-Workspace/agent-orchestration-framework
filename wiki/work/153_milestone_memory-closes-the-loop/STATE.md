# 153 · Refine state

## Current position

2026-10-10: solo autonomous refine, driven by the shell. `run-start 153` returned the shell's
existing attributed run with `driven: true`; no local status or run settlement was performed.
Dependency 148 resolves to done. No implementation, dependency install, generated-output edit,
commit or build was performed.

Refine is complete: five story records, five example maps, five advisory build briefs and ten
task features (two per story). The consolidated solo review is recorded in VERIFICATION.
Story 03's reserved policy was answered before its tasks were authored; the other four locked
contracts were not reopened. All stories remain not-started and all task checkboxes remain open.

## Decisions

- ADRs were settled before contract authoring. Complete verdict observations use the existing
  ledger and work-owned publication transition. Brief is retired. No backend or record type is added.
- Composite identity, idempotent replay, forward promotion watermark, cross-kind lesson matching,
  deterministic append proposals and authored-path boundaries are documented engineering choices.
- The named recurrence pair has different Kinds. This measured fact corrects the SPEC's
  illustrative same-kind dependency wording while preserving its whole-index outcome.
- Graph extraction failed with EPERM. Its advisory fallback was used; no escalation, stale graph
  or invented freshness/counts. Source coupling and derive/subtract evidence are in RESEARCH.
- The age-warning default is **not** an engineering default. The operator answered Q1 with the
  suggested five-milestone threshold. E4 is stated Q1; other example provenance remains proposed.

## Answered business question

**153/03 Q1** · R2 · The operator answered "Let’s go with your suggestion", selecting the
presented "At 5 milestones" option. The driven run's ask records answeredAt
2026-10-10T12:15:21.621Z. Default warning begins at age 5 (quiet at age 4). The answer is recorded
in EXAMPLES and the reserved ADR-003 policy, and E4 is carried as a headline scenario under R2.

Doctor passed the answered map before task authoring. Milestone validate then returned no findings;
doctor reported zero errors and ten advisories. No business question remains. Pending controls,
absent runner-report joins and stream-level advisories remain visible build/verification concerns;
no product execution or acceptance evidence is claimed. Next: `$aof-continue 153`.

## Preserved work

Pre-existing edits in runtime procedures/agents, .aof lock/journal, this SPEC, and unrelated
backlog/157 work were left intact. Story 04 declares the eventual render outputs and warns its
builder to preserve these changes during normal regeneration.

## Feedback (for retro)

- 153/01 review (solo): record-recall reuses the existing feedback.recorded event so it publishes through the existing cascade; the acceptor census sweep observations:feedback-recorded (packages/work/src/acceptor/observations.mjs) counts that event by name, so recall observations will be counted as recorded feedback. The census is a floor so it over-counts rather than under-counts, but the label is wrong. Route: recorded finding (a payload-level exclusion on recallId changes census semantics and is not cheaper than the driver). Also: the remote-only owner row is covered by test/command/work-memory-command.test.mjs (cache fixture), not by the CLI feature, because a cache-only item cannot be fabricated through the spawned CLI fixture. — Raised by: developer
- 153/02 build (solo): the story's declared files: omit three paths the build had to touch — test/arch/testing/acd-source-directory-budget.test.mjs (four rows rose: packages/knowledge/test 13->14, test/integration/features 10->11, steps 11->12, test/arch/memory 23->24, each with its reason), test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs (FF-12405 leg 4 pins the verb vocabulary, which now includes recurrence) and the milestone RESEARCH.md (the @manual scenario requires the calibration basis there). Same class as 140/R1: a new test file is a budget change. Route: recorded finding (refine repair of the census). Raised by: developer — Raised by: you
- 153/02 build (solo): the recurrence matcher is blind to two kinds of recurrence, both measured in RESEARCH.md. (1) A lesson that restates an earlier one in different words — the five lessons 148/R1 names score 0.044-0.083, 152/R3 vs 140/R1 0.019 — is not detectable by shared vocabulary, so Recurs for the files:-census family stays the author's manual act. (2) A lesson written as free prose rather than labelled What happened/Why/Lesson fields is indexed by its title alone (146/R1 indexes 79 characters), so the matcher scores only what the index holds; fixing that changes ranking text, which ADR-002 freezes. Route: recorded finding (the second needs a contract amendment to ADR-002 or a parser story). Raised by: developer — Raised by: you
- 153/02 gate (inherited, not 153/02's): at the branch base the budget row packages/execution/src is red (26 children against a ceiling of 24, from 154/156), which reds six FF-11904/138-00 cases; arch/124/02 FF-12405 leg 9 and bundle/manifest + 149/02 are red on a manifest hash for .agents/skills/aof-add-chore/SKILL.md against the modified .aof/aof.lock.json; arch/15 ADR-005 drive-review answers unknown-flag where runtime-asset-missing is expected. None is touched by the 153/02 diff. Route: recorded finding. Raised by: developer — Raised by: you
- 153/03 build (solo): the declared files: omit paths the build had to touch — packages/work/src/feedback-records.mjs (exports FEEDBACK_RECORD_KINDS so the accounting reader does not respell the ledger's kinds), test/arch/memory/acd-recall-ledger-consumers.test.mjs (FF-15301 census: memory-accounting.mjs is a new ledger reader and must be classified), test/arch/testing/acd-source-directory-budget.test.mjs (six rows rose: work/test 54->56, knowledge/test 14->15, work/src 42->43, work/src/doctor 11->12, integration features 11->12, steps 12->13, each with its reason), test/arch/audit/acd-controls-never-execute.test.mjs (the doctor lane roster gained a twelfth lane) and packages/core/assets/loops/retrospective-memory-ingest.md (the cited memory.mjs lines shifted by the new import). Same class as 153/02. Route: recorded finding (refine repair of the census). Raised by: developer
- 153/03 build (solo): on the real stream the default policy yields 738 memory-lesson-unpromoted-aged warnings, because every legacy lesson has no Promoted to field and is unpromoted by definition (E5), and acceptance age is read from the item's `updated` date, so milestones accepted on one day never order each other (equal instants are not later). Warnings only; normal doctor exit is unchanged. Route: recorded finding (a per-milestone exemption for legacy lessons or a finer acceptance instant would each change 153/03 Q1's policy, so they are the operator's). Raised by: developer
- 153/05 build (solo): the declared files: omit paths the build had to touch — packages/work/src/memory-accounting.mjs (readLedgerText returns each observation's line, buildAccounting can cite its rows with evidence:true, the stream walk narrows to selected items), packages/work/src/memory-vocabulary.mjs (promotionPointers, the one reader of every destination a Promoted to value names), packages/work/src/tune/provenance.mjs (documentDeclarations looked a declared id's form up by name-plus-hyphen, so a retrospective lesson's hyphenless R13 was never declared and no qualified lesson reference could resolve), packages/work/test/memory-vocabulary.suite.mjs and memory-accounting.suite.mjs (their new exports' cases) and test/arch/testing/acd-source-directory-budget.test.mjs (integration features 12->13, steps 13->14, each with its reason). Same class as 153/02 and 153/03. Route: recorded finding (refine repair of the census). Raised by: developer — Raised by: developer
- 153/05 build (solo): a candidate made of several lessons promoted to one prompt quotes only its canonical lesson (the one the most later lessons repeat, then the earliest). Once that block is in force the next run reports already-in-force and the other lessons' corrections are never proposed. The spec's one-block-per-canonical-ref wording (E3, E4) settles the shape, so extending it to one block per promoted lesson is a contract amendment. Also: premise-moved and the ordinal-acceptor coexistence are bound in test/planning/tune-proposal.test.mjs and tune-command.test.mjs, not in memory-tune-prompt.feature, because the CLI cannot present a pre-formed patch or an injected acceptor; the promotion destination is no longer cited as lesson evidence (a missing target must report as target-unreadable, not as an unresolvable citation). Route: recorded finding. Raised by: developer — Raised by: developer
