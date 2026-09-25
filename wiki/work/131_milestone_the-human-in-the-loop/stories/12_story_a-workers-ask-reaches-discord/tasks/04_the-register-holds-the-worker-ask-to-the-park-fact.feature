@executable @cli @work @work-stream
Feature: the register holds a worker's ask to the park fact and to one post per park — FF-13114 landed, FF-13107 amended

  ADR-010. FF-13114 is appended to `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs`, and
  FF-13107's site table there moves from six sites to seven. Both land exactly as the register rows
  state them. Both register entries lose `pending (12)`, and each gets a red probe in
  `VERIFICATION.md`'s fitness register.

  RULINGS (QA, 2026-09-25). (1) FF-13107's sweep stays non-vacuous at seven, and names each site
  by file and event literal. (2) FF-13114's fixture applies one park fact twice through the real
  reactor and counts POSTs.

  Scenario: both controls are green on the built tree
    When `acd-loop-ask-reaches-every-face` runs under an isolated `AOF_GLOBAL_HOME`
    Then FF-13107 finds seven sites and is green, FF-13114 is green, and every other control in the file stays green

  Scenario Outline: each control reds on its probe
    Given <probe>
    When `acd-loop-ask-reaches-every-face` runs
    Then <control> is red and names <names>

    Examples:
      | probe                                                                   | control  | names                                  |
      | the reactor calls `announceWorkerAsk` without the edge check           | FF-13114 | the second POST                        |
      | `reportAssignmentSettled` puts `ask: null` on every payload             | FF-13114 | the `done` payload's key set           |
      | `resume.mjs` gains a second `notify(` call for the mesh leg             | FF-13107 | `src/commands/resume.mjs`              |
