@executable @cli @work @validate
Feature: the never-discards sweep reaches the lane verbs

  FF-12904 (ADR-002's invariant) is an EXTENSION of the existing control
  `test/arch/grade/acd-gate-propagation-never-discards.test.mjs` (m43/ADR-008), never a twin:
  `BRANCH_PATH_MODULES` gains `src/work/dispatch.mjs`, `src/loop/wave.mjs` and
  `src/loop/cycle.mjs`; the forbidden forms — `rebase`, `push --force` / `--force-with-lease` /
  `-f`, `reset --hard`, `checkout -B`, `branch -f` / `--force`, `update-ref` — stay banned across
  the whole set through the ONE detector (`discardingOps`) whose hit strings the table below
  quotes; the sanctioned forms stay sanctioned (`worktree remove --force`, the path-scoped
  `reset -q -- .aof` that moves into `worktree.mjs` with `commitWorktreeChanges`, the two `merge`
  doors, the plain push); the ARMED leg — every `merge` argv has a `--abort` argv beside it IN
  THE SAME MODULE — now runs over `src/work/dispatch.mjs` as it does over `worktree.mjs`; and
  `advanceBranchToBase`'s `dirtyPolicy` literal set is pinned to exactly `{"strict",
  "touched-paths"}` so a third policy is a decision somebody names. The control's case names
  carry `FF-12904`; the four cases shipped at HEAD are kept, none renamed away.

  Background:
    Given `test/arch/grade/acd-gate-propagation-never-discards.test.mjs` after this story

  Scenario: the module set is the six
    When `BRANCH_PATH_MODULES` is read
    Then as a set it equals `src/mesh/worktree.mjs`, `src/mesh/worker-execution.mjs`, `src/mesh/recovery-push.mjs`, `src/work/dispatch.mjs`, `src/loop/wave.mjs`, `src/loop/cycle.mjs`
    And every member is read with `readFile`, so a member absent from disk fails the forbidden-forms leg with `ENOENT` naming its path rather than being skipped

  Scenario Outline: a forbidden form in any new module reds the sweep with the detector's own hit
    Given `<module>` gains the git argv <argv>
    When the control runs under an isolated global home
    Then the forbidden-forms leg fails with a message containing `offenders` and `<module basename> — <hit>`
    And after `<module>` is restored its sha256 equals the pre-plant sha256 and the control is green

    Examples:
      | module                 | argv                                        | module basename | hit                                           |
      | src/work/dispatch.mjs  | `["reset", "--hard", base]`                 | dispatch.mjs    | reset --hard: reset --hard                    |
      | src/work/dispatch.mjs  | `["checkout", "-B", branch, base]`          | dispatch.mjs    | checkout -B: checkout -B                      |
      | src/work/dispatch.mjs  | `["push", "-f", "origin", branch]`          | dispatch.mjs    | force push: push -f origin                    |
      | src/loop/wave.mjs      | `["rebase", "main"]`                        | wave.mjs        | rebase: rebase main                           |
      | src/loop/wave.mjs      | `["branch", "-f", branch, tip]`             | wave.mjs        | branch -f: branch -f                          |
      | src/loop/wave.mjs      | `["update-ref", "refs/heads/main", tip]`    | wave.mjs        | update-ref: update-ref refs/heads/main        |
      | src/loop/cycle.mjs     | `["push", "--force-with-lease", "origin"]`  | cycle.mjs       | force push: push --force-with-lease origin    |
      | src/loop/cycle.mjs     | `["push", "--force", "origin", branch]`     | cycle.mjs       | force push: push --force origin               |
      | src/loop/cycle.mjs     | `["branch", "--force", branch, tip]`        | cycle.mjs       | branch -f: branch --force                     |

  Scenario Outline: the sanctioned forms stay sanctioned in every module of the set
    Given `<module>` holds the git argv <argv>
    When the control runs under an isolated global home
    Then the forbidden-forms leg is green

    Examples:
      | module                        | argv                                                            |
      | src/mesh/worktree.mjs         | `["worktree", "remove", "--force", worktreePath]`               |
      | src/mesh/worktree.mjs         | `["reset", "-q", "--", ".aof"]`                                 |
      | src/mesh/worktree.mjs         | `["merge", "--ff-only", base]`                                  |
      | src/mesh/worktree.mjs         | `["merge", "--no-ff", "--no-edit", "-m", message, base]`        |
      | src/mesh/worktree.mjs         | `["merge", "--abort"]`                                          |
      | src/mesh/worker-execution.mjs | `["-c", "credential.helper=", "push", "origin", branch]`        |
      | src/work/dispatch.mjs         | `["worktree", "remove", "--force", lanePath]`                   |
      | src/work/dispatch.mjs         | `["add", "--", milestoneDir]` and `["commit", "--no-verify", "-m", message]` |

  Scenario Outline: the armed leg judges each module by its own argvs
    Given `<module>` <state>
    When the control runs under an isolated global home
    Then the ARMED leg <outcome>

    Examples:
      | module                  | state                                                                          | outcome                                                                  |
      | src/work/dispatch.mjs   | as shipped, reaching `merge` only through `advanceBranchToBase`                | is green, with no `merge` argv of dispatch.mjs's own to arm on           |
      | src/work/dispatch.mjs   | gains `["merge", "--no-ff", tip]` and no `["merge", "--abort"]` of its own     | fails with a message containing `src/work/dispatch.mjs` and `--abort`    |
      | src/work/dispatch.mjs   | gains `["merge", "--no-ff", tip]` while only `worktree.mjs` holds the `--abort` | fails, because an abort in another module does not arm this one         |
      | src/mesh/worktree.mjs   | as shipped, `merge --ff-only`, `merge --no-ff` and `merge --abort` all present  | is green                                                                 |
      | src/mesh/worktree.mjs   | has its `["merge", "--abort"]` argv removed                                     | fails with a message containing `src/mesh/worktree.mjs` and `--abort`    |

  Scenario Outline: the dirty policy literal set is pinned to exactly two
    Given `advanceBranchToBase` in `src/mesh/worktree.mjs` <state>
    When the control runs under an isolated global home
    Then the `dirtyPolicy` leg <outcome>

    Examples:
      | state                                                                  | outcome                                                                                    |
      | compares `dirtyPolicy` against exactly `"strict"` and `"touched-paths"` | is green                                                                                   |
      | gains a `dirtyPolicy === "lenient"` comparison                          | fails with a message containing `lenient` and `strict, touched-paths`                     |
      | has every `dirtyPolicy` comparison removed                              | fails with a message containing `NOT FOUND` and `dirtyPolicy` — an empty set is not a pin |

  Scenario: the control is green at HEAD and carries the id
    When the control runs under an isolated global home
    Then every case passes and the exported case count is at least four
    And at least one case name contains `FF-12904`
    And the self-check case still drives every forbidden form and every sanctioned form through `discardingOps`
