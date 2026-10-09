---
name: "aof-insert-chore"
description: "Insert a chore at a target position — scaffold NN_chore_slug at --at P and re-index every item ≥ P up by one, keeping the stream valid. The placement twin of add-chore."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <the housekeeping to do> at <position P> [depends NN[,NN…]]

Use the native skill $aof-insert-chore; $ARGUMENTS is the operator text after its name.

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
Frame a **chore** at a **specific position** `P` in the stream — not appended at the tail. The
placement twin of `$aof-add-chore`, and since milestone 127 exactly what its name says: a scaffold into
the backlog, PROMOTED AT `P`. It writes the SAME self-contained `chore_<slug>/CHORE.md`
`add-chore` writes, then hands it to `aof work promote --at P` — the one verb that mints a number —
which slots it at `P` and re-indexes every pre-existing item that was `≥ P` up by exactly one. A chore is a
top-level DRIVER that delivers no new behaviour and groups no stories; it exists to sequence
housekeeping *before* whatever depends on it. Use when the housekeeping belongs *beside* related items
in the roadmap, not after everything added later.
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.agents`. Resolve refs with `aof work find` /
`aof work next --json` — never hand-glob `**/*.md`.
</config>

<process>
For: "$ARGUMENTS"
1. **Resolve slug + position + scope.** Slug = kebab from the housekeeping description. Target position
   `P` = the `at <P>` the caller gave. Leave `depends: []` unless given explicitly (`depends NN,NN`);
   each must resolve to a real driver.
2. **Placement + re-index is MECHANICAL — the CLI, never hand-edited.** Run
   `aof work insert-chore "<slug>" --at <P> --json`. This scaffolds from
   `.aof/templates/work/chore/` (the SAME template `add-chore` uses) AND renumbers every item `≥ P` up
   by one, rewriting `depends`/`parent`/frontmatter so nothing dangles — leaving `aof work validate`
   green. **Never** renumber or rewrite by hand (ADR-002).
3. **Count-gated confirmation (ADR-004).** If the CLI reports the shift needs confirmation (many items
   must move), surface the count and re-run with `--yes` once the user confirms. A handful proceeds
   automatically.
4. **Frame the prose into the scaffolded CHORE.** Author `## Intent` (what housekeeping + why) and
   `## Definition of Done` (a checkbox list — always include `aof work validate` green) into the new
   `CHORE.md` — ask only what you can't infer. **Frame ONLY** — no boxes ticked yet, no `tasks/`, no
   `.feature` (a chore carries no behavioural contract).
</process>

<progress_tracking>
The chore lands at `status: not-started` in `CHORE.md`, occupying position `P`. Doing the work
(ticking `## Definition of Done`) and flipping it to `done` — which unblocks anything that `depends:`
on it — is `$aof-verify <P>`.
</progress_tracking>

<output>
Report the path + position + the intent, and confirm `aof work validate` is green after the re-index.
Next: do the housekeeping, tick the checklist, then `$aof-verify <P>`.
</output>
