# 179/02 · Build brief

## Mechanism

Copy the integration contribution's asset half, not its verbs: `@aof/learning/contribution` is
`{ id: "learning", name, assets: { package: "@aof/learning" } }`, and `packages/core/src/practices.mjs`
lists it. `readDescriptor` and `generatePackageAssetManifest` iterate integrations then practices;
practice members get no `integration` key, so `bundle-synthesis`'s `enabled` passes them. The
duplicate-id refusal already exists and only needs the practice in its loop.

`assets/bundle.json` declares one member, `teach`, `runtimes: ["claude"]`, no variants.
`assets/commands/teach.md` is this story's frame: entry through the door, the banner, the every-turn
boundary, the resume rule, the run, the hand-off entry (reuse 00's wording with `teach`), and the
`taught:` hand-back. Leave a clearly marked place for 03's guidance.

## Known traps

- `packages/core/src` root-mjs budget 29 → 30.
- `acd-integration-registry-one-home.test.mjs` asserts what only an integration renders; check it
  still holds with a practice appending members, and do not weaken it.
- Codex: confirm `aof work update --dry-run` plans no `.agents/skills/aof-teach`.

## Verification

`aof test --scope impacted --story 179/02` green; `.claude/commands/aof/teach.md` exists after
`aof work update`; a fresh Claude session given `/aof:teach <story>` in a scratch repo prints the
banner. The live boundary walk is 04's.

## Out of scope

The help ladder, the stage map and the traps (03).
