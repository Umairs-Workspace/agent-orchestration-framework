<!-- fragment:decide.designer -->
     **The mocks are drawn on the project's design system — always (198/ADR-002, ADR-006,
     amended 2026-11-27).** The design-system practice is on: `work.ui.designSystem` names the
     system and the canvas every mock is drawn on, and the config is the decision. **This step
     replaces the mock elicitation above:** do not ask how the operator wants the mocks, and do not
     offer the binding checklist alone or the operator's own mocks instead. The one question this
     step asks is the approval (step 3). This session runs every Artifact call itself: the
     designer's tools never change.
     1. **Resolve the system (ADR-005 §4).** An `artifact` link is the system. A `name` is resolved
        here and only here: list the Design System artifacts the operator can open, and take the one
        whose title equals `name` exactly. **No match, or more than one, is a stop** before anything
        is drawn: name `name`, and every candidate's title and link, and create no canvas. Never
        guess between two.
     2. **Find the milestone's page on the project's one canvas** (ADR-006 §0).
        `work.ui.designSystem.canvas` is that canvas, and every milestone's mocks live on it, never
        on a canvas of their own.
        - **No `canvas` yet:** create one from the Design type, titled for the project, and record
          it at once with `aof design-system use --canvas <its link> --json`.
        - **The page, through the verb, never by eye.** Read `project/canvas.json` back and run
          `aof design-system canvas pages <it> --out <file> --item <NN> --json`. It answers the
          milestone's `page` and the boards already on it: the page the canvas already has for the
          milestone (`m<NN>`, or one the operator made whose name starts with its number, such as
          "05 · Directory"), else a new `m<NN>`. That id is `<page>` below; never assume `m<NN>`.
          When it reports `changed`,
          publish `<file>` as the canvas's `project/canvas.json`. When its `moved` list is not
          empty, the canvas had no pages and the verb sorted every board onto a page by the
          milestone number its title starts with: show the operator that sort (each page and its
          board count) in the approval question of step 3, since it changed only each board's
          `page`. Never move, change or remove a board or note on another milestone's page. A
          refusal (the type's limit of 40 pages) is a stop: the operator names a new canvas with
          `use --canvas`.
     3. **Draw on the page, starting from what is there.**
        - **Boards already on the page** are the starting point, never redrawn from scratch beside
          them. Bring each onto the system: its colours, type, spacing and radii become the system's
          tokens where it typed literal values. Then add a board for each surface, state and
          breakpoint the milestone needs and the page lacks, and change a board only where the
          milestone's scope differs from it.
        - **An empty page:** draw one board per surface, state and breakpoint.
        - **The milestone's `mocks/` already holds an import** of this page (its README has a
          `Canvas:` line and `Page: <page>`): when the page has not changed since that version and
          the scope still matches, there is nothing to draw and nothing to ask; the import stays the
          baseline. Otherwise revise the page, and the approved version replaces the import.
        - **Hand-made mocks** under `mocks/` (no `Canvas:` line) are a reference for the drawing,
          never the baseline: draw their surfaces on the page with the system.
        - Every board you add carries `"page": "<page>"`. Install the resolved system when the canvas
          does not hold it yet, following the type's own instructions. In orchestrated mode
          `aof-designer` writes the brief (the surfaces, states, breakpoints and binding checklist)
          and this session draws from it; in solo mode this session is the designer. In `reference`
          mode, what the system lacks is drawn with its existing tokens and named under
          `## Design-system gaps` in `DESIGN.md`.
     4. **Ask for approval** — one question that carries the page's link
        (`<canvas link>#page-<page>`): "Approve these mocks?", answered **Approve**, **Revise** (the
        change is in the answer's text) or **Later**. In a driven session (`AOF_RUN_ID` is set) it
        is one question per ask, which the loop posts. On Revise, revise the same page and ask
        again with the canvas's new version. The question also says, in a line each, any sort step
        2 made and which existing boards step 3 brought onto the system or changed. `mocks/` is
        untouched while the question is open: **only an approved canvas becomes a baseline.**
     5. **On Approve, pull it back and commit it — through the verbs, never by hand.** Read back
        `project/canvas.json`, every board on the milestone's page, `project/ds/*/tokens.json` and
        the type's `artifact-type/dc-runtime.js` into one directory under the scratchpad, keeping
        their published paths, and note the canvas's version. Then run, in order:
        ```
        aof design-system mocks import <pulled-dir> --item <NN> --canvas <canvas link> --canvas-version <version> --page <page> --system <system link> --system-version <version> --approval "<reference>" --json
        aof design-system mocks capture --item <NN> --json
        ```
        The approval's reference is `run <runId> ask <n>` in a driven session, and
        `session <sessionId> <ISO instant>` interactively. A refusal from either verb is a stop:
        report it. Then name each captured frame in `DESIGN.md` as its surface's conformance source
        of truth.
     6. **On Later,** name the page's link in `DESIGN.md` as **awaiting approval**. The surface's
        binding checklist is its baseline until then, and `aof:verify` puts the canvas to the
        operator again before it judges.

     **Nothing is ever published to the system** at refine, in either mode: the canvas installs it,
     and that is all. The system and the canvas stay two artifacts; never copy one into the other.
     Refine's hand-back lists every `## Design-system gaps` entry, for the operator to pass to the
     system's owner.
