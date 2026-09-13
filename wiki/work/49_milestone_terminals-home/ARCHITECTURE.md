---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: how did we decide to build it, and why that way?
  Owner: architect. A log of ADRs: numbered, IMMUTABLE, superseded-not-edited.
  Does NOT contain observable behaviour (→ task .feature files) — only the structure behind it.
-->
# 49 · The terminals home — Architecture Decisions

> Inputs: `SPEC.md` (the grid at `/`; focus/expand/close with layout persisted per operator; agent
> state per pane; typeable panes; invariant 4 amended deliberately and in one place; an explicit
> labelled read-only fallback; a bounded live-socket count; honest empty and degraded states), and
> `STATE.md` (the merge of the PRD's `interactive-terminals` milestone; invariant 4 gets its own story
> boundary; grid-versus-list settled at refine). Four BINDING upstream documents:
>
> - **[49/RESEARCH.md](RESEARCH.md) — authoritative, and its two self-corrections are the most
>   load-bearing part.** Its §Q3 falsified its own first-pass browser-ceiling premise by measurement;
>   its §Q4 falsified this milestone's dependency chain's claim that the `board-url` origin field had
>   shipped. Every number below that is attributed to RESEARCH was re-read at source here.
> - **[44 · spike: terminal-origin-boundary](../44_spike_terminal-origin-boundary/SPIKE.md) — `done`,
>   and its `## Finding` / `## Outcome / Next` are AUTHORITY, not evidence.** Three things it hands to
>   this milestone: direct-dial with each side learning the other's ORIGIN as a served fact; a
>   two-entry session-source list with relayed-`local-pty` **structurally impossible and forbidden to
>   build**; and a labelled unavailable pane that names its own cause.
> - **[46 · terminal-control-unification](../46_milestone_terminal-control-unification/ARCHITECTURE.md)
>   — shipped. THIS MILESTONE EXTENDS THAT CONTROL; IT DOES NOT REBUILD IT.** ADR-002's frozen
>   two-row source table, ADR-003's `fit ⇔ resize-frame` rule and its ban on canvas/webgl addons,
>   ADR-004's handed origins, ADR-005's ONE connection-state vocabulary, ADR-006's
>   invariants-not-file-lists rule, and ADR-009's shell-owned fullscreen are all honoured below and
>   none is departed from. Where m46 named a thing for this milestone to find rather than discover —
>   `SET_POSTURE`'s *"stdin is fixed at xterm construction — UNREACHABLE in m46, named so m49 does not
>   discover it"* ([host-model.mjs:287](../../../ui/src/terminal/host-model.mjs#L287)) — the naming
>   worked, and ADR-007 answers it.
> - **[48 · fleet-session-identity](../48_milestone_fleet-session-identity/OUTCOME.md) — shipped, in
>   the working tree.** Two of its four open Gaps discharge here: *"A UI surface that addresses a
>   session"* (ADR-002) and *"Deduplicated repo names on the `(session)` line"* (ADR-010). Its
>   Assumptions bind: liveness is the presence aggregate's answer computed once, and the index's
>   freshness gate is node-level.
>
> **Memory recall — run before the first ADR, and it came back NON-empty.**
> `aof work memory recall "terminals grid home surface, bounded live sockets, pane posture
> interactive, session index consumer" --area architecture` surfaced five prior ADRs. Each is
> HONOURED below and the two that come closest to a near-miss are named where they bind:
> - **m45/ADR-005** — *three named regions as importable constants; the shell guarantees a bounded,
>   non-scrolling content box and the SURFACE owns scroll inside it; fullscreen is ONE mechanism owned
>   by the shell.* Honoured by ADR-001 (the home is a routed surface inside `content`, and it adds
>   NOTHING to `shell-layout.mjs`) and by ADR-007 (fullscreen is m46/ADR-009's door, unchanged).
> - **m38/ADR-013** — *one long-lived interactive `claude` PTY per assignment; terminal state is an
>   explicit `NEEDS_INPUT` sentinel, not a one-shot JSON reason; the `session_id` is captured.*
>   Honoured by ADR-004: the `needs-input` fact is threaded, never re-derived, and never sniffed.
> - **m46/ADR-001** — *the one control lives in a NEW top-level `ui/src/terminal/`; a shared primitive
>   in a surface's folder is TECH_DEBT 18(a).* Honoured **and applied to this milestone's own new
>   folder** by ADR-001, with the 18(a) ratchet extended to it (see §Fitness functions).
> - **m38/ADR-012** — the fleet face's ONE mutation carve-out. Honoured by ADR-009: layout
>   persistence adds no route, no mutation and nothing on the wire.
> - **m46/ADR-008** — the dropped-first-frame fix is the SERVER's, and its stated consequence was
>   *"m49's grid gets correct first-frame geometry for free on N panes."* Collected, not re-derived.
>
> **Codebase-graph grounding — rebuilt over the PROJECT ROOT at this refine.** `aof graph build .`
> (no `--backend`: the code-only build, `egress: none`) reported **`No code-graph topology changes
> detected; outputs left untouched` … `Already current at 9,611 nodes, 23,275 edges, 0 hyperedges
> (egress: none, built 2026-08-13T00:33:28.797Z)`** — the `unchanged` SUCCESS case, so the artifact is
> current for this working tree (confirmed independently: `graph impact` already resolves m47's
> uncommitted `RepoPicker.tsx`/`BoardDrillIn.tsx`/`FilterBanner.tsx`/`PageStates.tsx`/`SlotAids.tsx`).
> A first attempt died on `graphify timed out after 120000ms`; `AOF_GRAPHIFY_TIMEOUT_MS=540000` is
> what this repo needs. `aof graph impact` was then read back per file. The edges below are cited as
> **ACTUAL structure, not inference**:
> - `ui/src/app/Landing.tsx` ← **(1)** `ui/src/app/Shell.tsx`; → **(1)** `shell-layout.mjs`. The
>   smallest blast radius in `ui/src`, and it decides ADR-001.
> - `ui/src/app/Shell.tsx` ← **(4)** `ui/src/main.tsx` + three test entry harnesses; → **(5)**
>   `Landing.tsx`, `routes.mjs`, `shell-bus.mjs`, `shell-layout.mjs`, `shell-nav.mjs`.
> - `ui/src/app/routes.mjs` ← **(9)**; → **(0)**. A pure leaf, as m45 built it.
> - `ui/src/fleet/Fleet.tsx` → **22** modules, **five** of them under `ui/src/board/`
>   (`StaleBadge`, `api`, `freshness`, `runs`, `status`) — TECH_DEBT 18(a), unchanged in shape and now
>   ratcheted by `acd-terminal-control-boundary`'s `FLEET_TO_BOARD_BASELINE`
>   ([:116-122](../../../test/arch/acd-terminal-control-boundary.test.mjs#L116)).
> - `ui/src/fleet/terminal-mount.mjs` ← **(9)**; → **(4)** (`assignments.mjs` + three terminal-core
>   modules). `ui/src/board/dock-mount.mjs` ← **(7)**; → **(2)**. The two call-site producers ADR-002
>   copies.
> - `ui/src/terminal/input-policy.mjs` ← **(12)**, → **(0)**. `state-ramp.mjs` ← **(12)**, → **(2)**.
>   `source-table.mjs` ← **(16)**, → **(0)**. `host-model.mjs` ← **(9)**, → **(1)**.
>   `TerminalControl.tsx` ← **(2)** (`Board.tsx`, `Fleet.tsx`), → **(20)**.
> - `src/mesh-ui-serve.mjs` ← **29** dependents — the heaviest blast radius this milestone can touch;
>   → **12**, including `src/board-serve.mjs` (the edge m46/ADR-004 records as load-bearing).
> - `src/global-mesh-query.mjs` ← **13**; → **7**. `src/assignment-record.mjs` ← **38** — a genuine
>   god-node, and ADR-004 deliberately does not touch it.
> - `ui/src/fleet/runs.mjs` ← **(7)**, → **(0)**; `app/desktop/crates/core/src/view_model.rs` ← **(1)**
>   `app/desktop/crates/app/src/main.rs`, → **(1)** `status.rs`. ADR-010's two seams, both narrow.
> - `src/mesh-terminal-mirror.mjs` ← **(10)**; → **(4)**. ADR-006's cost model lives here.
>
> **Two caveats on the graph, recorded because it informs and never rules.** (a) It reports one edge
> that does not exist: `Fleet.tsx → test/support/cache-authority-fixture.mjs` — `grep` finds no such
> specifier in that file. Treated as noise, not as coupling. (b) A path it does not know is reported
> `NOT COVERED … treat their coupling as UNKNOWN, not zero` (verified by asking it about
> `ui/src/home/grid.mjs`, which does not exist yet) — so no boundary below is drawn on an empty
> answer, and `src/bundle/bundle.json` (ADR-005's subject) is DATA the graph does not carry at all.
>
> ---
>
> **Corrections to this milestone's own inputs, measured 2026-08-13 in the working tree.** Recorded
> here because a stale pointer in a SPEC becomes a wrong edit in a story, and because spike 44 and
> RESEARCH each set the standard by correcting themselves at source.
>
> 1. **SPEC's out-of-scope clause — *"Scrollback persistence and session replay. A browser that
>    subscribes late sees an empty pane, and that is ADR-014's design"* — is STALE.** Measured: the
>    mirror keeps a bounded per-tuple tail and **REPLAYS it to each new subscriber before live
>    frames** ([mesh-terminal-mirror.mjs:20-33](../../../src/mesh-terminal-mirror.mjs#L20),
>    the replay loop at [:193-208](../../../src/mesh-terminal-mirror.mjs#L193)), with
>    `MAX_TAIL_BYTES_PER_KEY = 256 * 1024` and `MAX_TAIL_KEYS = 64`
>    ([:58-59](../../../src/mesh-terminal-mirror.mjs#L58)). The original "hold NO past bytes" stance
>    was revised at a live two-machine soak on 2026-07-25 (VERIFICATION F-38.06g) precisely because it
>    made the fleet peek blank on every refresh. This is not a footnote: it is the single largest cost
>    in ADR-006's ceiling argument, and it means a newly-opened pane on a live worker paints its last
>    screen immediately rather than sitting at `waiting`. **What IS still out of scope is a durable
>    transcript store**, which is what SPEC's clause was really scoping out.
> 2. **`GET /api/mesh/board-url` still answers three fields.**
>    [mesh-ui-serve.mjs:358](../../../src/mesh-ui-serve.mjs#L358) —
>    `sendJson(response, 200, { url, workspaceId, ref: ref || null })`; `BoardUrlResponse`
>    ([api.ts:263-267](../../../ui/src/fleet/api.ts#L263)) types exactly those three. RESEARCH §Q4
>    confirmed this against m46/ADR-004's stale step 5, and it holds. The `workspace-not-local` guard
>    DID ship ([:348-351](../../../src/mesh-ui-serve.mjs#L348), m47/ADR-011).
> 3. **m46/DESIGN's DG-46-3 predicted this milestone would be `unavailable`'s producer. It is not.**
>    ADR-002 rules `local-pty` panes out of m49, and the home is served from the fleet origin, so
>    `origins.fleet` always resolves. `unavailable`
>    ([state-ramp.mjs:429-439](../../../ui/src/terminal/state-ramp.mjs#L429)) and its three frozen
>    causes ([:105-113](../../../ui/src/terminal/state-ramp.mjs#L105)) still have **no production
>    producer after m49**. Routed in §Codebase health finding 4.
> 4. **RESEARCH's §Q1 conclusion is right and one clause of SPEC's framing follows from it that
>    nobody has written down.** "The grid's population is producer-bound" is measured
>    (`startSession`/`pingSession` have exactly one production caller,
>    [commands/mesh-session.mjs:318,323](../../../src/commands/mesh-session.mjs#L318); the bundle
>    wires session hooks for `runtimes: ["codex"]` only,
>    [bundle.json:12-16](../../../src/bundle/bundle.json#L12)) — but its CONSEQUENCE for the grid's
>    row set is sharper than RESEARCH states, and ADR-002 is where it lands: **an assignment with a
>    captured `sessionId` and no presence record renders a live terminal on its milestone CARD and no
>    row in the terminals home.** That inconsistency is the reason ADR-005 exists.
>
> ---
>
> **AMENDMENTS TO THIS LOG, 2026-08-13** — raised by QA's contract pass over story 02 and by the PO,
> and recorded here as well as at each ADR because a reader who only skims the preamble must not build
> against a superseded clause:
>
> - **ADR-006 §Decision, clause "the seam is one pure function" — SUPERSEDED.** The arbiter takes
>   **FOUR** arguments; the currently-subscribed set is the fourth, and the three-argument form is
>   *unsatisfiable* (driven at cap, it silently evicts an incumbent and destroys scrollback the mirror
>   cannot give back). **Priority allocates FREE slots; it never evicts.**
> - **ADR-006 §Decision, clause "watching one over the cap evicts…" — SUPERSEDED, PO ruling.**
>   `DESIGN §DG-49-4` wins: **no auto-demotion**, and at the cap the worded toggle is **absent**.
> - **ADR-008 §Decision — two under-specified points RULED, nothing superseded:** the JSX floor is
>   **per-surface** with mount sites **discovered by sweep** (a concatenated whole-clause floor is
>   satisfiable by Fleet alone and leaves the home unchecked — this clause's own recorded failure
>   mode); and part 1's two clauses are **deliberately asymmetric** — `INTERACTIVE_DECLARATION` stays
>   fleet-scoped, AUTHORSHIP covers all three surface directories and reaches **none** of
>   `ui/src/terminal/**`.
> - **ADR-007 — the fourth host's constant is `HOST_GRID_PANE = "grid-pane"`**, not the drafted
>   a draft name it never shipped under (struck at ADR-007's `Corrected:` line, which is the only
>   place in this log that still spells it). Name↔value matched, as both m46 hosts are. The directory
>   stays `ui/src/home/`.
> **SECOND AND THIRD BATCHES, same day (QA stories 04/05/06 + PO):**
>
> - **ADR-003 §Decision — the `no live output`-with-no-socket MECHANISM ruled, and this ADR's
>   consequence "`state-ramp.mjs` is not edited" SUPERSEDED.** The seam it chose (`reason` on
>   `waiting`) is unreachable without opening the forbidden socket. The pane is **`idle`** — the
>   ramp's own word for "no source bound", whose `PANE_EMPTY_HOST` treatment is already a box with one
>   centred line — reached by declaring it **not `bindable`**. Two edits to the shared core, both
>   backward-compatible.
> - **ADR-006 — clause (3): the grid's DISPLAY order is `(nodeId, repo, sessionId)`, DESIGN wins;**
>   clause (4): `host-model.mjs`'s `WATCH` rationale is stale post-F-38.06g and is corrected where it
>   lives (the COST is unchanged and must not be re-argued from the correction).
> - **ADR-007 — "the control does not change" NARROWED**, and three missing mechanisms ruled: the
>   held tile's box is a **host declaration** replacing the `subscribed` guard; presentation is a new
>   **FORM** of an affordance the host already declares, not a prop; `opener` keeps its name and the
>   control stops hard-coding the button, plus one new present-focus field on the request.
> - **A NINTH fitness function — `acd-motion-has-an-escape`** (set containment over emitted
>   `animate-*` classes vs the reduced-motion block), with the **CSS-block mechanism** ruled and the
>   **browser lane DECLINED**, both argued in §Fitness functions.
> - **§Codebase health RE-MEASURED after the PO corrected two rows** (~~`Shell.tsx` 930, headroom 10;
>   `Fleet.tsx` 1,539, headroom 21~~ — **themselves superseded by the fourth batch below: these are
>   `wc -l`, not the gate's count; the real figures are 931/9 and 1,540/20**) — the tree is moving under this refine because
>   m47's work is uncommitted, and the method note is now part of the finding. **Two findings added:
>   6** (`STATE_MOUNTING` is producerless at *every* route, not newly reachable at `/`) and **7**
>   (anchor rot, four instances, its cause, and the citation convention that answers it).
> - **DG-49-1's "agents are working" clause is confirmed LIVE-NODES-ONLY**, on the structural
>   argument, in ADR-003.
> - **ADR-001's `Shell.tsx` anchors corrected** to the ternary at `:345-346` and `SurfaceBoundary` at
>   `:349-361`, and re-cited by construct rather than by line.
>
> **FOURTH BATCH, same day (developer's feasibility pass, via the PO) — three consistency fixes, no
> concepts moved:**
>
> - **The dead host name is struck and confined to ONE line.** `HOST_GRID_PANE` is the name to type;
>   the drafted spelling survives only, struck, at ADR-007's `Corrected:` line. Three surviving
>   mentions gave a builder grepping this file three hits for the wrong name and one for the right
>   one — on a lookup that **fails closed to no affordances at all**.
> - **Every budget number is restated on the GATE's arithmetic**, `source.split(/\r?\n/).length`
>   ([acd-ui-surface-file-budget:175](../../../test/arch/acd-ui-surface-file-budget.test.mjs#L175)) —
>   `wc -l` **plus one**. All three earlier passes (two mine, one the PO's) used `wc -l` and were
>   understated by one *in the unsafe direction*. **`DetailPanel.tsx` is AT its ceiling, 1,000 of
>   1,000**, green only because the assertion is `<=`.
> - **Two attributions fixed:** `acd-rendered-component-fed-by-route` is **removed from ADR-001**
>   (zero `landing` references; it is m38/ADR-008's current-work-projection gate) and **re-homed to
>   ADR-010**, where it genuinely binds; and ADR-008's amendment undercounted `ui/src/terminal/**`'s
>   `posture:` writers — there are **seven across three modules**, not two in one file, which makes
>   the case for excluding the core stronger rather than weaker.
> - **§Story-boundary guidance takes the PO's story 08** (`the harness can drive a grid`) and states
>   why it is the opposite of this log's own named bad cut 3.
>
> **FIFTH BATCH, same day (QA's BEHAVIOURAL review of story 02, F-49-02-c) — one supersede, one
> deletion from a shipped return shape:**
>
> - **ADR-006 AMENDMENT (1)'s own obligation (b) — SUPERSEDED by AMENDMENT (5).**
>   `result ⊇ currentlySubscribed ∩ liveRows` is **false for every input at a cap below the retained
>   count**, and the shipped arbiter satisfied it *by construction* — `demoted: []` asserted as a
>   literal while twelve live, un-hidden incumbents were released under a fabricated `cause: "hidden"`.
>   The total replacement is **`|result ∩ retainable| = min(|retainable|, limit)`**, whose corollary
>   `result \ retainable ≠ ∅ ⟹ retainable ⊆ result` is the checkable form of *"priority allocates free
>   slots; it never evicts"*.
> - **`released.cause` closes at THREE** — `hidden` · `left-the-index` · **`cap-lowered`** — each with
>   a **biconditional** precondition, because a one-way implication is satisfiable by a fall-through
>   and a fall-through is what fabricated the label. **`demoted` is DELETED from the return shape:** a
>   field whose value is a literal is not an observation, and two arrays over one population is a fact
>   with two homes. **(b) — "fail closed on a shrunk cap" — was DECLINED**, with the reason recorded at
>   ADR-006's Alternatives.
>
> - **Two pointer corrections QA measured, fixed in place:** the `sendTerminalFrame` floor GUARD is at
>   [acd-terminal-output-signal-source.test.mjs:167](../../../test/arch/acd-terminal-output-signal-source.test.mjs#L167)
>   (`:169` is its message); and invariant 4 part 3's fleet sweep sees **14** files, not 20 — six
>   `.d.mts` are excluded by its own filter at
>   [acd-fleet-terminal-input-constrained.test.mjs:341](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L341).
>   **Both were mine; both are the shape this log's own feedback note warned about** (a bare line
>   number in a record doc rots within one milestone) and both are now cited with the fact beside the
>   anchor.
>
> **SIXTH BATCH, same day (49/03's STRUCTURAL REVIEW of the delivered diff) — one wording
> correction, one new obligation, nothing superseded:**
>
> - **ADR-007 AMENDMENT (B)'s *"with a pane-activation FORM"* is CORRECTED, at ADR-007's
>   `Corrected (2):` line.** Read literally it sends the next builder to overwrite `form` and thereby
>   delete the icon control the same amendment says stays — and no gate would catch it. The ratified
>   spelling is `form: FORM_ICON_CONTROL` **plus** `activation: FORM_PANE_ACTIVATION`, which is what
>   shipped and what task 00's locked Examples fix.
> - **§Fitness functions gains a TENTH OBLIGATION: the form vocabulary must be closed by CODE.**
>   `AFFORDANCE_FORMS` ships exported and is referenced by **nothing**, and `affordanceFormViolations`
>   never reads it — so the "closed vocabulary" (B)'s whole argument rests on is closed by prose in
>   the one milestone that opened it. Two lines inside the SHIPPED detector, owed by the story that
>   next touches `host-model.mjs`. **DISCHARGED 2026-08-13 by 49/05's tree**
>   ([host-model.mjs](../../../ui/src/terminal/host-model.mjs)'s `affordanceFormViolations`, the two
>   `AFFORDANCE_FORMS.includes` clauses) — verified at source at the seventh batch below.
>
> **SEVENTH BATCH, same day (49/05's STRUCTURAL REVIEW of the delivered, COMMITTED diff `69a8060`) —
> one prop RATIFIED, two clauses SUPERSEDED, one of my own amendments CORRECTED ON A MATTER OF FACT,
> and one invariant found NOT ENFORCED BY THE DELIVERED CODE.** The story is the milestone's heart
> and it is already committed, because the `ui/` tree was destroyed twice on 2026-08-13 (TECH_DEBT 36)
> and uncommitted work was what was lost both times. These findings are therefore follow-up
> obligations, not a gate on the commit — and the first of them is the sharpest thing this log has
> had to record about its own arithmetic.
>
> - **ADR-006's cap is NOT ENFORCED OVER LIVE SOCKETS BY THE DELIVERED GRID, and the number is
>   measured, not inferred.** Driven through the story's own harness against the shipped
>   `SessionGrid.tsx`: sixteen subscribed tiles at `MAX_LIVE_PANES = 16`, then ONE poll in which four
>   tuples leave the index and four arrive → **20 open sockets**. A tile RETAINED past its row's
>   departure keeps its socket and is excluded from the arbiter's input
>   ([SessionGrid.tsx](../../../ui/src/home/SessionGrid.tsx)'s `dialableTiles(tiles)` argument, which
>   filters to `FEED_PRODUCER_KNOWN`), so the arbiter frees the vacated slot, refills it, and the
>   retained socket is spent off the books. **I1 (`|result| ≤ limit`) still holds of the ARBITER and
>   is now false of the PRODUCT** — and I1 is the obligation the mirror's 256 KiB replay burst and its
>   64-tuple tail budget actually buy, so the ADR's own three-part argument is what breaks. **RULING:
>   a socket is a socket. Every tile that HOLDS one is an argument to the arbiter, retained tiles
>   included; the cap counts sockets, never row provenance.** The retained tile enters as an
>   incumbent, so I2 keeps it (it is `retainable`) until the cap itself cannot.
> - **ADR-003's `roster-gone` ANNOTATES-NEVER-REPLACES is RATIFIED as delivered; ADR-007's
>   consequential clause *"`no-producer` and `roster-gone` → `POSTURE_READ_ONLY`, labelled, carrying
>   the cause"* is SUPERSEDED for `roster-gone` ONLY, and the supersede carries a compensating
>   obligation rather than standing alone.** The developer's mechanism is right and the reason is
>   structural: `posture` is part of `terminalSessionIdentity`, so flipping it re-keys the session and
>   tears down the very socket task 02 requires to stay open. **But the consequence was not stated and
>   it is not cosmetic:** a retained tile stays `POSTURE_INTERACTIVE` and therefore typeable into a
>   session the mesh no longer lists — precisely the two-hop silent drop ADR-007 exists to prevent —
>   and `READ_ONLY_CAUSE_REASON[FEED_ROSTER_GONE]`
>   ([session-mount.mjs](../../../ui/src/home/session-mount.mjs)'s exported map) becomes a mapping
>   **no production caller can reach**, which is this log's own finding-4 species arriving inside the
>   milestone that named it. **The compensating obligation: a RETAINED tile does not PRESENT.** The
>   fullscreen door is the only typing path on this surface by DG-49-5's own ruling (*taking the
>   keyboard IS the expand*; the inline xterm is `tabIndex: -1` and never a focus target), so
>   withholding it makes the tile un-typeable in fact, at zero cost to the identity, through the
>   declaration seam this story already built. Read-only-ness is then true of the pane even though
>   the WORD on the mount is not — and the ADR says so here rather than leaving the next reader to
>   find a dead map.
> - **ADR-003's AMENDMENT is CORRECTED ON A MATTER OF FACT — mine, and it is the load-bearing kind.**
>   The amendment ruled the STATE (`idle`, so no socket opens) and that ruling STANDS. Beside it, in
>   parentheses, it asserted that `PANE_EMPTY_HOST`'s centred line *"is **exactly** the shape DG-49-2
>   asks for"*. **It is not.** DG-49-2 says **top-left in the byte area**, in three separate places
>   ([DESIGN.md](DESIGN.md)'s DG-49-2 pane-line bullet, its C2 anatomy bullet, and its state table's
>   `no live output` row), and `mocks/BASELINE.md` corroborates by CONTRAST — its held rows 8 and 9
>   say *"centred"* in terms while rows 3 (`waiting`) and 7 (`no live output`) say *"in-pane"*, and
>   row 3 is m46's shipped top-left treatment. **RULING: DESIGN GOVERNS THE PLACEMENT**, on
>   m46/ADR-005's unchanged precedent that DESIGN owns what the operator reads; the amendment had no
>   business ruling a TREATMENT while ruling a STATE, and a parenthetical that mis-describes the
>   document it claims to satisfy is worse than silence, because it reads as a reconciliation. **The
>   two uses of `idle` this milestone created are genuinely TWO treatments** — a pane that is a
>   terminal and is empty (the line sits where the first line will appear) and a tile that is not a
>   terminal at all (a centred card saying why it is not watching) — and collapsing them onto one
>   `PANE_*` value is the flattening. The fix is a DESCRIPTOR FIELD in `state-ramp.mjs`, never a
>   branch in `TerminalByteArea.tsx`, because *"EVERY PANE DECISION IS A DESCRIPTOR FIELD"* is that
>   component's own header rule. **Flagged for task 06's `@uat`.**
> - **ADR-007's *"`TerminalControl.tsx` gains NO PROP"* is SUPERSEDED — the control takes a FIFTH
>   prop, `standing`, and the ratification is CONDITIONAL.** The clause is unsatisfiable against the
>   locked features and the developer is right about why: four facts must cross a boundary the
>   remaining channels refuse. The mount's thirteen keys are frozen and shared by three producers, so
>   a fourteenth for `mark`/`field`/`note` costs the fleet's and the board's producers a key they have
>   no fact for; the mount producer is per-ROW and the arbitrated subscription, the toggle's absence
>   and the roving stop are per-SET; and context or an imperative handle are new mechanisms invisible
>   to `node:test`, which is ADR-001's whole prohibition. **What earns the ratification is not
>   necessity, it is that the prop carries NO DECISION:** the entire meaning is
>   `terminalPaneStanding(host, standing, ownSubscribed)` in `host-model.mjs` — framework-free,
>   driven headlessly — every branch it feeds keys on a HOST declaration (`hostActivatesPane`,
>   `hostRestPane`, `hostPaneBox`, `hostAnnouncesState`) rather than on a surface's name, so the
>   control still does not learn about the grid; and `standing == null` is m46 byte-for-byte, asserted
>   by value over all three shipped hosts. **THE CONDITION, and it is the hole the old clause was
>   incidentally closing: `subscribed` now has TWO authorities inside one control.** The delivered
>   `onWatchHide` writes `hostState.subscribed` AND calls `standing.onWatch`, while
>   `terminalPaneStanding` lets the surface's answer win outright — so on any tile the surface answers
>   about but the arbiter never sees, the local write is silently discarded and **the worded toggle is
>   inert** (measured: pressing `Hide terminal` on a `no-producer` tile leaves the label, the box and
>   the standing unchanged). **RULING: where a surface declares `subscribed`, the control must not
>   also write it** — the toggle reports the operator's intent up and renders the surface's answer
>   back down, one authority, the same shape the arbiter's fourth argument already uses.
> - **ADR-006 AMENDMENT (5d) — *"the last branch of a cause chain is the one that cannot absorb an
>   unclassified case"* — is EXTENDED from the arbiter's causes to the SURFACE's defaults, because
>   the same author reproduced it one layer up.** `decision == null ? true : decision.subscribed`
>   ([SessionGrid.tsx](../../../ui/src/home/SessionGrid.tsx)'s `isSubscribed`) is a fall-through that
>   absorbs two populations with opposite needs into one answer: a `no-producer` tile (never dialable,
>   holds nothing, and whose toggle is therefore theatre) and a `roster-gone` tile (dialable, DIALED,
>   holding an open socket the operator now has no way to close). **A tile the arbiter was not asked
>   about is not a tile that is subscribed; it is a tile with no answer, and the two must be different
>   values.** Once retained tiles are arbitrated (first bullet), the only remaining no-answer
>   population is `no-producer`, which is `subscribed: false` with nothing to hide — and the toggle
>   follows the declaration instead of contradicting it.
> - **DG-49-7's *"one live region, not N"* is HALF-ENFORCED, in the code and in its gate.** Measured
>   on three tiles driven to `ended`: **one** `aria-live` node and **three** `role="status"` nodes.
>   `role="status"` is an implicit polite live region, and `TerminalByteArea`'s non-live bar carries
>   one per pane unconditioned by `hostAnnouncesState`, so a grid of sixteen ended tiles is sixteen
>   regions narrating at once — the exact defect DG-49-7 removed from the state chip, surviving in a
>   different attribute. The suite's clause counts `props["aria-live"] != null` and cannot see it.
>   **RULING: the bar's live-region ROLE is the same host declaration the chip's already is**
>   (`hostAnnouncesState`; the bar keeps its `role` where a host announces and drops to a plain
>   element where it does not — the WORD is never withheld, only the announcement, which is that
>   declaration's own stated discipline), **and the suite's clause counts implicit regions
>   (`role="status" | "alert" | "log"`) beside explicit ones**, or it is asserting a property it
>   cannot measure.
> - **§Codebase health gains finding 8 (`TerminalControl.tsx` at 840 of 840) and finding 9
>   (`acd-ui-surface-file-budget` still reports only BREACH — item 33 fix (c), declared REQUIRED of
>   this milestone at finding 1, has not landed).**

---

## ADR-001: The terminals home is a NEW top-level `ui/src/home/` AND a REAL ROUTED SURFACE — `/` joins `main.tsx`'s `SURFACES` map, `Shell.tsx` stops rendering the landing itself, and `ui/src/app/Landing.tsx` is DELETED rather than kept beside it

**Status:** Accepted
**Date:** 2026-08-13

**Context.** Two questions, and the second is the one nobody has asked.

*Where does the code live?* The candidates are a new top-level `ui/src/home/` or absorption into
`ui/src/fleet/`. Absorption is superficially attractive — the home reads the same
`/api/mesh/status` payload the fleet already polls
([assign-affordance.mjs:54](../../../ui/src/fleet/assign-affordance.mjs#L54)'s `POLL_MS = 5000`,
consumed at [Fleet.tsx:462](../../../ui/src/fleet/Fleet.tsx#L462)) and would reuse its API client.
It is also exactly TECH_DEBT 18(a)'s shape: `ui/src/board/` became the shared library by being the
folder that happened to have the thing first, and the graph still measures **five**
`Fleet.tsx → ui/src/board/` edges. m46/ADR-001 made the opposite call for the same reason and named
the condition that would overturn it (a genuine declared shared layer, which still does not exist).
And m47 has just added **8 files** to `ui/src/fleet/`, taking it from 12 to 20; it is now the
second-largest `ui/src` directory. A grid of live panes dropped into it would be the 21st through
~30th sibling in a folder named for a different surface.

*What does `/` render, mechanically?* This is the question the file-location debate hides, and it is
already answered on disk — by m45, in a comment, wrongly. `ui/src/main.tsx:42-46` declares
`SURFACES` and says: *"`landing` and `not-found` are absent on purpose: the shell renders both
itself, and milestone 49 replaces what `/` renders without touching this map."* Measured, that
prediction is wrong in the one way that matters. Today `Shell.tsx` renders the landing **INLINE**, in
the `<main id={CONTENT_REGION_ID}>` ternary — `routeId === "landing" ? <Landing … /> : …`
([Shell.tsx:345-346](../../../ui/src/app/Shell.tsx#L345) *as measured 2026-08-13; cite the ternary,
not the line — see §Codebase health finding 7*) — and `entry.mjs`'s `SHELL_RENDERED_ROUTES` freezes
`["landing", "not-found"]` ([:126](../../../ui/src/app/entry.mjs#L126)), which `surfaceMountFor`
([:139-152](../../../ui/src/app/entry.mjs#L139)) reads to decide that "no surface component for this
id" is NORMAL rather than a defect. A terminals home rendered through that branch would be a
data-fetching, socket-opening, 16-pane surface living inside the shell's own tree, **outside
`SurfaceBoundary`** — the `key={routeId}` boundary in the same ternary's final arm
([Shell.tsx:349-361](../../../ui/src/app/Shell.tsx#L349)), whose own comment states the scope in
terms: *"It wraps ONLY the mounted surface — not the nav, not the bars, not the not-found or landing
states the shell renders itself."* A throw in it would take the chrome down with it, which is
precisely the failure m45's containment finding F-45-M-1 exists to prevent — and that comment's next
sentence names this milestone as the reason the net exists at all: *"what stops the NEXT surface —
47's and 49's — from having to rediscover F-45-M-1."*

`Landing.tsx` is 69 lines with exactly ONE importer (graph: `← (1) ui/src/app/Shell.tsx`) — the
smallest blast radius in `ui/src`. Its own header states its terms: *"Milestone 49 replaces what this
route RENDERS; it does not rename the route (`landing` keeps its id) and it does not touch the
shell."* Half of that survives; the other half is what this ADR corrects.

**Decision.**
- **The home is `ui/src/home/`** — a new top-level sibling of `app/`, `board/`, `fleet/`, `terminal/`,
  `config/`, `components/`, `lib/`. It is the **8th** top-level directory under `ui/src`, named here
  rather than discovered later (m45 named `src/static-serve.mjs` as the 109th flat root module; m46
  named `ui/src/terminal/` as the 7th directory; this is that discipline's third turn). It is a
  DOMAIN folder: the grid, the pane's mount declaration, the feed axis, the subscription arbiter and
  the layout composer. Nothing else lands in it.
- **`/` becomes a ROUTED SURFACE.** `landing` gains an entry in `main.tsx`'s `SURFACES` map;
  `SHELL_RENDERED_ROUTES` ([entry.mjs:126](../../../ui/src/app/entry.mjs#L126)) **shrinks to
  `["not-found"]`**; `Shell.tsx`'s `routeId === "landing"` branch and its `Landing` import
  ([:68](../../../ui/src/app/Shell.tsx#L68)) are **removed**; `ui/src/app/Landing.tsx` is **deleted**.
  The route TABLE is untouched — `routes.mjs`'s `landing` id survives verbatim, exactly as m45
  promised, and `acd-ui-single-route-table` stays green.
- **The surface therefore inherits, for free and by construction:** `SurfaceSlot`'s crash
  containment, the mount/failed states `surfaceMountFor` already models, and the shell's bounded
  non-scrolling content box. **It declares `content:fixed`** (m45/ADR-005, binding for a
  terminal-hosting surface, m46/ADR-009) by IMPORTING the published constant.
- **m45's SPLIT IS THE INVARIANT, inherited verbatim from m46/ADR-001 and not renegotiated:** ALL
  logic in framework-free `.mjs` with a `.d.mts` sibling; the `.tsx` is a thin consumer holding JSX,
  refs and effects. This repo has **no React test harness**, so a decision that lives in JSX is a
  decision no test can reach — and TECH_DEBT 29 measured what that costs: m46 shipped its headline
  connecting to nothing, past 537 green tests. Every DECISION this milestone makes — which rows are
  panes, which are subscribed, which posture, which state, what is persisted — lives in a `.mjs`
  plain `node` can import.
- **The `.mjs` set touches NO global.** Not `window`, not `location`, not `localStorage`. It receives
  them ([socket-url.mjs:15-19](../../../ui/src/terminal/socket-url.mjs#L15) is the shape;
  [shell-nav.mjs:15-21](../../../ui/src/app/shell-nav.mjs#L15) is the precedent).
- **`ui/src/home/` IMPORTS NOTHING FROM `ui/src/fleet/` OR `ui/src/board/`.** It imports DOWN into
  `ui/src/terminal/` and `ui/src/app/`, and nothing sideways. If the home and the fleet turn out to
  want the same empty-state or chip primitive, it goes to `ui/src/components/` (7 files, 165 lines —
  the tree's actual shared home) or to `ui/src/terminal/`, **never** by importing one surface from
  another. This is gated, not hoped: `acd-terminal-control-boundary`'s `FLEET_TO_BOARD_BASELINE`
  ratchet ([:116-122](../../../test/arch/acd-terminal-control-boundary.test.mjs#L116)) gains a
  `home →` baseline that is **EMPTY**, i.e. shrink-only from zero.
- **THE FILE-BUDGET CONSEQUENCE, stated explicitly, because a milestone that raises a ceiling by diff
  has already failed.**

  **COUNTED THE WAY THE GATE COUNTS, which is NOT `wc -l`.** `acd-ui-surface-file-budget` measures
  `source.split(/\r?\n/).length`
  ([:175](../../../test/arch/acd-ui-surface-file-budget.test.mjs#L175)) — i.e. **`wc -l` plus one**
  for any file ending in a newline, because the trailing empty segment counts. Every number below is
  the gate's, verified by running its own expression; the rule is stated here so the next re-measure
  does not repeat the mistake this table made twice.

  | budgeted file | ceiling | gate count | headroom | what m49 does |
  |---|---|---|---|---|
  | `ui/src/board/DetailPanel.tsx` | 1,000 | **1,000** | **ZERO** | untouched — and see the note below |
  | `ui/src/config/App.tsx` | 1,300 | **1,298** | **2** | untouched |
  | `ui/src/app/Shell.tsx` | 940 | **931** | **9** | **NET-NEGATIVE** — the landing branch and its import leave (−3), and ADR-007's amendment takes the byte-area guard out too |
  | `ui/src/fleet/Fleet.tsx` | 1,560 | **1,540** | **20** | **ZERO** — the card peek does not move |
  | `ui/src/terminal/TerminalControl.tsx` | 840 | **819** | **21** | **ZERO** — ADR-007's fourth host is DATA in `host-model.mjs` (unbudgeted, far under the declare-your-intent line); the control already reads `hostAffordances(host)` generically |
  | `ui/src/app/shell-layout.mjs` | 1,060 | **1,016** | **44** | **ZERO** — the home imports `content:fixed`, `z-30` and the chrome height; it adds no vocabulary here (item 33 fix (a) names `shell-fullscreen.mjs` as this file's own next cut, and m49 is not it) |

  **`DetailPanel.tsx` IS AT ITS CEILING — 1,000 of 1,000.** It is green only because the assertion is
  `lines <= budget.ceiling`, so **any single line added to that file fails CI.** This milestone does
  not touch it and must not be made to pay for it (m43/m45/m46's shared ruling). It is stated here
  because it changes what the numbers *mean*: **the tree has no slack anywhere to absorb a surprise**,
  and a story that discovers it needs "one small thing" in `DetailPanel.tsx` has discovered a blocker,
  not a chore. That is TECH_DEBT 33's whole thesis arriving at zero.

  **RE-MEASURED TWICE, 2026-08-13, and BOTH earlier passes were wrong in different ways.** First:
  `Shell.tsx` 917 → 930 and `Fleet.tsx` 1,532 → 1,539 moved between two measurements hours apart,
  because **this tree carries m47's work uncommitted and it is still moving under the refine**.
  Second: **all of those, and the PO's correction of them, used `wc -l` — which is not how the gate
  counts**, so every row was additionally off by one *in the unsafe direction*. The verdict is
  unchanged; the margin is not — **`Shell.tsx` has 9 lines, not 23.**

  **So m49 touches ZERO budgeted files upward and takes one DOWN** — which is the answer TECH_DEBT
  33 asks for, and it is a designed outcome rather than luck: every ceiling on that table is met by
  the home owning its own decisions instead of appending them to a shell or a surface. **At 10 lines,
  net-negative on `Shell.tsx` stops being comfortable and becomes REQUIRED**, so the arithmetic is
  stated rather than assumed: −1 (the `Landing` import), −2 (the `routeId === "landing"` ternary arm),
  −1 net (ADR-007's amendment turning the `{subscribed ? … : null}` guard into a table lookup) ⇒ the
  file lands near **927 on the gate's count**. **If a story finds itself ADDING to `Shell.tsx`, the pressure valve is
  named here rather than improvised: extract `MountPlaceholder` and `SurfaceFailed`
  ([Shell.tsx:593-598](../../../ui/src/app/Shell.tsx#L593) and its sibling) into an `ui/src/app/`
  component** — small, self-contained, a real prop boundary, and exactly the remedy
  `acd-ui-surface-file-budget`'s own failure message prescribes. **Trimming a comment to fit is
  forbidden (ADR-014/E3), and it is the one thing time pressure will argue for.** One budget
  entry is ADDED at delivery, for `ui/src/home/`'s component, set just above its delivered size —
  the same rule that added `config/App.tsx` at m45's review and `TerminalControl.tsx` at m46's.
- **AND THE TREE-LEVEL COST IS ADMITTED, because it is the one nobody can see.** This milestone adds
  roughly **+9 net files** (≈4 `.mjs` + 4 `.d.mts` + 2 `.tsx`, less the deleted `Landing.tsx`) and an
  8th top-level directory. **It cannot pay for itself in file count and this ADR does not pretend it
  can** — m46/ADR-001 promised a net-negative subtree and shipped 2.2× the files (TECH_DEBT 28), and
  the sharp part there was the prediction, not the number. m49 is the **fourth consecutive**
  milestone to grow `ui/src` by adding files with every per-file gate green throughout (m46 +17,
  m47 +8, m48 +0, m49 ≈+9). **The Nth instance is where a ratchet goes**, so this milestone lands
  TECH_DEBT 28 fix (b) / 33 fix (b) — the directory-level count — as a fitness function (§Fitness
  functions, `acd-ui-directory-budget`). See §Codebase health finding 1.

**Alternatives rejected.**
- **Absorb into `ui/src/fleet/`.** Rejected: it is 18(a)'s exact shape in the directory m47 just grew
  by 67%, it would make the home's panes importable-from and therefore coupled to the fleet's
  assignment vocabulary, and it would put the read-only surface and the interactive surface in one
  swept directory — which would force invariant 4's part 1 and part 3 sweeps to grow per-file
  exemptions, i.e. to become permission lists. That is the failure ADR-008 exists to avoid.
- **`ui/src/app/home/`.** Rejected for m46/ADR-001's own reason, verbatim: `ui/src/app/` holds the
  HOST set (13 files, all shell/router) and folding a domain surface into it silently redefines
  `app/` as "everything shared" — the under-description that turned `board/` into the shared library.
- **Keep `/` shell-rendered and swap the component.** Rejected on the measured containment argument
  above: it is the one option that puts a socket-opening surface outside the crash boundary, and it
  would make `SHELL_RENDERED_ROUTES` mean two different things (a route with no surface, and a route
  with a big one).
- **Keep `Landing.tsx` beside the home as a fallback.** Rejected: two things rendering `/` is the
  duplicate m46 spent a milestone deleting, and a fallback nothing selects is dead code with a live
  import — m46/ADR-007's own diagnosis.

**Consequences.**
- `ui/src/main.tsx`, `ui/src/app/entry.mjs`, `ui/src/app/Shell.tsx` each take a small enumerable
  edit; `ui/src/app/Landing.tsx` is deleted. **The list of carriers, MEASURED rather than recalled**
  (`grep -rln '"landing"' test/` plus the `SHELL_RENDERED_ROUTES`/`Landing` importers): the six suites
  naming the route id — `test/app-routes.test.mjs`, `test/shell-entry-plan.test.mjs`,
  `test/shell-navigation.test.mjs`, `test/shell-regions.test.mjs`,
  `test/shell-surface-containment.test.mjs`,
  `test/arch/acd-no-surface-mode-url-literal.test.mjs` — plus `test/support/shell-app-harness.mjs`,
  and `ui/src/app/entry.d.mts` beside `entry.mjs`. **All move in the same diff** (ADR-006/m46's rule:
  every list moves with the code).
  **CORRECTION, 2026-08-13 (developer's feasibility pass):** this list previously named
  `test/arch/acd-rendered-component-fed-by-route.test.mjs`. **That was wrong** — it has **zero**
  `landing` references and is m38/ADR-008's *fleet current-work projection* gate ("every component
  that renders a per-node card derives its line from `fleetCurrentWorkLines`"). It has no bearing on
  the route switch; it binds on the **dedupe** work and is re-homed to ADR-010's consequences.
  Mis-routing a gate to the wrong story is how a story is asked to update a file it has no reason to
  open — and how the story that *should* have updated it does not know.
- The three shell harnesses (`test/support/shell-*-entry.tsx`) gain a home entry or explicitly do
  not — TECH_DEBT 29's lesson binds: a surface tested only through a stub is untested.
- `ui/src` gains an 8th top-level directory. Named, justified, ratcheted, and **not** claimed to be
  file-negative.

---

## ADR-002: A pane is a MOUNT DECLARATION produced by ONE module, in the shape `fleetTerminalMount`/`boardDockMount` already froze; the grid's rows come from the SESSION INDEX ALONE — an assignment is not a session and is never enumerated as one — and `local-pty` panes are OUT of milestone 49, so `/api/mesh/board-url` gains no `origin` field here

**Status:** Accepted
**Date:** 2026-08-13

**Context.** Two producers of a mount declaration already ship, with an identical frozen return shape
and a comment saying so in terms: *"One shape, two producers: that is what makes 'the only thing that
differs between the two surfaces is what they declare' checkable"*
([terminal-mount.mjs:148-150](../../../ui/src/fleet/terminal-mount.mjs#L148);
[dock-mount.mjs:58-72](../../../ui/src/board/dock-mount.mjs#L58)). Each returns a deeply frozen
`{ bound, rendersPanel, source, params, posture, ref, farEnd, detail, command, reason, spawnedHere,
unavailable }`, resolves its source through `sessionSourceFor` rather than assembling one, and is
imported by its surface's `.tsx` as a BARE call. `acd-terminal-control-boundary` already gates the
non-assembly rule across all of `ui/src` and asserts `callSites >= 2`
([:392](../../../test/arch/acd-terminal-control-boundary.test.mjs#L392)).

**What is genuinely new is the ROW SET, and it is where the milestone's hardest boundary is.** Two
distinct addressable paths to a `mirror` pane exist today, with different producers and different
guarantees, and nothing has ever written down that they are two:

| path | address from | who produces it | is it fed? |
|---|---|---|---|
| **assignment-derived** (today's fleet card peek) | `assignment.targetNodeId` + `assignment.sessionId` ([api.ts:117-126](../../../ui/src/fleet/api.ts#L117)) | the worker captures its own session id (m38/ADR-013); **no hook needed** | **YES** — it IS the assignment execution, and `sendTerminalFrame` fires for it ([mesh-launcher.mjs:1151](../../../src/mesh-launcher.mjs#L1151), [:1290](../../../src/mesh-launcher.mjs#L1290)) |
| **index-derived** (m48's `sessions[]`) | `MeshSession.nodeId` + `.sessionId` ([api.ts:219-228](../../../ui/src/fleet/api.ts#L219)) | `aof session start\|ping` only, i.e. a hook in the cwd's own config ([commands/mesh-session.mjs:318,323](../../../src/commands/mesh-session.mjs#L318)) | **ONLY IF** the same tuple is also a worker execution |

`MeshSession` carries **nothing addressing-shaped beyond the tuple** — no `ref`, no `provider`, no
board origin — so it can only ever resolve against the frozen table's `mirror` row
([source-table.mjs:75-85](../../../ui/src/terminal/source-table.mjs#L75)), never `local-pty`.

**Decision.**
- **ONE producer module, `ui/src/home/session-mount.mjs`**, exporting one function that takes a
  `MeshSession` row (plus whatever the surface joins onto it) and returns the SAME frozen mount shape
  the two existing producers return. It resolves its source through `sessionSourceFor("mirror")` and
  assembles no descriptor. A third producer of that shape is a third chance to disagree, which is why
  there is exactly one per surface and why `acd-terminal-control-boundary`'s call-site floor rises
  from 2 to 3.
- **THE GRID ENUMERATES FROM `status.sessions[]` AND FROM NOTHING ELSE.** m48/ADR-003 and ADR-007
  made `buildSessionIndex` ([global-mesh-query.mjs:197](../../../src/global-mesh-query.mjs#L197)) the
  one authority over "what live sessions exist across the mesh", a pure projection that performs no
  I/O, reads no clock and stores nothing. **An assignment is not a session.** No module under
  `ui/src/home/` may read `status.items[]` or an `assignment` row to produce a ROW; it may join them
  onto a row it already has (for a work-item label), and that join is by `workItem.ref` into
  `items[]`, which is exactly what m48 designed the entry for.
- **THE CONSEQUENCE IS STATED RATHER THAN HIDDEN, and it is a product defect this ADR deliberately
  does not paper over.** In a workspace the standard bundle provisioned, a running **Claude** worker
  assignment publishes NO presence session record, so it renders **a live streaming terminal on its
  milestone card and NO ROW in the terminals home** — two surfaces on one page disagreeing about
  whether a session exists. The fix for that is the PRODUCER, not a second enumeration in the
  browser. **That is the whole reason ADR-005 exists**, and this boundary is what makes the producer
  gap a blocking question instead of a nice-to-have.
- **`local-pty` PANES ARE OUT OF MILESTONE 49.** The index cannot address one; there is no
  `(ref, provider, boardOrigin)` on any row. A `local-pty` pane can only be opened from board or
  work-item context, which is a different entry point and a different milestone (50's "new session"
  verb). Spike 44's finding is not overturned — direct-dial remains the answer *when there is
  something to dial from* — it is simply not reached here.
- **THEREFORE `GET /api/mesh/board-url` GAINS NO `origin` FIELD IN THIS MILESTONE.** Building it now
  ships an additive wire field with no reader, which is the exact defect m48's own OUTCOME records
  against itself (*"The index is served and typed; it has no reader"*). Spike 44 sub-question 1's
  specification stands unchanged and is milestone 50's first task; the `workspace-not-local` guard it
  also asked for has already shipped ([mesh-ui-serve.mjs:348-351](../../../src/mesh-ui-serve.mjs#L348),
  m47/ADR-011). **The reversal condition, named:** the first pane opened from a `ref` rather than
  from an index row is the change that earns the field.
- **A ROW THAT CANNOT BE ADDRESSED IS NOT A PANE.** `MeshSession.sessionId` is a non-empty string by
  the index's own construction ([global-mesh-query.mjs:280](../../../src/global-mesh-query.mjs#L280)
  skips anonymous sessions), so a half-tuple should be unreachable — and the mount module still
  returns the `noPanel` shape for one, exactly as `fleetTerminalMount` does
  ([:130-146](../../../ui/src/fleet/terminal-mount.mjs#L130)). "No stream" is a first-class honest
  outcome; it is NOT `unavailable`, and the two must not be confused (that file says so at
  [:28-34](../../../ui/src/fleet/terminal-mount.mjs#L28), and this is exactly the milestone where
  they would be confused by accident).

**Alternatives rejected.**
- **Enumerate `sessions[] ∪ assignments-with-a-sessionId`.** Genuinely tempting — it makes the grid
  full TODAY with no producer work, and it is the union the fleet card peek already effectively
  renders. Rejected: it creates a **second enumeration authority over liveness**, which m48/ADR-003
  forbids in terms and which brings its own staleness rule (an assignment row's `state` is dispatch
  lifecycle, not liveness — a `running` assignment on a dead node stays `running`). The grid would
  then show sessions the mesh does not believe are live, which is the precise lie this milestone
  exists to remove. It is also the shape that would let ADR-005's producer gap go unfixed forever by
  hiding it.
- **Add `ref`/`provider`/`origin` to `MeshSession` so a `local-pty` can be a row.** Rejected: m48
  froze the entry as `nodeId` + the presence six + one derived field, and its OUTCOME states the
  order is the contract. Three new fields for a lane no producer feeds is a wire change bought with
  nothing.
- **A new fleet route serving a purpose-built "panes" payload.** Rejected: the fleet face's read
  surface is one polled status route (`mesh-ui-read-only-contract`'s own assertion is that every
  `/api` request on the wire is a GET poll of the status route), and a second read route would need
  its own freshness rule beside a payload that already carries one.
- **Let each pane component resolve its own source.** Rejected: that is the per-call-site
  descriptor assembly `acd-terminal-control-boundary` already fails CI on, at 16 call sites instead
  of one.

**Consequences.**
- The home's mount producer is a leaf: it imports `ui/src/terminal/{source-table,input-policy,
  pane-identity}.mjs` and nothing else — the same three `terminal-mount.mjs` imports, minus
  `assignments.mjs`.
- `unavailable` remains producerless (correction 3 above; §Codebase health finding 4).
- `acd-terminal-control-boundary`'s `callSites >= 2` floor becomes `>= 3` in the same diff.

---

## ADR-003: The m46 connection ramp is UNCHANGED and gains NO WORD. Every new pane fact is a SECOND AXIS composed beside it — a FEED axis derived from wire fields the fleet already polls (never from bytes), and m46's own SUBSCRIPTION axis — with the composition precedence fixed HERE, in one place

**Status:** Accepted
**Date:** 2026-08-13
**Amended:** 2026-08-13 — **the MECHANISM for `no live output` with no socket is ruled, and this ADR's
own consequence "`state-ramp.mjs` is not edited by this milestone" is SUPERSEDED.** Read the
AMENDMENT note at the top of §Decision before building the feed axis: the seam this ADR chose is
**unreachable** on the shipped ramp without opening the very socket the rule forbids.
**Corrected:** 2026-08-13, at 49/05's structural review — **the AMENDMENT's parenthetical claim that
`PANE_EMPTY_HOST`'s CENTRED line *"is exactly the shape DG-49-2 asks for"* is FALSE and is struck.**
DG-49-2 says **top-left**, in three places, and `mocks/BASELINE.md` corroborates by contrast. The
amendment's STATE ruling (`idle`, therefore no socket) stands untouched; its TREATMENT claim was
outside its subject and DESIGN governs it (m46/ADR-005). The two uses of `idle` this milestone
created are two treatments, and the split is a DESCRIPTOR FIELD in `state-ramp.mjs` — never a branch
in `TerminalByteArea.tsx`. See the seventh batch in the preamble.

**Context.** m46/ADR-005 froze ONE connection-state vocabulary — `idle · connecting · waiting ·
streaming · ended · error · unavailable` plus the `unknown` fallback
([state-ramp.mjs:57-68](../../../ui/src/terminal/state-ramp.mjs#L57)) — and it spent a whole
milestone deleting a second one. **A second vocabulary is the exact defect m46 removed, so the first
question this milestone must answer is whether the new facts are states at all.** Measured, none of
them is:

| the fact SPEC names | is it a transport state? | what it actually is |
|---|---|---|
| **no live sessions at all** | no — there is no pane | a GRID-level empty state |
| **a node unreachable** | no — the pane never exists | `buildSessionIndex` gates on `node.freshness !== "live"` ([global-mesh-query.mjs:261](../../../src/global-mesh-query.mjs#L261)), so a stale node contributes ZERO sessions. **SPEC lists this as a degraded pane state; measured, it cannot be one** — the row simply leaves the index |
| **a session that ended mid-view** | **YES — already produced** | the ramp's `ended`. The worker's end-of-stream closes the browser socket ([mesh-ui-serve.mjs:726-733](../../../src/mesh-ui-serve.mjs#L726)) and, since F-38.06g, a late subscriber replaying an ended tail gets the end too ([mesh-terminal-mirror.mjs:202-208](../../../src/mesh-terminal-mirror.mjs#L202)). **No new word.** |
| **origin unresolvable** | **YES — already exists** | the ramp's `unavailable` with three frozen causes. Unreachable in m49 (ADR-002) |
| **addressable but never fed** | **NO** | transport-wise it is EXACTLY `waiting`: the socket is open and nothing has been said. What is new is a statement about whether a PRODUCER exists |
| **a pane the cap refused** | **NO** | nothing was opened. It is m46's existing `subscribed` flag ([host-model.mjs:227](../../../ui/src/terminal/host-model.mjs#L227), `HIDE`/`WATCH`, `COST_SUBSCRIPTION`) |

And the derivation for "never fed" is **arithmetic, not a heuristic**: `sendTerminalFrame` — the only
feeder of `createTerminalMirror` — has exactly two call sites, both in `src/mesh-launcher.mjs`'s
worker branch, both inside an assignment execution
([:1151](../../../src/mesh-launcher.mjs#L1151), [:1290](../../../src/mesh-launcher.mjs#L1290)); the
index joins `workItem` onto a session on `(target_node_id, session_id)` (m48/OUTCOME). So
`workItem != null` ⟺ an assignment owns this tuple ⟹ a producer exists; `workItem == null` ⟹ **no
call site anywhere in `src/` will ever feed this tuple**.

**Decision.**

> **AMENDMENT, 2026-08-13 — raised by QA's story-05 lane. The seam this ADR chose is UNREACHABLE, and
> the mechanism is ruled here.**
>
> **The defect, measured.** DG-49-2 requires both halves at once: a `no-producer` pane says
> `no live output` **and** opens no socket. This ADR routed the wording through
> `describeTerminalState`'s injected `reason`, which is honoured **on `waiting` only**
> ([state-ramp.mjs:576-584](../../../ui/src/terminal/state-ramp.mjs#L576)). But `waiting` is reachable
> from exactly one place — `applyTerminalEvent`'s `SOCKET_OPEN` case, and only from `connecting`
> ([:287-290](../../../ui/src/terminal/state-ramp.mjs#L287)) — and `terminalEntryState` derives
> `connecting` for anything the caller declares `bindable`
> ([:221-224](../../../ui/src/terminal/state-ramp.mjs#L221)). **So the wording cannot be reached
> without opening the socket the rule forbids.** Left alone, a bindable-but-unfed pane sits on
> `connecting…` forever.
>
> **The three obvious answers are all closed, and naming why is what leaves only the right one:** a
> new ramp word is a second vocabulary (this ADR's own subject); `connecting…` forever is a **lie** —
> that word asserts a socket is opening and none is; and opening a socket anyway costs a slot the cap
> governs (ADR-006), pushes a tuple that will never stream into the mirror's 64-key tail budget, and
> collapses the one distinction the feed axis exists to draw.
>
> **THE RULING: the pane is not `waiting` — it is NOT BOUND, and the ramp already has that word.**
> `idle` means *"no source bound"*; its pane treatment is `PANE_EMPTY_HOST`, which
> `TerminalByteArea` already renders as **a box with one centred line and no terminal**
> ([TerminalByteArea.tsx](../../../ui/src/terminal/TerminalByteArea.tsx), the `PANE_EMPTY_HOST`
> branch) — which is *exactly* the shape DG-49-2 asks for, and, not coincidentally, exactly the shape
> DG-49-4 asks for the held tile (ADR-007's amendment). **No socket opens because nothing binds.**
> Both halves are satisfied with no new word, no new treatment and no new component.
>
> **`bindable` IS THE SEAM, AND IT IS ALREADY AN ARGUMENT.** `terminalEntryState(current, { bindable })`
> takes it from the caller, and its own header states the discipline this ruling relies on: it is
> one-way, it speaks only for `idle`, and *"an observed fact outranks a derivation"*
> ([:217-220](../../../ui/src/terminal/state-ramp.mjs#L217)). So the home computes `bindable` in its
> `.mjs` set from the two axes this ADR already defines — **bindable iff `producer-known` AND
> subscribed** — and the axes compose into the ramp's ENTRY rather than into its vocabulary, which is
> what this ADR asked for in the first place.
>
> **ONE SHARED-CORE CHANGE, and it is the correction of a latent m46 defect rather than a new
> capability.** `IDLE_PANE_LINE = "No session. Press Run agent on an item."`
> ([:134](../../../ui/src/terminal/state-ramp.mjs#L134)) is a hard-coded sentence naming **one host's
> affordance** on a control with three hosts and now four — "Run agent" is a board control that does
> not exist on the fleet card or the grid. It should have been per-call-site from the start, for the
> identical reason `reason` and `readOnlyLabel` already are. So:
> - **the injected-`reason` seam widens from `waiting`-only to `waiting` OR `idle`** — the only two
>   states that have observed nothing — under the existing precedence rule **verbatim and unweakened**:
>   an observed fact outranks an injected one, so no other state may be overwritten;
> - **`IDLE_PANE_LINE` survives as the default** when nothing is injected, so the dock and the board
>   are byte-identical;
> - **`idle` gains `opensSocket: false`** on its descriptor, which today only `unavailable` carries
>   ([:573](../../../ui/src/terminal/state-ramp.mjs#L573)). The property is the structural half of "no
>   socket is opened" and it should be a VALUE both no-socket states carry rather than one stated and
>   one implied — one derivation, two readers, which is this control's own rule.
>
> **SUPERSEDED: this ADR's consequence "`ui/src/terminal/state-ramp.mjs` (← 12 dependents) is **not
> edited by this milestone**."** It is edited, in one `if` and one descriptor field, and the ADR says
> so rather than letting a story discover it mid-build. `input-policy.mjs` is still untouched.

- **THE RAMP IS UNTOUCHED.** `TERMINAL_STATES` keeps seven members, `unknown` stays a non-member, and
  no module in this milestone adds, renames or re-reads a state word. This is an invariant, not a
  default: `acd-terminal-control-boundary` already asserts one vocabulary, and §Fitness functions
  extends it to say the home defines no state word of its own.
- **AXIS 2 — THE FEED AXIS, three values, closed, all derived from fields the fleet already polls:**
  - `producer-known` — the row is in the index and carries `workItem != null`. An assignment owns
    this tuple, so a producer exists (it may have settled; a producer existing is not a promise of
    bytes).
  - `no-producer` — the row is in the index and carries `workItem: null`. Nothing feeds this tuple.
    The socket will open, replay nothing, and stay silent.
  - `roster-gone` — the tuple was in a previous poll's index and is not in the latest. Its owning
    node stopped being `live`, or its session ended. **The socket does NOT close on its own** — the
    relay subscription is per-tuple and a node going stale stops publishing presence without
    touching the stream — so without this value the pane would sit reading `streaming`/`waiting`
    about a session the mesh no longer lists.
- **DERIVED IN THE BROWSER, FROM THE WIRE — NEVER FROM BYTES, AND NEVER AS A NEW WIRE FIELD.**
  Client-side content-sniffing of terminal output to infer agent or feed state is forbidden
  ([source-table.mjs:126-137](../../../ui/src/terminal/source-table.mjs#L126);
  [mesh-ui-serve.mjs:718-722](../../../src/mesh-ui-serve.mjs#L718);
  [acd-fleet-terminal-input-constrained.test.mjs:214-218](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L214)) —
  *"the browser writes these bytes STRAIGHT into xterm, so sniffing control content out of terminal
  bytes would turn a dumb painter into a parser"*. Equally, the index entry does **not** grow a
  `fed: boolean`: it is derivable from a field already on the wire, and two homes for one fact is
  the defect these ADRs keep refusing.
- **THE DERIVATION'S CORRECTNESS DEPENDS ON A SERVER-SIDE FACT, SO THAT FACT IS GATED.** If a third
  `sendTerminalFrame` producer is ever added — a board bridge, a loopback worker — the browser's
  `no-producer` answer silently becomes wrong. `acd-terminal-output-signal-source` already discovers
  producers by sweeping `src/` and asserts a FLOOR of two — the guard is
  [`producers.length < 2` at :167](../../../test/arch/acd-terminal-output-signal-source.test.mjs#L167)
  and its message at [:169](../../../test/arch/acd-terminal-output-signal-source.test.mjs#L169); it gains a
  **shrink-only CEILING** whose refusal text names this ADR. That is the single cheapest thing that
  keeps a browser derivation honest across a build boundary, and it is the same technique
  `acd-terminal-mirror-geometry-pinned` uses for 80×24.
- **WHICH NODES COUNT FOR THE "AGENTS ARE WORKING, NONE IS VISIBLE" EMPTY STATE: LIVE ONES ONLY.**
  (QA's story-04 question against DG-49-1's second empty state, which says it fires when *"at least
  one node reports `activeRuns`"* without saying which nodes. **QA's live-only reading is CONFIRMED,
  and the reason is structural rather than a preference.**) A stale node's presence file is frozen on
  disk **with its `activeRuns` inside it**, so a non-live node reports runs forever; that is the exact
  hazard `buildSessionIndex` gates on when it drops every session from a node whose `freshness !==
  "live"` ([global-mesh-query.mjs:261](../../../src/global-mesh-query.mjs#L261)), and m48's own
  Assumption states it — *"the index's freshness gate is node-level"*. **If the empty state counted a
  stale node, its claim would derive from a DIFFERENT liveness rule than the row set it is explaining**
  — two authorities over liveness on one screen, which is m48/ADR-003 one layer up, and the pane it
  produces would be a sentence asserting current work from a record nobody has refreshed. The
  narrowest correct form: the empty state's "agents are working" clause is computed over exactly the
  nodes the index itself would accept, from the same `freshness` field, read and never re-derived.
- **AXIS 3 — SUBSCRIPTION — IS m46's, REUSED, NOT REBUILT.** A pane over the cap, or one the operator
  hid, is simply `subscribed: false`; `terminalSessionIdentity` already returns `null` for it
  ([host-model.mjs:246](../../../ui/src/terminal/host-model.mjs#L246)) and the worded Watch/Hide
  toggle already declares `COST_SUBSCRIPTION` with the honest statement that a re-watch starts empty
  ([:281-282](../../../ui/src/terminal/host-model.mjs#L281)). ADR-006 arbitrates who is subscribed;
  the vocabulary for saying so already exists.
- **THE COMPOSITION PRECEDENCE, FIXED HERE BECAUSE ONE PANE HAS ONE HEADER AND ONE PANE LINE:**
  1. **Not subscribed wins outright.** There is no socket, therefore no transport fact to report.
     The pane says why it is not watching and offers the toggle. It does **not** borrow a ramp word.
  2. **Otherwise the RAMP's word is the pane's word**, with exactly ONE narrowing: on `waiting`
     ONLY, the feed axis supplies the pane's `reason`. That is not a new mechanism — it is the
     seam m46 already built and the fleet already uses:
     `describeTerminalState(state, { reason })` honours an injected reason **on `waiting` alone**
     ([state-ramp.mjs:576-584](../../../ui/src/terminal/state-ramp.mjs#L576)), because *"a pane that
     actually received bytes keeps its own, stronger, observed fact whatever an assignment says"*.
     The home is the third injector through that seam and the shared set does not change.
  3. **`roster-gone` ANNOTATES, never replaces.** A stale node's worker can genuinely keep relaying,
     so the transport fact stays true and the annotation says the mesh no longer lists this session.
  4. **The home's mount module decides the injected `reason` in ONE place**, including for a
     `producer-known` row that also carries a terminal assignment state — there is one `reason` field
     and one author for it, exactly as `fleetTerminalMount` owns the fleet's
     ([:120-125](../../../ui/src/fleet/terminal-mount.mjs#L120)).

**Alternatives rejected.**
- **Add `unfed` (or `silent`, or `orphaned`) as an eighth ramp state.** Rejected, and this is the
  named tempting move: it reads cleanly at a render site and it is a second vocabulary. The ramp's
  words are TRANSPORT facts a browser can observe (`state-ramp.mjs:22-23`); "nothing will ever feed
  this" is a claim about a producer on another machine, which is exactly the class of assertion
  `streaming` beat `running` for not making.
- **Put the feed fact on the wire as `MeshSession.fed`.** Rejected: derivable from `workItem`, and
  m48 froze the entry's shape and order as the contract.
- **Sniff the byte stream for a prompt/idle marker.** Rejected by three shipped gates and their
  stated rationale; it would also let a worker's own PTY output FORGE the state.
- **Let each pane component compose its own precedence.** Rejected: 16 panes, 16 chances to disagree,
  in JSX no test in this repo can reach.

**Consequences.**
- ~~`ui/src/terminal/state-ramp.mjs` (← 12 dependents) is **not edited by this milestone**.~~
  **SUPERSEDED by the AMENDMENT above:** it takes exactly two edits — the `reason` injection widened
  to `idle`, and `idle` carrying `opensSocket: false`. Its **12 dependents are unaffected** by both:
  the default line is unchanged, so every existing consumer renders byte-identically, and the new
  field is additive. `input-policy.mjs` (← 12) is still **not edited**. The blast radius of the
  honest-states work is otherwise entirely inside `ui/src/home/`.
- The grid's "no live sessions at all" empty state is the home's own, written in `ui/src/home/`, not
  imported from `ui/src/fleet/PageStates.tsx` (ADR-001's no-sideways-import rule).
- A pane whose row leaves the index while it is open is a case with no prior art anywhere in this
  product. It gets a scenario.

---

## ADR-004: Agent state is ONE additive wire hop for an EXISTING, PRODUCED fact — `code`/`needs-input` through `projectAssignment` and `WorkAssignment`, assignment-scoped ONLY. Free-session agent state is OUT OF SCOPE for milestone 49, and the honest consequence is stated on screen rather than invented

**Status:** Accepted
**Date:** 2026-08-13

**Context.** SPEC asks for "agent state per pane — blocked / working / done, so the fleet is scannable
without reading output". Measured, exactly one third of that exists and it is genuinely good.

`src/mesh-worker-execution.mjs` produces a real "the agent is blocked on a person" fact: an explicit
`NEEDS_INPUT_SENTINEL` ([:914](../../../src/mesh-worker-execution.mjs#L914)) observed in the session's
own PTY output, or an unanswered `tool_use` naming a human-input tool, yields
`{ outcome: "needs-input" }` ([:1186](../../../src/mesh-worker-execution.mjs#L1186),
[:1201](../../../src/mesh-worker-execution.mjs#L1201)) and is reported **live, while the assignment
stays `running`**, as `sendAssignmentStatus(assignmentId, "running", { code: "needs-input" })`
([:2654](../../../src/mesh-worker-execution.mjs#L2654),
[:2702](../../../src/mesh-worker-execution.mjs#L2702),
[:3158](../../../src/mesh-worker-execution.mjs#L3158)). It is persisted on the assignment record's
`code` column and rides the SHARED row mapper
([assignment-record.mjs:114-116](../../../src/assignment-record.mjs#L114)), which every reader uses.

**And the fleet's wire projection drops it at exactly one hop.** `projectAssignment`
([global-mesh-query.mjs:132-148](../../../src/global-mesh-query.mjs#L132)) copies eight fields plus an
optional `sessionId`; `code` is not among them. `grep -rn "needs-input" ui/src` returns nothing, and
`WorkAssignment` ([api.ts:117-126](../../../ui/src/fleet/api.ts#L117)) has no `code`. The fact is
produced, captured, persisted and mapped — and has never reached a browser.

For a **free** session there is nothing at all. `assignmentChip` reads `.state`/`.reclaimedAt` off an
assignment row ([assignments.mjs:68-69](../../../ui/src/fleet/assignments.mjs#L68)); a free session
has no row. None of the frozen six presence fields carries a behavioural fact. This is not "derive
it" — it is "there is nothing to derive it from".

**Decision.**
- **(a) THE HOP: `code` joins `projectAssignment`'s copied set and `WorkAssignment`'s type.** One
  field, one function, one type — additive, "absent, not false" (an assignment with no code omits the
  key entirely, the same house rule `sessionId` already follows at
  [:145-147](../../../src/global-mesh-query.mjs#L145)). Nothing else moves: no new column, no new
  producer, no second vocabulary, and **no change to `src/assignment-record.mjs`** — the graph reports
  it at **38 dependents**, a genuine god-node, and the mapper already carries the field.
- **(b) `needs-input` IS THE WHOLE AGENT-STATE VOCABULARY OF THIS MILESTONE, and it composes as a
  THIRD axis beside ADR-003's two.** It is not a ramp word (a far-end process fact, not a transport
  one) and not a feed value (a producer exists; it is waiting for a human). SPEC's
  *blocked / working / done* maps as: **blocked** = `code === "needs-input"`; **done** = the
  assignment chip's own terminal reading, which already exists and already owns the words
  ([terminal-mount.mjs:105-125](../../../ui/src/fleet/terminal-mount.mjs#L105) derives terminal-ness
  from `assignmentChip` precisely so a hand-maintained state set cannot drift — and it drifted once,
  leaking `withdrawn` and `stale`); **working** is the absence of both. **No new set of state strings
  is defined anywhere.**
- **(c) FREE-SESSION AGENT STATE IS OUT OF SCOPE FOR MILESTONE 49, explicitly and with the
  consequence named.** A free session gets **no agent-state chip at all** — not `unknown` dressed as
  a state, not a spinner, not an inferred one. What it gets instead is ADR-003's feed axis, which
  says something TRUE about it (`no-producer`: this session is listed and nothing will stream from
  it). Building a producer for free-session state means either a new worker-side observer for
  sessions no worker owns, or client-side sniffing — the first is a milestone, the second is
  fitness-gated and forbidden.
- **(d) WHAT THE OPERATOR WILL AND WILL NOT SEE, stated plainly so no story promises otherwise.**
  *Will:* for a pane whose session is an assignment execution — the overwhelming majority of panes
  that ever stream a byte, by ADR-003's arithmetic — a live `blocked` chip the moment the worker
  reports it, and a `done`/`failed` reading from the chip that already exists. *Will not:* any agent
  state for a free session; any agent state for an assignment on a node running a pre-hop build
  (absent, not false, so it degrades to `working`); and any distinction between "working" and
  "stalled" — stall detection is SPEC's own named out-of-scope arc and remains so.

**Alternatives rejected.**
- **Infer state from terminal bytes in the browser.** Rejected by three shipped gates and by their
  stated design reason. Named here because it is the cheapest-looking way to satisfy SPEC's headline
  and it is the one thing this milestone may not do.
- **Add a second `code`-like field to the session index entry so free sessions can carry state
  too.** Rejected: there is no producer to fill it, and a wire field nothing writes is worse than
  absent — it reads as "this session is not blocked" when the truth is "nobody knows".
- **Derive `blocked` from `state === "running"` plus elapsed time.** Rejected: that is a stall
  heuristic wearing an agent-state label, it needs a clock in a projection m48 deliberately kept
  clock-free, and it would report a long compile as a human-input request.
- **Widen `projectAssignment` to pass the whole row through.** Rejected: the eight-field projection
  is a deliberate wire boundary; passing the row through would ship `worktreePath`-class fields to a
  browser for the sake of one column.

**Consequences.**
- `src/global-mesh-query.mjs` (← 13) takes a three-line edit; `ui/src/fleet/api.ts` takes a one-line
  type addition. Both are additive and both are read by the fleet card too — which gets the
  `needs-input` signal for free, and that is a bonus, not a scope item.
- `acd-assignment-record-frozen` and `acd-assignment-state-has-producer` both name the assignment's
  field set; whichever enumerates the projected wire shape moves in the same diff (m46/ADR-006).

---

## ADR-005: The missing bundled CLAUDE session hooks are IN SCOPE — but they land LAST, strictly AFTER ADR-003's honest feed axis, because the hook alone makes the grid fuller and less useful

**Status:** Accepted
**Date:** 2026-08-13

**Context.** ADR-002 drew the boundary at "the session index is the one enumerating authority". That
boundary is correct and it has a cost, and the cost is measurable at source.

`startSession`/`pingSession` are reached only through `aof session start|ping|end`
([commands/mesh-session.mjs:318,323](../../../src/commands/mesh-session.mjs#L318)), which fires only
from a `SessionStart`/`UserPromptSubmit`/`SessionEnd` hook in the **cwd's own** hook config. The
distributed bundle ships that triple for `runtimes: ["codex"]` only
([bundle.json:12-14](../../../src/bundle/bundle.json#L12)); the sole `runtimes: ["claude"]` hook
member is `claude-artifact-sync`, which is `PostToolUse` and unrelated
([:15-16](../../../src/bundle/bundle.json#L15)). This repo gets Claude session records because its
own `.claude/settings.json` was hand-authored on the first mesh commit — a **dogfooding artefact**,
not something `aof work init`/`update` gives anyone.

Two things follow, and the second one is the one that decides this ADR.

1. **In a workspace the standard bundle provisioned, a Claude session — worker assignment, board PTY
   or hand-run — produces no presence record, hence no index entry, hence no row in the terminals
   home.** The measured fleet at this refine has this exact shape: three roster nodes, two with
   non-empty `activeRuns` and **all three with `sessions: []`** (RESEARCH §Q1). The grid would render
   empty on a fleet that is demonstrably working.
2. **Therefore every demo, UAT and manual sign-off of this milestone on THIS machine runs on a
   configuration no other workspace has.** That is a validity problem, not a convenience one: the
   surface would be accepted against evidence that cannot be reproduced anywhere the product ships.

**Decision.**
- **The bundled Claude session hooks are IN SCOPE for milestone 49.** Three new hook members mirroring
  the three that already exist for codex — `SessionStart` → `aof session start`, `UserPromptSubmit` →
  `aof session ping`, `SessionEnd` → `aof session end` — declared `runtimes: ["claude"]` in
  `src/bundle/bundle.json` beside their codex siblings. **No new CLI verb, no new producer, no new
  record shape**: the verb, the ladder that resolves the session id (m48), the TTL and the reaper all
  already exist and are unchanged. This is a wiring gap, and it is the difference between the
  milestone's headline being true and being true only here.
- **IT LANDS LAST, AND THAT ORDERING IS PART OF THE DECISION.** A hook that ships before ADR-003's
  feed axis makes the product **measurably worse**: every newly-recorded Claude session is a free
  session, and by ADR-003's arithmetic a free session is `no-producer` — an addressable pane that
  will never receive a byte. Landing the hook first converts an empty grid into a grid full of panes
  that say `waiting for output` forever. **A fuller grid of silent panes is a worse product than an
  honest empty one**, and it is the failure mode a story ordering can prevent for free.
- **The rollout is stated, because a bundle member is not a deploy.** A workspace picks these up on
  `aof work update`; existing workspaces are unchanged until then; `aof work init` provisions them
  from the next release. This repo's hand-authored `.claude/settings.json` is left alone — it already
  does the same thing, and deleting it inside this milestone would make the one machine that can
  demonstrate the feature stop being able to, mid-milestone. Reconciling the two is a chore, not this
  ADR's business.
- **NO CHANGE TO `mesh-worker-execution.mjs`'s spawn.** It runs `claude` with no `--settings`
  override ([:1412](../../../src/mesh-worker-execution.mjs#L1412)) and whatever hooks fire are the
  checked-out worktree's own. Injecting a hook config at spawn time would put a second, invisible
  authority beside the workspace's own configuration, and it would make a worker's sessions behave
  differently from an operator's in the same repo.

**Alternatives rejected.**
- **Leave the gap and ship the grid.** Rejected: it makes the milestone's own headline false
  everywhere except this repo, and it defers the discovery to whoever first opens `/` on a customer
  workspace — the worst possible moment, because the surface will look broken rather than
  unprovisioned.
- **Close it in the browser by enumerating assignments too.** Rejected in ADR-002: a second
  enumeration authority, and it would leave the real gap (free Claude sessions are invisible to the
  mesh entirely) unfixed and unfindable.
- **Ship the hook and let the silent panes be.** Rejected on the measurement above. The ordering
  constraint costs nothing and removes the failure entirely.
- **Make it a separate milestone.** Rejected: it is three JSON members and three files copied from
  their codex siblings, and separating it means m49 accepts with an empty grid and a note.

**Consequences.**
- `src/bundle/bundle.json` and three new `src/bundle/hooks/claude-session-*.json` files. The graph
  does not carry these (JSON is not code), so the coupling here is asserted from reading, not from
  the graph — stated because that is exactly the kind of gap the graph step exists to make visible.
- `test/mesh-assistant-hook-wiring.test.mjs` is the existing home for this assertion and is where the
  new members are pinned. `acd-bundle-*` drift guards and `aof work update`'s parity check apply
  unchanged.
- The grid becomes populated in a normally-provisioned workspace — with panes that are honest about
  never streaming, which is what makes this safe to land.

---

## ADR-006: The live-socket ceiling is a CLIENT-ENFORCED PRODUCT POLICY of 16, argued from the mirror's replay burst and its 64-tuple tail budget and from main-thread contention — NEVER from a browser limit; it is arbitrated by ONE pure function over the whole row set, and a pane beyond it is UNSUBSCRIBED, not refused

<!-- TITLE NOTE (amendment 2026-08-13): "arbitrated by ONE pure function over the whole row set" is
     unchanged and correct — what changed is that the function's inputs are FOUR, not three, and that
     priority ALLOCATES rather than EVICTS. The title is left as written; §Decision's AMENDMENT block
     is authoritative over both. -->


**Status:** Accepted
**Date:** 2026-08-13
**Amended:** 2026-08-13 — **four clauses ruled in the Decision below; two of them supersede text**
(the arbiter's argument list, and the eviction rule), one settles a written contradiction with DESIGN
(the grid's display order), and one corrects a stale rationale this ADR's own argument rests on. Read
the AMENDMENT note at the top of §Decision **before building the arbiter**: the three-argument form
specified below is not merely under-described, it is *unsatisfiable* — driven, it reproduces the
exact data-loss defect this ADR's own cap exists to prevent.
**Amended (second pass):** 2026-08-13 — **AMENDMENT (5), raised by QA's behavioural review of story 02
(F-49-02-c).** AMENDMENT (1)'s own obligation (b) is superseded: `result ⊇ currentlySubscribed ∩
liveRows` is FALSE at any cap below the retained count, and the shipped arbiter satisfied it by
asserting it as a literal (`demoted: []`) while releasing twelve live incumbents under a fabricated
`hidden` label. The retention invariant is restated in a TOTAL form, a third release cause
(`cap-lowered`) is added with a biconditional precondition, and `demoted` is deleted from the return
shape. **The three-argument form was unsatisfiable; the four-argument form was under-specified in its
RESULT, and that is where this pass lands.**
**Amended (third pass):** 2026-08-13, at 49/05's structural review — **I1 holds of the ARBITER and is
FALSE of the PRODUCT, measured: 20 open sockets at `MAX_LIVE_PANES = 16` after ONE poll.** A tile the
grid RETAINS past its row's departure keeps its socket and is filtered out of the arbiter's input, so
the vacated slot is refilled and the retained socket is spent off the books — unbounded under churn,
against the 64-tuple tail budget this ADR's whole argument rests on. **A socket is a socket: every
tile that holds one is an argument to the arbiter, retained tiles included.** And AMENDMENT (5d)'s
no-fall-through rule is extended from the arbiter's causes to the SURFACE's defaults, where the same
shape reappeared (`decision == null ? true`). See the seventh batch in the preamble.

**Context, and the first thing to say is what is NOT the constraint.** RESEARCH §Q3 measured it:
one headless Chromium page held **255 concurrent WebSockets to ONE origin**, the 256th refused, with
the server independently confirming `peak=255`. The commonly-cited "6 per origin" is the HTTP/1.1
per-host cap and does not govern WebSocket upgrades. Every `mirror` pane dials the SAME fleet origin,
so the platform ceiling is ~16× any grid an operator would read. **An ADR that justified this cap by
a browser limit would be wrong, and this one does not.**

Nor is the server the constraint, in the direction people expect. `serveMeshUi` creates one
`WebSocketServer({ noServer: true })` at [mesh-ui-serve.mjs:672](../../../src/mesh-ui-serve.mjs#L672)
and accepts every valid tuple at [:706](../../../src/mesh-ui-serve.mjs#L706) with **no admission cap,
no `bufferedAmount` gate and no backpressure** — the `ws.send(bytes)` at
[:735](../../../src/mesh-ui-serve.mjs#L735) is unconditional. A repo-wide grep
for `maxSockets|MAX_PANES|maxLiveSockets|concurrentSockets` returns zero hits. **Nothing upstream will
refuse for us.**

The three constraints that ARE binding:

1. **THE REPLAY BURST — the largest cost, and RESEARCH treats it only as a memory bound.** The mirror
   replays a bounded per-tuple tail **synchronously, to each new subscriber, before live frames**
   ([mesh-terminal-mirror.mjs:193-201](../../../src/mesh-terminal-mirror.mjs#L193)), at up to
   `MAX_TAIL_BYTES_PER_KEY = 256 KiB` per tuple
   ([:58](../../../src/mesh-terminal-mirror.mjs#L58)). Opening N panes at once therefore pushes up to
   N × 256 KiB of ANSI through one control-node event loop and into N xterms in the browser's, at
   grid open — the one moment every pane subscribes together. This is not the steady state; it is the
   worst instant, and it is the instant the operator judges the product on.
2. **THE 64-TUPLE TAIL BUDGET.** `MAX_TAIL_KEYS = 64` with LRU eviction
   ([:59](../../../src/mesh-terminal-mirror.mjs#L59), [:96-99](../../../src/mesh-terminal-mirror.mjs#L96)).
   Past 64 distinct tuples the control drops the least-recently-fed tail — and **a pane whose tail
   was evicted is byte-indistinguishable, from the browser, from a genuinely silent worker.** That is
   a dishonesty the milestone cannot render its way out of, so the cap must sit far enough below 64
   that this grid's own churn cannot cause it.
3. **MAIN-THREAD CONTENTION.** xterm.js is main-thread bound, and m46/ADR-003 **forbids** a
   canvas/webgl addon for this control because `scale` depends on the DOM renderer scaling crisply
   ([geometry.mjs](../../../ui/src/terminal/geometry.mjs); the project's own canvas migration measured
   5×–45× over the DOM renderer). Every pane is committed to the slower renderer by an already-shipped
   decision, at a fixed 1,920 cells (80×24, [source-table.mjs:48-49](../../../ui/src/terminal/source-table.mjs#L48))
   that does not shrink with tile size.

**Decision.**

> **AMENDMENT, 2026-08-13 — raised by QA's contract pass over story 02, ruled by the PO, recorded
> rather than silently rewritten.** Two bullets below are superseded. Everything else in this ADR
> stands unchanged — the number, its three-part argument, the client-side enforcement, the
> cross-build tie — and the original text is left intact beneath, marked, so the reasoning trail
> survives (this log supersedes; it does not rewrite).
>
> **(1) THE ARBITER TAKES FOUR ARGUMENTS. The CURRENTLY-SUBSCRIBED SET is the fourth, and the
> three-argument form below is UNSATISFIABLE.** The seam was specified as a pure function of *"the
> ordered row set, the cap and the operator's focus/watch intents"*. QA drove it and found the
> defect, which is worth stating as the counterexample rather than as a principle, because a builder
> reading the original literally reproduces it:
>
> > 16 incumbents subscribed at cap 16. The poll returns a 17th row that sorts FIRST (a newly-focused
> > pane, or simply a lower `(nodeId, sessionId)`). A priority-ordered arbiter over three inputs
> > recomputes "the top 16 by priority" and returns a set that **drops one incumbent** — the socket
> > closes, and because the mirror is ephemeral and its replay tail is bounded, that pane's
> > scrollback is **gone and cannot be given back**. Nothing the operator did asked for it, and the
> > tile it happened in may be scrolled off screen.
>
> A function that cannot see who is already subscribed **cannot express "do not demote"** — it can
> only recompute a ranking, and every recomputation is a potential eviction. So:
>
> **THE RULE, stated so it cannot be read as an ordering preference: PRIORITY ALLOCATES FREE SLOTS;
> IT NEVER EVICTS.** The arbiter is
> `subscribedSet(rows, cap, intents, currentlySubscribed) → subscribedSet`, and its two obligations
> are total and testable: (a) every member of `currentlySubscribed` that is **still a live row**
> stays subscribed — a row that LEFT the index is released, which is not a demotion because there is
> no session left to demote; (b) the priority order decides only which candidates fill
> `cap − |retained|` remaining slots. **`|result| ≤ cap` and
> ~~`result ⊇ currentlySubscribed ∩ liveRows`, for every input~~** — the second is the invariant the
> three-argument form could not even state, and it is what the fitness function asserts.
> **SUPERSEDED BY AMENDMENT (5) BELOW (same day, second pass): the containment is FALSE for every
> input at any cap below the retained count, and "for every input" is what made it false. Its total
> replacement is `|result ∩ retainable| = min(|retainable|, limit)`. `|result| ≤ cap` is unchanged
> and is the obligation that WINS when the two collide.** Read AMENDMENT (5) before building the
> retention half.
>
> **(2) THE EVICTION CLAUSE IS DROPPED. `DESIGN §DG-49-4` WINS, on the PO's ruling of 2026-08-13.**
> This ADR said *"watching one over the cap evicts the lowest-priority subscribed pane"*; DESIGN rules
> that at the cap the worded toggle is **absent** and *"there is NO auto-demotion"*, with the tile's
> line naming the recovery — `not streaming — <N> live panes already · hide one to watch this`. The
> two are a direct contradiction and **DESIGN is right**: my clause argued that a cap which refuses
> an operator is a cap they route around, and that reasoning holds for a *refusal* — but eviction is
> not a refusal, it is **an irreversible destruction of one pane's scrollback as a side effect of an
> action the operator took on a DIFFERENT pane**, which is the same class of harm as (1). Freeing a
> slot explicitly is one extra, fully legible click, and DESIGN has already made the state that asks
> for it calm and non-erroneous. It is also the only reading consistent with `HIDE`'s own declared
> `COST_SUBSCRIPTION` and its stated *"a fresh subscribe opens ONE new socket onto an EMPTY pane"*
> ([host-model.mjs:281-282](../../../ui/src/terminal/host-model.mjs#L281)) — a cost the control
> already says only an operator may spend.
>
> **The UI consequence, so no story re-derives it:** at the cap there is no "watch this" affordance
> to press, so the arbiter is never asked to do the impossible thing. The intent that *can* arrive at
> the cap is `HIDE`, which frees a slot; the next arbitration then fills it by priority. **Promotion
> is therefore always a two-step the operator drove, and never a one-step the grid drove.**
>
> **(3) THE GRID'S DISPLAY ORDER IS `(nodeId, repo, sessionId)` — `DESIGN §focus model` rule 7 WINS,
> and this ADR's "the index's own deterministic order" is superseded AS A DISPLAY ORDER.** The two
> documents disagreed in writing: the index sorts `(nodeId, sessionId)`
> ([global-mesh-query.mjs:331-335](../../../src/global-mesh-query.mjs#L331)) and DESIGN wants `repo`
> between them. **DESIGN wins, on m46/ADR-005's own precedent** — *"the state words are what the
> operator reads, DESIGN owns that surface"* — and grid order is read by the operator on every glance:
> scanning a machine's panes by project is the whole reason a fleet grid groups rather than lists.
>
> **What this ADR's clause actually guaranteed survives, and it is the reason a re-sort is safe:** the
> index hands a **total** order, so a browser-side re-sort is a pure, stable function of a
> deterministic input. Re-sorting an arbitrary-order array would not be, and that is the property
> m48/ADR-013 R12 bought one layer down.
>
> Four structural constraints, which ARE mine:
> - **The sort happens in exactly ONE place** — the ordered-array producer in `ui/src/home/` (the PO
>   has placed it in story 05). **Neither the subscription arbiter nor the layout composer sorts**;
>   both consume the handed order. Two sorts is two chances to disagree, and the arbiter's priority
>   ranking would then depend on which one ran.
> - **It is a pure function of STATED fields, with the same plain `<`/`>` codepoint comparison the
>   index uses — never `localeCompare`.** A locale-sensitive collation makes two operators' grids
>   differ, and it is the exact trap `runs.mjs` and `status.rs` already avoid by name so the JS and
>   Rust surfaces agree byte-for-byte.
> - **A row with no stated `repo` sorts LAST within its node**, never first and never under a
>   fabricated `""` — the same *"a fact nobody stated cannot win a comparison"* rule
>   `buildSessionIndex`'s own `stated()` helper applies.
> - **The SERVER's order is NOT changed.** `buildSessionIndex` keeps `(nodeId, sessionId)`: it is a
>   wire contract with a second consumer (the desktop) and a fitness function behind it, and
>   re-sorting it for one surface's reading preference would be the tail wagging the dog.
>
> **(4) A STALE `why` THIS ADR LEANS ON, corrected where it lives.** `HOST_CHANGES.WATCH`'s catalogue
> entry reads *"a fresh subscribe opens ONE new socket onto an empty pane"*
> ([host-model.mjs:282](../../../ui/src/terminal/host-model.mjs#L282)). That predates F-38.06g: the
> mirror **replays a bounded tail on subscribe**
> ([mesh-terminal-mirror.mjs:193-208](../../../src/mesh-terminal-mirror.mjs#L193)), so a re-watch may
> repaint the last screen. **The COST is unchanged and correct — `COST_SUBSCRIPTION`, a socket, the
> operator's to spend — and it must NOT be re-argued from the correction:** "a re-watch repaints, so
> it is cheap" is the wrong conclusion, because the socket is spent against this ADR's cap either way.
> Only the reason is wrong, and it is wrong in the direction that stops the next reader looking —
> which is the same defect class as `geometry.mjs`'s comment naming a test file that never existed.
> The corrected wording is *"a fresh subscribe opens ONE new socket and receives whatever bounded tail
> the relay still holds for that tuple — possibly the last screen, possibly nothing (LRU-evicted past
> `MAX_TAIL_KEYS`, and empty on a rebuilt mirror)"*. It lands in ADR-007's story, which edits that file
> anyway. Recorded here because **this ADR's entire replay-burst argument rests on the fact that
> comment denies.**

> **AMENDMENT (5), 2026-08-13 — SECOND PASS, raised by QA's behavioural review of story 02 (finding
> F-49-02-c) and ruled here. AMENDMENT (1)'s obligation (b) is SUPERSEDED as written; the SIGNATURE
> changes in two places; nothing else in this ADR moves.** Recorded rather than fixed silently,
> because the shipped code satisfies the superseded clause *by construction* — i.e. by asserting it
> as a literal while violating it two statements earlier.
>
> **THE DEFECT, MEASURED** (`ui/src/home/socket-cap.mjs`, 2026-08-13):
>
> ```
> subscribedPaneSet(rows(16), 16, {}, [])                       -> 16 subscribed
> subscribedPaneSet(rows(16),  4, {}, opening.subscribed)
>    subscribed: 4   demoted: []   released: 12, causes: ["hidden"]
> ```
>
> Twelve live, un-hidden incumbents lose their socket. `demoted` — whose stated purpose at
> [socket-cap.mjs:222](../../../ui/src/home/socket-cap.mjs#L222) is *"so the no-auto-demote rule is a
> value a test reads rather than a property it infers: it is empty on every input, **by
> construction**"* — stays empty **while the demotion happens**, in the same returned object. And
> each of the twelve is labelled `cause: "hidden"`, which tells the surface **the operator hid a pane
> they never touched**.
>
> **WHY IT IS NOT "MERELY UNREACHABLE", which is the disposition this ruling declines.** The
> production caller cannot shrink the cap today —
> [acd-home-socket-cap-single-arbiter:241](../../../test/arch/acd-home-socket-cap-single-arbiter.test.mjs#L241)
> requires every call site to pass the declared `MAX_LIVE_PANES` — but three things make that the
> wrong reason to leave it: (i) the **malformed-cap path is the same shape and IS reachable from any
> caller** — `effectiveCap(null) = 0`, so a fail-closed cap releases *all sixteen* incumbents under
> the same fabricated `hidden` label, and that path was ruled deliberately and shipped; (ii) task 01's
> own Examples header states the standard — *"the cap is an argument, **so the degenerate values are
> reachable and must answer**"*; (iii) this ADR itself names the lever that makes the cap variable —
> *"Virtualise: mount only visible panes … recorded as the natural next lever if 16 proves low"* —
> and the day the cap stops being a constant is the day twelve sockets die labelled as the operator's
> doing. **A fabricated attribution is a defect at the moment it is written, not at the moment it is
> read.**
>
> **THE RULING — (a), sharpened. A caller-shrunk cap IS a release of an incumbent, it is ATTRIBUTED
> with its own cause, and the field that claimed otherwise is DELETED rather than corrected.**
>
> **(5a) THE INVARIANT, restated so it is TOTAL.** ~~`result ⊇ currentlySubscribed ∩ liveRows`~~ is
> false whenever the cap is below the retained count, and it cannot be repaired by a precondition
> because the arbiter is required to answer at every cap. Over one call, writing
> `limit = effectiveCap(cap)`, `live` = the keys of the handed rows, `incumbents` = the keys of
> `currentlySubscribed`, `hidden` = the keys of `intents.hidden`, and
>
> > **`retainable = (incumbents ∩ live) \ hidden`** — the incumbents with a claim on their socket
>
> the obligations are:
>
> | # | invariant | holds for |
> |---|---|---|
> | **I1 — BOUND** | `\|result\| ≤ limit` | every input. **Unchanged, and it WINS every collision** — it is the obligation the mirror's 64-tuple tail budget and its replay burst actually buy |
> | **I2 — RETENTION** | `\|result ∩ retainable\| = min(\|retainable\|, limit)` | every input |
> | **I2′ — NO-AUTO-DEMOTE** (I2's corollary, and the checkable form of *"priority allocates free slots; it never evicts"*) | `result \ retainable ≠ ∅ ⟹ retainable ⊆ result` — **no non-incumbent holds a socket while any retainable incumbent does not** | every input |
> | **I3 — WHO SURVIVES A SHRINK** | `limit ≥ 1 ∧ focused ∈ retainable ⟹ focused ∈ result`; survivors are ranked by the SAME priority order that fills free slots | every input |
>
> **I2 is what AMENDMENT (1) was reaching for and could not spell.** Its content, in words, is that
> **the cap is the ONLY thing that can cost an incumbent its socket, and then only down to the cap** —
> a ranking never can. That is strictly stronger than the superseded containment (which said nothing
> at all below the cap) and it is total, so a test drives it at 0, 1, 4 and 40 rather than at 16 alone.
>
> **(5b) THE THIRD RELEASE CAUSE, and the biconditionals that stop it becoming a default.** The
> release-cause enumeration closes at **three**, and each value's precondition is stated as an **`⟺`,
> not an `⟹`** — a one-way implication is satisfiable by a fall-through, which is exactly what
> shipped. `RELEASED_CAP_LOWERED = "cap-lowered"` joins `HELD_HIDDEN` and `RELEASED_LEFT_INDEX` in the
> arbiter's own module. For every `k ∈ incumbents \ result`, `released` carries **exactly one** entry:
>
> | `released.cause` | ⟺ | reads as |
> |---|---|---|
> | `left-the-index` | `k ∉ live` | not a demotion — there is no session left to demote |
> | `hidden` | `k ∈ live ∧ k ∈ hidden` | the operator spent it (`COST_SUBSCRIPTION`) |
> | `cap-lowered` | `k ∈ retainable` (⟹ `\|retainable\| > limit`, by I2) | **the ceiling the CALLER handed in is below the retained count** |
>
> **CONSERVATION, and it is half the invariant:** `keys(released)` is **exactly** `incumbents \ result`
> — no more (a pane that kept its socket is never in it) and no fewer (nothing loses a socket silently).
> `released` carries **no second copy of the cap**: the arbitration already returns `cap` at top level,
> and this ADR's rule is one derivation with N readers.
>
> **`cap-lowered` and `at-cap` are deliberately different strings for two different questions**, and a
> render site may see both about one pane in one answer: `released.cause` says *what changed* (this pane
> stopped watching, and why), `decision.cause` says *what is* (it is not watching now, and why). Naming
> them alike is how a surface comes to report a change as a state.
>
> **(5c) `demoted` IS DELETED FROM THE RETURN SHAPE — not corrected, deleted.** Its defence was that it
> made the rule *"a value a test reads rather than a property it infers"*. It did the opposite:
> **a field whose value is a literal constant is not an observation — it can never be wrong, so it can
> never be right.** It was a claim with a type, sitting beside the code that falsified it, and the two
> could not detect their own disagreement because only one of them was computed. The population it
> named is the population `released` already owns, so the fact goes where the population lives:
> `released.filter(r => r.cause === "cap-lowered")`. **One population, one array, one derivation** —
> two arrays over one population is this log's own duplicated-derivation defect at function scale, and
> it is what produced F-49-02-c. The no-auto-demote rule is now read as **I2′**, which is computed from
> the same inputs as the answer it describes.
>
> **(5d) THE GENERAL RULE THIS ADR ADDS TO ITS OWN RECORDED LESSONS — no fall-through in a cause.**
> Both of QA's story-02 attribution defects are one shape: `a ? x : b ? y : z`, where `z` is *whatever
> is left* rather than a case with a precondition. It fabricated `hidden` for twelve capped-out
> incumbents here, and `at-cap` for a row that carries no address at all
> ([socket-cap.mjs:206](../../../ui/src/home/socket-cap.mjs#L206)). **The arbiter states a cause only
> where it can name the input that produced it; every cause it can return has a biconditional
> precondition assertable from its own arguments; and the last branch of a cause chain is the one that
> cannot absorb an unclassified case.** A cause is a CLAIM ABOUT AN ACTOR — the operator, the mesh, the
> caller — and a wrong one sends an operator after an action nobody took.
>
> **(5e) THE SIGNATURE, since that is what this ADR's own lesson says to write down.** Two changes,
> both in the RESULT; the argument list is untouched.
>
> ```ts
> subscribedPaneSet<Row>(
>   rows: readonly Row[] | null | undefined,
>   cap: unknown,                                  // NOT a number: malformed fails closed to 0
>   intents?: { focused?, watched?, hidden? } | null,
>   currentlySubscribed?: readonly PaneTuple[] | null,
> ): {
>   cap: number;                                   // = effectiveCap(cap); the ONE copy of the number
>   decisions: readonly PaneDecision<Row>[];       // one per handed row, in the handed order
>   subscribed: readonly PaneTuple[];
>   slotFree: boolean;
>   released: readonly {
>     nodeId: string; sessionId: string;
>     cause: "hidden" | "left-the-index" | "cap-lowered";   // ← WAS two values
>   }[];
>   declined: readonly { nodeId, sessionId, cause: "at-cap", recovery: "hide-one-to-watch", cap: number }[];
>   // demoted: readonly never[];                  // ← DELETED (5c)
> }
> ```
>
> **BLAST RADIUS, MEASURED not assumed** (`aof graph impact`, graph rebuilt over the project root at
> this ruling — 9,836 nodes / 23,762 edges, `egress: none`, built `2026-08-13T14:12:15.984Z`):
> `ui/src/home/socket-cap.mjs` ← **(3)** `test/home-socket-cap-arbiter.test.mjs`,
> `test/home-feed-axis.test.mjs`, `ui/src/home/feed-axis.mjs`; → **(0)**. The one production consumer,
> `feed-axis.mjs`, imports `HELD_AT_CAP`/`HELD_HIDDEN`/`paneKeyOf`/`paneTuple` — the **hold** causes,
> which this amendment does not touch. **So the change is confined to `socket-cap.mjs`, its `.d.mts`
> and `test/home-socket-cap-arbiter.test.mjs`**, and no story-03/04/05 surface is pre-empted.

- **`MAX_LIVE_PANES = 16`**, a named constant in ONE module under `ui/src/home/`. The argument, in
  full, so it can be re-opened on evidence rather than on taste:
  - **≤ 64/4.** Four full grid rotations before this grid's own churn can evict a tail it still
    cares about. At 32 that headroom halves; at 64 the grid is one rotation from silently losing a
    pane's opening screen.
  - **Worst-case open burst 16 × 256 KiB = 4 MiB, once.** Typical is far smaller — a `claude` TUI's
    last full-screen repaint at 80×24 is single-digit KiB — but the worst case is what a cap is for.
  - **Readable.** 16 panes at a legible 80-column tile is a 4×4 on a large display. Beyond that the
    operator is scanning chips, not reading terminals, and the state chip is what SPEC already says
    makes a fleet scannable at a glance.
  - **1/16th of the measured platform ceiling**, recorded ONLY to state that the platform is not the
    wall.
- ~~**THE SEAM IS ONE PURE FUNCTION, SET-VALUED, IN THE `.mjs` SET.** It takes the ordered row set,
  the cap and the operator's focus/watch intents as ARGUMENTS and returns the subscribed set.~~
  **SUPERSEDED by AMENDMENT (1): the argument list is FOUR, and the fourth is the currently-subscribed
  set.** What survives unchanged is the SHAPE and the reason for it: one pure, set-valued function in
  the `.mjs` set — not a per-pane "am I allowed" check, because N independent decisions can disagree,
  and because a set-valued arbiter is drivable headlessly at every cap value including 0 and 1.
- **THE ORDER IS DETERMINISTIC AND IS NOT ARRIVAL ORDER.** Focused/expanded pane first, then the
  operator's explicit watches, then the index's own deterministic `(nodeId, sessionId)` ascending
  order — which m48 guarantees precisely so *"a polling fleet never sees rows reshuffle"*. Mounting
  order is the nondeterminism m48/ADR-013 R12 removed one layer down; re-introducing it here would
  make which panes stream depend on which React child committed first. **Per AMENDMENT (1) this order
  ranks CANDIDATES for free slots only; it is never applied to the retained set.**
- **A PANE BEYOND THE CAP IS RENDERED, IDENTIFIED, AND UNSUBSCRIBED — NEVER HIDDEN AND NEVER
  REFUSED.** It keeps its row, its identity line, its work item and its agent-state chip (all of
  which come from the poll, not the socket); it has no terminal and says why, through m46's existing
  Watch/Hide affordance and its declared `COST_SUBSCRIPTION`.
- ~~**WATCHING ONE OVER THE CAP EVICTS THE LOWEST-PRIORITY SUBSCRIBED PANE.** The operator is never
  told "no"; something else stops watching and says so. A cap that refuses an operator's explicit
  request is a cap they will route around by opening a second tab, which defeats it entirely.~~
  **SUPERSEDED by AMENDMENT (2), PO ruling 2026-08-13: there is NO auto-demotion, and at the cap the
  worded toggle is ABSENT (DESIGN §DG-49-4), so the request cannot be made from the UI at all.** The
  concern this bullet raised is answered by DESIGN rather than by eviction: the tile is calm, it names
  the exact recovery (`hide one to watch this`), and the exchange stays the operator's.
- **THE CAP IS TIED TO `MAX_TAIL_KEYS` ACROSS THE BUILD BOUNDARY BY A FITNESS FUNCTION.** The UI
  build and the node build cannot import across, so the tie is a gate that reads BOTH files — the
  identical technique `acd-terminal-mirror-geometry-pinned` uses for 80×24, invented for exactly this
  class of cross-build pair. If someone lowers `MAX_TAIL_KEYS`, CI says which client constant that
  invalidates.

**Alternatives rejected.**
- **Justify the number by a browser ceiling.** Rejected by measurement, and named because it is what
  the first pass of RESEARCH did and it produced a completely different product (a 6-pane grid).
- **No cap; let the browser find its own limit.** Rejected: the limit it would find is 255, two
  orders of magnitude past readable, through a server with no backpressure, past a 64-tuple tail
  budget — i.e. the grid would degrade by silently losing scrollback rather than by refusing.
- **Cap on the SERVER, at the upgrade.** Genuinely attractive (it is where the resource is) and
  rejected: it would make the fleet face refuse an upgrade, which is a new admission decision on the
  one route m38/ADR-012 keeps carve-out-free, and the browser would learn about it as a closed socket
  — indistinguishable from a failure. The client knows *why* it is not subscribing; the server does
  not.
- **A URL knob (`?panes=32`) or an operator setting.** Rejected: a deep link could push a machine past
  the tail budget, and SPEC scopes no settings surface. "Configured" is satisfied by the number being
  explicit, named, in one place and passed IN as an argument — which is what makes it drivable.
- **Virtualise: mount only visible panes.** Rejected for m49 as a solution to the wrong problem —
  scroll position is not liveness, and a pane that unsubscribes because it scrolled off has silently
  taken the operator's stream away. Recorded as the natural next lever if 16 proves low.

**Alternatives rejected for AMENDMENT (5) specifically**, since QA offered them by name:
- **(b) FORBID IT — the arbiter fails closed on a cap below the retained count.** Rejected on three
  measured grounds, and the first alone is decisive. **(i) There is no fail-closed answer that is not
  worse.** Throwing breaks the totality task 01 pins in terms (*"the arbiter is total … no call
  throws"*) and a throw inside a poll blanks a grid of sixteen; returning the empty set releases
  *sixteen* incumbents instead of twelve; returning more than `limit` breaks I1, which is the
  obligation the mirror's tail budget actually buys. **(ii) It is not self-consistent with a ruling
  already shipped:** `effectiveCap` fails closed to **0** on a malformed cap, deliberately and on QA's
  own call, so "a cap below the retained count" is a state this function is *already required to
  answer in*. Forbidding it here would mean reopening the malformed-cap ruling, which is settled and
  right. **(iii) It buys a discontinuity for nothing:** cap 4 would answer 4 with no incumbents and
  refuse with twelve, which is a pure function that is total in one half of its domain — the property
  that makes the arbiter drivable at all.
- **Keep `demoted`, and populate it correctly.** Rejected, and this is the part of the ruling that is
  not merely bookkeeping. `released` and `demoted` are **two arrays over one population**
  (`incumbents \ result`), distinguished only by a cause that one of them already carries. That is a
  fact with two homes, at function scale — and it is not a hypothetical harm, it is the exact
  mechanism of F-49-02-c: one home was computed from the inputs and the other was a literal, so the
  answer contradicted itself and neither half could tell. Correcting `demoted` would leave both homes
  standing and require every future cause to be written twice, in agreement, forever.
- **Report the shrink only in the per-row `decisions` (`cause: "at-cap"`) and drop it from
  `released`.** Rejected: `decisions` answers *what is*, and a surface that must know **a socket just
  closed** — to say so, or to stop expecting bytes — would have to diff two arbitrations to find out.
  Diffing the answer is the caller-side state the fourth argument exists to abolish.

**Consequences.**
- `src/mesh-terminal-mirror.mjs` is **not edited** — the cap is entirely client-side, so its 10
  dependents are untouched.
- The first grid open is the performance case that matters; a `@manual` lane against a real
  multi-session fleet is worth more here than any headless assertion, and the headless assertion
  (the arbiter is total, deterministic, never exceeds the cap, **and never drops a live incumbent**)
  is still cheap and still required.
- **AMENDMENT (1) makes the arbiter stateful in its INPUTS and still pure in its BODY.** The caller
  holds the previous answer and passes it back in — the same shape `applyHostChange(state, change)`
  already uses ([host-model.mjs:294](../../../ui/src/terminal/host-model.mjs#L294)) and for the same
  reason: a decision that depends on what came before is testable only if what came before is an
  argument. No module-scope `Set`, no `useRef` holding the truth in the `.tsx`.

---

## ADR-007: The grid pane is a FOURTH HOST with its own affordance table, mounted `interactive` as ONE literal at ONE call site — and the posture is DERIVED FROM THE FEED AXIS, failing closed to a LABELLED read-only, which is what makes SPEC's read-only fallback reachable instead of decorative

**Status:** Accepted
**Date:** 2026-08-13
**Corrected:** 2026-08-13 — the fourth host's constant was drafted ~~`HOST_HOME_PANE`~~ against
DESIGN §S2's value `grid-pane`, which would have been the only name↔value mismatch among four hosts.
**It is `HOST_GRID_PANE = "grid-pane"`**; see the first Decision bullet. The DIRECTORY stays
`ui/src/home/` (ADR-001) — folder and host are different things and neither should be renamed to
match the other.
**This line is the ONLY place in this log that spells the dead name, and it is struck** (developer's
feasibility pass, 2026-08-13): three mentions survived the first amendment as trail, and a builder
grepping this file for the host constant got three hits for the wrong name and one for the right one.
The house rule is supersede-don't-rewrite, so the trail stays — but it stays in exactly one place, at
the `Corrected:` line where a superseded fact belongs, and struck so a grep hit is unmistakable.
**The name to type is `HOST_GRID_PANE`.** The cost of getting it wrong is stated in the Decision
bullet and it is why this is worth a paragraph: an unrecognised host **fails closed to no affordances
at all**, which reads as a rendering bug rather than a typo, and no gate would name it.
**Amended:** 2026-08-13 — **"the control does not change" is NARROWED, not kept**, and three
mechanisms QA found missing are ruled: where the held tile's box comes from, how a HOST asks the
control to present, and what `opener` actually names. See the AMENDMENT note at the top of §Decision.
**Corrected (2):** 2026-08-13, at 49/03's structural review — **AMENDMENT (B)'s wording sends the
next reader to overwrite `form`, and it must not.** (B) says the grid pane declares
`AFFORDANCE_FULLSCREEN` *"with a **pane-activation** form"*; read literally that means
`form: FORM_PANE_ACTIVATION`, which **deletes the icon control the same amendment says stays** — and
no gate would catch it, because `affordanceFormViolations`' three clauses police the declared-vs-
dispatched COST pairing and never the form's identity. **The shipped and PO-ratified spelling is
`form: FORM_ICON_CONTROL` with the second door BESIDE it as `activation: FORM_PANE_ACTIVATION`**
([host-model.mjs](../../../ui/src/terminal/host-model.mjs)'s `GRID_PANE_AFFORDANCES`), which is what
task 00's locked Examples fix and what (B)'s own *"in addition to the icon control … the icon control
stays"* requires. **Wherever (B) says "form", read: a new VALUE in the closed form vocabulary,
carried on the entry's `activation` field.** The closure of that vocabulary is at present asserted by
PROSE ONLY — `AFFORDANCE_FORMS` ships exported and is referenced by nothing in the tree — which is
the obligation §Fitness functions carries below. *(DISCHARGED 2026-08-13 in 49/05's tree: the two
`AFFORDANCE_FORMS.includes` clauses now live inside the SHIPPED `affordanceFormViolations`, policing
both `form` and `activation`.)*
**Amended (2):** 2026-08-13, at 49/05's structural review — **two clauses of this ADR are
SUPERSEDED and both supersedes carry obligations rather than standing alone.** (i) *"`TerminalControl
.tsx` gains NO PROP"* — it gains `standing`, a fifth prop, and the ratification is CONDITIONAL on
`subscribed` having ONE authority inside the control (today it has two, and the worded toggle is
therefore inert on every tile the arbiter never sees). (ii) *"`no-producer` and `roster-gone` →
`POSTURE_READ_ONLY`"* — superseded for **`roster-gone` only**, because flipping the posture re-keys
the session and closes the socket task 02 requires to stay open; the compensating obligation is that
a RETAINED tile does not PRESENT, since the fullscreen door is this surface's only typing path
(DG-49-5). Read the seventh batch in the preamble before building either.

**Context.** m46 left this as one word to change. `fleetTerminalMount` says so in terms:
*"THE POSTURE IS `read-only` AND THERE IS NO PATH TO ANYTHING ELSE IN THIS MILESTONE … Milestone 49
changes THIS ONE WORD, at THIS ONE CALL SITE, and the control does not change at all"*
([terminal-mount.mjs:152-157](../../../ui/src/fleet/terminal-mount.mjs#L152)). And m46 named the
thing this milestone would otherwise discover: `SET_POSTURE`'s catalogue entry reads *"stdin is fixed
at xterm construction — UNREACHABLE in m46, named so m49 does not discover it"*
([host-model.mjs:287](../../../ui/src/terminal/host-model.mjs#L287)).

**SPEC's read-only fallback is the interesting part, because taken naively it is vacuous.**
`inputPolicyFor` gives `inputEnabled = source.canInput && !readOnly`
([input-policy.mjs:84-95](../../../ui/src/terminal/input-policy.mjs#L84)), and `mirror.canInput` is
`true` ([source-table.mjs:83](../../../ui/src/terminal/source-table.mjs#L83)). Under the frozen table
an interactive mount is ALWAYS typeable — so "a session that cannot accept input" would never occur
and the fallback would be a branch no test could reach.

**Measured, it occurs constantly, and the reason is ADR-003's feed axis.** Trace a keystroke into a
`no-producer` pane: browser → `/ws/terminal-view` message → `buildTerminalInputEnvelope(nodeId,
sessionId, bytes)` → `terminalInputPush` → `createTerminalInputRouter` →
`dispatchDirective({ to: nodeId })`, which resolves against `directiveTargets` — populated
**exclusively** by admitted *worker* stream connections
([control-stream-server.mjs:1177](../../../src/control-stream-server.mjs#L1177), inside
`wss.on("connection")` at [:1170](../../../src/control-stream-server.mjs#L1170), with the
exclusivity stated at [:944](../../../src/control-stream-server.mjs#L944)). *(Spike 44 cites `:957`
for this; the line has drifted since 2026-08-06 — the fact is unchanged and the pointer is not.)*
Two outcomes, both silent: on a worker node the directive arrives and the handler's `liveSessionInputs.get(sessionId)`
returns `undefined` and **drops**
([acd-fleet-terminal-input-constrained.test.mjs:240-241](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L240)
pins that this is a drop and never a redirect); on the control node's own sessions,
`{ sent: false, code: "assignment-target-not-connected" }` — spike 44's measured silent drop.

**So a keystroke into a free session is swallowed at one of two hops, with no error anywhere.** That
is precisely the failure the posture exists to prevent — *"an operator believing a keystroke reached
a worker"* ([input-policy.mjs:28-30](../../../ui/src/terminal/input-policy.mjs#L28)) — and it is
exactly SPEC's read-only fallback, made reachable.

**Decision.**

> **AMENDMENT, 2026-08-13 — raised by QA's story-05 lane. Three mechanisms this ADR left implicit,
> ruled; and this ADR's "THE CONTROL DOES NOT CHANGE" clause NARROWED to what it was actually
> defending.**
>
> **THE NARROWING FIRST, because the other three depend on it.** That clause meant: *no new prop, no
> new branch, no new concept, no `SET_POSTURE` door* — i.e. the control does not learn about the grid.
> It did **not** mean *not one line of that file moves*, and read literally it makes two of DG-49's
> rules unbuildable. **The amended clause: `TerminalControl.tsx` gains NO PROP and NO NEW CONCEPT; it
> LOSES one condition and REPLACES one hard-coded reference.** Both changes delete a decision the
> `.tsx` was making that belongs in the `.mjs` set — so the file comes out net-negative and the
> `.tsx`-is-a-thin-consumer invariant comes out stronger, not weaker.
>
> **(A) THE HELD TILE'S BOX — the byte area's PRESENCE becomes a HOST DECLARATION, not a subscription
> test.** Measured: `TerminalControl.tsx:789` renders the byte area under `{subscribed ? … : null}`,
> so an unsubscribed pane has nothing below the header, while DG-49-4 requires the box plus one
> centred line naming the limit. **An unconditional byte area is the WRONG fix and would be a
> regression:** the fleet card's rest state is deliberately header-only (*"no state chip, no socket,
> no bytes"*), and making the box unconditional would give it one it does not want.
>
> The guard conflates two different facts: *is a socket open* (subscription) and *does this host show
> a box when nothing is bound* (host layout). **Split them. The second is a HOST fact and belongs in
> `host-model.mjs` beside the affordance table** — the module whose whole premise is *"three hosts of
> one control, and the ONLY things that differ between them are their declarations"*. Each host
> declares its unsubscribed rest pane, valued from the ramp's **existing** closed `PANE_*` set plus an
> explicit "no pane": the fleet card declares no pane (m46's shipped behaviour, preserved
> byte-for-byte), the dock and the **grid pane** declare `PANE_EMPTY_HOST` — a uniform grid must not
> have holes, which is DG-49-4's own stated reason. The control reads the declaration in place of
> testing `subscribed`: **one condition replaced by one table lookup.**
>
> This is the same correction `TerminalByteArea`'s own header already argues for one layer down —
> *"EVERY PANE DECISION IS A DESCRIPTOR FIELD, not a boolean re-derived from a state word here"* — and
> the guard at `:789` is that rule broken one level up. **The module boundary, so nothing is authored
> twice:** the LINE is the home's (injected through the `reason` seam, ADR-003's amendment); the
> TREATMENT is the ramp's (`PANE_EMPTY_HOST`, already); the BOX is `TerminalByteArea`'s (already); the
> PRESENCE is the host table's (new, as data). **Nothing new is authored in the `.tsx` at all.**
>
> **(B) THE PRESENTATION SEAM — a HOST does not ask; the trigger is an additional FORM of an
> affordance the host already declares.** Measured: the control's props are exactly
> `{ host, mount, onClose, origins }` ([:172-181](../../../ui/src/terminal/TerminalControl.tsx#L172))
> and fullscreen is dispatched by the control's own expand button
> ([TerminalControls.tsx:71-77](../../../ui/src/terminal/TerminalControls.tsx#L71)), while DG-49-5
> rule 3 requires `Enter` on a focused tile and a click into the byte area to present.
>
> **A host CANNOT be given the ability to present, and that is not a style objection.** The request
> carries the **live DOM node** and its `home` ([:625-640](../../../ui/src/terminal/TerminalControl.tsx#L625));
> the shell adopts that exact node and returns it (m46/ADR-009). A host holding the node is the one
> thing the adoption design forbids. So the trigger stays inside the control — and both of DG-49-5's
> triggers already are inside it: the byte area is the control's own child, and the tile is the
> control's own `<section>`.
>
> **The mechanism: one new value in the EXISTING closed form vocabulary.** `host-model.mjs` already
> gives every declared affordance a `form` (`FORM_CHEVRON`, `FORM_ICON_CONTROL`, `FORM_WORDED_TOGGLE`,
> `FORM_SEPARATOR`, `FORM_SEGMENTED`). The grid pane declares `AFFORDANCE_FULLSCREEN` with a
> **pane-activation** form meaning *"this host's own pane region activates this affordance (click,
> `Enter`/`Space`), in addition to the icon control"*. The control reads the form and wires the
> region; `changeForAffordance` already maps it to `PRESENT_FULLSCREEN` at `COST_LAYOUT`, and
> `affordanceFormViolations`' third clause — declared cost must equal dispatched cost — **polices the
> new form on arrival, by a detector that already exists.** No prop, no callback, no new mechanism.
>
> **AND IT IS PER-HOST FOR A MEASURED REASON, not for symmetry:** on the BOARD DOCK a click into the
> byte area must *focus xterm to type*, and turning that click into a present would take typing away
> from the surface m42 deliberately made typeable. On the grid pane there is nothing to type into
> inline — DG-49-5's whole ruling is *taking the keyboard IS the expand*. One control, two behaviours,
> decided by a declaration: which is this module's entire premise.
>
> **The accessibility obligations ride with the form and are not optional:** the tile is a focusable
> element with a role and an accessible name (the pane's own identity label), `Enter` **and** `Space`
> activate it, and **the icon control stays** — it is the discoverable affordance, and m46's rule that
> a visible control implies this surface can act is not relaxed by adding a second way in.
>
> **(C) `opener` KEEPS ITS NAME; THE CONTROL STOPS LYING ABOUT IT.** Measured: the request is built
> with `opener: openerRef.current` ([:633](../../../ui/src/terminal/TerminalControl.tsx#L633)), which
> is the expand BUTTON ([TerminalControls.tsx:73](../../../ui/src/terminal/TerminalControls.tsx#L73)),
> while DESIGN §S3 delta 3 requires focus to return to the TILE.
>
> **`opener` is exactly the right word and the field is not the bug** — the bug is that the control
> hard-codes the button regardless of what actually opened it. Today provenance and job coincide
> because the button is the only door; once (B) makes the tile a door they diverge, and returning
> focus to a button the operator never touched is worse than returning it nowhere. **The rule: the
> return target is the element carrying the presenting affordance's FORM** — the button for
> `FORM_ICON_CONTROL` (byte-identical for the dock and the fleet card), the TILE for the
> pane-activation form. One derivation replaces one hard-coded ref; no rename, because the shell reads
> this field and a shipped spelling survives unless it lies.
>
> **AND THE REQUEST GAINS EXACTLY ONE FIELD: where focus lands ON PRESENT** (DESIGN §S3 delta 2), which
> `terminalFullscreenRequest` carries no equivalent of today
> ([fullscreen-request.mjs:68-82](../../../ui/src/terminal/fullscreen-request.mjs#L68)). It is a
> REQUEST field rather than a shell default because **only the request knows whether the occupant
> claims the keyboard** — `claimsEscape` is already computed right there from `model.inputEnabled`, and
> the answer follows it: an interactive occupant wants focus in the pane it is about to type into; a
> read-only one wants focus on the mandatory exit control, which is then its only way out. Deriving it
> beside `claimsEscape`, from the same one fact, is what stops the two from ever disagreeing.

- **A FOURTH HOST: `export const HOST_GRID_PANE = "grid-pane";`** — the constant NAME and its VALUE
  are the same pairing, because both m46 hosts already are
  (`HOST_BOARD_DOCK = "board-dock"`, `HOST_FLEET_CARD = "fleet-card"`,
  [host-model.mjs:38-40](../../../ui/src/terminal/host-model.mjs#L38)) and because DESIGN §S2 fixes
  the operator-facing name as `grid-pane`. **This corrects a draft name in this ADR's first writing**
  (2026-08-13, raised by the PO; the dead spelling is struck at the `Corrected:` line above and
  nowhere else): the DIRECTORY is `ui/src/home/` and the HOST is
  `grid-pane`, and those are two different things — the folder is where the code lives, the host is
  what the control is told. **Nothing should "fix" the directory to match.** The pairing is worth
  spelling out rather than leaving to a builder because `hostAffordances(host)` **fails closed for an
  unrecognised host** ([:144-152](../../../ui/src/terminal/host-model.mjs#L144)): a one-character
  mismatch between the constant and the string a call site passes produces a pane with **no controls
  at all**, which reads as a rendering bug rather than as a typo, and is one of the few defects in
  this control that no gate would name. It is added to `TERMINAL_HOSTS`
  ([host-model.mjs:38-41](../../../ui/src/terminal/host-model.mjs#L38)) with its own affordance
  table. Its eight declarations happen to COINCIDE with the fleet card's today (collapse ✗, close ✗,
  drag-resize ✗, watch/hide ✓, fullscreen ✓, exit-fullscreen ✗, restart ✗, provider-picker ✗) — and
  it is still a fourth host, for a reason that is not the table's contents: because the lookup fails
  closed, the only alternative is passing `HOST_FLEET_CARD` from a surface that is not the fleet. That
  is a lie the model would then report onward to `TerminalIdentity`/`TerminalControls`, and the
  *reasons* differ in substance even where the verdicts agree — the fleet card refuses drag-resize
  because *"the panel's total height is a constant 192px"*
  ([:114](../../../ui/src/terminal/host-model.mjs#L114)), which is false about a grid tile. **The
  coincidence is PINNED by a fitness function**, so a future divergence is deliberate rather than
  accidental.
- **THE POSTURE IS INTERACTIVE, AND IT IS A LITERAL AT ONE CALL SITE** —
  `ui/src/home/session-mount.mjs`, mirroring `fleetTerminalMount`'s discipline exactly: not a prop,
  not a parameter, not a value the `.tsx` composes.
- **AND IT IS NARROWED BY THE FEED AXIS, IN THAT SAME MODULE AND NOWHERE ELSE:**
  `producer-known` → `POSTURE_INTERACTIVE`; `no-producer` and `roster-gone` → `POSTURE_READ_ONLY`,
  **labelled**, carrying the cause. So SPEC's read-only fallback is a function of a wire fact rather
  than of a guess, and it is reachable by a large and ordinary class of rows.
- **IT FAILS CLOSED, AND THAT IS GATED THE SAME WAY THE FLEET'S IS.** Anything other than a
  positively-established `producer-known` is read-only. This is deliberately the mirror image of
  invariant 4 part 1's own shape — *"no value the row carries turns the posture"*
  ([acd-fleet-terminal-input-constrained.test.mjs:595-603](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L595)) —
  run in the other direction, and it is driven with the same adversarial rows so a plant that reads
  the posture off a row cannot pass (ADR-008).
- **READ-ONLY MEANS READ-ONLY IN FACT AND IT TRAVELS AS A LABEL.** `disableStdin: true`, NO keystroke
  sink registered at all, no send path named, the `read-only` label mandatory and the cursor
  non-blinking — all of it already computed by `mountModelFor`
  ([input-policy.mjs:114-141](../../../ui/src/terminal/input-policy.mjs#L114)). The home consumes it;
  it does not re-derive it. **A half-disabled widget that swallows keystrokes silently is a worse lie
  than no terminal**, and it is the specific lie the two silent-drop hops above would otherwise
  produce.
- **THE CONTROL DOES NOT CHANGE.** *(NARROWED by the AMENDMENT above: no new PROP and no new CONCEPT
  — but it loses the `{subscribed ? … : null}` byte-area guard to a host declaration, and replaces the
  hard-coded `openerRef` with the presenting form's own element. Both are decisions moving OUT of the
  `.tsx`, so the file is net-negative and this clause's actual intent is served better than a literal
  reading would have served it.)* No new prop, no new branch, no `SET_POSTURE` dispatch. `posture`
  is part of the session's identity ([host-model.mjs:233](../../../ui/src/terminal/host-model.mjs#L233)),
  so a row whose feed axis changes mid-view produces a NEW identity string and the `.tsx`'s existing
  effect re-binds — which is correct and is the mechanism m46 built. `SET_POSTURE` stays unreachable
  from any host; it is not this milestone's door.
- **FULLSCREEN IS m46/ADR-009's, UNCHANGED**: `requestFullscreen` through the shell bus, handing the
  LIVE node and its `home`, with `claimsEscape: true` when input is enabled and a visible exit
  control that is then the only exit.

**Alternatives rejected.**
- **Reuse `HOST_FLEET_CARD` for the grid pane.** Rejected above — it is the only alternative to a
  fourth host and it makes the model misname the surface. Named because the identical tables make it
  the tempting move.
- **Make the posture a prop the grid passes per pane.** Rejected: it is the exact spelling invariant
  4 part 1's `POSTURE_KEY_WRITE` clause was written to catch
  ([:310-328](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L310)), one directory
  over, and *"a value that decides a permission may have exactly one author"*.
- **Mount every pane interactive and let the drop be silent.** Rejected: it is the failure the
  posture exists to prevent, and it is invisible — the operator types an answer into a blocked agent
  and watches nothing happen.
- **Give `mirror` a per-row `canInput`.** Rejected twice over: `canInput` is a CAPABILITY of the
  SOURCE and is never a permission ([source-table.mjs:25-28](../../../ui/src/terminal/source-table.mjs#L25)),
  and the frozen table's rows are whole and shared — a per-row override is descriptor assembly, which
  `acd-terminal-control-boundary` fails CI on.
- **Ask the server whether this tuple is typeable.** Rejected: it is a handshake the frozen envelope
  does not have (m03/ADR-003), and the answer is already on the wire.

**Consequences.**
- `ui/src/terminal/host-model.mjs` (← 9) gains one host and one table, ~20 lines on a 422-line
  unbudgeted file — 358 lines under the declare-your-intent threshold, so no budget entry is
  triggered.
- `test/terminal-collapse-is-not-hide.test.mjs` and `test/terminal-one-implementation.test.mjs`
  enumerate hosts and move in the same diff.
- The fleet card peek is untouched and stays read-only. Two surfaces now mount `mirror` interactively
  and one mounts it read-only, which is exactly the state m46/ADR-002 built posture to express.

---

## ADR-008: Invariant 4 is amended in exactly ONE of its three parts — PART 1 generalises from "the fleet directory" to a SURFACE→POSTURE-HOME TABLE covering all three surfaces; part 2 is untouched; part 3 is untouched and GAINS a directory. Every existing assertion survives verbatim and three are added, so the replacement is strictly stronger

**Status:** Accepted
**Date:** 2026-08-13
**Amended:** 2026-08-13 — **two under-specified points RULED, nothing superseded** (the per-surface
JSX floor, and the deliberate asymmetry between part 1's two clauses). See the AMENDMENT note at the
top of §Decision **before generalising either clause** — generalising the wrong one makes this
amendment unsatisfiable, and generalising the floor the wrong way makes it vacuous.

**Context.** SPEC and STATE both insist: rewrite it, never delete it, never let it fail silently, and
give it its own story boundary. m46/ADR-006 already had to do this once and diagnosed the failure
mode precisely: *"the sweep will still be green, because the code moved out of the swept directory.
The gate would then assert nothing about the property it names, while reading green. That is worse
than deleting it."*

**Read at source, the three parts today are:**

- **Part 1 — THE CALL SITE**
  ([:544-628](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L544)): a sweep of
  `ui/src/fleet/**` for `INTERACTIVE_DECLARATION` ([:308](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L308));
  a `posture:` key-write clause whose only permitted author is `ui/src/fleet/terminal-mount.mjs`
  ([:327-328](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L327),
  [:559-561](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L559)); a JSX clause
  requiring `Fleet.tsx`'s `mount=` prop to be a BARE `fleetTerminalMount(` call with no spread
  ([:571-581](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L571)); a positive
  clause that the mount module names `POSTURE_READ_ONLY`
  ([:586-587](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L586)); a behavioural
  clause driving the REAL mount with adversarial rows
  ([:595-618](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L595)); and the
  CONTRAST against the board's interactive mirror mount
  ([:623-626](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L623)).
- **Part 2 — THE POLICY** ([:634-679](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L634)):
  `inputEnabled = source.canInput && !mount.readOnly` driven over the WHOLE frozen table × both
  postures × seven malformed declarations, all failing closed.
- **Part 3 — THE SURVIVING SWEEP** ([:687-755](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L687)):
  `ui/src/fleet/**` wires no `onData`/`onKey`/`onBinary` and sends on no socket; plus the fleet
  mounts the ONE control; plus the source table declares both routes; plus the control's interactive
  lane is real; plus the identity line names the far end; plus the control spells neither
  `disableStdin` nor `cursorBlink` as a literal.

**The measurement that decides the amendment, and it is counter-intuitive.** Because ADR-001 puts the
home in `ui/src/home/` rather than in `ui/src/fleet/`, **all three parts remain literally TRUE and
non-vacuous after m49 with no edit at all.** The fleet page's card peek stays read-only; the fleet
directory still wires no input; the policy is a pure function over an unchanged table.

**That is exactly the trap m46/ADR-006 named, one milestone later.** What breaks is not the
detectors — it is the invariant's own subject sentence. Today it reads *"THE FLEET PAGE STAYS A
MONITOR — the interactive surface is the one control mounted by the BOARD DOCK"*
([:26-28](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L26)). After m49 that
sentence is **false about the product**, and the property it was really protecting — *the posture
that decides whether an operator can type into another machine has exactly ONE author, and it is not
a render site* — is protected in exactly one of three surfaces, with the two interactive ones
unconstrained.

**Decision.**

> **AMENDMENT, 2026-08-13 — two points this ADR left to the builder, ruled here because QA's contract
> pass had to hedge on both.** Nothing below is superseded; both clauses were under-specified, and
> one of them was under-specified in the exact place this gate has already failed once.
>
> **(A) THE PER-SURFACE FLOOR IS RATIFIED — a whole-clause floor generalised across three surfaces is
> VACUOUS, and vacuous is this clause's own recorded failure.** Part 1's JSX clause today reads
> `assert.ok(mountProps.length >= 1, …)`
> ([:573](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L573)) over matches from
> ONE file. Generalised to three surfaces by concatenating their matches, **one Fleet match satisfies
> the floor and the new INTERACTIVE home mount site is then checked by nothing, while CI reads
> green** — the precise defect m46/ADR-006 wrote this gate's amendment to prevent, reappearing at the
> same clause one milestone later. **Ruling: QA's per-surface floors plus discovery-by-sweep are
> ADOPTED as written.** Concretely: every surface in the posture-home table carries **its own** floor
> of at least one bare-call mount prop, asserted per surface and named in the refusal so a red line
> says WHICH surface lost its mount; and the mount SITES are found by sweeping each surface directory
> rather than by naming `Fleet.tsx`, so a home that later splits its grid into two components is
> covered without a list edit. A hard-coded path is a list to maintain; a sweep with a per-surface
> floor is the same strength with none — the identical trade `acd-terminal-server-only` made when it
> stopped hard-coding `TerminalDock.tsx` and discovered its construction site instead.
>
> **(B) THE TWO PART-1 CLAUSES ARE DELIBERATELY ASYMMETRIC, and generalising the first makes this
> amendment UNSATISFIABLE.** Stated in one place because it is stated nowhere:
>
> | clause | scope | why |
> |---|---|---|
> | `INTERACTIVE_DECLARATION` — *names no interactive posture at all* ([:308](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L308)) | **`ui/src/fleet/**` ONLY** | It is the READ-ONLY surface's clause and it means "this surface has nothing to flip". Generalising it fails **immediately**: `ui/src/board/dock-mount.mjs` names `POSTURE_INTERACTIVE` today ([:27](../../../ui/src/board/dock-mount.mjs#L27), [:48](../../../ui/src/board/dock-mount.mjs#L48), [:99](../../../ui/src/board/dock-mount.mjs#L99)) and `ui/src/home/session-mount.mjs` must too. A clause that forbids the interactive surfaces from naming the interactive posture forbids the milestone. |
> | **AUTHORSHIP** — `posture:` has ONE author per surface ([:327-328](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L327), [:559-561](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L559)) | **all THREE surface directories** | It is posture-value-blind: it constrains WHO writes the key, not WHICH value. That is exactly why it generalises where the other cannot, and why m46 wrote it — *"the rule is about WHO MAY WRITE THE FIELD, not about which word they write"* ([:323-326](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L323)). |
>
> **AND THE AUTHORSHIP CLAUSE MUST NOT REACH `ui/src/terminal/**`.** *(Undercounted in this
> amendment's first writing and corrected 2026-08-13 at the developer's feasibility pass — the case is
> stronger than I stated, not weaker.)* The core writes a `posture:` key at **seven sites across
> THREE modules**, not the two in one file I named:
> - **`input-policy.mjs`** — three ([:48](../../../ui/src/terminal/input-policy.mjs#L48),
>   [:91](../../../ui/src/terminal/input-policy.mjs#L91),
>   [:119](../../../ui/src/terminal/input-policy.mjs#L119)). This is the module that **DEFINES the
>   posture vocabulary and computes the policy** — `mountPosture`, `inputPolicyFor`, `mountModelFor`.
>   It is the last module in the tree that should be forbidden from naming the field.
> - **`host-model.mjs`** — two ([:215](../../../ui/src/terminal/host-model.mjs#L215),
>   [:328](../../../ui/src/terminal/host-model.mjs#L328)): the control-state constructor, and
>   `SET_POSTURE`'s transform — the change m46 deliberately left unreachable and named so this
>   milestone would not discover it.
> - **`TerminalControl.tsx`** — two ([:284](../../../ui/src/terminal/TerminalControl.tsx#L284),
>   [:628](../../../ui/src/terminal/TerminalControl.tsx#L628)), both `posture: mount.posture`, i.e.
>   **read-throughs of a value the mount already decided**.
>
> Every one of the seven either DEFINES the vocabulary, transforms state within it, or passes a
> decided value through; **none of them AUTHORS a permission.** A sweep that reached the core would
> fail CI on three modules that are provably not authors, and the obvious "fix" would be three
> exemption entries — i.e. a permission list, which is what these ratchets exist instead of. **The
> rule is scoped to SURFACE directories because a surface is where a posture can be INVENTED; the core
> is where it is defined, transformed, and passed on.**


- **PART 1 IS THE ONE THAT CHANGES, and it changes by GENERALISING, not by relaxing.** Its two
  authorship clauses are re-expressed against a **surface → posture-home table**:

  | surface directory | the ONE module that may write `posture:` | what it declares |
  |---|---|---|
  | `ui/src/fleet/**` | `ui/src/fleet/terminal-mount.mjs` | `POSTURE_READ_ONLY` — **and may name no interactive posture at all**, the existing `INTERACTIVE_DECLARATION` sweep, unchanged in strength and still scoped here |
  | `ui/src/board/**` | `ui/src/board/dock-mount.mjs` | `POSTURE_INTERACTIVE` |
  | `ui/src/home/**` | `ui/src/home/session-mount.mjs` | `POSTURE_INTERACTIVE`, narrowed by the feed axis (ADR-007) |

  and the bare-call JSX clause applies at **every** `<TerminalControl … mount={…}>` site in all three
  surfaces — `Fleet.tsx`, `Board.tsx` and the home's component — each required to hand its own
  module's return value unwrapped, with no spread. **Today one directory is constrained and one JSX
  prop is checked; after, three of each.**
- **PART 1'S BEHAVIOURAL CLAUSE GAINS A ROW, and it is the fail-closed direction ADR-007 requires:**
  the home's REAL mount, driven with the same adversarial rows the fleet's is
  ([:595-603](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L595)) plus rows that
  carry `workItem: null`, must yield `POSTURE_READ_ONLY` and `inputEnabled: false` for every
  `no-producer`/`roster-gone` shape, and `POSTURE_INTERACTIVE` only for a positively-established
  `producer-known`. **The CONTRAST clause is preserved and extended** — one source, now THREE
  postures across three surfaces, which is what makes the gate prove a DIFFERENCE rather than a
  constant.
- **PART 2 IS UNTOUCHED — not one character.** It is a pure function over the frozen source table and
  the two postures, and m49 changes neither. m46 called it *"a far stronger pin than an
  absence-of-string sweep"*, and nothing about this milestone weakens that.
- **PART 3 IS UNTOUCHED AND GAINS A DIRECTORY.** The `ui/src/fleet/**` sweep survives **verbatim**,
  still non-vacuous (`Fleet.tsx`, `api.ts`, `assignments.mjs`, `scope.mjs`, `terminal-mount.mjs`,
  plus m47's five new components — **14 files**, measured through the sweep's OWN filter, which takes
  `.ts`/`.tsx`/`.mjs` and **excludes `.d.mts`**
  ([:341](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L341)); the directory holds
  20 files in total and six of them are declarations this sweep never reads. The distinction matters
  because part 3's non-vacuity floor is `files.length >= 5`
  ([:691](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L691)) and a reviewer
  reasoning from the directory listing would credit it with six files it never sees.) A **second sweep
  of `ui/src/home/**`** asserts the same
  property of the new surface: it wires no `onData`/`onKey`/`onBinary` and sends on no socket of its
  own. The home is interactive **through the ONE control and only through it**; a home module that
  grew a private socket would be a second input seam beside the tuple-bound one, which is invariant
  1's whole subject. All six of part 3's additional assertions about the control survive unchanged.
- **THE INVARIANT'S PROSE IS REWRITTEN, NEVER DELETED.** The file header's invariant 4 becomes: *"THE
  POSTURE HAS ONE AUTHOR PER SURFACE — the interactive surfaces are the BOARD DOCK and the TERMINALS
  HOME, the fleet page stays a MONITOR, and no render site in any of the three assembles the value
  that decides whether an operator can type into another machine."* The m46 amendment note stays on
  the file; this one is added beneath it, so the trail survives.
- **WHY THIS IS NOT WEAKER, stated as a checklist a reviewer can run:** every assertion that exists
  today still exists and still runs; the fleet's `INTERACTIVE_DECLARATION` sweep keeps its exact
  scope and strength; two directories are added to the authorship rule; two JSX mount sites are added
  to the bare-call rule; one directory is added to the input-source sweep; one behavioural row is
  added in the fail-closed direction. Nothing is removed and nothing is exempted. **Where m46's
  amendment had to trade a sweep for a policy, this one trades nothing.**
- **IT LANDS IN ONE STORY WITH THE HOME'S MOUNT MODULE.** Split, the intermediate state is either red
  for a whole story (part 1's table names a file that does not exist, and the gate throws) or —
  worse — green and vacuous (the module exists and the table has not yet been told about it). Vacuous
  is the dangerous one, and it is this gate's own recorded history.

**Alternatives rejected.**
- **Change nothing, because all three parts stay true.** Rejected: it leaves a gate whose stated
  invariant is false about the product and whose real property is unenforced on the two surfaces that
  can type. A green gate is read as a satisfied contract — m46/ADR-006's exact words, and the reason
  it had to act rather than observe.
- **Delete part 3's fleet sweep now that the home carries the interactive surface.** Rejected: it is
  the only clause that catches a NEW fleet-local module growing its own input path, and its own text
  says the parts are complementary rather than redundant.
- **Move the whole gate to `ui/src/terminal/**` and assert the control's behaviour instead.**
  Rejected: the control's behaviour is already asserted (part 2, and part 3's control clauses). What
  needs guarding is the CALL SITES — the posture is theirs.
- **Split the arch-test amendment into its own story, as STATE hints.** Partly rejected. STATE is
  right that the amendment deserves *its own reviewable boundary*; it is wrong if that means its own
  DIFF. The resolution is in §Story-boundary guidance: one story, whose subject IS the amendment,
  which also lands the mount module the amendment names.

**Consequences.**
- One file changes: `test/arch/acd-fleet-terminal-input-constrained.test.mjs`. Its imports grow by
  one (`ui/src/home/session-mount.mjs`), which is why the module must exist in the same diff.
- The gate stays registered in `scripts/test.mjs`
  ([:169](../../../scripts/test.mjs#L169)); `acd-test-suite-registration` is unaffected.
- TECH_DEBT 24 binds on every new source-reading clause: **strip LINE comments first and BLOCK
  comments second**. This file already does it correctly
  ([:120-125](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L120)) and the new
  clauses reuse that same `stripComments`, never a local copy.

---

## ADR-009: Layout persistence is a per-origin BROWSER preference behind one pure module that takes storage as an ARGUMENT — and the persisted layout is a FILTER over the live index, never a SOURCE of rows. No route, no mutation, nothing on the wire

**Status:** Accepted
**Date:** 2026-08-13

**Context.** SPEC asks for "layout persisted per operator" and, in the same breath, forbids *"widening
the fleet face's write surface — no new API mutation is added here"*. `POST /api/mesh/assign` remains
the one carve-out (m38/ADR-012), gated by
[acd-mesh-ui-write-isolation](../../../test/arch/acd-mesh-ui-write-isolation.test.mjs) and
[mesh-ui-read-only-contract](../../../test/mesh-ui-read-only-contract.test.mjs). The posture is
single-operator over the existing mesh credential, so "per operator" and "per browser profile" are
the same set of one.

**Decision.**
- **The store is `localStorage`, per origin, behind ONE pure module in `ui/src/home/` that takes the
  storage object as an ARGUMENT and reads no global.** Same shape as `terminalSocketUrl`'s `origins`
  and `shell-nav`'s resolvability, and for the same reason: this repo has no browser harness, so a
  module that reached for `window.localStorage` would be a module no `node:test` could drive.
- **IT PERSISTS PREFERENCES, NEVER SESSIONS.** Exactly two things: an ordered list of
  `(nodeId, sessionId)` tuples, and the focused tuple. **No `repo`, no `assistant`, no `workItem`, no
  `lastPingAt`, no bytes, no scrollback.** Anything more would make the browser a second, stale
  authority over what the mesh says exists — m48/ADR-003's one-authority rule, one layer out — and a
  persisted `repo` is exactly the field that would still say `demo` after the session moved.
- **THE PERSISTED LAYOUT IS A FILTER, NOT A SOURCE. This is the load-bearing negative.** A stored
  tuple that is not in the current `sessions[]` is **DROPPED silently**. It is never rendered as a
  ghost pane, never as a greyed placeholder, never as "session ended". A pane for a session the mesh
  does not list is precisely the lie this milestone exists to stop, and storage is the one place that
  lie can be manufactured locally with no producer at all.
- **IT DEGRADES TO THE INDEX'S OWN ORDER, ALWAYS.** Absent, empty, corrupt, unparseable, a quota
  error, or a storage accessor that throws (private modes and some embeddings throw on access, not on
  write) → the grid renders in `buildSessionIndex`'s deterministic `(nodeId, sessionId)` order. Never
  an error, never a blank grid, never a retry. A parse failure is treated as absent, not as a
  corruption to report.
- **THE KEY CARRIES A SCHEMA VERSION**, so a shape change is a silent reset rather than a crash on a
  value written by an older build. `localStorage` is already per-origin, so no origin needs to be
  encoded into the key — and the same bundle served from three origins therefore keeps three
  independent layouts, which is correct: a board origin has no terminals home.
- **NOTHING ON THE WIRE CHANGES.** No route, no mutation, no new payload key.
  `acd-mesh-ui-write-isolation` and `mesh-ui-read-only-contract` stay green **by construction**, not
  by assertion.

**Alternatives rejected.**
- **A server-side per-operator layout store.** Rejected: it needs a mutation route on the face whose
  single carve-out is the milestone's own stated boundary, and it would make a browser preference a
  mesh fact with its own staleness question.
- **The URL / query string**, m47's precedent for the repo filter. Genuinely attractive — this
  product's own rule is that the address bar is the truth, and `routes.mjs`'s preserve-by-default
  copy was written so a filter survives a redirect. Rejected for LAYOUT: sixteen `(nodeId,
  sessionId)` tuples make an unreadable URL, and a bookmark of it names sessions that will not exist
  tomorrow — the ghost-pane problem, made shareable. The condition that would overturn it: a single
  addressable fact worth deep-linking (one focused pane), which is a small, separable follow-up and
  is not layout.
- **`sessionStorage`.** Rejected: it dies with the tab, which is not "persisted per operator" by any
  reading.
- **IndexedDB.** Rejected as disproportionate for two arrays of strings, and it is async, which would
  put the grid's first render behind a promise for no gain.
- **Persist the subscribed SET as well as the order.** Rejected: subscription is arbitrated against a
  cap and a live row set (ADR-006), so a restored subscription set could exceed the cap or name rows
  that are gone. Order and focus are inputs to the arbiter; its output is not persisted.

**Consequences.**
- One `.mjs` + `.d.mts` pair in `ui/src/home/`, drivable with a hand-written storage double that
  can be made to throw on read, on write, and on both.
- The grid is fully functional with storage unavailable — which is also how every headless test
  drives it.

---

## ADR-010: The repo-dedupe rule lands in ONE commit across BOTH implementations, and that commit must ALSO capture the fixture that gives the cross-language gate teeth — today no fixture exercises the case, so the only guaranteed-red gate is the local JS pin

**Status:** Accepted
**Date:** 2026-08-13

**Context.** m48's OUTCOME leaves this Gap with an explicit discharge condition: *"milestone 49
decides the rule in its DESIGN and lands it in the JS formatter and the Rust view-model in one
commit."* **The display rule itself is the designer's call. This ADR owns only the mechanism**, and
the mechanism has a hole in it that a story would otherwise discover at review.

Measured at source:

- **The JS seam** is `fleetCurrentWorkLines` ([runs.mjs:99-107](../../../ui/src/fleet/runs.mjs#L99)) —
  filter on `workspaceHasRun !== true`, map to `repo`, filter blanks, sort, join. **No dedupe**, by
  m48/ADR-010 R4's explicit HOLD.
- **The Rust seam** is `session_repos()`
  ([status.rs:118-128](../../../app/desktop/crates/core/src/status.rs#L118)) — the same shape,
  `repos.sort(); repos`, with a comment stating byte-for-byte agreement with the JS as the
  requirement.
- **The tie** is `crossSurfaceDriftViolations`
  ([acd-captured-producer-fixture.test.mjs:175-195](../../../test/arch/acd-captured-producer-fixture.test.mjs#L175)):
  for each `REAL_CAPTURED_*` fixture it re-derives the JS line and asserts the Rust source contains
  it as a quoted literal (escaping `·` as `\u{b7}`, [:170-172](../../../test/arch/acd-captured-producer-fixture.test.mjs#L170)).
- **And none of the four fixtures carries two sessions in the SAME repo.** `LIVE_SESSION`,
  `TWO_SESSIONS` (`aof`+`beta`), `TWO_SESSIONS_NON_ALPHA` (`pilot-app-portal`+`aof`),
  `SESSION_WITH_RUN` ([view_model.rs:506, 636, 784, 846](../../../app/desktop/crates/core/src/view_model.rs#L506)).
  **So the cross-language gate cannot see a dedupe divergence today.** The gate that WOULD trip,
  deterministically, on a JS-only change is the plain JS pin
  ([mesh-fleet-session-subsumption-render.test.mjs:124-126](../../../test/mesh-fleet-session-subsumption-render.test.mjs#L124))
  — and its comment says the cross-language gate is *meant* to be the enforcement.

**Decision.**
- **ONE COMMIT, FOUR EDITS, and the fourth is the one that is easy to skip:** (1)
  `fleetCurrentWorkLines`; (2) `session_repos()` (and only `session_repos()` — see the exclusion
  below); (3) the JS pin's row 6 **and its rule-form assertion**; (4) **a FIFTH captured
  `REAL_CAPTURED_*` fixture exercising two live sessions in one repo with no run.**
- **THE FIXTURE IS CAPTURED, NEVER HAND-TYPED.** `acd-captured-producer-fixture`'s own subject is
  that fixtures are producer-shaped: it compares each session entry's KEY ORDER against the real
  producer's frozen order ([:150-161](../../../test/arch/acd-captured-producer-fixture.test.mjs#L150)).
  A hand-written fixture that drifts fails that clause — which is the gate working, and is exactly
  why the fixture must come from the real producer the way the existing four did.
- **THE FIXTURE LANDS IN THE SAME COMMIT AS THE RULE, NOT AFTER IT.** A fixture added afterwards
  proves nothing about the change that needed proving; it only pins whatever shipped.
- **THE JS PIN'S RULE-FORM ASSERTION IS REPLACED WITH ANOTHER RULE, NOT WITH A STRING.** Today
  [:145-148](../../../test/mesh-fleet-session-subsumption-render.test.mjs#L145) asserts
  `split(", ").length === sessions.length` **as a rule**, written that way *"so a future dedupe
  cannot slip past by rewording the expectation"*. Its replacement must be equally rule-shaped —
  the natural form being the deduplicated cardinality of the surviving repo set — so the next
  milestone cannot reword its way past the new behaviour either. **Replacing a rule with a literal
  would be this milestone quietly deleting the guard m48 wrote to constrain it.**
- **AND THE GATE'S OWN COVERAGE IS ASSERTED, because a gate that has never had a fixture for its
  subject is a gate nobody knows can fire.** `acd-captured-producer-fixture` gains a non-vacuity
  clause: **at least one captured fixture must carry two live sessions in one repo.** Removing that
  fixture then fails CI instead of silently returning the gate to toothlessness.
- **ONE PRE-EXISTING DIVERGENCE IS EXPLICITLY EXCLUDED FROM THIS STORY, named so it is not
  discovered.** `current_work` short-circuits to `Running{...}` when `activeRuns` is non-empty and
  **never reads sessions at all** ([view_model.rs:200-205](../../../app/desktop/crates/core/src/view_model.rs#L200)),
  whereas the JS renders BOTH the `running N runs` line and the `(session)` line. That is a real,
  documented, pre-existing behavioural difference, it is **not** the dedupe question, and fixing it
  inside a dedupe commit puts a behaviour change where nobody is reviewing for one. **Route:
  TECH_DEBT (new entry, §Codebase health finding 5)** — including the sharper half, that
  `crossSurfaceDriftViolations` cannot currently see it, because it asserts the Rust SOURCE TEXT
  contains the JS-rendered literal rather than that the Rust FUNCTION returns it.
- **`app/desktop/crates/core/src/view_model.rs` CARRIES UNCOMMITTED WORK** (a 2026-08-11 re-capture
  of the Rust fixtures, `aof:verify 48`'s discharge of the fixture-drift lane). Whoever edits it
  rebases on that rather than re-capturing over it.

**Alternatives rejected.**
- **Change the JS and let the Rust follow next milestone.** Rejected by m48's discharge condition and
  by the local JS pin, which fails immediately — correctly.
- **Delete the Rust implementation and have the desktop read the JS.** Rejected as far out of scope:
  it is a cross-language runtime boundary, and the captured-fixture gate exists precisely to make two
  implementations safe.
- **Make `crossSurfaceDriftViolations` compile and RUN the Rust rather than read its source.**
  Genuinely the stronger gate and rejected for this milestone: it puts a `cargo` invocation inside
  the JS suite, on a crate that only builds on some of the fleet's machines. Recorded in the
  TECH_DEBT entry as the real fix for the source-text weakness.

**Consequences.**
- `ui/src/fleet/runs.mjs` (← 7, → 0) and `app/desktop/crates/core/src/status.rs` are both leaves; the
  blast radius is the fixture and three tests.
- This is the only story in the milestone that touches Rust, and the only one that touches
  `ui/src/fleet/`.
- **[`acd-rendered-component-fed-by-route`](../../../test/arch/acd-rendered-component-fed-by-route.test.mjs)
  BINDS HERE — re-homed 2026-08-13 from ADR-001, where it was mis-routed.** It is m38/ADR-008's
  mounted-component gate and it asserts, structurally, that **every** component in `Fleet.tsx`
  mapping over `nodes` derives its current-work line from the ONE shared projection
  (`fleetCurrentWorkLines` / its `nodeCurrentWork` wrapper). A dedupe that changed that projection is
  exactly the diff this gate is watching, and its origin story is the reason to take it seriously: it
  exists because F9 found `NodeCard` was **dead code in production** while a fixture-fed green test
  hid the bug for a whole milestone. Its list moves in the dedupe commit if the projection's callers
  move; nothing about the landing route touches it.

---

## Fitness functions

Four gates are amended and four are new. Each pins a structural invariant an ADR above implies; each
states its own red/green expectation at refine (an arch test written at refine forecasts a contract
and is expected RED until its story lands). All are registered in
[scripts/test.mjs](../../../scripts/test.mjs) — m43/ADR-014 E7, `acd-test-suite-registration`; an
unregistered suite is no gate at all.

**TECH_DEBT 24 binds on every source-reading clause below: strip LINE comments FIRST and BLOCK
comments SECOND.** The wrong order lets a line comment containing `/*` delete the rest of the file
before the detector sees it, which on an absence sweep is a silent PASS. Reuse the existing
`stripComments` in each host file; never write a second copy.

**A TENTH OBLIGATION, raised at 49/03's structural review 2026-08-13 and owed to `host-model.mjs`'s
own shipped detector rather than to a new file: THE FORM VOCABULARY MUST BE CLOSED BY CODE.**
ADR-007 AMENDMENT (B) rests its entire "no prop, no new mechanism" argument on the sixth form being
*"one new value in the existing CLOSED `form` vocabulary … policed by a detector that already
exists"*. Measured at delivery: `AFFORDANCE_FORMS` ships exported from
[host-model.mjs](../../../ui/src/terminal/host-model.mjs) and is referenced by **nothing** in the
tree — not `affordanceFormViolations`, not a suite, not a component — and the detector's three
clauses key on `FORM_CHEVRON`/`FORM_WORDED_TOGGLE` and on declared-vs-dispatched cost, so
`{ form: "double-click", activation: "hold-meta" }` yields **zero violations**. The vocabulary is
therefore closed by prose alone, in the one milestone that opened it. **The fix is inside the
shipped detector and is two lines: every declared entry's `form`, and its `activation` where
present, must be a member of `AFFORDANCE_FORMS`** — which also polices the SEVENTH form on arrival,
which is the property that made these tables worth building. It lands in the story that next touches
`host-model.mjs` (49/05 wires `hostRestPane` and the activation form into the control); until then
the closure is a review obligation, and that is exactly the state this section exists to end.

| file | pins | expectation at refine |
|---|---|---|
| [`acd-fleet-terminal-input-constrained`](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs) *(amended)* | **ADR-008 + its 2026-08-13 amendment** — part 1's AUTHORSHIP clause generalised to the surface→posture-home table (3 directories), with `INTERACTIVE_DECLARATION` staying **fleet-scoped** and neither clause reaching `ui/src/terminal/**`; the bare-call JSX clause applied at mount sites **discovered by per-surface sweep**, each surface carrying **its OWN floor** (a concatenated whole-clause floor is satisfiable by Fleet alone and leaves the home unchecked); plus the home's fail-closed behavioural row. Part 2 **untouched**; part 3 **untouched** + a `ui/src/home/**` input-source sweep | **RED on part 1** until `ui/src/home/session-mount.mjs` exists (its import throws); parts 2 and 3 green throughout |
| [`acd-terminal-control-boundary`](../../../test/arch/acd-terminal-control-boundary.test.mjs) *(amended)* | **ADR-001/002** — the `fleet → board` shrink-only baseline ([:116-122](../../../test/arch/acd-terminal-control-boundary.test.mjs#L116)) gains an **EMPTY `home → {fleet,board}` baseline** (shrink-only from zero, `.d.mts` swept — the type-only edge is the one that got past a review last time); the call-site floor rises from `>= 2` to `>= 3`; and `ui/src/home/**.mjs` is React-free, DOM-free and plain-`node`-loadable like the rest | **RED on the call-site floor** until the home's mount module lands. ~~the home baseline is green-and-vacuous until the directory exists, and the floor is what makes it non-vacuous~~ — **DELIVERED 2026-08-13 by story 02, and the vacuity is closed IN THE CLAUSE rather than by leaning on a sibling**: `collect()` returns `[]` for a directory that is not there, so the sweep asserts it read **≥ 3 files** under `ui/src/home/` and REFUSES otherwise, naming the re-aim. Green on the delivered tree (6 files swept, 0 sideways specifiers); driven red by five plants (runtime, type-only, two-levels-up, aliased) with five permitted DOWNWARD imports driven green beside them |
| [`acd-terminal-output-signal-source`](../../../test/arch/acd-terminal-output-signal-source.test.mjs) *(amended)* | **ADR-003** — the existing FLOOR of two `.sendTerminalFrame(` producers ([:169](../../../test/arch/acd-terminal-output-signal-source.test.mjs#L169)) gains a **shrink-only CEILING**: exactly the two sites in `src/mesh-launcher.mjs`'s worker branch. Its refusal names m49/ADR-003 — a third producer means the browser's `no-producer` derivation is stale and must be re-derived here | **GREEN on arrival** (2 = 2) — it preserves a property that is true, load-bearing and currently unguarded. **DELIVERED 2026-08-13 by story 02.** Floor and ceiling now read ONE number, `SANCTIONED_PRODUCER_SITES = 2`, so the pair cannot drift; the real-tree clause reads it back as an **equality** rather than `>= 2`; and the ceiling is driven red by a **sanctioned-shaped** third arrow in a module of its own (so a silent ceiling cannot hide behind a shape refusal), with the two refusals asserted **distinguishable** — a reviewer must be able to tell "a lane went dark" (m46) from "a browser's arithmetic went wrong" (m49) off the first line |
| **`acd-home-pane-truth`** *(new)* | **ADR-003/007** — the home defines no state word of its own (no `TERMINAL_STATES`-shaped literal anywhere under `ui/src/home/**`); the feed axis is derived from `workItem`/row presence and from **no byte** (no `JSON.parse` of socket data, no regex over terminal output, no import of the byte area); the composition precedence is ONE pure function; and the posture derivation **fails closed** for every row shape | **RED** until the home lands |
| **`acd-home-socket-cap-single-arbiter`** *(new)* | **ADR-006 + its 2026-08-13 amendment** — `MAX_LIVE_PANES` is declared in exactly ONE module under `ui/src/home/`; no component holds a cap literal; the arbiter takes the rows, the cap, the intents **AND the currently-subscribed set** as ARGUMENTS and reads no module-scope state; and the cap is `<= MAX_TAIL_KEYS` read **across the build boundary** from [src/mesh-terminal-mirror.mjs:59](../../../src/mesh-terminal-mirror.mjs#L59) — the identical cross-build technique `acd-terminal-mirror-geometry-pinned` uses for 80×24. **Plus the NO-DEMOTE invariant, driven behaviourally over generated inputs rather than sampled: for every `(rows, cap, intents, subscribed)`, `\|result\| <= cap` AND ~~`result ⊇ subscribed ∩ liveRows`~~** — **CORRECTED 2026-08-13 by ADR-006 AMENDMENT (5): that containment is FALSE at any cap below the retained count, and stating it here is what a build would have driven. The clause to drive is `\|result ∩ retainable\| = min(\|retainable\|, limit)` where `retainable = (incumbents ∩ live) \ hidden`, plus the three-way BICONDITIONAL attribution of `released.cause` over `hidden` · `left-the-index` · `cap-lowered`, plus conservation (`keys(released) = incumbents \ result`, exactly). `demoted` is gone from the return shape and must not be asserted about** | **RED** until the home lands; the cross-build clause is green the moment both numbers exist |
| **`acd-home-layout-is-a-filter`** *(new)* | **ADR-009** — no `localStorage`/`window`/`document` reference anywhere in `ui/src/home/**.mjs` (storage is an argument); the persisted shape carries ONLY tuples and focus (no `repo`/`assistant`/`workItem`/`lastPingAt` key); and, driven behaviourally, the composer's output is always a SUBSET of the live rows it was handed | **RED** until the home lands |
| [`acd-captured-producer-fixture`](../../../test/arch/acd-captured-producer-fixture.test.mjs) *(amended)* | **ADR-010** — a non-vacuity clause: **at least one captured fixture carries two live sessions in one repo**, so `crossSurfaceDriftViolations` has teeth on the dedupe rule at all | **RED at refine** — no such fixture exists today, which is the finding |
| **`acd-ui-directory-budget`** *(new)* | **§Codebase health finding 1** — TECH_DEBT 28 fix (b) / 33 fix (b): a NAMED, explicit list of `ui/src/*` top-level directories (a 9th is a decision, not a diff) plus a per-directory FILE-COUNT ceiling set just above delivered, in the same table shape `acd-ui-surface-file-budget`'s `BUDGETS` uses. Six per-file ceilings cannot see a tree that grows by adding files, and three consecutive milestones have grown it that way | **RED on arrival by design** — it is authored against the delivered tree, so it is green the moment its table is filled in, and it is what makes the 9th directory a conversation |

| **`acd-motion-has-an-escape`** *(new, the NINTH — added 2026-08-13 at the PO's story-06 ruling)* | **DG-49-6** — **every `animate-*` utility EMITTED anywhere under `ui/src/**` is named in `ui/src/index.css`'s `@media (prefers-reduced-motion: reduce)` block.** A set-containment assertion, not a word search, and the source is **comment-stripped LINE-FIRST** (TECH_DEBT 24) because that is what makes it honest here specifically — see the trap below | **RED at refine.** Measured: the escape block names `.aof-pending` alone ([index.css:112-116](../../../ui/src/index.css#L112)) against **twelve** emitted `animate-pulse` sites, so the gate is red on arrival and its redness is the finding |

**THE TRAP THIS NINTH GATE EXISTS TO WALK PAST, measured by QA and worth stating because it inverts
the obvious design.** A naive `prefers-reduced-motion` sweep of `ui/src/terminal/palette.mjs` is
**GREEN today** — the string is present, in a **comment that is false**:
[palette.mjs:186](../../../ui/src/terminal/palette.mjs#L186) claims *"Both pulses honour
`prefers-reduced-motion` through the existing scoping convention in `ui/src/index.css`"*, and
`index.css`'s only such rule names `.aof-pending`. So the naive gate would certify the exact defect
it was written for, out of a sentence. Two consequences, both binding: **the detector reads
comment-stripped source** (line comments first, per TECH_DEBT 24, or the block-first order eats the
file at the first `//` containing `/*`); and **the plant is a motion class emitted with no escape,
never a missing word.** The false comment is corrected in the same diff — it is the thing that
blinded the gate, and it is the third instance this milestone has met of a shipped comment asserting
something that stopped being true.

**MECHANISM RULING: ONE CSS RULE, NOT TWELVE CALL-SITE EDITS.** The escape is widened in
`ui/src/index.css`'s existing reduced-motion block to disable the `animate-pulse` **utility**, not
each site. Three reasons, and the third is the one that decides it: twelve per-site escapes are
twelve edits and a thirteenth site is one diff away; the CSS mechanism fixes all twelve at once while
**touching exactly one file**, so it does not violate story 06's scope discipline (that discipline is
about which files a story touches, and this touches one — the eleven non-terminal sites are never
opened); and it keeps the invariant **checkable from source**, which is what makes the browser lane
declinable below. The eleven non-terminal sites the PO is filing as debt are fixed *incidentally and
correctly* by the mechanism, and none of their files is edited.

**THE BROWSER LANE IS DECLINED FOR MILESTONE 49 — argued, not defaulted.** QA measured feasibility
and it is real: `--force-prefers-reduced-motion` genuinely flips `matchMedia().matches`, the cached
Chromium binary must be **discovered** rather than hardcoded (`chromium-1234/chrome-win64/` vs older
`chrome-win/`), `--dump-dom` **hangs** so results must return over a loopback POST on `port: 0`, and
no dependency is added (`acd-conformance-verdict-contract`'s own clause forbids `playwright` in
`package.json`). **Those notes are recorded here verbatim so the next milestone does not re-derive
them.** It is declined anyway, for one reason: **with the CSS mechanism above, the source gate is a
COMPLETE proof of the invariant**, because the block *is* the mechanism — every emitted class is
either named in it or it is not, and nothing else can make the property true or false. A browser
would re-confirm that Chromium implements `@media (prefers-reduced-motion)`, which is a platform
fact and not our invariant. This repo has **zero** browser-driven suites, and adding that class of CI
infrastructure — binary discovery, loopback plumbing, a hang to work around — inside a UI milestone
buys a weaker assertion than the one it already has. **The scenarios move to `@manual` unchanged.**
**The condition that overturns this:** the first invariant here whose truth depends on rendered
geometry or computed style rather than on a declaration we own. A per-site escape mechanism would
have been exactly that, which is a second, independent reason to prefer the CSS block.

**What a plant that must trip each one looks like.** Hand-written synthesized snippets, never a
string-replace on a real file; each plant asserts it LANDED (`assert.notEqual(planted, clean)`)
before asserting the detector fires, and each detector is also shown QUIET on a clean baseline. **A
detector only ever shown to stay quiet is one mutation from asserting nothing** — m46 found exactly
that in `affordanceFormViolations`, where the one plant was fed to a locally re-implemented copy so
the SHIPPED detector was never once driven to a violation
([host-model.mjs:168-174](../../../ui/src/terminal/host-model.mjs#L168)). Every plant below is fed to
the SHIPPED function.

- **invariant 4 (amended)** — a home module writing `posture:` at a render site;
  `mount={{ ...homeSessionMount(row), posture: { readOnly: !!0 } }}` at the home's JSX (the exact
  spelling m46's own review found walking past a word sweep); a home mount that returns
  `POSTURE_INTERACTIVE` for a row carrying `workItem: null`; a home module registering `onData`.
  **AND THE FLOOR PLANT, which is the one that matters (ADR-008 amendment (A)):** a home surface with
  its `<TerminalControl … mount={…}>` site DELETED entirely, while Fleet's and Board's remain. A
  concatenated whole-clause floor stays green on that plant; the per-surface floor must go red and
  must name the home in its refusal. **Without this plant the floor is the thing it exists to
  prevent.** Its mirror is also required — a home mount site whose prop is
  `{ ...homeSessionMount(row) }` — so the sweep is shown to FIND the site, not merely to count one.
- **control-boundary (amended)** — `import { assignmentChip } from "../fleet/assignments.mjs";` in a
  home `.mjs`; the same as a **type-only** import in a home `.d.mts` (the kind the graph cannot see);
  `{ ...MIRROR, originRole: "self" }` in the home.
- **output-signal-source (amended)** — a synthesized third `.sendTerminalFrame(` call site in a
  second `src/` module, correctly spelled `(chunk, sessionId) => client.sendTerminalFrame(sessionId,
  String(chunk))` so it passes every EXISTING clause and trips only the new ceiling. That is the
  point: the plant must be a *legitimate-looking* producer, because that is what a real third one
  would be.
- **home-pane-truth** — a feed derivation reading `text.includes("$ ")`; a
  `const HOME_STATES = { BLOCKED: "blocked", … }` second vocabulary; a posture derivation defaulting
  to interactive on an unrecognised row.
- **socket-cap** — `MAX_LIVE_PANES = 128` (trips the `<= MAX_TAIL_KEYS` tie); a `.tsx` holding
  `slice(0, 16)`; an arbiter reading the cap from module scope instead of its argument. **AND the
  no-demote plant, which is the defect QA actually found:** a priority-ordered arbiter that ignores
  its fourth argument and returns `rank(rows).slice(0, cap)` — driven with 16 live incumbents at cap
  16 and a 17th row that sorts first, it must drop one incumbent and the invariant
  `result ⊇ subscribed ∩ liveRows` must go RED. That arbiter is the *obvious* implementation and it
  passes every other clause, which is exactly why the invariant has to be asserted rather than
  described.
- **layout-is-a-filter** — a composer emitting a stored tuple absent from the live rows (the
  ghost-pane defect, and the one clause that is behavioural rather than textual); a persisted shape
  carrying `repo`; `window.localStorage.getItem` inside the `.mjs`.
- **captured-fixture (amended)** — delete the new duplicate-repo fixture; the non-vacuity clause must
  fire. (Without this plant the clause is the thing it exists to prevent.)
- **directory-budget** — a synthesized 9th `ui/src/` directory; a directory one file over its
  ceiling.
- **motion-has-an-escape** — a synthesized `ui/src` file emitting `animate-spin` while the
  reduced-motion block names only `animate-pulse`. **NOT a missing-word plant:** the companion plant
  is a file whose ONLY occurrence of `prefers-reduced-motion` is inside a comment, which must NOT
  satisfy the gate — that is the live defect at
  [palette.mjs:186](../../../ui/src/terminal/palette.mjs#L186) and the reason the detector strips
  comments line-first. Both plants are required; the second is the one that proves the gate is
  measuring the mechanism rather than the prose.

**Invariants that belong HERE and must NOT appear in a task `.feature`.** These are structural
assertions, not observable behaviour, and a story that writes them as Gherkin has put a fitness
function in the wrong home: *the posture has one author per surface*; *the home imports nothing from
`ui/src/fleet/` or `ui/src/board/`*; *the mirror has exactly two frame producers*; *the pane cap is
one constant, `<= MAX_TAIL_KEYS`*; *the arbiter never drops a live incumbent*; *the persisted layout
carries only tuples and focus*; *`ui/src` has eight top-level directories*. What DOES belong in a
`.feature` is the observable consequence — a free session's pane is labelled read-only and says why;
a keystroke into a worker's pane reaches it; **a pane held below the cap says `not streaming` and
offers `Watch terminal →`, while a pane held AT the cap says how many are live and how to free one,
and offers no toggle at all** (DESIGN §DG-49-4, and note the amendment: these are two different
observables and a scenario that conflates them would ratify the eviction rule this ADR dropped);
**hiding a watched pane frees exactly one slot and the next arbitration fills it**; a session that
leaves the roster stops claiming to be live; two sessions in one repo render that repo once.

**Satisfiability.** Every new gate's subject is a file this milestone creates, so satisfiability is
by construction, with two exceptions worth naming. `acd-captured-producer-fixture`'s new clause can
only go green once a real capture exists — it is the gate that proves ADR-010's own claim and cannot
be satisfied by editing JS. And `acd-terminal-output-signal-source`'s ceiling is green on arrival by
design: it guards a property that is already true, which is the correct time to guard one.

---

## Codebase health (measured this refine, and where each finding is routed)

Measured **2026-08-13 in the working tree** (m47 + m48 delivered but uncommitted; HEAD is `7400664`),
by the identical command TECH_DEBT items 28 and 33 used, so the trend is method-consistent — their
`91 / 18,215` for HEAD reproduces exactly.

| Signal | m44 (`eacbd57`) | m45 (`14ac6e1`) | m46 (`7400664` = HEAD) | now (m47+m48 in tree) | Trend |
|---|---|---|---|---|---|
| `ui/src` files | 54 | 71 | 91 | **99** | **+83% over four milestones** |
| `ui/src` lines | 10,887 | 14,238 | 18,215 | **20,298** | **+86%**, crossed 20,000, and moved +70 during this refine |
| `ui/src` top-level directories | — | 7 | 7 | **7** (→ **8** with m49) | the count nobody watches |
| `ui/src/fleet/` | — | — | **12 files / ~4,100** | **20 files / 5,299** | **+67% files in one milestone** (m47) |
| `ui/src/terminal/` | — | — | 30 / 4,646 | **30 / 4,646** | stable since m46 |
| `ui/src/board/` | — | — | 21 / 4,924 | **21 / 4,924** | stable |
| `ui/src/app/` | — | 13 / ~3,400 | 13 / 3,457 | **13 / 3,457** | stable |
| `src/` root-level `.mjs` | 108 | 109 | 109 | **109** | flat — item 10's ratchet is holding |
| `test/arch/` suites | — | — | — | **266** | the fitness surface |

**Per-file budgets — counted THE WAY THE GATE COUNTS** (`source.split(/\r?\n/).length`,
[acd-ui-surface-file-budget:175](../../../test/arch/acd-ui-surface-file-budget.test.mjs#L175), which
is **`wc -l` plus one** for a newline-terminated file):
**`DetailPanel.tsx` 1,000/1,000 — ZERO headroom**, `App.tsx` **1,298**/1,300 (**2**), `Shell.tsx`
**931**/940 (**9**), `Fleet.tsx` **1,540**/1,560 (**20**), `TerminalControl.tsx` **819**/840 (21),
`shell-layout.mjs` **1,016**/1,060 (44).

**THE MEASUREMENT METHOD IS PART OF THE FINDING, and it went wrong twice in one day in two different
ways.** (a) This tree carries **m47's work uncommitted**, so the numbers move under the refine:
`Shell.tsx` read 917 and `Fleet.tsx` 1,532 hours earlier, and `ui/src` totals went 20,228 →
**20,298 lines** over the same window. (b) Every one of those passes — mine and the PO's correction of
mine — used **`wc -l`, which is not the gate's arithmetic**, so each row was additionally understated
by one *in the unsafe direction*: it made every file look one line further from its ceiling than it is.
**A budget measured by a different rule than the gate enforces is not a measurement, it is a second
opinion** — and it is the same species as this milestone's other recurring finding, a number or a
pointer that reads authoritative and is not.

**The corrected picture is materially worse than the one this document first reported.** One file is
**AT** its ceiling, two are within **0.2%**, four within **1%**, and all six within **5%**. **Item 33's
alarm line is not "exactly where it was"** — `DetailPanel.tsx` is on it. That file is green solely
because the assertion is `<=`, so the next line added to it fails CI; m49 does not touch it and must
not be made to pay for it, but the aggregate is what this section exists to see: **the tree has no
slack anywhere to absorb a surprise.** ADR-001's verdict still holds on its own arithmetic
(`Shell.tsx` lands near 927 of 940) and is no longer a claim anyone should take on trust.

Seven findings, each routed.

1. **The tree grows by adding FILES, for the fourth milestone running, and every per-file gate is
   green throughout.** m46 +17 files, m47 +8, m48 +0, m49 ≈+9 and an 8th directory. Item 28 fix (a)
   HAS landed — `BUDGET_REQUIRED_ABOVE = 800`
   ([acd-ui-surface-file-budget.test.mjs:167](../../../test/arch/acd-ui-surface-file-budget.test.mjs#L167))
   makes the N+1th large file fail CI instead of needing a reviewer's memory, and it works. **Fix (b),
   the directory-level count, has not, and it is the one that sees this.** Item 33 already says so in
   terms: *"the correct per-file move and the tree-level degradation are the same move … Fix (b) has
   stopped being a suggestion; it is the ratchet this item exists to buy."* **Route: REQUIRED of this
   milestone** — `acd-ui-directory-budget` (§Fitness functions). m49 is the Nth instance and the
   milestone that adds the 8th directory; it is the one that should pay for the counter. Item 33's
   fix (c) — *report* headroom, not just breach, as a one-line "N files within 5% of budget" summary —
   is a handful of lines in the same suite and the same story should take it.
2. **`ui/src/fleet/` grew 67% in file count in one milestone and is the folder the home would have
   landed in.** 12 → 20 files, 5,299 lines. Each of m47's five new components is the *sanctioned*
   remedy (a sibling with a real prop boundary) and each is small — which is item 33's own point,
   restated by a second milestone: the right per-file move grows the tree. **Route: no action beyond
   finding 1's ratchet, and ADR-001's decision.** Naming it here is the point: it is the measurement
   that made "absorb into `ui/src/fleet/`" the wrong answer, and a reviewer should be able to see
   that the boundary was drawn on a number.
3. **TECH_DEBT 18(a) is unchanged and now has ONE gate.** The graph still measures **five**
   `Fleet.tsx → ui/src/board/` edges (`StaleBadge`, `api`, `freshness`, `runs`, `status`), and
   `acd-terminal-control-boundary`'s `FLEET_TO_BOARD_BASELINE` is shrink-only over exactly those five
   — including `.d.mts`, because *"the edge this ratchet was written for was a `import type` in a
   declaration file: no runtime import, no graph edge, no reviewer's eye"*. **Route: item 18 stays
   open; this milestone does NOT migrate the five** (it touches none of their importers, and dragging
   a layer extraction into a grid milestone is the scope explosion the health rule warns about).
   What m49 DOES pay is the prevention instalment: the same ratchet extended to `ui/src/home/` with
   an **empty** baseline, so the 8th directory cannot become the 6th instance of 18(a). The entry
   should be updated to record that a third domain folder now exists outside both surfaces.
4. **`unavailable` still has NO production producer after this milestone, and m46/DESIGN predicted
   m49 would be it.** DG-46-3 ruled the state *"built in m46 with no producer until m49"*; ADR-002
   rules `local-pty` out, and the home is served from the fleet origin, so `origins.fleet` always
   resolves. The state, its three frozen causes
   ([state-ramp.mjs:105-113](../../../ui/src/terminal/state-ramp.mjs#L105)), its copy table
   ([:458-482](../../../ui/src/terminal/state-ramp.mjs#L458)), its `UNAVAILABLE_UNNAMED` fallback and
   its whole `PANE_UNAVAILABLE_BLOCK` treatment are a rendering path nothing in production can reach.
   That is m46/ADR-007's own diagnosis one layer over — *"a fitness function whose subject has no
   production caller is not a weak gate, it is a FALSE one"* — applied to a UI state rather than to a
   function. **It is NOT dead code to delete**: it is correct, tested, and its producer is milestone
   50's first task (a pane opened from a `ref`). **Route: TECH_DEBT (new entry), paste-ready:**

   > **`unavailable` is a shipped, tested terminal state with no production producer — and two
   > milestones in a row predicted the next one would supply it.** m46 built the state, its three
   > named causes, its copy/recovery pairs and its centred-block pane treatment
   > (`ui/src/terminal/state-ramp.mjs`), on DESIGN DG-46-3's ruling that milestone 49 would be its
   > producer. m49/ADR-002 rules `local-pty` panes out of scope (the session index carries nothing
   > that addresses one), and the terminals home is served from the fleet origin, so `origins.fleet`
   > always resolves — no surface can enter `unavailable`. **How it bites:** the honest-degrade path
   > an operator most needs (a pane that says *why* it never opened, and what to run) is the one path
   > that has never run in production, so its first real exercise will be its first test; and a
   > second consecutive "the next milestone will produce it" is how a state becomes permanent
   > scenery. **The fix:** milestone 50's "new session"/board-pane work is its true producer — that
   > milestone lands spike 44 sub-question 1's additive `origin` field on `GET /api/mesh/board-url`
   > and, with it, the first pane that can fail to resolve an origin. Until then, record the state as
   > *deliberately producerless* on the ramp itself rather than leaving the next reader to infer that
   > it works. If milestone 50 also does not produce it, the state should be deleted rather than
   > predicted a third time.

5. **The JS and Rust current-work implementations diverge on a branch the cross-surface gate cannot
   see.** `current_work` short-circuits to `Running{...}` on non-empty `activeRuns` and never reads
   sessions ([view_model.rs:200-205](../../../app/desktop/crates/core/src/view_model.rs#L200));
   `fleetCurrentWorkLines` renders BOTH lines ([runs.mjs:80-107](../../../ui/src/fleet/runs.mjs#L80)).
   And `crossSurfaceDriftViolations` asserts the Rust **source text** contains the JS-rendered
   literal, not that the Rust **function returns** it — so a source file that merely mentions a string
   satisfies it. **Route: TECH_DEBT (new entry), paste-ready:**

   > **The desktop and web "current work" lines are two implementations, and their cross-surface gate
   > compares SOURCE TEXT rather than BEHAVIOUR.** `crossSurfaceDriftViolations`
   > (`test/arch/acd-captured-producer-fixture.test.mjs:175-195`) re-derives the JS line from each
   > captured payload and asserts the Rust SOURCE contains that literal — so a Rust file that merely
   > *mentions* the string passes, whatever its function returns. Measured under that gate: the two
   > genuinely disagree for a node with runs AND free sessions — `view_model.rs`'s `current_work`
   > returns `Running{..}` and never reads `session_repos()`, while `fleetCurrentWorkLines` renders
   > both the run line and the `(session)` line. The gate is green. **How it bites:** the desktop tray
   > and the fleet page can report different current work for the same node from the same payload,
   > and the one gate that exists to prevent exactly that cannot see it — which is worse than no gate,
   > because it is read as a satisfied contract. **The fix:** make the tie behavioural — build the
   > crate and compare `current_work`'s rendered output against `fleetCurrentWorkLines` over every
   > captured fixture — or, if a `cargo` invocation inside the JS suite is unacceptable, have the Rust
   > side emit its rendered lines to a checked-in artifact that the JS gate compares. Separately,
   > decide which of the two behaviours is right; they cannot both be.

6. **A SECOND rendering path with no production producer — and it is NOT the one QA expected, which
   is the useful part.** QA raised that making `/` a routed surface makes the shell's mounting
   shimmer reachable at `/` for the first time. **Measured, it does not: `STATE_MOUNTING` is
   unreachable in production TODAY, at every route.** `contentStateFor` enters it only when
   `surfaceLoaded === false` ([shell-layout.mjs:690-697](../../../ui/src/app/shell-layout.mjs#L690));
   `surfaceLoaded` is a `Shell` prop defaulting to `true`
   ([Shell.tsx:125](../../../ui/src/app/Shell.tsx#L125)); and `ui/src/main.tsx` **never passes it**,
   because every surface is imported eagerly and mounted synchronously — there is no `lazy`, no
   code-split chunk, nothing that can be un-loaded. So `MountPlaceholder`
   ([Shell.tsx:593-598](../../../ui/src/app/Shell.tsx#L593)) and its two `animate-pulse` skeletons are
   reachable only from a harness that passes `surfaceLoaded: false`. **ADR-001 does not change that**
   — adding `landing` to `SURFACES` makes the route *eligible* for a state nothing can enter.
   **Route: two parts, deliberately split.** (a) **Ruled here, structurally:** the shimmer's
   *accessibility* half is answered for free by §Fitness functions' `acd-motion-has-an-escape`
   mechanism, since a CSS-block escape covers `MountPlaceholder` along with the other eleven sites
   without opening the file — so nothing about this blocks m49. (b) **The remaining question — should
   the shell shimmer at all — is the DESIGNER's, and it is CONDITIONAL rather than live**: it becomes
   a real product question the day a surface is code-split, which is the obvious future for a
   20k-line bundle and is not this milestone. **Folded into finding 4's TECH_DEBT entry as its second
   instance** rather than filed separately: `unavailable` and `STATE_MOUNTING` are the same species —
   a designed, tested, reasoned-about rendering path that production cannot enter — and the entry is
   more useful naming the species than either instance alone. The general rule, worth stating because
   this milestone has now met it twice in `ui/` and m46 met it once in `src/`: **a rendering path with
   no production producer is the UI's version of m46/ADR-007's dead code with a live gate — correct,
   green, and asserting nothing about what an operator can see.**

7. **ANCHOR ROT — four instances in ONE milestone, three of them mine, and the cause is measurable
   rather than careless.** `acd-terminal-output-signal-source:169` → the guard is at `:167`;
   "the fleet sweep sees 20 files" → it sees **14**; spike 44's `control-stream-server.mjs:957` →
   `:1177`; ADR-001's `Shell.tsx:332-333`/`:335-341` → `:345-346`/`:349-359`. **The cause is that
   this tree carries m47's and m48's work UNCOMMITTED and it moved under the refine** — the same
   thing that moved two budget rows by 7 and 13 lines in one day (see the method note above). It is
   not a reason to excuse them; it is the reason a bare line number is the wrong citation FORM in a
   record doc, which is exactly what my own retro note to STATE already argues. **Route: a stated
   CONVENTION, not a gate, and the honesty is the point** — a gate that checked markdown line numbers
   against a moving tree would be theatre, and would go red for reasons unrelated to any diff that
   tripped it. **The convention this log now follows and the next one should: cite the FACT plus a
   STABLE anchor — a function, route, constant or test name — with the line number as a hint.**
   `acd-terminal-output-signal-source`'s `producers.length < 2` guard, `GET /api/mesh/board-url`,
   `MAX_TAIL_KEYS`, `terminalEntryState` — all four survive a tree that moves; `:169` did not survive
   an afternoon. **The one place this IS gated is where it already should be: an arch test reads the
   real file, so a rotted pointer there fails CI rather than misleading a reader** — which is the
   argument for putting a load-bearing pointer in a detector and a narrative pointer in prose.

8. **`TerminalControl.tsx` lands at 840 of 840 — a SECOND file on item 33's alarm line, added by the
   milestone that shipped the ratchet built to see this happening.** *(Measured 2026-08-13 at 49/05's
   structural review, by the gate's own `source.split(/\r?\n/).length`.)* ADR-001's table said this
   file would take **ZERO** and the milestone's net-negative claim rested partly on it; it took **+21**
   and used every line. **The REMEDY was discharged and the EXPECTATION was not, and those are two
   different verdicts that must both be said.** The remedy `acd-ui-surface-file-budget`'s own refusal
   prescribes — *"a surface gains CHILD COMPONENTS, not blocks"* — was honoured in its better form:
   the header moved into `TerminalIdentity.tsx` as `TerminalHeader` and the fullscreen door into
   `TerminalFullscreenOccupant.tsx` as `TerminalFullscreenDoor`, both **existing** files with real
   prop boundaries, so the tree gained **no file** — which is finding 1's whole subject and is
   strictly better than the ADR asked for. What was not discharged is the headroom: at zero on a
   `<=` assertion, **the next line added to that file fails CI**, so the next author cannot append and
   must extract before they edit, with none of this story's context. **Route: TECH_DEBT (new entry,
   item 40), with the next cut NAMED rather than improvised — the SESSION EFFECT** (the socket
   lifecycle: construct, paint, resize, tear down), the largest self-contained region left and the one
   with an existing seam, since it already consumes a computed `binding` value and a fixed set of
   refs. **Trimming a comment to fit is forbidden (ADR-014/E3) and it is what time pressure will
   argue for.**
9. **The one gate that could have said "840 of 840" before the diff landed reports only BREACH.**
   §Codebase health finding 1 declared item 33's fix (c) — *report headroom, not just breach, as a
   one-line "N files within 5% of budget" summary* — **REQUIRED of this milestone** and said "the same
   story should take it". Measured at 49/05: `acd-ui-surface-file-budget` has no headroom band at all,
   while the directory ratchet this milestone DID land carries one (`nearBudget`, a 5% band). So the
   tree now has two files at or within 0.2% of their ceilings and the per-file gate is silent about
   both until one of them is over. **Route: TECH_DEBT (new entry, item 41).** It is a handful of lines
   in a suite this milestone already opened, and it is the difference between a ratchet that stops a
   breach and one that shows a trend.

**Nothing is written to [wiki/work/TECH_DEBT.md](../TECH_DEBT.md) by this refine**, which was scoped
to author this document only. Findings 1 and 3's prevention instalment are **required of this
milestone**; finding 2 needs no action beyond finding 1; **findings 4 and 5 are NEW entries that have
not been filed, and their text above is paste-ready as items 36 and 37** (item 35 is the highest in
use), with **finding 6 folded into item 36 as its second instance**. Finding 7 is a convention this
log adopts rather than an entry. A debt finding that lives only in an architecture document is a
finding the operator cannot schedule — filing those two is a real outstanding action, not a
formality.

**One thing the PO is filing that this refine does NOT claim as its own:** the **eleven** further
unescaped `animate-pulse` sites QA found across `ui/` (`Shell.tsx:458,596,597`, `BoardLanes.tsx:245`,
`DetailPanel.tsx:838`, `AssignmentChip.tsx:136`, `BoardDrillIn.tsx:78`, `PageStates.tsx:44,45`,
`SlotAids.tsx:81`). Story 06's scope discipline correctly excludes those files — **and the CSS-block
mechanism §Fitness functions rules fixes all twelve without opening any of them.** That is not scope
creep and the distinction is worth keeping straight: the discipline is about which files a diff
touches, and a one-rule escape touches `index.css` alone. The debt entry should record that the sites
are *covered* by the mechanism while the per-site markup is still un-audited — covered is not the
same as reviewed.

---

## Story-boundary guidance (input to the PO's break-down — not a partition)

Boundaries are drawn with the PO. These are the seams the ADRs create, with the graph-measured
coupling that decides them.

**Three seams are fully independent of the `ui/` work and of each other** — none has an edge to any
`ui/` file, and each ships something alone:

- **The `code`/`needs-input` wire hop (ADR-004)** — `src/global-mesh-query.mjs` (← 13) plus one line
  of `ui/src/fleet/api.ts`. Purely additive, "absent, not false", and it delivers value to the
  EXISTING fleet card the moment it lands, before the home exists. **First, parallel-eligible.**
  Note it does NOT touch `src/assignment-record.mjs` (← **38**, a god-node) — the mapper already
  carries the field, which is what makes this a three-line change instead of a migration.
- **The bundled Claude session hooks (ADR-005)** — `src/bundle/bundle.json` + three hook files. Zero
  code edges (the graph does not carry JSON at all — asserted from reading, and said so).
  **Parallel-eligible in BUILD, but STRICTLY LAST TO LAND** — see the ordering constraint below,
  which is the one hard sequencing rule in this milestone.
- **The repo-dedupe commit (ADR-010)** — `ui/src/fleet/runs.mjs` (← 7, → 0),
  `app/desktop/crates/core/src/status.rs`, `view_model.rs` (← 1), and the fixture. It is the only
  story touching Rust and the only one touching `ui/src/fleet/`. **Fully independent; it could ship
  first or last and nothing in the home depends on it.**

**On the `ui/` side the blast radius is genuinely tiny and closed**, so the cuts are about SEQUENCING
rather than reach. `Landing.tsx` has **one** importer; `Shell.tsx` has **four** (one of them
production); `TerminalControl.tsx` has **two**; the whole `ui/src/terminal/` core is imported only by
its own component, the two mount modules and their tests.

- **The home's `.mjs` set is a leaf and is fully testable before anything renders it** — the mount
  producer, the feed axis, the subscription arbiter, the layout composer. It can land, be exercised
  exhaustively by `node:test`, and be imported by nothing. **A good cut, the same shape m45/ADR-001
  used for its route module and m46 used for its shared core.**
- **The route switch (ADR-001) is separable and tiny** — `main.tsx`, `entry.mjs`'s
  `SHELL_RENDERED_ROUTES`, `Shell.tsx`'s branch, delete `Landing.tsx`. It touches three
  high-symbolic-weight files with small diffs and is worth reviewing as a shell edit, exactly as m46
  reviewed its dock-host story that way. It can land **before** the grid exists if the home renders
  a minimal surface — but see the bad cut below.

**THE BAD CUTS, named because they are the tempting ones.**

- **BAD CUT 1 — landing the session hooks (ADR-005) early, "because it is independent and it makes
  the grid populated for the other stories to test against."** It is independent, and it is the one
  ordering that makes the product *measurably worse*: every session it newly records is a free
  session, which by ADR-003's arithmetic is `no-producer` — so an empty grid becomes a grid full of
  panes that will never receive a byte. Landed before the feed axis, the milestone's own demo shows
  the failure it was built to prevent. **The hooks land after ADR-003's honest rendering, or they do
  not land in this milestone.**
- **BAD CUT 2 — a story whose whole subject is "amend the arch test", landing separately from the
  home's mount module.** STATE asks for the amendment to have *its own reviewable boundary*, and it
  is right; it is wrong if that is read as its own DIFF. Part 1's new surface→posture-home table
  NAMES `ui/src/home/session-mount.mjs` and the amended gate IMPORTS it — so before the module
  exists CI is red for a whole story, and after the module exists but before the table is updated CI
  is **green and vacuous about the new interactive surface**, which is the dangerous one and is this
  gate's own recorded history. **The amendment and the mount module are ONE story**, whose subject is
  the amendment; the module is what makes it assertable.
- **BAD CUT 3 — splitting "the grid renders rows" from "panes open sockets".** It is the natural
  vertical/horizontal split and it re-creates TECH_DEBT 29 exactly: a surface whose components are
  only ever driven with the terminal stubbed. m46 shipped its headline connecting to nothing past
  537 green tests, a 71-mutant battery and five reviews, because every harness stubbed
  `TerminalControl`. **The story that mounts the pane must also prove a socket is constructed to the
  composed URL**, through `test/support/terminal-control-harness.mjs` — the harness TECH_DEBT 29
  built for precisely this, with opt-in host refs.

  > **AMENDED 2026-08-13 — the PO's story 08 (`the harness can drive a grid`) is the RIGHT cut, and it
  > sharpens this paragraph rather than contradicting it.** The developer's feasibility pass measured
  > story 05 as not buildable as written — *"the harness is the story"* — with six of eight blockers
  > being harness capability rather than grid logic: `withTerminalControl` mounts exactly ONE control
  > with a hard-coded entry, `hasShellHost()` is false in the harness bundle so **every expand
  > scenario in the milestone is unreachable**, the DOM stand-in's `focus()` is a no-op with no
  > `activeElement` and no key dispatch, and `withMountedApp` binds no refs.
  >
  > **That is not the bad cut above; it is its opposite, and the distinction is worth stating because
  > the two look alike.** Bad cut 3 is splitting the PRODUCT so one half is only ever tested against a
  > stub. Story 08 splits the INSTRUMENT from the product so the product's half can be tested at all.
  > The rule that separates them: **a cut is bad when it lets a story ship its subject unexercised;
  > it is good when it is the precondition for exercising it.** Story 08 is squarely the second.
  >
  > **Three consequences for the boundary that are mine to state:**
  > 1. **It goes FIRST, and everything with a rendered pane depends on it** — 05 by the PO's ruling,
  >    and in practice also the amendment story (ADR-008's behavioural row drives a real mount), the
  >    fourth-host story (ADR-007's `Enter`-on-tile and byte-area-click need key dispatch and a real
  >    `activeElement`) and the cap story (ADR-006's no-demote invariant is a headless `.mjs` proof,
  >    but the *observable* — a held tile that says why — is a rendered one).
  > 2. **`hasShellHost()` being false in the harness is the single highest-value line item in it**,
  >    and it is worth naming separately from the rest: it does not weaken one scenario, it makes
  >    **every fullscreen/expand scenario in the milestone unreachable** — which is precisely the
  >    shape TECH_DEBT 29 describes (a green suite that never ran the code) and precisely what
  >    ADR-007's amendment (B)/(C) now depend on being provable.
  > 3. **It is TECH_DEBT 29's remedy FINISHED, and that should be recorded on the item rather than
  >    only in a story.** Item 29 says host refs are opt-in and the three app harnesses still stub
  >    `TerminalControl`; the honest reading of this milestone is that **the harness was built to the
  >    size of m46's problem — one control — and m49 is the first milestone to need many.** That is
  >    not a defect in m46's work; it is the ordinary way an instrument is outgrown, and the entry
  >    should say so when it is closed.
- **BAD CUT 4 — deferring the directory ratchet (`acd-ui-directory-budget`) to "a tidy-up story".**
  A ratchet authored after the diff it was meant to catch is a ratchet that ratifies the thing it was
  built to question. It lands with the story that creates `ui/src/home/`.

**Things that must land in ONE story or CI goes green and vacuous:**

- **The arch-test amendment + the home's mount module** (bad cut 2).
- **The dedupe rule + the Rust rule + the JS pin + the captured fixture** (ADR-010). Three of the
  four are enforced; the fourth is what makes the enforcement real, and m48's discharge condition
  says "one commit" for exactly this reason.
- **The route switch + the deletion of `Landing.tsx`.** Half-landed, `/` renders a placeholder while
  `SURFACES` claims a home, or two components both claim `/`. `surfaceMountFor`'s
  `shellRenders`/`known` pair makes the intermediate state *look* deliberate, which is what makes it
  dangerous.
- **The fourth host + the pane's posture derivation** (ADR-007). A host with no mount is an
  unreachable table; a mount naming an unknown host **fails closed to no affordances**
  ([host-model.mjs:144-152](../../../ui/src/terminal/host-model.mjs#L144)) — a pane with no controls
  at all, which reads as a rendering bug rather than as a missing table.

**The one cross-story dependency to watch:** everything in `ui/src/home/` waits on the home's `.mjs`
set, and nothing in `src/` waits on anything except the hooks' ordering constraint. The `.mjs` set
and the surface meet exactly once — at the point the `.tsx` is handed a mount, an origins object and
a subscribed set — and those three arguments are the whole interface between the two halves of this
milestone.

**Headroom to watch:** `Shell.tsx` has 23 lines of headroom and this milestone should come out
**net-negative** there; if the route-switch story does not, that is a signal the shell is absorbing
grid logic that belongs in `ui/src/home/`. `shell-layout.mjs` has 45 and this milestone must add
**zero** — a grid layout vocabulary appended there instead of owned by the home is the specific
failure item 33 predicts for m49 by name.
*(Both numbers are `wc -l`-era and are corrected to **9** and **44** by the fourth-batch amendment;
the direction of both instructions is unchanged and is now tighter, not looser.)*

**A CONSTRAINT STORY 03's BRIEF MUST CARRY, verbatim: `AMEND acd-home-pane-truth; do NOT author a
second gate.`** Story 03 delivers the fourth host, the mount's posture declaration and invariant 4's
amendment — three subjects that all belong to `acd-home-pane-truth`'s existing subject (*"the home's
structural truth about a pane"*). The failure mode is specific and cheap to reach: a builder writes
`test/arch/acd-home-posture-fails-closed.test.mjs` **beside** it, because a new file is easier than
an amendment and every gate in the repo stays green while they do it. **Nothing refuses that** —
`acd-test-suite-registration` would happily register the new file, which is the shape of the
problem: the only ratchet in this area rewards adding a gate and is silent about splitting one. Two
gates over one subject is this log's own duplicated-derivation defect wearing a fitness function's
clothes: the day one of them is re-aimed, the other keeps asserting the old shape, green, and the
red line a reviewer eventually reads names the wrong subject (which is exactly the argument
`acd-terminal-output-signal-source`'s own header makes for why it was SPLIT — one file, two
subjects, and the split was right there *because the subjects were genuinely two*; the home's are
one).

**AND A CHEAP RATCHET DOES EXIST — it is one named list, and story 03 is the right diff for it.**
The set of `test/arch/acd-home-*.test.mjs` files becomes a NAMED, shrink-only list of exactly the
three this milestone delivers — `acd-home-pane-truth`, `acd-home-socket-cap-single-arbiter`,
`acd-home-layout-is-a-filter` — asserted in both directions (a **fourth** file fails; a **named file
that no longer exists** fails, so the list cannot rot into a permission slip). It is the identical
technique this milestone already uses twice, at `FLEET_TO_BOARD_BASELINE` and at the new
`HOME_TO_SURFACE_BASELINE`, applied to gate FILES instead of import specifiers, and its refusal text
is the whole point: *"this subject already has a gate — amend it. A second gate over one directory is
two homes for one invariant, and the ADR names which one owns it."*
- **It is scoped by PREFIX, deliberately, and NOT by a count over `test/arch/`.** A blanket ceiling
  on the arch directory would punish new gates, and new gates are the good outcome — this ratchet
  must fire on *splitting a subject*, never on *covering a new one*.
- **I have NOT landed it, and the reason is ownership rather than doubt:** it belongs in
  `acd-home-pane-truth.test.mjs` (the gate that owns the subject), which the developer holds this
  hour for story 02's fixes, and its list is only final once story 03 has named its own files. Story
  03 lands it, in the same diff as the amendment it exists to force.
