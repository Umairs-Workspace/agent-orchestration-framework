@executable @cli @work @work-stream
Feature: `aof work continue <story>` refuses while the story's map carries an error, and a milestone continue refuses no one

  WHY. The doctor reports; the build door is where a story built on an unasked business rule is
  actually stopped (ADR-005 §4). `aof work continue <story>` opens build, so with the gate on it
  refuses with `examples-question-open` (409) while the story's map has an error-severity finding.
  It judges the map by calling the lane's own pure function, `examplesFindings`, over the map text
  and `collectAnswers`, so the door and `aof work doctor` cannot disagree about one story.

  A milestone continue refuses no one. Its per-story walk meets the door story by story, and one
  blocked story must not halt the wave (ADR-005 §4, research §6).

  RULINGS (PO, 2026-09-24).
  (1) The door refuses on ANY error-severity finding `examplesFindings` returns, the malformed code
      included, under the one code `examples-question-open`. A misspelt label must not slip past the
      gate (ADR-001 §2), and a map the parser cannot read is not a map whose questions are closed.
      The refusal's message names the story ref and each finding's code, id and line.
  (2) Only the `continue` phase refuses. The `refine` door opens the Contract stage, where the
      questions are asked (story 05); the `verify` door judges a built story. Neither is refused.
  (3) The door refuses before anything else happens: no status move, no assignment and no
      dispatch. It runs after the backlog refusal, so a backlog ref is still `phase-backlog-ref`.
  (4) The door judges the map this node holds. A story with no local folder (a cache-answered row)
      has no map here to read and is not refused; its own node's door meets it.
  (5) Gate off, a story with no `EXAMPLES.md`, a not-applicable map, and a map whose only findings
      are warnings are each not refused.
  (6) A `done` story is not refused: the lane's errors fall to warn at the acceptance horizon
      (task 00, ruling 3), and the door refuses on error severity only.

  RULINGS (QA, 2026-09-24).
  (1) The door's answers are `collectAnswers`'s, whole: a stamp on the milestone's run and a live
      `running` run of the story each anchor; a stamp for another story's token anchors nothing.
  (2) A `--node` naming another node is refused the same way, and before any assignment is written.
  (3) An empty `EXAMPLES.md` is `empty-map`, an error, so it is refused (task 01, QA ruling 1).

  RULINGS (developer feasibility, 2026-09-24).
  (1) The door sits after the backlog refusal and before `readExecutionOverlay`, on the row
      `resolveItemExact` has already returned, so it precedes the local status move, the `--node`
      dispatch and the `running` answer. It judges a row whose `type` is `story` and whose `dir` is a
      string. A cache-only row has no `dir` and goes on to today's path.
  (2) It reads `EXAMPLES_DOC` in the row's `dir`, calls `collectAnswers(row, { workspace:
      ctx.workspace })`, which resolves the transcript directory as the doctor command does (task 01,
      developer ruling 1), and judges with `examplesFindings` at the row's `status`. In a CLI run the
      fixture store is handed in as `CLAUDE_CONFIG_DIR`.
  (3) The refusal carries `error.detail = { ref, findings }`: the error-severity findings
      themselves, on the status door's `artifact-budget-exceeded` precedent. `--json` prints them. A
      finding's message carries its id (a malformed line's reason) and its line.
  (4) A story the overlay reports running is judged too. While its map holds an error it is refused
      rather than answered `running`, which follows from PO ruling (3).

  Background:
    Given a fixture project in a fresh temp directory, with `AOF_GLOBAL_HOME` set to another fresh temp directory, whose config sets `work.examples.enabled` to `true`
    And its work stream holds the milestone `134` and the stories `134/02` and `134/04`, all `in-progress`
    And a fixture transcript store in a third fresh temp directory, handed to `collectAnswers` as its transcript directory

  Scenario Outline: continue on a story is judged by its map — <case>
    Given `134/04` holds an `EXAMPLES.md` whose map holds <map>
    And <answers>
    When `aof work continue 134/04 --json` is run from the fixture project's root
    Then <outcome>

    Examples:
      | case | map | answers | outcome |
      | an open business question | R1 with E1 `[proposed]`, and Q1 `business · open` | no run carries an answer | it is refused with code `examples-question-open` and status 409, naming `134/04` and Q1 |
      | every question answered and anchored | R1 with E1 `[stated Q1]`, and Q1 `business · answered` | a settled run of `134/04` is stamped with an answer for `134/04 Q1` | it is not refused, and answers `where: "local"` |
      | an asked business question | R1 with E1 `[proposed]`, and Q1 `business · asked` | no run carries an answer | it is refused with code `examples-question-open` and status 409, naming `134/04` and Q1 |
      | a defaulted business question | R1 with E1 `[proposed]`, and Q1 `business · defaulted ADR-004` | no run carries an answer | it is refused with code `examples-question-open` and status 409, naming `134/04` and Q1 |
      | a technical question left open | R1 with E1 `[proposed]`, and Q1 `technical · open` | no run carries an answer | it is not refused, and answers `where: "local"` |
      | an unanchored confirmed example | R1 with E1 `[confirmed]` | no run carries an answer | it is refused with code `examples-question-open` and status 409, naming `134/04`, E1 and `example-provenance-unanchored` |
      | an answer stamped on the milestone's run | R1 with E1 `[confirmed]` | a settled run of `134` is stamped with an answer for `134/04 E1` | it is not refused, and answers `where: "local"` |
      | an answer read live from a running run | R1 with E1 `[proposed]`, and Q1 `business · answered` | a `running` run of `134/04` whose session's transcript holds an answered `134/04 Q1` | it is not refused with `examples-question-open` |
      | an answer for another story's token | R1 with E1 `[proposed]`, and Q1 `business · answered` | a settled run of `134/04` is stamped with an answer for `134/02 Q1` | it is refused with code `examples-question-open` and status 409, naming `134/04`, Q1 and `example-provenance-unanchored` |
      | a misspelt label | R1 with E1 `[proposed]` and E2 `[confirmd]` | no run carries an answer | it is refused with code `examples-question-open` and status 409, naming `134/04`, E2's line and `example-map-malformed` |
      | a bad class, answered and anchored | R1 with E1 `[proposed]`, and Q1 `policy · answered` | a settled run of `134/04` is stamped with an answer for `134/04 Q1` | it is refused with code `examples-question-open` and status 409, naming `134/04`, Q1's line and `example-map-malformed` |
      | an empty map | the empty text | no run carries an answer | it is refused with code `examples-question-open` and status 409, naming `134/04` and `example-map-malformed` |
      | warnings only | R1 to R5, R1 to R4 each with one `[proposed]` example and R5 with none | no run carries an answer | it is not refused, and answers `where: "local"` |
      | not applicable | `Not applicable: a rename with no rule a person owns.` | no run carries an answer | it is not refused, and answers `where: "local"` |

  Scenario Outline: a refused continue moves nothing and mints nothing — <flags>
    Given `134/04` is `not-started` and its map holds Q1 `business · open`
    When `aof work continue 134/04 --json <flags>` is run from the fixture project's root
    Then it is refused with code `examples-question-open` and status 409
    And `134/04`'s `STORY.md` is byte-identical to before the call
    And no assignment and no run record exists for `134/04` or `134`

    Examples:
      | flags                |
      | nothing              |
      | `--node node-remote` |

  Scenario Outline: the door stands open where it has nothing to refuse — <case>
    Given <given>
    When `aof work continue <ref> --json` is run from the fixture project's root
    Then it is not refused

    Examples:
      | case | given | ref |
      | a milestone continue over a blocked story | `134/04`'s map holds Q1 `business · open` | `134` |
      | the gate off | the config sets no `work.examples`, and `134/04`'s map holds Q1 `business · open` | `134/04` |
      | the gate false | the config sets `work.examples` to `{ enabled: false }`, and `134/04`'s map holds Q1 `business · open` | `134/04` |
      | the gate mistyped | the config sets `work.examples` to `{ enabled: "yes" }`, and `134/04`'s map holds Q1 `business · open` | `134/04` |
      | no map | `134/04` holds no `EXAMPLES.md` | `134/04` |
      | a delivered story | `134/04` is `done` and its map holds Q1 `business · open` | `134/04` |

  Scenario: a story this node holds no folder for is not judged here
    Given the mesh cache answers for the story `134/05`, reported by another node, and this project holds no `134/05` folder
    When `aof work continue 134/05 --json` is run from the fixture project's root
    Then it is not refused with `examples-question-open`

  Scenario Outline: only the continue phase is refused — <phase>
    Given `134/04`'s map holds Q1 `business · open`
    When `aof work <phase> 134/04 --json` is run from the fixture project's root
    Then it is not refused with `examples-question-open`

    Examples:
      | phase    |
      | `refine` |
      | `verify` |

  Scenario: the door and the doctor agree on one story
    Given `134/04`'s map holds one open business question and one unanchored `[confirmed]` example
    When `aof work doctor 134/04 --json` and `aof work continue 134/04 --json` are run
    Then the refusal's `findings` carry exactly the codes and messages of the doctor's error-severity `example-*` findings
