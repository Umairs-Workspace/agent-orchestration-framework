@executable @cli @work @work-stream
Feature: The document is unchanged and the pin moves with the file — the --json result is key-for-key what it is today, and 53/FF-5307's byte-pin is re-pinned with its reason beside it

  `test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs:101-142` pins
  `src/commands/run-status.mjs` by a CRLF-normalised sha256 (`a537cec0…`, line 115) as leg 2 of
  `53/FF-5307` — `53/ADR-004`'s "`src/commands/run-status.mjs`, `src/board-ui.mjs` and `ui/` are not
  edited" invariant. It was re-pinned once by `119/01`, with the reason written beside it. Leg 1 of
  the same control asserts the `brief.loop` round-trip through this face. ADR-003 §4 narrows the
  invariant in the open: the DOCUMENT is frozen, the RENDER is not; the story that edits the
  renderer re-pins leg 2 in the same diff. `55/VERIFICATION` F-55-02-1's ruling stands: an unpinned
  file is covered by no byte-freeze at all, so the entry is re-pinned, never deleted.

  The document has SIX producing return sites, not three — `:48`, `:50`, `:61`, `:62`, `:71`, `:73`
  (`src/commands/run-status.mjs:41-73`), beside the one refusal at `:51` — and they do not all carry
  the same keys: a streamed item row with no runs answers with four keys and no `reportedBy` (`:50`),
  every other `fromWorker` site answers with five, and the disk-read site answers with three.
  `fromWorker` says the RUNS came from the projection; `answeredFrom` reads `disk` only when this
  checkout answered both the item and its runs — `:71` hardcodes `cache` for a disk-resolved item
  whose runs were streamed. Both stay exactly as they are.

  How every document below is obtained, so no step is ambiguous about its seam: it is the value
  `invoke("work:run-status", …)` returns through `src/command-core.mjs` — `cli.json` is identity
  (`:99`), so the invoked result IS the `--json` document, and the core validates no input schema, so
  the declaration is asserted by reading it rather than by an invocation it would refuse. The
  fixtures are the cache fixture's own writers (`runCommand`, `plantCacheRow`, `streamRun`,
  `workerTree` — `test/support/cache-read-fixture.mjs`); the loop-minted run is minted by driving the
  loop over `loopFixture` (`test/loop/loop-command-probe.test.mjs:42`), exactly as leg 1 of the
  control does. The pin scenarios run that control's own leg over the working tree and read its
  source with comments stripped (`stripComments`, `test/support/source-slice.mjs`).

  What would quietly undo this: a helpful key added to the result "since the render needs it" — an
  injected `now`, an elapsed, a formatted line; the four-key path quietly given a `reportedBy` for
  symmetry; the pin entry deleted to make the control green; `src/board-ui.mjs` or `ui/` touched to
  carry the richer render onto the board.

  ADR-003 §3-§5. 53/ADR-004. 53/FF-5307. FF-12603.

  Scenario Outline: the document's key set is exactly what it is today, on every path that produces one
    Given <item>
    When `aof work run-status <ref> --json` is invoked
    Then the document's keys are exactly <keys>, in that order
    And `answeredFrom` is <answeredFrom>
    And no key is added, renamed, removed or reordered by this story

    Examples: every answering path of `src/commands/run-status.mjs:41-73` — eight rows over six return sites, because `:73` answers in both colours of `answeredFrom`
      | item                                                                       | keys                                                      | answeredFrom |
      | resolved on disk, with a loop-minted run in its `runs/` dir                | `ref`, `runs`, `answeredFrom`                             | `disk`       |
      | resolved on disk, with no runs anywhere and nothing streamed               | `ref`, `runs`, `answeredFrom`                             | `disk`       |
      | resolved from the cache, folder present here, runs read from disk          | `ref`, `runs`, `answeredFrom`                             | `cache`      |
      | resolved on disk with no local runs, and runs streamed by `aof-wsl`        | `ref`, `runs`, `fromWorker`, `answeredFrom`, `reportedBy` | `cache`      |
      | resolved from the cache only (no local folder), with streamed runs         | `ref`, `runs`, `fromWorker`, `answeredFrom`, `reportedBy` | `cache`      |
      | resolved from the cache only (no local folder), with no streamed runs      | `ref`, `runs`, `fromWorker`, `answeredFrom`, `reportedBy` | `cache`      |
      | unresolvable — no item row of its own — with runs streamed for it (`:48`)  | `ref`, `runs`, `fromWorker`, `answeredFrom`, `reportedBy` | `cache`      |
      | unresolvable, carrying a streamed item row and no streamed runs            | `ref`, `runs`, `fromWorker`, `answeredFrom`               | `cache`      |

  Scenario: an unresolvable ref with nothing streamed is still the same coded refusal
    Given a ref no item, no streamed row and no streamed run answers to
    When the command is invoked
    Then it refuses `ref-not-found` with status 404, exactly as it does today
    And no document is produced for it

  Scenario: what is inside `runs` is unreshaped
    Given the disk-answered fixture's loop-minted run and the cache-answered fixture's streamed run — the first minted by driving the loop over `loopFixture`, the second planted through the projection's own writer (`streamRun`), which stores exactly `runId`, `itemRef`, `state` and `node`
    When each document is read
    Then the disk-read record carries exactly the sixteen record keys, in order
    And its `brief.loop` carries exactly its eight keys, in order, with its values intact
    And the worker-streamed record is passed through exactly as the projection holds it, with no key added to it and none normalised away

  Scenario: the instant belongs to the RENDER, and the document never learns of it
    Given the disk-answered fixture with a `running` run
    When the command is invoked with `{ ref }` — the only shape its input takes, since `now` is not an input key and its declaration is still `additionalProperties: false`
    Then the document carries no key named `now`, and no key naming an elapsed, an age or a rendered line, at the top level or on any run inside `runs`
    And rendering that one result twice, with two `faceCtx.now` values an hour apart, produces two different lines
    And the result object is deep-equal to the invoked document after both renders — the render reads it and writes nothing back

  Scenario Outline: 53/FF-5307's freeze after this story — one entry moves, the rest do not
    Given the control that holds 53/FF-5307
    When it runs against the working tree
    Then <file> is pinned at <digest>

    Examples: the pin is re-pinned, never dropped (55/VERIFICATION F-55-02-1)
      | file                            | digest                                                              |
      | `src/commands/run-status.mjs`   | a NEW CRLF-normalised sha256 of the edited file, not `a537cec0…`    |
      | `src/run-store.mjs`             | whatever the control pins at this beat (`a282af92…` today) — not moved by THIS story; `126/02` re-pins it later for its own additive export |
      | `src/board-ui.mjs`              | `d76bfdaf…`, unchanged                                              |
      | the `ui/` tree hash             | `e5f94a32…`, unchanged                                              |

  Scenario: the moved pin carries its reason, and the freeze is still non-vacuous
    Given the re-pinned `src/commands/run-status.mjs` entry
    When the control's source is read
    Then the entry is present, and the map still holds three file entries beside the `ui/` tree hash
    And a comment beside it names this story and why the file moved, as `119/01`'s re-pin does
    And the digest of the same file with one byte changed does not equal the pinned one

  Scenario: leg 1 is not this story's, and is unmoved by it
    Given the leg that round-trips `brief.loop` through `work:run-status`
    When it runs after this story
    Then it asserts the same record and envelope key sets it asserted before this story — sixteen, and eight at this beat
    And this story moves neither count and anticipates no ninth declaration key, which is `126/02`'s to land in the same control
