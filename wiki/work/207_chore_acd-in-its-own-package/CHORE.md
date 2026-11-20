---
type: chore
number: 207
slug: acd-in-its-own-package
title: "ACD's assets ship from their own package, and nothing aof generates changes"
status: not-started
owner: architect
created: 2026-11-20
updated: 2026-11-20
depends: [203, 204, 205]
schema: 1
aofVersion: 0.1.0
---
# 207 · ACD's assets ship from their own package, and nothing aof generates changes

## Intent

ACD is core's base bundle today: its agents, commands, templates, fragments, references, Codex
variants, loops, frozen set and triggers all live in `packages/core/assets`. Moving them into
`@aof/acd`, contributed through a registry the way practices and integrations already are
(`packages/core/src/practices.mjs`, `packages/core/src/integrations.mjs`), means core stops
assuming one methodology. It is a pure move: every golden baseline must diff empty.

## Definition of Done

- [ ] `@aof/acd` holds ACD's assets and its `assets/bundle.json`, and reaches core through one
      contribution object.
- [ ] Core keeps only runtime plumbing. The hooks (session pings, heartbeat, artifact sync) stay
      in core.
- [ ] Everything that resolved `packages/core/assets` for ACD resolves the new package:
  - the asset-base seam;
  - the SEA asset manifest and build script;
  - the bundle-manifest generator;
  - the tests (355 references across 134 files at capture).
- [ ] A fitness function fails when core names an ACD asset outside the registry.
- [ ] The goldens from 203, 204 and 205
      all diff empty.
- [ ] The packaged binary renders the same bundle as dev: `aof work update` from an `--sea` build
      diffs empty.
- [ ] `aof work validate` is green (no regression).

## Notes

- **The contribution kind.** ACD is a methodology, not a practice gated by a config key, and not an
  integration gated by `work.integrations`. Whether it takes a registry of its own is the first
  decision.
- **Dependencies.** All three golden milestones are needed, because a move of assets can break
  `apply` as easily as `work update`.
