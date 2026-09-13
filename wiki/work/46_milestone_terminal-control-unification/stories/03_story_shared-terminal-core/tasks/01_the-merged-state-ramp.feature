<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/03, the RAMP: DESIGN §THE ONE STATE VOCABULARY, asserted. Two
# ramps ship today and neither is a superset of the other — the dock's `idle → connecting
# → running → exited/error` (`ui/src/board/terminal/dock-state.mjs:11-17`) and the peek's
# `waiting → streaming → ended → disconnected`
# (`ui/src/fleet/terminal-view/view-state.mjs:24-29`). After this task there is ONE:
# `idle · connecting · waiting · streaming · ended · error · unavailable`, plus the
# self-labelling `unknown` fallback.
#
# DESIGN RULES THE VOCABULARY; THIS TASK ASSERTS IT. Every word below, every label, every
# dot, every motion value and every `reads` value was read out of DESIGN's merged-ramp
# table and its per-word verdicts. Where DESIGN and ADR-005 differ in NAMING (ADR-005
# drafted `live`/`failed`; DESIGN rules `streaming`/`error` plus `unavailable`), DESIGN is
# binding — it is the later document, it is named binding on this task in the story, and
# its per-word reasoning is the decision itself: `streaming` names what the client can
# OBSERVE, and `error` is the superset `disconnected` cannot cover. `disconnected` is not
# lost; it survives where it was always doing its real work, as a mandatory CAUSE line.
#
# LITMUS: every Then is a returned VALUE from the shared framework-free `.mjs` set ADR-001
# homes at `ui/src/terminal/`, loaded by `node:test` under plain `node` — no bundler, no
# DOM, no socket, no clock. The ramp is tested as a MODEL: the state a transition yields,
# and the descriptor a state yields (its label, its dot, its motion, how it reads, and its
# cause line where one is mandatory). No source read, no `className` archaeology, no
# browser fact.
#
# WHAT A MODEL CANNOT SETTLE, AND WHERE IT GOES INSTEAD. Whether the RENDERED chip paints
# the ruled token, whether the pulse honours `prefers-reduced-motion`, whether the cause
# line is legible on `#0f1629`, and whether the `unavailable` pane's dashed block is the
# house's absent primitive are pixel facts — 46/04's design-conformance review and its
# `@uat` render verdict, judged against DESIGN's binding checklists (and the three mocks
# once they land). DG-46-3 is named there in advance: `unavailable` SHIPS in m46 with no
# production producer, so a reviewer judges it from a fixture and must not log its absence
# from a production render as a fresh finding. That split is the m43 precedent — the
# structural half here, the pixel half there.
#
# NOT ASSERTED HERE — deliberately left to a fitness function (ARCHITECTURE §Fitness
# functions forbids these as Gherkin): *one state vocabulary exists nowhere else* — that
# after this milestone neither `DOCK_STATES` nor `TERMINAL_VIEW_STATES` is defined anywhere
# in `ui/src` is `acd-terminal-control-boundary`'s greppable pin, and so is *the shared set
# imports nothing from `ui/src/fleet/`*, which is the structural half of the injected-reason
# scenario below. The scenario below asserts the BEHAVIOURAL half: the shared describer
# produces that wording only from a string it was handed.
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED.

@executable @ui @work @design
Feature: one state vocabulary of seven states plus a self-labelling fallback, every one of them carrying its own word
  In order that an operator reads the same word for the same fact on a board dock and on a fleet card — and never reads a liveness the far end no longer asserts, a clean finish that was really a failure, or a state the module has not learned wearing a state's clothes
  the ramp must yield exactly the seven merged states, each carrying the text label and the non-colour signals DESIGN ranks, must move between them along the honest-state axis under every event a socket can deliver, and must take the fleet's assignment-derived wording as an injected string rather than reaching for the fleet's own vocabulary

  Background:
    Given the shared terminal core loaded under plain `node` — no bundler, no DOM, no socket, no clock
    And the state ramp and its describer read as a model, with no surface mounted

  # HEADLINE 1. The merge itself. Both predecessors' surplus words are retired AS STATES
  # and neither is lost as MEANING — `running` becomes the label-free concept `streaming`,
  # `exited (N)` becomes a label on `ended`, `disconnected` becomes a cause line on `error`.
  Scenario: the vocabulary is exactly the seven merged states, and both predecessors' surplus words are retired as states
    When the ramp's states are listed
    Then they are exactly: idle, connecting, waiting, streaming, ended, error, unavailable
    And `running` is not among them — asking the describer for it yields the `unknown` fallback rather than the live state (DESIGN change 1: the board dock's live word becomes `streaming`)
    And `disconnected` is not among them either — asking for it yields the same fallback, because it survives as a mandatory cause line on `error`, not as a state
    And `exited` is not among them — an exit code is a LABEL on `ended`, never a seventh state
    And `unknown` is not a member of the declared set: it is what a state the ramp has not learned resolves TO, never a state a caller can enter deliberately
    And every one of the seven yields a descriptor with a non-empty text label, so no state can render as a dot alone

  # HEADLINE 2. "Every state carries its text label — colour is never the only signal."
  # DESIGN ranks four signals: the label, the dot's fill and shape, motion on the two
  # states that mean "expect this to change", and the mandatory cause line. Colour is the
  # fifth. This table is that ranking, as values.
  Scenario Outline: every state yields its text label and the non-colour signals DESIGN ranks, and colour is never among them
    Given a pane in the state <state> <informed by>
    When its descriptor is read
    Then its text label is exactly <label>
    And its dot is <dot>
    And its motion is <motion>
    And it reads as <reads>
    And the label is carried in full — never empty, never truncated to fit, never abbreviated, never behind a hover
    And every one of these four signals is on the descriptor, so a consumer never has to infer a state from a colour class

    Examples:
      | case                                                  | state       | informed by                       | label              | dot            | motion | reads   |
      | nothing is bound and no socket exists                 | idle        | nothing                           | idle               | filled         | none   | normal  |
      | the transport is not yet established                  | connecting  | nothing                           | connecting…        | filled         | pulse  | normal  |
      | the socket is open and nothing has been said          | waiting     | nothing                           | waiting for output | filled         | none   | normal  |
      | bytes are flowing                                     | streaming   | nothing                           | streaming          | filled         | pulse  | normal  |
      | the far end closed without asserting a code           | ended       | no exit code                      | stream ended       | filled         | none   | normal  |
      | the far end asserted a clean exit                     | ended       | exit code 0                       | exited (0)         | filled         | none   | clean   |
      | the far end asserted a failing exit                   | ended       | exit code 1                       | exited (1)         | filled         | none   | failure |
      | the far end was interrupted                           | ended       | exit code 130                     | exited (130)       | filled         | none   | failure |
      | the server refused the session by name                | error       | a server error control-frame      | error              | filled         | none   | failure |
      | the transport failed                                  | error       | a socket failure                  | error              | filled         | none   | failure |
      | the pane's origin could not be resolved               | unavailable | a named unresolvable origin       | unavailable        | dashed, hollow | none   | blocked |
      | a state this ramp has not learned                     | unknown     | a state word from a future build  | unknown            | filled         | none   | normal  |
    # THE FOUR RULINGS THIS TABLE CARRIES, each read out of DESIGN and each cheap to get
    # wrong: (a) motion is `pulse` on exactly TWO states and `none` on the other six — in
    # particular `waiting` carries none, so the honest cold start can never render as a
    # spinner-forever (`view-state.mjs:56-59`'s explicit rule, preserved); (b) `ended`
    # reads `normal` when the source asserted NO code (`view-state.mjs:77-84`'s `stream
    # ended`) and `clean`/`failure` when it did (`dock-state.mjs:37-41`) — the distinction
    # is whether a code was ASSERTED, and both are non-failure at 0; (c) `unavailable`
    # reads `blocked` and NEVER `failure`: a workspace that is not checked out on this
    # machine is not broken, it is elsewhere (m25's stale-is-never-red rule); (d) `unknown`
    # reads `normal`, quiet, never red — carried forward verbatim from
    # `view-state.mjs:95-112`, where degrading to `waiting` was corrected precisely because
    # it asserted a fact nothing had established.

  Scenario: no two states share a word, so the label alone tells them apart
    When the descriptor of each of the seven states and of the `unknown` fallback is read
    Then no two of them yield the same text label
    And a consumer that rendered only the words would still distinguish every state from every other
    And colour therefore adds emphasis to four signals that already carry the meaning, and never carries meaning alone

  # HEADLINE 3 — THE TRANSITION MATRIX, EXHAUSTIVE. Five states can hold a socket
  # (`idle` and `unavailable` are the two that cannot — see the scenario after this one),
  # and a socket can deliver six things. Thirty cells, every one of them answered: the ramp
  # is a TOTAL function, and a total function has no undefined cell for a future event to
  # fall into.
  Scenario Outline: the ramp moves along the honest-state axis under every event a socket can deliver
    Given a pane in the state <from>
    When <event>
    Then the pane's state is <to>
    And the ramp answered with a state rather than leaving the pane undefined
    And no fact the pane had ASSERTED is silently discarded: a state entered on an exit code or a named error still carries that code or that cause unless a more specific fact replaces it

    Examples:
      | case                                                          | from       | event                        | to        |
      | the upgrade completes and nothing has been said yet           | connecting | the socket opens             | waiting   |
      | the far end speaks before the client noticed the open         | connecting | a byte arrives               | streaming |
      | the far end closes before saying anything                     | connecting | a clean close                | ended     |
      | the upgrade is refused                                        | connecting | a transport failure          | error     |
      | the session died the moment it was spawned                    | connecting | an exit frame                | ended     |
      | the provider binary is missing                                | connecting | a named error frame          | error     |
      | a second open event on an already-open socket                 | waiting    | the socket opens             | waiting   |
      | the first byte finally arrives                                | waiting    | a byte arrives               | streaming |
      | the far end finishes without ever printing                    | waiting    | a clean close                | ended     |
      | the socket drops before the first byte                        | waiting    | a transport failure          | error     |
      | the far end exits without ever printing                       | waiting    | an exit frame                | ended     |
      | the server names a refusal before the first byte              | waiting    | a named error frame          | error     |
      | a stale open event cannot un-live a live pane                 | streaming  | the socket opens             | streaming |
      | more bytes on a live pane                                     | streaming  | a byte arrives               | streaming |
      | the far end finishes normally                                 | streaming  | a clean close                | ended     |
      | the stream drops mid-flow                                     | streaming  | a transport failure          | error     |
      | the far end reports its exit code                             | streaming  | an exit frame                | ended     |
      | the server names a failure mid-session                        | streaming  | a named error frame          | error     |
      | a stale open event after the session finished                 | ended      | the socket opens             | ended     |
      | bytes revive a pane that had ended                            | ended      | a byte arrives               | streaming |
      | the close that follows an exit frame                          | ended      | a clean close                | ended     |
      | the socket errors after the session had finished              | ended      | a transport failure          | error     |
      | an exit frame lands on a pane that had merely closed          | ended      | an exit frame                | ended     |
      | the server names a failure after the session finished         | ended      | a named error frame          | error     |
      | a stale open event cannot clear a failure                     | error      | the socket opens             | error     |
      | bytes revive a pane that had failed                           | error      | a byte arrives               | streaming |
      | the close that follows a transport failure                    | error      | a clean close                | error     |
      | a second transport failure                                    | error      | a transport failure          | error     |
      | the far end asserts an exit code after a named failure        | error      | an exit frame                | ended     |
      | a later named failure replaces the earlier cause              | error      | a named error frame          | error     |
    # THE FOUR IDEMPOTENT `the socket opens` CELLS are the total-function guarantee, not a
    # production path: a socket opens once. They are here because a ramp with an undefined
    # cell is a ramp a future event falls through.
    # PRESERVED, AND NAMED SO THE MOVE CANNOT LOSE IT: `ended`/`error` + a byte → streaming
    # is `view-state.mjs:119-125`'s revive rule, pinned by
    # `test/fleet-terminal-view-surface.test.mjs`'s QA SHOULD-FIX 3 lane — the one
    # transition with no laundering guard, and the one a "once ended, always ended"
    # tightening would silently freeze. `error` + a clean close → error is
    # `view-state.mjs:127-134`'s "an already-disconnected view stays disconnected", the rule
    # that stops a failure being laundered into a clean finish.
    # TWO CELLS DESIGN DOES NOT RULE, ruled here and flagged rather than decided in silence:
    # `ended` + a transport failure → error preserves `view-state.mjs:136-139`'s
    # unconditional transport-failure handling (DESIGN §transitions 2 is one-directional —
    # it protects a failure from being relabelled a clean finish, not the reverse); and
    # `error` + an exit frame → ended is DESIGN §transitions 3's "the exit code is the more
    # specific fact" applied to the state the pane was actually in, which is why the row
    # above it (a BARE close after an error) stays `error` — an ASSERTED exit outranks, a
    # silent close does not. If the build reads either differently, that is a question for
    # the architect with these two rows as its evidence, not a quiet change.

  # The two states the matrix above excludes, and WHY they are excluded: neither holds a
  # socket, so no transport event can be delivered to either.
  Scenario: `idle` is the state with nothing bound, and it is left by binding a source rather than by any event
    Given a pane with no source bound
    When its state is read
    Then it is idle, and no socket exists for an event to arrive on
    And binding a source moves it to connecting — `idle` is left by binding, never by a byte

  Scenario: `unavailable` is entered before any socket exists, and never from a pane that was live
    Given a pane whose origin cannot be resolved
    When its state is read
    Then it is unavailable, and it was entered BEFORE any socket existed
    And no socket is opened at all in that state — there is nothing to open, so there is nothing to fail
    And a pane that was streaming, ended or failed can never be moved to unavailable: a pane that was live and then died is `error`, because unavailability is a statement about the ORIGIN and not about a session

  # DESIGN §transitions 1, and it is the rule most likely to be "tidied" away by a future
  # "once ended, always ended" tightening. V9 forbids showing a liveness the source no
  # longer asserts — it says nothing against the reverse.
  Scenario: bytes revive a pane that had ended and a pane that had failed, and the revived pane can end again
    Given a pane that streamed and then ended
    When a byte arrives
    Then the pane is streaming again, and its descriptor reads as live
    And the exit code the `ended` state carried is gone rather than shown beside a live stream — the newer fact replaces the older one
    Given a pane that streamed and then failed on a transport error
    When a byte arrives
    Then the pane is streaming again — a reconnected stream that is genuinely flowing must not keep reading as failed
    And its failure cause is gone with the failure, not carried into the live state
    When the revived pane closes cleanly
    Then it is ended again, which proves the revive was a genuine round trip and not a one-way door
    # Preserves `ui/src/fleet/terminal-view/view-state.mjs:119-125` and the lane at
    # `test/fleet-terminal-view-surface.test.mjs` that was added as QA SHOULD-FIX 3
    # precisely because this transition was documented and unasserted.

  # DESIGN §transitions 2 — the headline of the honest-state axis, and the one whose
  # failure mode is an operator told their run finished cleanly when it did not.
  Scenario: a close after an error stays an error, and is never relaundered as a clean finish
    Given a pane whose transport failed
    When the socket then closes cleanly, as it always does after a transport failure
    Then the pane is still in the error state
    And its label still reads `error` and it still reads as a failure
    And it never reads `stream ended`, and it never acquires an exit code it was never given
    And its cause line still names the failure — `disconnected — the stream dropped` for a transport failure, the server's own message for a named refusal
    # Preserves `view-state.mjs:127-134` verbatim: the close that follows a transport
    # failure is that failure's own tail.

  # DESIGN §transitions 3. The exit code is the more specific fact, and the surface that
  # had it (`dock-state.mjs:37-41`) must not lose it to the surface that did not.
  Scenario Outline: an exit frame's information outranks a later bare close, and the code survives it
    Given a streaming pane
    When the far end sends an exit frame carrying code <code>
    Then the pane is ended, its exit code is <code>, and it reads as <reads>
    And its label is <label>
    When the socket then closes
    Then the pane is still ended, still carrying code <code>, and its label is unchanged
    And the bare close did not overwrite the asserted code with `stream ended`

    Examples:
      | case                            | code | label        | reads   |
      | a clean finish                  | 0    | exited (0)   | clean   |
      | a failing command               | 1    | exited (1)   | failure |
      | an interrupted session          | 130  | exited (130) | failure |
      | a signal-shaped high code       | 137  | exited (137) | failure |
    # The first three rows preserve `test/terminal-dock.test.mjs`'s exit-code lane
    # (0→clean, 1→failure, 130→failure) through the move; the fourth is QA's edge — a code
    # the module has never seen must read as a failure by the rule (`N ≠ 0`), not by a list.

  # DESIGN: "`unknown` survives verbatim, and so does its reasoning" — and it has TWO
  # halves, because the two predecessor modules each degrade in a different place.
  Scenario Outline: an unrecognised state labels itself, while an unrecognised control frame changes nothing
    Given a pane in the state <state>
    When its descriptor is read
    Then its label is <label>
    And it reads as normal — never a red failure, because "we do not recognise this" must never surface as an error
    And it carries no motion and does not claim to be live
    And it is distinguishable from a genuine cold start: its label is not `waiting for output`, which would assert that bytes are still plausibly coming

    Examples:
      | case                                              | state              | label              |
      | a genuine cold start, for contrast                | waiting            | waiting for output |
      | a state word from a future build                  | some-future-state  | unknown            |
      | a state that is absent                            | (absent)           | unknown            |
      | a state that is explicitly null                   | null               | unknown            |
      | a state that is the empty string                  | ""                 | unknown            |
      | a state that is not a string at all               | 7                  | unknown            |

  Scenario: an unrecognised control frame leaves the pane exactly where it was
    Given a streaming pane
    When a control frame of a type this ramp does not know arrives
    Then the pane is still streaming, with every field unchanged
    And no state was invented for it and nothing was thrown
    And the same is true from every state: an unknown control frame is the one event that changes nothing
    # Preserves `ui/src/board/terminal/dock-state.mjs:57-62`'s forward-compatible fallback —
    # raw PTY bytes are not control messages, and a frame type a future server adds must not
    # move a pane.

  # ADR-005's severed edge, stated as behaviour. `view-state.mjs:18` importing
  # `assignmentChip` from `../assignments.mjs` is the ONLY outward edge any of the five
  # helpers has, and it is fleet-DOMAIN wording. The copy is correct and must not be lost —
  # it exists because a terminal assignment used to sit on `waiting for output` forever.
  Scenario Outline: the fleet's assignment-derived wording arrives as an injected reason string, and the shared describer neither derives it nor asks for it
    Given a pane in the state <state>
    And the call site injects the reason <injected reason>
    When the descriptor is read
    Then its chip text is <chip text>
    And its viewport-bar reason is <bar reason>
    And the describer produced that wording only from the string it was handed — it computed no assignment state, applied no terminal-ness rule and consulted no fleet vocabulary of its own

    Examples:
      | case                                                            | state     | injected reason                                     | chip text          | bar reason                                          |
      | a cold start with nothing injected                              | waiting   | (none)                                              | waiting for output | (none — the bar falls back to the chip text)        |
      | a terminal assignment, the fleet's own V10 wording              | waiting   | no live output — assignment failed · reclaimed      | no live output     | no live output — assignment failed · reclaimed      |
      | a finished assignment                                           | waiting   | no live output — assignment done                    | no live output     | no live output — assignment done                    |
      | wording no fleet helper would ever produce, injected verbatim   | waiting   | no live output — the operator stopped watching      | no live output     | no live output — the operator stopped watching      |
      | a pane that actually received bytes keeps its own stronger fact | streaming | no live output — assignment done                    | streaming          | (none — the injected reason is ignored)             |
      | so does one that ended                                          | ended     | no live output — assignment done                    | stream ended       | (none — the injected reason is ignored)             |
      | and so does one that failed                                     | error     | no live output — assignment done                    | error              | (none — the injected reason is ignored)             |
    # THE CHIP/BAR SPLIT SURVIVES (V11, `view-state.mjs:154-160`): the short state word
    # rides the header chip and the full reason rides the viewport bar, with the bar reading
    # `reason ?? text`. It is an existing, reviewed decision and this milestone is not
    # re-opening it — which is why the last three rows matter: a view that received bytes
    # keeps its OWN ramp whatever the assignment says, so an injected reason can never
    # overwrite a stronger observed fact. Row 4 is the litmus that the wording is genuinely
    # INJECTED rather than re-derived: a reason no fleet helper would ever compute comes back
    # verbatim. The structural half — that the shared set imports nothing from
    # `ui/src/fleet/` — is `acd-terminal-control-boundary`'s, not this feature's.

  # DESIGN §The unavailable pane, and spike 44 §Sub-question 5, which fixed the wording.
  # DG-46-3: this state SHIPS in m46 and has no production producer in m46; it is judged
  # from a fixture at the conformance review and its `@uat` row travels to milestone 49.
  Scenario Outline: `unavailable` names its own cause and the command that fixes it, and is never a failure
    Given a pane whose origin cannot be resolved because <cause>
    When its descriptor is read
    Then its state is unavailable and its chip label is `unavailable`
    And its cause line reads exactly <cause line>
    And it carries the recovery line <recovery>
    And it reads as blocked, never as a failure — it is never on the destructive ramp and never red
    And it carries no motion: it is never a spinner, never `connecting…`, never `waiting for output`, because nothing is coming
    And it still names its owner, so one unavailable pane among several is identifiable

    Examples:
      | case                                              | cause                                            | cause line                     | recovery                    |
      | the workspace lives on another machine            | the workspace is not checked out on this machine | not checked out on this machine | the workspace's own path    |
      | the board's own origin did not answer             | the board's origin did not answer                | board unreachable               | aof work ui                 |
    # The wording is fixed by spike 44 and DESIGN, not chosen here. `aof work ui` is the same
    # command m45's unavailable nav item already carries — a refusal names its own cause AND
    # what to run, which is this codebase's rule for exactly this failure.
