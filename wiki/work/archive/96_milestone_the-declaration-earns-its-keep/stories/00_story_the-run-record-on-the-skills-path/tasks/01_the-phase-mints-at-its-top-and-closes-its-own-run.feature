@executable @cli @work @work-stream
Feature: A phase mints its run before its first agent and closes it at the end, and a phase that dies is reclaimed rather than heartbeated

  `find wiki/work -type d -name runs` returns milestones 38 and 40 and nothing since — both from the
  mesh dispatch path. `/aof:refine` and `/aof:continue` mint nothing, so `buildSessionItemIndex`
  builds an empty map and every session in two consecutive milestones resolved to nothing: 408
  unattributed for milestone 63, 216 downstream, with `runs.count`, `totalOutputTokens` and
  `activeUnionMs` all zero in both committed snapshots.

  The mint's POSITION is a correctness requirement rather than sequencing taste. The session id is
  readable from the liveness store for seconds after the `UserPromptSubmit` ping that invoked the
  phase, and not at the phase's close — so a mint written into the phase's closing bookkeeping would
  produce records with no id and an index still empty, which is the current failure wearing a run
  record.

  The mint REPLACES a step rather than adding one. `effects/table.mjs`'s `run.started` reactor already
  moves a `not-started` item to `in-progress`, which is precisely what each phase prompt writes by
  hand today under progress tracking. Two prompts doing that job would be two authorities over one
  status line.

  There is deliberately no heartbeat. `.claude/hooks/aof/run-heartbeat-enqueue.mjs` arms from
  `AOF_RUN_ITEM_DIR` and `AOF_RUN_ID` in the environment, which only a driver-spawned session has; in
  an operator's own session both are unset and the hook is a no-op on every prompt. Arming it from a
  pointer file would give the one component that must never block a tool call a second authority over
  which run is live. Recovery is instead `work:run-start`'s existing stale reclaim, which already runs
  before every mint — so a crashed phase's run is reclaimed by the operator's next phase, and a live
  phase is unaffected because one operator drives one phase at a time in one session.

  What would quietly undo this: minting at the close "so the brief is complete"; a second status write
  left in the phase prompt beside the reactor's; and a phase that returns without completing its run,
  which turns the `duplicate-run` guard from a backstop into a wall.

  ADR-001 §1. ADR-002 §1, §2, §3. FF-9601.

  Scenario: the phase mints before it spawns anything
    Given an item with no runs
    When the refine phase runs over that item
    Then a run record exists for that item before the first agent is spawned
    And it carries that item's ref
    And it carries the session id resolved at the mint

  Scenario: the phase closes its own run
    Given a phase that minted a run for an item
    When the phase reaches its close
    Then that run is completed
    And the item has no non-terminal run

  Scenario Outline: the mint moves a starting item through the existing reactor, and moves nothing else
    Given an item whose status is <status>
    When the phase mints a run for it
    Then the item's status is <after>
    And the phase performs no second status write of its own

    Examples: the reactor's own table, unchanged
      | status      | after       |
      | not-started | in-progress |
      | in-progress | in-progress |
      | blocked     | in-progress |
      | in-review   | in-review   |

  Scenario: a second phase on the same item mints after the first has closed
    Given a phase that minted and completed a run for an item
    When a later phase mints a run for the same item
    Then the mint succeeds
    And both runs are readable under that item

  Scenario: a phase still in flight refuses a rival mint
    Given a phase holding a non-terminal run on an item
    When a second mint is attempted for that item
    Then it is refused `duplicate-run`
    And no second record is written

  Scenario: a crashed phase is reclaimed by the next mint, not left as a wall
    Given a non-terminal run on an item whose last activity is older than the configured staleness window
    When a later phase mints a run for that item
    Then the stale run is reclaimed
    And the new run is minted
    And the reclaim is reported in the command envelope rather than performed silently

  Scenario: the hot hook is not armed from the phase path
    Given an operator session in which `AOF_RUN_ID` and `AOF_RUN_ITEM_DIR` are unset
    When a phase mints a run and a tool call completes
    Then no heartbeat entry is written
    And no module in this story writes a file naming the live run for that hook to read

  Scenario: both phase documents carry the mint and the close
    Given the shipped refine and continue command documents
    When each is read
    Then each names the mint before its first spawned agent
    And each names the completion at its close
    And neither still instructs a hand-written status move that the reactor now performs
