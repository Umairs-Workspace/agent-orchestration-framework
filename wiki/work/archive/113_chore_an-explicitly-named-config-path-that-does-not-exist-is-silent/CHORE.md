---
type: chore
number: 113
slug: an-explicitly-named-config-path-that-does-not-exist-is-silent
title: "An Explicitly Named Config Path That Does Not Exist Is Silent"
status: done
owner: <role>
created: 2026-09-04
updated: 2026-09-05
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 113 · An Explicitly Named Config Path That Does Not Exist Is Silent

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

Chore 94 taught `loadWorkspace` to distinguish a config it could not READ from one that is
not there, and left every `ENOENT` on the silent side. That is right for a config we
DISCOVERED by walking up from the cwd — an unconfigured project is a legitimate state — and
wrong for one the operator NAMED with `--config`: they asked for that exact file, it is not
there, and the run proceeds on defaults with nothing said anywhere. It is the same silence 94
removed for a torn config, reaching the operator through the other errno.

## Definition of Done

- [x] configFaultFrom treats every ENOENT as the legitimate no-config case, which is right for a DISCOVERED config and wrong for one the operator NAMED with --config: they asked for that file, it is not there, and the run proceeds on defaults with nothing said. Make an absent config a fault when explicitConfig was supplied (loadWorkspace already knows which of the two it did), leave the discovered-path case silent, and report it through the same work:doctor finding this chore added.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "An explicitly named --config path that does not exist is silent" (`src/work.mjs:216`)
- **Raised reviewing:** `94`, review round 1
- **Promotion key:** `finding:94:an explicitly named --config path that does not exist is silent`

### What landed

| File | Change |
| --- | --- |
| `src/work.mjs` | `configFaultFrom` takes the `explicit` discriminator `loadWorkspace` already holds and returns a `missing-config` fault for an absent config that was NAMED, `null` for one that was merely not DISCOVERED. `ENOTDIR` rides with `ENOENT` — a named path whose parent is a file is just as absent as one whose parent is empty. The door still DEGRADES to `{}` and never throws: every daemon and face loads through it. |
| `src/commands/doctor.mjs` | The third code through the SAME finding chore 94 added — `config-missing`, `error` severity, appended at the workspace-level edge so no `scope` filters it away. Its message is the one thing that differs from the two present-but-unusable codes: there is no file to fix and no parse position to report, so it points at the path that was passed and offers dropping the flag to let the config be discovered. |
| `test/config-fault-visible.test.mjs` | Eight regression lanes: the named-and-missing fault, the discovered-absent silence beside it, `ENOTDIR` through the same code, the degrade (never throws, defaults still resolve), a named config that IS there staying no fault, the `work:doctor` finding (envelope, absolute path, what is not running, no dangling parse-position advice), its survival of a scope that selects no item, and — added at the review close — the coupling the whole discrimination rests on: a falsy `--config` must read as DISCOVERY to the fault predicate and the resolution predicate alike, or a discovered path would be reported as a named one that is missing. |

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->
