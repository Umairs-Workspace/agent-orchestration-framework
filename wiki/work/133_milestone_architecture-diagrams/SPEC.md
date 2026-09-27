---
type: milestone
number: 133
slug: architecture-diagrams
title: "Architecture diagrams — the architect draws the design, the diagram lives with its ADR, and the console shows it"
status: in-progress
owner: product-owner
created: 2026-09-22
updated: 2026-09-23
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 133 · Architecture diagrams — the architect draws the design, the diagram lives with its ADR, and the console shows it

## Objective

**When a refined item needs system design, the architect produces a diagram alongside the ADR that
decides it, the diagram is checked in with the ADR, and anyone reading the item (in the repo or in
the aof web console) sees the picture, not only the prose.** Today an ADR is text only
(`ARCHITECTURE.md`: context → decision → alternatives → consequences). Where a design has moving
parts, the reader has to rebuild the picture in their head, and every reader rebuilds it a little
differently.

The operator uses the `diagram-design@diagram-design` Claude Code plugin
(<https://github.com/cathrynlavery/diagram-design>) and wants to keep it for now. aof must not be
**welded** to it: the generator is a pluggable choice named in config. Swapping it later changes
one config value and one adapter, not the architect prompt, the record layout, or the console.

An outsider can verify it was met: refine a milestone whose design has moving parts. Its
`ARCHITECTURE.md` then links a diagram from the ADR that decides the design. The diagram's source
and its SVG/PNG exports are committed in the milestone folder, and the item's page in the web
console renders it. Changing `work.diagrams` in config (or turning it off) changes what refine does,
with no edit to the bundle prose.

Looking ahead (out of scope here, but the design must not rule it out): the engineer edits the
diagram to change the approach, and the architect reads the edit back as a proposed amendment to
the ADR (a superseding ADR, since ADRs are immutable). That makes the diagram a two-way design
surface, not only an output.

## Scope

In scope:
- **A diagram generator named in config.** Something like `work.diagrams: { generator, … }` in
  `.aof/aof.config.json`, with `diagram-design` as the first (and default) generator and an explicit
  off switch. Absent config falls back to a stated default, so existing projects are unchanged
  unless they opt in, or pick up the default (the ADR decides which).
- **A thin generator seam.** aof owns *what* is drawn and *where it lives*: the diagram brief
  (which ADR, which view, which components and flows), the file layout, the naming, and the ADR
  link. The generator owns only *how it is drawn*: plugin, skill or command, and export. aof's
  side of the contract does not mention diagram-design.
- **The architect draws at refine.** When the architect records an ADR for a story or milestone
  that needs system design, it produces the diagram through the configured generator. The judgement
  "does this need a diagram?" is the architect's, stated in the ADR. Not every ADR gets one.
- **The diagram is part of the ADR record.** It is checked in inside the milestone folder next to
  `ARCHITECTURE.md` (for example `diagrams/ADR-NNN-<slug>.{html,svg,png}`) and linked from the ADR.
  Because ADRs are immutable, the diagram is too: a changed design is a new diagram under a
  superseding ADR.
- **SVG and PNG exports** committed next to the source, so the diagram reads on GitHub, in PRs and
  in editors without opening the HTML.
- **The web console shows it.** The item's detail view (board `DetailPanel` / the architecture
  surface) renders an ADR's diagram inline, using the exported SVG where there is one.
- **The item's gates know about diagrams.** Validate/doctor catch a linked diagram that is missing
  from the tree, and an ADR that links a diagram with no committed export.

Out of scope:
- **Interactive diagram-driven redesign** (the engineer edits the diagram, the architect reconciles
  it into a superseding ADR). It is named in the Objective as the direction of travel. This
  milestone only has to leave the seam open for it: diagram sources are editable, and the
  generator seam has a read-back direction reserved. It is not built here.
- **A second generator** (Mermaid, Excalidraw, draw.io, D2 …). The seam must be able to take one;
  shipping one is later work.
- **Diagrams outside ADRs** (DESIGN.md UI mocks, RESEARCH figures, the ROADMAP). ADRs first.
- **Retrofitting diagrams onto accepted milestones.** Delivered records are immutable. Only new
  ADRs get diagrams.
- **Installing the plugin for the user.** aof names the generator and reports clearly when it is
  absent. It does not install Claude Code plugins.

## Stories

- [x] `01_story_the-seam-is-named-in-config` — `work.diagrams` (absent = off) and its one reader, the layout module, the generator registry and its one adapter, and `aof diagram plan` (ADR-001–004)
- [x] `02_story_export-writes-the-svg-and-the-png` — the adapter SVG, a headless-browser PNG with no Playwright, and `aof diagram export` (ADR-005)
- [x] `03_story_the-gates-know-about-diagrams` — the doctor lane: missing linked file, missing export, wrong-ADR link, orphan (ADR-006)
- [x] `04_story_the-console-shows-it` — DIAGRAMS in the artifact manifest, the doc route forwards a member, and a milestone ARCHITECTURE tab with inline image figures (ADR-007, DESIGN)
- [x] `05_story_the-architect-draws` — the one diagram step in the architect rule and refine Decide, driven by `aof diagram plan` (ADR-008)
- [x] `06_story_the-live-draw` — `@manual`: this repo opts in with a style built from the console tokens, and ADR-002 is drawn through the seam and read in the board (ADR-009)

## Dependencies

- **The `diagram-design` plugin** (v2.6.27; measured at refine: NOT enabled in this repo `.claude/settings.json`, installed project-scoped for another repo only. aof reads the skill by path, ARCHITECTURE ADR-002 §3). It
  writes self-contained HTML with inline SVG. Its `/diagram-design:export-diagram` pulls out the
  first `<svg>` for `.svg` and needs **Playwright** for `.png`. Playwright via `npx` is
  policy-blocked on this machine. The known workaround is driving the cached ms-playwright Chromium
  headless directly. Research must settle how aof's PNG export runs, including in dispatch worktree
  lanes and on the worker nodes.
- **The plugin's `.diagram-design` profile gate.** On first use in a project it pauses to onboard a
  style guide. A driven refine session cannot answer that prompt, so the repo needs a checked-in
  profile/marker (or the seam has to pre-empt the gate).
- **The architect agent and refine's ADR authoring** (`src/bundle/agents/aof-architect.md`, the
  refine skill). This is the prompt surface the diagram step extends, not a sibling of it.
- **The web console's item detail view** (`ui/src/board/DetailPanel.tsx` and the API behind it),
  which today renders the record docs as text.
