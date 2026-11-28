---
doc: retrospective
promotionFrom: 1
---
# 210/04 · An agent runs the suites it names and states why, and the whole tree is refused inside story work — retrospective

## R1 · Deleted files stayed named in other items' accepted records

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner · **Promoted to:** none

**What happened:** 210/04 deleted the old selector modules and the widens-never-narrows control, and retired the control in 210's own notes. 72's and 190's accepted registers still declared that control, so FF-6607b went red, and 190/01's `reads:` still named the two deleted modules, so the stream-wide `aof work validate` went red. Validate scoped to 210 and to each 210 story passed throughout.

**Why:** The story looked for references to what it deleted inside its own item and the code. Accepted records in other items are read only by stream-wide checks, and no scoped gate reaches them.

**Lesson:** A story that deletes a module or a control searches the whole work tree for its path, runs the stream-wide `aof work validate`, and includes FF-6607b in its named run. Retire a control in every register that declares it, not only in its own milestone.

**Refs:** 210 VERIFICATION `@finding-F-10`; 210 STATE Feedback 2026-11-28 (190/01's `reads:`); run `20261127T220903045Z-0001`.

## R2 · The native status-gate check was left out after the gate's call changed

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner · **Promoted to:** none

**What happened:** 210/04 changed the gate's call to `runTest` from `{ scope: 'all' }` to `{ all: true }`. It ran the native `packages/work/test/testing.test.mjs` but not `packages/work/test/status-gate.test.mjs`, which asserts that call and went red.

**Why:** Native `node:test` files are outside the array runner and the importer scan, so nothing suggested the second file. The story picked native files by name instead of running the whole package's native set.

**Lesson:** When a change touches a package that has native `node:test` files, run all of them with `node scripts/test-workspace.mjs <package-name>`, as `wiki/TESTING.md` says, not only the one whose name matches.

**Refs:** 210 VERIFICATION `@finding-F-12`; run `20261127T190655599Z-0000`.
