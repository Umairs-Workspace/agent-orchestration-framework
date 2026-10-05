@manual @cli @work @work-stream
Feature: a real loop repairs a lane halt and finishes

  WHY. Tasks 00 and 01 drive the hand-over against a scripted child. This is the one observation
  that a real Claude session, typed `/aof:repair`, really diagnoses a lane halt and hands back a
  loop that carries on by itself. A developer runs it in a scratch project, never the live work
  tree, and pastes the account, the repair run record and the repair session's closing statement
  into VERIFICATION.md. How the halt was provoked is recorded with the evidence.

  Rule: R3 · One repair per halt, after which the loop resumes on its own or stops

    Scenario: a provoked lane halt is repaired and the loop runs to its end
      Given a scratch project, outside the live work tree, holding a milestone of two refined stories
      And a lane halt provoked at one of its stories, the method recorded with the evidence
      When `aof work loop <milestone> --model continue=sonnet` runs with no other flag
      Then the account prints the halt, then `Repaired <stop> at <ref> (run <repairRunId>) — resuming <milestone>.`
      And the repair run on `<ref>` is settled `done` with `brief.loop.phase` `repair`
      And the loop's later drives record `sessions.continue` model `sonnet`
      And the loop ends at its normal close, or at a halt that is not the repaired one
