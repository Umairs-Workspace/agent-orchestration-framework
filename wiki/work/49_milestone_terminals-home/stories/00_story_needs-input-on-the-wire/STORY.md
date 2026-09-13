---
type: story
number: 00
slug: needs-input-on-the-wire
title: "`needs-input` reaches the wire — the fact the worker already produces stops being dropped one hop before anyone can read it"
parent: 49
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-08-13
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH.
-->
# 00 · `needs-input` reaches the wire

## User story

As the operator watching a fleet of agents,
I want to see **which agent is waiting for me** without opening its terminal and reading its output,
so that the one session that needs a human is the one I go to, instead of the one I happened to click.

The remarkable part of this story is how little of it is new. The fact is **already produced, in
production, today**: `src/mesh-worker-execution.mjs` detects a `needs-input` outcome — an explicit
sentinel in the session's own PTY output, or an unanswered `tool_use` naming a human-input tool — and
reports it live as `sendAssignmentStatus(assignmentId, "running", { code: "needs-input" })` while the
assignment legitimately stays `running`. It rides the **shared** row mapper in
`src/assignment-record.mjs`, which every reader already uses.

Then `projectAssignment` ([global-mesh-query.mjs:132-148](../../../../../src/global-mesh-query.mjs#L132))
copies eight fields onto the wire and `code` is not one of them. So a fact the system knows has never
once reached **the fleet's** browser.

<!-- CORRECTED at build, 2026-08-13 (QA F-49-00-e, confirmed at source). This sentence originally read
"…has never once reached a browser: `grep -rn "needs-input" ui/src` returns nothing." That grep does NOT
return nothing. The BOARD already keys on the exact word and already renders a treatment for it:
`ui/src/board/action.mjs:39` (`item.execution.code === "needs-input"`), `ui/src/board/DetailPanel.tsx:235`
("WAITING ON A HUMAN", amber, ahead of the other affordances), declared at `ui/src/board/api.ts:30`. The
board reaches it by a different route — `src/board-mesh-execution.mjs` — which is why the FLEET wire was
still missing it and why this story's diff is unchanged and still correct.
TWO CONSEQUENCES, both routed rather than absorbed:
(a) the PO ruling below — "shipping a chip here would put a second author on a vocabulary DESIGN
    deliberately gave one home" — has a false premise. There is ALREADY an author. Story 05 must
    RECONCILE with the board's treatment rather than assume a blank field; see STATE §Feedback.
(b) the board declares the same column `code?: string | null` (`ui/src/board/api.ts:32`, fed by an
    unconditional `code: row.code ?? null`), while this story declares the fleet's `code?: string`
    ("absent, not false"). One word, two absence idioms, on the two surfaces the terminals home exists
    to join — QA F-49-00-d, routed to the architect.
Fourth stale-premise inheritance in this arc, and the first found by running the check the document
itself printed. -->


This story is that one hop. It ships value **before the terminals home exists** — the existing fleet
card can say it the moment it lands.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. -->

- [x] `tasks/00_the-projection-carries-the-code.feature`

## Notes

**Order.** Depends on nothing. Nothing in this milestone depends on it either — story 05 renders it if
it is there and renders nothing if it is not (see the ruling below). **First, parallel-eligible.**

**Governing ADR: [ADR-004](../../ARCHITECTURE.md).** Two clauses bind:

1. **Assignment-scoped, and the scope is stated rather than papered over.** A *free* session — one with
   no assignment — has no record to carry a `code` at all, so it has no agent-state signal, invented or
   otherwise. ADR-004 rules free-session agent state **out of milestone 49**. Do not compensate by
   deriving one.
2. **Never from bytes.** Inferring agent state by parsing terminal output in the browser is the exact
   shape the mirror lane's content-blind design exists to forbid
   ([source-table.mjs:126-137](../../../../../ui/src/terminal/source-table.mjs#L126)), and
   `acd-fleet-terminal-input-constrained` fails CI on a content-branch in that lane. This story adds a
   **field**, not a sniffer.

**"Absent, not false" is the idiom, and this file already speaks it.** `WorkAssignment`
([api.ts:116-126](../../../../../ui/src/fleet/api.ts#L116)) makes `sessionId` optional for exactly this
reason: an assignment whose worker has not captured one **omits the key**. `code` follows that rule —
absent when there is no refinement, never `null`, never `""`, and never a fabricated `"running"`.

**This is a three-line change *because* of where it lands, and that is worth protecting.** It touches
`src/global-mesh-query.mjs` (← 13 dependents) and one line of `ui/src/fleet/api.ts`. It must **not**
touch `src/assignment-record.mjs` — measured at **← 38 dependents**, a god-node — because the mapper
already carries the field. A story that "tidies the mapper while it is in there" converts a three-line
diff into a migration across 38 dependents.

**PO ruling — what the existing fleet card does with it, in this story.** Nothing visual. This story
puts the field on the wire and proves it arrives; the *rendering* of `needs input` is
[DESIGN §Agent state is a SECOND AXIS](../../DESIGN.md) and belongs to story 05, where the mark's form,
position and precedence are specified against the connection ramp it must not compete with. Landing a
chip here would put a second author on a vocabulary DESIGN deliberately gave one home.

**PO ruling — `code` is a MULTI-VALUED COLUMN, not a `needs-input` boolean, and the projection copies it
VERBATIM (QA F-49-00-a).** This story's title and ADR-004 both say "`code`/`needs-input`", which reads as
though one implies the other. It does not: production also writes `"resumed"` and a family of settled
codes (`workspace-load-failed`, `assignment-repo-unavailable`, `worker-worktree-base`, …) through the
same column. **The projection must not filter** — a whitelist here would make `projectAssignment` a
second authority over a vocabulary the worker owns, which is the exact shape milestone 48 spent itself
removing. So **`code: "resumed"` will reach the browser**, and that is correct.

The consequence lands on story 05 and is recorded there too: **the `needs input` mark keys on the exact
word, never on truthiness.** A `code != null` test renders "needs input" for a resumed session — a
false claim that a human is being waited on, which is precisely the failure the mark exists to prevent.

**PO ruling — the field is rendered from a FIXTURE in 05, and its absence in a live render is not a
finding.** The producer needs a worker genuinely blocked on a human at the moment of observation. That
is not reproducible on demand at review time, so story 05's evidence for the mark is fixture-driven and
a reviewer must not log "I never saw it on the running system" as a gap.
