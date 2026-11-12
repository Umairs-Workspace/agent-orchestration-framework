# 193/01 · The gate accepts a cited finding, and nothing less — build plan

## Mechanism

One judgement, `examplesFindings`, already serves the lane and the door. It gains one input, the
research document's text (or none), and two changes. The open-question loop asks 00's query, which
now answers by who owns the question, and words the message by class; a `business` question keeps
its exact message. A new loop walks 00's research claims, resolves each id through `readFindings`
over the text it was handed, and reports `example-research-unanchored` for a miss, a duplicate or
a finding with no source. Both use the `severityFor(status)` the other error codes use.

The text reaches the judgement the way the map's does. The story probe already holds the engine's
`fileState`; it reads one more file and puts the text on `extensions.examples` beside `text` and
`answers`. The door already reads the map with `readFile`; it reads one more. Which file is one
function: the milestone's folder for a story under one (the same two-`dirname` step `answers.mjs`
takes to find the parent), the story's own folder otherwise. Export it from the probe's module and
have the door import it, so the file name is used from the one place 00 exports it.

Nothing in `@aof/work` or in core's bindings changes: the probe's and the door's signatures hold.

## Verification step

Build a scratch project with the gate on: one milestone, one story whose map holds a `domain`
question in state `researched F1` and an example labelled researched F1, and a milestone
`RESEARCH.md` with `## F1 ·` and a Source line. `aof work doctor <story> --json` must be clean and
`aof work continue <story>` must pass the door. Delete the Source line: both must name F1. Then
turn the gate off and repeat: silence, and no refusal.

A wrong build shows as the doctor clean while the door refuses (two readers of the document), or
as a finding on a delivered `business` map whose message changed.

## Out of scope

- The `operator-profile-undeclared` warning — 03, in its own lane module, so the two stories share
  no file.
- Checking that a finding's source says what the finding says — not checkable by code (ADR-001 §9).
- Any lint on question quality, such as a domain question answered without research below
  `expert` — deferred by the SPEC.

## Known traps

- `test/examples/doctor-examples-lane.test.mjs` builds its snapshots by hand in places. A row
  without the new field must judge exactly as today, so treat an absent research text as "no
  document", not as an error.
- The probe runs once per story row. A milestone with ten stories reads its `RESEARCH.md` ten
  times through `fileState`. That is ten small reads; do not add a cache for it.
- 134/FF-13403's fixture story has a map with an unanchored claim. Add the citation to a second
  fixture rather than changing that one, or its existing cases stop proving what they prove.
