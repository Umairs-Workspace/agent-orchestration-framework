@executable @cli @work @validate
Feature: a gate that did not finish resumes on the same content

  WHY. A `not-finished` row is no verdict on the code (160/ADR-006). Today its only repair is
  another whole-tree run, which pays again for every unit that already finished. A resume runs only
  what did not finish, and only on the content the finished units ran on. Half a run of one tree
  plus half a run of another is no run of either (ADR-005 §1). The resume appends one combined row,
  and the accept door reads it like any other (§3, §5).
  The cases drive the gate command with a fake sharded runner that writes a planted report, against
  a temp git repo, with `test/support/regression-gate-fixture.mjs`.

  Rule: R1 · A gate that did not finish resumes on the same content

    Scenario: E1 · only the unfinished units run again, and one row records the whole
      Given 190's newest REGRESSION.md row is `not-finished`, from a run on content K whose report names 212 finished, 3 killed and 15 never-started units
      And the checkout is clean on content K
      When `aof work regression-gate 190 --resume` runs
      Then the sharded runner is launched with `--files` naming exactly the files of the 18 unfinished units
      And one row is appended whose result is `green`
      And its detail says `resumed from <the not-finished row's instant>: 18 of 230 units re-run`

    Scenario: E2 · a resumed unit that fails makes the combined row red
      Given the same `not-finished` run on content K
      When the resume's alone-retry fails `test/work/a.test.mjs`
      Then the appended row is `red` and its detail names `test/work/a.test.mjs`

    Scenario Outline: a resume refuses when there is nothing honest to resume
      Given 190's newest row is <row>
      And the clean checkout's content is <content>
      When `aof work regression-gate 190 --resume` runs
      Then it refuses with `<code>`
      And no runner is launched and no row is appended

      Examples:
        | example | row                              | content                    | code                                 |
        | E3      | `not-finished` on content K      | L, after a commit          | regression-gate-resume-tree-changed  |
        | E4      | `green`                          | K                          | regression-gate-nothing-to-resume    |
        |         | `red`                            | K                          | regression-gate-nothing-to-resume    |
        |         | `not-finished`, its report gone  | K                          | regression-gate-resume-report-missing |

    Scenario: a dirty checkout is refused before anything else
      Given 190's newest row is `not-finished` on content K
      And the checkout has an uncommitted change
      When `aof work regression-gate 190 --resume` runs
      Then it refuses as an unresumed gate run does, naming what is dirty

    Scenario: lanes that finished are not run again
      Given a `not-finished` run whose integration and cargo lanes finished green
      When it is resumed
      Then the sharded runner is launched with `--no-lanes`

    Scenario: a killed packed unit resumes all of its files
      Given a `not-finished` run in which the packed unit holding `x.test.mjs` and `y.test.mjs` was killed after `x.test.mjs` printed its `# file` line
      When it is resumed
      Then `--files` names both `x.test.mjs` and `y.test.mjs`

    Scenario: the sharded runner plans only the files it is named
      Given `scripts/test-sharded.mjs --plan --files <list>` with a list naming two registered suite files
      Then the printed plan holds units over those two files only
      And a named file that registers no case is refused by path
