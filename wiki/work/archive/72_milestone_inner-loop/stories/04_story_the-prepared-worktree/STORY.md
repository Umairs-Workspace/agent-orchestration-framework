---
type: story
number: 04
slug: the-prepared-worktree
title: "The prepared worktree — dependencies arrive by install, never by link, and no worktree is deleted by filesystem call"
parent: 72
status: done
owner: product-owner
created: 2026-09-02
updated: 2026-09-03
depends: [72/00]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-007, src/work-toolchain.mjs, src/mesh-worker-execution.mjs, src/mesh-session-spawn-handler.mjs, src/work-dispatch.mjs, src/work-audit/spawn.mjs, test/arch/acd-observation-census-filtered.test.mjs, test/support/source-slice.mjs, wiki/work/TECH_DEBT.md]
files: [src/mesh-worktree.mjs, test/mesh-worktree-prepare.test.mjs, test/arch/acd-worktree-never-linked.test.mjs, scripts/test.mjs]
---
# 04 · The prepared worktree

## User story

As a worker node handing an agent a freshly materialised worktree,
I want that tree to already have its dependencies,
so that the agent does not spend its own tokens on `npm install` at the start of every assignment and
then have the result thrown away at the end of it.

A `git worktree` is materialised with no `node_modules`, nothing in the worker runtime installs them,
and `removeWorktree(…, { force: true })` (`src/mesh-worker-execution.mjs:1962`) discards the tree on
completion. The next story pays it again.

**The obvious fix is the forbidden one, and this repo has the scar.** TECH_DEBT item 36 records it
happening TWICE in four hours: a reviewing agent junctioned `node_modules` into a scratch worktree,
`git worktree remove --force` followed the junction, emptied the real `node_modules`, and the
`node_modules/@aof/ui` workspace junction carried the delete on into `ui/` — **113 tracked files gone,
plus uncommitted work across five stories, two of them already `done`.** The item's generalised rule:
*"the hazard is not `npm ci`. It is any recursive delete whose path crosses a junction into a
git-managed directory."* `package.json` still declares `workspaces: ["ui"]`, so the junction that
carried it is still there.

So: **dependencies arrive by INSTALL, never by LINK.** After `addWorktree` succeeds, aof runs the
project's declared `work.worktree.prepare` through 72/00's one bounded seam, inside the worktree. No
declaration means no step, silently — an absent optional declaration is not an error.

**Sharing happens outside the tree or not at all.** A package manager's content-addressable cache
lives outside every worktree by construction, so it is named in the prepare argv and nothing is linked
in. **aof creates no symlink or junction whose path lies inside a worktree, ever**, and removal stays
git-managed — `git worktree remove`, never a bare recursive `rm`. These are one hazard, not two: a link
nobody makes cannot be followed, and a delete that does not recurse cannot follow one.

**A failed prepare is LOUD.** A non-zero exit or a deadline expiry is reported as its own coded outcome
on the assignment. An agent handed a half-installed tree that reads as ready is the
guard-if-present-green species (TECH_DEBT 36c) in a new place.

**Nothing in `src/mesh-worker-execution.mjs` is edited.** It is the tree's largest module — 2,482
lines, 56 graph dependents, 30 imports — and TECH_DEBT item 83 already indicts it for exactly the
one-additive-field-at-a-time accretion this would otherwise continue. The work lands in
`src/mesh-worktree.mjs` (39 dependents, 2 imports — a high-fan-in near-leaf) or it does not land.

## Tasks

- [x] `tasks/00_a-worktree-is-prepared-through-the-declared-program.feature` — the declared prepare step runs inside the new worktree through the one bounded seam with a deadline; an absent declaration is a silent no-op; a non-zero exit or a deadline expiry is a loud coded outcome and the tree is not reported ready
- [x] `tasks/01_nothing-is-linked-into-a-worktree.feature` — no link is created whose path lies inside a worktree, the root is derived rather than matched as a literal, no recursive filesystem delete removes a worktree, and removal goes through git

## Notes

- **`reads:` names `src/work-toolchain.mjs`, which does not exist until 72/00 lands.** `aof work
  validate` reports a transient `story reads path … does not exist` until then; 63/05's precedent, and
  it clears when 72/00 lands rather than by editing the declaration.
- `src/mesh-worker-execution.mjs` is in `reads:` and NOT in `files:` — deliberately. It is read to
  confirm the completion path, and edited by nobody in this milestone.
- **FF-7207 is GREEN ON ARRIVAL** over the current tree — a ratchet, not a fix. Its red probe is
  therefore a PLANTED link-creating call under `src/`, not a repaired defect, exactly as
  `63/ADR-015 §2`'s ratchets are probed.
- **One choke point, not four call sites.** Three of the four doors already share the private
  `runWorktreeAdd` (`:500`), and `reuseWorktreeOnBranch`'s two argv forms are **identical** to it
  (`:583` == `:512` checkout form, `:584` == `:510` branch form); the only delta is a thrown code
  (`worktree-reuse-failed` vs `worktree-add-failed`) that nothing in `src/`, `test/` or `ui/`
  references. Thread `fault.code ?? "worktree-add-failed"` and both survive. Route the prepare step
  through that one point, so a fifth door inherits it rather than forgetting it.
- **The three shipped `isUnder…Root` predicates return `true` for the ROOT ITSELF** — `:440-442`
  compares `path.resolve(root) + path.sep` against the same for the candidate, and for the root the
  two strings are equal. So export a **new composed classifier**
  (`under(root, p) && resolve(p) !== resolve(root)`) and leave all three shipped predicates
  byte-unchanged: they have 8 `src/` callers plus an arch control pinning the import shape
  (`test/arch/acd-observation-census-filtered.test.mjs:113`). **Classify the delete census by
  derivation from the keyed seam, not by resolving paths** — `src/mesh-worker-execution.mjs:635`
  recursively deletes a path strictly under the worktrees root, and a path-resolving census reds on
  shipped correct code in a file this story may not edit.
- **A failed prepare must remove the tree it created before it throws.** `src/mesh-session-spawn-handler.mjs:149`
  and `src/work-dispatch.mjs:212` both swallow a post-`add` throw when `existsSync(worktreePath)` — the
  deliberate lost-the-race reader — so a throw after `git worktree add` would hand back a
  half-installed tree reported as READY, in two files this story cannot edit. `git worktree remove
  --force` then throw; the module already owns that verb (`:719-728`). That trades away the
  retain-for-inspection artifact, so the prepare's stdout/stderr must ride the thrown message.
- **"The result reports" is an INJECTED OBSERVER on `options`, not a widened return.** All four doors
  return a bare path string and three callers outside `files:` consume it as one. Use the module's
  existing `options.exec` idiom; `runBounded`'s frozen envelope already carries `deadlineMs: bound`.
- **The reuse door destroys the previous install.** `reuseWorktreeOnBranch:579-581` force-removes any
  worktree holding the branch before adding, so a continue pays the full install again — the door
  reuses the BRANCH, never the install. Recorded so the trade is priced at its real frequency.
- Two census traps: match `/\blink\s*\(/` with the **word boundary** or `unlink(` and
  `isSymbolicLink()` red across seven `src/` sites; and `src/config-inspect.mjs:1406,1409` hold
  `symlink` inside string literals that survive comment-stripping, so match the call form. Use
  `stripComments` from `test/support/source-slice.mjs` — 62 arch files already do.
- Residue, recorded not fixed: the session and dispatch handlers' first two doors return an existing
  tree without touching any door, so a tree materialised BEFORE this story ships is never prepared and
  still reads as ready. Going forward the ladder is closed; the exposure is pre-existing trees plus a
  genuine TOCTOU where the race loser gets the winner's still-preparing tree.
