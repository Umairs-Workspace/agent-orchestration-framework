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

## Recurrence threshold — measured at 153/02 (2026-10-10)

Calibration `153.02-1`, threshold **0.23**, strict `score > threshold`. Evidence:
`test/arch/memory/fixtures/recurrence-pairs.json` (texts, source `path:line`, basis per label, split);
the control is FF-15302. One adjudicator (the builder, solo mode) labelled every pair; there was no
second labeller and the sample is small. Both facts bound what the result claims.

**Score rule.** Cosine of two term vectors: stemmed content words plus adjacent word pairs, each weighted
by its count in the lesson and by a frozen inverse document frequency, ln((684+1)/(df+1)), counted over the
684 indexed lessons of every `RETROSPECTIVE.md` on this date (a feature in fewer than eight lessons counts as
used by one). The weights are frozen so the scale cannot drift under the threshold. Alternatives measured on
the same sample and rejected: plain word-overlap Dice (named pair 0.229, rank 1251 of 233,586 pairs; a
same-topic negative reaches 0.240), binary cosine, and idf cosine without counts (named pair 0.173 against a
negative at 0.200). Only the count-weighted word-and-pair form puts the named pair above every negative
tried; under it the named pair ranks 7th of 228,988 cross-family pairs.

**Origin expression.** Re-run on today's tree (`grep -rhi "recurred\|recurring\|again in m\|for the third
time\|caught 3" --include=RETROSPECTIVE.md`) it returns 40 lines, each read at its source. 14 are a
`(recurring)` qualifier on a Kind — the lesson says it recurs and names no second lesson (144/R1,
145/R1, 146/R1, 148 and its stories, 141/R1, 152/R3, 39). 11 are prose about debt, flakes or a drag in a design
(34, 36, 62, 78, 3/R3, 40) or a non-recurrence (96). 15 name an earlier incident; those that resolve to
two lessons became labels: 148/R1 against the five lessons its Why names (61/R6, 126/R2, 127/R3, 141/R1,
146/R1), 141/R1 ↔ 140/R1 (its title), 152/R3 ↔ 140/R1 and 141/R1 (its heading), and 124/02/R2 ↔ 124/01/R2
("for the third time in one milestone"). The rest count repeats inside one milestone or against an unnamed
lesson (02, 126/01, 129/04, 38, 41, 47, 50/R4, 63/R4, 70/R5, 143) and were not forced into pairs. Further
recurrence pairs came from lessons that say so in their own text (86/R4 "third consecutive empty
observability snapshot"; 72/R10 "See 71/R1"; 55/R5's own count of earlier junction losses) and from reading
the highest-scoring cross-family pairs under the candidate rule.

**Labels: 19 recurrences, 19 different mistakes, 6 excluded.** Recurrences: the junction family
(45/R13 ↔ 68/R10 — the named pair — 45/R13 ↔ 55/R5, 43/R10 ↔ 45/R13, 55/R5 ↔ 68/R10), 85/R5 ↔ 86/R4,
19/R1 ↔ 41/R3, 134/02/R1 ↔ 148/01/R1, 71/R1 ↔ 72/R10, 140/R1 ↔ 141/R1, 141/R1 ↔ 152/R3, 140/R1 ↔ 152/R3,
77/R6 ↔ 81/R3, 126/00/R7 ↔ 71/R8, 124/01/R2 ↔ 124/02/R2, and 148/R1 ↔ 61/R6, 126/R2, 127/R3, 141/R1, 146/R1.
Different mistakes: 19 same-topic pairs (worktree, gates, budgets, line endings, observability, restart,
renderers), taken from the highest-scoring pairs the author judged distinct. Excluded as ambiguous, not
forced: 7/R3 ↔ 61/R5, 119/01/R3 ↔ 123/R6, 125/R4 ↔ 129/02/R8, 119/02/R1 ↔ 124/R1, 148/01/R1 ↔ 129/03/R7
(0.232) and 135/R1 ↔ 136/01/R2 (0.241) — the last two score above the threshold, and the rule would name
them.

**Split.** Fixed by rule before the split was read for any score: labelled pairs sorted by `a|b`, every third
held out (11 pairs: 6 recurrences, 5 different mistakes); the named pair always trains.

**Selection.** Threshold = the middle of the 0.01 grid values that are at least the highest training negative
(0.1831, 43/R7 ↔ 47/R4) and below the named pair (0.2606): 0.19–0.26, middle **0.23**.

| Split | TP | FN | FP | TN | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|
| Train (27) | 7 | 6 | 0 | 14 | 1.00 | 0.54 |
| Held-out (11) | 3 | 3 | 0 | 5 | 1.00 | 0.50 |
| All (38) | 10 | 9 | 0 | 19 | 1.00 | 0.53 |

**Boundary cases.** Named pair 0.2606 (detected). 77/R6 ↔ 81/R3 0.2488, 126/00/R7 ↔ 71/R8 0.2487,
71/R1 ↔ 72/R10 0.2458 (detected). 140/R1 ↔ 141/R1 0.2200 and 43/R10 ↔ 45/R13 0.2132 (recurrences,
**missed**) against 130/R1 ↔ 81/R5 0.2146 (a different mistake, the held-out negative closest to the
threshold, 0.015 below it, rejected). Those three sit within 0.007 of each other: the rule cannot separate
them, and the threshold trades some true recurrences for zero false ones.

**What the rule cannot see.** The five 148/R1 self-reports score 0.044–0.083 and 152/R3 ↔ 140/R1 scores
0.019: a lesson that restates an earlier one in different words (the `files:` census family) is not
detectable by shared vocabulary, and the author's `Recurs` for those stays manual. Separately, a lesson written
as free prose rather than labelled `What happened`/`Why`/`Lesson` fields is indexed by its title alone
(146/R1's indexed text is 79 characters), so the matcher scores only what the index holds. Neither is changed
here (ranking text is frozen by ADR-002).

**What this does not show.** The 684-lesson corpus supplied the weights, so the labelled lessons are inside
the idf statistics (mild leakage). The negatives are the author's judgement of hard cases, and most
positives sit in a few incident families. Precision 1.00 is a statement about this sample, not a guarantee;
FF-15302 holds it as a regression instrument and a verifier can add pairs without changing the rule. No
blocking finding: the stated conditions (named pair detected, zero held-out false positives) are met.
