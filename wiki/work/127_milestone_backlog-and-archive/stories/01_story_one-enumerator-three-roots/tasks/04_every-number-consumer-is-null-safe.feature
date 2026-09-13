@executable @cli @work @work-stream
Feature: Every .number consumer is null-safe, and the mint counts every number that was ever minted

  `grep -rnoE "parseInt\([^()]*\.number[^()]*\)" src` at `2321dce8` finds 45 sites in exactly ten
  files: `src/work.mjs` (21), `src/work/reindex.mjs` (9), `src/commands/migrate-folder.mjs` (4),
  `src/commands/insert-shared.mjs` (3), `src/work/doctor-depends.mjs` (2), `src/work/doctor-freshness.mjs`
  (2 — one of them `:254`'s `entry?.number`, a ROADMAP index entry, guarded the same way), and one
  each in `src/work/doctor.mjs`, `src/work/doctor-coherence.mjs`, `src/memory/local-indexing.mjs`,
  `src/work-promote/promotion.mjs`. (`src/work/doctor-controls.mjs:159` parses `numbers[…]`, an
  array, and is not a `.number` site; the SPEC's "33" counted lines.) `Number.parseInt(null, 10)` is `NaN`,
  which compares false to everything and sorts nowhere — so an unguarded site over a backlog row is
  a silent mis-answer, not a crash, which is exactly why a textual control holds it (ADR-002 §4).

  Two sites carry a DECISION, not just a guard — both re-read against the SPEC rather than taken
  from ADR-002 §2's sentence, which puts them under one rule:

    appendPosition   src/work-promote/promotion.mjs:52 — reduces over EVERY NUMBERED row, live AND
                     archived, never over `isLiveStreamRow`. A number is never retired (SPEC), so
                     the mint must see the archive: over live rows alone, archiving the highest-
                     numbered item would re-mint its number for the next promotion. Backlog rows
                     (no number) are what it excludes.
    selectAffected   src/work/reindex.mjs:53-77 — the SHIFT set of `--at P` is LIVE rows ≥ P only:
                     an archived row's number is never shifted (ADR-004 §5) and a backlog row has no
                     number to shift. Consequence for story 02: `promote --at P` must refuse when an
                     archived item holds a number the shift would land a live item on — recorded in
                     STATE.md for story 02's refine; not this story's to build.

  The other sites are mechanical: a site that reduces or indexes over rows filters first (through
  `isLiveStreamRow` where the question is scheduling, through `number != null` where it is
  numbering); a site that reads one row guards it. Story rows always carry a number, so a site that
  first narrows to `type === "story" && parent != null` is guarded by that narrowing. No site swallows
  `NaN` with an `isFinite` filter AFTER the parse in place of a guard BEFORE it.

  What would quietly undo this: an eleventh file added to the set without being added here (the
  set-equality assertion is what makes it conscious); `appendPosition` filtered through
  `isLiveStreamRow` because ADR-002 §2 says "live"; a `?? 0` defaulting a null number to zero (row
  `00` exists in this stream).

  ADR-002 §2, §4. FF-12702.

  Scenario: the mint counts the archive
    Given the three-root fixture, plus `archive/20_chore_omega/CHORE.md` (`done`)
    When `appendPosition` is asked for the next number
    Then it answers `21`, not `12`
    And the backlog rows `gamma`, `delta` and `epsilon` contribute nothing to the answer

  Scenario Outline: the mint answers the highest number ever minted plus one, and nothing else moves it
    Given <stream>
    When `appendPosition` is asked for the next number
    Then it answers <answer>

    Examples: live above archive, archive above live, backlog alone, nothing at all
      | stream                                                       | answer | why                                                                                        |
      | the three-root fixture                                       | 12     | live max 11 above archived max 06                                                          |
      | the fixture plus `archive/20_chore_omega/`                   | 21     | the headline — archived max above live max                                                 |
      | the fixture without `archive/`                               | 12     | unchanged                                                                                  |
      | `archive/05_milestone_zeta` and `archive/06_chore_eta` alone | 7      | the archive alone still seeds the mint                                                     |
      | the three backlog leaves alone                               | 0      | three un-numbered rows are not three numbers; `00` is the first number                     |
      | `00_chore_a`, `01_chore_b` and five backlog leaves           | 2      | a backlog row must not inflate the count floor in `Math.max(highest + 1, topLevel.length)` |
      | an empty work directory                                      | 0      | unchanged                                                                                  |

  Scenario: the shift set is the live rows and nothing else
    Given the three-root fixture, plus `archive/20_chore_omega/CHORE.md`
    When `selectAffected` selects the top-level rows an insert at `10` would shift
    Then it returns exactly `10_milestone_alpha` and `11_chore_beta`
    And neither `20_chore_omega` nor any backlog row is in the set
    And a nested selection under milestone `10` at `00` returns exactly `10/00`

  Scenario Outline: the shift set at every position
    Given the three-root fixture, plus `archive/20_chore_omega/CHORE.md`
    When `selectAffected` is asked for `space: "<space>"`, `parent: <parent>`, `at: "<at>"`
    Then it returns exactly <set>

    Examples: live rows at or above the position, and never an archived or backlog row
      | space     | parent | at | set                                   | why                                                          |
      | top-level | none   | 10 | `10_milestone_alpha`, `11_chore_beta` | the headline                                                 |
      | top-level | none   | 11 | `11_chore_beta`                       | at the top live row                                          |
      | top-level | none   | 12 | nothing                               | an append shifts nothing                                     |
      | top-level | none   | 05 | `10_milestone_alpha`, `11_chore_beta` | the archived 05 and 06 are ≥ 5 and are never shifted         |
      | top-level | none   | 00 | `10_milestone_alpha`, `11_chore_beta` | every live row; no backlog row has a number to shift         |
      | top-level | none   | 20 | nothing                               | the archived 20 is not shifted — story 02's refusal case     |
      | nested    | "10"   | 00 | `10/00`                               | the headline                                                 |
      | nested    | "10"   | 01 | nothing                               | above the only story                                         |
      | nested    | "05"   | 00 | nothing                               | an archived milestone's stories are never shifted            |

  Scenario: the readers that sort or index by number ignore what has no number
    Given the three-root fixture
    When `listStream`, `findWork` with a span, `nextWork`, `validateWork`, the doctor snapshot, the depends and coherence lanes and `buildRecords` each run over it
    Then none throws, none keys a map or set at `NaN`, and none places a backlog row among the numbered rows
    And `buildRecords("delta", …)` — a memory rebuild scoped by a backlog slug — throws nothing, keys nothing at `NaN` and indexes nothing numbered; the UNSCOPED rebuild indexes `delta`'s own docs under `item: "delta"` (a slug-scoped `--only` is not built here: `isMilestoneSource` compares numbers and `refInScope` answers `null` for a slug, as today)

  Scenario: every site in the ten files is guarded, and the set is exactly ten
    Given the arch-test `test/arch/work/acd-number-null-safe.test.mjs`, registered in `test/arch/work/index.mjs`
    When it reads each of the ten files and finds every `Number.parseInt(<expr>.number, 10)` site
    Then the set of files holding at least one site is exactly the ten named above, asserted by set-equality
    And for every site, the text of its enclosing TOP-LEVEL function — the outermost declaration, so a comparator or arrow inside it is judged by the function that owns it — from its opening line to the site contains one of: a call to `isLiveStreamRow`, `.filter(isLiveStreamRow)`, a `.number != null` / `!== null` / `== null` / `=== null` guard, or a narrowing on `type === "story"` / `type !== "story"`
    And a site the rule cannot classify is admitted only by an explicit allow-list keyed by file + enclosing function + reason (never by line, which moves): `src/commands/migrate-folder.mjs` `recoverSourceStories` / `recoverSourceTasks` (source-scan units, not enumerator rows), `src/work/doctor-freshness.mjs` `roadmapFolderMismatch` (a ROADMAP index entry, `:248`), `src/work/reindex.mjs` `reindexForInsert` (its rows are `selectAffected`'s output, filtered there) — so a new one cannot arrive silently
    And at least ten sites are classified, so the control is non-vacuous
    And an unguarded site fails the control with one finding naming `file:line`
    And the control passes at HEAD

