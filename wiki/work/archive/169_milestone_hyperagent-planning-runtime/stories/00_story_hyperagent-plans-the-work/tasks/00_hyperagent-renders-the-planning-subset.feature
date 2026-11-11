@executable @cli @adapter @planning
Feature: Hyperagent gets the planning skills it needs, and no project is changed for it

  WHY. Hyperagent runs planning against a repository it reaches through GitHub, with no checkout and
  no aof binary, from skills uploaded to the operator's account. It needs the planning procedures
  rewritten for that setting, written by aof from its own sources, and they must never appear in a
  project's tree (169/02, ADR-007).

  Rule: R1 · Hyperagent's files are written when asked for, and never into a project

    Scenario: E1 · a project that does not enable Hyperagent gets nothing for it
      Given a project that does not enable Hyperagent
      When "aof work init" runs
      Then nothing is written under ".hyperagent/"

    Scenario: E2 · the Hyperagent package holds its skills and planner instructions
      When "aof work integrations hyperagent package" runs
      Then "AGENT.md" and one "SKILL.md" per planning skill are written under the aof home's "hyperagent/" folder

    Scenario: E3 · a re-run over a fresh install that enables Hyperagent changes nothing
      Given a project initialised with Hyperagent enabled
      When "aof work update" runs again
      Then no rendered file changes

  Rule: R2 · Hyperagent receives the planning procedures and nothing else

    Scenario: E4 · the six planning skills and aof-prd are the whole set
      When the files written for Hyperagent are listed
      Then they are "aof-shatter", "aof-refine", "aof-add-milestone", "aof-add-story", "aof-add-task", "aof-validate" and "aof-prd", plus "AGENT.md"

    Scenario: E5 · no build, review or verify procedure is written for Hyperagent
      When the files written for Hyperagent are listed
      Then none is a skill for continue, review, verify or loop, and none is an agent

    Scenario: E6 · each Hyperagent skill carries the execution contract
      When a Hyperagent skill is written
      Then it is an uploadable "SKILL.md" whose body carries the Hyperagent execution contract

  Rule: R3 · The Claude, Codex and OpenCode procedures do not change

    Scenario: E7 · the Claude and Codex renders hold no Hyperagent planning skill
      When the bundle renders for "claude" and "codex"
      Then neither render contains a Hyperagent planning skill's text
