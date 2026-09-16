<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 48/02, the PRODUCER half: delete the filter that hides the one
# session an operator most wants to reach.
#
# THE LINE THIS TASK DELETES, read at source (src/mesh-launcher.mjs:583-585):
#     sessions = (await readLiveSessions(ws, nodeId, options))
#       .filter((session) => !workspacesWithRuns.has(session.workspaceId));
# That is m38/ADR-004's DISPLAY rule implemented on the WIRE. Its consequence is
# exact: the moment a node picks up assignment work, its session disappears from the
# only record that could name it — so milestone 48's premise ("any live session is
# addressable") fails precisely where it matters most. ADR-004 (this milestone) moves
# the rule to the formatter and puts the FACT (`workspaceHasRun`) on the wire instead,
# leaving the rendered output byte-identical.
#
# THE INPUT IS ALREADY IN SCOPE AT THE CALL SITE, checked at source:
# `assembleActiveRunsAndSubsumedWorkspaces` returns `{ activeRuns, workspacesWithRuns }`
# at `:573`, ten lines ABOVE the session read — so the set is handed to
# `readLiveSessions` rather than used to filter after it. Per ADR-009 the launcher gets
# SHORTER: the block is deleted, not relocated; the stamp lands in `readLiveSessions`
# (story 48/01), which gives the session projection one home.
#
# THIS TASK AND ITS SIBLING MUST MERGE ATOMICALLY. A window in which the wire is
# complete and the formatter still ignores `workspaceHasRun` renders a DUPLICATE
# `working · <repo> (session)` line beside the run line, to a real operator, on the
# live fleet. That is why `ui/src/fleet/runs.mjs` was not split into its own story.
#
# NOT ASSERTED HERE, each with an owner:
#  - what the fleet RENDERS — task 01 of this story. This task stops at the wire.
#  - the entry's six-key shape and order — story 48/01's task 00.
#  - the amended arch-test `acd-session-run-reconciliation`
#    (ARCHITECTURE.md §Fitness functions #8), whose central assertion INVERTS with this
#    change: test/arch/acd-session-run-reconciliation.test.mjs:138 today asserts the
#    same-workspace session is ABSENT from the assembled `sessions[]`. Amending it is
#    part of this story's work and lands in the same change — but it is a structural
#    gate, not a Then below.
#
# ISOLATION IS MANDATORY. Fresh `AOF_GLOBAL_HOME` temp dir per scenario — the assembler
# reads real session and run records, and an unisolated run corrupts the operator's
# live `~/.aof` soak. Focused runs only, never the full suite
# (`test/global-work-propagation.test.mjs` binds `:4182`, held by the live daemon).
# No fixed ports: anything that binds, binds `port: 0`.
#
# FED BY THE REAL PRODUCER (m38/ADR-008): the real presence assembler over a hermetic
# repo with real run records and real session records — the shape
# test/arch/acd-session-run-reconciliation.test.mjs already stands up. Never a
# convenience fixture that hands the assembler a pre-built sessions array.

@executable @cli @work @distribution
Feature: every live session reaches the wire, including the one whose workspace has a run in flight
  In order that the busiest session in the fleet is addressable instead of being the one session the wire deliberately hides — which is the whole premise of routable session identity
  the presence assembler publishes every live session it read, stamping the run fact onto each rather than dropping the ones a run already accounts for, and leaves `activeRuns` exactly as it was

  Background:
    Given an isolated global mesh store (a fresh `AOF_GLOBAL_HOME` temp dir) and a hermetic repo whose work stream holds real run records
    And the presence record under test is the one the REAL assembler produces for that node
    And an injected clock, so run state and session liveness are facts of the fixture

  # THE HEADLINE, and it is the exact inverse of what ships today.
  Scenario: a live session in a workspace that also has a running run is PRESENT on the wire, and says so
    Given a running run in workspace `ws-A`
    And a live session in workspace `ws-A` carrying session id `sess-A`
    When the assembler produces this node's presence record
    Then `sessions[]` CONTAINS that session — it is not dropped
    And its `sessionId` is exactly `sess-A`, so the session is addressable as `(nodeId, sessionId)`
    And its `workspaceHasRun` is true — the wire carries the FACT, and leaves the rule to whoever renders
    And `activeRuns` still carries that run's id, unchanged — this is an addition to the wire, never a substitution
    # Today this scenario fails at `sessions[]` being empty. That is the change.

  # THE PROOF THAT THIS IS A MOVE AND NOT A REMOVAL: the other two cases m38/ADR-004
  # already covers keep today's behaviour exactly. They are required rows.
  Scenario Outline: the cases that already worked keep working, unchanged
    Given <the situation>
    When the assembler produces this node's presence record
    Then `sessions[]` contains <sessions on the wire>
    And each of those entries carries `workspaceHasRun` <the stamp>
    And `activeRuns` contains <runs on the wire>

    Examples:
      | case                                  | the situation                                                    | sessions on the wire            | the stamp                       | runs on the wire     |
      | a session with no run at all          | a live session in `ws-B`, no runs anywhere                       | that one session                | false                           | nothing              |
      | a run and a session in DIFFERENT repos| a running run in `ws-A`, a live session in `ws-B`                | the `ws-B` session              | false                           | the `ws-A` run       |
      | run and session in the same repo      | a running run in `ws-A`, a live session in `ws-A`                | the `ws-A` session              | true                            | the `ws-A` run       |
      | both, across two workspaces           | a run in `ws-A` with a session in `ws-A`, and a session in `ws-B`| both sessions                   | true for `ws-A`, false for `ws-B` | the `ws-A` run     |
    # Rows 1 and 2 are m38/ADR-004's own producer-fed cases and their assertions are
    # unchanged by this milestone — which is what makes "the rendered behaviour is
    # preserved" a measurement rather than a claim.

  # THE MULTI-SESSION CASE. Story 48/00 made two sessions in one repo possible; a
  # per-workspace stamp must not collapse them.
  Scenario: two live sessions in one run-bearing workspace both survive, both stamped
    Given a running run in workspace `ws-A`
    And two live sessions in `ws-A`, with session ids `sess-A` and `sess-B`
    When the assembler produces this node's presence record
    Then `sessions[]` contains both, with their own ids
    And both carry `workspaceHasRun` true — the fact describes the workspace, not the session that got there first
    And `activeRuns` still carries exactly the one run

  # ONLY RUNNING RUNS SUBSUME. The stamp must inherit the exact run-state semantics
  # the assembler already applies (`state === "running"` is the sole in-flight state —
  # queued is pre-running, done/failed/cancelled are terminal).
  Scenario Outline: the run fact follows the same run-state rule `activeRuns` follows
    Given a run in workspace `ws-A` whose state is <the run state>
    And a live session in `ws-A`
    When the assembler produces this node's presence record
    Then the session's `workspaceHasRun` is <the stamp>
    And `activeRuns` <the run line>

    Examples:
      | case              | the run state | the stamp | the run line              |
      | in flight         | running       | true      | contains that run         |
      | not started yet   | queued        | false     | does not contain it       |
      | finished          | done          | false     | does not contain it       |
      | failed            | failed        | false     | does not contain it       |
      | cancelled         | cancelled     | false     | does not contain it       |
    # One rule, two outputs: whatever counts as an active run for `activeRuns` counts
    # for the stamp. A second definition here is how the two would drift apart.

  # THE DEGRADE PATH IS NOT THIS TASK'S TO CHANGE. A session read fault degrades to no
  # sessions for the tick rather than crashing it (mesh-launcher.mjs:586-588) — the
  # never-crash discipline every other launcher read keeps.
  Scenario: a session read fault still degrades to an empty list, never a crashed tick
    Given the session read fails for this tick
    When the assembler produces this node's presence record
    Then the record is still produced, with `sessions: []`
    And `activeRuns` and the heartbeat are unaffected
    And the fault was reported through the coded-degrade channel rather than swallowed
