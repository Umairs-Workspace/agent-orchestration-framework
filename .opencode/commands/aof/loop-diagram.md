---
description: Draw a milestone's loop plan — which stories `aof work loop` builds together under refine_first, which wait and why, and which are already built — through the project's diagram engine, into the milestone's execution/ folder.
---

<objective>
Draw the waves the loop will fan a milestone out into, so the operator can see before or after a run
what builds in parallel. A story held back by a `files:` collision or a `depends:` edge should show up
on a picture, not as a cause rebuilt from the loop-diag log after a wave has already gone wrong.

aof owns the plan and the export. This session owns one thing: drawing the diagram, by following the
instructions the plan answers. Nothing is spawned — no `claude -p`, no second session.
</objective>

<config>
Parse "$ARGUMENTS": one milestone ref (`NN`). One milestone per run: a range is not planned.
</config>

<process>
1. **Plan — the CLI.** Run `aof diagram plan <ref> loop --json` and read the answer. It computes the
   wave plan from the loop's own rules and writes it to the milestone's `execution/loop-plan.json`.
   Never re-derive a wave yourself: the plan is the answer.

2. **Stop on a stop.** A refusal writes nothing. Report its message in the operator's terms and stop:
   - `loop-not-refine-first` — the project does not refine upfront, so there is no wave plan.
   - `loop-not-refined` — the milestone, or a story in it, has no contract yet; the message names the
     `aof:refine` to run.
   - `loop-not-a-milestone` — a single item runs in one lane, so it has no waves to draw.

   Any other non-zero exit is a stop too: report it and stop.

3. **Stop when nothing can be drawn.** The plan was still written. On `enabled: false` (diagrams are
   off) or `available: false` (the drawing engine is not installed — the answer's `fix` says how),
   report where the plan was written (`plan`) and why nothing was drawn, then stop.

4. **Draw.** Otherwise follow the answer's `instructions` exactly. They name the skill to read, carry
   the brief, and name `execution/loop.html` as the one file to write. Write nothing else, and do not
   export — aof does that next. Do not pause for confirmation while drawing.

5. **Export.** Run `aof diagram export <ref> loop --json`. It writes `execution/loop.png` through a
   browser aof finds, and keeps no SVG. When no PNG can be made it writes nothing and exits non-zero:
   report the answer's `png.code` and `png.fix`, and that `loop.html` is still there to open.

6. **Report.** List the paths written — `loop-plan.json`, `loop.html` and the answer's `written` —
   and summarise the waves in one line each, naming any held story and why. Say that the waves assume
   every lane in a wave finishes together (the live loop asks again as each lane finishes). aof never
   commits `execution/`: leave it for the operator.
</process>
