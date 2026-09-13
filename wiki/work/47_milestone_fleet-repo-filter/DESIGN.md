---
doc: design
---
<!--
  Milestone DESIGN.md — how should it look and feel, and why.
  Owner: designer. Layout / component / visual intent only.
  UI BEHAVIOUR (what happens when you click) lives in task .feature files — cross-referenced below,
  not specified here.
-->
# 47 · /fleet with a repo filter — Design

## Intent

This milestone has **two visual surfaces**, and both live on a page that already exists:

1. **The repo-filter control and the "filtered by" chip** — the fleet's new narrowing, contributed
   into the shell's surface slot beside the `Global | Local` scope control, plus the statement in the
   page that says which narrowings are in force.
2. **The filtered fleet page** — every region narrowed by the same key, the honest filtered empty
   state, and the one relief a filter buys the milestone-card footer.

Everything else on `/fleet` is untouched: same regions, same cards, same ramp, same copy — **with the
one deletion the record makes**, the boards region, which [ARCHITECTURE.md ADR-006](ARCHITECTURE.md)
removes in this milestone (§Surface 2). **This document designs a narrowing, not a new page.**

The experience to create is that **the operator says "this repo" once and the whole page believes
them**. The SPEC's two blunt sentences are the design brief:

> *"A filter that narrows one region and not another is worse than none."*
> *"A filtered view that looks like an idle fleet is a bug; the operator must always be able to see
> **why** they are looking at nothing."*

**Five binding rails:**

- **The narrowing is always stated, in every page state.** The control is present in loading, error,
  empty and populated alike — exactly as the scope control has been since m34/ADR-006
  (`acd-mesh-ui-scope-visible`) — and when a filter is in force the page says so *above* the state
  it is in, never inside one branch of it. An empty page that will not say why it is empty is the
  one failure this milestone exists to prevent.
- **A narrowing that hides itself is worse than no narrowing.** No control may vanish, dim or change
  form because a filter happens to be on. This is m38's DG-20 lesson, inherited verbatim: *an element
  that disappears only when a condition happens to be true makes its own absence a second, accidental
  signal for that condition.*
- **Two narrowings, two vocabularies, never one shape.** Scope is a two-way segmented control ("pick
  one of exactly two"); the repo filter is a disclosure over a data-derived list ("pick one of many,
  or none"). The product already speaks both and they already mean different things
  ([45/DESIGN §The navigation model](../45_milestone_ui-app-shell-routing/DESIGN.md)). Making them
  look alike is how an operator comes to believe there is one setting with four values.
- **A filter never rewrites the address behind the operator's back.** A `?repo=` naming a workspace
  the payload does not carry renders an honest, named state at the value they typed — it does not
  silently fall back to "all repos". This is m45 binding rail 3 applied to a query parameter instead
  of a path, and for the same reason.
- **No new design system, no new token, no new ramp.** Every mark below is an existing one reused:
  the milestone-switcher disclosure ([BoardLanes.tsx:352-368](../../../ui/src/board/BoardLanes.tsx#L352)),
  the identity-chip form ([Fleet.tsx:289](../../../ui/src/fleet/Fleet.tsx#L289)), the legend's popover
  ([Fleet.tsx:379](../../../ui/src/fleet/Fleet.tsx#L379)), the house dashed absent/not-yet primitive,
  and the fixed theme ramp at [ui/src/index.css:3-25](../../../ui/src/index.css#L3).

---

## Conformance source of truth

> **THE MOCKS ARE COMMITTED (2026-08-11), and each is now the conformance source of truth for its
> surface.** The operator's ruling (2026-08-10) was that a brief is written first and the mocks
> generated from it — see [`mocks/PROMPT.md`](mocks/PROMPT.md) — and that is what happened:
> [`mocks/README.md`](mocks/README.md) names the eight frames and their provenance, and
> [`mocks/design-source.html`](mocks/design-source.html) is the self-contained page each was captured
> from and where a disputed detail is settled.
>
> **Where a mock and this document's checklist differ, the mock wins and this document is amended in
> the same change** — the amendments dated **2026-08-11 (verify)** below are exactly that, and they
> were found by `aof:verify 47`'s design pass rather than by the mocks landing, which is the defect
> recorded as **F-47-V-8**: this block asserted *"no mock is committed"* for a day after eight were.
>
> **The checklist continues to bind wherever the mocks are silent** — E3, E5, R0-N, DG-47-5 and the
> failed drill-in. Not a guideline, not a sketch: it is the baseline a design-conformance review judges
> the built surface against, region by region, so a review has something to judge for every state and
> does not have to return `INCONCLUSIVE`.
>
> **Once a mock lands in `mocks/<surface>.png` — a locally-readable committed artifact, never a
> remote design-tool link — THAT file becomes the conformance source of truth for its surface, and
> until then the checklist is.** Where the mock is silent the checklist still binds; where the two
> conflict the mock wins and **this document is amended in the same change**. A checklist left
> contradicting a committed mock is a defect, not a nuance.
>
> **The same rule binds against the RECORD, and it is why this document was amended on 2026-08-10.**
> A checklist that contradicts [`ARCHITECTURE.md`](ARCHITECTURE.md) is a defect of exactly the same
> class, and a worse one while the checklist stands in for a mock: it would make a build implement a
> region the record deletes, and make a review return a GAP for the absence of something the record
> removed on purpose. **The ADR wins, this document is amended in the same change, and the removal is
> RECORDED rather than silently edited out** — see §Surface 2's dated *R4 Boards was removed by
> ADR-006* note.
>
> **And a checklist that leaves a producible state UNPINNED is a defect of the same class again —
> which is why this document was amended a second time, on 2026-08-11.** While the checklist stands
> in for a mock, anything it does not pin is something a review cannot judge and a build must
> therefore invent. That amendment answers **`F-47-02-QA-F3`** (unpinned empty-state copy) and
> **[ADR-010](ARCHITECTURE.md)** (a fifth empty state, a corrected composed body, and a
> partial-intersection notice this document had never drawn) — dated and recorded in §Surface 2's
> *E1–E7* table and its *R0-N* checklist entry rather than quietly filled in.
>
> **A remote design-tool link is never an acceptable substitute for the committed file.** Not
> `claude.ai/design`, not Figma, not a screenshot in a chat. The design-conformance reviewer is
> **read-only** and cannot open one — a baseline it cannot `Read` is not a baseline (07/ADR-003; the
> m03 lesson; the same rule at
> [36/mocks/README.md:3-5](../36_milestone_mesh-desktop-app/mocks/README.md#L3)).

| Surface / state | Committed mock | Status | Interim baseline |
|---|---|---|---|
| **1 — the repo-filter control + "filtered by" chip**, at 1280 | `mocks/filter-control.png` | **COMMITTED 2026-08-11** | the mock; the checklist binds where it is silent |
| **1 — the slot in the surface bar**, at 768 | `mocks/filter-control-768.png` | **COMMITTED 2026-08-11** | the mock; the checklist binds where it is silent |
| **1 — the two whole drops**, at 390 | `mocks/filter-control-390.png` | **COMMITTED 2026-08-11** | the mock + §DG-47-4 |
| **2 — the filtered fleet page**, populated | `mocks/filtered-fleet.png` | **COMMITTED 2026-08-11** | the mock; the checklist binds where it is silent |
| **2 — filtered, nothing published** (E6/E7) | `mocks/filtered-empty.png` | **COMMITTED 2026-08-11** | the mock. **Note (verify, 2026-08-11):** it is drawn for a roster shape this mesh cannot currently produce — every node is a member of every workspace, so `items==0 && nodes==0` is unreachable by any address and the state is **unrendered**, not unpinned. |
| **2 — the filter names no known repo** (E4) | `mocks/filter-unknown.png` | **COMMITTED 2026-08-11** | the mock; the checklist binds where it is silent |
| **2 — the two narrowings do not intersect, and NOTHING survives** (E5, out-of-scope) | *(none requested)* | **not drawn** | §Surface 2's binding checklist, row **E5**. Same card primitive as E4 with its own copy; `mocks/PROMPT.md` predates ADR-010 and asks for no frame. Its absence is **not** grounds for `INCONCLUSIVE`. |
| **2 — the two narrowings do not intersect, and MEMBER MACHINES survive** (the partial intersection) | *(none requested)* | **not drawn** | §Surface 2's binding checklist entry **R0-N** + the emptied-region rule. This is a **populated** page (ADR-010 clause 4), and it is URL-reachable — see §Render targets. |
| **2 — filtered, and no payload has landed** (E3) | *(none requested)* | **not drawn** | §Surface 2's binding checklist, row **E3**. **No address produces this state** — it needs a null status with no error and nothing in flight — so no render target names it and `mocks/PROMPT.md` asks for no frame. Its absence is **not** grounds for `INCONCLUSIVE`; the strings are judged headlessly at 47/02 and the treatment against the checklist. |
| **2 — loading / error, filtered** | `mocks/filtered-loading.png`, `mocks/filtered-error.png` | **COMMITTED 2026-08-11** (requested optional; drawn anyway, so they are baseline too) | the mock. **Note (verify, 2026-08-11):** both states remain **unrendered** rather than unpinned. Loading is capturable only by holding the payload (a harness capability, not an address); the error state IS producible by taking the API away, but that means interfering with the live control daemon during a soak — recorded as *not worth the disruption*, **not** as unproducible. |
| **2 — a card whose board did not resolve** | *(none requested)* | **not drawn** | §Surface 2's binding checklist + §DG-47-5. `mocks/PROMPT.md` asks for no failed-card frame, so the checklist is the only baseline for it — and the `@uat` lane in 47/01's task 00 is where a human judges it. |
| the unfiltered fleet page | [25/mocks/](../25_milestone_mesh-ui/mocks/) — unchanged | committed | not re-baselined here. **Note:** its frames predate ADR-006 and show a boards region the fleet face no longer renders; they are not the baseline for THIS milestone's regions. |
| the app shell around it | [45/DESIGN.md](../45_milestone_ui-app-shell-routing/DESIGN.md) §Surface 1 | checklist | not re-baselined here |

**Do not create a placeholder image.** An empty or stand-in PNG is worse than an absent one: a
reviewer cannot tell it apart from a real baseline. Each file appears when the real frame does.

---

## Render breakpoints and render targets

The same three widths m45 pinned, because this surface rides in m45's bar and inside m45's content
region. Nothing here re-decides them.

- **1280** — the primary judgement width. The slot rides in the 48px top bar beside the nav.
- **768** — the desktop-app proxy (the Rust window is 760×520). The slot has dropped into the 40px
  surface bar; its contents **do not change form**
  ([45/DESIGN §Surface 1 R3](../45_milestone_ui-app-shell-routing/DESIGN.md)).
- **390** — mobile, and the width where this milestone's new control breaks something. See
  **DG-47-4**; the two discrete drops it rules are judged here. **Judge it with a long
  operator-supplied `?repo=` value, not only a short one** — F-47-V-18 lived entirely in the tail of
  the value-length range, and every render before 2026-08-13 used a value the live mesh happened to
  carry.
- **1056 — the milestone grid's FLOOR ROW, and it is a render target for region 5.** *(Added
  2026-08-13 (verify pass 2).)* ADR-014 derives **every** region-5 budget from
  `REGION5_ROW_FLOOR_PX = 286`, and **no other pinned width produces that row**: 390 gives 324, 768
  gives 310, 1280 gives 360.66, 1440 gives 368.66. The floor is reached at viewport 1056 (and at
  720), where `minmax(320px, 1fr)` sits exactly on its minimum. A ladder judged only at rows 24–83px
  **above** its own floor is judged nowhere near the case it was built for — and 1024 renders a
  *wider* card than 1056, so the trend cannot be eyeballed. This width re-decides no breakpoint and
  adds no mock; it is a judgement width for that row only.
- **A frame whose page overflows its viewport, or whose layout viewport is not the width it claims,
  may not be used to judge anything.** *(Added 2026-08-13 (verify pass 2), F-47-V-21.)* A
  read-only reviewer cannot detect that a frame is an artifact — it can only judge what it is handed
  — so **soundness is the renderer's obligation and travels with the frame**: record
  `document.documentElement.scrollWidth == innerWidth`, that the layout viewport equals the stated
  width (Chromium's `--window-size` does **not** guarantee this; CDP
  `Emulation.setDeviceMetricsOverride` does), and a format-level integrity check on the file (a PNG
  `IEND` terminator). This generalises the milestone's existing *verify the artefact, not the
  transfer* rule from **the file is intact** to **the measurement is sound**. Three HIGH design
  findings were raised and withdrawn on 2026-08-13 for want of it.
- **520 tall** stays binding: this milestone adds **no bar and no rail**. The filter banner is
  content, inside **m45's R4** (the shell's *content region* — not this document's R4, see §Surface 2
  on the two numberings), and is subject to no chrome budget. **A filter that grew a third chrome bar
  would be a GAP, not a variant.** The partial-intersection notice (R0-N) rides inside the banner and
  inherits that clause: it is content, and it may not become a rail.

**Render targets** (the orchestration renders these and hands the reviewer the screenshots; the
reviewer does not run the browser):

- `http://127.0.0.1:4181/fleet` — unfiltered, populated. The control at rest.
- `/fleet?repo=<a workspace on the payload>` — populated, filtered, at 1280 / 768 / 390.
- `/fleet?repo=<a workspace that publishes nothing>` — the filtered empty state (E6).
- `/fleet?repo=<a value no workspace carries>` — the unknown-filter state (E4). **This is the frame
  the SPEC's second sentence is about; it is not optional.**
- `/fleet?scope=local&repo=<…>` — both narrowings in force, so the banner is judged with two chips.
- **`/fleet?scope=local&repo=<another repo that HAS member machines on this roster>`** — the
  **partial intersection** (ADR-010 clause 4): a `populated` page whose work regions are empty, whose
  node region is not, and which must carry **R0-N**. Not optional; it is the frame ADR-010 exists for.
- **`/fleet?scope=local&repo=<another repo with NO member machines>`** — the **out-of-scope empty
  state** (E5). The same address shape as the row above, and which of the two renders depends on the
  roster, so **both** are captured and each is judged against its own row.
- The picker **open**, at 1280 and at 390, so the popover's width, its rung and its first row are
  judged rather than modelled.
- A payload carrying a **long** workspace name and a **long** `projectRoot`, at all three widths —
  this surface has a measured truncation history (DG-13…DG-22) and a short-name render proves
  nothing.
- **A milestone card whose board cannot be resolved, captured AFTER the drill-in has been activated**
  — at 1280 and at 390, beside a card whose board can. **DG-47-5**; it is the frame that judges the
  one unavailable treatment this milestone ships, and it is not optional. (This is the same capture
  47/01's task 00 `@uat` scenario asks for.) Produce it the way QA names it — **mint the assignment
  by a REAL click on a local workspace, delete that checkout, then click the drill-in** — and capture
  it in **both** forms, unabbreviated and abbreviated, because the abbreviated one is the form
  clause 2 is about and a comfortable card never shows it (F-47-04-QA-7).
- **There is deliberately NO target for E3** (a filter in force over a payload that never landed).
  No address produces it, and a render harness that faked it would be judging a fixture rather than
  the product. Its copy is judged headlessly and its treatment against §Surface 2's checklist.

---

## The constraint this design is written against

Read before specifying anything. Everything in the right column is a measured fact about the shipped
surface, checked 2026-08-10 (and 2026-08-11 for the last two rows), and it bounds what this design
may do.

| Fact | Where it lives today | Consequence for this design |
|---|---|---|
| The fleet's bar contribution is `<SurfaceSlot>` holding **scope control → legend → refresh**, published to the shell and rendered in place when no shell hosts it | [Fleet.tsx:280-334](../../../ui/src/fleet/Fleet.tsx#L280), [SurfaceSlot.tsx:57-63](../../../ui/src/app/SurfaceSlot.tsx#L57) | The filter joins **this list**, in the fleet's own order. m47 "inherits a slot, not a negotiation" (45/DESIGN §The scope-control ruling). **No shell change.** |
| `<TopBar>` renders **above** the loading/error/empty/populated ternary, which is what makes the scope control present in every state — pinned by [`acd-mesh-ui-scope-visible`](../../../test/arch/acd-mesh-ui-scope-visible.test.mjs) | [Fleet.tsx:220-249](../../../ui/src/fleet/Fleet.tsx#L220) | The filter control inherits that position and that invariant **unchanged**. The filter **banner** must take the same hoist — see DG-47-1. |
| The filter key already exists on every record: `workspaceId`, `name`, `projectRoot` on workspaces; `workspaceId` on items; `workspaceIds[]` on nodes | [scope.mjs:162-170](../../../ui/src/fleet/scope.mjs#L162) | **This design asks for no new data.** The option set is `status.workspaces`; the node region narrows by *membership*, which is a different relation and must be said out loud (§Surface 2, Region 3). |
| `"Filtered to workspace <id>"` renders **inside `GlobalScopeView`**, i.e. only in the populated branch | [Fleet.tsx:442-446](../../../ui/src/fleet/Fleet.tsx#L442) | **DG-47-1.** The one sentence that explains an empty filtered page is swapped out by the empty state. |
| `pageState()` yields exactly `loading \| error \| empty \| populated`, and `isEmptyStatus()` is scope- and filter-agnostic | [scope.mjs:65-98](../../../ui/src/fleet/scope.mjs#L65) | A naive `filterToWorkspace` + `isEmptyStatus` composition renders an unknown filter as an **idle mesh** — the SPEC's forbidden outcome. **DG-47-3.** |
| `emptyStateCopy(scope)` carries exactly two strings, both about an **unfiltered** mesh ("No mesh-enabled workspaces have published yet…" / "No nodes in the group yet…") | [scope.mjs:104-109](../../../ui/src/fleet/scope.mjs#L104) | Neither is true of a filtered view. The filtered states need their **own** copy; the two existing strings are **unchanged**. |
| Region 5's yield order is settled across DG-13…DG-22 and **fitness-locked** — the name is dropped WHOLE on a fit budget (`REGION5_NAME_BUDGET_CH = 8`), the tail drops whole, the drill-in gives up its words, the target yields last, and **no two elements may occupy the same pixels** | [Fleet.tsx:696-743](../../../ui/src/fleet/Fleet.tsx#L696), [assign-affordance.mjs:198-220](../../../ui/src/fleet/assign-affordance.mjs#L198), [fleet-assign-row-geometry.test.mjs:570-700](../../../test/fleet-assign-row-geometry.test.mjs#L570) | The relief SPEC offers is real, and it is **the existing `nameDropped` geometry made unconditional** — not a new layout. **DG-47-2**, and it is a deliberate, test-updating decision. **Everything DG-47-5 adds to that row must fit this same ladder.** **AMENDED 2026-08-12 (ADR-014, F-47-04-QA-8):** that ladder was written for a TWO-child cluster and the cluster has THREE whenever the card carries an assignment AND either work in review or a done milestone (`assignment && (inReview > 0 \|\| isDone)`). It gains **one rung, inserted at position 3** — the secondary token gives up its WORDS, keeping its pinned glyph and any count with it — which pushes the target's rung to 4; and every threshold is re-derived from the grid's own floor row (286px), not from the 360.66px row at 1280. |
| The milestone card's drill-in has exactly **three** renders, and two of them break the ladder: at rest `Open board →`; in flight `Opening board...`; on failure the plain words `Open failed` with `title="Open failed"` — and in **both** non-rest states the pinned `→` is dropped while the abbreviation gate is INVERTED (`abbreviateDrillIn && !opening && !openError`), so the words render at every width | [Fleet.tsx:729-741](../../../ui/src/fleet/Fleet.tsx#L729) | **DG-47-5.** The failure is the WIDEST state of the most width-constrained element on the row, and the mark DG-19 pins is the one thing it drops. |
| The milestone-switcher disclosure already exists: `flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-sm font-medium`, `▾`, `aria-haspopup`, `aria-expanded`, a `z-20` listbox whose **first row is `All milestones`** above a separator, active row `bg-primary/10 text-foreground` | [BoardLanes.tsx:352-393](../../../ui/src/board/BoardLanes.tsx#L352), [:398-420](../../../ui/src/board/BoardLanes.tsx#L398) | The repo picker is **this component's shape**, reused — including its "All …" first row. m45 already reuses it for the 390 nav disclosure, so it is the product's settled answer to "pick one from a data-derived list". |
| The identity chip's width lesson (m45 GAP-4): `min-w-[7ch]` is a **border-box** minimum, so it reserved 4.26 characters, not 7; fixed by reserving the CONTENT box in **one** literal constant both the element and its placeholder consume | [shell-layout.mjs:198-228](../../../ui/src/app/shell-layout.mjs#L198) | The filter trigger reserves its width the same way, in one constant, spelled as a **literal** Tailwind's scanner can see. Repeating the mistake is not permitted twice in the same bar. |
| The z ladder is closed: `popover` is **`z-20`** and legends/disclosures/listboxes live there | [shell-layout.mjs:771-798](../../../ui/src/app/shell-layout.mjs#L771), DG-45-2 | The picker's popover takes `z-20`. It is not a dialog, not a toast, and never `z-50`. |
| The page root is clamped `overflow-x: clip` as D1's backstop, and every fleet card carries `min-w-0` because `truncate` cannot clip until a flex/grid item may shrink below its content | [index.css:27-45](../../../ui/src/index.css#L27), [Fleet.tsx:465-474](../../../ui/src/fleet/Fleet.tsx#L465) | A long repo name may never widen the page. Every new box below declares its own `min-w-0` / max-width. |
| `GlobalScopeView` renders **Workspaces → Milestones → Nodes → Diagnostics** — **four** regions, and no Boards region. ADR-006 **DELETES** the unreachable local-shape branch in this milestone: `BoardsRegion`, `BoardTile`, `boardRunState`, `BoardDrillIn` and the `NodesRegion`/`NodeCard` pair beside it (≈250 lines), plus the wire types that lose their last reader | [Fleet.tsx:439-453](../../../ui/src/fleet/Fleet.tsx#L439), [ARCHITECTURE.md ADR-006](ARCHITECTURE.md) | **The page's regions are R0–R4 and Boards is not one of them.** A render with no boards region **CONFORMS** — logging it as a GAP would be judging the build against a region the record removed on purpose. See §Surface 2's dated removal note for the terms on which one returns. |
| The **production** node region is `GlobalNodePanel`, whose summary is `<N> nodes` and nothing more; the `· N live · N stale · N offline` tail belongs to the deleted local-shape `NodesRegion` | [Fleet.tsx:973-977](../../../ui/src/fleet/Fleet.tsx#L973) vs [:1065-1069](../../../ui/src/fleet/Fleet.tsx#L1065) | R3's filtered summary carries **no** liveness tail. A checklist that asked for one would GAP a correct build. |
| Diagnostics is a **COMPOUND**: `projectedAt` / `databasePath` / `descriptorErrors[]` describe the projection's own health and carry no workspace, while `skippedWorkspaces[]` and `projectionErrors[]` carry `workspaceId` | [scope.mjs:265-273](../../../ui/src/fleet/scope.mjs#L265), [Fleet.tsx:1045-1061](../../../ui/src/fleet/Fleet.tsx#L1045), ADR-004 | It is **partly** exempt, not wholly: ADR-004 rules the workspace-carrying rows **case 1 (narrowed)** and the rest **case 3(a) — machine-wide and DECLARED**. The region states **which of its numbers are filtered**. A blanket *"not narrowed by the filter"* would be false about half its own strip. See §Surface 2, Region 4. |
| `emptyStateCopy(narrowings)` returns `{ heading, body }` and branches on the payload's `scope` scalar, the raw `repo`, the three-valued `resolved` and (per ADR-010) the served `workspaceId` — so it can produce far more than the four cases ADR-007 names | [scope.mjs:275-323](../../../ui/src/fleet/scope.mjs#L275), 47/02 task 02, ADR-010 clause 5 | **Every combination it can reach is pinned** in §Surface 2's *E1–E7* table, and the combinations it may **never** produce are listed beside it. A checklist that pinned only the four cases left the developer authoring product copy at build — which is what happened, and what `F-47-02-QA-F3` found. |
| **The server NEVER narrows the node roster** — not under `?scope=local`, not ever — so a repo filter is the **first** narrowing that roster receives | [global-node-registry.mjs:170-172](../../../src/global-node-registry.mjs#L170), [mesh-ui-serve.mjs:552-554](../../../src/mesh-ui-serve.mjs#L552), `acd-mesh-ui-local-filter-preserves-status` (green), **ADR-010** | `?scope=local&repo=<another repo>` renders **that repo's member machines with no work above them** — a `populated` page, not an empty one. It needs the **partial-intersection notice** (§Surface 2, **R0-N**), and it is why the composed nothing-state is **OUT-OF-SCOPE (E5)** and never *unknown*. |
| The payload carries `workspaceId` — *the workspace the SERVER narrowed to*, `null` when it did not narrow | [global-mesh-query.mjs:271](../../../src/global-mesh-query.mjs#L271), [api.ts:210](../../../ui/src/fleet/api.ts#L210), ADR-010 clause 5 | It is the discriminator that keeps a scope-narrowed view from accusing a repo of being unknown. **A view served one workspace may never make a claim about the mesh** — E5's copy exists for exactly that, and E4's copy is structurally unavailable there. |

---

## The design gaps

Each resolves as a rule in this document plus a `@uat` visual-review scenario, not as a code patch
alone.

### DG-47-1 — the "filtered by" statement lives inside the populated branch

**What is true today.** `"Filtered to workspace <id>"` is the first child of `GlobalScopeView`
([Fleet.tsx:442-446](../../../ui/src/fleet/Fleet.tsx#L442)), which is one of four mutually exclusive
branches. In `loading`, `error` and — decisively — **`empty`**, the page renders a different subtree
and the sentence is gone.

**Why it is a real gap and not a nit.** The state in which an operator most needs to know that a
narrowing is in force is precisely the state that discards the sentence. This is already latent for
`?scope=local` on the shipped surface; a repo filter makes it the common case, and the SPEC names the
outcome in terms: *a filtered view that looks like an idle fleet is a bug.*

**The rule.** The narrowing statement is **hoisted above the state ternary**, exactly as `<TopBar>`
and the scope control were by m34/ADR-006, and it renders in **all four** states. It becomes
**Region 0** of Surface 2 (§Surface 2). The existing sentence is **replaced by**, not duplicated
into, the banner — one fact, one home.

**Close condition.** A render of `/fleet?repo=<something with nothing published>` shows the banner
above the empty card, and the same render at `?scope=local&repo=…` shows both narrowings.

### DG-47-2 — region 5's workspace-name column is redundant under a filter, and the contract says so out loud

**What SPEC offers.** *"The filter is in fact relief here — a filtered view can drop the
workspace-name column — but the assign row's membership is a contract, not a layout preference.
Treat any change to it as a deliberate, test-updating decision."*

**The ruling: take the relief, and take it as the EXISTING geometry made unconditional.** Under a
repo filter every card on the page belongs to one repo, and that repo is named **in full** in the
banner one region above and again in the Workspaces card. That is exactly DG-16's own stated reason
for permitting the drop (*"it costs nothing: the WORKSPACES strip at the top of this same page
carries it in full"*) — now true for every card at once rather than one card at a time.

**So:** when a repo filter is in force, region 5 **drops the workspace name unconditionally**;
`REGION5_NAME_BUDGET_CH` is **not consulted**, and DG-22's alignment consequence applies to every
card — the attention cluster becomes the row's leading group and is left-aligned, only the drill-in
is pushed right. **This is byte-identical to today's `nameDropped === true` geometry**
([Fleet.tsx:711-714](../../../ui/src/fleet/Fleet.tsx#L711)). No new layout is invented; a branch that
already exists becomes reachable by a second, page-level condition.

**Why DG-20's covert-signal objection does not bite here, stated so it is not re-argued.** DG-20
forbade gating the name on chip-presence because that made *absence-of-name* a second signal for
*"this card has an assignment"* — a fact about **one card**, already spoken by the chip. Under a
filter the absence is a property of **the whole page**, applies to **every card equally**, and is
stated explicitly in the banner. An operator can never read it as a fact about the card in front of
them, which is the only thing DG-20 protects.

**The EXACT filtered yield order** — who gives way first, so the developer has something to build to:

| # | Element | Behaviour under pressure |
|---|---|---|
| — | **workspace name** | **absent** — dropped whole, with its separator, unconditionally, for the duration of the filter |
| 1 | the chip's `· <when> · <note>` **tail** | **NOT RENDERED — retired as a member of region 5 on 2026-08-12 (DG-47-7).** The rung keeps this number so the table still maps 1:1 onto ADR-014's derivation and onto the module's; nothing occupies it. The `when` and the `note` are carried in full, unconditionally, by the chip's own `title`. The rung it retires is **DG-19's** (m38), not DG-13 clause 5's — clause 5's three named parties all survive |
| 2 | **`Open board →`** | gives up its **WORDS** whole at `REGION5_DRILLIN_ABBREV_AT_CH`, degrading to its pinned `→` with the label in `title`, never to nothing. **Every state of this element takes the same rung** — in flight and failed included (DG-47-5) |
| 3 | the **secondary token** | **ADDED 2026-08-12 (ADR-014).** Gives up its **WORDS**, degrading to its pinned glyph and keeping any count with it (`◔ N in review` → `◔ N`; `✓ accepted` → `✓`, which has no count to keep), the words moving to `title`. `✓` alone is a 9px mark, so that `title` is load-bearing rather than decorative (§a11y 4). **Never dropped whole** — absence would make it a covert signal (DG-20) |
| 4 | the chip's **`→ <target>`** | yields **LAST**, inside its own box, and **never overprints anything** (clause 6) |

Membership of the filtered row, left → right: **[attention cluster: assignment chip · secondary
token]** then **[drill-in]**, the cluster left-aligned as the leading group, the drill-in
right-aligned. **AMENDED 2026-08-12 (ADR-014).** The secondary token (`◔ N in review` /
`✓ accepted`) is **the cluster's THIRD child and is no longer unchanged** — it is `shrink-0
whitespace-pre` (it wrapped, making region 5 a 45px two-line row at every measured width) and it
takes the ladder's new fourth rung above. The muted `·` placeholder still leaves once the chip
occupies the cluster (DG-19).

**This is a deliberate, test-updating decision.**
[`test/fleet-assign-row-geometry.test.mjs`](../../../test/fleet-assign-row-geometry.test.mjs) is the
fitness lock and it is **updated, not weakened**: its `region5()` helper already addresses the
workspace name **by identity rather than position** ([:123-131](../../../test/fleet-assign-row-geometry.test.mjs#L123))
precisely because DG-16 made the name conditional, so the shape is anticipated. The update is a
**new lane** — *"under a repo filter the name is absent on every card regardless of length, and the
cluster is the leading group"* — with **every existing unfiltered lane unchanged and still green**.
A change that made an unfiltered lane fail would not be this decision; it would be a regression.

**And it is the ONE card-content change this milestone makes.** SPEC puts *"reworking what a card
shows"* out of scope; this is the single exception SPEC itself names, and it is recorded here so a
conformance reviewer reads it as designed rather than as drift. (DG-47-5 changes the *treatment* of
an element that is already on the row, in a state that already renders — not what the card shows.)

### DG-47-3 — an unknown filter has no home in the four-state model, and renders as an idle mesh

**What breaks.** `pageState()` names four states and `isEmptyStatus()` reads the payload's own
collections — `workspaces`, `items`, `nodes`
([scope.mjs:65-98](../../../ui/src/fleet/scope.mjs#L65)). Filter a populated payload down to a
workspace it does not carry and every one of them is empty — so the page renders **`empty`**, whose
copy says *"No mesh-enabled workspaces have published yet"*. That is a **false statement about the
mesh**, produced by the operator's own filter, and it is exactly the SPEC's forbidden outcome.

**The rule.** A filtered view has **five** distinguishable nothing-states and each says a different
true thing:

| Condition | What it means | What it renders |
|---|---|---|
| the mesh itself is empty | nothing has published anywhere | today's `emptyStateCopy(scope)` card — **unchanged** (E1 / E2) |
| **no payload has landed at all** while a filter is in force | the view knows nothing yet — about the mesh OR about the value | `empty (not yet known)` — its own copy, the **neutral** (never dashed) chip, and **no recovery control** (E3) |
| the filter names a workspace **an UNNARROWED payload does not carry** | this mesh has nothing that publishes as that id | `empty (unknown filter)` — new copy, the **dashed unavailable** treatment, `Show all repos`, **and the address is not rewritten** (E4) |
| the filter names a workspace **a SCOPE-NARROWED payload does not carry** | the two narrowings do not intersect — and the view cannot speak for the mesh (ADR-010 clause 5) | `empty (out of scope)` — its own copy, **never the unknown accusation**, `Show all repos` (E5) |
| the filter names a **known** workspace that has published nothing | the repo is on the mesh and quiet | `empty (filtered)` — new copy, `Show all repos` (E6 / E7) |

**And there is a SIXTH outcome that is not a nothing-state at all**, added by ADR-010 clause 4 and
easy to mistake for one: `?scope=local&repo=<another repo>` where that repo's **member machines**
survive the roster's membership narrowing. The page is **`populated`** — forcing it empty would hide
the very rows that answer the filter — but a node region with no work above it and no explanation is
*a partial fleet masquerading as a whole one*. It takes the **partial-intersection notice**,
§Surface 2's **R0-N**. E5 and R0-N are the same composition with two different rosters, and **exactly
one of them speaks on any given render**.

**Where design stops.** This document fixes the five copies, the notice, their treatments and their
recovery controls. **How** each state is derived — a filter-aware selector, a separate predicate, a
resolved flag, the served `workspaceId` — is the architect's, and it must not be inferred from this
table. (ADR-009 and ADR-010 have since ruled it, and this table agrees with both.)

**One clause that is easy to get backwards, so it is written down:** *not yet known* is not *not
found*. Before a payload has landed the filter's value is simply unresolved, and the chip renders in
its **neutral** form. The dashed unavailable form is taken **only once a payload has arrived and does
not carry the id**. A loading state that accuses a valid filter of being unknown is a defect.

**Its twin, added by ADR-010 and easier still to get backwards:** *out of scope* is not *not found*
either. A payload served one workspace was not served the mesh, so it may not say what the mesh
publishes. **The dashed unavailable form and the unknown accusation are BOTH withheld from E5** —
nothing about that value has been established, only that this view does not reach it.

**And the clause binds the COPY, not only the chip — which is what the 2026-08-11 amendment adds.**
The unresolved state has its own card copy (E3), and it is written to be told apart from the quiet
state (E6/E7) **by shape rather than by a word**: a different subject of assertion (the mesh's
silence, not the repo's quietness), the raw value where the quiet state shows a resolved name, and no
recovery control where the quiet state promotes one. Two headings a single word apart would leave the
distinction the clause protects invisible to an operator watching the page settle.

### DG-47-4 — the fleet's slot contribution outgrows the 40px surface bar at 390

**Raised here, by this milestone, because this milestone causes it.** The fleet's slot holds four
controls today and the filter makes five. Estimated at the slot's own `text-xs` ramp — **estimates,
which the render must confirm**, exactly as m45 handled the notice rail's wrapped height:

| Slot contents at 390 | est. width | Available (390 − `px-4`) |
|---|---|---|
| `[Global\|Local]` · `◷ legend` · `⟳ refreshed 4s ago` (today) | ~332px | 358px — fits, ~26px spare |
| …**plus `▾ All repos`** | **~438px** | 358px — **overflows by ~80px** |
| …with a repo name at the trigger's ~~18ch~~ ceiling | **~494px** | 358px — **overflows by ~136px** |

> **[SUPERSEDED AS A FIT CALCULATION — 2026-08-13 (verify pass 2), F-47-V-18. The table is kept
> because it correctly establishes THAT the gap exists; it is no longer how the gap is CLOSED.]**
> Its third row costs against `18ch`, a ceiling **withdrawn on 2026-08-11** by F-47-V-4, and its
> arithmetic used 12px gaps where the slot row uses 16px. Both errors are the same shape and it is
> the shape this gap should be read for: **a fit expressed as a sum is a fit that must be recomputed,
> by hand, every time any occupant changes — including occupants a later milestone adds.** The fit is
> now structural (`flex-nowrap` + a shrinkable trigger; see the amendment below and §Surface 1), so
> no number in this table governs anything. Measured residuals for reference only, not as a rule:
> **167.77px at 390, 92.73px at 480, 212.73px at 600.**

**Four answers are forbidden**, and each for a rule already in force: **truncating a control's
label** (45/DESIGN §Responsive form, and DG-16's own reasoning); **wrapping the slot to a second
row** (a third chrome bar is a GAP, not a variant); **scrolling the bar horizontally** (the operator
cannot see that there is more); **hiding the scope control or the filter** (the standing invariant,
and rail 2 above).

**[CLARIFIED 2026-08-13 (verify pass 3), F-47-V-22.] A control's LABEL is not its VALUE, and the
first forbidden answer above binds only the LABEL.** The **label** is the word the product chose for
the control — `legend`, `refreshed Ns ago`, `All repos` — and it may never be character-shaved: it
gives up its words WHOLE to a pinned glyph (the two drops below) or not at all, because half a word
the product wrote is a defect and never a degradation. The **value** is the operator's own datum
carried by the trigger — a workspace name or a raw id — and it MAY truncate with an ellipsis,
licensed by DG-16 and **only on DG-16's condition**: the same fact renders in full, unclipped, one
region below in R0's chip (§Surface 1, *How a long repo name behaves*). The trigger holds one of each
and they take opposite rules. Where §Surface 1's fit rule says *"the trigger's label is the sole
yielder"*, read it as **the trigger's VALUE**. Two clauses using one word for opposite subjects is
how a review returns a false GAP on a correct `not-a-real-workspa…` at 390 and a false CONFORMS on a
squeezed 92.73px trigger at 480 — both were nearly returned on 2026-08-13.

**[AMENDED 2026-08-13 (verify pass 2), F-47-V-18 — THE RULE HAS THREE TERMS, NOT TWO, AND THE THIRD
IS STRUCTURAL.]** The two drops below do **not** discharge the fit on their own, and for two days
this gap read as though they did. This section's arithmetic costed the slot against a trigger ceiling
computed by hand — and that ceiling used **12px** for the row's gaps where the slot row uses `gap-4`
= **16px** (12px is the *bar's* `gap-3`, one element up). Measured on the shipped build: both drops
fired correctly, and the row **still** overflowed once the trigger reached its ceiling — needing
365.73px in a 358px rail and wrapping to 70px in two y-bands inside the fixed 40px `overflow: visible`
bar, drawing across the top bar's rule above and into the content below. **The first and second
forbidden answers, arriving through the door this gap's own arithmetic left open.** It was also
data-keyed, which the clause below forbids in terms: values of 57.4px, 145.6px and 156.4px rendered
one line while 175.5px wrapped, so the bar's *form* became a signal about how long a value the
operator typed.

**The third term: the slot row is `flex-nowrap`, and the trigger is a shrinkable flex item.** A wrap
is not a degradation mode in a fixed-height bar — it is an overprint — so the row must never be
allowed to take one, and `flex-wrap` additionally makes a child's `min-w-0` unreachable (line-breaking
uses each item's *hypothetical* size, so the row wraps before anything is permitted to shrink). With
`nowrap`, the shrink phase is reachable and the layout engine computes each width's residual instead
of a human transcribing it. See §Surface 1's fit rule for the full statement. **No number in this
section is load-bearing for fit any more**, and none should be reintroduced as if it were.

**[RULED 2026-08-13 (verify pass 3), F-47-V-23 — THE DROP BOUNDARY IS `sm`, NOT 390, AND IT IS THE
SAME BOUNDARY AS THE TRIGGER'S FIXED SLOT.]** The drops were keyed at `≤390` while S1-B's fixed 150px
slot binds at `≥640`, which left **391–639** as a band where the two UNPROTECTED aids kept their
WORDS while the PROTECTED repo filter had no reserved width — **the protected element paying for the
unprotected ones, which inverts this gap's whole ruling.** Measured on the live build before the
change, the trigger's residual was **non-monotone**: **167.77px at 390, 92.73px at 480, 212.73px at
600** — the control **75px narrower one designed drop above the width where it was in full**. A
viewport-keyed form whose protected element gets *worse* as the viewport gets *wider* is not a
degradation ladder; it is a cliff at a boundary nobody chose.

- **The two drops fire below `sm` (< 640)** — the boundary S1-B's fixed slot starts at, and one this
  page already keeps (`px-4 sm:px-8`). **One bar, one boundary.** Measured after: 167.77 → 216 → 270
  across 390 / 480 / 600, monotone, then the fixed 150px slot from 640.
- **DECOUPLED from the nav's disclosure breakpoint, deliberately.** `slot-aids.mjs` had keyed its
  drop to `shell-nav.mjs`'s `NAV_DISCLOSURE_BREAKPOINT` so *"the bar's two viewport-keyed behaviours
  change form at the SAME width"*. **They are not one bar's behaviours**: the nav is in the 48px top
  bar, these aids are in the 40px surface bar below 1024, with different occupants and different
  budgets. Keying one bar's degradation to another bar's breakpoint is a hand-computed ceiling
  wearing different clothes — a number only ever correct for occupants it was never measured
  against. **Coherence is not a budget.** `shell-nav.mjs` keeps its own 390, unchanged.
- **What is NOT permitted instead:** keying the drops to the row's remaining space. That would make
  the aids' form vary with the freshness string's length — the covert-signal defect the clause below
  forbids in terms. **The boundary MOVES; it does not become dynamic.**

**The rule — two whole discrete drops, taken TOGETHER below `sm` (< 640), keyed to the viewport and
never to the data:**

1. **`⟳ refreshed Ns ago` gives up its WORDS**, degrading to its pinned **`⟳`** with the freshness
   reading moved into `title` and `aria-label`. It is a refresh **control** first and a clock second,
   and this is the drill-in's own DG-19 idiom one bar up: give up the words whole, keep the glyph
   pinned, keep the label recoverable.
2. **`◷ legend` gives up its word**, degrading to its pinned **`◷`**, the word moving into `title`.
   The legend is a hover/focus disclosure; its glyph is the affordance.

**The two protected elements, in full, at every width: the scope control and the repo filter.** They
are the page's two narrowings, and a narrowing you cannot see is the failure this milestone exists to
prevent.

**Keyed to the viewport, not to the label's length** — a drop that came and went with the data would
make the bar's form a covert signal about the repo's name. m45's own distinction applies: a
full-width bar is the case where keying form to the viewport is honest.

**And this gap is why the partial-intersection notice is NOT in the bar.** ADR-010 places it *"beside
the chip"*; this document places the chip in the page (R0), so beside-the-chip resolves to R0. A
sentence in the 40px band at 390 would be the sixth thing in a band that already needed two drops to
fit five — and a sentence cannot take a discrete drop, because there is no glyph it degrades to.

### DG-47-5 — the surviving drill-in has NO unavailable treatment, and its failure is the widest state of the most width-constrained element on the row

**Why this gap exists in this document at all.** It is where **DG-45-5 is re-expressed** after
ADR-006. The treatment this document used to point at — the peer-board branch beside the local one —
**is deleted by ADR-006**, so the model disappears in the very milestone meant to close the gap. The
question does not disappear with it: after the deletion **the milestone card's drill-in is the only
drill-in the fleet has**, and it is the one an operator meets.

**What is true today, read at source at `d71d508`
([Fleet.tsx:729-741](../../../ui/src/fleet/Fleet.tsx#L729)):**

| | Expected (the rules already in force) | Observed |
|---|---|---|
| the mark | an unresolvable destination takes the house **dashed / muted** absent primitive | full `text-primary font-semibold` — the **live-action** token, identical to a healthy card |
| the words | subject to `REGION5_DRILLIN_ABBREV_AT_CH` like every other state (DG-19) | the abbreviation gate is **inverted** for this state (`abbreviateDrillIn && !opening && !openError`), so `Open failed` renders **at every width** |
| the pinned glyph | the `→` survives when the words give way — it is what DG-19 pins | **dropped** in exactly the two states that keep their words |
| the accessible name | names the **remedy** | `title="Open failed"` — a tooltip that restates the visible label and names no command |

So the failure is **the widest render of the element whose width the geometry contract fought
hardest over**, and it discards the one mark that contract pins. That is a geometry defect and a
legibility defect at once, and it is reachable on any card (DG-47-6).

**A record correction, so the next reader does not inherit it.** This document previously said the
peer-board branch *"already ships the honest-locality affordance the rule wants — dashed,
`aria-disabled`, `title` naming the command"*. Read at source
([Fleet.tsx:1438-1447](../../../ui/src/fleet/Fleet.tsx#L1438)) it shipped **neither** of the first
two: it was a `text-primary font-semibold` button that copied `aof work ui` to the clipboard, with
the command in `title`. **Its `title` was its one good property**, and that property is inherited
below rather than lost with the branch.

**The rule — five clauses, all of them inside the existing token vocabulary and all of them
width-neutral, because region 5 is geometry-locked by DG-13…DG-22 and ADR-008/DG-47-2 does not
reorder the ladder:**

1. **The failure keeps the ladder.** The failed label degrades by the **same** gate as the rest
   label — words dropped **whole** at `REGION5_DRILLIN_ABBREV_AT_CH`, the pinned `→` surviving,
   and no budget moves to make room (ADR-008: *"no budget is relaxed to collect it"*).
   **The clause is about what a state can FORCE, not what it occupies** — corrected 2026-08-11,
   F-47-04-QA-5. In every state the element keeps its shrink weight and its explicit floor, its
   words yield inside their own `min-w-0 truncate` box before the element does, and no state adds
   horizontal padding, a ring, a border on any edge but the bottom, or a `shrink-0`. **So no state
   may push a neighbour, overrun the card's content box, or make the row wider than the at-rest
   render of the same card.** A state may legitimately *occupy* more pixels than at rest where the
   row has slack: measured, `Opening board...` is **six** characters longer than `Open board` and
   `Open failed` is **one**, this document pins all three verbatim, and an earlier draft of this
   clause both read as a string-length rule and mis-stated the difference as three. Read as string
   length it was unsatisfiable by construction; read as occupancy it fails a correct build on a
   roomy card. **Width is taken from something, and that is the thing forbidden.**
2. **The pinned `→` STAYS in the failed state.** It is the element's identity and the retry is still
   a navigation attempt; dropping it leaves the abbreviated width with nothing at all to render, and
   swapping it for a different glyph would make the mark's SHAPE a second signal the operator has to
   learn. One glyph, three states, three treatments.
3. **The mark is the house absent/not-yet primitive, spent VERTICALLY so it costs no width.** The
   element goes `text-muted-foreground` and its box takes `border-b border-dashed
   border-muted-foreground/40`; on hover the dashed rule becomes solid
   (`group-hover:border-solid`) and the state's `group-hover:underline` is dropped, so there is one
   line and never two. **No dashed box, no ring, no added padding** — those spend the horizontal
   width DG-13 clause 5 protects. **Never `accent`, never `destructive`:** a board that did not
   resolve is *absent*, not *broken*, and the mesh has not failed.
4. **It stays a LIVE control — `aria-disabled` is FORBIDDEN here, and this is the deliberate
   departure from the nav's treatment m45 fixed.** The nav's unavailable item has no destination at
   all; this one has a destination that did not resolve *this time*, and a second click is the
   operator's recovery (pinned behaviourally in 47/01's task 00). Marking it disabled would take the
   recovery away and lie about the element. What the two treatments **share** is the dashed mark and
   the naming; what they must **not** share is the disabled state.
5. **The accessible name names the REMEDY, and it is carried by the CONTROL — corrected 2026-08-11,
   F-47-04-QA-6.** The control an operator activates is the card's own `<button>`; the drill-in is a
   `<span>` inside it. **The remedy is the button's `aria-label`, with its `title` carrying the same
   string byte-for-byte** — one name, two channels, one element. Both read *"Could not open a board
   for `<repo name>` — run `aof work ui` in its project directory on the node that owns it"*, falling
   back to the workspace id when the name is absent. At rest and in flight the button's name is
   today's `Open board for <repo name>`, verbatim: an attempt in flight is not a failure and must not
   read as one.
   **The `<span>` carries NO `aria-label` in any state.** It is a generic element and ARIA prohibits
   naming it, so the attribute is ignored outright — and an ignored attribute that looks correct is
   worse than an absent one. **Its `title` is unchanged and stays state-varying** (`Open board` /
   `Opening board...` / `Open failed`): recovering the words the abbreviation drops is DG-19's own
   idiom and this rule's own clause 1, and it is a different job from naming the control. The defect
   was never that the span had a `title` — it was that the span's `title` was the only naming on the
   element and it named no command.
   This is the deleted peer-board affordance's one good property, inherited and put where it works.

**Three states, three readings, at BOTH judged widths** — which is what 47/01's task 00 `@uat`
scenario asks for, and it must survive the abbreviation:

| State | ≥ the abbreviation threshold | below it (the glyph only) |
|---|---|---|
| **at rest** | `Open board →`, `text-primary font-semibold` | `→`, primary |
| **in flight** | `Opening board...` + `→`, primary, with `animate-pulse` — **this element has never carried motion; DG-47-5 adds it** (F-47-04-QA-4) | `→`, primary, **pulsing** — the product's only motion token, and here the ONLY thing that separates in-flight from at rest |
| **failed** | `Open failed` + `→`, muted, dashed rule beneath | `→`, muted, **dashed rule beneath** |

> **Clauses 1 and 5 and the in-flight cell were AMENDED on 2026-08-11 — dated, attributed and
> recorded, not silently edited in.** QA authored the missing task contract for this gap
> (`stories/04_story_assign-row-relief/tasks/01_drill-in-unavailable-treatment.feature`, routed to
> 47/04 because ADR-008 binds this row's ladder there) and encoding five clauses as executable rows
> surfaced three defects **in this section**, not in the build. QA deliberately did not edit this
> document. All three are ruled here.
>
> - **`F-47-04-QA-4` — the in-flight `animate-pulse` was called "existing" and is not.** Read at
>   source, the drill-in carries no motion token in any state; the product's pulse lives on the
>   assignment chip's dot and on the loading skeletons. A word meant to describe the shipped build was
>   introducing a new requirement, and because no mock is committed this checklist is binding, so QA
>   had to encode it. **The word is corrected AND the motion is ruled IN**, with the reason the
>   parenthetical never gave: at the abbreviated width all three states render one glyph, failed is
>   told apart by tone and its dashed rule, and **at rest and in flight would otherwise be
>   byte-identical**. The pulse is the only discriminator in the form clause 2 exists for. It applies
>   in **both** forms — one state, one treatment. **The accepted cost:** under
>   `prefers-reduced-motion` the abbreviated in-flight and at-rest forms converge. That is tolerable
>   here and nowhere else on this element, because in-flight is **transient and operator-caused**
>   while *failed* is persistent and may be arrived at cold — and failed survives both the
>   abbreviation and reduced motion on **shape**, never on motion or colour alone (a11y 4).
> - **`F-47-04-QA-5` — clause 1 could not be a string-length rule.** Confirmed: the box reading is
>   what was meant, and clause 1 now says so in terms. Two further corrections fall out of it. The
>   old clause mis-measured its own example (`Opening board...` is six characters longer than
>   `Open board`, not three). And the **occupancy** reading is wrong too: on a roomy card the
>   in-flight element legitimately measures wider than `Open board →`, so a lane asserting *"no state
>   measures wider than the at-rest drill-in"* would fail a conforming build. **The invariant is
>   demand, not occupancy** — no state may take width from the chip, the name column or the card.
> - **`F-47-04-QA-6` — clause 5 named an element that cannot carry an accessible name**, and the
>   ruling is in clause 5 above: the button, `aria-label` + mirrored `title`; the span, never.
>   **It was ruled knowing `F-47-04-QA-3`, not around it.** A conforming build breaks two harness
>   accessors, and this placement decides which: `region5()`'s `title` regex **survives untouched**
>   because the span's `title` is unchanged; `drillInIn().label` breaks on clause 3's dropped hover
>   class **under any placement**; and `drillIns()`'s button-`title` match breaks in the failed state.
>   So the re-basing is **concentrated in one support file** rather than split across two suites, and
>   the geometry lock needs no edit at all. The identities that survive every clause of this rule, as
>   design facts rather than as test code: the span is the element carrying **`shrink-1000` and its
>   explicit floor** — ADR-008 forbids relaxing either, and the contract pins both in all three
>   states — and the control is **the button that contains that span**. Re-basing the harness is the
>   developer's change, in the same commit, with no lane's expected value altered.
> - **The cost of clause 5, named rather than discovered.** The button has no `aria-label` today, so
>   its accessible name is computed from its **contents** — the whole card, read out. Authoring the
>   name replaces that. **That is intended**: a control named by every fact on its own card is not
>   named, and the at-rest and in-flight strings are today's tooltip verbatim, so nothing an operator
>   reads changes. Whether the card's own facts stay reachable to a screen reader is a claim this
>   document cannot make and the `@uat` lane must — and if they do not, the answer is a follow-on gap
>   with its own ruling, **never** a return to naming-by-content.
>
> **And one product fact absorbed rather than ruled — `F-47-04-QA-7`.** `abbreviateDrillIn` opens
> with `!!assignment`, so only a chip-bearing card ever abbreviates; but since ADR-011 the assign
> route refuses `409 workspace-not-local` for the same rows the board-url route does, through the
> same seam. **So on a live mesh the widest state of the most width-constrained element on this row
> is reachable only through a race — the checkout goes away between the poll and the click — or a
> transport failure.** That changes how often an operator meets it and it changes nothing else:
> clause 1 is about the widest state, not the likeliest, and a transport failure is ordinary. It is
> recorded so a reviewer reads a rare frame as rare rather than as unreachable, and so the `@uat`
> capture has a named producer (QA's: mint the assignment by a REAL click on a local workspace,
> delete that checkout, then click the drill-in).

**The words are NOT changed.** `Open failed` and `Opening board...` are pinned verbatim by 47/01's
task 00 executable scenarios; this ruling changes the treatment, the glyph and the accessible name,
and touches no string a scenario reads.

**Filtered and unfiltered render identically.** Rail 2: nothing changes form because a filter is on.
Under a filter the row has already dropped the workspace name (DG-47-2), so the failed label competes
with the chip's target rather than with the name — **one rung lighter on the same ladder, never a
different ladder**.

**The residual, named rather than glossed.** The `@uat` lane asks that *"what failed and what the
operator can do about it"* be recoverable **without hovering**. After this rule a sighted mouse user
gets *what* (the words plus the dashed absent mark, at a glance and in monochrome) and the *remedy*
only on hover or focus. Putting the remedy sentence on the card needs card room this milestone does
not have — SPEC puts *"reworking what a card shows"* out of scope and DG-47-2 is the one exception it
sanctions. So the remedy's on-card home rides with **DG-47-6**, which needs a home for the same
sentence anyway. A reviewer should record that as **the known residual of a closed gap**, not as a
new GAP.

**Close condition.** A render of a card whose board did not resolve, after the attempt, at 1280 and
390: muted and dashed-underlined, the pinned `→` present at **both** widths, the words present at
1280 and gone at 390, nothing overlapping and nothing outside the card, the element still focusable
and clickable, and its accessible name naming the command. Judged against §Surface 2's checklist —
**no mock frame is requested for it** (§Conformance source of truth).

### DG-47-6 (OPEN — deliberately NOT closed by this milestone) — a card whose board can never open looks exactly like one that can, before the operator clicks

**What is true today, and it is ordinary rather than exotic.** The global projection is machine-wide
and **cross-machine**: it carries workspace rows published by *other* nodes, whose `projectRoot`
names a path this machine has never had ([api.ts:93-101](../../../ui/src/fleet/api.ts#L93) — a
workspace row carries `projectRoot`, `workDir` and `controlNode`, every one of them a fact about
another machine's disk). Every milestone card on such a workspace renders `Open board →` in the
live-action token, and **none of them can ever open**: the resolver calls `serveBoard({ projectDir })`
on a directory that is not there. This is reachable today, and ADR-006 does not touch it — ADR-006
deleted the boards *region*; this is the milestone card's own drill-in.

**The ruling: the PRE-CLICK treatment is OUT OF SCOPE for m47, explicitly, and here is the reason
rather than an omission.** An unavailable mark drawn *before* the attempt is a claim about another
machine's filesystem, and nothing on this wire carries that claim:

- **`controlNode` is the nearest fact and it is not the same fact.** It says which node *controls* a
  workspace, not whether *this* machine holds the directory — two nodes may both hold a clone, and
  the control node need not be the one the operator is looking at. Keying a dashed treatment to it
  would dress a guess as a fact, on a page whose entire rail set exists to stop exactly that.
- **The honest producer is the `resolvable` probe m45/DG-45-5 named**, and it is a server-side fact
  that belongs on the row like every other fact this page reads. **No ADR in this milestone publishes
  it:** ADR-002 makes *"`src/` is not edited"* an invariant of the milestone and ADR-006 adds no
  producer. Specifying a treatment for a fact the milestone will not produce would put a rule in this
  document that no story here can build — the defect this document's own conformance rule is about.

**What m47 DOES ship for this operator state, so it is not left undesigned:** the **post-attempt**
treatment, **DG-47-5** — within one click the operator gets the house absent vocabulary, the remedy
in the accessible name, and identical rendering in the filtered and unfiltered views. Marked-after-
attempt is a weaker answer than marked-on-sight; it is the honest one available at this milestone's
data, and saying so is the point of this entry.

**Carried to the next fleet milestone, with its close condition stated so it is picked up rather than
re-discovered:**

1. a producer publishes `resolvable` (or its equivalent) into the **global projection, ON THE ROW** —
   the same route `workspaces` and `nodes` already take, and the same shape ADR-006 sets as the price
   of any restored region;
2. the pre-click treatment is the house **dashed / muted** primitive with the reason in the
   accessible name — never `accent`, never `destructive`, and **never hiding the affordance** (rail
   2). It also becomes the on-card home for DG-47-5's remedy sentence;
3. it lands **with DG-45-4**, so the nav's unavailable item and the card's unopenable board say the
   same thing in the same words.

**Until then, a review must NOT return a GAP for a card that renders `Open board →` on a board that
cannot open.** Pre-click, that is the designed state as of m47. It is recorded here so the absence
reads as a decision.

### DG-47-7 (RULED 2026-08-12 — answers ADR-014 §7 and its returned patch D) — region 5 admits only elements that can DEGRADE IN PLACE: the chip's tail leaves the row for its `title`, the page's grid is NOT re-cut to buy width back, and the committed mock settles region 5's GRAMMAR but not its FIT

**Where this comes from, and why it is numbered 7.** [ADR-014](ARCHITECTURE.md) (2026-08-12, Accepted)
re-derived every region-5 threshold from the grid's own floor row (`REGION5_ROW_FLOOR_PX = 286`) and
**returned two questions to this document rather than deciding them**. Both are answered here.
**Nothing in ADR-014's derivation is re-opened** — the budgets are the architect's, they are measured
against the real DOM, and "derived from the floor" is not negotiable. This gap rules on **membership**
(what may stand on the row at all) and on **whether the page's own grid is re-cut**, which are design
calls. ADR-014's returned patch proposed "a new §DG-47-6"; **that number is taken** by the OPEN
pre-click gap above and is cited seven times in this document, twice in [STATE.md](STATE.md), and once
in [47/01 task 00](stories/01_story_board-drill-in/tasks/00_board-link-resolved.feature). Verified at
source before this section was written — a hand-carried cross-document number that nothing checks is
this milestone's own recorded species of defect, and it will not be committed by the document that
records it.

**RULING 1 — the chip's `· <when> · <note>` tail is NO LONGER A MEMBER of region 5. It moves to the
chip's `title` outright: never on the row, always in the tooltip, in every state, at every width,
filtered and unfiltered alike.**

**The reason is a rule about the row, and it does not depend on the arithmetic.** Region 5 is the most
width-constrained row in the product, and every other occupant of it **degrades in place**: the
drill-in keeps its pinned `→` (DG-19), the secondary token keeps its glyph and its count (ADR-014
rung 3), the target truncates inside its own box (clause 5 + clause 6), and the workspace name's drop
is **unconditional and page-level** under a filter (DG-47-2). The tail is the one occupant with no
degraded form — DG-19 ruled out `· just…` — so its state set is exactly **{whole, absent}**, and an
element that can only appear or disappear makes its own presence a second signal for something the
operator cannot see: **the length of a node id**. That is DG-20's error read forwards, and ADR-014
refuses it one rung below for exactly this reason. **An element that cannot yield gracefully has no
honest place on this row; it belongs in the recovery channel the row already gives it.**

**The arithmetic makes membership a fiction rather than a tight fit, and it is ADR-014's own.** In the
three-child cluster the slot budget is **0ch**. In the two-child cluster it is **12ch**, of which the
tail is **10ch** (`· 18d ago`, 60.48px measured) and `→ ` is **2ch** — leaving **zero characters for
the node id**, and rung 4 (the target) outranks rung 1 (the tail), so the target takes the slot first.
Even the shortest tail the product mints leaves ≤1ch. **The tail and the target are mutually exclusive,
and the tail always loses.** A member that renders under no real string is a description of a
screenshot, which is the defect ADR-014 was raised to remove.

**And the committed mock draws it nowhere** — see RULING 3.

**Two alternatives rejected, each with the arithmetic that refused it.**
- **REJECTED: give the tail a degraded form** (`◷ 18d`, the house glyph-plus-count idiom). There is no
  width for it. At the floor the three-child cluster already needs **297px** of a **286px** row before
  the target gets one character, and in the two-child cluster the 12ch slot is claimed by `→ <target>`
  first. A new occupant on a row that is 11px over is not an idiom, it is an overflow.
- **REJECTED: keep it a member and let it render on the wide card** (438px at 1024). ADR-014 falsified
  viewport-keying by measurement — **1024 gives 438px, 1056 gives 286px** — and a per-container
  decision is unavailable until the geometry harness can measure boxes (ADR-014 §6). A member that
  renders at one viewport is the thing this whole ADR removed.

**What the operator loses, stated both ways, because a ruling that names only its winner is not a
ruling.**
- **By retiring it:** the assignment's **age and note leave the visible page**. They are carried
  nowhere else on the card — unlike the workspace name (R0's chip and R1's card) or the drill-in's
  words (`aria-label` + `title`, DG-47-5 clause 5). Recovery is the chip's own `title`, which already
  carries the whole string unconditionally
  ([AssignmentChip.tsx](../../../ui/src/fleet/AssignmentChip.tsx); `assign-affordance.mjs` says it in
  terms — *"the `title` still carries all of it"*). **No new mechanism is asked for.**
- **By keeping it:** nothing is gained on screen, because it cannot render; and the row's grammar
  becomes data-dependent for a reason no operator can read — two cards side by side in the same state
  with different chips. The contract also keeps a rung whose subject never appears, which is a clause
  no review and no lane can ever exercise.

**The residual, named with its close condition rather than glossed.** The chip is a non-focusable
`<span>`, so its `title` is **mouse-hover only** — unreachable by keyboard and by touch. The
assignment's age is therefore off the page for those operators, and this document will not pretend
otherwise. **Close condition:** a **visible** on-card home for the assignment's age, judged in the
next fleet milestone alongside DG-47-6, which needs card room for its remedy sentence for the same
reason. Region 6's own message slot is the first candidate the next milestone should **measure** — it
is named as a candidate, not ruled, because this document has no render of that row to judge, and a
home asserted without one would be the guess-dressed-as-a-fact this document refuses elsewhere. **A
review records this residual; it does not raise it.**

**This is a deliberate, test-updating decision of the same class as DG-47-2, and it is monotone in the
drop direction.** Nothing that renders today stops rendering: the tail does not render today, at any
measured width. So ADR-008's *"no budget is relaxed"* and ADR-014's *"nothing that drops today renders
after this change"* are both honoured — this is a tightening. **`REGION5_CHIP_SLOT_BUDGET_CH` keeps
its subject and must not be deleted**: rung 2 (the drill-in's words) fires on the same number. Only
rung 1's element leaves. The DG-19 tail lane is **amended, not removed** — *"no region-5 row renders a
`· <when>` tail at any budget"* is a stronger assertion than the one it replaces, and the ratchet's
*"gains lanes and loses none"* clause continues to bind. Whether the module keeps one name or two for
that number is the architect's.

**RULING 2 — the grid's track floor is NOT pulled. `minmax(320px, 1fr)` stands, and the floor-derived
row is accepted as it is.** ADR-014 recorded `minmax(382px, 1fr)` with its arithmetic and declined to
spend it. **The answer is no**, and the reasons are arithmetic on ADR-014's own measured table (this
document runs no browser and measures nothing new):

- **382 buys the TWO-child row only, which is not the case the finding is about.** Its floor row is
  `382 − 2 − 32 = 348`. Three-child base is **297px**, leaving **51px = 8ch** — and `→ aof-wsl`, the
  shortest target the mock itself draws, is **9ch**. So `Open board`'s words still drop in a
  three-child cluster at every width. Two-child leftover is 140px = 23ch, which does carry
  `→ umamis-mac-mini` (17ch).
- **The floor that WOULD carry the three-child row destroys the page the mock draws.**
  `297 + 102.83 (→ umamis-mac-mini) = 399.83px` of row → a **434px** track →
  `3 × 434 + 32 = 1334 > 1240`, so the milestones grid falls to **two columns at 1280**, where
  `mocks/filtered-fleet.png` draws three. **The lever cannot satisfy the frame that motivates it.**
- **And it changes the column count at two pinned render targets.** At **768** — the desktop-app proxy
  (the Rust window is 760×520) — the content column is 704px (ADR-014: 2 × 344 + 16) and two 382px
  tracks need 780, so the page drops to **one column**. At **1056** the content column is 992px and
  three 382px tracks need 1178, so a page that has three columns today gets **two**.

**If it is ever wanted, it is the PO's call, in the next fleet milestone that owns the milestone
grid** — with the whole grid re-mocked at 390/768/1280 **first**, because the frames this document
judges against draw a three-column 1280 and the lever changes them. **It is never a side effect of a
region-5 fix.** And the honest framing to hand over is that the three-child case needs 434px, i.e.
**a wider-card fleet with fewer columns**, not a track tweak.

**What makes the austere row acceptable, stated so a reviewer does not read it as neglect.**
1. **Nothing vanishes.** The drill-in's degraded form is its pinned `→`, in the same slot, at the same
   right edge, in the same primary token — the card's grammar is unchanged and the affordance still
   reads as navigation.
2. **The words have two channels DG-47-5 just built** — the button's `aria-label` and its mirrored
   `title`, plus the span's own `title`. Nothing is lost, only relocated.
3. **The fact that survives whole is the one the row exists to report** — `→ <target>`, who holds the
   assignment. ADR-014's own post-fix frames are the first in this milestone where the last thing to
   yield is the last thing to yield.
4. **The conservatism has a stated expiry** (ADR-014 §6): the day the geometry harness can measure
   boxes, the ladder is re-derived per container and the unused width comes back. Until then the trade
   is a rule that is right at every width at the cost of being generous at some.

**RULING 3 — what the committed mock SETTLES for region 5, and what it does not. This is the clause a
conformance review needs, and without it every review of R2 returns false GAPs forever.**

`mocks/filtered-fleet.png` and its source draw region 5 **five** times
([design-source.html](mocks/design-source.html) — the three cards of the 1280 frame, and the
unfiltered/filtered footer pair at a 360px card, captioned *"filtered — the repo name is removed;
nothing else changes"*). Every one of them is exactly `[assigned → <node>]` … `[Open board →]`,
right-aligned, with the muted mono repo name leading only in the unfiltered half.

- **The mock SETTLES:** the row's **order** (chip left, drill-in right), its **alignment** (the
  cluster leading, only the drill-in pushed right), its **tone** (the drill-in in the teal action
  token, the chip quiet and mono), the **name drop under a filter and that nothing else moves with
  it**, and the row's **one-line rhythm**. Those are DG-47-2's and A10's subjects and the mock is
  their source of truth.
- **The mock DOES NOT SETTLE membership.** [`mocks/PROMPT.md`](mocks/PROMPT.md) briefed region 5 as
  **three** things — repo name, assignment chip, `Open board →` — and repeats it for the filtered
  case. The shipped row has **five** occupants. The frames are a faithful drawing of the brief, so
  their silence about the tail and about the secondary token is **the silence of an unbriefed element,
  not a ruling to remove one**. A mock outranks the checklist for what it *drew*; it cannot delete what
  it was never shown.
- **The mock DOES NOT SETTLE fit.** [`mocks/README.md`](mocks/README.md) disclaims its own text
  metrics in terms — *"Judge layout, spacing and treatment against these frames; do not judge
  sub-pixel text metrics"* (Inter is absent on the capture machine) — and **whether `Open board` fits
  beside a 15-character node id is precisely a text-metric judgement**. The frames are therefore not
  evidence that the words survive at 1280, and ADR-014's measurement against the shipped stylesheet
  is. **The mock is not overruled here; it is read inside the limit its own README sets.**

**So a review must NOT return a GAP for any of these:**
1. **a card whose drill-in renders as a bare `→`** while `filtered-fleet.png` shows `Open board →`.
   That is the floor-derived ladder working (ADR-014), and it fires on any target over 12ch and on
   every three-child cluster;
2. **a card that renders `◔ N` or `✓`** where the frame draws neither. The secondary token **stays a
   member** — ADR-014 rung 3 — and the frames simply never carried it;
3. **a chip with no `· <when>` tail**, at any width. That is RULING 1, and it is what the frames draw;
4. **the assignment chip rendering as a toned pill plus a separate mono `→ <target>`** where the frame
   draws one grey box containing `assigned → umamis-mac-mini`. The brief described one chip; the
   shipped row's tone map (`runChipClasses`) and its two-element form are the settled DG-13…DG-22
   contract and this milestone re-decides neither.

**The close condition for the baseline itself, so this does not stand as a permanent asterisk:** a
**re-drawn region-5 frame** showing the three-child cluster in its abbreviated form
(`[● assigned][→ <long target>][◔ N][→]`) at 1280 and at 390, produced by re-running
`mocks/PROMPT.md` with the row's real occupants in the brief. It is a PO call and **not a blocker**;
until it lands, region 5's membership and fit are judged against ADR-014 and this section, and its
grammar against the frames.

**Close condition for this gap.** A render of the filtered fleet at 1280 and 390 in which: no card
shows a `· <when>` tail; the chip's `title` carries `→ <target> · <when> · <note>` in full; every
card's row is **one line** at 35px; the drill-in shows its pinned `→` in every state; and the
milestones grid is still **three columns at 1280 and two at 768**. The human verdict rides with
47/04's `@uat` row-relief lane — the one ADR-008 declared OWED and ADR-014's three post-fix frames
describe — with one clause added: *the assignment's age is reachable from the chip, and the reviewer
records whether hover is an acceptable channel for it.*

### Inherited from m45 — two carried gaps, and where each now lands

Neither is re-decided in shape; both fix shapes are already fixed in
[45/DESIGN.md](../45_milestone_ui-app-shell-routing/DESIGN.md) and this milestone must not re-open
them. What changed on **2026-08-10** is *where they close*, because ADR-006 deleted the affordance
this document used to point at.

- **DG-45-5** — the nav's *unavailable* treatment has no producer; 45 names *"the origin probe
  milestone 47 owns"* as the closer. This document previously closed it by pointing at the peer-board
  branch ([Fleet.tsx:1438-1447](../../../ui/src/fleet/Fleet.tsx#L1438)) as already shipping the
  wanted treatment. **ADR-006 deletes that branch**, and the description was wrong besides (it was
  never dashed and never `aria-disabled` — see DG-47-5's record correction). **The ruling is
  therefore SPLIT, and both halves have a home:**
  - the **treatment** half is re-expressed against the one drill-in that survives — the milestone
    card's — as **DG-47-5**, **closed in this milestone**, and fitted to the DG-13…DG-22 yield order
    ADR-008/DG-47-2 tables rather than bolted beside it;
  - the **producer** half (`resolvable`, the pre-click fact) is **carried** as **DG-47-6**, with the
    reason: no ADR here publishes it, and ADR-002 pins `src/` as un-edited by this milestone.
  - **DG-45-5 is not closed against a deleted affordance, and it is not silently dropped.**
- **DG-45-4** — one origin-mismatch language for every route. 45 expects it to close **with**
  DG-45-5; since DG-45-5's producer half is carried, **DG-45-4 travels with DG-47-6** to the next
  fleet milestone. Unchanged in shape, and it must not be half-closed here: one language across two
  surfaces is only checkable once both surfaces can produce the state.

---

## The two-narrowings ruling — `?scope=` and `?repo=` both stay, and they never look alike

**Decision: keep both**, per the PRD's recommendation, and record what keeps them non-confusable.
Whether `scope=local` is eventually retired is a PO/architecture call after soak; **this document
binds only what makes two narrowings legible while both exist.**

1. **Different shapes, and the difference is load-bearing.** `Global | Local` is a **segmented
   control** — a closed set of exactly two, both always visible, the active one filled
   `bg-primary text-primary-foreground` ([Fleet.tsx:342-362](../../../ui/src/fleet/Fleet.tsx#L342)).
   The repo filter is a **disclosure** — an open, data-derived set, one bordered trigger with a `▾`.
   A second segmented control would read as one setting with four values.
2. **One filled teal block per bar, and it is already spoken for.** m45 refused the segmented pill
   for the nav precisely to avoid three teal-filled blocks in one 48px bar (brand mark, active nav
   item, active scope segment). A teal-filled repo control would be the fourth. The picker's
   **selected row** therefore takes the switcher's existing `bg-primary/10 text-foreground` tint plus
   a `✓` — never a filled segment.
3. **Fixed order in the slot, left → right:** `[Global | Local]` · `[▾ <repo>]` · `◷ legend` ·
   `⟳ refresh`. The filter sits immediately right of scope because it reads as a **refinement of**
   the narrowing to its left; the two read as one narrowing group, then the two reader's-aids.
4. **Neither control changes form because the other is set.** No disabling, no dimming, no hiding —
   DG-20, again. If a repo filter makes `scope=local` redundant, that is an argument for retiring
   the parameter, never for greying out a live control.
5. **The banner states EVERY narrowing in force**, in the same order, so a page showing nothing names
   every reason it is showing nothing. That is what makes "the operator must always be able to see
   why" true when two narrowings compose. **The one exception is stated where it lives** — §Surface
   2's row **E3**, where no narrowing produced the nothing and the heading therefore names none;
   the banner still names both.
6. **And when the two narrowings have different REACH, the page says which one emptied what**
   (ADR-010). Scope narrows the work and never the roster; repo narrows both. So a composition can
   leave one region populated and another empty, and *that is intersection working, not failing* —
   but a page that shows the survivors without naming the cause is the idle-fleet defect wearing a
   different mask. The **partial-intersection notice (R0-N)** is where it is named, and it is a
   statement, never a control.

**The URL parameter's NAME is the architect's** (`?repo=`, `?workspace=`, …). This document uses
`?repo=` for prose only and binds nothing about it except that the **rendered** value is the
workspace **name** when it resolves and the **raw value, in `mono`,** when it does not.

---

## Surfaces

### 1 — The repo-filter control and the "filtered by" chip

- **Committed mock:** `mocks/filter-control.png` (+ `-768`, `-390`) — **PENDING**. Until they land,
  the checklist below is the baseline; when they land they supersede it wherever the two differ.

The control is a **disclosure**, not a segment and not a free-text box.

**Why a disclosure.** The option set is *data-derived and unbounded* — every workspace the payload
carries. A segmented control can only express a closed set (and would collide with scope's
vocabulary); a text input would ask the operator to type an id they can only get by reading the page,
and would invite a value nothing matches on every keystroke. A disclosure over the real roster is the
product's settled answer to this exact question — it is what the milestone switcher is
([BoardLanes.tsx:352](../../../ui/src/board/BoardLanes.tsx#L352)) and what m45's 390 nav collapse is
— and it makes an unknown filter reachable only by a hand-edited URL rather than by ordinary use.

**Why the option set is the payload's workspaces and nothing else.** A repo the mesh has never heard
of cannot be filtered to usefully, and a picker offering one would be inventing a target — the same
refusal `assignableNodeOptions` already makes for the node picker
([scope.mjs:252-256](../../../ui/src/fleet/scope.mjs#L252)): *no invented placeholder target*.

**What it shows at rest.** **`▾ All repos`** — never blank, never a bare funnel glyph, never absent.
"No filter" is a value the control states, not a state it expresses by silence.

**Where the "filtered by" chip lives, and why it is NOT in the bar.** The chip lives **in the page**,
as Region 0 of Surface 2 — directly below the chrome, above every region and above the state swap.
Three reasons, each measured:

- **The bar already says it.** The trigger's own label is the picked repo; a chip beside it would say
  the same word twice, ~40px apart. This is the m45 wordmark ruling's reasoning verbatim (*"a second
  word would say it twice"*).
- **The chip's job is to explain an empty page, and the page is where the emptiness is.** A statement
  that lives in the chrome explains the chrome. The banner sits at the top of the content region,
  where the operator's eye lands when the content is missing.
- **The bar has no room** — DG-47-4 is about exactly the 40px band at 390, and a chip would be the
  sixth thing in it.

**ADR-010's notice rides with the chip, wherever the chip is.** The ADR places the
partial-intersection notice *"beside the chip, in the shell's surface slot (ADR-007)"*; this document
places the chip in the page as R0 (above, and DG-47-1), so **beside-the-chip resolves to R0** and the
notice is specified there as **R0-N**. One rule, not two: if a later ruling moves the chip into the
slot, the notice moves with it in the same change, and neither is ever split from the other.

**How the filter is cleared, and how visible that is.** **Two doors, one of them always visible while
a filter stands:**

1. **An inline `✕` inside the chip itself** — the clear is *on the thing that says you are filtered*.
   It is a real `<button>` whose accessible name says what it clears (`Clear repo filter
   (lark-guard)`), never a bare glyph.
2. **`All repos` as the picker's first row**, above a separator — the switcher's own `All milestones`
   precedent ([BoardLanes.tsx:378-383](../../../ui/src/board/BoardLanes.tsx#L378)).

**A filter that can only be cleared from inside a closed menu is a hidden affordance**, and the
operator's recovery from it is reloading the page — which is why door 1 is mandatory and why the
empty and unknown states additionally promote a full **`Show all repos`** button.

**The scope chip carries no `✕`, and the asymmetry is deliberate.** Scope's control is *always
visible with both options showing*, so "clear" is already one click away in the bar; a second door
would be a second scope control. The repo's clear lives inside a closed popover, so it needs one.

**How a long repo name behaves** — the rules this surface's measured history (DG-13…DG-22) demands:

- **The label is the workspace `name` (falling back to `workspaceId`), never `projectRoot`.** A path
  is unboundedly long and belongs in the menu row and in `title`, never in a bar.
- **The trigger truncates with the full value in `title`** — and this truncation is safe *because the
  banner one region below renders the name IN FULL and never truncates*. That is DG-16's rule in its
  honest direction: an element may give way only where the fact it carries is spoken in full somewhere
  the operator can see.
- **[AMENDED 2026-08-11 (verify) — F-47-V-4. The superseded `ch` pair is recorded, not erased.]**
  **The trigger occupies a FIXED 150px slot at ≥640 (`sm`)** — `w-[150px]`, one constant both the
  trigger and its loading placeholder consume, spelled as a **literal** Tailwind's scanner can see.
  **Fixed, not a range**, and the reason is the first rule the committed baseline states
  ([`mocks/README.md`](mocks/README.md)): *"The filter button occupies a fixed 150px slot in every
  state, so no state change moves the scope control, the nav, or the bar."* **Below `sm` the trigger
  hugs its content, bounded by the residual the row has left** (`mocks/filter-control-390.png`):
  150px does not fit beside the scope control in a 358px band, and DG-47-4's two drops are what pay
  for the rest of that row. The residual is the layout engine's and never a transcribed number — see
  the binding checklist's *THE FIT BELOW `sm` IS A PROPERTY, NOT AN ARITHMETIC*.
  - **[CORRECTED 2026-08-13 (verify pass 3), F-47-V-21.]** This paragraph still read `≥768` / `≤390`
    after S1-B was amended to `≥640` / below-`sm` **on the same day**, leaving 391–639 undescribed
    here and the breakpoint mis-stated sixty lines from the row that governs it. **A checklist row
    and the prose that introduces it disagreeing about one constant is the same defect class as a
    checklist contradicting a mock** — whichever a reader reaches first is the one they build to.
    F-47-V-8 is this milestone's own record of that failure; this is it recurring inside the fix for
    it, which is why the amendment discipline is *"amended in the same change"* and not *"amended
    somewhere"*.
  - **Below `sm` the bar's geometry is data-keyed, and that is accepted there and nowhere else.**
    The slot is right-anchored, so a hugging trigger moves the scope control's left edge with the
    value's length. That is the price of hugging and it is exactly what the fixed slot exists to
    abolish: it is **not** a GAP below `sm`, and it **is** one at or above it.
  - **The withdrawn constant was `min-w-[calc(9ch+1.375rem)] max-w-[18ch]`**, and it is withdrawn for a
    measured reason rather than a stylistic one. Measured at verify: the trigger ran **82.0 → 119.9px**
    across four states at 1280 and **moved the scope control's left edge by 23.0px** — so it was never
    a reserved slot at all. And `max-w-[18ch]` computes to `119.918px` as a **border-box** maximum, so
    after `px-2.5` (20px), the border (2px) and the `▾`, the label ceiling was **~11 characters, not
    18** — visible as `whisper-gua…`, `not-a-real-…`. The **min** was corrected for border-box at m45
    (GAP-4); the **max** was not. *"This bar does not get to learn that twice"* was written directly
    above the class that had learned it once already.
  - The arithmetic remains **asserted, not claimed**: `test/fleet-filter-control.test.mjs` reads the
    constant, and a lane pins that the trigger's width does not move between states at ≥768.
- **The trigger never widens the bar.** Its ceiling is what keeps the right-anchored slot from
  growing leftward into the nav at 1280 and from overflowing the 40px band at 390.
- **The banner's chip wraps to its own line rather than truncating** at narrow widths, and it never
  produces a horizontal scrollbar (D1's backstop).
- **[ADDED 2026-08-11 (verify) — F-47-V-3.] The popover CLAMPS rather than overflowing the viewport.**
  Right-edge anchoring is kept wherever the popover fits; below that width it clamps to the content
  rail (`max-w-[calc(100vw-1rem)]`, left edge never nearer than 8px to the viewport edge) and its rows
  go on truncating inside the clamped box.
  - **This rule exists because the previous one produced the defect.** S1-C pinned right-edge
    anchoring at a fixed `w-72` with no clamp; applied literally at 390 that puts the popover's left
    edge at **x = −62.9** — measured — and because the page root is `overflow-x: clip`, D1's own
    backstop, the overflow is not scrolled to but **silently cut**. Every repo name lost its head
    (`isper-guard-portal`, `y-guard-portal`, `ce-vox-web`) with nothing on screen saying so, in the one
    control whose entire job is choosing a repo.
  - **The principle, stated so the next popover inherits it:** truncation announces itself and clipping
    does not. A control may shorten what it shows; it may not silently hide that it has.
- **The menu row is two lines:** the name (truncating within the popover's fixed width) over the
  `projectRoot` in `mono` at `text-[11px]`, truncating, with the full path in `title` — the exact
  form the Workspaces card already uses
  ([Fleet.tsx:472-474](../../../ui/src/fleet/Fleet.tsx#L472)).

**A filter naming a workspace the payload does not carry** takes the house's **absent/not-yet**
primitive — dashed, muted — in **both** places at once, so the bar and the page never disagree:

- the **trigger** renders the raw value with `border-dashed border-muted-foreground/40
  text-muted-foreground`;
- the **chip** renders `repo · <raw value>` in `mono`, same dashed treatment, `title` = *"No
  workspace with this id has published to the mesh"*;
- the **body** renders the `empty (unknown filter)` card (§Surface 2);
- **the address is not rewritten** and the value is not dropped.

It is **not** `accent` and **not** `destructive`. Nothing failed and nothing is broken — a filter
matched nothing, which is a true and ordinary answer. Dressing it as an error teaches an operator to
distrust their own address bar (m45's not-found reasoning, inherited). **The same sentence decides
DG-47-5's failed drill-in**: absent is not broken, and the two use one vocabulary.

**But the dashed form is earned by an UNNARROWED payload, and ADR-010 is why.** A payload the server
already narrowed to one workspace cannot establish that a value is absent from the mesh — it was not
served the mesh. So under a scope-narrowed payload (`workspaceId` set) the trigger and the chip stay
**neutral** and the page renders **E5**, not E4. The dashed mark says *"this mesh does not have it"*;
only a payload that saw the mesh may say that.

#### Binding checklist (mandatory — this IS the baseline until `mocks/filter-control*.png` land)

**Layout regions, in order (left → right within the slot; the slot itself is right-anchored):**

| # | Region | Where it lives | Width discipline |
|---|---|---|---|
| **S1-A** | **The slot's contribution**, in the fleet's own order: `[Global\|Local]` · **`[▾ <repo>]`** · `◷ legend` · `⟳ refresh` | shell **top bar** at ≥1024; shell **surface bar** at ≤1023 — the slot MOVES, its contents never change form | right-anchored, grows **leftward**, may never displace the nav |
| **S1-B** | **The trigger** — `▾` + label | inside S1-A, immediately right of the scope control | **`w-[150px]` at ≥640 (`sm`)** (a fixed slot: no state change moves the scope control, the nav or the bar — pinned as a MINIMUM as well as a maximum, since a max alone lets a short label hug and the control move), **content-hugging below `sm`, bounded by the space the row has left** (see the fit rule below); the `▾` is pinned to the box's right edge (`justify-between`); truncate + `title`. *(Amended 2026-08-11 (verify), F-47-V-4 — supersedes `min-w-[calc(9ch+1.375rem)] max-w-[18ch]`, which was a border-box maximum and let the slot move 23px. Amended again 2026-08-13 (verify pass 2): **the breakpoint moved `md`→`sm` (F-47-V-19)** because §Render breakpoints records the Rust desktop window as **760**×520 and `md` is 768 — the fixed slot never applied in the product's own window, and the 391–767 band was unpinned entirely. `sm` is a boundary this page already keeps (`px-4 sm:px-8`), so no new breakpoint is introduced. **The `▾`'s right-edge pin (F-47-V-20)** was drawn in `mocks/design-source.html:54` (`justify-content: space-between`) and unimplemented: measured, the caret tracked the label and sat 11 / 73.09 / 103.63px from the box's right edge across three states, so a correctly reserved slot still read as a wide button.)* |

**THE FIT BELOW `sm` IS A PROPERTY, NOT AN ARITHMETIC — and this rule exists because the arithmetic
was wrong twice.** *(Added 2026-08-13 (verify pass 2), F-47-V-18.)* The hugging half was previously
bounded by a ceiling computed by hand against the slot's other occupants. That derivation was
transcribed into a code comment, into this document and into a lane that re-checked it — and it used
**12px** for the row's gaps when the slot row (`Shell.tsx`'s `data-shell-slot` span) uses `gap-4` =
**16px**; 12px is the BAR's `gap-3`, one element up. Eight pixels. At its own ceiling the row needed
**365.73px in a 358px rail** and wrapped to 70px in two y-bands inside a fixed 40px `overflow: visible`
bar, drawing over the chrome above and the content below — DG-47-4's forbidden answer, reached through
the door its own arithmetic left open. **A ceiling can only ever be correct for the occupants it was
computed against, and it is recomputed by hand every time any of them changes.** So the rule is now
structural: the slot row is **`flex-nowrap`** (a wrap is not a degradation in a fixed-height bar — it
is an overprint), the trigger and its popover-anchor wrapper carry **`min-w-0`**, and the trigger takes
**`w-full`** below `sm` (a `<button>`'s `width: auto` is shrink-to-fit, so it otherwise overflows the
width its wrapper was already given). The layout engine then computes each width's residual —
measured 167.77px at 390, 92.73 at 480, 212.73 at 600 — and the label truncates inside it. **Any
`max-w` that remains is a SHARE cap** (so the trigger never eats half the bar when there is room), not
a fit guarantee, and must not be described as one. The occupants that must never yield say so with
`shrink-0`: DG-47-4 protects both narrowings in full, so the scope control and the two aids are pinned
and the trigger's **value** (never its label — see DG-47-4's F-47-V-22 clarification) is the sole
yielder.

**AND THE NEW FAILURE MODE IS NAMED, BECAUSE `nowrap` MOVED IT RATHER THAN REMOVING IT.**
*(Added 2026-08-13 (verify pass 3).)* A wrap announced itself: it drew over the chrome, which is ugly
and therefore catchable — it is how F-47-V-18 was found at all. Its replacement cannot. Once the
`shrink-0` occupants **alone** exceed the rail, a `nowrap` row has no wrap left to take, so it
overflows and the page root's `overflow-x: clip` **silently cuts it** — the same silent clip
F-47-V-3 found in the popover, one element up, and precisely what this surface's own principle
forbids (*truncation announces itself and clipping does not*). **So the fit rule carries a floor: at
every judged width, on every surface contributing to this bar, the slot row's `scrollWidth` must
equal its `clientWidth`, and the trigger's computed width must exceed its own caret plus padding.**
That is a measured assertion, not a screenshot judgement — a row four pixels over and a row that fits
are not distinguishable by eye. **The floor binds every surface, not the fleet:**
`Shell.tsx`'s `data-shell-slot="surface-bar"` is m45's shared row, and this change altered the
degradation mode of every surface's contribution to it at once.
| **S1-C** | **The popover** — rendered on the `popover` rung (`z-20`), anchored to the trigger's right edge **wherever it fits inside the viewport**, width `w-72`, `max-h-[60vh] overflow-y-auto` | out of flow, above the bar, below any toast | rows truncate **inside** it, never widen it. **Below the width where it fits, it CLAMPS to the content rail** — `max-w-[calc(100vw-1rem)]`, left edge never nearer than 8px to the viewport edge. *(Amended 2026-08-11 (verify), F-47-V-3.)* |
| **S1-D** | **The "filtered by" chip** — `repo · <name>` + `✕` | **NOT in the bar** — it is Region 0 of Surface 2 | full name, **never truncated** |
| **S1-E** | **The partial-intersection notice** — **NOT in the bar either**, for the same reason and one more (DG-47-4: a sentence has no discrete drop) | R0-N, beside the chips in the page | see §Surface 2 |

**Components each region holds:**

- **S1-A** — exactly four controls today, five with the filter. Nothing is added to it by this
  milestone beyond the filter, and nothing is removed. **The notice is not a sixth.**
- **S1-B** — one `<button>`: the label (`All repos` at rest, else the workspace name) and a muted
  `▾`. `aria-haspopup="listbox"`, `aria-expanded`, accessible name **`Filter by repo`** with the
  current value; never a bare `▾`; never a colour-only state.
- **S1-C** — a `role="listbox"` holding, in order: **`✦ All repos`** (first row, always present,
  `full fleet` as its right-aligned muted hint) · **a separator** (`border-t border-border`) · **one
  row per workspace on the payload**, in the payload's own order, each row = a mesh-enabled dot ·
  the **name** · the **`projectRoot`** on a second `mono` line · `role="option"` + `aria-selected`.
  The selected row carries **three** signals: a `✓` glyph (shape), `font-semibold` (weight) and the
  `bg-primary/10` tint (colour, last).
  - **[AMENDED 2026-08-11 (verify) — F-47-V-6.] The `✦` and the `✓` are TWO marks in TWO columns, and
    neither ever replaces the other.** The `✦` is the first row's **leading** mark and is present in
    every state; the selection `✓` lives in a **reserved trailing column** (`w-3`, rendered
    transparent rather than absent when unselected) so **no row shifts as the selection moves**. Built
    as shipped, selecting `All repos` swapped its `✦` for a `✓` — the row lost its identity mark at
    exactly the moment it gained a state mark, and the two facts were sharing one column.
    `mocks/design-source.html:222-226` draws both.
  - **Empty roster** (a payload with no workspaces): the trigger is **disabled** and reads
    `▾ All repos`, with `title` naming why (*"no workspaces have published to this mesh yet"*) —
    the `assignableNodeOptions` discipline: never an invented option, never a lying picker. It is
    **still rendered**, never hidden.
  - **Under `?scope=local` the popover lists the workspaces the payload carries — which is one.**
    That is correct and it is not a bug to report: the picker offers what it was served, never an
    invented option. It is also why an out-of-scope filter (E5) is reachable only by a hand-edited
    URL or a link pasted from a Global view, and why its copy must not read as an accusation.
- **S1-D** — see Surface 2, Region 0.
- **S1-E** — see Surface 2, R0-N.

**States — for this surface the four are the PAGE's four, because the control is present in all of
them:**

- **loading** — the trigger renders **in full, at its reserved width**, carrying the URL's filter
  value (which is known before any data is). Its **only** degraded element: while the payload has not
  landed, the label is the raw value in `mono` rather than the resolved name, in the **neutral**
  (not dashed) form. The picker is **disabled** while there is no roster to pick from, with `title`
  saying so. **The trigger never renders as a pulse block** — its value is known, and a skeleton
  would promise a fact that has already arrived.
- **error** — the trigger is **present, enabled and unchanged**. A failed load must never trap the
  operator inside the narrowing that may have caused it; clearing the filter must remain one click
  away. `⟳ Retry <Scope>` beneath keeps its existing label — see §Documented defaults 8.
- **empty** — the trigger is **present and unchanged**, in whichever of the five empty conditions
  applies (DG-47-3). In the **unknown-filter** condition (E4) it takes the dashed treatment; in the
  other four it does not — **including E3** (not yet resolved) and **including E5** (out of scope),
  each of which keeps the neutral raw-value form for its own stated reason.
- **populated** — the trigger names the active repo, or reads `All repos`. **This includes the
  partial intersection**, where the trigger is neutral and names the repo exactly as it does on a
  fully-populated page: nothing about the control changes form because one region emptied.

**In every one of the four states**: the control is present, in the same position, at the same
reserved width, with the same affordances. That is `acd-mesh-ui-scope-visible`'s obligation extended
to the second narrowing, and it is not negotiable.

**[ADDED 2026-08-11 (verify) — F-47-V-10(a). The POPULATED page whose filter value cannot be
resolved.]** *"The trigger names the active repo"* is unsatisfiable when the payload cannot name it —
the partial intersection under a server narrowing (`?scope=local&repo=<another repo>`) is a
**populated** page whose filter value is **unresolvable**, and until now this document covered it only
by inference. It renders exactly as **E5** does: **neutral box, never dashed, raw value in `mono`,
`✕` retained**, in the chip and the trigger alike.

It is **unresolved, not unknown**, and the distinction is the whole of ADR-010 clause 5: a client
served one workspace was not served the mesh and may not mark a value absent from a mesh it never saw.
**No third mark is invented for it** — a distinct *unresolvable-under-scope* treatment would be a
fourth chip vocabulary meaning something the client cannot assert, against rail 5's no-new-token
constraint. The cause is stated in **words** by R0-N one line below, which is what a special mark
would only gesture at.

**Its chip `title` reads *"This scope's payload does not carry this workspace"*** — the same
statement-about-the-payload E5 carries. **The resolved chip's id-in-`title` rule does not apply here**,
because in this form the id already *is* the visible value and a `title` repeating it says nothing.
No screenshot can assert a `title`, so this clause is pinned by an `@executable` lane, not by a design
review.

**Design ramp** — every token named from
[index.css:3-25](../../../ui/src/index.css#L3); **no new token, no hex, no new palette:**

| Element | Ramp |
|---|---|
| **Trigger, at rest** | The switcher shape at the slot's type size: `flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition hover:border-primary/50`, with the `▾` in `text-muted-foreground`. `text-xs`, **not** the board's `text-sm` — slot controls are `text-xs` (45/DESIGN §R2 type row). |
| **Trigger, filtered** | Identical, plus the label at `font-semibold text-foreground`. **No fill, no teal** — see §The two-narrowings ruling 2. |
| **Trigger, unknown filter (E4 only)** | `border-dashed border-muted-foreground/40 text-muted-foreground`, label in `mono`. The house absent/not-yet primitive. Never `accent`, never `destructive`. **Not used for E3 or E5.** |
| **Trigger, disabled (empty roster)** | `text-muted-foreground/60`, `aria-disabled="true"`, `title` naming why. **Focusable** — an item the keyboard skips hides its explanation from exactly the users who need it (45/a11y 4). |
| **Popover** | `z-20 w-72 max-h-[60vh] overflow-y-auto rounded-md border border-border bg-popover p-1 text-xs text-popover-foreground shadow-md` — the legend's popover ramp ([Fleet.tsx:379](../../../ui/src/fleet/Fleet.tsx#L379)) at the switcher's listbox width behaviour. |
| **Row, rest / hover** | `flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition hover:bg-muted` — `SwitchRow` verbatim ([BoardLanes.tsx:413-415](../../../ui/src/board/BoardLanes.tsx#L413)). |
| **Row, selected** | `bg-primary/10 text-foreground` + `✓` + `font-semibold` + `aria-selected="true"`. |
| **Row, second line** | `mono truncate text-[11px] text-muted-foreground`, `title` = the full `projectRoot` — the Workspaces card's own path ramp. |
| **Mesh-enabled dot in a row** | `h-1.5 w-1.5 rounded-full bg-primary` when enabled, `border border-muted-foreground/50` when not — [Fleet.tsx:476](../../../ui/src/fleet/Fleet.tsx#L476) verbatim. |
| **Type** | Inter for labels, `.mono` ([index.css:79-83](../../../ui/src/index.css#L79)) for every id and path. Hierarchy in the slot: **scope = filter > legend = refresh**. |
| **Motion** | **None.** No open/close animation, no fade, no slide. The only motion on this surface remains the `animate-pulse` that already exists on load placeholders elsewhere (and, per DG-47-5, on the drill-in's in-flight state — an addition, not an inheritance: F-47-04-QA-4). |

---

### 2 — The filtered fleet page

- **Committed mock:** `mocks/filtered-fleet.png`, `mocks/filtered-empty.png`,
  `mocks/filter-unknown.png` — **PENDING**. Until they land, the checklist below is the baseline.

The page **gains one region** (the banner, with its notice), **loses one** (Boards — deleted by
ADR-006, see the note under the frame) and **changes one column** (the milestone card's region-5
workspace name, DG-47-2), plus the treatment of the drill-in beside it in its failed state
(DG-47-5). Everything else narrows and says so.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ shell chrome — top bar (+ surface bar ≤1023). The slot holds the filter.     │  m45 R1–R3
├──────────────────────────────────────────────────────────────────────────────┤
│ Filtered by  [scope · Local]  [repo · lark-guard ✕]                          │  R0  ← new, DG-47-1
│ Local scope carries none of this repo's work — only the machines carrying it.│  R0-N ← ADR-010
│                                                                              │
│ WORKSPACES  1 of 7 workspaces                                                │  R1
│ MILESTONES  3 of 41 milestones                                               │  R2
│ NODES       2 of 5 nodes carrying this repo                                  │  R3
│ DIAGNOSTICS projection health is mesh-wide · skipped workspaces narrowed     │  R4
└──────────────────────────────────────────────────────────────────────────────┘
```

*(R0-N is drawn here to fix its position and weight. It is **conditional** — see its checklist entry
— and on an ordinary filtered page it is absent and zero-height, exactly as R0 itself is when no
narrowing is in force.)*

> **R4 Boards was REMOVED from this design on 2026-08-10 — recorded, not silently edited out.**
> [`ARCHITECTURE.md` ADR-006](ARCHITECTURE.md) deletes the fleet face's boards region in this
> milestone. The `boards` key has not been on the payload **this face** serves since m34/ADR-006 —
> the producer that computes the aggregate (`mesh:status`, via `boardsProjection` over the
> per-workspace registry) is not the one the face serves — so the local-shape branch
> (`BoardsRegion`, `BoardTile`, `boardRunState`, `BoardDrillIn`, and the `NodesRegion`/`NodeCard`
> pair beside it, ≈250 lines) has been **unreachable in production for two milestones**, and it goes
> along with the wire types that lose their last reader. **This design agrees with that ruling; it
> does not relitigate it.**
>
> An earlier draft of this section carried Boards as a live **R4** with a `1 of 4 boards · 1 running`
> summary, in the frame, in the summary table and in the binding checklist. That was **against the
> record**, and because no mock is committed the checklist *is* the conformance baseline — so it
> would have made a 47/03 build implement a summary for a region that does not exist, and made a
> design review return a GAP for the correct absence of a region the record removed on purpose.
>
> **The terms on which a boards region RETURNS are already set (ADR-006), so a later author meets a
> decision rather than a gap:** ONE producer or NO region — the fact is published into the **global
> projection** by `shapeGlobalStatus`, the same route `workspaces` and `nodes` take, and **never** a
> second read path inside the fleet face; **the row must carry `workspaceId`**, because a row this
> page's filter cannot narrow is ADR-004 case 3 and is refused at review; and `local` is re-derived
> at the global layer or dropped. When that lands, the regions are re-tabled **in the same change**
> and this note is what the amendment supersedes — a region number is a property of the rendered
> order, never a permanent address.

**Two numberings, and they are not one namespace.** `R0…R4` above are **page regions**. "**Region
5**" in DG-47-2 and DG-47-5 is the milestone **card's** fifth row — its footer — the one
DG-13…DG-22 fitness-lock; there is now no page R5, which removes the collision rather than creating
one. And `R4` in §Render breakpoints and in Documented default 13 is **m45's** shell region (the
content region), cited as *m45's R4* wherever it appears. **R0-N is not a sixth region** — it is a
line inside R0, and it is numbered that way on purpose so nothing reads it as a new band.

**R0 — the filter banner (new).** The one statement of every narrowing in force. It is **hoisted
above the loading/error/empty/populated ternary** (DG-47-1), inside a container that matches the
content rail exactly — `px-4 sm:px-8` and `mx-auto w-full max-w-[1240px]` — taking the rail's top
padding and **no bottom padding**, so the body branch beneath supplies the gap with its own existing
`py-7`. *The render judges whether that reads as one rhythm step; a visible double gap is a GAP whose
fix is here.* When no narrowing is in force the banner is **absent and zero-height** — never a
reserved blank band.

**Why the banner MAY be conditional when nothing else here may.** DG-20 forbids an absence that
becomes a covert signal. It does not bite here for one reason and it must stay true: **the control in
the bar states the filter's state at all times, in all four page states.** The obligation is
discharged there, which is precisely why *that* control may never be conditional and this banner may.
If the control were ever allowed to disappear, this clause would fall with it. **The same reasoning,
and only that reasoning, permits R0-N to be conditional** — it is an explanation of a condition, not
the statement of a narrowing, and the narrowings are stated unconditionally one line above it.

**"Narrowed consistently" — what it means per region, and the one PARTIAL exemption.** The narrowing
key is `workspaceId` for workspaces and items, and **membership** (`workspaceIds` includes) for nodes
([scope.mjs:162-170](../../../ui/src/fleet/scope.mjs#L162)). Membership is a *different relation* and
a shrunken node roster reads as *machines went away* unless the page says otherwise — so:

**Every narrowed region's header summary states the narrowing's effect on that region**, in the form
`<n> of <N> <noun>`, replacing the bare `<N> <noun>` head of the existing summary and leaving each
summary's own tail untouched. Nodes additionally names the relation. **Diagnostics is the one PARTIAL
exemption, and it says which half is which** — a projection error in another workspace is still why
*your* data is stale, so narrowing the projection's own health would hide a cause, while a
skipped-workspace count that ignored the filter would be a number about repos the operator is not
looking at. **An exemption that is stated is a design decision; an exemption that is silent is the
inconsistency the SPEC forbids — and an exemption stated more broadly than it is true is that same
defect wearing a label.**

| Region | Unfiltered summary | Filtered summary |
|---|---|---|
| **R1 Workspaces** | `7 workspaces` | `1 of 7 workspaces` |
| **R2 Milestones** | `41 milestones` | `3 of 41 milestones` |
| **R3 Nodes** | `5 nodes` | `2 of 5 nodes carrying this repo` |
| **R4 Diagnostics** | *(empty)* | `projection health is mesh-wide · skipped workspaces narrowed` |

**An EMPTIED region keeps its header and reads `0 of <N>` — it is never collapsed away** (ADR-010's
partial intersection made this reachable, and it needed a rule). On `?scope=local&repo=<another
repo>` the work regions narrow to nothing while the roster does not: R1 reads `0 of 1 workspaces`,
R2 reads `0 of 1 milestones`, R3 reads `2 of 5 nodes carrying this repo`. **A region that removed
itself because its count reached zero would make its own absence a second signal** — DG-20, exactly —
and it would take away the `0 of <N>` that tells the operator *which* narrowing emptied it. No
per-region empty card is drawn either: **R0-N explains it once, at the top**, and one fact has one
home.

**R3 carries no liveness tail, and the checklist says so because the old one did.** The production
region is `GlobalNodePanel`, whose summary is `${nodes.length} nodes`
([Fleet.tsx:974](../../../ui/src/fleet/Fleet.tsx#L974)). The `· N live · N stale · N offline` tail
belongs to the local-shape `NodesRegion` ([:1065-1069](../../../ui/src/fleet/Fleet.tsx#L1065)) that
ADR-006 deletes. A checklist that asked for the tail would GAP a correct build.

**R4's strip, fact by fact (ADR-004's completeness rule applied to the one compound region):**

| Fact in the strip | Under a filter | Why |
|---|---|---|
| `Projection: updated <t>` | **unchanged**, no `<n> of <N>` | `projectedAt` describes the projection, not any repo — case 3(a), machine-wide and declared |
| `<n> of <N> disabled/skipped workspaces` | **narrowed**, in the house `<n> of <N>` form | the rows carry `workspaceId` — case 1 |
| `<N> descriptor errors` | **unchanged**, no `<n> of <N>` | the rows carry a descriptor **path**, not a workspace — case 3(a) |

**R1 keeps its single card, deliberately.** A filtered Workspaces region renders exactly one card and
is **not** collapsed away: it is where `projectRoot` is carried in full, and it is the fact region
5's relief leans on (DG-47-2). Removing it to save a row would take away the thing that makes the
relief honest.

#### Binding checklist (mandatory — this IS the baseline until the mocks land)

**Layout regions, in order, and who owns scroll:**

| # | Region | Content | Scroll owner |
|---|---|---|---|
| **R0** | **Filter banner** — present whenever ≥1 narrowing is in force, in **all four** page states; absent and zero-height otherwise | one `Filtered by` label + one chip per narrowing, in the order **scope, then repo** | none — it is a content row |
| **R0-N** | **Partial-intersection notice** — one sentence, **inside R0**, on its own line beneath the chip row; conditional (see below) | the sentence and nothing else — no chip, no border, no control | none |
| **R1** | **Workspaces summary** | one card per matching workspace (exactly one under a repo filter; **zero** under a non-intersecting composition, header retained) | the page (`content:page`) |
| **R2** | **Milestones list** | one `GlobalMilestoneCard` per matching milestone; **region 5 per DG-47-2** (yield order) and **DG-47-7** (membership, and what the mock does and does not settle for this row), its drill-in per **DG-47-5** | the page |
| **R3** | **Nodes panel** | one card per node whose `workspaceIds` carries the repo — **this region survives a scope narrowing the work regions do not** (ADR-010) | the page |
| **R4** | **Diagnostics** | the strip, with its machine-wide facts unfiltered and its workspace-carrying count narrowed, and the header stating which is which | the page |

**There is no Boards region** (ADR-006) — and the arithmetic check for it is already in the tree: the
loading state reserves exactly **four** `RegionPlaceholder`s
([Fleet.tsx:1459-1479](../../../ui/src/fleet/Fleet.tsx#L1459)), matching R1–R4. Before this
amendment the checklist listed five regions against four placeholders, which is what a
region-by-region review is for. **R0-N adds no placeholder** — it is not a region and it never
renders in the loading state (there is no payload to have a partial intersection over).

The content mode is **`content:page`**, unchanged — the page owns scroll, no region owns its own, and
`overflow-x: clip` stays on the root.

**Components each region holds:**

- **R0** — `Filtered by` (`text-xs text-muted-foreground`) then, in order:
  - **scope chip** — `scope · Local`. A **statement, not a control**: no `✕`, not focusable, `title`
    carrying nothing the text does not already say. Present only when `scope=local`.
  - **repo chip** — `repo · <name>` with `<name>` in `font-semibold text-foreground`, plus an inline
    **`✕` `<button>`** whose accessible name is `Clear repo filter (<name>)`. The name renders **in
    full and never truncates** — this is what makes the trigger's truncation safe. **Its `title` is
    the raw `workspaceId`** — ADR-007 in terms (*the chip renders `workspace.name ??
    workspace.workspaceId` … with the id in `title`*), pinned here on 2026-08-11 because this
    document was silent where the ADR speaks, and the ADR wins. **The screen carries the NAME and the
    address carries the id, deliberately** — see the chip-carries-the-id ruling in the empty-state
    amendment note below.
  - **unknown-filter form of the repo chip (E4 only)** — same box, `border-dashed
    border-muted-foreground/40`, value in `mono`, `title` = *"No workspace with this id has published
    to the mesh"*, `✕` retained.
  - **not-yet-resolved and out-of-scope forms of the repo chip (E3, E5)** — same box, **neutral**
    (never dashed), value in `mono`, `✕` retained. E3 is DG-47-3's *not yet known is not not found*
    clause; E5 is ADR-010's twin of it — **a payload served one workspace may not mark a value
    absent from a mesh it never saw.** In E5 the chip's `title` reads *"This scope's payload does not
    carry this workspace"* — a statement about the payload, never about the mesh.
  - **Nothing else in the chip row.** Counts live in the region headers — one fact, one home.
- **R0-N — the partial-intersection notice** (ADR-010 clause 4; **new on 2026-08-11**):
  - **What it says**, pinned verbatim: **`Local scope carries none of this repo's work — only the
    machines carrying it.`** `Local` is `<Scope>`, the payload's own scope label
    (`scopeLabel(status.scope)`), which reads `Local` in every case this product can currently
    produce — the server narrows under no other scope.
  - **Why that sentence and not another.** It names **both** narrowings (`<Scope> scope`, `this
    repo`), says **which one emptied what** (the scope took the work), and says **what survived and
    why it is still relevant** (the machines that carry the repo — R3's own word for membership). It
    makes no claim the client cannot support: it does **not** say the repo has no work, only that
    this scope's payload carries none of it.
  - **It names no value, no region, no control and no position.** The repo is `this repo` because the
    chip beside it already carries the name and a data-derived value can be arbitrarily long
    (Documented default 8, the `⟳ Retry <Scope>` reasoning). *"the machines carrying it"* names a
    relation, not R3.
  - **Where it sits.** Inside R0, on **its own line beneath the chip row**, sharing R0's container
    and rail. Not inline among the chips: the chip row is a fixed grammar of narrowings that wraps
    predictably at 390, and a sentence spliced into it would make that row's wrapping
    data-dependent.
  - **Its weight, and how it can never be mistaken for a chip or a control.** `text-xs
    text-muted-foreground`, **no border, no background, no glyph, no `✕`**, not focusable, not a
    button, `mt-1`. The chips have a bordered box and a `font-semibold text-foreground` value; the
    notice has neither. **It is an explanation, and the only thing on this page that explains rather
    than states or acts.**
  - **When it renders.** Only when a repo filter is in force, the payload carries a **server
    narrowing**, the page is **populated**, and the work collections came back empty while the
    roster did not. **Exactly one of R0-N and the E5 card ever speaks**: same composition, different
    roster. *How the condition is derived is the architect's and 47/03's; what it says, where it sits
    and what it weighs is this table's.*
  - **It never becomes a rail, a banner, a toast or a second bar** (Documented default 13). One line,
    wrapping to two at 390, inside the content rail.
- **R1–R3** — exactly the components that render today
  ([Fleet.tsx:465-485](../../../ui/src/fleet/Fleet.tsx#L465), [:491-518](../../../ui/src/fleet/Fleet.tsx#L491),
  [:973-1040](../../../ui/src/fleet/Fleet.tsx#L973)), with **two** changes, both on the milestone
  card's footer row: its **region 5 drops the workspace name** under a filter (DG-47-2, with the
  exact yield order tabled there), and its **drill-in takes DG-47-5's treatment in the in-flight and
  failed states**. Card content is otherwise untouched — same status ring, same `StaleBadge`, same
  `StatusChip`, same progress track, same story dots, same assign affordance, same terminal control.
- **R4** — `DiagnosticsRegion` verbatim, plus the exemption in its `RegionHeader` summary (which is
  `""` today, [Fleet.tsx:1049](../../../ui/src/fleet/Fleet.tsx#L1049)) and the `<n> of <N>` form on
  the skipped-workspace count **only**.

**States (empty / loading / error / populated) — spelled out for THIS surface:**

- **loading (filtered)** — **R0 renders in full** (the filter is known from the URL before any data
  is), above the four existing `RegionPlaceholder`s
  ([Fleet.tsx:1459-1479](../../../ui/src/fleet/Fleet.tsx#L1459)), which are **unchanged**. The banner
  **never pulses**; the repo chip shows the raw value in `mono` in its **neutral** form until the
  name resolves, then swaps. That swap changes the chip's width and **moves nothing** — the banner is
  a full-width row with nothing downstream of it, which is exactly why the width discipline lives on
  the bar's trigger and not here. **R0-N is absent** — there is no payload to have a partial
  intersection over.
- **error (filtered)** — **R0 stays**, above the existing `ErrorState`
  ([Fleet.tsx:1489-1510](../../../ui/src/fleet/Fleet.tsx#L1489)), unchanged: the `accent` pill with
  its `!` mark, the mesh path, and `⟳ Retry <Scope>`. The narrowing survives an error because *"why
  am I looking at nothing"* applies to a failed load too, and because Retry must re-attempt **with
  the filter in force** — never silently clearing it, exactly as Retry never silently reverts the
  scope. **Never `destructive`.** **R0-N is absent.** *(A single card's failed drill-in is NOT this
  state — it never flips the page, and its own treatment is DG-47-5.)*
- **empty — FIVE distinguishable conditions (DG-47-3), all in the `EmptyFleet` card primitive
  verbatim** (`rounded-xl border border-dashed border-border bg-card/50 px-8 py-9 text-center`, the
  dashed `✦` tile, [Fleet.tsx:1517-1540](../../../ui/src/fleet/Fleet.tsx#L1517)) — same shape, five
  different true sentences, and **every combination the copy function can produce is pinned below**:

  **THE STRINGS — one row per combination the module can reach, nothing left for a build to
  author.** `<raw value>` is the value the operator typed, carried verbatim and rendered in `mono`;
  `<name>` is the resolved workspace name; `<Scope>` is `scopeLabel(status.scope)`. The discriminators
  are ADR-009's three-valued `resolved` (absent = not yet known · null = no such row · a string =
  known and quiet) **and** ADR-010's served narrowing (`status.workspaceId` — set when the SERVER
  narrowed, null when it did not).

  | # | Condition | Heading | Body | Recovery |
  |---|---|---|---|---|
  | **E1** | no filter · `scope: global` | `No mesh-enabled workspaces yet` | `No mesh-enabled workspaces have published yet. Enable mesh on a workspace (config.mesh.enabled) and it will appear here.` | the existing `config.mesh.enabled: true` chip |
  | **E2** | no filter · `scope: local` | `No nodes in the group yet` | `No nodes in the group yet. Enrol a machine to bring it onto the mesh.` | the existing chip |
  | **E3** | filter in force · `resolved` **absent** — no payload has landed · **any scope, any served narrowing** | `Nothing from the mesh yet` | `Nothing has arrived from the mesh yet, so whether it carries <raw value> is not yet known.` | **none** — see the ruling below |
  | **E4** | filter in force · `resolved` **null** · **NO served narrowing** (`workspaceId == null`) — the payload saw the whole mesh and carries no such row | `No repo matches this filter` | `Nothing on this mesh publishes as <raw value>. It may not have published yet, or the id may belong to another mesh.` | **`Show all repos`** |
  | **E5** | filter in force · `resolved` **null** · **a served narrowing IS in force** (`workspaceId` set) — the two narrowings do not intersect, and nothing survived | `Nothing matches <Scope> scope and this repo` | `<Scope> scope narrowed this view to one workspace, and <raw value> is not it. The two narrowings have nothing in common, and a view of one workspace cannot say what the rest of the mesh holds.` | **`Show all repos`** |
  | **E6** | filter in force · `resolved` **a name** — the repo is on the mesh and quiet · `scope: global` | `Nothing published for this repo yet` | `<name> is on the mesh but has published no milestones and no nodes. The rest of the fleet is still there.` | **`Show all repos`** |
  | **E7** | …the same · `scope: local` | `Nothing published in <Scope> scope for this repo yet` | *E6's body, unchanged* | **`Show all repos`** |

  **[ADDED 2026-08-11 (verify) — F-47-V-5.] `<raw value>` RENDERS IN `.mono` INSIDE THE BODY
  SENTENCE**, in E3, E4 and E5 alike — not only in the chip and the trigger. The committed
  `mocks/filter-unknown.png` draws it that way, and §Surface 2's own Type row already says *".mono for
  every workspace id, raw filter value and projectRoot"*; the body was the one place it was not
  applied. **The reason is not decoration:** the mono face is what marks the string as *the operator's
  own input* rather than the product's prose, and the body is the one place the value is read at full
  size. Measured at verify: at 390 the proportional rendering also broke the value mid-token across
  two lines, which is the same fact hurting legibility a second way. `<name>` in E6/E7 is a NAME, not
  a raw value, and stays in the prose face.

  **AND THE COMBINATIONS THE MODULE MAY NEVER PRODUCE — a review returns a GAP for any of them:**

  - **the E4 body under a payload that carries a served narrowing.** *"Nothing on this mesh publishes
    as X"* is a claim about the **mesh**, and a client served one workspace was not served the mesh
    (ADR-010 clause 5). It is the false statement QA measured, and it is the reason E5 exists.
  - **a composed E4 heading** (`Nothing matches <Scope> scope and this repo` attached to the
    unknown-value body). The composed nothing-state is **E5**, and its body is not E4's.
  - **a composed E3 heading.** E3 names no narrowing at all — see composition rule 4.
  - **any body that repeats another body verbatim.** E4's and E5's must differ **for the same raw
    value**: two "distinct" strings that only diverge because one happens to be shown `beta` and the
    other `zzz` are one rule wearing two coats, which is the defect ADR-010 clause 6 names.

  **THE COMPOSITION RULE — a rule for bodies, a table for headings, and the reason for each.**

  1. **A BODY VARIES BY CASE, NEVER BY NARROWING — six bodies for seven headings.** The body states
     the one thing that is true of the payload; where the scope is *part of that fact* (E2, E5) the
     body names it, and where it is not (E3, E4, E6/E7) the body is identical across scopes and the
     scope is carried by the heading and by R0's chip. **This is the rule that collapses the
     scope-crossed combinations without adding a string for each** — it is exact, it has no edge, and
     a reviewer checks it by reading two cells.
  2. **A HEADING NAMES EVERY NARROWING THAT PRODUCED THE NOTHING**, scope first, then repo —
     ADR-007's order, and R0's chip order. **`scope: "global"` is never named**: it is the default
     (m34/ADR-006), and announcing it would be announcing the absence of a narrowing.
  3. **THE HEADINGS ARE ENUMERATED, NOT DERIVED, AND THAT IS THE CHOICE.** No exact rule turns
     `No repo matches this filter` into `Nothing matches Local scope and this repo`: they are
     different sentences about different facts, not a stem and a suffix. A composition rule would
     need an exception, and its exception would be the one cell this document had already pinned — a
     rule with an exception is not a rule, it is a table with a preamble. Seven strings a reviewer
     can read beat a rule a developer has to guess the edge of.
  4. **E3 DOES NOT COMPOSE — the one heading that names no narrowing — and there are two independent
     reasons.** *(a)* In that state **neither narrowing produced the nothing**; the absence of a
     payload did. A heading naming the filter would assert a false cause, which is the class of error
     DG-47-3 exists to remove, arriving from the other direction. *(b)* Both the scope label and the
     served narrowing are read **off the payload** (47/02 task 02; ADR-010 clause 5); with no payload
     there is neither, so a composed E3 heading could only be built from the URL's guess — **a guess
     dressed as a fact**, which this document refuses for `controlNode` in DG-47-6 and refuses here
     for the same reason. The narrowings are still stated on the page in this state, in R0 and in the
     trigger, exactly as in the other four (DG-47-1).

  **HOW AN OPERATOR TELLS THESE APART AT A GLANCE — the *not yet known is not not found* clause and
  its ADR-010 twin honoured, not restated.** No two differ by a single word:

  | | R0's repo chip | the value on screen | recovery control |
  |---|---|---|---|
  | **E3 — not yet known** | **neutral** box, raw value in `mono` | the **raw value** | **none** |
  | **E4 — unknown to the mesh** | **dashed** box, raw value in `mono` | the **raw value** | `Show all repos` |
  | **E5 — out of this scope** | **neutral** box, raw value in `mono`, `title` about the *payload* | the **raw value** | `Show all repos` |
  | **E6 / E7 — quiet** | **neutral** box, the resolved **name**, id in `title` | the **name** | `Show all repos` |

  **E4 is the only one that earns the dashed mark**, because it is the only one whose payload saw the
  mesh. E3 has seen nothing; E5 has seen one workspace. **Absence is a claim, and only a view that
  could have observed the thing may make it.**

  **E3 PROMOTES NO RECOVERY CONTROL, and the reason is that the filter is not why the page is
  empty.** `Show all repos` would name a false cause, and taking it would land the operator on a
  *less* honest page: clearing the filter over a payload that never arrived renders **E1**, which
  says *"No mesh-enabled workspaces have published yet"* about a mesh nobody has heard from. The
  operator is not stranded — the picker and `⟳ refresh` are in the bar in **every** page state (rail
  1) — and the copy may not point at either of them: a sentence that describes its own presentation
  goes stale in the next redesign.

  **E5 DOES promote `Show all repos`, and it clears only the repo narrowing.** The scope the operator
  chose survives the clear (ADR-005; 47/03 task 02's clearing scenario, row 2) — a recovery that also
  reset the scope would silently widen the view past what they asked for, and they would have no way
  to tell which of their two narrowings the page discarded. It is the right control here precisely
  because the repo filter **is** half the cause, which is what separates E5 from E3.

  - **R0 stays above all five.**
  - The filtered-empty body names **milestones and nodes** — the regions this page actually has.
    Naming boards there would send the operator looking for a region ADR-006 deleted. **And "no
    nodes" stays true under a scope narrowing**: the roster the client holds is machine-wide
    (ADR-010), so zero surviving members is a fact about the whole roster and not an artefact of the
    scope.
  - The unknown-filter card's `✦` tile and card border take the **dashed** treatment they already
    have; the raw value renders in `mono`. **No `accent`, no `destructive`, no `!` mark** — nothing
    failed. **E3 and E5 take the primitive as it is** — neither has established an absence.
  - **The address is never rewritten** in any of the five.
  - **A named residual, so a review records it rather than raising it.** E1 is reached by the *same*
    `status: null` payload when **no** filter is in force, so an unfiltered page that has heard
    nothing still says *"No mesh-enabled workspaces have published yet"* — the very collapse of *not
    yet known* into *not found* that E3 exists to prevent, surviving one case over. Those two strings
    are shipped product copy, pinned unchanged by ADR-007 and by 47/02's executable lanes, and this
    amendment deliberately does not touch them. It is the **known residual of a closed gap**, not a
    new GAP, and it closes with a `resolved`-shaped answer for the unfiltered page in a later
    milestone.

  > **This table was AMENDED on 2026-08-11 — dated, attributed and recorded, exactly as ADR-006's
  > boards removal was, and not silently edited in.** It answers **two** inputs, and both are named
  > so a later reader meets the reasoning rather than the diff.
  >
  > ### (a) `F-47-02-QA-F3` — MEDIUM, design-gap: four producible combinations were unpinned
  >
  > QA's behavioural review of story 47/02 found that `emptyStateCopy(narrowings)`
  > ([scope.mjs:275-323](../../../ui/src/fleet/scope.mjs#L275)) necessarily produces **eight**
  > heading/body combinations — four cases, each composed with `scope=local` or not, because ADR-007
  > requires the heading to name every narrowing in force — and this table pinned **four**. The
  > developer therefore authored the other four at build. That is not the developer's error: **it is
  > this document's.** While no mock is committed the checklist IS the conformance baseline, so a
  > combination it leaves unpinned is one a review cannot judge and a build has no choice but to
  > invent — the one thing this document exists to prevent.
  >
  > - **E1, E2, E4 and E6 are unchanged, byte for byte.** Four of the seven rows are a transcription
  >   of what already shipped.
  > - **E3 IS REWRITTEN, and both of QA's objections to it are UPHELD.** As built it read
  >   `Nothing to show for this repo yet` / *"Nothing has arrived for `<repo>` yet — the first load
  >   has not landed."*
  >   - **On register: upheld, and it is worse than register.** The four pinned strings speak
  >     *publish, enrol, mesh, workspace, node* — not one of them names a request, a response or a
  >     load — so *"the first load has not landed"* would be the only sentence on this surface
  >     describing the client's own fetch machinery. And it is not reliably **true**: this state is
  >     reached with `loading === false` (47/02 task 02's own measurement — `pageState({ loading:
  >     false, error: null, status: null })` answers `empty`), so telling the operator a first load
  >     is pending asserts a mechanism that is not running. Copy states the fact; it does not narrate
  >     the transport.
  >   - **On the one-word distance: upheld, and the fix is a different SHAPE, not a different word.**
  >     `Nothing to show for this repo yet` sat one word from `Nothing published for this repo yet`
  >     — the exact pair DG-47-3's *not yet known is not not found* clause exists to keep apart, in
  >     the one transition an operator actually watches (a page settling). Swapping a word would have
  >     produced two sentences with the same skeleton and the same subject. **E3 now asserts about a
  >     different subject** (the mesh's silence, not the repo's quietness), **shows the raw value
  >     where E6 shows a name**, and **promotes no recovery control where E6 promotes one** — three
  >     marks, judgeable in a screenshot.
  >   - **E3 also COLLAPSES its composed twin instead of pinning an eighth string** — composition
  >     rule 4. The composed unresolved heading the build produces (`Nothing to show for this repo in
  >     Local scope yet`) is reachable only by a caller reading the scope from somewhere other than
  >     the payload, which 47/02's own contract forbids; pinning a string for it would have pinned
  >     copy for a state the product may not produce.
  > - **E7's WORD ORDER IS CORRECTED.** As built it read `Nothing published for this repo in Local
  >   scope yet`, naming the repo **before** the scope. ADR-007 fixes the order as *"scope, then
  >   repo"*, R0's chips run in that order, and E5 already reads that way — a heading running the
  >   other way would be this document pinning a string against the ADR its own §Conformance rule
  >   says wins. **No executable scenario reads that string**: 47/02 task 02 scenario 3's last row
  >   asserts the property (*"a heading naming BOTH the Local scope and the repo"*), which the
  >   corrected order satisfies, and 47/03 task 02 does not exercise the composed quiet case.
  >
  > ### (b) [ADR-010](ARCHITECTURE.md) — a FIFTH state, a corrected composed body, and a notice
  >
  > The architect ruled on 2026-08-11 that the server **never** narrows the node roster, so the two
  > narrowings have **different reach** and a composition can leave one collection populated and
  > another empty. Two consequences land in this table and one lands in R0-N.
  >
  > - **E5 IS A NEW STATE — OUT-OF-SCOPE — and it takes the heading that was already pinned here.**
  >   `Nothing matches <Scope> scope and this repo` was this document's composed exemplar and 47/03
  >   task 02 row 4 quotes it at the address `?scope=local&repo=<another repo>`. ADR-010 shows that
  >   this address is **not** the unknown case at all: the payload was scope-narrowed, so *"zero
  >   workspace rows survived"* collapses *the scope excluded it* and *the mesh does not have it*
  >   into one answer. The heading was always describing the **intersection**; ADR-010 simply gives
  >   it its true case. **It is unchanged, verbatim.** What changes is which condition selects it,
  >   and that the unknown-value body no longer travels with it.
  > - **E5's BODY IS NEW, and it is written here because ADR-010 clause 6 says the exemplar is
  >   DESIGN's to write** (*"an architect inventing product copy is the same error as QA doing
  >   it"*). It was measured **byte-identical to E4's**, which is both the false claim above and the
  >   reason the four-pairwise-distinct-bodies lane passed by value substitution. The new body
  >   satisfies each of ADR-010's requirements explicitly: it **names both narrowings** (`<Scope>
  >   scope`, and the raw value verbatim); it says the **intersection** is what is empty (*"the two
  >   narrowings have nothing in common"*) rather than either half; it **asserts only what the client
  >   holds** (*"narrowed this view to one workspace"*, *"a view of one workspace cannot say what the
  >   rest of the mesh holds"*); it makes **no accusation** against the value and offers **no invented
  >   remedy**; and it shares **no sentence** with E4 — the two differ for the *same* raw value,
  >   which is the gate the 47/02 contract now carries.
  > - **47/02 task 02 scenario 4's row 5 is the stale cell**, and ADR-010 says so in terms: it asks
  >   for *"a sentence … stating that this mesh carries nothing publishing as it"*, which is exactly
  >   the assertion clause 5 forbids under a scope-narrowed payload. **This document pins the
  >   replacement; the contract cell is the architect's and QA's to reconcile.** A review must not
  >   read E5's body as violating that cell — the cell is superseded, and the ADR names it.
  > - **The PARTIAL-INTERSECTION NOTICE (R0-N) is specified above, and it did not exist in this
  >   document before today.** ADR-010 assigns the build to 47/03 and deliberately does not draw it;
  >   drawing it is this document's job, and **47/03 cannot build what is not pinned.** Its sentence,
  >   its position, its weight, its conditionality and its prohibition against ever being a control
  >   are all in R0-N's checklist entry. **R0's old "one label, chips, nothing else" rule is amended
  >   by this change** — the exception is R0-N and only R0-N, and §Open questions 6 anticipated
  >   exactly this amendment being required before a second thing could enter R0.
  > - **The emptied-region rule** (`0 of <N>`, header retained, no per-region empty card, no
  >   collapse) is new for the same reason: the partial intersection is the first composition that
  >   can empty one region and not another, and an unpinned region rendering is an unjudgeable one.
  >
  > **The developer's change to `emptyStateCopy` is: three strings, one new discriminator, one
  > ternary collapsed** — E3's heading (its `composed ? … : …` becomes one string), E3's body, E7's
  > heading, plus the served `workspaceId` read as an input so `resolved == null` can select E4 or E5.
  > No new export, no sibling function, no new page state.
  >
  > ### (c) The chip-carries-the-id ruling — QA's residual observation, ruled rather than left open
  >
  > QA observed that in the quiet state an operator who typed a 16-hex `?repo=` id reads only the
  > resolved NAME in the sentence — *"lark-guard is on the mesh but has published no milestones and
  > no nodes."* — and cannot confirm from that sentence alone that their id resolved to the repo they
  > meant. **The division of labour is INTENDED, and 47/03's conformance pass judges it rather than
  > re-litigating it.**
  >
  > - **It is not quite the division the observation assumes.** The chip does **not** carry the raw
  >   id once the id resolves: ADR-007 has it render `workspace.name ?? workspace.workspaceId` **with
  >   the id in `title`**, and §Surface 1 pins the rendered value as *"the workspace **name** when it
  >   resolves and the **raw value, in `mono`,** when it does not"*. So in E6/E7 the raw id is on the
  >   page in exactly two places: the chip's **`title`** (hover / focus) and the **address bar**,
  >   which ADR-003 guarantees is never rewritten. **The screen carries the name; the address carries
  >   the id.**
  > - **That is intended, and the reason is ADR-003's own trade.** The URL was made opaque on purpose
  >   and *"the legibility that costs is repaid on screen by ADR-007's chip"*. Printing the id back
  >   inside the sentence would take the payment back: *"9db1fd84f5895e38 is on the mesh"* is *"true
  >   and useless"* (47/02 task 02's words). **And the operator's confirmation channel is the NAME,
  >   not the id** — an id that resolved to a repo they did not mean shows them **a name they did not
  >   expect**, which is a check a human can actually perform, where diffing sixteen hex characters
  >   against a clipboard is not. **A conformance review must NOT return a GAP for a quiet-state
  >   sentence that carries only the name.**
  > - **The one residual, named with its close condition rather than glossed:** two workspaces sharing
  >   a `name` are told apart only by `projectRoot`, which lives in the picker's rows and in R1's card
  >   — and **R1 does not render in an empty state**, so in E6/E7 the disambiguator is off screen. The
  >   close is one string and is deliberately **not** taken here: carry the `projectRoot` alongside
  >   the id in the same chip `title`. It is deferred because it widens ADR-007's `title` contract and
  >   nothing in this milestone produces the collision. **A review records it; it does not raise it.**

- **populated (filtered)** — R0, **R0-N when the composition is partial**, then R1–R4 with
  `<n> of <N>` summaries (a region the composition emptied keeps its header and reads `0 of <N>`),
  region 5 per DG-47-2, and any failed drill-in per DG-47-5. The shell adds no wrapper padding, no
  max-width and no background of its own; the surface keeps its own `px-4 py-7 sm:px-8` and
  `max-w-[1240px]`.

**Design ramp each region uses** — every token named from
[index.css:3-25](../../../ui/src/index.css#L3):

| Region | Ramp |
|---|---|
| **R0 label** | `text-xs text-muted-foreground` — quiet; the chips carry the emphasis. |
| **R0 chip** | The identity-chip form verbatim: `mono rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground` ([Fleet.tsx:289](../../../ui/src/fleet/Fleet.tsx#L289)), with the load-bearing value at `font-semibold text-foreground` (the treatment today's `Filtered to workspace <id>` line already gives the id, [Fleet.tsx:444](../../../ui/src/fleet/Fleet.tsx#L444)). |
| **R0 chip, unknown filter (E4)** | The same box with `border-dashed border-muted-foreground/40`; the value in `mono` at **`font-semibold text-foreground`**. The house absent/not-yet primitive (the `not-started` ring, the no-presence dot, `StaleBadge`'s dashed pill) carries the absence **in the BOX**; the value stays at full contrast. *(Amended 2026-08-11 (verify), F-47-V-7 — the committed mock puts it at `font-weight:600; color:#101828` and outranks this row, and a11y 8 agrees with the mock: "the word that carries the meaning is at full contrast even where the frame around it is quiet." The superseded text read `value stays mono text-muted-foreground`.)* |
| **R0 chip, not yet resolved / out of scope (E3, E5, and loading)** | The **rest** box, unchanged and **never dashed**; the raw value in `mono` at **`font-semibold text-foreground`**, by the same clause. The dashed form is a claim about a payload that saw the mesh, and neither of these did — but the *value* is load-bearing in every form. |
| **R0-N, the notice** | `mt-1 text-xs text-muted-foreground` — R0's own label ramp, on its own line. **No border, no background, no glyph, no fill, no `accent`, no `destructive`.** It is the quietest thing in the banner on purpose: the chips state the narrowings, the notice explains their combination, and an explanation that shouted would compete with the facts it explains. |
| **R0 clear `✕`** | `text-xs font-semibold text-primary hover:underline` — the product's link/action token, the same one `Open board →` and the landing's destination row use. |
| **`Show all repos`** (E4–E7) | `inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20` — the existing recovery-button ramp, `⟳ Retry`'s own ([Fleet.tsx:1500-1506](../../../ui/src/fleet/Fleet.tsx#L1500)). **Absent in E1–E3**, each for its own stated reason. |
| **R1–R4 region headers** | `RegionHeader` unchanged: `text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground` + `text-xs text-muted-foreground` summary. Only the summary's **words** change — including its `0 of <N>` form, which takes no different treatment from any other count. |
| **R1–R3 cards** | Unchanged — `rounded-lg border border-border bg-card shadow-sm`, the `status.tsx` ring/chip/dot ramp, `StaleBadge`'s dashed muted pill, the assignment chip's `runChipClasses` tone map. **No fleet-local chip system**, ever. |
| **Milestone card drill-in, at rest / in flight** | `font-semibold text-primary group-hover:underline` with the pinned `→` — unchanged at rest; in flight the same tokens plus `animate-pulse`, which DG-47-5 ADDS to this element — it has never carried motion (F-47-04-QA-4). |
| **Milestone card drill-in, board did not resolve** (DG-47-5) | `text-muted-foreground` + `border-b border-dashed border-muted-foreground/40` + `group-hover:border-solid` (and no `group-hover:underline` in this state), pinned `→` kept, words on the same abbreviation gate. The house absent/not-yet primitive spent **vertically**, so it costs no width. **Never `accent`, never `destructive`, never `aria-disabled`.** |
| **R4 diagnostics** | Unchanged — `rounded-lg border border-border bg-card/60 text-[11.5px] text-muted-foreground`. |
| **Empty cards** | `border-dashed border-border` + `text-muted-foreground` + `bg-card/50`; heading `text-[15px] font-semibold text-foreground`; body `text-[12.5px] leading-relaxed text-muted-foreground`. **One primitive for all seven rows** — E1–E7 differ in their words, their value form and their recovery control, never in their box. |
| **Type** | Inter throughout; `.mono` for every workspace id, raw filter value and `projectRoot`. |
| **Motion** | **None added.** The banner does not animate in or out, and neither does the notice; regions do not cross-fade as they narrow. The one motion on this page stays what it already is — `animate-pulse`, meaning *"something is happening now"* (the loading placeholders, and the drill-in while its resolve is in flight). A filter is a view, not an event. |

---

## Accessibility requirements (expected to be honoured)

The automated lane is opt-in per 07/ADR-004 and currently off
([acd-a11y-config-schema.test.mjs](../../../test/arch/acd-a11y-config-schema.test.mjs)), so these
bind the **design-conformance review and a `@uat` visual review** regardless.

**Carried from m45, unchanged and still binding on this surface:** **one `banner`** (the shell's top
bar), **one `<main>`** (the shell's content region — the fleet declares no second one), **one brand
mark in the bar**, a skip link as the first focusable element, `--color-ring` focus indicators, and
focus order following visual order (skip link → nav → **surface slot** → content). Nothing this
milestone adds may introduce a second landmark of any kind — **the banner is a content row, not a
region landmark**; if it ever needs a name it takes `aria-live`, never `role="region"`.

1. **The picker is a real disclosure over a real listbox** — `aria-haspopup="listbox"`,
   `aria-expanded`, `role="listbox"` / `role="option"` / `aria-selected`. `Esc` closes it and
   **returns focus to the trigger**; arrow keys move within it; `Home`/`End` reach the ends. The
   milestone-switcher pattern, inherited ([BoardLanes.tsx:362-363](../../../ui/src/board/BoardLanes.tsx#L362)).
2. **The trigger's accessible name says what it filters and what it is set to** — `Filter by repo,
   All repos` / `Filter by repo, lark-guard`. Never a bare `▾`, never a name that is only the value.
3. **Every clear affordance names what it clears.** The inline `✕` is a `<button>` with
   `aria-label="Clear repo filter (<name>)"`; `Show all repos` says it in text. A bare `✕` with no
   accessible name is a decorative mark pretending to be a control — the same defect
   `StaleBadge`'s `role="img" + aria-label` treatment already prevents.
4. **No filter state is ever colour-only.** *Filtered* is carried by the chip's **words**; *unknown*
   by a **dashed** rule plus a sentence plus `title`; *not yet known* and *out of scope* by their own
   sentences (E3, E5) rather than by any mark at all; *selected* in the menu by a **`✓`** plus
   **weight** before any tint. Colour is emphasis on top of shape and text, never instead of them.
   **The same rule is why DG-47-5's failed drill-in is dashed as well as muted** — muted alone would
   be colour carrying a state on its own, and at the abbreviated width it would be the *only* signal.
5. **The unknown-filter chip and a disabled trigger stay focusable**, with `aria-disabled="true"` and
   a `title` — never removed from the tab order. An element the keyboard skips hides its explanation
   from exactly the users who need it (45/a11y 4). **A failed drill-in is different and must NOT take
   `aria-disabled`** (DG-47-5 clause 4): it is still the retry.
6. **A filter change is announced without stealing focus.** The banner is `aria-live="polite"` (or
   `role="status"`), so the new narrowing is spoken while the operator's focus stays in the picker
   they are still using. **`role="alert"` is forbidden here** — nothing is wrong, and a rail reserved
   for genuine alerts must not be borrowed for a view change (45/a11y 13). A filter change is **not**
   a route change, so the m45 route-change focus move does not apply and must not be copied.
   **R0-N lives inside that same live region and takes no second one** — it is part of the same
   announcement, and it is why the notice belongs in R0 rather than beside the regions it explains.
7. **Target size ≥24×24 CSS px** (WCAG 2.2 SC 2.5.8) for the trigger, every menu row, the inline `✕`
   and `Show all repos` — achieved by each control's own padding, **never** by growing the 40px
   surface bar. **R0-N is exempt because it is not a target** — it is not focusable and it is not a
   control, and it must never become one.
8. **Contrast.** The chip reuses the identity chip's already-shipped `text-muted-foreground` on
   `bg-muted` combination, and the load-bearing value inside it is `text-foreground` — so the word
   that carries the meaning is at full contrast even where the frame around it is quiet. The
   selected row's `bg-primary/10` tint is **not** relied on for meaning (rule 4), so it is not
   required to clear a contrast bar on its own. **R0-N carries meaning at `text-muted-foreground`,
   so it must clear the body-text bar** — quiet is a weight decision, never a legibility one.
9. **The two drops at 390 keep their meaning** (DG-47-4): a control that gives up its words keeps the
   words in `title` **and** in `aria-label`, so nothing is lost to a screen reader by a visual
   collapse. **The drill-in's abbreviation is the same rule one level down** (DG-47-5 clause 1), and
   in its failed state the accessible name carries the remedy rather than the label.
10. **An empty state's heading and body are the whole message** — no fact that decides which of E1–E7
    an operator is in may live only in a `title`. The chip's `title` carries the raw id as a
    *confirmation* of a fact the sentence already states in its resolved form; it never carries the
    fact itself. **The same binds R0-N**: the partial intersection is explained in visible text, never
    in a tooltip.
11. **An accessible name is AUTHORED on the control, never on the element that merely looks like
    one.** The card's drill-in is a `<span>` inside the card's `<button>`: a `title` there is a
    tooltip, and an `aria-label` there is ignored outright, because ARIA prohibits naming a generic
    element. So the remedy is the **button's** `aria-label` with `title` mirroring it byte-for-byte
    (DG-47-5 clause 5), and the span keeps `title` only for the job DG-19 gives it — recovering the
    words the abbreviation drops. **Authoring that name replaces the one the button computes from its
    contents today**, and whether the card's facts stay reachable to a screen reader is on the human
    gate, not assumed here.

---

## Documented defaults (decided here, not blocking)

The PO can override any of these — and the operator's committed mock supersedes any of them on sight.
They exist so the build has no open question.

1. **The repo filter is a disclosure over the payload's own workspaces**, never a segmented control,
   never a text input, never an invented option.
2. **At rest it reads `▾ All repos`** — present, labelled and enabled in every page state; never
   blank, never hidden, never a bare glyph.
3. **The "filtered by" chip lives in the PAGE (R0), not in the bar**, and it is **hoisted above the
   state ternary** so it renders in loading, error, empty and populated alike (DG-47-1). **The
   partial-intersection notice rides with the chip** — ADR-010 places it beside the chip, and the
   chip is here.
4. **Clear has two doors: an inline `✕` on the chip and `All repos` as the picker's first row** —
   plus a promoted `Show all repos` in the filtered empty states that have a filter to blame (E4–E7).
   The scope chip carries no `✕`, because scope's own control is always visible with both options
   showing.
5. **The trigger truncates inside its slot with `title`; the banner's chip never truncates.**
   Truncation is permitted only where the fact is carried in full somewhere the operator can see it.
   The slot's width is **S1-B's** and this row pins no number of its own. *(Corrected 2026-08-13
   (verify pass 2). This default still read "truncates at 18ch" — a constant **withdrawn on
   2026-08-11** by F-47-V-4, which found `max-w-[18ch]` to be a border-box maximum whose real label
   ceiling was ~11 characters. The withdrawal amended S1-B and not this row, so for two days a
   documented default pinned a constant its own section had already retired. A default contradicting
   the section it summarises is the defect §Conformance source of truth names, arriving inside this
   document rather than against a mock.)*
6. **Under a filter, region 5 drops the workspace name unconditionally** and the row becomes the
   existing `nameDropped` geometry (DG-47-2). Deliberate, test-updating, and the one card-CONTENT
   change this milestone makes.
7. **Every narrowed region's header states `<n> of <N>`; Diagnostics is PARTIALLY exempt and says
   which half is which** — projection health is machine-wide, the skipped-workspace count narrows
   (ADR-004's compound ruling). A blanket "not narrowed by the filter" is not the copy. **A region
   the composition emptied reads `0 of <N>` and keeps its header** — it is never collapsed.
8. **`⟳ Retry <Scope>` keeps its existing label** — the filter is **not** appended to it. A control's
   label never carries a data-derived value that can be arbitrarily long; the banner directly above
   it already names every narrowing in force. **R0-N follows the same rule** and says `this repo`
   rather than the value.
9. **Five empty conditions, seven pinned headings, six pinned bodies — every combination
   `emptyStateCopy` can produce is pinned, and the ones it may never produce are listed** (DG-47-3;
   §Surface 2's E1–E7 table). Bodies vary by case and never by narrowing; headings are enumerated
   rather than derived; E3 names no narrowing; and `emptyStateCopy`'s two unfiltered strings are
   unchanged.
10. **An unknown filter is dashed-and-named, never `accent`, never `destructive`, and never silently
    dropped.** The address stands. **Not-yet-resolved (E3) and out-of-scope (E5) are NEUTRAL, never
    dashed** — the dashed mark is an assertion of absence, and only a payload that saw the mesh may
    make it (ADR-010 clause 5).
11. **Two whole discrete drops at ≤390** (DG-47-4): `⟳ refreshed Ns ago` → `⟳`, `◷ legend` → `◷`,
    both keyed to the viewport and taken together. The scope control and the repo filter are the two
    protected elements at every width.
12. **`?scope=` and `?repo=` both stay**, in different vocabularies, in a fixed slot order, and
    neither changes form because the other is set. **They have different REACH** (ADR-010), and where
    that shows on screen the page says so rather than leaving the operator to infer it.
13. **The banner adds no chrome bar and no rail.** It is content, inside **m45's R4** (the shell's
    content region); the 88px steady-state chrome budget is untouched. **R0-N is inside the banner
    and inherits the clause** — a notice that grew into a rail would be a GAP, not a variant.
14. **Nothing here animates** beyond the one motion the page already has (`animate-pulse` on loading
    placeholders, and — added by DG-47-5, not inherited — on the drill-in while a resolve is in
    flight, where it is the only thing separating that state from rest at the abbreviated width).
15. **There is no Boards region on the fleet** (ADR-006). The page's regions are **R0–R4**, and a
    render without a boards region **conforms**. The terms on which one returns are ADR-006's, not
    this document's.
16. **A drill-in whose board did not resolve is muted + dashed-underlined, keeps its pinned `→` and
    its abbreviation ladder, stays clickable and focusable, and names the REMEDY in its accessible
    name** (DG-47-5) — never `aria-disabled`, never `destructive`, and never taking width from the
    chip, the name column or the card (clause 1 is about demand, not occupancy: F-47-04-QA-5). Its
    accessible name is carried by the card's `<button>` (`aria-label` + mirrored `title`), never by
    the drill-in `<span>`, which can carry no name at all. The **pre-click** unavailable mark is out
    of scope here and carried as DG-47-6.
17. **The screen carries the NAME and the address carries the id.** A resolved repo is spelled by its
    name in the chip, in the trigger and in the sentence; the raw `workspaceId` rides in the chip's
    `title` and in the address, which is never rewritten. A sentence carrying only the name is
    **correct**, not a GAP (the 2026-08-11 chip-carries-the-id ruling).
18. **A partial intersection is EXPLAINED, never hidden and never forced empty** (ADR-010 clause 4).
    One quiet sentence in R0, the surviving region intact, the emptied regions keeping their headers
    at `0 of <N>`. The notice is an **explanation** — no border, no box, no focus, no control — and
    exactly one of it and the E5 card ever speaks.
19. **Region 5 admits only elements that can DEGRADE IN PLACE** (DG-47-7). Its occupants are the
    workspace name (dropped whole, unconditionally, under a filter), the assignment chip's
    `→ <target>`, the secondary token in its glyph-plus-count form, and the drill-in with its pinned
    `→`. **The chip's `· <when> · <note>` tail is not among them** — it lives in the chip's `title`,
    at every width. And **the page's grid is not re-cut to buy the row width**: `minmax(320px, 1fr)`
    stands, on the PO's authority in a later milestone if it ever moves.

---

## Open questions the operator's mocks will settle

Listed so the review knows which rulings above are provisional and what it costs if a mock differs.

1. **The control's form — a disclosure (ruled) vs a segmented control vs a search/typeahead.** The
   one open question with structural reach: a typeahead changes the empty-roster state, the unknown
   value's likelihood and the a11y contract wholesale. If the mock shows one, this document is
   rewritten, not patched.
2. **Where the "filtered by" chip lives** (ruled: in the page, R0). A mock that puts it in the bar
   costs DG-47-4 another ~90px at 390 and needs a third drop decided here first — **and it moves
   R0-N with it**, because ADR-010 puts the notice beside the chip and the two may never be split.
3. **Whether the picker's rows carry `projectRoot`** (ruled: yes, second line, mono, truncating).
   Cheapest thing in this document to change; it is the only disambiguator when two workspaces share
   a name — and see E6/E7's named residual, which is the one state where it is off screen.
4. **Whether the banner shows counts** (ruled: no — counts live in the region headers). A mock that
   puts a total in the banner duplicates a fact and needs the region rule re-decided with it.
5. **Whether region 5 keeps the name under a filter** (ruled: dropped, DG-47-2). A mock that keeps it
   is a legitimate override — and it is the **cheaper** answer, because it changes no test.
6. **Whether the unknown-filter state is a page state or an inline banner** (ruled: a page state, the
   `EmptyFleet` card with its own copy). A mock showing an inline strip instead would put a second
   thing in R0 and needs the banner's "one label, chips, nothing else" rule amended. **That rule HAS
   now been amended, once, for R0-N** (ADR-010) — which is the precedent and also the ceiling: R0
   holds the narrowings and one explanation of their combination, and nothing else.
7. **Dark mode.** Unchanged from m45: this milestone ships the light ramp that exists and adds no
   token. A dark mock is a theme decision beyond this milestone and comes back as its own design gap.
8. **The failed drill-in is NOT among the frames asked for.** `mocks/PROMPT.md` requests no
   failed-card frame, so DG-47-5 is judged against §Surface 2's checklist and the `@uat` lane in
   47/01's task 00. A mock that draws it supersedes the checklist for that element on sight; the
   absence of one is not grounds for `INCONCLUSIVE`.
9. **A boards region is NOT an open question.** ADR-006 deleted it and set the terms for its return;
   a mock that draws one does not reinstate it — it is a mock drawn against a superseded page, and
   the record wins.
10. **E3 is NOT an open question and NOT a frame.** No address produces it, `mocks/PROMPT.md` asks
    for no frame, and its strings are pinned above. A mock that draws a fourth empty card supersedes
    the checklist for it on sight; the absence of one is not grounds for `INCONCLUSIVE`.
11. **`mocks/PROMPT.md` PREDATES ADR-010** and asks for three empty frames (a, b, c) matching E1, E6
    and E4. **E5 and the partial intersection are not in the brief**, so no frame will arrive for
    either unless the brief is re-run; both are judged against this checklist, and their absence is
    not grounds for `INCONCLUSIVE`. Re-running the brief to add them is a PO call, not a blocker.

---

## Behavioural outcomes (cross-reference)

The user-visible BEHAVIOUR belongs in the task features, **not here**. This document fixes the look
and feel; the features fix what happens.

**Feature paths, re-checked 2026-08-10.** `stories/` now exists — `aof:refine 47` has run since this
document's first draft, and four stories are written — so an outcome below names a real file where
one exists and stays unplaced where refine has not written one yet. (The earlier note that no story
existed is superseded; it was true when this document was first written and is not now.)

- **The filter narrows every region by the same key, in one pass** — workspaces, milestones and nodes
  alike, and there is no boards region to narrow (ADR-006) — while Diagnostics' machine-wide facts
  are exempt **by rule rather than by omission** and its workspace-carrying count narrows with
  everything else. *(The visible half is §Surface 2's `<n> of <N>` summaries; the narrowing itself is
  behaviour.)*
- **The filter composes with `?scope=` rather than replacing it**, survives a refresh, survives a
  manual `⟳`, survives the poll, and is carried by the `/fleet` nav item — the same contract
  `?scope=` already has.
- **The two narrowings have different REACH, and the composition is per collection** (ADR-010): the
  server never narrows the roster, so a repo filter is the first narrowing it receives and a
  composed view can render member machines with no work above them. *(The visible half is R0-N and
  the `0 of <N>` headers; which rows survive is behaviour, and it is the architect's ruling.)*
- **Picking a repo, and clearing it, update the URL** — and clearing returns the operator to the
  unfiltered view without a reload.
- **A filter naming a workspace the payload does not carry keeps its address** and renders the named
  state; it is never silently dropped and never rewritten.
- **The picker's options are producer-fed from the real payload** — no invented option, and an empty
  roster disables rather than fabricates.
- **Which empty state is reached, and from what** — the three-valued `resolved`, the filter-aware
  emptiness question and the served-`workspaceId` discriminator are ADR-009's and ADR-010's, and are
  exercised headlessly by
  [47/02 task 02](stories/02_story_repo-filter-model/tasks/02_scope-composition-and-copy.feature) and
  [47/03 task 02](stories/03_story_filtered-fleet-surface/tasks/02_honest-empty-states.feature).
  *(This document owns only WHICH WORDS each state says and how it is dressed — §Surface 2's E1–E7
  and R0-N.)*
- **No board destination on the fleet is a relative href** — every one is minted at click time by the
  one resolver, `GET /api/mesh/board-url`
  ([47/01 task 00](stories/01_story_board-drill-in/tasks/00_board-link-resolved.feature)) — and the
  local-shape branch that carried the relative href is deleted with its region
  ([47/01 task 01](stories/01_story_board-drill-in/tasks/01_unreachable-boards-branch-deleted.feature)),
  so m45/STATE F-45-04-1 (a) and (b) close together.
- **A drill-in whose board does not resolve states the failure on its own card, and the card stays
  usable** — the treatment is DG-47-5 and the human verdict is 47/01 task 00's `@uat` scenario. Two
  design intents ride on that behaviour and are stated here so the scenario is not read as covering
  them: the mark must **survive a background poll** (a state the operator produced by clicking is not
  erased by a clock tick), and a card's failure must **never** flip the page's own error state.
- **A card whose board can never resolve is an ORDINARY operator state, not an error** — it is the
  cross-machine projection's normal consequence, pinned behaviourally in 47/01 task 00's refusal
  outline. Its *post-click* treatment is DG-47-5; its *pre-click* treatment is deliberately out of
  scope and recorded as **DG-47-6**.
- **`@uat` visual review — the filtered fleet reads as one narrowing, honestly stated**, judged
  region by region against `mocks/*.png` where committed and against this document's binding
  checklists everywhere else. This is where DG-47-1…DG-47-5 each get their human verdict, and it must
  include the **four URL-reachable empty conditions** (E1, E4, E5, E6/E7 — **E3 has no address that
  produces it**, §Conformance source of truth), **the partial intersection with its R0-N notice**,
  the 390 drops and the failed drill-in at both widths.
