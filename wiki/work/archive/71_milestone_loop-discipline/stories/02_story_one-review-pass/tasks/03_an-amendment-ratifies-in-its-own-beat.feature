@docs @planning @round-trip
Feature: A contract amendment ratifies in the beat that raised it
  In order that a milestone never again spends 42% of its output tokens re-applying architecture
  deltas to contracts it had already authored
  the ADR set must close before the contract fan-out, and any later delta must be a finding routed by
  the triage rule rather than a re-authoring wave.

  # Contract, not restated: ADR-007, and ADR-003's four questions. Measured cost of the defect:
  # thirteen agent runs in milestone 52 existed only to re-apply ADR deltas to authored contracts —
  # 38% of agent-active time and 661.6k output tokens.

  Background:
    Given the bundled command "src/bundle/commands/refine.md" as it ships
    And a milestone cascade that will author several stories' contracts

  @executable
  Scenario: the ADR set closes before the contract fan-out
    When the milestone cascade is read
    Then the Decide stage is stated as closing before the Contract fan-out begins
    And a delta raised during the architecture pass is folded in there
    And no step re-applies an architecture delta to a contract after the fan-out

  @executable
  Scenario Outline: where a delta lands, by when it was raised
    Given an architecture delta raised <when>
    When it is handled
    Then it lands <where>
    And <re-authoring>

    Examples:
      | when                                        | where                                                  | re-authoring                                  |
      | during the architecture pass                | in the ADR set, before the fan-out                     | no contract is re-opened                      |
      | while a contract is being authored          | in that contract, in the same authoring beat           | no contract is re-opened                      |
      | while the fan-out is still in flight        | as a finding routed by the triage rule                 | the contracts already authored are not re-opened |
      | after the contracts are authored            | as a finding routed by the triage rule                 | no contract is re-opened                      |
      | after the item is delivered                 | in the ACCEPTING item's contract, as a superseding ADR | the delivered .feature is not re-opened       |

  @executable
  Scenario: the one delta that still earns its round is the one that would ship a wrong criterion
    Given a delta that would leave a delivered criterion wrong
    When it is classified
    Then it is a "locked-contract-violation" and therefore already a Blocker
    And it is handled inside the round bound the review lane already carries
    And it does not license a re-authoring wave over the other contracts

  @executable
  Scenario: a delta raised after authoring never re-opens a delivered contract
    Given an architecture delta raised after a contract was delivered
    When it is routed
    Then the delivered .feature is not edited, annotated or tagged
    And the superseding rule is stated in the accepting item's own contract

  @executable
  Scenario: a re-authoring wave is not a legal response to a delta
    When the cascade's stages are read
    Then no stage spawns an authoring agent whose only work is re-applying a decision to an already-authored contract
    And each contract has exactly one authoring beat named

  @manual
  Scenario: a real milestone's refine spends no run re-applying an ADR delta
    When a milestone is refined with --autonomous
    Then the run record shows no agent whose sole output was a contract re-application
    And each contract was authored once
