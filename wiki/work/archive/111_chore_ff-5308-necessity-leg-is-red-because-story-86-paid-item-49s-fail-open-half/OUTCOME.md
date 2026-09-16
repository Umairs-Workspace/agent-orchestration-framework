# 111 · FF-5308's necessity leg is red, and it is the good news it says it is — Outcome

## Delivered

### `LOOP_SCOPE_FORMS` is a ratified freeze rather than an unruled default
`src/work-loop.mjs` exports exactly the two frozen forms `driver` (`/^\d+$/`) and `range`
(`/^\d+-\d+$/`), and `53_milestone_loop-artifact/ARCHITECTURE.md` ADR-017 carries the argument that
holds after TECH_DEBT item 49's payment, so the pair rests on stated grounds rather than on the
fall-through defect ADR-003 argued from.

### The scope vocabulary is recorded as the admission grammar of four unattended launch surfaces
ADR-017 names `commands/loop.mjs:814`, `commands/trigger.mjs:310`, `work-trigger/declaration.mjs:211`
and `mesh-assignment-directive.mjs:128` — the last dispatching to a remote worker — so widening the
vocabulary is a change to four doors plus the engine's invocation, declaration and resume doors,
never to one regex.

### No surface in the stream still points at a widening that will not happen
FF-5308's register row and its `State now` cell, and the item-49 codebase-health note, are amended in
place in `53/ARCHITECTURE.md` to the file's own dated convention; `wiki/work/TECH_DEBT.md` carries no
copy, so those two plus ADR-017 are the whole set and a reader of any of them finds the ruling instead
of the stale follow-on.

### FF-5308's register row describes the leg that actually ships
The row's necessity-leg text states the inverted claim delivered at milestone `96`'s gate — a
story-shaped scope resolves to its own item and reaches no earlier milestone's competitor — so the
register and `test/arch/acd-loop-scope-guard.test.mjs` (6/6 green) now make the same claim, and a red
on FF-5308 is a regression rather than the designed good news.

## Gaps

### An unattended loop over a story span
- **Status:** open
- **Discharge condition:** a caller that genuinely needs an unattended loop over a story span, at
  which point `loopScopeIncludes` (`src/work-loop.mjs:649`) is taught story-grained semantics rather
  than the regex widened.

`aof work loop` refuses `NN/SS` and `NN/MM-PP` with `loop-scope-unsupported` naming both admitted
forms; `aof work drive` and `/aof:continue NN/MM-PP` are the standing alternatives, and ADR-017
carries this trigger by name so the freeze rests on no unstated premise.

### TECH_DEBT item 49's one-home leaf
- **Status:** open
- **Discharge condition:** the three scope parsers consolidated into `src/work-scope.mjs`, which is a
  story rather than a chore — `src/work.mjs` sits at the ADR-015 §5 reach ceiling of 24 exactly, so it
  cannot import a leaf without reddening FF-5301.

This chore closed item 49's fail-open half only; the ledger entry stays open for the remaining half.
