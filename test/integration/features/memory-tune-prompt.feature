Feature: Tune proposes promoted prompt corrections — observed verdicts, explicit recurrence, and a computed advisory patch
  153/05 binds its two task features (01_use-memory-evidence, 02_compute-read-only-prompt-patches) to the
  REAL CLI. `aof work tune` joins the recall ledger's verdicts and the retrospectives' explicit `Recurs`
  stamps onto the lesson evidence it already formed, and a recurring lesson whose `Promoted to` names an
  authored prompt gains a concrete, deterministic, unapplied patch. Every fixture is a real work stream
  that meets tune's own corpus floors (196 lessons, 30 run records, 3 observation readings) — the floors
  are the registry's and never vary with scope. The tasks' Scenario Outlines are expanded one row per
  scenario because this runner has no Examples support. Three task scenarios are bound elsewhere and
  recorded in the milestone VERIFICATION, not here: the premise-moved check and the ordinal-acceptor
  coexistence need an injected acceptor and a pre-formed patch the CLI cannot express (they run in
  test/planning/tune-proposal.test.mjs and tune-command.test.mjs), and the @manual read-only probe is
  the verifier's.

  Rule: R1 · Tune uses both verdict observations and explicit recurrence without inventing evidence

  Scenario: E1 · The existing tune corpus carries both missing signals
    Given lesson "45/R13" has 3 surfaced, 1 honoured and 2 departed observations
    And a distinct later lesson explicitly recurs from "45/R13"
    And the scoped fixture meets tune's existing corpus and provenance floors
    When the operator runs work tune for that scope
    Then the candidate exposes surfaced 3, honoured 1, departed 2 and recurred 1
    And its evidence cites the ledger rows and both source lessons
    And no count is inferred merely from repeated wording in prose

  Scenario: E2 · Extra observations do not counterfeit independent documents
    Given a candidate's repeated lesson mentions and recall rows all belong to one source document
    And its proposal evidence floor requires two distinct source documents
    When tune resolves the candidate's provenance
    Then it retains the insufficient-evidence finding
    And it does not count repeated observations as a second source document

  Scenario: Missing and corrupt ledger evidence remain distinguishable
    Given one selected item has no ledger and another has an invalid recall row
    When tune assembles its evidence
    Then the absent ledger contributes zero observations
    And the invalid row is diagnosed with its source instead of silently contributing zero
    And unrelated valid evidence is not described as corrupted

  Scenario: Scoped memory evidence does not leak unrelated incidents
    Given items "45" and "68" each have recall observations
    When tune is scoped to "68"
    Then only observations owned by the selected items contribute to its observation counts
    And referenced prior lessons can be resolved for provenance without importing unrelated ledger observations
    And the corpus report declares which source lane it read

  Rule: R2 · A recurring prompt-target lesson yields a concrete advisory patch

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

  Scenario: E4 · A lesson block already in force is not proposed twice
    Given the target already contains the exact block for the canonical lesson ref and text
    When tune runs again with the same evidence
    Then it reports already-in-force and no duplicate patch
    And repeated reports are deterministic

  Scenario: E5 · Symlink escape is refused before target content is read
    Given a prompt target is lexically inside the repository but resolves through a symlink outside it
    When tune evaluates the target through an instrumented content reader
    Then it reports a target-boundary finding
    And the outside target's contents are never read or included in output

  Scenario: Uncomputable or unsafe prompt targets remain explicit findings — no promotion target
    Given a recurring lesson candidate has "no promotion target"
    When tune evaluates its prompt revision
    Then it reports "no computable target" with no applicable patch
    And no target content is written

  Scenario: Uncomputable or unsafe prompt targets remain explicit findings — a rule target
    Given a recurring lesson candidate has "a rule target"
    When tune evaluates its prompt revision
    Then it reports "no prompt revision" with no applicable patch
    And no target content is written

  Scenario: Uncomputable or unsafe prompt targets remain explicit findings — two conflicting prompt targets
    Given a recurring lesson candidate has "two conflicting prompt targets"
    When tune evaluates its prompt revision
    Then it reports "candidate fact conflict" with no applicable patch
    And no target content is written

  Scenario: Uncomputable or unsafe prompt targets remain explicit findings — conflicting lesson text for one ref
    Given a recurring lesson candidate has "conflicting lesson text for one ref"
    When tune evaluates its prompt revision
    Then it reports "conflicting replacement text" with no applicable patch
    And no target content is written

  Scenario: Uncomputable or unsafe prompt targets remain explicit findings — an empty Lesson field
    Given a recurring lesson candidate has "an empty Lesson field"
    When tune evaluates its prompt revision
    Then it reports "replacement text missing" with no applicable patch
    And no target content is written

  Scenario: Uncomputable or unsafe prompt targets remain explicit findings — a missing target file
    Given a recurring lesson candidate has "a missing target file"
    When tune evaluates its prompt revision
    Then it reports "target unreadable" with no applicable patch
    And no target content is written

  Scenario: Uncomputable or unsafe prompt targets remain explicit findings — an absolute target path
    Given a recurring lesson candidate has "an absolute target path"
    When tune evaluates its prompt revision
    Then it reports "target boundary finding" with no applicable patch
    And no target content is written

  Scenario: Uncomputable or unsafe prompt targets remain explicit findings — a parent traversal target path
    Given a recurring lesson candidate has "a parent traversal target path"
    When tune evaluates its prompt revision
    Then it reports "target boundary finding" with no applicable patch
    And no target content is written

  Scenario: Uncomputable or unsafe prompt targets remain explicit findings — a generated .claude command target
    Given a recurring lesson candidate has "a generated .claude command target"
    When tune evaluates its prompt revision
    Then it reports "authored target required" with no applicable patch
    And no target content is written
