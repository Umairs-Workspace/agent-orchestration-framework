---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 119 · The tree gets an interior — State

## Progress

**Framed 2026-09-06** (`aof:add-milestone`). Spine only — SPEC + STATE. No stories, no
`ARCHITECTURE.md`, no code. Next: `aof:refine 119`.

- [ ] to be broken down — **max 5 stories** (operator's framing)

**Refined 2026-09-06** (`aof:refine 119 --autonomous`). Decide + Break-down + all five contracts, one
review at the close. `ARCHITECTURE.md` carries ADR-001..ADR-010 and an eight-row fitness register;
five stories are scaffolded, contracted and ordered by declared `depends:` edges.

- [x] broken down — **five stories**, at the cap

### What refine found that the framing had not

- **A THIRD blocker, and it is the one that would have hurt most** (`ARCHITECTURE.md#ADR-004`). A
  path cited in a delivered document is probed with a bare `stat` at HEAD. Measured with
  `citedControlPathsIn` over every `wiki/work/*/ARCHITECTURE.md`: **157 distinct control paths, 175
  register rows, across 20 documents**. Story `119/03` moves `test/arch/**`, so **all 157 stop
  resolving** — and those 20 registers belong to **done** items, where `pending` is not admitted and
  delivered records are immutable. The move as scoped would have left `aof work doctor` reporting 175
  permanent findings **no legal edit could clear**. The same gap is worse one universe over: no gate
  in this tree resolves a `src/` path citation at all, which is 1,500 citations for `src/mesh-*` and
  1,605 for `src/work-*`. The ruling is one resolver, in `src/`, with two readers, whose rename map
  is **derived from git history** rather than stored.
- **This is also what ADMITS the `src/` fold.** Chore 106 refused a family fold on per-module
  citation arithmetic, and re-run here that arithmetic refuses *every* fold — 1,500/31 = 48 and
  1,605/40 = 40 citations per root module removed. But its other limb was *"and nothing would notice
  — the decay would be silent and permanent"*, and with a resolver the decay is neither. The fold is
  admitted **because and only because** the resolver lands first.

### The open question, answered — and answered differently than framed

`STATE.md` asked whether the two god-nodes are one story or two. **Neither pairing in the question is
the right cut.** `aof graph impact` (graph built 2026-09-06T00:48:13.342Z, 15,663 nodes / 38,293
edges) reports **no edge in either direction** between `src/command-core.mjs` and
`src/mesh-worker-execution.mjs` — they share a ledger paragraph and nothing else. Meanwhile
`command-core.mjs` imports **all 93** `src/commands/*.mjs` modules by path, so item 84’s write set is a
**strict subset of item 78’s** — the same import lines. So **84 joins 78** as `119/02`, and **83 stands
alone and last** as `119/04`, after `119/01` has moved the file into `src/mesh/` and made its split
intra-family. Item 78’s own entry claims the route table is unaffected: true of the *route*, false of
the *import block*.

### Default decisions taken at refine (not escalated)

- **`files:` is declared at DIRECTORY scale for the mechanical import-rewrite lanes.** 657 files carry
  an import of a `src/mesh-*` or `src/work-*` module. Enumerating them would be honest and unusable,
  and stale between refine and build; only five stories in this repo carry `files:` at all and the
  largest is 15 entries. Nothing in the gate refuses a directory entry (forward slashes, resolves
  in-project, no anchor), and **the cost of an over-broad set is a serialised wave**, which this
  milestone is anyway: the stories are ordered by hard `depends:` edges. The cost accepted is that
  `ready-wave.mjs` computes disjointness by exact path, so a directory entry under-detects overlap
  rather than over-detecting it — harmless here, and worth naming.
- **The ordering is declared, not narrated.** `depends:` edges: `119/01` and `119/02` on `119/00`;
  `119/03` on `119/00`+`119/01`+`119/02`; `119/04` on `119/00`+`119/01`.
- **Story 4 is ordered after the source moves, not before.** Cutting the test tree first would let
  this milestone’s six new controls land in their homes directly, and was weighed. Refused: `119/03`
  moves 1,022 files, and running it ahead of three source-move stories makes every one of their diffs
  a merge against a moving test tree. The accepted cost is **one register amendment** at `119/03`’s
  structural review.
- **The fitness register’s story refs were remapped at refine.** The architect labelled stories 1-5;
  the scaffolder is 0-indexed, so all eight FF rows cited a story one ahead of the one that owns them.
  Corrected per row — a citation that does not resolve is exactly what this milestone is about.

- **`work.plan.enabled` was turned ON after the break-down, and the five build briefs were authored
  into the same refine.** The gate defaults to false and was absent, so the first pass correctly
  wrote no `PLAN.md`. The operator enabled it; the briefs were then written directly rather than by
  re-running the phase. **A full re-refine was refused on the rules’ own terms** — it would re-mint a
  run for a phase already closed, re-open a Decide stage that is closed, and spawn a re-authoring
  wave over fifteen contracts that are already authored, which `<amendment_ratification>` names as
  not a legal response to a delta. Only the missing artifact was produced.
- **The briefs are 48–54 lines each** against the `plan: 80` doctor budget — no `doc-over-budget`
  finding. Each carries only the two things the frontmatter cannot express: the **mechanism** (the
  seam the change hangs off, including the failure modes measured during the fan-out) and the
  **verification step** (the one end-to-end check that actually proves the story, as distinct from
  the suite being green), plus what is deliberately out of scope. No read or write path is restated —
  those have one home, the story frontmatter. They are the builder’s and advisory: no reviewer reads
  one, and a deviation from one is not a finding.
- **This milestone is a fair place to measure whether the brief pays.** `src/config-inspect.mjs`’s own
  comment on the gate says the trade is “a question for measurement on a real milestone, not a
  default to bake in” — five stories, four of them large mechanical moves with sharp non-mechanical
  edges, is the case it had in mind.

### Still open

- **`aof work doctor 119` reports one error: `verification-register-missing`.** Eight controls are
  declared and `VERIFICATION.md` carries no `## Fitness functions` register for their red probes. That
  document is authored at verify time, and each control owes its probe **once it lands** — so this
  clears story by story, not at refine.
- **Six controls stand `pending`** (FF-11901..05, FF-11908); two extend controls already on disk
  (FF-11906, FF-11907). `pending` reports at warn while 119 is open and is **not admitted at accept**.


### What the contract fan-out found (five parallel Three-Amigos beats)

Every finding below was **confirmed at the source** before it was acted on. Four are Blockers and all
four are handled **inside the story that raised them** — no contract was re-authored, and the Decide
stage was not re-opened. The write sets moved because the contracts measured what the ADRs assumed.

- **`src/work-loops.mjs:318` is a behaviour change waiting for the move** (119/01, Blocker).
  `PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))` resolves to the repo
  root from `src/work-loops.mjs` and to **`src/`** from `src/work/loops.mjs`; its consumer resolves
  framework loop-record ceiling pointers, so all of them would stop resolving. It is the **only**
  self-located constant in the 71-module moving set. This is exactly the class ADR-008 claims cannot
  exist, found by measuring rather than by trusting the claim.
- **Controls that pass green while guarding nothing** (119/01 and 119/04, Blockers). Five arch
  controls gate their real assertion on `existsSync` over a subject `119/01` moves — one of them
  disarming 43/ADR-005’s whole direction guard. And two **delivered security controls**
  (`acd-worker-clone-target-scoped`, `acd-worker-clone-no-credential-persisted`) assert only
  *negatives* over the parent module’s text, so `119/04`’s split makes them pass over a subject that
  no longer contains what they forbid — silently, permanently. This is the item-81 species landing on
  a security control, and it is why FF-11902 (non-vacuity) lands first.
- **FF-11908’s exempt class is vacuous over the subject the register names** (119/02, Blocker).
  `grep -c 'await import(' src/command-core.mjs` = **0** — the TDZ-ring comments item 26 names live
  in `src/commands/`, not the registry. The contract scopes the class correctly; the register row’s
  wording is a finding for the structural review, not an ADR re-opened mid-fan-out.
- **Three numbers in this milestone’s own records were measurement claims without commands** — the
  species it exists to prevent. `119/02`’s title said “93 rationale blocks” (it is **68** blocks; the
  genuinely two-homed set is **10**; 93 was the import count) and is corrected. ADR-004’s citation
  census (157/175/20) re-measures to **163/188/21**, the delta being 119’s own register. ADR-003 §3
  and ledger item 81 both cite `agent-session-driver-door.test.mjs:160` for `NAMES_THE_NEW_MODULE`,
  which is at **`:146`** — item 81’s own species 3, inside the entry naming the species.
- **The purity class is nine control files, not three** (119/00). Six carriers the ADR does not name
  use `/^\s*import\s/mu`, the same form as the one it does; two of them guard
  `src/work-acceptor/{rule,ledger}.mjs` — already one family directory, with the guard banning the
  edge *between* them. ADR-002’s own case, live in the tree.
- **A move story’s diff has THREE kinds, not two** (119/01). Beyond the moved file and the import
  specifier, **178** controls hold **422 non-comment** `src/(mesh|work)-*.mjs` path literals as
  `readFile` subjects. A reviewer applying ADR-008 literally would flag 422 legitimate edits.
- **`53/FF-5311`’s digest ceiling is reddened three ways by `119/03`**, and the re-stamp is now a
  visible act at structural review rather than a mid-build surprise. **`scripts/test-unit.mjs` IS
  touched** — all 98 of its suite specifiers name files that move — so ADR-010 §4’s “not touched” is
  a wording finding; its intent (not a second index) is preserved and asserted.

**Write sets changed by these findings:** `119/00` +7 controls, `119/01` −`app/desktop/ui/app.js`
(zero references — an authoring error) +`ui/src/` (nine real citations no gate resolves), `119/02`
+`src/cli.mjs` +`test/` +3 named controls, `119/03` +`scripts/test-unit.mjs` +the digest ceiling,
`119/04` +4 controls the split reds or vacates, and its `depends:` corrected to run **last**.

## Notes & decisions in flight

- **Scheduled from `wiki/work/TECH_DEBT.md`**, on the operator's instruction to "start tackling the
  tech debt — max 5 stories, biggest offenders". The ledger reads 78 entries / 4,082 lines, 50 open,
  28 unstatused, 77 over the 12-line budget.

- **"Biggest offenders" was ambiguous and was decided, not inferred.** It splits two ways: the
  *heaviest and compounding* entries (structural sprawl) or the *sharpest* ones (item 27's ten red
  suites, item 36's junction that deletes the `ui/` workspace, item 9's silent co-authored overwrite).
  The operator chose **structural sprawl**. The sharp-edged entries stay open on the ledger with their
  numbers intact — see the SPEC's out-of-scope list for the five named.

- **Every headline number in the SPEC was re-measured at HEAD on 2026-09-06**, not copied from the
  ledger, and three had already moved since their last entry: `src/commands/` 91 → **99** siblings
  (measured 2026-08-31), `command-core.mjs` 522 → **581** lines, `phase-brief.mjs` 1,067 → **1,651**.
  The last of those is item 61 biting exactly as predicted — the module cannot be split, so it grew
  55% instead.

- **The break-down order is constrained, and refine should not re-open it.** Items 61 and 81 are
  blockers rather than symptoms: a `src/<name>/` family is illegal under the current zero-import
  reading, and any large file move trips a stored census, a ratchet constant or a `<path>:<line>`
  citation from a story that has never read the control. Rule the class, then move the tree.

- **Open question for refine:** whether the two god-nodes (items 83, 84) are one story or two. They
  share the species — an additive field per milestone, with a ratchet that measures rather than
  resists — but not a seam, and `mesh-worker-execution.mjs` alone has 54 dependents against
  `command-core.mjs`'s registry role. Five is a cap, not a target.

- **Discharge is deletion.** Items 10, 61, 63, 78, 81, 83 and 84 are removed from `TECH_DEBT.md` at
  accept — no `CLOSED` annotation, no strike-through. Numbers are never reused, so the holes stay.
  The forensics live in this milestone's own registers, which are dated and immutable.

## Feedback (for retro)

<!-- COMPACTED at `aof:verify 119` (2026-09-07). The 562 lines of raw build/review notes that stood
     here have GRADUATED and were archived: their lessons are in the six `RETROSPECTIVE.md` documents
     this milestone now carries (one per story, plus the milestone's own), and the ~39 findings they
     routed are the `## Findings` register in `VERIFICATION.md`, numbered there at the moment of
     landing. Nothing was discarded — every note reached one of those two homes, which is the point
     of the compaction: a note read once during a build is not a record, and a record nobody can
     find is not one either. Recover the raw text from git history at `4c08c4b4`. -->

Lessons: `RETROSPECTIVE.md` (milestone) and `stories/*/RETROSPECTIVE.md` (one per story).
Findings: `VERIFICATION.md` `## Findings` (`F-01`–`F-39`).

## Verification

<!-- Pointers, not restatements. Evidence lives in `VERIFICATION.md`. -->
- [x] `@executable` suite green — the whole-tree regression gate, GREEN at 55130976 and recorded in
      `REGRESSION.md` (96/ADR-008)
- [x] Fitness functions green — all eight declared controls with their red probes, in
      `VERIFICATION.md` `## Fitness functions`. `acd-debt-ledger-budget` fell by **five** entries,
      not seven: items 81 and 83 are kept open by PO decision (`F-02`, `F-37`)
- [x] `@manual` — no `@uat` scenario exists in this milestone, so no human lane ran and no `UAT.md`
      was written. That is a decision, not an omission: every story here is structural