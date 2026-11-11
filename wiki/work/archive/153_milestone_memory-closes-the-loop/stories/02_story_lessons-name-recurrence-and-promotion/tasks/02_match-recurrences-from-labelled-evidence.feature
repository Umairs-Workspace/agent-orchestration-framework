Feature: Whole-index lesson recurrence is a calibrated and reproducible decision

  Rule: R2 · Whole-index recurrence uses the calibrated lesson match across kinds

    @executable @cli @work @memory
    Scenario: E4 · The named junction recurrence crosses item and Kind boundaries
      Given the labelled junction incidents from lesson 45/R13 with Kind mistake and lesson 68/R10 with Kind near-miss
      And the current candidate identity 68/R10 is excluded
      When the recurrence command evaluates the later incident against the whole lesson index
      Then the qualifying reference is "45/R13"
      And the result includes the selected threshold, score and calibration version
      And no prior retrospective is edited

    @executable @cli @work @memory
    Scenario: E5 · Similar vocabulary is not sufficient evidence of recurrence
      Given a held-out same-topic pair labelled as different mistakes
      When the recurrence command applies the calibrated matcher
      Then the qualifying reference is null
      And the result still reports the candidate score and threshold

    @executable @cli @work @memory
    Scenario: E6 · Equality and self identity do not qualify
      Given an excluded candidate would score above the threshold
      And another candidate scores exactly at the threshold
      When recurrence evaluates those candidates
      Then neither candidate is a qualifying reference

    @executable @cli @work @memory
    Scenario Outline: Matching handles empty and competing candidates deterministically
      Given recurrence input "<input>"
      When the recurrence command runs
      Then it reports "<result>"
      And it writes no source document or index

      Examples:
        | input                                      | result                                  |
        | memory off                                 | no candidates and null qualifying ref   |
        | no lessons but a high-scoring ADR           | no candidates and null qualifying ref   |
        | two lessons tied above threshold           | lexically first canonical ref qualifies |
        | four eligible lessons with distinct scores | only the three highest candidates       |

    @executable @cli @work @memory
    Scenario: Both backends reach the same matching decision over the same records
      Given local and graphify expose the same lesson records in different retrieval orders
      When each is used by the recurrence command for the same incident
      Then their candidate scores, order and qualifying reference are identical
      And ordinary recall ranking and kind filtering remain unchanged

    @manual @cli @work @memory
    Scenario: The threshold has an auditable labelled basis and a failing negative probe
      Given all self-report hits from the origin expression have been assessed with source citations
      And the labelled set includes the named junction pair and same-topic negative pairs
      When the builder freezes the held-out split and measures candidate thresholds
      Then RESEARCH records the labels, ambiguous exclusions, split, selected score rule, precision and recall
      And the selected threshold detects the named pair and has zero held-out false positives
      And failure to meet those conditions is reported as a blocking finding instead of an invented threshold
      And VERIFICATION records FF-15302 failing when the matcher is weakened to admit a held-out negative
      And the existing base-retrieval eval remains green after the probe is restored
