Feature: Renumbering preserves the observed changes in each number space

  Rule: R3 · Renumbering preserves the observed changes in each number space

    @executable @cli @work @work-stream
    Scenario: E7 · Renumbering a parent moves the entire subtree
      Given a live record references 10 and its child 10/00 and a captured historical artifact mentions the old number
      When work renumber 10 --to 22 runs
      Then orchard and its children resolve at 22, 22/00 and 22/01 with their previous statuses
      And current references, preserved history, unrelated numbers and the whole stream match the committed delta

    @executable @cli @work @work-stream
    Scenario: E8 · A nested renumber records the current bare dependency behavior
      When work renumber 10/00 --to 03 runs
      Then pick resolves at 10/03 and the parent checklist identifies the moved story
      And pack still contains its literal dependency [00] and the complete delta matches its baseline

    @executable @cli @work @work-stream
    Scenario: E9 · An occupied target never shifts the incumbent
      When work renumber 10 --to 11 runs in both formats on independent copies
      Then the JSON code is renumber-target-occupied, both exits are 1 and the refusal output matches each baseline
      And both stream deltas are empty

    @executable @cli @work @work-stream
    Scenario Outline: Preview and other rejected targets preserve every entry
      When work <argv> runs on a fresh seed
      Then the result is <outcome> and the full before-image is preserved
      And each refused invocation matches the diagnostics and exit for each output format

      Examples:
        | argv | outcome |
        | renumber 10 --to 22 --dry-run | successful preview of 10 to 22 |
        | renumber 10/00 --to 01 | renumber-target-occupied |
        | renumber 10 --to 10 | renumber-same-number |
        | renumber 30 --to 24 | renumber-not-live |
        | renumber orchard --to 22 | renumber-invalid-ref |
