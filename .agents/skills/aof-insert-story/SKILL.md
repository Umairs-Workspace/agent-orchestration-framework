---
name: "aof-insert-story"
description: "Insert a story at a target position under a milestone — scaffold SS_story_slug at --at P and re-index sibling stories ≥ P up by one, keeping the stream valid. The placement twin of add-story."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <story description> at <position P> under milestone <NN>

Use the native skill $aof-insert-story; $ARGUMENTS is the operator text after its name.

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
Frame a new story at a **specific local position** `P` inside a milestone's `stories/` — not appended
at the tail. The placement twin of `$aof-add-story`: it scaffolds the SAME `SS_story_slug/`
(STORY.md + empty `tasks/`), but slots it at `P` under the owning milestone and re-indexes every
sibling story that was `≥ P` up by exactly one. Use for a story discovered mid-flight that belongs
*beside* related siblings, not after everything added later.
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.agents`. Resolve refs with `aof work find` /
`aof work next --json` — never hand-glob `**/*.md`.
</config>

<process>
For: "$ARGUMENTS"
1. **Resolve slug + position + parent.** Slug = kebab. Target local position `P` = the `at <P>` the
   caller gave (the `SS` the new story should occupy). Parent milestone `NN` = the `under <NN>` — a
   story is always nested (required `parent`, ADR-006).
2. **Placement + re-index is MECHANICAL — the CLI, never hand-edited.** Run
   `aof work insert-story "<slug>" --at <P> --under <NN> --json`. This scaffolds from
   `.aof/templates/work/story/` (the SAME template `add-story` uses), resolving the `parent:` line to
   `NN`, AND renumbers every sibling story `≥ P` up by one, rewriting references so nothing dangles —
   leaving `aof work validate` green. **Never** renumber or rewrite by hand (ADR-002).
3. **Count-gated confirmation (ADR-004).** If the CLI reports the shift needs confirmation (many
   siblings must move), surface the count and re-run with `--yes` once the user confirms. A handful
   proceeds automatically.
4. **Best-effort `## Stories` update.** The CLI updates the milestone `SPEC.md` `## Stories` checklist
   where it recognises the bullet form and honestly reports `skipped` otherwise (Tier 2, ADR-003). If
   it reports `skipped`, add the new story's bullet to `## Stories` by hand.
5. **Frame the prose into the scaffolded STORY.** Author `## User story` (a real "so that") into the
   new `STORY.md` — ask only what you can't infer. If `work.agents.productOwner == "agent"`, spawn
   `aof-product-owner`; else inline. No task features — `$aof-refine <ref>` authors them. Design the
   story **independent** of siblings.
</process>

<progress_tracking>
The story lands at `status: not-started` in `STORY.md`, occupying local position `P` under `NN`, and
appears as an unchecked box in the milestone `SPEC.md` `## Stories`. Its own `## Tasks` list tracks it.
</progress_tracking>

<output>
Report the path + position + user story, and confirm `aof work validate` is green after the re-index.
Next: `$aof-refine <NN>/<P>`.
</output>
