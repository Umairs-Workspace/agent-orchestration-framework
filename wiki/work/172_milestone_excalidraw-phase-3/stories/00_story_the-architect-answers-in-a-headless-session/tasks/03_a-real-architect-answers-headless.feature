@manual @cli @work @design
Feature: A real claude answers a diagram note through the headless session

  WHY. The stand-in speaks the documented stream-json shapes, but two things RESEARCH Q1 did not
  measure — a slash command as the user message, and what a denied tool looks like on the stream —
  only a real `claude` shows (171 RETROSPECTIVE R1: test against a real session before review
  closes). The developer runs one small session through the conversations module against the
  test-bed's diagram and records the event log in VERIFICATION. It is a short paid run.

  Background:
    Given the test-bed project holds a diagram with an open note asking "What does this box do?"

  Rule: R1 · The first delivery for an open diagram starts its one session

    Scenario: the review invocation runs as a slash command and its answer is recorded
      When the developer delivers the note's review invocation through the conversations module
      Then "text" events arrive before the turn ends
      And the architect runs the scene command's "context" and "respond" actions in the turn
      And the note's thread holds the architect's answer afterwards
      And the event log and the session's first-text latency are recorded in VERIFICATION

  Rule: R4 · The architect can only do what the review needs

    Scenario: a tool outside the list is denied in the turn, not prompted
      When the developer delivers a second message asking the architect to run "git status"
      Then the turn ends without waiting on any prompt
      And its "turn-end" event names the denied tool
      And the denial's shape on the stream is recorded in VERIFICATION
