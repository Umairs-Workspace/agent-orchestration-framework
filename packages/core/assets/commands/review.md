---
description: Review the operator's own build of a story — run its tests, walk continue's gate ladder and review lanes over the change, and hand every finding back. Builds nothing and fixes nothing; a clean review moves the story to in-review for aof:verify.
argument-hint: "<story or task ref> [--solo | --orchestrated]"
allowed-tools: [Read, Grep, Glob, Bash, Task]
---
<objective>
The operator built this story by hand — usually after `aof:continue <ref> --manual` handed them a
guide. Review that build exactly as an agent's build is reviewed, and hand every finding back to the
operator, who fixes it. Build nothing, fix nothing, and edit none of the operator's code: a clean
review moves the story to `in-review`, ready for `aof:verify <ref>`.
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.agents`. Resolve `$ARGUMENTS`'s ref with
`aof work find "<ref>" --json`; an empty answer is a stop.

**It accepts a story or a task, and refuses a milestone, a span, a uat session, a spike or a
chore** — name the ref and its type, mint nothing, and stop. A milestone's stories are reviewed one
at a time, by their own refs.

**Execution mode.** As continue resolves it: `work.agents.mode` governs, **an unset
`work.agents.mode` resolves to solo**, and `--solo` or `--orchestrated` overrides it for the run;
the two together are contradictory, so STOP before any role runs. Orchestrated spawns the
review lenses; solo performs each lens in this session, in turn.
</config>

<where>
**The gate ladder and the review lanes have one home, and it is not this file.** The gate ladder is
the `<gate_ladder>` region, and the review lanes are the story lane's review step and its
`<review_rounds>` region, of the `continue` command beside it. That command is rendered at
`.claude/commands/aof/continue.md`, `.opencode/commands/aof/continue.md` and
`.codex/skills/aof-continue/SKILL.md`. Read the one your runtime installed, and walk those regions
as written. This file holds only what differs from them.
</where>

<process>
1. **Mint the run before anything else** — `aof work run-start <ref> --json`, exactly as continue's
   story lane does at its step 2. A `duplicate-run` refusal means a run on this story is still open
   from a phase that died; the mint reclaims a stale one.
2. **Run the story's tests first** — `aof test --scope impacted --story <ref>`. **A red scenario
   stops the review before the gate ladder**: name every red scenario, spawn no reviewer, and do not
   move the status. Close the run with `aof work run-complete <ref> --outcome done` and hand back:
   the build is not finished, and judging an unfinished build pays a reviewer to rediscover what the
   test run already said. **Every run this command closes, closes `done`** — the review did its job
   whatever it found, and a `failed` outcome would roll the operator's story back to `not-started`.
3. **Name the change under review.** It is the diff against the merge-base with the default branch,
   uncommitted changes included — `git diff $(git merge-base HEAD <default branch>)` plus the
   untracked files `git status --short` lists. **A changed path outside the story's `files:` is
   reported as a contract gap**, a finding in its own right: the declaration is what the wave
   planner and the impacted test run trusted.
4. **Walk the gate ladder** — continue's `<gate_ladder>`, scoped to this ref. A red rung is its own
   outcome, exactly as there: name the rung and its findings, spawn no reviewer, and close the run
   as in step 2.
5. **Rank the review by blast radius, before the architect lens.** Run `aof graph build .` (the
   project root, NO `--backend` — the code-only build; never a package or `src` subtree, whose build
   evicts every file outside it), and read back its `builtAt`, `egress` and counts so freshness is
   visible. Then run `aof graph impact <the changed files>`. Rank the changed files by their
   dependents — `imported/called by ←`, the exact edge-derived answer — and hand the architect lens
   the most-depended-on first. The lens READS the impact as ranking context and judges for itself.
   **The ranking is advisory and never a gate.** Advisory only: it is never an auto-block input to
   the verdict. A file reported `present: false` is ranked UNKNOWN, never zero. A
   `graphify-missing`, `graphify-build-failed` or `graphify-no-persist` answer means the review runs
   unranked, with no block; a build reporting `unchanged: true` is a current graph, so rank with it.
6. **Run the review lanes** — continue's review step and its `<review_rounds>` region, over the
   change named in step 3, with these differences and no others:
   - **`aof-developer` is never spawned, and no review lens applies a fix.** A lens reports; the
     operator fixes.
   - **Each run is one review round, and the next round is the operator's re-run after a fix.** The
     round counting, the delta re-review and the stall detection all apply across those re-runs,
     not inside one.
   - **Every finding goes to the operator** — none is routed to a fix at the close.
7. **Hand back.**
   - **No Blocker** — `aof work status <ref> in-review`, then
     `aof work run-complete <ref> --outcome done`. Report the Important findings and Nits for the
     operator to take or leave. Next: `aof:verify <ref>`.
   - **A Blocker** — the story is left `in-progress`, and the run is closed with
     `aof work run-complete <ref> --outcome done`. Report each finding with its file and line, its
     lens and its severity. Next: the operator's fix, then `aof:review <ref>` again.
   - **A task ref** carries no status line of its own — it is a `.feature`, not a record doc — so
     no status is moved for it: report the verdict, and the story it belongs to moves to
     `in-review` when `aof:review <story>` reviews it whole.
</process>

<output>
Report the test run's summary line and the scope it ran as, the ladder's answer, the blast-radius
ranking (or that the review ran unranked, and why), and each lens's verdict with its findings — file
and line, lens, severity. Say plainly that no code was changed. Then name the outcome:

- **reviewed: `<ref>` is in-review** — no Blocker. Next: `aof:verify <ref>`.
- **stopped: `<ref>` has Blockers** — the operator fixes them. Next: `aof:review <ref>` again.
- **stopped: `<ref>` is red** — scenarios red, or a gate rung red; no reviewer was spawned. Next: the
  operator's build, then `aof:review <ref>`.
</output>
