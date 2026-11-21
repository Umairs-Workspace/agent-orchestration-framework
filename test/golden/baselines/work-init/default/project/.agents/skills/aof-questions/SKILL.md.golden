---
name: "aof-questions"
description: "Read the questions the loop is waiting on — each open ask in full, with the exact `aof work answer` line that replies to it."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: [--all] [--json]

Use the native skill $aof-questions; $ARGUMENTS is the operator text after its name.

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
Show the operator every question a loop has stopped a lane to ask, so they can read and answer it
from this session. Read-only: this command prints the questions and answers none of them.
</objective>

<process>
1. Run `aof work questions` from the repository root — add `--all` when the operator asks for every
   workspace on this node, and `--json` when they want the rows as data. The verb reads the ask files
   and the local mesh store directly, so it answers when the portal is stale or down.
2. Print what it printed, unchanged: each question in full, its choices, whether it is parked, stale
   or on another node, and its `aof work answer <ref> "…"` line. A stale row has no answer line — its
   loop stopped, and `aof work loop <ref> --resume` clears it. A row from another workspace names the
   checkout to answer from.
3. `No open questions.` is a complete answer: say so and stop.
</process>

<output>
The verb's rows, as printed. Write no file, and never run `aof work answer` yourself — answering is
the operator's call; hand them the line.
</output>
