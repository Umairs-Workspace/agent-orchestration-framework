@manual @cli @work @work-stream
Feature: a real manual story walks from the guide through review

  WHY. Tasks 00 and 02 hold the prose and task 01 the door. This is the one observation that a
  real Claude session, typed `/aof:continue <ref> --manual`, prints a guide an operator can build
  from, and that `/aof:review <ref>` then reviews a hand-written change without touching it. A
  developer runs it in the standing mesh test-bed repository, never the live work
  tree, playing the operator, and pastes the guide, the `git status` before and after each command,
  and the review's closing report into VERIFICATION.md.

  Rule: R1 · A manual continue starts the story and hands the operator a guide, building nothing

    Scenario: a manual continue prints a guide and changes nothing outside the story folder
      Given a refined story in the test-bed whose scenarios are red, at `not-started`
      When `/aof:continue <ref> --manual` runs in a fresh Claude session
      Then the session prints the guide with every part task 00 names, and spawns no agent
      And `git status` shows no change outside the story's own folder
      And `aof work status <ref>` answers `in-progress`

  Rule: R3 · aof:review reviews the operator's build, and fixes nothing

    Scenario: the hand-written build is reviewed and moved to in-review
      Given the operator has made the story's scenarios green by hand, following the guide
      When `/aof:review <ref>` runs in a fresh Claude session
      Then the gate ladder runs, then the architect and QA lenses
      And `git diff` after the review is identical to `git diff` before it
      And with no Blocker, `aof work status <ref>` answers `in-review` and the report names `aof:verify <ref>` next
