@executable @cli @work @validate
Feature: test/arch's 433 flat siblings live in subject directories, and every register that cited one still resolves

  `test/arch/` holds 433 direct children and every one of them is a `*.test.mjs` file
  (`ls test/arch/*.test.mjs | wc -l` -> 433; `ls test/arch | wc -l` -> 433). A filename prefix is not
  a partition and this contract does not pretend it is: splitting each basename at its first hyphen
  after `acd-` yields 159 distinct tokens
  (`ls test/arch/*.test.mjs | sed 's|.*/||;s|^acd-||' | awk -F- '{print $1}' | sort -u | wc -l`), most
  of them singletons. The subject map is the builder's to draw; what is asserted here is the property
  the map has to satisfy.

  The citation price is re-measured at this beat rather than inherited, and it has moved.
  `citedControlPathsIn` (`src/work-doctor-controls.mjs:286`) over every `wiki/work/*/ARCHITECTURE.md`
  reports **163 distinct control paths across 183 register rows in 21 documents, and all 163 are
  under `test/arch/`**. ADR-004 measured 157/175/20 before this milestone's own register existed; the
  delta is exactly 119's eight rows, six new paths and one document. Twenty of the twenty-one belong
  to done items whose records are immutable. 119's is the one that is not, and amending it is the
  one-time cost the Decide stage priced (ADR-004; the proposed partition's note on ordering).

  Six of 119's eight cited paths do not exist at HEAD — they are its pending controls. The other two,
  `acd-suite-registration-single-decider.test.mjs` and `acd-session-driver-single-home.test.mjs`, are
  extensions of controls that 72, and 70 and 53, already cite; those citers are done. So this story
  moves control files that three separate immutable registers name, which is precisely the case
  ADR-004's resolver exists for and the first live exercise of its second limb.

  Seven suites read `test/arch/` as a FLAT directory, and each was checked for the vacuity trap
  rather than assumed loud: every one is backed by a floor or a named lookup, so an interior reds it
  by name instead of emptying it (ADR-003's LOUD class, which is not a defect and is repaired in the
  moving diff). `test/arch/acd-controls-never-execute.test.mjs:160` already recurses and needs
  nothing.

  What would quietly undo this: re-pointing one of the twenty immutable registers by hand instead of
  through 119/00's resolver, which converts a resolvable citation into an edit to a delivered record;
  amending 119's own register inside the move commit, where the priced cost becomes invisible; and
  the 22 `test/arch/<name>.test.mjs` literals in 13 `src/` modules, of which
  `src/work-audit/census.mjs:250` is the silent one — it puts `authority:` into every text-basis
  sweep limit the census REPORTS, so a stale one names an authority that is not there and nothing
  goes red.

  ADR-010 §1, §5. ADR-004. ADR-009. ADR-003 §4. FF-11903, FF-11904, FF-11906.

  Scenario: test/arch has an interior and every group declares itself
    Given the restructure has landed
    When `test/arch/` is listed
    Then it holds no `*.test.mjs` direct child
    And every directory beneath it that holds a suite carries exactly one `index.mjs`
    And no `index.mjs` is named `*.test.mjs`, so the recursive suite walk and the declared test roots see exactly the files they saw before
    And `test/arch/acd-controls-never-execute.test.mjs`'s recursive sweep still reaches every control in the tree, this milestone's six included

  Scenario Outline: a control path cited in a register resolves, or is reported by name
    Given a register row citing <citation>
    When `aof work doctor` probes the declared controls
    Then the citation <outcome>

    Examples: the resolver's two limbs, and the shapes that are not control citations at all
      | citation                                                    | outcome                                                              |
      | a control this story moved, cited by a done register        | resolves through the recorded rename, and no finding is raised       |
      | a control this story moved, cited by 119's own register     | resolves at HEAD, because that register was amended                  |
      | acd-session-driver-single-home, cited by 53, 70 and 119     | resolves for all three: one amended, two through the rename          |
      | a control still pending at HEAD                             | control-unresolved at warn, as it did before the move                |
      | a path no commit in this repository ever held               | control-unresolved, naming the path                                  |
      | a family reference carrying a wildcard                      | is not a control citation and is not probed, as before               |
      | a cited path carrying a line locator                        | resolves on the file, the locator dropped                            |
      | a path written relative to the register                     | resolves in its repo-relative form                                   |

  Scenario: the register amendment is visible, bounded and the only one
    Given this story's diff
    When the `wiki/work/*/ARCHITECTURE.md` files it touches are listed
    Then exactly one is present, and it is 119's
    And the eight control paths it cites all resolve at HEAD without the rename limb
    And the twenty done registers are unchanged
    And `aof work doctor` reports no `control-unresolved` for any of those twenty

  Scenario Outline: a control that read test/arch as a flat directory fails loudly and is repaired here
    Given <control> reads `test/arch/` with a non-recursive `readdir`
    When the interior lands
    Then it fails naming its own subject rather than sweeping an empty listing
    And this story's diff repairs it in the same commit

    Examples: seven flat readers, each already backed by a floor or a named lookup
      | control                                                       |
      | test/arch/acd-roundtrip-registration.test.mjs:61              |
      | test/arch/acd-loop-finding-envelope.test.mjs:484              |
      | test/arch/acd-home-pane-truth.test.mjs:560                    |
      | test/arch/acd-outcome-dangling-declaration-present.test.mjs:43 |
      | test/work-loops-commands.test.mjs:1681                        |
      | test/work-loops-coverage-ledger.test.mjs:300 and :703         |
      | test/work-loops-registry-census.test.mjs:1136                 |

  Scenario: the two digest-frozen suites advance their residue with a reason, and stay frozen
    Given `53/FF-5311`'s ACCEPTED_CEILINGS pins every byte of two suites this story moves and edits
    When the move lands
    Then each row's stored `file:` names the suite at its new path
    And each residue is re-stamped to the reviewed bytes, with the reason and this story named above the row, in the shape 55/01, 57/01 and 58/02 each used
    And the permitted-region mask set is unchanged, so nothing is exempted
    And a further edit outside those regions still fails the ceiling

  Scenario: the budget row falls rather than keeping headroom
    Given FF-11904's table carries a `test/arch/` row at the count measured when 119/01 landed it
    When this story shrinks that layer
    Then the row is lowered to the new measured count with no headroom
    And the control fails if the row is left where it was
    And the row's sweep is non-vacuous, so a renamed directory reds it instead of emptying it
