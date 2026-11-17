---
type: milestone
number: 198
slug: design-system
title: "The designer draws a milestone's mocks on the project's design system, and a project can extract that system from the Claude Design mocks it already has"
status: in-progress
owner: product-owner
created: 2026-11-16
updated: 2026-11-17
schema: 1
aofVersion: 0.1.0
depends: [192]
---
# 198 · The designer draws a milestone's mocks on the project's design system, and a project can extract that system from the Claude Design mocks it already has

## Objective

The design-conformance loop (milestone 07) judges a built surface against a committed mock under the
milestone's `mocks/`, but nothing in the workflow makes that mock. The operator does it by hand,
every time:
1. write `PROMPT.md`;
2. draw it in Claude Design;
3. import the `.dc.html`;
4. expand its template syntax into a self-contained page;
5. capture the frames with headless Chromium;
6. write the README that records where they came from.

Milestones 25, 36, 46, 47, 49 and 172 all did this. Each mock also reinvents the product's look,
because no design system exists for the designer to build on. AOF's tokens live only in the
`@theme` block of `apps/ui/src/index.css`. Its look lives in the page-by-page mocks of the `AOF`
Claude Design project, which is a project, not a design system. Standalone Claude Design closes on
2026-12-14, so the hand-run route ends with it.

After this milestone, a Claude project names its design system in config. At refine, the designer
draws the milestone's mocks as Claude Design artifacts on that system. The operator reviews them at
their link, and the approved frames are committed under `mocks/` as the same offline baseline the
fidelity judge reads today. A project that has no design system can extract one, in one command,
from the Claude Design mocks and code tokens it already has. A system the project owns is kept true
to its code. A system someone else owns is only read.

An outsider can verify the result:
- Run the extract command in this repository: a Design System artifact holds AOF's tokens and
  components, and `.aof/aof.config.json` names it.
- Refine a UI milestone: its mocks arrive as an artifact link drawn in that system, and once
  approved they are committed under `mocks/` with their provenance.
- Render the bundle with the key off, or for Codex or opencode: the commands hold none of this prose.

## Scope

In scope:
- **The config.** `work.ui.designSystem`: `enabled` (the boolean that turns the practice on, per
  192/ADR-003), `artifact` (the Design System artifact's URL), `mode` (`owned` or `reference`) and
  `source` (the code files that hold the tokens, for `owned`).
- **A Claude-only practice, delivered through 192's mechanism.**
  - Its prose is fragments in slots of the designer brief, `refine` and `verify`. Slots are added
    where a target has none, `verify` included, which 192 left out of scope.
  - Fragments gain a per-runtime filter, so Claude-only prose can fill a shared slot. Today the
    composer requires a body for every runtime whose text carries the slot, and a common body also
    reaches opencode.
- **The extract command** (`aof:design-system extract`, Claude only, always installed: it is what
  sets the key). It reads the Claude Design project's page mocks and the project's code tokens,
  infers the system from them (tokens, type, spacing, radius, the components the mocks repeat),
  publishes it as a Design System artifact, and writes `work.ui.designSystem`. The operator reviews
  the inferred system before the config is written.
- **Mock authoring at refine.** The designer draws the milestone's mocks as a Design artifact on
  the configured system, and the operator's review drives revisions. The approved artifact is then
  pulled back, expanded into a self-contained page and captured into frames, and committed under
  `mocks/` with a README recording the artifact URL and version. The fidelity judge (07) is
  unchanged: it still reads only local files.
- **The two modes.**
  - `reference`: the designer reads the system and never writes to it. A milestone that needs
    something the system lacks raises it as a finding for the system's owner.
  - `owned`: the code is the source of truth. `DESIGN.md` records a milestone's design-system
    changes, `aof:verify` republishes the artifact from code on accept, and a check fails when the
    artifact's tokens drift from `source`. Sync runs from code to artifact only.
- **The adoption path.** The practice appears in 192's practice list with its key, and refining a
  UI milestone in a Claude project with no design system says so and names the extract command.

Out of scope:
- **Codex and opencode.** They have no Artifact tool. They keep today's route (the designer writes
  `PROMPT.md` for the operator) and render none of this prose.
- **Syncing a design system into a local component library.** That is what Claude Code's own
  `/design-sync` and its `DesignSync` tool are for. It is tied to standalone Claude Design, which is
  closing.
- **Changing the fidelity judge, or the QA-owned screenshot regression.** 07's role split stands:
  the designer authors and judges, and QA and the orchestration render.
- **Backfilling the archived milestones' mocks into the new system.** They stay as they are.

## Stories

Four stories in three waves (ARCHITECTURE ADR-008): 00 and 01, then 02, then 03.

- [ ] `00_story_a-fragment-can-be-for-claude-only`: a fragment names the runtimes it is for, and any other runtime's render holds none of it.
- [ ] `01_story_a-project-extracts-its-design-system-and-names-it`: the `@aof/design-system` package, the `work.ui.designSystem` key, the token verbs, and `aof:design-system extract` building the system from code tokens and exported mocks.
- [ ] `02_story_mocks-are-drawn-on-the-system-and-committed-as-the-baseline`: refine draws a canvas on the system; once the operator approves it, it is imported into `mocks/` with its runtime, frames and provenance.
- [ ] `03_story_an-owned-system-stays-true-to-its-code`: accepting a milestone re-syncs an owned system from code, and drift that survives the re-sync is a finding.

## Dependencies

- `192_milestone_buildable-commands` (done): practices, slots, fragments and the practice list.
  This milestone is a consumer of that mechanism and extends it with a per-runtime fragment filter.
- `07_milestone_design-conformance` (done, archived): the committed-mock convention and the
  read-only fidelity judge, whose baseline this milestone produces.
- The `AOF` Claude Design project's page mocks are an external input available only until
  standalone Claude Design closes on 2026-12-14. Extracting AOF's own system before then is
  time-critical, independent of when the rest is built.
