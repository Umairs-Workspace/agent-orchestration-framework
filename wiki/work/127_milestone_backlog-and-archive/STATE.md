---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 127 · Backlog and archive — the work tree holds what is live — State

## Progress

<!-- Story-by-story, mirroring the SPEC Stories list. The source of truth for each story's status
     is its own STORY.md frontmatter; this is the at-a-glance roll-up. -->

- [x] 01 · one-enumerator-three-roots — done (built + reviewed 2026-09-11; accepted 2026-09-12 by `aof:verify 127/01` — the operator's force-proceed past the FF-11903 deadlock; `VERIFICATION.md` `127/01`, `F-01`–`F-11`)
- [ ] 02 · promote-mints-the-number — not-started (depends on 01)
- [ ] 03 · archive-is-a-move — not-started (depends on 01)
- [ ] 04 · the-fleet-and-the-board-see-the-shapes — not-started (depends on 01)
- [ ] 05 · this-tree-holds-what-is-live — not-started (depends on 01–04)

## Notes & decisions in flight

<!-- Surprises, corrections, mid-build discoveries. Decisions that prove durable graduate to ADRs at
     Accept — don't leave them only here. Strike-through corrected assumptions to keep history honest. -->

- **Refined 2026-09-11 (attempt 3 of the autonomous cascade; attempts 1 and 2 died on
  `runtime_offline` and `timeout` after producing DESIGN.md only).** Broken into five stories
  on the graph-derived coupling (`aof graph build .` 14:59:30Z, 16371 nodes): 01 is the seam
  (`src/work.mjs` is the 302-importer god-node; `listItems` is the one enumerator), 02/03/04
  fan out from it independently, 05 is the dogfood on the real stream. Memory recall surfaced
  41/ADR-001, 41/ADR-002, 119/ADR-005, 71/ADR-003 and 48/ADR-009 — each honoured in
  ARCHITECTURE.md's recall section.
- **Default decision taken:** `appendPosition` lives in `src/work-promote/promotion.mjs`, not
  `insert-shared.mjs` as the SPEC's table says; the table's count of minting places (2) is right,
  the file is off by one. ADR-003 keeps it there and adds `promote` to its caller family.
- **Default decision taken:** `insert-*` become thin aliases (scaffold into backlog +
  `promote --at P`), not retired — retirement would change accepted contracts (ADR-003 §4).
- **Default decision taken:** no mock was elicited for the board surfaces (no human present);
  DESIGN.md's binding checklists are the conformance source of truth per 07/ADR-003.
- **Open (not blocking):** stories 02 and 03 each add one registration line to `src/cli.mjs`;
  accepted as a one-line merge rather than a dependency edge (ARCHITECTURE.md, partition note).
- **Framed 2026-09-11** from a discussion, not a PRD. The operator's proposal named a numbered
  backlog and a `backlogMode` flag; both were revised in the framing: the backlog is UN-numbered
  (the number is minted at promotion, which is what lets `insert-*` collapse into `promote --at`),
  and the config key is write-side only (`work.intake`) — the read side is mode-less so no reader
  ever branches on a flag.
- **The archive's cost was measured twice.** A first count of 124 files "hardcoding" item paths was
  114 comment-only mentions and 5 synthetic fixtures; the real runtime reader population is ONE test.
  The cost that survived measurement is the seven second-scanners of the work root, which is a debt
  the tree already carries (three `ITEM_RE` homes) — 127 discharges it rather than adding to it.
- **No spike.** Every unknown that would have justified one (root-scanner count, `.number` consumer
  count, fleet-cache shape) was measured at framing and is recorded in the SPEC's table.
- **Story 01 refined 2026-09-11 — four ADR facts corrected in its contracts** (the ratification
  rule: a delta raised while a contract is authored lands in that contract; the ADR text is not
  re-opened, and these graduate to the ADRs at Accept). (a) ADR-001 §5's doctor row: `doctor.mjs`'s
  item enumeration is already `listItems` (`:372`); its work-root `readdir` (`:541`) is the ORPHAN
  lane, which must see what the enumerator drops — kept as a keeper, taught the roots. The
  developer's sweep at HEAD found what the count of seven missed: `src/work/observe.mjs` is a REAL
  eighth work-root scanner (three functions `readdir` a hard-coded `wiki/work`) — retired onto
  `listItems` in 01; `src/work-tune/provenance.mjs` cannot retire (a synchronous resolver chain,
  and `acd-proposal-provenance-resolves` pins its `ITEM_RE` import textually) — kept, learns the
  archive root; `src/commands/ratchet.mjs` is a keeper by the sweep's criteria only. FF-12701's
  allow-list is therefore SIX (doctor, routing, recovery, migrate-folder's foreign stories scan,
  provenance, ratchet); `local-indexing` is asserted to hold no pairing; `doctor-freshness.mjs:254`
  retires its regex use. (b) ADR-002 §2 and FF-12706 name `src/work/loops.mjs` as the loop
  scope — it is the loop DECLARATION registry; the loop reaches the stream only through `work:next`
  and `work:list`,
  and FF-12706 asserts the loop shell imports no enumerator. (c) ADR-002 §2's "`appendPosition`
  considers only live rows" would re-mint an archived number the moment the highest-numbered item
  is archived — the mint counts every NUMBERED row; only `selectAffected` (the shift set) is live-only.
  (d) The frozen seven-key `listStream`/`findWork` row (m03/ADR-002) is widened only on backlog and
  archived rows, as DESIGN.md §facts and ADR-006 §1 already assume.
- **Handed to story 02's refine (from 01's contracts):** `promote --at P` must REFUSE when an
  archived item holds a number in the shift range (a live row would land on it — ADR-003 has no
  such rule yet); FF-12703's `appendPosition` caller family must include
  `src/commands/migrate-folder.mjs` (its `nextFreeSlot` retires onto the mint in 01).
- **Stories 04 and 05 refined 2026-09-15 (solo — PO, QA and developer played inline; no agent
  spawned). Six facts corrected on contact with the source, each ratified in the contract it
  lands in.** (04) The cache-first seam's `cacheOnlyItem` (`src/work/read.mjs`) derives `number`
  FROM THE REF, so a remote node rebuilt a backlog slug as `number: "gamma"` (live!) and never
  rebuilt `archived` — the module joins 04's write set (04/01). The store has no column for
  either fact: schema v8 → v9 adds `backlog TEXT` + `archived INTEGER` by the v8 in-place ALTER
  idiom, and `archived` is mapped at the bind because SQLite refuses a boolean (04/00). The
  FLEET's milestone list would paint a backlog row AND offer `AssignAffordance` on it — a
  dispatch minted for an item with no number — so `ui/src/fleet/{scope.mjs,api.ts}` join the
  write set with a PARTITION ONLY (04/05). **Default decision:** the fleet paints no archived
  mark and no backlog region (DESIGN.md designs no fleet surface; a mark there is a later
  design's with a checklist); an archived milestone falls under the fleet's existing status
  filter (`open` hides it). Archived cards render in the WIRE's order — after the live milestones
  (ADR-002 §5) — DESIGN §Surface 2's "where its number puts it" assumed an interleaving the wire
  does not have (04/04). `test/ui` is at its ceiling (56): the one new suite raises the row.
  (05) The stream holds 125 `done` drivers, not 123; `TECH_DEBT.md` holds NO entry for the
  `ITEM_RE` homes or the scanners (the SPEC described code debt, not a ledger entry — nothing to
  delete, 05/01); 03/01's "nothing outside `wiki/work` links into an item folder (measured 0)" is
  off by FOUR — `wiki/memory.md:15,130,137,147` link into `05_milestone_work-memory`, fixed by
  hand in 05 (`wiki/memory.md` joins its `files:`), the verb's scope unchanged; there is no
  `aof work read` or `recent` verb (the SPEC's "read 52" is `doc 52 SPEC`; `recent` is a prompt
  over `work:list`); the add → promote round trip runs on a SHAPE COPY of the real stream (every
  `.md`/`.feature`, 2 MB) because a test never writes the real tree, and the link invariant over
  the real tree is a RATCHET pinned to the count measured immediately before the move (05/02).
  `42_structural-overhaul` (an imported folder no `ITEM_RE` matches) stays at the root, invisible.
- **Story 03 refined 2026-09-15 (orchestrated: PO inline, QA + developer spawned) — four
  ADR-004 facts sharpened in its contracts, ratified in that beat.** (1) ADR-004 §2's "a link from
  inside the moved folder to a root sibling gains `../`" is one case of the measured rule: 2,192
  relative inline links under `wiki/work`, 96 cross items, but 1,868 LEAVE their item folder for
  `src/`, `ui/`, `test/`, `planning/`, `ROADMAP.md` (1,190 resolving) — so EVERY link crossing the
  line is rewritten and the invariant is "every relative link resolves to the same path after the
  move as before" (03/01). (2) The engine (`archiveItems` + `rewriteCrossingLinks`) is
  `src/work/archive.mjs`, `reindex.mjs`'s twin — the seam imports its fact-writer and a command
  cannot be one without a cycle; ADR-004 §1's `src/commands/archive.mjs` stays the verb, and
  FF-12705 sweeps both files (03/03, 03/05). `src/work` 41→42, `src/commands` 68→69 stated.
  (3) There are TWO runtime path-readers, not one: `acd-declared-program-single-speller.test.mjs:283`
  reads 72/00's task feature; both resolve through `findWork` (03/03). (4) FF-12705's transitive
  leg walks import specifiers over source, not the gitignored graph, and treats the seam edge
  `stream-transitions.mjs → reindex.mjs` as the one sanctioned crossing (03/05). Memory recall
  surfaced m22/R5 (pin line endings) — honoured: the rewriter preserves each file's own EOL/BOM.
  **Default decisions:** `--done` is gated on ANY count (no threshold; `archive-confirm-required`
  with `candidates` in `detail`), `<NN>` never gated; a `done` milestone is checked on its own
  status only, stories move with it; renames first then one rewrite pass; the rewriter is
  syntactic (fenced code blocks included) and never consults target existence. **Open for 05:**
  the retired `.mjs` suites under `35_…/reference/` keep a relative `import` that breaks after
  the move — accepted by ADR-004 §3 (in no runner); `.aof/aof.lock.json` and `manifest.json`
  are declared writes because `aof work update` renders the wrapper (parity control).

## Feedback (for retro)

<!-- Contract problems and blockers met while building, raised by the lane that met them. -->

- **127/03 build (developer, 2026-09-15, solo, run `…0005`) — task 03's path-reader census is wrong by
  measurement, and the surplus is 05's.** The refine counted TWO runtime readers of a live item path
  outside `wiki/`; both are rewritten to `findWork` and green. Re-measured at build (the same grep,
  every non-comment match naming a folder that EXISTS read): ten more test files read a REAL item
  folder at run time — `test/loop/work-loops-{checks,commands,coverage-ledger,record,registry-census,value}.test.mjs`
  (52/00-05, 58/00, 59/00 feature ledgers), `test/memory/anchor-taxonomy.test.mjs` (59/00),
  `test/work/record/work-story-depends.test.mjs` (00/01, also through `git show HEAD:<path>`),
  `test/loop/drive-command-phase-drivers.test.mjs` and `test/work/lifecycle/work-dispatch-lanes.test.mjs`
  (129's ARCHITECTURE.md, live today). None is in 03's `files:`; every one goes red when 05's `--done`
  moves 52/58/59/00. The census test names them as an explicit ledger so a NEW reader fails it, and
  the "no third path-reader is left" scenario is amended rather than met: **05's contract must add
  "retire every reader the 03 census names, by ref, before `--done`"** (an amendment — no item created).
- **127/03 review (QA lens, 2026-09-15) — measured on a scratch copy of THIS repository: `--done --yes`
  archives 125 drivers in 2.3 s, rewrites 1,710 links in 161 files, and the root reads 127, 129, 130,
  32, 42 + `archive/`; `doctor` is byte-identical before and after (1,340 findings, no delta), `find 52`
  answers `archive/52_…` with `archived: true`, `next` proposes nothing archived. `validate` is NOT
  identical: +323 findings, every one `story reads path "wiki/work/NN_…/…" does not exist` — a
  `reads:` entry is a PATH CITATION of an item doc, it crosses the archive line, and 03's rewriter
  never touches frontmatter (task 01, by contract).** The same class as the path-readers, in the
  record docs themselves. Two remedies, both 05's contract to choose at its refine (an amendment —
  no item created): validate's reads/files-exists check resolves a `wiki/work/<NN_…>` path through
  the enumerator by ref (the resolving-reader rule, 127/ADR-002 §3, extended to path citations), or
  05 rewrites the 323 `reads:` lines surgically as promote stamps `number:`. The first keeps ADR-004
  §2's "never a frontmatter write" and is the smaller cut. Until one lands, the SPEC's outsider check
  ("`validate` still answering") does not hold on the real stream.
- **127/03 build — task 01's convergence scenario contradicts its own Examples row.** The zeta row
  asks that an already-archived file linking into a folder being archived get "the same syntactic
  insert, not a re-normalised `../12_…`" (`../../archive/12_…`); the convergence scenario asks the
  identical shape (12's `[iota](../../13_…)` when 13 is archived after it) to come out as the
  normalised `../13_…`. One rule cannot produce both. Built to the rule the contract declares as the
  invariant — syntactic and minimal, every link resolves to the same path — so the two orders converge
  in RESOLUTION (asserted) and not in bytes (`../../archive/13_…` vs `../13_…`). For 05 this is moot
  (`--done` moves the set together, rule (iii)); it matters only for incremental archives later.
- **127/03 build — three smaller contract deltas.** (1) Task 04 asks the shipped `src/bundle/manifest.json`
  to carry all THREE renders; the manifest generator emits claude + codex only (the promote precedent
  is the same two) — the lock carries all three, asserted as such. (2) Task 00's driver-type Outline
  says "record doc byte-identical"; 12's and 13's fixture docs carry a crossing link the same story's
  task 01 rewrites — asserted as frontmatter byte-identical and only link lines differing. (3) Task 00's
  `git status --porcelain` rename claim needs `-M25%` on the fixture (a dozen-line doc, half of it
  links, falls under git's default 50% similarity); asserted through `git diff --cached -M25%`.
- **127/03 build — declared write set incomplete (STORY.md `files:`):** `test/work/stream/work-backlog-archive-enumerate.test.mjs`
  gained one `export` (the `writeItem` task 00 says the archive fixture extends through) and
  `wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md` (the FF-12705 register row — the
  pending marker cleared by landing the file, both subjects named, as task 05 requires). Both added.

- **127/01 accepted (product-owner, 2026-09-12, `aof:verify 127/01` by hand).** The story's lane is
  430 pass / 0 fail under an isolated home; FF-12701 / FF-12702 / FF-12706 each observed red under
  the probe the register names (task 05's `@manual`, run inline, subjects restored byte-identical);
  `validate` `[]`, `loops validate` 0 error, `doctor` 0 errors and no `control-unresolved` at story
  scope. `aof work status 127/01 done` first REFUSED on `doc-over-budget` (159 > 150 — the budget is
  a door, not a warn): `STORY.md`'s contract-deltas note condensed to a pointer at this file's
  "Story 01 refined 2026-09-11" entry (147 lines), then accepted. Register markers for the three
  landed controls dropped; the `observe.mjs -> work.mjs` mesh-blind admission ratified (`F-06`).
  Story `RETROSPECTIVE.md` (R1–R7) and `OUTCOME.md` authored; `memory ingest` re-indexed 2,341
  records. **Left for the milestone door:** FF-11903 clears only when 02/03 land their modules
  (`F-09`); the brief condenser finds no `**Decision.**` passage in 127's `### Decision`-shaped ADRs
  (`F-10`, architect's); the loop-harness findings this story's three idle re-drives measured
  (`F-11`, R4–R7) are story-sized and sit here for the operator to place — none is in 127's scope.

- **127/01 build (developer, 2026-09-11) — task 01 `observe enumerates through the enumerator`: the
  step "holds no `readdir` of the work root" cannot hold for `countUnattributedRuns`.** Its question is
  "which run records sit under NO item" — an orphan lane, exactly the shape task 01 keeps for doctor
  — and `work-observe-scope/02` pins that a stray non-item dir's runs are counted, which no
  enumerator row can name. Built: the two real scanners (`buildSessionItemIndex`,
  `resolveMilestoneFolder`) take `listItems` rows and list nothing; `countUnattributedRuns` keeps a
  raw root listing but takes the item set from `listItems` and the roots from the exported names,
  matching no item name — FF-12701's sweep verdict for `observe.mjs` ("no pairing") holds. The
  contract's wording should say "no item-name match of its own" for that one function.
- **127/01 build — declared write set incomplete (STORY.md `files:`).** Landing the contract
  required: `src/bundle/manifest.json` (derived; regenerated by `scripts/generate-bundle-manifest.mjs`
  after `recent.md` changed), the three git-tracked renders `.claude/commands/aof/recent.md`,
  `.codex/skills/aof-recent/SKILL.md`, `.opencode/commands/aof/recent.md` plus `.aof/aof.lock.json`
  (via `aof work update`; FF-7106 names exactly these), `test/arch/testing/acd-source-directory-budget.test.mjs`
  (the `test/arch/work` 43→46 and `test/work/stream` 31→32 rows the story's own declared test paths
  cross), `test/arch/loop/acd-loop-registry-not-an-item-type.test.mjs` (it enshrined the THREE
  `ITEM_RE` homes; now reads the one), `test/arch/grade/acd-acceptance-horizon-single-predicate.test.mjs`
  (its pinned `migrate-folder.mjs:242` write line moved to `:244` when `nextFreeSlot` retired) and
  `test/arch/session/acd-session-driver-mesh-blind.test.mjs` (a second admitted route into
  `work.mjs`, `work/observe.mjs -> work.mjs`, reach count unchanged — for `aof:verify 127` to ratify).
- **127/01 build — inherited reds at HEAD, not this story's code:** FF-7106 (story 02's `files:` has
  the same bundle-render gap), `acd-frozen-set-compiled` ×2 (its census reader no longer matches the
  committed `test/bundle/frozen-set-compiled.test.mjs`), FF-11903 (127's ARCHITECTURE.md cites
  `src/commands/promote.mjs` / `src/commands/archive.mjs` before stories 02/03 land them: 49 vs
  ceiling 47), `test/work/brief-pinned-to-the-stream.test.mjs` ×2 (the refine brief's ADR condenser
  finds 0 decision passages in 127's ARCHITECTURE.md — its ADRs use `### Decision` sections, not the
  `**Decision.**` passage `src/phase-brief.mjs` slices — so 127/01's brief omits ADR-002), `53/00 task01`
  (census disagrees with committed `test/support/source-slice.mjs`), `m42-item-3` (`src/loop-diag.mjs`,
  another lane's uncommitted work), and four mesh clone/push cases that read a `GIT_ASKPASS` this
  VS Code-launched shell exports into `process.env`.
- **127/01 build — `aof test --scope impacted --story 127/01` WIDENED TO `scope all`** (10 widenings:
  the new files are not in the graph, three declared files have no registered dependent, and
  `wiki/work/TECH_DEBT.md` is declared) and so ran the full suite, which on this machine dies on
  `:4182` (`EADDRINUSE`, "may not stand as a verdict"). A build's terminator on a machine that hosts
  the control daemon needs either a graph rebuild first or a scope that never widens to `all`.
- **127/01 re-entry (orchestrator, 2026-09-12, cascade cycle 3) — the story was already `in-review`
  with its cycle-2 run closed; the tree is byte-unchanged since that review close (last write
  22:36Z), so no lens was re-spawned.** Verified at the source instead of assumed: gate ladder
  clean (`validate` PASS; `doctor` warnings only). `aof test --scope impacted --story 127/01`
  widens to `all` STRUCTURALLY — `src/bundle/commands/recent.md` and `wiki/work/TECH_DEBT.md`
  are not-in-graph by nature, so no graph rebuild can narrow it — and `all` dies on `:4182`
  here; the graph-derived selection minus those five widenings (278 suites) ran as `--scope file`
  under an isolated global home. Six `not ok`, none this story's: `work-observe.test.mjs` is a
  `node:test`-style file the array runner reports unusable (22/22 under `node --test`); four
  mesh clone/push cases read the `GIT_ASKPASS` this shell exports (green with it unset);
  `53/00 task01` is the inherited HEAD red (both files committed at 9b64eb32, unmodified).
  FF-12701 / FF-12702 / FF-12706 and the enumerate suite green case-by-case. For story 04's
  build lane: a story whose `files:` declares any `.md` will always widen to `all`, so the
  terminator on this machine is the un-widened selection as `--scope file`, stated as such.
- **127/01 re-drive (orchestrator, 2026-09-12 17:34Z, run `…0009`, `build-still-failing` 9) — the second
  NEEDS_INPUT stop (`…0008`) was, like the first, left `running` and reclaimed `runtime_offline` on a
  restart ~2.5 h later, with no guidance carried; read as the operator reaffirming the cascade. From
  here the lane answers each re-drive minimally and changes nothing, so the count holds and
  `buildNoProgressRounds` (2) halts the loop `no-progress` on the second equal grade — the one exit
  that needs no human and parks no session. 01's write set unchanged; gate ladder clean.
- **127/01 re-drive (orchestrator, 2026-09-12 14:54Z, run `…0008`, grade 9) — the count fell 10 → 9 on
  another lane's work (`m42-item-3` cleared; `src/loop-diag.mjs` is still untracked), which the loop
  reads as progress and re-drives on. DEADLOCK, measured: FF-11903 (`test/arch/command/acd-cited-path-resolves.test.mjs`,
  `UNRESOLVED_CEILING = 47`, shrink-only) is red because 127's ARCHITECTURE/SPEC/story docs cite
  `src/commands/promote.mjs` and `src/commands/archive.mjs` — the modules stories 02 and 03 create —
  so 01's whole-tier grade CANNOT go green before 02/03 land, and the cascade will not reach 02/03
  before 01's grade is green. No lane can resolve this; it is the operator's: force-proceed
  (`aof:verify 127/01` by hand, then `aof:continue 127`), or amend the citations (an ADR change, the
  architect's), or scope the story grade. Stopped with NEEDS_INPUT rather than spend a round per
  foreign fix. Nothing in 01's write set moved; gate ladder clean.
- **127/01 re-drive (orchestrator, 2026-09-12 14:46Z, run `…0007`, `build-still-failing` 10) — the
  NEEDS_INPUT stop of run `…0006` did not reach the operator as a decision: that run went silent
  after its final message (heartbeat 12:29Z) and was reclaimed `runtime_offline` when the cascade
  was restarted at 14:45Z, whose resume path rebuilt the pending fix from the stale progress samples
  (11 → 10) and re-drove the same lane.** Nothing in 01's write set has moved since the review close
  (newest 2026-09-11 22:33Z); gate ladder clean again. No foreign red was touched on purpose: under
  `decideBuildProgress` a partial fix that lowers the count RESETS the stall counter and buys the
  grind another two rounds, so the deterministic exit is an unchanged count — the bound
  (`work.loop.buildNoProgressRounds` = 2) halts the cascade `no-progress` after two more equal grades.
- **127/01 stall (orchestrator, 2026-09-12, run `…0006`, still cascade cycle 4 — a progress-continuation
  re-drive does not advance the cycle) — the grade fell 11 → 10 and the loop read that as progress;
  re-run here in isolation it is the SAME seven cases as the previous round, none of them 127/01's
  (classified in the entry below), so the review gate is stalled on findings this lane cannot fix and
  the session stopped for the operator rather than spend another round.** Two harness facts measured
  on the way: (a) the progress sampler charges the WHOLE shared checkout to this run —
  `filesTouched` lists the fleet/shell lane's `ui/src/app/*`, `test/ui/*` edits made 12:05–12:13Z
  while this story's tree was untouched, and `linesChanged` grew 2925 → 3113 on them — so a story
  whose neighbours are busy never stalls by that reading; (b) the grade's truncation line says "the
  whole record is on the graded run and in `aof work grade <ref> --json`", and neither holds it —
  both carry the same 3 of 10, so the 7 dropped cases are unrecoverable from any record and have to
  be re-measured (~5 min of fitness tier per round). Gate ladder at the stop: `validate` `[]`,
  `doctor` 0 errors. Operator's call: force-proceed (accept 01 with the six foreign reds named),
  guide (fix the other lanes' reds first — 02/03 `files:`, `src/loop-diag.mjs`, `ui/` re-pin,
  `refine.md`, the two HEAD reds), or stop the cascade on 01 and continue 127's 02/04 wave.
- **127/01 fix round (orchestrator, 2026-09-12, cascade cycle 5) — re-driven by `work:grade` (the
  whole fitness tier, 1931 cases) with 11 failing cases, 3 shown and 8 dropped by the payload
  ceiling; the recorded grade on the run carries the same 3, so the tier was re-run here (isolated
  home, nothing else running): 7 `not ok`.** Classified at the source, each control and its subject
  checked against HEAD and by mtime: **ONE is 127/01's — fixed.** FF-7106 named this story's own
  `files:` (it declares `src/bundle/commands/recent.md` without the manifest and the three tracked
  renders); the declaration now carries the nine writes the build entry above already listed
  (manifest, three renders, `.aof/aof.lock.json`, the four arch-tests it touched) — a declaration
  repair, no code changed, FF-7106 re-run in isolation no longer names 01. **Six are not 01's and
  stay red whatever 01 does:** FF-7106 still names story 02 (34 rows) and story 03 (4 rows) — their
  `files:` need the same repair at their refine/build; `m42-item-3` (`src/loop-diag.mjs`, untracked,
  another lane's); `acd-frozen-set-compiled` ×2 (control and subject byte-identical to HEAD — the
  red is HEAD's); FF-11903 (49 vs 47: `src/commands/promote.mjs` / `archive.mjs` cited by 127's
  ARCHITECTURE/SPEC before 02/03 land them); FF-5307 (`ui/` hash drifted from the operator's
  2026-09-11 18:38 re-pin — the fleet lane's, 01 writes no `ui/`); FF-12405 leg 3
  (`src/bundle/commands/refine.md` edited 2026-09-12 12:01 by the loop lane). The grader's 11
  ran 11:51–11:59Z over this session's own file-scoped test run — contention; the 4 it saw beyond
  these 7 are unrecoverable from the truncated record. **Harness finding (recorded, for the
  retro):** a story's grade is taken over the SHARED checkout, so it carries every other lane's
  uncommitted reds and the milestone's own refine prose — 6 of 7 here — and the cascade will
  re-drive `continue 127/01` on reds 01 cannot fix until the review cap halts it; the grade needs
  either a story-scoped fitness selection or a per-lane worktree at the milestone base. Doctor after
  the fix: 0 errors; the mtime warn cleared (`updated:` bumped) and a `doc-over-budget` warn
  appeared (STORY.md 159 lines over the 150 budget — the nine declaration lines; prose left to the PO).
- **127/01 re-entry (orchestrator, 2026-09-12, cascade cycle 4) — the second re-drive of `continue`
  on an `in-review` story, and the same answer as cycle 3: the story's write set is byte-unchanged
  since the review close (newest write 2026-09-11 22:33Z), so no lens was re-spawned.** Verified at
  the source: gate ladder clean (`validate 127/01` → `[]`; `doctor 127/01` → 0 errors, 4 warnings,
  none admitted); the 22 declared/touched suites as `--scope file` under an isolated global home →
  430 cases green, the one `not ok` being `work-observe.test.mjs`'s `node:test` shape (21/21 under
  `node --test`, file unmodified at HEAD). The other files modified in this shared checkout today
  (`src/commands/loop.mjs`, `run-start.mjs`, `run-complete.mjs`, `resolve.mjs`, `spine/face.mjs`,
  the `continue.md`/`refine.md` renders) are another lane's — outside this story's `files:`, and
  FF-12706's loop-imports-no-enumerator leg stays green over them. **Sequencer finding (recorded, for
  the retro — `src/work/loop.mjs` is outside this story's write set):** a RESTARTED cascade re-drives
  `continue` on an `in-review` story because `decideLoopPhase` reaches `continue` for any story
  with tasks unless `lastPhase === "continue"` is supplied, and the shell supplies it only
  in-process (`loop.mjs:1994`) — nothing reconstructs it from the run records on resume, and the
  loop's scope walk is `work:next 127` (which answers 127/01 while `in-review`) rather than
  `--through-review` (which already offers the 02/04 wave). Each restart therefore pays a full
  session to rediscover the review gate; cycles 3 and 4 are two of the cap's six spent that way.
  A story whose status is already `in-review` should route to the gate/verify decision on
  resume, not to another build.
- **127/01 review close (orchestrator, 2026-09-11) — one round, no Blocker from any of the three
  lenses (architect / QA / craft); every surviving finding routed once.** `fixed` at the close, each
  a confirmed Important cheaper than the story it would cost: (1) FF-12701's root-literal leg
  forbade the bare word `"backlog"`/`"archive"` anywhere in src, wider than task 00's "to name a
  root" — story 03's `route: ["work", "archive"]` and story 02's `intake: "backlog"` would have
  false-failed it; narrowed to the root-naming shape (`ROOT_NAMING_LITERAL_RE`, self-checked).
  (2) `insert-story --under N` resolved an ARCHIVED milestone (reproduced: the story scaffolded
  into `archive/05_milestone_zeta/stories/`, and with `--slug zeta-one` overwrote the archived
  STORY.md) — the owner lookup now passes through `isLiveStreamRow`, refusing
  `insert-parent-archived` by name; cased in the enumerate suite. (3) `observe.mjs` spelled
  `String(Number(row.number))` because FF-12702's grammar saw only `parseInt` — the coercion is
  now a string transform (`dropLeadingZeros`) and the control's `SITE_RE` sees `Number(x.number)`
  too, so the next coercion spelling fails it rather than stepping around it (ten-file set
  unchanged). **Amendments (PO ratifies at verify; no `.feature` edited):** (a) task 03's scope
  row `ideas` says `aof work validate ideas --json` answers `[]` at exit 0 — the face reports
  `scope-not-found` at exit 1 by design (TECH_DEBT item 11, paid 2026-09-05); the suite asserts
  the engine (`validateWork(…, "ideas")` → `[]`), which is the true statement; the row should read
  "one `scope-not-found` finding at exit 1". (b) task 01's `countUnattributedRuns` step (the
  developer's entry above) — both lenses confirm the build's shape; wording → "no item-name match
  of its own". **Recorded (already-scheduled stories carry them):** for story 04's refine — the
  cache-first scheduler path is a hole today: `src/global-work-store.mjs:986` publishes every
  `listItems` row without `number: null`/`archived`, and `src/work/read.mjs:138` `cacheOnlyItem`
  mints `number` from `ref`, so on a peer node a backlog `delta` / archived `05` row reads as live
  and `nextWorkCacheFirst` (`aof work next`) would propose it; 04's contract must name BOTH seams
  and the scheduler, not only the board. For story 02's refine — `insert-milestone --at 5` over an
  archived `05` re-mints the number (the refusal already handed to 02 covers it once `insert-*`
  are `promote --at` aliases); an all-digit backlog slug (`milestone_12` → `ref: "12"`) collides
  with the numbered space and is unreachable through `findWork`'s numeric branch — task 00's
  outline pins it as a leaf and routes the refusal to `promote` (02); note the projection's
  `PRIMARY KEY (workspace_id, ref)` would let a backlog `12` and a live `12` overwrite each other,
  which is 04's seam too; `rewriteReferences` (`src/work/reindex.mjs:165`) now re-lists all three
  roots, so a `--at` shift rewrites `depends:`/`parent:` in archived and backlog docs — decide it
  explicitly in `promote --at`'s contract. **Nits recorded:** `byGroupThenSlug` has no tiebreak
  for two backlog leaves sharing group + slug (only a state `backlog-slug-duplicate` already
  reports — a `name` tiebreak closes the byte-stability claim there); the digest lane's message
  for a backlog milestone carrying an `AOF.md` reads `digest milestone "" ≠ folder "null"`
  (`work.mjs` `item.number == null` branch covers the native shape only); the backlog group walk
  descends every non-leaf directory (`.git`, `node_modules`) with no dot-dir guard — cost only;
  `provenance.mjs` carries two `import … from "../work.mjs"` statements because two exact-clause
  pins freeze the first (widen both pins to clause-membership and merge); `recent.md` step 2 "by
  `ref` (creation order)" is no longer creation order once a ref may be a slug. **Discarded:** the
  fixture-external `TECH_DEBT.md` assertion — task 00's last scenario mandates it.
- **127/02 review close (orchestrator, 2026-09-13, `aof:continue 127/02`, attempt 3 of the driven run).** Built to green in this checkout after two `runtime_offline` deaths: story-declared set + delivered insert suites 344 pass / 0 fail under an isolated home; `validate` PASS; `doctor` 0 errors (the three stream-wide warns only); `aof work update --dry-run` nothing to re-render. Review: three lanes (architect, QA, craft) round one → ONE deduplicated Blocker (task 03's `@executable` scenarios had no witnessing suite — the promote suite's header pointed at `work-insert-top-level-places.test.mjs`, unchanged) → fixed as `workInsertAliasTests` (41 cases, second binding of that file) → QA delta round two CLEARED (0 Blockers; 3 mutations, 2 killed, 1 survivor closed at this close by one more case: the transient leaf is removed on a post-scaffold refusal when `backlog/` pre-existed — the mutation dropping the `catch`-side `rm` now reds exactly that case). **Fixed at the close:** FF-12703 leg (c)'s `number:` non-vacuity anchor re-pointed from `promotion.mjs` (which writes none) to `promote.mjs`'s `stampNumber`; 124/02's FF-12405 leg 3 replaced its `refine.md`-byte-identical-to-HEAD assertion (a commit-timing tripwire — red for every uncommitted legitimate edit, trivially green after any commit) with the durable property over the working file (two invocations, `--area` and `--item`) — all three lenses called the leg defective; stale comments in `insert-shared.mjs`, `promotion.mjs`, `insert-uat.mjs`; `insert-backlog-exists` message forward-slashed; `DEFAULT_WORK_INTAKE` un-exported. **Recorded (Nits, for the register):** `prefixFirstHeading` (`promote.mjs:~174`) takes a `# ` inside a fenced block / HTML comment ahead of the real H1, and the STATE.md courtesy scans its frontmatter too; `asList`/`sameNum`/`slash` are the 4th/3rd/~9th private mirrors — export from `work.mjs` (127/01's `isLiveStreamRow` precedent) and re-point; promote suite's `withFixture` spreads `rest.work` over `work.dir` (resolves only via the `./wiki/work` default) and its pre-`try` config write / `plantRow` leak the temp root on throw; `promote.mjs:~356` post-rename stamp has no null guard (unreachable today); a post-seam `rename` failure (Windows EPERM/EBUSY) leaves a shifted stream with an empty slot — the delivered insert path's own exposure, no undo; `stripBundleMarker`'s BOM branch is witnessed nowhere. **Task 06 measurement for VERIFICATION:** `insert-shared.mjs` 628 lines now; 638 = the contract's baseline (working tree incl. 127/01's hunk); 622 = git HEAD; code lines 337→318, comment lines 223→257 — state the baseline. **Contract wording (PO, no `.feature` edit):** task 00 line 96 "`aof work next delta` answered nothing actionable" — a free-text scope falls through to the whole stream by design (`inRange`, story 86 / TECH_DEBT 49), so the witness asserts "the backlog row is nowhere in the answer"; task 03 scenario 1 "neither tree holds a `backlog/`" — the by-hand half leaves an EMPTY root (promote never removes a root it did not create); task 03 insert-story scenario's `--at 1 --under 10` shifts nothing, so its "no remap names a top-level ref" clause is over zero events (`--at 0` would bite). **Story-shaped, handed to the operator:** the `src/commands/work/` fold is now owed by two budget rows (128's and 127/02's `src/commands` 67→68) with no ledger entry or item naming it — blast radius ~40 modules' dependents. **Architect follow-ups at accept:** register row FF-12703 names three `appendPosition` callers and `insert-*.mjs` — the landed control asserts four incl. `migrate-folder.mjs`; ADR-002 §2 / ADR-003 §2 say `appendPosition` reduces over live rows — code and 127/01's amendment read live AND archived (superseding ADR); "insert-story is not an alias" reading of ADR-003 §4 likewise; the `phase-backlog-ref` door tests `number === null`, which a cache-first row omits until story 04. **Declared `reads:` incomplete (developer):** `test/support/{work-insert-fixture,read-src-files,source-slice,module-family}.mjs`, `src/effects/journal.mjs`, `.aof/templates/work/{uat,chore}/*.md`. — Raised by: orchestrator
- **127/04 build + review close (developer/orchestrator, 2026-09-15, solo, driven run `…0001`) —
  six `@executable` tasks green in this lane; review round one → 0 Blockers across four lenses;
  design conformance INCONCLUSIVE (no base URL); seven findings recorded, three fixed at the
  close.** THE BUILD: `global-work-store.test.mjs` 17 (8 new: the projection, the round-trip incl.
  the un-archive clearing the column, four frame-door rows, a hand-written v8 file migrating in
  place, the fleet payload), `cache-read-seam.test.mjs` 29 (19 new; the remote-node fixture is the
  OWNING node's real projection streamed through the real snapshot door as `aof-wsl` — every
  reader, five CLI verbs as child processes, the overlay rule, the seam's own guarantees),
  `board-api.test.mjs` 32 (12 new over the REAL face, `tsc -b` included),
  `board-backlog-and-archive.test.mjs` 21 (tasks 03–05 off the REAL `<Board/>` / `<Fleet/>`);
  focused runs: `test/ui` 949/949, `test/store` (minus the `:4182` suite) + 127's stream suites
  683 ok, arch (store/work/testing/ui/mesh/command) 713 ok; `validate` PASS; `doctor` the three
  standing stream-wide warns only. **Ratified in this beat:** (1) `src/work/item-row.mjs` — the
  store sits at its 1,280-line ratchet (43/ADR-012/B4, whose escape hatch is "the next block in
  its own module"), so the row SCREEN moved there with the two location shapes it now screens
  (`backlog` rides `OPTIONAL_ITEM_FIELDS`; `archived` has its own predicate and is mapped `true → 1`
  at the bind — B5's regex would read a bare `row.archived` bind as unscreened); the store
  re-exports it (the `artifacts.mjs` precedent); `src/work` 42→43 with its why; FF-12706's
  src-wide `.archived` sweep allow-lists the two store-boundary CARRIERS by path (each asserted to
  filter on nothing and to call no `isLiveStreamRow`), which the register row already admits and
  ADR-006 §1 requires; (2) the FLEET row (`mapItemRow`) carries `number: null` beside `backlog`
  (`wireLocationKeys`) — task 05's premise and ADR-006 §1's "exactly as `listItems` emits them" —
  while the STORE row (`readWorkspaceItems`, task 00 scenario 2) carries no `number`, as task 00
  words it; the seam derives it from `backlog`'s presence; (3) the version pins in
  `staleness-schema-v8-provenance` and `mesh-assignment-record` re-armed onto v9 (added to
  `files:`) — task 00's "cases are green UNCHANGED" was false for the literal-8 pins and the
  "exactly two columns were added" count (v9 appends two more to a v7 file); every prior bump
  re-armed the same pins; (4) `test/ui` 56→57 for this story's suite; `ui/src/board` 21→22 for
  `ArchivedPill.tsx` (DESIGN names the file and its home — a sibling of `StaleBadge.tsx`; the fleet
  paints no pill, so it is not the shared part that row meters); `ui/src/board/DetailPanel.tsx`
  1000→994 (`humanizeSlug` moved to `model.ts`, where the backlog row shares it; the pill joined
  the header cluster) — 49/04's exact-count row re-aimed the way its Fleet.tsx row already was;
  45/03's surface-slot pin gained `Show archived items` LEFT of the legend (DESIGN §Surface 2).
  **Fixed at the close:** 127/03's `work-archive-is-a-move` pins the shared `src/work` budget row
  at 42 — moved to 43 with a note (one ledger table, two stories; the next raiser moves it again);
  a craft nit (an inline `import()` in the new suite). **Contract wording (PO, no `.feature`
  edit):** tasks 00/01/02 spell `status: null` for a backlog row — a backlog record doc scaffolded
  from the template carries `status: not-started`, which is what 127/01's fixture and this story's
  write, so the witnesses assert `not-started` (the shape claims are untouched); task 05's Examples
  row `done | 12 | (empty)` — the fleet's DELIVERED `workStatusSummaryTail` (which the task itself
  requires unchanged) names the in-progress 43 hidden under `done` as ` · 1 hidden, done only`,
  asserted as delivered; task 04's prose "lane card: pill LEFT of the stale badge" contradicts its
  binding checklist (`[stale][archived][chip]`) and its own last scenario (`[◌ stale …][▤ archived]`)
  — built to the checklist; DESIGN §Surface 2's VIEW 2 paragraph carries the same contradiction
  ("pill left of the stale badge" vs "takes the meta line's right end beside the stale badge") for
  the designer to settle at verify. **Design conformance:** INCONCLUSIVE — `work.ui.baseUrl` is
  unset and no `--url` was given (a renderer resolves: the ms-playwright Chromium cache), so no
  render was attempted, no designer judgement exists, and task 06 (`@uat`) stays the human's at
  `aof:verify` — supply the board's ephemeral origin at capture time (DESIGN §Conformance).
  **Inherited reds, not this story's:** FF-11903 ×3 and FF-6607b ×3 are red at the main checkout's
  HEAD too — the repository holds 19 commits and ZERO git rename records since the public-repo
  move (the "OPEN" list there), so every rename-resolution control reads an empty map; 127/03's
  `work/archive-is-a-move: 04 the wrapper is declared…` is red in every checkout because
  `.aof/aof.lock.json` (tracked, last written by 129/07) carries none of the three `archive`
  renders — 03's lane commit did not carry its `aof work update` — for 03's reviewer or verify.
  **Harness facts for the next UI story:** the milestone switcher reads bare `document` and
  positions its listbox off `getBoundingClientRect`, so opening it headlessly needs `hostNodes:
  true, terminalEnvironment: true` and a rect stamped on the wrapper's `hostNode`; `visibleTextOf`
  splits JSX text nodes ("1 stor y", "2 milestone s") — read raw with `textOf`; the face fixture
  gained `backlog` / `archived` stream members and two doors (`reportedRow`: one row re-reported
  through the real upsert as a delta would be; `unpublish`: never cache-published). **Declared
  `reads:` incomplete:** `test/support/{mini-react,fleet-filter-readers,mesh-ui-assign-fixture,terminal-dom,cli-spawn,item-lock-fixture,cache-authority-fixture}.mjs`,
  `src/mesh/ui-serve.mjs`, `src/global-node-registry.mjs`, `test/arch/work/acd-work-items-single-writer.test.mjs`
  (the 1,280 ratchet + B5 — the reason for the leaf), `test/arch/work/acd-next-walkers-exclude-archived.test.mjs`,
  `test/arch/testing/{acd-ui-surface-file-budget,acd-ui-directory-budget}.test.mjs`,
  `test/ui/{terminals-home-route,shell-regions}.test.mjs`, `test/mesh/assignment/mesh-assignment-record.test.mjs`,
  `test/work/stream/work-archive-is-a-move.test.mjs`. **Process (retro):** `aof test --scope
  impacted --story 127/04` launched the widened FULL suite in this lane the instant it ran (three
  new paths; there is no dry run); the shell was stopped but the runner outlived it 41 minutes,
  so every focused run waited — the verified runs were `scripts/test.mjs --only` sets, never the
  widened one. — Raised by: developer/orchestrator (solo)


## Verification

<!-- Pointers, not restatements. -->
- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
