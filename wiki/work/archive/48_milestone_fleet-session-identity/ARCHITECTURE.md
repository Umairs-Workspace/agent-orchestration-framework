---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: how did we decide to build it, and why that way?
  Owner: architect. A log of ADRs: numbered, IMMUTABLE, superseded-not-edited.
  Does NOT contain observable behaviour (→ task .feature files) — only the structure behind it.
-->
# 48 · Routable session identity — Architecture Decisions

> Inputs: `SPEC.md` (a stable, routable session id + repo/workspace attribution + a fleet-side index keyed
> by `(nodeId, sessionId)` + the appear/end/expire lifecycle, ADDITIVE and never a second authority, with
> `workItem: null` first-class and **all UI out of scope**), `STATE.md` (grow `sessions[]` the way m38/story-00
> grew it — do not invent a new wire convention), `RESEARCH.md` §1–§6 (every constraint below is sourced
> from it), and the standing contracts this milestone evolves: the m23 FROZEN presence record + its shared
> `isStale` predicate, m38/ADR-001 (`sessions[]` as an additive key), m38/ADR-002 (the per-`(node, workspace,
> assistant)` TTL session record), m38/ADR-004 + its 2026-07-12 as-built AMENDMENT (run↔session subsumption
> in the assembler), m38/ADR-008 (producer-fed contract tests), m38/ADR-014 (the terminal mirror is an
> ephemeral in-memory tail routed by `(nodeId, sessionId)`, never a system of record), m20/ADR-003 (resume
> carries the sessionId on the same lineage), m34/ADR-003 (the global store is a rebuildable projection,
> never the source of truth), m23/ADR-004 (the liveness cache writes no durable record and is never a second
> system of record), m26/ADR-003 (ambiguity fails CLOSED).
>
> **Codebase-graph grounding.** The graph was current at refine (`graphify-out/graph.json`, `builtAt`
> **2026-08-10T12:50:26.790Z**, 9,200 nodes / 22,138 edges, reported `unchanged: true` — a topology-unchanged
> success, so it is the current tree, not a stale artifact). `aof graph impact` reports the coupling this
> milestone must respect — actual, not inferred:
>
> - **`src/mesh-session.mjs` is a near-leaf: exactly TWO source dependents** — `src/commands/mesh-session.mjs`
>   and `src/mesh-presence.mjs` (the rest are 14 test files). It imports only `fs.mjs`, `mesh-store.mjs`,
>   `run-store.mjs`. So the record-shape change (ADR-002) has a blast radius of two modules, one of which is
>   its own CLI. This is the cut ADR-008's story 00 follows.
> - **`src/commands/mesh-session.mjs` has exactly ONE source dependent: `src/cli.mjs`.** The id-resolution
>   ladder (ADR-001) is therefore invisible to every other module — it cannot leak.
> - **`src/mesh-presence.mjs` is central — NINE source dependents** (`commands/mesh-heartbeat`,
>   `commands/mesh-identity`, `commands/run-start`, `control-stream-server`, `global-node-registry`,
>   `mesh-assignment-reclaim`, `mesh-clone-credential-provider`, `mesh-launcher`, `mesh-worker-execution`).
>   Unchanged from m38's measurement, and it is why the wire growth must be strictly ADDITIVE (ADR-005) and
>   why the staleness predicate may not fork (ADR-006).
> - **`src/mesh-launcher.mjs` is a SINK, not a hub: 36 dependencies, 2 dependents** (`commands/mesh-serve`,
>   `mesh-worker-execution`). It is the widest out-degree in `src/` and TECH_DEBT item 10 already names its
>   trajectory. This is why ADR-009 requires this milestone to REMOVE a block from it rather than add one.
> - **`src/global-mesh-query.mjs` has exactly ONE source dependent: `src/mesh-ui-serve.mjs`** — and it is
>   already the pure, documented no-I/O shaper over `{ registry, assignments }`. That is the graph fact that
>   licenses putting the session index THERE (ADR-007) instead of minting a new root sibling.
> - **`ui/src/fleet/api.ts` has exactly ONE dependent: `ui/src/fleet/Fleet.tsx`**; `ui/src/fleet/runs.mjs`
>   has two (`Fleet.tsx`, `scope.mjs`) plus four tests. Both are leaf-shaped, so the wire's typed mirror and
>   the formatter can be edited without a cascade.
> - **`src/control-stream-server.mjs` needs NO change** — RESEARCH §5.5 measured its `safeSessionArray` as an
>   ENTRY-level guard with no per-field whitelist, so a new key inside a session entry rides it for free.
>   Its 37 dependents make "leave it alone" the highest-value structural decision in this milestone.
>
> The graph is one input; the boundaries below are the architect's call.

---

## ADR-001: The routable `sessionId` IS the assistant's own session id, resolved through ONE ordered ladder (`--session` flag → hook payload `session_id` → `CLAUDE_SESSION_ID`) and NEVER fabricated — a session whose assistant supplies no id is LIVE but NOT ADDRESSABLE, and says so with `sessionId: null`

**Status:** Accepted
**Date:** 2026-08-10

**Context.** RESEARCH §1 (measured): `resolveSessionIdentity()` (`src/commands/mesh-session.mjs:54-71`) already
parses `payload.session_id` off the hook's stdin JSON, already falls back to `env.CLAUDE_SESSION_ID`, and then
**discards the value** — `identity.sessionId` is destructured at `:201` and never read again. RESEARCH §2
(measured): that value is the SAME UUID Claude Code names its own transcript file after, which is the SAME
UUID the worker's transcript-dir watch captures onto `global_assignments.session_id`, and `claude --resume`
keeps it (measured on the Mac 2026-07-27) — one id, two producers, no divergence by construction. So the
routable id already arrives on a channel we already own; nothing needs inventing for Claude Code.

Two constraints bound what to do about everything else. RESEARCH §1: Codex's `session_id` is **documented,
not measured** (cached vendor docs, `codex-manual.md:9490-9508`) — the design may not depend on it. And the
CLI's PRIMARY argument shape is the assistant-agnostic `--workspace/--repo/--assistant` flag trio: a human or
CI caller invokes `aof session start` with no hook payload at all, and refusing that caller would break a
shipped, documented interface.

The tempting third option — synthesize an id when none arrives — is the trap. A per-invocation random id
breaks `pingSession`'s idempotency (every ping would mint a new session, unbounded); a deterministic id
derived from `(nodeId, workspaceId, assistant)` is just today's colliding triple wearing a UUID's clothes,
and — worse — it would be **indistinguishable on the wire from a real, routable id**, so a surface would open
a terminal socket on a tuple that routes nowhere. m38/ADR-014 invariant 4 already settled this class of
question for the assignment path ("never a guessed or defaulted session"; `WorkAssignment.sessionId?` is
OPTIONAL precisely so a card with no resolvable tuple opens NO socket).

**Decision.**
- **The id is read, never made.** `sessionId` is resolved by ONE ordered ladder, evaluated in this order and
  stopping at the first non-blank value:
  1. an explicit **`--session <id>`** flag (NEW — the assistant-agnostic primary channel, joining
     `--workspace/--repo/--assistant` in `SESSION_FLAGS`, so a human/CI/launcher caller can supply identity
     without impersonating a hook);
  2. the hook payload's **`payload.session_id`** (stdin JSON — the value `resolveSessionIdentity` already
     parses and today throws away);
  3. **`env.CLAUDE_SESSION_ID`** (the existing env channel, unchanged).
  The ladder mirrors the flags-primary / payload-fills-the-gap precedence the module already keeps for
  workspace/repo/assistant — it is the same rule applied to a fourth field, not a new convention.
- **The value is OPAQUE and is never transformed.** No lowercasing, no UUID re-formatting, no hashing, no
  prefixing, no truncation. The only coercion anywhere is `safeSegment`'s path-safety collapse when composing
  the record's filename (ADR-002), and that NEVER changes the stored/emitted value. The id we publish is
  byte-identical to the id the assistant issued, which is what makes it join losslessly to
  `global_assignments.session_id` (ADR-003) and to the mirror's routing tuple.
- **Assistant-agnostic by FIELD NAME, not by vendor branch.** Step 2 reads `session_id` from whatever payload
  arrived; it does not branch on `--assistant`. Claude Code is measured to supply it; Codex documents the same
  field name; a third assistant that supplies it works with zero code change; one that does not degrades
  (below) rather than failing. There is no per-assistant conditional in the id path — a provider conditional
  here would be the exact shape this repo's fitness functions exist to forbid.
- **No id resolved ⇒ `sessionId: null`, and the session is still FIRST-CLASS.** An anonymous session still
  gets a record, still rides `sessions[]`, still renders `working · <repo> (session)`, still counts the node
  as `working`. It is simply **not addressable**, and the wire states that in the one honest way: an
  explicitly-present `null`. Never a synthesized id, never a silent omission from the array, never a refusal
  that would break the flagless CLI caller. `sessionId === null` is the m38/ADR-014-invariant-4 signal
  generalised from assignments to sessions: **no tuple ⇒ no socket.**
- **Present-and-null, not absent.** On BOTH the record and the wire, `sessionId` is ALWAYS present, `null`
  when unresolved. This follows the m43 cache-provenance idiom exactly as stated in `ui/src/fleet/api.ts`:
  *absent* means "this producer does not speak this dimension"; *null* means "speaks it, does not know the
  value". After this milestone EVERY producer of a session entry speaks the dimension, so the key is never
  absent — which also gives ONE stable shape to freeze (ADR-005) instead of two.
- **Resume does not fork the id (m20/ADR-003 — HONOURED, and it needs no new code).** RESEARCH §2 measured
  that `claude --resume` keeps the same session id and appends the same transcript, and that the worker's
  resume path resolves the id it was handed rather than re-watching. A resumed session therefore lands on the
  SAME `sessionId`, hence the SAME record leaf (ADR-002), hence the SAME index entry (ADR-007) — lineage
  continuity falls out of reading the id instead of minting one.

**Consequences.**
- The routable id costs one flag, one ladder, and deleting one `// never read again` — no capture mechanism,
  no vendor integration, no new transport.
- "Stable" is satisfied in the SPEC's exact terms: the id survives every heartbeat of one session because the
  assistant re-sends the same value on every hook event (measured, §1), and it is never reused across two
  sessions because we never generate one.
- Codex degrades gracefully in both of its measured/documented gaps: if its payload really carries
  `session_id`, Codex sessions are addressable with zero extra work; if it does not, they are live-but-null.
  Neither outcome depends on the unmeasured claim, which is what RESEARCH's "Open/unmeasurable" flag demands.
- A surface can always tell an addressable session from a live one by a `null` check, and can never be misled
  into opening a dead socket.

---

## ADR-002: The session record's key gains a FOURTH component — `(nodeId, workspaceId, assistant, sessionId)` — so two concurrent sessions in one repo are two records; `endSession` deletes ONLY its own leaf; and there is NO migration, because a pre-m48 leaf is an anonymous record that TTL-expires

**Status:** Accepted
**Date:** 2026-08-10
**Departs (deliberately) from m38/ADR-002's key; HONOURS everything else in it.**

**Context.** RESEARCH §3 (measured, code-read): `sessionLeaf` (`src/mesh-session.mjs:65-67`) is
`<node>~<workspace>~<assistant>` — no session component — and `assembleSessionRecord` (`:88-97`) carries no
session id either. The consequences are not theoretical:

- `pingSession` (`:157-171`) upserts blindly: a second concurrent session's ping inherits the FIRST session's
  `startedAt`, silently merging two processes into one record;
- `endSession` (`:178-184`) unconditionally unlinks the shared leaf: session A ending deletes the ONLY record
  for session B, which is still running — B reads as gone from presence until its next ping.

m38/ADR-002 chose the 3-part key deliberately and correctly for what m38 needed ("is *someone* working in
this repo?"). This milestone asks a strictly stronger question ("*which* live session, addressable by id?"),
and a per-`(node, workspace, assistant)` latest-writer-wins liveness fact cannot answer it. This is a
conscious DEPARTURE from that ADR's key, not an oversight: m38's own decision text framed the tuple as "one
assistant, one workspace, one node → one record", which is exactly the assumption RESEARCH §3 falsifies.

**Decision.**
- **The leaf is FOUR parts: `<nodeId>~<workspaceId>~<assistant>~<sessionId>`**, each part passed through the
  existing `safeSegment` independently and joined with the existing `~` separator. The composition rule is
  unchanged; only its arity grows.
- **The anonymous session's fourth segment is the EMPTY string** — leaf `<node>~<workspace>~<assistant>~`,
  with a trailing separator. Chosen because it is a shape a resolved id can never produce (the ADR-001 ladder
  accepts only non-blank values), so an anonymous record can never collide with a real session whose id
  happens to be a sentinel word like `anon`; and because it is visibly distinguishable at a glance from a
  pre-m48 3-part leaf, which has no trailing `~`.
- **The key travels as ONE object, never as a fifth positional argument.** `sessionRecordPath` and the
  `start`/`ping`/`end` verbs take the key as a single `{ nodeId, workspaceId, assistant, sessionId }` value.
  A fifth positional parameter is precisely the shape a caller silently forgets, and a forgotten session
  component reintroduces the collision this ADR exists to close.
- **Every caller's semantics, stated explicitly:**
  - `startSession` — unchanged (an unconditional write), but now per-SESSION, so it can no longer clobber a
    sibling.
  - `pingSession` — still upserts, but the `startedAt` it preserves is now unambiguously **this** session's:
    the merge-two-processes-into-one-record defect is closed by the key, not by a check.
  - `endSession` — deletes ONLY the full 4-part leaf. A sibling session in the same repo is untouched. This
    is the single most important behavioural consequence of the key change.
  - `readSessionRecordsForNode` — **unchanged code, changed meaning**: it filters by the `<nodeId>~` leaf
    prefix and parses records, so it transparently returns N records for one `(workspace, assistant)` pair
    where it previously returned at most one. Every downstream reader (`readLiveSessions`, and through it the
    presence assembler) already iterates a list, so no caller needs teaching — the graph's two-dependent
    blast radius is what makes this safe.
- **The record's frozen schema grows to SEVEN keys, by INSERTION:** `{ nodeId, workspaceId, repo, assistant,
  sessionId, startedAt, lastPingAt }`. `sessionId` is inserted after `assistant` so the identity block
  (`nodeId, workspaceId, repo, assistant, sessionId`) sits together ahead of the lifecycle block
  (`startedAt, lastPingAt`). Every m38 key keeps its RELATIVE order — an insertion, never a reorder, which is
  m38/ADR-001's additive rule applied to this record. `sessionId` is EXPLICITLY PRESENT and `null` for an
  anonymous session (ADR-001), so the frozen key set is unconditional and can be asserted as an exact ordered
  list.
- **There is NO migration, and that is a decision, not an omission.** A pre-m48 3-part leaf on disk parses
  into a record whose `sessionId` is `undefined` → read as `null` → an anonymous session. It rides the wire
  correctly, renders correctly, and is never rewritten (the new writer composes a 4-part leaf), so it ages
  past the TTL within one window (default 120s) and is removed by ADR-006's reaper. **The reaper IS the
  migration.** The live soak's one real record (`umamis-msi~9db1fd84f5895e38~claude-code.json`, RESEARCH §3)
  is gone within two minutes of the first post-deploy ping, with zero migration code and zero risk of a
  half-migrated store. Absence-is-benign expiry, the discipline this store already keeps everywhere else.

**Consequences.**
- RESEARCH §3's two defects are closed structurally: two concurrent sessions in one repo are two records, and
  no session's `end` can delete another's liveness.
- `acd-session-record-frozen` (m38) is AMENDED, not replaced — re-frozen at seven ordered keys with the
  present-and-nullable `sessionId` clause.
- The store's file count per node is now bounded by *live sessions*, not by `(workspace, assistant)` pairs —
  which is exactly why ADR-006's reaper stops being optional.
- The 3-part leaf disappears from the tree with no code that knows it ever existed.

---

## ADR-003: Authority is split by FACT, not by record — PRESENCE is the sole authority on a session's EXISTENCE and LIVENESS; the ASSIGNMENT is the sole authority on its WORK ATTRIBUTION; the join is one-directional (`workItem` derives onto the session, never the reverse) and the session record NEVER stores an item ref

**Status:** Accepted
**Date:** 2026-08-10

**Context.** The SPEC forbids "a second authority that can disagree" with the assignment's own `sessionId`,
and RESEARCH §2 measured that both producers legitimately write the SAME id for one worker session: the
transcript-dir watch (`mesh-worker-execution.mjs:975-1032` → `global_assignments.session_id`) and, when the
worktree carries this repo's own `.claude/settings.json`, the hook path independently (`pinWorkspaceIdInCheckout`
at `:805-833` deliberately pins the workspaceId so both agree). §2's own conclusion is precise: the VALUE
cannot diverge, because both are downstream of one Claude-Code-assigned UUID; the risk is in **how each
producer keys and stores it**.

So "which record wins" is the wrong question — it invites picking a winner and then reconciling. The right
question is which record is authoritative for which *fact*.

**Decision.**
- **Presence owns EXISTENCE + LIVENESS.** "Session S is alive on node N, in workspace W, driven by assistant
  A, last seen at T" is answered by the presence record's `sessions[]` and by nothing else. The node that
  runs the session is the only writer, the TTL predicate is the only expiry rule (ADR-006), and no other
  layer may add, drop, or re-time an entry.
- **The assignment owns WORK ATTRIBUTION.** "Assignment X, for item ref R, is held by node N and executes in
  session S" is answered by `global_assignments` and by nothing else. This milestone adds no writer, no
  column, and no lifecycle to that table.
- **The join is ONE-DIRECTIONAL and happens exactly once.** `workItem` is DERIVED at index-build time
  (ADR-007) by looking up `global_assignments WHERE target_node_id = <nodeId> AND session_id = <sessionId>`.
  It is a **projection**, computed at read time from the authoritative row, and it is stored nowhere. The
  session record on disk carries NO `ref`, NO `itemRef`, NO `workItem` — a fitness function forbids it
  structurally. There is therefore no second copy of the attribution that could go stale or disagree; there
  is only the assignment row and a view of it.
- **Membership is decided by presence ALONE; the assignment contributes attribution ONLY.** An assignment
  row is not a liveness fact — an assignment can sit `running` while its worker is dead, which is precisely
  why run-reclaim exists. So the index never adds an entry because an assignment mentions a session; it only
  decorates an entry presence already put there. This is what makes the two authorities structurally
  incapable of contradicting each other: they answer different questions, and only one of them decides who is
  in the set.
- **The worker does NOT write session records.** A tempting "completeness" fix — have the worker's
  transcript-watch capture also write a session record so every assignment-backed session appears in the
  index — is REFUSED. That capture has no heartbeat of its own, so such a record would need its own expiry
  rule: a second staleness authority, forbidden by `acd-session-ttl-reuses-isstale` and by m38/ADR-002. The
  correct path to an assignment-backed session appearing in the index is the hook firing inside the worktree,
  which RESEARCH §2 measured already happens for a checkout that carries `.claude/settings.json` — and, from
  m50, the launcher registering the sessions it spawns.
- **No gap is created.** A worker session whose worktree has no hooks is absent from the session index and
  remains addressable exactly as it is today, through its assignment's own `sessionId` (the pre-existing
  path, untouched). The index complements the assignment path; it does not duplicate or replace it.

**Consequences.**
- One value, two producers, zero reconciliation code — because neither producer is asked a question the other
  also answers.
- `workItem` cannot go stale: it is recomputed from the authoritative row on every read, in a function with
  no I/O and no cache (ADR-007).
- A session doing assignment work and a session doing nothing are the same kind of thing on the wire,
  differing only in a derived field — which is what makes ADR-005's "free session is first-class" real rather
  than aspirational.

---

## ADR-004: The wire carries EVERY live session — run-subsumption MOVES from the producer to the formatter, and the wire carries the FACT (`workspaceHasRun`) that makes the rule computable there. This AMENDS m38/ADR-004: its rendered behaviour is preserved byte-for-byte; only the point at which it is applied moves

**Status:** Accepted
**Date:** 2026-08-10
**Amends m38/ADR-004 (and its 2026-07-12 as-built AMENDMENT). The RULE is unchanged and stays binding.**

**Context.** `src/mesh-launcher.mjs:585` reads:

```js
sessions = (await readLiveSessions(ws, nodeId, options)).filter((session) => !workspacesWithRuns.has(session.workspaceId));
```

That line is m38/ADR-004's display rule implemented **on the wire**. m38's amendment put it there for a
sound reason, measured at `aof:verify 38` (finding F1): `activeRuns` is the FROZEN m23 bare `string[]` with
no workspace attribution, so a formatter handed only `{ activeRuns, sessions }` **cannot** decide whether a
run belongs to the same workspace as a session — "the fact it would need is not on the wire". The assembler,
which loops per workspace, was the only place the attribution existed.

But this milestone's entire point is that **any** live session is addressable. Under the current filter, a
session doing assignment work — the most interesting session on the fleet, the one an operator most wants to
open a terminal on — is dropped from `sessions[]` at exactly the moment it starts working. The wire is lossy
by policy. That cannot stand alongside "any live session on any node is addressable as `(nodeId, sessionId)`".

The resolution is not to overrule m38's amendment but to remove its premise: **put the missing fact on the
wire.** Growing `activeRuns` into attributed objects is forbidden (m23/ADR-002's freeze,
`acd-active-runs-frozen-string-array`, pinned in two languages). So the fact rides the session entry instead.

**Decision.**
- **The producer drops NOTHING.** The `.filter(...)` at `mesh-launcher.mjs:585` is DELETED. `sessions[]` on
  the wire becomes the COMPLETE set of this node's live sessions.
- **Each session entry carries `workspaceHasRun: boolean`** — "at least one run was `running` in this
  session's workspace when this record was assembled", stamped by the assembler, which is still the only
  place workspace attribution exists (that half of m38's amendment is untouched and is what makes this
  possible at all).
- **The wire carries the FACT; the formatter applies the POLICY.** `workspaceHasRun` deliberately names the
  observation, not the decision. It is not called `subsumed` because subsumption is ADR-004's *rule*, and a
  rule may be revised without a wire change. The formatter — `fleetCurrentWorkLines`
  (`ui/src/fleet/runs.mjs`) — filters `sessions` to `workspaceHasRun === false` before building the
  `working · <repo…> (session)` line. **The rendered output is identical for every payload**, because the
  identical predicate now runs one hop later over a fact the assembler decided.
- **m38's "render layers are PURE FORMATTERS over already-decided facts" discipline is HONOURED, not
  weakened.** The formatter does not re-derive attribution, does not re-derive liveness, does not join runs
  to workspaces, and does not touch `activeRuns`. It reads one boolean it was handed. The thing m38's
  amendment forbade — a render layer *inventing* workspace attribution — remains impossible.
- **The Rust desktop surface requires NO change, and this is a code-derived fact, not an assumption.**
  `current_work` (`app/desktop/crates/core/src/view_model.rs:192-202`) short-circuits: `if !runs.is_empty()
  { return CurrentWork::Running { .. } }` **before it ever reads sessions**. `workspaceHasRun === true`
  implies `activeRuns` is non-empty, so every session this change newly exposes reaches the Rust formatter
  only on a path that already returned. The desktop's rendered output is byte-identical with or without this
  ADR, no cargo rebuild is entailed, and the cross-language duplication m38's amendment documented does not
  widen.
- **The existing fitness function INVERTS and must be amended in the same change.**
  `test/arch/acd-session-run-reconciliation.test.mjs:138` currently asserts *"the SAME-workspace session is
  subsumed — absent from the assembled sessions[]"*. Under this ADR that assertion becomes FALSE and the
  suite goes RED. It is AMENDED in place (it is ADR-004's test, and ADR-004 is what is being amended): the
  producer-fed half now asserts the session is PRESENT with `workspaceHasRun: true`, and the formatter half
  asserts the rendered line set is unchanged. Its self-check inverts correspondingly. Naming the exact line
  here is the point — an un-named inversion is a red CI nobody scheduled.

**Consequences.**
- A session backed by an assignment is visible and addressable — the milestone's headline capability, which
  the old filter made structurally impossible.
- `working · <repo> (session)` still appears only as a fallback, exactly as m38/ADR-004 specified and exactly
  as the DESIGN's state table describes. No operator sees any difference.
- The wire is now COMPLETE and the render is now the ONLY place a display policy lives — which is the correct
  layering, and the reason milestones 49/50 can add surfaces without renegotiating the producer.
- One fitness function is amended rather than added: the invariant kept its home.

---

## ADR-005: The presence session ENTRY is a FROZEN, ORDERED SIX — `{ sessionId, workspaceId, repo, assistant, lastPingAt, workspaceHasRun }` — grown by INSERTION with both new keys ALWAYS present; the ONLY seams that must be taught are `readLiveSessions` and the TypeScript mirror, and every pass-through hop MUST STAY a pass-through

**Status:** Accepted
**Date:** 2026-08-10
**HONOURS m38/ADR-001's additive discipline verbatim; extends it one level down, from the record to the entry.**

**Context.** RESEARCH §5 traced all nine hops and produced an unusually precise answer: the wire is already
almost entirely transparent to a new per-entry field. `assemblePresenceRecord` (worker) spreads;
`buildPresenceFrame` spreads; `applyPresenceFrame` (control) rebuilds the TOP-LEVEL record from a 6-key
whitelist but passes each session ENTRY through unexamined (`safeSessionArray`,
`control-stream-server.mjs:270-274`, checks only "is a non-array object"); `assembleGlobalRegistrySnapshot`
reshapes through the same assembler; `shapeGlobalStatus` spreads; the HTTP route serialises whole. Exactly
**two** places are lossy or need teaching: `readLiveSessions`'s field-level projection
(`src/mesh-presence.mjs:101-106`) and `ui/src/fleet/api.ts`'s `PresenceSession` type — the latter for
type-safety and consumption, not for delivery (it strips nothing at runtime).

m38/ADR-001 established how to grow this record: insert, never reorder; always present, never omitted; the
key set is re-frozen and re-asserted order-sensitively. STATE.md instructs us to grow it the same way rather
than invent a convention. This ADR does exactly that, one level deeper.

**Decision.**
- **The frozen entry, in this exact order:**

  ```
  { sessionId, workspaceId, repo, assistant, lastPingAt, workspaceHasRun }
  ```

  `sessionId` leads because it is the key — it mirrors the record's own `nodeId`-first shape and reads as
  "which session, then where, then who, then when, then the run fact". `workspaceHasRun` trails as the
  derived policy-input (ADR-004). **The m38 four (`workspaceId, repo, assistant, lastPingAt`) keep their
  relative order** — this is an insertion at the head and an append at the tail, never a reorder, so m38's
  ordering discipline survives intact.
- **Both new keys are ALWAYS present.** `sessionId` is `string | null` (ADR-001); `workspaceHasRun` is a
  boolean, `false` when the assembler observed no run in that workspace. Neither is ever omitted. This is
  SPEC's own instruction ("present and never omitted", the `sessions: []` precedent) and it is what lets the
  key set be asserted as one exact ordered list rather than a family of conditional shapes.
- **`readLiveSessions` is the ONE place the projection is written.** It projects each surviving record to the
  six keys above, reading `record.sessionId ?? null` (absence-tolerant, so a pre-m48 record on disk projects
  a well-formed anonymous entry — ADR-002's no-migration claim depends on this line) and stamping
  `workspaceHasRun` from an injected `workspacesWithRuns` set that DEFAULTS TO EMPTY. The default matters:
  with no set supplied the projection is behaviour-neutral, which is what lets story 01 merge before story 02
  (ADR-008).
- **`ui/src/fleet/api.ts`'s `PresenceSession` is the TYPED MIRROR of this entry — a type ON THE WIRE, not a
  UI surface.** It declares exactly these six keys, in this order, with `sessionId: string | null`. It is
  therefore IN SCOPE despite the SPEC's UI exclusion: it describes the contract, and the surfaces that
  consume it (m49) are what is excluded. A type that lags the wire is how the next milestone reads a field
  that is not there.
- **Every pass-through hop MUST STAY a pass-through.** `applyPresenceFrame`'s `safeSessionArray` is NOT
  taught a per-entry field whitelist, and no other hop grows one. This is stated as a decision because the
  helpful-looking change (validate each field at the control) would convert a free-forever seam into one that
  must be edited by every future milestone — and, done wrong, would silently drop the very field this
  milestone adds. The top-level presence whitelist stays the deliberate one; the entry level stays open.
- **The record's presence-level shape is UNCHANGED.** No new top-level presence key. `sessions` remains the
  m38 key in the m38 position; `activeRuns` remains the frozen bare `string[]`
  (`acd-active-runs-frozen-string-array` stays green untouched).

**Consequences.**
- The teach-list for this milestone's wire is exactly two files (`mesh-presence.mjs`, `api.ts`) plus the
  assembler's supply of `workspacesWithRuns` (ADR-004) — a blast radius RESEARCH §5 measured rather than
  guessed, and the reason story 01 is small and independent.
- `src/control-stream-server.mjs` — 37 dependents, the highest-risk file in the path — is not edited at all.
- A no-session node still emits `sessions: []`; a node with sessions emits a stable six-key entry shape
  regardless of assistant, anonymity, or run activity.

---

## ADR-006: TTL is the ONLY end-of-life mechanism (`end` is an optimisation, never the mechanism), and the ORPHAN REAPER runs at the WRITE seam on the owning node — `startSession`/`pingSession` sweep this node's expired leaves using the SAME `isSessionLive` predicate and the SAME injected clock. No daemon, no schedule, no second staleness rule

**Status:** Accepted
**Date:** 2026-08-10
**HONOURS m38/ADR-002's TTL self-expiry and its single-predicate rule without amendment.**

**Context.** RESEARCH §4 (measured): nothing removes a session record. `isSessionLive` is a pure read-time
filter that never touches disk; `readLiveSessions` filters and returns survivors without deleting;
`endSession` is the ONLY deleter in the codebase and has exactly ONE call site — the `aof session end` CLI
verb (`src/commands/mesh-session.mjs:295`). `src/mesh-store.mjs`, which sweeps other partitions, has no
reference to `sessions` at all. So a crashed, force-killed, or machine-off session leaves a file on disk
forever: invisible to every live read, but never removed.

RESEARCH §1 sharpens this from a hygiene problem into a structural one: **Codex has no `SessionEnd` event at
all** — not a missing wire-up in our bundle, a product gap confirmed against the vendor's own event table. So
for Codex, TTL expiry is the only end-of-life signal **by construction**. And ADR-002 makes the orphan
problem worse before it makes it better: with a per-session key, a machine accumulates one stale leaf per
crashed *session*, not one per `(node, workspace, assistant)` triple. A reaper stops being tidy-up and
becomes load-bearing.

**Decision.**
- **`end` is an optimisation, never the mechanism.** Nothing in this design may depend on `aof session end`
  running. It makes a disappearance immediate; TTL expiry makes it certain. Every liveness claim in this
  milestone rests on the TTL.
- **A named verb owns removal: `reapExpiredSessions(workspace, nodeId, options)`, in `src/mesh-session.mjs`
  — the module that already owns the records and already owns the codebase's only session `unlink`.** It
  reads this node's leaves (the existing node-prefix-scoped read), and unlinks each record for which
  `isSessionLive(record, nowMs, ttlMs)` is FALSE. The predicate is IMPORTED, not re-expressed: there is no
  second `Date.parse(...) > ...` anywhere in the reap path. One staleness definition, as
  `acd-session-ttl-reuses-isstale` already requires.
- **It runs at the WRITE seam, not the read seam: `startSession` and `pingSession` reap before they write.**
  This is the decisive placement choice, and it is chosen for four reasons, in order of weight:
  1. **It keeps reads pure.** `readLiveSessions` and `readSessionRecordsForNode` are documented as reads that
     mutate nothing (mirroring `readActiveRuns`); making a read delete would break a discipline nine
     dependents rely on.
  2. **It needs no new call site, no new schedule, and no launcher edit.** `start`/`ping` are already the
     module's sole producers, already in the sessions directory, already hold the injected `now` and the
     resolved TTL. The sweep is free at a seam that already does this exact I/O.
  3. **It runs on the node that OWNS the records.** Session records live in the node's own global mesh home;
     no other node can see or delete them. The control node NEVER reaps a peer's session record — it holds
     none, and asserting otherwise would make it a second authority over liveness (ADR-003).
  4. **It keeps the whole lifecycle inside one story's file** (ADR-008, story 00), so the reaper does not
     force a second story to edit `mesh-launcher.mjs`.
- **It is failure-isolated and idempotent.** An unlink fault (a racing sibling already removed the file, a
  locked file, a permission error) is reported through the coded-degrade seam and never propagates: a session
  `start`/`ping` MUST NOT fail because a stale neighbour could not be deleted. Reaping twice is a no-op.
- **The reap and the read share ONE clock per invocation.** The same injected `now` and the same resolved
  `ttlSeconds` feed `reapExpiredSessions` and any read in the same call, so a record cannot be judged live by
  one and dead by the other within one operation.
- **The residual is accepted and stated.** A machine that never starts another session keeps its orphans.
  That is bounded (one file per dead session), invisible to every read (the TTL filter already excludes
  them), and harmless (nothing is running there). Trading it away would cost a daemon, a schedule, or a
  read-that-writes — each a worse structure than the leak it fixes.
- **This is also ADR-002's migration.** Pre-m48 3-part leaves are stale within one TTL window and are
  unlinked by the first `start`/`ping` after deploy. No migration code exists because none is needed.

**Consequences.**
- A crashed Claude Code session, a killed Codex session (which can never fire `end`), and a machine powered
  off mid-session all converge on the same outcome — gone from the wire within one TTL, gone from disk on the
  next session — through one predicate and one code path.
- Disk growth is bounded by live sessions, not by history, which is what makes ADR-002's per-session key
  affordable.
- No new process, no new timer, no new config knob: the TTL knob (`config.mesh.session.ttlSeconds`) and its
  documented default (`DEFAULT_SESSION_TTL_SECONDS = 120`) are reused unchanged.

---

## ADR-007: The fleet-side session index is a DERIVED, REBUILDABLE PROJECTION built inside `src/global-mesh-query.mjs` — never a SQLite table, never a durable record; membership is gated by the node's ALREADY-DERIVED `freshness`, session liveness is NEVER re-derived, and `workItem` is `null` for a free session

**Status:** Accepted
**Date:** 2026-08-10
**HONOURS m34/ADR-003 (rebuildable projection), m23/ADR-004 (the liveness cache is never a second system of record), m38/ADR-014 (nothing about the mirror becomes durable), and m26/ADR-003 (ambiguity fails CLOSED).**

**Context.** RESEARCH §6 (measured): no SQLite table is keyed by `(nodeId, sessionId)`. `global_nodes` (PK
`node_id`) carries no session data; `global_node_workspaces` is pure membership; `global_assignments` has a
`session_id` column but is keyed by `assignment_id` and indexed on `(workspace_id, item_ref)` — and it only
exists for a session that HAS an assignment, which is the case this milestone is explicitly not about.
Presence is not in SQLite at all: `queryGlobalRegistry` reads `presence/<nodeId>.json` off disk and merges it
onto the node row in memory (`global-node-registry.mjs:208-209`). `shapeGlobalStatus` is documented as a pure
function with no I/O of its own.

So there are two candidate homes and they are not equivalent. A new SQLite table would make the control node
a **writer** of session state, with its own insert path, its own row lifetime, and — fatally — its own expiry
rule, because the source of truth is a TTL-expiring disk record. That is a second authority over liveness
(forbidden by the SPEC and by ADR-003) and a second staleness rule (forbidden by
`acd-session-ttl-reuses-isstale`). The derived projection has neither problem, and it is the discipline this
codebase already keeps for exactly this class of fact.

**Decision.**
- **The index is a PURE PROJECTION with no I/O, and it lives in `src/global-mesh-query.mjs`** — the module
  that already *is* the control node's no-I/O shaper over `{ registry, assignments }`, and whose graph
  position (ONE source dependent, `mesh-ui-serve.mjs`) makes it a safe place to grow. A named export,
  `buildSessionIndex({ nodes, assignments, now })`, is called by `shapeGlobalStatus` and is directly callable
  in-process. **No SQLite table. No new file. No new `src/` root sibling** (ADR-009).
- **It is a LOOKUP in-process and an ARRAY on the wire.** `buildSessionIndex` returns a structure exposing
  `lookup(nodeId, sessionId)` — an O(1) answer to "is this tuple a live session, and what is it doing" —
  plus its deterministic array form. **It never materialises a composed string key.** A `"${nodeId}::${sessionId}"`
  key would duplicate the mirror's own private `routingKey` composition (`mesh-terminal-mirror.mjs:64-67`),
  creating two spellings of one tuple that could drift; a nested lookup has no spelling to drift. This also
  keeps the index free of any edge to the mirror (which would drag the relay transport into a pure shaper's
  import graph) — the SPEC's "changing how the mirror routes is out of scope" is honoured by not touching it
  at all.
- **The index entry, in this exact order:**

  ```
  { nodeId, sessionId, workspaceId, repo, assistant, lastPingAt, workspaceHasRun, workItem }
  ```

  `nodeId` leads (the other half of the routing tuple), then ADR-005's frozen entry verbatim and in order,
  then the one derived field. The entry is **self-sufficient**: a consumer answers "what live sessions exist
  across the mesh" from this array alone, with no join back into `nodes[].presence`.
- **`workItem` is EXPLICITLY PRESENT and `null` for a free session** — never omitted, never a fabricated ref.
  When the session IS doing assignment work it is `{ ref, assignmentId }`, derived per ADR-003 from
  `global_assignments` on `(target_node_id, session_id)`. Nothing else about the assignment is copied: the
  item's title, status and workspace are already in the payload's own `items[]`, joinable on `ref`, and
  copying them here would be the second-derivation shape these reviews keep refusing. A session with no
  matching assignment is never dropped, never demoted, and never annotated — `workItem: null` is the whole
  representation, and it is the SPEC's "sessions with no work item are the whole point" made structural.
- **Membership is gated by the node's ALREADY-DERIVED `freshness`, and by nothing else.** Only a node whose
  registry row reports `freshness === "live"` contributes sessions. This is the strongest available form of
  "reuse the shared predicate": the index does not merely call the same function, it reads the fact the
  registry already derived (`global-node-registry.mjs:197`, `freshnessFor`) — so the session index and the
  fleet's own health dot can never disagree about whether a machine is alive. The gate is REQUIRED, not
  defensive: a node that stops heartbeating leaves its presence file frozen on disk with its sessions inside
  it, which would otherwise read as live forever. `"stale"` and `"unknown"` both contribute nothing —
  ambiguity fails CLOSED (m26/ADR-003).
- **Session-level liveness is NEVER re-derived at the control.** The publisher already TTL-filtered its own
  sessions before publishing, and m38's amendment states the rule the control keeps: it "carries it through
  VERBATIM and never re-derives it — the worker is the single filtering authority". A second TTL evaluation
  here could disagree with the publisher (different `config.mesh.session.ttlSeconds` on two machines) and
  would be exactly the second authority the SPEC forbids. Node-level gate: yes. Session-level re-filter: no.
- **Anonymous sessions are NOT in the index, and that is not a silent drop.** An index keyed on
  `(nodeId, sessionId)` cannot hold an entry whose `sessionId` is `null`. Those sessions remain COMPLETE and
  first-class in `nodes[].presence.sessions[]` — they are live, they render, they count the node as working.
  The division is stated plainly so no one mistakes it for a filter: **`sessions[]` is the complete liveness
  truth; the index is its ADDRESSABLE subset.**
- **It reaches the browser as ONE additive top-level key on the global status payload:
  `sessions: SessionIndexEntry[]`**, sorted by `(nodeId, sessionId)` ascending codepoint order for
  determinism across polls. Every existing key of `shapeGlobalStatus`'s return is byte-unchanged.
  `ui/src/fleet/api.ts` gains the matching `MeshSession` type and `GlobalMeshStatus.sessions` — the typed
  mirror, per ADR-005's reasoning, not a UI surface.
- **Rebuildability, stated as the test:** delete nothing and rebuild everything — the same
  `{ nodes, assignments }` inputs yield a content-identical index, because the function holds no state, opens
  no store, writes no file, and caches nothing. That is m34/ADR-003's discipline and it is what keeps this
  from ever becoming an authority.

**Consequences.**
- The control node answers "what live sessions exist across the mesh" as a lookup, with no scan of
  assignments and no new persistence.
- Nothing durable is created, so nothing can go stale, so no reconciliation, repair, or sweep is ever needed
  for the index.
- m49 consumes one array and one lookup; m50 registers sessions into presence and they appear in the index
  with no index-side change.
- `src/` gains no root sibling and no new table — the milestone's structural footprint is one function in an
  existing pure module (ADR-009).

---

## ADR-008: The milestone partitions into FOUR stories along the graph's real seams — `session-id-of-record`, `session-on-the-presence-wire`, `run-subsumption-at-the-formatter`, `fleet-session-index` — with exactly two merge-order edges and no build-order blocking

**Status:** Accepted
**Date:** 2026-08-10

**Context.** Boundaries must follow REAL coupling so stories build in parallel. The graph (grounding block)
reports the coupling precisely: `mesh-session.mjs` has two source dependents (one of which is its own CLI);
`commands/mesh-session.mjs` has one (`cli.mjs`); `mesh-presence.mjs` has nine; `mesh-launcher.mjs` is a
36-out/2-in sink; `global-mesh-query.mjs` has one (`mesh-ui-serve.mjs`); `ui/src/fleet/api.ts` has one
(`Fleet.tsx`); `control-stream-server.mjs` needs no edit at all.

**Decision — the four stories** (full rationale, ownership and evidence are carried in the partition the PO
scaffolds from; the binding structure is here):

- **00 `session-id-of-record`** — the PRODUCER dimension. Owns `src/mesh-session.mjs` and
  `src/commands/mesh-session.mjs` in full: ADR-001's ladder + `--session` flag, ADR-002's 4-part key and
  7-key record, ADR-006's reaper. Emits NO wire change. Depends on nothing.
- **01 `session-on-the-presence-wire`** — the WIRE-SHAPE dimension. Owns `readLiveSessions`
  (`src/mesh-presence.mjs`) and `PresenceSession` (`ui/src/fleet/api.ts`): ADR-005's frozen six-key entry,
  projecting `record.sessionId ?? null` and stamping `workspaceHasRun` from an injected set that defaults to
  empty. **Behaviour-neutral on its own** — with the default empty set, every entry reports
  `workspaceHasRun: false`, the launcher still filters, and the render is untouched.
- **02 `run-subsumption-at-the-formatter`** — the POLICY-MOVE. Owns the session block in
  `src/mesh-launcher.mjs` and `ui/src/fleet/runs.mjs`: delete the filter, supply `workspacesWithRuns`, add
  the formatter's one-line policy filter, amend `acd-session-run-reconciliation`. This is the ONLY
  behaviour-changing merge in the milestone and it is deliberately isolated so it gets its own review.
- **03 `fleet-session-index`** — the CONTROL dimension. Owns `buildSessionIndex` + the additive `sessions`
  key in `src/global-mesh-query.mjs`, and `MeshSession`/`GlobalMeshStatus.sessions` in `ui/src/fleet/api.ts`.

**The dependency edges are MERGE-ORDER, not build-order, and there are exactly two:** 02 → 01 (it needs
`workspaceHasRun` to exist on the entry) and 03 → 01 (ADR-008 of m38 requires its proof be fed by the REAL
producer, and the real producer only emits `sessionId` once 01 lands). 00 → nothing; 01 → nothing (it is
absence-tolerant by construction, projecting `null` until 00 lands). Every story can be BUILT in parallel
from day one.

**Where two stories touch one file — disjoint, no conflicting hunk.** 01 and 03 both edit
`ui/src/fleet/api.ts`, at disjoint declarations (`PresenceSession` vs. a new `MeshSession` +
`GlobalMeshStatus`). This is the m38/ADR-007 shape — a shared file, non-overlapping edit sites — and it
mechanically merges.

**A cut considered and REJECTED on graph evidence.** Splitting the reaper (ADR-006) into its own story was
rejected: its record-side verb belongs in `mesh-session.mjs` (story 00's file) and any read-seam placement
would have put its call site in `mesh-launcher.mjs` (story 02's file), in the SAME function story 02 rewrites
— a genuine hunk collision, not a distant-common-importer relationship. Placing the reap at the write seam
(ADR-006) removes the cut entirely and keeps the whole lifecycle inside one story.

**Consequences.**
- Four stories, two merge edges, zero blocked builds.
- The one risky merge (02) is the smallest story and carries its own inverted fitness function.
- No story requires UI surface work: 01/03 touch only `api.ts` (the wire's typed mirror) and 02 touches only
  `runs.mjs` (a pure, framework-free formatter). No component, no layout, no interaction — the SPEC's UI
  exclusion holds.

---

## ADR-009: The session projection gets ONE home — the `workspaceHasRun` stamp is applied inside `readLiveSessions` (`mesh-presence.mjs`), not inline in the launcher — so this milestone REMOVES a block from the widest-out-degree file in `src/` instead of adding one; and it mints NO new `src/` root sibling

**Status:** Accepted
**Date:** 2026-08-10

**Context.** `src/mesh-launcher.mjs` is 1,758 lines with 36 dependencies and 2 dependents — the widest
out-degree in `src/`, and a *sink* rather than a hub. TECH_DEBT item 10 named this trajectory on 2026-08-02
at 1,693 lines / 30-out, and stated the rule for milestones that touch it: **"add a call site to it, never a
block."** The `src/` flat root, measured today at refine, stands at **109** root-level `.mjs` files (202 →
106 across m43; item 10's table ends at 106) — the same accretion, one level up.

This milestone touches that file (ADR-004) and would naturally want a new module for the index (ADR-007).
Both are chances to make the tree worse by two small, individually-defensible diffs.

**Decision.**
- **The session projection has ONE home, and it is `mesh-presence.mjs`.** `readLiveSessions` — which already
  reads the records, already applies the TTL, and already owns the entry's shape — also applies the
  `workspaceHasRun` stamp, from an injected `workspacesWithRuns` set. The launcher's role shrinks to
  *supplying the set it alone can compute* and passing the result through. The launcher's inline
  `.filter(...)` block (`:583-588`) is DELETED, not relocated: **the launcher gets shorter**, and the session
  projection stops being split across two modules.
- **No new `src/` root sibling.** The index lives in the existing `global-mesh-query.mjs` (ADR-007), which is
  already the pure shaper for exactly this payload. Root count stays 109. This is the "extend the existing
  surface, never add a sibling" rule applied where it is cheapest to apply — at design time, before the file
  exists.
- **No new test-root sibling beyond the invariants themselves.** Two of this milestone's fitness functions
  AMEND existing files (`acd-session-record-frozen`, `acd-session-run-reconciliation`) rather than minting
  parallel ones; only genuinely new invariants get new files.

**Consequences.**
- The milestone's net structural effect on `src/` is: one file shorter (`mesh-launcher.mjs`), one function
  richer (`mesh-presence.mjs`), one function added to an existing pure module (`global-mesh-query.mjs`), zero
  new root siblings, zero new tables.
- TECH_DEBT item 10's rule is satisfied in the strong form (a block removed) rather than the weak one (a call
  site added).
- The measurement is recorded in TECH_DEBT item 10 so the trend line stays evidence-based; no new debt item
  is created, because this is the same shape item 10 already owns and a duplicate entry is the accretion
  these reviews refuse.

---

## ADR-010: The five routed gaps, settled — the session segment is ESCAPED (never collapsed), a `lookup` miss is `null`, an absent or non-boolean `workspaceHasRun` NEVER subsumes, the `(session)` line does NOT learn to deduplicate in this milestone, and the reaper's `unlink` is an INJECTED options seam

**Status:** Accepted
**Date:** 2026-08-10
**Amends ADR-002's leaf-composition clause, for the FOURTH segment only. Otherwise it COMPLETES ADR-004,
ADR-005, ADR-006 and ADR-007 at the exact points each left a value unfixed. ADR-001…009 stand unedited.**

**Context.** `STATE.md` §Notes & decisions in flight routed FIVE open questions to the architect at build
start — three design gaps QA deliberately did not settle in the task features, and two feasibility
questions the refine's developer pass never reached (its Three-Amigos agents died on a session limit).
Each is a value that would otherwise be fixed by whichever line the build typed first, and each is
observable, so each would become a de-facto contract. They are settled here, together, because three of
them are the same question asked at three layers: *what does this system do with an input it was not
given?*

Every ruling below names the line it was read from, and every ruling carries the clause that makes it
fail CI. Those clauses AMEND the numbered fitness functions in §Fitness functions (this milestone) below
rather than minting new files (ADR-009's no-new-test-sibling rule); the numbered list itself is unchanged
and this ADR is its amendment of record.

**Codebase-graph grounding, re-run at this decision point.** `aof graph build .` (project root, code-only,
no `--backend`, egress none) rebuilt to **9,244 nodes / 22,194 edges, `builtAt` 2026-08-10T22:47:56.660Z** —
fresher than the refine's artifact and confirming its shape. `aof graph impact` over the six files these
rulings touch reports, as actual structure: `src/mesh-session.mjs` still has exactly TWO source dependents
(`src/commands/mesh-session.mjs`, `src/mesh-presence.mjs`) and 12 test files; `src/commands/mesh-session.mjs`
still has ONE source dependent (`src/cli.mjs`); `ui/src/fleet/runs.mjs` has TWO source dependents
(`Fleet.tsx`, `scope.mjs`) and four test files, and imports NOTHING; `src/global-mesh-query.mjs` still has
ONE source dependent (`src/mesh-ui-serve.mjs`); `src/mesh-presence.mjs` still has NINE source dependents;
`src/mesh-launcher.mjs` is still 37-out / 2-in. So R1 and R5 land inside a two-dependent module, R2 inside a
one-dependent module, and R3/R4 inside a zero-import leaf — none of these rulings can cascade.

**Decision.**

### R1 — the `~` collision in the new leaf segment (48/00 task 01): the id segment is ESCAPED, never collapsed

- **`safeSegment` is NOT changed, and `~` is NOT added to its collapse set.** Two reasons, both read at
  source. (a) Collapsing would not remove the collision class, only move it: `safeSegment`
  (`src/mesh-session.mjs:55-57`) already maps `/`, `\` and `..` onto the SAME `-`, so `a/b` and `a-b`
  already compose one leaf today — adding `~` to that set buys nothing and renames every existing leaf.
  (b) The three m38 segments must keep composing byte-for-byte, because `readSessionRecordsForNode` scans
  by the literal prefix `` `${safeSegment(nodeId)}~` `` (`src/mesh-session.mjs:125`); the per-node read is
  the one thing in this module that must not move.
- **The FOURTH segment gets its OWN composition, and it ESCAPES.** A session-only helper — call it
  `sessionSegment(sessionId)` — percent-encodes every byte outside the conservative allow-list
  `[A-Za-z0-9._-]` as `%XX` (uppercase hex). `sessionId: null` (anonymous, ADR-001) composes the EMPTY
  segment, exactly as ADR-002 specified: leaf `<node>~<workspace>~<assistant>~`, trailing separator intact.
- **Why escaping settles QA's second question by making it unreachable.** The encoding is INJECTIVE:
  distinct ids compose distinct segments. So "what happens to two ids that collide after collapsing" has an
  answer no build can get wrong — **no two ids collide, because nothing collapses.** The
  merge-two-sessions-into-one-record defect ADR-002 exists to close cannot be re-opened through an id's
  charset. `~` is outside the allow-list (it becomes `%7E`), so the separator stays unambiguous and the leaf
  always splits into exactly four parts; `/`, `\` and `%` are outside it too, so the result is one flat leaf
  under `sessions/` that cannot traverse — the property `safeSegment` gives the other three segments,
  provided by a stronger rule for the one segment whose value is genuinely foreign.
- **The ordinary case is unchanged to the eye.** A UUID (the measured shape — RESEARCH §1/§2; lowercase hex
  plus `-`) encodes to ITSELF, so the live leaf stays readable:
  `umamis-msi~9db1fd84f5895e38~claude-code~3f2b9c14-8a7e-4d61-9f03-1c5ea77b42d9.json`. That legibility is
  load-bearing — RESEARCH §3's evidence is a human reading that directory listing.
- **ADR-001's byte-identity survives, and this clause is what keeps it true.** The encoding exists ONLY
  inside `sessionLeaf`/`sessionRecordPath`. The record's `sessionId` field, the wire entry's `sessionId`
  (ADR-005) and the index's `sessionId` (ADR-007) all carry the id the assistant issued, byte-for-byte.
  There is NO decoder anywhere and there must never be one: nothing reads an id back off a filename
  (`readSessionRecordsForNode` parses record CONTENT, `:127-134`), so the encoding has exactly one
  direction and no second spelling that could drift.
- **Not a hash, and the arch-test author must know why.** A digest would also be injective and would even be
  case-safe, but it destroys the leaf's legibility and it would read as an id transformation to the very
  fitness function that forbids one. To be explicit: `acd-session-id-never-fabricated` (#1) prohibits a
  generated value **assigned to a session id**; a filename encoding is not one, and that detector must stay
  scoped to id assignment rather than to any `createHash` in the file.
- **The residual, stated rather than hidden: a case-insensitive filesystem.** Windows and default macOS
  resolve `…~sessA.json` and `…~sessa.json` to ONE file, so two ids differing ONLY in letter case still
  collide there. ACCEPTED: the measured producers emit lowercase UUIDs (§1/§2); the collision needs a caller
  to hand `--session` two case-only-differing ids for one `(node, workspace, assistant)` at the same instant;
  and both cures (case-folding into the escape, or a digest) cost more than the residual. Written down here
  so the next reader finds a decision rather than a bug.
- **Fitness clause** (amends #2 `acd-session-leaf-per-session`): keys differing only in the id's awkward
  characters — `a~b`, `a-b`, `a/b` — compose THREE distinct leaves; every id in the task's Examples table
  composes a leaf that splits into exactly four `~`-separated parts and creates exactly one flat file; and
  the read-back `sessionId` is byte-identical to the input in each case.

### R2 — a `lookup` miss (48/03 task 00) is `null`, returned explicitly

- **A miss is `null`. Never `undefined`.**
- **Reason 1 — the house idiom, in this very path.** "Asked, and found nothing" is `null` everywhere here:
  `readSessionRecord` returns `null` on any read miss (`src/mesh-session.mjs:105-111`); `pickItemAssignment`
  returns `null` (`src/global-mesh-query.mjs:110-114`); `configuredRelayUrl` returns `null`
  (`src/mesh-launcher.mjs:595-603`). The index would be the odd one out.
- **Reason 2 — it is the SAME distinction ADR-001 already made law**, quoted there from
  `ui/src/fleet/api.ts`: *absent* means "this producer does not speak this dimension", *null* means "speaks
  it, does not know the value". A `lookup` that RAN is speaking the dimension. `undefined` is what
  JavaScript hands back when nothing answered at all — a missing property, a `Map.get` miss, a function that
  fell off its end — so it cannot distinguish "no such session" from "no such lookup", which is exactly the
  confusion an addressability check may not have.
- **Reason 3 — it costs one token and leaks without it.** The natural implementation
  (`byNode.get(nodeId)?.get(sessionId)`) yields `undefined` by default, so the ruling forces an explicit
  `?? null` and makes the contract written rather than an implementation leak.
- **A HIT returns the index ENTRY** — the same ADR-007 eight-key object that appears in the array form, not
  a second shape a caller would have to discriminate.
- **`lookup` never throws, for any input.** Anything that is not a non-empty string in either position is a
  MISS returning `null` — `null`, `""`, `undefined`, a number, an object, a missing argument. Ambiguity fails
  CLOSED (m26/ADR-003): a half-specified tuple is not addressable, and an unaddressable tuple is `null`.
- **What the scenario asserts:** `assert.strictEqual(lookup(...), null)` for EVERY row of the Outline
  (right node/wrong session; wrong node/right session; a `null` id; an empty id; both unknown) — strict
  identity on `null`, not merely falsy — plus "no error thrown", plus the paired positive that the correct
  tuple still returns the entry. The rows themselves remain the anti-half-key proof; strictness is what pins
  the value this ADR fixes.
- **Fitness clause** (amends #5 `acd-session-index-derived-not-stored`): every miss shape returns exactly
  `null`, and no `lookup` call throws for any of them.

### R3 — an ABSENT or NON-BOOLEAN `workspaceHasRun` (48/02 task 01) NEVER subsumes

- **A session is subsumed at the formatter IF AND ONLY IF `workspaceHasRun === true` — a strict comparison
  against the boolean, never truthiness.** The predicate is `sessions.filter((s) => s?.workspaceHasRun !== true)`.
  Absent ⇒ renders. `null`, `undefined`, `"true"`, `"false"`, `1`, `0`, an object ⇒ renders. One rule covers
  the missing key and the malformed value, so there is one branch, not two.
- **Why ABSENT renders — it is CORRECT for the only producer that can emit it.** A pre-m48 node applied
  ADR-004's rule at its OWN producer (`src/mesh-launcher.mjs:585`), so its `sessions[]` is already subsumed;
  treating the absent key as "not subsumed" renders that node exactly as it renders today. Treating it as
  `true` would make every session on every un-upgraded node invisible — a node reading `idle` while it works,
  which is the m38-F7 defect class returning.
- **The failure modes are asymmetric, and the asymmetry is the argument.** Absent⇒`false` can at worst show
  a line that could have been hidden. Absent⇒`true` HIDES live work. ADR-004 exists because a producer that
  drops data is a wire that cannot be re-read; a formatter that drops data on a key it was never given is the
  same mistake one hop later, and this milestone would have imported the very defect it was chartered to fix.
- **It is m43's cache-provenance idiom, already adopted verbatim by ADR-001.** *Absent* = "this producer does
  not speak this dimension". You may not read a POLICY decision out of a dimension the producer does not
  speak; you fall back to what that producer already did.
- **It is also the only ruling under which ADR-004's "rendered behaviour preserved byte-for-byte" is
  literally true of the payloads already in this tree — measured, not asserted.** Every session fixture in
  the repo predates the key: `test/mesh-fleet-session-render.test.mjs:19-21`'s `session()` helper emits the
  m38 four; `test/mesh-fleet-presence-plumbing.test.mjs:278,378` expect `working · repoA, repoB (session)`
  from seeded four-key entries; and the CROSS-LANGUAGE captured payloads
  (`app/desktop/crates/core/src/view_model.rs:580-587`, `:703`, `:760`) are fed through
  `fleetCurrentWorkLines` by `test/arch/acd-captured-producer-fixture.test.mjs:187`, whose non-vacuity check
  at `:302` REQUIRES at least one of them to render `working`. Under absent⇒`true` all of those go red and
  the cross-language fixtures would have to be re-captured before story 02 could go green. Under this ruling
  they stay green, untouched.
- **Why the comparison must be STRICT is a correctness requirement, not style.** `if (session.workspaceHasRun)`
  treats the STRING `"false"` as true and would hide a live session — the wrong answer arrived at by the
  loosest possible reading. A producer that sends a non-boolean has not stated the fact; an unstated fact is
  the absent case, and the absent case renders.
- **The formatter still recomputes nothing else.** It reads ONE field. No liveness, no attribution, no join
  against `activeRuns` (ADR-004, unchanged; `ui/src/fleet/runs.mjs:58-88` keeps every other rule it has).
- **Fitness clause** (amends #8 `acd-session-run-reconciliation`): the formatter's subsumption predicate is a
  strict comparison against boolean `true` — a planted truthiness test trips — and entries carrying the key
  ABSENT, `null`, `"true"` and `"false"` each still contribute their line.

### R4 — the `working · <repo> (session)` line does NOT learn to deduplicate in this milestone (HOLD)

- **HOLD, explicitly.** `ui/src/fleet/runs.mjs:75-78` maps sessions to repos, filters blanks and sorts, and
  does NOT deduplicate. It keeps doing exactly that. The task's Examples row 6 ("today's exact output for two
  same-repo sessions") is pinned as-is, and story 02 changes it in neither direction.
- **Reason 1 — ADR-004's binding constraint.** The entire safety case for story 02 — the milestone's ONLY
  behaviour-changing merge — is that the rendered output is byte-identical for every payload. A dedupe
  changes rendered output for a payload that exists TODAY (two sessions, one repo, no run). Putting a second,
  unrelated display change inside that merge is precisely what ADR-008 isolated story 02 to prevent.
- **Reason 2 — the line has TWO implementations and only one is in scope.** `working · <repo…> (session)` is
  also built in Rust (`app/desktop/crates/core/src/view_model.rs:82`, over `session_repos()`), and
  `acd-captured-producer-fixture` (#3, `crossSurfaceDriftViolations`,
  `test/arch/acd-captured-producer-fixture.test.mjs:176-196`) pins the JS-derived line as a VERBATIM literal
  in the Rust source. Deduping in JS alone FAILS that fitness function; deduping in both is a Rust change and
  a cargo rebuild that ADR-004 explicitly states this milestone does not entail.
- **Reason 3 — it is a DESIGN question, not a formatter tweak.** `demo, demo` is clearly wrong, but the right
  answer is a choice between `demo` (dedupe), `demo ×2` (count), one line per session, or repo + assistant —
  and it is only answerable beside the surface that will actually show sessions.
- **Where the change belongs: milestone 49 (`wiki/work/49_milestone_terminals-home/`)** — the milestone that
  consumes this wire and owns the session-facing surface. Its DESIGN decides the shape; the change then lands
  in BOTH implementations in ONE commit, with the cross-surface captured fixtures re-captured in the same
  change. Recorded here (and already in this milestone's `STATE.md`) so m49 inherits the question
  EXPLICITLY rather than silently — QA's exact ask.
- **No `TECH_DEBT.md` entry is opened for this**, deliberately: it is a deferred DESIGN decision with a named
  owner and a named milestone, not accrued structural cost. A ledger entry for a question that is already
  scheduled is the duplicate-home accretion these reviews refuse.

### R5 — the failing-unlink seam for `reapExpiredSessions` (ADR-006): ADD `options.unlink`, threaded from `start`/`ping`

- **No injectable seam exists today — read at source, not inferred.** `src/mesh-session.mjs:24` imports
  `unlink` from `node:fs/promises` at module scope and calls it directly at `:180`. `startSession` (`:143`)
  and `pingSession` (`:157`) take exactly ONE object — the key plus `now` — and no options bag;
  `readSessionRecordsForNode` (`:118`) takes none either. `src/degrade.mjs:19` offers
  `setDegradeSinkForTest`, which OBSERVES a degrade and cannot CAUSE the fault. `STATE.md`'s own note is
  therefore right: adding a seam is the honest fix, and dropping the scenario is not.
- **The exact seam the developer should use: `options.unlink` on `reapExpiredSessions`, threaded from a THIRD
  parameter on `startSession`/`pingSession`.**
  - `reapExpiredSessions(workspace, nodeId, options)` — ADR-006's own signature — resolves its deleter once,
    `const unlinkFile = options.unlink ?? unlink` (the module's existing import), and takes its clock and TTL
    through the SAME option names `readLiveSessions` already uses (`options.now`, `options.ttlSeconds`,
    `options.config`; `src/mesh-presence.mjs:93-97`). ADR-006's "the reap and the read share ONE clock per
    invocation" is then expressed by passing ONE options object, not by inventing a convention.
  - `startSession(workspace, key, options = {})` and `pingSession(workspace, key, options = {})` gain a THIRD
    parameter and forward it to the reap. ADR-002's "the key travels as ONE object" is untouched — the key
    object does not grow; the seams live in a separate trailing bag, which is the `(workspace, nodeId,
    options)` shape this module's own neighbours already keep. Production supplies nothing:
    `src/commands/mesh-session.mjs:286` and `:291` call with two arguments and keep doing so.
  - **`endSession` does NOT get the seam.** It is not the reaper, its ENOENT tolerance is already proven
    (`:178-184`), and a seam no scenario needs is a production path waiting to be misused.
- **Why an injected function and NOT a real filesystem fault.** A real fault is not portable across this
  fleet's three platforms: Windows ignores `chmod`, POSIX unlinks an open file happily, and the obvious trick
  — leaving a DIRECTORY where the leaf should be — never reaches the unlink at all, because
  `readSessionRecordsForNode`'s `readFile` throws `EISDIR` and the catch at `src/mesh-session.mjs:131-133`
  skips the entry, so the reaper never sees a record to delete. The injected deleter is also the HOUSE
  convention for exactly this proof: `test/mesh-presence-aggregate-workspaces.test.mjs:300-318` drives a
  fault through the launcher's `options.listItems` seam for the same stated reason, and `options.openStore`
  is used identically at `:195`.
- **How the scenario proves it** (the shape story 00's task 02 needs): seed one live record and one expired
  record; call the REAL `pingSession` with `{ unlink: async () => { throw Object.assign(new Error("locked"),
  { code: "EPERM" }) } }`; then assert (a) `pingSession` RESOLVES and its own record is on disk with the new
  `lastPingAt`; (b) the expired leaf is STILL on disk — the reap genuinely tried and genuinely failed, which
  is what makes the scenario non-vacuous; (c) the fault was reported through the coded-degrade seam
  (`reportDegrade`, observed via `setDegradeSinkForTest`, `src/degrade.mjs:19`), never swallowed silently;
  and (d) a second `pingSession` with no seam supplied removes it — idempotent, and the fault was the seam's,
  not the reaper's.
- **Fitness clause** (amends #3 `acd-session-orphan-reaped`): the seam DEFAULTS to the module's real `unlink`,
  and NO `src/` call site supplies `options.unlink` — a production caller that passes one is a violation, so
  a test seam can never become a production door.

---

**Build note (measurement, not a decision): exactly what goes RED, and what does not.**

`STATE.md` records that only the amended arch-test was enumerated. This is the rest of the measurement,
taken by reading every `record.sessions` / `handle.record.sessions` assertion in `test/`.

**(A) Deleting the producer filter at `src/mesh-launcher.mjs:585` turns THREE assertions red, in three
suites — and nothing else in the tree.**

1. `test/arch/acd-session-run-reconciliation.test.mjs:138` — "the SAME-workspace session is subsumed —
   absent from the assembled `sessions[]`". The known one; amended in this same change per ADR-004.
   (Exported as `archTests`, registered `scripts/test.mjs:70`.)
2. `test/mesh-presence-aggregate-workspaces.test.mjs:169` — *"REVIEW F1 — a run AND a live session on the
   SAME workspace…"*, asserting `!handle.record.sessions.some((s) => s.workspaceId === "ws-1")`. It is m38's
   own F1 review test and it INVERTS the same way ADR-004's does: the session is now PRESENT with
   `workspaceHasRun: true`, and `activeRuns` still carries the run. (Exported as
   `meshPresenceAggregateWorkspacesTests`, `scripts/test.mjs:83`.)
3. `test/mesh-workspace-workdir-absolute.test.mjs:288` — "A's own same-workspace session is subsumed by its
   run (ADR-004)". Its SIBLING assertion at `:289` ("B's session SURVIVES") stays true and must be left
   exactly as it is — that half is the m38/10 bug's actual proof, not part of this move. (Exported as
   `meshWorkspaceWorkdirAbsoluteTests`, `scripts/test.mjs:89`.)

**Explicitly NOT red from the filter deletion — checked row by row, so nobody "fixes" a green test:**

- `test/mesh-presence-aggregate-workspaces.test.mjs:206-252`, the eight-row union Outline: NO row places a
  run and a session in the SAME workspace (the rows are run/nothing, nothing/session, run(ws-1)/session(ws-2),
  session/session, run/run, expired-session), so its exact `sessions[]` expectation at `:244` still holds.
- `test/arch/acd-active-runs-frozen-string-array.test.mjs` — its session is deliberately seeded in **ws-B**
  (`:237-239`) precisely so it survives subsumption. Unaffected by the deletion.
- `test/arch/acd-captured-producer-fixture.test.mjs` and `test/mesh-hook-identity-from-cwd.test.mjs:242-245`
  — seed NO run at all.
- `test/cache-read-control-leaves.test.mjs:232-239` — asserts `assembleActiveRunsAndSubsumedWorkspaces` still
  returns a `workspacesWithRuns` containing the workspace. That function is NOT deleted: ADR-004 removes only
  the `.filter(...)`, and ADR-009 hands the SAME set to `readLiveSessions`. Green.
- `cargo test (app/desktop)` — the Rust surface parses static fixtures, not the launcher, and `Session`
  (`app/desktop/crates/core/src/status.rs:33-44`) carries `#[serde(default)]` with **no `deny_unknown_fields`
  anywhere in the crate**, so the two new entry keys are ignored and `current_work`'s run short-circuit is
  unchanged. Green, and no cargo rebuild is entailed (ADR-004 confirmed).

**(B) A second set stays green ONLY because of R3.** Had the absent key been ruled `true`, these would go red
at the FORMATTER half of the same story: `test/mesh-fleet-session-render.test.mjs` (five of its cases, all
built from the four-key `session()` helper at `:19-21`), `test/mesh-fleet-presence-plumbing.test.mjs:278,378`,
and `test/arch/acd-captured-producer-fixture.test.mjs:302` (the cross-language non-vacuity check). Listed so a
green result reads as evidence rather than luck.

**(C) Adjacent, and NOT caused by story 02 — the entry-shape reds story 01 owns, which story 02 inherits
because it merges after 01 (ADR-008's 02 → 01 edge).** §Fitness functions' "Explicitly NOT re-armed" note
says `acd-active-runs-frozen-string-array` "stays green untouched"; that is true of its `activeRuns` clauses
and NOT true of its session clause. Measured:

1. `test/mesh-presence-additive-sessions.test.mjs:57` and `:104` — `Object.keys(entry)` must be the m38 FOUR.
   `readLiveSessions`' six-key projection (ADR-005) breaks both. (Exported as
   `meshPresenceAdditiveSessionsTests`, `scripts/test.mjs:82`.)
2. `test/arch/acd-active-runs-frozen-string-array.test.mjs:275` — the same four-key assertion, taken off the
   REAL producer. Only this line moves; its `activeRuns` clauses are untouched.
3. `test/arch/acd-captured-producer-fixture.test.mjs:278` pins the producer's session keys — and, more
   expensively, `:157-159` compares EVERY captured cross-language fixture's session entry keys against the
   producer's. The three `REAL_CAPTURED_*` payloads in `app/desktop/crates/core/src/view_model.rs` (`:481`,
   `:604`, `:742`) carry four-key sessions, so once the producer emits six they are ALL reported as DRIFTED.
   **That fitness function forbids hand-editing them** (`provenanceViolations`, `:89-99`, requires real
   captured stdout naming the `aof …` command it came from). So story 01 carries an operator-in-the-loop
   obligation: deploy the post-m48 build, RE-CAPTURE `aof mesh status --json` on a machine with a live
   session, and update the three fixtures with their provenance comments. It is the one item in this
   milestone that cannot be discharged from a test run alone, and it is named here so it is scheduled rather
   than discovered.

**Consequences.**

- Five values that would otherwise have been set by whichever line the build typed first are now decided,
  each with a clause that can fail CI, and each traceable to the line it was read from.
- Story 02's developer starts knowing the exact red set — three assertions, three suites, all registered in
  the runner and all focused-runnable through their exported test arrays, which is the only safe way to run
  them on this machine (`global-work-propagation.test.mjs` binds `:4182`, held by the live daemon).
- One real cost surfaces at build start instead of at story 01's review: the cross-language captured fixtures
  must be re-captured from a deployed build before `acd-captured-producer-fixture` can be green again.
- R1 makes ADR-002's per-session key genuinely injective, so the defect that ADR exists to close cannot be
  re-opened by an id's charset; the single residual (case-insensitive filesystems) is written down rather
  than left to be rediscovered.
- R3 and R4 together keep ADR-004's promise literal: no operator sees any difference, and no payload already
  in this tree renders differently after the policy moves.
- Nothing here adds a `src/` root sibling, a table, a module or a test-root sibling (ADR-009 holds). The total
  footprint of all five rulings is one private helper in `mesh-session.mjs`, one option on three of its verbs,
  one strict comparison in `runs.mjs`, and one `?? null` in `global-mesh-query.mjs`.

---

## ADR-011: A session id is an IDENTIFIER, not a payload — byte-identity is UNBOUNDED, the STORABLE key is not. `src/fs.mjs`'s unbounded temp basename is a real defect, is NOT this milestone's to fix, and the two-worlds assertion is the RULED discharge of the long-id row (with three tightenings)

**Status:** Accepted
**Date:** 2026-08-11
**Completes ADR-002 and ADR-010/R1 at the point where a foreign value meets a bounded filename. Amends
nothing. ADR-001…010 stand unedited.**

**Context.** Building story 00 against ADR-010's four-segment key, the developer hit the one row in
`48/00/00_the-id-ladder.feature`'s byte-identity table that cannot pass on any machine in this fleet — "a
long id is not truncated", exercised with a 200-character id — declined to fix it in a file its story does
not own (`src/fs.mjs`), and flagged the measurement rather than papering over it. That is the right
instinct, and it surfaced a question ADR-010 did not reach: **ADR-002 deliberately put a foreign, unbounded
value into a FILENAME, and a filename is a bounded resource.**

**The measurement, re-derived here rather than taken on trust.** `writeText` (`src/fs.mjs:22`) composes its
atomic temp as `` `.tmp-${basename}-${pid}-${Date.now()}-${randomUUID()}` `` — a constant 57 characters plus
the pid's digits (`.tmp-` 5, `-` 1, pid, `-` 1, epoch-ms 13, `-` 1, UUID 36) ahead of the real basename.
With the test fixture's `node-a~ws-1~claude-code~` prefix (24) and `.json` (5), the budget for the id is
255 − 62 − 29 = **164**. That is exactly the boundary measured through the real producer (164 writes, 165
`ENOENT`). Arithmetic and observation agree, so the finding is sound and is not an artefact of the fixture.

**Two things the report did not name, both measured here.** (a) `src/lock.mjs:55` composes the SAME temp
string, character for character — one rule with two homes. (b) The graph, rebuilt at this decision point
(`aof graph build .`, `builtAt` 2026-08-10T23:06:14.363Z), reports `src/fs.mjs` with **52 dependents**
(~40 of them in `src/`) and `src/lock.mjs` with **27** — actual coupling, not inferred. Both facts bear
directly on R7.

**Decision.**

### R6 — the 200-char row is a CORRECT claim resting on an INCORRECT premise: it stays, and it asserts the claim, not the premise

- **The claim is real and binding: an id is NEVER truncated.** A truncated id is the worst available
  outcome — a wrong value that still looks like a valid one, which would silently fail to join
  `global_assignments.session_id` (ADR-003) and surface two milestones later as a terminal pane that never
  streams. That is precisely the class ADR-001's byte-identity rule exists to prevent, and this row is the
  only place it is proven against a value long enough to tempt a truncation. Keep the row.
- **The premise — "any 200-character id is persistable" — was never in contract.** ADR-001's opacity means
  we never INTERPRET the id; it has never meant we accept an unbounded one. ADR-002 made the key part of the
  FILENAME on purpose — that is what makes one live session one file and what lets `endSession` delete only
  its own — and a single path component is capped at 255 bytes on NTFS, ext4 and APFS alike. A maximum
  storable key length is therefore not a defect in the id contract; it is a consequence of a good decision,
  and the fault was leaving it unstated.
- **The budget is ~4.5× the real world, measured.** Every producer this milestone measured emits a
  36-character UUID (RESEARCH §1/§2). The storable budget is 164. Nothing in this fleet can produce an id
  that reaches it, and nothing in `--session`'s documented use — a human, CI, or m50's launcher naming a
  session it just spawned — has reason to.
- **ADR-010/R1's escaping makes the bound a property of the ENCODED segment, not of the id** (an id of `~`
  characters costs three bytes each), so the rule of record is stated over the composed leaf:
  **the session record's leaf is bounded by the filesystem; the bound is on the COMPOSED LEAF and never on
  any one input; and an id that cannot be composed into a storable leaf is NOT STORED — never shortened,
  never hashed, never half-written.**
- **So the row is neither wrong nor infeasible — it is over-read by one word.** It says "a long id is not
  truncated", which is the contract, holds today, and is exactly what the developer's assertion proves. It
  does not say "a long id is stored", and nothing in the feature says it must be. **No `.feature` edit is
  required and none is authorised by this ADR.**

### R7 — the `fs.mjs` temp basename is a REAL defect and is NOT milestone 48's to fix

- **It is real, and it is a broken promise, not a limitation.** `writeText` offers "write this file
  atomically". It silently converts "your target name is legal" into "your target name plus 62 characters
  must be legal" — a condition it never states and no caller can see. Every writer in the repo inherits it,
  and the exposure was invisible until m48 put a foreign value in a leaf.
- **It is NOT in scope for m48, on three measured grounds.**
  1. **Blast radius.** `src/fs.mjs` has **52 dependents** — the highest-fan-in leaf this milestone could
     touch — and the edit is to the ATOMIC WRITE PATH every one of them uses. ADR-009 chose this milestone's
     structural posture deliberately: remove a block from the widest file, add nothing. Editing the repo's
     most-depended-on primitive to satisfy a row no producer can trigger is that posture reversed.
  2. **Timing.** Two stories are building in this tree right now. A defect in the temp+rename seam does not
     fail loudly — it strands or clobbers files under concurrency, which is exactly the m38-F26 incident the
     current composition was written to fix (`src/fs.mjs:26-34`, "dozens of `.tmp-*` orphans that nothing
     swept"). Landing that change mid-build, unreviewed, against a hypothetical trigger, is a bad trade at
     any exchange rate.
  3. **Ownership.** ADR-008 partitions this milestone by file. `fs.mjs` belongs to no story, so there is no
     story whose structural review would cover the change.
- **The fix, written down so whoever pays it down does not re-derive it.** The invariant is one line:
  **the temp component must never be longer than the target component it stands in for** — equivalently,
  `writeText` must add no unbounded prefix to a caller's basename. Constraints any implementation must keep,
  each read at source: the name must still begin `.tmp-` (`sweepStaleTempFiles` matches that prefix,
  `src/fs.mjs:51`, and `src/commands/mesh-serve.mjs:88-93` reports what it reclaimed); `randomUUID()` must
  stay, because it is the ONLY collision-free component (the pid and `Date.now()` are debuggability, not
  uniqueness — two writes in one millisecond from one process share both); and **nothing anywhere parses a
  temp name back into a target**, so the basename echo is free to be bounded. The shape that satisfies all
  of it is a **bounded echo** — `` `.tmp-${basename.slice(0, N)}-${pid}-${Date.now()}-${randomUUID()}` `` for
  a small fixed `N` — which keeps the "which file was this" the F26 diagnosis wanted while making the temp's
  length independent of the target's. **It must land in BOTH homes**: `src/fs.mjs:22` and `src/lock.mjs:55`
  carry the same composition character for character, and fixing one leaves a second spelling to drift.
- **Where it belongs: `wiki/work/TECH_DEBT.md`, as item 29** — the paste-ready entry is at the foot of this
  ADR. Not a milestone of its own: it is a ten-line change plus one arch-test, and it should ride the next
  milestone with a legitimate reason to be in `fs.mjs`, or be taken as a `chore`, which is the ceremony that
  exists for exactly this size of work.
- **One sharp edge belongs in the same entry because it is the same story.** The failure today is not this
  module's calm coded refusal: `startSession`/`pingSession` are called at
  `src/commands/mesh-session.mjs:286`/`:291`, OUTSIDE the coded-refusal `try/catch` at `:249-269`, so an
  unstorable key propagates a raw `ENOENT`/`ENAMETOOLONG` out of `meshSessionCommand` — a hook sees a stack
  trace, not the `session-*` envelope this module promises at `:30-34`. **m48 does NOT add a refusal
  branch**: that is new observable behaviour, with no PO/QA contract, mid-build, for an input no measured
  producer emits. It is recorded with its fix in the same debt item, where it can be scheduled.

### R8 — the two-worlds assertion is an ACCEPTABLE discharge, and must be tightened in three specific ways before it ships

- **Accepted in principle, and for the right reason.** The row's real claim is "never truncated", and
  truncation is unobservable from a single-world assertion — proving it requires saying what must hold when
  the write FAILS, which is exactly what the developer wrote. Asserting a filesystem capability instead
  would have pinned the platform rather than the contract. The deviation is disclosed in the source with its
  measurement (`test/mesh-session-id-ladder.test.mjs:194-231`), which is the discipline this repo asks for.
  **`aof:verify` should read this ADR as the ruling and treat that row as DISCHARGED — a recorded
  architectural decision, not an unexplained deviation.**
- **Tightening 1 — close the THIRD world, which the current form admits.** As written (`:216-230`), if the
  command neither throws nor writes — a swallowed error reported as success — `records` is empty, so the
  `for` loop asserts nothing and the `if (failure != null)` branch never runs: the row passes VACUOUSLY on
  the one outcome that would be worst. It must assert the two worlds are exhaustive and exclusive: either
  `failure == null` **and** exactly one record exists whose `sessionId` is byte-identical, or
  `failure != null` **and** no record exists. A silent no-op must fail this row.
- **Tightening 2 — do not pin `ENOENT`.** `:228` asserts the code is exactly `ENOENT`. That is the Windows
  spelling; a too-long path component surfaces as `ENAMETOOLONG` on Linux and macOS, so this row would go red
  on the WSL worker and the Mac the moment the suite runs there — a cross-platform trap in a repo that
  deliberately runs on all three. Assert MEMBERSHIP in the name-too-long family
  (`["ENAMETOOLONG", "ENOENT"]`), or better, assert the property that actually matters (no record, no
  truncation) and carry the code as diagnostic detail in the failure message.
- **Tightening 3 — assert the failure was ATOMIC.** `writeText` reclaims its temp on the failure path
  (`src/fs.mjs:32`). One line proves the store is left clean: no `.tmp-*` entry remains in the sessions
  directory afterwards. Without it, "wrote no record" and "wrote a 200-character orphan that nothing sweeps
  for an hour" are indistinguishable — and the second is m38-F26 returning through the very door this row
  opens.
- **What must NOT change.** The other four rows of that Examples table (the UUID, mixed case, the spaced id,
  the `~`-bearing id) keep taking the success branch UNCONDITIONALLY. They are what keeps the no-truncation
  proof non-vacuous with real values; only the long-id row is permitted a two-world outcome, and only
  because its premise is the one R6 rules out of contract.

**For the record — two confirmations, no action.**

- **`acd-no-new-silent-catch` on `src/board-worker-stream.mjs` is pre-existing, and it is ALREADY recorded.**
  Confirmed independently: `git diff HEAD -- src/board-worker-stream.mjs` is empty and the file's last
  commit is `eacbd57` (2026-08-06, m43) — it predates m48 entirely. It needs **no new TECH_DEBT line**,
  because it is already `TECH_DEBT.md` **item 27, row 1**, naming the same file, the same site (`:102`), the
  same "baseline 0" message and the same origin commit. A second entry for it would be the duplicate-home
  accretion these reviews exist to refuse. Item 27's own prescribed fix stands and is not m48's to perform:
  emit the coded degrade the gate demands, or raise the baseline **with the ADR item 27's rules require** —
  and m48 must not raise it silently.
- **The re-capture ordering is correct, and it is this milestone's one human gate.** A captured fixture is a
  snapshot of the FINISHED producer, so capturing before story 02 supplies `workspacesWithRuns` (ADR-009)
  would bake in a value the producer had not yet learned to compute. Endorsed as stated. Two refinements for
  whoever performs it: the key-set half of `producerShapeViolations`
  (`test/arch/acd-captured-producer-fixture.test.mjs:157-159`) would have passed either way, since
  `workspaceHasRun` is present-and-`false` pre-02 and the six keys are already correct — so nothing is lost
  by waiting; and the capture is worth taking on a machine that has a live session AND, ideally, a running
  run in that session's workspace, or `workspaceHasRun` is `false` in every entry and the fixture proves the
  key exists without ever exercising it.

**Consequences.**

- The milestone's identity contract is now bounded and stated end to end: opaque and never transformed
  (ADR-001), never truncated (this ADR), storable up to the filesystem's own limit on the COMPOSED LEAF —
  and the failure mode is no-record, never wrong-record.
- The repo's most-depended-on primitive is not edited mid-build to satisfy a row no producer can trigger,
  and the defect is nonetheless written down with its invariant, its exact shape and its SECOND home — so
  paying it down is a scheduled ten-line change rather than a rediscovery.
- One vacuous pass and one cross-platform red are removed from a row that would otherwise have shipped green
  on Windows and gone red the first time the suite ran on the WSL worker or the Mac.
- A pre-existing red is confirmed as pre-existing against pristine HEAD and routed to the entry that already
  owns it, rather than being absorbed into this milestone's ledger or silently re-baselined.
- No `.feature` is edited, no `src/` file is touched, and `writeText` keeps exactly one composition — for
  now, in two places, both named.

**TECH_DEBT.md item 29 — paste-ready.** This ADR does not write it: two developers are editing this tree and
this architect was scoped to `ARCHITECTURE.md` for the duration. The coordinator should land the following
under `wiki/work/TECH_DEBT.md`, after item 28, and the citation for this milestone's review is *"TECH_DEBT
item 29"*.

> ## 29. `writeText` adds ~62 unbounded characters to every atomic write — a legal filename can be unwritable, and the rule has two homes
>
> **Status:** open (raised 2026-08-11 by milestone 48's story-00 developer, measured through the real
> producer; ruled out of m48's scope by 48/ADR-011). **Severity:** low likelihood, silent failure mode,
> repo-wide reach.
>
> **What's wrong.** `writeText` (`src/fs.mjs:22`) composes its atomic temp as
> `` `.tmp-${basename}-${pid}-${Date.now()}-${randomUUID()}` `` — a constant 57 characters plus the pid's
> digits ahead of the caller's own basename. NTFS, ext4 and APFS all cap a single path COMPONENT at 255
> bytes, so `writeText` silently converts "your target name is legal" into "your target name plus ~62
> characters must be legal" — a precondition it never states and no caller can see. `src/lock.mjs:55`
> carries the SAME composition character for character: one rule, two homes.
>
> **How it bites.** Measured 2026-08-10 through the real `aof session start`: with milestone 48's four-part
> session leaf (`<node>~<workspace>~<assistant>~<sessionId>.json`), a 164-character session id writes and a
> 165-character one fails with `ENOENT` — the id is never truncated (the write is temp+rename and the temp
> is reclaimed at `src/fs.mjs:32`), but the failure is a raw filesystem error, not a coded refusal.
> `startSession`/`pingSession` are called at `src/commands/mesh-session.mjs:286`/`:291`, outside that
> module's coded-refusal `try/catch` at `:249-269`, so a hook receives a stack trace instead of the
> `session-*` envelope the module promises at `:30-34`. No measured producer emits an id anywhere near the
> limit (every one is a 36-character UUID), which is why this is debt and not a bug — but every writer in
> the repo shares the seam, and `src/fs.mjs` has **52 dependents**.
>
> **The fix.** (a) Bound the echo: `` `.tmp-${basename.slice(0, N)}-${pid}-${Date.now()}-${randomUUID()}` ``
> for a small fixed `N`, so the temp's length is independent of the target's. Keep the `.tmp-` prefix
> (`sweepStaleTempFiles` matches it, `src/fs.mjs:51`; `src/commands/mesh-serve.mjs:88-93` reports it) and
> keep `randomUUID()` — it is the only collision-free component; the pid and `Date.now()` are debuggability,
> and two writes in one millisecond from one process share both. Nothing anywhere parses a temp name back
> into a target, so the echo is free to be bounded. (b) Land it in BOTH homes (`src/fs.mjs:22`,
> `src/lock.mjs:55`) or centralise the composition in one exported helper — a fix in one is a second
> spelling that drifts. (c) Add the arch-test that states the invariant: **the temp component is never
> longer than the target component it stands in for**, for any target that is itself legal. (d) Optionally,
> in the same change, give `meshSessionCommand` a coded refusal for a key it cannot store, so the failure
> arrives in this module's own envelope rather than as a stack trace.

---

## ADR-012: Three as-built facts RULED at the structural review — the payload's pre-existing top-level key set is the SEVEN the shaper really produces (48/03's feature enumerates six and is simply INCOMPLETE); `buildSessionIndex` takes `{ nodes, assignments }` WITHOUT destructuring `now`, which is ADR-007's own decision in its strongest form; and ADR-002's per-session closure holds for ADDRESSABLE sessions only, with the anonymous residual ACCEPTED and stated

**Status:** Accepted
**Date:** 2026-08-11
**Completes ADR-007 at two points where the delivered code is RIGHT and this log's earlier wording is
loose, and narrows ADR-002's consequence claim to what was delivered. Amends nothing behavioural.
ADR-001…011 stand unedited.**

**Context.** The structural review of the built milestone found three places where the delivery differs
from a literal reading of an earlier text. In the first two the delivery is correct and the prose is
loose; in the third the code is correct and a Consequences paragraph over-claimed. All are observable,
so each would otherwise reach `aof:verify` as an unexplained deviation — the failure mode ADR-011/R6
already ruled on once for the long-id row. R9 and R10 are settled together because they are the same
question — *which artifact is the contract when a prose enumeration and a real producer disagree?* — and
R11 is settled beside them because it is the same discipline applied to this log's own text.

**Decision.**

### R9 — the payload's pre-existing top-level keys are SEVEN, not six; the feature's list is an incomplete transcription and is NOT the contract

- `48/03/01_attribution-and-the-free-session.feature` says the payload's *"other top-level keys are
  exactly `scope`, `workspaceId`, `workspaces`, `items`, `nodes`, `diagnostics`"*. `shapeGlobalStatus`
  has ALSO carried **`stalenessSeconds`** since m43/story 04 (the cache-freshness window, stated once
  per response) — measured at `src/global-mesh-query.mjs:443`, ahead of `workspaces`.
- **The feature's own binding clause is the one that governs:** *"the same set, with the same values,
  that the same fixture produces without this feature."* That set is the seven. The six-item list is a
  transcription of `ui/src/fleet/api.ts`'s `GlobalMeshStatus`, which **deliberately** does not spell
  `stalenessSeconds` (m43's decision, documented at `api.ts:233-239`: its one `ui/` reader is
  `../board/freshness.mjs`, and naming it here would grow a second copy of the threshold). The feature
  inherited that omission; it is a gap in a transcription, not a statement about the wire.
- **So the delivered assertion is RIGHT and the alternative was the defect.** `PRE_EXISTING_TOP_LEVEL_KEYS`
  (`test/mesh-session-index-attribution.test.mjs:57`) and `PRE_EXISTING_PAYLOAD_KEYS`
  (`test/arch/acd-session-index-derived-not-stored.test.mjs:76`) both pin the seven, and both name the
  departure in place. Asserting the feature's six would have required either dropping a pre-existing key
  from the wire to make the list match — the exact regression ADR-007's additivity clause exists to
  forbid — or an assertion that reads as green while describing a payload nobody serves.
- **`aof:verify` should read this clause as the ruling and treat that row as DISCHARGED.** **No
  `.feature` edit is required and none is authorised by this ADR** — the same disposition, for the same
  reason, as ADR-011/R6.

### R10 — `buildSessionIndex({ nodes, assignments })` omitting `now` from its destructure HONOURS ADR-007; the signature in ADR-007's text names the CALL, not the binding

- ADR-007 documents the export as `buildSessionIndex({ nodes, assignments, now })` and then rules, in
  the same ADR, that **session-level liveness is NEVER re-derived at the control**. The delivery
  destructures `{ nodes, assignments }` only, and `shapeGlobalStatus` still passes `now`
  (`src/global-mesh-query.mjs:454`) so the documented call site is unchanged.
- **That is the stronger form of the same decision, and it is the one to keep.** A bound-but-unread
  `now` is a clock sitting in scope waiting for the first plausible-looking use; an unbound one cannot
  be read at all. `acd-session-index-derived-not-stored` makes it structural — the identifier `now` in
  the index path is a violation — so the ADR's rule is enforced by absence rather than by discipline.
- The call keeps `now` deliberately: the ADR's signature is the CONTRACT WITH THE CALLER (a future
  clock-dependent clause may need it), and dropping it from the call would make the caller's intent
  re-derivable only from this ADR. **Passed, never bound, never read** — stated here so neither half
  reads as an oversight.

### R11 — ADR-002's "two concurrent sessions in one repo are two records" holds for ADDRESSABLE sessions ONLY; ANONYMOUS sessions still share one leaf, and that residual is ACCEPTED and stated here rather than discovered later

- **The measurement.** ADR-002 chose the EMPTY fourth segment for `sessionId: null`, so every anonymous
  session on one `(nodeId, workspaceId, assistant)` composes the identical leaf
  `<node>~<workspace>~<assistant>~`. RESEARCH §3's two defects therefore survive **on the anonymous path
  only**: `pingSession` still upserts blindly across two anonymous processes, and `endSession` still
  removes the leaf both of them share. ADR-002's Consequences paragraph states the closure without that
  qualifier; this clause is the qualifier.
- **It follows necessarily from ADR-001 and must not be "fixed".** Distinguishing two anonymous sessions
  requires minting an id, which is the one thing ADR-001 forbids — a synthesized id is
  indistinguishable on the wire from a routable one, so a surface would open a socket on a tuple that
  routes nowhere. A merged anonymous record is a *lesser* wrong than a fabricated address, and it is the
  same wrong the tree already had before this milestone: nothing regresses.
- **Who is actually exposed, measured.** Claude Code supplies `session_id` on every hook event
  (RESEARCH §1/§2, measured), so no Claude Code session is anonymous. The exposed callers are (a) the
  flagless CLI/CI caller, which may pass `--session` and cease to be anonymous whenever it wants, and
  (b) **Codex** — `src/bundle/hooks/codex-session-{start,prompt-ping,stop-ping}.json` invoke
  `aof session start|ping --assistant codex` with no `--session`, and whether its payload carries
  `session_id` is DOCUMENTED, NOT MEASURED (RESEARCH §1). If it does, Codex is addressable and this
  clause never applies to it; if it does not, two Codex panes in one repo read as one live session —
  exactly as they do today.
- **The bounded blast radius.** The wire stays honest either way: a merged anonymous record is ONE live
  session that renders as one, never a phantom, never a wrong address; the index (ADR-007) holds no
  anonymous entry at all, so no consumer can be misrouted by the merge; and TTL expiry (ADR-006) still
  removes it.
- **The cure, when it is wanted, and where it belongs.** m50's launcher registers the sessions it
  spawns and can pass `--session` (ADR-001's rung 1) for assistants that do not self-report — which
  turns the anonymous path into an addressable one at the only layer that knows it spawned two
  processes. That is the right place, and it needs no change here.
- **No fitness function, deliberately.** This is an accepted residual of a decision, not an invariant:
  a gate asserting "anonymous sessions share a leaf" would pin behaviour we would happily lose the day
  m50 supplies the ids.

**Consequences.**
- Two as-built facts that a literal diff-to-prose comparison would report as drift are now recorded
  decisions with the evidence that makes each correct, and one over-broad consequence claim is narrowed
  to what was actually delivered.
- Neither ruling changes a byte of shipped behaviour; both change what a later reader concludes from
  the difference.
- The general rule this milestone has now applied three times (ADR-011/R6, R8, and R9): **a prose
  enumeration that disagrees with a measured producer loses, and the disagreement is written down where
  the next reader finds it — never resolved by making the producer match the prose.**

---

## ADR-013: The three calls QA's behavioural pass routed to the architect — `(nodeId, sessionId)` IS required-unique IN THE INDEX and a duplicate is RESOLVED by a total order (never by `readdir` arrival); an ABSENT `sessionId` at a consumer means NOT ADDRESSABLE, tested POSITIVELY, and m49 inherits that as a named obligation; and ADR-010/R1's case-fold residual is RE-STATED as a WRONG-VALUE READ rather than a collision

**Status:** Accepted
**Date:** 2026-08-11
**Amends ADR-007's index-construction clause (R12) and the fitness clause of
`acd-session-index-derived-not-stored` that would otherwise forbid the fix; RE-STATES ADR-010/R1's
residual in the correct failure mode (R14). ADR-005's "always present" clause is NOT amended (R13 governs
the CONSUMER, not the producer). ADR-001…012 stand unedited.**

**Context.** QA's behavioural pass landed beside this milestone's structural review and raised three
things the structural pass did not reach. All three are value-fixing questions rather than defects of
craft, so they are settled here. Two of them are the same question at two layers — *what does a reader do
with a tuple or a key the wire did not fully state?* — and the third is a correction to this log's own
record of a residual it already accepted.

**Codebase-graph grounding, re-run at this decision point.** `aof graph build .` (project root, code-only,
no `--backend`, egress none) rebuilt to **9,569 nodes / 23,141 edges, `builtAt`
2026-08-11T16:49:44.344Z**. `aof graph impact` reports, as actual structure: `src/global-mesh-query.mjs`
still has exactly **ONE** source dependent (`src/mesh-ui-serve.mjs`); `ui/src/fleet/api.ts` now has
**THREE** (`Fleet.tsx`, `AssignmentChip.tsx`, `RepoPicker.tsx` — m47's new components, none of which reads
`sessionId`); `src/mesh-session.mjs` still has **TWO** (`commands/mesh-session.mjs`, `mesh-presence.mjs`).
So R12 lands inside a one-dependent module, and R13's subject has no reader in this tree at all — which is
precisely why R13's enforcement belongs to the milestone that writes the first one.

**Decision.**

### R12 — `(nodeId, sessionId)` IS required-unique in the INDEX, is NOT unique in the STORE, and a duplicate is RESOLVED by a stated TOTAL ORDER — never by whichever leaf `readdir` returned first

- **The measurement, confirmed at source.** `src/global-mesh-query.mjs:216` reads
  `if (forNode.has(sessionId)) continue; // one tuple, one entry`. Nothing upstream enforces uniqueness,
  and `readSessionRecordsForNode` returns leaves in `readdir` order with no sort, which `readLiveSessions`
  preserves. So the survivor is filesystem-order-dependent — a different answer on NTFS than on ext4 —
  and no degrade is emitted. QA measured both records on disk, both on the wire, one in the index.
- **The collision is REACHABLE IN ORDINARY USE, not only by misuse, and that is the decisive fact.**
  ADR-002 made `workspaceId` a key component, and the hook derives it from the payload's own `cwd`
  (`src/commands/mesh-session.mjs`, the F4 path). A single Claude Code session whose working directory
  moves from one repo to another therefore pings a SECOND leaf under the SAME id, and both records are
  live for one TTL window (120s default) until the abandoned one expires. A `--session` caller and m50's
  launcher can produce it too. This is not a corner case; it is the ordinary shape of a session that
  moved.
- **The tuple must stay unique in the index, because it is an ADDRESS.** m38/ADR-014 routes the terminal
  mirror on `(nodeId, sessionId)`; the SPEC's headline is that any live session is addressable by it. An
  address that resolves to two things is not an address. `lookup` returns at most one entry and the array
  holds at most one row per tuple — ADR-007's entry shape, ordering and eight keys are all unchanged.
- **It must NOT be made unique in the store, and re-keying is REFUSED.** Dropping `workspaceId` from the
  record key to force store-level uniqueness would re-open RESEARCH §3's blind-upsert defect for every
  session that never moves — trading a rare, transient, resolvable ambiguity for a common, permanent,
  silent one. ADR-002's key stands.
- **So the index RESOLVES, and the resolution is a TOTAL ORDER over the entries themselves.** Among the
  candidates for one `(nodeId, sessionId)`: **latest `lastPingAt` wins** — descending, compared as a
  STRING with the same plain `<`/`>` codepoint comparison ADR-007 already mandates for the array sort —
  then ascending `workspaceId`, then `repo`, then `assistant`. A non-string `lastPingAt` states nothing
  and sorts LAST (ADR-010/R3's unstated-fact discipline, one layer up). Two consequences of spelling it
  this way: the order is **total**, so the index is byte-identical whatever order the inputs arrive in;
  and it uses **no `Date.parse` and no clock**, so ADR-007's "no clock in the index path" clause and its
  detector stay byte-unchanged. It is chronological for the ISO-8601 UTC-Z form every producer in this
  fleet emits, and deterministic for anything else.
- **Latest-ping wins is the only answer that can be RIGHT, not merely stable.** The duplicate exists
  because the session moved; the freshest record is where it actually is. Picking the oldest, or the
  first-read, addresses a workspace the session has left — the wrong-repo label and wrong-workspace
  terminal QA priced.
- **NO degrade event, and NO new wire key — deliberately.** A duplicate is not an error: it is the
  correct representation of a session mid-move, so reporting it would cry wolf on ordinary use, and
  `buildSessionIndex` reaching `reportDegrade` would put an I/O edge into the module ADR-007 keeps pure
  for exactly one reason. The complete truth is ALREADY published and needs nothing added:
  `nodes[].presence.sessions[]` carries BOTH records, and ADR-007 already states the division —
  *`sessions[]` is the complete liveness truth; the index is its ADDRESSABLE subset.* Withholding the
  loser is the same shape as withholding an anonymous session, and it is now stated rather than
  incidental.
- **Note the symmetry that makes this worth fixing at all:** ADR-010/R1 went to real lengths to make the
  LEAF injective so two ids can never merge. This closes the mirror-image merge one layer up, on the
  workspace axis, with the same rule — nothing collapses silently.
- **Fitness clause** (amends #5 `acd-session-index-derived-not-stored`): two entries sharing one
  `(nodeId, sessionId)` and differing in `workspaceId` yield exactly ONE index row; the survivor is the
  later `lastPingAt`; and feeding the SAME two entries in BOTH input orders yields a **deep-equal**
  index — the assertion that pins filesystem-order-independence rather than today's arrival order.
  **The `lastPingAt` residue clause of that same fitness function MUST be amended in the same change**,
  or the fix goes red: it currently forbids `lastPingAt` anywhere in the index path except the verbatim
  copy onto the entry. Its intent — no second liveness authority — is preserved exactly by narrowing it
  to what it always meant: `lastPingAt` may be compared **between two session entries** (a relative
  ordering) and NEVER against a clock, a `now`, or a TTL. That is the clause to write, and no other part
  of that gate moves.

### R13 — at a CONSUMER, an ABSENT `sessionId` means NOT ADDRESSABLE; addressability is tested POSITIVELY on a non-empty string, never negatively against `null`; and milestone 49 inherits this as a NAMED obligation

- **The measurement.** Mid-rollout, a pre-m48 node emits the four-key entry, and ADR-005 forbids teaching
  any hop to normalise it (that is what keeps the pass-through free). So a consumer legitimately sees
  `sessionId === undefined`, for which `=== null` is FALSE, while `ui/src/fleet/api.ts:41` declares
  `sessionId: string | null`, required. ADR-005's "after this milestone EVERY producer speaks the
  dimension" is true of the CONTRACT and false of the FLEET until every node redeploys.
- **The rule, and it is ADR-010/R3 applied to the other new key.** An absent key is an UNSTATED fact, and
  an unstated fact degrades to the SAFE side. For `workspaceHasRun` the safe side was "renders". For
  `sessionId` the safe side is **not addressable** — ADR-001's "no tuple ⇒ no socket", which exists
  precisely so a surface can never open a stream on something that routes nowhere.
- **Therefore the test is POSITIVE, and this is the whole ruling:** a consumer may treat a session as
  addressable ONLY on `typeof sessionId === "string" && sessionId.length > 0`. It may NEVER gate on
  `sessionId !== null`, `!= null`, `!== undefined`, or bare truthiness. The negative test is the trap —
  `undefined !== null` is `true`, so the one shape the wire really emits mid-rollout is the one shape the
  natural-looking guard lets through. The house already has one correct implementation to copy:
  `buildSessionIndex` (`src/global-mesh-query.mjs:210`) and `lookup` both use exactly this positive test,
  which is why the index is already safe and why nothing in THIS milestone is exposed.
- **ADR-005's declaration STAYS `sessionId: string | null`, required — the alternative was considered and
  refused.** Marking it optional would let the compiler reject the trap, but it would carry a permanent
  scar for a transient truth: after the fleet redeploys, every consumer forever pays an `undefined`
  narrowing tax for a state no producer can still emit. The type describes the CONTRACT, every m48
  producer honours it, and the rollout gap is a consumer-side guard — which is where R13 puts it. The
  type's own doc comment SHOULD gain the one-line rollout caveat; that is prose, not a contract change,
  and it is not required for this milestone's acceptance.
- **No fitness function in m48, and that is a judgment rather than an omission.** Verified on the graph
  above: `api.ts` has three dependents and NONE of them reads `sessionId`. A gate with no subject asserts
  nothing. **The obligation is m49's, and it is named here so it is inherited explicitly rather than
  rediscovered:** the milestone that writes the first consumer ships a fitness function that fails CI on
  any surface gating a terminal, socket or route on `sessionId !== null` / `!= null` / truthiness,
  permitting only the non-empty-string test. Recorded in this milestone's `STATE.md` handoff for the same
  reason ADR-010/R4's dedupe question was.

### R14 — the case-insensitive-filesystem residual is a WRONG-VALUE READ, not a collision; ADR-010/R1's framing is superseded, the acceptance is re-granted on the corrected mode, and the cheap cure is specified and ledgered

- **What R1 said, and why it was not enough.** R1 recorded the residual as *"two ids differing ONLY in
  letter case still collide there"* — a merge, which reads as a liveness loss. QA measured the real shape:
  `readSessionRecord` for key `sess-ABC` returns a record whose `sessionId` is `"sess-abc"`. The losing
  key does not fail and does not visibly merge; **it returns another session's id, byte for byte**.
- **That is the one outcome this milestone's two most load-bearing rules exist to prevent.** ADR-001's
  byte-identity clause and ADR-011/R6's *"a truncated id is the worst available outcome — a wrong value
  that still looks like a valid one"* are the same rule, and a case-folded read breaks it in exactly the
  way R6 named: the value still joins `global_assignments.session_id` (ADR-003), just to the wrong row,
  and surfaces two milestones later as a terminal pane attached to the wrong session. **An acceptance
  granted on a mis-stated failure mode is not a valid acceptance**, which is why this clause supersedes
  R1's framing rather than merely elaborating it.
- **The DECISION is re-granted unchanged: ACCEPTED.** The probability is untouched by the correction —
  it needs a caller to hand two case-only-differing ids for one `(node, workspace, assistant)` triple,
  and every producer this milestone measured emits a lowercase UUID. Neither cure R1 weighed (case-folding
  into the escape, or a digest) has become cheaper, and both still cost the leaf's legibility, which
  RESEARCH §3's own evidence depends on.
- **What DOES change: the cheap detection R1 never considered, now specified.** `readSessionRecord`
  already parses the record it returns, so one comparison makes the read honest — a record whose
  `sessionId` is not the id it was asked for is not this key's record, and reads as `null` (this module's
  own absence-is-benign miss). It must compare `(record.sessionId ?? null)` against
  `(key.sessionId ?? null)` so a pre-m48 record read by an anonymous key still matches — ADR-002's
  no-migration claim rests on that read and must not be broken by the guard meant to protect it.
- **And the LIMIT of that cure, stated so nobody believes more of it than is true.** It makes the READ
  honest; it does NOT make the write non-destructive. On a case-insensitive filesystem the second
  session's write still replaces the first one's file. That remaining half is a liveness merge, not a
  wrong address, and it is accepted on exactly the reasoning ADR-012/R11 accepts the anonymous merge: a
  merged record is one live session that renders as one, never a phantom and never a wrong address.
- **Route: `TECH_DEBT.md` item 35**, with the exact two-line guard and this limit written down. It is
  **authorised to land in this milestone** if the developer already in `src/mesh-session.mjs` can take it
  in the current fix batch, and it does **not** gate acceptance — the probability is unchanged and
  requires caller misuse. What was never acceptable was leaving the residual recorded in the wrong mode,
  and this clause fixes that whether or not the guard ships.

**Consequences.**
- The one place this milestone's headline promise could be WRONG rather than merely absent — an address
  resolving to the wrong workspace, differently on two operating systems — is closed by a stated total
  order, with no degrade edge, no new wire key and no re-keying of the record.
- The rollout gap that would have landed on m49 as a silent `undefined` socket is now a named,
  inherited obligation with the exact predicate that satisfies it, rather than a type that quietly leads
  reality.
- One accepted residual is re-stated in its true failure mode, its acceptance re-granted on that mode,
  and its cheap cure written down where it can be scheduled — the difference between a decision and a
  bug waiting to be rediscovered.
- Three ADRs in this milestone (010/R1, 011/R6, 013/R14) now say the same thing about the same value:
  **a wrong id that looks valid is worse than no id at all.** That repetition is the point; it is the
  rule the whole identity contract rests on.

---

## Fitness functions (this milestone)

Each ADR's structural invariant is encoded as an arch-test under `test/arch/`, wired into `scripts/test.mjs`
and failing CI on violation. They live HERE, never in a task `.feature` (a structural assertion is a fitness
function, not a Gherkin scenario). Per m38/ADR-008, every behavioural clause is fed by the REAL producer
(the real CLI, the real `readLiveSessions`, the real assembler over a hermetic repo), never by a
convenience fixture; every self-check plant asserts it LANDED in the source before asserting it trips
(the tree is CRLF).

**New:**

1. **`acd-session-id-never-fabricated`** (ADR-001) — *the routable session id is read from the assistant,
   never made.* Asserts: the session-id path (`src/commands/mesh-session.mjs`, `src/mesh-session.mjs`) calls
   no id generator — no `randomUUID`/`crypto.randomUUID`/`Math.random`/`createHash(...).digest` reaches a
   value assigned to a session id — and resolves the id through the ORDERED ladder only (`--session` →
   `payload.session_id` → `env.CLAUDE_SESSION_ID`), with an unresolved id landing as `null`; and
   behaviourally, invoking the REAL `meshSessionCommand` with no id on any channel writes a record whose
   `sessionId` is `null` (not a generated value, not a missing key), while a payload-supplied id is stored
   BYTE-IDENTICAL (no case/format transformation). Plants that must trip: a `randomUUID()` fallback; a
   triple-derived hash fallback; a lowercasing normalisation. **File:** `test/arch/acd-session-id-never-fabricated.test.mjs`.
   **Story:** 00.
2. **`acd-session-leaf-per-session`** (ADR-002) — *one live session, one record; an `end` cannot kill a
   sibling.* Asserts: the leaf composition carries a FOURTH `sessionId` segment (anonymous ⇒ empty segment,
   trailing `~`); two keys differing only in `sessionId` resolve to two distinct paths; the record key is
   passed as ONE object (no five-positional call site); and behaviourally, with two live records for the same
   `(node, workspace, assistant)` and different ids, `endSession` on one leaves the other's file on disk and
   its entry on the next presence read. Plants: a 3-part `unlink` in `endSession`; a leaf that drops the
   session segment. **File:** `test/arch/acd-session-leaf-per-session.test.mjs`. **Story:** 00.
3. **`acd-session-orphan-reaped`** (ADR-006) — *a TTL-expired record is REMOVED, by the owning node, under
   the shared predicate.* Asserts: `reapExpiredSessions` imports `isSessionLive`/`isStale` and contains NO
   second staleness comparison (no local `Date.parse(...) > ...` in the reap path); it unlinks only leaves
   whose node segment is THIS node's; `startSession`/`pingSession` invoke it; a reap fault does not fail the
   start/ping; and behaviourally, a planted expired leaf (including a pre-m48 3-PART leaf — ADR-002's
   migration claim) is gone from disk after one real `pingSession`, while a leaf inside the TTL survives.
   Plants: a hand-rolled staleness comparison; a reap that unlinks a peer node's leaf; a reap whose throw
   propagates out of `pingSession`. **File:** `test/arch/acd-session-orphan-reaped.test.mjs`. **Story:** 00.
4. **`acd-session-entry-frozen-wire`** (ADR-005) — *the presence session entry is a frozen, ordered six, and
   the wire stays a pass-through.* Asserts: the REAL `readLiveSessions` emits entries whose key list is
   EXACTLY `["sessionId","workspaceId","repo","assistant","lastPingAt","workspaceHasRun"]` in that order,
   with `sessionId` present-and-null for an anonymous record and `workspaceHasRun` present-and-false by
   default; the m38 four keep their relative order; `ui/src/fleet/api.ts`'s `PresenceSession` declares
   exactly those six with `sessionId: string | null`; and `applyPresenceFrame`'s `safeSessionArray` remains
   an ENTRY-level guard with NO per-field whitelist (a planted per-field whitelist trips, because it is how
   this milestone's key would be silently dropped in transit). Plants: a reordered projection; an omitted
   `sessionId` for an anonymous record; a per-entry field whitelist at the control. **File:**
   `test/arch/acd-session-entry-frozen-wire.test.mjs`. **Story:** 01.
5. **`acd-session-index-derived-not-stored`** (ADR-007) — *the index is a projection, not a store, and it is
   not a second liveness authority.* Asserts: no `CREATE TABLE`/`INSERT`/`UPDATE` anywhere names a session
   index; `buildSessionIndex` performs no I/O (its module reaches no fs/db call from that function) and is
   REBUILDABLE (the same `{ nodes, assignments }` inputs yield a deep-equal index on a second call, with no
   memoisation); a node whose `freshness` is `"stale"` or `"unknown"` contributes ZERO sessions while a
   `"live"` node contributes all of its addressable ones; the index re-derives NO session-level liveness (no
   `isStale`/`isSessionLive`/`lastPingAt` comparison in the index path); an anonymous (`sessionId: null`)
   entry is absent from the index but still present in `nodes[].presence.sessions[]`; and the wire array is
   sorted by `(nodeId, sessionId)`. Plants: a persisted index table; a session-level TTL re-filter; a
   `"stale"` node contributing sessions; a cached second call. **File:**
   `test/arch/acd-session-index-derived-not-stored.test.mjs`. **Story:** 03.
6. **`acd-session-attribution-single-authority`** (ADR-003 + ADR-007) — *the work item derives onto the
   session and is stored nowhere; a free session is first-class.* Asserts: the session RECORD's frozen key
   set contains no `ref`/`itemRef`/`workItem`/`assignmentId`, and no session write path reads
   `global_assignments`; `workItem` is produced ONLY at the index, joined on
   `(target_node_id, session_id)`; a session with no matching assignment carries `workItem: null`
   EXPLICITLY (key present) and is NOT dropped from the index; and the id a session publishes is
   byte-identical to the `global_assignments.session_id` for the same session (one value, never reconciled).
   Plants: an item ref written onto a session record; an omitted `workItem` key for a free session; a free
   session filtered out of the index; a fabricated placeholder ref. **File:**
   `test/arch/acd-session-attribution-single-authority.test.mjs`. **Story:** 03.

**Amended (existing files — this milestone changes what they assert; NOT new siblings):**

7. **`acd-session-record-frozen`** (m38/ADR-002 → this ADR-002) — re-frozen at SEVEN ordered keys
   `["nodeId","workspaceId","repo","assistant","sessionId","startedAt","lastPingAt"]`, with the clause that
   `sessionId` is EXPLICITLY PRESENT and `null` for an anonymous session (never omitted, never generated).
   **File:** `test/arch/acd-session-record-frozen.test.mjs` (amended in place). **Story:** 00.
8. **`acd-session-run-reconciliation`** (m38/ADR-004 → this ADR-004) — **its central assertion INVERTS.**
   `test/arch/acd-session-run-reconciliation.test.mjs:138` today asserts *"the SAME-workspace session is
   subsumed — absent from the assembled sessions[]"*; it now asserts the opposite on the producer side (the
   session is PRESENT on the wire with `workspaceHasRun: true`, and `activeRuns` still carries the run) and
   the SAME rendered outcome on the formatter side (`fleetCurrentWorkLines` emits exactly one line, no
   `(session)` line, for that payload). The other two producer-fed cases (session-only workspace;
   run-in-A + session-in-B) keep their existing assertions unchanged — proof that ADR-004's rendered
   behaviour is preserved. Its self-check inverts: the planted violation is now a formatter that IGNORES
   `workspaceHasRun` (rendering the duplicate line), plus a producer that re-introduces the wire-side filter
   (dropping an addressable session). **Story:** 02. **This amendment is mandatory in the same change as the
   filter deletion — otherwise CI goes red on a scheduled behaviour change nobody named.**

**Explicitly NOT re-armed, and why:** `acd-active-runs-frozen-string-array` (m23/ADR-002 + m38) stays green
untouched — this milestone does not go near `activeRuns`, and ADR-004 exists in its present form precisely
because that freeze is binding. `acd-session-ttl-reuses-isstale` stays green untouched and is the reason
ADR-006 and ADR-007 both refuse to write a second staleness rule.
