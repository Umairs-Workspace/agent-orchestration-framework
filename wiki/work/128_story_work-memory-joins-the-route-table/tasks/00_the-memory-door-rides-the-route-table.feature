@cli @work @memory
Feature: `aof work memory` rides the route table, and every verb answers what it answered before

  `aof work memory <verb>` is dispatched today by a `subcommand === "memory"` branch in
  `src/cli.mjs`'s legacy ladder, delegating wholesale to `workMemoryCommand` in `src/work/memory.mjs`,
  which parses its own argv, runs the verb and prints. It carries no `cli.route`, so
  `deriveRouteTable()` (`src/spine/face.mjs`) does not know it exists — which is exactly what story
  125's README control measured: five true lines red, all of them this verb.

  **THE SEAM KEEPS ITS SEMANTICS; THE FACE TAKES THE PRINTING.** WAVE-D class A: a registered
  `work:memory` command declares route, flag vocabulary, `argv`, `render` and `json` on itself and
  calls the seam's core with the parsed input. `parseMemoryArgv`'s rules survive as the adapter's
  rules — the six scope flags, `--item` as both recall filter and rebuild scope, `--all` mapping the
  rebuild scope to the whole stream, a non-positive or non-numeric `--limit` falling back to the
  backend default — and the seam's verb gate survives as a coded refusal. What moves is the
  `console.log`, which the face owns for every routed verb (`acd-console-log-confined`).

  **BYTE-FOR-BYTE IS THE BAR, because three consumers parse this output without a human in the
  loop:** the bundle prompts run `recall … --kind near-miss --block` and paste the block into agent
  context; `--json` recall is a records ARRAY (ADR-004), not an object; `status` and `reindex` print
  one line each. The behaviours the spine changes on purpose are the ones it changes for every
  migrated verb (`command-spine.feature`): an undeclared flag is refused loudly instead of ignored,
  a trailing valueless string flag (`--limit`, `--kind`) is a `missing-flag-value` refusal at exit 1
  where the seam once set nothing, and `--help` is the spine's unknown-flag refusal rather than
  usage at exit 0. A single-dash `-h` is NOT a flag to the spine — it is a positional — so the seam's
  own guard must still catch it before any backend is reached, which the scenarios below pin.

  **AN EMPTY BLOCK PRINTS NOTHING.** The seam's own comment is explicit — "an EMPTY recall renders
  an EMPTY block — print NOTHING (no blank line)" — and measured at HEAD, `recall <miss> --block`
  emits zero bytes. The generic face prints whatever `render` returns through `console.log`, which
  always appends a newline; so the face learns one rule — a render that answers `null` has nothing
  to print — rather than the command learning to print. Commands return data, faces print.

  @executable
  Scenario: the door resolves through the registry's route table
    Given the registry after this change
    When `deriveRouteTable()` is derived and `resolveRoute(["work", "memory", "status"])` is asked
    Then the table carries the key `work memory`
    And the route resolves to the command whose id is `work:memory`
    And `["status"]` is passed through as the rest

  @executable
  Scenario Outline: every verb's human render is byte-identical to the ladder's
    Given a fixture work stream whose memory backend answers deterministically
    When `aof work memory <invocation>` runs through the route table
    Then stdout is byte-identical to what the ladder door printed for it
    And the exit code is 0

    Examples:
      | invocation                          |
      | status                              |
      | reindex                             |
      | ingest                              |
      | recall "pin line endings"           |
      | recall "pin line endings" --block   |
      | brief                               |

  @executable
  Scenario Outline: every verb's --json document is the projection the seam defined
    Given a fixture work stream whose memory backend answers deterministically
    When `aof work memory <invocation> --json` runs through the route table
    Then stdout is exactly one JSON document
    And it is <shape>

    Examples:
      | invocation                | shape                                                   |
      | recall "pin line endings" | the records ARRAY, never an object wrapping it          |
      | brief                     | the digest without its rendered `text`                  |
      | reindex                   | the build summary without the `records` dump            |
      | status                    | the `{ backend, recordCount }` object                   |

  @executable
  Scenario: an empty block prints nothing, not a blank line
    Given a fixture work stream in which a recall matches no record
    When `aof work memory recall "<no such thing>" --block` runs through the route table
    Then stdout is zero bytes
    And the exit code is 0
    And the face's rule is that a `null` render prints nothing, asserted over `src/spine/face.mjs`

  @executable
  Scenario Outline: the adapter keeps the seam's parsing rules
    Given the command's `cli.argv` adapter
    When it is handed `<argv>`
    Then the input it builds carries <input>

    Examples:
      | argv                                   | input                                                    |
      | recall q --kind near-miss --item 04    | scope `{ kind: "near-miss", item: "04" }` and query `q`  |
      | recall a b c                           | query `a b c`                                            |
      | reindex 07                             | only `07`                                                |
      | reindex --item 07                      | only `07` and scope item `07`                            |
      | reindex --all                          | only `null`                                              |
      | recall q --limit 3                     | opts limit `3`                                           |
      | recall q --limit 0                     | no limit, so the backend default applies                 |
      | recall q --limit abc                   | no limit, so the backend default applies                 |
      | recall q --block                       | block `true`                                             |

  @executable
  Scenario: an unknown or missing verb is a coded refusal, and exits 1 with the usage
    Given the command after this change
    When `aof work memory bogus` runs
    Then the exit code is 1
    And stderr names the verb `bogus` and carries the seam's usage text
    And when `aof work memory` runs with no verb, the exit code is 1 and stderr says the verb is missing
    And under `--json` the refusal is the face's one envelope carrying code `unknown-verb`

  @executable
  Scenario: a help-seeking positional reaches no backend
    Given a fixture work stream with at least one indexed record
    When `aof work memory reindex -h`, `aof work memory ingest -h` and `aof work memory recall -h` run through the route table
    Then each prints the usage on stdout and exits 0
    And the index's record count is unchanged afterwards
    And the guard is the seam's one guard, reached by the routed door and the in-process entry alike

  @executable
  Scenario: an undeclared flag is refused, the spine's policy inherited
    Given the command after this change
    When `aof work memory status --bogus` runs
    Then the exit code is 1
    And stderr contains `Unknown flag "--bogus"`

  @executable
  Scenario: the bijection probe answers one document at exit 0
    Given the fixture stream `acd-work-command-cli-bijection` builds
    When its probe for `memory` runs
    Then it is `aof work memory status --json`
    And it exits 0 with exactly one parseable JSON document

  @executable
  Scenario: the migrated verb lands with its integration scenario
    Given `test/integration/features/work-memory.feature`
    When the integration suite runs it through the real CLI
    Then `work memory status` renders `memory: backend=none records=0` on a bare fixture
    And `work memory status --json` answers a document whose `backend` is `"none"`
    And `work memory bogus` fails with stderr naming the verb
