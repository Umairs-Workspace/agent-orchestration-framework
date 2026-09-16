@executable @cli @work @work-stream @bug @finding-F-11
Feature: The brief is proven against this repo's own work stream, not a fixture

  This is the guard whose absence let the defect through three story gates and a structural review.

  Every `@executable` scenario in 70/00 and 70/03 passes. Both stories delivered green lanes — 70/00
  its compiler and its two spawn seams, 70/03 its declared-ADR slice at 32 of 32. Neither ever
  compiled a brief for a real item under `wiki/work/` and looked at what came out. Every fixture in
  both lanes was sized to fit the ceiling, so the one behaviour that mattered — what happens when a
  section is genuinely larger than the budget, which is the case for **every real story in this
  repo** — was the case no scenario exercised. Checking took four minutes at the milestone gate.

  A guard that only ever sees data shaped to pass is not a guard. This task pins the brief against
  the stream the tool actually runs on: the repo's own `wiki/work/`, at whatever size and shape it
  has grown to. It asserts invariants that must hold for **any** real item rather than byte counts
  for particular ones, so it stays true as the stream grows and still fails the day a brief goes
  hollow again.

  Scenario: a real story's build brief carries its acceptance criteria
    Given a story in this repository's own work stream that has task contracts
    When its build brief is compiled through the reader the tool actually uses
    Then the brief carries that story's acceptance criteria
    And the criteria are not replaced by a notice saying they were dropped

  Scenario: a real story's brief carries the architecture that binds it
    Given a story in this repository's own work stream whose milestone records architecture
    When its brief is compiled
    Then the brief carries the architecture that binds that story
    And a story that declares its own ADRs receives those rather than the register

  Scenario: a real verify brief is more than an item ref and a notice
    Given a story in this repository's own work stream
    When its verification brief is compiled
    Then the brief carries what the phase must check against
    And it is not merely the item's ref and a truncation notice

  Scenario: the guard reads the real stream, not a copy of it
    Given the guard for this story
    When the items it compiled briefs for are listed
    Then they are items that exist in this repository's own work stream
    And at least one of them has task contracts larger than the whole ceiling

  Scenario: the guard survives the stream growing
    Given the work stream gains stories, contracts and architecture over time
    When the guard runs against the stream as it then stands
    Then it asserts invariants that hold for any real item
    And it does not depend on any particular item's size or wording

  Scenario: the declared-ADR path is exercised by a real story, not by emptiness
    Given no story in the work stream declared the ADRs it depends on before this one
    When the guard checks the declared-slice invariant
    Then at least one real story in the stream declares its ADRs
    And that story's brief carries those ADRs rather than the milestone's register
    And the guard fails if no story in the stream declares any

  Scenario: the guard's assertions are not vacuous
    Given a brief compiled from a real item in the work stream
    And the same brief with its contract section removed
    When the guard's assertion is applied to each
    Then it holds for the compiled brief
    And it fails for the hollowed one
    And the failure names the item and the section that went missing

  Scenario Outline: what every real item's brief must satisfy
    Given any item in this repository's work stream matching <item kind>
    When its brief is compiled for <phase>
    Then it satisfies <invariant>

    Examples: invariants that hold across the whole stream — never a byte count
      | item kind                                    | phase       | invariant                                                        |
      | a story with task contracts                  | continue    | its acceptance criteria are present, condensed or whole          |
      | a story with task contracts                  | verify      | what the phase checks against is carried, not a ref and a notice |
      | a story whose milestone records architecture | continue    | the architecture that binds it reaches the brief in some form    |
      | a story that declares its own ADRs           | refine      | the declared slice arrives rather than the whole register        |
      | a milestone                                  | refine      | its own objective arrives, and no story's contracts are inlined  |
      | any item in the stream                       | every phase | within the ceiling, the item named, nothing dropped with budget left |

  Scenario Outline: the cases fixtures were never shaped to cover
    Given a real item whose <section> is <size relative to the ceiling>
    When its brief is compiled
    Then the outcome is <outcome>

    Examples: real-data shapes — the ones every fixture was sized out of
      | section                | size relative to the ceiling                 | outcome                                                      |
      | task contracts         | many times the ceiling on their own          | condensed to headlines and tags, carried whenever that fits  |
      | task contracts         | past the ceiling even condensed              | named unshippable, counted, and pointed at — nothing below it dropped |
      | task contracts         | absent — the story has none yet              | no contract section, and no notice claiming one was lost     |
      | declared architecture  | absent — the story declares no ADRs          | the milestone's register in its place, never silence         |
      | the milestone register | absent — the milestone records none          | no architecture section, and the rest of the brief unaffected |
      | the objective          | a milestone's own spec, many times over      | the milestone's objective alone, its stories not inlined     |
      | every section          | each within the ceiling, the sum far past it | condensed first, then sacrificed bottom-up until it fits     |
