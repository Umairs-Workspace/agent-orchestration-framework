@executable @cli @adapter @distribution
Feature: Each runtime gets the body written for it

  WHY. The Claude and Codex bodies of a command differ in wording: one names "AskUserQuestion",
  the other the native question tool. A fragment therefore carries a body for each, as a command
  does, and a slot must be in both so that neither runtime is left without the practice
  (ADR-001 §2, ADR-002 §3, §7). Unifying the two bodies is out of the SPEC's scope.

  The fixture command "demo" has a common source, used by Claude and opencode, and an authored
  Codex variant: a short entry and an attached "procedure.md". The slot "demo.notes" is in the
  common source and in the Codex procedure. The practice "notes" is on. Its fragment has a common
  body, the line "Ask with AskUserQuestion.", and a Codex body, the line "Ask with the native
  question tool.".

  Rule: R3 · Each runtime is given the body written for it

    Scenario Outline: E7 · a command's slot is filled for each runtime
      When the bundle is rendered for "<runtime>"
      Then "<file>" holds "<line>"
      And it holds no slot marker

      Examples:
        | runtime  | file                                    | line                                |
        | claude   | .claude/commands/aof/demo.md            | Ask with AskUserQuestion.           |
        | opencode | .opencode/commands/aof/demo.md          | Ask with AskUserQuestion.           |
        | codex    | .agents/skills/aof-demo/procedure.md    | Ask with the native question tool.  |

    Scenario: the Codex skill never holds the Claude wording
      When the bundle is rendered for "codex"
      Then neither the skill's entry nor its "procedure.md" holds "AskUserQuestion"

    Scenario Outline: E8 · an agent brief's slot is filled for each runtime
      Given a fixture agent "aof-demo" with the slot "ownership.notes" in its common source and in its Codex variant
      And a fragment for that slot with a common body and a Codex body
      When the bundle is rendered for "<runtime>"
      Then "<file>" holds the "<body>" body

      Examples:
        | runtime  | file                           | body   |
        | claude   | .claude/agents/aof-demo.md     | common |
        | opencode | .opencode/agents/aof-demo.md   | common |
        | codex    | .codex/agents/aof-demo.toml    | Codex  |

    Scenario: a Codex brief stays a valid TOML document when its slot is filled
      Given the Codex body holds a double quote, a backslash and a line break
      When the bundle is rendered for "codex"
      Then ".codex/agents/aof-demo.toml" parses
      And its developer instructions hold the body as written

    Scenario: a slot that only the Codex entry carries is filled for Codex alone
      Given the Codex entry carries a slot "entry.rules" that the common source does not
      And a fragment for it with a Codex body and no common body
      When the bundle is rendered for "claude" and for "codex"
      Then the Codex skill's entry holds the body
      And the Claude command is unchanged by it

    Scenario: a runtime that was not selected is not rendered
      When the bundle is rendered for "claude" alone
      Then no file under ".agents" or ".codex" is planned

  Scenario: FF-19206 · every fragment lands on every runtime
    When "test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs" runs
    Then it fails unless every shipped fragment names a declared practice, a declared member and a slot that member carries
    And it fails unless each runtime whose texts carry the slot has a body for it
    And it fails unless every slot of a member's common source is in each of its authored variants
    And it runs the same checks over a fixture bundle that declares a fragment, so it is never empty

  Scenario Outline: FF-19206 · each planted gap turns the control red
    Given <planted>
    When the FF-19206 cases run
    Then the control fails and names the fragment, the runtime and the slot

    Examples:
      | planted                                                                   |
      | a slot added to a common source and not to its Codex procedure            |
      | a fragment with a common body and no Codex body, for a slot Codex carries |
      | a fragment whose slot no text of its target carries                       |
