---
type: chore
number: 207
slug: acd-in-its-own-package
title: "ACD's assets ship from their own package, and nothing aof generates changes"
status: done
owner: architect
created: 2026-11-20
updated: 2026-11-24
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

- [x] `@aof/acd` holds ACD's assets and its `assets/bundle.json`, and reaches core through one
      contribution object.
- [x] Core keeps only runtime plumbing. The hooks (session pings, heartbeat, artifact sync) stay
      in core.
- [x] Everything that resolved `packages/core/assets` for ACD resolves the new package:
  - the asset-base seam;
  - the SEA asset manifest and build script;
  - the bundle-manifest generator;
  - the tests (355 references across 134 files at capture).
- [x] A fitness function fails when core names an ACD asset outside the registry.
- [x] The goldens from 203, 204 and 205
      all diff empty, apart from the loop records' citations of their own source paths.
      *Ratified at verify (2026-11-24): `work-init/default` was re-baselined for the 17 loop
      records' self-citations. A record that cites its own source path must change when the source
      moves, and FF-5810 refuses a stale one, so this is the floor of a pure move, not a
      behaviour change. Checked: the 59 changed lines in `.aof/loops/` are identical once
      `packages/core/assets` and `packages/acd/assets` are normalised.*
- [x] The packaged binary renders the same bundle as dev: `aof work update` from an `--sea` build
      diffs empty.
- [x] `aof work validate` is green (no regression).

## Notes

- **The contribution kind.** ACD is a methodology, not a practice gated by a config key, and not an
  integration gated by `work.integrations`. Whether it takes a registry of its own is the first
  decision.
- **Dependencies.** All three golden milestones are needed, because a move of assets can break
  `apply` as easily as `work update`.

## Build notes (2026-11-23, continue attempt 1)

- **The contribution kind: a registry of its own.** `packages/core/src/methodology.mjs` exports
  `METHODOLOGY`, the one `@aof/acd` contribution. A methodology is neither switched by
  `work.integrations` nor gated by a practice's keys, and there is exactly one, so it is not a
  list. The contribution names the package and, under `files`, the three ACD files core reads by
  role (`frozenSet`, `manifest`, `digestTemplate`), so no other core module spells an ACD path.
- **Two asset classes.** `bundle` now resolves to the methodology's assets (dev: the package
  directory; packaged: the unchanged `bundle/` sidecar). The new `core` class is core's own
  `assets/` (packaged: an `assets/` sidecar beside the binary). Core's `assets/bundle.json` declares
  the 15 hook members. `readDescriptor` reads it, then appends the methodology's descriptor, then
  integrations and practices.
- **The base's contributor label stays `core`.** It appears only in load-refusal messages, and
  192/02 E7, a delivered contract, says the build brief is "contributed by core". Renaming it
  `@aof/acd` would amend that contract, so the label was left alone.
- **FF-20701** is a case on `test/arch/command/acd-integration-registry-one-home.test.mjs`, beside
  FF-16901: that directory is at its ceiling, and the subject is the same one.
- **Deviation from the DoD: the loop records' self-citations changed.** The 17 shipped loop
  records cite their own source paths (`packages/core/assets/...`). FF-5810 requires every path a
  shipped loop record cites to exist, so the records now cite `packages/acd/assets/...`. The
  rendered `.aof/loops/*.md` change in exactly those strings. The `work-init/default` golden was
  re-baselined: 17 files, 59 lines, every changed line a path string. Nothing else aof generates
  changed. Ratifying this deviation belongs to `aof:verify`.
- **Delivered records citing the old paths are not edited.** `aof work validate` resolves a
  delivered story's `reads:` through git's rename records once the move is committed. Uncommitted,
  it reports 36 unresolved reads. Open records' `files:`/`reads:` frontmatter was repointed
  (188/00-04, 189/00, 01 and 03, 198/02-03, 201/02, and one backlog story), because the wave
  planner and FF-7106 read those declarations literally.
- **The packaged layout gains one sidecar.** Core's hooks are now an `assets/` directory beside the
  binary. The SEA build, the payload install, the release archive (`stage-release-assets.mjs`) and
  both installers (`install.sh`, `install.ps1`) carry it. Without it, a downloaded release would
  fail `work init` on `core/bundle.json`.
- **Three module ceilings rose by the same two modules.** The asset seam reads the version
  synchronously and resolves the `bundle` class through the registry, so `methodology.mjs` and
  `@aof/acd`'s import-free contribution leaf are now static imports wherever the seam is.
  `--version` went 17 → 19 and `work find` 761 → 763 (FF-16004). The session driver's reach went
  42 → 44 and the worker facade's 192 → 194 (FF-5301). Each is named in its control.
- **Re-attested runtime audits.** `build-sea.mjs`, `install-local.mjs` and
  `stage-release-assets.mjs` changed around their audited child-process calls. The calls are
  unchanged, and only the files' source digests were re-attested.
- **Evidence.** By file, 262 suites and 3,188 cases are green, as are core's package suite
  (749/749) and the six other affected workspaces. All 178 golden scenarios match. A SEA built
  from the final tree renders byte-identically to dev, apart from the lock's `generatedAt` stamps,
  and its `work update` over a dev-initialised tree changes nothing. Validate and doctor are clean
  on a scratch commit of the change. The sharded gate (15,411 of 15,479 cases) left one red unit,
  `test/loop/lane-is-local-slot.test.mjs` (69/04 task 02, a dispatch child timing out on
  `.first-lane-opened`). It fails identically on a clean copy of HEAD, so it predates this chore
  and is news since the gate was green at 6e12ab63. `recall-replay` did not finish in the pool
  (the known 45-minute unit limit) and is green alone (33/33).

## Accept decision (2026-11-24, aof:verify)

Accepted. Close criteria (ADR-003, chore): every `## Definition of Done` box is ticked, the golden
box after ratifying the loop-record self-citation deviation above, and `aof work validate 207`
reports `PASS — 207 is well-formed.` The sharded gate's one red unit
(`test/loop/lane-is-local-slot.test.mjs`) fails identically on a clean copy of HEAD, so it predates
this chore. It is not this chore's regression, but it is a red the regression gate will meet.
