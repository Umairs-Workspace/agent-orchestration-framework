@executable @cli @distribution @adapter
Feature: The registry is reached through one injected runner — every path goes through it the way stop reaches tasklist, --dry-run writes nothing, and nothing in CI touches the real hive

  `stopDesktopApp` (`src/commands/mesh/desktop.mjs:380-425`) reaches `tasklist` and `taskkill`
  through injected `listFn`/`killFn` and declares `--dry-run` for a measured reason: the CLI
  bijection gate (`test/arch/mesh/acd-mesh-command-cli-bijection.test.mjs:177`) spawns every
  registered mesh verb with `--json`, and a machine-wide act must never be performed by a probe
  (TECH_DEBT item 20, inherited by any future verb with a machine-wide effect). `test/mesh/desktop/
  mesh-desktop-stop.test.mjs` drives the parse and the refusal over fakes. The registry act takes
  exactly that shape: one injected runner, a dry-run, and suites that never reach the hive.

  THE SEAMS THIS STORY INJECTS, named once for all five tasks. Every `@executable` step below is
  driven either by `invoke("mesh:desktop-install", input, ctx)` — the `mesh-desktop-run` suite's own
  idiom (`test/mesh/desktop/mesh-desktop-run.test.mjs:183`) — or by the CLI face with `--json`, over
  `test/support/mesh-desktop-fixture.mjs`'s temp install dir and artifacts. The ctx keys, in the
  `listFn`/`killFn` spelling `stop` already uses:

    · `ctx.runner`       — the ONE registry runner, `(file, args) => { stdout, stderr, code }`
    · `ctx.platform`     — the platform seam (task 02)
    · `ctx.env`          — already threaded, and what `resolveDesktopInstallDir` reads
    · `ctx.claudeFn`     — the `claude auth status` probe (task 03)
    · `ctx.buildInfoFn`  — the installed-build probe (task 03)
    · `ctx.workspacesFn` — this node's workspace enumeration (task 03)
    · `ctx.workspaceConfigFn` — one workspace's OWN config, read by project root (task 03)

  `ctx.claudeFn` is deliberately NOT `ctx.runner`: they may share the module's default runner, but a
  preflight probe borrowing the registry seam would make task 02's "no registry runner was invoked"
  unassertable. One seam, one act.

  The runner answers `{ stdout, code }` today, and the default maps a spawn fault to `code: -1`
  while capturing stdout ONLY (`defaultRunner`, `:343-354`). `reg` reports on STDERR: measured
  2026-09-08, `reg query … /v <absent>` and `reg delete … /v <absent> /f` BOTH print
  `ERROR: The system was unable to find the specified registry key or value.` on stderr, print
  nothing on stdout, and exit 1. So the runner contract gains a `stderr` field — purely additive,
  and the existing `listFn`/`killFn` callers, which destructure `{ stdout }` and `{ code }`, are
  unaffected. "Absent" and "broken" are one exit code apart, and the verb tells them apart by
  reading BOTH the code and that sentence on stderr rather than refusing both or accepting both.

  Both registry invocations carry `/f`. Without it `reg add` on an existing value PROMPTS and `reg
  delete` asks to confirm — neither is an error a fake runner can show, and both hang a CLI that has
  no console to answer them.

  What would quietly undo this: a direct `reg add` through `spawnSync` "for the real path" beside
  the injected one; a dry-run that still writes; a suite that runs the real command because the
  fake was easier to skip; and a runner fault read as a success because only `stdout` was consulted.

  ADR-007 §2. TECH_DEBT 20. FF-12607.

  Scenario: every registry path goes through the injected runner
    Given the source of `src/commands/mesh/desktop.mjs`, comments stripped
    When it is swept for child-process calls
    Then it contains no `spawnSync`, `execFile`, `execFileSync` or `execSync` at all
    And its only direct `spawn(` call is still `defaultRunner`'s — the detached launch keeps going through the injected `spawnFn` (`:273`), and neither carries `reg`
    And every `reg` invocation is an argument to the injected runner, exactly as `"tasklist"` is at `:363` — the literal is expected in this module, an un-injectable call site is not
    And the write and the delete each call that one runner

  Scenario: a planted direct call is caught
    Given a synthetic module source that reaches the registry through `spawnSync("reg", …)`
    When the same sweep runs over it
    Then it is reported as an offender

  Scenario Outline: what the runner answers decides the verb's answer
    Given a fake runner that answers <answer> for the <act>
    When `aof mesh desktop install <flag>` runs
    Then the command <result>

    Examples: the two clean paths
      | act    | flag           | answer        | result                                       |
      | write  | --autostart    | `{ code: 0 }` | succeeds, reporting the value it wrote       |
      | delete | --no-autostart | `{ code: 0 }` | succeeds, reporting the value it removed     |

    Examples: absent is not broken — the ONE fault that is a success, decided on the code AND the stderr sentence
      | act    | flag           | answer                                                                          | result                                          |
      | delete | --no-autostart | `code: 1`, stdout empty, stderr `ERROR: The system was unable to find the specified registry key or value.` | succeeds, reporting there was nothing to remove |

    Examples: every other fault is a coded refusal carrying what the runner said
      | act    | flag           | answer                                              | result                                                          |
      | write  | --autostart    | `code: 1`, stderr `ERROR: Access is denied.`        | refuses `autostart-write-failed`, naming the code and that text |
      | delete | --no-autostart | `code: 5`, stderr carrying any other text           | refuses `autostart-remove-failed`, naming the code and that text |
      | delete | --no-autostart | `code: 1`, stderr carrying any OTHER `ERROR:` line  | refuses `autostart-remove-failed` — only the absent-value sentence is a success |
      | write  | --autostart    | `code: -1` — the spawn-fault answer                 | refuses `autostart-write-failed`, saying `reg` could not be run |
      | write  | --autostart    | it throws                                           | refuses `autostart-write-failed`, never a stack trace           |
      | delete | --no-autostart | an object carrying no `code`                        | refuses `autostart-remove-failed`, never a silent success       |

  Scenario: a coded refusal is one envelope and leaves the key as it found it
    Given a fake runner that fails the write
    When `aof mesh desktop install --autostart --json` runs
    Then stdout is one parseable document with `ok: false`, code `autostart-write-failed` and `error` carrying the one-sentence message
    And the exit is non-zero
    And the key holds exactly what it held before
    And the envelope carries no `preflight` key — a refusal is `{ ok, error, code }` as it was

  Scenario Outline: --dry-run reports the act and performs none of it
    Given a recording fake runner
    When `aof mesh desktop install <flag> --dry-run <face>` runs
    Then the runner records zero writes and zero deletes
    And <output> names the value and the key it would have touched, and says nothing was changed

    Examples: both flags, both faces
      | flag           | face   | output                                 |
      | --autostart    |        | the render                             |
      | --autostart    | --json | the envelope, which carries `dryRun: true` |
      | --no-autostart |        | the render                             |
      | --no-autostart | --json | the envelope, which carries `dryRun: true` |

  Scenario: --dry-run covers the WHOLE verb, not the registry half of it
    Given a recording fake runner and artifacts that resolve
    When `aof mesh desktop install --autostart --dry-run` runs
    Then nothing is placed in the install dir — no staged copy, no swap, no file created or replaced
    And the runner records zero writes and zero deletes
    And the render names what would be installed, and the value and key that would be written
    And `--no-autostart --dry-run` names instead the value that would be removed
    And `--dry-run` with neither flag still names what would be installed and touches nothing
    But the artifact refusals are unchanged by `--dry-run` — a run whose artifacts do not resolve still refuses `app-artifact-missing`, because a dry run that cannot name what it would install has nothing to report

  Scenario: the bijection probe performs no act
    Given the bijection gate's spawn of `aof mesh desktop install --json` with no artifact
    When it runs
    Then the existing artifact refusal fires before any registry path is reached
    And no registry runner is invoked
    And no preflight probe is invoked — no `claude` is spawned by a probe that refuses
