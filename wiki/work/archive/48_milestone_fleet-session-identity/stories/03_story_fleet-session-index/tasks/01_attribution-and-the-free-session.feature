<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 48/03, the ATTRIBUTION: what a live session is DOING, joined
# one-directionally, with "nothing" as a real answer.
#
# THE AUTHORITY SPLIT (ADR-003), and it is what keeps two records from disagreeing:
# PRESENCE is the sole authority on a session's EXISTENCE and LIVENESS; the ASSIGNMENT
# is the sole authority on its WORK ATTRIBUTION. The join runs one way only — `workItem`
# derives ONTO the session at the index, and the session RECORD stores no ref, ever.
# RESEARCH §2 measured why this is safe: the id the session publishes and
# `global_assignments.session_id` are the SAME Claude Code UUID (the worker reads it off
# the transcript filename Claude Code itself names), so the join is an equality on one
# value rather than a reconciliation between two.
#
# THE JOIN IS TWO-COLUMN: `(target_node_id, session_id)`. A one-column match is a bug —
# session ids are opaque values from another system and nothing guarantees a worker's id
# is unique across machines. `shapeGlobalStatus` already groups assignment rows by
# `targetNodeId` (src/global-mesh-query.mjs:174-175) and already has `projectAssignment`
# (`:132`), so no new query is needed (ADR-007/ADR-009).
#
# NOT ASSERTED HERE, each with an owner:
#  - the index's projection nature, the freshness gate, sorting and rebuildability —
#    task 00 of this story.
#  - the six inherited keys at the producer — story 48/01.
#  - the structural claims (the session RECORD's frozen key set contains no
#    ref/itemRef/workItem/assignmentId; no session WRITE path reads `global_assignments`;
#    `workItem` is produced ONLY at the index) — the fitness function
#    `acd-session-attribution-single-authority` (ARCHITECTURE.md §Fitness functions #6).
#  - the `MeshSession` TypeScript DECLARATION itself — `acd-session-index-derived-not-stored`
#    /`acd-session-entry-frozen-wire` territory. THE DIVISION IS DELIBERATE: this repo
#    has no TypeScript compile gate a Gherkin scenario could stand on, so the scenarios
#    below assert the RUNTIME shape of the SERVED payload — what a consumer actually
#    receives — and the declaration is pinned structurally.
#
# ISOLATION IS MANDATORY. A fresh `AOF_GLOBAL_HOME` temp dir per scenario; an
# unisolated run writes into the operator's live `~/.aof` and corrupts a running soak.
# Focused runs only, never the full suite (`test/global-work-propagation.test.mjs`
# binds `:4182`, held by the live control daemon).
#
# THE PORT TRAP: `:4181` and `:4182` are held by the live daemons on this machine.
# Every server below binds `port: 0` and reads `address().port` — the established idiom
# (test/mesh-ui-serve.test.mjs). No scenario may bind a fixed port.

@executable @cli @ui @work @distribution
Feature: a session says what it is working on, or says plainly that it is working on nothing — and the payload carries the index to the browser
  In order that "a session with no work item" is a first-class answer rather than an absence, and that the item a session IS working on is read from the one record that owns that fact
  each index entry carries `workItem` explicitly — `null` for a free session, `{ ref, assignmentId }` when an assignment matches on both node and session — and the whole index reaches the served payload as one additive key that disturbs nothing already there

  Background:
    Given an isolated global mesh store (a fresh `AOF_GLOBAL_HOME` temp dir)
    And any server started below binds an ephemeral port (`port: 0`), never `:4181` or `:4182`
    And "the entry" means an element of the index the control node builds

  # THE HEADLINE, and the SPEC calls it the whole point: a session with no work item is
  # not an edge case to be filtered away.
  Scenario: a free session is present, complete, and says so with an explicit null
    Given a live node holding a live session `sess-A`, with no assignment anywhere that names it
    When the index is built
    Then the entry for `sess-A` is present — not dropped, not demoted, not annotated as incomplete
    And it has the key `workItem` PRESENT with the value JSON `null`
    And `workItem` is not omitted, not `undefined`, not an empty object, and not a fabricated ref of any kind
    And every other value on the entry is exactly what the session published

  # THE JOIN, when there is one — and nothing more than the join.
  Scenario: a session doing assignment work carries exactly the ref and the assignment id
    Given a live node holding a live session `sess-A`
    And an assignment whose `targetNodeId` is that node and whose `sessionId` is `sess-A`, for item ref `48/03`
    When the index is built
    Then the entry's `workItem` is `{ ref: "48/03", assignmentId: <that assignment's id> }`
    And `workItem` carries exactly those two keys and no more — no title, no status, no workspace id, no state, no timestamps
    And the item's own title and status are still reachable from the payload's `items[]`, joined on the ref
    # Copying the item's other fields here would be a second derivation of facts the
    # payload already carries once — the shape these reviews keep refusing. The entry
    # is self-sufficient for ROUTING; `items[]` remains the authority on the item.

  # THE TWO-COLUMN KEY. A one-column match passes the happy path and quietly
  # mis-attributes work to the wrong machine.
  Scenario Outline: an assignment joins only when BOTH the node and the session match
    Given a live node `node-1` holding a live session `sess-A`
    And an assignment of the shape <the assignment>
    When the index is built
    Then the entry for `node-1`/`sess-A` has `workItem` <the result>

    Examples:
      | case                                     | the assignment                                          | the result   |
      | the genuine match                        | `targetNodeId` node-1, `sessionId` sess-A               | the join     |
      | same session id, different machine       | `targetNodeId` node-2, `sessionId` sess-A               | null         |
      | same machine, different session          | `targetNodeId` node-1, `sessionId` sess-B               | null         |
      | same machine, no session captured yet    | `targetNodeId` node-1, no `sessionId` key at all        | null         |
      | same machine, null session id            | `targetNodeId` node-1, `sessionId` null                 | null         |
      | no assignments at all                    | none                                                    | null         |
    # Rows 4 and 5 are ordinary, not exotic: an assignment omits `sessionId` entirely
    # until its worker captures one mid-run (m38/ADR-013 — "absent, not false"). A join
    # that treats absent as a wildcard would attribute someone else's work to this
    # session.

  # SINGLE AUTHORITY, stated as an equality rather than a reconciliation (ADR-003).
  Scenario: the id on the session and the id on the assignment are ONE value, never two that need agreeing
    Given a worker session whose published `sessionId` is a real Claude Code UUID
    And the assignment that worker stamped, carrying its captured session id
    When the index is built
    Then the two ids are byte-identical, and the join succeeds on that equality alone
    And nothing anywhere reconciles, prefers, or falls back between two differing ids — there is only one value
    And the session RECORD on disk carries no `ref`, no `itemRef`, no `workItem` and no `assignmentId` — attribution derives onto the session and is stored nowhere
    # If these two ever diverged, the correct outcome is a session with `workItem:
    # null` (an unmatched join), never a guess. The derivation is one-directional by
    # construction, so divergence degrades to "unknown", which is honest.

  # THE PAYLOAD GROWS BY EXACTLY ONE KEY. Additivity proved, not promised.
  Scenario: the global status payload gains `sessions` and nothing else moves
    Given a control-side server started on an ephemeral port over a store with two live nodes, three sessions and one matching assignment
    When I `GET` the global mesh status route
    Then the response body has a top-level key `sessions` holding the index array
    And its other top-level keys are exactly `scope`, `workspaceId`, `stalenessSeconds`, `workspaces`, `items`, `nodes`, `diagnostics` — the same set, with the same values, that the same fixture produces without this feature
    And `nodes[].presence.sessions[]` is unchanged — the index does not replace or edit the per-node liveness it derives from
    And each item's own `assignment` attachment is unchanged — the index reads assignments, it never rewrites them

  # THE SERVED RUNTIME SHAPE — the honest place to assert the typed mirror. See the
  # comment block for why the declaration itself is a fitness function.
  Scenario: what the browser receives matches, at runtime, exactly what the wire type claims
    Given a control-side server on an ephemeral port over a store holding one session with an assignment and one free session
    When I `GET` the global mesh status route
    Then every element of `sessions` carries exactly `nodeId`, `sessionId`, `workspaceId`, `repo`, `assistant`, `lastPingAt`, `workspaceHasRun`, `workItem` — in that order
    And every `sessionId` is a non-empty string — an anonymous session never reaches this array
    And every `workspaceHasRun` is a boolean, and every `workItem` is either JSON `null` or an object with exactly `ref` and `assignmentId`
    And the route is a read: ten identical requests return byte-identical `sessions` arrays and change not one file in the store
    And a store holding no live sessions serves `sessions: []` — present and empty, never omitted, so a consumer can tell "nobody is working" from "this build does not report sessions"
