@executable @cli @distribution @design
Feature: With the practice on, a milestone's DESIGN.md template records design-system changes, and with it off the template is today's

  WHY. An owned system follows its code (ADR-007). A milestone that changes tokens or components
  says so in DESIGN.md, under "## Design-system changes", so verify knows what the re-sync carries
  and a reader knows what moved. In "reference" mode, a gap goes under "## Design-system gaps" for
  the system's owner (02). Both sections arrive as the practice's variant of the milestone
  DESIGN.md template (192/ADR-004). A project with the practice off keeps today's template.

  The variant is core's template byte for byte, with the two sections inserted, so it cannot
  drift from core's default unnoticed.

  "On" is "work.ui.designSystem" = {"enabled": true, "name": "AOF", "mode": "owned", "source":
  ["apps/ui/src/index.css"]}. "The template" is ".aof/templates/work/milestone/DESIGN.md". "Today's"
  is core's "packages/acd/assets/templates/milestone/DESIGN.md" as rendered.

  Rule: R1 · With the practice on, a milestone's DESIGN.md template records design-system changes, and with it off the template is today's

    Scenario: E1 · with no work.ui block the template is today's
      Given a project with no "work.ui" block
      When "aof work update" runs
      Then the template is today's byte for byte

    Scenario: E2 · with the practice on the template carries the two sections
      Given the practice is on
      When "aof work update" runs
      Then the template holds "## Design-system changes", then "## Design-system gaps", just before "## Behavioural outcomes (cross-reference)"
      And with both sections taken out, the template is today's byte for byte

    Scenario: E3 · turning the practice off restores today's template, and a person's edit is kept
      Given the practice was on and "aof work update" rendered the variant
      When the practice is turned off and "aof work update" runs
      Then the template is classified "update" and is today's again
      But when a person had edited the rendered template, it is classified "drift-warning" and left as it was

    Scenario Outline: a block that is not on keeps today's template
      Given "work.ui.designSystem" is <block>
      When "aof work update" runs
      Then the template is today's byte for byte

      Examples:
        | block                                                  |
        | {"enabled": false, "name": "AOF", "mode": "owned", "source": ["apps/ui/src/index.css"]} |
        | {"enabled": "true", "name": "AOF", "mode": "reference"} |

    Scenario: the sections say what each mode writes
      Given the practice is on
      When "aof work update" runs
      Then "## Design-system changes" says that in "owned" mode each changed token is named with its new value, and each changed component with what changed, or the section reads "None."
      And that verify re-syncs the system from the code at the milestone's accept
      And "## Design-system gaps" says that in "reference" mode each gap names what the system lacks, for its owner, and that the gap is drawn with the system's existing tokens

    Scenario: the variant is core's template with the sections inserted
      Given the package's practice suite
      When a line of core's milestone DESIGN.md template is changed and the variant is not
      Then the suite fails, naming the template and the first line that differs

  Scenario: the variant is registered for the milestone template alone
    Given the design-system bundle
    When it is loaded
    Then it holds one "template-variant" member, for practice "design-system", template "milestone" and name "DESIGN.md"
    And no other shipped practice holds a variant of "DESIGN.md", so turning on another practice beside it is never refused as two variants of one file
