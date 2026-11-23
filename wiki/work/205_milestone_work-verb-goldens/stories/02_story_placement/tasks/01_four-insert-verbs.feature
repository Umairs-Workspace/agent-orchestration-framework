Feature: All four insert verbs record their complete stream changes

  Rule: R2 · All four insert verbs record their complete stream changes

    @executable @cli @work @work-stream
    Scenario: E4 · Inserting a UAT preserves the meaning of its supplied dependency
      When work insert-uat trial --at 11 --depends 12 --yes runs
      Then UAT 11 depends on the spike now numbered 13
      And the complete stream delta matches the committed baseline including scaffold content and the fixed dates

    @executable @cli @work @work-stream
    Scenario: E5 · Inserting a story shifts siblings and updates the checklist
      When work insert-story wash --under 10 --at 0 --yes runs
      Then wash is 10/00, pick is 10/01 and pack is 10/02
      And the milestone checklist, rewritten sibling records and untouched other drivers match the baseline

    @executable @cli @work @work-stream
    Scenario: E6 · A refused insert leaves no staged leaf
      When work insert-chore labels2 --at 11 runs without confirmation
      Then the refusal names the nine-item shift and exits 1
      And both output formats match their refusal baseline with no labels2 item or other stream delta

    @executable @cli @work @work-stream
    Scenario Outline: Top-level scaffolds match their own full deltas
      When work <argv> runs on a fresh stream
      Then the new item at 11 has type <type> and its distinct scaffold matches its baseline
      And the complete added, removed and changed entries agree with the baseline

      Examples:
        | argv | type |
        | insert-milestone grove --at 11 --yes | milestone |
        | insert-chore crate --at 11 --yes | chore |

    @executable @cli @work @work-stream
    Scenario Outline: Each insertion face has a refusal baseline
      When work <argv> runs on independent seeded copies in both formats
      Then the error is <code>, each face matches its complete output and exit baseline, and each stream delta is empty

      Examples:
        | argv | code |
        | insert-milestone grove --at 11 | insert-confirm-required |
        | insert-chore crate | insert-invalid-at |
        | insert-uat trial --at 11 --depends 99 --yes | promote-depends-unresolved |
        | insert-story wash --under 99 --at 0 --yes | insert-parent-not-found |
