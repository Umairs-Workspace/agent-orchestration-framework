# RESEARCH — A memory procedure for aof (episodic · semantic · procedural)

**2026-09-17.** Subject: whether the three-layer model of agent memory — *episodic = what happened,
semantic = what's true, procedural = what works* — names a procedure aof is missing, and what that
procedure is. Prompted by an inbox note on Romi Patel's reel
(`Openclaw/Inbox/2026-08-24 Agent memory episodic semantic procedural.md`) and its two linked notes
(Karpathy's compiled wiki — *retrieval answers questions, compilation builds understanding*; MegaMemory —
cross-session project memory).

Method: the live memory index, the work stream and the bundle prompts were **measured, not changed**.
Every count below is a command over this tree on 2026-09-17 (§8 lists them); every behavioural claim
cites the file it was read from. This is a sibling of
[RESEARCH-tencentdb-agent-memory.md](./RESEARCH-tencentdb-agent-memory.md) (2026-09-12), whose §5.3
already named two of the gaps this framing sharpens; nothing there is re-litigated.

---

## 0 · The headline

**aof has material in all three layers, but only ONE memory procedure — and it serves the semantic
layer alone.** The procedure is `feedback → STATE → retrospective → RETROSPECTIVE.md → ingest → recall`,
and it works: the 05 spike proved a lesson written in milestone N reaches the architect in N+1, and 44
of 71 `ARCHITECTURE.md` files carry a *"Memory recall — what was surfaced, and what it changed"* section
in which recalled records are honoured or departed from in writing. Five findings say where it stops:

1. **The write side has no vocabulary hold.** `retrospective.md` prescribes four `Kind` values; the
   corpus has **36** spellings and **91 of 461 lessons (20%) carry a blank Kind**. The one filter the
   developer edge uses (`--kind near-miss`) can never reach those 91. `Area` and `Stage` sprawl the
   same way (70+ and 60+ spellings for 5- and 3-value enums). Nothing in `validate` or `doctor` checks
   the meta line.
2. **The read side is asymmetric.** The refine edge is run and recorded (44/71 ARCHITECTURE); the build
   edge is recorded in **9 of 85** `VERIFICATION.md` files. Recorded ≠ run, but recorded is the only
   evidence there is.
3. **The loop is open — the reel's commenter is right.** *"How do you know what got added to memory is
   complete and accurate and will actually fix it next time?"* aof cannot answer: no record of which
   lessons were surfaced, none of whether they were honoured, and no recurrence detection. The
   retrospective dedups only against the same file's `R<n>`. 23 lesson lines self-report a recurrence
   in prose; the operator's own memory index records one lesson "caught 3× in one evening".
4. **Episodic memory is captured and never read back through memory.** 174 run records, 32 raw
   feedback entries in 11 `FEEDBACK.ndjson` ledgers, 7 observability snapshots and 85 findings
   documents exist; the retrospective reads some of them ONCE at close; `aof work tune` reads
   lessons + lineage + observations. None is a memory record. A developer on attempt 2 cannot ask
   "what happened on attempt 1" through the seam.
5. **Procedural memory is split across four stores with no capture edge and no reconciliation.** A
   lesson's `**Lesson:**` line is the one-sentence residue of a procedure; the procedures themselves
   live in the bundle prompts (framework), `.claude/rules/` (repo, 1 file), and the operator's Claude
   Code auto-memory (**61 entries, 30 of them `feedback` with Why/How-to-apply** — outside the repo,
   invisible to aof recall and to every worker node). The two stores overlap (the worktree-junction
   lesson is in both) and neither knows the other exists.

The procedure this document proposes (§6) adds no store and no backend. It holds the vocabulary,
records each recall and its verdict, detects recurrence at the retrospective, indexes the episodic
sources that already exist, and gives every lesson a **promotion target** (rule → prompt → control) so
a lesson that keeps recurring is treated as a failed promotion rather than re-authored.

---

## 1 · The framing, and the sharper version of it

| Layer | The reel | What it means for a coding-agent harness |
|---|---|---|
| **Episodic** — what happened | Log every run so every human correction becomes data | Per-run records: what was attempted, what failed, what the reviewer said, what the human corrected |
| **Semantic** — what's true | Thousands of runs become stable facts about the business | Facts about *this* codebase and process: decisions (ADRs), delivered capabilities, open gaps, invariants |
| **Procedural** — what works | A solved edge case saved as a playbook to rerun | Runnable procedure: prompts, rules, skills, fitness functions — "before X do Y" in a form an agent executes rather than recalls |

Two critiques from the reel's comments carry the weight of this document:

- **Capture ≠ correction.** Memory-as-capture covers what the agent *didn't know*; it says nothing about
  what the agent *did wrong* and whether the stored thing prevents it next time. A memory procedure
  has to close that loop or it is a filing cabinet.
- **"Memory" is overloaded.** Facts, instructions and skills lumped together share a name and nothing
  else — they have different writers, different readers, different lifecycles. aof's `status` output
  reports "lessons / adrs" and nothing about which layer a record serves.

The Karpathy/Valrok note gives the test for the difference: *a cabinet understands exactly as much on
day one thousand as day one; a compiled wiki gets smarter while you do nothing.* aof's design is
deliberately a **cabinet with provenance** — the derived index (05/ADR-001) is rebuilt from the
markdown and every record resolves to `source:line`. That invariant is the right one and this document
keeps it. The *compilation* step in aof is the retrospective (a human or agent writes `R<n>`), and it is
the step that has no dedup, no vocabulary hold and no promotion — which is exactly where a cabinet
would stay a cabinet.

---

## 2 · Where each layer already lives in aof (measured)

Counts are over `wiki/work/**` (live + `archive/`) and the live index at
`.aof/aof.memory.graphify.index.json` (backend `graphify`, 2,490 records).

### 2.1 Episodic — captured, not indexed

| Source | Writer | Count | Read by | In memory? |
|---|---|---|---|---|
| Run records `<item>/runs/<node>/<runId>.json` (state, attempt, outcome, `failureReason`, spend, stalls) | `aof work run-start/complete`, the loop | **174** files under 30 `runs/` dirs | `aof work tune` (lineage), `run-status`, board | **No** |
| `FEEDBACK.ndjson` — append-only raw feedback + later classification (55/ADR-005) | `aof:feedback` → `src/feedback-records.mjs` | **11** files, **32** records | `commands/counters.mjs`, `commands/feedback.mjs`, `effects/doc-transitions.mjs` | **No** |
| `STATE.md ## Feedback (for retro)` — the human projection of the above | same | per item | `aof:retrospective`, then **archived at close** | No (compacted away) |
| `observability/{agents.json,report.md}` — per-agent time/tokens/stalls/diagnostics | `aof work observe --write` | **7** snapshots | retrospective (as evidence), `tune` | **No** |
| `VERIFICATION.md ## Findings` | `aof:verify` | **85** docs; `F-NN` headings in 36, `\| F-NN` table rows in 40 — **two grammars** | retrospective, `aof work doctor` | **No** |
| Session transcripts `~/.claude/projects/**/*.jsonl` | Claude Code | outside the repo | `aof work observe` | No |

The episodic layer is the largest untapped one, and it needs **no new writer** — every source above is
already written on every run. `declared-id.mjs` even has the `F` id form registered (`ID_FORMS`,
scope `register`) — the indexer imports only the document-scope half by a measured decision
(`local-indexing.mjs:32-37`: 0 of 343 ADR/R headings sit in a register block), which is the right
decision for lessons and the wrong one for findings.

### 2.2 Semantic — the strong layer

| Source | Record type | Count | Notes |
|---|---|---|---|
| `ARCHITECTURE.md ## ADR-NNN` | `adr` | **546** | area always `architecture`; status from the block |
| `OUTCOME.md ## Delivered ###` | `capability` | **1,088** | the largest class; a standing fact, no lifecycle |
| `OUTCOME.md ## Gaps ###` | `gap` | **381** — 348 `open`, 18 `discharged`, ~14 discharged-with-prose (11 spellings), 1 `open by decision` | the `status` field is free text; `--status discharged` is a substring match, so "discharged (2026-08-23, at 54's verify)" matches but nothing can count them |
| `AOF.md` digest sections (imported milestones) | `summary` | **14** | |
| `wiki/*.md` — the compiled pages (`memory.md`, `philosophy.md`, `documents.md`, …) | — | 11 pages | **Not indexed.** Human-maintained, and they drift: `wiki/memory.md` cites `src/work-memory.mjs` (moved to `src/work/memory.mjs` at story 128), says the recall hooks are "not yet built" (05/03 is `done`; the edges are in `continue.md:274`, `refine.md:138`, `shatter.md:45`), and reports 38 records with no backend selected (live: 2,490, `graphify`) |
| `TECH_DEBT.md` (bounded ledger) | — | per repo | not indexed; `aof work debt` reads it |

### 2.3 Procedural — four stores, no capture edge

| Store | What it holds | Writer | Reader | In memory? |
|---|---|---|---|---|
| `RETROSPECTIVE.md R<n> **Lesson:**` | one-sentence "what to do differently" | `aof:retrospective` | recall (3 edges), `tune` | **Yes** (`lesson`, 461) — but a sentence, not a playbook |
| Bundle prompts, agents, skills (`src/bundle/{commands,agents,skills}`) | the procedures agents actually run | aof milestones (framework code) | every run | No. `tune`'s `prompt-or-brief-revision` lane exists and is **advisory only** — `replacement-prose-not-computable` |
| `.claude/rules/*.md` | operator-authored repo procedure (deploy/restart/test isolation) | operator | every Claude session in this repo | No |
| Claude Code auto-memory `~/.claude/projects/<repo-slug>/memory/*.md` | **61** entries: 30 `feedback` (with `**Why:**` / `**How to apply:**`), 24 `project`, 7 other | the operator's sessions | the operator's sessions on this node only | No — and unreachable from the Mac/WSL workers |
| Bundle skills | 3 (`codex-*`) — none extracted from finished work | | | No |

The auto-memory store is the closest thing on this machine to the reel's procedural layer — every
entry has a *why* and a *how to apply*, which is the shape a `**Lesson:**` line lacks — and it
duplicates aof lessons without reconciliation. Measured on one example: "never junction shared
`node_modules` into a worktree" exists there AND as m45/R13, m68/R10 and 72/ADR-007. Neither store
can tell you the other has it.

---

## 3 · The one procedure aof has today, and where it leaks

```
  run ──► aof:feedback ──► FEEDBACK.ndjson + STATE ## Feedback (for retro)
                                              │
  close ─► aof:verify ── step 5 ──► aof:retrospective ──► RETROSPECTIVE.md R<n>
                                              │                  (+ ARCHITECTURE ADRs, OUTCOME)
                                              ▼
                                   aof work memory ingest ──► derived index (.aof/, git-ignored)
                                              │
  next item ─► recall edges:  shatter (PO, no scope)        ─┐
                              refine  (architect --area architecture; PO --item) ├─► "--block" (5 lines, ~940 B)
                              continue (developer --kind near-miss) ─┘
                                              │
                              ARCHITECTURE "## Memory recall — what was surfaced, and what it changed"
                              VERIFICATION   "any that shaped the build"   (prose, unparsed)
```

Read against the three layers, the leaks are:

| # | Leak | Measured | Layer |
|---|---|---|---|
| L1 | **No vocabulary hold on the meta line.** `Kind` enum is 4 values; 320/461 lessons (69%) use one exactly, 91 (20%) are blank, ~50 use a parenthetical variant (`near-miss (recurring)`, `mistake (test deadlock)`). Blank lessons match no `--kind` filter; the variants match only because `applyScope` is a substring filter. `Stage` exact-conformant 286/461; `Area` 288/461. | `node -e` over the index, §8 | semantic (write) |
| L2 | **Read-side asymmetry.** 44/71 ARCHITECTURE record the refine recall; 9/85 VERIFICATION record the build recall; 11 STATE files mention one. `brief` is called by **no** bundle prompt. | `grep -rli` | all (read) |
| L3 | **No honour/recur accounting.** The ARCHITECTURE section is the right shape — *"each honoured or departed from in writing"* — but it is prose; nothing counts per lesson how often it was surfaced, honoured, or recurred. Recurrence is self-reported in 23 lines. | `grep` | close-the-loop |
| L4 | **Episodic never enters memory.** The retrospective reads STATE/VERIFICATION/observability once; `tune` reads lessons + lineage + observations through its own corpus module, not the seam. The seam's `recall --item NN` returns lessons/ADRs/capabilities about NN, never its runs or findings. | §2.1 | episodic |
| L5 | **Retrospective dedups within one file.** `retrospective.md:50`: "Dedup against any existing `R<n>` entries" — the same document. A lesson learned in m45 and re-learned in m68 becomes two records ranked side by side. | prompt text | semantic → procedural |
| L6 | **No promotion path.** A lesson stays a lesson. ACD already has the gradient — lesson → `.claude/rules` → bundle prompt → fitness function (the strongest form: a lesson that became a control no longer needs remembering) — but no field names where a lesson went, and no check asks why a lesson older than N milestones is still only a lesson. | `RETROSPECTIVE` template fields | procedural |
| L7 | **Gap status is free text.** 348 open gaps; the discharge date and cause are written into the `status` field in 11 spellings. | index | semantic |
| L8 | **The compiled wiki drifts and is not in memory.** `wiki/memory.md` is stale in three places (§2.2). | read | semantic |
| L9 | **Retrieval is keyword-only** (BM25-lite + title boost + a graph re-rank still stubbed at 10/01). **Not the bottleneck**: the injected block is 5 lines / ~940 B, against 3.6 MB of cache-create per spawn ([loop-economics §0](./RESEARCH-agent-loop-economics.md)). | `wc -c` | read |

L1, L3, L5 and L6 are the four that make the loop open. L4 is the missing layer. L9 is deliberately
left alone.

---

## 4 · What the three layers demand of a procedure

A memory procedure, per layer, has four moves: **capture** (when, who, into what) → **compile** (what
turns raw into a record) → **recall** (which edge, which scope) → **close** (how we know it worked).
Constraints kept from the existing design, none negotiable here:

- the index is derived, rebuildable, every record `source:line` (05/ADR-001, ADR-005) — a JSON source
  resolves to `path:` + a JSON pointer, not a line;
- selection in one place, backend behind `{name, recall, reindex, status}` (05/ADR-002/003);
- the index never rides the mesh (`acd-memory-index-never-on-mesh`);
- extend existing surfaces, never add a sibling store — `FEEDBACK.ndjson` is the append-only ledger
  an item already has; `MemoryRecord` is frozen but versioned (`INDEX_VERSION`), and a field added
  under a version bump is the sanctioned change;
- no per-turn injection (the cache argument in TencentDB §2.1 holds); `--block` stays a tool-call at
  a declared edge.

### 4.1 Episodic — "what happened"

| Move | Today | Proposed |
|---|---|---|
| Capture | run records, `FEEDBACK.ndjson`, observability, findings — all written | **nothing new to write** |
| Compile | none | three additive record types under an `INDEX_VERSION` bump: `finding` (VERIFICATION `F-NN` headings AND `\| F-NN` rows, via the `F` form already in `ID_FORMS`), `feedback` (raw `FEEDBACK.ndjson` entries, `source: <path>:#<index>`), `run` (terminal run records only — `outcome`, `failureReason`, `attempt`, stalls from the matching observability agent). `area` = `delivery`, `stage` = the loop phase from `brief.loop.phase`, `status` = outcome |
| Recall | `--item NN` returns nothing episodic | two new edges: **`aof:continue` on `attempt > 1`** runs `recall "<story keywords>" --item <ref> --stage build --limit 5` and must acknowledge the prior attempt's `failureReason` and findings before building; **`aof:verify` at finding triage** runs `recall "<finding text>" --kind finding` to dedup a new finding against every prior one across the stream |
| Close | — | the retrospective's evidence-gathering step reads episodic records **through recall**, not raw files — so the compile step is also the proof the records are recallable |

### 4.2 Semantic — "what's true"

| Move | Today | Proposed |
|---|---|---|
| Capture | ADR / OUTCOME / AOF.md — works | unchanged |
| Compile | parsers mint records; meta line free text | **a normaliser in `parseRetrospective`**: `kind` is the enum token if the value starts with one (`near-miss (recurring)` → `kind: near-miss`), the parenthetical becomes a `tags` field (new, present-as-`""`); same for `stage` (`build (caught at review)` → `build`) and `area`; gap `status` → `open \| discharged \| open-by-decision` with the date/cause moved to `tags`. **A validate rule** (advisory for archived items, error for live ones) that a `R<n>` meta line carries the four fields with enum values — the missing hold behind L1 |
| Recall | 3 edges | unchanged; report `tags` in the block line |
| Close | — | `aof work memory status` reports blank-kind and non-enum counts, so the ratchet is visible |

The compiled wiki (L8) is a separate, smaller item: a doctor probe that every `src/` path a `wiki/*.md`
page cites resolves — `cited-path-resolve.mjs` (119/ADR-004) is already the one resolver — and a
rewrite of `wiki/memory.md` against this document. Indexing the wiki pages as records is **not**
recommended: they are compilations of the records already indexed, and a second copy is what the
derived-index rule refuses.

### 4.3 Procedural — "what works"

This is the layer with the biggest gap and the one where a new store is the tempting wrong answer.
The right answer is the gradient ACD already runs on:

```
   lesson (R<n>)  ──►  rule (.claude/rules/*.md)  ──►  prompt (src/bundle/**)  ──►  control (fitness function)
   "remember it"        "read it every session"        "the agent is told it"       "the agent cannot do otherwise"
```

| Move | Today | Proposed |
|---|---|---|
| Capture | the `**Lesson:**` line | one added meta field on every new `R<n>`: `**Promoted to:** control:<id> \| rule:<path> \| prompt:<path> \| none` — authored at the retrospective, indexed into `status` (a lesson's `status` is `""` today; `promoted`/`unpromoted` reuses the frozen field the way gaps reuse it) |
| Compile | — | `aof work doctor` (advisory) lists lessons with `none` older than N accepted milestones and any lesson that **recurs** (§4.4) — the signal that a lesson needed a control, not a second lesson |
| Recall | the developer's `--kind near-miss` | unchanged; the block line shows the promotion so an agent sees "this is already a control" and does not re-argue it |
| Close | `tune`'s prompt lane is advisory | the promotion field gives `tune` its missing target: a recurring lesson with `prompt:<path>` IS a computable proposal (the path + the lesson text), which lifts `prompt-or-brief-revision` out of `replacement-prose-not-computable` for that class |

**The operator's auto-memory (61 entries).** Two honest options. *(a)* Leave it separate — it is
per-user, per-node, and holds session-scoped preferences beside project lessons. *(b)* A read-only
**source adapter** behind config (`memory.sources: ["claude-auto-memory"]`, off by default) that
indexes `type: feedback` and `type: project` entries as `lesson` records with `owner: operator`,
`source: <abs path>:1`, on the node that has them. It changes no store, respects the derived-index rule
(the file is the source), and is the cheapest way to get the *why / how-to-apply* shape in front of an
agent on this node. Recommendation: **(b), opt-in**, after the corpus fixes — with the note that a
worker node never sees it, so anything a worker must know still has to graduate to a rule or a control.

### 4.4 Closing the loop — answering the critique

Three additions, all on existing surfaces:

1. **A recall ledger.** Every `--block` recall an agent runs at a declared edge appends one
   `kind: "recall"` entry to the item's `FEEDBACK.ndjson` (the same append-only ledger, one more
   `kind`): the query, the record ids returned, and — written by the same agent when it records its
   decision — a verdict per record: `honoured \| departed \| irrelevant`. The ARCHITECTURE prose
   section stays as the human reading; the ledger is what can be counted.
2. **Recurrence at the retrospective.** Before writing a new `R<n>`, the retrospective runs
   `recall "<the lesson text>" --kind <kind> --limit 3`. A prior lesson above a score threshold makes
   the new entry carry `**Recurs:** m45/R13` (indexed into `tags`), and doctor counts it. A recurrence
   is the one measurement the reel's commenter asked for: the stored thing did **not** fix it.
3. **Per-lesson accounting in `status`.** `aof work memory status --json` gains, per record type and
   per lesson on request, `surfaced / honoured / recurred` from the ledger — the number that says
   whether memory is compounding or accumulating.

A fourth, cheap and separate: a **fixed retrieval eval** — ~20 `(query → expected record id)` pairs
from real decisions (the 05 spike had two: "content addressed hash cross platform" → R2 pin line
endings; "fitness function asserts a symbol appears in a file" → R1 requiring-grep smell) kept green as
an arch test, so the ranking cannot regress silently when the graph re-rank term finally lands.

---

## 5 · What not to do

- **No LLM-authored accretive store.** The TencentDB verdict stands: L1–L3 extraction is a second,
  non-reproducible corpus. aof's compile step is the retrospective, run by an agent under a prompt,
  producing a doc a human can read and git can diff.
- **No sibling ledger, no `PROCEDURES.md`.** The procedural layer is the gradient in §4.3; a fifth
  store would be a sixth spelling of the same lesson.
- **No new backend, no vector store.** L9 is not the bottleneck; a 940-byte block is not where the
  tokens go.
- **No per-turn injection.** The recall stays a tool-call at a declared edge.
- **No renaming of the seam.** But do name the layers: `status` should say which record types are
  episodic / semantic / procedural, because the overload critique is real and `lessons / adrs` is not an
  answer to "what does aof remember".

---

## 6 · The memory procedure, stated

Written as the stage each move belongs to. **(exists)** = already delivered; **(new)** = this document.

**1 · During a run — episodic capture.**
`aof:feedback` appends to `FEEDBACK.ndjson` and projects to STATE (exists). Run records and heartbeats
are written by the loop (exists). Every `--block` recall appends a `recall` ledger entry (new). Nothing
is authored by hand.

**2 · Before a decision — recall.**
Three edges (exists): shatter/PO unscoped; refine/architect `--area architecture` and PO `--item`;
continue/developer `--kind near-miss`. Two more (new): continue on a retry recalls the item's own
episodic records; verify at triage recalls prior findings. Every recall's records get a verdict in the
ledger when the decision is recorded (new). `brief` is either wired into a session-start edge or
retired (new — decide; today it has no caller).

**3 · At close — compile.**
`aof:verify` step 5 runs `aof:retrospective` (exists). The retrospective: gathers evidence **through
recall** over the item's episodic records (new); dedups against the **whole** index and stamps
`**Recurs:**` (new); writes each `R<n>` with the four enum-valued meta fields, validated (new); names a
`**Promoted to:**` target for each lesson (new). `aof work memory ingest` folds it in (exists).

**4 · After close — ingest and check.**
Ingest rebuilds the derived index with the added record types (new) under an `INDEX_VERSION` bump.
`aof work doctor` reports blank/non-enum meta, unpromoted lessons past the age threshold, and
recurrences (new).

**5 · Periodically — the hill-climb.**
`aof work tune <range>` (exists, m62) reads lessons, lineage and observations; with the ledger and
the promotion field it gains the two inputs it lacks — *which lessons keep being surfaced and
departed from*, and *which recur* — and the prompt lane becomes computable for lessons that name a
`prompt:` target (new). This is the "close the hill-climbing loop" arc in
[PRD-acd-loop-engineering.md](./PRD-acd-loop-engineering.md) ("The self-improvement (hill-climbing) loop", in scope), not a new arc.

---

## 7 · Verdicts and the recommended next step

| Question | Answer |
|---|---|
| Does aof need a new memory system? | **No.** It needs the procedure around the one it has — and it needs the episodic layer indexed. |
| Which layer is weakest? | **Procedural**, then episodic. Semantic is strong and only needs a vocabulary hold. |
| What is the single highest-value change? | **The recall ledger + recurrence stamp** (§4.4 items 1–2). They are what turns "we wrote it down" into "it stopped happening", and they are the direct answer to the critique. |
| Cheapest first change? | **The meta-line normaliser + validate rule** (§4.2). It reaches the 20% of lessons no filter can, and it is a parser change plus one rule. |
| Bring the operator's Claude auto-memory in? | **Opt-in read-only adapter**, after the corpus fixes; never as a worker-facing store. |
| Index `wiki/*.md`? | **No** — fix drift with a citation probe and rewrite `wiki/memory.md`. |
| Is `aof work tune` the right home for the loop closure? | **Yes**, given the two new inputs; do not build a second analysis pass. |

**Recommended shape: one milestone, not a PRD.** The seam exists and every change is additive inside
it. Stories, in dependency order:

1. **Meta-line vocabulary** — normaliser + `tags` field + validate rule + `status` counts (L1, L7).
2. **Recall ledger + verdicts** — the `recall` kind on `FEEDBACK.ndjson`, the three edges write it,
   `status` reads it (L3).
3. **Recurrence + promotion at the retrospective** — whole-index dedup, `**Recurs:**`,
   `**Promoted to:**`, doctor probes (L5, L6).
4. **Episodic record types** — `finding`, `feedback`, `run`; the retry and triage recall edges (L4).
5. **The retrieval eval** — 20 pairs as an arch test (guards L9 as the re-rank lands).
6. *(opt-in, last)* **Auto-memory source adapter**, and the `wiki/memory.md` rewrite (L8).

Story 3 is the one to refine with care: it changes what an agent writes at the close, and the
"Delivered acceptance criteria are immutable" rule means archived retrospectives are never
back-filled — the promotion and recurrence fields apply forward, and doctor reports them as advisory
on archived items.

---

## 8 · Sources and measurements

**Inbox notes (Obsidian `Openclaw/Inbox/`, 2026-08-24):** `Agent memory episodic semantic procedural.md`
(Romi Patel, instagram.com/reel/DcbHSb1Ib3N/); `Karpathy 3-folder wiki retrieval vs compilation.md`
(Valrok, x.com/v1lrok/status/2097780283332325609); `MegaMemory persistent memory for coding agents.md`
(github.com/0xK3vin/MegaMemory — not read; the note's claim only).

**aof — code read:** `src/work/memory.mjs` (seam, verbs, `SCOPE_FLAGS`, backend registry),
`src/commands/work/memory.mjs` (the routed door), `src/memory/{local-indexing,local-retrieval,
graphify-backend,local-backend,none-backend}.mjs` (parsers, `MEMORY_RECORD_FIELDS`, `SCOPE_FIELDS`,
`INDEX_VERSION`, ranking), `src/declared-id.mjs` (`ID_FORMS`), `src/feedback-records.mjs`,
`src/work-tune/{corpus,proposal}.mjs` + `src/commands/tune.mjs`, `src/cited-path-resolve.mjs`.

**aof — prompts read:** `src/bundle/commands/{retrospective,verify,continue,refine,shatter}.md`,
`src/bundle/loops/retrospective-memory-ingest.md`.

**aof — prior research:** `RESEARCH-tencentdb-agent-memory.md` §2.1, §5; `RESEARCH-agent-loop-economics.md`
§0 (3.6 MB cache-create per spawn); `PRD-acd-loop-engineering.md` (self-improvement arc); `wiki/memory.md`;
`wiki/work/archive/05_milestone_work-memory/spike/FINDINGS.md`.

**Measurements (2026-09-17, this tree, branch `127-129`):**

| Figure | Command |
|---|---|
| 2,490 records; 461 / 546 / 1,088 / 381 / 14 by type; Kind/Area/Stage/gap-status distributions | `aof work memory status --json`; `node -e` tally over `.aof/aof.memory.graphify.index.json` `records[]` grouping by `recordType`, `kind`, `area`, `stage`, `status` |
| 109 RETROSPECTIVE · 85 VERIFICATION · 71 ARCHITECTURE · 180 OUTCOME | `find wiki/work -name <doc> \| wc -l` |
| 44 / 9 / 11 docs recording a recall | `grep -rli "memory recall\|recalled\|recall.*near-miss" --include=<doc> wiki/work` |
| 0 recorded empty recalls, 11 honoured/departed verdict lines | `grep -A10 "## Memory recall" --include=ARCHITECTURE.md` filtered on `honoured\|departed\|shaped` |
| 174 run records in 30 `runs/` dirs; 7 observability snapshots; 11 `FEEDBACK.ndjson` / 32 records | `find`, `cat … \| wc -l` |
| Findings grammar: 79 `## Findings`, 35 `### F-`, 40 files with `\| F-NN` rows | `grep -rhoE "^#{2,4} +(F-\|Findings)"`, `grep -rlE "^\| *F-[0-9]+"` |
| 23 recurrence self-reports | `grep -rhi "recurred\|recurring\|again in m\|for the third time\|caught 3" --include=RETROSPECTIVE.md` |
| 61 auto-memory entries (30 feedback, 24 project) | `ls ~/.claude/projects/<repo-slug>/memory/*.md`; `grep -l "type: feedback"` |
| Block size 938 B, 5 lines | `aof work memory recall "worktree lane merge test isolation" --kind near-miss --block \| wc -c` |
| Junction lesson in both stores | `aof work memory recall "worktree node_modules junction deletes ui tree" --block` → m45/R13, m68/R10, 72/ADR-007 |
| No enum hold | `grep -rn "near-miss" src/work/*.mjs` → only prose comments |
| `wiki/memory.md` drift | `ls src/work-memory.mjs` → absent; `05/stories/03_story_memory-hooks/STORY.md` → `status: done` |
