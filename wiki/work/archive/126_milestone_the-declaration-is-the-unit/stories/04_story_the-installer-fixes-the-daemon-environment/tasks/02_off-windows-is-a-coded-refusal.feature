@executable @cli @distribution @adapter
Feature: Off Windows is a coded refusal — autostart-unsupported-platform naming the platform, non-zero, never a silent success, over an injected platform so the leg runs on every host

  The Tauri app ships Windows-only (36/ADR-001), and `desktopProcessName(platform)`
  (`src/commands/mesh/desktop.mjs:315-317`) already takes the platform as an argument so the
  suites can drive both branches on one host. A silent success on Linux would be the worst outcome
  available: an operator would believe their machine resumes work at login, and the first they would
  learn otherwise is a morning with nothing running. The refusal is coded, names the platform, and
  is the same shape as the module's other refusals (`refuse(code, message)`, `:61-65`) — which the
  face turns into one `{ ok:false, error, code }` document on stdout with a non-zero exit
  (`emitJsonErrorEnvelope`, `src/spine/face.mjs:189-197`).

  Admission is EXACT: the one admitted value is `win32`, and everything else refuses — including a
  value the seam never anticipated. Two spellings of the seam exist in this module and they agree on
  the case that matters: `desktopProcessName(platform = process.platform)` takes it as an argument
  with a default, and `stopDesktopApp` reads `options.platform ?? process.platform` (`:381`) — the
  one the act inherits, because the platform arrives on `ctx`. NEITHER catches the empty string (a
  default parameter fills only `undefined`, and `??` only null-ish), so `""` reaches the branch as
  itself rather than falling back to the host; a refusal that names it is the fail-closed answer,
  and a fallback to the host's own platform inside the act is the failure this scenario exists to
  catch.

  The admission is decided on the INPUT, in the same band as task 00's flag contradiction and ahead
  of the artifact check and the placement. That ordering is not decoration: it is the only reason
  "nothing was placed in the install dir" is true of a refusal on a host where the artifacts DO
  resolve.

  What would quietly undo this: an `if (platform !== "win32") return { ok: true }`; a refusal that
  exits zero under `--json`; a platform read from `process.platform` inside the act so the leg
  only ever runs on the host that happens to run CI; and a placement that has already happened by
  the time the platform is consulted.

  ADR-007 §3. 36/ADR-001. FF-12607.

  Scenario: a non-Windows platform is refused by code
    Given an injected platform of `linux`
    When `aof mesh desktop install --autostart` runs
    Then the command returns the coded refusal `autostart-unsupported-platform`
    And the message names `linux`
    And the exit is non-zero

  Scenario Outline: the admitted set is exactly one value, and every other value refuses by name
    Given an injected platform of <platform>
    When `aof mesh desktop install --autostart` runs
    Then the answer is <answer>

    Examples: one admitted value
      | platform | answer                                                    |
      | `win32`  | admitted — the injected runner is asked to write the value |

    Examples: every other value, including one the seam never anticipated
      | platform          | answer                                                                  |
      | `linux`           | refused `autostart-unsupported-platform`, naming `linux`                |
      | `darwin`          | refused `autostart-unsupported-platform`, naming `darwin`               |
      | `sunos`           | refused `autostart-unsupported-platform`, naming `sunos`                |
      | `WIN32`           | refused `autostart-unsupported-platform` — admission is never case-folded |
      | the empty string  | refused `autostart-unsupported-platform`, naming the platform as unset rather than printing an empty name |

  Scenario: the refusal is one envelope under --json
    Given an injected platform of `darwin` and artifacts that DO resolve
    When `aof mesh desktop install --autostart --json` runs
    Then stdout is one envelope with `ok: false`, code `autostart-unsupported-platform` and an `error` naming `darwin`
    And the exit is non-zero
    And no registry runner was invoked and nothing was placed in the install dir — not even a staged copy swapped into it

  Scenario: the platform is injected, not read
    Given the source of the autostart act
    When it is inspected
    Then it takes the platform as an input the way `desktopProcessName` does, resolved at the act the way `stopDesktopApp` does
    And no `process.platform` is read inside the act itself
    And the Windows branch and the refusal branch both run in the suite on this host

  Scenario: --no-autostart is refused off Windows for the same reason
    Given an injected platform of `linux`
    When `aof mesh desktop install --no-autostart` runs
    Then the same coded refusal is returned, naming `linux`
    And it is never reported as "there was nothing to remove"
