---
type: chore
number: 112
slug: the-worktree-prepare-installs-the-ui-workspace-every-dispatch-and-no-lane-has-measured-whether-it-must
title: "The Worktree Prepare Installs The Ui Workspace Every Dispatch And No Lane Has Measured Whether It Must"
status: done
owner: <role>
created: 2026-09-04
updated: 2026-09-05
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 112 · The Worktree Prepare Installs The Ui Workspace Every Dispatch And No Lane Has Measured Whether It Must

## Intent

The worktree prepare (`scripts/prepare-worktree.mjs`) runs a full `npm ci` on every dispatch, and
nobody had measured what the `ui` workspace costs inside it or whether the lane needs it — the whole
install had been seen taking ~6 minutes. This chore measures it, decides, and writes the answer down
beside the declaration so the next reader does not have to re-derive it.

**Decision: DO NOT narrow the install.** The lever is real — the `ui` workspace is **77% of a
cache-warm install (11.5s of 15.0s)** — and it is still not taken, because both narrowings red the
suite *every* lane runs. Full detail is recorded in `scripts/prepare-worktree.mjs`'s header.

## Definition of Done

- [x] Measure the ui workspace's share of a cache-warm npm ci in a dispatch worktree (the whole install was ~6 min, 2026-09-04). Then decide whether scripts/prepare-worktree.mjs should narrow the install (npm ci --workspaces=false, or --omit=dev) and what a lane that touches ui/ does instead — narrowing also stops the node_modules/@aof/ui workspace link being created at all, which is TECH_DEBT 36's mechanism kept inside the tree rather than merely aimed safely. Record the decision beside the declaration.
- [x] `aof work validate` is green (no regression)

## Measurement (2026-09-05)

Real detached worktree, cache-warm, three alternating runs per arm, `node_modules` cleared between
runs. **The ~6 minutes that raised the finding cannot have been cache-warm** — a cache-warm install
here is 15 seconds, so that cost is a cold cache once per machine, not a per-dispatch cost.

| arm | median | packages | files | node_modules | `@aof/ui` junction |
| --- | --- | --- | --- | --- | --- |
| `npm ci` (shipped) | **15.0s** | 158 | 8,216 | 198.5 MB | created |
| `--workspaces=false --include-workspace-root` | **3.4s** | 42 | 1,262 | 82.5 MB | absent |
| `--omit=dev` | 15.0s | 147 | 7,514 | 158.7 MB | created |

All three medians are the **same worktree** — a first draft of this table took the `--omit=dev` arm
from a stripped fixture instead, where it read as *slower* than the full install rather than
identical to it. The package/file/byte columns are lockfile-determined and context-independent.

**Why neither narrowing is taken.** The root suite esbuild-bundles real `ui/src` components through
`test/support/react-app-harness.mjs`, which substitutes only `react`, `react-dom`, `@xterm/*` and
`lucide-react` — so `--workspaces=false` reds `test/terminal-harness-drives-a-grid.test.mjs` with
`Could not resolve "clsx"` (`ui/src/lib/utils.ts:1`), plus `tailwind-merge` and `marked`. And
`--omit=dev` saves **nothing measurable** — ui's vite/react/tailwind are `dependencies`, not dev, so
the weight it aims at is not the weight it removes — while dropping the ROOT's `esbuild` and `ajv`,
the bundler that harness runs on. So a lane that touches `ui/` does nothing special: the workspace is
already there, and narrowing would have made every lane pay a red suite so the ui lanes could skip an
install.

**The junction half.** A full install does create `node_modules/@aof/ui`, on Windows a **junction
with an absolute target** — TECH_DEBT 36's mechanism. It is bounded by its target, not by its
remover: the target is intra-tree (`<worktree>/ui`), so a delete that follows it reaches only what
the worktree removal was already taking. Probed against a junction aimed at a canary *outside* the
tree, `node fs.rm({recursive})`, `rm -rf`, PowerShell `Remove-Item -Recurse -Force` and
`cmd rmdir /s /q` all unlink the reparse point and leave the canary intact — while
**`git worktree remove --force` (git 2.47.0.windows.1) traverses it and empties the canary.** The
remover ADR-007 §3 blesses is the one remover that follows a junction. §3 is still right, and the
intra-tree target is what makes it safe here; but "removal stays git-managed" must not be read as
"and therefore junctions are harmless".

## Notes

**Review close (round 1, solo — structural + behavioural + craft).** No Blockers survived. One
behavioural finding was reproduced and fixed in the round: the first draft of the table above took
its `--omit=dev` timing from a stripped fixture while the other two arms came from a worktree, which
made that arm read as *slower* than the full install rather than identical to it; it was re-measured
in the same worktree. The close routed one **amendment** and one **Nit**, and created nothing:

- *Amendment (ratified here, in this chore's own record).* `72/ADR-007 §2` — *"aof creates no symlink
  or junction whose path lies inside a worktree, ever"* — is true as written and is a claim about
  **aof's own code** (FF-7207 censuses `src/`). It is **not** the claim that no junction lies inside
  a prepared worktree: one does, on every dispatch, and this script's `npm ci` is what puts it there.
  ADR-007 is not edited; the precise reading is recorded beside the declaration, where the next
  reader deciding "is this tree junction-free?" will actually meet it.
- *Nit (recorded, not promoted).* The measurement appears both here and in the script header. Kept
  deliberately: this record is a dated snapshot of the chore, the header is the live decision a
  reader of the declaration finds. The drift risk is one-directional and the snapshot is dated.

- **Promoted from review finding:** "The worktree prepare installs the ui workspace every dispatch, and no lane has measured whether it must" (`scripts/prepare-worktree.mjs:78`)
- **Raised reviewing:** `90`, review round 1
- **Promotion key:** `finding:90:the worktree prepare installs the ui workspace every dispatch, and no lane has measured whether it must`

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->
