---
type: story
number: 04
slug: autonomous-shell-out
title: "The prose loop hands over — one home for the cap, and the soak that proves it"
parent: 53
status: done
owner: product-owner
created: 2026-08-15
updated: 2026-08-20
depends: [53/02]
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 04 · The prose loop hands over

## User story

As an **operator who types `/aof:autonomous 53`**, I want that door to run the code-owned shell
rather than re-implement it in prose, so that the caps and stop conditions I rely on are **enforced
rather than suggested** — and so that there is exactly one home for the loop's rules instead of two
that can disagree.

## Context

One markdown file changes — `src/bundle/commands/autonomous.md` — and it is the highest-leverage
prose change in the milestone. Its `<process>` block (`:40-124`) and `<stop_conditions>` block
(`:126-143`) are deleted and replaced by a shell-out to `aof work loop <range> --level L2`,
with an instruction not to re-implement the loop, the phase mapping, the gate, the retry or the stop
conditions.

The missing `--json` is load-bearing. The machine face is story 53/02's frozen, read-only probe;
launcher mode is the human face without `--json`. The prompt must enter that launcher and quote its
authoritative report. It must never turn the probe into an executing door.

**Two things in that document are not loop shell and stay**: the `--solo` execution-mode resolution
(`:24-37`) — whether roles are played inline or spawned, which the shell has no view of — and the
`--ship` post-accept `aof:code-review <NN>` step, which is a PR act. Both are re-anchored on the
shell's output.

**Leaving the prose loop beside the code loop would be strictly worse than today.** Today there is
one home for the cap, and it is the wrong one. Two homes means a model can follow either, and they
can disagree — the disease this whole milestone exists to cure.

**"The two coexist" means the door coexists, not the implementation.** `/aof:autonomous <range>`
keeps its name, its argument hints and every caller — including `resolveDirectivePhase`'s
milestone→`autonomous` resolution and the mesh's directive vocabulary. Only its body changes.

This story also carries the milestone's **soak lane**, because the story whose acceptance turns on
the loop actually working should be the story that observes it working. ADR-008 §3 calls it a
`@manual` lane; it ships as **`@uat`**, because its acceptance criterion is a human's *independent*
reading matching the machine's stop id — and an agent asked to make that comparison would read the
stop id first and then agree with it. That is not a measurement.

ADR references: 53/ADR-008 (all of it), 53/ADR-002 §4 (the `resolveDirectivePhase` consequence),
53/ADR-009 §1 (the cap has one home).

## Acceptance

- **The loop-shell content is gone, and the deletion list is WIDER than ADR-008 §1 named
  (ADR-010 §21).** Comment-stripped, `autonomous.md` contains none of the tokens it owns today —
  `Loop until`, `aof work next`, `aof work run-start`, `run-retry`, `maxAttempts`,
  `heartbeatStaleMs`, the stop-condition list — and `aof work next` goes from **all eleven** of its
  sites, including the **four outside** `<process>`/`<stop_conditions>`: the frontmatter
  `description` (`:2`), `<objective>` (`:8`), the `<config>` range bullet (`:18`) and
  `<progress_tracking>`'s first bullet (`:146`). The `<config>` block stays but drops its
  `work.autonomous.maxAttempts` and `work.autonomous.heartbeatStaleMs` reads (`:14-15`) — the cap
  and the staleness threshold are the shell's. It names `aof work loop` **at least once** as its
  body and names no other command for driving the range: FF-5310's original "exactly once" is
  struck, because ADR-008 §1's own replacement text names it twice — the invocation and the
  `--resume` hint this story's acceptance separately requires. The anti-loop policy paragraph
  (`:112-120`) goes too: m20's *guard* lives in the run store and stays there; only the *guidance*
  lived here.
- **The shell-out executes the human launcher, never the machine probe.** Its exact body command is
  `aof work loop <range> --level L2`, adding `--cap N` only for `--max-attempts N`; it does not append
  `--json`. Story 53/02's `aof work loop <scope> --json` contract remains a promptly-returning,
  zero-write probe.
- **The human launch report is authoritative and sufficient to quote** — it names the items it drove,
  identifies accepted milestone refs on completion, and on a halt names the stop id, the ref, and the exact resume command
  (`aof work loop <range> --resume`). The prompt derives none of those facts. Story 53/04 may narrow-edit
  `src/commands/loop.mjs` only at the launcher-report projection/rendering seam needed to expose that
  account; the frozen ten-key JSON probe, engine decisions, phase mapping, cap and stop producers remain
  story 53/02's unchanged contract.
- **`--solo` and `--ship` survive**, re-anchored on the shell's output rather than on a loop the
  prompt runs. Every existing argument hint still works — but **`--solo`'s reach narrows, and the
  prompt must say so.** `work:loop`'s frozen input (ADR-005 §3) carries no execution mode, so
  `--solo` governs *this* session only; the sessions the shell spawns read `work.agents.mode`
  themselves. A prompt that claimed otherwise would be promising what the shell cannot keep — the
  unenforceable-instruction disease this milestone exists to cure, reintroduced in the story that
  cures it. `--max-attempts N` forwards to the shell's `cap` input; the prompt counts nothing.
- **The door is unchanged.** `/aof:autonomous <range>` keeps its id, its name and its
  `bundle.json` membership. **No `/aof:loop` and no `/aof:drive-*` member is added** — `/aof:autonomous`
  *is* `aof work loop`'s prompt-side door, and a second one would be two doors to one act. (A
  `/aof:drive-continue` would be a prompt spawning a session to run `/aof:continue`, from inside a
  session — circular by construction.)
- **The cap's reader set is exactly the measured pre-existing THREE plus `src/commands/loop.mjs`**
  — `src/commands/run-retry.mjs:62`, `src/commands/resume.mjs:119` and
  `src/commands/run-start.mjs:200` (FF-5310 as corrected: a gate armed at two is RED at HEAD for a
  reason that has nothing to do with milestone 53) — every fallback literal still `3`. This
  milestone adds no new default, no new key and no new resolution site.
- **`@uat` — the soak that defines "proven".** `aof work loop <NN> --level L2` drives one real
  milestone on this repo's own stream from `not-started` to `done`, **or** halts at exactly one
  genuine gate, observed by the operator, with the halt's stop id matching the operator's own reading
  of why it stopped — **written down before the stop id is read**, or the comparison measures
  nothing. This lane is the discharge condition for *deleting* the prompt later; until it is signed
  off, the prompt stays.
- **The bundle mechanics are untouched.** Content changes the manifest hash automatically;
  `src/work-bundle.mjs` and `src/bundle/bundle.json` are not edited. Shipping is
  `node scripts/install-local.mjs` plus a restart, per `.claude/rules/build-deploy-restart.md`.
- **`src/bundle/commands/{refine,continue,verify}.md` are unchanged byte-for-byte.** The shell
  becomes code; each phase's what-to-do stays its prompt.
- **The story's evidence lands WITH the story, registered.** One new suite under this story's frozen
  name family — `test/autonomous-shell-out-prompt.test.mjs`, carrying task 00's bundle-reader, door,
  `aof work continue`, and black-box launcher legs — **imported AND spread** in `scripts/test.mjs` inside this story's
  own labelled `// milestone 53 / story 04` block, in the same diff as the prompt change it
  mechanises. The black-box leg executes the exact no-`--json` command the prompt names: one fixture
  supplies source-local `aof` and hermetic Claude executables through the child process's temp `PATH`, proving a run is minted,
  a phase is actually driven, and stdout names its ref/phase; a halt fixture proves stdout names the
  authoritative stop id, ref and exact resume command. The paired `--json` child proves zero provider
  calls, `driven: []`, and a byte-identical fixture. A string-presence assertion is not evidence that
  the shell-out executes. Task 00's Examples tables are executable case inventories: their rows may be
  parameterised, but each row remains identifiable in the assertions. The `@uat` soak deliberately has
  no file, by design (ADR-011 §1). Not later, and not 53/05's
  — a story accepted on evidence the runner never invokes is TECH_DEBT item 48 exactly.

## Tasks

<!-- Authored 2026-08-15 by the Three Amigos (PO headline outcomes, QA case matrices + litmus,
     developer feasibility read against the real source). TWO tasks, and the cut is the one the
     story forces: one document that can be read mechanically, and one human judgement that
     cannot. 00 is every observable fact about the shipped prompt and the door that names it —
     including the `aof work continue <milestone> --json` drive, measured live on a fixture
     stream, because "a milestone continue BECOMES a loop" (ADR-002 §4) is this story's one
     consequence outside the document itself. 01 is ADR-008 §3's "proven", tagged `@uat` rather
     than the `@manual` the ADR names: its acceptance criterion is a human's independent reading
     matching the machine's stop id, and an agent asked to make that comparison would read the
     stop id and then agree with it. -->

- [x] [00 — the prompt names one command as its body and carries no second copy of the loop's rules](tasks/00_the-prompt-hands-over.feature)
- [ ] [01 — the operator drives one real milestone and the shell's account of the halt matches theirs](tasks/01_the-soak-that-defines-proven.feature)

## Notes

Deleting `autonomous.md` is **not this milestone's** — it is a later chore, and it carries a named
precondition: `resolveDirectivePhase`'s `"autonomous"` return (`continue.mjs:132`) becomes a dangling
directive the moment the prompt goes, and must be superseded in the same diff.

**Refinement ruling (2026-08-17, `aof:refine 53/04`, per ADR-015 §4):** task 00's “exactly one
rendered path's content-address moves” row was the INSTRUMENT wrong about the TREE — one authored
source (`src/bundle/commands/autonomous.md`) renders to **two** addresses by the generic,
ADR-006-mandated `command → codex skill` mapping (`src/work-bundle-runtime.mjs:13-23`, `:55-59`,
which pushes the mapped resource *before* the declared-runtimes filter at `:61`, so the member's own
`runtimes: ["claude"]` does not suppress the Codex skill). The row is amended to close at **exactly
those two runtime renders and no third** — `.claude/commands/aof/autonomous.md` and the mapped
`.codex/skills/aof-autonomous/SKILL.md` — and the manifest leg now names both. Verified at source
this round: the shipped manifest carries `sha256:5274d68f…48958cc1` and `sha256:688e5c98…8cbccf4040`
for those two paths, both moved from the base at `9e0f910`. Closing at two keeps everything the
clause was for: a manual hash bump still fails, an unrelated render moving still fails, and a
deleted runtime output still fails. **No runtime output was deleted and no bundle machinery was
touched** — the alternative of runtime-qualifying the scenario was rejected because the shipped
manifest is not runtime-qualified. The Background's Claude-only reader observation (`:31`) is
correct as written and stands; ADR-008 is unamended.

**PO refinement pass (2026-08-17, ADR-016):** black-box QA proved that the former `--json` shell-out
returned story 53/02's read-only probe (`driven: []`, no run minted). The body command is therefore the
human launcher without `--json`, while `--json` stays probe-only. Task 00 is reopened and gains an
executable black-box launcher outcome plus an authoritative human-report outcome. The dependency on
53/02 is now explicit and remains open until 53/02 is done.

**QA refinement pass (2026-08-17, ADR-016):** the stale Examples row that still named the `--json`
body is corrected. Exact wrapper-argument → delegated-command cases now cover range, cap, solo and
ship; child-process cases distinguish a real human drive, a deterministic human halt and the frozen
zero-write JSON probe; and the report inventory separates driven, completed and halted facts. The
child's temp-PATH provider leaf makes the drive deterministic without adding a production seam.
Developer feasibility remains outstanding after this QA checkpoint.

**Developer-feasibility pass (2026-08-17, ADR-016):** CONFORMS after two precision amendments. The
child's temp `PATH` carries a source-local `aof` shim as well as the hermetic `claude` leaf, so the
literal command tests this checkout rather than an ambient install. Windows `.cmd` execution was
driven through the real provider and ConPTY path and received the phase directive. The existing
terminal `LoopState` already carries driven ref/phase/outcome rows and halt `act`, so the granted
report projection/rendering seam can emit driven, accepted-milestone and halt accounts without
widening JSON or adding a command/seam. The exact shared-file partition is the append-only
`scripts/test.mjs` hub plus the dependency-ordered `src/commands/loop.mjs` hand-off from 53/02.

**Implementation evidence amendment (2026-08-17):** the new exact child-process case found a Windows
ConPTY handle leak after a successful provider exit: the run settled, but the CLI did not terminate
and the fixture cwd remained locked. The driver now closes the already-exited PTY at its existing
single cleanup point under the existing guard. This is the one additional shared-source line granted
by ADR-016's implementation amendment; it changes no outcome or launcher policy and is held by the
story's real child-process exit/cleanup proof plus the unchanged driver suites.
