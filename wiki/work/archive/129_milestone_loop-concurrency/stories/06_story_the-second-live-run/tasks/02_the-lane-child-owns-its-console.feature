@executable @cli @work @bug @finding-F-63
Feature: the lane child owns its console — a console-scoped kill inside a lane never reaches the loop

  Loop death #5 (2026-09-15 19:35Z, `VERIFICATION.md` `F-63`): the loop died unbracketed — no
  exception, no signal, no exit event — seconds after lane 127/04's session was killed. The
  next lane's child named the mechanism on its stderr: `node-pty/lib/conpty_console_list_agent.js
  … Error: AttachConsole failed`. node-pty's ConPTY `kill()` spawns a console-list agent that
  attaches to a console and terminates every process in that console's list; a child spawned
  with piped stdio on win32 still ATTACHES to its parent's console, so when that agent reached
  the loop's console the loop was in the list (death #4 on 2026-09-13 was the same agent from
  inside the loop; lanes 03 and 04 survived only because the agent was launched through
  `process.execPath` — `aof.exe` — and printed aof's usage instead of running). The seam gains
  `ownConsole`: on win32 the child is spawned `detached` — its own hidden console, no console
  shared with the caller — and `src/loop/child-drive.mjs` asks for it. Stdio pipes (the
  document, stderr, the stdin cancel channel) are handles, not the console, and are untouched;
  the deadline, grace and abort kills still land by pid. Off win32 the option is a no-op, and a
  caller passing nothing is byte-identical (129/02's four-key row still holds).

  Background:
    Given `runBounded` over an injected `spawnChild` double

  Scenario: ownConsole true spawns the child detached on win32 and adds nothing elsewhere
    When `runBounded` is asked with `ownConsole: true` and `stdin: "pipe"`
    Then on win32 the spawn options carry `detached: true` and exactly the keys `cwd`, `detached`, `env`, `stdio`, `windowsHide`
    And off win32 the option bag is exactly the four keys of 129/02
    And `stdio` is `["pipe", "pipe", "pipe"]` and `windowsHide` is true either way

  Scenario Outline: a caller passing no ownConsole, or false, is byte-identical
    When `runBounded` is asked with <extra>
    Then the spawn options are exactly the keys `cwd`, `env`, `stdio`, `windowsHide`

    Examples:
      | extra                  |
      | nothing                |
      | `ownConsole: false`    |

  Scenario: the lane child asks for its own console
    When `spawnLaneDrive` runs over the recording double
    Then on win32 the recorded spawn options carry `detached: true`, and off win32 no `detached` key
    And the stdio pipes are `["pipe", "pipe", "pipe"]` as before
    And 129/02's argument-vector rows admit exactly this one added key on win32 and nothing else
