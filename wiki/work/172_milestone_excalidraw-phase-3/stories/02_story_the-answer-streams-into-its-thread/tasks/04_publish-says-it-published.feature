@executable @ui @work
Feature: Publish says it published, and the ADR's link stays the architect's to write

  WHY. F-172-16, raised at 02's `@uat`: after Publish the editor showed a Markdown block and a Copy
  block button with "paste the block below under the ADR if it is not linked yet", every time, even
  when the ADR already showed the figure. The editor never writes ARCHITECTURE.md (m170/ADR-013), so
  the block is the architect's to paste, never the operator's. The publish answer now says whether the
  figure's own ADR shows it, and the editor's notice says only what the operator needs.

  Background:
    Given the editor is open on a saved "ADR-002-scene.excalidraw" of an item whose ADR-002 section exists

  Rule: R1 · Publish says it published, and hands the operator no block

    @bug @finding-F-172-16
    Scenario: E1 · an ADR that shows the figure gets a plain notice
      Given ADR-002's section shows "diagrams/ADR-002-scene.svg" as an image
      When the operator publishes
      Then the notice reads "Diagram published."
      And no link block and no Copy block button are shown

    @bug @finding-F-172-16
    Scenario: E2 · an ADR that does not show the figure names the missing link
      Given ADR-002's section does not show the figure
      When the operator publishes
      Then the notice reads "Diagram published. The ADR does not show this figure yet — ask the architect to link it."
      And the notice carries no Markdown to paste

  Rule: R2 · Only an image of the figure under its own ADR counts as showing it

    Scenario: E3 · a quoted block, or the block under another ADR, does not show the figure
      Given ADR-002's section quotes the block in a code span and ADR-003's section holds the block
      When the operator publishes
      Then the publish answer says the ADR does not show the figure
