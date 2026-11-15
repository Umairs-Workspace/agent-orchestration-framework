---
doc: research
---
<!--
  Milestone RESEARCH.md — answers ONE question: what did we learn that constrains the choices?
  Owner: researcher. Conditional (only if there was a real unknown to resolve). Shared by the
  milestone's stories.
  Does NOT contain: the decision the findings led to (→ ARCHITECTURE.md). Report facts; the
  architect decides what to do about them.
-->
# NN · <Milestone Title> — Research

**Gathered:** <date>
**Method:** <sources — docs, installed SDK types, prior art, measurements>
**Status:** <Desk research complete | Items pending live confirmation>

## <Finding area 1>

- **Finding:** <what is true>
- **Constraint:** <what this forces or forbids in the design>
- **Source:** <link / file:line>

## Findings for discovery questions

<!--
  At refine's discovery beat, each `domain` question a story's example map asks gets one finding
  here, numbered across the whole document, and the map cites it as `researched F<n>`. A finding
  names its source: a URL, or a named document and its section, for a fact about the world;
  `path:line` for a fact in this repository. What the model recalls is not a source. A question no
  source settles is reported as not settled, with what was consulted, and the map asks it as a
  `policy` question. The form, for a question of story 7/2's map:

## F1 · Is a loan returned on its due date overdue?
- **Finding:** No. A loan is overdue from the day after its due date.
- **Source:** Library lending policy, section 4.2 "Due dates"
-->

## Assumptions to confirm

<!-- Separate CI-testable assumptions from live-only / developer-run ones. The live-only ones
     become @manual scenarios with UAT procedures. -->

- **A1 — <assumption>.** <how to confirm>. Testable in CI: <yes/no>.
