---
type: story
number: 01
slug: the-level-is-a-ceiling-not-an-admission
title: "The level a trigger may ask for is a ceiling request, never an admission — resolved at every fire, refused by name, never downgraded"
parent: 63
status: done
owner: product-owner
created: 2026-09-01
updated: 2026-09-02
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md#ADR-004, src/work-loop.mjs, src/commands/loop.mjs, wiki/work/55_milestone_anchors-and-frozen-set/ARCHITECTURE.md#ADR-006, wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md#ADR-007]
files: [src/work-trigger/level.mjs, test/trigger-level-ceiling.test.mjs, test/arch/acd-trigger-level-is-a-ceiling.test.mjs, scripts/test.mjs]
---
# 01 · The level is a ceiling, not an admission

## User story

As the operator who has to answer for what a machine did while nobody was watching,
I want a trigger's declared autonomy level to be a request the existing gate re-decides on every single
fire,
so that a `level: "L3"` line in a file can never become the thing that granted the most dangerous rung.

The temptation this refuses has been named and rejected twice already in this arc, and it arrives here
wearing a better disguise. 53/ADR-006 rejected `work.loop.allowL3` in terms — *"it makes the most
dangerous rung reachable by editing a JSON file, with no diff a reviewer sees"* — and 55/ADR-006
restated the rejection *"because this is the milestone where the temptation actually arrives"*. A
`level:` line in `.aof/triggers.jsonc` is not spelled like a config key, but **if it admitted anything
it would be one**, and 55/FF-5508 already walks all of `src/**` for exactly that.

So the level is a **ceiling request**. `resolveLoopLevelGate` (`src/work-loop.mjs:447-463`) stays the
one home for admission; this leaf imports it, is **handed** the two gate facts by the face, and builds
no second gate, no threshold, no score arithmetic and no groundedness reading of its own.

Two clauses decide whether that is actually true. **Resolution happens at fire time, on every fire** —
a workspace's anchors, its Loop-Ready score and its groundedness all move, and a compiled admission is
a permission with no expiry, which is precisely the wrong thing to hand an unattended caller. And
**there is no silent downgrade**: `resolveLoopLevel` defaults an *absent* level to L2, but a *declared*
level that fails its gate is a different case entirely, and running it at L2 anyway would be this
milestone's whole failure mode wearing a friendly face. The refusal names the failing half — the score
with its failing check ids, or the components that came back `self-referential` or `stale`.

What it buys, concretely: an unattended caller learns **before** the launch, in a machine-readable
refusal, that the level it declared is unavailable — rather than discovering it inside a launched
process whose output nobody is reading. `src/commands/loop.mjs:741-748` still gates again at fire time,
so the authority is unchanged and unreachable from here; this is a pre-flight, and the surface says so.

## Tasks

- [x] `tasks/00_the-level-is-resolved-at-every-fire-never-cached.feature` — the same trigger resolved twice across a workspace whose gate facts moved gives two different answers, and no compiled trigger carries an admission verdict
- [x] `tasks/01_a-refused-level-is-refused-by-name-never-downgraded.feature` — a declared level that fails its gate is a coded refusal naming the failing half, and no code path substitutes a lower level for a refused one
- [x] `tasks/02_an-absent-level-and-a-refused-level-are-different-answers.feature` — an absent level takes the loop's own default while a declared level that fails takes nothing, and the two are never rendered as the same outcome
- [x] `tasks/03_the-gate-facts-are-handed-in-and-the-leaf-holds-no-threshold.feature` — the leaf reads no file and no clock, holds no score, component-state or level literal of its own, and answers identically to the loop's own gate over the same facts

## Notes

The pre-flight is deliberately **not** an authority. If this story's answer and
`src/commands/loop.mjs`'s answer could ever disagree, the leaf has re-derived something it was supposed
to import — which is the one thing `ARCHITECTURE.md#ADR-004`'s invariant and `FF-6304` exist to catch.
