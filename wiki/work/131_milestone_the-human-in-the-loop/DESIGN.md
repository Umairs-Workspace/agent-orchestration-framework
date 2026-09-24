---
doc: design
---
<!--
  Milestone DESIGN.md — how should it look and feel, and why.
  Owner: designer. Layout / component / visual intent only.
  UI BEHAVIOUR lives in task .feature files — cross-referenced at the end, not specified here.
-->
# 131 · The human in the loop — Design

## Intent

A waiting session asks **one question in one shape** on four surfaces: the board's amber card, the
terminal account line, the Discord message, and (unchanged) the home grid's `needs input` mark. The
feeling is **a colleague's question, not an alarm**: amber means "a person is being waited on"
(never red, it is not a fault). The reply takes **words, not a click**. Gothelf's "no fast path"
(STATE 2026-09-23) holds on every surface: there is no `Continue` / `Approve` / `Skip` button, no
prefilled or suggested text, and no placeholder that reads like an answer. What the operator types
is sent and recorded **verbatim**, so a later reader can tell a decision from a nudge.

## Conformance source of truth

> **NO MOCK WAS ELICITED.** No `mocks/` exists for 131, and this refine ran unattended. Per
> **07/ADR-003** the **binding checklist under each surface is the conformance source of truth**. A
> mock produced later lands in `mocks/` and becomes the visual truth, with these checklists as the rubric.

- **Render route (surface 1):** the board detail panel on a fixture item in each state below, at
  **1280×800 and 760×520** (DG-46-1's measured frame). Surfaces 3–4 are **not judged by screenshot**.
  They are judged by their rendered strings against the examples here, as golden fixtures.

## The one shape, shared by every surface

| Part | Rule (one pure formatter, homed by the architect, read by all four surfaces) |
|---|---|
| **headline** | `<ref> — <event phrase>`, e.g. `127/02 — waiting on you` |
| **cost** | `(<phase>, <elapsed>)`. `phase` ∈ `refine`/`build`/`verify`. Omitted whole when the event has no phase |
| **elapsed** | `<n>s` under 1 min · `<n>m` under 1 h · `<h>h <m>m` under 1 day (`3h` when m = 0) · `<d>d <h>h` beyond. No `ago`: it is a wait, not a timestamp. |
| **one-line ask** | the question with every whitespace run (newlines included) collapsed to one space, clipped at **100 characters** on the last word boundary (a hard cut if none falls in the last 20), plus `…` when clipped |
| **the ask** | the session's last message **verbatim** (one reader: the transcript). Never re-worded or summarised. Markdown is never interpreted on the board (see §1) |

Event phrases: `waiting on you` · `answered by <who>` · `parked, unanswered` · `loop halted on <stop>` ·
`loop died` / `loop relaunched` · `accepted`. **One elapsed format everywhere.** The board's
`relativeTime` ("12m ago") stays the run-history format and is not reused for the wait.

---

### 1 — The board: the ask card

**Where.** It is the **first child of the detail panel's body scroll region**, above the active tab's
content, on **every tab**. The header yields first under height pressure (DG-46-1) and cannot host a
textarea. The provenance box's line 1 (`waiting for your input on <node>`, `DetailPanel.tsx:240-243`)
stays as it is. The card is a **child component in its own module**, because `DetailPanel.tsx` is at
995 of its 1,000-line ceiling and gains one call. Where the module lives is the architect's call: the
`board/` directory is at its 24-file ceiling. The card keys on **the ask fact**, not on
`item.execution`. A loop lane on this machine has no mesh overlay and must still show the card. The
architect names the field. FF-5307 re-pins with the reason "an ask face, not a loop face": the card
shows no cycle, level or loop state.

**Anatomy (top → bottom), inside `rounded-md border border-amber-500/40 bg-amber-500/5 p-3 space-y-3`.**
This is `CurrentRunStrip`'s frame (`DetailPanel.tsx:874`) with the board's one existing amber (`:241`)
in place of primary.

1. **Heading row.** `flex items-center gap-2`. It holds an amber dot (`inline-block h-2 w-2
   rounded-full bg-amber-500`, `aria-hidden`), then `WAITING ON YOU` in the section-heading idiom
   (`text-[11px] font-semibold uppercase tracking-wide text-foreground`), then at `ml-auto` the cost in
   the `RunHistory` meta idiom (`mono text-[11px] text-muted-foreground`): `build · 12m`, plus
   ` · on aof-wsl` when the lane is on another node. The elapsed ticks on the board's 1 s `now`.
2. **The question.** Plain text in `whitespace-pre-wrap break-words text-sm leading-relaxed
   text-foreground`, **never `<Markdown>`**. `Markdown.tsx:5-12` renders unsanitised HTML and
   trusts only local doc files. A session's last message is model output that may echo a hostile
   repo's text, from another node. Fence markers show literally. **Truncation:** it is clamped at 6
   lines (`line-clamp-6`). When clamped, a text button below it reads `Show the full question` /
   `Show less`, in the link-button idiom of `· open terminal →` (`:261-268`: `text-xs
   text-muted-foreground underline underline-offset-2 hover:text-foreground`). Expanded, the text
   runs full height with no inner scroll, because the body region scrolls.
3. **The reply.** A visible `<label>` (`text-[11px] font-semibold text-muted-foreground`) reads `Your
   answer`. The `<textarea>` uses the `ActionsStrip` composer's classes verbatim (`ActionsStrip.tsx:117`,
   `min-h-20 w-full rounded-md border border-input bg-card p-2 text-sm`) plus the `Textarea`
   primitive's focus ring (`focus-visible:ring-2 focus-visible:ring-ring`). It is **empty on
   mount, with no placeholder and no suggested answer**. A helper line follows in `text-xs
   text-muted-foreground`: `Sent to the session word for word and kept on the run record.` On a
   remote lane it adds ` Delivered to <node>.` Then comes **one** right-aligned button: the composer's
   Submit, verbatim (`ActionsStrip.tsx:126-134`, the primary fill + lucide `Send` icon), labelled
   `Send answer`. It stays **disabled until the text is non-blank**. It has no second button and no
   Enter-to-send (Enter is a newline).
4. **Message slot.** The `ResultLine` idiom (`ActionsStrip.tsx:147-151`): `mono text-xs`, with
   `aria-live="polite"` and always present.

**The client** is a `workApi.answer({ ref, text, actor })` POST. It is shaped like `resync`
(`api.ts:297-305`) and throws `codedError` so the card shapes its word from the code. `who` is the
board's existing `actor`. **The header's primary button** stops saying `Answer on <node>`
(`action.mjs:42-44`) while the card is shown, and reads `Open terminal — <node>`: one answer door
per surface, and the recorded one. Without the ask fact (an older worker), today's label stands.

#### Binding checklist (mandatory — this IS the baseline)

- **Regions (in order):** header (unchanged) → tabs (unchanged) → body: **ask card** → the tab's
  content (unchanged) → footer actions (unchanged). With no ask the panel is **byte-identical to today**.
- **Components:** the amber-framed card · the heading row (dot · `WAITING ON YOU` · mono cost) · the
  plain-text question + show-all toggle · the label, textarea and helper line · ONE `Send answer`
  button · the message slot. No chip, pill, badge, icon other than `Send`, default or quick-reply
  button, template picker, or `<Markdown>`.
- **States:**
  - *No ask:* no card.
  - *Loading:* the question region reads `Loading the question…` (`mono text-sm
    text-muted-foreground`, the `Loading runs…` idiom). The reply is usable.
  - *Question unreadable:* the dashed absent box (`rounded-md border border-dashed border-border p-4
    text-sm text-muted-foreground`) reads `The session's question could not be read — open its
    terminal to see it.` The reply is still usable.
  - *Waiting:* as the anatomy above. A long question is clamped with its toggle.
  - *Sending:* the textarea is `readOnly`, the button is `disabled` + `aria-busy` and reads `Sending…`.
  - *Answered:* the reply region is replaced by `✓ Answered by <who> · <elapsed> — the session is
    resuming` (`mono text-xs text-primary`). The answer follows verbatim in `whitespace-pre-wrap
    border-l-2 border-border pl-3 text-sm`. This is **held until the wire drops the ask**, never
    decayed on a timer back to an empty box. Then the card is gone, and the answer lives in RUNS.
  - *Parked, unanswered:* the heading reads `PARKED — UNANSWERED` and the cost reads `build · asked
    3h 10m · parked 1h`. The line `The session stopped waiting at its bound. Your answer resumes it.`
    sits above the reply. The button reads `Send answer and resume`. The amber frame is kept.
  - *Send error:* the slot shows `✕ <what happened>` in `mono text-xs text-accent` (the board's error
    token), with the server sentence in `title`. The typed text is **kept** and the button re-enables.
    Words: `Not sent — the session is no longer waiting` · `Not sent — <node> is unreachable` ·
    `Not sent — <server sentence>`.
  - *Remote lane:* `· on <node>` in the cost and `Delivered to <node>.` in the helper. Everything
    else is identical, and the provenance box's `open terminal →` stays the viewport.
- **Ramp:** amber (`amber-500`, the one the board already paints) is **border, tint and dot only,
  never text**. `amber-500` on white is about 2.2:1. The words carry the state. The text uses
  `foreground` / `muted-foreground`, the receipt `primary`, the error `accent`, and the button the
  primary fill. No new token, hex, motion or pulse.

### 2 — The home grid and fleet: no change

The tile's `needs input` mark (`TerminalIdentity.tsx:205-207`, DG-49-3) stays one word. The tile
**is** the live mirror, and the question is on screen in its pane. A second copy in an 11 px pill
would compete with it, and a truncated copy would be the worse of the two. No fleet node-card line
is added. A parked session has no tile, and Discord and the board carry it.

### 3 — The Discord message

**Plain `content`, no embed.** A phone's push notification previews `content` and shows nothing
useful for an embed-only message, and reaching the human where they are is the point. Plain content
also gives one 2,000-character budget to reason about, and the text renderer is reusable by the next
channel. Every post sets `allowed_mentions: { parse: [] }`, so a question that contains `@everyone`
pings no one. `username` is `aof`.

**One shape, at most four lines, parts omitted when absent (never a placeholder):**

```
**127/02 — waiting on you** (build, 12m) · aof-wsl
<the ask, verbatim, truncated by the rule below>
Answer: `aof work answer 127/02 "…"`
<link>
```

| Event | Line 1 (bold headline, cost, node) | Body | Action line |
|---|---|---|---|
| needs-input | `127/02 — waiting on you` (build, 12m) | the ask | ``Answer: `aof work answer 127/02 "…"` `` |
| answered | `127/02 — answered by umair` (build, 12m) | the answer, verbatim | `The session is resuming.` |
| parked-unanswered | `127/02 — parked, unanswered` (build, 3h 10m) | the one-line ask | ``Answer to resume: `aof work answer 127/02 "…"` `` |
| loop halt | `127 — loop halted on <stop>` at `<ref>` | the remedy sentence | ``Resume: `aof work loop 127 --resume` `` |
| death / relaunch | `127 — loop died` / `127 — loop relaunched` | the cause, if known | death: the `Resume:` line · relaunch: none |
| accepted | `131 — accepted` | the milestone title | none |

**Truncation.** Line 1, the action line and the link **never truncate**. The body takes what is left:
`2000 − (every other line + newlines)`. It is clipped on the last word boundary, then `…` and
` (continues at the link)` (or ` (continued in the terminal)` when there is no link) are appended.
If the clip leaves an odd number of ```` ``` ```` fences, a closing fence is appended **before** the
suffix, so an open code block can never swallow the answer command.

### 4 — The terminal account line

`127/02 — waiting on you (build, 12m): <one-line ask>`. It is headline + cost + `: ` + the one-line
ask from the shared table, so it is the same words as the card's heading and the Discord line 1. In
the wave's repeating account it stays **one line** and is repainted with the elapsed value. When the
loop **halts** on an ask (a primary drive), the line is followed by the full ask indented two spaces,
then `  answer: aof work answer 127/02 "…"`. Other forms: `127/02 — parked, unanswered (build, 3h
10m): <one-line ask>` and `127/02 — answered by umair (build, 12m)`.

## Documented defaults (decided here, not blocking)

1. One formatter for the headline, cost, elapsed and one-line ask. The one-line clip is 100 characters.
2. The board card is the body's first child on every tab, in its own module. Line 1 of the
   provenance box is unchanged.
3. The question is plain `pre-wrap` text, never `<Markdown>`, clamped at 6 lines with a toggle.
4. The reply has no placeholder, no default and no quick answers. Send stays disabled while the text
   is blank, and Enter is a newline.
5. Amber is never text. The receipt holds until the wire drops the ask.
6. While the card shows, the header primary reads `Open terminal — <node>`, not `Answer on`.
7. Discord uses plain content, no mentions, and four lines at most. Only the body yields.
8. The home grid and fleet are unchanged.

## Behavioural outcomes (cross-reference — scenarios, not design)

- A waiting item's panel shows the card with the ask verbatim, its phase and elapsed wait, and an
  empty reply box. Send is disabled until the text is non-blank. No other answer button exists.
- Sending posts the text verbatim with the actor. The card shows `Answered by <who>` and holds it
  until the ask leaves the wire. A refusal keeps the text and names the outcome.
- A parked lane's card offers `Send answer and resume`. The same verb resumes it.
- While an ask stands, the header primary reads `Open terminal — <node>`.
- The Discord body for a 3,000-character ask is ≤ 2,000 characters, keeps line 1, the answer command
  and the link intact, and closes any fence it cut.
- The terminal account line, the card heading and Discord line 1 carry byte-identical `<ref> —
  <phrase> (<phase>, <elapsed>)` for the same envelope.
- **`@uat` visual review:** the card reads as a question awaiting a considered answer, not an alert
  or a confirm dialog. The reply box reads as "write", not "click" (1280 and 760×520).
