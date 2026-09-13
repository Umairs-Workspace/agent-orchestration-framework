<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/05, THE ROW SET: which sessions become tiles, and which
# emphatically do not. ADR-002's boundary, as behaviour.
#
# THE SEAM, read at source.
#  - `buildSessionIndex({ nodes, assignments })` (src/global-mesh-query.mjs:197) is the ONE
#    enumerating authority. It gates on `node.freshness !== "live"` (`:261`), SKIPS a session
#    whose `sessionId` is not a NON-EMPTY STRING (`:280`), emits the eight-key entry in its
#    frozen order (`:291-309`), keeps ONE row per tuple (`:325`) and sorts ascending
#    `(nodeId, sessionId)` by plain codepoint comparison (`:331-335`).
#  - That array is served as `GlobalMeshStatus.sessions` and typed as `MeshSession`
#    (ui/src/fleet/api.ts:219-228, key `sessions` at `:250`) — `nodeId`, `sessionId`,
#    `workspaceId`, `repo`, `assistant`, `lastPingAt`, `workspaceHasRun`, `workItem`.
#  - `MeshSession` carries NOTHING addressing-shaped beyond the tuple, so a row can only ever
#    resolve against the frozen table's `mirror` row — `path: "/ws/terminal-view"`,
#    `params: ["nodeId","sessionId"]`, `originRole: "fleet"`
#    (ui/src/terminal/source-table.mjs:75-85). `local-pty` (`:63-71`) is unreachable from a row
#    and is OUT of this milestone (ADR-002).
#  - The mount producer is `ui/src/home/session-mount.mjs` (ADR-002), returning the SAME frozen
#    shape `fleetTerminalMount` returns (ui/src/fleet/terminal-mount.mjs:172-199) with the same
#    `noPanel` answer for a row it cannot address (`:130-146`).
#  - The pane key and the identity line are the CORE's, not the home's:
#    `terminalPaneKey(source, params)` (ui/src/terminal/pane-identity.mjs:55-67) and
#    `terminalPaneIdentity` whose label is `<owner> → <farEnd>` (`:102`), gated by
#    `hasVisibleOwner` (`:45-47`).
#
# NOT ASSERTED HERE, each with an owner:
#  - the feed axis, the cap arbiter and the layout filter as pure functions — story 49/02.
#  - the fourth host, the posture literal and invariant 4's amendment — story 49/03.
#  - the route, the page chrome and the page's own empty/loading/error states — story 49/04.
#  - that a pane actually OPENS a socket — task 01 of this story, and it is the milestone's
#    most important contract (ARCHITECTURE bad cut 3 / TECH_DEBT 29).
#  - the structural claims "no module under `ui/src/home/**` reads `status.items[]` to produce a
#    ROW", "the home imports nothing from `ui/src/fleet/` or `ui/src/board/`", "the home defines
#    no state word" — fitness functions `acd-terminal-control-boundary` and `acd-home-pane-truth`
#    (ARCHITECTURE §Fitness functions). Every Then below reads a returned value.
#
# THE TRAP THIS FILE EXISTS FOR: an assignment is not a session. The union
# `sessions[] ∪ assignments-with-a-sessionId` makes the grid full TODAY with no producer work
# and is the one thing ADR-002 refuses — it puts a second authority on "what is live", and an
# assignment's `state` is dispatch lifecycle, not liveness (a `running` assignment on a dead node
# stays `running`). A row that appears because an assignment exists is a VIOLATION, not a bonus.
#
# A SECOND TRAP, and it is an inconsistency this milestone accepts on purpose: in a workspace the
# standard bundle provisioned, a running Claude worker assignment publishes NO presence session
# record, so it renders a live terminal on its milestone CARD and NO ROW here (ADR-002; story 07
# closes the producer). A build must not "fix" that in the browser.
#
# A THIRD TRAP — TWO ORDERS EXIST AND THEY ARE NOT THE SAME. DESIGN §The focus model rule 7 rules
# the GRID's order as `nodeId`, then `repo`, then `sessionId`; the index's own array order is
# `(nodeId, sessionId)` (global-mesh-query.mjs:331-335) and ADR-006 refers to "the index's own
# deterministic order". They differ whenever one node holds two sessions whose repo order and
# session-id order disagree. Scenario 5's Examples contain exactly that row, so a build cannot
# satisfy both silently. QA has routed the conflict; DESIGN's rule 7 is what is pinned here.
#
# ISOLATION: these lanes are PURE — literal payloads and `buildSessionIndex` in-process. No
# store, no server, no port. Any lane that does stand a store up takes a fresh
# `AOF_GLOBAL_HOME=$(mktemp -d)`; `:4181`/`:4182` are held by the live daemons and no scenario
# may bind a fixed port. Focused runs only, never the full suite. The new suite is registered in
# `scripts/test.mjs` the way every suite is (an import beside `:658` and a spread beside `:2278`)
# — an unregistered suite is no gate at all.

@executable @ui @work @board
Feature: the grid's rows come from the session index alone — every addressable live session is a tile, an assignment is never enumerated as one, and a session with no id is not a tile and is not lost either
  In order that one screen answers "what is live across my fleet" with the same answer the mesh itself gives, and never a second, richer, wronger one
  the home composes its tiles from `status.sessions[]` and from nothing else, addresses each one by its `(nodeId, sessionId)` tuple through the frozen `mirror` row, and refuses to invent a tile for anything else on the payload

  Background:
    Given the home's pure row composer, called with a `GlobalMeshStatus` payload shaped exactly as `shapeGlobalStatus` serves it
    And `homeSessionMount(row)` — ADR-002's ONE mount producer — called with a row that composer emitted
    And "a tile" means one element of the composer's ordered output
    And no lane below renders anything: every Then reads a returned value

  # THE HEADLINE. The index has been served and typed since milestone 48 and has, in its own
  # OUTCOME's words, "no reader". This is the reader.
  Scenario: every addressable live session in the payload is one tile, addressed by its tuple
    Given a payload whose `sessions[]` carries three entries across two live nodes
    When the home composes its rows
    Then there are exactly three tiles, one per entry
    And each tile's pane key is exactly `terminalPaneKey(<the mirror row>, { nodeId, sessionId })` for its own entry
    And each tile's mount `params` are exactly `{ nodeId, sessionId }`, byte-identical to the entry's two values
    And each tile's mount `source` is the frozen `mirror` row resolved through `sessionSourceFor("mirror")` — the whole row, never a descriptor assembled from parts
    And no tile's mount names `local-pty`, a `ref` param, a `provider` param or a board origin
    And every tile's mount carries `unavailable: null`

  # AN ASSIGNMENT IS NOT A SESSION. Five payload shapes that are tempting, plausible, and
  # contribute ZERO tiles. Each row is a row a union-based build would render.
  Scenario Outline: nothing but `sessions[]` may put a tile on this grid
    Given a payload whose `sessions[]` is empty
    And <the payload also carries>
    When the home composes its rows
    Then there are ZERO tiles
    And no socket URL is composed for anything on that payload
    And the payload is returned unedited — the composer marks nothing as dropped, filtered or degraded

    Examples:
      | case                                   | the payload also carries                                                                  |
      | the tempting union                     | an item whose `assignment` carries a `targetNodeId` AND a captured `sessionId`             |
      | dispatch lifecycle is not liveness     | a node whose `assignments[]` holds a `running` row with a `sessionId`, on a STALE node      |
      | the node panel's own copy              | a node whose `assignments[]` holds two `running` rows with session ids                      |
      | a run is not a session                 | two nodes reporting non-empty `activeRuns` and `sessions: []` — the measured live fleet      |
      | presence without an index entry        | a node whose `presence.sessions[]` holds a record the index did not admit                    |
    # ROW 5 IS THE SUBTLE ONE: the raw presence array is the complete liveness truth and the
    # index is its ADDRESSABLE subset. Reading the raw array instead of `sessions[]` re-creates
    # the freshness gate and the anonymity rule in the browser, wrongly, twice.

  # ANONYMOUS SESSIONS: not a tile, not lost. Both halves in ONE scenario so it can never be
  # read as a silent drop.
  Scenario: an anonymous session is not a tile and is still visible in the raw presence array
    Given a live node whose `presence.sessions[]` holds one session with id `sess-A` and one whose `sessionId` is null
    And the payload's `sessions[]` therefore carries only `sess-A`
    When the home composes its rows
    Then there is exactly one tile, for `sess-A`
    And the anonymous session has NO tile, NO tuple, NO pane key and NO composed socket URL
    And `nodes[].presence.sessions[]` in the payload still contains BOTH records, unchanged
    And nothing the composer returns marks the anonymous one as dropped, filtered, degraded or errored
    # No tuple, no socket — ADR-014's rule, unchanged since m38. It is arithmetic, not policy: a
    # pane addressed by `(nodeId, sessionId)` cannot be addressed with half of it missing.

  # THE NON-EMPTY-STRING TEST, and it is m48's inherited fitness obligation: never `!= null`,
  # never truthiness. Row 6 is the whole reason — `"0"` is a legitimate session id.
  Scenario Outline: a tile requires a NON-EMPTY STRING session id, tested as one
    Given a payload whose `sessions[]` carries one entry whose `sessionId` is <the value> and whose `nodeId` is `aof-wsl`
    When the home composes its rows
    Then the tile count is <tiles>
    And no error is thrown

    Examples:
      | case                        | the value | tiles |
      | absent                      | undefined | 0     |
      | explicitly null             | null      | 0     |
      | the empty string            | ""        | 0     |
      | a number the wire malformed | 0         | 0     |
      | a boolean                   | false     | 0     |
      | AN ID THAT IS FALSY AS TEXT | "0"       | 1     |
    # The last row fails on `if (session.sessionId)` and on `Boolean(id)`, and passes on
    # `typeof id === "string" && id.length > 0` — which is the test the index itself applies at
    # src/global-mesh-query.mjs:280. Two spellings of one rule is how they come to disagree.
    # The same six rows apply to `nodeId`: a half-tuple is not addressable in either half.

  # ORDER. The grid never re-sorts itself, so order is a contract rather than an outcome.
  Scenario Outline: the tiles are ordered `nodeId`, then `repo`, then `sessionId`, ascending by plain codepoint comparison
    Given `sessions[]` supplied in <the arrival order>
    When the home composes its rows
    Then the tiles read `<the expected order>` by pane key
    And composing the same payload again in a DIFFERENT arrival order yields a deep-equal tile list
    And nothing in the order keys on connection state, agent state, `lastPingAt` or recency

    Examples:
      | case                          | the arrival order                                                                     | the expected order                    |
      | scrambled input               | `(msi, s-9)`, `(aof-wsl, s-2)`, `(msi, s-1)`                                          | (aof-wsl,s-2), (msi,s-1), (msi,s-9)   |
      | codepoint, never locale       | repos `Beta` and `alpha` on one node                                                  | `Beta` before `alpha` — uppercase sorts first by codepoint |
      | THE ORDER CONFLICT, PINNED    | one node with `(s-1, repo "zeta")` and `(s-2, repo "alpha")`                          | `(s-2, alpha)` before `(s-1, zeta)`   |
    # ROW 3 IS WHY THIS OUTLINE EXISTS. Sorting by the index's own `(nodeId, sessionId)` puts
    # `s-1` first; DESIGN §The focus model rule 7 puts `alpha` first. Both are "deterministic",
    # so both read green against a vaguer contract. DESIGN's rule is what is pinned; the
    # divergence from ADR-006's phrasing is a QA finding routed at refine, not settled here.
    # Locale-independence is the same reason `fleetCurrentWorkLines` uses a plain `<`/`>`
    # comparison (ui/src/fleet/runs.mjs:103): two surfaces may not disagree about order.

  # STABILITY ACROSS THE POLL. The whole payload re-polls every 5000ms
  # (ui/src/fleet/assign-affordance.mjs:54, consumed at ui/src/fleet/Fleet.tsx:462), so a tile
  # list that is not stable is a grid that reshuffles under the operator's cursor every 5s.
  Scenario: the same payload twice yields the same tiles, with the same keys
    Given a payload with five sessions across three nodes
    When the home composes its rows twice from that same payload
    Then the two tile lists are deep-equal
    And every tile's pane key is identical between the two, so a re-render re-uses the same tile rather than replacing it
    And the second call did not hand back the first call's object identity — there is no memoised answer that could go stale
    And composing from a payload with one session ADDED leaves every surviving tile's pane key unchanged

  # `items[]` IS JOINED, NEVER ENUMERATED. The join is by `workItem.ref`, which is exactly what
  # milestone 48 designed the entry's `workItem` for.
  Scenario: a work item contributes a LABEL to a row that already exists, and never a row
    Given a payload with one session carrying `workItem: { ref: "49/05", assignmentId: "a-1" }`
    And an `items[]` holding `49/05` plus four other items with assignments and no sessions
    When the home composes its rows
    Then there is exactly ONE tile
    And that tile's owner is the work-item ref `49/05`
    And the four other items contribute no tile, no pane key and no socket URL
    And a session whose `workItem.ref` matches NOTHING in `items[]` STILL renders its tile, still owned by that ref — a missing join loses a title, never a session

  # THE IDENTITY LINE, source-shaped (DESIGN §S2). V1 is satisfied without inventing an owner:
  # a free session's owner is its `repo`, which is a real field on the row.
  Scenario Outline: the tile names its owner from the row, and never invents one
    Given a session on node `aof-wsl` with id `7f3a91c` in repo `demo`, <the work item>
    When the home composes its mount and the core derives the pane identity
    Then the mount's `ref` is <owner>
    And the mount's `farEnd` is `aof-wsl`
    And the mount's `detail` is `session 7f3a91c`
    And the rendered identity label is `<owner> → aof-wsl`
    And the repo is shown as a separate field <repo shown>

    Examples:
      | case                  | the work item                              | owner  | repo shown                          |
      | an assignment's session | `{ ref: "49/05", assignmentId: "a-1" }`  | 49/05  | yes — it is not the owner            |
      | a free session        | `null`                                     | demo   | no — it is already the owner         |
    # `detail` is the FIRST thing to yield when the header cannot fit, dropped WHOLE with its
    # separator (ui/src/terminal/TerminalIdentity.tsx:100-104); the owner never yields. At every
    # grid width the tail is already dropped, which is why it may not carry anything unique.

  # V1, THE OTHER DIRECTION: a row that can name no owner renders NO TERMINAL AT ALL — not an
  # empty frame, not a disabled toggle, and NOT an `unavailable` pane.
  Scenario: a row with no work item and no repo renders no pane rather than a nameless one
    Given a session whose `workItem` is null and whose `repo` is `""`
    When the home composes its mount
    Then the mount is the `noPanel` shape: `bound: false`, `rendersPanel: false`, `source: null`, `params: {}`
    And it names WHY through its own no-stream reason
    And it carries `unavailable: null` — "no stream" and "unavailable" are different facts and this is exactly the milestone where they would be confused
    And no socket URL is composed for it
    # ui/src/fleet/terminal-mount.mjs:28-34 states the distinction and :130-146 is the shape.
    # An invented owner is precisely the bare session hash V1 exists to keep off the screen.

  # THE ORDINARY CASE, and DESIGN says so: the grid is very often empty. It reports nothing
  # rather than fabricating something.
  Scenario Outline: nothing addressable means no tiles, calmly
    Given <the payload>
    When the home composes its rows
    Then the tile list is empty
    And no error is thrown
    And the composer reports no failure state of its own — an empty grid is the PAGE's state to render, not an error

    Examples:
      | case                              | the payload                                                              |
      | an empty mesh                     | `sessions: []` and no nodes at all                                       |
      | the measured live fleet           | `sessions: []`, three live nodes, two with non-empty `activeRuns`        |
      | every node gone quiet             | `sessions: []`, three nodes whose `freshness` is `stale`                 |
      | the key is missing entirely       | a payload with no `sessions` key at all — a pre-m48 build on the wire    |
      | the key is not an array           | `sessions: {}`                                                           |
    # ROWS 4 AND 5 ARE THE FAIL-CLOSED PAIR. `sessions` is always present from an m48 build
    # (ui/src/fleet/api.ts:246-250 — "a store with no live session serves `sessions: []`"), so a
    # missing or malformed key means a build that does not report sessions, and the honest
    # answer is no tiles rather than a thrown surface inside `SurfaceSlot`.
