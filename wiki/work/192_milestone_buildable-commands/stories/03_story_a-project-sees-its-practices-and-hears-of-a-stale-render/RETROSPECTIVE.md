---
doc: retrospective
---
# 192/03 · A project sees its practices and hears of a stale render — retrospective

## R1 · A new doctor lane owes three lane-order pins and a module ceiling

**Kind:** mistake · **Area:** process (planning) · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer · **Promoted to:** none

**What happened:** The story's declared write set missed four reds the new lane caused just by existing. They were the `packages/core/test` budget row, FF-16004's `work find` module ceiling, and the lane-order pins in FF-5905 (`acd-controls-never-execute`), 134/04 (the doctor examples-lane suite) and 133/03 (the doctor diagrams-lane suite). The build found them one by one and fixed them.

**Why:** Refine listed the files the lane's logic touches. The suites that pin the doctor's lane list and the size of the module graph are not part of that logic, so nothing put them in the write set.

**Lesson:** When a story adds a doctor lane, refine adds those three pin suites, the `work find` ceiling and the budget row of each directory that gains a module to `files:` up front.

## R2 · The story's product was a terminal line, and its width was waved through as a Nit

**Kind:** mistake · **Area:** process (delivery) · **Stage:** build (review) · **Owner:** product-owner · **Raised by:** product-owner · **Promoted to:** none

**What happened:** The story's notes said to read the list in a terminal before calling it built. The review measured a row at about 150 columns and recorded it as a Nit. Verify measured 133 and 137 columns. In a 120-column terminal the key, the part the operator copies, wraps (`F-04`).

**Why:** The scenarios check what the row says, not its width. The review judged the defect by its size in the code, not by what it costs the person reading the row.

**Lesson:** When a story's product is a line of output, its width in an ordinary terminal is part of the contract. Fix it in the build, or put a width check in the scenarios. Do not record it as a Nit.
