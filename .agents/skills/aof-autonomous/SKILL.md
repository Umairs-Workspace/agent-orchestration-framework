---
name: "aof-autonomous"
description: "Drives a milestone range through the code-owned loop shell, preserving the autonomous door while keeping sequencing, gates, retries, and stops in one enforceable home."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <range - NN-MM or NN> [--max-attempts N] [--solo]

Use the native skill $aof-autonomous; $ARGUMENTS is the operator text after its name.

## Codex execution contract
Use only tools actually exposed by this session. File reading/editing, shell execution, search,
browser/image tools and native role tools are capability-dependent; Claude tool aliases are not
permissions. Instruction-level read-only boundaries do not claim enforced sandbox isolation.
In solo mode perform required roles inline and spawn nothing. Orchestrated independent work
requires a native launcher such as spawn_agent when exposed, independent context and support
for each selected model/effort; otherwise report native-role-capability-unavailable or
native-role-setting-unsupported before claiming independence. Stay within the resolved dispatch
bound and review/no-progress bounds. Read role settings from work.agents.runtimes.codex.
Never infer the primary assistant from the delegation toggle.
For questions, use an available native question tool, or ask explicitly in the conversation when
that tool is unavailable. Required answers remain pending until received. A driven business question
retains its map token and one-question-per-ask form. Permission approval uses the host approval flow,
not a question tool or elapsed time. AOF_NEEDS_INPUT is for an actually unanswered blocked turn,
never a fabricated native capability.

<objective>
Drive the requested milestone range through the code-owned shell and report its result without
re-deriving any part of the drive in this prompt.
</objective>

<config>
Read `.aof/aof.config.json` → `work.agents`. Parse
`$ARGUMENTS` as follows:

- **range** — an inclusive `NN-MM` range or a single `NN`; pass it to the shell verbatim.
- **--max-attempts N** — forward `N` to the shell as `--cap N`. This prompt does not count attempts
  or state a fallback ceiling.
- **--solo** — force solo role execution for this wrapper session. Otherwise resolve the wrapper
  session's role-execution mode from `work.agents.mode`; an unset `work.agents.mode` resolves to
  solo. The flag governs only the roles this session plays itself; it does not reach the sessions
  the shell drives, which resolve their own mode through the chain below.

The argument hint and both admitted range forms remain unchanged.

The shell also honours `work.loop.concurrency`, a mode whose one home is `packages/contracts/src/loop-bounds.mjs`:
`sequential` (the default, and what an unset key means) drives one act per tick in the primary
checkout, while `refine_first` refines every story in the range first, then builds the ready
waves in worktree lanes, then runs the verify phase. It is read from `.aof/aof.config.json` and
is never passed as a flag; this prompt forwards nothing for it. Beside the mode, in the same home,
sits the loop's own `work.loop.dispatch.concurrency` — the bound on the lanes the loop runs
together, narrowing the workspace's `work.dispatch.concurrency` and never exceeding it — which
falls back to its workspace twin `work.dispatch.concurrency` when unset. The role mode of each
driven phase sits there too: `work.loop.agents.refine.mode` and `work.loop.agents.continue.mode`
(`solo` or `orchestrated`, composed onto the phase command by the shell's drive) override
`work.agents.mode` when set, and when unset fall back to `work.agents.mode`, then to `solo` — the
chain whose one home is `packages/contracts/src/agent-mode.mjs`.
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
named.
</process>

<output>
Report only facts supplied by the shell: driven items, accepted milestones, or the halt's stop id,
ref and exact resume command. Do not infer a phase, retry, gate result, stop reason, or progress
position independently.
</output>
