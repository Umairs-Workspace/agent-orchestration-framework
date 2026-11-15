---
doc: retrospective
---
# 193/00 · The map tells a fact from a decision — retrospective

## R1 · A grammar that admits a word breaks the tests that used it as the refused example

**Kind:** mistake · **Area:** process (planning) · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer · **Promoted to:** none

**What happened:** 00 admitted `policy` as a question class. Four 134 fixtures, three rows and the
`bad-class` reason row in the doctor examples-lane suite and one row in the build-door suite, used
`policy` as their example of a class the grammar refuses. They had to move to `regulatory`, in two
files outside 00's `files:`. The incomplete write set is the class of `m79/F-79-A`.

**Why:** A test that picks a plausible-sounding word as its "invalid" example is pinned to the
vocabulary not growing. Refine read the grammar's own suite, and not the suites that hold its
refusals.

**Lesson:** When a story admits a new word into a closed vocabulary, grep the tests for that word as
a literal before writing `files:`, and declare every suite that uses it as a refused value. Use an
invalid example that no planned change will admit (`regulatory`, not a neighbour of the real set).
