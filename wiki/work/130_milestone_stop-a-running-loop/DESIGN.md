---
doc: design
---
<!--
  Milestone DESIGN.md — how should it look and feel, and why.
  Owner: designer. Layout / component / visual intent only.
  UI BEHAVIOUR (what happens when you click) lives in task .feature files — cross-referenced below,
  not specified here.
-->
# 130 · Stop a running loop — Design

## Intent

A loop that is running somewhere already has a line that says so — the fleet node card's current-work
region ([38/DESIGN.md §Surface 1](../38_milestone_cross-machine-worker-execution/DESIGN.md), the line
`running N runs` / `working · <repo> (session)`), and, for a supervised loop, the desktop supervisor
that keeps it alive. This milestone puts **one affordance on the row that already shows the loop** and
nothing else: no panel, no page, no chip, no new ramp. The two surfaces make exactly these additions:

1. **The fleet node card names each live loop on the node** as one more text line in the current-work
   slot — `loop 129 · continue 129/04 · cycle 1 of 3` — and, on **this node's card only**, ends that
   line with one `Stop` button whose **two rungs are legible**: the first press asks the loop to finish
   its in-flight drive and halt; the second, on the same loop, cancels the in-flight session now. A
   remote node's loop line has no button.
2. **The desktop window lists each supervised loop declaration as a row in the control bar's own
   vocabulary** — `loop 129`, the daemon rows' signal pill, one Stop control, **no Start** (a declaration
   starts through the reconcile, never by hand). Its Stop is the same request first, then the
   supervisor's own grace and tree-kill ladder; the row says `stopping` while that runs.

The feeling to keep is the one 36 set for the desktop ("an operator glances… and moves on") and 38 set
for the card (a plain-text region, "no new primitive"). A stop is the ordinary way a loop ends, not an
alarm; only the second rung — cancelling a live session mid-flight — earns the `destructive` tone, and it
earns it in word and tint together. Every fleet token below is already in
[ui/src/index.css:3-25](../../../ui/src/index.css#L3); every desktop class is already in
[styles.css](../../../app/desktop/ui/styles.css).

## Conformance source of truth

> **NO MOCK WAS ELICITED** — no `mocks/` directory exists for milestone 130 and no human was available to
> supply one. Per **07/ADR-003** ([07/ARCHITECTURE.md:163](../07_milestone_design-conformance/ARCHITECTURE.md#L163))
> the **binding checklist under each surface below is the mandatory conformance source of truth** the
> design-conformance review judges the built surface against. A mock produced later lands under this
> milestone's `mocks/` (committed, locally readable) and becomes the visual source of truth, with these
> checklists as the region-by-region rubric.

- **Render routes.** Surface 1: `http://127.0.0.1:4181/?mode=fleet` (the fixed fleet port), judged on
  the node card of the local node with a live loop, and on a remote node's card. **1280 only** — 38
  ruled 390/768 effectively unrenderable for this page ([38/DESIGN.md:826](../38_milestone_cross-machine-worker-execution/DESIGN.md#L826)).
  Surface 2: the standalone `app/desktop/ui/index.html` (the committed-mock path,
  [app.js:345-352](../../../app/desktop/ui/app.js#L345)) at the mock's 760×520 frame
  ([styles.css:49-54](../../../app/desktop/ui/styles.css#L49)), **light and dark** (`?theme=`), which
  means the `LOCAL_STATE` fixture ([app.js:48](../../../app/desktop/ui/app.js#L48)) gains a loop-row
  fixture so the bar can be rendered at all — a fixture is not a second data path.
- **Not judged by screenshot:** the string contract between the fleet's `fleetCurrentWorkLines` and the
  Rust `current_work()` (38 S10) — this milestone leaves both strings untouched (§What the surfaces receive).

## What the surfaces receive

| Fact | Where | Consequence |
|---|---|---|
| The card production mounts renders `GlobalNode` rows; that type has **no `local` marker**, and the global envelope names no local node id | [api.ts:180-201](../../../ui/src/fleet/api.ts#L180), [global-mesh-query.mjs:552-581](../../../src/global-mesh-query.mjs#L552); `nodePanelFacts` reads `safe.local` only on the never-mounted local shape ([scope.mjs:664](../../../ui/src/fleet/scope.mjs#L664), [api.ts:93-96](../../../ui/src/fleet/api.ts#L93)) | **"This node" is a fact the wire does not yet carry.** The Stop button renders iff the payload names this node — the board's own envelope precedent is `nodeId: config.mesh.nodeId ?? null` ([board-ui.mjs:86-90](../../../src/board-ui.mjs#L86)) with its rule that an unconfigured machine marks **no** row local ([board-ui.mjs:84-85](../../../src/board-ui.mjs#L84)). The architect names the field; with none named, no card shows a button. |
| The presence record is a frozen ordered schema with an additive precedent (`sessions`, `buildId`) | [presence.mjs:299-333](../../../src/mesh/presence.mjs#L299) | `presence.loops[]` is that precedent again — key always present, `[]` when none. The line relies on `{ loopRunId, scope, phase, ref, cycle, cap, level, supervised }` plus **the standing stop request and its rung** (absent/`null` · drain · cancel) — the field names are the architect's; §Surface 1 marks each one it reads. |
| `fleetCurrentWorkLines` is pinned byte-for-byte to the Rust `current_work()` by `crossSurfaceDriftViolations` | [runs.mjs:119-170](../../../ui/src/fleet/runs.mjs#L119), [acd-captured-producer-fixture.test.mjs:181-192](../../../test/arch/session/acd-captured-producer-fixture.test.mjs#L181) | The loop line is a **sibling projection in `runs.mjs`, appended by `nodeCurrentWork`** ([scope.mjs:687-689](../../../ui/src/fleet/scope.mjs#L687)) — never inside `fleetCurrentWorkLines`. Existing lines stay byte-identical; the desktop node row's `current_work` cell is untouched. |
| The node re-publishes presence every propagation tick (default 15 s); the fleet re-polls every 5 s | [sync-cadence.mjs:25](../../../src/mesh/sync-cadence.mjs#L25), [launcher.mjs:807](../../../src/mesh/launcher.mjs#L807), [assign-affordance.mjs:54](../../../ui/src/fleet/assign-affordance.mjs#L54), [Fleet.tsx:482](../../../ui/src/fleet/Fleet.tsx#L482) | A stop's **wire receipt lags up to ~20 s**; the line's requested state is held locally from the route's 2xx until the wire confirms or the line disappears — never a timed hold that decays back to `Stop` (§Surface 1, the escalation hazard). |
| The one write route refuses with a coded envelope (`sendApiError` code + sentence + extras); the assign affordance shapes its inline message from the code, sentence in `title` | [ui-serve.mjs:431-476](../../../src/mesh/ui-serve.mjs#L431), [assign-affordance.mjs:146-170](../../../ui/src/fleet/assign-affordance.mjs#L146), [Fleet.tsx:1371](../../../ui/src/fleet/Fleet.tsx#L1371) | The stop route's refusal takes the **same slot, same classes, same shaping**. |
| `Fleet.tsx` is at 1549 of a 1560-line ceiling; `ui/src/fleet/` is at 20/20 files | [acd-ui-surface-file-budget.test.mjs:72-80](../../../test/arch/testing/acd-ui-surface-file-budget.test.mjs#L72), [acd-ui-directory-budget.test.mjs:99-103](../../../test/arch/testing/acd-ui-directory-budget.test.mjs#L99) | No new component file, ≤ ~10 lines of JSX inside the existing paragraph map ([Fleet.tsx:1449-1460](../../../ui/src/fleet/Fleet.tsx#L1449)); every rendered fact comes from `runs.mjs`. |
| The desktop parses a declaration row to `SupervisedChild { id, label, argv, cwd }` — `scope`, `level`, `cap` are display-only and **dropped at the parse** | [status.rs:236-251](../../../app/desktop/crates/core/src/status.rs#L236), [status.rs:290-295](../../../app/desktop/crates/core/src/status.rs#L290); the producer's `label` is `loop <scope>`, `id` is `loopRunId` ([declarations.mjs:95-110](../../../src/mesh/declarations.mjs#L95)) | The row names itself by **`label` alone**; level and cap are not on the bar (§Documented defaults 8). |
| The local-process ramp is exactly three words — `running` / `restarting` / `stopped` — one map keyed by child id; a Stop today is an immediate `start_kill` | [supervisor.rs:82-88](../../../app/desktop/crates/app/src/supervisor.rs#L82), [supervisor.rs:656-662](../../../app/desktop/crates/app/src/supervisor.rs#L656) | The ramp has **no word for a stop that takes time**. `stopping` is the ONE word this milestone adds to it (§The ladder's words); the dot set is unchanged. |
| `get_view_model` lists the two daemons' signals and never the declarations | [main.rs:64-77](../../../app/desktop/crates/app/src/main.rs#L64), [main.rs:82-109](../../../app/desktop/crates/app/src/main.rs#L82) | The view model gains an additive `loops[]` of `{ id, label, signal }` (the architect's field); `app.js` renders rows from it and nothing else. |
| Declarations ride every 10th 3 s tick (30 s); the reconcile retires a controller and its signal when its row disappears | [poll.rs:12-16](../../../app/desktop/crates/core/src/poll.rs#L12), [supervisor.rs:415-421](../../../app/desktop/crates/app/src/supervisor.rs#L415) | A stopped row **persists, held, for up to one declarations tick** before it is gone; the row never lies about that by vanishing early. |
| ONE footer notice stands at a time, keyed by the child it names, `"<label>: <last non-empty line>"`, cleared by that child's next successful start | [supervision.rs:140-146](../../../app/desktop/crates/core/src/supervision.rs#L140), [supervision.rs:176-190](../../../app/desktop/crates/core/src/supervision.rs#L176), [supervisor.rs:669-691](../../../app/desktop/crates/app/src/supervisor.rs#L669), [app.js:335-336](../../../app/desktop/ui/app.js#L335) | A failed stop request is a notice in that slot — `loop 129: <line>` — never a banner, never a dialog. |

## The ladder's words — two rungs, one vocabulary, one new word

Both surfaces speak the same three words for a loop's stop, so an operator who reads one reads the other:

| Rung | What stands | Fleet line says | Fleet button reads | Desktop pill says |
|---|---|---|---|---|
| 0 | nothing | `loop 129 · continue 129/04 · cycle 1 of 3` | `Stop` | `running` |
| 1 | a drain request — the in-flight drive finishes, then the loop halts | `loop 129 · stopping · continue 129/04 · cycle 1 of 3` | `Stop now` | `stopping` |
| 2 | a cancel request — the in-flight session is stopped through the driver's bracket now | `loop 129 · cancelling · continue 129/04 · cycle 1 of 3` | *(absent — nothing left to ask)* | `stopping` |
| — | the loop has halted | the line is gone | — | `stopped`, then the row is gone |

- **Why words in the line, not a tint.** 38 S4/S5: colour and label travel together and the region takes
  no new primitive ([38/DESIGN.md:220-221](../38_milestone_cross-machine-worker-execution/DESIGN.md#L220)).
  The loop is still doing work at rungs 1 and 2 (the drive is finishing, or the bracket is closing), so
  the line keeps `primary` — a `muted` line would say "no work", which is false. The word is the state.
- **Why the state word sits second, right after `loop 129`.** The line truncates from its tail (below);
  the request state is the one fact that must survive truncation on the card that has no button (a
  remote node's), so it leads with the identity and never yields.
- **Why the desktop's word is `stopping` at both rungs.** The desktop's ladder is the supervisor's own —
  request, grace, tree-kill — and a second press only hurries it; the pill reports the child's state
  (alive and being stopped), not which rung the operator is on. `stopping` rides the **`running` dot**
  (`.pill-dot.running`, [styles.css:80](../../../app/desktop/ui/styles.css#L80)): the child IS alive.
  Rejected: the amber `restarting` pulse — 36 reserves amber for "a genuine fault"
  ([36/DESIGN.md:80-81](../36_milestone_mesh-desktop-app/DESIGN.md#L80)) and a requested stop is not one;
  and `.work-dot` (accent + pulse) — a fleet-presence class inside a local-process pill is the ramp
  conflation 36 forbids by name ([36/DESIGN.md:241-243](../36_milestone_mesh-desktop-app/DESIGN.md#L241)).
- **This is one new WORD in an existing ramp, not a new ramp.** The alternative — a pill that says
  `running` for the whole grace after the operator pressed Stop — is the lie by shape 127 refused for its
  toggle. Daemon rows never say it: their Stop is an immediate kill ([supervisor.rs:656-662](../../../app/desktop/crates/app/src/supervisor.rs#L656)).

---

## Surfaces

### 1 — The fleet node card's loop line and its Stop

The card is the six-region anatomy 38 fixed ([38/DESIGN.md:250-257](../38_milestone_cross-machine-worker-execution/DESIGN.md#L250)):
identity → host → presence-age → **current-work region** → fabric line → capabilities footer, rendered
at [Fleet.tsx:1428-1474](../../../ui/src/fleet/Fleet.tsx#L1428). The loop line lives **inside region 4**,
in the same `<p>` map ([Fleet.tsx:1449-1460](../../../ui/src/fleet/Fleet.tsx#L1449)), same
`text-[13px] font-semibold text-primary` slot ([Fleet.tsx:1452](../../../ui/src/fleet/Fleet.tsx#L1452)),
whole value in `title` (R-2's idiom, [Fleet.tsx:1453-1456](../../../ui/src/fleet/Fleet.tsx#L1453)).

**Where the loop lines go — appended, after every existing line.** `running N runs` and
`working · … (session)` render exactly as today ([runs.mjs:124-126](../../../ui/src/fleet/runs.mjs#L124),
[runs.mjs:161](../../../ui/src/fleet/runs.mjs#L161)); the loop lines follow, one per entry of
`presence.loops[]` **(field relied on: the array itself)**, ordered ascending by `scope` on the plain
codepoint comparison the region already uses (38 S6), ties by `loopRunId`. When loops exist the region
never reads `idle` — the single `idle` line ([runs.mjs:166](../../../ui/src/fleet/runs.mjs#L166)) is
replaced by the loop lines, since a loop between drives is not an idle node. A loop's in-flight drive is
one of the `N runs`; the loop line names it, it does not count it twice.

**38 S1/S9 amended for this region:** the bounded stack is `≤ 2 + L` lines, L = live loops on the node.
S9's "capped by construction" argument holds because L is small by construction too — one supervised
declaration per scope per machine ([SPEC](SPEC.md) measured-facts, the supervisor's relaunch predicate) —
and a collapsed `loops 129, 131` line would have nowhere to put two buttons.

**The line (anatomy, left→right).** `loop <scope> [· <state>] [· <phase> <ref>] · cycle <n>[ of <cap>]`,
then on this node's card the button, then the message slot:

- **`loop <scope>`** — the identity, never yields. *Field relied on: `scope`.*
- **`· stopping` / `· cancelling`** — only while a request stands; never yields. *Field relied on: the
  request state and its rung.*
- **`· <phase> <ref>`** — `refine` / `continue` / `verify` ([loop.mjs:86-90](../../../src/work/loop.mjs#L86),
  [loop.mjs:1092](../../../src/work/loop.mjs#L1092)) and the in-flight ref; **omitted when no drive is in flight** (a gate step, or between drives), so the
  line reads `loop 129 · cycle 2 of 3` rather than asserting a ref it does not have. *Fields relied on:
  `phase`, `ref` (nullable).*
- **`· cycle <n> of <cap>`** — the cycle counter over the cap the loop enforces
  ([loop.mjs:999-1002](../../../src/work/loop.mjs#L999)); `cycle <n>` alone when `cap` is null. *Fields
  relied on: `cycle`, `cap`.*
- **`level` and `supervised` are NOT on the line** — a level is configuration, not liveness, and
  "supervised" matters only for what happens after the stop, which is the desktop's row to say. Both go in
  the `title` tail: `… · L2 · supervised`. *Fields relied on: `level`, `supervised` (title only).*
- **The `<p>` becomes a flex row** (`flex items-center gap-2`) holding a `min-w-0 truncate` text span (the
  line, `title` = the whole value), the `shrink-0` button, and the `min-w-0 shrink truncate` message span.
  Truncation eats the tail first — `cycle…`, then `<phase> <ref>` — never `loop <scope>` and never the state
  word. The card floor is the measured 286px ([49/DESIGN.md:744-747](../49_milestone_terminals-home/DESIGN.md#L744)),
  and a 41-character line plus a button **will** truncate there; the `title` carries the rest.

**The button — ONE per loop line, on this node's card only.** `<button type="button">` at the line's end:

| Rung | Label | Classes (pinned — every utility already emitted in `Fleet.tsx`) | Title / `aria-label` |
|---|---|---|---|
| 0 → 1 | `Stop` | `shrink-0 rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-50` — the assign action's muted form ([Fleet.tsx:1359](../../../ui/src/fleet/Fleet.tsx#L1359)) with `Show all`'s hover ([Fleet.tsx:920](../../../ui/src/fleet/Fleet.tsx#L920)) | `Stop loop 129 — the current drive finishes first` |
| 1 → 2 | `Stop now` | `shrink-0 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive transition disabled:cursor-not-allowed disabled:opacity-50` — the shared tone map's `destructive` ([AssignmentChip.tsx:85](../../../ui/src/fleet/AssignmentChip.tsx#L85)) on the same geometry; no hover tint (none exists for `destructive` in `ui/`, and none is added) | `Stop loop 129 now — cancels the in-flight session` |

- **Why quiet, not teal, at rung 0.** Teal fill is the page's single headline action (Assign); draining a
  loop is the ordinary way it ends, and it loses nothing — the drive finishes. The `muted` button is the
  quietest control the card renders.
- **Why `destructive` at rung 1.** The second press cancels a live session mid-flight — work is lost, the
  run settles `cancelled`. The tone AND the label change together (`Stop` → `Stop now`), so the escalation
  is never colour-only and never label-only.
- **The escalation hazard, and the two guards.** `Stop now` appears exactly where `Stop` was. So: (a) while
  the POST is in flight the button is `disabled` + `aria-busy="true"` with its label unchanged; (b) after a
  2xx the button shows rung 2 **immediately but stays `disabled` for one poll interval** —
  `ASSIGN_SENT_HOLD_MS`, which the code already calls "a re-click guard"
  ([assign-affordance.mjs:56-61](../../../ui/src/fleet/assign-affordance.mjs#L56)) — then enables. And the
  requested rung is **remembered per `loopRunId` for the component's life**, overridden by the wire once the
  presence carries the request; it never decays back to `Stop` on a timer (a 15 s propagation gap with a
  decayed hold would re-offer `Stop`, and a reassuring second click would cancel a session). A hung POST is
  a refusal at `ASSIGN_TIMEOUT_MS` ([assign-affordance.mjs:71](../../../ui/src/fleet/assign-affordance.mjs#L71)).
- **After rung 2's 2xx the button is absent** — not disabled: there is nothing left to ask, and 36's rule
  is omit rather than show a dead item. The line's `cancelling` is the receipt until the line disappears.
- **No separate `Sent` acknowledgment, no silent re-load.** The rung change is the acknowledgment; the
  steady 5 s poll catches the wire up. A re-load 0 s after the 2xx cannot show a presence the node
  publishes 15 s later, and "no new cadence, no retry ladder" ([Fleet.tsx:603-604](../../../ui/src/fleet/Fleet.tsx#L603)) holds.
- **Refused.** The route's coded refusal renders in the message slot after the button:
  `mono min-w-0 shrink truncate text-[10.5px] text-destructive`, `title` = the server sentence
  ([Fleet.tsx:1371](../../../ui/src/fleet/Fleet.tsx#L1371)); the rendered text is the shaped outcome word
  (`not live`, `refused` — the code's word, as assign's `already assigned` is,
  [assign-affordance.mjs:157-158](../../../ui/src/fleet/assign-affordance.mjs#L157)), the sentence only in
  `title`. The button returns to its prior rung; the message stands until the next attempt.
- **A remote node's loop line has no button and no message slot.** Its `title` tail says why:
  `… · remote — stop from <nodeId>'s own console`. Every absence carries its reason (49's affordance-table
  rule); the SPEC's out-of-scope names the cross-node stop as a later mesh directive.
- **The desktop app's node row is not this surface.** Its `current_work` cell stays pinned to the JS string
  by S10; the loop line is not added to that string on either side.

#### Binding checklist (mandatory — this IS the baseline)

- **Layout regions (in order):** identity (unchanged) → host (unchanged) → presence-age (unchanged) →
  **current-work region**: `running N runs` (unchanged) → `working · … (session)` (unchanged) → **one
  loop line per live loop**, ascending by scope → assignments summary (unchanged) → fabric line
  (unchanged) → capabilities footer (unchanged). With no loops the region is **byte-identical to today**.
- **Components:** loop line = `<p class="flex items-center gap-2 text-[13px] font-semibold text-primary">`
  holding text span (`min-w-0 truncate`, `title` = whole value + `L<n>` + `supervised` tail) ·
  [this node only] ONE `<button>` (`Stop` muted / `Stop now` destructive) · [this node only] message span.
  No chip, dot, badge, pill, icon, tooltip component or second line per loop.
- **States:** *no loop* — nothing added. *one / many* — one line each, ordered, each with its own button on
  this node. *remote node* — line, no button, reason in `title`. *between drives* — no `<phase> <ref>`
  segment. *in-flight POST* — button disabled + `aria-busy`, label unchanged, line unchanged. *drain
  requested* — `· stopping` second in the line; button `Stop now`, destructive, disabled for one poll
  interval then enabled. *cancel requested* — `· cancelling`; no button. *refused* — button at its prior
  rung, destructive message in the slot, sentence in `title`, no hold. *halted* — the line disappears when
  the presence stops listing the loop (≤ 15 s propagation + 5 s poll after the halt); `running N runs`
  decrements in the same poll. *page loading / error / empty* — the page-level branches
  ([Fleet.tsx:641-654](../../../ui/src/fleet/Fleet.tsx#L641)), unchanged.
- **Ramp:** line `primary` at every rung (never `muted`, never `destructive`); button `muted` at rung 0,
  `destructive` at rung 1; message `destructive`; `primary` fill appears nowhere new. Text `text-[13px]`,
  button `text-[11px]`, message `text-[10.5px]` — the assign row's tiers. No new token, no hex, no
  motion, no new CSS.

### 2 — The desktop window's supervised-loop rows

The window is 36's four regions ([36/DESIGN.md:99-127](../36_milestone_mesh-desktop-app/DESIGN.md#L99)):
title bar → control bar → body → footer ([index.html:22-40](../../../app/desktop/ui/index.html#L22)). The
control bar is where **this machine's** supervised children live, so the loop rows are control-bar rows.

**Where — a second bar directly below the first, absent when empty.** The daemon bar is a single
non-wrapping flex row ([styles.css:72-75](../../../app/desktop/ui/styles.css#L72)) and at the mock's 760px
it is already full: server proc + separator + UI proc + `Open web UI` + the right-anchored identity group
measure the width. A loop row in it would push the identity off the frame. So the loop rows render as a
**second `<div class="controlbar">`** — the same class, the same layer fill, hairline bottom stroke and
padding, verbatim — immediately after `#controlbar`, **not rendered at all** when there are no rows.
Rejected: `flex-wrap` on the existing bar (new CSS); a body region (the body is fleet presence, and a
supervised loop is a local process — 36's two-ramp rule).

**The row — the daemon row's vocabulary, minus Start.** One `.proc` group per declaration, separated by
`.vsep`, in the order the view model supplies (the poll's row order, stable across ticks):

```
<div class="proc">
  <span class="proc-label">loop 129</span>
  <span class="pill"><span class="pill-dot running"></span><span class="pill-text">running</span></span>
  <button class="toggle subtle" data-action="loop-stop" data-id="<loopRunId>" title="Stop loop 129" aria-label="Stop loop 129"><span class="stop-glyph"></span></button>
</div>
```

- **`.proc-label`** ([styles.css:77](../../../app/desktop/ui/styles.css#L77)) reads the producer's `label`
  verbatim — `loop 129` ([declarations.mjs:99](../../../src/mesh/declarations.mjs#L99)). Not mono: the
  daemon labels are not, and the label is a name, not a ref.
- **`.pill` + `.pill-dot <signal>` + `.pill-text`** ([styles.css:78-83](../../../app/desktop/ui/styles.css#L78))
  — the same pill the daemons paint, from the same `signals` map. The word is one of `running` /
  `restarting` / `stopping` / `stopped`; the dot is `running` (accent), `restarting` (amber pulse),
  `running` again for `stopping` (§The ladder's words), `stopped` (dashed hollow).
- **`.toggle.subtle` with `.stop-glyph`** ([styles.css:84-91](../../../app/desktop/ui/styles.css#L84)) —
  the web-UI row's own control, never `.toggle.primary` (the accent toggle is the Mesh server's, the one
  primary control in the bar) and **never `.play-glyph`**: a declaration starts through the reconcile, so
  the row has no Start. The control is present in `running`, `restarting` and `stopping`; **absent** in
  `stopped` (omit, never a dead item — 36's worker-row rule). Note this diverges, deliberately, from
  `procControlHTML`, which paints a play glyph for anything not `running`
  ([app.js:97-101](../../../app/desktop/ui/app.js#L97)): the loop row is its own small template, not that
  function with a flag.
- **The rungs.** Rung 1 (from `running` / `restarting`): the press spawns `aof work loop <scope> --stop`
  as the app spawns its other verbs, places the hold, and the pill goes `stopping`. Rung 2 (from
  `stopping`): the same control, `title` `Stop loop 129 now — skip the grace`, hurries the supervisor's
  ladder; the pill word does not change. No third state of the control: same class, same glyph, same
  size at both rungs — the pill word beside it is what makes the rung legible, so the row's geometry never
  moves while the child lives. **No duration in copy** — the pill never says how long the grace is
  ([36/DESIGN.md:254-259](../36_milestone_mesh-desktop-app/DESIGN.md#L254)).
- **`stopped`, held.** After the child exits — by its own halt, or by the tree-kill fallback — the pill
  reads `stopped` on the dashed dot and the control is gone; the row **persists until the declarations
  producer drops it** (≤ one 30 s declarations tick), so an operator who looks back sees the outcome, not
  a vanished row. The narrowing at `stopped` is the row's terminal frame; it is the one geometry change
  the row makes, and it makes it once.
- **Gone.** The reconcile retires the controller and its signal; the row is not rendered; when the last
  row goes, the second bar goes with it.
- **Error — the footer, never the bar.** A `--stop` spawn that fails or exits non-zero raises the standing
  notice `loop 129: <last non-empty line>` in `#footer-text` ([app.js:335-336](../../../app/desktop/ui/app.js#L335),
  [styles.css:174-176](../../../app/desktop/ui/styles.css#L174)), keyed to that child so a daemon's restart
  never clears it ([supervision.rs:140-146](../../../app/desktop/crates/core/src/supervision.rs#L140)).
  The row keeps reporting the child's true signal. A tree-kill fallback raises **no** notice: it is the
  designed rung, not a fault, and the `WaitResult::Stop` path raises none today
  ([supervisor.rs:656-662](../../../app/desktop/crates/app/src/supervisor.rs#L656)).
- **No declarations — the bar is absent, not an empty line.** 36's empty state is a body placeholder
  with a next action (`aof mesh invite`); the loop bar has no in-window next action (a declaration is made
  by `aof work loop <scope> --supervised`, not here), and the ambient posture is a glance — a permanent
  `loops: none` on most machines is noise. The same holds when the declarations answer is unknown
  (`ok: false`, an older `aof` — [status.rs:253-259](../../../app/desktop/crates/core/src/status.rs#L253)):
  the supervisor changes nothing, and an absent bar asserts nothing.

#### Binding checklist (mandatory — this IS the baseline)

- **Layout regions (in order):** title bar (unchanged) → control bar (unchanged: server proc · `.vsep` ·
  UI proc · `Open web UI` · identity) → **loop bar** (`.controlbar`, second instance): per declaration
  `.proc` (label · pill · [control]) separated by `.vsep`, in view-model order → body (unchanged) →
  footer (unchanged; carries the notice).
- **Components:** `.proc-label` (`loop <scope>`); `.pill` with `.pill-dot` + `.pill-text`; `.toggle.subtle`
  + `.stop-glyph` (`data-action="loop-stop"`, `data-id`), `title` + `aria-label` naming the loop and the
  rung. No `.play-glyph`, no `.toggle.primary`, no `.open-web-ui`, no kicker, no count, no new class.
- **States:** *no declarations / unanswered* — the loop bar is **absent**. *one / many* — one `.proc` each,
  `.vsep` between. *running* — accent dot, `running`, control present. *restarting* — amber pulse,
  `restarting`, control present (a crash-looping loop is exactly what an operator stops). *stopping* —
  accent dot, `stopping`, control present as rung 2 (title changes, nothing else). *stopped (held)* —
  dashed dot, `stopped`, control absent, row persists ≤ one declarations tick. *gone* — row absent. *error*
  — footer notice `loop <scope>: <line>`, row unchanged. *body loading / error / empty* — 36's body states,
  unchanged; the loop bar is a local signal and renders truthfully above them, as the daemon bar does
  ([36/DESIGN.md:144-147](../36_milestone_mesh-desktop-app/DESIGN.md#L144)).
- **Ramp:** the local-process ramp's three dots unchanged; four words (`stopping` added); the `running`
  dot under `stopping`; never amber for a requested stop; `.toggle.subtle` (neutral stroke, `currentColor`
  glyph), light and dark from the existing tokens. No new token, class, colour or motion.

---

## What does NOT change

- **The board.** 53/ADR-004 froze it against a loop face — "ZERO board change"
  ([53/ARCHITECTURE.md:427](../53_milestone_loop-artifact/ARCHITECTURE.md#L427)) — and FF-5307 pins
  `src/board-ui.mjs` and `ui/src/board/` to it; the run row gets no button because the verb and the fleet
  reach the same loop and a third door would be a third state to keep honest.
- **The desktop node table.** No row, cell or dot changes; the local node's `current_work` cell keeps
  saying `running 1 run` for the loop's own drive, pinned to the JS string by 38 S10. The loop bar above
  it is where the loop is named.
- **The tray menu.** No loop item. `tray_menu()` is a closed six-item model over a closed `MenuItemId`
  ([tray_menu.rs:83-90](../../../app/desktop/crates/core/src/tray_menu.rs#L83)); a per-loop item would be a
  dynamic, state-labelled entry whose label changes under the cursor and whose two rungs a menu cannot
  show — and the window row is one `Show window` away.
- **No new chip, ramp or design system.** The fleet adds text in an existing region and a button in
  existing classes; the desktop adds rows in the daemon rows' classes and one word to their ramp.
- **`fleetCurrentWorkLines` and the Rust `current_work()`** — both strings byte-unchanged; the
  cross-surface drift gate needs no new fixture from this milestone.

---

## Accessibility (expected to be honoured)

1. **Never colour-only.** `stopping` / `cancelling` in the line and pill carry the state; the fleet's
   `destructive` tint at rung 1 is emphasis on a label that already changed. `text-destructive` on
   `bg-destructive/10` and `muted-foreground` on `muted` clear 4.5:1; the desktop's `--text` on `--layer-2`
   already does in both themes.
2. **The buttons are real buttons.** `type="button"`; `aria-label` names the loop and the rung
   (`Stop loop 129 — the current drive finishes first` / `Stop loop 129 now — cancels the in-flight
   session`); in flight = `disabled` + `aria-busy="true"`; visible focus on `--color-ring`
   ([index.css:23](../../../ui/src/index.css#L23)) and the WebView's default ring on the desktop toggle;
   the desktop control is the existing 25×25 `.toggle`, the fleet button clears 24 CSS px via its padding.
3. **The loop line is text, not a control** — the button is the only focusable element in it; a remote
   node's line has nothing in the tab order.

---

## Documented defaults (decided here, not blocking)

1. **One line per loop, appended after the existing lines, ordered by scope; `idle` is replaced when a
   loop exists.** 38 S1/S9's cap becomes `2 + L`.
2. **The state word is second in the line; the tail truncates first; the whole line is in `title`.**
3. **`level` and `supervised` live in the `title` tail, never on the line.**
4. **Rung 0 is `muted`, rung 1 is `destructive`; the rung is remembered per `loopRunId` for the
   component's life and never decays on a timer; rung 2 is disabled for one poll interval after it appears.**
5. **After the cancel is acknowledged the button is absent; the line's `cancelling` is the receipt.**
6. **The Stop button renders only when the payload names this node; with none named, no card has one.**
7. **The desktop loop bar is a second `.controlbar`, absent when there are no rows or no answer.**
8. **The desktop row is `label` + pill + one `.toggle.subtle` stop; `scope`, `level`, `cap` are not
   shown** — the parse drops them, and if the architect carries them through they go in the
   `.proc-label`'s `title`, not the bar.
9. **`stopping` rides the `running` dot; the control is present in `running`, `restarting`, `stopping`
   and absent in `stopped`; a stopped row persists until the producer drops it.**
10. **A failed request is a footer notice; a tree-kill fallback is silent.**

---

## Behavioural outcomes (cross-reference)

BEHAVIOUR belongs in task scenarios on this milestone's stories, NOT here. Outcomes a `.feature` can assert:

- **With no entry in `presence.loops[]` the node card's current-work region renders byte-identically to
  today; with entries it renders one `loop <scope> …` line per entry, after the existing lines, ordered by
  scope, and never `idle`.**
- **Only the card of the node the payload names as this node renders a `Stop` button on a loop line; a
  remote node's loop line renders none.**
- **Pressing `Stop` POSTs the guarded stop route for that `loopRunId`; on 2xx the line gains `stopping`,
  the button reads `Stop now` in the destructive tone and is disabled for one poll interval; pressing
  `Stop now` POSTs the escalation; on 2xx the line reads `cancelling` and the button is absent.**
- **A refused POST renders the coded outcome word in the line's destructive message slot with the server
  sentence in `title`; the button keeps its prior rung.**
- **The loop line disappears once the presence no longer lists the loop; `running N runs` decrements in
  the same poll.**
- **The desktop window renders one control-bar row per supervised declaration the view model lists —
  `loop <scope>`, the signal pill, one stop control and no start control — and no loop bar when it lists
  none.**
- **Pressing a row's stop spawns `aof work loop <scope> --stop`, places the hold, and the pill reads
  `stopping` until the child exits, then `stopped` with the control absent; the row is gone after the next
  declarations tick drops it; a failed spawn is a `loop <scope>: …` footer notice.**
- **`@uat` visual review — on the fleet, the two rungs read as "finish, then stop" and "stop now", and the
  remote line reads as informational; on the desktop, the loop rows read as siblings of the daemon rows
  and `stopping` reads as alive-and-ending, not as a fault** (a person judges at 1280 and at 760×520
  light + dark).
