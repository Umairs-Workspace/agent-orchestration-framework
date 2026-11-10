---
doc: retrospective
promotionFrom: 1
---
# 160/07 · A test's child aof runs from one bundle — retrospective

## R1 · A run-wide artefact was first built at a fixed path

**Kind:** near-miss · **Area:** code · **Stage:** build (review) · **Owner:** developer · **Raised by:** developer (review) · **Promoted to:** none

**What happened:** The first build wrote the test bundle to a fixed `.tmp/test-cli-bundle/`. Two sharded runs in
one checkout would have rewritten each other's bundle under their running children. Review moved it into the
run's own stamped directory, resolved absolute, and removed when the pool drains.

**Why:** The bundle was thought of as a build output, not as state owned by one run.

**Lesson:** Anything a run builds for its own children lives in that run's directory, as an absolute path, and is
removed when the run ends.

**Refs:** ../../STATE.md `## Feedback (for retro)` (160/07 review).

## R2 · The release bundle's shape could not be reused for tests

**Kind:** misunderstanding · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** ADR-008 expected the test bundle to share the SEA's build. It cannot: `sea-entry.mjs` picks
payload or embedded by `process.execPath`, and a CJS bundle has no `import.meta.url`, so `coreRoot()` would
anchor at node's install directory. What is shared is the recipe (`CLI_BUNDLE_RECIPE`); the test bundle is ESM
with each module's `import.meta` rewritten to its source file.

**Why:** The ADR named the artefact to share before anyone read how the SEA entry locates itself.

**Lesson:** When an ADR reuses a build, name the recipe it shares, and read how the existing artefact locates its
own assets before deciding the artefact is reusable.

**Refs:** `scripts/build-sea.mjs` (`CLI_BUNDLE_RECIPE`); ../../STATE.md (160/07).

## R3 · The write set missed the gate's own test and the runtime audit

**Kind:** mistake (recurring) · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Recurs:** 160/00/R1 · **Promoted to:** none

**What happened:** `test/run/regression-gate.test.mjs` and the runtime audit's entry for the bin's dynamic import
both had to change, and neither was declared.

**Why:** Every edit to an audited file moves `scripts/workspace-runtime-audit.json`; refine still does not add it.

**Lesson:** A story that edits an audited file declares the runtime audit in `files:`.

**Refs:** ../../STATE.md `## Feedback (for retro)` (160/07 — the declared write set).
