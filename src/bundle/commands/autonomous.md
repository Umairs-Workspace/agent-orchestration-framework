---
description: Drives a milestone range through the code-owned loop shell, preserving the autonomous door while keeping sequencing, gates, retries, and stops in one enforceable home.
argument-hint: "<range — NN-MM or NN> [--ship] [--max-attempts N] [--solo]"
allowed-tools: [Read, Bash, SlashCommand]
---
<objective>
Drive the requested milestone range through the code-owned shell and report its result without
re-deriving any part of the drive in this prompt.
</objective>

<config>
Read `.aof/aof.config.json` → `work.agents` and `work.codeReview.autoComplete`. Parse
`$ARGUMENTS` as follows:

- **range** — an inclusive `NN-MM` range or a single `NN`; pass it to the shell verbatim.
- **--ship** — after the shell reports a milestone accepted, run `aof:code-review <NN>` for that
  milestone. It merges only when `work.codeReview.autoComplete` is set. A halt never ships an
  unaccepted milestone.
- **--max-attempts N** — forward `N` to the shell as `--cap N`. This prompt does not count attempts
  or state a fallback ceiling.
- **--solo** — force solo role execution for this wrapper session. Otherwise resolve the wrapper
  session's role-execution mode from `work.agents.mode`. This setting governs only the roles this
  session plays itself; it does not reach the sessions the shell drives, which resolve their own
  configured mode.

The argument hint and both admitted range forms remain unchanged.

The shell also honours `work.loop.concurrency`, a mode whose one home is `src/loop-bounds.mjs`:
`sequential` (the default, and what an unset key means) drives one act per tick in the primary
checkout, while `refine_first` refines every story in the range first, then builds the ready
waves in worktree lanes, then runs the verify phase. It is read from `.aof/aof.config.json` and
is never passed as a flag; this prompt forwards nothing for it.
</config>

<process>
Run `aof work loop <range> --level L2`, adding `--cap N` when `--max-attempts N` was supplied.
The `--json` form is a read-only probe and never launches work; do not add it to this command.

Do not re-implement the loop, the phase mapping, the gate, the retry or the stop conditions; they
are the shell's.

When the shell returns, quote its output rather than calculating a second account. Report the items
the shell says it drove. If it halted, report the shell's stop id, the ref where it halted, and the
exact resume command it printed (`aof work loop <range> --resume`). End with the first item still
needing a human and that resume command. If it completed, report the accepted milestones the shell
named; with `--ship`, apply the post-accept action from `<config>` to each of them.
</process>

<output>
Report only facts supplied by the shell: driven items, accepted milestones, or the halt's stop id,
ref and exact resume command. Do not infer a phase, retry, gate result, stop reason, or progress
position independently.
</output>
