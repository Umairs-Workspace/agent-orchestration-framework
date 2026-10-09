---
name: "aof-add-spike"
description: "Capture a spike — a top-level de-risk driver scaffolded on the project's intake as spike_slug/SPIKE.md. Groups no stories, carries no .feature; its deliverable is a recorded finding. Numbered by aof work promote, resolved later by aof:verify."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <the unknown / risk to de-risk> [in <group/path>] [timebox 1d|2d|…] [depends NN[,NN…]] [--in-stream]

Use the native skill $aof-add-spike; $ARGUMENTS is the operator text after its name.

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
Frame a **spike**: a self-contained `spike_<slug>/SPIKE.md` folder, born un-numbered on the project's
intake and given its number by one verb, `aof work promote`. A spike is a top-level DRIVER
(the `uat` shape, ADR-001) — it delivers no new behaviour and groups no stories; it exists to resolve
one unknown *before* a dependent milestone can be committed. It gates the stream: downstream work that
`depends:` on it waits until it is `done`. Don't confuse it with `$aof-refine`'s in-milestone researcher
(a question scoped inside one milestone) — a spike is worth its own roadmap slot.
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.agents`, `work.intake`. An ABSENT `work.intake` reads
as `"stream"`; only the exact string `"backlog"` selects the backlog. Resolve refs with
`aof work find` / `aof work next --json` — never hand-glob `**/*.md`.
</config>

<process>
For: "$ARGUMENTS"
1. **The folder — the backlog, under either setting.** `--in-stream` may appear anywhere in the
   arguments and is removed from them before the slug and title are derived; it decides only step 4.
   Slug = kebab (e.g. `de-risk-mesh-routing`). An
   optional group comes from the arguments (`in <group/path>`) and is a PATH and nothing more. The
   folder is `<work.dir>/backlog/[<group>/]spike_<slug>/`: that is where a new spike is written
   whichever way `work.intake` is set. Do NOT work out a stream number — deciding one is
   `aof work promote`'s job (41/ADR-002).
2. **Scope (`depends:`).** A spike is usually a *dependency*, not a dependent — leave `depends: []`
   unless the spike itself needs a prior milestone/spike/chore resolved first. If given explicitly
   (`depends NN,NN`), write those entries AS GIVEN — they are a planning note until promotion, which
   is where they are VALIDATED (a numeric ref must resolve; an entry naming another backlog slug is
   refused, so promote that one first or drop the entry).
3. **Scaffold** (template: `.aof/templates/work/spike/SPIKE.md`): frontmatter (`type: spike`, a bare
   `number:` with NO value, `slug`, `title`, `status: not-started`, `owner`, `created`/`updated`:
   today, `depends: [...]`, `timebox`: the given box or a sensible default); the heading is
   `# <Title>` with no number prefix; `## Question` (the unknown, framed as a real question);
   `## Timebox` (the box + stop condition); `## Investigation` (empty — filled as the spike runs);
   `## Finding` (empty — the deliverable); `## Outcome / Next` (empty — what it unblocks).
4. **Then the intake decides whether it stays there — unless `--in-stream` was given.** With
   `--in-stream`, run `aof work promote <slug> --json` straight after the scaffold, whatever
   `work.intake` says, and report the minted ref. That promote names no position, so the spike
   lands at the tail. Without the switch, under `work.intake: "backlog"` it STAYS:
   `$aof-promote <slug>` is what later schedules it, and the only way to name a position. Under
   `"stream"` (or an absent key) run `aof work promote <slug> --json` immediately and report the
   minted ref — appended at the tail, as `add-spike` has always landed it. A promote refusal after
   `--in-stream` (`promote-depends-backlog`, say) is reported as a stop, and the spike stays where
   it was scaffolded, in the backlog: never reach around the refusal by editing the tree.
5. Ask only the framing questions you can't infer (the question itself, the timebox).
6. **Frame ONLY** — no investigation started, no finding recorded (that's the spike running, then
   `$aof-verify`). No `tasks/`, no `.feature` — a spike carries no behavioural contract.
</process>

<progress_tracking>
The spike starts at `status: not-started` in `SPIKE.md` frontmatter. Running it (the investigation,
recording `## Finding`) and flipping it to `done` — which unblocks anything that `depends:` on it — is
`$aof-verify <NN>`: confirms `## Finding` is filled and the unknown is resolved. No scenario run, no
"tests green" — the investigation code is throwaway.
</progress_tracking>

<output>
Report the path + the question this spike answers, and — when `depends` was given — that the entries
are validated at promotion. Under `"backlog"` without the switch: next is `$aof-promote <slug>`. With
`--in-stream`, or under `"stream"`: report the minted ref. Then run the investigation, record the finding, and `$aof-verify <NN>`.
</output>
