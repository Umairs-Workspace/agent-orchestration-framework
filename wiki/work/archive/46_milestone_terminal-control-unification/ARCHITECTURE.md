---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: how did we decide to build it, and why that way?
  Owner: architect. A log of ADRs: numbered, IMMUTABLE, superseded-not-edited.
  Does NOT contain observable behaviour (→ task .feature files) — only the structure behind it.
-->
# 46 · One terminal control — Architecture Decisions

> Inputs: `SPEC.md` (one terminal control, parameterised by session source; both call sites re-homed
> and the duplicate DELETED in the same milestone; `FLEET_PORT` retired; the existing fitness locks
> stay green and invariant 4 survives), `STATE.md` (two entries: the PRD's "two-and-a-half
> implementations" is stale, and the arch-test coupling must be watched), and two BINDING upstream
> documents:
>
> - **[44 · spike: terminal-origin-boundary](../44_spike_terminal-origin-boundary/SPIKE.md) — `done`,
>   and its `## Finding` / `## Outcome / Next` are AUTHORITY here, not evidence.** Where the spike
>   decided something, this log cites it and encodes it; it does not re-derive it and it does not
>   re-open it. The three decisions it hands down: direct-dial with each side learning the other's
>   ORIGIN as a served fact; a session-source list of exactly TWO (`local-pty`, `mirror`) with
>   relayed-`local-pty` **structurally impossible and forbidden to build**; and geometry keyed on
>   far-end resizability.
> - **[45 · ui-app-shell-routing](../45_milestone_ui-app-shell-routing/ARCHITECTURE.md) — shipped
>   (`14ac6e1`), and its ADR-005 is a CONTRACT written for this milestone.** Every primitive m46
>   needs already exists on disk and was read here: the three region constants
>   ([shell-layout.mjs:35-41](../../../../ui/src/app/shell-layout.mjs#L35-L41)), the z ladder with
>   `z-30` reserved for this dock ([:611](../../../../ui/src/app/shell-layout.mjs#L611)), the published
>   chrome height ([:274](../../../../ui/src/app/shell-layout.mjs#L274),
>   [:278](../../../../ui/src/app/shell-layout.mjs#L278)), the two content modes with `content:fixed`
>   BINDING for a terminal-hosting surface ([:369-382](../../../../ui/src/app/shell-layout.mjs#L369-L382),
>   [:393](../../../../ui/src/app/shell-layout.mjs#L393)), and the fullscreen door whose whole shape was
>   fixed for this milestone's caller
>   ([shell-bus.mjs:115-135](../../../../ui/src/app/shell-bus.mjs#L115-L135)).
>
> **Memory recall — run before the first ADR, and it came back NON-empty.**
> `aof work memory recall "one terminal control extracted, session-source parameterisation, origin
> not a port" --area architecture --block` surfaced five prior ADRs. Each is HONOURED below; none is
> departed from, and the two that came closest to a near-miss are named at the point they bind:
> - **m03/ADR-003** — *"the terminal transport is node-pty@1.1.0 + ws@8 at `/ws/terminal` with a tiny
>   envelope; the provider seam is vibeyard's `CliProvider` ported under MIT attribution; a missing
>   provider binary surfaces as an error control-frame, never a crash."* Honoured three times, and it
>   is the reason ADR-008 rejects a `ready` handshake (the envelope stays frozen), the reason ADR-001
>   carries the attribution obligation with the moved files, and the reason ADR-005's reconciled ramp
>   keeps an honest-degrade state rather than a spinner.
> - **m03/ADR-001** — *"one `http.createServer` carries the board's HTTP API and the terminal
>   WebSocket; the route namespaces are disjoint by design."* Honoured by ADR-004: the board learns the
>   fleet origin from a route on **that same server**, not from a new one.
> - **m38/ADR-012** — the fleet face's ONE mutation carve-out. Honoured by ADR-004: everything this
>   milestone adds on the fleet side is a `GET`, so the bounded-write posture is untouched (the spike
>   checked this at source too, sub-question 3).
> - **m38/ADR-013** — the worker's interactive `claude` PTY per assignment and its captured
>   `session_id`. Honoured by ADR-002: `mirror` is addressed by `(nodeId, sessionId)` and by nothing
>   else.
> - **m08/ADR-001** — *"CLI-as-contract over ONE shared in-process command core."* Honoured by
>   ADR-004's ruling that the standalone fleet-origin fallback is resolved in the **command layer**,
>   which is the layer already allowed to know both faces.
>
> **Codebase-graph grounding — rebuilt over the PROJECT ROOT at this refine.** `aof graph build .`
> (no `--backend`: the code-only build, no API key, `egress: none`) reported **8,759 nodes / 20,964
> edges, `builtAt` 2026-08-08T15:05:56.402Z**. `aof graph impact` was then read back per file. The
> edges below are cited as ACTUAL structure, not inference:
> - `ui/src/board/TerminalDock.tsx` ← **(1)** `ui/src/board/Board.tsx`; → `terminal/dock-state.mjs`,
>   `terminal/provider-picker.mjs`, `terminal/resize.mjs`, `lib/utils.ts`.
> - `ui/src/fleet/terminal-view/FleetTerminalView.tsx` ← **(1)** `ui/src/fleet/Fleet.tsx`; →
>   `fleet/api.ts`, `geometry.mjs`, `stream.mjs`, `view-state.mjs`.
> - `dock-state.mjs` / `resize.mjs` / `provider-picker.mjs` ← **(2)** their own `.tsx` +
>   `test/terminal-dock.test.mjs`; outward edges: **none**.
> - `stream.mjs` ← **(3)** its `.tsx` + `test/fleet-terminal-view-surface.test.mjs` +
>   `test/fleet-terminal-view-producer-fed.test.mjs`; outward edges: **none**.
> - **`geometry.mjs` ← (1) its own `.tsx` and NOTHING else — no test importer at all.** Confirmed
>   beyond the graph: `grep -rn "WORKER_TERMINAL_COLS\|terminalFitScale\|geometry.mjs" test/ scripts/`
>   returns **zero hits**, and the file
>   `test/fleet-terminal-view-geometry.test.mjs` that
>   [geometry.mjs:20-23](../../../../ui/src/fleet/terminal-view/geometry.mjs#L20-L23) names as its own
>   pin **does not exist**. See §Codebase health finding 1.
> - **`view-state.mjs` → `ui/src/fleet/assignments.mjs` is the ONLY outward edge any of the five
>   helpers has**, and it is a fleet-DOMAIN edge
>   ([view-state.mjs:18](../../../../ui/src/fleet/terminal-view/view-state.mjs#L18),
>   [:46-51](../../../../ui/src/fleet/terminal-view/view-state.mjs#L46-L51)). ADR-005 severs it.
> - `ui/src/fleet/Fleet.tsx` → **12** modules, **five** of them under `ui/src/board/` (`StaleBadge`,
>   `api`, `freshness`, `runs`, `status`) — the board-as-shared-library shape that is TECH_DEBT 18a.
> - `src/terminal-ws.mjs` ← **(3)** `mesh-worker-execution.mjs`, `setup-ui.mjs`, one test — **no edge
>   to any `ui/` file**, which is what makes ADR-008 a self-contained server-side fix.
> - `src/mesh-ui-serve.mjs` ← **23** dependents (most of them arch tests) and → `src/board-serve.mjs`.
>   **That last edge is load-bearing for ADR-004: the reverse import would close a cycle.**
>
> The graph informs; it does not rule. Every boundary below is the architect's call.
>
> **Corrections to this milestone's own citations, measured 2026-08-08 at `14ac6e1`.** Recorded here
> because a stale pointer in a SPEC becomes a wrong edit in a story:
> - SPEC says the fleet card peek is mounted at `Fleet.tsx:675`. It is at
>   **[Fleet.tsx:759](../../../../ui/src/fleet/Fleet.tsx#L759)**.
> - The spike's `## Outcome / Next` table marks `mirror` "interactive: yes (since m42)". True of the
>   BOARD dock's remote lane ([TerminalDock.tsx:261-263](../../../../ui/src/board/TerminalDock.tsx#L261-L263));
>   **false, deliberately, of the FLEET peek**, which is read-only in fact
>   ([FleetTerminalView.tsx:170-172](../../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L170-L172))
>   and must stay so until m49. Interactivity is therefore **capability × posture**, not one flag —
>   ADR-002 encodes the split.
> - `FLEET_PORT` is declared at [TerminalDock.tsx:78](../../../../ui/src/board/TerminalDock.tsx#L78) and
>   consumed inside `mirrorWsUrl` at [:440-445](../../../../ui/src/board/TerminalDock.tsx#L440-L445).
> - There are **two** `new Terminal(` construction sites under `ui/src` today
>   ([TerminalDock.tsx:148](../../../../ui/src/board/TerminalDock.tsx#L148),
>   [FleetTerminalView.tsx:166](../../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L166)), and
>   they are **not** identical: the dock loads `WebLinksAddon`
>   ([:163](../../../../ui/src/board/TerminalDock.tsx#L163)) and the peek does not. Two implementations
>   behind one name have already drifted by one addon.

---

## ADR-001: The one control lives in a NEW top-level `ui/src/terminal/` — NOT in `ui/src/app/`, not in either surface's folder; ALL of its logic is framework-free `.mjs` and the `.tsx` is a thin consumer, and that split is an INVARIANT rather than a preference

**Status:** Accepted
**Date:** 2026-08-08

**Context.** The control leaves `ui/src/board/`, because a shared thing living in one consumer's
folder is exactly TECH_DEBT item 18(a)'s shape — measured there as `ui/src/fleet/` reaching into
`ui/src/board/`, and re-measured on the graph at this refine as **five** `Fleet.tsx → board/` edges.
Milestone 45 half-paid that debt by creating `ui/src/app/` for the shell and the router, and left a
review rule behind: *"A story here that puts a shared primitive into `board/` or `fleet/` instead of
`app/` should be refused at review"* ([45/ARCHITECTURE.md, health finding
2](../45_milestone_ui-app-shell-routing/ARCHITECTURE.md)).

Applied literally, that rule says `ui/src/app/terminal/`. **It is honoured in substance and departed
from in letter, and the departure is the decision this ADR makes.** m45's rule was about SHELL
primitives — the things that HOST a surface: the route table, the regions, the nav, the layout
vocabulary, the bus. A terminal control is not a host; it is hosted. `ui/src/app/` currently holds
exactly that host set and nothing else (13 files, all shell/router). Folding a domain component into
it would silently redefine `app/` as "everything shared", which is the precise under-description that
turned `board/` into the shared library in the first place. Doing the same thing one directory over,
in the milestone that exists to undo it, would be the joke telling itself.

The second half of the decision is not a style question. **This repo has no React test harness** — no
vitest, no testing-library — so a decision that lives in JSX is a decision no test can reach. Every
UI surface here already keeps its logic in framework-free `.mjs` beside the component
(`ui/src/fleet/scope.mjs`, `ui/src/board/{runs,action,freshness,resync}.mjs`,
`ui/src/board/terminal/*.mjs`, `ui/src/fleet/terminal-view/*.mjs`, and m45's `ui/src/app/*.mjs`), and
m45/ADR-001 states the rule outright. The three headless harnesses prove the negative: all three stub
the terminal out by MODULE PATH because it wants a real DOM
([board-app-harness.mjs:37,:53](../../../../test/support/board-app-harness.mjs#L53),
[fleet-app-harness.mjs:31,:34](../../../../test/support/fleet-app-harness.mjs#L34),
[shell-app-harness.mjs:31-32](../../../../test/support/shell-app-harness.mjs#L31-L32)). Anything left in
the `.tsx` is, by construction, untestable in this repo.

**Decision.**
- **The home is `ui/src/terminal/`** — a new top-level sibling of `app/`, `board/`, `fleet/`,
  `config/`, `components/`, `lib/`. It is the **7th** top-level directory under `ui/src`, named here
  rather than discovered later (the same discipline m45 used when it named `src/static-serve.mjs` as
  the 109th flat root module). It is a DOMAIN folder: the terminal control, its session-source table,
  its state ramp, its geometry and its URL construction. Nothing else lands in it.
- **The split is: ALL logic in `.mjs`, the `.tsx` is a thin consumer.** The `.tsx` may hold JSX,
  refs, effects and the xterm/DOM calls that only a browser can make. Every DECISION — which URL,
  which geometry mode, which state, which copy, whether input is wired, what the drag clamp is —
  lives in a `.mjs` module that plain `node` can import with no bundler and no DOM. Each `.mjs` gets
  a `.d.mts` sibling, as every existing helper here does.
- **The `.mjs` set touches no `window` and no `location`.** It receives them. This is
  `ui/src/app/routes.mjs`'s rule and `ui/src/app/shell-nav.mjs`'s
  ([:15-21](../../../../ui/src/app/shell-nav.mjs#L15-L21), where resolvability is an INPUT precisely so
  the module stays headless), and it is what makes ADR-004's origin handling testable at all.
- **This is an INVARIANT, not a default.** A story that puts a decision in the `.tsx` because it was
  quicker has removed it from the test suite, and no reviewer reliably notices an absence.
  `acd-terminal-control-boundary` (see §Fitness functions) fails CI on a React or DOM import in the
  `.mjs` set.
- **The vibeyard MIT attribution TRAVELS with the derivation.** The moved files carry their
  "Adapted from … vibeyard … (MIT)" headers, and
  [acd-vibeyard-attribution.test.mjs:14-27](../../../../test/arch/acd-vibeyard-attribution.test.mjs#L14-L27)'s
  file list moves with them. This is a licence obligation, not housekeeping: the list is hard-coded,
  so a move without an update fails loudly (`readFile` throws) — which is the correct behaviour and
  must not be "fixed" by deleting the entry.

**Alternatives rejected.**
- **`ui/src/app/terminal/`** — rejected above: it redefines `app/` as the shared-everything folder and
  re-creates 18(a) in the new location. The condition that would overturn this: if `ui/src/` grows a
  genuine, declared shared layer (18(a)'s own fix, `ui/src/shared/` or `ui/src/ramps/`), the terminal
  control belongs under it and this folder moves with the rest.
- **Leave it in `ui/src/board/terminal/` and have the fleet import it.** That is literally the
  measured defect: five `fleet → board` edges already exist and the graph reports them as the fleet
  depending on the board, which is not the relationship. A sixth would be added by the one milestone
  chartered to reduce coupling.
- **A `ui/` package or workspace boundary.** Rejected as disproportionate: this is one component with
  two consumers in one bundle, and a new build boundary would be paid by the SEA payload and three
  origins for no structural gain.

**Consequences.**
- Both surfaces import DOWN into a domain folder; neither imports the other for terminal code.
- Five arch tests and three harnesses carry file paths into this folder (enumerated in ADR-006).
- `ui/src` gains a 7th top-level directory. Named, justified, and net **file-negative** on the terminal
  subtree: two components and six helpers (plus six `.d.mts`) become one component and one helper set.

---

## ADR-002: The session source is a FROZEN two-entry DATA table — `local-pty` and `mirror`; a relayed `local-pty` DOES NOT EXIST and MUST NOT BE BUILT; the control derives every behaviour from the descriptor, and INTERACTIVITY is capability × call-site posture, never one flag

**Status:** Accepted
**Date:** 2026-08-08

**Context.** Spike 44 is the authority and it closed this question with a positively-argued answer, not
a timeout: the browser dials each end directly, and there are exactly two sources. Its sub-question 2
proved the relayed alternative **structurally impossible in both directions today** — input cannot
arrive (`directiveTargets` is populated only inside `wss.on("connection")` by admitted *worker* stream
connections, and `meshRole` makes control/worker exclusive, so a control node holds no stream
connection to itself; measured `{ sent: false, code: "assignment-target-not-connected" }`), and output
is never produced (a board PTY's `term.onData` goes straight to its own WebSocket,
[terminal-ws.mjs:290-296](../../../../src/terminal-ws.mjs#L290-L296)). Building it would need a
self-dialling stream client, a self-admission credential path through the boundary whose whole design
is *admission is the trust boundary*, and a second producer — to replace a socket that already works.

Today the two lanes are a boolean and two `if`s: `const remote = session?.kind === "remote" ? session
: null` ([TerminalDock.tsx:90](../../../../ui/src/board/TerminalDock.tsx#L90)), then
`if (remote != null)` for geometry ([:165-175](../../../../ui/src/board/TerminalDock.tsx#L165-L175)),
`if (remote != null) return` inside `sendResize` ([:203](../../../../ui/src/board/TerminalDock.tsx#L203)),
and a ternary for the URL ([:177](../../../../ui/src/board/TerminalDock.tsx#L177)). Three places encode
the same fact, and a third source would need a fourth edit in each.

**Decision.**
- **A frozen table of exactly TWO descriptors, as DATA, in the `.mjs` set.** Shape, and every field is
  load-bearing:

  | field | `local-pty` | `mirror` |
  |---|---|---|
  | `path` | `/ws/terminal` | `/ws/terminal-view` |
  | `params` | `ref`, `provider` | `nodeId`, `sessionId` |
  | `originRole` | `self` (the surface's own origin) | `fleet` |
  | `resizeControlFrame` | `"resize"` — the frozen m03/ADR-003 envelope | `null` — the lane carries none |
  | `fixedGeometry` | `null` | `{ cols: 80, rows: 24 }` |
  | `canInput` | `true` | `true` (since m42) |

- **The control derives; it does not branch.** Geometry mode, URL, input wiring and the state ramp's
  copy are all functions OF the descriptor. Adding a third source later is a table row plus its own
  arch-test row — the reversibility the spike's timebox explicitly asked to preserve.
- **A relayed `local-pty` is NOT a session source and must not be built.** Spike 44 sub-question 2,
  cited as authority. A story proposing it is refused at review; overturning it needs a superseding
  ADR here *and* a change to the mesh admission model, in that order.
- **INTERACTIVITY IS CAPABILITY × POSTURE, and this is the clause the spike's summary table does not
  carry.** `canInput` is a property of the SOURCE (can bytes travel up this lane at all). Whether they
  DO is a property of the MOUNT: the board dock mounts `mirror` interactively; the fleet peek mounts
  the same source **read-only**, and must keep doing so until milestone 49 (SPEC: invariant 4 survives
  this milestone). So the control takes a mount posture `{ readOnly }` beside the source, and a pure
  policy function decides:
  `inputEnabled = source.canInput && !mount.readOnly`, with `disableStdin = !inputEnabled`.
  **Read-only means read-only IN FACT, not by omission** — the m38 posture, verbatim: xterm is
  constructed with `disableStdin: true` and no `onData` handler is registered at all
  ([FleetTerminalView.tsx:41-43](../../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L41-L43),
  [:170-172](../../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L170-L172)). A half-disabled
  widget that swallows keystrokes silently is the failure
  [acd-fleet-terminal-input-constrained.test.mjs:522-525](../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L522-L525)
  already refuses in the other direction.
  **And the read-only posture travels as a LABEL** (`readOnlyLabel`,
  [stream.mjs:104-107](../../../../ui/src/fleet/terminal-view/stream.mjs#L104-L107)), never as colour or
  the absence of an input box — m38 DESIGN V2/V6, preserved.
- **`canInput` is NOT a permission and may not be used as one.** The permission is `mount.readOnly`.
  Conflating them is how the fleet peek would quietly become typeable.

**Alternatives rejected.**
- **Keep `kind: "local" | "remote"` and branch.** Rejected: `remote` names a TRANSPORT, and every
  behaviour it currently gates is a property of the FAR END. It is the exact conflation ADR-003 exists
  to remove.
- **One flag `interactive` on the source.** Rejected: it cannot express "the same source, typeable
  from the board and read-only on the fleet", which is the state this milestone must ship in.
- **Discover the source's capabilities from the server at connect time.** Rejected: it makes the
  client's geometry depend on a handshake the frozen envelope does not have (m03/ADR-003), and it
  would put a wire-protocol change inside a client-side extraction that SPEC scopes out.

**Consequences.**
- The `if (remote != null)` branches at
  [TerminalDock.tsx:165](../../../../ui/src/board/TerminalDock.tsx#L165) and
  [:200-212](../../../../ui/src/board/TerminalDock.tsx#L200-L212) disappear into two derivations.
- The 80×24 pair moves into the table and keeps its cross-build tie to
  [mesh-worker-execution.mjs:1486-1489](../../../../src/mesh-worker-execution.mjs#L1486-L1489) — a tie
  that has **never actually been tested** (§Codebase health finding 1) and is pinned for the first
  time by `acd-terminal-mirror-geometry-pinned`.
- The `provider` picker ([provider-picker.mjs:11](../../../../ui/src/board/terminal/provider-picker.mjs#L11))
  becomes a `local-pty`-only concern of the descriptor, not a component-level conditional
  ([TerminalDock.tsx:326-331](../../../../ui/src/board/TerminalDock.tsx#L326-L331)).

---

## ADR-003: FIT vs SCALE is DERIVED from the descriptor — `fit ⇔ the source declares a resize control frame`, `scale` otherwise; never keyed on transport, on an origin, or on an `isRemote` boolean

**Status:** Accepted
**Date:** 2026-08-08

**Context.** Spike 44 sub-question 4 confirmed the rule and, more usefully, confirmed the two rules do
not collapse: its prototype's `resize(143, 41)` reached a board PTY **over a cross-origin socket**, so
resizability is a property of the far end and not of which origin served the page. The mirror lane
cannot carry a resize even in principle — the input envelope carries opaque bytes only and the lane is
content-blind and byte-bounded
([mesh-ui-serve.mjs:173](../../../../src/mesh-ui-serve.mjs#L173)).

Both current behaviours are correct for their source, and both were paid for in a live soak: the
worker spawns `claude` at a fixed 80×24
([mesh-worker-execution.mjs:1486-1489](../../../../src/mesh-worker-execution.mjs#L1486-L1489)) and its TUI
paints with absolute cursor addressing, so fitting the pane produced "an unreadable scatter"
([geometry.mjs:7-17](../../../../ui/src/fleet/terminal-view/geometry.mjs#L7-L17)). The defect is not the
behaviours; it is that the rule is spelled three times, differently, as a `remote` test.

**Decision.**
- **`geometryModeFor(source)` returns `fit` iff `source.resizeControlFrame != null`, else `scale`.** One
  pure function, one input, exhaustively testable over the frozen table.
- **`fit`** = `FitAddon.fit()` plus exactly one resize frame per fit (`emitFit`'s existing
  single-emission contract, [resize.mjs:23-30](../../../../ui/src/board/terminal/resize.mjs#L23-L30)),
  re-run on container resize.
- **`scale`** = `term.resize(cols, rows)` at the descriptor's `fixedGeometry`, then ONE CSS transform
  computed by `terminalFitScale` ([geometry.mjs:37-41](../../../../ui/src/fleet/terminal-view/geometry.mjs#L37-L41)),
  aspect-preserving, anchored top-left, guarded to `1` on an unmeasured box.
- **The forbidden spellings, named so a reviewer can grep for them:** `if (remote`, `isRemote`,
  `kind === "mirror"`, `origin ===`, or any test of the socket URL, anywhere in the geometry path. The
  descriptor is the only input.
- **A `scale` source never sends a resize frame** — not because of an early return in the send path
  ([TerminalDock.tsx:203](../../../../ui/src/board/TerminalDock.tsx#L203)), but because `scale` sources
  declare no resize control frame and the emitter is only wired for sources that do. The guard becomes
  structural instead of defensive.

**Alternatives rejected.**
- **Key on transport / origin.** Rejected by the spike's own measurement (a cross-origin socket carried
  a resize fine). It also breaks the moment a future source shares a transport with a different far end.
- **Always scale.** Rejected: the local PTY is genuinely resizable and pinning it to 80×24 would waste
  most of a dock the operator can drag.
- **Always fit.** Rejected: it is the measured render defect that produced `geometry.mjs` in the first
  place.
- **Let the component choose per call site.** Rejected: two call sites, two chances to disagree — the
  duplication this milestone deletes, re-created as a prop.

**Consequences.**
- The DOM renderer stays the only renderer on this surface: no canvas/webgl addon may be loaded,
  because `scale` depends on the DOM renderer scaling crisply in both directions
  ([geometry.mjs:14-17](../../../../ui/src/fleet/terminal-view/geometry.mjs#L14-L17)). Recorded here
  because it is invisible in the code and a "performance" addon would break the mirror silently.
- `terminalFitScale` gains its first test (§Codebase health finding 1).

---

## ADR-004: Every socket URL is built from an ORIGIN THE SURFACE IS HANDED, by ONE pure builder that reads no global — `FLEET_PORT` is retired; the board learns the fleet origin as a SERVED FACT down the seam the fleet already owns, with the standalone default resolved in the COMMAND layer (never by importing the fleet server into the board server)

**Status:** Accepted
**Date:** 2026-08-08
**Amended:** 2026-08-08 — **two clauses of the Decision below are superseded** (the served route's HOME,
and the `source` enum). Read the AMENDMENT note at the top of §Decision before building against steps 4–5
or the payload shape. **Milestone 49 in particular: step 5's `board-ui.mjs:52` pointer is wrong.**

**Context.** Spike 44's finding: *"each side learns the other's origin as a served fact, and no terminal
surface holds a port literal."* Today the board holds one
([TerminalDock.tsx:78](../../../../ui/src/board/TerminalDock.tsx#L78),
[:440-445](../../../../ui/src/board/TerminalDock.tsx#L440-L445)) and the fleet peek is same-origin by
luck of where it is served ([FleetTerminalView.tsx:191-194](../../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L191-L194)).

Measured, the discovery problem is much smaller than it looks. Three of the four cases need no
discovery at all:

| surface | source | origin needed | how |
|---|---|---|---|
| board page | `local-pty` | its own | `window.location` — unchanged ([TerminalDock.tsx:431-436](../../../../ui/src/board/TerminalDock.tsx#L431-L436)) |
| fleet page | `mirror` | its own | `window.location` — unchanged |
| board page | `mirror` | **the fleet's** | **the one open question this milestone answers** |
| fleet page (m49) | `local-pty` | a board's | `GET /api/mesh/board-url`'s additive `origin` field — spike 44 sub-question 1, **m49's job, not built here** |

And the board→fleet case is real even with no fleet running: the mirror affordance is fed by the
board's OWN work rows (`item.execution.{nodeId, sessionId}`,
[DetailPanel.tsx:256](../../../../ui/src/board/DetailPanel.tsx#L256) →
[Board.tsx:368](../../../../ui/src/board/Board.tsx#L368)), which exist whether or not `aof mesh ui` is up.

**Decision.**

> **AMENDMENT, 2026-08-08 — ratified in story 46/02's PO rulings and UPHELD at that story's structural
> review as MORE faithful to this ADR's own invariants than its file sketch was.** Two clauses below are
> superseded. Everything else in this ADR stands unchanged, and the original text is left intact so the
> reasoning trail survives (this log supersedes; it does not rewrite).
>
> **(1) The served route's HOME is `src/setup-ui.mjs`, not `src/board-ui.mjs` — steps 4 and 5 of the
> decision list are superseded.** It shipped as **`GET /api/fleet-origin`** on `serveSetupUi`'s own
> router ([setup-ui.mjs](../../../../src/setup-ui.mjs), the route at `:152` and the fact normalised once at
> construction, `FLEET_ORIGIN_SOURCES` `:43` → `fleetOriginFactOf` `:61` → `:92`; line numbers as measured
> at this amendment, the route name is the stable citation), **beside its true siblings-in-kind
> `/api/config` and `/api/capabilities`**, which live on that same router. The origin is NOT threaded
> through `handleWorkApi`: `serveSetupUi` holds the fact and answers the route itself.
>
> **The reason, and it is this ADR's own argument one hop further along.**
> [board-ui.mjs](../../../../src/board-ui.mjs) declares itself in its header a **THIN FACE** over the command
> core carrying *"ZERO operation logic of its own"*, and its prefix guard returns `false` for anything
> outside `/api/work` ([:42](../../../../src/board-ui.mjs#L42)) — so a route there would have to widen the
> guard that defines the face. The fleet origin is not a command-core operation and **has no workspace**,
> while every route in that file is a `HTTP → invoke(id, input, { workspace })` adapter. Graph-measured at
> this amendment (`aof graph build .`, no `--backend`; **8,973 nodes / 21,370 edges, `builtAt`
> 2026-08-08T17:53:28.450Z**), cited as ACTUAL structure: `board-ui.mjs` has **2** dependents and its only
> operation-bearing outward edge is `→ src/command-core.mjs`, which is a **god-node with 97 dependents and
> 72 outward edges — one to every `src/commands/*` module**. That single edge is the one that CLOSES the
> import ring recorded as [TECH_DEBT 26](../../TECH_DEBT.md). Hanging a served FACT off `handleWorkApi` would
> have put this milestone's origin seam on the command-core side of exactly that edge — the same coupling
> this ADR's own *"never import the fleet server into the board server"* clause exists to refuse.
>
> **The concrete harm this repairs: step 5 pointed milestone 49 at the wrong file.** 49's additive
> board-origin field lands beside `/api/fleet-origin` on `setup-ui.mjs`'s router, **not** in the work-API
> face. (PO ruling **F7** in [46/02's STORY.md](stories/02_story_terminal-origin-seam/STORY.md) named both
> candidates — *"both work … but the ADR and the feature currently point at different files, and two homes
> is how this milestone's own subject matter came to exist"* — and required the choice be settled at
> kickoff rather than by whoever typed first. This records the choice.)
>
> **(2) The `source` enum has THREE values — `"launcher" | "default" | "none"`** (PO ruling
> **F-46.02-1**), frozen at [setup-ui.mjs:43](../../../../src/setup-ui.mjs#L43). `"none"` is carried with an
> **explicit `fleetOrigin: null`**, and it names the case the two-value enum could not: a board nobody
> handed an origin to and whose command layer was never in the picture — which two production callers and
> at least six existing suites already produce. `null` is explicit rather than `undefined` because
> `undefined` disappears from `JSON.stringify`, and a body missing the key is indistinguishable from an old
> build to a reader; a fabricated `4181` is forbidden outright, because a reader handed a guessed origin
> builds a socket URL to a server nobody started — the exact failure the provenance clause exists to
> prevent. **The invariant is unchanged and is what the clause was for: the payload names its own
> provenance.** Three names, because there were three cases.
>
> **What is NOT amended** (stated so a story does not read this note as a licence): the ONE pure builder
> taking `{ origins }` and reading no global; *no terminal surface holds a port literal* and `FLEET_PORT`
> is deleted rather than relocated; the origin riding the existing `boardUrlForWorkspace → serveBoard →
> serveSetupUi` call (steps 1–3); the standalone default resolved in `src/commands/work-ui.mjs`; the
> prohibition on `src/board-serve.mjs` / `src/setup-ui.mjs` importing `src/mesh-ui-serve.mjs` — now
> actually GATED, by
> [`acd-board-server-no-fleet-import`](../../../../test/arch/acd-board-server-no-fleet-import.test.mjs), the
> fitness function this prohibition never had; the labelled unavailable pane naming its cause and its
> command; and no mutation on the fleet face.

- **ONE pure builder in the `.mjs` set: `terminalSocketUrl(source, params, { origins })`.** It takes
  the origins as an ARGUMENT and reads no global — the same shape as
  [shell-nav.mjs:15-21](../../../../ui/src/app/shell-nav.mjs#L15-L21), where resolvability is an input
  "precisely so the whole task stays headless". The `.tsx` supplies `window.location` for
  `originRole: "self"`. `wss:` iff the page is `https:`, as both current builders already do.
- **THE INVARIANT: no terminal surface holds a port literal.** Not a constant, not a template, not a
  default argument. `FLEET_PORT` is deleted, not relocated.
- **The board learns the fleet origin as a fact served from its OWN origin** (m03/ADR-001: one server
  carries the board's HTTP API and its terminal WebSocket; this is that server's API half). It is
  threaded down seams that already exist, all of them read at source:
  1. `serveMeshUi` knows its own bound origin ([mesh-ui-serve.mjs:766-767](../../../../src/mesh-ui-serve.mjs#L766-L767));
  2. it already LAUNCHES the board — `boardUrlForWorkspace`
     ([:777-794](../../../../src/mesh-ui-serve.mjs#L777-L794)) calls
     `serveBoard({ projectDir, port: 0, repoRoot, recordSessions: false })`
     ([:781-786](../../../../src/mesh-ui-serve.mjs#L781-L786)) and memoises it per workspace, so the
     origin rides that call as one additive option;
  3. `serveBoard` ([board-serve.mjs:48](../../../../src/board-serve.mjs#L48),
     [:63](../../../../src/board-serve.mjs#L63)) passes it to `serveSetupUi`;
  4. `serveSetupUi` passes it to `handleWorkApi`
     ([setup-ui.mjs:133](../../../../src/setup-ui.mjs#L133)), whose signature already takes an options
     object ([board-ui.mjs:33](../../../../src/board-ui.mjs#L33));
  5. the browser reads it from a named board route beside the others
     ([board-ui.mjs:52](../../../../src/board-ui.mjs#L52) and siblings).
  **The payload names its own provenance** — `{ fleetOrigin, source: "launcher" | "default" }` — because
  the failure mode of a wrong origin is a pane that never streams and never says why, and "a refusal
  must name its own cause" is this codebase's rule for exactly that.
- **The STANDALONE fallback is resolved in the COMMAND layer.** `aof work ui` starts a board with no
  fleet; the default fleet origin is built from `DEFAULT_MESH_UI_PORT`
  ([mesh-ui-serve.mjs:116](../../../../src/mesh-ui-serve.mjs#L116)) **in `src/commands/work-ui.mjs`**, which
  already owns the CLI's port vocabulary and is the layer allowed to know both faces (m08/ADR-001).
  **`src/board-serve.mjs` and `src/setup-ui.mjs` MUST NOT import `src/mesh-ui-serve.mjs`** — the graph
  reports `mesh-ui-serve.mjs → board-serve.mjs` as a real edge, so the reverse import closes a cycle,
  and it would drag the fleet server (and `ws`) into `aof work ui --json`'s probe path. This is the
  precedent the fleet already set for the same class of fact: *"the scope is the LAUNCHER's fact, and
  `src/commands/mesh-ui.mjs` sets it on this URL"*
  ([mesh-ui-serve.mjs:768-772](../../../../src/mesh-ui-serve.mjs#L768-L772)).
- **An unreachable origin renders a LABELLED unavailable pane naming its cause and what to run**, never
  a blank one and never a spinner — spike 44 sub-question 5, and the same vocabulary the shell's nav
  already speaks ([shell-nav.mjs:42-47](../../../../ui/src/app/shell-nav.mjs#L42-L47), where an
  unreachable destination carries a COMMAND rather than an apology).
- **Nothing on the fleet face becomes a mutation.** The fleet side of this milestone adds no route and
  no write; m38/ADR-012's single carve-out is untouched (spike sub-question 3).

**Alternatives rejected.**
- **Bake the origin into the bundle at build time** (a `VITE_` global, or serving a templated
  `index.html`). Rejected twice over: the SAME `ui/dist` bundle is served from three origins, and
  m45/ADR-002 has just retired `VITE_AOF_UI_MODE` for being a second, baked input to a decision that
  must have one. The static handler
  ([setup-ui.mjs:152-177](../../../../src/setup-ui.mjs#L152-L177)) also serves `index.html` as the SPA
  fallback; templating it would put string surgery in the security-ordered path m45/ADR-004 just
  finished making boring.
- **Move `DEFAULT_MESH_UI_PORT` into a new `src/ports.mjs` leaf.** Genuinely attractive — the port map
  has four homes with an inconsistency (§Codebase health finding 4) — but rejected FOR THIS MILESTONE:
  it adds a 110th flat root module (TECH_DEBT item 10) and touches four launchers this milestone does
  not otherwise edit. Routed to TECH_DEBT instead. The condition that overturns it: a third consumer of
  the fleet port, at which point the leaf is cheaper than the third copy.
- **A new fleet route `GET /api/mesh/origin`.** Rejected: the board is the surface with the question,
  and asking the fleet whether the fleet exists requires already knowing where it is.
- **Let the browser compose `window.location.hostname + ":4181"`.** That is the defect, restated.

**Consequences.**
- `mirrorWsUrl` ([TerminalDock.tsx:440-445](../../../../ui/src/board/TerminalDock.tsx#L440-L445)) and
  `terminalWsUrl` ([:431-436](../../../../ui/src/board/TerminalDock.tsx#L431-L436)) collapse into one
  builder with a descriptor and an origins argument;
  `terminalViewSocketUrl` ([stream.mjs:75-80](../../../../ui/src/fleet/terminal-view/stream.mjs#L75-L80))
  is subsumed by it.
- **The existing `?mode=`/route-path gate does NOT cover this, measured.**
  [acd-no-surface-mode-url-literal.test.mjs](../../../../test/arch/acd-no-surface-mode-url-literal.test.mjs)
  detects exactly two things: a `[?&]mode=(fleet|board|assets)` literal
  ([:84](../../../../test/arch/acd-no-surface-mode-url-literal.test.mjs#L84)) and a minted ROUTE PATH
  ([:98](../../../../test/arch/acd-no-surface-mode-url-literal.test.mjs#L98)). A bare `const FLEET_PORT =
  4181` matches neither, which is why `TerminalDock.tsx` is not on its allowlist and does not trip it
  today. Its named `:4181` exemptions
  ([:118-139](../../../../test/arch/acd-no-surface-mode-url-literal.test.mjs#L118-L139)) are for two
  in-app PAGE links (`Board.tsx:437`, `DetailPanel.tsx:273`), which are legitimate and out of scope
  here. **So this invariant needs its OWN gate** — `acd-terminal-origin-not-port`, scoped to socket URL
  construction so the two gates can never fight over the same exemption list.
- m49 inherits a control that takes an origin, so adding the board-origin field to
  [mesh-ui-serve.mjs:294-319](../../../../src/mesh-ui-serve.mjs#L294-L319) is purely additive there, exactly
  as the spike planned.

---

## ADR-005: ONE connection-state vocabulary of SEVEN states plus the `unknown` fallback, shared; the COPY is per-source and per-call-site; the fleet's assignment-derived wording is INJECTED and the shared set imports nothing from `ui/src/fleet/`

**Status:** Accepted
**Date:** 2026-08-08
**Corrected:** 2026-08-08 — **the COUNT in this ADR's title and decision bullet was wrong (it said SIX).**
The vocabulary is **seven states plus the `unknown` fallback**, as DESIGN and the shipped core have both
said all along. See the COUNT CORRECTION at the end of the reconciliation note in §Decision **before
reading the mapping table, which has six rows for a seven-state ramp — deliberately, and explained
there.**

**Context.** Two ramps exist and neither is a superset of the other:

| | states | file |
|---|---|---|
| dock | `idle → connecting → running → exited(code) / error(message)` | [dock-state.mjs:11-17](../../../../ui/src/board/terminal/dock-state.mjs#L11-L17) |
| peek | `waiting → streaming → ended / disconnected` | [view-state.mjs:24-29](../../../../ui/src/fleet/terminal-view/view-state.mjs#L24-L29) |

Each holds a distinction the other lacks. The dock carries an **exit code** with a clean/failure
reading ([dock-state.mjs:37-41](../../../../ui/src/board/terminal/dock-state.mjs#L37-L41)) and a server
**error control-frame** (a missing provider binary — m03/ADR-003's honest degrade,
[:45-52](../../../../ui/src/board/terminal/dock-state.mjs#L45-L52)). The peek distinguishes **"socket
open, no byte yet"** from live, and that distinction was argued and paid for as m38's V7 anti-lie
rule ([view-state.mjs:8-17](../../../../ui/src/fleet/terminal-view/view-state.mjs#L8-L17)) — the dock
simply shows `connecting…` for both, which is less honest.

And the peek's describer reaches into the fleet's domain: `terminalAssignmentReason`
([view-state.mjs:46-51](../../../../ui/src/fleet/terminal-view/view-state.mjs#L46-L51)) imports
`assignmentChip` from `../assignments.mjs` to say *"no live output — assignment failed · reclaimed"*.
**The graph says this is the ONLY outward edge any of the five helpers has.** It is also correct
behaviour that must not be lost — it exists because a terminal assignment used to sit on `waiting for
output` forever.

**Decision.**

> **RECONCILIATION, PO ruling 2026-08-08 (QA finding on 46/03).** This ADR and
> [DESIGN §THE ONE STATE VOCABULARY](DESIGN.md) were authored in parallel and **disagree on the word
> list**: this table drafts six states naming `live` and `failed`; DESIGN rules **seven plus `unknown`**,
> naming `streaming`, `error` and `unavailable`, with a per-word argument for each and the reason
> `disconnected` retires. **DESIGN wins on the vocabulary** — the state words are what the operator
> reads, DESIGN owns that surface, and it argued each verdict at source (`running → streaming` because a
> browser observes bytes on a socket and can never know a far-end process; `error` as the superset
> because a failed spawn on a healthy socket is not a disconnection). **This ADR's STRUCTURAL decision
> stands unchanged and is what it is actually for**: one ramp in the shared set, the copy per-source and
> per-call-site, the fleet's assignment-derived wording INJECTED, and the shared set importing nothing
> from `ui/src/fleet/`. Read the table below as the structural mapping — which old state becomes which
> new one, and what data rides it — and take the SPELLING from DESIGN. Two record docs disagreeing about
> a literal a build must type is the kind of thing that costs a story a review round-trip, which is why
> it is settled here rather than by whoever writes the first constant.
>
> **COUNT CORRECTION, 2026-08-08 — found at story 46/03's QA review, recorded rather than silently
> rewritten.** The note above settled the SPELLING and left the **COUNT** stale: this ADR's title and its
> decision bullet both still said **SIX**, which is the draft's number, not the ruling's. **The vocabulary
> is SEVEN states — `idle`, `connecting`, `waiting`, `streaming`, `ended`, `error`, `unavailable` — plus
> the `unknown` fallback.** Both are corrected in place above and below; this paragraph is the trail.
>
> **The implementation was already correct, and that is what makes this a documentation defect only.**
> [DESIGN §The merged ramp](DESIGN.md) states *"Seven states plus one fallback"* and tables all eight
> words; the shipped core agrees exactly —
> [ui/src/terminal/state-ramp.mjs:47-58](../../../../ui/src/terminal/state-ramp.mjs#L47-L58) freezes
> `TERMINAL_STATES` at those seven members with `TERMINAL_STATE_LIST` derived from it, and keeps
> `UNKNOWN_STATE = "unknown"` deliberately OUT of the list under its own comment: *"`unknown` is
> deliberately NOT a member: it is what a state the ramp has not learned resolves TO, never a state a
> caller can enter."* That is this ADR's own "an unrecognised state LABELS ITSELF" clause below, and it is
> why the count is seven-plus-one rather than eight.
>
> **Why the mapping table below still has SIX rows, and why that is not a second contradiction.** It is a
> table of *replacements* — old state → new state — so it can only hold states that replace something.
> **`unavailable` has no row because it replaces nothing: it is NEW** (spike 44 sub-question 5; DESIGN
> DG-46-3 rules it **built in m46** with no producer until m49). And `unknown` has no row because it is
> not a member. **A reader who counted the rows would build a six-entry vocabulary and silently drop
> `unavailable`** — the state whose entire job is to say why a pane never opened — which is the concrete
> harm this correction exists to prevent, and the reason it is filed against the title rather than left
> to DESIGN to carry alone. **46/04 and milestone 49 are built from these ADRs, not from DESIGN.**

- **ONE ramp, SEVEN states plus the `unknown` fallback, in the shared `.mjs` set** (the table maps the
  six that REPLACE an existing state; `unavailable` is new and `unknown` is not a member — see the count
  correction above)**:**

  | state | means | replaces |
  |---|---|---|
  | `idle` | no source bound | dock `IDLE`; the peek's closed state |
  | `connecting` | the socket is opening | dock `CONNECTING` |
  | `waiting` | the socket is OPEN, no byte has arrived | peek `WAITING` (the honesty the dock lacked) |
  | `live` | bytes are flowing | dock `RUNNING`, peek `STREAMING` |
  | `ended` | the far end finished — carries an OPTIONAL `exitCode` + `reads` | dock `EXITED`, peek `ENDED` |
  | `failed` | transport failure OR a server error control-frame — carries `cause` + `message` | dock `ERROR`, peek `DISCONNECTED` |

  Nothing is lost: `exitCode` and `reads` ride `ended`; `cause` distinguishes a refused socket from a
  named server error on `failed`; the peek's `waiting` survives as its own state.
- **The STATE NAMES are shared; the COPY is not.** `live` reads *"running"* for `local-pty` and
  *"streaming"* for `mirror`; `ended` reads *"exited (0)"* when an exit code is present and *"stream
  ended"* when it is not. This is the whole reconciliation: one vocabulary for the machine, per-source
  words for the operator. DESIGN's dot-plus-label rule is unchanged and **colour is never the only
  signal** — every state renders its text label, as both implementations already do
  ([TerminalDock.tsx:374-377](../../../../ui/src/board/TerminalDock.tsx#L374-L377),
  [FleetTerminalView.tsx:317-325](../../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L317-L325)).
- **An unrecognised state LABELS ITSELF (`unknown`, quiet, muted) and never throws** — carried forward
  verbatim from [view-state.mjs:95-112](../../../../ui/src/fleet/terminal-view/view-state.mjs#L95-L112),
  where degrading to `waiting` was corrected precisely because it asserted a fact nothing had
  established.
- **The fleet's assignment-derived copy stays OUT of the shared set and is INJECTED by the fleet call
  site.** The shared describer accepts an optional `reason` STRING; the fleet computes it with a
  fleet-local helper that keeps importing `assignments.mjs`. **A shared control importing
  `ui/src/fleet/assignments.mjs` would re-couple the two surfaces this milestone exists to decouple**,
  and it would do it invisibly — the import would sit inside a module named for terminals.
- **The CHIP/BAR split survives** ([view-state.mjs:154-160](../../../../ui/src/fleet/terminal-view/view-state.mjs#L154-L160)):
  short `text` for the header chip, full `reason` for the viewport bar, `reason ?? text` at the bar.
  It is an existing, reviewed decision and this milestone is not re-opening it.

**Alternatives rejected.**
- **Keep both ramps and map between them.** Rejected: a mapping layer is a third vocabulary, and the
  two would drift on either side of it.
- **Adopt the dock's ramp wholesale.** Rejected: it loses `waiting`, which is m38's V7 honesty rule.
- **Adopt the peek's ramp wholesale.** Rejected: it loses the exit code and the server error-frame
  state, which is m03/ADR-003's honest degrade.
- **Move `terminalAssignmentReason` into the shared set "because it is only one import".** Rejected —
  and named because it is the tidy-looking move: it is the single outward edge the graph found, and
  admitting it makes the shared control depend on the fleet's assignment vocabulary forever.

**Consequences.**
- `describeState` ([TerminalDock.tsx:449-466](../../../../ui/src/board/TerminalDock.tsx#L449-L466)) and
  `describeTerminalViewState` ([view-state.mjs:167-173](../../../../ui/src/fleet/terminal-view/view-state.mjs#L167-L173))
  become one describer plus per-source copy.
- `test/terminal-dock.test.mjs`, `test/fleet-terminal-view-surface.test.mjs` and
  `test/fleet-terminal-view-producer-fed.test.mjs` re-point at the shared module; their assertions
  survive, since every distinction they assert survives.
- After this milestone neither `DOCK_STATES` nor `TERMINAL_VIEW_STATES` exists anywhere in `ui/src` —
  a greppable, non-vacuous pin (§Fitness functions).

---

## ADR-006: The existing gates' INVARIANTS are the contract; their FILE LISTS are not. Every list is updated in the same story that moves the code, and invariant 4 (the fleet page wires no input source) is RE-EXPRESSED rather than relaxed — because after the extraction a directory sweep would pass VACUOUSLY

**Status:** Accepted
**Date:** 2026-08-08

**Context.** Two gates do source-analysis over NAMED files that this milestone moves:
[acd-fleet-terminal-input-constrained](../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs)
(`FLEET_UI_DIR`, `BOARD_TERMINAL_DOCK`,
[:62-63](../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L62-L63)) and
[acd-terminal-server-only](../../../../test/arch/acd-terminal-server-only.test.mjs)
([:70-81](../../../../test/arch/acd-terminal-server-only.test.mjs#L70-L81), hard-coding
`ui/src/board/TerminalDock.tsx`). SPEC and STATE both say: update the file list, never the invariant.

**That instruction is necessary and, for invariant 4, not sufficient — and this is the most important
review finding of this refine.** Invariant 4's detector is a DIRECTORY SWEEP: it walks
`ui/src/fleet/**` and fails if any file wires `onData`/`onKey`/`onBinary` or calls `.send(` on a
WebSocket ([:490-502](../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L490-L502)).
Once the control lives in `ui/src/terminal/`, the fleet page will mount a component that DOES wire
`onData` — and the sweep will still be green, because the code moved out of the swept directory. The
gate would then assert nothing about the property it names, while reading green. That is worse than
deleting it, because a green gate is read as a satisfied contract.

**Decision.**
- **The rule stands: update the file lists, never the invariants.** A story that changes an
  invariant's MEANING to make a move easier is refused at review; a story that fails to move a list is
  caught by the gate itself (every list here is non-vacuous by construction — a missing file throws or
  a floor assertion trips).
- **Invariant 4 is RE-EXPRESSED at the same strength, on a subject that still exists after the move.**
  Three assertions replace one sweep:
  1. **The call site.** `ui/src/fleet/Fleet.tsx` mounts the control in its **read-only posture** —
     asserted at [Fleet.tsx:759](../../../../ui/src/fleet/Fleet.tsx#L759)'s mount, structurally.
  2. **The policy.** ADR-002's `inputEnabled = source.canInput && !mount.readOnly` is a pure function
     driven BEHAVIOURALLY over the whole frozen source table × both postures, asserting that a
     read-only mount yields `disableStdin: true` and no `onData` registration. A pure function tested
     exhaustively is a far stronger pin than an absence-of-string sweep.
  3. **The sweep STAYS**, still walking `ui/src/fleet/**` — it remains non-vacuous (the directory still
     holds `Fleet.tsx`, `api.ts`, `assignments.mjs`, `scope.mjs`, …) and it still proves no
     fleet-local module grows its own input path.
- **Invariant 4 MUST still hold when this milestone accepts.** Making the fleet's panes typeable is
  milestone 49. This milestone changes WHERE the read-only posture is enforced, never WHETHER.
- **`acd-terminal-server-only`'s third assertion stops hard-coding a path and DISCOVERS it** — see
  ADR-006's fitness-function row: the "browser terminal imports only `@xterm/*`" check is applied to
  the one construction site found by sweep. A gate that cannot be broken by a file move is strictly
  better than one whose list must be maintained.
- **The full list of file-list carriers, enumerated so none is discovered by a red CI run:**

  | file | what it names | after m46 |
  |---|---|---|
  | [acd-fleet-terminal-input-constrained](../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs) | `BOARD_TERMINAL_DOCK`, `FLEET_UI_DIR`, the `FleetTerminalView` mount assertion ([:507-508](../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L507-L508)), the `/ws/terminal-view` consumer check ([:500](../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L500)) | re-point at the control; the mount assertion becomes "the fleet mounts the ONE control, read-only" |
  | [acd-terminal-server-only](../../../../test/arch/acd-terminal-server-only.test.mjs) | `ui/src/board/TerminalDock.tsx` | replaced by the discovered single construction site |
  | [acd-vibeyard-attribution](../../../../test/arch/acd-vibeyard-attribution.test.mjs) | 4 of its 6 `ui/` entries | moved paths — a **licence** obligation |
  | [acd-shell-z-ladder-single-home](../../../../test/arch/acd-shell-z-ladder-single-home.test.mjs) | the named `FleetTerminalView.tsx` `z-50` exemption ([:48-53](../../../../test/arch/acd-shell-z-ladder-single-home.test.mjs#L48-L53)) | **REMOVED, not re-pointed** — the test says so in terms, and the list is shrink-only |
  | [acd-ui-surface-file-budget](../../../../test/arch/acd-ui-surface-file-budget.test.mjs) | its BUDGETS table | gains the control (§Codebase health finding 2) |
  | `test/support/{board,fleet,shell}-app-harness.mjs` | module-path stub filters | re-point, or all three harnesses try to render a real xterm |
  | `test/{terminal-dock,fleet-terminal-view-surface,fleet-terminal-view-producer-fed}.test.mjs` | direct `.mjs` imports | re-point |

**Consequences.**
- Every one of these edits lands in the SAME story as the move it follows. A file-list story of its own
  would leave CI either red or vacuous in between, and vacuous is the dangerous one.
- New suites are registered in [scripts/test.mjs](../../../../scripts/test.mjs) per m43/ADR-014 E7 — an
  unregistered suite is no gate at all.

---

## ADR-007: `wireTerminalBridge` is DELETED, and the fitness function pointed at it is re-aimed at the real producer — a gate guarding dead code is worse than no gate, because it reads green while asserting nothing about production

**Status:** Accepted
**Date:** 2026-08-08 (operator ruling: delete it)

**Context.** Spike 44's Investigation found `wireTerminalBridge`
([mesh-terminal-relay-bridge.mjs:187](../../../../src/mesh-terminal-relay-bridge.mjs#L187)) has **no
production caller**. Re-verified here, twice and by two methods: a repo-wide grep finds only its own
definition, its own doc comment, `test/mesh-terminal-relay-bridge.test.mjs`, two arch tests and a
narrating comment in `scripts/test.mjs`; and the graph shows every OTHER export of that module is live
(`buildTerminalFrameEnvelope` → `worker-stream-client.mjs`, `buildTerminalInputEnvelope` →
`mesh-ui-serve.mjs`, `createTerminalRelayPushTransport` → five modules, the three `*_KIND` constants →
`control-stream-server.mjs` / `mesh-terminal-mirror.mjs` / `mesh-terminal-input.mjs`). Production
streams through `onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId,
String(chunk))` ([mesh-launcher.mjs:1152](../../../../src/mesh-launcher.mjs#L1152),
[:1291](../../../../src/mesh-launcher.mjs#L1291)) into
[worker-stream-client.mjs:601-612](../../../../src/worker-stream-client.mjs#L601-L612).

Yet [acd-fleet-terminal-input-constrained's detector #4](../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L244-L247)
asserts `wireTerminalBridge` *"does not build its signal from `String(chunk)`"* — a positive assertion
about a function nothing calls. It has been green for a month while saying nothing about the bytes that
actually reach an operator's screen.

**And the invariant is already carried on the live path, which is what makes this safe.**
[acd-fleet-terminal-frame-connection-identity.test.mjs:254-256](../../../../test/arch/acd-fleet-terminal-frame-connection-identity.test.mjs#L254-L256)
has a GREEN clause asserting exactly T14 concern #1 over `worker-stream-client.sendTerminalFrame`'s
body and the launcher's `onOutputChunk` arrow: no credential/env/askpass/mint/token material, and the
envelope built from exactly `(nodeId, sessionId, bytes)`. That gate's own header
([:36-41](../../../../test/arch/acd-fleet-terminal-frame-connection-identity.test.mjs#L36-L41)) already
describes `wireTerminalBridge` as *"the hybrid retired … (now dead)"*, and
[scripts/test.mjs:204](../../../../scripts/test.mjs#L204) says the same. **Three places in the repo already
know this function is dead. Nobody deleted it, and one gate is still aimed at it.**

**Decision.**
- **Delete `wireTerminalBridge`** and the bridge lanes of `test/mesh-terminal-relay-bridge.test.mjs`
  that exist only to drive it. Nothing else in that module moves: it remains the home of the frozen
  envelope builders, all of which are live.
- **The INVARIANT is preserved and re-aimed at the real producer.** Detector #4 of
  `acd-fleet-terminal-input-constrained` splits:
  - its NEGATIVE half **stays on the bridge file** — that module still builds every terminal envelope
    in both directions, so "no credential/env/askpass/mint material appears in it" remains a live,
    meaningful sweep;
  - its POSITIVE half (`String(chunk)`) **moves to `src/mesh-launcher.mjs`'s `onOutputChunk` arrow**,
    the real producer, where it asserts that the streamed signal is sourced from the PTY chunk and
    nothing else.
  - It does **not** grow a second copy of the live-path credential needle: that already exists, green,
    in `acd-fleet-terminal-frame-connection-identity`, and two homes for one detector is the shape
    these ADRs keep refusing. The re-aimed positive and the existing negative are different
    assertions over the same arrow, deliberately.
- **State the general rule, because this will happen again:** a fitness function whose subject has no
  production caller is not a weak gate, it is a FALSE one. When a detector's subject dies, the detector
  moves to the live subject or it is deleted with it — it is never left pointing at the corpse.

**Alternatives rejected.**
- **Wire `wireTerminalBridge` up so the gate becomes true.** Rejected: it would add a second producer to
  a stream that already has one, which is the two-homes-for-one-fact defect, introduced to satisfy a
  test.
- **Leave it, delete only the gate clause.** Rejected: dead code with a live-looking doc comment
  ([:160-186](../../../../src/mesh-terminal-relay-bridge.mjs#L160-L186)) is how the next reader concludes
  the relay path exists — which is exactly the misreading spike 44 had to correct at source.
- **Leave both, out of caution.** Rejected: the caution is illusory. The property is guarded on the
  live path today.

**Consequences.**
- `src/mesh-terminal-relay-bridge.mjs` gets shorter; its 16 dependents are unaffected (none imports the
  deleted export).
- One narrating comment in `scripts/test.mjs` and one in the identity gate's header stop describing a
  function that exists.

---

## ADR-008: The dropped-first-frame race is fixed on the SERVER, by registering the message listener at CONNECTION time into a BOUNDED queue that `wireSession` drains in order — not by a client timer and not by a `ready` handshake

**Status:** Accepted
**Date:** 2026-08-08

**Context, measured by spike 44 and re-read at source here.**
[terminal-ws.mjs](../../../../src/terminal-ws.mjs) accepts the upgrade at
[:115-131](../../../../src/terminal-ws.mjs#L115-L131) and emits `connection` at
[:133-140](../../../../src/terminal-ws.mjs#L133-L140), but registers `ws.on("message")` only at
[:306](../../../../src/terminal-ws.mjs#L306), inside `wireSession`
([:276](../../../../src/terminal-ws.mjs#L276)), which is called at
[:270](../../../../src/terminal-ws.mjs#L270) — **after** `loadWorkspace`
([:181](../../../../src/terminal-ws.mjs#L181)), `await trustCwd`
([:194](../../../../src/terminal-ws.mjs#L194)) and `await spawn`
([:237](../../../../src/terminal-ws.mjs#L237)). Frames arriving in that window are dropped on the floor:
no buffer, no error, no log.

The client hits it on every single session:
`socket.onopen = () => { sendResize(); }`
([TerminalDock.tsx:214-215](../../../../ui/src/board/TerminalDock.tsx#L214-L215)). The spike measured it —
an on-open `resize(111,11)` never reached the PTY; the same frame 400 ms later did. It self-heals today
only because a later `ResizeObserver` tick fires
([:266-267](../../../../ui/src/board/TerminalDock.tsx#L266-L267)), which is why nobody has seen it. **A
grid of N panes multiplies it by N**, and a pane that never resizes again keeps the wrong geometry
forever — which is m49, i.e. the next milestone.

The auto-typed command is on the same clock and shares the hazard: it fires on the first output chunk
or a 700 ms fallback ([:186-198](../../../../ui/src/board/TerminalDock.tsx#L186-L198),
[:218](../../../../ui/src/board/TerminalDock.tsx#L218)).

**Decision.**
- **The SERVER owns the fix.** The route accepted the frame; the route must not silently discard it.
  Every client — this control, m49's grid, a future CLI — would otherwise have to re-derive the same
  workaround and get it subtly different.
- **The mechanism: register `ws.on("message")` at connection time, before the first `await`, pushing
  into a BOUNDED queue. `wireSession` drains the queue IN ORDER through the same handler, then takes
  over live.** Order is part of the contract — a queued `resize` followed by queued keystrokes followed
  by live keystrokes must arrive in that sequence, or the first fit lands after the first paint.
- **Bounded, because an unbounded buffer is a memory hole with a socket attached.** The ceiling is a
  named constant in the same spirit as the input lane's `MAX_TERMINAL_INPUT_BYTES`
  ([mesh-ui-serve.mjs:173](../../../../src/mesh-ui-serve.mjs#L173)); over the ceiling the OLDEST
  frames are dropped, not the newest, because the newest resize is the true one.
- **The error paths are unchanged.** An unknown provider ([:153-157](../../../../src/terminal-ws.mjs#L153-L157)),
  a missing binary ([:206-214](../../../../src/terminal-ws.mjs#L206-L214)) or a failed spawn
  ([:244-253](../../../../src/terminal-ws.mjs#L244-L253)) still send the error control-frame and close; the
  queue dies with the socket. m03/ADR-003's honest degrade is untouched.
- **The client keeps `onopen → sendResize()` exactly as written.** The point of a server-side fix is
  that the obvious client code becomes correct. The `ResizeObserver` stays because it is needed anyway —
  it simply stops being load-bearing for the first frame.
- **The pin is BEHAVIOURAL, not structural**, and it extends the existing
  [test/terminal-ws.test.mjs](../../../../test/terminal-ws.test.mjs): drive the REAL
  `attachTerminalWebSocket` with a stubbed PTY, send a resize on the `open` event, assert the PTY
  received exactly that geometry. This is the spike's own prototype shape, promoted from scratch to
  suite. A structural gate would assert where a listener is registered, which is the implementation, not
  the property.

**Alternatives rejected.**
- **A server→client `{type:'ready'}` handshake the client waits for.** Rejected on two grounds: it
  changes the frozen wire envelope (m03/ADR-003), and it moves the fix from ONE server to EVERY client —
  old clients would keep dropping frames while the protocol claimed to be fixed.
- **Client-side: re-emit the fit after a delay.** Rejected: it is what accidentally saves the code today,
  and it is exactly why the bug was invisible for a year. A timer that hides a dropped frame will hide
  the next one too.
- **Client-side: wait for the first server byte before fitting.** Rejected: it makes the client's
  geometry depend on the far end speaking first, and a full-screen TUI's first paint depends on knowing
  its size — the two waits can meet in the middle.
- **Spawn before accepting the upgrade.** Rejected: it moves an expensive, failure-prone operation into
  the upgrade handler and delays the socket that carries the error frame the operator needs to see.

**Consequences.**
- `src/terminal-ws.mjs` has 3 dependents and no `ui/` edge (graph), so this ships independently of every
  other story in this milestone.
- m49's grid gets correct first-frame geometry for free on N panes.

---

## ADR-009: The dock's host is the SHELL's `overlay` region via a third contribution slot on the existing bus — NOT a per-surface `fixed` layer; and m46 owns the behavioural proof that ONE xterm / ONE socket / ONE PTY survives present AND dismiss. Session survival ACROSS surfaces is explicitly NOT promised

**Status:** Accepted
**Date:** 2026-08-08

**Context, read at source in the shipped m45 code.** ADR-005 [Build-3] ruled the dock's region home is
`overlay` and reserved `z-30` for it, and Shell.tsx renders that row today
([:316-360](../../../../ui/src/app/Shell.tsx#L316-L360)) with a comment naming *"m46's dock"* as the next
occupant. But the surface→shell bus offers only TWO contribution slots — `SLOT_SURFACE` and
`SLOT_NOTICE` ([shell-bus.mjs:30-31](../../../../ui/src/app/shell-bus.mjs#L30-L31)) — plus the fullscreen
door. **There is no channel by which a surface can put a dock in the overlay region.** Meanwhile the
dock still renders inside the board's own tree ([Board.tsx:561-563](../../../../ui/src/board/Board.tsx#L561-L563)),
hoisted only out of the board's internal conditional
([:535-539](../../../../ui/src/board/Board.tsx#L535-L539)).

Shell.tsx also warns, in terms, that this is the next collision:
[:349-358](../../../../ui/src/app/Shell.tsx#L349-L358) explains that the adoption host is childless
*"the moment [Build-3]'s overlay region gains a second React child (m46's dock is the named next
occupant of this very region)"*.

**One correction to [Build-3]'s stated REASON, measured, and it matters because a story could otherwise
promise something the architecture cannot deliver.** [Build-3] argues a `content`-parented dock *"is
unmounted by every route change, so navigating from `/board` to `/fleet` would kill the PTY"*. The
CONCLUSION is right; the MECHANISM is not. m45's navigation is real `<a href>` links with no client-side
interception ([Shell.tsx:395-398](../../../../ui/src/app/Shell.tsx#L395-L398)) and the entry evaluates
`routeFor(location.pathname)` exactly once at module load
([main.tsx:49-61](../../../../ui/src/main.tsx#L49-L61)). **A surface change is a full document load.** The
PTY dies at the browser, before React gets a say, and no DOM re-parenting can save it.

**Decision.**
- **The dock is contributed to the shell's `overlay` region through a THIRD slot on the existing bus**
  (`contribute(...)` is already region-keyed, [shell-bus.mjs:72-84](../../../../ui/src/app/shell-bus.mjs#L72-L84);
  this adds the slot constant and the shell's read-back beside
  [Shell.tsx:131-132](../../../../ui/src/app/Shell.tsx#L131-L132)). It takes `z-30` from the ladder —
  imported, never retyped, per `acd-shell-z-ladder-single-home`.
- **The degraded path is preserved and is the reason the bus is the right seam:** with no shell present
  the contribution renders IN PLACE ([shell-bus.mjs:18-22](../../../../ui/src/app/shell-bus.mjs#L18-L22)),
  so `test/support/board-app-harness.mjs` keeps working untouched.
- **NO per-surface `fixed inset-0` layer.** That is ADR-005's named prohibition, and
  [FleetTerminalView.tsx:411-412](../../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L411-L412)
  is the one live violation — carried by m45 on an explicit shrink-only exemption *because this
  milestone deletes the file*. Re-creating that shape in the extracted control would make the exemption
  permanent under a new name.
- **Fullscreen goes through `requestFullscreen`** ([shell-bus.mjs:115-135](../../../../ui/src/app/shell-bus.mjs#L115-L135)),
  handing the LIVE DOM node and its `home`, with `claimsEscape: true` when input is enabled — because
  this control forwards stdin ([TerminalDock.tsx:261-263](../../../../ui/src/board/TerminalDock.tsx#L261-L263))
  and `Esc` is a live keystroke for the `claude` TUI ([Build-2]). The visible exit control remains
  mandatory and is then the only exit.
- **m46 OWNS the behavioural proof ADR-005 [Build-1] deferred to it.**
  [test/shell-not-found-and-fullscreen.test.mjs:528-535](../../../../test/shell-not-found-and-fullscreen.test.mjs#L528-L535)
  says so in terms: the adoption half *"needs a real DOM and belongs to m46, where a real xterm and a
  real socket exist to survive the transition"*. The pin: present → dismiss, and the SAME xterm
  instance, the SAME socket and the SAME scrollback are still there. The existing survival mechanisms are
  the prior art and both stay honoured — hide-don't-unmount
  ([TerminalDock.tsx:409-412](../../../../ui/src/board/TerminalDock.tsx#L409-L412), with `collapsed`
  deliberately excluded from the session effect's deps,
  [:280-281](../../../../ui/src/board/TerminalDock.tsx#L280-L281)) and live-host re-parenting
  ([FleetTerminalView.tsx:247](../../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L247)).
- **The post-present layout tick is consumed, not re-derived.** `onLayout` fires after present AND after
  dismiss; a `fit` source re-fits and a `scale` source re-scales. Both implementations independently
  discovered the one-frame defer ([FleetTerminalView.tsx:265-268](../../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L265-L268));
  the shell now owns it and the control must not add a second timer beside it.
- **The drag clamp moves off the viewport and onto the published chrome height.**
  [TerminalDock.tsx:120](../../../../ui/src/board/TerminalDock.tsx#L120) clamps to
  `Math.round(window.innerHeight / 2)` — wrong by exactly the chrome height under a shell, which is the
  measured reason `--aof-shell-chrome-height` was promoted into ADR-005's contract as point 7. The clamp
  becomes a pure function of the content box, using
  `CHROME_HEIGHT_PROPERTY` / `CONTENT_HEIGHT_EXPRESSION`
  ([shell-layout.mjs:274](../../../../ui/src/app/shell-layout.mjs#L274),
  [:278](../../../../ui/src/app/shell-layout.mjs#L278)) — the same primitive
  [Board.tsx:420](../../../../ui/src/board/Board.tsx#L420) already sizes itself with.
- **A terminal-hosting surface declares `content:fixed`**, per
  [shell-layout.mjs:369-393](../../../../ui/src/app/shell-layout.mjs#L369-L393) (binding, and `board`
  already does).
- **STATED PLAINLY, so no story promises it: a session does NOT survive navigation between surfaces, and
  this milestone does not make it.** Navigation is a document load. The reasons to host in `overlay` are
  stacking, one home for out-of-flow layers, and a clean adoption boundary — not session persistence.
  A control whose docs imply otherwise would have operators losing work to a click on "Fleet". If
  cross-surface session survival is ever wanted it needs client-side navigation first, which is a
  routing decision (m47's surface) and an ADR of its own.

**Consequences.**
- `ui/src/app/shell-bus.mjs`, `ui/src/app/Shell.tsx` and `ui/src/board/Board.tsx` each take a small,
  enumerable edit. Shell.tsx is 842 lines and unbudgeted (§Codebase health finding 5).
- `acd-shell-bus-single-host`'s invariant is unaffected: the control contributes; it does not import
  `ui/src/app/Shell`.

---

## Fitness functions

Four gates change and three are new. Every one of them pins a structural invariant an ADR above
implies; each states its own red/green expectation at the top, per the house convention (an arch test
written at refine forecasts a contract, and is expected RED until its story lands). All are registered
in [scripts/test.mjs](../../../../scripts/test.mjs) — m43/ADR-014 E7, `acd-test-suite-registration`.

| file | pins | expectation at refine |
|---|---|---|
| **`test/arch/acd-terminal-origin-not-port.test.mjs`** *(new)* | ADR-004 — no module in `ui/src/terminal/` names a port at all, and no `ws://`/`wss://` URL anywhere in `ui/src` contains a port literal; the socket URL is built by ONE exported pure builder that takes origins as an argument and reads no `window`/`location` | **RED** — `TerminalDock.tsx:78` trips it today, which is the non-vacuity proof |
| **`test/arch/acd-terminal-control-boundary.test.mjs`** *(new)* | ADR-001/005 — the `ui/src/terminal/**.mjs` set imports no `react`/`react-dom`, touches no DOM global, and is loadable by plain `node`; it imports NOTHING from `ui/src/fleet/` or `ui/src/board/`; and after the milestone neither `DOCK_STATES` nor `TERMINAL_VIEW_STATES` is defined anywhere in `ui/src` (one state vocabulary) | **RED** until the extraction lands |
| **`test/arch/acd-terminal-mirror-geometry-pinned.test.mjs`** *(new)* | ADR-002/003 — the descriptor's `mirror.fixedGeometry` equals the worker's own `ptySpawn` geometry, read from BOTH [ui/src/terminal/…](../../../../ui/src/fleet/terminal-view/geometry.mjs) and [src/mesh-worker-execution.mjs:1486-1489](../../../../src/mesh-worker-execution.mjs#L1486-L1489). **The tie `geometry.mjs:20-23` has always claimed and never had** | **GREEN on arrival** (80 = 80, 24 = 24) — it preserves a property that is true and unguarded |
| [`acd-terminal-server-only`](../../../../test/arch/acd-terminal-server-only.test.mjs) *(amended)* | ADR-001/006 — **exactly ONE `new Terminal(` construction site under `ui/src`**, and the `@xterm/*`-only import rule applies to the site the sweep FINDS rather than to a hard-coded path. node-pty still never reaches `ui/src` (unchanged) | **RED on the single-site clause** (there are two today), green on the rest |
| [`acd-fleet-terminal-input-constrained`](../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs) *(amended)* | ADR-006 — invariant 4 re-expressed as call-site + policy + the surviving directory sweep; ADR-007 — detector #4's positive half re-aimed at `mesh-launcher.mjs`'s `onOutputChunk`. Invariants 1, 2, 3 and the behavioural lane **unchanged** | green throughout, by construction |
| [`acd-vibeyard-attribution`](../../../../test/arch/acd-vibeyard-attribution.test.mjs) *(amended)* | m03/ADR-003 — attribution travels with the derivation; the list follows the moved files | green after the move; **fails loudly if the move lands without it**, which is correct |
| [`acd-shell-z-ladder-single-home`](../../../../test/arch/acd-shell-z-ladder-single-home.test.mjs) *(amended)* | m45/ADR-005 — the `FleetTerminalView.tsx` exemption is **removed, not re-pointed**; the list is shrink-only | green once the file is deleted |

**What a plant that must trip each one looks like** (hand-written synthesized snippets, never a
string-replace on a real file; each plant asserts it LANDED before asserting the detector fires — the
house convention):

- **origin-not-port**: `const FLEET_PORT = 4181;`; `` `ws://${host}:4181/ws/terminal-view` ``;
  `const host = window.location.hostname` inside the `.mjs` set. Clean baseline: a builder taking
  `{ origins }` and interpolating `origins.fleet`.
- **control-boundary**: `import { useState } from "react";` in a `.mjs`;
  `import { assignmentChip } from "../fleet/assignments.mjs";`;
  `export const DOCK_STATES = { … }` in a second module. Clean baseline: the shared describer taking an
  optional `reason` string.
- **mirror-geometry-pinned**: a plant setting the descriptor to `{ cols: 100, rows: 30 }` while the
  worker still spawns 80×24 — the exact drift that produced the unreadable render in the first place.
- **single xterm site**: a synthesized second surface file containing `new Terminal({ … })`.
- **invariant 4 (re-expressed)**: a plant mounting the control from `Fleet.tsx` WITHOUT the read-only
  posture; and a policy plant returning `inputEnabled: true` for `{ readOnly: true }`.

**Invariants that belong HERE and must NOT appear in a task `.feature`.** These are structural
assertions, not observable behaviour, and a story that writes them as Gherkin has put a fitness
function in the wrong home: *no port literal on a terminal surface*; *exactly one xterm construction
site*; *the shared set imports no React and nothing from either surface folder*; *one state
vocabulary*; *the descriptor's geometry equals the worker's*. What DOES belong in a `.feature` is the
observable consequence — a mirror pane renders its 80 columns unwrapped; a dock dragged to the top of
the content region does not slide under the chrome; a session survives collapse and fullscreen; a pane
whose origin cannot be reached says so and says what to run.

**Satisfiability.** Each new gate's subject is a file this milestone creates, so satisfiability is by
construction with one exception worth naming: the "exactly ONE construction site" sweep can only go
green after BOTH call sites are re-homed and `FleetTerminalView.tsx` is deleted — i.e. it is the gate
that proves the milestone's own headline claim, and it cannot be satisfied by a partial landing. That
is deliberate.

---

## Codebase health (measured this refine, and where each finding is routed)

Measured 2026-08-08 at `14ac6e1`, with the m45 baselines re-measured by the identical command over
`eacbd57` so the trend is method-consistent:

| Signal | m45 baseline (`eacbd57`) | now (`14ac6e1`) | Trend |
|---|---|---|---|
| `ui/src` files | 54 | **71** | **+31% in ONE milestone** |
| `ui/src` lines | 10,887 | **14,238** | **+31%** |
| `src/` root-level `.mjs` | 108 | **109** | +1 (`static-serve.mjs`, as m45 predicted) |
| `src/` `.mjs` files | 213 | **215** | +2 |
| `ui/src/fleet/Fleet.tsx` | 1,532 | **1,541** | 19 lines under its 1,560 ratchet |
| `ui/src/board/TerminalDock.tsx` | — | **467** | two lanes in one file |
| `ui/src/fleet/terminal-view/FleetTerminalView.tsx` | — | **447** | of which ~64 are the header preamble |
| terminal code across two folders | — | **≈1,370 lines** in 8 modules + 6 `.d.mts` | this milestone's subject |
| `ui/src/app/Shell.tsx` / `shell-layout.mjs` | did not exist | **842 / 845** | new, large, unbudgeted |

Six findings, each routed.

1. **`geometry.mjs` has ZERO test coverage, and its own header names a test file that does not exist.**
   [geometry.mjs:20-23](../../../../ui/src/fleet/terminal-view/geometry.mjs#L20-L23) states: *"the tie is
   held by `test/fleet-terminal-view-geometry.test.mjs`, which reads BOTH files and fails if the numbers
   drift apart."* That file is **not on disk**, and
   `grep -rn "WORKER_TERMINAL_COLS\|terminalFitScale\|geometry.mjs" test/ scripts/` returns **nothing**.
   The graph found the hole (no test importer); the grep confirmed it is total. So the mirror lane's
   entire scale math, and the cross-build constant tie whose drift produces an unreadable screen, are
   **untested and were believed tested** — which is worse than untested, because the comment stopped
   anyone looking. **Route: refactor REQUIRED of this milestone.** The math moves into the shared set in
   ADR-003 and arrives with unit coverage plus `acd-terminal-mirror-geometry-pinned`; the false comment
   dies with the file.

2. **Two components, 914 lines, and the unified control must not simply become their sum.**
   `TerminalDock.tsx` carries two lanes in 467 lines; `FleetTerminalView.tsx` carries 447 including a
   ~64-line preamble. A naive union is a ~900-line component, which is how `DetailPanel.tsx` reached
   1,123 and `Fleet.tsx` 1,532 — one justified block at a time. The house already has the right ratchet:
   [acd-ui-surface-file-budget](../../../../test/arch/acd-ui-surface-file-budget.test.mjs). **Route:
   required of this milestone** — the control gets a BUDGETS entry at delivery, set just above its
   delivered size, exactly as `ui/src/config/App.tsx` got one at m45's structural review *"the moment a
   thing becomes a file"*. The number cannot be fixed at refine; the obligation can, and this is it.
   Note the ADR-014/E3 rule applies: the ceiling may not be met by deleting rationale — both files carry
   hard-won explanation (the 80×24 soak, the collapse-must-not-tear-down rule) and it must survive the
   move.

3. **TECH_DEBT 18(a) is now measurably WORSE, and this milestone pays a second instalment.** `Fleet.tsx`
   imports **five** modules out of `ui/src/board/` (graph-confirmed: `StaleBadge`, `api`, `freshness`,
   `runs`, `status`) — item 18 recorded seven cross-imports across the surface at m43; the shape is
   unchanged and the layer still does not exist. m45 created `ui/src/app/` and half-paid it. ADR-001
   creates `ui/src/terminal/` and pays the terminal instalment. **Route: TECH_DEBT item 18 stays open**
   — this milestone does NOT migrate the five `fleet → board` imports, because that touches every
   importer and dragging it into a terminal extraction is the scope explosion the health rule warns
   about. The entry should be updated to record that two domain folders now exist outside both surfaces,
   and that the remaining work is the ramp/vocabulary layer.

4. **The product's port map has FOUR homes and one live inconsistency.** Measured:
   [setup-ui.mjs:26](../../../../src/setup-ui.mjs#L26) defaults `4177`;
   [board-serve.mjs:48](../../../../src/board-serve.mjs#L48) `serveBoard` defaults **`4178`** while
   [boardUiProbe:33](../../../../src/board-serve.mjs#L33) and `src/commands/work-ui.mjs:25` both say
   **`4180`**; `src/commands/assets-ui.mjs:22` says `4177` with an api port of `4178`;
   [mesh-ui-serve.mjs:116](../../../../src/mesh-ui-serve.mjs#L116) says `4181` and its comment
   ([:113-115](../../../../src/mesh-ui-serve.mjs#L113-L115)) narrates the whole map from one of its four
   homes. `serveBoard`'s own default collides with the assets API port and is masked only because every
   caller passes one. **Route: TECH_DEBT (new entry).** Not this milestone: the fix is a pure leaf plus
   four launcher edits, none of which this diff otherwise touches, and ADR-004 explicitly avoids adding
   a fifth home. **Proposed entry, ready to paste:** *"The port map has four homes and an inconsistent
   default. `serveBoard`'s `port = 4178` disagrees with `boardUiProbe`/`work:ui`'s 4180 and collides
   with the assets API port; `DEFAULT_MESH_UI_PORT` lives inside the fleet SERVER, so any other module
   needing it either imports a server (a cycle, see m46/ADR-004) or re-types the number. How it bites:
   a caller that omits the port silently gets a different server's port, and the fleet origin cannot be
   named by the board without a cross-import. The fix: one pure leaf owning the map, imported by the
   four launchers; delete every re-typed default."*

5. **`ui/src/app/Shell.tsx` (842) and `shell-layout.mjs` (845) are new, large, and unbudgeted**, and
   ADR-009 adds to Shell.tsx. **Route: conditional, and deliberately narrow** — if m46's dock-host work
   touches `Shell.tsx`, that story adds the budget entry at delivery, per the same rule that added
   `config/App.tsx` at m45's review. No ceiling is imposed here on a file this milestone might not
   touch: a limit one milestone imposes on another's files fails CI for reasons unrelated to the diff
   that trips it (m43's and m45's identical ruling).

6. **Dead code with a live gate pointed at it** — ADR-007's subject. **Route: refactor REQUIRED of this
   milestone.** Recorded here as well as in the ADR because it is the general shape, not a one-off:
   three separate places in this repo already document that `wireTerminalBridge` is dead, and it is
   still on disk with a fitness function asserting its internals.

**Nothing is written to [wiki/work/TECH_DEBT.md](../../TECH_DEBT.md) by this refine**, because this refine
was scoped to author this document only. Findings 1, 2 and 6 are required of this milestone; finding 3
is an update to existing item 18; **finding 4 is a NEW entry that has not been filed, and the proposed
text is above so it can be landed verbatim.** A debt finding that lives only in an architecture
document is a finding the operator cannot schedule — filing it is a real outstanding action, not a
formality.

---

## Story-boundary guidance (input to the PO's break-down — not a partition)

Boundaries are drawn with the PO. These are the seams the ADRs create, with the graph-measured coupling
that decides them.

**Three server-side seams are fully independent of the `ui/` work and of each other** — none has an
edge to any `ui/` file:

- **The dropped-frame fix (ADR-008)** — `src/terminal-ws.mjs`, ← 3 dependents
  (`mesh-worker-execution.mjs`, `setup-ui.mjs`, one test). Ships operator value alone (every session's
  first fit lands), needs nothing from anyone. **First, parallel-eligible.**
- **The dead-bridge deletion (ADR-007)** — `src/mesh-terminal-relay-bridge.mjs` has 16 dependents, but
  **only one dying export**, and the graph confirms no dependent imports it. Small, self-contained,
  parallel-eligible.
- **The origin seam (ADR-004, server half)** — `mesh-ui-serve → board-serve → setup-ui → board-ui`, plus
  the command-layer default. It can land BEFORE anything reads it: a route nobody calls is a
  zero-blast-radius stage, the same shape m45 used for its route module. Note `src/mesh-ui-serve.mjs`
  carries **23 dependents** — the heaviest blast radius in this milestone — but the change there is one
  additive argument at [:781-786](../../../../src/mesh-ui-serve.mjs#L781-L786), and the dependents are
  overwhelmingly arch tests that do not touch it.

**On the `ui/` side the graph says the blast radius is genuinely tiny and closed** — each component has
exactly ONE importer (`TerminalDock.tsx ← Board.tsx`, `FleetTerminalView.tsx ← Fleet.tsx`), and the
five helpers are imported only by their own component and their tests. So the cuts are about SEQUENCING,
not about reach:

- **The shared `.mjs` set is a leaf and is fully testable before anything renders it** (the descriptor
  table, the geometry rule, the URL builder, the state ramp, the input policy, the drag clamp). It can
  land, be exercised exhaustively by `node:test`, and be imported by nothing. **A good cut, same shape
  as m45/ADR-001's route module.**
- **THE BAD CUT, named because it is the tempting one: re-homing the board first and leaving the fleet
  peek "for now".** That is the two-implementations state the milestone exists to end, held on purpose
  across a story boundary. It also strands
  [acd-shell-z-ladder-single-home's exemption](../../../../test/arch/acd-shell-z-ladder-single-home.test.mjs#L48-L53)
  (which retires *with the file*) and leaves the single-xterm-site gate red with no story owning it.
  **Both call sites and the deletion belong in ONE story.**
- **The second bad cut: separating an arch-test file-list update from the move it follows.** In between,
  CI is either red for a whole story or — worse, and specifically for invariant 4 — green and vacuous
  (ADR-006). Every list moves in the diff that moves the code.
- **The dock's shell host (ADR-009) is separable and depends only on the extraction**, not on the origin
  seam. It touches `shell-bus.mjs`, `Shell.tsx` and `Board.tsx` — three files with high symbolic weight
  and small diffs. Worth its own story so the shell edit is reviewed as a shell edit.
- **Headroom to watch:** `Fleet.tsx` has 19 lines under its ratchet. The story that re-homes the peek
  should come out net-negative there; if it does not, that is a signal the call site is absorbing logic
  that belongs in the control.

**The one cross-story dependency to watch:** everything in `ui/` waits on the shared `.mjs` set, and
nothing in `src/` waits on anything. The origin seam and the control extraction meet exactly once — at
the point the control is handed `{ origins }` — and that single argument is the whole interface between
the two halves of this milestone.
