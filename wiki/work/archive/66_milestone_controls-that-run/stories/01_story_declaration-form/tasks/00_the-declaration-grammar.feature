@executable @cli @work @work-stream
Feature: A declaration is an id in first position inside a register block — everything else is a citation

  `STATE.md` calls this "the hard part, not the check", and the finding priced it: the
  duplicate/dangling check ran at 33% PRECISION AS WORDED, and 100% once two conventions were added
  — declarations live only in the register file, and "next free id" is a reservation rather than a
  citation (§5b). Without a declaration form the check is not weak; it is unbuildable for two of
  the three registers that actually collided.

  THE RULE IS ABOUT POSITION, NOT PREFIX. That is what makes it worth freezing: the finding's two
  false positives dissolve as CONSEQUENCES of one rule rather than as two special cases.
  `### D-17 is now LIVE, and sharper than the ledger said` sits in a `STATE.md` — outside any
  register block, therefore a citation. `**Next free id is D-37.**` sits inside the block, but the
  id is not the first token — therefore a citation. A reservation needs no special case.

  MEASURED OVER ACD'S OWN TREE, 2026-08-15, 67 milestone folders. The `VERIFICATION.md` findings
  register is written FOUR ways (`| F-NN` ×101, `| **F-NN` ×49, `### F-NN` ×33, `- **F-NN` ×26).
  Of the fitness registers — 37 exact `## Fitness functions` openers, 45 once the opener normalises
  — only 3 carry `FF-NN` ids at all; the rest declare invariants with no id, which under this rule
  declares nothing and is compliant by construction. Meanwhile ADR blocks and `RETROSPECTIVE.md`
  lessons have one form each AND ARE ALREADY MACHINE-PARSED: `/^#{2,3}\s+ADR-\d+/` at
  `src/memory/local-indexing.mjs:160` and `/^#{2,3}\s+R\d+\b/` at `:107`, since m05/ADR-007.

  SO THE GRAMMAR IS ADOPTED, NOT INVENTED. Admitting the two markdown block anchors already in
  service — a heading, and a table row's first cell — covers every register without migrating one.
  The bullet form is deliberately NOT admitted: tolerating `- **F-28 · BLOCKER…**` is exactly the
  33%-precision configuration the finding measured.

  THE CLOSURE ROUND SHARPENED FOUR EDGES OF IT (ADR-008). The namespace is a CLOSED SET OF FORMS
  rather than one pattern, and `R<n>` carries no hyphen — 259 bare in the corpus, 0 hyphenated. The
  opener normalises: matched case-insensitively with a trailing parenthetical stripped, and nothing
  else. A block DECLARES or CITES by the file it sits in — `## Fitness functions` declares in an
  `ARCHITECTURE.md` and cites in a `VERIFICATION.md`. A cross-file ref takes an optional `m` (430
  `m52/ADR-007` against 1,756 bare `52/ADR-007`), and a dotted id declares nothing on purpose:
  `F-05` and `F-05.1` have a relationship no check can know, so all 18 stay outside the namespace.

  THE ROWS BELOW ARE THE CORPUS, NOT INVENTED CASES. Classified at HEAD over every `VERIFICATION`,
  `SESSION` and `ARCHITECTURE` file: inside the two frozen blocks sit 67 `| **F-NN` rows, 51
  `| F-NN` rows and 21 `### F-NN` headings — every one a declaration under this grammar — and 7
  bullets, none of them. OUTSIDE those blocks, 53 table-row lines in the two admitted forms sit
  under a non-frozen h2 and declare nothing. Fenced text carries 0 declaration-shaped lines and 0 block
  openers today, so rule 3 is prospective and its trigger is 66/03's register-bodied template.

  ONE HALF OF ADR-001 IS NOT A BEHAVIOUR AND IS NOT SCENARIO'D HERE. That the grammar, the
  namespace and the heading set are frozen literals exported from exactly one module is a
  structural invariant, carried by FF-6603 and FF-6604 — never by a scenario. What IS behaviour is
  what the recogniser answers, line by line, and that is the whole of this contract.

  Scenario Outline: the four forms the findings register is written in, and the two dissolved false positives
    Given the line "<line>" inside a `## Findings` block in a `VERIFICATION.md`
    When the recogniser reads it
    Then the answer is <answer>

    Examples: every line a real one at HEAD unless marked, measured 2026-08-15
      | line                                                                        | answer                                                                              |
      | \| F-2 \| Same shape, and the test had been **retitled** … \|               | declaration of `F-2` — the cell boundary terminates the id (51 such rows)            |
      | \| **F-2701** \| KR3 soak (task 06) ran single-OS … \|                      | declaration of `F-2701` — bold emphasis around the id changes nothing (67 such rows) |
      | ### F-47-V-1 — Back/Forward does not re-narrow: the address moves           | declaration of `F-47-V-1` — heading anchor, suffixed id, em-dash separator (21)      |
      | - **F-1 — No delivered launch path serves the board same-origin…**          | citation — a bullet is not an admitted anchor; deliberately not tolerated (7)        |
      | **Next free id is D-37.**                                                   | citation — no block anchor, and the id is not the first token; a reservation          |
      | ### D-17 is now LIVE, and sharper than the ledger said                      | citation — prose follows the id with no separator, so the id is a subject not a label |
      | \| F-05.1 \| Task 00's cell … is **arithmetically unreachable** \|          | citation — `.` is outside the namespace, so this row declares nothing (18 rows)      |
      | \| 52/FF-5204 \| a qualified ref standing in the first cell \|              | citation — a cross-file ref declares nothing, with or without the `m` (prospective)   |
      | \|  \| an empty first cell \|                                               | citation — there is no id to be first (prospective)                                   |

  Scenario Outline: the id namespace, and the token that must follow the id
    Given the line "<line>" inside a register block
    When the recogniser reads it
    Then the answer is <answer>

    Examples: the closed set of forms, the separators, and what falls outside
      | line                                                                        | answer                                                                              |
      | ### FF-1 · The loop registry never enters the item vocabulary               | declaration of `FF-1` — middot separator                                             |
      | \| **FF-5201 · The loop registry never enters the item vocabulary.** \|     | declaration of `FF-5201` — m52's real row: id first, `·` next, the bold closing late |
      | ### D-1 — a debt entry                                                      | declaration of `D-1` — em dash                                                       |
      | ### F-9 – a finding                                                         | declaration of `F-9` — en dash                                                       |
      | ## ADR-001: The folder name is the index                                    | declaration of `ADR-001` — colon; 340 of 340 ADR headings conform at the measurement ADR-008 records |
      | ### R1 — "Requiring-grep" fitness tests penalise the correct refactor       | declaration of `R1` — the bare-`R` form, 259 in the corpus and 0 hyphenated           |
      | ### F-47-V-3 - a hyphen separator                                           | declaration of `F-47-V-3` — suffixed id, hyphen separator                            |
      | ### F-3-bis                                                                 | declaration of `F-3-bis` — end of line terminates the id                             |
      | ### R-1 · a hyphenated lesson id                                            | citation — `R<n>` is the form and it takes no hyphen; widening the set is an ADR act  |
      | ### X-1 · id-shaped, outside the namespace                                  | citation — `X` is in none of the forms, and admitting one is an ADR act               |
      | ### ff-6603 · lower case                                                    | citation — an id is matched case-sensitively; only the register opener normalises     |
      | ### 17 · a bare number                                                      | citation — a number without a prefix is not an id                                     |
      | #### FF-1 · an h4                                                           | citation — only h2 and h3 anchor a declaration                                        |
      | ###FF-1 · no whitespace after the hashes                                    | citation — the anchor needs its separating whitespace                                 |
      | \| FF-1 and FF-2 are one guard \| … \|                                      | citation — prose follows the id with no separator; the `### D-17` shape, in a cell     |

  Scenario Outline: where a register block opens, where it ends, and what a fence hides
    Given a findings row whose first cell holds `**FF-6603**` alone
    When that row is placed <placement>
    Then the answer is <answer>

    Examples: the frozen opener set is two headings, each normalised the one way ADR-008 §3 allows
      | placement                                                                   | answer                                                                              |
      | under `## Fitness functions` in an `ARCHITECTURE.md`                        | declaration — one of the two frozen openers                                          |
      | under `## Findings` in a `VERIFICATION.md`                                  | declaration — the other frozen opener                                                |
      | under `## Findings` in a `SESSION.md`                                       | declaration — a uat session keeps the same findings register                          |
      | under `## Fitness functions` in a `VERIFICATION.md`                         | citation — the block CITES in that file, so ADR-005's red-probe row resolves to the architecture declaration instead of making a second one |
      | under `## Fitness Functions` — capital F, 2 files at HEAD                   | declaration — the opener is matched case-insensitively, which recovers both files     |
      | under `## Fitness functions (this milestone)` — 6 files, or `## Findings (added at re-open)` — 1 | declaration — a trailing parenthetical is stripped, which recovers all seven |
      | under `## Story NN findings` — 4 files at HEAD                              | citation — a per-story sub-register is grandfathered, never renamed and never admitted |
      | under the next h2 in the same file, such as `## User sign-off`              | citation — 53 table-row lines sit outside a block at HEAD, declaring nothing         |
      | after the `---` rule that closes the block                                  | citation — a horizontal rule ends the block as surely as a heading                    |
      | under an `###` subheading nested inside the block                           | declaration — h3 does not close the block, which is how 21 heading declarations sit   |
      | inside a fenced code block nested inside the register block                 | citation — 0 at HEAD, prospective: a quoted sample is not a register                  |
      | below a `## Findings` heading that is itself inside a fence                 | citation — a fenced opener opens nothing, so the rows under it are not in any block   |
      | after a `---` rule that is itself inside a fence                            | declaration — a fenced rule closes nothing, so the block is still open                |
      | in a `STATE.md`, a `SPEC.md`, or a task `.feature` — including this file's own Examples table | citation — a register block exists only in its own register file, so a contract may quote the form without declaring it |

  Scenario: a register that carries no ids declares nothing, and acquires obligations only when it acquires ids
    Given a fitness table whose rows carry an invariant and no id column
    When the recogniser reads it
    Then it yields no declarations
    And the file is compliant by construction rather than by exemption

  Scenario: an id is unique within its register file, and a cross-file citation carries the item ref
    Given `FF-5204` declared in milestone 52's register
    When it is cited from another milestone's document
    Then the resolving form is `52/FF-5204`, or `m52/FF-5204` with the optional prefix
    And a bare `FF-5204` resolves only inside milestone 52's own register
    And per-milestone id spaces such as `FF-52NN` and `FF-66NN` are therefore both legal
