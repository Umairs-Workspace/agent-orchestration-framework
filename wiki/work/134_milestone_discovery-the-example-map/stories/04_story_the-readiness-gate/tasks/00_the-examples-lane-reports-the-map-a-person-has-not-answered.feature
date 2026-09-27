@executable @cli @work @validate
Feature: The examples lane reports a story's open business question and every claim no person's answer stands behind

  WHY. A story's example map (ADR-001) makes two kinds of claim a builder will act on: that a
  business question is settled, and that an example was agreed by a person. Neither may rest on an
  agent's word (SPEC). The tenth doctor lane, `src/work/doctor-examples.mjs`, checks both against
  code: the parsed map (story 02's `parseExampleMap` and its queries) and the answers a person gave
  (story 03's `collectAnswers`, carried on the snapshot). It is pure over the snapshot, like every
  lane before it: it opens no file, reads no clock and reads the gate through the one resolver,
  `examplesEnabledFromConfig(ctx.config)` (ADR-006 §2).

  Its five codes and severities are ADR-005 §1's. It holds ONE pure function over a single map,
  `examplesFindings`, which the lane calls per story and the continue door (task 02) calls for one
  story, so the lane and the door cannot disagree (ADR-005 §4).

  | Code | Severity | Fires when |
  | `example-question-open` | error | a `business` question is not `answered` |
  | `example-provenance-unanchored` | error | a `confirmed` example, a `stated Q<n>` example or an `answered` question has no answer record for its token |
  | `example-map-malformed` | error | a line the grammar does not admit (every `MALFORMED_REASONS` entry) |
  | `example-rule-no-example` | warn | a rule with no example |
  | `example-map-too-many-rules` | warn | more than 4 rules |

  RULINGS (PO, 2026-09-24).
  (1) One finding per open question, per unanchored claim, per malformed line and per rule with no
      example; `example-map-too-many-rules` fires once per map. Each finding is anchored at the
      story's `EXAMPLES.md` path, and its message names the story ref, the map id (or the reason)
      and the map line.
  (2) A claim is anchored when `collectAnswers` returned a record whose `token` equals the claim's
      token (`provenanceClaims`, story 02). What the person answered is not read: the anchor proves
      a person was asked about that token and answered (ADR-003 §6). A record for another story's
      token anchors nothing.
  (3) The three error codes take the acceptance horizon (`severityFor`, `src/acceptance-horizon.mjs`):
      `error` while the story is open, `warn` once it is `done`, because a delivered map may no
      longer be edited and an error there is a red no legal act clears (the diagrams lane's
      precedent, 133/ADR-006). The two warn codes are `warn` always.
  (4) The lane gates, so its codes are exported as the frozen `EXAMPLE_LANE_CODES`, never as a
      `*_FINDING_CODES` array: that suffix is the advisory class's marker (FF-12402), and this lane
      is not in it.
  (5) The lane is silent for a row that carries no map (the gate off, a non-story, an absent
      `EXAMPLES.md`, a row another node holds), and for a not-applicable map.
  (6) The 4-rule split signal is a constant in the lane, not config: at discovery there are no tasks
      to measure a story's size against (ADR-005 §1).

  RULINGS (QA, 2026-09-24).
  (1) The codes compose. A `bad-class`/`bad-state` question is judged by its fail-closed reading
      (02, tasks/01 ruling 1) AND reported malformed: `policy · answered` with no answer is one
      malformed and one unanchored error. `[stated Q9]` naming no question is malformed AND a claim.
  (2) A `[confirmd]` line is no claim and no example, so its rule may report no example.
  (3) Two claims on one token are two findings when unanchored; one answer anchors both. Tokens
      match exactly (the lane does not trust `collectAnswers` to have filtered), whatever the answer says.

  RULINGS (developer feasibility, 2026-09-24).
  (1) The lane reads a row's `ref`, `dir`, `meta.status` and `examplesMap`. `examplesFindings({ ref,
      status, dir, text, answers })` is exported for the door, which passes its resolved row's `status`.
  (2) One control is edited to admit the lane: FF-5905's named roster gains `./doctor-examples.mjs`.
      FF-12402 skips a module with no `*_FINDING_CODES` export, and the determinism control's
      `doctor*.mjs` glob covers it, so neither is edited; both must stay green.

  Background:
    Given `examplesFindings`, `examplesGroup` and `EXAMPLE_LANE_CODES` are imported from `src/work/doctor-examples.mjs`
    And every snapshot below is a literal held in memory, and no file is read or written
    And "the gate on" is a `ctx.config` whose `work.examples.enabled` is `true`
    And "an answer for T" is a record `{ token: T, question, answer, toolUseId, sessionId, at, entrypoint }` of story 03's shape

  Scenario: the lane's codes are exactly ADR-005's five, frozen, and it is the tenth lane
    When `EXAMPLE_LANE_CODES` and `CHECK_GROUPS` from `src/work/doctor.mjs` are read
    Then `EXAMPLE_LANE_CODES` deep-equals `["example-question-open", "example-provenance-unanchored", "example-map-malformed", "example-rule-no-example", "example-map-too-many-rules"]` and is frozen
    And `examplesGroup` is the last entry of `CHECK_GROUPS`, after `diagramsGroup`
    And the module exports no name ending in `_FINDING_CODES`

  Scenario Outline: an open story's map is judged line by line — <case>
    Given the open story `134/04` whose map holds <map>
    And `collectAnswers` returned <answers> for it
    When `examplesGroup` runs over the snapshot with the gate on
    Then it reports <findings>

    Examples:
      | case | map | answers | findings |
      | a clean map | R1 with E1 `[proposed]` and E2 `[confirmed]`, and Q1 `business · answered` | an answer for `134/04 E2` and one for `134/04 Q1` | nothing |
      | an open business question | R1 with E1 `[proposed]`, and Q1 `business · open` | nothing | one `example-question-open` error naming Q1 |
      | a defaulted business question | R1 with E1 `[proposed]`, and Q1 `business · defaulted ADR-004` | nothing | one `example-question-open` error naming Q1 |
      | a technical open question | R1 with E1 `[proposed]`, and Q1 `technical · open` | nothing | nothing |
      | a misspelt provenance | R1 with E1 `[proposed]` and E2 `[confirmd]` | nothing | one `example-map-malformed` error naming E2's line and `bad-provenance`, and no `example-provenance-unanchored` |
      | a bad class, open | R1 with E1 `[proposed]`, and Q1 `policy · open` | nothing | one `example-map-malformed` error naming `bad-class`, and one `example-question-open` error naming Q1 |
      | a bad class, answered, no answer | R1 with E1 `[proposed]`, and Q1 `policy · answered` | nothing | one `example-map-malformed` error naming `bad-class`, and one `example-provenance-unanchored` error naming Q1 |
      | a bad class, answered and anchored | R1 with E1 `[proposed]`, and Q1 `policy · answered` | an answer for `134/04 Q1` | one `example-map-malformed` error naming `bad-class` |
      | a bad state | R1 with E1 `[proposed]`, and Q1 `business · Answered` | an answer for `134/04 Q1` | one `example-map-malformed` error naming `bad-state`, and one `example-question-open` error naming Q1 |
      | a stated example naming no question | R1 with E1 `[stated Q9]`, and no Q9 | nothing | one `example-map-malformed` error naming `stated-names-no-question`, and one `example-provenance-unanchored` error naming E1 and `134/04 Q9` |

  Scenario: every reason in MALFORMED_REASONS is one gating error
    Given for each reason in story 02's frozen `MALFORMED_REASONS`, an open story whose map's parse carries exactly one malformed entry of that reason
    When `examplesFindings` judges each map
    Then each yields exactly one `example-map-malformed` finding, at `error`, naming that reason and the entry's line

  Scenario Outline: a claim is anchored only by an answer for its own token — <examples> · <questions> · <answers>
    Given the open story `134/04` whose map holds R1 with <examples>, and the questions <questions>
    And `collectAnswers` returned <answers>
    When `examplesFindings` judges the map
    Then the `example-provenance-unanchored` findings are <unanchored>

    Examples:
      | examples | questions | answers | unanchored |
      | E1 `[confirmed]` | Q1 `business · answered` | an answer for `134/04 Q1` | one, naming E1 and the token `134/04 E1` |
      | E1 `[confirmed]` | Q1 `business · answered` | answers for `134/04 E1` and `134/04 Q1` | none |
      | E1 `[confirmed]` | Q1 `business · answered` | an answer for `134/04 E1` whose answer is `No, that is wrong`, and one for `134/04 Q1` | none |
      | E1 `[confirmed]` | Q1 `business · answered` | answers for `134/02 E1` and `134/04 Q1` | one, naming E1 and the token `134/04 E1` |
      | E1 `[confirmed]` | Q1 `business · answered` | answers for `134 E1` and `134/04 Q1` | one, naming E1 and the token `134/04 E1` |
      | E1 `[stated Q1]` | Q1 `business · answered` | an answer for `134/04 Q1` | none |
      | E1 `[stated Q1]` | Q1 `business · answered` | an answer for `134/02 Q1` | two, naming E1 and Q1, each on the token `134/04 Q1` |
      | E1 `[proposed]` | Q1 `business · answered` | nothing | one, naming Q1 and the token `134/04 Q1` |
      | E1 `[proposed]` | Q1 `technical · answered` | nothing | one, naming Q1 and the token `134/04 Q1` |
      | E1 `[proposed]` | Q1 `business · open` | nothing | none |
      | E1 `[confirmed]` and E2 `[stated Q2]` | Q1 `business · answered` and Q2 `business · answered` | an answer for `134/04 Q2` | two, naming E1 (`134/04 E1`) and Q1 (`134/04 Q1`) |

  Scenario Outline: the warn codes signal a rule not understood and a story too big — <case>
    Given the open story `134/04` whose map holds <map>, every claim in it anchored
    When `examplesGroup` runs over the snapshot with the gate on
    Then it reports <findings>

    Examples:
      | case | map | findings |
      | a rule with no example | R1 with E1 `[proposed]`, and R2 with none | one `example-rule-no-example` warn naming R2 |
      | a rule whose one example is misspelt | R1 with E1 `[confirmd]` | one `example-rule-no-example` warn naming R1, and one `example-map-malformed` error |
      | four rules | R1 to R4, each with one `[proposed]` example | nothing |
      | five rules | R1 to R5, each with one `[proposed]` example | one `example-map-too-many-rules` warn naming the count 5 and the limit 4 |
      | six rules | R1 to R6, each with one `[proposed]` example | one `example-map-too-many-rules` warn naming the count 6 and the limit 4 |
      | five rules, two with no example | R1 to R5, R1 to R3 each with one `[proposed]` example and R4 and R5 with none | one `example-map-too-many-rules` warn, and two `example-rule-no-example` warns naming R4 and R5 |
      | questions and no rule | only Q1 `technical · open` | nothing |

  Scenario Outline: the lane is silent where it has no map to judge — <case>
    Given <row>
    When `examplesGroup` runs over the snapshot with <gate>
    Then it reports nothing

    Examples:
      | case | row | gate |
      | the gate off | the open story `134/04` whose map holds Q1 `business · open` | `work.examples` absent |
      | the gate mistyped | the open story `134/04` whose map holds Q1 `business · open` | `work.examples` set to `{ enabled: "true" }` |
      | an absent map | the open story `134/04` whose row carries no map | the gate on |
      | not applicable | the open story `134/04` whose map is `Not applicable: a rename with no rule a person owns.` | the gate on |

  Scenario Outline: a delivered map's errors fall to warn, and its warns stay warn — <status>
    Given the story `134/04` at status <status> whose map holds Q1 `business · open`, E1 `[confirmed]` with no answer, a line `- E2 · x [confirmd]` under R1, and a rule R2 with no example
    When `examplesGroup` runs over the snapshot with the gate on
    Then `example-question-open`, `example-provenance-unanchored` and `example-map-malformed` are each reported at <severity>
    And `example-rule-no-example` is reported at `warn`

    Examples:
      | status        | severity |
      | `not-started` | `error`  |
      | `in-progress` | `error`  |
      | `in-review`   | `error`  |
      | `done`        | `warn`   |

  Scenario: a finding points at the file and the line a person must fix
    Given the open story `134/04` whose map holds Q1 `business · open` on line 9
    When `examplesGroup` runs over the snapshot with the gate on
    Then the one finding's `path` is `134/04`'s folder joined with `EXAMPLES.md`
    And its message holds `134/04`, `Q1` and `9`

  Scenario: the lane and the door ask the same function
    Given one map and one answer list
    When `examplesGroup` judges a snapshot whose one story row carries them, and `examplesFindings` judges them directly for the same story ref and status
    Then the two finding lists deep-equal

  Scenario: the lane is pure and deterministic
    Given a snapshot of three stories with maps, and a ctx with the gate on
    When `examplesGroup` runs over it twice
    Then the two results deep-equal
    And the source of `src/work/doctor-examples.mjs` imports no `node:fs`, `node:fs/promises` or `node:child_process`, and reads no `Date`
