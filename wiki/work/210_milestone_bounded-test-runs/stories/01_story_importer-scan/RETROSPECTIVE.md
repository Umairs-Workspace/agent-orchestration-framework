---
doc: retrospective
promotionFrom: 1
---
# 210/01 · A change is matched to the suites that import or name it — retrospective

## R1 · A new testing module missed the package import allow-list its suite choice never ran

**Kind:** mistake (recurring) · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer (210/04) · **Recurs:** 166/R3 · **Promoted to:** rule:wiki/TESTING.md

**What happened:** `packages/work/src/testing/importers.mjs` landed without its entry in `test/bundle/yarn-installation.test.mjs`'s package import allow-list. 210/01's suites were green. The red surfaced in 210/04, which had to add the entry.

**Why:** The allow-list is a census that reads the tree. It imports nothing, so neither an importer scan nor a by-area choice made from the changed module reaches it.

**Lesson:** When a story adds a module, or changes a module's imports, in a workspace package, run `test/bundle/yarn-installation.test.mjs` whatever the suggestion lists. `wiki/TESTING.md`'s area table now names it.

**Refs:** STATE `## Feedback (for retro)` 2026-11-27 (210/04's process note); 161/01/R1; 175/03/R1.
