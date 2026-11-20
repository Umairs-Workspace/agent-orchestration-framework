@executable @cli @assets @scaffold
Feature: The render is the same on every run

  WHY. The normaliser handles values that are meant to vary. Anything else that varies, such as
  an order that follows the file system or a map's insertion order, is a defect in the render. A
  rule would hide it. So the lane runs the render twice and allows only what is meant to differ
  (ADR-002 §5).

  Rule: R4 · The render is the same bytes on every run, and a meant edit shows as exactly that edit

    Scenario: E15 · default, run twice, is byte-identical outside instants and temp paths
      Given scenario "default" in lane "work-init" is run twice, each run in its own temp root
      When each run is normalised with only "eol", "temp-paths" and "instants"
      Then the two project trees are byte-identical
      And the two step records are identical

    Scenario: the check uses fewer rules than the comparison, so a hash cannot hide an order
      When the twice-run check's rule list is read
      Then it holds "eol", "temp-paths" and "instants" and no other rule
