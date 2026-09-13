@executable @cli @work @work-stream
Feature: dispatch.mjs composes commitDispatchLane, mergeDispatchLaneHome and dispatchLaneBase

  ADR-002 §1-§4, §6-§7 and ADR-008 §4. `src/work/dispatch.mjs` — the lane's home — gains three
  composed verbs over `src/mesh/worktree.mjs`'s git verbs; it spells no git verb of its own that
  the worktree module does not already own, except the read-only `symbolic-ref`, `rev-parse`,
  `diff --name-only` and the scoped `add`/`commit` of the loop's own writes.

    · `dispatchLaneBase(lanePath, { exec })` → the sha the lane was cut from: the merge-base of
      the lane's HEAD and the primary's branch (a lane reopened on an existing branch reports the
      base it was ADVANCED to, ADR-002 §7).
    · `commitDispatchLane(lanePath, { message, node, exec })` → `commitWorktreeChanges` with
      `exec`, answering `{ committed, tip }`.
    · `mergeDispatchLaneHome(primaryRoot, ref, { milestoneDir, message, node, exec })`:
        1. the primary is on a branch (`symbolic-ref -q HEAD`); detached → `{ outcome: "refused",
           code: "lane-merge-refused", reason: "detached-head" }`;
        2. the loop's OWN writes are committed first: `git add -- <milestoneDir>` + `commit
           --no-verify` under the mesh identity with `message` (a clean scope is a no-op);
        3. `advanceBranchToBase(primaryRoot, <lane tip>, { dirtyPolicy: "touched-paths", message, node })`
           — door 1 answers `already-current`, door 3 `fast-forwarded`, door 4 `merged`; its dirty
           refusal becomes `{ outcome: "refused", code: "lane-merge-refused", files }`, its conflict
           refusal `{ outcome: "conflict", code: "lane-merge-conflict" }` — aborted, tree untouched;
        every answer carries `ref`, `branch`, `base` (the lane's base), `tip` (the lane's tip) and
        `commit` (the primary's HEAD after).
    · a lane reopened on an existing branch is advanced to the primary's HEAD first —
      `resolveDispatchLane` gains `{ advanceTo }`: a SHA the caller resolved in the PRIMARY
      (`git rev-parse HEAD` there — never a ref, which the lane would resolve against its own tip);
      whenever it is given, `advanceBranchToBase(lane, advanceTo)` runs (strict — a lane is nobody's
      desk) on every door — a fresh cut and a reused tree answer `already-current`, a branch-only
      reopen (the tree swept, the unmerged line kept, `created: true`) is the case that moves — and
      a conflict there answers `{ …lane, advanced: { outcome: "refused", code: "lane-open-failed" } }`.

  Nothing here rebases, force-pushes, resets `--hard`, `checkout -B`, `branch -f`, or writes
  `refs/heads` — FF-12904's extension (story 05) sweeps this module; every `merge` it reaches is
  the worktree verb's, beside its abort.

  Background:
    Given a dispatch fixture repository on branch `main` at B0 with milestone dir `wiki/work/127_m/`
    And a lane for `127/02` opened from B0 whose branch `aof/mesh/127-02` carries one commit L1 touching `src/promote.mjs`

  Scenario: a lane merges home by fast-forward when the primary did not move
    When `mergeDispatchLaneHome(primary, "127/02", { milestoneDir })` runs
    Then the answer's `outcome` is `"fast-forwarded"` and `commit` equals L1
    And `git rev-parse main` is L1 and `git log --oneline B0..main` lists exactly L1

  Scenario: a lane merges home by a real merge when the primary moved elsewhere
    Given `main` gained a commit P1 touching `README.md` after B0
    When `mergeDispatchLaneHome` runs with `message: "aof(loop): merge 127/02"` and `node: "umamis-msi"`
    Then the answer's `outcome` is `"merged"` and `commit` equals `git rev-parse main`
    And `git rev-parse main^1` is P1 and `git rev-parse main^2` is L1
    And `git log -1 --format=%an <%ae>%n%s main` reports `aof-mesh (umamis-msi) <aof-mesh@users.noreply.github.com>` then `aof(loop): merge 127/02`

  Scenario Outline: every answer names the lane, its base, its tip and the primary's HEAD after
    Given `main` since B0 has <primary> and the lane since B0 has <lane>
    When `mergeDispatchLaneHome` runs
    Then the answer is `{ outcome: <outcome>, ref: "127/02", branch: "aof/mesh/127-02", base: <base>, tip: <tip> }`
    And the answer's `commit` equals `git rev-parse main` after the call, which is <main after>

    Examples:
      | primary                            | lane        | outcome           | base | tip | main after       |
      | not moved                          | L1          | "fast-forwarded"  | B0   | L1  | L1               |
      | P1 touching `README.md`            | L1          | "merged"          | B0   | L1  | a new merge sha  |
      | P1 conflicting on `src/promote.mjs` | L1         | "conflict"        | B0   | L1  | P1               |
      | L1 already merged into `main`      | L1          | "already-current" | L1   | L1  | unchanged        |
      | P1 touching `README.md`            | no commit   | "already-current" | B0   | B0  | P1               |

  Scenario Outline: the loop's own writes are committed before the merge, scoped to the milestone dir
    Given the primary has <dirt>
    When `mergeDispatchLaneHome` runs with `message: "aof(loop): 127/02 home"`
    Then <own-writes commit> and the answer's `outcome` is <outcome>
    And `git status --porcelain` in the primary is exactly <porcelain after>

    Examples:
      | dirt                                                                       | own-writes commit                                                                                      | outcome          | porcelain after                |
      | nothing uncommitted                                                        | no commit was created besides the merge                                                                | "fast-forwarded" | (empty)                        |
      | an edit to `wiki/work/127_m/STATE.md`                                      | `git show --name-only --format=%an%n%s main^1` reports the mesh identity, the message and exactly `wiki/work/127_m/STATE.md` | "merged" | (empty)               |
      | an untracked `wiki/work/127_m/runs/n/r1.json`                              | `main^1` contains exactly `wiki/work/127_m/runs/n/r1.json`                                             | "merged"         | (empty)                        |
      | a deletion of `wiki/work/127_m/old.md`                                     | `main^1` removes exactly `wiki/work/127_m/old.md`                                                      | "merged"         | (empty)                        |
      | an edit to `wiki/work/127_m/STATE.md` and an edit to `README.md`            | `main^1` contains exactly `wiki/work/127_m/STATE.md`                                                   | "merged"         | ` M README.md`                 |
      | an edit to `wiki/work/128_x/STATE.md` (another milestone's dir)             | no commit was created besides the merge                                                                | "fast-forwarded" | ` M wiki/work/128_x/STATE.md`  |

  Scenario Outline: operator dirt on a lane-touched path refuses by name
    Given the primary has <dirt>
    When `mergeDispatchLaneHome` runs
    Then the answer is `{ outcome: "refused", code: "lane-merge-refused", ref: "127/02", branch: "aof/mesh/127-02", base: B0, tip: L1, files: <files> }`
    And `git rev-parse main` is <main after> and `git status --porcelain` in the primary is exactly <porcelain after>

    Examples:
      | dirt                                                              | files                | main after                          | porcelain after                       |
      | an unstaged edit to `src/promote.mjs`                             | `["src/promote.mjs"]` | B0                                 | ` M src/promote.mjs`                  |
      | an unstaged edit to `src/promote.mjs` and one to `README.md`      | `["src/promote.mjs"]` | B0                                 | ` M README.md` and ` M src/promote.mjs` |
      | an edit to `src/promote.mjs` and one to `wiki/work/127_m/STATE.md` | `["src/promote.mjs"]` | the own-writes commit (child of B0) | ` M src/promote.mjs`                 |

  Scenario Outline: a conflict is aborted and named with everything intact
    Given `main` gained a commit P1 conflicting with L1 on `src/promote.mjs` after B0
    And the primary has <dirt>
    When `mergeDispatchLaneHome` runs
    Then the answer is `{ outcome: "conflict", code: "lane-merge-conflict", ref: "127/02", branch: "aof/mesh/127-02", base: B0, tip: L1, commit: P1 }`
    And `git rev-parse -q --verify MERGE_HEAD` in the primary exits non-zero and `git status --porcelain` there is exactly <porcelain after>
    And no file in the primary contains a conflict marker
    And `git rev-parse aof/mesh/127-02` is L1 and `git worktree list --porcelain` still lists the lane's worktree on `refs/heads/aof/mesh/127-02`

    Examples:
      | dirt                             | porcelain after |
      | nothing uncommitted              | (empty)         |
      | an unstaged edit to `README.md`  | ` M README.md`  |

  Scenario: a detached primary is refused before any write
    Given the primary's HEAD is detached at B0 and has an uncommitted edit to `wiki/work/127_m/STATE.md`
    When `mergeDispatchLaneHome` runs
    Then the answer is `{ outcome: "refused", code: "lane-merge-refused", reason: "detached-head", ref: "127/02" }`
    And `git rev-parse main` is B0, `git rev-parse aof/mesh/127-02` is L1, and `git status --porcelain` in the primary is exactly ` M wiki/work/127_m/STATE.md`

  Scenario Outline: commitDispatchLane commits the lane and reports its tip
    Given the lane worktree holds <dirt>
    When `commitDispatchLane(lane, { message: "aof(loop): 127/02 settled", node: "umamis-msi" })` runs
    Then the answer is `{ committed: <committed>, tip: <tip> }` where `tip` equals `git rev-parse HEAD` in the lane
    And `git status --porcelain` in the lane is empty

    Examples:
      | dirt                                                         | committed | tip                                          |
      | an edited record doc and an untracked run record             | true      | a new sha whose parent is L1, by the mesh identity |
      | nothing uncommitted                                          | false     | L1                                           |

  Scenario Outline: dispatchLaneBase reports the base a lane was cut from
    Given the lane since B0 has <lane> and `main` since B0 has <primary>
    When `dispatchLaneBase(lane)` runs
    Then it answers <base>

    Examples:
      | lane                        | primary                     | base |
      | no commit                   | not moved                   | B0   |
      | L1                          | not moved                   | B0   |
      | L1                          | P1 touching `README.md`     | B0   |
      | L1                          | L1 merged home              | L1   |

  Scenario Outline: a lane opened on an existing line is advanced to the primary's HEAD before it is handed out
    Given the lane branch `aof/mesh/127-02` already exists from an earlier dispatch at B0, <tree>, and `main` is at B1
    When `resolveDispatchLane(primary, "127/02", <options>)` runs
    Then the answer's `created` is <created> and <advanced>
    And `dispatchLaneBase(lane)` now answers <base>

    Examples:
      | tree                              | options              | created | advanced                                                          | base |
      | its worktree still exists          | `{ advanceTo: B1 }`  | false   | its `advanced.outcome` is `"fast-forwarded"` or `"merged"`        | B1   |
      | its worktree was swept, branch kept | `{ advanceTo: B1 }`  | true    | its `advanced.outcome` is `"fast-forwarded"` or `"merged"`        | B1   |
      | no branch and no worktree exist    | `{ advanceTo: B1 }`  | true    | its `advanced.outcome` is `"already-current"` (cut from B1)       | B1   |
      | its worktree still exists          | `{}`                 | false   | it carries no `advanced` key and the lane's HEAD is still B0      | B0   |

  Scenario: a reused lane that conflicts with HEAD is lane-open-failed
    Given the lane branch carries a commit L1 conflicting with `main`'s B1
    When `resolveDispatchLane(primary, "127/02", { advanceTo: B1 })` runs
    Then the answer's `advanced` is `{ outcome: "refused", code: "lane-open-failed" }`
    And `git rev-parse HEAD` in the lane is L1 and `git rev-parse -q --verify MERGE_HEAD` there exits non-zero
