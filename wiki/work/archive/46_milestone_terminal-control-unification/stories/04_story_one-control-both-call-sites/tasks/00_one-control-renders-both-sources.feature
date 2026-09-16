<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/04, the headline claim in its narrowest form: ONE control,
# handed a `local-pty` source, opens the board's bidirectional socket, fits, and forwards
# keystrokes; handed a `mirror`, opens the tuple-bound terminal-view socket, renders at the
# worker's fixed 80×24, scales into its box, and — depending on its MOUNT's posture —
# forwards keystrokes or has no input path at all. ONE xterm instance and ONE socket per
# mounted control, in both cases.
#
# WHAT THIS TASK ADDS OVER 46/03, so the two are not one test written twice. 46/03 drives
# the CORE in isolation: the frozen two-entry source table, `geometryModeFor(source)`,
# `terminalSocketUrl(source, params, { origins })`, the merged ramp and the input policy,
# each exhaustively, imported by nothing. THIS task drives the COMPOSITION: what each CALL
# SITE hands the control, what the control derives from that, and what the operator then
# sees in a real browser. A row below that could be written without naming a call site or a
# host belongs in 46/03 and should be deleted from here rather than duplicated.
#
# LITMUS, AND THE SPLIT IS THE HARD PART BECAUSE THIS REPO HAS NO REACT TEST HARNESS.
# What exists is a headless MOUNT harness, and it is not the same thing:
# `test/support/react-app-harness.mjs` esbuild-bundles the real `.tsx` against
# `test/support/mini-react.mjs`, whose `useRef` returns a plain `{ current }` that NOTHING
# ever assigns a node to ([mini-react.mjs:199-200]). So `viewportRef.current` is null for
# the whole life of a harness mount, both session effects early-return on exactly that
# check ([TerminalDock.tsx:143-144], [FleetTerminalView.tsx:147-148]), and no xterm and no
# socket is ever constructed there. All three harnesses stub the terminal out BY MODULE
# PATH anyway ([board-app-harness.mjs:37], [:52-55]; [fleet-app-harness.mjs:31], [:34]),
# for the same reason: xterm wants a real DOM.
# Therefore:
#   - MODEL facts — what a call site hands the control, which path and params the source
#     declares, which geometry mode is derived, what URL a given `{ origins }` produces,
#     whether an input path exists — are `@executable` over the framework-free `.mjs` set
#     under plain `node`.
#   - LIVE-DOM facts — one xterm instance, one socket, a keystroke that actually reaches a
#     far end, 80 columns actually unwrapped, a bar that actually covers no glyph — are
#     `@manual`, run by an agent against a deployed build, with the evidence named below.
#   - PIXEL facts are task 04's `@uat`. An `@executable` scenario that needs a browser is
#     the failure mode (the m43/m45 precedent); there are none below.
#
# NOT ASSERTED HERE — these are STRUCTURAL invariants and each already has a gate that owns
# it (ARCHITECTURE §Fitness functions is explicit that writing them as Gherkin puts a
# fitness function in the wrong home):
#   - no port literal on a terminal surface, and the URL is built by ONE pure builder that
#     reads no `window`/`location` → `test/arch/acd-terminal-origin-not-port.test.mjs`;
#   - exactly ONE `new Terminal(` construction site under `ui/src`, `@xterm/*`-only imports
#     at that site → `test/arch/acd-terminal-server-only.test.mjs` (amended);
#   - the `ui/src/terminal/**.mjs` set imports no React and nothing from `ui/src/board/` or
#     `ui/src/fleet/`, and one state vocabulary survives →
#     `test/arch/acd-terminal-control-boundary.test.mjs`;
#   - the descriptor's `mirror.fixedGeometry` equals the worker's own `ptySpawn` geometry →
#     `test/arch/acd-terminal-mirror-geometry-pinned.test.mjs`.
# What the scenarios below assert is the OBSERVABLE CONSEQUENCE of those invariants — a
# mirror pane renders its 80 columns unwrapped, a fitted pane reflows, a pane dials the
# origin it was handed — never the invariant itself.
#
# THE THREE `@bug` SCENARIOS. DESIGN §What visibly changes enumerates three latent defects
# the unification forces out; they are FIXES here, not regressions, and each is tagged
# `@bug` with no `@finding-` id because none came from a VERIFICATION.md Findings log —
# they were found by reading the two shipping files at refine (change 5: a `mirror` in the
# board dock is resized to 80×24 and painted at natural size into a 280px dock, never
# scaled, [TerminalDock.tsx:165-168] + [:414]; change 6: the dock's error message overprints
# the viewport, [TerminalDock.tsx:420-424], a straight V11 violation; change 7: the
# fullscreen bar does the same, [FleetTerminalView.tsx:434-438], admitted at [:406-408]).
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never the
# full suite (`global-work-propagation.test.mjs` binds :4182, which the live control daemon
# holds).

@ui @work @design
Feature: one control renders both session sources — a local PTY it can resize and type into, and a worker's mirror it renders at the worker's own geometry, off one xterm instance and one socket at every call site
  In order that a terminal bug is fixed once instead of twice, and that what an operator learns about the board's terminal is true of the fleet's
  the one control must derive its socket, its geometry, its input path and its chrome from the SOURCE it is handed and the POSTURE its mount declares — and must build exactly one xterm and open exactly one socket per mount, whichever of the two it is given

  Background:
    Given the one control from 46/03's core, mounted by the board and by the fleet, with `ui/src/board/TerminalDock.tsx` and `ui/src/fleet/terminal-view/FleetTerminalView.tsx` gone
    And the model scenarios below load the control's framework-free `.mjs` set under plain `node` — no bundler, no DOM, no browser
    And the browser scenarios below run against a deployed build (`node scripts/install-local.mjs`), with the board at its EPHEMERAL per-workspace origin supplied at run time and the fleet at its fixed `http://127.0.0.1:4181`

  # WHAT EACH CALL SITE HANDS THE CONTROL. This is the seam the milestone exists to create:
  # two surfaces, one control, and the ONLY thing that differs between them is the pair of
  # declarations below. Note rows 2 and 3 deliberately: the SAME `mirror` source, handed by
  # two different hosts, differing in exactly one field.
  @executable
  Scenario Outline: each call site resolves its own state into a source descriptor and a mount posture the one control accepts
    Given the call site <call site> holding <what it holds>
    When it resolves what to hand the control
    Then the source is <source> and the mount posture is <posture>
    And the params carried to the socket are exactly <params> — no more, and never a defaulted or guessed one
    And the origin the source asks for is <origin role>
    And the descriptor is the control's ONLY input: no call site passes a geometry, a URL, a port, or an `isRemote` boolean beside it

    Examples:
      | case                                       | call site   | what it holds                                                  | source      | posture     | params               | origin role          |
      | Run agent on a board item                  | the board   | its own dock session `{ ref, command }` for a PTY it will spawn | local-pty   | interactive | ref, provider        | the board's own      |
      | the board's mirror affordance              | the board   | the item's own execution facts `{ ref, nodeId, sessionId }`     | mirror      | interactive | nodeId, sessionId    | the fleet's          |
      | a fleet card with a captured session       | the fleet   | an assignment resolving a FULL (nodeId, sessionId) tuple        | mirror      | read-only   | nodeId, sessionId    | the fleet's own      |
      | a fleet card whose worker has not captured | the fleet   | an assignment with a target node and NO sessionId               | (none)      | (none)      | (none)               | (none)               |
      | the dock open with nothing bound           | the board   | no session at all                                               | (none)      | interactive | (none)               | (none)               |
    # ROWS 2 AND 3 ARE THE WHOLE ARGUMENT. `mirror` is one source; the board mounts it
    # typeable (m42's operator override) and the fleet mounts it read-only (invariant 4,
    # which survives this milestone — 46/SPEC "out of scope: making the fleet page's panes
    # typeable"). One flag on the source cannot express that; two declarations can.
    # ROW 4 renders NO panel at all — not an empty one, not an `unavailable` one. That
    # distinction is task 03's subject and is NOT relaxed here.
    # ROW 5 is `idle`: no source bound, no socket opened, the centred empty line in the byte
    # area. It is not an error and not a loading state.

  # THE DERIVATION TABLE — everything the control decides, decided FROM the descriptor.
  # ADR-003's forbidden spellings (`if (remote`, `isRemote`, `kind === "mirror"`,
  # `origin ===`, a test of the socket URL) are absent by construction if this table holds,
  # which is why the last Then varies the host and the origin and expects no answer to move.
  @executable
  Scenario Outline: the control derives its socket, its geometry and its input path from the descriptor — and gives the same answers in every host
    Given the control is handed <source> at posture <posture>
    When its plan for that mount is read
    Then the socket path is <path>
    And the geometry mode is <geometry>, because <why>
    And it emits <resize frames> up that socket
    And an input path <input>
    And the cursor is <cursor>
    And the `read-only` label is <label>
    And re-reading the same plan for the same descriptor in a different host, on a different origin, at a different box size returns every one of those answers unchanged

    Examples:
      | case                          | source     | posture     | path                | geometry | why                                              | resize frames                          | input                                              | cursor                        | label   |
      | the board's own PTY           | local-pty  | interactive | /ws/terminal        | fit      | the source declares a resize control frame       | exactly ONE per fit, none on a no-change fit | exists: keystrokes ride the socket as raw bytes | blinking block                | absent  |
      | a worker mirror in the dock   | mirror     | interactive | /ws/terminal-view   | scale    | the source declares NO resize control frame      | none at all — the lane carries none     | exists: keystrokes ride the tuple-bound socket     | blinking block                | absent  |
      | a worker mirror on a card     | mirror     | read-only   | /ws/terminal-view   | scale    | the source declares NO resize control frame      | none at all — the lane carries none     | does NOT exist: stdin disabled, no handler at all   | underline, NOT blinking       | present |
    # THE `scale` ROWS' "none at all" IS STRUCTURAL, NOT DEFENSIVE. Today a mirror is stopped
    # by an early return inside the send path (`if (remote != null) return`,
    # TerminalDock.tsx:203). After this story a `scale` source declares no resize control
    # frame and the emitter is only wired for sources that do — so there is no path to
    # guard. A build that keeps the early return has kept the branch this milestone deletes.
    # ROW 3's "does not exist" is read-only IN FACT: `disableStdin: true` and NO `onData`
    # registration, the m38 posture verbatim. A half-disabled widget that swallows
    # keystrokes silently is the worse lie (DESIGN §Read-only is a posture).

  # THE ORIGIN, COMPOSED. 46/02 serves the fact; 46/03 builds the URL; this asserts the two
  # meet correctly at the call site — the single argument that is the whole interface
  # between the two halves of this milestone.
  @executable
  Scenario Outline: the socket URL is composed from the origins the surface was HANDED, and a surface that was handed none opens nothing
    Given the page <page> served from <page origin>, handed <origins>
    When the control builds the socket URL for <source>
    Then the URL is <url>
    And its scheme is <scheme>, chosen from the protocol of the origin being DIALLED — never from the page's own
    And the origins arrived as an argument — the same call with the same arguments returns the same URL with no `window` and no `location` in reach

    Examples:
      | case                                  | page      | page origin              | origins                                          | source     | url                                                                  | scheme |
      | the board's own PTY, as today         | the board | http://127.0.0.1:PORT    | self = the page's own origin                     | local-pty  | ws://127.0.0.1:PORT/ws/terminal?ref=…&provider=…                     | ws     |
      | the board mirroring a worker          | the board | http://127.0.0.1:PORT    | fleet = the launcher's served fact               | mirror     | ws://127.0.0.1:4181/ws/terminal-view?nodeId=…&sessionId=…            | ws     |
      | the board started standalone          | the board | http://127.0.0.1:PORT    | fleet = the command layer's default              | mirror     | ws://<the default fleet origin>/ws/terminal-view?nodeId=…&sessionId=… | ws     |
      | a non-default fleet port              | the board | http://127.0.0.1:PORT    | fleet = http://127.0.0.1:9999                    | mirror     | ws://127.0.0.1:9999/ws/terminal-view?nodeId=…&sessionId=…            | ws     |
      | the fleet's own card peek             | the fleet | http://127.0.0.1:4181    | self AND fleet = the page's own origin            | mirror     | ws://127.0.0.1:4181/ws/terminal-view?nodeId=…&sessionId=…            | ws     |
      | a page served over TLS                | the fleet | https://host             | self AND fleet = the page's own origin            | mirror     | wss://host/ws/terminal-view?nodeId=…&sessionId=…                     | wss    |
      | an http page dialling an https fleet  | the board | http://127.0.0.1:PORT    | fleet = https://fleet.example                     | mirror     | wss://fleet.example/ws/terminal-view?nodeId=…&sessionId=…            | wss    |
      | no fleet origin was ever handed       | the board | http://127.0.0.1:PORT    | fleet = absent                                   | mirror     | (no URL at all)                                                      | n/a    |
    # ROW 4 IS THE ONE THAT WOULD HAVE FAILED BEFORE THIS MILESTONE, and it is the operator
    # story 46/02 was written for: a fleet started on anything but 4181 was unreachable from
    # the board, because the board held the number rather than being told it.
    # ROWS 5-6 SUPPLY BOTH KEYS DELIBERATELY. `mirror` declares `originRole: fleet` (ADR-002),
    # so it resolves against `origins.fleet` and NOT against `origins.self` — a fleet page
    # handed only `self` yields NO URL (46/03 task 03 rules exactly this). On the fleet's own
    # page the two origins happen to be the same value, and that coincidence is precisely why
    # it must be stated: a builder that fell back to `self` when `fleet` was absent would pass
    # these two rows and fail row 8, which is the case that matters.
    # ROW 7 IS THE `@bug` ROW and it is a BEHAVIOUR CHANGE, not an extraction (PO ruling,
    # 46/03 STORY.md §PO rulings). Today `mirrorWsUrl` (`TerminalDock.tsx:440-445`) takes the
    # PAGE's protocol and the FLEET's hostname — so an http board dialling an https fleet
    # builds `ws://` and fails, and an https board dialling an http fleet builds `wss://` and
    # fails the other way. The scheme follows the origin actually being dialled.
    # ROW 8 opens NOTHING and renders the `unavailable` pane — task 03 owns its copy. Note
    # the boundary it draws with the ramp: an origin we do NOT HAVE is `unavailable`; an
    # origin we have and cannot CONNECT to is `error`. They are different facts.

  # ────────────────────────── the browser half ──────────────────────────
  # ONE INSTANCE, ONE SOCKET. The claim the extraction is judged on, and the one no model
  # can make: mini-react never gives a ref a node, so nothing headless here ever constructs
  # an xterm at all.
  @manual
  Scenario Outline: exactly one xterm and exactly one socket exist per mounted control, in a real browser, for both sources
    Given <host> is opened in a real browser with devtools recording network and elements
    When a session of <source> is bound and the pane paints its first bytes
    Then exactly ONE `.xterm` element exists inside that control's byte area — not two, not a stale one beside a live one
    And exactly ONE WebSocket is open to <path> for that pane, and its query carries the pane's own params
    And no second socket is opened by resizing the window, dragging the dock, re-rendering the page around it, or scrolling the surface
    And closing the pane leaves zero of both

    Examples:
      | case                        | host                       | source     | path               |
      | the board's own PTY         | the board dock             | local-pty  | /ws/terminal       |
      | a worker mirror in the dock | the board dock             | mirror     | /ws/terminal-view  |
      | a worker mirror on a card   | a fleet assignment card    | mirror     | /ws/terminal-view  |
    # EVIDENCE RECORDED IN THE MILESTONE'S `VERIFICATION.md` (46), under the 46/04 section,
    # at `aof:verify 46`: the build stamp (`~/.aof/bin/aof.exe --version` → `0.1.0 (payload
    # <buildId>)` and the `Build: payload <buildId>` line both daemons print); the element
    # count and the socket list, verbatim, per row; and the board's ephemeral origin used.

  # THE INPUT DIRECTION, END TO END. m42's operator override is preserved by the move, and
  # the fleet's read-only posture is preserved by it too — the second half is task 02's
  # scenario, and it is deliberately NOT restated here.
  @manual
  Scenario Outline: a keystroke typed into an interactive mount arrives at the far end, and the far end's answer paints back
    Given <host> is open on <source> and the pane is streaming
    When the operator types a line and presses Enter
    Then the far end receives exactly those bytes: <far end>
    And its response paints into the same pane, in order, with no dropped or duplicated frame
    And nothing about the pane's geometry changes as a result of typing

    Examples:
      | case                        | host             | source     | far end                                                        |
      | the board's own PTY         | the board dock   | local-pty  | the PTY this board server spawned — its shell echoes the line  |
      | a worker mirror in the dock | the board dock   | mirror     | the worker's live `claude` PTY on the node the tuple names     |
    # The mirror row is the cross-machine one; run it against the WSL worker node, which is
    # the cheapest real second machine. Record the node id and session id used.

  # `@bug` 1 of 3 — DESIGN §What visibly changes, change 5. TODAY a `mirror` opened in the
  # BOARD dock is resized to 80×24 (≈640×408px at fontSize 13) and painted at natural size
  # into a 280px dock: the operator sees the top-left corner of the worker's screen and
  # nothing else. It is cropped, silently, and has been since m42.
  @manual @bug
  Scenario: a mirror opened in the board dock is SCALED into the dock, never cropped
    Given the board dock is opened as the mirror of a worker session, at the dock's default height
    When the worker's `claude` TUI paints a full 80-column screen
    Then all 80 columns and all 24 rows are visible inside the dock — no column is cut off at the right edge and no row below the fold
    And the aspect ratio is preserved and the screen is anchored top-left
    And the leftover space at the right and/or bottom is empty terminal background, which is CORRECT and must not be logged as a gap
    And dragging the dock taller makes the glyphs bigger and does NOT change the line count — a mirror gains a bigger picture of the same 80 columns, never more columns
    And the same source in the fleet card and in the fullscreen overlay obeys the identical rule, at a smaller and a larger scale

  # `@bug` 2 of 3 — change 6. TODAY the dock paints its error message in a
  # `pointer-events-none absolute inset-x-0 top-0` layer over the viewport, on top of the
  # operator's last output line. V11 has forbidden that on the fleet surface since m38.
  @manual @bug
  Scenario Outline: a non-live message never overprints the bytes — on a FULL pane it is an opaque in-flow bar paid for out of the byte area, and on an EMPTY one it is a top-left line
    Given <host> on a pane that is <pane>, driven into <state>
    When the message renders
    Then it is <treatment>
    And no glyph of the operator's last output line is covered, dimmed out of legibility, or clipped
    And the HOST's total height is unchanged by the message appearing or disappearing
    And when the pane is full it is the byte area that shrinks by the bar's height, and the terminal re-fits or re-scales into the smaller box

    Examples:
      | case                              | host                    | pane                       | state                | treatment                                            |
      | the dock's server error frame     | the board dock          | full — bytes have painted  | error (missing provider) | an opaque in-flow bar at the bottom of the byte area |
      | the dock's transport failure      | the board dock          | full — bytes have painted  | error (connection failed) | an opaque in-flow bar at the bottom of the byte area |
      | a dock session that exited        | the board dock          | full — bytes have painted  | ended, exit code 0   | an opaque in-flow bar at the bottom of the byte area  |
      | the honest cold start             | the board dock          | empty by definition        | waiting for output   | a top-left line inside the byte area, where the first line will appear |
      | the card's ended stream           | a fleet card peek       | full — bytes have painted  | stream ended         | an opaque in-flow bar; the panel stays exactly 192px  |
    # The dock rows are the FIX (it has no bar today); the card rows are the RULE it is
    # being fixed against, and they must not regress while it happens.

  # `@bug` 3 of 3 — change 7. The fullscreen overlay's bar is `absolute … bottom-0` today
  # and the file admits it, reasoning that the fitness function reads the compliant inline
  # twin. One rule, all three surfaces.
  @manual @bug
  Scenario: the fullscreen overlay's non-live bar is in flow, like the inline one, and covers nothing
    Given a pane expanded to fullscreen and then driven to `ended` or `error`
    When the bar renders in the overlay
    Then it takes its own layout space at the bottom of the overlay's byte area — it does not float over it
    And the terminal re-fits (`local-pty`) or re-scales (`mirror`) into the smaller box, so no glyph is covered
    And the overlay's own chrome is otherwise identical to the inline header: the same lockup, the same identity, the same posture pill, the same state chip
    And there is no fullscreen-only state and no fullscreen-only copy anywhere in it

  # THE EMPTY HOST, in the browser. Cheap to get wrong at an extraction, and it is the state
  # an operator meets first.
  @manual
  Scenario: the dock with no session bound shows the empty line, opens no socket, and is not an error
    Given the board dock is open with nothing bound
    When the surface settles
    Then the state chip reads `idle` with its text label, and nothing pulses
    And the byte area holds the centred line `No session. Press Run agent on an item.`
    And no WebSocket to any terminal route is open for that pane
    And nothing on the pane is red and nothing suggests something is loading
