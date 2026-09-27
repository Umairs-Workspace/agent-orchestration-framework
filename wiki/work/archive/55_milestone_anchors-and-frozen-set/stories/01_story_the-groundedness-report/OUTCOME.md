# 01 · The groundedness report — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### Grounding is seeded by `ground:`, on any host permitted to carry one
`analyseGrounding` floods from every node bearing an admitted `ground:` value — `kind: anchor` and `kind: actor` alike — rather than from the single `actor` + `exogenous` predicate milestone 52 shipped, and every grounded component carries the `groundClasses` that supported it.

### A fourth verdict, `stale`, distinct from both its neighbours
A component's verdict is one of `anchored`, `exogenous-only`, `self-referential` or `stale`, and an anchor that resolved once and does not now reports `stale` — a different token from a component that never had an anchor, distinguishable without reading any message text.

### A loop nothing anchors is named, not merely absent from a list
Every `kind: loop` node with no inbound `data-feed` edge from a `kind: anchor` node appears in `unanchoredLoops` and raises a `loop-anchor-absent` finding naming it; the count is reported beside the names. In this repository that is four — `loop:autonomous-cascade`, `loop:retrospective-memory-ingest`, `loop:review-fix-rereview`, `loop:verify-triage-accept` — against 11 components at 5 anchored / 2 exogenous-only / 4 self-referential.

### `work:loops-groundedness` — a registered command with a frozen `--json` document
The report is reachable as `aof work loops groundedness --json` and in-process through `invokeRegistered("work:loops-groundedness")`, returning `{source, present, state, components, unanchoredLoops, authorities, findings, summary}`, byte-identical across runs on an unchanged registry and repository. It has no board route: `loops-groundedness` sits in `BOARD_DEFERRED` beside `loops-show` / `loops-graph` / `loops-validate`, so the loop family opens no `/api/work` door.

### The three pointer schemes are resolved, not merely parsed
`resolveAnchorAuthorities` answers `{pointer, resolved}` per anchor: a `module:` pointer resolves when the named symbol is genuinely exported from a file inside the owning root, a `command:` pointer when the registry registers that id, a `config:` pointer when the workspace config declares that dotted key — and each returns `false` rather than throwing when it does not.

### The checks stayed pure, and the guard that says so was widened to cover it
`src/work-loops-checks.mjs` imports nothing and performs no filesystem, process or clock read; resolution arrives as a map argument built at the command boundary. 52's purity guard was extended to cover the resolution map rather than joined by a sibling.

### The verdict is returned, never written
Producing the report writes nothing to disk — no verdict, no resolution result and no staleness record is persisted by this story.

### FF-5502 and FF-5503, armed
`test/arch/acd-anchor-grounding-seed.test.mjs` fails when the seed narrows back to a kind predicate, when the SCC decomposition body moves from its pinned digest, when the verdict set drifts from its four literals, or when a sixth edge key appears; the extended `test/arch/acd-loop-checks-pure.test.mjs` fails when any I/O re-enters the checks.

## Assumptions

- **A `module:` pointer resolves against the root that owns the record** — a bundle-generated record (`# aof-generated: true`) resolves against the aof package root and a consumer record against the workspace root, so an anchor moved between the two changes what its pointer means.
- **Export-shape recognition is textual** — `declaredHere` matches `export` declarations and re-export braces in source, so a symbol exported by a form outside that grammar reads as unresolved and its anchor reports `stale`.
- **`stale` is a claim about this checkout** — resolution runs against the working tree the command is invoked in, so the same registry can report `anchored` on one checkout and `stale` on another.
- **The command boundary is the only impure half** — every consumer of `buildGroundednessReport` supplies its own resolution map, so a caller that supplies an empty one gets `stale` for every anchor rather than an error.

## Gaps

### The check is not in the Loop-Ready score
- **Status:** discharged
- **Discharge condition:** 55/05 registers the check id in `COMPOSED_CHECK_IDS` and gates L3 on it.
- `anchor-grounding` is a composed Loop-Ready check and an L3 admission input as of 55/05; `aof work doctor` reports it among the score's blocking checks (50%, 5/10, `anchor-grounding` blocking) rather than the report standing outside the score.

### No verdict is recorded, so nothing can be audited over time
- **Status:** open
- **Discharge condition:** a stamped, provenance-carrying groundedness reading is written through 55/02's envelope, or milestone 78's per-item loop execution record lands its unresolvable-authority row.
- The report answers only for the instant it runs; there is no persisted history, so a component that drifted from `anchored` to `stale` is indistinguishable from one that was never anchored, and no trend over runs exists to read.

### Three of the six ground classes still have no anchor to seed from
- **Status:** open
- **Discharge condition:** a defensible authority exists in this repository for `build-stamp`, `landed-commit` or `frozen-rule`, and a record declaring it cites the evidence in its body.
- The widened seed admits all six classes, but only `process-exit` and `live-soak` have a declared anchor, so the four unanchored loops the report names stay unanchored — reported rather than given a fabricated edge.
