---
doc: examples
---
# 193/01 · The gate accepts a cited finding, and nothing less — example map
<!--
Drafted at refine's discovery beat, 2026-11-12. Struck because the record answers them: that a
cited finding closes a domain question and is not a default (SPEC Scope, second bullet); that a
policy question is asked and never defaulted (same bullet, and 134's rule for `business`); that an
expert is asked directly (SPEC Scope, third bullet). Relabelled technical: the new code's severity,
which document a standalone story cites, and the door's refusal code.
-->

## R1 · A fact is closed by a cited finding or by the operator's own answer
- E1 · Story 193/01's map holds `Q1 · domain · researched F2`, and the milestone's RESEARCH.md holds `## F2 ·` with a Source line: the doctor reports nothing for Q1 [proposed]
- E2 · The same question in state `open`: `example-question-open`, saying a fact is still waiting on research [proposed]
- E3 · The same question in state `answered`, with an answer record for the token `193/01 Q1`: the doctor reports nothing for Q1 [proposed]

## R2 · A decision is closed only by a person's answer
- E4 · `Q2 · policy · researched F2`, with F2 sourced: `example-question-open`, saying a person must answer it [proposed]
- E5 · `Q3 · business · open` in a map written before this milestone: the finding it produced before, word for word [proposed]

## R3 · A cited finding must exist and name its source
- E6 · An example labelled researched F3 while RESEARCH.md has no `## F3 ·` heading: `example-research-unanchored`, naming the example and F3 [proposed]
- E7 · The heading `## F3 ·` exists with no Source line: `example-research-unanchored`, saying F3 names no source [proposed]
- E8 · The milestone has no RESEARCH.md at all: `example-research-unanchored` for every line that cites a finding [proposed]

## R4 · A story is not built on a fact nobody cited
- E9 · `aof work continue 193/01` while its map holds the example of E6: refused `examples-question-open` (409), with the `example-research-unanchored` finding attached [proposed]
- E10 · A researched example under R2 that no scenario carries, in a contract formulated from the map: `example-untraced`, as for a confirmed one [proposed]
- E11 · The same story with `work.examples.enabled` off: no finding, RESEARCH.md is not read, and `continue` is not refused [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-002 · How severe is a citation that leads nowhere? (An error while the story is open and a warning once it is done, like the lane's other error codes.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-001 · Which document does a story with no milestone cite? (A RESEARCH.md in its own folder.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-002 · Does the door refuse with a new code? (No: `examples-question-open`, with the findings attached, as today.)
