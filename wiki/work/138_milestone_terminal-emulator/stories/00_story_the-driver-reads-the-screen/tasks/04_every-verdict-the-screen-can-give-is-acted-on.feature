@executable @cli @work @work-stream
Feature: every verdict the screen can give is acted on — consent answers once, blocked stops by name within a frame, and the provider wait is read from the screen

  ADR-003 §1, §4, §5 and §6, ADR-006. `src/terminal/claude-screens.mjs` exports `CLAUDE_SCREENS`,
  an ordered, frozen array of `{ id, recognise(snapshot), action, option? }`, pure over a snapshot,
  whose one import is `loop-bounds.mjs`. `action` is `type`, `consent`, `fail` or `wait`. This
  story lands entry zero, `ready` (`type`), and `usage-limit` (`wait`); story 01 adds the rest and
  never edits the driver, so every action is wired and proved here through an injected registry.

  RULINGS (PO, 2026-09-27). (1) The door runs the registry over every settled frame from spawn to
  settle. `wait` entries are read on every frame on their own. Among the others, the first entry in
  registry order that recognises the frame decides that frame's verdict, and a frame no entry
  claims gives none. (2) A `consent` entry's verdict is `consent`, carrying one Enter (`\r`), only
  when the row holding the menu's `❯` contains the entry's `option`; otherwise the verdict is
  `blocked` with the entry's id. The driver never sends an arrow key. (3) The driver answers a
  `consent` verdict with its keys as one write of their own, only while the directive is untyped
  and only once per id. A `consent` verdict for an id already answered is ignored until a frame
  arrives on which that entry does not recognise; after that, the entry recognising again is a
  return, and a return is `blocked`. A `consent` verdict after the directive was typed is
  `blocked`. (4) A `blocked` verdict stops the session `{ outcome: "failed", failureReason:
  "blocked_screen", screen: { id } }` through the same stop bracket as every other stop, on that
  frame: no deadline is waited for and nothing more is typed. The resolved result carries `screen`
  beside `sessionId`. (5) `RETRYABLE_REASONS` is not edited; `isRetryable("blocked_screen")` is
  false by the classifier's fail-closed rule. (6) The provider wait keeps 129/06 F-58's rule: the
  instant the wait was last seen is the last settled frame on which a `wait` entry recognised, and
  no timer refreshes it. While no heartbeat is newer than that instant the heartbeat deadline is
  suspended; start-to-close still bounds the attempt. `provider-wait` is reported once, its detail
  the matched text cut to 120 characters. (7) `usage-limit` recognises a frame when any row matches
  `PROVIDER_WAIT_RE`, imported from `loop-bounds.mjs`, where the pattern keeps its home.

  RULINGS (QA, 2026-09-27). (1) The injected registry is `ready` followed by three test entries:
  `test-consent` (`consent`, `option` `Yes, I trust this folder`), `test-fail` (`fail`) and the
  real `usage-limit`. Each test entry recognises a frame by a marker row the case draws on the
  alternate buffer, `TEST-CONSENT` or `TEST-FAIL`, with the menu row drawn as the case says.
  (2) "Within a frame" is measured from the emit to the `stop-requested` breadcrumb, under a
  1,000 ms wall limit. (3) The suite asserts nothing about which entries the shipped registry holds
  beyond entry zero, `usage-limit` and the shape, so story 01's entries do not redden it.

  Background:
    Given a scripted PTY the case drives by emitting chunks, and a real door over a real 80×24 model
    And a real launch with `commandDelayMs` 10 and `readyCapMs` 5000
    And `READY` is the chunk list of `test/fixtures/claude-screens/ready.json`

  Scenario: the shipped registry has the shape the door relies on
    When `CLAUDE_SCREENS` is read
    Then it is frozen, each entry is frozen, entry zero's `id` is `ready` with `action` `type`, the ids are unique, and one entry is `usage-limit` with `action` `wait`
    And every `action` is one of `type`, `consent`, `fail` and `wait`, and every `consent` entry names an `option`

  Scenario: a consent is answered with one Enter, and then the directive is typed on the box
    Given the injected registry
    When the `TEST-CONSENT` frame is emitted with its menu row `❯ 1. Yes, I trust this folder`, and after the Enter the `READY` frame
    Then the writes are exactly `\r`, then the directive's paste, then its Enter, in that order

  Scenario: a consent frame repainted before claude takes the Enter is not a return
    Given the injected registry
    When the `TEST-CONSENT` frame is emitted, answered, and emitted again unchanged before any other frame, and then `READY`
    Then exactly one `\r` precedes the paste, and the session is not stopped

  Scenario Outline: a consent that cannot be given safely is a named failure
    Given the injected registry
    When <sequence>
    Then the drive resolves `{ outcome: "failed", failureReason: "blocked_screen", screen: { id: "test-consent" } }` with <writes> before the stop

    Examples:
      | sequence                                                                                                  | writes                         |
      | the `TEST-CONSENT` frame is emitted with its menu row `❯ 2. No, exit`                                    | no write at all                |
      | `TEST-CONSENT` is answered, a blank alternate frame follows, then `TEST-CONSENT` returns                  | exactly one `\r`               |
      | `READY` is emitted, the paste and its Enter are written, then `TEST-CONSENT` is emitted                   | the paste and its Enter only   |

  Scenario Outline: a blocking screen stops the session by name within a frame, whatever the phase
    Given the injected registry
    When the `TEST-FAIL` frame is emitted <when>
    Then within 1,000 ms `stop-requested` is recorded with `failureReason` `blocked_screen`, the PTY is killed through the stop bracket, and nothing more is written
    And the drive resolves `{ outcome: "failed", failureReason: "blocked_screen", screen: { id: "test-fail" } }` with the session id it had

    Examples:
      | when                                                                  |
      | before any ready frame                                                |
      | after the directive was typed, while the session-id watch is pending  |
      | after the session id was captured                                     |

  Scenario: a blocked session is not retried
    When `isRetryable("blocked_screen")` is asked of `src/run-store.mjs`
    Then it answers false, and `RETRYABLE_REASONS` still holds exactly `runtime_offline`, `timeout` and `session_limit`

  Scenario Outline: the provider wait is read from the screen
    Given the shipped registry
    When `<line>` is drawn on the alternate buffer
    Then `provider-wait` is recorded <reported>

    Examples:
      | line                                                          | reported                                                           |
      | Usage limit reached · continuing automatically at 1:40pm      | once, its detail beginning `Usage limit reached`                   |
      | You've hit your session limit · resets 1:40pm (Europe/London) | once, its detail beginning `You've hit your session limit`         |
      | Refine of 127/03 · Archive is a move is complete.             | never                                                              |

  Scenario: a wait on screen suspends the heartbeat until a newer heartbeat, and start-to-close still bounds it
    Given the driver suite's two 129/06 F-58 provider-wait cases in `test/work/four-deadlines.test.mjs`
    When they run with the real door over a real model
    Then their assertions hold unchanged: nothing killed while the wait is newest, killed `timeout` after a newer heartbeat, and bounded by start-to-close

  Scenario: a wait still on screen is not refreshed by the clock
    Given `usage-limit.json` has been emitted once, and a heartbeat reader answering an instant 50 ms after that emit
    And `deadlinePolicy` is `{ startToCloseMs: 2000, heartbeatMs: 30, startupGraceMs: 5 }`
    When no further chunk arrives
    Then the session is stopped `failed / timeout` by the heartbeat rule before start-to-close, though the line is still on screen
