---
doc: digest
type: milestone
number: 132
milestone: 132
slug: gsd-era
title: "The GSD era — how aof was built before ACD (v1 → v1.8, 2026-05-07 → 2026-06-14)"
status: done
imported: true
importedBy: aof
source: gsd
importedAt: 2026-09-16
---
# 132 · NN · The GSD era — how aof was built before ACD — Digest

<!-- Recovered digest, co-located with its three source documents (SUMMARY.md, MILESTONES.md,
     RETROSPECTIVE.md — the GSD-era archive kept at the ACD migration on 2026-06-14, previously
     `wiki/work/.gsd-archive/`). Each `## ` section → one `summary` record via the EXISTING parseAof.
     The full `.planning/` tree (55 phases) is recoverable at git tag `gsd-planning-archive`.
     This item predates the stream — its number is the minting order of 2026-09-16, not a
     chronology; the dates below are the record. -->

## Intent

aof began as a CLI that defines assistant assets — skills, commands, agents, rules, workflows —
**once** in `.aof/aof.config.json` and renders correct Claude Code and Codex files from them, so
no per-assistant folder is hand-maintained: `.aof/` is the source of truth, `.claude/` and
`.codex/` are generated and lock-protected. Eight GSD milestones (55 phases, 2026-05-07 →
2026-06-14) built that, then the repository migrated to ACD and the GSD planning tree was
retired. The per-milestone deliverables are in [MILESTONES.md](MILESTONES.md); the lessons and
patterns in [RETROSPECTIVE.md](RETROSPECTIVE.md); the condensed record in [SUMMARY.md](SUMMARY.md).

## v1 — Assistant Configuration Foundation (shipped 2026-05-07, phases 1–5)

`.aof/` source-of-truth; Claude/Codex render adapters; dry-run, drift detection and the lock;
the setup UI config editor. 32/32 requirements verified. The closeout-audit discipline was
established here — and its first lesson: commit the implementation before tagging a milestone,
or the tag points at documentation without shipped code.

## v1.1 — Aligned Core Hardening (shipped 2026-05-08, phases 6–10)

CLI lifecycle (`sync` / `validate` / `doctor` / `clean`); DSL primitives (mcp, hooks, docs,
settings); the adapter degradation policy; package semantics; split-domain BDD. Shared feature
files were adopted as the abstraction for future core/runtime rewrites — they specify
user-facing behaviour without binding to the Node implementation.

## v1.2 — Global Asset Library (shipped 2026-05-09, phases 11–15)

`~/.aof` global assets; project `globalRefs` (`{kind, id}` — a reference, never a copy, with
the source scope recorded in lock state); code-bearing associated files; the Project/Global
setup UI.

## v1.3 — Interactive CLI Hardening (shipped 2026-05-09, phases 16–17)

The SQLite catalog and seeded repo defaults removed (an empty `.aof` on init);
`@inquirer/prompts`-driven interactive `add`.

## v1.4 — Namespaced CLI Contract (complete, phases 18–22)

The full CLI rewrite into namespaces — `aof assets / packages / project …`; `aof init` stays
top-level; no legacy aliases.

## v1.5 — Runtime Semantics and Workflow Assets (shipped 2026-05-14, phases 23–27)

Claude-only commands (Codex command targets rejected with diagnostics — the capability model
made central so runtime differences never leak into ad-hoc adapter or UI branches);
workflow-backed assets; `{{skills.*}}` / `{{workflows.*}}` placeholders. Runtime semantics
model the assistants' real capabilities even where a lossy mapping would have been easier.

## v1.6 — Task Management, boards (shipped 2026-05-15, phases 28–32) — retired

`aof boards` kanban, GSD-backed milestone/phase sync, agent execution and the boards UI.
Removed in the ACD migration; its territory is the work stream and the board of milestones 03
onward.

## v1.7 — Typed GSD SDK Backend (shipped 2026-05-17, phases 33–38) — retired

A single typed `@gsd-build/sdk@0.1.0` adapter with surface probing, typed milestone binding
(`aof boards sync <id> --milestone <id>`), the BoardBackend seam, SDK fixtures and contract
tests; 46/46 requirements, the audit passed with accepted process debt. Removed in the ACD
migration. Its lesson survives: an SDK migration needs both a boundary guard and captured
contract fixtures — either alone leaves a blind spot — and a seam extracted from working
lifecycle code over-abstracts far less than one designed in advance.

## v1.8 — AOF Boards Dogfood UAT (in progress at the migration, phases 39–41+) — superseded

Dogfooding `aof boards` on aof itself; superseded by the move to ACD on 2026-06-14.

## Durable decisions still true after the migration

`.aof/` is canonical and runtimes are generated — apply and dry-run share one action-plan
analysis before any side effect, and generated files are lock-owned and drift-protected, never
source. Runtime overrides merge only allowed metadata/body fields and cannot change a resource's
identity. The capability model is central. Global assets are referenced through `globalRefs`,
never copied. The setup UI writes valid config only; the CLI owns execution. Packages record
managed framework intent and install only behind an explicit network/package-code boundary —
never during `aof assets apply`.

## Lessons carried forward

Commit shipped code before tagging a milestone. Keep closeout labels tied to product blockers —
missing optional process artefacts are process notes, not tech debt. Central runtime/resource
metadata pays off across validation, rendering, the setup UI and tests. Process toggles need an
execution checkpoint, or closeout finds the gap after the product work is done. Closeout should
generate its summary metadata during execution, not reconstruct it at audit. Package metadata
stays direct and local unless the product needs registry resolution. The recurring deferred
scope — a hosted asset/package registry, cross-machine `~/.aof` sync, semantic version pinning
for references, runtimes beyond Claude/Codex, UI-driven execution, a native core — is the
frontier ACD inherited.
