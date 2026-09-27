# 83 · The agent layer's four bounds — Outcome

## Delivered

### A reporting bar on every reviewer lens
Each of the five reviewer agents (`aof-architect`, `aof-qa`, `aof-designer`, `aof-security`,
`aof-compliance`) ships a reporting bar in its own prompt — a >80% confidence floor, a four-gate
evidence checklist, Blocker/Important/Nit severities, an explicit do-not-flag list, and the statement
that a clean review is a valid review.

### A declared context contract on the story record
A story record carries `reads:` and `files:` frontmatter lists, the authoring prompts populate them, and
`aof work validate` reports a malformed declaration, a missing read path, a drifting anchor, a
backslash-spelled path, a section anchor in `files:`, an entry escaping the project root, and a
both-present-and-empty pair as an unauthored scaffold. An absent declaration stays valid; an unwritten
`files:` entry stays valid.

### A build wave partitioned by declared writes, in code
`aof work next --json` returns `wave` and `heldSet` beside `readySet`, computed by
`partitionReadySetByDeclaredFiles` as a greedy stable walk with case-folded collision keys. An unknown
or unrefined write set overlaps everything — it runs alone if first and is held otherwise — and the
orchestrating prompt is told to obey the result rather than perform the set arithmetic itself.

### A review loop bounded by the runtime, not by prose
`MAX_REVIEW_ROUNDS = 3` lives in `src/loop-bounds.mjs`, `resolveReviewRounds` clamps
`work.loop.reviewRounds` to it, `src/commands/loop.mjs` owns the persisted counters, and
`src/work-loop.mjs` decides admission, deduplicates structured Blockers across resume, stops on a
non-decreasing Blocker count, and refuses a fourth round. A bounded stop is reported as its own outcome
and never as an accept.

## Assumptions

- **A reviewer's judgment is still the reviewer's** — the reporting bar is distributed as prompt text,
  so its effect on what is reported is an instruction followed, not a rule enforced.
- **A story declares its own write set honestly** — the partition is only as sound as the `files:` list
  refine authors; an undeclared set is treated as overlapping everything, which is safe but serial.
- **Only story-typed members can be partitioned** — a milestone, spike, chore or uat has no field in
  which to declare a write set, so a mixed ready set collapses to one member per wave.

## Gaps

### Longitudinal effect of the reporting bar and the round cap
- **Status:** open
- **Discharge condition:** a before/after comparison across two milestones of findings-per-verification-row, Blocker share, rounds-per-story, and defects escaping to `aof:verify`.
Three `@manual` scenarios (tasks 00, 02 and 03) compare a population before the bounds against one
after them. The after-population is one story deep, so the bounds are proven installed and unproven
effective.

### Story-level fan-out across the existing stream
- **Status:** open
- **Discharge condition:** every story record that will run in a shared wave carries an authored `files:` list.
Exactly one of the stream's 234 story records declares `files:` — story 83 itself. Every other story has
an unknown write set and therefore overlaps everything, so story-level fan-out is serial across the
existing stream until each story is re-refined.

### A write set for non-story ready-set members
- **Status:** open
- **Discharge condition:** non-story members are exempted from the partition, or reported as unpartitionable rather than held.
`heldSet` reports milestones, spikes and chores as held for a write overlap that was never computed:
measured `readySet: 9 → wave: 1, heldSet: 8`, all eight of them non-story types.

### One frontmatter grammar
- **Status:** open
- **Discharge condition:** `src/story-contract.mjs` and `parseFrontmatter` read one grammar from one home.
`src/story-contract.mjs` carries a second frontmatter reader beside the shared one, and it is now
load-bearing rather than validation-only, because `src/ready-wave.mjs` consumes it at runtime.
