@executable @cli @adapter @distribution @design
Feature: Claude's verify re-syncs an owned system from the code at a milestone's accept, and no other runtime's verify holds any of it

  WHY. ADR-007: an owned system follows its code. At a milestone's accept, verify resolves the
  configured system (ADR-005 §4), checks it against the code, re-syncs it through the type's merge
  ("tokens --merge", task 01), publishes the result, and checks again. Drift before the re-sync is
  the expected input. Drift after it is a finding. Publishing needs the Artifact tool, which only
  Claude has, so the prose is a Claude-only fragment (ADR-001, through 00's runtime scoping) in a
  new verify slot, "checks.design-system", at the end of step 1. Its twin marker goes in the Codex
  verify procedure of workflow.md and stays empty there (192/ADR-002 §7). With the practice off,
  the slot leaves nothing behind (FF-19205).

  "On, owned" is "work.ui.designSystem" = {"enabled": true, "name": "AOF", "mode": "owned",
  "source": ["apps/ui/src/index.css"]}. "The baselines" are the golden renders under
  "test/golden/baselines". "The re-sync's body" is the fragment's text for the slot.

  Rule: R4 · Nothing else re-syncs a system: not a reference system, not a story's accept, not the practice off, not another runtime

    Scenario: E17 · with no work.ui block every verify render is today's
      Given a project with no "work.ui" block
      When the bundle is rendered for "claude", "codex" and "opencode"
      Then the rendered verify equals the baselines byte for byte, for each runtime
      And no rendered file holds "slot:"

    Scenario: E18 · with the practice on, only Claude's verify holds the re-sync
      Given the practice is on, owned
      When the bundle is rendered for "claude", "codex" and "opencode"
      Then ".claude/commands/aof/verify.md" holds the re-sync's body, after the design-conformance review and before the findings step
      And no file of the Codex skill "aof-verify", no file under ".codex/aof/workflows", and not ".opencode/commands/aof/verify.md" holds any of it
      And no rendered file holds "slot:"

    Scenario: E15 · Claude's verify never publishes to a reference system
      Given the practice is on
      When the bundle is rendered for "claude"
      Then the re-sync's body says that with "mode": "reference" nothing is re-synced and nothing is published to the system

    Scenario: E16 · Claude's verify re-syncs only at a milestone's accept
      Given the practice is on, owned
      When the bundle is rendered for "claude"
      Then the re-sync's body says it runs when a milestone is accepted, and not when a story is

    Scenario: the shipped bundle carries the fragment, scoped to Claude
      When the design-system bundle is loaded
      Then it holds a "fragment" member for target "command:verify" and slot "checks.design-system", with "runtimes": ["claude"] and no Codex variant
      And "packages/acd/assets/commands/verify.md" and the Codex verify procedure of "packages/acd/assets/variants/codex/workflow.md" each hold the slot marker once

  Rule: R3 · Accepting a milestone re-syncs an owned system from the code, and drift that survives the re-sync is a finding

    Scenario: E10 · Claude's verify says how the re-sync runs
      Given the practice is on, owned
      When the bundle is rendered for "claude"
      Then the re-sync's body says, in this order:
        | step                                                                                                                        |
        | resolve the system: a "name" among the Design Systems the operator can open, or the configured "artifact"                    |
        | read the system's tokens.json back, and run "aof design-system check --tokens <it>" against the configured source             |
        | when it drifts, run "aof design-system tokens --merge <it> --out <file> --ref <the accepted commit>"                         |
        | record the system's link and version, and what changed, was added and was removed, under "## Design-system re-sync" in VERIFICATION.md, before publishing |
        | publish the merged tokens to the system with the type's own procedure, keeping "editing": "code"                              |
        | read the tokens back and run "aof design-system check" again, recording the new version                                     |
      And that drift before the re-sync is the expected input, and is not a finding

    Scenario: E11 · Claude's verify publishes nothing when nothing drifted
      Given the practice is on, owned
      When the bundle is rendered for "claude"
      Then the re-sync's body says that when the first check exits 0 and "## Design-system changes" names no component, nothing is published and VERIFICATION.md records the system as in sync at its version

    Scenario: E12 · Claude's verify updates a changed component from the milestone's mocks
      Given the practice is on, owned
      When the bundle is rendered for "claude"
      Then the re-sync's body says that each component "## Design-system changes" names has its README and preview updated from the milestone's committed mocks, and is published with the tokens

    Scenario: E13 · Claude's verify logs drift after the re-sync as a finding
      Given the practice is on, owned
      When the bundle is rendered for "claude"
      Then the re-sync's body says that drift the second check still reports is logged under "## Findings" with the check's report, and triaged in the findings step like any other finding

    Scenario: E14 · Claude's verify stops on a name that does not resolve to one system
      Given the practice is on, owned
      When the bundle is rendered for "claude"
      Then the re-sync's body says that no match for "name", or more than one, stops verify before anything is published, naming "name" and every candidate's title and link

    Scenario: the re-sync never writes to the code, and holds no token parsing
      Given the practice is on, owned
      When the bundle is rendered for "claude"
      Then the re-sync's body says that nothing is written from the system back to the code
      And the fragment file holds no "@theme" and no CSS custom-property grammar, so FF-19804's prose leg holds over it

  Scenario: FF-19802 covers the re-sync's body
    Given "test/arch/practices/acd-runtime-scoped-prose.test.mjs" (FF-19802) sweeps every fragment the practice ships
    When the "checks.design-system" fragment is made unscoped in a copy of the bundle
    Then the control fails, naming the fragment and the runtimes "codex" and "opencode"
    And the red probe is recorded in the milestone's VERIFICATION.md
