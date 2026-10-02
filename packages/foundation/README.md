# @aof/foundation

Private workspace for shared filesystem and diagnostic mechanisms. It has no npm
dependencies and imports no application, configuration, mesh, or feature modules.

| Export | API | Supplied policy |
|---|---|---|
| `./fs` | `readJson`, atomic `writeText`, `normalizeId`, `createTempFileSweeper` | The sweeper takes a non-throwing `reportDegrade` callback |
| `./degrade` | `createDegradeReporter` | Sink factory and optional clock; throttle state belongs to each instance |
| `./log` | `createJsonlLogSink`, `readJsonlLog`, `DEFAULT_LOG_MAX_BYTES` | Explicit file path, process label, rotation limit and optional timestamp function |

Core owns the existing log location in `src/diagnostics/log.mjs`. Old filesystem,
reporter and mesh-log exports remain compatibility adapters. The reporter entry has
no imports and is browser-safe; filesystem and log storage use Node APIs.

The migration preserves JSON error codes, atomic rename/retry/cleanup behavior,
temp-file age checks, diagnostic throttling and log format/rotation. It introduces
no new log destination or on-disk migration.

Run `yarn workspace @aof/foundation test` for the package tests.

`sqlite-runtime` owns the targeted dynamic SQLite import and warning filter. Storage packages receive it through configured ports and retain their own refusal behavior.
