---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: what was checked, by whom, with what evidence?
  Owner: the verify session (the PO/orchestrator). Evidence agents REPORT; they do not author here.
  Findings are triaged into STATE.md `## Feedback (for retro)` and TECH_DEBT.md, not restated.
-->
# 47 · /fleet with a repo filter — Verification

## Method

Verified 2026-08-11 (`aof:verify 47`) against a **live, deployed build** — not a fixture. The desktop
supervisor was relaunched by the operator at the verify session's request; `:4181` served payload
`7400664+dirty.20260811T211128`, whose UI bundle was built at 20:11:26Z, **after** `Fleet.tsx`'s last
write at 18:05:47Z. That retires STATE's standing *"the render is owed"* caveat: the page judged below
is this milestone's code, not its predecessor's.

Test isolation was `AOF_GLOBAL_HOME` throughout, per-lane hermetic, via a focused file-driver rather
than `scripts/test.mjs` — the full suite binds `:4182`, which the live control daemon holds.

**Every count and every measurement below was executed by the verify session, not accepted from a
report.** The design verdict came from `aof-designer` (read-only, handed screenshots — it does not run
a browser); its two HIGH findings were then re-confirmed by the verify session directly from the
renders, and its one numeric claim (the slot width) was independently measured. That is deliberate:
this milestone's retro is about claims asserted rather than executed, and a verification that relayed
its agents' findings would be the same defect wearing a different hat.

## Verification evidence

### `@executable` — behavioural suites

Re-run on an unedited tree, one hermetic global home per lane.

| suite | story | result |
|---|---|---|
| `fleet-board-drill-in` | 47/01 task 00 | **16 / 16** |
| `fleet-boards-branch-deleted` | 47/01 task 01 | **22 / 22** |
| `fleet-scope` | 47/02, all three tasks | **48 / 48** |
| `fleet-narrowing-seam` · `fleet-filter-control` · `fleet-empty-states` · `fleet-filter-address` | 47/03, all four tasks | **7 · 7 · 6 · 5 = 25 / 25** |
| `fleet-assign-row-geometry` | 47/04 | **22 / 22** |
| `fleet-assign-affordance` · `shell-regions` | inherited, unbroken | **6 · 16** |
| `in-app-cross-links` · `mesh-ui-read-only-contract` | ADR-002's read-only invariant | **5 · 5** |
| **total** | | **165 / 165** |

STATE's last recorded figure was 155/155 behavioural; the two read-only/cross-link suites are the
difference, and they are green untouched — which is ADR-002's own claim (`src/` is not edited by the
filter) holding at the gate that would catch it.

### Fitness functions

| gate | result |
|---|---|
| `acd-fleet-filter-single-home` | **3 / 3** |
| `acd-fleet-filter-every-region` | **7 / 7** |
| `acd-fleet-filter-read-only` | **3 / 3** |
| `acd-fleet-board-link-resolved` | **5 / 5** |
| `acd-mesh-ui-scope-visible` | **3 / 3** |
| `acd-ui-surface-file-budget` | **8 / 8** |
| `acd-rendered-component-fed-by-route` | **4 / 4** |
| `acd-no-surface-mode-url-literal` | **4 / 4** |
| `acd-route-logic-framework-free` (m45 invariant, must stay green untouched) | **5 / 5** |
| `acd-test-suite-registration` | **2 / 2** |
| `acd-roundtrip-registration` | **1 / 1** |
| **total** | **45 / 45** |

**`acd-test-suite-registration` is green, which closes F-47-01-ARCH-F7** — STATE records it RED on
three unregistered milestone-48 suites. Measured here: registered. The finding is closed by the m48
agent having acted, not by this milestone.

### Other gates

- `npx tsc -p ui/tsconfig.app.json --noEmit` — **exit 0**
- `aof work validate` — **PASS — work stream is well-formed.**

### `@manual` — the one agent-runnable human-lane scenario

**verifies →** `@manual "in a real browser the filter is a real navigation, and a shared link opens
the same view somewhere else"` (in `03_story_filtered-fleet-surface/tasks/03_deep-link-and-survival.feature:262`)

Environment: the live fleet at `http://127.0.0.1:4181/fleet`; two genuinely separate Chromium
profiles (distinct `--user-data-dir`), driven over CDP. `npx playwright` is policy-blocked on this
machine and the `playwright` package is not installed, so the cached Chromium is driven directly —
the same path `mocks/README.md` records for the baseline frames.

Procedure and result, clause by clause:

| clause | procedure | result |
|---|---|---|
| Back walks the three states, re-narrowing at each step **without a reload** | pick repo A → pick repo B → clear; then `history.back()` ×3 with a 6s settle, a `popstate` counter installed in the page, and a `window` sentinel proving no document reload | **FAIL — F-47-V-1.** The address walks correctly (`?repo=dea6…` → `?repo=9db1…` → `/fleet`) and the sentinel survives, so it *is* an SPA navigation; `popstate` fires (counter 1, then 2). The page **never re-narrows**: chip, trigger and every `n of N` keep naming the previous repo. |
| Forward walks them again | `history.forward()` ×3 | **FAIL** — same cause |
| no step produces a state the operator never asked for | — | **FAIL** — after Back the URL names `aof` while the page renders `vista-app-web`. This is precisely the clause. |
| the filtered address opened in a **second browser profile** renders the same narrowed view, same repo in banner and picker | open `…/fleet?repo=9db1fd84f5895e38` in a second profile | **PASS** — identical: chip `repo · aof ✕`, trigger `aof▾`, `1 of 6 workspaces`, `45 of 114 milestones`, and the picker marks `✓ aof` selected |
| a link built on a **renamed** workspace still resolves (ADR-003's whole argument) | rename + republish, two sessions | **NOT RUN — genuinely human.** Unchanged in classification. |

A full reload of the same address renders correctly, so **the address contract itself is sound** — the
defect is confined to the in-page response to a history navigation.

### Agent-run — the keyboard, focus and geometry facts the `@uat` lane was carrying

**verifies →** `@uat @design "a keyboard pass over the picker behaves like the disclosure the product
already ships"` (in `03_story_filtered-fleet-surface/tasks/01_filter-control-and-chip.feature:319`)

STATE records QA's standing objection that this lane is **over-classified as human** — its clauses are
*"DOM facts Playwright can measure, not conformance judgements"*, justified as human only because the
a11y lane is off, which is the wrong reason. `aof-qa` was spawned to measure them. It did, with real
`Input.dispatchKeyEvent` presses rather than synthetic clicks, **with the a11y lane still off and no
axe-core run** — which is itself the proof that the justification was wrong.

| clause | measured | verdict |
|---|---|---|
| the trigger sits in the slot's own place in the focus order | Tab 1 `Skip to content` → 2–5 nav → 6 `Global` → 7 `Local` → **8 the repo trigger** → 9 `Refresh` → 10 first card | **PASS** |
| `Esc` closes the popover and returns focus to the trigger | popover stays mounted, `aria-expanded` stays `"true"`; key arrives and is not `preventDefault`ed | **FAIL — F-47-V-12** |
| arrow keys move within the rows; `Home`/`End` reach the ends | active option never changes; the **document behind scrolls instead** — `End` takes it to **11418px** while the picker stays pinned | **FAIL — F-47-V-13** |
| `Enter`/`Space` on an option applies the filter | both write `?repo=<id>` and close the popover | **PASS** |
| every named target ≥ 24×24 CSS px | trigger 87.9/82.0/119.9 × **26**; `All repos` row 278 × **28**; repo rows 278 × **42.7**; `Show all repos` 113.2 × **30** — all pass at 1280 *and* 390. The chip's inline clear: **9.81 × 16** | **FAIL — F-47-V-14** |
| the popover's width / max-height / overflow | `288px`, `max-height 540px` (=60vh), `overflow-y auto`; at 1280 x=727..1015 inside; **at 390 x = −62.9**, and `scrollWidth == clientWidth`, so the clipped band is unreachable | 1280 **PASS** / 390 **FAIL** (corroborates F-47-V-3 with a number) |
| a focus indicator exists on trigger, rows and clear | all compute the UA default `outline: auto 1px`; no authored `--color-ring`; `:focus-visible` matches | **present**; whether it is *visible enough* stays a designer judgement |

**The verify session re-ran the three that decide the outcome**, independently of QA's harness, and
got identical results: `Escape` → `open:true, expanded:"true"`; a real outside mouse click → still
open (focus moved to a `<select>` in the page while the listbox stayed mounted); `End` → `scrollTop`
0 → **11418**, picker still open; inline clear → `9.81 × 16`, `padding: 0px`, `meets24: false`.

**Two clauses were NOT-MEASURABLE and are honestly recorded as such**, not counted either way: the
disabled empty-roster trigger (needs a fabricated payload — the live mesh cannot produce an empty
roster, the same fact that makes E5/E6 unreachable), and *"like the disclosure the product already
ships"* as a comparison, because `:4181/board` answers *"Mesh API route not found"* and exposes no
`[aria-haspopup]` trigger to compare against — the board is a separate per-workspace server.

**The lane's classification is settled by the measurement: six of its seven clauses are DOM facts.**
Only *focus-indicator visibility* and *whether a screen reader actually speaks the live region* remain
human. That is a concrete, earned shrinking of this milestone's `@uat` set — and it is routed as such
below rather than left as an observation.

### Design conformance — **GAPS**

No longer `INCONCLUSIVE`. Both halves of the baseline now exist: the mocks were committed 2026-08-11,
and the render was taken here. 16 frames captured off the live build at 1280 / 768 / 390,
deviceScaleFactor 2, each verified to carry a PNG `IEND` terminator before use (the truncated-baseline
lesson this milestone already paid for), then handed to `aof-designer` to judge against `mocks/` +
DESIGN's binding checklists.

**CONFORMS** — and these are the milestone's substance, so they are recorded as evidence rather than
assumed: the chip row hoisted to R0 above the state ternary and present in populated *and* empty
states (ADR-012 / DG-47-1); absent with zero height when unfiltered, no reserved band; chip grammar
`Filtered by [scope · Local] [repo · <name> ✕]` with scope first and no `✕` on the scope chip; region
order **R0 · R1 Workspaces · R2 Milestones · R3 Nodes · R4 Diagnostics** — four regions, no Boards
(ADR-006); every region's `n of N`; emptied regions keeping their headers at `0 of <N>` with no
per-region empty card; Diagnostics' *compound* treatment fact-for-fact with ADR-004 (the
skipped/disabled strip narrows, `projectedAt` and descriptor errors stay machine-wide, and the region
says which is which); DG-47-2's dropped workspace-name column, present unfiltered and gone filtered on
every card; E4's dashed card, verbatim copy and tone — never red, never crimson, never `!`; and
ADR-009's ruling that a known repo with zero items but member machines is `populated`, not an empty
state.

**ADR-010's flagship frame renders correctly** and is worth naming, because it is the case the ADR was
written for and the one no `@executable` lane could prove end-to-end: at
`?scope=local&repo=<another repo>` the page is populated, work regions read `0 of 1 workspaces` and
`0 of 45 milestones`, the node region reads `3 of 3 nodes carrying this repo`, and **R0-N** carries its
sentence verbatim — *"Local scope carries none of this repo's work — only the machines carrying it."*
— on its own line, unboxed, wrapping to two lines at 390 and never becoming a rail.

**The unresolvable-under-scope chip is CORRECT-BY-RECORD, not a gap.** Under
`?scope=local&repo=0913e6d40b2f04ef` the chip renders the raw id in a neutral `mono` box rather than
the resolved name, because a scope-narrowed payload was never served that workspace row. The designer
ruled this against three converging rules — DESIGN's *"the raw value, in `mono`, when it does not
[resolve]"*, ADR-010 clause 5 (the dashed unavailable form and the unknown accusation are **both**
withheld when nothing about the value has been established), and rail 5's no-new-token constraint. No
fourth chip vocabulary is invented; R0-N states the cause in words one line below. Two riders are owed
and are logged as findings, not as build defects.

**Render targets that do not exist, and why.** Established at source from the live payload: the mesh
carries six workspaces and three nodes, and **every node is a member of every workspace**. Therefore
`items == 0 && nodes == 0` is unreachable by any address, and with it **E6** (filtered-empty), **E5**
(out-of-scope empty) and **E1** (empty mesh). **Long-name truncation is judged anyway** — the 20-char
`willow-shield-portal` and 23-char `not-a-real-workspace-id` both overflow the trigger, which is what
exposed F-47-V-4. **DG-47-5's failed drill-in** needs a minted assignment over a deleted checkout — a
staged, operator-side errand — and stays unjudged. The **error** state is producible (take the API
away and the real error branch renders) but requires interfering with the live control daemon during
a soak; it is recorded as *not worth the disruption*, **not** as unproducible.

## Findings

### F-47-V-1 — Back/Forward does not re-narrow: the address moves, the page does not
- Observed: 2026-08-11 — live fleet, two independent probes (1.4s and 6s settles), `popstate` counter proving the event fires, `window` sentinel proving no reload.
- Type: defect   Severity: **blocker**
- Root cause, measured: **`ui/src` contains zero `popstate` listeners.** Both narrowings are written with `history.pushState` ([Fleet.tsx:613-619](../../../../ui/src/fleet/Fleet.tsx#L613-L619)) and `location.search` is read once, at mount ([Fleet.tsx:623-628](../../../../ui/src/fleet/Fleet.tsx#L623-L628)).
- **It is not this milestone's regression.** m45's `?scope=` control fails identically — measured: after Back the URL reads `?scope=local` while the page still renders Global at `6 workspaces` / `114 milestones`. One listener serves both narrowings.
- **The sharpest part is the comment.** `Fleet.tsx:610-611` states the intent in its own words — *"the entry is PUSHED (a narrowing change is a navigation the operator performed, **and Back should undo it**)"* — over a tree that never implements it. This is the milestone's own species (a claim in the record never executed against the thing it describes), and this time the record is a code comment inside the delivered file.
- Why no lane caught it: `03_deep-link-and-survival.feature`'s FEASIBILITY 1 records that the harness *"models neither `popstate` nor a stack today, only the write"*. The `@executable` lanes assert the address **write**; the read-back was deferred to this `@manual` scenario, which is where it surfaced. The contract was honest; the coverage gap was declared and then not closed.
- Triage (PO): **fix-now** — 47/03's task is literally *deep-link-and-survival* and this is its first clause.
- Routed to: a new `@bug` + `@finding-F-47-V-1` task scenario under 47/03, plus the fix (one `popstate` listener re-reading `safeSearch()`, serving `?scope=` and `?repo=` alike). Back to `aof:continue`.
- Status: **CLOSED 2026-08-13** (`aof:verify 47`, pass 2) — re-measured on the live build: `back()` walks the address **and** the page re-narrows (trigger `All repos▾`), `window` sentinel alive so still SPA. Pinned by two lanes in `fleet-slot-and-picker`, proved to fire by removing the `popstate` listener (10/10 → 8/10).

### F-47-V-2 — at ≤390 the surface slot wraps and overprints the chrome above and the content below
- Observed: 2026-08-11 — frames `S1-d_filtered-390`, `S1-h`, `S2-b`, `S2-d`, `S2-f`. Raised by `aof-designer` as G1; **re-confirmed by the verify session directly from the render.**
- Type: design-gap   Severity: **blocker**
- Expected (`mocks/filter-control-390.png`, DG-47-4): one 40px surface bar, one row, `⟳` and `◷` **glyph-only** with their words moved into `title`/`aria-label`.
- Observed: neither drop is taken — `◷ legend` and `⟳ refreshed just now` keep their words — so the slot wraps to two rows inside a fixed-height bar. The first row spills **upward**: the `Global|Local` pill and the repo trigger are crossed by the top bar's bottom rule and sit over the `fleet` identity chip and the `Fleet ▾` nav. The second row spills **downward** past the bar's bottom border into the content region. Two elements occupy the same pixels, in the chrome, at one of the milestone's three binding widths.
- Violates three of DG-47-4's four named forbidden answers at once (wrapping to a second row; a third chrome band; a control the operator cannot see cleanly), and the no-overprint invariant this surface has held since DG-13.
- Triage (PO): **fix-now**
- Routed to: 47/03 (the control's owner) — implement DG-47-4 verbatim, keyed to the viewport and taken together; slot stays `flex-nowrap`, bar stays `h-10`, both narrowings stay in full.
- Status: **REOPENED 2026-08-13 as [F-47-V-18](#f-47-v-18--at-390-the-slot-still-wraps-and-overprints-the-chrome-for-any-filter-value-at-the-triggers-own-ceiling)** — the fix is correct for the values it was measured against (`aof` 57.4px, `dea6d19a03529da6` 145.6px, `willow-shield-portal` 156.4px all render one line) and leaves the tail uncovered: at the trigger's own `max-w-[45vw]` ceiling the slot needs **365.73px in a 358px rail** and wraps, overprinting the chrome exactly as first observed. See F-47-V-18 for the measured arithmetic.

### F-47-V-3 — at 390 the picker overflows the viewport and every repo name is silently clipped
- Observed: 2026-08-11 — frame `S1-h_picker-open-390`. Raised as G2; **re-confirmed from the render.**
- Type: design-gap   Severity: **blocker**
- Observed: the 288px popover is anchored to the trigger's right edge at x≈225, putting its left edge at ≈−63 CSS px. The page root's `overflow-x: clip` cuts it **silently**: rows read `pos`, `isper-guard-portal`, `-shield-portal`, `f-test-repo`, `y-guard-portal`, `ce-vox-web`. Every repo name loses its head, and nothing on screen indicates anything is missing — in the one control whose entire job is choosing a repo.
- **This is as much a DESIGN defect as a build defect**, and the designer owns saying so: §Surface 1's S1-C pins right-edge anchoring at a fixed width with no clamp, and that rule applied literally at 390 *produces* the clipping.
- Triage (PO): **fix-now** — DESIGN amendment (c) first, then the build.
- Routed to: `aof-designer` amendment (c) — clamp to the content rail (`max-w-[calc(100vw-1rem)]`, left edge never nearer than 8px to the viewport edge, right-edge anchoring retained wherever it fits) — then 47/03 implements it. Rows keep truncating *inside* the clamped box; truncation announces itself, clipping does not.
- Status: **CLOSED 2026-08-13** (`aof:verify 47`, pass 2) — re-measured at 390 on the live build: popover `x = 17`, `right = 305`, `onScreen: true`, `scrollWidth == clientWidth`, all six repo names read in full, every row ≥ 24×24.

### F-47-V-4 — the trigger is not a fixed slot, so a state change moves the scope control; and the `ch` ceiling repeats m45 GAP-4's border-box error
- Observed: 2026-08-11 — raised as G3; **independently measured by the verify session** rather than relayed.
- Type: design-gap   Severity: major
- Expected (`mocks/README.md`, the first rule the baseline states): a fixed 150px slot *"so no state change moves the scope control, the nav, or the bar"*, binding at ≥768 (at 390 the mock deliberately hugs its content).
- Measured, `getBoundingClientRect` across four states at 1280: trigger width **82.0 / 87.9 / 119.9 / 119.9 px — a 37.9px range**, and the scope control's left edge **moves by 23.0px**. At 768: 5.9px and 6.0px respectively. At 390: static.
- Second-order defect in the same measurement: computed style is `box-sizing: border-box` with `max-width: 119.918px` — so `max-w-[18ch]` is a **border-box** maximum, and after 10px+10px padding, the border and the `▾`, the label ceiling is ~11 characters rather than 18. Visible as `whisper-gua…`, `not-a-real-…`, `0913e6d40b…`. DESIGN's own constraint row says this bar *"does not get to learn that twice"*: the **min** was corrected for border-box at m45, the **max** was not.
- Triage (PO): **fix-now** — it is the baseline's first stated rule and the failure is visible at the primary judgement width.
- Routed to: DESIGN amendment (b) — one literal `w-[150px]` at ≥768, content-hugging at ≤390, withdrawing the `min-w-[calc(9ch+1.375rem)] max-w-[18ch]` pair — then 47/03. Assert the number in a lane rather than commenting it.
- Status: **CLOSED 2026-08-13** (`aof:verify 47`, pass 2) — re-measured at 1280 across three states (`All repos` / `aof` / `willow-shield-portal`): trigger `width` **150.00** and `right` **1029.97**, identical in all three — the slot is fixed and no state change moves the scope control. The caret's alignment *inside* that correct box is a separate, minor finding — F-47-V-20.

### F-47-V-5 — the E4 body renders the operator's raw filter value in the prose face, not `mono`
- Observed: 2026-08-11 — frames `S2-c`, `S2-d`; raised as G4.
- Type: design-gap   Severity: minor
- Expected (`mocks/filter-unknown.png`, `design-source.html:929`, DESIGN's §Surface 2 Type row — *".mono for every workspace id, raw filter value and projectRoot"*): the value in `mono` inside the body sentence.
- Observed: *"Nothing on this mesh publishes as not-a-real-workspace-id."* renders wholly proportional; at 390 it breaks mid-token across lines. The chip and the trigger both get this right; the body is the one place the value is read at full size. The mono face is what marks the string as the operator's own input rather than the product's prose.
- Triage (PO): defer to the fix pass alongside F-47-V-2/3/4 — same story, same file, no reason to split it.
- Routed to: DESIGN amendment (e), then 47/03.
- Status: **CLOSED 2026-08-13** (`aof:verify 47`, pass 2) — confirmed in the live E4 render: the raw filter value renders in `mono` inside the body sentence.

### F-47-V-6 — the picker's first row has lost its `✦`, and the selection mark has no reserved column
- Observed: 2026-08-11 — frame `S1-g`; raised as G5.
- Type: design-gap   Severity: minor
- Expected (`design-source.html:222-226`): `✦ All repos` with the `✦` always leading, and the selection `✓` in a reserved 12px **trailing** column, transparent when unselected so no row shifts as the selection moves.
- Observed: the leading slot carries the `✓` instead of the `✦`; there is no trailing column. Separator and `full fleet` hint are correct.
- Triage (PO): defer to the same fix pass. Routed to: DESIGN amendment (g), then 47/03.
- Status: **CLOSED 2026-08-13** (`aof:verify 47`, pass 2) — confirmed in the live picker render: the first row reads `✦ All repos … full fleet ✓` — two marks, two columns.

### F-47-V-7 — the E4 chip's value weight: the committed mock overrules DESIGN's own ramp row
- Observed: 2026-08-11 — frame `S2-c`; raised as G6.
- Type: design-gap (record-class)   Severity: minor
- The build correctly implements DESIGN's ramp row (`:1314`, *"value stays `mono text-muted-foreground`"*). The committed mock (`design-source.html:378, 921`) puts the value at `font-weight:600; color:#101828` even inside the dashed box, and DESIGN's own a11y clause 8 agrees with the mock (*"the word that carries the meaning is at full contrast even where the frame around it is quiet"*).
- **Ruling: the mock wins and DESIGN's ramp row is the defect** — per §Conformance source of truth's own rule. The build change is one class.
- Routed to: DESIGN amendment (d), then 47/03.
- Status: **CLOSED 2026-08-13** (`aof:verify 47`, pass 2) — DESIGN's ramp row amended to the mock; the designer's second pass judged the chip's value weight CONFORMS on the live frames.

### F-47-V-8 — DESIGN.md still declares that no mock is committed
- Observed: 2026-08-11 — `DESIGN.md:63` reads *"**No mock is committed for this milestone.**"* and the table at `:101-106` marks all six commissioned frames **PENDING**, while `mocks/` holds eight committed PNGs plus `design-source.html` and a `README.md`.
- Type: defect (record)   Severity: major
- **It is a defect by the document's own standard**, not a nuance: `:74-75` rules that *"where the two conflict the mock wins and this document is amended in the same change. A checklist left contradicting a committed mock is a defect, not a nuance."* The stale table is what let F-47-V-4's and F-47-V-7's conflicts survive unnoticed — in both, the checklist and the mock disagree and nothing surfaced it.
- Same species as this milestone's fourth retro entry (a downstream document silently overriding an accepted decision, leaving no trace where the decision lives) — arriving this time as a document contradicting the artifact that now outranks it.
- Triage (PO): **fix-now** — it is the baseline's own front door, and every remaining design finding is judged against it.
- Routed to: `aof-designer` amendment (a); the verify session applies the patch text the designer returned. See the note on the designer's toolset below.
- Status: **CLOSED 2026-08-13** (`aof:verify 47`, pass 2) — confirmed at source: §Conformance source of truth now opens *"THE MOCKS ARE COMMITTED (2026-08-11), and each is now the conformance source of truth for its surface"*, and the frame table is no longer PENDING. Amendments (a)–(g) are on disk with every superseded rule recorded rather than erased.

### F-47-V-9 — 47/04 is `in-review` on a build no reviewer has seen
- Observed: 2026-08-11 — `STATE.md` §Outstanding work item 2 states it plainly: *"`47/04`'s two review passes — structural + behavioural have NOT been run."* Corroborated at source: reviews in this milestone are narrated in STATE as numbered findings, and 47/01, 47/02 and 47/03 each carry theirs (`F-47-01-ARCH-F1…F7`, `F-47-02-ARCH-F2`, `F-47-03-ARCH-1…4`, `F-47-03-QA-1…10`). A sweep for `F-47-04-*` returns **only** `F-47-04-QA-1…7`, every one of them a refine-time Three-Amigos contract finding recorded in `DESIGN.md` and the task features — no post-build review finding of either kind exists.
- Type: process gap   Severity: **blocker to accept**
- Every other story in this milestone was reviewed by an `aof-architect` (structural) and an `aof-qa` (behavioural) pass before its status moved, and those passes are where this milestone found most of what it found — including the contract contradiction inside 47/04's own task 01, which shipped 20/22 with two lanes asserting incompatible things about the same element. 47/04 having skipped both is not a formality.
- Triage (PO): **fix-now** — this belongs to `aof:continue`, not to verify; verify cannot accept past it.
- Routed to: `aof:continue 47/04` — run both passes.
- Status: **CLOSED 2026-08-13** (`aof:verify 47`, pass 2) — both passes ran 2026-08-12 and every finding they raised is closed; `acd-fleet-filter-single-home`'s ratchet re-proved here by planting a second home (5/5 → 4/5).

### F-47-V-10 — two riders owed on the unresolvable-chip ruling (no build defect)
- Observed: 2026-08-11 — returned by `aof-designer` alongside its CORRECT-BY-RECORD ruling.
- Type: design-gap (record) + coverage   Severity: minor
- (a) DESIGN `:812-814` says the trigger *"names the active repo"*, which is unsatisfiable when the payload cannot name it; the populated-but-unresolvable case is covered only by inference. Routed to DESIGN amendment (f).
- (b) The chip's `title` should carry E5's payload sentence (*"This scope's payload does not carry this workspace"*) rather than the resolved-chip rule's raw id, which here is already the visible value. **No screenshot can assert a `title` string** — this is owed to a headless lane, not to the designer.
- Routed to: DESIGN amendment (f) + one `@executable` lane in 47/03. Status: **(a) CLOSED 2026-08-13** — the unresolvable-under-scope case is pinned in DESIGN and renders as ruled on the live ADR-010 frame (neutral chip, raw id in `mono`, `✕` retained, never dashed). **(b) STILL OWED** — the chip's `title` carrying E5's payload sentence is not assertable by any screenshot and remains owed to a headless lane, not to the designer.

### F-47-V-11 — the designer cannot amend the document it owns
- Observed: 2026-08-11 — the design pass returned **seven anchored DESIGN.md patches** (a)–(g) for the verify session to apply by hand, because `aof-designer`'s toolset is `Read, Grep, Glob, Write, WebSearch, WebFetch` — `Write` is whole-file only, there is no `Edit`, and `DESIGN.md` is ~1,470 lines.
- Type: tooling gap   Severity: major (process)
- This is the **second** instance in this milestone; STATE already carries it from the DG-47-5 rulings, and the failure mode it invites is the one this milestone has been bitten by repeatedly — a hand-applied patch that drifts from what the author ruled. It has now recurred at the verification gate, with seven patches instead of six.
- Triage (PO): **not self-authorised** — it is an agent-definition change (`.claude/agents/aof-designer.md`), and the standing rule is that the operator decides.
- Routed to: the operator, and to the retro as a standing question for every write-owning agent whose document has outgrown a whole-file rewrite.
- Status: **open — unchanged, and it recurred 2026-08-13.** Confirmed at source: `.claude/agents/aof-designer.md` still declares `tools: Read, Grep, Glob, Write, WebSearch, WebFetch` with no `Edit`. Both design passes this session returned anchored patch text for the verify session to apply by hand — the third and fourth instances in this milestone. Not self-authorised: it is an agent-definition change and the standing rule is that the operator decides.

### F-47-V-12 — the picker cannot be dismissed: not by `Esc`, not by clicking away, not by tabbing out
- Observed: 2026-08-11 — raised by `aof-qa` as F-QA-K1; **re-measured independently by the verify session**, identical result. With the popover open: a real `Escape` key (arrives, not `preventDefault`ed) leaves `[role=listbox]` mounted and `aria-expanded="true"`; a real outside mouse click leaves it open (focus moves into a `<select>` in the page, the popover stays); tabbing out of the popover into the page leaves it open. The **only** dismissals are toggling the trigger again or picking a row.
- Type: defect   Severity: **blocker**
- Contradicts DESIGN §a11y 1 in terms — *"`Esc` closes it and returns focus to the trigger"* — and the surface's own claim to be a disclosure.
- **Ruled blocker rather than major** (QA offered both): the failure is not a keyboard-only shortfall. There is **no light-dismiss at all**, so a mouse operator who opens the picker and changes their mind has no way out except the two paths that commit or re-toggle. On a control that overlays the page — and, at 390, one that is also clipped off-screen (F-47-V-3) — that is a trap on the milestone's primary new affordance.
- Triage (PO): **fix-now**   Routed to: 47/03 as `@bug @finding-F-47-V-12`, plus an `@executable` lane asserting `Esc` closes **and** `document.activeElement` is the trigger. One keydown handler closes this with F-47-V-13.
- Status: **CLOSED 2026-08-13** (`aof:verify 47`, pass 2) — re-measured with real key and mouse events on the live build: `Esc` → `open:false`, `aria-expanded:"false"`, `document.activeElement` = `Filter by repo (aof)`; an outside press closes it and `location.search` is unchanged, so nothing is committed.

### F-47-V-13 — the arrow keys do not move the selection; they scroll the fleet behind the open picker
- Observed: 2026-08-11 — raised as F-QA-K2; **re-measured by the verify session**. With an option focused, `ArrowDown`/`ArrowUp`/`Home`/`End` never change the active option; the document behind scrolls instead — `scrollTop` 0→40→80 on two `ArrowDown`s, and **`End` scrolls to 11418px**, the bottom of the fleet, while the pinned popover stays at `top:40.5`. No `aria-activedescendant` exists on the trigger or the listbox. The rows *are* reachable, but only by `Tab`, because they are ordinary `<button tabindex=0>` in DOM order.
- Type: defect   Severity: major
- Contradicts DESIGN §a11y 1 (*"arrow keys move within it; `Home`/`End` reach the ends"*).
- Worth naming: this is not "the keys do nothing" — the page moves under the operator, which is worse, and it is what a missing `preventDefault` looks like.
- Triage (PO): **fix-now**, with F-47-V-12 — the same handler serves both and must `preventDefault`.
- Routed to: 47/03, `@bug @finding-F-47-V-13`.   Status: **CLOSED 2026-08-13** (`aof:verify 47`, pass 2) — re-measured: the active option moves `aof` → `vista-app-web` on `ArrowDown`, and the page's `scrollTop` is **0 → 0 → 0** across two arrows and `End` (it was 11418px).

### F-47-V-14 — the mandatory inline clear is 9.81 × 16 CSS px
- Observed: 2026-08-11 — raised as F-QA-K3; **re-measured by the verify session**: `aria-label="Clear repo filter (aof)"`, `getBoundingClientRect()` **9.81 × 16**, `padding: 0px`, `min-width`/`min-height` `auto`, at **both** 1280 and 390. Every other named target passes comfortably.
- Type: defect   Severity: major
- DESIGN names this the *mandatory* door 1 (*"A filter that can only be cleared from inside a closed menu is a hidden affordance"*) and lists it by name in §a11y 7's ≥24×24 set. It is the smallest target on the surface and the one carrying the recovery — and it compounds with F-47-V-12: with no light-dismiss on the picker and a 9.81px clear, getting *out* of a filter is materially harder than getting into one.
- The fix must come from the button's own padding, per §a11y 7 (*"never by growing the 40px surface bar"*) — the chip is in the page, not the bar, so there is room.
- Triage (PO): **fix-now**   Routed to: 47/03, `@bug @finding-F-47-V-14`, plus an `@executable` geometry lane pinning the floor for all four named targets at both widths.   Status: **CLOSED 2026-08-13** (`aof:verify 47`, pass 2) — re-measured **24 × 24** at 1280 *and* 390 (it was 9.81 × 16); every picker row also ≥ 24×24.

### F-47-V-15 — applying a filter drops focus to `document.body`
- Observed: 2026-08-11 — raised as F-QA-K4. After `Enter`, `Space` **or** a mouse click on an option, `document.activeElement === document.body`; the option is unmounted with the popover and focus goes nowhere. The next `Tab` lands on `Refresh`, i.e. the trigger is now behind the operator. The announcement half is correct — `<div role="status" aria-live="polite">` renders with the chip.
- Type: defect   Severity: minor
- Contradicts DESIGN §a11y 6 — *"announced without stealing focus, so the new narrowing is spoken while the operator's focus stays in the picker they are still using"*. Focus does not stay; it is lost.
- Triage (PO): **fix-now**, folded into F-47-V-12's lane — returning focus to the trigger on close is the same code path.   - Status: **CLOSED per the 2026-08-11 fix pass; PARTLY re-verified 2026-08-13.** The shared code path's `Esc` half was measured directly (focus returns to the trigger); the apply-returns-focus half was **not** re-measured at this gate, and that is recorded rather than claimed.

### F-47-V-16 — DESIGN puts two elements in the tab order that are not in it, and one of the clauses is what needs settling
- Observed: 2026-08-11 — raised as F-QA-K5. (a) the unknown-filter chip is `<span tabIndex=-1 title="No workspace with this id has published to the mesh">` — not focusable, so its `title` is hover-only. (b) the `◷ legend` slot control is likewise a `<span tabIndex=-1>` and is absent from the tab order entirely.
- Type: design-gap (record) for (a); defect (inherited, out of scope) for (b)   Severity: minor
- **QA's nuance is accepted and is the reason this is routed to the designer rather than to the build.** §a11y 5 asks for a *non-interactive* element in the tab order, which is the opposite of ordinary practice for a chip — the rule came from m45/a11y 4, where its subject was a *disabled control*. Its purpose is already met by other means: the E4 body states the reason in visible text (§a11y 10 forbids the fact living only in a `title`), and the `✕` inside the chip **is** focusable. So the clause, not the build, is what wants ruling.
- Triage (PO): (a) → `aof-designer`: withdraw the clause for the chip, or specify `tabindex="0"` with an accessible name. **Do not change the build until it is ruled.** (b) → backlog, against the fleet's slot; not this milestone's element.
- Status: **open (a) / backlog (b) — unchanged.** Confirmed at source 2026-08-13: `DESIGN.md:1608` still carries the unruled clause (*"The unknown-filter chip and a disabled trigger stay focusable"*). The build is correctly unchanged pending the designer's ruling, per this finding's own instruction.

### F-47-V-17 — six of the seven clauses in an `@uat` lane are DOM facts, and the lane's own justification is wrong
- Observed: 2026-08-11 — established by measuring them (above) rather than by argument.
- Type: enhancement (contract)   Severity: minor
- `01_filter-control-and-chip.feature:330-333` justifies the lane as human *because the a11y lane is off*. Every clause below was measured **with the a11y lane still off and no axe-core run**, which refutes the justification directly: axe-core is not what decides whether focus returns to a trigger or whether a target is 24px wide.
- Migrate to `@executable`: focus order; `Esc` closes + returns focus; arrows/`Home`/`End`; `Enter`/`Space` applies (the keyboard path of the existing address-write lanes); the ≥24×24 geometry at both widths; the popover's width/max-height/overflow. Keep **one** `@uat @design` scenario for focus-indicator *visibility* and whether a screen reader actually speaks the live region.
- This is the shrinking `@uat` set the feature itself says is the point — now earned rather than asserted.
- Triage (PO): route with the fix pass, so the new lanes land as the regressions for F-47-V-12/13/14/15.
- Status: **open (contract).** The `@executable` lanes it asked for DID land — `fleet-slot-and-picker`, ten lanes, each proved to fire by reverting its own fix — but `01_filter-control-and-chip.feature:319`'s `@uat` scenario still carries all seven clauses and still justifies itself as human *"because the automated one is off"*. The measurements refuted that justification twice; the contract has not yet been re-cut to match.

## Fix pass — 2026-08-11, same session (`aof:verify 47`, operator: "continue with fixes inline")

Every finding above was worked, then **re-measured on a redeployed, restarted build**
(`7400664+dirty.20260811T…`, desktop supervisor stopped and relaunched through the sanctioned CLI
verbs). The evidence below is the second measurement, not the intention.

### Closed and verified in the browser

| finding | before | after |
|---|---|---|
| **F-47-V-1** Back/Forward | URL walked, page did not; `popstate` fired and was ignored | **fixed.** `history.back()` → URL `?repo=9db1…` **and** trigger `aof▾`, chip `repo · aof`; `forward()` tracks; sentinel alive, so still SPA navigation, not a reload. One listener, re-deriving BOTH narrowings from the address |
| **F-47-V-2** the ≤390 slot | wrapped to two rows, overprinting the identity chip above and the content below | **fixed.** One row in its own 40px bar; both DG-47-4 drops taken (`◷` and `⟳`, words in `title`/`aria-label`); the two narrowings in full |
| **F-47-V-3** the picker at 390 | left edge at **x = −62.9**, every repo name beheaded, silently | **fixed.** Fully on screen; all six names read in full; `projectRoot` truncates *inside* the box |
| **F-47-V-4** the trigger slot | 82.0 → 119.9px across states, moving the scope control 23px; `18ch` = an ~11-char border-box ceiling | **fixed.** **150px in all four states** at 1280 and 768; the slot measures a constant **505.3px**. See the residual note below |
| **F-47-V-12** dismissal | `Esc`, outside click and tab-out all ignored | **fixed.** `Esc` closes **and** returns focus to the trigger (`activeElement` = `Filter by repo (All repos)`); an outside press closes; neither commits a filter |
| **F-47-V-13** the arrows | `End` scrolled the fleet to 11418px behind the open picker | **fixed.** Roving `tabIndex`, arrows consumed (`preventDefault` at the ends too), page `scrollTop` unchanged |
| **F-47-V-14** the inline clear | **9.81 × 16** | **fixed. 24 × 24 measured**, paid from its own padding (`-my-1`), chip rhythm unchanged |
| **F-47-V-6** the two marks | `✓` replaced `✦` on selection | **fixed.** Row reads `✦ All repos … full fleet ✓` — two marks, two columns, reserved so no row shifts |
| **F-47-V-5 / V-7 / V-10(a)** | raw value in prose face; value muted unless resolved; the unresolvable case unpinned | **fixed** in build + DESIGN |
| **F-47-V-8** the stale baseline | `DESIGN.md:63` declared no mock committed | **fixed.** Amendments (a)–(g) applied; every superseded rule recorded, never erased |
| **F-47-V-9** 47/04's reviews | never run | **closed.** Both passes run — findings below |

**The residual on F-47-V-4, measured rather than waved past.** The scope control still shifts 15px
between states at 1280 — but the slot is a *constant 505.3px* and its **right** edge moves
(1249 → 1264). That is the document scrollbar appearing on longer pages, not the filter: the states
that shift are exactly the ones whose page is short enough to lose it. The filter-caused movement is
gone.

**A regression the fix pass introduced and then closed.** Withdrawing `max-w-[18ch]` outright left
the ≤390 trigger unbounded, and `willow-shield-portal` measured **157.4px**, putting the slot 15px
from re-creating DG-47-4's overflow. A ceiling was derived from the rail rather than picked —
358 − scope 105.2 − gaps 24 − dropped aids 53 = **175.8px of budget**, so `max-w-[45vw]` (175.5px at
390) — and **proved to bind**: a 60-character value caps the trigger at exactly 175.5 and the slot at
358, the rail, one y-band, no overflow. A `vw` ceiling is safe where the `ch` one was not, because it
is a share of the rail rather than a count of characters.

### The lanes, and why they are believable

**175 / 175 behavioural** (was 165 — ten new lanes in `test/fleet-slot-and-picker.test.mjs`),
**45 / 45 fitness**, `tsc` exit 0, `aof work validate` **PASS**, `Fleet.tsx` **1,532 / 1,560**.

**Every new lane was proved to fire by reverting the fix it claims to pin** — ten mutations, ten reds,
every file restored and hash-verified. That is deliberate: this milestone carries findings about a
self-check unreachable except through the assertion it proved, and about non-vacuity evidence that was
*historical* rather than re-runnable. Green-on-arrival proves nothing here.

**The battery earned its keep twice.** The chip-contrast lane passed on the clean tree and **stayed
green under its own mutation** — it was matching `font-semibold` anywhere under the chip row, and the
*scope* chip's `Local` is also semibold, so the lane was reading its neighbour's correctness as its
own. Scoped to the banner and to the value's own span, it now fires. A second cut then matched the
workspace card one region below, which renders the same repo name. Both were caught by mutation, not
by reading.

**The harness gained a history stack**, which is what made F-47-V-1's clause `@executable` at all —
`03_deep-link-and-survival.feature`'s FEASIBILITY 1 named that exact migration condition
(*"the day the harness models a history STACK"*), and the defect had been living in the gap it
described. `pushState` truncates ahead of the cursor, `back`/`forward` move it, reflect the address
and dispatch a real `popstate`.

### F-47-V-9 is closed, and both passes found things

**Structural (`aof-architect`) — CONFORMS to ADR-008/001/006(a)/011/014-E3**, established by six
mutations, a planted second home, a `git diff` census and a fresh dependency graph. Its findings:

- **F-47-04-ARCH-1 · must-fix.** ADR-008's one-home clause is **unratcheted**. A planted
  `region5-name-drop.mjs` — a second home for the drop predicate, original export left in place —
  passes **51 / 51** assertions: `acd-fleet-filter-single-home`'s name regex is `/(repo|filter|narrow)/i`
  (no match) and `region5NameDropped` is not in its vocabulary. Route: one assertion in that file, or a
  dated no-gate ruling on ADR-008 (ADR-013's precedent).
- **F-47-04-ARCH-2 · must-fix.** F-47-03-ARCH-4 was filed against one file, remediated for that file,
  and **STATE reads as closing the species while three instances survive in m47's own gates** —
  including `acd-fleet-board-link-resolved.test.mjs:130`'s **fixed 400-character window** whose marker
  sits at +169 and +157, i.e. **margins of 231 and 243 characters**, in the gate ADR-011 rests on.
- **F-47-04-ARCH-3 · note.** ADR-004 rejects *"a `filtered` boolean threaded to every region"* by name;
  the build threads `repoFiltered` four levels. The build is right (it narrows nothing, is derived once
  at the seam, lands in one region, and is gated) — the **record** owes the distinction.
- **F-47-04-ARCH-4 · ledger** — four non-component exports now live in `.tsx`, unreachable from
  `node:test`; one is a geometry constant whose fix was routed as *"assert the number in a lane"*.
- **F-47-04-ARCH-5 · note** — ADR-006(a)'s positive half is asserted over one FILE where its
  prohibition is asserted over the subtree; 47/04's extraction stopped one function short of a false red.

**Behavioural (`aof-qa`) — coverage holds, with one seam that does not.** 17 scenarios / 51 rows;
**11/11 executable scenarios and 39/39 rows laned; 33/39 non-vacuously**. Twelve mutations: eight
caught, four survived. The task 01 S2/S1 contradiction this milestone already paid for is **genuinely
resolved**. What survives is one shape — **the abbreviated form and the three-child attention cluster
are never rendered by any fixture**:

- **F-47-04-QA-9 · major** — every treatment claim in task 01 scenario 2 is laned only in the
  UNABBREVIATED form. Three mutations stayed green at 38/38, including one where **the abbreviated
  failed drill-in renders identically to a healthy one**.
- **F-47-04-QA-10 · medium** — the DG-22 "leading group" Then matches a `justify-between` token, which
  means what it claims only for a two-child cluster.
- **F-47-04-QA-11 · medium** — a pre-existing DG-19 placeholder assertion is anchored to end-of-string
  and the drill-in is always last, so a re-introduced placeholder is never at the end. Proved vacuous.
- **F-47-04-QA-12 · low**, **F-47-04-QA-13 · medium** — the `@uat` lanes need a **fixture-backed** face:
  nothing on the live mesh has a node id long enough to abbreviate, so *"the target reads further in the
  filtered render"* — the story's whole benefit — cannot be measured on the soak.

### F-47-04-QA-8 — a NEW product defect, confirmed independently

- Observed: 2026-08-11 — raised by `aof-qa`; **re-measured by the verify session on the redeployed
  build**, by comparing each region-5 leaf's rendered box against its content box rather than by eye.
- Type: defect   Severity: **blocker**
- **`Open board` is ellipsised to a fragment**: rendered **23px of the 65px it needs** at 1280
  filtered, **31px** at 1440 filtered, and **5px** at 1280 unfiltered. The chip tail `· 18d ago` is cut
  to 53 of 60px unfiltered.
- **Cause** (QA's, and it holds): `abbreviateDrillIn` and `slotFits` model a **two-child** attention
  cluster, but whenever `assignment && (inReview > 0 || isDone)` the cluster has **three**. The discrete
  ladder never engages, so CSS `truncate` takes over — *"a squeeze cannot express a terminal drop"*,
  which is the exact failure DG-19 was raised for, at a fourth address.
- **Not introduced by m47, and not fixed by it either.** It is strictly worse unfiltered (5px) than
  filtered (23px), so 47/04's relief helps and does not cure. But it is inside task 00's contract in
  terms — *"nothing anywhere in region 5 has been ellipsised to a fragment"* — and it is the frame that
  story's `@uat` scenario asks a human to judge.
- Triage (PO): **fix-now, but not in this session.** The remedy changes DG-19's abbreviation ladder —
  a design contract with 22 lanes and the DG-13…DG-22 family behind it — and the budget model needs an
  architect's ruling on the three-child cluster, not a patch from the verification gate. Routed to
  `aof:continue` with ADR-008's owner.
- Status: **CLOSED 2026-08-12** (`aof:continue 47/04`, the routed fix pass) — **ADR-008's owner ruled
  it as ADR-014**, against a headless render of region 5's real DOM rather than a reading, and the
  routing was vindicated twice over: the cause was **one level deeper than this finding**. The
  three-child cluster is real, and so are two defects nobody had filed — the budgets were **also**
  derived from a row the card takes at exactly one viewport (measured band **286…368.66 and
  non-monotone**, against a code comment asserting *"viewport-INVARIANT by construction"*), and the
  secondary token **wrapped**, making region 5 a 45px two-line row at every width. `Open board`
  measured **0.34–1.83px of 65.06** at every width, not only the 23px reported here. Cluster arity is
  now a subtrahend against a budget re-derived from the grid's own floor row, the ladder gained one
  rung at position 3, and DG-47-7 retired the chip tail from the row entirely. **23/23** on the
  geometry suite, **161/161** behavioural, **47/47** fitness, eleven mutations all red. The remaining
  half is the render, which needs a deploy and a restart — the operator's call — and now has a
  fixture-backed face to render against (F-47-04-QA-12/13). See STATE §"47/04's REVIEW FIX PASS RUN
  AND CLOSED".

## Accept decision

**DECLINED — 2026-08-11**, after the fix pass. **All six of the original blockers are closed and
re-measured on a redeployed, restarted build**, and the evidence is above rather than asserted. What
holds acceptance now is what closing them *found*:

- **F-47-04-QA-8 · blocker** — `Open board` renders **23px of the 65px it needs** on a filtered card at
  1280 (5px unfiltered). A mangled prefix in region 5 is the exact thing DG-16 and DG-19 exist to
  forbid, and it is inside task 00's contract in terms. Raised by QA, confirmed independently here by
  measuring rendered boxes against content boxes. **It is pre-existing and the filter does not cure
  it** — but the milestone cannot be accepted with its own named prohibition visibly violated on the
  surface the milestone owns.
- **F-47-04-ARCH-1 · must-fix** — ADR-008's one-home clause is unratcheted: a planted second home
  passes 51/51.
- **F-47-04-ARCH-2 · must-fix** — the positional-slice species is recorded as closed while three
  instances survive in m47's own gates, one with a 231-character margin in the gate ADR-011 rests on.

Two things to be clear about. **The fix for QA-8 is deliberately not mine to make here**: it changes
DG-19's abbreviation ladder, a contract with 22 lanes and the whole DG-13…DG-22 family behind it, and
the budget model needs ADR-008's owner to rule on the three-child cluster. A verification gate that
quietly re-specifies the contract it is verifying is worse than one that stops. **And QA-8 was not
reachable from the test suite**: it needed a rendered page measured box-against-box, which is the same
route every original blocker came in by.

No status was moved: `SPEC.md` stays `in-progress`, all four stories stay `in-review`.
`RETROSPECTIVE.md`, `OUTCOME.md`, the STATE compaction and `memory ingest` remain unrun — they belong
to Accept.

**What changed about the milestone's position, and it is not small.** Before the fix pass the open
blockers were *"the record says so and nothing executed it"* — five behaviours written down and never
run. Those are now run, fixed, and each pinned by a lane proved to fire by reverting its own fix. What
remains is one real product defect, two unratcheted invariants, and a coverage seam — all of them
found by the two review passes and the render that the milestone had been carrying as owed. The
narrowing itself has been correct at every level it has been checked, at every stage, and remains so.

No status was moved: `SPEC.md` stays `in-progress`, all four stories stay `in-review`, and no box was
ticked in `## Stories`. `RETROSPECTIVE.md`, `OUTCOME.md`, the STATE compaction and `memory ingest` are
**not** run — they belong to Accept, and running them over an open blocker would put this milestone's
own signature defect into its closing record.

**What the milestone has earned, and it is worth stating precisely.** Not one finding is in the
narrowing. **The narrowing is correct at every level it was checked**: one seam above the region
fan-out, every collection narrowed or declared, both narrowings composing by intersection, ADR-010's
partial intersection rendering exactly as ruled with its notice verbatim, ADR-009's discriminator
holding, DG-47-2's relief landing, and the read-only invariant green *untouched*. That is the
milestone's thesis and it is delivered.

Everything open is in the **last mile around it** — the browser's history stack, one breakpoint's
chrome, the picker's dismissal contract, a 9.81px button, and the record's own front door.

**And they are one species, which is this milestone's own.** Every blocker is a place where the record
states a behaviour and nothing ever executed it against the thing it describes: `Fleet.tsx:610` says
*"Back should undo it"*; DESIGN §a11y 1 says *"`Esc` closes it and returns focus to the trigger"*;
§a11y 7 lists the clear in the ≥24×24 set; DG-47-4 rules two drops at 390; `mocks/README.md`'s first
sentence pins a fixed slot. All five are written down, none was run. STATE has been diagnosing exactly
this since refine — six instruments found wrong about the tree, four cross-document contradictions,
the standing retro question *"should a refine-time claim about RUNTIME behaviour be EXECUTED once at
refine?"* — and the answer arrived here, at the first gate in the milestone that actually rendered the
page and pressed the keys. **The verification is the missing execution**, which is why the findings
cluster where no lane had ever looked rather than where the code was hardest.

---

# Verify pass 2 — 2026-08-13 (`aof:verify 47`)

## Method

Run after 47/04's review fix pass (2026-08-12) closed the three findings that declined this milestone.
**Nothing below is taken from that pass's report.** Every suite was re-run, every closed finding was
re-proved by reverting its own fix, and the surfaces were re-rendered against a live, deployed build.

The operator deployed and restarted during this session: `node scripts/install-local.mjs` (payload
file-copy + `ui/dist` rebuild), then the desktop supervisor relaunched through `aof mesh desktop run`.
Verified at source before any render: `~/.aof/bin/aof.exe --version` → `0.1.0 (payload
7400664+dirty.20260813T023340)`, and the bundle the fleet serves (`index-CPyBJ3_Q.js` /
`index-BNXEf-fK.css`) is byte-identical to the deployed payload's. **The page judged below is this
milestone's code**, on a live mesh of six workspaces / 510 items / 3 nodes.

Test isolation was per-lane hermetic `AOF_GLOBAL_HOME` throughout, via a focused file-driver — the
full suite binds `:4182`, which the live control daemon holds.

## Verification evidence

### `@executable` + fitness — re-measured, not accepted

| lane group | result |
|---|---|
| 13 behavioural suites (`fleet-board-drill-in` · `-boards-branch-deleted` · `fleet-scope` · `-narrowing-seam` · `-filter-control` · `-empty-states` · `-filter-address` · `-slot-and-picker` · `-assign-row-geometry` · `-assign-affordance` · `shell-regions` · `in-app-cross-links` · `mesh-ui-read-only-contract`) | **176 / 176** |
| 12 fitness functions (the ten m47 gates + `acd-route-logic-framework-free` + `acd-roundtrip-registration`) | **53 / 53** |
| `npx tsc -p ui/tsconfig.app.json --noEmit` | **exit 0** |
| `aof work validate` | **PASS — work stream is well-formed.** |
| `Fleet.tsx` | **1,532 / 1,560** · `assign-affordance.mjs` 724 (< 800) · `scope.mjs` 619 |

### Non-vacuity — five mutations, five red, every file restored and sha256-verified

Green-on-arrival proves nothing in this milestone, so each claim that closed a blocker was re-proved
by reverting the fix it pins:

| mutation | lane | verdict |
|---|---|---|
| plant `region5-name-drop.mjs`, a second home for the drop predicate (F-47-04-ARCH-1's own probe) | `acd-fleet-filter-single-home` | 5/5 → **4/5** |
| `children = assignment ? 2 + … : 2` → `children = 2` (F-47-04-QA-8's own cause, the two-child model) | `fleet-assign-row-geometry` | 23/23 → **21/23** |
| `REGION5_ROW_FLOOR_PX` 286 → 360 (ADR-014 Gate B) | `fleet-assign-row-geometry` | 23/23 → **18/23** |
| remove the `popstate` listener (F-47-V-1's own defect) | `fleet-slot-and-picker` | 10/10 → **8/10** |

The three findings the 2026-08-11 pass declined on are therefore **closed on evidence, not on report**.

### `@manual` / keyboard — measured on the live build

Driven over CDP with real `Input.dispatchKeyEvent` presses and real mouse events at `:4181/fleet`.
Every clause that failed on 2026-08-11 passes:

| clause | 2026-08-11 | 2026-08-13, live |
|---|---|---|
| focus order | PASS | `Skip to content` → 4 nav → `Global` → `Local` → **`Filter by repo (aof)`** → `Refresh` → `Clear repo filter` — the slot's own place |
| `Esc` closes + returns focus (F-47-V-12) | **FAIL** — stayed mounted, `aria-expanded` stayed `"true"` | `open:false`, `expanded:"false"`, `activeElement` = `Filter by repo (aof)` |
| light-dismiss (F-47-V-12) | **FAIL** — outside click ignored | outside press closes; `location.search` unchanged, so nothing is committed |
| arrows / `Home` / `End` (F-47-V-13) | **FAIL** — `End` scrolled the fleet to **11418px** | active moves `aof` → `vista-app-web`; page `scrollTop` **0 → 0 → 0** |
| the mandatory inline clear (F-47-V-14) | **FAIL** — **9.81 × 16** | **24 × 24** at 1280 *and* 390 |
| the fixed slot (F-47-V-4) | **FAIL** — 82 → 119.9px, scope control moving 23px | trigger **150.00px** and `right` **1029.97** identical across `All repos` / `aof` / `willow-shield-portal` |
| the picker at 390 (F-47-V-3) | **FAIL** — left edge **x = −62.9**, names beheaded | **x = 17**, `onScreen: true`, `scrollWidth == clientWidth`, all six names whole; every row ≥ 24×24 |
| the two marks (F-47-V-6) | **FAIL** — `✓` replaced `✦` | `✦ All repos … full fleet ✓` |
| Back/Forward re-narrows (F-47-V-1) | **FAIL** — address moved, page did not | `back()` → `?scope=global` **and** trigger `All repos▾`; `window` sentinel alive, so still SPA |

### Design conformance — **GAPS** (one blocker), on twelve live frames

Rendered at `:4181/fleet` via CDP `Emulation.setDeviceMetricsOverride` at 1280 / 1056 / 768 / 390,
`deviceScaleFactor: 2`, `--hide-scrollbars`, each frame verified to carry a PNG `IEND` terminator
before use. Addresses covered: unfiltered, filtered, the picker open over six real repos, a
20-character workspace name, E4's unknown value, and ADR-010's `?scope=local&repo=<another repo>`.

**CONFORMS, and these are the milestone's substance:** region order R0 · R1 · R2 · R3 · R4 with no
Boards; every region's `n of N`; emptied regions keeping their headers at `0 of N` with no per-region
empty card; R0 hoisted above the state ternary and present in the empty state (DG-47-1's close
condition, met); chip grammar `Filtered by [scope · Local] [repo · <value> ✕]`, scope first, no `✕` on
the scope chip; DG-47-2's dropped name column; E4's dashed card with the raw value in `mono` inside
the body sentence (F-47-V-5, closed); ADR-004's compound Diagnostics rendered fact-for-fact.

**ADR-010's flagship renders exactly as ruled** — the case no `@executable` lane can prove
end-to-end. At `?scope=local&repo=dea6d19a03529da6`: the page is **populated**, `0 of 1 workspaces`,
`0 of 45 milestones`, `3 of 3 nodes carrying this repo` naming all three machines, the chip neutral
with the raw id in `mono` (never dashed, never accused), and **R0-N verbatim** — *"Local scope carries
none of this repo's work — only the machines carrying it."* — unboxed, on its own line, wrapping to
two lines at 390 and never becoming a rail.

**ADR-009's discriminator holds where it was never rendered before.** `willow-shield-portal`
(0 items, 3 member nodes) renders **populated**, not an empty state — `1 of 6 workspaces` with its
card, `0 of 114 milestones`, `3 of 3 nodes`. Forcing an empty state here would have been the defect.

**Region 5's new geometry — the subject of the blocker that declined this milestone — CONFORMS at
1440 / 1280 / 1056 / 768.** Judged from the fixture-backed render face
(`test/support/mesh-ui-assign-fixture.mjs`, isolated projection, ephemeral port), because
F-47-04-QA-12/13 established that **nothing on the live mesh carries a node id long enough to
abbreviate**. The face stands a card whose attention cluster has THREE children with a 30-character
target — F-47-04-QA-8's own frame. Measured there: `Open board` is **no longer a fragment** but the
ladder's legitimate rung-2 discrete drop (words surrendered whole, glyph pinned — what DG-19 demands);
rung 3 renders `◔ 1`, glyph pinned and count kept, never dropped whole; the chip tail is **absent at
every width** (DG-47-7 RULING 1); the row is **one line**, not the pre-fix 45px two-line row; and the
30-character target renders **in full** at 1280 and 1440 — the story's whole benefit.

**ADR-014's floor row was rendered for the first time.** Every region-5 budget is derived from
`REGION5_ROW_FLOOR_PX = 286`, and no previously-rendered width produces it (390→324, 768→310,
1280→360.66, 1440→368.66); the floor is reached at viewport **1056**. Rendered there, the row still
holds: one line, drill-in a pinned `→`, `◔ 1` intact, tail absent, and the target degrading *inside
its own box* with a visible ellipsis. **The ladder's worst case is now evidence rather than
arithmetic**, and 1056 is added to §Render targets (DESIGN patch, below).

## Findings

### F-47-V-18 — at 390 the slot STILL wraps and overprints the chrome, for any filter value at the trigger's own ceiling
- Observed: 2026-08-13 — live build, CDP device-metrics render at 390, four filter values.
- Type: defect (design-gap in origin)   Severity: **blocker**
- **This REOPENS F-47-V-2**, whose fix was correct for the case it measured and left the tail uncovered. The fix pass took DG-47-4's two drops (verified here: `◷` and `⟳` *are* bare glyphs at 390, and the nav collapses to `Fleet ▾`) and added `max-w-[45vw]` = 175.5px as the trigger's ≤390 ceiling.
- **Measured, and the row's own numbers convict the ceiling:**

  | term | measured | STATE's derivation |
  |---|---|---|
  | rail | 358 | 358 |
  | scope control | **105.23** | 105.2 |
  | trigger at its ceiling | **175.50** | 175.5 |
  | dropped aids | **53** | 53 |
  | **gaps** | **`column-gap: 16px` × 2 = 32** | **24** |
  | **needed** | **365.73** | 357.7 |

  The ceiling was derived from `gaps 24` while the row's own computed `column-gap` is **16px**, twice. Eight pixels. Real budget is `358 − 105.2 − 32 − 53 = 167.8px`, so `max-w-[45vw]` is **7.73px too generous** and the slot cannot fit at its own maximum.
- **Consequence, and it is the forbidden answer by name.** The row is `flex-wrap: wrap` inside a bar that computes `flex h-10 shrink-0 items-center … overflow: visible` — a fixed **40px** band. At the ceiling the row measures **70px in two y-bands** (scope + trigger at y≈32.5, the two glyph aids at y≈78.5) against **30px, one band**, for shorter values. The 70px row is centred in the 40px bar and spills ~15px above and below: line 1 is drawn across the top bar's bottom rule and over the `fleet` identity chip and `Fleet ▾`; line 2 is drawn below the bar's border into the content region. DG-47-4 names *wrapping the slot to a second row* and *a control the operator cannot see cleanly* among its four forbidden answers, and this is both at once.
- **It is data-keyed, which DG-47-4 forbids in terms** (*"keyed to the viewport and never to the data — a drop that came and went with the data would make the bar's form a covert signal about the repo's name"*). Measured across values: `aof` 57.4px, `dea6d19a03529da6` 145.6px and `willow-shield-portal` 156.4px all render **one line**; `not-a-real-workspace-id` (175.5px, at the ceiling) and a 60-character value both **wrap**. The bar's shape is now a function of how long a value the operator typed.
- **Producible in a state the product ships.** The trigger reaches its ceiling at roughly ≥22 characters, and E4 exists precisely for hand-edited and shared `?repo=` values. The live mesh's own longest name (20 chars) does not trigger it, which is why no lane and no earlier render caught it.
- **And STATE asserts the opposite.** §"FIX PASS RUN IN THE SAME SESSION" records the ceiling as *"**proved to bind**: a 60-character value caps the trigger at exactly 175.5 and the slot at 358, the rail, **one y-band, no overflow**"*. Measured on the shipped build: **two y-bands, row height 70px**. This is the milestone's signature species — a claim asserted and never executed against the thing it describes — occurring inside the fix for its own instance of that species, and it is the third time the number rather than the rule has been the defect (after ADR-014's budgets derived from a one-viewport row, and DG-47-4's own arithmetic).
- Triage (PO): **fix-now** — it is a blocker's residue at a binding breakpoint, and the milestone cannot be accepted with its own named prohibition visibly violated on the surface it owns.
- Routed to: **47/03** (the control's owner). Re-derive the ceiling from the row's **own computed gap** rather than a hand-carried number, and — per ADR-014 Gate B's precedent — have the gate read the `column-gap` out of the source so the constant is coupled to the CSS fact instead of to a comment. Add the `@executable` lane the designer names: *at 390 the slot occupies exactly one y-band, and the bar's rendered height equals its CSS height, for the longest value the picker can offer and for an arbitrary raw value.* Both failure directions must be proved by mutation.
- Status: **CLOSED 2026-08-13** (same session, the routed fix pass) — the ceiling is no longer load-bearing: the slot row is `flex-nowrap min-w-0`, the trigger and its wrapper carry `min-w-0`, and the trigger takes `w-full` below `sm`, so the LAYOUT ENGINE computes each width's residual. Re-measured on the redeployed build: the slot is **30px inside a 40px bar at every width for every value length** including 60 characters (it was 70px in two y-bands), and the residual is **167.77 / 216 / 270px at 390 / 480 / 600**. Proved to fire by four mutations. **Closing it exposed F-47-V-23.**

### F-47-V-19 — DESIGN pins the fixed slot at a breakpoint the product's own window is narrower than
- Observed: 2026-08-13 — raised by `aof-designer`; confirmed at source in DESIGN.md.
- Type: design-gap (record)   Severity: major
- §Surface 1 row S1-B pins `w-[150px]` at **≥768**, while §Render breakpoints names 768 *"the desktop-app proxy"* and records that the Rust window is **760**×520. **760 < 768**, so on a correct build the reserved slot never applies in the actual desktop window, and the state-change shift F-47-V-4 removed at 1280 returns there. A rule whose boundary sits 8px above its own named render target is a rule that misses the product.
- The band **391–767 is unpinned entirely** — the same species as `F-47-02-QA-F3` (a producible state the checklist leaves unpinned is one a build must invent).
- **The lane cannot catch it either**, and that is the sharper half: `test/fleet-filter-control.test.mjs` asserts the slot by **reading the constant**, so it cannot see a breakpoint that misses. A claim never executed against the thing it describes, again.
- Triage (PO): **fix-now**, with F-47-V-18 — same file, same surface, same fix pass.
- Routed to: `aof-designer` (amend S1-B to a boundary the desktop window is inside — the designer proposes `≥640`/`sm`, a boundary this page already keeps via `px-4 sm:px-8`, introducing no new breakpoint), then 47/03. The lane becomes a **rendered-box** measurement at 760 and 768, not a constant read.
- Status: **CLOSED 2026-08-13** — the fixed slot binds from `sm` (640), pinned as a MINIMUM as well as a maximum. Measured **150.00px with an identical `right`** across four value lengths at 640, **760**, 768 and 1280, so the Rust desktop window is inside its own rule. The lane no longer reads the constant: it asserts `sm` and explicitly NOT `md`, in both directions.

### F-47-V-20 — the `▾` is not pinned to the trigger's right edge, so a fixed slot still reads as a wide button
- Observed: 2026-08-13 — raised by `aof-designer` as GAP-4; **independently measured by the verify session** rather than relayed.
- Type: design-gap   Severity: minor
- Expected (`mocks/design-source.html:54`, `justify-content: space-between`; `mocks/filter-control.png` and `-768.png`, all rows): inside the reserved box the label is left-aligned and the `▾` sits at the box's **right edge**, at the same x in every state — which is what makes the box read as a reserved slot rather than a wide button.
- Measured at 1280, three states: computed `justify-content: normal`; the caret's right edge sits **11.00 / 73.09 / 103.63px** from the trigger's right edge for `willow-shield-portal` / `All repos` / `aof`, tracking the label at a constant 8px gap. The box itself is correct — `width: 150.00` and `right: 1029.97` are identical in all three — so this is the caret's alignment inside a correct slot, not a slot defect.
- Triage (PO): defer to F-47-V-18's fix pass — same file, same control, one class (`justify-between` on the trigger, label in a `min-w-0 flex-1 truncate` span, `▾` trailing). No width change, no new token.
- Routed to: 47/03. Status: **CLOSED 2026-08-13** — `justify-between` on the trigger, label in a `min-w-0 flex-1 truncate` span. Re-measured: the caret sits a **constant 11px** from the trigger's right edge at every width and every value (it was 11 / 73.09 / 103.63). 11px is `px-2.5` + the border, i.e. flush to the content edge.

### F-47-V-21 — the verification gate handed its own judge an unsound artifact, and got three confident, specific, wrong findings back
- Observed: 2026-08-13 — by the verify session, against itself.
- Type: process   Severity: major (method)
- The first design pass was handed eight frames captured with Chromium's `--window-size`, which does **not** reliably set the layout viewport: the page laid out wider than the image and was cropped, and the crop composited the bottom-anchored slot a second time. `aof-designer` judged them faithfully and returned **GAP-1** (*DG-47-4's two drops do not fire at 390*), **GAP-2** (*the page overflows its viewport and `overflow-x: clip` hides it* — raised **HIGH**), and **GAP-5** (*the slot and banner render twice* — raised **HIGH**). All three are **false**, and all three were withdrawn only because the verify session re-rendered through CDP `Emulation.setDeviceMetricsOverride` and measured: `scrollWidth == innerWidth == 390`, `widestOverflowing: []`, both aids bare glyphs, nav collapsed, and exactly one scope control / one repo trigger / one `aria-live` / one banner in the document.
- **The fault is the gate's, not the judge's**, and it is this milestone's own species from a new direction: the previous instances were a *record* asserting an unexecuted claim; this is a *measurement* offered as evidence without its own soundness being established first. A read-only judge cannot detect that its input is an artifact — it can only judge what it is handed — so the soundness of a render is the renderer's obligation, and it must be *stated with the frames*, not assumed.
- Two things are worth recording precisely because they went right. The designer **flagged its own uncertainty in the right places** — it asked for a `--hide-scrollbars` re-render before its 768 finding was believed, and asked for a computed-style probe before its E4 dashed-chip finding was believed. Both cautions were correct: the 768 finding dissolved, and **GAP-B was false** (measured: E4's chip and trigger are both `border-style: dashed` while the resolved and ADR-010 chips are `solid` — the discrimination DESIGN requires is present). And the second pass, handed sound frames *with their provenance and the correction stated up front*, returned the one real blocker this gate found.
- Triage (PO): to the retro, as a house rule with a checkable form — **a render is not evidence until its own soundness is measured and recorded beside it** (`scrollWidth == innerWidth`, the layout viewport equals the stated width, and a format-level integrity check on the file), and a frame handed to a judge carries that record. It generalises the milestone's existing `IEND`-before-use lesson from *the file is intact* to *the measurement is sound*.
- Routed to: `RETROSPECTIVE.md` at Accept, and **discharged as a rule 2026-08-13**: DESIGN §Render breakpoints now carries *a frame whose page overflows its viewport, or whose layout viewport is not the width it claims, may not be used to judge anything*, with the three checks that make it decidable and the note that soundness travels WITH the frame because a read-only judge structurally cannot check it. Status: **rule landed; the retro entry stays owed to Accept.**

### Status reconciliation — the first pass's findings, as of 2026-08-13

The per-finding `Status:` lines above were written on 2026-08-11 and are corrected in place. For one
authoritative view: **F-47-V-1, 3, 4, 5, 6, 7, 8, 9, 12, 13, 14 are CLOSED and re-verified here**
(each by direct measurement on the live build, and four by reverting their own fix). **F-47-V-2 is
REOPENED as F-47-V-18.** **F-47-V-15** is closed per the fix pass and only *partly* re-verified here —
the `Esc`-returns-focus half of its shared code path was measured, the apply-returns-focus half was
not, and that is stated rather than claimed. **F-47-V-10(b)** (the chip's `title` carrying E5's
payload sentence) remains owed to a headless lane — no screenshot can assert a `title`.
**F-47-V-11** (the designer cannot amend the document it owns) is **open and unchanged**: confirmed at
source, `.claude/agents/aof-designer.md` still declares `tools: Read, Grep, Glob, Write, WebSearch,
WebFetch` with no `Edit`, and it bit again this session — both design passes returned anchored patch
text for the verify session to apply by hand. It is an agent-definition change and remains the
operator's call. **F-47-V-16(a)** is **open**: `DESIGN.md:1608` still carries the unruled clause
(*"The unknown-filter chip and a disabled trigger stay focusable"*), and the build is correctly
unchanged pending the ruling. **F-47-V-17** is **open as a contract item**: the `@executable` lanes it
asked for did land (`fleet-slot-and-picker`, 10 lanes, each proved to fire), but
`01_filter-control-and-chip.feature:319`'s `@uat` scenario still carries all seven clauses and still
justifies itself as human *"because the automated one is off"* — the justification the measurements
refuted twice.

## Accept decision

**DECLINED — 2026-08-13.** One blocker is open: **F-47-V-18**.

Everything the 2026-08-11 pass declined on is closed, and closed on evidence rather than on report —
the three findings were re-proved by reverting their own fixes, and every keyboard and geometry clause
that failed then passes now on a live, deployed, restarted build. **229 / 229 lanes green**, `tsc`
exit 0, `aof work validate` **PASS**, and the milestone's two hardest-to-prove behaviours — ADR-010's
partial intersection and ADR-014's floor row — are now rendered evidence rather than argument.

What holds acceptance is a residue of F-47-V-2 that its own fix left uncovered: at 390, any filter
value long enough to reach the trigger's ceiling makes the slot need **365.73px in a 358px rail**, so
it wraps to two lines inside a fixed 40px `overflow: visible` bar and overprints the chrome above and
the content below. The cause is an eight-pixel error in a hand-carried number — a ceiling derived
against `gaps 24` when the row's own computed `column-gap` is 16px twice — and the record asserts the
opposite outcome (*"one y-band, no overflow"*) for the exact 60-character case that in fact wraps.

**The fix is deliberately not made here.** It re-derives a DG-47-4 budget, and a verification gate
that quietly re-specifies the contract it is verifying is worse than one that stops — the same
reasoning that routed F-47-04-QA-8 out of the previous gate, and it was vindicated then when the cause
turned out to be one level deeper than the finding.

No status was moved: `SPEC.md` stays `in-progress`, all four stories stay `in-review`, and no box was
ticked in `## Stories`. `RETROSPECTIVE.md`, `OUTCOME.md`, the STATE compaction and
`aof work memory ingest` are **not** run — they belong to Accept, and running them over an open
blocker would write this milestone's signature defect into its own closing record.

**What the milestone has earned, and it is unchanged by this decline.** Not one finding is in the
narrowing. The narrowing is correct at every level it has been checked, at every stage, and it has now
been checked on a live mesh of six workspaces: one seam above the region fan-out, every collection
narrowed or declared, both narrowings composing by intersection, ADR-010's partial intersection
rendering exactly as ruled with its notice verbatim, ADR-009's discriminator holding on a real
quiet-but-known repo, DG-47-2's relief landing, region 5's ladder holding at its own floor row, and
the read-only invariant green *untouched*. That is the milestone's thesis and it is delivered.

Everything open is in the last mile around it — one breakpoint's chrome at one end of the value-length
range, a boundary 8px above the window it was written for, and a caret that tracks its label.

---

## Fix pass — 2026-08-13, same session (operator: "perform the fixes inline now and then re-verify")

Every finding above was worked and **re-measured on a redeployed build** (payload
`7400664+dirty.20260813T111952`; the UI daemon serves `ui/dist` from disk per request, so the served
bundle hash was confirmed against the deployed payload rather than assumed). The evidence below is the
second measurement.

### F-47-V-18 — closed, and the arithmetic is GONE rather than corrected

The eight-pixel gap error was the symptom. The disease is that **a fit expressed as a hand-transcribed
sum must be recomputed by hand every time any occupant changes** — including occupants a later
milestone adds, which no constant can anticipate. So the ceiling is no longer load-bearing:

- `Shell.tsx`'s slot row is **`flex-nowrap min-w-0`** (was `flex-wrap`). A wrap is not a degradation
  in a fixed-height `overflow: visible` bar — it is an overprint.
- The trigger **and its popover-anchor wrapper** carry `min-w-0`, and the trigger takes **`w-full`**
  below `sm`.
- The occupants that must never yield say so with `shrink-0` (scope control, both aids), so the yield
  order is a design decision rather than the browser's.

**Three things were wrong on the way to that, and each was found by measuring rather than reasoning** —
worth recording, because each is a plausible-sounding fix that does not work:

| attempt | why it failed, measured |
|---|---|
| `min-w-0` on the trigger alone | `flex-wrap` line-breaking uses each item's **hypothetical** size (content clamped by `max-width`), so the row wraps *before* anything is permitted to shrink. `min-width: 0` never gets to apply. Row stayed 70px. |
| `flex-nowrap` + `min-w-0` on the button | The slot's direct flex child is `RepoPicker`'s `relative` **wrapper** span, not the button. It still had `min-width: auto`, so the shrink stopped one element above the thing it was meant to shrink. Wrapper 175.5px against a 167.77px residual. |
| `w-auto` on the trigger | A `<button>`'s `width: auto` is **shrink-to-fit**, not fill — so with the wrapper correctly shrunk to 167.77px the button still sized to its own content and overflowed it by exactly the shortfall. |

**Measured after, on the live fleet:** the slot is **30px inside a 40px bar at every width for every
value length**, including a 60-character value (it was 70px in two y-bands). The trigger takes each
width's true residual — **167.77px at 390, 216px at 480, 270px at 600** — computed by the layout
engine, and the fixed 150px slot from `sm`.

### F-47-V-23 — a NEW gap the fix's own boundary move created, found by the designer in my numbers

Moving the fixed slot to `sm` (F-47-V-19) without moving the **aid drop** left **391–639** as a band
where the two UNPROTECTED aids kept their words while the PROTECTED repo filter had no reserved width
— DG-47-4's ruling exactly inverted. **The evidence was in the residuals this session had already
measured and reported as a success**: `167.77px at 390, 92.73px at 480, 212.73px at 600` is
**non-monotone** — the protected control **75px narrower one designed drop above the width where it
was in full**. The verify session read those three numbers, called them "each width's true residual",
and did not notice. `aof-designer` did.

Fixed by making the two boundaries **one number**: `SLOT_AID_DROP_WIDTH` 390 → **640**, compared
strictly, so one bar has one boundary. This deliberately breaks the old coupling to `shell-nav.mjs`'s
`NAV_DISCLOSURE_BREAKPOINT` — the nav is in the 48px top bar and these aids are in the 40px surface
bar, so keying one bar's degradation to another bar's breakpoint was a hand-computed ceiling wearing
different clothes. Re-measured: **167.77 → 216 → 270** across 390/480/600, monotone, then the fixed
150px slot. `shell-nav.mjs` keeps its own 390, untouched.

### The shared-shell blast radius, measured rather than reasoned about

`flex-wrap → flex-nowrap` is on **m45's shared** `data-shell-slot="surface-bar"`, so it changed the
degradation mode of every surface's contribution at once — and the designer named the reason this
matters: **`nowrap` cannot announce its own failure.** A wrap drew over the chrome and was therefore
catchable; once the `shrink-0` occupants alone exceed the rail, a `nowrap` row overflows and the
root's `overflow-x: clip` cuts it **silently** — the same defect F-47-V-3 found in the popover, one
element up. So the floor was asserted on every surface at 390 / 480 / 639 / 640 / 760 / 768 / 1280:

| surface | slot children | result |
|---|---|---|
| fleet | 3 | `scrollWidth == clientWidth` at every width (278 below `sm`, 505 at and above); one y-band; 30px in a 40px bar |
| board | 2 | 138px, `scrollWidth == clientWidth` at every width |
| terminals · config | 0 | contribute nothing to the row |

**No surface clips, no child passes its row's right edge, no document overflows x.** The blast radius
is real in principle and empty in practice, and it is now a measured fact rather than an argument.

### F-47-V-19 / F-47-V-20 — closed

The fixed slot binds from **`sm` (640)**, pinned as a minimum as well as a maximum, so the 760×520
desktop window is inside its own rule: measured **150.00px with an identical `right`** across four
value lengths at 640, 760, 768 and 1280. The `▾` takes `justify-between` and now sits a **constant
11px** from the trigger's right edge at every width and every value (it was 11 / 73.09 / 103.63).

### The lane that CERTIFIED the defect is re-pointed

`fleet-filter-control/01` asserted the transcribed derivation — *"rail 358 − scope 105.2 − two gaps 24
− the dropped aids 53"* — and passed. **It did not merely miss the defect; it confirmed it**, because
a lane that re-checks a transcription can only ever agree with the transcription. It now asserts the
*property* (`w-full`, `min-w-0`, `sm` and explicitly **not** `md`) and, per ADR-014 Gate B's
precedent, **reads `Shell.tsx`'s real classes at gate time** rather than trusting a number about a
file it never opened. `fleet-slot-and-picker/01` now pins both boundaries as one number and asserts
390 and 391 answer the same form — which is what makes F-47-V-23's inversion unrepresentable rather
than merely fixed.

**Four mutations, four red, every file restored and sha256-verified:** restoring `flex-wrap`;
restoring the `md:` breakpoint; restoring `w-auto`; and dropping the wrapper's `min-w-0`.

### The lanes

**176 / 176 behavioural · 53 / 53 fitness · `tsc` exit 0 · `aof work validate` PASS ·
`Fleet.tsx` 1,539 / 1,560.**

### DESIGN amendments applied (F-47-V-11's workaround, as always)

`aof-designer` returned anchored patch text because it still cannot edit the document it owns. Applied
at seven anchors: S1-B's breakpoint and right-edge pin; the new *fit is a property, not an arithmetic*
rule; DG-47-4's superseded arithmetic table, its three-term amendment, its **label-vs-value**
clarification (F-47-V-22 — one word was being used for the product's chosen word *and* the operator's
datum, which takes opposite rules and nearly produced a false GAP and a false CONFORMS in the same
pass) and its `sm` boundary ruling (F-47-V-23); documented default 5's withdrawn `18ch`; §Render
breakpoints' 1056 floor-row target and F-47-V-21's render-soundness rule; and the fit rule's new
silent-clip failure mode with its `scrollWidth == clientWidth` floor.

### F-47-V-17 closed

`01_filter-control-and-chip.feature`'s seven-clause `@uat` scenario is re-cut: six DOM-fact clauses
become one `@executable` scenario (their lanes already existed and are proved to fire), and **two**
genuinely-human clauses remain — whether a focus ring reads as focus against this surface's contrast,
and whether a screen reader actually speaks the live region. The clause under F-47-V-16(a)'s ruling is
explicitly excluded and says why, so it cannot be quietly re-added.

### F-47-V-22 — DESIGN used one word, "label", for the product's chosen word AND the operator's datum
- Observed: 2026-08-13 — raised by `aof-designer` in its third pass.
- Type: design-gap (record)   Severity: minor
- DG-47-4's first forbidden answer is *"truncating a control's **label**"*; §Surface 1's new fit rule
  requires that *"the **label** truncates inside it"*. Both are correct about their own subject and
  the document never distinguished them. A **label** is the word the product chose (`legend`,
  `All repos`) and may never be character-shaved — it yields its words whole to a pinned glyph or not
  at all. A **value** is the operator's own datum and MAY truncate, on DG-16's condition that the
  fact renders in full one region below in the chip. The trigger holds one of each.
- **It is not academic: it nearly produced both errors in one pass** — a false GAP on the correct
  `not-a-real-workspa…` at 390, and a false CONFORMS on the squeezed 92.73px trigger at 480.
- Status: **CLOSED 2026-08-13** — DG-47-4 carries the distinction, and §Surface 1's fit rule now says
  "value" where it meant value.

### F-47-V-23 — the fix's own boundary move inverted DG-47-4 in the 391–639 band
- Observed: 2026-08-13 — raised by `aof-designer` **from the numbers this verify session had already
  measured and reported as a success.**
- Type: design-gap   Severity: major
- F-47-V-19 moved the trigger's fixed slot to `sm` (≥640). The **aid drop** stayed at ≤390. So in
  391–639 the two UNPROTECTED aids kept their words while the PROTECTED repo filter had no reserved
  width — the protected element paying for the unprotected ones, which is DG-47-4's ruling inverted.
- **The evidence was already in this document.** The residuals recorded as *"each width's true
  residual"* — **167.77px at 390, 92.73px at 480, 212.73px at 600** — are **non-monotone**: the
  protected control is **75px narrower at 480 than at 390**, one designed drop above the width where
  it was in full. Three numbers were printed, read, and reported as a pass. A viewport-keyed form
  whose protected element gets worse as the viewport gets wider is a cliff at a boundary nobody chose.
- **The species is this milestone's own, arriving from the one direction it had not yet come from:**
  every previous instance was a claim asserted and never executed. This one was *executed, measured,
  printed, and not read* — the measurement was taken and its meaning was not. Cheaper to catch than
  any of the others, and it needed a second pair of eyes rather than a second run.
- Triage (PO): **fix-now**, in the same pass — the two boundaries must be one number or the inversion
  can recur.
- Status: **CLOSED 2026-08-13** — `SLOT_AID_DROP_WIDTH` 390 → **640**, compared strictly, deliberately
  decoupled from `shell-nav.mjs`'s `NAV_DISCLOSURE_BREAKPOINT` (different bar, different occupants,
  different budget — *coherence is not a budget*). Re-measured **167.77 → 216 → 270** across
  390/480/600: monotone, then the fixed 150px slot. `fleet-slot-and-picker/01` now pins both
  boundaries as one number and asserts 390 and 391 answer the same form, so the inversion is
  unrepresentable rather than merely fixed.

## User sign-off

The `@uat` set closed at **two clauses**, down from nine scenarios at the start of verification and
seven clauses in this one lane. The shrinking was earned by measurement, not argument: six of the
seven were shown to be DOM facts by driving them headlessly **with the a11y lane still off**, which
refuted the lane's own justification (*"human because the automated one is off"*) directly, and they
are now `@executable` with lanes proved to fire.

**Both remaining clauses are recorded NOT RUN, with their reason, and are NOT counted as passes.**

| clause | disposition |
|---|---|
| *the focus indicator is VISIBLE* — whether the ring reads as focus against this bar's own contrast | **NOT RUN.** Everything mechanical beneath it is asserted and green: the trigger, every picker row and the chip's inline clear all compute an outline, `:focus-visible` matches, and the three are in the tab order at the slot's own position. What is unrun is a human's perception on a real display, which no driver can supply. |
| *applying a filter is SPOKEN by the live region without stealing focus* | **NOT RUN.** The element and its wiring are asserted: `<div role="status" aria-live="polite">` renders with the chip, and focus demonstrably is not stolen. Whether a real screen reader announces it needs a real screen reader. `work.tags.domains` carries no `a11y` entry, so no axe-core lane exists in this project to stand behind it either. |

**This is the milestone's own precedent, applied consistently rather than bent for the gate.** Two
other genuinely-human errands were recorded the same way and neither blocked: the **rename** errand
(*"a link built on a renamed workspace still resolves"* — needs a rename, a republish and two
sessions) and **DG-47-5's failed drill-in** (needs a minted assignment over a deleted checkout, an
operator-side staging job). A verification that counted an unrun human clause as a pass would be this
milestone's signature defect wearing its last available disguise.

## Accept decision

**ACCEPTED — 2026-08-13** (`aof:verify 47`). `aof work validate` **PASS**, and **no blocker finding is
open**.

### What was checked, and by whom

| lane | result |
|---|---|
| 13 `@executable` behavioural suites | **176 / 176** |
| 12 fitness functions | **53 / 53** |
| `npx tsc -p ui/tsconfig.app.json --noEmit` | exit 0 |
| `aof work validate` | **PASS** |
| `Fleet.tsx` · `assign-affordance.mjs` · `scope.mjs` | 1,539 / 1,560 · 724 (< 800) · 619 |
| Design conformance (`aof-designer`, three passes, judged from renders it was handed) | **CONFORMS** on every region judged |
| `@manual` — the browser lane | every clause passes on the deployed build |
| `@uat` | 2 clauses, both **NOT RUN with reasons** (above) |

**Nothing here was accepted from a report.** Every suite was re-run at this gate, and every finding
that closed a blocker was re-proved by reverting the fix it pins — eight mutations across the two
passes, eight red, every file restored and sha256-verified.

### The narrowing — the milestone's thesis, and it is delivered

**Not one finding in this milestone's entire verification history was in the narrowing itself.** It is
correct at every level it has been checked, and it has now been checked on a live mesh of six
workspaces, 510 items and three nodes: one seam above the region fan-out; every collection narrowed or
declared machine-wide with its reason; both narrowings composing by intersection; ADR-010's partial
intersection rendering exactly as ruled, with R0-N verbatim and the node region naming the machines
that carry the repo; ADR-009's discriminator holding on a real quiet-but-known repo (`willow-shield-portal`,
0 items, 3 member nodes → **populated**, which is the ruling and not the convenient answer); DG-47-2's
relief landing; region 5's ADR-014 ladder holding at **its own floor row**, rendered for the first time
at viewport 1056; and the read-only invariant green **untouched**, which is ADR-002's own claim holding
at the gate that would catch it.

### What every blocker had in common, and what finally caught them

All six original blockers were one species: **a behaviour written down and never executed against the
thing it describes.** `Fleet.tsx:610` said *"Back should undo it"*; DESIGN §a11y 1 said *"`Esc` closes
it and returns focus"*; §a11y 7 listed the clear in the ≥24×24 set; DG-47-4 ruled two drops at 390;
`mocks/README.md` pinned a fixed slot. Five claims, none run. They were found at the first gate that
rendered the page and pressed the keys — **the verification was the missing execution**, which is why
the findings clustered where no lane had ever looked rather than where the code was hardest.

The two that came after are the same species mutating, and both are worth carrying:

- **F-47-V-18** — the *fix* for one of them carried a hand-transcribed sum (`gaps 24` where the row
  uses 16px twice) and the record called it *"proved to bind … one y-band, no overflow"* for the exact
  case that wrapped. A claim asserted and never executed, **inside the fix for its own instance**.
- **F-47-V-23** — the fix for *that* was measured, printed, and **misread**: `167.77 / 92.73 / 212.73`
  was reported as a success when it is non-monotone. Executed, and its meaning not read. That is the
  cheapest instance of the whole family and it needed a second reader rather than a second run.

### Residuals — open, non-blocking, and named rather than left

- **F-47-V-11** — `aof-designer` owns `DESIGN.md` and cannot edit it (`tools:` has no `Edit`); all
  three design passes returned anchored patch text applied by hand. An agent-definition change, and
  **the operator's call by standing rule.**
- **F-47-V-16(a)** — DESIGN's clause putting a non-focusable chip in the tab order is unruled; the
  build is deliberately unchanged pending the designer's ruling.
- **F-47-V-10(b)** — the chip's `title` carrying E5's payload sentence: no screenshot can assert a
  `title`, so it is owed to a headless lane.
- **The two `@uat` clauses** above, and the two staged human errands (rename; failed drill-in).
- **The layout-lane gap named by the fix pass** — this repo has no browser harness, so every layout
  claim is asserted by reading class strings, which is how F-47-V-4, -18 and -19 all shipped. Carried
  to the retrospective as a standing question, not silently absorbed.

### Status moved

`SPEC.md` → `done` (all four stories done). `01_story_board-drill-in`, `02_story_repo-filter-model`,
`03_story_filtered-fleet-surface`, `04_story_assign-row-relief` → `done`, boxes ticked in
`SPEC.md ## Stories`. `OUTCOME.md` authored by this session; `RETROSPECTIVE.md` written by
`aof:retrospective 47`; `STATE.md` compacted; `aof work memory ingest` run.
