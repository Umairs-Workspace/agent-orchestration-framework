@executable @cli @work @work-stream
Feature: Four new commands on the derived route table — reachable, non-colliding, and clean under `--json`

  Registration is additive and `src/cli.mjs` gains no branch: the route table IS the registry
  (`deriveRouteTable`, `src/spine/face.mjs:87-99`), `resolveRoute` longest-prefix-matches
  (`:104-120`), and 52/ADR-012 §1 already generalised the CLI↔command bijection gate's
  reachability leg to `command.cli.route.join(" ")`. So the three-word `["work","drive",<phase>]`
  routes are free on that leg, and the one leg that is NOT free is `argsFor`'s deliberate
  `default: throw` (`test/arch/acd-work-command-cli-bijection.test.mjs:252`) — four cases, landing
  in the same diff as the registration, because the throw fires ON the registration diff.

  The four probe argv forms are chosen so a SPAWNED probe never starts an agent. `work:loop`'s
  own machine face is already a probe by face policy (`--json` never launches), so
  `aof work loop 03 --json` is safe by construction. The three drivers are not launchers — they
  always spawn — and a subprocess is exactly the place no fake `{ptySpawn, which}` can be
  injected, so their probe form is `--dry-run --json`: the same "report, do not act" shape
  `work upgrade --dry-run` and `work init --dry-run` already use in that file, and for the same
  reason. A probe that started a real `claude` on whatever machine ran the suite would be a test
  that damages its own host. The flag itself is ADR-RULED, not this contract's own invention —
  ADR-010 §3 declares `--dry-run` a boolean flag on all three drivers and names this probe form as
  the reason, keeping the gate's accepted-exit list at `[0]` unwidened.

  The route arithmetic is worth stating because 52 pinned the opposite fact one milestone ago.
  `["work","loop"]` and `["work","loops",<verb>]` are different keys, so they cannot collide; but
  `aof work loop show` USED to be an unknown command (52/02 asserted exactly that) and now
  longest-prefix-resolves to `work:loop` with `show` as its scope — which is still a non-zero
  exit and still prints no loops envelope, so 52's contract survives while the reason for it
  changes. ADR-010 §22 rules what happens to 52/02 itself: **its accepted contract is NOT edited.**
  Its scenario body stays true; only its Examples row's `(none)` cell goes stale, and rewriting an
  accepted milestone's feature to keep a cell true is how a work stream loses its history. No test
  in the tree mechanises that row (grep over `test/` and `scripts/`, 2026-08-15 — zero hits), so
  the supersession is recorded in ADR-010 §22 and the NEW fact is pinned HERE, in the successor's
  own route arithmetic, which is where a successor's facts belong.

  THE SEAM. These scenarios spawn the real CLI (`spawnCliSync`, the bijection gate's own door)
  against a temp fixture work stream with `AOF_GLOBAL_HOME` pointed at a temp dir, and assert
  exit status plus exactly one parseable document on stdout. Nothing here injects a fake seam —
  that is the point: every argv form below must be safe to run in a subprocess on any machine.
  Mechanised as `test/loop-command-registration.test.mjs` — the one suite of this story that spans
  both families, because route arithmetic is one subject — imported AND spread in `scripts/test.mjs`
  inside this story's own labelled `// milestone 53 / story 02` block, so the evidence lands with
  the contract rather than after it (ADR-011 §1, TECH_DEBT item 48).
  ADR-005 §1 and its Consequences, ADR-002 §1 and its Consequences, ADR-010 §3 and §22,
  RESEARCH §Q2.

  Scenario: all four commands are CLI-reachable through the derived route table
    Given the CLI-bijection fixture workspace — a work stream carrying milestone `03` and story `03/01`
    When I run `aof work loop 03 --json`
    Then exactly one JSON document is printed on stdout and it parses
    And the process exits 0
    When I run `aof work drive refine 03/01 --dry-run --json`, `aof work drive continue 03/01 --dry-run --json` and `aof work drive verify 03/01 --dry-run --json`
    Then each prints exactly one parseable JSON document and exits 0
    And no agent session was spawned by any of the four

  Scenario: the loop's machine face returns promptly and writes nothing
    Given the fixture workspace
    When I run `aof work loop 03 --json`
    Then the process returns without waiting on any session
    And `aof work run-status 03 --json` and `aof work run-status 03/01 --json` report the same run history as before the probe
    And the fixture's item statuses are unchanged
    And the exit status is 0 — a probe is a read, not a gate

  Scenario: `--dry-run` on a driver is a report, and it is the probe-safe form
    Given the fixture workspace
    When I run `aof work drive continue 03/01 --dry-run --json`
    Then the document names the ref, the phase and the command it would type
    And no `claude` process was started, on any machine, whatever the PATH holds
    And the run history of `03/01` is unchanged

  Scenario: the id-suffix is not an argv form — the route words are
    Given the fixture workspace
    When I run `aof work drive-continue 03/01 --json`
    Then no drive document is printed
    And the process exits non-zero
    When I run `aof work drive continue 03/01 --dry-run --json`
    Then the drive document is printed and the process exits 0

  Scenario: `work loop` and `work loops <verb>` coexist, and 52's contract survives
    Given a fixture workspace whose `<work.dir>/loops/` holds a well-formed registry
    When I run `aof work loops show --json`, `aof work loops graph --json` and `aof work loops validate --json`
    Then each prints its own envelope unchanged and exits 0
    When I run `aof work loop 03 --json`
    Then the loop document is printed and no loops envelope is
    When I run `aof work loop show`
    Then no envelope from any `work:loops-*` verb is printed
    And the process exits non-zero
    And the refusal is now the loop's own `loop-scope-unsupported` — the exit contract 52/02 pinned is unchanged, its cause is not
    And 52/02's own feature file is NOT edited to say so: only its Examples row's resolved-command cell goes stale, no test mechanises that row, and the supersession is recorded in ADR-010 §22 rather than written back into an accepted milestone

  Scenario: registering the four shadows no existing work route
    Given the fixture workspace
    When I run `aof work list --json`, `aof work next --json`, `aof work tasks 03/01 --json` and `aof work validate --json`
    Then each prints its own envelope and none is the loop's
    When I run `aof work continue 03/01 --json`, `aof work refine 03/01 --json` and `aof work verify 03/01 --json`
    Then each prints the `{where, command}` door document, unchanged
    And `aof work run-status 03 --json` still prints `{ ref, runs }`

  Scenario: an undeclared flag is refused inside the one JSON envelope
    Given the fixture workspace
    When I run `aof work loop 03 --node aof-wsl --json`
    Then exactly one JSON document is printed carrying `ok: false` and the code `unknown-flag`
    And no loop state document is printed alongside it
    And the process exits non-zero
    When I run `aof work drive continue 03/01 --serve --json`
    Then exactly one JSON document is printed carrying `ok: false` and the code `unknown-flag`
    And zero sessions were spawned

  Scenario: a bare family word resolves to a refusal, not to a walk of the whole stream
    Given the fixture workspace
    When I run `aof work loop --json`
    Then exactly one JSON document is printed carrying `ok: false` and the code `loop-scope-unsupported`
    And the process exits non-zero
    When I run `aof work drive --json`
    Then no drive document is printed and the process exits non-zero
    When I run `aof work drive frobnicate 03/01 --json`
    Then no drive document is printed and the process exits non-zero

  Scenario: the four are usable without `--json` and print something legible
    Given the fixture workspace
    When I run `aof work loop 03 --dry-run` and `aof work drive continue 03/01 --dry-run`
    Then each prints non-empty human output
    And neither prints a raw JSON document
    And both exit 0

  Scenario: each resolves the same from a nested subdirectory
    Given the fixture workspace
    When I run `aof work loop 03 --config <workspace>/.aof/aof.config.json --json` from a nested subdirectory
    Then the same document is produced, for the same scope
    When I run `aof work drive continue 03/01 --config <workspace>/.aof/aof.config.json --dry-run --json` from that subdirectory
    Then the same drive report is produced

  Scenario: every one of the four answers the bijection gate's spawn probe
    Given the CLI-bijection fixture workspace
    When the gate derives its subject set from the registry and probes each `work:*` command
    Then `work:loop` is probed as `aof work loop 03 --json` and answers with one clean document at exit 0
    And each `work:drive-<phase>` is probed as `aof work drive <phase> 03/01 --dry-run --json` and answers with one clean document at exit 0
    And no probe leaves a run record, a status change or a spawned process behind it
    And no probe needs the gate's accepted-exit list widened beyond exit 0

  Examples: argv → the command it resolves to → exit
    | argv after `aof`                                  | resolved command id  | exit     |
    | work loop 03 --json                               | work:loop            | 0        |
    | work loop 50-53 --json                            | work:loop            | 0        |
    | work loop 03 --dry-run                            | work:loop            | 0        |
    | work loop 03 --level L1 --json                    | work:loop            | 0        |
    | work loop 03 --level L3 --json                    | work:loop            | non-zero |
    | work loop 03/01 --json                            | work:loop            | non-zero |
    | work loop --json                                  | work:loop            | non-zero |
    | work loop show                                    | work:loop            | non-zero |
    | work loop 03 --node x --json                      | work:loop            | non-zero |
    | work drive refine 03/01 --dry-run --json          | work:drive-refine    | 0        |
    | work drive continue 03/01 --dry-run --json        | work:drive-continue  | 0        |
    | work drive verify 03/01 --dry-run --json          | work:drive-verify    | 0        |
    | work drive continue 99/99 --dry-run --json        | work:drive-continue  | non-zero |
    | work drive frobnicate 03/01 --json                | (none)               | non-zero |
    | work drive --json                                 | (none)               | non-zero |
    | work drive-continue 03/01 --json                  | (none)               | non-zero |
    | work loops show --json                            | work:loops-show      | 0        |
    | work loops validate --json                        | work:loops-validate  | 0        |
    | work continue 03/01 --json                        | work:continue        | 0        |
    | work refine 03/01 --json                          | work:refine          | 0        |
    | work verify 03/01 --json                          | work:verify          | 0        |
    | work next --json                                  | work:next            | 0        |
    | work list --json                                  | work:list            | 0        |

  Examples: the four `argsFor` cases this story owes the bijection gate (ADR-005 Consequences)
    | command id          | id-suffix the gate derives | probe argv                                      | why that form                          |
    | work:loop           | loop                       | work loop 03 --json                             | `--json` never launches — the probe    |
    | work:drive-refine   | drive-refine               | work drive refine 03/01 --dry-run --json        | a driver always spawns; dry-run reports |
    | work:drive-continue | drive-continue             | work drive continue 03/01 --dry-run --json      | a driver always spawns; dry-run reports |
    | work:drive-verify   | drive-verify               | work drive verify 03/01 --dry-run --json        | a driver always spawns; dry-run reports |

  Examples: route arithmetic — longest-prefix, with the neighbours that already exist
    | argv words          | longest route key matched | command             | rest passed on |
    | work loop 03        | work loop                 | work:loop           | ["03"]         |
    | work loop show      | work loop                 | work:loop           | ["show"]       |
    | work loops show     | work loops show           | work:loops-show     | []             |
    | work drive continue | work drive continue       | work:drive-continue | []             |
    | work continue 03/01 | work continue             | work:continue       | ["03/01"]      |
    | work drive 03/01    | (no key)                  | (none)              | —              |
