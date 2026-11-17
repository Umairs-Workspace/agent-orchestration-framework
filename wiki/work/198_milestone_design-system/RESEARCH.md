---
doc: research
---
# 198 · The designer draws mocks on the project's design system — Research

**Gathered:** 2026-11-17
**Method:** the Artifact tool's own type descriptions (Design, release 1794890173-b2c6; Design System,
release 1794887801-8f4f), that type's `from-design-tool.md` and `from-code.md` references, read from
one of the operator's own systems; a live subagent probe; the operator's artifact listings; the
code at the cited lines; the committed mocks of milestones 21, 25, 46, 47 and 172.
**Status:** Desk research complete. R1 and R7 hold one item each that only a live run can confirm (A1, A2).

## R1 — Who can call the Artifact tool

- **Finding:** a spawned `general-purpose` subagent (tools `*`) had the Artifact tool directly, not
  deferred. Its `list` call succeeded with no permission prompt (probe 2026-11-17, in this session's
  auto mode). The built-in `Explore` and `Plan` agents exclude it by name, so it is an ordinary tool
  that a role receives through its `tools:` list.
- **Finding:** `aof-designer` declares `tools: Read, Grep, Glob, Write, Edit, WebSearch, WebFetch`
  (`packages/core/assets/agents/aof-designer.md:5`). 07's control
  `test/arch/ui/acd-design-role-split.test.mjs:45-51` holds it to those tools and no Bash, as "the
  structural read-only guarantee".
- **Finding:** refine runs solo by default (`work.agents.mode` absent, or `"solo"` as in this
  repository). In solo mode the main session plays the designer and holds the Artifact tool already.
- **Constraint:** if the designer is to publish, its tool grant has to change, and 07's read-only
  boundary with it. If it is not, nothing about the designer's tools changes.
- **Source:** the probe's hand-back; the files cited above.

## R2 — What a Design artifact is made of

- **Finding:** a Design canvas keeps its content under `project/`:
  - `project/canvas.json` is the index. `boards` maps each artboard file to its frame `{x, y, w, h}`,
    `order` lists them, and `designSystems` records each installed system.
  - Each artboard is one `project/<name>.dc.html` file, the same Design Component format that the
    standalone Claude Design exports, and that milestones 21, 25 and 46 committed. Its head loads
    `./support.js`. The type ships its runtime as `artifact-type/dc-runtime.js`.
  - A design system used by a canvas is installed into it as `project/ds/<folder>/tokens.json` plus
    a `designSystems` record.
- **Finding:** a canvas's files are read back by `read` with `url` and `path`/`paths`, saved under
  the scratchpad, along with a version id. The type's own instructions tell the authoring agent never
  to render, screenshot or verify a canvas unless the user asked.
- **Finding:** milestone 46 committed `Terminal Panel Spec.dc.html` with a 61 kB `support.js`
  ("GENERATED from dc-runtime"), and it renders offline. Milestone 47 expanded its template by hand
  into a self-contained `design-source.html` instead.
- **Constraint:** an offline baseline needs the artboard files, the runtime saved as `support.js`
  beside them, and any installed system's `tokens.json`. Capture is separate from authoring.
- **Source:** Design type description and instructions; `wiki/work/archive/46_*/mocks/`,
  `wiki/work/archive/47_*/mocks/README.md`.

## R3 — What a Design System artifact is made of, and how one is built

- **Finding:** the index is `project/design-system.json`, the values are `project/tokens.json`, and
  `project/README.md` is the brand book. Readers start from the README. Every token family is a
  LIST of `{name, value, usage}`. A DTCG name-to-value map is valid JSON the page cannot read, and
  `var()`, `color-mix()` and named colours are dropped.
- **Finding:** the type documents two build routes:
  - `from-code.md` reads a repository's CSS custom properties, explicitly including a Tailwind v4
    `@theme {…}` block. Each theme selector becomes a theme; values are kept as written (`hsl()`
    kept). It records `meta.source: "github"` with repo, ref and paths. Its re-sync MERGES: it updates
    changed values, adds new ones, keeps usage notes and edits made on the page, and lists tokens the
    code no longer defines before removing any.
  - `from-design-tool.md` requires a design-tool **connector** (an MCP server with structure,
    variables and code calls). With none, the procedure says to stop: there is no fallback.
- **Finding:** an index with `"editing": "code"` marks a system synced from code; the page is then
  read-only and changes go through the code.
- **Constraint:** AOF's tokens (the `@theme` block, `apps/ui/src/index.css:5-27`, one light theme,
  hsl values and one radius) are exactly the from-code input. The look the mocks carry beyond tokens
  (components, layout idioms) must be read from the mocks themselves.
- **Source:** Design System type instructions; `artifact-type/reference/from-code.md`,
  `from-design-tool.md`.

## R4 — Where the AOF design lives today

- **Finding:** the operator's `AOF` Claude Design project is a regular project of page-by-page mocks,
  not a design-system project (operator, 2026-11-17).
- **Finding:** no connector for claude.ai/design exists in this session, and `DesignSync` is scoped to
  `/design-sync` for design-system projects only. It also states that standalone Claude Design
  closes on **2026-12-14**.
- **Finding:** of the operator's 11 Design artifacts and 2 Design System artifacts, none is AOF's.
- **Finding:** exports of that project are already committed in the repository:
  - 21's `work-board-runs.dc.html`;
  - 25's `Mesh.dc.html`;
  - 46's `Terminal Panel Spec.dc.html` and its `support.js`;
  - 47's `design-source.html` and 8 frames;
  - 172's `conversation.html` and 4 frames.
- **Constraint:** extraction cannot read the Claude Design project live. Its input is the exported
  `.dc.html` files plus the code, and pages not yet exported must be exported by the operator before
  2026-12-14.
- **Source:** operator answer; `DesignSync` description; artifact listings 2026-11-17; `find wiki/work -name mocks`.

## R5 — How prose reaches each runtime today (192's composer)

- **Finding:** a member's common source is composed ONCE: `resource.body = fill(COMMON)(resource.body)`
  (`packages/core/src/work/bundle.mjs:325-326`). Only authored variants are composed per runtime
  (`:327-331`). The single composed common body serves every runtime that renders from it. That is
  Claude and opencode for `refine` and `verify` (`packages/core/assets/bundle.json:1053`, `:1202`),
  and Claude, Codex and opencode for `aof-designer` (`:57-60`).
- **Finding:** the load refuses a fragment without a body for every runtime whose text carries its
  slot (`packages/core/src/work/bundle-compose.mjs:155-161`). FF-19206
  (`test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs`) audits the same rule over the
  shipped bundle. Every slot in a common source must also appear in each authored variant
  (192/ADR-002 §7).
- **Finding:** `aof graph impact packages/core/src/work/bundle-compose.mjs` (graph built
  2026-11-17T10:06Z): 9 dependents, namely `doctor-practices.mjs`, `work/init.mjs`, `bundle.mjs`,
  `update.mjs`, two core suites and three practice arch-tests.
- **Constraint:** a fragment for Claude only cannot be expressed today. It needs both a load rule
  that does not require other runtimes' bodies and a composition that fills a common text per
  runtime.
- **Source:** the cited lines.

## R6 — Existing seams this milestone can stand on

- **Finding:** a practice package registers through `packages/core/src/practices.mjs:11` (as
  `@aof/specification-by-example/contribution` does) and is a workspace dependency of the root
  `package.json:42`.
- **Finding:** `packages/execution/src/svg-rasterizer.mjs` (133/ADR-005) screenshots a local file
  through a Chromium-family browser that aof finds and never installs, with the spawn and clock
  injected. Playwright is policy-blocked on this machine (47's README, the rasterizer's header).
- **Finding:** slots exist today only in the PO, architect, QA and researcher briefs, `refine.md` and
  the Codex `workflow.md`. `aof-designer.md` and `verify.md` carry none.
- **Source:** the cited files; `grep -rln "<!-- slot:" packages/*/assets`.

## R7 — Mock approval in a session driven by the loop

- **Finding:** in a session driven by the loop (`AOF_RUN_ID`), `AskUserQuestion` becomes the loop's
  ask (refine.md, the driven-session rules). An operator's approval of a mock can therefore travel as
  an ask, and the canvas link is a URL the operator opens on any device.
- **Constraint:** whether a publish inside a `claude -p` session driven by the loop meets a
  permission prompt is not measured (A1).

## Assumptions to confirm

- **A1 — A publish in a session driven by the loop proceeds without a prompt nobody can answer.**
  Confirm by running a refine through `aof work loop` with the practice on. Testable in CI: no
  (@manual).
- **A2 — An artboard pulled back with `support.js` from the type's `dc-runtime.js`, plus its
  installed `tokens.json`, renders offline identically to the canvas.** Confirm on one real canvas;
  46's committed pair is prior evidence. Testable in CI: the file assembly yes, the visual identity
  no (@manual).
- **A3 — The rasterizer's `--screenshot` path renders a `.dc.html` page at a given window size as it
  renders an SVG.** Testable in CI: with the injected spawn, yes; with a real browser, @manual.
