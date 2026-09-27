---
doc: retrospective
updated: 2026-09-23
---
# 01 · The seam is named in config — Retrospective

## R1 — the ADR put an id grammar where a standing control forbids one

- **Kind:** mistake · **Area:** architecture · **Stage:** refine → build · **Owner:** architect
- **Raised by:** the 01 build, against FF-6604

**What happened.** ADR-003 §1 placed the `ADR-NNN` stem grammar in `layout.mjs` as its own regex.
FF-6604 (66/ADR-001 §7) allows no `ADR-\d` spelling in `src/` outside `src/declared-id.mjs`. The
layout now builds its patterns from `idForm("ADR")`, and FF-13302 checks the stem rather than the
id shape.

**Lesson.** When refine declares a new control over a spelling, it must list the standing controls
that already own that spelling and route through them. The milestone's register should name the
standing controls it must keep green, not only the new ones.

## R2 — the milestone's own documents are inputs to its parser

- **Kind:** near-miss · **Area:** implementation · **Stage:** build · **Owner:** developer
- **Raised by:** the 01 and 03 builds

**What happened.** ADR-003 §3 shows the link block inside a fenced example, and the measured-facts
table quotes a link in inline code. Parsing either as a real link would have made the doctor lane
report this milestone's own ARCHITECTURE.md. The parser now skips fences (01) and code spans (03).

**Lesson.** A parser of the work docs should first be run over the stream that specifies it.
Documentation quotes the syntax it documents.
