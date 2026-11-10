@executable @docs @assets @design
Feature: `/aof:add-diagram` takes a prototype ref, to add a diagram, draw the missing ones or redraw one

  WHY. One command draws every diagram in aof, so a prototype gets a target on it rather than a
  sibling command. The ADR path stays word for word, so nothing that draws ADR diagrams today
  changes.

  Rule: R2 · `/aof:add-diagram` on a prototype adds, fills in or redraws

    Scenario: E5 · a description writes a new brief, then draws and pastes it
      Given the shipped command "packages/core/assets/commands/add-diagram.md"
      Then its prototype branch for "<ref> '<what to draw>'" writes a new "### <name>" brief under "## Diagrams" in "PROTOTYPE.md"
      And then runs "aof diagram plan <ref> <name>", draws, runs "aof diagram export <ref> <name>" and pastes the block under the brief

    Scenario: E6 · a bare prototype ref draws only the briefs with no picture
      Given the shipped command "packages/core/assets/commands/add-diagram.md"
      Then its prototype branch for "<ref>" alone draws every "### <name>" brief with no "](diagrams/" link under it

    Scenario: E7 · a name that matches a brief redraws that diagram
      Given the shipped command "packages/core/assets/commands/add-diagram.md"
      Then an argument matching an existing "### <name>" heading is read as a redraw of that diagram, and its block is replaced
      And any other argument is read as the description of a new diagram

    Scenario: each drawing is logged on the prototype
      Given the shipped command "packages/core/assets/commands/add-diagram.md"
      Then its prototype branch logs each diagram drawn or redrawn with "aof work prototype <ref> --log"

    Scenario: the ADR path is unchanged
      Given the shipped command "packages/core/assets/commands/add-diagram.md"
      Then its ADR branch still runs "aof diagram plan <ref> <ADR-NNN> --slug <slug>" and "aof diagram export <ref> <ADR-NNN>"
      And it still refuses to redraw a delivered ADR's diagram
