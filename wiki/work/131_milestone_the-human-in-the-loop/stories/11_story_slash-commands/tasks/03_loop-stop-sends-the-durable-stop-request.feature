@executable @cli @work @work-stream
Feature: `/loop stop` sends 130's durable stop request and says which level it reached

  ADR-009 §5. `/loop stop scope:<ref>` dispatches `invoke("work:loop", { scope, stop: true }, {
  workspace })`. That is 130's verb, unchanged: the first request drains, a second cancels the
  in-flight session, and a loop that is not live is marked honoured at once. The bot reply is
  in-channel and names who asked.

  RULINGS (PO, 2026-09-25). (1) The reply reads `<@user> asked <scope> to stop — <level
  sentence>`, where the level sentence is 130's result: `draining (a second /loop stop cancels
  the in-flight session)`, `cancelling the in-flight session`, or `not running — marked
  stopped; /loop resume clears it`. (2) The verb answers a refusal as a value (`{ ok: false, code,
  message }`, 130's `STOP_REFUSALS`). It is shown with its code and message, and nothing is
  retried. (3) The stop record's `by` stays 130's `{ node, pid }`, which is the daemon's. The
  Discord user is named in the in-channel reply only, and no input key is added to `work:loop` for
  it.

  RULINGS (developer, feasibility, 2026-09-25). `work:loop` with `stop: true` returns before any
  launch branch, which 130/ADR-002 established. So an in-process invoke in the daemon starts no
  loop. The test asserts that the injected launch seam was never reached.

  Scenario Outline: the reply follows the level reached
    Given the scope `131` whose loop is <state>
    When an allowed user "umami" runs `/loop stop scope:131`
    Then the stop request for its declaration reads <request>, and the in-channel reply is `@umami asked 131 to stop — <sentence>`

    Examples:
      | state                                 | request                  | sentence                                                         |
      | live, with no stop request            | level 1, `requested`     | draining (a second /loop stop cancels the in-flight session)    |
      | live, with a level 1 request          | level 2, `requested`     | cancelling the in-flight session                                |
      | not live                              | `honoured`               | not running — marked stopped; /loop resume clears it            |

  Scenario: the stop starts nothing in the daemon
    When `/loop stop scope:131` is dispatched in-process
    Then no loop launch seam was reached and no child process was spawned

  Scenario: a refusal is shown, not retried
    Given `work:loop` answers `{ ok: false, code: "loop-stop-no-declaration" }`
    When `/loop stop scope:999` runs
    Then the reply names `loop-stop-no-declaration` and its message, and `invoke` was called exactly once
