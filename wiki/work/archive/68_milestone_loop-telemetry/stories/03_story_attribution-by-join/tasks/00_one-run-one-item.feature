@executable @cli @work @work-stream
Feature: One agent run, one item — attribution resolves through the record, not through prose

  `agentMatchesMilestone` (`src/work-observe.mjs:661-667`) decides which milestone an agent run
  belongs to by **matching text**. The measured consequence: 18 of 143 agent rows appear in two
  milestone reports, billing **7.07 h and 1,345k output tokens twice**; a single 6h55m50s gap is
  charged to both milestone 47 and milestone 49
  (`RESEARCH-agent-loop-economics.md` §0, §1, §5.6). Any total drawn from those reports is a number
  nobody can add up.

  Once story 68/01 persists `sessionId`, attribution stops being a guess: an agent run belongs to
  exactly one item because it belongs to exactly one session, which belongs to exactly one run.
  The run record is the authority; the miner reads it (ADR-005 §1).

  **Absence is reported, never inferred.** A run with no resolvable session is reported as
  unattributed, with a count. It is not guessed into a milestone and not silently dropped — a
  fallback that double-counts is the defect, and a silent one is worse than a gap (ADR-005 §
  Alternatives, ADR-006). A report that says "eleven runs could not be attributed" is usable; one
  that quietly spreads them across two milestones is not.

  FF-6805 pins "no attribution path tests item identity against free text" structurally, and
  FF-6806 pins "no agent-run identity appears in two items' attributed sets" across a whole work
  stream. The scenarios below are the behaviour over the real seam.

  ADR-005; ADR-006.

  Scenario: an agent run is attributed to the item its session's run belongs to
    Given a work item with a run whose record carries a session id
    And an agent run recorded under that session
    When the item is observed
    Then the agent run is attributed to that item
    And the attribution was resolved from the run record, not from the text of the agent's prompt

  Scenario: an agent run mentioning another item is not attributed to it
    Given an agent run recorded under a session belonging to one item
    And that agent's text mentions a different item by number and by slug
    When both items are observed
    Then the agent run appears in the first item's report
    And it does not appear in the second item's report

  Scenario: no agent run is counted twice across the work stream
    Given a work stream whose items each have runs with recorded session ids
    When every item is observed
    Then no agent run identity appears in more than one item's attributed set
    And the sum of every item's attributed active time is no greater than the union of all agent activity

  Scenario: a run that cannot be attributed is reported as unattributed
    Given an agent run recorded under a session that matches no run record
    When the work stream is observed
    Then the agent run is reported as unattributed
    And the count of unattributed runs is stated
    And it is not assigned to any item
    And it is not silently dropped

  Scenario Outline: what resolves, and what is reported as unattributed
    Given an agent run whose session <situation>
    When the owning item is observed
    Then the run is <disposition>

    Examples: resolvable
      | situation                                                  | disposition                          |
      | matches a run record on this item                          | attributed to the item               |
      | matches a run record on one of the item's stories          | attributed to that story             |

    Examples: not resolvable — reported, never guessed
      | situation                                                  | disposition                          |
      | matches no run record at all                               | reported as unattributed             |
      | is absent from the transcript entirely                     | reported as unattributed             |
      | matches a run record whose own session id is null          | reported as unattributed             |
