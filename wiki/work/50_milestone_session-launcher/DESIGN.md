---
doc: design
---
<!--
  Milestone DESIGN.md — how should it look and feel, and why.
  Owner: designer. Layout / component / visual intent only.
  UI BEHAVIOUR (what happens when you click) lives in task .feature files — cross-referenced below,
  not specified here.
-->
# 50 · The session launcher — Design

## Intent

Milestone 49 gave `/` a grid of every live session in the fleet. It is a **reader**. This milestone
gives that same surface its first **writer**: pick a node, pick a repo, and a terminal opens there.

**This is one affordance added to an existing surface, not a surface.** SPEC scopes it as *"it
composes with the grid rather than living in its own page"*, and STATE's refine-time note calls it
*"a button that opens a form, not a new surface"*. Every rail, region, ramp, glyph and state word of
[49/DESIGN](../49_milestone_terminals-home/DESIGN.md) is **in force and not re-opened**. This
document adds **no colour, no radius, no font, no `@theme` token, no state word and no breakpoint
system.** What it adds is **one control, one panel, one outcome region and eleven copy strings**,
each listed and justified below.

**Four binding rails. Everything in this document is one of these applied somewhere.**

1. **The launcher reports the DISPATCH; the grid reports the SESSION.** This is m38's own vocabulary
   boundary — *"`Sent` is a DIFFERENT fact no other region reports … it can neither duplicate nor
   contradict the chip"*
   ([assign-affordance.mjs:29-36](../../../ui/src/fleet/assign-affordance.mjs#L29)) — applied at a
   new address. **The launcher never mints a tile**, never claims a session exists, and never
   contradicts what the grid has on screen.
2. **Honest failure is the story, not a branch of it.** SPEC: *"each fails with a stated reason,
   never a spinner that ends in an empty grid slot."* Twelve coded refusals exist across two
   machines; every one of them gets operator-facing language here, and **no code is invented**.
3. **A control that would name a capability this surface does not have is not built.** m49's own
   rule (*"a control that cannot do its job is absent, not disabled"*, 49/DESIGN §S2) and m46's
   `notDeclared` discipline. It is why §DG-50-4 refuses the assistant control outright.
4. **Nothing on this page may say a launched session is Claude.** ADR-007 decision 3: `assistant`
   is a session **label**, not a spawn instruction; the PTY runs the operator's default shell.

**Three surfaces are in scope, and a fourth is AMENDED rather than added:**

- **S1 — the trigger**, in the shell's surface slot beside m49's summary.
- **S2 — the panel**, the form the trigger opens.
- **S3 — the outcome region**, inside the panel, plus its compact form on the trigger.
- **S4 — the launched session's tile.** [49/DESIGN §S2](../49_milestone_terminals-home/DESIGN.md),
  **unchanged except for the one amendment §DG-50-1 forces** — which m49 itself instructed the
  milestone that lands a free-session producer to make.

> **A note on the story's Context bullet.** `stories/04_.../STORY.md` names the surface as
> *"milestone 49's terminals home (`ui/src/fleet/`)"*. The terminals home is **`ui/src/home/`**
> ([Home.tsx](../../../ui/src/home/Home.tsx)); `ui/src/fleet/` is the **`/fleet`** surface. The
> distinction is load-bearing rather than pedantic: `ui/src/home/` may import nothing from
> `ui/src/fleet/` (49/ADR-001, gated), so a build that follows the bullet literally trips a fitness
> function before it renders a pixel. Recorded here; the record doc is the PO's to correct.

---

## Conformance source of truth

> **There is NO committed mock for any surface in this milestone**, and none is expected: this is one
> control added to a surface whose own mocks never arrived either
> ([49/DESIGN §Conformance source of truth](../49_milestone_terminals-home/DESIGN.md) — `mocks/`
> holds `PROMPT.md`, `RESULT.md` and `BASELINE.md`, and the supersession never triggered).
>
> **Therefore the binding checklists in §Surfaces ARE the conformance baseline** — mandatory, and
> the thing a design-conformance review judges the built surface against, region by region. A review
> handed a render of this surface **has a baseline and must not return `INCONCLUSIVE` for want of
> one**; it returns `CONFORMS` or `GAPS` against §Surfaces.
>
> **If a mock later lands it supersedes this document FOR ITS REGION wherever the two differ, and
> this document is amended in the same change.** A remote design-tool link is never a substitute for
> a committed file — the reviewer is read-only and cannot open one (07/ADR-003).
>
> **Everything this document does not fix is fixed elsewhere and is not re-opened here:** the grid,
> the tile, the expanded pane and the four page states are
> [49/DESIGN §Surfaces](../49_milestone_terminals-home/DESIGN.md); the terminal control's own regions
> are [46/mocks/CONFORMANCE.md](../46_milestone_terminal-control-unification/mocks/CONFORMANCE.md);
> the shell's bars and slot placement are
> [45/DESIGN](../45_milestone_ui-app-shell-routing/DESIGN.md).

---

## Route, render breakpoints and render targets

**Route: `/`** — the `landing` entry of the one route table
([routes.mjs:53](../../../ui/src/app/routes.mjs#L53)), served by the fleet face on `:4181`. **Not
`/fleet`.** The surface component is `<Home>` ([Home.tsx:58](../../../ui/src/home/Home.tsx#L58)).

**Breakpoints — the house default, unchanged, plus one:**

- **1280** — the primary judgement width. The surface slot rides in the **48px top bar**.
- **768** — the slot has dropped into the **40px surface bar**
  ([shell-layout.mjs:114-127](../../../ui/src/app/shell-layout.mjs#L114)).
- **390** — mobile, and **the width this design's one geometric risk lives at** (§DG-50-6).
- **760×520 (added, and binding)** — the desktop app's own window. It is added because this
  milestone's new element is a **panel with five stacked regions in a content box whose floor is
  432px** ([shell-layout.mjs:163-165](../../../ui/src/app/shell-layout.mjs#L163) — `CONTENT_FLOOR`),
  and a panel taller than the box it opens over is a failure only this frame can show.

**Render targets** (the orchestration renders these and hands the reviewer the screenshots; **the
reviewer does not run the browser**):

| # | Surface | States to capture |
|---|---|---|
| **R-A** | **S1** at 1280 | at rest (populated grid) · at rest over **E1** · at rest over **E2** · **disabled** (loading) · **disabled** (failed payload) |
| **R-B** | **S1 + S2** at 1280 | panel open, all fields at defaults · panel open with an item chosen |
| **R-C** | **S2** at 1280 | **no nodes** · **no repos on the chosen node** · **no items in the chosen repo** · the chosen node gone **stale** while open |
| **R-D** | **S3** at 1280 | `dispatching` · `pending` · `started` · `refused` (a control-side code) · `failed` (a worker-side code) · `no answer` |
| **R-E** | **S1 + S2** at **390** | trigger at rest beside the **longest** summary (`16 sessions · 16 live · 9 need input`) · panel open · trigger in its compact `· starting…` form |
| **R-F** | **S1 + S2** at **768** | trigger in the surface bar · panel open |
| **R-G** | **S1 + S2** at **760×520** | panel open — the panel is bounded and **scrolls inside itself**; the page does not |
| **R-H** | **S4** at 1280 | a **launched** session's tile, streaming, beside an assignment-owned tile (§DG-50-1) |

**R-D's six frames and R-C's four have no production producer that a reviewer can trigger by hand**
— they are fixture frames, exactly as m49's `needs input` frame was. **A reviewer must not log their
absence from a production render as a finding**, and must judge them when supplied.

---

## The constraints this design is written against

Everything in the right column bounds what this affordance may do. Every fact was read at source for
this document.

| Fact | Where it lives | Consequence for this design |
|---|---|---|
| **The grid renders `status.sessions[]` and nothing else.** A previous poll may only *annotate* a pane it already holds; it is never a source of one | [grid.mjs:141-164](../../../ui/src/home/grid.mjs#L141), [:18-24](../../../ui/src/home/grid.mjs#L18) | **The launcher cannot put a tile on screen.** A pending session lives in the launcher's own region (§DG-50-2) |
| **Only the WORKER writes a session record**; the control writes none, by design | 50/ADR-002 decision 6, 50/ADR-004 decision 5; [mesh-ui-serve.mjs:747-749](../../../src/mesh-ui-serve.mjs#L747) | The 200 is a **promise**, not a record. Nothing in the browser can confirm it except the session appearing |
| **A launched session has `workItem: null`** — it is a *free* session | [api.ts:225-234](../../../ui/src/fleet/api.ts#L225); the index joins `workItem` from assignments only | It lands in m49's `no-producer` axis — **§DG-50-1**, the headline gap |
| **`no-producer` costs the pane its socket, its keyboard, its expand and its toggle** | [feed-axis.mjs:79-98](../../../ui/src/home/feed-axis.mjs#L79); [grid.mjs:181-185](../../../ui/src/home/grid.mjs#L181); [session-mount.mjs:21-39](../../../ui/src/home/session-mount.mjs#L21); 49/DESIGN §S2's per-pane withholding | …so without the amendment the milestone's own session renders **dead and untypeable** |
| **The browser's `no-producer` arithmetic is pinned to `src/` having exactly two `.sendTerminalFrame(` call sites**, shrink-only | [acd-terminal-output-signal-source.test.mjs:97-115](../../../test/arch/acd-terminal-output-signal-source.test.mjs#L97) | Story 03 adds a **third** ([02_pty-output-bridging.feature](stories/03_story_worker-spawn-handler/tasks/02_pty-output-bridging.feature)). The gate exists to force this decision, and it fires |
| **The page contributes exactly ONE node to the surface slot, in ALL FIVE page states**, and declares no bar of its own | [Home.tsx:150-164](../../../ui/src/home/Home.tsx#L150); 49/DESIGN §S1 | The trigger's home is that slot — **it is the only place present in the state an operator meets first** (§DG-50-5) |
| **The surface bar is a fixed `h-10` with `overflow: visible`, and its slot row is `flex-wrap`.** A row that does not fit **wraps and draws across the chrome** — measured | [RepoPicker.tsx:80-99](../../../ui/src/fleet/RepoPicker.tsx#L80) (F-47-V-18) | **§DG-50-6.** The slot's two occupants need a stated yield order, expressed structurally and never as a computed ceiling |
| **The whole payload re-polls every 5000ms** | [page-state.mjs:357](../../../ui/src/home/page-state.mjs#L357) | An open panel must survive a poll: **selections derived, never remembered; option rows never re-ordered under the cursor** |
| **A picker must never name one target and post another** — measured on the assign row | [Fleet.tsx:1235-1249](../../../ui/src/fleet/Fleet.tsx#L1235) | Same rule, same shape, at this control |
| **Option lists are never filtered by eligibility** — *"a coded refusal on the response, never a hidden picker filter"* | [scope.mjs:590-604](../../../ui/src/fleet/scope.mjs#L590) | The picker **annotates**; the route **refuses** (§The picker's shape) |
| **Node liveness has three words already — `live` · `stale` · `unknown`** | [scope.mjs:566](../../../ui/src/fleet/scope.mjs#L566) | The picker borrows them. **No fourth word**, and `live` earns no mark (only a deviation does — [StaleBadge.tsx:34-36](../../../ui/src/board/StaleBadge.tsx#L34)) |
| **The payload states which workspaces a node holds** (`workspaceIds` / `workspaces`), from the same `global_node_workspaces` membership the worker's own guard reads | [api.ts:170-191](../../../ui/src/fleet/api.ts#L170); [global-node-registry.mjs:193-199](../../../src/global-node-registry.mjs#L193); [mesh-worker-execution.mjs:319-322](../../../src/mesh-worker-execution.mjs#L319) | The picker can **pre-empt** `session-repo-unavailable` — but the two stores can disagree, so it annotates rather than hides |
| **`itemRef` is forwarded unvalidated**; a bad ref becomes a worktree failure on another machine, seconds later | [mesh-ui-serve.mjs:687-692](../../../src/mesh-ui-serve.mjs#L687); [03_failure-and-cleanup.feature:32-38](stories/03_story_worker-spawn-handler/tasks/03_failure-and-cleanup.feature) | **The item field is a PICK, never a text box** (§The picker's shape) |
| **`assistant` is on the wire and is rendered NOWHERE in `ui/src`** — not on a tile, not on a node card, not in the summary; m49 excludes it from identity and from order by name | measured: the only `ui/` occurrences are type declarations and exclusion comments ([layout.mjs:176](../../../ui/src/home/layout.mjs#L176), [:193](../../../ui/src/home/layout.mjs#L193)) | **§DG-50-4.** A control whose effect nothing renders is a control that implies an effect it does not have |
| **The 200's own latency is not the session's.** Presence ticks at ~5s (50/ADR-004 decision 5) and the page polls at 5s | 50/ADR-004; [page-state.mjs:357](../../../ui/src/home/page-state.mjs#L357) | The outcome window is **derived from both cadences**, never typed (§The state machine) |
| **The route is BUILT and its sentences exist** — twelve codes across two machines, each with its own server sentence | [mesh-ui-serve.mjs:640-806](../../../src/mesh-ui-serve.mjs#L640); [mesh-session-spawn-handler.mjs:210-279](../../../src/mesh-session-spawn-handler.mjs#L210) | §The failure map is written **against the shipped strings**, not against a guess |

**This design asks for exactly one new fact on the wire** — a producer-side statement that a session
is being relayed (§DG-50-1) — and it is the architect's to shape. **Everything else it renders is on
the payload today.**

---

## The design gaps — seven, each resolving as a rule here plus a `@uat` visual-review scenario

### DG-50-1 — the milestone's own session renders as a dead pane, and m49 predicted it in terms

**Measured.** A launched session is a *free* session: no assignment, so `workItem` is `null`
([api.ts:225-234](../../../ui/src/fleet/api.ts#L225)). m49 derives a pane's **feed axis** from that
one field — `establishedProducer` requires a non-blank `ref` **and** `assignmentId`
([feed-axis.mjs:79-98](../../../ui/src/home/feed-axis.mjs#L79)) — so every launched session lands in
`no-producer`. Four consequences follow, all already built:

1. **No socket.** `dialableTiles` hands the arbiter only `producer-known` and retained tiles
   ([grid.mjs:181-185](../../../ui/src/home/grid.mjs#L181)).
2. **No keyboard.** A non-`producer-known` axis is `read-only`, labelled, with its cause in words
   ([session-mount.mjs:21-39](../../../ui/src/home/session-mount.mjs#L21)).
3. **The chip reads `no live output`** and the pane line reads
   **`no live output — no assignment is relaying this session`**
   ([feed-axis.mjs:57](../../../ui/src/home/feed-axis.mjs#L57), [:229](../../../ui/src/home/feed-axis.mjs#L229)).
4. **Neither header control is offered** — no expand, no `Watch terminal →` (49/DESIGN §S2's
   per-pane withholding rows).

**And the session is streaming the whole time.** Story 03 bridges the PTY through the same
`sendTerminalFrame` wire and accepts terminal input back into it
([02_pty-output-bridging.feature](stories/03_story_worker-spawn-handler/tasks/02_pty-output-bridging.feature)).
So the surface would tell an operator *"nothing will ever feed this"* about the pane they just
created, refuse them the keyboard, and refuse them the expand that is the only way to type
(DG-49-5).

**m49 wrote this gap in advance and named this milestone:** *"If a producer for free sessions ever
lands (milestone 50's spawn is the obvious candidate), **this rule is amended in the same change** —
otherwise the grid would show `no live output` over a session that is streaming, which is the same
lie in the other direction and the worse one"* (49/DESIGN §DG-49-2). The
[shrink-only ceiling](../../../test/arch/acd-terminal-output-signal-source.test.mjs#L97) on
`.sendTerminalFrame(` call sites exists to make that amendment unavoidable, and story 03's third
call site fires it.

**The rule, and it adds no state word and no second axis:**

1. **A launched session's pane is `producer-known`.** It is subscribable, `interactive`, expandable,
   carries the worded toggle, and shows **no** `read-only` pill and **no** `no live output` line.
2. **The axis keys on a STATED producer fact, not on the absence of one.** `workItem != null` stops
   being the whole derivation; the wire must state, per session, that something is relaying it.
   **What that fact is called and how it reaches the browser is the architect's (ADR-008); that the
   browser may not guess it is this document's.** In particular it may **never** be inferred from
   bytes — client-side content-sniffing is fitness-gated (49/DESIGN, RESEARCH §Q2) — and it may not
   be inferred from *"this session has no work item, so it must be a launched one"*, which is the
   same guess wearing the opposite sign.
3. **A session with no producer fact keeps m49's treatment exactly** — chip `no live output`, the
   K6 line, no socket, neither control. The two populations must be **distinguishable from the
   payload alone**, or this rule is unimplementable and the honest answer is a blocker, not a
   default.
4. **49/DESIGN §DG-49-2 is amended in the same change**, as it instructs. Its premise sentence
   (*"keys on one fact on the wire — `workItem === null`"*) becomes false the day this ships, and a
   design document left contradicting the build is the defect m49 logged five times.

**Close condition.** R-H: a launched session's tile beside an assignment-owned one — same chip
vocabulary, same controls, **no `read-only` pill on either**, and no `no live output` anywhere.
**`@uat`: a session you started is a session you can type into.**

### DG-50-2 — the 200 is a promise, and the honest end state for a promise is not a tile

**Measured.** The route mints the id and answers immediately
([mesh-ui-serve.mjs:770-797](../../../src/mesh-ui-serve.mjs#L770)); nothing is persisted control-side
(ADR-002 decision 6); only the worker writes the session record (ADR-004 decision 5); and the worker's
`session-spawn-ack` has **no reader anywhere in `src/`** (story 04's own framing). So between the 200
and the session appearing there is a window in which the browser holds a `sessionId` for a session
that may never exist — and the SPEC forbids exactly what a naive build does here.

**Three things are forbidden outright**, each because it re-creates a lie this arc has already paid
for:

- **A placeholder tile.** The grid's rows are the index's
  ([grid.mjs:141-164](../../../ui/src/home/grid.mjs#L141)) and m49's ADR-009 carries the
  load-bearing negative *"never a ghost pane"*. A tile for a session no node has registered is a
  ghost pane minted by the launcher itself.
- **A spinner with no bound.** m38 measured the same shape and ruled it: *"a hung POST is a REFUSAL,
  not a limbo"* ([assign-affordance.mjs:63-71](../../../ui/src/fleet/assign-affordance.mjs#L63)).
- **A decay to nothing.** m38's `Sent` is allowed to decay because the durable record lands in
  region 5 within a round trip. **Here there is no durable record**, so a decay to rest leaves the
  operator holding nothing at all — the F22 defect exactly.

**The rule: the promise is held, named, bounded, and resolved by the GRID.**

1. **`dispatched` is a first-class state that HOLDS** (§The state machine), stated in words in the
   launcher's own outcome region — never in the grid, never as a tile, never as a toast (this
   product has no toast primitive and m38 refused one by name,
   [Fleet.tsx:1334-1338](../../../ui/src/fleet/Fleet.tsx#L1334)).
2. **The grid is what resolves it.** The session appearing in `sessions[]` under the minted id is
   the only success signal, and the grid already announces it —
   `session appeared: <owner> → <nodeId>` ([grid.mjs:317-320](../../../ui/src/home/grid.mjs#L317)).
   The launcher then says `started`, briefly, and returns to rest: **the tile is the record from
   that moment on, and the launcher stops speaking about it.**
3. **The window is DERIVED from the two cadences it waits on, never typed**: the presence ticker
   (~5s, ADR-004 decision 5) plus the page poll (5s,
   [page-state.mjs:357](../../../ui/src/home/page-state.mjs#L357)) plus one poll of margin —
   `3 × POLL_MS`. Expressed in the poll constant, in the house idiom
   ([assign-affordance.mjs:54-71](../../../ui/src/fleet/assign-affordance.mjs#L54)); **the exact
   number is ADR-008's to pin, the derivation is this document's.** A window shorter than the
   observable latency renders every success as a failure.
4. **When the window expires with nothing, the state is `no answer` — never `failed`.** The outcome
   is genuinely unknown: the directive may have been received and the ack lost. m38's copy and its
   long form are the precedent and the tone
   ([assign-affordance.mjs:122-137](../../../ui/src/fleet/assign-affordance.mjs#L122)).
5. **A late arrival wins.** If the session appears after the window expired, the `no answer` line is
   **cleared** — the grid is the authority and the launcher may not contradict a tile that is on
   screen (rail 1).
6. **The stranded id is never rendered as a live thing.** It goes in the outcome region's `title`,
   the idiom this product already uses for a session id — and a retry mints a **new** id, never
   re-uses it.

**Close condition.** R-D's `pending`, `no answer` and `started` frames. **`@uat`: a session that
never starts says so, and a session that starts stops being the launcher's business.**

### DG-50-3 — twelve codes, two machines, and the operator needs to know WHICH machine

**Measured, and this is the substance rather than the wrapper.** The workspace is validated
**twice, against two different disks**:

- **Control-side**, `existsSync(row.projectRoot)` on the machine serving the page →
  `workspace-not-local` ([mesh-ui-serve.mjs:715-722](../../../src/mesh-ui-serve.mjs#L715)).
- **Worker-side**, `workerHasRepo(ws, workspaceId, nodeId)` on the target machine →
  `session-repo-unavailable` ([mesh-session-spawn-handler.mjs:248-262](../../../src/mesh-session-spawn-handler.mjs#L248)).

A repo can pass one and fail the other in **either** direction. `Repo unavailable` on its own sends
the operator to the wrong machine, and *"this is what an operator can act on"* is the whole of m49's
R-4 (49/DESIGN §S1's error state).

**The rule:**

1. **Every message names the machine the fact is about** — `this machine` for a control-side
   refusal, `<nodeId>` for a worker-side one. No exceptions, including the codes where it seems
   obvious.
2. **The fault is named in the operator's domain, and the diagnostic code is preserved** — m49's
   R-4 verbatim: *"names what was unreachable, refused or busy, and preserves any diagnostic code in
   parentheses. A raw platform or browser exception message is never surfaced as the cause."*
3. **The raw code is never the message.** It rides the outcome region's `title`.
   **Narrowed at `aof:verify` 2026-08-14 (PO ruling F-50-B) — one home per fact: the wire states a
   code, the browser states the sentence.** The original rule had the `title` carry "the server's
   own sentence … verbatim and never re-typed" for *every* code, and that is **unsatisfiable for the
   worker-side lane**: `buildSessionSpawnAckFrame` emits `{ kind, sessionId, nodeId, ok }` plus an
   optional `code` and **no message field**
   ([mesh-session-spawn-directive.mjs:22-26](../../../src/mesh-session-spawn-directive.mjs#L22)),
   ADR-008's outcome route answers `{ state, code, at }`, and the worker's own sentence goes only to
   its daemon log ([mesh-session-spawn-handler.mjs:210-213](../../../src/mesh-session-spawn-handler.mjs#L210)).
   Growing the ack a message would be an ADR-002 wire change *and* a second home for language the UI
   already owns. So the rule binds in two halves:
   - **The POST's coded body** genuinely carries `error` (via `sendApiError`), and there the server's
     sentence is carried **verbatim and never re-typed** — the m38 idiom
     ([assign-affordance.mjs:164-172](../../../ui/src/fleet/assign-affordance.mjs#L164)) and the
     client that already preserves coded fields ([api.ts:298-318](../../../ui/src/fleet/api.ts#L298)).
   - **Every outcome-lane code** renders from the UI's own code→language map
     (`REFUSAL_MAP`, [session-launcher.mjs:172](../../../ui/src/home/session-launcher.mjs#L172)),
     because there is no server sentence on that lane to carry. Rule 4 below is what covers the
     unknown code: it falls back to the server's sentence where one exists, and otherwise to
     `LAUNCHER_REFUSAL_FALLBACK` ([:200](../../../ui/src/home/session-launcher.mjs#L200)) — never
     blank, never the raw code.
4. **A code this document does not know keeps the server's sentence** rather than being re-worded on
   a guess — m38's rule, and it is what keeps a future code from rendering as blank.
5. **Where a next action exists, it is one clause and it names no command this document cannot
   vouch for** — DG-49-1's restraint. Where the *server's own sentence* names a command (it does,
   for `control-identity-unknown`), that sentence carries it in the `title` with the server's
   authority; **this document does not copy it into the rendered line.**

The full map is §The failure map, below.

**Close condition.** R-D's `refused` and `failed` frames, each naming a machine.
**`@uat`: a refused session tells you which machine refused and what to do about it.**

### DG-50-4 — the assistant control would be a control with no effect, or a false one

**Measured, and it is a two-sided trap.** `assistant` is on the wire, is the third part of the
session key, and — per ADR-007 decision 3 — **selects no binary**. It is also **rendered nowhere in
`ui/src`**: the only occurrences are type declarations and m49's own exclusions
([layout.mjs:176](../../../ui/src/home/layout.mjs#L176), [:193](../../../ui/src/home/layout.mjs#L193));
the tile's identity for a free session is `<repo> → <nodeId>` and C1b's field slot is empty
(49/DESIGN §S2; [SessionGrid.tsx:282](../../../ui/src/home/SessionGrid.tsx#L282)).

So there are exactly two things a build can do, and **both are dishonest**:

- **Offer the field and render the label** → a bare shell renders as `claude` beside a terminal
  running `cmd.exe`. STATE already carries this as a watch item, and it is a false claim to the eye,
  which is worse than an invisible one.
- **Offer the field and render nothing** → a control whose only effect is a filename segment on
  another machine. Rail 3, and m46's `provider-picker` refusal (*"there is nothing to pick"*) one
  surface over.

**The rule: this milestone's launcher offers NO assistant control.**

1. **The panel has three fields — node, repo, item — and no fourth.** The request omits `assistant`
   entirely; the wire's own default applies, unchanged and untouched
   ([00_spawn-route-handler.feature:25-28](stories/02_story_fleet-spawn-route/tasks/00_spawn-route-handler.feature)).
2. **The label is rendered on no surface**, so nothing on the terminals home ever claims a launched
   shell is Claude. Rail 4 is satisfied by silence, which is the only form that satisfies it.
3. **The panel's copy states what opens** — K50-10, *`Opens your default shell on that machine.`* —
   because the operator's real question is *"what will I get?"*, and this is the one sentence that
   answers it (ADR-007 decision 1).
4. **The condition under which this reverses is written down**: the day a surface **renders** the
   label truthfully, the picker gains the control **in the same change**, as a `mono` token select
   over the wire's own closed set (`claude · codex · gemini`,
   [mesh-ui-serve.mjs:693-702](../../../src/mesh-ui-serve.mjs#L693)) — **never** the terminal
   control's provider well, whose whole meaning is *"which CLI to spawn"*
   ([ProviderPicker.tsx:1-17](../../../ui/src/terminal/ProviderPicker.tsx#L1)) — rendered as the raw
   id and never title-cased, which is m46's own ruled GAP G3
   ([ProviderPicker.tsx:66-71](../../../ui/src/terminal/ProviderPicker.tsx#L66)).

> **THIS CONTRADICTS STORY 04's ACCEPTANCE BULLET** (*"…and an optional assistant label"*) and is
> **escalated, not decided around** — acceptance is the PO's. If the PO keeps the field, clause 4's
> form is the design for it, plus K50-11 as its caption, and the honesty cost above is accepted
> knowingly rather than discovered. **What must not happen is a build that ships the control with a
> provider-shaped form and copy that reads as "launch Claude".**

**Close condition.** R-B: the panel, three fields, and the sentence naming the default shell.
**`@uat`: the launcher never claims to start an assistant.**

### DG-50-5 — the affordance must work from the EMPTY grid, and that decides where it lives

**Measured (m49, R):** the grid's ordinary state is **empty** — every node reported `sessions: []`
while runs were in flight, which is why the page has two empty states at all
([page-state.mjs:12-20](../../../ui/src/home/page-state.mjs#L12)). **The state an operator most
often meets is the one with nothing in it**, and that is precisely when they want to start a
session.

That single fact rules out two of the three candidate homes:

- **Inside the grid** (a "new session" cell): the grid does not exist in E1, E2, loading or failed,
  and a cell in it would join the roving-focus order and the `(nodeId, repo, sessionId)` sort as a
  thing that is not a session (49/DESIGN §focus model 6-7, §S1's G2 — *"Nothing else"*).
- **A control row above the grid**: a second page-owned band inside a 432px content box, and
  49/DESIGN §S1 rules *"a second bar is a GAP, not a variant"*.

**The rule: the trigger lives in the shell's SURFACE SLOT**, the page's one contribution to the
chrome, which is contributed **outside the page-state ternary** and is therefore present in all five
states ([Home.tsx:150-164](../../../ui/src/home/Home.tsx#L150)) — the same slot the fleet puts its
own controls in ([SurfaceSlot.tsx:54-56](../../../ui/src/app/SurfaceSlot.tsx#L54)). It moves with
the slot between the top bar and the surface bar; **it never changes form when it moves.**

**And the empty cards are NOT touched.** E1 keeps its single exit and its single sentence
(`Nothing is running.` / `Assign work from the fleet.` / `Open the fleet →`). Adding a second
control to the card would be a **second home for one affordance** — the defect this codebase has
logged repeatedly — and DG-49-1's *"exactly one route and NO command"* restraint would be broken by
the milestone that most needs it kept. The launcher is one glance up and to the right, in the same
frame, in every one of those states.

**Close condition.** R-A's five frames — the trigger present and legible over the populated grid,
over E1, over E2, and **disabled** over loading and failed. **`@uat`: you can start a session from
an empty terminals home.**

### DG-50-6 — a second occupant in a 40px bar that has already wrapped once

**Measured, on this exact bar** ([RepoPicker.tsx:72-99](../../../ui/src/fleet/RepoPicker.tsx#L72)):
a hand-computed width ceiling put the fleet's slot row at 365.73px in a 358px rail; the row is
`flex-wrap` inside a fixed `h-10` bar with `overflow: visible`, so it **wrapped to two y-bands and
drew across the top bar's rule and into the content below.** The fix was structural — *"a row that
can always fit cannot wrap, whatever the other occupants do — including occupants a later milestone
adds, which no transcribed constant could have anticipated."*

**This milestone is that later occupant**, and m49's slot currently holds one 11px summary that was
ruled to render in full at 390 (49/DESIGN-CONFORMANCE §3, *"the shipped shell gives the summary its
own 40px bar, so the full string fits"*). **That premise no longer holds**, and pretending otherwise
is how the same defect returns at a third address.

**The rule, structural, with a stated rank:**

1. **The trigger never yields.** It is `shrink-0` and keeps its whole label at every width. A
   control the operator must aim at may not be anonymous — the assign picker's own floor rule
   ([assign-affordance.mjs:108-120](../../../ui/src/fleet/assign-affordance.mjs#L108)), and a
   control that degrades to a bare glyph in the chrome has no other place to explain itself.
2. **The summary is the element that yields.** `min-w-0 truncate`, with its full value in `title`.
   **This AMENDS 49/DESIGN-CONFORMANCE §3's "full summary at 390" row**, and the amendment is
   recorded rather than left to be discovered: a *control* outranks a *summary*, which is exactly
   the rank DG-47-4 applied when the fleet's two reader aids yielded their words to the repo filter.
3. **The row's min-content must fit the rail at every width**, so a wrap is unreachable by
   construction rather than by arithmetic. **No ceiling in `ch`, `vw` or px is computed for this
   row** — that is the F-47-V-18 lesson applied rather than restated.
4. **The trigger's width is reserved to its LONGEST label**, including its compact outcome forms
   (§S3), so a state change never moves the summary or the nav — DG-13 clause 1, one bar over
   ([assign-affordance.mjs:104-107](../../../ui/src/fleet/assign-affordance.mjs#L104)).

**Close condition.** R-E at 390 with the longest summary and the longest trigger label in one frame:
**one y-band, nothing overprinted, the nav unmoved.** **`@uat`: the terminals home's bar holds at
390.**

### DG-50-7 — the panel must survive a poll it cannot see

The payload re-polls every 5s and the option lists are the payload's. A panel that re-renders its
options naively will, mid-form: re-order rows under the cursor, silently coerce a chosen node that
left the roster to the first surviving one, and — the measured version of this defect — **name one
target and post another** ([Fleet.tsx:1235-1249](../../../ui/src/fleet/Fleet.tsx#L1235)).

**The rule:**

1. **The chosen values are DERIVED, never remembered.** The operator's preference is held; what is
   rendered **and** what is sent is resolved against the current payload, so one value cannot
   disagree with itself.
2. **A chosen node or repo that leaves the payload while the panel is open SAYS SO** — the field
   renders the departed id in `mono` with K50-9 beneath it — and it is **never silently swapped**.
   The operator re-aims; the launcher does not aim for them.
3. **Option order is stable and never keyed on liveness, recency or session count**: plain codepoint
   ascending, the comparison m49's grid and `runs.mjs` both use and for the same
   locale-independence reason ([grid.mjs:114-126](../../../ui/src/home/grid.mjs#L114)). **A list
   that re-sorts every 5s under a cursor is the tile-moves-under-the-hand defect, in a menu.**
4. **A poll never closes the panel and never clears a field.**

**Close condition.** R-C's fourth frame — the chosen node gone stale with the panel open, the field
still naming it. **`@uat`: the picker never changes what you picked.**

---

## The picker's shape

**Three fields, two required, one optional. No fourth field** (§DG-50-4).

| # | Field | Required | Control | Options are… | Default |
|---|---|---|---|---|---|
| **F1** | **Node** | **required** | a select over the roster | **every node the payload carries**, never filtered ([scope.mjs:590-604](../../../ui/src/fleet/scope.mjs#L590)) — each row `<nodeId>`, `mono`, plus `stale` / `unknown` where the payload says so, and **nothing where it says `live`** | **none pre-selected when the roster has more than one node.** A pre-picked target on a fleet-wide control is how work lands on the wrong machine; the operator names the machine. One node ⇒ it is selected |
| **F2** | **Repo** | **required** | a select over workspaces | **every workspace on the payload**, in two groups: **on this node** first (the chosen node's `workspaceIds`), then **not on this node**, the second group annotated K50-8 | **none pre-selected.** Re-derived when F1 changes; a chosen repo that is still valid is **kept**, never reset |
| **F3** | **Item** | **optional** | a select over `items[]` narrowed to F2's workspace | `<ref> · <title>`, ref in `mono` | **`none — open the repo root`**, always the first row, always present. **Never a text box** — an unvalidated ref becomes `session-worktree-failed` on another machine seconds later ([mesh-ui-serve.mjs:687-692](../../../src/mesh-ui-serve.mjs#L687)) |

**The four empty / unavailable cases, and each one states its own reason:**

| Case | What renders |
|---|---|
| **No payload** (loading, or the last fetch failed) | **the trigger is disabled and focusable**, carrying K50-2 in its `title`. `aria-disabled`, never the `disabled` attribute — *"an element the keyboard skips hides its explanation from exactly the users who need it"* ([RepoPicker.tsx:165-169](../../../ui/src/fleet/RepoPicker.tsx#L165)) |
| **Payload, but no nodes** | the trigger is disabled and focusable, `title` K50-3 |
| **The chosen node holds no workspaces** | F2 renders its rows anyway, **all in the "not on this node" group**, with K50-8 on the group. **Nothing is hidden**: the two membership stores can disagree, and the route is the authority ([scope.mjs:594-599](../../../ui/src/fleet/scope.mjs#L594)) |
| **The chosen repo has no items** | F3 renders **disabled**, showing only its `none — open the repo root` row, `title` K50-7. **Disabled, not absent** — see the reconciliation below |

> **Why "absent, not disabled" (m49's rule) and "disabled, not hidden" (the picker's rule) are one
> rule, not two.** m49 withholds a *tile* control because **the line above it names the reason** —
> the pane says `not streaming — <N> live panes already · hide one to watch this`, so an absent
> control is fully explained by its neighbour. In a **form**, nothing else on screen would explain a
> missing field, and *"a hidden control cannot explain itself; a disabled one with a `title` can"*
> ([RepoPicker.tsx:24-27](../../../ui/src/fleet/RepoPicker.tsx#L24)). **The principle in both is the
> same: an unavailable control must have its reason on screen.** A reviewer must not log either as
> an inconsistency.

**And a node that is `stale` is still offered.** The route refuses it with a stated code
([mesh-ui-serve.mjs:750-754](../../../src/mesh-ui-serve.mjs#L750)), which is a better answer than a
picker that quietly drops a machine the operator can see in the fleet. The annotation is the
pre-emptive half; the refusal is the authoritative one.

---

## The state machine the operator sees

**Seven states. Two of them are new to this product; the other five are m38's, borrowed with their
reasons.**

```
 rest ──open──▶ open ──submit──▶ dispatching ──200──▶ dispatched (pending)
   ▲              ▲                   │                    │  │  │
   │              │                   │ coded 4xx/5xx      │  │  └── window expires ──▶ no answer
   │              │                   └───────────────▶ refused │
   │              │                   │ POST deadline           └── worker ack {ok:false} ──▶ failed
   │              │                   └───────────────▶ no answer
   └──────────────┴───────── session appears in sessions[] ──────▶ started ──(one hold)──▶ rest
```

| State | The action reads | The outcome region reads | Fields | Holds for |
|---|---|---|---|---|
| **rest** | `Start session →` | nothing | at their last values | — |
| **open** | `Start session →` | nothing | editable; the action is **disabled until F1 and F2 are both chosen** | — |
| **dispatching** | `Starting…` | nothing | **frozen on the chosen values, at full width** — never collapsed, never blanked ([assign-affordance.mjs:90-99](../../../ui/src/fleet/assign-affordance.mjs#L90)) | until the POST answers, or the **POST deadline** |
| **dispatched** (pending) | `Start session →`, **disabled** | **K50-4** — `starting on <nodeId> · waiting for it to appear` | frozen | until the session appears, an ack arrives, or the **outcome window** expires |
| **started** | `Start session →` | **K50-5** — `started on <nodeId>` | released | **one poll interval**, then rest — m38's decay, for m38's reason |
| **refused** | `Start session →` | the coded line (§The failure map), `title` = the server's sentence + code | released, **selection kept** | **no hold** — it stands until the next attempt |
| **failed** | `Start session →` | the coded line, naming `<nodeId>` | released, selection kept | no hold |
| **no answer** | `Start session →` | **K50-6** — `no answer — the session has not appeared`, `title` = K50-12 | released, selection kept | no hold; **cleared the instant the session appears** (§DG-50-2 rule 5) |

**The two deadlines are different things and must not be one number.**

- **The POST deadline** — the request itself hanging. **Two poll intervals**, inherited verbatim,
  including its reasoning: *"one interval is too eager for a cross-machine POST; two is past the
  point any answer is still useful"* ([assign-affordance.mjs:63-71](../../../ui/src/fleet/assign-affordance.mjs#L63)).
  It abandons **the wait, never the call** — no abort, no retry, because a possibly-successful
  server-side mint must not be made ambiguous.
- **The outcome window** — the 200 in hand, the session not yet visible. Derived from the presence
  ticker plus the poll plus one poll of margin (§DG-50-2 rule 3).

**`refused` and `no answer` are deliberately different words for different facts** — one is a
stated refusal, the other is silence — and neither may read as the other. A timed-out dispatch says
*no answer*, never *failed*: the outcome is unknown, not negative
([assign-affordance.mjs:129-137](../../../ui/src/fleet/assign-affordance.mjs#L129)).

**Re-submission is permitted from every terminal state and always mints a new id.** A re-click into
a projection that has already caught up simply draws an ordinary coded refusal, which is a correct
answer rather than a new failure mode — m38's own ruling.

---

## The failure map — every code, and what a human reads

**Twelve codes. Nine control-side (the POST's own response), three worker-side (ADR-008's lane).**
No code below is invented; each was read at its source. `<node>` is the chosen `nodeId`, `<repo>` the
chosen workspace's name.

**In every row: the rendered line is the LEFT column's; the server's own sentence and the raw code
ride the `title`, verbatim.**

### Control-side — the POST answered

| Code · status | What it means, at source | The operator reads | Next action, in the same line |
|---|---|---|---|
| `invalid-body` 400 | a required field missing, or a wrong-typed optional one ([:640-702](../../../src/mesh-ui-serve.mjs#L640)) | **`incomplete request — this build and the route disagree`** | — (it is unreachable from a correct panel; if it renders, the form is the fault) |
| `workspace-not-found` 404 | no such row in the projection ([:711-714](../../../src/mesh-ui-serve.mjs#L711)) | **`<repo> is not in the mesh any more`** | `· reopen the picker to refresh` |
| `workspace-not-local` 409 | the row exists; its `projectRoot` is **not on the control machine** ([:719-722](../../../src/mesh-ui-serve.mjs#L719)) | **`<repo> is not checked out on this machine`** | `· pick a repo this machine holds` |
| `control-identity-unknown` 409 | this control has no mesh identity ([:727-736](../../../src/mesh-ui-serve.mjs#L727)) | **`this machine has no mesh identity yet`** | — the server's sentence names the command; the line does not (§DG-50-3 rule 5) |
| `session-target-not-connected` 503 | the target's presence is not `live` ([:750-754](../../../src/mesh-ui-serve.mjs#L750)) | **`<node> is not connected to this machine`** | `· it must be online to open a session` |
| `session-dispatch-unavailable` 503 | no relay configured, so nothing can cross ([:761-769](../../../src/mesh-ui-serve.mjs#L761)) | **`this machine cannot reach its workers — no relay is configured`** | — the server's sentence names the config key |
| `session-dispatch-failed` 503 | the relay hand-off threw; **nothing crossed** ([:780-796](../../../src/mesh-ui-serve.mjs#L780)) | **`the request never left this machine`** | `· the relay is not answering` |
| `session-route-failed` 500 | the route's own catch-all — a store read or fs probe threw ([:798-806](../../../src/mesh-ui-serve.mjs#L798)) | **`this machine could not answer`** | `· the daemon log has the fault` |
| `cross-origin-refused` 403 · `invalid-content-type` 400 | the admission guards (ADR-001 decision 3) | **`this page was refused by its own daemon`** | — unreachable from a same-origin panel; if it renders, this build is being served from somewhere it should not be |

### Worker-side — the 200 was already sent; these arrive on ADR-008's lane

**Every one names the node, because by definition the fault is on another machine** (§DG-50-3).

| Code | What it means, at source | The operator reads | Next action, in the same line |
|---|---|---|---|
| `session-repo-unavailable` | the target does not have that workspace, or its scoped checkout would not load ([mesh-session-spawn-handler.mjs:226-279](../../../src/mesh-session-spawn-handler.mjs#L226)) | **`<node> does not have <repo>`** | `· pick a node that carries it` |
| `session-worktree-failed` | `addWorktree` threw for the chosen ref ([03_failure-and-cleanup.feature:32-38](stories/03_story_worker-spawn-handler/tasks/03_failure-and-cleanup.feature)) | **`<node> could not make a worktree for <ref>`** | `· start without an item to open the repo root` |
| `session-spawn-failed` | node-pty would not load, or `pty.spawn` threw ([:16-30](stories/03_story_worker-spawn-handler/tasks/03_failure-and-cleanup.feature)) | **`<node> could not open a terminal`** | `· the node's own log has the fault` |
| `session-already-active` | a PTY is already live for that id ([mesh-session-spawn-handler.mjs:234-237](../../../src/mesh-session-spawn-handler.mjs#L234)) | **`that session is already open on <node>`** | `· it is in the grid` |

**A `session-already-active` is not painted as a failure of the operator's making** — it is the
idempotency guard doing its job, and the session it names **exists**. If the grid holds that tile,
rail 1 applies: the launcher says it once, quietly, and the tile is the record.

---

## Surfaces

### S1 — the trigger, in the surface slot

- **Committed mock:** none. **The checklist below IS the baseline.**
- **Host:** the shell's **surface slot** — the top bar at ≥1024, the 40px surface bar at ≤1023
  ([shell-layout.mjs:114-127](../../../ui/src/app/shell-layout.mjs#L114)). Contributed through
  `<SurfaceSlot>` with every captured value in `deps`
  ([SurfaceSlot.tsx:16-21](../../../ui/src/app/SurfaceSlot.tsx#L16)).

#### Binding checklist

| # | Region | Contents |
|---|---|---|
| **L0a** | **the summary** — m49's G0, unchanged in content | `<N> sessions · <M> live · <K> needs input`, `text-[11px] text-muted-foreground`, renders **nothing** without a payload (m49's R-3). **Now `min-w-0 truncate` with its full value in `title`** (§DG-50-6 rule 2) |
| **L0b** | **the trigger** — one `<button>`, right of the summary, `shrink-0` | **`New session ▾`**, `aria-haspopup="dialog"`, `aria-expanded`, the disclosure caret `▾` in `text-muted-foreground` `aria-hidden` — the repo picker's own trigger anatomy ([RepoPicker.tsx:281-300](../../../ui/src/fleet/RepoPicker.tsx#L281)) |

**Form:** the house's own trigger skin, verbatim —
`flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium transition`
([RepoPicker.tsx:131-141](../../../ui/src/fleet/RepoPicker.tsx#L131)). **Not the `primary` tint**:
the filled `primary` block in a bar means an active scope/segment (47/DESIGN's two-narrowings
ruling), and a permanently-tinted control in the chrome would out-shout the page. The **panel's
submit action** is where the `primary` tint lives.

**States:**

- **rest** — `New session ▾`.
- **disabled** — `aria-disabled`, `text-muted-foreground/60`, still focusable, `title` K50-2 or
  K50-3.
- **open** — `aria-expanded="true"`; **the trigger does not change its label.**
- **compact outcome** — `New session · starting…` / `· failed` / `· no answer`, rendered **only when
  the panel is closed while an outcome is unresolved**. **`started` never appears here** (it decays
  into the grid). At most one spawn is ever in flight — SPEC scopes one session at a time — so this
  is a word, never a count.
- **width** — reserved to the longest of those labels in **every** state (§DG-50-6 rule 4).

**Design ramp:** the **light shell ramp**. Nothing in the chrome uses the terminal palette.

---

### S2 — the panel

- **Committed mock:** none. **The checklist below IS the baseline.**
- **Host:** a popover anchored to the trigger, in the trigger's own containing span, at the repo
  picker's rung (`z-20`) — **never a new rung, and never above the shell's fullscreen occupant
  (`z-50`, [shell-layout.mjs:792-797](../../../ui/src/app/shell-layout.mjs#L792))**.

#### Binding checklist

| # | Region | Contents | Scroll owner |
|---|---|---|---|
| **L1** | **the panel frame** | `rounded-md border border-border bg-popover p-1 text-xs text-popover-foreground shadow-md`, **`max-h-[60vh] overflow-y-auto`**, `w-[320px]` — the repo picker's popover class, verbatim, one width wider ([RepoPicker.tsx:317](../../../ui/src/fleet/RepoPicker.tsx#L317)) | **the panel, and nothing else** |
| **L2** | **the title row** | **`Start a session`** (K50-... see §copy), `font-semibold`, plus **the one caption**: `Opens your default shell on that machine.` (K50-10), `text-[11px] text-muted-foreground` | none |
| **L3** | **the required fields** | `Node` (F1) then `Repo` (F2) — label `text-[11px] text-muted-foreground shrink-0` above a full-width select, values in `mono`, the assign row's select skin verbatim (`rounded-md border border-border bg-muted px-2 py-1 text-[11px]`, [Fleet.tsx:1322](../../../ui/src/fleet/Fleet.tsx#L1322)) | none |
| **L4** | **the optional field** | `Item (optional)` (F3), same skin, first row `none — open the repo root` | none |
| **L5** | **the action row** | one `<button>` — `Start session →` — in the action skin `rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary` ([Fleet.tsx:1354](../../../ui/src/fleet/Fleet.tsx#L1354)), **width reserved to its longest label**, right-aligned | none |
| **L6** | **the outcome region** — §S3 | one line, or nothing | none |

**Rules that bind the panel's shape:**

- **The fields are STACKED, one per row, full width.** The assign row's `select · button` row is
  geometry-locked to a 286px card ([assign-affordance.mjs:236-268](../../../ui/src/fleet/assign-affordance.mjs#L236));
  a 320px panel with three fields on one row would reproduce every yield defect that row spent two
  milestones fixing. **A stacked form has no yield ladder, which is the point.**
- **The panel never truncates a field value**; a long node id or repo name wraps or truncates
  **inside its own select**, with the full value in `title`.
- **The panel is bounded and scrolls inside itself** — which is what keeps it inside a 432px content
  box at 760×520 (R-G).
- **The panel is clamped to the viewport**: right-anchored to the trigger, shifted only as far as it
  must be to keep an 8px gutter, capped to the rail. This is the arithmetic the repo picker already
  proved it needs — *"truncation announces itself, clipping does not"*
  ([slot-aids.mjs:69-111](../../../ui/src/fleet/slot-aids.mjs#L69)). **The same rule, not a second
  answer to it.**
- **Dismissal is ONE act, and it has four doors**: `Escape`, a press outside, focus leaving, and a
  successful submit's decay. Each closes **and** returns focus to the trigger — *"splitting them is
  how the shipped build ended up with a picker that could be opened and not closed"*
  ([RepoPicker.tsx:176-218](../../../ui/src/fleet/RepoPicker.tsx#L176)). **A dismissal never cancels
  an in-flight or unresolved spawn** (§S3).
- **A poll changes nothing about an open panel** (§DG-50-7).

**States (empty / loading / error / populated):**

- **populated** — three fields, options from the payload.
- **empty** — the four cases in §The picker's shape, each with its reason on screen.
- **loading / error** — **the panel is unreachable**: with no payload the trigger is disabled, so
  the panel has no state of its own for those. **A panel that opened onto three empty selects would
  be a form that cannot be completed and does not say why.**

**Design ramp:** the **light shell ramp** — `bg-popover`, `border-border`, `text-popover-foreground`,
`--color-ring` for focus. **A panel painted in the terminal palette (`#0f1629`) would be a second
visual language in the chrome and is a GAP.**

---

### S3 — the outcome region

- **Committed mock:** none. **The checklist below IS the baseline.**
- **Host:** region **L6** of the panel, plus the trigger's compact form (§S1) when the panel is
  closed.

#### Binding checklist

- **One line, one state, ever.** Never two, never a state plus a residue.
- **It WRAPS; it does not truncate.** Up to three lines inside the 320px panel. *(This does not
  contradict m49's GAP-8, which forbids a wrapping line in a fixed-height card inside an `auto-fill`
  grid — this panel is bounded and owns its own scroll, and the whole reason is legible here where
  it was not there. A reviewer must not log the wrap.)*
- **Tone, by state:**
  - `dispatching` — **nothing** (the action's own label is the state; a second indicator would be
    two elements reporting one fact).
  - `dispatched` / `started` — `text-muted-foreground`. **No spinner, no shimmer, no motion.** The
    only animations in this house animate under `prefers-reduced-motion` (m49/DG-49-6), and this
    milestone adds no third.
  - `refused` / `failed` — `text-destructive`, the message slot's own tone
    ([Fleet.tsx:1365](../../../ui/src/fleet/Fleet.tsx#L1365)). **Colour never travels alone**: the
    words state the outcome.
  - `no answer` — **`text-muted-foreground`, NOT `destructive`.** Nothing failed; nothing was
    confirmed. Painting silence red asserts a fault that has not been observed.
- **`role="status"`, never `role="alert"`** — a refused dispatch is information, and it is the
  operator's own action being reported back. The region is `aria-live="polite"` **and it is the
  launcher's own**, distinct from the grid's one region ([SessionGrid.tsx:232-238](../../../ui/src/home/SessionGrid.tsx#L232))
  — two regions, two subjects, and neither narrates the other's.
- **The `title` always carries the server's own sentence and the raw code**, verbatim.
- **The stranded `sessionId` appears only in the `title`.**

---

### S4 — the launched session's tile

**Not redesigned.** [49/DESIGN §S2](../49_milestone_terminals-home/DESIGN.md) and
[46/mocks/CONFORMANCE.md](../46_milestone_terminal-control-unification/mocks/CONFORMANCE.md) bind
every region. **Exactly one thing differs, and it is §DG-50-1:**

| what | launched session | assignment-owned session |
|---|---|---|
| feed axis | **`producer-known`** | `producer-known` |
| posture | **`interactive`**, no `read-only` pill | `interactive` |
| socket | **subscribable**, counted against `MAX_LIVE_PANES` ([socket-cap.mjs:46](../../../ui/src/home/socket-cap.mjs#L46)) | subscribable |
| header controls | **both** — `⤢` and `Watch terminal →` / `Hide terminal` | both |
| identity (C1a) | `<repo> → <nodeId>` — the free-session row of m49's identity table, **unchanged** | `<ref> → <nodeId>` |
| C1b field | **empty** — the repo is already the owner, and the assistant label is **not rendered** (§DG-50-4) | the repo |

**A launched session is otherwise indistinguishable from any other**, which is SPEC's own
requirement (*"a launcher that produces a second class of session defeats its own purpose"*). **A
build that marks it — a badge, a tint, a different order — is a GAP.**

---

## The design ramp — every value read at source, none invented

| Element | Value | Read at |
|---|---|---|
| **Trigger / select skins** | `rounded-md border border-border bg-background` (trigger) · `bg-muted` (selects), `px-2.5 py-1` / `px-2 py-1`, `text-xs` / `text-[11px]` | [RepoPicker.tsx:131-141](../../../ui/src/fleet/RepoPicker.tsx#L131); [Fleet.tsx:1322](../../../ui/src/fleet/Fleet.tsx#L1322) |
| **Action button** | `rounded-md border border-primary/40 bg-primary/10 text-primary font-semibold`, hover `bg-primary/20`, disabled `opacity-50` | [Fleet.tsx:1354](../../../ui/src/fleet/Fleet.tsx#L1354) |
| **Panel** | `rounded-md border border-border bg-popover p-1 text-xs text-popover-foreground shadow-md max-h-[60vh] overflow-y-auto` | [RepoPicker.tsx:317](../../../ui/src/fleet/RepoPicker.tsx#L317) |
| **Refusal text** | `text-destructive`, `mono`, `text-[10.5px]` | [Fleet.tsx:1365](../../../ui/src/fleet/Fleet.tsx#L1365) |
| **Muted text / labels / captions** | `text-[11px] text-muted-foreground` | [Home.tsx:161](../../../ui/src/home/Home.tsx#L161) |
| **Focus ring** | `--color-ring` = `hsl(174 72% 27%)` = `#13766d`, **2px**, `outline-offset: +2px` | [index.css:23](../../../ui/src/index.css#L23); 49/DESIGN §focus model 5 |
| **Popover gutter / clamp** | 8px, right-anchored, shifted only as far as needed | [slot-aids.mjs:49](../../../ui/src/fleet/slot-aids.mjs#L49) |
| **Z rung** | `z-20`, the repo picker's | [RepoPicker.tsx:317](../../../ui/src/fleet/RepoPicker.tsx#L317) |
| **Separator** | `·` (U+00B7) · caret `▾` · action arrow `→` | product-wide |
| **Poll cadence** | 5000ms | [page-state.mjs:357](../../../ui/src/home/page-state.mjs#L357) |
| **Motion** | **none.** This milestone adds no animation anywhere | — |

**Not one value in this table is new.** The only additions this milestone makes are **copy
strings**, listed next.

### The copy this milestone adds

**BINDING, inherited verbatim from 49/DESIGN: every interpolated count pluralises by its own value,
and every new count string is written down with its singular case.** This milestone renders **no
interpolated count** — deliberately: the trigger's compact form is a word, not a tally (§S1), and
the outcome region speaks about one session. **That is the K12 shape m49 asked the others to copy:
where a count can be omitted, omit it.**

| # | Where | String | Why it is not an existing string |
|---|---|---|---|
| **K50-1** | S1 · trigger | **`New session ▾`** | the product's verb for this is `session`; the caret is the disclosure form the repo picker already uses |
| **K50-2** | S1 · disabled `title`, no payload | **`The mesh has not answered yet — a session cannot be started until it does.`** | distinguishes "we do not know" from "there is nothing"; m49's R-3 makes exactly this distinction one region left |
| **K50-3** | S1 · disabled `title`, no nodes | **`No nodes have published to this mesh yet.`** | the repo picker's own disabled sentence, one noun over ([RepoPicker.tsx:242](../../../ui/src/fleet/RepoPicker.tsx#L242)) |
| **K50-4** | S3 · dispatched | **`starting on <node> · waiting for it to appear`** | states what was done **and** what is being waited on — the two halves DG-50-2 requires |
| **K50-5** | S3 · started | **`started on <node>`** | reports the DISPATCH's completion, not the session's state (rail 1) |
| **K50-6** | S3 · no answer | **`no answer — the session has not appeared`** | m38's `no answer — timed out` adapted to the fact actually being waited on |
| **K50-7** | S2 · F3 disabled `title` | **`This repo has no work items in the mesh projection.`** | names why the field cannot be used, in the field |
| **K50-8** | S2 · F2 group label | **`not on <node>`** | the pre-emption of `session-repo-unavailable`, stated as a fact about membership rather than as a prohibition |
| **K50-9** | S2 · a chosen value that left the payload | **`no longer in the mesh — pick another`** | the anti-coercion rule made visible (§DG-50-7 rule 2) |
| **K50-10** | S2 · caption | **`Opens your default shell on that machine.`** | ADR-007 decision 1, in the operator's words. **The one sentence that stops the panel implying an assistant** |
| **K50-11** | S2 · assistant caption — **only if the PO overturns §DG-50-4** | **`Labels the session. It does not choose what runs.`** | written now so an overturn does not invent copy at build time |
| **K50-12** | S3 · `no answer` `title` | **`The dispatch was accepted and a session id was minted, but no session has appeared and the node has reported nothing. The request may still have succeeded: if the session registers, it will appear in the grid on its own.`** | m38's `ASSIGN_DETAIL_TIMED_OUT` shape — the long form says the honest thing the short copy has no room for |
| **K50-13** | S2 · title row | **`Start a session`** | the panel names its own act; the trigger names the noun |
| **K50-14** | S2 · F3 first row | **`none — open the repo root`** | states the default's **effect**, not its absence |

Plus the fourteen failure lines in §The failure map, each of which is copy and each of which is
justified in its own row.

---

## Accessibility requirements (expected to be honoured)

The automated lane is opt-in and currently off (49/DESIGN), so these bind the **design-conformance
review and the `@uat` visual review**.

1. **The trigger is a `<button>` with `aria-haspopup="dialog"` and `aria-expanded`**, and its
   accessible name is the whole label — never a bare caret.
2. **A disabled trigger stays focusable** (`aria-disabled`, not `disabled`), because its `title` is
   the only explanation and the keyboard must reach it.
3. **The panel is a labelled group** — `role="dialog"` with `aria-label` = K50-13 — with focus moved
   into its first field on open and **returned to the trigger on every dismissal path**.
4. **`Escape` closes the panel.** This does not collide with 49/DESIGN §focus model 9 (`Escape` does
   nothing on the grid, and belongs to the far end inside a terminal): the panel is a dismissible
   overlay and is the only thing on this surface that may claim the key — **and it claims it only
   while open** ([RepoPicker.tsx:193-218](../../../ui/src/fleet/RepoPicker.tsx#L193)).
5. **Every field has a real label**, associated, not a placeholder standing in for one.
6. **The outcome region is `role="status"` + `aria-live="polite"`, never `assertive`**, and it is
   the launcher's own region — the grid's one region keeps its own subject (DG-49-7).
7. **Focus is never trapped by a poll**: a re-render must not move focus out of the field the
   operator is in.
8. **Target size ≥24×24 CSS px** for the trigger, the action and every select (SC 2.5.8), achieved
   by padding.
9. **Nothing is announced by colour alone** — `refused`, `failed` and `no answer` are distinguished
   by their **words**, and `no answer` is not red at all.
10. **The panel is reachable and usable at 390 and at 760×520**, which are the widths where a form
    in a popover fails first.

---

## Documented defaults (decided here, not blocking)

The PO can override any of these; they exist so the build has no open question.

1. **The trigger lives in the surface slot, in all five page states**, and the empty cards are not
   touched.
2. **Three fields: node, repo, item. No assistant control** (§DG-50-4 — **escalated**, since it
   contradicts story 04's acceptance bullet).
3. **Node and repo are required; neither is pre-selected on a multi-node fleet.**
4. **Options are never hidden by eligibility; they are annotated. The route refuses.**
5. **The item field is a pick from the payload, never a text box.**
6. **The launcher never mints a tile.** The grid resolves the promise.
7. **`dispatched` holds until the session appears, an ack lands, or a derived window expires.**
8. **`no answer` is muted, never red, and is cleared by a late arrival.**
9. **Every failure line names its machine and preserves the server sentence + code in `title`.**
10. **The trigger never yields; the summary does** (and 49/DESIGN-CONFORMANCE §3's 390 row is
    amended accordingly).
11. **Selections are derived, never remembered; option order is stable and codepoint-ascending.**
12. **The panel is light-ramp, bounded, clamped, `z-20`, and dismisses in one act with four doors.**
13. **A launched session's tile is `producer-known`, typeable, and otherwise identical to any
    other** — and 49/DESIGN §DG-49-2 is amended in the same change.
14. **This milestone adds no motion, no token, no state word and no breakpoint.**

---

## Open questions

Listed so the review knows which rulings are provisional and what a different answer costs.

1. **The assistant control** (§DG-50-4). Ruled: **not offered**. This contradicts story 04's
   acceptance bullet and is the PO's to settle. Cost of overturning: K50-11 plus a control whose
   effect nothing renders — and the standing risk that a later surface renders `claude` over a
   `cmd.exe`.
2. **Whether `control-identity-unknown`'s rendered line should carry the command** the server's
   sentence already names (`aof mesh identity`). Ruled: **no** — DG-49-1's restraint. Reopen if the
   architect confirms that command is the whole and only fix, in which case it becomes a line in the
   copy table rather than a `title`.
3. **Whether the trigger should also appear inside the empty card** in E1/E2. Ruled: **no** — one
   affordance, one home. Reopen only with a measured observation that operators miss it in the
   chrome; the fix would then be to **move** it, never to have two.
4. **Whether `no answer` should offer a "check again" control.** Ruled: **no** — the page already
   re-polls every 5s and the grid resolves late arrivals by itself, so the control would restate a
   thing that is already happening.
5. **Whether the panel should stay open after a success.** Ruled: **it closes on the `started`
   decay**, because SPEC scopes one session at a time and the operator's next act is to look at the
   grid.
6. **`ui/src/home/`'s file budget.** The directory is at its declared ceiling of 15 with an
   allowance of 0 ([acd-ui-directory-budget.test.mjs](../../../test/arch/acd-ui-directory-budget.test.mjs)),
   and it may import nothing from `ui/src/fleet/` — so where the launcher's decision module and
   component live is **an ADR, not a diff**. **Not a design decision, and named here only so it is
   not discovered at build time.** The design's requirement is narrower and does bind: **the panel
   behaves identically to the repo picker's** — same clamp, same one-act dismissal, same roving
   focus — because two dismissal contracts in one product is a defect regardless of which file each
   lives in.

---

## Behavioural outcomes (cross-reference)

The user-visible BEHAVIOUR belongs in story 04's task features, **not here**. This document fixes the
look and feel; the features fix what happens.

**Subjects the features must own, which this document deliberately does not specify:**

- **The spawn-outcome lane** (`tasks/00_*`, ADR-008): how the worker's `session-spawn-ack` reaches
  the browser across the two-process split, and **the producer fact §DG-50-1 needs on the wire**.
  Both are architecture; this document states only what the operator must be able to see.
- **The picker's population rules as scenarios** (`tasks/01_*`): options from the payload alone, no
  eligibility filter, the derived-not-remembered target, the group split by node membership, and the
  four empty cases.
- **The state machine as scenarios** (`tasks/02_*`): the seven states, the two distinct deadlines,
  the late-arrival clear, the new id on every retry, and one scenario per coded refusal.
- **`@uat` visual review — the session launcher**, judged region by region against §Surfaces, with
  **one row per design gap**: DG-50-1 (a launched session is typeable) · DG-50-2 (the promise is
  bounded and honest) · DG-50-3 (a refusal names its machine) · DG-50-4 (nothing claims to start
  Claude) · DG-50-5 (launchable from an empty grid) · DG-50-6 (the bar holds at 390) · DG-50-7 (the
  picker never changes what you picked).
