---
name: "aof-recent"
description: "Scan the work stream chronologically — recent items to catch up on delivery, or filter by type / status / milestone."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: [N] [--type milestone|story|task] [--status X] [--milestone NN]

Use the native skill $aof-recent; $ARGUMENTS is the operator text after its name.

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
Catch up on the stream: the most recent items, or a filtered/grouped view. Read-only.
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`.
</config>

<process>
1. Enumerate through the listing, never a folder walk of your own: run `aof work list --json` (add
   `--all` only when the operator asks for the archive). Each row carries `ref`, `type`, `slug`,
   `status`, `title`, `parent`, `dir`; a backlog row also carries `number: null` and its `backlog`
   group, an archived row `archived: true`. Read a record doc's `updated` from the row's `dir` only
   when you need it. Descend into a milestone's stories (rows whose `parent` is its ref) and a
   story's `tasks/` only when a `--milestone` or `--type` filter asks for the deeper level.
2. **Default** (no args): the last **N** items (N = 10) by `ref` (creation order) — the
   catch-up-on-recent-delivery view. Columns: `NN` · type · title · status · updated.
3. **Filters / sorts:** a bare number → N; `--type milestone|story|task`; `--status <status>`;
   `--milestone NN` → that milestone's stories; sort by `updated` desc for recently *worked-on*
   (vs recently *created*).
</process>

<output>
A compact table. Modify nothing.
</output>
