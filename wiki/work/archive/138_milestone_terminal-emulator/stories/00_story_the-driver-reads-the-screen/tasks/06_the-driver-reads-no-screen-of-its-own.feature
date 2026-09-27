@executable @cli @work @work-stream
Feature: the driver reads no screen of its own — the byte readers leave it, the sentinel scan keeps one line, and FF-13801 holds the line

  ADR-001 §3 and §5, ADR-002 §4 and §6. The four byte readers (the readiness marker,
  `PROVIDER_WAIT_RE`, the parked-paste regex and `screenTail()`) and their helpers move out of
  `src/agent-session-driver.mjs` into the door, the byte gate verbatim. What stays in the driver is
  the one reader that is not the screen: the `NEEDS_INPUT` sentinel scan on fresh sessions, which
  keeps only the unterminated tail line and reads each completed line once, where today it
  re-splits the whole session's output on every chunk. FF-13801,
  `test/arch/terminal/acd-screen-has-one-reader.test.mjs`, lands with this story and is registered
  in `test/arch/terminal/index.mjs`.

  RULINGS (PO, 2026-09-27). (1) FF-13801 asserts three things over the live tree: `@xterm/headless`
  is imported (statically or by `import()`) by `src/terminal/screen.mjs` and by no other `src/**`
  module; the comment-stripped driver spells none of `ANSI_ESCAPE_RE`, `TUI_READY_MARKER`,
  `2004h`, `PARKED_PASTE_RE`, `PROVIDER_WAIT_RE`, `hasVisibleText` and `screenTail`; and no
  comment-stripped `src/**` module but `src/terminal/session-screen.mjs` spells `?2004h` or
  `?2004l`. (2) The control strips comments the way `acd-worker-driver-no-headless-print` does, and
  plants each spelling to prove it is not vacuous (the m03 self-check). (3) The sentinel's detection
  is unchanged: a sentinel is a completed line that trims to `NEEDS_INPUT`, never on a resumed
  session, and detected once, when its newline arrives. (4) The driver keeps no string that grows
  with the session: what it holds for the scan is the unterminated line, and the whole-session
  output string is gone. (5) The control's red probe is recorded in `VERIFICATION.md`'s fitness
  register: what was changed to make it fail, and the message observed.

  RULINGS (QA, 2026-09-27). (1) The sentinel's existing cases (the eight line shapes, the split
  across two chunks, the resumed session) run unchanged; the transcript suite is read, not written.
  (2) The bounded scan is proved by its
  cost, not by timing one chunk: a session printing 40,000 lines settles within 10 s, where a scan
  that re-reads the whole output on every chunk does 800 million line reads and cannot. The bound
  is ten times what the linear scan needs on this machine, so contention cannot fake a red.

  Scenario: the emulator has one importer
    When FF-13801 walks `src/**`
    Then `@xterm/headless` is named in an import, static or dynamic, by `src/terminal/screen.mjs` and by no other module

  Scenario: the driver spells no byte reader
    When FF-13801 reads the comment-stripped `src/agent-session-driver.mjs`
    Then it contains none of `ANSI_ESCAPE_RE`, `TUI_READY_MARKER`, `2004h`, `PARKED_PASTE_RE`, `PROVIDER_WAIT_RE`, `hasVisibleText` and `screenTail`

  Scenario: the byte gate's markers have one home
    When FF-13801 reads every comment-stripped `src/**` module
    Then only `src/terminal/session-screen.mjs` contains `?2004h` or `?2004l`

  Scenario Outline: each plant turns the control red, naming the file and the spelling
    Given a copy of the live sources with <plant>
    When FF-13801's detector is asked of that copy
    Then it reports one violation naming <file> and <spelling>

    Examples:
      | plant                                                                   | file                              | spelling          |
      | `import("@xterm/headless")` added to `src/loop-bounds.mjs`              | `src/loop-bounds.mjs`             | `@xterm/headless` |
      | `const hasVisibleText = 0;` added to the driver                         | `src/agent-session-driver.mjs`    | `hasVisibleText`  |
      | `PROVIDER_WAIT_RE` added to the driver's import from `loop-bounds.mjs`  | `src/agent-session-driver.mjs`    | `PROVIDER_WAIT_RE`|
      | the string `"\u001b[?2004h"` added to `src/terminal/screen.mjs`         | `src/terminal/screen.mjs`         | `?2004h`          |

  Scenario: a spelling inside a comment is not a violation
    Given a copy of the driver with `// TUI_READY_MARKER moved to the door` added as a line comment
    When FF-13801's detector is asked of that copy
    Then it reports no violation

  Scenario Outline: the sentinel is detected exactly as before
    When the case <case> in `<suite>` runs
    Then its assertions hold unchanged

    Examples:
      | case                                                                                       | suite                                                 |
      | the eight accumulated-output shapes, of which only the whole-line ones resolve needs-input | test/session/agent-session-driver-drives.test.mjs     |
      | a sentinel split across two chunks, detected once when the newline completes the line      | test/session/agent-session-driver-drives.test.mjs     |
      | F-131-17, a resumed session's redraw of its old `NEEDS_INPUT` line, which never stops it   | test/session/agent-session-driver-transcript.test.mjs |

  Scenario: a long session is scanned once
    Given a scripted PTY that emits `line <n>\r\n` for n from 1 to 40,000, one chunk each, and then exits 0
    When the drive is awaited
    Then it resolves `done` within 10 s

  Scenario: a sentinel after a long session is still found at once
    Given a scripted PTY that emits 40,000 lines, then `NEEDS_INPUT\r\n`, and does not exit
    When the drive is awaited
    Then it resolves `needs-input` within 10 s

  Scenario: the control is registered and green
    When `node scripts/test.mjs --only test/arch/terminal/acd-screen-has-one-reader.test.mjs` is run under an isolated `AOF_GLOBAL_HOME`
    Then it runs a non-zero number of cases and exits 0, and `VERIFICATION.md`'s FF-13801 row holds a red probe and the message it produced
    And FF-13801's row in `ARCHITECTURE.md`'s register no longer carries `pending`
