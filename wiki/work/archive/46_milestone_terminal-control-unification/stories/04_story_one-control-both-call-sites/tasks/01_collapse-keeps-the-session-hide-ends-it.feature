<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/04: the two operations that look alike and cost differently.
# COLLAPSE hides the byte area with CSS and keeps the WebSocket, the PTY, the running agent
# and the scrollback. HIDE closes the socket and ends the subscription. DESIGN §Collapse is
# not Hide rules that they must never share a FORM — a chevron means layout-only, a worded
# toggle means subscribe/unsubscribe — and this task asserts the TWO COSTS SEPARATELY,
# because a unified control is exactly the circumstance under which two operations quietly
# acquire one button.
#
# THE RULE IS ALREADY EARNED, IN A COMMENT, AND THE MOVE IS WHERE IT GETS LOST.
# [TerminalDock.tsx:137-141] says it in terms — *"collapsing must NOT tear the session down
# … So `collapsed` is deliberately NOT a dependency"* — [:280-281] is the dependency array
# that honours it, and [:409-412] is the `hidden`-not-unmounted body. The fleet's Hide is
# the opposite by design: [FleetTerminalView.tsx:145-146] gates the whole subscription
# effect on `open`, so hiding runs its cleanup and [:219-233] closes the socket and disposes
# the terminal. ARCHITECTURE §Codebase health finding 2 names this comment, alongside the
# 80×24 soak, as rationale the file-budget ceiling may NOT be met by deleting (ADR-014/E3).
# A build in which collapse kills the agent is a GAP, not an implementation detail.
#
# LITMUS. The MODEL half is the control's SESSION IDENTITY: which changes tear a session
# down and which do not, as a value a pure `.mjs` returns — that is the framework-free
# re-expression of "`collapsed` is not in the deps", and unlike the dependency array it is
# something a `node:test` can read. The LIVE half — that the agent really kept running, that
# the socket really closed, that nothing leaked across ten cycles — needs a real browser, a
# real xterm and a real far end, none of which this repo's headless mount harness has
# (`test/support/mini-react.mjs` never assigns a ref a node, so no xterm is ever built in
# it; see task 00's header). Those are `@manual` with named evidence.
#
# NOT ASSERTED HERE: the dependency ARRAY itself, or any other implementation of session
# identity — a `.feature` that pins a deps list has pinned the mechanism instead of the
# property. Also NOT here: the FULLSCREEN transition's survival (present → dismiss, the same
# xterm, the same socket, the same scrollback). ADR-009 assigns that behavioural proof to
# this milestone and the shell host is story `46/05`; it is cross-referenced below as a
# survive row and owned there. And NOT here: whether the collapsed dock's chrome LOOKS right
# — task 04's `@uat`.
#
# ONE THING THIS TASK MUST NOT PROMISE, stated because a control's docs implying it would
# have operators losing work to a click on "Fleet": a session does NOT survive navigation
# between surfaces, and this milestone does not make it. m45's navigation is real `<a href>`
# links and the entry evaluates its route once at module load, so a surface change is a full
# document load — the PTY dies at the browser, before React gets a say (ADR-009, which
# corrects [Build-3]'s stated mechanism while keeping its conclusion).
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never the
# full suite (`global-work-propagation.test.mjs` binds :4182, which the live control daemon
# holds).

@ui @work @design
Feature: collapse keeps the session and hide ends it — two operations, two forms, two costs, and the cheaper one is free
  In order that an operator can get a terminal out of the way without killing the agent inside it, and can stop watching a worker without wondering whether they stopped the worker
  the one control must treat collapse as layout and hide as unsubscribe, must never offer a chevron that unsubscribes or a worded toggle that merely collapses, and must keep the socket, the PTY and the scrollback intact across any number of collapses

  Background:
    Given the one control from 46/03's core, mounted by the board (collapse + close) and by the fleet (a worded Watch/Hide toggle)
    And the model scenarios below load the control's framework-free `.mjs` set under plain `node` — no bundler, no DOM, no browser
    And the browser scenarios below run against a deployed build (`node scripts/install-local.mjs`) with a REAL agent session running, so "the agent kept going" is a fact about a process and not about a spinner

  # THE MODEL OF THE RULE. Everything below is one question: does this change end the
  # session? A row answering "survives" that a build gets wrong kills an operator's agent;
  # a row answering "tears down" that a build gets wrong leaks a socket per toggle.
  @executable
  Scenario Outline: what ends a session and what does not — the control's session identity, as a value
    Given a bound session of <source> that is <state>
    When <what changes>
    Then the session <verdict>
    And the scrollback <scrollback>
    And the reason is <why>

    Examples:
      | case                                  | source     | state     | what changes                                   | verdict     | scrollback                       | why                                                                 |
      | THE HEADLINE                          | local-pty  | streaming | the host collapses the pane                    | survives    | is intact and CONTINUOUS         | collapse is layout; it is not part of the session's identity        |
      | expanding again                       | local-pty  | streaming | the host expands the pane                      | survives    | is intact and CONTINUOUS         | the byte area was hidden, never unmounted                           |
      | collapse before the first byte        | local-pty  | connecting| the host collapses the pane                    | survives    | is empty, as it was              | the ramp state is orthogonal to the host's layout                   |
      | collapse a mirror                     | mirror     | streaming | the host collapses the pane                    | survives    | is intact and CONTINUOUS         | one rule, both sources — the mirror is ephemeral and cannot be replayed |
      | dragging the dock taller              | local-pty  | streaming | the host resizes the pane                      | survives    | is intact                        | a resize re-fits (fit) or re-scales (scale); it rebuilds nothing    |
      | the surface re-renders around it      | local-pty  | streaming | the board syncs its stream and re-renders      | survives    | is intact                        | nothing in the host's own data is part of the session's identity    |
      | fullscreen, presented and dismissed   | mirror     | streaming | the pane is presented fullscreen, then dismissed | survives  | is intact and CONTINUOUS         | the live node is ADOPTED and returned home — 46/05 owns this proof  |
      | HIDE                                  | mirror     | streaming | the host unsubscribes (Hide terminal)          | tears down  | is gone — a re-watch starts empty | hide closes the socket; the mirror is ephemeral by design           |
      | close                                 | local-pty  | streaming | the operator presses the close control         | tears down  | is gone                          | close is the ONLY control that ends a local session                 |
      | a different item                      | local-pty  | streaming | the bound ref changes                          | tears down  | is gone                          | a different ref is a different session                              |
      | a different worker session            | mirror     | streaming | either half of the (nodeId, sessionId) tuple changes | tears down | is gone                     | routing is tuple-only; a new tuple is a new stream                  |
      | switching provider                    | local-pty  | ended     | the provider picker's selection changes        | tears down  | is gone                          | a provider is a property of the spawn; the picker is LOCKED while live for exactly this reason |
      | restart                               | local-pty  | error     | the operator presses restart                   | tears down  | is gone — a restart is a NEW session | restart is a deliberate re-spawn, not a reconnect               |
      | the posture flips at runtime          | mirror     | streaming | the mount's `readOnly` declaration changes     | tears down  | is gone                          | stdin is fixed at xterm construction — UNREACHABLE in m46 (no call site flips it) and named so m49 does not discover it |
      | navigating to another surface         | local-pty  | streaming | the operator clicks a nav link to another page | tears down  | is gone                          | navigation is a full document load; this is STATED, not a defect, and no story may promise otherwise |
    # ROW 1 IS THE ONE THAT REGRESSES. It is free today and it is free only because someone
    # wrote down why; the whole risk of this milestone is that a naive union of two files
    # re-derives the effect's identity and quietly adds `collapsed` to it.
    # ROW 15 is the boundary of the promise. ADR-009 keeps it explicit: the reasons to host
    # the dock in the shell's `overlay` region are stacking and a clean adoption boundary,
    # NOT session persistence across surfaces.

  # THE FORM RULE. Two operations, two forms, no shared name — costs nothing (it is what
  # both surfaces already do) and is written down because one control is exactly where they
  # would merge.
  @executable
  Scenario Outline: every affordance declares its cost, and no host may offer a form that lies about it
    Given the host <host> declares its affordances
    When the control's affordance table for that host is read
    Then <affordance> is present as <form>, and its declared cost is <cost>
    And no chevron anywhere in the table carries a cost that ends a session or a subscription
    And no worded subscribe/unsubscribe toggle anywhere in the table carries a cost that is merely layout

    Examples:
      | case                          | host                    | affordance          | form                                     | cost                          |
      | the dock's collapse           | the board dock          | collapse            | a chevron (down / up)                    | layout only                   |
      | the dock's close              | the board dock          | close               | the `✕` control                          | ends the session              |
      | the dock's drag handle        | the board dock          | drag-resize         | a `role="separator"` strip on the top edge | layout only                 |
      | the card's toggle             | a fleet assignment card | watch / hide        | a worded toggle: `Watch terminal →` / `Hide terminal` | subscribe / unsubscribe |
      | the card has no chevron       | a fleet assignment card | collapse            | NOT DECLARED                             | n/a                           |
      | the card has no close         | a fleet assignment card | close               | NOT DECLARED                             | n/a                           |
      | the card has no drag          | a fleet assignment card | drag-resize         | NOT DECLARED                             | n/a — the panel's total height is a constant 192px |
      | the overlay's exit            | the fullscreen overlay  | exit fullscreen     | a visible control, always visible        | layout only                   |
    # ROW 7 IS NOT AN OMISSION and DESIGN says why: a card that grows reflows every sibling
    # in its stretched grid row, and the affordance for "I want more of this" is EXPAND.
    # ROW 8's "always visible" is binding, not stylistic: an interactive occupant CLAIMS
    # `Escape` (it is a live keystroke for the `claude` TUI), so the visible control is then
    # the only way out. Never hover-revealed, never auto-hiding.

  # COLLAPSE IS A HOST STATE, NOT A RAMP STATE. If `collapsed` ever became a state word, the
  # ramp would have two vocabularies again — the exact defect this milestone deletes.
  @executable
  Scenario: collapsing does not enter the state ramp, and the ramp has no word for it
    Given a bound session in each of the ramp's states in turn
    When the host collapses and expands the pane
    Then the state is the same on the way out as it was on the way in, in every one of them
    And `collapsed` is not a member of the state vocabulary and never appears as a state word or a chip label
    And a collapsed pane that receives bytes still transitions to `streaming` — the host's layout does not stop the ramp from being honest
    And a collapsed pane whose far end exits still transitions to `ended` carrying its exit code, so expanding shows the truth rather than the last thing seen

  # ────────────────────────── the browser half ──────────────────────────
  # THE COST OF COLLAPSE, MEASURED. A model cannot say the agent kept running; only a
  # running agent can.
  @manual
  Scenario Outline: collapsing keeps the session alive — the socket, the far end and the scrollback all survive, and the agent keeps working while hidden
    Given <host> is open on <source>, streaming, with output arriving continuously
    When the operator collapses the pane, waits for output that would have arrived, and expands it again
    Then the WebSocket for that pane never closed — no close frame, and the same connection is still listed in the network log
    And the far end kept working while the pane was hidden: the output produced during the collapse is present on expand, in order, with no gap and no duplication
    And the scrollback from before the collapse is still there, above it
    And exactly ONE `.xterm` element still exists for that pane — expanding built no second one
    And repeating the collapse/expand cycle ten times leaves exactly one instance, one socket, and one continuous scrollback

    Examples:
      | case                        | host             | source     |
      | the board's own PTY         | the board dock   | local-pty  |
      | a worker mirror in the dock | the board dock   | mirror     |
    # EVIDENCE RECORDED IN `VERIFICATION.md` (46), 46/04 section, at `aof:verify 46`: the
    # build stamp; the network log showing the same socket before and after; the two
    # scrollback excerpts spanning the collapse (the operator's own eyes are the join); and
    # for the local row, that the same agent process is still the one producing output.

  # THE COST OF HIDE, MEASURED — and the empty re-watch is the DESIGNED tell, not a bug.
  @manual
  Scenario: hiding a fleet card's peek closes the socket, and re-watching starts an empty pane
    Given a fleet assignment card with its peek open and streaming
    When the operator presses `Hide terminal`
    Then the WebSocket for that pane closes — the network log shows the close, and no socket to `/ws/terminal-view` remains open for that tuple
    And no `.xterm` element remains for that pane
    And the worker on the other end is UNAFFECTED: its `claude` session keeps running and its assignment does not change state
    And pressing `Watch terminal →` again opens ONE new socket and an EMPTY pane — the mirror is ephemeral, there is no scrollback to replay, and none is fabricated
    And the pane's first honest state is `waiting for output`, with no motion, never a spinner and never a red error

  # CLOSE, AND THE LEAK CHECK. The only control that ends a local session, and the one an
  # extraction is most likely to leave half-wired.
  @manual
  Scenario: closing the dock ends the session and leaves nothing behind
    Given the board dock open on a local PTY, streaming
    When the operator presses the close control
    Then the dock is gone from the page and no `.xterm` element for it remains
    And no WebSocket to `/ws/terminal` remains open for that pane
    And pressing `Run agent` again on the same item starts a NEW session with an empty scrollback — the closed one is not resumed and its output does not reappear
    And opening and closing ten sessions in one page life leaves zero open terminal sockets and zero xterm elements at the end
