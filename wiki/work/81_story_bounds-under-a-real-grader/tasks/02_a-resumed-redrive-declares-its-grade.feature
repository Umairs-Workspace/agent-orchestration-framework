@executable @cli @work @work-stream
Feature: A re-drive the resume path reconstructed DECLARES that it carries no grade, and never invents one

  **THE GAP, AS 54/03 DECLARED IT** (`54/03/OUTCOME.md` § Gaps, *"The resume path never walks rung
  3"*): *"`brief.grade` is therefore not always present on a re-driven run: a loop resumed from a
  parked or stranded run re-drives with no grade on its brief, and 62, 63 and 78 consume `LoopState`
  without being told the key is conditional."* Its discharge condition offers two limbs — *"the
  resume block rebuilds `pendingFixes` with a `grade` key, or the absence is declared in
  `LoopState`'s contract for its three consumers."*

  **THIS TASK TAKES THE SECOND LIMB, AND THE FIRST IS REFUSED FOR THREE STATED REASONS.**

  **(1) Re-grading on resume would put a spawn where the cost ladder never priced one.**
  `54/ADR-007 §1`, as amended at 54/03's review, fixes rung 3's answer as taken **once per completed
  build**. A resume completes no build in that invocation; grading there would pay for a child
  process ahead of rung 1 on every resume — the exact property the amendment exists to hold.

  **(2) Carrying the PREVIOUS grade forward would be this milestone's own defect shape.** A grade is
  evidence about a tree; a loop resumes after an interruption during which the tree may have moved.
  Presenting evidence about the old tree as evidence about the new one is an absence of evidence read
  as a green light — which is the thesis 54 exists to defend, pointed at itself.

  **(3) The honest answer is cheap, and it is the one a consumer can act on.** 62, 63 and 78 do not
  need a grade on every drive; they need to know **which** drives carry one. A declared absence is a
  fact those three can branch on. An undeclared absence is the same document as an unconfigured
  repository's, and that ambiguity is the whole defect.

  **WHERE THE DECLARATION RIDES, AND WHY IT CANNOT RIDE ANYWHERE ELSE.** `LoopState`'s top-level key
  set is pinned at TEN, order included, by `acd-loop-probe-contract` (`53/FF-5304`, FF-5409), and
  `actShape()` strips anything outside its whitelist. `54/ADR-008 §2` already names the one place in
  the frozen document that is per-drive, additive and pinned by nobody: **the `driven` row**. So the
  declaration rides that row, `LoopState` keeps its ten keys, `act`'s whitelist is untouched, and no
  eleventh key is negotiated with 62, 63 or 78.

  **THE ONE THING THE DECLARATION MUST NOT DO IS APPEAR WHERE NOTHING WAS OWED.** `54/ADR-002 §3`
  promises an unconfigured repository a document that is byte-identical to the pre-54 shell's. Today
  `drivenRow` omits the grade keys both when no rubric is declared and when a grade was owed and not
  taken — indistinguishable. So the rule is exact: **a row declares the absence only where a rubric is
  declared**, and a repository with no `work.rubric` gains no byte.

  `54/ADR-002 §3`; `54/ADR-007 §1` (as amended); `54/ADR-008 §2`, `§3`; `53/ADR-005 §3`; FF-5409.

  Scenario: a resumed loop's re-drive declares that no grade was taken, and why
    Given a repository with a declared rubric
    And a loop interrupted after a build completed but before its re-drive started
    When the loop is resumed and re-drives that build
    Then the re-drive's driven row declares that no grade was taken
    And it names that the drive was reconstructed on resume
    And a consumer reads that from a key, not from prose

  Scenario: no grade is fabricated on the resumed re-drive's run
    Given a loop resumed onto a reconstructed re-drive
    When the run that re-drives the build is started
    Then that run's brief carries no grade key
    And no verdict, code or case count is recorded for that drive
    And the brief's loop declaration is unchanged

  Scenario: the grade taken before the interruption is not carried forward
    Given a build run whose grade was taken before the loop was interrupted
    When the loop is resumed and re-drives that build
    Then the earlier grade does not appear on the re-driven run
    And it does not appear on the re-drive's driven row
    And it is still readable where it was originally recorded

  Scenario: resuming pays for no child process
    Given a repository with a declared rubric
    And a loop resumed onto a reconstructed re-drive
    When the resume rebuilds its pending fix
    Then the declared runner is not launched
    And the loop's first launch is the one its own completed build earns

  Scenario Outline: the three states a driven row can be in are told apart from the row alone
    Given a repository that <configuration>
    And a drive that <history>
    When the loop's `--json` document is read
    Then that drive's row reads <reading>

    Examples:
      | configuration          | history                              | reading                                  |
      | declares a rubric      | completed a build and was graded     | the verdict, the codes and the counts    |
      | declares a rubric      | was reconstructed by the resume path | a declared absence naming the resume     |
      | declares no rubric     | completed a build                    | exactly the keys it carries today        |
      | declares no rubric     | was reconstructed by the resume path | exactly the keys it carries today        |

  Scenario: an unconfigured repository's resumed document is byte-identical to today's
    Given a repository that declares no `work.rubric`
    And a loop resumed onto a reconstructed re-drive
    When the loop's `--json` document is read
    Then no declaration of absence appears on any row
    And the document is the one the pre-grade shell produces

  Scenario: the frozen state contract is unchanged
    Given a loop that resumed and re-drove
    When its `LoopState` is read
    Then its top-level keys are exactly the ten it carries today, in the same order
    And the act's keys are exactly the whitelisted ones
    And the stop set is reported in full and unchanged

  Scenario: once the resumed loop completes a build of its own, that drive is graded normally
    Given a loop resumed onto a reconstructed re-drive
    When that re-drive completes and the loop reaches its grade rung
    Then the runner is launched exactly once for that completed build
    And that drive's row carries the verdict, the codes and the counts
    And that drive's run carries the grade on its brief
