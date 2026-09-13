<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 48/01, the FABRIC half: the id has to survive the crossing,
# and the failure mode of it not surviving is SILENT.
#
# WHY THIS TASK EXISTS AT ALL, given RESEARCH §5 says it already works. The control
# node's `applyPresenceFrame` (src/control-stream-server.mjs:276-299) rebuilds the
# TOP-LEVEL presence record from a deliberate key whitelist, but passes each session
# ENTRY through unexamined: `safeSessionArray` (`:270-274`) checks only "is this a
# non-array object" and keeps the entry whole. That is why an added per-entry key
# crosses the fabric today with no edit — and it is exactly the property that a
# well-meaning future change ("validate each session field at the control") would
# destroy, dropping the one key this milestone exists for while every other test stays
# green. The history is on the record: `applyPresenceFrame` originally rebuilt only
# the m23 four keys, so a REMOTE node's `sessions` was silently dropped as its presence
# crossed the fabric (the comment at `:264-269` documents that very bug). This task
# pins the fix's shape so it cannot be re-broken.
#
# THE HOPS, as RESEARCH §5 traced them:
#   worker `assembleCurrentPresenceRecord` (mesh-launcher.mjs ~:575-600)
#     → the presence frame → control `applyPresenceFrame` (control-stream-server.mjs:276)
#     → `publishPresenceRecord` (mesh-presence.mjs:295-298)
#     → `queryGlobalRegistry`'s per-node merge (global-node-registry.mjs:208-209,
#       via `assemblePresenceRecord`)
#     → `shapeGlobalStatus` → the one HTTP route → `ui/src/fleet/api.ts`.
# Every one of those is a spread or a whole-object copy. NONE of them is edited by this
# milestone — `src/control-stream-server.mjs` alone has 37 dependents, and not editing
# it is a feature.
#
# NOT ASSERTED HERE, each with an owner:
#  - the six-key entry's own shape and order at the producer — task 00 of this story.
#  - the run-subsumption behaviour change — story 48/02. The launcher still filters
#    until that story lands, and nothing here depends on it either way.
#  - the index and its `workItem` — story 48/03.
#  - the TypeScript DECLARATION check (that `PresenceSession` names exactly six keys
#    with `sessionId: string | null`) — that is a structural claim over a source file,
#    owned by `acd-session-entry-frozen-wire` (ARCHITECTURE.md §Fitness functions #4).
#    THE DIVISION IS DELIBERATE: this repo has no TypeScript compile gate a Gherkin
#    scenario could stand on, so the scenario below asserts the RUNTIME shape of the
#    SERVED payload — the thing a consumer actually receives — and the declaration is
#    pinned structurally. Together they close "the type says one thing and the wire
#    does another"; neither alone does.
#
# ISOLATION IS MANDATORY. Fresh `AOF_GLOBAL_HOME` temp dir per scenario. Focused runs
# only, never the full suite (`test/global-work-propagation.test.mjs` binds `:4182`,
# held by the live control daemon on this machine).
#
# THE PORT TRAP. `:4181` (fleet UI) and `:4182` (control serve) are held by the
# operator's live daemons. Any server a scenario stands up binds `port: 0` and reads
# `address().port`. No scenario may bind a fixed port.

@executable @cli @ui @work @distribution
Feature: a session entry crosses the fabric whole — the control node relays it, it does not re-specify it
  In order that the id a worker records is the id the control node can route on, and so that a future field can be added at the producer without editing the highest-fan-in file on the path
  every hop between the worker's presence assembler and the served payload copies a session entry whole — the control's guard stays an entry-level check with no per-field whitelist, and the presence record's own frozen shape is left exactly as it was

  Background:
    Given an isolated global mesh store (a fresh `AOF_GLOBAL_HOME` temp dir)
    And any server started below binds an ephemeral port (`port: 0`), never `:4181` or `:4182`
    And "the received entry" means the session entry read back after the frame has been applied and published by the real control-side path

  # THE HEADLINE, and it is end-to-end on purpose: the guarantee is about the JOURNEY,
  # so no scenario here inspects a single hop in isolation.
  Scenario: a six-key session entry goes in at the worker and comes out the other side intact
    Given a worker-assembled presence record whose `sessions[]` holds one entry with all six keys, `sessionId` `sess-A` and `workspaceHasRun` true
    When that presence frame is applied by the real control-side path and the record is read back
    Then the received entry's keys are exactly `sessionId`, `workspaceId`, `repo`, `assistant`, `lastPingAt`, `workspaceHasRun` — in that order
    And `sessionId` is exactly `sess-A` — the value the worker published, byte-identical
    And `workspaceHasRun` is still true — a boolean survived as a boolean, not as a string or a dropped key
    And the same entry survives the next hop too: the node's registry row carries it unchanged, and the served payload delivers it unchanged

  # THE ANTI-WHITELIST PROOF. An unknown key surviving is the property, stated as
  # behaviour — this is what "pass-through" MEANS, and it is how milestones 49 and 50
  # will grow this entry without touching a 37-dependent file.
  Scenario: an entry carrying a key this milestone never heard of also survives
    Given a worker-assembled presence record whose session entry carries the six keys PLUS an unknown key `somethingLater`
    When that frame is applied and the record is read back
    Then all six known keys survive with their values
    And `somethingLater` survives with its value — the control relays the entry, it does not re-specify it
    # If this scenario ever goes red, the cause is a per-field whitelist added at the
    # control — the precise change that would silently drop `sessionId` and leave every
    # other test green. That is why an unknown key, not a known one, is the probe.

  # THE GUARD STILL GUARDS. Pass-through is not absence of validation: the
  # entry-level check that keeps a malformed array from becoming a record must stay.
  Scenario Outline: the entry-level guard still rejects what it rejects today
    Given a presence frame whose `sessions` is <the sessions value>
    When that frame is applied
    Then the published record's `sessions` is <the result>
    And the record is still written — a malformed sessions payload degrades the sessions list, it never fails the whole presence write

    Examples:
      | case                          | the sessions value                    | the result                     |
      | the ordinary case             | one well-formed entry                 | that one entry                 |
      | a null element                | `[null]`                              | an empty array                 |
      | a primitive element           | `["not-an-object"]`                   | an empty array                 |
      | a nested array element        | `[[]]`                                | an empty array                 |
      | mixed good and bad            | one good entry and one null           | just the good entry            |
      | not an array at all           | `"sessions"` as a string              | an empty array                 |
      | absent entirely               | the key omitted                       | an empty array                 |
    # These rows are today's behaviour (control-stream-server.mjs:270-274) restated as
    # a contract, so a rewrite of the pass-through cannot quietly drop the guard along
    # with the whitelist.

  # THE RECORD MUST NOT MOVE WHILE THE ENTRY GROWS. This milestone grows the ENTRY;
  # the presence RECORD's own frozen shape is m38's and m42's and is not in scope.
  Scenario: the presence record's own shape is untouched
    Given a worker-assembled presence record carrying sessions, active runs and a build stamp
    When that frame is applied and the record is read back
    Then the record's keys are `nodeId`, `heartbeatAt`, `activeRuns`, `sessions`, `aofVersion` in that order, with `buildId` present only when the worker published one
    And `sessions` still sits BEFORE `aofVersion` — the m38 position, unmoved
    And `activeRuns` is still a bare array of run-id strings — no element became an object
    And a node with no sessions still publishes `sessions: []` — present, never omitted
    And a node that has never beaten still has no presence record at all — this milestone does not fabricate one

  # THE TYPED MIRROR, asserted where it can honestly be asserted: at runtime, on the
  # payload a consumer actually receives. See the comment block for why the
  # declaration itself is a fitness function and not a Then.
  Scenario: the served payload's session entries match, at runtime, exactly what the wire type claims
    Given a control-side server started on an ephemeral port over a store holding one node with one addressable session and one anonymous session
    When I `GET` the mesh status route it serves
    Then each session entry in the response carries exactly the six keys, in order
    And the addressable session's `sessionId` is a string; the anonymous session's `sessionId` is JSON `null` — never absent, never the string "null"
    And every entry's `workspaceHasRun` is a boolean
    And the response is JSON and the route is a read — issuing it ten times returns byte-identical session entries and changes not one file in the store
