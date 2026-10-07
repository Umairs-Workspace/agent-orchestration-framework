---
name: "aof-refine"
description: "Refine a work item — break a milestone into independent stories, or author a story's task features (Three Amigos), producing ARCHITECTURE/DESIGN/RESEARCH as needed. With --autonomous, cascade the whole item (break down + author every contract) and stop once for a single review at the end."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <item ref - NN or slug> [--autonomous] [--solo | --orchestrated] [--thinking <level>]

# refine

Use the native skill $aof-refine; $ARGUMENTS is the operator text after its name.

Refine produces decisions, examples and locked contracts, then one final review; it builds nothing. Mint before authoring. Finish ADR decisions before contract authoring; never re-author delivered features. Scope declared reads/writes. Business-rule questions require actual answers, never autonomous defaults or elapsed-time approval. Doctor the example map before writing tasks; retain executable/manual/UAT lanes, real registered controls and negative probes. Complete every requested story before the consolidated review.

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
