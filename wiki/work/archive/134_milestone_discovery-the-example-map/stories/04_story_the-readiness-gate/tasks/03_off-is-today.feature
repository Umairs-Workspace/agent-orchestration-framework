@executable @cli @work @validate
Feature: FF-13403 — with the examples gate off, the doctor and the continue door are exactly what they are today

  WHY. Discovery costs a person's time, so a project opts in, and a project that has not must see
  nothing change (ADR-006 §3; the SPEC's "with the key off, refine is byte-for-byte what it is
  today"). The gate has three code readers, all landing in this story: the snapshot probe, the lane
  and the continue door. FF-13403 holds all three at once, over the worst map a story could carry,
  so a reader that forgets to ask the resolver is caught by the control rather than by a project
  whose stream turns red the day it upgrades.

  The control is `test/arch/examples/acd-examples-off-is-today.test.mjs`, registered through
  `test/arch/examples/index.mjs`. Its red probe is recorded in the milestone `VERIFICATION.md`
  fitness register: what was changed to make it fail, and the message observed.

  RULINGS (QA, 2026-09-24).
  (1) Every value `examplesEnabledFromConfig` resolves off is off here, a mistyped one included.
  (2) The with/without comparison pins the freshness lane's inputs rather than excluding its
      codes: `newestFileMtimeMs` (the newest file in the item folder) would otherwise differ
      between the runs, since writing or deleting `EXAMPLES.md` moves it. With every file's mtime
      inside the `updated` day and one `now`, a remaining difference is a real one.

  RULINGS (developer feasibility, 2026-09-24).
  (1) QA ruling (2) is sound, measured: with the gate off, the one snapshot input a map file moves
      is `newestFileMtimeMs`, of the story and of its milestone, whose walk recurses. The folder's
      own `mtimeMs` is read by no lane, and `isControlFileName("EXAMPLES.md")` is false. With every
      file under `134/04` at one noon, `STORY.md` holds both walks' newest where it was.
  (2) The snapshot row is read from `buildSnapshot` called with the options `doctorWork` passes
      (task 01, developer ruling 3).
  (3) The mistyped rows reach the door: neither `loadWorkspace` nor either command validates the
      config. Their diagnostics are `aof project validate`'s (02).

  Background:
    Given a fixture project in a fresh temp directory, with `AOF_GLOBAL_HOME` set to another fresh temp directory
    And its work stream holds the milestone `134` and the story `134/04`, both `in-progress`
    And `134/04` holds an `EXAMPLES.md` of 60 lines whose map holds Q1 `business · open`, an example `[confirmed]` no answer stands behind, a malformed line, a rule with no example and five rules
    And no run of `134/04` or `134` carries an answer

  Scenario Outline: the gate off yields no example finding, no map on the row and no refusal — <configured>
    Given the project's config sets `work.examples` to <config>
    When `doctorWork` runs over the stream, and `aof work continue 134/04 --json` is run from the fixture project's root
    Then no finding's code starts with `example-`
    And no `doc-over-budget` finding names `EXAMPLES.md`
    And `134/04`'s snapshot row carries `examplesMap: null` and no `docSizes` key `EXAMPLES.md`
    And the continue is not refused

    Examples:
      | configured | config               |
      | absent     | nothing              |
      | false      | `{ enabled: false }` |
      | a string   | `{ enabled: "yes" }` |
      | a misspelt key | `{ enable: true }` |
      | not an object | `true`            |

  Scenario: the same fixture with the gate on is caught, so the control is not vacuous
    Given the project's config sets `work.examples` to `{ enabled: true }`
    When `doctorWork` runs over the stream, and `aof work continue 134/04 --json` is run
    Then all five `example-*` codes are reported for `134/04`
    And one `doc-over-budget` finding names `EXAMPLES.md`
    And the continue is refused with `examples-question-open`

  Scenario: the gate off leaves the doctor's findings exactly those of a stream with no map
    Given the project's config sets no `work.examples`
    And before each run every file under `134/04` has its mtime set to noon of the day `134/04`'s date-only `updated` names
    When `doctorWork` runs over the stream with one injected `now`, once with `134/04`'s `EXAMPLES.md` and once with it removed
    Then the two finding lists deep-equal, every code compared
