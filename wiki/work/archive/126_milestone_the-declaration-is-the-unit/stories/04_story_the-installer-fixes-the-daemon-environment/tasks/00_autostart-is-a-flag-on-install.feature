@executable @cli @distribution @adapter
Feature: Autostart is a flag on install — --autostart and --no-autostart on the existing verb, an absolute-path value, no fifth command, and idempotent in both directions

  `aof mesh desktop install` (`src/commands/mesh/desktop.mjs:442-491`) stages-then-swaps the app
  into the resolved install dir (`resolveDesktopInstallDir`, `:46-56`, default `~/.aof/bin`) and
  declares `workspace: false`. The registry today holds exactly three `mesh:desktop-*` commands —
  `install`, `run`, `stop` — and the login surface on this machine is
  `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` (measured 2026-09-08: ten `REG_SZ` entries,
  each one line of `<name>    REG_SZ    <data>`, none of them aof's). TECH_DEBT item 20's
  third lesson: "already stopped" is a SUCCESS so a deploy script can run a verb unconditionally;
  the same rule applies to writing a value that is already there and deleting one that is not.

  `reg query` prints the DATA VERBATIM — quoting is a property of what was stored, never of the
  printer (measured on the same ten: seven carry literal double quotes because they also carry
  arguments, e.g. `"C:\Program Files\Microsoft OneDrive\OneDrive.exe" /background`; three are bare,
  including `C:\Program Files\Docker\Docker\Docker Desktop.exe`, whose path contains a space and
  which Windows launches at login regardless). So this verb writes the bare absolute path, quoting
  is not pinned, and the OS read-back in task 04 asserts the data as stored.

  The value this verb owns is named `aof-mesh-desktop`, and a Run value under any other name is not
  its business in either direction. `parseSpecArgv` (`src/spine/face.mjs:47-80`) has no `--no-`
  negation — flags are declared camelCased and an undeclared one is a loud `unknown-flag` — so
  `--no-autostart` is its own declared boolean (`noAutostart`) and the two flags together are a
  contradiction nothing downstream resolves.

  TWO REFUSALS ARE DECIDED ON THE INPUT, before any act: the flag contradiction here, and the
  platform admission of task 02. Neither reaches the artifact check, the install dir or the
  registry, so each fires whether or not artifacts were supplied and leaves the install dir exactly
  as it found it — which is what makes task 02's "nothing was placed" assertable at all. The
  existing artifact refusals (`app-artifact-missing` / `bootstrapper-artifact-missing`, `:122-144`)
  are unchanged and fire next, still ahead of any registry path.

  What would quietly undo this: a fifth verb `aof mesh desktop autostart` (a second door to one
  act); a value naming `aof-mesh-desktop.exe` bare (a PATH search at login); a second write that
  reports a refusal; a write without `reg`'s `/f`, which does not fail but PROMPTS
  (`Value … exists, overwrite(Yes/No)?`) and hangs a CLI with no console — the one failure a fake
  runner cannot show; `--no-autostart` failing on an absent value; and a removal that matches on the
  program path, deleting a value this verb never wrote.

  ADR-007 §1. 36/ADR-003. TECH_DEBT 20. FF-12607.

  Scenario: --autostart writes one value naming the installed app by absolute path
    Given an installed app in the resolved install dir and a fake registry runner
    When `aof mesh desktop install --autostart` runs
    Then exactly one value is written under the current user's Run key
    And its name is `aof-mesh-desktop` and its data is the absolute path of `aof-mesh-desktop.exe` in that install dir
    And the write is non-interactive — it can never wait on a console prompt
    And the render says autostart is registered and names the path

  Scenario Outline: every prior state of the key, under each flag
    Given a Run key in state <prior> and a fake registry runner
    When `aof mesh desktop install <flag>` runs
    Then the key ends <after>
    And the command succeeds and the render says <render>

    Examples: --autostart — writing twice is one entry and two successes
      | prior                              | flag        | after                            | render                            |
      | no value of ours                   | --autostart | holding the current app path     | registered, naming the path       |
      | ours, already the current app path | --autostart | holding the current app path     | registered, naming the same path  |
      | ours, a path in a former install dir | --autostart | holding the current app path   | registered, naming the new path   |
      | no value of ours, another NAME holds the same path | --autostart | ours written, the other untouched | registered, naming only ours |

    Examples: --no-autostart — removing an absent value is a success
      | prior                              | flag           | after                          | render                        |
      | ours, already the current app path | --no-autostart | with no value of ours          | autostart removed             |
      | ours, a path in a former install dir | --no-autostart | with no value of ours        | autostart removed             |
      | no value of ours                   | --no-autostart | unchanged                      | there was nothing to remove   |
      | no value of ours, another NAME holds the same path | --no-autostart | the other name still present | there was nothing to remove |

  Scenario Outline: the data is the absolute path the resolved install dir gives
    Given an install dir resolved from <source> and a fake registry runner
    When `aof mesh desktop install --autostart` runs
    Then the value's data is that directory's `aof-mesh-desktop.exe` as an absolute path
    And it is never the bare exe name and never a path relative to anything
    And a second run against the same dir writes the same data and leaves one entry

    Examples: the three ways the dir resolves
      | source                                                    |
      | the default `~/.aof/bin`                                  |
      | `--install-dir` naming a directory whose path has a space |
      | `--install-dir` given as a relative path                  |

  Scenario Outline: the flag pair is declared, and a contradiction refuses before anything happens
    When `aof mesh desktop install <argv>` runs
    Then the answer is <answer>
    And no registry runner is invoked and nothing is placed in the install dir
    And the answer is the same, in the same words, whether or not `--app-artifact` and `--bootstrapper-artifact` were supplied and whether or not they resolve

    Examples: two declared booleans, no negation and no precedence
      | argv                       | answer                                                          |
      | --autostart --no-autostart | refused `autostart-flags-conflict`, decided on the input         |
      | --no-autostart --autostart | refused `autostart-flags-conflict`, decided on the input         |
      | --autostrt                 | refused `unknown-flag` at the face's spec-parse, before the run  |

  Scenario: no fifth command, and the machine face is one document
    Given the command registry
    When `mesh:desktop-*` ids are listed
    Then they are exactly `install`, `run` and `stop`
    And `aof mesh desktop install --autostart --dry-run --json`, over fixture artifacts and a fixture install dir so no real hive is reached, prints one parseable envelope carrying `dryRun: true` and the autostart result
