@executable @cli @assets @distribution
Feature: With a practice off the commands hold none of its prose

  WHY. About a fifth of the refine command applies only when discovery or the build brief is on,
  and every project loads it on every refine. After the move, a project is given a practice's
  prose only when it has turned the practice on (ADR-005 §1, §2).

  Each project below is a scratch project initialised from the shipped bundle for Claude, Codex
  and opencode, under its own "AOF_GLOBAL_HOME", then given a config and updated.
  "NONE" has no "work.examples" and no "work.plan". "BRIEF" sets "work.plan.enabled" to true.
  "DISCOVERY" sets "work.examples.enabled" to true. "BOTH" sets both.
  The "discovery words" are "EXAMPLES.md", "example map", "work.examples.enabled" and
  "discovery beat". The "brief words" are "PLAN.md", "work.plan.enabled" and "build brief".

  Rule: R1 · With a practice off, a project's commands hold none of its prose

    Scenario Outline: E1 · a project with nothing on holds neither practice's prose
      When NONE's "<artefact>" for "<runtime>" is read
      Then it holds none of the <words>
      And it holds no slot marker

      Examples:
        | artefact        | runtime  | words                               |
        | refine command  | claude   | discovery words and the brief words |
        | refine command  | opencode | discovery words and the brief words |
        | refine skill    | codex    | discovery words and the brief words |
        | PO brief        | claude   | discovery words                     |
        | PO brief        | opencode | discovery words                     |
        | PO brief        | codex    | discovery words                     |
        | architect brief | claude   | discovery words                     |
        | architect brief | opencode | discovery words                     |
        | architect brief | codex    | discovery words                     |
        | QA brief        | claude   | discovery words                     |
        | QA brief        | opencode | discovery words                     |
        | QA brief        | codex    | discovery words                     |

    Scenario: the refine skill is its entry and its procedure
      When NONE's Codex refine skill is read
      Then neither "SKILL.md" nor "procedure.md" holds a discovery word or a brief word

    Scenario: E2 · the build brief alone
      When BRIEF's refine command is read
      Then it holds the paragraph that opens "The build brief" and its four bullets
      And it holds none of the discovery words

    Scenario: E3 · discovery alone
      When DISCOVERY's refine command is read
      Then it holds the passage that opens "Discovery comes first"
      And it holds the paragraph that opens "With an applicable example map, formulate from it."
      And it holds none of the brief words

    Scenario: the Contract still reads as one procedure with nothing on
      When NONE's refine command is read
      Then its story Contract runs from its opening to "Formulation", the gate check and "Finish the story contract"
      And no two blank lines stand together where a passage was

    Scenario: a project with nothing on loads a shorter command
      When NONE's and BOTH's refine commands are compared
      Then NONE's is at least 80 lines shorter

    Scenario: the canonical render is a project with nothing on
      When the shipped manifest is regenerated
      Then it is byte for byte the committed manifest
      And the hash it records for the refine command is the hash of NONE's

  Scenario: FF-19208 · off renders no practice prose, and core holds none
    When "test/arch/practices/acd-off-renders-no-practice-prose.test.mjs" runs
    Then it fails unless NONE's refine command and its PO, architect and QA briefs, for each runtime, hold none of the discovery words
    And it fails unless NONE's refine command, for each runtime, holds none of the brief words
    And it fails unless core's own sources of those four members, their Codex texts included, hold none of them

  Scenario Outline: FF-19208 · each planted leak turns the control red
    Given <planted>
    When the FF-19208 cases run
    Then the control fails and names the file and the word

    Examples:
      | planted                                                                        |
      | the sentence "write no EXAMPLES.md" written back into core's refine source     |
      | a discovery fragment declared with no practice, so it renders everywhere       |
      | the map bullet left in the Codex text of the PO brief                          |
      | the build brief's paragraph left in the Codex refine procedure                 |
