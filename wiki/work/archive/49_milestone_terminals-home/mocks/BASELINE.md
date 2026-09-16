# Milestone 49 — the conformance baseline, extracted

> **STANDING — RULED at the `@uat` conformance pass, 2026-08-13 (PO, on the designer's §0).**
> `PROMPT.md:13-15` makes a mock the visual source of truth **only once its PNG is committed**, and
> `mocks/` holds no `s1/s2/s3-*.png`. **The supersession never triggered, so `DESIGN.md` GOVERNS.**
> This file is **binding where DESIGN is silent** (it supplied the expanded pane's focus-ring value and
> the 520px empty-card width, both now folded into DESIGN) and **advisory where the two conflict** — a
> value here that DESIGN contradicts is a *proposal to amend DESIGN*, never a failed build.
> Four of its values were overruled after argument, each recorded in `DESIGN-CONFORMANCE-49.md` §3:
> lowercase pills (DESIGN and PROMPT both specify uppercase), the abbreviated 390 summary (the shipped
> shell gives the summary its own bar, so the full string fits), the 326px tile at 390 (the mock used
> its own container padding), and `exited (0)` (the mirror lane carries no control frames, so an exit
> code cannot arrive — rendering one would invent a fact). Its `12 live panes` was always a placeholder;
> the build renders 16 from `MAX_LIVE_PANES`, correctly.
> **This milestone therefore had two baseline documents each deferring to the other. It no longer does.**

**Source:** `AOF Terminals.dc.html` in the operator's claude.ai Design project
(`a1e976a1-e521-48df-9f0f-ec6e3a1b4ad5`), fetched read-only 2026-08-13 via the design MCP and
recorded here. `mocks/RESULT.md` carries the import pointer; this file carries the **values**, so a
conformance judge does not need the design tool to do its job.

**Status against [`PROMPT.md`](PROMPT.md):** the mock covers all three requested surfaces and rather
more — but it is a **design-compiler template** (`<x-dc>`, `<dc-import>`, `{{ }}` bindings driven by
`support.js`), **not** the "single self-contained HTML file, no JS required" PROMPT.md line 38 asked
for. Frames only exist after JS hydration, and the tile/terminal bodies live in sibling components
(`GridTile.dc.html`, `TermScreen.dc.html`). **Consequence for the render step:** a headless capture
must load `support.js` **and** those two components from the same directory with script execution
enabled; a JS-disabled run captures unexpanded `dc-import` placeholders, not frames. The three PNGs
(`s1-terminals-home.png`, `s2-grid-pane.png`, `s3-expanded-pane.png`) have **not** landed — until they
do, DESIGN's binding checklists remain the baseline per PROMPT.md, with the values below as the
mock's own contribution.

## Surface 1 — the terminals home (`s1-terminals-home.png`), 1280×800

| region | value |
|---|---|
| app bar | 48px, `#fff`, `border-bottom: 1px solid hsl(214 16% 78%)`, padding `0 32px`, gap 24px |
| nav | `aof` wordmark 14px/600; `Terminals` (active, `hsl(220 18% 13%)`, 500) · `Fleet` · `Config` (`hsl(218 9% 38%)`), 12px |
| summary slot | right-aligned, 11px/16px mono, `hsl(218 9% 38%)` — **`7 sessions · 5 live · 1 needs input`** |
| page ground | `hsl(210 18% 96%)` |
| content | `flex:1; overflow:hidden; padding:24px 32px` |
| **grid** | `max-width:1240px; display:grid; grid-template-columns:repeat(3,394px); gap:16px` |
| tile | **394 × 318** |

**Narrow, 390px:** one column, app bar padding `0 16px` / gap 12px, summary abbreviates to
`7 · 5 live · 1 needs input`, content padding `16px 32px`, tiles **326 × 270**, `flex-direction:column; gap:16px`.

### The two empty states, both a dashed card centred in the content region
`max-width:520px; border:1px dashed hsl(214 16% 78%); border-radius:8px; background:hsl(0 0% 99%); padding:24px; gap:10px`

| state | summary slot | headline (13px/20px **mono**) | body (12px/19px) | link |
|---|---|---|---|---|
| **E1** — nothing anywhere | `0 sessions` | `Nothing is running.` | `Assign work from the fleet.` | `Open the fleet →` |
| **E2** — runs in flight, none reporting | `3 runs · 0 sessions reporting` | `3 runs in flight · no session is reporting a terminal.` | `A session appears here only when its workspace reports one. The bundle wires session hooks for Codex; a Claude Code session is reported only where those hooks are configured.` | `Open the fleet →` |

E2's body carries `text-wrap:pretty`; E1's does not.

## Surface 2 — the grid tile (`s2-grid-pane.png`), 12 declared states

Every tile: identity `<work-or-session> → <node>`, an optional `repo`, an optional **pill** on the
identity row, a state **dot + word** pair, and an optional footer toggle.

| # | state | dot | word | word colour | motion | body | toggle |
|---|---|---|---|---|---|---|---|
| 1 | streaming | `hsl(174 72% 27%)` | `streaming` | `#3ECCBD` | **pulse** | terminal | `Hide terminal` |
| 2 | needs input | as streaming | `streaming` | `#3ECCBD` | **pulse** | terminal | `Hide terminal` |
| 3 | waiting | `hsl(218 9% 38%)` | `waiting for output` | — | none | no terminal; in-pane `connected · waiting for first output` | `Hide terminal` |
| 4 | connecting | `hsl(214 18% 88%)` | `connecting…` | — | **pulse** | no terminal | `Hide terminal` |
| 5 | ended | `hsl(218 9% 38%)` | `exited (0)` | — | none | dimmed terminal + **in-flow bar** `exited (0)` | `Hide terminal` |
| 6 | error | `hsl(0 73% 43%)` | `error` | — | none | dimmed terminal + **in-flow bar** `disconnected — the stream dropped`, bar `#f87171` | `Hide terminal` |
| 7 | no live output | `hsl(218 9% 38%)` | `no live output` | — | none | no terminal; in-pane `no live output — no assignment is relaying this session` | `Hide terminal` |
| 8 | **held, at the limit** | — | — | — | none | no terminal; centred `not streaming — 12 live panes already · hide one to watch this` | **absent** |
| 9 | **held, slot free** | — | — | — | none | no terminal; centred `not streaming` | `Watch terminal →` |
| 10 | read-only (streaming) | as streaming | `streaming` | `#3ECCBD` | **pulse** | terminal | `Hide terminal` |
| 11 | 320px floor · waiting | as 3 | — | — | none | as 3 | `Hide terminal` |
| 12 | 320px floor · streaming | as 1 | — | — | **pulse** | terminal | `Hide terminal` |

**Motion appears on exactly two states — streaming (1, 2, 10, 12) and connecting (4) — and nowhere
else.** PROMPT.md's rule holds in the mock.
**`needs input` and `read-only` are both PILLS on the identity row**, never on the status row, and
never a bare dot. **No tile carries an input row.** The held-at-limit tile has **no toggle at all** —
the affordance is absent, not disabled.

## Surface 3 — the expanded pane (`s3-expanded-pane.png`), 1280×800, dark

| region | value |
|---|---|
| ground | `#0b0f14` |
| header | `#0f1629`, `border-bottom:1px solid #1e2a44`, padding `8px 16px`, gap 10px |
| lockup | `▣` + `TERMINAL` (11px/16px, 600, `letter-spacing:.08em`, `#d4d4d8`) |
| identity | 11px/16px mono `#a1a1aa` — `· 49/02 → aof-wsl · session 7f3a91c` |
| state | 7px dot + word, `margin-left:6px`; streaming pulses `aofpulse 1.6s ease-in-out infinite` |
| exit | `⊟`, 28×28, `#a1a1aa`, `border:1px solid #1e2a44`, `border-radius:4px`, right-aligned |
| **focus ring** | `outline:2px solid hsl(174 72% 27%); outline-offset:-2px` on the byte area **when focused for typing** |
| mirror | `TermScreen` at **`scale: 1.88`** — scaled, never re-wrapped |

**Ended variant:** header dot `hsl(218 9% 38%)`, word `stream ended`; body splits into a dimmed
mirror (`opacity .6`, `scale 1.8`) **above** an in-flow bar (`#0f1629`, `border-top:1px solid #1e2a44`,
padding `6px 16px`, 12px/17px mono) reading `stream ended · exited (0)`. **The bar never overprints
the mirror** — it takes its own height in the flow, exactly as PROMPT.md requires.

**There is no input row on the expanded pane either.** The terminal takes keystrokes directly.

## Two divergences to resolve before the `@uat`

1. **The cap number disagrees.** The held tile reads **`12 live panes already`**; ADR-006 rules the
   cap is **16**, argued from the mirror's 256 KiB replay burst, `MAX_TAIL_KEYS/4` and main-thread
   contention. The mock's copy shape (`not streaming — N live panes already · hide one to watch this`)
   is right and matches DG-49-4; the **number** must come from `MAX_LIVE_PANES`, not be typed. A judge
   must not log `16` as a gap against this mock, and the implementation must not copy `12`.
2. **E2's body will be falsified by story 07.** It states *"The bundle wires session hooks for Codex; a
   Claude Code session is reported only where those hooks are configured"* — true when the mock was
   drawn, and **story 07 closes exactly that gap**. Once 07 lands, that sentence describes a world that
   no longer exists. DESIGN owes E2 replacement copy, and it is the same species as this milestone's
   other seven stale premises: a true statement about the tree, frozen into an artefact, outliving its
   truth. Routed to the designer.

## What the mock does NOT settle

- `roster-gone`'s copy — DESIGN still owes K13 (`ROSTER_GONE_REASON` is a marked placeholder in
  `ui/src/home/session-mount.mjs`).
- The silent re-poll failure treatment (story 04's open gap).
- `Could not load the mesh: fetch failed` — whether that names the fault well enough for an operator.
