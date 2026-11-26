@executable @cli @adapter @distribution
Feature: A scoped fragment lands in the renders it is for, and nowhere else

  WHY. Claude Code and OpenCode render one command from one common source, and 192 composes that
  source once for both (RESEARCH R5). A Claude-only fragment in that source would therefore reach
  OpenCode as well. A common text is now composed once for each runtime that renders it, with that
  runtime's own selection of fragments. Nothing changes for a member with no scoped fragment on
  (ADR-001 §3, §4).

  The fixture is 192/00's. The command "demo" has a common source, rendered by Claude Code and
  OpenCode, and an authored Codex procedure. Both carry the block slot "demo.notes". The agent
  "aof-demo" has a common source and a Codex variant, and both carry "ownership.notes". The practice
  "notes" is keyed on "work.notes.enabled". "The Claude-only fragment" declares "runtimes": ["claude"]
  and a common body, "Use the Artifact tool.".

  Rule: R2 · A scoped fragment's prose lands in the renders of the runtimes it names, and in no other, even where they share one source

    Scenario: E4 · Claude's command holds the prose, and OpenCode's and Codex's do not
      Given the practice "notes" is on
      When the bundle is rendered for "claude", "opencode" and "codex"
      Then ".claude/commands/aof/demo.md" holds "Use the Artifact tool."
      And ".opencode/commands/aof/demo.md" does not hold it
      And no file of the Codex skill "aof-demo" holds it
      And no rendered file holds a slot marker

    Scenario: E5 · a scoped and an unscoped fragment share one slot
      Given an unscoped fragment with the common body "Note one." and a Codex body, declared before the Claude-only fragment in "demo.notes"
      And the practice "notes" is on
      When the bundle is rendered for "claude" and "opencode"
      Then the Claude command holds "Note one.", a blank line, then "Use the Artifact tool."
      And the OpenCode command holds "Note one." with one blank line above it and one below it, and not "Use the Artifact tool."

    Scenario: E6 · a scoped replacer replaces only in its own runtimes
      Given the unscoped fragment "alpha" with the body "Alpha." in "demo.notes"
      And a Claude-only fragment "alpha-plus" with the body "Alpha plus." that replaces "alpha"
      And both of their practices are on
      When the bundle is rendered for "claude", "opencode" and "codex"
      Then the Claude command holds "Alpha plus." and not "Alpha."
      And the OpenCode command and the Codex procedure hold "Alpha." and not "Alpha plus."

    Scenario Outline: an agent brief's scoped prose lands on its own runtimes alone
      Given a fragment for "ownership.notes" of "aof-demo" declares <runtimes> with the bodies it needs
      And the practice "notes" is on
      When the bundle is rendered for "claude", "opencode" and "codex"
      Then the body is in <holds>
      And it is in none of <lacks>

      Examples:
        | runtimes                       | holds                                                       | lacks                                                        |
        | "runtimes": ["claude"]         | ".claude/agents/aof-demo.md"                                | ".opencode/agents/aof-demo.md", ".codex/agents/aof-demo.toml" |
        | "runtimes": ["opencode"]       | ".opencode/agents/aof-demo.md"                              | ".claude/agents/aof-demo.md", ".codex/agents/aof-demo.toml"   |
        | "runtimes": ["codex"]          | ".codex/agents/aof-demo.toml"                               | ".claude/agents/aof-demo.md", ".opencode/agents/aof-demo.md"  |
        | "runtimes": ["claude", "codex"] | ".claude/agents/aof-demo.md", ".codex/agents/aof-demo.toml" | ".opencode/agents/aof-demo.md"                               |

    Scenario: an inline slot the Claude-only fragment does not fill for OpenCode removes only its own line there
      Given the Claude-only fragment fills an inline slot of "demo" instead
      And the practice "notes" is on
      When the bundle is rendered for "opencode"
      Then the OpenCode command holds the lines above and below the slot, with nothing between them

    Scenario: a rendered Codex skill is unchanged by a Claude-only fragment
      Given the practice "notes" is on
      When the bundle is rendered for "codex" with and without the Claude-only fragment declared
      Then both renders write the same files with the same bytes

    Scenario: the bundle a reader loads carries no runtime's prose into another's
      Given the practice "notes" is on
      When the bundle is loaded and each of its resources is resolved for "opencode"
      Then no resolved body holds "Use the Artifact tool."

  Rule: R3 · With no scoped fragment on, every runtime's render is byte-for-byte today's

    Scenario: E7 · a scoped fragment that is off renders as if it were not declared
      Given the practice "notes" is off
      When the bundle is rendered for "claude", "opencode" and "codex"
      Then every file it writes, and every byte of each, equals the render of the same fixture with the Claude-only fragment deleted from its descriptor

    Scenario: E8 · the shipped bundle renders one body for Claude and OpenCode, as it does today
      Given this checkout's config, with "discovery" and "build-brief" on
      When the shipped bundle is rendered for "claude" and "opencode"
      Then the bodies of the Claude and OpenCode "refine" commands are the same
      And so are the bodies of the Claude and OpenCode "verify" commands and "aof-designer" briefs

    Scenario Outline: unscoped fragments still compose one common body for every runtime that renders it
      Given the practice "notes" is <state> and every fragment of "demo" is unscoped
      When the bundle is rendered for "claude" and "opencode"
      Then the Claude and OpenCode commands hold the same body
      And that body is what 192's composer renders for the same fixture

      Examples:
        | state |
        | on    |
        | off   |

  Scenario: FF-19802 · Claude-only prose lands on Claude and nowhere else (two legs)
    When "test/arch/practices/acd-runtime-scoped-prose.test.mjs" runs
    Then over a fixture bundle with a Claude-only fragment in a command and in an agent brief, its practice on, it fails unless the Claude renders hold the body
    And it fails unless the OpenCode and Codex renders of the same members hold none of it
    And it fails unless, with the practice off, every runtime's render equals the render with the fragment deleted
    And over the shipped bundle it checks every fragment that declares "runtimes", with its practice on, the same two ways
    And it is registered in "test/arch/practices/index.mjs"

  Scenario Outline: FF-19802 · each planted leak turns the control red
    Given <planted>
    When the FF-19802 cases run
    Then the control fails and names the fragment, the member and the runtime

    Examples:
      | planted                                                                            |
      | a composer that fills a common text once and serves it to every runtime            |
      | a composer that drops every scoped fragment, so the Claude render lacks the body   |
      | a selection that ignores "runtimes" when a scoped fragment replaces another        |
