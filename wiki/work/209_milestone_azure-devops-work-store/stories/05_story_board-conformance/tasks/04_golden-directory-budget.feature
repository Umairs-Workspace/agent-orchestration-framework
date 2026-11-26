@bug @finding-F-02 @executable @work
Feature: the board workflow suite is budgeted in the golden directory it joins

  WHY. At `aof:verify 209` (finding F-02), FF-11904's six live-tree cases were red:
  `test/golden/` holds 17 counted children against its row's ceiling of 16. 209/05 added
  `test/golden/board-workflow.test.mjs` and registered it in the golden index, but it did not
  raise the `test/golden` row in `test/arch/testing/acd-source-directory-budget.test.mjs` or add
  that file to its `files:`. Whether the suite stays a sibling (and the row is raised with its
  reason) or its cases move into `work-stream.test.mjs` is for the build to choose. The row's own
  reason asks for a case in the lane suite whose verb it runs.

  Rule: R1 · The golden directory's delivered count matches its declared ceiling

    Scenario: E1 · the source-directory budget is green over the live tree with 209/05's suites in place
      Given 209/05's board conformance cases are registered in the golden index
      When the FF-11904 source-directory budget runs over the live tree
      Then no row is over, under or outside its ceiling
      And the `test/golden` row's reason names what 209/05 added there
