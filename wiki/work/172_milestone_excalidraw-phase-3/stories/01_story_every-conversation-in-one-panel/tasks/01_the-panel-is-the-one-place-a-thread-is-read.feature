@manual @ui @work @design
Feature: The panel is the one place a thread is read, opened from its pin or from the panel

  WHY. The operator ruled at refine that a note's conversation opens in one panel beside the canvas
  (172/01 Q1). The review list and the note bar under the canvas, and the popover beside a shape, go;
  a pin and the canvas ask open threads in the panel instead (ADR-003). How the panel opens, scrolls
  and focuses can only be seen in a browser, so the developer drives it with the browser smoke over
  171's diagram and records each check in VERIFICATION.

  Background:
    Given the browser smoke serves "ADR-003-push-stream.excalidraw" with notes on "Events route", "Architect session" and "Editor"

  Rule: R2 · A thread is opened from its shape or from the panel, and only one is open

    Scenario: E5 · a pin opens its thread at the top of the panel and closes the open one
      Given the "Architect session" thread is open in the panel
      When the developer chooses the pin on "Events route"
      Then the "Events route" thread is open at the top of the panel
      And the "Architect session" thread is collapsed
      And nothing opens over the canvas

    Scenario: E6 · a pin opens a collapsed panel on its thread
      Given the panel is collapsed
      When the developer chooses the pin on "Events route"
      Then the panel is open with the "Events route" thread open

    Scenario: E7 · Show on canvas selects the thread's shapes and brings them into view
      Given "Architect session" is scrolled out of view
      When the developer chooses "Show on canvas" in the "Architect session" thread
      Then the "Architect session" shapes are selected and inside the visible canvas

    Scenario: asking at the selection opens the new thread in the panel
      When the developer asks "Why does the route re-stamp?" with the canvas's Ask architect on "Events route"
      Then a new "Events route" thread is open at the top of the panel holding that question

  Rule: R3 · The panel's composer asks about the selection, or saves a note

    Scenario Outline: the composer names what it will ask about
      Given <selection>
      Then the composer's label reads "<label>"

      Examples:
        | example | selection                         | label                                     |
        | E8      | "Events route" is selected        | Ask the architect · about Events route    |
        | E9      | nothing is selected               | Ask the architect · about the whole diagram |

    Scenario: E10 · Save as note records a waiting note and sends nothing
      Given "Editor" is selected
      When the developer types "Should a hidden tab stop the stream?" and chooses Save as note
      Then an "Editor" thread reads "Waiting for the architect"
      And no session is started and nothing is typed anywhere

    Scenario: the review list and the note bar are gone from under the canvas
      When the editor has loaded
      Then no "Add note" bar and no review list are rendered under the canvas
      And no thread popover exists on the canvas

  Rule: R5 · A read-only diagram is read, never written

    Scenario: E13 · a delivered item's diagram reads with no way to write
      Given the diagram belongs to a delivered item
      When the editor has loaded
      Then the threads and proposals are listed
      And there is no composer, no reply field and no Preview, Accept or Reject
