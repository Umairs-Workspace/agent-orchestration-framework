@executable @cli @work @work-stream
Feature: `/status` and `/asks` read `work:list`, the same rows the board shows, in the shared form

  ADR-009 §5. Both commands dispatch `invoke("work:list", { mesh: true }, { workspace })` for
  each kept workspace. The render uses `src/notify/form.mjs`'s `headline`, `cost`, `accountLine`
  and `formatElapsed`, so a waiting row reads exactly as it reads on the terminal and in Discord's
  line 1.

  RULINGS (PO, 2026-09-25).
  (1) `/status` renders one section per workspace, headed by its project folder name. Each
  `in-progress` row gives its ref, its execution state and node when it has an execution, and, for
  a row with an `ask`, `waiting on you (<phase>, <elapsed>)`. A workspace with no in-progress row
  says `nothing in progress`.
  (2) `/asks` renders one line per row whose `ask.state` is `waiting` or `parked`, as
  `accountLine`, then a jump link to the ask's message when the index holds one for that ref.
  With no ask it says `no questions waiting`.
  (3) A dispatch that throws renders `could not read <workspace>: <code>` for that workspace alone.

  RULINGS (QA, 2026-09-25). The rows are fixtures handed back by the injected `invoke`. The
  elapsed values use a fixed `now`.

  Scenario: /asks lists a waiting and a parked ask with their links
    Given `work:list` answers a row `131/03` with a waiting ask (build, asked 12 minutes ago) and a row `131/05` with a parked ask
    And the index holds message "900000000000000001" in channel "111111111111111111" of guild "900000000000000000" for `131/03`
    When `/asks` runs
    Then line 1 is `accountLine` for `131/03`, followed by `https://discord.com/channels/900000000000000000/111111111111111111/900000000000000001`
    And the next line is `accountLine` for `131/05`, with no link

  Scenario Outline: /status per row
    Given `work:list` answers <row>
    When `/status` runs
    Then that row renders as <line>

    Examples:
      | row                                                                    | line                                                 |
      | `131/09` in-progress with no execution and no ask                      | `131/09`                                             |
      | `131/10` in-progress, execution running on node "node-2976"            | `131/10 — running · node-2976`                       |
      | `131/03` in-progress with a waiting ask (build, 12m)                   | `131/03 — waiting on you (build, 12m)`               |
      | `131/01` done                                                          | no line                                              |

  Scenario: nothing to show
    Given `work:list` answers no in-progress row and no ask
    When `/status` and `/asks` run
    Then they reply `nothing in progress` and `no questions waiting`

  Scenario: one workspace's failure does not hide another
    Given two kept workspaces, where `work:list` throws code `workspace-load-failed` for the first
    When `/status` runs
    Then the first section reads `could not read <first>: workspace-load-failed`, and the second renders its rows
