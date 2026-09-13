@executable @cli @work @work-stream
Feature: The session id captured mid-run lands on the run record

  The run record has modelled `sessionId` since milestone 19 (`src/run-store.mjs:344-362`). The
  driver already captures it mid-run — `onSessionIdCaptured` (`src/agent-session-driver.mjs:675`),
  wired at `src/mesh-worker-execution.mjs:1665` — and forwards it to the **assignment**. It has
  never been forwarded to the run record. Every run record on disk shows the consequence:
  `"sessionId": null`, on all of them.

  That single omission is why aof attributes agent runs by matching free text
  (`agentMatchesMilestone`, `src/work-observe.mjs:661-667`) and why 18 of 143 rows are counted
  twice. The fix is not a better regex — it is writing down the identifier the system already
  knows. Story 68/03 then makes attribution a join on this key.

  **The persist belongs to the driver's CALLERS, not the driver.** `aof graph impact` reports
  `src/commands/drive.mjs` and `src/mesh-worker-execution.mjs` as the driver's only production
  dependents, and they are the only modules importing both the driver and `run-store`. The driver
  emits the id; its callers persist it. That keeps the existing seam rather than teaching a spawn
  module about a store it does not import.

  The existing assignment path is **additive-safe**: it still receives the id exactly as it does
  today. Nothing about `--resume`, the needs-input park, or the delivered retry semantics
  (`sessionId` carried forward unless overridden, `src/run-store.mjs:588-593`) changes here.

  ADR-005 §1; ADR-001 (the record being written to).

  Scenario: a spawned run records the session it is running as
    Given a run started against a work item with no session id recorded
    When the spawned session reports its id mid-run
    Then the run record's `sessionId` is that id
    And the id on the record is byte-identical to the one the session published

  Scenario: the assignment still receives the id exactly as before
    Given a worker run whose session id is captured mid-run
    When the id is reported
    Then the assignment is updated with the id as it is today
    And the run record is updated with the same id
    And neither update is conditional on the other having happened

  Scenario: a run whose session never reports an id stays honest
    Given a run whose spawned session never publishes an id
    When the run settles
    Then the run record's `sessionId` reads `null`
    And no id is invented, derived from a path, or copied from another run

  Scenario: the id is written once and not churned
    Given a run whose session id has been recorded
    When the same id is reported again during the run
    Then the record's `sessionId` is unchanged
    And the run's state, attempt and retry lineage are untouched

  Scenario Outline: which spawn paths record the id
    Given a run started through <path>
    When its session reports an id
    Then the run record carries that id

    Examples: the driver's production callers, as the graph reports them
      | path                                   |
      | the local drive command                |
      | the mesh worker execution path         |
