@executable @cli @work @work-stream
Feature: The brief's ceiling is enforced where it is written, and an overflow says so

  A brief with a documented size target and no enforcement is a brief that grows. This milestone
  exists because exactly that happened to the context as a whole — 927,588 cache-creation tokens per
  spawn, a 316:1 context-in-to-output ratio, one developer run ingesting 9.43 M cache-create tokens
  (≈36 MB) to produce 377k of output.

  The target is not arbitrary. Anthropic's sub-agent guidance puts a condensed hand-back at
  1,000–2,000 tokens. SWE-agent's ablations resolve 18.0% of SWE-bench Lite with a 100-line window
  against 12.7% showing the full file; Chroma's context-rot study finds ~300 focused tokens beating
  ~113k of full history. A smaller brief is expected to be *better*, not merely cheaper.

  **The ceiling lives in the write path** — 68/ADR-003's ruling (the writer refuses a lie) applied
  to the payload rather than the record. Not a lint, not a caller's responsibility, not a comment,
  and not two implementations of one bound.

  **An overflow truncates loudly.** It never silently ships the excess, and it never returns an
  empty brief: a phase handed nothing is strictly worse than a phase handed a truncated something,
  and a phase that cannot tell it was truncated will confidently act on a partial contract.

  ADR-003. The section list stays open so 70/03 can add the ADR slice without renegotiating this.

  Scenario: a brief within the ceiling is returned whole
    Given assembled sections whose total is within the ceiling
    When the brief is compiled
    Then every section is present in full
    And the brief carries no truncation notice

  Scenario: an over-ceiling brief is truncated rather than shipped
    Given assembled sections whose total exceeds the ceiling
    When the brief is compiled
    Then the returned brief is within the ceiling
    And the brief states that it was truncated
    And it names which sections were dropped or shortened

  Scenario: truncation follows the declared priority, not input order
    Given sections that exceed the ceiling
    When the brief is truncated
    Then the highest-priority sections are retained
    And the lowest-priority sections are the ones dropped first
    And the retained sections keep their declared order

  Scenario: truncation never empties the brief
    Given a single section that alone exceeds the whole ceiling
    When the brief is compiled
    Then the brief still names the item it is for
    And it still carries a truncation notice
    And it is not empty

  Scenario: the ceiling is one number in one place
    Given the compiler and its callers
    When the enforcement point is located
    Then the ceiling is applied inside the compiler
    And no caller applies a size limit of its own
    And no second ceiling literal exists outside the compiler

  Scenario Outline: sizes against the ceiling
    Given assembled sections measuring <size>
    When the brief is compiled
    Then the result is <result>
    And a truncation notice is <notice>

    Examples: the boundary matrix — at the ceiling is healthy, past it is not
      | size                        | result                          | notice  |
      | well under the ceiling      | every section in full           | absent  |
      | exactly at the ceiling      | every section in full           | absent  |
      | one unit past the ceiling   | a brief within the ceiling      | present |
      | many times the ceiling      | a brief within the ceiling      | present |
      | one section past on its own | the item named, that section cut| present |

  Scenario Outline: what the truncation notice must let a reader answer
    Given a truncated brief
    When a reader inspects the notice
    Then it answers <question>

    Examples: a notice a phase can act on
      | question                                          |
      | was this brief truncated at all                   |
      | which named sections are missing or shortened     |
      | that the remaining content is complete as far as it goes |
