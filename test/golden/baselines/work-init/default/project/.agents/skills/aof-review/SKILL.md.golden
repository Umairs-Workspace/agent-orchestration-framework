---
name: "aof-review"
description: "Review the operator's own build of a story — run its tests, walk continue's gate ladder and review lanes over the change, and hand every finding back. Builds nothing and fixes nothing; a clean review moves the story to in-review for aof:verify."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <story or task ref> [--solo | --orchestrated]

# review

Use the native skill $aof-review; $ARGUMENTS is the operator text after its name.

Review the operator build; do not implement. Mint the owned run, use the declared impacted test gate, then validate and doctor the same ref before review. Structural, behavioural and craft lenses remain mandatory; design joins for UI. In orchestrated mode each independent reviewer must be a supported native role that did not build the patch. Solo records inline self-review honestly. One review round per invocation; bounded rereviews belong to continue and admit only reproduced Blockers, never a whole-story restart. Close the owned run even when findings remain and hand back the actual verdict.

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
