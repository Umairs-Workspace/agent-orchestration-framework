# 71/00 · The build's terminator, and the free gate that runs before any reviewer is spawned — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004). States product
  STATE ("the system now IS X"), never motive. An ADDITIONAL artifact: it carries no identity
  frontmatter and is never this item's record doc — `STORY.md` is.
-->

## Delivered

### The build phase has a spoken failure-to-progress terminator
`aof:continue`'s build step states two terminators and which one it stopped at: success is all three
legs together (every task's `@executable` scenarios green, typecheck and lint clean, fitness
functions passing), and a build whose failing-scenario count stops falling for 2 consecutive rounds —
`work.loop.buildNoProgressRounds` — stops, hands back naming the failing scenarios and the bound, and
prints no accept hand-off.

### The free deterministic gate runs before any review lane is spawned
`aof:continue` walks `aof work validate <ref>` then `aof work doctor <ref>`, both scoped to the driven
item's own ref, as step 4 — between Build and Review. The first red rung short-circuits, a rung that
exits non-zero is a red rung, a red gate is reported as its own outcome rather than as a review
verdict, and the ladder re-runs after every fix round without consuming a review round.

### The prompt's ladder is derived from the shell's, not copied from it
`test/arch/acd-prompt-gate-ladder-parity.test.mjs` reads the gate ids out of `invokeGateLadder`
(`src/commands/loop.mjs`) and asserts set equality in both directions plus rung order, so a rung added
or removed in the shell fails CI until the prompt agrees.

### A loop bound stated in a bundled asset names its home and equals it
`test/arch/acd-prompt-bounds-name-their-home.test.mjs` resolves every `work.loop.*` key any asset under
`src/bundle/` names through `LOOP_BOUND_VALUE_RESOLVERS`, compares every stated value against that
bound's own declared answer — binding to the exported clamp when one stands in the same sentence, and
to the config key otherwise — and requires the three command bound facts (`work.loop.reviewRounds`,
`MAX_REVIEW_ROUNDS`, `work.loop.buildNoProgressRounds`) each to name their home. A numeral in prose
that names no key and no clamp is out of reach by construction.

## Assumptions

- **The prompt is the enforcement** — both terminator and ladder are behaviour an agent performs by
  reading the shipped command, not code the runtime refuses to skip. The controls prove the prompt
  states the rule; only a live run proves an agent follows it (`VERIFICATION.md` F-71-B).
- **`src/loop-bounds.mjs` stays the one home for `work.loop.*`** — both controls read their expected
  values from it, so a second declaration site would make the comparison meaningless rather than red.
- **The rendered runtime copies are kept in step by hand** — `.claude/`, `.codex/` and `.opencode/`
  were verified byte-identical to `renderBundleOutputs()` at this accept, but no control enforces it
  yet (F-71-A).

## Gaps

### FF-7106 — a story's declared write set includes every generated sibling
- **Status:** open
- **Discharge condition:** `test/arch/acd-declared-writes-include-generated-siblings.test.mjs` exists,
  is registered in `scripts/test.mjs`, and is cited by a row in `ARCHITECTURE.md` that carries no
  `pending` marker.

ADR-008 declares the control that would ratchet the bundle-member → manifest → tracked-render
relationship this story's own `files:` satisfies, and no story in milestone 71 lands it. The relation
holds today by hand-measurement, not by enforcement.
