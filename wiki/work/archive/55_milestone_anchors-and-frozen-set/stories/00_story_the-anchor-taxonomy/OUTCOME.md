# 00 · The anchor taxonomy — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### `kind: anchor` node class
The loop registry admits a third node kind beside `loop` and `actor`, requiring `id`, `kind`, `title`, `ground` and `observes`, and carrying the same five edge keys as every other node.

### The six-member `ground:` taxonomy
`GROUND_VALUES` is `process-exit`, `build-stamp`, `landed-commit`, `live-soak`, `frozen-rule`, `exogenous` — a frozen set in `src/work-loops.mjs`, admitted on `kind: actor` and `kind: anchor` and on no `kind: loop` node at any value.

### `observes:` — the registry's one no-prose field
An anchor's authority parses through the pointer grammar alone: a `module:`, `command:` or `config:` pointer is admitted, and `prose:`, `unknown` and free text are each a `loop-bad-value` refusal rather than the declared gap they remain on every other key.

### The nine milestone-52 records still parse byte-unchanged
Every record the previous milestone delivered loads with zero error-severity findings after the widening, and `actor:operator`'s `ground: exogenous` is now a member of the taxonomy rather than its only value.

### Two framework anchors, delivered through the bundle
`anchor:rubric-process-exit` (`ground: process-exit`, observing `src/commands/grade.mjs#reportObservation`) and `anchor:run-liveness` (`ground: live-soak`, observing `src/run-store.mjs#isStale`) ship as bundle assets for both runtimes, install byte-identical to source into `.aof/loops/`, and declare three `data-feed` edges between them — each edge cited in the record's own body.

### FF-5501, armed
`test/arch/acd-anchor-taxonomy-additive.test.mjs` fails when the enums drift from their literals, when a set stops being frozen, when `ground` becomes admissible on a loop, when `observes` accepts prose, and when any milestone-52 record stops parsing.

## Assumptions

- **The pointer grammar is the whole authority language** — `observes:` resolves only what `POINTER_SCHEMES` already parses, so an authority that is neither a module symbol, a command nor a config key has no spelling in this taxonomy.
- **An authority's existence is checked, its behaviour is not** — the day-one anchors' `observes:` pointers are proven to name a real exported symbol in a real file; nothing here asserts that symbol still measures what the record's body says it measures.

## Gaps

### An anchor is declarable but not yet consumed
- **Status:** discharged
- **Discharge condition:** 55/01 lands the widened grounding seed and the `loop-anchor-absent` finding.
- Discharged 2026-08-27 at 55/01's accept: the seed floods from any node bearing an admitted `ground:` value, so a `kind: anchor` node's class and its `data-feed` edges now change the verdicts the report produces, and a loop with no inbound anchor edge is named by `loop-anchor-absent`.

### A stale authority reads as a live one
- **Status:** discharged
- **Discharge condition:** 55/01 lands the `stale` verdict for an anchor whose `observes:` no longer resolves.
- Discharged 2026-08-27 at 55/01's accept: `resolveAnchorAuthorities` resolves all three pointer schemes at the command boundary and a component whose anchor no longer resolves reports `stale`. The LOADER is unchanged and still admits either pointer alike — resolution is a property of the report, not of parsing.

### Five of the six ground classes have no framework anchor
- **Status:** open
- **Discharge condition:** a defensible authority exists in this repository for the class, and a record declaring it cites the evidence in its body.
- `process-exit` and `live-soak` each have one declared anchor; `build-stamp`, `landed-commit` and `frozen-rule` have none, and the loops with no anchor edge are left unanchored and reported rather than given a fabricated one.
