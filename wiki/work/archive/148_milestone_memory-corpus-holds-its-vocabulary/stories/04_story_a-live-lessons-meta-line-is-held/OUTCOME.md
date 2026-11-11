# 04 · A live lesson's meta line is held — Outcome

## Delivered

### Validate holds a live lesson's meta line
`aof work validate` errors on a live item's lesson when its Kind, Area or Stage does not start with a vocabulary word, or its Owner is blank. The finding names the file, the `R<n>`, the field, the value and the legal values. A qualifier after the word is legal, and a lesson with no meta line fails on all four fields.

### Doctor flags an archived lesson's meta line
A doctor lane gives one `lesson-meta-archived` warning per archived retrospective that holds a non-conforming lesson, naming the count and the ids. It never gates, and no archived retrospective is rewritten. On the live tree it reports 94 files.

### The live stream conforms
Every lesson in a live retrospective passes the hold. The 29 lessons in 14 retrospectives that failed it now keep each written word as the qualifier after a vocabulary word, and 145 and 146 carry meta lines authored from their lessons' text.

### The retrospective prompt states the hold
Step 4 of `/aof:retrospective` says that validate holds Kind, Area and Stage to the listed words with a qualifier after the word, and that Owner must be present. Its lists are the vocabulary module's (FF-14802), in the asset and in the rendered `.claude`, `.opencode` and `.codex` copies.

## Gaps

### Archived lessons outside the vocabulary
- **Status:** open-by-decision
- **Discharge condition:** a SPEC decides to back-fill archived meta lines, which this milestone's SPEC rules out (origin §7).
94 archived retrospectives hold at least one lesson whose meta line does not conform. Doctor reports them, and validate does not hold them.
