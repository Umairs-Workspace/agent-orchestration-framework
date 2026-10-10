# 153 · Refine evidence

Measured 2026-10-10. No implementation, dependency install or source retrospective was changed.

## Current graph and source fallback

`aof graph build .` failed with `spawnSync ... graphify.exe EPERM`. No successful BuildResult,
fresh builtAt, egress assertion or counts are claimed. The refine procedure explicitly permits
source-reading fallback here; no elevated graph execution was requested and no stale graph was read.
Consequently `graph impact` cannot supply current evidence and empty coupling is never assumed.

The actual `createStoryContractDeriver` was run for all five subjects with a graph reader that
reports this unavailable current graph. All five proposals report `complete: false`, graph
`unreadable`. Subjects, citations and suite convention still contribute; direct imports were then
resolved against package exports as source evidence. The author narrowed the proposals, not the
tool. Every story carries its own exact reads/files declarations and anchored ADR reads.
Unrelated imports from assembly and test-index aggregation were subtracted: ownership of an
append-only registration hub does not require reading every unrelated service it registers.

## Feedback consumer census

Search covered all package MJS files for `readFeedbackRecords`, `FEEDBACK.ndjson`,
`feedbackRecordPath`, `feedbackRecords` and `recordFeedbackClassification`.

| Consumer | Current coupling and required treatment |
|---|---|
| `packages/work/src/feedback-records.mjs:64` | Strict two-kind parser; all append/classification operations re-read it. Admit recall centrally; retain rejection of unknown shapes and classification's raw-only reference. |
| `packages/work/src/doc-transitions.mjs:3` | Imports appendRawFeedback, writes STATE and raises feedback.recorded. New recall transition must preserve publication without pretending to be a raw note. |
| `packages/work/src/commands/feedback.mjs:15` | Raw-only guard and transition caller. Refuse recall fields at this existing door; use the memory verb. |
| `packages/work/src/commands/counters.mjs:43` | Loads the entire ledger into observations. Must accept mixed input. |
| `packages/work/src/counters.mjs:66` | Projects raw records before counting. Add mixed-kind regression evidence so recall never enters the raw denominator. |
| `packages/core/src/application/bindings/effects/table.mjs:63` | Existing publication event binding. Preserve its applicability and warnings for the new transition. |
| `packages/work/test/feedback.test.mjs` | Existing raw/classification and counters integration tests. Extend alongside consumers. |
| `packages/work-graph/test/work-counters.suite.mjs` | Existing counter semantics; add recall rows to the denominator fixture. |

No additional direct ledger reader was found in current package source. The origin's three-reader
list predates the package split; source search, rather than its old paths, is authoritative.
The new accounting reader and tune are additional consumers in stories 03/05.

## Memory and tune seams

- `packages/knowledge/src/memory.mjs:483` composes brief from recall; no bundle procedure invokes
  it. Its public exports are re-exported by the core work/memory binding. The existing memory
  routed-command and integration suites own removal expectations.
- `packages/work/src/memory-vocabulary.mjs` owns lesson sections, meta grammar and the hold.
  `packages/knowledge/src/memory/local-indexing.mjs` uses it; the existing frozen status/tags
  slots are sufficient for promotion and recurrence.
- `packages/work/src/commands/validate.mjs:226` composes the live hold. Doctor's lesson-meta
  lane consumes the same rule for archives, using snapshot text.
- `packages/work/src/tune/corpus.mjs:74` uses the retrospective parser, but currently extracts
  only config targets. `proposal.mjs` always refuses prompt text as uncomputable; command
  composition does not currently supply a target text reader. All three must change together.
- Tune formation groups by metadata and preserves source facts/provenance. New recurrence
  evidence must survive that path without replacing its evidence floor or ordinal acceptor.

## Label calibration input, not a fabricated calibration result

The origin measured 23 recurrence self-report lines on 2026-09-17. Repeating its expression over
today's retrospective files finds a larger corpus; those lines are candidate labels, not 23
independent true-positive pairs. Some say a problem did *not* recur, and some concern metadata
or controls rather than an additional incident. Story 02 owns source adjudication, frozen
train/held-out pairs and the measured threshold; there is no threshold result yet.

Direct reads confirm the required junction pair crosses kinds:

- `wiki/work/archive/45_milestone_ui-app-shell-routing/RETROSPECTIVE.md`, R13: mistake; removal
  traversed junctions and deleted shared targets.
- `wiki/work/archive/68_milestone_loop-telemetry/RETROSPECTIVE.md`, R10: near-miss; its evidence
  recounts a later destructive pass and a subsequent measured countermeasure.

ADR-002 therefore gives the whole-index known-pair outcome precedence over the origin's example
`--kind` narrowing. No synonym or new Kind is introduced. The ordinary recall filter is unchanged.

## Proposal subtraction and runner ownership

| Story | Raw proposed writes | Conventional proposals replaced with actual owner suites |
|---|---:|---|
| 01 | 29 | assemble/doc-transitions/feedback-records/counters/memory conventional flat tests → feedback, work-counters, routed-memory, memory-integration, backend-selection, new CLI ledger fixture and registered consumer control |
| 02 | 25 | lesson-meta/local-indexing/memory-vocabulary/memory/recurrence/validate conventional flat tests → existing vocabulary, meta-normalised and lesson-meta-hold suites plus registered recurrence suite/control and CLI fixture |
| 03 | 20 | index/memory/accounting/effectiveness conventional flat tests → package-owned accounting/effectiveness suites and CLI fixture; keep doctor’s existing suite readable |
| 04 | 20 | no source-module convention applies; extend the already-registered learning-edge control and render manifest/parity evidence |
| 05 | 16 | corpus/distance/proposal/tune conventional flat tests → existing planning suites, tune-distance suite, declared-read/read-only controls and CLI fixture |

New package suites enter their package index; new arch suites enter the existing memory index.
Integration fixtures resolve their steps by the existing basename convention; the builder binds
the work-task scenarios through those registered fixtures. No runnable or staged test is placed
in this work folder. Shared memory command/arch registration writes order 01 then 02 then 03;
04 changes only bundle/render surfaces and its own existing control; 05 follows 03's accounting API.

## Solo role passes

PO mapped the objective into five user outcomes and initially kept every example proposed. Architect
settled ADRs before task authoring and reviewed all questions: calibration, idempotence, identity,
forward metadata, brief retirement and append-patch construction are engineering choices.
Doctor age is operator policy: 153/03 Q1 had no answer in SPEC or origin and took no autonomous
default. On resumption the operator selected the suggested five-milestone threshold; only E4
received the provenance label stated Q1. QA's edge matrix covers empty/off, duplicate/conflicting/corrupt ledger rows, cross-kind
and negative recurrence, archive/legacy metadata, malformed targets and read-only proposals.
Developer feasibility used the package coupling and actual runner registrations above. These
are inline lenses, not independent reviews.
