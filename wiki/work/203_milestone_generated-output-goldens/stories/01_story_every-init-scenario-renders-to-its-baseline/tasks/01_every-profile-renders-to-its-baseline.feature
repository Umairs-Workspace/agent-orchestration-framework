@executable @cli @assets @scaffold
Feature: Every profile renders to its baseline

  WHY. A practice or an integration turned on changes what a project receives, and nothing holds
  those renders today. Each profile is the project config a user would hold when they run `init`.
  Each is held as a delta over `default`, so its baseline is exactly what the profile changes
  (ADR-005).

  Background:
    Given the "work-init" lane is registered with the harness

  Rule: R2 · Each profile holds exactly what it turns on

    Scenario Outline: each profile renders to its baseline
      Given scenario "<scenario>" starts with ".aof/aof.config.json" holding <config>
      When the harness compares scenario "<scenario>" in lane "work-init"
      Then it passes
      And scenario "<scenario>" names base "default"
      And its one step was "work init --runtime claude,codex,opencode --json", exiting 0

      Examples:
        | example | scenario      | config                                                                                     |
        | E5      | all-practices | work.examples.enabled, work.examples.operatorAware and work.plan.enabled, each true        |
        | E6      | notion        | work.integrations.notion as an empty object                                                |
        | E7      | hyperagent    | work.integrations.hyperagent as an empty object                                            |

    Scenario: E5 · every practice on changes the practice-gated prose and nothing else
      When the stored delta of scenario "all-practices" is listed
      Then it holds ".aof/aof.config.json" and the changed renders of refine, of the architect, product-owner, QA and researcher agents, and of the "EXAMPLES.md" and "RESEARCH.md" templates
      And of the install records it holds ".aof/aof.lock.json" alone
      And its "removed.golden" is empty

    Scenario: E6 · Notion, which ships no member, changes no generated file
      When the stored delta of scenario "notion" is listed
      Then it holds ".aof/aof.config.json" and no other project file
      And its "removed.golden" is empty

    Scenario: E7 · Hyperagent adds its one command in every runtime, and changes nothing else
      When the stored delta of scenario "hyperagent" is listed
      Then it holds ".aof/aof.config.json", ".claude/commands/aof/hyperplan.md", ".opencode/commands/aof/hyperplan.md" and the files of ".agents/skills/aof-hyperplan/"
      And of the install records it holds ".aof/aof.lock.json" and ".aof/aof.apply-journal.json"
      And no other file that "default" holds is stored changed
      And its "removed.golden" is empty

    # Amended at verify, 2026-11-21 (E5, E7): an install record lists every member, so a profile
    # that adds or re-gates a member changes it. The map did not count those records.

    Scenario: E8 · learning has no key, so it is in default and in no profile's delta
      When the baselines of lane "work-init" are read
      Then "default" holds "/aof:teach" for Claude Code
      And no profile's stored delta names a teach file
