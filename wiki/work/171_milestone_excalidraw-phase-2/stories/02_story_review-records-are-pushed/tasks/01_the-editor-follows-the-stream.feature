@executable @ui @work @design
Feature: The editor follows the stream — the panel refreshes and the canvas follows the saved draft, without a reload

  WHY. The operator reloaded the page to learn the architect had finished (F-170-13). The editor now
  reacts to the face's events: a `review` event refreshes the panel, a `scene` event re-reads the
  draft. Unsaved work is never replaced silently, and the five-second poll survives only as the
  fallback while the stream is down (ADR-003). The decisions live in a pure module the editor and
  its suite drive alike.

  Rule: R1 · What the architect writes appears in the open editor without a reload

    Scenario: E1 · a review event refreshes the panel
      Given the editor is open and its stream is connected
      When a "review" event arrives
      Then the editor re-reads the proposals once

    Scenario: E2 · a proposal written by the architect is listed after its event
      Given the editor is open, its stream is connected and the panel lists no proposal
      When the architect proposes for a note and its "review" event arrives
      Then the panel lists the pending proposal with Preview, Accept and Reject

    Scenario: a repeated stamp does not refresh twice
      Given the editor is open and its stream is connected
      When a "review" event arrives twice with the same stamp
      Then the editor re-reads the proposals once

    Scenario: E3 · a quiet minute makes no request
      Given the editor is open and its stream is connected
      When 60 seconds pass with no event
      Then the editor makes no proposals request in that minute

  Rule: R2 · The canvas follows a draft saved elsewhere, without losing unsaved work

    Scenario: E4 · a clean canvas takes the saved draft in place
      Given the canvas has no unsaved edits at revision "r1"
      When a "scene" event arrives for revision "r2"
      Then the editor re-reads the draft and replaces the canvas with revision "r2"
      And the status says the canvas was updated from the saved draft

    Scenario: E5 · unsaved edits are kept and a reload is offered
      Given the canvas has an unsaved shape at revision "r1"
      When a "scene" event arrives for revision "r2"
      Then the canvas keeps the unsaved shape
      And a line says the saved draft changed elsewhere, with a Reload button
      When the operator chooses Reload
      Then the canvas shows revision "r2" and the line closes

    Scenario Outline: the editor's own writes never look like a change made elsewhere
      Given the canvas is at revision "r1"
      When the editor <write>, the server answers revision "r2", and then a "scene" event arrives for revision "r2"
      Then the canvas is not replaced and no "changed elsewhere" line is shown

      Examples:
        | example | write                  |
        | E6      | saves                  |
        | E7      | accepts a proposal     |
        |         | publishes the figure   |

  Rule: R3 · When the stream cannot run, the editor still updates

    Scenario Outline: the poll runs only while the stream is down
      Given the editor is open and visible
      When the stream <state>
      Then the five-second poll is <poll>

      Examples:
        | example | state                          | poll    |
        | E8      | is answered 404                | running |
        |         | errors after connecting        | running |
        |         | connects                       | stopped |
        |         | reconnects after an error      | stopped |

    Scenario: E10 · a hidden tab closes the stream, and showing it refreshes once and reconnects
      Given the editor is open and its stream is connected
      When the tab is hidden
      Then the stream is closed and no poll runs
      When the tab is shown again
      Then the editor re-reads the proposals once and reconnects the stream
