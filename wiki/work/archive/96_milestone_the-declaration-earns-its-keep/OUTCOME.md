# 96 · The declaration earns its keep — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

<!-- Authored at the milestone level, never concatenated from the stories': `aof work memory ingest`
     unions every item's records into one recall surface, so a milestone restating its stories'
     capabilities writes one fact twice. What is stated here is true of the STREAM, not of any single
     story; where a story states a capability whole it is cited rather than repeated. -->

### A milestone cannot be accepted on story-scoped greens
`aof work status <NN> done` refuses a milestone with no green whole-tree row beside its records, in
the command layer, with `--gate-override "<reason>"` the only way past and the reason written into
`REGRESSION.md` as its own row. The refusal is scoped to `type: milestone`; a story's `done` is
untouched. Stated whole by 96/04.

### The gate's verdict is a document, and its reds are history
Every gate run appends to the accepting item's own `REGRESSION.md` — never under `runs/` or
`observability/` — carrying the commit, the instant, the scope and what failed. A rerun appends, so
the newest row is what the door reads and the earlier rows stay readable. 96's own record carries
five reds before its green.

### The read/write declaration is proposed from the graph, not recalled
`src/story-contract-derive.mjs` proposes `reads:`/`files:` from the codebase graph's imports and call
sites plus the contract's own citations, every entry carrying a reason from a closed exported set. It
reaches the graph only through `normalizeGraph`/`computeImpact`, holds no write path to any
`STORY.md`, and answers an absent or unreadable graph with a citation-only proposal that says so.

### A story's test run is selected from its declared write set
`aof test --scope impacted --story <ref>` derives the changed set from `files:` through the existing
`selectSuites`, adding a second changed-set source beside the git one rather than a second selector. A
declared path the graph has not seen WIDENS the run under an existing reason and is never dropped.

### The phase commands mint a run record that `observe` can join on
`aof work run-start` writes a record under the item's own `runs/` carrying `itemRef` and the session
id when one resolves, and `null` when it does not — ambiguity is absence, never a guess. The
transcript→item join stays the `sessionId` join and gains no second path.

### The declaration is checked against what a bundle change actually lands
A story declaring a `src/bundle/` member must also declare `src/bundle/manifest.json` and every
git-tracked render of that member. 96's five stories were short by 23 such entries and now declare
them.

## Assumptions

- **The graph artifact is current** — the derivation's headline saving arrives only when something
  has rebuilt the codebase graph. Nothing in the build or review lane does, so a story creating files
  widens on every path the graph has not seen. Correct-but-slow, and every widening is named.
- **The gate's node can complete a whole-tree run** — it needs `:4182` free (the live control daemon
  holds it) and a `work.test.deadlineMs` longer than the suite, which includes the `app/desktop`
  cargo build. Measured at 30m48s on the control node.
- **`PLAN.md` stays advisory** — it ships behind `work.plan.enabled`, off by default, read by the
  developer's brief alone. A deviation from it is not a finding.

## Gaps

### The milestone cannot measure its own thesis
**Status:** open
**Discharge condition:** a `/aof:continue` phase runs against the installed bundle and
`aof work observe` reports a non-zero `runs.count` for the item it built.

`aof work observe 96` reports `Run records: 0` and 418 unattributed runs. The mechanism is delivered
and confirmed live through the shipped command, but the installed bundle had not been refreshed since
`2026-08-06`, so 96's own five stories were built by phases running prompts that predated story 00.
No phase can mint a record for a run that has finished, so the before/after this milestone argues for
is not recoverable for 96 itself.

### A killed gate run is recorded as a completed one
**Status:** open
**Discharge condition:** a gate row carries the run's completion state, and a run that did not
complete is recorded as incomplete rather than as a red.

Five of 96's six gate runs were killed by a `work.test.deadlineMs` shorter than the suite, and each
was written as an ordinary `red` with a partial failure list. Measured: at one commit a direct run
enumerated five failures where the gate's row recorded two. The deadline is fixed; the row shape that
hides the difference is not. FF-9606 asserts that a NARROWED or WIDENED run does not satisfy the
door, and says nothing about an INCOMPLETE one. The door itself is not at risk — `green` requires
`exit === 0` and an empty failure list, so a killed run cannot read green — so what degrades is the
evidence rather than the gate.

### The gate is all-or-nothing across the whole tree
**Status:** open
**Discharge condition:** a decision on whether a milestone's gate may stand while a red belongs to a
ledgered item that the milestone does not touch.

A whole-tree run goes red on any control in the repository, including ones no lane of the accepting
milestone touches. 96 met five such reds — two stale controls and two already ledgered as chores 114
and 116 — and cleared all five rather than overriding, which is the right answer once and an
unbounded obligation if it becomes the rule.

### `LOOP_SCOPE_FORMS` was not widened
**Status:** open
**Discharge condition:** a decision on which scope forms `aof work loop` admits, with the two green
assertions that currently pin the vocabulary to `driver` and `range` updated in the same beat.

Milestone 53's retired necessity leg named two follow-ons. The leg is retired; the widening is not
done, because it changes which scopes the loop command accepts, contradicts two green assertions in
the same control, and was not required to clear the red.
