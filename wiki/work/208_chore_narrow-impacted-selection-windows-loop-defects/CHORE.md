---
type: chore
number: 208
slug: narrow-impacted-selection-windows-loop-defects
title: "Narrow impacted test selection and fix three Windows loop defects"
status: done
owner: developer
created: 2026-11-15
updated: 2026-11-15
depends: []
schema: 1
aofVersion: 0.1.0
---
# 208 · Narrow impacted test selection and fix three Windows loop defects

## Intent

Running sijil's loop on Windows found four defects in aof. Impacted test selection follows
graphify's guessed call edges, so one changed BDD binding selects 195 of 226 suites. Finished lanes
fail their cleanup, an indeterminate grade loses the runner's output, and a lane on a feature branch
starts with no code graph. This chore fixes the first three and settles the fourth.

## Definition of Done

- [x] `computeImpact` in `packages/knowledge/src/graph-impact.mjs` does not follow edges with `confidence: "INFERRED"` when it selects tests (or it follows only import, re_export and EXTRACTED edges). A new case in `packages/knowledge/test/graph-impact.suite.mjs` proves an INFERRED edge into a test file selects nothing.
- [x] `removeDispatchWorktree` in `packages/mesh/src/worktrees.mjs` no longer times out on a lane with a large ignored `node_modules`. It deletes the heartbeat queue files by a direct path lookup, or that one `git clean` call gets a longer timeout. A merged lane's cleanup no longer reports "cleanup refused (error)".
- [x] A `report-vacuous` indeterminate grade (non-zero exit with an all-green report) keeps a bounded tail of the runner's stdout and stderr (`detail`) in the run record, so the halt can be diagnosed without re-running the rubric.
- [x] A decision is recorded in Notes on whether lane creation seeds the code graph, for example from the primary checkout or the nearest published ancestor. If the answer is yes, a lane on a feature branch runs `aof test --scope impacted` without widening as no-graph.
- [x] `aof work validate` is green (no regression).

## Notes

- Item 1, measured in sijil: 108 INFERRED edges (calls and indirect_call, matched by function name
  only, score 0.8) point into `*.test.ts` files from other files. The one traced was false:
  `register-api.test.ts` → a local `world()` in `soa-template.test.ts`. With INFERRED edges removed
  (measured offline), the same commit selects 2 suites, and the narrowed median across 29 commits
  drops from 195 to 2.
- Item 1, delivered: `computeImpact` and the transitive closure take `skipInferred`, and test
  selection (`packages/work/src/testing/select.mjs`) is the one caller that sets it. `graph impact`
  and seam liveness still read every edge. This repository's graph holds 1,672 INFERRED edges.
- Item 2: the call was `git clean -f -x -q -- :(glob)**/runs/.heartbeats.ndjson*`, run before
  `worktree remove`. The `-x` flag walks the lane's ignored `node_modules`, about 75 s on Windows,
  and the git exec times out.
- Item 2, delivered: no `git clean` is sent. `removeFinishedLane` in
  `packages/work-loop/src/dispatch.mjs` reads the untracked queues off `git status`, which skips
  ignored directories, and deletes each by path before `removeDispatchWorktree`. The delete lives
  there because FF-7207 keeps `packages/mesh/src/worktrees.mjs` free of any filesystem delete. An
  ignored queue needs no delete: `git worktree remove` does not refuse over an ignored file
  (measured on real git, 2026-11-15). The git model and its parity script lost their `clean` verb.
- Item 3, delivered: chore 207 already put the runner's exit and a 4,000-character tail of its
  output on the halt line and in the repair hand-over file. The tail now also rides the record of
  the repair run the halt starts, as `brief.halt.runner`.
- Item 3, the limit: `packages/execution/src/runs.mjs` is digest-pinned as a frozen seam, so no
  writer was added to stamp the graded run itself. A loop run with repair off (`--no-repair`, or
  `work.loop.repair: false`) starts no run at the halt, so there the tail is on the halt line and
  in the loop-diag log only.
- Item 4: `graphify-out` is gitignored. The git-refs shared graph is published only for
  default-branch commits and fetched only by `graph build` or `graph fetch`. sijil works around
  this by copying the graph in its `work.worktree.prepare` script.
- Item 4, the decision: yes, lane creation seeds the graph, from the primary checkout. The nearest
  published ancestor was not chosen: it needs the remote, and it is older than the primary's graph
  for a lane cut from the primary's HEAD. `inheritCodeGraph` in
  `packages/work-loop/src/dispatch.mjs` copies `graphify-out/graph.json`, and the `.gitignore`
  beside it, when the primary holds them, the lane does not, and git ignores them. The copy keeps
  the graph's mtime, which is the `builtAt` every reader reports. A lane's own graph is never
  overwritten. A primary with no graph still gives a lane none.
- Item 4, what was measured: the lane holds the primary's graph and its `git status` stays clean
  (`work-dispatch-lanes.test.mjs`). `aof test --scope impacted` was not run in a lane; selection
  widens as `no-graph` only when that file is absent. Mesh worker lanes on another machine are not
  covered: they have no primary checkout to copy from.
- Tests, run with `node scripts/test.mjs --only`, all green: `graph-impact.suite.mjs`,
  `work-dispatch-lanes.test.mjs`, `work-test-select.test.mjs`, `loop-command-wave.test.mjs`,
  `acd-git-fake-parity.test.mjs`, `acd-worktree-never-linked.test.mjs`,
  `acd-loop-git-reads-once-per-step.test.mjs`, `acd-code-graph-one-reader.test.mjs` and
  `acd-test-selection-widens-never-narrows.test.mjs`. `loop-command-wave.test.mjs` last ran before
  the queue delete moved from the mesh module to `removeFinishedLane`.
- Not this chore's: `acd-source-directory-budget.test.mjs` is red at HEAD on this branch.
  `test/loop/` holds 66 files against a ceiling of 64, and `packages/foundation/src/` holds 9
  against an exemption threshold of 8. Both counts are the same on `main` plus this branch's
  earlier commits; this chore added no file to either directory.
