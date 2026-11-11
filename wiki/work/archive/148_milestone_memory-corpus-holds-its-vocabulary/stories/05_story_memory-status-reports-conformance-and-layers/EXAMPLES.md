---
doc: examples
---
# 148/05 · Memory status reports conformance and layers — example map
<!--
Drafted at refine's discovery beat, 2026-10-04, from the live index (graphify, 2,871 records).
Struck before asking, because the record answers them: whether the counts are per field or per
lesson (SPEC: "blank and non-enum counts per field"); whether brief changes (out of scope, since its
lesson/adr digest is its own); whether episodic types are added here (SPEC: episodic-memory-is-recallable
owns them and extends this map). A stale store is reported by each backend beside the version
bump, so it is 148/02's rule (its R5), not this story's.
-->

## R1 · Status accounts for every record, by type and by layer
- E1 · The live graphify index → lesson 489 under procedural; adr 596, capability 1,327, gap 443 and summary 16 under semantic; episodic 0; the types sum to 2,871 [stated Q1]
- E2 · An index holding 3 records of a type the map does not name ("finding") → "finding" counted under layer "unmapped", and the types still sum to recordCount [proposed]
- E3 · The local and graphify backends built over the same stream → the same types, layers and counts [proposed]

## R2 · Status reports blank and non-enum counts per field
- E4 · Three lessons with Kind "near-miss", "blind spot" and "" → kind blank 1, non-enum 1 [proposed]
- E5 · Three gaps with status "open", "discharged" and "pending" → gap status non-enum 1 [proposed]
- E6 · A lesson with Owner "" → owner blank 1, and Owner reports no non-enum count [proposed]

## R3 · The block shows a record's tags, and an untagged record's line does not change
- E7 · m40/R3, tagged "cross-milestone, discovered here" → `R3 (m40) · near-miss · memory/accounting · Adding a new record KIND obliges updating every consumer that partitions records by kind — memory status was left counting only lessons+adrs · [cross-milestone, discovered here] · archive/40_milestone_work-item-versioning-upgrade/RETROSPECTIVE.md:28` [proposed]
- E8 · m01/R2 (Kind "near-miss", no qualifier) → its line is byte-identical to today's, five fields [proposed]
- E9 · A gap discharged "by story 86, 2026-09-04" → its line carries `[by story 86, 2026-09-04]` before its source [proposed]

## Questions
- Q1 · business · answered · Which layer does status name for a lesson? The origin research files the `R<n>` lesson line under procedural memory, as the residue of "what works" (§2.3, §4.3), while its headline calls the retrospective procedure that produces lessons the semantic layer's (§0). Procedural or semantic? (procedural, 2026-10-04)
- Q2 · technical · defaulted ADR-004 · Is status counted per backend or composed at the seam? (composed at the seam, as brief is)
- Q3 · technical · defaulted ADR-004 · Where do the new numbers sit in the JSON? (inside objects, never as new top-level numbers)
