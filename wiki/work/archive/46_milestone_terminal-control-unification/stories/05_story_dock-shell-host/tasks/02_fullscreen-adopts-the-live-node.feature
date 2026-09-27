<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/05, THE ADOPTION: present and dismiss move the SAME xterm
# instance through the shell's one fullscreen door, keeping the SAME socket and the SAME
# scrollback; the node goes back to its home and focus back to the control that opened
# it; an interactive occupant CLAIMS `Escape`, which makes the visible exit control the
# only exit and therefore mandatory; and the post-present layout tick is CONSUMED rather
# than re-derived.
#
# THIS IS THE PROOF m45 DEFERRED HERE, IN ITS OWN WORDS.
# `test/shell-not-found-and-fullscreen.test.mjs:528-535` pins the shell's half with a
# SENTINEL node and says why it can go no further: *"The ADOPTION half (appendChild INTO
# the overlay) needs a real DOM and belongs to m46, where a real xterm and a real socket
# exist to survive the transition; faking a DOM here would prove the fake, not the
# shell."* ADR-005 [Build-1] said the same thing more bluntly — instance identity is not
# observable in a pure state machine, so *"the violation is therefore invisible in 45 and
# fatal in 46"*. This task is where it becomes observable.
#
# WHY THE LANES ARE SPLIT, AND THE SPLIT IS THE POINT. The shell's DECISIONS are
# framework-free models this repo drives under plain `node` — what the control asks the
# shell for, whether `Escape` is claimed, what the presented state declares, what a
# layout tick asks of each source. Those are `@executable`. The IDENTITY claims — one
# instance, one socket, one scrollback, across two transitions — are exactly the claims a
# model cannot make: they are about objects surviving, and only a real DOM with a real
# xterm and a real PTY can show it. Those are `@manual`, with named evidence recorded in
# the milestone `UAT.md` under `verifies →`. Pixels are task 03's.
#
# LITMUS.
#   `@executable` — every Then is a returned VALUE from a framework-free `.mjs` loaded by
#   `node:test` under plain `node`: `fullscreenReducer` / `presentedStateModel` /
#   `Z_LADDER` from `ui/src/app/shell-layout.mjs` (shipped, m45), driven with the request
#   the control actually builds, plus the control's own input-policy and geometry-mode
#   functions, which per ADR-001 touch no `window` and no DOM.
#   `@manual` — every Then is an observation an agent makes in a REAL browser over a REAL
#   board origin with a REAL PTY, and records: an object identity, a socket count taken
#   at the SERVER, a buffer read off the live terminal. "It looked the same" is not
#   evidence; "the same object, one upgrade on `/ws/terminal`, byte-identical last line
#   and identical line count" is.
#
# STATED PLAINLY, BECAUSE A FEATURE THAT PROMISED IT WOULD HAVE OPERATORS LOSING WORK TO
# A CLICK ON "FLEET": **a session does NOT survive navigation between surfaces, and this
# milestone does not make it.** ADR-009 corrects [Build-3]'s stated MECHANISM at source —
# m45's nav is real `<a href>` with no client-side interception (`Shell.tsx:395-398`) and
# the entry evaluates its route exactly once at module load (`main.tsx:49-61`), so a
# surface change is a FULL DOCUMENT LOAD and the PTY dies at the browser before React
# gets a say. No DOM re-parenting can save it. The reasons to host in `overlay` are
# stacking, one home for out-of-flow layers, and a clean adoption boundary — NOT session
# persistence. The last scenario below pins the boundary from the other side so that no
# reader of the four above it can infer the promise.
#
# NOT ASSERTED HERE, because m45 already owns it as a green model and restating an
# outcome is how two homes for one fact appear: the closed transition set, the
# replace-on-second-request, the no-op dismissals, the id-carrying dismiss, the tick
# firing on BOTH transitions, and "fullscreen is not a route — no path, no query
# parameter, no history entry" (`45/03/03_unmatched-path-and-fullscreen.feature`). What
# this task adds is a LIVE SESSION behind those transitions.
# ALSO NOT ASSERTED: "exactly one `new Terminal(` construction site under `ui/src`" and
# "no per-surface `fixed inset-0` layer" — structural, owned by `acd-terminal-server-only`
# (amended) and by ADR-005's prohibition; `acd-shell-z-ladder-single-home`'s
# `FleetTerminalView.tsx` exemption retires with the file that story 46/04 deletes.
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never the
# full suite (`global-work-propagation.test.mjs` binds :4182, which the live control
# daemon holds).

@ui @work @board
Feature: fullscreen adopts the live terminal node — one xterm, one socket, one scrollback through present and dismiss, with the way out always visible
  In order that expanding a running agent to fullscreen and coming back is a change of BOX and never a change of SESSION — no reconnect, no lost scrollback, no re-typed command, and no key the TUI needs swallowed by the shell
  the control must hand the shell its live node and its home, claim `Escape` exactly when it forwards stdin, consume the shell's own post-transition layout tick rather than adding a timer beside it, and get the same node and the same focus back on dismissal

  Background:
    Given the shell's fullscreen door is the one in `ui/src/app/shell-bus.mjs`, whose shape m45 fixed for this caller
    And the control builds its request from the session it is already running — it does not construct a second one to present

  # WHAT THE CONTROL ASKS FOR, per source × posture. `claimsEscape` is not a preference:
  # `Esc` is a live keystroke for the `claude` TUI on the far end, so a shell that
  # swallowed it would make the one key a TUI needs most mean "leave".
  @executable
  Scenario Outline: the fullscreen request the control builds, and the exits the presented state then declares
    Given a <source> session mounted with the <posture> posture
    When the control asks the shell to present it
    Then input is <input enabled> for that mount — `source.canInput && !mount.readOnly`, and never one flag
    And the request claims `Escape` = <claims escape>, which is exactly whether input is enabled
    And the presented state declares a VISIBLE exit control, in every row without exception, anchored where the way in was
    And `Escape` <what escape does>
    And the occupant sits on the ladder's `fullscreen` rung, taken from the ladder by name

    Examples:
      | case                                   | source    | posture     | input enabled | claims escape | what escape does                                                        |
      | the board dock, a local PTY            | local-pty | interactive | enabled       | true          | reaches the far end as a keystroke; the shell does not dismiss on it     |
      | the board dock mirroring a worker      | mirror    | interactive | enabled       | true          | reaches the far end as a keystroke; the shell does not dismiss on it     |
      | the fleet card's read-only peek        | mirror    | read-only   | disabled      | false         | dismisses — nothing is listening for it on the far end                   |
      | a read-only mount of a local PTY       | local-pty | read-only   | disabled      | false         | dismisses                                                               |
    # ROWS 2 AND 3 ARE THE PAIR THAT PROVES THE TWO AXES ARE INDEPENDENT: the SAME source,
    # claiming the key from one host and not from the other, because posture is a property
    # of the CALL SITE and capability is a property of the SOURCE (ADR-002). A control that
    # derived one from the other would either make the fleet's pane typeable — milestone
    # 49's job, not this one's — or take the key away from the board dock.
    # ROW 4 HAS NO CALL SITE IN THIS MILESTONE and is here deliberately: the policy is a
    # pure function over the whole table × both postures, so the combination nobody mounts
    # is exactly the one a later story would get wrong for free.
    # THE VISIBLE EXIT IS MANDATORY IN EVERY ROW, and in rows 1–2 it is the ONLY exit —
    # which is what makes the claim safe. A build that hid it behind hover, faded it with
    # inactivity or dropped it while the occupant claims the key has built a room with no
    # door.

  # THE TICK IS THE SHELL'S. Both shipping implementations independently discovered the
  # one-frame defer (`FleetTerminalView.tsx:265-268`); m45 put it in the contract so 46 and
  # 49 would not each re-derive it against a shell they do not own and get it subtly
  # different.
  @executable
  Scenario Outline: the post-transition layout tick is consumed, and what it asks for is a property of the SOURCE
    Given a <source> session presented fullscreen and then dismissed
    When the shell's layout tick arrives after each transition
    Then the control's response is <response>, derived from the source's own declared capability
    And the far end is told <resize frames> per re-measure
    And the response is identical after PRESENT and after DISMISS — the box changed either way, and the second change is not a special case
    And a re-measure that changes nothing emits nothing at all

    Examples:
      | case                              | source    | response                                                              | resize frames |
      | a local PTY — it can be resized   | local-pty | re-FIT into the new box: more rows and columns, glyphs unchanged        | exactly one   |
      | a mirrored worker TUI             | mirror    | re-SCALE the fixed 80×24 to the new box, aspect preserved, top-left     | none          |
    # FIT ⇔ THE SOURCE DECLARES A RESIZE CONTROL FRAME; SCALE OTHERWISE (ADR-003). Never
    # keyed on transport, on an origin, or on an `isRemote` boolean — a `local-pty` in
    # fullscreen still fits (it gets more columns) and a `mirror` still scales (it gets a
    # bigger picture of the same 80). That the same source behaves identically in all three
    # hosts is the clearest single demonstration that the extraction worked.
    # A `scale` SOURCE EMITS NO FRAME BECAUSE IT DECLARES NO RESIZE CONTROL FRAME, not
    # because of an early return in the send path — the guard is structural, so a fourth
    # host cannot forget it.

  # THE HEADLINE, AND THE ONE THING A MODEL CANNOT SHOW.
  @manual
  Scenario: present and dismiss move the SAME xterm instance, on the SAME socket, with the SAME scrollback
    Given a live agent session in the board dock with visible output and a scrollback the operator has scrolled back through
    When the operator expands it to fullscreen and then exits fullscreen
    Then the terminal instance after the round trip is the SAME object as before it — not an equal one, the same one
    And the server saw exactly ONE upgrade on the session's socket route across both transitions, and no close and no reopen
    And the scrollback is unchanged: the same line count and a byte-identical last line before, during and after
    And no command is re-typed, no prompt is re-printed and no state ramp re-enters `connecting`
    And output that arrived DURING each transition is in the scrollback, in order, with nothing dropped and nothing duplicated
    And the evidence recorded is the instance identity, the server-side upgrade count, and the two buffer reads — not a description of how it looked
    # THE VISIBLE TELL THAT THIS CLAUSE WAS BROKEN is a mirror pane that comes back EMPTY:
    # the mirror is ephemeral (ADR-014), so a re-subscribe has nothing to replay. On a
    # local PTY the same break shows as a fresh prompt where the operator's history was.
    # Both are cheap to see and expensive to explain later, which is why this is the
    # scenario the whole story is arranged around.

  # THE RETURN. `requestFullscreen` carries `home` and `opener` for exactly this, and the
  # shell hands the node back to `home` — the control never goes looking for where it was.
  @manual
  Scenario: on dismissal the node goes back to its home and focus goes back to the control that opened it
    Given a live session presented fullscreen from the board dock's expand control
    When it is dismissed
    Then the terminal node is back inside the dock's own byte area — the same node, put back exactly where it came from, exactly once
    And the dock is at the height it had before, inside the content box the shell publishes
    And keyboard focus is on the expand control that opened it — never on the document body
    And a second expand-and-exit round trip leaves the node and the focus in the same two places, with the session still live
    And the shell's chrome is back and the operator's board is exactly as they left it

  # THE EXIT MATRIX — every way out, over a real session, including the two edges the
  # model can only rehearse. Each row is the same claim as the headline: the session is
  # untouched by the way the operator left fullscreen.
  @manual
  Scenario Outline: every exit from fullscreen leaves the session untouched
    Given a live <source> session presented fullscreen from <opened from>, mounted <posture>
    When it is <dismissed by>
    Then <what happens>
    And the session is still live afterwards, on the same socket, with the scrollback intact
    And the node is back at its home and focus is back on the opener

    Examples:
      | case                                  | source    | opened from       | posture     | dismissed by                          | what happens                                                                                     |
      | the ordinary way out                  | local-pty | the board dock    | interactive | the visible exit control              | it dismisses                                                                                     |
      | mid-stream, while bytes are arriving  | local-pty | the board dock    | interactive | the visible exit control              | it dismisses, and the bytes that arrived during the transition are in the scrollback, in order    |
      | a mirrored worker, the same way out   | mirror    | the board dock    | interactive | the visible exit control              | it dismisses, and the pane still holds the worker's screen — it is NOT re-subscribed and NOT empty |
      | the key an interactive TUI needs      | local-pty | the board dock    | interactive | `Escape`, pressed three times         | it does NOT dismiss; all three `Esc` keystrokes reach the far end, and the exit control still works |
      | a read-only occupant                  | mirror    | the fleet card    | read-only   | `Escape`                              | it dismisses — the occupant never claimed the key                                                 |
      | THE STALE DISMISSER, WITH A SESSION   | local-pty | the board dock    | interactive | a SECOND terminal is presented, then the first one's dismiss handle fires | nothing is torn down: the second terminal is still presented, its chrome still hidden, and neither session is closed |
    # ROW 6 IS m45'S MODEL EDGE WITH A REAL PTY BEHIND IT. `requestFullscreen` hands every
    # caller a dismiss closed over its own id, and occupants never stack — so the moment a
    # second terminal is presented, the first one is still holding a live dismiss for a
    # session that is no longer on screen, and it fires on unmount, on a socket close, on a
    # stray click. In 45 the cost of getting this wrong was a state transition. Here it is
    # the operator watching the terminal they are typing into vanish, for a reason three
    # components away.
    # ROW 4 IS WHY THE VISIBLE CONTROL IS NON-NEGOTIABLE: with the key claimed it is the
    # only remaining exit, and "the three keystrokes reached the far end" is the positive
    # half — a shell that swallowed them silently would be the same failure as a read-only
    # pane that looks typeable.

  # THE BOUNDARY, PINNED FROM THE OTHER SIDE. ADR-009 states it plainly and this scenario
  # is what stops the four above it being read as a promise nobody made.
  @manual
  Scenario: a session does NOT survive navigation between surfaces, and nothing in the product implies it does
    Given a live agent session in the board dock, with output on screen
    When the operator clicks a navigation link to another surface and then comes back to the board
    Then the document was fully reloaded — navigation is a real link, not an intercepted one
    And the session is gone: the server saw the socket close with the document, and the PTY ended with it
    And the board comes back with NO dock on screen and no control claiming a live session
    And nothing in the chrome, the nav or the dock's own copy suggested the session would be preserved
    And an operator who wants to keep a session moves the BOX, not the surface — fullscreen is the affordance that preserves it, and it is on the same header
    # THIS IS NOT A DEFECT ROW AND MUST NOT BE FILED AS ONE. Cross-surface session survival
    # needs client-side navigation first, which is a routing decision (m47's surface) and an
    # ADR of its own. What would be a defect is a build that LOOKED like it survived — a
    # dock that reappears empty but open, a state chip that reads `streaming` with no socket
    # behind it, or copy that calls the dock persistent. Each of those is a finding.
