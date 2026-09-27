# UI-generation prompt — milestone 46, the ONE terminal control

Paste the block below into a UI/design agent (claude.ai design, Figma AI, or any HTML-artifact tool). It
is grounded in [`../DESIGN.md`](../DESIGN.md) so the output conforms to the binding checklists the
design-conformance gate judges against.

**Export three frames back into this folder, with exactly these names:**

- `s1-board-dock.png`
- `s2-fleet-card-peek.png`
- `s3-fullscreen-overlay.png`

Until each PNG lands, `../DESIGN.md`'s binding checklist for that surface **is** its baseline. Once
committed, the PNG becomes the visual source of truth for its surface and supersedes the checklist
wherever the two differ. **Do not commit a placeholder image** — an absent mock is honest; a stand-in one
is indistinguishable from a real baseline.

---

**You are drawing three views of ONE terminal control inside `aof` — a developer's work-orchestration
web UI (a light-themed app whose terminal panes are deliberately dark).** The same control appears at the
bottom of a work board, inside a fleet assignment card, and full-screen; today two different components
paint it and this milestone merges them into one.

**THIS IS AN EXTRACTION, NOT A REDESIGN. The output must look like what ships today.** Every colour,
type size and glyph below was measured out of the shipping code and is given to you verbatim. **Do not
invent a palette, do not modernise, do not add gradients, shadows, rounded-card flourishes, icons or a
brand accent.** If something looks plain, it is meant to. Your job is to draw the *agreed* version of two
things that already exist — the value is in the two panes finally matching, not in either looking new.

Deliver a **single self-contained HTML file** with inline CSS (no external assets, no web fonts, no JS
required). Render the three surfaces stacked, each labelled, at the fixed widths given. I will screenshot
each surface to its PNG.

## Non-negotiable rules (a violation is a design gap)

- **Colour is never the only signal.** Every connection state renders **its text label, always** — never
  a bare coloured dot, never a label behind a hover, never truncated. The dot's **fill/shape** is the
  second signal, **motion** the third (and only on two states), a **mandatory cause line** the fourth.
  Colour is fifth.
- **`read-only` is a mandatory text label.** Surfaces 2 and 3 are read-only mirrors. The posture is
  carried by an explicit `read-only` pill in the header — **never** by colour, by dimming, or by the
  absence of an input box. It appears on the inline header **and** the full-screen header, and it never
  shrinks, truncates or drops at any width.
- **There is NO input row anywhere, in either posture.** Not a text field, not a send button, not a
  greyed-out one. The terminal takes keystrokes directly. Do not draw a command line at the bottom.
- **A non-live message never overprints the terminal.** When a pane holds output and the stream has ended
  or failed, the message is an **opaque bar in the flow at the bottom of the pane**, and the terminal area
  shrinks by the bar's height. The panel's total height does not change. Only a pane that is **empty by
  definition** (nothing ever painted) may put its message *inside* the terminal area, top-left.
- **The mirror is a fixed 80 columns × 24 rows and is SCALED, never re-wrapped.** See "Geometry" below.
- **Nothing is red unless it genuinely failed.** A pane that cannot resolve its origin is quiet, dashed
  and muted — not an error.
- **Reading order in every header is binding:** identity > `read-only` > state > expand > toggle. No
  control may be visually louder than the stream's own name.

## The shared visual system (all three surfaces draw from this — these are the real values)

**Dark surface colours (exact hexes, from the shipping components):**

| Role | Value |
|---|---|
| Terminal viewport background | `#0b0f14` |
| Chrome — header bars, message bars | `#0f1629` |
| Borders, dividers, pill outlines | `#1e2a44` |
| Inset well behind the provider picker | `#0b1120` |
| Terminal text (the bytes themselves) | `#d7dde3` |

**Chrome text ramp** (the Tailwind `zinc` scale, resolved):

| Use | Colour |
|---|---|
| Body text on the dark panel | `zinc-200` ≈ `#e4e4e7` |
| The `▣ TERMINAL` lockup, resolved values | `zinc-300` ≈ `#d4d4d8` |
| Quiet text, icon controls, muted state words | `zinc-400` ≈ `#a1a1aa` |
| Field labels only (`provider:`, `item`) | `zinc-500` ≈ `#71717a` |
| Hover text only | `zinc-100` ≈ `#f4f4f5` |

**State colours (the app's theme tokens — use these, not near-misses):**

| Token | Value | Used for |
|---|---|---|
| primary (teal) | `hsl(174 72% 27%)` | the live/`streaming` dot and its label |
| secondary | `hsl(214 18% 88%)` | the `connecting…` dot (a pale near-white) |
| muted-foreground | `hsl(218 9% 38%)` | quiet/idle/ended dots and the dashed "absent" ring |
| destructive | `hsl(0 73% 43%)` | failure dots |
| red-400 ≈ `#f87171` | | failure **text** on the dark chrome (the light-on-dark variant) |

**Type:**

- **Chrome words** — the app's UI font (Inter, or your system sans). **Header row, identity line and
  state label: 11px.** Pills: **10px, 600 weight, UPPERCASE, letter-spaced**. Message bars and
  in-pane messages: **12px, monospace**.
- **Monospace** — `ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace` for every id,
  ref, session, path, command and message.
- **The terminal bytes** — `ui-monospace, SFMono-Regular, Menlo, monospace` at **13px**.
- Small radii only (4–8px; the app's radius token is `0.5rem`). Hairline 1px borders. **No shadows on
  the inline surfaces.**

**The state ramp — ONE vocabulary, used identically on all three surfaces.** Each is a small round dot
plus its word, at 11px:

| State | Word shown | Dot | Motion |
|---|---|---|---|
| `idle` | `idle` | filled, muted-foreground | none |
| `connecting` | `connecting…` | filled, secondary (pale) | **gentle pulse** |
| `waiting` | `waiting for output` | filled, muted-foreground | **none — never a spinner** |
| `streaming` | `streaming` | filled, **teal** | **gentle pulse** |
| `ended` | `stream ended`, or `exited (0)`, or `exited (137)` | filled, muted-foreground — **destructive when the exit code is non-zero** | none |
| `error` | `error` | filled, destructive | none |
| `unavailable` | `unavailable` | **hollow, 1px DASHED ring** in muted-foreground, transparent centre | none |

**Motion appears on exactly two states — `connecting` and `streaming` — and nowhere else.**

**Geometry — the one thing that is not obvious and must be drawn correctly.** The remote worker's
terminal is spawned at a **fixed 80 columns × 24 rows** and paints with absolute cursor addressing, so a
mirror is rendered at exactly that size (**≈640 × 408 px** at 13px type) and then **uniformly scaled** to
whatever box it is in — `scale = min(boxWidth / 640, boxHeight / 408)`, **anchored top-left**. Aspect is
preserved and nothing is ever cropped, so **there is leftover empty `#0b0f14` at the right and/or bottom
edge — draw that band; it is correct, not a mistake.** Surface 2 scales the same screen **down** (glyphs
become tiny — you read the *shape* of the session, not its words). Surface 3 scales it **up** to a
readable size. Surface 1's *local* terminal is different: it genuinely reflows to its box, so its glyphs
stay 13px and the column count changes.

**Sample content — use this exact data so the frames read real:**

- work item ref `46/02`, node `aof-wsl`, session `7f3a91c`, provider `claude`, workspace `lark-guard`
- terminal content: a plausible `claude` CLI session — a prompt line, a couple of tool lines, a short
  diff or file list. Realistic, unremarkable, not a hero moment.

---

## SURFACE 1 — the board dock (`s1-board-dock.png`)

A full-width dark dock pinned to the bottom of a light work board. Draw it at **1280px wide**, **280px
tall**, sitting under a hint of the light board above it so the dark/light boundary is visible.
Interactive (an operator types into it). Top border `1px #1e2a44`; background `#0f1629`.

**Regions, top to bottom:**

1. **Drag handle** — a 6px full-width strip on the very top edge, transparent at rest, tinting teal on
   hover. This is the only thing above the header.
2. **Header row**, 16px horizontal / 8px vertical padding, one line, left → right:
   - `▣ TERMINAL` — the glyph then the word, 11px, 600 weight, letter-spaced, `zinc-300`.
   - **Identity** — monospace 11px: the label `item` in `zinc-500` then `46/02` in `zinc-300`.
   - `provider:` in `zinc-500`, then the **provider picker**: an inset well (`#0b1120`, 1px `#1e2a44`
     border, 4px padding) holding one segment, `claude`. The selected segment is a **teal fill with white
     text** and carries a **small white dot** to its left. It is a radio group — exactly one selected,
     never zero, never two.
   - **State chip** — the dot + word from the ramp.
   - Then, pushed to the far right: **↻ restart** (only in the `exited`/`error` frames), **⤢ expand to
     full screen**, **⌄ collapse**, **✕ close**. Each is a quiet 28×28 box, `zinc-400`, with a subtle
     `#1e2a44` hover fill. **No labels, no fills, no colour** — they must read quieter than the identity.
3. **Terminal area** — `#0b0f14`, 8px inset, the terminal text at 13px in `#d7dde3`, **fitted** to the
   box (it fills the width; do not letterbox this one).
4. **Message bar** — only in the non-live frames: full width at the bottom of the terminal area, opaque
   `#0f1629`, 1px `#1e2a44` top border, 12px monospace, 12px/6px padding. **The terminal area shrinks by
   its height; the dock's total height does not change.**

**Draw these six frames of Surface 1** (same dock, stacked, each labelled with its state name):

- **empty** — no session bound: the header shows `idle`, no picker lock, and the terminal area holds one
  centred muted monospace line, *"No session. Press Run agent on an item."*
- **waiting** — connected, nothing printed yet: chip `waiting for output`, terminal area empty, and the
  message sits **top-left inside** the terminal area (not a bar) — this is one of only two places a
  message goes inside the pane.
- **live** — chip `streaming` with the pulsing teal dot; the terminal full of output; **no bar**; the
  provider segment visibly **locked** (dimmed, not removed, with a "stop the session to switch provider"
  tooltip implied).
- **ended** — chip `exited (0)`; the terminal still full but **dimmed to ~60% opacity**; the bottom
  **bar** reads `exited (0)` in muted monospace; the **↻ restart** control has appeared in the header.
- **error** — chip `error` with the destructive dot; terminal dimmed; the bottom **bar** reads, in
  `red-400` monospace, `disconnected — the stream dropped`. **The cause line is mandatory — never a bare
  "error".**
- **unavailable** — chip `unavailable` with the **dashed hollow** dot. **The header still renders in
  full** (an unavailable pane still has an owner and must be identifiable). The terminal area holds a
  **centred dashed-border block** (`#1e2a44`, dashed, rounded, 16px/12px padding) with two lines:
  `not checked out on this machine` in 12px muted monospace, and beneath it the workspace path
  `~/source/lark-guard` in 11px `zinc-500` monospace. **Nothing red. No spinner. Never blank.**

Also draw one small **collapsed** frame: the header row alone, with the collapse chevron flipped to `⌃`
and no terminal area — the session is still alive behind it.

---

## SURFACE 2 — the fleet card peek (`s2-fleet-card-peek.png`)

A dark panel **inside a light fleet card**, showing a *read-only mirror* of another machine's terminal.
Draw the card at **~560px wide** (a light card: white background, 1px light-grey border, rounded, with a
line of card content above — a work item title and an assignment chip — so the panel's context is
visible). The panel sits below that content with a small gap, has a **1px `#1e2a44` border on all four
sides** and rounded corners, and is `#0f1629`.

**Regions, top to bottom:**

1. **Header row**, 12px horizontal / 6px vertical padding, **allowed to wrap to a second line**, left →
   right:
   - `▣ TERMINAL` — 11px, 600, letter-spaced, `zinc-300`.
   - **Identity** — monospace 11px `zinc-400`, truncating: `46/02 → aof-wsl · session 7f3a91c`.
   - **`read-only` pill** — 10px, 600, UPPERCASE, letter-spaced, `zinc-400`, 1px `#1e2a44` border,
     transparent fill, 6px/2px padding. **Mandatory in every frame. Never truncated, never dropped.**
   - **State chip** — dot + word (only when the panel is open).
   - Then, far right: **⤢ expand** (only when open), then the **toggle** — a *worded* button reading
     `Watch terminal →` when closed and `Hide terminal` when open, 11px `zinc-400`, no fill, no border,
     **no weight above the identity line**. It must be the quietest element in the header.
   - **No provider picker. No restart. No close.** There is nothing to pick, restart or kill on another
     machine.
2. **Terminal area** — `#0b0f14`, 8px inset, **192px total for the terminal column**, holding the
   80×24 screen **scaled down** (roughly 0.3–0.45×, glyphs genuinely tiny — that is intended) and
   anchored top-left, with the leftover `#0b0f14` band to its right.
3. **Message bar** — same opaque in-flow bar as Surface 1, paid for out of the terminal area, so the
   panel's total height stays **exactly the same** whether or not a bar is present.

**Draw these six frames of Surface 2** (same card, stacked, each labelled):

- **empty / at rest (this is the default)** — **collapsed**: the header row only, showing `▣ TERMINAL`,
  the identity, the `read-only` pill, and `Watch terminal →`. **No state chip. No terminal area. No
  black box at all.** The posture is legible before anything opens.
- **waiting** — open, chip `waiting for output`, terminal area empty with the message **top-left inside
  it**.
- **live** — chip `streaming`, pulsing teal dot, the scaled-down worker screen fully painted, no bar.
- **ended** — chip `stream ended`; the scaled screen dimmed to ~60%; the bottom bar reads `stream ended`
  in muted monospace; **total panel height unchanged**.
- **error** — chip `error`; dimmed; bar reads `disconnected — the stream dropped` in `red-400`.
- **unavailable** — chip `unavailable`, dashed hollow dot, header intact, and the centred dashed block
  reading `board unreachable` with `aof work ui` beneath it in 11px `zinc-500` monospace.

Also draw the card at **390px wide**, live, to show the header **wrapping to two lines** — with the
`read-only` pill and the state chip **both still present and whole**. What may be given up at that width,
in this order: the `· session 7f3a91c` tail (dropped whole, with its separator), then the word `TERMINAL`
(the `▣` glyph stays), then the header wraps.

---

## SURFACE 3 — the full-screen overlay (`s3-fullscreen-overlay.png`)

The same mirror, expanded to cover the whole window. Draw it at **1280 × 800**, edge to edge, with **no
app chrome behind it** — going full screen hides the app's bars entirely rather than dimming them.
Background `#0b0f14`.

**Regions, top to bottom:**

1. **Header row** — `#0f1629`, 1px `#1e2a44` bottom border, 16px/8px padding. It carries the **exact same
   identity block as Surface 2, verbatim**: `▣ TERMINAL` · `46/02 → aof-wsl · session 7f3a91c` ·
   **`read-only` pill** · state chip. Then, at the far right, a single **⊟ exit full screen** control,
   quiet, 28×28 — **always visible** (never hover-revealed, never fading).
2. **Terminal area** — the same 80×24 screen **scaled UP** to a comfortable reading size, anchored
   top-left, with **empty `#0b0f14` at the right edge** (roughly 250–300px at this width) and/or the
   bottom. **Draw that band.** Aspect is preserved and nothing is cropped — the band is the price of not
   garbling the far end's layout.
3. **Message bar** — in the non-live frame, the same opaque in-flow bar at the bottom of the terminal
   area.

**Draw two frames of Surface 3:**

- **live** — chip `streaming`, the worker's session readable at last, no bar.
- **ended** — chip `stream ended`, the screen dimmed to ~60%, the in-flow bar at the bottom.

---

## Deliverable

A single self-contained **HTML file** (inline CSS, no external assets) laying out, in this order and each
clearly labelled:

1. **Surface 1** — six state frames at 1280 wide plus the small collapsed frame;
2. **Surface 2** — six state frames in the 560px card, plus the 390px wrapped frame;
3. **Surface 3** — two frames at 1280 × 800.

I will screenshot **Surface 1 (live)** → `s1-board-dock.png`, **Surface 2 (live)** →
`s2-fleet-card-peek.png`, and **Surface 3 (live)** → `s3-fullscreen-overlay.png`.

Keep every frame faithful to the values and rules above — it will be judged **region by region** against
`../DESIGN.md`'s binding checklists, and the three things a reviewer will check first are: **every state
shows its word**, **`read-only` is present on both mirror headers**, and **the ended/error message is an
opaque in-flow bar that covers no output**.
