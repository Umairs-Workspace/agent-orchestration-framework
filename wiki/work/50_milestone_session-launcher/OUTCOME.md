# 50 · Session launcher — start a session on a node, bound to a repo — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The session-spawn wire kind

`kind:"session-spawn"` is a named directive on the mesh stream with its own frame builder, ack frame
and worker receive lane, carrying no lifecycle phase and no work item.

### A second named write route on the fleet face

`POST /api/mesh/session` accepts `{nodeId, workspaceId, itemRef?}` behind same-origin +
`application/json` admission, mints a `crypto.randomUUID()` session id and answers it in the 200; the
fleet face's write allowlist is exactly two named entries, and the two fitness functions that pin it
assert the count rather than a pattern.

### Cross-process dispatch over the shipped relay

The fleet face in `aof mesh ui` reaches the `directiveTargets` registry owned by `aof mesh serve`
over the existing loopback relay bridge; `session-spawn` is a third named lane on that bridge beside
`terminal-input` and `terminal-resume`.

### Worker-side PTY spawn and session registration

A worker receiving the directive opens a PTY in the chosen workspace — the operator's default shell,
not an assistant CLI — registers it through milestone 48's session index, bridges its output onto the
terminal frame producer, and tears it down on stop with no orphaned shell and no armed timer.

### A coded outcome lane for a spawn the 200 could not answer for

`GET /api/mesh/session-outcome?nodeId=&sessionId=` answers `{state, code, at}` for every tuple and
never a 404; a dispatch the router cannot route, or one that throws mid-send, becomes a synthesised
refusal on that same lane rather than a success.

### The new-session affordance on the terminals home

A `New session ▾` trigger sits in the surface slot at every breakpoint and opens a bounded panel with
Node / Repo / Item (optional); the picker annotates every node the payload carries and filters none,
and the route — not the picker — issues refusals.

### An operator-facing failure vocabulary owned by the browser

Fourteen refusal codes render as operator sentences from the UI's own `REFUSAL_MAP`, each naming the
machine the fault is about, with a stated fallback for a code the map does not know.

### `relaying` as the session record's seventh key

The session projection emits `relaying` on every live session as a strict `record.relaying === true`,
so a record written before the key existed projects `false` rather than absent.

## Assumptions

- **The control node is never its own dispatch target** — a spawn aimed at the control node answers
  `session-target-not-connected` by design; the picker still offers it, because a stated refusal is
  held to be better than silently dropping a machine the operator can see.
- **Connectivity is answered from the presence projection, not from the dispatch** — the route gates
  on `freshness === "live"`, so a node that drops between the check and the push never spawns and the
  failure surfaces as a session that never appears.
- **A launched session's `assistant` is a session-key label only** — it selects no binary, and a
  launched operator shell therefore carries whatever label the route defaulted.
- **The minted `sessionId` is control-side** — if `claude` starts inside the session, its own hook id
  replaces it later through the normal `pingSession` re-registration path.

## Gaps

### A launched session's tile, observed against a real launch (DG-50-1)

- **Status:** open
- **Discharge condition:** one live worker node on the fleet, a session launched onto it through
  `POST /api/mesh/session`, and render target R-H captured — a launched, streaming tile beside an
  assignment-owned one, sharing the chip vocabulary, both header controls on both, no `READ-ONLY`
  pill and no `no live output` on either.

DG-50-1 is the milestone's headline rule and no render has ever exercised it. At accept the fleet
carried no node able to host a launched session: the only presence-`live` node was the control node,
which is excluded by design, and both worker nodes were down (`umamis-msi-wsl` last seen
2026-08-11, `umamis-mac-mini` 2026-07-27). The success path is exercised in-process by story 03's 34
scenarios, which spawn real PTYs and write real session records; what is unobserved is the rendered
tile, not the spawn.

### DG-50-2, DG-50-3 and DG-50-7's close conditions

- **Status:** open
- **Discharge condition:** the R-C and R-D fixture frames supplied to a designer review — the four
  picker-degradation frames and the six outcome-state frames.

These three rules are carried only by fixture frames, which `DESIGN.md` states by name have no
production producer a reviewer can trigger by hand. No production render can close them, and their
absence is not a conformance failure.

### DG-50-6's stress frame

- **Status:** open
- **Discharge condition:** R-E captured at 390 beside the longest summary
  (`16 sessions · 16 live · 9 need input`) and with the trigger in its compact `· starting…` form,
  showing the summary truncating rather than wrapping and the bar holding on one y-band.

The 390 bar was verified to hold at the fleet's actual data (`1 session · 0 live`); the width at
which the rule was written to fail was not reachable from production data.

### The panel's internal scroll clamp

- **Status:** open
- **Discharge condition:** a frame at 760×520 with a node roster or outcome line long enough to
  exceed `max-height: 312px`, showing the overflow landing on the panel and not on the page.

The panel is bounded and carries `overflow-y: auto` with the clamp configured, and the page was
measured not to scroll; the clamp itself was never made to engage.
