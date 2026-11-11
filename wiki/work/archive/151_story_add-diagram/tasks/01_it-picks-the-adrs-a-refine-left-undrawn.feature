@cli @work @design
Feature: /aof:add-diagram picks the ADRs a refine left undrawn

  WHY. Refine's diagram step is the architect's judgement and never a stop, so a brief can be left
  with no picture: the step was skipped, or it answered "available: false" and kept the brief. This
  command fills those gaps and nothing else. It never re-judges which ADRs deserve a picture and never
  replaces one that is drawn. An ADR is undrawn when its section has a "### Diagram" brief and no
  "diagrams/" link under it. The session reads that from ARCHITECTURE.md itself: there is no new CLI
  verb. Each scenario reads the command's prose ("packages/core/assets/commands/add-diagram.md").

  Rule: R1 · With no ADR named, every ADR with a brief but no drawn diagram is drawn

    @executable
    Scenario: E1 · only the briefed, undrawn ADR is drawn
      When the command's prose is read
      Then with no ADR named it reads the item's "ARCHITECTURE.md" and lists each ADR whose "### Diagram" brief has no "diagrams/" link under it
      And it names an ADR with no brief as not a candidate, and an ADR with a drawn diagram as already drawn
      And it says the ADR's design is never revisited

    @executable
    Scenario: E2 · a brief kept by "diagram not drawn" is drawn once the engine is there
      When the command's prose is read
      Then it says a "diagram not drawn:" line in "STATE.md" left its brief behind, so that ADR is a candidate like any other
      And it leaves the "STATE.md" line as it is

    @executable
    Scenario: E11 · several undrawn briefs are all drawn in one run
      When the command's prose is read
      Then it lists every candidate before the first draw
      And it draws each candidate in turn, without pausing for confirmation

    @executable
    Scenario: E3 · nothing undrawn is reported, and nothing is written
      When the command's prose is read
      Then with no candidate it reports that the item has nothing to draw and writes nothing
      And it names "aof:add-diagram <ref> ADR-NNN" as the way to draw one ADR
      And it never searches the ADRs for one that would benefit from a picture

  Rule: R2 · A named ADR is drawn, its brief drafted first when it has none

    @executable
    Scenario: E4 · a named ADR with no brief gets one first
      When the command's prose is read
      Then for a named ADR with no "### Diagram" section it writes the brief under that ADR before planning
      And the brief says why a picture helps, the view, the components and the flows, in the words refine's diagram step uses
      And it plans that ADR only, whatever other ADRs are undrawn

    @executable
    Scenario: E5 · an unknown ADR is the plan's refusal, reported
      When the command's prose is read
      Then a non-zero exit from "aof diagram plan" is reported with its code and message, and the command stops for that ADR
      And "diagram-adr-unknown" is named as one such refusal

    @executable
    Scenario: E6 · a named ADR that is already drawn is reported, and nothing changes
      When the command's prose is read
      Then a named ADR with a "diagrams/" link under it is reported as already drawn
      And no plan is run for it and no file is written
