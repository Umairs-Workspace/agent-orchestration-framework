# 05 · The pairing table — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### Every optimizing loop aof ships is watched
`src/bundle/loops/` carries three `kind: watcher` records — `watcher:build-to-green-watcher`, `watcher:review-fix-rereview-watcher` and `watcher:autonomous-cascade-watcher` — one `monitoring` edge each at `loop:build-to-green`, `loop:review-fix-rereview` and `loop:autonomous-cascade`, the only three loops in the registry declaring `optimizing: true`.

### The watchers install by the ordinary update path, and are framework-owned
The three are `bundle.json` asset members targeting `.aof/loops/`, rendered verbatim for both the `claude` and `codex` runtimes; each carries the `# aof-generated: true` marker, so `aof work update` classifies an operator-edited copy `drift-warning` and preserves it rather than overwriting it.

### Every watcher's number is produced by a machine, and the pointer resolves
All three declare `determinism: counter` with a single `command:` measurement pointer — `command:work:ratchet` on the build watcher, `command:work:counters` on the other two — each naming a route registered in the command registry. No watcher declares `prose:` measurement, and none is a judge.

### The independence legs hold on the records rather than being asserted about them
Each watcher measures a different artifact from the loop it watches, counts a different quantity from that loop's `controlled:`, and declares no `actuator` — the kind admits no such key. The shipped registry loads with zero error-severity findings while the inherited `loop-owner-unknown` and `loop-field-prose-only` warnings remain warnings.

### aof's own registry satisfies the rule aof ships
`.aof/loops/` holds 14 records including the three watchers, byte-identical to their bundle sources. `loadLoops` over it reports 14 nodes, 3 watchers and zero error-severity findings.

### A shipped loop record that is not installed is now a red control
`test/arch/acd-registry-framework-owned.test.mjs` (`FF-5313`) asserts every `.aof/loops/` bundle member is present on disk and byte-identical to its `src/bundle/loops/` source — the byte comparison the `.aof/loops/*.md text eol=lf` pin in `.gitattributes` was already written for.

## Assumptions

- **The command ids are frozen ahead of their commands** — the `work:ratchet` and `work:counters` pointers were authored against ADR-007 §3's frozen ids; they resolve because `57/03` and `57/04` landed those routes, and a rename of either breaks the records rather than the commands.
- **`optimizing: true` marks the whole population to be watched** — the pairing table is complete against the three loops that declare it today; a fourth optimizing loop is unwatched until a record is written for it.

## Gaps

### A watcher's `monitoring` edge still moves no verdict
- **Status:** open
- **Discharge condition:** `57/01` widens the graph decomposition and `checkPairing` to admit `kind: watcher` nodes.
- `isGraphNode` (`src/work-loops-checks.mjs:103`) admits `loop`, `actor` and `anchor`, so `checkPairing` filters the three installed watchers out before counting: `aof work loops validate` still reports `loop-unpaired-optimizer` for all three optimizing loops. Measured over the now-installed registry, re-running that check's own logic with watchers admitted returns **0** unpaired — the table is complete and inert, and the verdict moves when `57/01` teaches the check to read it. This is `57/00`'s second declared gap, carried forward unchanged; this story discharged its first.

### The gating-codes leg of `FF-5708` is checked by proxy
- **Status:** open
- **Discharge condition:** `57/01` lands `GATING_CODES` and its severity map, at which point the control can assert the declared wording literally.
- `FF-5708` declares *"zero findings whose code is in `GATING_CODES`"*; that set does not exist yet, so the landed control asserts the reachable proxy — zero error-severity findings — with a behavioural scenario confirming the inherited warnings are still present and still warnings, so the clean result is not a registry that stopped being read.

### The bundle→installed parity leg carries no declared control id
- **Status:** open
- **Discharge condition:** the architect either promotes the leg to its own `FF-NNNN` row in a register or records it as part of `FF-5313`'s declared invariant.
- The leg is armed and red-probed on both its halves, but it extends a milestone-53 control without amending that milestone's declaration, so no register states the invariant it enforces.
