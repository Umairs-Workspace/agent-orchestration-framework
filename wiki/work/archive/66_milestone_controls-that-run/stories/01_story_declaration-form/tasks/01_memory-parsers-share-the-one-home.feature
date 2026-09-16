@executable @cli @work @memory
Feature: The one home is shared with the parsers memory already runs

  ACD's umbrella debt is that "nothing has one home" (`TECH_DEBT.md` item 0). This milestone
  introduces a declaration grammar; if it is written where it is USED, the tree gains a third copy
  of "what a declared id looks like" — inside the milestone whose thesis is that a control needs
  one home. This task is the one that prevents it.

  THE TWO EXISTING COPIES ARE REAL AND LOCATABLE. `parseRetrospective` builds its header regex
  inline at `src/memory/local-indexing.mjs:107`; `parseArchitecture` does the same at `:160`. Both
  have accepted the `#{2,3} <ID> [:·—–-]? <title>` shape since m05/ADR-007, and both keep working
  after this task — they simply stop owning the literal.

  THE REGRESSION NET IS UNUSUALLY STRONG, AND IT IS THE POINT. `src/memory/local-indexing.mjs` has
  24 dependents (`aof graph impact`, 2026-08-15): 2 source — `local-backend` and `graphify-backend`
  — and 22 test suites. The two source dependents consume records whose BYTES must not change. So
  the extraction is mechanical and the proof is differential: the same corpus in, the same records
  out.

  THIS IS A RE-HOME, NOT A REDESIGN. The grammar's behaviour is fixed by the sibling task; nothing
  about what memory recognises changes here. A change in recall behaviour would be a defect of this
  task, not a feature of it.

  "THE SAME RECORDS OUT" IS A DIFFERENTIAL, AND ITS CONSTANT IS RECORDED RATHER THAN REMEMBERED.
  FF-6604 records the measurement: 599 records — 340 `adr` and 259 `lesson` — each carrying the
  same 13 fields (`recordType, id, item, itemSlug, title, area, stage, kind, owner, status, summary,
  text, source`). That constant MOVES with the tree, because every ADR block and every lesson this
  repo writes is one more record, so the golden is re-recorded from the corpus immediately before
  the extraction and the assertion is the comparison, never the literal.

  THE NAMESPACE QUESTION IS SETTLED, AND IT WAS A REAL HAZARD (ADR-008 §1). The corpus writes
  `## R1 — <title>`: 259 bare, 0 hyphenated. A single hyphenated pattern would have returned 0
  lesson records and lost 259 of the 599. So the namespace is a CLOSED SET OF FORMS with `R<n>`
  unhyphenated among them, and each parser builds its `headerRe` from the form it already used —
  byte-identical to today's literal, so no record moves.

  THE OTHER TRAP IS SCOPE, AND IT IS MEASURED TOO (ADR-008 §2). 0 of the 340 ADR headings and 0 of
  the 259 lesson headings sit inside a frozen register block — memory's sources live in the open
  document. A re-home that imports the register-block predicate along with the forms returns 0 of
  599, which is why the leaf exports the two independently and memory takes only the first.

  THE SINGLE-HOME CLAIM ITSELF IS NOT A BEHAVIOUR. "No second copy of the literal exists under
  `src/`" has no black-box consequence that is not already covered by the differential below; a
  scenario asserting it would either restate the source scan or pass unchanged today. It is
  FF-6604's, and it stays there.

  Scenario Outline: the same corpus in, the same records out
    Given every `<file>` under `wiki/work` and the golden recorded from them before the extraction
    When records are built after the extraction
    Then it yields the same `<recordType>` records, one per heading the golden holds
    And each is identical to its golden across all 13 fields, `source` line number included

    Examples: the constants FF-6604 records, true of the corpus it was measured over
      | file             | records | recordType |
      | RETROSPECTIVE.md | 259     | lesson     |
      | ARCHITECTURE.md  | 340     | adr        |

  Scenario Outline: the header the parsers accept is the header the corpus writes
    Given the heading "<heading>" in a `<file>`
    When records are built after the extraction
    Then <outcome>

    Examples: every heading a real one at HEAD
      | heading                                                               | file             | outcome                                                                     |
      | ## R1 — "Requiring-grep" fitness tests penalise the correct refactor  | RETROSPECTIVE.md | one `lesson` record with id `R1` and the title after the dash — the bare-`R` form the whole corpus writes |
      | ## ADR-001: The folder name is the index                              | ARCHITECTURE.md  | one `adr` record with id `ADR-001`, status read from its `**Status:**` line  |
      | ### ADR-012 · a lesson-level ADR authored at h3                       | ARCHITECTURE.md  | one `adr` record — h3 anchors at both parsers today and still does           |
      | ## R5 · a middot separator                                            | RETROSPECTIVE.md | one `lesson` record — the separator set is unchanged by the re-home           |
      | ## Fitness functions                                                  | ARCHITECTURE.md  | no record — a register heading was never a memory source and does not become one |

  Scenario: memory's reach is the whole document, never a register block
    Given an `ARCHITECTURE.md` whose ADR headings all sit outside any `## Fitness functions` block
    When records are built after the extraction
    Then every ADR block still yields its record
    And the register-block rule scopes the declaration recogniser alone, never memory's parse
    And memory imports the id forms without importing that predicate, so the scope cannot leak in later

  Scenario: recall answers the same as before
    Given a recall query that returns `adr` and `lesson` records today
    When the same query runs after the extraction
    Then the same record ids are returned, in the same order, with the same `source` locations
    And no query that answered before now answers empty

  Scenario: the two source consumers are served the same records
    Given `local-backend` and `graphify-backend` consume the records memory builds
    When each serves a query after the extraction
    Then each returns what it returned before, field for field
    And neither consumer is edited to absorb a change in what it receives
