# 193/03 · A project turns it on and is told what it needs — build plan

## Mechanism

Four small seams, one message.

The switch is a second key of the closed `work.examples` block. Add it to the validator beside
`enabled` (same boolean rule, plus the one cross-key diagnostic), add its resolver beside
`examplesEnabledFromConfig`, and add it to the schema. It is read from the project's own config
and nowhere else: `loadWorkspace` merges the global `work.operator` (02) and must not merge the
global `work.examples`.

The writer is `initConfig`. It already read-merge-writes the project config and reports what it
set against what it kept; the switch and the profile are two more blocks in that function. Parse
the flags at the command edge, validate before touching any file, then lay them over what is
there: the role replaces, each named domain replaces, everything else stays. `--global` points
the profile half at the path `globalWorkspacePaths` answers, and refuses everything else.

The warning is one pure function: given a config the workspace loaded, is the switch on and the
resolved profile undeclared? If so it answers the one finding, with the one message. It lives in
a new lane module of the specification-by-example package, takes the two resolvers by injection
as the examples lane takes its gate, and is appended to the doctor's extension groups after the
examples lane. Anchor the finding at `snapshot.workDir`: that is what makes the engine report it
once, in or out of scope.

`aof work update` and the turn-on both call that function over the target's loaded workspace and
print its message, the update after its test-layout lines, mirroring how those reach the face
and the JSON.

## Verification step

In a scratch repo with discovery on and an empty scratch global home: `aof work doctor --json` is
quiet. Run `aof work init-config --operator-aware on`: it prints the sentence, and
`aof work doctor --json`, `aof work doctor <a story> --json` and `aof work update` each show it
once. Run the command the sentence names. All go quiet, and `aof project show --json` answers the
role with source `project`.

A wrong build shows as the warning in a project that never turned the switch on, as the warning
repeated per story (anchored at an item, not the work directory), or as `--global` leaving a file
`aof assets validate --global` rejects.

## Out of scope

- What the switch renders — 04, through milestone 192's fragments. Nothing here touches a command,
  a brief or the manifest.
- Telling a project the switch exists — 192's `aof work update` lists optional practices.
- Removing a domain from the profile — the flags set and correct; deleting an entry is a hand
  edit until someone needs a verb for it.
- `aof:init` — unchanged (ADR-006 §7).

## Known traps

- `test/fixtures/application/command-inventory.json` records `work:init-config`'s usage string. A
  new flag changes it, and the census fails until the fixture moves.
- `init-config` already has `--domains`, and it means tag domains (`@board`). The profile's flag
  is `--expertise`, so the two never read alike.
- 135/FF-13501 holds the package's imports one way. The new lane imports `@aof/contracts` and
  nothing from core.
- 134/FF-13403's fixtures spell `work.examples` as a closed object. A new key must not make
  "absent" and "`enabled: false`" behave differently from today.
