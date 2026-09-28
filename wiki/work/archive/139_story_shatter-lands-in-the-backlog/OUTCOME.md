# 139 · Shatter lands its drivers in the backlog — Outcome

## Delivered

### Shatter frames into the backlog
`aof:shatter` writes every milestone and spike it frames un-numbered under `backlog/[<group>/]`, each dependent carrying a backward slug `depends:` edge in PRD order. Under `work.intake: "stream"` (or no key), shatter then promotes each driver in PRD order through `aof work promote`, so every stream number is minted by the verb and none by the prompt.

### Promotion enforces and resolves a backlog slug edge
`aof work promote` refuses `promote-depends-backlog` for an item whose `depends:` names a backlog slug. Promoting the target rewrites each entry naming its slug, in every other backlog row, to the minted ref: per entry, after the `--at` seam, and only for a slug unique in the backlog. The envelope reports the rewritten docs as `rewired`, a key present only when non-empty.

### Validate checks backlog slug edges
`aof work validate` reports a slug entry on a backlog row that names no backlog item, adding the written-as number when the slug belongs to a stream item. It reports each backlog slug cycle once, at `<work>/backlog`, whatever the scope. Numeric entries on backlog rows stay unchecked.

### One number/slug predicate
`isDependNumber` in `src/work.mjs` is the one all-digit test. The top-level shift, promote's classifier, the shared per-entry rewriter `rewriteRefEntry` and validate's numbered path all read entries through it, so a digit-led slug (`10x-faster`, `007-bond`) is never shifted, resolved, graphed or zero-padded as a number.

## Assumptions

- **A promoted slug is unique in the backlog** — a slug that two backlog leaves share is rewired nowhere, and a dependent that names it stays refused until the operator disambiguates.

## Gaps

### Scheduling readers still parse a numbered item's `depends:` with `Number.parseInt`
- **Status:** open
- **Discharge condition:** `nextWork`'s readiness walk and the doctor depends lane read entries through `isDependNumber`.
A numbered item holding a digit-led slug in `depends:` is read as that number by `nextWork` and by the doctor depends lane. `aof work validate` reports that state as an unresolved entry, but it does not stop those two readers acting on it.
