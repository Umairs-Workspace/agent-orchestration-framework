# 129/03 · The lane commits and merges home — Outcome

## Delivered

### `commitWorktreeChanges` lives in `src/mesh/worktree.mjs` and is scoped by `paths`
The verb is defined once, beside its sibling git verbs, and re-exported from `src/mesh/worker-execution.mjs` (absent definition, present re-export); its runner is `options.exec`, else `options.pushExec`, else the module's default with a five-minute budget; a non-empty `paths` makes the stage, the staged check and the commit all pathspec-scoped (`git add -- <paths>`, `diff --cached -- <paths>`, `commit --no-verify -m … -- <paths>`), with the `.aof` reset owed only when the scope can reach `.aof` and then `:(exclude).aof` on the commit; absent, `-A`, the reset and the unscoped commit exactly as before. The worker's two call sites are unchanged lines.

### `resolveRefInWorktree` and `worktreeWorkDir` live in `src/work/dispatch.mjs`
Both are defined in the lane's home and `resolveRefInWorktree` is re-exported from `worker-execution.mjs`; the resolver enumerates-then-filters through `findWork` and answers `null` for any traversal-shaped ref without constructing a path. `src/mesh/worktree.mjs` still carries only its pre-existing `loadWorkspace` import from `work.mjs`; the assignment sink's static closure is pinned at 73 and the driver's reach at 24.

### `advanceBranchToBase` answers a `dirtyPolicy`
`"strict"` (the default) is byte-identical to the mesh's door 2 — a non-empty `status --porcelain` refuses with no `files` key. `"touched-paths"` refuses only when the union of every staged index entry (a rename contributing both paths) and the worktree-side/untracked paths intersected with `git diff --name-only --no-renames HEAD...<commit>` is non-empty, returning `assignment-gate-propagation-dirty-worktree` with `files` sorted and deduplicated, read from `--untracked-files=all` under `core.quotePath=false`; the tree is untouched on every refusal. Door 1 (`already-current`) is decided before any dirt check; a conflict is still aborted and refused; an unknown policy is a thrown `gate-propagation-bad-option` before any git verb runs. The literal set is exactly `["strict", "touched-paths"]`.

### `src/work/dispatch.mjs` composes `dispatchLaneBase`, `commitDispatchLane` and `mergeDispatchLaneHome`
`dispatchLaneBase(lanePath, { primaryRoot, exec })` answers the merge-base of the lane's HEAD and the primary's HEAD (the main checkout's line only when no `primaryRoot` is given); `commitDispatchLane(lanePath, { message, node, exec })` answers `{ committed, tip }`; `mergeDispatchLaneHome(primaryRoot, ref, { milestoneDir, message, node, exec })` refuses a detached primary before any write, commits the loop's own writes scoped to `milestoneDir` under the mesh identity, then runs the one verb from the primary at the lane's tip under `touched-paths` — every answer carries `ref`, `branch`, `base`, `tip` and `commit`, with outcomes `already-current` / `fast-forwarded` / `merged` / `refused` (`lane-merge-refused`, `reason: "detached-head" | "branch-missing"` or `files`) / `conflict` (`lane-merge-conflict`, aborted, the lane and its branch intact). The module spells no git `merge`, `rebase`, `reset` or `--force` of its own and imports no `child_process`.

### A lane opened on an existing line is advanced to the primary's HEAD first
`resolveDispatchLane(projectRoot, ref, { advanceTo })` runs `advanceBranchToBase(lane, advanceTo)` (strict) on every door whenever a sha is given and carries the outcome as `advanced`; any refusal is `{ outcome: "refused", code: "lane-open-failed", cause: <the verb's code> }`; an `advanceTo` that is not a hex object name is a thrown `dispatch-lane-advance-not-a-sha` before any door opens; without `advanceTo` the answer carries no `advanced` key.

### `STATE.md` merges by union, and only `STATE.md`
`.gitattributes` carries exactly one `merge=` line, `wiki/work/**/STATE.md merge=union`, matched by git's own matcher for every `STATE.md` under the work directory and for nothing beside it; the line names neither `text` nor `eol`.

### One porcelain parser, one exec seam, one mesh identity
`parsePorcelainStatus`, `resolveExec` / `defaultGitExec` (which forwards `env`) and `meshIdentityArgs` are exported from `src/mesh/worktree.mjs` and are the only spellings; `laneChanges` reads through the parser.

## Assumptions

- **The caller resolves `advanceTo` in the primary** — the guard admits any 7–64-digit hex string; a sha that exists only on the lane's line is not distinguished from one the primary's HEAD names.
- **The primary's branch is what the operator ships** — `mergeDispatchLaneHome` lands commits on whatever branch `symbolic-ref HEAD` answers in `primaryRoot`; it never checks the branch's name.
- **A lane is nobody's desk** — the reopen advance runs strict, so a lane carrying uncommitted work cannot be reopened until it is committed or cleaned.
- **`STATE.md`'s frontmatter stays `doc: state` alone** — the union driver duplicates any line both lanes change identically only when git cannot see it as one hunk; an `updated:` stamp would be the first such line.

## Gaps

### A caller of the three composed verbs
- **Status:** open
- **Discharge condition:** `129/04`'s wave tick calls `commitDispatchLane` after each lane's drive settles, `mergeDispatchLaneHome` serially in lane-completion order, `resolveDispatchLane` with `advanceTo: <primary HEAD>` on every open, and maps a THROWN `commit-failed` / `gate-propagation-failed` / `gate-propagation-base-unresolved` / `dispatch-lane-advance-not-a-sha` to a halt beside the returned `lane-merge-refused` / `lane-merge-conflict` / `lane-open-failed`.
No `src/` path calls `dispatchLaneBase`, `commitDispatchLane` or `mergeDispatchLaneHome`, and no `src/` path passes `advanceTo`; the loop's REFINE-end commit through `commitWorktreeChanges({ paths })` has no caller either.

### The never-discards sweep over `dispatch.mjs`
- **Status:** open
- **Discharge condition:** `129/05` extends FF-12904's `BRANCH_PATH_MODULES` with `src/work/dispatch.mjs` (and the wave/cycle modules), arms the `--abort`-beside-every-`merge` leg for it, and pins `dirtyPolicy`'s literal set.
The invariant holds today by inspection and by the module's own absence of any git `merge` verb, not by a register control.

### The lane fixture's one home
- **Status:** open
- **Discharge condition:** `129/04` folds `withMoveFixture` / `withDirtyPolicyFixture` and the `writeRel` / `mergeHeadAbsent` / `conflictMarkers` helpers onto `test/support/dispatch-lane-fixture.mjs` when its own fixtures land under `test/support/`.
Three suites carry their own copies of the same scaffold.
