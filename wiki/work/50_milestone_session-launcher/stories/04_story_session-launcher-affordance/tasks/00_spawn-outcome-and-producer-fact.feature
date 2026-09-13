<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 50/04, LANE A + LANE B (ADR-008): the worker's spawn outcome
# reaches the operator's browser, and a launched session states — on the wire — that
# something is relaying it.
#
# EVERY FACT BELOW WAS READ AT ITS CALL SITE FOR THIS REFINE, not inferred from a
# comment. Three documents in this milestone were already wrong for doing the latter.
#
# THE ACK LANE, AS SHIPPED (lane A's premise, measured):
#  - The worker mints exactly four coded refusals and one success, all of them AFTER
#    the fleet face answered `200 {ok:true,sessionId}`: `session-repo-unavailable`
#    (mesh-session-spawn-handler.mjs:227,244,260,270,278), `session-already-active`
#    (:235), `session-worktree-failed` (:290), `session-spawn-failed` (:311,315,340),
#    and `ack(sessionId, true)` on a successful spawn (:427).
#  - All five ride ONE frame: `sendSessionSpawnAck` (worker-stream-client.mjs:852-854)
#    building `buildSessionSpawnAckFrame` (mesh-session-spawn-directive.mjs:22-26). The
#    built frame is EXACTLY `{ kind, sessionId, nodeId, ok }` plus `code` when `!ok` —
#    **there is no message field on it.** The worker's own sentence goes to its local log
#    (`refuse()`, :210-213) and NOWHERE else. This is load-bearing for task 02.
#  - Nothing reads it. In control-stream-server.mjs the message handler branches
#    `heartbeat` (:1206), `TERMINAL_FRAME_KIND` (:1221) and `assignment-status` (:1234),
#    then falls into `applyStreamFrame`, whose kind table ends
#    `{ published:false, skipped:true, code:"unknown-frame-kind" }` (:812-824) — routed to
#    `onFrameSkipped` (:1255-1263) and into the launcher's warning emitter
#    (mesh-launcher.mjs:966-977), which writes a sentence with three false claims in it.
#  - The UP direction is already solved for BYTES, in production, over the same seams:
#    `client.sendTerminalFrame` (worker-stream-client.mjs:614-625) → the control's
#    pre-apply branch (:1221-1228) → the launcher's literal `onTerminalFrame` wiring with
#    the F17 re-stamp (mesh-launcher.mjs:960) → the relay's fan-out, which forwards an
#    unknown `kind` byte-for-byte and parses only `{ kind, nodeId }`
#    (mesh-relay.mjs:585-604, parseEnvelope :287-300) → the mesh-ui process's ONE
#    subscriber (mesh-ui-serve.mjs:1081-1083, wired at commands/mesh-ui.mjs:80), whose
#    `parseInboundTerminalFrame` is kind-agnostic (mesh-terminal-mirror.mjs:243-255) →
#    `mirror.apply`. Every hop the ack needs exists and is under test.
#  - The presence-lie window is real and only the control can see it: the route's 503 is
#    resolved from `queryGlobalMeshStatus` freshness (mesh-ui-serve.mjs:709,752) whose
#    default staleness is 60s (global-node-registry.mjs:153, freshnessFor :303-309), while
#    the authoritative not-connected fact appears post-200 in the serve process at
#    mesh-terminal-input.mjs:140-143 (`result?.sent !== true`), where no browser listens.
#
# THE PRODUCER FACT, AS SHIPPED (lane B's premise, measured):
#  - `establishedProducer` requires a non-blank `ref` AND `assignmentId` on `workItem`
#    (feed-axis.mjs:79-89) and `workItemAxis` is the whole derivation (:91-97). A launched
#    session is free — `workItem: null` — so it reads `no-producer`, which costs the pane
#    its socket (grid.mjs:181-185 `dialableTiles`), its keyboard (session-mount.mjs:211+,
#    `bound: axis !== FEED_NO_PRODUCER`, `posture: … POSTURE_READ_ONLY`) and its chip
#    (feed-axis.mjs NO_LIVE_OUTPUT_REASON) — while story 03 is streaming its bytes.
#  - The four hops the fact must survive: `assembleSessionRecord` (mesh-session.mjs:142,
#    the frozen seven), `readLiveSessions`'s pushed literal (mesh-presence.mjs:136-143, the
#    frozen six), `safeSessionArray` (control-stream-server.mjs:272-276 — a SHAPE filter
#    that must NOT gain a key whitelist), and `buildSessionIndex`'s entry
#    (global-mesh-query.mjs:317-335, the unconditional eight).
#  - MEASURED AND FLAGGED — the producer-site gate is ALREADY RED at HEAD, with TWO
#    problems, not one. Driven this refine (`outputSignalProblems` over a live src/ sweep):
#      (a) `3 .sendTerminalFrame( producers found … the CEILING is 2`, and
#      (b) `src/mesh-launcher.mjs: a .sendTerminalFrame( call site sits OUTSIDE any
#          onOutputChunk: property VALUE`.
#    The third site is `sendTerminalFrame: (sessionId, bytes) => client.sendTerminalFrame(
#    sessionId, bytes)` at mesh-launcher.mjs:1296 — a BRIDGE key, not an `onOutputChunk:`
#    arrow. ADR-008 FF-E raises the number and says the "sanctioned-arrow shape" is
#    untouched; that closes (a) and leaves (b) red. The scenario below is written so the
#    gate ends GREEN with all three sites named — which needs a SECOND enumerated
#    sanctioned shape, never a relaxed pattern. Routed as a finding.
#
# NOT ASSERTED HERE, each with an owner:
#  - the picker's population and its empty cases — task 01.
#  - the operator-visible states, the two deadlines and the code→language map — task 02.
#  - anything rendered (a chip, a pill, a tile's anatomy) — 49/DESIGN §S2 and the `@uat`
#    visual review. Every `Then` below reads a RETURNED VALUE, a FRAME, a RECORD or an
#    HTTP RESPONSE.
#
# ISOLATION. Every scenario runs under plain `node:test` with a fresh
# `AOF_GLOBAL_HOME=$(mktemp -d)` (the guard hook requires it and lane B writes real session
# records). Focused runs only — the full suite binds :4182, which the live control daemon
# holds. No scenario binds :4181 or :4182. A new suite is registered in `scripts/test.mjs`
# (`acd-test-suite-registration`).

@executable @cli @work-stream
Feature: the spawn-outcome lane and the `relaying` producer fact — a failed spawn says why, and a launched session renders live
  In order that SPEC's "never a spinner that ends in an empty grid slot" holds for the three failure modes it names by name, and that the milestone's own headline session is a typeable pane rather than a dead tile
  the worker's `session-spawn-ack` reaches an ephemeral, tuple-keyed outcome registry in the mesh-ui process over the SHIPPED loopback relay and is readable at one new GET route; the control synthesises the one outcome only it can see; and the worker STATES `relaying: true` on the session record, which survives four hops and becomes the second half of the browser's feed-axis disjunction

  Background:
    Given the shipped modules imported unedited unless a scenario says otherwise
    And a fake worker frame is driven in at the control stream server's own message seam — never by reaching past it
    And "the registry" means the spawn-outcome registry constructed in the mesh-ui process
    And "the outcome route" means `GET /api/mesh/session-outcome?nodeId=<id>&sessionId=<id>`
    And no scenario passes terminal bytes into any function under test

  # ═══ LANE A · THE ACK REACHES A READER ═══════════════════════════════════════════════

  # THE HEADLINE. It is end-to-end over the seams that already carry bytes, because the
  # defect this closes is precisely that each half was green while the lane did not exist.
  Scenario: a worker's failed spawn ack travels the shipped relay and is readable at the outcome route
    Given a control stream server holding an admitted connection whose connection-bound nodeId is "n1"
    And a mesh-ui process whose one relay subscriber is connected and fans every inbound frame to the registry
    When the worker sends `{ kind: "session-spawn-ack", sessionId: "s-1", nodeId: "n1", ok: false, code: "session-repo-unavailable" }` up that connection
    Then the control hands the frame to its `onSessionSpawnAck` sink and pushes ONE relay envelope of the shape `{ kind, nodeId, signal }`, with `sessionId`, `ok` and `code` inside `signal` and no fourth top-level key
    And the registry's `apply` accepts that envelope and returns true
    And `GET /api/mesh/session-outcome?nodeId=n1&sessionId=s-1` answers `200 { ok: true, nodeId: "n1", sessionId: "s-1", state: "failed", code: "session-repo-unavailable", at: <the ack's instant> }`
    And no session record, presence record or store row was written anywhere on that path

  # THE FALSE DIAGNOSTIC THE MILESTONE SHIPS TODAY, DELETED — and it is asserted as a
  # behaviour rather than as a diff, because the sentence is what an operator reads.
  Scenario: the ack is branched before any store apply, so it never reaches the unknown-kind path
    Given a control stream server with a registered frame-skipped sink and a registered ack sink
    When a `session-spawn-ack` frame arrives on an admitted connection
    Then the ack sink is called exactly once with the frame and the connection's nodeId
    And the frame-skipped sink is NOT called
    And no warning is emitted containing "items were DISCARDED" or "no registered descriptor"
    And `applyStreamFrame`'s kind table still does not recognise the ack — a direct call with that frame still answers `{ published: false, skipped: true, code: "unknown-frame-kind" }`
    # The last clause is the negative half: the fix is a BRANCH BEFORE the apply, never a
    # new row in the persist table (ADR-008 decision 2; ADR-002 decision 6's no-persist
    # clause and ADR-004 decision 5's "only the worker writes a session record" both stand).

  # F17, AT A SECOND ADDRESS. The byte lane already re-stamps; a lane that did not would
  # let any admitted worker refuse another node's pending spawn.
  Scenario: an admitted worker cannot resolve another node's pending spawn
    Given a browser waiting on the tuple ("n1", "s-1")
    And an admitted connection whose connection-bound nodeId is "n2"
    When that connection sends `{ kind: "session-spawn-ack", sessionId: "s-1", nodeId: "n1", ok: false, code: "session-spawn-failed" }`
    Then the envelope pushed to the relay carries nodeId "n2" — the connection-bound identity — and the worker's self-declared "n1" is discarded
    And the registry holds an entry at ("n2", "s-1") and NOTHING at ("n1", "s-1")
    And the outcome route still answers `state: "pending"` for ("n1", "s-1")

  # THE ONE OUTCOME ONLY THE CONTROL CAN SEE (decision 3). This is the presence-lie window
  # closed: presence said `live` inside its 60s ramp, the stream was already gone, and the
  # only trace was a log line in a process no browser talks to.
  Scenario: a dispatch the router could not route becomes a synthesised refusal on the same lane
    Given the serve process's terminal-input router with an injected `onSessionSpawnRefused`
    And a session-spawn envelope for node "n1", session "s-1", workspace "ws-aof"
    When `dispatchDirective` reports a result whose `sent` is not true
    Then `onSessionSpawnRefused` is called once with `{ nodeId: "n1", sessionId: "s-1", code: "session-target-not-connected" }`
    And the launcher's wiring pushes a `session-spawn-ack` envelope with `ok: false` and that code
    And the outcome route answers `state: "failed", code: "session-target-not-connected"` for that tuple
    And the browser needs exactly ONE reader for this and for a worker's own ack — same kind, same envelope, same registry
    And no worker produced this outcome, and no `source` field distinguishes it: the code itself is one no worker can mint

  # QA-DESIGNED BOUNDARY, stated because ADR-008 does not: the router ALSO returns false on
  # a malformed envelope (mesh-terminal-input.mjs:117-121, before any dispatch) and on a
  # dispatch that THROWS (:143-146, `reportDegrade` then return false). Neither reaches the
  # `sent !== true` branch the refusal hangs on.
  Scenario Outline: a session-spawn envelope the router refuses never fabricates a success
    Given the serve process's terminal-input router with an injected refusal sink
    When an envelope <the envelope> is applied
    Then no outcome with `ok: true` is ever registered for that tuple
    And the refusal sink is called exactly when <refusal synthesised>
    And `apply` returns false and no exception escapes

    Examples:
      | case                                        | the envelope                                     | refusal synthesised |
      | the target has no live stream connection    | valid, dispatch reports `{ sent: false }`        | yes                 |
      | dispatch throws                             | valid, dispatch throws                           | (see the note)      |
      | no sessionId in `signal`                    | nodeId + workspaceId only                        | no — there is no tuple to key an outcome on |
      | no workspaceId in `signal`                  | nodeId + sessionId only                          | no — the frame is dropped before dispatch |
      | a foreign kind                              | `{ kind: "presence", … }`                        | no — the router is kind-blind to it |
    # ROW 2 IS DELIBERATELY UNRULED AND IS ROUTED AS A FINDING. ADR-008 decision 3 places
    # the callback in the `result?.sent !== true` branch ONLY, so a dispatch that THROWS
    # leaves the browser to wait out its own window and read "no answer" for a fault the
    # control observed. Either behaviour satisfies this row; what may NOT happen is an
    # `ok: true` outcome or a swallowed exception. If the architect rules, this row is
    # where it lands.

  # THE REGISTRY'S OWN CONTRACT — ephemeral, tuple-keyed, bounded, and with no lifecycle.
  Scenario: the registry is a bounded in-memory map with no timer, no handle and no store
    Given a registry constructed with an injected clock
    When 65 distinct outcomes are applied in order
    Then at most 64 entries are retained and the least-recently-used tuple was evicted
    And an entry older than 120000ms reads as absent, and the pruning happens inside `apply` and `read` rather than on a timer
    And the registry exposes no `dispose`/`stop`/`close`, holds no interval handle, and imports no fs, store or network module
    And a freshly constructed registry answers `null` for every tuple — a restarted process loses the EXPLANATION of a spawn, never data
    And `read` never throws for any input, including a null tuple, a numeric sessionId and a frozen argument

  # THE ROUTE, INCLUDING THE THING IT MUST NEVER SAY.
  Scenario Outline: the outcome route answers a state for every tuple and never a 404
    Given a registry in the state <registry state>
    And the mesh-ui process's relay subscriber is <subscriber>
    When I request the outcome route for the tuple ("n1", "s-1")
    Then the response is `200` with `ok: true`, `nodeId: "n1"`, `sessionId: "s-1"`
    And `state` is <state> and `code` is <code>
    And the response is never `404`, and the route never invents a terminal state it cannot observe

    Examples:
      | case                                   | registry state                          | subscriber    | state   | code                          |
      | nothing has arrived yet                | empty                                   | connected     | pending | null                          |
      | the PTY opened                         | `{ ok: true }` at ("n1","s-1")          | connected     | started | null                          |
      | the worker refused                     | `{ ok: false, code: "session-spawn-failed" }` | connected | failed  | session-spawn-failed          |
      | the control synthesised a refusal      | `{ ok: false, code: "session-target-not-connected" }` | connected | failed | session-target-not-connected |
      | this control node cannot hear at all   | empty                                   | not connected | unknown | spawn-outcome-lane-unavailable |
      | an answer arrived, then the lane dropped | `{ ok: false, code: "session-worktree-failed" }` | not connected | failed | session-worktree-failed |
    # THE LAST ROW IS A QA RULING, and it is the one ADR-008 leaves implicit. Decision 6
    # says the route answers `unknown` "instead of pending" — so a RETAINED outcome
    # outranks the lane's connectivity. Answering `unknown` over an answer already in hand
    # would throw away the only honest thing the lane ever produced.

  Scenario Outline: the outcome route refuses a malformed query and every non-read method
    When I request the outcome route <the request>
    Then the response is <status> with code <code>
    And a `405` carries an `Allow` header of `GET, HEAD`

    Examples:
      | case                       | the request                                   | status | code              |
      | no nodeId                  | `?sessionId=s-1`                              | 400    | invalid-query     |
      | no sessionId               | `?nodeId=n1`                                  | 400    | invalid-query     |
      | blank nodeId               | `?nodeId=&sessionId=s-1`                      | 400    | invalid-query     |
      | whitespace sessionId       | `?nodeId=n1&sessionId=%20`                    | 400    | invalid-query     |
      | no query at all            | (bare path)                                   | 400    | invalid-query     |
      | HEAD                       | HEAD with a valid query                       | 200    | (no error body)   |
      | POST                       | POST with a valid query                       | 405    | method-not-allowed |
      | DELETE                     | DELETE with a valid query                     | 405    | method-not-allowed |

  # THE BOUND DID NOT MOVE, WHICH IS THE STORY'S OWN ACCEPTANCE CRITERION VERBATIM.
  Scenario: the fleet face gains a READ route and its write allowlist stays exactly two
    Given the shipped `src/mesh-ui-serve.mjs` after this task
    When the four route-table detectors read it
    Then the declared `/api/mesh/*` routes are exactly `assign`, `board-url`, `session`, `session-outcome`, `status` — enumerated by name in each detector, never relaxed to a pattern
    And the WRITE routes are still exactly `assign` and `session`
    And `session-outcome` appears in each detector's READ set and in none of its WRITE sets
    And the outcome route's own region calls none of `queryGlobalMeshStatus(`, `existsSync(`, `controlNodeId(`, `readJsonBody(`, `assignWork(` or `.push(` — it is a method guard and a map read
    And the face still performs zero fs write and no shell-out

  # THE RATCHET THAT MAKES THIS MILESTONE'S OWN DEFECT STRUCTURALLY UNREPEATABLE (FF-B).
  # It is RED at HEAD and green with the lane, which is the strongest evidence a gate can
  # carry. Measured this refine: `SESSION_SPAWN_ACK_KIND` is referenced by ONE file in
  # `src/` — its own declaring home.
  Scenario: every declared wire kind has both a producing end and a reading end
    Given a sweep of every `export const <NAME>_KIND = "<string literal>"` under `src/`
    When each kind is checked for a build/send end and a read/branch end
    Then `SESSION_SPAWN_ACK_KIND` has both after this task — built and sent by the worker client, branched by the control stream server, filtered by the registry
    And the same gate run against HEAD before this task reports `SESSION_SPAWN_ACK_KIND` as having no reading end
    And a kind whose second end is a RE-SPELLED string literal rather than the imported constant is either fixed at that site or named in an explicit exemption ENUMERATION with that reason — never matched by a pattern
    And the gate carries a planted-violation self-check for each clause
    # MEASURED, AND IT IS A SCOPE WARNING RATHER THAN A DESIGN OBJECTION. Applied literally
    # ("two modules other than the declaring home"), this gate is red at HEAD for at least
    # seven of the sixteen `*_KIND` constants: `PRESENCE_SIGNAL_KIND` and `WITHDRAW_KIND`
    # (each has a genuine RE-SPELLED counterpart — mesh-assignment-reclaim.mjs:372 sends
    # `kind: "withdraw"` as a literal, and the control branches `kind === "presence"`),
    # `RECOVERY_PUSH_RESULT_KIND` / `RESYNC_KIND` / `RESYNC_RESULT_KIND` /
    # `LOG_ENTRIES_FRAME_KIND` (whose BUILDER legitimately lives in the declaring home, so
    # only one OTHER module ever references the constant), and `WORKFLOW_KIND`, which is
    # not a wire kind at all — its value is an object, which is why the sweep above is
    # scoped to STRING-valued declarations rather than exempting it. The exemption list
    # must stay an enumeration; if it would need to hold seven of sixteen entries, the
    # rule wants narrowing rather than exempting. Routed as a finding.

  # ═══ LANE B · THE PRODUCER FACT ══════════════════════════════════════════════════════

  Scenario: the worker states the fact, and only the worker
    Given a session-spawn directive `{ sessionId: "s-1", workspaceId: "ws-aof", assistant: "claude" }`
    And the PTY opens successfully
    When the handler registers the session
    Then `startSession` is called with `relaying: true` alongside the existing 4-part key and `repo`
    And the written record contains `relaying: true` beside the seven keys the frozen schema already carries
    And every ping for that session also carries `relaying: true`
    And nothing in the control's process writes, derives or infers this field for another node

  # STICKY ON PING, mirroring `pingSession`'s existing `repo: existing?.repo ?? repo`
  # carry-forward (mesh-session.mjs:339). A ping that omits it must never demote a live
  # pane to `no live output` mid-session.
  Scenario Outline: a ping resolves `relaying` as the disjunction of what it states and what is on disk
    Given an existing session record whose `relaying` is <on disk>
    When a ping arrives stating <ping states>
    Then the record's `relaying` reads <result>
    And `startedAt` is unchanged and `lastPingAt` advances

    Examples:
      | case                                | on disk   | ping states | result |
      | the launcher's own ping             | true      | true        | true   |
      | a ping that forgot the field        | true      | (absent)    | true   |
      | a hook-registered session, unchanged| (absent)  | (absent)    | false  |
      | a bridge that started mid-session   | (absent)  | true        | true   |
      | an explicit false cannot demote     | true      | false       | true   |
    # THE LAST ROW IS A QA RULING. ADR-008 decision 8 spells the rule
    # `relaying === true || existing?.relaying === true`, which makes an explicit `false`
    # non-demoting. That is the honest reading of "sticky" and it is what keeps a pane
    # typeable across a ping; a build that let `false` win would reintroduce the exact
    # mid-session demotion the stickiness exists to prevent.

  Scenario: the fact survives all four hops, and the hop that must NOT change does not
    Given a worker whose session record carries `relaying: true`
    When the presence ticker projects it, the control applies the presence frame, and the fleet query builds the session index
    Then `readLiveSessions`'s projected entry carries `relaying` appended at the TAIL of its frozen six — never a reorder
    And `safeSessionArray` still passes each entry object VERBATIM and holds no key whitelist
    And `buildSessionIndex`'s entry carries `relaying` appended after `workItem`, unconditionally, read with a strict `=== true`
    And the `/api/mesh/status` payload's `sessions[]` entry carries the field for the browser to read
    And a node that states nothing reads `relaying: false` on the wire rather than throwing or omitting the key
    # A PROJECTION THAT SILENTLY DROPS THE KEY IS THE WHOLE FAILURE MODE — the browser
    # keeps answering confidently from a field that never arrives, with every test on both
    # sides green. That is why the non-change at hop 3 is asserted beside the three changes.

  # THE HEADLINE OF DG-50-1, AS ARITHMETIC RATHER THAN AS COPY.
  Scenario Outline: the feed axis is the disjunction of two positive statements, and fails closed
    Given one session-index row whose `workItem` is <workItem> and whose `relaying` is <relaying>
    When I read the feed axis for that row
    Then the axis value is exactly <axis>
    And the axis is still one of exactly `producer-known`, `no-producer`, `roster-gone`
    And no error is thrown

    Examples:
      | case                                            | workItem                              | relaying   | axis           |
      | a launched session                              | null                                  | true       | producer-known |
      | an assignment session, untouched                | { ref: "50/04", assignmentId: "a-1" } | (absent)   | producer-known |
      | both statements                                 | { ref: "50/04", assignmentId: "a-1" } | true       | producer-known |
      | a hook-registered free session nothing relays   | null                                  | (absent)   | no-producer    |
      | the same, explicitly stated false               | null                                  | false      | no-producer    |
      | an older node that states the string "true"     | null                                  | "true"     | no-producer    |
      | a numeric 1                                     | null                                  | 1          | no-producer    |
      | a blank workItem pair with no relaying          | { ref: "", assignmentId: "" }         | (absent)   | no-producer    |
      | a blank workItem pair WITH relaying             | { ref: "", assignmentId: "" }         | true       | producer-known |
      | a getter that throws                            | null                                  | a throwing getter | no-producer |
    # The strict `=== true` rows are the point: an operator running `claude` by hand on a
    # worker is a free session that nothing relays, and lighting its pane up with a socket
    # that never delivers a byte is the guess ADR-008 rejects by name.

  Scenario: a launched session's pane is subscribable, interactive and indistinguishable from any other
    Given a `/api/mesh/status` payload carrying one launched session (`workItem: null`, `relaying: true`) and one assignment-owned session
    When the grid derives its tiles and each row's mount is resolved
    Then both tiles are handed to the socket arbiter as dialable
    And both mounts report `bound: true` and the interactive posture, with no read-only cause and no injected `no live output` reason
    And nothing in the payload distinguishes the two populations: no `producer`, `launched`, `launcher`, `kind` or `source` string appears on any session entry — the wire carries a BOOLEAN
    And the tiles' order is the existing `(nodeId, repo, sessionId)` codepoint sort, unchanged by how either session was started

  Scenario: the fact never outlives the bridge
    Given a launched session whose PTY is live and whose record carries `relaying: true`
    When the PTY exits and the handler settles
    Then `endSession` removes the record, so the next presence projection carries no entry for it at all
    And a session index built after that projection contains no row for the tuple
    And no `relaying` fact is left behind on any other record

  # THE GATE THAT FORCED THIS DECISION, LEFT GREEN — with the measured second problem
  # named, because raising the number alone does not close it.
  Scenario: the producer-site ceiling is raised to three, with all three sites sanctioned by name
    Given the shipped `src/` tree after this task
    When the producer-site gate sweeps every `.sendTerminalFrame(` call site
    Then exactly three are found — the assignment driver's `onOutputChunk` arrow, the resume lane's `onOutputChunk` arrow, and the launcher's spawn-handler bridge key at `sendTerminalFrame: (sessionId, bytes) => client.sendTerminalFrame(sessionId, bytes)`
    And the gate reports NO problem for any of them: the third site is recognised by a SECOND enumerated sanctioned shape, never by relaxing the arrow to a pattern and never by deleting the shape check
    And a FOURTH call site of any shape still fails the gate and asks a human
    And the gate's header carries decision 9's re-derivation: the reverse implication now rests on every non-assignment producer STATING `relaying: true`, and the count survives as the tripwire
    And `feedAxisFor` still takes no byte parameter, optional or otherwise
    And `mesh-session-spawn-handler.mjs` is asserted to pass `relaying: true` to both `startSession(` and `pingSession(`
    # MEASURED THIS REFINE, and it is why this scenario names the shape rather than the
    # number: `outputSignalProblems` over the live tree returns TWO problems at HEAD — the
    # count (3 > 2) and `a .sendTerminalFrame( call site sits OUTSIDE any onOutputChunk:
    # property VALUE`. FF-E as written closes only the first.

  Examples: the whole task, as a case matrix a run can be checked against
    | lane | subject                                  | the observable                                                  |
    | A    | worker ack, ok:false                     | outcome route: state failed + the worker's code                 |
    | A    | worker ack, ok:true                      | outcome route: state started, code null                         |
    | A    | control synthesis on an unrouted dispatch| outcome route: failed + session-target-not-connected            |
    | A    | nothing has arrived                      | outcome route: pending, code null, never 404                    |
    | A    | subscriber not connected, nothing held   | outcome route: unknown + spawn-outcome-lane-unavailable         |
    | A    | subscriber not connected, answer held    | outcome route: the held answer wins                             |
    | A    | forged nodeId on an admitted socket      | keyed to the connection's node; the victim's tuple stays pending|
    | A    | any ack                                  | no store write, no frame-skipped warning, no unknown-frame-kind |
    | A    | the route table                          | five named routes; WRITE set still {assign, session}            |
    | B    | startSession / pingSession               | relaying: true, sticky across a ping                            |
    | B    | four hops                                | record → readLiveSessions → (verbatim) → buildSessionIndex → wire|
    | B    | feed axis                                | producer-known by disjunction; strict === true; fails closed    |
    | B    | the pane                                 | dialable, bound, interactive, unmarked                          |
    | B    | PTY exit                                 | record deleted; the fact does not outlive the bridge            |
    | B    | the gate                                 | three sanctioned sites, green; a fourth still stops the build   |
