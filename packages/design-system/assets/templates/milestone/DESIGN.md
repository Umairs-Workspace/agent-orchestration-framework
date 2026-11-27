---
doc: design
---
<!--
  Milestone DESIGN.md — answers ONE question: how should it look and feel, and why?
  Owner: designer. Conditional (only if there is UI). Shared by the milestone's stories.
  Does NOT contain: UI BEHAVIOUR (→ task .feature). "The form offers Telnyx" is a behavioural
  outcome (a scenario); "the picker is a radio group laid out thus" is design.
  Prefer a visual artifact (a committed mock) to prose — markdown is poor at visual design.
-->
# NN · <Milestone Title> — Design

## Intent

<!-- What experience are we creating? Who is the user, and what are they trying to do? -->

## Conformance source of truth

<!--
  The design-conformance review (aof:continue Review / aof:verify) renders each surface and judges it
  against this baseline. The baseline is ONE of two things, in priority order:

  1. A COMMITTED MOCK — the conformance source of truth, when one exists. A mock MUST be a
     locally-readable, committed artifact (an image / a local HTML file) that the read-only designer
     can `Read`. It lives under this milestone's `mocks/` directory
     (e.g. `wiki/work/NN_milestone_<slug>/mocks/<surface>.png`) and is REFERENCED from each surface
     below as that surface's source of truth. Do NOT reference a remote design-tool link (Figma,
     claude.ai/design, etc.) as the SOLE mock reference — the read-only designer cannot open it, so a
     remote-link-only mock is not a usable baseline. If you only have a remote design, EXPORT it into
     `mocks/` and commit that file.

  2. THE BINDING CHECKLIST — mandatory always. When NO committed mock exists, the binding checklist IS
     the source of truth (it is the baseline the review judges against). When a mock DOES exist, the
     mock stays the visual source of truth and the checklist is the region-by-region rubric that makes
     the mock checkable. Either way the checklist below is mandatory per surface.

  A surface with NEITHER a committed mock NOR a binding checklist has no baseline — its review is
  INCONCLUSIVE (the missing baseline becomes the named gap). So: commit a mock, or fill the checklist
  (or both).
-->

- **Mocks directory:** `mocks/` (committed under this milestone) — the conformance source of truth for
  any surface that has a mock. Each mock is a locally-readable, committed artifact (image / local HTML);
  never a remote design-tool link as the sole reference.
- **No-mock rule:** when no committed mock exists for a surface, that surface's **binding checklist is
  mandatory and is the source of truth**.

## Render breakpoints

<!-- The conformance render is taken at these breakpoints. Default below; override here per milestone. -->

- **Default breakpoints:** 390 (mobile) / 768 (tablet) / 1280 (desktop). Override per milestone here if
  this UI's responsive design demands different widths.

## Screens / surfaces

### <surface name>

- **Route:** `<the path the surface renders at, appended to the base URL for the conformance render>`
- **Committed mock:** `mocks/<surface>.png` — the conformance source of truth for this surface (a
  locally-readable, committed artifact). Leave blank only if no mock exists; the binding checklist below
  is then the mandatory source of truth.
- **Layout & interaction:** <intent — not pixel specs>
- **Component choices:** <what, and WHY (the rationale is the part worth writing down)>

#### Binding checklist (mandatory)

<!--
  The mandatory binding checklist for this surface. With a mock, it is the region-by-region rubric that
  makes the mock checkable; with no mock, it IS the baseline the conformance review judges against.
  Enumerate, in order:
-->

- **Layout regions (in order):** <region 1, region 2, … — top-to-bottom / reading order>
- **The components each region holds:** <region → the components it contains>
- **The states (empty / loading / error / populated):** <how each region/component looks in each state>
- **The design ramp each uses:** <the spacing / type / colour ramp each region or component draws from>

## Design-system changes

<!--
  "owned" mode (work.ui.designSystem): the code is the system's source of truth (198/ADR-007). Name
  every design-system change this milestone ships, one line each:
  - a token, with its new value: `color-primary` → `hsl(174 72% 27%)`;
  - a component, with what changed: `scope segment` — gains a disabled state.
  Or write `None.` At the milestone's accept, verify re-syncs the system from the code and
  republishes each component named here from this milestone's committed mocks.
-->

None.

## Design-system gaps

<!--
  "reference" mode (work.ui.designSystem): the system is someone else's and is never written to
  (198/ADR-007). Name each thing a surface needs that the system lacks, one line each, for the
  system's owner: `a warning colour` — the filter's error chip. The mock draws the gap with the
  system's existing tokens. Refine's hand-back lists every gap named here.
-->

None.

## Behavioural outcomes (cross-reference)

<!-- The user-visible BEHAVIOUR is specified as task scenarios, not here. Link to them. -->

- <behaviour> — see the story's `tasks/<slug>.feature`
