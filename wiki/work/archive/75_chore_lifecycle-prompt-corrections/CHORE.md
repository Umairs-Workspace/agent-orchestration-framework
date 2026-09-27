---
type: chore
number: 75
slug: lifecycle-prompt-corrections
title: "Lifecycle prompt corrections — move the milestone once, and draw the whole lifecycle"
status: done
owner: product-owner
created: 2026-08-16
updated: 2026-08-20
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 75 · Lifecycle prompt corrections — move the milestone once, and draw the whole lifecycle

## Intent

Two corrections to `continue.md`'s new lifecycle wiring, both in the prompt layer, both one change
set. Neither is a defect in `aof work status` itself — the verb and its lifecycle table are right.

**1 · The milestone's status move is told to happen in every lane.** `continue.md`'s
`<progress_tracking>` says *"**Milestone** — `aof work status <NN> in-progress` while any story is
active"*, and step 2 tells the lane to run the verb *"inside the lane's worktree … that is the tree
its commits travel in."* Read together, N concurrent lanes each write the same two adjacent
frontmatter lines (`status:` and `updated:`) in their own worktree copy of the **shared** milestone
`SPEC.md`, on N branches that all merge back.

`work:status` is deliberately **not item-locked** — `src/commands/item-status.mjs:28-30` argues, correctly,
that an assignment holds an item's *execution* scope while a status write is record-keeping on your
own checkout. That reasoning holds for `STORY.md`, which has exactly one lane writing it. It does not
hold for the milestone's `SPEC.md`, which has all of them.

This is a known shape here, not a hypothetical: milestone 66's retrospective records 66/00 and 66/01
landing edits in the **same hunk** of `src/import/recovery.mjs`, invisible only because the milestone
actually ran serial (1.02×). A two-line frontmatter hunk is a smaller target with a higher collision
rate, and milestone 71 is about to make the review lanes genuinely concurrent.

The fix is ordering, not machinery: the **orchestrator** moves the milestone once, in the main
checkout, **before** fan-out. Each lane moves only its own story.

**2 · The lifecycle arrow is incomplete, and the file contradicts itself.**
`continue.md`'s `<progress_tracking>` draws the lifecycle as
`not-started → in-progress → in-review → done`. `ITEM_STATUS_EDGES`
(`src/acceptance-horizon.mjs:66-72`) also declares **`in-progress → done`**, and the table's own
comment explains why: *"the path a MILESTONE, `uat` session, `spike` and `chore` actually take …
none of them is ever authored `in-review`. Requiring that hop would have refused acceptance for
every driver type except a story."*

So the same file that tells you to put a milestone `in-progress` draws a lifecycle in which a
milestone cannot then be accepted. `verify.md` states the rule correctly — *"`done` is reachable from
`in-progress` or `in-review` and from NEITHER `not-started` NOR `blocked`"* — so the two files
disagree, and the wrong one is the one an agent reads first.

## Definition of Done

- [x] `src/bundle/commands/continue.md` moves the **milestone** status once, in the orchestrator's
      own checkout, **before** the ready-set fan-out — and says so where the walk is described, not
      only in `<progress_tracking>`
- [x] The per-lane instruction is scoped to the lane's **own story**, with the shared-document
      hazard named in one line so it is not re-broadened later
- [x] `continue.md`'s lifecycle diagram includes `in-progress → done` and matches
      `ITEM_STATUS_EDGES` — or cites `verify.md`'s wording rather than drawing a second copy
- [x] The most likely already-started case is named alongside "a resumed run, a re-entered lane":
      the **phase door** (`STARTING_PHASES`, `src/commands/continue.mjs:148`) and the **`run.started`
      reactor** (`src/effects/table.mjs:73`) both start the item before any prompt runs, and
      `aof:refine <story-ref>` starts a story it refines
- [x] `grep -n "not-started → in-progress"` across `src/bundle/**` finds no diagram that omits
      `in-progress → done`
- [x] `src/bundle/manifest.json` regenerated; `acd-bundle-manifest-hashes` and
      `acd-bundle-membership` green
- [x] `.claude/` and `.codex/` renders refreshed (`aof work update`) so this repo runs what it ships
- [x] `aof work validate 75` is green

## Notes

**Why a chore.** No new behaviour and no control ships — this is where a rule lives and how a
lifecycle is drawn. Milestone 66's ADR-003 rule applies: the deliverable is neither a control nor a
behaviour, so it is not a story.

**What this is NOT.** It is not a change to `work:status`, to `ITEM_STATUS_EDGES`, or to the
not-item-locked decision — all three are right as built. The verb's ergonomics on a refused move are
story **74**, and they are independent of this.

**Sequencing.** Correction 1 becomes load-bearing exactly when milestone **71** makes the review
lanes concurrent, and 71 will also rewrite this region of `continue.md`. Landing 74 first means 71
edits a file that is already correct; landing it after means 71 has to carry the fix. Either works —
do not let them land in parallel on the same file.

**Prompted by** a review of **story 73** (`item-status-lifecycle`, accepted 2026-08-16), which wired
`aof work status` into the phase prompts. That story is sound — the verb, the lifecycle table and the
not-item-locked decision are all right as built. These are two corrections to how its prompts read.

## Accept decision

**ACCEPTED 2026-08-20** on the chore criterion (ADR-003): ticked checklist + green validate. No
scenario suite was run and none exists — a chore carries no behavioural contract.

- **Checklist** — all 8 `## Definition of Done` boxes ticked, none left `- [ ]`. Each claim confirmed
  at the source rather than taken on the tick: `src/bundle/commands/continue.md` now carries the
  *"Move the MILESTONE once — here, in THIS checkout, before the fan-out"* paragraph in the
  **milestone walk** (ahead of the `aof work next --json` ready-set dispatch), not only in
  `<progress_tracking>`; the story step 2 is scoped to *"this member's own story — never the
  milestone"* and names the shared-frontmatter-hunk hazard in one line; `<progress_tracking>` no
  longer redraws the lifecycle but defers to `ITEM_STATUS_EDGES` (`src/acceptance-horizon.mjs`) and
  states `in-progress → done` is *"equally legal"* and is the driver-type path; the phase door
  (`STARTING_PHASES`, `src/commands/continue.mjs`), the `run.started` reactor
  (`src/effects/table.mjs`) and `aof:refine` on a story are all named as the common already-started
  case, in both step 2 and `<progress_tracking>`.
- **The grep box, checked as written** — `grep -rn "not-started -> in-progress" src/bundle/` returns
  exactly one hit, `src/bundle/commands/continue.md:168`, and that line carries
  `in-progress → done` in the same sentence. No diagram in the bundle omits the edge.
- **Validate** — `aof work validate 75` → `PASS — 75 is well-formed.`
- **Manifest gates** — `acd-bundle-manifest-hashes` + `acd-bundle-membership` run by test-array
  import under `AOF_GLOBAL_HOME` isolation (never the node test runner directly, which false-passes
  these files): **6 pass, 0 fail**.
- **Renders** — `aof work update --dry-run` reports *"Would keep"* for every member and no rewrite,
  so `.claude/`, `.codex/` and `.opencode/` are at the shipped bundle. All three renders of
  `continue.md` carry both new passages.
- **Doctor** — `aof work doctor 75` reports no finding against this chore at either severity; the
  single `numbering-gap` warn is stream-wide and pre-existing. A chore declares no controls, so
  there is no `control-unresolved` class to clear.

**Not a gate, but noted:** the change set is still **uncommitted** in the working tree
(`src/bundle/commands/continue.md`, the three renders, `src/bundle/manifest.json`, `.aof/aof.lock.json`).
The chore is accepted on the content, which is verified in place; committing it is the branch's job.
