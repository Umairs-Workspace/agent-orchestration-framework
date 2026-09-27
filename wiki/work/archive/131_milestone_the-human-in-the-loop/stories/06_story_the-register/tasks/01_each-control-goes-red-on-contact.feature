@executable @cli @work @validate
Feature: each control goes red on contact — the named mutation reds exactly that control with the message the register names, and the probe is recorded

  ARCHITECTURE `## Fitness functions` (each row's `Red probe:` and `Non-vacuous:` clauses) and
  VERIFICATION `## Fitness functions`. A guard that passes because it "found nothing" looks the
  same as a broken guard, and only a red probe tells them apart. For each control:
  - apply the named mutation to a scratch copy of the subject, never committed;
  - run the control, which reds with a message carrying the register's clause, and no case of
    another id in the three files reds on it;
  - revert the mutation;
  - write the probe (what was changed, the message observed) into that control's
    `VERIFICATION.md` register row, replacing its `—`.
  After that `aof work doctor 131` reports no `verification-missing-red-probe` and, with the files
  on disk, no `control-unresolved`.

  RULINGS (refine, 2026-09-25, solo — carried from 130/05's ratified rulings, which hold here
  unchanged):
  (1) The register names each probe's MUTATION and the invariant clause it breaks, never an
      assertion string. `reds on` below quotes that clause, the builder's assertion message
      contains those words, and VERIFICATION's `red probe` cell pastes the observed message.
  (2) The register's probes are the rows, one per probe. PLAN.md's list is advisory.
  (3) A non-vacuity probe mutates the CONTROL's own needle or root in scratch, which is the only
      way to make a sweep find nothing. It reds on the register's `Non-vacuous:` clause, or on the
      `exactly N` / `at least N` count a control with no such clause carries.
  (4) A standing control OUTSIDE the three files may also red on a probe (for example
      `acd-session-driver-single-home` on FF-13102's re-inlined scan). Record it beside the probe;
      it is not a fault.

  Background:
    Given the delivered tree with the three arch files landed, under an isolated `AOF_GLOBAL_HOME`
    And each probe is applied in a scratch worktree or reverted with `git checkout -- <file>` before the next

  Scenario Outline: the named mutation reds exactly its control
    Given <mutation>
    When `node scripts/test.mjs --only test/arch/loop/<file>` runs
    Then a case named `arch/131 <id>` FAILS with a message containing <reds on>
    And no case of another id in the three files reds on it
    And after the mutation is reverted the case passes again

    Examples:
      | id       | file                                       | mutation                                                                                                   | reds on                                                                                                  |
      | FF-13101 | `acd-loop-ask-single-home.test.mjs`        | `path.join(globalMeshPaths().meshRoot, "loop-asks", id)` spelled in `src/commands/list.mjs`                 | "loop-asks appears only in src/loop/ask-request.mjs", naming `src/commands/list.mjs`                     |
      | FF-13101 | `acd-loop-ask-single-home.test.mjs`        | non-vacuity: the control's resolved-specifier needle for `ask-request.mjs` misspelled so zero importers resolve | "the sweep finds the module and at least three importers"                                              |
      | FF-13102 | `acd-loop-ask-single-home.test.mjs`        | the transcript `stop_reason` scan re-inlined in `src/agent-session-driver.mjs`                              | "no other src/** module both JSON.parses transcript lines and reads stop_reason", naming the driver      |
      | FF-13103 | `acd-loop-ask-single-home.test.mjs`        | the waiting-ask skip (`if (openLastAsk(run.asks) != null) continue;`) dropped from `staleRunningRuns` in `src/run-store.mjs` | "leaves it byte-unchanged"                                                               |
      | FF-13104 | `acd-loop-ask-waits-in-place.test.mjs`     | the `drive-answer-not-own` refusal in `src/commands/drive.mjs` made to accept a foreign session              | "refuses drive-answer-not-own before any mint or spawn"                                                  |
      | FF-13105 | `acd-loop-ask-waits-in-place.test.mjs`     | the old `haltDecision("session-needs-input", …)` returned at `wave.mjs`'s needs-input branch               | "reaches haltDecision only inside ask.mjs's parkedHalt", naming `src/loop/wave.mjs`                      |
      | FF-13106 | `acd-loop-ask-reaches-every-face.test.mjs` | the webhook URL interpolated into the failure degrade in `src/notify/notify.mjs`                           | "no degrade message contains the URL"                                                                    |
      | FF-13107 | `acd-loop-ask-reaches-every-face.test.mjs` | a seventh `notify(` call added in `src/loop/wave.mjs`                                                       | "is one of the six sites in ADR-005 §4", naming `src/loop/wave.mjs`                                      |
      | FF-13107 | `acd-loop-ask-reaches-every-face.test.mjs` | non-vacuity: the control's `notify(` needle misspelled so zero sites are found                              | "the sweep finds six sites"                                                                              |
      | FF-13108 | `acd-loop-ask-reaches-every-face.test.mjs` | a second `formatElapsed` defined in `ui/src/board/`                                                         | "formatElapsed is defined in no module but src/notify/form.mjs", naming the `ui/src/board/` file         |
      | FF-13109 | `acd-loop-ask-reaches-every-face.test.mjs` | the resync door's `readJsonBody(` moved above its `admitWriteRequest(` in `src/board-ui.mjs`                | "every POST branch calls admitWriteRequest( before readJsonBody(", naming `/api/work/resync`             |

  Scenario: a probe that leaves its control green is a vacuous guard, not a pass
    Given a mutation above applied and the control still green
    Then the control is reworked in this story until the probe reds, its register row keeps its `—`, and the story does not close on it
    And a sweep observed walking zero modules and passing is the same finding, whatever its assertion says

  Scenario: the register records every probe and doctor is clean
    When every probe above has been run and reverted
    Then `wiki/work/131_milestone_the-human-in-the-loop/VERIFICATION.md`'s fitness register carries, for each of the nine ids, a `result` of `green` and a `red probe` cell naming the mutation and the observed message — no `—` and no `pending — 131/06` remains
    And each of the nine rows in `ARCHITECTURE.md`'s `## Fitness functions` names its landed file with no `pending` token left in its entry
    And `aof work doctor 131` reports no `verification-missing-red-probe` and no `control-unresolved`
    And `git status --short` shows no modified subject file — every mutation was reverted
