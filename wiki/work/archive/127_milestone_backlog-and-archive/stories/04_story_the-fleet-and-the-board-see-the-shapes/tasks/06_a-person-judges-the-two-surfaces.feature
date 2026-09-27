@uat @ui @design @board
Feature: a person judges the two surfaces against DESIGN.md's binding checklists — the backlog reads as waiting, not in flight; the archived mark as put away, not broken; neither colour-only

  Tasks 03 and 04 assert the checklists structurally off the rendered tree. What a tree cannot
  assert is how the two regions READ to an operator at a glance, which is the feeling DESIGN.md
  §Intent names and the reason the checklists exist: the backlog present but subordinate, the
  archive absent until asked for, and the overview still answering "what is happening". No
  mock was elicited for 127, so the binding checklists ARE the baseline (07/ADR-003); the
  reviewer reads each checklist row against the live surface and records CONFORMS / GAPS /
  INCONCLUSIVE per surface in the milestone `VERIFICATION.md`, at the breakpoints DESIGN.md
  §Conformance names. The design-conformance review at `aof:verify` renders the same surfaces
  headlessly (the cached Chromium, `--headless=new --screenshot`) for the designer's read-only
  judgement; this feature is the HUMAN's judgement of the same captures, and the two are
  recorded side by side.

  THE RENDER. `/?mode=board` on a board whose stream holds live milestones, at least two
  backlog rows in two groups, and at least one archived milestone with stories — the
  repository's own tree after story 05, or task 02's fixture stream served by `aof work ui`
  over a scratch project. Breakpoints: 1280 (primary — the fixed 382px detail column), 768,
  and 390 for the top-bar toggle and the backlog rows only (the 3-column grid is fixed at
  every width today and is not this milestone's to change).

  Scenario: the backlog reads as waiting, not in flight
    Given the overview at 1280 and 768 with the backlog region populated
    When a reviewer reads the page top-down
    Then the Backlog region is the last region and reads as subordinate to the cards and gates — quieter rows, no ring, chip, number, progress or dots, no button — and the reviewer records that no backlog row could be mistaken for a milestone in flight
    And the group sub-headings read as folder paths verbatim, not as a hierarchy, and the subline's `aof work promote <slug>` is where the reviewer learns the door without any row repeating it
    And at 390 the type label and slug never truncate while the title does, and the rows remain legible
    And the verdict per checklist row of DESIGN §Surface 1 is recorded in `VERIFICATION.md` under `127/04`, with a GAP naming the row and what differs

  Scenario: the archived mark reads as put away, not broken, in every context it is painted
    Given the overview at 1280 with the toggle OFF, then ON, then an archived milestone's lane board at 1280 and 768, and the toggle at 390
    When a reviewer reads each surface
    Then with the toggle OFF nothing on the page suggests an archive exists beyond the `Show archived` control, and the control reads as a scope switch (a quiet bordered toggle), not as the page's headline action
    And with the toggle ON an archived card reads as complete and shelved — the pill's `archived` word legible, the `bg-muted/40` surface calmer than a live card's, no dashed or faded treatment that would read as degraded or disabled — and the `▤ N archived` chip is read as the receipt of the fetch
    And on the lane board the mark is found in the switcher button, the switcher row, the lane card under `all` and the detail header, and NOT on any story; the reviewer confirms the board otherwise behaves exactly as a done milestone's
    And in every context the meaning survives with colour removed (the reviewer reads the captures in greyscale): the words `archived` and `Show archived` carry it
    And the verdict per checklist row of DESIGN §Surface 2, toggle OFF and ON, is recorded in `VERIFICATION.md` under `127/04`, beside the designer's headless verdict for the same captures
