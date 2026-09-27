@executable @cli @work @work-stream
Feature: The split arch gate keeps its aim — six invariants, two sources, and the one that would go vacuously green

  The story's one pre-existing source-gate edit, and the one with a silent-green in it.
  `test/arch/acd-worker-driver-no-headless-print.test.mjs` reads ONE file today — its single
  `DRIVER_SOURCE` constant (`:51`) — at six `readFile` sites (`:170, :183, :217, :256, :306,
  :331`), and imports `driveInteractiveClaudeSession` + `NEEDS_INPUT_SENTINEL` from the sink
  at `:47`. After the move its six invariants no longer live in one file, so ADR-001's
  Consequences split the constant in two: `DRIVER_SOURCE` for invariants 1, 2, 3, 4-producer
  and 6, `HANDLER_SOURCE` for invariant 4-surfacing and invariant 5. This feature is the
  acceptance criterion for that split, and it exists because a mis-aimed re-point does not
  fail uniformly.

  FIVE OF THE SIX MIS-AIMINGS FAIL LOUDLY. EXACTLY ONE GOES VACUOUSLY GREEN. Invariants 2, 3,
  4-producer and 6 assert PRESENCE — the `resolveProvider` import and a genuine call site, the
  `term.write(\`${command}\r\`)` pair, the `claudeProjectsDir` import plus the
  `options.watchTranscriptSessionId ?? defaultWatchTranscriptSessionId` wiring, and the composed
  `WORKER_SESSION_INSTRUCTION` reaching the launch — and every one of those leaves the sink
  with the moved block, so an invariant still reading the sink reds immediately. Invariant
  4-surfacing and invariant 5 assert HANDLER facts — the `sendAssignmentStatus`/`reportSettled`
  frames carrying `sessionId`, and the `if (outcome.outcome === "needs-input")` branch
  (`mesh-worker-execution.mjs:2701`) that calls no `removeWorktree` — and red immediately on
  the driver. **Invariant 1 asserts an ABSENCE**: that no `bin: "claude"` + `-p` +
  `--output-format` one-shot shape survives. The post-move sink contains no claude launch
  shape at all, so an invariant 1 left pointing at it PASSES while checking nothing — and its
  own self-check plant still trips, because the plant is appended to whatever source the test
  was handed. Green primary, green self-check, zero information. That is TECH_DEBT item 5's
  species landing inside the milestone's own gate, and the aiming control below is what
  closes it: invariant 1 must prove the source it read contains a driver launch shape at all,
  which post-move is `buildDriverCommand`'s `bin: "codex"` form — a positive control the sink
  cannot satisfy.

  THE SIX READ SITES BECOME SEVEN READS, and this is a build fact worth having before the
  build rather than after. Invariant 4's test at `:254-301` carries BOTH halves in one `run()`
  over one `raw`/`stripped` pair (`:256-257`): the producer half is driver code, the surfacing
  half is handler code. It is the one site that must read both files.

  EVERY PLANT IS A LITERAL, and a plant that no longer matches is a self-check that silently
  stops self-checking. Invariant 2 strips the exact line `import { resolveProvider } from
  "./terminal-providers.mjs";`; invariant 4 replaces the exact `options.watchTranscriptSessionId
  ?? defaultWatchTranscriptSessionId`; invariant 6 replaces the exact `"--append-system-prompt",
  WORKER_SESSION_INSTRUCTION` adjacency and the exact `${DIRECTIVE_COMPLETE_INSTRUCTION}`
  interpolation; invariant 3 replaces the exact `term.write(\`${command}\r\`);`. Each of those
  literals must survive the move byte-for-byte into whichever file now owns it — the tree is
  CRLF, so every probe normalises before matching, the near-miss this milestone family has
  already been burned by.
  Seam: `test/agent-session-driver-gate-aim.test.mjs`, registered in `scripts/test.mjs` in
  this story's labelled milestone-53 story-00 block. It imports the arch test's own
  `archTests` array and runs it, parses that file's source for its aim, and probes both
  subject files for the literals each plant depends on — comment-stripped and CRLF-normalised
  (`test/support/source-slice.mjs`'s `stripComments`). No process is spawned.
  ADR-001 §1, §2 and its Consequences; the milestone partition's 53/00 row.

  Scenario: the gate is green after the split
    Given the arch test's exported `archTests` array
    When every entry is run
    Then every one passes
    And the array is non-empty, so a suite that stopped exporting cannot pass by being empty

  Scenario: the gate names exactly two source files and reads no third
    Given the arch test's own source
    When its source-path constants are parsed
    Then there are exactly two: one naming `src/agent-session-driver.mjs`, one naming `src/mesh-worker-execution.mjs`
    And every `readFile` call in the file uses one of those two constants or the runner path
    And no read site is left pointing at a single undivided constant

  Scenario: each invariant reads the file that carries its subject
    Given the parsed aim of each read site
    When each is paired with a presence probe against the file it names
    Then invariants 1, 2, 3, 4-producer and 6 read the file that carries the driver's launch, write, watch-wiring and instruction composition
    And invariant 4-surfacing and invariant 5 read the file that carries the status frames and the needs-input branch
    And an aim whose named file does not carry its subject fails here

  Scenario: invariant 1 is aimed by a positive control, because its own assertion cannot detect a mis-aim
    Given the file invariant 1 reads
    When it is probed for a driver launch shape
    Then it contains `buildDriverCommand`'s `bin: "codex"` argv form
    And the file invariant 1 does NOT read contains no launch shape at all
    And the absence invariant 1 asserts is therefore an absence measured over a source that has launches in it

  Scenario: the invariant-4 site reads both sources
    Given the test carrying invariant 4
    When its reads are counted
    Then it reads the driver source for the producer half
    And it reads the handler source for the surfacing half
    And neither half is asserted against the other's source

  Scenario: every plant's literal anchor survives the move into its now-correct file
    Given each self-check plant's literal
    When the file that invariant now reads is searched for it, CRLF-normalised
    Then every literal is found exactly as the plant spells it
    And a literal found in neither file fails here rather than at a mystery red in the gate

  Scenario: the plants still change the source they are planted into
    Given each self-check plant
    When it is applied
    Then the planted text differs from the source it was applied to
    And the gate's own `assert.notEqual(planted, source)` precondition holds for every plant

  Scenario: the behavioural legs still drive through the re-export
    Given the arch test's import of `driveInteractiveClaudeSession` and `NEEDS_INPUT_SENTINEL` from `src/mesh-worker-execution.mjs`
    When the behavioural legs of invariants 2b, 3, 4 and 5 run
    Then each resolves the outcome it asserts
    And the import line at `:47` is byte-unchanged — the re-export is what keeps it so

  Scenario: the registration leg still passes, and this story's suites are additive to it
    Given the arch test's registration invariant
    When it reads `scripts/test.mjs`
    Then it still finds itself and the four named driver traceability suites imported and spread
    And this story's own new suites are registered in their own labelled block
    And no existing import or spread in that file is removed

  Scenario: both source reads return real text — the gate is not measuring an empty string
    Given both source constants
    When each file is read
    Then each returns a non-empty document
    And a constant naming a path that does not exist fails here rather than passing every absence assertion

  # THE AIM, INVARIANT BY INVARIANT. `verdict if mis-aimed` is the whole reason this feature
  # exists: four reds, two reds, and one silent pass. `plant literal` is what must survive the
  # move byte-for-byte into the source named, or the self-check stops self-checking.
  Examples:
    | invariant        | asserts                                                        | source after the split | verdict if mis-aimed | plant literal                                          |
    | 1                | ABSENCE of a `bin: "claude"` + -p + --output-format one-shot     | driver                 | VACUOUSLY GREEN      | an appended headless shape — always trips              |
    | 2                | PRESENCE of the resolveProvider import AND a call site           | driver                 | red                  | `import { resolveProvider } from "./terminal-providers.mjs";` |
    | 2b (behavioural) | no spawn attempt for an unresolvable binary                      | neither — driven       | n/a                  | none — a real drive                                    |
    | 3                | PRESENCE of the one carriage-return `term.write`                 | driver                 | red                  | ``term.write(`${command}\r`);``                        |
    | 4 producer       | PRESENCE of claudeProjectsDir + the watch-seam wiring            | driver                 | red                  | `options.watchTranscriptSessionId ?? defaultWatchTranscriptSessionId` |
    | 4 surfacing      | PRESENCE of sessionId on the done and needs-input frames         | handler                | red                  | the done frame's `{ runId, sessionId … }` shape        |
    | 5                | ABSENCE of removeWorktree inside the needs-input branch          | handler                | red                  | the branch body itself, re-planted with a force-remove |
    | 6                | PRESENCE of both producers composed and appended to the launch   | driver                 | red                  | `"--append-system-prompt", WORKER_SESSION_INSTRUCTION` and `${DIRECTIVE_COMPLETE_INSTRUCTION}` |
    | registration     | the suite and its four traceability files are in the runner      | scripts/test.mjs       | red                  | none — a read of the runner                            |

  # THE SUBJECT PROBES that make each aim non-vacuous. Each row is a token that must be present
  # in the named file after the move and absent from the other — the pairing the aim check runs.
  Examples:
    | token                                                     | present in | absent from |
    | `resolveProvider(` and its terminal-providers import       | driver     | handler     |
    | `claudeProjectsDir(` and its work-observe import           | driver     | handler     |
    | ``term.write(`${command}\r`)``                             | driver     | handler     |
    | `WORKER_SESSION_INSTRUCTION`                               | driver     | handler     |
    | `bin: "codex"` — the only launch shape left                | driver     | handler     |
    | `sendAssignmentStatus` / `reportSettled` with `sessionId`  | handler    | driver      |
    | `if (outcome.outcome === "needs-input") {`                 | handler    | driver      |
    | `removeWorktree(` with `force: true`                       | handler    | driver      |
    | `assignmentId` outside a comment                           | handler    | driver      |
