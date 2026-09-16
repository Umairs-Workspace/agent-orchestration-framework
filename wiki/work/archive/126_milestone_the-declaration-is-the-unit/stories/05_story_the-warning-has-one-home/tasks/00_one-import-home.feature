@executable @cli @work @work-stream
Feature: One import home — exactly one module in src imports node:sqlite, both callers reach it by import, and neither caller's refusal or degrade path moves

  `grep -rn 'import("node:sqlite")' src/` returns exactly two lines: `src/effects/journal.mjs:44`
  and `src/global-work-store.mjs:162`, each inside its own `resolveSqlite` body (`:41-50` and
  `:152-172`) — two copies of one act. The store's body accepts `options.sqlite` as an injected
  module and `options.sqlite === false` as a forced-unavailable, and throws `sqlite-unavailable`
  (501); the journal's body throws its own `sqlite-unavailable` through `journalError`. The leaf
  that replaces both resolves the runtime and decides nothing; each caller keeps its refusal.

  The two refusals are NOT the same refusal, measured at the QA pass: the journal's guard is a
  truthiness check, so `sqlite: false` falls THROUGH it and the journal opens normally, while the
  store's `=== false` is a coded 501; and an injected module lacking `DatabaseSync` reaches both
  callers unvalidated, failing as a raw TypeError rather than a coded refusal. Each is a row below,
  because ADR-008 §2 says neither caller's behaviour moves — including the parts that look uneven.

  The rows below drive the leaf through its INJECTED IMPORTER, the seam task 01 states once: the
  leaf takes an importer defaulting to the real `() => import("node:sqlite")`, and each caller
  forwards the option it was handed. That is what makes a throwing runtime and a counted import
  drivable in-process, with no filesystem trick and no reliance on a warning Node raises once.

  What would quietly undo this: the leaf absorbing one caller's refusal so the other's changes; a
  third caller importing `node:sqlite` directly because the leaf's name was not obvious; the
  store's injected-module seam lost in the collapse, which every store fixture relies on; and the
  `typeof sqlite.DatabaseSync !== "function"` check both bodies run on the IMPORTED path dropped
  with them — that check is why a runtime without `DatabaseSync` is a coded 501 today, where an
  INJECTED module is passed through unvalidated, and a leaf that only imports would collapse the
  first case onto the second.

  ADR-008 §1-§2. FF-12608.

  Scenario: the runtime is imported in one place
    Given the source tree under `src/`
    When every module is inspected with comments stripped
    Then exactly one module imports `node:sqlite`, statically or dynamically
    And `src/effects/journal.mjs` and `src/global-work-store.mjs` each import that module

  Scenario Outline: the store's refusal and its injected seam are unchanged
    When the global work projection store is opened with <options>
    Then it <outcome>

    Examples:
      | options                                                                     | outcome                                                                                          |
      | `sqlite: false`                                                             | throws `sqlite-unavailable`, status 501, in the projection's words                               |
      | `sqlite` a fake module exposing `DatabaseSync`                              | opens on the fake — the injected importer is never called                                        |
      | `sqlite` a fake module with no `DatabaseSync`                               | uses the fake as given — `TypeError: sqlite.DatabaseSync is not a constructor`, no coded refusal |
      | no `sqlite`, the runtime resolvable                                         | opens through the leaf on the real runtime                                                       |
      | no `sqlite`, an injected importer that throws                               | throws `sqlite-unavailable`, status 501                                                          |
      | no `sqlite`, an injected importer resolving a module with no `DatabaseSync` | throws `sqlite-unavailable`, status 501 — the check stays in the caller's own body               |

  Scenario Outline: the journal's refusal is unchanged, and it is the journal's own
    When the effects journal is opened with <options>
    Then it <outcome>

    Examples:
      | options                                                                     | outcome                                                                                                    |
      | no `sqlite`, the runtime resolvable                                         | opens `journal.sqlite` at schema 1 through the leaf                                                        |
      | `sqlite` a fake module exposing `DatabaseSync`                              | opens on the fake — the injected importer is never called                                                  |
      | `sqlite` a fake module with no `DatabaseSync`                               | uses the fake as given — `TypeError: sqlite.DatabaseSync is not a constructor`, no coded refusal           |
      | `sqlite: false`                                                             | opens normally — the forced-unavailable is the store's, not this                                           |
      | no `sqlite`, an injected importer that throws                               | throws `sqlite-unavailable`, status 501, in the journal's words                                            |
      | no `sqlite`, an injected importer resolving a module with no `DatabaseSync` | throws `sqlite-unavailable`, status 501, in the journal's words — the check stays in the caller's own body |

  Scenario: both callers open and work through the leaf
    Given a temporary global home
    And a counting importer injected at the leaf, delegating to the real runtime
    When the projection store and the effects journal are each opened and written once
    Then both succeed
    And the counting importer records one call for the store's open and one for the journal's — the leaf is what imported the runtime for both
