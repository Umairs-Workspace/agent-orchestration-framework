<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/00, task 01 (ADR-008): the queue task 00 introduces has a
# ceiling, and everything it refuses to hold is refused OUT LOUD. "Bounded, because an
# unbounded buffer is a memory hole with a socket attached" — and over the ceiling the
# OLDEST frames go, not the newest, because the newest resize is the true one.
#
# WHAT THIS TASK EXISTS TO PREVENT. Task 00's fix makes the server retain client
# traffic across `loadWorkspace` + `trustCwd` + `await spawn` (terminal-ws.mjs:181,
# :194, :237) — a window whose length is decided by file I/O and process creation, not
# by the client. Anything a client sends in that window is memory the server holds on
# the client's word. The route is 127.0.0.1 and single-user, so this is a runaway-pane
# and a hung-spawn hazard rather than an attacker, and it is still a hazard: m49 opens
# N panes at once, and a spawn that hangs holds the window open indefinitely.
#
# THE THREE BOUNDARIES THIS TASK PINS, all of them the window closing WITHOUT a live
# session: the ceiling (more arrives than may be held), the socket closing first, and
# the spawn failing. Each must end with nothing retained and nothing replayed.
#
# LITMUS: every Then is (a) a call recorded on the STUB PTY — `resize(cols, rows)`,
# `write(bytes)`, `kill()`, in call order and countable; (b) an entry in the degrade
# sink, injected through `degrade.mjs`'s own `setDegradeSinkForTest` seam (which also
# clears the per-code throttle, so each scenario's count is its own); (c) a frame the
# real `ws` client received; or (d) an HTTP status from the same server. The house
# already writes degrade entries as the observable in exactly this register — see
# 43/06's "the durable degrade sink holds ONE coded entry for that read, not twelve".
#
# THE CEILING'S NUMBER IS NOT QA'S TO SET, so no table below retypes one. The tables
# name `the ceiling` and read it from the value the server publishes for it (the input
# lane's `MAX_TERMINAL_INPUT_BYTES`, mesh-ui-serve.mjs:168-173, is the shape ADR-008
# cites). What QA pins is the SHAPE — bounded, newest-wins, reported — plus one FLOOR:
# an ordinary dock's opening burst is a fit plus one auto-typed command line
# (TerminalDock.tsx:190-198, :214-219), so a ceiling that drops anything on an
# ordinary session is wrong at any number. Scenario 1 row 1 is that floor.
#
# NOT ASSERTED HERE, AND WHERE IT LIVES INSTEAD.
#   - The constant's NAME, its home, the queue's data structure, where the eviction is
#     written: source-analysis claims. ARCHITECTURE §Fitness functions is explicit that
#     structural invariants belong to a gate, and ADR-008 is explicit that this pin is
#     behavioural.
#   - Process memory / heap growth. A heap assertion is a flaky assertion, and reading
#     the server's retained bytes is white-box (the developer's `@manual` lane if it is
#     ever wanted). The bound is observed instead as the bytes the PTY receives on
#     drain — a faithful proxy, because everything retained is delivered.
#   - Ordering, drain semantics and the frozen envelope: task 00.
#   - The error control-frame's own wording and the missing-provider path: m03's, green
#     today in `test/terminal-ws.test.mjs`. This task asserts only that a queued flood
#     leaves them BYTE-IDENTICAL.
#
# ONE PRE-EXISTING LEAK, FOUND AT THIS REFINE AND CARRIED IN SCENARIO 4 (@bug). A
# socket that closes during `await spawn` is already gone when `wireSession` (:276)
# registers `ws.on("close")` (:324) — a `close` that has already been emitted never
# reaches a listener attached afterwards, so `term.kill()` (:333) is never called and
# the PTY outlives its socket. The same is true for a close during `loadWorkspace` or
# `trustCwd`: `handleConnection` runs on to spawn a PTY for a socket nobody is holding.
# The PO's wording is "discards its queue and leaks nothing"; read literally that
# covers the process, and the scenario is written that way. It is deliberately its own
# scenario so that, if the PO scopes the process half out, the whole scenario moves to
# a story of its own rather than a Then quietly disappearing.
#
# FEASIBILITY — authorable RED today on the EXISTING channel, with the same two
# harness additions task 00 needs (a stub PTY that RECORDS `resize`/`write`/`kill`, and
# a spawn the test RELEASES on demand) plus a recording degrade sink, which
# `test/support/cache-read-fixture.mjs` already demonstrates.
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never
# the full suite (`test/global-work-propagation.test.mjs` binds :4182, which the live
# control daemon holds). This suite follows the house's array-export idiom:
# `test/terminal-ws.test.mjs` exports `terminalWsTests` and `scripts/test.mjs`
# registers it (:468, :1870), so a focused run imports the array.

@executable @cli @work @board
Feature: the pre-session queue has a ceiling, and everything above it — or cut short by a close or a failed spawn — is dropped out loud
  In order that a runaway pane cannot make the server hold memory on a client's word, and that nothing is ever discarded in a way a reader cannot find afterwards
  the server must retain no more than a published bound of pre-session traffic, keep the newest rather than the oldest, report each drop as a coded entry that names itself, and hold nothing at all once the socket is gone or the session has failed

  Background:
    Given the REAL terminal WebSocket route served on 127.0.0.1, started the way `test/terminal-ws.test.mjs` already starts it
    And an injected PATH lookup reporting the chosen provider's binary present, unless a scenario says otherwise
    And an injected spawn returning a stub PTY that RECORDS every `resize(cols, rows)`, `write(bytes)` and `kill()` in call order
    And that spawn is held open by the harness until the scenario releases it, so every frame below arrives before the session exists
    And a recording degrade sink injected through `degrade.mjs`'s test seam, its per-code throttle cleared, so each scenario's entry count is its own
    And `the ceiling` below is read from the value the server publishes for its pre-session bound, never retyped as a number in this file

  # HEADLINE. Bounded, and newest-wins — ADR-008's reason stated as the litmus that
  # survives every flood size: whatever else is lost, the geometry the PTY ends at is
  # the LAST one the client asked for.
  Scenario Outline: a pre-session flood is bounded, and it is the NEWEST frames that survive
    Given a client that sends <sent> frames before the session exists, each carrying its own sequence number, the last of them a resize to 111×11
    When the harness releases the spawn and the queue drains
    Then the stub PTY records no more than `the ceiling` calls
    And the calls it records are <what survives>, in the order the client sent them
    And the PTY's final geometry is 111 × 11 — the newest resize is the true one at every flood size
    And the server is still listening and still answers `GET /api/work/list` with 200

    Examples:
      | case                                                   | sent                | what survives                                    |
      | an ordinary dock's burst — a fit and one typed command | 2                   | both, nothing dropped                            |
      | one frame under the ceiling                            | the ceiling minus 1 | all of them, nothing dropped                     |
      | exactly at the ceiling                                 | the ceiling         | all of them, nothing dropped                     |
      | one frame over                                         | the ceiling plus 1  | the newest `ceiling` — the oldest 1 is gone      |
      | a determined flood                                     | 10 × the ceiling    | the newest `ceiling` — every older one is gone   |
    # ROW 1 IS A FLOOR, NOT AN EXAMPLE. The real client sends a resize on open and then
    # types its command as ordinary input on the same clock, so a ceiling that drops
    # either has broken the ordinary session to fix the rare one. Rows 4 and 5 are the
    # drop-OLDEST proof: a queue that dropped the newest instead would keep the
    # sequence numbers 1..ceiling and leave the PTY at whatever geometry came first.

  # SIZE IS THE OTHER DIMENSION, and it is the one a frame-count ceiling misses. The
  # server's `WebSocketServer` is constructed with `{ noServer: true }` alone
  # (terminal-ws.mjs:113) — no `maxPayload` of its own — so a single pre-session frame
  # may be as large as `ws`'s own default permits, and 8 of those is 8 × that.
  Scenario Outline: a few enormous frames cannot buy what many small ones cannot — the bound holds in bytes as well as in count
    Given a client that sends <frames> pre-session frames of <each> before the session exists
    When the harness releases the spawn and the queue drains
    Then the total bytes the stub PTY receives from the pre-session window is no more than the published bound
    And <what the PTY receives>
    And every dropped frame is reported as scenario 3 requires
    And the server is still listening and still answers `GET /api/work/list` with 200

    Examples:
      | case                                    | frames           | each      | what the PTY receives                                    |
      | many small frames                       | 10 × the ceiling | 8 bytes   | the newest frames, within the bound                      |
      | few huge frames                         | 8                | 1 MiB     | the newest frames whose bytes fit within the bound       |
      | one frame larger than the whole bound   | 1                | 8 MiB     | nothing — an unholdable frame is dropped, never retained |
    # QA NOTE, ROUTED RATHER THAN RESOLVED HERE: if the build expresses its ceiling ONLY
    # as a frame count, rows 2 and 3 are the evidence that "cannot hold unbounded
    # memory" is not yet true, and the fix is a byte bound — not a relaxed row. Row 3
    # also settles the degenerate case out loud: a queue that made an exception for the
    # single frame it could not hold would have no bound at all.

  # THE DROP IS NAMED, NOT SILENT — the story's whole second half. The code matters as
  # much as the entry: `reportDegrade` throttles per CODE for 5 seconds (degrade.mjs:13,
  # :30-33), so an overflow sharing the module's generic `terminal-ws` code could be
  # swallowed entirely by an unrelated guarded catch in the same window, which is the
  # silence this scenario exists to forbid.
  Scenario: the overflow is a named, countable event — never a silent truncation and never a failed session
    Given a client that floods the pre-session window past the ceiling
    When the harness releases the spawn and the queue drains
    Then the degrade sink holds at least one coded entry for the drop
    And that entry's code names the pre-session queue overflow, and is DISTINCT from the code the module's existing guarded catches report — so a resize that failed on a dead PTY and a flooded queue are never the same line
    And the entry names how many frames were dropped — a number a reader can act on, never a bare "dropped"
    And the sink holds ONE entry for that burst, not one per dropped frame
    And the client receives NO `{type:"error"}` control frame for the overflow — a client that talks too fast is not a failed session
    And the session still spawns and still streams the PTY's output afterwards

  # THE SOCKET CLOSES FIRST. Nothing queued may reach anything, and nothing may be left
  # running behind it — see the pre-existing leak named in this file's header: today
  # `handleConnection` runs on to spawn a PTY for a socket that is already gone, and
  # the `close` listener that would kill it is registered after `close` has fired.
  @bug
  Scenario Outline: a socket that closes before the session is live discards its queue and leaves nothing running
    Given a client that floods the pre-session window and then closes the socket <when>
    When the harness releases the spawn
    Then the stub PTY records zero resize calls and zero write calls — not one queued frame is applied after the socket is gone
    And no PTY is left running for that socket: either none was spawned, or the one that was records a `kill()` call
    And the client received no frame after its close
    And the server is still listening and still answers `GET /api/work/list` with 200
    And repeating that open-flood-close cycle fifty times leaves the recorded resize and write count at zero, no PTY running, and the server still answering 200

    Examples:
      | case                                                 | when                              |
      | closed the same tick it opened, one resize sent      | immediately after sending         |
      | closed while the workspace config is still loading   | before `loadWorkspace` resolves   |
      | closed while the folder-trust pre-write runs         | before `trustCwd` resolves        |
      | closed while the PTY is spawning                     | before the spawn resolves         |
    # THE FIFTY-CYCLE LINE IS THE "LEAKS NOTHING" LITMUS THAT A BLACK-BOX LANE CAN
    # ACTUALLY CHECK: a retained queue or an orphaned PTY shows up as calls recorded on
    # a stub nobody is holding, or as a server that has stopped answering. It is
    # deliberately not a heap measurement — that is white-box and flaky.

  # THE ERROR PATHS ARE UNCHANGED (ADR-008, and m03/ADR-003's honest degrade). A queued
  # flood must not delay, suppress, reword or replay anything: the operator sees exactly
  # the error frame they would have seen with an empty queue.
  Scenario Outline: a session that fails to spawn discards its queue and the client still receives the error control-frame it would have received anyway
    Given a client that floods the pre-session window before the failure is reached
    When the session fails because <failure>
    Then the client receives exactly one `{type:"error"}` control frame and the socket then closes
    And that frame's message names <names> and is byte-identical to the message the same failure produces with NO frames queued
    And no `{type:"exit"}` frame fakes a finished run
    And no queued frame is applied to anything — no stub PTY records a resize or a write for that socket
    And a second connection opened afterwards, sending nothing before its own session is live, gets a PTY that records only its own later frames — the failed socket's queue is inherited by nobody
    And the server is still listening and still answers `GET /api/work/list` with 200

    Examples:
      | case                                                   | failure                                                 | names                                                |
      | an unrecognised provider id                            | the provider id is not one of claude / codex / gemini   | the unknown provider                                 |
      | a chosen provider whose binary is absent from PATH     | the binary cannot be resolved on PATH                   | the provider and what to do about it                 |
      | the binary vanishes between the check and the spawn    | the spawn itself throws                                 | the provider and that its CLI failed to start        |
    # ROWS 1 AND 2 RETURN BEFORE ANY SPAWN, so "no PTY records anything" is trivially
    # true for them and the load-bearing assertions there are the byte-identical message
    # and the non-inheriting second connection. Row 3 is the one where a PTY handle is
    # attempted and the queue must still die with the socket.

  # THE CEILING IS A PROPERTY OF THE PRE-SESSION WINDOW, NOT OF THE SESSION. A fix that
  # left every later frame flowing through the bounded buffer would turn a startup
  # safeguard into a permanent, lossy throttle on the operator's own typing.
  Scenario: the ceiling applies only to the pre-session window — once live, nothing is queued and nothing is dropped
    Given a session whose spawn has been released and whose queue has drained
    When the client sends ten times the ceiling in frames, one at a time, the last of them a resize to 137×43
    Then the stub PTY records every one of them, in the order they were sent — none dropped
    And the degrade sink holds no overflow entry for that session
    And the PTY's final geometry is 137 × 43
    And the server is still listening and still answers `GET /api/work/list` with 200
