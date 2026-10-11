---
name: "aof-retrospective"
description: "The retrospective session — triage a milestone's mistakes/blockers (from STATE feedback notes + VERIFICATION findings) and distil them into RETROSPECTIVE.md as carryable lessons. Called at the close by aof:verify, or run directly to backfill past milestones."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: [ref | range - omit for all done milestones without one]

# retrospective

Use the native skill $aof-retrospective; $ARGUMENTS is the operator text after its name.

Read the target story or milestone evidence, recall shared memory before triage and ingest after authoring. Keep stable R<n> ids and deduplicate lessons. Kind is mistake/blocker/near-miss/misunderstanding; Area is code/architecture/contract/security/process; Stage is refine/build/verify; Owner is required. No invented lesson or product evidence. Each story owns its own retrospective. Observability is written only by the CLI; a clean run need not produce a lesson doc.

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
