@executable @cli @work @work-stream
Feature: The headline — every pre-existing importer keeps the import line it already had

  The story's crispest correctness criterion, and the property that makes this a promotion
  rather than a rewrite: nothing that imports `src/mesh-worker-execution.mjs` today has to
  learn that the driver moved. ADR-001 §2 buys it with the re-export; the partition fences
  the story alone for exactly this reason, because deleting ~1,000 lines from the widest
  sink in `src/` is the diff that wants its own review pass.

  THE CENSUS, RE-DERIVED FROM THE GRAPH 2026-08-15 (ADR-010 §17b), which corrects this feature's
  own first count as well as the ADR's prose. `graph impact src/mesh-worker-execution.mjs` reports
  **49 dependents**: **43 `*.test.mjs` suites** — not forty-four — plus **two `test/support/*.mjs`
  fixture modules** ADR-001's count never mentioned (`test/support/artifact-sync-fixture.mjs`,
  `test/support/gate-propagation-fixture.mjs`), plus **four files under `src/` and `scripts/`**
  (`src/global-node-registry.mjs`, `src/mesh-clone-credential-provider.mjs`,
  `src/mesh-launcher.mjs`, `scripts/pin-checkout-id.mjs`). 43 + 2 + 4 = 49 is the oracle, and it is
  asserted as a literal before any set comparison runs, because a census that stopped parsing
  reports perfect stability over the empty set — TECH_DEBT item 5's species inside the instrument
  built to measure the move. THE TRAP THAT PRODUCES 44, named so it is not rediscovered: a naive
  `grep 'from "…mesh-worker-execution.mjs"'` returns **50** files, because
  `test/arch/acd-session-worktree-lane-scoped.test.mjs` names the sink only inside STRING LITERALS
  (`:191`, a planted import inside a template literal; `:265`, a fixture path). It is not an
  importer — the static-import parse is right and the grep is not. A further twenty-one files under
  `test/` merely NAME the module in prose; they are not dependents and are not this feature's
  subject.

  "BYTE-UNCHANGED" IS NOT DIRECTLY OBSERVABLE FROM A SUITE, so it is decided by the exact
  observable it buys. If an untouched importer had to be re-pointed at the new module, that file
  would name `agent-session-driver`. The explicitly re-aimed
  `test/arch/acd-worker-driver-no-headless-print.test.mjs` is itself one of the 43 importers, so the
  truthful oracle is **42 untouched importers naming the new module zero times plus that one named
  exception**. The integrated closed allowlist is exactly TEN files under `test/`: this story's own
  five new suites
  (`door`, `drives`, `transcript`, `runtime-dispatch`, `gate-aim`, ADR-011 §1) and
  `test/arch/acd-worker-driver-no-headless-print.test.mjs`, whose `DRIVER_SOURCE` constant must
  name it (task 05), plus the four ADR-015 §2 fitness controls. Every other file under `test/`
  names it zero times. That closed set moves
  the moment anyone "fixes" a mesh test by re-pointing its import, which is precisely the
  regression the re-export exists to make unnecessary.

  A CENSUS THAT SHRINKS IS NOT A PASS. A suite deleted rather than kept green satisfies
  every equality below trivially, so the count is a floor as well as a set — the four
  driver suites and the completion suite are named individually and looked up rather than
  trusted, and `scripts/test.mjs` must still import and spread each of them.
  Seam: `test/agent-session-driver-door.test.mjs`, registered in `scripts/test.mjs` — a
  static import parse over `test/`, `src/` and `scripts/` (the
  `acd-command-layer-imports-downward` idiom, comment-stripped, CRLF-normalised) plus a read
  of the runner's own source text. No process is spawned and no `AOF_GLOBAL_HOME` is touched.
  The Examples below are executable inventories, not illustrations: the suite compares the observed
  class paths, ten-name allowlist and link strategies to these exact rows. The 48 fresh imports run
  in a child process; the pin CLI's parsed binding is checked against the sink namespace linked in
  that child without evaluating the CLI body. The explicit-null rows are driven through the real
  handler and the status recorder's durable effect-step channel. A total such as `33/33` is accepted
  only when the two formerly red null rows and every table row are identifiable in the assertions.
  ADR-001 §2 and its Consequences, the milestone partition's 53/00 row, RESEARCH §Q1.

  Scenario: the census is checked against a literal oracle before anything is concluded
    Given a static-import parse of every `.mjs` file under `test/`, `src/` and `scripts/`
    When the files that statically import `src/mesh-worker-execution.mjs` are counted
    Then exactly 43 of them are `*.test.mjs` suites
    And exactly 2 of them are `test/support/*.mjs` fixture modules
    And exactly 4 of them are under `src/` or `scripts/`
    And a parse that matched nothing fails here rather than reporting a stable census

  Scenario: prose mentions are not dependents
    Given the same parse
    When files that name the module only inside a comment or a string are considered
    Then they are excluded from the census
    And the comparison is made on comment-stripped source, so a narrating comment cannot inflate it

  Scenario: exactly ten files under `test/` name the new module, and exactly one of the 43 importers is the named re-aimed gate
    Given every file under `test/`
    When occurrences of `agent-session-driver` are counted per file
    Then the files that name it are exactly this story's own five new suites, `test/arch/acd-worker-driver-no-headless-print.test.mjs`, and the four ADR-015 §2 fitness controls
    And 42 of the 43 census members name it zero times
    And the remaining census member is exactly `test/arch/acd-worker-driver-no-headless-print.test.mjs`, whose source gate was deliberately re-aimed
    And any other importer re-pointed at the new module would move this closed set

  Scenario: the census is a floor, not only a set — a deleted suite is not a pass
    Given the named driver and completion suites
    When each is looked up on disk
    Then each exists
    And each is imported and spread in `scripts/test.mjs`
    And the census count is asserted `>=` its oracle as well as `===`, so a deletion cannot pass by shrinking both sides

  Scenario: every importable census member still links after the move
    Given the 48 importable members among the 43 test suites, 2 fixture modules and 4 source files
    When each is imported in a fresh process
    Then every module link succeeds
    And no named binding it takes from the sink is `undefined`

  Scenario: the pin-checkout CLI entry point is verified without executing its command body
    Given `scripts/pin-checkout-id.mjs`, which reads argv and may exit during module evaluation
    When its static import from `src/mesh-worker-execution.mjs` is parsed
    Then every named binding in that clause exists on a freshly linked sink namespace
    And the script itself is not imported as though it were a side-effect-free library

  Scenario: `src/mesh-launcher.mjs` is unedited and its fourteen-name import still resolves
    Given `src/mesh-launcher.mjs`
    When its import from `src/mesh-worker-execution.mjs` is parsed
    Then it names fourteen bindings including `INTERACTIVE_COMMAND_READY_DELAY_MS` and `ensureWorktreeTrusted`
    And every one of them resolves
    And the file names `agent-session-driver` zero times — the launcher was not told the driver moved

  Scenario: the other three source-side importers are untouched
    Given `src/global-node-registry.mjs`, `src/mesh-clone-credential-provider.mjs` and `scripts/pin-checkout-id.mjs`
    When each is parsed
    Then each still imports from `src/mesh-worker-execution.mjs`
    And none of them names `agent-session-driver`

  Scenario: the two support fixtures the ADR's count omits are covered too
    Given `test/support/artifact-sync-fixture.mjs` and `test/support/gate-propagation-fixture.mjs`
    When each is imported
    Then the link succeeds
    And each is counted as a dependent, not as a suite — it is correctly outside any suite-registration sweep

  Scenario: the frozen session-id suite is green at its full count, with explicit absence surfaced as null
    Given production's terminal effect-step payload carries `sessionId: null` when no session id was captured
    And the status-recorder fixture currently deletes that explicit null and presents `undefined`
    When the fixture records the terminal frame through the durable report channel
    Then it preserves `sessionId: null`
    And `test/mesh-worker-driver-session-id.test.mjs` runs unchanged and passes 8 of 8 cases
    And the eight named behavioural modules together pass 33 of 33 cases
    And no red case is waived and no moved-driver behaviour is rewritten

  Scenario: `src/work.mjs` is not among this story's edits, at any distance
    Given the census
    When `src/work.mjs` is looked for among the files this story edits
    Then it is absent
    And the milestone's zero-edits-to-the-god-node property is unaffected by the extraction

  # THE CENSUS BY CLASS. The one re-aimed arch gate remains a sink importer for behaviour but
  # names the new source for its structural reads; it is therefore the one honest exception to
  # "names the new module zero times", not a 43rd untouched member.
  Examples:
    | class                        | oracle | after this story   | importer disposition                         | names `agent-session-driver` |
    | `test/**/*.test.mjs`          | 43     | 43, the same paths | 42 untouched + 1 named re-aimed arch gate    | 1 of 43, that gate only      |
    | `test/support/*.mjs`          | 2      | 2, the same paths  | both untouched                               | 0 of 2                       |
    | `src/*.mjs` + `scripts/*.mjs` | 4      | 4, the same paths  | all four keep their sink import              | 0 of 4                       |

  # THE CLOSED TEN-NAME ALLOWLIST. Set equality is both directions; an eleventh path is a defect,
  # and deleting an admitted path is also a defect. The four fitness gates are admitted by subject,
  # never by disguising or splitting the token.
  Examples:
    | file under `test/`                                            | why it names `agent-session-driver`                  |
    | test/agent-session-driver-door.test.mjs                       | story 00 door + census suite                         |
    | test/agent-session-driver-drives.test.mjs                     | story 00 driver behaviour suite                      |
    | test/agent-session-driver-transcript.test.mjs                 | story 00 transcript suite                            |
    | test/agent-session-driver-runtime-dispatch.test.mjs           | story 00 runtime dispatch suite                      |
    | test/agent-session-driver-gate-aim.test.mjs                   | story 00 arch-gate aim suite                         |
    | test/arch/acd-worker-driver-no-headless-print.test.mjs        | the named re-aimed source gate                       |
    | test/arch/acd-session-driver-mesh-blind.test.mjs              | FF-5301 walks the extracted driver's dependency cone |
    | test/arch/acd-session-driver-single-home.test.mjs             | FF-5302 proves the extracted driver's single home    |
    | test/arch/acd-phase-door-not-a-driver.test.mjs                | FF-5303 names the forbidden driver import            |
    | test/arch/acd-loop-suite-registration.test.mjs                | FF-5311 names story 00's suite family                |

  # THE HONEST LINK DOORS. 43 suites + 2 support modules + 3 import-safe source modules = 48 fresh
  # imports. The 49th dependent is still checked, but its CLI body is not evaluated.
  Examples:
    | census members                                              | count | verification door                                      |
    | `test/**/*.test.mjs` suites                                 | 43    | import every member in one fresh child process         |
    | `test/support/*.mjs` fixture modules                        | 2     | import every member in that fresh child process        |
    | import-safe `src/*.mjs` members                             | 3     | import every member in that fresh child process        |
    | `scripts/pin-checkout-id.mjs`                               | 1     | parse its static sink import; check names on linked sink namespace |

  # THE EXPLICIT-NULL SURFACING MATRIX. The production terminal payload already distinguishes
  # an explicit absence from an omitted key; the fixture must preserve that distinction.
  Examples:
    | transcript watch resolves | production effect-step payload | recorder frame must carry | frozen suite observation |
    | `"sess-abc123"`           | `sessionId: "sess-abc123"`    | `sessionId: "sess-abc123"` | captured id            |
    | `null`                    | `sessionId: null`             | own key `sessionId: null` | explicit absence         |
    | `""`                      | `sessionId: null`             | own key `sessionId: null` | empty normalises to absence |

  # THE 33-CASE COUNT is the combined lane, not the session-id module alone.
  Examples:
    | behavioural module                           | cases |
    | mesh-worker-driver-interactive-pty            | 4     |
    | mesh-worker-driver-directive-command          | 3     |
    | mesh-worker-driver-needs-input                | 4     |
    | mesh-worker-driver-session-id                 | 8     |
    | mesh-worker-driver-output-chunk               | 1     |
    | mesh-worker-completion-detection              | 7     |
    | mesh-worker-liveness                          | 4     |
    | mesh-worker-command-timing                    | 2     |

  # THE NAMED SUITES THIS STORY MUST LEAVE GREEN — the driver's own pre-existing behavioural
  # coverage, all already registered in `scripts/test.mjs`. The first eight remain unedited; the
  # ninth is the single named re-aimed gate. Each is looked up rather than trusted.
  Examples:
    | registered suite                                    | what it drives through the sink's door                          |
    | test/mesh-worker-driver-interactive-pty.test.mjs     | the interactive launch argv and the no-headless-print tokens      |
    | test/mesh-worker-driver-directive-command.test.mjs   | the directive typed into PTY stdin                                |
    | test/mesh-worker-driver-needs-input.test.mjs         | the NEEDS_INPUT sentinel outcome and the retained worktree        |
    | test/mesh-worker-driver-session-id.test.mjs          | 8/8, including explicit `sessionId: null`; module bytes unchanged  |
    | test/mesh-worker-driver-output-chunk.test.mjs        | the `onOutputChunk` bridge                                        |
    | test/mesh-worker-completion-detection.test.mjs       | the transcript completion watch and the parked-PTY kill           |
    | test/mesh-worker-liveness.test.mjs                   | the PTY-liveness probe and `agent_died`                           |
    | test/mesh-worker-command-timing.test.mjs             | `commandDelayMs` and the ready delay                              |
    | test/arch/acd-worker-driver-no-headless-print.test.mjs | the six invariants — the one file this story edits (task 05)     |
