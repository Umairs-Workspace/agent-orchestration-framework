---
doc: verification
---
# 148 · Verification

## Fitness functions

Each probe was run at the source on 2026-10-06: mutate one file, run the control, read the
failure, restore the file, then run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-14801 | `test/arch/memory/acd-memory-retrieval-eval.test.mjs` | GREEN (2 ok) | in `packages/knowledge/src/memory/local-retrieval.mjs`, reversed `scored.sort((a, b) => b.score - a.score)` to `a.score - b.score` → both cases red, `the retrieval eval lost 25 pair(s)`, first `lost: 01/R2 for query "content addressed hash cross platform" — found at rank 3202, outside the first 5`; restored → 2 ok |
| FF-14802 | `test/arch/work/acd-memory-vocabulary-one-home.test.mjs` | GREEN (3 ok) | (a) appended `export const PROBE_META = /\*\*(Kind\|Area\|Stage\|Owner\|Raised by):\*\*/;` to `packages/knowledge/src/memory/local-indexing.mjs` → `the meta-label alternation has one home`, 1 of 3 red; (b) dropped `near-miss \| ` from the Kind list in `packages/core/assets/commands/retrospective.md` → `the retrospective prompt names exactly the vocabulary's kinds, areas and stages` (deep-equal fails), 1 of 3 red; each restored → 3 ok |
| FF-14803 | `test/arch/memory/acd-memory-layer-map-total.test.mjs` | GREEN (2 ok) | deleted `capability: "semantic",` from `RECORD_TYPE_LAYERS` in `packages/knowledge/src/memory/local-retrieval.mjs` → `every emitted type has a layer — unmapped: capability`; restored → 2 ok |

## Verification evidence

- **Story lane, all five stories, at accept, 2026-10-06.** `node scripts/test.mjs --only` over the
  22 test files the stories declare or moved (temp `AOF_GLOBAL_HOME`): 299 cases, 7 failures. All
  7 were in two files and came from 152 (`a035aa5d`, committed on this branch): FF-11904's
  `test/work/stream` row (36 children against a ceiling of 35, five cases plus 138/00 task01) and
  the `promote/candidates.mjs` native port in `yarn-installation`. Repaired in `c73e7ed1`
  (F-148-01). Those two files re-run: 22 cases, 0 failures. verifies → 148/01 tasks 00–01
  (`acd-memory-retrieval-eval`, `retrieval-eval`), 148/02 tasks 00–02 (`memory-vocabulary`,
  `memory-meta-normalised`, `memory-retrieval`, `gap-carries-discharge`, `memory-indexing`,
  `outcome-index-any-item`, `acd-outcome-record-frozen-shape`, `acd-memory-vocabulary-one-home`,
  `memory-integration`), 148/03 task 00 (`story-retrospectives-indexed`, FF-14801), 148/04 tasks
  00–01 (`lesson-meta-hold`, `acd-controls-never-execute`, `doctor-examples-lane`,
  `acd-source-directory-budget`), 148/05 tasks 00–01 (`memory-status`, `memory-recall-block`,
  `acd-memory-layer-map-total`, `work-memory-command`, `acd-work-memory-routed`).
- **148/02, the live corpus before and after (the developer's measure at build, 2026-10-05,
  records built in memory, isolated `AOF_GLOBAL_HOME`, 489 lessons).** Each figure is as written →
  as indexed. Kind: enum 333 → 345, non-enum 65 → 53, 36 → 25 spellings. Area: enum 298 → 321,
  non-enum 100 → 77, 69 → 50 spellings. Stage: enum 310 → 383, non-enum 88 → 15, 59 → 14
  spellings. Blank stays 91 on all three, counted and never guessed. Gap status: 12 spellings → 3
  (open 412, discharged 33, open-by-decision 1). 82 lessons carry tags. FF-6604's differential
  shows no title, summary or text changed. verifies → 148/02 tasks 00–01.
- **148/03, the live corpus (2026-10-05).** Lessons 489 → 788, all 299 new ones from story
  folders; records 2,895 → 3,194. FF-14801 lost one pair when the pool grew: 126's recorded query
  ranked 36/ADR-002 sixth, out of a near-tie at fourth. The build moved the pair to the gist 126's
  recall recorded and wrote the reason beside it. **Confirmed at accept, 2026-10-06:** the original
  query re-ranked over the live corpus (3,228 records, 800 lessons) puts 126/ADR-006, 126/ADR-005,
  126/ADR-001, 68/ADR-002 (15.711) and 53/ADR-004 (15.640) in the block and 36/ADR-002 sixth
  (15.574). The block is all ADRs and holds no story lesson, so the move is the tie reordering, not
  displacement. The eval holds 25 of 25 pairs. verifies → 148/03 task 00.
- **148/04 task 02 (`@manual`), at accept, 2026-10-06.** `node packages/core/bin/aof.mjs work
  validate` from the root (temp `AOF_GLOBAL_HOME`) → `PASS — work stream is well-formed.`, exit 0.
  `git diff --name-only` over `wiki/work/archive` in the story's change → nothing. Step 4 of
  `packages/core/assets/commands/retrospective.md` says validate holds Kind, Area and Stage to the
  listed words with a qualifier after the word, and that Owner must be present. The `.claude`,
  `.opencode` and `.codex` copies carry the same line, and FF-14802 is green. The build's
  measurement, 2026-10-06: 56 problems on 29 lessons in 14 retrospectives before, PASS after. Each
  written word is kept as the qualifier:
  - 134: R1 Area product → contract (product); R2 Kind process → blocker (process), Area planning →
    process (planning), Stage continue → build (continue); R3 Kind process → blocker (process), Area
    testing → process (testing).
  - 134/01: R1 and R2 Area planning → contract (planning).
  - 134/02: R1 Kind process → near-miss (process), Area testing → process (testing); R2 Kind defect →
    mistake (defect), Area loop → code (loop).
  - 134/03: R1 Area planning → contract (planning); R2 Area testing → process (testing); R3 Kind
    defect → mistake (defect), Area loop → code (loop); R4 Kind process → blocker (process), Area
    planning → contract (planning), Stage continue → build (continue).
  - 134/04: R1 Kind process → blocker (process), Area planning → contract (planning), Stage continue
    → build (continue); R2 Area testing → process (testing).
  - 134/05: R1 Area product → contract (product).
  - 135/03: R1 Area test → process (test); R2 Area design → contract (design). 135/04: R2 Area test →
    code (test), Stage review → build (review). 135/05: R1 Area test → process (test).
  - 136: R1 Area technical → code (technical). 144: R2 Kind risk → near-miss (risk). 149: R5 Area
    verification → process (verification).
  - 145 and 146 had no meta line; one was authored from each lesson's text. 145: R1 mistake
    (recurring) · process · build · developer; R2 mistake · code · build · developer; R3
    misunderstanding · contract · refine · product-owner. 146: R1 mistake (recurring) · process ·
    build · developer; R2 mistake · process · refine · architect; R3 mistake · contract · refine · qa.

  verifies → 148/04 task 02.
- **148/05, the live store (the developer's measure, 2026-10-06, graphify, built before 04's
  re-classification).** 3,202 records; layers episodic 0 · semantic 2,411 · procedural 791.
  Conformance: kind blank 128 non-enum 131 · area blank 128 non-enum 156 · stage blank 128 non-enum
  31 · owner blank 128 · gap status non-enum 0. verifies → 148/05 tasks 00–01.

## Regression gate

`aof work regression-gate 148` from a clean detached worktree at `c73e7ed1`, temp `AOF_GLOBAL_HOME`,
2026-10-06: **12,183 of 12,183 registered cases** in 1,200 units, wall 24.1 min, 16 workers.
**Red**: 11 units, plus 2 that are not isolated (red in the pool, green alone:
`fleet-boards-branch-deleted`/01 and 53/00 task03). The row is in `REGRESSION.md`. Attribution was
re-run at `main` (`6351dd66`) over the same files:

- **This branch's, open (F-148-05):** two suites pin the `test/work/stream` row at 35, which
  `c73e7ed1` raised to 36 for 152 (`work-archive-is-a-move` 00, `work-this-tree-holds-what-is-live`
  02), and the Plan 09 ledger (`142/plans/09-test-ledger.json`) holds the old hash of
  `acd-declared-id-single-home.test.mjs`.
- **This branch's, repaired after the run:** FF-5810, where the `retrospective-memory-ingest` loop
  record cited `createMemory` at `memory.mjs:5`, and 148/02 moved it to `:6` (asset, rendered copy,
  manifest and lock refreshed).
- **Red at `main` (F-148-03):** FF-11902 (two literal `deepEqual`s in
  `work-dispatch-lanes.test.mjs`), FF-11903 (58 unresolved citations against a ceiling of 55; `main`
  has 60, and 148 removes 2), FF-11908 (`command-core.mjs:68`, repaired after the run), FF-5508
  (the loop schema gained `noRepair`), FF-13002 (147's repair drive is a fourth site, and it binds
  `settled` rather than re-binding `driven`), FF-12401 (316 against 320 edges), grade/01
  (`loop-command-stops` names `grade-indeterminate`), and `work-this-tree-holds-what-is-live` 02
  (134 is done at the root and not archived). All except 134's arrived with #7 (`6351dd66`).

**Repairs after the run, 2026-10-06.** Each red was re-run at `8caa1cb7` with `node scripts/test.mjs
--only`, repaired, and re-run green:

- **F-148-05.** The two stream suites and `work-archive-is-a-move`'s Plan 06 pin held the
  `test/work/stream` row at exactly 35 and `packages/work/src` at exactly 41. They now hold those
  values as floors, because a later item raises a row with its reason in the row's `why` (152 and 148).
  The Plan 09 ledger was re-measured with the control's own instrument for the seven suites whose
  case names changed. It now reads `namesInLedger` 11,529 and `registryCases` 12,184.
- **FF-5508.** The pin learned `noRepair` (147), as it learned `thinking` (141).
- **FF-13002.** 147's repair drive is a fourth drive site. It now re-binds `driven` through
  `settleDriven(driven`, as the other three do, with no change in behaviour. The control counts four
  sites and names the fourth.
- **grade/01.** 147's E6 case (a red grade stops the loop with no repair) moved from
  `loop-command-stops`, which grade/01 holds to naming the grade nowhere, to `loop-command-wave`.
  `loop-command-wave` already drives the grade's halts over the same lane fixture. The operator chose
  this at verify. E5 stays in `loop-command-stops`, and grade/01 is unchanged.
- **FF-11902.** The two `work-dispatch-lanes` checks compare the merged note lines as joined text.
  They are fixture content the case wrote, so they are not a member census. The detector flagged
  them because the file binds `lines` from a read elsewhere.
- **FF-11903.** 60 → 55 against the ceiling of 55. PR #6's squash read 135/01's move of the examples
  modules as D + A, so `.aof/rename-ledger.tsv` gains PR #6's 9 rename records, derived with the
  resolver's own argv exactly as 136/F-136-01 derived PR #5's. 147's and 149's evidence cited two
  test-bed files as bare `src/` paths, and they are now spelled `aof-test-repo/src/…`. 148/02 removed
  two.
- **FF-12401.** The census counted the numeric `depends:` of three backlog rows (148's refine shattered
  them, naming 148 and 153). The lane never counts a backlog row as a source (127/ADR-002 §3). The
  control's domain now excludes backlog rows whole, as the lane does.
- **`work-this-tree-holds-what-is-live` 02 stays red (F-148-06).** Twelve done items sit at the root:
  134–136, 143–147 and 149–152. Archiving them is the operator's act (127/ADR-004), and the operator
  will do it before the gate is re-run.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-148-01 | 152 (`a035aa5d`, on this branch) left FF-11904's `test/work/stream` row at 36 against 35 and `promote/candidates.mjs` off the native-port list; 7 cases red in the story lane. | defect | major | blocker, fixed in the item | `c73e7ed1` | fixed |
| F-148-02 | 148/02's `files:` declared `lesson-meta-normalised.suite.mjs`; the suite is `memory-meta-normalised.suite.mjs`. | defect | minor | fixed at verify | 148/02 `STORY.md` | fixed |
| F-148-03 | The whole-tree gate is red at `main` on eight controls (see `## Regression gate`), seven from #7 and one from 134 not yet archived. | defect | major | blocker for the milestone door | this branch: the seven controls are repaired (`## Regression gate`, repairs after the run); the archive half is F-148-06 | fixed |
| F-148-04 | 23 lessons record what worked ("confirmed approach", "insight", "confirmation"), and no kind fits them, so they count as non-enum. | gap | minor | non-blocker: the SPEC holds the vocabulary as prescribed | a later SPEC (a fifth kind, or a ruling) | open |
| F-148-05 | The gate's reds that are this branch's: two suites pin the stream row at 35, and the Plan 09 ledger holds a stale hash. | defect | major | blocker for the milestone door | this branch | fixed |
| F-148-06 | Twelve done items (134–136, 143–147, 149–152) sit at the root of `wiki/work`, so `work-this-tree-holds-what-is-live` 02 is red and the whole-tree gate cannot go green. | defect | major | blocker for the milestone door | operator: `aof work archive` for each (127/ADR-004), then re-run `aof work regression-gate 148` | open |
