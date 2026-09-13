# 49 · The terminals home — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### `/` is the terminals home
The application's root route is a routed surface inside the shell's crash containment that renders the
live terminals of the fleet; `ui/src/app/Landing.tsx` no longer exists, `SHELL_RENDERED_ROUTES` is
`["not-found"]`, and the four legacy query addresses (`?mode=fleet|board|assets|wat`) rewrite to their
paths by `replaceState`, preserving every other parameter and the fragment byte-for-byte.

### The grid of live panes
Every addressable session in the mesh renders as a tile carrying node, repo, work item where one
exists, agent state and a live terminal; tiles are ordered `(nodeId, repo, sessionId)` in the browser,
and each subscribed tile constructs a real `ws://…/ws/terminal-view?nodeId=…&sessionId=…` socket
through the product's own mount chain.

### The pane is a fourth host of the one terminal control
`HOST_GRID_PANE = "grid-pane"` declares all eight affordances — including each absence with its
reason — and `ui/src/home/session-mount.mjs` is the single author of a grid pane's posture, which is
derived from the feed axis and fails closed to a labelled read-only.

### Typeable panes on the fleet origin
A grid pane whose session can accept input is `POSTURE_INTERACTIVE` and types through m42's existing
tuple-bound seam; entry stays content-blind and byte-bounded by `MAX_TERMINAL_INPUT_BYTES`, delivery
stays session-exact through `liveSessionInputs`, and a pane can only type into the session its own
socket names.

### Invariant 4, amended rather than deleted
`acd-fleet-terminal-input-constrained` part 1 is now a surface→posture-home table covering all three
surfaces with per-surface floors and discovery-by-sweep; parts 2 and 3 are untouched, every prior
assertion survives verbatim, three are added, and no exemption list of any shape exists.

### The feed axis — a pane says whether anything will ever arrive on it
Pane truth is composed from a feed axis derived from wire fields the fleet already polls, beside m46's
subscription axis, with the precedence fixed in one place; a session that is addressable but has no
producer renders `idle` with a top-left `no live output` line and opens no socket.

### A bounded live-socket ceiling
`MAX_LIVE_PANES = 16` is arbitrated by one pure function over the whole row set, taking the
currently-subscribed set as an argument; priority allocates free slots and never evicts, a pane beyond
the cap is unsubscribed rather than refused, and retained tiles are counted against the cap rather than
hidden from it.

### Layout as a filter, persisted per operator
A per-origin browser preference behind one pure module that takes storage as an argument filters the
live index; it is never a source of rows, adds no route, no mutation and nothing on the wire.

### `needs-input` reaches the wire
`projectAssignment` appends `code` under `sessionId`'s own guard and `WorkAssignment` declares
`code?: string`, so the agent state the worker already produced survives the hop to the fleet face —
assignment-scoped, with no new reader and no rendering leaked into `ui/src/fleet/api.ts`.

### One repo, said once
The current-work line groups on the raw repo string and prints each distinct repo once with a count —
`working · aof ×2, demo (session)` — in the JS formatter and the Rust view-model alike, with a raw
U+00D7 sign in both shipped sources and a captured fixture that makes the cross-language gate red when
either half diverges.

### One live region for the whole grid
The terminals home announces state through a single polite region whose role follows the host's own
`hostAnnouncesState` declaration; the gate counts implicit `role="status"` regions beside explicit
`aria-live` ones.

### The pulse honours reduced motion
One unlayered `@media (prefers-reduced-motion: reduce)` block silences `.animate-pulse` beside the
`.aof-pending` the stylesheet already named, so all twelve `animate-pulse` sites across `ui/` stop
animating under the preference while every state stays distinguishable by word and colour.

### Claude sessions reach the index
The distributed bundle wires the three session-lifecycle events for Claude, so a workspace that runs
`aof work update` records its sessions into the index instead of leaving the terminals home empty
everywhere but this repo.

### The harness can drive a grid
The test harness mounts N controls from a caller-supplied entry with a per-pane driver, declares the
shell on the bundle the control reads, moves real focus and dispatches real keystrokes; an entry must
bundle the real control unless the caller declares `terminals: false`, and declaring it withholds the
pane driver entirely.

## Assumptions

- **A session reaches the grid only if its workspace fires the session hooks** — the index is a
  projection of session records, so a workspace on a build older than story 07 contributes no Claude
  sessions and its rows are absent rather than empty.
- **Addressability and streaming are separate facts** — `sendTerminalFrame` has exactly two call sites,
  both worker-execution, so a session can be in the index, open a socket, and never receive a byte.
- **A late subscriber gets a bounded tail, not nothing** — the mirror replays on subscribe within
  `MAX_TAIL_BYTES_PER_KEY` / `MAX_TAIL_KEYS`, and that burst is the largest term in the socket cap's
  argument.
- **The cap is a client-enforced product policy, not a browser limit** — measured headless Chromium
  holds 255 concurrent sockets to one origin; 16 is chosen from the replay burst, the 64-tuple LRU tail
  and main-thread contention.
- **Input rides the existing socket upgrade** — no new API mutation was added; `/api/mesh/assign`
  remains the fleet face's one write route.
- **The posture fails closed** — a pane whose feed axis cannot establish that input will be delivered
  renders as labelled read-only rather than accepting keystrokes, so a wrong answer is silent about
  nothing.
- **Layout persistence is per browser origin** — an operator's arrangement does not follow them to
  another machine or another browser profile, and clearing site data resets it.
- **Agent state is assignment-scoped** — `needs-input` is real only where an assignment exists, and the
  word is keyed exactly, never by a truthiness or nullish test on `code`.
- **The two surfaces sort by different collations** — the JS formatter orders repos by UTF-16 code unit
  and the Rust view-model by UTF-8 byte, which diverge only when an astral name meets a BMP name at or
  above U+E000 ([TECH_DEBT](../TECH_DEBT.md) item 37).

## Gaps

### Agent state for a free session
- **Status:** open
- **Discharge condition:** a signal exists for a session with no assignment that is not derived from
  terminal bytes — at which point the vocabulary and its mark are decided in one place, `ui/src/terminal/`.
The operator sees `needs input` on assignment-backed sessions and nothing at all on free ones: no
invented `working`/`done`, and deliberately no "unknown" badge. Deriving one by parsing terminal output
is refused by the mirror lane's content-blind design and by its fitness function.

### A pane on a `local-pty` origin
- **Status:** open
- **Discharge condition:** a consumer needs a board-origin socket, at which point the session index
  gains an origin-shaped field and `/api/mesh/board-url` gains the `origin` spike 44 asked for.
The session index carries `(nodeId, sessionId)` and nothing else addressing-shaped, so a row can only
resolve against the `mirror` row. A board's local-PTY session does not appear in this grid.

### A session that is addressable and permanently silent
- **Status:** open
- **Discharge condition:** a producer path exists that streams terminal frames for a session outside
  worker execution.
Such a pane is rendered honestly — `idle`, `no live output`, top-left, no socket opened — and that
honest rendering is the whole of what this milestone delivers for it. It is the state most sessions in
a freshly hooked workspace will be in.

### The read-only pane's own explanation
- **Status:** open
- **Discharge condition:** DESIGN K10's title copy ships alongside the K13 copy, so
  `input-policy.mjs`'s twelve dependents are opened once ([TECH_DEBT](../TECH_DEBT.md) item 42).
A pane that is read-only for a reason new to this milestone still explains itself with the fleet card's
sentence.

### Copy for a mesh that will not answer
- **Status:** open
- **Discharge condition:** the designer rules both — what a refused connection says, and whether a poll
  that fails while last-known content is on screen surfaces anything at all.
A refused connection renders `Could not load the mesh: fetch failed`, and a silent re-poll failure keeps
the last-known content and surfaces nothing. Both are behaviours no lane pins to a sentence, because
inventing the friendlier one in a test is what DESIGN's restraint clause refuses. The staleness marker,
when it is ruled, is a decision and belongs in `page-state.mjs`.

### `TerminalControl.tsx` has no headroom
- **Status:** open
- **Discharge condition:** the session effect is extracted, per the cut named in
  [TECH_DEBT](../TECH_DEBT.md) item 40.
The file finishes at exactly 840 lines against a ceiling of 840. The next author must extract before
appending; there is no room to add a line.

### The node card's work line yields nothing when it does not fit
- **Status:** open
- **Discharge condition:** DESIGN's rewritten rule R-2 is built — whole repo names yield from the tail
  into a trailing `+<N> more`, in the JS formatter and the Rust view-model in one commit.
The line has no truncation styling, so at seven distinct repos it wraps to three lines and grows the
card from 173 to 212px, breaking inside hyphenated repo names. In the fleet's `auto-fill` grid a grown
card stretches its whole row — the same unbounded growth the dedupe rule rejected one-line-per-session
to avoid, reached by another route. The full value is in `title` either way.

### The four page states do not share a top anchor
- **Status:** open
- **Discharge condition:** the failed state's box top-aligns with the empty and loading card at the
  container's padding edge.
Empty, runs-but-no-sessions and loading all begin at y=76; the failed state begins 42px lower. Its
width is the fleet treatment's by design; only the anchor differs.

### The operating system's own reduced-motion setting, confirmed end to end
- **Status:** open
- **Discharge condition:** an operator with Windows *Animation effects* OFF opens a surface carrying a
  live terminal state dot and watches it.
The CSS is proven — 16/16 state rows under a forced preference, and nine animating elements to zero on
the deployed `/fleet` with element counts unchanged. What is unproven is that Chrome on this Windows
build maps the OS toggle onto `prefers-reduced-motion`; a command-line switch proves the rule, not the
platform.
