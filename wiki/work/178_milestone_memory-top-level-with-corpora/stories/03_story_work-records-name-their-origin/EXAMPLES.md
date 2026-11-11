# 178/03 · A recalled work record names the planning document its item came from — example map

## R1 · A work record carries its item's declared origin, resolved to a project-root path, from where an archived item stood before archiving
- E1 · Milestone 178's SPEC declares `origin: wiki/planning/PRD-memory-engine.md`: each of 178's ADR records carries `origin: ["wiki/planning/PRD-memory-engine.md"]` [proposed]
- E2 · A milestone not archived, at `wiki/work/62_milestone_self-improvement-loop/`, declares `[../../planning/PRD-acd-loop-engineering.md, ../../planning/PRD-graph-engineering.md]`: its records carry both, as `wiki/planning/…` paths, in declared order [proposed]
- E3 · Story 153/01 declares no origin and milestone 153 declares `wiki/planning/research/RESEARCH-agent-memory-procedure.md`: the lesson records from 153/01's RETROSPECTIVE carry the milestone's [proposed]
- E4 · An import-store record and an operator auto-memory record carry `origin: []` [proposed]
- E5 · `wiki/work/archive/48_milestone_fleet-session-identity/SPEC.md` declares `../../planning/PRD-web-ui-restructure.md`: the record carries `wiki/planning/PRD-web-ui-restructure.md` [proposed]
- E6 · `wiki/work/archive/119_milestone_the-tree-gets-an-interior/SPEC.md` declares `[../TECH_DEBT.md]`: the record carries `wiki/work/TECH_DEBT.md` [proposed]

## R2 · A value that names no existing file is dropped and counted, never cited
- E7 · `wiki/work/archive/72_milestone_inner-loop/SPEC.md` declares `../../planning/RESEARCH-agent-loop-economics.md`, a file since moved to `wiki/planning/research/`: that value is dropped, its sibling `PRD-acd-loop-performance.md` is kept, and `status` counts one unresolved value [proposed]
- E8 · `origin: ../../../../etc/hosts` or `/etc/hosts` resolves outside the project root: dropped and counted, never read [proposed]
- E9 · Over the live stream on 2026-10-29, 85 declared values in 66 record docs: 79 resolve and 6 are dropped, so `status` reports `origin.unresolved: 6` [proposed]

## R3 · Origin is shown and never scored
- E10 · A `--block` line for 178's ADR-001 reads `ADR-001 (m178) · adr · architecture · <title> · origin wiki/planning/PRD-memory-engine.md · <source>` [proposed]
- E11 · A record with `origin: []` renders its block line byte for byte as before this story [proposed]
- E12 · The same query over the same stream ranks records in the same order before and after `origin` is added [proposed]

## R4 · The record shape grows by one field under an index-version bump
- E13 · `INDEX_VERSION` and `GRAPHIFY_INDEX_VERSION` are both 4, and `MEMORY_RECORD_FIELDS` includes `origin` [proposed]
- E14 · A version-3 local store reports `index: { version: 3, current: 4, stale: true }`, its block lines render as before, and after `aof memory ingest` it reports version 4 and fresh [proposed]

## Questions
- Q1 · technical · defaulted STATE.md · How does an archived item's doc-relative origin resolve? ADR-002 tried the root, then the doc's folder. That drops 43 of the 79 values that resolve, because `aof:archive` moved each folder one level down after its origin was written. This contract adds a third candidate: the doc's folder as it stood at the work root before archiving. Ratified here (STATE, 2026-10-29).
- Q2 · technical · defaulted STATE.md · Does this story repair the six SPECs that name the moved research file? No. Archived records are history, and `status` reports the count, so the operator can see it.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-002 · Where does `status` get the unresolved count? The build writes `origin: { unresolved: n }` into the index document, and both backends' `status` report it. It is nested, so the top-level counts still sum to `recordCount`.
- Q4 · technical · defaulted ARCHITECTURE.md#adr-002 · A version-3 store's records have no `origin`. Are they read as `[]`? Yes, as for `tags`. `status` reports the store stale until `aof memory ingest`.

<!-- No business question remains: the operator chose link-following (STATE), and ADR-002 plus
     this contract settle every engineering choice. Examples stay proposed. -->
