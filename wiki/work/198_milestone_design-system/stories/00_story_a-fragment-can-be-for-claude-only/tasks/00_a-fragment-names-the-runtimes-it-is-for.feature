@executable @cli @adapter @distribution
Feature: A fragment names the runtimes it is for, and the load holds it to that list

  WHY. 192's load rule asks every fragment for a body for each runtime whose text carries its slot
  (192/ADR-002 §6). Prose that only Claude can act on would therefore need a hollow Codex body, or
  a fork of the command. A fragment may now say which runtimes it is for. The body rule applies to
  those runtimes alone, and a body for any other is a contradiction (ADR-001 §1, §2).

  The fixture is 192/00's. The command "demo" has a common source, rendered by Claude Code and
  OpenCode, and an authored Codex procedure. Both carry the slot "demo.notes". The practice
  "notes" is keyed on "work.notes.enabled". "The Claude-only fragment" is "notes-demo" declared
  with "runtimes": ["claude"] and a common body, "Use the Artifact tool.", and no Codex body.

  Rule: R1 · A fragment may name the runtimes it is for, and the load refuses a list that contradicts its bodies

    Scenario: E1 · a Claude-only fragment needs no Codex body
      Given the Codex procedure of "demo" carries the slot "demo.notes"
      When the bundle is loaded with the Claude-only fragment
      Then the load succeeds

    Scenario: E2 · a body for a runtime the fragment does not name is refused
      Given the Claude-only fragment also has a Codex body
      When the bundle is loaded
      Then the load is refused
      And the refusal names "notes-demo", its package, "codex" and "demo.notes"
      And it says the fragment does not name "codex" in its runtimes

    Scenario: E3 · a runtime name outside the capability matrix is refused
      Given a fragment declares "runtimes": ["claud"]
      When the bundle is loaded
      Then the load is refused
      And the refusal names the fragment, "claud" and the runtimes the matrix holds

    Scenario Outline: each list that contradicts the fragment's bodies or slot is refused
      Given the fragment "notes-demo" declares <runtimes> with <bodies>
      When the bundle is loaded
      Then the load is refused, naming "notes-demo" and <named>

      Examples:
        | runtimes                         | bodies                         | named                                         |
        | "runtimes": []                   | a common body                  | that it names no runtime                      |
        | "runtimes": "claude"             | a common body                  | that "runtimes" is not a list                 |
        | "runtimes": ["codex"]            | a common body and a Codex body | the common body, which no runtime it names renders |

    Scenario: a scoped fragment whose named runtimes carry none of its slot is refused
      Given the slot "entry.rules" is carried by the Codex entry of "demo" alone
      And a fragment for "entry.rules" declares "runtimes": ["claude"] with a common body
      When the bundle is loaded
      Then the load is refused, naming the fragment, "entry.rules" and "claude"
      And it says no text "claude" renders of "command:demo" carries the slot

    Scenario: a scoped fragment still needs a body for each runtime it names whose text carries the slot
      Given a fragment for "demo.notes" declares "runtimes": ["claude", "codex"] with a common body and no Codex body
      When the bundle is loaded
      Then the load is refused, naming the fragment, "codex" and "demo.notes"

    Scenario: a runtime it names that renders from the common source takes the common body
      Given a fragment for "demo.notes" declares "runtimes": ["opencode"] with a common body
      When the bundle is loaded
      Then the load succeeds

    Scenario: an unscoped fragment is held to 192's rule, unchanged
      Given "notes-demo" declares no "runtimes" and has a common body but no Codex body
      When the bundle is loaded
      Then the load is refused, naming "notes-demo", "codex" and "demo.notes", as it is today

    Scenario: the rule that a common slot is in every authored variant is unchanged
      Given the slot "demo.extra" is added to the common source of "demo" and not to its Codex procedure
      And the only fragment for "demo.extra" is Claude-only
      When the bundle is loaded
      Then the load is refused, naming "demo", "demo.extra" and its Codex text

  Scenario: FF-19801 · a scoped fragment names real runtimes and has a body for exactly those that carry its slot
    When "test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs" runs
    Then for each fragment that declares "runtimes" it fails unless every name is in the capability matrix
    And it fails unless each named runtime whose texts carry the slot has a body
    And it fails if any runtime the fragment does not name has a body
    And for each fragment that declares no "runtimes" it applies FF-19206's rule unchanged
    And it runs over the shipped bundle and over a fixture bundle that declares a Claude-only fragment, so the scoped leg is never empty

  Scenario Outline: FF-19801 · each planted gap turns the control red
    Given <planted>
    When the FF-19801 cases run
    Then the control fails and names the fragment, the runtime and the slot

    Examples:
      | planted                                                                       |
      | a Claude-only fragment given a Codex body                                     |
      | a fragment naming the runtime "claud"                                         |
      | a fragment naming "claude" and "codex" with no Codex body, for a slot Codex carries |
