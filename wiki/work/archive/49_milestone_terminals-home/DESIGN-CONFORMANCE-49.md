# 49 · Design conformance — the designer's verdict

Read-only judgement by `aof-designer`, judged against [`mocks/BASELINE.md`](mocks/BASELINE.md),
[`mocks/PROMPT.md`](mocks/PROMPT.md) and [`DESIGN.md`](DESIGN.md) §S1/§S2/§S3 +
DG-49-2/3/4/5/6/7/9/10. The designer did not run a browser and does **not** sign the `@uat` — the
operator does.

**Three passes are recorded here.**

| pass | date | build | renders | verdict |
|---|---|---|---|---|
| **1 — first judgement** | 2026-08-13 | payload `24850e4.20260813T192948` | 41 | **GAPS** — five |
| **2 — re-judge** | 2026-08-13 | payload `e7665e3.20260813T211419` | **16 re-captured** | **GAPS** — all five **CLOSED**, four new |
| **3 — closure re-judge** | 2026-08-13 | the redeployed bundle carrying the GAP-6/GAP-7 fixes (build id not supplied at capture) | **8 re-captured** | **GAP-6 and GAP-7 CLOSED**; GAP-8 and GAP-4r **deferred by PO ruling** |

> **HEADLINE. Every gap this review raised against milestone 49's own surfaces is closed.** The five
> from pass 1, and the two of pass 2's four that the PO scoped into this milestone. The remaining two
> — **GAP-8** (the node card's work line wraps) and **GAP-4r** (the failed state's top offset) — are
> **ruled but unbuilt**, deferred past m49 and recorded in
> [`DESIGN.md` §Ruled but UNBUILT](DESIGN.md) so the next author meets the rule rather than the
> shipped behaviour.

**Method note, unchanged:** every asset is byte-for-byte from the live origin; only
`/api/mesh/status` and the mirror are substituted. A render marked *carried forward* was **not**
re-captured against a later build and its earlier judgement stands unaltered — a reader can always
see what was judged when.

## 0 · Which baseline governs — RULED (pass 1, unchanged, and nothing since disturbs it)

`PROMPT.md:13-15` fixes the supersession rule: *until each PNG lands, DESIGN's binding checklist for
that surface **is** its baseline; once committed, the PNG becomes the visual source of truth and DESIGN
is amended in the same change.* **`mocks/` holds only `PROMPT.md`, `RESULT.md` and `BASELINE.md` — no
`s1/s2/s3-*.png`.** The supersession **never triggered**.

> **DESIGN.md's binding checklists govern. BASELINE.md is binding where DESIGN is silent and advisory
> where the two conflict** — a BASELINE-only value is a *proposal to amend DESIGN*, not a failed build.

**Not re-opened.** No re-render contradicts it. Pass 2 in fact vindicates it twice: the expanded
pane's focus ring landed on **BASELINE's own value** (§2 GAP-2), and the 520px card landed on
**BASELINE's width with DESIGN's type ramp** (§2 GAP-5) — the split §3 ruled, built as ruled.

## 1 · Verdict per render target

| target | pass 1 | pass 2 | **pass 3** |
|---|---|---|---|
| **R-A** — the home at 1280 (populated, E1, E2, E2-singular, loading, error, live production, singular summary) | GAPS — 2, 3, 4, 5 | GAPS — 2/3/4/5 **CLOSED**; new 6, 7, 4r | **CONFORMS** — GAP-6 and GAP-7 **CLOSED**; GAP-4r deferred |
| **R-B** — 760×520 | CONFORMS | *carried forward* | *carried forward* |
| **R-C** — 390 | CONFORMS | *carried forward* | *carried forward* |
| **R-D** — the tile states at 394 + the cap pages | GAPS — GAP-1 | **CONFORMS** — GAP-1 **CLOSED** | *carried forward* |
| **R-E** — the 320 floor track | CONFORMS | *carried forward* | *carried forward* |
| **R-F** — the expanded pane | GAPS — GAP-2 | **CONFORMS** — GAP-2 **CLOSED** | *carried forward* |
| **R-G** — the fleet node card (story 01) | CONFORMS at 1280; **INCONCLUSIVE** ×2 | **GAPS** — both inconclusives **CLOSED**; the rule **conforms**, its **wrap** is GAP-8 | *carried forward — GAP-8 deferred* |

## 2 · The five gaps — CLOSED or STILL OPEN

### GAP-1 · the never-fed pane offered `Hide terminal` — **CLOSED**

*Was: the highest-severity gap. DG-49-2 rules that pane opens **no socket**, so there is no
subscription to release, and DG-49-9 forbids the toggle meaning "remove this tile".*

**Closed, and closed the way the ruling asked — by absence, not by disabling.**
[`R-D-394-no-live-output.png`](renders/R-D-394-no-live-output.png): identity row `▣ aof → aof-wsl`
+ `READ-ONLY`, status row `● no live output`, and the status row's right end is **empty** — no worded
toggle, and **no `⤢` expand either**. [`R-A-1280-populated.png`](renders/R-A-1280-populated.png) tile 5
shows the same tile in the grid beside five siblings that all still carry `⤢` + `Hide terminal`, so
the absence is **local to the pane that cannot honour the control**, not a global regression.

**And this is `R-1` landing.** Pass 1 set the rule *expand is offered iff there is a pane to present*
(DESIGN states it only for the held tile; it had to generalise to the never-fed pane). The never-fed
tile now offers neither control. **R-1 is discharged by render**, and DESIGN has since absorbed it
into §S2's affordance table as a per-pane withholding rule covering both cases.

*Note for the record:* pass 1's strongest evidence was *"the only tile the live production capture
has"*. The live fleet has reported **no session at all** since — `R-A-1280-live-production` is the
**E2** screen in passes 2 and 3 — so GAP-1's closure rests on the fixture renders above. That is
sufficient (the fixture is the state's only producer), and it is stated so nobody reads the
production render's silence as evidence either way.

### GAP-2 · the focus indicator was not the house ring — **CLOSED**

*Was: the UA default — no token, 1px, no offset, and the tile got the identical treatment to a nav
text link. The one accessibility-adjacent gap, and the reason focus-return was unverifiable.*

**Closed on all three of its parts, and the colour half is closed by arithmetic rather than by
assertion.**

DESIGN's ramp fixes the ring as `--color-ring` = **`hsl(174 72% 27%)`**. Converting that HSL by hand:
C = 0.3888, X = 0.34992, m = 0.0756 → **rgb(19, 118, 109) = `#13766d`**. The measured painted ring is
`rgb(19,118,109)`, and `--color-ring` resolves to `#13766d` on both the tile and `:root`. **The three
independently agree** — DESIGN's written hsl, the resolved token, and the painted pixels. The ring is
the house token, not a near-miss and not a coincidence.

| part of the gap | evidence | verdict |
|---|---|---|
| **unmistakable at a glance across a grid** (DESIGN §focus model 5) | [`R-A-1280-focus-ring-in-grid.png`](renders/R-A-1280-focus-ring-in-grid.png) — tile 1 carries a 2px teal ring, offset clear of its own border. Pass 1's complaint was that this frame was *indistinguishable* from `R-A-1280-populated`; the two are now identical **except** the ring, and the focused tile is findable in under a second | **CLOSED** |
| **the token, at width and offset** | `2px solid rgb(19,118,109)`, `outline-offset: 2px`, `box-shadow: none`, `:focus-visible = true`; unfocused tile `outline-style: none` — the ring is keyed on focus, not painted always | **CLOSED** |
| **tile ≠ nav text link** | [`R-A-1280-focus-ring-nav-comparison.png`](renders/R-A-1280-focus-ring-nav-comparison.png) is **byte-identical to its pass-1 predecessor** — the nav is still `rgb(16,16,16) auto 1px`. Nothing was "fixed" by flattening both to one treatment; **the tile's ring changed and the nav's did not**, which is precisely the distinction pass 1 asked for | **CLOSED** |
| **the ring at the tile, magnified** | [`R-D-394-focus-ring-corner-4x.png`](renders/R-D-394-focus-ring-corner-4x.png) — at 4× the ring is a clean 2px teal stroke with a visible gap to the tile border (the +2px offset), on the light page | **CLOSED** |
| **the ring travels with focus** | [`R-D-394-focus-ring.png`](renders/R-D-394-focus-ring.png) (49/01) → [`R-D-394-focus-ring-after-arrow.png`](renders/R-D-394-focus-ring-after-arrow.png) (49/02) — one ring, moved | **CLOSED** |
| **the expanded pane's byte area on `#0b0f14`** | [`R-F-1280x800-expanded.png`](renders/R-F-1280x800-expanded.png) — the teal inset stroke runs under the header and down both edges. `rgb(19,118,109) solid 2px`, `outline-offset: -2px`, box 1280×755 at y=45 | **CLOSED** |

**On the inset offset.** The tile rings **outward** (+2px), the expanded byte area rings **inward**
(−2px). That is not a fork: it is the same token at the same width, and the inward sign has a stated
geometric reason — an outward ring at the viewport edge would be clipped, and the UA default was
invisible on `#0b0f14` by construction. It is also **exactly BASELINE §S3's own value**
(`outline:2px solid hsl(174 72% 27%); outline-offset:-2px`), which is the mock's one contribution to
this region and the build matched it without being told to. **DESIGN now records both offsets and the
reason**, so a future reviewer does not log the sign as a divergence.

**Two conformance facts worth banking:** the ring is an `outline`, so it **does not reflow the grid**
— `R-A-1280-populated` and `R-A-1280-focus-ring-in-grid` place every tile at identical coordinates.
And the outward ring needs 4px of clearance, against a 16px `gap-4` between tiles and 16px (`px-4`,
390) / 32px (`sm:px-8`, 1280) of container padding — **no width can clip it**, so its absence from the
320/390/760×520 captures is not a hole in the evidence.

### GAP-3 · the summary counts did not pluralise — **CLOSED**

*Was: `1 sessions`, `1 need input`.*

[`R-A-1280-summary-singular.png`](renders/R-A-1280-summary-singular.png) — the fixture pass 1 did not
have, with exactly one session, one live, one needing input — renders **`1 session · 1 live · 1 needs
input`**. All three singular, all three correct.
[`R-A-1280-populated.png`](renders/R-A-1280-populated.png) renders **`6 sessions · 5 live · 1 needs
input`** — plural where plural, and the `needs`/`need` split honoured *within one line*. Both
directions of the count are right, and the spelling is BASELINE's, which §3 ruled for.
**Both re-verified unchanged at pass 3** after the shared-helper refactor.

**But the fix was scoped to the summary, and that was GAP-6** — now also closed. See §2b; the
diagnosis mattered more than the symptom.

### GAP-4 · the failed page state anchored differently from its three siblings — **CLOSED**

*Was: centred, against three top-anchored siblings.*

All four page states now top-anchor. [`R-A-1280-e1.png`](renders/R-A-1280-e1.png),
[`R-A-1280-e2.png`](renders/R-A-1280-e2.png) and [`R-A-1280-loading.png`](renders/R-A-1280-loading.png)
put the card's top edge at **y = 76** (the 48px bar + the container's 28px `py-7` — exact).
[`R-A-1280-error.png`](renders/R-A-1280-error.png) is top-anchored too, no longer floating in the
middle of an 800px viewport. **The gap as stated is closed.**

**Residual — GAP-4r, LOW, does not reopen GAP-4.** The failed state's box starts at **y ≈ 118**, 42px
below its three siblings, and is **448px** wide against their 520px. The width is defensible: DESIGN
§S1 delegates this state to *"the fleet page's own failed-state treatment, reused"*, so it inherits
that treatment's box, and the 520px rule was written for the **empty/loading card** specifically. The
**42px** is not defensible by anything — it is inherited spacing, not a decision, and it means the one
state an operator meets under stress sits lower than the three they meet calm. See §2b.

### GAP-5 · the empty/loading card ran the full 1214px column — **CLOSED**

*Was: a 1214px box around three short lines; E2's why-line a single ~1100px line at ~150 characters.
The designer overrode half of BASELINE: adopt its 520px centred card, reject its 13px mono headline.*

**Closed exactly on the split.** E1, E2 and loading all render a **520px** dashed card (x 380→900),
centred, top-anchored, near-white fill, and E2's why-line now wraps to **three comfortable lines**
inside it instead of one 150-character rule across the page. The headline is the **light shell's sans
ramp**, not 13px mono — so the type fork was not taken, and BASELINE's width was. The loading card is
the same box holding one line (`Loading sessions…`), so the three states share one geometry.

**E2's replaced copy is on screen and is true.** Both `R-A-1280-e2` and the live
`R-A-1280-live-production` render K4's replacement — *"A session appears here only when its workspace
reports one — the bundle wires the session hooks that report it. A run in a workspace whose bundle has
not been updated will not appear here."* The Codex sentence story 07 falsified is gone. §3's
"neither — it is now FALSE" row is **discharged**. Nothing red, no spinner, no skeleton, one route
(`Open the fleet →`), no command — DG-49-1's restraint intact.

## 2b · Four new findings from the re-render — two CLOSED, two DEFERRED

### GAP-6 · `1 runs in flight` — **CLOSED, on the live screen**

*Was: S1 · G3 · the E2 page state, rendering `1 runs in flight · no session is reporting a terminal.`
— the highest-severity of the new four, because the live production capture showed it was the first
sentence an operator read on this milestone's own surface.*

**Closed, and closed where it mattered.**
[`R-A-1280-e2-singular.png`](renders/R-A-1280-e2-singular.png) — the fixture built for this exact case,
which had no render before — reads **`1 run in flight · no session is reporting a terminal.`**
[`R-A-1280-live-production.png`](renders/R-A-1280-live-production.png) reads **the same**, so this is
fixed on the deployed build and not only in a fixture. [`R-A-1280-e2.png`](renders/R-A-1280-e2.png)
still reads `3 runs in flight · …`, which is the control that proves the plural branch was not broken
to fix the singular one.

**What was judged by render, and what was not.** The distinction matters and is stated rather than
blurred:

| the sweep's row | judged how | verdict |
|---|---|---|
| **K3** singular and plural | `e2-singular` + `live-production` + `e2` | **CLOSED by render** |
| **G0**'s counts, both directions | `summary-singular` (`1 session · 1 live · 1 needs input`) + `populated` (`6 sessions · 5 live · 1 needs input`) | **CLOSED by render**, and unchanged by the refactor |
| **§DG-49-7**'s live region, `<K> panes need input` | **not judged — a live region does not appear in a screenshot.** Reported as now emitted | closes at DG-49-7's own close condition: the **`@uat` accessibility pass with a screen reader** |
| **K8**'s `1 live pane already` | **not judged — unreachable at the shipped cap of 16**, since the line renders only *at* the cap | no render owed; covered by the rule against the day the cap is configured to 1 |
| **K12** | untouched | **immune by construction**, as ruled |

**One implementation note is worth recording, because its shape is the rule's shape.** Reported at
capture: all four live interpolations now run through one shared
`countedPhrase(count, singular, plural)` rather than per-site ternaries, and the helper takes **the
whole agreeing phrase** rather than a stem plus `s`. That is the right call for a design reason, not
merely a tidiness one: **two of the four agree a VERB, not a noun** — `1 needs input` / `2 need
input`, and `1 pane needs input` / `<K> panes need input`. A stem-plus-`s` helper would have handled
`session`/`sessions` and `run`/`runs` and then failed on exactly the verb-agreement pair that
produced GAP-3 in the first place. **The defect was ruled twice as a property of one line; it is now
built once as a property of every count**, which is what DESIGN's re-scoped rule asked for.
*(Judged: the rendered strings. The helper is recorded as reported context, not as reviewed code.)*

### GAP-7 · G0 asserted counts it did not have — **CLOSED**

*Was: `0 sessions · 0 live` rendering in the chrome 90px above a red alert reading `Could not load the
mesh`, and again above `Loading sessions…` — a count asserted before the first fetch returned, and
after one failed.*

**Closed exactly as R-3 was written.** [`R-A-1280-error.png`](renders/R-A-1280-error.png) and
[`R-A-1280-loading.png`](renders/R-A-1280-loading.png) both render the top bar's right end **empty** —
no `0`, no `—`, no skeleton, no stale count. The page's own message is now the only thing on screen
making a claim about how many sessions there are, which is the honest arrangement.

**And the suppression does not disturb the chrome.** Across all eight pass-3 renders the four nav
links sit at identical x positions whether the slot is populated or silent — the slot yields its
content without yielding its box, so a summary that appears and disappears never moves the nav under
a cursor. That was the one geometric risk in a "render nothing" rule and it is not realised.

**RULED, on the coordinator's question — should the slot also fall silent in E1 and E2? NO. R-3
stands exactly as written and I decline to extend it.** The question is a fair one and deserves an
answer in the record rather than a silence, which is this milestone's recurring failure mode.

1. **R-3's trigger is epistemic, not cosmetic.** It fires on *"does not hold a payload"*. In E1 and E2
   the fetch **returned** and the answer genuinely **is** zero. The slot is **reporting**, not
   **guessing** — and reporting a true zero is the summary doing its job.
2. **Extending it would collapse two meanings into one form.** Today an empty slot has exactly one
   meaning: *no payload*. If it were also empty at E1 and E2 it would mean *either no payload, or the
   answer is zero* — the precise ambiguity this milestone spent ten design gaps refusing, re-created
   in the one region that had just been cleaned up.
3. **In E2 the two are not even redundant.** The card counts **runs** (`1 run in flight`); the slot
   counts **sessions and live panes** (`0 sessions · 0 live`). Different quantities. Suppressing the
   slot would delete the only place that screen states the session count at all.
4. **And a rule that fired on E1 but not E2 would key on redundancy** — a judgement about what the
   *other* region happens to say — making G0's behaviour depend on G3's copy. That coupling is a
   worse defect than the cosmetic gain it buys.

The redundancy argument is real at E1 alone (`Nothing is running.` ≈ `0 sessions · 0 live`) and the
coordinator is right that it is the weaker case. It is not weak enough to justify any of the four
costs above.

### GAP-8 · the node card's work line wraps to three lines and grows the card. **MEDIUM.**

> **DEFERRED past milestone 49 by PO ruling.** Ruled but unbuilt; the rule is carried into
> [`DESIGN.md`](DESIGN.md) as §The `(session)` line step 7 and listed in §Ruled but UNBUILT. The text
> below is pass 2's, unaltered.

**Region:** the fleet node card (R-G) · the `(session)` current-work line.

**First, what conforms** — [`R-G-760x520-node-card.png`](renders/R-G-760x520-node-card.png), the frame
pass 1 could not see because the line fell below the fold, renders **`working · aof ×2, demo
(session)`**. Judged against §The dedupe rule's six implementation steps: grouped and deduplicated
(one `aof`, not two) ✓ · count carried ✓ · **U+00D7**, not the letter `x` ✓ · distinct repos sorted
ascending (`aof` < `demo`) ✓ · joined `", "` ✓ · frame `working · <parts> (session)` unchanged ✓.
**Six of six. DG-49-8 conforms, and pass 1's 760×520 INCONCLUSIVE is CLOSED as CONFORMS.**

**Then the wrap.** [`R-G-760x520-truncation.png`](renders/R-G-760x520-truncation.png) — seven repos,
121 characters — renders **three lines** and grows the card **173 → 212px**. Measured: the line does
**not** truncate (`scrollWidth === clientWidth`, `overflow: visible`, `text-overflow: clip`,
`white-space: normal`), the `title` is present and identical to the rendered text, and nothing is
yielded — `×2`, all seven names and `(session)` all survive.

**So R-2 is discharged and must be rewritten.** Pass 1's R-2 guarded a hazard — *a truncating line
yielding the count before the names* — that **cannot occur on this line as built, because there is no
truncation styling for it to occur through.** Its premise is measured false. What replaces it is the
opposite problem.

**Expected vs observed.** DESIGN's own §The dedupe rule rejects one-line-per-session with this
argument: *"the node card's current-work line is a **one-line summary** in a row whose width is
already budgeted to a measured floor of 286px; **N lines grows a card unboundedly with sessions, and
cards in an `auto-fill` grid stretch their whole row when one grows.**"* **A wrapping line reproduces
that exact failure by a different route** — the card grows without bound in the number of distinct
repos, and in the fleet's `auto-fill` grid it stretches its whole row. The design rejected N lines and
then got N lines. Observed: three. Expected: one.

**A second, smaller defect inside the same wrap:** the break lands **inside hyphenated repo names** —
`lark-guard-` / `portal` and `whisper-` / `guard-portal` split across lines, so a reader can take one
repo for two. Even if the PO keeps wrapping, breaking inside a name is not acceptable.

**Concrete fix (rule R-2, rewritten).** *The work line is one line. When the parts do not fit, whole
repo **names** yield from the tail into a trailing `+<N> more`; a `×<n>` count is never yielded, the
`(session)` frame is never yielded, and no name is ever broken across a line or clipped mid-word.
The full value stays in `title`* — e.g. `working · aof ×2, aof-test-repo, demo +4 more (session)`.
This keeps R-2's original guarantee (names yield, counts do not, no silent under-count of the kind
m48 was fixed to remove), holds the 286px one-line budget, and does not require truncation styling
the line does not have.

### GAP-4r · the four page states do not share a top offset. **LOW.**

> **DEFERRED past milestone 49 by PO ruling.** Ruled but unbuilt; carried into [`DESIGN.md`](DESIGN.md)
> §S1's states and listed in §Ruled but UNBUILT. The text below is pass 2's, unaltered.

**Region:** S1 · G3. **Expected:** one region, one anchor — the four states replace each other in the
same box. **Observed:** E1 / E2 / loading at y = 76; failed at y ≈ 118. **Fix:** the failed state's
box top-aligns with the empty/loading card at the container's padding edge. Width may stay the
fleet treatment's; the **anchor** should not.

*Re-confirmed unchanged at pass 3* — `R-A-1280-error.png` still anchors at y ≈ 118, as expected of a
deferred finding.

## 3 · Where the two baselines disagree — who governs

Pass 1's table, with later evidence folded in. Three rows are now **discharged** — the build settled
them the way §3 ruled.

| disagreement | governs | status |
|---|---|---|
| `1 need input` (DESIGN) vs `1 needs input` (BASELINE) | **BASELINE — DESIGN was wrong** | **DISCHARGED** — DESIGN corrected, build renders `1 needs input` (`R-A-1280-summary-singular`, `R-A-1280-populated`) |
| 520px mono card (BASELINE) vs the house dashed card (DESIGN) | **split** — DESIGN on type, **BASELINE on width** | **DISCHARGED** — 520px, sans (`R-A-1280-e1/e2/loading`). The split shipped as ruled |
| **E2's "for Codex" sentence** | **neither — it was FALSE** | **DISCHARGED** — K4 replaced; the new copy is on screen and true (`R-A-1280-e2`, `R-A-1280-live-production`) |
| abbreviated summary at 390 (BASELINE) vs full (DESIGN) | **DESIGN** | stands — the shipped shell gives the summary its own 40px bar, so the full string fits |
| `stream ended` (build + feature) vs `exited (0)` (BASELINE) | **the ramp + the feature** | stands — the mirror lane carries no control frames to supply an exit code; rendering one would invent a fact. `R-A-1280-populated` tile 3 renders `stream ended` in chip and bar |
| lowercase pills (BASELINE) vs uppercase (build) | **DESIGN + PROMPT** | stands, **re-evidenced** — `R-A-1280-populated` shows `READ-ONLY` and `NEEDS INPUT` uppercase |
| 390 tile 326×270 (BASELINE) vs 358 (DESIGN) | **DESIGN** | stands — derived by arithmetic from the shipped container |
| held tile `12` vs `16` | **`MAX_LIVE_PANES`** | stands — BASELINE's `12` is a placeholder; the build renders 16 from the constant |
| **the expanded pane's focus ring** | **BASELINE — DESIGN was silent** | **DISCHARGED, and the build matched BASELINE exactly** — `2px solid hsl(174 72% 27%)`, `outline-offset:-2px` on the byte area. Now folded into DESIGN |

## 4 · Inconclusive, and what would close each

**Closed by pass 2** — `R-G at 760×520` (the work line is now in frame: **CONFORMS**, §2b GAP-8) and
`R-G's truncation case` (now rendered at seven repos: it does not truncate, it **wraps** — GAP-8).

**Still open:**

- **focus return after dismiss — STILL INCONCLUSIVE, and that frame cannot close it.** Stated plainly.
  [`R-F-1280-after-dismiss.png`](renders/R-F-1280-after-dismiss.png) paints **no ring on any tile**.
  That is **not a regression and must not be logged as one**: the dismissal available in the capture
  is a **pointer** click, and Chromium does not set `:focus-visible` after a pointer-driven
  interaction, so a correctly-returned focus is *supposed* to paint nothing there — a mouse user who
  clicked to dismiss does not need a ring. The measurement (`document.activeElement` is the source
  tile, the roving `tabindex=0` moved to it and stays) closes the **behaviour**, which is a
  task-feature outcome and QA's to sign — not a fidelity fact and not mine.
  **What is still unjudged is the design question:** does the returned focus paint the **house ring**
  when the operator dismisses from the **keyboard**, which is the path DESIGN §focus model 9 is
  written for? **Closes with one frame: a keyboard-driven dismissal, ring visible on the source tile.**
  Pass 1's stated blocker (*"with GAP-2 unfixed, focus-returned-and-painted-nothing is
  indistinguishable from focus-was-lost"*) **is gone** — the ring now exists and is unmistakable, so
  that single frame will be decisive.
- **`Could not load the mesh: fetch failed` — the string itself is STILL NOT in evidence.** Every
  capture of the failed state, through pass 3, renders a **different** branch:
  `Could not load the mesh: the mesh store is unreachable (EBUSY)`. The **frame** is judged in §5 and
  the **copy rule (R-4)** is ruled below and now carried in DESIGN; the refused-connection string's
  own appearance remains unjudged. **Closes with a render of that branch.**
- **§DG-49-7's live-region plural** (`<K> panes need input`) — **a live region does not appear in a
  screenshot.** Reported as emitted; closes at DG-49-7's own close condition, the `@uat`
  accessibility pass with a screen reader.
- **motion itself** — a still cannot show a pulse. Carried forward: the reduced/normal pairs are
  identical in every other respect, and every state stays distinguishable by word and colour inside
  the reduced frame alone. **Closes with two frames ~800ms apart.**
- **the expanded pane's letterbox band** — band and unpainted cells are both `#0b0f14`, so magnitude
  is unmeasurable from a PNG. **DESIGN now excepts the barred pane**, closing the side-effect pass 1
  flagged: *"a visible band at any documented width is a GAP"* was **unfalsifiable in a barred tile**,
  where the bar necessarily takes the box out of 640:408.
- **read-only expanded pane** — structurally unreachable. The read-only *tile* is evidenced four times
  (`R-D-394-no-live-output`, `R-A-1280-populated` tile 5, plus pass 1's pair). **Not a gap.**
- **`exited (N)`, N≠0** — no control frames on the mirror lane. **Not a gap.**
- **`unavailable`** — DG-49-10; its absence is the design.

### The two findings routed to me — RULED

**F-49-04-a — does `Could not load the mesh: fetch failed` name the fault? RULED: the frame does, the
cause segment does not.**

The **frame conforms** and DESIGN keeps it: `R-A-1280-error.png` shows `Could not load the mesh:
<cause>` plus **exactly one recovery control** (`Retry`) — it names a subject, states a cause, offers
one act, and is not a bare something-went-wrong. That satisfies §S1's *"naming the fault"*.

The **cause segment is where it fails, and the render itself supplies the standard.** `fetch failed`
is the *browser's* word for its own operation: it restates the frame (*"could not load … because
loading failed"*) and points at no fault an operator can act on. The EBUSY branch on screen does the
opposite — **`the mesh store is unreachable (EBUSY)`** names a thing, its state, and a code worth
searching. That branch is the bar, and it is already shipping in this same frame.

> **Rule R-4, now in DESIGN §S1's error state.** *The cause segment names the fault in the
> **operator's** domain — what was unreachable, refused or busy — and preserves any diagnostic code in
> parentheses. A raw platform or browser exception message is never surfaced as the cause. A refused
> connection reads as the daemon not answering, not as `fetch failed`.*

Because the render shows one branch already meeting that bar, this is a copy-mapping gap in the
branches that do not — not a new treatment to design.

**F-49-04-b — the silent re-poll failure. RULED: keep last-known, surface nothing on the grid. No
change owed, and no staleness marker.**

Three reasons, in order of weight:

1. **DESIGN already rules this exact case in the adjacent direction.** §S1's loading clause: *"A
   subsequent poll never re-enters this state — the grid keeps rendering what it has, because
   blanking a screen of live terminals every 5s is a worse failure than a 5s-old count."* A failed
   poll is the same fact (no fresh metadata) arriving by a different route. Ruling it differently
   would put two answers to one question in one document — this milestone's recurring defect.
2. **The tiles are not lying, and DESIGN says why.** §S1: *"A payload error never turns tiles into
   `error` panes — the sockets are independent of the poll, and a pane that is streaming keeps
   streaming while the metadata fetch is broken."* A streaming tile during a failed poll is reporting
   its **own socket**, first-hand. Rail 2 is not engaged.
3. **The one thing that genuinely goes stale is G0, and R-3 puts the rule there.** The summary is
   poll-derived, so *"G0 renders counts only when it holds a payload"* covers the failed re-poll and
   the failed first fetch with **one** rule, in **one** place — which is also the right answer to
   *"if a staleness marker is wanted, it belongs in `page-state.mjs`, not in that `if`."* **It belongs
   at G0**, and both halves are now built and evidenced (§2b GAP-7).

No lane pins either answer, so I ruled rather than deferred: **the `if` stays as built.** What would
reverse me: a measured case where a stale grid causes an operator to act on a session that no longer
exists — and DESIGN §focus model 8 already covers the closest version of that (a tile holding output
is never removed by a poll; it ends in place).

## 5 · What conformed, and is worth recording

**Carried forward from pass 1, untouched by any re-render:** no input row — text field, send button,
greyed-out control or command line — **in any of the 41 renders**, tile or expanded; that is PROMPT's
hardest non-negotiable and it held everywhere. `no live output` renders **top-left** (story 05's F5
fix). The held pair is exactly DG-49-4 — slot-free offers `Watch terminal →`, at-cap has no chip, no
dot and no toggle at all. The two axes never compete — pill on the identity row, chip on the status
row — at every width including the 320 floor, where **both header rows survive intact**. The mirror is
scaled and never re-wrapped: the identical truncation column appears at 320, 358, 394 and 1280. And
the non-live bar is paid for out of the byte area, proven by arithmetic: at the 1280 track the byte
box is **244px in both states** — streaming's terminal is 244, ended's is 213 plus a ~31px bar — and
the tile's outer box ends at the same y in both.

**Re-confirmed on the fixed build** (`R-A-1280-populated`, six tiles, one frame): three columns at
1280 · both header rows on every tile · `READ-ONLY` and `NEEDS INPUT` as uppercase pills on the
**identity** row, chip on the **status** row, never competing · `stream ended` and `disconnected — the
stream dropped` as in-flow bars with the cause line mandatory and the red confined to the failure ·
the free session owning its identity by **repo** (`aof → aof-wsl`) with no repo repeated in C1b ·
still **no input row anywhere** · and the grid unmoved by the focus ring.

**From pass 2, and worth banking:**

- **The `(session)` dedupe rule renders correctly at both widths** — `working · aof ×2, demo
  (session)` at 1280 and 760×520, six of six implementation steps. m48's routed gap is discharged on
  screen (its overflow behaviour is GAP-8, deferred; the rule itself conforms).
- **The expanded pane holds up** — `▣ TERMINAL` back at width, identity with its `session` tail, state
  chip, the **always-visible** exit control at `ml-auto`, the letterbox band present and correct at
  the bottom, the mirror scaled and readable at last, and no input row.
- **The GAP-2 fix did not flatten the focus system to make the gap go away.** The nav comparison frame
  is byte-identical to its predecessor. Only the surface that owed a ring gained one.

**From pass 3:**

- **The live production screen is now correct in the one sentence it shows.** `1 run in flight · no
  session is reporting a terminal.` — the string whose broken singular pass 2 called the first
  sentence an operator reads on this milestone's own surface.
- **A suppressed summary does not move the chrome.** Across all eight pass-3 renders the four nav
  links hold identical x positions whether G0 is populated or silent. The slot yields its content
  without yielding its box.
- **The plural branches survived the singular fix, in both directions and in both strings** —
  `3 runs in flight` and `6 sessions · 5 live · 1 needs input` are unchanged beside
  `1 run in flight` and `1 session · 1 live · 1 needs input`. The pair of controls is what makes this
  a closure rather than a swap of one wrong string for another.
