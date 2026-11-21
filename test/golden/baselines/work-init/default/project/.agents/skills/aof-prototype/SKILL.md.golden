---
name: "aof-prototype"
description: "Build something fast — start a prototype from an ask, build it in this session on the current branch, fold in new asks, and stop with a hand-off. No refine, no review, no accept door; the asks and shortcuts stay on record in wiki/work."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: \"<what to build>\" | <ref> [\"<new ask>\"] | <ref> --stop|--done|--abandon

Use the native skill $aof-prototype; $ARGUMENTS is the operator text after its name.

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
Build a **prototype**: something working, fast, inside the work tree, with its asks and shortcuts on
record. A prototype is a top-level work item (`NN_prototype_<slug>/`, two files: `PROTOTYPE.md` and
`STATE.md`) that nothing depends on and the loop never schedules. It carries no stories, no `.feature`
and no acceptance criteria — its wants can change at any time, and that is normal.

**You build it yourself, in this session, on the current branch.** Spawn no agent, make no branch and
no worktree, run no review lane and make no commit — committing is the operator's. This is what makes
a prototype fast: none of the governed loop's machinery runs.

`aof work prototype` does the mechanical half of every move — the number, the dates, the status and
the Log lines. You write the prose: the hand-off, the shortcuts, and any rewording of a want.
</objective>

<config>
Resolve refs with `aof work find` — never hand-glob `**/*.md`. The prototype's folder is the `dir` of
its row.
</config>

<process>
For: "$ARGUMENTS"

1. **Which move.** All digits, or the slug of an existing prototype, is a **ref**; anything else is
   the **ask**.
   - **Start** — the arguments are an ask. Run `aof work prototype "<ask>" --json` (add
     `--slug <slug>` only if the operator named one). It scaffolds the folder through the one number
     mint, writes the ask into `## Intent` and as the first dated `## Wants` line, and logs `started`.
   - **Continue or add** — `<ref>` with or without a new ask. Run
     `aof work prototype <ref> ["<new ask>"] --json`. A new ask is appended to `## Wants` and logged;
     a `paused`, `done` or `abandoned` prototype is reopened to `active` and logged `reopened`.
   - **Stop or complete** — `<ref> --stop`, `--done` or `--abandon`: see step 5.

   A refusal is a stop: report its code and message and do not reach around it by editing the tree.

2. **Read before building.** Read `PROTOTYPE.md` (Intent, Wants, Shortcuts) and `STATE.md`'s
   `## Hand-off`. On a continue, the hand-off is where the last session stopped; if it still holds the
   template placeholder (a session ended without `--stop`), rebuild it from the `## Log` and the code
   before you go on.

3. **Check the branch, once.** Run `git branch --show-current` (read-only). If it is `main`, say once
   that the checkout is on `main` and the work should be committed to a branch — then build anyway.
   Make no branch yourself.

4. **Build — in this session.** Make the wants work, fastest path first. As you go:
   - keep `## Shortcuts` in `PROTOTYPE.md` current: every corner cut, every faked part, every
     hard-coded value a governed build would have to pay back;
   - log as you go with `aof work prototype <ref> --log "<one line>"` — what worked, what changed,
     a decision. One dated line each; the verb writes nothing else;
   - a want that changes or is dropped is edited in `## Wants` by you, **struck through, never
     deleted** (`- ~~2026-10-23 · PDF export~~ dropped: CSV is enough`), and logged with `--log`.
   Write no time of day and no duration anywhere.

5. **Stop with a hand-off.** Before ending the session, replace `STATE.md`'s `## Hand-off` with the
   latest checkpoint: what works, where it stopped, what is next. Then run
   `aof work prototype <ref> --stop` (pause), `--done` (good enough) or `--abandon`. The verb refuses
   with `prototype-handoff-missing` while the placeholder is still there, and on success quotes your
   hand-off into `## Log`, so every checkpoint stays on record. The next session replaces the
   hand-off; the Log keeps them all.
</process>

<progress_tracking>
A prototype's status is one of `active`, `paused`, `done` and `abandoned`, and only `aof work
prototype` (or `aof work status`) moves it — never hand-edit a `status:` line. `active ⇄ paused →
done | abandoned`, and either end reopens to `active` on the next continue. No run is minted and no
review or acceptance follows: `done` is the operator's "good enough".
</progress_tracking>

<output>
Say which move ran and the prototype's ref and status, what was built this session, the shortcuts
added, and the hand-off you wrote. Name what is uncommitted — committing is the operator's. Next:
`$aof-prototype <ref>` to continue, or `$aof-prototype <ref> "<new ask>"` to add a want.
</output>
