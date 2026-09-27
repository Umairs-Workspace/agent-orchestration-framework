---
type: story
number: 74
slug: status-refusal-as-data
title: "A refused status move is data, not a failure"
status: done
owner: product-owner
created: 2026-08-16
updated: 2026-08-20
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 74 · A refused status move is data, not a failure

## User story

As an agent running a phase prompt unattended,
I want `aof work status <ref> <target>` to tell me the move was not applicable without exiting
non-zero,
so that the ordinary case — the item was already started — is not indistinguishable from a real
failure.

## Why

The item-status door and the phase door disagree about what a refusal is, and only one of them is
right.

`src/commands/continue.mjs:163-175` — the phase door — treats the same refusal as **data**: it
returns `{ statusMoved: false, statusCode }` and the act still succeeds. That behaviour is
deliberate and tested: *"item-status/phase-door: a status that cannot move never fails the act — the
door still answers WHERE"* (`test/work-item-status-lifecycle.test.mjs`).

`src/commands/item-status.mjs` — the door the prompts were just told to use — **throws**. A
`status-edge-not-applicable` is a 409 and a non-zero exit.

That matters because the refusal is the *common* case on the path the prompts describe. Any item
that reached the board's Continue button has already been moved to `in-progress` by the phase door
(`STARTING_PHASES`, `continue.mjs:148`), and the `run.started` reactor moves it on a run mint
(`src/effects/table.mjs:73`, bounded `expectFrom: ["not-started","blocked"]`). So step 2 of
`continue.md` — *"Mark it started — before any code"* — will routinely hit a verb that exits
non-zero, and the only thing standing between that and a spurious failure is a sentence of prose
telling the agent to carry on.

Two consequences, both avoidable:

- An unattended run under `set -e`, or a hook that reads a non-zero exit as an error, records a
  failure that did not happen.
- It trains agents to discount refusals from a verb whose *other* codes are load-bearing —
  `ref-not-found` (404) and the `no-local-checkout` refusal both mean "stop and look", and they
  arrive through the same channel as the one they have been told to ignore.

The fix is to give the door the shape the phase door already has, rather than to teach every caller
a special case.

## Tasks

- [x] `tasks/00_the-refusal-is-data.feature` — `--if-applicable` makes the EXPECTED refusal data:
      exit 0, a plain statement of where the item already is, and `{ moved: false, code, status,
      edges }` in `--json`. The bare verb is unchanged, and every other refusal still fails.
- [x] `tasks/01_a-broken-record-doc-is-not-a-no-op.feature` — the narrowing made honest (F-73-G):
      the three doc-shape faults get their own `record-doc-unusable` code, so neither the flag nor
      the two reactors' sanctioned no-ops can swallow a malformed record doc.
- [x] `tasks/02_the-prompts-pass-it-where-a-refusal-is-expected.feature` — the bundle surface passes
      the flag on the starting move only; the judgement moves keep the loud refusal, and
      `refine.md`'s "nothing to fix" prose is replaced rather than kept beside it.

## Verification evidence

Verified 2026-08-20 (`aof:verify 74 --solo` — one session, no evidence subagents; the product owner
is the sole author of this record).

**The suite, scoped to the story (the story gate, not the repo's).** Run through a focused
test-array runner, each test under its own throwaway `AOF_GLOBAL_HOME` exactly as the suite entry
point does — `node --test` on these files is a silent false pass (0 assertions), so the array is the
only honest lane. **240 tests, 237 green, 3 red — none of them this change** (F-74-D/E, each verified
red at HEAD below):

- **The story's own two lanes: 20/20 green.** `work-item-status-if-applicable` (18) covers every
  `@executable` scenario of tasks 00 and 01 — the six-row refusal outline, the `--json` result shape,
  the applicable move left untouched, the bare verb still throwing, the four-row every-other-refusal
  outline, the inert read face, the declared usage; and both faces of the shared writer raising
  `record-doc-unusable`, the two reactors' skips staying narrow, and the flag refusing to swallow a
  doc fault. `arch/acd-status-flag-on-starting-moves-only` (2) is task 02's `@executable` scenario.
  *verifies →* `tasks/00_the-refusal-is-data.feature`, `tasks/01_a-broken-record-doc-is-not-a-no-op.feature`,
  `tasks/02_the-prompts-pass-it-where-a-refusal-is-expected.feature`
- **The neighbours the diff could poison: 50/50 green.** `work-item-status-lifecycle` (13 — story
  73's whole delivered contract: the writer, the run mint, the door and the phase door),
  `run-status-rollback` (7), `work-frontmatter-writer` (13), `arch/acd-status-rollback-bounded` (3),
  `arch/acd-effects-ledger` (6), `arch/acd-work-command-route-coverage` (4),
  `arch/acd-command-route-derived` (4).
- **Every other lane that imports the changed modules: 170 run, 167 green.** Selected by sweeping
  `test/` for importers of `setItemStatus` / `rollbackItemStatus` / `effects/table.mjs` /
  `transitionRunStart` / `transitionRunComplete` / `recordDoc` — 14 arch guards plus
  `feature-parse-strict`, `item-lock-coded-refusal-every-door`, `item-lock-holder-identity`,
  `mesh-worker-withdraw-settle`, `verify-authors-outcome`, `work-list`,
  `work-upgrade-stamp-transform`, `integrations-routing-reader`.

**The full suite was NOT run, and this story has no milestone gate above it to run it.** `74` is a
top-level story, so the "full suite once, at the milestone gate" rule has no gate to land on; and
this machine cannot run it at all (`global-work-propagation` binds `:4182`, which the live control
daemon holds). The narrowest lane containing the story's scenarios was run instead, widened to every
importer of the changed modules. The honest cost: a defect this diff introduces in a module nothing
in that set imports is not caught here.

**Live CLI probe — the flag on a real item** (`74` itself, `in-review`; `in-review → not-started` is
not a legal edge, so the probe moves nothing whichever way it answers):

| probe | observed |
|---|---|
| `aof work status 74 not-started --if-applicable` | `74 — already in-review; nothing moved (asked for not-started). Legal moves: done, in-progress, blocked.` — **exit 0** |
| the same run with `--json` | `{ "moved": false, "code": "status-edge-not-applicable", "status": "in-review", "asked": "not-started", "edges": [...] }`, no error envelope — **exit 0** |
| `aof work status 74 not-started` (bare) | `item 74 is "in-review" — its legal moves are done\|in-progress\|blocked` — **exit 1** |
| the record doc after all three | frontmatter `status: in-review`, `updated: 2026-08-20` — unchanged |

*verifies →* `tasks/00_the-refusal-is-data.feature`

**Task 02's three `@manual` scenarios — all pass.**

1. *the starting moves pass the flag, in every bundle that makes one.* `continue.md:64` (the
   orchestrator's single MILESTONE move, before the fan-out), `continue.md:118` (the per-story "Mark
   it started"), `refine.md:175`, `assimilate-code.md:74` — each carries `--if-applicable` and each
   names why in one line. The judgement moves are bare: `continue.md:161` (`in-review`),
   `assimilate-code.md:75,81`, and every `done` in `verify.md`.
2. *the prose that told an agent to ignore the refusal is replaced, not kept alongside.*
   `refine.md`'s `<progress_tracking>` no longer says "nothing to fix"; the sentence is now the
   flag's own contract. `continue.md:196-197` goes further and inverts the habit — *"A non-zero exit
   from a work verb is a stop signal, always."*
3. *the rendered runtimes agree with the bundle source.* `aof work update --dry-run`: **132 members,
   132 "would keep", 0 writes, 0 drift**. Per-surface flag counts agree across all four trees —
   continue 8/8/8/8, refine 2/2/2/2, assimilate-code 1/1/1/1 (source / `.claude` / `.codex` /
   `.opencode`).

**Red probe of the story's one structural control.** The story declares no `FF-NN` (it is a
standalone story and carries no `ARCHITECTURE.md`), so no fitness-function register is owed; the
probe is recorded anyway, because an assertion nobody has seen fail is not yet a control.

| control | enforced by | result | red probe |
|---|---|---|---|
| the flag rides the STARTING move and nothing else | `test/arch/acd-status-flag-on-starting-moves-only.test.mjs` | green | dropped `--if-applicable` from `refine.md`'s `in-progress` move (2 occurrences → 1) and re-ran: **RED** — *"commands\refine.md: `aof work status <ref> in-progress` is a STARTING move and must carry --if-applicable"*. Source restored and re-hashed byte-identical (`git hash-object` before == after) |

**Beyond the contract's letter, and sanctioned.** Task 01 names three doc-shape faults; the delivered
code handles a fourth path the re-coding created — an item whose TYPE carries no record doc at all
(an adhoc top-level `task`) would have begun arriving as `record-doc-unusable` at both reactors, so
`typeHasRecordDoc` (`src/work.mjs`) returns those to a named skip (`type-has-no-record-doc`) at the
reactor rather than at the writer. The writer is left right to refuse. Two tests cover it.

## Findings

No blocking finding. Six recorded, ids allocated here at landing by the single writer of this
record. Two of them (F-74-D, F-74-E) are **not this story's** — they are red at HEAD and are recorded
because this verify is what surfaced them.

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-74-A | One refusal, two spellings. Task 00's `every other refusal still fails` Examples name `no-local-checkout`; the write door has raised `item-not-local` since m43/ADR-010 R6.4 (`src/commands/resolve.mjs:78`), while the PHASE door still reports `statusCode: "no-local-checkout"` (`src/commands/continue.mjs:169`). The required behaviour — that refusal still fails under the flag and writes nothing — is delivered and asserted under the code the system actually raises (`test/work-item-status-if-applicable.test.mjs:314`, which states the divergence in its own comment). The delivered `.feature` is left unedited: a shipped acceptance criterion is immutable, and the correction belongs in the accepting record | defect | low | non-blocker → follow-on: give the two doors ONE spelling (the phase door's `statusCode` is the odd one out), after which the row's string and the system agree without the contract being touched | chore / backlog | open |
| F-74-B | The rendered tree is not EOL-pinned. `.gitattributes` pins `src/bundle/**` LF but says nothing about `.claude/**`, `.codex/**`, `.opencode/**`, and this repo runs `core.autocrlf=true` — so a fresh checkout writes CRLF into all 59 rendered members while the renderer hashes LF, every one classifies **drift-warning** against `.aof/aof.lock.json`, and a plain `aof work update` KEEPS the stale file. A bundle fix then silently never lands; this story's three command surfaces needed `--force` to render at all. Content is identical either way — the drift is pure line-ending bookkeeping | defect | medium | non-blocker → chore: pin the rendered tree `text eol=lf`, the same fix `.gitattributes` already applies to every other byte-compared tree | chore / backlog | open |
| F-74-C | The flagged refusal drops the read face's provenance. `status` and `edges` in the `--if-applicable` result come from the resolver row (`resolveItemExact` → `findWorkCacheFirst`, which is deliberately cache-AUTHORITATIVE), while `reason` quotes the writer's disk read — and unlike the READ face on this same verb (`src/commands/item-status.mjs:80`), the result carries no `answeredFrom` to say which. The two agree in every ordinary case; a caller cannot tell when they would not | design-gap | low | non-blocker → follow-on: add `answeredFrom` to the flagged result, the key the read face already carries for exactly this reason | backlog | open |
| F-74-D | **Not this story — red at HEAD.** m66/00's two `src/work.mjs` ratchets are both red before this diff: the shrink-only line count asserts `< 1210` and HEAD is **1286**, and the frozen 17-name export set omits `setItemStatus`, which HEAD exports. Both broke when story 73 landed (`0a22fb1`) and neither was surfaced, because the full suite is not runnable on this machine. This story deepens both (1332 lines, `+typeHasRecordDoc`) — a ratchet nobody re-baselines has stopped being a gate | test-gap | medium | non-blocker → chore: re-baseline both marks at what 73+74 actually left behind, or retire them; a ratchet that has been red for a whole commit is not measuring anything | chore / backlog | open |
| F-74-E | **Not this story — red at HEAD, and predicted by the test itself.** `feature-parse-strict`'s row-5 citation (`53_milestone_loop-artifact/stories/01_story_loop-engine/tasks/04_gate-order-and-cap.feature`, expected: exactly 1 structural finding at line 20) now yields **0** — the live file was REPAIRED in `0a22fb1`. The test's own header calls this red "re-measure and record the new population", not "the parser broke". Untouched by this diff | test-gap | low | non-blocker → follow-on: re-measure the population and move m66/00 task 02's per-milestone table with it | m66 traceability / backlog | open |
| F-74-F | A standalone story has no home for either of its Accept-time artifacts. (a) `aof:verify` writes results to the milestone `VERIFICATION.md`, and a parentless story has no milestone — so 73 and 74 both inlined the evidence/findings/accept block into `STORY.md`, and both now trip `doc-over-budget` (73: 192 lines, 74: 214, against a 150 budget); trimming it would mean deleting evidence. (b) `OUTCOME.md` is authored only when accepting a MILESTONE (`src/bundle/commands/verify.md:148`) and its template is filed under `.aof/templates/work/milestone/`, so no story or chore ever states what the system now IS — even though the document itself models an ITEM (`# NN · <Item Title> — Outcome`) and the memory indexer already scans every `item.dir` for one regardless of type (`src/memory/local-indexing.mjs:676`) | design-gap | medium | non-blocker → both halves routed to story **80** (`outcome-per-delivered-item`): an `OUTCOME.md` for stories and chores, and with it the parentless story's doc set — either its own `VERIFICATION.md` or a budget that knows whether the story carries a parent | m80 / backlog | open |

## Accept decision

**ACCEPTED 2026-08-20.** `aof work validate 74`: **PASS — 74 is well-formed**. `aof work doctor 74`:
no `control-unresolved` at either severity (one repo-wide `numbering-gap` warn, pre-existing and not
this item's). All three tasks are built, reviewed and green.

What the decision rests on:

- **Every scenario of all three tasks has a covering, green test**, and task 02's two bundle-surface
  `@manual` scenarios and its prose-replacement scenario were each run and evidenced above.
- **The narrowing is proved, not asserted.** `--if-applicable` catches exactly
  `status-edge-not-applicable` and re-throws everything else — checked at the code
  (`src/commands/item-status.mjs`, one `if (input.ifApplicable !== true || error?.code !== …) throw
  error`), at four refusal codes under the flag, and live on a real item at exit 0 / exit 1.
- **F-73-G is discharged.** The three doc-shape faults now raise `record-doc-unusable` (422) from the
  one place that detects them, so neither reactor's sanctioned no-op can absorb a malformed record
  doc — including the `<!-- aof-generated: bundle -->` fence trap, which the writer now names
  specifically. Both faces of the shared writer are covered, and both sanctioned skips are proved
  still to fire on a well-formed item.
- **No blocking finding is open.** Six recorded, none blocking; two of them are red at HEAD and
  belong to other items.

Carried forward: F-74-A…F — the refusal's two spellings, the unpinned rendered tree, the missing
`answeredFrom`, the two stale gates this verify surfaced, and the parentless story's missing home for
both of its Accept-time artifacts (routed to story 80).

## Notes

**Scope sketch, not a design.** A flag on the write face — `--if-applicable` — under which a
`status-edge-not-applicable` exits **0**, renders as a plain statement of where the item already is,
and reports `{ moved: false, code, status, edges }` in `--json`. Every other refusal
(`invalid-status`, `ref-not-found`, `no-local-checkout`, an unreadable or frontmatter-less record
doc) keeps throwing: this narrows exactly one code, and narrowing more would put the interesting
failures back in the same bucket the flag exists to empty.

**Why a story and not a chore.** The deliverable is observable behaviour with a contract — an exit
code, a render, and a `--json` shape — so it carries `@executable` scenarios. Milestone 66's ADR-003
rule in reverse: a chore's whole deliverable is a ticked checklist, and this is not that.

**Do not reach for it by default.** The bare verb should keep throwing. A refusal an operator typed
by hand is worth surfacing loudly; it is only the *scripted, expected* refusal that wants to be
data. Refine should decide whether the phase prompts pass the flag unconditionally or only where the
already-started case is expected — the former is simpler, the latter keeps a genuinely surprising
refusal visible.

**Prompted by** a review of **story 73** (`item-status-lifecycle`, accepted 2026-08-16), which wired
`aof work status` into `continue.md`, `refine.md`, `verify.md` and `assimilate-code.md`. Of the four
findings that review produced, this is the one that needs code rather than prose.
