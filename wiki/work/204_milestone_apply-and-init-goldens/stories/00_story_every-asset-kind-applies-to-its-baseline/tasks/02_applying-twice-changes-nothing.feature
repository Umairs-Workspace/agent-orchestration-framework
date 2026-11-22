@executable @cli @assets @distribution
Feature: Applying twice changes nothing

  WHY. A user runs `apply` again after every edit. A second apply over aof's own output must change
  nothing. Today it refuses, because the Codex TOML merge writes a top-level setting inside the
  last table of a fresh config, so Codex reads the wrong value and the next apply sees aof's own
  entry as edited (ADR-003).

  Background:
    Given the "assets-apply" lane is registered with the harness

  Rule: R4 · Applying twice changes nothing

    Scenario: E10 · a second apply skips every file and the tree equals the first apply's
      Given scenario "re-apply" names base "every-kind", starts with the files of "EVERY_KIND", and its steps are "assets apply --json" twice
      When the harness compares scenario "re-apply" in lane "assets-apply"
      Then it passes
      And both steps exit 0
      And the second step reports every action as "skip"
      And the stored delta of "re-apply" holds "steps.golden" and no file

    Scenario: E11 · the Codex config is written where Codex reads it
      When scenario "every-kind" runs
      Then ".codex/config.toml", parsed as TOML, holds "model" = "o3" at the top level
      And it holds the servers "docs" and "remote" under "mcp_servers", neither with a "model" key

    Scenario Outline: the TOML merge places a top-level setting before the first table
      Given a Codex config output declaring the top-level setting "model" and the server tables "docs" and "remote"
      And the target file holds <current>
      When the merge plans it
      Then the merged text, parsed as TOML, holds "model" at the top level
      And every owned entry sits under the table its key names
      And <user content>

      Examples:
        | current                                                              | user content                                                             |
        | nothing (the file is absent)                                          | the merged text holds no line but aof's                                  |
        | "approval_policy = \"never\"\n\n[mcp_servers.mine]\ncommand = \"my-mcp\"\n" | "approval_policy" and the "mine" server are kept byte for byte           |

    Scenario: a merge that would put an owned entry under another table refuses and writes nothing
      Given a TOML merge whose result would place an owned top-level entry after a table header
      When the merge plans it
      Then it refuses with "codex-output-conflict"
      And the target file is unchanged
