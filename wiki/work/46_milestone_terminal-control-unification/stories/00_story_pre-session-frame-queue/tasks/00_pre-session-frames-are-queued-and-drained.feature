<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/00, task 00 (ADR-008): a frame the route ACCEPTED is never
# thrown on the floor. The server queues frames that arrive before the session exists
# and drains them, in arrival order, through the same handler that serves live frames.
#
# THE DEFECT IS MEASURED, NOT INFERRED. Spike 44 §Investigation: an on-open
# `resize(111, 11)` never reached the PTY and the identical frame 400 ms later did —
# `ptyResizeApplied` held exactly one entry. The cause is read at source here:
# `terminal-ws.mjs` completes the upgrade and emits `connection` (:115-140), but
# registers `ws.on("message")` only at :306, inside `wireSession` (:276), which is
# called at :270 — after `loadWorkspace` (:181), `await trustCwd` (:194) and
# `await spawn` (:237). No buffer, no error, no log. The client hits it every session:
# `socket.onopen = () => { sendResize(); }` (TerminalDock.tsx:214-215), self-healing
# only because a later `ResizeObserver` tick fires (:266-267). The auto-typed command
# is on the same clock (:190-198, :218) and rides the SAME raw-input path, so it is
# queued frame traffic too, not a special case.
#
# LITMUS: every Then is either (a) a call recorded on the STUB PTY — `resize(cols,
# rows)` / `write(bytes)` / `kill()`, in call order — or (b) a frame a real `ws`
# client received, or (c) an HTTP status from the same server. Never a source read,
# never "the listener is registered at connection time", never "the queue is a Foo".
# The channel already exists: `test/terminal-ws.test.mjs` drives the REAL upgrade
# through `serveSetupUi` with an injected `spawn` and an injected PATH lookup, and
# collects the frames a real `ws` client received.
#
# NOT ASSERTED HERE, AND WHERE IT LIVES INSTEAD.
#   - WHERE the listener is registered, what the queue is made of, what its constant
#     is called: source-analysis claims. ARCHITECTURE §Fitness functions is explicit
#     that structural invariants belong to a gate, and ADR-008 is equally explicit
#     that this pin is BEHAVIOURAL — "a structural gate would assert where a listener
#     is registered, which is the implementation, not the property".
#   - The queue's CEILING, what happens above it, and the coded report: task 01.
#   - That the client keeps `onopen -> sendResize()` and grows no timer: that is
#     `ui/`'s file, and it is re-homed by stories 46/03-46/04. What IS asserted here
#     is the observable that makes a client timer unnecessary — the geometry lands
#     with no second frame from the client and no wait on the far end (scenario 6).
#   - The ADR-003 envelope's OTHER halves (a missing provider degrades to an error
#     control-frame; node-pty never reaches `ui/`) are m03's, still green in
#     `test/terminal-ws.test.mjs` and `test/arch/acd-terminal-server-only.test.mjs`.
#
# WHY THERE IS NO @uat LANE, said out loud so its absence is a decision. The operator
# outcome — "the TUI paints at the size of the pane, first time" — is TRUE AT THE
# BOARD TODAY, roughly 400 ms late, because the `ResizeObserver` tick repairs it. A
# human judging a live dock would therefore sign off a broken server exactly as
# readily as a fixed one; that scenario would pass either way, which is a lie, not a
# lane. The operator-visible half is judged where a real xterm and a real pane exist
# (46/04-46/05, and m49's grid, where N panes multiply the defect). One @manual DOES
# survive below, and only because it asserts something the stub cannot: a real
# node-pty being resized microseconds after it spawned, which is earlier than any
# resize has ever reached it, on the platform where that is riskiest.
#
# FEASIBILITY — authorable RED today, with two additions to the EXISTING harness and
# no new channel: (1) `recordingSpawn`'s stub PTY currently discards `resize()` and
# `write()` (`test/terminal-ws.test.mjs:72-73`) — it must record them, in order;
# (2) a spawn the test RELEASES on demand (a deferred promise) so "before the session
# exists" is a window the test owns rather than a race it hopes for. Without (2) the
# scenarios below would depend on `loadWorkspace`'s real file I/O being slower than a
# LAN round-trip, which is true today and is not a contract.
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never
# the full suite (`test/global-work-propagation.test.mjs` binds :4182, which the live
# control daemon holds). This suite follows the house's array-export idiom:
# `test/terminal-ws.test.mjs` exports `terminalWsTests` and `scripts/test.mjs`
# registers it (:468, :1870), so a focused run imports the array.

@cli @work @board
Feature: a frame the server accepted before the session existed is queued and drained in order, never dropped
  In order that the geometry the browser sends the instant the socket opens actually reaches the PTY — the first time, on every pane, without the operator nudging the window and without every client re-inventing the same workaround
  the server must retain frames that arrive before the PTY exists, apply them in the order they arrived once it does, treat a queued frame exactly as it treats a live one, and add nothing to the frozen wire envelope in either direction

  Background:
    Given the REAL terminal WebSocket route served on 127.0.0.1, started the way `test/terminal-ws.test.mjs` already starts it
    And an injected PATH lookup reporting the chosen provider's binary present
    And an injected spawn returning a stub PTY that RECORDS every `resize(cols, rows)`, `write(bytes)` and `kill()` in call order
    And that spawn is held open by the harness until the scenario releases it, so "before the session exists" is a window the scenario controls rather than a race it hopes for
    And a real `ws` client that sends its frames in the same tick the socket opens, exactly as `TerminalDock` does
    And every Then below reads the stub PTY's recorded calls, the frames the client received, or an HTTP status from the same server — never a source file

  # HEADLINE, and it is spike 44's own measurement inverted: the frame that never
  # arrived must now arrive. The client sends ONCE and never again — no second frame,
  # no ResizeObserver tick, no timer — so a passing run cannot be a self-heal.
  @executable @bug
  Scenario Outline: a resize sent in the same tick the socket opens is applied to the PTY once the session is live
    Given a client that sends `{"type":"resize","cols":<cols>,"rows":<rows>}` in the same tick the socket opens, and nothing after it
    When the harness releases the spawn and the session becomes live
    Then the stub PTY records exactly one resize call
    And that call's arguments are <applied>
    And no further frame was sent by the client to make that happen — no second resize, no re-emitted fit, no delay on the client's part
    And the stub PTY records no write calls

    Examples:
      | case                                             | cols | rows | applied  |
      | the spike's own measurement, inverted            | 111  | 11   | 111 × 11 |
      | a wide dock on a 1440px pane                     | 213  | 47   | 213 × 47 |
      | the narrowest pane a dock can be dragged to      | 20   | 4    | 20 × 4   |
      | a geometry identical to the spawn default        | 80   | 24   | 80 × 24  |
    # ROW 4 IS THE ONE THAT NEEDS THE COUNT. `spawn` is already called with
    # `cols: 80, rows: 24` (terminal-ws.mjs:237-243), so a dropped 80×24 frame and an
    # applied one leave the PTY at the same geometry — the evidence there is "exactly
    # one resize call was RECORDED", not the value. A test that asserted only the
    # geometry would pass on the broken server for that row.

  # ORDER IS PART OF THE CONTRACT (ADR-008): a queued resize, then queued keystrokes,
  # then live keystrokes, in that sequence — or the first fit lands after the first
  # paint. Row 5 is the no-regression row: an empty queue must not be in the way.
  @executable @bug
  Scenario Outline: frames that arrived before the session existed are drained in the order they arrived, and live frames follow them
    Given the spawn is held open and the client sends <pre-session frames>, in that order
    When the harness releases the spawn and the client then sends <live frames>
    Then the stub PTY's recorded calls are exactly <the PTY records>, in that order
    And no recorded call appears twice — nothing is drained and then replayed
    And the number of recorded calls equals the number of frames the client sent

    Examples:
      | case                                            | pre-session frames                   | live frames        | the PTY records                                                     |
      | a fit, then typing                              | resize 111×11, "l", "s"              | "\r"               | resize(111,11), write("l"), write("s"), write("\r")                 |
      | typing, then a fit — the fit is the last word   | "a", resize 90×30                    | (none)             | write("a"), resize(90,30)                                           |
      | two fits before the session exists              | resize 80×24, resize 111×11          | (none)             | resize(80,24), resize(111,11)                                       |
      | a paste split across three frames               | "ec", "ho ", "hi\r"                  | (none)             | write("ec"), write("ho "), write("hi\r")                            |
      | nothing queued, everything live                 | (none)                               | resize 100×40, "x" | resize(100,40), write("x")                                          |
      | the real dock's burst — fit, then the command   | resize 111×11, "/aof:refine 46/00\r" | (none)             | resize(111,11), write("/aof:refine 46/00\r")                        |
      | a fit between two live keystrokes               | "a"                                  | resize 70×20, "b"  | write("a"), resize(70,20), write("b")                               |
    # ROW 3 pins that BOTH queued resizes are applied, in order — the drain replays the
    # arrival sequence, it does not compact it into "the last one wins". Row 6 is the
    # client as it is actually written: the auto-typed command travels as ORDINARY
    # INPUT on the raw path (TerminalDock.tsx:190-198), so a queue that handled only
    # control frames would silently eat the operator's first command.

  # THE PROPERTY THAT MAKES THE FIX SAFE: the drain changes TIMING, never SEMANTICS.
  # Each row is sent twice over two identical sessions — once into the queue, once
  # live — and the two recorded calls must be the same call. Every value below is the
  # behaviour of the handler as it stands today (parseControl at :350-359, toCols /
  # toRows at :377-385), so a queue that quietly normalised, re-encoded or filtered
  # anything on the way through is caught by the row it changes.
  @executable
  Scenario Outline: a frame means the same thing on either side of the boundary — the queue changes timing, never semantics
    Given the identical frame <frame the client sends> delivered over two identical sessions: once before the session exists, once after it is live
    When both sessions have drained and are live
    Then the queued session's stub PTY records <the PTY records>
    And the live session's stub PTY records <the PTY records>
    And the two recorded calls are identical — same method, same arguments, byte for byte

    Examples:
      | case                                          | frame the client sends                   | the PTY records                            |
      | a well-formed resize                          | `{"type":"resize","cols":111,"rows":11}` | resize(111, 11)                            |
      | a resize with no cols                         | `{"type":"resize","rows":11}`            | resize(80, 11)                             |
      | a resize with a non-numeric cols              | `{"type":"resize","cols":"wide"}`        | resize(80, 24)                             |
      | a resize with zero cols                       | `{"type":"resize","cols":0,"rows":11}`   | resize(80, 11)                             |
      | a resize with negative rows                   | `{"type":"resize","cols":111,"rows":-5}` | resize(111, 24)                            |
      | a fractional geometry                         | `{"type":"resize","cols":111.7}`         | resize(111, 24)                            |
      | an unknown JSON control type                  | `{"type":"paste","data":"x"}`            | write of that JSON text, byte for byte     |
      | malformed JSON that opens with a brace        | `{"type":`                               | write of that text, byte for byte          |
      | plain input bytes                             | `ls -l\r`                                | write("ls -l\r")                           |
      | text that only looks like JSON further in     | `echo {"type":"resize"}`                 | write of that text, byte for byte          |
      | resize JSON sent as a BINARY frame            | the same bytes, `isBinary` true          | write of those bytes — never a resize      |
      | an empty text frame                           | (zero bytes)                             | write of zero bytes                        |
    # ROWS 7, 8, 10 AND 12 PIN PRE-EXISTING BEHAVIOUR, NOT A NEW DESIGN. An unknown
    # control type falls through to `term.write(data.toString())` (:317-321), so
    # `{"type":"paste"}` is typed into the agent's prompt as literal text. That is what
    # the server does today; it is pinned here so the drain cannot silently change it,
    # and QA has routed the oddity itself to the PO as a design-gap rather than fixing
    # it inside a story chartered to buffer frames.
    # ROW 11 is the one a naive queue breaks: `isBinary` must survive the queue, or a
    # pasted binary payload that happens to be JSON becomes a geometry change.

  # ADR-008: "then takes over live". Once the queue has drained it must be out of the
  # way — not a permanent staging buffer that every later frame is copied through, and
  # never a tape that gets replayed a second time.
  @executable
  Scenario: once drained, the queue is out of the way — later frames take the ordinary path and nothing is replayed
    Given a client that sent a resize and two keystrokes before the session existed
    When the harness releases the spawn, the queue drains, and the client then sends a further resize and two more keystrokes one at a time
    Then each later frame appears in the stub PTY's recorded calls before the client sends the next one
    And the stub PTY's recorded call list holds every frame exactly once, in the order the client sent them
    And the total number of recorded calls equals the total number of frames the client sent
    And the PTY's last recorded geometry is the LAST resize the client sent

  # PER-CONNECTION, NOT PER-SERVER. One queue shared across sockets would deliver one
  # pane's geometry to another pane — worse than the defect being fixed, and exactly
  # the shape m49's grid opens N of at once.
  @executable
  Scenario: two sockets opening in the same tick each get their own frames and nobody else's
    Given two clients connecting to the same server at the same time, each with its spawn held open
    And the first sends `{"type":"resize","cols":111,"rows":11}` and the second sends `{"type":"resize","cols":60,"rows":20}`, each in the same tick its own socket opened
    When both spawns are released and both sessions become live
    Then the first session's stub PTY records exactly one resize, 111 × 11
    And the second session's stub PTY records exactly one resize, 60 × 20
    And neither stub PTY records the other's geometry
    And neither stub PTY records any write

  # ADR-003's envelope is FROZEN, and ADR-008 rejects a `ready` handshake precisely to
  # keep it that way. Asserted as what crosses the wire, in both directions.
  @executable
  Scenario: the wire envelope is unchanged — no new frame type in either direction and no handshake to wait for
    Given a client that sends a resize in the same tick the socket opens and never sends another control frame
    When the session runs, streams output, and the PTY exits with code 0
    Then every frame the client received is either raw PTY output or one of the two frozen control frames, `{type:"exit"}` or `{type:"error"}`
    And no frame the client received carries a `type` of "ready", "ack", "queued", "resize" or any other name
    And the first frame the client received is the PTY's own first output — the server announced nothing before it, so there was nothing for the client to wait for
    And the resize was applied without the client sending a second frame
    And a client that sends nothing at all before the session is live is served exactly as before: its PTY records only the frames it sends afterwards

  # ENVIRONMENT-DEPENDENT, so @manual and not CI — the m03 A7 precedent. The
  # @executable lane resizes a STUB; this lane resizes a real node-pty microseconds
  # after it spawned, which is earlier than any resize has ever reached one here, and
  # win32 ConPTY is where "already-exited / not-yet-ready" guards actually fire
  # (terminal-ws.mjs:312-314 catches exactly that class and reports it).
  @manual
  Scenario: on a real machine the drained resize reaches a real node-pty without wedging the session
    Given a machine with the chosen provider genuinely installed and `aof work ui` serving the board
    When I open the terminal dock on an item, let it send its on-open fit, and touch nothing else
    Then the dock reaches the running state and streams the agent's output
    And the session is still alive and still accepts keystrokes a minute later
    And the degrade sink holds no `terminal-ws` entry for that session — a resize the real PTY refused would be reported there
    And the board server's stdout carries the ordinary `terminal: <provider> started · pid=…` line and no error beside it
