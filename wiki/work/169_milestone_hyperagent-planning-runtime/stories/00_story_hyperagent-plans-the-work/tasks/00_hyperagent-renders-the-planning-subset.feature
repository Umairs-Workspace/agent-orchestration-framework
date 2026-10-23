@executable @cli @adapter @planning
Feature: A project that enables Hyperagent gets the planning skills Hyperagent imports, and only that project

  WHY. Hyperagent imports skills and runs planning against a repository it reaches through GitHub,
  with no checkout and no aof binary. It needs the planning procedures rewritten for that setting,
  written by aof like any rendered file, and they must never appear in a project that did not ask
  for them.

  Rule: R1 · Hyperagent's files are written for a project that enables it, and never assumed

    Scenario: E1 · a project that does not enable Hyperagent gets nothing for it
      Given a project that does not enable Hyperagent
      When "aof work init" runs
      Then nothing is written under ".hyperagent/"

    Scenario: E2 · enabling Hyperagent writes its skills and planner instructions
      Given a fresh project that enables Hyperagent
      When "aof work init" runs
      Then ".hyperagent/AGENT.md" and one "SKILL.md" per planning skill are written, and the lock records them

    Scenario: E3 · a re-run over a fresh Hyperagent install changes nothing
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
      Then it is an importable "SKILL.md" whose body carries the Hyperagent execution contract

  Rule: R3 · The Claude, Codex and OpenCode procedures do not change

    Scenario: E7 · the Claude and Codex renders hold no Hyperagent planning skill
      When the bundle renders for "claude" and "codex"
      Then neither render contains a Hyperagent planning skill's text
