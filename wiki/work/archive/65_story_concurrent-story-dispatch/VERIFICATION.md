---
doc: verification
updated: 2026-08-15
---
<!--
  Story VERIFICATION.md — answers ONE question: is story 65 truly done, and what is the evidence?
  Written at aof:verify 65. Only sections with content appear (absence is information).
  Standalone story (parent: null) → this VERIFICATION.md is the story's verification record; there is
  no milestone SPEC box to tick and no OUTCOME.md (that is a milestone-Accept artifact, ADR-004/006).
  NO @uat scenarios → no ## User sign-off section (no human was pestered).
  NO UI surface (a CLI/prompt concern, no DESIGN.md) → no design-conformance section.
-->
# 65 · Concurrent Story Dispatch — Verification

## Method

Lanes in scope: **`@executable`** (tasks 00, 01, and 12 of task 02's 13 scenarios) + **one `@manual`**
(task 02's parallelism measurement). No `@uat`, no UI, no design-conformance lane.

The suite was run **focused**, never as the whole repo lane: `global-work-propagation.test.mjs` binds
`:4182`, which this machine's live control daemon holds. Every run carried a throwaway
`AOF_GLOBAL_HOME` (hook-enforced), with per-case isolation mirroring `scripts/test.mjs`'s own
`runSuite()`.

Every red reported below was **byte-proven inherited** rather than asserted: the same runner was
re-run with story 65's entire change set stashed (`git stash push --include-untracked`) and the
failure set compared. That probe is the difference between "this story is not the cause" and "this
story is probably not the cause".

## Verification evidence

### Automated — the story's own `@executable` suite, **49 / 49 green**

- **`test/work-story-depends.test.mjs`** — all 16 cases: the 4 prose scenarios, the 6 Scenario-Outline
  rows of the validate table, and the 6 `next` scenarios. Both halves of the split are asserted
  against the reader that owns them — `validateWork` **reports** a sibling edge resolving to nothing,
  `nextWork` **ignores** the same edge — plus the keyed-within-the-parent proof (milestone `00` done,
  story `43/01 depends: [00]` still waits on sibling `43/00`), the byte-unchanged driver lane, and a
  direct read of `00/01/tasks/02_depends-graph.feature` proving milestone 00's delivered feature file
  untouched.
  `verifies → tasks/00_story-depends-becomes-data.feature`
- **`test/work-next-ready-set.test.mjs`** — all 15 cases: the head-is-unchanged claim, the two
  independent stories, the sibling-gated exclusion, the cross-milestone range, empty sets for
  `blocked` and `done`, all 4 candidacy Scenario-Outline rows (the held-scope row driven end to end
  through the **real** item lock), the merged single `skipped` key, per-member `answeredFrom` /
  `reportedBy`, and the human render answering the operator's question first.
  `verifies → tasks/01_next-answers-with-the-ready-set.feature`
- **`test/work-dispatch-lanes.test.mjs`** — all 18 cases over a **real `git worktree`** in a temp
  fixture repo, not a double: own-tree/own-branch, two lanes never sharing a tree, the vvw-352
  same-file overlap reported rather than merged, the concurrent-`add` race resolving to one tree, the
  reuse door, re-open-after-cleanup continuing the item's own line, the 3 fan-out Scenario-Outline
  rows measuring **peak in-flight** (not the schedule), a throwing lane not stranding the others, the
  bound read-never-invented, cleanup refusing uncommitted work, the sweep, per-lane reportability,
  and a direct read of `src/bundle/commands/continue.md` proving the prompt now fans out.
  `verifies → tasks/02_concurrent-dispatch-into-worktrees.feature` (its 12 `@executable` scenarios)

### Fitness functions — the story's own gate, **3 / 3 green**

- **`test/arch/acd-dispatch-bound-single-home.test.mjs`** — the concurrency bound has exactly ONE
  resolution site in `src/` (one configured key `work.dispatch.concurrency`, one `DEFAULT_*`
  constant, one resolver); the gate is proven **non-vacuous** by planting a second site per clause
  and confirming a consumer that merely *imports* the resolver does not trip it; and the malformed
  matrix matches every other configured limit in this repo (no silent string→number coercion, no
  zero, no negative, no float).
  `verifies → tasks/02_concurrent-dispatch-into-worktrees.feature` "the bound is read, never invented"

### Regression on the surfaces the contract itself named — **122 / 123**, the 1 red inherited

The contract named its own blast radius, so each named surface was re-run rather than assumed:

- **`test/work-validate.test.mjs`** — 45 / 45. Includes the amended assertion at `:796-824`: it no
  longer claims `findings === []` for a story carrying `depends: [99]`, it asserts the split. A test
  tracks current behaviour; the delivered feature that recorded what milestone 00 shipped was not
  touched.
- **`test/work-next.test.mjs`** — 27 / 27 (the 600-line pre-existing walk, every `depends` in it
  driver-level). No driver-level resolve, cycle or gating answer changed.
- **`test/board-face-contract.test.mjs`** — 25 / 25, unamended. The board's `/api/work/next` envelope
  still projects `path` projectRoot-relative and forward-slashed.
- **`test/command-core-contract.test.mjs`** — 25 / 26. The one red is **F-65-B**, inherited: the
  frozen `WORK_IDS` list omits five ids that were registered by earlier items. `work:dispatch`, the
  id this story adds, is present and correct on both sides.

### Fitness lane, whole — **989 / 996 green across 286 arch files, 7 failing, all 7 inherited**

The same 7 fail with story 65 stashed (clean `HEAD`: **986 / 993**, identical failure set). Story 65
adds 3 gates and introduces **zero** new reds. Three of the seven are already ledgered as **chore
64**; the other four are **F-65-B**.

### Live exercise of the new surfaces — read-only, against this repo

Run with the working tree's own `src/` (bare `aof` on PATH symlinks to it), so this is the shipped
behaviour, not a fixture:

- `aof work next --json` → head `32` (**the item the pre-change walk returned**), `readySet` of **12**
  members each carrying its own `answeredFrom: "disk"`, `skipped: []`, and the pre-existing
  single-item keys (`state`/`ref`/`type`/`slug`/`status`/`path`) unmoved. Additive, as contracted.
- `aof work dispatch --list --json` → `{ action: "list", bound: 3, lanes: [], overlaps: [], ready: […] }`
  — the bound resolved from its one home and riding the answer.
- `aof work dispatch --sweep` → `No stranded dispatch lanes.`

`aof work dispatch <ref>` was deliberately **not** run here: it materialises a real worktree in the
operator's repo, and no scenario needs a live one that the fixture repo has not already proven.

### Craft

`node --check` passed on all 8 touched/new `src/` modules. `aof work validate 65 --json` → `[]`.

### The `@manual` lane — **not run, deferred with a named discharge condition (F-65-A)**

`tasks/02`'s final scenario ("a real milestone measures above 1.00× on the story builds") needs a real
milestone with ≥3 genuinely independent stories built **with concurrent dispatch enabled**, then
`aof work observe <ref>` over the result. It is not runnable at verify by construction: it measures
the *outcome of using* the mechanism, which requires the prompt change to be deployed and a real
multi-hour build to run. That is why it is `@manual` and not `@executable`. See F-65-A.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-65-A | The story's headline claim — parallelism above 1.00× on real story builds — is **unmeasured**. `tasks/02`'s `@manual` scenario cannot run before the story ships, because it measures the effect of shipping it. | evidence gap | non-blocker | **PO (inline): deferred, not waived.** The mechanism is fully proven (49 scenarios + 3 gates, over a real `git worktree`); what is unproven is the field outcome. A standalone story has no milestone gate to carry it to, so the obligation is declared here with an explicit discharge condition. | **operator** — first concurrent milestone build. Milestone 53 is the natural subject: 6 independent, not-started stories, no `depends` between them, all 6 already in today's ready set. | **OPEN — declared.** Discharge: build 53 with the new prompt, run `aof work observe 53`, and record the report path + the `aof-developer` parallelism factor here. |
| F-65-B | Four inherited reds sit **outside** chore 64's ledger: `acd-work-command-route-coverage` (×3 — `work:loops-graph`/`-show`/`-validate` are registered with no served `/api/work` route) and `acd-bundle-manifest-hashes` (11 stale manifest entries, incl. `.claude/commands/aof/continue.md` — already stale **before** this story edited it). The same family as `command-core-contract`'s red (`WORK_IDS` omits `work:init-config`, `work:resume`, `work:loops-graph`, `work:loops-show`, `work:loops-validate`). | inherited red | non-blocker | Defer. Byte-proven not this story's cause: identical failure set with 65's change set stashed. Not this contract's business, and fixing it inside 65 would widen a story that was scoped deliberately. | **chore 64** (`inherited-reds`) — three boxes added to its Definition of Done, citing this finding | deferred — ledgered |
| F-65-C | `aof work next` never offers a **standalone** story: `drivers = items.filter(isDriver)` and `isDriver` is milestone/uat/spike/chore, so a parentless story is invisible to the walk — story 65 is absent from its own ready set. | behaviour | non-blocker | Pre-existing and unchanged by this story (the ready set is built from the same `drivers` list the pre-change walk used, which is exactly why the head is byte-identical). Recorded because it is squarely in this story's domain — "every currently-ready item" is true *within the walk's existing subject set*, and a reader of the new `readySet` key deserves to know that boundary. | backlog | open |
| F-65-D | A mesh assignment issued for an item that has a **live local dispatch lane will evict that lane's tree**: `reuseWorktreeOnBranch` releases any worktree holding the item's branch before taking it. | behaviour | non-blocker | **Accepted as designed**, and already recorded at the seam (`src/mesh-worktree.mjs`, decision 2) rather than discovered later. It is m42's one-line-per-item rule working as intended; the consequence is that a local dispatch and a mesh assignment for the *same* item are not a supported concurrency. Surfaced here so it lives outside a source comment. | — | open (by design) |

Triage (PO, inline): **no blocker finding is open, and no design-gap finding is open.** F-65-A is the
one that matters and it is a declared, dischargeable obligation rather than a defect — the mechanism
it would measure is itself proven. Findings live here, never in a task folder.

## Gate

- `aof work validate 65 --json` → `[]`
- `aof work validate` (whole stream) → **PASS — work stream is well-formed.**

## Accept decision

**ACCEPTED — 2026-08-15**, with one declared, dischargeable gap (F-65-A).

All three task contracts are green on every lane that can be run before shipping: **49 / 49**
`@executable` scenarios across the three suites (task 02's over a real `git worktree`, not a double),
**3 / 3** story fitness functions, and the four surfaces the contract named as its own blast radius
re-run rather than assumed (**122 / 123**, the one red byte-proven inherited). The whole fitness lane
is **989 / 996** with all 7 failures identical to clean `HEAD` — story 65 introduces zero new reds and
adds three gates. `aof work validate` **PASSES** scoped and whole-stream.

The additivity promise holds live: `aof work next --json` still answers with the same head item and
the same single-item keys in the same places, with `readySet` beside them and the cache stamp applied
**per member**. Test-traceability is 1:1 — every scenario and every Scenario-Outline row across the
three features maps to a named case in a registered suite.

No `@uat` scenarios exist, so no human was pestered. No UI surface, so no design lane. What is **not**
claimed: that a real milestone has been measured above 1.00×. That is F-65-A, open and named, with
milestone 53 as its subject and `aof work observe 53` as its instrument. A standalone story →
**status: done**.
