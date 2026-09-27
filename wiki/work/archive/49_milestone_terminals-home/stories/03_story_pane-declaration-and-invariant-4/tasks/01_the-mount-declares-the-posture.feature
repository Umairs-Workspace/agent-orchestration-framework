<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/03, THE MOUNT DECLARES THE POSTURE: one module authors the
# value that decides whether an operator may type into another machine, it declares
# `interactive`, and it is NARROWED BY THE FEED AXIS to a labelled read-only whenever a
# keystroke would not arrive.
#
# THE SEAM, read at source in the working tree at this refine:
#  · THE SHAPE TO MIRROR. `fleetTerminalMount(assignment, { itemRef, assignmentId })`
#    (ui/src/fleet/terminal-mount.mjs:158) returns a frozen declaration of THIRTEEN
#    keys — `bound, rendersPanel, noStream, source, params, posture, ref, farEnd,
#    detail, command, spawnedHere, reason, unavailable` (:172-199) — and its `noPanel`
#    branch (:130-146) returns the same key set. `boardDockMount(session)`
#    (ui/src/board/dock-mount.mjs:73-125) returns the same shape minus the fleet-local
#    `noStream`, i.e. ADR-002's twelve. The comment at terminal-mount.mjs:148-150 states
#    the contract: *"One shape, two producers: that is what makes 'the only thing that
#    differs between the two surfaces is what they declare' checkable."* This task makes
#    it three.
#  · THE ONE WORD m46 LEFT. terminal-mount.mjs:152-157 — *"THE POSTURE IS `read-only`
#    AND THERE IS NO PATH TO ANYTHING ELSE IN THIS MILESTONE … Milestone 49 changes THIS
#    ONE WORD, at THIS ONE CALL SITE, and the control does not change at all."* The home
#    is that call site. The fleet's literal at :138 and :178 does NOT move.
#  · THE POLICY THE DECLARATION FEEDS. `inputPolicyFor(source, mount)`
#    (ui/src/terminal/input-policy.mjs:84-95) is `inputEnabled = source.canInput &&
#    !mount.readOnly`; `isReadOnly` (:66-76) fails safe in every direction — absent, a
#    non-object, a non-boolean `readOnly`, a mis-spelled posture are all READ-ONLY.
#    `mountModelFor` (:114-141) turns the answer into values: `keystrokeSinks` is
#    `["onData"]` or ABSENT (:125), `sendPath` is named or null (:126), the cursor
#    blinks or does not (:129-132), and `readOnlyLabel` is `read-only` and MANDATORY on
#    a read-only mount (:100-105, :40-42). ADR-003 states `input-policy.mjs` is NOT
#    edited by this milestone; the home CONSUMES this model and re-derives none of it.
#  · WHY THE FALLBACK IS REACHABLE AT ALL. `mirror.canInput` is `true`
#    (ui/src/terminal/source-table.mjs:83, and the comment there says the fleet peek is
#    read-only *"because of its MOUNT, not because of this field"*), so under the frozen
#    table an interactive mount is ALWAYS typeable. ADR-007 traced a keystroke into a
#    free session and measured it swallowed at ONE OF TWO HOPS with no error anywhere —
#    on a worker, `liveSessionInputs.get(sessionId)` returns undefined and the frame is
#    DROPPED (pinned at test/arch/acd-fleet-terminal-input-constrained.test.mjs:240-241
#    as a drop and never a redirect); on the control node's own sessions,
#    `{ sent: false, code: "assignment-target-not-connected" }`. Without the narrowing
#    below, SPEC's read-only fallback has NO PRODUCER and would be satisfied by nothing.
#  · THE INJECTED REASON'S SEAM. `describeTerminalState` honours an injected `reason` on
#    `waiting` ONLY, rewriting the chip to `no live output`
#    (ui/src/terminal/state-ramp.mjs:576-584, the string at :581). The fleet already
#    injects one (terminal-mount.mjs:120-125). The home is the third injector and the
#    shared set does not change.
#
# WHAT IS **NOT** ASSERTED HERE, each with its owner:
#  · the FEED AXIS itself — its three closed values (`producer-known` / `no-producer` /
#    `roster-gone`), and their derivation from `workItem` and from roster presence —
#    story 02, task 00. This task consumes the axis's answer and asserts the MAPPING
#    from that answer to a posture. A malformed `workItem` is the axis's contract, not
#    this module's.
#  · WHICH ROWS BECOME PANES AT ALL, and what a row that leaves the index mid-view does
#    on screen — story 05. This module answers about ONE row it is handed.
#  · WHETHER A SOCKET IS OPENED. DG-49-2 rules that a never-fed pane opens none; the
#    subscribed set is the cap arbiter's (ADR-006, story 02 task 01). This module's
#    contribution to that pane is its posture and its reason, nothing more.
#  · the fourth HOST and its affordances — task 00 of this story.
#  · the amended invariant 4, the authorship table and the sweeps — task 02.
#  · `acd-terminal-control-boundary`'s call-site floor rising from `>= 2` to `>= 3`
#    (test/arch/acd-terminal-control-boundary.test.mjs:392) and its EMPTY `home →`
#    import baseline (:116-122) — ARCHITECTURE §Fitness functions. Structural, and not
#    a scenario.
#  · the `(session)` line's repo dedupe — story 01 (m48's routed gap).
#
# THE TRAPS:
#  1. **`SET_POSTURE` COSTS THE SESSION** (host-model.mjs:287, naming m49). One posture
#     serves BOTH hosts — a tile read-only inline and interactive expanded would rebuild
#     the xterm, reopen the socket and, because the mirror is ephemeral, come back
#     EMPTY. So the posture is declared ONCE per row, at mount, and never varies with
#     the host that renders it. The `<no host argument>` scenario is that trap's litmus.
#  2. **"NO STREAM" IS NOT `unavailable`.** terminal-mount.mjs:28-34 says so in terms,
#     and DESIGN DG-49-10 rules that this surface renders NO `unavailable` pane and must
#     not invent one — a stale or unconnected node is `no live output`, never an origin
#     fault. `unavailable` still has no production producer after m49.
#  3. **THE POSTURE FAILS CLOSED IN BOTH DIRECTIONS.** Anything other than a positively
#     established `producer-known` is read-only; and equally, nothing the ROW carries
#     may turn a `producer-known` pane read-only or a `no-producer` pane typeable. This
#     is invariant 4 part 1's own adversarial shape
#     (acd-fleet-terminal-input-constrained.test.mjs:595-603) run in both directions.
#  4. **A ROW IS NOT A PERMISSION.** m48 guarantees `sessionId` is a non-empty string by
#     the index's own construction (src/global-mesh-query.mjs:280 skips anonymous
#     sessions), so a half-tuple should be unreachable — and this module still returns
#     the no-panel shape for one, exactly as the fleet's does.
#
# TWO GAPS FLAGGED FOR THE ARCHITECT / PO, NOT SETTLED HERE. Both are named at the
# scenarios that touch them, and both are pinned only as far as is safe:
#  (a) DESIGN K10 adds a SECOND read-only `title` — *"The fleet has no input route to
#      <nodeId>: keystrokes would not arrive, so this pane cannot type."* — distinct
#      from the shipped `READ_ONLY_LABEL_TITLE` (input-policy.mjs:41-42). The shipped
#      title is computed by `mountModelFor`, in the file ADR-003 declares this milestone
#      does not edit. So the new title has no home yet: either the mount carries the
#      cause and the home's component composes the title, or `input-policy.mjs` is
#      edited after all. The scenarios below assert that the CAUSE travels on the
#      declaration and that the mandatory `read-only` label is present; they do not fix
#      where the sentence is assembled.
#  (b) `roster-gone` has NO copy row in DESIGN's new-string table (K1-K12 name the
#      never-fed line K6 and nothing for a session that left the roster). The scenarios
#      pin only that the reason is non-null and does not claim the session is still
#      listed; the exact sentence is routed to DESIGN rather than letting the build's
#      first guess become the contract.
#
# ISOLATION: no store, no server, no port — this module is framework-free `.mjs` driven
# by `node:test` over literal rows. Anything in this story that does stand a server up
# binds `port: 0` under a throwaway `AOF_GLOBAL_HOME`; `:4181`/`:4182` are held by live
# daemons here. Focused runs only, never the full suite.

@executable @ui @work @design
Feature: the home's mount declaration — ONE author for the posture, `interactive` by declaration, narrowed by the feed axis to a LABELLED read-only whenever a keystroke would not arrive
  In order that an operator never types into a pane whose keystrokes die silently on the way to another machine
  `ui/src/home/session-mount.mjs` returns the same frozen mount shape the fleet and board producers already return, declares the interactive posture as a literal at that one call site, and narrows it to read-only — labelled, with the cause — for every row the feed axis does not positively call `producer-known`

  Background:
    Given the single exported producer of `ui/src/home/session-mount.mjs`, spelled `homeSessionMount(row, …)` in ARCHITECTURE §Fitness functions' own plant
    And it is imported directly under `node:test` — no React, no DOM, no socket, no global
    And "a row" means one `MeshSession` entry as the fleet already polls it: `nodeId`, `sessionId`, `workspaceId`, `repo`, `assistant`, `lastPingAt`, `workspaceHasRun`, `workItem`
    And the shipped `inputPolicyFor` / `mountModelFor` / `sessionSourceFor` are used to read the answer, never re-implemented in the suite

  # ONE SHAPE, THREE PRODUCERS. A third producer of this shape is a third chance to
  # disagree, so the shape is asserted against the two that already ship rather than
  # against a list typed here.
  Scenario: the declaration is the same frozen shape the two shipping producers return
    Given a row addressed by `(node-a, sess-1)` carrying a work item
    When I call the home's producer, `fleetTerminalMount` and `boardDockMount` and compare the three returned values
    Then the home's key set is deep-equal to `fleetTerminalMount`'s — the thirteen of ui/src/fleet/terminal-mount.mjs:172-199, `noStream` included
    And it is a superset of `boardDockMount`'s twelve, and the twelve ADR-002 keys are present on all three
    And the returned object is frozen, and its `params` object is frozen too
    And `source` is the SAME OBJECT as `sessionSourceFor("mirror").source` — reference-identical, not a look-alike assembled here
    And `params` is exactly `{ nodeId, sessionId }`, the two the `mirror` row declares it is addressed by (source-table.mjs:78)
    And calling it twice with the same row yields deep-equal values that are NOT the same object identity — there is no memoised cache handing back a stale answer
    And the row handed in is deep-equal to a snapshot taken before the call: the producer mutates nothing

  # THE CENTRE OF THE TASK. The posture is a function of the FEED AXIS and of nothing
  # else, and everything that is not a positively-established `producer-known` is
  # read-only.
  Scenario Outline: the posture is narrowed by the feed axis, and fails closed
    Given a row addressed by `(node-a, sess-1)` whose feed axis reads <the axis value>
    When I call the home's producer and run the shipped policy over what it returns
    Then `posture` is `<posture>`
    And `inputPolicyFor(source, posture).inputEnabled` is <input>
    And `disableStdin` is the exact negation of that
    And `mountModelFor({ source, mount: posture })` registers <sinks> as its keystroke sinks
    And its `sendPath` is <send path>
    And its `readOnlyLabel` is <label> and its cursor blink is <blink>

    Examples:
      | case                                            | the axis value      | posture     | input | sinks      | send path     | label       | blink |
      | an assignment owns this tuple                   | producer-known      | interactive | true  | `["onData"]` | `socket.send` | null        | true  |
      | listed, and nothing will ever feed it           | no-producer         | read-only   | false | `[]`         | null          | `read-only` | false |
      | the mesh no longer lists this session           | roster-gone         | read-only   | false | `[]`         | null          | `read-only` | false |
      | the axis word mis-spelled                       | `producer_known`    | read-only   | false | `[]`         | null          | `read-only` | false |
      | the axis word in the wrong case                 | `PRODUCER-KNOWN`    | read-only   | false | `[]`         | null          | `read-only` | false |
      | the posture word smuggled into the axis slot    | `interactive`       | read-only   | false | `[]`         | null          | `read-only` | false |
      | a boolean where a value was expected            | `true`              | read-only   | false | `[]`         | null          | `read-only` | false |
      | no axis value at all                            | absent              | read-only   | false | `[]`         | null          | `read-only` | false |
      | an explicit null                                | `null`              | read-only   | false | `[]`         | null          | `read-only` | false |
    # ROW 1 IS WHAT MAKES THIS MILESTONE'S HEADLINE TRUE and rows 2-3 are what make
    # SPEC's read-only fallback REACHABLE rather than decorative: research measured a
    # keystroke into a free session swallowed at one of two hops with no error anywhere,
    # so without this narrowing "a session that cannot accept input" would never occur
    # and the requirement would be satisfied by nothing. Rows 4-9 are the fail-closed
    # half: an unknown answer may cost a keystroke, it may never cost a lie.
    # READ-ONLY MEANS READ-ONLY IN FACT — no sink registered at all (not one registered
    # and ignored), and no send path named, so there is nothing for a later refactor to
    # re-enable by deleting a guard.

  # THE SAME PROPERTY, DRIVEN FROM THE WIRE ROW RATHER THAN FROM THE AXIS VALUE — so a
  # build that wires the axis to the wrong field is caught here rather than in a story
  # nobody reruns.
  Scenario Outline: an ordinary polled row gets the posture its own wire fact earns
    Given a row addressed by `(node-a, sess-1)` whose <field> is <value>, composed exactly as the session index publishes it
    When I call the home's producer
    Then `posture` is `<posture>` and `inputEnabled` is <input>

    Examples:
      | case                                  | field    | value                                   | posture     | input |
      | an assignment execution               | workItem | a resolved work item carrying its `ref` | interactive | true  |
      | a free session — hand-run or hooked   | workItem | `null`                                  | read-only   | false |
      | a payload that omits the key entirely | workItem | absent                                  | read-only   | false |
    # ADR-003's arithmetic, and it is arithmetic rather than a heuristic: the relay's
    # only feeder, `sendTerminalFrame`, has exactly two call sites, both inside a worker
    # assignment execution, and the index joins `workItem` on `(nodeId, sessionId)`. So
    # `workItem != null` means a producer exists, and `workItem == null` means no call
    # site anywhere in `src/` will ever feed this tuple. THE PREMISE IS DATED: if a
    # producer for free sessions ever lands (milestone 50's spawn is the candidate),
    # this mapping is amended in the SAME change, or the grid says `no live output` over
    # a session that is streaming — the same lie in the other direction, and the worse
    # one.

  # NO VALUE THE ROW CARRIES TURNS THE POSTURE — invariant 4 part 1's own adversarial
  # shape (acd-fleet-terminal-input-constrained.test.mjs:595-603), run in BOTH
  # directions, because this surface can be wrong either way.
  Scenario Outline: a row that carries something posture-shaped is still ruled by the axis alone
    Given a row addressed by `(node-a, sess-1)` whose feed axis reads <the axis value>
    And the row ALSO carries <the decoy>
    When I call the home's producer
    Then `posture` is `<posture>` and `inputEnabled` is <input>
    And the answer is byte-identical to the same row with the decoy removed

    Examples:
      | case                                         | the axis value | the decoy                          | posture     | input |
      | the word, on the row                         | no-producer    | `posture: "interactive"`           | read-only   | false |
      | the constant, on the row                     | no-producer    | `posture: POSTURE_INTERACTIVE`     | read-only   | false |
      | the field the word sweep cannot see          | no-producer    | `readOnly: false`                  | read-only   | false |
      | a mount object riding along                  | no-producer    | `mount: { readOnly: false }`       | read-only   | false |
      | a capability read as a permission            | no-producer    | `canInput: true`                   | read-only   | false |
      | a dispatch state that looks alive            | no-producer    | `state: "running"`                 | read-only   | false |
      | a workspace that has a run                   | no-producer    | `workspaceHasRun: true`            | read-only   | false |
      | and the OTHER direction — a decoy that would silence a real pane | producer-known | `posture: "read-only"`     | interactive | true  |
      | …spelled as the field                        | producer-known | `readOnly: true`                   | interactive | true  |
      | …spelled as an absent capability             | producer-known | `canInput: false`                  | interactive | true  |
    # The last three rows are the ones a review would skip. A build that read the
    # posture OFF THE ROW would pass every row above it and fail these — and a build
    # that hard-coded `read-only` would pass everything except them, shipping a grid
    # that can never type, which is this milestone's headline silently missing.

  # A ROW THAT CANNOT BE ADDRESSED IS NOT A PANE — and it is NOT `unavailable`.
  Scenario Outline: a half-tuple renders no panel, honestly, and invents no failure
    Given <the row>
    When I call the home's producer
    Then `rendersPanel` is false and `bound` is false
    And `source` is null and `params` is deep-equal to `{}`
    And `noStream` names the cause, and `reason` is null
    And `posture` is `read-only` — the declaration fails closed even where there is nothing to type into
    And `unavailable` is null, and no value anywhere in the returned object equals the string `unavailable`

    Examples:
      | case                                  | the row                                        |
      | never captured a session id           | a row with `nodeId` and no `sessionId`         |
      | an empty string, not a missing key     | a row whose `sessionId` is `""`                |
      | a non-string id                       | a row whose `sessionId` is `42`                |
      | no node                               | a row with `sessionId` and no `nodeId`         |
      | nothing at all                        | `null`                                          |
      | not an object                         | the string `"node-a/sess-1"`                    |
    # THE EMPTY-STRING ROW IS THE ONE THAT MATTERS: m48's inherited obligation is a
    # NON-EMPTY-STRING test, never `!= null` and never truthiness. And DG-49-10 is the
    # second half — a node that is stale, offline or simply not connected to the relay
    # is NOT `unavailable`; its socket opens and is never fed. A build that mapped
    # roster staleness onto `unavailable` would send an operator after an origin fault
    # that is not there, and `unavailable` still has no production producer after this
    # milestone.

  # ONE `reason`, ONE AUTHOR (ADR-003's precedence, step 4). The shared describer
  # honours an injected reason on `waiting` ALONE, so this is the only place the home
  # may say why a pane is silent.
  Scenario Outline: the injected reason is decided here, once, and the shared vocabulary gains no word
    Given a row addressed by `(node-a, sess-1)` whose feed axis reads <the axis value>
    When I call the home's producer
    Then `reason` is <the reason>
    And no field of the returned declaration holds a connection-state word that is not one of the ramp's seven

    Examples:
      | case                              | the axis value  | the reason                                                            |
      | nothing relays this session       | no-producer     | exactly `no live output — no assignment is relaying this session`     |
      | an assignment owns this tuple     | producer-known  | null — a pane that may receive bytes keeps the ramp's own word        |
      | the mesh no longer lists it       | roster-gone     | non-null, and it does not claim the session is still listed or live   |
    # ROW 1 IS DESIGN K6 VERBATIM, and it rides the V10 seam that already exists
    # (state-ramp.mjs:576-584 rewrites the chip to `no live output` on `waiting` only).
    # NO EIGHTH RAMP WORD IS ADDED: `unfed`, `silent` and `orphaned` would each be a
    # second vocabulary describing a PRODUCER fact, which is the exact defect m46 spent
    # a milestone deleting.
    # ROW 3 IS A FLAGGED GAP: DESIGN's copy table has no `roster-gone` string, so this
    # row pins only what is safe. The exact sentence is routed to DESIGN — a build that
    # invents it here fixes copy nobody reviewed.

  # THE IDENTITY LINE'S THREE FIELDS. The mount is their author; how they are laid out
  # and where they yield is DESIGN §S2's, judged visually.
  Scenario Outline: the declaration names an owner, a far end and a tail, and never invents an owner
    Given <the row>
    When I call the home's producer
    Then `ref` is <owner>, `farEnd` is <far end> and `detail` is <tail>
    And `command` is null and `spawnedHere` is false

    Examples:
      | case                        | the row                                            | owner                | far end  | tail             |
      | an assignment's session     | a row whose `workItem` carries `ref: "49/03"`      | `49/03`              | `node-a` | `session sess-1` |
      | a free session              | a row with `workItem: null` and `repo: "aof"`      | `aof`                | `node-a` | `session sess-1` |
    # V1 — *"a terminal with no visible owner is never rendered"* — is honoured without
    # inventing one: a free session's owner is its REPO, which is a fact on the wire, and
    # DESIGN §S2 then drops the repo from the status row because it is already the owner.
    # `command: null` and `spawnedHere: false` are the same fact read twice: this host
    # never spawned that PTY and cannot re-spawn it, so RESTART is ABSENT rather than
    # present-and-refusing.

  # THE TRAP'S LITMUS. One posture for both hosts, because the alternative costs the
  # SESSION and returns an empty pane.
  Scenario: the declaration does not vary with the host that renders it
    Given a row addressed by `(node-a, sess-1)` whose feed axis reads `producer-known`
    When I call the home's producer plainly, and again passing a host argument naming the fullscreen host
    Then the two returned values are deep-equal — the posture is the ROW's, never the host's
    And the session identity computed from the declaration is unchanged between an inline tile and its expanded twin
    # host-model.mjs:287 prices `SET_POSTURE` at `COST_SESSION` and names this milestone
    # by name. A pane read-only inline and interactive expanded rebuilds the xterm and
    # reopens the socket, and because the mirror is ephemeral it returns EMPTY. Hence
    # DG-49-5: both hosts share one posture, and taking the keyboard IS the expand.

  # THE LABEL IS THE POSTURE'S ONLY SURVIVING SIGNAL BESIDE THE CURSOR, so it is
  # mandatory and it is TEXT.
  Scenario: a read-only pane says so, in words, and carries the cause that made it read-only
    Given a row whose feed axis reads `no-producer`
    When I read `mountModelFor({ source, mount: posture })` for what the home declared
    Then `readOnlyLabel` is exactly `read-only` and `readOnlyLabelTitle` is a non-empty sentence
    And the declaration itself carries the CAUSE — the feed-axis value that made it read-only — as a readable value, not as styling
    And the interactive case yields `readOnlyLabel: null`, so the label's presence means something specific on this surface
    # FLAGGED FOR THE ARCHITECT / PO, NOT SETTLED HERE: DESIGN K10 wants a SECOND title
    # on this surface — *"The fleet has no input route to <nodeId>: keystrokes would not
    # arrive, so this pane cannot type."* — because the shipped one
    # (input-policy.mjs:41-42) says *"this view mirrors the worker's terminal"*, which is
    # true of the fleet card and wrong here. Its only shipped home is `mountModelFor`, in
    # a file ADR-003 states this milestone does not edit. This scenario therefore pins
    # the mandatory label and the travelling cause, and routes WHERE the second sentence
    # is assembled as a decision the build may not make by itself.
