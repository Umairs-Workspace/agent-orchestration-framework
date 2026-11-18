@manual @docs @assets @memory
Feature: The untouched edges render as they did

  WHY. Five edges reach the pick through `--block` and need no new words (ADR-006 §4). A test
  cannot compare a render with the past, so this is checked once, against the commit the story
  started from.

  Rule: R3 · Every runtime's command says the same thing

    Scenario: E9 · the continue, verify and shatter commands are unchanged
      When the story's change is compared with the commit it started from
      Then the continue, verify and shatter commands show no difference in the bundle's source
      And none in their sections of the Codex variant
      And none in their Claude, Codex and opencode renders
