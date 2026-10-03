---
doc: design
---
# 135 · Key examples in the contract — Design

## Intent

The operator opens a story on the board and reads its tasks. Today a task shows a flat list of
scenarios. A contract formulated from an example map has a shape: business rules, each illustrated
by key examples. The board should show that shape so the operator can see at a glance which rule each
headline scenario illustrates. A contract with no rules must look exactly as it does today.

## Conformance source of truth

- **Mocks directory:** `mocks/`. None exists: the operator has no mock (refine end review,
  2026-10-03), so the binding checklist below is the source of truth.
- **No-mock rule:** with no committed mock, the surface's binding checklist is mandatory and is the
  source of truth.

## Surface: the task card in the story detail panel (`apps/ui/src/board/DetailPanel.tsx`, `TaskList`)

### Binding checklist

**Regions, in order, inside one task card:**

1. **Header row.** Unchanged: the file name on the left, the lane counts on the right.
2. **Feature title.** Unchanged.
3. **Scenarios outside any rule.** The existing list, unchanged: a lane chip, then the name, then
   "(outline)" when the scenario is an outline. Present only when such scenarios exist.
4. **One block per rule, in file order.** Each block is:
   - **Rule heading.** The rule's title as written (`R1 · A member may hold at most five loans`),
     `text-xs font-semibold`, foreground colour, with `mt-3` above it. It is a heading, not a
     chip and not a link.
   - **Its scenarios.** The same list item as region 3, indented one step (`pl-3`) with a left
     border (`border-l border-border`), so membership reads without colour.

**States:**

- *Loading, error, no tasks.* Unchanged.
- *Populated, no rules.* Regions 1 to 3 only. This must match today's render pixel for pixel.
- *Populated, rules only.* Regions 1, 2 and 4.
- *Populated, mixed.* Regions 1 to 4, with region 3 above every rule block.
- *A rule with no scenarios.* It does not show. The board groups the scenarios it is given, and
  an empty rule is a contract smell for review, not something the board reports.

**Design ramp:** the board's existing tokens only (`text-muted-foreground`, `border-border`, the
lane chip classes). No new colour, no new component.

**Out of scope:** collapsing rules, links from a rule to the story's `EXAMPLES.md`, and any badge for
provenance.
