---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: what was checked, by whom, with what evidence?
  Owner: the verify session (the PO/orchestrator). Evidence agents REPORT; they do not author here.
  Findings are triaged into STATE.md `## Feedback (for retro)` and TECH_DEBT.md, not restated.
-->
# 49 · The terminals home — Verification

## Method

Verified per-story as each lands, during `aof:continue 49` → `aof:autonomous 49` (2026-08-13).

**Every result recorded below was executed by the verify session**, not accepted from an agent's
report. The build, structural-review and behavioural-review agents each reported green; each claim was
then re-run here before it was written down. That is deliberate and it earned its keep immediately —
the build reported a two-file production change, and by the time the reviews returned **one of those
two files had been reverted in the working tree** (see F-49-00-b below). A verification that relayed
its agents' reports would have recorded a green that no longer existed.

Test isolation was `AOF_GLOBAL_HOME="$(mktemp -d)"` on every run, via focused drivers that import each
suite's **exported test array**. Never `scripts/test.mjs` (the full suite binds `:4182`, held by the
live control daemon on this machine), and never `node --test <file>` — on these suites that runs only
the wrapper and not the array, reporting green over red (TECH_DEBT 27).

## Verification evidence

### Story 00 · `needs-input` reaches the wire — **ACCEPTED**

Contract: `stories/00_story_needs-input-on-the-wire/tasks/00_the-projection-carries-the-code.feature`
— 6 scenarios, of which two are Scenario Outlines (7 rows + 3 rows). All `@executable`; **no `@manual`
and no `@uat` lane**, so no human gate.

**Production change** — 2 lines of behaviour, both pure insertions:

| file | change |
|---|---|
| `src/global-mesh-query.mjs` | `projectAssignment(row)` appends `code` under `sessionId`'s own guard, copied byte-for-byte: `typeof row.code === "string" && row.code.length > 0` |
| `ui/src/fleet/api.ts` | `WorkAssignment` gains `code?: string`, appended after `sessionId?: string` |

`src/assignment-record.mjs` — measured at **← 38 dependents**, a god-node — is **unedited**, and the
two `shapeGlobalStatus` call sites are untouched. One function edited, not three.

**`@executable` — behavioural lanes**, re-run here on the restored tree:

| suite | scenarios | result |
|---|---|---|
| `assignment-fleet-status-shape` | 3 (all 7 rows), 5 | **green** |
| `fleet-terminal-view-surface` | 1, 2, 4 (all 3 rows), 6 | **green** |
| **story total** | 6 scenarios / 10 Examples rows | **15 / 15** |
| whole-file context | both suites end to end | 40 passed, **2 failed (pre-existing, F-49-00-a)** |

**Scenario 6's exit-zero clause, independently executed here:** `npx tsc -b ui --force` → **exit 0**.
This clause had **never run** before this verification — it is guard-if-present and was silently
skipping (§F-49-00-c). It is now genuinely observed.

**Fitness functions:** 19 arch-tests over this seam → **96 / 96**, including
`acd-fleet-terminal-input-constrained`, `acd-session-entry-frozen-wire`, `acd-assignment-record-frozen`,
`acd-terminal-control-boundary`, `acd-terminal-server-only`.

**Not hollow — proven by mutation, not by assertion.** QA ran a 9-mutation matrix in a sandboxed HEAD
copy; the load-bearing results:

| mutation | effect |
|---|---|
| drop the guard entirely | 9 lanes red, incl. all 3 of Scenario 4 |
| `projected.code = row.code ?? null` | **trap 2 reproduced** — the shipped 8-key deep-equal gate goes RED |
| whitelist to `=== "needs-input"` | exactly rows 2, 3 + Scenario 4's `resumed` go red — the anti-filter proof |
| `if ("code" in row)` | trap 3 — 5 lanes red |
| `row.code.trim().length > 0` | the whitespace row alone goes red, earning its place |
| node call-site `delete p.code` | Scenario 2 + 4 rows of Scenario 3 — both attachment points are real |
| control node's absent-is-not-a-clear | Scenario 4 row 1 **only**, with the right message |

**Structural verdict (`aof-architect`): conformant to ADR-004.** Graph rebuilt fresh at the decision
point (9,633 nodes / 23,326 edges): `ui/src/fleet/api.ts` ← 3 importers, **→ 0** — no reader gained, so
no rendering leaked in. `src/global-mesh-query.mjs` 562 → 588 lines; no degradation attributable.

**Behavioural verdict (`aof-qa`): coverage complete, no hollow lane.** Every scenario and every
Examples row maps to a named executing lane; no lane asserts a chip, a mark, a class or a role
(rendering is story 05's).

### Story 01 · One repo, said once — **BUILT, REVIEWED, `@uat` OPEN**

Contract: two task features — `00_the-line-deduplicates-and-counts.feature` (9 `@executable` lanes
incl. 4 Scenario Outlines; **plus a `@uat @design` scenario**) and `01_both-surfaces-say-the-same-words.feature`
(7 `@executable` arch scenarios; **plus a `@manual` scenario**).

**Four things moved together, as ADR-010 requires:** the JS formatter (`ui/src/fleet/runs.mjs`), the
Rust view-model (`app/desktop/crates/core/src/{status.rs,view_model.rs}`), the rewritten m48 pin
(`test/mesh-fleet-session-subsumption-render.test.mjs` row 6), and **the fifth captured fixture**.

**The fixture is the story, and its necessity was MEASURED rather than argued.** Both reviewers
independently drove the gate **exactly as it ships at HEAD** (byte-identical detectors, staged outside
the working tree) against a deliberately-divided pair of implementations:

| variant | JS half | Rust half | gate as shipped at HEAD |
|---|---|---|---|
| A | no dedupe | delivered **minus** the fifth fixture | **GREEN — blind** |
| B | no dedupe | delivered (5 fixtures) | **RED** |
| C | delivered | dedupe literal reverted | **RED** |
| D | delivered | delivered | **GREEN** |

The teeth come from the **fixture**, not from the new lanes: the gate that goes red in B contains no
milestone-49 code at all. Re-confirmed at file level *after* the rename, with sha256 before/after
proving the tree was restored.

**Results, re-run here after the review fixes:**

| lane | result |
|---|---|
| `mesh-fleet-repo-dedupe-count` (task 00) | **9 / 9** |
| `mesh-fleet-session-subsumption-render` (the rewritten pin) | **5 / 5** |
| `arch/acd-captured-producer-fixture` (task 01) | **12 / 12** |
| every suite reading the touched files (9 suites) | **92 / 92** |
| `cargo test --manifest-path app/desktop/Cargo.toml` | **85 passed / 0 failed** (was 80; +5 `m49_*`) |
| `node ./scripts/ui-build.mjs` | tsc -b clean, vite green |

**The multiplication sign was verified at codepoint level in the shipped sources, not their tests** —
`runs.mjs` 9 raw U+00D7, `status.rs` 6 raw U+00D7, and the literal text `\u{d7}` in **neither**.

**Row 6 was rewritten, not deleted** — case label and presence payload are *context lines* in the diff
(byte-identical); only the expectation moved, and its rule-form assertion was replaced by **another
rule** (`sessionLineRuleViolations`), never by a literal.

**`@manual` (task 01) — 3 of 4 clauses PASS, clause 3 PENDING.** QA re-ran the capture independently:
stdout **byte-identical** to the committed fixture once the four instants are masked, with instants
internally ordered like a real run (`publishedAt < alpha < bravo < heartbeatAt`) — which a hand-typed
fixture rarely gets right. Clause 3 ("captured in the **same commit** as the rule") is **not yet
satisfiable — nothing is committed**. Whoever commits must land `ui/src/fleet/runs.mjs`, both Rust
files and the fifth fixture **in one commit**.

**`@uat @design` (task 00 :262) — OPEN, not signed off.** Automation has already settled *the words*:
both surfaces render exactly `working · aof ×2, demo (session)` for `[aof, aof, demo]` — 32 characters,
`aof` once. What remains is human-only and needs a fleet render with a seeded two-session node:
(1) the line occupies **one** line at 1280 and at 760×520, unwrapped and untruncated; (2) if it clips
at the 286px row floor, **the count is not what is lost** to the ellipsis; (3) the desktop app's row
prints the same words as rendered; (4) an operator asked "how many sessions in aof?" answers from the
line alone. *A reviewer must not log the absence of a terminals-home frame — this render is the fleet
node card (R-G).*

**Six review findings were fixed** (architect 1–5, QA F1) and three deliberately deferred (QA F3/F4/F5).

### Story 02 · The home's pure core — **ACCEPTED** (critical path)

Three framework-free modules in the new `ui/src/home/` (`feed-axis`, `socket-cap`, `layout`, each with a
`.d.mts`), four fitness gates, four behavioural suites. Renders nothing; imported by no component.

**Final: 267 / 0** (feed-axis 72 · socket-cap 75 · layout 51 · directory-budget 32 · the arch gates),
every `ui/src`-sweeping gate green, `tsc -b` clean. Validate PASS.

**Not hollow — a 20-mutation matrix**, every one previously green, now red: the raw NUL restored, the
arbiter renamed, each cap-justification clause deleted independently, a fabricated `at-cap`, a coerced
cause, the separator changed to `-`, newcomers keyed rather than indexed, the retention pass disabled,
`identified.filter(key != null)`, a capped-out release labelled `hidden`, `cap-lowered` as a
fall-through, a silent release, `demoted: []` restored, an inverted shrink ranking, a free slot given to
a newcomer, and `subscribed` counting rows.

**The two reviews found different classes of defect, and both mattered.** The architect found the diff
was **binary to git**; QA found task 01's adversarial axis was **cap-only** — twenty malformed caps,
zero malformed rows — so a mutation dropping unaddressable rows survived all 207 lanes.

**The developer found a third on its own judgement, and was right to.** ADR-006 (5a) holds the
invariants for *every* input, and duplicate-tuple rows are an input:
`subscribedPaneSet([twin, twin2], 1, {}, [])` returned `subscribed.length === 2` **against `cap: 1`** —
I1 false as written. `retained` / `declined` / `subscribed` are now per-**pane**; `decisions` stays
per-row; no behaviour change for well-formed input.

### Story 03 · The pane declares itself, and the gate says so — **BUILT, REVIEWED**

The milestone's one deliberate reversal. Fourth host `HOST_GRID_PANE = "grid-pane"` with all eight
affordances declared *including the absences, each with a reason*; the posture's single author
(`ui/src/home/session-mount.mjs`); invariant 4 amended in exactly one of its three parts.
**135 new lanes** (34 + 37 + 64). Validate PASS. **No new gate authored — five amended.**

**The mandatory floor plant, driven five ways** against the shipped `mountSiteOffenders`: delete the one
`ui/src/home/**` file carrying `<TerminalControl` while Fleet's and Board's remain → the clause goes
**RED** and names the surface. Critically, the **replaced whole-clause floor is asserted still satisfied
by the surviving Fleet/Board matches on that same plant** — the hazard argued rather than described.

**Strictly stronger, and runnable rather than reviewed:** 12 surviving assertions re-run (the needle
literals asserted unchanged by regex over the gate's own source), 8 additions, and a clause asserting
**no exemption list of any shape** exists — the only path-scoped exclusion being the pre-existing
`.d.mts` filter, asserted unchanged.

### Story 04 · `/` becomes the terminals home — **BUILT, REVIEWED, `@manual` + `@uat` OPEN**

`Landing.tsx` **deleted** — no importer, no rendered tree at any of five routes carrying the
placeholder, and **0 occurrences in the built bundle**. `SHELL_RENDERED_ROUTES` narrows to
`["not-found"]`; `Shell.tsx` 931 → **930** net-negative; `shell-layout.mjs` **1016 → 1016 with zero
lines added**, which is TECH_DEBT 33's own named prediction for this milestone, verified against the
exact-count assertion rather than the ceiling.

**Final: 106 behavioural + 55 arch = 161 / 0.** Nine review fixes, each with a previously-surviving
mutant now killed.

**The architect caught a defect invisible at this story's own scale.** The home declared `content:fixed`
but never **obtained** the fixed box: the shell's content region is `min-h-0 flex-1 overflow-hidden`, so
`main` is not a flex container and `SurfaceBoundary.render()` adds no wrapper — `flex-1` is inert, the
root's height is `auto`, and the grid's `overflow-y-auto` **can never engage**. One card fits, so
nothing looks wrong. **Reassigned to story 05**, where sixteen panes make the consequence observable.

**A fix relayed from review was measured VACUOUS and corrected by the builder** — the value assertion
proposed for the truth table cannot distinguish `list.includes(id)` from a hard-coded
`routeId === "not-found"`, because `SHELL_RENDERED_ROUTES` has exactly one member. Kept (it is not
vacuous in general) and joined by a source-read clause that does kill the mutant.

### Story 06 · The pulse honours reduced motion — **BUILT, `@manual` ×4 + `@uat` OPEN**

**Two lines of mechanism** — one `@media (prefers-reduced-motion: reduce)` block silencing
`.animate-pulse` beside the `.aof-pending` it already named, plus the false comment corrected rather
than deleted. Validate PASS after the retag below.

Verified in the **rebuilt** stylesheet, not the source: Tailwind's `.animate-pulse` sits inside
`@layer utilities`; this block is **unlayered**, so it wins on both cascade-layer precedence and source
order. The fitness function was driven against the **historical** block over the real tree — it goes red
on **12 sites** and names `palette.mjs → animate-pulse` first.

**Eleven other `animate-pulse` sites are fixed incidentally and correctly by the one rule, with none of
their files opened** — which is why the fix is one CSS rule rather than twelve edits.

**Three scenarios retagged `@executable` → `@manual` by the PO**, applying the architect's already-recorded
ruling that the browser lane is declined for this milestone ("*The scenarios move to `@manual`
unchanged*"). The developer followed the ruling and correctly refused to edit a locked contract. A
**third** scenario belonged to that group and was missed by its own mapping table — every clause of
`:208` is a computed-style claim sitting between two source-lane scenarios. Its source-level half is
covered `@executable` inside scenario 1.

Moving to `@manual` did **not** mean moving to unmeasured: all 16 rows were driven in headless Chromium
against the rebuilt stylesheet — under reduce both words differ, both dot colours differ, both label
colours differ, and **zero** differences across every other measured property.

### Story 08 · The harness can drive a grid — **BUILT, REVIEWED**

TECH_DEBT 29's remedy finished. **34 lanes**, 249/249 across 24 stub-relying surface suites unaffected,
both shipping consumers **byte-identical to HEAD**.

**The PO-ruled known-answer proof:** `grid/01`/`grid/02` copy every value from the shipped board-dock and
fleet-card tests — the same PTY URL, counts, `parentElement.tagName`, chip word — so the harness
reproduces m46's own passing assertions at N=1 before being believed at N=12. `grid/06` closes the loop:
the same mount alone and at index 7 of twelve is byte-identical.

**QA defeated the single highest-value guard, and it was fixed.** `withTerminalControl` refused
caller-supplied `stubs`/`resolve`, but **`entry` was unconstrained** — a fake control mounted 20 panes
with `sockets()=0` and satisfied a cap-shaped absence assertion. Task 00's trap (a) names that hazard in
terms and scenario 9 pinned only the stub-set half. This is m46's failure in new clothes, and story 05's
contracts are largely *absence* assertions. **Closed:** an entry must bundle the real control unless the
caller declares `terminals: false`, and declaring it **withholds the pane driver entirely**.

**Two further load-bearing survivors closed:** reading `host.parentElement` lazily instead of freezing at
`open()` broke attribution the moment a pane is presented (fullscreen **re-parents** it) yet survived all
28 lanes; and an unattributable socket was silently **adopted by a neighbour** rather than refused — safe
today only because the control's session effect is one synchronous body, dangerous the day 05's arbiter
pools a subscription. `unattributedSockets()` must now be `[]`.

**Settle bound: measured, not raised** — 1,1,1,1 at N = 1/3/12/20 against a bound of 50, independently
re-measured by QA. But the *assertion* could not fail (raising the bound to 500, or a reporter returning
0, both survived), so it now asserts the **value**.

**15 of 16 mutants killed.** The survivor is knowingly correct — each lane gets a fresh module instance,
so the shell reset is unobservable — and rather than merely documenting that, `driver.shell.instance()`
now asserts two lanes hold **different objects**, so the day someone caches the bundle file that
assertion goes red and forces the question.

### Story 05 · The grid of live panes — **BUILT, REVIEWED, 6 FIXES; `@uat` OPEN**

The milestone's heart. `Home.tsx` (page states) → `SessionGrid.tsx` (rows, arbitration, focus, the one
live region) → `SessionPane.tsx` (**the surface's only mount site**) → `TerminalControl`. **28 lanes**
across six `@executable` features; task 06 is an entire `@uat`.

**The socket proof is real, not structural.** The lane mounts the product's own chain through story
08's entry guard — which refuses a substitute *before anything mounts* — and asserts the composed
`ws://127.0.0.1:4181/ws/terminal-view?nodeId=…&sessionId=…` with `unattributedSockets()` empty.
Deleting `mount.bound &&` from the binding memo turns it red. TECH_DEBT 29's lesson discharged.

**Six review findings, all in this story's own files, all fixed — and the first was a product defect
every green test had hidden:**

| id | measured before | after |
|---|---|---|
| **F1** | **20 open sockets at `MAX_LIVE_PANES = 16`** — the grid handed the arbiter only `FEED_PRODUCER_KNOWN` tiles, so a *retained* (`FEED_ROSTER_GONE`) tile kept its socket **and was invisible to the arbiter**, which refilled its slot. Unbounded under churn; breaks **ADR-006 I1**, the obligation the 256 KiB replay burst and `MAX_TAIL_KEYS = 64` actually buy. | **≤ 16** under the same four-leave/four-arrive churn, retained tiles **counted, not removed**; the `live` summary no longer under-reports the screen |
| **F2** | a retained tile **10 polls past** its row's departure, socket open — `painted` only grew and `retained` re-derived from a ref already holding it: a **fixed point**. Defeats ADR-009's load-bearing negative by a mechanism that is not `localStorage` but is the same lie | ends **in place** on a finished socket, leaves on the next poll |
| **F3** | a retained tile was `POSTURE_INTERACTIVE` — **typeable into a session the mesh no longer lists**, the two-hop silent drop ADR-007 exists to prevent | a new `presents` declaration withholds the door, which by DG-49-5's own ruling withholds the keyboard — **at zero identity cost**, the socket stays open |
| **F4** | `Hide terminal` on a `no-producer` tile **did nothing** — `decision == null ? true : …` absorbed two populations with opposite needs. **ADR-006 AMENDMENT (5d) reproduced one layer up by the same author** | one authority per population, each keyed on a named input |
| **F5** | the `no live output` line rendered **centred**; DG-49-2 says top-left in three places | placement is a **descriptor field in `state-ramp.mjs`**, never a branch in the `.tsx` |
| **F6** | **4 live regions, not 1** — 1 `aria-live` + **3 `role="status"`**, which *is* an implicit polite region, unconditioned by `hostAnnouncesState`. The suite's clause counted only `props["aria-live"]` and could not see it | the bar's role follows the same host declaration the chip's does; the gate counts implicit regions beside explicit ones |

**The architect corrected its own amendment.** ADR-003 ruled the unfed pane `idle` — that stands — but
its parenthetical claim that `PANE_EMPTY_HOST` "is exactly the shape DG-49-2 asks for" is **false**, and
it "had no business ruling a treatment while ruling a state". DESIGN governs.

**Four routed deviations ratified**, two with compensating obligations: `standing` (ADR-007's "no new
prop" **superseded** — the prop carries *no decision*; `terminalPaneStanding` is the entire meaning and
every branch keys on a host declaration, never a surface name; `standing == null` is m46 **by value**),
`roster-gone` off the mount (mechanism right, consequence → F3), K10's read-only title (deferred →
TECH_DEBT 42, tied to the K13 copy so `input-policy.mjs`'s 12 dependents are opened once), and
`onReport({painted})` (a fact, not a decision, on an existing channel).

**`TerminalControl.tsx` finishes at exactly 840 — its ceiling, zero headroom.** ADR-001 wanted
net-negative and could not have it (~+90 lines of amended-ADR-007 mechanism and grid wiring). The
extraction into **existing** components is ratified as *the better form of ADR-001's remedy*; the zero
headroom is **TECH_DEBT 40**, with the next cut named (the session effect). **The next author must
extract — there is no room to append.**

**Two contract clauses were amended by the PO** because they pinned the per-tile `role="status"` that
F6 removes, while the same feature's headline ruled out muting it — no spelling satisfied both. The
developer implemented the ruling and **named the clash rather than picking a side silently.**

## `@manual` lanes — driven against the LIVE DEPLOYED BUILD, 2026-08-13

Operator deployed and restarted at the verify session's request. **Payload `24850e4.20260813T192948`**
— `~/.aof/bin/BUILD_ID.json` `installedAt 2026-08-13T18:29:48.794Z`, and `git rev-parse --short HEAD`
= `24850e4`: **the payload IS HEAD**, not a stale copy. Served assets
`/assets/index-BEBROpJ1.js` (830,927 B) and `/assets/index-D2NPfpGb.css` (46,801 B).

Driven over **CDP** against the cached Chromium (`chromium-1187`), fresh `--user-data-dir` per launch
plus `Network.setCacheDisabled` — a genuine cold cache. **No `--virtual-time-budget`**: it wedged for
120 s and was killed, reproducing the artefact RESEARCH §Q3 already records. Every reading below is
from a real settle.

### Story 04 · `00_the-route-is-the-home.feature:256` — **6 / 6 PASS**

| clause | evidence |
|---|---|
| the home renders at `/` | `[data-home-state]` = **`E2`**, `h1` = `Live terminals` (`sr-only`), slot = `0 sessions · 0 live` |
| **no frame shows the placeholder** | a sentinel installed via `Page.addScriptToEvaluateOnNewDocument` — before any app script — ran a `MutationObserver` over the whole subtree plus a rAF poll: **239 frames sampled, `placeholderSeen: []`**. Earliest text ever observed is the loading line. |
| the page does not scroll | at 1440×900, `scrollHeight 749 === clientHeight === innerHeight`; **8 real wheel events totalling 3200px of intent** left `scrollY 0 → 0` and the header at `top 0 / bottom 48` **unmoved**. At a forced 1200×240 the home root computes to **exactly 192px = 240 − 48 chrome − 0 dock** — story 05's `CONTENT_FIXED_HEIGHT_CLASS` doing its job on the served build. |
| the four legacy addresses | `?mode=fleet→/fleet`, `board→/board`, `assets→/config`, `wat→/config`. **The compound address** `/?repo=aof&mode=board&scope=all%20nodes&empty=&flag#ref-49%2F04-pane` → `/board?repo=aof&scope=all+nodes&empty=&flag=#ref-49%2F04-pane` — every other parameter and the fragment **byte-for-byte**, including the encoded `/`. |
| back button, no bounce | `history.length` stayed **10** across three backs, and `Page.getNavigationHistory` contains **no `?mode=` URL at all** — the mechanical reason a bounce is impossible: the rewrite is a `replaceState`. |
| console clean | `Runtime.consoleAPICalled` = **0** and `Runtime.exceptionThrown` = **0** on all five addresses. The `Log`-domain 404s (`/api/config`, `/favicon.ico`, `/api/work/list`, `/api/fleet-origin`) are the documented origin-blind API degradation and **pre-date m49** — `fetch("/api/config")` is at `Shell.tsx:738` in m47's `0e2688f`. |

### Story 06 · four `@manual` scenarios — **three PASS, one needs the operator**

Composed from the class strings the **shipped ramp emits**, rendered **same-origin** against the
**served** stylesheet (`document.styleSheets[0].cssRules.length` = 119 — the real sheet, readable, not
a cross-origin stub). `matchMedia` measured **`false`** plain and **`true`** under
`--force-prefers-reduced-motion` in the same run.

- **~:179 — 16 / 16 rows.** `connecting` and `streaming` are `pulse / 2s` → `none / 0s`; the other six
  states are `none / 0s` in both columns. The `unknown` rows are genuinely exercised (its own
  descriptor, not a `TERMINAL_STATES` member). **Exactly one** reduce block exists in the whole served
  stylesheet: `@media(prefers-reduced-motion:reduce){.aof-pending,.animate-pulse{animation:none}}`.
- **~:225 — `.aof-pending` undisturbed.** `aof-shimmer / 0.9s` → `none / 0s`, in the same document as
  the dots, which is what makes it a non-regression rather than a separate claim.
- **~:247 — distinguishability survives, with one clarification that sharpens an earlier claim.**
  Words differ (`connecting…` / `streaming`), dot colours differ and are **unchanged** across
  conditions (`rgb(219,224,230)` / `rgb(19,118,109)`), label colours unchanged, and size, shape and
  border unchanged. **Correction to the build's own summary:** sweeping every property, the one delta
  is `opacity` on the two pulsing dots (`0.543 → 1`) — because the served keyframes are
  `@keyframes pulse{50%{opacity:.5}}`, so opacity **is** the animated channel and `0.543` is a
  mid-cycle sample. The honest form is *"zero differences on every **non-animated** property"*.
- **On the real deployed DOM**, not a composed document: `/fleet` shows **9 animating elements** with
  no preference (2 × `animate-pulse`, 7 × `.aof-pending`) and **0** under reduce, with `elementCount`
  **identical at 5551** and the same element counts per class. Nothing removed; only the animation
  stopped. The eleven other `animate-pulse` sites the feature predicted would be fixed incidentally
  are now **observed** fixed on the deployed build.

### ~:267 — **NOT VERIFIABLE without the operator; partially discharged**

No accessibility setting was touched. Read-only from the registry: `UserPreferencesMask` byte 2 =
`0x07`, so **`CLIENTAREAANIMATION` is True**, and `WindowMetrics\MinAnimate` = `1` — the machine is in
**Animation effects ON**, i.e. the operator has not asked for reduced motion. With the OS in that
state a browser launched with **no override** reports `matches === false` and the pulses do animate,
which is one real half of the mapping.

**What `--force-prefers-reduced-motion` cannot prove:** that Chrome maps *Settings → Accessibility →
Visual effects → Animation effects OFF* onto the media query on this Windows build. It proves the CSS,
not the platform — and that is precisely why the scenario stayed `@manual`.

**A second, independent blocker:** **no deployed surface currently carries a live terminal state dot at
all.** The home is in `E2` (`0 sessions · 0 live`) and the sweep found **0** elements matching the
shipped dot geometry (`h-[7px]`) on `/`, `/fleet` or `/board`. *"Watch a pane for thirty seconds"* has
no object of observation on this machine right now.

**RULED AT ACCEPT, 2026-08-13 (operator decision): deferred, documented open — the milestone's one
un-dischargeable lane, and it does not hold the accept.** Both blockers are environmental and neither
is a property of the delivered code: the OS setting is the operator's to turn, and a live session is
not something this milestone spawns (the "new session" verb is milestone 50, explicitly out of scope).
Everything the CSS itself can prove **is** proven — 16/16 rows in headless Chromium against the served
stylesheet, `.aof-pending` undisturbed in the same document, and on the real deployed `/fleet` **9
animating elements → 0** under reduce with `elementCount` identical at 5551 and the same count per
class, so nothing was removed and only the animation stopped. What remains unproven is exactly one
claim, stated narrowly so it is not mistaken for more: **that Chrome on this Windows build maps
*Settings → Accessibility → Visual effects → Animation effects OFF* onto `prefers-reduced-motion`.**
That is a platform fact, not a milestone-49 fact, and it will be discharged the first time an operator
with the setting on opens a surface with a live pane.

### Story 01 · `01_both-surfaces-say-the-same-words.feature:219` `@manual` — **now 4 / 4 PASS**

Clauses 1, 2 and 4 passed at review (byte-identical captured stdout once the four instants are masked;
provenance naming the commands and the instant; not case-distinct). **Clause 3 — "captured in the same
commit as the rule" — is now satisfied**: `ui/src/fleet/runs.mjs`, `app/desktop/crates/core/src/status.rs`
and `view_model.rs` (which carries the fifth fixture) all last changed in **`ad1cf48`**. One commit,
all four moving parts.

## The design-conformance RE-RENDER — 2026-08-13, after the gap fixes

The designer's `GAPS` verdict judged 41 renders of payload `24850e4`; the five gaps were closed in
`b2b8b6a` and `9490228`, **after** that payload. So the recorded verdict describes a build carrying
none of the fixes, and the fixes were evidenced only by test lanes. Sixteen screens were re-captured
against the deployed `e7665e3` build by the same method as the original set — every asset proxied
byte-for-byte from `:4181`, only `/api/mesh/status` and the mirror substituted, Chromium `1187` over
CDP, fresh profile per launch, `Network.setCacheDisabled`, no `--virtual-time-budget`.

**Two renders are new**, and each exists because the original set could not show the thing being
judged: `R-A-1280-summary-singular.png` (exactly 1 session / 1 live / 1 needing input — GAP-3's real
case, which a 6-session fixture cannot express) and `R-G-760x520-truncation.png` (a node running seven
distinct repos, so the work line has to yield something).

**The computed readings, which are the half a still cannot carry.** The designer declined to judge ring
*colour* from a headless still — correctly, since headless paints the UA ring near-black where headed
Chrome paints the platform accent — so GAP-2's closure is carried by the computed value:

| element | computed |
|---|---|
| focused tile (keyboard) | `outline: rgb(19,118,109) solid 2px`, `outline-offset: 2px`, `:focus-visible true` |
| `--color-ring` | `#13766d` = `rgb(19,118,109)` on both the tile and `:root` — the painted ring **is** the token |
| unfocused tile | `outline-style: none` — keyed on focus, not painted always |
| nav text link (unchanged) | `outline: rgb(16,16,16) auto 1px` — still the UA default, which is what makes tile ≠ link |
| expanded pane, focus in the byte area | `outline: rgb(19,118,109) solid 2px`, offset **`-2px`** — inset, because an outward ring clips at the viewport edge and the UA default is invisible on `#0b0f14` |

**The designer's re-judge: all five original gaps CLOSED; verdict still `GAPS` on four new ones.** Full
region-by-region reasoning in [DESIGN-CONFORMANCE-49.md](DESIGN-CONFORMANCE-49.md), rewritten in place
with pass 1's judgements carried forward rather than deleted. The load-bearing points:

- **Nothing was broken closing them.** `R-A-1280-focus-ring-nav-comparison.png` is byte-identical to
  its predecessor — the ring was added to the tile, not the focus system flattened until the gap
  disappeared. GAP-2's colour half was closed by **arithmetic**, not by trusting the handed reading:
  the designer converted DESIGN's own `hsl(174 72% 27%)` by hand to `rgb(19,118,109)` and matched it
  against the measured paint.
- **GAP-1 is closed by absence** — the never-fed tile carries no toggle *and* no expand while five
  sibling tiles keep both, which also discharges rule R-1 by render.
- **Both R-G INCONCLUSIVEs are closed as CONFORMS.** `working · aof ×2, demo (session)` is judged
  against all six of the dedupe rule's implementation steps — grouped, counted, U+00D7 not the letter
  `x`, distinct repos ascending, joined `", "`, frame unchanged — at both widths. DG-49-8 discharged.
- **One INCONCLUSIVE survives and is stated as unclosable from what exists:** focus return after
  dismiss. The absent ring in `R-F-1280-after-dismiss.png` is Chromium's `:focus-visible` modality
  after a *pointer* dismissal, correct behaviour rather than a regression, so that frame cannot close
  it. **One keyboard-driven dismissal frame closes it**, and pass 1's blocker (no ring existed at all)
  is gone. The *behaviour* is separately measured: focus returns to the source tile and the roving
  `tabindex=0` moves with it.

**R-G's truncation case does not truncate — it wraps, and that changes what is being judged.** At
760×520 the work line measures 307px with `scrollWidth === clientWidth`, `overflow: visible`,
`text-overflow: clip`, `white-space: normal`: 121 characters over **three lines**, the card growing
173 → 212px to hold them. Nothing is yielded — the `×2`, all seven repo names and the `(session)` frame
all survive — and the `title` attribute is present and identical to the rendered text in both cases. So
**rule R-2's hazard cannot occur on this line as built**, there being no truncation styling for it to
occur through.

## GAP-6 and GAP-7, closed at accept — built, and observed on the deployed bundle

The PO ruled (operator-confirmed) that GAP-6 and GAP-7 close here and GAP-8/GAP-4r defer: both of the
first two are on this milestone's own surface and both are its own headline claim — SPEC scopes
*"honest empty and degraded states … each says what is true"* — while GAP-8 is on the fleet node card
and needs new yield behaviour with a Rust half the cross-surface gate compares byte-for-byte.

**GAP-6 was fixed as the rule, not as the string**, which is the whole point of the designer's
diagnosis. One shared `countedPhrase(count, singular, plural)` in `page-state.mjs` now emits all four
live interpolations — K3, G0's two, K8's `1 live pane already`, and DG-49-7's live region (which gains
the plural `<K> panes need input`, previously unwritten in DESIGN). It takes the **whole agreeing
phrase** rather than a stem plus `s`, because two of the four agree a *verb* (`1 needs input` /
`4 need input`) — which the fleet's own `plural(n, word)` cannot express and which ADR-001's boundary
forbids importing anyway. It lives in `page-state.mjs` rather than a new module because
`ui/src/home/` is **at** its 15-file ceiling with a declared allowance of 0. K12 is untouched and
immune by construction.

**GAP-7 (R-3)** — `homeSlotSummary` takes the page state and returns **nothing** unless the state holds
a payload. The slot *node* is still contributed in all five states; only the counts wait.

**Re-rendered on the redeployed bundle and read off the DOM at capture:**

| render | page state | G0 slot | E2 line |
|---|---|---|---|
| `R-A-1280-e2-singular` (new) | E2 | `0 sessions · 0 live` | **`1 run in flight · …`** |
| `R-A-1280-e2` | E2 | `0 sessions · 0 live` | `3 runs in flight · …` — unchanged |
| `R-A-1280-error` | error | **nothing** | — |
| `R-A-1280-loading` | loading | **nothing** | — |
| `R-A-1280-populated` | populated | `6 sessions · 5 live · 1 needs input` | — |
| `R-A-1280-summary-singular` | populated | `1 session · 1 live · 1 needs input` | — |
| **`R-A-1280-live-production`** | E2 | `0 sessions · 0 live` | **`1 run in flight · …`** |

The last row is the one that matters: the live screen — the sentence the designer called the first an
operator reads on this milestone's own surface — now reads `1 run in flight` on the deployed build,
not merely in a fixture. **E1 and E2 still render `0 sessions · 0 live` deliberately**: those states
*hold* a payload, so the slot is reporting rather than guessing, which is what R-3 distinguishes.

**Eight mutants planted, run and reverted**, one per lane, including the two that matter most: R-3
applied to `loading` only (the failed state left lying), and the two failure populations collapsed by
setting `failure` on silent re-polls too — the F-49-04-b case, which must keep its last-known counts
because it *does* hold a payload. Every expectation is a literal string, never re-derived through
`countedPhrase`; three pre-existing assertions that did re-derive were replaced, since an expectation
computed by the code under test cannot fail.

**A locked contract clause was amended by the PO**, and it is the second time this milestone has had
to: `01_the-page-states.feature`'s loading scenario read *"the summary is present from the first
paint"*, which a builder could satisfy only by rendering `0 sessions · 0 live` before the first fetch
returned — precisely what R-3 rules a lie. No spelling satisfied both. Amended to distinguish the
**node** (present from the first paint, so no bar arrives late under a screen already being read) from
the **counts** (which wait for a payload), with the reasoning recorded at the clause. Same shape and
same resolution as the two clauses amended at story 05 for F6's live region.

**Sweep re-run after the fix: 292 suites, 1,541 passed, the same 5 pre-existing reds and no new one**
(+3 lanes). `npx tsc -b ui --force` exit 0. `aof work validate 49` PASS.

**The designer's pass-3 verdict: GAP-6 and GAP-7 CLOSED, and `R-A` moves to `CONFORMS`.** Six of the
seven render targets now conform; `R-G` alone carries GAP-8, deferred. Two judgements worth keeping:

- **The sweep was split by what a render can actually judge**, rather than five rows marked closed
  together. K3 and G0 are **closed by render**, both directions. DG-49-7's `<K> panes need input` is
  **not judged** — a live region does not appear in a screenshot — and closes at its own condition, the
  `@uat` screen-reader pass. K8's singular is **not judged** because it is unreachable at the shipped
  cap of 16, so no render is owed. K12 is immune by construction.
- **A geometric risk in the "render nothing" rule was checked and is not realised:** across all eight
  renders the four nav links hold identical x positions whether the slot is populated or silent. The
  slot yields its content without yielding its box, so a summary that comes and goes never moves the
  nav under a cursor.

**The PO's probe on R-3 was declined, and the reasoning is better than the probe.** Asked whether the
slot should also fall silent in E1/E2, the designer ruled **no** — R-3's trigger is *epistemic, not
cosmetic*. In E1/E2 the fetch returned and the answer genuinely is zero, so the slot is reporting
rather than guessing; extending R-3 would make an empty slot mean *either* "no payload" *or* "zero",
re-creating in the region just cleaned up the exact ambiguity this milestone spent ten design gaps
refusing. In E2 the two are not even redundant — the card counts **runs**, the slot counts **sessions
and live panes**. That ruling is now a clause in DESIGN §S1 G0.

## The acceptance sweep — `aof:verify 49`, 2026-08-13

Re-executed at accept time on the committed tree (`e7665e3`, `git status` clean), not carried over from
the per-story runs above. The driver imports each suite's **exported test array** and runs every case
under its own throwaway `AOF_GLOBAL_HOME` — never `scripts/test.mjs` (binds `:4182`), never
`node --test <file>` (runs the wrapper, not the array — TECH_DEBT 27's sixth red).

| lane | scope | result |
|---|---|---|
| the milestone's own behavioural suites | 21 suites — all nine stories, plus the three m46 control lanes the grid mounts through | **591 passed / 2 failed** |
| the whole fitness set | every `test/arch/**` gate, 271 suites, run as one sweep rather than the per-story subset | folded into the total below |
| **the sweep entire** | 292 suites | **1,538 passed / 5 failed** |
| `npx tsc -b ui --force` | | **exit 0** |
| `cargo test --manifest-path app/desktop/Cargo.toml` | story 01's Rust half | **85 passed / 0 failed** |
| `aof work validate 49` | | **PASS** |

**All five reds are attributed, and none is milestone 49's.** Attribution was measured, not assumed —
each was traced to the commit that introduced it:

| red | since | attributed to |
|---|---|---|
| `fleet-terminal-view-surface` V10 + V11 | `7400664` | m46's own merge — **F-49-00-a**, already triaged out of scope and ledgered as TECH_DEBT 27's seventh row |
| `acd-no-new-silent-catch` — `board-worker-stream.mjs: 1 site, baseline 0` | `eacbd57` | m43 — TECH_DEBT 27's **first** row, carried unchanged: `git diff eacbd57 HEAD -- src/board-worker-stream.mjs` is empty, and the gate and its baseline are equally untouched |
| `acd-memory-backend-selection` + `acd-graphify-backend-selection` | `20b69cb` | **chore 51** — see F-49-VER-a below. NOT previously ledgered |

**The deploy the design re-render required.** The five design gaps were closed in `b2b8b6a` and
`9490228`, both **after** the payload the designer's 41 renders were captured against
(`24850e4.20260813T192948`) — so the recorded GAPS verdict judged a build carrying none of the fixes.
Payload `e7665e3.20260813T211419` installed here (`node scripts/install-local.mjs`); the operator quit
and relaunched the desktop supervisor, verified at source: all three processes restarted **21:15:42**,
`~/.aof/bin/aof.exe --version` → `payload e7665e3.20260813T211419` = HEAD, and the served bundle moved
to `/assets/index-BRP37Z7H.js` + `/assets/index-B3lz1bkd.css`.

## User sign-off

**Signed off by the operator, 2026-08-13**, at `aof:verify 49`. All four `@uat` scenarios accepted as
judged — 01/task00 (`R-G`, the node card's dedupe rule, six of six steps at both widths), 04/task01
(E1 and E2 tell the truth about an empty fleet), 05/task06 (design conformance across every render
target) and 06/task00 (the home at reduced motion, the paired frames differing in motion and nothing
else).

The sign-off explicitly accepts **three deferrals**, each carrying a written rule rather than a note:
**GAP-8** (the node card's work line wraps at seven repos — DESIGN rule R-2 rewritten and marked
ruled-but-unbuilt), **GAP-4r** (the failed state's 42px anchor residual, likewise ruled and unbuilt),
and story 06's **`@manual` OS-level reduced-motion lane**, whose two blockers are environmental rather
than properties of the delivered code.

The designer judged every render and does **not** sign the `@uat` — that is the operator's, and it is
recorded here as the operator's.

## Findings

Triaged; carried into STATE §Feedback and TECH_DEBT rather than restated.

| id | severity | finding | disposition |
|---|---|---|---|
| **F-49-00-a** | major | `task04/38-06 (V10)` and `(V11)` in `fleet-terminal-view-surface` are **red at HEAD** — they assert `{descriptor.text}`, `{descriptor.paneLine}` and one `role="status"` site inside `TerminalControl.tsx`, but m46 (`7400664`) moved all ten occurrences to `TerminalByteArea.tsx` / `state-ramp.mjs` / `TerminalIdentity.tsx`. Red since m46's own merge — the milestone whose headline they defend. | **Out of scope for milestone 49** (architect's ruling). The repair is a contract judgment, not a re-point: V11 counts bar sites *in the file it reads*, so an author must decide whether the invariant is now "one site in `TerminalByteArea.tsx`" or "one across `ui/src/terminal/**`". A story answering that in passing would silently narrow it. Routed as its own architect-owned chore, **to land before 49/05 renders into that control**. TECH_DEBT 27. |
| **F-49-00-b** | blocker (resolved) | The whole `ui/` tree was destroyed mid-review (~13:17), taking this story's uncommitted `api.ts` edit with it; a root `npm ci` at 13:19 then exited **0** while producing a 24-entry `node_modules` with no `typescript`, because `ui/package.json` was gone when it built its ideal tree. | **Recovered here.** Edit re-applied, toolchain restored with `npm install` (**not** `npm ci`); `package-lock.json` hash unchanged. Cause: a recursive delete following the `node_modules/@aof/ui` **workspace junction** into its target. Most likely origin is this session's own QA sandbox teardown, which removed a `node_modules` junction on Windows. Ledgered **TECH_DEBT 36**. |
| **F-49-00-c** | major | Scenario 6's `tsc -b ui` clause was **silently green and had never executed** — guard-if-present, skipping on a toolchain-less tree and reporting `ok`. A half-installed tree is indistinguishable from the packaged checkout the guard was written for. | Executed here (exit 0). Guard shape → TECH_DEBT 36(b). |
| **F-49-00-d** | minor | The fleet declares `code?: string`; the board declares the same column `code?: string \| null` (`ui/src/board/api.ts:32`). | **No change — neither is wrong** (architect's ruling). The absence idiom here is a property of the *object*, not the column, and `undefined`/`null` behave identically under `code === "needs-input"`. Recommended ratchet: **`acd-agent-state-keys-on-the-word`** — no truthiness/nullish test on a `code` field may drive agent-state rendering in `ui/src/**`. Green today. |
| **F-49-00-e** | minor | STORY.md's premise `grep -rn "needs-input" ui/src` **returns four hits** — the board already keys on the exact word and renders "WAITING ON A HUMAN" (`board/action.mjs:39`, `board/DetailPanel.tsx:235`), since `277ada5`. | **Corrected at source** in STORY.md. Consequence for **story 05: reconcile, not re-author** — the form may differ per surface, the word gets one home, and that home is `ui/src/terminal/`. |
| **F-49-00-f** | low | Scenario 3/5 lanes run over planted plain objects rather than a real store. Documented, and *correct* for row 6 — `42` cannot survive SQLite's TEXT affinity. | Accepted. `needs-input` / `resumed` / absent are all producer-fed end to end by Scenarios 2 and 4. |
| **F-49-00-g** | low | Scenario 2 uses the fixture's `35/00` where the feature writes `49/00`. | **Accepted** — the ref is addressing plumbing, not the observable; an unpublished ref makes the item-attachment half assert against `undefined`, i.e. vacuous. Documented at the lane. |
| **F-49-01-a** | medium (fixed) | The fixture-check lane keyed on `sessions[0].repo` rather than the repo it actually grouped, so a legal re-capture ordering `[demo, aof, aof]` asserts **false** — and had it yielded ≥2, the distinct-record and not-case-only clauses would have evaluated over the **wrong sessions**. Green today only because the shipped fixture happens to be all-`aof`. | **Fixed** — derives the duplicated repo from the clause's own count map, via a shared helper so the plant drives the *shipped* derivation. The `[demo, aof, aof]` ordering is now a shipped lane. |
| **F-49-01-b** | required (fixed) | `session_repos()` returned rendered line parts (`"aof ×2"`) under an unchanged name and an unchanged `Vec<String>`, with `CurrentWork::Working { repos }` likewise. Nothing mechanical would catch the next consumer reaching for a repo name — and m50's grid orders by `(nodeId, repo, sessionId)`. JS named its local `parts`; Rust kept `repos` — **vocabulary drift inside the ADR whose subject is stopping these two drifting.** | **Fixed** — renamed `session_line_parts()` / `Working { parts }`, return type deliberately unchanged (moving to `Vec<(String, usize)>` would push the rendering rule into `display()`, a bigger call than this story). Ruled inside ADR-010's "only `session_repos()`" clause: that clause excludes a *behaviour* change, and a rename is none. |
| **F-49-01-c** | low (fixed, **PO ruling**) | `test/support/session-line-rule.mjs` declared *"nothing may take this line apart on its own"* and then split on `", "`. Measured against the formatter's **own correct output**: `["a, b", "a, b"]` → 3 violations; `["demo ×2", "demo", "demo"]` → 2. Both reviewers found it independently. | **Fixed by making the header's claim true, not smaller** — parts resolve greedily against the published repo set, the same technique the module already used for the sign, so no new machinery. A third, subtler case surfaced while fixing: an *ambiguous* body readable two ways, hence the consistent-and-ascending preference. The task-00 `When` step was amended by the PO in the same change, with the reasoning recorded in place. **Left standing:** the rule still accepts `×1`, which the formatter never writes — closing it means embedding the canonical render in the rule. |
| **F-49-01-d** | low (deferred) | The two sorts are **not the same order**: JS uses UTF-16 code-unit comparison, Rust uses UTF-8 byte order. They diverge when an astral name meets a BMP name ≥ U+E000 — measured, `["🚀app","ｄemo"]` sorts oppositely in the two languages. The contract says "plain codepoint order"; **Rust is correct, JS is not.** | **Pre-existing at HEAD** (confirmed by compiling HEAD's `status.rs` out of tree) and invisible to `crossSurfaceDriftViolations`, which compares source text over captured payloads. **Not fixed in this commit** — routed to TECH_DEBT 37. |
| **F-49-01-e** | low (accepted) | Task 01's "none of the four payload strings was edited" is asserted *behaviourally* rather than by byte-hash. | **Accepted.** A hash pin would fight ADR-008, which *requires* re-capture when the producer changes shape. Verified directly instead: all four payloads byte-identical to HEAD once EOL-normalised (a raw compare first reported "changed" — a CRLF checkout artifact against git's LF blobs). |
| **F-49-01-f** | medium (ledgered) | `view_model.rs` is now **1,450 lines — 256 of production code, 1,194 of test module** — carrying five inline JSON payloads (12.4 KB, **19% of the file's bytes**). **There is no per-file gate on Rust**, so nothing but a reviewer sees the trend. | **TECH_DEBT 37**, with an *ordered* fix: make the cross-surface tie **behavioural first**, *then* move fixtures to `crates/core/tests/fixtures/*.json` — moving them under the current source-text gate would blind it completely. |
| **F-49-01-g** | process | ADR-010 told this story's builder its debt was *"filed as a TECH_DEBT item"*. **It was not** — findings 4 and 5 existed only as paste-ready blocks inside an immutable ADR. Finding 4's entry (`unavailable`/`STATE_MOUNTING` producerless) is **still unwritten**. | Item 37 written now. Finding 4 belongs to whichever story's review owns ADR-002/003 — flagged to the orchestrator for story 03/05 rather than pre-empted here. |
| **F-49-04-a** | design-gap (OPEN) | A refused connection renders **`Could not load the mesh: fetch failed`**. Whether that satisfies "names the fault, not a bare something-went-wrong" is copy DESIGN has never ruled. | **Deliberately not settled in a test.** The lane pins the state, the framing and the exit — behaviour — and stops there; inventing a friendlier sentence in a test is what DG-49-1's restraint clause refuses. **Routed to the designer.** |
| **F-49-04-b** | design-gap (OPEN) | The **silent re-poll failure** — a poll that fails while last-known content is on screen. | Implemented as the one branch that cannot pre-empt the answer (keep last-known, surface nothing — byte-identically the fleet's KEEP-LAST-GOOD idiom), documented at the branch. **Architect confirmed genuinely open: no lane pins either answer.** When it is ruled, the staleness marker is a decision and belongs in `page-state.mjs`, not in that `if`. |
| **F-49-04-c** | readiness | Story 04's `@manual` **cannot be signed off against the deployed build**. Verified at both ends: the repo's `ui/dist` carries **0** occurrences of the deleted placeholder; the **deployed** payload (`buildId 7400664+dirty.20260813T111952`, installed 10:19Z) still carries **1**. | Blocked on `node scripts/install-local.mjs` + an **operator-driven** restart. QA correctly refused to sign it off from the repo's `dist` rather than the served origin — precisely the unfalsifiable reading the scenario's own note warns against. |
| **F-49-08-a** | low (known limit) | The harness's `bundleCacheKey` folds the entry, stub **sources** and resolver list (fixed this milestone) but **not transitively-bundled sources** — so a control re-run *in the same process* after a source mutation reuses the mutant bundle. | Bit one developer once during mutation testing. **Mitigation is procedural: a mutation control must be a fresh process.** Recorded rather than fixed — folding a transitive hash into the key is a real cost for a hazard only mutation harnesses meet. |
| **F-49-03-a** | process (PO error) | STORY 03's PO ruling asserted **two** shipped suites would go red. `terminal-collapse-is-not-hide.test.mjs` did, and moved as a list. **`terminal-one-implementation.test.mjs:245-248` did NOT** — those lines enumerate the *fleet card's* ON/OFF sets only; 28/28 green, file unedited. | **Corrected at source in STORY.md.** The developer flagged rather than editing an m46 scenario to carry m49 content — the right call, and the one the ruling pushed against: "fixing" it would have widened an m46 invariant to mention a host it was never about. Sixth stale premise in this milestone and **the first that was the PO's own**. |
| **F-49-00-h** | major (process) | `.github/workflows/` contains **only `release.yml`** — a tag-driven build/sign pipeline with **no test job**, and no other CI config exists in the tree. | **Every "fails CI" clause in every ADR and fitness function in this repo is aspirational.** It is why six reds survived four merges. Root cause behind TECH_DEBT 27; re-scopes its fix — an asserted green signal means a workflow, not a better local habit. |
| **F-49-VER-b** (GAP-6) | design-gap (FIXED) | The E2 headline reads **`1 runs in flight`** — unpluralised, on the live production screen an operator meets first. Confirmed at source: `homeEmptyCopy` interpolates `${runs} runs in flight` ([page-state.mjs:192](../../../ui/src/home/page-state.mjs#L192)). **GAP-3's fix touched `homeSlotSummary` only**, so the sibling string on the same screen was missed by a fix whose whole subject was that rule. | **Ruled GAP-6 by the designer and FIXED here.** The diagnosis is worth more than the string: DG-49-3's correction was written *"every count in **the summary** pluralises by its own value"* — **scoped to one component, when the defect is a property of every interpolated count on the surface.** GAP-3's fix inherited that scope, so K3 was never in its blast radius; patching a third string would leave the fourth. So the fix sweeps all five interpolations (K3 open, G0 fixed at GAP-3, K8 unreachable at `MAX_LIVE_PANES = 16` but covered by the rule, DG-49-7's unwritten plural `<K> panes need input`, K12 immune by construction since `×<n>` renders only at n > 1) and the rule is restated **once**, binding on every string. Found by re-rendering the live screen, not by any lane — the pluralisation lanes assert `homeSlotSummary` and are green. |
| **F-49-VER-d** (GAP-7) | design-gap (FIXED) | G0 renders `0 sessions · 0 live` in the chrome **90px above** `Could not load the mesh`, and again above `Loading sessions…` — a count asserted before the first fetch returned. On this surface `0` is not a neutral placeholder: *"0 sessions" is E1's whole message*, so rendering it from an absence of data is DG-49-1's lie one region up. | **Blocker-adjacent and fixed here**, because SPEC scopes *"honest empty and degraded states — each says what is true"* and this is the milestone's own headline surface contradicting itself in two adjacent regions. Ruled **R-3** (G0 renders counts only when it holds a payload; before the first fetch and while the last fetch failed it renders nothing at all — not `0`, not `—`, not a skeleton). Recorded by the designer as closing a DESIGN **silence** rather than as a build contradicting a written clause: both baselines describe only the populated case. The distinction is deliberate and the builder is owed it. **Not to be confused with F-49-04-b** — a poll that fails while last-known content is on screen still holds a payload, and G0 keeps rendering there. |
| **F-49-VER-e** (GAP-8) | design-gap (OPEN, deferred) | The fleet node card's work line **wraps to three lines** at seven repos and grows the card 173 → 212px, breaking inside hyphenated names (`lark-guard-` / `portal`). DESIGN's own dedupe rationale rejected one-line-per-session because *"N lines grows a card unboundedly with sessions, and cards in an `auto-fill` grid stretch their whole row"* — **a wrapping line reproduces that failure by a different route.** The design rejected N lines and then got N lines. | **Deferred past milestone 49 (PO ruling, operator-confirmed)** — it is on the fleet node card rather than the terminals home, needs genuinely new yield behaviour, and has a Rust half the cross-surface gate compares. **Rule R-2 is REWRITTEN in DESIGN and marked ruled-but-unbuilt**: one line; whole repo *names* yield from the tail into `+<N> more`; a `×<n>` is never yielded; the `(session)` frame is never yielded; no name broken or clipped mid-word; the full value stays in `title`. Pass 1's R-2 is discharged — its premise (a truncating line yielding the count first) was **measured false**: there is no truncation styling on this line for it to occur through. |
| **F-49-VER-f** (GAP-4r) | design-gap (OPEN, deferred) | The four page states do not share a top offset — E1/E2/loading at y=76, failed at y≈118. | **Deferred**, low. The residual of GAP-4's fix: the failed state now top-anchors like its siblings but 42px lower. Ruled in DESIGN and marked unbuilt — the failed state's box should top-align at the container's padding edge; its width may stay the fleet treatment's. |
| **F-49-VER-c** | REFUTED (process) | The re-capture reported *"the expanded pane's exit control is not keyboard-reachable — a keyboard user can present a pane and cannot leave it"*, measured as 8 forward `Tab`s cycling inside the opener tile. Had it stood it was a blocker of the same species as the Tab trap fixed in `b2b8b6a`. | **Re-executed here and it does not survive.** The exit control is reached at forward `Tab` **stop 9** — the walk stopped one press short. Measured on the same deployed build: 13 tab stops in DOM order, the exit `<button>` last, `tabIndex 0`, no `inert`/`aria-hidden`/`display:none` anywhere on its ancestor chain. The two supporting observations are both **contracted behaviour, not defects**: `Escape` leaving an interactive occupant presented is `claimsEscape === model.inputEnabled` working as `04_focus-and-expand.feature:167` specifies (Escape is a live keystroke for the far end's TUI, so the visible control is the only exit — and it is reachable); and `Shift+Tab` sticking on `xterm-helper-textarea` is xterm's own backward-focus behaviour, escapable forwards. **Recorded rather than dropped** because this is the second time in this milestone that re-executing an agent's claim changed the record, and the first time it prevented a fabricated blocker rather than catching a real loss. |
| **F-49-VER-a** | major (routed, NOT 49's) | `acd-memory-backend-selection` and `acd-graphify-backend-selection` both require `config.memory?.backend` to be read in **exactly one** code location — the memory seam (ADR-002). At HEAD the detector finds **seven**: `src/work-init.mjs` ×5, `src/commands/init-update.mjs`, `src/work-memory.mjs`. Measured at `20b69cb^` it finds **one** (`src/work-memory.mjs`) — green. **Chore 51 added the other six.** | **Not blocking milestone 49's accept** — no m49 file is implicated, and the two gates were red before the milestone's first commit landed on this branch. Routed to **chore 51, which is already `status: done`** — and *that* is the finding worth carrying rather than the two reds themselves: a chore's ADR-003 close criteria are a ticked checklist plus a green `aof work validate`, and **`aof work validate` validates the work stream, never a fitness function**. So a chore can introduce an architectural regression and close green *by construction*, with nothing in its own criteria able to see it. TECH_DEBT 27's eighth and ninth reds, and the first two it has collected from a work item that was **accepted** while red. |
