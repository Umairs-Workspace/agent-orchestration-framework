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

### `127/05` — this tree holds what is live (build evidence, developer, 2026-09-16)

The `@manual` task 01 was run ONCE, for real, by the build lane in its dispatch worktree
(`aof/mesh/127-05`, base `ba25547`), in the contract's order, and its post-state is task 02's
`@executable` suite over the real tree. Every number below was read at the source.
`verifies → tasks/01_every-done-driver-moves-under-archive.feature`

- **(0) Before.** `git status --porcelain` was ` M .aof/aof.config.json` (the one intake line,
  task 00), ` M …/05_story_…/STORY.md` (the lane's own status stamp) and the lane's two untracked
  `runs/` entries — nothing of another lane's. The link census (03/01's syntactic scan over every
  `.md` under `wiki/work`) at `ba25547`, 08:51Z: **3,069 relative inline links, 2,312 resolving**
  (312 files); of the 1,156 targeting a folder about to move, 48 were already broken (bare
  `src/work.mjs#L458`-shaped citations in `OUTCOME.md` files). `aof work debt --json`: 99
  findings. `aof work doctor --json`: 1,344 findings, 0 errors. `aof work validate --json`: 117
  findings, every one `story reads path "…" does not exist` (see the third delta below).
- **(1) The confirm gate.** `aof work archive --done --json` without `--yes` → exit 1,
  `archive-confirm-required`, **125 candidates** (67 milestones, 19 stories, 4 spikes, 35
  chores), none of `127`, `129`, `130`, `32`, `42_structural-overhaul` absent;
  `git status --porcelain` byte-identical to the recording. The CLI envelope carries
  `candidates` at the top level (the in-process error's `detail.candidates`, flattened by the
  face). The list, verbatim:
  `00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 33 34 35 36 37 38 39 40 41 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 91 92 93 94 95 96 97 98 99 100 101 102 103 104 105 106 107 108 109 110 111 112 113 114 115 116 117 118 119 120 121 123 124 125 126 128`.
- **(2) The move.** `aof work archive --done --yes --json` → exit 0 in 3.6 s. `archived`: 125
  entries in number order, `from` at the root, `to` under `wiki/work/archive/`; `rewritten`:
  **161 files, 1,710 links** (155 inside moved folders; 6 outside — `127/DESIGN.md` 2,
  `130/DESIGN.md` 12, `32/SESSION.md` 1, `42_structural-overhaul/ROADMAP.md` 1 and `STATE.md` 1,
  `TECH_DEBT.md` 11). `ls wiki/work` afterwards: `127_milestone_backlog-and-archive`,
  `129_milestone_loop-concurrency`, `130_milestone_stop-a-running-loop`,
  `32_uat_whole-mesh-acceptance`, `42_structural-overhaul`, `archive`, `loops.md`, `ROADMAP.md`,
  `TECH_DEBT.md` — no `backlog/`: git carries no empty directory, so the primary's untracked
  empty `backlog/` is the operator's and the first `aof:add-*` creates it (delta, STATE.md).
- **(3) Staged exactly the envelope's paths** (`wiki/work/archive` + each `from` + each
  `rewritten`, 287 pathspec entries, never `-A`): `git status --porcelain` = **2,289 `R`** (2,080
  byte-identical, 155 `.md` with link rewrites, 54 binary mocks/renders) **+ 6 `M`**, nothing
  else; `git diff --cached -M --numstat`: 1,562 insertions / 1,562 deletions, every changed line
  an inline-link line, no `number:`, `status:`, `updated:` or `---` line, and every `-`/`+` pair equal
  once the inserted `archive/` or `../` is removed. Committed as **`ed9c00c`** on the lane
  branch, so the resolver's rename map records the move (below). The link census re-run:
  **3,069 / 2,312 — identical**, every link resolving to the same path under the one remap,
  0 unmatched, 0 links still targeting a root path whose folder moved.
- **(4) The four links outside `wiki/work`.** `wiki/memory.md` lines 15, 130, 137, 147: target
  only, `work/05_milestone_work-memory/` → `work/archive/05_milestone_work-memory/`;
  `git diff wiki/memory.md` is exactly those four lines (CRLF kept), each target exists.
  the contract's grep for inline links into `work/[0-9]+_` over `wiki/**/*.md` outside `wiki/work/`
  now finds only the three `wiki/planning/PRD-command-spine-effects-ledger.md` links into
  `42_structural-overhaul`.
- **(5) The index.** `aof work memory ingest --json` from the lane root: **2,439 records**
  re-indexed (graphify, 28.3 s; 2,341 at 127/01's accept on 2026-09-12 — the tree grew since).
  `aof work memory recall "loop registry" --item 52 --json`: 5 records, every `source` under
  `archive/52_milestone_loop-registry-and-graph/`. The index is per-checkout and gitignored:
  the operator re-runs `memory ingest` in the primary after the merge.
- **(6) The ledger.** `aof work debt --json` before and after: the same 99 findings, the same
  summary (73 entries, 45 open); `wiki/work/TECH_DEBT.md`'s diff is 11 link lines. No entry for
  the three `ITEM_RE` homes or the seven scanners exists to delete (ratified at refine).
- **After.** `doctor --json`: 1,344 findings, 0 errors, no per-code delta. `validate --json`:
  117 findings — the same set; with the move uncommitted it was +323 (`reads:` citations of
  `wiki/work/<NN>_…` crossing the line, 127/03's QA measurement), and the commit clears them
  because `readRenameMap` follows the recorded renames (`git log --diff-filter=R` reads 2,289
  records in 0.3 s).
- **The path-readers.** 127/03's census named ten test files reading a real item folder; the
  move found **27** — seventeen spelled `path.join(…, "wiki", "work", "<NN>_…")` or as rows
  relative to the real work dir, plus two helpers deriving the item from a path's leading
  segment (`itemOf` in `acd-register-declaration-form`, the `[folder]` split in
  `work-validate-contract-parses`). Each archived item's reader now spells
  `wiki/work/archive/<name>` (an archived folder never moves again); 129's two readers resolve by
  ref through `findWork`. 03's census list is retired: over the moved tree every match of
  `grep -rnE "wiki/work/[0-9]+_" src test scripts --include=*.mjs` is a comment, a fixture plant
  or a string, and none reads (03/03's classification, held by 03's suite and by this story's).
- **`node scripts/test.mjs --only test/work/stream/work-this-tree-holds-what-is-live.test.mjs`**
  under an isolated `AOF_GLOBAL_HOME`: **19 pass / 0 fail** (task 00: 7 cases; task 02: 12).
  `verifies → tasks/00_the-repository-sets-intake-to-backlog.feature`,
  `tasks/02_the-outsider-check-passes-on-the-real-stream.feature`.
- **The blast radius of a 2,289-file move is the whole test tree**, so the lane ran what the
  story-scoped selection cannot (`aof test --scope impacted --story 127/05` widens to `all`, which
  dies on `:4182`): first the 91 suites naming an archived folder, then EVERY registered suite but
  `global-work-propagation` in nine `scripts/test.mjs --only` chunks under one isolated home —
  **10,435 pass / 62 not ok**. Of the 62, **38 are red by the same names at the primary's
  pre-move HEAD** (`ba25547`, run there under isolation: FF-11902 ×3, FF-11901·121, FF-11903 ×3,
  FF-6607b ×3, FF-5301/5302/7002, FF-5307, FF-12405, FF-9603, 119/00 ×2, bundle ×5, 70/05 ×3,
  96/02, 53/00 ×2, 38 clone/push ×4, 81/01, autonomous-shell-out, shell/12, loops-ledger leg 9,
  `archive-is-a-move: 04`); **19 are this worktree's, not the move's** — `ui/dist` is not fully
  built in a dispatch lane (asset-base-seam ×10, bundle-asset-manifest ×3, advertised-paths,
  mesh-ui ×4) — plus two `node:test`-shaped files the array runner reports as unusable; **one was
  contention** (129/04 task02, green alone); and **four were this story's to fix and are fixed**:
  03's pinned `test/work/stream` ceiling (34 → 35), ACCEPT-03's residue digest (the one
  `MILESTONE` constant in `work-loops-coverage-ledger` gained `archive/`), the link ratchet's
  whole-tree `==` (now `>=`, with the `==` on the moved files), and FF-11902's non-vacuity floor
  on this suite's own walk. Re-run alone afterwards: all four green; FF-11902 still red on its
  pre-existing offenders only and no longer names this story's files.


### `127/02` — promote mints the number

- **`node scripts/test.mjs --only` over the seventeen suites the story's `files:` declares**
  (`work-promote-mints-the-number`, `work-insert-top-level-places`, `work-init-config`,
  `work-intake-write-side`, `promote-finding-to-chore`, `acd-one-mint`, `acd-intake-write-side-only`,
  `acd-number-null-safe`, `acd-work-insert-command-bundle-parity`, `acd-work-command-cli-bijection`,
  `acd-work-command-route-coverage`, `acd-cache-read-surface-boundary`, `acd-source-directory-budget`,
  `acd-learning-edge-reaches-every-cut`, `command-core-contract`, `bundle`, `autonomous-shell-out-prompt`)
  under an isolated `AOF_GLOBAL_HOME`, 2026-09-17: **332 pass / 0 fail**, exit 0. Story-attributable
  within it: **137** `work/promote-mints-the-number` rows (tasks 00–02 and the resolver, the mint, the
  stamp, the `--at` slot-open, the archived-number refusal, `depends:`), **42** `work-insert/alias` rows
  (task 03), **13** `work/intake 127/02` rows and **10** `work/init-config` rows (task 04), FF-12703
  **5/5**, FF-12704 **3/3**. The first run of this lane on 2026-09-16 was 325 / 7: the seven were the
  command census (27 → 28, 03's `archive.md`) and FF-12405 leg 9 (the lock 03's reconcile dropped) —
  `F-13`, `F-14`, repaired at the door before this count.
  `verifies → tasks/00_promote-mints-the-number.feature`, `tasks/01_at-opens-the-slot-through-the-engine.feature`,
  `tasks/02_depends-are-validated-at-promotion.feature`, `tasks/03_insert-verbs-are-aliases-of-promote.feature`,
  `tasks/04_intake-is-the-write-side-default.feature`
- **`@manual` — task 05, the prompts followed against scratch projects**, run inline by this accept
  (2026-09-17): each `aof:add-*` prompt's steps were followed by hand — the scaffold written as the
  prompt describes it (a bare `number:`, `# <Title>`), then the CLI calls the prompt names — against
  a scratch project built by the enumerate suite's own `buildThreeRootFixture` or an empty
  `wiki/work` with the intake set as the scenario asks, under an isolated home. **36 of 36 checks
  hold** across the eleven scenarios: S1 the leaf `backlog/milestone_search-across-the-fleet/` with
  `SPEC.md` + `STATE.md`, no `number:` value, `# Search Across The Fleet`, nothing at the root,
  `find` → `number: null, backlog: ""`, `validate` `[]`, the hand-back naming `aof:promote <slug>`;
  S2 `backlog/ideas/later/chore_tidy-the-config/` and `find` → `backlog: "ideas/later"`; S3 under
  `"stream"` over `03_milestone_gap` + `07_milestone_last`, `aof work promote tidy-the-config --json`
  → `08_chore_tidy-the-config`, `number: 08`, no `backlog/` leaf left, no arithmetic in
  `add-chore.md`; S4 an absent key → `08_spike_de-risk-the-routing` through `promote`; S5 `find delta`
  → `number: null` (STOP: promote first, no `stories/` under the backlog leaf), `find 5` →
  `archived: true` (STOP: archived is out, `archive/05_…/stories/` gains nothing), `find 10` → the
  frozen live row (no `number`, no `archived`) and `10/01` scaffolded with `parent: 10` resolves;
  S6 `backlog/story_a-standalone-slice/STORY.md` + empty `tasks/`, no `parent:`, no `number:` value,
  a backlog row; S7 `depends: [gamma]` written verbatim and `promote after-gamma` refused
  `promote-depends-backlog` naming both ways out; S8 `find delta` → `number: null`, `promote delta`
  → `created.ref: "12"`, `12_milestone_delta` present and the backlog leaf gone, `status 12
  in-progress` accepted, then `promote gamma` → `13` (the same door for a chore); S9 gamma with
  `depends: [delta]` → `promote-depends-backlog`, no run minted, `refine.md` naming "promote that one
  first or drop the entry"; S10 `promote delta --at 10` → `shifted: 2`, delta at 10, alpha/beta at
  11/12, no count gate for two, the hand-back naming `aof:refine <NN>`; `promote epsilon` → 13 at
  the tail, `promote.md` pointing a spike at its `SPIKE.md` and `aof:verify <NN>`; S11 `aof work
  update` → `0 created / 0 updated / 0 drift` (153 skipped) and the 22 claude + codex renders of the
  eleven prompts match `src/bundle/manifest.json`'s hashes. `verifies → tasks/05_the-prompts-have-one-door.feature`
- **`@manual` — task 06, the two controls' red probes**, each run by this accept on the committed
  tree: the probe applied by a script, the control run alone through `node scripts/test.mjs --only`
  under an isolated `AOF_GLOBAL_HOME`, the subject restored by `git checkout` and the tree read clean.
  The probe text, the legs that went red and the messages observed are the FF-12703 and FF-12704
  rows under `## Fitness functions`. **`src/commands/insert-shared.mjs`: 638 lines at the story's
  HEAD (2026-09-12) → 628 after the build** — it shrank. The register rows for FF-12703 and FF-12704
  name `test/arch/work/acd-one-mint.test.mjs` and `test/arch/work/acd-intake-write-side-only.test.mjs`
  with no `pending` token. `verifies → tasks/06_the-two-controls-go-red-on-contact.feature`
- **`aof work validate 127/02`** — `[]`: **PASS**. **`aof work doctor 127/02`** — 0 errors, no
  `control-unresolved` at either severity.
- **No `@uat` scenario and no UI surface** — no human sign-off and no render applies.

### `127/03` — archive is a move

- **`node scripts/test.mjs --only` over the fifteen suites the story's `files:` declares**
  (`acd-tune-carries-no-second-rule`, `acd-declared-program-single-speller`, `work-archive-is-a-move`,
  `acd-archive-never-renumbers`, the three insert/bijection/route-coverage controls,
  `acd-source-directory-budget`, `command-core-contract`, `work-backlog-archive-enumerate`,
  `acd-harness-ruling-ledgered`, `harness-ruling-seam`, `acd-learning-edge-reaches-every-cut`,
  `acd-number-null-safe`, `acd-next-walkers-exclude-archived`) under an isolated home, 2026-09-17:
  **350 pass / 0 fail**, exit 0. Story-attributable: **61** `work/archive-is-a-move` rows (tasks 00–04:
  the refusals, the rename, the envelope, the rewriter's three shapes and its convergence, `--done`'s
  gate and list, the seam and the publish, the two path-readers and the census, the wrapper and the
  one `verify.md` line), FF-12705 **5/5**, and the enumerate suite's 165 rows the fixture extends
  through. `verifies → tasks/00_archive-moves-a-done-driver-verbatim.feature`, `tasks/01_only-the-links-that-cross-the-line-are-rewritten.feature`,
  `tasks/02_done-archives-every-done-driver-behind-one-gate.feature`, `tasks/03_the-fleet-follows-and-the-one-path-reader-survives.feature`,
  `tasks/04_the-prompts-drive-the-verb-and-never-archive-on-their-own.feature`
- **`@manual` — task 05, FF-12705's eight probes**: six on the committed tree (restored by `git
  checkout`, tree read clean) and two in a scratch copy of the repository with no `graphify-out/`
  directory (the gate worktree at the same commit — `ls graphify-out` answers nothing there), where
  leg (b) first reported the seam path found and passed alone. Every message is on the FF-12705 row.
  **The budgets this story moved**: `src/commands` 68 → **69**, `src/work` 41 → 42 (→ **43** at 04's
  `item-row.mjs`, one row, two stories, each with its why), `test/work/stream` 33 → 34 (→ **35** at
  05's suite), `test/arch/work` 48 → **49** — every raised row's `why` names 127/03 and the file;
  `src/effects` stays 12. The register row names both subjects (`src/commands/archive.mjs`,
  `src/work/archive.mjs`) and `test/arch/work/acd-archive-never-renumbers.test.mjs` with no
  `pending` token. `verifies → tasks/05_the-control-goes-red-on-contact.feature`
- **`aof work validate 127/03`** — **PASS**. **`aof work doctor 127/03`** — 0 errors, no
  `control-unresolved`.
- **No `@uat` scenario and no UI surface.**

### `127/04` — the fleet and the board see the shapes

- **`node scripts/test.mjs --only` over the story's suites plus the three controls its build moved**
  (`global-work-store`, `cache-read-seam`, `staleness-schema-v8-provenance`, `mesh-assignment-record`,
  `board-api`, `board-backlog-and-archive`, `acd-source-directory-budget`,
  `acd-next-walkers-exclude-archived`, `acd-session-driver-mesh-blind`,
  `acd-loop-state-rides-the-run-record`, `terminal-harness-shell-focus-keyboard`) under an isolated
  home, 2026-09-17: **153 pass / 0 fail**, exit 0. Task-attributable: **8** `global-work-store/127-04-00`
  rows (the projection, the round trip, the frame doors, a v8 file migrating in place, the fleet
  payload), **16** `cache-read/127-04-01` rows (the seam's rebuild, every cache-first reader, five CLI
  verbs on a remote node, the overlay rule), **7** `board-api/02`, **8** `board-backlog/03`, **8**
  `board-archive/04`, **5** `fleet-backlog/05`; FF-5307 (`board-ui.mjs` and the `ui/` digest) and
  FF-5301 (reach 74) green on their re-pins (`F-14`), shell/12 green with this suite a named
  host-node asker. `verifies → tasks/00_the-cache-row-carries-the-two-shapes.feature`, `tasks/01_a-remote-node-answers-for-a-backlog-or-archived-item.feature`,
  `tasks/02_the-list-route-takes-include-archived.feature`, `tasks/03_the-overview-shows-the-backlog-as-rows.feature`,
  `tasks/04_one-toggle-reveals-the-archive-with-one-mark.feature`, `tasks/05_the-fleet-partitions-the-backlog-out.feature`
- **`aof work validate 127/04`** — **PASS**. **`aof work doctor 127/04`** — 0 errors, no
  `control-unresolved`.
- **Design conformance and the `@uat` read** — recorded under `## Design conformance` and
  `## User sign-off` below.

### `127/05` — this tree holds what is live (accept)

- **The move's post-state re-read at the source, 2026-09-17** (the build's evidence above records
  the act; this reads what it left): `ls wiki/work` → `127_milestone_backlog-and-archive`,
  `129_milestone_loop-concurrency`, `130_milestone_stop-a-running-loop`,
  `131_milestone_the-human-in-the-loop`, `32_uat_whole-mesh-acceptance`, `archive/` (126 entries: 125
  moved drivers, 42's imported milestone the operator archived at 4caeec4, and the GSD-era
  `.gsd-archive` record), `backlog/`, `ROADMAP.md`, `TECH_DEBT.md`, `loops.md`; `aof work find 42
  --json` → `milestone done archived: true wiki/work/archive/42_milestone_structural-overhaul`;
  `aof work validate 127` → `[]`; `aof work doctor 127` → warnings only.
- **`node scripts/test.mjs --only` over the story's suite and the 27 path-reader suites it
  re-pointed** (`work-this-tree-holds-what-is-live`, `work-archive-is-a-move`, the six
  `work-loops-*` suites, `drive-command-phase-drivers`, `watcher-independence-gate`,
  `anchor-taxonomy`, `memory-indexing`, `work-story-depends`, `work-dispatch-lanes`,
  `feature-parse-strict`, `work-validate-contract-parses`, `acd-no-staged-control`,
  `acd-register-declaration-form`, `acd-milestone-66-controls-resolve`, `acd-memory-derived-index`,
  `acd-graphify-records-from-parsers`, `acd-presence-aggregates-node-workspaces`,
  `acd-clock-counts-attempts`, `acd-render-lane-is-gated`, `graphify-reranking`,
  `repo-test-isolation-guard`, `declared-id`, `planning-prd`, `acd-tune-carries-no-second-rule`,
  `acd-declared-program-single-speller`) under an isolated home: **626 pass / 2 fail** on the first
  run — both this story's suite storing a fact of the tree on the day of the move (`F-15`); repaired
  to the properties the scenarios protect and re-run with FF-11902: **31 pass / 0 fail**, the suite's
  own **19 rows** green over the real tree (task 00: 7; task 02: 12). `verifies →
  tasks/00_the-repository-sets-intake-to-backlog.feature`, `tasks/02_the-outsider-check-passes-on-the-real-stream.feature`
- **`@manual` — task 01** is the build lane's evidence above (the move ran once, for real); its
  Given "stories 01–04 accepted" was met at the review, not the accept — `F-28`, ratified in the
  order this accept takes.
- **`aof work validate 127/05`** — **PASS**. **`aof work doctor 127/05`** — 0 errors, no
  `control-unresolved`.
- **No `@uat` scenario and no UI surface.**


## Design conformance

**Renderability, evaluated first.** Base URL: no `--url` and no `work.ui.baseUrl`, and this
workspace's own board carries no backlog row (`backlog/` is empty), so §Surface 1 cannot render on
it at all — task 06 names the alternative: "task 02's fixture stream served by `aof work ui` over
a scratch project". With the operator's leave (after the gate exited) the three-root fixture
(`buildThreeRootFixture`: `10_milestone_alpha` + story, `11_chore_beta`, backlog `gamma` /
`ideas/delta` / `ideas/later/epsilon`, archived `05_milestone_zeta` + story, `06_chore_eta`) was
served at `http://127.0.0.1:4180/board`; the wire carried 6 rows by default and 9 with
`includeArchived=1`. Renderer: `work.ui.renderer` undeclared, the highest-revision Chromium under
the platform cache by GLOB — `ms-playwright/chromium-1234/chrome-win64/chrome.exe` (exists,
executable). Both halves resolved; the render was attempted.

**The render** — the resolved binary driven over its own debugging port (the toggle is client
state with no URL form, so a plain `--screenshot` can only capture OFF): one navigation per
breakpoint at `--window-size` 1280×900 / 768×1100 / 390×1200, the overview OFF, the toggle
clicked, the overview ON, then Zeta's board through its own card, the switcher opened, and the
lane board under `All milestones`. Twelve captures, kept at `renders/` (`overview-off-*`,
`overview-on-*` at all three widths; `lanes-archived-*`, `switcher-open-*`, `lanes-all-*` at 1280
and 768). DOM facts read beside each capture: `button[aria-pressed]` present with
`aria-pressed="false"` at rest and `"true"` after the click, the Backlog `h2` present, the word
`archived` absent from the page OFF and present three times ON.

**The first render was of a stale bundle (`F-31`)** — `ui/dist` here and in the deployed payload
dated 2026-09-13, two days before 04 landed — and painted `delta` as a card with its slug in the
ref slot and no toggle: §Surface 1's forbidden shape, exactly. Rebuilt (`scripts/ui-build.mjs`),
re-served, re-rendered; the verdicts below are over the rebuilt bundle.

**Verdicts, region by region against the binding checklists (the baseline — no mock exists,
07/ADR-003):**

- **§Surface 1 — Backlog on the overview: CONFORMS** at 1280, 768 and 390. Layout in order:
  header → grid → (no gates in the fixture) → `BACKLOG` heading in the gates idiom with the
  subline `3 items · un-numbered, not scheduled · promote with aof work promote <slug>` (mono) →
  the root row `gamma` with no heading → `ideas` as a flat mono path → `delta` → `ideas/later` →
  `epsilon`. Rows: fixed-width uppercase type label (`CHORE` / `MILESTONE` / `SPIKE` aligned), mono
  slug, title; no ring, chip, number, progress, dots, footer or button; the stale badge absent
  (fresh). Ramp: bordered rounded rows, muted label/slug/path, foreground title, no `primary`
  anywhere in the section. The header chips count the stream only (`0 done · 1 active`; "1
  milestone" excludes `delta`). At 390 the label and slug never truncate; the fixture's titles are
  too short to exercise the title truncation — that one row is INCONCLUSIVE for want of a long
  title, not a gap.
- **§Surface 2 — the toggle and the mark: CONFORMS** at 1280 and 390, on VIEW 2 at 1280 and
  768, and **GAPS at 768 on the overview** (`F-32`). OFF: nothing on the page says an archive
  exists but the `Show archived` control, a quiet bordered toggle in the top-bar slot left of
  `◷ status legend`; no `▤` chip. ON: the toggle tinted (`primary` on the ON state only), `05
  MILESTONE` after the live card in wire order with `▤ archived` in the row-1 cluster beside
  `✓ done` and a calmer `bg-muted/40` surface, footer / dots / `Open board →` / `✓ accepted`
  intact, no dashed or faded treatment; chips `✓ 1 done · ◐ 1 active · ▤ 1 archived` with the
  archived chip last and present only ON; the header sentence counts rendered milestones (1 → 2).
  VIEW 2 (Zeta): the switcher button `05 · Zeta ▤ archived ▾`, the switcher rows `10 Alpha — in
  progress` / `05 Zeta — done · archived`, the lane cards under `All milestones` (`05 Zeta` and
  `06 Eta` with `▤ archived` at the meta line's right; `11 Beta` unmarked), the detail header
  cluster `05 milestone ▤ archived ✓ done`; the story `05/00 Zeta one` carries no mark; the primary
  action is the quiet `Run agent`; the actions strip is unchanged. The GAP: at 768 the archived
  card's row-1 cluster is wider than its column and `✓ done` spills past the card's edge.
- **Accessibility:** the meaning survives greyscale — the words `archived` and `Show archived`
  carry it (the operator read the captures desaturated); the toggle is a real `aria-pressed`
  button; backlog rows are `<li>`, not buttons.

**No `aof-designer` and no `aof-qa` session was spawned** — the operator chose an inline verify (0
agents); the judgement above is the product owner's over the captures, and the `toHaveScreenshot`
baseline QA would own is not created here (`F-33`).

## User sign-off

- **Task 06, `127/04` — the human read of the two surfaces**, 2026-09-17, by the operator over the
  fixture board at `http://127.0.0.1:4180/board` and the captures under `renders/`, at 1280 and
  768 top-down, 390 for the toggle and the rows, `Show archived` OFF → ON, Zeta's board, and the
  captures in greyscale. **Verdict: CONFORMS, with `F-32` noted** — the backlog reads as waiting,
  not in flight; the archived mark reads as put away, not broken; neither is colour-only; the 768
  cluster overflow stays a routed design gap. `verifies → tasks/06_a-person-judges-the-two-surfaces.feature`

## Fitness functions

<!-- One row per control declared in ARCHITECTURE.md's register. Each row is filled when the
     control LANDS with its story: the result observed and the RED PROBE (what was changed to make
     it fail, and the message seen). A declared control with no red probe here is not verified. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-12701 | `test/arch/work/acd-work-root-one-enumerator.test.mjs` | GREEN (4/4) | Two probes, both the ones the register row names. **(a) A second regex home.** `src/work/doctor.mjs` was given back its private copy — `ITEM_RE,` dropped from its `../work.mjs` import clause and `const ITEM_RE = /^(\d+)_(milestone\|story\|task\|uat\|spike\|chore)_([a-z0-9-]+)$/;` appended. (Pasting the const while the import stands is a duplicate binding — `SyntaxError: Identifier 'ITEM_RE' has already been declared` — which kills the runner at module load before any sweep runs; `F-02`.) Legs 1 and 2 went red: leg 1 observed `AssertionError [ERR_ASSERTION]: one definition of each, both in src/work.mjs` with actual `['src/work.mjs:BACKLOG_ITEM_RE', 'src/work.mjs:ITEM_RE', 'src/work/doctor.mjs:ITEM_RE']`, naming the second definition; leg 2 `doctor.mjs imports ITEM_RE from ../work.mjs`. **(b) A second scanner.** `import { readdirSync } from "node:fs"` added to `src/work/reindex.mjs` (which already imports `ITEM_RE`) and `readdirSync(workDir)` called inside `countShiftedByInsert`. Leg 3 went red alone, observing `AssertionError [ERR_ASSERTION]: undeclared work-root scanners (a readdir paired with an item-name match): src/work/reindex.mjs — retire onto listItems, or add a keeper row WITH its reason`, actual `['src/work/reindex.mjs']`. Legs 1, 2 and the self-check stayed green in the same run. Both subjects restored and verified byte-identical by `cmp`. |
| FF-12702 | `test/arch/work/acd-number-null-safe.test.mjs` | GREEN (3/3) | The `item.number != null` guard removed from `appendPosition`'s row filter in `src/work-promote/promotion.mjs` — `.filter((item) => item.parent == null && item.number != null)` became `.filter((item) => item.parent == null)`. Leg 2 went red alone, with exactly one finding, as file:line: `AssertionError [ERR_ASSERTION]: unguarded .number sites: src/work-promote/promotion.mjs:65 — \`parseInt(item.number, 10)\` in appendPosition is preceded by no isLiveStreamRow call, no \`.number != null\` guard and no story narrowing`. Leg 1 (the ten-file set is exactly the ten) and leg 3 (the classifier's self-check) stayed green in the same run. Subject restored and verified byte-identical by `cmp`. |
| FF-12703 | `test/arch/work/acd-one-mint.test.mjs` | GREEN (5/5) | Four probes, the four task 06 names, each red on exactly the leg the register row binds. **(a) A verb that computes.** `const items = []; const next = Math.max(...items.map((i) => Number.parseInt(i.number, 10))) + 1;` placed inside `insert-milestone.mjs`'s `run` body (pasted at top level as the scenario spells it, the line throws `ReferenceError: items is not defined` at module load and kills the runner before the sweep — `F-02`'s species, `F-29`). Leg 3 went red: `AssertionError [ERR_ASSERTION]: insert-milestone.mjs as an insert verb that computes a number (parseInt) — an insert verb is a thin alias of scaffold-into-backlog + promote --at P, and owns no arithmetic (ADR-003 §4)`. **(b) A third importer.** `import { countShiftedByInsert } from "../work/reindex.mjs";` prepended to `src/commands/promote.mjs`. Leg 4 went red: `promote.mjs as a third importer of the engine (src/work/reindex.mjs) — the slot-open keeps its two src callers and gains none (ADR-003, Consequences); the four other mentions of this path in src/ are comments, which is why this leg reads import specifiers`. **(c) A second slot-open caller.** `transitionStreamReindexed(ctx.workspace, { at: input.at, space: "top-level" })` called from `insert-chore.mjs`'s `run` (with its import). Leg 2 went red: `non-vacuity: the sweep finds the ONE top-level slot-open call — found 2` — the leg's first assertion is the count, so the message names two calls rather than `insert-chore.mjs`; the file-naming assertion sits behind it (recorded, `F-29`). **(d) A prompt that computes.** `1. Next top-level number NN = max NN across work.dir + 1, zero-padded.` pasted back into `src/bundle/commands/add-chore.md`. Leg 5 went red: `add-chore.md as a prompt that computes a number (max) — an item is born un-numbered on the intake and gets its number from \`aof work promote\`, never from arithmetic over a directory listing (ADR-003 §1, 41/ADR-002)`. Legs 1 (the four `appendPosition` callers) and the untouched legs stayed green in every run; every subject restored by `git checkout` and the tree read clean. `insert-shared.mjs` 638 → 628 lines. |
| FF-12704 | `test/arch/work/acd-intake-write-side-only.test.mjs` | GREEN (3/3) | Two probes, the two task 06 names. **(a) A reader branches on the setting.** `if (config?.work?.intake === "stream") return items;` inserted before the backlog walk in `listItems` (`src/work.mjs`). Legs 1 and 2 went red: `work.mjs carries the token \`intake\` (src/work.mjs) and is not on the write side — the key is written by init, projected by its face, read by promote's refusal text and named by the bundle prompts, and by nothing else (ADR-005 §1, §2)` and `src/work.mjs as a reader carrying the token \`intake\` — the read side is MODE-LESS: it walks backlog/ and archive/ whenever they exist, under either setting, so a "stream" project with a stray backlog leaf has ONE truth rather than two (ADR-005 §2)`. **(b) A writer stops naming it.** every `intake` in `src/commands/promote.mjs` (7 occurrences) renamed to `mode`. Legs 1 and 2 stayed GREEN and leg 3 went red alone: `promote.mjs as a writer that no longer carries the token — if the key were renamed (to \`mode\`, say) every other leg of this control would stay green while the setting became unfindable, so the two modules that MUST name it are asserted to name it`. Both subjects restored and verified byte-identical (`cmp`). |
| FF-12705 | `test/arch/work/acd-archive-never-renumbers.test.mjs` | GREEN (5/5) | Eight probes, the eight task 05 names — six on the committed tree, two in a scratch copy with no `graphify-out/`. **#1** `import { reindexForInsert } from "../work/reindex.mjs";` in `src/commands/archive.mjs` → (a) `archive.mjs imports \`../work/reindex.mjs\` (src/work/reindex.mjs), outside its closed set {node:*, src/work.mjs, src/effects/stream-transitions.mjs, src/command-error.mjs}` and (b) `a path reaches the reindex engine or insert-shared without crossing the seam: src/commands/archive.mjs → src/work/reindex.mjs`. **#2** `import { INSERT_FLAGS } from "./insert-shared.mjs";` there → (a) naming `./insert-shared.mjs` outside the closed set, (b) the chain `src/commands/archive.mjs → src/commands/insert-shared.mjs`. **#3** `import { appendPosition } from "../work-promote/promotion.mjs";` in `src/work/archive.mjs` → (a) naming `promotion.mjs` outside the engine's closed set `{node:*, src/work.mjs}`, (c) `src/work/archive.mjs contains \`appendPosition\` — the archive writes no number (ADR-004 §5)`. **#4** `text = String(text).replace(/^number:.*$/m, "number: 00");` inside `rewriteCrossingLinks` → (c) `contains \`number:\``, (d) `the number: line is byte-identical` with `+ 'number: 00' - 'number: 12'`. **#5** `INLINE_LINK_RE` loosened to `/\(([^\s)]+)([^)]*)\)/g` → (d) alone: `the regex requires \`](\` before the target (\(([^\s)]+)([^)]*)\))`. **#6** `archiveItems(` called from the face (its import added) → (a) naming `../work/archive.mjs` outside the closed set, (e) `the face never calls the engine`. **Scratch copy** (the gate worktree at the same commit, no `graphify-out/`): leg (b) alone first reported the seam path found and PASSED; **#7** `import { countShiftedByInsert } from "./reindex.mjs";` in `src/work/archive.mjs` → (a) and (b) `src/work/archive.mjs → src/work/reindex.mjs`; **#8** a new `src/commands/archive-flags.mjs` re-exporting `normalizeSlug` from `./insert-shared.mjs`, imported by the face → (a) `imports \`./archive-flags.mjs\` … outside its closed set` AND (b) `src/commands/archive.mjs → src/commands/archive-flags.mjs → src/commands/insert-shared.mjs` — the walk is transitive and the two legs fail independently. Every subject restored by `git checkout` (the created file removed) and both trees read clean. Budgets moved: `src/commands` 69, `src/work` 42→43, `test/work/stream` 34→35, `test/arch/work` 49, each `why` naming its story. |
| FF-12706 | `test/arch/work/acd-next-walkers-exclude-archived.test.mjs` | GREEN (4/4) | Two probes, both the ones the register row names. **(a) A resolving reader filters.** `matches = matches.filter((row) => !row.archived);` inserted into `findWork` ahead of its row loop (`src/work.mjs:989`). Legs 1 and 4 went red: leg 1 observed `AssertionError [ERR_ASSERTION]: findWork is a resolving reader and filters on neither \`archived\` nor a status standing in for it`; leg 4, the fixture leg, `findWork("05") answers the archived driver — 0 !== 1`. **(b) A walker stops filtering.** `.filter(isLiveStreamRow)` dropped from `nextWork`'s driver walk (`src/work.mjs:1517`). Leg 4 went red, observing `AssertionError [ERR_ASSERTION]: the ready set holds the live rows only (got 10/00, 11, gamma, epsilon, delta, 06)` — the three backlog leaves and the archived `06` proposed as ready. Leg 1's textual half stayed GREEN on this probe: `nextWork` references the predicate a second time in its story walk (`:1611`), so a partial drop is caught by the fixture leg and not by the token test — recorded as `F-01`. Subject restored and verified byte-identical by `cmp` after each probe. |

Every probe recorded above was applied to a backed-up copy of its subject, run through
`node scripts/test.mjs --only <control>` under an isolated `AOF_GLOBAL_HOME`, and the subject
restored and verified byte-identical before the next probe ran. All six declared controls carry a row, and every one was observed failing under the probe its register
row names — three at 127/01's accept, three at this milestone's.

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
| F-12 | Three run records (`runs/<node>/…0006.json`, `02/runs/<node>/…0003.json`, `…0004.json`) carry the private node id in their `node` field and the pre-commit guard refuses them; nine such records are ALREADY on the branch because the loop's lane commits run `git commit --no-verify` (`src/mesh/worktree.mjs:1112`, headless by design) and the guard never saw them. `acd-no-internal-project-names` is red over them in this checkout and SKIPS in the gate worktree (the terms file is untracked, so a worktree has none) — the gate's green does not cover this control. The branch is unpushed (31 commits ahead of `origin/main`). | defect | medium | non-blocker for the accept, **blocker for the push**: the fix is the public-repo move's open item — rename the node identity and scrub the twelve records (three uncommitted, nine committed) before `127-129` is pushed; the loop's `--no-verify` commit is a second guard gap for the operator to weigh. **Scrubbed after the accept (`20582a8`, 2026-09-17):** the twelve records and six `runs/<node>/` folders renamed to `umamis-msi`; `acd-no-internal-project-names` green over the tracked tree. The loop's `--no-verify` guard gap stays 129's (`RETROSPECTIVE.md` R7), and "node id, not node name" in run records is the operator's next story. | operator (done); `129` (the guard gap) | closed |
| F-13 | 127/03's lane ran `aof work update` (its `.aof/aof.lock.json` is a declared write) and the loop's reconcile reset `.aof/` before committing the lane, so the lock on the branch carried none of `archive.md`'s three renders and `verify.md`'s pre-03 hash — FF-12405 leg 9 red at the door, and 03's own `work/archive-is-a-move: 04` red in every checkout (04's build recorded it). Re-stamped here by `aof work update` (0 created, 0 updated, 153 skipped — the renders were current; only the lock moved). | defect | medium | closed at this accept for 127; the cause is the loop's (129/03: the reconcile drops `.aof/`), routed there. `m129`'s lane commits will keep dropping every lane's lock until the reconcile carries tracked `.aof/` files. | `129` (lane reconcile) | open |
| F-14 | Derived pins outside a story's `files:`, the third time in three milestones (`m126/F-05`, `m126/F-07`, `F-05`): `test/bundle/bundle.test.mjs` (×5) and `autonomous-shell-out-prompt.test.mjs`'s door pin the command census at 27 and 03's `archive.md` made it 28; FF-5307 pins `src/board-ui.mjs`'s digest and the `ui/` tree digest, both moved by 04; FF-5301's sink reach (73) gained 04's `work/item-row.mjs`; shell/12's host-node asker list lacked 04's board suite. None was in 03's or 04's declared writes; every one was red in the gate's first run. | design-gap | medium | closed here (each re-pinned with the measurement and the story named); the convention gap stays open and is `RETROSPECTIVE.md`'s: a story that adds a bundle member, touches a frozen seam or adds a suite that asks a harness for more than the default should declare the pins it will trip — the refine brief could list them from the controls' own registers. | product-owner / refine convention | open |
| F-15 | 05's own suite over the REAL tree stored four facts of the tree on the day of the move that were false within a day: "three live milestones (127, 129, 130)" (131 was framed that evening), "`42_structural-overhaul` exists at the root" and "`42` appears in no row" (the operator accepted the GSD-era record as an imported milestone and archived it into the item grammar, 4caeec4), "every entry under `archive/` matches `ITEM_RE`" and the moved-files link `==` (`.gsd-archive` sits under `archive/` outside the grammar with 19 broken internal links, b32929d), and a scaffold dated `2026-09-16` that reds doctor's mtime lane the next morning. | defect | medium | closed at this accept: each became the property the scenario protects (the live-milestone equality, the root partition item / sub-root / non-item asserted exact, the archive claim over `ITEM_RE` entries with a non-item entry asserted to be no row, the link floor `>=`, today's date). FF-11902's rule reaches behavioural suites too — carried to `RETROSPECTIVE.md`. | `127/05` | closed |
| F-16 | The public-root cut (e4c8824, 2026-09-13) discarded every rename recorded before it. The cited-path resolver (119/ADR-004) answers a citation "at HEAD, or through a rename this repository recorded", so after the cut 148 archived-doc `src/` tokens resolved nowhere (ceiling 47), the controls' pinned known rename (`src/commands/errors.mjs → src/command-error.mjs`) was gone, FF-6607b read every archived register as unresolved, and loops-ledger leg 9 could not reach a suite a delivered feature cites at its pre-119 path. None is re-pointable: 119's moves changed basenames. | defect | **blocker** (for every gate on this branch) | closed at this accept by the operator's ruling: `.aof/rename-ledger.tsv` — the 1,128 pre-cut records, derived ONCE with the resolver's own argv over the archived repository (0 private terms), in git's own line shape so `parseRenameRecords` reads it unchanged — is read by every edge AFTER git's records (`RENAME_LEDGER_PATH`). FF-11903's "from no file in the tree" gains that one documented exception; 148 → 54. The 54 is re-pinned as the ceiling under the 77 high-water mark with its residue named (see `F-17`). | architect (119's doctrine, ratified by the operator here) | closed |
| F-17 | FF-11903's ceiling could not fall back to 47 once the ledger restored history: the seven above it are 129/03's and 129/04's nine Examples-table fixtures spelled `src/<x>.mjs` in DELIVERED features (129/VERIFICATION `F-09` names them — "an Examples-table fixture is not a citation"), 130's two modules cited before its builds land them (`stop-request.mjs`, `stop.mjs` — they clear by landing), and 127/03 task 05's hypothetical `src/commands/archive-flags.mjs`, which exists so the transitive leg can name a chain through it. 129's rejected `lanes.mjs` and TECH_DEBT's two proposals were respelled without the path form (−3). | design-gap | medium | non-blocker: the reasoned ceiling row 129/F-09 asked for is written (47 → 54, with the composition). The doctrine tension stays open — a feature that spells a fixture as `src/x.mjs` bills FF-11903 for ever — and is the refine convention's: fixture paths in features go under a non-`src/` root. This row should fall to 52 at 130's accept. | refine convention; `130` (two modules) | open |
| F-18 | 129/06's build exported `PROVIDER_WAIT_RE` from `src/agent-session-driver.mjs` — an eighteenth export on the door 53/FF-5302, FF-7002, 53/00 task00 and the mesh-blind control freeze at seventeen — so five cases were red on every gate after it, and 129/06 (in review) had not re-pinned them. | defect | medium | closed here without amending the freeze: the pattern now lives in `src/loop-bounds.mjs` beside the heartbeat deadline it SUSPENDS (a leaf the driver already imports — no new edge), the driver imports it and its suite imports it from there; the door is the frozen seventeen again. Two naming consumers (`acd-loop-family-boundary`, `source-slice.mjs`) joined ADR-015 §2's allowlist by name and reason. For 129/06's accept to ratify. | `129/06` | closed |
| F-19 | Eight `PLAN.md` files restated declared paths (FF-9603 / 96/02: one inline path per document is the admission): 127/03 (3), 127/04 (3), 127/05 (4) and 130's five stories (up to 14 each — whole `--only` suite lists). The refine prompt writes the plan and nothing runs the ban at refine, so every refine since 96 has been able to red the gate. | defect | low | closed here (each list condensed to prose; the paths are each `STORY.md`'s `files:`). The refine-time gap is `RETROSPECTIVE.md`'s: `aof:refine` should run `restatementViolations` over the plan it writes. | refine convention; `130` (plans edited, for its PO to read) | open |
| F-20 | 119's meta-controls named suites outside 127: `site-build.test.mjs` (the docs-site commit, no item) asserted three literal censuses and two unfloored absence claims, and its delivered-page case's fixture root was bound under the name `root` — a REPO-derived name elsewhere in the file — so FF-11902's reader read a fixture oracle as a tree census; `acd-site-is-projected-not-copied` spelled its own import extractor; 129/03's `.gitattributes` case asserted a literal merge-line list. 127/03's `work/archive-is-a-move: 04` narrowed the prompt directory without a floor. | defect | low | closed here in the admitted forms (named among / every member admitted / floored; the fixture root renamed `fixtureRoot`; the extractor through `module-family.mjs`). | site (operator); `129/03`; `127/03` | closed |
| F-21 | 129's `81/01 the record itself is unchanged` had been red since 2026-09-12 (129 STATE: "the fixture change, committed as-is"): `stubRubric` answers the clean BASELINE first, and a direct `work:grade` invoke makes one spawn, so the graded call read the baseline and recorded 0 failures against 35 expected. | defect | low | closed here with the fixture's own knob — `{ baseline: null }` — and a note at the site. | `129` | closed |
| F-22 | `test/work/brief-pinned-to-the-stream.test.mjs` (70/05 ×3) — `F-10` measured: 130's `## Objective` alone was 8,083 chars against the 8,000-char brief ceiling (no objective in its refine brief at all); 127's, 129's and 130's ADR headings ran 130–320 chars; and the packer prices the section BELOW `tasks` at exactly its best form, then its own notice (~1,000 chars) grows, so the architecture slice arrives ~50 chars short of the skeleton that names every declared id while ~1,300 chars of the ceiling go unspent (127/01: 322 of a 439-char skeleton; 127/05, 129/04–05, 130/02–06 the same). The condenser reads `**Decision.**` labels only and every ADR in the three milestones is written `### Decision`, so "All 0 decisions listed" — teaching it the section shape (tried, reverted) starves the slices further under the same packer. | design-gap | medium | the documents were condensed at the operator's choice: the three measured-facts tables moved to a `## Measured facts` section below `## Dependencies` (nothing lost; only `## Objective` rides the brief), and seventeen ADR headings became short titles with the original sentence as a bold lede (ids unchanged; nothing cites a title). The packer's slack defect and the `### Decision` grammar stay open and are the architect's — `RETROSPECTIVE.md` carries the measured mechanism. | architect (`src/phase-brief.mjs`); `129`, `130` (documents edited) | open |
| F-23 | `66/00 refuse` found ONE new structural finding over the whole stream: `archive/42_milestone_structural-overhaul/AOF.md — schema 0 is behind the current schema 1` — the imported GSD-era record the operator archived at 4caeec4 was never stamped. | defect | low | closed by the finding's own remedy, `aof upgrade` (1 item, `stamp-0-to-1`); `validate 42` → 0. | `42` (operator's import) | closed |
| F-24 | Two cases flaked under the gate's first run and were green alone in the same worktree: `129/04 task01 REFINE drives every unrefined story first` and one `work-dispatch-lanes` case — the spawn-heavy species `124/F-17` names. | test-gap | low | non-blocker; recorded so the second gate's reader knows which reds are contention. | `129` | closed |
| F-25 | The running control daemon (started 2026-09-15 16:58, pre-v9 payload) answered `global-store-unavailable: Global work projection schema 9 is newer than this AOF build supports (8)` on every fleet request once 04's schema bump had migrated the live store through the npm-linked CLI — the fleet at `:4181` was down until the operator restarted the app. Expected of any deploy (a restart is required), but a schema bump makes the window LOUD: the old daemon cannot read the store at all. | defect | low | non-blocker; recorded for the deploy note — install-local's hand-back should say "restart REQUIRED: schema N → N+1" when the projection schema moves. | operator / deploy loop | closed |
| F-26 | 04's build recorded (STATE) that DESIGN §Surface 2's VIEW 2 paragraph says "pill LEFT of the stale badge" for the lane card while its own binding checklist and task 04's last scenario say `[stale][archived][chip]`; built to the checklist. | design-gap | low | ratified at this accept: the binding checklist IS the baseline (07/ADR-003); the prose is corrected in `DESIGN.md` to match it. | `127/04` | closed |
| F-27 | 02's tasks 00/01/02 spell `status: null` for a backlog row; a backlog record doc scaffolded from the template carries `status: not-started`, which is what 01's fixture and 02's write; 04's task 05 Examples row `done | 12 | (empty)` names the in-progress 43 hidden under `done` as the fleet's DELIVERED `workStatusSummaryTail` (` · 1 hidden, done only`); 04's task 04 prose "pill LEFT of the stale badge" vs its checklist. Recorded by the build lanes as contract-wording deltas (no `.feature` edited). | contract-wording | low | ratified — the suites assert the delivered behaviour and the shape claims are untouched. | `127/02`, `127/04` | closed |
| F-28 | 05's task 01 Given reads "stories 01–04 accepted"; the loop's `--through-review` walk offered 05 once 02–04 were `in-review` (built and reviewed, not accepted), and the lane ran the real move then (`ed9c00c`, 2026-09-16 08:5xZ). The move itself was sound — every number below is re-verified at this accept — but the precondition the contract spelled was the accept. | contract-wording | low | ratified at this accept, in the order the contract asked for: 02, 03 and 04 are accepted here BEFORE 05. The loop lesson (an irreversible act on the real tree should gate on `done`) is `RETROSPECTIVE.md` R9. | `127/05`; `129` (readiness through review) | closed |
| F-29 | Task 06's probe (a), as spelled — the `Math.max(…parseInt…)` line "added to `src/commands/insert-milestone.mjs`" — throws `ReferenceError: items is not defined` at module load when pasted at top level, and the runner dies before FF-12703's sweep runs (`F-02`'s species); probe (c)'s leg names the count (`found 2`) before it names the file, so the observed message differs from the scenario's "naming `insert-chore.mjs`". | contract-wording | low | ratified: (a) applied inside the verb's `run` body, which is what "added to the module" means for a line that reads a binding; (c) the leg went red on the same mutation and its first assertion is the count — recorded verbatim on the FF-12703 row. No `.feature` edited. | `127/02` | closed |
| F-30 | Gate run 4 (`c801091`) recorded "the runner exited with no verdict and enumerated no failure": `work.test.deadlineMs` was 2,700,000 (45 min) and runs 1–3 had taken 45–46 min each (20:33→21:19, 10:47→11:32, 11:45→12:30 local); run 4 crossed the bound and the runner was killed. The bound predates the suite's growth to 10,400+ cases. | defect | medium | closed at this accept: `work.test.deadlineMs` raised to 3,600,000 (60 min) in `.aof/aof.config.json`, committed so the gate's checkout reads it; the killed run's row stays in `REGRESSION.md` as its own history (a red row and a missing one are not the same fact, 126/F-35). | product-owner | closed |
| F-31 | The first render of 04's surfaces (fixture board, 2026-09-17 18:41) painted the backlog milestone `delta` as a CARD with its slug in the ref slot and no `Show archived` toggle — §Surface 1's forbidden shape. Not the code: `ui/dist` in this checkout AND in the deployed payload (`~/.aof/bin/ui/dist`) was built 2026-09-13, two days before 04 landed (the 2026-09-16 install ran `--skip-ui`), and `aof work ui` serves the tree's `ui/dist`. Rebuilt here (`scripts/ui-build.mjs`, 18:42) and re-rendered. | defect | medium | closed for this accept (the render below is over the rebuilt bundle); the deploy is the operator's: `node scripts/install-local.mjs` WITHOUT `--skip-ui` before the app is relaunched, or the fleet/board serve a pre-04 bundle. The gate's own worktree built `ui/dist` fresh, so no suite saw it — a served bundle is not something a test reads. | operator (deploy) | open |
| F-32 | At 768 with the toggle ON, the archived card's row-1 cluster (`▤ archived` + `✓ done`) is wider than the card's column in the fixed 3-column grid: the `✓ done` chip spills past the card's right border (`renders/overview-on-768.png`); the live card beside it wraps its own `in-progress` chip onto two lines, which is the grid's pre-existing behaviour at 768. The pill is the addition, so the overflow is this milestone's, on a breakpoint DESIGN §Conformance names. | design-gap | medium | non-blocker for the accept (a visual overflow, not a broken affordance; every other row of both checklists CONFORMS): the designer sets the rule — the cluster wraps below the ref line at ≤ 768, or the pill drops to the footer beside `✓ accepted` — as a DESIGN.md amendment ahead of the next board story; not fixed here because the 3-column grid is declared out of this milestone's scope and the cluster's layout is its consequence. | aof-designer (`DESIGN.md` §Surface 2) → next board story | open |
| F-33 | The design-conformance step names two sessions the operator chose not to spawn (0 agents): `aof-designer`'s read-only judgement and `aof-qa`'s Playwright harness with the `toHaveScreenshot` baseline that would lock the approved captures. The judgement was made inline over the twelve captures under `renders/` and signed off by the operator; no visual-regression baseline exists for the two surfaces. | test-gap | low | non-blocker; the captures are kept with the milestone as the reference a later QA lane can baseline from. Playwright stays off the dependency list either way. | aof-qa (next board story) | open |

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

**`127/02` ACCEPTED** — 2026-09-17. The story's lane is green (332 pass / 0 fail across its own suites
and the seventeen its `files:` names — 137 promote rows, 42 insert-alias rows, 23 intake/init-config
rows story-attributable); FF-12703 and FF-12704 are green and were each observed failing under every
probe task 06 names (four for the one-mint control, two for the write-side control); task 05's eleven
prompt scenarios hold, 36 checks of 36, against scratch projects; `insert-shared.mjs` shrank 638 → 628.
`aof work validate 127/02` reports PASS and `aof work doctor 127/02` reports no `control-unresolved`.
`F-27` and `F-29` are ratified here; `F-13` and `F-14` (the lock and the pins the door repaired) are
the loop's and the refine convention's. No blocker finding is open against this story.

**`127/03` ACCEPTED** — 2026-09-17. The story's lane is green (350 pass / 0 fail across its own suite,
the enumerate fixture it extends and the controls its `files:` names — 61 archive rows, 165 enumerate
rows); FF-12705 is green on all five legs and was observed failing under all eight task 05 probes —
six on the committed tree and two in a scratch copy with no graph artifact, where the transitive leg
first found and admitted the seam path; every budget row it moved carries its why. `aof work validate
127/03` reports PASS and `aof work doctor 127/03` reports no `control-unresolved`. The move over this
repository is 127/05's act. No blocker finding is open against this story.

**`127/04` ACCEPTED** — 2026-09-17. The story's lane is green (153 pass / 0 fail across its own suites
and the three controls its build moved — 8 store, 16 seam, 7 route, 8 backlog, 8 archive and 5 fleet
rows task-attributable; FF-5307 and FF-5301 green on the re-pins `F-14` records). Design conformance
was RENDERED — over the three-root fixture served by `aof work ui`, the cached Chromium driven at
1280 / 768 / 390, OFF and ON, the switcher and the lane board — and read region by region against
the binding checklists: §Surface 1 CONFORMS at every width, §Surface 2 CONFORMS at 1280, 390 and on
VIEW 2 with one GAP at 768 (`F-32`, routed to the designer, non-blocking); the operator's own `@uat`
read (task 06) is CONFORMS with `F-32` noted, recorded under `## User sign-off`. The first render
caught a stale served bundle (`F-31`, the deploy's). `aof work validate 127/04` reports PASS and
`aof work doctor 127/04` reports no `control-unresolved`. `F-26` and `F-27` are ratified here; no
blocker finding is open against this story.

**`127/05` ACCEPTED** — 2026-09-17, after 02, 03 and 04 (`F-28`). The move ran once, for real, on
2026-09-16 (`ed9c00c`: 125 drivers, 2,289 renames, 1,710 crossing links, `wiki/memory.md`'s four
links by hand, the index regenerated) and its post-state is re-read at this accept: the root holds
127, 129, 130, 131 and the 32 gate beside the three roots; `find 42` answers the archived import;
`validate 127` is `[]`. The story's suite over the REAL tree is green (19 rows) once its four
stored tree facts became properties (`F-15`), and the 27 path-reader suites it re-pointed are green
(626 in the lane). `aof work validate 127/05` reports PASS and `aof work doctor 127/05` reports no
`control-unresolved`. No blocker finding is open against this story.

## Accept decision — the milestone

**`127` ACCEPTED** — 2026-09-17, with all **five** stories done.

**The gate.** `aof work regression-gate 127` at `f27d7d669e00b94d790cb6182d985a7ab2c8325e`, on a
clean detached worktree at that commit (119/R4's route — this checkout carries the run records the
private-terms guard refuses, `F-12`): **green, scope all, `satisfiesDoor: true`**. The milestone's
`REGRESSION.md` carries five rows and all five stay: run 1 at `ea70920` red on 26 cases (`F-13`–
`F-24`, every one repaired at its owner); run 2 at `049c7fd` red on four (`F-22`'s CRLF half, two of
the door's own repairs re-read); run 3 at `9cea474` red on one (05's suite over a checkout with no
`backlog/`); run 4 at `c801091` killed at the 45-minute test deadline with no verdict (`F-30`); run 5
green under the 60-minute bound. The whole-tree run behind the green row is the runner's registered
suite, cargo and browser lanes included. One control the gate did not measure is named rather
than assumed: `acd-no-internal-project-names` SKIPS in a worktree (the terms file is untracked) and
is red in this checkout over nine committed run records — the push door's, `F-12`.

**All six declared controls carry a red-probe row** (three at 127/01's accept, three here — fourteen
probes, each applied to the committed tree or a scratch copy, run alone under an isolated home, and
the subject restored and the tree read clean), `aof work validate 127` reports PASS, `aof work
doctor 127` reports no `control-unresolved` at either severity and 0 errors, and the ARCHITECTURE
register carries no `pending` marker.

**What the door did that no lane had.** 26 whole-tree reds were classified by owner and repaired in
place — five this milestone's, the rest the public-root cut's, 129/06's, 130's, the docs site's
and 42's — under two operator rulings (`F-16`: the rename ledger; `F-22`: the documents condensed
to the packer); the deploy was found stale at the render (`F-31`); and the accept order 05's
contract asked for was restored (`F-28`). `F-12` (the node id, before the push), `F-14`, `F-17`,
`F-19`, `F-22` (the packer), `F-31` (the deploy), `F-32` (the 768 cluster) and `F-33` (the
screenshot baseline) stay open, each routed. No blocker finding is open against the milestone.

Next, the operator's act and never this ceremony's (127/ADR-004): `aof work archive 127` moves
this folder under `archive/`.
