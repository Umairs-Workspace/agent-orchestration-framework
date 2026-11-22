@executable @cli @assets @distribution
Feature: Two writers claiming one file or entry refuse before any write

  WHY. When a user's entry already sits where aof would write its own, the only safe answer is to
  stop and say so, before any file changes. The same holds when two of aof's own renders claim one
  `AGENTS.md`. Today that conflict refuses, and it is held as it is (ADR-002 §4, ADR-006 §2).

  Background:
    Given the "assets-merge" lane is registered with the harness

  Rule: R4 · When two writers claim one file or entry, apply refuses before any write

    Scenario: E11 · a user's MCP server named as aof's refuses
      Given scenario "mcp-collision" names no base and starts with the files of "EVERY_KIND" and a user ".mcp.json" declaring the server "docs" with the command "their-docs"
      And its step is "assets apply --json", declared to exit 1
      When the harness compares scenario "mcp-collision" in lane "assets-merge"
      Then it passes
      And the step's envelope names the code "co-authored-output-conflict" and the path ".mcp.json"
      And the captured project tree is exactly the starting files

    Scenario: E12 · two runtimes writing one AGENTS.md is held as today's refusal
      Given scenario "doc-conflict" names no base and starts with "EVERY_KIND" with the doc "guide" also on "opencode"
      And its step is "assets apply --json", declared to exit 1
      When the harness compares scenario "doc-conflict" in lane "assets-merge"
      Then it passes
      And the step's envelope names "Generated output conflict at AGENTS.md"
      And the captured project tree is exactly the starting files

    Scenario Outline: a refused apply writes none of its outputs
      When scenario "<scenario>" runs
      Then neither ".aof/aof.lock.json" nor ".aof/aof.apply-journal.json" nor ".claude/settings.json" exists
      And no runtime folder exists

      Examples:
        | scenario      |
        | mcp-collision |
        | doc-conflict  |
