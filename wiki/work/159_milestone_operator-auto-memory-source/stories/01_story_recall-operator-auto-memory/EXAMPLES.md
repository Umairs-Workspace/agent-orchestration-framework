# 159/01 · Recall operator auto-memory — example map

## R1 · The operator opts in; the absent setting preserves today's index
- E1 · With sources absent and 70 eligible files present, ingest produces the pre-adapter records without reading those files [proposed]
- E2 · With sources [claude-auto-memory] and backend local, the selected project's feedback and project files join whole-stream ingest [proposed]
- E3 · With sources enabled but backend none, ingest remains a no-op [proposed]

## R2 · Only feedback and project entries become operator-owned lessons
- E4 · worktree-node-modules-junction-destroys-source.md with metadata.type feedback becomes a lesson citing its absolute path at line 1; why and how-to-apply remain searchable [proposed]
- E5 · aof-acd-project.md with metadata.type project becomes an operator lesson in the procedural layer [proposed]
- E6 · A reference entry and MEMORY.md without frontmatter contribute no lesson [proposed]

## R3 · Imported lessons have an explicit meaning in the held kind vocabulary
- E7 · The feedback reminder to avoid node_modules junctions declares no kind; it indexes as near-miss with feedback retained as a tag [stated Q1]
- E8 · The project fact describing AOF as a CLI declares no kind; it indexes as near-miss with project retained as a tag [stated Q1]

## R4 · Recall preserves separate sources and reflects the next full rebuild
- E9 · The junction auto-memory record stays distinct from work lessons m45/R13 and m68/R10 and decision 72/ADR-007 in a sufficiently broad recall [proposed]
- E10 · Deleting an eligible file then ingesting removes its record while leaving repository lessons intact [proposed]
- E11 · Disabling the source then ingesting leaves only the pre-existing source families [proposed]

## Questions
- Q1 · business · answered · Which lesson-kind policy applies to feedback and project entries with no AOF kind? On 2026-10-12 the operator answered "Ok let’s go with your suggestion" to the recommendation of fixed near-miss for both types, preserving the original type as a tag. Both types use near-miss; ingest does not classify their meaning.
- Q2 · technical · defaulted ADR-001 · Where does this source compose? The shared whole-stream builder used by both backends, preserving scoped rebuild semantics.
- Q3 · technical · defaulted ADR-003 · How can absolute sources resolve safely? An enabled operator-namespace branch constrained to the selected memory directory, retaining existing guards.

<!--
E7 and E8 are stated by the operator's answer to Q1. Other examples remain proposed.
The architect reviewed Q2/Q3 as engineering choices; Q1 changes product meaning.
-->
