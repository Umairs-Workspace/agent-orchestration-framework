@executable @cli @work @work-stream @bug @finding-F-04
Feature: The attribution write never clobbers the settle it raced

  F-04 (`VERIFICATION.md`, blocker — PO triage at `aof:verify 68`). This story's drive-command seam
  persists the captured session id FIRE-AND-FORGET (`src/commands/drive.mjs:85` —
  `Promise.resolve(recordSessionId(…)).catch(…)`, never awaited, never joined). `recordSessionId`
  is a whole-record read-modify-write (`src/run-store.mjs:849-857`: `{...record, sessionId}` then
  `persist`), so an in-flight copy holding the PRE-SETTLE snapshot that lands after
  `completeRun`'s transition rewrites the whole record backwards — `state` to `running`, `outcome`
  to `null`, `updatedAt` to `createdAt`, and any spend story 68/02 stamped back to `null`.

  The consequence is sticky and silent. `startRun` refuses every later run on the item with
  `duplicate-run` (409, `src/run-store.mjs:588-590`), which is exactly the leak the settle exists
  to prevent (`src/commands/drive.mjs:105-108`); and both write paths are `.catch(reportDegrade)`,
  so nothing is reported at the moment of the clobber. Measured at 1 failure in 5 probe runs, and
  the story's own registered pin `test/drive-command-phase-drivers.test.mjs:271` fails
  `'running' !== 'done'`.

  **The sibling caller already solved this, and is the shape to follow.**
  `src/mesh-worker-execution.mjs:1681-1694` holds the persist promise and `allSettled`s it against
  the up-channel update, with the reason stated in its own comment: so the attribution write cannot
  be left "racing the settle". Neither update is conditional on the other there, and neither may
  become conditional here — the delivered guarantee that the assignment and the record are updated
  independently (task `00`) is not what is being fixed.

  ADR-005 §1 (the caller owns the persist); ADR-001 (the record being written to); ADR-008 (this
  changes what is RECORDED about the run, never what the run does).

  Scenario: a settled run stays settled when the attribution write lands late
    Given a drive whose session publishes its id mid-run
    And the id's persist has not completed when the run settles
    When the drive returns
    Then the run record's state is the settled state
    And its outcome is the settled outcome
    And the record carries the session id

  Scenario: the item is drivable again after a drive that settled
    Given a drive on an item has returned with a terminal outcome
    When a second drive is started on the same item
    Then it is not refused as a duplicate run
    And the first run's record is still terminal

  Scenario: a stamped spend survives the attribution write
    Given a drive whose run settles with a spend envelope stamped at settle
    And the id's persist has not completed at that moment
    When the drive returns
    Then the run record's spend is the stamped envelope
    And no field of the envelope has been returned to its pre-settle value

  Scenario: neither write is made conditional on the other by the fix
    Given a drive whose session publishes its id mid-run
    When the attribution write fails
    Then the run still settles
    And the failure is reported rather than swallowed silently

  Scenario: the id is still written once and not churned
    Given a drive whose session id has already been persisted mid-run
    When the same id is presented again at settle
    Then the record is not rewritten
    And the run's state, attempt and retry lineage are untouched
