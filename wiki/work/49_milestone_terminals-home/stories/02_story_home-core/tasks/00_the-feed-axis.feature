<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/02, THE FEED AXIS: a SECOND axis composed beside the m46
# connection ramp, so that "waiting for output" can stop being a lie about a pane
# nothing will ever feed.
#
# THE SEAM, READ AT SOURCE.
#  - `sendTerminalFrame` is the ONLY feeder of the relay mirror, and it has exactly
#    TWO call sites, both in `src/mesh-launcher.mjs`'s WORKER branch, both inside an
#    assignment execution: `onOutputChunk: (chunk, sessionId) =>
#    client.sendTerminalFrame(sessionId, String(chunk))` at
#    src/mesh-launcher.mjs:1151 (the assignment dispatch) and :1290 (terminal-resume).
#    The seam itself is src/worker-stream-client.mjs:601. Grepped at this refine:
#    every other `sendTerminalFrame` mention under `src/` is a COMMENT
#    (mesh-launcher.mjs:96,1139,1148; mesh-terminal-relay-bridge.mjs:23,25;
#    mesh-worker-execution.mjs:2116) or the export list (worker-stream-client.mjs:919).
#    So: a tuple no assignment owns opens a socket that will NEVER receive a byte.
#  - The index already carries the fact that decides it. `buildSessionIndex`
#    (src/global-mesh-query.mjs:197) attaches `workItem:
#    sessionWorkItem(rowsByNodeSession, nodeId, sessionId)` at :308, and the wire type
#    states the contract: `workItem` is EXPLICITLY PRESENT and `null` for a free
#    session — never omitted, never fabricated (ui/src/fleet/api.ts:214-227). That is
#    the whole input. Nothing new goes on the wire.
#  - The ramp is FROZEN and is not this task's to touch. Seven states at
#    ui/src/terminal/state-ramp.mjs:57-65, with `unknown` a deliberate NON-member at
#    :68. The ONE narrowing seam already exists: `describeTerminalState` honours an
#    injected `reason` on `waiting` ALONE, rewriting the chip to `no live output`
#    (state-ramp.mjs:576-584). The fleet is its first injector
#    (ui/src/fleet/terminal-mount.mjs:120-125); the home is the third, through the
#    SAME seam, and the shared set does not change.
#  - Subscription is m46's, reused not rebuilt: `subscribed` is already a first-class
#    field (host-model.mjs:217) and `terminalSessionIdentity` already returns `null`
#    for an unsubscribed pane (host-model.mjs:246).
#
# WHY IT IS AN AXIS AND NOT AN EIGHTH WORD (ADR-003, and it is the load-bearing
# negative). The ramp's words are TRANSPORT facts a browser can OBSERVE. "Nothing will
# ever feed this" is a claim about a PRODUCER on another machine — the exact class of
# assertion `streaming` beat `running` for refusing to make. A second vocabulary is the
# defect milestone 46 spent itself deleting, and it grows one word at a time.
#
# NOT ASSERTED HERE, each with an owner:
#  - the mount declaration, the posture narrowing (`producer-known` → interactive,
#    everything else → labelled read-only) and invariant 4's amendment — STORY 49/03.
#  - anything RENDERED: the chip's form, the pane line's copy, the `needs input` pill,
#    the two empty states, the tile anatomy — STORIES 49/04 and 49/05 (and the
#    designer's `@uat` rows against DG-49-1/2/3). This story renders nothing.
#  - the `code`/`needs-input` wire hop that gives agent state a producer — STORY 49/00.
#  - the STRUCTURAL claims: that the home defines no state word of its own, that the
#    derivation imports no byte area and parses no socket data, and that the mirror
#    still has exactly two frame producers — the fitness functions `acd-home-pane-truth`
#    and `acd-terminal-output-signal-source`'s new shrink-only CEILING
#    (its existing FLOOR of two is at
#    test/arch/acd-terminal-output-signal-source.test.mjs:167-170). Every `Then` below
#    reads a RETURNED VALUE.
#
# THE TRAPS, named so a build meets them rather than discovers them:
#  1. Adding a word. `unfed`/`silent`/`orphaned` reads cleanly at a render site and is
#     a second vocabulary. Scenario "the composed word is always a ramp word" is the pin.
#  2. Reading bytes. Client-side content-sniffing is forbidden and gated — the browser
#     writes these bytes STRAIGHT into xterm, and a worker's own PTY output could FORGE
#     the state (ui/src/terminal/source-table.mjs:123-134;
#     src/mesh-ui-serve.mjs:718-725). The axis takes no byte parameter and no byte
#     changes its answer.
#  3. Letting `roster-gone` REPLACE the transport word. A stale node's worker can
#     genuinely keep relaying, so `streaming` stays true while the mesh stops listing
#     the session. It ANNOTATES.
#  4. Mapping roster staleness onto `unavailable`. DG-49-10 calls that a GAP in terms:
#     `unavailable` means the ORIGIN could not be resolved, which is false here and
#     sends the operator after a fault that is not there. Its three frozen causes are
#     at state-ramp.mjs:105-113 and none of them can arise on this surface.
#  5. Folding assignment LIFECYCLE into the axis. A producer EXISTING is not a promise
#     of bytes; terminal-ness is the chip's reading and already has one author
#     (ui/src/fleet/terminal-mount.mjs:105-125).
#
# ISOLATION. These modules are pure — no store, no server, no clock, no port. Every
# scenario below runs under plain `node:test` with a fresh `AOF_GLOBAL_HOME=$(mktemp -d)`
# anyway, because the repo's guard hook requires it and because a suite that ever grows
# a store must not be the one that learns the rule. Focused runs only, never the full
# suite (test/global-work-propagation.test.mjs binds :4182, held by the live daemon).
# No scenario binds a port; :4181 and :4182 are held on this machine.
# The new suite is registered in scripts/test.mjs (`acd-test-suite-registration`).

@executable @ui @work @design
Feature: the feed axis — a second, closed axis derived from the wire fields the fleet already polls, composed beside an untouched connection ramp
  In order that a pane which nothing will ever feed says so, instead of claiming forever that bytes are plausibly next
  the home derives `producer-known` / `no-producer` / `roster-gone` from the session index's own `workItem` and roster membership — never from a byte, never as a new wire field, and never as an eighth state word — and composes it with m46's ramp under one precedence fixed in one place

  Background:
    Given the pure feed-axis function under `ui/src/home/`, called with literal `MeshSession`-shaped rows exactly as `/api/mesh/status` serves them
    And the SHIPPED `describeTerminalState` from `ui/src/terminal/state-ramp.mjs`, imported unedited
    And "the axis value" means the returned value of the feed axis, and "the composed pane" means the returned composition of subscription, ramp state and axis value
    And no scenario passes any terminal bytes, painted text or socket payload into either function

  # THE HEADLINE, and it is the milestone's premise stated as a test: the ONE shape that
  # can ever stream is a tuple an assignment execution owns.
  Scenario: a session an assignment owns is the only shape the axis calls a known producer
    Given one index row whose `workItem` is `{ ref: "49/02", assignmentId: "a-1" }`
    When I read the axis value for that row
    Then the axis value is exactly `producer-known`
    And the axis value is one of exactly three values — `producer-known`, `no-producer`, `roster-gone` — and the function exposes that closed set
    And reading it again with the identical row returns the identical value
    And reading it again after advancing the process clock by an hour returns the identical value — no clock enters the derivation

  # EVERY INPUT SHAPE, INCLUDING THE MALFORMED ONES, AND IT FAILS CLOSED. Exhaustive by
  # the PO's ruling and by invariant 4 part 2's precedent
  # (test/arch/acd-fleet-terminal-input-constrained.test.mjs:634-679 drives the whole
  # frozen table x both postures x seven malformed declarations). The fail-closed
  # direction matters because 49/03 turns `producer-known` into a TYPEABLE pane: a
  # malformed row that reads `producer-known` is an operator typing into a session
  # nothing will deliver to.
  Scenario Outline: the axis value for every `workItem` shape a row can carry
    Given one index row in the latest poll whose `workItem` is <the workItem value>
    When I read the axis value for that row
    Then the axis value is exactly <axis value>
    And no error is thrown

    Examples: the positively-established producer
      | case                                  | the workItem value                                       | axis value     |
      | an assignment owns this tuple         | { ref: "49/02", assignmentId: "a-1" }                    | producer-known |
      | forward-compatible: an extra key      | { ref: "49/02", assignmentId: "a-1", phase: "build" }    | producer-known |
      | the assignment has already settled    | { ref: "49/02", assignmentId: "a-1" } on a `done` chip   | producer-known |

    Examples: the honest free session
      | case                                  | the workItem value                                       | axis value  |
      | a free session, the wire's own answer | null                                                     | no-producer |

    Examples: malformed, absent and adversarial — every one fails closed to `no-producer`
      | case                                  | the workItem value                                       | axis value  |
      | the key is absent entirely            | (no `workItem` key on the row at all)                    | no-producer |
      | an empty object                       | {}                                                       | no-producer |
      | a ref with no assignment id           | { ref: "49/02" }                                         | no-producer |
      | an assignment id with no ref          | { assignmentId: "a-1" }                                  | no-producer |
      | both keys present but blank           | { ref: "", assignmentId: "" }                            | no-producer |
      | both keys present but whitespace      | { ref: "   ", assignmentId: "   " }                      | no-producer |
      | the pair wrapped in an array          | [{ ref: "49/02", assignmentId: "a-1" }]                  | no-producer |
      | a bare string that looks like a ref   | "49/02"                                                  | no-producer |
      | the literal string "null"             | "null"                                                   | no-producer |
      | a number                              | 1                                                        | no-producer |
      | boolean true                          | true                                                     | no-producer |
      | explicitly undefined                  | undefined                                                | no-producer |
      | a getter that throws when read        | an object whose `ref` getter throws                      | no-producer |
    # THE BLANK-PAIR ROWS ARE A QA CALL, STATED RATHER THAN ASSUMED. ADR-003 derives
    # `producer-known` from `workItem != null`, which taken literally makes
    # `{ ref: "", assignmentId: "" }` a known producer. It is ruled `no-producer` here on
    # ADR-007's own direction — "anything other than a POSITIVELY-ESTABLISHED
    # `producer-known` is read-only" — and on a second, concrete reason: a blank `ref`
    # cannot be joined into `items[]`, which is the only reason the entry carries the
    # pair at all (ui/src/fleet/api.ts:216-218). A producer that cannot be named is not
    # positively established. If the architect disagrees, this is the row to argue.
    # The settled-assignment row is the anti-lifecycle pin: it would pass a naive
    # `workItem != null` AND a build that folded `assignmentChip`'s terminal reading into
    # the axis would fail it. A producer existing is not a promise of bytes.

  # ROSTER-GONE — the value with no prior art anywhere in this product (ADR-003's own
  # words). Its input is not a field on a row; it is the ABSENCE of a row that was there
  # before, which is why the axis must be handed both polls.
  Scenario: a tuple that was in the last poll and is not in this one is `roster-gone`
    Given a previous poll's index carrying the tuple ("worker-1", "sess-A")
    And a latest poll's index that does not carry it
    When I read the axis value for that tuple
    Then the axis value is exactly `roster-gone`
    And that value does NOT depend on what the tuple's `workItem` said in the previous poll — a `producer-known` row that leaves the roster is `roster-gone`, not `producer-known`
    And a tuple present in BOTH polls is never `roster-gone`
    And a tuple present in NEITHER poll yields no pane at all — there is nothing to compose, and the axis is asked nothing

  # THE MEASUREMENT THAT DELETES ONE OF SPEC'S OWN PANE STATES. SPEC lists "a node
  # unreachable" as a degraded pane state; measured, it cannot be one.
  Scenario: a node going stale removes its sessions from the index, so the pane learns it as `roster-gone` and never as a degraded node state
    Given a previous poll in which node "worker-1" was `live` and contributed two sessions
    And a latest poll in which the same node's `freshness` is `stale`
    When I read the axis value for each of those two tuples
    Then both are `roster-gone`
    And neither answer names the node's freshness, its address, or any node-level fact — the pane learns only that the mesh no longer lists this session
    # `buildSessionIndex` gates on `node.freshness !== "live"` at
    # src/global-mesh-query.mjs:261, so a stale node contributes ZERO sessions and the
    # rows simply LEAVE. There is no pane-level "node unreachable" state to build, and a
    # build that invents one has invented a fact.

  # PRECEDENCE 1 — NOT SUBSCRIBED WINS OUTRIGHT. There is no socket, therefore no
  # transport fact to report, therefore no ramp word to borrow.
  Scenario Outline: an unsubscribed pane borrows no ramp word, whatever the ramp and the axis say
    Given an UNSUBSCRIBED pane whose last known ramp state was <ramp state>
    When I compose the pane for each of the three axis values in turn
    Then not one of the three compositions returns <ramp state> as the pane's word
    And not one of the three returns any member of `TERMINAL_STATE_LIST`, nor `unknown`
    And each composition names WHY it is not watching, and carries the subscription toggle's own cost — never a connection word

    Examples:
      | ramp state  |
      | idle        |
      | connecting  |
      | waiting     |
      | streaming   |
      | ended       |
      | error       |
      | unavailable |
      | unknown     |
    # Eight rows x three axis values = the whole cross product, driven. `unknown` is in
    # the table deliberately: it is NOT a member of `TERMINAL_STATES`
    # (state-ramp.mjs:68) and a composition that special-cased members only would leak
    # it. `terminalSessionIdentity` already returns `null` for an unsubscribed pane
    # (host-model.mjs:246), so there is no session here to have a state about.

  # PRECEDENCE 2 — OTHERWISE THE RAMP'S WORD IS THE PANE'S WORD. The ramp gains no word
  # and loses none.
  Scenario Outline: a subscribed pane says the ramp's word, unchanged, for every axis value
    Given a SUBSCRIBED pane whose ramp state is <ramp state>
    When I compose the pane for each of the three axis values in turn
    Then all three compositions return exactly <ramp state> as the pane's word
    And every word any composition can return is a member of `TERMINAL_STATE_LIST` or is exactly `unknown` — the home contributes no word of its own
    And no composition returns a value from `UNAVAILABLE_CAUSES` unless the ramp state handed in was `unavailable`

    Examples:
      | ramp state  |
      | idle        |
      | connecting  |
      | streaming   |
      | ended       |
      | error       |
      | unavailable |
      | unknown     |
    # `waiting` is deliberately absent from this table — it is the ONE state the axis
    # narrows, and it gets its own scenario below so the narrowing cannot be read as a
    # general rewrite. Seven rows x three axis values here, three cells there: the full
    # 8 x 3 grid is covered between the two, with no sampling.

  # PRECEDENCE 2's ONE NARROWING, through the seam m46 ALREADY BUILT. The home is the
  # third injector; the seam does not change.
  Scenario Outline: on `waiting` alone, the axis supplies the pane's reason
    Given a SUBSCRIBED pane whose ramp state is `waiting`
    And an axis value of <axis value>
    When I compose the pane and hand the composition's `reason` to the shipped `describeTerminalState`
    Then the descriptor's chip word is <chip word>
    And a reason is injected exactly when <reason injected>
    And the descriptor's `state` is still `waiting` — the narrowing rewrites the CHIP, never the state

    Examples:
      | case                          | axis value     | chip word          | reason injected |
      | an assignment owns this tuple | producer-known | waiting for output | no              |
      | nothing will ever feed this   | no-producer    | no live output     | yes             |
      | the mesh no longer lists it   | roster-gone    | waiting for output | (see the note)  |
    # ROW 3 IS A QA RULING FLAGGED FOR THE DESIGNER AND THE ARCHITECT, not settled here.
    # ADR-003 says the feed axis supplies the reason "on `waiting` ONLY" and separately
    # that `roster-gone` ANNOTATES rather than replaces; DG-49-2 fixes a sentence for
    # `no-producer` only, keyed explicitly on `workItem === null`. No document fixes
    # whether a `roster-gone` + `waiting` pane also rewrites its chip to `no live
    # output`, and inventing one here would put a copy decision in a QA table. What this
    # row pins is only what is safe and is asserted for all three rows: AT MOST ONE
    # reason is injected, it has exactly ONE author (the home's mount module, ADR-003
    # precedence 4), and the state stays `waiting`. The chip word for row 3 is routed as
    # a design gap.

  # PRECEDENCE 3 — `roster-gone` ANNOTATES, NEVER REPLACES. The vivid case, and the one
  # with no prior art: a stale node's worker can genuinely keep relaying.
  Scenario: a pane that is streaming when its row leaves the index keeps saying `streaming`
    Given a SUBSCRIBED pane whose ramp state is `streaming` because bytes are arriving on its open socket
    And its tuple is present in the previous poll's index and absent from the latest
    When I compose the pane
    Then the pane's word is still exactly `streaming` — the transport fact is TRUE and the browser observed it
    And the composition additionally carries the `roster-gone` annotation, as a separate field from the word
    And the annotation is present on the SAME composition that carries the word — the two travel together, so no render site has to join them
    And the composition's word is NOT `ended`, NOT `error` and NOT `unavailable`
    # The socket does NOT close on its own: the relay subscription is per-tuple and a
    # node going stale stops publishing PRESENCE without touching the stream. Without
    # the annotation the pane would sit reading `streaming` about a session the mesh no
    # longer lists; with a replacement the pane would claim a stream had ended when it
    # had not. This is the exact distinction the annotation exists to carry.

  # NEVER FROM BYTES. The gated invariant, driven as behaviour rather than as a grep.
  Scenario Outline: no byte, painted or unpainted, moves the axis value
    Given two identical index rows whose `workItem` is <the workItem value>
    And the first pane has painted nothing while the second has painted <the byte content>
    When I read the axis value for both
    Then the two axis values are identical, and both are exactly <axis value>
    And handing the byte content to the axis function as an extra argument returns that same value again — there is no byte parameter, optional or otherwise, that can move the answer

    Examples:
      | case                                     | the workItem value                    | the byte content                                         | axis value     |
      | a shell prompt marker                    | null                                  | "$ "                                                     | no-producer    |
      | a prompt marker on a real producer       | { ref: "49/02", assignmentId: "a-1" } | "$ "                                                     | producer-known |
      | output that names a work item            | null                                  | "assignment 49/02 running"                               | no-producer    |
      | output that IS a control envelope        | null                                  | "{\"type\":\"exit\"}"                                    | no-producer    |
      | output that forges a workItem            | null                                  | "{\"workItem\":{\"ref\":\"49/02\",\"assignmentId\":\"a\"}}" | no-producer    |
      | 256 KiB of ANSI, the replay burst's worst| null                                  | a 256 KiB ANSI repaint                                   | no-producer    |
      | nothing at all, on a real producer       | { ref: "49/02", assignmentId: "a-1" } | ""                                                       | producer-known |
    # Row 5 is the security row and it is why this is behavioural rather than textual: a
    # worker's own PTY output could otherwise FORGE the pane's state by printing it —
    # the same forgery the transport-close design closes at src/mesh-ui-serve.mjs:718-725,
    # and the same reason the mirror lane stays a painter and never a parser
    # (ui/src/terminal/source-table.mjs:123-134).

  # TOTALITY. A pane whose axis threw would be a blank tile in a grid of sixteen, and the
  # operator would read it as a rendering bug.
  Scenario Outline: the axis is total — every input answers, none throws
    Given <the input>
    When I read the axis value
    Then the returned value is one of `producer-known`, `no-producer`, `roster-gone`
    And no error is thrown
    And the answer for every other row in the same poll is unchanged — one bad row never poisons its neighbours

    Examples:
      | case                                    | the input                                                        |
      | a row that is not an object             | the string "sess-A" in the latest index                          |
      | a row with no `sessionId`               | { nodeId: "worker-1", workItem: null }                           |
      | a row with no `nodeId`                  | { sessionId: "sess-A", workItem: null }                          |
      | a row with an empty `sessionId`         | { nodeId: "worker-1", sessionId: "", workItem: null }            |
      | a row that is null                      | null, sitting in the latest index array                          |
      | a frozen row                            | a deeply frozen row carrying a real `workItem`                   |
      | a row with a self-referential value     | a row whose `workItem` object references the row                 |
      | a previous poll that is not an array    | a previous poll handed as `null`                                 |
      | no previous poll at all                 | the first poll after page load, previous absent                  |
    # The last row is the cold-start case and it decides a real behaviour: on the FIRST
    # poll nothing can be `roster-gone`, because nothing was listed before. A build that
    # treated "absent from the previous poll" as "the previous poll was empty" would mark
    # every pane `roster-gone` on page load — a whole grid claiming the mesh had dropped
    # every session, on the one screen built to stop exactly that lie.

  # THE RAMP IS UNTOUCHED, ASSERTED AS A VALUE RATHER THAN AS A DIFF.
  Scenario: the connection vocabulary is exactly what milestone 46 froze, after this task lands
    Given the shipped `ui/src/terminal/state-ramp.mjs`, imported unedited
    When I read `TERMINAL_STATE_LIST` and `UNKNOWN_STATE`
    Then `TERMINAL_STATE_LIST` is exactly `idle`, `connecting`, `waiting`, `streaming`, `ended`, `error`, `unavailable` — seven members, in that order
    And `UNKNOWN_STATE` is `unknown` and is NOT a member of that list
    And the union of every word the home's composition can return, over the whole input matrix driven above, is a SUBSET of those eight strings
    # The subset assertion is the one that has teeth: it is computed from the
    # compositions this file actually drives, so an eighth word cannot be added without
    # a scenario going red. `acd-home-pane-truth` holds the structural half (no
    # `TERMINAL_STATES`-shaped literal anywhere under `ui/src/home/**`); this holds the
    # behavioural half, and neither is sufficient alone.
