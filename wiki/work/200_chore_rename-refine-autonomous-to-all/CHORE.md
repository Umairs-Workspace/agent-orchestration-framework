---
type: chore
number: 200
slug: rename-refine-autonomous-to-all
title: "Rename refine's --autonomous flag to --all"
status: done
owner: developer
created: 2026-11-17
updated: 2026-11-17
depends: []
schema: 1
aofVersion: 0.1.0
---
# 200 · Rename refine's --autonomous flag to --all

## Intent

`aof:refine --autonomous` refines the whole item in one pass: it breaks the item down, writes every
contract, and stops once for a single review. "Autonomous" describes none of that, and it is easily
confused with the `aof:autonomous` loop skill. Rename the flag to `--all`, and every place that
produces or accepts it. No backwards compatibility: `--autonomous` stops being accepted.

## Definition of Done

- [x] The refine command source (`packages/core/assets/commands/refine.md`: argument hint, flag
      description, the cascade section, the end-of-run review) says `--all`, and the rendered
      variants match (the Codex `workflow.md` and the Hyperagent `aof-refine` SKILL).
- [x] `aof work drive refine <ref> --all` is the option. `--autonomous` is no longer declared, and
      its refusal on the other phases names `--all`. The command `drive` emits ends in `--all`.
- [x] The loop's child drive (`packages/work-loop/src/child-drive.mjs`) and the mesh assignment
      directive (`packages/mesh/src/assignment-directive.mjs`) emit `/aof:refine <ref> --all`.
- [x] Comments and docs that name the refine flag (`loop-bounds.mjs`, `validate.mjs`,
      `session-driver.mjs`, the `specification-by-example` README) say `--all`.
- [x] Tests and fixtures that assert the refine flag (`test/fixtures/application/command-inventory.json`,
      the mesh worker and assignment tests, the loop and drive tests, `refine-discovery-beat`) assert
      `--all`, and the affected suites pass when run by file under an isolated `AOF_GLOBAL_HOME`.
- [x] `grep -rn -- "--autonomous"` over `packages/` and `test/` finds no reference to the refine
      flag. The `aof:autonomous` skill and unrelated `autonomous` identifiers are untouched.
- [x] `aof work validate` is green (no regression)

## Notes

- Scope is the refine FLAG only. The `aof:autonomous` skill (the loop driver) keeps its name.
- Internal names such as the `autonomous` option key in `drive.mjs` and `child-drive.mjs` may be
  renamed alongside the flag, if that reads better. That is the builder's call.
- Check whether the flag reaches any shipped wiki/docs page as well, and update the ones that
  describe current behaviour. Leave historical milestone records alone.

### Build record (2026-11-17)

- **Renamed (public surface):** the `/aof:refine` flag; `aof work drive`'s option (`input.all`, the
  usage line, the flag spec), its refusal message and code (`drive-autonomous-refine-only` →
  `drive-all-refine-only`); the argv the loop's lane child is given; the mesh directive string.
  `docs/acd.md` (the `whole-item` loop setting) is updated too.
- **Kept (internal, deliberately):** the loop's `autonomous` field on `ctx.loopDrive`, `engine.mjs`,
  `cycle.mjs` and `spawnLaneDrive`; the practice-pack slot ids `autonomous.milestone` and
  `output.autonomous`; the `aof:autonomous` assignment phase; `work.autonomous.refine`. None is
  operator-facing, and renaming them would spread the change across the loop for no reader.
- **Rendered:** `aof work update` re-rendered only the four refine outputs (`.claude`, `.agents` ×2,
  `.opencode`). `node scripts/generate-bundle-manifest.mjs` moved only the three refine hashes in
  `packages/core/assets/manifest.json`.
- **Left as they are:** `test/assignment/blocked-run-parking.test.mjs` types `/aof:continue 69/05
  --autonomous` as an opaque fixture string. Continue never took the flag, so it is not the refine
  flag. `presence-loop.mjs`'s comment recording how ADR-003 was decided now says "during a
  whole-item refine" rather than naming either flag. `wiki/planning` and `wiki/issues` are
  historical records and are untouched.
- **Tests:** 21 suites run by file under an isolated `AOF_GLOBAL_HOME`; 19 green. The 2 reds are
  not this chore's. `arch/69 FF-6905` (`acd-worker-driver-no-headless-print`) fails identically on
  HEAD's `session-driver.mjs`. `application/registration` (`application-assembly`) diffs only on
  `init-config --project`, which is the uncommitted local-config work of story 199. Every drive
  entry in the inventory fixture matches.
