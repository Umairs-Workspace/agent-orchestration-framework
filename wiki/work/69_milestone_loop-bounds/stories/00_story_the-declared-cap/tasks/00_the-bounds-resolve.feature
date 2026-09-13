@executable @cli @work @work-stream
Feature: Every bound this milestone enforces resolves from one home, with a documented default

  There is no token limit, no turn limit, no wall-clock limit and no cost ceiling anywhere in the
  aof runtime. Five values change that — `startToClose`, `heartbeat`, `scheduleToStart`,
  `scheduleToClose` and `startupGrace` — plus the two loop caps this milestone names. Seven values
  scattered across five modules is the defect one level down from the one being fixed: a bound that
  is right at one door and silently wrong at the next.

  So they resolve in ONE place, in the shape this repo already uses seven times over —
  `DEFAULT_*` + `resolve*(value)` + `*FromConfig(workspace)` in the module that owns the concept
  (`mesh-sync-cadence.mjs`, `mesh-presence-loop.mjs`, `mesh-presence.mjs`, `cache-provenance.mjs`,
  `mesh-session.mjs`, `mesh-relay.mjs`, `work-dispatch.mjs`). This is that shape's next instance,
  not a new idiom.

  The values and their derivations are ADR-002's table. `heartbeat` is deliberately the SAME 15
  minutes `mesh-assignment-reclaim.mjs` and `agent-session-driver.mjs` already use — a third copy
  of that constant is the thing being engineered out, not a convenience.

  ADR-001, ADR-002. FF-6901 (an extension of the existing cap single-home guard).

  Scenario: an unconfigured workspace still has every bound
    Given a workspace whose config declares no loop bounds at all
    When each bound is resolved
    Then every one of them answers with its documented default
    And nothing throws

  Scenario: a declared value is used verbatim
    Given a workspace that declares a per-attempt ceiling of its own
    When that bound is resolved
    Then the declared value is what answers
    And the other bounds still answer with their defaults

  Scenario: the heartbeat deadline is the constant the system already uses
    Given the resolved heartbeat deadline
    When it is compared against the staleness threshold the reclaim path already applies
    Then they are the same value
    And neither module declares its own copy of it

  Scenario Outline: a malformed value falls back rather than crashing
    Given a workspace declaring <declared> for a bound
    When that bound is resolved
    Then the result is the documented default

    Examples: the matrix this repo's other resolvers already keep, applied unchanged
      | declared                  |
      | absent                    |
      | null                      |
      | the string "30"           |
      | a boolean                 |
      | zero                      |
      | a negative number         |
      | a non-integer float       |
      | not-a-number              |
      | infinity                  |

  Scenario Outline: the bound each name carries, and what expiry does
    Given the resolved bound policy
    When <bound> is inspected
    Then its terminal behaviour is <behaviour>

    Examples: ADR-002's table, as a contract
      | bound            | behaviour                              |
      | start-to-close   | kill the attempt and retry it          |
      | heartbeat        | kill the attempt and retry it          |
      | schedule-to-start| alert and escalate, never retry        |
      | schedule-to-close| give up, escalate, preserve the tree   |
      | startup grace    | suspend the heartbeat deadline only    |

  Scenario: the startup grace suspends one deadline, not the wall clock
    Given an attempt inside its startup grace
    When the deadlines are evaluated
    Then the heartbeat deadline does not apply yet
    And the per-attempt and total ceilings are both already running

  Scenario: the two bounds that already have homes are not resolved here
    Given the module that owns this milestone's bounds
    When its resolvers are enumerated
    Then it resolves neither the dispatch concurrency bound nor the attempt ceiling
    And each of those still resolves through the single home it already had
