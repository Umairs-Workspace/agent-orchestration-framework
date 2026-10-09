---
name: "aof-add-task"
description: "Create a task — an adhoc standalone .feature, or a task inside an existing story."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <task description> [under story <ref>]

Use the native skill $aof-add-task; $ARGUMENTS is the operator text after its name.

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
Create a task: a `.feature` whose scenarios are its acceptance criteria. Either nested inside a
story's `tasks/`, or standalone at the top level (adhoc fix).
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.tags`.
</config>

<process>
For: "$ARGUMENTS"
1. **Under a story** (`under story <ref>`): create `<story>/tasks/<MM>_<slug>.feature` (`MM` = next
   local index) and add it to the story's `STORY.md` `## Tasks`. **Standalone**: top-level
   `<work.dir>/<NN>_task_<slug>/` containing `<slug>.feature`.
2. Scaffold the `.feature` (template: `.aof/templates/work/task/example.feature`):
   - **No user story** — an optional one-line objective (`In order to … the system must …`).
   - Exactly one verification tag — `@executable` (default), `@manual` (an agent-runnable live/technical
     check the suite can't do yet), or `@uat` (genuinely needs a human to judge) — + layer/refinement/
     domain tags from `work.tags`. No `@milestone-NN`.
   - Background + Scenario(s) + a Scenario Outline + Examples (the case matrix).
   - Apply the **litmus test** (black-box observable) to every line.
3. Keep it independent of other stories' tasks.
</process>

<progress_tracking>
A task has no `status` field — it is **done when its `@executable` feature is green**. When nested,
it is an unchecked box in `STORY.md` `## Tasks`; tick it when green.
</progress_tracking>

<output>
Report the path + the scenarios drafted.
</output>
