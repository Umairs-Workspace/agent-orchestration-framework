@executable @cli @work @validate @memory
Feature: Validate fails a live item's lesson whose meta line is outside the vocabulary

  WHY. The retrospective prompt prescribes four kinds, five areas and three stages, and nothing
  checks them, so a fifth of the lessons are reachable by no kind filter. ADR-007 holds the meta
  line where the additive checks live, in the validate command, as an error on every live row's
  retrospective, whatever the row's type. A qualifier after the word stays legal: story 02 indexes
  it as a tag.

  THE FIXTURE BELOW: a temp stream with the live milestone "134_milestone_discovery" (status
  in-progress), its story "01_story_the-baseline-is-counted", the parentless story
  "144_story_the-whole-tree-run" and the parentless story "146_story_a-capture". Each scenario
  writes the RETROSPECTIVE.md it names. "aof work validate" is run from the stream's project root.

  Rule: R1 · A live lesson's Kind, Area and Stage are vocabulary words, a qualifier allowed, and its Owner is present

    Scenario: E1 · a non-vocabulary Area in a nested story's lesson is an error
      Given 134/01's retrospective holds "## R1 — a contract cited a file no branch carried" with "- **Kind:** mistake · **Area:** planning · **Stage:** refine · **Owner:** product-owner"
      When "aof work validate" is run
      Then it exits non-zero
      And it reports 134/01's RETROSPECTIVE.md with a problem naming "R1", "Area", "planning" and "code | architecture | contract | security | process"

    Scenario: E2 · a non-vocabulary Kind in a parentless story's lesson is an error
      Given 144's retrospective holds "## R2" with "- **Kind:** risk · **Area:** process · **Stage:** verify · **Owner:** product owner"
      When "aof work validate" is run
      Then it reports 144's RETROSPECTIVE.md with a problem naming "R2", "Kind", "risk" and "mistake | blocker | near-miss | misunderstanding"
      And the problem says a qualifier goes after the word, as "near-miss (risk)"

    Scenario: E3 · a lesson with no meta line is reported on all four fields
      Given 146's retrospective holds "## R1 — A new test file is a budget change" followed only by prose
      When "aof work validate" is run
      Then it reports 146's RETROSPECTIVE.md with problems naming "R1" and each of "Kind", "Area", "Stage" and "Owner" as missing

    Scenario: E4 · vocabulary words with qualifiers conform
      Given 134's retrospective holds "## R1" with "- **Kind:** near-miss (recurring) · **Area:** process · **Stage:** build (caught at review) · **Owner:** developer"
      When "aof work validate" is run
      Then it reports no problem for 134's RETROSPECTIVE.md

    Scenario: E5 · an empty Owner is an error
      Given 134's retrospective holds "## R1" with "- **Kind:** mistake · **Area:** code · **Stage:** build · **Owner:**"
      When "aof work validate" is run
      Then it reports 134's RETROSPECTIVE.md with a problem naming "R1" and "Owner" as missing

    Scenario Outline: the meta line is read as the parser reads it
      Given 134's retrospective holds "## R1" with the meta "<meta>"
      When "aof work validate" is run
      Then it reports <count> problem(s) for 134's RETROSPECTIVE.md

      Examples:
        | meta                                                                                                 | count |
        | - **Kind:** Near-Miss · **Area:** Architecture · **Stage:** Build · **Owner:** architect                | 0     |
        | - **Kind:** near-miss · **Area:** code\n- **Stage:** verify · **Owner:** qa                             | 0     |
        | - **Kind:** mistakes · **Area:** code · **Stage:** build · **Owner:** developer                         | 1     |
        | - **Kind:** near-miss · **Area:** code · **Stage:** build→verify · **Owner:** developer                 | 0     |
        | - **Kind:** blocker · **Area:** memory/accounting · **Stage:** build · **Owner:** developer             | 1     |

    Scenario: a validate scoped to one item reports only that item's lessons
      Given 134/01's and 144's retrospectives each hold one non-conforming lesson
      When "aof work validate 144" is run
      Then it reports 144's RETROSPECTIVE.md
      And it does not report 134/01's RETROSPECTIVE.md

    Scenario: an item with no retrospective is not reported
      Given no item in the stream carries a RETROSPECTIVE.md
      When "aof work validate" is run
      Then it reports no meta-line problem
