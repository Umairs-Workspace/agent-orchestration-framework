@cli @work @work-stream
Feature: aof work promote --next-item promotes the first candidate

  WHY. Once the order is known, the operator wants the first item promoted without copying its
  slug. `--next-item` takes the head of the very list `--show-candidates` prints and hands it to
  the promotion a named promote runs (`promoteRow`). It is the same mint, the same refusals, the
  same edge rewiring and the same envelope. It is not a second promoter: the only thing it adds is
  choosing which row.

  Background:
    Given the work tree of task 00, whose first candidate is "memory-closes-the-loop"

  Rule: R4 · --next-item promotes the head of the candidate list, and is never combined with a slug or --show-candidates

    @executable
    Scenario: E9 · the head is promoted to the tail and the edges on it are rewired
      Given the highest number ever minted is 148
      When "aof work promote --next-item --json" runs
      Then it exits 0 and "created" names ref "149", slug "memory-closes-the-loop", type "milestone"
      And "rewired" names "episodic-memory-is-recallable" and "the-memory-wiki-stays-true"
      And the envelope has exactly the keys "aof work promote memory-closes-the-loop --json" would have answered
      And a following "aof work promote --show-candidates --json" lists "episodic-memory-is-recallable" first, now that it waits on 149 only

    @executable
    Scenario: the human render names the item it chose
      When "aof work promote --next-item" runs
      Then it exits 0 and prints 'Promoted "memory-closes-the-loop" to 149 (appended).'
      And the line before it reads 'Next candidate: memory-closes-the-loop (milestone, unblocks 2).'

    @executable
    Scenario: --next-item takes --at with the meaning a named promote gives it
      When "aof work promote --next-item --at 148 --yes --json" runs
      Then "created.ref" is "148", "shifted" is 1, and live milestone 148 is now 149

    @executable
    Scenario Outline: a refusal from the promotion is the named promote's own refusal
      Given <condition>
      When "aof work promote --next-item <args> --json" runs
      Then it exits non-zero with code "<code>"
      And every file under the work tree is byte-identical to before the run

      Examples:
        | condition                                                        | args        | code                       |
        | archived milestone 129 holds the number --at 129 would write     | --at 129    | promote-number-archived    |
        | a file named "149_milestone_memory-closes-the-loop" exists        |             | promote-destination-exists |
        | the confirm threshold is 0                                       | --at 0      | insert-confirm-required    |

    @executable
    Scenario Outline: E10 · with no candidate, nothing is promoted
      Given a work tree whose backlog holds <backlog>
      When "aof work promote --next-item" runs
      Then it exits non-zero with code "promote-no-candidates" and the message says "<says>"
      And every file under the work tree is byte-identical to before the run

      Examples:
        | backlog                                            | says                                     |
        | nothing                                            | The backlog is empty.                    |
        | only story_b (depends [a]), story_a (depends [b])  | No backlog item can be promoted yet.     |


    @executable
    Scenario Outline: E12 · conflicting arguments are refused before the work tree is read
      When "aof work promote <args> --json" runs
      Then it exits non-zero with code "<code>"
      And every file under the work tree is byte-identical to before the run
      And the same refusal comes back when the configured work directory does not exist

      Examples:
        | args                                       | code                   |
        | memory-closes-the-loop --next-item         | promote-flag-conflict  |
        | memory-closes-the-loop --show-candidates   | promote-flag-conflict  |
        | --show-candidates --next-item              | promote-flag-conflict  |
        | --show-candidates --at 3                   | promote-flag-conflict  |
        |                                            | promote-missing-slug   |

    @executable
    Scenario: the usage line offers both flags
      When "aof work promote --help" runs
      Then the usage reads "aof work promote <slug> | --next-item [--at <P>] [--yes] [--json] | --show-candidates [--json]"
      And the command inventory fixture carries the widened input schema, in which "slug" is no longer required
