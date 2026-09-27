# 04 · The prepared worktree — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### A worktree is prepared through the project's declared program, at the one choke point every door funnels through
`src/mesh-worktree.mjs` runs the compiled `work.worktree.prepare` step inside the tree each materialisation door returns — `addWorktree`, `reuseWorktreeOnBranch` (the dominant continuing-item path, now routed through the private `runWorktreeAdd` with its two thrown codes and messages byte-unchanged), `addSessionWorktree` and `addDispatchWorktree` — through `runBounded`, with the declaration's own deadline armed.

### An absent declaration is a silent no-op; a malformed one is a compile-time refusal
No `work.worktree.prepare` means no step, no error and no warning. A present declaration naming no command, with a non-list `args`, a non-positive `deadlineMs` or a command resolving nowhere is `worktree-prepare-declaration-invalid` or `worktree-prepare-unresolvable`, raised by `src/work-toolchain.mjs` before any door runs and told apart from absence.

### A failed prepare is loud, coded, and leaves no half-installed tree behind
A non-zero exit, a deadline expiry and a failure to start are `worktree-prepare-failed`, `worktree-prepare-deadline-expired` and `worktree-prepare-not-started`; on any of them the module `git worktree remove --force`s the tree it just created and throws, with the prepare's stdout and stderr riding the thrown message. A teardown that itself fails is reported on the module's degrade channel, never swallowed.

### The prepare outcome is observed, not returned
Every door still returns a bare path string; the outcome surfaces through the module's existing `options` observer idiom, and the compiled declaration can be injected as `options.prepare`.

### aof creates no link into a worktree and deletes no worktree by filesystem call
FF-7207 censuses every `src/` module for `symlink`, `symlinkSync`, `link`, `linkSync`, `mklink` and `New-Item -ItemType Junction` whose path or target reaches a worktree, and for `rm`, `rmSync` and `rimraf` with recursion over a path derived from the worktree seam. `src/mesh-worktree.mjs` reaches no filesystem delete at all, and removal is `git worktree remove`, forced or not.

### A worktree is recognised by derivation, over all three roots
`isInsideMeshWorktree(projectRoot, path)` composes the three shipped `isUnder…Root` predicates with `resolve(path) !== resolve(root)`, so a keyed child under the assignment, session or dispatch root is inside, and the bare root, a lookalike sibling and a foreign project's tree are not. The three shipped predicates are byte-unchanged.

## Assumptions

- **`src/work-toolchain.mjs` is reached by dynamic import** — a static edge would take `acd-session-driver-mesh-blind`'s exact assignment-sink reach from 68 to 70 and put a bounded-spawn seam into the 39 closures that import this module for its path seam; the compiler is loaded on the prepare path alone.
- **`loadWorkspace` answers `{ config: {} }` for a config that does not parse** — a malformed `.aof/aof.config.json` therefore reads as absent and silently disables the prepare step; chore `m94` owns the remedy (`m72/F-72-AP`).
- **One install per ASSIGNMENT on the dominant path** — `reuseWorktreeOnBranch` force-removes the previous tree holding the branch before it adds, so a continue pays the full install again; the agent's token cost falls to zero and the worker's wall-clock does not amortise.
- **The delete census classifies by derivation, not by resolving paths** — `src/mesh-worker-execution.mjs:635`'s recursive delete of an askpass directory under the worktrees root stays admitted, and a path literal read from source text is unescaped before it is classified.

## Gaps

### This repository declares no `work.worktree.prepare`
- **Status:** open
- **Discharge condition:** chore `m90` lands a prepare script under `scripts/` and declares the key in `.aof/aof.config.json`.
The prepare step ships, is driven over every declaration shape and every outcome against a stub seam, and runs on no local dispatch here: this node's config carries no declaration, so absence takes the silent-no-op path. Recorded as `m72/F-72-AI`.

### Trees materialised before this story, and the race loser's tree
- **Status:** open
- **Discharge condition:** the existing-tree doors in `src/mesh-session-spawn-handler.mjs` and `src/work-dispatch.mjs` learn whether a tree was prepared, or the prepare writes a marker the doors read.
The session and dispatch handlers' first two doors return an existing tree without touching any materialisation door, so a tree created before this story is never prepared and still reads as ready, and the loser of a concurrent add receives the winner's still-preparing tree. Going forward the ladder is closed. Recorded as `m72/F-72-AQ`.
