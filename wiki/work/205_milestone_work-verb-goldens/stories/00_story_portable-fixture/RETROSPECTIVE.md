---
doc: retrospective
promotionFrom: 1
---
# 205/00 · One portable fixture exposes stream and CLI drift — retrospective

## R1 · New fixture files mapped to no suite, so the story's impacted gate ran the whole tree

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner (continue) · **Promoted to:** none

**What happened:** The story added a seed, an adapter, a clock, a runner, case manifests and baselines under `test/golden/`. None is a suite, and nothing declared which suites read them. The impacted selection widened from five unresolved paths to all 1,311 suites. That run met the stream's inherited reds and a sandbox-denied listener, and it was stopped. The build closed before review. The operator reopened it, and `work.test.couplings` now selects 19 suites.

**Why:** The story's `files:` named the fixture files but not the suites that consume them, and the test layout only knew suites by suffix.

**Lesson:** A story that adds test inputs that are not suites (fixtures, manifests, baselines) declares their `work.test.couplings` in the same diff. An unresolved path widens its impacted gate to the whole tree.

**Refs:** ../../STATE.md, "Closure record" (gate repair); `.aof/aof.config.json` `work.test.couplings`.
