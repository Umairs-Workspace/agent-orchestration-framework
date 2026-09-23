@cli @work @validate
Feature: validate holds an AOF.md record doc to the template
  In order that a digest cannot drift from its contract unnoticed
  validate must check a milestone's AOF.md against the template's key set and section set —
  read from the shipped template, not from a second list

  Background:
    Given a fresh stream with milestone folder `00_milestone_foundation` whose record doc is an `AOF.md`
    And `CONFORMING` is the frontmatter `doc: digest`, `milestone: 00`, `slug: foundation`, `title: "Foundation"`, `status: done`, `imported: true`, `importedBy: aof`, `source: legacy`, `importedAt: 2026-09-23`, `schema: 1`, `aofVersion: 0.1.0` over the sections `## Intent`, `## Scope`

  @executable
  Scenario: a conforming digest validates clean
    When the stream is validated
    Then no finding names `00_milestone_foundation/AOF.md`

  @executable
  Scenario Outline: a frontmatter defect is named, an absent OMIT key is not
    Given the AOF.md frontmatter is `CONFORMING` <change>
    When the stream is validated
    Then the findings against `00_milestone_foundation/AOF.md` are <finding>

    Examples:
      | change                          | finding                                                                          |
      | without `title`                 | `digest frontmatter is missing "title" (the AOF.md template requires it)`       |
      | without `importedBy`            | `digest frontmatter is missing "importedBy" (the AOF.md template requires it)`  |
      | without `imported`              | `digest frontmatter is missing "imported" (the AOF.md template requires it)`    |
      | plus `owner: product-owner`     | `digest frontmatter key "owner" is not in the AOF.md template`                  |
      | plus `type: milestone`          | `digest frontmatter key "type" is not in the AOF.md template`                   |
      | without `source`                | none                                                                             |
      | without `importedAt`            | none                                                                             |
      | without `source` or `importedAt` | none                                                                            |

  @executable
  Scenario Outline: a section defect is named
    Given the AOF.md frontmatter is `CONFORMING` over the sections <sections>
    When the stream is validated
    Then the findings against `00_milestone_foundation/AOF.md` are <finding>

    Examples:
      | sections                              | finding                                                                                          |
      | `Intent`, `Notes`                     | `digest section "Notes" is not in the AOF.md template (Intent, Scope, Decisions, Lessons)`      |
      | `Scope`, `Intent`                     | `digest section "Intent" is out of the AOF.md template's order (Intent, Scope, Decisions, Lessons)` |
      | `Intent`, `Intent`                    | `digest section "Intent" appears more than once`                                                 |
      | `Lessons`                             | none                                                                                             |
      | `Intent`, `Decisions`, `Lessons`      | none                                                                                             |
      | (no `## ` heading)                    | none                                                                                             |

  @executable
  Scenario Outline: digests already written by earlier imports stay green
    Given the AOF.md is shaped like <shape>
    When the stream is validated
    Then no finding names `00_milestone_foundation/AOF.md`

    Examples:
      | shape                                                                                     |
      | an import that stamped `source` and `importedAt` (the archived milestone 42 digest's keys) |
      | an import that predates `source` (`importedAt`, `schema`, `aofVersion`, no `source`)       |

  @executable
  Scenario: the key and section sets validate enforces are the ones the template declares
    When the shipped template `src/bundle/templates/milestone/AOF.md` is parsed independently in the test
    Then its required keys, OMIT keys and ordered `## ` headings equal the sets the digest contract exposes to validate
    And a native `SPEC.md` record doc is held to none of the digest rules
