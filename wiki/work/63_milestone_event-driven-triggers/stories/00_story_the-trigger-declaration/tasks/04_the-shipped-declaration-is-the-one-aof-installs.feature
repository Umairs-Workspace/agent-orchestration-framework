@executable @cli @assets @distribution
Feature: The trigger declaration a workspace runs is byte-identical to the one aof ships, installed by the path the other declarations already use

  A declaration that governs what an unattended run may wake is only reviewable if the copy under review
  and the copy in force are the same bytes. Two files with the same name and different contents is the
  failure the content-hashed install path already exists to prevent, and this declaration goes down that
  path rather than beside it: shipped from the bundle, installed to `.aof/`, catalogued by hash, and
  left alone when a workspace has edited it rather than overwritten without a word.

  There is a nearby shape in this tree that is deliberately not copied. One declaration is created on
  demand and ships no bundled copy, so there is nothing to diff it against and nothing to detect drift
  from. This one ships a copy, which is what makes every claim below checkable at all.

  Byte-identical means bytes. On this platform the interesting failures are invisible in a text
  comparison — a line ending rewritten on the way to disk, a trailing newline added or dropped, a byte
  order mark prepended by a helpful editor — and each of them changes the content address while leaving
  the file looking correct in every viewer. So the comparison here is over bytes and over the hash,
  never over trimmed text.

  The last leg is the one a wrong implementation passes most easily: the file aof ships must be the file
  the compiler reads. A declaration that installs but that the compiler cannot parse, or that the
  compiler reads through a different path than the one it was installed on, is a declaration nobody is
  actually running.

  ADR-002 §1. FF-6302.

  Scenario: an updated workspace holds the declaration, byte-identical to the bundled source
    Given a workspace aof has updated
    When the installed trigger declaration is read
    Then it is present at the declared target under `.aof/`
    And its bytes are identical to the bundled source it came from
    And its content hash equals the hash of the bundled source

  Scenario: byte-identical is asserted over bytes, not over text
    Given the installed declaration and the bundled source
    When the two are compared
    Then their line endings are identical
    And their trailing bytes are identical
    And neither carries a byte order mark the other does not
    And the comparison is made without trimming, normalising or re-serialising either

  Scenario Outline: what an update does to a declaration already on disk
    Given a workspace whose installed declaration is <state>
    When the workspace is updated
    Then the declaration is <outcome>

    Examples: the drift-protected path, driven over the states a real workspace reaches
      | state                              | outcome                                                          |
      | absent                             | created, byte-identical to the bundled source                    |
      | identical to the bundled source    | reported up-to-date, and its bytes are unchanged                 |
      | deleted after an earlier install   | created again, byte-identical to the bundled source              |
      | edited locally                     | reported as drift, and the edited bytes are left where they are  |
      | edited locally, then updated again | reported as drift a second time, and still not overwritten       |

  Scenario: a locally edited declaration is re-rendered only when the update is forced
    Given a workspace whose installed declaration has been edited locally
    When the workspace is updated with the force flag
    Then the declaration is re-rendered from the bundled source
    And its bytes are identical to it again
    And the local edit is gone rather than merged

  Scenario: the declaration is catalogued by the bundle's own manifest
    Given the shipped bundle
    When its manifest is read
    Then it carries one entry for the trigger declaration, at the target path it installs to
    And that entry's hash is the hash of the bundled source's bytes
    And a manifest whose entry disagrees with its own source is detectable without installing anything

  Scenario: it installs on the same run that installs the other declarations, not on a step of its own
    Given a workspace with no `.aof/` declarations installed
    When the workspace is updated once
    Then the trigger declaration is installed
    And the other declarations that ship the same way are installed by the same run
    And no separate command, flag or first use is needed to bring it into existence

  Scenario: the file aof ships is the file the compiler reads
    Given the installed declaration and the bundled source
    When each is compiled
    Then both compile
    And the two answers are equal, member for member
    And the compiler reads the installed copy from the path the install wrote it to

  Scenario: an unparseable installed declaration is a coded refusal naming the file
    Given a workspace whose installed declaration is not parseable
    When it is compiled
    Then it is refused with a code
    And the refusal names the path it was read from
    And no compiled set is handed back, and the bundled source is not silently used in its place
