@executable @cli @work @work-stream
Feature: Four mutually exclusive buckets, and a writer that refuses a record which overlaps

  The vendor convention is genuinely split — Langfuse requires each token be counted in exactly one
  key; Braintrust folds cached tokens into the prompt count. aof has already been bitten by not
  choosing: 18 of 143 agent rows double-counted, **7.07 h and 1,345k output tokens billed twice**
  (`RESEARCH-agent-loop-economics.md` §0, §5.6). The STATE note names the real defect exactly —
  *"the failure mode is not choosing"*.

  ADR-003 chooses **mutual exclusivity**, and the measurement decides it rather than taste: Claude
  Code's own per-turn `usage` object is already disjoint (`input_tokens` excludes both cache
  classes), so this convention makes ingestion a straight copy with no arithmetic, while the
  inclusive convention would force aof to add numbers at write time and subtract them back out for
  any consumer expecting the vendor shape.

  **The enforcement lives in the writer, and that is the whole point.** A convention that lives in a
  comment is precisely the state that produced the double-count. A caller cannot opt out of it, and
  a malformed envelope is REFUSED — never silently normalised, never partially written, because a
  half-written spend is a number someone will later add up.

  FF-6803 pins the enforcement to the write path structurally; the scenarios below are the
  behaviour over the real seam.

  ADR-003; ADR-001 (the envelope this validates).

  Scenario: the four buckets total without any term counted twice
    Given a spend envelope whose buckets are input 1000, output 200, cacheRead 50000 and cacheCreate 900000
    When the run is settled with it
    And the record is read back
    Then each bucket is returned verbatim
    And the sum of the four buckets is the run's true total token count
    And no bucket's value is contained in any other bucket

  Scenario: a caller cannot write a spend the convention forbids
    Given a run being settled
    When the settle is attempted with a spend whose buckets do not satisfy the convention
    Then the settle is refused with a typed error naming the offending bucket
    And the record's `spend` is left exactly as it was
    And no partially-written envelope is persisted

  Scenario Outline: what the writer refuses, and why
    Given a run being settled
    When the settle is attempted with <malformed>
    Then the settle is refused
    And the reported reason is <reason>

    Examples: malformed bucket sets
      | malformed                                        | reason                                                      |
      | a bucket set missing `cacheCreate`               | all four buckets are required — absence is not zero          |
      | a bucket set carrying a fifth token key          | the four buckets are the closed set                          |
      | `input` holding a negative count                 | a token count is a non-negative integer                      |
      | `cacheRead` holding a fractional count           | a token count is a non-negative integer                      |
      | `input` holding a string                         | a token count is a non-negative integer                      |
      | an `input` that folds in the cache-read count (an inclusive bucket, the vendor's other convention) | the four buckets are the closed set — nothing to fold into |

  Scenario: a consumer that needs the inclusive convention derives it on the way out
    Given a settled run whose buckets are mutually exclusive
    When a caller wants the vendor-inclusive input figure
    Then it is derivable as input plus cacheRead plus cacheCreate
    And the stored record is unchanged by that derivation
