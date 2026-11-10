@manual @cli @work @validate @memory
Feature: The live stream passes the hold the moment it lands, and the prompt says what it holds

  WHY. On 2026-10-04, 26 lessons in 14 live retrospectives would fail the hold. A rule that lands
  red is a gate nobody trusts, so the story that lands it re-classifies the live lessons, keeping
  every word the author wrote as a qualifier, and tells the retrospective's writer the rule. This
  is run by the developer on the real tree and recorded in VERIFICATION, because the live set moves
  as items are archived (134/01/R2).

  Rule: R3 · The live stream is green when the hold lands

    Scenario: E8 · validate over the live tree reports no meta-line problem
      Given the live set is re-measured at build, naming each lesson by item ref and id
      And each lesson in it is re-classified, its written word kept as the qualifier, as "**Kind:** near-miss (risk)"
      And each lesson in it with no meta line gains one authored from its own text
      When "aof work validate" is run from the repository root, source-run
      Then it reports no meta-line problem
      And VERIFICATION records each lesson's ref and id with its value before and after

    Scenario: an archived retrospective is left untouched
      When "git diff --stat" is read over the story's changes
      Then it names no RETROSPECTIVE.md under "wiki/work/archive/"

    Scenario: the retrospective prompt states the hold
      When the retrospective prompt's step 4 is read
      Then it says validate holds Kind, Area and Stage to the listed words, with a qualifier written after the word
      And it says Owner must be present
      And its Kind, Area and Stage lists are the vocabulary module's, which FF-14802 confirms
      And "aof work update" has refreshed the rendered copies under ".claude", ".opencode" and ".codex"
