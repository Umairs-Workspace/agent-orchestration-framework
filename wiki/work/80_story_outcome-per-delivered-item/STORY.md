---
type: story
number: 80
slug: outcome-per-delivered-item
title: "Every item that delivers says what it delivered — not only milestones"
status: done
owner: product-owner
created: 2026-08-20
updated: 2026-08-20
depends: []
schema: 1
aofVersion: 0.1.0
---
# 80 · Every item that delivers says what it delivered — not only milestones

## User story

As someone picking up a codebase through its work stream — an agent at `aof:refine`, or a person
asking what the system can do now,
I want every item that DELIVERS something to carry an `OUTCOME.md` stating what the system now is,
so that the delivered capabilities of the stream can be read and aggregated from one document class
instead of being reconstructed from milestone-shaped fragments and whatever a story's tasks happened
to be called.

## Why

`OUTCOME.md` is milestone-only today, and the boundary is an accident of where the template was
filed rather than a property of the document.

- **The document already models an ITEM, not a milestone.** `.aof/templates/work/milestone/OUTCOME.md`
  opens `# NN · <Item Title> — Outcome` and its own comment says *"what this item now delivers"*. It
  carries no identity frontmatter and is never a record doc — so nothing in its content is
  milestone-shaped.
- **The consumer is already type-agnostic.** `src/memory/local-indexing.mjs:676` joins `OUTCOME.md`
  onto `item.dir` and parses it for EVERY item it scans, whatever the type. The `capability`/`gap`
  `MemoryRecord`s (39/ADR-001/ADR-002) would index a story's outcome the day one exists. The
  aggregation surface this story wants is built; nothing writes into it below milestone level.
- **What actually scopes it is two things, both editable.** The template lives under
  `.aof/templates/work/milestone/`, and `src/bundle/commands/verify.md:148` instantiates it only
  "when accepting a MILESTONE whose stories are all done". `test/arch/acd-outcome-authored-by-verify`
  pins only that `recordDoc` never resolves to `OUTCOME.md` and that verify is its sole author —
  neither of which is a statement about type.
- **A parentless story has nowhere for the statement to go at all.** Stories 73 and 74 each delivered
  a capability with no milestone above them, so no `OUTCOME.md` is ever authored for either, and what
  the system now IS as a result is recoverable only by reading their accept blocks. Raised at 74's
  accept as its finding **F-74-F**.
- **And the register a parentless story keeps is not a register.** `aof work doctor`'s
  `REGISTER_FILES` is `["ARCHITECTURE.md", "VERIFICATION.md", "SESSION.md"]`
  (`src/work-doctor-controls.mjs:340`), so the findings registers stories 73 and 74 carry inside
  `STORY.md` are invisible to `register-duplicate-id` and `register-dangling-citation` alike — and a
  qualified citation of 74's finding from THIS document is reported dangling, correctly, because item
  74 declares nothing the checker can see. That is why the references above are prose: the qualified
  form promises resolvability the current doc set cannot give. Measured while writing this story.
- **A chore's checklist says what was DONE, not what the system now IS.** "Ticked: pin the rendered
  tree `text eol=lf`" is an act; "the rendered tree is byte-stable across platforms" is the product
  state a later reader needs. ADR-003 keeps a chore ceremony-light on purpose, and this must not
  quietly turn one into a story — the deliverable stays a ticked checklist, plus one statement of
  what the ticking made true.

## Notes

**Scope sketch, not a design.** `aof:verify` authors an `OUTCOME.md` at Accept for a **story** and a
**chore** as well as a milestone, from a template that is no longer filed under one type. It stays an
ADDITIONAL artifact for every type — `recordDoc` must still never resolve to it, and `SPEC.md` /
`STORY.md` / `CHORE.md` stay the identity records.

**Open for refine to decide** — each of these changes the shape of the work, and none should be
settled here:

- **Which types.** The ask is stories and chores. A `spike`'s whole deliverable is already a recorded
  finding in `SPIKE.md`, and a `uat` session's is a verdict in `SESSION.md` — so both plausibly carry
  no outcome, and that should be a stated decision rather than an omission.
- **Whether a milestone's outcome AGGREGATES its stories' outcomes** or stays independently authored.
  Aggregation is the point the ask names; it also risks a milestone outcome that is a concatenation
  rather than a statement, and risks two writers for one fact.
- **Where the template lives** once it is not milestone-only (`.aof/templates/work/OUTCOME.md`, or a
  copy per type), and what that does to the bundle manifest, the install lock and
  `acd-bundle-asset-manifest-complete`'s file-count tripwire.
- **The doc budget.** `aof work doctor`'s `doc-over-budget` already fires on stories 73 and 74 because
  a parentless story has nowhere but `STORY.md` for its verification record; adding a second Accept-time
  artifact for stories touches the same seam (74's `F-74-F`).

**Prompted by** the accept of story **74** (`status-refusal-as-data`, 2026-08-20) — the question "do
outcomes not get created for stories and chores?", and the finding it widened.

## Refine decisions

Each answers a bullet `## Notes` left open. The reasoning is in the task each names — this is the
index, not a second copy of it.

- **Which types.** `milestone`, `story` and `chore` carry an outcome; `spike` and `uat` carry none,
  and both exclusions are written INTO the verify prompt rather than left as an omission. A spike
  delivers knowledge (`SPIKE.md` `## Finding`), a uat a verdict over items that already carry their
  own outcomes — an outcome there would index one capability twice. → `tasks/01`.
- **Aggregation.** A milestone's outcome is **independently authored, never a concatenation**. The
  aggregation happens in the INDEX (`buildRecords` already unions every item's records into one recall
  surface), so a milestone that restates a story's capability writes one fact twice. The milestone
  states what is true at its own level; where a story states a capability whole, it cites it as
  `m<NN/SS>/<id>`. → `tasks/01`.
- **Where the template lives.** ONE copy, at a member filed under no type: source
  `src/bundle/templates/shared/OUTCOME.md`, rendered `.aof/templates/work/shared/OUTCOME.md`. A copy
  per type is three sources for one parsed grammar. The render path is `member.id`-derived
  (`work-bundle.mjs:195`), and nothing reads `.aof/templates/work/*` as a type list — `insert-shared.mjs:183`
  indexes BY type out of `DOCS_BY_TYPE`, which deliberately excludes OUTCOME.md. The milestone-filed
  copy is DELETED on `aof work update` (`planApplyActions` classifies delete against the prior lock),
  not left as a second un-updated grammar in every existing install. → `tasks/00`.
- **The doc budget.** `OUTCOME.md` stays **unbudgeted for every type** — `BUDGET_KEY` covers SPEC /
  ARCHITECTURE / STORY / `*.feature` and gains no new kind. The second Accept-time artifact does not
  add a `doc-over-budget` finding; it relieves the one 73 and 74 already fire, by giving
  delivered-state somewhere to live other than `STORY.md`. → `tasks/00`.

**Correction to `## Why`, measured at refine.** "The consumer is already type-agnostic … would index a
story's outcome the day one exists" is **not true today**. `local-indexing.mjs:676` is type-agnostic in
its BODY, but the set it iterates is `items.filter(item => item.type === "milestone" && item.parent == null)`
(`:644`) — a story's or chore's `OUTCOME.md` is never opened. Widening that scan is therefore a
load-bearing deliverable of this story, not a free ride. It drags two consequences with it: a record's
`item` must carry the **ref** rather than the number (recall renders `m${record.item}`, so a nested
story `39/02` would cite `m02` — a different, real milestone), and the `--item` / `--only` scopes must
then match the **subtree** or a milestone-scoped recall stops seeing its own stories. → `tasks/02`.

## Tasks

- [x] `tasks/00_the-template-has-one-home.feature` — the OUTCOME template ships once under a member
      that is not a type, renders to `.aof/templates/work/shared/OUTCOME.md`, and the milestone-filed
      copy is deleted (not orphaned) on `aof work update`. Grammar byte-identical across the move;
      the artifact stays unbudgeted for every type.
- [x] `tasks/01_verify-authors-one-per-delivering-type.feature` — `aof:verify` authors an OUTCOME.md
      at Accept for a milestone, a story and a chore, and the prompt SAYS that a spike and a uat carry
      none. `recordDoc` still never resolves to it; a milestone's outcome is authored, never a
      concatenation of its stories'.
- [x] `tasks/02_the-index-reads-an-outcome-from-any-item.feature` — the scan widens past top-level
      milestones, records cite by ref, and the `--item` / `--only` scopes match the subtree. One edit
      at the shared `buildRecords` seam, frozen record shape, index versions unmoved.

## Verification evidence

Verified 2026-08-20 (`aof:verify 80 --solo` — one session, no evidence subagents; the product owner
is the sole author of this record). The build's `## Build notes (for retro)` were triaged here and
into `RETROSPECTIVE.md`, and the section archived — the parentless-story equivalent of a milestone's
STATE compaction.

**The suite, scoped to the story (the story gate, not the repo's).** Run through a focused
test-array runner, each case under its own throwaway `AOF_GLOBAL_HOME` exactly as the suite entry
point does — `node --test` on these files is a silent false pass (0 assertions), so the array is the
only honest lane. The full repo suite is not runnable on this machine (`global-work-propagation`
binds `:4182`, held by the live control daemon); it runs at the branch gate. **442 cases across 38
suites, 442 green.**

- **The story's own three lanes: 42/42 green.** `outcome-template-shared-home` (15) covers every
  `@executable` scenario of task 00 — the single declared member whose id is no work-item type, the
  marker-stamped render at `.aof/templates/work/shared/OUTCOME.md`, the byte-identical grammar
  outline, the type-names-absent prose check, the update plan's delete-then-skip, manifest
  completeness, and the unbudgeted outline over milestone/story/chore.
  `verify-outcome-per-type` (13) covers task 01's `@executable` set — the prompt naming each type's
  answer, the developer agent still never instructed to author one, the recordDoc outline over all
  five types, validate/doctor unchanged by the artifact's presence, and a chore's Delivered-only
  outcome parsing to one capability and no gap. `outcome-index-any-item` (14) covers task 02 whole.
  *verifies →* `tasks/00_the-template-has-one-home.feature`,
  `tasks/01_verify-authors-one-per-delivering-type.feature`,
  `tasks/02_the-index-reads-an-outcome-from-any-item.feature`
- **Milestone 39's delivered contract, which this story widens: 60/60 green.** `outcome-template`
  (8), `verify-authors-outcome` (6), `outcome-parse-records` (13), `capability-recall-surfaces` (6),
  `gap-carries-discharge` (7), `promote-gap-to-chore` (9), `scope-flags-fields-agree` (1) — plus 39's
  six architectural controls (`acd-outcome-record-frozen-shape`, `-single-index-seam`,
  `-capability-ranking-bounded`, `-authored-by-verify`, `-dangling-declaration-present`,
  `-declared-field-has-producer`, 17 cases) and the seven memory/budget controls, all green.
- **Every other seam the diff touches: 340/340 green.** `memory-indexing` (38), `memory-retrieval`
  (29), `work-memory-seam` (50), `work-validate` (45), `work-doctor-controls` (29),
  `verification-template` (25), `bundle` (19), `work-update` (18), `import-into-memory` (18),
  `doctor-context-budget` (10), `dangling-declaration-ff` (10), `graphify-reindex` (8),
  `graphify-recall` (6), `memory-recall-block` (5), `bundle-asset-manifest-complete` (3).

**`@manual` — the widening measured on the REAL stream, not a fixture** (task 02). This story's own
`OUTCOME.md` is the first ever authored below milestone level, so the before/after is observable on
this repo rather than in a fixture. Both runs indexed the same working tree with the file on disk;
only the indexer differed:

| indexer | total records | records for item `80` | capability | gap |
|---|---|---|---|---|
| `HEAD:src/memory/local-indexing.mjs` | 793 | **0** | 95 | 63 |
| delivered | 804 | **11** | 103 | 66 |

The eleven are eight capabilities and three gaps, each carrying `item: "80"`, each gap carrying
`status: open`, and the field set is identical to a milestone record's — the frozen `MemoryRecord`
gained nothing. `adr` (356) and `lesson` (277) are unmoved by the widening.
*verifies →* `tasks/02_the-index-reads-an-outcome-from-any-item.feature`

**`@manual` — Accept authors an outcome for a delivering item, and none for a non-delivering one**
(task 01). The `story` row was executed live: this run authored
`80_story_outcome-per-delivered-item/OUTCOME.md`, `STORY.md` remains the record doc, and the accept
decision below is recorded in `STORY.md`, not in the outcome. The `milestone` row is the pre-existing
behaviour, unchanged (eleven milestone outcomes in the stream). The `chore` row's branch was read at
the shipped prompt and is asserted by task 01's contract check, but no chore was pending accept this
session, so it is not live-observed — the next chore accept is its first execution. The `spike` and
`uat` rows are stated exclusions in the prompt; all three runtime renders (`.claude`, `.codex`,
`.opencode`) carry them.
*verifies →* `tasks/01_verify-authors-one-per-delivering-type.feature`

**`@manual` — a Delivered entry is admitted only when it states product state, not motive.** Judged
at authoring, all four rows as contracted: "the rendered tree is byte-stable across platforms" and
"`--if-applicable` narrows exactly one refusal code to an exit-0 report" **admitted**; "we pinned the
tree to LF so Windows checkouts stop churning" and "for testing purposes" **refused** — motive and
reasoning, which belong in `RETROSPECTIVE.md`. Applied to this story's own eight capabilities: each
states what the system now IS, and the reasoning behind the moves sits in `RETROSPECTIVE.md` R1–R5.
*verifies →* `tasks/01_verify-authors-one-per-delivering-type.feature`

**`@manual` — a milestone's outcome states milestone-level state and does not restate a story's** is
NOT live-observable yet: no milestone in this stream has a story carrying an authored outcome,
because this story is the first to author one below milestone level. The rule is encoded in the
shipped prompt (authored, never a concatenation; cite `m<NN/SS>/<id>` where a story states a
capability whole) and its first execution is the next milestone accept whose stories carry outcomes.
Named rather than claimed.

**Template home, live.** `.aof/templates/work/shared/OUTCOME.md` is present,
`.aof/templates/work/milestone/` no longer contains an `OUTCOME.md` (its nine other templates
remain), and `.aof/aof.lock.json` records the new path and only the new path — the delete landed in
this repo's own install, not only in the update plan's fixtures.
*verifies →* `tasks/00_the-template-has-one-home.feature`

## Findings

No blocking finding. Five recorded, ids allocated here at landing by the single writer of this
record. Two of them (F-80-A, F-80-B) are **not this story's** — they are red in the working tree and
are recorded because this verify is what measured them.

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-80-A | **Not this story — pre-existing.** FF-5308 (`arch/acd-loop-scope-guard`) pins BOTH `inRange`'s function body and a whole-file sha of `src/work.mjs`. The function pin — what the control names and actually guards — is **green**. The file pin is red: pinned `e1e0fabd…`, worktree `c38f47fc…`. Attributed by measurement: `HEAD:src/work.mjs` hashes to exactly `e1e0fabd…`, so the control was GREEN at HEAD; and the worktree reconstructed WITHOUT this story's seven-line comment still hashes to `27562ae3…`, so the red is the uncommitted story 74 work and this story's comment-only edit widens nothing the control describes. Overlaps story 74's finding **F-74-D**, the same file's two stale ratchets | test-gap | medium | non-blocker → chore: narrow FF-5308 to the `inRange` cut it names, or re-baseline the file pin at what 73+74+80 actually left. A whole-file pin on the god node reds on any edit by any story, and milestone 53 is done | chore / backlog | open |
| F-80-B | **Not this story — invalidated by m39.** `memory-integration`'s "the lesson/adr split sums to the record count" asserts `lessons + adrs === recordCount`; m39 added the `capability` and `gap` kinds (and m13 `summary`), so the sum has been short ever since. Measured across this change: `adr` 356 + `lesson` 277 = 633 before AND after, against 793 → 804 — the eleven added are capability/gap only, exactly the kinds the assertion ignores | test-gap | low | non-blocker → chore: assert the split over the kinds it names, or sum every kind. The message describes a model of the index that m39 retired | chore / backlog | open |
| F-80-C | Moving the template made `m39`'s `OUTCOME.md` state something false: it names `src/bundle/templates/milestone/OUTCOME.md` and `.aof/templates/work/milestone/OUTCOME.md` as where the template ships (neither exists) and scopes the artifact to milestones. It was NOT edited — it is the delivered record of a done milestone, and amending it would make m39 claim a delivery it did not make. This story's own outcome states the supersession instead. The residue: the index unions both statements and has no notion of supersession, so a recall over "where the OUTCOME template ships" returns the retired path alongside the live one | design-gap | medium | non-blocker → backlog: give the document class a supersession the index honours. Recorded as an open gap in `80/OUTCOME.md` with that discharge condition | backlog | open |
| F-80-D | Half (a) of story 74's finding **F-74-F** is not discharged. A parentless story still has nowhere but `STORY.md` for its verification evidence, findings and accept block, so this document stays over the 150-line budget and `aof work doctor 80` reports `doc-over-budget` — the same warn 73 (192 lines) and 74 (214) carry. `OUTCOME.md` relieved the delivered-STATE half of that pressure and no more; trimming the rest would mean deleting evidence. Measured again this session: writing story 74's two finding ids into this register in the prompt's qualified cross-item form raised two ERROR-level `register-dangling-citation` findings, because `REGISTER_FILES` is `["ARCHITECTURE.md", "VERIFICATION.md", "SESSION.md"]` and a parentless story's register lives in `STORY.md`. Both were de-qualified to prose to clear the gate — so the doc set currently forbids citing a parentless story's finding in the form the prompt prescribes | design-gap | medium | non-blocker → backlog: either a parentless story's own `VERIFICATION.md`, or a budget that resolves from whether the story carries a parent. Recorded as an open gap in `80/OUTCOME.md` | backlog | open |
| F-80-E | The widening stopped at `OUTCOME.md`, so a parentless story's LESSONS are still unrecallable. Task 02 deliberately left the RETROSPECTIVE / ARCHITECTURE / AOF scan milestone-scoped, which is the right boundary for this story and leaves an asymmetry behind it: measured after this accept, story 74 carries a `RETROSPECTIVE.md` with five lessons and contributes **0** records, and this story's own five (R1–R5) contribute 0 likewise, while its outcome contributes 11. A parentless story's delivered STATE is now recallable and its LESSONS are not — the half of `aof work memory ingest` that `aof:verify` step 5 exists to feed | design-gap | medium | non-blocker → backlog: widen the RETROSPECTIVE scan to any item that carries one, the same one-predicate change task 02 made for OUTCOME.md, and re-measure the lesson count | backlog | open |

## Accept decision

**ACCEPTED 2026-08-20.** `aof work validate 80`: **PASS — 80 is well-formed**. `aof work doctor 80`:
no `control-unresolved` at either severity — this story declares no `ARCHITECTURE.md` and therefore
no controls; two warns, `doc-over-budget` (F-80-D) and a repo-wide `numbering-gap` (pre-existing, an
artefact of parentless stories not being top-level drivers). All three tasks are built, reviewed and
green.

What the decision rests on:

- **Every scenario of all three tasks has a covering, green test**, and the four `@manual` scenarios
  were each run or explicitly scoped above — including the one that is not yet live-observable, named
  rather than claimed.
- **The widening is measured on the real stream, not asserted.** The same tree, indexed at HEAD and
  at the delivered code, differs by exactly the eleven records this story's own outcome contributes —
  0 → 11 for a parentless story, which is the whole ask reduced to one number.
- **The move is a move, not a fork.** One declared member, one rendered path, the milestone-filed
  copy deleted from this repo's own install and from its lock, and the grammar byte-identical across
  it — so `parseOutcome` still has exactly one source.
- **The excluded types are stated, not omitted.** A spike carries none because its deliverable is
  knowledge; a uat carries none because its deliverable is a verdict over items that already carry
  their own outcomes. Both are written into the prompt and into this story's outcome.
- **No blocking finding is open.** Five recorded, none blocking; two are pre-existing reds this
  verify measured and attributed away from this change.

Carried forward: F-80-A…E — the god node's whole-file pin, the retired split assertion, the superseded
outcome with no supersession, the parentless story's still-missing verification home, and its lessons
staying out of the index while its delivered state goes in.
