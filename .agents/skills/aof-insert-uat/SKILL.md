---
name: "aof-insert-uat"
description: "Insert a UAT session at a target position — scaffold NN_uat_slug at --at P and re-index every item ≥ P up by one, keeping the stream valid. The placement twin of add-uat."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <short session description> at <position P> [accepting NN[,NN…]]

Use the native skill $aof-insert-uat; $ARGUMENTS is the operator text after its name.

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
Frame a **UAT session** at a **specific position** `P` in the stream — not appended at the tail. The
placement twin of `$aof-add-uat`, and since milestone 127 exactly what its name says: a scaffold into
the backlog, PROMOTED AT `P`. It writes the SAME self-contained `uat_<slug>/` folder (SESSION + STATE)
that `depends:` on the milestones it accepts, then hands it to `aof work promote --at P` — the one verb
that mints a number — which slots it at `P` and re-indexes every pre-existing item that was `≥ P` up by
exactly one. A uat session is an acceptance **gate** — it
delivers no new behaviour and groups no stories. Don't confuse it with the `@uat` *tag*.
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.agents`. Resolve refs with `aof work find` /
`aof work next --json` — never hand-glob `**/*.md`.
</config>

<process>
For: "$ARGUMENTS"
1. **Resolve slug + position + scope.** Slug = kebab. Target position `P` = the `at <P>` the caller
   gave. The accepted milestones (`--depends`) are either given explicitly (`accepting 01,02,03`) or
   default to the delivered span below `P`; each must resolve to a real milestone.
2. **Placement + re-index is MECHANICAL — the CLI, never hand-edited.** Run
   `aof work insert-uat "<slug>" --at <P> [--depends <a,b,…>] --json`. This scaffolds from
   `.aof/templates/work/uat/` (the SAME templates `add-uat` uses) with the resolved `depends:`, AND
   renumbers every item `≥ P` up by one, rewriting `depends`/`parent`/frontmatter so nothing dangles —
   leaving `aof work validate` green. The `--json` envelope echoes the created identity + resolved
   `depends` (ADR-006). **Never** renumber or rewrite by hand (ADR-002).
3. **Count-gated confirmation (ADR-004).** If the CLI reports the shift needs confirmation (many items
   must move), surface the count and re-run with `--yes` once the user confirms. A handful proceeds
   automatically.
4. **Frame the prose into the scaffolded SESSION.** Author `## Scope` (the accepted milestones —
   referenced, never restated), `## Plan`, and the remaining sections into the new `SESSION.md` — ask
   only the framing questions you can't infer. **Frame ONLY** — no checks executed, no findings, no
   sign-off (that's `$aof-verify`).
</process>

<progress_tracking>
The session lands at `status: not-started` in `SESSION.md`, occupying position `P`. Running it and
flipping it to `done` — which unblocks anything that `depends:` on it — is `$aof-verify <P>`.
</progress_tracking>

<output>
Report the path + position + the milestones it accepts, and confirm `aof work validate` is green after
the re-index. Next: `$aof-verify <P>` to run the session and record acceptance.
</output>
