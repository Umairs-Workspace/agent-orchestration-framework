@executable @cli @work @validate
Feature: The pure queries the gate composes, and the one token a question carries, live beside the grammar

  WHY. Story 04's lane and door judge a map by asking it five questions: which business questions
  are still open, which claims need a person's answer behind them, which rules have no example, how
  many rules there are, and which lines are malformed. If each caller computed those from the parsed
  value itself, the door and the lane could disagree, which is exactly what ADR-005 §4 forbids. So
  the queries are pure functions exported by `src/work-examples/map.mjs`, over the value
  `parseExampleMap` returns.

  Two rules are backed by code here and no more (ADR-004 §2): a business question is closed only
  by `answered`, so `defaulted` on a business question is open; and a question the grammar could not
  classify is already `business` when it reaches these queries.

  The token a question carries to a person (`<story ref> Q<n>`, or `<story ref> E<n>` when a
  proposed example is put to a person to confirm, ADR-003 §2) is how story 03's reader matches an
  answer to a map line. It is built and recognised by one pair of exported functions here, so the
  reader in 03 and the prose in 05 cannot spell it two ways (FF-13402).

  RULINGS (QA, 2026-09-24).
  (1) The queries read the parsed value only. A malformed question that still parsed (task 00,
      ruling 7) counts by its fail-closed reading: an unadmitted class is `business`, an
      unadmitted state is `open`.
  (2) `provenanceClaims(map, storyRef)` lists, in line order: every `confirmed` example (token
      `<ref> E<n>`), every `stated Q<n>` example (token `<ref> Q<n>`, the QUESTION's token, even
      when no such question exists), and every `answered` question of either class (token
      `<ref> Q<n>`). Claims sharing a token are each listed. `proposed` examples and questions
      that are not `answered` are not claims.
  (3) `mapToken(storyRef, id)` answers `<storyRef> <id>` with one space. The id matches `Q<n>` or
      `E<n>`, n a positive integer with no leading zero; the story ref is digits with an optional
      `/digits` part. Anything else, a non-string included, throws `TypeError`.
  (4) `readMapToken(text)` reads a token only at the very head of the text (no leading
      whitespace), followed by the end of the text, a space, or ` · `. It answers
      `{ storyRef, id }` or null, and never throws: it reads harness data, so a non-string is null.

  Background:
    Given `parseExampleMap`, `openBusinessQuestions`, `provenanceClaims`, `rulesWithoutExample`, `ruleCount`, `malformedLines`, `mapToken` and `readMapToken` are imported from `src/work-examples/map.mjs`
    And every map text below is held in memory

  Scenario Outline: a business question is open until it is answered — <class> · <state>
    Given a map whose `## Questions` section holds the one line `- Q1 · <class> · <state> · who may borrow?`
    When `openBusinessQuestions` is asked for the parsed map
    Then it answers <open>

    Examples:
      | class       | state                  | open            |
      | `business`  | `open`                 | Q1              |
      | `business`  | `answered`             | nothing         |
      | `business`  | `defaulted ADR-004`    | Q1              |
      | `technical` | `open`                 | nothing         |
      | `business`  | `asked`                | Q1              |
      | `business`  | `defaulted`            | Q1              |
      | `policy`    | `answered`             | nothing         |
      | `policy`    | `pending`              | Q1              |
      | `technical` | `pending`              | nothing         |
      | `technical` | `defaulted ADR-004`    | nothing         |

  Scenario Outline: each claim a person must stand behind is listed with the token it is anchored by — <claim>
    Given the map of story `134/02` whose line is <claim>
    When `provenanceClaims` is asked for the parsed map and the story ref `134/02`
    Then it lists <listed>

    Examples:
      | claim                                                                          | listed                                                  |
      | example `- E2 · active loan, two payments in arrears → not offered [confirmed]` | one claim for E2, provenance `confirmed`, token `134/02 E2` |
      | example `- E3 · a closed loan → offered [stated Q1]`                          | one claim for E3, provenance `stated`, token `134/02 Q1`    |
      | question `- Q1 · business · answered · who may borrow?`                       | one claim for Q1, state `answered`, token `134/02 Q1`       |
      | example `- E1 · a new customer → offered [proposed]`                          | nothing                                                  |
      | question `- Q1 · technical · answered · which seam?`                          | one claim for Q1, state `answered`, token `134/02 Q1`       |
      | question `- Q1 · policy · answered · who may borrow?`                         | one claim for Q1, state `answered`, token `134/02 Q1`       |
      | question `- Q1 · business · asked · who may borrow?`                          | nothing                                                  |
      | question `- Q1 · technical · defaulted ADR-004 · which seam?`                 | nothing                                                  |
      | example `- E3 · a closed loan → offered [stated Q9]`, with no Q9               | one claim for E3, provenance `stated`, token `134/02 Q9`    |
      | example `- E2 · active loan → not offered [confirmd]`                         | nothing                                                  |

  Scenario: the claims are listed in line order, and two claims on one token are both listed
    Given the map of story `134/02` with E1 `[proposed]`, E2 `[confirmed]` and E3 `[stated Q1]` under R1, and the questions Q1 `business · answered` and Q2 `business · open`
    When `provenanceClaims` is asked for the parsed map and the story ref `134/02`
    Then it lists exactly E2 (`134/02 E2`), E3 (`134/02 Q1`) and Q1 (`134/02 Q1`), in that order

  Scenario: the rule-level queries count what the lane warns on
    Given a map with rules R1 (two examples), R2 (no examples) and R3 (one example), and one malformed line
    When `rulesWithoutExample`, `ruleCount` and `malformedLines` are asked for the parsed map
    Then `rulesWithoutExample` answers R2 alone
    And `ruleCount` answers 3
    And `malformedLines` answers the one malformed entry, with its line, its text and its reason

  Scenario: a not-applicable map answers nothing to every query
    Given the map whose body is `Not applicable: a rename with no rule a person owns.`
    When each of the five queries is asked for the parsed map
    Then `openBusinessQuestions`, `provenanceClaims`, `rulesWithoutExample` and `malformedLines` each answer an empty list
    And `ruleCount` answers 0

  Scenario Outline: the token is built one way — <storyRef> · <id>
    When `mapToken` is called with <storyRef> and <id>
    Then it <answer>

    Examples:
      | storyRef     | id    | answer                     |
      | `134/02`     | `Q1`  | returns `134/02 Q1`        |
      | `134/02`     | `E2`  | returns `134/02 E2`        |
      | `134/02`     | `R1`  | throws a `TypeError`       |
      | `7/1`        | `Q12` | returns `7/1 Q12`          |
      | `134`        | `E3`  | returns `134 E3`           |
      | `134/02`     | `q1`  | throws a `TypeError`       |
      | `134/02`     | `Q01` | throws a `TypeError`       |
      | `134/02`     | `Q0`  | throws a `TypeError`       |
      | `134/02`     | `Q`   | throws a `TypeError`       |
      | `""`         | `Q1`  | throws a `TypeError`       |
      | `134/`       | `Q1`  | throws a `TypeError`       |
      | `134/02/1`   | `Q1`  | throws a `TypeError`       |
      | `M134`       | `Q1`  | throws a `TypeError`       |
      | `" 134/02"`  | `Q1`  | throws a `TypeError`       |
      | the number `134` | `Q1` | throws a `TypeError`     |

  Scenario Outline: a question's text is read for the token at its head, and only there — <text>
    When `readMapToken` is given the question text <text>
    Then it answers <read>

    Examples:
      | text                                                              | read                                    |
      | `134/02 E2 · active loan, two payments in arrears → not offered. Is that right?` | story ref `134/02`, id `E2` |
      | `134/02 Q1 · who may borrow?`                                     | story ref `134/02`, id `Q1`             |
      | `Is 134/02 Q1 settled?`                                           | null                                    |
      | `Which seam should the reader hang off?`                          | null                                    |
      | `134/02 Q1`                                                       | story ref `134/02`, id `Q1`             |
      | `134/02 Q1 who may borrow?`                                       | story ref `134/02`, id `Q1`             |
      | `134 E3 · a closed loan → offered?`                               | story ref `134`, id `E3`                |
      | `134/02 Q01 · who may borrow?`                                    | null                                    |
      | `134/02 q1 · who may borrow?`                                     | null                                    |
      | `134/02 R1 · who may borrow?`                                     | null                                    |
      | `134/02 Q1x · who may borrow?`                                    | null                                    |
      | `134/02 Q1· who may borrow?`                                      | null                                    |
      | `134/02  Q1 · who may borrow?`                                    | null                                    |
      | `" 134/02 Q1 · who may borrow?"`                                  | null                                    |
      | `undefined`                                                       | null, and it does not throw             |
      | the number `42`                                                   | null, and it does not throw             |

  Scenario: a token built by `mapToken` is read back by `readMapToken`
    Given the story refs `134/02`, `7/1` and `134`, and the ids `Q1`, `Q12` and `E3`
    When each token `mapToken` builds is put at the head of a question text followed by ` · the question`
    Then `readMapToken` answers the same story ref and the same id for every one
