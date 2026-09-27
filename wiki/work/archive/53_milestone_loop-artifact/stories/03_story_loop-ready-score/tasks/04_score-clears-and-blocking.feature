@executable @cli @work @validate
Feature: The arithmetic and the rung — equal weights, `not-applicable` out of the denominator, and `blocking` naming what holds `clears` down

  `score = round(100 * passed / applicable)`, with equal weights, stated as a decision rather than
  discovered (ADR-007 §6): there is no evidence in this repo for any other weighting, and a
  weighted score would be a fabricated number reported as a measurement — 52/ADR-006's discipline.
  `passed` counts rows whose state is `pass`; `applicable` counts rows whose state is `pass` or
  `fail`; `not-applicable` rows are in neither. `score` is always an integer, and the tie-break is
  half-away-from-zero — pinned now, at a denominator this milestone's command path cannot reach,
  because 55 widens the check set additively and a rounding rule discovered later is a rounding
  rule that already shipped wrong. Two things ADR-007 leaves to this contract are pinned here.
  **`applicable === 0`**: the four base rows are ALWAYS applicable in 53, so the command path
  cannot produce it — but the arithmetic must still be total, so the pure scorer answers `score:0,
  clears:"none", blocking:[]` on an all-`not-applicable` set, never `NaN`, never `null`, never a
  fabricated 100; nothing measured is not a pass, and this repo's whole TECH_DEBT ledger is a
  catalogue of green-because-nothing-ran (items 5, 11, 27). **The rungs**: `clears` is `"none"`
  when `stream-coherent` fails, because every rung — even L1's byte-level read-only walk (ADR-006
  §3) — reads the work stream and an `error`-severity finding means the read itself is
  untrustworthy; `"L1"` when `stream-coherent` passes and any other applicable check fails; `"L2"`
  when every applicable check passes. `"L3"` never appears (ADR-006 §1) — 55 adds it with its own
  bar. `blocking` is exactly the ids of the `fail` rows, in the frozen `checks` order, and is empty
  if and only if `clears` is `"L2"`. Score and rung are DIFFERENT questions and the tables below
  prove it: a repo can read 75 and clear nothing. Mechanised as `test/loop-ready-score.test.mjs` —
  a NEW suite reusing `test/doctor-command-core.test.mjs`'s harness SHAPE, that file's ONLY edit
  being ADR-014's one-line envelope widening (superseding ADR-011 §3) — two ways: the command-path
  rows over a `mkdtemp` fixture repo
  through `invoke("work:doctor", …)` and a spawned `aof work doctor --json`, and the denominators
  53's command path cannot reach through the pure exported scorer of
  `src/work-doctor-loop-ready.mjs` called on injected plain data, all under an isolated
  `AOF_GLOBAL_HOME`, and imported AND spread in `scripts/test.mjs` inside this story's own labelled
  `// milestone 53 / story 03` block so the evidence lands with the contract (ADR-011 §1,
  TECH_DEBT item 48).
  ADR-007 §4, §6, §7; ADR-006 §1, §3; 52/ADR-006.

  Scenario: the score is the equally-weighted fraction of applicable rows
    Given a fixture work stream
    When `aof work doctor --json` runs
    Then `passed` is the count of `checks` rows whose state is `pass`
    And `applicable` is the count of rows whose state is `pass` or `fail`
    And `score` is `round(100 * passed / applicable)`
    And no row contributes more than any other

  Scenario: swapping WHICH check fails never moves the score
    Given a fixture with no `loops/` directory and exactly one failing base check
    When the failing check is `stream-coherent`, then `cap-declared`, then `memory-on`, then `tasks-authored` in turn
    Then `score` is 75 in all four runs
    And `passed` is 3 and `applicable` is 4 in all four runs
    And only `clears` and `blocking` differ between them

  Scenario: `score` is always an integer
    Given every fixture in this feature's tables
    When `aof work doctor --json` runs over each
    Then `score` is an integer
    And it is never a float, never NaN, never null, never a string
    And it never exceeds 100 and is never below 0

  Scenario: the rounding rule is half away from zero, pinned before 55 can discover it
    Given the pure scorer of `src/work-doctor-loop-ready.mjs` called on injected check sets
    When the exact percentage lands on a half
    Then 1 of 8 applicable rows scores 13, not 12
    And 3 of 8 scores 38, 5 of 8 scores 63, 7 of 8 scores 88
    And denominators 3 and 8 are unreachable from `aof work doctor` in milestone 53 — 55 widens the set, and the rule must already be pinned when it does

  Scenario: `applicable === 0` is total arithmetic, and it fails closed
    Given the pure scorer called on a check set in which every row is `not-applicable`
    When the score is computed
    Then `applicable` is 0 and `passed` is 0
    And `score` is 0
    And `clears` is `none`
    And `blocking` is empty
    And no division by zero reaches the document — `score` is never NaN and never null
    And `score` is not 100 — nothing measured is not a pass

  Scenario: `applicable === 0` cannot be reached from the command in milestone 53
    Given a fixture work stream, with and without a `loops/` directory
    When the four base checks are driven through every one of their 16 pass/fail combinations
    Then `applicable` is 4 or 9 in every run
    And it is never 0
    And the four base rows are never `not-applicable`

  Scenario: `clears` is `none` when `stream-coherent` fails, whatever the score
    Given a fixture with no `loops/` directory whose `cap-declared`, `memory-on` and `tasks-authored` all pass
    And an `error`-severity doctor finding in scope
    When `aof work doctor --json` runs
    Then `score` is 75
    And `clears` is `none`
    And `blocking` is exactly `stream-coherent`
    And a high score does not buy a rung — they answer different questions

  Scenario: `clears` is `L1` when the stream is coherent and something else fails
    Given a fixture with no `loops/` directory, zero `error`-severity findings, and `memory-on` failing
    When `aof work doctor --json` runs
    Then `clears` is `L1`
    And `blocking` is exactly `memory-on`
    And a read-only walk is defensible where an executing one is not

  Scenario: `clears` is `L2` only when every applicable check passes
    Given a fixture with no `loops/` directory and all four base checks passing
    When `aof work doctor --json` runs
    Then `clears` is `L2`
    And `blocking` is empty
    And `score` is 100

  Scenario: a composed loop row holds `clears` down exactly like a base row
    Given a fixture with a `loops/` registry whose `grounding` reports findings
    And all four base checks passing and the other four composed rows passing
    When `aof work doctor --json` runs
    Then `passed` is 8 and `applicable` is 9
    And `score` is 89
    And `clears` is `L1`
    And `blocking` is exactly `grounding`

  Scenario: `blocking` is empty if and only if `clears` is `L2`
    Given every fixture of the tables below
    When `aof work doctor --json` runs over each
    Then `blocking` is empty in exactly the runs whose `clears` is `L2`
    And `blocking` is non-empty in every run whose `clears` is `none` or `L1`

  Scenario: `blocking` names every failing check, in the frozen order
    Given a fixture in which `stream-coherent`, `memory-on` and `timescale` all fail
    When `aof work doctor --json` runs
    Then `blocking` is exactly `stream-coherent`, `memory-on`, `timescale` in that order
    And the order is `checks`' frozen order, never discovery order and never alphabetical
    And every id in `blocking` names a row whose state is `fail`
    And every row whose state is `fail` is named in `blocking`

  Scenario: `L3` never appears, at any score, with or without a registry
    Given every fixture of the tables below
    When `aof work doctor --json` runs over each
    Then `clears` is never `L3`
    And `blocking` never names `L3`
    And 55 is the milestone that adds the rung, together with the anchors that make the claim defensible

  Scenario: the rung is advisory — it refuses nothing in this milestone
    Given a fixture whose `clears` is `none`
    When `aof work doctor --json` runs
    Then the exit code is decided by the finding set alone
    And no finding is emitted naming the rung
    And `healthy`, `strict`, `errors` and `warnings` are byte-identical to the same fixture at `clears: L2` with the same findings

  Examples: registry absent — the 16 base combinations, exhaustively
    | stream-coherent | cap-declared | memory-on | tasks-authored | passed | applicable | score | clears | blocking                                                  |
    | pass            | pass         | pass      | pass           | 4      | 4          | 100   | L2     | —                                                         |
    | pass            | pass         | pass      | fail           | 3      | 4          | 75    | L1     | tasks-authored                                            |
    | pass            | pass         | fail      | pass           | 3      | 4          | 75    | L1     | memory-on                                                 |
    | pass            | pass         | fail      | fail           | 2      | 4          | 50    | L1     | memory-on, tasks-authored                                 |
    | pass            | fail         | pass      | pass           | 3      | 4          | 75    | L1     | cap-declared                                              |
    | pass            | fail         | pass      | fail           | 2      | 4          | 50    | L1     | cap-declared, tasks-authored                              |
    | pass            | fail         | fail      | pass           | 2      | 4          | 50    | L1     | cap-declared, memory-on                                   |
    | pass            | fail         | fail      | fail           | 1      | 4          | 25    | L1     | cap-declared, memory-on, tasks-authored                   |
    | fail            | pass         | pass      | pass           | 3      | 4          | 75    | none   | stream-coherent                                           |
    | fail            | pass         | pass      | fail           | 2      | 4          | 50    | none   | stream-coherent, tasks-authored                           |
    | fail            | pass         | fail      | pass           | 2      | 4          | 50    | none   | stream-coherent, memory-on                                |
    | fail            | pass         | fail      | fail           | 1      | 4          | 25    | none   | stream-coherent, memory-on, tasks-authored                |
    | fail            | fail         | pass      | pass           | 2      | 4          | 50    | none   | stream-coherent, cap-declared                             |
    | fail            | fail         | pass      | fail           | 1      | 4          | 25    | none   | stream-coherent, cap-declared, tasks-authored             |
    | fail            | fail         | fail      | pass           | 1      | 4          | 25    | none   | stream-coherent, cap-declared, memory-on                  |
    | fail            | fail         | fail      | fail           | 0      | 4          | 0     | none   | stream-coherent, cap-declared, memory-on, tasks-authored  |

  Examples: registry present — the denominator is 9 and the rounding shows
    | passed | applicable | exact percent | score | rounds        | clears (stream-coherent passing) |
    | 0      | 9          | 0             | 0     | exact         | none — stream-coherent is among the failures |
    | 1      | 9          | 11.11…        | 11    | down          | L1                               |
    | 2      | 9          | 22.22…        | 22    | down          | L1                               |
    | 3      | 9          | 33.33…        | 33    | down          | L1                               |
    | 4      | 9          | 44.44…        | 44    | down          | L1                               |
    | 5      | 9          | 55.55…        | 56    | up            | L1                               |
    | 6      | 9          | 66.66…        | 67    | up            | L1                               |
    | 7      | 9          | 77.77…        | 78    | up            | L1                               |
    | 8      | 9          | 88.88…        | 89    | up            | L1                               |
    | 9      | 9          | 100           | 100   | exact         | L2                               |

  Examples: the rounding rule over every denominator, including those only 55 will reach
    | applicable | passed | exact percent | score | note                                              |
    | 4          | 0      | 0             | 0     | command path, registry absent                     |
    | 4          | 1      | 25            | 25    | exact                                             |
    | 4          | 2      | 50            | 50    | exact                                             |
    | 4          | 3      | 75            | 75    | exact                                             |
    | 4          | 4      | 100           | 100   | exact                                             |
    | 9          | 1      | 11.11…        | 11    | rounds down                                       |
    | 9          | 5      | 55.55…        | 56    | rounds up                                         |
    | 9          | 8      | 88.88…        | 89    | rounds up                                         |
    | 3          | 1      | 33.33…        | 33    | pure seam only — rounds down                      |
    | 3          | 2      | 66.66…        | 67    | pure seam only — rounds up                        |
    | 8          | 1      | 12.5          | 13    | pure seam only — the tie, half away from zero     |
    | 8          | 3      | 37.5          | 38    | pure seam only — the tie                          |
    | 8          | 5      | 62.5          | 63    | pure seam only — the tie                          |
    | 8          | 7      | 87.5          | 88    | pure seam only — the tie                          |
    | 0          | 0      | undefined     | 0     | pure seam only — `applicable === 0` fails closed  |

  Examples: the rung is decided by which checks fail, not by the number
    | stream-coherent | any other applicable check failing | clears | blocking empty |
    | pass            | no                                 | L2     | yes            |
    | pass            | yes                                | L1     | no             |
    | fail            | no                                 | none   | no             |
    | fail            | yes                                | none   | no             |
