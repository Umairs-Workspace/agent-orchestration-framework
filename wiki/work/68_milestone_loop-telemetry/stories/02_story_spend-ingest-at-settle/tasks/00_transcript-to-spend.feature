@executable @cli @work @work-stream
Feature: The session's own reported numbers, copied without arithmetic

  Story 68/00 defines the spend envelope and the writer that guards it. This is its producer —
  without one, `spend` stays `null` on every record and the milestone ships a schema instead of a
  number.

  **The transcript is the source, and that is a measured choice.** Claude Code's per-turn `usage`
  object carries exactly the four buckets ADR-003 adopts — `input_tokens`,
  `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens` — already mutually
  exclusive, so ingestion is a **straight copy with no arithmetic**. It carries `model` and
  `effort` per turn too. Verified on a live transcript for ADR-003/ADR-004.

  **A session is its whole transcript tree.** Subagent transcripts live under
  `<projectsDir>/<sessionId>/`, and `latestSessionActivityMtimeMs`
  (`src/agent-session-driver.mjs:431-466`) already walks that tree recursively — the existing
  precedent for what "the session" includes. This ingest follows the same shape so the two can
  never disagree about a session's boundaries. Getting that wrong is not a rounding error: one
  build run alone recorded **9.43 M cache-create tokens** across its subagents
  (`RESEARCH-agent-loop-economics.md` §2.4).

  A model changing mid-session is not a defect to hide: the cache key includes model, and a total
  that silently mixes models is not a total. The envelope records what the session actually ran.

  ADR-003 (the buckets); ADR-001 (the envelope); ADR-006 (the miner is the diagnostic companion —
  this ingest, not that module, is the authority on spend).

  Scenario: the four buckets are copied from the session's own reported usage
    Given a settled run whose session reported per-turn usage across several turns
    When its spend is ingested
    Then each bucket is the sum of that bucket across the session's turns
    And no bucket's value is derived by adding or subtracting another bucket
    And the ingested buckets are accepted by the writer's convention check

  Scenario: a session's subagents are part of the session
    Given a run whose session spawned subagents that reported their own usage
    When its spend is ingested
    Then the totals include the subagents' usage
    And the session's own boundaries match those the driver already uses to watch the transcript tree

  Scenario Outline: what else the turn record supplies
    Given a settled run whose session reported <fact> per turn
    When its spend is ingested
    Then the envelope's <field> reflects what the session ran

    Examples: the non-token facts the transcript carries
      | fact              | field     |
      | the model used    | model     |
      | the effort level  | effort    |

  Scenario: turn and tool-call counts are counted, not estimated
    Given a settled run whose session took a known number of turns and made a known number of tool calls
    When its spend is ingested
    Then `turns` is that number of turns
    And `toolCalls` is that number of tool calls

  Scenario: a session that ran more than one model records what it ran
    Given a settled run whose session changed model partway through
    When its spend is ingested
    Then the recorded `model` states that more than one model was used rather than naming only one
    And the token buckets still total every turn
