# 01 · Read verbs preserve their JSON and terminal output — Outcome

## Delivered

### The read verbs are held to baselines in both output formats

The `work-stream-read` lane runs 38 cases as 76 scenarios, one per format, over `list`, `find`, `doc`, `next`, `validate` and `doctor`. Each scenario holds the exact stdout, stderr and exit, and an unchanged stream before and after.

### Readiness is held for each way an item can wait

`next` is held for the ready wave, a story blocked on its sibling, a uat blocked on a spike, a ready chore and the delivered and prototype exclusions.

### Every stream-reading doctor lane has a witness

Fourteen fixture variations each make one doctor lane report, including an orphan folder, a lying parent, a numbering gap, an over-budget doc, an unresolved control, an unjoined scenario, a malformed loop record and an open example question. `validate` is held on a valid stream, missing dates and a duplicate number.
