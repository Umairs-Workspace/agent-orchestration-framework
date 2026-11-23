---
type: spike
number: 206
slug: azure-devops-work-items
title: "Can Azure DevOps hold aof's work-item tracking through az boards?"
status: done
owner: researcher
created: 2026-11-20
updated: 2026-11-23
depends: []
timebox: 2d
schema: 1
aofVersion: 0.1.0
---
# 206 · Can Azure DevOps hold aof's work-item tracking through az boards?

## Question

Can Azure DevOps, driven through the `az boards` CLI, hold the tracking half of aof's work items
(identity, title, status, parent, dependencies and order) well enough to sit behind the store
interface from 208? Or is a one-way mirror, the same shape as the Notion sync,
the right first step?

These sub-questions decide it:

1. **Mapping.** How do ACD's item types map onto a process template (Agile, Scrum, Basic)?
   Milestone, story and task map naturally. Chore, spike, uat and prototype don't. Can ACD's
   status lifecycle map onto each template's states without losing a legal move?
2. **Guarded writes.** Can `az boards work-item update` refuse a write when the item changed since
   it was read (the equivalent of `expectFrom`)? If not, does `az rest` with a JSON-patch `test` on
   `/rev` work, and at what cost?
3. **Listing and change detection.** What does a WIQL query cost for a stream the size of this
   repo's? How often can the loop poll it, and does a service hook or other push exist that the CLI
   can use?
4. **Auth.** Can `az` authenticate inside a daemon's own environment, with no login session, on
   macOS, Windows and WSL, and on every mesh node? This is the same kind of failure that hit
   `claude` auth on the Mac.
5. **Mirror or source of truth.** What does a team lose with a mirror, and what does a source of
   truth cost, given the answers above?

## Timebox

- Box: `2d` — stop and record the best-available finding at the boundary, timebox extension
  requires explicit re-scoping.

## Investigation

Measured on 2026-11-23 against a personal organization, `https://dev.azure.com/umair-butt`,
project "Umairs Homebase" (Agile, Git), from this MacBook with `az` 2.63.0 and the
`azure-devops` extension 1.0.2. Auth was `az login` with a personal Microsoft account, no personal
access token. The operator ruled PATs out.

The test stream matched this repo's size: 175 drivers as Features, 559 User Stories and 1,771 Tasks,
with parent links, a predecessor link on every tenth task and `StackRank` as stream order. It is
2,505 items in all, tagged `aof-spike-206`. They were seeded through the `$batch` endpoint in 70 s
(13 requests of 200) and never throttled.

**Mapping.** The process API (`_apis/work/processes`) lists each template's types and states:

| process | driver-capable types | states of a backlog item |
|---|---|---|
| Basic | Epic, Issue, Task | To Do, Doing, Done |
| Scrum | Epic, Feature, Product Backlog Item, Task | New, Approved, Committed, Done, Removed |
| Agile | Epic, Feature, User Story, Task | New, Active, Resolved, Closed, Removed |

Agile is the closest fit: `not-started` → New, `in-progress` → Active, `in-review` → Resolved,
`done` → Closed. None of the three templates has `blocked`. An inherited process fills the gap
through REST, with no `az boards` command for it. The probe created "AOF Agile spike 206", added a
custom `Spike` type (New, Active, Blocked, In Review, Closed), and added `Blocked` to User Story.
Process names refuse `()`, and a derived type needs an `icon`.

Azure DevOps enforces no lifecycle. On one item it allowed New → Closed directly and Closed → Active,
and it refused only a state name the type lacks (400).

**Guarded writes.** `az boards work-item update` has no precondition flag. A REST JSON-patch with a
`test` op works in both forms, `/rev` and `/fields/System.State`. A stale test returns
**412 Precondition Failed** (`VS403351`) and writes nothing. The state form is `expectFrom`'s
exact analogue.

A `$batch` is **not atomic**. In a two-op batch, the first op applied and the second was refused
with 412. A batch rejected as a whole (400 `VS403357`, duplicate temp ids) had already created one
item, #2.

**Listing and change detection** (2,505 items, HTTP from Python, best of runs):

| read | time |
|---|---|
| WIQL, ids only | 0.37–0.61 s |
| full snapshot: WIQL + 13 × `workitemsbatch` (id, rev, type, title, state, parent, rank, changed) | 5.7 s |
| every dependency edge: one WIQL link query (178 edges) | 0.39–0.52 s |
| poll, no change: WIQL `ChangedDate > watermark` with `timePrecision=true` | 0.18 s |
| poll, no change: reporting revisions feed from its continuation token | 0.17 s |
| a state change first visible to either poll | 0.2–0.5 s |

The rate-limit cost was 1.3 units over 22 read calls (max 0.11), against a published budget of
200 units per user per 5 minutes. A 5 s poll is under 2% of it.

`az boards query` **silently caps at 1,000 rows** and has no paging option. Service hooks exist
(21 consumers), but they push to a public HTTPS endpoint, which a daemon on a laptop cannot
receive. `az` has no hooks command.

Process cost: one `az` invocation takes 0.7–1.3 s, mostly CLI startup. The same HTTP call takes
0.2–0.3 s. `az account get-access-token` takes 0.65 s and returns a token valid for about 90 min.

**Auth.** Inside the extension, `az boards` / `az devops` reuse the `az login` token. Raw REST with
the same token (`az rest`, curl) is refused with 403
`InvalidUserState: NotMaterialized` until the request carries **`X-VSS-ForceMsaPassThrough: true`**,
the header the extension's SDK adds. The refusal applies to personal Microsoft account identities.

On macOS, `az` keeps its sign-in in `~/.azure/msal_token_cache.json` (mode 0600), not in the login
keychain. In a bare `env -i PATH=… HOME=…` environment, `az boards work-item show` and token minting
both succeeded. The SSH / no-login-session failure that hit `claude` does not apply.

## Finding

**Azure DevOps can hold aof's tracking as the source of truth. Nothing measured blocks it, but
209 must not be driven through `az boards`.** Use `az` as the auth broker: one
`az account get-access-token` per ~90 min, with HTTP calls made in-process. The CLI caps listing at
1,000 rows, cannot guard a write, cannot administer a process, and costs about a second per call.

| question | answer | confidence |
|---|---|---|
| 1 Mapping | Agile + an inherited process. Milestone → Feature, story → User Story, task → Task; chore, spike and uat as custom types; `blocked` as a custom state. aof keeps `ITEM_STATUS_EDGES` itself, because Azure DevOps permits any move, and reads a state outside the lifecycle as a record fault. | high on types and states (measured); medium on prototype's four states (not built, same mechanism) |
| 2 Guarded writes | REST JSON-patch `test` on `/fields/System.State` (or `/rev`), refused with 412, at one call, 0.2–0.3 s. A multi-item placement cannot be all-or-nothing. | high (measured) |
| 3 Listing and polling | Full snapshot 5.7 s at this repo's size; poll 0.17 s and nearly free on the rate budget, so a 5 s cadence is affordable. The revisions feed's continuation token fits 208/ADR-003's opaque change token. No push reaches a daemon on a laptop. | high (measured) |
| 4 Auth | `az login` works in a bare daemon environment on macOS, with no keychain. Raw REST needs `X-VSS-ForceMsaPassThrough` for personal Microsoft accounts. | high on macOS; **unmeasured** on Windows (DPAPI cache), WSL and other mesh nodes |
| 5 Mirror or source of truth | Source of truth. A mirror would not meet 209's objective (no second tracker), and every source-of-truth cost found has a bounded remedy (below). | medium: judgement over the measured costs |

**What a mirror loses.** The team cannot drive delivery from Azure DevOps: moving a card,
reordering the backlog or reparenting an item is ignored or overwritten. The repo stays the second
tracker that 209 exists to remove. A mirror is cheap, the same shape as the Notion sync: push only,
idempotent, no lifecycle, no polling. It answers visibility, not ownership.

**What a source of truth costs, and the remedy for each:**
- **Lifecycle is aof's alone.** Check edges before writing, guard the write with a `test` on state,
  and treat a web-UI move outside `ITEM_STATUS_EDGES` (for example Closed → Active) as a fault on
  read, never as silent truth.
- **Placement is not atomic.** This is cheaper than it looks. Azure DevOps ids never change, and
  order lives in `StackRank`, so insert and renumber are rank-only writes. A partial failure leaves
  ranks out of order, never identities wrong, and re-ranking is idempotent. 208/ADR-002's adapter
  owns that plan-then-apply.
- **Process setup is REST-only.** The inherited process needs a setup step (a verb or a documented
  procedure). Moving a project onto it is a one-time admin act.
- **Per-node auth.** Every mesh node runs its own `az login`. A preflight that mints a token in the
  daemon's own environment, the analogue of `daemon-claude-authenticated`, catches an expired sign-in
  before a run burns.

**Not measured, and carried to 209's refine:**
- `az` auth on Windows and WSL;
- refresh-token expiry under daemon use;
- whether an Entra-backed organization needs the pass-through header;
- a round trip of custom-type items after a project is switched onto the inherited process;
- transition-restriction rules as a server-side backstop;
- behaviour under real throttling;
- a current `az` (2.63.0 is from mid-2024).

**Left in the organization:** work items #1–#2507 tagged `aof-spike-206` (#2 is the stray left by
the rejected batch), and the process "AOF Agile spike 206", which is not attached to any project.

## Outcome / Next

**Unblocks 209 as a source-of-truth store, with its scope amended at refine:**
- the transport is HTTP, with `az` as the auth broker, not `az boards`;
- listing is WIQL + `workitemsbatch`;
- guarded writes are JSON-patch `test` ops;
- change detection polls the revisions feed;
- an inherited-process setup step;
- the auth preflight;
- the unmeasured items above as research.

No mirror integration replaces it.
