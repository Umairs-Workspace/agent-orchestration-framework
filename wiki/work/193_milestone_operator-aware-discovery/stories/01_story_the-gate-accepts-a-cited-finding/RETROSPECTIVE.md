---
doc: retrospective
---
# 193/01 · The gate accepts a cited finding, and nothing less — retrospective

## R1 · A consumer story declares the producer's module it extends

**Kind:** mistake · **Area:** process (planning) · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer · **Promoted to:** none

**What happened:** To name the finding that an untraced researched example cites (E10), the lane
needed `untracedExamples` in `map.mjs`, which is 00's module, to answer `finding` as well. The
doctor examples-lane suite also had to export `ABSENT` for FF-19202 to import. Neither file was in
01's `files:`. It is the same class as `m79/F-79-A`, and the third story in this milestone with an
incomplete write set (00 R1, 03 R1).

**Why:** The milestone was cut so that 00 owns the parser and 01 the lane. A message that names a
parsed value needs the parser to answer it, so the cut that kept the two stories apart left 01's
needs in 00's file.

**Lesson:** When a story's message or finding names a value, check that the module producing it
already answers that value. If it does not, declare the producer's module in `files:` as an
additive change, even when a sibling story owns it.
