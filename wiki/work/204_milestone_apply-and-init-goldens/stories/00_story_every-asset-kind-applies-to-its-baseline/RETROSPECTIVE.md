---
doc: retrospective
promotionFrom: 1
---
# 204/00 · Every asset kind applies to its committed baseline — retrospective

## R1 · A refusal scenario was written for an output the story's own fix made unreachable

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer (build) · **Promoted to:** none

**What happened:** Task 02's last scenario reads "Given a TOML merge whose result would place an
owned top-level entry after a table header … When the merge plans it". After the fix (ADR-003 §1
and §2) no input to `mergeToml` produces that text, so the scenario cannot be reached through the
merge. The case drives the merge's own guard, `indexMergedToml`, over a misplaced text instead.
`indexMergedToml` was exported for it, and is a sibling of the change ADR-003 §4 confined to
`mergeToml`.

**Why:** The scenario was written as a second line of defence against the defect, and its subject
was the merge, which the same story makes correct.

**Lesson:** When a story fixes a defect and also keeps a guard against it, the guard's scenario
names the guard as its subject and says how it is reached. Through the fixed path it never is.

**Refs:** ../../STATE.md Feedback (for retro), "204/00 · the merge's refusal case"; ../../ARCHITECTURE.md ADR-003 §4.
