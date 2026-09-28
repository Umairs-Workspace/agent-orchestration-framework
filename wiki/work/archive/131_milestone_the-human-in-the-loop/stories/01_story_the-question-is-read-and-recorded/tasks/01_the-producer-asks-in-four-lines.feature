@executable @cli @work @work-stream
Feature: the producer asks for the form of the ask, and the threshold for asking is untouched

  ADR-002 §3. `NEEDS_INPUT_INSTRUCTION` (`src/agent-session-driver.mjs`) gains ONE paragraph,
  inserted immediately before the sentence that tells the session to print the sentinel. The
  paragraph asks for four short lines that begin exactly `Decision needed:`, `Options:`,
  `I would pick:` and `What the answer changes:`, kept under 1,500 characters, with any detail
  after them. The sentences that set the threshold — no human present, a genuine judgment call,
  do not guess, keep working through what you can — stay byte-identical. The template still
  embeds `${NEEDS_INPUT_SENTINEL}`. Its body holds no backtick, no `//` and no `/*`, because
  `acd-worker-driver-no-headless-print` strips comments from the whole file before scanning it.
  `WORKER_SESSION_INSTRUCTION` is composed exactly as today.

  Scenario: the paragraph is the ADR's text, placed before the sentinel sentence
    When `NEEDS_INPUT_INSTRUCTION` is read
    Then it contains, as one paragraph, the text ADR-002 §3 quotes, with line breaks normalised to single spaces for the comparison
    And that paragraph ends before the sentence that begins `Instead, print the exact`

  Scenario Outline: each label appears exactly once, at the start of a quoted line request
    When `NEEDS_INPUT_INSTRUCTION` is read
    Then the text `"<label>"` appears in it exactly once

    Examples:
      | label                    |
      | Decision needed:         |
      | Options:                 |
      | I would pick:            |
      | What the answer changes: |

  Scenario: the four labels are asked in the ADR's order, inside the one paragraph
    When `NEEDS_INPUT_INSTRUCTION` is read
    Then the index of `"Decision needed:"` < that of `"Options:"` < that of `"I would pick:"` < that of `"What the answer changes:"`
    And all four indices lie after the start of `Before you print it` and before `Instead, print the exact`
    And the text `1,500 characters` appears in it exactly once, with every run of whitespace normalised to one space

  Scenario Outline: the producer adds no second copy of a literal the detectors read
    When `<constant>` is read
    Then the text `"<literal>"` appears in it <count> times
    And no line of it, trimmed, equals `"NEEDS_INPUT"` or `"AOF_DIRECTIVE_COMPLETE"`

    Examples:
      | constant                   | literal                  | count |
      | NEEDS_INPUT_INSTRUCTION    | NEEDS_INPUT              | 1     |
      | NEEDS_INPUT_INSTRUCTION    | AOF_DIRECTIVE_COMPLETE   | 0     |
      | WORKER_SESSION_INSTRUCTION | Decision needed:         | 1     |
      | WORKER_SESSION_INSTRUCTION | What the answer changes: | 1     |

  Scenario: the threshold sentences are byte-identical to today
    Given the text of `NEEDS_INPUT_INSTRUCTION` at `2bf716f`, held in the test as a literal (never read through `git show`, which fails on a shallow clone), and split around the insertion point
    When the current text is read with the inserted paragraph removed
    Then it is byte-identical to the text at `2bf716f`

  Scenario: the producer and the detector still share the one literal
    When `NEEDS_INPUT_INSTRUCTION` is read
    Then it contains `NEEDS_INPUT_SENTINEL`'s value on a line of its own request, as today
    And `WORKER_SESSION_INSTRUCTION` equals `NEEDS_INPUT_INSTRUCTION`, a blank line, then `DIRECTIVE_COMPLETE_INSTRUCTION`

  Scenario: the template holds nothing a comment-stripper would eat
    When the source text of the `NEEDS_INPUT_INSTRUCTION` template literal is read
    Then it contains no backtick other than its two delimiters, no `//` and no `/*`
    And `acd-worker-driver-no-headless-print` stays green unedited

  Scenario Outline: a comment-stripper leaves the instruction whole
    Given the source of `src/agent-session-driver.mjs` with its comments stripped the way `acd-worker-driver-no-headless-print` strips them
    When the `NEEDS_INPUT_INSTRUCTION` template literal is read out of that stripped source
    Then it still contains `"<fragment>"`, with every run of whitespace normalised to one space

    Examples:
      | fragment                                   |
      | Before you print it                        |
      | put any detail after them.                 |
      | Instead, print the exact                   |
      | keep working through every                 |
