@manual @ui @work @design
Feature: An answer is seen streaming into its thread in a real browser

  WHY. The reducers are headless; whether text visibly grows in the panel, whether the recorded turn
  replaces it without a flicker, and whether any terminal appears, can only be seen. The browser
  smoke runs the real `aof work ui` with a stand-in architect launched through
  `AOF_ARCHITECT_EXECUTABLE` (ADR-001 §5), so no paid session starts. The developer runs it and reads
  the screenshots against DESIGN's "The conversation panel" mock and checklist, recording the result
  in the milestone's VERIFICATION.

  Background:
    Given the browser smoke serves item 171's "ADR-003-push-stream.excalidraw" with the stand-in architect

  Rule: R1 · Asking delivers the question to the architect's session, and its answer streams into the new thread

    Scenario: E1 · the answer visibly grows in the new thread, and no terminal appears
      When the developer asks "Why does the route re-stamp?" at the selected "Events route" box
      Then the new thread opens in the panel reading "Starting the architect…"
      And two screenshots taken while the stand-in streams show the answer longer in the second
      And no ".xterm" element exists on the page

  Rule: R4 · What the architect records replaces what streamed

    Scenario: E8 · the stand-in's recorded answer replaces the live turn
      When the stand-in finishes and records its answer with respond
      Then the thread shows the recorded answer with no caret and no activity list
      And the "Events route" pin reads answered

  Rule: R2 · A reply continues the thread, and the next answer streams the same way

    Scenario: E4 · a reply's answer streams under it
      When the developer replies "And if the watch cannot start?" in the same thread
      Then the reply appears as the developer's turn
      And the stand-in's second answer grows under it, then is replaced by its recorded turn
      And the screenshots read against DESIGN's "The conversation panel" mock and checklist are recorded in VERIFICATION
