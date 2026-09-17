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

- [x] Framed 2026-09-11 from a discussion (not a PRD); refined 2026-09-11 (attempt 3 of the
      autonomous cascade) — six ADRs, six controls declared `pending`, five stories.
- [x] 01 · one-enumerator-three-roots — accepted 2026-09-12 (`aof:verify 127/01`, the operator's
      force-proceed past the FF-11903 deadlock; `VERIFICATION.md` `F-01`–`F-11`).
- [x] 02 · promote-mints-the-number — built + reviewed 2026-09-13 (three lenses, one Blocker fixed,
      QA delta round cleared); accepted 2026-09-17.
- [x] 03 · archive-is-a-move — refined 2026-09-15 by the loop's first live run under 129/06; built +
      reviewed 2026-09-15; accepted 2026-09-17.
- [x] 04 · the-fleet-and-the-board-see-the-shapes — built + reviewed 2026-09-15 (four lenses, 0
      Blockers; design conformance INCONCLUSIVE at the build, judged at the accept); accepted 2026-09-17.
- [x] 05 · this-tree-holds-what-is-live — the move ran once, for real, 2026-09-16 (`ed9c00c`, 125
      drivers, 2,289 renames, 1,710 links); accepted 2026-09-17, after 02–04 (`F-28`).
- [x] Accepted 2026-09-17 (`aof:verify 127`) — the whole-tree gate took four runs: 26 reds
      classified at the door, five of them 127's (`RETROSPECTIVE.md` R1); `F-12`–`F-29`.

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

## Feedback (for retro) — ARCHIVED at accept, 2026-09-17

The blow-by-blow of five build+review passes, 01's five cascade cycles and three re-drives, 02's fix
round, 03's build and QA measurements, 04's build+review close and 05's live move — twenty entries
raised by the lanes that met them — lived here and has GRADUATED: every lesson is an `R<n>` in a
retrospective (one per story under `stories/*/RETROSPECTIVE.md`, plus this milestone's own
`RETROSPECTIVE.md`, R1–R9) and every finding is a numbered row in `VERIFICATION.md` (`F-01`–`F-29`),
the register a check can read. The durable decisions graduated to `ARCHITECTURE.md` (the six ADRs,
ratified in the contracts) and `OUTCOME.md` (what the system now is). The last full text is at
`c801091`; nothing is lost by the compaction, and what is removed is the second copy.

## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` suite green — per-story lanes (02: 332, 03: 350, 04: 153, 05: 626 + 31), and the
      whole tree at `aof work regression-gate 127` (`REGRESSION.md`, four rows; the last green).
- [x] Fitness functions green — all six, each with a red probe recorded in `VERIFICATION.md`.
- [x] `@manual` run — 02's eleven prompt scenarios and six probes, 03's eight probes, 05's move; 04's
      `@uat` read recorded under `## User sign-off`.

Evidence, findings and the accept decisions: `VERIFICATION.md`. Lessons: `RETROSPECTIVE.md` here and
one per story. Delivered state: `OUTCOME.md`.
