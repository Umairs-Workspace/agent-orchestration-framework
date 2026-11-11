---
doc: retrospective
promotionFrom: 1
---
# 04 · Test selection, contract derivation and seam liveness ask relations instead of parsing the graph — retrospective

## R1 · The PLAN's binding would have put a process-starting driver into a pure family

**Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** PLAN said core binds `relations` from the code-only port that
`knowledge-engine.mjs` composes. Built that way, the full code engine (the graphify driver and the
tool store, both of which start processes) entered the audit family's construction closure, and
59/FF-5904 went red at the bounded sweep. The fix was a driver-free port,
`createCodeRelations` in `bindings/code-relations.mjs`, over the code backend's read half.

**Why:** The plan chose the binding by what the readers ask (`relations`), not by what composing
that port pulls in. The reader families carry purity controls the plan did not check.

**Lesson:** Before handing a port to a reader family, list what that port's construction reaches
and check it against the family's purity control (59/FF-5904 for the audit family).

**Refs:** milestone STATE `## Feedback (for retro)` (179/04, caught at the sweep); VERIFICATION
`## Verification evidence` (179/04); 179/ADR-004.

## R2 · The selection rows were written as if the selector were transitive

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** qa · **Raised by:** developer · **Promoted to:** none

**What happened:** Task 00's rows said the suites "registered for" `src/a.mjs` and `src/c.mjs` are
selected when `src/b.mjs` changes. The selector is one-hop (72/ADR-002): a suite is selected only
when it is itself a dependent of the changed file. The fixture realised the rows as suites that
import `b` directly. The feature was not edited.

**Why:** The rows described selection in the operator's terms (a file's suites) rather than the
selector's (direct dependents).

**Lesson:** State a test-selection example in the selector's own one-hop terms: name the suite
file and the import that makes it a dependent.

**Refs:** milestone STATE `## Feedback (for retro)` (179/04 contract flag); 72/ADR-002.
