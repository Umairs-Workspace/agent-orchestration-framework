@executable @cli @work @design
Feature: A proposal fills in the house style for every node it adds without one, and says so in the record

  WHY. If the architect is only told to colour nodes, whatever it forgets is uncoloured and the
  operator has to notice. `propose` fills the default node style — paper fill, ink stroke, ink text,
  the recolour the operator accepted at 170's UAT — for every added node that names no style and is
  not a library item. It is filled into the stored proposal, so Preview and the record say what will
  be drawn (ADR-004).

  Background:
    Given a project whose style guide gives paper "#f3f5f7" and ink "#1b1f27"
    And item 171 holds a diagram "ADR-004-house-style.excalidraw" with an open note

  Rule: R2 · A node the architect adds without a style is filled in with the house style

    Scenario: E4 · a first draft is stored with every node in the house style
      Given the diagram is empty
      When the architect proposes the view
        """
        flowchart LR
          api["API"] --> store("Store")
          web["Web"] --> api
        """
      Then the stored proposal's text holds "style api fill:#f3f5f7,stroke:#1b1f27,color:#1b1f27"
      And it holds the same style line for "store" and for "web"
      And the proposal's changes list a style change for each of "api", "store" and "web"

    Scenario: E5 · an added node's own style is kept as written
      When the architect proposes a view adding "api" with the line "style api fill:#fbe9ed,stroke:#ba2646"
      Then the stored proposal holds "style api fill:#fbe9ed,stroke:#ba2646" and no other style line for "api"

    Scenario: E6 · an added library item is never coloured
      Given the project's libraries hold "aws-architecture-icons/\"Kinesis\""
      When the architect proposes a view adding "k1" with "%% aof:lib k1 aws-architecture-icons/\"Kinesis\""
      Then the stored proposal holds no style line for "k1"

    Scenario: E7 · a node that already exists is not recoloured
      Given the diagram holds the node "api" labelled "API" with no style
      When the architect proposes the view relabelling "api" to "Gateway"
      Then the stored proposal holds no style line for "api"

    Scenario: E8 · with no palette the proposal is stored as written
      Given the project has no "work.diagrams.style"
      When the architect proposes a view adding "api" with no style line
      Then the stored proposal's text is exactly the text proposed

    Scenario: the filled-in proposal reads back, as Mermaid, as what was stored
      Given the diagram is empty
      When the architect proposes a first draft adding "api" and "store" with no style lines
      Then the stored proposal parses in the aof Mermaid profile
      And its "api" node's style is fill "#f3f5f7", stroke "#1b1f27", color "#1b1f27"

  Rule: R4 · The architect is told the palette by role

    Scenario: E12 · context carries the palette by role
      When the architect reads the context for the open note
      Then the context's palette names "paper", "ink", "muted", "link" and "accent" with their colours

    Scenario: the review command tells the architect colours come by themselves
      When the rendered "/aof:diagram-review" command is read for Claude, OpenCode and Codex
      Then each says a node it adds is drawn in the house style without a style line
      And each says a style line is for emphasis, naming the palette's "link" or "accent" from the context
