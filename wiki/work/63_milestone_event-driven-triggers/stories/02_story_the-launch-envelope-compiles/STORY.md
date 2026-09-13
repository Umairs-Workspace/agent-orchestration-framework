---
type: story
number: 02
slug: the-launch-envelope-compiles
title: "The launch envelope compiles — the fourth enforcement point stops being a spelling, and every attended launch is byte-identical"
parent: 63
status: done
owner: product-owner
created: 2026-09-01
updated: 2026-09-02
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md#ADR-005, wiki/work/55_milestone_anchors-and-frozen-set/ARCHITECTURE.md#ADR-004, wiki/work/55_milestone_anchors-and-frozen-set/OUTCOME.md, wiki/work/55_milestone_anchors-and-frozen-set/stories/04_story_the-frozen-set-compiled/OUTCOME.md, src/claude-settings.mjs, src/work-bundle.mjs, src/terminal-providers.mjs, src/work-loop.mjs]
files: [src/frozen-set.mjs, src/agent-session-driver.mjs, .aof/frozen-set.jsonc, src/bundle/frozen-set.jsonc, src/bundle/manifest.json, test/frozen-set-compiled.test.mjs, test/arch/acd-frozen-set-compiled.test.mjs, test/unattended-launch-envelope.test.mjs, test/arch/acd-unattended-launch-is-declared.test.mjs, scripts/test.mjs]
---
# 02 · The launch envelope compiles

## User story

As the person who has to believe an unattended run is bounded by something other than good intentions,
I want the frozen set's fourth enforcement point to produce a compiled artifact the launch path
actually resolves,
so that "what an unattended trigger may touch" is a declaration the machinery enforces rather than a
convention a prompt describes.

This story discharges a gap two delivered records have carried since 55 shipped, with an identical
discharge condition in both — `wiki/work/55_milestone_anchors-and-frozen-set/OUTCOME.md:86-90` and
`.../stories/04_story_the-frozen-set-compiled/OUTCOME.md:48-54`: *"`gate-order` compiles to the mesh
worker launch envelope instead of appearing in `compileFrozenSet(...).deferred`"*. The envelope has had
a spelling and no enforcement for two months, reported by name rather than silently omitted — which is
the only reason it is findable at all.

**The first question is not how to compile it but what it means.** The declared rule is
`{ "argument": "--aof-gate-order" }` — a spelling with no referent. `claude` has no such flag, so
honouring it literally would break every worker launch on the first compile. The answer comes from what
the member says it protects: *"the continue, validate, doctor, grade and verify gate order"* — which is
`GATE_ORDER` (`src/work-loop.mjs:67-73`), a declaration walked in code by the loop's own gate block. **A
session cannot skip a gate the loop runs. What can skip it is a launch that is a session instead of a
loop.** That is the thing an envelope can actually refuse, and it is what the fourth point compiles to.

The other half of this story is what must **not** change. `resolveInteractiveDriverLaunch`
(`src/agent-session-driver.mjs:661`) is the sole producer of the NEEDS_INPUT sentinel and the home of
the OTel attribution and prompt-cache decisions milestones 68 and 70 landed in it, and it is reached by
both spawn paths — `src/commands/drive.mjs` and `src/mesh-worker-execution.mjs`, the only two `src/`
dependents the graph reports. So every **attended** launch — every human session, every
`work:drive-<phase>` session, all three single-phase mesh directives — must come out byte-identical to
HEAD, argv and scrubbed env alike. One enforcement point, two callers, zero edits at either caller is
what makes this a small diff rather than a mesh rewrite.

Two delivered test pins widen by exactly their deferral lines. A third citation is **not** a pin and
must not be touched: the `REMAINING` table at `test/framework-stops-shipping-guard.test.mjs:48-54`
asserts each member's `[id, enforcementPoint]` pair, both of which stay exactly as they are after
compilation. And 55/04's delivered `.feature` is **not edited** — the supersession is recorded in this
milestone's `ARCHITECTURE.md#ADR-005`, which is 53/ADR-014's precedent and this project's standing rule.

## Tasks

- [x] `tasks/00_the-fourth-enforcement-point-compiles.feature` — `deferred` is empty, `installed` carries `gate-order`, and the compiled points equal the declared points in full rather than a retyped list of four
- [x] `tasks/01_an-unattended-launch-resolves-only-the-declared-shape.feature` — an unattended launch returns the declared program and argv, and a request that does not match the declaration is a coded refusal rather than a launch
- [x] `tasks/02_every-attended-launch-is-byte-identical.feature` — a human session, a phase-driver session and all three single-phase mesh directives produce argv and env byte-identical to HEAD
- [x] `tasks/03_the-rule-with-no-referent-is-replaced-in-the-declaration.feature` — the member's rule names a launch a runner can resolve, in both the bundled source and the installed copy, and the change is visible in the declaration rather than buried in code

## Notes

`src/bundle/manifest.json` is contended with 63/00 and resolved by ordering: this story regenerates it
**last**, via `scripts/generate-bundle-manifest.mjs`, never by a hand-edited hash.

Deliberately **not** taken (`ARCHITECTURE.md#ADR-005` §5): a per-launch `--settings` document or a
`--disallowedTools` list. Both are reachable, and both would put a second copy of the permission-denial
rule shape at a second carrier while the first already travels with the clone in git. Recorded there as
the shape to reuse if a later milestone needs a grant for a worktree aof did not write.
