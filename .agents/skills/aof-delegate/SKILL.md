---
name: "aof-delegate"
description: "Set this project's two model decisions in one place — toggle Codex delegation on/off (default off), then always choose the orchestrator (main-session) model, Fable 5 or Opus 4.8. Pass `status` to just report the current settings."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: on | off | status

# delegate

Use the native skill $aof-delegate; $ARGUMENTS is the operator text after its name.

Keep the primary runtime distinct from optional cross-assistant delegation. This session remains Codex when delegation is off or on; native build/review roles stay Codex. Work mode selects solo versus supported native orchestration, not another assistant. Cross-assistant work requires a separate explicit request, enabled delegation and a supported provider. Never launch another Codex CLI just to delegate from Codex. Runtime-scoped session/role model and effort settings are separate from the existing Claude orchestrator-model door.

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
