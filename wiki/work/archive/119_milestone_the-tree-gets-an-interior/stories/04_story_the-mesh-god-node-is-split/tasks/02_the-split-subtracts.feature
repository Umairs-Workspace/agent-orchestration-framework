@executable @cli @work @validate
Feature: The split subtracts — the exported surface does not move, each extracted symbol is gone from the parent, and the ceiling falls

  The parent exports **42 names**
  (`node -e 'import("./src/mesh/worker-execution.mjs").then((m) => console.log(Object.keys(m).length))'`)
  and has **56 dependents** — 4 under `src/`/`scripts/`, 50 suites, 2 `test/support` fixtures. Those
  four are the whole of the non-test surface, and three of them take a symbol seam 1 is moving:
  `src/global-node-registry.mjs` takes `resolveCloneUrl`, `src/mesh/clone-credential-provider.mjs`
  takes `parseRepoFromCloneUrl`, `scripts/pin-checkout-id.mjs` takes `pinWorkspaceIdInCheckout`, and
  `src/mesh/launcher.mjs` takes fourteen names of which `workerHasRepo`, `meshCheckoutPath` and
  `resolveCloneUrl` are seam-1 symbols. Holding the 42 identical is therefore not a nicety — it is the
  entire reason no dependent appears in this story's diff.

  A contract that only asserted "the new modules exist" would pass on a copy-paste, which is this
  refactor's real failure mode. So the subtraction is asserted as an **absent DEFINITION, not an
  absent name** — the idiom this very control already runs at `acd-session-driver-single-home:66-76`
  over the seventeen re-exported driver names, `doesNotMatch(source, /(?:export\s+)?(?:async\s+)?(?:function|const|let|class)\s+<name>\b/)`
  on comment-stripped source. Asserting the name is absent would forbid the re-export that keeps the
  56 dependents untouched; asserting only the export count would let an extra name in, which this
  file has said since 53/00 is as much a defect as a missing one. And the extracted set is **derived**
  from each child's own top-level definitions rather than retyped here, with a stored floor naming
  the seam symbols so a child that extracted nothing cannot pass (ADR-003 §1: store a decision,
  derive a fact).

  `SINK_CEILING` is **lowered, never softened and never deleted** — item 83's explicit "what not to
  do", and the reason is that raising it costs an ADR sentence and those sentences are the evidence
  base of the entry. It stands at **2482** today with `SINK_FLOOR` at 1500
  (`acd-session-driver-single-home:39-40`), matching `wc -l src/mesh/worker-execution.mjs`. The two
  seams are 81 + 551 = **632 lines** by the commands in tasks 00 and 01, so the parent lands near
  1,850 — clear of the floor, which is the leg proving the file was really read and which this story
  does not touch. Shrink-only, no headroom, and the command that measured the new value goes in the
  constant's own comment beside the 63/03 and 63/06 raise paragraphs, which stay.

  What would quietly undo this: taking headroom "because the split will settle"; a child re-exporting
  the parent's names so `Object.keys` still matches while the definitions moved sideways; retyping
  the extracted set as a literal that a later extraction silently outgrows; and lowering the floor to
  keep a larger cut green, which converts the one non-vacuity leg on this ratchet into decoration.

  ADR-007, ADR-003 §2, ADR-001 (a control that is EXTENDED owes a red probe over its original claim
  as well as the new leg). FF-11907.

  Scenario: the exported surface is identical across the split
    Given the parent and its extracted siblings inside `src/mesh/`
    When the parent's export names are compared with the frozen set measured before the split
    Then the two sets are equal in both directions — an extra name is as much a defect as a missing one
    And `createMeshWorkerExecutionHandler` is still a function
    And every named binding the four source and script dependents take from the parent is defined
    And the suites and fixtures that import the parent are unchanged by this diff

  Scenario Outline: each extracted symbol is absent from the parent as a definition, and present as a re-export
    Given the extracted symbol <symbol> whose home is now <home>
    When the parent is read with its comments stripped through the one stripper
    Then the parent carries no `function` / `const` / `let` / `class` definition of that symbol
    And the parent's export set still answers <surface>

    Examples: the seam symbols, and the surface each one has to keep
      | symbol                            | home              | surface                                   |
      | composeDirectiveLaunchOptions     | launch composition| nothing — it was never exported           |
      | ASSIGNMENT_LOOP_LAUNCH_UNDECLARED | launch composition| the same exported name, re-exported       |
      | ASSIGNMENT_LOOP_LAUNCH_SCOPELESS  | launch composition| the same exported name, re-exported       |
      | workerHasRepo                     | repo admission    | the name `src/mesh/launcher.mjs` imports  |
      | resolveCloneUrl                   | repo admission    | the name `src/global-node-registry.mjs` imports |
      | parseRepoFromCloneUrl             | repo admission    | the name `src/mesh/clone-credential-provider.mjs` imports |
      | pinWorkspaceIdInCheckout          | repo admission    | the name `scripts/pin-checkout-id.mjs` imports |
      | meshCheckoutPath                  | repo admission    | re-exported, and imported inward by the handlers that still call it |
      | cloneRepoForWorkspace             | repo admission    | the same exported name, re-exported       |

  Scenario: the extracted set is derived from the children, never retyped
    Given each extracted module inside `src/mesh/`
    When its top-level definitions are read
    Then the set the absence check runs over is that derived set, not a literal in the control
    And the check asserts the derived set is non-empty and contains the named seam symbols
    And a child that extracted nothing fails on that floor rather than passing over an empty set

  Scenario: no extracted module imports its parent back
    Given each extracted module's static and dynamic import specifiers
    When they are resolved
    Then none resolves to `src/mesh/worker-execution.mjs`
    And none reaches it through a third module
    And no extracted module re-exports any of the parent's names

  Scenario: the ceiling falls and carries the command that measured it
    Given `SINK_CEILING` at 2482 before this story
    When the split has landed
    Then the constant is the line count of the parent measured at that commit
    And its own comment carries the command that produced that number
    And the constant is below the value it replaced, which is the shrink-only leg
    And `SINK_FLOOR` is unchanged, and the parent is still above it

  Scenario Outline: the extended control reds on its original claim as well as on the new legs
    Given the mutation <mutation>
    When the control is run
    Then it fails, naming <named>

    Examples: the red probes this extension owes
      | mutation                                            | named                                       |
      | one extracted function copied back into the parent  | that symbol, on the definition leg          |
      | an export name added to the parent                  | the extra name                              |
      | an export name dropped from the parent              | the missing name and the dependent's binding|
      | a driver name from the delivered seventeen re-defined in the parent | that name, on the original claim |
      | an extracted module re-exporting the parent's names | the import-back leg                         |
      | `SINK_CEILING` raised above the value it replaced   | the shrink-only leg                         |
      | `SINK_CEILING` deleted                              | the ratchet with no ceiling to read         |
      | `SINK_FLOOR` deleted or dropped to zero             | the leg that proves the file was read       |
