---
name: "aof-repair"
description: "Repair a halt the loop handed over — diagnose the cause named in the hand-over file, fix it (the loop's own records, or the story's code, tests or rubric), ask the operator when a decision or permission is theirs, and hand back so the loop resumes by itself."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <halted ref> <hand-over file>

# repair

Use the native skill $aof-repair; $ARGUMENTS is the operator text after its name.

Repair the cause named by the handover, whatever halted the loop: a lane that will not merge home or reopen, or a story whose grade, gates or retries ran out. Diagnose against actual state, fix the cause (the story's code and tests in its lane included), ask the operator one question per ask when a decision or permission is theirs, and prove the failure is gone with the check the loop applies. Preserve operator changes and all owned commits. No reset, stash, force-adopt, unrelated fixes or automatic loop launch. One repair per halt: an unverifiable repair is a handback that names what stands in the way.

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
