---
doc: verification
---
# 127 · Backlog and archive — the work tree holds what is live — Verification

## Verification evidence

### `127/01` — one enumerator, three roots

- **`node scripts/test.mjs --only test/arch/work/acd-work-root-one-enumerator.test.mjs test/arch/work/acd-number-null-safe.test.mjs test/arch/work/acd-next-walkers-exclude-archived.test.mjs test/work/stream/work-backlog-archive-enumerate.test.mjs`**
  under an isolated `AOF_GLOBAL_HOME` — the three controls this story lands plus its own driven
  suite: **176 pass / 0 fail**, exit 0. Story-attributable within it: **11** control rows (FF-12701
  four legs, FF-12702 three, FF-12706 four) and **165** driven rows in
  `work-backlog-archive-enumerate` (`00` forty-one, `01` three, `02` forty-one, `03` sixty, `04`
  twenty) — every `@executable` scenario and every Examples row of tasks 00–04 has a case whose name
  carries the task prefix and the scenario's own headline.
  `verifies → tasks/00_listitems-walks-three-roots.feature`,
  `tasks/01_item-re-has-one-home.feature`, `tasks/02_one-predicate-decides-who-filters.feature`,
  `tasks/03_validate-and-doctor-read-three-roots.feature`,
  `tasks/04_every-number-consumer-is-null-safe.feature`
- **`node scripts/test.mjs --only` over the other seventeen suites the story's `files:` declares**
  (`test/work/work.test.mjs`, `lifecycle/work-list`, `lifecycle/work-next`,
  `lifecycle/work-observe-scope`, `lifecycle/work-observe-attribution`, `record/work-doctor`,
  `doctor-freshness-structural`, `doctor-depends-lane`, `doctor-coherence-completeness`,
  `migrate-command-core`, `planning/tune-provenance`, `planning/promote-finding-to-chore`,
  `stream/work-reindex-count-shifted`, `arch/testing/acd-source-directory-budget`,
  `arch/loop/acd-loop-registry-not-an-item-type`, `arch/grade/acd-acceptance-horizon-single-predicate`,
  `arch/session/acd-session-driver-mesh-blind`) under an isolated `AOF_GLOBAL_HOME` — the owning
  suites of every file the story retired a scanner from, re-pinned or pushed a ratchet on:
  **233 pass / 0 fail**, exit 0. `test/work/lifecycle/work-observe.test.mjs` is `node:test`-shaped
  and cannot ride the array runner; run apart as `node --test` under the same isolation:
  **21 pass / 0 fail**. The story's lane in total: **430 pass / 0 fail**.
- **The lane was scoped to the story, deliberately.** `aof test --scope impacted --story 127/01`
  widens to `all` structurally (`src/bundle/commands/recent.md` and `wiki/work/TECH_DEBT.md` are
  not-in-graph by nature), and `all` dies on `:4182` on this machine. The whole-tree run belongs to
  `aof work regression-gate 127` at the milestone door, where the reds `F-09` records are already
  known to be waiting.
- **`@manual` — task 05, the three red probes**, each run inline by this accept: the subject backed
  up to the session scratchpad, the probe applied by a script (the files are CRLF, so a byte-exact
  anchor rather than a line edit), the control run alone through `node scripts/test.mjs --only`
  under an isolated `AOF_GLOBAL_HOME`, the subject restored from the backup and verified
  byte-identical by `cmp` before the next probe. The probe text, the legs that went red and the
  messages observed are the rows under `## Fitness functions`; the tree carried no probe across any
  hand-back. `verifies → tasks/05_the-three-controls-go-red-on-contact.feature`
- **`aof work validate 127/01`** — `[]`, exit 0: **PASS — 127/01 is well-formed.**
  `aof work loops validate` — 33 warn, 0 error, exit 0.
- **`aof work doctor 127/01`** at accept — four warns, none of them `control-unresolved` at either
  severity: `numbering-gap` (42 and 122 are missing between 00 and 127 — the stream's, not this
  story's), `doc-over-budget` (`F-08`, cleared before the verb ran), `rubric-join-unchecked` and
  `depends-edges-unchecked`.
  Loop-Ready 80% (8/10). At milestone scope the three `control-unresolved` warns are FF-12703,
  FF-12704 and FF-12705 — stories 02 and 03's, declared `pending` and not this story's to land.
- **No `@uat` scenario exists in this story** — five task features are `@executable` and one is
  `@manual`, so no human sign-off applies.
- **No UI surface** — the story writes `src/work.mjs` and its readers and no frontend; the
  milestone's `DESIGN.md` surfaces are the board's (story 04). The design-conformance step does not
  apply and no renderer precondition was evaluated.

## Fitness functions

<!-- One row per control declared in ARCHITECTURE.md's register. Each row is filled when the
     control LANDS with its story: the result observed and the RED PROBE (what was changed to make
     it fail, and the message seen). A declared control with no red probe here is not verified. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-12701 | `test/arch/work/acd-work-root-one-enumerator.test.mjs` | GREEN (4/4) | Two probes, both the ones the register row names. **(a) A second regex home.** `src/work/doctor.mjs` was given back its private copy — `ITEM_RE,` dropped from its `../work.mjs` import clause and `const ITEM_RE = /^(\d+)_(milestone\|story\|task\|uat\|spike\|chore)_([a-z0-9-]+)$/;` appended. (Pasting the const while the import stands is a duplicate binding — `SyntaxError: Identifier 'ITEM_RE' has already been declared` — which kills the runner at module load before any sweep runs; `F-02`.) Legs 1 and 2 went red: leg 1 observed `AssertionError [ERR_ASSERTION]: one definition of each, both in src/work.mjs` with actual `['src/work.mjs:BACKLOG_ITEM_RE', 'src/work.mjs:ITEM_RE', 'src/work/doctor.mjs:ITEM_RE']`, naming the second definition; leg 2 `doctor.mjs imports ITEM_RE from ../work.mjs`. **(b) A second scanner.** `import { readdirSync } from "node:fs"` added to `src/work/reindex.mjs` (which already imports `ITEM_RE`) and `readdirSync(workDir)` called inside `countShiftedByInsert`. Leg 3 went red alone, observing `AssertionError [ERR_ASSERTION]: undeclared work-root scanners (a readdir paired with an item-name match): src/work/reindex.mjs — retire onto listItems, or add a keeper row WITH its reason`, actual `['src/work/reindex.mjs']`. Legs 1, 2 and the self-check stayed green in the same run. Both subjects restored and verified byte-identical by `cmp`. |
| FF-12702 | `test/arch/work/acd-number-null-safe.test.mjs` | GREEN (3/3) | The `item.number != null` guard removed from `appendPosition`'s row filter in `src/work-promote/promotion.mjs` — `.filter((item) => item.parent == null && item.number != null)` became `.filter((item) => item.parent == null)`. Leg 2 went red alone, with exactly one finding, as file:line: `AssertionError [ERR_ASSERTION]: unguarded .number sites: src/work-promote/promotion.mjs:65 — \`parseInt(item.number, 10)\` in appendPosition is preceded by no isLiveStreamRow call, no \`.number != null\` guard and no story narrowing`. Leg 1 (the ten-file set is exactly the ten) and leg 3 (the classifier's self-check) stayed green in the same run. Subject restored and verified byte-identical by `cmp`. |
| FF-12703 | `test/arch/work/acd-one-mint.test.mjs` | pending (127/02) | — |
| FF-12704 | `test/arch/work/acd-intake-write-side-only.test.mjs` | pending (127/02) | — |
| FF-12705 | `test/arch/work/acd-archive-never-renumbers.test.mjs` | pending (127/03) | — |
| FF-12706 | `test/arch/work/acd-next-walkers-exclude-archived.test.mjs` | GREEN (4/4) | Two probes, both the ones the register row names. **(a) A resolving reader filters.** `matches = matches.filter((row) => !row.archived);` inserted into `findWork` ahead of its row loop (`src/work.mjs:989`). Legs 1 and 4 went red: leg 1 observed `AssertionError [ERR_ASSERTION]: findWork is a resolving reader and filters on neither \`archived\` nor a status standing in for it`; leg 4, the fixture leg, `findWork("05") answers the archived driver — 0 !== 1`. **(b) A walker stops filtering.** `.filter(isLiveStreamRow)` dropped from `nextWork`'s driver walk (`src/work.mjs:1517`). Leg 4 went red, observing `AssertionError [ERR_ASSERTION]: the ready set holds the live rows only (got 10/00, 11, gamma, epsilon, delta, 06)` — the three backlog leaves and the archived `06` proposed as ready. Leg 1's textual half stayed GREEN on this probe: `nextWork` references the predicate a second time in its story walk (`:1611`), so a partial drop is caught by the fixture leg and not by the token test — recorded as `F-01`. Subject restored and verified byte-identical by `cmp` after each probe. |

Every probe recorded above was applied to a backed-up copy of its subject, run through
`node scripts/test.mjs --only <control>` under an isolated `AOF_GLOBAL_HOME`, and the subject
restored and verified byte-identical before the next probe ran. Three of the six declared controls
now carry a row; the other three land with stories 02 and 03.

## Findings

Reported unnumbered by the build lane and the review close (`STATE.md` `## Feedback (for retro)`
and the review-close entry) and by this accept; ids allocated here, at the moment of landing.

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | FF-12706's textual leg is per-FUNCTION, and `nextWork` references `isLiveStreamRow` twice — the driver walk (`src/work.mjs:1517`) and the story walk (`:1611`). Dropping the predicate from the driver walk alone left the token test green; the fixture leg caught it (`gamma, epsilon, delta, 06` in the ready set). The register row's "asserted textually, AND driven over a fixture" holds — the control went red — but the two legs are not equally load-bearing. | test-gap | low | non-blocker; accepted as-is. The fixture leg is the enforcing leg for a partial drop and the token test is the fast-fail for a wholesale one; a positional token test (`.filter(isLiveStreamRow)` before `.filter(isDriver)`) would pin an ordering the walk does not owe. Recorded so no reader takes the token test as the enforcement. | `127/01` (recorded on the FF-12706 row) | closed |
| F-02 | Task 05's first probe, as spelled — "a private `const ITEM_RE = …` is pasted back into `src/work/doctor.mjs`" — cannot reach the control: doctor.mjs also IMPORTS `ITEM_RE`, so the paste is a duplicate binding and the runner dies at module load (`SyntaxError: Identifier 'ITEM_RE' has already been declared`) before the sweep runs. Applied as the pre-127 shape instead — import dropped, private const added — which is what "pasted back" means. | contract-wording | low | non-blocker; ratified here. The `.feature` is immutable once delivered; the probe's meaning and the observed parser refusal are both on the FF-12701 row. | `127/01` | closed |
| F-03 | Review-close amendment (a), ratified: task 03's scope outline row `ideas` says `aof work validate ideas --json` answers `[]` at exit 0. The face reports one `scope-not-found` finding at exit 1 by design (TECH_DEBT item 11, paid 2026-09-05); the suite asserts the engine (`validateWork(…, "ideas")` → `[]`), which is the true statement. | contract-wording | low | non-blocker; ratified — the accepted criterion is the engine's `[]`, and the face's `scope-not-found` at exit 1 is the accepted behaviour. No `.feature` edited. | `127/01` | closed |
| F-04 | Review-close amendment (b), ratified: task 01's "observe enumerates through the enumerator" step "holds no `readdir` of the work root" cannot hold for `countUnattributedRuns` — its question is "which run records sit under NO item", an orphan lane by nature, and `work-observe-scope/02` pins that a stray non-item dir's runs are counted. Built as a raw root listing that takes the item set from `listItems` and the root names from the exported constants, with no item-name match of its own; FF-12701's sweep verdict for `observe.mjs` ("no pairing") holds. | contract-wording | low | non-blocker; ratified — the accepted reading is "no item-name match of its own". Both review lenses confirmed the shape. No `.feature` edited. | `127/01` | closed |
| F-05 | The story's declared `files:` was short by nine at build: `src/bundle/manifest.json` (derived), the three tracked renders of `recent.md` (`.claude/…`, `.codex/…`, `.opencode/…`) plus `.aof/aof.lock.json` (FF-7106 names exactly these), and four ratchets/pins the new suites tripped (`acd-source-directory-budget` 43→46 and 31→32, `acd-loop-registry-not-an-item-type` — it enshrined the THREE `ITEM_RE` homes — `acd-acceptance-horizon-single-predicate`'s pinned `:242`→`:244`, `acd-session-driver-mesh-blind`). Repaired at cascade cycle 5 as a declaration repair; FF-7106 no longer names 01. The species is `m126/F-05` and `m126/F-07` for the third time: derived renders and ratchets are unforeseeable from a write set at refine. | design-gap | medium | non-blocker; the story's instance is repaired. The convention gap stays open and is carried to `RETROSPECTIVE.md`: a story that edits a bundle prompt should declare the manifest, the renders and the lock; a story that adds a suite or retires a pinned regex should declare the ratchets and pins it will trip. | product-owner / refine convention | open |
| F-06 | `test/arch/session/acd-session-driver-mesh-blind.test.mjs` admits a SECOND route into `work.mjs` — `work/observe.mjs -> work.mjs` — because `observe.mjs` now takes its items from `listItems` instead of its own `readdir`. The driver reaches `observe.mjs` only for `claudeProjectsDir`, `work.mjs` was already in its closure via `terminal-ws.mjs`, the reach ceilings are unchanged and no denied subtree is entered; only the edge set into an admitted module grows by one. The build recorded it "for `aof:verify 127` to ratify". | arch-admission | low | ratified at this accept: the admission is a consequence of FF-12701's own rule (one enumerator), and FF-12701 is the control that holds `observe.mjs` to it. | `127/01` | closed |
| F-07 | `ARCHITECTURE.md`'s register still marked FF-12701, FF-12702 and FF-12706 `*(pending — 127/01)*` after all three control files had landed and gone green. `aof work doctor 127` resolves them (it reads the disk, not the marker), so nothing refused the stale text — `m126/F-06`'s species. | defect | low | closed at this accept: the three markers dropped, since what clears a `pending` is landing the file. | product-owner | closed |
| F-08 | `aof work doctor 127/01` warned `doc-over-budget`: `STORY.md` was 159 lines over the 150-line budget — the nine `files:` lines `F-05`'s repair added. Not advisory at the door: `aof work status 127/01 done` REFUSED on it (`Acceptance refused for 127/01: STORY.md is 159 lines, over the 150-line budget`). | defect | low | closed at this accept: the `## Notes` contract-deltas entry (13 lines, verbatim in `STATE.md` "Story 01 refined 2026-09-11") condensed to a five-line pointer, the keeper note to one line, the `## Tasks` template comment dropped — 147 lines; the `files:` declaration untouched. The verb then accepted. | product-owner | closed |
| F-09 | Whole-tree reds at HEAD that this story neither caused nor can fix, each classified at the source by control, subject and mtime across cascade cycles 3–5: **FF-11903** (`acd-cited-path-resolves`, 49 unresolvable `src/` citations vs a shrink-only ceiling of 47 — 127's ARCHITECTURE/SPEC/story docs cite `src/commands/promote.mjs` and `src/commands/archive.mjs` before stories 02/03 land them); **FF-7106** for story 02 (34 rows) and story 03 (4 rows) — their `files:` need `F-05`'s repair at their refine/build; **`acd-frozen-set-compiled` ×2** and **`53/00 task01`** (control and subject byte-identical to HEAD — HEAD's reds); **`m42-item-3`** (`src/loop-diag.mjs`, another lane's untracked file); **FF-5307** (`ui/` hash drifted from the 2026-09-11 re-pin — the fleet lane's; 01 writes no `ui/`); **FF-12405 leg 3** (`src/bundle/commands/refine.md`, the loop lane's). These made the story's whole-tier grade un-greenable — FF-11903 cannot clear before 02/03 land, and the cascade would not reach 02/03 before 01's grade was green — which is the deadlock the operator broke by invoking this accept by hand. | defect | medium | non-blocker for `127/01` → blockers for the MILESTONE door. FF-11903 resolves when 02/03 land their modules; the two `files:` gaps are 02/03's refine; the HEAD reds and the other lanes' are the regression gate's to bisect. | `aof work regression-gate 127`; `aof:refine 127/02`, `127/03` | open |
| F-10 | `test/work/brief-pinned-to-the-stream.test.mjs` ×2 is red at HEAD because the refine brief's ADR condenser (`src/phase-brief.mjs`) slices a `**Decision.**` passage and 127's ADRs are written with `### Decision` sections — it finds 0 decision passages, so 127/01's own brief carried "All 0 decisions listed" and omitted ADR-002's text. The story was built from the full `ARCHITECTURE.md` (in `reads:`), so the code is right; the brief was not. | defect | medium | non-blocker for `127/01`; the milestone's. Either 127's ADRs adopt the passage shape the condenser slices, or the condenser learns the section shape — the architect's call, and one that touches every brief for stories 02–05. | architect (`127` ARCHITECTURE.md) / `src/phase-brief.mjs` | open |
| F-11 | Loop-harness observations measured while this story sat `in-review` across cascade cycles 3–5 and three re-drives (`STATE.md` feedback, verbatim there): a story's grade is taken over the SHARED checkout, so it carries every other lane's uncommitted reds (6 of 7 here) and re-drives `continue` on reds the story cannot fix until the review cap halts it; a RESTARTED cascade re-drives `continue` on an `in-review` story because `lastPhase` is supplied only in-process and nothing reconstructs it from the run records; two NEEDS_INPUT stops were left `running`, reclaimed `runtime_offline` ~2.5 h later, and read as reaffirmation; the progress sampler charges the whole checkout's edits to the run; the grade record carries 3 of 11 failing cases and the truncation line points at two records that hold the same 3. | design-gap | medium | non-blocker for `127/01` — none of it is in this story's write set (`src/work/loop.mjs`, `src/commands/loop.mjs`, the grader). Story-sized, not chore-sized: a story-scoped fitness selection or a per-lane worktree for the grade; resume-path routing of an `in-review` story to the gate; a NEEDS_INPUT that parks rather than runs; a grade record that keeps every failing case. Carried to `RETROSPECTIVE.md` as `R4`–`R7` and to the milestone's `## Notes` for the operator to place. | retrospective / operator (future item) | open |

## Accept decision

**`127/01` ACCEPTED** — 2026-09-12. The story's lane is green (430 pass / 0 fail across its own
suite, the three controls and the seventeen owning suites its `files:` names, plus the
`node:test`-shaped observe suite), all three of its declared controls are green and were each
observed failing under the probe the register names — FF-12701 naming a second regex home and a
second scanner by file, FF-12702 naming an unguarded `.number` site as `file:line`, FF-12706
catching a resolving reader that filtered and a walker that stopped filtering over the three-root
fixture. Task 05's `@manual` evidence is the three fitness rows. `aof work validate 127/01` reports
PASS, `aof work loops validate` reports no error, `aof work doctor 127/01` reports no
`control-unresolved` at either severity, and no blocker finding against this story is open:
`F-01`–`F-04` and `F-06`–`F-08` closed here, `F-05` a non-blocker carried to the retrospective.

`F-09` and `F-10` are inherited whole-tree reds this story neither caused nor can fix — FF-11903
cannot clear before stories 02 and 03 land the modules 127's documents already cite — and they are
blockers for the MILESTONE door, not for this story. This accept is the operator's force-proceed
that `STATE.md`'s cycle-5 entry named as the only exit from that deadlock. `F-11` is the loop
harness's, carried to the retrospective. The milestone stays open: `127/02`–`127/05` are
unaccepted, three of the six declared controls carry no red-probe row yet, and
`aof work regression-gate 127` has not run.
