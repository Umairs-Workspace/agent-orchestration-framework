# 161/01 · Wiki source citations are checked — example map

## R1 · Doctor reports a local wiki source file that the shared resolver cannot resolve
- E1 · wiki/memory.md cites src/never-existed.mjs on line 4: doctor names the page, citation and line in a warning [proposed]
- E2 · wiki/memory.md cites src/moved.mjs and history leads to the existing packages/work/src/moved.mjs: no unresolved warning [proposed]
- E3 · wiki/memory.md cites src/deleted.mjs whose recorded rename target was deleted too: an unresolved warning remains [proposed]

## R2 · Every direct wiki page is checked against the project root, including scoped doctor calls
- E4 · wiki/agents.md cites src/absent.mjs while doctor is scoped to 161/01: the page still produces one warning [proposed]
- E5 · wiki/work/old/SPEC.md cites src/absent.mjs while direct wiki pages are clean: this probe emits no warning for that nested page [proposed]
- E6 · A project has no wiki directory: this probe emits no warning and existing doctor findings are preserved [proposed]

## Questions
- Q1 · technical · defaulted 161/ADR-001 · What severity and scoped visibility should the workspace probe use? Warning-only and visible under item scope, following existing workspace findings.
- Q2 · technical · defaulted 161/ADR-001 · Which citation grammar and history resolver apply? Reuse pathCitationsIn and resolveCitedPath without changing their delivered semantics.

<!--
The SPEC already fixes all-page coverage and shared resolution. The architect
reviewed both questions as engineering choices. No unanswered business question
remains; proposed examples are not labelled as human-confirmed.
-->
