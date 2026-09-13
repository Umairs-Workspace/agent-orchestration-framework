@executable @cli @work @validate
Feature: The report normalisers — proven against captured output, never against a believed shape

  `m38/ADR-008` is unambiguous: *wherever we do not own the PRODUCER, the contract test MUST be fed
  a REAL CAPTURED payload from that producer.* A hand-written fixture of what a format "looks like"
  is not evidence — it is the author's belief about the producer, tested against itself.

  **Two real payloads are available in this repo today, and they disagree about TAP.** The node test
  runner emits ordinals, a plan line and a summary — `ok 1 - <name>`, `1..1`, `# tests 1`. This
  repo's own `scripts/test.mjs` emits **none of those**: bare `ok - <name>` lines with no ordinal
  (`:3730`), `#`-prefixed section headers (`:3724`, `:3742`, `:3757`), no plan line and no summary
  count at all. A normaliser written against one of those and asserted against a hand-made specimen
  of the other would ship broken and read as correct.

  **And it writes its reds to a different stream.** `not ok - <name>` and the error stack go to
  **stderr** (`:3733-3734`) while the passes go to stdout, so a report captured from stdout alone
  is an all-green text beside a non-zero exit. The normaliser's job here is narrow and absolute:
  **report what the text carried.** It invents no failure it did not see, and it swallows no
  contradiction either — refusing that green is the verdict rules' job
  (`01_green-is-positive-evidence.feature`), not the parser's.

  This is also ADR-006 §1 in its smallest form: **the grade's subject is the case identity the
  runner EMITTED, verbatim.** Nothing here derives an identity, a status or a meaning from free
  prose — FF-5408's behavioural twin.

  ADR-006 §1, §4; ADR-005 §2(c)(d); `m38/ADR-008`.

  Scenario: a captured payload from the node test runner normalises to what it actually reported
    Given the committed capture of the node test runner over `test/arch/acd-controls-never-execute.test.mjs`
    When the report is normalised
    Then exactly one case is enumerated
    And that case's identity is the name the runner emitted, character for character
    And its status is a passing one
    And `cases` reports a total of one

  Scenario: the runner reported one case for a file declaring four, and the normaliser says one
    Given the same committed capture, whose subject file declares four arch-tests
    When the report is normalised
    Then the enumerated case count is one and not four
    And no case is synthesised from the subject file's contents
    And the summary line reporting zero suites is not read as a case

  Scenario: a captured payload from this repo's own runner normalises without ordinals or a plan line
    Given the committed capture of this repo's own suite runner stdout
    When the report is normalised
    Then every `ok - <name>` line is enumerated as a passing case under the name it emitted
    And the absence of a plan line does not prevent enumeration
    And the absence of ordinals does not prevent enumeration
    And the `#`-prefixed section headers are not enumerated as cases

  Scenario: reds written to a different stream are absent from the report, not invented into it
    Given the committed capture of a failing run of this repo's own runner, taken from stdout only
    When the report is normalised
    Then only the passing cases the text carried are enumerated
    And no failing case is invented for the run's non-zero exit
    And the normalisation reports no failure message it did not read

  Scenario: a case with no status is enumerated, and it is not a passing case
    Given a captured report carrying a named case with no pass or fail marker
    When the report is normalised
    Then that case is enumerated under its emitted name
    And it carries no status
    And it is not counted toward the passing cases

  Scenario: identity and status come from the format's own fields, never from the words in the name
    Given a captured report whose passing case is named so that its text contains the word "fail"
    And whose failing case is named so that its text contains the word "ok"
    When the report is normalised
    Then the first case's status is a passing one
    And the second case's status is a failing one
    And neither status was derived from the words in either name

  Scenario: a failure message is carried as the runner emitted it
    Given a captured report enumerating a failing case with a multi-line diagnostic
    When the report is normalised
    Then the failure is listed with the case identity the runner emitted
    And its message is the runner's own text, neither re-worded nor summarised nor truncated
    And its `scenario` reads null, because no join is performed at this layer

  Scenario Outline: what each element of a captured payload normalises to
    Given a captured report containing <element>
    When the report is normalised
    Then it contributes <contribution>

    Examples: cases
      | element                                          | contribution                        |
      | a passing case marker with a name                | one case counted as passed          |
      | a failing case marker with a name                | one case counted as failed          |
      | a case marker carrying a skip directive          | one case counted as skipped         |
      | a named case with no marker at all               | one case carrying no status         |

    Examples: not cases
      | element                                          | contribution                        |
      | a diagnostic comment line                        | nothing                             |
      | a plan line                                      | nothing                             |
      | a summary count line                             | nothing                             |
      | a blank line                                     | nothing                             |

  Scenario: a skipped case is neither a pass nor a fail
    Given a captured report enumerating one passing case and one skipped case
    When the report is normalised
    Then `cases` reports a total of two, one skipped and none failed
    And the skipped case is not counted toward the passing cases

  Scenario: a declared format with no normaliser is named, never guessed
    Given a rubric declaring a report format that no normaliser handles
    And a report present at its declared path
    When the report is normalised
    Then the grade's `codes` contain `report-unreadable`
    And its `verdict` reads `indeterminate`
    And the record names the declared format that could not be read
    And no other format's normaliser was tried against the text

  Scenario: a format is only supported when a real capture backs it
    Given the set of formats a rubric may declare
    When each supported format is examined
    Then each has a committed fixture captured from a real run of its producer
    And each fixture carries a provenance line naming the exact command that produced it
    And no supported format is backed only by a hand-written specimen
