@executable @docs @planning @memory
Feature: the cut-making roster is named and asserted in both directions, so a third cutter cannot arrive without a recall

  `ls src/bundle/commands/*.md | wc -l` is **26**, and exactly two of them cut one unit into many:
  `shatter.md` partitions a PRD into drivers (`shatter.md:45-56`) and `refine.md` partitions a
  milestone into stories (`refine.md:129`). Measured carriers of `aof work memory` today: 4 files, 6
  invocations — `assimilate-code.md:75` and `verify.md:162`/`:212` are `ingest` (they write the index,
  they do not read it), `continue.md:259` is a recall scoped `--kind near-miss --block`, and
  `refine.md:122`/`:124` are the two-role block. After this story, 5 files and 7 invocations.

  **A one-direction roster is satisfied by shrinking the roster.** "Every roster entry carries a
  recall" goes green if a cutter is quietly dropped from it; "every cutter is on the roster" goes
  green with a roster nobody ever populated. Both directions are the claim, and FF-12405 states them
  as such.

  **The membership direction cannot be a grep for the role.** `grep -ln "aof-product-owner"
  src/bundle/commands/*.md` returns **6** files — `add-milestone.md`, `add-story.md`,
  `assimilate-code.md`, `insert-milestone.md`, `insert-story.md`, `shatter.md` — and five of them
  frame or insert exactly ONE named item, partitioning nothing. Spawning the product owner does not
  make a command a cutter, so the roster is authored and the direction that bites is the one that
  refuses an **unclassified** file: every `src/bundle/commands/*.md` is either on the roster or on a
  named excluded list carrying its own reason, and the union of the two must equal the directory
  listing. A 27th command file then reds the check by existing, rather than by being noticed.

  **The two entries' forms differ, and that is the decision, not an inconsistency.** `refine.md`
  carries two invocations for two roles (`--area architecture --block` for the architect,
  `--item <ref> --block` for the PO); `shatter.md` carries one, PO-only, with neither flag
  (ADR-007 §2, §3). A control asserting one shared shape across the roster would force exactly the
  verbatim port the ADR refuses.

  What would quietly undo this: a roster shrunk to keep a control green; a membership rule derived
  from `aof-product-owner` (6 files, 5 false positives) or from a filename prefix; an excluded list
  whose entries carry no reason, so nobody can tell a considered exclusion from an oversight; a new
  cut-making command added under a name the check never enumerates; and one shape asserted across
  both entries, which would red the very form ADR-007 decided.

  ADR-007. FF-12405.

  Scenario: the roster is named, and both its entries carry a recall
    Given the cut-making roster
    When it is read
    Then it names exactly `src/bundle/commands/refine.md` and `src/bundle/commands/shatter.md`
    And each named file carries at least one `aof work memory recall` invocation
    And a file naming only `aof work memory ingest` would not satisfy the entry

  Scenario: a roster entry with no recall fails, and names itself
    Given the roster entry `src/bundle/commands/shatter.md` with its recall invocation removed
    When the check runs
    Then it fails
    And the failure names that file as a roster entry carrying no recall

  Scenario: every command file is classified, so an unclassified newcomer fails
    Given the 26 files matching `src/bundle/commands/*.md`
    When each is looked up in the roster and in the named excluded list
    Then every file appears in exactly one of the two
    And the union of the two lists equals the directory listing
    And a 27th file present on disk but in neither list fails the check and is named

  Scenario Outline: the classification, each exclusion carrying its own reason
    Given the command file <command>
    When it is classified
    Then it is <class> because <reason>

    Examples: both cutters, and the exclusions most likely to be mistaken for one
      | command             | class      | reason                                                              |
      | shatter.md          | cut-making | partitions one PRD into many drivers (`shatter.md:45-56`)           |
      | refine.md           | cut-making | partitions one milestone into many stories (`refine.md:129`)        |
      | add-milestone.md    | excluded   | frames one named driver; spawns the PO but partitions nothing       |
      | add-story.md        | excluded   | adds one story to an existing milestone                             |
      | insert-milestone.md | excluded   | inserts one driver at a position and renumbers; no partition        |
      | insert-story.md     | excluded   | inserts one story at a position; no partition                       |
      | continue.md         | excluded   | builds an existing story; carries its own recall at `:259` regardless |
      | verify.md           | excluded   | accepts an item; its memory calls are `ingest` (`:162`, `:212`)     |
      | assimilate-code.md  | excluded   | governs code already written; its memory call is `ingest` (`:75`)   |
      | validate.md         | excluded   | a structural check that spawns no agent and cuts nothing            |

  Scenario Outline: each entry's own form is asserted, not one shape shared across the roster
    Given the roster entry <command>
    When its recall invocations are read over joined lines
    Then it carries <invocations> invocation(s)
    And they spell <flags>

    Examples: two carriers, two forms — ADR-007 §2, §3
      | command    | invocations | flags                                                                  |
      | refine.md  | 2           | `--area architecture --block` for the architect; `--item <ref> --block` for the PO |
      | shatter.md | 1           | `--block` alone — no `--item`, no `--area`                              |

  Scenario: the check reports its own denominator
    Given a green run of the check
    When its report is read
    Then it states how many command files it enumerated, how many are on the roster, and how many are excluded
    And those three numbers account for every file it read
