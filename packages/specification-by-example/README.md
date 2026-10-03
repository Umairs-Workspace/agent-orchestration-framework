# @aof/specification-by-example

Private workspace for specification by example: a story's example map (`EXAMPLES.md`), the
answers a person gave to its questions, the doctor lane that judges the map, and the build-door
check that refuses a story while a business question stands. The practice is off unless a project
sets `work.examples.enabled` to `true` (134/ADR-006).

| Export | Responsibility |
| --- | --- |
| `map` | The map's closed grammar, its one parser, the pure queries over it and the answer token. |
| `answers` | Reads a person's tokened answers from the harness transcript and the run records. |
| `doctor-lane` | The doctor's examples lane and the one judgement the door shares with it. |
| `story-probe` | The doctor snapshot's story probe, and the map's row in the budget family. |
| `build-door` | The continue door's before-build check. |

Dependencies run one way (135/ADR-001 §2): this package imports `@aof/work` and `@aof/contracts`,
and `@aof/work` imports nothing from it. `@aof/work` offers three seams that name no practice — a
story probe and budget rows on the doctor engine, and a `beforeBuild` list on the phase doors — and
core composes this package into them. The gate's resolver (`examplesEnabledFromConfig`), the
transcript reader and the human-input tool vocabulary are injected by core; no module here reads
config, the environment or a clock of its own.
