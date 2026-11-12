@executable @cli @work @validate
Feature: A story is not built on a fact nobody cited

  WHY. The doctor reports; the continue door is where a build is actually stopped (134/ADR-005 §4).
  The door reads the research document as it reads the map and calls the lane's own judgement, so
  the two cannot disagree (ADR-002 §3). A researched example is a rule the build must honour, so
  the trace holds it like an agreed one (ADR-001 §8). With the gate off, none of this runs
  (ADR-002 §5).

  Background:
    Given story "192/01" in status "in-progress" under milestone "192"

  Rule: R4 · A story is not built on a fact nobody cited

    Scenario: E9 · the build is refused while a citation leads nowhere
      Given "work.examples.enabled" is true
      And the story's map holds an example labelled "[researched F3]", and the milestone's "RESEARCH.md" holds no "## F3 · " heading
      When "aof work continue 192/01 --json" runs
      Then it is refused with code "examples-question-open" and status 409
      And the refusal's detail lists one finding with code "example-research-unanchored"
      And nothing is minted, moved or dispatched

    Scenario: E10 · a researched example the contract dropped is named
      Given "work.examples.enabled" is true
      And the story's map holds, under "R2", an example "E5" labelled "[researched F2]", with "F2" sourced
      And the story's task features name "R2" in a "Rule:" and carry no "E5"
      When "aof work doctor 192/01 --json" runs
      Then it reports "example-untraced" for "E5", saying it is researched "F2" under "R2"

    Scenario: E11 · with the gate off, nothing is read and nothing is refused
      Given "work.examples.enabled" is false
      And the story's map holds an example labelled "[researched F3]", and the milestone has no "RESEARCH.md"
      When "aof work doctor 192/01 --json" and "aof work continue 192/01 --json" run
      Then the doctor reports no "example-" finding
      And "continue" is not refused for the map

    Scenario: the build goes ahead once the finding is there
      Given "work.examples.enabled" is true
      And the story's map holds an example labelled "[researched F3]" carried by a scenario under its rule
      And the milestone's "RESEARCH.md" holds "## F3 · " with a Source line
      When "aof work continue 192/01 --json" runs
      Then it is not refused for the map

    Scenario: the door and the doctor say the same thing
      Given "work.examples.enabled" is true
      And a story whose map has an open "policy" question, an open "domain" question and an unanchored citation
      When "aof work doctor" and "aof work continue" each judge it
      Then the door's refusal lists the same codes and messages the doctor reports at severity "error"

    Scenario: a researched example carried under its rule is traced
      Given a contract whose "Rule: R2 · …" holds a scenario named "E5 · …"
      And the map's "R2" holds "E5" labelled "[researched F2]"
      When the map is asked which examples the contract does not carry
      Then it answers none

    Scenario: FF-19202 · off is still today
      When "test/arch/examples/acd-examples-off-is-today.test.mjs" runs
      Then it fails if, with "work.examples" absent or "enabled: false", a story row carries the research document's text
      And it fails if "doctorWork" yields "example-research-unanchored" for a map that cites a missing finding
      And it fails if "continue" on that story is refused

    Scenario Outline: FF-19202 · each planted read turns the control red
      Given the gate is off and <planted>
      When the FF-19202 cases run
      Then the control fails and names what was read

      Examples:
        | planted                                                        |
        | a story probe that reads the research document unconditionally |
        | a lane that judges citations before it asks the gate           |
        | a door that reads the research document before it asks the gate |
