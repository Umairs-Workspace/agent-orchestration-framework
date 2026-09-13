---
type: story
number: 02
slug: terminal-origin-seam
title: "A terminal surface is handed an origin, never a port — the board learns the fleet's origin as a served fact down the seam the fleet already owns, and standalone resolves its own default in the command layer"
parent: 46
status: done
owner: product-owner
created: 2026-08-08
updated: 2026-08-08
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · The origin seam — the server half of retiring `FLEET_PORT`

## User story

As the operator running this product on whatever ports were free,
I want a terminal to reach the other server because it was **told** where that server is,
so that a board and a fleet started on non-default ports still talk to each other, and a hard-coded
`4181` in a browser component stops being the thing that decides whether my terminal connects.

Spike 44's finding is that the browser keeps dialling **directly** — the relay is not the answer, and
a relayed local PTY is structurally impossible and must not be built. What changes is not the socket
but the *port*: today the boundary is crossed by a constant pointing the wrong way
(`FLEET_PORT = 4181`, [TerminalDock.tsx:78](../../../../../ui/src/board/TerminalDock.tsx#L78),
[:440](../../../../../ui/src/board/TerminalDock.tsx#L440)). After this story **each side learns the
other's origin as a served fact**, and no terminal surface holds a port literal.

This story builds the **server half only** — the fact, served. Nothing reads it yet, and that is
deliberate: a route nobody calls is a zero-blast-radius stage, the shape milestone 45 used for its route
module. Story `46/04` is the reader.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_the-board-is-handed-the-fleet-origin.feature`
- [ ] `tasks/01_standalone-resolves-its-own-default.feature`

## Notes

**Order.** Depends on nothing. **`46/04` depends on this** — the control is handed `{ origins }`, and
that single argument is the whole interface between the two halves of this milestone
([ARCHITECTURE §Story-boundary guidance](../../ARCHITECTURE.md)).

**Governing ADR: [ADR-004](../../ARCHITECTURE.md).** Two clauses this story must honour to the letter:

1. **The board learns the fleet origin down the seam the fleet already owns.** The fleet process is the
   thing that *launches* the board — `boardUrlForWorkspace` → `serveBoard`
   ([mesh-ui-serve.mjs:781-786](../../../../../src/mesh-ui-serve.mjs#L781-L786)), memoised per
   `workspaceId`. The origin rides down that existing call as one additive argument. No new discovery
   mechanism, no new route, and nothing added to the fleet face's mutation surface.
2. **The standalone default is resolved in the COMMAND layer, never by importing the fleet server into
   the board server.** `DEFAULT_MESH_UI_PORT` lives inside `mesh-ui-serve.mjs`
   ([:116](../../../../../src/mesh-ui-serve.mjs#L116)); importing a server to read a number is the cycle
   ADR-004 explicitly routes around. When the board is started by `aof work ui` with no fleet in the
   picture, the command resolves the configured/default origin and passes it in.

**The blast radius is one additive argument on a file with 23 dependents.**
`src/mesh-ui-serve.mjs` is the most-depended-on module this milestone touches, and the dependents are
overwhelmingly arch tests that do not exercise `boardUrlForWorkspace`. Verify that at the source rather
than assuming it — a green focused run is not a green suite.

**Not in scope, and both belong to milestone 49:** adding the board origin as a first-class field on
`GET /api/mesh/board-url`'s JSON body (spike 44 sub-question 1 — that route's *consumer* is 49's grid),
and copying `assign`'s `workspace-not-local` guard onto `board-url`
([mesh-ui-serve.mjs:439-440](../../../../../src/mesh-ui-serve.mjs#L439), spike 44 sub-question 5). This
story serves the **fleet** origin **to the board**; 49 serves the **board** origin **to the fleet** for
a grid of panes. Do not fold 49's half in — it needs a reachability guard this story has no reason to
build.

### PO rulings, 2026-08-08 (from QA's contract pass)

**This story also writes the gate ADR-004's cycle prohibition never had (QA F-46.02-4).** ADR-004
forbids `src/board-serve.mjs` / `src/setup-ui.mjs` from importing `src/mesh-ui-serve.mjs` — and
**nothing catches it today.** `acd-command-layer-imports-downward` covers only `commands/` ↔ `src/*.mjs`;
`acd-work-ui-no-core-import.test.mjs` forbids only work-core/`commands/` imports into `setup-ui.mjs`;
and `acd-terminal-origin-not-port` (written by `46/03`) is scoped to `ui/src`. A prohibition honoured
only by memory is not a prohibition — it lands here, in the story that creates the temptation, because
the risk is a `src/` import edge and has nothing to do with the browser set.

**The `source` enum takes a third value (QA F-46.02-1).** `"launcher" | "default"` cannot describe a
board nobody handed an origin to and whose command layer was never in the picture — the case six
existing suites and two production callers already produce. Neither existing word is honest for it, and
the build must not settle it by typing whichever comes first. **Ruling: a third value meaning
`no origin was established`, carried with `fleetOrigin: null` — explicitly null, never `undefined`,
never the string `"undefined"`, never `""`, and never a fabricated `4181`.** Reversible in one word; the
point is that the third case is *named* rather than smuggled into one of the other two.

**`source` for an explicitly configured origin is `"default"` (QA F-46.02-2)** — the pair answers
"told by the launcher, or resolved locally", and a configured value is resolved locally. Ratified as QA
read it.

**Malformed configuration refuses by name; empty falls back silently (QA F-46.02-3).** A bare port
(`4181`, `127.0.0.1:4181`), a path, a query, or a `ws:`/`wss:` scheme is **refused with its reason** —
accepting a bare port re-creates `FLEET_PORT` one layer down, `new URL(x).origin` would silently discard
a typed path, and accepting a socket scheme hands the URL builder two inputs for one decision. Empty or
whitespace is **absence, not a bad value**, and falls back. Ratified as QA read it.

**THE CONFIG CARRIER DOES NOT EXIST AND IS UNCOSTED WORK — decide it at kickoff, before coding**
(developer feasibility finding F6). This is the grind hiding inside "an explicit configuration overrides
the default". Measured: `src/commands/work-ui.mjs` declares `workspace: false` ([:88](../../../../../src/commands/work-ui.mjs#L88))
and `resolveBoardLaunchConfig` ([:23-28](../../../../../src/commands/work-ui.mjs#L23-L28)) reads only
`--port` and `--target`. **There is no config-reading path in `work:ui` at all today** — yet task 01
requires an explicit fleet-origin configuration across eight rows *and* a named refusal with a non-zero
exit across six malformed values. A flag, a config key, or both? If it is a config key, the command must
grow a workspace read it deliberately does not have — which is a real decision with its own blast
radius, not a detail. **Settle the carrier at story kickoff and write it down**; discovering it
mid-build is how a 1.5-day story becomes a 3-day one.

**Pick ONE home for the served fact at kickoff** (developer finding F7). ADR-004 threads the origin
`serveBoard → serveSetupUi → handleWorkApi` and describes "a named board route beside the others" in
`board-ui.mjs` — but `handleWorkApi` returns `false` for anything outside `/api/work`
([board-ui.mjs:42](../../../../../src/board-ui.mjs#L42)), while task 00 pins the route's non-GET
behaviour against `/api/capabilities`, which lives in [setup-ui.mjs:62](../../../../../src/setup-ui.mjs#L62).
**Both work** — an unmatched method falls through to setup-ui's `/api/` 404 either way — but the ADR and
the feature currently point at different files, and two homes is how this milestone's own subject matter
came to exist.

**Two citation corrections carried in from QA.** `assign`'s `workspace-not-local` guard is at
`mesh-ui-serve.mjs:439-440`, not `:423` (`:423` is a comment line) — the `:423` figure propagated from
spike 44 into ADR-004 and into this file's own "Not in scope" note below; milestone 49 should not chase
it. And `45/04`'s `00_servers-advertise-paths.feature:187` forecasts *"46 adds it"* about the `origin`
key on `board-url`; spike 44 §Outcome reassigns that to **49**. The assertion stays green; only its
comment is now wrong.

**One constraint that shaped every scenario, and it binds the build too:** no lane may bind a fixed
port. This machine's live daemons hold `:4181` and `:4182`, so a row starting a fleet on the documented
default would EADDRINUSE against the operator's own soak — and no assertion may claim "nothing is
listening there", because on this machine something is.

**Related debt, filed not fixed:** [TECH_DEBT 25](../../../TECH_DEBT.md) — the port map has four homes
and `serveBoard` defaults to `4178`, another server's port
([board-serve.mjs:48](../../../../../src/board-serve.mjs#L48)), masked only because every caller passes
one. ADR-004 deliberately does **not** add a fifth home; this story must not either.
