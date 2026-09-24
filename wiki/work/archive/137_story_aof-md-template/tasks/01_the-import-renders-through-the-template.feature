@cli @work @memory
Feature: the import renders every AOF.md through the template
  In order that every imported digest has the same shape whichever model recovered it
  the import must fill the shipped template — one renderer, for the co-located write and the
  legacy store's intent-only digest alike — rather than hand-building the document

  Background:
    Given `IMPORTED_AT` is `"2026-09-23"`
    And `FULL` is a recovered shape with meta `{ slug: "calls", title: "Calls", status: "done" }`, an objective, a scope, one decision `ADR-001 "Queue the calls"` and one outcome `R1 "Keep it small"`

  @executable
  Scenario Outline: the frontmatter keys follow the template's order, dropping only an absent OMIT key
    When `writeColocatedDigest` writes `FULL` for milestone `03` with <inputs> into a fresh folder
    Then the written `AOF.md` frontmatter keys are, in order, `<keys>`

    Examples:
      | inputs                                   | keys                                                                                   |
      | sourceSlug `"legacy"`, importedAt set    | doc, milestone, slug, title, status, imported, importedBy, source, importedAt, schema, aofVersion |
      | no sourceSlug, importedAt set            | doc, milestone, slug, title, status, imported, importedBy, importedAt, schema, aofVersion |
      | sourceSlug `"legacy"`, no importedAt     | doc, milestone, slug, title, status, imported, importedBy, source, schema, aofVersion |

  @executable
  Scenario: a fresh import is born-stamped, so validate never calls it stale
    Given a stream whose folder `03_milestone_calls` holds only a legacy `SPEC.md`
    When `writeColocatedDigest` writes `FULL` for milestone `03` with sourceSlug `"legacy"` into that folder
    Then the `AOF.md` frontmatter reads `schema: <WORK_ITEM_SCHEMA_VERSION>` and `aofVersion: <packageVersionString()>`
    And validating that stream reports no finding against `03_milestone_calls/AOF.md`

  @executable
  Scenario Outline: sections follow the template's order and an absent half yields no section
    When `writeColocatedDigest` writes a recovered shape carrying <halves> into a fresh folder
    Then the written `AOF.md` `## ` headings are, in order, `<headings>`
    And `parseAof` over it yields <count> `summary` records

    Examples:
      | halves                                     | headings                          | count |
      | an objective only                          | Intent                            | 1     |
      | an objective and a scope                   | Intent, Scope                     | 2     |
      | a scope only                               | Scope                             | 1     |
      | one decision only                          | Decisions                         | 1     |
      | an objective and one outcome               | Intent, Lessons                   | 2     |
      | all four halves (`FULL`)                   | Intent, Scope, Decisions, Lessons | 4     |
      | nothing (intent null, no decisions/outcomes) | (none)                          | 0     |

  @executable
  Scenario: the recovered prose lands verbatim and a re-import is byte-identical
    When `writeColocatedDigest` writes `FULL` twice into the same folder with the same inputs
    Then the two writes are byte-identical
    And the `## Intent` body is `FULL`'s objective, trimmed, character for character
    And the `## Decisions` body is the line `- **ADR-001** Queue the calls`

  @executable
  Scenario: the co-located and the legacy-store digests come from the one renderer
    Given an intent-only recovered shape with meta `{ slug: "calls", title: "Calls", status: "done" }`
    When `writeColocatedDigest` writes it for milestone `03` with no sourceSlug and `IMPORTED_AT`
    And `materializeImport` materializes it for milestone `03` with `IMPORTED_AT`
    Then both `AOF.md` files have the same frontmatter key sequence and the same `## ` headings
    And no `.mjs` file under `src/` contains the double-quoted literal `"doc: digest"`
