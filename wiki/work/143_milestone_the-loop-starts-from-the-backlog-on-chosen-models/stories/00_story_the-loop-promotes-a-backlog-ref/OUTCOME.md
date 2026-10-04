# 00 · The loop promotes a backlog ref — Outcome

## Delivered

### A backlog slug is a loop scope
`aof work loop <backlog-slug>` resolves the scope with `resolveItemExact`. It promotes a backlog row through the registered `work:promote` alone (FF-14301), narrates `Promoted <slug> → <NN>.` and runs at the minted number. A promote refusal is the loop's refusal, with nothing minted.

### The declaration names where a promoted scope came from
Every run the loop mints carries `promotedFrom`: the slug, or `null` for a numeric scope. A declaration written without the key, by an older build or by a caller that does not pass it, reads back with `promotedFrom: null`.

### The read-only doors never promote
`--dry-run`, an L1 report and a `--json` probe on a backlog slug answer `wouldPromote` and write nothing. `--stop`, `--hand-off` and `--resume` refuse a backlog slug with `loop-backlog-ref-not-running`.

## Assumptions

- **The slug resolves exactly** — the scope is matched by the refine/continue door's exact resolver. A differently-cased slug is refused `loop-scope-unsupported` rather than guessed.

## Gaps

### An L3 launch promotes before its gate
- **Status:** open
- **Discharge condition:** the L3 gate is computed against the backlog row before `work:promote` runs, or a refused L3 gate on a promoted slug is reported as "promoted, not started".
`aof work loop <slug> --level L3` promotes first and then computes the L3 gate against the new number's doctor. A refused gate leaves the item promoted and the loop not started (F-143-05).
