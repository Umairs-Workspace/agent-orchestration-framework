---
doc: research
---
# 58 · Supervising loops — Research

## Method

Delegation gate (`work.agents.delegation`) is **off** in this workspace's `.aof/aof.config.json` (no
`agents.delegation` key present — verified by reading the file, `.aof/aof.config.json:1-67`) — every
fact below was gathered directly on this model; no `codex exec` delegation was used. Every `aof` CLI
invocation below was run as `AOF_GLOBAL_HOME=$(mktemp -d) aof work loops validate --json`; the full
test suite was never run. Where 52/RESEARCH already establishes a fact this milestone needs, it is
cited as `52/RESEARCH §Qn` rather than re-derived.

**A citation-drift note that bears on all four questions below.** Several of the 14 loop records'
*prose* commentary cites `src/bundle/commands/{continue,verify,autonomous}.md` at line ranges that no
longer match the current files — those command prompts have been edited (materially, in
`autonomous.md`'s case — see Q1) since the loop records were authored. The records' machine-readable
`reference:`/`measurement:`/`actuator:` fields (`prose:<path>`, no embedded line numbers) still resolve
correctly; only the human-readable line citations in the records' own body text have drifted. Every
`file:line` citation in this document was verified against the file as it stands today, not copied from
a loop record's prose.

## Q1 — Who sets each declared loop's reference?

### The registry today (live measurement)

```
AOF_GLOBAL_HOME=$(mktemp -d) aof work loops validate --json
```
reports `summary.checks["reference-ownership"].findings: 5` and exactly these five
`loop-unowned-reference` findings, matching the task's claim verbatim:

| path | message |
|---|---|
| `.aof/loops/build-to-green.md` | `loop:build-to-green` has no inbound target-setting edge from another node |
| `.aof/loops/mesh-assignment-reclaim.md` | `loop:mesh-assignment-reclaim` has no inbound target-setting edge from another node |
| `.aof/loops/retrospective-memory-ingest.md` | `loop:retrospective-memory-ingest` has no inbound target-setting edge from another node |
| `.aof/loops/review-fix-rereview.md` | `loop:review-fix-rereview` has no inbound target-setting edge from another node |
| `.aof/loops/run-resilience.md` | `loop:run-resilience` has no inbound target-setting edge from another node |

**Two loops are already owned**, both by `checkReferenceOwnership` (`src/work-loops-checks.mjs:442-478`)
finding an inbound `target-setting` edge from a non-self node:

- `loop:autonomous-cascade` ← `actor:operator`, edge declared at `.aof/loops/operator.md:7`
  (`target-setting: [loop:autonomous-cascade]`), narrated at `.aof/loops/operator.md:17-20`.
- `loop:verify-triage-accept` ← `actor:product-owner`, edge declared at `.aof/loops/product-owner.md:6`
  (`target-setting: [loop:verify-triage-accept]`), narrated at `.aof/loops/product-owner.md:16-18`.

### Per-loop: the artifact that actually determines the reference signal

**1. `loop:autonomous-cascade` — OWNED, citable.** The *shape* of the reference (dependency order) is
`aof work next` (`src/commands/next.mjs`, `src/work.mjs:908-1012` — established at 52/RESEARCH §Q1.4);
the *content* of the reference (which range to drive) is set by the operator's own argument. Today that
argument is threaded through the now-thin `autonomous.md` (`src/bundle/commands/autonomous.md:15`: "a
range — an inclusive `NN-MM` range or a single `NN`; pass it to the shell verbatim") into `aof work
loop`'s `scope` (`src/commands/loop.mjs:702-708`, `requestedSettings`). The `operator.md` record itself
records that no other operator relation had equally direct evidence (`.aof/loops/operator.md:22-24`) —
no second edge was invented.

**2. `loop:verify-triage-accept` — OWNED, citable.** Reference = VERIFICATION evidence / a chore's
`## Definition of Done` / a spike's `## Finding` (`src/bundle/commands/verify.md:75-201`), and triage of
what counts as a blocker is explicitly the product owner's act: *"Triage (PO): blocker → new `@bug`
… non-blocker → defer … design-gap → `aof-designer` sets the rule first"* (`verify.md:112-113`, current
lines — the record's own citation of `:92` is now stale, see Method).

**3. `loop:build-to-green` — UNOWNED.** Reference = the task's `.feature` file
(`src/bundle/commands/continue.md:186-189`, current lines). Who authors it: **Three Amigos**, at
`aof:refine <story>` — *"PO writes the headline Scenarios; `aof-qa` writes the Examples tables;
`aof-developer` checks feasibility"* (`src/bundle/commands/refine.md:146-147`). No single role
sole-authors it — three roles co-author it in one refine session, and two of the three
(`aof-qa`, `aof-developer`) have **no `actor:` node in the registry at all**; only `actor:product-owner`
exists, and it is already spent on `loop:verify-triage-accept`. Nothing structurally forbids a *second*
`target-setting` edge from `product-owner` — `target-setting` is a list-typed edge key
(`LIST_KEYS`, `src/work-loops.mjs:145`) — but a PO-only edge would name a partial author, not the full
one. **Verdict: no single existing node is a complete citable owner; this would have to be authored**
(either as a partial PO edge, or by adding new actor nodes for `aof-qa`/`aof-developer` — an architect
call, not resolved here).

**4. `loop:review-fix-rereview` — UNOWNED.** Reference = *"architect/QA/designer verdict … Judge against
the contract and the ADRs, not against your own build"* (`continue.md:196-201`, current lines). The ADRs
are authored by `aof-architect` during a milestone's refine Decide stage: *"non-trivial decision →
`aof-architect` → ADRs in `ARCHITECTURE.md`"* (`src/bundle/commands/refine.md:49-51`); the contract
(`.feature`) is the same Three-Amigos product as #3. **No `actor:` node exists for `aof-architect`
either. Verdict: would have to be authored** — no citable single-node owner exists today.

**5. `loop:run-resilience` — UNOWNED.** Reference = the closed `isLegalTransition`/`isRetryable` sets,
hardcoded in `src/run-store.mjs:106,128` (52/RESEARCH §Q1.5) — this is a fact about the *code*, not a
runtime-settable target; nobody "sets" it at runtime, only whoever maintains `run-store.mjs`'s source
(a milestone-20-era authorship fact, not a registry-citable role). Its `ceiling:` half
(`config:work.autonomous.maxAttempts`) *is* config-settable — declared as `3` in this repo's own
`.aof/aof.config.json:24` — but no actor node claims that key. **Verdict: would have to be authored**;
the transition table itself is arguably not something any registry actor *can* own without inventing a
"code maintainer" concept the registry does not have.

**6. `loop:mesh-assignment-reclaim` — UNOWNED.** Reference = the dual staleness gate. **Both halves are
genuinely config-settable numbers today**: the run-heartbeat half resolves via `heartbeatFromConfig(ws)`
→ `work.loop.heartbeatMs` (`src/mesh-assignment-reclaim.mjs:456`, resolver `src/loop-bounds.mjs:48-50`,
default `DEFAULT_HEARTBEAT_MS = 15 * 60 * 1000` at `loop-bounds.mjs:6`); the presence half resolves via
`resolvePresenceStalenessSeconds` → `mesh.presence.stalenessSeconds`
(`src/mesh-presence.mjs:457-469`, default `DEFAULT_PRESENCE_STALENESS_SECONDS = 90` at
`mesh-presence.mjs:57`). So a citable, machine-readable numeric authority exists — but no registry actor
currently declares a `target-setting` edge naming it. **Verdict: a citable authority exists for the
numbers, but the edge would still have to be authored** (most plausibly onto `actor:operator`, since
editing `.aof/aof.config.json` is an operator act by convention — see Q3 — but that placement is the
architect's call, not asserted here).

**7. `loop:retrospective-memory-ingest` — UNOWNED.** Reference = STATE `## Feedback (for retro)` +
VERIFICATION findings + `observability/agents.json` stalls (`src/bundle/commands/retrospective.md:29-37`,
current lines). These are written progressively by whichever role is active when a lesson surfaces — the
developer during build (`continue.md:189-190`: "note any blocker or contract problem in the milestone's
`STATE.md` `## Feedback (for retro)` section"), architect/QA during review, the PO during verify triage —
an aggregate with no single author and no actor node representing any of them for this purpose.
**Verdict: would have to be authored**, or deliberately left unowned (an architect decision, not settled
here).

### `operator.md` / `product-owner.md`'s own declarations, and the missing hierarchy layers

- `operator.md` declares exactly one `target-setting` edge and says so explicitly: *"OQ-1 was resolved
  with the code open: no additional operator relation had equally direct evidence… No extra edge was
  added to improve groundedness"* (`.aof/loops/operator.md:22-24`).
- `product-owner.md` declares exactly one `target-setting` edge, same discipline: *"No second target or
  other edge type is declared because the repository supplies no further cited relation"*
  (`.aof/loops/product-owner.md:18-19`).
- **No `actor:` node exists for task, story, milestone, or PRD** as a layer of the reference hierarchy.
  The registry's 14 records (directory listing, `.aof/loops/*.md`) hold exactly 7 `loop`, 3 `watcher`, 2
  `actor` (`operator`, `product-owner`), and 2 `anchor` nodes — no `architect`/`developer`/`qa` actor,
  and no `story`/`milestone`/`prd` node of any kind. The SPEC's own hierarchy language — *"task ← story ←
  milestone ← PRD ← human"* (`SPEC.md:30-31,50-51`) — names five layers; the registry today represents
  only the bottom (the loops themselves) and the top (the human operator, plus the PO agent role).

## Q2 — Are any two loops' cadences clock-comparable today?

### All 14 records

| id | kind | declared `cadence` | parsed kind |
|---|---|---|---|
| `loop:build-to-green` | loop | `event:per-phase` | event |
| `loop:review-fix-rereview` | loop | `event:per-phase` | event |
| `loop:verify-triage-accept` | loop | `event:per-item` | event |
| `loop:autonomous-cascade` | loop | `event:per-item` | event |
| `loop:run-resilience` | loop | `event:per-run-start` | event |
| `loop:retrospective-memory-ingest` | loop | `event:per-milestone` | event |
| `loop:mesh-assignment-reclaim` | loop | `periodic:15s` | periodic (15,000 ms) |
| `watcher:autonomous-cascade-watcher` | watcher | *(field not admitted)* | n/a |
| `watcher:build-to-green-watcher` | watcher | *(field not admitted)* | n/a |
| `watcher:review-fix-rereview-watcher` | watcher | *(field not admitted)* | n/a |
| `actor:operator` | actor | *(field not admitted)* | n/a |
| `actor:product-owner` | actor | *(field not admitted)* | n/a |
| `anchor:rubric-process-exit` | anchor | *(field not admitted)* | n/a |
| `anchor:run-liveness` | anchor | *(field not admitted)* | n/a |

`cadence` is a member of `CONTROL_KEYS`, and `ADMITTED_KEYS.loop` is the only per-kind set that includes
`CONTROL_KEYS` (`src/work-loops.mjs:66-79, 87-93`); `watcher`/`actor`/`anchor` admit no `cadence` key at
all, confirmed by every one of those 7 records carrying none. Of the 7 `loop` records, **6 parse to
`event` and exactly 1 (`mesh-assignment-reclaim`) parses to `periodic`** (15,000 ms); none parse to
`unknown` — all 7 are well-formed cadence declarations.

### What `checkTimescale` can and cannot decide over that table

`checkTimescale` (`src/work-loops-checks.mjs:524-568`) iterates **only over `kind: loop` nodes as the
edge *source*** (`:525-526,529`), and for each reads that source loop's own outbound `target-setting`
edges (`:530`). **Today no `kind: loop` record declares an outbound `target-setting` edge at all** — the
only two `target-setting` edges in the registry originate from `actor:operator` and
`actor:product-owner` (Q1), neither of which `checkTimescale` ever visits as a source. That is exactly
why the live run above reports `"timescale": {"ran": true, "findings": 0}` — the check runs, finds zero
loop→loop `target-setting` edges to examine, and reports nothing because there is structurally nothing
to compare yet, not because an existing pair already clears the bound.

**The moment a `loop` record declares an outbound `target-setting` edge to another `loop` record** (i.e.
the moment this milestone's ownership edges land on `loop:` nodes rather than only `actor:` nodes), for
each such edge `checkTimescale` will:
- if **both** ends parse `periodic`, compute `ratio = source.ms / target.ms` and emit
  `loop-timescale-inversion` (severity `warn` — not in `GATING_CODES`, `:66-72`, so it never fails the
  CLI's exit code) whenever `ratio < 3` (`:538-539`);
- if **either** end is non-periodic (`event` or `unknown`), emit `loop-timescale-not-comparable`
  instead (also `warn`), naming which side(s) lack a clock (`:551-565`).

**The hardcoded separation ratio is `3`**, a bare numeral at `src/work-loops-checks.mjs:539`
(`if (ratio < 3) {`) — not a config key, not exported, and not among the 8 keys
`resolvesLoopBoundConfigKey` admits (`src/loop-bounds.mjs:78-87,104-107`, all `work.loop.*` timing/round
bounds — none named for a separation ratio).

Given today's 6-event/1-periodic split, **most** candidate `target-setting` edges a story here might
declare will resolve to `loop-timescale-not-comparable`, not `loop-timescale-inversion` — only an edge
between `mesh-assignment-reclaim` and a *second*, not-yet-declared periodic loop could ever exercise the
ratio check at all, because it is currently the registry's sole periodic loop (52/RESEARCH's
"Cadence-normalization observation" already found this dual-axis problem; nothing measured here backs
off that finding).

### `test/arch/acd-loop-timescale-comparability.test.mjs` — what it already freezes

- The closed cadence cross-product — `periodic` × `{periodic, every `EVENT_TRIGGERS` member, `unknown`}`,
  36 pairs (`:18-38`) — always emits **exactly one** finding per pair: `loop-timescale-inversion`
  (`warn`) when both sides are periodic, else `loop-timescale-not-comparable` (`warn`) naming the
  non-clock side(s) by id + raw cadence string.
- The exact boundary: `periodic(45_000)` vs `periodic(15_000)` (ratio **3**) → **no finding** (`:39`,
  strict `<`); `periodic(1_000)` vs `periodic(60_000)` (ratio 1/60, an inverted tiny-over-huge pair) →
  `loop-timescale-inversion` (`:40`).
- The check is **`target-setting`-only**: the identical pair wired through `data-feed` instead produces
  `[]` (`:41`).
- Self-edges, actor-sourced or actor-targeted edges, dangling endpoints, and every non-`loop`-scheme
  endpoint (`command:`, `config:`, `module:`) sit **outside the timescale domain entirely** — all
  produce `[]` (`:47-65`).
- `:67-68` freezes that **no `EVENT_TRIGGERS` member has a duration mapping anywhere in
  `work-loops-checks.mjs`** — events are never converted to a comparable duration by this check;
  "not comparable" is the permanent answer for an event-cadenced loop, not a placeholder this check will
  later grow a conversion table for.

**What 58 must not contradict:** any `target-setting` edge declared between `loop` nodes here must not
expect `checkTimescale` to compare an `event:` cadence against a `periodic:` one, and must not expect the
ratio-3 boundary to move without editing this exact test.

## Q3 — The standing speed vs thoroughness vs autonomy conflict

### The three `loop-shared-actuator-unarbitrated` findings (live)

```
AOF_GLOBAL_HOME=$(mktemp -d) aof work loops validate --json
```
reports exactly three, all `warn` (not in `GATING_CODES`):

1. `prose:src/bundle/agents/aof-developer.md` shared by `[loop:autonomous-cascade,
   loop:build-to-green, loop:review-fix-rereview, loop:verify-triage-accept]`.
2. `prose:src/bundle/agents/aof-product-owner.md` shared by `[loop:autonomous-cascade,
   loop:verify-triage-accept]`.
3. `prose:src/bundle/agents/aof-qa.md` shared by `[loop:autonomous-cascade,
   loop:verify-triage-accept]`.

**What each pair contends over, concretely:**

- **`aof-developer` (4 contenders).** `build-to-green` wants the developer to keep iterating on one task
  until green, bounded only by "no consecutive progress" tolerance (`work.loop.buildNoProgressRounds`)
  and a reset budget (`work.loop.progressMaxResets`) — `src/loop-progress.mjs:184-198`.
  `review-fix-rereview` wants the *same* developer to also apply confirmed review fixes, capped at
  `work.loop.reviewRounds` rounds (default 1, hard cap 3) — `continue.md:207-217`. `verify-triage-accept`
  wants the developer to execute `@manual` scenarios at verify time (`verify.md:80-83`).
  `autonomous-cascade` wants the developer's *total* elapsed time across a whole milestone range held
  under the wall-clock deadlines in `loop-bounds.mjs` and the `work.autonomous.maxAttempts` retry
  ceiling. The concrete pull: **how many review rounds and how much no-progress tolerance the same
  actuator is allowed to spend**, against the cascade's own deadline/attempt budget for the same
  actuator's time — nothing in the registry says which loop's bound wins when they would conflict.
- **`aof-product-owner` (2 contenders).** `verify-triage-accept` wants the PO to triage findings as a
  deliberate blocker/non-blocker/design-gap judgment (`verify.md:112-113`) — thoroughness.
  `autonomous-cascade` wants that same triage folded into an unattended pass (`work.agents.productOwner:
  "inline"`, `.aof/aof.config.json:8`; the L3 gate at `src/commands/loop.mjs:741-749`) — autonomy reach.
  The concrete pull: **whether triage is a deliberated judgment or a no-stop inline pass.**
- **`aof-qa` (2 contenders).** `verify-triage-accept` wants QA to broker a genuine human stop for `@uat`
  — *"stop and prompt the user"* (`verify.md:106-107`) — and run the deterministic/design-conformance
  checks thoroughly. `autonomous-cascade` wants QA folded into the unattended dispatch loop alongside the
  developer and PO. The concrete pull: **whether QA's gate can ever proceed with nobody present**, which
  `verify.md`'s own text says it structurally cannot for `@uat` — an unresolved tension the actuator
  sharing makes visible rather than causes.

### The real, existing knobs

| Knob | Config key | Default | Serves | Who changes it today |
|---|---|---|---|---|
| Review rounds | `work.loop.reviewRounds` | 1 (`DEFAULT_REVIEW_ROUNDS`, `loop-bounds.mjs:10`), hard cap 3 (`MAX_REVIEW_ROUNDS`, `:11`) | thoroughness vs speed | hand-edit of `.aof/aof.config.json` |
| Build no-progress tolerance | `work.loop.buildNoProgressRounds` | 2 (`DEFAULT_BUILD_NO_PROGRESS_ROUNDS`, `:12`) | thoroughness/persistence vs speed | same |
| Progress reset budget | `work.loop.progressMaxResets` | 2 (`DEFAULT_PROGRESS_MAX_RESETS`, `:13`) | thoroughness vs cost | same |
| Attempt ceiling | `work.autonomous.maxAttempts` | 3 (resolved at `src/commands/loop.mjs:706`, `src/commands/run-retry.mjs:62`; declared as `3` in this repo's `.aof/aof.config.json:24`) | autonomy reach (retries before escalating) vs speed | same |
| Start-to-close deadline | `work.loop.startToCloseMs` | 30 min (`loop-bounds.mjs:5`) | speed/cost ceiling (kill+retry an attempt) | same |
| Heartbeat deadline | `work.loop.heartbeatMs` | 15 min (`:6`) | speed (kill on stall); also feeds `mesh-assignment-reclaim`'s reference (Q1 #6) | same |
| Schedule-to-start deadline | `work.loop.scheduleToStartMs` | 10 min (`:7`) | autonomy safety (alert+escalate, never retry) | same |
| Schedule-to-close deadline | `work.loop.scheduleToCloseMs` | 2 hr (`:8`) | speed/autonomy ceiling (give up, escalate, preserve tree) | same |
| Startup grace | `work.loop.startupGraceMs` | 5 min (`:9`) | speed (suppresses only the heartbeat deadline early in a run) | same |
| Rubric evidence floor | `work.rubric.report.floor` | declared `null` by default; effective floor = `max(1, declared, ratchetFloor)` (`evidenceFloor`, `src/work-grade.mjs:326-328`); this repo declares `500` (`.aof/aof.config.json:20`) | thoroughness (how much evidence a grade needs to count as `pass`) vs speed | same |
| Mesh presence staleness | `mesh.presence.stalenessSeconds` | 90 s (`mesh-presence.mjs:57`) | feeds `mesh-assignment-reclaim`'s reference, not itself in this trio directly | same |

Eight of these (`work.loop.{startToCloseMs,heartbeatMs,scheduleToStartMs,scheduleToCloseMs,
startupGraceMs,reviewRounds,buildNoProgressRounds,progressMaxResets}`) are the *complete* set
`resolvesLoopBoundConfigKey` admits (`src/loop-bounds.mjs:78-89,104-107`). `work.autonomous.maxAttempts`
is a **separate**, pre-existing ceiling authority (`EXISTING_CEILING_CONFIG_KEYS`,
`src/work-loops.mjs:179`) recognised by the loop-record loader's ceiling-pointer check but not part of
`LOOP_BOUND_CONFIG_RESOLVERS`. `work.rubric.report.floor` and `mesh.presence.stalenessSeconds` are
recognised by **neither** — no loop record cites either as a `ceiling:` pointer, and no `resolvesLoopBoundConfigKey` admission exists for them; they sit entirely outside the loop-bounds vocabulary
today. **"Who changes it today" is the same honest answer for every row**: a targeted grep for a
programmatic writer of any `work.loop.*`, `work.autonomous.maxAttempts`, or `work.rubric.*` key across
`src/commands/*.mjs` found none (the only config-writing surfaces found — `src/work-orchestrator.mjs:75`
`writeConfig`, `src/work-headroom.mjs`, `src/work-delegation.mjs` — write `settings.claude.model`,
headroom, and `work.agents.delegation` respectively, none of the loop-bound keys). Every knob in this
table is changed today by hand-editing `.aof/aof.config.json`; no command or agent prompt writes any of
them.

### `checkActuatorArbitration`'s exact structural shape

`src/work-loops-checks.mjs:480-514`. For an actuator shared by `userSet` (≥ 2 contending `loop` nodes,
`:496`), it counts as arbitrated only if there **exists some other node** (`nodes.some(...)`, `:498`) —
of *any* kind, `loop`/`actor`/`anchor`/`watcher` alike, since `veto` is an `EDGE_KEYS` member admitted to
every kind (`src/work-loops.mjs:57-63,87-93`) — that:

```js
const arbitrated = nodes.some((node) => {
  if (userSet.has(node.id)) return false;                              // never a contender itself
  const vetoes = new Set(endpoints(node, "veto").map((endpoint) => endpoint?.raw));
  return contenders.every((id) => vetoes.has(id));                     // vetoes EVERY contender
});
```
(`src/work-loops-checks.mjs:498-501`). In words: **one node that is not itself among the loops sharing
the actuator, declaring a `veto:` edge naming every single one of the contending loop ids** — a partial
veto set (vetoing some but not all contenders) does not clear the finding.

## Q4 — Anti-oscillation precedent already in this codebase

**Ordering.** The closest real precedent is the loop shell's fixed, short-circuiting rung order —
*"THE LADDER, WALKED… Each rung SHORT-CIRCUITS the ones after it"* (`src/commands/loop.mjs:208-220`,
`invokeGateLadder` at `:221-234`): `work:validate` runs before `work:doctor`, and a red rung stops the
walk before the next (more expensive) rung runs at all. This orders *checks within a phase gate*, not
*loops* against each other — the PRD's own line "deterministic grading (`validate`) runs before any
model grading (`review`)" (`wiki/planning/PRD-acd-loop-engineering.md:151-152`) names the same pattern
at the loop-performance layer. No existing device orders two *loops* (as opposed to two gate rungs)
against each other.

**Dwell time.** No precedent for "an adjustment must stand for N cycles before reversion is considered"
in the sense 58 will need (protecting a *fresh reference change* from being reverted too soon). What
does exist is the mirror-image pattern — escalating a *stuck* run after N unchanging cycles, not
defending a changed one:
- `decideBuildProgress`/`evaluateProgressPolicy` count **consecutive** stalls (no improvement) and only
  act once `stalls >= maxStalls` (`work.loop.buildNoProgressRounds`, default 2) —
  `src/loop-progress.mjs:172-198`.
- `continue.md`'s `<stall_detection>`: *"From round two onward, if the count is not strictly lower than
  the previous round, stop immediately"* (`src/bundle/commands/continue.md:220-226`) — a 1-round dwell
  before halting, in the opposite direction (halt-on-no-improvement, not protect-a-change).

Neither is "hold an adjustment for N cycles before considering reverting it" — both are "give up after N
cycles of no improvement." The closest analog, not the same device.

**Dead-band.** No precedent for a *magnitude-tolerant* threshold ("small variations do not trigger; only
clear regressions do"):
- `madeProgress` (`src/loop-progress.mjs:136-142`) is a **strict** inequality check — any difference at
  all (one changed line, one touched file) counts as progress; there is no tolerance band.
- The two staleness windows found (`DEFAULT_PRESENCE_STALENESS_SECONDS = 90` at `mesh-presence.mjs:57`;
  `DEFAULT_HEARTBEAT_MS = 15 * 60 * 1000` at `loop-bounds.mjs:6`) are **single-sided cutoffs**, not
  two-sided hysteresis bands — there is no separate, wider "recover to live" threshold distinct from the
  "go stale" one; a node flips at exactly the same instant in both directions.
- `degrade.mjs`'s `THROTTLE_MS = 5000` (`src/degrade.mjs:13,28-33`) is a genuine **temporal** debounce —
  a repeat of the same degrade *code* within 5 s is dropped, hardcoded, not config-backed — but it
  throttles by *time since the last event of that code*, not by *magnitude of change in a measured
  value*. It is the closest thing in the tree to "small variations do not trigger," but on the event
  stream, not on a controlled variable.
- The one genuine **backoff** in the tree: `backoffDelaySeconds(attempt) = min(2**(n-1), 30)`
  (`src/worker-stream-client.mjs:63-66`) — 1s, 2s, 4s … capped at 30s, hardcoded (no config key), reused
  by `src/mesh-terminal-mirror.mjs:283-284,297,320` for its own reconnect delay rather than re-derived.

**Summary for the architect:** ordering has a real, citable precedent (gate-rung short-circuiting);
backoff and a code-throttling debounce both have real, citable precedent; dwell time and dead-band, in
the specific senses 58's SPEC describes (protecting a change from premature reversion; tolerating small
variation before reacting), have **no precedent in this codebase** — the nearest neighbours pull in the
opposite direction (escalate-after-N-stalls) or apply a strict, not tolerant, equality test. 58 would be
declaring new vocabulary for those two, not naming an existing pattern.
