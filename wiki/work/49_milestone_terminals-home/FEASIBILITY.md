---
doc: feasibility
---
<!--
  Milestone FEASIBILITY.md — the developer's chair in the Three Amigos.
  Answers ONE question: can this be built as written, and what is the grind hiding inside it?
  Owner: developer. A REVIEW, not an implementation. No production code was written for this pass.
-->
# 49 · The terminals home — Feasibility (developer's pass)

> **Method.** Every claim below was verified by opening the file, not by reading a document. Where a
> document's line anchor had rotted, the fact was re-measured and the rot is recorded. Nothing was
> built, no production file was edited, no daemon was started, restarted or killed. The only
> commands run were reads and four throwaway driver scripts under a fresh `AOF_GLOBAL_HOME`
> (`test/bundle.test.mjs`'s exported array, the shipped manifest generator, a comment-stripped
> posture sweep, and the budget gate's own file predicate).
>
> **Scope measured:** 21 task `.feature` files across 8 stories (the brief said 16; story 05 carries
> **seven** tasks including `06_design-conformance.feature`, 34 KB, which several sibling task files
> still describe as *"THAT REVIEW HAS NO TASK IN THIS MILESTONE'S BREAK-DOWN"* — see §7.4).

---

## 0 · The one-paragraph answer

**Six of eight stories are buildable as written.** Story 00 is genuinely a three-line change and its
contract is exact. Stories 01, 02, 04, 06 and 07 are buildable with named, settle-able decisions.
**Story 03 is buildable with one shape question that must be answered at kickoff.** **Story 05 is
NOT buildable as written** — QA's four routed findings are all confirmed at source, and I found six
more of the same class, every one of them a collision between a `.feature`'s `Then` and ADR-007's
*"THE CONTROL DOES NOT CHANGE"* / ADR-003's *"`state-ramp.mjs` is not edited"* / ADR-001's budget
table. The milestone's whole cost is concentrated there, and it is concentrated in exactly the place
milestone 46's retro said it would be: **the harness**.

---

## 1 · Confirm or refute QA's four routed findings for story 05

All four are **CONFIRMED at source.** None is a misreading.

### (a) `no live output` with NO socket is unreachable on the shipped ramp — CONFIRMED

The chain, read end to end:

| step | file:line | what it does |
|---|---|---|
| the injected-reason seam fires **only** on `waiting` | `ui/src/terminal/state-ramp.mjs:575-583` | `if (descriptor.state === TERMINAL_STATES.WAITING) { … descriptor.text = "no live output" }` |
| `waiting` is entered **only** from `connecting` on socket-open | `ui/src/terminal/state-ramp.mjs` transition table | — |
| a *bindable* pane is derived to `connecting`, never left `idle` | `ui/src/terminal/state-ramp.mjs:221-224` | `terminalEntryState(current, { bindable }) → bindable && state === IDLE ? bindSource() : value` |
| the control feeds `bindable: binding != null` | `ui/src/terminal/TerminalControl.tsx:687` | `describeTerminalState(unavailable ?? terminalEntryState(state, { bindable: binding != null }), { … })` |
| `binding != null` is **exactly** the condition under which the session effect dials | `ui/src/terminal/TerminalControl.tsx:317-323` | `sessionKey != null && source != null && unavailable == null && socket.url != null` |

So *"the pane is bindable"* and *"a socket will be constructed"* are **one value**, deliberately —
that single-value rule is the fix for the 2026-08-09 blocker and the file says so at `:313-316`. There
is **no mount field meaning "bound, do not dial."** The only shipped levers are `mount.bound: false`
(→ `idle`, whose pane line is `No session. Press Run agent on an item.`), `mount.unavailable`
(→ `unavailable`, `opensSocket:false` at `state-ramp.mjs:565-574` — forbidden here by DG-49-10), and
`subscribed:false` (the cap's rest state, which DG-49-4 makes a *different* observable).

**And the fleet's own precedent confirms it rather than contradicting it:** `terminalAssignmentReason`
(`ui/src/fleet/terminal-mount.mjs:120-125`) injects a reason only for a `done`/`failed` assignment —
a pane that **does** open a socket, reaches `waiting`, and then has its chip rewritten. Reason-injection
has never once shipped without a socket beneath it.

**Verdict: `05/02`'s headline scenario (`NO socket was constructed` + `chip reads exactly no live
output`) cannot be made green without editing `state-ramp.mjs` or `TerminalControl.tsx`.** ADR-003
§Consequences forbids the first; ADR-007 forbids the second. **One of those two ADRs has to give, and
the choice belongs to the architect, before coding.**

### (b) The held tile has no box — CONFIRMED

`ui/src/terminal/TerminalControl.tsx:788-794`:

```
{subscribed ? (
  <div className={cn("flex min-h-0 flex-col", isDock ? "flex-1" : "h-48", collapsed && "hidden")}>
    <TerminalByteArea descriptor={descriptor} paneRef={inlineRef} framed />
  </div>
) : null}
```

An unsubscribed pane renders **the header and nothing else**. DG-49-4 requires the byte area to stay
"at its normal size" holding one centred line. `05/03`'s header already routes this ("the home's tile
wrapper, or the control") — the routing is correct and the decision is still unmade.

### (c) No seam for a host to present the pane — CONFIRMED

`TerminalControl`'s props are exactly `{ host, mount, onClose, origins }`
(`ui/src/terminal/TerminalControl.tsx:172-181`). Fullscreen is driven by the control's **internal**
`expanded` host state, set by `act(AFFORDANCE_FULLSCREEN)` from its own button, and the present effect
is keyed on it (`:624-645`). There is no prop, no imperative handle, no ref, no bus message a host can
send. DG-49-5 rule 3 (`Enter` on a focused tile; a click into the byte area) has **no door**.

### (d) `opener` points at the expand button, not the tile — CONFIRMED

`openerRef = useRef<HTMLButtonElement | null>(null)` (`:232`) → handed to `TerminalControls`
(`:740`) → `opener: openerRef.current` (`:633`) → the shell stores it as `restoreFocusTo`
(`ui/src/app/shell-layout.mjs:894`, `:940`, `:991`) → `request.opener?.focus?.()`
(`ui/src/app/Shell.tsx:873`). §S3 delta 3 requires the **tile**. Same missing seam as (c).

---

## 2 · Six more of the same class, not yet caught

### (e) The tile's byte box is a hard-coded 192px, and that makes a DESIGN gap inevitable

`TerminalControl.tsx:791` — `isDock ? "flex-1" : "h-48"`. **Every non-dock host gets a 192px byte
box.** DESIGN §S2 region C2 requires the tile's byte area to be **aspect-locked `aspect-[640/408]`**
so "the letterbox band is ≈0 by construction", and states that *"a VISIBLE band in a tile at any
documented width IS a gap"*.

Arithmetic at the primary judgement width: a 394px track → ~378px byte area → 192px tall. The scale is
`min(378/640, 192/408) = min(0.591, 0.471) = 0.471`, painting a 301×192 screen inside a 378×192 box —
**~77px of visible horizontal band, on every tile.** That is `05/06`'s "a sub-pixel band is expected;
a visible one IS a gap" failing by construction, and it also makes the fourth host's `drag-resize`
refusal ("**not** `192px`", `03/00` scenario 4) argue against the control's own literal.

### (f) The tile header is ONE wrapping row; DESIGN fixes TWO declared rows

`TerminalControl.tsx:773-785` renders `{headerIdentity}{controls}` in a single
`flex-wrap gap-x-2.5 gap-y-1 px-3 py-1.5` row for non-dock hosts, and the **state chip lives inside
the identity fragment** (`ui/src/terminal/TerminalIdentity.tsx:114-124`), in the same flat flex line as
the lockup, the identity and the `read-only` pill.

DESIGN §S2 fixes C1a (identity row) and C1b (status row: chip · repo · `ml-auto` expand · toggle) as
**"the tile's fixed anatomy at every width"**, explicitly *"not a wrap and not a fallback"*. Delivering
that means restructuring **both** `TerminalControl.tsx`'s header and `TerminalIdentity.tsx`'s fragment
— and moving the controls cluster out of C1a into C1b for one host only.

### (g) The `needs input` pill and the repo field do not exist

`TerminalIdentity.tsx` renders the lockup, the identity, the `read-only` pill, the provider picker and
the chip. There is **no** agent-state pill and **no** repo field. Both are asserted rendered by
`05/02` and `05/03`, and both are new elements in the shared control that all four hosts compile.

### (h) `hasShellHost()` is FALSE inside the harness bundle, so no expand control ever renders in a test

`shellPresent` is a module-scope flag set only by `declareShellPresent()`
(`ui/src/app/shell-bus.mjs:56`, `:67-73`). `withTerminalControl` bundles `TerminalControl.tsx` with its
**own copy** of `shell-bus.mjs` and never calls it. The control gates its expand control on it:

```
offersFullscreen={declaresAffordance(host, AFFORDANCE_FULLSCREEN) && shellHosted && subscribed && mount.bound}
                                                                     ^^^^^^^^^^^^  TerminalControl.tsx:739
```

`shellHosted` is read **once at first render** (`:244`). So today, in every harness lane, the expand
control is absent. **Every expand/present/dismiss scenario in `05/04`, plus `05/03`'s "a held tile
offers NO expand control … a subscribed tile DOES", plus `05/06`'s R-F evidence, is unreachable**
until the harness exposes the bundled bus. `05/01`'s header names this as trap (c); it is worth
restating that it is not a nuisance — it silently turns a whole task's assertions into `null` checks
that pass for the wrong reason.

### (i) `withTerminalControl` mounts exactly ONE control, with a hard-coded entry

`test/support/terminal-control-harness.mjs:48` (`const CONTROL_TSX = …/TerminalControl.tsx`) and
`:301` (`renderer.mount({ type: mod.TerminalControl, props: { host, mount, origins } })`). One entry,
one component, one fixed prop signature.

Every grid-level scenario needs something that does not exist:

| contract | what it needs |
|---|---|
| `05/01` "a grid of three subscribed tiles holds three sockets" | N controls in one tree, refs attached |
| `05/03` "twenty rows and a cap of sixteen → twenty tiles, sixteen sockets" | 20 controls in one tree |
| `05/04` the entire focus model | 12 tiles + key dispatch + a focus model |
| `05/05` "exactly one node in the whole rendered tree carries `aria-live`" | 12 controls in one tree |

**This is the single biggest uncosted item in the milestone.**

### (j) The app-level harnesses cannot substitute, for two independent reasons

1. `withMountedApp` calls `createRuntime()` with **no `hostNode`**
   (`test/support/react-app-harness.mjs:143`), so `useRef` hands back a `{current}` nothing assigns —
   the control's session effect early-returns and **no socket is ever constructed**. That is the exact
   TECH_DEBT 29 shape, in the harness story 04 uses.
2. All three surface harnesses stub the control by module path:
   `test/support/fleet-app-harness.mjs:32,35`; `test/support/board-app-harness.mjs:42,60`;
   `test/support/shell-app-harness.mjs:33-34,127,133` — every one
   `export const TerminalControl = () => null;` behind `/(^|\/)TerminalControl$/`.

So mounting the home through the shell harness (which `04/01` correctly does, because it renders no
rows) **must not** be extended to story 05's rows without first removing the stub — and removing it
lands the ref problem from (1).

### (k) The DOM stand-in has no focus model and no key dispatch

`terminal-control-harness.mjs:165` — `focus() {}`, a no-op. There is no `activeElement`, and the only
driver is `click(node)` (`:345-348`), which calls `props.onClick` directly. `05/04` asserts
`tabindex="0"/"-1"` placement (readable from the tree — fine), but also `Enter` on a focused tile,
arrow traversal, and that `restoreFocusTo` **is the TILE element**. None of that is drivable today.

### (l) §S3 delta 2 forces a new field through `shell-layout.mjs`, which ARCHITECTURE says must gain ZERO lines

`terminalFullscreenRequest` carries exactly `{ id, label, node, home, opener, claimsEscape, ownsChrome,
onLayout, onDismiss }` (`ui/src/terminal/fullscreen-request.mjs:54-81`). Nothing names where focus
presents. `05/04`'s delta-2 scenario says so itself. Delivering it means a field on the request
**and** on the shell's occupant projection (`shell-layout.mjs:966` projects `opener`; `:894/:940/:991`
carry `restoreFocusTo`) **and** in the DOM half (`Shell.tsx:873`).

ARCHITECTURE §Headroom: *"`shell-layout.mjs` … this milestone must add **zero**"*. **Direct
contradiction between ADR-001's headroom rule and §S3 delta 2.** Settle it.

---

## 3 · Where the GRIND is, per story — and what to settle at kickoff

### Story 00 — `needs-input` on the wire · **buildable, exact, no grind**

Every anchor verified: `projectAssignment`'s eight-key literal and its `sessionId` guard
(`src/global-mesh-query.mjs:132-148`); `mapAssignmentRow`'s twelve keys already carrying
`code: row.code ?? null` (`src/assignment-record.mjs:100-118`); `WorkAssignment`'s `sessionId?: string`
as the last member (`ui/src/fleet/api.ts:116-126`); the "absent, not false" gate
(`test/fleet-terminal-view-surface.test.mjs:175-177`); and the code-clears-the-column rule
(`src/control-stream-server.mjs:346-351`, handed to the transition at `:362`).

**Settle at kickoff:** nothing. This story is the model the rest should be measured against.

### Story 01 — one repo, said once · **buildable; the grind is the FIXTURE, not the rule**

Verified: the JS pin's row 6 is at `test/mesh-fleet-session-subsumption-render.test.mjs:126` and its
rule-form assertion at `:148` (`split(", ").length === sessions.length`) — the contract's `:115-127` /
`:143-148` ranges are right. `cargo` **is** present on this control node (`cargo 1.93.1`), so the Rust
half will be verified here; the guard-if-present lane is confirmed at `scripts/test.mjs:3045-3058`
(prints `ok - cargo test (app/desktop) skipped` and adds **zero** to `failures`).

**The grind:**
1. **The captured fixture is an ACT, not a diff.** It needs the real `startSession` + `startLauncher`
   producing two distinct same-repo sessions on a `local: true` node with an empty `activeRuns`, taken
   verbatim from `aof mesh status --json`. The recipe exists and the 2026-08-11 re-capture is the
   precedent, but it is fiddly and it is the step most likely to be deferred.
2. **The `×` must be a RAW U+00D7 in the Rust source.** `rustLiteral` escapes `·` and nothing else.
   A builder who writes `\u{d7}` gets a drift report for a drift that does not exist, at the end of the
   commit, and will be tempted to widen the shipped detector.
3. **A gate nobody has named binds here.** `test/arch/acd-rendered-component-fed-by-route.test.mjs`
   asserts every per-node-card component derives its current-work line from `fleetCurrentWorkLines`.
   Story 01 changes that function's output. The file is also **dirty** in this tree.

**Settle at kickoff:** who captures the fifth fixture, and on which machine (the Windows
case-insensitive-filesystem trap is real — `sess-A`/`sess-a` collapse to one record).

### Story 02 — the home's pure core · **buildable; the grind is four unmade decisions and one ratchet ordering defect**

The cleanest contracts in the milestone. `MAX_TAIL_KEYS = 64` is at
`src/mesh-terminal-mirror.mjs:59` and readable as text, so the cross-build tie is straightforward.

**The grind:**
1. **THE ORDER CONFLICT IS STILL OPEN AND IT APPEARS IN THREE CONTRACTS.** `02/01` says the arbiter
   "consumes the handed order and never sorts"; `02/02` says the composer "never sorts"; `05/00`
   scenario 5 row 3 pins DESIGN's `(nodeId, repo, sessionId)` against the index's own
   `(nodeId, sessionId)` (`src/global-mesh-query.mjs:331-335`, verified). **Two modules disclaim the
   sort, one contract pins a different key from the wire's.** Somebody must produce the ordered array,
   and story 05's PO ruling claims it — but story 02 ships first and its two modules are specified
   against "the handed order". **Settle the sort key and its owning module at kickoff, in one line.**
2. **`roster-gone` has no copy anywhere.** `02/00`'s Examples row 3 leaves the chip word unsettled;
   `03/01`'s reason row 3 leaves the sentence unsettled. DESIGN's K1–K12 table has no entry for it.
   Two contracts are hedging on one missing string.
3. **Two QA rulings need architect ratification before coding**, because both are the difference
   between a green build and a wrong one: `{ ref: "", assignmentId: "" }` → `no-producer` (against
   ADR-003's literal `workItem != null`), and a malformed cap failing **closed to 0** (against the
   tempting fallback to `MAX_LIVE_PANES`).
4. **THE DIRECTORY-BUDGET RATCHET HAS AN ORDERING DEFECT ITS OWN CONTRACT CANNOT SATISFY.** `02/03`
   requires both *"`ui/src/home/`'s own entry is present in the SAME diff that creates the directory"*
   **and** *"no ceiling exceeds its directory's delivered count by more than the allowance that entry
   declares"*. Story 02 creates `ui/src/home/` with roughly 6–8 files; stories 03, 04 and 05 then add
   more to the same directory. **A tight ceiling set in story 02 turns red in story 03.** Either the
   entry is set against the milestone's *forecast* (which is the ratifying move bad cut 4 forbids) or
   the entry lands in the LAST story that adds to the directory (which is also bad cut 4). This needs
   a ruling, not a builder's guess.
5. The measured tree is confirmed exactly as `02/03`'s header states: **`app` 13, `board` 21,
   `components` 7, `config` 4, `fleet` 20, `lib` 1, `terminal` 30 = 96, plus `main.tsx` and
   `vite-env.d.ts` = 98**, by the budget gate's own predicate `/\.(tsx?|mts|mjs)$/`
   (`test/arch/acd-ui-surface-file-budget.test.mjs:222`). ARCHITECTURE's 99 counts `index.css`. That
   contract's arithmetic is right.

**Settle at kickoff:** the sort key + its owner; `roster-gone`'s chip word and sentence; the two QA
rulings; the `ui/src/home/` ceiling's timing.

### Story 03 — the pane declares itself · **buildable; one shape question, and one stale name in three places**

Verified by a comment-stripped sweep with the gate's own needles:

| directory | swept files | `posture:` authors | names `interactive` |
|---|---|---|---|
| `ui/src/fleet/**` | **14** | `terminal-mount.mjs` only | none |
| `ui/src/board/**` | **16** | `dock-mount.mjs` only | `dock-mount.mjs` |
| `ui/src/terminal/**` | 18 | **three**: `host-model.mjs`, `input-policy.mjs`, `TerminalControl.tsx` | `input-policy.mjs` |

So the two added authorship rows are **green on arrival**, exactly as `03/02` predicts. Note the third
row: ADR-008's amendment justifies not sweeping `ui/src/terminal/**` by naming
`TerminalControl.tsx:284,628` — there are actually **three** files that write the key there. The rule
is right; its stated evidence undercounts.

**The grind:**
1. **THE MOUNT SHAPE PROBABLY HAS TO GROW A KEY, AND NOBODY HAS SAID SO.** `03/01`'s scenario
   *"the declaration itself carries the CAUSE — the feed-axis value that made it read-only — as a
   readable value"* asks for a 14th field on a shape ADR-002 requires all three producers to share
   (`fleetTerminalMount` returns 13 at `ui/src/fleet/terminal-mount.mjs:172-199`; `boardDockMount`
   returns 12). `03/01`'s own first scenario asserts the home's key set is **deep-equal to
   `fleetTerminalMount`'s**. **Those two clauses contradict each other unless the cause rides the
   existing `reason` field.** One line at kickoff.
2. **DESIGN K10's second `read-only` title has no home.** `readOnlyLabelTitle` is computed by
   `mountModelFor` in `input-policy.mjs`, which ADR-003 says this milestone does not edit. Flagged in
   the contract; still unowned.
3. **The JSX extractor is narrow and its silence is currently a PASS.** The clause matches
   `<TerminalControl` … `mount={…}` within 400 characters and requires the prop to close its own line.
   Both shipped sites satisfy it; the home's component does not exist yet, so a formatter choice can
   make the sweep find zero — and today's `mountProps.length >= 1` whole-clause floor stays green on
   that. The per-surface floor plus "zero found is a FAILURE" is the fix and it is correctly ruled;
   it is also new detector code, not a table edit.
4. **Two shipped suites go red the moment host #4 lands** (`test/terminal-collapse-is-not-hide.test.mjs:221`,
   `test/terminal-one-implementation.test.mjs:245-248`). Named in the PO rulings; must move in the diff.
5. **STALE CONTRACT — the host constant is already settled and three places still say otherwise.**
   ARCHITECTURE's AMENDMENTS block (2026-08-13) rules **`HOST_GRID_PANE = "grid-pane"`**. Story 03's
   `STORY.md` ("ADR-007's constant is `HOST_HOME_PANE` … Settle it at kickoff"), `03/00`'s Background
   ("the member ADR-007 calls `HOST_HOME_PANE`") and `03/00` scenario 8's note all still carry the
   pre-amendment draft. **This is not an open question; it is a stale contract in three files.**

**Settle at kickoff:** whether the cause rides `reason` or a 14th key; where K10's second title is
assembled; and re-point the three `HOST_HOME_PANE` references at the amendment.

### Story 04 — `/` becomes the home · **buildable; the grind is the list-move, not the four edits**

Every anchor re-measured. The four edits are small and exactly as described:
`SHELL_RENDERED_ROUTES` (`ui/src/app/entry.mjs:126`), `surfaceMountFor` (`:139-152`), `SURFACES`
(`ui/src/main.tsx:43-47`, consumed at `:60-61`), the inline branch (`ui/src/app/Shell.tsx:345-346`,
import at `:68`), `CONTENT_MODES`'s landing row (`ui/src/app/shell-layout.mjs:527`). `Landing.tsx` has
exactly one importer.

**Budget, measured with the gate's own arithmetic (`source.split(/\r?\n/).length`):**

| file | measured | ceiling | headroom | ARCHITECTURE says |
|---|---|---|---|---|
| `ui/src/app/Shell.tsx` | **931** | 940 | **9** | 917 / 23 — **STALE** |
| `ui/src/app/shell-layout.mjs` | **1016** | 1060 | 44 | 1015 / 45 |
| `ui/src/fleet/Fleet.tsx` | **1540** | 1560 | 20 | 1532 / 28 — **STALE** |
| `ui/src/terminal/TerminalControl.tsx` | **819** | 840 | **21** | 818 / 22 |
| `ui/src/board/DetailPanel.tsx` | **1000** | 1000 | **0** | 999 / 1 — **STALE** |
| `ui/src/config/App.tsx` | **1298** | 1300 | 2 | 1297 / 3 |

Story 04's own task file already carries these corrected numbers; **ADR-001's budget table does not.**
`DetailPanel.tsx` has **zero** headroom — one incidental line anywhere in it fails CI.

**The grind:**
1. **Five shipped shell suites reference the landing 8–13 times each** —
   `test/shell-entry-plan.test.mjs` (13), `test/shell-regions.test.mjs` (11),
   `test/shell-navigation.test.mjs` (9), `test/app-routes.test.mjs` (8),
   `test/shell-surface-containment.test.mjs` (8) — plus `test/support/shell-app-harness.mjs`, which
   **bundles `Landing.tsx` by name**. That is the story's real cost, and `shell-regions.test.mjs`,
   `shell-app-harness.mjs` and `react-app-harness.mjs` are all **dirty** in this tree.
2. **ADR-001's consequence list mis-routes one gate.** It names
   `test/arch/acd-rendered-component-fed-by-route.test.mjs` as referencing the landing. It contains
   **zero** occurrences of `landing` (case-insensitive); its subject is the fleet page's node cards and
   `fleetCurrentWorkLines`. It binds on **story 01**, not story 04.
3. **The dependency on story 02 is weak to nonexistent.** `04/01`'s selector reads `sessions[]` and
   each node's `presence.activeRuns` straight off the payload; nothing in story 04 imports a story 02
   module. Story 04 could start immediately, which matters for the critical path.
4. The re-poll-failure state (a poll fails *after* a successful load) is routed and unsettled.

**Settle at kickoff:** the re-poll-failure treatment; and whether story 04 really waits on 02.

### Story 05 — the grid of live panes · **NOT buildable as written**

§1 and §2 above are this story's feasibility verdict. Restated as the work item:

**THE HARNESS IS THE STORY.** Before a single `Then` in `05/01`, `05/03`, `05/04` or `05/05` can be
made green, `test/support/terminal-control-harness.mjs` needs: an entry/props parameter so a Grid
component can be mounted; N controls in one tree with refs; a way to call `declareShellPresent()` on
the **bundled** `shell-bus.mjs`; a focus model (`activeElement`, a real `focus()`); key-event dispatch;
and a re-pointed `chip()` accessor after task 05 removes the per-pane `aria-live` it keys on
(`:333-336`). That is a harness rebuild sitting **underneath** a six-task story, and it is invisible in
every estimate this milestone's documents contain.

**And the control has to change, against two ADRs.** Findings (a), (b), (e), (f), (g) each require an
edit to `TerminalControl.tsx` and/or `TerminalIdentity.tsx`. `TerminalControl.tsx` has **21 lines of
headroom** and ADR-001 budgets it at **ZERO**. A two-row header, an aspect-locked box, a held-tile box,
a present seam, a `needs input` pill and a repo field do not fit in 21 lines — so this story either
raises a ceiling by ADR or extracts a sibling component, which grows `ui/src/terminal/` from 30 to 31
files and hits story 02's own new directory ratchet.

**Settle at kickoff, before any code:**
- **Which ADR gives on the never-fed pane** — `state-ramp.mjs` gains a bindable-but-undialled path, or
  `TerminalControl.tsx` gains a mount field. (My read: a `mount.dials: false`-shaped declaration on the
  home's mount, consumed by the control's `binding` memo, is the smaller and more honest change — it
  keeps the ramp frozen and it is a *mount* fact, which is where every other pane decision already
  lives. But it IS a new branch in the control and ADR-007 must say so.)
- **Who owns the held tile's box** — the home's tile wrapper or the control.
- **The present seam** — a prop, an imperative handle, or a shell-bus message; and the `opener` value.
- **The two-row header and the aspect-locked byte box** — an explicit ADR-007 amendment, with a
  `TerminalControl.tsx` ceiling decision attached.
- **The sort key** (shared with story 02).
- **Story 05's dependency on story 00** — `05/02`'s `needs input` scenarios need `code` on the wire,
  and story 00 is not in story 05's declared dependency list.

### Story 06 — the pulse honours reduced motion · **buildable; the grind is a repo-first decision**

Verified: the false comment is at `ui/src/terminal/palette.mjs:186-188`; `TERMINAL_MOTION_CLASS` is
`{ none: "", pulse: "animate-pulse" }` at `:189-192`; the only reduce block in `ui/` is
`ui/src/index.css:112-116` naming `.aof-pending` alone; the dot applies `descriptor.motionClass`
unconditionally at `ui/src/terminal/TerminalIdentity.tsx:119`. `grep -rn "animate-pulse" ui/src`
returns **16** occurrences. The story's finding is exactly right.

**Test-lane reality, measured:**
- **There is no browser-driven suite in this repo today.** `grep -rln "chrome.exe|ms-playwright|puppeteer|--headless" test/` → **zero** files. This would be the first.
- **`playwright` is forbidden in `package.json`** — `test/arch/acd-conformance-verdict-contract.test.mjs:86-87`, confirmed. Note the **same file at `:76` REQUIRES** the `/aof:verify` and `/aof:continue` bundle commands to invoke `npx playwright` — so the repo simultaneously bans the dependency and mandates the on-demand invocation, while this machine's operator policy blocks `npx playwright`. The contract's "drive the cached Chromium directly" is a **third** mechanism, and it is the right one, but it is not a small thing to be the first to build.
- The cached Chromium **is** present (`%LOCALAPPDATA%\ms-playwright\chromium-1234` plus eight older builds), so binary discovery is genuinely needed rather than defensive.
- **The lane needs a BUILT stylesheet and `ui/dist/` is gitignored** (`.gitignore:3`). `ui/dist/assets/index-jLLPM0v8.css` exists here only because someone ran the build. `ui/package.json`'s build is `tsc -b && vite build`. Mitigating: `test/bundle-asset-manifest-complete.test.mjs:64` **already** requires `ui/dist/**` to be non-empty, so the suite already assumes a built UI — but a clean clone has none, and this lane would make a vite build a hard precondition of a *unit* suite.
- **ARCHITECTURE §Fitness functions has no entry for this gate.** `06/00:65-70` flags it. The PO's "the gate must be able to FIRE" ruling therefore names a gate with no home.

**Settle at kickoff:** browser lane yes/no (if no, `@executable` scenarios 2 and 3 become `@manual`
unchanged and the contract still works); CSS-block vs `motion-safe:` mechanism — and note the
CSS-block route fixes all twelve sites at once, which is an argument, not scope creep; and where the
new fitness function is registered.

### Story 07 — the bundled Claude session hooks · **buildable; the red gate is costed below and it is NOT purely list edits**

**Two mechanism findings, neither in the contract:**

1. **The two install doors need DIFFERENT command shapes for the same member.** Codex hook files carry
   a **shell string** — `src/bundle/hooks/codex-session-start.json` is
   `{"event":"SessionStart","matcher":"startup|resume|clear","type":"command","command":"aof session start --assistant codex"}`.
   The claude door's `markedEntry` (`src/claude-settings.mjs:107-118`) states in terms:
   *"`command` stays a bare executable and every argument is its own argv element — **never a shell
   string**, whose interpreter differs across the Windows control node, the Mac worker and the WSL
   worker"* — and the only shipped claude hook is `{command:"node", claude:{args:[…]}}`. So a claude
   session member is either `{"command":"aof session start"}` (a shell string the marked-entry
   discipline forbids in its own comment, but which **this repo's hand-authored config has proven since
   2026-07-26**) or `{"command":"aof", "claude":{"args":["session","start"]}}`. `portableArg`
   (`:144-147`) only normalises separators, so both are mechanically safe. **Unmade decision; it will
   cost a round-trip if a builder picks one and a reviewer reads the comment.**
2. **The assistant spelling is decided by ABSENCE, not by a flag.** This repo's `.claude/settings.json`
   declares `SessionStart → "aof session start"` with **no `--assistant`**, so it takes
   `src/commands/mesh-session.mjs`'s `"claude-code"` default. `07/00` scenario 7 pins *agreement*
   between the bundled and hand-wired records. **A builder mirroring `--assistant codex` will write
   `--assistant claude` and create the second spelling the ruling exists to prevent.** The correct
   answer is to pass nothing (or `--assistant claude-code`); say it at kickoff.

Also confirmed: this repo's hand-authored `SessionStart`/`UserPromptSubmit`/`SessionEnd` entries carry
**no `aofManaged` marker**, so the predicted double-invocation after `aof work update` is real and is
correctly deferred.

---

## 4 · The known-red gate — costed

**Verified independently by importing and driving the exported array under a fresh `AOF_GLOBAL_HOME`:
`PASS 12 / FAIL 6 (total 18)`.** It is imported at `scripts/test.mjs:441` and spread at `:2197`, so
**the full suite is red at HEAD** and `node --test test/bundle.test.mjs` reports green because it runs
only the file's wrapper.

The six, with their true causes:

| # | failing assertion | real cause | shape of the fix |
|---|---|---|---|
| 1 | `byKind("hook") === 3` → `4 !== 3` | the descriptor has 4 hooks (codex ×3 + `claude-artifact-sync`) | **list edit** (`test/bundle.test.mjs:75`, `:103`) |
| 2 | `member artifact-sync-enqueue has a valid kind` | kind `asset` is not in the valid-kind list (`:178`) | **list edit** |
| 3 | loader member count → `45 !== 46` | `loadBundle` puts `asset` members in a separate `assets` bucket (`src/work-bundle.mjs:147-161`) that the test's member-set assembly never reads | **a DECISION, not a list edit** — see below |
| 4 | member set stable across cwds — `artifact-sync-enqueue` missing | same cause as 3 | same |
| 5 | child-process load → `'45' !== '46'` | same cause as 3, **through a spawned child** | same |
| 6 | `.claude/commands/aof/autonomous.md` hash | manifest drift | **regeneration** |

**Two things the PO's ruling ("repair the member lists and the manifest, and no more") does not yet
account for:**

- **Failures 3–5 are one question, and it is not a list.** The descriptor has 46 members; the loader
  returns 45 because `asset` is a first-class kind the loader routes elsewhere. Somebody must decide
  whether `loadBundle`'s "member set" means *every descriptor member* (a loader change, touching a
  child-process lane) or *the resource/hook/template set* (a test-side reshape). **That is a small
  decision with a real blast radius, and it should be made at kickoff rather than discovered.**
- **The manifest drift is EIGHT entries, not one.** Measured by comparing the shipped manifest against
  `generateBundleManifest()`: `.claude/commands/aof/{autonomous,continue,refine,retrospective}.md` and
  their four `.codex/skills/aof-*/SKILL.md` twins. The assertion stops at the first. There **is** a
  generator (`scripts/generate-bundle-manifest.mjs`), so this is a regeneration and not hand-editing —
  but it will also sweep in whatever else has drifted by the time story 07 lands.

**Also confirmed:** `find src/bundle -type f` = **57**, matching
`test/bundle-asset-manifest-complete.test.mjs:47`'s literal exactly; three new hook JSON files make it
**60**, and the literal moves in the same diff.

**Is it containable?** The list edits and the regeneration: yes, comfortably — call it half a day.
The loader question: containable **if it is decided at kickoff**, dangerous if discovered mid-build,
because two of its three lanes spawn a child process and one walks three working directories.

**One consequence nobody has written down:** repairing this makes the full suite go from red to green
for the first time in some while — **and the full suite cannot be run on this machine**
(`test/global-work-propagation.test.mjs` binds `:4182`, held by the live control daemon). So "the
suite is green" cannot be demonstrated here by the story that earns it. Plan the evidence.

---

## 5 · Ordering and collisions

### 5.1 The declared plan versus the files

Declared: 00/01/02/06 parallel; 03/04/05 wait on 02; 07 lands last. Checked against the files each
actually touches:

| pair | declared | reality |
|---|---|---|
| 05 and 06 | both parallel-eligible | **COLLISION.** Both edit `ui/src/terminal/TerminalIdentity.tsx`: story 06 changes the motion class consumed at `:119`; story 05 task 05 removes `aria-live` at `:117` and tasks 02/03 restructure the same fragment into two rows with a new pill and a repo field. Story 06's own STORY.md already says it "should land **before or with** story 05" — that is right, and it should be an ORDER, not a preference. |
| 02, 03, 05, 06 | all parallel | **COLLISION.** Every one of them registers a new suite in `scripts/test.mjs` (and is checked by `test/arch/acd-test-suite-registration.test.mjs`). That is one file four "independent" stories all edit — and **both files are dirty in this tree.** |
| 02 and 03/04/05 | 02 first | **RATCHET COLLISION.** Story 02 sets `ui/src/home/`'s file ceiling in the diff that creates the directory; stories 03, 04 and 05 then add files to it. See §3/story 02 item 4. |
| 04 and 02 | 04 depends on 02 | **The dependency is weak.** `04/01`'s selector reads the payload directly and imports nothing from story 02. Story 04 can start on day one. |
| 05 and 00 | not declared | **MISSING DEPENDENCY.** `05/02`'s `needs input` scenarios need `code` on the wire, which is story 00. |
| 01 and everything | fully independent | **True, with one exception:** `test/arch/acd-rendered-component-fed-by-route.test.mjs` binds on `fleetCurrentWorkLines` and is unnamed in story 01's notes. |

### 5.2 Milestone 47's (and 48's) UNCOMMITTED work — what it collides with

`git status` in this tree: **41 modified tracked files + 33 untracked**, none of it committed. Every
story that touches a shipped file touches a dirty one:

| dirty file | the story that must edit it |
|---|---|
| `src/global-mesh-query.mjs` | **00** (add `code` to `projectAssignment`) |
| `ui/src/fleet/api.ts` | **00** (add `code` to `WorkAssignment`) |
| `ui/src/fleet/runs.mjs` | **01** (the dedupe rule) |
| `app/desktop/crates/core/src/view_model.rs` | **01** (the fifth fixture) |
| `test/arch/acd-captured-producer-fixture.test.mjs` | **01** (the non-vacuity clause) |
| `ui/src/app/Shell.tsx` | **04** (remove the landing branch) |
| `test/shell-regions.test.mjs` | **04** (the list-move) |
| `test/support/shell-app-harness.mjs`, `react-app-harness.mjs`, `fleet-app-harness.mjs` | **04 / 05** |
| `scripts/test.mjs`, `test/arch/acd-test-suite-registration.test.mjs` | **02, 03, 05, 06** |

Untracked and load-bearing: `ui/src/fleet/{AssignmentChip,BoardDrillIn,FilterBanner,PageStates,RepoPicker,SlotAids}.tsx`
+ `slot-aids.{mjs,d.mts}` — these are **8 of the 20 files** in `ui/src/fleet/`, which is the number
ADR-001 uses to justify not absorbing the home into that directory, and the number story 02's
directory ratchet must encode. `test/mesh-fleet-session-subsumption-render.test.mjs` — the JS pin
story 01 must rewrite — is **untracked**.

**The concrete risks:**
1. **A parallel agent that stashes, resets or force-checks-out loses uncommitted m47/m48 work that is
   not on any branch.** Say this to every agent in the milestone, in the kickoff message.
2. **Line anchors will keep rotting.** Every anchor in this milestone's own docs that points into
   `Fleet.tsx`, `Shell.tsx` or the fleet directory has already moved once (DESIGN's `Fleet.tsx:910`
   and `:914` are now `:917` and `:921`; ADR-001's `Shell.tsx:332-333` is now `:345-346`). **Cite by
   value, never by line.**
3. **The directory ratchet's numbers are being measured against an uncommitted tree.** If m47/m48 land
   or change before story 02 does, the delivered counts move under the table.

---

## 6 · Test-lane reality — each harness the contracts assume, checked

| the lane a contract assumes | does it exist | does it do what the contract needs |
|---|---|---|
| `test/support/terminal-control-harness.mjs`, opt-in host refs | **yes**, 370 lines, and `createRuntime({ hostNode })` genuinely assigns refs (`test/support/mini-react.mjs:187`, `:360-369`) | **for ONE control, yes.** For a grid, for focus, for keys, for expand — **no** (§2 h/i/k) |
| `TerminalControl` never enters the stub set | **holds today** — `terminal-control-harness.mjs` stubs only `@xterm/*`, `react-dom`'s `createPortal` and `lucide-react` | **but the other three harnesses all stub it by module path** (`fleet-app-harness.mjs:32,35`; `board-app-harness.mjs:42,60`; `shell-app-harness.mjs:33-34,127,133`) |
| the `*-app-harness.mjs` mount lane for the home's page states | **yes** (`withMountedApp`, `withShellComposedFleet`) | **yes for story 04** (no rows). **No for story 05** — `createRuntime()` there has no `hostNode`, so no ref is ever assigned and no socket can be constructed |
| a cached headless Chromium lane for story 06 | **binary yes** (`ms-playwright/chromium-1234` + 8 older); **suite no** — zero browser-driving suites under `test/` | needs the **built** stylesheet, and `ui/dist/` is gitignored; and it would be the repo's first browser lane |
| `cargo` for story 01's Rust half | **present here** (`cargo 1.93.1`) | **guard-if-present** (`scripts/test.mjs:3045-3058`): absent toolchain prints `ok - … skipped` and adds zero to `failures`, so the Rust half can ship unverified elsewhere. Task 01's cross-language fixture is the mitigation and it runs in the **node** suite — that is the right design |
| the axe-core a11y lane | **off, deliberately** — `.aof/aof.config.json`'s `work.tags.domains` has no `a11y` entry and there is no `work.ui` block | confirmed; DESIGN's a11y requirements bind as human review only |

---

## 7 · Contract defects and doc rot found in this pass

**7.1 Stale line anchors (cite by value, not by line).**
ADR-001's budget table (`Shell.tsx` 917/23 → **931/9**; `Fleet.tsx` 1532 → **1540**; `DetailPanel.tsx`
999 → **1000, zero headroom**); ADR-001's `Shell.tsx:332-333` → **`:345-346`**; DESIGN's
`Fleet.tsx:910`/`:914` → **`:917`/`:921`**; SPEC.md:69's
`ui/src/fleet/terminal-view/FleetTerminalView.tsx:170` — **a path m46 deleted** (already flagged by
the PO, restated because SPEC is still uncorrected).

**7.2 ADR-001's consequence list mis-routes a gate.**
`test/arch/acd-rendered-component-fed-by-route.test.mjs` contains **zero** references to the landing.
It binds on story 01, not story 04.

**7.3 ADR-008's amendment undercounts its own evidence.**
`ui/src/terminal/**` has **three** `posture:` writers (`host-model.mjs`, `input-policy.mjs`,
`TerminalControl.tsx`), not the one file named. The rule is right; the justification should say three.

**7.4 Stale cross-references to a task that now exists.**
`05/01:46-48`, `05/04:52-54` and `05/05:29-31` each say the design-conformance review *"has no task in
this milestone's break-down"*. `tasks/06_design-conformance.feature` exists. Harmless, confusing.

**7.5 Three files still name the superseded `HOST_HOME_PANE`** — see §3/story 03 item 5.

**7.6 An internal contradiction between ARCHITECTURE §Headroom and DESIGN §S3 delta 2** —
`shell-layout.mjs` must add zero lines; delta 2 requires a new occupant field through it.

---

## 8 · Sizing, with the unknown that moves each

Relative effort only. **I am not inventing hours** — the two things that would let me give them are
(1) a spike on the harness extension for story 05, and (2) one timed run of the four-edit + list-move
diff for story 04. Both are cheap and both would sharpen every other number here.

| story | size | confidence | the specific unknown that would move it |
|---|---|---|---|
| **00** needs-input on the wire | **XS** | **high** | none. Every seam verified; the only risk is the dirty tree |
| **01** repo said once | **S–M** | **medium-high** | how long a hermetic capture of the fifth fixture actually takes (the producer path exists; nobody has run it for this shape) |
| **02** home core | **M** | **medium** | the four unsettled decisions (sort key, `roster-gone` copy, blank-pair, malformed cap) and the `ui/src/home/` ceiling timing. Settle them and this becomes medium-high |
| **03** pane declaration + invariant 4 | **M–L** | **medium** | whether the shared mount shape grows a 14th key; and whether the per-surface JSX sweep can be written against a component that does not exist yet without a formatting-dependent blind spot |
| **04** route becomes the home | **M** | **medium-high** | the true volume of the five shell suites' list-move (~50 references) — measurable in an hour |
| **05** grid of live panes | **XL** — larger than the other seven combined | **LOW** | how much of `ui/src/terminal/` must change, and how big the harness rebuild is. **Both are spikeable in a day and both should be spiked before this story is scheduled.** |
| **06** reduced motion | **S** (`@manual`) / **M** (browser lane) | **medium-high** | the architect's browser-lane decision, and whether a vite build becomes a unit-suite precondition |
| **07** claude session hooks | **M** | **medium** | the loader/`asset` question behind bundle failures 3–5 |

---

## 9 · The kickoff list, in priority order

**Blocking — decide before any code is written:**

1. **Which ADR gives on the never-fed pane** (`state-ramp.mjs` or `TerminalControl.tsx`). Story 05's
   headline is unreachable until this is answered.
2. **The present seam and the `opener`** — how a host presents the control's pane, and how the tile
   becomes the focus-return target.
3. **The tile's box and its two-row header** — an explicit ADR-007 amendment, with a
   `TerminalControl.tsx` ceiling decision attached (21 lines of headroom will not cover it).
4. **The sort key and the module that owns it** — `(nodeId, sessionId)` or `(nodeId, repo, sessionId)`,
   named once. Three contracts currently hedge on it.
5. **Story 05's harness scope** — spike it, then schedule it. Do not schedule the six tasks against an
   unmeasured harness rebuild; that is milestone 46's retro, verbatim.

**Blocking, cheap:**

6. `ui/src/home/`'s directory-budget ceiling: which story sets it, against which count.
7. The mount shape: does the feed-axis cause ride `reason`, or a 14th key on a shape three producers
   share?
8. Story 07's hook command shape (shell string vs `command` + `args`), and the assistant spelling
   (**pass nothing** — the hand-authored proof passes nothing).
9. Story 07's loader/`asset` question — is `loadBundle`'s member set 45 or 46?
10. Story 06's browser lane: adopt or decline. Either answer works; the contract is written for both.
11. `roster-gone`'s chip word and its sentence (DESIGN K-table has neither).
12. Ratify the two QA rulings in `02/01`/`02/00` (blank pair → `no-producer`; malformed cap → 0).

**Hygiene, before the first agent starts:**

13. **Tell every agent the tree carries uncommitted m47+m48 work that exists on no branch.** No
    `git stash`, no `git reset --hard`, no `git checkout --` on a dirty file.
14. **Sequence 06 before or with 05** (both edit `TerminalIdentity.tsx`), and serialise the
    `scripts/test.mjs` registration edits (four stories, one file).
15. Correct the six doc-rot items in §7 so the next reader is not misled a fifth time.
