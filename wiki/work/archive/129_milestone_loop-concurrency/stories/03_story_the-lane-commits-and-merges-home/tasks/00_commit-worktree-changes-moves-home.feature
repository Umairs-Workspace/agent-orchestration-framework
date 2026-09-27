@executable @cli @work @work-stream
Feature: commitWorktreeChanges moves to src/mesh/worktree.mjs and gains a paths scope; resolveRefInWorktree moves to src/work/dispatch.mjs; both are re-exported

  ADR-008 §4, TECH_DEBT item 83 seam 3 (one verb of it). `commitWorktreeChanges(worktreePath,
  { message, node, exec, pushExec })` — `git add -A`, the best-effort `reset -q -- .aof`, the
  staged check, the `--no-verify` commit under the mesh identity — is DEFINED in
  `src/mesh/worktree.mjs` beside its sibling git verbs and RE-EXPORTED from
  `src/mesh/worker-execution.mjs`, exactly the shape seams 1 and 2 took in 119/04: an absent
  definition paired with a present re-export is what distinguishes a move from a copy. The moved
  verb resolves its runner as `options.exec ?? options.pushExec` (the worker's two call sites pass
  `pushExec`; the loop's lane commit passes `exec`, the worktree module's own idiom), keeps
  `GIT_TERMINAL_PROMPT=0` / `LC_ALL=C` in the env, the `commit-failed` code on either failing verb,
  and the `{ committed }` answer. Every importer keeps the line it has: the two worker call sites,
  the recovery push and every suite that imports the name from `worker-execution.mjs` resolve to
  the SAME function reference.

  TWO MORE RULINGS (04's feasibility, 2026-09-13). (1) `commitWorktreeChanges` gains an additive
  `paths` option: when given (a non-empty array of repo-relative paths) the stage is `git add --
  <paths...>` and never `-A`, so the loop can commit ONLY `wiki/work/<milestone dir>/` in the
  primary (ADR-002 §2) through the one commit verb; absent, `-A` as today. The `.aof` reset still
  runs. (2) `resolveRefInWorktree(projectRoot, workDir, worktreePath, itemRef)` and its helper
  `worktreeWorkDir` move OUT of `worker-execution.mjs` INTO `src/work/dispatch.mjs` — the lane's
  home — re-exported from `worker-execution.mjs` on the same line idiom; NOT into `worktree.mjs`,
  whose closure sits inside the session driver's pinned mesh-blind reach and must gain no `work.mjs`
  import. `src/loop/wave.mjs` then reaches it without the driver.

  Background:
    Given a dispatch fixture repository with a worktree on an item branch at tip T0

  Scenario: the definition lives in worktree.mjs and the re-export is the same reference
    When `commitWorktreeChanges` is imported from `src/mesh/worktree.mjs` and from `src/mesh/worker-execution.mjs`
    Then both bindings are the same function
    And `src/mesh/worker-execution.mjs` contains no `function commitWorktreeChanges` definition
    And `src/mesh/worker-execution.mjs` contains `commitWorktreeChanges` in an `export { … } from "./worktree.mjs"` clause

  Scenario Outline: a dirty worktree is committed under the mesh identity, whatever the dirt
    Given the worktree holds <dirt>
    When `commitWorktreeChanges(worktree, { message: "aof(loop): lane 127/02", node: "win-host-a" })` runs
    Then the answer is `{ committed: true }`
    And `git rev-parse HEAD` in the worktree is a new commit whose parent is T0
    And `git log -1 --format=%an <%ae>%n%s` reports `aof-mesh (win-host-a) <aof-mesh@users.noreply.github.com>` then `aof(loop): lane 127/02`
    And `git show --name-status --format= HEAD` lists exactly <committed as>
    And `git status --porcelain` in the worktree is empty

    Examples:
      | dirt                                                        | committed as                        |
      | one unstaged edit to a tracked file `src/a.mjs`             | `M src/a.mjs`                       |
      | one untracked file `src/b.mjs`                              | `A src/b.mjs`                       |
      | one unstaged deletion of a tracked file `src/a.mjs`         | `D src/a.mjs`                       |
      | one staged rename of `src/a.mjs` to `src/c.mjs`             | `R100 src/a.mjs src/c.mjs`          |
      | an edit to `src/a.mjs` and an untracked `runs/n/r1.json`    | `M src/a.mjs` and `A runs/n/r1.json` |

  Scenario: a clean worktree is a no-op
    Given `git status --porcelain` in the worktree is empty
    When `commitWorktreeChanges` runs
    Then `git rev-parse HEAD` in the worktree is still T0 and the answer is `{ committed: false }`

  Scenario Outline: the .aof home is never staged
    Given the worktree holds <dirt>
    When `commitWorktreeChanges` runs
    Then the answer is <answer>
    And `git show --name-only --format= HEAD` lists <committed paths>
    And `git status --porcelain` in the worktree is exactly <porcelain after>

    Examples:
      | dirt                                                             | answer                 | committed paths        | porcelain after           |
      | an edit to `.aof/aof.config.json` and an edit to `src/a.mjs`     | `{ committed: true }`  | `src/a.mjs` only       | ` M .aof/aof.config.json` |
      | an untracked `.aof/notes.json` and an untracked `src/b.mjs`      | `{ committed: true }`  | `src/b.mjs` only       | `?? .aof/notes.json`      |
      | an edit to `.aof/aof.config.json` alone                          | `{ committed: false }` | T0's paths (no commit) | ` M .aof/aof.config.json` |

  Scenario Outline: the runner is resolved from exec first, then pushExec
    Given a recording git runner double and a second recording double `other`
    When `commitWorktreeChanges` runs with <options>
    Then <receives every invocation> received every git invocation and <receives none> received none
    And every recorded invocation's `cwd` is the worktree and its `env` carries `GIT_TERMINAL_PROMPT: "0"` and `LC_ALL: "C"`

    Examples:
      | options                                    | receives every invocation | receives none   |
      | `{ message, exec: double }`                | the double                | the real runner |
      | `{ message, pushExec: double }`            | the double                | the real runner |
      | `{ message, exec: double, pushExec: other }` | the double              | `other`         |

  Scenario Outline: a failing add or commit throws commit-failed with the verb named
    Given a runner double that fails <verb> with stderr <stderr>
    When `commitWorktreeChanges` runs
    Then it throws an error with `code` `"commit-failed"` whose message names <names>
    And no invocation after the failing <verb> was made

    Examples:
      | verb     | stderr          | names                             |
      | `add`    | `index locked`  | `git add` and `index locked`      |
      | `commit` | `hook rejected` | `git commit` and `hook rejected`  |

  Scenario: a failing reset of the .aof home is best-effort and does not fail the commit
    Given a runner double that fails `reset -q -- .aof` and reports one staged path
    When `commitWorktreeChanges` runs
    Then the answer is `{ committed: true }` and the commit invocation was made

  Scenario: the worker's two call sites are unchanged lines
    When `src/mesh/worker-execution.mjs` is read
    Then it contains exactly two `commitWorktreeChanges(` call sites and each passes `pushExec` exactly as it did before this story
    And `test/mesh/worker/mesh-worker-commit-diff.test.mjs` is green unchanged

  Scenario Outline: paths scopes the stage to the named paths only
    Given the worktree holds an edit to `wiki/work/07_m/STATE.md`, an untracked `wiki/work/07_m/runs/n/r1.json` and an edit to `README.md`
    When `commitWorktreeChanges(worktree, { message: "m", paths: <paths> })` runs
    Then the answer is <answer>
    And `git show --name-only --format= HEAD` lists <committed>
    And `git status --porcelain` in the worktree is exactly <porcelain after>

    Examples:
      | paths                    | answer                 | committed                                                     | porcelain after  |
      | `["wiki/work/07_m"]`     | `{ committed: true }`  | `wiki/work/07_m/STATE.md` and `wiki/work/07_m/runs/n/r1.json` | ` M README.md`   |
      | `["docs"]`               | `{ committed: false }` | T0's paths (no commit)                                        | all three, unchanged |
      | absent                   | `{ committed: true }`  | all three                                                     | (empty)          |

  Scenario: resolveRefInWorktree is defined in dispatch.mjs and re-exported from the god-node
    When `resolveRefInWorktree` is imported from `src/work/dispatch.mjs` and from `src/mesh/worker-execution.mjs`
    Then both bindings are the same function
    And `src/mesh/worker-execution.mjs` contains no `function resolveRefInWorktree` and no `function worktreeWorkDir` definition
    And `src/mesh/worktree.mjs` gains no import of `../work.mjs` and `acd-session-driver-mesh-blind` is green unchanged

  Scenario: resolveRefInWorktree still answers the item as it lives in the lane
    Given a lane worktree for `07/01` whose `wiki/work` mirrors the primary's
    When `resolveRefInWorktree(primary, workDir, lane, "07/01")` runs
    Then the answer's `ref` is `07/01` and its `dir` is under the lane, never the primary
    And a traversal ref (`../../etc`) answers null and constructs no path
