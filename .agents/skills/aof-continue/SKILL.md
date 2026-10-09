---
name: "aof-continue"
description: "Execute/resume a work item — build its tasks to green, then structural + behavioural review. For a milestone, walks every story to built-and-reviewed; refining stays with `aof:refine`, accepting with `aof:verify`."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <item ref, or a NN/MM-PP story span> [--solo | --orchestrated | --manual] [--thinking <level>]

# continue

Use the native skill $aof-continue; $ARGUMENTS is the operator text after its name.

Build and review every member of the exact declared scope; never widen a span or accept a story/milestone. Resolve resume/next first, mint each story before code and recall near-misses. Solo means inline, no dispatch or subagent. Build through the declared impacted test gate and retain the two-consecutive-no-progress bound. Validate then doctor the same ref before any review. Perform structural, behavioural and craft lenses, plus design when required. Independent review requires a separate supported native role; inline lenses are self-review. Review defaults to one round and caps at three; only reproduced Blockers earn a bounded delta rereview. Tick green tasks, move to in-review with the CLI, settle the owned run, then continue the remaining scoped members.

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
