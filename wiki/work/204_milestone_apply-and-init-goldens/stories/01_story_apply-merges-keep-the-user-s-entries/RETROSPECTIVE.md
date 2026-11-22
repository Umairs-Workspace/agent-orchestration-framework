---
doc: retrospective
promotionFrom: 1
---
# 204/01 · Apply's merges keep the user's entries — retrospective

## R1 · Widening a shared rule reached a contract and a check that the plan did not name

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer (build) · **Promoted to:** none

**What happened:** The story made `coAuthoredOutput` read the path alone, for every runtime. Its
notes predicted that 00's baselines would move. They did not predict two other effects. 00's E9
("one journal entry for each Codex output") became false, and needed a contract amendment. The
doctor's `generated-output-drift` went blind to an edit inside aof's `.mcp.json` entry, and
`graph-faces/01` went red. The fix touched `config-inspect.mjs`, its suite and
`workspace-runtime-audit.json`, and `files:` listed none of the three.

**Why:** Refine traced the rule's effect on the outputs, the baselines, and not on the other
readers of the rule's result: a scenario that counted by runtime, and a doctor check that counted
one action kind.

**Lesson:** A story that widens a shared rule lists every reader of its result before the build:
the callers found by grep, and every scenario that counts what the rule decides. Each one goes
into `files:` or is amended in the same diff.

**Refs:** ../../STATE.md Feedback (for retro), "204/01 amends 204/00's E9", "the doctor stopped seeing an edit", "declared write set incomplete"; ../../ARCHITECTURE.md ADR-002.
