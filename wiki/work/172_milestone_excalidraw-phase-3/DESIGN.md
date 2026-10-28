---
doc: design
---
# 172 · Excalidraw phase 3 — Design

## Intent

Talking to the architect about a diagram reads like a conversation beside the drawing, never like a
terminal under it. The operator asks at a shape and watches the answer being written into that
shape's thread; replies in the same place; and reads every conversation, proposal and waiting note in
one panel that never covers the shapes it is about. The canvas stays the largest thing on the page.

Where replies live (171 refine's open assumption) was decided by the operator at refine (172/01 Q1,
2026-10-27): **in the conversation panel**,
one thread per note, opened from the note's pin or from the panel itself (ARCHITECTURE ADR-003).

## Conformance source of truth

- **Mocks directory:** `mocks/` (committed under this milestone). The mocks are one page,
  `mocks/conversation.html`, in three states, rendered with headless Chromium at 1280×800 (and the
  streaming state at 768×800). Drafted at refine on 2026-10-27 and accepted by the operator there (172/01 Q2); each committed PNG is its surface's conformance source of truth, with the surface's checklist
  as the rubric for what a still image cannot show (motion, focus, timing).
- **No-mock rule:** a surface with no committed mock is judged by its binding checklist alone — "The
  architect's session state" below.
- 171's "Find in libraries" and "The draft changed elsewhere" are unchanged and keep 171's DESIGN.

## Render breakpoints

- **Breakpoints:** 1280 (desktop) and 768 (tablet). At 390 the SDK collapses to its own mobile UI,
  which this milestone does not change.

## Screens / surfaces

All render at `/diagram?ref=<item>&file=<ADR-NNN-slug.svg>` over a saved diagram with at least four
nodes and three notes, one of them answered and one waiting. Every colour is a console token
(`apps/ui/src/index.css` `@theme`) — `background`, `card`, `border`, `muted`, `muted-foreground`,
`foreground`, `primary` (teal), `accent` (crimson) — re-declared inside the SDK's container where the
SDK shadows them (171 RETROSPECTIVE R4). The overlay never uses the diagram's own palette.

### The conversation panel

- **Route:** `/diagram?ref=<item>&file=<ADR-NNN-slug.svg>`, the architect answering a question.
- **Committed mock:** `mocks/conversation-streaming.png` (1280) and
  `mocks/conversation-streaming-768.png` (768).
- **Layout & interaction:** the editor header across the top; below it the canvas, and to its right
  the panel, 380 px wide, full height. The panel's header names it "Architect" with the session state
  chip and a collapse control; under it two tabs, Conversations and Proposals, each with a count. The
  Conversations tab lists one card per thread, the open thread first and expanded, the rest collapsed
  to their subject, state and last turn. The open thread shows its turns oldest first — the operator's
  in a muted bubble marked "You", the architect's plain, marked "Architect" — and its reply field. The
  composer is pinned at the panel's foot. At 768 the panel is a drawer over the canvas's right edge,
  340 px, with a shadow; collapsing it leaves a slim tab on the edge to reopen it.
- **The live turn:** while the architect answers, its turn shows what it has done so far as a short
  activity list (a tick per finished step, a ring on the current one) and the answer text growing,
  with a primary-coloured caret at its end. When the answer is recorded the caret and activity go and
  the turn reads as any recorded turn.
- **Activity step wording (F-172-10):** now, with no step vocabulary, a step reads as the command it
  ran, shortened to the verb and its action ("aof diagram scene … --action context"), never a full
  path — the accepted fallback. Target (backlog: a vocabulary of the review command's steps): each
  step reads what it did, as the mock does ("Read the diagram as Mermaid", "Writing the answer"); a
  step outside the vocabulary keeps the fallback. Tick, ring and 11 px `muted-foreground` are unchanged.
- **Component choices:** cards, not a chat log — each note is its own conversation about its own
  shape, so a panel of cards keeps "what is this about" visible. "Show on canvas" selects and scrolls
  to the thread's shapes. Choosing a collapsed card opens it and closes the one that was open.

#### Binding checklist (mandatory)

- **Layout regions (in order):** editor header; canvas | panel. Panel: header (title, state chip,
  collapse); tabs (Conversations n, Proposals n); thread list; composer.
- **The components each region holds:** header — "Architect", the chip, a collapse button; thread
  card (collapsed) — subject, state text, last turn on one line; thread card (open) — subject, state,
  "Show on canvas", the turns, a reply field with Reply; composer — the label "Ask the architect"
  with "· about <selection>" (or "· about the whole diagram"), a text field that grows to six lines,
  Ask (primary), Save as note, and "<n> note(s) waiting · Review with the architect" when notes wait.
- **The states (empty / loading / error / populated):** no threads — "No conversations yet. Select a
  shape and ask, or ask about the whole diagram below."; loading — the list's skeleton for the first
  read only; error — one line above the list in `destructive`, the list kept; populated — the cards;
  answering — the open thread's state reads "Architect is answering…" in `primary`; read-only diagram
  — the composer and reply fields are absent, threads still read; empty diagram — the composer offers
  "Request a first draft" beside Ask.
- **The design ramp each uses:** panel `card` fill with a `border` hairline on its left; cards radius
  8, `border` hairline, the open card's border and a 1 px ring in `primary`; 12 px sans throughout,
  subjects and authors 600; times and state text 11 px `muted-foreground`; the operator's turns on
  `muted` with radius 8; 8–12 px padding; buttons radius 6, the console's focus ring.

### Ask architect at the selection

- **Route:** `/diagram?ref=<item>&file=<ADR-NNN-slug.svg>` with one shape selected and the field open.
- **Committed mock:** `mocks/conversation-ask.png`.
- **Layout & interaction:** as 171 placed it — the "Ask architect" action just above the selection's
  box, following it on pan and zoom, below the box when there is no room above. Choosing it opens the
  field in place: one line that grows to four, Ask and Cancel to its right, a one-line hint under it
  ("Enter asks · Shift+Enter new line · Esc closes"). Asking closes the field and opens the new
  thread at the top of the panel, answering. The panel's composer names the same selection ("· about
  Events route"), so either place asks the same question.
- **Component choices:** a labelled button, not an icon — a person who has never used it must read
  what it does. The field's border and ring are `primary` while it has focus.

#### Binding checklist (mandatory)

- **Layout regions (in order):** the selection's box; the action (or, open, the field) 8 px above it;
  the hint under the field.
- **The components each region holds:** action — one button "Ask architect"; field — a text input
  (placeholder "Ask about <label>"), Ask (primary), Cancel; hint — one line.
- **The states (empty / loading / error / populated):** no selection — nothing; selection — the
  action; open, empty — Ask disabled; asking — Ask reads "Asking…", inputs disabled; error — one line
  under the field in `destructive`, the text kept; done — the field closes and the thread opens in the
  panel; read-only diagram — no action.
- **The design ramp each uses:** `card` fill, `border` hairline, radius 6, 12 px sans, 8 px padding,
  a soft shadow; the input's focus border and 2 px ring in `primary`.

### Note pins

- **Route:** `/diagram?ref=<item>&file=<ADR-NNN-slug.svg>` with notes on shapes.
- **Committed mock:** the pins in `mocks/conversation-streaming.png` and `mocks/conversation-ask.png`.
- **Layout & interaction:** 171's pin on the top-right corner of each shape that holds a note, with a
  count when it holds more than one. `primary` when the architect has the last word, `muted-foreground`
  when the note waits, and `primary` with a 3 px `primary` halo while the architect is answering it.
  Choosing a pin opens its thread in the panel (and opens the panel if it was collapsed); nothing
  opens over the canvas.

#### Binding checklist (mandatory)

- **Layout regions (in order):** the pin on the shape's corner.
- **The components each region holds:** a dot, and a count when there is more than one note.
- **The states (empty / loading / error / populated):** no notes — no pins; waiting — muted; answered
  — primary; answering — primary with the halo; a note whose shape was deleted — no pin, its thread
  stays in the panel under "Whole diagram".
- **The design ramp each uses:** 12 px high, radius 6, 9 px 600 white count, a 1 px shadow.

### A proposal in its thread

- **Route:** `/diagram?ref=<item>&file=<ADR-NNN-slug.svg>` after the architect proposed a change.
- **Committed mock:** `mocks/conversation-proposal.png`.
- **Layout & interaction:** the architect's turn that proposed carries the proposal as a card inside
  the thread: its summary, what it changes ("1 edge relabelled · nothing else changes"), and Preview,
  Accept (primary) and Reject. Reject opens a one-line reason field in the card with Confirm reject and
  Cancel. The Proposals tab lists every proposal, newest first, with the same card and the thread it
  answers; a decided proposal shows its outcome in place of the buttons.
- **Component choices:** the card's left edge is `accent` — the one place the panel uses the focal
  colour, because a pending proposal is the one thing waiting on the operator.
- **Changes line wording (F-172-09):** now, while the proposal record carries counts but not the
  change's kind, the line reads the counts it has ("1 changed", "2 added · 1 removed"), zero counts
  omitted, and never names a kind it cannot know — the accepted fallback. Target (backlog: a
  change-kind on the proposal record): the line reads the change, as the mock does ("1 edge
  relabelled · nothing else changes").

#### Binding checklist (mandatory)

- **Layout regions (in order):** the turn's text; the proposal card — summary, changes, actions.
- **The components each region holds:** summary 600; changes line in `muted-foreground`; Preview,
  Accept, Reject (or the reason field with Confirm reject and Cancel).
- **The states (empty / loading / error / populated):** pending — the three actions; previewing — the
  changed shapes selected on the canvas and a one-line note under the card; accepting — Accept reads
  "Accepting…"; error — one line under the card in `destructive`; accepted / rejected — the outcome
  ("Accepted 14:05", "Rejected — <reason>") replaces the actions; read-only — no actions.
- **The design ramp each uses:** card on `background`, `border` hairline with a 3 px `accent` left
  edge, radius 6, 8 px padding, buttons radius 6.

### The architect's session state

- **Route:** `/diagram?ref=<item>&file=<ADR-NNN-slug.svg>`, the panel's header.
- **Committed mock:** none for the states other than "Answering" and "Idle" — the checklist is the
  source of truth.
- **Layout & interaction:** the chip beside the panel's title says what the architect's session is
  doing; it is the only place the session is visible — there is no terminal.

#### Binding checklist (mandatory)

- **Layout regions (in order):** the panel header's chip.
- **The components each region holds:** a dot and one or two words.
- **The states (empty / loading / error / populated):** no session — "Not started" (muted); starting —
  "Starting…" (primary tint), and the open thread says "Starting the architect…" until the first
  text arrives; answering — "Answering" (primary tint); idle — "Idle" (muted); ended — "Ended"
  (muted), with the reason as the chip's title; unavailable — "Unavailable" (muted), and the composer
  shows the command to run in a Claude session with a Copy button, as 170 did; a turn whose tool was
  denied — the thread shows one `muted-foreground` line "The architect was not allowed to <tool>";
  a turn that ends without a recorded answer — the streamed text is replaced by one line "The
  architect stopped before it answered" with an "Ask again" button that re-delivers the note.
- **While text streams,** the open thread follows the growing answer unless the operator has scrolled
  up in it; scrolling back to the bottom resumes following.
- **The design ramp each uses:** chip radius 999, 11 px, 1 px × 8 px padding; `muted` on
  `muted-foreground`, or `primary` on a `primary` tint.

## Behavioural outcomes (cross-reference)

- The architect's session runs headless and streams its turns — story 00's tasks
- Every conversation surface in one panel — story 01's tasks
- The answer streams into its thread with no terminal — story 02's tasks
- A right-click leaves the drawing true — story 03's tasks
