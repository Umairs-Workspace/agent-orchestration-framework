---
doc: retrospective
---
# 71 · Loop discipline — Retrospective

Distilled 2026-09-03 at the close, from `STATE.md`'s six `## Feedback (for retro)` notes, the
`VERIFICATION.md` findings register (F-71-A … F-71-L), chore 89's execution at the gate, and the
`observability/` snapshot. Lessons only — a clean catch with no process lesson stays in VERIFICATION
and is not repeated here.

## R1 — A milestone that prescribes measurement produced none of its own

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner

**What happened.** Four of 71/02's `@manual` scenarios are phrased against "the run record" — *lanes
overlap in time*, *a wave of one pays no fan-out*, *round two costs one lens*, *refine spends no run
re-applying a delta*. At the gate `aof work observe 71` reported **0 agent runs across 0 sessions,
408 unattributed**, and 72 reported the same. The milestone whose SPEC quantifies the defect as
**1h03m of pure serialisation** shipped with its own saving unmeasured.
**Why.** The milestone was driven interactively rather than through the loop door, and nothing at
refine noticed that the acceptance criteria had a precondition the execution style would not meet.
An `@manual` scenario whose subject is a run record is undischargeable by construction from a session
that produces none.
**Lesson.** When a criterion reads its answer off an artefact the framework emits, the beat that
authors it must name **which run will emit that artefact**. If the answer is "none planned", the
criterion is a gap on delivery day, and saying so at refine costs one sentence instead of a finding.
**Refs:** `VERIFICATION.md` F-71-B, F-71-G; `observability/snapshots/`; 71/02 `OUTCOME.md` `## Gaps`.

## R2 — A register declared a control the partition gave no owner, and both were written in one document

**Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect

**What happened.** `ARCHITECTURE.md` declared six fitness functions and, in the same document,
`ADR-008` cut the milestone into four stories. Five controls landed with a story; **FF-7106 was
assigned to none**, so `aof work doctor 71` reported `control-unresolved` from refine to gate and the
milestone could not be accepted as partitioned. It took a chore (89) executed at the gate to clear it.
**Why.** The register and the story map were authored in the same pass and never reconciled against
each other. Nothing checks that every declared control appears in some story's `files:` — the doctor
check fires on the missing FILE, months later, not on the missing OWNER, immediately.
**Lesson.** Reconcile the two lists in the beat that writes them: every `FF-NN` row names the story
that lands it, and a control no story claims is either assigned or not declared. A `pending` marker
records that a control is unlanded; it never records who will land it.
**Refs:** `VERIFICATION.md` F-71-A; `ARCHITECTURE.md#Fitness functions`; chore 89.

## R3 — A measurement taken by a throwaway script became a claim in a shipped artifact

**Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** whoever lands a control

**What happened.** While writing FF-7106's control, a scratch measurement reported **33 violations
across four `done` stories**. The cause was diagnosed as CRLF — the `\r` surviving the status read —
and that diagnosis was written into the control's header comment as established fact, complete with a
CR-stripping line and a self-check leg justified by it. Checked afterwards, **CRLF does not break the
read at all**: JS treats `\r` as a line terminator, so `.` and `$` already exclude it. The real cause
was a backslash collapse inside the scratch script itself, which turned `\s` into `s` and left a
leading space in the capture. A false narrative was one commit from shipping inside a control that
will be read as authoritative for years.
**Why.** The measurement was real and the number was real, so the *explanation* inherited their
credibility without being tested. A probe script written in a hurry is exactly the artefact least
likely to be re-read.
**Lesson.** A number from a throwaway script may be reported; its **cause** may not, until the cause
itself has been reproduced against the real code. The correction cost was one minute
(`node -e` on the actual file) and it changed the control's comment, its implementation and one leg's
justification. Where the phenomenon survives correction — the horizon really does widen if the read
keeps the `\r` — pin the **contract**, not the expression that happens to satisfy it.
**Refs:** `test/arch/acd-declared-writes-include-generated-siblings.test.mjs` header;
`VERIFICATION.md` FF-7106 red probe (the third probe is the corrected form).

## R4 — Mapping across an adapter by id silently loses a third of the answer

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** whoever lands a control

**What happened.** FF-7106's first draft mapped each bundle member to its rendered outputs by matching
the output's own `resource.kind:id`. The codex render of `src/bundle/commands/continue.md` presents as
`skill:aof-continue`, not `command:continue`, so `.codex/skills/aof-continue/SKILL.md` — **one of the
three tracked files the control exists to protect** — was silently dropped from every member's render
set. The control was green and would have passed the exact story it was written to catch.
**Why.** A runtime adapter re-identifies what it renders. An id match assumes identity is preserved
across a layer whose job is to transform it.
**Lesson.** To learn what a member produces, **ask the engine** — render that member alone — rather
than pattern-matching its outputs. The derivation is then correct for a runtime nobody has written
yet, and the union-equals-whole check (143 = 143) is what proves no member went unattributed.
**Refs:** `VERIFICATION.md` FF-7106 red probe (the second probe reproduces the defect); chore 89
`OUTCOME.md`.

## R5 — A promoted chore's checklist is the reviewer's prose, not a re-derived fix set

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner

**What happened.** Chore 88 was promoted from a 71/02 review finding and its `## Definition of Done`
was seeded from the finding's remedy text: three named red arch tests and "re-run the full `test/arch`
tree to confirm 1543/1543". At the gate a **fourth** test proved to have the same root cause
(`test/acceptor-admissibility.test.mjs:589`, outside `test/arch/`), so ticking every box would have
left the tree red.
**Why.** The promotion faithfully carries what the reviewer wrote, which is the right behaviour for a
promoter. But a reviewer's remedy is a sketch taken mid-review, and nothing re-derives its scope
before the chore is executed.
**Lesson.** A promoted chore's checklist is a **starting point that must be re-derived against the
tree before it is worked**, and the re-derivation belongs to whoever picks the chore up. Where the
finding names a cause ("`harnessRefusal` now lifts"), search for the cause rather than working the
list of symptoms.
**Refs:** `VERIFICATION.md` F-71-H; chore 88 `## Definition of Done` (the fourth item was added at
this gate).

## R6 — An ADR adopted a mechanism another milestone had already ruled insufficient

**Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect

**What happened.** ADR-009 §C added `--window-size=<W>,<H>` to the shipped render invocation so a
mechanism swap could not silently drop 07's breakpoints — a correct worry, correctly caught by the
Three Amigos pass. But milestone **47**'s delivered design contract had already ruled on that flag:
`F-47-V-21` (2026-08-13) states that Chromium's `--window-size` does **not** guarantee the layout
viewport equals the stated width, names CDP `Emulation.setDeviceMetricsOverride` as the method that
does, and was itself added after three HIGH design findings were raised and withdrawn for want of it.
At this gate the shipped invocation produced a 390 frame with three unrelated subtrees clipped at the
same x, and the read-only designer correctly refused to judge it.
**Why.** The ADR reasoned about *preserving the breakpoints* and never asked whether the flag it chose
could *establish* them. The prior ruling lived in another milestone's DESIGN.md, which nothing in the
refine pass reads.
**Lesson.** When an ADR adopts or preserves a mechanism, check whether a delivered contract elsewhere
has already ruled on that mechanism — the flag, the command, the API — and re-derive at that record.
This milestone's own supersession discipline (state the new rule in your own contract, amend the
tests, never touch the delivered `.feature`) is the same move in the opposite direction, and it was
applied carefully to 07 while 47's ruling went unread.
**Refs:** `VERIFICATION.md` F-71-F; `wiki/work/47_milestone_fleet-repo-filter/DESIGN.md` §Render
breakpoints (F-47-V-21); 71/03 `OUTCOME.md` `## Gaps`.

## R7 — "The full suite is green" is not a statement about the item when the tree is shared

**Kind:** misunderstanding · **Area:** process · **Stage:** verify · **Owner:** product-owner

**What happened.** The gate ran the whole suite twice. Between the two passes the failure count went
**8 → 11**, and the three new failures named only milestone 72's in-flight untracked files
(imported-by-a-runner-and-never-spread). A sibling milestone was being built in the same working tree
while 71's gate ran. Of the final eleven, four belonged to 71's own accepted stories (already queued),
three to 72's refine, three to 72's live build, and one to 63.
**Why.** The milestone gate's "run the full suite once" assumes the tree at that moment is the
milestone's tree. On a machine where one checkout carries several milestones' uncommitted work, the
number measures the tree, not the item.
**Lesson.** The whole-suite pass at a gate is evidence only in the form **per-item lanes green + every
failure named and attributed**. A bare pass/fail count taken over a shared tree is not a fact about
the item being accepted, and reporting it as one would have blocked a finished milestone on another
milestone's half-written file.
**Refs:** `VERIFICATION.md` F-71-I, F-71-J, F-71-K, and the milestone `@executable` evidence row.

## R8 — A marker that was accurate at refine is a lie at accept, and it downgrades the check that would catch it

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner

**What happened.** Three separate times — 71/00's two rows, 71/01's two rows, 71/03's one — a control
landed and its register row still read `— **pending**`. Each stale marker downgrades a genuine
`control-unresolved` on that row from error to warn, so the marker that says "not landed yet" is
precisely what would hide "landed and then deleted".
**Why.** The marker is written at refine, when it is true, and nothing brings it back to attention at
the accept that makes it false.
**Lesson.** Striking the `pending` marker is part of landing the control, not a tidy-up: it belongs in
the same accept that records the control's red probe. The rule that a marker never clears a
`control-unresolved` is what made this recoverable — read doctor at **both** severities before
accepting, always.
**Refs:** `VERIFICATION.md` F-71-C, F-71-E; the FF-7102 row struck at 71/03's accept.

## R9 — A stale projection produced a red gate for records that were correct

**Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** product-owner

**What happened.** The read path met this milestone four times during execution, answering
`not-started` for stories whose records read `done` — recorded at the time as a walk hazard, since
`continue.md` loops on `work next` and a stale set can re-offer a story already built and reviewed.
At the close it produced something worse: seconds after `aof work status 71 done`, `aof work doctor 71`
reported **`error: lying-parent — milestone 71 is done but child stories 71/00, 71/01 are not done`**
and Loop-Ready fell 80% → 70%. All four `STORY.md` records read `status: done` on disk.
`aof work find 71/00 --json` answered `not-started` with `answeredFrom: "cache"`,
`reportedBy: "win-host-a-wsl"`, `syncedAt` timestamped **before** those accepts.
**Why.** The read path prefers a remote projection over a local record that is newer, and nothing
invalidates the projection on a local write. The write path is not confused — every `aof work status`
validated against local state and exited 0 — so the two halves of the same store disagree, silently,
for the length of a session.
**Lesson.** A gate finding is only as good as the read behind it. **Confirm at the source before
acting on a red gate** — a `lying-parent` against records that all say `done` is evidence about the
projection, not about the item, and "fixing" the records to satisfy it would corrupt correct state to
please a stale cache. The same reading already applies to the lifecycle verb's refusals; it applies to
doctor findings too.
**Refs:** `VERIFICATION.md` F-71-L; `STATE.md` `## Feedback (for retro)` (carried, not graduated —
it is a live defect, not a lesson learned).
