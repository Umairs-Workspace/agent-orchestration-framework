---
doc: retrospective
promotionFrom: 1
---
# 169 · Hyperagent plans the work — retrospective

## R1 · The delivery shape changed three times, each time on an assumption nobody had measured

**Kind:** mistake · **Area:** architecture · **Stage:** refine → verify · **Owner:** architect · **Raised by:** operator (review) · **Promoted to:** none

**What happened:** The milestone shipped one delivery shape after another:
- a fourth runtime, rejected with "Hyperagent is not a runtime" (ADR-001);
- an integration that rendered `.hyperagent/` into each project for a GitHub import (ADR-004/005);
- a package in the aof home (ADR-007);
- the same package plus one zip (ADR-008).

Each shape was abandoned when someone looked: the operator at a review, and Hyperagent's own
Create skill dialog at verify. The verify also first read Hyperagent's docs page as "no GitHub import".
The dialog showed one.

**Why:** Two things decided the shape: what Hyperagent consumes (an account-level skill store, filled
by upload or import) and what an external service is to aof (an integration). Both were inherited
from the branch's own author, and neither was measured at refine.

**Lesson:** For an integration with an external service, measure how the service consumes what aof
ships at refine, in the product itself: a five-minute look at its dialog by the operator beats a
docs page. Record that measurement in the first ADR. Where the service stores things per account,
the package belongs in the aof home (165/ADR-006), never in a project's tree.

**Refs:** ARCHITECTURE.md ADR-001, ADR-007, ADR-008; VERIFICATION.md F-06; stories/02/RETROSPECTIVE.md R1.

## R2 · The live run and the whole tree each found what the story lanes could not

**Kind:** mistake (defect) · **Area:** process (verification) · **Stage:** verify · **Owner:** verifier · **Raised by:** verifier · **Promoted to:** none

**What happened:** The first whole-tree gate was red on 11 test-side reds that no story lane selected
(F-04, the m153/F-01 class). The live plan run found that `check` validates without git history
(F-07), which no fixture could show. The second and third gate rows, and the plan branch's re-check,
were green.

**Lesson:** For an integration milestone, the accept evidence is both a whole-tree gate and a real
end-to-end run over the real stream. Each catches a class the other does not.

**Refs:** VERIFICATION.md F-04, F-07; stories/00/RETROSPECTIVE.md R3; REGRESSION.md.
