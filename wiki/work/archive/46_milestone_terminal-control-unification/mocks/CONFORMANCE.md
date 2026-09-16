# 46 · mock ↔ DESIGN reconciliation — the binding conformance baseline

**Authored by the designer, 2026-08-08, after the operator's mocks landed mid-build.**
**Second pass, 2026-08-08 — three PO rulings folded in, plus a third `unavailable` cause ruled in
DESIGN. See §0.**

**What this file is.** [`Terminal Panel Spec.dc.html`](Terminal%20Panel%20Spec.dc.html) is the committed
mock for all three surfaces. Per [STATE §Decided at refine](../STATE.md) and
[DESIGN §Conformance source of truth](../DESIGN.md), **a mock supersedes the checklist wherever the two
differ; DESIGN still governs wherever the mock is silent.** This document is the delta list that makes
that ruling actionable: the reviewer judges a render against **this file**, and reaches for
[`../DESIGN.md`](../DESIGN.md) only at the silences enumerated in §6.

**How the values below were read.** The `.dc.html` has two halves and *both* are binding: the markup, and
the `renderVals()` block at the bottom that holds the state table (`S.idle` … `S.unavailable`), the style
helpers (`bar()`, `wordStyle()`, `picker()`, `out()`, `screen()`) and the per-surface fixture lists
`s1` / `s2`. Every value in this document is quoted from one of those two halves. Values I **derived**
(by arithmetic over the mock's own boxes, or by measurement I state) are labelled `derived` and are never
presented as mock text. `mocks/support.js` is generated `dc-runtime` build output — scaffolding, not
design intent, and it is not a source for anything here.

**What is NOT in scope here.** UI *behaviour* is the task `.feature` files'. Where the mock reveals a
behaviour, §5 routes it as a PO decision and cites the contract that already covers it. **No `.feature`
is edited by this document; contracts are locked.**

---

## 0 · What changed in the second pass (2026-08-08) — read this first if you read this file before

| Was | Now |
|---|---|
| **PO-1** — the `streaming` word's lighter teal, *pending a PO decision* | **RULED: ADOPTED.** The **word** is `hsl(174 58% 52%)`; the **dot** stays `hsl(174 72% 27%)`. DESIGN is amended in its own house style as a dated, superseding correction — **[DESIGN §The merged ramp CORRECTION 1](../DESIGN.md)** — and it is painted as the sixth named constant in DG-46-2's one home. §1b O1 and §3a are closed. |
| **PO-2** — the `waiting` pane line, *pending* | **RULED: ADOPTED, with its own descriptor field** — never through `reason`. §3b is closed. |
| **PO-3** — restart on a clean exit, *pending* | **RULED:** restart is offered on `ended` (**including `exited (0)`**) and on `error`, **interactive host only**. §5 PO-3 is closed; the `.feature` gap is recorded, not edited. |
| DESIGN fixed **two** `unavailable` causes | **DESIGN now fixes THREE.** The third — **`no fleet origin` / `aof mesh ui`** — is ruled at [DESIGN §The unavailable pane RULING 2](../DESIGN.md) and closes the design gap task 03's row 3 raised. **The mock is silent on it**; see §3e and §6. |
| DESIGN's contrast clause (a11y 13) asked for measurements and had none | **Measured.** The full table is in [DESIGN §The merged ramp](../DESIGN.md). Four findings are **raised there and NOT ruled** — two text, two dots. §3f carries the two that touch a value this file quotes. |

**Nothing in §2's binding value tables changed.** A render judged against the first pass is still judged
against the same geometry, type and copy, with the three additions §0 names.

---

## 1 · Verdict summary

**The mock CONFIRMS DESIGN on the substance and OVERRIDES it on eleven concrete values.** It is an
extraction, not a re-skin: the five DG-46-2 hexes are unchanged, the seven state words are unchanged, the
copy strings are unchanged, the region order is unchanged, and the geometry rule is unchanged. Nothing in
it reaches beyond this milestone's ramp — **the shell does not go dark**, no gradient, no shadow, no new
radius, no brand accent, no input row. Task 04's `@uat` "a mock that exceeds the ramp" scenario finds
nothing to raise on four of its six rows.

### 1a · What the mock CONFIRMS (a builder changes nothing)

| # | DESIGN said | Mock agrees |
|---|---|---|
| C1 | the five dark hexes `#0b0f14` / `#0f1629` / `#1e2a44` / `#0b1120` / `#d7dde3` | all five present, byte-identical, and **no sixth** |
| C2 | seven state words + `unknown`; `streaming` beats `running`; `disconnected` is a cause line, not a state | every fixture uses the merged vocabulary; the transport bar reads `disconnected — the stream dropped` verbatim |
| C3 | C1 region order: lockup · identity · posture pill · picker · state chip · `ml-auto` cluster | exactly this order on all three surfaces |
| C4 | the non-live bar is **opaque, in flow, paid for out of the byte area**, host height unchanged | the bar is a flex sibling of the byte area *inside the same box*; the S2 panel stays 192px across `streaming` → `stream ended` |
| C5 | `unavailable` is quiet, dashed, never red, names its cause + recovery | S1 `not checked out on this machine` / `~/source/lark-guard`; S2 `board unreachable` / `aof work ui` — verbatim. *(DESIGN's **third** cause is not drawn — §3e.)* |
| C6 | `waiting` carries **no motion** | `S.waiting` has no `pulse`; only `S.streaming` does |
| C7 | change 10 — every header control reaches ≥24×24 by padding; the card header grows ~6px | every control on S1, S2 *and* S3 is a 28×28 box |
| C8 | change 2 — the `streaming` dot pulses on the board dock | S1's live fixture pulses |
| C9 | change 8 — the `remote · <nodeId>` badge is retired | no such badge anywhere |
| C10 | change 9 — one chrome type step, `text-[11px]` | 11px on all three headers |
| C11 | change 11 — the board dock gains expand-to-fullscreen | `⤢` present in every S1 fixture |
| C12 | `read-only` is mandatory on the inline **and** the fullscreen header, never yields | present in all six S2 fixtures (including collapsed and at 390) and on S3 |
| C13 | S2's yield order: session tail whole → `TERMINAL` word → wrap | the 390 sample drops `· session 7f3a91c` **and** the word `TERMINAL`, keeps `▣`, keeps the pill and chip whole, then wraps |
| C14 | S2 at rest is collapsed with no state chip, no bytes, no socket | the at-rest fixture is header-only with `Watch terminal →` |
| C15 | the intrinsic mirror screen is ≈640×408 at `fontSize: 13` | `width:640px;height:408px;font-size:13px;line-height:17px` — 80×8 and 24×17 exactly |
| C16 | STATE ruling (2): the peek panel is **header + 192px**, not a flat 192 | the `height:192px` box is the **byte-area column**, with the header above it |
| C17 | STATE ruling (3): `ended` with no exit code reads `normal`, not clean/failure | mock is silent on `reads`; `state-ramp.mjs` already ships `READS_NORMAL` — ruling holds |
| C18 | STATE ruling (1): the `read-only` label binds to the mount's posture | S2/S3 (read-only mounts) carry it; S1 (interactive) does not, in **every** state including `unavailable` |

> **C1 carries one dated footnote after the second pass.** "No sixth" was true of the mock's **hex
> literals** and stays true. The `streaming` **word**'s `hsl(174 58% 52%)` is a sixth *value* on the dark
> surface, it came **from the mock**, and DESIGN now counts it explicitly
> ([§What visibly changes, change 13](../DESIGN.md)). A reviewer counting hexes still finds five.

### 1b · What the mock OVERRIDES — the only places a builder must change what DESIGN told them

Eleven. Each is stated as **DESIGN said → mock rules**; the mock wins.

| # | Region | DESIGN / shipped core said | **The mock rules** | Severity |
|---|---|---|---|---|
| **O1** | C1 state chip, `streaming` | label class `text-primary` = `hsl(174 72% 27%)` (DESIGN §merged ramp; `palette.mjs` `TERMINAL_LABEL_CLASS_PRIMARY`) | the **word** is `hsl(174 58% 52%)` — a lighter teal. The **dot** stays `hsl(174 72% 27%)`. | **RESOLVED 2026-08-08 — PO ruled ADOPT. DESIGN amended (CORRECTION 1); painted as the sixth named constant in `palette.mjs`. This is now the EXPECTED render, and a render still showing `text-primary` is a GAP.** |
| **O2** | C2, `waiting` pane | the pane line is the chip word, `waiting for output` (DESIGN §S1 states) | the pane line is **`connected · waiting for first output`** — a *different, richer* string from the chip word | **RESOLVED 2026-08-08 — PO ruled ADOPT, carried on its OWN descriptor field (never `reason`). See §3b.** |
| **O3** | C2/C3 frame | the byte area is the region, xterm inset by `p-2` (inline) / `p-3` (fullscreen) | the byte area is a **rounded `4px` `#0b0f14` box inset 8px from the panel's left, right and bottom, flush to the header**; the 8px gutter is chrome `#0f1629`. S3 insets 8px on all four sides. | MEDIUM — changes the measured C2 box, therefore the scale |
| **O4** | C3 bar | drawn full-width in DESIGN's anatomy diagram | the bar lives **inside** the rounded byte box, so it inherits the 8px side gutters and the 4px radius — it is **not** full-bleed | MEDIUM |
| **O5** | C2 dimming | "C2 … dimmed `opacity-60`" (ambiguous: container or content) | `opacity:.6` is on the **glyph layer only** (`out(dim)` / `screen(k, dim)`); the `#0b0f14` background stays fully opaque, and the bar is never dimmed | LOW — resolves an ambiguity |
| **O6** | C1 provider picker | "a teal dot on the selected segment" | the selected segment is a **filled teal pill** (`hsl(174 72% 27%)`, radius 4px, `2px 8px`) carrying a **white** 5px dot and **white** 11px mono text. No new token — both values are `--color-primary` / `--color-primary-foreground`. | MEDIUM |
| **O7** | C1 provider picker, locked | `disabled` + a `title` naming why | the whole well also drops to **`opacity:.5`** | LOW — DESIGN was silent on the visual |
| **O8** | C1 lockup + pills | `tracking-wide` (0.025em) — DESIGN and `palette.mjs` `TERMINAL_READ_ONLY_PILL_CLASS` | lockup **`0.1em`** (= `tracking-widest`); `read-only` pill **`0.08em`** (**off the house scale** — no Tailwind step) | LOW, but see §5: 0.08em needs a decision |
| **O9** | motion | `animate-pulse` — Tailwind's 2s `cubic-bezier(.4,0,.6,1)`, opacity 1 → .5 (`palette.mjs` `TERMINAL_MOTION_CLASS.pulse`) | `@keyframes dotpulse{0%,100%{opacity:1}50%{opacity:.3}}` at **`1.7s ease-in-out infinite`** | LOW visual, MEDIUM structural — see §5 |
| **O10** | state dot | DESIGN and `palette.mjs` give **no size** | **7×7px**, `border-radius:50%` — **off the house scale** (the product uses `h-2 w-2`/8px and `h-1.5 w-1.5`/6px) | LOW, needs a decision (§5) |
| **O11** | `unavailable` dot | `border border-dashed border-muted-foreground/40 bg-transparent` (DESIGN + `palette.mjs` `TERMINAL_DOT_CLASS_ABSENT`) | `background:transparent;border:1px dashed hsl(218 9% 38%)` — **full opacity, not /40** | LOW — and it is a legibility improvement (see §3c) |

### 1c · Two flags — the mock measurably contradicts a **locked `.feature`**

Not resolved here. **Operator decision required.**

> **FLAG-1 — "the panel's total height is a constant 192px".**
> [`04/tasks/04_the-two-terminals-agree.feature:137`](../stories/04_story_one-control-both-call-sites/tasks/04_the-two-terminals-agree.feature#L137)
> reads: *"the panel's **total** height is a constant 192px whenever it is open"*. The mock puts
> `height:192px` on the **byte-area column**, with the header (`padding:6px 12px`, ~40px `derived`)
> **above** it — total ≈ 232px. **A reviewer measuring 192px end-to-end fails a correct render.**
> STATE §Decided at refine ruling (2) already called this exactly right (*"header + 192px, not a flat
> 192 … a reviewer measuring 192 would have failed a correct render"*), and the mock now confirms it —
> but the locked feature line still says "total". **The invariant that survives is: the panel's total
> height does not MOVE between `streaming` and `stream ended`.** That is what the reviewer must measure.

> **FLAG-2 — "roughly 250-300px wide" letterbox band.**
> [`…04.feature:234`](../stories/04_story_one-control-both-call-sites/tasks/04_the-two-terminals-agree.feature#L234)
> and [DESIGN §Fit vs scale](../DESIGN.md) both tell the reviewer to expect a right-hand band of *roughly
> 250-300px* on R-F (a mirror scaled up at 1280). **Against the mock's own 1280×800 overlay the band is
> ≈93px** (`derived`: byte box 1264 wide; 640 × 1.83 = 1171). The estimate assumed a far taller chrome.
> **A reviewer holding the 250-300px number could log a correct render as a gap, or pass an incorrect
> one.** The *rule* (band expected, on the right and/or bottom, never cropped) is untouched; only the
> magnitude is wrong. The band's size is a function of the box and must be **derived at review time**,
> not carried as a literal. *(DESIGN now carries this caveat inline at §Fit vs scale.)*

---

## 2 · Binding value table, per surface

Everything below is quoted from the mock unless marked `derived`. A reviewer must be able to check a
render against this **without opening the mock**.

### 2·S1 — the board dock

`s1-board-dock.png` · frame target **1280×280** · interactive · a `local-pty` reflows.

**Geometry**

| Element | Value |
|---|---|
| dock frame | `height:280px` · `background:#0f1629` · `border-top:1px solid #1e2a44` · **no radius**, full content width |
| C0a drag handle | `height:6px` · `flex:none` · `background:transparent` · `cursor:ns-resize` · hover `background:hsl(174 72% 27%)` |
| C1 header | `padding:8px 16px` · `display:flex;align-items:center;gap:14px` · one row · **44px** `derived` (28px control + 2×8 padding) |
| C2 byte box | `flex:1;min-height:0` · `margin:0 8px 8px` (**no top margin — flush to the header**) · `background:#0b0f14` · `border-radius:4px` · `overflow:hidden` · **1264×222** `derived` |
| C2 content inset | `padding:8px 10px` |
| C3 bar | `flex:none` · `background:#0f1629` · `border-top:1px solid #1e2a44` · `padding:6px 12px` — **inside** the byte box |
| control button | `28×28` · `border-radius:4px` · `font-size:13px` (`✕` is `12px`) · cluster `gap:2px` |

**Region order (C1, left → right)** — `▣ TERMINAL` · `item` `46/02` · `provider:` + picker · state chip ·
`ml-auto` → `↻` (on `ended`/`error` only) · `⤢` · `⌄` · `✕`.

**Colour + type**

| Element | Colour | Type |
|---|---|---|
| lockup `▣ TERMINAL` | `#d4d4d8` (zinc-300) | 11px / 600 / `letter-spacing:0.1em` / sans |
| identity label `item` | `#71717a` (zinc-500) | 11px mono |
| identity value `46/02` | `#d4d4d8` (zinc-300) | 11px mono |
| field label `provider:` | `#71717a` (zinc-500) | 11px mono |
| picker well | `background:#0b1120` · `border:1px solid #1e2a44` · `border-radius:6px` · `padding:4px` | — |
| picker selected segment | `background:hsl(174 72% 27%)` · `border-radius:4px` · `padding:2px 8px` | label `#fff` 11px mono; dot `5×5` `#fff` |
| picker, locked | the whole well at `opacity:.5` | — |
| state word | per §3 | 11px **sans**, `white-space:nowrap` |
| state dot | per §3 | `7×7` · `border-radius:50%` · `flex:none` |
| control glyphs | `#a1a1aa` (zinc-400); hover `background:#1e2a44` + `color:#f4f4f5` (zinc-100) | 13px |
| terminal bytes | `#d7dde3` on `#0b0f14` | `ui-monospace,SFMono-Regular,Menlo,monospace` · 13px / `line-height:17px` / `white-space:pre` |
| bar text | ended `#a1a1aa` · error `#f87171` (red-400) | 12px mono |
| empty / waiting / unavailable copy | `#a1a1aa`; unavailable recovery line `#71717a` | 12px mono (recovery 11px mono) |

**Icons** — `▣` U+25A3 · `↻` U+21BB `title="restart"` · `⤢` U+2922 `title="expand to full screen"` ·
`⌄` U+2304 `title="collapse"` (collapsed: `⌃` U+2303) · `✕` U+2715 `title="close"`. *The mock draws
Unicode glyphs; DESIGN names the lucide components (`RotateCw`, `Maximize2`/`Minimize2`,
`ChevronDown`/`ChevronUp`). See §5 — glyph family is an open PO item, position and semantics are not.*

**Exact copy strings**

- `▣ TERMINAL` · `item` · `provider:` · `claude`
- state words: `idle` · `waiting for output` · `streaming` · `exited (0)` · `error` · `unavailable`
- empty pane, centred: **`No session. Press Run agent on an item.`**
- waiting pane, top-left: **`connected · waiting for first output`** (U+00B7 separator)
- unavailable block: **`not checked out on this machine`** / **`~/source/lark-guard`**
- **unavailable block, THIRD cause — `unmocked`, DESIGN governs:** **`no fleet origin`** /
  **`aof mesh ui`**, for a board-hosted `mirror` handed no fleet origin
  ([DESIGN §The unavailable pane RULING 2](../DESIGN.md)). **No fixture in m46 — do not log its absence**
  (§3e).
- bar, ended: **`exited (0)`** · bar, error: **`disconnected — the stream dropped`** (U+2014 em dash)
- control `title`s: `restart` · `expand to full screen` · `collapse` · `close`

**Six fixtures the mock ships (`s1`)** — `empty` (`S.idle`, picker unlocked) · `waiting` (`S.waiting`) ·
`live` (`S.streaming`, **picker locked**) · `ended` (`S.exited0`, glyphs at `.6`, bar, **`↻` appears**) ·
`error` (`S.error`, glyphs at `.6`, red bar, **`↻` appears**) · `unavailable` (`S.unavailable`, picker
**unlocked**, **no `↻`**, header fully intact).

**Collapsed** — a separate sample: `background:#0f1629`, `border:1px solid #1e2a44`,
`border-radius:6px`; a 6px **transparent, cursorless, hoverless** strip where the handle was; header
identical but the chevron flipped to `⌃`; provider well at `opacity:.5`; state still `streaming`. *The
6px strip is spacing, not a handle — consistent in function with "absent while collapsed", but a reviewer
measuring the header's top offset will find 6px, not 0. The full border + 6px radius may be the sample's
presentation frame; see §5.*

### 2·S2 — the fleet card peek

`s2-fleet-card-peek.png` · card **560px** (narrow sample **390px**) · read-only mirror · **80×24 at
`scale(0.47)`**.

**Geometry**

| Element | Value |
|---|---|
| host card *(fleet chrome, not the control)* | `width:560px` · `background:#fff` · `border:1px solid #e4e4e7` · `border-radius:8px` · `padding:16px` · column `gap:12px` |
| C0 panel frame | `background:#0f1629` · `border:1px solid #1e2a44` · `border-radius:6px` · `overflow:hidden` |
| C1 header | `padding:6px 12px` · `display:flex;flex-wrap:wrap;align-items:center;gap:10px` (390: `gap:8px 10px`) — **the one host where wrapping is permitted** |
| C2 byte box | **`height:192px`** · `margin:0 8px 8px` · `background:#0b0f14` · `border-radius:4px` · **510×192** `derived` at a 560 card, **340×192** `derived` at 390 |
| C3 bar | as S1, inside the byte box; **≈28-29px** `derived` — measure it, never assume it |
| control button | `28×28` · `border-radius:4px` · cluster `gap:6px` |
| **total panel height** | header + 192 ≈ **232px** `derived` — **and it does not move between `streaming` and `stream ended`.** See FLAG-1. |

**Region order (C1, left → right)** — `▣ TERMINAL` · identity · `read-only` pill · state chip *(open
only)* · `ml-auto` → `⤢` *(open only)* · worded toggle.

**Colour + type** — as S1, plus:

| Element | Value |
|---|---|
| identity | `#a1a1aa` (zinc-400) 11px mono · `overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0` |
| `read-only` pill | `color:#a1a1aa` · `border:1px solid #1e2a44` · `border-radius:4px` · `padding:2px 6px` · `font-size:10px` · `font-weight:600` · `letter-spacing:0.08em` · `text-transform:uppercase` · `flex:none` · `white-space:nowrap` |
| worded toggle | `#a1a1aa` 11px sans, hover `#f4f4f5`, **no border, no box** |
| scaled screen | `width:640px;height:408px;transform:scale(0.47);transform-origin:top left` — dimmed variants use `scale(0.40)` + `opacity:.6` |

**Exact copy strings**

- identity at 560: **`46/02 → aof-wsl · session 7f3a91c`** · at 390: **`46/02 → aof-wsl`**
- pill: **`read-only`** · toggles: **`Watch terminal →`** / **`Hide terminal`**
- state words: `waiting for output` · `streaming` · `stream ended` · `error` · `unavailable`
- waiting pane: **`connected · waiting for first output`** (`padding:8px 10px`)
- unavailable block: **`board unreachable`** / **`aof work ui`** — **and this surface can carry no other
  cause**: S2 is same-origin with the fleet by construction, so `no fleet origin` is structurally
  impossible here ([DESIGN §The unavailable pane RULING 2](../DESIGN.md))
- bar, ended: **`stream ended`** · bar, error: **`disconnected — the stream dropped`**
- `title`: `expand to full screen`

**Six fixtures (`s2`)** — `at rest` (**collapsed**, `Watch terminal →`, no chip, no `⤢`, **no black box
at all**) · `waiting` · `live` (`scale(0.47)`, undimmed, no bar) · `ended` (`scale(0.40)` + `.6` + bar) ·
`error` (`scale(0.40)` + `.6` + red bar) · `unavailable` (open, dashed block, `⤢` present, `Hide
terminal`).

**The 390 sample, and it is the yield-order proof** — the header composes as: `▣` *(word `TERMINAL`
dropped)* · `46/02 → aof-wsl` *(`· session 7f3a91c` dropped whole with its separator)* · `read-only`
*(whole)* · `● streaming` *(whole)* · `ml-auto` `⤢` + `Hide terminal`, and then **wraps to a second
row**. The byte box stays `height:192px` and the screen stays `scale(0.47)` — because **height binds at
both widths** (`derived`: 340/640 = 0.531 > 192/408 = 0.4706).

**Unavailable block** — `border:1px dashed #1e2a44` · `border-radius:6px` · `padding:12px 16px` ·
centred column `gap:4px`; cause 12px mono `#a1a1aa`; recovery 11px mono `#71717a`. Byte-identical on S1
and S2 apart from the copy — **and byte-identical for DESIGN's third cause too, which changes only the
two strings.**

### 2·S3 — the full-screen overlay

`s3-fullscreen-overlay.png` · **1280×800** · no app chrome behind it · **80×24 at `scale(1.83)`**.

**Geometry**

| Element | Value |
|---|---|
| C0 overlay | `width:1280px;height:800px` · `background:#0b0f14` · `overflow:hidden` |
| C1 header | `flex:none` · `padding:8px 16px` · `gap:14px` · `background:#0f1629` · `border-bottom:1px solid #1e2a44` · **45px** `derived` |
| C2 region | `flex:1;min-height:0` · **`margin:8px`** (all four sides) · **1264×739** `derived` |
| C3 bar | `flex:none`, inside the `margin:8px` container — in flow, **not** `absolute` (change 7 confirmed) |
| exit control | `margin-left:auto` · `28×28` · `border-radius:4px` · 13px · `title="exit full screen"` · **always visible in both fixtures** |

**Region order (C1)** — `▣ TERMINAL` · identity · `read-only` pill · state chip · `ml-auto` `⊟` (U+229F).
**No restart, no chevron, no close, no picker.** Byte-identical header vocabulary to the inline one.

**Copy** — identity **`46/02 → aof-wsl · session 7f3a91c`** · pill **`read-only`** · states `streaming`
and `stream ended` · bar **`stream ended`**.

**Two fixtures** — `live` (`scale(1.83)`, undimmed, no bar, `● streaming` pulsing teal) and `ended`
(`scale(1.76)`, `opacity:.6`, opaque in-flow bar, dot `hsl(218 9% 38%)` still, word `stream ended`
`#a1a1aa`; caption: *"screen dimmed, opaque bar in the flow, total height unchanged"*).

**On the two S3 scale literals** — `1.83` and `1.76` are **illustrative, not exactly derivable from the
mock's own box** (`derived`: 739/408 = **1.811**, and the reduced box gives **1.743**). **Their
DIFFERENCE is the binding fact**: 0.07 × 408 = 28.6px ≈ the bar's height — the same delta S2 shows. See
§4. **Do not hard-code either literal.**

---

## 3 · The state table — all seven states plus `unknown`, three ways

Cross-checked against the mock's `renderVals()` `S` table, [DESIGN §The merged ramp](../DESIGN.md), and
the shipped [`ui/src/terminal/state-ramp.mjs`](../../../../../ui/src/terminal/state-ramp.mjs) +
[`palette.mjs`](../../../../../ui/src/terminal/palette.mjs).

| State | Chip label | Dot fill / border | Word colour | Motion | Pane |
|---|---|---|---|---|---|
| **`idle`** | `idle` | filled `hsl(218 9% 38%)` (`bg-muted-foreground`) | `#a1a1aa` (`text-zinc-400`) | none | S1: centred `No session. Press Run agent on an item.` |
| **`connecting`** | `connecting…` | filled `bg-secondary` = `hsl(214 18% 88%)` | `text-zinc-400` | **pulse** | empty |
| **`waiting`** | `waiting for output` | filled `hsl(218 9% 38%)` | `#a1a1aa` | **none** | top-left line **`connected · waiting for first output`** |
| **`streaming`** | `streaming` | filled `hsl(174 72% 27%)` (`bg-primary`) | **`hsl(174 58% 52%)`** — *all three sources now agree; DESIGN amended, CORRECTION 1* | **pulse** | full, undimmed, **no bar** |
| **`ended`** (no code) | `stream ended` | filled `hsl(218 9% 38%)` | `#a1a1aa` | none | full, glyphs `opacity:.6`, opaque in-flow bar `stream ended` |
| **`ended`** (code 0) | `exited (0)` | filled `hsl(218 9% 38%)` | `#a1a1aa` | none | as above, bar `exited (0)` |
| **`ended`** (code N≠0) | `exited (N)` | filled `hsl(0 73% 43%)` (`bg-destructive`) | `#f87171` (`text-red-400`) | none | as above — **mock has no fixture; DESIGN + `state-ramp.mjs` govern** |
| **`error`** | `error` | filled `hsl(0 73% 43%)` | `#f87171` | none | full → `.6` + red bar carrying the **mandatory** cause; empty → top-left line |
| **`unavailable`** | `unavailable` | **hollow**, `background:transparent`, `border:1px dashed hsl(218 9% 38%)` | `#a1a1aa` | none | centred dashed block: cause + recovery, **one of THREE pairs** (§3e). **No socket.** Header renders in full. |
| **`unknown`** | `unknown` | filled `hsl(218 9% 38%)` | `#a1a1aa` | none | unchanged — **mock silent; DESIGN + `state-ramp.mjs` govern** |

**Rows where all three agree, byte for byte:** `idle`, `waiting` (chip word, dot, *and the no-motion
rule*), `ended` in all three of its labels, `error` (dot, word colour, and the cause line
`disconnected — the stream dropped` = `state-ramp.mjs`'s `TRANSPORT_CAUSE_LINE`), the `unavailable`
**dot shape**, the two `unavailable` copy pairs the mock draws — **and, since the second pass,
`streaming`'s word colour too.**

### 3a · Three-way disagreement 1 — the `streaming` word colour · **RULED 2026-08-08: ADOPTED**

| Source | Value |
|---|---|
| DESIGN §The merged ramp | ~~`text-primary`~~ → **`hsl(174 58% 52%)`** (CORRECTION 1, 2026-08-08 — a dated correction that supersedes, not a rewrite) |
| `ui/src/terminal/palette.mjs` | `TERMINAL_LABEL_CLASS_PRIMARY` — now the sixth named constant, carrying the measurement in its comment |
| `ui/src/index.css` `@theme` | `--color-primary: hsl(174 72% 27%)` — **unchanged; no `@theme` token was added** |
| **the mock** | **`hsl(174 58% 52%)`** — and the **dot** stays `hsl(174 72% 27%)` |

DESIGN and the shipped core agreed with each other and **both differed from the mock.** The mock won, and
it was right, on a measurement DESIGN §Accessibility 13 asks for and nobody had taken:

- `text-primary` `hsl(174 72% 27%)` ≈ `#13766D` on the chrome `#0f1629` → **3.29:1** `derived`.
  **Fails WCAG 2.1 AA (4.5:1) for an 11px state word.**
- the mock's `hsl(174 58% 52%)` ≈ `#3ECCBD` on `#0f1629` → **9.06:1** `derived`. Passes comfortably.
- keeping the **dot** at `hsl(174 72% 27%)` is also right: as a non-text indicator it needs 3:1
  (SC 1.4.11) and it clears it at 3.29:1, so the dot stays on-token and only the *word* lightens.

**Status: closed.** The PO ruled **adopt** ([STATE §PO rulings on the mock reconciliation](../STATE.md)),
which satisfies [`…04.feature:264`](../stories/04_story_one-control-both-call-sites/tasks/04_the-two-terminals-agree.feature#L264)
("a new terminal colour → a token decision, **raised before it is painted**") — it was raised in this
file's first pass and painted after. DESIGN is amended in the same change, as its own conformance clause
requires, at [§The merged ramp CORRECTION 1](../DESIGN.md), where the full measurement table for **every
other row of the ramp** now lives.

**What a reviewer does with this:** the lighter teal is the **expected** render on all three surfaces. A
`streaming` word rendered in `text-primary` is a **GAP** against this file *and* against DESIGN.

*It does not trip DG-46-2's own row (`…04.feature:198`): that row asks for no second near-black and no
second border blue. This is a second **teal**, on the dark surface only, and it lives in DG-46-2's own
home (`palette.mjs`) — one home, one constant, still no `@theme` token.*

### 3b · Three-way disagreement 2 — the `waiting` pane line · **RULED 2026-08-08: ADOPTED**

| Source | Value |
|---|---|
| DESIGN §S1 states | `waiting for output`, "message top-left in C2" — i.e. the chip word, reused |
| `state-ramp.mjs` | the pane line is now its **own field** (`WAITING_PANE_LINE`), distinct from `reason` |
| **the mock** | chip `waiting for output`, **pane `connected · waiting for first output`** |

The mock separates the chip word from the pane line for the first time, and the pane line is the more
honest of the two — it names that the *socket is open* and nothing has been said, which is exactly the
distinction `connecting` vs `waiting` was created to carry.

**The trap this ruling avoided, recorded because it is the kind that ships silently.**
`describeTerminalState` honours an injected `reason` **only on `waiting`** — and when it does, it *also*
rewrites the chip word to `no live output`
([`state-ramp.mjs:461-469`](../../../../../ui/src/terminal/state-ramp.mjs#L461)):

```js
if (descriptor.state === TERMINAL_STATES.WAITING) {
  const reason = nonEmpty(options.reason);
  if (reason != null) {
    descriptor.text = "no live output";
    descriptor.reason = reason;
  }
}
```

So injecting the mock's line as `reason` would have turned the chip into `no live output` — the V10 copy,
asserting an assignment fact that is not true. **The PO ruled it in with its own field.** `reason` stays
the V10 path and nothing else.

**What a reviewer checks:** chip `waiting for output` **and** pane `connected · waiting for first output`,
both present, different strings, at the same moment.

### 3c · Three-way disagreement 3 — the `unavailable` dot's border opacity

DESIGN and `palette.mjs` (`TERMINAL_DOT_CLASS_ABSENT`) both say `border-muted-foreground/**40**`; the
mock says `1px dashed hsl(218 9% 38%)` at full opacity. Mock wins, and again the measurement supports
it: `hsl(218 9% 38%)` on `#0f1629` is **2.79:1** `derived` at 100% — already short of SC 1.4.11's 3:1
for the dot as a signal, and at /40 it is far below. Note this affects the **muted dot on every quiet
state** (`idle`, `waiting`, `ended`), not just `unavailable`; DESIGN, the core and the mock all agree on
`hsl(218 9% 38%)`, so it is not a delta — it is a **standing risk the `@uat` a11y pass must judge**
([`…04.feature:216-223`](../stories/04_story_one-control-both-call-sites/tasks/04_the-two-terminals-agree.feature#L216)).
It is defensible only because the *word* always renders and colour is the fifth signal.

> **Second pass, 2026-08-08 — a second dot joins it, measured for the first time.**
> `bg-destructive` `hsl(0 73% 43%)` ≈ `#be1e1e` on `#0f1629` is **2.91:1** `derived` — also short of 3:1,
> on `error` and `exited (N≠0)`. Same status, same defence: the word beside it is `text-red-400` at
> **6.51:1**, so no meaning rests on the dot. **Raised in [DESIGN §The merged ramp](../DESIGN.md), not
> ruled, and not a delta against the mock** — all three sources carry the same value. A reviewer logs
> neither dot as a render GAP; the `@uat` a11y pass judges both.

### 3d · Resolved, not a disagreement — `ended` `reads`

DESIGN's ramp table offers only "clean / failure" for `ended`; STATE ruling (3) said a code-less `ended`
reads **`normal`**; `state-ramp.mjs` ships `reads: READS_NORMAL` on the `ENDED` row and only moves to
`READS_CLEAN`/`READS_FAILURE` when a code was asserted. The **mock is silent** (`reads` is an internal
value, not a paint). **STATE's ruling stands, unchallenged.**

### 3e · NEW, second pass — the `unavailable` state has a THIRD cause, and the mock does not draw it

**This is a DESIGN ruling, not a mock delta.** Task 03's row 3 (*"no fleet origin was ever handed"*)
named a case DESIGN's two causes did not cover — the missing server is the **fleet**, so
`board unreachable` / `aof work ui` is the wrong pair, and the build correctly **invented no copy**.
[DESIGN §The unavailable pane RULING 2](../DESIGN.md) settles it as a **third cause with its own copy
pair**, on the reasoning that a generalised pair cannot be written (the recovery command differs per
origin kind) and that `fleet unreachable` would assert a far-end state the client never observed — the
same discipline that made `streaming` beat `running`.

| | Cause line | Recovery line | Where it can occur | Drawn by the mock? |
|---|---|---|---|---|
| 1 | `not checked out on this machine` | the workspace path (`~/source/lark-guard` in the mock) | S1 | **yes** (S1 fixture) |
| 2 | `board unreachable` | `aof work ui` | S2 | **yes** (S2 fixture) |
| 3 | **`no fleet origin`** | **`aof mesh ui`** | **S1 only**, hosting a `mirror` on a board handed no fleet origin. **Structurally impossible on S2**, which is same-origin with the fleet | **no — unmocked; DESIGN governs** |

**Everything else about the pane is unchanged and already in §2:** the same centred dashed block
(`border:1px dashed #1e2a44`, `border-radius:6px`, `padding:12px 16px`, centred column `gap:4px`), cause
12px mono `#a1a1aa`, recovery 11px mono `#71717a`, hollow dashed dot, chip `unavailable`, header intact,
**no socket**, nothing red, no motion, **no control** (open question 7 holds for this cause too — the
command is text, never a button).

**What a reviewer does with this — three things:**

1. **Do not log the third cause's absence from any render.** DG-46-3 already says the whole state has no
   production producer in m46; this cause additionally has **no fixture row** — the locked `@manual`
   fixture-render scenario carries two Examples (board dock · fleet card) and gains none, and §Render
   targets R-A/R-D capture causes 1 and 2.
2. **If a render ever does show it**, judge it against the row above verbatim — the strings are fixed and
   are not the build's to vary.
3. **A render showing `board unreachable` on a board-hosted `mirror` that was handed no fleet origin is a
   GAP** — that is the wrong-cause failure this ruling exists to prevent. DESIGN also rules that a cause
   outside the three must never borrow one of the three pairs, which retires the conservative
   fall-back-to-`board unreachable` degrade the build shipped.

### 3f · NEW, second pass — two TEXT contrast findings against values THIS file quotes

Both are **raised in [DESIGN §The merged ramp](../DESIGN.md) and deliberately not ruled**, and both touch
a `#71717a` this file records as mock text. A reviewer **does not log either as a render GAP** — the
render is correct against the mock; the question is whether the mock's value should stand.

| # | Where this file quotes it | Measured `derived` | Note |
|---|---|---|---|
| **RAISED-1** | §2·S1 "field label `provider:` — `#71717a`", "identity label `item` — `#71717a`" | `#71717a` on `#0f1629` = **3.72:1** | fails AA (4.5:1) for text. DESIGN a11y 13 permits `text-zinc-500` for exactly these two labels; the exemption WCAG actually grants (*incidental*) does not cover a visible field label. |
| **RAISED-2** | §2·S1 and §2·S2 "unavailable recovery line `#71717a`" — **and now the third cause's `aof mesh ui`** | `#71717a` on `#0b0f14` = **3.98:1** | fails AA, and it is **the command the operator must type**. The in-ramp fix is `#a1a1aa` (**7.50:1** `derived`) — **but that would override a committed mock value**, so it is a PO decision by DESIGN's own conformance clause, not a designer's. |

---

## 4 · The behavioural rules the mock reveals

### 4a · CONFIRMED — the ended/error bar is paid for out of the terminal area, and the scale recomputes

**Your read is correct, and it is verifiable three ways.**

1. **Structurally, in the markup.** On all three surfaces the bar is a `flex:none` **sibling of the byte
   area inside the same `display:flex;flex-direction:column` box**. The byte area is `flex:1;min-height:0`.
   So the bar's height comes out of the byte area by construction, and the box's own height never changes.

2. **Arithmetically, on S2 — and it lands exactly.** `derived`: the byte box is 510×192.
   `min(510/640, 192/408) = 0.4706` → the mock's **`0.47`**. Subtract a ~29px bar: `163/408 = 0.3995` →
   the mock's **`0.40`**. **This is the identical 163 that DESIGN's constraint row records
   (`163 bytes + 29 bar = 192, constant`) and that the shipped suite already carries as a row.**

3. **By the delta, on both surfaces.** S2: `(0.47 − 0.40) × 408 = 28.6px`. S3:
   `(1.83 − 1.76) × 408 = 28.6px`. **The same number, twice** — and it is the bar's height. The delta is
   the binding fact; the S3 absolutes are approximations (§2·S3).

### 4b · `geometry.mjs` CAN already express it — derive, never hard-code

**Yes.** [`terminalFitScale`](../../../../../ui/src/terminal/geometry.mjs#L118) is a **pure function of the
measured box**:

```js
terminalFitScale({ intrinsicWidth, intrinsicHeight, boxWidth, boxHeight })
  // → Math.min(boxWidth / intrinsicWidth, boxHeight / intrinsicHeight)
```

and [`geometryPlanFor(source, box)`](../../../../../ui/src/terminal/geometry.mjs#L137) passes
`box.boxWidth` / `box.boxHeight` straight through to it. **No new function is needed and no module change
is required.** The module's own header already states the contract that makes this work: *"The module
invents no intrinsic size of its own — the caller measures and hands it in."*

**So the rule for the builder is:**

> The scale is `geometryPlanFor(source, { intrinsicWidth: 640, intrinsicHeight: 408, boxWidth, boxHeight })`
> where `boxHeight` is **C2's height after C3 has taken its own layout space** — i.e. the byte area is
> re-measured (or the bar's measured height subtracted) whenever the bar appears or disappears, and the
> plan is recomputed. **`0.47`, `0.40`, `1.83` and `1.76` must never appear in the source.** They are
> outputs of that call at four particular boxes, and two of the four are only approximate.

`test/terminal-core-geometry.test.mjs` already carries both halves of the S2 pair as rows —
`{ box: [320, 163] }` ("a short box, so height binds") is the reduced-box case at `163/408 = 0.3995`, and
`{ box: [1264, 280] }` is the dock. **What the suite does not yet carry is the pair asserted as a pair**:
that the same source in the same panel returns a *smaller* scale when the bar is present, by exactly the
bar's height ÷ 408. That is a cheap row to add and it is the one that would catch a hard-coded literal.

**And the contract already covers this behaviour** —
[`04/tasks/00_one-control-renders-both-sources.feature:241`](../stories/04_story_one-control-both-call-sites/tasks/00_one-control-renders-both-sources.feature#L241):
*"when the pane is full it is the byte area that shrinks by the bar's height, and the terminal **re-fits
or re-scales into the smaller box**"*, with the host's total height unchanged. **No PO decision is needed
for the rule itself** — only for the derivation discipline, which this document now fixes.

### 4c · Four more non-colour behaviours the mock reveals

| # | What the mock shows | Where | Status |
|---|---|---|---|
| **B1** | **A fit pane's output is bottom-anchored.** `out()` carries `display:flex;flex-direction:column;justify-content:flex-end` — the last line sits at the **bottom** of the byte area, as a real shell does. The **scaled** mirror stays top-left anchored (`transform-origin:top left`). **Two anchors, one per geometry mode**, where DESIGN stated only "top-left, on every surface" (which was about the scaled mirror). | S1 | DESIGN silent → **mock binds.** Not a contradiction: `geometry.mjs`'s `ANCHOR_TOP_LEFT` is a property of a `scale` plan and a `fit` plan already reports `UNSCALED`. |
| **B2** | **Dimming is on the glyph layer only.** The `#0b0f14` background stays fully opaque and the bar is never dimmed — so "opaque bar" and "dimmed pane" are two different layers, not one `opacity` on the container. | S1, S2, S3 | resolves a DESIGN ambiguity (O5) |
| **B3** | **Height binds at both S2 widths.** The 390 card keeps `scale(0.47)` because `340/640 = 0.531 > 192/408`. A reviewer can check the peek's scale is *unchanged* across the two widths — the panel narrows, the picture does not shrink. | S2 | new, checkable, consistent with `terminalFitScale` |
| **B4** | **`unavailable` reaches the open S2 panel, not just the collapsed one.** The fixture is `open: true` with `Hide terminal` and a visible `⤢` — i.e. the operator pressed Watch and got an unavailable pane, with a full 192px box holding the dashed block. DESIGN did not say which side of the toggle it lands on. | S2 | DESIGN silent → **mock binds** |

---

## 5 · PO decisions — the mock shows things no task `.feature` settles

**No `.feature` is edited. These are listed for the operator to rule on.**
**Three are now RULED (2026-08-08, [STATE §PO rulings](../STATE.md)); five remain open.**

| # | Item | Coverage today | The decision |
|---|---|---|---|
| **PO-1** | **The `streaming` word's lighter teal `hsl(174 58% 52%)`** (§3a) | **Trips a locked row**: `…04.feature:264` requires a value outside DESIGN's five to be *"raised before it is painted"* | **RULED 2026-08-08 — ADOPTED.** A sixth named constant in `palette.mjs` (DG-46-2's one home; **no `@theme` token**); DESIGN amended in the same change at [§The merged ramp CORRECTION 1](../DESIGN.md), which also carries the measurement for every other row. The dot does not move. **Closed.** |
| **PO-2** | **The `waiting` pane line `connected · waiting for first output`** (§3b) | **No `.feature` pins it.** `04/00.feature:248` pins only the *treatment* ("a top-left line inside the byte area"), not the string | **RULED 2026-08-08 — ADOPTED, on its own descriptor field**, never through `reason` (which would flip the chip to `no live output`). **Closed.** |
| **PO-3** | **Restart on a CLEAN exit.** The mock shows `↻` on `exited (0)` as well as on `error` | *Presence* is covered — `04/04.feature:119`. *Behaviour* is covered for `error` only — `04/01.feature:84`. **The `ended` case has no row**, and `04/01`'s affordance-**form** table (`:106-114`) has **no restart row at all** | **RULED 2026-08-08 — restart is offered on `ended` (including `exited (0)`) and on `error`, interactive host only**, and its form is a per-host affordance like the rest. The contract gap is **recorded, not edited**. **Closed as a design question; still a `.feature` gap.** |
| **PO-4** | **The pulse: `1.7s ease-in-out`, opacity 1 → 0.3** (O9) | No `.feature` pins the timing; `04/04.feature:221-222` pins only *which two states* pulse and that reduced-motion must not be the only difference | **OPEN.** Adopting it means a **custom keyframe**, replacing `palette.mjs`'s shipped `TERMINAL_MOTION_CLASS.pulse = "animate-pulse"` and needing its own `prefers-reduced-motion` scoping — a second motion home inside a milestone whose thesis is one home. Recommend: **keep `animate-pulse`** and record the mock's timing as non-binding, or adopt it *once*, in `palette.mjs`, with the reduced-motion scoping in the same change. |
| **PO-5** | **Off-scale values: the 7px dot (O10) and the pill's `0.08em` tracking (O8)** | unpinned | **OPEN.** Neither maps to a house step (dots ship at 6px/8px; Tailwind offers `tracking-wider` 0.05em and `tracking-widest` 0.1em). Rule: adopt as arbitrary values (`size-[7px]`, `tracking-[0.08em]`) — **or** snap to `h-2 w-2` and `tracking-widest`. This milestone otherwise adds no new scale step. |
| **PO-6** | **Icon family.** The mock draws Unicode glyphs (`↻ ⤢ ⌄ ⌃ ✕ ⊟`); DESIGN names lucide components | `04/04.feature` pins position, conditionality and hit target — not the glyph family | **OPEN.** The mock is an HTML spec and glyphs are its natural stand-in, so I read it as **binding on position/semantics/box, silent on family** → DESIGN's lucide set stands. `⊟` for exit-fullscreen is the one that reads as a genuine alternative to `Minimize2`. Confirm. |
| **PO-7** | **The collapsed dock's frame.** The mock's collapsed sample carries `border:1px solid #1e2a44` on **all four sides** + `border-radius:6px`, where the open dock is `border-top` only with no radius | `04/04.feature:118` pins only the handle's absence | **OPEN.** Likely the sample's presentation frame, but it is drawable either way. Recommend DESIGN governs: the dock is full-bleed, `border-top` only. |
| **PO-8** | **FLAG-1 and FLAG-2** (§1c) — a locked feature line that measures the wrong thing (192px total) and one that carries a wrong magnitude (250-300px band) | both are locked `.feature` text | **OPEN.** Rule how the reviewer is to read them. Both are already-known-good rulings colliding with locked prose; neither changes the design. *(STATE §Carried to the `@uat` gate records both for the human reviewer; DESIGN now carries FLAG-2's caveat inline.)* |
| **PO-9** *(new, second pass)* | **The two `#71717a` text findings** — the field labels at **3.72:1** and, more sharply, the **`unavailable` recovery command at 3.98:1** (§3f) | unpinned; DESIGN a11y 13 permits `text-zinc-500` for field labels and is silent on the recovery line | **OPEN, and raised rather than ruled precisely because the fix would override a committed mock value.** The in-ramp fix for the recovery line is `#a1a1aa` (7.50:1). Recommendation: fix RAISED-2, leave RAISED-1 — the recovery line is the one an operator has to *act on*. |

---

## 6 · Where the mock is SILENT — DESIGN still governs

**The mock is not a complete substitute for the checklist.** At every point below there is nothing to
supersede, so [`../DESIGN.md`](../DESIGN.md) binds in full.

**States with no fixture** — `connecting` (`connecting…`, pulsing `bg-secondary`, C2 empty) ·
`exited (N≠0)` (the failure ramp: `bg-destructive` dot, `text-red-400`) · `unknown` · the V10 variant
(`no live output` / `no live output — assignment failed · reclaimed`) · S3's `error` (only `streaming`
and `ended` are drawn) · **the `unavailable` state's THIRD cause — `no fleet origin` / `aof mesh ui`
(§3e), ruled in DESIGN after the mock landed and unrendered in m46 by contract.**

**Surfaces and breakpoints with no frame**

- **S1 hosting a `mirror`** — every S1 fixture renders `localText` (a fitted `local-pty`); `screen()` is
  used only by S2 and S3. **Change 5, the crop fix, is therefore unmocked.** DESIGN governs — *and a
  reviewer should expect a large band*: `derived`, a 640×408 screen in the dock's 1264×222 box scales to
  **0.544**, i.e. **348×222**, leaving **≈916px (72%) of empty `#0b0f14` on the right**. That is correct
  by the min-ratio rule, it is far larger than either mocked band, and it is the single most likely thing
  to be logged as a defect. Worth its own render. *(It is also the one S1 configuration that can reach
  the third `unavailable` cause — §3e.)*
- **S3 hosting a `local-pty` (R-G)** — the fitted overlay is unmocked.
- **768** (the desktop proxy) and **760×520** (R-B, the clamped default height) — no frame. DESIGN's
  height rule `min(280, floor(box/2))`, min 48, and its **216px at the desktop window** stand untouched.
- **S1 at 390** (R-C, "the header must not wrap") — no frame. Only S2's 390 is drawn.

**Rules the mock cannot show**

- **DG-46-1** — the mock's board hint above the dock is an "In progress" lane row, **not** a detail-panel
  action strip, so it does **not** settle whether an open dock covers the operator's buttons. DESIGN's
  close condition and the published dock inset stand.
- **DG-46-3** — the `unavailable` fixtures are exactly the fixture renders DESIGN requires; the mock
  neither adds nor removes a producer. **The third cause has no fixture at all** (§3e).
- **Every accessibility clause** — focus order, focus ring, `aria-live="polite"` on the chip, the
  keyboard-resizable separator, `role="status"` on the bar, radio semantics, the modal dialog's name and
  focus return, `prefers-reduced-motion`, and the pane's accessible name `<posture> terminal for
  <identity>`. A static mock can express none of these; DESIGN §Accessibility 1-13 binds in full — **and
  clause 13 now carries measured numbers rather than an assertion.**
- **The `read-only` pill's `title`** — *"This view mirrors the worker's terminal. It cannot type:
  keystrokes never reach the worker."* The mock renders the pill with no `title`; DESIGN's copy stands.
- **The non-blinking underline cursor** — the posture's second signal. A static mock shows a block
  cursor glyph (`█`) inside the fixture text on every surface, including the read-only ones; **that is
  fixture content, not a cursor declaration**, and it must not be read as one. DESIGN governs:
  `cursorBlink: false`, `cursorStyle: "underline"` on read-only mounts.
- **Collapse-keeps-the-session, Hide-closes-the-socket** — the two costs. Form is confirmed (chevron vs
  worded toggle); cost is `04/01.feature`'s.
- **Fullscreen adoption, `Esc`, focus return, "not a route"** — S3's five inherited clauses. The mock
  shows the always-visible exit control (clause 4's visible half) and nothing else.
- **Multi-provider layout** — the picker draws exactly one segment (`claude`). The well, the selected
  treatment and the lock are binding; the two-or-more layout is not shown.
- **Hover, focus and pressed states** beyond the four `style-hover` declarations quoted in §2.

---

## 7 · How to use this file in a review

1. Judge **region by region, in C0 → C1 → C2 → C3 order**, per surface, against §2.
2. For each state, check the four non-colour signals from §3 **before** any colour: the word, the dot's
   fill/shape, motion, and the mandatory cause line.
3. Treat §1b's eleven overrides as the **expected** result. A render matching DESIGN instead of the mock
   on any of them is a GAP against **this** file. **O1 and O2 are now also DESIGN's own answer** — the
   `streaming` word is `hsl(174 58% 52%)` and the `waiting` pane line is
   `connected · waiting for first output`; a render showing `text-primary`, or a pane line that merely
   repeats the chip word, is a GAP against both documents.
4. Treat §1c's two flags as known: measure **the 192px column and its constancy**, not a 232px total; and
   **derive** the letterbox band from the box rather than expecting 250-300px.
5. Do not log: the letterbox band (any size), S2's tiny glyphs, an unscaled mid-tick capture, the absence
   of an `unavailable` production producer, **the absence of the third `unavailable` cause (§3e), or
   either contrast finding in §3f** — the first four are named in
   [`04/tasks/04_the-two-terminals-agree.feature`](../stories/04_story_one-control-both-call-sites/tasks/04_the-two-terminals-agree.feature),
   and the last two are raised design questions, not render defects.
6. **Absent a render, the verdict is INCONCLUSIVE naming the missing render** — never inferred from
   component source. A *missing mock* is no longer a possible reason: the mock has landed and this file
   is its checkable form.
