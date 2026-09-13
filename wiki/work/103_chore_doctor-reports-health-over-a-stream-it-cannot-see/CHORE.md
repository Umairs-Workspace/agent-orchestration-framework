---
type: chore
number: 103
slug: doctor-reports-health-over-a-stream-it-cannot-see
title: "Doctor Reports Health Over A Stream It Cannot See"
status: done
owner: product-owner
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
# 103 · Doctor Reports Health Over A Stream It Cannot See

## Intent

`aof work doctor` resolves `work.dir` against the process cwd rather than the project root, so from any
subdirectory it scans an empty stream and prints `healthy — <ref> is coherent.` with no findings. This
is a false green in the one instrument `aof:verify` step 4 names as the check to read before setting
`status: done`, and it nearly landed an acceptance on it — so it is fixed now rather than when it next
costs an accept.

## Definition of Done

- [x] `aof work doctor <ref>` returns the SAME findings from the repo root, from a work-item folder (`wiki/work/NN_.../`) and from `src/`. Measured at 78's gate: 8 findings and `Loop-Ready: 70% (7/10)` from the root against `healthy` and `50% (2/4)` from either subdirectory, for the same ref, on the same tree.
- [x] `work.dir` is resolved against the directory `aof.config.json` was resolved from, not against `process.cwd()` — fixed at the shared resolution site, so every reader of that path is fixed with it rather than doctor alone.
- [x] Belt and braces: a scan that finds ZERO items is an error (`empty-stream`, or a non-zero exit naming the directory it looked in), never a pass. An empty result set and a clean result set must stop rendering identically.
- [x] A regression test pins the cwd-independence — the same ref doctored from at least two working directories, asserting equal findings.
- [x] `aof work validate` is green (no regression)

## What was done

- **The cause was one directory above doctor.** `findProjectConfig` (`src/workspace.mjs`) answered only
  for the literal directory handed to it — no upward walk — so from `src/` it returned an invented
  `src/.aof/aof.config.json`; `loadWorkspace` then took `src/` as the project root and resolved
  `work.dir` to `src/wiki/work`, which does not exist. Every doctor check-group correctly produced
  nothing over zero items. **Doctor was never the bug**, which is why validate answered correctly from
  the same directories: validate resolves the ref, it does not scan the stream.
- **Fixed at the shared resolution site**, so every reader of a workspace path is fixed with it —
  `work run-start` was a second victim, refusing `103` with `ref-not-found` from inside the chore's own
  folder.
- **The walk needed two boundaries, both found by measurement, not by reading:**
  - *aof's own config home.* `~/.aof/aof.config.json` exists and `os.tmpdir()` on Windows lives under
    `~`, so an unbounded walk resolved a temp-dir fixture's work dir to `~/wiki/work` — the isolation
    breach `AOF_GLOBAL_HOME` exists to prevent, arriving through the back door. Both spellings are
    skipped (the configured home and the conventional `~/.aof`), because with the override set the walk
    otherwise sails past the fixture home and adopts the operator's real one.
  - *an ancestor `.aof` state dir.* A mesh worktree is materialised at
    `<origin>/.aof/mesh/worktrees/<assignmentId>`, so walking out of one adopts the ORIGIN's config —
    and a worker's doctor then reads the control's cache as authority over the tree it is itself
    authoring. Caught by `cache-read/04`, which went red on the first cut of the walk.
- **Measured after the fix**, same ref, same tree, three cwds (repo root · `src/` · a work-item folder):
  15 findings each, identical finding sets, `Loop-Ready: 80% (8/10)` from all three. Before: `80% (8/10)`
  from the root against `healthy` + `50% (2/4)` from either subdirectory.
- **The empty-stream refusal** is `commands/doctor.mjs`, appended at the same impure edge as the
  config-fault finding (workspace-level, never scope-filtered): zero items ⇒ an `error` finding naming
  the directory scanned, and a non-zero exit (verified unpiped). The `--explain` / `--converge` ledger
  modes return before the snapshot is built and are untouched.
- **A named consequence of the belt-and-braces clause, for the accepting gate to weigh:** a freshly
  initialized project with no items yet now answers `error: empty-stream` and exits 1 — measured, on a
  clean `aof work init .`. That is what "a scan that finds ZERO items is an error, never a pass" asks
  for, and it is not softened here; but it means `work doctor` is red between `init` and the first
  item, which is a legitimate state. The finding's prose therefore names BOTH causes (wrong directory ·
  genuinely empty) rather than guessing, and no longer closes by telling the operator to check that the
  project has been initialized — which was exactly the wrong advice for the commonest honest way to
  meet it. Caught in this chore's own review round, not by the gate.
- **Regression test:** `test/doctor-cwd-independence.test.mjs` — five cases, driven through the real CLI
  with a real `cwd` (an injected directory would paper over a cwd-derived path). It asserts the finding
  set is NON-EMPTY before asserting equality, because three empty sets comparing equal is the bug itself.

## Notes

- **Promoted from verification finding:** `78/VERIFICATION.md` **F-78-K** (`high`) — the full measurement, three cwds, is recorded there.
- **Raised by:** `aof:verify 78`, cross-checking its own instrument at the milestone gate.
- **Why it hides:** `aof work validate <ref>` answers CORRECTLY from those same subdirectories, so the ref resolves fine and only the stream scan comes back empty. Anyone spot-checking with validate sees nothing wrong.
- **The tell, if you are debugging this:** the output SHAPE changes, not just the findings — `Loop-Ready: 70% (7/10)` becomes `50% (2/4)` because a different readiness level is being scored over an empty set.
- **Wider context:** TECH_DEBT item 4 ("workspace identity is still partly cwd-derived") with a concrete, reproducible victim; same family as the dispatch-worktree cwd drift. Sibling finding **F-78-I** is chore **104**.
- **Carryable lesson already recorded:** `78/RETROSPECTIVE.md` **R4** — an instrument that can see nothing must refuse, not report health.
