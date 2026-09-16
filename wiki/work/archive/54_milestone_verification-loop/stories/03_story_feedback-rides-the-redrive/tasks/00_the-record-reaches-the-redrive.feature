@executable @cli @work @work-stream
Feature: The grade rides the transport 70 already built, and lands durably on the run it re-drove

  **A premise of this story was re-measured at contract time and half of it is now false, in the
  good direction.** The story was written against a shell that dropped its gate payload three ways:
  a bare `continue` past the findings, a re-entry carrying no gate context, and `actShape()`
  stripping a `findings` key. **Milestone 70/04 landed on this branch while 54 was being refined**
  (`54ff074`, *"Warm the review fix loop"*): `src/commands/loop.mjs:614-623` no longer bare-`continue`s
  — it sets `pendingFixes` with `{ buildRun, currentNode, findings, changeUnderReview }`, `drivePhase`
  hands it to the driver as `ctx.loopDrive.fix` (`:335-346`), and `composeFixInput`
  (`src/commands/drive.mjs:88-96`) renders it under a `## REVIEW FINDINGS` heading.

  So the declared cross-milestone overlap resolved in the direction ADR-008 §5 predicted and named:
  **54 supplies the records, 70 carries them** — and 70 arrived first, so this story **rebases onto
  its transport rather than building a second one**. That is not a smaller story; it is the same
  story with its riskiest half already paid for. What is still missing is everything 54 owns: the
  grade has no way onto that payload, and nothing durable records what the grade said.

  Two things land here. **(1) The grade's failures ride the existing `fix` payload** — the array
  `composeFixInput` already renders — each entry naming its producer, so a maker re-driven after a
  red rubric starts from *which cases failed and what they said* instead of rediscovering it. No
  second transport, no widened driver input schema, no third meaning for `brief` (`70/ADR-001` named
  that collision). **(2) The durable record is `brief.grade` on the run the grade RE-DROVE**, written
  through the seam that already writes `brief.loop` — `transitionRunStart`'s `edge.brief`, at
  `src/commands/loop.mjs:330`, `:513` and `:560`.

  `src/run-store.mjs` (46 dependents) and `src/effects/run-transitions.mjs` (17) are passed
  **through**, not edited: the store never reads the grade and never branches on it, so it gains no
  key, no state and no transition. `68/ADR-009`'s rule and `53/ADR-004`'s "no new persistence code at
  all" are both kept, and `m20/ADR-001`'s objection to the opaque bag does not reach a fact nobody
  branches on.

  ADR-008 §2, §3, §5; `70/04`'s landed payload; FF-5409.

  Scenario: a failing grade re-drives the build carrying what failed
    Given a story whose build phase completed
    And a declared rubric whose grade returns `fail` with two failing cases
    When the loop re-drives `continue` for that story
    Then the re-drive's fix payload carries both failing cases
    And each entry carries the case name and the message the runner emitted
    And the payload is the one the shell already builds, not a second one

  Scenario: the grade's entries name their producer beside the validate findings
    Given a story whose gate produced one validate finding and one failing case
    When the loop re-drives `continue` for that story
    Then the payload carries both
    And each entry names which gate produced it
    And a reader can tell a validate finding from a graded case without parsing prose

  Scenario: the durable record is written through the seam that already writes the loop declaration
    Given a story whose grade returned `fail`
    When the loop starts the run that re-drives the build
    Then that run's brief carries the grade beside the loop declaration
    And the brief's loop declaration is unchanged
    And the run record gained no top-level key

  Scenario: the run record gains a brief entry and nothing else
    Given a loop that graded and re-drove
    When its run records are read back
    Then the grade is present only inside the run's brief
    And the record carries the same top-level fields it carries today
    And the run passed through the same lifecycle states it passes through today

  Scenario: the record is complete even when the warm payload degrades cold
    Given a story whose grade returned `fail`
    And a build run whose recorded session cannot be resumed on this node
    When the loop re-drives `continue` for that story
    Then the re-drive still carries the grade's failing cases
    And the durable record on the run is unchanged by the degradation

  Scenario: a passing grade puts nothing on a re-drive, because there is no re-drive
    Given a story whose grade returned `pass`
    When the loop reaches its gate block
    Then no fix payload is prepared for that story
    And the loop crosses to `verify`
    And the grade is still recorded on the run that produced it

  Scenario: an unconfigured repository's re-drive is byte-identical to today's
    Given a repository that declares no `work.rubric`
    And a story whose validate gate reports one finding
    When the loop re-drives `continue` for that story
    Then the fix payload carries exactly the validate findings and nothing else
    And no grade key is written to the run's brief
    And the three shipped loop suites observe the same payload they observe today
