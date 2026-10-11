---
aof-generated: true
description: Draw the ADR diagrams a refine left undrawn — every briefed ADR with no picture, or one ADR you name — through the same `aof diagram plan` / `aof diagram export` step refine uses, pasting each block under its brief.
argument-hint: "<ref> [ADR-NNN]"
aof-invocation: /aof:add-diagram
aof-runtime: claude
---

<objective>
Refine's diagram step is the architect's judgement, and it is never a stop. A brief can therefore be
left with no picture under it: the step was skipped, or it answered `available: false` and kept the
brief for later. This command fills those gaps after the fact, without re-running the refine. It
re-runs refine's diagram step and nothing more. It never decides afresh which ADRs deserve a picture,
and it never replaces one that is already drawn.

aof owns the plan and the export. This session owns two things: drawing each diagram by following the
instructions the plan answers, and pasting the block the export returns. aof never edits
`ARCHITECTURE.md`; this session does. Nothing is spawned.
</objective>

<config>
Parse "$ARGUMENTS": one work item ref, then optionally one ADR id (`ADR-NNN`). The ADR id names the
one ADR to draw. With none named, this run draws every undrawn brief the item has.
</config>

<process>
1. **Pick — read the item's `ARCHITECTURE.md`.** Resolve the item's folder with
   `aof work find <ref> --json` and read its `ARCHITECTURE.md`. An item with none has nothing to draw.

   An ADR is the section under its `## ADR-NNN` heading. Its **brief** is the prose under its
   `### Diagram` heading. It is **drawn** when its section carries a link into `diagrams/` (a
   `](diagrams/` target outside a code fence). It is **undrawn** when it has a brief and no such link.

   - **No ADR named.** List each ADR whose `### Diagram` brief has no `diagrams/` link under it. Those
     are the candidates. An ADR with no brief is not a candidate. Refine's architect left it without
     one on purpose, and that judgement stands. An ADR whose diagram is drawn is already drawn. A
     `diagram not drawn:` line in `STATE.md` left its brief behind, so that ADR is a candidate like any
     other: its brief is still under the ADR. Leave the `STATE.md` line as it is. `STATE.md` is a log,
     and the doctor reads `ARCHITECTURE.md`, which is the record.

     **List every candidate before the first draw**, then draw each candidate in turn, without pausing
     for confirmation between them.

     **With no candidate, report that the item has nothing to draw and write nothing.** Name
     `aof:add-diagram <ref> ADR-NNN` as the way to draw one ADR. Never search the ADRs for one that
     would benefit from a picture: which ADRs get one is refine's judgement, not this command's.

   - **An ADR named.** Plan that ADR only, whatever other ADRs are undrawn.
     - Already drawn (a `diagrams/` link in its section): report it as already drawn and stop. Run no
       plan for it and write no file. Replacing a drawn diagram is not this command's job.
     - No `## ADR-NNN` heading: write nothing and run the plan with the ADR id itself as the slug
       (`adr-nnn`), which refuses it (step 2).
     - No `### Diagram` section: first read the item's status with `aof work status <ref>`. A `done`
       item is delivered: report that a delivered ADR's diagram is immutable and stop, writing nothing.
       Otherwise write the brief under that ADR before planning. Use the words refine's diagram step
       uses: why a picture helps, the view (architecture, sequence, state machine…), the components and
       the flows, all drawn from the ADR's own text.

   The ADR's design is never revisited. Each ADR is drawn as the ADR says it is.

2. **Plan — the CLI.** For each ADR, run `aof diagram plan <ref> <ADR-NNN> --slug <slug> --json`. The
   slug is the ADR's title in kebab case: lower case, with each run of other characters turned into
   one `-`. It must start with a letter or digit and be no more than 48 characters long.

   Act on the answer:
   - **`enabled: false`** — diagrams are off for this project. Report the answer's `reason`, write
     nothing, and stop. If this run wrote a brief for a named ADR, remove it again: refine drops the
     brief when diagrams are off. The answer is the same for every ADR, so the whole run stops.
   - **`available: false`** — the drawing engine is not installed. Report the answer's `code` and
     `fix`, keep every brief, and stop. The briefs wait for a run once the engine is there.
   - **A non-zero exit** is a coded refusal. Report its code and message, and stop for that ADR. The
     refusals include `diagram-adr-unknown` (no such ADR in `ARCHITECTURE.md`),
     `diagram-brief-missing` and `diagram-slug-invalid`. **`diagram-item-delivered`** means the item
     is done and a delivered ADR's diagram is immutable: report that, write nothing, and stop, because
     every ADR of the item answers the same.

3. **Draw.** Otherwise follow the answer's `instructions` exactly. They name the skill to read, carry
   the brief, and name the one source file to write. Write nothing else, and do not export: aof does
   that next. Do not pause for confirmation while drawing.

4. **Export.** Run `aof diagram export <ref> <ADR-NNN> --json` and paste the returned `block` under
   the ADR's brief: after the brief's last line, before the next heading. A non-zero exit with no
   `block` is a refusal. Report its code and message, and move to the next ADR.

   **A PNG miss still pastes the block.** An answer whose `png` is not ok exits non-zero, but its
   `block` and `written` still stand. Paste the block. Report the PNG's `code` and `fix`, and say that
   `aof work doctor` stays red on that diagram until a node with a browser exports it.

5. **Report.** For each ADR drawn, list the paths written (the export's `written`) and where the
   block was pasted. Name each ADR skipped or stopped, and why. aof never edits `ARCHITECTURE.md`,
   and this command never commits what was drawn. Leave the diagrams, the pasted blocks and any new
   brief for the operator to review and commit.
</process>
