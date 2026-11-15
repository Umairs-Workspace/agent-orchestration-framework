---
doc: retrospective
---
# 193/04 · Discovery researches before it asks — retrospective

## R1 · The near-miss recall runs before the build, not during it

**Kind:** mistake · **Area:** process (delivery) · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** The near-miss recall for 04 ran at 22:31Z, after the build had begun (the run was minted at 22:06Z). Two of its five lessons bore on the build: keep the batch's specimen clear of the token grammar (`m52` R2), and give an equality control planted leaks so it cannot pass vacuously (`m123` R3). Both were honoured, but only because the work they would have changed had not been written yet.

**Why:** The recall is a step of `aof:continue`'s build, not a precondition of it, so a session can start writing before it runs and nothing notices.

**Lesson:** Run the recall right after the run is minted and before the first edit. Read each returned lesson against the story's PLAN, and name in the build notes which lessons were honoured, and how.

## R2 · An off-is-today control that compares two renders needs a second leg

**Kind:** near-miss (insight) · **Area:** architecture (controls) · **Stage:** build · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** As declared, FF-19204 compared a render with a render from a bundle that drops the practice. That comparison cannot see practice prose written into core, because both renders carry it. The control as built has three legs: byte equality, no sentence that only an operator-aware fragment holds, and no leftover slot marker. Members are found by the folder they ship under, so a fragment relabelled into another practice is still stripped.

**Why:** A difference-based control is blind to anything that is common to both sides of the difference, and the likeliest leak (prose pasted into the shared core source) is exactly that.

**Lesson:** When an "off renders nothing" control compares a render with and without a practice, pair it with a content leg that searches for the practice's own sentences. Plant one leak per leg (core, wrong practice, Codex body, leftover marker) to prove each leg can go red.
