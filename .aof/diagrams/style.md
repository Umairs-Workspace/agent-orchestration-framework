# Style Guide — aof console

**The single source of truth for this repository's diagram colours, type and tokens** (milestone 133,
ADR-009). It is a complete style guide in the structure of the diagram skill's own
`references/style-guide.md`, and `aof diagram plan` hands its path to the drawing agent as the
effective style, which pre-empts the skill's onboarding step. Every value traces to the web
console's design tokens in `ui/src/index.css` (the `@theme` block), so a diagram reads as part of
the console it is shown in.

---

## Tokens

### Semantic roles

Refer to a token by **semantic role**, never by its hex value.

| Role | Purpose | Light | Dark | Console token (light) |
|---|---|---|---|---|
| `paper` | Page background, default node fill | `#f3f5f7` | `#1b1f27` | `--color-background` `hsl(210 18% 96%)` |
| `paper-2` | Diagram container bg, secondary fill | `#e4e7ec` | `#262b35` | `--color-muted` `hsl(215 18% 91%)` |
| `ink` | Primary text, primary stroke | `#1b1f27` | `#f3f5f7` | `--color-foreground` `hsl(220 18% 13%)` |
| `muted` | Secondary text, default arrow stroke | `#585f6a` | `#aab1bc` | `--color-muted-foreground` `hsl(218 9% 38%)` |
| `soft` | Sublabels, boundary labels | `#7a818d` | `#8b929e` | derived: `muted` lightened to `hsl(218 9% 52%)` |
| `rule` | Hairline borders | `rgba(27,31,39,0.12)` | `rgba(243,245,247,0.12)` | derived: `ink` at 0.12 |
| `rule-solid` | Stronger borders, baselines | `#bec6d0` | `rgba(190,198,208,0.25)` | `--color-border` `hsl(214 16% 78%)` |
| `accent` | Focal — 1–2 max per diagram | `#ba2646` | `#d8486a` | `--color-accent` `hsl(347 66% 44%)` (crimson) |
| `accent-tint` | Fill for accent-bordered boxes | `rgba(186,38,70,0.08)` | `rgba(216,72,106,0.10)` | derived: `accent` at 0.08 |
| `link` | Structural accent: HTTP/API calls, command and data flows | `#13766d` | `#3fa89c` | `--color-primary` `hsl(174 72% 27%)` (teal) |

> **Two hues, two jobs.** Crimson is the console's accent and is the diagram's FOCAL role — the one
> thing the reader should look at first. Teal is the console's primary and is the diagram's
> STRUCTURAL accent — the flows that carry the design. Nothing else takes a hue. The console never
> puts a `primary` tint on a figure frame (DESIGN), so the diagram's own focal colour is the only
> emphasis on the page.

### Inversion rule (light → dark)

Any `rgba(27,31,39, X)` in light becomes `rgba(243,245,247, X)` in dark: the same opacities, with
`ink` and `paper` swapped. The accent and link shift slightly brighter to read on dark paper, as the
table above gives.

### Series palette (multi-series chart types only)

Unchanged from the skill's shipped guide (sage, dusty-blue, mustard, rust-brown, slate). Architecture
views never use it.

---

## Typography

The console's own stacks for names and technical text. The serif is kept for the title and editorial
callouts only, because the skill requires three families and the contrast is load-bearing; the
console itself has no serif, and a diagram rarely carries a title inside its SVG.

| Role | Family | Size | Weight | Usage |
|---|---|---|---|---|
| `title` | Instrument Serif | 1.75rem | 400 | Page H1 (outside the exported SVG) |
| `node-name` | Inter (the console's sans) | 12px | 600 | Human-readable labels |
| `sublabel` | the console's mono stack | 9px | 400 | Command, path, flag, field |
| `eyebrow` | the console's mono stack | 8px | 500, tracked 0.18em, uppercase | Type tags, region labels |
| `arrow-label` | the console's mono stack | 8px | 400, tracked 0.06em | Arrow annotations |
| `callout` | Instrument Serif *italic* | 14px | 400 | Editorial asides only |

### Font stack

```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

- Sans (names): `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` — the console's body stack.
- Mono (technical): `ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace` — the console's mono stack. It is a system stack and needs no web font.

**Load-bearing rule:** mono is for technical content (commands, paths, flags, config keys). Names go
in the sans. **Width budget:** 0.60em per character for the sans and 0.62em for the mono, as in the
shipped guide.

---

## Stroke, radius, spacing

| Token | Value | Use |
|---|---|---|
| `stroke-thin` | `0.8` | Tag-box outlines, leaf nodes |
| `stroke-default` | `1` | Most strokes |
| `stroke-strong` | `1.2` | Emphasis strokes |
| `radius-sm` | `4` | Small tags |
| `radius-md` | `8` | Node boxes — the console's `--radius` `0.5rem` |
| `radius-lg` | `8` | Containers — the same radius, so boxes and containers read as one family |
| `grid` | `4` | Every coordinate, size and gap is divisible by 4 (hard rule) |

---

## Node type → treatment

| Type | Fill | Stroke |
|---|---|---|
| `focal` (1–2 max) | `accent-tint` | `accent` |
| `backend` | `#ffffff` (the console's `--color-card`) | `ink` |
| `store` | `ink @ 0.05` | `muted` |
| `external` | `ink @ 0.03` | `ink @ 0.30` |
| `input` | `muted @ 0.10` | `soft` |
| `optional` | `ink @ 0.02` | `ink @ 0.20` dashed `4,3` |
| `security` | `accent @ 0.05` | `accent @ 0.50` dashed `4,4` |

---

## Constraints (don't break these)

- **Contrast**: `ink` on `paper` and `muted` on `paper` both clear WCAG AA (the console's own pairs).
- **One accent**: crimson is the only focal colour. Teal is structure, never a second focus.
- **No rainbow palette**: paper, ink, accent and link. Everything else is a `muted` variant.
- **Paper is the console's background**, a cool light grey, not pure white. Node fills may use white
  (the console's card surface), exactly as the console puts white cards on its grey page.
- **No dot pattern and no container chrome** by default: the diagram sits in the console's own card
  frame, which already draws a hairline border.
