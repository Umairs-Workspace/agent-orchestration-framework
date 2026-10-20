---
doc: retrospective
promotionFrom: 1
---
# 164/01 · The desktop app syncs every workspace — retrospective

## R1 · The tick's workspace set was only as good as a membership rewritten from a silently truncated roster

**Kind:** blocker · **Area:** architecture · **Stage:** verify · **Owner:** architect · **Raised by:** main-session verification (live check) · **Promoted to:** none

**What happened:** The story made the tick sync `global_node_workspaces`. Every registry publish
deletes a workspace's links and re-links them from the node roster. `readNodeRecords` skips an
unparseable file without a word. With every node record torn, each publish emptied its
workspace's membership, and the tick skipped it. The injected-ticker suite could not see this,
because it writes this node's record once and never tears it; its own fixture comment named the
hazard ("without it the first publish of a workspace would unlink this node from it").

**Why:** The refine read the set's resolver (`resolveNodeWorkspaces`), not the writer that rebuilds
the set on every publish, and the roster reader's "skip a torn file" rule was written for a status
display, where a partial roster is harmless.

**Lesson:** When a story starts depending on a derived table, it reads every writer of that table
and asks what each writer does with partial input. A rewrite-from-source write refuses over
partial input; it never shrinks the target to what it could read.

**Refs:** ../../VERIFICATION.md F-02; tasks/03 (E9, E10); ../../ARCHITECTURE.md ADR-004 amendment.
