---
type: story
number: 03
slug: the-distance-to-a-live-proposal
title: "The distance to a live proposal — what stands between this proposal and a commit, measured rather than phrased"
parent: 62
status: done
owner: product-owner
created: 2026-08-31
updated: 2026-09-01
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-001, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-003, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-010, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-010, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-008, src/commands/acceptor.mjs, src/work-acceptor/admissibility.mjs, src/work-counters.mjs, src/loop-bounds.mjs, src/commands/loop.mjs, src/loop-progress.mjs, wiki/work/60_spike_acceptor-discipline/SPIKE.md, scripts/test.mjs]
files: [src/work-tune/distance.mjs, test/arch/acd-distance-to-live-is-computed.test.mjs, test/tune-distance.test.mjs, scripts/test.mjs]
---
# 03 · The distance to a live proposal

## User story

As the operator being told that not one of these proposals can be committed today,
I want to be told exactly what stands in the way of each one and what would remove it,
so that the honest answer is a work item I can schedule rather than a shrug I have to accept.

This is the milestone's headline, and it exists because the alternative is an off switch. Spike 60
ranked report-only as the single most load-bearing ingredient of the acceptor and then warned, in the
same finding, that *"an acceptor that structurally never fires is not a discipline but an off switch,
and an off switch that blocks real improvements gets routed around."* 61 answered that for the eight
refusals it owns — every applicable one reported, in a frozen order, each with what would remove it.
This story answers it for the two things 61 cannot see, because they are not refusals at all: they are
missing engineering in another milestone's blast radius.

Both were measured at refine and neither is quoted from upstream. **Limb (a): no admitted knob has a
decision-site consumer.** `work.loop.reviewRounds` is resolved and thrown away at
`src/commands/loop.mjs:1047`; `buildNoProgressRounds` at `:1048` and `src/loop-progress.mjs:167`;
`maxAttempts` at four sites. **Limb (b): no run record carries a `sessionId`** — 0 of 61, and none has
been minted since 2026-08-16 — which is why `roundsToAccept` returns `run-attribution-absent` instead
of a number. That measurement also corrects the spike on its own terms: teaching `continue.md` to name
a config key lifts the harness switch and admits nothing, because `src/bundle/**` is shipped assets and
is excluded from the program read by construction.

The discipline the whole thing turns on is that none of this is a sentence. Every removal for a
refusal 61 owns is taken from the acceptor's own report — the `removal` field it already ships — so no
copy exists here to drift from the original. Every limb 62 owns is derived from a probe over the real
tree and the real corpus, so a knob that gains a decision-site consumer, or a run that gains a session
id, makes the limb **disappear**. The reported set is shrink-only and non-empty today, which points the
ratchet at fixing the tree instead of freezing its defect. And a limb whose removal genuinely cannot be
computed reports `unknown` rather than zero — a distance nobody could measure is not a distance of
none.

## Tasks

- [x] `tasks/00_every-proposal-carries-a-distance.feature` — no emitted proposal is without one, whichever lane it is in and whatever its verdict
- [x] `tasks/01_the-removals-are-the-acceptors-own.feature` — for a refusal 61 owns, the removal text comes from the acceptor's report rather than from a copy kept here
- [x] `tasks/02_the-two-limbs-are-measured-not-asserted.feature` — the decision-site-consumer limb and the run-attribution limb are each derived from the tree and the corpus, and each names what it looked at
- [x] `tasks/03_a-limb-that-closes-drops-out.feature` — a knob given a decision-site consumer, or one accepted item whose consumed runs are all attributed, removes that limb from the reported set
- [x] `tasks/04_an-unmeasurable-distance-says-unknown.feature` — a distance that cannot be computed is reported as unknown and never as zero

## Notes

- **A refusal and a limb naming ONE fact render ONCE** (`ARCHITECTURE.md#ADR-012` §5). Where the
  acceptor reported `not-admissible`, limb (a) is the measurement beneath it, never a second entry;
  a standalone limb appears only where the acceptor never spoke.
- **Limb (b) closes when `roundsToAccept` answers with a number** (`#ADR-012` §6), not when the
  harness is fully fixed. That is the only computable threshold, and it can be reached while most run
  records still carry no session id.
- **The distance is the deliverable, not an apology** (`ARCHITECTURE.md#ADR-001` §3). A milestone
  whose honest steady state is "nothing can commit today" owes a precise, falsifiable statement of
  why.
- **The two limbs are 62's measurement, and 62 does not own the fix** (`ARCHITECTURE.md#ADR-001`
  §2a). Naming them is in scope; populating `sessionId` or wiring a decision site is not.
- **No removal sentence for any member of 61's ruling vocabulary is authored here**
  (`ARCHITECTURE.md#ADR-001` §3). The acceptor's report already carries them; a copy would drift.
- **Shrink-only, and non-empty at HEAD.** A control that froze the defect would be a ratchet pointing
  the wrong way; a control that could report an empty set would be vacuous.
- **This module is PURE** — the acceptor's report rows, the consumption report and the corpus are all
  handed in, which is what keeps it buildable beside 62/00, 62/01 and 62/02.
- **Limb (a) is READ from the acceptor's report, not re-derived** (`#ADR-013` §4). Its sites,
  inspections and dispositions arrive on the row as `admissibility` and under
  `details["not-admissible"].grounds`, because `executedConsumerRefusal` already returns them. **No
  module here builds a `{rel, code}` unit set or walks `src/`** — the only producer of that set is
  private to a file ADR-009 §4 forbids touching, and building a fourth walker would give 62 and 61 two
  answers about one tree.
- **`unknown` and not-reported are different answers** (`#ADR-014` §3). Over a registry declaring no
  tunable key the acceptor is never invoked, so there are no grounds to read and limb (a) is
  `unknown` — the question could not be asked. A limb that was asked and does not stand is simply
  absent. The one acceptor report a run obtains supplies the grounds for the advisory rows too.
- **Stage 1** — builds in parallel with 62/00, 62/01, 62/02 and 62/05; no edge to any of them.
- **The corpus-wide claims moved to `FF-6208`** (`#ADR-013` §7): FF-6206 proves the shrink-only
  behaviour and the single-entry rule by planting, which this story can clear on its own.
