@executable @cli @work @work-stream
Feature: The answers are stamped once onto the run record at settle, and collected for a story from settled and running runs alike

  WHY. Claude Code prunes transcripts, and they live on one machine (RESEARCH R6). A map delivered
  last month, or read on another node, must still find the person's answer behind its label. So the
  answer is copied once, at settle, onto the committed run record, by one writer, `recordAnswers` in
  `src/run-store.mjs`. `completeRun` calls it beside spend (ADR-003 §3). The writer validates what
  it is given and never overwrites a stamp. A transcript it cannot read leaves nothing written, and
  the gap is reported, never filled in.

  The answers ride the run's `brief`, as `brief.answers`, on the `recordAnchorReading` precedent.
  FF-6908 (m69) freezes the record's sixteen top-level keys and says later claims ride `brief`, so
  the stamp adds no seventeenth key (ruled at feasibility; ADR-003 §3's "onto the run record" holds).

  A story's answers are then read by `collectAnswers(story)` (ADR-003 §5): the stamped answers of
  the settled runs of the story and of its parent milestone, and, for a run still `running`, what
  the same reader returns live from that run's session. The discovery beat checks its map before its
  own run settles, so the live path is needed, and both paths go through one reader so they cannot
  disagree.

  RULINGS (developer feasibility, 2026-09-24).
  (1) `brief.answers` is written only by `recordAnswers`. It is a non-empty array of records, each
      `{ token, question, answer, toolUseId, sessionId, at, entrypoint }`: `entrypoint` a string or
      null, every other field a non-empty string, `token` one `readMapToken` reads. Anything else
      throws a typed error and writes nothing.
  (2) Stamped once: a run whose `brief` already holds `answers` is never re-stamped.
  (3) A transcript read that yields no tokened answer writes NOTHING, so `brief.answers` stays
      absent and a project that never asks is byte-for-byte what it is today (ADR-006 §3). Absent
      therefore means "not read, or nothing to record". Only an unreadable or missing transcript is
      reported (`reportDegrade`, as spend is); "no tokened answer" is not a fault.
  (4) A retry never inherits `brief.answers`: `carriedBrief` drops it beside `loop`, so a retry
      stamps its own session's answers.
  (5) `collectAnswers(story, opts)` takes a transcript directory, or resolves one from the project
      root the way the settle seam does (task 02). It returns only records whose token names this
      story, from the settled runs of the story and of its parent milestone and from any `running`
      run of either, de-duplicated on `(toolUseId, question)` and ordered by `at`.
  (6) The live path reads the running run's session with the same reader, with no baseline: a
      resumed session re-reads the same `toolUseId`s, which (5) folds into one.

  RULINGS (QA, 2026-09-24).
  (1) An empty array throws `answers-invalid`, as developer ruling (1) reads: the writer never
      stores an empty stamp, and the settle does not call it when the reader returns none.
  (2) The writer validates before it reads the run, so an invalid array throws even onto a
      stamped run. A valid array onto a stamped run returns without error and writes nothing: the
      run file stays byte-identical, as spend's already-settled case does.
  (3) A record carries exactly the seven keys: a missing key (`entrypoint` included) or an extra
      one throws. `token` must be the whole token, `mapToken` of what `readMapToken` reads from it,
      so a full question text is refused. The writer does not filter by story.
  (4) At settle, a null `sessionId`, a missing transcript and an empty transcript are each
      reported, as spend reports them. A transcript that reads but yields no record, whether its
      lines are untokened, refused or not JSON, is not reported.
  (5) "Settled" is any terminal run: `done`, `failed` or `cancelled`. Ties on `at` keep the stamp's own order.

  RULINGS (PO, 2026-09-24).
  (1) Answers are stamped on every terminal outcome, `cancelled` included: the person answered
      whatever became of the run afterwards.
  (2) A non-string answer gives no record (QA ruling on task 00). `multiSelect` is unmeasured, and
      dropping fails closed: the example stays unanchored and is asked again.
  (3) A transcript that reads but holds no parseable line is "nothing to record" for the answer
      stamp and is not reported by it. The spend stamp already reports that transcript.

  Background:
    Given a fixture project in a fresh temp directory, with `AOF_GLOBAL_HOME` set to another fresh temp directory
    And a fixture transcript store in a third fresh temp directory, passed to every call as its transcript directory
    And the fixture milestone `134` holding the fixture stories `134/02` and `134/04`
    And "a valid record for T" is `{ token: T, question, answer, toolUseId, sessionId, at, entrypoint: "cli" }`, whose `question` opens with T and whose other fields are non-empty strings

  Scenario Outline: the writer validates before it writes — <given>
    Given a settled run of `134/02` whose `brief.answers` is <before>
    When `recordAnswers` is called for that run with <given>
    Then it <outcome>
    And the run record's `brief.answers` is <after>

    Examples:
      | before                                          | given                                                                  | outcome                                   | after                                                 |
      | absent                                          | an array of a valid record for `134/02 Q1`                             | returns without error                     | that one record                                       |
      | absent, on a run with no `brief` at all         | an array of a valid record for `134/02 Q1`                             | returns without error                     | that one record                                       |
      | absent, beside one `anchorReadings` entry       | an array of a valid record for `134/02 Q1`                             | returns without error                     | that one record, and the `anchorReadings` entry kept  |
      | absent                                          | valid records for `134/02 Q1` and `134/02 Q2`, one `toolUseId`         | returns without error                     | both records, in the order given                      |
      | absent                                          | an array of a valid record for `134/04 Q1`                             | returns without error                     | that one record                                       |
      | absent                                          | a valid record for `134/02 Q1` with `entrypoint: null`                 | returns without error                     | that one record, with `entrypoint: null`              |
      | absent                                          | the empty array `[]`                                                   | throws `answers-invalid`                  | absent                                                |
      | absent                                          | `null`                                                                 | throws `answers-invalid`                  | absent                                                |
      | absent                                          | a valid record for `134/02 Q1` not wrapped in an array                 | throws `answers-invalid`                  | absent                                                |
      | absent                                          | a valid record for `134/02 Q1` with no `sessionId`                     | throws `answers-invalid`                  | absent                                                |
      | absent                                          | a valid record for `134/02 Q1` with `answer: ""`                       | throws `answers-invalid`                  | absent                                                |
      | absent                                          | a valid record for `134/02 Q1` with `entrypoint: 1`                    | throws `answers-invalid`                  | absent                                                |
      | absent                                          | a valid record for `134/02 Q1` with no `entrypoint` key                | throws `answers-invalid`                  | absent                                                |
      | absent                                          | a valid record for `134/02 Q01`                                        | throws `answers-invalid`                  | absent                                                |
      | absent                                          | a valid record whose token is `134/02 Q1 · who may borrow?`            | throws `answers-invalid`                  | absent                                                |
      | absent                                          | a valid record for `134/02 Q1` with an extra key `person`              | throws `answers-invalid`                  | absent                                                |
      | absent                                          | a valid record for `134/02 Q1`, then one with `toolUseId: ""`          | throws `answers-invalid`                  | absent                                                |
      | a valid record for `134/02 Q1`                  | an array of a valid record for `134/02 E2`                             | returns without error and writes nothing  | the `134/02 Q1` record alone, the file byte-identical |
      | a valid record for `134/02 Q1`                  | a valid record for `134/02 E2` with no `sessionId`                     | throws `answers-invalid`                  | the `134/02 Q1` record alone, the file byte-identical |

  Scenario: settle stamps the answers beside spend, from the run's own session
    Given a running run of `134/02` whose `sessionId` names a fixture transcript holding one answered question `134/02 Q1 · who may borrow?`
    When `completeRun` settles it `done` with the fixture transcript directory
    Then the committed run record's `brief.answers` holds the one record for `134/02 Q1`
    And its state, outcome and lineage are what they would be with no transcript at all

  Scenario Outline: a settle with no answer to stamp writes none, and says so only when it could not read — <case>
    Given a running run of `134/02` <case>
    When `completeRun` settles it `done` with the fixture transcript directory
    Then the run settles `done`
    And the run record's `brief` holds no `answers`
    And <report>

    Examples:
      | case                                                                    | report                                                   |
      | whose `sessionId` is null                                               | a degrade from `run-store` names the answers as unread   |
      | whose `sessionId` names no transcript in the directory                  | a degrade from `run-store` names the answers as unread   |
      | whose session's `.jsonl` is empty                                       | a degrade from `run-store` names the answers as unread   |
      | whose session's transcript holds one answered, untokened question       | no degrade names the answers                             |
      | whose session's transcript holds one refused call asking `134/02 Q1 · who?` | no degrade names the answers                         |
      | whose session's transcript is only lines that are not JSON              | no degrade names the answers                             |
      | whose session's transcript holds no human-input call at all             | no degrade names the answers                             |

  Scenario Outline: a story's answers are collected from where they live — <source>
    Given <source>
    When `collectAnswers` is called for `134/02` with the fixture transcript directory
    Then it returns <returned>

    Examples:
      | source                                                                                                         | returned                                          |
      | a `done` run of `134/02` stamped with a record for `134/02 Q1`                                                 | that one record                                   |
      | a `failed` run of `134/02` stamped with a record for `134/02 Q1`                                               | that one record                                   |
      | a `done` run of milestone `134` stamped with records for `134/02 Q1` and `134/04 Q1`                           | the `134/02 Q1` record alone                      |
      | a `done` run of `134/04` stamped with a record for `134/02 Q1`                                                 | an empty list                                     |
      | a `done` run of `134/02` stamped with a record for the milestone token `134 Q1`                                | an empty list                                     |
      | a `running` run of `134/02` whose session's transcript holds an answered `134/02 Q1`                           | that one record, read live                        |
      | a `running` run of milestone `134` whose session's transcript holds an answered `134/02 E2`                    | that one record, read live                        |
      | a `running` run of `134/02` whose session's transcript holds `134/02 Q1` asked and not yet answered            | an empty list                                     |
      | a `running` run of `134/02` whose `sessionId` is null                                                          | an empty list, without throwing                   |
      | a `running` run of `134/02` whose session names no transcript in the directory                                 | an empty list, without throwing                   |
      | a `failed` run and its retry, both of `134/02`, each stamped with the same `134/02 Q1` record                   | one `134/02 Q1` record                            |
      | a `done` run of `134/02` stamped with `134/02 Q1`, and a `running` run whose session re-reads that `toolUseId` | one `134/02 Q1` record                            |
      | a `done` run of `134/02` stamped with `134/02 Q1` and `134/02 Q2` under one `toolUseId`                        | both records                                      |
      | a `done` run of `134/02` with no `brief.answers`                                                               | an empty list                                     |
      | no run of `134/02` or `134` at all                                                                             | an empty list                                     |
      | a run stamped `134/02 Q2` at `10:05`, minted before a run stamped `134/02 Q1` at `10:00`, on two sessions      | `134/02 Q1` then `134/02 Q2`                      |
      | a `done` run of `134/02` stamped with `134/02 Q1`, whose session's transcript has since been deleted           | that one record, from the stamp                   |

  Scenario: a settled run and a running run over the same session answer the same records
    Given one fixture transcript holding answered questions `134/02 Q1` and `134/02 E2`
    And a running run of `134/02` on that session, whose live answers `collectAnswers` returns
    When that run is settled `done` and `collectAnswers` is called again
    Then the second call returns the same records, in the same order, as the first
