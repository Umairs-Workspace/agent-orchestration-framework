# UI-generation prompt — milestone 49, the terminals home

Paste the block below into a UI/design agent (claude.ai design, Figma AI, or any HTML-artifact tool).
It is grounded in [`../DESIGN.md`](../DESIGN.md) so the output conforms to the binding checklists the
design-conformance gate judges against.

**Export three frames back into this folder, with exactly these names:**

- `s1-terminals-home.png`
- `s2-grid-pane.png`
- `s3-expanded-pane.png`

Until each PNG lands, `../DESIGN.md`'s binding checklist for that surface **is** its baseline. Once
committed, the PNG becomes the visual source of truth for its surface and supersedes the checklist
wherever the two differ (and `../DESIGN.md` is amended in the same change). **Do not commit a
placeholder image** — an absent mock is honest; a stand-in one is indistinguishable from a real
baseline.

**One thing this prompt inherits rather than restates.** The terminal panel itself — its header
lockup, identity line, `read-only` pill, state chip, byte area and message bar — was drawn and
committed in milestone 46
([`../../46_milestone_terminal-control-unification/mocks/Terminal Panel Spec.dc.html`](../../46_milestone_terminal-control-unification/mocks/Terminal%20Panel%20Spec.dc.html)).
**Reproduce it; do not redesign it.** Every value below was read out of that mock or out of the
shipping code and is given verbatim.

---

**You are drawing the home screen of `aof` — a developer's work-orchestration web UI (a light-themed
app whose terminal panes are deliberately dark).** The screen is a **responsive grid of live terminal
panes**, one per agent session running anywhere on the operator's fleet of machines. It answers one
question at a glance: *what is every machine doing right now, and let me get into it.*

**THIS IS AN EXISTING CONTROL IN A NEW ARRANGEMENT, NOT A NEW LOOK. Do not invent a palette, do not
modernise, do not add gradients, shadows, glows, rounded-card flourishes, icons or a brand accent.**
If something looks plain, it is meant to. The value is in twelve panes being scannable at once, not in
any one of them looking new.

Deliver a **single self-contained HTML file** with inline CSS (no external assets, no web fonts, no JS
required). Render the three surfaces stacked, each labelled, at the fixed widths given. I will
screenshot each surface to its PNG.

## Non-negotiable rules (a violation is a design gap)

- **Colour is never the only signal.** Every connection state renders **its text label, always** —
  never a bare coloured dot, never a label behind a hover, never truncated. The dot's **fill/shape** is
  the second signal, **motion** the third (and only on two states), a **mandatory cause line** the
  fourth. Colour is fifth.
- **Motion appears on exactly two states — `connecting` and `streaming` — and NOWHERE ELSE.** Not on
  the `needs input` mark, not on tiles arriving, not on the grid. A dozen pulsing things is the problem
  this rule exists to prevent.
- **There is NO input row anywhere.** Not a text field, not a send button, not a greyed-out one. The
  terminal takes keystrokes directly. Do not draw a command line at the bottom of anything.
- **A non-live message never overprints the terminal.** When a pane holds output and the stream has
  ended or failed, the message is an **opaque bar in the flow at the bottom of the pane**, and the
  terminal area shrinks by the bar's height. **The tile's total height does not change.** Only a pane
  that is **empty by definition** (nothing ever painted) may put its message *inside* the terminal
  area, top-left.
- **The mirror is a fixed 80 columns × 24 rows and is SCALED, never re-wrapped.** See "Geometry".
- **Nothing is red unless it genuinely failed.** A pane that is not streaming because the grid is at
  its live limit is calm and quiet, not an error. A pane nothing is feeding is calm and quiet, not an
  error.
- **Reading order in every tile header is binding:** identity > `read-only` > `needs input` > state >
  repo > expand > toggle. No control may be visually louder than the stream's own name.
- **Empty is ordinary.** This grid is very often empty while agents are genuinely working. The empty
  state is a first-class frame in this mock, not an afterthought — draw it as carefully as the
  populated one.

## The shared visual system (these are the real values)

**Dark surface colours (exact hexes, from the shipping components):**

| Role | Value |
|---|---|
| Terminal viewport background | `#0b0f14` |
| Chrome — tile headers, message bars | `#0f1629` |
| Borders, dividers, pill outlines | `#1e2a44` |
| Terminal text (the bytes themselves) | `#d7dde3` |

**The page around the tiles is LIGHT** (this is not a dark app): page background `hsl(210 18% 96%)`,
text `hsl(220 18% 13%)`, cards white, borders `hsl(214 16% 78%)`, muted text `hsl(218 9% 38%)`, the
teal accent `hsl(174 72% 27%)`.

**Chrome text ramp inside a tile** (the Tailwind `zinc` scale, resolved):

| Use | Colour |
|---|---|
| Body text on the dark panel | `zinc-200` ≈ `#e4e4e7` |
| The `▣` lockup, resolved values | `zinc-300` ≈ `#d4d4d8` |
| Quiet text, icon controls, muted state words, **every message line** | `zinc-400` ≈ `#a1a1aa` |
| Field labels only (the repo on the status row) | `zinc-500` ≈ `#71717a` |

**State colours (the app's theme tokens — use these, not near-misses):**

| Token | Value | Used for |
|---|---|---|
| primary (teal) | `hsl(174 72% 27%)` | the live/`streaming` **dot** |
| **the `streaming` WORD** | **`hsl(174 58% 52%)`** ≈ `#3ECCBD` | the word only — a measured contrast fix; the dot stays darker |
| secondary | `hsl(214 18% 88%)` | the `connecting…` dot (a pale near-white) |
| muted-foreground | `hsl(218 9% 38%)` | quiet/idle/ended dots |
| destructive | `hsl(0 73% 43%)` | failure dots |
| red-400 ≈ `#f87171` | | failure **text** on the dark chrome |

**Type:**

- **Chrome words** — the app's UI font (Inter, or your system sans). **Tile header rows, identity line
  and state label: 11px.** Pills: **10px, 600 weight, UPPERCASE, letter-spaced `0.08em`**. Message
  lines: **12px, monospace**.
- **Monospace** — `ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace` for every id,
  ref, repo, session and message.
- **The terminal bytes** — `ui-monospace, SFMono-Regular, Menlo, monospace` at **13px / 17px line
  height**, so one cell is exactly 8×17px and the 80×24 screen is exactly **640×408px**.
- Small radii only (4–8px). Hairline 1px borders. **No shadows.**

**The state ramp — ONE vocabulary, used identically everywhere.** A small round **7px** dot plus its
word, at 11px:

| State | Word shown | Dot | Motion |
|---|---|---|---|
| `connecting` | `connecting…` | filled, secondary (pale) | **gentle pulse** |
| `waiting` | `waiting for output` | filled, muted-foreground | **none — never a spinner** |
| `streaming` | `streaming` | filled, **teal** (word in the lighter teal) | **gentle pulse** |
| `ended` | `stream ended`, or `exited (0)` | filled, muted-foreground | none |
| `error` | `error` | filled, destructive | none |
| **`no live output`** | `no live output` | filled, muted-foreground | **none** |

**Geometry — the one thing that is not obvious and must be drawn correctly.** The remote worker's
terminal is spawned at a **fixed 80 columns × 24 rows** and paints with absolute cursor addressing, so
a pane is rendered at exactly **640 × 408 px** and then **uniformly scaled** to whatever box it is in —
`scale = min(boxWidth / 640, boxHeight / 408)`, **anchored top-left**. Aspect is preserved and nothing
is ever cropped. **In a grid tile the box is deliberately shaped 640:408, so there is NO leftover
band** — that is the point. **In the full-screen frame the box is the window's shape, so there IS
leftover empty `#0b0f14` at the right edge — draw that band; it is correct, not a mistake.**

**At tile size the glyphs are genuinely tiny (about 7px tall) and that is intended.** You read the
*shape* of a session — a prompt block, a diff, a spinner region, whether it is moving — not its words.
The place you read words is the full-screen frame.

**Sample content — use this exact data so the frames read real:**

- Nodes: `win-host-a`, `aof-wsl`, `umamis-mac-mini`.
- Repos: `aof`, `lark-guard`, `demo`.
- Work item refs: `49/02`, `47/01`. Sessions: `7f3a91c`, `b21d40e`, `c9e5177`, `1a4be82`.
- Terminal content: a plausible `claude` CLI session — a prompt line, a couple of tool lines, a short
  diff or file list. Realistic, unremarkable, not a hero moment.

---

## SURFACE 1 — the terminals home (`s1-terminals-home.png`)

The whole page at **1280 × 800**. A light app shell across the top — a 48px top bar with a small
wordmark `aof` on the left, a few nav links (`Terminals`, `Fleet`, `Config`) and, on the right of that
bar, a single muted 11px summary line reading **`7 sessions · 5 live · 1 needs input`**. Below it,
edge to edge, the grid.

**The grid:** CSS `repeat(auto-fill, minmax(320px, 1fr))` with a **16px gap**, inside a container with
32px side padding capped at 1240px wide. **At 1280 that gives exactly 3 columns of ≈394px.** The page
itself does not scroll; the grid does.

**Draw the populated frame with 6 tiles**, showing this mix (each tile is Surface 2 — draw them to
Surface 2's spec):

1. `streaming`, with a work item — identity `49/02 → aof-wsl`, repo `aof`;
2. `streaming`, free session — identity `lark-guard → win-host-a` (no repo repeated on the status row);
3. **`needs input`** + `streaming` — identity `47/01 → umamis-mac-mini`, repo `demo`;
4. `waiting` — the message top-left inside the pane;
5. **`no live output`** — a free session nothing is feeding;
6. **held** — not streaming, with `Watch terminal →` in its header.

**Then draw two more full-page frames, each labelled:**

- **EMPTY (E2) — the one an operator most often sees first.** No grid at all. One centred card:
  `rounded, 1px DASHED border in hsl(214 16% 78%), near-white fill, 24px padding`, holding, in muted
  text: **`3 runs in flight · no session is reporting a terminal.`** then, smaller,
  **`A session appears here only when its workspace reports one. The bundle wires session hooks for
  Codex; a Claude Code session is reported only where those hooks are configured.`** then a single teal
  link **`Open the fleet →`**. **Nothing red. No spinner. No skeleton.**
- **EMPTY (E1) — nothing anywhere.** The same card, reading **`Nothing is running.`** /
  **`Assign work from the fleet.`** / **`Open the fleet →`**.

Also draw one **narrow** frame at **390px wide**, populated, showing the grid at **one column** with
the tile header still on **two rows** and nothing overprinted.

---

## SURFACE 2 — the grid pane (`s2-grid-pane.png`)

One tile, drawn large enough to inspect: **394px wide** (the 1280 grid's track). Dark panel,
`#0f1629`, 1px `#1e2a44` border, rounded, on the light page.

**Regions, top to bottom — the header is EXACTLY TWO ROWS and never wraps or merges:**

1. **Identity row** — 12px horizontal / 6px vertical padding, left → right:
   - **`▣`** — the glyph only (the word `TERMINAL` is dropped at this width), `zinc-300`.
   - **Identity** — monospace 11px `zinc-400`, truncating with an ellipsis if it must:
     `49/02 → aof-wsl`. (For a free session the owner is the repo: `lark-guard → win-host-a`.)
   - **`read-only` pill** — 10px, 600, UPPERCASE, letter-spaced, `zinc-400`, 1px `#1e2a44` border,
     transparent fill — **only on the one frame that needs it** (see the frame list).
   - **`needs input` pill** — the **same pill form**, same size, same border, same colour — only on the
     frame that has it. **It never pulses and it has no colour of its own.**
   - **No controls in this row.**
2. **Status row** — same horizontal padding, left → right:
   - **State chip** — the 7px dot + its word at 11px. **Absent entirely on the held frame.**
   - **`·`** then the **repo** in monospace 11px `zinc-500` — only when the repo is not already the
     identity's owner.
   - Then pushed to the far right: **⤢ expand** (a quiet 28×28 box, `zinc-400`, subtle `#1e2a44` hover
     fill), then the **worded toggle** — `Hide terminal` when live, `Watch terminal →` when held —
     11px `zinc-400`, no fill, no border. **It must be the quietest thing in the tile.**
   - **No provider picker. No restart. No `✕` close.** There is nothing to pick, restart or kill on
     another machine.
3. **Terminal area** — `#0b0f14`, an 8px gutter on the sides and bottom, 4px radius, and **shaped
   640:408** (at 394px wide the box is ≈376 × 240). The 80×24 screen is scaled to fit it exactly, so
   **there is no letterbox band in a tile.** Glyphs land around 7px tall — tiny, and correct.
4. **Message bar** — only in the non-live frames: full width at the bottom of the terminal area,
   opaque `#0f1629`, 1px `#1e2a44` top border, 12px monospace, 12px/6px padding. **The terminal area
   shrinks by its height; the TILE's total height does not change.**

**Draw these eight frames of Surface 2** (same tile, stacked, each labelled with its state):

- **streaming** — chip `streaming` with the pulsing teal dot and the lighter-teal word; the pane full
  of output; no bar; `Hide terminal` in the header.
- **needs input** — the same, plus the **`needs input`** pill on the identity row. One chip, one pill,
  neither shouting over the other.
- **waiting** — chip `waiting for output`, **no motion**, the pane empty with the message
  **`connected · waiting for first output`** **top-left inside** the pane.
- **connecting** — chip `connecting…` with the pale pulsing dot, the pane empty, **no message line**.
- **ended** — chip `exited (0)`; the pane still full but **dimmed to ~60% opacity**; the bottom bar
  reads `exited (0)` in muted monospace. **Tile height identical to the streaming frame.**
- **error** — chip `error` with the destructive dot; pane dimmed; the bar reads, in `red-400`
  monospace, **`disconnected — the stream dropped`**. **The cause line is mandatory — never a bare
  "error".**
- **no live output** — chip **`no live output`**, no motion, the pane empty with the message
  **`no live output — no assignment is relaying this session`** **top-left inside** it. Calm, muted,
  **nothing red**.
- **held (at the live limit)** — **NO state chip at all**; the pane holds one **centred** muted
  monospace line **`not streaming — 12 live panes already · hide one to watch this`**; and **the worded
  toggle is ABSENT from the header** (there is no slot to spend). Draw a second small variant labelled
  *held (slot free)*: the same tile, the centred line reading just **`not streaming`**, and
  `Watch terminal →` back in the header.

Also draw one **read-only** variant of the streaming frame, at the same width, carrying the
**`read-only` pill** — this is the fallback for a session the fleet cannot deliver keystrokes to, and
the pill is the only thing that says so.

Also draw the tile at the **320px floor track**, in `waiting` and `streaming` (the two widest headers),
to show both header rows still intact with nothing overlapping.

---

## SURFACE 3 — the expanded pane (`s3-expanded-pane.png`)

The same session, expanded to cover the whole window. Draw it at **1280 × 800**, edge to edge, with
**no app chrome behind it** — expanding hides the app's bars entirely rather than dimming them.
Background `#0b0f14`.

**Regions, top to bottom:**

1. **Header row** — `#0f1629`, 1px `#1e2a44` bottom border, 16px/8px padding. It carries the **same
   identity block as the tile**: `▣ TERMINAL` (the word is back at this width) · `49/02 → aof-wsl ·
   session 7f3a91c` · the state chip. Then, at the far right, a single **⊟ exit full screen** control,
   quiet, 28×28 — **always visible** (never hover-revealed, never fading), because this pane is
   typeable and `Esc` belongs to the program on the far end.
2. **Terminal area** — the same 80×24 screen **scaled UP** to a comfortable reading size, anchored
   top-left, with **empty `#0b0f14` at the right edge** and/or the bottom. **Draw that band.** Aspect
   is preserved and nothing is cropped.
3. **Message bar** — in the non-live frame, the same opaque in-flow bar at the bottom of the terminal
   area.

**Draw two frames of Surface 3:**

- **live, focused for typing** — chip `streaming`, the worker's session readable at last, no bar, and a
  **visible focus ring** (a 2px teal `hsl(174 72% 27%)` outline) on the terminal area itself: this is
  what "I opened it to type into it" looks like.
- **ended** — chip `stream ended`, the screen dimmed to ~60%, the in-flow bar at the bottom.

---

## Deliverable

A single self-contained **HTML file** (inline CSS, no external assets) laying out, in this order and
each clearly labelled:

1. **Surface 1** — the populated page at 1280×800, the two empty frames, and the 390 narrow frame;
2. **Surface 2** — the eight state frames at 394px, plus the read-only variant and the two 320px
   frames;
3. **Surface 3** — two frames at 1280×800.

I will screenshot **Surface 1 (populated)** → `s1-terminals-home.png`, **Surface 2 (streaming)** →
`s2-grid-pane.png`, and **Surface 3 (live)** → `s3-expanded-pane.png`.

Keep every frame faithful to the values and rules above — it will be judged **region by region**
against `../DESIGN.md`'s binding checklists, and the five things a reviewer will check first are:
**every state shows its word**; **the empty frames say something true and actionable rather than "no
sessions"**; **the held tile reads calm, not broken**; **the ended/error message is an opaque in-flow
bar that covers no output and changes no tile's height**; and **nothing pulses except the `connecting`
and `streaming` dots**.
