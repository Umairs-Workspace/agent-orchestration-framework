---
doc: retrospective
promotionFrom: 1
---
# 164/00 · A local change is noticed and owed — retrospective

## R1 · The declared read set missed the assembly seam and a control whose scan was too narrow

**Kind:** mistake · **Area:** contract · **Stage:** build · **Owner:** architect · **Raised by:** developer (STATE feedback) · **Promoted to:** none

**What happened:** The build needed `packages/core/src/application/assemble.mjs`, because the
publisher binding takes the effects services and the face takes the publisher provider. It also
needed `test/arch/command/acd-effects-ledger.test.mjs`, whose append-only scan read only the core
and effects packages, so the mesh, work and execution seams it listed were never checked.

**Why:** The plan listed the modules that change behaviour, not the composition root that wires a
new service edge, nor the controls that already pin the seams being added to.

**Lesson:** When a story gives one binding a new collaborator, `assemble.mjs` is in its `files:`.
When it adds a seam to a control's census, it reads that control's scan scope first, and widens it
if the scope misses where the seam lives.

**Refs:** ../../STATE.md Feedback (164/00); ../../VERIFICATION.md F-01.

## R2 · Making every command publish turned an old secondary-checkout overlap into a frequent one

**Kind:** mistake · **Area:** architecture · **Stage:** build (review) · **Owner:** architect · **Raised by:** developer (review) · **Promoted to:** none

**What happened:** A second checkout of a mesh-published repo (a sibling worktree with the same
`workspaceId`) now publishes its own state on every command and shares this node's baseline, so
the two checkouts alternate rows.

**Why:** Publish-on-mutate already had this shape. The CLI driver multiplies its frequency, and
workspace identity is still cwd-derived (TECH_DEBT item 4).

**Lesson:** A driver that raises a write's frequency re-reviews every known overlap of that
write, and fixes it in the same item rather than routing it on. Routed to a later story at review,
it was measured live at verify: the operator's own sibling worktree of this repository was
republishing all of the workspace's rows on every command (F-06). The propagation predicate now
refuses a linked worktree (task 03).

**Refs:** ../../VERIFICATION.md F-06; tasks/03; ../../STATE.md review close (164/00).
