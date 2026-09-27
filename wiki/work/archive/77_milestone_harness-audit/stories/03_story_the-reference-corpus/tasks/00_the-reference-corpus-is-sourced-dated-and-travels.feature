@executable @cli @work @validate
Feature: The reference corpus is a versioned set of sourced, dated rows that travels with the payload

  "Everyone else caps at N steps and $M" is either a claim somebody can check or it is a rumour with
  the citation missing. Re-derived per diagnosis it is a research task, and a research task's answer
  depends on the day it ran — two reviewers asking one question a week apart get two answers and no
  way to tell which moved, the world or the search. Written down once, versioned, with a source and
  a date against every row, the same question becomes a JOIN: a diff in a pull request, read in the
  same pass as the code that moved.

  So the corpus is DATA on disk, and every row states where it came from and when it was last
  checked. A row with no source is an assertion; a row with no date is an assertion that was true
  once. Both are refused at the row rather than caveated in prose, because a corpus that admits one
  unsourced row admits all of them.

  It lives under `src/`, and that is not a filing preference. The installed payload carries `src/`
  recursively and carries no `wiki/` and no `scripts/` at all, so a corpus filed under `wiki/` is
  readable in this repository and in no governed project — which would make the bounds rule the one
  rule in this milestone that cannot travel, in the milestone whose whole thesis is that the rules
  travel. Being a module also means it is reached by MODULE RESOLUTION rather than by joining a path
  onto somebody's root, so it needs neither the audited project's root nor the toolkit's.

  The set is frozen and it is non-vacuous. Frozen because a caller that can append a row can invent
  a reference, and an invented reference is worse than none — it is a citation that reads like one.
  Non-vacuous because a corpus that emptied would pass every check it has while comparing nothing
  against nothing, which is the failure this whole family exists to refuse.

  The word `baseline` is already spoken for, and spoken for inside the very family this story
  extends: it names the shrink-only exemption ledger of suites that cannot be registered, with its
  own two finding codes. A table of what other systems ship has nothing in common with that but the
  letters. Nothing here is called a baseline, and no finding code this story adds contains the word.

  ADR-007 §1, §2, §2a, §2b. FF-7705, FF-7706.

  Scenario: every row of the shipped corpus says what it measures, where it came from and when it was checked
    Given the reference corpus as it ships
    When its rows are read
    Then each row carries an id, a bound, a value, the system that ships it, a source and a checked date
    And each source is a non-empty URL
    And each checked date parses as a date
    And no row carries a field outside those six

  Scenario Outline: a row that cannot be checked is refused, and a row that can is admitted
    Given the reference corpus with <row> in it
    When the corpus is checked
    Then the check <verdict>

    Examples: the two facts every row must carry, driven from both sides
      | row                                                    | verdict                                     |
      | a row carrying all six fields, a URL and a parseable date | admits the corpus                        |
      | a row whose source is an empty string                  | refuses it, naming that row's id and source |
      | a row carrying no source field at all                  | refuses it, naming that row's id and source |
      | a row whose source is a bare word and not a URL        | refuses it, naming that row's id and source |
      | a row whose checked date is an empty string            | refuses it, naming that row's id and date   |
      | a row whose checked date does not parse as a date      | refuses it, naming that row's id and date   |
      | a row carrying no checked field at all                 | refuses it, naming that row's id and date   |
      | a row carrying no system                               | refuses it, naming that row's id and system |
      | a row carrying no value                                | refuses it, naming that row's id and value  |

  Scenario Outline: an id names exactly one row, so a finding that cites one cites one thing
    Given a reference corpus in which <case>
    When the corpus is checked
    Then the check <verdict>

    Examples: uniqueness, from both sides
      | case                                | verdict                                   |
      | every row carries a distinct id     | admits the corpus                         |
      | two rows carry the same id          | refuses it, naming the id the two share   |

  Scenario Outline: a caller holding the corpus cannot invent a reference
    Given the reference corpus and a caller holding it
    When the caller attempts to <mutation>
    Then the corpus read afterwards is the corpus as it shipped
    And its row count is unchanged
    And no row's source, value or checked date differs from the shipped one

    Examples: the four ways an invented reference would get in
      | mutation                        |
      | append a row                    |
      | replace a row in place          |
      | delete a row                    |
      | change one field of one row     |

  Scenario Outline: the floor is asserted, so an emptied corpus cannot pass while looking clean
    Given a corpus carrying <rows>
    When it is checked against its non-vacuity floor
    Then the check <verdict>

    Examples: the floor is greater than zero
      | rows            | verdict                                        |
      | no rows at all  | refuses it, saying the corpus read nothing     |
      | one row         | admits it                                      |
      | the shipped set | admits it, and reports how many rows it read   |

  Scenario: the corpus imports nothing, so loading it drags no closure behind it
    Given the corpus module's own source, its comments stripped
    When it is read for a static import, a require and a dynamic import
    Then none of the three is found
    And with an import of another module of this project planted in it, that import is reported by the file holding it

  Scenario Outline: the corpus is reached by module resolution, so it needs neither root
    Given a working directory that is <directory>
    When the reference corpus is loaded and its rows are read
    Then the rows are the rows it ships, in the order it ships them
    And no project root and no toolkit root was supplied to reach them

    Examples: the directory does not decide the answer
      | directory                                                     |
      | the repository root of this checkout                          |
      | a directory that is not an aof checkout at all                |
      | a governed project carrying its own .aof and no aof source tree |
      | an empty directory                                            |

  Scenario: two governed projects sharing one payload read one corpus
    Given one installed payload and two governed projects audited through it
    When the reference corpus is read from each project in turn
    Then both read the same rows in the same order
    And neither project's own files changed a row

  Scenario Outline: the second meaning of the word is planted and reported
    Given <planted> planted in the modules this story adds
    When those modules and this story's finding codes are read for the word
    Then the planted use is reported by the place that holds it
    And with nothing planted no use is found

    Examples: the meanings that must not arrive beside the exemption ledger's
      | planted                                               |
      | a module named for a baseline                         |
      | an exported constant whose name contains BASELINE     |
      | a finding code containing the word baseline           |
      | a row field named baseline                            |
      | a corpus row whose id contains the word baseline      |

  Scenario: this story's codes are the three, and the ledger keeps the word
    Given the finding codes the bounds lane can emit
    When they are read
    Then they are exactly audit-bound-undeclared, audit-bound-off-reference and audit-reference-stale
    And none of them contains the word baseline
    And none of them equals a code any other command emits
    And the exemption ledger's own two codes are unchanged and still name suites
