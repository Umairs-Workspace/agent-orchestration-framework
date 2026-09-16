<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 48/03, the LOOKUP: "what live sessions exist across the mesh"
# answered as an O(1) question rather than a scan of assignments.
#
# THE SEAM, read at source. `shapeGlobalStatus({ paths, workProjection, registry,
# assignments, now, cacheStalenessSeconds })` (src/global-mesh-query.mjs:153) is
# already the control node's PURE, no-I/O shaper — it is handed the registry's nodes
# (each carrying `freshness` from `freshnessFor`, global-node-registry.mjs:197, and
# `presence` from the disk merge at `:208-209`) and the assignment rows, and it
# already groups those rows by `targetNodeId` (`:174-175`). So `buildSessionIndex(
# { nodes, assignments, now })` needs no new import, no new query and no new module —
# ADR-007 and ADR-009. It has exactly ONE source dependent (`src/mesh-ui-serve.mjs`),
# which is the graph fact that licenses growing it here rather than minting the 110th
# `src/` root sibling.
#
# WHY A PROJECTION AND NOT A TABLE (ADR-007, and it is the load-bearing negative).
# RESEARCH §6 measured it: no SQLite table is keyed by `(nodeId, sessionId)`;
# `global_assignments.session_id` is the only DB-backed session id and it exists only
# for a session that HAS an assignment — the case this milestone is explicitly not
# about. A new table would make the control node a WRITER of session state, with its
# own row lifetime and therefore its own expiry rule, because the source of truth is a
# TTL-expiring disk record. That is a second authority over liveness (forbidden by the
# SPEC) and a second staleness rule (forbidden by `acd-session-ttl-reuses-isstale`).
#
# NOT ASSERTED HERE, each with an owner:
#  - `workItem` and the assignment join — task 01 of this story.
#  - the entry's six inherited keys at the producer — story 48/01.
#  - the structural claims (no CREATE TABLE/INSERT anywhere names a session index; the
#    function reaches no fs/db call; no `isStale`/`lastPingAt` comparison exists in the
#    index path) — the fitness function `acd-session-index-derived-not-stored`
#    (ARCHITECTURE.md §Fitness functions #5). Every Then below reads a returned value
#    or a real directory listing.
#
# ISOLATION IS MANDATORY wherever a store or a server is involved: a fresh
# `AOF_GLOBAL_HOME` temp dir. An unisolated run writes into the operator's live `~/.aof`
# and corrupts a running soak. Focused runs only, never the full suite
# (`test/global-work-propagation.test.mjs` binds `:4182`, held by the live daemon).
#
# THE PORT TRAP: `:4181` (fleet UI) and `:4182` (control serve) are held by the live
# daemons on this machine. Any server a scenario stands up binds `port: 0` and reads
# `address().port`. No scenario may bind a fixed port.

@executable @cli @work @distribution
Feature: the fleet-side session index — an O(1) answer to "what is live across the mesh", derived fresh every time and stored nowhere
  In order that the control node can name any live session on any node without going through an assignment — and without becoming a second authority over who is alive
  `buildSessionIndex` projects the nodes' already-published, already-TTL-filtered sessions into a lookup on `(nodeId, sessionId)` and a deterministic array, gated by the node liveness the registry already derived, holding no state and writing nothing

  Background:
    Given the pure `buildSessionIndex({ nodes, assignments, now })` called with literal inputs shaped exactly as `shapeGlobalStatus` receives them
    And each node input carries the `freshness` the registry derived and the `presence` record read off disk
    And "the entry" means an element of the index's array form

  # THE HEADLINE, and it is the milestone's premise stated as a test: a session with no
  # assignment anywhere is a first-class answer.
  Scenario: a live session that has no assignment at all is addressable by its tuple
    Given one live node whose presence carries a session with id `sess-A` in repo `demo`
    And NO assignments anywhere in the input
    When I build the index
    Then `lookup("<that node>", "sess-A")` returns that session
    And the array form contains exactly one entry for that tuple
    And the entry's keys are exactly `nodeId`, `sessionId`, `workspaceId`, `repo`, `assistant`, `lastPingAt`, `workspaceHasRun`, `workItem` — in that order
    And the entry is SELF-SUFFICIENT: every one of those values is readable from the entry alone, with no join back into `nodes[].presence`
    And `nodeId` is that node's id and `sessionId` is exactly `sess-A`, both byte-identical to their sources

  # THE FRESHNESS GATE — REQUIRED, NOT DEFENSIVE (ADR-007). A node that stops
  # heartbeating leaves its presence file frozen on disk with its sessions inside it.
  # Without this gate those sessions read live forever.
  Scenario Outline: only a node the registry calls live contributes sessions; ambiguity fails closed
    Given a node whose `freshness` is <freshness>, whose presence carries two live sessions
    When I build the index
    Then the index contains <contribution> from that node
    And that node's `presence.sessions[]` is still non-empty in the payload — the gate withholds a session from the INDEX, it never edits the node's own record

    Examples:
      | case                        | freshness | contribution        |
      | a machine that is beating   | live      | both sessions       |
      | a machine gone quiet        | stale     | nothing             |
      | a machine never seen        | unknown   | nothing             |
    # The stale row is the vivid one and it is why the gate exists: its presence file
    # still says "two sessions" and the honest answer is "I cannot see that machine".
    # The gate reads the fact the registry ALREADY derived (`freshnessFor`,
    # global-node-registry.mjs:197) rather than re-deriving node liveness — so the
    # index and the fleet's own health dot can never disagree about one machine.

  # NODE-LEVEL GATE YES, SESSION-LEVEL RE-FILTER NO (ADR-007). Subtle, and the point.
  Scenario: the control node never re-judges a session's own liveness
    Given a live node whose presence carries a session whose `lastPingAt` is far older than this control node's own configured session TTL
    When I build the index
    Then that session IS in the index — the publisher already TTL-filtered before publishing, and the control carries that through verbatim
    And building the index with a `now` an hour later yields the same entry — no clock of ours decides who is alive
    # Two machines can hold two different `config.mesh.session.ttlSeconds`. A second
    # TTL evaluation here could disagree with the publisher, which is precisely the
    # second authority the SPEC forbids. The publisher is the single filtering
    # authority; the control relays.

  # ANONYMOUS SESSIONS: absent from the index, complete in `sessions[]`. Both halves in
  # ONE scenario so it can never be read as a silent drop.
  Scenario: an anonymous session is not in the index and is not lost either
    Given a live node whose presence carries one session with id `sess-A` and one whose `sessionId` is null
    When I build the index
    Then the index contains exactly one entry, for `sess-A`
    And the node's `presence.sessions[]` still contains BOTH sessions, unchanged
    And nothing in the payload marks the anonymous one as dropped, filtered or degraded
    # `sessions[]` is the complete liveness truth; the index is its ADDRESSABLE subset.
    # An index keyed on `(nodeId, sessionId)` cannot hold an entry whose id is null —
    # that is arithmetic, not policy, and it is stated here so no one reads it as a
    # filter.

  # REBUILDABLE, AND IT STORES NOTHING. The whole reason it can never go stale.
  Scenario: the same inputs yield the same index, twice, with nothing created anywhere
    Given a store directory snapshot taken before the call, and inputs describing three nodes with five sessions between them
    When I build the index twice from those same inputs
    Then the two results are deep-equal
    And the second call did not return the first call's object identity — there is no memoised cache handing back a stale answer
    And a fresh snapshot of the store directory is unchanged: no file created, rewritten or removed
    And no database table was created and no row was written

  # DETERMINISM ON THE WIRE. A fleet that polls must not see rows reshuffle.
  Scenario: the array is sorted by node then session, whatever order the inputs arrive in
    Given inputs whose nodes and sessions are supplied in a deliberately scrambled order
    When I build the index
    Then the array is sorted ascending by `nodeId`, and within a node ascending by `sessionId`, by plain codepoint comparison
    And building it again from the same inputs in a DIFFERENT scrambled order yields a deep-equal array
    # Codepoint, never a locale-sensitive collation — the same rule
    # `fleetCurrentWorkLines` keeps for its repo list (ui/src/fleet/runs.mjs:75-78), so
    # two surfaces cannot disagree about order.

  # THE LOOKUP'S OWN EDGES. A miss must be a calm answer, not an exception, and it must
  # not be satisfiable by half a key.
  Scenario Outline: a lookup that does not match answers, it does not throw
    Given an index built over one live node holding session `sess-A`
    When I call `lookup` with <the tuple>
    Then the result is falsy and no error is thrown
    And a lookup with the CORRECT pair still returns the session — a miss leaves the index usable

    Examples:
      | case                          | the tuple                              |
      | right node, wrong session     | that node with `sess-ZZZ`              |
      | wrong node, right session     | another node's id with `sess-A`        |
      | a null session id             | that node with `null`                  |
      | an empty session id           | that node with `""`                    |
      | both unknown                  | an unknown node with an unknown id     |
    # A QA RULING FLAGGED FOR THE ARCHITECT, not settled here. ADR-007 fixes that
    # `lookup(nodeId, sessionId)` exists and that the index never materialises a
    # composed `"${nodeId}::${sessionId}"` key (which would be a second spelling of the
    # tuple the terminal mirror already composes privately at
    # src/mesh-terminal-mirror.mjs:64-67, and two spellings drift). It does NOT fix
    # whether a miss is `null` or `undefined`. The rows above pin only what is safe —
    # falsy, and never a throw — and route the exact value as a design gap rather than
    # letting the build's first guess become the contract.
    # Rows 2 and 3 are also the anti-half-key proof: a lookup satisfiable by the
    # session id alone would pass row 1 and fail here.

  # THE EMPTY AND DEGENERATE CASES. An honest empty answer, never a fabricated one.
  Scenario Outline: nothing to report reports nothing
    Given <the situation>
    When I build the index
    Then the array form is empty and every lookup is falsy
    And no error is thrown

    Examples:
      | case                               | the situation                                                   |
      | an empty mesh                      | no nodes at all                                                 |
      | live nodes, nobody working         | two live nodes whose presence carries `sessions: []`            |
      | a node that has never beaten       | a node with no `presence` key at all                            |
      | every node stale                   | three stale nodes, each with sessions in their presence records |
