@executable @cli @assets @distribution
Feature: The lab keeps its own hygiene rule, hand-owned, and the framework never touches it again

  THE HAZARD IS REAL AND IT IS THIS REPOSITORY'S. An unisolated suite invocation here falls back to
  the real global store — shared by every project and every live daemon on this machine — and a
  passing run can write fixture node descriptors, presence records and config into it. It has
  polluted a live fleet often enough to earn a hook, and it is recorded in the retrospectives of four
  separate milestones. Withdrawing the shipped member must not withdraw the protection here.

  THE VERSION KEPT IS THE COMPILED PREDICATE, NOT THE ONE ON DISK. The file this tree currently
  executes is the pre-55 version whose subject is a text match on a path, so it cannot tell running a
  file from naming one: it has blocked a read-only search for that path, and it has blocked the
  heredoc writing a document that quotes it — twice during 55's own refinement, and once more while
  this very contract was being authored. The compiled predicate splits a command into segments,
  tokenises each, steps over here-documents and quoted prose, and clears on an isolation prefix in
  any of its spellings. Keeping the weaker file because it is the one already installed would
  re-import a defect the framework has already fixed.

  HAND-OWNED MEANS UNMARKED, AND UNMARKED IS THE SANCTIONED EXIT. An entry carrying no ownership
  marker is one aof neither adopts, edits, retracts nor drift-reports — the escape hatch 55/ADR-004
  deliberately preserved, on the reasoning that a frozen set a human cannot opt out of is one that
  owns the human. This entry takes that exit on purpose. That is what makes the guard survive every
  future update without the framework having any opinion about it, and it is what keeps 55/FF-5505
  true here: an unmarked entry is the operator's rule, not an untraced framework rule.

  55'S OPEN GAP IS DISCHARGED HERE, BY A DIFFERENT ROUTE THAN IT NAMED. The ledger entry "this
  repository still runs the pre-55 hand-wired isolation hook" set its discharge as an update
  replacing the file with the compiled member. That route is withdrawn along with the member; the
  file is replaced by hand instead. The gap closes on its substance — this tree runs the better
  predicate — rather than being left pointing at a path that no longer exists.

  THE COVERAGE MOVES WITH THE CODE. The predicate's behaviour was under test as a bundle module and
  is imported by name from that path. It leaves the bundle, so its cases are re-homed onto the file
  this repository actually executes. Re-homing the guard without its tests would ship the one thing
  worse than the old guard: an untested one, guarding the store that has already been polluted.

  THE KNOWN SIDE DOOR IS NOT CLOSED HERE, AND IS NOT PRETENDED CLOSED. An aggregate entry point that
  chains the suite is not a suite invocation by any spelling, and one once ran the whole suite
  unisolated for eighteen minutes with the guard silent. That is a behaviour-versus-spelling gap the
  retrospectives already carry, whose structural fix belongs in the suite runner itself — the one
  place no side door can bypass. This story re-homes the guard it has; it does not widen it.

  55/ADR-004. 55/FF-5505.

  Scenario: the guard this repository runs is the compiled predicate
    Given the hook this repository's settings invoke
    When a command is handed to it
    Then it judges what the command invokes rather than what text the command contains
    And it reads its payload from standard input
    And it blocks by exiting unsuccessfully with a reason naming the isolation prefix to re-run with
    And it gets out of the way on every input it cannot decide

  Scenario: the framework has no opinion about this entry
    Given this repository's settings entry for the guard carries no ownership marker
    When the framework is installed or updated here
    Then the entry is left exactly as it is
    And it is reported as neither drift nor tamper
    And no framework-authored entry is added beside it

  Scenario: the gap 55 left open is closed on its substance
    Given the ledger entry naming this repository's pre-55 hand-wired hook
    When this repository's guard is read
    Then the ledger entry is discharged
    And its recorded discharge names the route actually taken rather than the withdrawn one

  Scenario: a regression in the re-homed guard is caught here
    Given the guard's predicate weakened back to a match on the raw command text
    When this repository's own suite runs
    Then it fails, naming a read-only command the weakened predicate would block

  Scenario Outline: the guard blocks a run and lets a reader through
    Given the guard this repository runs
    When it judges <command>
    Then it <verdict>

    Examples: the cases that leave the bundle module, re-homed onto the file this tree executes
      | command                                                     | verdict                                          |
      | an unisolated invocation of this repository's suite script  | blocks it, naming the prefix to re-run with      |
      | an unisolated package-manager test script                   | blocks it                                        |
      | an unisolated runner invocation over a single test file     | blocks it                                        |
      | a nested shell invocation of the suite, unisolated          | blocks it                                        |
      | the same invocation carrying a throwaway global home        | allows it                                        |
      | an invocation whose isolation was exported earlier in the command | allows it                                  |
      | a search whose pattern quotes the suite path                | allows it                                        |
      | a document being written whose prose quotes the suite path  | allows it                                        |
      | a here-document whose body names the suite path             | allows it                                        |
      | an aggregate entry point that chains the suite              | allows it — the side door this story leaves open  |
