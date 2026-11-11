@executable @docs @assets @work-stream
Feature: a UAT session sweeps once and a stopped gate resumes

  WHY. A UAT session's prose tells it to re-run the suite "across the accepted milestones", and the
  only repair `verify.md` gives a `not-finished` gate is to run it again. Both are now whole-tree
  repeats the code can avoid. A session runs one `aof test --scope all`, which is answered from the
  newest gate run when nothing has changed. A stopped gate is resumed (ADR-005, ADR-006 §1).
  The cases read the bundle sources and the rendered templates.

  Rule: R3 · A UAT session sweeps once, and a stopped gate resumes

    Scenario: E5 · verify tells a UAT session to sweep once
      When the UAT paragraph near the head of `packages/core/assets/commands/verify.md` is read
      Then it says the session runs one `aof test --scope all`
      And it says that run is answered from the newest gate run when the content has not changed
      And it does not say to run each accepted milestone's suite

    Scenario: E6 · a not-finished gate is resumed
      When the regression-gate bullets under `verify.md`'s `<progress_tracking>` are read
      Then the repair for a `not-finished` row is `aof work regression-gate <NN> --resume`
      And they say a resume refuses when the content changed, so a fresh gate run is the repair then

    Scenario Outline: E7 · the UAT templates and command say one sweep
      When `<file>` is read
      Then it does not say `across the accepted milestones` of the sweep
      And its sweep line names one whole-tree `aof test --scope all` for the session

      Examples:
        | file                                            |
        | packages/core/assets/templates/uat/SESSION.md   |
        | packages/core/assets/templates/uat/STATE.md     |
        | packages/core/assets/commands/add-uat.md        |

    Scenario: the renders match their sources
      When `aof work update` has run
      Then `.claude/commands/aof/verify.md`, `.claude/commands/aof/add-uat.md` and `.aof/templates/work/uat/SESSION.md` carry the edited text
      And `aof work update` reports no drift
