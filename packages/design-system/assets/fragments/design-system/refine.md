<!-- fragment:decide.designer -->
     **The mocks as a Design canvas, on the project's design system (198/ADR-002, ADR-006).** The
     design-system practice is on: `work.ui.designSystem` names the system every mock is drawn on.
     Before the elicitation above, **offer to draw the milestone's mocks as a canvas** on that
     system. Turning the offer down (the operator has a mock of their own, or wants the checklist)
     falls through to the elicitation above, exactly as it reads. Taking it runs these steps, in
     order, and this session runs every Artifact call itself: the designer's tools never change.
     1. **Resolve the system (ADR-005 §4).** An `artifact` link is the system. A `name` is resolved
        here and only here: list the Design System artifacts the operator can open, and take the one
        whose title equals `name` exactly. **No match, or more than one, is a stop** before anything
        is drawn: name `name`, and every candidate's title and link, and create no canvas. Never
        guess between two.
     2. **Draw on the milestone's page of the project's one canvas** (ADR-006 §0, amended
        2026-11-27). `work.ui.designSystem.canvas` is that canvas, and every milestone's mocks
        live on it, never on a canvas of their own.
        - **No `canvas` yet:** create one from the Design type, titled for the project, and record
          it at once with `aof design-system use --canvas <its link> --json`.
        - **The milestone's page** has the id `m<NN>` and the name `<NN> <milestone title>`. Read
          `project/canvas.json`; add the page to `pages` when it is missing, and draw only on it:
          every board you add carries `"page": "m<NN>"`. Never move, change or remove a board or
          note on another page. A board with no `page` is on the canvas's FIRST page, so when the
          canvas holds boards but no `pages` yet, first add a page for them (id `earlier`, named
          for the canvas's title) as the first page, then the milestone's. A canvas holding the
          type's limit of 40 pages is a stop: say so, and the operator names a new canvas with
          `use --canvas`.
        - Install the resolved system when the canvas does not hold it yet, following the type's
          own instructions, and draw one board per surface, state and breakpoint. In orchestrated
          mode `aof-designer` writes the brief (the surfaces, states, breakpoints and binding
          checklist) and this session draws from it; in solo mode this session is the designer. In
          `reference` mode, what the system lacks is drawn with its existing tokens and named under
          `## Design-system gaps` in `DESIGN.md`.
     3. **Ask for approval** — one question that carries the page's link
        (`<canvas link>#page-m<NN>`): "Approve these mocks?", answered **Approve**, **Revise** (the
        change is in the answer's text) or **Later**. In a driven session (`AOF_RUN_ID` is set) it
        is one question per ask, which the loop posts. On Revise, revise the same page and ask
        again with the canvas's new version. `mocks/` is untouched while the question is open:
        **only an approved canvas becomes a baseline.**
     4. **On Approve, pull it back and commit it — through the verbs, never by hand.** Read back
        `project/canvas.json`, every board on the milestone's page, `project/ds/*/tokens.json` and
        the type's `artifact-type/dc-runtime.js` into one directory under the scratchpad, keeping
        their published paths, and note the canvas's version. Then run, in order:
        ```
        aof design-system mocks import <pulled-dir> --item <NN> --canvas <canvas link> --canvas-version <version> --page m<NN> --system <system link> --system-version <version> --approval "<reference>" --json
        aof design-system mocks capture --item <NN> --json
        ```
        The approval's reference is `run <runId> ask <n>` in a driven session, and
        `session <sessionId> <ISO instant>` interactively. A refusal from either verb is a stop:
        report it. Then name each captured frame in `DESIGN.md` as its surface's conformance source
        of truth.
     5. **On Later,** name the page's link in `DESIGN.md` as **awaiting approval**. The surface's
        binding checklist is its baseline until then, and `aof:verify` puts the canvas to the
        operator again before it judges.

     **Nothing is ever published to the system** at refine, in either mode: the canvas installs it,
     and that is all. The system and the canvas stay two artifacts; never copy one into the other. Refine's hand-back lists every `## Design-system gaps` entry, for the
     operator to pass to the system's owner.
