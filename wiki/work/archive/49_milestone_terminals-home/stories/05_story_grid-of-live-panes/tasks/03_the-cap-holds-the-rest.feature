<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/05, THE CAP AS THE OPERATOR MEETS IT: a tile the grid did not subscribe
# is LISTED, AT REST, AND NAMES THE LIMIT. The arbiter is story 49/02's; this file is what the
# SURFACE does with its answer.
#
# THE SEAM, read at source, and every word of it already ships.
#  - `subscribed` is first-class control state (ui/src/terminal/host-model.mjs:211-229) and is
#    part of the SESSION's identity (`:233`), so `terminalSessionIdentity` returns `null` for an
#    unsubscribed pane (`:244-251`) — which is what makes "no socket" structural rather than a
#    guard.
#  - The worded toggle is the product's existing control, with its existing labels
#    `Watch terminal →` / `Hide terminal` (`:84-85`) and its existing cost `subscription`
#    (`:115`, catalogue at `:281-282`: hide closes the socket, a fresh watch opens ONE new one).
#  - The control already renders the rest state: the byte area is rendered only while subscribed
#    (ui/src/terminal/TerminalControl.tsx:789-795), the state chip is absent while unsubscribed
#    (ui/src/terminal/TerminalIdentity.tsx:114-124), and the expand control is offered only while
#    subscribed (`TerminalControl.tsx:739`).
#  - The cost of getting this wrong is measured: the mirror keeps a BOUNDED tail —
#    `MAX_TAIL_BYTES_PER_KEY = 256 KiB`, `MAX_TAIL_KEYS = 64`
#    (src/mesh-terminal-mirror.mjs:58-59) — replayed to each new subscriber before live frames
#    (`:193-208`). So what a hidden pane loses is whatever fell outside that tail, and it does not
#    come back.
#
# A SEAM CONFLICT ROUTED, NOT GUESSED. DESIGN DG-49-4 requires the held tile to KEEP ITS BOX —
# "the byte area stays, at its normal size, and holds one centred line" — while the shipped
# control renders NOTHING below the header when `subscribed` is false
# (TerminalControl.tsx:789-795), and ADR-007 says the control does not change. Somebody must own
# the held tile's box: the home's tile wrapper, or the control. The Scenarios below pin the
# OBSERVABLE (a box is rendered, it holds exactly one line, the tile does not collapse to a
# header) and leave the module to the architect. Flagged as a QA finding at refine.
#
# THE DIRECT CONTRADICTION, AND THE PO HAS RULED. ADR-006 says "watching one over the cap EVICTS
# the lowest-priority subscribed pane". DESIGN DG-49-4 says "There is NO auto-demotion. Watching
# one pane never silently closes another", removes the toggle at the cap, and puts the recovery in
# the copy. The PO's STORY.md rules with DESIGN — "no auto-demotion, because silently
# unsubscribing a live pane takes scrollback the bounded replay cannot give back" — and that is
# what this file pins. ADR-006's eviction clause is superseded and is raised as a finding so the
# ADR is corrected rather than quietly ignored.
#
# NOT ASSERTED HERE, each with an owner:
#  - the arbiter itself — one pure set-valued function over the whole row set, exhaustively driven
#    at every cap including 0 and 1, and its deterministic priority order — story 49/02 task 01.
#  - `MAX_LIVE_PANES` living in exactly one module, no cap literal in any component, and the
#    cross-build tie to `MAX_TAIL_KEYS` — the fitness function
#    `acd-home-socket-cap-single-arbiter` (ARCHITECTURE §Fitness functions). Structural.
#  - the grid pane's affordance table and its eight declared/not-declared entries — story 49/03.
#  - that a subscribed pane opens a socket at all — task 01 of this story.
#  - the persisted watched set — story 49/02 task 02 (layout is a FILTER, never a source).
#
# ISOLATION: in-process through `test/support/terminal-control-harness.mjs` — no store, no server,
# no port. A lane standing a store up takes a fresh `AOF_GLOBAL_HOME=$(mktemp -d)`; `:4181`/`:4182`
# are held by live daemons and no scenario binds a fixed port. Focused runs only, never the full
# suite. Registered in `scripts/test.mjs` (import beside `:658`, spread beside `:2278`).
#
# A PIXEL FACT THIS FILE DOES NOT CLAIM: that a held tile is the SAME HEIGHT as a streaming one is
# a browser measurement and belongs to the milestone's design-conformance review (DESIGN R-D's two
# held frames). What is asserted here is the structure: a box is rendered and it holds one line.

@executable @ui @work @design
Feature: the cap holds the rest — a tile beyond the live-socket limit is listed, calm, unsubscribed and promotable, it names the limit in its own copy, and nothing is ever demoted behind the operator's back
  In order that a bounded number of live sockets reads as a state of the grid rather than as a broken session, and so that no pane's scrollback is ever taken away by a decision the operator did not make
  every row keeps its tile whatever the arbiter answers, an unsubscribed tile holds no socket and says why, the limit appears in the copy from the configured number, and the exchange stays the operator's to make

  Background:
    Given the REAL control mounted through `withTerminalControl` at the grid-pane host
    And the arbiter's answer is handed to the surface as the set of subscribed pane keys — the surface decides nothing about who is subscribed
    And "held" means a tile the arbiter did not subscribe
    And the configured cap is passed in as an argument, never read from module scope by anything that renders

  # THE HEADLINE. Listed, identified, unsubscribed — never hidden and never refused.
  Scenario: a tile beyond the cap keeps its row, holds no socket, and says it is not streaming
    Given twenty addressable rows and a cap of sixteen
    When the grid is mounted
    Then there are twenty tiles
    And exactly sixteen sockets were constructed
    And each of the four held tiles renders its identity line, its far end and its work item — all of which come from the poll, not from a socket
    And no held tile renders a state chip at all
    And each held tile renders a byte-area box holding exactly ONE centred line
    And no held tile renders a terminal, a dimmed last frame or an invented one
    And nothing about a held tile is red, dotted, animated or dashed — it is not an error, and it is never the `unavailable` block

  # THE TWO HELD FORMS, and the second is the one that must name its own recovery because there is
  # no control left to press.
  Scenario Outline: a held tile's line, and its toggle, follow whether a live slot is free
    Given a cap of <cap> and <the situation>
    When the held tile is rendered
    Then its line reads exactly `<the line>`
    And <the toggle>

    Examples:
      | case                    | cap | the situation                       | the line                                                       | the toggle                                                |
      | a slot is free          | 16  | fifteen tiles subscribed, one held    | not streaming                                                  | the worded toggle is present and reads `Watch terminal →` |
      | the grid is at the cap  | 16  | sixteen tiles subscribed, four held   | not streaming — 16 live panes already · hide one to watch this | NO worded toggle is rendered on that tile                 |
      | a smaller configured cap| 4   | four tiles subscribed, two held       | not streaming — 4 live panes already · hide one to watch this  | NO worded toggle is rendered on that tile                 |
    # ROW 3 IS WHY THE NUMBER MAY NOT BE TYPED INTO THE COPY: change the configured cap and the
    # sentence changes with it. A hard-coded `16` passes row 2 and fails this one.
    # A control that cannot do its job is not offered, and the line above it names the exact
    # recovery — m46's open question 7 applied where it can be honoured exactly.
    # A COPY EDGE ROUTED, NOT PINNED: at a configured cap of ZERO the at-cap sentence would name a
    # recovery that does not exist ("hide one" — there is none to hide). The BEHAVIOUR at 0 is
    # pinned in the outline below; whether 0 earns its own sentence is raised as a design gap at
    # refine rather than being settled by whichever string the build writes first.

  # THE PO'S RULING, PINNED. Nothing is ever unsubscribed except by the operator.
  Scenario: at the cap, nothing is demoted automatically — not by a new row, not by a poll, not by a watch
    Given a cap of sixteen with sixteen tiles subscribed and every socket open
    When a new addressable row arrives on the next poll
    Then the set of subscribed pane keys is unchanged
    And every one of the sixteen sockets is still open
    And no xterm was disposed
    And the new row is a held tile carrying the at-cap line
    When the operator presses `Watch terminal →` on a held tile while no slot is free
    Then no other pane's socket is closed
    And nothing streams that the operator did not ask for and nothing stops streaming that they did not release
    # Silently unsubscribing a live pane takes scrollback the mirror's bounded replay cannot give
    # back, in a tile that may be scrolled off screen, for a reason the operator never saw.

  # THE EXCHANGE IS THE OPERATOR'S, AND IT COSTS WHAT THE CATALOGUE SAYS IT COSTS.
  Scenario: hiding a pane frees its slot and a later watch opens ONE new socket
    Given a subscribed tile that is streaming, at a grid that is at its cap
    When the operator presses `Hide terminal`
    Then that tile's socket is closed and its xterm is disposed
    And that tile now renders the held treatment with a free slot: the line `not streaming` and the toggle `Watch terminal →`
    And exactly one live slot is now free
    When the operator presses `Watch terminal →` on a different held tile
    Then exactly ONE new socket is constructed, to that tile's own tuple
    And a new xterm is constructed for it — the pane starts from whatever bounded tail the mirror still holds, never from the operator's earlier scrollback
    And the total number of open sockets is still at most the configured cap

  # THE CAP IS A CEILING ON SOCKETS, not on tiles — asserted at the boundary values.
  Scenario Outline: the number of constructed sockets never exceeds the configured cap
    Given <rows> addressable rows and a cap of <cap>
    When the grid is mounted
    Then the number of tiles is <rows>
    And the number of constructed sockets is <sockets>
    And every tile that holds no socket carries a held line

    Examples:
      | case                     | rows | cap | sockets |
      | nothing may stream       | 3    | 0   | 0       |
      | exactly one may          | 3    | 1   | 1       |
      | fewer rows than the cap  | 3    | 16  | 3       |
      | exactly at the cap       | 16   | 16  | 16      |
      | past the cap             | 20   | 16  | 16      |
    # Rows 1 and 2 are the values a per-pane "am I allowed" check gets wrong: N independent
    # decisions can disagree, and the grid's count becomes emergent again — which is what SPEC
    # forbids in terms.

  # A HELD TILE IS STILL A FULL ROW OF INFORMATION. Everything on it comes from the poll.
  Scenario: a held tile keeps its identity, its work item and its agent-state mark
    Given a held tile for a row carrying `workItem: { ref: "49/05", assignmentId: "a-1" }` on node `aof-wsl`, whose assignment asserts `code: "needs-input"`
    When it is rendered
    Then its identity line reads `49/05 → aof-wsl`
    And the `needs input` pill renders on its identity row
    And its repo renders as its own field
    And none of those values came from a socket — the tile holds none

  # NOTHING ON THIS SURFACE CAN KILL AN AGENT BY ACCIDENT (DG-49-9). `close` resolves as Hide.
  Scenario: no tile offers a dismissal, and the only subscription control is the worded toggle
    Given a grid holding subscribed tiles and held tiles
    When the tiles are rendered
    Then no tile renders an `✕` or any other close control
    And the only subscribe/unsubscribe control anywhere on the surface is the worded toggle, carrying its subscription cost
    And no control on this surface can end a session on another machine
    And a held tile offers NO expand control, because there is no pane to present
    And a subscribed tile DOES offer one — so the clause above proves a difference rather than a constant
