@executable @cli @work @work-stream
Feature: advanceBranchToBase gains a dirtyPolicy, and strict stays byte-identical

  ADR-002 §1. `advanceBranchToBase(worktreePath, commit, options)` (m43/ADR-008) is the mesh's
  one merge verb and it becomes the loop's too, pointed the other way. It gains ONE additive
  option, `dirtyPolicy`: `"strict"` — the default and today's door 2, a non-empty `status
  --porcelain` refuses `assignment-gate-propagation-dirty-worktree` before anything is touched —
  or `"touched-paths"` — two sets must both be empty: (a) the paths `git diff --name-only
  HEAD...<commit>` names (the THREE-DOT form: merge-base to commit — the two-dot form also lists
  paths only THIS side changed and would refuse merges git itself admits), intersected with the
  porcelain's paths, a rename contributing BOTH its old and new path; and (b) every STAGED index
  entry whatever its path (`M `, `A `, `D `, `R ` in the first porcelain column) — a real merge
  (door 4) refuses any staged entry and a fast-forward would carry it across silently, so an
  operator mid-commit is refused by name under both doors. Otherwise the refusal is RETURNED,
  never thrown, with the same code and the offending `files` listed in porcelain order, and the
  tree is untouched. Git enforces the touched-path rule itself ("your local changes would be
  overwritten"); computing it first is what keeps the refusal returned and the tree exactly as it
  was. `strict` answers carry no `files` key. Every
  other door is unchanged: already-an-ancestor no-op before any check, `--ff-only` when strictly
  behind, a real `--no-ff` merge otherwise, a conflict classified then `--abort`ed and refused
  `assignment-gate-propagation-conflict`. An unknown `dirtyPolicy` value is a thrown coded error
  (`gate-propagation-bad-option`), never a silently strict run: a policy nobody asked for must not
  be the one applied.

  Background:
    Given a dispatch fixture repository whose worktree is on branch `aof/mesh/127-02` cut from commit B0
    And the primary's HEAD has moved to B1, which modifies `src/x.mjs` and adds `src/new.mjs`
    And `README.md`, `src/n.mjs` and `notes.txt` are paths B1 does not touch

  Scenario Outline: strict is the default and refuses every kind of dirt on any path
    Given the worktree has <dirt>
    When `advanceBranchToBase(worktree, B1)` runs with no `dirtyPolicy`
    Then the answer is `{ outcome: "refused", code: "assignment-gate-propagation-dirty-worktree", base: B1, tip: B0 }` with no `files` key
    And `git rev-parse HEAD` in the worktree is B0
    And `git status --porcelain` in the worktree is byte-identical to its output before the call

    Examples:
      | dirt                                                |
      | an unstaged edit to `README.md`                     |
      | a staged edit to `README.md`                        |
      | a staged new file `src/added.mjs`                   |
      | an unstaged deletion of `README.md`                 |
      | a staged rename of `README.md` to `README2.md`      |
      | an untracked `notes.txt`                            |
      | an unstaged edit to `src/x.mjs`                     |

  Scenario Outline: touched-paths admits unstaged and untracked dirt on paths the fast-forward does not touch
    Given the worktree has <dirt>
    When `advanceBranchToBase(worktree, B1, { dirtyPolicy: "touched-paths" })` runs
    Then the answer is `{ outcome: "fast-forwarded", code: null, base: B1, tip: B1 }`
    And `git rev-parse HEAD` in the worktree is B1
    And `git status --porcelain` in the worktree is exactly <porcelain after>

    Examples:
      | dirt                                            | porcelain after              |
      | an unstaged edit to `README.md`                 | ` M README.md`               |
      | an unstaged deletion of `README.md`             | ` D README.md`               |
      | an untracked `notes.txt`                        | `?? notes.txt`               |

  Scenario Outline: touched-paths refuses every staged index entry, whatever its path
    Given the worktree has <dirt>
    When `advanceBranchToBase(worktree, B1, { dirtyPolicy: "touched-paths" })` runs
    Then the answer is `{ outcome: "refused", code: "assignment-gate-propagation-dirty-worktree", base: B1, tip: B0, files: <files> }`
    And `git rev-parse HEAD` in the worktree is B0
    And `git status --porcelain` in the worktree is byte-identical to its output before the call

    Examples:
      | dirt                                            | files                          |
      | a staged edit to `README.md`                    | `["README.md"]`                |
      | a staged new file `src/added.mjs`               | `["src/added.mjs"]`            |
      | a staged deletion of `README.md`                | `["README.md"]`                |
      | a staged rename of `README.md` to `README2.md`  | `["README.md", "README2.md"]`  |
      | a staged edit to `README.md` and an unstaged edit to `notes.txt` | `["README.md"]` |

  Scenario Outline: touched-paths refuses dirt on a path the advance touches and names only the intersection
    Given the worktree has <dirt>
    When `advanceBranchToBase(worktree, B1, { dirtyPolicy: "touched-paths" })` runs
    Then the answer is `{ outcome: "refused", code: "assignment-gate-propagation-dirty-worktree", base: B1, tip: B0, files: <files> }`
    And `git rev-parse HEAD` in the worktree is B0
    And `git status --porcelain` in the worktree is byte-identical to its output before the call
    And `git rev-parse -q --verify MERGE_HEAD` in the worktree exits non-zero

    Examples:
      | dirt                                                              | files                            |
      | an unstaged edit to `src/x.mjs`                                   | `["src/x.mjs"]`                  |
      | a staged edit to `src/x.mjs`                                      | `["src/x.mjs"]`                  |
      | an unstaged deletion of `src/x.mjs`                               | `["src/x.mjs"]`                  |
      | a staged deletion of `src/x.mjs`                                  | `["src/x.mjs"]`                  |
      | an untracked `src/new.mjs`                                        | `["src/new.mjs"]`                |
      | an unstaged edit to `src/x.mjs` and an unstaged edit to `README.md` | `["src/x.mjs"]`                |
      | an unstaged edit to `src/x.mjs` and an untracked `src/new.mjs`    | `["src/new.mjs", "src/x.mjs"]`   |

  Scenario: a rename contributes both its paths
    Given the worktree has a staged rename of `src/x.mjs` to `src/y.mjs`
    When `advanceBranchToBase(worktree, B1, { dirtyPolicy: "touched-paths" })` runs
    Then the refusal's `files` is `["src/x.mjs", "src/y.mjs"]`

  Scenario: touched-paths carries worktree-only dirt across a real merge
    Given the worktree's branch carries a commit L1 to `src/n.mjs`, so it has diverged from B1
    And the worktree has an unstaged edit to `README.md` and an untracked `notes.txt`
    When `advanceBranchToBase(worktree, B1, { dirtyPolicy: "touched-paths", message: "m", node: "n" })` runs
    Then the answer is `{ outcome: "merged", code: null, base: B1 }` with `tip` equal to `git rev-parse HEAD`
    And `git rev-parse HEAD^1` is L1 and `git rev-parse HEAD^2` is B1
    And `git status --porcelain` in the worktree is exactly ` M README.md` and `?? notes.txt`

  Scenario Outline: already-current is decided before any dirt check under either policy
    Given B1 is already an ancestor of the worktree's HEAD and the worktree has an unstaged edit to `src/x.mjs`
    When `advanceBranchToBase(worktree, B1, { dirtyPolicy: <policy> })` runs
    Then the answer is `{ outcome: "already-current", code: null, base: B1 }` with `tip` equal to `git rev-parse HEAD`
    And `git status --porcelain` in the worktree is byte-identical to its output before the call

    Examples:
      | policy          |
      | "strict"        |
      | "touched-paths" |

  Scenario Outline: a conflict under touched-paths is still aborted and refused with the rest of the tree kept
    Given the worktree's branch carries a commit L1 to `src/x.mjs` that conflicts with B1
    And the worktree has <dirt>
    When `advanceBranchToBase(worktree, B1, { dirtyPolicy: "touched-paths" })` runs
    Then the answer is `{ outcome: "refused", code: "assignment-gate-propagation-conflict", base: B1, tip: L1 }`
    And `git rev-parse HEAD` in the worktree is L1
    And `git rev-parse -q --verify MERGE_HEAD` in the worktree exits non-zero
    And `git status --porcelain` in the worktree is exactly <porcelain after> and no file under it contains a conflict marker

    Examples:
      | dirt                                                        | porcelain after                |
      | nothing                                                     | (empty)                        |
      | an unstaged edit to `README.md` and an untracked `notes.txt` | ` M README.md` and `?? notes.txt` |

  Scenario Outline: an unknown policy is a thrown coded error before any git verb runs
    Given a recording git runner double
    When `advanceBranchToBase(worktree, B1, { dirtyPolicy: <value>, exec: double })` runs
    Then it throws an error with `code` `"gate-propagation-bad-option"` naming <value>
    And the double received no invocation

    Examples:
      | value     |
      | "lenient" |
      | "Strict"  |
      | ""        |

  Scenario: the mesh's callers are byte-identical
    When `test/grade/gate-propagation-refusals-leave-branch.test.mjs` and `test/grade/gate-propagation-reuse-door-advance.test.mjs` run under an isolated global home
    Then both are green with no change to their assertions
