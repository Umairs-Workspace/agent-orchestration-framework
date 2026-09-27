@executable @cli @assets @distribution @bug
Feature: A repository's lab hygiene leaves the bundle, and a consumer's own test run is its own business

  THE MEMBER'S SUBJECT IS THIS REPOSITORY, AND SUBJECTS DO NOT TRAVEL. The declaration says it
  protects "the real ~/.aof global store from unisolated aof test runs". The store is this machine's,
  the runs are this repository's own suite, and the pollution it has caused is this repository's live
  fleet. A team installing aof to govern their work stream inherits none of that hazard and every one
  of its consequences.

  THE PREDICATE TRAVELS AND OVER-REACHES. It recognises the three spellings of this repository's
  suite invocation and clears only on a throwaway global-home prefix. In a repository with no such
  store to protect, that is the framework refusing the host project's own build command and
  prescribing an environment variable that does nothing there — a block with no subject behind it.

  THERE IS NO SUPPORTED WAY OUT, WHICH IS WHY THE REPAIR IS TO STOP SHIPPING IT. The compile reads
  the declaration inside the aof package, not the copy it installs, so editing the installed
  declaration changes nothing and the next update reasserts the entry. The one lever that works —
  deleting the ownership marker so the entry becomes the operator's forever — is undocumented, and it
  leaves the guard file on disk either way.

  ONE MEMBER IS WITHDRAWN, NOT THE MECHANISM. The frozen set, its compiler, its coded refusals, its
  tamper coding and its five remaining members are untouched; 55/ADR-004 stands exactly as accepted.
  What leaves is the worked example that was repo-specific policy riding along with the machinery it
  was written to demonstrate.

  55/04'S DELIVERED CONTRACT IS SUPERSEDED HERE, NOT EDITED. Its scenario naming this guard as the
  compiled member rather than a hand-wired entry used the guard as the proof that a rule at an
  enforcement point traces to a declaration. That general criterion survives verbatim and is carried
  forward by task 01; only its worked example is withdrawn. The delivered feature file is left alone.

  THE HONEST BOUNDARY: RETRACTED, NOT ERASED. On the next update an installed consumer loses the
  settings entry, so the rule stops firing — that is the harm, and it ends. The guard file an earlier
  version wrote is left where it is, invoked by nothing: the installer writes assets and does not
  prune them, and giving it a retraction path is a separate change with its own blast radius. Saying
  so is the point; an orphan nobody named would be the same defect in a quieter form.

  55/ADR-004. 55/FF-5505.

  Scenario: the shipped declaration no longer names the test-isolation guard
    Given the declaration the framework ships
    When its members are read
    Then no member protects a global store from unisolated suite invocations
    And every member that remains still names what it protects and a known enforcement point
    And the compile still refuses a member that names no enforcement point

  Scenario: the guard is no longer an asset the framework installs
    Given the descriptor of everything the bundle installs
    When it is read
    Then nothing in it targets a test-isolation guard in a consumer's hook directory
    And the guard body is absent from the bundle's own hook tree
    And the generated asset census matches the real bundle tree exactly, in both directions

  Scenario: a fresh consumer install plants no rule over their own build commands
    Given a repository with no aof installation and a suite invocation of its own
    When the framework is installed into it
    Then its settings carry no framework-authored entry that judges a command before it runs
    And its hook directory carries no test-isolation guard
    And its own suite invocation proceeds without the framework having an opinion about it

  Scenario: an existing consumer has the rule retracted on the next update
    Given a repository whose settings carry the framework-owned test-isolation entry
    When the framework is updated there
    Then that entry is gone
    And the operator's own entries at the same event survive in their own positions
    And no other compiled member's output changed

  Scenario Outline: the withdrawal reaches exactly the surfaces that carried the member
    Given the framework after the member is withdrawn
    When <surface> is examined
    Then it is <outcome>

    Examples: what changes, stated beside what deliberately does not
      | surface                                             | outcome                                                    |
      | the shipped declaration                             | short one member, the other five untouched and in order     |
      | the bundled asset descriptor                        | short the guard asset, every other asset unmoved            |
      | the bundle's hook tree                              | short the guard body, its sibling hook bodies present       |
      | the asset census that counts the bundle tree        | re-measured to the smaller tree, still an exact count       |
      | a consumer's framework-authored hook entries        | carrying no rule about how a command is invoked             |
      | a consumer's operator-authored entries              | unchanged, in their own positions                           |
      | a consumer's permission denials                     | unchanged — the anchors member still compiles               |
      | a consumer's agent tool scopes                      | unchanged — the three scope members still compile           |
      | an entry an operator claimed by removing its marker | left alone, as the escape hatch already promises            |
      | a guard file an earlier version installed           | left on disk, invoked by nothing                            |
