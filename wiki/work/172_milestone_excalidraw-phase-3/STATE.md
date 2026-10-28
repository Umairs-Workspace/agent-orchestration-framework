---
doc: state
---
# 172 · Excalidraw phase 3 — State

## Progress

- [x] Refined 2026-10-27 (`aof:refine 172 --autonomous`, solo): RESEARCH Q1, ADR-001..003, DESIGN with
  committed mocks, five stories
- [x] 00 · the architect answers in a headless session — accepted 2026-10-28
- [x] 01 · every conversation in one panel — accepted 2026-10-28
- [x] 02 · the answer streams into its thread — accepted 2026-10-28 (`@uat` approved; F-172-16 fixed as task 04)
- [x] 03 · the diagram surface has no terminal — accepted 2026-10-28
- [x] 04 · a right-click leaves the drawing true — accepted 2026-10-28 (F-171-03 ruled out)
- [x] Milestone accepted 2026-10-28 (VERIFICATION `## Accept decision`)

## Closure record

- **Decisions graduated.** The headless session, the stream and the one panel are ADR-001..003; the
  default technical decisions taken at refine are recorded where they apply (ADR-001 §3–§5, ADR-002
  §2–§4, DESIGN). m171/ADR-005 is marked superseded by ADR-003. DESIGN carries the fallback rules for
  F-172-09 and F-172-10.
- **Lessons graduated.** The `## Feedback (for retro)` notes of the five story closes and the verify are
  distilled into `RETROSPECTIVE.md` (R1–R5) and each story's own `RETROSPECTIVE.md`, and indexed with
  `aof work memory ingest`. The blow-by-blow is in git history (this file before `aof:verify 172`'s close).
- **Gate.** `REGRESSION.md` row 3 (`4e7d2fe`, Windows, green) is the accept gate.
- **Carried to the backlog (open findings):** F-172-01 (scope the session's `Write`), F-172-09 and
  F-172-10 (a proposal's change kind; a step vocabulary), F-172-11 and F-172-14 (Mac-only gate reds),
  F-172-17 (editor notices as a toast), F-172-18 (Ask architect in the right-click menu; upstream
  excalidraw#7609). The routed `story (operator)` from 172/00's close stands: one
  `terminateProcessTree(child)` for execution's three tree kills (00 OUTCOME `## Gaps`).
