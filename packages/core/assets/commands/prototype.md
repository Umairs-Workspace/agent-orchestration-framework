---
description: Build something fast — start a prototype from an ask, build it in this session on the current branch, fold in new asks, and stop with a hand-off. No refine, no review, no accept door; the asks and shortcuts stay on record in wiki/work.
argument-hint: "\"<what to build>\" | <ref> [\"<new ask>\"] | <ref> --stop|--done|--abandon"
allowed-tools: [Read, Grep, Glob, Bash, Write, Edit]
---
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
`aof:prototype <ref>` to continue, or `aof:prototype <ref> "<new ask>"` to add a want.
</output>
