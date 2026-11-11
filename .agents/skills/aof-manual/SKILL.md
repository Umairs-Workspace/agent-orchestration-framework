---
name: "aof-manual"
description: "Hand the operator a guide to build one story or task themselves — enter through the build door, start the story, run its tests once and print the guide. Builds nothing; the operator's build is reviewed next by aof:review."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <story or task ref>

# manual

Use the native skill $aof-manual; $ARGUMENTS is the operator text after its name.

Guide the operator's own build of one story or task; do not implement. Enter through the build door with `aof work continue <ref> --manual --json` and stop on any refusal, minting nothing. Never walk the re-entry sweep or resume a lineage. Read the story as continue's story lane step 1 does, mint the owned run, run the declared impacted test gate once, print the guide in the terminal only, and close the run done. Spawn no developer and no reviewer, walk no gate ladder, and write nothing outside the item's own folder. A hand-off to an agent is written to the item's STATE and names `$aof-continue <ref>`, never runs it. Hand back to `$aof-review <ref>`.

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
