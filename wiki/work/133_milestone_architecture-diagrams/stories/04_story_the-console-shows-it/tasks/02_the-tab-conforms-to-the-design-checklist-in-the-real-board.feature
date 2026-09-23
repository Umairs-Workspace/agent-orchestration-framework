@manual @ui @work @design
Feature: in the real board, the ARCHITECTURE tab matches DESIGN's binding checklist at 390, 768 and 1280

  WHY THIS IS A RENDER AND NOT A UNIT TEST. Task 01 pins every figure's markup headlessly. It cannot
  show that the figure sits in the doc column where the ADR links it, that it scales without a
  sideways scroll at 390, or that the tab strip reads right. No mock was elicited (the operator
  chose the checklist at refine), so DESIGN's binding checklist is the conformance source of truth,
  and this task renders the real board for the design-conformance review to judge against it.

  RULINGS (QA, 2026-09-23).
  (1) The render uses the cached ms-playwright Chromium driven directly, headless, with an absolute
      forward-slash `--screenshot` path (memory `design-render-headless-chromium`). `npx playwright`
      is policy-blocked here and is not used.
  (2) The board is launched with `aof work ui` from THIS checkout's CLI over a scratch fixture
      project, on an ephemeral port that is read from its output and never written into evidence
      as a standing address. The live desktop supervisor and its daemons are not touched.
  (3) Screenshots are saved under the story folder's `evidence/`, and VERIFICATION.md records one
      verdict per checklist line (conforms, or the gap).
  (4) The drawing inside a diagram is NOT judged here (DESIGN: that is story 06's).
  (5) The loading state is not captured: the real board offers no way to hold a fetch open, and
      task 01 pins that state's markup. The other three figure states and the tab are judged here.

  Background:
    Given a scratch fixture project in a fresh temp directory, with `AOF_GLOBAL_HOME` set to another fresh temp directory
    And its milestone's `ARCHITECTURE.md` has three ADRs: ADR-001 with no diagram, ADR-002 whose block links a committed SVG, and ADR-003 whose block links an SVG that is not in the tree
    And `aof work ui` from this checkout serves it, and the milestone is selected with its ARCHITECTURE tab active

  Scenario Outline: the tab at each width
    When the panel is captured at <width> px wide
    Then the tab strip shows `ARCHITECTURE` second, after `SPEC`, in the existing tab idiom
    And ADR-002's figure sits between ADR-002's prose and its `Source · PNG` line, full column width, in a hairline card frame, with its caption under it
    And ADR-003's figure is the dashed missing frame saying `Diagram not found — <stem>.svg is not in this item`, in muted text
    And ADR-001 shows no figure and no empty-diagram notice
    And the page has no horizontal scroll and no figure is cropped

    Examples:
      | width |
      | 390   |
      | 768   |
      | 1280  |

  Scenario: a story carries no ARCHITECTURE tab
    When one of the fixture milestone's stories is selected and captured at 1280
    Then its tabs are `STORY`, `TASKS` and `RUNS`, unchanged

  Scenario: the Records row lists the architecture document
    When the milestone's SPEC tab is captured
    Then the Records summary lists `Architecture` after `Spec / objective`
