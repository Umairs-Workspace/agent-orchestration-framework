# 03 · One run, one item — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### Attribution is a join on a stored key
`aof work observe` resolves the item an agent run belongs to from the run record's `sessionId`, not
from the text of the prompt; an agent run whose prompt names another item is attributed to the item
its session's run belongs to.

### The free-text matcher does not exist
`agentMatchesMilestone` has no definition and no caller anywhere under `src/**`; no attribution path
in the codebase tests item identity against free text.

### One agent run belongs to exactly one item
Across a whole work stream no agent-run identity appears in two items' attributed sets, so the
per-item totals can be summed without billing the same hours twice.

### An unresolvable run is reported, never guessed and never dropped
A run with no resolvable session is counted into an explicit unattributed total that the report and
the `--json` document both state; it is not assigned to an item by fallback and not silently
discarded.

### Tool calls are classified by what the result says, not by the command name
`classifyToolCallResult` reads the tool result's own output for count-bearing and structural
test-report markers. The retired `TOOLCHAIN_RE` command-name pattern — which matched `npm test`,
`vitest` and `jest`, none of which this repo is permitted to run — no longer decides anything, and
this repo's real isolated `AOF_GLOBAL_HOME=… node --test …` invocations classify as test runs.

## Assumptions

- **A session belongs to exactly one run record** — the join is last-write-wins over directory
  order, so two run records claiming one `sessionId` resolve to an arbitrary winner rather than a
  diagnosed collision. Double-counting cannot result (the loser contributes nothing).
- **Absence of an agent transcript is not the same as an unattributed run** — collection walks
  session directories, so a run record whose session produced no transcript yields neither an agent
  row nor an unattributed count.
- **The classifier is a heuristic with a one-sided error by design** — a test run whose output
  carries no test markers (a silent `exit 0`) reads as `other`. ADR-006 prefers that honest
  under-count to the retired pattern's confident zero.

## Gaps

### An attributed agent table for items whose runs predate 68/01's producer
- **Status:** open
- **Discharge condition:** run records minted by 68/01's producer accumulate for an item, or a
  stated backfill decision writes `sessionId` onto the historical records.
Every run record in this work stream carries `"sessionId": null`, so on this repo's own corpus the
join attributes nothing: `aof work observe 68` reports 0 agent runs across 0 sessions and 283
unattributed agent runs. The emptiness is correct and counted rather than guessed, but for every
item whose runs predate 68/01 the agent table is now EMPTY where the pre-68 miner reported a
populated — if double-counting — one.

### A result-content classifier that never fires on a command that ran no tests
- **Status:** open
- **Discharge condition:** the `(?:Test Files|Tests?|Test Suites):?\s*\d+` alternative requires its
  colon, and `\bAssertionError\b` is qualified so that a document merely quoting one does not match.
The marker set is count-bearing and structural, so the systemic over-match is gone — on this repo's
real corpus 16 of 1,452 pure read-only inspection calls (1.1%) still classify as test runs. Two
markers reach words a command MENTIONS rather than EMITS: `Tests?:?\s*\d+`'s optional colon matches
bare "test 2" in prose, and `AssertionError` matches any document quoting a stack trace — including
this milestone's own `VERIFICATION.md`.
