---
doc: verification
---
# 157 · Episodic memory is recallable — Verification

## Verification evidence

### 157/01, 157/02 — the `@executable` lanes and the controls

- **`node scripts/test.mjs --only <the 157 set>`** under an isolated `AOF_GLOBAL_HOME`, 2026-10-12.
  The set was every `test/arch/memory/*` control; the knowledge suites `episodic-records`,
  `memory-meta-normalised` and `memory-recall-block`; the memory-indexing, graphify-reindex,
  memory-status and tune-corpus tests; the source-directory budget; the index-version pins
  (`acd-outcome-record-frozen-shape`, `outcome-index-any-item`, `work-memory-command`); and the
  bundle and assembly readers (`yarn-installation`, `core-workspace`, `application-assembly`).
  296 cases ran and 295 passed. The one red was m153's FF-15301 census (F-01 below). With F-01
  fixed, the control's file re-ran 4/4 green.
  `verifies → 01 tasks/00, tasks/01 · 02 tasks/00, tasks/01`
- **`node test/integration/cli.mjs memory-episodic-records`**: 55/55 green. This feature binds
  01's and 02's task scenarios, with the outlines expanded. **`… cli.mjs work-memory`**: 3/3
  green (story 128's pinned rows, unchanged).
  `verifies → 01 tasks/00, tasks/01 · 02 tasks/00, tasks/01`
- **The m148 controls the new pool rides on are green:** FF-14801 holds every cited pair in the
  first five over the live corpus, with its expectations unedited, and FF-14803 shows every
  emitted type has a layer and both backends sum to `recordCount`.

### 157/01 — the live stream's episodic records resolve (`@manual`)

- **Procedure.** `wiki/work` from this checkout was copied into a temp project. It was rebuilt
  through `defaultApplication.knowledge.memory.localIndexing.reindex` (local backend, this tree's
  build). Every `finding` / `feedback` / `run` record and every `stall source:` locator was
  resolved through `readRecordSourceValue`. A finding passes when its line contains its id; feedback
  and run records pass when their value's `id` / `runId` is the record's id; a stall locator passes
  when it resolves to the run's own `sessionId`.
- **Result.** 4,532 records in total, of which 816 are findings, 45 feedback and 365 runs: 1,226
  episodic records, and all 1,226 resolved. All 30 stall locators resolved, with 0 identity
  duplicates and 0 failures. The build's measurement on the same day was 359 runs; the six-run
  difference is runs written since. FF-14801 is green over the live corpus (above).
  `verifies → 01 tasks/01 "the live stream's episodic records resolve and the retrieval eval stays green"`

### 157/03 — the retry, triage and retrospective edges (`@manual`)

- **Procedure.** A disposable stream was built in a temp project (`memory.backend: local`, then
  `none`), with the real CLI from this tree. It held the items the scenarios name:
  - story `39/02`: a failed attempt-1 run with `cap-exhausted`, plus `F-02`, and an `F-01` whose
    cause and evidence match milestone `41`'s new `F-01`;
  - story `39/03`: attempt 1 failed, attempt 2 cancelled, and attempt 3 open with `retryOf`
    attempt 1;
  - story `39/04`: an unrelated `F-01`;
  - milestone `50`: 3 findings, 2 raw feedback rows, 4 terminal runs and 1 open run.

  Each edge's commands were then run in the order the rendered procedures prescribe, and the
  observations were submitted through `record-recall`.
- **E1.** `ingest` then `recall "" --item 39/02 --area delivery --all --json` returned `F-02`,
  `F-01` and the attempt-1 run, whose `failureReason` is `cap-exhausted`. Every fact the
  acknowledgement must name is in the retained result. One `continue-episodic` / `developer`
  observation was recorded with 3 verdicts. A replay with the same `id`/`at` left one ledger row.
  `verifies → 03 tasks/00 E1`
- **Lineage.** `recall "" --item 39/03 …` returned the attempt-1 and cancelled attempt-2 runs.
  The open attempt-3 run is absent. Its own record names attempt 1 through `retryOf`, so the
  prior attempt resolves to attempt 1 and not the later cancelled one.
  `verifies → 03 tasks/00 "the prior attempt is the run's retryOf…"`
- **E2.** The procedure gates the block on "its minted run's `attempt` is 2 or more", and FF-15702
  holds that condition in the authored source and in every render (`continue-developer` stays
  unchanged beside it). No first-attempt walk was needed beyond that binding.
  `verifies → 03 tasks/00 E2`
- **E3 / E7.** With backend `none`, `ingest` reports `recordCount: 0` and both `--all` recalls
  return `[]`, so the evidence is reported unavailable from the result itself. One
  `continue-episodic` observation was recorded with `records: []`.
  `verifies → 03 tasks/00 E3 · tasks/02 E7`
- **E4 / E5 / the same id on another item.** `recall "<finding text>" --kind finding --block`,
  run with no item or stage filter, ranked `39/02`'s `F-01` first and `41`'s own `F-01` second.
  The triage cites `39/02`/`F-01` and leaves `41`'s finding open. The finding's own identity is
  given an explicit `irrelevant` verdict, as is `39/04`'s unrelated `F-01`. One
  `verify-finding` / `verifier` observation was recorded on `41` with 5 verdicts.
  **Live walk:** this verify's own triage of F-01 ran the same edge on 157 (observation
  `6f1d1c57-4b8e-4a57-9e0d-157f01000001`).
  `verifies → 03 tasks/01 E4, E5, "the same F id on another item…"`
- **E6 / the open run.** After `ingest`, `recall "" --item 50 --area delivery --all --json`
  returned exactly 9 records: 3 findings, 2 feedback and 4 runs, each with a resolvable source.
  The open run is absent, and no recall observation was written for the evidence step.
  **Live walk:** the 157 retrospective gathered its evidence through this recall.
  `verifies → 03 tasks/02 E6, "the retrospective's own open run is absent…"`

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-15701 | `test/arch/memory/acd-episodic-source-provenance.test.mjs` | GREEN, 4/4 | `assertInsideBase` was removed from the JSON-locator branch of `resolveRecordSourcePath`. The control reds with "Missing expected exception: ../../outside/run.json# is refused". Re-performed at verify on 2026-10-12, then restored (byte-compared) and green again. |
| FF-15702 | `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs` | GREEN | The probes are built into the control. FF-15303 leg 2 removes each edge's capture obligation, `continue-episodic` and `verify-finding` included, and asserts the control reds naming that edge and no other. The 157 retrospective leg removes the `--all` recall and asserts the control reds naming the retrospective. Both legs passed in the lane, so each mutation was observed red. |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | m153's FF-15301 census (`test/arch/memory/acd-recall-ledger-consumers.test.mjs`) is red. `packages/knowledge/src/memory/episodic-indexing.mjs` and `packages/core/src/application/bindings/memory/local-indexing.mjs` read the feedback ledger, and neither is classified in `LEDGER_READERS`. No story's lane ran the control, because it sits outside every `files:` and `reads:` set. | defect | high | blocker. Fixed inline: both readers were classified (the episodic leaf indexes `kind === "raw"` only; the binding injects and reads no row), and the control re-ran 4/4 green. The regression proof is the control itself, so no `@bug` scenario was added. Recall: a distinct incident of the class of m102/F-102-A (a new file trips another milestone's census control). The control and the evidence differ, so it is not a duplicate. | product-owner (157) | closed |

## Accept decision

**ACCEPTED — stories 157/01, 157/02 and 157/03, and milestone 157.** 2026-10-12. The decision rests on:
- the 157 lanes (296 cases) and the two feature files (58 cases) are green;
- FF-15701 and FF-15702 are green with recorded red probes;
- every `@manual` scenario has been walked;
- the one blocker (F-01) is closed;
- the whole-tree regression gate is green at `a439359f` (`REGRESSION.md`).

The gate's first run, at `b8ee89d9`, is recorded red. The runner stalled for about six hours while the host was idle and ended with no verdict and no failure enumerated. Every unit it marked red (14 files, 343 cases) re-ran green in isolation. The second run was green in 26.2 min, with three load flakes that the runner named and that passed when retried alone.

No scenario is `@uat`, so no human sign-off applies.
