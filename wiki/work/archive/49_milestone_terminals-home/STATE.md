---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 49 · The terminals home — State

> **COMPACTED AT ACCEPT, 2026-08-13.** The blow-by-blow is archived. Durable decisions live in
> [ARCHITECTURE.md](ARCHITECTURE.md)'s ten ADRs and its dated amendment ledger, and in
> [DESIGN.md](DESIGN.md)'s rules R-1…R-4; what the milestone now delivers is in
> [OUTCOME.md](OUTCOME.md); what was checked is in [VERIFICATION.md](VERIFICATION.md); and the
> `## Feedback (for retro)` notes have **graduated into** [RETROSPECTIVE.md](RETROSPECTIVE.md) as
> fifteen lessons and are archived here, exactly as durable decisions graduate into ADRs.

## Progress

**Framed 2026-08-02** (`aof:shatter wiki/planning/PRD-web-ui-restructure.md`) — the PRD's separate
`interactive-terminals` milestone folded in at the operator's decision, its premise (that typing
reverses a test-enforced invariant) measured false the same day.

**Refined 2026-08-13** (`aof:refine 49 --autonomous`) — RESEARCH + ARCHITECTURE (10 ADRs, amended in
three rounds, then twelve more at the contract pass) + DESIGN (10 design gaps) + `mocks/PROMPT.md` +
FEASIBILITY, broken into **nine** stories. The ninth was added *by* the feasibility pass, which
measured story 05 as not buildable as written — six of its eight blockers were harness capability
rather than grid logic, and story 08 now carries that work.

**Delivered and ACCEPTED 2026-08-13.** All nine stories done.

- [x] 00 · `needs-input` reaches the wire — 15/15 lanes, 96/96 fitness, proven by a 9-mutation matrix
- [x] 01 · One repo, said once — JS + Rust + the fixture that gives the cross-language gate teeth, in
      one commit (`ad1cf48`); `@manual` 4/4; `@uat` CONFORMS on six of six dedupe steps
- [x] 02 · The home's pure core — 271/0, a 20-mutation matrix, 12 review fixes
- [x] 03 · The pane declares itself, and the gate says so — invariant 4 amended and proven strictly
      stronger, the floor plant driven five ways
- [x] 04 · `/` becomes the terminals home — `Landing.tsx` gone, 0 occurrences in the served bundle;
      `@manual` 6/6 on the live build
- [x] 05 · The grid of live panes — 13 fixes; the socket proof is real and the cap holds
- [x] 06 · The pulse honours reduced motion — one CSS rule; `@manual` 3 of 4, the fourth deferred
- [x] 07 · Claude sessions reach the index — landed last, as ruled
- [x] 08 · The harness can drive a grid — TECH_DEBT 29's remedy finished

**At accept:** the acceptance sweep re-ran **292 suites / 1,541 passed** with five reds, every one
attributed to a commit outside this milestone; `tsc -b ui --force` exit 0; `cargo test` 85/0;
`aof work validate 49` **PASS**. The design-conformance verdict went **GAPS → six of seven render
targets CONFORM** across three judging passes, with the operator's `@uat` sign-off recorded.

## Durable decisions

These are the ones a later reader needs and cannot get from the ADRs alone.

- **The cap is 16, and it is argued from the right thing.** The premise that typing was gated behind
  a browser limit of ~6 sockets was **false and load-bearing** — measured headless, 255 concurrent
  sockets to one origin, the 256th refused. The "6" is HTTP/1.1's per-host cap and does not govern
  WebSocket upgrades. ADR-006 argues the ceiling from the mirror's replay burst, its 64-tuple LRU tail
  and main-thread contention, and says so in terms, so nobody re-derives it from a browser number.
- **The grid's content is producer-bound, and that reshaped the milestone.** A session reaches the
  index only if its workspace fires the session hooks; being in the index is not enough to *stream*,
  because `sendTerminalFrame` has exactly two call sites, both worker-execution. So a session can be
  addressable and permanently silent — ADR-003's feed axis renders that honestly, and story 07 landed
  **strictly last**, because hooks alone turn an empty grid into a grid of never-fed panes.
- **Two documented defaults, both deliberate absences:** free-session agent state is out (ADR-004 — the
  operator sees `needs input` on assignment-backed sessions and *nothing* on free ones, with no
  invented `working`/`done` and no "unknown" badge to train the eye to ignore), and `local-pty` panes
  are out (ADR-002 — so `/api/mesh/board-url` gains no `origin` field here).
- **The invariant-4 amendment did not get its own diff, against this document's own earlier framing
  note.** It lands *with* the home's mount module, because the amended gate imports it: before the
  module exists CI is red for a whole story; after the module exists but before the table is updated
  CI is **green and vacuous about the new interactive surface** — the more dangerous failure, and this
  gate's own recorded history.
- **DESIGN won both of its conflicts with the ADRs** — no eviction at the cap, and the grid order is
  `(nodeId, repo, sessionId)` — on the standing precedent that DESIGN owns what the operator reads.
- **Scope grew by two measured, shipped defects found while designing**, both confirmed at source: the
  pulsing dots did not honour `prefers-reduced-motion` while a code comment claimed they did, and
  `aria-live` was per-pane, so a grid of a dozen narrated the whole fleet.
- **Three deferrals carry written rules, not notes:** DESIGN's rewritten **R-2** (the node card's work
  line yields whole names into `+<N> more`, never a count), the **shared top anchor** for the four page
  states, and story 06's **OS-level reduced-motion lane**, whose blockers are environmental. Each is
  marked ruled-but-unbuilt in DESIGN so the next author meets the rule rather than the shipped
  behaviour.

## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` suite green — see [VERIFICATION §The acceptance sweep](VERIFICATION.md)
- [x] Fitness functions green — the whole `test/arch/**` set, swept rather than sampled
- [x] `@manual` driven against the live deployed build — see [VERIFICATION](VERIFICATION.md)
- [x] `@uat` signed off by the operator — see [VERIFICATION §User sign-off](VERIFICATION.md)
      <!-- POINTER CORRECTED at accept: this line read "see `UAT.md`", a file this milestone never
           had. Sign-off lives in VERIFICATION.md, which is where aof:verify writes it. -->

## Feedback (for retro)

**Archived at accept, 2026-08-13.** All fifteen notes have graduated into
[RETROSPECTIVE.md](RETROSPECTIVE.md) as lessons R1–R15, with the two destructive incidents (R1, R2),
the guard's wrapper hole (R3), the missing CI job (R4), the four-instance stale-premise family
(R5–R9), the scoped-correction defect found at accept (R10), the chore that closed green over a
fitness regression (R11), re-execution's two decisive catches (R12), and the three costs the
observability snapshot measured rather than guessed (R13–R15).
