@executable @cli @work @work-stream
Feature: The node's shared cache-read module is named for its subject and not for the first face that read it — `src/board-worker-stream.mjs` becomes `src/cache-read.mjs`, exports and all

  Item 10 set this trigger at *the tenth dependent, or the `src/mesh/` partition, whichever comes
  first*. Both have fired. `aof graph impact src/board-worker-stream.mjs` reports **11** dependents
  against the 9 that were counted when the trigger was written, and
  `grep -rlE '(from|import\()\s*"[^"]*board-worker-stream\.mjs"' src test scripts app ui` lists **12**
  files carrying its specifier — 9 under `src/` and 3 under `test/`. The module is **404** lines
  (`wc -l`) with **12** exported functions (`grep -c '^export ' src/board-worker-stream.mjs`), and it
  contains no render and no HTTP: its own header already says its subject widened past the one face
  its name still claims.

  The readers are what decide the new home, and they were listed rather than characterised. Seven of
  the nine `src/` importers are spine — the read seam and the `doc`, `list`, `tasks`, `continue`,
  `run-status` and `doctor` commands — and two are mesh (`mesh-launcher`, `commands/mesh-heartbeat`).
  A module whose readers span both layers cannot live in either one's directory, so ADR-005 §5 sends
  it to the ROOT as `src/cache-read.mjs`. Putting it in `src/mesh/` would repeat the naming error one
  directory in, which is the whole shape 43/ADR-016 recorded.

  This is a rename, not a removal, so the root's measured count does not move: `ls src/*.mjs | wc -l`
  is 88 after tasks 00 and 01 and 88 after this one. The rename is the file's; the twelve exported
  names are not part of it — `readWorkerItems` and `readWorkerRuns` are named for the *authority* that
  streamed the rows, which is still the worker, and renaming them would be a second act wearing this
  one's clothes.

  What would quietly undo this: renaming the exports along with the file, which turns a mechanical
  rewrite into a behavioural diff nothing in this story is verifying; re-aiming
  `acd-cache-read-surface-boundary` at this module, whose subject is and remains the read seam, so the
  two controls would then both claim the name and neither would guard its own subject; and leaving the
  file's header asserting a face while its name no longer does, which recreates the drift one layer
  down in prose.

  ADR-005 §5, ADR-008, TECH_DEBT item 10. FF-11905.

  Scenario: the file is renamed and its exported surface is untouched
    Given `src/board-worker-stream.mjs` with its 12 exported functions
    When the rename lands
    Then `src/cache-read.mjs` exists and `src/board-worker-stream.mjs` does not
    And the set of exported names from `src/cache-read.mjs` equals the set that was exported from `src/board-worker-stream.mjs`
    And no exported function's signature or returned shape changed
    And `ls src/*.mjs | wc -l` reports the same count before and after this task

  Scenario: every reader resolves at the new name
    Given the 12 files that carried the old specifier
    When their specifiers have been rewritten
    Then a search for a `board-worker-stream.mjs` import specifier over `src`, `test`, `scripts` and `app` returns nothing
    And each of the 12 files loads without a resolution error
    And each of the 9 `src/` readers imports the same named bindings it imported before

  Scenario Outline: the rename's reach is this one file
    Given <subject>
    When the rename lands
    Then it <verdict>

    Examples: the neighbours a name-based sweep would take with it
      | subject                                        | verdict                                                        |
      | src/board-worker-stream.mjs                    | becomes src/cache-read.mjs                                     |
      | src/cache-provenance.mjs                       | is untouched — it is already subject-named                     |
      | src/board-serve.mjs                            | is untouched — it IS a face, and its name is correct           |
      | the read seam (formerly src/work-read.mjs)     | is untouched by this task — task 01 already moved it           |
      | test/cache-read-doctor-overlay.test.mjs        | keeps its name and is re-pointed at the new module             |
      | test/arch/acd-cache-read-surface-boundary      | keeps the read seam as its subject, and is NOT re-aimed here   |
      | the 12 exported function names                 | are unchanged — the file was misnamed, the exports were not    |

  Scenario: the module does not join the mesh family
    Given the module's nine `src/` readers
    When their layers are enumerated
    Then readers exist in both the spine and the mesh
    And the module sits at the root of `src/`, in neither directory
    And nothing under `src/mesh/` or `src/work/` holds a copy of it

  Scenario: what the board reads is byte-for-byte what it read
    Given a workspace whose shared cache holds rows a worker streamed
    When the cached rows, docs, runs and provenance are read through the renamed module
    Then each read returns the same rows in the same order with the same fields as before the rename
    And a row's reported authority and sync time are unchanged
    And the board face and the CLI face project that same result exactly as they did

  Scenario: the header no longer asserts a face the readers contradict
    Given the renamed module's header
    When it is read
    Then it names the node's read of the shared work cache as its subject
    And it names the worker's view as one instance of that subject rather than as the subject
    And it cites the decision that renamed it rather than restating the argument
