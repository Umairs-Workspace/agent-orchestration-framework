---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: how did we decide to build it, and why that way?
  Owner: architect. A log of ADRs: numbered, IMMUTABLE, superseded-not-edited.
  Does NOT contain observable behaviour (→ task .feature files) — only the structure behind it.
-->
# 52 · Loop registry & the loop graph — Architecture Decisions

> **Inputs.** This milestone's `SPEC.md` (Objective + Scope + Out of scope — the five deliverables:
> loop records, the closed five-edge vocabulary, `work:loops show|graph|validate`, the five structural
> checks *as findings not enforcement*, one readable rendering) and `RESEARCH.md` (measured,
> source-cited; the factual base for every field value, coupling number and precedent below — ADRs cite
> it as `RESEARCH §…` rather than re-deriving it). Upstream: `wiki/planning/PRD-graph-engineering.md`
> §Objective lever 1, §Constraints, §Scope. Neighbours whose boundaries these ADRs must not cross:
> `53_milestone_loop-artifact/SPEC.md` (executes — `aof work loop`; deliberately NOT dependent on 52)
> and `55_milestone_anchors-and-frozen-set/SPEC.md` (grounds — anchor taxonomy, provenance, staleness,
> the frozen set).
>
> **Graph grounding (measured, not inferred).** `aof graph build .` → **10290 nodes / 24983 edges**,
> `builtAt 2026-08-14T15:01:19.878Z`, egress none. `aof graph impact`:
> `src/work.mjs` — **240 dependents**, imports 4 (**the stream's god-node**, grown 6× since milestone 37
> measured 35); `src/command-core.mjs` — 100 dependents, imports 72 command modules (registration is
> purely additive); `src/spine/face.mjs` — `deriveRouteTable` builds the CLI route table *from* the
> registry (`src/spine/face.mjs:87-99`), `resolveRoute` longest-prefix-matches (`:104-120`), and 4-word
> routes already exist (`src/commands/notion-associate.mjs:212`); `src/run-store.mjs` — 35 dependents,
> imports only `degrade.mjs`+`fs.mjs`; `src/work-observe.mjs` — 6 dependents, imports **nothing** (a
> leaf). These are actual edges, cited as such throughout.
>
> **Memory recall (role-scoped, run once).**
> `aof work memory recall "declaring control loops as a typed graph in the work stream, edge vocabulary,
> structural checks in validate" --area architecture --block` returned five hits, each honoured **in
> writing** below:
> - **ADR-001 (m15)** — "`work:doctor` is the validate sibling on the command core, with its OWN richer
>   finding envelope `{code, severity, path, message}`". → **Honoured** by ADR-007: the loop checks adopt
>   doctor's envelope, not `validateWork`'s `{path, problem}`, and for the same reason m15 gave.
> - **R1 (m37)** — "a 'single-editor of the god-node' partition must count LOGICAL vocabulary seams, not
>   physical files" (the item vocabulary is copied in four modules). → **Honoured** by ADR-001 and
>   FF-5201: this milestone adds **no** token to that vocabulary anywhere, so all four copies stay
>   byte-identical, and the partition's rule is "zero stories edit `src/work.mjs`", not "one".
> - **ADR-003 (m25)** — a new surface is its own thin face reaching data **only** through a registered
>   command. → **Honoured** by ADR-008/ADR-009: 52 adds no face at all, and 53's Loop-Ready score
>   composes these checks through `invoke()` (`src/command-core.mjs:412-418`), never by importing the
>   loop modules.
> - **ADR-002 (m41)** — the mechanical half is a deterministic CLI; the **prose framing stays
>   hand-authored**, never LLM-generated bookkeeping. → **Honoured** by ADR-001 (records are
>   hand-authored under git; this milestone ships **no writer**) and ADR-007 (the checks are mechanical).
> - **ADR-003 (m41)** — a **tiered** correctness surface: say which layer is guaranteed and which is
>   explicitly not touched. → **Honoured** by ADR-003, which states the tier boundary as the milestone's
>   sharpest line: pointer **syntax** is guaranteed here; pointer **resolution** is explicitly not
>   touched and belongs to 55.

---

## ADR-001: Loop records are hand-authored markdown in a NON-ITEM `<work.dir>/loops/` directory — not a seventh `ITEM_RE` type, not item frontmatter, not a sidecar config — and this milestone ships NO writer

**Status:** Accepted
**Date:** 2026-08-14

**Context.** `PRD-graph-engineering.md` §Constraints is unambiguous about the store: *"Loops, edges and
anchors live in the work stream, under git… If a loop, its watcher, its reference-owner and its auditor
cannot be reviewed in a PR, they are not governed. No sidecar config, no service."* That rules out
`.aof/loops.json` before the design starts. The live question is *how* a loop record sits in the work
stream, and RESEARCH §Q3 priced the obvious answer.

Making `loop` a seventh `ITEM_RE` type (`src/work.mjs:48`) drags in a vocabulary that is **copied, not
imported**, across four modules: `src/work-doctor.mjs:40-43,60-63` ("Mirrors `work.mjs`'s `ITEM_RE`" /
"Mirrors `work.mjs`'s `isDriver`"), consumed downstream by `src/work-doctor-coherence.mjs:18` and
`src/work-doctor-freshness.mjs:19`; `src/commands/migrate-folder.mjs:47-48`, whose `nextFreeSlot` slot
arithmetic is keyed to the same closed set; `src/commands/insert-shared.mjs:130`; and a hard-coded TS
union in the board (`ui/src/board/api.ts:8-11`, with `model.ts:28,65` and `BoardLanes.tsx:148`). Milestone
37 added two types to that enum and paid **4 ADRs + 6 arch-tests + a forced by-layer story cut** when
`work.mjs` had **35** importers; it now has **240** (graph, 2026-08-14). Its own retrospective, R1, is the
recall hit above: the partition rule under-scoped because it counted files, not logical seams.

The enabling fact on the other side is equally measured: `listItems` skips any directory whose name does
not match `ITEM_RE` with a bare `continue` — no finding, no error, no trace (`src/work.mjs:281-291`, the
`continue` at `:287`). A non-item directory inside `work.dir` is therefore invisible to `listItems`,
`nextWork`, `validateWork` and `work-doctor`'s snapshot pass alike. That is not a loophole being
exploited; it is the property that makes a second, differently-shaped record class possible **without
touching the god-node at all**.

One further fact bounds the write side: `applyItemFrontmatter` (`src/work.mjs:522-546`) is item-shaped —
it calls `recordDoc(item)` and needs `item.dir`/`item.type` — and **no existing seam writes frontmatter to
an arbitrary non-item path** (RESEARCH §Q3). The reader, by contrast, is already general: `parseFrontmatter`
(`src/work.mjs:348-358`) is a pure function over raw text with no `item` object required.

**Decision.** A loop-graph node is **one hand-authored markdown file** at `<work.dir>/loops/<slug>.md`
(here `wiki/work/loops/`), frontmatter + prose body, read with the existing `parseFrontmatter`. Precisely:

1. **Not an item.** Nothing is added to `ITEM_RE` or any of its four physical copies. Loop nodes have no
   `status`, no lifecycle, no `depends`, no record-doc mapping, and never appear in `listItems`,
   `nextWork`, `validateWork` or `work doctor`. `src/work.mjs` is **not edited by this milestone.**
2. **Read-only in 52.** This milestone ships **no writer**. Records are authored by hand, land in a PR
   diff, and are reviewed there — which is exactly what PRD §Constraints demands of a governed loop. No
   `applyItemFrontmatter` extension, no new arbitrary-path frontmatter writer, no scaffold command.
3. **One directory, extended by `kind:`, never by a sibling.** `loops/` is the loop **graph's** node
   directory. It holds `kind: loop` and `kind: actor` nodes today (ADR-002/ADR-005). A later milestone
   that needs a new node class (55's anchors) adds a `kind:`, or supersedes this ADR — it does **not**
   add a second non-item directory to `work.dir`.
4. **No config key.** The directory is `path.join(ctx.workspace.workDir, "loops")`, resolved from the
   08/ADR-002 `ctx.workspace`. It is not configurable; one home, no second door.
5. **Frontmatter must be expressible in the minimal parser.** `parseFrontmatter` reads `key: value` and
   inline lists `[a, b]` only — block lists/maps and inline flow maps `{ … }` are deliberately not parsed
   (18/ADR-007, `src/work.mjs:344-347,360-366`). The schema (ADR-002) and the edge model (ADR-004) are
   designed *within* that grammar rather than widening the 240-dependent god-node's parser.

**Alternatives considered.**
- *A seventh `ITEM_RE` work-item type* — **rejected on the measured price.** Four copies of the vocabulary
  to keep in lockstep (RESEARCH §Q3), the board TS union, `migrate-folder`'s slot arithmetic, and an edit
  to a file with 240 dependents — for a record class that wants **none** of what item-ness provides
  (status, lifecycle, `depends`, `next` candidacy, doctor's coherence lane). m37 paid this for two types
  that genuinely *were* work items. A loop is not a unit of work; it is a description of machinery.
- *Frontmatter on existing work items* — **rejected on three counts.** (a) Six of the seven loops have no
  single owning item — build-to-green is not a milestone, run-resilience spans `run-store.mjs` and three
  commands, mesh-assignment-reclaim spans two modules and a cadence policy; each declaration would be
  filed under whichever item it least badly resembled. (b) It would push loop keys into `readMeta`'s
  per-item frontmatter, which is item-lifecycle-shaped and read by every one of the god-node's 240
  dependents. (c) A milestone's record doc is compacted at Accept; a loop declaration must outlive the
  milestone that noticed it.
- *A sidecar `.aof/loops.json` (or a service)* — **rejected by PRD §Constraints verbatim.** Not reviewable
  as a diff ⇒ not governed.
- *A folder-per-loop with a `LOOP.md` record doc, mirroring items* — **rejected:** it buys nothing (there
  are no per-loop child artifacts in 52) and it visually re-asserts item-ness that ADR-002 then has to
  deny. Flat files keep the "these are not items" claim legible.
- *Ship a `work:loops add` scaffold writer alongside* — **rejected for this milestone.** A writer is the
  seam through which an agent fabricates a declaration; RESEARCH found `owner` UNKNOWN for six of seven
  loops, and the SPEC's promise is a *faithful description*. Nine hand-authored, citation-backed records
  reviewed in a PR are the deliverable. When 55 needs provenance stamped **at write time** (`55 SPEC
  §Scope`), it will need a writer — and it will build one that stamps, rather than inheriting one that
  does not.

**Consequences.** No story in this milestone edits `src/work.mjs` (partition, below), so m37's
"exactly one story may edit the god-node" rule is satisfied by *zero*, and m37/R1's copy-drift trap does
not apply because no copy changes. `loops/` is the first non-item **directory** in `work.dir` (which
already tolerates the non-item files `ROADMAP.md` and `TECH_DEBT.md`); decision 3 above is the ratchet
that stops it becoming a habit. The cost accepted here is real and named: because `listItems` skips the
directory silently, a malformed or misplaced loop file is invisible to every existing check —
`work:loops validate` (ADR-007) is its **only** reader, and FF-5204 is what stops that being a hole.

**Invariant.** No `loop`/`loops` token enters `ITEM_RE` or any of its copies (`src/work.mjs:48`,
`src/work-doctor.mjs:40-43`, `src/commands/migrate-folder.mjs:47-48`, `ui/src/board/api.ts:8-11`); loop
records live at `<work.dir>/loops/*.md`; this milestone contains no code path that writes a file under
`<work.dir>/loops/`. (Enforced by `acd-loop-registry-not-an-item-type`, `acd-loop-module-import-boundary`.)

---

## ADR-002: The loop record schema is frozen with `unknown` / `uncapped` / `none` / `prose:` as first-class, mutually distinct declarable values — a declared gap is a finding, never a validation error, and never equal to a filled field

**Status:** Accepted
**Date:** 2026-08-14

**Context.** This is the milestone's honesty keystone. RESEARCH measured: `owner` is **UNKNOWN for six of
the seven** loops (only verify→triage→accept names one — the PO, `src/bundle/commands/verify.md:92`;
retrospective names a per-*lesson*, not per-*loop*, owner at `retrospective.md:44`); build-to-green and
review→fix→re-review are **literally uncapped** — no ceiling, no timeout, no turn limit anywhere in
`src/bundle/commands/continue.md`, conceded at `wiki/planning/PRD-acd-loop-engineering.md:58`; and
measurement is *"prose only, no named machinery"* for four loops. The SPEC promises **"a faithful
description of the loops aof runs today — not an aspiration"**. A schema that required every field to be
filled would make the first act of this milestone the fabrication of six owners and two cadences — the
registry would ship pre-corrupted, and every later milestone would build on invented facts.

The three states are epistemically **different**, and collapsing them destroys the fact each carries:
*no evidence was found* (owner) is not *evidence was found that no bound exists* (cadence ceiling) is not
*the authority exists but is a paragraph, not a symbol* (measurement). The third is the one 53 and 57 will
grind against; the second is the one 53's cap milestone exists to fix; the first is 58's inbox.

Two shaping constraints: the frontmatter grammar is flat scalars and inline lists only (ADR-001 §5), and
RESEARCH §Q1.5 shows run-resilience has **three** references and **three** actuators — so the machinery
fields must be lists or the exemplar loop loses precisely the machine-readability that makes it the
exemplar.

**Decision.** The node schema below is **frozen**. It carries the SPEC's six fields unchanged and adds a
**seventh, `ceiling`** — declared here as a deliberate departure from the SPEC's six-field phrasing,
because RESEARCH proves `cadence` (how often it fires) and `ceiling` (when it stops) are different axes:
the autonomous cascade's only bound is an attempt ceiling and **not** a rate
(`src/bundle/commands/autonomous.md:14,73`, resolved at `src/commands/run-retry.mjs:62`), while
build-to-green has a rate but no bound at all. Collapsing them would either lose the uncapped fact or
corrupt the rate axis the timescale check (ADR-006) reads — and 53 needs a machine-readable answer to
"which loops have no ceiling" to know what its cap is for.

**The locked node contract (frozen 2026-08-14):**

```yaml
# <work.dir>/loops/<slug>.md — frontmatter, then a prose body (free-form: evidence, citations, caveats).
# Every key below is a flat scalar or an inline list — nothing outside parseFrontmatter's grammar.

# --- identity: REQUIRED on every node -------------------------------------------------
id:          loop:<slug> | actor:<slug>   # MUST equal "<scheme>:<filename stem>"; scheme matches `kind`
kind:        loop | actor                 # CLOSED set (52). 55 may ADD members; it may not remove one.
title:       <one line, free text>

# --- the control fields: REQUIRED on kind: loop ---------------------------------------
controlled:  <field-value>                # scalar. the controlled variable.
reference:   [<field-value>, ...]         # LIST. what it drives toward.
measurement: [<field-value>, ...]         # LIST. how the variable is observed.
actuator:    [<field-value>, ...]         # LIST. what acts on the world.
cadence:     <cadence-value>              # scalar, typed — ADR-006.
ceiling:     [<pointer>, ...] | uncapped | none | unknown
owner:       actor:<slug> | unknown       # scalar. NOT an edge — see ADR-004.
optimizing:  true | false                 # scalar. a CLAIM a human makes; never derived.

# --- ground: OPTIONAL, kind: actor only (52) ------------------------------------------
ground:      exogenous                    # the ONLY admitted value in 52 — ADR-005.

# --- edges: OPTIONAL on any node — ADR-004 --------------------------------------------
data-feed: [...]  target-setting: [...]  monitoring: [...]  veto: [...]  parameter-tuning: [...]

# --- the value grammar (the honesty keystone) -----------------------------------------
field-value := <pointer>            # machine-readable authority — ADR-003
             | prose:<path>         # DECLARED: the only authority is a paragraph, and it lives HERE
             | unknown              # DECLARED: no evidence of this field was found in the codebase
             | <phrase>             # free text — admitted ONLY on `controlled` and `title`

# ADMISSION RULES (the teeth):
#   · An ABSENT required key is an ERROR (loop-missing-field). Absence is an authoring slip;
#     a declared gap is a claim a human made and a reviewer saw. They are never the same thing.
#   · `unknown` is admitted ONLY on `owner`, `cadence` and `ceiling`.
#     `controlled`/`reference`/`measurement`/`actuator` may be `prose:` but NEVER `unknown` — a loop
#     whose actuator cannot even be named as a document is not a loop that runs (ADR-010 / FF-5204).
#   · `uncapped` and `none` are admitted ONLY on `ceiling`, and mean OPPOSITE things:
#       uncapped — evidence found, and the evidence is that NO bound exists (build-to-green).
#       none     — the body runs once per trigger and terminates by construction (verify→triage→accept).
#   · A list field authored as a bare scalar is an ERROR (loop-expected-list) — never coerced.
#   · A key outside this schema ∪ the five edge keys is a finding (loop-unknown-key), never ignored.

# --- how a value reaches a consumer (`work:loops show --json`, ADR-008) ---------------
Field = { key, raw, kind: "pointer"|"prose"|"unknown"|"uncapped"|"none"|"phrase",
          pointer?: { scheme, operand, symbol? } }
# `kind` is ALWAYS present. A consumer can NEVER mistake a declared gap for a filled value, because
# the two differ in `kind`, not merely in `raw`. This is the whole point of the field envelope.
```

**Validate's treatment (the rule this ADR exists to fix in advance).** An explicitly declared gap
(`unknown` / `uncapped` / `prose:`) is a **finding at `severity: warn`** — codes `loop-owner-unknown`,
`loop-cadence-unknown`, `loop-ceiling-uncapped`, `loop-field-prose-only`. It is **never** an error, never
blocks, and is never silently equivalent to a filled field. A schema violation (missing key, bad value,
scalar-where-list, unknown key, id/filename mismatch) is `severity: error`. Both are reported; neither
enforces anything in this milestone (`SPEC §Scope`: "findings, not enforcement"; exit-code rule in
ADR-007).

**Alternatives considered.**
- *Require every field filled* — **rejected:** it makes the first act of this milestone the fabrication of
  six owners and two cadences, directly contradicting `SPEC §Objective`. The registry's value is that it
  can be trusted; a schema that punishes honesty guarantees it cannot be.
- *Allow the key to be omitted, and treat absence as unknown* — **rejected:** absence is indistinguishable
  from a typo or an unfinished record. A declared `unknown` is a claim with an author and a PR reviewer;
  silence is neither. This is the single most load-bearing line in the schema.
- *One sentinel (`TBD` / `null`) for all three states* — **rejected:** `unknown` and `uncapped` are
  opposite epistemic states — one says "we found nothing", the other says "we looked and there is
  provably no bound" (`PRD-acd-loop-engineering.md:58`). Collapsing them destroys exactly the fact 53
  needs, and would let a later fix of the *cadence* silently look like a fix of the *cap*.
- *Keep the SPEC's six fields and encode uncapped-ness inside `cadence`* — **rejected**, with the
  departure recorded: two loops have a firing rate *and* no bound, and the cascade has a bound *and* no
  rate. One field cannot carry both without one of them lying to the timescale check.
- *Scalar-or-list polymorphism on the machinery fields* — **rejected:** run-resilience genuinely has three
  references and three actuators (`src/run-store.mjs:96-108`, `:126-130`, `:141-143`, `:593-640`,
  `:684-729`); forcing one would demote the exemplar. Uniform lists mean every consumer has one shape,
  and a bare scalar is a loud error rather than a silent coercion.

**Consequences.** The day-one registry (ADR-010) will emit roughly a dozen `warn` findings on its first
run — six unknown owners, two uncapped ceilings, and a `prose:` count across four loops — and **that is
the deliverable working**, not a defect. `work:loops show --json`'s `Field.kind` is the contract 53's
Loop-Ready score and 55's groundedness report both read; freezing it here is what lets story 03 author
records in parallel with the code that reads them (partition, below).

**Invariant.** Every node record parses against the schema above with zero `error`-severity schema
findings; the admitted key set, node kinds, and sentinel tokens are frozen literals in the loader, not
derived from the records; every `kind: loop` node's `controlled`/`reference`/`measurement`/`actuator` is a
pointer or `prose:` and never `unknown`. (Enforced by `acd-loop-vocabulary-closed`, `acd-loop-records-parse`.)

---

## ADR-003: "Declare, never duplicate" means a pointer is a DECLARED, SYNTACTICALLY-validated reference — 52 never resolves one against live data; that is 55's job, and 55 inherits it

**Status:** Accepted
**Date:** 2026-08-14

**Context.** `SPEC §Dependencies` is explicit that the registry "must describe that machinery, never
duplicate it", and RESEARCH §Q1.5 shows why the temptation is real: four of run-resilience's six fields
are **already** named pure functions and constants — `isLegalTransition` (`src/run-store.mjs:106`, over
the `LEGAL_TRANSITIONS` set at `:96-108`), `isRetryable` (`:126`), `shouldRetry` (`:141`), `retryReadiness`
(`:253`), `isStale` (`:667`) — over a frozen 15-key run record (`:344-362`). The autonomous cascade's
reference is a registered command with a `--json` contract (`nextWork`, `src/work.mjs:908-1012`, surfaced
as `work:next`). The cascade's ceiling is a config key (`config:work.autonomous.maxAttempts`, resolved at
`src/commands/run-retry.mjs:62`). A record that *restated* the retryable set would drift the day someone
adds a failure reason, and nothing would notice.

The dangerous question is what a pointer is *allowed to be* here. Resolving `module:src/run-store.mjs#isRetryable`
— opening the file, confirming the export — sounds cheap and is not: it makes the checks impure
(filesystem/dynamic import), it needs a freshness and staleness vocabulary to report a stale pointer
honestly, and a "this pointer no longer resolves" verdict *with no provenance* is precisely the kind of
unattributed claim 55 exists to prevent (`55 SPEC §Scope`: provenance stamped at write time; groundedness
reported as anchored / self-referential / **stale**). A resolver without provenance is an instrument
nobody can audit — and 52 has no writer (ADR-001) with which to stamp one.

**Decision.** A pointer is one of exactly **three** machine-readable schemes, and 52 validates **shape
only**:

```
pointer := "module:" <repo-relative path, forward slashes> "#" <symbol>
         | "command:" <registered command id>
         | "config:"  <dot path into the workspace config>

52 VALIDATES:   the scheme is one of the three; the operand is non-empty; `module:` carries a `#symbol`;
                the path is repo-relative with forward slashes (never absolute, never OS-separated).
52 DOES NOT:    open the module · check the symbol is exported · call getCommand(id) · read the config ·
                run anything · resolve an `item:` ref · touch the filesystem outside <work.dir>/loops.
```

A field whose authority is **not** machine-readable is not a weak pointer — it is `prose:<path>` (ADR-002),
the sentinel that both admits the gap and says where the paragraph lives (e.g.
`prose:src/bundle/commands/continue.md`). There is deliberately **no `doc:` pointer scheme**: if it were
addressable by a document it would blur into `prose:`, and the registry would lose the one number that
makes its honesty measurable — **how much of it is still paragraph-backed**.

**The tier boundary, stated as m41/ADR-003 requires:**

| Layer | 52 | 55 |
|---|---|---|
| Pointer **syntax** (scheme, operand shape, path form) | **GUARANTEED** — a finding on every violation | inherited unchanged |
| Pointer **resolution** (symbol exists, command registered, config key present) | **NOT TOUCHED** | owned — with provenance |
| Pointer **staleness** (it resolved once, it doesn't now) | **NOT TOUCHED** | owned — the `stale` branch of the groundedness report |

**Alternatives considered.**
- *Resolve pointers in 52* — **rejected.** It converts a declaration milestone into an instrumentation
  milestone (SPEC's out-of-scope list draws exactly this line at anchors and enforcement), it breaks the
  purity invariant that lets the checks be trivially testable and the check story be built in parallel
  (ADR-007, FF-5205), and it would ship a staleness verdict with no provenance to defend it — inventing
  half of 55's vocabulary badly, six weeks early.
- *Let a pointer be free prose ("the transition table in run-store")* — **rejected:** "declare, never
  duplicate" becomes unenforceable and unmeasurable, and the record slides back into restating the thing.
- *Copy the authority's content into the record (list the retryable set, the transition table)* —
  **rejected** by `SPEC §Dependencies` in terms. A copy drifts silently; that is the failure the whole
  arc is about.
- *Add a `doc:` pointer scheme for prompt files* — **rejected:** see above. A prompt is prose; calling it
  a pointer would let four loops' worth of "prose only, no named machinery" (RESEARCH §Q1) read as
  machine-readable and quietly extinguish the milestone's most useful measurement.

**Consequences.** **55 inherits this explicitly, and it is recorded here so 55 need not re-litigate it:**
pointer resolution, resolution provenance and pointer staleness are 55's, and they arrive **additively** —
55 adds a resolver and a provenance stamp; it does not change the pointer grammar, does not invalidate a
single 52-era record, and does not need this ADR superseded. The cost accepted, and named: a pointer can
rot (a renamed symbol) and 52 will not notice. That is a known, bounded, dated gap — not an oversight —
and 55's stale-anchor detection is its discharge condition.

**Invariant.** Every `reference`/`measurement`/`actuator`/`ceiling` entry parses as a pointer in one of
the three schemes or an admitted sentinel — never free prose (ADR-002's `<phrase>` is admitted on
`controlled`/`title` only); and no module under `src/work-loops*` performs a filesystem, process or
dynamic-import read other than the loader's read of `<work.dir>/loops/`. (Enforced by
`acd-loop-vocabulary-closed`, `acd-loop-checks-pure`.)

---

## ADR-004: Edges are five closed frontmatter keys declared on the SOURCE node only, outbound, with typed endpoint URIs; a non-loop endpoint is first-class; `depends` is untouched

**Status:** Accepted
**Date:** 2026-08-14

**Context.** `SPEC §Objective` fixes the vocabulary: **data-feed**, **target-setting**, **monitoring**,
**veto/constraint**, **parameter-tuning**, with `depends` retained unchanged as the item-level edge. Three
things are left open and all three are load-bearing: where an edge is *declared*, what an endpoint may
*be*, and how an unknown type or a dangling endpoint becomes **computable** rather than a matter of
reading. PRD §Objective lever 1 adds the case that decides the second: `target-setting` **from the human**
is the exogenous root — *"'Better' at the root is exogenous"* (PRD §Constraints) — so the model must be
able to express an edge whose source is not a loop at all.

The frontmatter grammar (ADR-001 §5) turns out to fit the problem exactly: one key per edge type, value =
inline list of endpoints. An unknown edge *type* is then an unknown frontmatter *key*, which is
mechanically detectable against a frozen key set.

**Decision.**

**1 — Five closed keys, declared on the source node only, outbound.** Each key means
`<this node> --<type>--> <each endpoint>`:

| Key | Reads as |
|---|---|
| `data-feed` | this node's output is an input to the endpoint |
| `target-setting` | this node sets/owns the endpoint's **reference** |
| `monitoring` | this node watches the endpoint's metric |
| `veto` | this node may stop or constrain the endpoint |
| `parameter-tuning` | this node may adjust the endpoint's knobs |

`veto` is the frontmatter key for the SPEC's "veto/constraint" — one type, one token; the slash does not
survive a frontmatter key (`parseFrontmatter`'s key pattern is `[A-Za-z0-9_-]+`, `src/work.mjs:348-358`). An absent key means "no
edges of that type", which is a fact, not a gap: edge absence **is** the finding the checks are looking
for (ADR-007), so there is no sentinel for it and none is wanted.

**2 — Because edges are outbound-only, a non-loop node must be declarable.** `kind: actor` nodes
(ADR-002) are how the exogenous root is expressed: `loops/operator.md` declares
`target-setting: [loop:autonomous-cascade, …]`. This is what makes "the human owns which things are worth
controlling" a **declared edge in a PR diff** rather than a footnote.

**3 — Endpoints are typed URIs, and 52 resolves exactly two schemes.**

```
endpoint := loop:<slug> | actor:<slug>        # INTRA-REGISTRY — 52 resolves these; a miss is dangling
          | item:<ref> | command:<id> | config:<dot.path> | module:<path>#<symbol>
                                              # EXTRA-REGISTRY — declared and syntax-checked ONLY (ADR-003)
```
`loop:`/`actor:` endpoints with no declaring record produce `loop-graph-dangling-endpoint` at
`severity: error`. Extra-registry endpoints are **never** resolved here — including `item:`, which
`listItems` could technically answer, because doing so would make the checks impure and would import the
240-dependent god-node into the check path for no gain 55 will not deliver better. The two-tier
resolution is stated in the `--json` contract so no consumer mistakes "unresolved" for "resolved fine".

**4 — `owner` is a FIELD; `target-setting` is an EDGE. They are different questions and must not be
conflated.** `owner` answers *who is accountable for this loop*; `target-setting` answers *who owns its
reference*. The unowned-reference check (ADR-007, check 3) reads the **edge**, never the field — a loop
can have a named owner and a completely unowned target, which is the exact shape of "blindness upward"
(PRD §Context, failure 2).

**5 — `depends` is untouched.** It stays the item-level edge, parsed, resolved and cycle-checked by
`validateWork`/`findCycle` (`src/work.mjs:685-713`, `:718-843`). No loop record carries a `depends` key
(it would be an unknown-key finding), and no loop edge appears in the item graph. Two graphs, two stores,
one register apiece.

**A worked record (illustrative shape; the day-one values are story 03's, evidence-cited):**

```markdown
---
id: loop:run-resilience
kind: loop
title: "Run resilience — runs driven to a terminal state"
controlled: "run `state` reaching a terminal value (done|failed|cancelled)"
reference: [module:src/run-store.mjs#LEGAL_TRANSITIONS, module:src/run-store.mjs#isRetryable]
measurement: [module:src/run-store.mjs#isStale, module:src/run-store.mjs#retryReadiness]
actuator: [command:work:run-retry, command:work:run-complete, module:src/run-store.mjs#reclaimStaleRuns]
cadence: event:per-run-start
ceiling: [config:work.autonomous.maxAttempts, module:src/run-store.mjs#shouldRetry]
owner: unknown
optimizing: false
data-feed: [loop:autonomous-cascade]
---
Evidence: RESEARCH §Q1.5 …  (prose body: citations, caveats, what is NOT claimed)
```

**Alternatives considered.**
- *Declare each edge at both ends with a consistency check* — **rejected.** It doubles the authoring
  surface and manufactures a finding class ("declared at one end only") that is pure bookkeeping noise,
  while single-writer means an edge cannot disagree with itself. The house precedent is the same shape:
  `depends` is source-declared and resolved one-way (`src/work.mjs:718-843`).
- *A separate `edges.md` document* — **rejected:** it splits a node's declaration from its edges, so a
  PR that adds a loop and a PR that wires it are two diffs, and the second is easy to never write. It
  also creates a single hot file every parallel authoring stream must edit — the exact anti-parallelism
  the story partition is built to avoid.
- *Invert `target-setting` to inbound ("my reference is set by")* so the human needs no node — **rejected:**
  a per-key direction rule is a permanent source of misreading, and the exogenous root deserves to be a
  **node** anyway: 55 needs somewhere to hang `ground:` (ADR-005), and 58 needs somewhere to hang an
  arbiter.
- *Edges as `depends`-style item refs, reusing the existing edge machinery* — **rejected** by
  `SPEC §Objective`: `depends` becomes "one edge type among several", not the carrier for the other five.
  Overloading it would put loop semantics into the god-node's validator.
- *An open edge vocabulary (any key is an edge)* — **rejected:** then an unknown edge type is
  uncomputable by construction, and `SPEC §Scope` says the vocabulary is closed.

**Consequences.** The whole edge model lives inside `parseFrontmatter`'s existing grammar, so no parser
change reaches `src/work.mjs`. Unknown edge type = `loop-unknown-key` (error); dangling intra-registry
endpoint = `loop-graph-dangling-endpoint` (error) — both computable, both required by the SPEC. 58
(supervising-loops) inherits `target-setting` and the arbiter shape unchanged; 57 (paired-loops) inherits
`monitoring`. Neither needs this ADR superseded.

**Invariant.** The five edge keys and the six endpoint schemes are frozen literal sets in the loader; a
key outside {schema keys ∪ five edge keys} yields `loop-unknown-key`; a `loop:`/`actor:` endpoint with no
declaring record yields `loop-graph-dangling-endpoint`; no loop record carries `depends`, and no loop
edge enters `validateWork`'s graph. (Enforced by `acd-loop-vocabulary-closed`, `acd-loop-records-parse`.)

---

## ADR-005: Ground in 52 is exactly ONE class — `ground: exogenous` on an actor node — and 52 never reports "grounded" unqualified; 55 widens the enum additively and deletes nothing

**Status:** Accepted
**Date:** 2026-08-14

**Context.** The ungrounded-SCC check is the SPEC's headline algorithm and it needs a ground notion to be
computable at all. But the anchor **taxonomy**, **provenance** and **staleness** are 55's by name
(`55 SPEC §Scope`), and 55 describes the groundedness report as *"promoted from a 52 finding to a
first-class report"* — so 52 must compute it, with a marker 55 can **enrich** rather than **delete and
replace**. A placeholder 55 has to rip out is a bad seam; one it extends is a good one.

There is a hard constraint that decides which marker is honest, and it comes from ADR-001: **52 has no
writer, therefore 52 cannot stamp provenance.** 55's rule is that a claim without a producing node, run
and timestamp cannot be defended. It follows directly that 52 may not declare any **measurement-based**
anchor — an observed exit code, a build stamp, a landed commit, a live-soak observation are all readings,
and a reading without provenance is an assertion. Exactly one ground class needs no provenance machinery
because it is the root by definition: PRD §Constraints, *"'Better' at the root is exogenous — the human
owns which things are worth controlling"*, and `55 SPEC §Scope` lists **exogenous human judgment** as one
of its own three taxonomy branches.

**Decision.**

1. **The minimal ground marker is `ground: exogenous`, admitted only on a `kind: actor` node.** In the
   day-one registry that is exactly one node — the operator (ADR-010). An agent-role actor
   (`actor:product-owner`) carries **no** `ground:` key: an LLM agent is not exogenous ground, and the
   schema must not let ownership-by-an-agent masquerade as contact with reality (PRD §Context, failure 5:
   *LLM judges prefer their own outputs*).
2. **Groundedness is forward reachability from a ground node.** A strongly connected component is
   grounded iff at least one of its members is reachable from a `ground:`-bearing node by following edges
   **forward** (any of the five types). The direction is the one the semantics demand: ground flows *into*
   a loop — the human sets the target (`target-setting`), the anchor feeds the measurement (`data-feed`).
3. **52 never reports "grounded" unqualified.** Every grounded verdict names the ground **class** that
   supported it, and the only class 52 can issue is `exogenous` — which is by construction the *weakest*
   ground in 55's taxonomy. A component grounded solely via `exogenous` is reported as
   `loop-graph-grounded-exogenous-only` at `severity: warn`, **not** as silently green. A component with
   no ground path at all is `loop-graph-ungrounded-component` (warn — findings, not enforcement).
4. **55 supersedes additively, by construction.** 55 widens the `ground:` value enum (adding
   `process-exit`, `build-stamp`, `landed-commit`, `live-soak`, `frozen-rule`, …), widens the `kind:` enum
   if it wants anchor nodes, and adds provenance keys. Every 52-era record stays valid **verbatim**;
   `ground: exogenous` survives as a member of 55's taxonomy rather than a placeholder to be removed; and
   the components 52 reports as `exogenous-only` are precisely the ones 55's stronger anchors upgrade. No
   deletion, no rewrite, no superseding ADR required.

**Alternatives considered.**
- *Report SCCs with no ground notion at all* — **rejected on what the operator would learn.** A cycle in
  a loop graph is not a pathology: an outer loop that sets an inner loop's reference while the inner feeds
  data back is a **correct cascade** and a textbook SCC. Without ground, the check flags the system's
  healthiest structure and has no false-positive discipline — it would be discredited on its first run,
  which is the outcome the whole "not comparable" discipline (ADR-006) exists to avoid. PRD §Constraints:
  *"Groundedness precedes topology."*
- *Let 52 declare the full anchor taxonomy now* — **rejected:** it is 55's scope by name, and 52 cannot
  stamp the provenance that makes a measurement anchor defensible (no writer, ADR-001). A taxonomy
  declared without its integrity rules is the "checking paperwork instead of reality" failure the PRD
  measures at §Context failure 4.
- *Let a loop mark itself grounded (e.g. run-resilience "measures a real heartbeat")* — **rejected:** that
  is precisely a self-issued anchor claim. A loop asserting its own ground is the circular confirmation
  the check exists to detect.
- *A boolean `ground: true`* — **rejected:** it cannot carry a class, so decision 3 (never report
  "grounded" unqualified) would be unexpressible, and 55's widening would have to change the key's type —
  a breaking, not additive, seam.

**Consequences.** The day-one report is a genuine, verifiable, non-trivial answer rather than a rubber
stamp: everything reachable from `actor:operator` is `grounded-exogenous-only` (a warn, not a pass), and
everything else is ungrounded by name. 55 turns those warns into a first-class report by adding stronger
classes to the same field. Story 03 must resist the temptation to declare an operator edge to every loop
just to clear the check — a fabricated edge is the same failure as a fabricated owner (ADR-002), and the
prose body of `loops/operator.md` is where the evidence for each edge is cited.

**Invariant.** `ground:` is admitted only on `kind: actor` nodes and only with the value `exogenous`
(52's closed set); no `kind: loop` node carries `ground:`; the groundedness check emits no verdict that
omits its ground class. (Enforced by `acd-loop-vocabulary-closed`, `acd-loop-checks-pure`.)

---

## ADR-006: Cadence is a typed value on deliberately incomparable axes, and the timescale check reports `not-comparable` rather than inventing a comparison

**Status:** Accepted
**Date:** 2026-08-14

**Context.** RESEARCH's closing observation is the sharpest trap in the milestone. The measured cadences
sit on **four incommensurable axes**: wall-clock periodic (mesh assignment reclaim **15s**
`src/mesh-sync-cadence.mjs:25`; presence publish **5s** `src/mesh-presence-loop.mjs:27`; presence staleness
**90s** `src/mesh-presence.mjs:57`; run-heartbeat staleness **15 min** `src/commands/run-start.mjs:29`);
event-triggered per item; event-triggered per milestone; and **no bound at all** for two loops. A
"is the outer loop ≥N× slower than the inner" check presupposes a common unit that most of these loops do
not have. If the first run of the registry emits a timescale-inversion finding derived from an invented
conversion — "per-item ≈ minutes", "per-milestone ≈ days" — the whole registry is discredited on day one,
and the four real findings it *did* compute get thrown out with it.

**Decision.**

**1 — The cadence grammar is typed and closed:**

```
cadence := "periodic:" <n><unit>     unit ∈ { ms, s, m, h, d }   → resolvable to a duration: COMPARABLE
         | "event:" <trigger>        trigger ∈ { per-item, per-phase, per-milestone, per-run-start }
                                                                  → NOT comparable (closed token set)
         | "unknown"                                              → NOT comparable
```
`uncapped` is **not** a cadence value — it moved to `ceiling` (ADR-002), which is what keeps the rate axis
clean. An `event:` trigger outside the closed set is `loop-bad-value` (error); widening the trigger set is
a superseding-ADR change, not an authoring decision.

**2 — The check is defined over `target-setting` edges only.** `target-setting` *is* cascade control —
the outer loop sets the inner loop's setpoint (PRD §Sources: Powers' PCT; classical cascade control) — so
it is the only edge type on which "outer supervises inner" is meaningful.

**3 — Three outcomes, and only one of them is an inversion:**

| Both endpoints | Outcome |
|---|---|
| `periodic:` with resolvable durations, ratio **≥ 3** | no finding |
| `periodic:` with resolvable durations, ratio **< 3** | `loop-timescale-inversion` (warn) |
| **anything else** — either side `event:*` or `unknown` | `loop-timescale-not-comparable` (warn), naming **which** side is not on a clock |

**4 — The separation ratio is 3, and 58 owns the rule.** Classical control's minimum is 3–5×, 10× to
treat the inner loop as static (PRD §Sources). 52 freezes **3** because it must compute *something* and 3
is the weakest defensible threshold — it minimises false inversions. The *rule* (a minimum separation
ratio, timescale layers) is 58's, which may supersede the value without touching this grammar.

**5 — The load-bearing prohibition: the check never converts across axes.** No mapping from an `event:`
trigger to a duration exists anywhere in the implementation, and none may be added. `not-comparable` is a
first-class, reportable, *useful* answer — it names the loops whose supervision relation cannot yet be
checked, which is itself the finding 58 needs.

**Alternatives considered.**
- *Assign nominal durations to event triggers ("per-item ≈ minutes")* — **rejected**, and this is the
  decision the ADR exists for. The PRD table's own "minutes" / "minutes–hours" is an estimate contradicted
  by the code — RESEARCH found **no** cap, timeout or measured average for build-to-green or
  review→fix→re-review. Encoding an estimate as a comparable number would make a fabricated value the
  input to a finding, in the one milestone whose SPEC promises "a faithful description … not an
  aspiration".
- *Drop the timescale check until cadences are commensurable* — **rejected** by `SPEC §Scope`, which names
  it as one of the five. And "not comparable, here is why" is the honest form of the check, not its
  absence: it is the machinery reporting what it does not know, which is the same discipline as ADR-002's
  sentinels.
- *Make cadence free text and let the check parse heuristically* — **rejected:** a heuristic parser is an
  invented conversion with extra steps and no place to record that it guessed.
- *Compare across every edge type, not just `target-setting`* — **rejected:** a `data-feed` or
  `monitoring` edge is not a supervision relation, so a ratio over it means nothing; it would generate
  noise proportional to the graph's density.

**Consequences.** On the day-one registry **no two loops joined by a `target-setting` edge are both
`periodic:`**, so the first run reports **zero inversions and N incomparable pairs** — and that is the
correct, verifiable output, not a gap in the milestone. It is also a precise, actionable backlog for 58:
the incomparable list *is* the set of supervision relations aof cannot currently check. FF-5206 makes
"never invents a comparison" a structural guarantee rather than a promise, because the cadence-kind
cross-product is closed and finite and can be asserted exhaustively.

**Invariant.** The timescale check emits `loop-timescale-inversion` **only** when both endpoints of a
`target-setting` edge are `periodic:` with resolvable durations; every other combination of the closed
cadence kinds emits `loop-timescale-not-comparable`; no code path maps an `event:` trigger to a duration.
(Enforced by `acd-loop-timescale-comparability`.)

---

## ADR-007: The five checks are PURE functions over the parsed model, emit doctor's `{code, severity, path, message}` envelope with a frozen code set, and land ONLY in `work:loops validate` — `validateWork` and `work:doctor` are not edited

**Status:** Accepted
**Date:** 2026-08-14

**Context.** Three sub-decisions, each with a real fork.

*The envelope.* RESEARCH §Q5 found this repo carries **two unreconciled finding shapes**: `validateWork`'s
`{path, problem}` (`src/work.mjs:718-843`, pushed via `add()` at `:721`) and `work-doctor`'s
`{code, severity, path, message}` (`src/work-doctor.mjs:12-21`). The recall surfaced m15/ADR-001, which
chose the richer one for the health lane and gave the reason: a health finding needs a **severity** so
faces and gates can reason over it, and a stable **machine code** so it is addressable.

*The blast radius.* `src/work.mjs` has **240 dependents** (graph, 2026-08-14). `validateWork` does already
carry one pathless whole-stream structural finding — the `depends` cycle, reported at `workDir` with no
item path (`src/work.mjs:830-832`) — so the precedent for a graph-shaped finding in that envelope exists.
The question is whether it should move the decision.

*Purity.* RESEARCH §Q5 confirms there is **no SCC implementation** anywhere in this repo or its
dependencies — `findCycle` (`src/work.mjs:685-713`) is a DFS that returns **at most one** cycle and stops,
not a decomposition. So a real Tarjan/Kosaraju pass is new code, and where it lives determines whether the
checks can be built and tested independently of the loader.

**Decision.**

**1 — The envelope is doctor's, frozen:**
`Finding = { code: string, severity: "warn" | "error", path: string, message: string }` — `path` a **raw
absolute** in OS-native form (basis-neutral per 08/ADR-002; the face relativises), anchored at the node's
own file for a per-node finding and at the `<work.dir>/loops/` directory for a whole-graph finding (the
`src/work.mjs:830-832` precedent for a pathless graph finding, applied to this store). Three reasons, in
order: (a) `SPEC §Scope` says *findings, not enforcement*, which is doctor's lane by construction, not
validate's; (b) ADR-002 requires `warn` vs `error` to distinguish a declared gap from a schema violation —
`{path, problem}` cannot express it; (c) **53 composes these checks** (`53 SPEC §Scope`: the Loop-Ready
score "composes 52's structural checks when a loop graph is declared"), so a consumer must key on a
stable `code`, never a message string — and m37/R2 records exactly what happens in this repo when a
downstream contract pins a message verbatim.

**2 — The frozen finding-code set** (exported from the checks module; a code outside it is a bug, FF-5209):

```
schema lane   (error):  loop-record-unparseable · loop-missing-field · loop-bad-value ·
                        loop-expected-list · loop-unknown-key · loop-id-mismatch
honesty lane  (warn):   loop-owner-unknown · loop-cadence-unknown · loop-ceiling-uncapped ·
                        loop-field-prose-only
graph lane    (error):  loop-graph-dangling-endpoint
graph lane    (warn):   loop-graph-ungrounded-component · loop-graph-grounded-exogenous-only ·
                        loop-unpaired-optimizer · loop-unowned-reference ·
                        loop-shared-actuator-unarbitrated · loop-timescale-inversion ·
                        loop-timescale-not-comparable
```

**3 — The five checks, defined over the declared model** (each a pure `(model) => Finding[]`):

| # | Check | Definition over the model |
|---|---|---|
| 1 | **Ungrounded SCC** | Tarjan SCC over the union of all five edge types; a component is grounded iff a member is forward-reachable from a `ground:`-bearing node (ADR-005). Emits `ungrounded-component`, or `grounded-exogenous-only` with the ground class named. |
| 2 | **Unpaired optimizing loop** | a `kind: loop` node with `optimizing: true` and **no inbound `monitoring` edge** (computed by inverting the edge set). |
| 3 | **Unowned reference** | a `kind: loop` node with **no inbound `target-setting` edge**. Reads the EDGE, never the `owner` field (ADR-004 §4). |
| 4 | **Shared actuator, no arbiter** | two or more `kind: loop` nodes whose `actuator` lists share an identical entry, with **no single node declaring a `veto` edge to every member** of that set. (Arbitration *machinery* is 58's; this only makes its absence computable.) |
| 5 | **Timescale** | ADR-006, over `target-setting` edges, with `not-comparable` as a first-class outcome. |

**4 — Purity, and where the I/O lives.** The **loader** (`src/work-loops.mjs`) does the one directory read
and produces a plain-data model. The **checks** (`src/work-loops-checks.mjs`) are pure functions over that
model: no `node:fs`, no `node:child_process`, no clock, no dynamic import, no pointer resolution
(ADR-003). This mirrors the house idiom verbatim — `doctorWork` builds the snapshot once and runs pure
`(snapshot, ctx) => Finding[]` groups (`src/work-doctor.mjs:12-21`) — and it is what makes the checks
story buildable in parallel against literal fixture models (partition, below).

**5 — These findings land ONLY in `work:loops validate`.** `validateWork` (`src/work.mjs:718-843`) is not
extended; `work:doctor` (`src/work-doctor.mjs:508-533`) is not extended. The loop directory is invisible
to both by construction (`src/work.mjs:287`) and stays that way.

**6 — Exit code: `work:loops validate` exits 0 whenever it produced a report.** Findings are reported,
never enforced (`SPEC §Scope`). Severity travels in the JSON; the gate is 55's and 53's.

**Alternatives considered.**
- *Adopt `validateWork`'s `{path, problem}` for continuity with `aof work validate`* — **rejected** on
  m15/ADR-001's reasoning, which applies here unchanged: no severity means ADR-002's declared-gap warns
  and schema errors become indistinguishable, and no code means 53's Loop-Ready score must pattern-match
  English.
- *Fold the five findings into `aof work validate` as well* — **rejected.** It means editing the file with
  **240 dependents** for a milestone whose SPEC says these are findings, not enforcement; it drags the
  loop vocabulary into the god-node's validator (m37's price, at 6.8× the coupling m37 paid); and it makes
  a whole second directory vocabulary the god-node has to know about, which ADR-001 exists to prevent. The
  `src/work.mjs:830-832` precedent is real but it argues only that a *pathless* finding is expressible in
  that envelope — not that a second store belongs in that reader.
- *Fold them into `work:doctor`* — **rejected, and deliberately left for 53.** `53 SPEC §Scope` puts the
  Loop-Ready score on `aof work doctor`, composing 52's checks. Wiring doctor here would pre-empt 53's
  seam and force it to unpick one. When 53 opens it, it composes through `invoke("work:loops-validate", …)`
  (`src/command-core.mjs:412-418`) — never by importing the loop modules (m25/ADR-003's rule, honoured).
- *Reuse/extend `findCycle` in `work.mjs` for the SCC pass* — **rejected:** it returns at most one cycle
  and stops (`src/work.mjs:709-711`), so it is not a decomposition; extending it would edit the god-node
  and change a function 240 dependents' worth of code sits behind, to serve a graph it does not read.
- *Pull in a graph library* — **rejected:** `package.json` carries three runtime dependencies
  (`@inquirer/prompts`, `node-pty`, `ws`); Tarjan over a ≤50-node in-memory graph is ~30 lines and a new
  dependency for it would be the worst trade in the milestone.

**Consequences.** The checks module is testable with literal model objects and no filesystem, which is
what lets story 01 proceed in parallel with story 00 against the ADR-002/004/006 contracts. The frozen
code set is a consumed contract from the moment story 01 lands (53 and 55 both key on it). Nothing in this
milestone can fail a build: exit 0, warn-heavy, enforcement deferred by design.

**Invariant.** `src/work-loops-checks.mjs` imports no `node:fs`/`node:child_process`/`node:process`, reads
no clock, and exports only `(model) => Finding[]` functions returning frozen-set codes with
`severity ∈ {warn, error}` and raw-absolute paths; the same model yields byte-identical findings across
runs; neither `validateWork` nor `doctorWork` gains a loop check. (Enforced by `acd-loop-checks-pure`,
`acd-loop-finding-envelope`, `acd-loop-module-import-boundary`.)

---

## ADR-008: `work:loops` is ONE COMMAND PER VERB on the registry-derived route table, with three frozen `--json` contracts — no `cli.mjs` edit, and no `/aof:*` bundle wrapper in this milestone

**Status:** Accepted
**Date:** 2026-08-14

**Context.** RESEARCH §Q4 found both house patterns live: one-command-per-verb (`graph:build|query|triage|impact`
— four command objects, four files, four 2-word routes, four registry entries at
`src/command-core.mjs:298-391`) and one-command-many-flags (`mesh:assign` — a single object with
`--to`/`--withdraw` sub-dispatch). `SPEC §Scope`'s phrasing ("`show` / `graph` / `validate` **registered**
with stable `--json` contracts") leans per-verb but RESEARCH deliberately left it unsettled.

Two facts decide the mechanics. `deriveRouteTable` builds the CLI route table **from the registry**
(`src/spine/face.mjs:87-99`) and `resolveRoute` does longest-prefix matching (`:104-120`), with 4-word
routes already in service (`src/commands/notion-associate.mjs:212`) — so a new 3-word family needs **no
`cli.mjs` edit at all**. And the CLI bijection arch-test is **registry-derived, not hard-coded**
(`test/arch/acd-work-command-cli-bijection.test.mjs:1-40` — "no new door"), so new commands are covered
automatically with no test edit.

**Decision.** Three command objects, three files, three routes, registered into `COMMANDS`
(`src/command-core.mjs`):

```
src/commands/loops-show.mjs      id "work:loops-show"      route ["work","loops","show"]
src/commands/loops-graph.mjs     id "work:loops-graph"     route ["work","loops","graph"]
src/commands/loops-validate.mjs  id "work:loops-validate"  route ["work","loops","validate"]
```
(The `<namespace>:<hyphenated-verb>` id for a multi-word route is the house form — `work:delegation-model`
at `src/commands/orchestrator-delegation.mjs:249`, route `["work","delegation-model"]`.)

**The locked `--json` contracts (frozen 2026-08-14 — 53 composes these, so they are a consumed contract,
not a CLI render):**

```js
// Every result carries `source` = the RAW ABSOLUTE <work.dir>/loops directory (08/ADR-002
// basis-neutral; the face relativises). A missing directory is not an error: it is
// { source, present:false, nodes: [] } — a repo with no registry is a valid repo (53 SPEC).

work:loops-show      input { id?: string }
  → { source, present, nodes: Node[] }
    Node = { id, kind, title, fields: { <key>: Field }, edges: { <type>: Endpoint[] }, path }
    Field    = { key, raw, kind: "pointer"|"prose"|"unknown"|"uncapped"|"none"|"phrase",
                 pointer?: { scheme, operand, symbol? } }        // ADR-002 — `kind` ALWAYS present
    Endpoint = { raw, scheme, operand, resolved: boolean|null }  // null ⇒ extra-registry, NOT resolved
                                                                 // by 52 (ADR-003/ADR-004 §3)

work:loops-graph     input { format?: "mermaid" }                // "mermaid" is the only value in 52
  → { source, present, format, text, nodeCount, edgeCount }      // `text` deterministic — ADR-009

work:loops-validate  input { }
  → { source, present, findings: Finding[],
      summary: { error: n, warn: n,
                 checks: { <checkId>: { ran: true|false, findings: n } } } }
    Finding = { code, severity, path, message }                  // ADR-007

// `summary.checks` reports which checks RAN, so "ran and found nothing" is distinguishable from
// "did not run" — the PRD's "reporting absence explicitly" (§Scope, the audit loop), applied to
// this command's own output. 53's Loop-Ready score reads `summary`, never the render.
```

**No `/aof:*` bundle wrapper in this milestone** — a conscious departure from a standing operator memory
("a `work:*` command isn't done until its `/aof:*` bundle wrapper ships"), recorded in writing as the
rules require. The reasons: (a) the enforced parity gate is scoped **only** to `work:insert-*`
(`test/arch/acd-work-insert-command-bundle-parity.test.mjs:23-27`), and the closest kin —
`work:validate`, `work:doctor`, `work:list`, `work:next` — ship with no wrapper by deliberate choice;
(b) the *consumers* of the loop registry in this arc are 53's Loop-Ready score (via `invoke`, in code)
and the operator at a terminal — **no ACD phase prompt consults the loop graph in 52**, so a wrapper here
would be a door with nothing behind it; (c) PRD §Constraints' own discipline — *"Loops nobody consults,
edges nobody queries and metrics nobody acts on are removed at the next audit"* — applies to the command
surface too. The **trigger is named**, not vague: the milestone that first makes a phase consult the loop
graph (53's Loop-Ready gate, or 55's groundedness gate on L3) ships the wrapper with the caller that
justifies it.

**Alternatives considered.**
- *One `work:loops` command with `--show/--graph/--validate` flag dispatch (the `mesh:assign` shape)* —
  **rejected:** the three verbs have genuinely different inputs and outputs, so one command means one
  Ajv `input` schema that is the union of three and one `render` that switches on a flag — the
  "one command, several meanings" shape m42's route-table work moved away from. Three commands also cost
  nothing: registration is additive and route derivation is automatic.
- *A `loops:` top-level namespace (`aof loops show`)* — **rejected** by PRD §Constraints, which places
  this arc under `work:loops` precisely because `graph:*` is taken by graphify and *"any surface showing
  both must say which it shows"*. Nesting under `work` keeps the two graphs visibly distinct.
- *Add a `cli.mjs` ladder branch for the family* — **rejected:** unnecessary (the route table is
  registry-derived, `src/spine/face.mjs:87-99`) and it would drag a second file into the milestone's edit
  set for no gain. FF-5207 asserts the branch is absent.
- *Ship the bundle wrapper anyway, to honour the memory literally* — **considered seriously and
  rejected** on (b) above: an `/aof:loops` wrapper with no phase that calls it is exactly the dead surface
  the same PRD tells this arc to prune, and the memory's own enforcement (the parity gate) does not reach
  here. The departure is recorded with its discharge trigger rather than left implicit.

**Consequences.** No story edits `src/cli.mjs`. Exactly one story edits exactly one pre-existing source
file — `src/command-core.mjs`, three imports and three array entries, whose 100 dependents are unaffected
because nothing reads that array structurally except the registry-derived arch-tests. The three `--json`
shapes are frozen the moment story 02 lands; 53 and 55 consume them without renegotiation.

**Invariant.** The three commands are registered in `COMMANDS`, each carries `cli.route` of the exact
triple `["work","loops",<verb>]` plus `argv`/`render`/`json`, each is reachable through
`deriveRouteTable`/`resolveRoute` with **no `src/cli.mjs` branch**, and each emits exactly one parseable
`--json` envelope. (Enforced by `acd-loop-command-route-only` plus the existing registry-derived
`acd-work-command-cli-bijection`.)

---

## ADR-009: The rendering is a deterministic Mermaid text artifact emitted by `work:loops graph` — this milestone adds NO web/UI surface

**Status:** Accepted
**Date:** 2026-08-14

**Context.** `SPEC §Scope` asks for "**one readable rendering** of the graph an operator can look at and
recognise" — one line, no face named. PRD §Constraints supplies the acceptance test for the format:
*"If a loop, its watcher, its reference-owner and its auditor cannot be reviewed in a PR, they are not
governed."* The rendering's job is therefore to be legible **in a PR diff and in a terminal, with no tool
installed**. The house also prices new faces: the UI surface carries explicit budget arch-tests
(`test/arch/acd-ui-directory-budget.test.mjs`, `test/arch/acd-ui-surface-file-budget.test.mjs`), and
m25/ADR-003 (recall hit) rules that a new surface is its own thin face reaching data only through a
registered command — a rule best honoured here by not adding one.

**Decision.** `work:loops graph` emits **Mermaid** `flowchart` text — deterministic, node-sorted, plain.
No `ui/` file, no board face, no HTTP route, no new server. Determinism is part of the contract, not an
implementation detail: nodes emitted in lexicographic `id` order, edges sorted by
(source, edge-type, target), edge type as the link label, node shape by `kind`, so the same model always
produces byte-identical text and the artifact can be committed and diffed. The `--json` form of the same
command carries the model, for any consumer that wants to render differently.

**Alternatives considered.**
- *Graphviz DOT* — **rejected:** it needs a tool to become a picture, so it fails the PR-legibility test
  that PRD §Constraints sets. GitHub renders Mermaid inline; it does not render DOT.
- *ASCII/box art* — **rejected:** a layout engine for a ~9-node, 5-edge-type graph is real work with no
  deterministic canonical form, and it degrades fast as the graph grows through 55/57/58.
- *A board face or a `work ui` panel* — **rejected**, and recorded here so it is not re-litigated:
  `SPEC §Scope` asks for a rendering, not a face; the UI surface budget is guarded; and 25/ADR-003 says a
  face must reach data through a registered command — which is exactly what a later face would do, over
  the `--json` contract ADR-008 froze. **A future milestone can add a face additively with no change
  here.**
- *Both Mermaid and DOT behind `--format`* — **rejected for this milestone:** two renderers, two
  determinism guarantees, one consumer. The `format` input exists in the contract (ADR-008) so a second
  format is additive when something asks for it.

**Consequences.** No story in this milestone touches `ui/`, so the UI budget arch-tests are untouched and
the milestone's edit surface stays inside `src/` + `test/arch/` + `wiki/work/loops/`. The rendering is
committable — a `loops.mmd` in a PR is a reviewable artifact — which is the PRD's governance test met
literally.

**Invariant.** `work:loops graph` produces byte-identical output for the same model across runs and across
process invocations; no file under `ui/` references the loop registry, its modules or its command ids.
(Enforced by `acd-loop-render-deterministic`, `acd-loop-module-import-boundary`.)

---

## ADR-010: The day-one registry is SEVEN loops and TWO actors — mesh assignment reclaim is declared; observe→tune is NOT, because its actuator does not exist

**Status:** Accepted
**Date:** 2026-08-14

**Context.** `SPEC §Objective` promises "a faithful description of the loops aof runs **today** — not an
aspiration". RESEARCH tested the PRD's table of seven against the code and found two corrections.

*An addition.* **mesh assignment reclaim** (`src/mesh-assignment-reclaim.mjs`) is a real control loop the
PRD table missed, and it is the only loop besides run-resilience with every field machine-readable:
controlled variable = non-terminal assignment state; reference/measurement = a **dual** staleness gate
that must agree — `isNodeStale` (90s, `src/mesh-presence.mjs:57`) **and** `isStale` (15 min,
`src/mesh-assignment-reclaim.mjs:83`), imported and shared, never re-derived
(`src/mesh-assignment-reclaim.mjs:17-19`); actuator = `transitionAssignmentState` → `reclaimed` +
`transitionRunReclaimed` (`:32-37`); cadence = a genuine **15s wall-clock tick**
(`src/mesh-sync-cadence.mjs:25`, wired control-role-only at `src/mesh-launcher.mjs:1513-1533`).

*A subtraction.* **observe→tune** splits cleanly: `observe` exists (`src/work-observe.mjs`, `aof work
observe`, `src/commands/observe.mjs:23-107`); **`tune` does not** — no `work-tune.mjs`, no `aof work tune`
anywhere in `src/`, and it is milestone **62** territory. RESEARCH's own consistency test settles it:
`src/degrade.mjs` was ruled **not a loop** because it is "a measurement stream with no actuator", and
`src/work-doctor.mjs` was ruled not a loop because "it has no actuator". Observe is in exactly that class.

**Decision.** The day-one registry declares **nine nodes: seven `kind: loop` and two `kind: actor`.**

| # | Node | Note |
|---|---|---|
| 1 | `loop:build-to-green` | `ceiling: uncapped`, `owner: unknown`, measurement `prose:` |
| 2 | `loop:review-fix-rereview` | `ceiling: uncapped`, `owner: unknown`, measurement `prose:` |
| 3 | `loop:verify-triage-accept` | `owner: actor:product-owner` (`src/bundle/commands/verify.md:92`), `ceiling: none` |
| 4 | `loop:autonomous-cascade` | reference/measurement `command:work:next`; `ceiling: [config:work.autonomous.maxAttempts]` |
| 5 | `loop:run-resilience` | every field a pointer (RESEARCH §Q1.5); `owner: unknown` |
| 6 | `loop:retrospective-memory-ingest` | `cadence: event:per-milestone`; `ceiling: none` |
| 7 | `loop:mesh-assignment-reclaim` | `cadence: periodic:15s` — the only periodic loop on day one |
| 8 | `actor:operator` | `ground: exogenous` — the arc's single ground node (ADR-005) |
| 9 | `actor:product-owner` | an agent role: **no `ground:` key**, deliberately (ADR-005 §1) |

**observe→tune is not declared.** Half of it does not exist and the half that does has no actuator;
declaring it would require either inventing an actuator or admitting `actuator: unknown` — which ADR-002
forbids on a loop node precisely so that this rule has teeth. `degrade.mjs` and `work-observe.mjs` are
likewise **not** declared as nodes: they are unattached measurement streams (PRD §Assets: *"Neither is
attached to a declared loop"*), and declaring them with nothing to feed would manufacture the dead weight
PRD §Constraints tells the audit loop to prune. **62** declares observe→tune when `tune` exists; **59**
declares the instrument nodes when there is an auditor to attach them to.

The absence is itself the honest finding: the day-one graph's answer to "what tunes aof's harness?" is
**nothing** — visible as the total absence of a `parameter-tuning` edge anywhere in the registry, which is
a fact an operator can read off the rendering in one second.

**Alternatives considered.**
- *Declare observe→tune with `actuator: unknown`* — **rejected:** `unknown` means "no evidence was found"
  (ADR-002); here there is **positive evidence the actuator does not exist**, which is a different state
  and would be the first lie in the registry. Adding a fourth sentinel for it — "declared-absent" —
  was considered and rejected as a vocabulary invented to accommodate a single aspirational entry.
- *Declare observe alone as a loop* — **rejected on RESEARCH's own consistency test:** it would contradict
  the ruling that `degrade.mjs` and `work-doctor.mjs` are not loops, for the identical reason.
- *Declare `work-observe`/`degrade` as instrument nodes* — **rejected for 52:** a third `kind:` with no
  consumer, and nodes with no edges, is the "metrics nobody acts on" the PRD prunes. 59 has the consumer.
- *Omit mesh-assignment-reclaim as "mesh, not ACD"* — **rejected:** it runs today, on a real clock, with a
  real actuator; the SPEC's rule is "the loops aof runs today", not "the loops the PRD table listed". It
  is also the **only** periodic loop available to the timescale check, which makes it load-bearing for
  ADR-006's day-one output rather than a curiosity.

**Consequences.** Story 03's records are evidence documents: every field carries its RESEARCH/`path:line`
citation in the prose body, and the six `owner: unknown` declarations are the milestone's most valuable
output — an addressable, PR-reviewed list of what aof does not know about its own machinery, which is 58's
inbox. The rule "every declared loop is a loop that actually runs today" is enforced structurally, not by
convention: FF-5204 asserts no `kind: loop` node declares `unknown` for `controlled`/`reference`/
`measurement`/`actuator`, so an aspirational loop cannot be declared without an author writing a
falsifiable pointer or `prose:` path that a reviewer can open.

**Invariant.** Every `kind: loop` record in `<work.dir>/loops/` declares `controlled`, `reference`,
`measurement` and `actuator` as pointers or `prose:` (never `unknown`); no node declares `kind` outside
{`loop`,`actor`}. (Enforced by `acd-loop-records-parse`, `acd-loop-vocabulary-closed`.)

---

## ADR-011: Contract closure — the frozen blocks completed against 25 authored features, the code set split by emitter, and the independence rules made explicit in the checks

**Status:** Accepted
**Date:** 2026-08-14
**Clarifies and supersedes in part:** ADR-002 (`Field` shape, admitted-key scoping, empty lists, `ceiling: unknown`),
ADR-004 (endpoint shape, dangling-endpoint owner), ADR-006 (ratio orientation, check domain),
ADR-007 (finding `path` ternary, code-set home, independence rules), ADR-008 (`--json` gaps, the
bijection-test claim), ADR-009 (Mermaid glyphs), ADR-010 (citation sites). ADRs 001–010 stand as
written; where this ADR rules differently, **this ADR governs.**

**Context.** The Three Amigos ran over all five stories — 25 task `.feature` files, ~370 scenarios,
~440 example rows — and the QA lane returned a consolidated set of gaps against the contracts frozen in
ADR-002/004/006/007/008/009/010. Three classes, and they are genuinely different in kind:

1. **One verified factual error.** ADR-008 §Context, §Consequences and FF-5207 all assert the new
   commands are covered by the existing CLI bijection test "with **no test edit**". Measured, that is
   false for one of the test's three legs: `test/arch/acd-work-command-cli-bijection.test.mjs` derives
   its subcommand list from `listCommands().filter(id.startsWith("work:"))` (`:35-44`) and then calls
   `argsFor(sub)` per subcommand, whose `switch` ends `default: throw new Error(\`unmapped subcommand
   ${sub}\`)` at **`:249`** — a throw the file's own comment at `:197-199` records as **deliberate**
   (19/R1: an unmapped sub must fail loudly, not be skipped). Registering three `work:loops-*` ids
   therefore *breaks a pre-existing green test* the moment story 02 lands. The adapter leg and the
   route-reachability leg genuinely are free; the spawn-and-parse leg is not.
2. **Under-specification a developer would otherwise guess at.** `Field.kind` has no member for
   `cadence: periodic:15s`, `owner: actor:product-owner` or `optimizing: true`; `fields: {<key>: Field}`
   is singular while four keys are lists whose entries can differ in kind; an empty inline list
   (`reference: []`) is vacuously valid; `ceiling: unknown` is silent while `owner: unknown` warns; the
   `<checkId>` keys **53 will read** are named nowhere; the model handed to the checks is never specified
   at all. Each of these is a place two stories would ship incompatible readings and only integration
   would find out.
3. **Independence holes the ADRs closed in one place and left open in another.** ADR-005 §1 refuses to
   let a node ground itself, and PRD §Constraints states the general rule — *"A watcher may not be the
   thing it watches. Independence is structural."* Read literally, ADR-007 check 2 lets a loop satisfy
   its pairing requirement with a `monitoring` edge to **itself**, and check 4 lets a contending loop be
   its **own** arbiter. Those are the same hole, twice, in the two checks whose entire purpose is to
   detect it.

One further measured fact reshapes the frozen code set: **10 of the 18 codes are emitted by the loader,
not the checks**, but FF-5209 pinned the set to `src/work-loops-checks.mjs` — a file owned by a different
story that the partition claims shares "zero imports" with the loader's.

**Decision.**

### 1 — The finding-code set is LANE-SCOPED: each emitting module owns its own codes, the sets are disjoint, and the union is asserted in CI (closes A2, B8)

There is no shared code module and **no source-side import between `src/work-loops.mjs` and
`src/work-loops-checks.mjs` in either direction.** Each module exports its own lane's codes as a frozen
literal array; every code has exactly one home, so this is single-sourcing (m37/R1), not duplication.
The "frozen set" is the **union**, composed nowhere in `src/` and asserted by FF-5209, which imports both
and additionally asserts the two sets are **disjoint**.

This is only sound because of the rule in §7 below: **the loader normalises, the checks never parse a
string.** A pre-typed model means the checks need nothing from the loader at run time — not the cadence
grammar, not the pointer schemes, not the vocabulary. The purity invariant (FF-5205) therefore holds
without even a transitive edge to a module that imports `node:fs`.

`loop-graph-dangling-endpoint` moves to the **loader** lane, name unchanged. It is reference-integrity,
not graph topology: `Endpoint.resolved` is a loader-computed field (ADR-004 §3), the loader is the only
thing that sees the whole directory, and the checks receive a model whose intra-registry endpoints are
already marked. The loader is therefore **two-pass**: parse every record, then resolve `loop:`/`actor:`
endpoints against the parsed set.

**The frozen code set (24 codes, superseding ADR-007 §2):**

```
LOADER  src/work-loops.mjs  (16)
  schema, severity error (10):
    loop-record-unparseable · loop-missing-field · loop-bad-value · loop-expected-list ·
    loop-expected-scalar · loop-empty-list · loop-unknown-key · loop-key-not-admitted-for-kind ·
    loop-malformed-frontmatter-line · loop-id-mismatch
  reference integrity, severity error (1):
    loop-graph-dangling-endpoint
  honesty lane, severity warn (5):
    loop-owner-unknown · loop-cadence-unknown · loop-ceiling-unknown · loop-ceiling-uncapped ·
    loop-field-prose-only

CHECKS  src/work-loops-checks.mjs  (8), all severity warn:
    loop-graph-ungrounded-component · loop-graph-grounded-exogenous-only · loop-unpaired-optimizer ·
    loop-unowned-reference · loop-self-referential-edge · loop-shared-actuator-unarbitrated ·
    loop-timescale-inversion · loop-timescale-not-comparable
```

Six codes are **new** here: `loop-expected-scalar` (B6), `loop-empty-list` (B5),
`loop-key-not-admitted-for-kind` (B3), `loop-malformed-frontmatter-line` (B4), `loop-ceiling-unknown`
(B7), `loop-self-referential-edge` (C5).

### 2 — `Field` gains five typed kinds, and the `fields` map is key-shaped, not data-shaped (closes B1, B2)

```js
// SUPERSEDES ADR-002's Field block and ADR-008's `fields: { <key>: Field }`.
Field = { key, raw, kind, ... }        // `kind` is ALWAYS present — ADR-002's keystone, unchanged
  kind: "pointer"  → pointer: { scheme, operand, symbol? }      // module: | command: | config:
      | "prose"    → path                                        // prose:<repo-relative path>
      | "phrase"   → (raw only)                                  // `controlled` / `title` only
      | "unknown" | "uncapped" | "none"                          // the declared-gap sentinels
      | "periodic" → ms: <number>                                // cadence, NORMALISED by the loader
      | "event"    → trigger: <one of the four frozen tokens>    // cadence
      | "ref"      → { scheme: "actor", operand }                // `owner`
      | "flag"     → value: <boolean>                            // `optimizing`
      | "enum"     → value: <string>                             // `ground`

// The SHAPE of fields[key] is fixed BY THE KEY, from the frozen schema — never by the data.
//   Field[]  : reference · measurement · actuator · ceiling        (ALWAYS an array, even for a
//              sentinel — `ceiling: uncapped` models as [{kind:"uncapped"}], so consumers get
//              exactly one shape and never branch on Array.isArray)
//   Field    : controlled · cadence · owner · optimizing · ground
//   NOT in `fields` at all: id · kind · title — these are Node-level scalars (see §6).
```

### 3 — The admitted key set is KIND-SCOPED (closes B3)

Confirmed as QA recommended. The admitted set is per-`kind`, not global:

| `kind` | admits |
|---|---|
| `loop` | `id` `kind` `title` `controlled` `reference` `measurement` `actuator` `cadence` `ceiling` `owner` `optimizing` + the five edge keys. **Not `ground`.** |
| `actor` | `id` `kind` `title` `ground` + the five edge keys. **Not** the seven control fields. |

A key outside the global union → `loop-unknown-key`. A key inside the global union but not admitted for
this node's `kind` → **`loop-key-not-admitted-for-kind`** (error). This gives FF-5203's `ground:`-on-a-loop
fixture a reachable code, and settles the symmetric `controlled:`-on-an-actor case with the same rule.

### 4 — A frontmatter line the parser silently drops is a finding (closes B4)

Measured against the real parser: `veto/constraint: [loop:x]` yields `{}` — no key, no edge, **no
finding** — because `parseFrontmatter`'s key pattern is `[A-Za-z0-9_-]+` (`src/work.mjs:348-358`). Since
`veto/constraint` is **the SPEC's own phrasing**, it is the single likeliest authoring error in the
milestone, and silence would contradict ADR-002's "a key outside this schema ∪ the five edge keys is a
finding, never ignored" in exactly the case that matters.

The loader holds the raw text, so it **re-scans the frontmatter block**: any line that is not blank, not
a `#` comment, and did not produce a key in `parseFrontmatter`'s output emits
**`loop-malformed-frontmatter-line`** (error), quoting the line. The loader does not extend or replace
the parser — it reports what the parser dropped. No change reaches `src/work.mjs`.

### 5 — An empty list is a schema error (closes B5)

`reference: []` / `measurement: []` / `actuator: []` / `ceiling: []` → **`loop-empty-list`** (error).
Without this, FF-5204's "no declared loop is aspirational" is trivially defeated by writing empty
machinery lists — the precise hole it exists to close. An **edge** key with an empty list is the same
error (`monitoring: []` is not "no edges", it is a half-written line; ADR-004's "an absent key means no
edges of that type" already covers the honest way to say nothing). And `controlled: [a, b]` — a list
where a scalar is required — emits **`loop-expected-scalar`** (B6), the mirror of `loop-expected-list`.

### 6 — `ceiling: unknown` warns like its siblings (closes B7 — QA's frozen reading is OVERRULED)

ADR-002 admits `unknown` on exactly three fields; two of them warn and one is silent. That asymmetry is
an accident, not a decision: the honesty lane's whole purpose is that **every declared gap is visible**,
and 53 reading `summary` would otherwise be unable to distinguish a loop whose ceiling is unknown from
one that provably has none (`none`) — which is the exact `unknown`-vs-`uncapped` collapse ADR-002
§Alternatives rejects. Add **`loop-ceiling-unknown`** (warn). This is a contract delta (below).

### 7 — The model handed to the checks is frozen, and the loader NORMALISES so the checks never parse (closes B10, C3)

```js
// The one artifact 52/00 produces and 52/01 consumes. Plain serialisable data — no Map, no class
// (08/ADR-002: "plain serialisable data only"). EVERY path is a RAW ABSOLUTE in OS-native form.
Model = {
  source:   <raw absolute <work.dir>/loops directory>,
  present:  boolean,                       // the DIRECTORY exists (D1)
  nodes:    Node[],                        // sorted by id, deterministically
  findings: Finding[],                     // the LOADER's own lane (schema · integrity · honesty)
}
Node = { id, kind, title, path, fields, edges }
  path:  <raw absolute path of THIS node's .md file>   (D5 — same rule as `source`; the FACE relativises)
  edges: { <declared edge key>: Endpoint[] }           (D3 — ONLY declared keys appear)
Endpoint = { raw, scheme, operand, symbol?, resolved }  (D4 — `symbol` split exactly as Field.pointer;
             `resolved` is true|false for loop:/actor:, and NULL for every extra-registry scheme)
```

**The loader normalises; the checks never parse a string.** `periodic:15s` reaches the checks as
`{kind:"periodic", ms:15000}`; `event:per-item` as `{kind:"event", trigger:"per-item"}`. This is what
makes §1's no-cross-import possible and what makes FF-5205's purity claim real rather than nominal.

**The `Finding.path` rule is TERNARY**, superseding ADR-007 §1's binary:

| Finding scope | `path` |
|---|---|
| per-node | that node's `Node.path` |
| whole-graph (SCC, arbitration sets) | `Model.source` — the `loops/` directory |
| **per-edge** (timescale, self-referential) | **the DECLARING (source) node's `Node.path`** |

QA asserted *no* `path` for edge findings; that is **overruled** — `Finding.path` is a required string in
the frozen envelope and FF-5209 asserts it is absolute. ADR-004's single-writer rule makes the answer
unambiguous: an edge is declared in exactly one file, and that is the file a reader must open to fix it.

### 8 — Timescale: directed ratio, loop-to-loop domain (closes C1, C2 — both confirmed as QA wrote them)

**C1 — orientation is DIRECTED, confirmed.** `ratio = period(source of the target-setting edge) ÷
period(endpoint)`. The outer loop must be **slower**, so `ratio ≥ 3` is clean and `ratio < 3` is
`loop-timescale-inversion` — including the case QA identified, a target-setter 60× *faster* than the loop
it supervises (ratio 1/60 < 3 → inversion). A `max/min` reading would call that clean under a code named
"inversion", which is the reading this ruling exists to forbid.

**C2 — the domain is loop-to-loop, confirmed.** The check applies to a `target-setting` edge only when
**both endpoints are `kind: loop` nodes present in the registry**. An `actor:` source, an extra-registry
endpoint, or a dangling endpoint is **out of domain and emits nothing at all** — not `not-comparable`.
Three reasons: (a) an actor has no `cadence` *by schema* (ADR-002 requires it on loops only), so
`not-comparable` would be a statement about a field that cannot exist rather than one that is missing;
(b) the day-one cost of the other reading is one finding per **ground edge**, i.e. noise proportional to
exactly the edges ADR-005 wants authored — burying the real incomparable pairs under the graph's most
valuable structure, which is the failure mode ADR-006 §5 exists to prevent; (c) a dangling endpoint is
already reported once by `loop-graph-dangling-endpoint`, and a second finding for one defect is dedup
noise. `not-comparable` keeps its precise meaning: **two declared loops whose supervision relation cannot
yet be checked** — which is 58's backlog, and useless if diluted.

### 9 — Independence: a node may not satisfy an independence requirement with itself (closes C4, C5, C6)

**C4 — reachability is REFLEXIVE, confirmed as QA wrote it.** A ground node is reachable from itself, so
its own component is grounded and reports `loop-graph-grounded-exogenous-only`. The alternative reports
`actor:operator` — the one node that *is* the ground — as ungrounded on day one, which is a visibly wrong
verdict that would discredit the check on its first run. The reading is recorded here so
"`actor:operator`'s component is grounded-exogenous-only" is not later mistaken for a bug.

**C5 — a self-edge does NOT satisfy pairing or ownership, and is itself a finding.** QA wrote the ADRs'
literal reading and flagged it; that reading is **overruled**. PRD §Constraints: *"A watcher may not be
the thing it watches. Independence is structural."* ADR-005 §1 already refuses to let a node ground
itself; the same rule must hold for the two checks whose purpose is detecting self-confirmation.
Therefore: **check 2 (pairing) and check 3 (reference ownership) ignore self-edges** when computing
inbound `monitoring` / `target-setting`; and a `monitoring` or `target-setting` edge from a node to
itself emits **`loop-self-referential-edge`** (warn), naming the type — so the hole is *visible*, not
silently discarded. (`data-feed`, `veto` and `parameter-tuning` self-edges are legitimate — a loop may
feed itself, stop itself, or tune its own knobs — and are not findings.)

**C6 — a contending loop may NOT be its own arbiter.** QA left this unasserted rather than guessing;
the ruling is the same principle: a set is arbitrated iff some node **that is not a member of the
contending set** declares a `veto` edge to **every** member. PRD §Sources (Ahmad): *"no node should
propose, approve and validate its own consequential action."*

### 10 — Shared actuators: exact match stands, and record authoring names the narrowest actuator (closes C7)

Check 4 stays **exact-match and scheme-agnostic** — confirmed. If `loop:build-to-green` and
`loop:review-fix-rereview` both declare the same actuator, the finding is **true signal, not noise**:
RESEARCH shows both actuate through `aof-developer` (`src/bundle/commands/continue.md:56-57`, `:66`) and
there is no arbiter, which is PRD §Context failure 3 (conflict) made computable and 58's inbox.

The noise risk is *coarse citation*, not the check. So a **record-authoring rule** closes it: **an
actuator entry names the narrowest artifact that actually acts** — the agent definition or the defining
symbol — **never the phase prompt that merely orchestrates it.** Two loops colliding on
`prose:src/bundle/agents/aof-developer.md` is a real shared lever; two colliding on
`prose:src/bundle/commands/continue.md` would be an artifact of lazy citation.

### 11 — The `--json` boundaries ADR-008 left open (closes D1, D2, D3, D4, D5, D6)

**D1 — confirmed as QA wrote it.** `present` means *the directory exists*. Missing → `{present:false,
nodes:[]}`. Empty → `{present:true, nodes:[]}`. Two different facts, two different answers.

**D2 — confirmed as QA wrote it.** With no registry, `summary.checks` is **present in full**, every check
`{ran:false, findings:0}`. Omitting the map would make "no registry" indistinguishable from "checks ran
clean" — the contract's own "report absence explicitly" rationale, applied to itself.

**D3 — confirmed as QA wrote it.** `Node.edges` carries **only declared keys**; no zero-filling. ADR-004:
an absent key is a fact, not a gap.

**D4 — `Endpoint` gains `symbol?`**, split by exactly the rule `Field.pointer` uses: for
`module:<path>#<sym>`, `operand` is the path and `symbol` is `sym`. One splitting rule, both shapes.

**D5 — `Node.path` is a raw absolute** in OS-native form, like `source` and `Finding.path`. **Every path
in every 52 result is basis-neutral; the face relativises. No exceptions** (08/ADR-002).

**D6 — the Mermaid glyphs are frozen** (a strengthening of QA's difference-and-consistency assertion,
which still passes):

```
flowchart LR
  <key>["<id> · <title>"]        kind: loop            — rectangle
  <key>(["<id> · <title>"])      kind: actor           — stadium
  <key>[/"<raw>"/]               extra-registry or dangling endpoint — parallelogram
  A -->|<edge-type>| B           edge, labelled with the frontmatter key verbatim
  <key> = the node id with ":" replaced by "__"        (Mermaid ids cannot carry ":")
```
Emission order is the ADR-009 determinism rule unchanged: nodes by `id` lexicographically, then edges by
(source, edge-type, target).

### 12 — `summary.checks` has a frozen check-id vocabulary (closes B9)

53's Loop-Ready score reads this map, so the keys are a consumed contract and are frozen here:

```
grounding · pairing · reference-ownership · actuator-arbitration · timescale
```
Exactly five, in that order, one per SPEC check, present in every `work:loops-validate` result including
the absent-registry case (D2). The loader's own lanes are **not** entries in this map — they always run
when a registry is present; `summary.error`/`summary.warn` count every finding from every lane.

### 13 — ADR-010's citations corrected, and one pointer it implied cannot exist (closes F1, F2, F3)

**F1 — the rule, and the correction.** A `module:` pointer names the module that **DEFINES** the symbol
(its `export function`/`export const` site) — never one that imports, re-exports or merely calls it. QA's
general scenario is **ratified**; ADR-010's parentheticals pointed at import sites in four places and are
corrected here (measured 2026-08-14):

| Symbol | ADR-010 said | **Defining site** |
|---|---|---|
| `isNodeStale` | `src/mesh-presence.mjs:57` (that is `DEFAULT_PRESENCE_STALENESS_SECONDS`) | `src/mesh-presence.mjs:453` |
| `isStale` | `src/mesh-assignment-reclaim.mjs:83` (an import + threshold) | `src/run-store.mjs:667` |
| `transitionAssignmentState` | `src/mesh-assignment-reclaim.mjs:32-37` (import lines) | `src/effects/assignment-transitions.mjs:143` |
| `transitionRunReclaimed` | `src/mesh-assignment-reclaim.mjs:32-37` (import lines) | `src/effects/run-transitions.mjs:137` |

**F2 — `command:work:memory-ingest` does not exist and must not be authored.** Measured: there is no
`work:memory*` id in the registry; `src/cli.mjs:8` imports `workMemoryCommand` directly and dispatches it
through the legacy ladder. So `loop:retrospective-memory-ingest`'s ingest actuator is a `module:` pointer
at the defining symbol in `src/work-memory.mjs`, or `prose:` — never a `command:` pointer. The general
rule, which kills the whole class: **a `command:` pointer names a REGISTERED command id (one present in
`COMMANDS`); a CLI surface served only by a legacy `cli.mjs` ladder branch is not a `command:` pointer.**

**F3 — taken, explicitly.** `dualStalenessDecision` (`src/mesh-assignment-reclaim.mjs:96` — the exported
predicate that ANDs both clocks) is the correct reference/measurement pointer for
`loop:mesh-assignment-reclaim`'s dual gate. It is more precise than naming the two halves separately and
RESEARCH never surfaced it. 52/03 declares it alongside `isNodeStale` and `isStale`.

**A cheap partial guarantee that costs no purity.** FF-5204 gains a **test-side** resolution pass: every
`command:` pointer in every record must be a registered id, and every `module:` pointer's file must exist
and export the named symbol. This does **not** contradict ADR-003 — that ADR constrains what the
*command* does at run time (so the checks stay pure and 55 keeps the provenance-bearing resolver);
CI asserting a static fact about hand-authored records is a different act, and it eliminates the F1/F2
class at the diff rather than at 55.

**Alternatives considered.**
- *A shared `src/work-loops-codes.mjs` imported by both modules* (for A2) — **rejected:** it adds a third
  module and a real inter-story file dependency to solve a problem lane-scoping solves for free. Each
  code already has exactly one emitter; giving it one home in its emitter *is* single-sourcing.
- *Put the code set in the checks module and have the loader import it* — **rejected:** it inverts the
  dependency (the model's producer importing its consumer) and gives 52/00 a hard sequencing dependency
  on 52/01 for a list of strings.
- *Ratify `ceiling: unknown` as silent* (B7, QA's frozen reading) — **rejected**, as argued in §6: it
  reintroduces the `unknown`/`uncapped`/`none` collapse ADR-002 was written to prevent, in the one field
  that carries all three.
- *Fire `not-comparable` on actor→loop edges* (C2's other reading) — **rejected** on the measured day-one
  cost: it produces one finding per ground edge and dilutes the one output 58 needs.
- *Leave self-edges satisfying pairing, as ADR-007 reads literally* (C5) — **rejected:** it is the
  self-confirmation hole this arc exists to close, sitting inside the check built to detect it.
- *Add a `format: "dot"` alongside Mermaid, or leave the glyphs unfrozen* (D6) — **rejected:** unfrozen
  glyphs make FF-5208's determinism assertion vacuous on the part a human actually reads.
- *Widen `parseFrontmatter` to accept `/` in keys* (B4) — **rejected outright:** it edits the 240-dependent
  god-node's shared parser to accommodate one likely typo. Reporting what the parser dropped costs one
  re-scan in the loader and touches nothing.
- *Resolve `module:`/`command:` pointers inside the command* (F1/F2) — **rejected**, as ADR-003 rules.
  The guarantee lands in CI instead, where it needs no provenance model.

**Consequences.** Six new finding codes (24 total), five new `Field` kinds, one new admitted-key error
class, and a frozen five-id check vocabulary — all additive to the ADR-002/007 contracts and all
consumed by 53 (`summary.checks`) and 55 (the honesty and grounding lanes). Story 52/02 gains one
pre-existing test file in its edit set (A1), which changes the partition's headline property; both the
FF table and the partition are corrected in place below. The independence rulings (§9) mean the day-one
registry cannot satisfy pairing, ownership or arbitration by self-reference — an author who tries gets a
finding, which is the point.

**Invariant.** The loader and the checks export disjoint frozen code arrays whose union is exactly the
24 codes above, and neither module imports the other; `fields[key]`'s array-ness is determined by the
frozen schema, never by the data; the admitted key set is kind-scoped; no check emits a finding whose
`path` is absent or relative; `loop-timescale-inversion` is emitted only for a loop→loop
`target-setting` edge with both periods resolvable; and no self-edge satisfies check 2 or check 3.
(Enforced by `acd-loop-finding-envelope`, `acd-loop-vocabulary-closed`, `acd-loop-checks-pure`,
`acd-loop-timescale-comparability`.)

### Contract deltas for the authored features

Each row is a ruling that changes what an authored scenario asserts. Feature filenames are not named
below because this pass did not open them (per the write scope); each is keyed by story + subject so it
can be routed. **"Confirmed"** items from A–F are *not* listed here — only changes.

| Story · subject | What must change |
|---|---|
| 52/00 · `ceiling: unknown` | QA froze "admitted, kind `unknown`, **no finding**". Now emits **`loop-ceiling-unknown`** (warn). (ADR-011 §6 / B7) |
| 52/00 · frontmatter keys | Admitted-key checking is now **kind-scoped**. A `ground:` on a `kind: loop` node and a control field on a `kind: actor` node emit **`loop-key-not-admitted-for-kind`** (error), not `loop-unknown-key` and not silence. (§3 / B3) |
| 52/00 · malformed key line | New: a frontmatter line the parser silently drops (e.g. the SPEC's own `veto/constraint:`) emits **`loop-malformed-frontmatter-line`** (error). Any scenario asserting such a line is inert must invert. (§4 / B4) |
| 52/00 · empty lists | New: `reference: []` / `measurement: []` / `actuator: []` / `ceiling: []` / an empty **edge** list emit **`loop-empty-list`** (error). Any scenario treating `[]` as valid-and-empty must invert. (§5 / B5) |
| 52/00 · scalar/list mismatch | New: `controlled: [a, b]` emits **`loop-expected-scalar`** (error), mirroring `loop-expected-list`. (§5 / B6) |
| 52/00 · `Field` shape | `Field.kind` gains **`periodic` · `event` · `ref` · `flag` · `enum`** with their payloads; `cadence` arrives **normalised** (`{kind:"periodic", ms}`), never as a raw string for a consumer to parse. Scenarios asserting `cadence` as an unparsed string must change. (§2 / B1) |
| 52/00 · `fields` map | `fields[key]` is **`Field[]` for `reference`/`measurement`/`actuator`/`ceiling`** (always, including sentinels — `ceiling: uncapped` → `[{kind:"uncapped"}]`) and **`Field` for the scalar keys**. Shape is key-determined, never data-determined. (§2 / B2) |
| 52/00 · dangling endpoints | **`loop-graph-dangling-endpoint` is emitted by the LOADER**, not the checks, and `Endpoint.resolved` is a loader field. Any scenario placing it in the checks lane must move. (§1 / B8) |
| 52/00 · `Endpoint` | Gains **`symbol?`**, split exactly as `Field.pointer` (`module:<path>#<sym>` → `operand`=path, `symbol`=sym). (§11 / D4) |
| 52/00 · `Node.path` | Frozen as a **raw absolute, OS-native** — no face projection inside the command. (§11 / D5) |
| 52/00 · the model | `Model = {source, present, nodes, findings}` is now frozen; any scenario asserting a different handoff shape to the checks must change. (§7 / B10) |
| 52/01 · `path` on edge findings | QA asserted **no `path`** for the timescale finding. Overruled: an edge finding's `path` is the **declaring (source) node's file**, and `Finding.path` is always a non-empty absolute. (§7 / C3) |
| 52/01 · timescale domain | The check applies **only** to `target-setting` edges where **both** endpoints are registry-present `kind: loop` nodes. Actor-sourced and dangling-endpoint edges emit **nothing** — not `not-comparable`. (§8 / C2) |
| 52/01 · pairing & ownership | **Self-edges no longer satisfy** check 2 or check 3, and a `monitoring`/`target-setting` self-edge emits new **`loop-self-referential-edge`** (warn). QA's literal reading must invert. (§9 / C5) |
| 52/01 · arbitration | New assertion where QA left the case open: a **member of the contending set may not be its own arbiter**; the arbiter must be a non-member declaring `veto` to every member. (§9 / C6) |
| 52/01 · check ids | `summary.checks` keys are frozen: **`grounding` · `pairing` · `reference-ownership` · `actuator-arbitration` · `timescale`**. Any scenario using other strings must change. (§12 / B9) |
| 52/02 · bijection test | 52/02 **must add three `argsFor` cases** to `test/arch/acd-work-command-cli-bijection.test.mjs` (probes: `["work","loops",<verb>,"--json"]` against the bijection fixture, which has no `loops/` dir → `present:false`, exit 0, one envelope). Any scenario or story text asserting "no pre-existing test is touched" must change. (A1) |
| 52/02 · Mermaid glyphs | Glyphs are **frozen literals** (§11/D6). QA's weaker "shapes differ by kind and are consistent within a kind" still passes, but the scenario should assert the frozen delimiters and the `:`→`__` id mangling. |
| 52/03 · `module:` citations | Pointers must name the **defining** module, not an importer. Four ADR-010 parentheticals were wrong; the corrected sites are in §13's table. QA's general scenario is ratified — the records must follow §13, not ADR-010's parentheticals. (F1) |
| 52/03 · memory ingest actuator | **`command:work:memory-ingest` must not be authored** — no such registered id exists. Use `module:src/work-memory.mjs#<defining symbol>` or `prose:`. (F2) |
| 52/03 · dual staleness | Declare **`module:src/mesh-assignment-reclaim.mjs#dualStalenessDecision`** as the dual gate's reference/measurement pointer, alongside the two halves. (F3) |
| 52/03 · actuator granularity | New authoring rule: an actuator names the **narrowest artifact that acts** (agent definition or defining symbol), never the orchestrating phase prompt — so a shared-actuator finding is a real shared lever, not a citation artifact. (§10 / C7) |
| 52/04 · FF mechanisation | Arch-tests export **`{name, run}`**, not `{name, fn}` (measured: 797 `run:` vs 0 `fn:` as a test-entry key across `test/arch/*.test.mjs`). FF-5208's grep must be **token-scoped and comment-stripped** (a bare `loop` grep is RED today against 13 `ui/src` files). FF-5201 splits into a call-form tripwire **plus** a dynamic byte-unchanged assertion. FF-5209 imports **both** modules and asserts union **and** disjointness. (A1, A2, E1, E2, E3) |
| 52/04 · vocabulary sets | **Ten** exported vocabulary constants, not eight — adding `ground` values (ADR-005 §1) and `periodic` units (ADR-006 §1). (E4) |

---

## ADR-012: Final closure — the bijection gate's latent id-equals-route assumption, the cross-story seams, and the precedence/cardinality rules that make one slip yield one finding

**Status:** Accepted
**Date:** 2026-08-14
**Clarifies:** ADR-008 and ADR-011 §Context/A1 (the bijection gate — **corrected a second time**),
ADR-011 §1/§2/§3/§4/§5/§7/§9/§11/§12, ADR-010 (two record-authoring values). ADRs 001–011 stand as
written; where this ADR rules differently, **this ADR governs.** **The 24-code set of ADR-011 §1 is
unchanged** — every ruling below reuses an existing code or adds none, which after two closure rounds is
the signal that the vocabulary has settled.

**Context.** Applying ADR-011's rulings across all 25 features surfaced a second instance of the A1
error and a set of residuals. Three of them are genuinely different in kind from the last round:

1. **The bijection gate was half-measured, twice.** ADR-011/A1 corrected "no test edit" to "two legs
   free, one not". Measured again, that is *also* wrong: leg (b) — route-reachability — derives its
   probe from the command **id** (`subcommands()` at `:40-44` maps `work:loops-show` → `loops-show`) and
   then asserts `routes.has(\`work ${sub}\`)` at `:283-289`, i.e. `routes.has("work loops-show")`, while
   `deriveRouteTable` keys on `cli.route.join(" ")` = `"work loops show"` (`src/spine/face.mjs:92`). The
   lookup misses and falls through to `laddered`, which requires the `cli.mjs` dispatch branch ADR-008
   forbids. **Only the adapter leg is free.** The root cause is worth naming because it is a latent
   assumption inside a *shared* gate, not a quirk of this family: **the test assumes a `work:` command's
   id-suffix IS its route words.** `work:loops-*` is the first `work:`-namespaced command with a
   three-word route — the only other 3+-word routes are `notion:*`, which the `work:` filter excludes —
   so nothing has ever falsified it.
2. **Four cross-story seams block the parallel build.** Which check owns `loop-self-referential-edge`
   (it decides a `summary.checks` counter **53 reads**); where the five check ids are exported (ADR-011
   §1 forbids the loader knowing about the checks, but FF-5203 scoped the vocabulary constants to the
   loader); where `ran` comes from (the checks are pure over a model and cannot see `present`); and
   whether `Field.kind`'s set is an export. Each is a place 52/00, 52/01 and 52/02 would ship
   incompatible readings, and every one was flagged by two stories independently rather than guessed at.
3. **One authoring slip can yield many findings.** ADR-011 §4's re-scan, read literally against a record
   authored as a YAML block list, emits `loop-expected-list` **plus one `loop-malformed-frontmatter-line`
   per continuation line**; a `target-setting` self-edge emits both `loop-self-referential-edge` and
   `loop-timescale-inversion`; `controlled: []` is both wrong-shape and empty. A registry whose first run
   reports four findings for one typo is a registry an operator learns to skim.

**Decision.**

### 1 — The bijection gate is fixed GENERALLY, not patched for this family (closes A1-bis)

52/02 lands **two** changes to `test/arch/acd-work-command-cli-bijection.test.mjs`, and the second is the
important one:

- **(i)** three `argsFor` cases (unchanged from ADR-011/A1) — `["work","loops",<verb>,"--json"]` against
  the fixture, which holds no `loops/` directory → `present:false`, exit 0, one parseable envelope.
- **(ii)** **leg (b) derives its probe words from `command.cli.route`, not from the command id.** The
  loop iterates the registry-derived work-namespaced **commands** and asserts
  `routes.has(command.cli.route.join(" "))`, with the `laddered` fallback retained for commands that
  legitimately have no `route` yet. This is the coordinator's stated preference and the correct one: it
  makes the gate cover **every** multi-word route from now on instead of buying this family a pass, and
  it removes an assumption that would have failed silently for the next family too.

The corrected count is therefore: **one leg free (the `cli`-adapter leg), two legs requiring the fix.**
No fourth correction is expected — all three legs have now been read at source — but the honest lesson is
recorded rather than the confidence: *a shared registry-derived gate is only as general as its most
recently added member, and "registry-derived" is not the same as "shape-agnostic".*

### 2 — The four cross-story seams (closes B1–B4)

**B1 · `loop-self-referential-edge` is emitted by the check whose independence requirement the self-edge
attempted to satisfy.** A `monitoring` self-edge → **`pairing`**; a `target-setting` self-edge →
**`reference-ownership`**. 52/01's `pairing · reference-ownership` cell is **ratified**. This makes the
`summary.checks` counter attribution deterministic and semantically right: the check that was cheated
reports the attempt.

**B2 · Lane-scoping applies to the check-id vocabulary too — 52/04's reading is RATIFIED.**
`src/work-loops-checks.mjs` exports **two** frozen constants: its 8-code array and the five check ids
(`grounding · pairing · reference-ownership · actuator-arbitration · timescale`, in that order).
`src/work-loops.mjs` keeps its own — see B4. ADR-011 §1's no-cross-import stands untouched: the
**command** composes the two lanes; neither module imports the other.

**B3 · `ran` is derived by the COMMAND from `Model.present`, never returned by the checks.**
`work:loops-validate` resolves it:

| `Model` | checks invoked? | `summary.checks[*]` |
|---|---|---|
| `present: false` | **no** | `{ran: false, findings: 0}` |
| `present: true`, `nodes: []` | **yes** | `{ran: true, findings: <its count, normally 0>}` |
| `present: true`, `nodes: [...]` | yes | `{ran: true, findings: n}` |

That is precisely the distinction D1/D2 exist to preserve — *"no registry"* and *"checks ran clean"* are
different answers — and it keeps the checks pure (they never see `present`).

**B4 · `Field.kind` IS an exported constant.** 52/00's long-standing scenario is **confirmed**:
`src/work-loops.mjs` exports **eleven** frozen vocabulary sets — the ten of FF-5203 plus `FIELD_KINDS`
(the eleven members of ADR-011 §2). FF-5203 is corrected to eleven below.

### 3 — Precedence and cardinality: one slip, one finding (closes C1–C6)

**C1 · A `target-setting` self-edge fires ONCE.** The timescale check's domain (ADR-011 §8) is narrowed:
it **excludes edges whose source and endpoint are the same node.** A self-edge is not a supervision
relation — it is a malformed declaration, already reported once by `loop-self-referential-edge` — and a
`loop-timescale-inversion` on top would be both a duplicate and *misleading*, naming a timescale problem
where the problem is self-reference. §9 takes precedence over §8 on the same edge.

**C2 · Cardinality is per (node, edge-type)** — 52/01 **ratified**. A node declaring both a `monitoring`
and a `target-setting` self-edge yields two findings; a node declaring `monitoring: [loop:a, loop:a]`
(itself, twice) yields **one**. Corollary, ruled here so it is a decision and not an omission: **the
loader deduplicates each edge key's endpoint list silently.** An edge is a relation; declaring it twice
asserts the same fact twice and there is no defect to report — unlike an empty list, which asserts
nothing, or a dropped line, which asserts something the machine cannot see. No new code.

**C3 · The malformed-line re-scan reports TOP-LEVEL lines only.** A line is re-scanned only if it is
non-blank, not a `#` comment, **not indented**, and does not begin with `-`. The `---` fences are outside
the block by construction. Consequence on 52/00's block-list record: the continuation lines
(`  - module:…`) are treated as belonging to the preceding key and are **not** independently reported,
while `reference:` with an empty scalar value fails the shape gate below and emits exactly one
`loop-expected-list`. **One authoring slip, one finding.** The SPEC's own `veto/constraint:` — unindented,
yields no key — still emits `loop-malformed-frontmatter-line`, which is the case §4 was written for.

**C4 · The general precedence ladder** (52/00's rule, stated generally as asked). For each key,
evaluation stops at the **first** gate that fails and emits exactly that one finding:

```
1. admitted at all?           → loop-unknown-key
2. admitted for this `kind`?  → loop-key-not-admitted-for-kind
3. shape correct?             → loop-expected-list | loop-expected-scalar
4. list non-empty?            → loop-empty-list
5. value grammatical?         → loop-bad-value
```
So `controlled: []` emits `loop-expected-scalar` at gate 3 and never reaches gate 4; `ground:` on a
`kind: loop` node emits `loop-key-not-admitted-for-kind` at gate 2 and never reaches gate 5.

**C5 · Honesty findings are per FIELD, not per entry** — 52/00 **ratified**.
`ceiling: [prose:a.md, prose:b.md]` emits **one** `loop-field-prose-only` whose message names both
entries. The honesty lane answers *"which fields of which loops are still un-machine-readable"*; a
two-entry prose list is one such field, not two problems — and a per-field count is the number 53 can
trend across milestones.

**C6 · Finding order is frozen** (FF-5209's byte-identity leg needs it): the combined `Finding[]` is
**loader-lane findings first** — by node in `id` order, then by key in the frozen schema's key order,
then by the emission order within a key — **followed by the five checks in the frozen `summary.checks`
order**, each check's findings sorted by `(path, code, message)`.

### 4 — Shape one-liners (closes D1–D6)

**D1 · `Node.title` is a bare string**, like `id` and `kind` — 52/00 confirmed. The `phrase` kind is
consequently admitted on **`controlled` only**; ADR-011 §2's "`controlled`/`title` only" annotation is
drift from ADR-002 and is corrected here.

**D2 · A missing or non-admitted `kind:`** emits `loop-missing-field` / `loop-bad-value` **for the `kind`
key itself**, and then key admission **falls back to the union of both kinds' sets**, so only
`loop-unknown-key` can fire and the node does not collect a cascade of
`loop-key-not-admitted-for-kind` findings for keys that would be fine under the right kind (52/00's
recommendation, confirmed). The node is **kept in `Model.nodes` with `kind: null`** — not dropped —
because dropping it would turn every other node's endpoint to it into a spurious dangling finding. The
checks treat a `kind: null` node as neither loop nor actor: it resolves as an endpoint and participates
in no check.

**D3 · The `#symbol` split applies to `module:` ONLY.** For every other scheme the operand is everything
after the first colon, and a `#` anywhere in a non-`module:` pointer or endpoint is **`loop-bad-value`**.
`command:work:doctor#run` is not a thing, and silently carrying `#run` into the operand would make
FF-5204's test-side `command:` resolution fail with a message that names the wrong defect.

**D4 · `Field.kind: "ref"`'s payload lands on the `Field` itself** — `{key, raw, kind:"ref", scheme,
operand}` — consistent with the bare `ms` / `trigger` / `value` / `path` payloads. 52/00 and 52/02 both
read it that way; **confirmed**. Only `pointer` nests, because it carries three parts and a name that
reads well; the mild inconsistency is accepted in favour of consistency with the other four.

**D5 · The face relativises `Node.path`** — 52/02's added assertion **ratified**. "The face relativises,
no exceptions" meant what it said: the *command result* is basis-neutral raw absolute (08/ADR-002); the
*face* projects **every** path it prints — `source`, `Finding.path` and `Node.path` alike.

**D6 · Corrected: EIGHT control fields**, not seven — `controlled`, `reference`, `measurement`,
`actuator`, `cadence`, `ceiling`, `owner`, `optimizing`. ADR-011 §3's "the seven control fields" is a
miscount; the table itself was right.

### 5 — The rendering's totality (closes E1, E2)

**E1 · The node-key mangle is TOTAL.** ADR-011's `:`→`__` rule is insufficient — a `module:` endpoint
would keep `/`, `.` and `#` and could make the whole picture unrenderable, which defeats the one thing
ADR-009 exists to deliver. The rule becomes: **every character outside `[A-Za-z0-9_]` is replaced by
`_`**, and if two ids collide on the same key, `_2`, `_3` … are appended in `id`-sort order. Total,
deterministic, and no endpoint is dropped from the picture — a rendering that silently omits declared
endpoints would lie about the graph, which is worse than an ugly key. (The visible label still carries
the real id verbatim.)

**E2 · `nodeCount` counts DECLARED RECORDS ONLY** (`Model.nodes.length`); **`edgeCount` counts every
declared edge**, including those to extra-registry or dangling endpoints. `nodeCount` answers "how big is
the registry" and must agree with `show`; an endpoint-only node is referenced, not declared. **The
rendering may therefore contain more visual nodes than `nodeCount`** — stated explicitly so it is not
later read as a bug. (Day-one expectation: zero extra-registry endpoint nodes, since every declared edge
is loop→loop or actor→loop. The glyph and the mangle exist for the first case that isn't.)

### 6 — Record authoring: the last three values (closes F1, F2, F3, and RECORDS F4)

**F1 · `loop:mesh-assignment-reclaim` declares `ceiling: none`** (silent, no warn). Each reclaim tick is
single-shot and terminates by construction; the 15s cadence is its **rate**, not a bound it iterates
toward. Same shape as `loop:retrospective-memory-ingest`. `unknown` would be wrong — we looked, and the
answer is "not applicable", not "not found".

**F2 · The ingest actuator is `module:src/work-memory.mjs#runMemory`.** Verified: `ingest` is an alias of
`reindex` dispatched inside `runMemory` (`src/work-memory.mjs:209`, `MEMORY_VERBS` at `:28`), the frozen
backend interface is `{name, recall, reindex, status}`, and there is **no ingest-specific export** —
`runMemory` (`:317`) is the narrowest exported symbol on the path to the act. This needs a general
clarification to ADR-011 §10's granularity rule, because it will recur: **where the narrowest act is not
an exported symbol, the pointer names the narrowest EXPORTED symbol on the path to it.** Never a
fabricated symbol (FF-5204 would catch it), and never `prose:` when a real export exists (that would
under-report the machinery aof actually has). The record's prose body carries the aliasing evidence.

**F3 · The two actors' edges are pinned to what is cited.**
- `actor:product-owner` declares **`target-setting: [loop:verify-triage-accept]`** and nothing else —
  `src/bundle/commands/verify.md:92` is the one measured fact (the PO triages findings; the only named
  loop owner of the seven).
- `actor:operator` declares a **floor of `target-setting: [loop:autonomous-cascade]`** — the operator
  chooses the range the cascade drives, the one exogenous target-setting act this repo evidences. **Any
  additional edge requires a `path:line` citation in the record body.**
- The consequence is stated so nobody treats it as a defect: **on day one most components are ungrounded,
  and that is the correct output.** An author who adds operator edges to clear the grounding check is
  committing the same fabrication ADR-005 §Consequences already warns against, one level up.

**F4 · The PO's `optimizing` ruling, RECORDED (not decided here).** The distinction is optimizer (pushes
a metric toward an extremum, therefore Goodhart-exposed) vs regulator (holds a variable at a reference):

| `optimizing: true` | `optimizing: false` |
|---|---|
| `loop:build-to-green` — PRD §Context failure 1's canonical case: metric is scenarios-green, actuator can edit the scenario | `loop:verify-triage-accept` — an acceptance gate |
| `loop:review-fix-rereview` — drives open findings toward zero; the actuator influences the metric | `loop:run-resilience` — a regulator against a transition table |
| `loop:autonomous-cascade` — drives items-reaching-done up; PRD pairs throughput with rework/escape rate | `loop:mesh-assignment-reclaim` — a regulator against a staleness threshold |
| | `loop:retrospective-memory-ingest` — a capture pass, no extremum |

**Three `loop-unpaired-optimizer` findings on day one**, none of the three carrying a `monitoring` edge —
the PRD's own thesis ("none has a counter-metric") made computable, which is the milestone working.
Two architect notes on top: (a) `optimizing` is the **only** schema field with no evidential anchor in
the codebase, so it is the field most exposed to silent drift — **each record's prose body must carry the
optimizer/regulator justification**, since no check can re-derive it; (b) `review-fix-rereview` (true)
and `verify-triage-accept` (false) both drive findings toward zero and are classified differently — the
distinguishing reason (one iterates, one is a terminal gate) must be written into both bodies so a later
reader can re-derive the boundary instead of re-litigating it.

### 7 — Mechanisation calls (closes G1–G4)

**G1 · RATIFIED, as a named proxy.** Banning scheme-prefixed token literals (`periodic:`, `event:`,
`module:`, `command:`, `config:`, `prose:`) and `split(":")` over a declared value, while allowing
`kind === "periodic"` comparisons, is a **proxy** for "the checks parse no value string" — there is no
decidable general form. Its false-negative surface (a regex with no scheme literal) is accepted, because
the real guarantee is the normalised `Model` contract (ADR-011 §7) plus FF-5205's determinism leg; the
grep is the tripwire, not the proof. Recorded as a proxy so it is not later mistaken for one.

**G2 · RATIFIED, with the form pinned.** The `module:` resolution grep must require a **definition
form** — `export\s+(async\s+)?(function|const|let|class)\s+<symbol>\b` — and must **reject**
`export { X } from …` and `export * from …`. The `async` alternative is load-bearing: F2's `runMemory` is
`export async function` (`src/work-memory.mjs:317`), so a form without it would fail the very pointer
this ADR just authorised. A naive `export` grep passes `export { isStale } from "./run-store.mjs"`, which
is the exact importer-vs-definer class ADR-011 §13/F1 exists to kill.

**G3 · RATIFIED.** The no-cross-import assertion is **transitive** (walk the import graph from each
module, not a direct-specifier grep) — a one-hop laundering module would otherwise satisfy it.

**G4 · The split is intended; CONFIRMED, with a clarification to ADR-011's §Invariant.** "No self-edge
satisfies check 2 or check 3" and "a member may not be its own arbiter" are **single-case properties of a
pure function** — "this input yields that output" — which is a scenario. FF-5206 is a fitness function
because it is **exhaustive over a closed finite vocabulary** (the check *never*, for any cadence-kind
pair, invents a comparison); these two are not of that shape. ADR-011's §Invariant lists them as
semantics the checks must have, **verified by 52/01's task features**, not as promised arch-tests; that
reading is recorded here so the absence of an FF row is not read as a gap.

**Alternatives considered.**
- *Patch leg (b) with a `work:loops-*` special case* (A1-bis) — **rejected:** it buys this family a pass
  and leaves the assumption armed for the next multi-word family. The general fix is three lines and
  strictly larger coverage.
- *Give `loop-self-referential-edge` a single owning check* (B1) — **rejected:** `pairing` owning a
  `target-setting` self-edge would misattribute the counter 53 reads.
- *Have the checks return `ran`* (B3) — **rejected:** it would require the checks to see `Model.present`,
  i.e. to reason about the store, which is the purity boundary ADR-011 §1/§7 depends on.
- *Report every dropped frontmatter line, indented or not* (C3) — **rejected** on the measured cost: one
  block-list slip would emit `loop-expected-list` plus N line findings. One slip, one finding.
- *Emit both `loop-self-referential-edge` and `loop-timescale-inversion` on a self-edge* (C1) —
  **rejected:** duplicate *and* misleading; it names a timescale problem that does not exist.
- *Per-entry honesty findings on list fields* (C5) — **rejected:** it makes the day-one warn count a
  function of citation verbosity rather than of how much machinery is undeclared.
- *Drop `module:`/`config:` endpoints from the rendering instead of mangling them* (E1) — **rejected:** a
  picture that silently omits declared edges lies about the graph; an ugly node key does not.
- *Count endpoint-only nodes in `nodeCount`* (E2) — **rejected:** it would make `nodeCount` disagree with
  `show`, and "registry size" is the question that number answers.
- *`prose:` for the ingest actuator* (F2) — **rejected:** a real export exists; `prose:` would under-report
  the machinery and inflate the honesty lane's prose count with a false positive.

**Consequences.** Story 52/02's edit to the bijection test grows from three `argsFor` cases to three cases
plus a three-line route-derivation fix — still one file, still additive, still 52/02, and the fix is a
strict improvement to a shared gate. The precedence ladder (§3/C4) and the top-level-only re-scan (§3/C3)
together give the day-one registry the property an operator needs to trust it: **one authoring slip
produces one finding.** The `optimizing` ruling fixes the day-one output at **three unpaired-optimizer
findings** and, with F3, at a mostly-ungrounded graph — both of which are the milestone reporting the
truth the PRD predicted, and neither of which should be "fixed" by authoring.

**One open question is deliberately left open** rather than answered here:

> **OQ-1 · `actor:operator`'s edge set above the cited floor** (52/03, build time). §6/F3 fixes the floor
> (`target-setting: [loop:autonomous-cascade]`) and the rule (every additional edge needs a `path:line`
> citation in the body). Which further edges clear that bar is a question about evidence in the
> repository, answerable only while writing the record with the code open — and it is precisely the
> decision that must not be made by an architect guessing from a distance, because the grounding output
> is downstream of it. Two named open questions beat twenty invented answers; this is the one.

**Invariant.** The bijection gate's route leg derives its probe from `cli.route`, never from the command
id; the loader exports eleven frozen vocabulary sets and the checks export two; `ran` is set by the
command from `Model.present` and by nothing else; per key, at most one schema finding is emitted, chosen
by the §3/C4 ladder; the timescale check's domain excludes self-edges; every Mermaid node key matches
`[A-Za-z0-9_]+` and is unique. (Enforced by `acd-loop-command-route-only`, `acd-loop-vocabulary-closed`,
`acd-loop-finding-envelope`, `acd-loop-render-deterministic`.)

### Contract deltas

Keyed `story · subject · what must change`. Confirmations and ratifications from A–G are **not** listed —
only changes. Feature filenames are named where the coordinator supplied one.

| Story · subject | What must change |
|---|---|
| 52/04 · `03_command-surface.feature` | Says "two legs free (adapter, route-reachability)". **Only the adapter leg is free.** Leg (b) misses because `routes.has("work loops-show")` ≠ the route key `"work loops show"`. (§1 / A1-bis) |
| 52/02 · bijection test edit | Now **two** changes, not one: the three `argsFor` cases **plus** leg (b) deriving its probe from `command.cli.route.join(" ")` instead of the id. Any scenario asserting a single `argsFor`-only edit must change. (§1 / A1-bis) |
| 52/01 · `loop-self-referential-edge` attribution | Now **assigned**: a `monitoring` self-edge is emitted by `pairing`, a `target-setting` self-edge by `reference-ownership`. Scenarios leaving the owning check open must pin it. (§2 / B1) |
| 52/01 · timescale domain | Now **also excludes self-edges** (source === endpoint). A `target-setting` self-edge emits `loop-self-referential-edge` **only** — any scenario asserting a co-occurring `loop-timescale-inversion` must invert. (§3 / C1) |
| 52/01 + 52/02 · `ran` | `ran` is derived **by the command** from `Model.present`; the checks never return it. `present:true, nodes:[]` → `{ran:true, findings:0}`; `present:false` → checks not invoked, `{ran:false, findings:0}`. (§2 / B3) |
| 52/02 · `summary.checks` source | The five check ids are imported from **`src/work-loops-checks.mjs`** (which exports both its 8 codes and the 5 ids), not from the loader. (§2 / B2) |
| 52/00 · malformed-line re-scan | Now **top-level lines only** — indented lines and lines beginning with `-` are continuations and are not independently reported. The block-list record must assert **exactly one** `loop-expected-list` and **zero** `loop-malformed-frontmatter-line`. (§3 / C3) |
| 52/00 · precedence | New general rule: per key, evaluation stops at the first failing gate — `loop-unknown-key` → `loop-key-not-admitted-for-kind` → shape → `loop-empty-list` → `loop-bad-value`. `controlled: []` asserts **`loop-expected-scalar` only**, not also `loop-empty-list`. (§3 / C4) |
| 52/00 · duplicate edge entries | `monitoring: [loop:a, loop:a]` — the loader **deduplicates silently**, one edge, no finding, and (if self-referential) exactly one `loop-self-referential-edge`. (§3 / C2) |
| 52/00 · bad or missing `kind:` | Admission falls back to the **union** of both kind sets (only `loop-unknown-key` can fire), and the node is **kept in `Model.nodes` with `kind: null`** so endpoints to it do not become spuriously dangling. Any scenario dropping such a node must change. (§4 / D2) |
| 52/00 · `#` outside `module:` | New: a `#` in any non-`module:` pointer or endpoint is **`loop-bad-value`**; the symbol split applies to `module:` only. Previously unasserted. (§4 / D3) |
| 52/00 · `phrase` admission | `phrase` is admitted on **`controlled` only** — `title` is a bare node-level string and not a `Field`. (§4 / D1) |
| 52/00 + 52/04 · exported vocabulary | **Eleven** sets, not ten — adding `FIELD_KINDS` (the 11 members of ADR-011 §2). (§2 / B4) |
| 52/01 + 52/02 + 52/04 · finding order | The combined `Finding[]` order is now frozen: loader lane (by node `id`, then schema key order) then the five checks in `summary.checks` order, each sorted by `(path, code, message)`. Byte-identity scenarios must assert it. (§3 / C6) |
| 52/02 · Mermaid node keys | The mangle is now **total** — every character outside `[A-Za-z0-9_]` → `_`, collisions suffixed `_2`/`_3` in id-sort order — superseding the `:`→`__` rule. The `module:`/`config:` endpoint rows 52/02 deliberately left unauthored can now be written. (§5 / E1) |
| 52/02 · `nodeCount` / `edgeCount` | `nodeCount` = declared records only; `edgeCount` = all declared edges including those to extra-registry/dangling endpoints; the rendering may show more visual nodes than `nodeCount`. Previously unstated. (§5 / E2) |
| 52/03 · `mesh-assignment-reclaim.ceiling` | Pinned to **`none`** (silent). Any scenario expecting `unknown` (and its warn) must change. (§6 / F1) |
| 52/03 · ingest actuator | Pinned to **`module:src/work-memory.mjs#runMemory`** — no ingest-specific export exists. (§6 / F2) |
| 52/03 · actor edges | `actor:product-owner` → `target-setting: [loop:verify-triage-accept]`, nothing else. `actor:operator` → floor of `target-setting: [loop:autonomous-cascade]`; every further edge needs a body citation (OQ-1). (§6 / F3) |
| 52/03 · `optimizing` values | Pinned per §6/F4 — true for `build-to-green`, `review-fix-rereview`, `autonomous-cascade`; false for the other four. Each body must carry the optimizer/regulator justification, and the `review-fix-rereview` vs `verify-triage-accept` boundary must be written out in both. Day-one expectation: **three** `loop-unpaired-optimizer` findings. |
| 52/04 · FF-5204 `module:` grep | Must require a **definition form** `export\s+(async\s+)?(function\|const\|let\|class)\s+<symbol>\b` and reject `export { X } from` / `export * from`. The `async` alternative is required — `runMemory` is `export async function`. (§7 / G2) |
| 52/04 · FF-5205 no-cross-import | Asserted **transitively** over the import graph, not as a direct-specifier grep. (§7 / G3) |

---

## ADR-013: Closing round — total ordering for the two placeless findings, `kind`-suspension, and "declared here" as the definition test

**Status:** Accepted
**Date:** 2026-08-14
**Clarifies:** ADR-012 §3/C2, §3/C6, §4/D2, §4/D3, §7/G2. **The 24-code set is again unchanged** —
three closure rounds, no new code — and every ruling below is a one-line rule rather than a mechanism.

**Context.** Three of five stories reported the contract closeable; two raised six items, **two of which
are the same defect found independently by 52/00 and 52/04**. That convergence is the signal worth
acting on, and it lands on the milestone's most fragile guarantee: ADR-012 §3/C6 froze the finding order
as *node `id`, then schema key order*, but **two of the 16 loader codes have neither coordinate** —
`loop-record-unparseable` produces no node (so no `id`), and `loop-malformed-frontmatter-line` describes a
line that yields no key (so no key-order position). Two conforming implementations would sort them
differently and emit different bytes, and FF-5209's fixture is deliberately engineered to fire **every**
code, so both are present in the exact run whose byte-identity is asserted. Neither story pre-empted the
ruling; both wrote their order scenarios over key-bearing findings on parsed nodes only.

The other four are genuine gaps of the same one-line kind, and one of them carries a measured trap: 52/04
proposed widening ADR-012 §7/G2's definition-form grep to admit a local `export { … }` manifest with no
`from` clause. **Verified, that widening is unsafe, and the verification is sharper than the objection
raised.** `src/command-core.mjs:293` is `export { loadWorkspace };` where `loadWorkspace` is *imported* at
`:27` — so "no `from`" is not a proxy for "defined here". Worse, `src/graphify.mjs:43` re-exports four
symbols imported at `:41` from `./graph-normalize.mjs`, and it sat on the admit-list: admitting it would
have let a 52/03 record cite `module:src/graphify.mjs#readGraph` — a module that merely re-exports the
symbol — which is precisely the importer-vs-definer class ADR-011 §13/F1 exists to kill, shipped through
the gate built to prevent it. (By contrast `src/terminal-providers.mjs:96` exports `CliProvider`, declared
as `class CliProvider` at `:55`, and must stay admitted.)

**Decision.**

### 1 — The loader lane's order is TOTAL (closes item 1)

ADR-012 §3/C6 is completed. The loader lane emits, in this order:

```
1. every `loop-record-unparseable`, sorted by `path`
     — no node exists, so this is a fact about the DIRECTORY, prior to any node ordering; it is the
       one finding whose subject never enters `nodes[]`.
2. then, per node in `id` order:
     a. that node's `loop-malformed-frontmatter-line` findings, by LINE NUMBER ascending
          — facts about the record's raw text, which precede any key-level interpretation of it, in
            the order a human reads the file.
     b. that node's key-bearing findings, in frozen schema key order; and WITHIN one key, in the
        order the offending entries were declared (which is stable after ADR-012 §3/C2's edge dedup
        and ADR-013 §4's no-dedup rule for field lists).
```
Then the five checks, unchanged. **All 24 codes now have a defined position.**

**Every string comparison in this milestone is code-unit lexicographic** (`<`/`>` on strings), never
`Intl`/locale collation — node ids, paths, endpoint raw text, `(path, code, message)` tuples and the
Mermaid collision suffix alike. This **ratifies and generalises** 52/02's endpoint-suffix choice: it was
right for the reason given (an endpoint has no `id`, and locale collation orders `-` and `.`
inconsistently), and it is right everywhere else for the same reason. One rule closes the whole class.

### 2 — An unusable `kind` SUSPENDS every kind-derived check (closes item 2)

ADR-012 §4/D2 ruled admission-falls-back-to-the-union and the node is kept; its reasoning — *no cascade
for keys that would be fine under the right kind* — generalises, and is generalised here rather than
enumerated:

> **When `kind` is missing or not an admitted value, every kind-DERIVED check is suspended and the only
> finding emitted for the slip is the one for `kind` itself** (`loop-missing-field` if absent,
> `loop-bad-value` if present-but-not-admitted). **Kind-INDEPENDENT checks still run**: admission against
> the union, the `id` **stem** leg, list/scalar shape, non-empty, and value grammar.

Concretely, the two behaviours the item names: **required-key validation is skipped entirely** (an actor
record typo'd to `kind: anchor` and lacking `owner` emits **one** finding, for `kind` — not six under loop
defaults); and **`loop-id-mismatch`'s scheme leg is skipped**, only its stem leg runs, so `id: loop:x` in
`x.md` with `kind: anchor` does not fire a second finding for the same slip. One slip, one finding — the
property ADR-012 §3/C3–C4 secured, now holding for the root-cause case too. The author fixes `kind`; the
next run reports whatever remains.

### 3 — The definition test is "DECLARED here", never "exported here" (closes item 3)

52/04's widening is **rejected**; the form is instead **narrowed to what it always meant**. A `module:`
pointer resolves only when the target file **declares** the symbol. Concretely, FF-5204 admits a symbol
when either:

- a direct definition form matches — `export\s+(async\s+)?(function|const|let|class)\s+<symbol>\b`; **or**
- a local manifest `export { … <symbol> … }` **with no `from` clause** appears **AND** the same file also
  contains a declaration `(async\s+)?(function|const|let|class)\s+<symbol>\b`.

and rejects `export { X } from …` and `export * from …` outright. Measured against the three sites that
decide it: `terminal-providers.mjs:96` **admitted** (`class CliProvider` at `:55`);
`command-core.mjs:293` **rejected** (`loadWorkspace` imported at `:27`); `graphify.mjs:43` **rejected**
(four symbols imported at `:41`). The general principle, stated so the next round does not re-derive it:
**export syntax is not evidence of definition, in any of its three forms.** No narrowing of 52/03's
authoring is needed — a record citing a re-exporting module was always wrong, and this is the gate saying
so.

### 4 — Field lists are NOT deduplicated (closes item 4)

The asymmetry with ADR-012 §3/C2's silent edge dedup is deliberate and has a reason: an **edge is a
relation** — declaring it twice asserts one fact twice, so set semantics apply and dedup is lossless —
whereas a **field list is an enumeration of distinct authorities**, where multiplicity and order are the
author's statement. So `actuator: [command:a, command:a]` keeps **two** entries, `show` round-trips what
the file says, and C5's per-field `loop-field-prose-only` message names both (which is why that message
names entries rather than counting them). A duplicate entry is **not** a finding: no new code, and a
duplicate is visible in the PR diff — the review surface ADR-001 chose this store for.

### 5 — `#` is ADMITTED in a `prose:` value (closes item 5)

ADR-012 §4/D3 governs **pointer schemes and endpoint schemes**; `prose:` is a **sentinel prefix carrying a
path**, not a pointer scheme, and is outside D3's scope. `prose:src/bundle/commands/continue.md#retry-loop`
is admitted verbatim: the whole purpose of `prose:` is to say *where the paragraph lives*, and a Markdown
anchor makes that more precise, not less. `Field.kind: "prose"` keeps the entire payload in `path`,
anchor included, and FF-5204's test-side resolution never touches `prose:` (it resolves only `command:`
and `module:`), so an anchor can never redden the gate.

### 6 — Stale numeral corrected (closes item 6)

The Story partition's 52/00 *Owns* cell said "the **ten** exported frozen vocabulary constants"; ADR-012
§2/B4 and the corrected FF-5203 row say **eleven**. Fixed in place below — same class as the "seven
control fields" slip ADR-012 §4/D6 caught, and the third numeral drift across three rounds, which is
itself the argument for the arch-test asserting **exact set equality** rather than a count.

### 7 — The two notes: both ratified

- **Endpoint collision-suffix sort** — ratified and **generalised** into §1's code-unit rule.
- **`--format dot` refusal asserted as "a stable code", not a literal** — **ratified.** Error-envelope
  codes are the face's contract (`{ok:false, error, code}`, 08/ADR-003); no ADR in this milestone names
  one, and nothing downstream consumes this one. Freezing a literal would freeze a string with no
  consumer, which PRD §Constraints tells this arc to prune. Correct instinct.

**Alternatives considered.**
- *Sort the two placeless findings by `path` alone, mixed into the node ordering* — **rejected:** an
  unparseable record and a malformed line would then interleave with key-bearing findings from other
  nodes, so a reader could not read the report file-by-file, and the sub-order within one node would
  still be undefined.
- *Apply loop defaults to a `kind: null` node's required keys* (item 2) — **rejected:** it manufactures
  up to six findings from one typo and, worse, guesses which kind the author meant.
- *Drop the `kind: null` node instead of suspending its checks* — **already rejected at ADR-012 §4/D2**
  (spurious dangling cascade); restated because suspension is the natural completion of that choice.
- *Admit any `export { … }` manifest with no `from`* (item 3) — **rejected on measurement**:
  `command-core.mjs:293` and `graphify.mjs:43` are both importers under that rule.
- *Make FF-5204 parse the module instead of grepping it* — **rejected:** an AST pass in an arch-test to
  decide a question three regex alternatives answer, for a gate whose whole value is being cheap enough
  to always run.
- *Dedup field lists for symmetry with edges* (item 4) — **rejected:** symmetry is not a reason; it would
  silently rewrite a hand-authored record and break `show`'s round-trip.
- *Forbid `#` in `prose:`* (item 5) — **rejected:** it would make the most useful form of a prose citation
  illegal, in the milestone whose honesty rests on prose citations being precise.

**Consequences.** The loader lane's order is total over all 16 codes, so FF-5209's byte-identity leg is
implementable and its every-code fixture is orderable. `kind`-suspension makes one-slip-one-finding hold
for the root-cause case. G2's form is narrowed, not widened, and now discriminates measurably on three
verified sites. **No already-authored scenario inverts**: four of the six rulings are *additions* to
assertions the stories deliberately left open, one corrects a proposed-but-unshipped grep widening, and
one is a numeral in this document. A fourth amendment pass across 25 files is therefore not needed —
the deltas below are surgical.

**Invariant.** Every loader finding has a defined position under §1; every string comparison in the
milestone is code-unit lexicographic; a node with an unusable `kind` emits exactly one `kind` finding and
no kind-derived finding; FF-5204 admits a `module:` symbol only when the target file **declares** it.
(Enforced by `acd-loop-finding-envelope`, `acd-loop-records-parse`, `acd-loop-render-deterministic`.)

### Contract deltas

Four additions and one modification — stateable inline, no full pass required.

| Story · subject | What must change | Kind |
|---|---|---|
| 52/00 + 52/04 · finding order | The order scenarios gain the two placeless rules: `loop-record-unparseable` **first in the lane, by `path`**; `loop-malformed-frontmatter-line` **immediately before its own node's key-bearing findings, by line number**; within a key, declared-entry order. Existing assertions (key-bearing findings on parsed nodes) remain valid. | **addition** |
| 52/00 · unusable `kind:` | New assertions: a record with `kind: anchor` (or no `kind`) emits **exactly one** finding for `kind` — no `loop-missing-field` for any control field, and **no `loop-id-mismatch`** from the scheme leg (stem leg only). Kind-independent checks still fire. | **addition** |
| 52/04 · FF-5204 `module:` grep | The pinned ADR-012 §7/G2 form gains a **second admitted branch** — a local `export { … }` manifest with no `from` **plus** a declaration of the symbol in the same file — and must **still reject** `command-core.mjs:293` and `graphify.mjs:43`. If a scenario shipped the "admit any manifest without `from`" widening, it must invert. | **modification** |
| 52/00 + 52/02 · field-list dedup | New assertion: `actuator: [command:a, command:a]` keeps **two** entries through the loader and through `show` (no dedup, no finding) — the deliberate asymmetry with edge-endpoint dedup. | **addition** |
| 52/00 · `#` in `prose:` | New assertion: `prose:…/continue.md#retry-loop` is **admitted**, the anchor is retained verbatim in `Field.path`, and no `loop-bad-value` fires. | **addition** |

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     These replace "invariant-as-scenario" — they belong here, never in a task feature.
     RED-until-built is the correct state now: src/work-loops.mjs, src/work-loops-checks.mjs,
     the three src/commands/loops-*.mjs and <work.dir>/loops/ do not exist yet; the tests
     reference them and fail cleanly until the stories land.
     NOT here (they are task .feature material): "`aof work loops validate` reports the unpaired
     build loop", "`show` renders run-resilience's three actuators", "an empty repo prints
     'no registry'". Those are observable behaviour over the real seam.

     HARNESS SHAPE (ADR-011 §Contract deltas / E3): every arch-test in this milestone exports an
     array of `{ name, run }` — NEVER `{ name, fn }`. Measured 2026-08-14 across test/arch/*.test.mjs:
     797 `run:` entry keys, zero `fn:`. A test exported under the wrong key is a test the harness
     never invokes, which is TECH_DEBT item 5's failure shape ("the gate reads green-ish while not
     running") reproduced on the milestone's own gate.

     GREP DISCIPLINE (E1): every source-grep row below is token-scoped and comment-stripped. A bare
     `loop`/`loops` grep is RED today — 13 files under ui/src carry the word in comments
     (ui/src/fleet/runs.mjs:15 "which loops per-workspace"), as does src/work.mjs:904
     ("the story-loop returns"). The tokens are: `work-loops`, `loops-show`, `loops-graph`,
     `loops-validate`, `work:loops-`, and `"loops"` in a route/argv position.

     SORT DISCIPLINE (ADR-013 §1): every string comparison asserted below is CODE-UNIT lexicographic
     (`<`/`>` on strings) — never `Intl`/locale collation, which orders `-` and `.` inconsistently and
     would make the determinism legs pass on one machine and fail on another. This applies to node
     ids, paths, endpoint raw text, the `(path, code, message)` tuple and the Mermaid collision
     suffix alike. -->

| Invariant | Enforced by (arch-test) | State now | From |
|---|---|---|---|
| **FF-5201 · The loop registry never enters the item vocabulary, and 52 never writes to `loops/`.** No `loop`/`loops` token appears in `ITEM_RE` or any of its three physical copies (`src/work.mjs:48`, `src/work-doctor.mjs:40-43`, `src/commands/migrate-folder.mjs:47-48`) or in the board's TS union (`ui/src/board/api.ts:8-11`); `src/work.mjs` is unchanged by this milestone; and no code path in `src/` writes a file under `<work.dir>/loops/`. | `test/arch/acd-loop-registry-not-an-item-type.test.mjs`, in **two legs** (ADR-011 / E2 — the static half alone is not decidable, since a grep sees `writeFile(x, …)` and not that `x` resolves under `loops/`): **(a) call-form tripwire** — comment-stripped grep of the loop modules for `writeFile`/`appendFile`/`mkdir`/`rm`/`rename`/`open(…,"w")` → none; **(b) the real guarantee, dynamic byte-unchanged** — snapshot the fixture `loops/` directory's file list *and* bytes, run the loader plus all three verbs over it, assert the list and every byte are identical. Plus the vocabulary leg: source-grep the four sites in the house call-form discipline, asserting the six-type alternation is exactly the six | RED until `src/work-loops.mjs` and the three commands exist for leg (b); the vocabulary leg is GREEN now and must STAY green | ADR-001, ADR-011 |
| **FF-5202 · Import boundary: one symbol in, nothing out.** The loop modules (`src/work-loops*.mjs`, `src/commands/loops-*.mjs`) import from `./work.mjs` exactly `parseFrontmatter` and nothing else; and **no** module under `src/work.mjs`, `src/work-doctor*.mjs`, `src/cli.mjs` or `ui/` imports or references a loop module or a loop command id — the command registry (`src/command-core.mjs:412-418`) is the only door in. | `test/arch/loop/acd-loop-module-import-boundary.test.mjs` (parse the import statements of each loop module and assert the `./work.mjs` specifier's named bindings are exactly `{parseFrontmatter}`; reverse-grep `src/work.mjs`, `src/work-doctor*.mjs`, `src/cli.mjs` and `ui/**` for `work-loops`/`loops-show`/`loops-graph`/`loops-validate`/`work:loops-` → none; the import-boundary idiom of `acd-terminal-server-only`) | RED until the loop modules exist | ADR-001, ADR-003, ADR-007, ADR-009 |
| **FF-5203 · The record schema and edge vocabulary are CLOSED literals, admission is KIND-SCOPED, and each lane exports its own.** **Eleven** frozen literal sets are exported by `src/work-loops.mjs` — admitted keys **per `kind`** (ADR-011 §3), node `kind`s, the five edge keys, three pointer schemes, six endpoint schemes, sentinel tokens, cadence kinds, the four event triggers, `ground` values (ADR-005 §1), `periodic` units (ADR-006 §1) and **`FIELD_KINDS`** (the 11 members of ADR-011 §2 — ADR-012 §2/B4); **two more are exported by `src/work-loops-checks.mjs`** — its 8-code array and the five **check ids** (ADR-012 §2/B2). All derived from nothing, never widened by data. A key/kind/scheme/token outside its set yields a finding, never silent acceptance, and **at most one finding per key**, chosen by the ADR-012 §3/C4 precedence ladder. | `test/arch/acd-loop-vocabulary-closed.test.mjs` (import all **eleven** loader constants and **both** checks constants; assert **exact set equality** against the ADR-002/003/004/005/006/011/012 literals; load fixture records carrying an out-of-vocabulary edge key → `loop-unknown-key`, a `ground:` on a `kind: loop` node → **`loop-key-not-admitted-for-kind`**, an unknown pointer scheme / unlisted event trigger / a `#` outside `module:` → `loop-bad-value`, a top-level `veto/constraint:` line → **`loop-malformed-frontmatter-line`**; and the ladder itself — `controlled: []` emits `loop-expected-scalar` **and nothing else**) | RED until the loader exports eleven constants and the checks module two | ADR-002, ADR-003, ADR-004, ADR-005, ADR-006, ADR-011, ADR-012 |
| **FF-5204 · Every declared record parses, no declared loop is aspirational, and no pointer is fabricated.** Every `*.md` under `<work.dir>/loops/` loads with **zero `error`-severity findings**; every `kind: loop` node declares `controlled`/`reference`/`measurement`/`actuator` as a pointer or `prose:` — never `unknown`, and (ADR-011 §5) never an empty list; every `id` equals `<scheme>:<filename stem>`; and **every pointer resolves** — each `command:` names a registered id, each `module:` names a file that exists and **DEFINES** the named symbol (ADR-011 §13, sharpened by ADR-012 §7/G2). | `test/arch/acd-loop-records-parse.test.mjs` (run the real loader over the real `<work.dir>/loops/` directory, assert no `severity:"error"` finding; per-field sentinel + non-empty-list assertion over every `kind: loop` node; then the **test-side** resolution pass — `listCommands()` membership for `command:`, and for `module:` a **"declared here" test** with two admitted branches (ADR-013 §3): a direct `export\s+(async\s+)?(function\|const\|let\|class)\s+<symbol>\b`, **or** a local `export { … <symbol> … }` manifest with **no `from`** *plus* a `(async\s+)?(function\|const\|let\|class)\s+<symbol>\b` declaration in the same file — **rejecting** `export { X } from …`, `export * from …`, and a manifest whose symbol is merely imported. The `async` alternative is load-bearing (the ingest actuator is `export async function runMemory`, `src/work-memory.mjs:317`), and the manifest-plus-declaration branch is what keeps `src/terminal-providers.mjs:96` admitted while `src/command-core.mjs:293` and `src/graphify.mjs:43` stay rejected — both re-export symbols they import) | RED until story 00's loader and story 03's records both land | ADR-002, ADR-010, ADR-011, ADR-012, ADR-013 |
| **FF-5205 · The checks are PURE over the declared model, and take NOTHING from the loader.** `src/work-loops-checks.mjs` imports no `node:fs`/`node:child_process`/`node:process`/`node:os`, **and does not import `./work-loops.mjs`** (nor is it imported by it — ADR-011 §1); it calls no `Date.now()`/`new Date()`, performs no dynamic `import()` and **parses no value string** (the loader normalises: cadence reaches the checks as `{kind:"periodic", ms}`); every exported check has the shape `(model) => Finding[]` over the frozen `Model` of ADR-011 §7; the same literal model yields byte-identical findings on repeated invocation and in a fresh process, **in the frozen order of ADR-012 §3/C6**. | `test/arch/acd-loop-checks-pure.test.mjs`. Two mechanisation calls ratified by ADR-012 §7: **(G1, a named PROXY not a decision procedure)** "parses no value string" is enforced by banning the scheme-prefixed token literals `periodic:`/`event:`/`module:`/`command:`/`config:`/`prose:` and `split(":")` over a declared value, while explicitly **allowing** `kind === "periodic"` comparisons — its false-negative surface is accepted because the real guarantee is the normalised `Model` plus the determinism leg; **(G3)** the no-cross-import assertion is **transitive** — walk the import graph from each module, so a one-hop laundering module cannot satisfy it. Plus: import every export and assert arity/return shape over a literal fixture `Model`; double-run + subprocess-run determinism, ordering included (the `work-doctor` idiom, `src/work-doctor.mjs:12-21`) | RED until `src/work-loops-checks.mjs` exists | ADR-003, ADR-007, ADR-011, ADR-012 |
| **FF-5206 · The timescale check never invents a comparison, and never leaves its domain.** Exhaustively over the **closed, finite** cadence-kind cross-product (`periodic:` × each of the four `event:` triggers × `unknown`, both directions), a loop→loop `target-setting` edge emits `loop-timescale-inversion` **only** when both endpoints are `periodic:` with resolvable durations — with the ratio taken **directed**, source-period ÷ endpoint-period (ADR-011 §8) — and every other pair emits `loop-timescale-not-comparable`. An edge whose source is an actor, whose endpoint is extra-registry or dangling, **or whose source and endpoint are the same node** (ADR-012 §3/C1), emits **nothing at all**. No code path maps an `event:` trigger to a duration. | `test/arch/acd-loop-timescale-comparability.test.mjs` (generate every cadence-kind pair from the exported vocabulary — a **test-side** import — run the check over a two-node fixture model joined by one `target-setting` edge, assert the outcome partition exactly; assert a 60×-faster source is an `inversion`, not clean; assert the actor-sourced, dangling-endpoint **and self-edge** cases each yield an empty finding list; comment-stripped source-grep of the module for any `event:`→ms mapping → none) | RED until story 01's timescale check exists | ADR-006, ADR-011, ADR-012 |
| **FF-5207 · The command family is registry-derived and CLI-reachable, with no ladder branch.** All three commands are in `COMMANDS` (`src/command-core.mjs`), each carries `cli.route` of the exact triple `["work","loops",<verb>]` plus `argv`/`render`/`json`; each resolves through `deriveRouteTable`/`resolveRoute` (`src/spine/face.mjs:87-120`); `src/cli.mjs` carries **no** `loops` dispatch branch. | `test/arch/acd-loop-command-route-only.test.mjs` (import the registry, assert the three ids exist with the exact route triples and a non-null `cli` adapter, assert `resolveRoute(["work","loops",v])` resolves each; comment-stripped grep of `src/cli.mjs` for a `loops` branch → none). **Corrected claim, FINAL (ADR-012 §1 — ADR-011/A1's "two legs free" was itself half-measured; all three legs have now been read at source): only the `cli`-adapter leg is free.** The other two both go RED on the registration diff, for the same root cause — **the gate assumes a `work:` command's id-suffix IS its route words**, and `work:loops-*` is the first `work:`-namespaced command with a three-word route: (b) **route-reachability** asserts `routes.has("work loops-show")` (`:283-289`, from the id at `:40-44`) while `deriveRouteTable` keys on `"work loops show"` (`src/spine/face.mjs:92`), so it misses and falls through to `laddered`, which demands the `cli.mjs` branch ADR-008 forbids; (c) **spawn-and-parse** hits `argsFor`'s deliberate `default: throw` at **`:249`** (in-file note `:197-199`, 19/R1). **Story 52/02 lands both fixes:** three `argsFor` cases (`["work","loops",<verb>,"--json"]` against the fixture → `present:false`, exit 0, one envelope — the coded-refusal probe shape `resync` establishes), and leg (b) **deriving its probe from `command.cli.route.join(" ")` rather than the id** — a general fix that covers every future multi-word route, not a special case for this family | RED until story 02 registers the three commands **and** lands both bijection-test fixes; the pre-existing bijection test is GREEN now and must not be allowed to go RED on the registration diff | ADR-008, ADR-011, ADR-012 |
| **FF-5208 · The rendering is deterministic, its glyphs are frozen, and it lands in no UI surface.** `work:loops graph` emits byte-identical text for the same model across repeated calls and across process invocations (nodes sorted by `id`, edges sorted by source/type/target), using the **frozen glyphs** of ADR-011 §11/D6 (`loop` → `["…"]`, `actor` → `(["…"])`, extra-registry/dangling → `[/"…"/]`, edge label = the frontmatter key verbatim) and the **TOTAL node-key mangle** of ADR-012 §5/E1 (every character outside `[A-Za-z0-9_]` → `_`, collisions suffixed `_2`/`_3` in `id`-sort order — superseding the insufficient `:`→`__` rule, under which a `module:` endpoint stayed unrenderable); `nodeCount` counts **declared records only** and `edgeCount` **every declared edge**, so the picture may legitimately show more visual nodes than `nodeCount`; no file under `ui/` references the loop registry, its modules or its command ids. | `test/arch/acd-loop-render-deterministic.test.mjs` (render a literal fixture model twice in-process and once in a subprocess, assert byte equality; assert the three frozen glyph delimiters literally; assert **every emitted node key matches `^[A-Za-z0-9_]+$` and is unique** over a fixture carrying a `module:src/run-store.mjs#isStale` endpoint and a deliberate mangle collision; assert the two counts against a fixture with a dangling endpoint). **Corrected mechanisation (ADR-011 / E1 — the earlier bare-word grep goes RED today):** the `ui/` leg is **token-scoped and comment-stripped** — strip comments, then search `ui/**` for `work-loops` · `loops-show` · `loops-graph` · `loops-validate` · `work:loops-` · `"loops"` in a route/argv position → none. A bare `loop`/`loops` grep matches 13 files under `ui/src` in prose comments (e.g. `ui/src/fleet/runs.mjs:15`) and would fail on day one against an unchanged invariant. The UI budget tests `acd-ui-directory-budget`/`acd-ui-surface-file-budget` stay green as the corroborating net | RED until story 02's renderer exists; the `ui/` leg is GREEN now (under the corrected mechanisation) and must STAY green | ADR-009, ADR-011 |
| **FF-5209 · The finding envelope is doctor's; the code set is LANE-SCOPED, disjoint, and exhaustively reachable.** Every finding the loader or any check emits is exactly `{code, severity, path, message}` with `severity ∈ {"warn","error"}` and `path` a **non-empty raw absolute** (never relativised inside the command, never absent — including for the per-**edge** findings, which anchor at the declaring node's file, ADR-011 §7). The frozen set is the **union of two lane-scoped arrays** — 16 exported by `src/work-loops.mjs`, 8 by `src/work-loops-checks.mjs` (ADR-011 §1) — and the two arrays are **disjoint**: no code has two homes, and neither module imports the other. The combined `Finding[]` is emitted in a **TOTAL frozen order** (ADR-012 §3/C6, completed by ADR-013 §1): every `loop-record-unparseable` first, by `path`; then per node in `id` order — that node's `loop-malformed-frontmatter-line` findings by **line number**, then its key-bearing findings in frozen schema key order and, within a key, in declared-entry order; then the five checks in `summary.checks` order, each sorted by `(path, code, message)`. All comparisons **code-unit lexicographic**. | `test/arch/acd-loop-finding-envelope.test.mjs` (import **both** modules' code arrays; assert disjointness and that the union is exactly the **24** codes of ADR-011 §1 — unchanged through three closure rounds; drive the loader + every check over fixtures engineered to fire **every** code; assert exact key set, severity domain, `path.isAbsolute` and non-empty, **and the total order — including the two placeless codes, which this very fixture necessarily contains**. An unreachable code is as much a defect as an unfrozen one — the direct guard against TECH_DEBT item 5's "the gate reads green-ish while not running") | RED until stories 00+01 land | ADR-002, ADR-007, ADR-011, ADR-012 |

---

## Story partition (proposed)

**Graph grounding (actual, from the 2026-08-14 build — 10290 nodes / 24983 edges).** The partition is
driven by four measured coupling facts, not by topic:

1. **`src/work.mjs` — 240 dependents, imports 4.** The god-node, 6.8× the coupling milestone 37 measured
   when it was forced into a by-layer cut with the rule *only one story may edit `src/work.mjs`*. Here the
   rule is stronger and simpler: **no story edits it at all** (ADR-001). The milestone's single
   relationship with it is one **read-only import edge in** — `parseFrontmatter` — which changes nothing
   inside the file, so all 240 dependents are untouched. m37/R1's copy-drift trap (the item vocabulary is
   physically copied in four modules) is discharged the only reliable way: **no copy changes**, because no
   vocabulary is added (FF-5201). Duplicating the parser instead of importing it was rejected for the same
   reason — R1's explicit lesson is *single-source it*.
2. **`src/command-core.mjs` — 100 dependents, imports 72 command modules.** Registration is purely
   additive (three imports, three array entries) but it is a **shared edit point**, so exactly **one**
   story owns it (52/02). Its blast radius is nil: nothing reads the array's contents structurally except
   the registry-derived arch-tests, which are set-derived, not literal
   (`test/arch/acd-work-command-cli-bijection.test.mjs:1-7`).
3. **`src/spine/face.mjs` — `deriveRouteTable` builds the route table FROM the registry** (`:87-99`),
   `resolveRoute` longest-prefix-matches (`:104-120`), 4-word routes already exist
   (`src/commands/notion-associate.mjs:212`). This is the graph fact that keeps **`src/cli.mjs` out of the
   milestone entirely**. It does **not**, however, make 52/02 file-free, and the size of that exception
   was measured twice before it settled (ADR-011/A1, then ADR-012 §1). The pre-existing
   `test/arch/acd-work-command-cli-bijection.test.mjs` derives its probes from the command **id**, and
   **assumes a `work:` command's id-suffix is its route words** — an assumption `work:loops-*` is the
   first `work:`-namespaced command to falsify (the only other 3+-word routes are `notion:*`, excluded by
   its filter). So **two** of its three legs break on the registration diff: route-reachability, which
   looks up `"work loops-show"` against a table keyed `"work loops show"` (`:283-289` vs
   `src/spine/face.mjs:92`), and spawn-and-parse, which hits the deliberate `default: throw` at `:249`
   (`:197-199`, 19/R1). **Only the adapter leg is free.** 52/02 lands both fixes, the second one
   generally — see the table.
4. **`src/run-store.mjs` (35 dependents, imports `degrade`+`fs`) and `src/work-observe.mjs` (6 dependents,
   imports nothing — a leaf).** ADR-003 makes them **citation targets, never imports**: story 03 names
   their symbols in `module:` pointers that 52 does not resolve. Neither file is read, imported or edited
   by any story; both dependent counts are unchanged by this milestone.

**The resulting property, restated accurately after ADR-011/A1 and the suite-registration closure** (the
earlier form — "exactly one story edits exactly one pre-existing source file" — was based on the false
"no test edit" claim and is withdrawn): **no two stories edit the same file; 52/02 edits two
pre-existing files** — `src/command-core.mjs` (3 imports + 3 array entries) and
`test/arch/acd-work-command-cli-bijection.test.mjs` (3 `argsFor` cases **plus** the leg-(b) route-derivation
fix — ADR-012 §1) — **and 52/04 makes the one additive registration-only edit to `scripts/test.mjs`: nine
imports plus nine spreads, with no runner logic change.** No story edits `src/work.mjs`, `src/cli.mjs`, `src/work-doctor*.mjs`, or anything
under `ui/`.** That last clause is the one that actually carries the milestone's risk, and it has survived
both closure rounds unchanged — the two corrections moved the *size* of 52/02's exception, never its
*shape*.

| # | Story | Owns | Must NOT touch | `depends` |
|---|---|---|---|---|
| **52/00** | **`loop-model-and-loader`** — the parsed model | `src/work-loops.mjs` (new): the ADR-002/011 schema, the ADR-003 pointer grammar, the ADR-004/011 edge keys + endpoint schemes, the ADR-006 cadence grammar, the **eleven** exported frozen vocabulary constants (FF-5203, incl. `FIELD_KINDS` — ADR-012 §2/B4), the two-pass `<work.dir>/loops/` reader (parse → resolve endpoints), the **normalised `Model`** of ADR-011 §7, and the **16-code loader lane** — schema, reference-integrity (incl. `loop-graph-dangling-endpoint`) and honesty | `src/work.mjs` (import `parseFrontmatter` **only**), `src/command-core.mjs`, `src/commands/*`, **`src/work-loops-checks.mjs` (no import, either direction — ADR-011 §1)**, `wiki/work/loops/*`, `test/*`, `ui/*` | — |
| **52/01** | **`structural-checks`** — the five algorithms | `src/work-loops-checks.mjs` (new): the Tarjan SCC decomposition, the five pure checks (ADR-007 §3 as ruled by ADR-011 §8–§10), the **8-code checks lane**, the ADR-006/011 comparability + directed-ratio rule, and the independence rules (no self-edge satisfies pairing or ownership; no member is its own arbiter) | `src/work-loops.mjs` (**no import, either direction**; the model arrives pre-normalised so no string is parsed here), `src/work.mjs` (including `findCycle` — explicitly not reused, ADR-007), `src/command-core.mjs`, `src/commands/*`, `wiki/work/loops/*`, `test/*` | — |
| **52/02** | **`work-loops-command-family`** — the three verbs + the rendering | `src/commands/loops-show.mjs`, `loops-graph.mjs`, `loops-validate.mjs` (new), the deterministic Mermaid emitter with the ADR-011 §11/D6 frozen glyphs, the three frozen `--json` contracts (ADR-008 + ADR-011 §11/§12), and **the milestone's only edits to pre-existing files — two of them**: (a) 3 imports + 3 entries in `src/command-core.mjs`'s `COMMANDS`, and (b) **two fixes in `test/arch/acd-work-command-cli-bijection.test.mjs`** — 3 `argsFor` cases **plus** leg (b) deriving its probe from `command.cli.route.join(" ")` instead of the command id (ADR-012 §1; both legs fire on the registration diff, so both edits are part of landing the commands, not part of the gate — and the route fix is a general improvement to a shared gate, not a carve-out) | `src/cli.mjs` (no ladder branch — ADR-008), `src/work.mjs`, `src/work-doctor*.mjs`, `ui/*`, `src/bundle/commands/*` (no `/aof:*` wrapper — ADR-008), `src/work-loops*.mjs` (consumes, never edits), **every pre-existing test file except the one bijection test named above, and within it only the three `argsFor` cases** | `52/00`, `52/01` |
| **52/03** | **`the-day-one-registry`** — nine evidence-cited records | `wiki/work/loops/*.md` × 9 (ADR-010: 7 loops + `actor:operator` + `actor:product-owner`), each field carrying its RESEARCH / `path:line` citation in the prose body, authored under ADR-011 §13's rules: `module:` names the **defining** site, `command:` names a **registered** id, actuators name the **narrowest artifact that acts** | **every** source file, **every** test file — this story writes markdown and nothing else | `52/00` (verification only — see below) |
| **52/04** | **`the-fitness-functions`** — the gate | `test/arch/acd-loop-registry-not-an-item-type.test.mjs`, `acd-loop-module-import-boundary`, `acd-loop-vocabulary-closed`, `acd-loop-records-parse`, `acd-loop-checks-pure`, `acd-loop-timescale-comparability`, `acd-loop-command-route-only`, `acd-loop-render-deterministic`, `acd-loop-finding-envelope` (FF-5201…FF-5209) — all **new files**, each exporting `{ name, run }` (ADR-011/E3); plus the explicit-runner seam in `scripts/test.mjs`, exactly nine imports + nine spreads in one labelled m52 block | every `src/` file, every `wiki/work/loops/` file, **every pre-existing test — including the bijection test, whose three `argsFor` cases belong to 52/02, not here**; `scripts/test-unit.mjs`; all other `scripts/test.mjs` content | `52/00`, `52/01`, `52/02`, `52/03` |

**Why each boundary sits where it does.**

- **52/00 ∥ 52/01 are genuinely independent, and ADR-011 §1 is what keeps that true.** The checks are pure
  functions over a plain-data model (ADR-007 §4), so 52/01 builds and tests against **literal fixture
  models** — it never needs the loader to exist. The obvious threat to this was the frozen finding-code
  set, 10 of whose original 18 codes are emitted by the *loader*: pinning the set to one module would have
  forced a source-side import between the two stories. ADR-011 §1 removes it by **lane-scoping** the codes
  (each module exports its own, the sets are disjoint, the union is asserted in CI by 52/04), and
  ADR-011 §7 removes the second-order need by making the loader **normalise** — the checks receive
  `{kind:"periodic", ms}` and never parse a string, so they need no vocabulary either. **Corrected claim:**
  the two stories share **zero source files and zero source-side imports in either direction**; the only
  module that imports both is 52/04's `acd-loop-finding-envelope` arch-test, which is a test-side import
  and always was. The residual drift risk of two stories building against a paper contract is bounded by
  the locked blocks in ADR-002/004/006 and ADR-011 §1/§2/§7 — which is precisely why they are frozen there
  rather than discovered at integration.
- **52/02 is the single editor of every shared point — now two of them.** Registration is additive but
  concurrent edits to one array region are pure merge friction, and a command cannot be CLI-reachable
  until it is registered — so the family and its registration are one story. The second shared point,
  found by the Three Amigos and verified twice: **two** of the pre-existing bijection test's three legs
  break on the registration diff (`:283-289` route lookup, `:249` unmapped-subcommand throw), so **both
  fixes land in the same diff as the registration** — they are a consequence of registering, not a gate,
  and splitting them into 52/04 would leave a green test red between two stories. Because
  `deriveRouteTable` is registry-derived (`src/spine/face.mjs:87-99`), this story still adds **no** ladder
  branch, and its total edit surface outside its own new files is roughly fifteen lines across two files.
- **52/03 is the maximal-parallelism story and it exists as its own story deliberately.** It has **zero
  code coupling** — it writes nine markdown files and touches nothing else — so it can be authored the
  moment ADR-002/003/004/006 are accepted, concurrently with all the code. The declared `depends: [52/00]`
  is a **verification-time** dependency only: its acceptance criterion ("all nine records load with zero
  schema errors") needs the loader to exist. The PO may overlap the authoring freely; the honest declared
  gate is the parse. It is *not* folded into 52/00 because nine citation-backed evidence documents — the
  milestone's substantive content, and the one part an agent cannot fake — deserve their own review pass,
  and because merging them would couple the maximally-parallel story to the loader's critical path.
- **52/04 is last, on purpose, and this repo has the scar to justify it.** Authoring the arch-tests before
  their surfaces exists would give a long RED window in which "red because unbuilt" is indistinguishable
  from "red because broken" — which is `TECH_DEBT.md` **item 5** ("Part of the fitness gate is dead": 10 of
  700 arch tests failing before any change, "the gate reads green-ish while not running"), the exact
  failure PRD §Context calls measurement decay and cites as already-happened-here. The invariants
  themselves are already written and reviewable **in this document**; 52/04 mechanises them and lands them
  green.

**Parallelism check (re-run after ADR-011).** **52/00, 52/01 and 52/03 all start immediately and
concurrently** (disjoint file sets, disjoint source-side imports — ADR-011 §1 is what preserves this).
52/02 joins when 00+01 land. 52/04 closes. No story edits a file another story edits; no story edits
`src/work.mjs`, `src/cli.mjs`, `src/work-doctor*.mjs` or anything under `ui/`; and the only pre-existing
files edited in the whole milestone are `src/command-core.mjs` (3 imports + 3 array entries) and
`test/arch/acd-work-command-cli-bijection.test.mjs` (3 `argsFor` cases + the leg-(b) route-derivation fix),
**both by 52/02**, plus `scripts/test.mjs`'s registration-only nine imports + nine spreads by 52/04 — the
first purely additive, the second additive plus one three-line generalisation of a shared gate
(ADR-012 §1), and the runner change contains no harness logic.

**Codebase-health note (routed, not waved through).** This milestone adds **2** files to `src/`'s root
(112 `.mjs` files today) and **3** to `src/commands/` (78 today). The two root files are **family
extension, not a new sibling class**: they follow the established `work-<concern>[-<lane>].mjs` shape
whose multi-lane precedent is `work-doctor.mjs` + `work-doctor-{budget,coherence,freshness,identity}.mjs`,
and the loader/checks split is the same snapshot-then-pure-groups architecture
(`src/work-doctor.mjs:12-21`). The flat 112-file `src/` root is **pre-existing** debt already recorded as
`wiki/work/TECH_DEBT.md` **item 0** ("The system is flaky because nothing has one home") and paid down in
part by milestone 42; this milestone neither worsens the shape nor is the right place to pay it, so **no
new TECH_DEBT entry is warranted**. The ratchet, recorded here so it is not rediscovered: **if a third
`work-loops-*` lane is ever proposed** (55's anchors and 57's watchers are the likely candidates), that is
the moment to fold the family into `src/loops/` — the trigger is the third lane, not a vibe.
