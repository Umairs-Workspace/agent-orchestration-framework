@cli @assets @round-trip
Feature: With a practice on the command says what it says today

  WHY. The move is a relocation. Milestones 134, 135 and 136 decided what discovery's prose says,
  and 96 what the build brief says; nothing here reopens a sentence. A project that has a
  practice on must be handed the words it is handed today (ADR-005 §4, §5).

  "BOTH" is a scratch project with "work.examples.enabled" and "work.plan.enabled" both true,
  rendered for Claude, Codex and opencode. "Collapsed" means every run of whitespace is read as
  one space. This checkout has both keys on.

  Rule: R2 · With a practice on, the command says what it says today

    @manual
    Scenario: E4 · the Claude commands changed only at the seam
      Given this checkout's rendered refine command, PO brief, architect brief and QA brief, for Claude and for opencode
      When each is compared, collapsed, with the same file at the commit before this story
      Then the three briefs are the same
      And the refine command differs only in that its Contract no longer says "opening with the discovery beat below when the project has turned it on"

    @manual
    Scenario: E5 · the Codex texts changed only at the seams
      Given this checkout's Codex refine skill and its three Codex briefs
      When each is compared, collapsed, with the same file at the commit before this story
      Then the three briefs are the same
      And the procedure differs only by the Contract's opening, as for Claude
      And the entry differs only in that "before writing tasks; retain" now reads "before writing tasks. Retain"

    @executable
    Scenario: every passage that moved is rendered once
      When BOTH's refine command is read
      Then each of these openings appears exactly once: "Discovery comes first", "With an applicable example map, formulate from it.", "The build brief", "When `work.examples.enabled` is on, a business-rule" and "When `work.examples.enabled` is on, it lists"

    @executable
    Scenario: the passages stand in the order they stood in
      When BOTH's refine command is read
      Then the discovery beat comes before "Formulation"
      And the formulation from the map comes before "Under orchestrated mode"
      And the build brief comes after "Finish the story contract" and before the "--autonomous" block

    @executable
    Scenario: a moved passage keeps its place in its list
      When BOTH's refine command is read
      Then the discovery beat is still indented as part of the story Contract's bullet
      And the map bullet of BOTH's PO brief is still a bullet of its ownership list, with its four sub-bullets beneath it

    @executable
    Scenario: a fragment still says when it applies
      When BOTH's refine command is read
      Then the discovery beat still says to read "work.examples.enabled" and what to do when it is off
      And the build brief still says to read "work.plan.enabled" and that it defaults to false

    @executable
    Scenario Outline: the Codex text keeps its own wording
      When BOTH's Codex "<artefact>" is read
      Then it holds "<codex wording>"
      And it does not hold "<claude wording>"

      Examples:
        | artefact         | codex wording                          | claude wording  |
        | refine procedure | the available native question tool     | AskUserQuestion |
        | refine procedure | native question request                | AskUserQuestion |
        | refine procedure | structured `needs_input` phase result  | /aof:           |

    @executable
    Scenario: this checkout's committed copies are what the bundle renders
      When "aof work update --dry-run --json" runs in this checkout
      Then it plans no change to any rendered command, agent or skill

    @executable
    Scenario: milestones 134, 135 and 136 still hold
      When the discovery prose suite and the specification-by-example package's suites run
      Then every case passes
