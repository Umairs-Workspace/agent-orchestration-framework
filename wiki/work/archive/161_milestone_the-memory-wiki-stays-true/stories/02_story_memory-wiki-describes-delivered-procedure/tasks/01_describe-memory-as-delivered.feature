Feature: The memory page teaches the delivered procedure

  @manual @docs @work @memory
  Scenario Outline: Each part of the memory procedure is described against delivered evidence
    Given milestones 148, 153 and 157 are delivered
    When I read wiki/memory.md and compare "<topic>" with its declared source evidence
    Then the page explains "<required account>"
    And the explanation cites a resolving source or delivered decision

    Examples:
      | topic                   | required account                                                                                           |
      | sources and authority   | work records remain authoritative, the index is derived and rebuildable, wiki pages are not indexed copies   |
      | three layers            | procedural lessons; semantic ADRs, capabilities, gaps and summaries; episodic findings, feedback and runs    |
      | record vocabulary       | all eight record types, source locators, tags, canonical lesson metadata and empty non-applicable fields     |
      | episodic provenance     | finding declarations, raw feedback only, terminal runs, and stalls as available run evidence                 |
      | recall and filters      | query and scope filters, five-result default, --all for complete scoped evidence, and memory-off behavior     |
      | decision edges          | shatter-po, refine-architect, refine-po, continue-developer, continue-episodic and verify-finding              |
      | recall observations     | the existing FEEDBACK.ndjson ledger, exact retained results, explicit verdicts, empty results and UUID replay |
      | recurrence              | lesson matching before a new retrospective lesson, Recurs attribution and preserved new incident evidence    |
      | promotion               | Promoted to none/control/rule/prompt, forward promotion watermark, and tune proposals requiring application    |
      | accounting              | status types/layers/conformance/effectiveness, advisory recurrence and unpromoted-lesson health               |
      | retrospective evidence  | refresh observability and ingest, recall episodic evidence, then recurrence/promotion and post-author ingest  |

  @manual @docs @work @memory
  Scenario: The decision edges keep their delivered scopes and conditions
    When I compare the page's edge descriptions with the declared-edge source control
    Then refine distinguishes the architect's architecture filter from the PO's item filter
    And continue retains its near-miss recall and adds item-scoped delivery evidence only on retry
    And verify finding recall is stream-wide and does not automatically close duplicates
    And retrospective evidence gathering and recurrence are distinguished from decision-recall ledger edges

  @manual @docs @work @memory
  Scenario: Operational guidance remains true when the live store changes
    When I review the memory page's command and backend guidance
    Then it explains none, local and graphify as supported configured choices
    And it directs readers to "aof work memory status --json" for current backend and counts
    And it does not assert that this repository has no active backend or a fixed live record count
    And it describes delivered recall and ingest workflow hooks as built
    And it does not list the retired brief verb as supported
