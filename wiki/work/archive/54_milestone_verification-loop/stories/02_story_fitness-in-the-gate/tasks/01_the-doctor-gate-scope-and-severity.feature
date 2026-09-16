@executable @cli @work @work-stream
Feature: The doctor gate admits five derived codes at error, at the driven item's own scope

  This is the rung that changes behaviour, so every one of its edges is ruled rather than
  discovered. Three facts were measured at refine and each one closes a way this gate could have
  gone wrong.

  **Severity.** `aof work doctor --json` returns **397 findings stream-wide and 396 of them are
  `warn`** — dominated by `mtime-ahead-of-updated` (243) and `doc-over-budget` (69) on `done` items.
  A gate that read warns would block every loop in this repository on a numbering artefact.
  `severityFor` (`src/acceptance-horizon.mjs:118-120`) is the horizon's rendering — `error` inside it
  (the item is open, which is exactly what a loop drives) and `warn` outside — and this gate
  **inherits** that mapping rather than re-deriving or modifying it.

  **Scope.** The gate invokes `work:doctor` with the driven item's own scope, exactly as the shell
  already invokes `work:validate` at `src/commands/loop.mjs:597`. Without that, one un-authored
  register anywhere under `wiki/work` would stop every loop in the repository — the inherited-red
  pathology `70/ADR-007` refuses by name.

  **The admitted code set, and why it is a FILTER.** The decisive fact is neither severity nor the
  `pending` marker: `verify.md:130-132` makes the red-probe register an artefact the **verify phase
  itself authors**, and this gate sits at the entry to verify. Gating entry to verify on verify's own
  output is circular and unsatisfiable for every milestone, forever, however honest its register. So
  the admitted set is derived from `CONTROL_FINDING_CODES` (`src/work-doctor-controls.mjs:65-74`) by
  filter — minus its two `verification-*` members, minus `control-runner-unchecked` (warn by
  construction) — leaving five, each a fact about the item's **code**:

  `register-duplicate-id` · `register-dangling-citation` · `control-unresolved` ·
  `control-unregistered` · `staged-control`

  A filter, never a copy: a ninth control code cannot silently join or leave the gate. The obligation
  is not weakened but **moved** — from "before verify", where it could never be met, to "before
  accept", where it always can; the accepting item's gate (`70/ADR-007`) still reads the full error
  set, so a red probe is still demanded before acceptance and a `pending` marker is still
  inadmissible at `done`.

  Measured under this ruling: **0 of the 30 open items on this tree halt**. The first sweep reported
  the same zero for the wrong reason — `verificationGroup` consults the `pending` marker nowhere and
  `recordsARedProbe` tests shape not content, so sixteen unprobed controls read as probed. The honest
  number before the ruling was **26 errors across three milestones** (F-54-REFINE-1).

  ADR-007 §2, §2a-§2d; `66/ADR-002`'s horizon; FF-5410.

  Scenario: the gate is invoked at the driven item's own scope
    Given a loop driving story `54/02`
    When the doctor rung runs
    Then `work:doctor` is invoked with that story's own ref as its scope
    And it is not invoked stream-wide
    And a finding on any other item is absent from the gate's result

  Scenario: a sibling's debt cannot halt your loop
    Given a milestone elsewhere in the stream carrying an admitted error
    And a loop driving a story that carries none
    When the doctor rung runs
    Then the gate finds nothing
    And the loop proceeds to the next rung

  Scenario Outline: only errors gate, and the severity comes from the horizon
    Given a driven item carrying one finding of code <code> at severity <severity>
    When the doctor rung runs
    Then the gate admits the finding only when <gates> reads yes

    Examples: warns never gate, whatever they say
      | code                     | severity | gates |
      | control-unresolved       | error    | yes   |
      | control-unregistered     | error    | yes   |
      | staged-control           | error    | yes   |
      | register-duplicate-id    | error    | yes   |
      | register-dangling-citation | error  | yes   |
      | numbering-gap            | warn     | no    |
      | mtime-ahead-of-updated   | warn     | no    |
      | doc-over-budget          | warn     | no    |
      | control-runner-unchecked | warn     | no    |

  Scenario: a control carrying the pending marker is already a warn, so it does not gate
    Given a driven item whose fitness register declares a control that has not landed
    And that control's entry carries the `pending` token
    When the doctor rung runs
    Then the finding is reported at `warn`
    And the gate admits nothing
    And the loop proceeds to the next rung

  Scenario Outline: the two verification codes never gate, at any severity
    Given a driven item carrying one finding of code <code> at severity `error`
    When the doctor rung runs
    Then the gate admits nothing
    And the loop proceeds to the next rung
    And the same finding still renders at `error` on every other surface

    Examples: verify's own output cannot gate entry to verify
      | code                           |
      | verification-register-missing  |
      | verification-missing-red-probe |

  Scenario: the admitted set is derived by filter, never restated as a literal
    Given the frozen control finding code array
    When the gate's admitted set is resolved
    Then it is exactly that array minus its two `verification-` members and `control-runner-unchecked`
    And it is five codes
    And a code added to the frozen array is either admitted or excluded by the same filter, with no second list to edit

  Scenario: the gate never consults the Loop-Ready score
    Given a driven item whose doctor result carries a Loop-Ready score below its threshold
    And that item carries no admitted error
    When the doctor rung runs
    Then the gate admits nothing
    And the loop proceeds to the next rung
    And no gate decision read the Loop-Ready score

  Scenario: the horizon's own mapping is neither modified nor re-derived
    Given the severity mapping the acceptance horizon publishes
    When the doctor rung resolves a finding's severity
    Then it takes the severity the doctor already reported
    And it computes no severity of its own
    And a `done` item's identical finding is still reported at `warn`

  Scenario: an admitted error re-drives the build with the doctor's findings, and exhausts at the cap
    Given a story whose build phase completed
    And `work:validate` reports no finding for that story
    And `work:doctor` reports one admitted error for that story
    When the loop reaches its gate block
    Then the loop re-drives `continue` for that story
    And the re-drive carries the doctor finding
    And a cycle count that has reached the cap halts on `cap-exhausted` instead
    And no new stop id was minted for this rung
