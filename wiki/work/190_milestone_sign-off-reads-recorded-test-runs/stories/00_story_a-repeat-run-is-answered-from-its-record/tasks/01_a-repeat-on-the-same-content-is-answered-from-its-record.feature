@executable @cli @work @validate
Feature: a repeat on the same content is answered from its record

  WHY. The build terminator, three review lanes and the story verify each ask `aof test` the same
  question about the same diff. A suite run is deterministic on unchanged content, so every run
  after the first tells nobody anything new (ADR-002). `aof test` therefore answers a repeat from the
  record. A green record answers any question its run covered. A red record answers only the
  identical question, because a red is never split by file: a red answered as green for a subset is
  the confidently-wrong-once failure 72 exists to refuse (§1). An answer is never more of a verdict
  than the run it reuses (§5). It says so in both faces (§2). `--fresh` is how a flake is chased (§3).
  The cases use an injected runner that counts its launches.

  Rule: R1 · A run on content already tested is not run again

    Scenario: E1 · the same question on the same content launches nothing
      Given a green record for `--scope impacted --story 190/00` on the current content
      When `aof test --scope impacted --story 190/00` runs
      Then the runner is launched 0 times
      And the summary line says `answered from the run of <instant> (tree <first 7 of the key>)`
      And `--json` carries `reused` with the record's id and instant, and `launched: false`
      And the exit code is 0

    Scenario: E4 · a record from another platform does not answer
      Given a green record on the current content whose platform is `win32`
      And the current platform is `darwin`
      When the same question is asked
      Then the runner is launched once

  Rule: R2 · A red answer is only ever the answer to the same question

    Scenario Outline: which records answer which questions
      Given a <result> record on the current content that ran <recorded>
      When `aof test` is asked for <asked>
      Then the runner is launched <launches>

      Examples:
        | example | result       | recorded                             | asked                         | launches |
        | E7      | green        | `all`                                | `a.test.mjs`                  | 0 times  |
        |         | green        | `a.test.mjs` and `b.test.mjs`        | `a.test.mjs`                  | 0 times  |
        |         | green        | `a.test.mjs`                         | `a.test.mjs` and `b.test.mjs` | once     |
        |         | green        | `all` widened by `x.mjs (not-in-graph)` | `a.test.mjs`               | 0 times  |
        | E5      | red          | `a.test.mjs` and `b.test.mjs`        | `a.test.mjs` and `b.test.mjs` | 0 times  |
        | E6      | red          | `a.test.mjs` and `b.test.mjs`        | `a.test.mjs`                  | once     |
        | E8      | not-finished | `a.test.mjs`                         | `a.test.mjs`                  | once     |

    Scenario: E5 · an answered red is the recorded red
      Given a red record on the current content for `a.test.mjs` and `b.test.mjs` whose failure is `not ok - b refuses x`
      When the same two files are asked for
      Then the output prints `not ok - b refuses x` and its recorded message
      And the exit code is 1

    Scenario: an answer carries the selection's own gate flag
      Given a green `--scope all` record on the current content that widened nothing, so its `gate` is true
      When `aof test --scope impacted` is asked, and the selection is a proper subset
      Then the answer's `gate` is false
      And the summary line says `may not stand as a verdict`

  Rule: R4 · A deliberate repeat is labelled

    Scenario: E11 · `--fresh` runs and says so
      Given a green record for the question on the current content
      When the question is asked with `--fresh`
      Then the runner is launched once
      And the new record carries `fresh: true`
      And the summary line says `fresh run`

    Scenario: FF-19002 · no transition reads a test record
      When `test/arch/testing/acd-test-command-reports-not-decides.test.mjs` runs
      Then it fails if a module among the status, doctor, loop, audit or bundle doors FF-7204 censuses imports `packages/work/src/testing/record.mjs`
