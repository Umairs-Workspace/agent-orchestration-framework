---
type: chore
number: 109
slug: tech-debt-item-49-still-records-the-nextwork-fail-open-as-open-though-story-86-closed-it
title: "Tech Debt Item 49 Still Records The Nextwork Fail Open As Open Though Story 86 Closed It"
status: done
owner: <role>
created: 2026-09-04
updated: 2026-09-05
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 109 · Tech Debt Item 49 Still Records The Nextwork Fail Open As Open Though Story 86 Closed It

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

TECH_DEBT item 49 was raised as *"three independently-written scope parsers, and the one the loop
depends on fails OPEN"* — and the fail-open half is PAID. Story 86 made `nextWork`'s `inRange` refuse
a story-grained shape it cannot parse and scope `NN/SS` to that one story, and story 80 had already
moved the rule into the zero-import leaf `src/work-ref-scope.mjs`. The entry still described the
defect as live, cited line numbers that have all moved, and carried a **medium** severity resting on
a fail-open that is gone — so an operator scheduling from the ledger would price work that is half
done. Housekeeping now because the ledger is a decision surface: an entry that overstates what is
broken costs the same as one that understates it.

## Definition of Done

- [x] Rewrite item 49's Status and What's wrong to record that the fail-open half is PAID by story 86 (inRange now refuses a story-grained shape it cannot parse, and NN/SS scopes to that story), leaving the item open only for the remaining half — the three independently-written parsers consolidated into one home. Name story 86 as the payer, keep the FF-5301 reach-ceiling reason story 86 recorded for why the consolidation was not taken, and re-point the cited line numbers, which have moved.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "TECH_DEBT item 49 still records the nextWork fail-open as open, though story 86 closed it" (`wiki/work/TECH_DEBT.md:2638`)
- **Raised reviewing:** `86`, review round 1
- **Promotion key:** `finding:86:tech_debt item 49 still records the nextwork fail-open as open, though story 86 closed it`

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->
