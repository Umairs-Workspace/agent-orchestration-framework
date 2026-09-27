---
type: story
number: 00
slug: the-trigger-declaration
title: "The trigger declaration — a trigger is reviewable data with one compiler, and its cadence is imported rather than copied"
parent: 63
status: done
owner: product-owner
created: 2026-09-01
updated: 2026-09-02
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md#ADR-002, wiki/work/63_milestone_event-driven-triggers/SPEC.md#Scope, src/frozen-set.mjs, src/bundle/frozen-set.jsonc, src/work-loops.mjs, src/work-bundle.mjs, scripts/generate-bundle-manifest.mjs, wiki/work/52_milestone_loop-registry-and-graph/stories/00_story_loop-model-and-loader/tasks/00_frozen-vocabulary.feature]
files: [src/work-trigger/declaration.mjs, .aof/triggers.jsonc, src/bundle/triggers.jsonc, src/bundle/bundle.json, src/bundle/manifest.json, .gitattributes, src/work-loops.mjs, test/work-loops-record.test.mjs, test/trigger-declaration.test.mjs, test/arch/acd-trigger-declaration-is-data.test.mjs, scripts/test.mjs]
---
# 00 · The trigger declaration

## User story

As the reviewer who will be asked to approve a machine waking itself,
I want which signal may wake which scope at which level to be one reviewable file with one compiler,
so that what an unattended run is permitted to do is something I can read in a diff rather than
something I have to reconstruct from four call sites.

The failure this refuses is specific. A trigger vocabulary spread across a config key, a scheduler
entry and a call site is one nobody reviews, because there is no single artifact to review; the first
time anyone assembles it is after an unattended run did something surprising. This repository has
settled that shape three times already — 52's `.aof/loops/*.md`, 55's `.aof/frozen-set.jsonc`, 61's
criterion record — and this story is the fourth instance rather than a fourth invention.

Two clauses carry most of the weight. **A member that does not compile is a coded refusal, never a
warning** (`ARCHITECTURE.md#ADR-002` §2): a trigger set with one member silently skipped is worse than
no trigger set, because it reports as armed. And **the cadence grammar is imported, not copied**
(§3): `cadenceField` already parses `periodic:<n><unit>` and `event:<trigger>` in `src/work-loops.mjs`,
and a second copy under `src/work-trigger/` would be the species 66/FF-6604 and TECH_DEBT item 68
exist to refuse. The import is one additive **function** export — the move 62/04 already made with
`loopPointersIn`, recorded in full at `test/work-loops-record.test.mjs:1119-1140` — so 52's delivered
`00_frozen-vocabulary.feature:22` claim of eleven exported **sets** stays untouched.

The cadence earns its import by being *checkable*. A trigger may point at the loop-registry entry it
wakes; when both declare a cadence, the two are compared on the operands `parseCadence` already carries
— `ms` for a duration, `scopeRank` for an ordinal — and a trigger that fires faster than the loop it
wakes declares is a computable contradiction rather than a matter of taste. A cadence aof merely stored
would not be worth an import; a cadence aof can contradict is.

## Tasks

- [x] `tasks/00_the-declaration-is-data-with-one-compiler.feature` — a declared member compiles to a runtime-shaped trigger through exactly one module, and the source vocabulary is closed and 63's own
- [x] `tasks/01_a-member-that-does-not-compile-refuses-the-whole-set.feature` — one bad member among good ones refuses the compile with a code naming the member, and no partially-compiled set is ever returned
- [x] `tasks/02_the-cadence-is-imported-never-copied.feature` — the cadence is parsed by the loader's own grammar reached through one additive function export, with its answers byte-unchanged and no second grammar authored
- [x] `tasks/03_a-trigger-faster-than-the-loop-it-wakes-is-a-contradiction.feature` — a trigger and the loop-registry entry it points at are compared on the operands the parsed cadence already carries, and the faster trigger is reported by name
- [x] `tasks/04_the-shipped-declaration-is-the-one-aof-installs.feature` — `.aof/triggers.jsonc` is installed from `src/bundle/triggers.jsonc` through the existing hashed, drift-protected path and is byte-identical to its source

## Notes

The one sole-writer carve-out in this milestone: 63/00 writes `src/work-loops.mjs` (the additive
`parseCadence` export) and `test/work-loops-record.test.mjs` (the export census). No other story
touches either. `src/bundle/manifest.json` is contended with 63/02 and is resolved by **ordering** —
63/02 regenerates it last via `scripts/generate-bundle-manifest.mjs`, never by a hand-edited hash.

**`.gitattributes` is in this story's write set for one line, and it is load-bearing** (added at the
Three Amigos pass, `ARCHITECTURE.md#ADR-010` ruling 4). Measured at HEAD: `.gitattributes:12` pins
`.aof/**/*.json`, which does **not** match `.jsonc`, so `.aof/frozen-set.jsonc` checks out CRLF on
Windows against an LF bundle source — `git ls-files --eol` reports `w/crlf attr/` against
`w/lf attr/text eol=lf`, and the two sha256 differ on disk although git holds one blob for both. The
byte-identity criterion in task 04 would therefore fail on a Windows tree and pass on Linux CI. The
line is `.aof/**/*.jsonc text eol=lf` — one pattern, which repairs `frozen-set.jsonc` and covers every
future declaration — and it belongs to this story because this is the story installing a new
`.aof/*.jsonc`: a declaration arriving without its pin is the defect. **On a Windows tree, build 63/00
before 63/02**, whose own byte-identity leg passes only once this line has landed and the file has
been re-checked-out. In CI both pass regardless; it is a one-line dotfile preference, not a module
dependency.
