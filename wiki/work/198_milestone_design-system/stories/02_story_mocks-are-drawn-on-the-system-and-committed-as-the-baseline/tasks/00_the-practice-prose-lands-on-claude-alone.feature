@executable @cli @adapter @distribution @design
Feature: The design-system practice's prose reaches Claude's refine, verify and designer brief, and no other runtime's

  WHY. Drawing a canvas needs the Artifact tool, which only Claude has (ADR-001, ADR-002). The
  practice therefore adds three Claude-only fragments, through 00's runtime scoping:
  - refine's canvas step;
  - verify's pull-back of an approved canvas;
  - the designer brief's rule relating a mock to the system.

  Each one fills a slot this story adds. The slots are refine's "decide.designer", aof-designer's
  "ownership.design-system" and verify's "conformance.baseline", each mirrored in its Codex section
  of workflow.md (192/ADR-002 §7). With the practice off, a slot leaves nothing behind (FF-19205),
  so every render is today's. The designer's tools never change (FF-19803).

  "On" is "work.ui.designSystem" = {"enabled": true, "name": "AOF", "mode": "owned", "source":
  ["apps/ui/src/index.css"]}. "The baselines" are the golden renders under "test/golden/baselines".

  Rule: R1 · The practice's prose reaches Claude's refine, verify and designer brief, and no other runtime's, and with it off every render is today's

    Scenario: E1 · with no work.ui block every render is today's
      Given a project with no "work.ui" block
      When the bundle is rendered for "claude", "codex" and "opencode"
      Then the rendered refine, verify and aof-designer equal the baselines byte for byte
      And no rendered file holds "slot:"

    Scenario Outline: a block that is not on changes no render
      Given "work.ui.designSystem" is <block>
      When the bundle is rendered for "claude", "codex" and "opencode"
      Then every rendered file is byte-identical to the render with no "work.ui" block

      Examples:
        | block                                                      |
        | {"enabled": false, "name": "AOF", "mode": "reference"}     |
        | {"enabled": "true", "name": "AOF", "mode": "reference"}    |

    Scenario: E2 · with the practice on, Claude's three texts hold its prose and the others hold none
      Given the practice is on
      When the bundle is rendered for "claude", "codex" and "opencode"
      Then ".claude/commands/aof/refine.md" holds the canvas step's body
      And ".claude/commands/aof/verify.md" holds the pull-back's body
      And ".claude/agents/aof-designer.md" holds the system rule's body
      And none of those bodies is in ".opencode/commands/aof/refine.md", ".opencode/commands/aof/verify.md" or ".opencode/agents/aof-designer.md"
      And none is in any file of the Codex skills "aof-refine" and "aof-verify", or in ".codex/agents/aof-designer.toml"
      And no rendered file holds "slot:"

    Scenario: the Codex and OpenCode renders are unchanged when the practice is on
      When the bundle is rendered for "codex" and "opencode" with the practice on, and again with it off
      Then both renders write the same files with the same bytes

    Scenario: E3 · the designer's tools are the same in every runtime, on or off
      When the bundle is rendered for "claude", "codex" and "opencode", with the practice on and with it off
      Then each render of aof-designer grants exactly Read, Grep, Glob, Write, Edit, WebSearch and WebFetch
      And no fragment the bundle ships names a tool for "aof-designer"

    Scenario: Claude's refine says how a canvas is drawn and approved
      Given the practice is on
      When the bundle is rendered for "claude"
      Then ".claude/commands/aof/refine.md" says the step replaces the mock elicitation, offering neither the binding checklist alone nor the operator's own mocks (amended 2026-11-27, F-05)
      And that the milestone's page comes from "aof design-system canvas pages", and boards already on it are the starting point, never redrawn from scratch
      And that a "name" is resolved among the Design Systems the operator can open, and that no match or more than one is a stop naming every candidate's title and link
      And that the approval is a question carrying the canvas link, answered Approve, Revise or Later, one question per ask in a driven session
      And that only an approved canvas is pulled back, then imported with "aof design-system mocks import" and framed with "aof design-system mocks capture"
      And that nothing is ever published to the system

    Scenario: Claude's verify pulls back an approved canvas before the judge
      Given the practice is on
      When the bundle is rendered for "claude"
      Then ".claude/commands/aof/verify.md" says that a canvas DESIGN.md names as awaiting approval is put to the operator before the fidelity judge runs
      And that once approved it is pulled back, imported and captured, and the frames are the baseline handed to the judge
      And that a Later leaves the binding checklist as the baseline

    Scenario: Claude's designer brief relates a mock to the system
      Given the practice is on
      When the bundle is rendered for "claude"
      Then ".claude/agents/aof-designer.md" says a mock is drawn with the configured system's tokens and components
      And that in "reference" mode what the system lacks is named under "## Design-system gaps" in DESIGN.md and drawn with the system's existing tokens
      And that the designer never asks for the system itself to be changed

  Scenario: the control holds both legs and cannot pass vacuously
    Given "test/arch/practices/acd-runtime-scoped-prose.test.mjs" (FF-19802) is registered in "test/arch/practices/index.mjs"
    When the claude leg's assertion is removed from a copy of the bundle, or one fragment is made unscoped
    Then the control fails, naming the fragment and the runtime
    And the red probe is recorded in the milestone's VERIFICATION.md

  Scenario: the designer control covers the practice
    Given "test/arch/ui/acd-design-role-split.test.mjs" (FF-19803) renders aof-designer with every shipped practice on
    When a fragment that grants the designer "Bash" is added to a copy of the bundle
    Then the control fails, naming the tool
    And the red probe is recorded in the milestone's VERIFICATION.md
