---
type: story
number: 01
slug: one-enumerator-three-roots
title: "One enumerator, three roots — listItems reads the stream, the backlog and the archive, and every other walker asks it"
parent: 127
depends: []
status: done
owner: product-owner
created: 2026-09-11
updated: 2026-09-12
adrs: [ADR-001, ADR-002]
reads:
  - wiki/work/127_milestone_backlog-and-archive/SPEC.md
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-001
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-002
  - wiki/work/41_milestone_work-item-insertion/ARCHITECTURE.md#ADR-001
  - src/work.mjs
  - src/work/doctor.mjs
  - src/commands/migrate-folder.mjs
  - src/work-tune/provenance.mjs
  - src/integrations/routing.mjs
  - src/memory/local-indexing.mjs
  - src/import/recovery.mjs
  - src/mesh/worker-execution.mjs
  - src/work/read.mjs
  - src/work/ref-scope.mjs
  - src/commands/loop.mjs
  - src/commands/list.mjs
  - src/commands/next.mjs
  - src/commands/insert-shared.mjs
  - src/commands/ratchet.mjs
  - src/work/observe.mjs
  - src/spine/face.mjs
  - src/work/reindex.mjs
  - src/work-promote/promotion.mjs
  - src/work/doctor-freshness.mjs
  - src/work/doctor-depends.mjs
  - src/work/doctor-coherence.mjs
  - test/arch/work/index.mjs
  - test/arch/work/acd-work-list-contract.test.mjs
  - test/arch/store/acd-cache-read-surface-boundary.test.mjs
  - test/arch/planning/acd-proposal-provenance-resolves.test.mjs
  - test/work/stream/work-spike-chore-enumerate.test.mjs
  - wiki/work/127_milestone_backlog-and-archive/DESIGN.md
files:
  - src/work.mjs
  - src/work/doctor.mjs
  - src/commands/migrate-folder.mjs
  - src/work-tune/provenance.mjs
  - src/memory/local-indexing.mjs
  - src/work/observe.mjs
  - src/work/read.mjs
  - src/commands/list.mjs
  - src/commands/insert-shared.mjs
  - src/work/reindex.mjs
  - src/work-promote/promotion.mjs
  - src/work/doctor-freshness.mjs
  - src/work/doctor-depends.mjs
  - src/work/doctor-coherence.mjs
  - src/bundle/commands/recent.md
  - test/work/work.test.mjs
  - test/work/lifecycle/work-list.test.mjs
  - test/work/lifecycle/work-next.test.mjs
  - test/work/lifecycle/work-observe.test.mjs
  - test/work/lifecycle/work-observe-scope.test.mjs
  - test/work/lifecycle/work-observe-attribution.test.mjs
  - test/work/record/work-doctor.test.mjs
  - test/work/doctor-freshness-structural.test.mjs
  - test/work/doctor-depends-lane.test.mjs
  - test/work/doctor-coherence-completeness.test.mjs
  - test/work/migrate-command-core.test.mjs
  - test/planning/tune-provenance.test.mjs
  - test/planning/promote-finding-to-chore.test.mjs
  - test/work/stream/work-reindex-count-shifted.test.mjs
  - test/work/stream/work-backlog-archive-enumerate.test.mjs
  - test/work/stream/index.mjs
  - test/arch/work/acd-work-root-one-enumerator.test.mjs
  - test/arch/work/acd-number-null-safe.test.mjs
  - test/arch/work/acd-next-walkers-exclude-archived.test.mjs
  - test/arch/work/index.mjs
  - wiki/work/TECH_DEBT.md
  - src/bundle/manifest.json
  - .claude/commands/aof/recent.md
  - .codex/skills/aof-recent/SKILL.md
  - .opencode/commands/aof/recent.md
  - .aof/aof.lock.json
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/arch/loop/acd-loop-registry-not-an-item-type.test.mjs
  - test/arch/grade/acd-acceptance-horizon-single-predicate.test.mjs
  - test/arch/session/acd-session-driver-mesh-blind.test.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · One enumerator, three roots

## User story

As **an operator whose `wiki/work` holds a `backlog/` and an `archive/` beside the live items**,
I want **`aof work find`, `read`, `validate`, `doctor`, `depends` resolution and `memory ingest` to
see all three roots as one stream, while `next`, `loop` and the default listings see only the live
root**,
so that **an item's identity is its ref and never its location** — a done milestone can be moved
under `archive/` and an idea can sit un-numbered under `backlog/` without any reader losing it,
and without the walkers that answer "what is next" ever proposing either.

This story is the foundation the other four stand on, and it is deliberately the one that REMOVES
code from `src/work.mjs`'s neighbourhood rather than adding to it. Today `ITEM_RE` has three homes
and seven modules `readdir` the work root with their own item match; after this story `listItems`
is the only enumerator, the regex has one home, and the rule for which walkers filter is one
exported predicate rather than a filter re-invented at each site.

What lands: `listItems` walks `<work.dir>`, `<work.dir>/backlog/**` (groups at any depth, leaves
`<type>_<slug>` with no number) and `<work.dir>/archive/` (`ITEM_RE` folders, name verbatim, stories
walked as at the root) — a backlog row carries `number: null`, `ref: <slug>`, `backlog: "<group>"`,
an archived row `archived: true` and nothing else changes; `ITEM_RE` and the leaf grammar have one
home and the second-scanners retire onto `listItems` or are justified per file; one live-row
predicate (ADR-002) decides what `nextWork`, the loop and the default `list` / `recent` see, `--all`
includes the archive, and every `.number` consumer is null-safe or filters through it first; a
pre-127 reader ignores both roots — the compat `TECH_DEBT.md` at the root already proves.

## Tasks

- [x] `tasks/00_listitems-walks-three-roots.feature` — `listItems` walks the root, `backlog/**` and `archive/`; `BACKLOG_ITEM_RE` and the two root names get one home; the row shapes; compat by construction (ADR-001 §1, §2, §4, §6)
- [x] `tasks/01_item-re-has-one-home.feature` — `ITEM_RE` defined once; `doctor.mjs` imports it; `nextFreeSlot` → `appendPosition`; `observe.mjs`'s three scanners and `roadmapFolderMismatch` retire onto the enumerator's rows; six keepers allow-listed with reasons (provenance is synchronous, learns the archive); FF-12701 lands (ADR-001 §5)
- [x] `tasks/02_one-predicate-decides-who-filters.feature` — `isLiveStreamRow`; `nextWork`, `listStream` default (+ `--all`), `recent` filter through it; the loop reaches the stream only via `work:next`; `findWork`/validate/doctor/memory/depends do not filter; the seven-key row widened only on the new roots; FF-12706 lands (ADR-002 §1–§3, §5)
- [x] `tasks/03_validate-and-doctor-read-three-roots.feature` — a backlog record doc carries no number; backlog rows are neither edge source nor target; `backlog-slug-duplicate`; the numbering lanes run over every numbered row; the orphan lane knows the roots and walks the archive (ADR-001 §3, ADR-002 §3–§4, ADR-003 §6)
- [x] `tasks/04_every-number-consumer-is-null-safe.feature` — the 45 `parseInt(.number)` sites in ten files guarded; `appendPosition` over every numbered row, `selectAffected` over live rows; FF-12702 lands (ADR-002 §2, §4)
- [x] `tasks/05_the-three-controls-go-red-on-contact.feature` — `@manual`: the red probe of each of FF-12701 / FF-12702 / FF-12706, recorded in `VERIFICATION.md`

## Notes

- Lands FF-12701, FF-12702 and FF-12706 (the milestone register, all `pending` until this story).
- The `view` short-circuit at the top of `listItems` is untouched; the cache row shape is story 04's.
- `recovery.mjs`, `worker-execution.mjs`, `routing.mjs`, `ratchet.mjs` are `reads:` only — the builder confirms each keeper verdict; a wrong one is a contract-gap report.
- **Contract-authoring deltas (refine, 2026-09-11)** — six ADR facts corrected in the contracts per the
  ratification rule (loops.mjs is a registry, not a scope; doctor's orphan lane, provenance and ratchet
  are keepers, observe.mjs retires; the mint counts archived numbers, `selectAffected` is live-only; the
  seven keys widen only on the new roots; migrate-folder mints via `appendPosition`; `read.mjs` threads
  `--all`). Full text: `STATE.md` "Story 01 refined 2026-09-11"; ratified at accept in `VERIFICATION.md`.
