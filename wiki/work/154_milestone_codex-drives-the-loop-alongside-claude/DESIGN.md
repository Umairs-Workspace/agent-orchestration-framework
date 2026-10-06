---
doc: design
---
# 154 · Runtime configuration design

## Intent

Let an operator choose the assistant and understand which settings a new run will use without
confusing asset installation, native subagents and optional cross-assistant delegation.

## Conformance source of truth

No mock supplied at refine. The existing AOF configuration editor styling and the following
binding checklist are the baseline; do not redesign the application shell. The operator was offered
the opportunity to supply a different direction during autonomous refinement.

## Render breakpoints

390 / 768 / 1280 CSS pixels. Follow existing responsive form layout and design tokens.

## Screens / surfaces

### Project execution settings

- **Route:** `/config`, project scope, settings section.
- **Committed mock:** none; binding checklist applies.
- **Layout & interaction:** a grouped execution panel within the existing settings editor. Runtime
  choice leads, then phase settings, role settings and the resolved preview. Save follows existing
  editor conventions; generated asset locations are explanatory secondary text.
- **Component choices:** labelled select for Claude/Codex; existing text/select field patterns for
  model and effort; compact provenance rows for resolved values; inline field errors and existing
  status treatment. Preserve keyboard operation and visible focus.

#### Binding checklist

- **Layout regions in order:** existing shell and section navigation; project execution heading;
  default assistant; phase models/effort; optional role overrides; resolved preview; save/result.
- **Components:** default assistant select; one labelled row per refine/continue/verify phase;
  expandable role overrides; read-only value/source pairs; existing save and error controls.
- **States:** absent configuration shows inherited/default values without marking them as explicit;
  loading uses the current editor treatment; invalid input stays visible with field-level errors;
  saved state confirms persistence and explains that apply/launch remains a CLI action. A failed
  request retains entered values. Global scope explains that project execution settings are local.
- **Design ramp:** use current spacing, type, border, focus and semantic error/success tokens. Mobile
  rows stack; labels and long model ids wrap without obscuring controls or causing page overflow.
- **Separation:** asset targets remain in their existing controls. Delegation does not change the
  primary assistant. Runtime profile/schema details appear only when useful to diagnose a refusal.

## Behavioural outcomes

See story 10's tasks for persistence, validation, provenance, keyboard access and config-only effects.
