# 189/04 · Build brief

## Mechanism

The operator runs the protocol from 03. They draw the order, then for each pack they record
baseline knowledge, run the build session (`aof:teach` or `aof:manual`, capped with
`--max-budget-usd 5`), answer the immediate held-out items with no AI, and record the time and their
perceived effort. Seven days later they answer that pack's delayed item. Every entry on the
observation sheet is a code, never an answer.

An agent then drafts `wiki/planning/PILOT-REPORT-human-led-learning.md` from the filled sheet and
`REPORT-TEMPLATE.md`, and the operator accepts or rejects it.

## Known traps

- The filled sheet is the only input. The agent drafting the report does not read the session
  transcripts. The report quotes no answer.
- 188 F-02: close every teaching run before the next session on that pack's story.
- The calendar: two delayed items mean at least a week between the first session and the report.

## Verification

Task 01's scenarios are checked against the drafted report, and task 02 is the operator's sign-off
in VERIFICATION.md.

## Out of scope

Any claim beyond n = 1, and any further recruiting, which would need a new audience and budget
decision.
