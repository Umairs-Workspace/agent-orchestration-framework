@executable @cli @work @distribution
Feature: A change is owed in the journal, once per workspace

  WHY. A change no verb raised had no entry in the journal, so nothing owed it to the store. A
  noticed change now appends a "workspace.changed" mark to the same effects journal, drained by the
  same publish reactor a verb event uses. The mark is idempotent, and a newer mark for the same
  workspace supersedes any older one still owed, so a workspace owes at most one sync at a time.

  Background:
    Given an isolated global store and effects journal
    And a mesh-propagating workspace "aof" that has been published and observed once

  Rule: R3 · Each workspace owes at most one sync at a time

    Scenario: a noticed change appends one mark drained by the publish reactor
      Given the STORY.md of "164/00" is hand-edited to "in-progress"
      When the sync pass notices the change
      Then the journal holds one "workspace.changed" event for "aof"
      And its "publish-projection" step is owed at the "local" locus

    Scenario: E9 · newer marks supersede older owed ones for the same workspace
      Given three different changes to "aof" are each noticed before anything drains
      When the journal is read
      Then exactly one "workspace.changed" step for "aof" is owed
      And the two older steps are "superseded"

    Scenario: E10 · noticing the same workspace state twice appends one event
      Given the STORY.md of "164/00" is hand-edited to "in-progress"
      When the sync pass notices the same state twice
      Then the journal holds one "workspace.changed" event for that state

    Scenario: E11 · a verb's event is never superseded by a mark
      Given an "item-status.changed" event for "164/00" is owed
      When a "workspace.changed" mark for "aof" is appended
      Then the "item-status.changed" event's steps are still owed

    Scenario: a journal written before this change opens and gains the collapse key
      Given an effects journal at schema version 1 holding an owed step
      When the journal is opened
      Then its schema version is 2
      And the owed step is still owed
