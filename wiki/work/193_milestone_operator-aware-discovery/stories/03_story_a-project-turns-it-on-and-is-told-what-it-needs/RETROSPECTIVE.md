---
doc: retrospective
---
# 193/03 · A project turns it on and is told what it needs — retrospective

## R1 · A new doctor lane always touches the lane census, and a one-home control moves the writer

**Kind:** mistake · **Area:** process (planning) · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer · **Promoted to:** none

**What happened:** Three files outside 03's `files:` changed:
- FF-5905 names every doctor lane module and pins the doctor's composition line, so the new
  operator lane had to be named there.
- The doctor examples-lane suite asserted which lane follows the examples lane.
- FF-19203 (02's) lets only the profile's leaf touch `work.operator`, so the write half of "a
  flag replaces what it names" had to land in that leaf, `correctOperatorProfile`, with a line in
  its README.

It is the third story in this milestone with an incomplete write set (00 R1, 01 R1).

**Why:** Each of the three is a standing rule that is enforced elsewhere: a census of lanes, an
ordering assertion, and a single-home control. Refine read the story's own modules, not the
controls that hold them.

**Lesson:** A story that adds a doctor lane declares FF-5905's suite and every suite that asserts
lane order. A story that writes a value that another control gives a single home declares that
home as its writer. Before `files:` is closed, grep `test/arch` for the names of the modules being
added or written to.
