---
doc: retrospective
promotionFrom: 1
---
# 01 · The memory node holds backend, corpora, graph and per-engine settings, and one module reads it in either spelling — retrospective

## R1 · The read set and the write set missed the controls a new module trips

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** Beyond `reads:`, the build had to read the controls' scanners
(`test/support/{source-slice,module-family,read-src-files,cli-spawn}.mjs`), the rubric join, and
every `validateConfig` caller. It also wrote outside `files:`: the `status` goldens in
`work-memory-command.test.mjs`, FF-16004's `work find` pin (745 → 746), the knowledge `src` and
`test/arch/memory` budget rows, `config-inspect.mjs`'s runtime-audit digest, a rename that
`codebase-grounding-no-parse` forced, and the PLAN's wording for FF-9603.

**Why:** The contract named the files the behaviour lives in, not the controls that meter a new
file, a new module or a new diagnostic. Each of those controls is found only when it turns red.

**Lesson:** When a story adds a module, a file or a diagnostic, enumerate at refine the controls
that meter that kind of change (budget rows, pins, digests, goldens, the grounding scans), and put
them in `files:`.

**Refs:** milestone STATE `## Feedback (for retro)` (180/01, the read set and the whole-tree run);
FF-16004; FF-9603.
