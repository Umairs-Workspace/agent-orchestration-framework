@executable @cli @work @validate @memory
Feature: Doctor flags an archived retrospective's non-conforming lessons, and validate never fails them

  WHY. Archived retrospectives are never back-filled (SPEC; origin §7), so an error on one is a red
  that no legal act can clear. ADR-007 makes the archived case advisory: one doctor warning per
  archived retrospective that holds a non-conforming lesson, from a lane whose codes are its own
  frozen array, so 124/FF-12402 keeps it from gating.

  THE FIXTURE BELOW: a temp stream whose "archive/" holds "46_milestone_terminal-control" (status
  done), whose RETROSPECTIVE.md holds R1 to R15 with no meta line, and "01_milestone_acd-asset-bundle"
  (status done), whose RETROSPECTIVE.md holds R1 to R4, every meta value starting with a vocabulary
  word ("build→verify", "refine→build" among them).

  Rule: R2 · An archived lesson is flagged, never failed and never rewritten

    Scenario: E6 · an archived retrospective of 15 unconforming lessons is one warning
      When "aof work doctor --json" is run
      Then it reports exactly one "lesson-meta-archived" finding for 46's RETROSPECTIVE.md, at severity "warn"
      And its message names 15 lessons and the ids "R1" through "R15"
      And "aof work validate" reports no problem for 46's RETROSPECTIVE.md

    Scenario: E7 · an archived retrospective whose lessons all conform is not flagged
      When "aof work doctor --json" is run
      Then it reports no "lesson-meta-archived" finding for 01's RETROSPECTIVE.md

    Scenario: a live retrospective is never flagged by the archived lane
      Given the live milestone "134_milestone_discovery" holds a retrospective with one non-conforming lesson
      When "aof work doctor --json" is run
      Then it reports no "lesson-meta-archived" finding for 134's RETROSPECTIVE.md

    Scenario: the doctor reads and never writes the archived retrospective
      Given the bytes of 46's RETROSPECTIVE.md
      When "aof work doctor" is run
      Then 46's RETROSPECTIVE.md holds the same bytes

    Scenario: the lane's codes cannot reach the gate
      When the lane module "packages/work/src/doctor/lesson-meta.mjs" is read
      Then it exports "LESSON_META_FINDING_CODES" as a frozen array holding "lesson-meta-archived"
      And no code in it is a member of "CONTROL_FINDING_CODES"
