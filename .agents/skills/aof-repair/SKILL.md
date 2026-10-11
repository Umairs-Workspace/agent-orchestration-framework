---
name: "aof-repair"
description: "Repair a lane halt the loop handed over — diagnose the cause named in the hand-over file, fix the loop's own records (a lane that would not merge home or would not reopen), and hand back so the loop resumes by itself. Never the story's code, never the loop."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <halted ref> <hand-over file>

# repair

Use the native skill $aof-repair; $ARGUMENTS is the operator text after its name.

Repair only the cause named by the handover: diagnose lane-halt, fixture discrepancy or capability failure against actual state. Preserve operator changes and all owned commits. No reset, stash, force-adopt, unrelated story implementation or automatic loop launch. Prove the specific failure is gone using the named check; retain the handover and report unknowns. Bound the repair to the named cause and report the next operator command.

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

Read procedure.md for this procedure and .codex/aof/workflows/workflow-contract.md for shared ownership, evidence and bounds. Load no unrelated procedure to interpret these gates.
