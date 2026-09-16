<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/05, THE KEYBOARD: a grid of a dozen terminals is ONE tab stop, focus
# survives a 5s poll, and every gesture that means "type" takes the operator somewhere they can
# read what they typed.
#
# WHY THE TILE IS NOT WHERE YOU TYPE, and it is arithmetic rather than taste. At every documented
# width the effective glyph in a tile is 6.1–7.6px (DESIGN §Render breakpoints) against the design
# system's smallest asserted-readable type of 10px. And the posture cannot be changed on expand:
# `SET_POSTURE` costs the SESSION — "stdin is fixed at xterm construction — UNREACHABLE in m46,
# named so m49 does not discover it" (ui/src/terminal/host-model.mjs:287) — so a tile that were
# read-only inline and interactive expanded would rebuild the xterm, reopen the socket, and come
# back EMPTY. One posture, both hosts; taking the keyboard IS the expand.
#
# THE SEAM, read at source.
#  - The focus key is the CONTROL's own pane key, `terminalPaneKey(source, params)`
#    (ui/src/terminal/pane-identity.mjs:55-67) — which is also the tile's render key.
#  - Expand costs LAYOUT and nothing else: `PRESENT_FULLSCREEN`/`DISMISS_FULLSCREEN` are
#    `COST_LAYOUT` (host-model.mjs:279-280), `expanded` is explicitly NOT part of the session's
#    identity (`:236`), and the control's session effect is keyed on `sessionKey`, so presenting
#    moves DOM and re-subscribes nothing (TerminalControl.tsx:620-623, deps at `:646`).
#  - The request the shell is handed is `terminalFullscreenRequest({ source, posture, sessionKey,
#    label, node, home, opener, onLayout, onDismiss })` (ui/src/terminal/fullscreen-request.mjs:54),
#    whose id is `terminal:<sessionKey>` (`:44-46`), whose `claimsEscape` is EXACTLY
#    `model.inputEnabled` (`:76`) and which owns its own chrome (`:78`).
#  - The shell carries the opener through both transitions as `restoreFocusTo`
#    (ui/src/app/shell-layout.mjs:894 on present, `:940` on dismiss, reported on the presented
#    model at `:988-994`), and the DOM half calls `request.opener?.focus?.()` on dismiss
#    (ui/src/app/Shell.tsx:873).
#  - An interactive occupant CLAIMS `Escape` — it is a live keystroke for the far end's TUI — so
#    the visible exit control is the ONLY exit and is `alwaysVisible` (host-model.mjs:128-131).
#  - The whole payload re-polls every 5000ms (ui/src/fleet/assign-affordance.mjs:54, consumed at
#    ui/src/fleet/Fleet.tsx:462), so every tile re-renders four times a minute under the cursor.
#
# TWO SEAMS THAT DO NOT EXIST YET, NAMED SO THE BUILD DOES NOT DISCOVER THEM MID-STORY. Both are
# QA findings routed at refine, and both are pinned below as OBSERVABLES rather than as designs:
#  (a) THERE IS NO WAY FOR A HOST TO PRESENT THE CONTROL'S PANE. `TerminalControl`'s props are
#      exactly `{ host, mount, onClose, origins }` (TerminalControl.tsx:172-181); fullscreen is
#      dispatched inside the control by its own expand button (TerminalControls.tsx:73-77). DESIGN
#      DG-49-5 rule 3 requires `Enter` on a focused TILE and a click into the BYTE AREA to present
#      it, and ADR-007 says the control gains no new prop. Someone must own that seam.
#  (b) THE OPENER IS THE EXPAND BUTTON, NOT THE TILE. `opener: openerRef.current`
#      (TerminalControl.tsx:633) resolves to the control's own expand button, so today's focus
#      return lands on a control the operator may never have pressed. DESIGN §S3 delta 3 requires
#      the TILE, "restoring its roving stop".
#      And nothing in the request names WHERE FOCUS PRESENTS (fullscreen-request.mjs:68-79 lists
#      every field it carries) — delta 2 needs that value to exist.
#
# NOT ASSERTED HERE, each with an owner:
#  - anything a person must SEE: that the focus ring is visible on the tile's frame, that the
#    caret is legibly inside the terminal after presenting, that an operator can read what they
#    typed. Those are DESIGN DG-49-5's `@uat` close condition against render R-F and belong to the
#    milestone's design-conformance review. THAT REVIEW HAS NO TASK IN THIS MILESTONE'S BREAK-DOWN
#    — raised as a QA finding at refine.
#  - the fullscreen occupant's own regions, header and dialog contract — unchanged from m46
#    (DESIGN §S3: "THIS SURFACE IS NOT REDESIGNED"), and not re-asserted here.
#  - the posture literal and its fail-closed derivation — story 49/03.
#  - the socket a pane holds at all — task 01 of this story.
#
# ISOLATION: in-process. The mounted lanes run through `test/support/terminal-control-harness.mjs`
# and the model lanes import the `.mjs` set directly — no store, no server, no port. A lane
# standing a store up takes a fresh `AOF_GLOBAL_HOME=$(mktemp -d)`; `:4181`/`:4182` are held by
# live daemons. Focused runs only. Registered in `scripts/test.mjs` (import beside `:658`, spread
# beside `:2278`). NOTE the harness must expose the BUNDLED shell bus for these lanes — the
# control reads `hasShellHost()` once at mount (TerminalControl.tsx:244) and gates its expand
# control on it (`:739`), and the bundle carries its own copy of that module.

@executable @ui @work @design
Feature: focus and expand — a dozen tiles are one tab stop, a poll never moves the operator's place, and every gesture that means "type" presents the pane where the words are, for the price of a layout change
  In order that an operator can reach any agent in the fleet from the keyboard, type into it where they can read what they typed, and come back to exactly the tile they left
  the grid keeps one roving stop keyed to a pane key rather than a position, `Enter` and a click into the byte area present the SAME live pane fullscreen with focus inside the terminal, and dismissal hands the operator back their place in the grid

  Background:
    Given the grid's focus model is a pure `.mjs` taking the ordered pane keys, the focused key and the rendered column count as ARGUMENTS
    And the tiles are mounted with the REAL control through the harness, with the bundled shell bus registered so a present request can be observed
    And "the focused tile" means the tile whose pane key the focus model holds
    And no lane below asserts a pixel: every Then reads a rendered attribute, a returned key or a value the shell was handed

  # ONE ROVING STOP PER TILE. A grid of twelve tiles is one tab stop, not forty.
  Scenario: exactly one tile is in the page tab order, and it is the focused one
    Given a grid of twelve tiles with the focus on the fifth
    When the grid is rendered
    Then exactly one tile carries `tabindex="0"`, and it is the fifth
    And every other tile carries `tabindex="-1"`
    And no xterm host anywhere in the grid is in the tab order — every one carries `tabindex="-1"`
    And no element inside any byte area is focusable
    And the focused tile's own controls follow it in DOM order: the expand control, then the worded toggle

  # ARROWS MOVE BY RENDERED POSITION, so the movement matches what the operator sees at that width.
  Scenario Outline: arrows traverse the grid by its rendered geometry
    Given twelve tiles rendered in <columns> columns, ordered by the grid's own order
    And the focus is on the tile at index <from>
    When <the key> is pressed
    Then the focus model returns the pane key of the tile at index <to>
    And the returned value is always a key that is in the rendered list — focus never leaves the grid by an arrow

    Examples:
      | case                     | columns | from | the key | to |
      | next in reading order    | 3       | 4    | →       | 5  |
      | previous in reading order| 3       | 4    | ←       | 3  |
      | down a column            | 3       | 4    | ↓       | 7  |
      | up a column              | 3       | 4    | ↑       | 1  |
      | one column at 390        | 1       | 4    | →       | 5  |
      | one column, down         | 1       | 4    | ↓       | 5  |
      | first                    | 3       | 7    | Home    | 0  |
      | last                     | 3       | 2    | End     | 11 |
    # ROWS 5 AND 6 ARE THE REFLOW PROOF: at one column, `→` and `↓` are the same move, because
    # movement is by RENDERED position and not by a fixed grid the model imagines.
    # A QA RULING FLAGGED FOR THE DESIGNER, not settled here: DESIGN §The focus model rule 2 does
    # not say whether an arrow at an EDGE wraps or clamps. The rows above stay in range
    # deliberately; what is pinned for the edges is only the invariant on the last line — the
    # answer is always a rendered key. The exact edge behaviour is routed as a design gap rather
    # than letting the build's first guess become the contract.

  # FOCUS SURVIVES THE POLL, because it is stored as a PANE KEY and never as an index.
  Scenario: a poll that adds, removes and re-orders tiles leaves focus on the same session
    Given a grid whose focus is on the tile for `(aof-wsl, s-5)`
    When the next poll's `sessions[]` adds a row that sorts ABOVE it, drops an unrelated row and returns the rest in a different arrival order
    Then the focused pane key is still `(aof-wsl, s-5)`'s
    And the tile carrying `tabindex="0"` is still that same session's
    And the tile's render key is unchanged, so the tile was re-used rather than replaced
    # Storing an index or a position is the defect this rule exists to prevent: a tile arriving
    # above the focused one would silently move focus to a different agent, four times a minute.

  # AND WHEN THE FOCUSED SESSION GENUINELY GOES.
  Scenario: if the focused tile is removed, focus moves to the nearest surviving tile in grid order
    Given a grid whose focus is on a tile holding NO bytes
    When that tuple leaves the index on the next poll
    Then the tile is removed
    And the focus model returns the pane key of the nearest surviving tile in grid order
    And exactly one tile still carries `tabindex="0"`
    And a tile that IS holding bytes is never removed by a poll at all — it stays, ends in place, and keeps its stop
    # Which session left is announced by the grid's ONE live region — task 05 of this story owns
    # that sentence.

  # THE HEADLINE. `Enter` on a focused tile presents the pane, and it costs LAYOUT only.
  Scenario: `Enter` on a focused tile presents that pane fullscreen — one xterm, one socket, adopted
    Given a subscribed, interactive tile that is streaming, holding exactly one socket and one xterm with painted scrollback
    When `Enter` is pressed on that focused tile
    Then the shell received exactly ONE present request
    And its id is that pane's own session id — `terminal:` plus the pane key
    And the request's `node` is the SAME live element the terminal is already painted into, handed for adoption
    And the number of constructed sockets is unchanged
    And the number of constructed xterms is unchanged
    And the terminal's written scrollback is unchanged — presenting re-subscribed nothing, and an empty pane on present is the visible tell that this broke
    And the pane's session identity string is unchanged across the transition
    And no `set-posture` change was dispatched anywhere

  # THE MOUSE EQUIVALENT, which must reach the SAME door rather than a second one.
  Scenario: a click into the byte area presents the same pane, through the same request
    Given the same streaming tile, not presented
    When the operator clicks into the tile's byte area
    Then the shell received exactly ONE present request, with the same id as `Enter` produces for that tile
    And the socket count and the xterm count are unchanged
    And clicking the header's own controls does NOT present the pane — the worded toggle still toggles the subscription and nothing else

  # THE THREE DELTAS, one scenario each. DELTA 1: the occupant claims `Escape`.
  Scenario Outline: an occupant opened from a tile claims `Escape` exactly when it can type
    Given a tile whose posture is <posture>
    When it is presented
    Then the request's `claimsEscape` is <claims>
    And the presented occupant declares an always-visible exit control either way
    And <the escape behaviour>

    Examples:
      | case                       | posture     | claims | the escape behaviour                                                          |
      | the ordinary grid tile     | interactive | true   | `Escape` is a live keystroke for the far end and the visible control is the ONLY exit |
      | a pane with no input route | read-only   | false  | `Escape` still dismisses, and the pane still expands — reading is the point    |
    # `claimsEscape` is EXACTLY `model.inputEnabled` (fullscreen-request.mjs:76) — never a
    # preference and never a host's property. Row 2 is what makes row 1 an assertion rather than
    # a constant.

  # DELTA 2: focus presents INSIDE the terminal — the operator opened it to type.
  Scenario Outline: the presented pane declares where focus lands, and it follows the opener's posture
    Given a tile whose posture is <posture>
    When it is presented
    Then the present request names <where> as where focus presents
    And that value is carried on the request the shell is handed, not decided inside the shell

    Examples:
      | case                  | posture     | where                  |
      | opened to type        | interactive | the terminal itself     |
      | opened to read        | read-only   | the exit control        |
    # THIS FIELD DOES NOT EXIST TODAY (fullscreen-request.mjs:68-79). It is additive, and the
    # alternative — the occupant focusing itself after present — puts the decision in JSX no test
    # in this repo can reach, which is the failure class TECH_DEBT 29 measured. Whether the caret
    # is legibly inside the terminal on a real render is DG-49-5's `@uat` row, not this Then.

  # DELTA 3: dismissal returns focus to the TILE, restoring the roving stop.
  Scenario: dismissing returns the operator to the tile they opened, not to a button inside it
    Given a presented pane opened from the focused tile
    When the occupant is dismissed
    Then the value the shell carries as `restoreFocusTo` is the TILE element, not the expand control and not the document body
    And the tile is once again the grid's single `tabindex="0"` stop
    And the same live node was returned to the same home it came from
    And the socket count and the xterm count are STILL unchanged — dismissing re-created nothing
    # Returning focus to a control the operator never pressed loses their place in the grid; the
    # opener on this surface is the tile itself (DESIGN §The focus model rules 1 and 9).

  # `Escape` ON THE GRID DOES NOTHING, and that is a rule rather than an omission.
  Scenario: `Escape` on the grid itself is inert
    Given a focused tile with nothing presented
    When `Escape` is pressed
    Then no present request and no dismiss was issued
    And no tile was removed, hidden or unsubscribed
    And the focused pane key is unchanged
    # No tile is a modal, and a key that sometimes closes a pane and sometimes types into one is
    # exactly the ambiguity this clause removes.

  # ONE POSTURE, BOTH HOSTS — the rule the whole shape of this task follows from.
  Scenario: the presented pane is the same session as the tile, at the same posture
    Given an interactive tile that is streaming
    When it is presented and then dismissed
    Then the presented pane's posture is the tile's own, both times
    And the tile's session identity string is byte-identical before, during and after
    And no second xterm was constructed at any point
    And the pane's `read-only` pill — present or absent — is the same in the tile and in the presented pane
