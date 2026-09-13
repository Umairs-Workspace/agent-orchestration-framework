---
type: milestone
number: 49
slug: terminals-home
title: "The terminals home — every live session in the fleet, typeable, at /"
status: done
owner: product-owner
created: 2026-08-02
updated: 2026-08-13
depends: [44, 46, 48]
origin: ../../planning/PRD-web-ui-restructure.md
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 49 · The terminals home — every live session in the fleet, typeable, at `/`

## Objective

This is the milestone the arc exists for: invert the web UI's centre of gravity so the **live terminals
of the fleet** are the home screen. Today the one thing an operator actually watches — an agent working
— is buried two levels down as a per-card peek, and the home screen is a fleet-management page.

The model is [herdr](https://github.com/ogulcancelik/herdr)'s, and precisely that much: sessions are
**named, persistent and viewer-independent** (detach and reattach is normal); the surface is a **grid of
panes** you focus and rearrange; each pane advertises **agent state** so a fleet is scannable at a
glance; interaction is **both** keyboard and mouse. What is not adopted is herdr's Rust TUI, its socket
API, tmux prefix-key parity, or its plugin marketplace.

The screen answers, in one view: *what is every machine in my fleet doing right now, and let me get into
it.*

Origin: [PRD — Web UI Restructure](../../planning/PRD-web-ui-restructure.md), milestones
`terminals-home` **and** `interactive-terminals`, merged at shatter (operator decision, 2026-08-02).

**Why the merge, and what it changes.** The PRD frames interactivity as a separate milestone gated by a
spike, on the premise that typing into a terminal *reverses a load-bearing, test-enforced security
invariant*. Measured 2026-08-02, that reversal **already shipped**: m42 item 6 (2026-07-27,
operator-forced) built the browser→control→worker input path, and
[acd-fleet-terminal-mirror-read-only.test.mjs](../../../test/arch/) was deliberately rewritten as
[acd-fleet-terminal-input-constrained.test.mjs](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs),
which now pins the input path's **constrained shape** rather than its absence: one tuple-bound entry
seam that wraps bytes with the socket's own `(nodeId, sessionId)`, content-blind, bounded by
`MAX_TERMINAL_INPUT_BYTES`, session-exact delivery through the `liveSessionInputs` registry, and clean
degradation to output-only when no push route is configured. The board dock types on both lanes today.

So there is no invariant to reverse and no security question to spike — there is a **proven pattern to
extend to a second surface**. That makes read-only-then-interactive a needless two-step, and panes are
typeable from the start.

## Scope

In scope:

- **The grid at `/`** — a responsive grid of every live session across the fleet, each pane showing
  node, repo, work item (when there is one), agent state, and a live terminal.
- **Focus, expand, close** — keyboard and mouse both, with layout persisted per operator.
- **Agent state per pane** — blocked / working / done, so the fleet is scannable without reading output.
- **Typeable panes**, by extending m42's tuple-bound seam to this surface. The security properties are
  the existing ones and are not renegotiated: entry stays content-blind and byte-bounded, delivery stays
  session-exact, and a pane can only ever type into the session its own socket names.
- **Invariant 4 of `acd-fleet-terminal-input-constrained` amended, deliberately and in one place.** That
  invariant currently reads "THE FLEET PAGE STAYS A MONITOR — the interactive surface is the BOARD DOCK",
  and it is true today — the fleet declares `POSTURE_READ_ONLY` as a literal in
  [ui/src/fleet/terminal-mount.mjs](../../../ui/src/fleet/terminal-mount.mjs), and the policy turns that
  into `disableStdin: true` with no `onData` sink registered at all. This milestone makes the fleet
  origin an interactive surface, so that invariant must be rewritten — not deleted, and not quietly
  broken. The other three invariants survive unchanged; the amendment is the narrow one.
  <!-- POINTER CORRECTED at refine, 2026-08-13. This clause cited
  `ui/src/fleet/terminal-view/FleetTerminalView.tsx:170`, a path milestone 46 DELETED when it unified the
  two terminal components. The invariant it described is unchanged and still true; only the evidence
  moved, and it moved to the mount module — which is exactly the file this milestone flips. Re-cited by
  construct rather than by line, because line anchors in this arc have now rotted four times. -->
- **An explicit read-only fallback.** A session that cannot accept input renders as **labelled**
  read-only, never as a pane that silently swallows keystrokes.
- **A bounded live-socket count.** How many panes hold live sockets at once is an explicit, configured
  number, not an emergent one — herdr's grid assumes a handful of panes and a real fleet may not be.
- **Honest empty and degraded states.** No live sessions, a node unreachable, a session that ended
  mid-view, and (per spike 44) a pane whose origin cannot be reached — each says what is true.

Out of scope:

- **Spawning sessions.** The "new session" verb is milestone 50; this screen renders what already exists.
- **Absorbing the board.** Boards stay per-workspace on their own origin with their own route. The
  terminals home links to them; it does not swallow them.
- **Multi-user auth, accounts or RBAC.** The posture stays single-operator over the existing mesh
  credential. The interactive path is gated by that credential, not by a new user system.
- **Scrollback persistence and session replay.** A durable transcript store is a separate observability
  arc. <!-- CORRECTED at refine, 2026-08-13 (architect, measured). This bullet's original premise — "a
  browser that subscribes late sees an empty pane, and that is ADR-014's design" — was ALREADY FALSE when
  SPEC was framed: the mirror's bounded replay-on-subscribe landed 2026-07-25 as VERIFICATION F-38.06g
  (`src/mesh-terminal-mirror.mjs`, `MAX_TAIL_BYTES_PER_KEY` / `MAX_TAIL_KEYS`). A late subscriber gets a
  bounded tail, not nothing. The SCOPE decision below is unchanged and still right; only its stated
  reason was wrong — and it mattered, because that replay burst is the largest term in ADR-006's
  socket-ceiling argument. Third stale-premise inheritance in this arc; see STATE §Feedback. -->
- **Stall detection and recovery.** A per-pane idle watchdog with a nudge/restart control is the natural
  next feature here and is deliberately a separate run-resilience arc — it has to decide what "stalled"
  means and what recovery is safe.
- **Widening the fleet face's write surface.** No new API mutation is added here; input rides the
  existing terminal-view socket upgrade. `/api/mesh/assign` remains the one route, and
  [acd-mesh-ui-write-isolation.test.mjs](../../../test/arch/acd-mesh-ui-write-isolation.test.mjs)
  stays green. <!-- CORRECTED at refine, 2026-08-13. This bullet named
  `test/mesh-ui-write-isolation-bounded.test.mjs`, which DOES NOT EXIST — spike 44 §Investigation
  measured that on 2026-08-06 and named the real gate; the dead reference was inherited here anyway (and
  is still carried by milestone 50's SPEC, which should be corrected when 50 is refined). -->

## Stories

Broken down 2026-08-13 (`aof:refine 49 --autonomous`). **Nine** stories — eight drawn at the break-down,
the ninth added by the developer's feasibility pass. Six are **fully independent**; the grid is the one
convergence point. Boundaries follow the
call/dependency coupling `aof graph impact` reports — see
[ARCHITECTURE §Story-boundary guidance](ARCHITECTURE.md), which also names the four bad cuts.

- [x] [00 · `needs-input` reaches the wire](stories/00_story_needs-input-on-the-wire/STORY.md) —
      the one hop that drops an already-produced fact. Independent; ships value to the existing fleet
      card before the home exists.
- [x] [01 · One repo, said once](stories/01_story_repo-said-once/STORY.md) — the `(session)` line's
      dedupe rule, JS + Rust + the fixture that gives the cross-language gate teeth, in one commit.
      Independent; discharges milestone 48's routed gap.
- [x] [02 · The home's pure core](stories/02_story_home-core/STORY.md) — the feed axis, the
      socket-cap arbiter and the layout filter as framework-free `.mjs`, exhaustively driven and
      imported by nothing. Creates `ui/src/home/`, and carries the directory ratchet.
- [x] [03 · The pane declares itself, and the gate says so](stories/03_story_pane-declaration-and-invariant-4/STORY.md) —
      the control's fourth host, the mount module, the posture derivation, **and** the invariant-4
      amendment. Depends on 02.
- [x] [04 · `/` becomes the terminals home](stories/04_story_route-becomes-the-home/STORY.md) — the
      route switch, the page's own states, and the deletion of `Landing.tsx`. Depends on 02.
- [x] [05 · The grid of live panes](stories/05_story_grid-of-live-panes/STORY.md) — the milestone's
      heart: rows from the session index, panes that open real sockets, honest feed states, the bounded
      cap, focus, and expand. Depends on 02, 03, 04 **and 08**.
- [x] [06 · The pulse honours reduced motion](stories/06_story_pulse-honours-reduced-motion/STORY.md) —
      a shipped defect whose code comment claims the opposite. Independent.
- [x] [07 · Claude sessions reach the index](stories/07_story_claude-session-hooks/STORY.md) — the
      bundled hooks without which the grid is empty in every workspace but this one. Independent to
      build, **strictly last to land**.
- [x] [08 · The harness can drive a grid](stories/08_story_harness-can-drive-a-grid/STORY.md) — N
      controls, a real shell, a real focus model, real keystrokes. Independent; **story 05 cannot be
      proven without it.** Added after the developer's feasibility pass measured story 05 as *not
      buildable as written* — six of its eight blockers were harness capability, not grid logic.

**"Independent" means no logical dependency — it does NOT mean conflict-free in the working tree.**
Measured at the feasibility pass, and worth knowing before two of these are handed out at once:
stories **05 and 06 both edit `ui/src/terminal/TerminalIdentity.tsx`**; **four** stories all register
suites in `scripts/test.mjs`; story 02's `ui/src/home/` directory ceiling goes red in story 03 (by
design — that is the ratchet working); and **milestone 47's and 48's uncommitted work is dirty in every
file stories 00, 01, 04 and 05 must edit**, including `Shell.tsx`, `fleet/api.ts`, `fleet/runs.mjs`,
`view_model.rs`, `acd-captured-producer-fixture.test.mjs` and three test harnesses. Sequence the merges;
do not assume the parallelism is free at the file level.

**The one hard ordering rule:** story 07 lands *after* story 05. Every session it newly records is a
free session with no producer feeding it, so landing it first turns an empty grid into a grid full of
panes that will never receive a byte — the milestone demonstrating the failure it exists to prevent
(ARCHITECTURE §Story-boundary guidance, bad cut 1).

## Accept decision

**ACCEPTED 2026-08-13** at `aof:verify 49`, with the operator's `@uat` sign-off recorded in
[VERIFICATION §User sign-off](VERIFICATION.md). All nine stories are `done`.

The gate: `aof work validate 49` **PASS**; the acceptance sweep **292 suites / 1,541 passed**;
`tsc -b ui --force` exit 0; `cargo test` 85/0; design conformance **CONFORMS on six of seven render
targets**. **No blocker finding is open.**

Five test lanes are red at HEAD and **every one is attributed to a commit outside this milestone** —
two to m46's own merge, one to m43, and two to chore 51, which was accepted over them because a
chore's close criterion runs `aof work validate` and `aof work validate` has never run a fitness
function. All five are ledgered on [TECH_DEBT](../TECH_DEBT.md) item 27, now at nine.

**Three things are deliberately deferred, each carrying a written rule rather than a note** — DESIGN's
rewritten **R-2** (the node card's work line wraps at seven repos instead of yielding whole names into
`+<N> more`), the **shared top anchor** for the four page states, and story 06's **OS-level
reduced-motion lane**, whose two blockers are environmental rather than properties of the delivered
code. They are marked ruled-but-unbuilt in DESIGN, so the next author meets the rule and not the
shipped behaviour, and they are carried as open gaps in [OUTCOME.md](OUTCOME.md).

What the milestone now delivers is [OUTCOME.md](OUTCOME.md); how execution actually went is
[RETROSPECTIVE.md](RETROSPECTIVE.md), whose fifteen lessons are ingested into memory.

## Dependencies

- **44 · spike: terminal-origin-boundary** — this screen must know where it is served and what a pane
  renders when its origin is unreachable. The spike's finding on the local-PTY path decides whether a
  board session can appear in this grid at all.
- **46 · terminal-control-unification** — each pane is an instance of the one control. Building the grid
  against two implementations would re-create the duplication 46 removes.
- **48 · fleet-session-identity** — the hard gate. Without a routable `(nodeId, sessionId)` for sessions
  that have no assignment, this screen can *render* `working · <repo>` and cannot open a terminal on it.
  There is no version of this milestone that ships before 48.
