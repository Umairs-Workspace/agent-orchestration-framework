@executable @cli @work @work-stream
Feature: The filter is targeted and restored — only an ExperimentalWarning naming SQLite is swallowed, another experimental warning still prints, and process.emitWarning is restored after a successful and a throwing import

  Measured at refine on `node v22.22.2` (scratchpad `warn-probe.mjs`): wrapping
  `process.emitWarning` around `await import("node:sqlite")` and swallowing only `type ===
  "ExperimentalWarning" && /SQLite/.test(message)` swallowed exactly one warning, left
  `DatabaseSync` present, restored the original, and a second import in the same process emitted
  nothing — Node raises the warning once per process. The unfiltered control prints
  `(node:PID) ExperimentalWarning: SQLite is an experimental feature and might change at any time`.

  THE SEAM, stated once for this story. The leaf takes an INJECTED IMPORTER — a function defaulting
  to the real `() => import("node:sqlite")` — beside the `options.sqlite` injection both callers
  already carry, and each caller forwards the option it was handed. Every row below that plants a
  warning mid-import, makes an import throw, or counts an import drives it through that seam; task
  00's rows name the same one. Without it none of this is drivable in-process.

  Re-measured at the QA pass, and it constrains the predicate. Node hands THIS warning to a wrapper
  as `(message, "ExperimentalWarning", null, null)` — a `(message, type)` call with a null `code`
  and `ctor` behind it — but `process.emitWarning` takes three shapes in all: that one, an `Error`
  whose `.name` is the type (a type argument beside it is IGNORED — measured: an `Error` named
  `ExperimentalWarning` emitted with `"DeprecationWarning"` prints as an ExperimentalWarning), and
  `(message, { type })`. A predicate reading only the second argument is blind to two of them, and a
  wrapper that does not forward its arguments UNCHANGED strips the `code` and `ctor` off every
  warning it passes on. And because the warning is raised once per process, an in-process counting
  fake proves nothing after any earlier test has opened the store: the real-runtime leg is driven
  in a fresh child carrying no warning flag of its own.

  What would quietly undo this: a wrap with no `finally`, so a throwing import leaves the filter
  installed for the life of the process; a predicate on `ExperimentalWarning` alone, which swallows
  every experimental warning raised during the import; and the wrap installed at module load rather
  than around the import.

  ADR-008 §1, §3. FF-12608.

  Scenario: the SQLite warning is swallowed and the runtime arrives
    Given a child process that has not yet imported `node:sqlite`
    And it is spawned with no warning flag on its argv and neither `NODE_NO_WARNINGS` nor `NODE_OPTIONS` in its environment
    When it imports the runtime through the leaf
    Then its stderr is empty
    And the module it returns exposes `DatabaseSync`
    And a control child spawned the same way, importing `node:sqlite` directly, still prints the warning to stderr

  Scenario Outline: only an ExperimentalWarning naming SQLite is swallowed
    Given the leaf resolving through an injected importer in place of the runtime
    When a warning with <message> and <type as raised> is emitted <when>
    Then it is <verdict>

    Examples:
      | message                           | type as raised                     | when              | verdict   |
      | SQLite is an experimental feature | `"ExperimentalWarning"`, 2nd arg   | during the import | swallowed |
      | Foo is an experimental feature    | `"ExperimentalWarning"`, 2nd arg   | during the import | passed    |
      | The SQLite journal is deprecated  | `"DeprecationWarning"`, 2nd arg    | during the import | passed    |
      | SQLite is an experimental feature | an `Error`'s `.name`, Experimental | during the import | swallowed |
      | SQLite is deprecated              | an `Error`'s `.name`, Deprecation  | during the import | passed    |
      | SQLite is an experimental feature | `{ type: "ExperimentalWarning" }`  | during the import | swallowed |
      | SQLite is an experimental feature | `"ExperimentalWarning"`, 2nd arg   | after it returned | passed    |

  Scenario: the original is restored after success and after a throw
    Given `process.emitWarning` captured before the import
    When the leaf imports successfully
    Then `process.emitWarning` is `===` the captured function again
    When the leaf resolves through an injected importer that throws
    Then the caller catches the same object the importer threw, its `code` intact
    And `process.emitWarning` is `===` the captured function again

  Scenario: the filter is scoped to the import, not to the process
    Given a fresh instance of the leaf module, not yet loaded in this process
    And `process.emitWarning` captured before it is loaded
    When that module is loaded and no import is asked of it
    Then `process.emitWarning` is `===` the captured function
