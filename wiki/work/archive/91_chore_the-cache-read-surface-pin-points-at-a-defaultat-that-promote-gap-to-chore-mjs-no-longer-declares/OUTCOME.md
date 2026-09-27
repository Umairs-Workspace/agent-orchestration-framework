# 91 · The Cache Read Surface Pin Points At A Defaultat That Promote Gap To Chore Mjs No Longer Declares — Outcome

## Delivered

### A resolving subject anchor on ADR-016/G2's structural-read pin
`test/arch/acd-cache-read-surface-boundary.test.mjs`'s STRUCTURAL entry pins the promotion family's
append-position disk read at `src/work-promote/promotion.mjs`'s `appendPosition` (via `listItems`)
rather than at a `defaultAt` no module under `src/` declares any more, so the `assertPinned` lane is
green on a subject that exists and answers for both faces of the promotion engine at once.
