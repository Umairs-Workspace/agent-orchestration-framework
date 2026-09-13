---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: how did we decide to build it, and why that way?
  Owner: architect. A log of ADRs: numbered, IMMUTABLE, superseded-not-edited.
  Does NOT contain observable behaviour (→ task .feature files) — only the structure behind it.
-->
# 47 · /fleet with a repo filter — Architecture Decisions

> Inputs: `SPEC.md` (the fleet becomes `/fleet`'s owner and gains a repo/workspace filter applied to
> EVERY region — "a filter that narrows one region and not another is worse than none"; the filter is
> a URL deep-link that composes with `?scope=` rather than replacing it; an honest empty state and a
> visible "filtered by" chip, because "a filtered view that looks like an idle fleet is a bug"; the
> assign-row geometry contract kept intact, with the filter as *relief*; the `?scope=` question
> answered either way; explicitly OUT of scope — new fleet mutations, so
> `mesh-ui-read-only-contract.test.mjs` stays green untouched). `STATE.md` (the two INHERITED m45
> defects this milestone owns as the surface's new owner — F-45-04-1 **(a)** the local-board drill-in's
> relative `href="/board"` dead-ends on the fleet origin, **(b)** `BoardsRegion` is unreachable because
> the fleet face's payload carries no `boards`; "fixing (b) without (a) ships a visible broken link").
> No `DESIGN.md` / `RESEARCH.md` exists for this milestone yet. Every line number below was read at
> source on **2026-08-10**, at `d71d508`.
>
> **Memory recall.** `aof work memory recall … --area architecture --block` was run before each ADR
> below (seven recalls: the filter's home, server-vs-client narrowing, the URL/identity contract, the
> global-projection default, the boards producer, the board drill-in, the single-seam rule). Unlike
> m45's, these blocks came back **POPULATED**, and four surfaced near-misses are honoured or departed
> from — recorded in §Near-misses recall surfaced, at the end, rather than scattered.
>
> **Codebase-graph grounding.** `aof graph build .` was run over the PROJECT ROOT at this refine and
> reported **`unchanged: true`** — graphify rewrites only on a topology change, so the artifact is
> current, not stale: **9,200 nodes / 22,138 edges, `builtAt` `2026-08-10T12:50:26.790Z`,
> `backend: null`, `egress: "none"`**. `aof graph impact` was then read back per file. **No file under
> review reported `present: false`** — every one below is covered, so the coupling is ACTUAL, not
> inferred:
> - `ui/src/fleet/scope.mjs` ← **6** (`Fleet.tsx` + 5 suites) → **1** (`fleet/runs.mjs`). A low-fan-in
>   pure leaf — the cheapest correct home in this milestone's blast radius (ADR-001).
> - `ui/src/fleet/Fleet.tsx` ← **2** (`main.tsx`, `test/support/shell-fleet-entry.tsx`) → **14**.
> - `ui/src/app/routes.mjs` ← **9** (`Shell.tsx`, `entry.mjs`, `shell-nav.mjs`, `main.tsx` + 5 suites)
>   → **0**. The most expensive module in `ui/src/app` to touch — and per m45/ADR-006 it needs no touch
>   at all (ADR-003).
> - `ui/src/fleet/api.ts` ← **1** (`Fleet.tsx`) → **0**.
> - `src/mesh-ui-serve.mjs` ← **26** (`commands/mesh-ui.mjs`, `commands/work-ui.mjs` + 24 suites) → **12**.
>   Twenty-six dependents is the measured cost of a server-side filter parameter (ADR-002).
> - `src/global-mesh-query.mjs` ← **9** → **7**.
> - `ui/src/app/SurfaceSlot.tsx` ← **3** (`Board.tsx`, `Fleet.tsx`, `shell-harness-entry.tsx`) → **1**.
> - **`src/commands/mesh-identity.mjs`** (the `mesh:status` boards producer) ← **7**, and
>   `src/mesh-ui-serve.mjs` is **NOT among them**. That absence is load-bearing and decides ADR-006.
>
> The graph is advisory. Every boundary below is the architect's call.
>
> **Measured ground truth, read at source 2026-08-10.** Five measurements are load-bearing and each
> corrects or sharpens something a reader would otherwise assume:
> - **`filterToWorkspace` is DEAD CODE in production.** `ui/src/fleet/scope.mjs:162` exports it,
>   `scope.d.mts:44` types it, `test/fleet-scope.test.mjs:184,199` pins it — and **`Fleet.tsx` does not
>   import it** (its import list is `scope.mjs:28-40`; the name is absent). The client-side narrowing
>   this milestone needs already exists, is already tested, and has never rendered anything.
> - **The server's `?scope=local` narrowing and `filterToWorkspace` DISAGREE about nodes, on purpose,
>   and neither knew about the other.** `src/global-node-registry.mjs:170-172` says in terms *"nodes are
>   a MACHINE-WIDE fact: the roster is never workspace-filtered (a workspaceId scopes WORK ITEMS, not
>   the node roster)"*, and `test/arch/acd-mesh-ui-local-filter-preserves-status.test.mjs:94` pins it
>   behaviourally. `scope.mjs:168` filters nodes by `(node.workspaceIds ?? []).includes(workspaceId)`.
>   Two narrowings, one word, different answers (ADR-004 rules on it rather than letting one silently
>   "fix" the other).
> - **The fleet's LOCAL-shape branch has been unreachable since m34, and the source says so.**
>   `Fleet.tsx:96-98`'s `isGlobalStatus` narrows on `Array.isArray(status.workspaces)`;
>   `shapeGlobalStatus` (`src/global-mesh-query.mjs:269-291`) ALWAYS returns `workspaces`, for both
>   scopes. `Fleet.tsx:981-989` records the consequence in its own words: *"mesh-ui-serve.mjs serves
>   BOTH scopes from queryGlobalMeshStatus, so isGlobalStatus(status) is always true and
>   NodeCard/NodesRegion never mount there"*. `NodesRegion`, `NodeCard`, `PresenceDot`, `PresenceLabel`,
>   `livenessOf`, `BoardsRegion`, `BoardTile`, `boardRunState`, `RunStateChip` and `BoardDrillIn` —
>   `Fleet.tsx:1065-1310` and `:1403-1448`, ~250 lines — are all downstream of `Fleet.tsx:239-249`, the
>   branch that never runs.
> - **The fleet face is STRUCTURALLY BARRED from the boards producer.** `boardsProjection`
>   (`src/commands/mesh-identity.mjs:436-503`) reads the per-workspace GIT group registry via
>   `readRegistry(ws)`. `test/arch/acd-mesh-ui-no-core-import.test.mjs:67` forbids `mesh-ui-serve.mjs`
>   importing any `./commands/*` or `./mesh-registry.mjs`, and `:107-112` forbids it CALLING
>   `readRegistry(`. This is not a missing wire; it is a boundary three assertions hold (ADR-006).
> - **`repo` is the name m45 already wrote down, and it is free.** `ui/src/app/routes.mjs:126-128`
>   names *"milestone 47's future repo filter"* as the beneficiary of copy-and-delete, and
>   `test/arch/acd-route-logic-framework-free.test.mjs:136` already exercises the passthrough with the
>   literal `repo=aof`. A repo-wide grep finds **no** `repo=` or `workspace=` page-query key anywhere in
>   `ui/src` or `src` today, so the name is unclaimed (ADR-003).

---

## ADR-001: The repo filter EXTENDS `ui/src/fleet/scope.mjs`; there is NO sibling filter module. Every reader and writer of "narrowing" on this surface is enumerated here, and they all resolve to that one file plus its `.d.mts`

**Status:** Accepted
**Date:** 2026-08-10

**Context.** The house rule is written into the subject file's own header (`scope.mjs:1-6`): *"render-logic
node:test must exercise belongs in a plain .mjs helper the .tsx wires up, never inline JSX-only logic"* —
not a style preference but the only way UI logic is tested in this repo, which has no React harness
(m45/ADR-001 (1)). That settles WHERE the logic goes. It does not settle WHICH file, and "a new
`ui/src/fleet/repo-filter.mjs`" is the tidy-looking answer: it is small, it is new, it touches nothing.

It is also the shape this codebase keeps paying for. `scope.mjs` is already the home of the *narrowing*
concept — the URL round-trip, the local filter, the empty predicate, the empty copy. A second module
would not be a new concept; it would be **half of an existing one**, and the two halves would each own
a different half of the same question.

**The enumeration, because "one home" is a claim that has to be checked rather than asserted.** Every
reader and writer of narrowing on this surface, read at source:

| # | reader/writer | today | after |
|---|---|---|---|
| 1 | URL read | `scopeFromSearch` (`scope.mjs:50`) ← `Fleet.tsx:113` via `safeSearch()` (`:256`) | + `repoFromSearch`, same file, same shape |
| 2 | URL write | `withScopeParam` (`scope.mjs:42`) ← `Fleet.tsx:172` | + `withRepoParam`, same file, same shape |
| 3 | client narrowing | `filterToWorkspace` (`scope.mjs:162`) — **exported, typed, tested, and called by nothing** | the ONE production narrowing (ADR-002) |
| 4 | server narrowing | `mesh-ui-serve.mjs:556-557` → `queryGlobalMeshStatus({ workspaceId })` | UNCHANGED (ADR-002/005) |
| 5 | emptiness | `isEmptyStatus` (`scope.mjs:91`) ← `pageState` (`:65`) ← `Fleet.tsx:180` | evaluated on the NARROWED status (ADR-004) |
| 6 | empty copy | `emptyStateCopy(scope)` (`scope.mjs:104`) ← `Fleet.tsx:1518` | + the filtered case (ADR-007) |
| 7 | the "filtered by" line | inline JSX, `Fleet.tsx:442-446`, populated state ONLY | re-homed to the shell slot (ADR-007) |
| 8 | region fan-out | `GlobalScopeView` (`Fleet.tsx:428-454`) | the ONE narrowing seam (ADR-004) |
| 9 | the name-column drop | inline `nameDropped`, `Fleet.tsx:569` | a pure predicate beside its budget (ADR-008) |
| 10 | the type sidecar | `scope.d.mts` (`filterToWorkspace` at `:44`) | grows with 1–3, never a second sidecar |

Seven of the ten are already in `scope.mjs`. Two of the remaining three (7, 9) are inline JSX that the
house rule says should not be inline anyway. **A sibling module would move the count from "one home plus
three strays" to "two homes plus three strays", which is strictly worse.**

**Decision.**
- **`ui/src/fleet/scope.mjs` is the ONE home for the repo filter**, exactly as it is for `scope`
  (m45/ADR-006 pinned that in terms: *"`scope` keeps its existing ONE home in `ui/src/fleet/scope.mjs`"*).
  It gains `repoFromSearch(search)`, `withRepoParam(search, repo)` / the clear form, and takes ownership
  of `filterToWorkspace` as a live production export rather than a tested orphan.
- **NO `repo-filter.mjs`, no `fleet/filter/` directory, and no filter logic in `Fleet.tsx`.** The module
  stays framework-free — no React, no DOM, no `window`/`location` (its header's own rule, and the reason
  `test/fleet-scope.test.mjs` can drive it).
- **[Feasibility-2, 2026-08-10] "ONE HOME" MEANS ONE *LOGIC* HOME — a PRESENTATIONAL CHILD IS NOT A
  SECOND HOME, and the test for it is what a file EXPORTS, not what it is called.** This clause is folded
  in at the developer's feasibility pass, before anything has shipped, because the bullet above was read
  (correctly) as banning any fleet file NAMED for the filter — and that would forbid the very move
  `acd-ui-surface-file-budget` instructs an author to make: *"Extract the next region into a sibling
  component with a prop boundary."* Story 47/03 adds a control, a chip and an empty-state branch to a file
  with **13 lines of ratchet headroom**, so it is the story most likely to need `RepoPicker.tsx` or
  `FilterBanner.tsx` — and a rule that fails CI for doing the thing another rule demands is not a rule,
  it is a trap. The boundary, in three clauses, and the arch test asserts exactly these:
  1. **A DIRECTORY named for the concept is refused outright** — it declares a home by its name whatever
     it contains, which is why `fleet/filter/` is named above.
  2. **A LOGIC MODULE named for the concept is refused** — `.mjs`/`.mts`/`.ts`, i.e. where logic lives in
     this repo's pattern. `repo-filter.mjs` is a second logic home by construction; `RepoPicker.tsx` is
     not.
  3. **ANY file in the subtree that EXPORTS narrowing vocabulary is refused**, whatever it is called and
     wherever it sits. This is the clause that actually catches a second home, and it is what lets 1 and 2
     stay narrow.
  A presentational `.tsx` is **not required to import the one home**: a chip taking `{ name, onClear }` as
  props imports nothing and is the *better* shape — requiring the import would push state down into the
  leaf, which is the opposite of what this ADR is protecting.
- **`scope.d.mts` grows with it.** One module, one sidecar. A second `.d.mts` is a second home wearing a
  type hat.
- **The narrowing concept keeps ONE vocabulary.** The word for the fact is `workspaceId` everywhere
  inside the code (it is the wire's word and the store's word); `repo` is the word in the URL and in the
  UI, and the translation happens once, at the URL boundary, inside this module. Two names for one fact
  is what item 0.2 of TECH_DEBT is about; one name at each boundary with one documented crossing is not.
- **Graph-cited, as actual structure:** `scope.mjs` ← 6 → 1 versus `Fleet.tsx` ← 2 → **14**. Adding an
  export to a six-dependent pure leaf costs six readers that already import it; adding a fifteenth import
  to `Fleet.tsx` costs a file that is **1,547 of its 1,560-line ratchet** (`acd-ui-surface-file-budget`).
  The cheap edit and the correct edit are the same edit here, which is not always true and is worth
  noticing when it is.
- **The condition that would overturn this:** when the fleet's narrowing grows a second AXIS that is not
  a workspace — a node filter, a status filter, a time window — and the three axes need composing rules
  of their own. At that point the right move is **not** a sibling per axis but a single
  `fleet/narrowing.mjs` that owns the composition and to which `scope.mjs` delegates, and the deciding
  test is whether the composition rule has become the thing with the complexity. One axis plus `scope`
  (ADR-005) is not that.

**Consequences.**
- The filter's whole decision surface is drivable by `node:test` through the module
  `test/fleet-scope.test.mjs` already imports — no harness, no bundler, no new test-support file.
- `Fleet.tsx` gains wiring, not logic: two reads, one write, one narrowing call. That matters against
  its 13 lines of ratchet headroom (see §Codebase health).
- `acd-fleet-filter-single-home` fails CI if a second module under `ui/src/fleet/` names the `repo`
  query key, or if the narrowing gains a second call site.

---

## ADR-002: The narrowing is CLIENT-SIDE, over the payload the fleet already holds. `/api/mesh/status` gains NO parameter, `src/` is not edited by the filter at all, and the dead `filterToWorkspace` export is promoted to the ONE production narrowing

**Status:** Accepted
**Date:** 2026-08-10

**Context.** Both mechanisms already exist, and both already work. `queryGlobalMeshStatus({ workspaceId })`
(`src/global-mesh-query.mjs:43-76`) narrows server-side — it is how `?scope=local` is answered
(`mesh-ui-serve.mjs:556-564`). `filterToWorkspace(status, workspaceId)` (`scope.mjs:162-170`) narrows
client-side — and, measured, is called by nothing. So this is not "build one"; it is "choose which of two
built things the filter is, and say what happens to the other."

Four measurements decide it.

**(1) The filter switch is an interaction, not a page load.** The surface polls on `POLL_MS`
(`Fleet.tsx:156-159`) and re-fetches on every `scope` change (`:147-150`). A server-side filter makes the
filter a THIRD key on the same fetch effect: every filter change costs a round trip against the global
SQLite projection, and every poll re-sends it. Worse, `load({ silent })`'s keep-last-good idiom
(`:127-145`, *"a non-silent one flips the page into its loading state and UNMOUNTS the populated board"*)
means a filter change is either a full loading flash or a silent change with a visible lag between the
chip updating and the regions updating. A client-side filter is synchronous with the click, and the poll
loop is untouched.

**(2) A request parameter widens the server's ACCEPTED-INPUT surface, and that surface is deliberately
tiny.** `/api/mesh/status` today validates exactly one parameter and refuses everything else it does not
know by ignoring it: `mesh-ui-serve.mjs:543-547` rejects an unrecognised `?scope=` with a coded 400
`invalid-scope`. A `?repo=` parameter therefore needs its own validation branch, its own refusal code, a
decision about what an unknown workspace id means over the wire (400? empty 200?), and it inherits every
one of those decisions into a route that **26 modules depend on**. `test/arch/acd-mesh-ui-read-only.test.mjs`
and `test/mesh-ui-read-only-contract.test.mjs` are green today and SPEC requires them to stay green
untouched; the cheapest way to keep a promise like that is to make it structurally impossible to break,
not to remember it.

**(3) THE DECIDING MEASUREMENT: the two narrowings do not mean the same thing, and inheriting the
server's meaning would break SPEC's own rule.** `queryGlobalRegistry` never workspace-filters the node
roster — `src/global-node-registry.mjs:170-172` states the reason (*"nodes are a MACHINE-WIDE fact"*) and
`acd-mesh-ui-local-filter-preserves-status`'s behavioural half pins it (both `node-a` and `node-b` surface
under `--local`). A server-side repo filter would therefore return **every node in the mesh** under a repo
filter — which is precisely "a filter that narrows one region and not another", the thing SPEC says is
worse than no filter. To get the right answer server-side, `queryGlobalMeshStatus` would need a SECOND
narrowing mode distinct from the one `scope=local` uses, in a module nine other things depend on. The
client already has the right rule (`scope.mjs:168`, narrowing on `node.workspaceIds`).

**(4) The payload is already fetched in full, so client-side costs nothing extra.** `scope=global` is the
default (m34/ADR-006) and is what the desktop tray's compiled URL opens (`supervisor.rs:44`). The whole
machine-wide payload is on the client before the operator ever touches the filter.

**Decision.**
- **The repo filter is applied CLIENT-SIDE, by `filterToWorkspace`, over the payload already in hand.**
  No new fetch, no re-poll, no request parameter.
- **`filterToWorkspace` is promoted from tested-but-uncalled to the ONE production narrowing**, and it
  gains the completeness rule in ADR-004. Its existing behavioural pins in `test/fleet-scope.test.mjs`
  stop being a contract nothing honours.
- **`src/` is NOT edited by the filter.** `mesh-ui-serve.mjs`, `global-mesh-query.mjs` and
  `global-node-registry.mjs` are untouched by ADRs 001–005 and 007–008. This is stated as an *invariant of
  the milestone*, not an expectation: it is what makes SPEC's "no new fleet mutations / the read-only
  contract stays green untouched" a checkable claim rather than a hope, and it is what
  `acd-fleet-filter-read-only` asserts. (ADR-006 is the one ADR that MAY reach into `src/`, and it rules
  that it does not either.)
- **The OTHER narrowing — the server's `workspaceId` — is not deleted and not duplicated.** It stays
  exactly what it is: `scope=local`'s mechanism, owned by m34/ADR-006. ADR-005 rules on how the two
  compose. They are not two implementations of one filter; they are two different questions that happen
  to share a store column.
- **REJECTED: a `?repo=` request parameter on `/api/mesh/status`.** On (2) and (3) above — not on
  performance. It is the right answer for a payload that does not fit on the client, which this one does.
- **The condition that would overturn this, stated so a later author meets a decision rather than an
  omission:** when the machine-wide payload stops fitting the client comfortably — the honest trigger is a
  measured one, e.g. the `/api/mesh/status` body crossing single-digit megabytes or its parse blocking a
  frame at a realistic workspace count. At that point the parameter goes on the server **as an extension of
  the `workspaceId` option `queryGlobalMeshStatus` already takes** (never a second option beside it), the
  node-roster semantics of (3) are decided explicitly at that seam, and this ADR is superseded rather than
  quietly widened.

**Consequences.**
- The filter switch is instantaneous and survives a poll: the narrowing is re-applied to each new payload
  by the same seam (ADR-004), so a re-poll cannot leak an unfiltered frame.
- `acd-mesh-ui-read-only`, `mesh-ui-read-only-contract`, `acd-fleet-face-single-mutation-route` and
  `acd-mesh-ui-no-core-import` all stay green **without being edited**, because nothing they watch is
  touched.
- A stale client and a current server cannot disagree about the filter, because the server does not know
  about it.
- `acd-fleet-filter-read-only` fails CI if the fleet client mints a request carrying a repo parameter, or
  if `mesh-ui-serve.mjs` grows one.

---

## ADR-003: The URL contract is `?repo=<workspaceId>` — the STABLE OPAQUE id, never the mutable name or the machine-local path; ABSENT and MALFORMED are no filter, UNKNOWN filters to empty and SAYS SO, a repeat takes the FIRST; the write is `pushState`; and **`ui/src/app/routes.mjs` is not edited**

**Status:** Accepted
**Date:** 2026-08-10

**Context.** SPEC requires the filter to be "a deep-link, shareable and refresh-surviving". A shareable URL
has two properties that pull against each other: it must still MEAN the same thing tomorrow, and a human
should be able to read it. This ADR chooses stability over legibility in the URL and pays the legibility
back in the UI (ADR-007's chip), because the reverse trade — a readable URL that stops resolving when
someone renames their project — fails silently and at a distance.

**The parameter name.**
- **`repo`.** It is the operator's word (SPEC's own title is "repo filter", and so is the PRD's milestone
  id), it is short enough to read in a pasted link, and — measured — it is **the name m45 already wrote
  down**: `routes.mjs:126-128` names *"milestone 47's future repo filter"*, and
  `acd-route-logic-framework-free.test.mjs:136` already exercises the copy-and-delete passthrough with the
  literal `repo=aof`. Choosing any other spelling would falsify a committed test's own exemplar for taste.
- **REJECTED `workspace`** — accurate (it is the schema's noun) and therefore tempting, but it is the
  INTERNAL word; the URL is the operator's surface, and the internal word already appears in the value's
  identity, in the chip's tooltip and in every API this page calls. Two vocabularies at the same boundary.
- **REJECTED `ws`** — an abbreviation nobody can expand in a link pasted into a chat window, and it reads
  as "WebSocket" in a codebase that has three of them.

**The value's identity.**
- **`workspaceId`.** It is the key EVERY region's rows already carry (`GlobalWorkspace.workspaceId`,
  `GlobalWorkItem.workspaceId`, `GlobalNode.workspaceIds`), the key `filterToWorkspace` already matches on,
  the key `/api/mesh/board-url` takes (`mesh-ui-serve.mjs:315`), and the key `/api/mesh/assign` was made to
  REQUIRE by BLOCKER F21 for exactly this reason — a global face that resolves work by anything but the
  workspace id mis-targets on a ref collision. Using anything else here would make the filter the one thing
  on this surface that identifies a workspace differently from everything else on it.
- **REJECTED `name`** — `GlobalWorkspace.name` is `string | null` (`api.ts:97`) and is sourced from
  `config.name`, i.e. it is both **nullable and mutable**, and nothing enforces uniqueness across the mesh.
  A deep link built on it breaks on a rename, with no error — the workspace simply stops matching and the
  view goes empty. That is the exact failure class this repo pays for elsewhere.
- **REJECTED `projectRoot`** — an absolute filesystem path. It is machine-specific on a surface whose
  entire purpose is cross-machine, so a shared link would resolve on one node and not another; and it puts
  a local directory path into a URL people paste.
- **The cost is named rather than glossed: the id is opaque, so the URL is not human-readable.** That is
  what ADR-007's chip is for — it resolves the id to the workspace's NAME from the payload the page already
  holds. The URL is stable; the SCREEN is legible. Note this is not new vocabulary: `Fleet.tsx:442-446`
  already renders `Filtered to workspace <workspaceId>` today for `?scope=local`, raw id and all.

**Decision — the total rule set, because every one of these is a case an operator will actually produce.**

| input | behaviour | why |
|---|---|---|
| `repo` ABSENT | no filter; the page is byte-identical to today | the default must not change |
| `?repo=` / whitespace-only | treated as ABSENT — no filter, no error | a blank value is an operator artifact (a cleared control, a hand-edited URL); answering it with an error state on a page that has data is worse than showing the data |
| a value naming a workspace IN the payload | every region narrows to it (ADR-004) | the feature |
| a value naming NO workspace in the payload | **the filter IS applied — every region narrows to zero — AND the empty state names the requested value verbatim and offers one-click clear** | SPEC: "a filtered view that looks like an idle fleet is a bug". Silently ignoring it would render the WHOLE mesh under a filter chip, which is a lie the operator cannot see; a page-level error would claim the mesh is broken when it is fine |
| repeated `?repo=a&repo=b` | the FIRST wins | it is what `URLSearchParams.get` returns, and it is the rule `routes.mjs:133` already applies to a repeated `mode`. One rule for repeated keys across the app, not two |
| a value that is well-formed but not-yet-published | reads as UNKNOWN, above | "not published yet" and "no such workspace" are indistinguishable from the client, and the empty copy says which fact it is asserting (the payload does not carry it) rather than which it cannot know |

- **Unknown is decided against the PAYLOAD, never against a validator.** There is no id format to check
  (`workspaceIdFor` is a hash, and asserting its shape here would put a second copy of that rule in `ui/`).
  "Do any of the workspaces I was served carry this id" is the only question with an honest answer, and it
  is the same question the regions ask.
- **The write is `history.pushState`**, matching `onScopeChange` (`Fleet.tsx:169-177`) exactly. A filter
  change is a NAVIGATION the operator performed, and Back should undo it. This is deliberately DIFFERENT
  from m45/ADR-003's `replaceState`, and the difference is stated so the two are never conflated:
  `replaceState` there is a MACHINE rewrite of a legacy address the operator never chose, which must not
  add a history entry it would then bounce off.
- **Setting the filter to the value it already carries writes NOTHING** — no history entry, no re-render
  churn. Idempotence at the interaction level, not just the function level.
- **Clearing DELETES the key** rather than setting it empty, so the address bar never carries a naked
  `?repo=` — the same "an emptied query is the EMPTY string and never a bare `?`" discipline
  `routes.mjs:105-108` already applies one layer up.
- **`withRepoParam` is COPY-AND-SET, and `withScopeParam` stays copy-and-set** — each writes only its own
  key onto a copy of the incoming search, so writing one can never drop the other, and neither can drop a
  parameter this codebase has never heard of. This is m45/ADR-006's preserve-by-default mechanism applied
  one layer down, and it is what makes ADR-005's composition work without either control knowing about the
  other.
- **`ui/src/app/routes.mjs` IS NOT EDITED BY THIS MILESTONE, and that is pinned.** m45/ADR-006's
  copy-and-delete builder carries `repo` through for free, and the shell's nav already does the right thing
  without knowing the name: `shell-nav.mjs:161-169`'s href rule is POSITIONAL — the CURRENT route's item
  carries the current search and fragment byte-identically, every other item is its bare path, and its own
  comment says why (*"A rule that forwarded fleet parameters onto the board would require the shell to know
  which parameters belong to which surface — which is exactly what keeps milestone 47's repo filter local
  to the fleet"*). So `/fleet?repo=X` → clicking Board yields `/board`, correctly, with no special case
  anywhere. **No story in this milestone may touch `routes.mjs` or `shell-nav.mjs`** — graph-cited,
  `routes.mjs` has 9 dependents and 0 dependencies, which makes it the most expensive module here to touch
  and the one that needs no touching.

**Consequences.**
- `/fleet?repo=<id>` and `/fleet?scope=local&repo=<id>` are both deep-linkable, refresh-surviving and
  shareable across machines.
- A renamed project keeps its links working; a deleted one produces an honest, self-describing empty state
  instead of a blank page.
- The m45 invariant *"the route module names no query key but `mode`"* survives m47 **without a new test**:
  `acd-route-logic-framework-free`'s fifth assertion already makes exactly that claim, and writing a second
  file to re-assert it would be the duplicated-home shape these ADRs keep refusing. What IS new — and is
  therefore what gets asserted — is that the filter does not grow a SECOND home in the router or the shell
  (`acd-fleet-filter-single-home`'s sweep).

---

## ADR-004: EVERY REGION, OR NONE — the narrowing is applied ONCE, ABOVE the region fan-out, and no region component ever receives the un-narrowed status. A collection that carries workspace identity MUST be narrowed; one that carries none is DECLARED machine-wide, never silently passed through

**Status:** Accepted
**Date:** 2026-08-10

**Context.** SPEC states the rule and does not state the mechanism: *"A filter that narrows one region and
not another is worse than none."* Left as a per-region habit it fails the same way every such rule fails —
not in this milestone, where someone is thinking about it, but in the next one, when 49 or 50 adds a region
and its author has no reason to know the rule exists.

The surface's shape makes a structural answer cheap. `GlobalScopeView` (`Fleet.tsx:428-454`) is the SINGLE
place the payload fans out into regions — `WorkspacesSummary`, `MilestonesList`, `GlobalNodePanel`,
`DiagnosticsRegion` each receive their rows from it and from nowhere else, and each is a pure function of
its props.

And the completeness question is live rather than theoretical: `filterToWorkspace` narrows `workspaces`,
`items` and `nodes`, and **spreads everything else through unchanged** (`scope.mjs:164`). Today that is
harmless. The moment a collection is added to the payload it is silently exempt, and the failure is
invisible — a region rendering the whole mesh underneath a chip saying it is filtered.

**Decision.**
- **ONE SEAM. `<Fleet>` narrows the payload ONCE, before rendering, and hands `GlobalScopeView` an
  ALREADY-NARROWED status.** No region receives the raw payload; no region applies a filter of its own; the
  narrowing is not threaded down as a predicate for each region to remember to apply. A region cannot opt
  out by construction, and a NEW region added later is narrowed on the day it is added, without its author
  knowing this rule exists. That last property is the whole point.
- **The narrowing runs BEFORE `pageState`**, so `isEmptyStatus` (`scope.mjs:91`) evaluates the FILTERED
  payload. Otherwise the honest empty state of ADR-007 is not merely hard, it is unreachable — a filtered-to-
  zero view would render `GlobalScopeView` with four empty regions and no explanation.
- **The completeness rule, stated once so it is not re-decided per region:**
  1. **A collection whose rows carry a workspace identity MUST be narrowed by it.** `workspaces`
     (`workspaceId`), `items` (`workspaceId`).
  2. **A collection whose rows carry a workspace MEMBERSHIP list is narrowed by membership.** `nodes`
     (`workspaceIds`) — a node is in the filtered repo if it is a member of it.
     **This DIVERGES from the server's `?scope=local` semantics, deliberately, and the divergence is now a
     decision rather than an accident.** Under `scope=local` the roster stays machine-wide because "local"
     asks about the DAEMON's workspace and a roster is a machine fact (`global-node-registry.mjs:170-172`,
     pinned by `acd-mesh-ui-local-filter-preserves-status`). Under a REPO filter the operator asked *"which
     machines are working on this repo"*, and answering with every machine is not a filter. Both behaviours
     are pinned by tests; a later author must not "fix" one to match the other, and this paragraph is what
     they should find when they try.
  3. **A collection whose rows carry NEITHER is NOT silently passed through.** It is either (a) DECLARED
     machine-wide, at the seam, with the reason stated, and rendered with a visible marker saying it is not
     filtered; or (b) withheld from the filtered view entirely. Silent passthrough is banned because it
     produces SPEC's own defect from the other side: a region showing the whole mesh under a filter chip.
  4. **Scalars are not collections.** `scope`, `workspaceId`, `stalenessSeconds` ride through unchanged;
     they describe the response, not its rows.
- **`diagnostics` is ruled here rather than left to the story, because it is the only case-3 collection
  today and its answer is not obvious.** It is a compound: `skippedWorkspaces[]` and `projectionErrors[]`
  carry `workspaceId` and are therefore **case 1 — narrowed**; `projectedAt`, `databasePath` and
  `descriptorErrors[]` (whose rows carry a descriptor `path`, not a workspace) are **case 3(a) — machine-
  wide and declared**, because they describe the projection's own health, which has no per-repo meaning.
  The region says which of its numbers are filtered. That is one sentence of copy and it is the difference
  between a number an operator can act on and one they will misread.
- **REJECTED: narrowing inside each region component.** It is what the code would drift to naturally (each
  region already receives exactly the array it needs), and it is four copies of one rule with no shared
  home — TECH_DEBT item 0.2's shape, on the rule this milestone exists to establish.
- **REJECTED: a `filtered` boolean threaded to every region.** Same defect one step later: the regions
  would each decide what "filtered" means for their rows.
  [**CLARIFIED 2026-08-12 (F-47-04-ARCH-3) — THIS BULLET ONLY**; the original wording above is unedited and
  the rejection stands. The build threads `repoFiltered` and **that is not this bullet's subject**, so the
  distinction is recorded here rather than left for the next reviewer to re-litigate. Verified at source
  2026-08-12, all four levels: `Fleet()` derives it ONCE at the narrowing seam
  (`repoFiltered={repo != null}`, beside `asGlobalStatus(narrowed)`) → `GlobalScopeView` (prop) →
  `MilestonesList` (prop) → `GlobalMilestoneCard`, whose single consumer is
  `region5NameDropped({ assignment, workspaceName, repoFiltered })`. What this bullet forbids is a boolean
  that lets **each region decide what "filtered" means for its rows** — a NARROWING taken four times.
  `repoFiltered` narrows nothing, reaches no other region, and cannot: the payload arrived already narrowed
  at the one seam this ADR mandates, and `acd-fleet-filter-every-region` still holds every collection to it.
  It answers the one PRESENTATION question DG-47-2 sanctions — whether region 5's name column is repeating a
  string R0's banner already carries in full — and `GlobalScopeView`'s own prop comment says so at the
  declaration. **The test that separates the two: does the boolean change WHICH ROWS a region renders
  (forbidden), or only HOW ONE REGION SPELLS a row it was already given (permitted, and it needs an ADR
  clause like this one to stay legible)?** A second consumer of `repoFiltered` that answers "which rows"
  reopens this bullet at full strength.]
- **The condition that would overturn the single-seam rule:** a region whose narrowing genuinely cannot be
  expressed as a projection of the payload — one that must re-query, or apply a per-row rule the payload
  cannot express. That region does not get an exemption; it gets an ADR, and probably it gets its identity
  fixed at the producer instead (which is exactly what ADR-006 requires of any restored boards region).

**Consequences.**
- Adding a region to the fleet costs nothing to keep filtered, and costs a CI failure to leave unfiltered.
- The empty state and the chip can both be honest, because both read the same narrowed payload the regions
  do (ADR-007).
- A re-poll cannot leak an unfiltered frame: the seam runs on every render, over whatever payload is
  current.
- `acd-fleet-filter-every-region` fails CI when an array-typed collection is added to `GlobalMeshStatus`
  and is neither narrowed by `filterToWorkspace` nor placed on the declared machine-wide exemption list
  (empty today), and when the narrowing is applied anywhere other than the one seam.

---

## ADR-005: `?scope=` SURVIVES. `scope` and `repo` are DIFFERENT QUESTIONS and they COMPOSE BY INTERSECTION — scope narrows at the server, repo narrows the result at the client, neither overrides the other, and an empty intersection is a correct answer that says so. The retirement condition for `scope=local` is stated and measurable

**Status:** Accepted
**Date:** 2026-08-10

**Context.** SPEC requires this milestone to RECORD the decision either way rather than leave two
overlapping narrowings undocumented. The PRD recommends keeping both initially and revisiting after soak.
The recommendation is right, but "keep both" is only half a decision: two narrowings that have never been
composed will be composed by whoever writes the first `if` that needs them both.

**The measured reason they are not the same question, which is what actually settles it.** `scope=local`
resolves to `workspaceIdForProjectRoot(resolvedProjectDir)` (`mesh-ui-serve.mjs:557`) — *the workspace this
DAEMON was started in*, a server-side fact the client cannot compute and does not know. `repo=<id>` is *the
workspace the OPERATOR picked*, a client-side choice. They coincide often and are not the same fact. Two
further measurements make "just replace scope with repo" impossible today:
- A server started with `--local` (m34/ADR-006) narrows with **no `?scope=` in the URL at all**
  (`mesh-ui-serve.mjs:556`, `scope === "local"` wins over any request parameter). There is no URL to
  translate.
- `?scope=global` is a **compiled constant** in the desktop app (`app/desktop/crates/app/src/supervisor.rs:44`,
  now `/fleet?scope=global`). Retiring the parameter means recompiling and shipping a Rust binary, and it
  means every existing bookmark and every `fleetUrl` the fleet has ever printed changes meaning.

**Decision.**
- **BOTH survive this milestone. `?scope=` is untouched — same key, same values, same server behaviour,
  same control in the bar.**
- **THE COMPOSITION RULE, stated exactly, because "they compose" is not a rule:**
  1. `scope` is applied FIRST, at the SERVER, unchanged (it selects which payload is served).
  2. `repo` is applied SECOND, at the CLIENT, to that payload (ADR-002/004).
  3. They **INTERSECT**. Neither overrides the other, and there is no precedence rule to remember.
- **The consequences of intersection, named rather than discovered:**
  - `?scope=local&repo=<a different workspace>` renders **EMPTY, and that is CORRECT** — the operator asked
    for the daemon's workspace AND a different repo. The empty state names BOTH narrowings so the
    contradiction is visible and one click from resolution (ADR-007). It is never "the last one wins", and
    never a silent drop of one: a URL in which one parameter quietly disables another cannot be read by the
    person who pasted it.
  - `?scope=local&repo=<the daemon's own workspace>` is a no-op intersection and renders exactly what
    `scope=local` renders.
  - `?scope=global&repo=<id>` is the ordinary case and is what the filter is for.
  - `--local` server + `?repo=<id>` composes the same way, even with no `scope` in the URL: the server
    narrowed, then the client narrowed. The rule does not have to know how the first narrowing was asked
    for.
- **Neither control clears the other.** Each writes only its own key (ADR-003), so switching scope keeps
  the repo filter and vice versa. Both live in the same shell slot (ADR-007), which is what makes the
  composed state readable at a glance.
- **THE RETIREMENT CONDITION for `scope=local`, measurable so a later milestone can act rather than
  re-argue.** Retire it when ALL THREE hold: (a) the desktop supervisor's compiled URL no longer names
  `scope`; (b) `aof mesh ui --local` is either withdrawn or re-expressed as "start with a repo filter
  applied"; (c) a soak shows no `?scope=local` in the advertised set and none in operator use. At that
  point `scope=local` becomes a LEGACY ALIAS translated once to `repo=<the daemon's workspace>` — through
  the same mechanism m45/ADR-003 used for `?mode=`, and needing its own ADR in the milestone that does it.
  **Never a silent removal**, because a deep link that stops narrowing looks identical to a deep link that
  works.
- **The CONVERSE condition, worth stating because it is at least as likely.** If soak shows the repo filter
  is used almost exclusively as "the repo I am in", then `scope=local` is the better UI for that intent and
  the right move is the opposite one: keep `scope`, and give the repo filter a "this workspace" affordance
  that sets `repo` to the daemon's own id. The decision to make after soak is *which* of the two is the
  redundant one, and this ADR deliberately does not pre-judge it.
- **REJECTED: replacing `scope` with `repo` in this milestone.** On the three measurements above. It is a
  cross-repo, cross-binary change riding a UI milestone, and it would delete a narrowing the client cannot
  reproduce.
- **REJECTED: making `repo` win over `scope` when both are present.** It is the tempting "simpler" rule and
  it is unreadable: the URL would contain a parameter that does nothing, and which one is inert would depend
  on a rule written in one ADR and visible nowhere on screen.

**Consequences.**
- Every existing `?scope=` deep link, the desktop tray's compiled URL, `fleetUrl` and `--local` keep working
  byte-for-byte.
- The composed state has exactly one meaning and one rendering, and the pathological case is a visible
  empty state rather than a silent one.
- `acd-mesh-ui-scope-visible` (m34/ADR-006) keeps its meaning verbatim and must stay green — the scope
  control is still mounted in every page state, now beside the repo filter in the same slot.

---

## ADR-006: The board drill-in on the fleet resolves through `GET /api/mesh/board-url` — a RELATIVE board href is forbidden in `ui/src/fleet/`. `boards` gets ONE producer or NO region: the unreachable local-shape branch is DELETED in this milestone, and any future boards region must carry `workspaceId` ON THE ROW, published into the global projection — never a second read path in the fleet face

**Status:** Accepted
**Date:** 2026-08-10

**Context — the two inherited defects, measured, and they turn out to be one.**

**(a)** `Fleet.tsx:1415-1432`'s local-board drill-in is `href="/board"`, relative. On the fleet origin that
resolves to `:4181`, which deliberately 404s `/api/work` (`mesh-ui-serve.mjs:583-586`), so the board page
loads and cannot load its stream. The file's own comment says so and routes it here. The fix is not in
doubt: `GET /api/mesh/board-url` (`mesh-ui-serve.mjs:310-340`) is the ONE resolver — it knows the
per-workspace ephemeral port, memoises the launched board (`boardUrlForWorkspace`, `:820-838`), and since
m46/ADR-004 hands that board the launching fleet's own origin. `Fleet.tsx:528-538`'s milestone-card
drill-in already uses it, and TECH_DEBT item 31 names the same asymmetry from the nav's side: *"the fleet
already answers it correctly in its content … the nav bypasses the one place the answer lives."*

**(b)** That link is unreachable anyway, and the reason is structural rather than a missing wire:
- `shapeGlobalStatus` never emits `boards`; `mesh-ui-serve.mjs` never names the word (grep: zero hits).
- `isGlobalStatus` is therefore ALWAYS true (`Fleet.tsx:96-98` over `shapeGlobalStatus`'s always-present
  `workspaces`), so `Fleet.tsx:239-249`'s local branch — `NodesRegion` AND `BoardsRegion` — never renders.
  `Fleet.tsx:981-989` states this in the source, as a note about which node card is real.
- The producer is `boardsProjection` (`src/commands/mesh-identity.mjs:436-503`), which reads the
  **per-workspace GIT group registry** via `readRegistry(ws)`. The fleet face reads the **global SQLite
  projection**. Different systems of record.
- And the fleet face is BARRED from reaching it: `acd-mesh-ui-no-core-import.test.mjs:67` forbids any
  `./commands/*` or `./mesh-registry.mjs` import, `:107-112` forbids a `readRegistry(` call, and the graph
  confirms the absence is real — `mesh-ui-serve.mjs → (12)` does not include `mesh-identity.mjs`.

**So the honest description of (b) is not "the payload is missing a key".** It is that **m25/ADR-002** —
*"the fleet data model is ONE registered command … BOTH faces consume this ONE command"* — was superseded
for nodes, workspaces and items by **m34/ADR-006**'s global projection, and **the boards half was never
migrated**. The CLI face still consumes m25's command and still renders boards; the web face consumes
m34's projection and cannot. `FleetBoard`, `BoardsRegion`, `BoardTile`, `BoardDrillIn` and `boardRunState`
are the residue of a superseded ADR, and the "broken link" is a link inside a region that has not rendered
since m34.

**Decision.**
- **(a) A RELATIVE, HARD-CODED board href is FORBIDDEN in `ui/src/fleet/`, unconditionally and whatever
  happens to any region.** Every board drill-in on the fleet resolves through `fleetApi.boardUrl` →
  `GET /api/mesh/board-url`, the ONE resolver that knows a board's real origin. This is pinned by
  `acd-fleet-board-link-resolved` independently of ADR-006's second half, so the invariant survives whatever
  a later milestone does with boards.
- **(b) `boards` gets ONE producer, or NO region. In THIS milestone: no region.** The unreachable
  local-shape branch is **DELETED** — `Fleet.tsx:239-249`'s branch and everything only it reaches:
  `NodesRegion`, `NodeCard`, `PresenceDot`, `PresenceLabel`, `livenessOf`, `BoardsRegion`, `BoardTile`,
  `boardRunState`, `RunStateChip`, `BoardDrillIn` (≈250 lines; `runChipClasses` STAYS — `AssignmentChip`
  shares it). `FleetBoard`/`MeshStatus` in `api.ts` go with them or are reduced to what still has a reader.
  Three reasons, in order:
  1. **It is dead in production and has been since m34**, by the file's own admission. Deleting an
     unreachable branch is not "reworking what a card shows" (SPEC's out-of-scope item); nothing an operator
     can reach changes.
  2. **It is what makes this milestone's central claim honest.** ADR-004 says every region narrows. A region
     that cannot render cannot narrow, and shipping "every region" over a surface carrying an unreachable
     one is a claim with an asterisk nobody will remember.
  3. **It is what makes the milestone BUILDABLE without raising a ratchet.** `Fleet.tsx` is **1,547 lines
     against a 1,560 ceiling** — 13 lines of headroom — and `acd-ui-surface-file-budget`'s own rule is that
     raising a number *"needs an ADR, not a diff"* and may **not** be met by deleting rationale. The filter
     needs wiring, a chip and an empty-state branch. The ~250 dead lines are exactly the room, and taking
     them is the cheapest correct move rather than a favour.
- **The SEQUENCING constraint STATE records is satisfied by construction, not by ordering.** STATE says
  *"fixing (b) without (a) ships a visible broken link; fix them together or sequence (a) first."* Under
  this ruling (b)'s answer removes the link, so no broken link can ship in any order — and (a)'s invariant
  is nonetheless pinned by its own fitness function, so it binds the milestone-card drill-in and any future
  one. The two are decoupled rather than merely sequenced, which is the stronger outcome.
- **IF a boards region is ever restored — the terms are set now, so a future author meets a decision rather
  than an omission:**
  1. **The producer is `shapeGlobalStatus` (`src/global-mesh-query.mjs`), fed by a boards fact published
     into the GLOBAL PROJECTION** — the same route `workspaces` and `nodes` already take. **Never** a second
     read path inside `mesh-ui-serve.mjs`; three fitness functions forbid it and they are right to.
  2. **The row MUST carry `workspaceId`.** Today a board row is `{ ref, owner?: <nodeId>, activeRuns,
     local? }` (`mesh-identity.mjs:493-499`) — a board SLUG and a NODE identity, no workspace. Under
     ADR-004's completeness rule that is case 3, and publishing it as-is would create a region the repo
     filter structurally cannot narrow: exactly the shape SPEC forbids. A board is registered BY a
     workspace, so the identity exists at the producer; it just is not carried. **Adding the region without
     the identity is refused at review.**
  3. `local` must be re-derived at the global layer or dropped — it means "owned by THIS node"
     (`mesh-identity.mjs:499`), which is a per-node fact that a machine-wide projection cannot mean.
- **REJECTED: wiring `boardsProjection` into the fleet face now.** It requires importing a command module
  and calling `readRegistry` — two assertions of `acd-mesh-ui-no-core-import` — to serve a region whose rows
  cannot be filtered. Breaking a boundary to restore an unfilterable region inside the filtering milestone
  is precisely backwards.
- **REJECTED: keeping the dead branch "in case".** A branch nothing can reach is not a fallback; it is
  ~250 lines of code that no test drives, that every future author must read past, and that sits between
  this file and its ratchet.

**Consequences.**
- The fleet's only path to a board is the one that resolves the right origin, on every card, on every
  region, now and after this deletion.
- `Fleet.tsx` lands well under its budget rather than one refactor away from it (see §Codebase health).
- The m25 → m34 producer migration is **completed for the web face** and the residue named, so the next
  reader meets the history instead of an inexplicable empty region. TECH_DEBT item 31's question ("which
  project's board?") is untouched by this milestone and stays open — this ADR narrows the fleet's own
  answer, not the nav's.
- `acd-fleet-board-link-resolved` fails CI on any relative/hard-coded board href in `ui/src/fleet/`.

---

## ADR-007: The repo filter's CONTROL and its "filtered by" CHIP live in the SHELL'S SURFACE SLOT beside the scope control — mounted in EVERY page state; the in-body "Filtered to workspace" line is re-homed, not duplicated; and the empty state names EVERY narrowing that produced it

**Status:** Accepted
**Date:** 2026-08-10

**Context.** SPEC: *"An honest empty state and a visible 'filtered by' chip. A filtered view that looks like
an idle fleet is a bug; the operator must always be able to see why they are looking at nothing."*

The current implementation cannot satisfy that, and the reason is structural rather than cosmetic. The
"Filtered to workspace <id>" line is inline JSX at `Fleet.tsx:442-446`, **inside `GlobalScopeView`** — which
is only rendered in the POPULATED branch of the state ternary (`Fleet.tsx:237-249`). So the one moment the
operator most needs to see the narrowing — a filter that yields nothing, when `EmptyFleet` renders instead
— is exactly the moment it disappears. This is the same defect m34/ADR-006 already solved for the SCOPE
control, and the solution is on the record: `acd-mesh-ui-scope-visible`'s first assertion pins `<ScopeControl>`
above the state ternary *"not inside a body region that swaps out under load/error/empty"*.

m45 then gave that position a name: the shell's surface slot (ADR-005 contract point 5 — *"`chrome` offers a
slot the routed surface may fill, so a surface-specific control (scope today, 47's repo filter tomorrow)
does not need its own bar"*). `Fleet.tsx:306-332` already contributes into it via `<SurfaceSlot>`, and
`SurfaceSlot.tsx:10-13` guarantees the degraded path: with no shell present the contribution renders in
place, so the headless harnesses need no edit.

**Decision.**
- **The repo filter's control AND its filtered-by chip are contributed into the shell's surface slot, inside
  the existing `<SurfaceSlot>` in `TopBar`, beside `<ScopeControl>`.** One slot, two narrowings, one row —
  which is also what makes ADR-005's composed state readable at a glance.
- **They are mounted in EVERY page state**, for the identical reason and by the identical mechanism as the
  scope control: `TopBar` renders unconditionally, above the loading/error/empty/populated ternary
  (`Fleet.tsx:220-227`). The invariant `acd-mesh-ui-scope-visible` has pinned since m34 now covers a second
  control, and that test must stay green.
- **`Fleet.tsx:442-446`'s in-body line is RE-HOMED, not duplicated.** Two places rendering "what am I
  filtered to" is two places that can disagree, and one of them is invisible in three of four page states.
  Whatever `?scope=local` shows about narrowing shows in the same chip.
- **The chip resolves the id to a NAME.** It is the payback for ADR-003's opaque URL value: the chip renders
  `workspace.name ?? workspace.workspaceId` from the payload the page already holds, with the id in `title`.
  When the id resolves to nothing (ADR-003's UNKNOWN case) it renders the raw value and says it is not in
  the payload — the one case where showing the opaque string is the honest answer.
- **The chip carries its own CLEAR affordance.** "Why am I looking at nothing" and "how do I stop" are one
  question, and answering the first without the second is what makes a filter feel like a fault.
- **The empty state names EVERY narrowing that produced it**, in the order they were applied (ADR-005):
  scope, then repo. `emptyStateCopy` (`scope.mjs:104`) — already scope-aware — gains the filtered cases
  rather than acquiring a sibling; it stays a pure function of the narrowings, so `node:test` drives every
  combination directly. Four distinct copies, and they are genuinely four different facts: nothing has
  published yet · this repo has nothing · this repo is not in the payload · the scope and the repo do not
  intersect.
- **REJECTED: a chip painted by the shell.** DESIGN's rule (quoted in `SurfaceSlot.tsx:6-8`) is that
  surfaces contribute their own controls and *"the shell does not author them"* — a shell that authored this
  chip would have to know what a workspace is, and then 49 and 50 queue behind it.
- **REJECTED: a chip in the page body, above the regions.** It is where the current line lives, and it is
  invisible in exactly the state SPEC cares about.
  [**SUPERSEDED 2026-08-11 — see ADR-012. THIS BULLET ONLY**; every other clause of ADR-007 stands and is
  honoured by the build, and nothing above this line is edited. Its reason is kept and made structural: the
  invisibility was a property of the POSITION — the line sat inside the populated branch of the state ternary
  — not of the container. The chip is R0 in the page, hoisted ABOVE that ternary; the CONTROL stays in this
  slot and is what discharges the always-visible obligation; and clause 3's "two places that can disagree"
  risk is closed by ONE derivation feeding both rather than by one container.]
- **The condition that would overturn this:** the slot getting crowded enough that the fleet's four
  contributions (scope, repo, legend, refresh) no longer fit the bar at 390 — at which point the answer is
  the shell's own disclosure rule (m45's nav already has one), not a second bar owned by the fleet.

**Consequences.**
- There is exactly one place on screen that says what the view is narrowed to, and it is present in the
  loading, error, empty and populated states alike.
- The filtered-to-zero view is self-explaining and one click from recovery.
- `acd-mesh-ui-scope-visible` gains a second subject and keeps its shape; `acd-shell-bus-single-host` is
  unaffected (the fleet contributes, it does not import the shell).

---

## ADR-008: The filtered view MAY drop region 5's workspace-name column — and doing so is a DELIBERATE, TEST-UPDATING amendment to the DG-13…DG-22 geometry contract, made in the same change, with the drop predicate given ONE home beside the budget it reads. The YIELD ORDER is not touched

**Status:** Accepted
**Date:** 2026-08-10

**Context.** SPEC calls the filter *relief* here — a filtered view can drop the workspace-name column — and
in the same breath says region 5's membership is a contract, fitness-locked by
`test/fleet-assign-row-geometry.test.mjs` across DG-13…DG-22, to be treated as *"a deliberate,
test-updating decision"*.

The relief is real and it is already the contract's own logic. DG-16's rationale for dropping the name
whole is written at `Fleet.tsx:670-674`: *"it costs nothing: the WORKSPACES strip at the top of this same
page carries it in full."* Under a repo filter the argument is stronger, not weaker — every card belongs to
the filtered repo, so the name column renders **the same string on every card**, and ADR-007's chip carries
it once, at the top, permanently visible.

The trap is equally real: `nameDropped` is an inline expression at `Fleet.tsx:569`, and DG-22's alignment
consequence rides the SAME boolean at `:714` (*"when the name is dropped the row's leading group must be
left-aligned"*) — decided together on purpose so the two cannot disagree. A filter that dropped the name by
adding a second condition somewhere else would reopen exactly the defect DG-20/DG-22 closed.

**Decision.**
- **The filtered view MAY drop the workspace-name column, and the rule is an EXTENSION of the existing gate,
  not a second gate.** Conceptually one boolean: *dropped when the view is repo-filtered, OR when the
  existing chip-pressure fit budget says so.* One boolean feeds both the render and DG-22's alignment, as
  today.
- **The predicate gets ONE home, as a pure function beside the budget it reads** — `ui/src/fleet/assign-
  affordance.mjs`, which already owns `REGION5_NAME_BUDGET_CH` (`:198`), `REGION5_CHIP_SLOT_BUDGET_CH`
  (`:210`) and `REGION5_DRILLIN_ABBREV_AT_CH` (`:220`), and which is where
  `fleet-assign-row-geometry.test.mjs` already imports its constants from. The test then drives the DECISION
  directly rather than inferring it from a rendered class name, which is what a contract deserves.
- **`test/fleet-assign-row-geometry.test.mjs` is UPDATED IN THE SAME CHANGE**, with a new lane for the
  filtered case, and **every existing unfiltered lane must stay green byte-for-byte**. A geometry contract
  changed without its test is the silent divergence SPEC forbids; changed with it, it is a decision. If the
  filtered lane cannot be expressed through the existing harness, that is a signal the change is bigger than
  it looks and it comes back here — not a licence to skip the lane.
- **THE YIELD ORDER IS NOT TOUCHED.** DG-13 clause 5's priority — chip label + `→ <target>` in full >
  `Open board →` > the workspace name — is unchanged, and so is clause 5's sixth clause (*no two elements in
  region 5 may occupy the same pixels*). The filter makes step 1 UNCONDITIONAL in the filtered view; it does
  not reorder the ladder and it does not make the name drop for a new reason.
  [**SUPERSEDED 2026-08-12 — see ADR-014. THIS BULLET ONLY**; nothing above this line is edited and every
  other clause of ADR-008 stands. The clause is right about THE FILTER and incomplete about THE ROW: the
  ladder it declines to touch was written for a **two-child** cluster, and the cluster has three whenever
  `assignment && (inReview > 0 || isDone)`. ADR-014 EXTENDS the order by one rung at the END (the secondary
  token gives up its WORDS, keeping its pinned glyph and its count) and reorders **no existing pair**. The
  reason this bullet's own instinct was correct — that a filter may not re-rank the row — is preserved:
  cluster ARITY changes the BUDGET each rung is compared against, never who yields first.]
- **The freed width goes where the yield order already says it goes**, and no budget is relaxed to collect
  it: `REGION5_CHIP_SLOT_BUDGET_CH` and `REGION5_DRILLIN_ABBREV_AT_CH` keep their values, so a filtered card
  simply crosses fewer of the thresholds it already had. Loosening a budget because a filter freed space
  would be re-tuning a measured number for an unmeasured reason — the shape TECH_DEBT item 32 records for
  the dock clamp, one surface over.
  [**SUPERSEDED 2026-08-12 — see ADR-014. THIS BULLET ONLY**; nothing above this line is edited. Both
  constants MOVE, and they move **DOWN** — 41 → 12 (two-child) / 0 (three-child), 31 → 12 / 0, with the
  target's own post-abbreviation budget stated separately at 28 / 20ch. This bullet's rule is not weakened
  by that, it is applied to itself: the prohibition is on **relaxing** a budget to collect freed width, and
  every number here moves in the DROP direction, so nothing that drops today renders after the change. What
  the bullet assumed and could not check is that the numbers were measured **at the row the contract must
  hold at**; they were measured at 360.66px, which the card is at exactly one viewport (measured 2026-08-12:
  the band is 286…368.66). ADR-014 re-derives them from the grid's own floor, 286px.
  `REGION5_NAME_BUDGET_CH` is NOT among them and does not move.]
- **A render verdict is OWED and is NOT claimed here.** Whether the filtered row reads correctly at 1280 and
  at 390 is a claim about pixels, and `fleet-assign-row-geometry.test.mjs`'s own header is explicit that its
  lanes are class/structure facts and *"not a PIXEL verdict"*. The filtered row goes to the designer as a
  `@uat` lane, exactly as DG-13's own frames did.
- **REJECTED: dropping the name only when the filter is active AND the chip is present.** It makes
  absence-of-name a second signal for "this card has an assignment" — DG-20's own named error (`Fleet.tsx:
  697-701`), re-introduced from the other direction.
- **REJECTED: leaving the name in the filtered view.** It is the same string on every card, it spends the
  width DG-13 clause 5 fought to give the chip's target, and SPEC explicitly sanctions the relief.

**Consequences.**
- The filtered card gets measurably more room for the fact clause 5 protects, without any budget moving.
- The geometry contract has one more clause and one more lane, and both are visible in the diff that adds
  them.
- The drop decision becomes headlessly testable, which it is not today.

---

## ADR-009: "EMPTY" IS TWO QUESTIONS, NOT ONE. `isEmptyStatus` keeps its exact meaning — *the mesh has published nothing* — and the VIEW's emptiness is a second, FILTER-AWARE predicate in the same one home, for which the surviving workspace row is not content but the filter's own subject — and is therefore also the fact that tells a quiet KNOWN repo from an UNKNOWN one

**Status:** Accepted
**Date:** 2026-08-10

**Context.** Raised at the developer's feasibility pass over the finished contracts, and it sits on the
critical path of both 47/02 and 47/03. QA has since pinned the observable behaviour in 47/02's
`02_scope-composition-and-copy.feature`, including a guard row that forecloses the naive fix, and
deliberately left the mechanism open — for here.

**The defect, measured at source 2026-08-10.** `isEmptyStatus` (`scope.mjs:91-98`) answers `false` for
`{ workspaces: [one], items: [], nodes: [] }` — which is exactly the NARROWED shape of a repo that is on
the mesh and has published, but carries no work items and no nodes. So `pageState` answers `populated`
(verified: `pageState({loading:false,error:null,status:{workspaces:[{workspaceId:"alpha"}],items:[],nodes:[]}})`
→ `"populated"`), and the page renders `GlobalScopeView` with one workspace card and three empty regions
where DG-47-3 requires the filtered-empty card. **That is SPEC's own defect** — *"a filtered view that
looks like an idle fleet is a bug"* — arriving from the direction nobody was watching.

**And the naive fix is worse, which is why this needs an ADR rather than a line of code.** Making the
predicate ignore `workspaces` would make the **UNFILTERED** fleet tell an operator *"No mesh-enabled
workspaces have published yet"* about a mesh where one demonstrably has — a **fresh instance of the exact
defect class this milestone exists to remove**, planted while removing it.

**THE MEASUREMENT THAT SETTLES IT, and it is unusually clean.** The green lane pinned at
`test/fleet-scope.test.mjs:100-105` asserts:

> `pageState({ … status: { workspaces: [{ workspaceId: "a" }], items: [], nodes: [] } })` → `"populated"`

That fixture is **byte-identical to the narrowed quiet-repo shape above**. So the SAME payload must answer
`populated` unfiltered and `empty` filtered. **No filter-blind predicate can do that** — not by tuning,
not by re-weighting which arrays count. The question is not "which arrays make a payload empty"; it is
that **two different questions have been sharing one function**:

- *Has the mesh published anything?* — a question about the **source of data**. Its answer drives the m34
  global empty state, its copy names publishing, and its remedy is `config.mesh.enabled`.
- *Is there anything for the operator to look at in THIS view?* — a question about the **view**. Its copy
  names the narrowing, and its remedy is to clear the filter.

Different questions, different copy, different remedies. One name.

**Decision.**
- **`isEmptyStatus` IS NOT TOUCHED.** It keeps its name, its signature and its exact meaning: *the mesh
  has published nothing at all*. `test/fleet-scope.test.mjs:100-105` stays green **byte-for-byte and
  unedited**, and the unfiltered fleet keeps telling the truth. A green lane that has to be flipped to
  make a feature fit is the feature asking the wrong question.
- **The VIEW's emptiness is a SECOND, FILTER-AWARE predicate, in the same one home** (`scope.mjs`,
  ADR-001 — one module, two predicates, because they are genuinely two questions; two *modules* would be
  the violation, two *names for two facts* is the fix). It takes the active narrowing as an EXPLICIT
  argument rather than sniffing the payload, so it is pure, headless and drivable by `node:test` over
  every combination — and so that "is this view filtered" has one answer rather than being re-derived
  from the shape of the data.
- **THE RULE. Under a filter, the surviving `workspaces` row is NOT CONTENT — it is the filter's own
  subject.** `items` and `nodes` are the fleet's content; `workspaces` is its INDEX. Narrowing to one repo
  leaves exactly one index row **by construction** — that is what filtering *means* — so counting it as
  content makes "empty" unreachable for every known repo, which is precisely the observed bug. Therefore:
  - **UNFILTERED:** empty ⇔ `isEmptyStatus`, unchanged. The mesh-empty copy.
  - **FILTERED:** empty ⇔ the narrowed payload carries **no items and no nodes**. Rendering *"here is the
    repo you filtered to, and nothing else"* as a populated page is the idle-fleet defect restated.
- **THE SURVIVING ROW IS THE DISCRIMINATOR, and this falls out rather than being bolted on.** Within the
  filtered-empty state, the two copies ADR-003 and ADR-007 already require are told apart by the very row
  that caused the defect:
  - **one workspace row survived** → the repo is **KNOWN and QUIET**: "nothing is running in *&lt;name&gt;* yet".
  - **zero workspace rows survived** → the repo is **UNKNOWN to this payload** (ADR-003's unknown case):
    name the requested value verbatim and offer the clear.

  The fact that was making emptiness undecidable is exactly the fact that makes the two empties
  distinguishable. That is the sign the cut is in the right place.
- **`pageState` REMAINS THE ONE STATE SELECTOR** (`scope.mjs:65`). It gains the narrowing as an input; it
  does not gain a sibling. A second state selector beside it would be m45/ADR-002's "two selectors"
  failure one surface down, and every region already keys off this one.
- **It reads the NARROWED payload**, which ADR-004's seam ordering already guarantees and its fitness
  function already asserts (`filterToWorkspace` before `pageState` in source order). The two ADRs are
  load-bearing for each other: without ADR-004's ordering this predicate would judge the wrong payload,
  and without this ADR the ordering would have nothing to protect.
- **REJECTED: dropping `workspaces` from `isEmptyStatus`.** The naive fix. It breaks a pinned green lane,
  and it makes the unfiltered fleet lie about a mesh that has published — trading this milestone's defect
  for a new instance of the same class. Named here so it is refused at review rather than rediscovered.
- **REJECTED: inferring "filtered" from the payload** (e.g. "exactly one workspace ⇒ filtered"). A mesh
  with exactly one published workspace is a real and common state — every fresh install — and it would
  render the filtered-empty copy, naming a filter the operator never set.
- **REJECTED: letting the region components decide.** Each region already knows whether its own array is
  empty, and four regions independently concluding "nothing here" is ADR-004's banned shape with a
  different subject.
- **The condition that would overturn this:** a payload where `workspaces` becomes genuinely actionable
  content in its own right — a workspaces region that could be worked *from* rather than filtered *by*
  (enable mesh, publish, open settings). Then the index/content split stops being true and the rule needs
  re-deciding, not re-tuning.

**Consequences.**
- A filtered view of a quiet-but-known repo renders DG-47-3's card and says which repo is quiet; a
  filtered view of an unknown repo says the payload does not carry it; an unfiltered empty mesh says
  exactly what it says today. Three states, three copies, one selector.
- `test/fleet-scope.test.mjs` needs **no edit** — which is the check that this ruling is the conservative
  one rather than the clever one.
- ADR-007's empty-state copy branches on the same two inputs this predicate takes (the scope and the
  repo), so the chip, the copy and the state cannot disagree about why the page is empty.
- The 47/02 feature QA left mechanism-open is answered here, before the keyboard is picked up.

---

## ADR-010: The composition is an intersection **PER COLLECTION**, so a collection the SERVER declined to narrow can SURVIVE ALONE — `?scope=local&repo=<another repo>` renders that repo's MEMBER MACHINES rather than nothing, and `?scope=local&repo=<the daemon's own>` is no no-op; ADR-005's two composed consequences are CORRECTED rather than honoured. And a scope-narrowed payload may NEVER assert the unknown-value accusation: the fourth composed state is OUT-OF-SCOPE, not UNKNOWN

**Status:** Accepted
**Date:** 2026-08-11

**Corrects** ADR-005 — **TWO** clauses, its second and third named consequences (*"`?scope=local&repo=<the
daemon's own workspace>` is a no-op intersection and renders exactly what `scope=local` renders"* and
*"`?scope=local&repo=<a different workspace>` renders **EMPTY, and that is CORRECT**"*). Both are false
for the same reason and by the same mechanism; QA found the second, and the first fell out of measuring
it. **Extends** ADR-009 — its KNOWN/UNKNOWN discriminator gains a third case. Neither ADR is edited; both
stay Accepted, and every other clause of each stands — including ADR-005's composition rule itself, which
this ADR does not weaken but *finishes*.

**Context — the contradiction, and it is between two Accepted ADRs of this milestone rather than
between an ADR and a build.** Raised by QA's behavioural review of 47/02 and reproduced here at source
on 2026-08-11.

ADR-005 names EMPTY as the consequence of a non-intersecting composition. ADR-004 rule 2 narrows the
node roster **by membership**, and diverges from `?scope=local` deliberately. Compose the two against
**the payload the server actually serves**, which is the fact neither ADR looked at:

- **The server does not narrow the roster under `scope=local`, and three independent places say so.**
  `src/global-node-registry.mjs:170-172` states it (*"nodes are a MACHINE-WIDE fact: the roster is never
  workspace-filtered"*); `src/mesh-ui-serve.mjs:552-554`'s own comment at the seam repeats it (*"the NODE
  roster stays machine-wide either way"*); and `test/arch/acd-mesh-ui-local-filter-preserves-status.test.mjs:94`
  pins it behaviourally and is GREEN (*"both nodes surface even under --local"*).
- **So the client holds a machine-wide roster under a scope-narrowed payload**, and ADR-004 rule 2
  applied to it answers with rows. Measured on the delivered 47/02 module, over a local payload shaped
  the way the server actually shapes one (workspaces and items narrowed to alpha, roster untouched):

  | address | workspaces | items | nodes | `pageState` |
  |---|---|---|---|---|
  | `?scope=local` alone (no filter) | 1 | 1 | **5** (the whole roster) | `populated` |
  | `?scope=local&repo=alpha` (the daemon's own) | 1 | 1 | **2** (`only-alpha`, `both`) | `populated` |
  | `?scope=local&repo=beta` (a different repo) | **0** | **0** | **2** (`both`, `only-beta`) | **`populated`** |
  | `?scope=local&repo=zzz` (nothing carries it) | 0 | 0 | 0 | `empty` |

  **Both of ADR-005's named consequences are false as claims about the payload.** Row 3 is not empty —
  two machines survive. And row 2 is **not a no-op**: it drops three of the five roster rows, because the
  server never narrowed the roster and the repo filter is the first narrowing to reach it. Both sentences
  were written by composing the two *narrowings* and not the *collections*, at a point where ADR-004
  rule 2's node divergence existed but had not been run against a real local roster. The no-op claim is
  the more instructive of the two: it reads as the safe, obvious case, and it is wrong in the direction
  nobody checks.
- **AND THE SHARPER DEFECT, which QA's report did not reach and which is the reason this needs an ADR
  rather than a correction: ADR-009's discriminator is UNSOUND under a scope-narrowed payload.** ADR-009
  ruled that the surviving `workspaces` row tells a KNOWN-and-quiet repo from an UNKNOWN one. That is
  sound on the GLOBAL payload, where the only thing that can remove a workspace row is the repo filter.
  Under `scope=local` **the SERVER already removed every other workspace row**, so "zero rows survived"
  collapses two facts — *the scope excluded it* and *the mesh does not have it* — into one answer. The
  measured consequence: `?scope=local&repo=beta` selects the unknown-value body, *"Nothing on this mesh
  publishes as beta"* (`scope.mjs:309-314`), **about a workspace that demonstrably publishes on this
  mesh**. That is a false statement about the mesh produced by the operator's own narrowing — SPEC's own
  defect, and the exact class ADR-009 exists to remove, arriving through the door ADR-009 opened.
- **The client has the input it needs and is not currently reading it.** The payload carries
  `workspaceId` — *the workspace the SERVER narrowed to*, `null` when it did not narrow
  (`src/global-mesh-query.mjs:271`, set from `src/mesh-ui-serve.mjs:557`, declared on the wire type at
  `ui/src/fleet/api.ts:210`). ADR-004 clause 4 correctly rules it a scalar that rides through unchanged;
  what nobody noticed is that a scalar can be an input to the **copy** without becoming an input to the
  **narrowing**. `emptyStateCopy` today takes the scope's LABEL and not its VALUE, which is precisely
  why the composed copy cannot say anything specific.

**What the contradiction has already cost, so it is read as live rather than theoretical.**
`47/02 tasks/02` scenario 1 rows 2, 3 and 5 assert outcomes ("every collection empty", "nothing further
removed") that are **false of a realistic local payload**. They are green only because
`m47LocalPayload()` (`test/fleet-scope.test.mjs:1153-1169`) applies an `alphaOnly` roster predicate
(`:1155`) that deletes precisely the nodes which would falsify them. **The developer flagged it at the
fixture rather than hiding it** (`:1144-1152`, in terms: *"the real server does not narrow the roster at
all under `?scope=local` … so a roster carrying a beta member is a real shape and its answer under
`repo=beta` is that member, not nothing"*) — which is why this is being ruled and not discovered in
production. A green lane over a fixture shaped to avoid the contradiction is a gate that cannot fire,
and that is the thing being fixed here, not the developer's judgment.

**Decision.**

- **1. ADR-004 RULE 2 GOVERNS THE COMPOSED ROSTER. Nodes survive, and the roster is narrowed even when
  the two narrowings agree.** `?scope=local&repo=beta` renders beta's member machines. ADR-005's second
  and third consequences are corrected to: *the composition intersects **each collection separately**,
  so `?scope=local&repo=<a different workspace>` empties `workspaces`, `items` and the two narrowed
  `diagnostics` members and leaves whatever the roster's membership rule leaves; and
  `?scope=local&repo=<the daemon's own workspace>` is **not** a no-op — it narrows the machine-wide
  roster to that workspace's members, which is the first and only narrowing the roster receives.* The
  rest of ADR-005 stands verbatim: intersection itself, the `--local`-with-no-`?scope=` case, the
  retirement and converse conditions, and both of its REJECTED alternatives.
- **2. "INTERSECTION" IS PER COLLECTION, and this is the general rule the correction generalises to,
  stated so the next collection does not need a third ADR.** Each collection is intersected with each
  narrowing **that applies to that collection**. The scope narrowing does not apply to the roster —
  by the producer's own deliberate ruling, in three places — so intersecting the roster with it is not
  "composing", it is inventing a narrowing the server declined to perform. A collection whose two
  narrowings differ in *reach* can therefore be the only survivor, and **that is intersection working,
  not intersection failing**.
- **3. THE CLIENT NEVER GATES A COLLECTION BY `scope` OR BY `status.workspaceId`.** This is the fix a
  later author will reach for and it is refused by name. Three reasons, in order: (a) it re-implements
  on the client a narrowing the server deliberately declined (`global-node-registry.mjs:170-172`), which
  is ADR-002's rejected direction seen from the other end; (b) applied unconditionally it would drop
  non-member nodes under a bare `?scope=local` **with no repo filter at all**, changing a page this
  milestone does not touch and contradicting a green behavioural pin; (c) applied only when a repo
  filter is present it is a PRECEDENCE RULE between the two keys, which ADR-005 rejects by name. The
  scope's value is an input to the **copy** (clause 5) and never to the **narrowing**.
- **4. `pageState` IS UNCHANGED, AND THE COMPOSED SURVIVOR IS `populated`.** ADR-009's rule already says
  content is `items` and `nodes`; two surviving node rows are content, and forcing the page to `empty`
  would hide the very rows that answer the filter. **What the page owes instead is a
  PARTIAL-INTERSECTION NOTICE**, not an empty state: a visible line saying which narrowing removed the
  rest — *these machines are members of this repo; this scope's payload carries none of its work*. This
  is ADR-004 clause 3(a)'s "visible marker" vocabulary used in mirror image: 3(a) marks a region that
  is **not** filtered, this marks a view where **one narrowing emptied some regions and not others**.
  It belongs beside the chip, in the shell's surface slot (ADR-007), and it is **story 47/03's build**.
- **5. THE FOURTH COMPOSED STATE IS OUT-OF-SCOPE, NOT UNKNOWN — and the rule is TOTAL rather than
  case-by-case: a SCOPE-NARROWED PAYLOAD MAY NEVER ASSERT THE UNKNOWN-VALUE ACCUSATION.** *"Nothing on
  this mesh publishes as X"* is a claim about the MESH, and a client served one workspace was not served
  the mesh. So `resolved == null` means "unknown" **only when the payload carries no server narrowing**
  (`workspaceId == null`). Otherwise it means *"this payload cannot say — the scope you asked for
  excluded it"*. Mechanically, in the ONE home and with no new export: **`emptyStateCopy`'s narrowings
  record gains the scope's VALUE beside its label** (the served `workspaceId`), so the copy branches on
  the two narrowings it already claims to name. `resolvedRepoName` keeps its three values and its
  meaning exactly — it answers a question about `workspaces`, and that answer is still correct; what
  changes is that the copy stops over-reading it. ADR-009's discriminator is extended, not replaced.
- **6. THE COMPOSED BODY NAMES BOTH NARROWINGS AND SAYS THE INTERSECTION IS WHAT IS EMPTY.** It is
  currently **byte-identical to the unknown-value body** (measured), which is both the false statement
  above and the reason the four-pairwise-distinct-bodies lane passes by value substitution: change
  `beta` to `zzz` and two "distinct" strings become one rule. `47/03 tasks/02` row 4 already states the
  property correctly (*"names BOTH narrowings, and says the intersection is what is empty rather than
  either half of it"*); `47/02 tasks/02` scenario 4 row 5 is the stale cell. **The exemplar is DESIGN's
  to write, not this ADR's** — DESIGN §Surface 2 (`DESIGN.md:849-852`) pins three empty bodies and the
  composed HEADING only (`:861`), and an architect inventing product copy is the same error as QA doing
  it. What is fixed here is the PROPERTY and the prohibition.
- **REJECTED: honouring ADR-005 literally by gating nodes on the scope.** Clause 3. It is the reading
  that keeps the older ADR's sentence true at the cost of making the product wrong, which is the wrong
  way round: an ADR is a record of a decision, not a constraint on reality, and when reality contradicts
  it the ADR is what gets superseded.
- **REJECTED: leaving the roster un-narrowed under a repo filter** (i.e. exempting nodes from ADR-004
  rule 2 whenever a scope narrowing is in force). It answers "which machines are working on this repo"
  with every machine on the mesh, under a chip that says the view is filtered — SPEC's own defect, and
  the thing ADR-004 rule 2 was written to prevent.
- **REJECTED: making the composed case an empty state anyway, by counting only `workspaces` and `items`
  as content.** It would hide the surviving node rows behind a card saying there is nothing to see,
  which is a *lie with a smaller blast radius*, not a fix. It also re-opens ADR-009's index/content
  split on the other side.
- **The condition that would overturn this:** the server starting to narrow the roster under
  `scope=local` — at which point the divergence ADR-004 rule 2 records disappears, the composed case
  genuinely does render empty, and this ADR is superseded rather than quietly satisfied. That change
  belongs to whoever owns `global-node-registry.mjs`, needs its own ADR, and must retire
  `acd-mesh-ui-local-filter-preserves-status`'s node clause in the same change.

**Consequences.**
- `?scope=local&repo=<another repo>` is a **true, partial, explained** view instead of a false empty
  one, and the operator can see which of their two narrowings emptied which regions.
- The client can no longer make a claim about the mesh it was not served. Under any scope-narrowed
  payload the unknown-value accusation is structurally unavailable.
- `47/02`'s three affected Examples rows become assertable against a **realistic** roster, and the
  `alphaOnly` fixture predicate that made them green stops being load-bearing (see the row-by-row
  instruction the structural review carries).
- ADR-005's composition rule survives intact and is now finished: "they intersect" has a defined answer
  for the case where the two narrowings have different reach.
- **Fitness function — an EXTENSION of `acd-fleet-filter-every-region`, never a fifth file** (a second
  file asserting the same completeness concept is the duplicated-home shape every ADR above refuses):
  (i) the client narrowing takes **exactly one** narrowing value — `filterToWorkspace` and the seam read
  neither `status.scope` nor `status.workspaceId` as a filter predicate, so clause 3 fails CI rather
  than being remembered; (ii) its behavioural lane's local fixture carries a **multi-workspace and a
  foreign-workspace node**, so the composed survivor is exercised rather than fixtured away; and
  (iii) the composed body is not byte-identical to the unknown-value body for the same raw value. The
  developer writes these with 47/03's seam; **(ii) is the non-vacuity half and is the one that matters.**

---

## ADR-011: The ONE resolver must give a TRUTHFUL answer, not merely be the one door. `GET /api/mesh/board-url` REFUSES a row whose checkout is not on this machine — reusing the `workspace-not-local` / 409 vocabulary the same file already mints thirty lines away — and ADR-002's `src/`-untouched invariant PERMITS this, read with its subject attached: the invariant is about THE FILTER, and ADR-006 was granted the licence it declined to spend on the boards producer

**Status:** Accepted
**Date:** 2026-08-11

**Extends** ADR-006(a) — its resolver invariant gains a truthfulness clause. **Spends, narrowly and
exhaustibly, the `src/` licence ADR-002 reserved to ADR-006.** Neither ADR is edited; ADR-002's
invariant is not widened, and this ADR states the constraint that keeps it un-widened.

**Context — the finding, re-measured here rather than accepted.** F-47-01-DEV-1: the developer stopped
on `47/01 tasks/00` scenario 5 row 2 rather than work around it, and reported its premise false.
**Reproduced independently on 2026-08-11**, driving the real fleet face over the committed fixture's
`Gone` workspace (`test/support/mesh-ui-assign-fixture.mjs:406-408` — a real publish followed by a real
`rm -rf`, never a hand-built row):

```
rootGone on disk?                                   false
GET /api/mesh/board-url?workspaceId=<gone>&ref=18 → 200 {"url":"http://127.0.0.1:65264/board#18"}
GET http://127.0.0.1:65264/board                  → 200 (137 bytes of the board's own HTML)
GET http://127.0.0.1:65264/api/work/list          → 200 {"items":[],"stalenessSeconds":300,"nodeId":null}
GET /api/mesh/board-url?workspaceId=0000…         → 404 workspace-not-found   ← the only refusal it has
    (and workspace B, a REAL checkout, answers /api/work/list with its actual items)
```

**The measurement stands.** The resolver never refuses, the app navigates, the board binds, and the
operator lands on a page that renders and shows an empty stream — **byte-indistinguishable from a repo
that simply has no work.** `serveBoard` (`src/board-serve.mjs:60-70`) validates exactly one precondition
before it binds, that the UI bundle exists (`ui-build-missing`), and carries `projectDir` through
unresolved; `boardUrlForWorkspace` (`src/mesh-ui-serve.mjs:820-838`) probes nothing.

**THE FACT THAT DECIDES THIS, and it turns the question from a design call into a consistency defect:
the same file already answers this exact question, thirty lines away, and has since m38.**
`src/mesh-ui-serve.mjs:454-462` — the assign route's *reachability caveat*, m38/ADR-012's amendment —
probes the very same field on the very same row from the very same `queryGlobalMeshStatus` call, and
refuses:

```js
// The reachability caveat, checked BEFORE loadWorkspace: workspace ids
// are path-derived, so a row published by ANOTHER machine into a synced
// projection carries a project_root that does not exist HERE. […]
// a refusal that names the WRONG cause. A refusal must name its own cause.
if (!row.projectRoot || !existsSync(row.projectRoot)) {
  sendApiError(response, 409, `Workspace "${workspaceId}" is not checked out on this machine.`, "workspace-not-local");
```

It is pinned behaviourally (`test/mesh-ui-assign-item-workspace.test.mjs:120,164`, driven by the SAME
`workspaceIdGone`) and structurally (`test/arch/acd-fleet-assign-targets-item-workspace.test.mjs:184-187`,
inv.5). **So there is no new principle to decide here.** Two sibling routes on one face, handed the same
row by the same query, ask the same question — *can I open this workspace on this machine?* — and only
one of them consults the answer. The board-url route did not weigh this and reject it; it missed it.

**Three further measurements, because "which layer refuses" is the part that could still go wrong.**
- **The board-url route degrades WORSE than the assign route did.** The assign route's un-probed failure
  was a *wrong refusal* (`ref-not-found`, naming the wrong cause). The board-url route's is a **wrong
  success**: a bound server, a rendered page, an empty stream. A wrong refusal is visible and
  self-reporting; a wrong success is neither. The condition m38 judged worth a probe is strictly more
  damaging on this route.
- **This is not an edge case; on a mesh it is the ORDINARY case.** The global projection is machine-wide
  and cross-machine — `mesh-ui-serve.mjs:454-457` says so in its own words. Every card published by
  ANOTHER node carries a `projectRoot` this machine has never had, every one of them renders a drill-in,
  and none of them can ever open. The feature's own note already calls row 2 *"the row an operator
  actually meets"*. And each such click **launches and memoises a board server on this machine**
  (`boardUrlForWorkspace` writes `boardServers`, deleted only on the server's own `close`), so the
  current behaviour also strands a bound port per un-openable card for the fleet's lifetime.
- **It is the FLEET's question, not the board's.** `serveBoard` has many callers — the command layer,
  `aof work ui`, six suites — and every one of them resolves `projectDir` from a local cwd or a local
  flag. **The fleet's resolver is the only caller that can be handed a path from another machine**,
  because it is the only one holding a machine-wide projection. Moving the probe into `serveBoard` would
  change behaviour for every unrelated caller in order to fix a fleet-only fact.

**Decision.**

- **1. THE ONE RESOLVER OWES A TRUTHFUL ANSWER, and that is an extension of ADR-006(a) rather than a new
  rule.** ADR-006(a) made `GET /api/mesh/board-url` the ONE door on the grounds that it *"knows the
  per-workspace ephemeral port"*. A door that knows the port but not whether the room exists is the
  single-seam property without the property it was for. **`GET /api/mesh/board-url` MUST refuse a
  workspace row whose `projectRoot` is absent or not present on this machine, BEFORE any board is
  launched.**
- **2. THE REFUSAL REUSES THE EXISTING VOCABULARY: `409 workspace-not-local`.** Not `board-url-failed`,
  and not a new code. One fact — *this row's checkout is not on this machine* — already has a name, an
  HTTP number, a message shape and two pinning suites on this very face. Minting a second code for it
  would be the duplicated-home shape every ADR in this milestone refuses, one refusal down, and it would
  leave the two routes answering one question in two vocabularies. **The probe is placed in the route
  branch, before `boardUrlForWorkspace` is called** — the resolver must not be entered for a row it will
  refuse, or the memoised launch has already happened.
- **3. ADR-002's INVARIANT PERMITS THIS, READ WITH ITS SUBJECT ATTACHED — and it is NOT widened.**
  ADR-002 states *"`src/` is NOT edited **by the filter**"* and enumerates the modules as *"untouched by
  ADRs 001–005 and 007–008"*. **ADR-006 is deliberately absent from that list** and is named in the next
  breath as *"the one ADR that MAY reach into `src/`"*. The trailing *"and it rules that it does not
  either"* is a **report of what ADR-006 decided**, not a second prohibition — and what ADR-006 declined
  was a *specific* reach: importing a command module and calling `readRegistry(` to restore an
  unfilterable boards region, which three assertions forbid. A read-only existence probe on a field the
  route already holds is none of those things. **Checked rather than argued — all 22 assertions across
  the six suites this invariant protects are GREEN today (measured 2026-08-11:
  `acd-fleet-filter-read-only`, `acd-mesh-ui-no-core-import`, `acd-mesh-ui-read-only`,
  `acd-fleet-assign-targets-item-workspace`, `acd-fleet-board-link-resolved`,
  `acd-mesh-ui-local-filter-preserves-status`), and none can move:**
  - `acd-fleet-filter-read-only` (ADR-002's own gate) asserts the status route's accepted input, the
    client's minted parameters, and that `queryGlobalMeshStatus` keeps ONE narrowing option. A
    `projectRoot` probe adds no query key and no narrowing option.
  - `acd-mesh-ui-no-core-import` forbids `./commands/*` and `mesh-registry.mjs` imports, `readRegistry(`
    calls, and filesystem **writes**. `existsSync` is a read, is **already imported at
    `mesh-ui-serve.mjs:58`**, and is **already called three times in this file** (`:164`, `:228`, `:460`).
    No new import, no new capability, no new dependency edge.
  - `acd-fleet-assign-targets-item-workspace` brace-balances its region from
    `if (pathname === "/api/mesh/assign")` (`:91-97`), so an earlier branch cannot confuse its slicer.
  - `acd-mesh-ui-read-only` and `mesh-ui-read-only-contract` govern MUTATION routes; this is a GET that
    refuses earlier.
  **The invariant's stated purpose — *"no new fleet mutations / the read-only contract stays green
  untouched"* — is honoured, not spent.** It was never a rule that `src/` is radioactive; it was a rule
  that the FILTER does not reach into it, and this is not the filter.
- **4. THE LICENCE IS NARROW, NAMED AND EXHAUSTED BY THIS ADR — this is the clause that keeps clause 3
  from becoming a precedent.** m47 may edit `src/mesh-ui-serve.mjs` for **this one probe and nothing
  else**: no new route, no new query parameter, no new import, no new refusal vocabulary, no change to
  any existing response, and no `src/` file other than this one. **Any further `src/` reach by this
  milestone needs its own ADR**, and the fact that ADR-011 granted one does not make the next one
  cheaper. A milestone that edits `src/` twice on one licence has widened an invariant by instalments.
- **5. WHAT THE OPERATOR IS OWED IS A STATED FAILURE, and its WORDING is DESIGN's, not this ADR's.**
  `47/01 tasks/00`'s `@uat` scenario (`:267`) already asks whether *"Open failed"* is the right statement
  for this case, and F-47-01-QA-1 carries it. That question is now answerable with a real code behind it:
  the cause is `workspace-not-local`, i.e. *not checked out here*, which is more specific — and more
  actionable — than a generic failure. DESIGN rules the words; this ADR rules only that a refusal happens
  and which code it carries.
- **REJECTED: pushing the probe into `serveBoard`.** Wrong layer, measured: every other caller resolves
  `projectDir` locally and cannot receive a foreign path, so this would change `aof work ui` and six
  suites to fix a fleet-only fact. `serveBoard`'s one precondition stays what it is.
- **REJECTED: leaving it, and re-causing the feature row.** It trades a real, operator-visible product
  defect — the F-45-04-1(a) class arriving from a second direction, inside the story chartered to close
  that class — for a green lane, and it keeps a per-click port leak. The task header's *"the resolver's
  refusals are INPUTS to this task"* is a true statement about the CLIENT's obligations and does not
  license the face to be wrong about which refusals exist; an input that is counterfactual is not an
  input, it is a fixture.
- **REJECTED: a new `board-url-failed` code for this cause.** Clause 2. `board-url-failed` remains the
  route's catch-all for a genuinely unexpected launch failure and keeps its 5xx; it is not the name of a
  condition the face can predict and has already named.
- **The condition that would overturn this:** the fleet gaining the ability to open a REMOTE board — a
  board served by the node that owns the checkout, reached across the mesh. Then "not on this machine"
  stops being a refusal and becomes a routing decision, `workspace-not-local` becomes the wrong answer
  for a reachable-but-remote row, and this ADR is superseded rather than quietly relaxed. TECH_DEBT item
  31's "which project's board?" question is adjacent to that and stays open.

**Consequences.**
- The operator never lands on a board that cannot serve its own stream. The fleet's ONE door tells the
  truth as well as being the only door.
- The two routes on this face that resolve a workspace row now answer the same question with the same
  code, in one vocabulary, against the same fixture (`workspaceIdGone` already produces
  `workspace-not-local` on the assign route — no new fixture work).
- The per-click board-server leak for un-openable cards stops, because the launch is never reached.
- `47/01 tasks/00` scenario 5 row 2 **stands**, with its answer cell corrected to `409
  workspace-not-local`; `47/01 tasks/01` scenario 3 goes green with it, its only failing conjunct being
  *"task 00's whole feature is green in this same run"* (its own independent Thens pass today, measured).
- **Fitness function — an EXTENSION of `acd-fleet-board-link-resolved`** (ADR-006(a)'s own file; not a
  new file, and not `acd-fleet-assign-targets-item-workspace`, whose subject is the mint): **every route
  in `mesh-ui-serve.mjs` that resolves a `workspaces` row and then CONSUMES its `projectRoot` must probe
  reachability first and refuse `workspace-not-local`/409.** Stated over all such routes rather than over
  the two that exist, so the THIRD one is caught on the day it is written — which is the whole reason
  this defect is being ruled rather than patched. Its non-vacuity half is that the sweep finds **both**
  of today's routes.

---

## ADR-012: The "filtered by" CHIP is **R0 in the page**, and R0's defining property is **POSITION, not container** — it is hoisted ABOVE the loading/error/empty/populated ternary. ADR-007's REJECTED *"a chip in the page body, above the regions"* is superseded ON ITS OWN GROUNDS, because its rejection reason was INVISIBILITY and invisibility was a property of the POSITION, never of the container. The CONTROL stays in the shell's slot unconditionally and is what discharges the always-visible obligation; the "two places that can disagree" risk is closed harder than ADR-007's own remedy would have closed it, by ONE derivation feeding both — measured, not asserted

**Status:** Accepted
**Date:** 2026-08-11

**Supersedes** ADR-007's fifth REJECTED alternative — *"a chip in the page body, above the regions"* — and
**nothing else in ADR-007**. Every one of ADR-007's decision clauses is honoured verbatim by the build and by
this ADR: the control in the slot, mounted in every page state; the in-body line RE-HOMED and not duplicated;
the chip resolving the id to a name with the id in `title`; the chip's own clear affordance; the empty state
naming every narrowing in the order applied; and the rejection of a chip painted by the shell. ADR-007 is not
edited beyond a dated pointer at the superseded bullet — **ADR-010's precedent, correcting by ADDITION rather
than rewriting history**.

**Context — this is a RECORD defect, not a build defect, and it arrives by a mechanism the previous three
instances did not use.** F-47-03-ARCH-1. `DESIGN.md:680-697` moved the chip into the page as **R0** with
three measured reasons, downstream of an Accepted ADR that rejected that position BY NAME, and no entry was
made where the decision lives. The build followed DESIGN and **is right**. So `ARCHITECTURE.md` has been
reading as though it contradicts a green, correct build, and nothing surfaced it: the previous three
instances of this milestone's dominant species were refine-time claims never executed against the thing they
described; this one is a *later document overriding an earlier decision through a channel that leaves no
trace where the decision lives*. **Every claim below is measured at source on 2026-08-11, and the two
properties the tree does NOT yet carry are stated as owed rather than asserted — this ADR is not becoming the
fifth instance.**

DESIGN's three reasons, restated as its own and not re-invented here (`DESIGN.md:680-691`):
1. **The bar already says it.** The picker trigger's own label IS the picked repo, so a chip beside it says
   the same word twice, ~40px apart — m45's wordmark ruling verbatim.
2. **The chip's job is to explain an EMPTY page, and the page is where the emptiness is.** A statement that
   lives in the chrome explains the chrome.
3. **The bar has no room.** DG-47-4 is about exactly the 40px band at 390, and a chip would be its sixth
   element.

**WHY THE BUILD IS RIGHT, and it is not a matter of taste: ADR-007's rejection reason is cured by POSITION,
and ADR-007 attributed it to CONTAINER.** ADR-007 rejected the in-body chip on one ground — *"It is where the
current line lives, and it is invisible in exactly the state SPEC cares about."* That invisibility was real
and it was **not a property of the page body**. It was a property of the position: the line was the first
child of `GlobalScopeView`, i.e. **inside the populated branch of the state ternary**, so it vanished in
loading, error and empty. Measured at source:

**A note on the citations below, because this file is under active build and the numbers moved WHILE this ADR
was being written** (47/03's fix pass landed 17 lines above the seam between two readings): **every claim here
is stated over SYMBOLS — `<FilterBanner>`, the state ternary, `repoNarrowingView`, `filterBannerView`,
`TopBar`, `<RepoPicker>` — and the line numbers are a reading of 2026-08-11 at the second measurement, offered
so a reader can find the symbol, not as the fact itself.** A citation that drifts is a nuisance; a claim that
depends on a line number is a defect, and this milestone has already collected a dangling one
(F-47-01-ARCH-F6).

- **`Fleet.tsx:575` renders `<FilterBanner>`; `Fleet.tsx:577` opens `state === "loading" ? …`.** The banner
  **precedes** the ternary, so it is mounted in loading, error, empty and populated alike — which is
  ADR-007's own §Consequences sentence (*"present in the loading, error, empty and populated states alike"*)
  satisfied **verbatim**, by a different mechanism than ADR-007 chose.
- **The line ADR-007 was fixing is GONE, not duplicated.** `Fleet.tsx:855-861` carries its epitaph exactly
  where it used to open the populated region, and records that the raw `<workspaceId>` it printed is
  deliberately not carried across. ADR-007 clause 3 is honoured, not weakened.
- **The precedent ADR-007 itself cited is a POSITION claim, not a container claim.** m34/ADR-006's invariant
  pins `<ScopeControl>` above the state ternary *"not inside a body region that swaps out under
  load/error/empty"* — words about **swapping**, not about the bar — and its gate asserts exactly that shape:
  `test/arch/acd-mesh-ui-scope-visible.test.mjs:54`, `stateTernaryIndex > topBarCallIndex`. ADR-007 read the
  precedent correctly and then bundled two properties into one decision: *in the shell slot* and *above the
  state swap*. **Only the second is load-bearing for ADR-007's own stated reason**, and the build kept it.

**And the property the slot DOES still own, which is why this is a SPLIT and not a move.** The
always-visible obligation is discharged by the **CONTROL**, not by the chip. `<RepoPicker>` is inside
`TopBar` (`Fleet.tsx:706`), `TopBar` has no conditional return (`:684`) and is rendered at `:559`, above the
ternary. The banner, by contrast, is **conditional** — `FilterBanner.tsx:59` returns `null` when nothing is
narrowed, so it is absent and zero-height rather than a reserved blank band. It **may** be conditional for
exactly one reason, which the file states at `FilterBanner.tsx:23-27` and which this ADR now makes an
invariant: DG-20 forbids an absence that becomes a covert signal, and it does not bite here **only because
the control states the filter's state at all times, in all four page states**. If the control were ever
allowed to disappear, this licence falls with it.

**HOW THE "TWO PLACES THAT CAN DISAGREE" RISK IS STRUCTURALLY CLOSED — the real content of ADR-007's
objection, verified at source rather than assumed.** ADR-007's clause 3 gave one mechanism for it (one
container) and this ADR replaces that mechanism with a stronger one (one derivation):

- `Fleet.tsx:505-506` — `resolved = resolvedRepoName(narrowed, repo)` and `served = narrowed?.workspaceId ??
  null` are read **ONCE**, and the source says why in its own words (*"they are the same two facts, and
  deriving them twice is how a bar and a page start disagreeing"*, `:503-504`).
- `Fleet.tsx:512` — `repoView = useMemo(() => repoNarrowingView(repo, resolved, served), …)` is the **ONE**
  derivation of `{ form, label, title }`. `repoNarrowingView` (`Fleet.tsx:251-274`) is the only place the
  five forms — `none` · `resolved` · `unresolved` · `unknown` · `out-of-scope` — are decided.
- `Fleet.tsx:563` hands that object to `TopBar`, which at `:706` hands `repoView.label` / `repoView.form` to
  `<RepoPicker>`. `Fleet.tsx:519` hands **the same object** into `filterBannerView({ …, view: repoView })`,
  which at `:326-328` passes `view.label` / `view.form` / `view.title` through **verbatim** and derives none
  of them.
- **Graph-cited as actual structure** (`aof graph build .` over the project root, 2026-08-11T17:54:56.426Z,
  9,580 nodes / 23,162 edges, `egress: none`; `aof graph impact` read back per file, **no file under review
  reported `present: false`**): `ui/src/fleet/FilterBanner.tsx` ← **1** (`Fleet.tsx`) → **1**
  (`RepoPicker.tsx`, for the `RepoFilterForm` type alone). **The banner imports nothing from the one home**
  — it cannot re-derive what it renders, because it holds no narrowing vocabulary at all. That is ADR-001's
  `[Feasibility-2]` presentational-child clause doing structural work rather than merely permitting a file.
  (`Fleet.tsx` ← 2 → 20, up from → 14 at refine: the three extractions are fan-out bought with line count,
  which is the trade `acd-ui-surface-file-budget` asks for.)

**One container is a promise that two renderers agree. One derivation is a construction in which they
cannot.** The container was never what was carrying the property.

**WHAT THIS ADR REFUSES TO CLAIM, stated because the milestone's dominant defect is a record that runs ahead
of its tree.** The **scope** half is **not** single-derived and this ADR does not pretend otherwise. The
bar's `<ScopeControl>` renders the operator's `scope` state (URL-derived, `Fleet.tsx:560`), while the
banner's `scopeLabel` reads the **payload's** own scalar (`filterBannerView`, `Fleet.tsx:296` —
`narrowed?.scope ?? scope`). Those are two different facts **on purpose** — a `--local`-started server
narrows with no `?scope=` in the URL at all (ADR-005), and the source says so at `:292-295` — but it means
the one-derivation property proved above is true of the **repo** narrowing and **not** of the scope
narrowing, and the record must not round that up. It is also precisely where **F-47-03-ARCH-2** sits (the
empty copy recovering the scope from a presentational label's nullness rather than from `payloadScope`),
which is routed to 47/03's fix pass and is **not** closed by this ADR.

**Decision.**
- **1. THE CHIP'S HOME IS THE PAGE, AS R0, AND R0'S DEFINING PROPERTY IS POSITION.** It is rendered inside
  `Fleet()` **above** the loading/error/empty/populated ternary, and it may never be moved inside a branch of
  it. That sentence is the invariant; "R0" is merely its name. A chip inside a swapped branch is refused at
  review whatever container it sits in — which is ADR-007's rejection preserved in the only form that was
  ever load-bearing.
- **2. ADR-007's REJECTED *"a chip in the page body, above the regions"* IS SUPERSEDED ON ITS OWN GROUNDS,
  and nothing else in ADR-007 is.** What that bullet actually rejected was the CURRENT LINE's position,
  described by its container; its reason — invisibility in three of four page states — is answered by clause
  1 rather than waived. The alternative stands rejected for any chip that sits inside a swapped branch, and
  clause 1 forbids exactly that chip.
- **3. THE CONTROL STAYS IN THE SHELL'S SURFACE SLOT, UNCONDITIONALLY, AND THAT IS STRENGTHENED HERE RATHER
  THAN WEAKENED.** ADR-007's slot clauses bind **the control**. Its always-visible mount is now load-bearing
  for a second reason: it is what licenses the banner's conditionality under DG-20. **A conditional control
  would break both ADRs at once**, and that is the one change in this area that must be refused outright.
- **4. ONE DERIVATION FEEDS BOTH — this is the structural content of ADR-007's "re-homed, not duplicated",
  and it replaces "one container" as the mechanism.** `repoNarrowingView` is the ONE place the filter's
  rendered form, label and title are decided; the bar and the page each **receive** it and neither
  re-derives it. A second derivation of form/label/title — in the banner, in the picker, in a region, or in
  a helper named for the chip — is refused at review, and a presentational child that imports the one home
  in order to re-derive them is the same violation wearing an import.
- **5. THE NOTICE RIDES WITH THE CHIP, and one rule governs both.** ADR-010 clause 4 placed the
  partial-intersection notice *"beside the chip, in the shell's surface slot"*; the chip is in the page, so
  **beside-the-chip resolves to R0** and the notice is **R0-N** (`DESIGN.md:693-697`; derived at
  `Fleet.tsx:310-337` inside `filterBannerView`, rendered by `FilterBanner.tsx`). ADR-010 clause 4's SUBSTANCE is untouched — a
  notice rather than an empty state, visible, naming which narrowing removed what; only its address moves,
  and it moves **with** the chip by construction. If a later ruling returns the chip to the slot, the notice
  returns in the same change and the two are never split.
- **6. WHAT IS NOT RE-DECIDED HERE**, so this ADR is not read as wider than it is: the chip resolving the id
  to a NAME; its clear affordance; the empty state naming every narrowing; **REJECTED: a chip painted by the
  shell** (which now stands *more* firmly — `FilterBanner.tsx` is the fleet's own file, imports no shell, and
  the shell learns nothing about workspaces); and ADR-007's overturn condition, slot crowding, which still
  counts the fleet's four contributions (scope, repo control, legend, refresh) exactly as ADR-007 counted
  them, since the chip never joined them.
- **REJECTED: keeping the chip in the slot and calling DESIGN wrong.** On DESIGN's three measurements, none
  of which is taste: the same string rendered twice ~40px apart from one derivation; DG-47-4's 40px band at
  390 with no room for a sixth element; and a statement about the page's emptiness placed where the page is
  not. **An ADR is a record of a decision, not a constraint on reality** — ADR-010's own words for the same
  situation, one ruling up.
- **REJECTED: duplicating the statement — a chip in the slot AND a banner in the page.** ADR-007 clause 3
  forbade it and its reason survives this supersession completely intact; clause 4 above is what now makes it
  structurally hard rather than merely forbidden.
- **REJECTED: superseding ADR-007 wholesale, or re-issuing it as a corrected ADR.** Five of its six decision
  clauses are honoured verbatim by the tree. A wholesale supersession would put five correct clauses at risk
  of re-litigation to settle one rejected alternative, and it would discard the thing most worth keeping —
  **the reason the rejection existed**, which is now clause 1.
- **REJECTED: leaving the record alone because the build is right.** That is the defect this ADR exists to
  close and the milestone's dominant species. An ARCHITECTURE that reads as contradicting a green build costs
  the next author either a wrong "fix" back toward the ADR or an afternoon proving the ADR stale — and the
  wrong fix is the cheap one to make.
- **The conditions that would overturn this:** (a) the four state branches being hoisted out of `Fleet()`
  into a route-level component, at which point *"above the ternary"* stops naming a position and the
  invariant must be re-expressed against whatever the new swap point is — re-decided, not re-tuned; or
  (b) the shell growing a legitimate always-visible **statement band** of its own (as against a control
  bar), which genuinely reopens the container question — and which would owe an answer to the double-word
  problem the bar's own trigger label creates.

**Consequences.**
- `ARCHITECTURE.md`, `DESIGN.md` and the tree now agree about where the statement of narrowing lives, and
  the disagreement is **recorded** rather than reconciled by silence.
- The invisibility ADR-007 was written to prevent is now prevented by a fact a gate can check — source
  position — instead of by a container's habit.
- The two-places-can-disagree risk is closed by construction, and the closure is tighter than ADR-007's own
  remedy: two renderers of one memoised object cannot disagree even if a later author wants them to.
- **Fitness function — OWED, an EXTENSION of `acd-mesh-ui-scope-visible` (never a fifth file), and NOT YET
  WRITTEN, WITH A PREREQUISITE.** That gate already owns *"the control mounts above the state ternary"*, so
  it is the one home for *"the statement of narrowing mounts above the state ternary"*. Two assertions:
  (i) `<FilterBanner` appears in `Fleet()` **before** the state ternary — the same fact and the same shape as
  its existing `stateTernaryIndex > topBarCallIndex` (`:54`); and (ii) the repo control is inside `TopBar`
  and `TopBar` is unconditional, since clause 3 makes the control's unconditional mount the **licence** for
  the banner's conditionality. **The prerequisite is F-47-03-ARCH-4 and it is not optional:** that file
  slices `Fleet()` with a fixed `+ 4000`-character window whose second marker already sits **158 characters**
  from the cutoff, so a third marker added to that slice would be red-or-green by accident of file size
  rather than by position. The brace-balance fix is routed to 47/04; **these two assertions land after it, and
  writing them before it would be the sixth gate in this milestone to be wrong about the tree rather than
  about the rule.** Until then the position is pinned behaviourally only, by 47/03's four features (R0's
  position, weight and conditionality are laned) — which is coverage, not a ratchet, and this bullet is the
  record of that gap.

---

## ADR-013: `sessions` is ADR-004 **CASE 1 — narrowed by rule 1**, on the row's own `workspaceId`; no exemption is minted and the machine-wide list keeps its single entry. Recorded as **EVIDENCE the completeness ratchet works** — it fired, on the day it landed, on a collection put on the wire by a milestone whose author had never read ADR-004. And the `MeshSession.repo` / `?repo=` collision is **FLAGGED, not resolved**: it is m48's to answer, and m47 renames nothing

**Status:** Accepted
**Date:** 2026-08-11

**Extends** ADR-004 — its completeness rule gains its first APPLIED classification, and gains it for a
collection this milestone did not add. Neither ADR-004 nor any m48 ADR is edited.

**Context — measured, not reported.** `acd-fleet-filter-every-region` assertion 1 names **`sessions`** as a
collection on the `GlobalMeshStatus` wire that is *"NEITHER narrowed by `filterToWorkspace` NOR declared
machine-wide"*. Re-measured here before ruling, per-run isolated global home, by importing the `archTests`
array (2026-08-11 — **the first of two readings; clause 3 carries the second**): **5 GREEN / 1 RED**, and the
single red is exactly that message, naming exactly `sessions`. Nothing in m47 added the collection — **milestone 48 story 03 put it on the fleet payload** in a
working tree shared with this milestone, and the gate fired without its author having read ADR-004 or knowing
the rule exists.

**The citation chain, so the classification is CHECKABLE rather than asserted — and one pointer corrected.**
1. **m48/ADR-007:504-512** defines the fleet-side session index entry as
   `{ nodeId, sessionId, workspaceId, repo, assistant, lastPingAt, workspaceHasRun, workItem }` and calls it
   **self-sufficient** — *"a consumer answers 'what live sessions exist across the mesh' from this array
   alone, with no join back into `nodes[].presence`"*. `workspaceId` is its third key.
2. **m48/ADR-005** (its heading, and the frozen list at `:360`) freezes the presence session entry as the
   ORDERED SIX `{ sessionId, workspaceId, repo, assistant, lastPingAt, workspaceHasRun }` — so `workspaceId`
   is carried **on the row at its own producer**, not derived at the fleet.
3. **`ui/src/fleet/api.ts:219-228`** types `MeshSession` with **`workspaceId: string`** at `:222` — required
   and non-nullable on the row.
4. **`src/global-mesh-query.mjs:291-309`** constructs the entry and **`:294`** emits
   `workspaceId: session.workspaceId`; **`:537`** inserts `sessions: buildSessionIndex({ … }).sessions` as one
   additive top-level key on what `shapeGlobalStatus` returns.
5. **Pointer corrected, because a citation that lands on the wrong decision is worse than none:** the m48
   anchor for this classification is **ADR-007** (the index entry), with **ADR-005** behind it (the frozen
   six) — **not ADR-006**, which is m48's TTL / orphan-reaper ruling and says nothing about the entry's shape.
   The fact and the classification are unchanged; the reader now lands on the decision that carries them.

**Decision.**
- **1. `sessions` IS CASE 1 AND IS NARROWED BY RULE 1**, on the row's own `workspaceId`, at the ONE seam
  (ADR-004). It is **not** case 2 — its rows carry an identity, not a membership list; that is `nodes` — and
  it is **not** case 3. **No exemption is minted**: the declared machine-wide list keeps **exactly one**
  entry (`diagnostics.descriptorErrors`), earned by rows carrying a `path` rather than a workspace. The first
  collection ever to test that boundary did not widen it.
- **2. THE NARROWING IS A STRICT EQUALITY ON THE ROW'S OWN FIELD** — the same shape the other four
  collections already use (`scope.mjs:468-469`, `:497-498`). **A row that STATES no workspace does not
  survive, and that is the correct answer rather than a gap.** `global-mesh-query.mjs:294` passes
  `session.workspaceId` through from an unvalidated presence file, so the field is `string` on the wire and
  only as good as the record behind it; **ambiguity fails CLOSED** (m26/ADR-003 — the discipline the index
  itself already keeps at `:261` and `:272-273`). A filtered view must not show a session it cannot attribute
  to the repo it is filtered to.
- **3. THE TREE'S STATE, READ TWICE, BECAUSE IT CHANGED UNDER THIS REVIEW — and the record says which
  reading it is.** At the first measurement (2026-08-11, before this ruling was written) the ratchet was
  **5 GREEN / 1 RED** and `filterToWorkspace` narrowed five collections without naming `sessions`. **At the
  second measurement, taken after writing the clauses above, the narrowing had LANDED** — 47/03's developer
  shipped it concurrently — and the whole gate is **7 GREEN / 0 RED**. As read at source: `scope.mjs:487`
  narrows `sessions` on `session?.workspaceId === workspaceId`, and `Fleet.tsx:357` coerces it in
  `asGlobalStatus` (its comment citing F-47-01-ARCH-F2 by name). Clause 2's own consequence is carried by the
  `?.` and the strict `===`: a row that states no workspace does not survive. **This clause is written this
  way on purpose.** A ruling that says "not yet implemented" over a tree that now carries it, and a ruling
  that claims an implementation it has not read, are the SAME defect in opposite directions — the species
  this milestone has hit four times. Both readings are stated, with which is which.
- **4. WHAT THIS DOES NOT DECIDE, because a session is m48's concept and not m47's to invent:** whether the
  fleet **renders** sessions, in which region, with what marker. ADR-004 governs the NARROWING of every
  collection on the wire; it does not oblige a region to exist. `sessions` has no region on this surface
  today and this ADR creates none.
- **5. RECORDED AS EVIDENCE THE MECHANISM WORKS — and this is the half worth keeping past the milestone.**
  ADR-004's stated purpose was that *"a NEW region added later is narrowed on the day it is added, without
  its author knowing this rule exists. That last property is the whole point."* Measured: a collection added
  by **another milestone**, in a shared tree, by an author who had **not** read ADR-004, was caught **on the
  day it landed**, named by field, with the three-way classification and the refusal-to-widen-the-exemption
  stated in the failure message that author actually reads. The property was bought and then collected,
  against the only test case that counts — an author who did not know. It is also the counterweight to this
  milestone's four *"the record ran ahead of the build"* findings: here the **structure** ran ahead of the
  record, correctly, and the record is catching up.
- **6. THE VOCABULARY HAZARD IS FLAGGED AND NOT RESOLVED. NOTHING IS RENAMED HERE.** `MeshSession.repo`
  (`api.ts:223`, sourced at `global-mesh-query.mjs:295` from m48/ADR-005's frozen six) is **a field on a
  session row**. m47's `?repo=` is **the URL key for the operator's word for a workspace**, resolved to a
  `workspaceId` and translated exactly once at the URL boundary inside the one home (ADR-001's vocabulary
  clause; ADR-003). **Two facts wearing one name on one surface is TECH_DEBT item 0.2's shape**, and ADR-001
  already draws the line this crosses: *"Two names for one fact is what item 0.2 of TECH_DEBT is about; one
  name at each boundary with one documented crossing is not."* This is the inverse and it is worse — **one
  name for two facts, on one payload**, where a reader meeting `session.repo` beside `?repo=` has no way to
  tell which question they are answering. **It is OWED to m48's author, before both milestones ship**: cheap
  now (the index is days old and has one consumer), expensive after. **m47 renames nothing** — `MeshSession`
  is m48's type and `repo` is its producer's own field name back to the presence record, so a unilateral
  rename by the filtering milestone would be exactly the cross-milestone silent override this milestone has
  already been bitten by four times. The decision is m48's; this ADR's only obligation is that it is not made
  **by default**.

**Consequences.**
- The ratchet's red becomes a classification **decided** rather than a gate **widened**;
  `acd-fleet-filter-every-region` assertion 1 goes green with 47/03's narrowing and remains a total statement
  over the wire type rather than a list kept by hand.
- Any region that ever renders a session inherits the narrowing for free (ADR-004's one seam), so m49 does
  not have to know this ruling exists — the same property, collected a second time.
- **Fitness function — NONE IS ADDED, deliberately.** `acd-fleet-filter-every-region` assertion 1 already
  asserts exactly this, off the wire TYPE, and it is the assertion that produced the finding. A gate
  re-asserting *"`sessions` is narrowed"* by name would be the ratchet's own duplicated home and would go
  stale the day the field is renamed. What this ADR adds is the classification the ratchet's message asks
  for, which is not a thing a test can supply.
- The vocabulary collision is carried as an **OPEN cross-milestone obligation on m48**, not as an m47 change.

---

## ADR-014: Region 5's attention cluster has **THREE** children, not two. The third enters as a **SUBTRAHEND** against the row — it does not reorder the ladder — and DG-19's ladder gains ONE rung: the secondary token gives up its WORDS, keeping its pinned glyph and its count. Every threshold is re-derived from **ONE row, the grid's own floor (286px)**, because the card is NOT viewport-invariant; `REGION5_CHIP_SLOT_BUDGET_CH` and `REGION5_DRILLIN_ABBREV_AT_CH` were derived from the 360.66px row the card takes at exactly one viewport, and they move DOWN. The drop decisions leave their two call sites for the ONE home ADR-008 already named — because two independent booleans cannot express one ladder

**Status:** Accepted
**Date:** 2026-08-12

> **Number collision, stated once so nothing downstream mis-cites it.** Every OTHER mention of "ADR-014" in
> this document — `ADR-014/E3` (rationale may not be deleted to meet a ratchet) at §Codebase health, and
> `m43/ADR-014 E7` (suite registration) at §Fitness functions — is **milestone 43's** ADR-014, verified at
> source 2026-08-12. This is m47's, and it is the only one in this document's own decision log.

**Context.** F-47-04-QA-8 (VERIFICATION §"F-47-04-QA-8", raised by QA, re-measured by the verify session):
`Open board` renders a fragment of itself on a filtered card, and the chip tail is cut. QA's cause — that
`abbreviateDrillIn` (`Fleet.tsx`, `GlobalMilestoneCard`) and `slotFits` (`AssignmentChip.tsx`,
`AssignmentChip`) both model a **two-child** cluster `[chip][drill-in]` while the cluster has **three**
whenever `assignment && (inReview > 0 || isDone)` (`Fleet.tsx`, `secondaryAttention` / `attention`) — is
correct, and it is not the whole of it. **The budget model needed re-measuring, not patching**, so this ADR
re-derives it and says exactly how.

### What was measured, and how

Measured **2026-08-12** with headless Chromium 1234 (`ms-playwright/chromium-1234`, `--headless=new
--hide-scrollbars --dump-dom`) against the **shipped** stylesheet `ui/dist/assets/index-B-z8BBaF.css`
(built 23:58 on 08-11, i.e. after the newest `ui/src` edit at 23:41 — so it is the tree's own CSS, not a
stale one). Region 5's DOM was reproduced **verbatim** from `GlobalMilestoneCard`'s footer, `AssignmentChip`
and `BoardDrillIn`, inside the real page hierarchy (`GlobalScopeView`'s `px-4 py-7 sm:px-8` →
`max-w-[1240px]` → `MilestonesList`'s `grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4` → the card's
`border` + `p-4`), and every element's **rendered box was compared to its own content box**. Nothing below is
restated from the record; each number is re-derived here.

**1. The row's width, and the fact that decides this whole ADR.** The card's content box is
`track − 2 (border) − 32 (p-4)`. Measured across viewports:

| viewport | columns | grid track | **region 5's row** |
|---|---|---|---|
| 390 | 1 | 358 | **324** |
| 720 / 1056 (the n-column onset) | 2 / 3 | **320** | **286** |
| 768 | 2 | 344 | **310** |
| 1024 | 2 | 472 | **438** |
| 1280 | 3 | 394.66 | **360.66** |
| ≥1304 (container capped at 1240) | 3 | 402.66 | **368.66** |

Three things fall straight out of that table and each is load-bearing:

- **The card is NOT viewport-invariant.** `GlobalMilestoneCard`'s own row-1 comment says it is (*"a wider
  viewport buys COLUMNS rather than width … a ~300–370px band"*); the measured band is **286…368.66**, a 29%
  spread, and the comment's conclusion (never key form to the viewport) is right for a reason stronger than
  the one it gives — **1024 yields a WIDER card (438) than 1056 (286)**, so a viewport-keyed ladder would
  paint the widest form in the narrowest card. That is measured, not reasoned.
- **The floor is exact and reachable: 286px.** `minmax(320px, 1fr)` guarantees a track is never under 320,
  and at every column onset it is *exactly* 320 — at viewport 352, 720 and **1056**, all real window widths.
- **`REGION5_CHIP_SLOT_BUDGET_CH` and `REGION5_DRILLIN_ABBREV_AT_CH` were derived from 360.66px** —
  `assign-affordance.mjs` says so in terms (*"Region 5's own row is the same 360.66px"*), and I measured
  360.66 at 1280 exactly. **That row exists at one viewport.** A budget derived from it is not a budget; it
  is a description of one screenshot. This is the same species as every other finding in this milestone: a
  claim never executed against the thing it describes.

**2. The row's occupants, intrinsic px** (`white-space: pre` probes in the same ramps the row uses):

| occupant | px | note |
|---|---|---|
| pill, widest label (`assigned` / `accepted`) | **83.59** | `assign-affordance.mjs`'s "~80px" — confirmed |
| chip inner `gap-1.5` / cluster `gap-3` | **6** / **12** | one cluster gap per boundary |
| `→ umamis-mac-mini` (17ch, mono `text-[11px]`) | **102.83** | advance **6.048px/ch**, exact: 41ch = 247.97, 31ch = 187.48, 28ch = 169.34, 13ch = 78.63 |
| the tail ` · 18d ago` (10ch) | **60.48** | QA's "60px" — confirmed, independently |
| `Open board` / `Opening board...` / `Open failed` | **65.06** / **91.13** / **63.27** | QA's "65px it needs" — confirmed |
| the pinned ` →` | **13.66** | `BoardDrillIn`'s `min-w-3.5` (14px) is sized to it |
| `◔ 18 in review` / `✓ accepted` | **76.55** / **60.22** | the THIRD child, unbudgeted anywhere today |
| `◔ 18` / `◔ 188` / `✓` | **26.23** / **32.70** / **9** | the abbreviated forms this ADR introduces |

**3. The defect, worse than filed, and present at EVERY width.** With three children nothing fits at any row
the card ever takes, and CSS reaches for two escapes the contract forbids:

| row | `Open board` rendered / needed | tail rendered / needed | **row height** |
|---|---|---|---|
| 368.66 (≥1304, filtered, `◔ 18 in review`) | **1.83 / 65.06** | 60.28 / 60.48 | **45px** |
| 360.66 (1280, filtered) | **0.34 / 65.06** | 55.28 / 60.48 | **45px** |
| 324 (390, filtered) | **0.34 / 65.06** | 27.13 / 60.48 | **45px** |
| 310 (768, filtered) | **0.34 / 65.06** | 16.38 / 60.48 | **45px** |
| 286 (the floor, filtered) | **0.34 / 65.06** | **0 / 60.48** | **45px** |

- The **45px** column is a second, unfiled defect: the secondary token carries neither `shrink-0` nor
  `whitespace-pre`, so it **WRAPS**, and region 5 becomes a two-line row on a card whose rhythm A10 makes
  binding geometry (*"nothing here can change the row's height or rhythm"*). Measured per element at 360.66:
  the secondary box is **h=32** while every sibling is 14.66 (the chip's mono halves), 16 (the drill-in) or
  22 (the pill) — it alone is two lines, and it drives the cluster to 32 and the row from **35 to 45**. It
  wraps in the `✓ accepted` frame too, where its own natural width is only 60.22.
- The protected `→ <target>` — the one thing clause 5 says yields LAST — is **truncated while lower-ranked
  elements still render**: 100.78 of 103 at the floor, and 105.63 of 194 in the already-abbreviated
  three-child frame. The ladder is not merely failing to engage; it is running backwards.
- **The two-child cluster is broken too, at the narrow rows only**: `Open board` renders 7.63 of 65.06 at
  286 and 31.55 of 65.06 at 310. And **today's in-flight state overflows even at 1280** — `Opening board...`
  renders 82.11 of 91.13 — because nothing reserves the drill-in's longest label, which is DG-13 clause 1's
  own defect one element to the right.

### Decision

**1. THE THIRD CHILD IS A SUBTRAHEND, NOT A RUNG — and the ladder separately gains one rung at the END.**
Cluster ARITY changes the *budget* every existing rung is compared against; it does not change *who yields
first*. DG-13 clause 5, DG-16, DG-19, DG-20 and DG-22 are **extended, not re-decided**: no existing pairwise
ordering moves. The full YIELD ORDER, with the new rung named:

| # | element | behaviour under pressure | where it survives |
|---|---|---|---|
| 0 | the workspace **name** | dropped WHOLE with its separator — unconditional under the filter (ADR-008 / DG-47-2), else at `REGION5_NAME_BUDGET_CH` (**unchanged, still 8**) | the Workspaces strip + R0's banner |
| 1 | the chip's **`· when · note` tail** | ~~dropped WHOLE — never ellipsised to `· just…` (DG-19)~~ → **SUPERSEDED 2026-08-12 by DG-47-7, THIS CELL ONLY: NOT RENDERED AT ALL.** The rung keeps its number and its budget (`REGION5_CHIP_SLOT_BUDGET_CH`, which rung 2 fires on) and loses only its element. The designer's reason is the stronger form of rung 3's: the tail is the one occupant whose state set is `{whole, absent}`, so its PRESENCE becomes a covert signal for node-id length — DG-20's error. This ADR's arithmetic says it cannot fit; DG-47-7 says it may not sit on a row where fitting is a signal | the chip slot's `title`, now unconditionally and as the SOLE carrier |
| 2 | **`Open board`'s WORDS** | dropped WHOLE, the pinned `→` kept, in **every** state (DG-19, DG-47-5) | the span's `title` **and** the button's `aria-label` (DG-47-5 clause 5) |
| 3 | **NEW — the secondary token's WORDS** | `◔ N in review` → **`◔ N`**; `✓ accepted` → **`✓`**. The glyph is pinned, the COUNT survives, the words move to `title`. Never dropped whole, never ellipsised | its own `title` |
| 4 | the chip's **`→ <target>`** | yields LAST, truncating INSIDE its own box, and never overprints (clause 5 + clause 6) | the chip slot's `title` |

**Why rung 3 sits BELOW the drill-in's words and not above.** Both degrade to a pinned glyph, so the choice
is which loss costs the operator less. The drill-in's words are recoverable in **two** channels DG-47-5 just
built (`title` on the span, `aria-label`+`title` on the control), its degraded `→` still reads as a
navigation affordance, and dropping them recovers the single largest reservation on the row (**91.13px** —
more than any other rung buys). The secondary's degraded form still carries **the fact itself**, the count.
Placing rung 3 last also keeps the row's behaviour continuous with the two-child cluster it already has: the
new rung is reached only when the existing ladder is exhausted.

**The secondary token becomes `shrink-0 whitespace-pre` in BOTH forms, and that is part of this rung, not a
tidy-up.** It is the same shape DG-15 already ruled for the target and DG-16 for the name: an element on this
row either renders whole or takes its discrete drop — it may not silently absorb the squeeze, and an element
that can wrap absorbs it in the one dimension A10 forbids. The abbreviated form carries the words in `title`,
which is the ladder's own recovery idiom at every other rung.

**Why the secondary is NOT dropped whole, which is the obvious cheaper edit.** Absence-of-token would become
a covert signal for *"this card's node id is long"* — **DG-20's own named error at a fourth address**, and
this milestone has already refused it twice (ADR-008's `!!assignment && (repoFiltered || overBudget)`
rejection; DG-47-2's discharge). The glyph-plus-count form is the house idiom, already spent three times:
DG-19's drill-in, and DG-47-4's `⟳` and `◷`. It is not a new mechanism.

**2. EVERY THRESHOLD IS DERIVED FROM ONE ROW — `REGION5_ROW_FLOOR_PX = 286` — and the arithmetic is written
into the module.** 286 = **320** (the grid's own `minmax(320px, …)` floor, which is the narrowest track the
page can produce) − **2** (the card's `border`) − **32** (the card's `p-4`). Not a viewport. Not a
screenshot. A rule that holds at one width is not a rule, and the measured 286…368.66 band is where 41 and
31 came apart.

The derivation, which the developer implements verbatim (px ceiled to the whole pixel — conservative; ch
floored — the house idiom `ASSIGN_MESSAGE_BUDGET_CH` already uses):

```
base   = PILL(84) + CHIP_GAP(6) + CLUSTER_GAP(12) × (children − 1) + DRILLIN_GLYPH(14)
       + (secondary ? SECONDARY_WORDS(77) : 0) + DRILLIN_WORDS(92)
ch(px) = max(0, floor((286 − px) / 6.048))
```

`DRILLIN_WORDS` is **92 = ceil(91.13) — the LONGEST of the three labels (`Opening board...`)**, not the
resting one. That is DG-13 clause 1's rule applied one element to the right, which is the same borrowing
`BoardDrillIn`'s own floor already makes from clause 2, and it is what stops the row reflowing on click. It
is also what the measurement demands: without it the in-flight state clips at 1280 today.

Walk the rungs in order, each firing only if the previous state does not fit; the target's budget is
recomputed after each:

| cluster | rung 1 — tail drops when | rung 2 — words drop when | rung 3 — secondary abbreviates when | rung 4 — target's own budget |
|---|---|---|---|---|
| **two children** (no secondary) | `→ <target><tail>` > **12ch** | `→ <target>` > **12ch** | — | **28ch** |
| **three children** | always (budget is **0ch**) | always (budget is **0ch**) | `→ <target>` > **13ch** | **20ch** |

Every one of those numbers is the formula's output, and each was confirmed against the render: the
two-child abbreviated frame at 286 gives the target **170.41px = 28.2ch** (derived 28); the three-child
abbreviated frame gives **132.17px = 21.9ch** (derived 20, conservative by the ceilings); the three-child
frame with a 10ch target keeps its secondary whole and fits at the floor with room (264.28 of 286).

**The module's export surface after this, so nothing below is re-specified downstream.**
`ui/src/fleet/assign-affordance.mjs` (+ its `.d.mts`) gains the measured px facts —
`REGION5_ROW_FLOOR_PX` 286, `REGION5_MONO_ADVANCE_PX` 6.048, `REGION5_PILL_PX` 84, `REGION5_CHIP_GAP_PX` 6,
`REGION5_CLUSTER_GAP_PX` 12, `REGION5_DRILLIN_WORDS_PX` 92, `REGION5_DRILLIN_GLYPH_PX` 14,
`REGION5_SECONDARY_WORDS_PX` 77, `REGION5_SECONDARY_MARK_PX` 33 — each carrying, in its own comment, the
string it was measured from and the fact that the re-measurement instrument is a render, not the suite.
`REGION5_CHIP_SLOT_BUDGET_CH` and `REGION5_DRILLIN_ABBREV_AT_CH` **keep their names and their role as the
suite's read-back handles** (they are what the ratchet lane reads) and become the two-child outputs of the
formula, 12 and 12; the three-child budgets and the target's 28/20 are returned by the function rather than
exported as four more literals, because they are one derivation and four constants could drift apart.
`region5NameDropped` is unchanged.

**3. `REGION5_CHIP_SLOT_BUDGET_CH` (41) AND `REGION5_DRILLIN_ABBREV_AT_CH` (31) MOVE DOWN, AND THEY BECOME
OUTPUTS RATHER THAN LITERALS.** 41 assumed a slot of ~245px; the row has **79.62px** for it at the floor,
and 41ch (247.97px) needs a row of **428px** — wider than the card is at any viewport, so the constant was
never satisfiable. 31 needs 302.73px against a floor of 286. Both were true only of the 360.66px row.
**Every constant moves in the DROP direction and none moves up** — this is a TIGHTENING, and ADR-008's *"no
budget is relaxed to collect the freed width"* is honoured, not weakened: nothing that drops today renders
after this change.

**A consequence that must be said out loud rather than discovered: at the floor row the chip's tail cannot
render at all.** `→ <target> · <when>` is ~22ch for the shortest real node id and the two-child budget is
12ch. **The tail's rung is DG-19's** — *"each step of region 5's priority list is a DISCRETE budgeted drop,
not a shrink factor"*, closed with `REGION5_CHIP_SLOT_BUDGET_CH` as the tail's own budget
(`38/DESIGN.md:1559-1570`, echoed verbatim in `assign-affordance.mjs`'s DG-19 banner immediately above that
constant's declaration — cited by symbol because the module moved ~90 lines under this ADR the same day) —
it keeps its
`title`, and the alternative measured today is a 0-to-27px fragment of it. **Whether an element that in
practice never renders should remain a member of region 5 is DESIGN's call, not mine** — returned as a patch
block, not decided here.

> **CORRECTED 2026-08-12, same day, by the designer at source — a straight citation error, so it is fixed in
> place rather than superseded.** This paragraph first cited the tail as *"DG-13 clause 5's own lowest-ranked
> element (`all else`)"*. Both halves are wrong and I verified the correction at source before making it:
> DG-13 **clause 4** is region **6**'s message-slot COPY priority (*"Copy priority: **outcome > holder > all
> else**"*, `38/DESIGN.md:492`), and DG-13 **clause 5** is region 5's WIDTH priority (*"chip label +
> `→ <target>` in FULL > `Open board →` > the workspace name"*, `38/DESIGN.md:494`) — **it never names the
> tail at all**. Recorded rather than silently edited because it is this milestone's own signature species
> arriving in my own ADR: a citation carried across documents that nothing checks (STATE §Feedback has it
> twice already, once with the PO as the carrier). Nothing else in ADR-014 depended on it — the tail's rung,
> its budget and its arithmetic all come from DG-19 and are unchanged.

> **ANSWERED 2026-08-12 — DG-47-7 (the designer's ruling), and this ADR's §7 is CLOSED, not left open.** The
> question above is answered **retire the tail from region 5's membership**: it renders on the row at no
> width, the chip's `title` carries it in full, and `REGION5_CHIP_SLOT_BUDGET_CH` is **NOT** deleted because
> rung 2 fires on the same number. The reason is a rule about the row rather than about the arithmetic, and it
> is the stronger form of my own rung 3: the tail is the ONE occupant with no degraded-in-place form — its
> state set is `{whole, absent}` — so its mere PRESENCE becomes a covert signal for node-id length, which is
> DG-20's error and exactly what rung 3 refuses for the secondary token. My arithmetic says the tail cannot
> fit; DG-47-7 says it may not sit on a row where fitting is a signal. **The design ruling governs the
> membership; this ADR governs the budget, and neither is changed by the other.**

**4. THE DECISIONS LEAVE THEIR CALL SITES FOR THE ONE HOME ADR-008 ALREADY NAMED — and the reason is
structural, not hygienic.** `abbreviateDrillIn` (`Fleet.tsx`) and `slotFits` (`AssignmentChip.tsx`) are the
second and third instances of exactly the shape ADR-008 refused for the name drop, and they are worse than
untidy: **two independent booleans cannot express one ladder.** Rung 2's outcome changes rung 4's budget;
rung 1's outcome changes rung 2's. A decision taken in two components, each seeing one element, is
structurally incapable of being right — which is why the defect is a *class* of frame rather than a typo.

- **ONE derivation, in `ui/src/fleet/assign-affordance.mjs`**, beside the budgets it reads and next to
  `region5NameDropped`, exported as a single pure function of the row's inputs, returning every decision the
  row needs at once: whether the tail renders, whether the drill-in's words render, which form the secondary
  takes, and the target's budget. `region5NameDropped` **stays exactly as it is** and is called by it or
  beside it — ADR-008's clause is extended, not replaced.
- **The components become consumers.** `AssignmentChip` and `BoardDrillIn` receive the decision as **props**,
  exactly as `BoardDrillIn` already receives `abbreviated` (and for the reason its own header gives: *"the
  abbreviation is ONE decision … never re-derived per state"*). `GlobalMilestoneCard` takes it once.
- **The graph says this costs nothing** (`aof graph build .` over the project root, 2026-08-12T00:05:30.788Z,
  9,598 nodes / 23,232 edges, `backend: null`, `egress: none`; no file under review reported
  `present: false`, so the coupling is ACTUAL): `assign-affordance.mjs` ← **9** (7 suites + `Fleet.tsx` +
  `AssignmentChip.tsx`) → **0** — a pure leaf that **both** consumers already import, so the move adds **no
  new edge**. `BoardDrillIn.tsx` ← 1 → 0. `Fleet.tsx` ← 2 → 22.
- **`ui/src/fleet/assign-affordance.d.mts` grows with it.** It is a type-only file, so no import edge reaches
  it and the graph is silent about it — the same trap this milestone's own story-boundary guidance names.

**5. REJECTED alternatives, each with the arithmetic that refused it.**
- **REJECTED: measure the row at runtime** (`ResizeObserver` / a layout effect per card). It is the most
  accurate answer and it is refused on ADR-008's own ground: the geometry gate asserts **class/structure
  facts off a headless mount with no boxes**, so a runtime-measured ladder would be invisible to the one
  instrument that locks this contract — *"the test then drives the DECISION directly rather than inferring
  it from a rendered class name"*. It also puts an effect on every card of a 5s-polling page.
- **REJECTED: CSS container queries on the card.** Genuinely the right *instrument* for a row whose container
  varies — and refused for the same reason: the decision would live where `node:test` cannot read it, and
  `display:none` would leave dropped elements in the DOM that the existing lanes assert are ABSENT.
- **REJECTED: keying the ladder to the viewport.** Falsified by measurement, not by principle: **1024 → 438px
  row, 1056 → 286px row**. A viewport-keyed rung paints the widest form in the narrowest card.
- **REJECTED (for now): raising the grid's own track floor** so the row is wide enough for the current
  constants. It is the honest way to buy the headroom back — `minmax(382px, 1fr)` makes a three-child row
  carry `Open board` at every width, and 3 columns still fit at 1240 (3 × 382 + 32 = 1178 ≤ 1240) — but it
  changes the PAGE's column count at every mid width (768 would drop to one column), which is a layout
  decision this milestone does not own. **It is recorded with its arithmetic so the next author does not
  re-derive it**, and it is the answer if the designer judges the floor-derived row too austere at 1280+.
  **What is NOT the answer is raising a budget**, which is what the 2026-08-12 §Codebase-health entry and
  the ratchet lane exist to stop.
  [**ANSWERED 2026-08-12 — the designer ruled NO, and `minmax(320px, 1fr)` STANDS.** Recorded here so the
  lever is not re-proposed by the next reader of this bullet. Two reasons, and the second is the one my own
  arithmetic missed: **(a)** 382 buys only the TWO-child row — the floor that carries the THREE-child row
  with its words is **434px**, not 382; **(b)** a 434px floor yields **two columns at 1280**, where the
  milestone's own mocks draw **three**, and drops 768 to a single column. The lever cannot be pulled far
  enough to matter without contradicting the design baseline, which makes the floor-derived ladder the answer
  rather than the fallback. This bullet's "for now" is spent.]

**6. The condition that would overturn this.** The day the geometry harness can measure boxes — the day
`fleet-assign-row-geometry.test.mjs` stops being a class/structure gate — the ladder should be re-derived
**per container** rather than against the floor, and the conservatism this ADR accepts (up to 82px unused at
the widest card) is exactly what that change buys back. Until then the trade is deliberate: **a rule that is
right at every width, at the cost of being generous at some of them.**

### Consequences

- **The existing lanes this touches, named, and why it is an amendment rather than a loosening.** Four of the
  22 read the two constants back and must be amended in the same change (ADR-008's own test-updating rule,
  applied to itself): the **DG-19 maximum-pressure** lane (its `> REGION5_CHIP_SLOT_BUDGET_CH` guard stays
  true and stays green), the **DG-47-2 yield-order Outline** (its fixture guard `≤ REGION5_CHIP_SLOT_BUDGET_CH`
  goes red at 12), the **DG-47-5 NON-REST Outline** (it asserts `REGION5_DRILLIN_ABBREV_AT_CH === 31` and
  sizes two boundary fixtures to it), and the **ADR-008 ratchet lane** (it reads back 41 and 31). It is an
  **amendment** because every change is monotone in the drop direction — no element that is dropped today
  renders after it — and because the ratchet's actual subject, *a budget raised so a filtered row fits*, is
  preserved and strengthened: the lane now reads back numbers that are **derived** rather than picked.
  `REGION5_NAME_BUDGET_CH` does **not** move, so the DG-47-2 name lanes are untouched.
- **Any lane whose fixture renders a three-child cluster changes its expected drill-in words**, and the count
  is not knowable from reading — the developer runs `test/fleet-assign-row-geometry.test.mjs` (22/22 on this
  tree, measured 2026-08-12) and amends expectations in the same commit. **No lane may be renamed or
  removed**; the ratchet's *"gains lanes and loses none"* clause continues to bind.
- **F-47-04-QA-9/10 are closed by construction rather than by a new fixture**: the three-child cluster and
  the abbreviated form both become states the pure derivation can be driven into directly, which is what
  those findings said no fixture reaches.
- The `@uat` render verdict ADR-008 declared OWED is still owed — this ADR measures pixels but it is not the
  designer's judgment, and the three frames below are what a human is being asked to judge.

### What an operator sees after this, at the three `@uat` frames (measured post-fix, single-line, nothing clipped)

- **1280 filtered, a card with an assignment and `◔ 18 in review`** (row 360.66): `[● assigned] [→ umamis-mac-mini] … [◔ 18] [→]` — one line, 35px, the target whole. `Open board`'s words are in the control's `aria-label` and `title`; `18 in review` and `· 18d ago` are in their own `title`s. Today the same frame renders **0.34px of `Open board`**, a cut tail, and a **45px two-line row**.
- **1280 unfiltered, the same card with the name kept** (`aof`, row 360.66): identical to the above with `aof` leading the row — the name is `shrink-0` and 19.8px, so it is the cluster that pays, exactly as DG-13 clause 5 orders. Today this frame renders **0.34px of `Open board`** and loses 29.14px of the tail.
- **390 filtered** (row 324): the same single-line row, 35px. A 30-character node id renders 170.17 of 194px — **the target, truncating inside its own box, after everything above it has gone**, which is rung 4 working as clause 5 specifies, and the first frame in this milestone where the last thing to yield is the last thing to yield.

---

## Fitness functions

Four new files. Two are **GREEN on arrival** — they pin properties the current tree already has, so the
accident that would break them cannot happen quietly; two are **RED until the stories land**, which is the
house convention (m45's table says it in terms: *an arch test written at refine time is part of the
contract, not a report on the present*). Each file states its own red/green expectation at the top, and each
carries a non-vacuity self-check, because a detector that cannot fire is worse than no detector.

| file | pins | today |
|---|---|---|
| `test/arch/acd-fleet-filter-single-home.test.mjs` | ADR-001/003 — the narrowing has ONE home (`ui/src/fleet/scope.mjs`); no sibling filter module exists under `ui/src/fleet/`; NO module outside that one home names the `repo` query key (the router and the shell nav included); the narrowing function has exactly ONE call site in `ui/src` — **and, ADDED 2026-08-12 (F-47-04-ARCH-1; ADR-008 + ADR-014 clause 4), region 5's GEOMETRY has one home too**: no file under `ui/src/fleet/` other than `assign-affordance.mjs` may bind a `REGION5_*` budget, name region 5 in an export, put a `REGION5_*` in a COMPARISON, or compare a length against a `_CH` budget's literal VALUE. Budgets and their values are read off the home **at run time**, so ADR-014's nine new px facts, its re-derivation of both `_CH` budgets and any rename need **no edit to the gate**; the walk is a recursive `readdir`, so a `ui/src/fleet/region5/` directory cannot escape it | **2 green, 1 RED** (the call site does not exist yet) → see the dated re-measure below |
| `test/arch/acd-fleet-filter-every-region.test.mjs` | ADR-004 — every array-typed collection on the `GlobalMeshStatus` wire type, **including those nested one level inside `diagnostics`**, is either narrowed by `filterToWorkspace` or on the declared machine-wide exemption list (one entry: `diagnostics.descriptorErrors`); the narrowing is applied ONCE, above the region fan-out and before `pageState`, and no region reads the un-narrowed status | **1 green, 2 RED** (the seam does not exist; `diagnostics.skippedWorkspaces`/`.projectionErrors` are not narrowed yet) |
| `test/arch/acd-fleet-filter-read-only.test.mjs` | ADR-002 — the filter is READ-SIDE ONLY: `mesh-ui-serve.mjs` names no repo/workspace page-query key, its `/api/mesh/*` route table is unchanged, and the fleet client mints no request carrying the filter | **3 green on arrival** |
| `test/arch/acd-fleet-board-link-resolved.test.mjs` | ADR-006(a) — no relative/hard-coded board href anywhere in `ui/src/fleet/`; the fleet's board drill-in resolves through `fleetApi.boardUrl` / `GET /api/mesh/board-url` | **1 RED, 2 green** (`Fleet.tsx:1427` is the violation) |
| **ADDED 2026-08-12 — a FIFTH row, and it is a PRE-EXISTING gate this milestone EXTENDED rather than a new file** (the "four new files" above is unchanged and still counts the four): `test/arch/acd-test-suite-registration.test.mjs` | m43/ADR-014 **E7** — every suite on disk is imported by a runner, and the unregistered set may only shrink — **plus m47/F-47-04-ARCH-2**: no fitness function may grow a NEW positional slice over source text (a fixed character window, or a slice whose end is a second `indexOf` sentinel). The sixteen surviving instances are **ledgered per file with their reason, ceiling-only**, so the nineteenth fails CI instead of needing an architect's eyes | **4/4, measured 2026-08-12** |

**ADDED 2026-08-12 — the positional-slice census, because it is the more general finding and it is a number
nobody had.** F-47-04-ARCH-2 was filed as *three surviving instances*. The census over **all 266 gates**
found **nineteen positional cuts across twelve files — six of them in m47's own gates** — and **two of the
nineteen are invisible to any grep**, because the slice's end offset is bound to a variable before the cut.
That is the argument for a ledger with a ceiling rather than a `grep` in a reviewer's head: a species whose
instances cannot all be found by searching for it cannot be closed by searching for it. **Both failure
directions were then demonstrated on real gates rather than argued** — the retired `\nexport ` sentinel reads
**GREEN on a real defect** when a declaration moves to the end of its file, and the retired `\nfunction `
sentinel reads **RED on a correct tree** when it becomes the last of its kind. This milestone has now been
bitten by a defective instrument seven times (STATE §Feedback); this is the first remedy aimed at the
species instead of at an instance.

**ADDED 2026-08-12 — the gates re-measured on the tree as it stands, by me, with the focused runner and an
isolated global home.** Reported to me as `acd-fleet-filter-single-home` **4/5**; **measured 3/5**, and both
differences matter, so the measurement is recorded rather than the report (this milestone's own rule):

- **The one-home lane is RED at ONE address, not two.** Only `AssignmentChip.tsx`'s `slotFits` survives;
  `Fleet.tsx`'s `abbreviateDrillIn` was **already deleted** by the developer implementing ADR-014 clause 4
  while the review was being written (measured: zero `REGION5_` identifiers remain in `Fleet.tsx`, and a
  comment naming F-47-04-QA-8 stands where the boolean was). The gate's own failure message still says *"RED
  at TWO KNOWN ADDRESSES"*. **The expected red is correct and the count inside it is stale** — the
  record-behind-the-build species STATE already files, now in a gate's assertion text.
- **A SECOND lane is red, and ADR-014 caused it.** The gate's non-vacuity self-check **(d)** — *"a hard-coded
  copy of a budget VALUE is caught"* — plants `label.length > <value>` where `<value>` is aimed by
  `budgets.find(([, v]) => Number.isInteger(v))` over the home's `REGION5_*` exports. A module namespace
  enumerates **alphabetically**, so before ADR-014 that probe picked `REGION5_CHIP_SLOT_BUDGET_CH` (41);
  **measured today it picks `REGION5_CHIP_GAP_PX` = 6** — a gap, not a budget — and the detector rightly does
  not flag a bare `> 6`. **The gate is sound and its probe is mis-aimed**, by my own export surface: the fix
  is one line in the gate (`budgets.find(([n, v]) => /_CH$/.test(n) && Number.isInteger(v))`) and it is
  **routed to that file's owner, not taken here.** Recorded because of what it is — the **eighth** instrument
  in this milestone found wrong about the tree rather than about the rule, and the first caused by a RECORD
  decision rather than by a build: an ADR that adds nine constants re-aims every gate that aims itself off
  that module's exports, and nothing couples the two.
- Measured green alongside it, same run: `acd-test-suite-registration` **4/4**. Reported and not re-measured
  by me, so they are carried as the reporting architect's numbers and marked as such:
  `acd-fleet-board-link-resolved` 5/5, `acd-fleet-filter-every-region` 7/7,
  `acd-active-runs-frozen-string-array` 4/4, `acd-mesh-ui-scope-visible` 3/3.

**CLOSED THE SAME DAY — `acd-fleet-filter-single-home` is 5/5, and both reds above are closed AT THEIR CAUSES
rather than by relaxation** (recorded by the product-owner at hand-back; measured by the gate's owner, focused
runner, isolated home). **(a)** The self-check's probe now selects by a **stated predicate** —
`/_CH$/.test(name) && Number.isInteger(value)`, with a loud assert when nothing satisfies it — so a fixture
derived from the export surface says what property it is standing in for rather than taking the first thing
that looks right. **(b)** The one-home lane's expected red is now at **ZERO** addresses, because ADR-014
clause 4's derivation landed in full: `ui/src/fleet/` holds no `REGION5_` identifier outside the home,
`Fleet.tsx` calls `region5RowLadder(…)` where `abbreviateDrillIn` stood, and `AssignmentChip.tsx` carries the
same marker where `slotFits` stood. The lane name and its failure text now **store no address and no count** —
they report the live violations the run found, which is the general form of the defect (a) is an instance of.
Because green-on-arrival proves nothing in this milestone, firing was re-proved **on the post-fix tree** by
planting two second homes: the review's own `region5-name-drop.mjs`, and a `tail-fit.mjs` comparing an
**imported** budget under a name carrying no region-5 vocabulary at all — the ADR-014 shape that had no gate
at all four hours earlier. Both went red at their live addresses; both were deleted and the subtree
hash-verified byte-identical. **28/28 across the six gates touched.**

**One candidate was DELIBERATELY NOT WRITTEN, and the reasoning is here rather than as an omission.** *"`routes.mjs`
still names no query key but `mode`"* is already asserted, verbatim and with its own non-vacuity check, by
`acd-route-logic-framework-free.test.mjs:182-196`. A second file re-asserting it would be the duplicated-home
shape every ADR above refuses, and it would put two files in the position of failing for one cause. What is
genuinely NEW — that the filter does not grow a second home in the router or the shell nav — is asserted
instead, in `acd-fleet-filter-single-home`'s sweep. The m45 invariant's survival is a milestone obligation
(**`acd-route-logic-framework-free` must stay green untouched**), not a new test.

All four are registered in `scripts/test.mjs`, per m43/ADR-014 E7 — `acd-test-suite-registration` fails on an
unregistered suite, and an unregistered red test is no gate at all. Re-run green after registration.

**Measured on delivery, 2026-08-10 — 12 assertions, 8 GREEN / 4 RED.** Each red is red for the reason its
own message names: `repoFromSearch` is not exported yet; `filterToWorkspace(` is not called inside
`Fleet()` at all; `diagnostics.skippedWorkspaces`/`.projectionErrors` are not narrowed yet;
`Fleet.tsx:1427` is `href="/board"`.

**Three detector defects were found by the DEVELOPER's feasibility pass over these contracts and fixed
here — they are marked `[Feasibility-N]` at the point they changed, in both the tests and ADR-001.** All
three are the same species and it is worth naming: **a gate that is wrong about the tree rather than about
the rule.** A red arch test at refine is the contract; a red arch test that is red for the WRONG reason is
a bug, and the two are only distinguishable by reading them.

- **[Feasibility-1] `acd-fleet-filter-single-home`'s call-site sweep would have FAILED A CORRECT
  IMPLEMENTATION** — the worst kind, because it only surfaces once someone has done the work properly.
  `path.extname("scope.d.mts")` is `.mts`, so the sidecar was in the walk, and `scope.d.mts:44`'s
  `export declare function filterToWorkspace(` counted as a **call site**. Reproduced and then re-verified
  fixed: the old sweep returns `["ui/src/fleet/scope.d.mts (1)"]` today and
  `["ui/src/fleet/Fleet.tsx (1)", "ui/src/fleet/scope.d.mts (1)"]` against a simulated correct build —
  failing the `deepEqual`, **while the assertion twenty lines above REQUIRES that same sidecar to declare
  that same name.** The gate contradicted its own ADR and was masked only by failing earlier. Fixed by
  excluding `.d.*` (a declaration states a type and emits no code), with a self-check that the exclusion
  cannot widen beyond declarations or stop reaching `Fleet.tsx`. Fixed sweep, same simulation:
  `["ui/src/fleet/Fleet.tsx (1)"]`.
- **[Feasibility-2] the sibling-module gate forbade what `acd-ui-surface-file-budget` DEMANDS** — any
  fleet file named for the concept was refused, so `RepoPicker.tsx` and `FilterBanner.tsx` failed CI while
  the budget gate's own message says *"Extract the next region into a sibling component"*, in the story
  with 13 lines of headroom. **Two rules that cannot both be satisfied are not two rules, they are a
  trap.** Fixed by ruling on what "one home" means (ADR-001's `[Feasibility-2]` clause: one *logic* home,
  discriminated by EXPORTS, not by names) — and, found alongside it, the sweep was **non-recursive**, so
  the `ui/src/fleet/filter/` directory ADR-001 forbids **by name** escaped it entirely. Now recursive.
- **[Feasibility-3] the completeness ratchet had a nested-collection blind spot** — it enumerated only
  top-level array fields, so `diagnostics.skippedWorkspaces[]` and `.projectionErrors[]` were invisible
  **in both directions, forever**. That is now load-bearing: ADR-004's Diagnostics ruling makes them
  case-1 collections that MUST narrow. Fixed by recursing one level into object-typed fields — and the
  first cut of *that* fix reproduced the identical bug one level down, truncating
  `{ workspaceId: string; … }[]` at its first inner `;` so the field stopped looking like an array. The
  parser is now brace-aware. This assertion consequently moves from green to **correctly red**.

**One further red was fixed rather than accepted, earlier in the same session:** `acd-fleet-filter-read-only`
failed at its "the status route exists" guard because the block-first comment stripper had eaten the route
table (§Codebase health finding 6, TECH_DEBT item 24).

**[Amendment 2026-08-11 — ADR-011]** `acd-fleet-board-link-resolved` **grows a fourth assertion and stays
one file**: every route in `src/mesh-ui-serve.mjs` that resolves a `workspaces` row and then consumes its
`projectRoot` must probe reachability first and refuse `workspace-not-local`/409 — stated over ALL such
routes, so the third one is caught on the day it is written, with the non-vacuity half being that the
sweep finds BOTH of today's (`/api/mesh/board-url` and `/api/mesh/assign`). It does **not** go in
`acd-fleet-assign-targets-item-workspace`, whose subject is the mint rather than the resolver. **Baseline
measured before the ruling (2026-08-11): the six suites ADR-002's invariant protects are 22 GREEN / 0
RED**, and ADR-011 clause 3 records why none of them can move.

**[Amendment 2026-08-11 — ADR-010]** `acd-fleet-filter-every-region` **grows three assertions and stays
one file**; no fifth fitness function is added, because a second file asserting the same completeness
concept is the duplicated-home shape these ADRs refuse. They are ADR-010's §Consequences (i)–(iii): the
client narrowing takes exactly ONE narrowing value (neither `status.scope` nor `status.workspaceId` is a
filter predicate); the behavioural lane's local fixture carries a multi-workspace and a foreign-workspace
node so the composed survivor is exercised rather than fixtured away; and the composed body is not
byte-identical to the unknown-value body for the same raw value. **Measured after 47/02's delivery
(2026-08-11): 10 GREEN / 2 RED** — both reds are the same fact, `filterToWorkspace` has no call site
inside `Fleet()`, and both are 47/03's seam. The completeness ratchet's two `diagnostics` assertions went
green with 47/02, for the reason their message names.

**[Amendment 2026-08-11 — ADR-012]** `acd-mesh-ui-scope-visible` is **OWED two assertions and is not yet
edited**, and the gap is recorded here rather than left as an omission: (i) `<FilterBanner` appears in
`Fleet()` **before** the state ternary, the same fact and the same shape as that file's existing
`stateTernaryIndex > topBarCallIndex` (`:54`); (ii) the repo control is inside `TopBar` and `TopBar` is
unconditional, because ADR-012 clause 3 makes the control's unconditional mount the **licence** for the
banner's conditionality. It goes in **that** file — the one that already owns *"the control mounts above the
state ternary"* — and never in a fifth. **It has a hard prerequisite: F-47-03-ARCH-4.** That file slices
`Fleet()` with a fixed `+ 4000`-character window whose second marker sits **158 characters** from the cutoff,
so a third marker added to the same slice would be red-or-green by accident of file size — the fifth
instance, in this milestone, of a gate wrong about the tree rather than about the rule. The brace-balance fix
is routed to 47/04; **these assertions land after it, not before.** Until then R0's position is pinned
behaviourally by 47/03's four features — coverage, not a ratchet.

**[Amendment 2026-08-11 — ADR-013]** **No assertion and no file is added**, and that is the ruling rather
than an omission: `acd-fleet-filter-every-region` assertion 1 already states the completeness rule over the
wire TYPE and is what produced the `sessions` finding. **Measured before ruling, per-run isolated global
home, by importing the `archTests` array (2026-08-11): 5 GREEN / 1 RED**, the single red naming exactly
`sessions` — so the ratchet is doing the work and a by-name gate beside it would be its duplicated home,
stale the day the field is renamed. **Re-measured after 47/03 landed the narrowing (same day, same method):
7 GREEN / 0 RED.**

**[Amendment 2026-08-11 — F-47-01-ARCH-F2 closed]** `acd-fleet-filter-every-region` **grows a SEVENTH
assertion and stays one file**: every array collection on the `GlobalMeshStatus` wire type is **explicitly
array-coerced** in `Fleet.tsx`'s `asGlobalStatus`. That was the milestone's *second* hand-maintained list of
one thing — the first is ratcheted by assertion 1, and this one was not, because the function ends in an
`as GlobalMeshStatus` cast that hides an omission from `tsc`. Three properties of how it is written, each
answering a defect this milestone measured rather than a preference:
- **It is a SEPARATE `archTests` entry, not more lines inside assertion 1.** Assertion 1 was RED on
  `sessions`, and anything after its `deepEqual` does not execute — the vacuity ordering defect STATE records
  ("a non-vacuity self-check must not be reachable only through the assertion it is proving"). Its own
  self-checks run BEFORE its assertion for the same reason.
- **Its slice is brace-balanced through a SHARED helper** (`matchedBraceBody`, which `typeBody` now also
  calls), not a fixed window — three of this milestone's five bad gates were positional slices
  (F-47-03-ARCH-4), and a second balancer beside the first would be a duplicated home on exactly that
  mechanism.
- **It finds the array coercer by what it DOES (`Array.isArray`) rather than by its name**, and accepts three
  idioms, so it neither over-claims (F-47-01-ARCH-F5) nor passes a helper that has quietly stopped
  guaranteeing an array.
**Proof, run before hand-back: GREEN against the tree as it stands (a correct implementation), and its
in-band mutant self-check fires on a planted `workspaces: wire.workspaces` passthrough over the REAL sliced
body, naming that collection alone.** The red it was designed to produce no longer exists — `sessions` was
coerced at `Fleet.tsx:357` while this was being written — so **green on arrival is the honest expectation and
is stated in the assertion's own header**; the mutant is what proves it can fire.

### ADDED 2026-08-12 — the two gates ADR-014 requires (stated here; NOT written here)

Both are **routed, not authored** — `test/arch/acd-fleet-filter-single-home.test.mjs` is being edited by the
architect closing F-47-04-ARCH-1 in the same window, and two agents editing one file is a defect this
milestone has already paid for (STATE §Feedback). Each is stated tightly enough to be written from.

**GATE A — ADR-008's one-home clause, ratcheted (F-47-04-ARCH-1's remedy, and ADR-014 clause 4 is now its
second and third instance).** In `acd-fleet-filter-single-home`, over **every** source file under
`ui/src/fleet/` (walked, with line comments stripped FIRST — TECH_DEBT item 24), assert:
1. **No file other than `assign-affordance.mjs` puts a `REGION5_*` constant in a COMPARISON.** Match an
   identifier `/\bREGION5_[A-Z0-9_]+\b/` within a expression containing `<=`, `>=`, `<`, `>` or `.length`.
   Importing the name is permitted; **deciding with it is not.** *Expected RED on today's tree at exactly
   two addresses — `Fleet.tsx`'s `abbreviateDrillIn` and `AssignmentChip.tsx`'s `slotFits` — which is this
   gate's self-contained non-vacuity proof and needs no planted mutant.* Green after ADR-014 lands.
2. **Every export whose name matches `/^region5/i` (or that returns the row's drop decisions) resolves to
   `assign-affordance.mjs`.** Collect `export function|const` names across the subtree; assert the set of
   region-5 decision exports lives in that one file. This is the assertion the **planted
   `region5-name-drop.mjs`** (51/51 green today) must fail, and it is the half the existing name regex
   `/(repo|filter|narrow)/i` cannot see — its vocabulary does not contain `region5NameDropped`.
3. **Non-vacuity:** assert the walker reached > 5 files and that `ui/src/fleet/assign-affordance.mjs` is
   among them, in the file's own idiom.

**GATE B — the floor constant is COUPLED to the grid it is derived from.** `REGION5_ROW_FLOOR_PX` is
meaningless if `MilestonesList`'s track floor moves without it. Assert, reading both files: the
`minmax(<N>px, 1fr)` literal in `Fleet.tsx`'s milestone grid, minus **34** (the card's `border` ×2 + `p-4`
×2, both read out of the same card's className rather than hard-coded in the gate), equals
`REGION5_ROW_FLOOR_PX`. Message: *"region 5's ladder is derived from a 320px track; the grid now says
`<N>`px — re-derive the budgets (ADR-014) rather than moving one number."* Route: this belongs with the
geometry contract, i.e. `test/fleet-assign-row-geometry.test.mjs`'s ratchet lane, which already reads the
budgets back — **not** a fifth arch file for one assertion.

---

## Codebase health (measured this refine, and where each finding is routed)

Measured 2026-08-10 at `d71d508`, against m45's and TECH_DEBT items 10/28's own baselines:

| Signal | m45 refine (08-06) | m46 (08-08, item 28) | **now (08-10)** | Trend |
|---|---|---|---|---|
| `src/` `.mjs` files | 213 | — | **215** | flat |
| `src/` root-level `.mjs` | 108 | — | **109** | +1 (m45's `static-serve.mjs`, as ADR-004 predicted) |
| `src/` lines | 55,705 | — | **57,614** | +3% |
| `ui/src` files | 54 | 88 | **90** | **+67% in four days** |
| `ui/src` lines | 10,887 | 17,666 | **17,991** | **+65%** |
| `ui/src/fleet/Fleet.tsx` | 1,532 | — | **1,547** | 13 lines under its 1,560 ratchet |
| `ui/src/board/DetailPanel.tsx` | 994 | — | **999** | **1 line** under its 1,000 ratchet |
| `ui/src/config/App.tsx` | — | 1,276 | **1,297** | **3 lines** under its 1,300 ratchet |
| `ui/src/app/shell-layout.mjs` | — | 1,006 | **1,015** | 45 under 1,060 |
| `ui/src/app/Shell.tsx` | — | 905 | **917** | 23 under 940 |
| `ui/src/terminal/TerminalControl.tsx` | — | 821 | **818** | 22 under 840 |

Five findings, each routed:

1. **FIVE of the six budgeted `ui/src` files sit within 2% of their ceilings — three within 15 lines.** This
   is a different signal from any single file being large, and it is the one only an aggregate view sees:
   `acd-ui-surface-file-budget` is doing its job as an ALARM and the whole tree is standing on the alarm
   line. The next milestone that touches `ui/` in any breadth will meet a ceiling, and the ratchet's own rule
   is that raising one *"needs an ADR, not a diff"* — so the failure mode is a milestone stalling on a
   decision it did not plan for. **Route: `TECH_DEBT.md` — written, as item 33 — and no refactor required
   of this milestone** — this is aggregate debt m47 did not create, and paying it means extracting from
   files m47 does not touch (`DetailPanel`, `App`, `shell-layout`). What m47 DOES owe is not making it
   worse, which ADR-006's deletion guarantees for the one file it does touch.
2. **`ui/src/fleet/Fleet.tsx` has 13 lines of headroom and this milestone must add a control, a chip and an
   empty-state branch to it.** **Route: refactor REQUIRED of this milestone**, and it is already an ADR:
   ADR-006's deletion of the ~250-line unreachable local-shape branch. Net effect, projected: `Fleet.tsx`
   lands near 1,320–1,350 — real headroom rather than a ceiling deferred by a diff. A story that adds the
   filter to `Fleet.tsx` WITHOUT taking the deletion should be refused at review: it would either breach the
   ratchet or be trimmed of explanation to fit, and ADR-014/E3 forbids the second explicitly.
   **[Addendum, measured 2026-08-11 at the 47/03 structural review — this projection is FALSIFIED and is
   corrected here rather than left standing, because a stale number in my own file is the same species as
   F-47-01-ARCH-F6.]** `Fleet.tsx` is **1,543 lines against its 1,560 ceiling — 17 of headroom**, not the
   1,320–1,350 projected above. The trend, per file measurement: **1,547** at refine → **1,390** after
   47/01's ADR-006 deletion (170 of headroom) → **1,524** at the start of this review → **1,543** ninety
   minutes later, as 47/03's fix pass landed. So the deletion delivered exactly what it promised and
   **47/03 plus part of 47/04 have already spent 153 of the 170 it bought**, three extractions
   notwithstanding (`RepoPicker.tsx` 204, `FilterBanner.tsx` 133, `PageStates.tsx` 153 — the fan-out
   `Fleet.tsx` ← 2 → **20** is that trade, up from → 14 at refine). **Both readings are given because the
   file moved DURING the review, which is itself the finding: 17 lines is not headroom, it is the same
   13-line position ADR-006's deletion was granted to escape, reached again inside one milestone.**
   **Route — REFACTOR REQUIRED of the remaining work, and it is a review condition rather than a note:**
   47/03's outstanding fix pass (ARCH-2, QA-3, QA-4, QA-10) and 47/04's remainder land inside 17 lines, **or**
   one more region sibling is extracted from `Fleet.tsx` — which is the move `acd-ui-surface-file-budget`'s own
   failure message instructs (*"Extract the next region into a sibling component with a prop boundary"*) and
   which ADR-001's `[Feasibility-2]` clause already licenses by name. The two answers that are **refused**:
   trimming rationale to fit (ADR-014/E3 forbids it explicitly) and raising the ceiling in a diff (the
   ratchet's own rule is that raising a number *"needs an ADR, not a diff"*). No new debt entry — item 33
   owns the aggregate and F-47-01-ARCH-F6 owns this milestone's `ui/` projection — but the cheap extraction
   lever is now largely spent, so the next milestone to open this file meets a real ceiling conversation
   rather than a deletion that pays for it.
3. **`filterToWorkspace` is an exported, typed, TESTED function with no production caller** — a pinned
   contract nothing honours. Two suites assert its behaviour, `scope.d.mts:44` types it, and `Fleet.tsx`
   does not import it. It has been in that state since m34/story 03. This is the mirror image of TECH_DEBT
   item 17's "a suite no runner imports": here the suite runs and the SUBJECT is what nothing reaches, so it
   is green, red or deleted with identical effect on the product. **Route: refactor REQUIRED of this
   milestone** — ADR-002 promotes it to the one production narrowing, which is also what makes its existing
   tests start meaning something. No new debt entry.
4. **The m25 → m34 producer migration was left half-done, and the residue is ~250 lines of unreachable UI
   plus a wire type nothing populates.** Found by reading the payload producer and the consumer side by
   side, which ADR-004's completeness rule required anyway. **Route: refactor REQUIRED of this milestone**
   (ADR-006), with the terms for any future restoration written into that ADR so the next author meets a
   decision rather than an empty region. No new debt entry — it is paid here.
5. **`src/` gained a 109th flat root-level module (TECH_DEBT item 10) and this milestone adds none.**
   Recorded so the trend line stays honest across refines rather than being re-measured from scratch.
   **Route: no action; item 10 already owns this trend.**

6. **TECH_DEBT item 24 is LIVE and it bit this refine's own fitness functions — measured, not feared.**
   Writing `acd-fleet-filter-read-only` surfaced it immediately: `src/mesh-ui-serve.mjs:297-299` carries a
   LINE comment containing `//api/*`, and the house's usual block-first comment stripper reads that `/*` as
   opening a block comment, then deletes everything to the next `*/` — **9,192 characters of that file,
   including its entire route table** (53,188 raw → 10,458 stripped; line-first stripping yields 19,650 and
   the route table survives). A route-key sweep over that wreckage returns "no keys named" and reads as
   **green**. It failed loudly here only because the slicer asserts it found the route before slicing;
   without that guard this refine would have shipped the 26th blindable detector. **Route: fixed in all four
   of this milestone's fitness functions** (line comments stripped FIRST, with the ordering pinned by a
   self-check in two of them, so it cannot be "tidied" back) **and no new debt entry — item 24 already owns
   the general case and its census.** Recorded here because it is evidence the item is not historical: it
   caught a live author, in this milestone, on the first file they read.

**Written to `wiki/work/TECH_DEBT.md` by this refine: ONE new item — item 33** (finding 1 — the `ui/src`
budget table is at its ceiling across the board). Findings 2, 3 and 4 are required of this milestone and are
ADRs above; finding 5 is already item 10; finding 6 is already item 24 and is fixed in the four files it
would have blinded. TECH_DEBT items 28 and 31 are both touched by this milestone's subject and both stay
OPEN: 28's `ui/src` growth curve is unaddressed by m47 (which is net-negative in `ui/` but by ~250 lines
against a +7,100 trend), and 31's "which project's board?" question belongs to the NAV, which ADR-003
forbids this milestone from touching.

### ADDED 2026-08-12 — three findings from 47/04's structural review, measured at source

**7 · F-47-04-ARCH-4 · LEDGER — four VALUE exports now live in `.tsx` files, where `node:test` cannot reach
them.** Enumerated 2026-08-12 across `ui/src/fleet/**` (every `export` that is neither a component nor a
type; types are erased and components are exercised through the mount):

| export | file | what it is | reachable how, today |
|---|---|---|---|
| `runChipClasses` | `AssignmentChip.tsx` | the SHARED tone map (m21's ramp) | only by rendering a chip and reading its className |
| `boardControlName` | `BoardDrillIn.tsx` | the accessible name + the remedy sentence (DG-47-5 clause 5) | only through a mounted card's `aria-label` |
| **`REPO_TRIGGER_WIDTH`** | `RepoPicker.tsx` | **a GEOMETRY CONSTANT** (`w-auto max-w-[45vw] md:w-[150px] md:max-w-none`) | only as a className substring |
| `ALL_REPOS` | `RepoPicker.tsx` | the picker's resting label | only as rendered text |

Confirmed unreachable: **no test in `test/` imports any `.tsx` module**; the harness
(`test/support/react-app-harness.mjs`) esbuild-bundles a `.tsx` ENTRY, which yields a mounted tree, never
named exports. The third row is the one that bites — `REPO_TRIGGER_WIDTH` is the `max-w-[45vw]` ceiling
STATE derives arithmetically (358 − 105.2 − 24 − 53 = 175.8px), and its routed fix was *"assert the number
in a lane"*, which is precisely what a `.tsx` home prevents from being done directly. **The house rule this
crosses is `scope.mjs`'s own header** — *render-logic `node:test` must exercise belongs in a plain `.mjs`
the `.tsx` wires up* — and it is drifting one export at a time, in the milestone that extracted three
components. **Route: TECH_DEBT, not this milestone.** The fix is mechanical (a `.mjs` + `.d.mts` sibling per
file, the pattern `slot-aids.mjs`/`SlotAids.tsx` already demonstrates two files over — note `slotAidForm`
is a **re-export** of a real `.mjs` and is therefore NOT on this list, which is the shape the other four
should take), but it touches four files across two stories and buys nothing this milestone needs. The debt
entry must carry this table, the `slot-aids.mjs` precedent, and the ratchet the fix should end with: *no
`ui/src/**/*.tsx` may export a non-component, non-type value.*

**8 · F-47-04-ARCH-5 · NOTE — `acd-fleet-board-link-resolved`'s two halves are scoped differently, and
47/04's own extraction stopped one function short of a false red.** Read at source 2026-08-12: the
PROHIBITION lane walks the whole subtree (`fleetSourceFiles()` over `FLEET_DIR`, asserting it reached > 5
files) while the POSITIVE lane reads exactly one file — `path.join(FLEET_DIR, "Fleet.tsx")` — and requires
`fleetApi.boardUrl(` inside it. So *"the fleet resolves through the ONE resolver"* is asserted of a FILE
where its twin is asserted of the SUBTREE. 47/04 extracted `BoardDrillIn` out of `Fleet.tsx`; the resolver
call did **not** go with it — `onOpen` (the `useCallback` in `GlobalMilestoneCard`, directly above the
component's own render) still holds `await fleetApi.boardUrl(...)`. Had that one function moved with the
component that renders its label — the natural next step of the same extraction, and arguably the tidier
cut — **the gate would have gone RED on a correct build**, claiming the fleet had stopped using the
resolver. This is the **seventh** instrument in this milestone found wrong about the tree rather than about
the rule, and the first found *before* it fired. **Route: TECH_DEBT, folded into F-47-03-ARCH-4's positional-
slice species entry rather than opened as a new one** — the shared cause is a gate addressing code by WHERE
IT LIVES instead of by WHAT IT DOES. The one-line fix is to scope the positive lane to the same
`fleetSourceFiles()` walk and assert *"exactly one file under `ui/src/fleet/` calls `fleetApi.boardUrl(`"*,
which is both stronger (it also catches a SECOND caller) and immune to the next extraction.

**9 · `Fleet.tsx` measured 2026-08-12: 1,532 lines against its 1,560 ceiling — 28 lines of headroom, and
ADR-014 must spend NONE of it.** The ruling is net-negative there by construction (`abbreviateDrillIn`
leaves; a prop arrives), and `assign-affordance.mjs` is 470 lines with no budget entry required under 800.
**Required of the developer, not deferred:** land `Fleet.tsx` net-neutral-or-negative. **Watch, not yet
routed:** `assign-affordance.mjs` will hold the affordance state machine AND region 5's whole geometry
ladder at ~570 lines. That is still one home for one contract (ADR-008's clause is about the DECISION, not
the file's line count), but the seam is already drawn in the file's own banner comments (`── DG-13 · the
row's BINDING GEOMETRY ──`), and **if it crosses 800 it acquires a budget entry and splits along that
banner** — `region5-geometry.mjs` + `.d.mts`, taking `region5NameDropped`, the ladder and every `REGION5_*`
constant TOGETHER so the one home moves rather than divides.

---

## Near-misses recall surfaced, and how each was honoured or departed from

Unlike m45's, these recall blocks came back populated. Four surfaced records bear directly on decisions here:

- **m45/ADR-006** (*"the router is a PATH router … `scope` keeps its existing ONE home in
  `ui/src/fleet/scope.mjs`"*) — surfaced by five of the seven recalls, i.e. it is the dominant prior on this
  subject. **HONOURED, and made structural.** ADR-001 puts the repo filter in the same one home; ADR-003
  pins `routes.mjs` as un-edited and cites the copy-and-delete mechanism plus `shell-nav.mjs:161-169`'s
  positional href rule as the two reasons no router change is needed. m45 wrote *"47 adds a repo filter with
  no edit to the route module"* as a prediction; this milestone converts it into a constraint.
- **m34/ADR-006** (*"`aof mesh ui` reads the global projection by default; `--local` is an explicit workspace
  filter"*) — **HONOURED, with one deliberate DEPARTURE that is named rather than absorbed.** The default
  stays global and `--local` is untouched (ADR-005). The departure is ADR-004's rule 2: the repo filter
  narrows the NODE roster by membership, where `scope=local` deliberately does not. Two narrowings of one
  store column with different semantics is normally the thing to refuse; here they answer different
  questions, and the divergence is written into ADR-004 with both tests named so a later author cannot
  "unify" them by accident.
- **m25/ADR-002** (*"the fleet data model is ONE registered command — `mesh:status` … BOTH faces consume this
  ONE command … no second data path"*) — **HONOURED IN SPIRIT, and the record corrected.** Its one-producer
  rule is the whole of ADR-006's second half. But the ADR itself is stale for the web face: m34/ADR-006
  moved nodes, workspaces and items to the global projection and left boards behind, so "both faces consume
  one command" has not been true since m34. ADR-006 names the supersession and completes it for the web face
  rather than restoring a second data path in its name.
- **m38/ADR-012 + m35/ADR-007** (the fleet face's read-only posture and its ONE mutation carve-out) —
  **HONOURED.** ADR-002 makes "the filter is read-side only" structural rather than remembered: `src/` is not
  edited by the filter at all, so the read-only suites stay green **without being touched**, which is what
  SPEC asked for.

One near-miss surfaced that was **consciously departed from**: m43/ADR-006's *"exactly ONE client-side
evaluator and NO threshold literal in `ui/`"* discipline reads, on its face, as an argument for putting the
filter's decision server-side too (one evaluator, server-owned). It does not apply: that rule is about a
CONFIGURED THRESHOLD that two surfaces could disagree about, and the repo filter is an operator's momentary
choice with exactly one consumer. The transferable half of it — one evaluator, no second copy — is honoured
by ADR-001 and ADR-004.

---

## Story-boundary guidance (input to the PO's break-down — not a partition)

Story boundaries are drawn with the PO. These are the seams the ADRs above create, with the graph-derived
coupling that decides each, offered as input.

**The single hard sequencing constraint, and it is the only one:** everything that edits `Fleet.tsx` is
serialised against everything else that edits `Fleet.tsx`. The graph says why in one line — `Fleet.tsx` ← 2
→ **14**, and it is 13 lines under a ratchet. It is the surface's composition root and it is the file every
cluster below wants. Order it so the deletion goes FIRST.

- **Cluster A — the dead-branch deletion + the board-link fix (ADR-006).** `Fleet.tsx` only (plus whatever
  of `api.ts`'s `FleetBoard`/`MeshStatus` loses its last reader; graph: `api.ts` ← 1, so that blast radius
  is exactly one file). **It ships value on its own** — it closes both inherited m45 defects — it needs
  nothing from the filter, and it is what buys every later cluster its line budget. **FIRST, and everything
  in `ui/` is easier after it.** Watch: `test/support/fleet-app-harness.mjs` and the fleet suites that mount
  the real component; graph says `Fleet.tsx` ← `test/support/shell-fleet-entry.tsx`, so the shell harness is
  in the radius too.
- **Cluster B — the pure narrowing module (ADR-001/003/004's rules).** `ui/src/fleet/scope.mjs` +
  `scope.d.mts` only: `repoFromSearch`, `withRepoParam`, `filterToWorkspace`'s completeness rule, and
  `emptyStateCopy`'s filtered cases. **A zero-blast-radius stage** — it can land, be fully exercised by
  `node:test` through `test/fleet-scope.test.mjs`, and be imported by no new caller. Graph-cited:
  `scope.mjs` ← 6 (five of them SUITES) → 1. **Parallel-eligible with A**; the two touch disjoint files.
- **Cluster C — the wiring: the seam, the control, the chip, the empty state (ADR-004/007).** `Fleet.tsx`
  again, plus `SurfaceSlot` usage (graph: `SurfaceSlot.tsx` ← 3, and the fleet is already one of them, so
  this is a use of an existing contribution rather than a change to the mechanism). **Depends on B for its
  functions and is serialised behind A for the file.** This is the story with real breadth and it is where a
  review should look hardest — it is where "every region" either becomes structural or becomes a habit.
- **Cluster D — region 5's name column (ADR-008).** `assign-affordance.mjs` (← 2, one of them the geometry
  suite) + `Fleet.tsx`'s one expression + `test/fleet-assign-row-geometry.test.mjs`. **Genuinely independent
  of B**, serialised behind C for the file, and it carries a `@uat` render lane that nothing else here does.
  It is the cluster most likely to be mis-scoped as "small": the code is three lines and the contract is
  DG-13…DG-22.
- **`?scope=`'s ruling (ADR-005) is NOT a cluster.** It is a recorded decision plus a composition rule that
  falls out of B's copy-and-set helpers and C's empty-state copy. It should not become a story; if it does,
  it will be a story with no diff.

**What is genuinely parallel:** A ∥ B. **What is genuinely sequenced:** A → C, B → C, C → D — all four edges
for the same reason, which is `Fleet.tsx`. **What is NOT in the graph and should be watched anyway:** the
`d.mts` sidecar. It is a type-only file, so no import edge reaches it and the graph is silent about it; B
must carry it or C fails at `tsc` with an error that names the wrong file.
