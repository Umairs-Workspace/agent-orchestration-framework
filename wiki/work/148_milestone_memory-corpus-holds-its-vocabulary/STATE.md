---
doc: state
---
# 148 · The memory corpus holds its vocabulary — State

## Progress

- [x] `01_story_the-ranking-is-held-by-an-eval`: built, reviewed and accepted 2026-10-06 (2 tasks)
- [x] `02_story_a-lessons-meta-line-is-normalised-on-read`: built, reviewed and accepted 2026-10-06 (3 tasks)
- [x] `03_story_story-retrospectives-are-indexed`: built, reviewed and accepted 2026-10-06 (1 task)
- [x] `04_story_a-live-lessons-meta-line-is-held`: built, reviewed and accepted 2026-10-06 (3 tasks)
- [x] `05_story_memory-status-reports-conformance-and-layers`: built, reviewed and accepted 2026-10-06 (2 tasks)

## Notes & decisions in flight

- **Refined 2026-10-04** (`aof:refine 148 --autonomous`, solo). ADR-001 to ADR-008, FF-14801 to
  FF-14803 declared `pending`. Graph built `2026-10-04T15:28:59Z`, code only.
- **Business questions, answered by the operator at the end review (2026-10-04):**
  - 148/02 Q1: a Kind outside the four is indexed as written and counted as non-enum. No synonym
    table.
  - 148/05 Q1: status names a lesson's layer as procedural.
- **Default decisions taken** (non-critical, in the ADRs, open to objection at review):
  - `tags` is a new array field under index version 2, departing from m39/ADR-001's reuse (ADR-003).
  - The vocabulary lives in `@aof/work/memory-vocabulary`, because validate cannot import
    `@aof/knowledge` (ADR-001).
  - Owner must be present but is not held to a list. The prompt prescribes "the role/lane" (ADR-002 §4).
  - A qualifier after the word is legal on a live lesson: `near-miss (recurring)` conforms (ADR-007).
  - The archived advisory is a doctor `warn` lane, one finding per file (ADR-007).
  - The eval guards the base ranking only. The graph re-rank reads a git-ignored artifact (ADR-005).
  - Staleness of a pre-version-2 store is reported by each backend, nested under `index` (ADR-003),
    and it moved from 05 to 02 during refine because only the backends hold the store's version.
  - 02's block-line rule moved to 05 when 02's map went over the four-rule limit.
- **Live non-conformers**: 26 lessons in 14 live retrospectives fail the hold today. 04 re-classifies
  them, keeping the written word as the qualifier. The list is re-measured at build, because
  134 to 136 may be archived first (134/01/R2).
- **Observation, not a question**: 23 lessons record what worked ("confirmed approach", "insight",
  "confirmation"), and no kind fits them. The SPEC holds the vocabulary as prescribed, so they count
  as non-enum. A fifth kind would be a SPEC change for a later item.

## Verification

- [ ] `@executable` suite green — story lanes green; the whole-tree gate is red (VERIFICATION F-148-03, F-148-05)
- [x] Fitness functions green (FF-14801 to FF-14803), each with its red probe in VERIFICATION
- [x] `@manual` 148/04 task 02 recorded in VERIFICATION

## Feedback (for retro)

- **148/01 build, 2026-10-05: `aof test --scope impacted --story` ran the whole suite.** Both of the
  story's declared test files were new, so the impacted selection widened to everything, on the
  control node where `:4182` is held. The run was stopped by hand. Story lanes here need `--only`
  over the declared `files:` until the widening is bounded. (Raised by: developer, solo.)
- **148/01 review (QA): 19 of the 25 pairs are gist queries, and they hold with a wide margin.**
  Each paraphrases the line a recall recorded, so its record ranks first. They catch a record that
  drops out of the pool or a scope that stops matching, and a coarse ranking change. The six
  recorded-query pairs (05 ×2, 124, 126, 129, 138) are the ones near the line, at ranks 1 to 4. A
  later item could add pairs from recalls whose record ranked third to fifth. (Raised by: QA, solo.)
- **148/01 review (QA): `rankRecords` returns every in-scope record, zero-score ones included.** So
  "the ranking never returns it" happens only when the scope filters the record out, or under an
  injected ranker. Otherwise a non-matching record shows as lost at a low rank. The verdict is
  correct either way. (Raised by: QA, solo.)
- **148/02 build: the declared `files:` missed six paths.** They are
  `packages/knowledge/test/memory-meta-normalised.suite.mjs` and its index (the parser and backend
  scenarios, kept in `knowledge` so `work` never imports it), `packages/work/test/index.mjs`,
  FF-14802's `test/arch/work/acd-memory-vocabulary-one-home.test.mjs` and its index, and
  `.aof/aof.lock.json` (the OUTCOME template's hash). The importer sweep also moved pins on the old
  record shape in 12 suites: 13 fields → 14, `tags` an array, version 1 → 2, m01's stage
  `build→verify` → `build` + tag, the work-memory JSON goldens, and the `knowledge` import
  allow-list in `test/bundle/yarn-installation.test.mjs`. (Raised by: developer, solo.)
- **148/02 review (architect): `local-indexing` now imports `local-retrieval`** for
  `indexVersionReport`, the module both backends already share. That's acceptable, and noted
  because indexing imported no retrieval code before. (Raised by: architect, solo.)
- **148/02 measured on the live corpus, 2026-10-05, for VERIFICATION** (records built in memory,
  isolated `AOF_GLOBAL_HOME`, 489 lessons). Each figure reads as written → as indexed. Kind: enum
  333 → 345, non-enum 65 → 53, 36 → 25 spellings. Area: enum 298 → 321, non-enum 100 → 77, 69 → 50
  spellings. Stage: enum 310 → 383, non-enum 88 → 15, 59 → 14 spellings. Blank stays 91 on all
  three, counted and never guessed. Gap status: 12 spellings → 3 (open 412, discharged 33,
  open-by-decision 1). 82 lessons carry tags. FF-6604's differential shows no title, summary or
  text changed. Red probe: a planted `open-by-decision` in `none-backend.mjs` turns FF-14802 red,
  naming the file.
- **148/03 build: FF-14801 lost one pair once story lessons joined the pool, and the pair was
  moved, not muted.** 126's recorded query ("supervised declaration reconcile … attempt") ranked
  36/ADR-002 fourth. It sat in a near-tie with 68/ADR-002 and 53/ADR-004, all three surfaced by that
  same recall and within 0.14 of each other. The grown pool shifted the term statistics, and the tie
  reordered to 6th. No story lesson entered the top five. The pair now quotes the gist 126's recall
  recorded for 36/ADR-002 (rank 1, 49.0 against 20.0), keeping its record and provenance, and the
  reason sits beside it in the table. A tie that reorders is the case ADR-005 named when it rejected
  a rank-1 pass line. (Raised by: developer, solo; confirm at verify.)
- **148/03 measured on the live corpus, 2026-10-05:** lessons 489 → 788, all 299 new ones from
  story folders (284 at refine on 2026-10-04; more stories have written retrospectives since).
  Records 2,895 → 3,194. The importer sweep (85 files, 925 cases) passes.
- **148/04 build: the declared `files:` missed six paths.** They are the doctor lane roster in
  `test/arch/audit/acd-controls-never-execute.test.mjs` (each lane is named in the change that
  lands it), the `packages/work/src/doctor` row of `acd-source-directory-budget` (10 → 11) and the
  examples-lane test that pins that row (`test/examples/doctor-examples-lane.test.mjs`), the
  per-file `node:path` port in `test/bundle/yarn-installation.test.mjs`, and 149's retrospective,
  which was not live at refine. The declared `lesson-meta-hold.test.mjs` is a `.suite.mjs`, because
  a package `.test.mjs` must be native `node:test`. All six are now in `files:`. (Raised by:
  developer, solo.)
- **148/04 build: milestone 148 left six directory-budget rows red, and 04 raised them.** The new
  files of 01, 02, 03 and 05 grew `packages/work/src`, `packages/work/test`, `packages/knowledge/test`,
  `test/arch/memory`, `test/arch/work` and `test/memory`, and no story declared a raise. That is
  the 146/R1 recurrence. Each row now names its story and file. (Raised by: developer, solo.)
- **148/04 measured on the live tree, 2026-10-06, for VERIFICATION** (`node packages/core/bin/aof.mjs
  work validate`, source run). Before: 56 problems on 29 lessons in 14 retrospectives. 134/01 to
  134/05, 135/03 to 135/05, 136, 144, 145 and 146 match the refine list; 149/R5 is new. After:
  `PASS — work stream is well-formed`. Each written word is kept as the qualifier:
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
  - 145 and 146 had no meta line on any lesson; one is now authored from each lesson's text. 145:
    R1 mistake (recurring) · process · build · developer; R2 mistake · code · build · developer;
    R3 misunderstanding · contract · refine · product-owner. 146: R1 mistake (recurring) · process ·
    build · developer; R2 mistake · process · refine · architect; R3 mistake · contract · refine · qa.
  - No `RETROSPECTIVE.md` under `archive/` is in the diff. The prompt's step 4 states the hold, and
    `aof work update` refreshed the `.claude`, `.opencode` and `.codex` copies (FF-14802 green).
- **148/04 review: the archived lane reports 94 retrospectives on the live tree**, one `warn` each,
  so `aof work doctor` prints 94 more lines by default. This is ADR-007's design, one warning per
  file and never back-filled, and the count falls only as items leave the stream. Recorded, not
  routed. (Raised by: architect, solo.)
- **148/04 sweep: reds that are not 04's.** FF-12401's census reads 316 against 320 edges, and grade/01
  fails at HEAD because `loop-command-stops` names `grade-indeterminate`. FF-9603 (152's
  `PLAN.md`), the `test/work/stream` budget row and the `promote/candidates.mjs` native port belong
  to the uncommitted 152 work in this checkout. (Raised by: developer, solo.)
- **148/05 build: the declared `files:` missed four paths.** Two suites pinned status's old shape:
  `test/command/work-memory-command.test.mjs` (the human and `--json` goldens and the none-backend
  probe) and `test/arch/command/acd-work-memory-routed.test.mjs` (one status line). The other two
  are the per-file port that lets `local-retrieval.mjs` import `@aof/work/memory-vocabulary`, and
  the budget rows for the two new test files. The counting lives beside the layer map as
  `statusPartition`, and the seam composes it, so no backend was edited. `types` is in name order,
  so the document does not depend on recall's order. (Raised by: developer, solo.)
- **148/05 measured on the live store, 2026-10-06** (graphify, built before 04's re-classification):
  3,202 records, layers episodic 0 · semantic 2,411 · procedural 791. Conformance: kind blank 128
  non-enum 131 · area blank 128 non-enum 156 · stage blank 128 non-enum 31 · owner blank 128 · gap
  status non-enum 0. FF-14803 red probe: drop `summary` from `RECORD_TYPE_LAYERS` and leg (a)
  fails, naming `unmapped: summary`. The 05 importer sweep (93 files, 2,097 cases) shows no red of
  05's. Its other reds: FF-11903 (58 unresolved citations, none in a document 04 or 05 touched),
  FF-11908 (a `command-core` binding line), and the `this-tree-holds-what-is-live` row, where 134
  is done but not archived. 152's budget and port rows are red too. (Raised by: developer, solo.)
- **148/05 review: `status` now runs one unbounded recall**, which on graphify also loads the graph
  for re-ranking. ADR-004 chose that cost so the counting has one home. Recorded, not routed.
  (Raised by: architect, solo.)
