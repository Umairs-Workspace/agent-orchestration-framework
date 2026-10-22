---
doc: state
---
# 168 · A prototype builds something fast — State

## Progress

- [x] Refined 2026-10-22 (solo): ARCHITECTURE.md ADR-001 to ADR-007 and FF-16801 to FF-16804
  (all pending). Four stories, waves 00 → 01 ∥ 03 → 02.
- [x] Contracts authored 2026-10-22 (solo, `--autonomous`): an example map, task features and a
  PLAN.md for each of 00 (2 tasks), 01 (3), 02 (2) and 03 (2). Validate and doctor clean.

## Notes & decisions in flight

- 2026-10-22: framed with a proposed design: a `prototype` item type with exactly two files,
  `PROTOTYPE.md` (intent, done-when, shortcuts ledger) and `STATE.md` (log, result), plus
  graduation through `aof:promote`. Refine ratifies or changes it as ADRs.
- 2026-10-22: operator: no time-boxing baked into prototype. A timed test is one use of it, not a
  feature of it. Removed the timebox flag, clock and timebox scope.
- 2026-10-22: operator: requirements are flexible and can change; no acceptance criteria, just a
  few markdown files. Replaced "Done when" with an editable `## Wants` list. Added the four moves
  (start, continue/add, stop, complete) on one `aof:prototype` verb. Graduation now seeds a
  milestone SPEC only; acceptance criteria come at refine.
- 2026-10-22: operator: a prototype lives in `wiki/work` like every work item; it is fixed as a
  prototype (no promotion or conversion to a story or milestone); code goes on the current
  branch. Graduation was dropped and the item renamed from `prototype-builds-fast-then-graduates`.
- 2026-10-22: operator: diagrams can be added to a prototype with `/aof:add-diagram`. Added an
  optional `## Diagrams` section in `PROTOTYPE.md` and a prototype target on add-diagram.
- 2026-10-22 (refine, defaults taken; the operator may overturn any at review):
  - A prototype is **not a driver** (ADR-001). Nothing may `depends:` on it, and `aof work next`
    never offers it. This departs from m37/ADR-001.
  - **Its own four status words** (ADR-003), declared beside the frozen five and not mapped onto
    them. `paused` is not `blocked`, and `done` is reopenable.
  - **Start goes through the one mint** (ADR-004 §2): `runInsertTopLevel` gains an append form,
    and FF-12703 is unchanged.
  - **The verb never commits** and mints no run record. The operator commits, and a prototype has
    no observe trace (time is out of scope).
  - **No DESIGN.md.** The board reuses the existing lanes with a `prototype · <status>` badge
    (ADR-007). No mock was asked for, because nothing new is drawn.
  - **Not in scope:** archiving a done prototype, showing prototype diagrams on the board (the
    `diagramFile` stem grammar), and mesh or fleet rows.
- 2026-10-22: operator: no phase files (`PHASE_N.md`). A prototype stays fluid, but it should be
  auditable. ADR-004 §4 amended so that each stop, done or abandon copies the hand-off into
  `## Log`, keeping every checkpoint's full state without a plan made in advance.
- 2026-10-22: no ADR diagram. The one picture with moving parts would be the four-state machine,
  and ADR-003 §1's table already states it.

- 2026-10-22 (contracts): three business questions answered by the operator: 01 Q1, on `main`
  the command builds and says once that it is on `main`; 02 Q1, a redraw overwrites with no
  dated copy; 03 Q1, a prototype card opens on `PROTOTYPE.md` with a `STATE.md` tab, so
  `PROTOTYPE` joins the artifact set. That last one widens ADR-007 past UI-only, ratified in
  03's contract.
- 2026-10-22 (contracts, defaults): the slug is the ask's words with leading filler dropped,
  six at most; `prototype-one-move`, `diagram-name-unknown` and `diagram-slug-not-applicable`
  are new refusal codes; `runInsertTopLevel` appends only when it is passed `append: true`, so
  the `insert-*` faces keep `insert-invalid-at`; `test/work/stream` rises 36 → 37 in 01. The
  record-doc map rule left 00's example map (it is FF-16801, owned by no person).
- 2026-10-22 (continue 00, solo): `isStatusWord(word)` joins `lifecycle.mjs` beside
  `statusVocabularyFor`. E6 wants `active → in-review` refused as `status-edge-not-applicable`
  naming the legal moves, so the writer's `invalid-status` gate takes a word no type owns, and a
  word another type owns reaches the per-type edge check. The status verb's budget preflight skips
  a prototype: its `done` is "good enough", not an acceptance (ADR-003 §1).
- 2026-10-22 (continue 01, review fix): a new ask passed beside `--stop`, `--done`, `--abandon`
  or `--log` was dropped unwritten; it is now refused as `prototype-one-move` with the rest.
- 2026-10-22 (continue 02): `aof work update` was run in this checkout, because FF-12405 leg 9
  holds `.aof/aof.lock.json` to the shipped manifest and to the disk. It rendered
  `.aof/templates/work/prototype/` and `/aof:prototype`, and moved the lock and apply journal —
  commit those by hand on this branch (the loop's lane reconcile drops `.aof/`).
- 2026-10-22 (continue 02): the `add-diagram` argument hint stays `"<ref> [ADR-NNN]"`: 151's
  delivered `00_the-bundle-ships-aof-add-diagram.feature` states it, and 168/02's contract does not
  amend it. The prototype forms are in the command body and its description.
- 2026-10-22 (continue 02): design lane INCONCLUSIVE (no UI). The pasted block on a prototype is
  checked by nothing: the doctor's diagram lane reads `ARCHITECTURE.md` only, which ADR-006's
  Consequences accept (m151/R3 departed from on purpose).
- 2026-10-22 (continue 03, solo): `bucket` (BoardLanes) and `tabsFor` (DetailPanel) moved into the
  pure `model.ts` as `laneCards` and `tabsFor`, beside `laneFor`, so the lane, the tag and the tabs
  are one module the surface suites bundle and test. `status.tsx`'s helpers take the wire status
  and read it through `laneStatus` (the one mapping), so a prototype's ring agrees with its lane;
  the card's meta line shows the prototype's own word. The widened wire `status` would otherwise
  have tripped 11 typed call sites.
- 2026-10-22 (continue 03): design lane INCONCLUSIVE — no DESIGN.md and no declared `Route`
  (ADR-007: no new surface), so nothing was rendered. Unjudged: whether the longer tag
  (`prototype · abandoned`) truncates beside the ring and ref on a narrow lane card (m35/R5).

## Feedback (for retro)

- 2026-10-22 (continue 00): the declared `files:` was incomplete. The build also wrote
  `packages/work/src/commands/item-status.mjs` (listed in `reads:` only; the status door passes
  the item's type to five `itemStatusEdges` calls), `packages/core/test/bundle.suite.mjs` (the
  template count and `TEMPLATE_IDS`), `test/work/stream/work-backlog-archive-enumerate.test.mjs`
  (it pins both regex sources), `test/arch/work/acd-work-root-one-enumerator.test.mjs` (FF-12701's
  detector matched the old alternation literally, so a copy of the new grammar would have gone
  unseen) and `test/work/work-item-status-lifecycle.test.mjs` (the door case for E4–E7).
  Recorded finding, no Blocker.
- 2026-10-22 (continue 01): the declared `files:` missed the registry-derived guards a new
  `work:*` verb trips — the recurring lesson m41/R3, m19/R1 and m150/R1 already name, which the
  recall surfaced only after the build (it was taken late on 01). The build also wrote
  `packages/work/src/commands.mjs` (`WORK_COMMAND_IDS`), `packages/work/package.json` (the
  export), `packages/core/test/bundle.suite.mjs` (command counts and ids),
  `test/arch/work/acd-work-command-cli-bijection.test.mjs` (the probe argv and the template copy),
  `test/arch/work/acd-work-command-route-coverage.test.mjs` (`prototype` joins the board
  carve-out: its start move mints, and it is built in the operator's own session) and
  `test/work/stream/work-insert-top-level-places.test.mjs` (the `runInsertTopLevel` face set grows
  five → six, as ADR-004's Consequences say). Recorded finding, no Blocker.
- 2026-10-22 (continue 03): the declared `files:` missed `apps/ui/src/board/status.tsx` (the ramp
  now reads the wire status through `laneStatus`) and `test/bundle/artifact-sync-manifest.test.mjs`
  (it pins the artifact count, 9 → 10), and `test/surfaces/board-api.test.mjs`'s pinned `status`
  wire key moved with ADR-007 §1. Recorded finding, no Blocker.
- 2026-10-22 (continue 02): 01's new bundle command had two more censuses than 01's `files:` named
  — `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs` (`prototype.md` excluded: it
  cuts nothing) and `test/loop/autonomous-shell-out-prompt.test.mjs` (the command-member set) —
  caught only when 02's work ran them, plus the install lock (FF-12405 leg 9). 151's own feature
  names all four censuses; 168/01's contract named one. Recorded finding, no Blocker.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off
