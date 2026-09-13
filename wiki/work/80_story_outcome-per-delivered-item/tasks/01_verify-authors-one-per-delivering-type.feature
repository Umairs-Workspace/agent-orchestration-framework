@cli @work @work-stream @validate
Feature: aof:verify authors an OUTCOME.md for a milestone, a story and a chore — and says, rather than omits, that a spike and a uat carry none

  THREE TYPES DELIVER; TWO DO NOT, AND BOTH HALVES ARE DECISIONS. A milestone, a story and a chore
  each change what the system IS, so each owes one statement of it. A spike's whole deliverable is a
  recorded finding in `SPIKE.md` `## Finding` — knowledge, not system state. A uat's is a verdict in
  `SESSION.md` over items that already carry their own outcomes, so an outcome there would index the
  same capability a second time under a second item. Both exclusions are written INTO the prompt,
  because an omission reads as an oversight and gets "fixed" by the next person to notice it.

  A CHORE'S TICK IS AN ACT; ITS OUTCOME IS A STATE. "Ticked: pin the rendered tree `text eol=lf`" is
  what was done; "the rendered tree is byte-stable across platforms" is what a later reader needs.
  ADR-003 keeps a chore ceremony-light on purpose and this must not quietly turn one into a story:
  the deliverable stays the ticked `## Definition of Done`, and the outcome adds `## Delivered`
  alone. Assumptions and Gaps stay optional and are normally empty.

  A MILESTONE'S OUTCOME IS AUTHORED, NEVER A CONCATENATION. The aggregation the ask names happens in
  the INDEX, not in the document: `buildRecords` already unions every item's records into one recall
  surface, so a milestone that restates its stories' capabilities writes one fact twice — two writers
  for one fact, and two records every recall must then dedupe. The milestone states what is true AT
  THE MILESTONE LEVEL that no single story's outcome states alone; where a story states a capability
  whole, the milestone CITES it (`m<NN/SS>/<id>`) rather than repeating it.

  ONE WRITER PER DOCUMENT, AND IT IS STILL VERIFY. 39/ADR-004 is widened only in WHICH items get an
  outcome — never in who authors one. A developer/evidence subagent has `Write` and has been observed
  to clobber records and fabricate decisions; that rule is untouched.

  RECORDDOC IS UNTOUCHED. `SPEC.md` / `STORY.md` / `CHORE.md` stay the identity records; `OUTCOME.md`
  is an ADDITIONAL artifact for every type, and validate still runs on the identity record.

  @manual
  Scenario Outline: Accept authors an outcome for a delivering item and none for a non-delivering one
    Given a <type> whose acceptance criteria are met
    When aof:verify accepts it
    Then an OUTCOME.md is <authored> in the item's own folder
    And its identity record doc is still <record>
    And the accept decision is recorded in <record>, not in OUTCOME.md

    Examples:
      | type      | authored     | record     |
      | milestone | authored     | SPEC.md    |
      | story     | authored     | STORY.md   |
      | chore     | authored     | CHORE.md   |
      | spike     | not authored | SPIKE.md   |
      | uat       | not authored | SESSION.md |

  # The decision has to be READABLE in the prompt, or the next agent re-derives it differently.
  @executable
  Scenario: the verify prompt names each type's answer explicitly
    Given the shipped "aof:verify" bundle command
    When I read its Outcome step
    Then it names milestone, story and chore as the types it authors an OUTCOME.md for
    And it names spike and uat as types that carry none, with the reason for each
    And it instantiates the template from ".aof/templates/work/shared/OUTCOME.md"
    And no other shipped bundle prompt instructs anyone to author an OUTCOME.md

  @executable
  Scenario: the developer agent is still never instructed to author an OUTCOME.md
    Given the shipped "aof-developer" agent
    When I search it for an instruction to write, author, fill or edit OUTCOME.md
    Then none is present

  @executable
  Scenario Outline: an item's primary record doc is its identity doc — never OUTCOME.md
    Given an item of type "<type>"
    When its record doc is resolved
    Then it is "<record>"
    And it is never "OUTCOME.md"

    Examples:
      | type      | record     |
      | milestone | SPEC.md    |
      | story     | STORY.md   |
      | uat       | SESSION.md |
      | spike     | SPIKE.md   |
      | chore     | CHORE.md   |

  @executable
  Scenario Outline: a delivering item carrying an OUTCOME.md still validates on its identity record
    Given a <type> carrying both its identity record doc and an authored OUTCOME.md
    When I run "aof work validate" and "aof work doctor" over it
    Then validate passes
    And no finding names OUTCOME.md as an unexpected or unrecognised artifact
    And removing the OUTCOME.md changes neither result

    Examples:
      | type      |
      | story     |
      | chore     |

  @executable
  Scenario: a chore's outcome is admitted with Delivered alone
    Given a chore OUTCOME.md that fills "## Delivered" and leaves Assumptions and Gaps empty
    When it is parsed
    Then one capability record is produced
    And no gap record is produced
    And no error is raised for the empty sections

  @manual
  Scenario: a milestone's outcome states milestone-level state and does not restate a story's
    Given a milestone whose stories each carry an authored OUTCOME.md
    When aof:verify authors the milestone's own OUTCOME.md
    Then each "### " capability names something no single story's outcome states alone
    And no capability heading is byte-identical to a capability heading in a story's outcome under it
    And where a story states a capability whole, the milestone cites it as `m<NN/SS>/<id>` rather than repeating it
    And the milestone's OUTCOME.md is a statement, not a concatenation of its stories' Delivered sections

  @manual
  Scenario Outline: a Delivered entry is admitted only when it states product state, not motive
    Given a proposed Delivered line "<line>"
    When aof:verify judges it at Accept
    Then it is <verdict>

    Examples:
      | line                                                                 | verdict                                    |
      | the rendered tree is byte-stable across platforms                    | admitted — product state                    |
      | we pinned the tree to LF so Windows checkouts stop churning          | refused — motive, belongs in RETROSPECTIVE  |
      | `--if-applicable` narrows exactly one refusal code to an exit-0 report| admitted — product state                    |
      | for testing purposes                                                 | refused — reasoning, not an outcome         |
