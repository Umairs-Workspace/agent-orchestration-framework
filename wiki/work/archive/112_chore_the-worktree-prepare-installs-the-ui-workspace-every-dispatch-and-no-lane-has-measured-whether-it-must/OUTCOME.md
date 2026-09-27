# 112 · The worktree prepare installs the ui workspace every dispatch — Outcome

## Delivered

### The prepare step's install breadth is a measured ruling rather than an unexamined default
`scripts/prepare-worktree.mjs` runs an unnarrowed `npm ci`, and its header carries the three-arm
measurement that says why: cache-warm medians of 15.0s (shipped), 3.4s (`--workspaces=false
--include-workspace-root`) and 15.0s (`--omit=dev`), all taken in the same detached worktree with
`node_modules` cleared between alternating runs.

### The `ui` workspace is priced, and the reason its 77% is not banked is recorded beside the price
The workspace is 11.5s of the 15.0s install, and both narrowings that would drop it red the suite
every lane runs: `--workspaces=false` reds `test/terminal-harness-drives-a-grid.test.mjs` with
`Could not resolve "clsx"` (`ui/src/lib/utils.ts:1`) because the root suite esbuild-bundles real
`ui/src` components through `test/support/react-app-harness.mjs`, and `--omit=dev` saves nothing
measurable while removing the root's own `esbuild` and `ajv`.

### A lane that touches `ui/` has a stated answer, and it is "nothing special"
The workspace the lane needs is already installed by the shipped step, so no lane carries a
conditional install, and the header states that narrowing would have inverted the cost — every lane
paying a red suite so the ui lanes could skip an install.

### The ~6 minutes that raised the finding is attributed to a cold cache, not to per-dispatch cost
A cache-warm install in this tree is 15 seconds, so the figure the finding was raised on is a
once-per-machine cold-cache cost; the prepare step carries no six-minute per-dispatch charge.

### The junction inside a prepared worktree is on the record, with its remover census
`npm ci` creates `node_modules/@aof/ui` as a Windows junction with an absolute intra-tree target
(`<worktree>/ui`), and the header records the probe: `node fs.rm({recursive})`, `rm -rf`, PowerShell
`Remove-Item -Recurse -Force` and `cmd rmdir /s /q` all unlink the reparse point and leave an
out-of-tree canary intact, while `git worktree remove --force` (git 2.47.0.windows.1) traverses it and
empties the canary — so the remover 72/ADR-007 §3 blesses is the one remover that follows a junction,
and §3 stays safe here because the target is intra-tree rather than because junctions are harmless.

### 72/ADR-007 §2 reads as a claim about aof's own code, at the declaration a reader meets first
The header states that *"aof creates no symlink or junction whose path lies inside a worktree, ever"*
is true as written and is censused over `src/` by FF-7207, and is NOT the claim that a prepared
worktree contains no junction — one does, on every dispatch, put there by this script's own `npm ci`.
ADR-007 is unedited; the precise reading lives beside the declaration.

## Assumptions

- **A user-level npm cache that is already warm** — every median above is a cache-warm install; the
  arms are comparable to each other and to a dispatch on a machine that has installed this tree before,
  not to a first install on a fresh node.
- **git 2.47.0.windows.1 as the probed remover** — the traversal result that makes
  `git worktree remove --force` the outlier is that build's measured behaviour, not a documented
  contract, so a git upgrade is the event that would re-open the census.
- **`test/support/react-app-harness.mjs` substituting only `react`, `react-dom`, `@xterm/*` and
  `lucide-react`** — the `--workspaces=false` red follows from the harness resolving everything else
  from `node_modules`, so widening that substitution list is what would change the answer.

## Gaps

### The 11.5s `ui`-workspace share of every dispatch install
- **Status:** open
- **Discharge condition:** the root suite no longer bundling real `ui/src` components through
  `react-app-harness.mjs` — or that harness substituting `clsx`, `tailwind-merge` and `marked` as it
  already substitutes `react` and `lucide-react` — at which point `--workspaces=false
  --include-workspace-root` becomes takeable and the measurement above says what it is worth.

The lever is real and priced; it is declined on suite-breakage grounds rather than on cost grounds, so
the saving stays available to a later change that removes the dependency rather than the workspace.
