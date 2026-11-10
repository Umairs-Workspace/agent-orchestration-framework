Feature: Recurring prompt lessons produce concrete reviewable corrections

  Rule: R2 · A recurring prompt-target lesson yields a concrete advisory patch

    @executable @cli @work @memory
    Scenario: E3 · A prompt destination makes the replacement text computable
      Given a recurring lesson meets the existing proposal evidence floor
      And its unambiguous target is "prompt:packages/core/assets/commands/refine.md"
      And its Lesson text is "Declare the existing counter's owning suite before drawing the write set."
      And the authored target contains a known byte sequence
      When tune forms the prompt revision proposal
      Then its patch contains that exact sequence as from and a deterministic appended lesson block as to
      And the block identifies the canonical lesson ref and contains the exact Lesson text
      And its lane remains advisory with no automatic applier
      And its patch is not marked replacement-prose-not-computable
      And the target, configuration, retrospectives and ledgers remain byte-identical

    @executable @cli @work @memory
    Scenario: E4 · A lesson block already in force is not proposed twice
      Given the target already contains the exact block for the canonical lesson ref and text
      When tune runs again with the same evidence
      Then it reports already-in-force and no duplicate patch
      And repeated reports are deterministic

    @executable @cli @work @memory
    Scenario: E5 · Symlink escape is refused before target content is read
      Given a prompt target is lexically inside the repository but resolves through a symlink outside it
      When tune evaluates the target through an instrumented content reader
      Then it reports a target-boundary finding
      And the outside target's contents are never read or included in output

    @executable @cli @work @memory
    Scenario Outline: Uncomputable or unsafe prompt targets remain explicit findings
      Given a recurring lesson candidate has "<condition>"
      When tune evaluates its prompt revision
      Then it reports "<result>" with no applicable patch
      And no target content is written

      Examples:
        | condition                             | result                         |
        | no promotion target                   | no computable target           |
        | a rule target                         | no prompt revision             |
        | two conflicting prompt targets        | candidate fact conflict        |
        | conflicting lesson text for one ref   | conflicting replacement text   |
        | an empty Lesson field                 | replacement text missing       |
        | a missing target file                 | target unreadable              |
        | an absolute target path               | target boundary finding        |
        | a parent traversal target path        | target boundary finding        |
        | a generated .claude command target    | authored target required       |

    @executable @cli @work @memory
    Scenario: A changed target invalidates the old patch premise
      Given a prompt patch has been formed against an earlier target byte sequence
      And the target changes before that premise is checked
      When the proposal is checked against current source facts
      Then tune reports premise-moved rather than silently rebasing the earlier patch
      And the target remains unchanged

    @executable @cli @work @memory
    Scenario: Existing ordinal proposals still use their acceptor
      Given the same tune run contains a valid cap-adjustment candidate and a recurring prompt candidate
      When proposals are assessed
      Then the cap adjustment still receives its existing acceptor assessment
      And the prompt candidate is not added to the ordinal tunable set
      And no prompt application command is registered or invoked

    @manual @cli @work @memory
    Scenario: Read-only behaviour survives a concrete prompt proposal
      Given the fixture produces a non-null prompt patch through the actual tune command
      When the verifier compares the workspace before and after the command
      Then every source, config and ledger byte is unchanged
      And the existing tune read-only control fails under a temporary target-write probe
      And VERIFICATION records the observed failure and restoration
