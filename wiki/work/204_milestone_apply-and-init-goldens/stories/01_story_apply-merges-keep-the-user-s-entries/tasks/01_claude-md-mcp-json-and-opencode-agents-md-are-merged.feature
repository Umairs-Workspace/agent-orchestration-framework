@executable @cli @assets @distribution
Feature: CLAUDE.md, .mcp.json and opencode's AGENTS.md are merged, not replaced

  WHY. Today apply writes a user's `CLAUDE.md` and `.mcp.json` whole, because only Codex's shared
  files are treated as co-authored. The user's guidance and MCP servers are lost, reported only as
  "existing file will be overwritten". Whether a file is co-authored is a property of the file,
  not of the runtime that renders it (ADR-002).

  Background:
    Given the "assets-merge" lane is registered with the harness

  Rule: R2 · `CLAUDE.md`, `.mcp.json` and opencode's `AGENTS.md` are merged, not replaced

    Scenario: E6 · the user's CLAUDE.md keeps its lines, and aof's guidance follows in a managed block
      Given "USER_FILES" holds "CLAUDE.md" as "# Claude\nMine.\n"
      When scenario "customised" runs
      Then "CLAUDE.md" starts with "# Claude\nMine.\n"
      And what follows is one aof-managed block holding the project doc "guide"
      And the step does not report "CLAUDE.md" with the reason "existing file will be overwritten"
      And the lock entry for "CLAUDE.md" records "guidance" ownership

    Scenario: E7 · the user's MCP server is kept, and aof's follow it
      Given "USER_FILES" holds ".mcp.json" declaring the server "mine" with the command "my-mcp"
      When scenario "customised" runs
      Then ".mcp.json" declares the servers "mine", "docs" and "remote", in that order
      And the server "mine" is exactly as the user wrote it
      And the lock entry for ".mcp.json" records "mcp-servers" ownership of "docs" and "remote", and not of "mine"

    Scenario: E8 · opencode's AGENTS.md is merged the same way
      Given scenario "opencode-agents" names base "assets-apply/opencode", starts with "EVERY_KIND" with the doc "guide" on "opencode" only, and the user's "AGENTS.md" as "# Agents\nMine.\n"
      And its step is "assets apply --runtime opencode --json"
      When the harness compares scenario "opencode-agents" in lane "assets-merge"
      Then it passes
      And "AGENTS.md" starts with "# Agents\nMine.\n", then one aof-managed block holding the project doc "guide"

    Scenario: E9 · a CLAUDE.md written whole before this fix is adopted when unedited
      Given a project whose "CLAUDE.md" is exactly what an earlier apply wrote whole
      And its lock entry for "CLAUDE.md" has that file's hash and no ownership
      When apply plans the project doc "guide" for "claude"
      Then the action for "CLAUDE.md" is a merge recording "guidance" ownership
      And no refusal is raised

    Scenario: the co-authored rule holds for every co-authored path (FF-20401)
      Given the co-authored set "AGENTS.md", "src/AGENTS.md", "CLAUDE.md", ".mcp.json", ".codex/config.toml" and ".codex/hooks.json"
      And a user's own file at each path, for each runtime that renders it
      When apply plans the outputs
      Then every action at those paths records ownership and keeps the user's content
      And none carries the reason "existing file will be overwritten"
      And the arch control "FF-20401" in "test/arch/store/acd-codex-output-ownership.test.mjs" asserts this
