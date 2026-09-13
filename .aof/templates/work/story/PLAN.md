<!-- aof-generated: bundle -->

<!--
  NO FRONTMATTER, DELIBERATELY (F-73-G, applied at the source rather than worked around): the
  bundle render prepends its own marker comment, and a frontmatter block that does not start at
  byte zero parses as EMPTY with no error at all. Nothing reads this document's frontmatter, so a
  block whose only property is that it can silently break is a trap with nothing on the other side.

  Story PLAN.md — the BUILD BRIEF, and the builder's alone. Answers ONE question: how is this story
  meant to be built, given what the architect already discovered while drawing its boundary?
  Owner: architect (authored at refine). Optional and config-gated — it exists only where a project
  has turned the gate on. Advisory in force: the task `.feature` scenarios are the contract, and a
  builder that finds this brief wrong says so and continues.

  IT CARRIES EXACTLY TWO THINGS THE STORY RECORD CANNOT, AND NO THIRD.
  The declared read and write sets already live in the story record's frontmatter, machine-readable,
  consumed by the wave planner and checked by validate. THIS DOCUMENT RESTATES NEITHER. No file
  table, no path list, no enumeration wearing prose — a sanctioned list generalised in two places
  ends up living in a third. What is left is the mechanism and the check, which is the half the
  frontmatter has no way to express.

  ONE PAGE IS THE FEATURE, NOT A STYLE RULE. More context measured WORSE on the same benchmark,
  twice: a 100-line window resolved 18.0% where the whole file resolved 12.7%, and the last five
  observations resolved 18.0% where full history resolved 15.0%. Aim at ~60 lines; the doc-budget
  lane warns past 80. An architect who cannot fit a page is describing a story that should have
  been split — treat the overflow as the sizing signal it is, not as a budget to raise.

  The marker comment sits AFTER the frontmatter block deliberately: a leading comment placed before
  it breaks frontmatter parsing, silently.
-->
# NN · <Story Title> — build plan

## Mechanism

<!-- The seam, in a few sentences: what the change hangs off, which way the data moves through it,
     and the one existing pattern it should look like. Name the shape, not the inventory — a single
     inline reference to the module the seam lives on is fine; a list of modules is the file table
     wearing prose, and the file table already has a home. -->

<the seam this story hangs off, and how the change moves through it>

<the existing pattern to follow, and why this one rather than a new shape>

## Verification step

<!-- The end-to-end check that proves the story works — the thing a builder currently infers.
     Not a restatement of the scenarios (they are the contract and they are already written): the
     ONE observation that shows the mechanism above is really wired, and what a wrong answer to it
     would look like. Prefer something runnable. -->

<the check that proves it works, end to end>

<what a failure of that check would look like, so a green run is not assumed>

## Out of scope

<!-- What a builder might reasonably think belongs here and does not — the adjacent change that is
     someone else's story, the generalisation that is deliberately deferred, the refactor that is
     tempting and off-contract. Each with the one-line reason it is excluded. -->

- <the adjacent thing this story deliberately does not do> — <why>
- <the generalisation deferred to later> — <why>

## Known traps

<!-- OPTIONAL. Only what was actually discovered while drawing this story's boundary: the gotcha
     that cost someone an hour, the ordering that matters, the invariant that is easy to break.
     Omit the section entirely rather than filling it with guesses. -->

- <the trap, and the symptom it produces when hit>
