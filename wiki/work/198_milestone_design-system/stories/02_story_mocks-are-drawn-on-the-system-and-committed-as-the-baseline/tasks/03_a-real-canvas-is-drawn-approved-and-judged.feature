@manual @cli @design
Feature: One real canvas is drawn on the system, approved, imported, captured, and then judged CONFORMS against a matching build

  WHY. The Artifact calls are the session's (ADR-003), so only a real run proves the loop the
  operator asked for: draw, review at a link, revise, approve, and a local baseline the judge trusts.
  The run also settles three assumptions of RESEARCH:
  - A1: a publish in a session driven by the loop meets no prompt nobody can answer;
  - A2: a pulled board, with "support.js" and its "tokens.json", renders offline as it does on the
    canvas;
  - A3: the rasterizer frames a ".dc.html" page as it frames an SVG.

  Run it in this repository, with "work.ui.designSystem" naming the "AOF" system that 198/01's
  task 05 published. The UI milestone is a small real one, or a scratch milestone made for the run
  and archived after it. Record each scenario's evidence, and each assumption's result, in this
  milestone's VERIFICATION.md.

  Rule: R2 · Refine offers a canvas drawn on the resolved system, and nothing becomes a baseline until the operator approves it

    Scenario: E4 · refine draws the canvas on the system and asks for approval
      Given the UI milestone has a surface and no mock
      When "/aof:refine <the milestone>" reaches the designer step and the operator takes the canvas
      Then the session resolves "AOF" to exactly one Design System, and draws one canvas with it installed
      And it asks "Approve these mocks?" with the canvas link, offering Approve, Revise and Later
      And mocks/ is untouched while the question is open

    Scenario: E6 · a revision is drawn on the same canvas, and asked about again
      When the operator answers Revise, "the chip row is too tall"
      Then the same canvas has a new version with the change, and the question is asked again with it

    Scenario: approving commits the baseline
      When the operator answers Approve
      Then the session pulls the canvas back, then runs "aof design-system mocks import" and "mocks capture"
      And mocks/ holds the boards, "support.js", the system's "tokens.json", a frame per board and a README.md
      And the README.md names the approved version, the approval and the system's link and version
      And DESIGN.md names the frames as the surface's conformance source of truth

    Scenario: E5 · an ambiguous title stops the step
      Given a second Design System titled "AOF" that the operator can open, made for this check and deleted after it
      When the designer step resolves "AOF"
      Then it stops before drawing, naming "AOF" and both titles and links, and creates no canvas

    Scenario: E7 · Later leaves the checklist as the baseline
      When the operator answers Later
      Then refine ends with DESIGN.md naming the canvas link as awaiting approval
      And the surface's binding checklist is its baseline, and mocks/ is untouched

    Scenario: E8 · turning the canvas down elicits mocks as before
      When the operator turns the canvas down at the designer step
      Then the step asks for a mock of their own, or fills the binding checklist, exactly as it does with the practice off

    Scenario: A1 · a refine driven by the loop publishes and asks through the loop
      When the same designer step runs in a refine that "aof work loop" drives
      Then the canvas is published with no permission prompt
      And the approval is one question the loop posts, carrying the canvas link

  Rule: R3 · The session never writes to the system at refine, and in reference mode what the system lacks is a gap for its owner

    Scenario: E10 · an owned system is installed and never published to
      When the canvas is drawn with "mode": "owned"
      Then the system's version is the same before and after the refine

    Scenario: E9 · a reference system's gap is named for its owner
      Given "work.ui.designSystem" names the same system with "mode": "reference"
      And a surface needs a warning colour the system does not hold
      When the canvas is drawn
      Then the warning is drawn with the system's existing tokens
      And DESIGN.md names "a warning colour" under "## Design-system gaps", and refine's hand-back lists it
      And the system's version is the same before and after the refine

  Rule: R6 · Verify pulls back an approved canvas that is not yet imported, before the fidelity judge

    Scenario: E19 · verify approves, imports and captures before it judges
      Given the canvas of E7 is still awaiting approval, and the surface is built to match it
      When "/aof:verify <the milestone>" reaches design conformance and the operator answers Approve
      Then the canvas is pulled back, imported and captured before the judge runs
      And the judge is handed the frames as the baseline, and returns CONFORMS

    Scenario: E20 · Later at verify judges against the checklist
      Given a canvas still awaiting approval at verify
      When the operator answers Later
      Then nothing is imported, and the judge is handed the binding checklist as the baseline

  Rule: The imported baseline renders offline as it was drawn

    Scenario: A2 · a pulled board renders offline as it does on the canvas
      When an imported board is opened from disk, with the network off
      Then it renders as it does on the canvas, the system's tokens included
      And only a Google Fonts face may fall back

    Scenario: A3 · the rasterizer frames a board as it frames an SVG
      When "mocks capture" frames the imported boards with this machine's browser
      Then each PNG shows the whole board at its "boards" size, with the runtime's content rendered and not a blank page
