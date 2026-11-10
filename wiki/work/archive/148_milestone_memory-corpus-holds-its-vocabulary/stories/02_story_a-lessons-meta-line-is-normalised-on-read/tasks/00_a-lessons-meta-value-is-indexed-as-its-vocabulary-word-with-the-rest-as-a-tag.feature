@executable @cli @work @memory
Feature: A lesson's Kind, Area and Stage are indexed as the vocabulary word they start with, the rest kept as a tag

  WHY. The retrospective prompt prescribes four kinds, five areas and three stages. About 50 lessons
  write one of those words with a qualifier after it ("near-miss (recurring)"). The scope filter
  matches them only by substring accident, and nothing can count them. ADR-002 normalises on read,
  in the one parser, so both backends and "aof work tune" see the same values. The source is never
  rewritten, and a value that starts with no vocabulary word is kept as written and counted, never
  mapped (the operator's ruling, Q1).

  THE FIXTURE BELOW: a RETROSPECTIVE.md whose "## R1 — <title>" section carries the meta line each
  scenario names, then "- **What happened:** x", "- **Why:** y" and "- **Lesson:** z". It is parsed
  by "parseRetrospective" with item "40".

  Rule: R1 · A value that starts with one of the vocabulary's words is indexed as that word, and the rest becomes a tag

    Scenario: E1 · a Kind with a parenthetical qualifier
      Given the meta line "- **Kind:** near-miss (cross-milestone, discovered here) · **Area:** memory/accounting · **Stage:** verify · **Owner:** architect"
      When the retrospective is parsed
      Then the lesson's kind is "near-miss"
      And its tags are ["cross-milestone, discovered here"]

    Scenario: E2 · a Stage with a parenthetical qualifier
      Given the meta line "- **Kind:** mistake · **Area:** code · **Stage:** build (caught at review) · **Owner:** developer"
      When the retrospective is parsed
      Then the lesson's stage is "build"
      And its tags are ["caught at review"]

    Scenario: E3 · an Area with a parenthetical qualifier
      Given the meta line "- **Kind:** near-miss · **Area:** process (calibration) · **Stage:** refine · **Owner:** architect"
      When the retrospective is parsed
      Then the lesson's area is "process"
      And its tags are ["calibration"]

    Scenario: E4 · a word written in another case is the vocabulary word
      Given the meta line "- **Kind:** Near-Miss · **Area:** Code · **Stage:** Build · **Owner:** developer"
      When the retrospective is parsed
      Then the lesson's kind is "near-miss", its area "code" and its stage "build"
      And its tags are []

    Scenario: E5 · a remainder that is not in parentheses is kept as written
      Given the meta line "- **Kind:** near-miss · **Area:** architecture · **Stage:** build→verify · **Owner:** architect"
      When the retrospective is parsed
      Then the lesson's stage is "build"
      And its tags are ["→verify"]

    Scenario: qualifiers from several fields are tags in field order, without repeats
      Given the meta line "- **Kind:** near-miss (recurring) · **Area:** process (recurring) · **Stage:** build (caught at review) · **Owner:** qa"
      When the retrospective is parsed
      Then its tags are ["recurring", "caught at review"]

    Scenario: a meta split across two lines is read whole, as before
      Given the meta lines "- **Kind:** blocker (stall) · **Area:** process" and "- **Stage:** build · **Owner:** orchestrator · **Raised by:** observe"
      When the retrospective is parsed
      Then the lesson's kind is "blocker", its area "process" and its stage "build"
      And its tags are ["stall"]

    Scenario: only the indexed fields change; title, summary, text, owner and source do not
      Given the meta line "- **Kind:** near-miss (recurring) · **Area:** code · **Stage:** build · **Owner:** developer (Story 00)"
      When the retrospective is parsed
      Then the lesson's owner is "developer (Story 00)"
      And its title, summary, text and source equal those a parse of the same file with the meta line "- **Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer (Story 00)" yields

  Rule: R2 · A value that does not start with a vocabulary word is kept as written, and counted

    Scenario: E6 · a word that runs on past a vocabulary word is not that word
      Given the meta line "- **Kind:** mistakes · **Area:** code · **Stage:** build · **Owner:** developer"
      When the retrospective is parsed
      Then the lesson's kind is "mistakes"
      And its tags are []

    Scenario: E7 · a Kind outside the vocabulary is kept as written, never mapped
      Given the meta line "- **Kind:** blind spot · **Area:** contract · **Stage:** refine · **Owner:** qa"
      When the retrospective is parsed
      Then the lesson's kind is "blind spot"
      And its tags are []

    Scenario Outline: other words outside the vocabulary are kept as written
      Given the meta line "- **Kind:** <kind> · **Area:** <area> · **Stage:** <stage> · **Owner:** developer"
      When the retrospective is parsed
      Then the lesson's kind is "<kind>", its area "<area>" and its stage "<stage>"

      Examples:
        | kind               | area              | stage    |
        | defect             | testing           | continue |
        | confirmed approach | planning          | review   |
        | process            | memory/accounting | accept   |

    Scenario: E8 · a lesson with no meta line is indexed blank, never guessed
      Given an "## R1 — A harness that cannot express a side effect" section of prose only, its text naming "near-miss"
      When the retrospective is parsed
      Then the lesson's kind, area and stage are ""
      And its tags are []

    Scenario: the tune corpus reads the same values the index does
      Given a stream whose milestone "40" carries the E1 retrospective
      When the "aof work tune" corpus reads its lessons
      Then the lesson from "40" carries kind "near-miss" and tags ["cross-milestone, discovered here"]
