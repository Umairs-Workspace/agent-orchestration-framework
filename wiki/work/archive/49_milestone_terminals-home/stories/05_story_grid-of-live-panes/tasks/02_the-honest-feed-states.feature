<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/05, THE HONESTY: a pane that nothing will ever feed says so, once, in
# words the product already owns — and a stale machine is NEVER dressed up as an unreachable
# origin.
#
# THE SEAM, read at source, and it is EXISTING — this milestone adds no state word.
#  - `describeTerminalState(value, { owner, reason })` honours an injected `reason` on `waiting`
#    ALONE: it rewrites the chip to the shipped string `no live output` and carries the injected
#    sentence as the pane's line (ui/src/terminal/state-ramp.mjs:576-584, the string at `:581`,
#    the pane-line precedence at `:599-607`). That is the V10 seam, built in m46.
#  - The fleet card is its first injector — `terminalAssignmentReason(assignment)` returns
#    `no live output — assignment failed · reclaimed` and rides the same field
#    (ui/src/fleet/terminal-mount.mjs:120-125, handed on the mount at `:192-194`), and the control
#    passes it straight through (`TerminalControl.tsx:687-690`). The home is the THIRD injector
#    and the shared set does not change.
#  - The ramp is SEVEN words plus a non-member `unknown` (state-ramp.mjs:57-68). `waiting` carries
#    NO motion, so an honest cold start can never read as a spinner-forever (`:391-401`).
#  - `unavailable` is entered before any socket exists and its descriptor sets `opensSocket:
#    false` (`:565-574`); its three frozen causes are `workspace-not-local`, `origin-unreachable`
#    and `no-fleet-origin` (`:105-113`). NONE of them can arise on this surface: the index carries
#    no `ref`, `provider` or board origin (ui/src/fleet/api.ts:219-228), so every pane resolves
#    against `mirror`, which dials `origins.fleet` — which IS this page's own origin.
#  - The feed fact is derived from ONE field already on the wire: `workItem` is explicitly present
#    and `null` for a free session (`src/global-mesh-query.mjs:308`, typed at api.ts:214-228).
#    Never from bytes: the mirror lane is a painter, not a parser (source-table.mjs:123-137).
#
# THE MECHANISM QUESTION, ROUTED RATHER THAN GUESSED — read this before building. DG-49-2 requires
# a never-fed pane to open NO SOCKET *and* to read `no live output`. On the shipped path those two
# do not meet: `waiting` is reachable only from `connecting` via `SOCKET_OPEN`
# (state-ramp.mjs:287-290), and `terminalEntryState` derives `connecting` for anything bindable
# (`:221-224`) — so a bindable-but-unfed pane sits on `connecting…` forever, and an unbindable one
# is `idle` and says "Press Run agent on an item." Somebody must name the producer for
# "addressable, not fed". Whatever it is, the answer may NOT: (i) add or rename a ramp word;
# (ii) leave the pane on `connecting…`; (iii) open a socket to re-discover a fact already on the
# payload. Those three are what the Scenarios below pin; WHICH module answers is the architect's,
# and this is flagged as a QA finding at refine rather than settled here.
#
# AGENT STATE — READ THIS BEFORE LOGGING IT AS MISSING. Exactly ONE value exists, `needs input`,
# and story 49/00 is what puts it on the wire (`code` through `projectAssignment`). It renders as
# a quiet pill on the IDENTITY row while the connection chip stays on the STATUS row; UNKNOWN
# RENDERS NOTHING AT ALL; it never pulses and it never re-orders the grid. It is FIXTURE-RENDERED
# here and ITS ABSENCE FROM A LIVE RENDER IS NOT A FINDING — the producer needs a worker genuinely
# blocked on a human at the moment of observation, which is not reproducible on demand.
#
# NOT ASSERTED HERE, each with an owner:
#  - the feed axis as a pure function (`producer-known` / `no-producer` / `roster-gone`) and its
#    exhaustive input table — story 49/02 task 00.
#  - the posture the feed axis narrows to, and its fail-closed gate — story 49/03.
#  - `code` reaching the wire at all — story 49/00.
#  - the grid's own empty states (E1/E2) and the page's loading/error states — story 49/04.
#  - "the home defines no state word of its own; no byte is ever parsed" — the fitness function
#    `acd-home-pane-truth` (ARCHITECTURE §Fitness functions). Structural, not behavioural.
#
# ISOLATION: the mounted lanes run through `test/support/terminal-control-harness.mjs`
# in-process — no store, no server, no port. Any lane standing a store up takes a fresh
# `AOF_GLOBAL_HOME=$(mktemp -d)`; `:4181`/`:4182` are held by live daemons and no scenario binds a
# fixed port. Focused runs only. The suite is registered in `scripts/test.mjs` (import beside
# `:658`, spread beside `:2278`). NOTE the harness's `chip()` accessor keys on
# `aria-live="polite"` (terminal-control-harness.mjs:333-336), which task 05 removes from the grid
# host — address the chip by its rendered word instead, and never by restoring the per-pane region.

@executable @ui @work @design
Feature: the honest feed states — a pane nothing will ever relay opens no socket and says so once, a stale machine is never called unavailable, and the connection ramp gains not one new word
  In order that `waiting for output` never becomes a permanent lie on a screen whose entire purpose is telling an operator the truth about machines they cannot see
  a session with a real tuple and no assignment behind it refuses its socket and rides milestone 46's existing injected-reason seam, roster staleness is reported as what it is, and the seven-word ramp is untouched

  Background:
    Given the REAL control mounted through `withTerminalControl`, with a mount `homeSessionMount(row)` produced
    And the page's origins are `{ self: "http://127.0.0.1:4181", fleet: "http://127.0.0.1:4181" }` — the home IS the fleet origin, so no pane here can fail to resolve one
    And "the chip" is the state word rendered in the tile's status row and "the pane line" is the sentence rendered inside the byte area

  # THE HEADLINE. Every Then is a value on the rendered pane or on the recorded socket list.
  Scenario: a session with a real tuple and no assignment relaying it opens no socket and says `no live output`
    Given a row `{ nodeId: "aof-wsl", sessionId: "7f3a91c", repo: "demo", workItem: null }`
    When the tile is mounted
    Then NO socket was constructed
    And no xterm was constructed
    And the chip reads exactly `no live output`
    And the pane line reads exactly `no live output — no assignment is relaying this session`
    And the pane carries no motion class at all
    And the pane is not dimmed and nothing on it is red
    And there is no `role="status"` bar
    And the pane is NOT the dashed `unavailable` block
    And the state word behind that chip is one of the seven the shipped ramp already declares — no eighth word exists anywhere in the tree
    # Spending one of a scarce, capped set of live sockets to re-discover a fact already on the
    # payload is waste, and the socket would prove nothing the wire has not said.

  # THE SEAM'S OWN GUARD, and it is what stops the sentence lying in the other direction: an
  # OBSERVED fact outranks an injected one.
  Scenario Outline: the injected sentence is honoured on `waiting` alone — a pane that received bytes keeps its own, stronger fact
    Given a pane whose mount carries the injected reason `no live output — no assignment is relaying this session`
    And the pane's observed state is <state>
    When the pane is described
    Then the chip reads <chip>
    And the pane's own line reads <line>

    Examples:
      | case                        | state                    | chip              | line                                                    |
      | nothing has arrived         | waiting                  | no live output    | the injected sentence                                    |
      | bytes actually arrived      | streaming                | streaming         | its own word                                             |
      | the stream ended            | ended, no exit code      | stream ended      | its own word                                             |
      | the stream failed           | error, transport         | error             | `disconnected — the stream dropped`, the mandatory cause  |
      | the far end exited badly    | ended, exit code 1       | exited (1)        | its own word                                             |
    # ROWS 2-5 ARE THE NON-VACUITY. If the reason won everywhere, a pane that is genuinely
    # streaming would claim nothing is relaying it — the same lie, in the worse direction.

  # THE OTHER PANE THAT LOOKS SIMILAR AND IS NOT. Without this row the rule above is satisfiable
  # by saying `no live output` on everything quiet.
  Scenario: a pane with a producer whose socket is open and silent says something different
    Given a row carrying `workItem: { ref: "49/05", assignmentId: "a-1" }`
    When the tile is mounted and its socket opens with nothing yet delivered
    Then exactly one socket was constructed
    And the chip reads `waiting for output`
    And the pane line reads `connected · waiting for first output`
    And it carries NO motion — an honest cold start may never read as a spinner-forever
    And the two panes are distinguishable from their chips alone: one says the socket is open and the far end is silent, the other says nothing will ever arrive

  # THE PREMISE, STATED SO THE RULE CAN EXPIRE HONESTLY. It keys on exactly one wire fact.
  Scenario: the rule keys on `workItem` alone, and a row that gains one becomes a real pane
    Given a tile mounted for a row whose `workItem` is null, holding no socket
    When the next poll carries the SAME tuple with `workItem: { ref: "49/05", assignmentId: "a-1" }`
    Then the pane's session identity string is different from the one it held before
    And exactly one socket is now constructed, to that tuple's own URL
    And the pane no longer reads `no live output`
    # DESIGN DG-49-2 requires the premise beside the rule: if a producer for free sessions ever
    # lands (milestone 50's spawn is the candidate), this rule is amended IN THE SAME CHANGE —
    # otherwise the grid says `no live output` over a session that is streaming.

  # DG-49-10, AND IT IS THE TRAP OF THIS TASK. A stale node is a different fact with different
  # words. Mapping it onto `unavailable` sends an operator after an origin fault that is not there.
  Scenario Outline: no degraded roster condition ever produces an `unavailable` pane on this surface
    Given <the condition>
    When the grid composes its mounts and mounts its tiles
    Then no tile renders the dashed `unavailable` block
    And every mount the home produced carries `unavailable: null`
    And no pane's copy anywhere reads `board unreachable`, `no fleet origin` or `not checked out on this machine`
    And nothing in `ui/src/home/**` names any of the ramp's three frozen unavailable causes

    Examples:
      | case                             | the condition                                                              |
      | a machine gone quiet             | a node whose `freshness` is `stale`, whose sessions therefore left the index |
      | a machine never seen             | a node whose `freshness` is `unknown`                                        |
      | a machine that dropped off       | a tuple present in the previous poll and absent from this one                |
      | the relay never fed this tuple   | a `workItem: null` row (the case above)                                      |
      | the payload fetch failed         | the poll returned an error while two panes were streaming                     |
    # ROW 5 IS THE ONE THAT LOOKS LIKE AN EXCEPTION AND IS NOT: the sockets are independent of the
    # poll, so a metadata failure NEVER turns a live tile into an errored pane. A build that
    # conflates them is a GAP (DESIGN §S1 states).
    # `unavailable` STILL has no production producer after this milestone (ARCHITECTURE correction
    # 3). Its render here is FIXTURE-DRIVEN, exactly as m46's own suite forces it through the
    # mount's fixture field (test/terminal-control-opens-its-socket.test.mjs:336), and a reviewer
    # must not log its absence from a live render as a finding — DG-46-3's row travels onward.

  # `roster-gone` ANNOTATES, NEVER REPLACES. A stale node's worker can genuinely keep relaying, so
  # the transport fact stays true.
  Scenario: a pane whose row leaves the index keeps its transport word, keeps its socket and gains an annotation
    Given a subscribed tile that is streaming bytes from `(aof-wsl, 7f3a91c)`
    When the next poll's `sessions[]` no longer carries that tuple
    Then the socket is still open — no poll closes a stream
    And the chip still reads `streaming`, because that is what the pane can observe
    And the tile carries an annotation saying the mesh no longer lists this session
    And that annotation names the ROSTER and never an origin, a board or a workspace
    And the tile is NOT removed from the grid while it holds bytes
    When the stream itself then ends
    Then the pane reads `stream ended` with its bar, in place, at unchanged tile height
    # A pane the operator was reading may not vanish because a 5s refresh said so (DESIGN §The
    # focus model rule 8). This case has no prior art anywhere in the product, which is exactly
    # why it gets a scenario (ADR-003).

  # AGENT STATE — the SECOND AXIS, rendered from a fixture, absent when unknown.
  Scenario Outline: `needs input` is a quiet mark on the identity row, and unknown renders nothing
    Given a subscribed streaming tile whose assignment carries <the code>
    When the tile is rendered
    Then <the mark>
    And the connection chip is unchanged: dot plus word, in the STATUS row, reading `streaming`
    And the grid's tile order is byte-identical to the same grid without that code — agent state never re-orders anything

    Examples:
      | case                   | the code                | the mark                                                                              |
      | the agent is blocked   | `code: "needs-input"`   | exactly one pill reading `needs input` renders in the IDENTITY row, after the `read-only` pill's position, carrying no motion class |
      | nothing is asserted    | no `code` key at all    | NO mark of any kind renders — no pill, no placeholder, no `unknown` badge              |
      | a free session         | no assignment at all    | NO mark of any kind renders                                                            |
      | an unfamiliar code     | `code: "something-new"` | NO mark renders — the vocabulary is exactly one value and an unknown one asserts nothing |
    # A badge that says "we don't know" on most tiles trains the eye to ignore the badge that
    # matters (DG-49-3). `needs input` is the product's own word for the fact it already produces;
    # `blocked` is a judgement the producer never makes and collides with the ramp's own
    # `READS_BLOCKED` reading.

  # THE RAMP IS UNTOUCHED, asserted as a property of what renders rather than as a promise.
  Scenario: every word this surface can paint comes from the shipped ramp
    Given the grid rendered across every state a tile can reach: unsubscribed, `no live output`, `connecting…`, `waiting for output`, `streaming`, `stream ended`, `exited (N)` and `error`
    Then every chip word rendered is either one the shipped ramp already produced before this milestone, or the shipped `no live output` rewrite of `waiting`
    And no new state word, ramp member or state-shaped constant is defined anywhere under `ui/src/home/`
    And the two new sentences this milestone adds are PANE LINES and never chip words
