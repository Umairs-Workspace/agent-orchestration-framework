---
doc: state
---
# 198 · The designer draws mocks on the project's design system — State

## Progress

- 2026-11-16 — Framed by aof:add-milestone, on the backlog.
- 2026-11-17 — Promoted to 198. Refined (solo): RESEARCH R1–R7, ARCHITECTURE ADR-001–008 with
  FF-19801–19805 declared pending, and broken down into four stories.
- 2026-11-26 — Re-refined: the breakdown still holds after 207 moved ACD's assets into
  `packages/acd`. The file:line citations in RESEARCH R1, R5 and R6 now point at the current tree.
- 2026-11-26 — ADR-005 amended (operator): a system is named by `name` (its title) or by
  `artifact` (its link), exactly one. The session resolves a `name`, and a missing or duplicated
  title is a stop. ADR-003 `use`, ADR-004 §5, ADR-006 §2 and ADR-007 follow; stories 01–03 updated.
- [ ] `00_story_a-fragment-can-be-for-claude-only` — not started (wave 1)
- [ ] `01_story_a-project-extracts-its-design-system-and-names-it` — not started (wave 1)
- [ ] `02_story_mocks-are-drawn-on-the-system-and-committed-as-the-baseline` — not started (wave 2)
- [ ] `03_story_an-owned-system-stays-true-to-its-code` — not started (wave 3)

## Notes & decisions in flight

- **Operator action, due by 2026-12-14:** export every page of the `AOF` Claude Design project not
  already committed into the repository, as `.dc.html` (with `support.js`) or self-contained
  `.html`. It is extraction's input (ADR-004) and is lost when standalone Claude Design closes.
  Already committed: milestones 21, 25, 46, 47 and 172 (RESEARCH R4).
- The four open questions from framing are resolved:
  1. A subagent can hold the Artifact tool, but the designer is not given it (ADR-002).
  2. A canvas is `.dc.html` artboards that render offline with the runtime as `support.js` (R2,
     ADR-006).
  3. Claude Design cannot be read live, so extraction reads exports (R4, ADR-004).
  4. The practice lives in a new `@aof/design-system` package (ADR-008).
- Diagram not drawn: `diagram-generator-missing` (ADR-006's brief kept; the diagram-design plugin
  is not installed on this machine).
- The near-miss surfaced by the architect's recall (m193/04 R2) is honoured in FF-19802 (recall
  `def45e71-425a-4351-8a91-e11cac8a7228`). The PO's recall returned nothing
  (`3f509ea2-4ad2-437a-b8c9-fb01e7e03abf`).
- `work.examples.enabled` is on in this repository, so each story's Contract starts with its example
  map at `aof:refine 198/NN`.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
