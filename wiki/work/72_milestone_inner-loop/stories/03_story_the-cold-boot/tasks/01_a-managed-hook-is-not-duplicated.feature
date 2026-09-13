@executable @cli @assets @distribution
Feature: No hand-authored settings entry duplicates one aof manages

  Three events in this repository's settings carry two command-equivalent blocks each — one written by
  hand, one aof manages — so the presence ping shells twice on every prompt. Each of those is a cold
  process, and the second one buys nothing.

  The tempting fix is to make the merge collapse them, and it is wrong. The merge deliberately carries
  through every entry it cannot prove is its own: aof recognises its own, and ONLY its own. That is the
  escape hatch protecting an operator's hooks from a framework that would otherwise quietly delete
  them — and in this very file it is what protects the test-isolation guard, which aof does not manage
  and which exists because unisolated runs corrupt the real global home. A merge that deleted unmarked
  entries would have deleted that one.

  So this is repository hygiene held by a repository control, and the merge is not touched. The control
  is over the tracked settings file: for every entry aof manages, no unmanaged entry fired by the same
  event and matcher resolves to the same invocation. Of each pair it is the HAND-AUTHORED block that
  goes and the marked one that stays — delete the marked one instead and the next `aof work update`
  restores it beside the survivor, and the duplication is back.

  Equivalence has to be over the RESOLVED INVOCATION — the command and its arguments, with the project
  directory variable left as written — and not over object identity. Two blocks that differ only in
  key order, whitespace or which of the two spellings of the same path they use are still the same
  process fired twice, and an identity comparison would call them distinct and pass.

  The converse matters as much as the claim and is driven, not merely stated: a genuinely distinct
  unmanaged entry must be ADMITTED. A control that reds on an operator's own hook is arguing for the
  framework change this milestone refuses, and it would be found only by whoever it broke.

  ADR-005 §3, §4. FF-7206.

  Background:
    Given the tracked settings file
    And the resolved invocation of an entry is its command plus its arguments — written as one command string or as a command and an args list — with the project-directory variable left exactly as written

  Scenario: no unmanaged entry duplicates a managed one
    Given every entry carrying the aof marker
    When each is compared against the unmanaged entries fired by the same event and matcher
    Then no unmanaged entry resolves to the same invocation as a managed one

  Scenario: a planted duplicate reds
    Given a copy of the settings file with a hand-authored block restored beside a managed one
    When the control runs
    Then it fails, naming the event and the invocation the two share

  Scenario Outline: what counts as the same invocation
    Given a managed and an unmanaged entry under one event and matcher, <difference>
    When their resolved invocations are compared
    Then they are found <verdict>

    Examples: the equivalence matrix — spellings of one invocation, each of them still a copy
      | difference                                                     | verdict    |
      | identical in every character                                   | equivalent |
      | differing only in the order of their keys                      | equivalent |
      | differing only in whitespace and indentation                   | equivalent |
      | one spelling the command alone, the other command plus args    | equivalent |
      | differing only in a key that is neither command nor args       | equivalent |

    Examples: the converse — entries the control must ADMIT as distinct
      | difference                                                     | verdict  |
      | naming a different program                                     | distinct |
      | naming the same program with a different script argument       | distinct |
      | fired under a different matcher within the same event          | distinct |
      | fired by a different event                                     | distinct |
      | one spelling the project-dir variable, the other its expansion | distinct |

  Scenario: the operator's own guard is planted and required green
    Given the file carries an unmanaged pre-tool entry, under its own matcher, invoking the test-isolation guard aof does not manage
    And no managed entry resolves to that invocation
    When the control runs
    Then it passes
    And it reports no finding against that entry
    And that entry is still present, character for character

  Scenario: a managed entry beside the operator's guard does not implicate it
    Given a managed entry planted in the guard's own event and matcher, invoking a different script
    When the control runs
    Then it passes
    And the guard entry is admitted

  Scenario: the control does not reach the merge behaviour
    Given this control's own source
    When it is read for a use of the settings merge
    Then none is found
    And it imports nothing from the module that merges settings
    And it reads the settings file without writing it

  Scenario Outline: one session entry per event, and the survivor is the one aof manages
    When the entries for "<event>" are counted
    Then exactly one of them invokes "<invocation>"
    And that entry carries the aof marker "<marker>"

    Examples: the per-event count — one session entry per event
      | event            | invocation        | marker                     |
      | SessionStart     | aof session start | claude-session-start       |
      | UserPromptSubmit | aof session ping  | claude-session-prompt-ping |
      | SessionEnd       | aof session end   | claude-session-end         |
