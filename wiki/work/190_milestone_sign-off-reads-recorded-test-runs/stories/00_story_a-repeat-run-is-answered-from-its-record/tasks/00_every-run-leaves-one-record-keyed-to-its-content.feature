@executable @cli @work @validate
Feature: every run leaves one record keyed to its content

  WHY. A record can only stand in for a run when it names exactly what was run, and on what. The key
  is the content of the working tree with untracked files included (ADR-001 §2). A key built from
  HEAD, `git status` or mtimes would answer a changed tree from an unchanged one, which is m167/01
  R1's near-miss. The record is written by the command and by nothing else (§1, FF-19001), and it
  lives under the git common dir, so writing it never changes a key and every worktree of the clone
  sees it (§5).
  The cases drive `record.mjs` and `runTest` against a temp git repo with an injected runner, never
  against this repo's `.git`.

  Rule: R1 · A run on content already tested is not run again

    Scenario: E1 · a launched run writes one record naming its content
      Given a temp git repo with a declared test runner and one suite file
      When `aof test --scope file <suite>` launches and the runner exits 0
      Then exactly one record is added under `<git common dir>/aof/test-records/`
      And the record's key equals the tree id of the working tree with untracked files added
      And the record names the platform, the architecture and node's major version
      And the record names the scope `file`, the selected file, the result `green` and the exit code 0

    Scenario Outline: the key follows the content and nothing else
      Given a temp git repo whose working-tree key is K
      When <change>
      Then the working-tree key is <key>

      Examples:
        | example | change                                                    | key              |
        |         | nothing changes                                           | K                |
        | E2      | one tracked file's content changes                        | different from K |
        | E3      | a new untracked file is created                           | different from K |
        |         | a new file matching `.gitignore` is created               | K                |
        |         | a file under `wiki/work/` changes                         | different from K |
        |         | the same change is staged with `git add`                  | the same as unstaged |

    Scenario: computing the key leaves the operator's index untouched
      Given a temp git repo with one staged and one unstaged change
      When the key is computed
      Then `git diff --cached --name-only` lists the same file it listed before
      And no throwaway index file is left in the git directory

    Scenario: a project outside git runs and records nothing
      Given a project directory that is not a git repository, with a declared test runner
      When `aof test --scope file <suite>` runs
      Then the runner is launched
      And no record is written
      And the summary line says `not recorded: no git`

    Scenario Outline: the record names the result of the run it records
      Given a temp git repo with a declared test runner
      When a run ends <how>
      Then its record's result is `<result>`

      Examples:
        | how                                         | result       |
        | with exit 0 and no failing case             | green        |
        | with a failing case                         | red          |
        | with exit 1 and no failing case enumerated  | red          |
        | at the toolchain deadline                   | not-finished |

    Scenario: the store keeps the newest 200 records
      Given a store holding 200 records
      When one more run is recorded
      Then the store holds 200 records
      And the oldest record is the one that was removed

    Scenario: FF-19001 · a test record has one writer
      When `test/arch/testing/acd-test-record-one-writer.test.mjs` runs
      Then it fails if a module other than `packages/work/src/testing/record.mjs` writes under `aof/test-records`
      And it fails if any command's input schema carries a field named `result`, `failures` or `record`

    Scenario: FF-19004 · the content key has one producer
      When `test/arch/testing/acd-test-record-one-writer.test.mjs` runs
      Then it fails if a module other than `packages/work/src/testing/record.mjs` spawns `git write-tree` or sets `GIT_INDEX_FILE`
