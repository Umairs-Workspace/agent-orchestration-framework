@cli @planning
Feature: /aof:hyperplan delegates a planning step and checks what comes back

  WHY. The procedure drives Hyperagent over MCP, but the steps that must not be improvised are CLI
  verbs: composing the brief, reading the planner's result back, checking the plan branch without
  touching the operator's checkout, and saying what setup is missing.

  @executable
  Rule: R1 · The command renders for the assistants the operator drives Hyperagent from

    Scenario: E1 · /aof:hyperplan is a Claude and OpenCode command and a Codex skill
      When the bundle renders for "claude", "opencode" and "codex"
      Then each render holds the hyperplan procedure, and nothing for it is written under ".hyperagent/"

  @executable
  Rule: R2 · The brief is deterministic and refuses what it cannot compose

    Scenario: E2 · a brief for a named repository is the same text every time
      Given the request "plan a CSV importer" for repository "acme/widgets"
      When "aof work integrations hyperagent brief" runs twice
      Then both runs print the same brief, naming the plan branch and ending with the result-block contract

    Scenario Outline: a brief that cannot be composed is refused with a code
      When "aof work integrations hyperagent brief" runs with <input>
      Then it fails with code "<code>"

      Examples:
        | example | input                        | code                        |
        | E3      | the mode "draw"              | hyperagent-mode-unknown     |
        |         | no request text              | hyperagent-request-missing  |

  @executable
  Rule: R3 · The result is read back, and the plan branch is checked out of the operator's way

    Scenario: E4 · the planner's result block is read back
      Given a planner reply holding an "AOF-PLAN-RESULT" block
      When "aof work integrations hyperagent result" reads it
      Then it answers the pull-request URL and the plan branch

    Scenario: E5 · a plan branch is validated in a temporary checkout
      Given a plan branch that adds a milestone and one file outside the planning lane
      When "aof work integrations hyperagent check" runs on it
      Then it reports the validate result and the out-of-lane file, and the operator's index, HEAD and working tree are unchanged

    Scenario: E6 · an option-shaped branch name is refused before git runs
      When "aof work integrations hyperagent check" runs on the branch "--upload-pack=x"
      Then it fails with a coded refusal and runs no git command

  @executable
  Rule: R4 · The doctor says what is missing and writes nothing

    Scenario: E7 · missing setup is named step by step
      Given a project with no Hyperagent MCP server registered and no rendered skills
      When "aof work integrations hyperagent doctor" runs
      Then it names each missing step, and no file changes

  @manual
  Rule: R5 · A live plan run passes validate on the branch it produced

    Scenario: E8 · one plan from idea to a refined milestone
      Given the rendered skills imported into Hyperagent and a session connected to it over OAuth
      When "/aof:hyperplan plan" runs for one idea, and the milestone it framed is promoted and refined
      Then each draft pull request's branch passes "aof work validate"
