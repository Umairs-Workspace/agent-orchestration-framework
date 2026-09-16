---
doc: verification
updated: 2026-08-15
---
<!--
  Milestone VERIFICATION.md — answers ONE question: is this milestone truly done, and what is the
  evidence? Written at aof:verify, per story as each lands. Owner: product-owner (single writer —
  ADR-006: reviewers report findings UNNUMBERED, ids are allocated HERE, at the moment of landing).
  DOGFOODS the schema 66/03 ships (ADR-005 §1): four sections, `## Fitness functions` CITING the
  sibling ARCHITECTURE.md register (ADR-008 ruling 4), `## Findings` on verify.md's seven columns
  with the id ALONE in the first cell (ADR-001 §2).
-->
# 66 · Controls That Run — Verification

## Method

Lanes in scope for **66/00**: `@executable` only. All three task features carry a single feature-level
lane tag (`@executable @cli @work @validate`, `@executable @cli @work @work-stream`,
`@executable @cli @work @validate`) — **no `@manual`, no `@uat`, no UI surface**, so no human was
pestered, no design-conformance lane ran, and there is no `UAT.md` for this story.

Every suite was run **focused**, never as the whole repo lane: `global-work-propagation.test.mjs`
binds `:4182`, which this machine's live control daemon holds. Every run carried a throwaway
`AOF_GLOBAL_HOME` (hook-enforced). The build's numbers were **re-run independently at accept** by the
product owner rather than transcribed — 10 suites, 0 failures — and QA re-derived the corpus
population from scratch rather than checking the build's arithmetic.

## Verification evidence

### 66/00 — automated, `@executable`, **22 / 22 scenarios green over 59 Examples rows**

- **`test/feature-parse-strict.test.mjs`** (39 cases) — the one-parser claim, the corpus-wide
  value-for-value differential (665 files, HEAD parser vs new: **0 drift** on `feature` and
  `scenarios[].{name,outline,lane}`; **0 set drift, 0 wording drift** on the tag findings), the
  failed-parse-still-answers-the-board path, the god-node ratchet, purity, the 6 reject rows against
  the real cited files at their cited lines, the 13 false-positive-protection construct rows, and the
  10 boundary rows.
  `verifies → tasks/00_one-gherkin-parser.feature`
- **`test/acceptance-horizon.test.mjs`** (22 cases) — one implementation, the 8 status rows, the 6
  rendering rows, story-vs-milestone granularity, the closed-item total-silence widening,
  lifecycle-not-a-list, and the never-rewrites-a-contract claim.
  `verifies → tasks/01_the-acceptance-horizon.feature`
- **`test/work-validate-contract-parses.test.mjs`** (20 cases) — the refusal and its exit code, the
  finding's wording/path/line, the 9-milestone table and the healthy-corpus claim driven over the
  **real** `wiki/work` tree with an exact-match assertion, and the 7 scope rows.
  `verifies → tasks/02_a-contract-that-does-not-parse-is-refused.feature`

**Independently measured at review** (QA, not taken from the build): 24 mutation probes against the
three source modules, **23 killed, 1 survivor** — which was then closed (F-12). A planted violation
in **each of the 651 currently-parseable files**, twice (EOF in step position, and in the Feature
description): **0 masked, both times** — the gate is not merely green, it bites everywhere. The
grandfathered population was re-derived from scratch at **14 files / 40 lines across 9 milestones**,
and every flagged line was read by hand: **all 14 are real defects**, no false positive hiding among
them.

**Live gate, verbatim** — one finding stream-wide, exactly as ADR-002 predicted:

```
1 issue(s):
  wiki\work\53_milestone_loop-artifact\stories\01_story_loop-engine\tasks\04_gate-order-and-cap.feature
    — structural parse failure: free text in step position at line 20 (a wrapped step continuation,
      or a narrative sentence beginning "Given"/"When"/"Then"/"And"/"But")
```

Scopes `00`, `27`, `49`, `52` — each holding unparseable **delivered** files — PASS at exit 0. The
horizon's silence is real end-to-end, not merely at the predicate. `aof work tasks 53/01` still
renders `04_gate-order-and-cap.feature (15E 0M 0U)`: an unparseable file answers the board with the
scenarios it could recognise.

### 66/00 — structural, verified at source by the architect

`src/acceptance-horizon.mjs` has **0 graph dependencies** (66/02's FF-6605 precondition is a fact of
the module graph, not of discipline). `src/work.mjs` **1212 → 1209 lines total but 672 → 652 code
lines (−20)** — the scanning genuinely left; the prose ate the delta — with an **export set
byte-identical to HEAD** (17 names, same signatures), so all 243 dependents are untouched. The
`recovery.mjs → acceptance-horizon.mjs` edge added at fix round 1 is acyclic, the leaf still at 0
dependencies.

### 66/01 — automated, `@executable`, **10 / 10 scenarios green over ~42 Examples rows**

Lanes in scope: `@executable` only — neither feature carries a scenario-level `@manual` or `@uat`,
and there is no rendered surface, so no human lane and no a11y lane (`work.tags.domains` carries no
`a11y`). Both features are inside the doc budget (122 and 88 lines).

- **`test/declared-id.test.mjs`** (11 cases) — the three Outlines (9 / 15 / **14** rows — the table
  carries 14, not the 13 its own test name says), the no-ids register scenario (non-vacuous: the same
  table declares once an id column is added), and the cross-file citation scenario.
  `verifies → tasks/00_the-declaration-grammar.feature`
- **`test/arch/acd-register-declaration-form.test.mjs`** (9 lanes, FF-6603) — set-equality against the
  ADR-001/ADR-008 literals, seven planted negatives plus the HTML-comment case against four positives,
  **each negative asserting a companion positive is still found in the same call**, so "found nothing"
  is never the passing state.
- **`test/arch/acd-declared-id-single-home.test.mjs`** (7 lanes, FF-6604) — the one-home scan over 227
  modules, the import-binding parse (memory takes the forms, never the block predicate), and the
  whole-record differential.
  `verifies → tasks/01_memory-parsers-share-the-one-home.feature`

**The extraction moved no record, proven three ways.** The build captured a golden before any edit;
QA re-derived it in a detached-HEAD worktree at `24fc181`; the architect ran `buildRecords` from
**both** modules in one process over the real `wiki/work`. All three agree:
`{adr:342, lesson:258, capability:76, gap:49, summary:2}` = **727**, every record byte-identical and
in order, `only-before: 0, only-after: 0`. The `adr`+`lesson` half is **600**, confirming ADR-009
ROUND 3/8's correction that the previously-stored 599 was itself wrong. This is the check the 22
fixture-planting dependent suites structurally cannot make: a re-home defect here is a **silent
shrink** — fewer records, not wrong ones — which every one of them stays green through.

**Independently re-run by the product owner at accept**, mirroring `scripts/test.mjs`'s per-case
isolation: 66/01's three suites plus 66/00's two arch gates — **41 tests, 0 failures**, confirming
66/00's controls stay green under 66/01's changes, including the item-24 stripper guard.

### 66/02 — automated, `@executable`, **25 scenarios / 89 Examples rows** (census re-measured at review)

Lanes in scope: `@executable` only — no scenario across the four features carries `@manual` or
`@uat`, so no human lane. No UI, no a11y lane.

- **`test/work-doctor-controls.test.mjs`** — the three groups driven from **literal snapshots, no
  filesystem**, which is what purity buys. Covers the eight-code envelope, the horizon setting
  severity, the 24-row two-leg truth table, `pending`-as-token, the staging prohibition, and the
  red-probe shape matrix.
- **`test/arch/acd-controls-never-execute.test.mjs`** (FF-6605), **`…finding-envelope.test.mjs`**
  (FF-6606), **`…acd-no-staged-control.test.mjs`** + **`…acd-milestone-66-controls-resolve.test.mjs`**
  (FF-6607).

**The lane is purely additive over the real stream, measured rather than argued** (QA): two engine
runs over `wiki/work` with the same injected `now`, one with the shipped 10 groups and one with the
controls lane removed — **299 pre-existing findings both times, 0 added, 0 dropped**, code for code
and path for path.

**ACD executes nothing — verified live, not only structurally** (QA): a real temp project whose cited
control writes a marker file from module scope *and throws*, and whose declared runner writes a
second marker, driven end-to-end through the shipped `doctorWork` with `work.controls.runners`
configured. The control **resolved under both legs and neither marker exists**. Non-vacuity: deleting
the cited file flips the same run to `control-unresolved@error`. The spine carries exactly three
`readFile` and two `stat` sites — enumerated independently by the architect, and the suite's
read-budget assertion is a real measurement of the shipped source rather than a fixture.

**`scanItemTree` preserves the freshness lane exactly**: the pre-change `newestFileMtimeMs`
transcribed from HEAD and compared — **253/253 item dirs identical, 0 differences**.

**Day-one output on this repo — 20 errors, 17 warns**, re-derived independently by all three parties
after the PO's specimen fix: 13 `control-unresolved` + 1 `verification-register-missing` (m53, whose
accept owns the marking act), 4 `verification-missing-red-probe` (m66's register, completed by this
document), 2 `register-dangling-citation` (m66, the ADR-011/C admitted population), and on the warn
side 4 `control-runner-unchecked`, 1 `control-unresolved`, 2 `verification-register-missing`, 10
`register-dangling-citation`. **`register-dangling-citation` has zero false positives**: QA walked
every cited item's folder independently of the lane's resolution universe and confirmed all 11
distinct (item, id) pairs are true positives. Precision **14 dangling / 1,747 policed = 0.80%**.

**Independently re-run by the product owner at accept**: 87 tests across all four stories' gates, **0
failures**.

### 66/03 — automated + `@manual`, **3 features green; 79 → 84 `@executable` lanes**

Lanes in scope: `@executable` plus **three `@manual`** (one per feature, at `:125`, `:117`, `:111`).
**No `@uat` exists anywhere in milestone 66** — QA grepped the whole milestone and found the token
only as prose in this document stating its own absence. **No human acceptance gate applies.** The
a11y lane is off (`work.tags.domains` carries no `a11y`) and there is no rendered surface.

- **`test/verification-template.test.mjs`** (24) — the four frozen headings, both table headers, the
  placeholder Outline with positive controls, and the install Outline driven through the **real**
  `planApplyActions`/`executeApplyActions`/`updateWork` including drift and `--force`.
- **`test/bundle-asks-runnable-path.test.mjs`** (28) — the rule-placement Outline, each row with a
  **laundering probe** (the literal planted in a different bundle file must not keep it green).
- **`test/bundle-asks-unnumbered-findings.test.mjs`** (16) — the five agent rows, the frozen sentence
  across six files, and the `TAG_ROUTING` reconciliation table.
- **`test/arch/acd-verification-template-shape.test.mjs`** (FF-6608, 14 lanes).

**The ask and the check are wired to the same literals, proven live** (QA): a scaffolded milestone
whose `VERIFICATION.md` is the template verbatim yields `verification-missing-red-probe@error` and
**not** `verification-register-missing` — so the template's heading *is* the register the check reads;
filling the id but leaving the placeholder yields *"the red-probe cell is the untouched template
placeholder"*; filling the probe goes silent. **The template satisfies the check it was shipped for.**

**The finding's measured zero is discharged, both sides of HEAD** (verified independently by the
architect): eight falsifiability terms across `src/bundle/` — `red probe`, `seen red`, `vacuous`,
`positive control`, `falsifi*`, `must fail`, `observed failing`, `probe` — **0·0·0·0·0·0·0·0 at HEAD
(61 files) → 5·1·1·1·1·1·1·5 (62 files)**. The seventh ask adds three more (`write it APART`,
`never joined`, `joined specimen`: 0 → 3 each).

**`acd-bundle-manifest-hashes` was RED at HEAD and is now GREEN.** Audited outside the gate's own
short-circuiting loop (QA): **87 manifest entries, 87 rendered outputs, 87 matched, 0 stale, 0 entry
without a render, 0 render without an entry**; at HEAD the same audit gives 86 entries with **11
stale**. The committed `manifest.json` is byte-identical to a fresh `generateBundleManifest()` — a
true regeneration, not a hand-patch. TECH_DEBT item 27's clause-1 row is struck with its enumeration.

**`@manual` evidence — three lanes, run by the developer against the shipped bytes.** Each is
recorded with the candidate sentences weighed, so a reader who was not there can check the reasoning
rather than take it:
- **M1 (task 00:125) — PASS with one over-claim found.** The decisive sentence is present and
  unhedged (*"a recorded probe does NOT prove the assertion was ever really run"*), and all three
  ADR-005 §4 limits ship verbatim. The over-claim is F-47 below. Candidates weighed: `:33-35`
  (judged acceptable — it keeps the probe and the row distinct), `:35-37` (the finding), `:44-46`.
- **M2 (task 01:117) — PASS, no disagreement.** The rule sentence is byte-identical across
  `refine.md` and `aof-architect.md` (356 bytes), as is the citation form (257). Two asymmetries
  judged compatible (an addition, and a role-vs-procedure split); one pre-existing tension routed
  (F-49) and one ambiguity (F-59).
- **M3 (task 02:111) — PASS ×4, FAIL on `aof-qa.md`.** `aof-security.md` and `aof-compliance.md`
  escape only because they route the tag *via the orchestrator*; QA had no equivalent. This is F-46.

**Independently re-run by the product owner at accept**: all **17** milestone-66 suites, **263 tests,
0 failures**. Live `aof work doctor 66`: **exactly one error** — FF-6608's missing row, the act this
document performs.

## Fitness functions

<!-- CITING register (ADR-008 ruling 4): every row resolves to a declaration in the sibling
     ARCHITECTURE.md `## Fitness functions` register and declares nothing. The red-probe cell records
     WHAT WAS CHANGED to make the control fail and THE MESSAGE OBSERVED (ADR-005 §1). -->

| id | enforced by | result | red probe |
|---|---|---|---|
| **FF-6601** | `test/arch/acd-feature-parser-single-home.test.mjs` (7 cases) | **GREEN** — one recogniser under `src/`; the named renderer excluded | Planted `SCENARIO_RE`/`FEATURE_RE` in `src/work.mjs` (the HEAD state 66/00 removed) → `the grammar must have one home; recogniser hits: [{feature-parse.mjs…},{"file":"src/work.mjs","hits":["^Scenario( Outline)?:","^Feature:"]}]`. Copied the step lexer into `src/work-read.mjs` → same lane red naming both files. Planted a keyword **table** in a second module → `hits: ["Feature:", "Given "]` (was invisible to both lanes before fix round 1) |
| **FF-6602** | `test/arch/acd-acceptance-horizon-single-predicate.test.mjs` (7 cases) | **GREEN** — one predicate, one lifecycle vocabulary, every `.feature` write site create-only | Returned the second lifecycle copy to `src/import/recovery.mjs` → `the frozen five have ONE home … + 'src/import/recovery.mjs'`. Planted a copy in the tail of `src/mesh-ui-serve.mjs` — the region the trap order used to swallow → `… + 'src/mesh-ui-serve.mjs'`, proving the eyesight is restored. Removed `flag: "wx"` from the migrate scaffold → `the site declares create-only AT THE CALL: … "utf8"` / `false !== true`. Drove the guard with a trap-order stripper → `the comment stripper hid 326 line(s) of code in src/mesh-ui-serve.mjs that the one home keeps — TECH_DEBT item 24 …` |

| **FF-6603** | `test/arch/acd-register-declaration-form.test.mjs` (9 lanes) | **GREEN** — id-first inside a frozen block; fences and HTML comments skipped; opener normalises; union resolution | Flipped `ADR`/`R` from `scope: "document"` to `"register"` → **3 of 7 lanes red**, incl. `m52/ADR-007 resolves against milestone 52's own documents` and `…and the union resolves them (2355/2365 unresolved)`. Removed `(?<![-\w])` → `` `ADR-001/ADR-008` is one ADR superseding another, not a citation of item `001` `` / `+ [{ id: 'ADR-008', item: '001', … }]`. Dropped the dot from the lookbehind class → `` `R4.1/R4.3` is a pair of lesson clauses — reading `1/R4` cites a milestone the text never names ``. Planted a form-tolerant recogniser, a bullet entry, and a row in a citing block → each refused with its companion positive still found |
| **FF-6604** | `test/arch/acd-declared-id-single-home.test.mjs` (7 lanes) | **GREEN** — one home across 227 modules; memory imports only the forms; 600 records byte-identical over 13 fields | Restored one inline literal (`const RETRO_HEADER_RE = /^#{2,3}\s+R\d+\b/;`) in `local-indexing.mjs` → `the grammar has ONE home; hits: [{declared-id.mjs …}, {local-indexing.mjs, shapes:["R\\d+"]}]`. Gave the `ADR` form a `\b` terminator its shipped literal lacks → `the adr split + '^#{2,3}\\s+ADR-\\d+\\b' - '^#{2,3}\\s+ADR-\\d+'`. Drove the differential with a **hyphenated** `R` form → `the SECTION SPLIT moved` (the defect that would silently drop 259+ lesson records). Drove the guard with a trap-order stripper → refused **per blinded module**, `hid N line(s) of code … TECH_DEBT item 24` |

| **FF-6605** | `test/arch/acd-controls-never-execute.test.mjs` (9 lanes) | **GREEN** — the lane is a true leaf: 2 direct imports, both zero-import leaves, no edge back from the spine | Planted `import { readFile } from "node:fs/promises"` → `the lane imports only node:path, ./acceptance-horizon.mjs, ./declared-id.mjs … + ['node:fs/promises']`. Planted `Date.now()` → `the lane reads no wall-clock — 'now' arrives through ctx`. Planted `void import(control)` → `a dynamic import() of a cited module EXECUTES its module scope, which is ACD running a project's test code (ADR-004 §2)`. Removed the spine's import of `citedControlPathsIn` → `…and its pure extractor, to learn which paths to probe (ROUND 3/3)` |
| **FF-6606** | `test/arch/acd-controls-finding-envelope.test.mjs` (6 lanes) | **GREEN** — envelope frozen, all eight codes reachable | Renamed `staged-control` → `staged-control-file` → **both** lanes red. Emptied the staged emission loop leaving the code set untouched → the frozen-set lane stayed **GREEN and blind** while `every frozen code is reachable; missing: staged-control` went red — confirmed independently by the architect on a rewritten copy. This is the lane that makes *"an unreachable code is as much a defect as an unfrozen one"* real. Added a fifth key → `keys: {…,"line":7,…} + 'line'`. Relativised the anchor → `ARCHITECTURE.md is a RAW ABSOLUTE in OS-native form — relativising is the face's job (the 08/ADR-002 keystone)` |
| **FF-6607** | `test/arch/acd-no-staged-control.test.mjs` + `test/arch/acd-milestone-66-controls-resolve.test.mjs` (4 + 4 lanes) | **GREEN** — no staged control; every `FF-66NN` resolves under both legs; and **ADR-011/E's accept gate**: no `done` item's register declares an unresolved control | Planted `…/tasks/staged-probe.test.mjs` → `a control lands in the runnable tree where a runner can see it — never staged beside its documentation (ADR-004 §4)`. Removed a landed control → `leg A: … is a file on disk … false !== true`. Runner naming nothing → `with a runner that names nothing, every landed control is reported — leg B has teeth … 0 !== 7`. Reverted the ownership filter → `the milestone owns its own file and NOT its story's — the story's dir is a nested item`. **The accept gate, driven three ways**: the real stream with m53 flipped to `done` → all thirteen refused by name; the gate made MARKER-shaped → `a done register holding an unresolved control is refused, 0 !== 1`; the marker allowed to excuse → `the pending marker does not excuse an unresolved control at done` |

| **FF-6608** | `test/arch/acd-verification-template-shape.test.mjs` (14 lanes) | **GREEN** — sixteen frozen asks present in every file whose reader must obey them; the template's four headings and two table headers; the placeholder byte-equal across the JS/markdown seam | **Seven on-disk probes**, each planted in the real shipped bytes, run in a fresh child process, restored and **sha256-verified identical** (`restored: OK — bytes identical` ×7). **P1** removed the reviewer rule from `aof-designer.md` → 7 red, `missing: unnumbered-findings in agents/aof-designer.md`. **P2** drifted the placeholder by **one comma** → 5 red, incl. `the template carries the placeholder exactly once, byte-for-byte as src/work-doctor-controls.mjs exports it`. **P3** `## Fitness functions` → `## Fitness register` → 8 red, incl. `and the fitness block CITES, never declares (ADR-008 ruling 4)`. **P4** removed the `id` column → 2 red, `'invariant' !== 'id'`. **P5** paraphrased the runnable-path sentence → 10 red. **P6** flipped the accept rule to the polarity the old fragment accepted → 2 red. **P7a/b/c** removed, paraphrased, and planted a joined specimen against the seventh ask → 6, 6 and 1 red. QA independently drove a **whitespace-only** drift (4343 → 4344 bytes) → exit 1, 31/35, restored sha256-identical |

**The instrument was probed, not only the subject.** FF-6602's non-vacuity witness went through four
measured candidates against the four genuinely-blinded modules: last-code-line survives **0 / 4**;
export count **2 / 4** (silent on the very module that caused this story's false green);
declaration count **3 / 4**; code-line count against the one home's own stripper **4 / 4, 0 false
positives** — which is what ships. Recorded because F-01 is the case for measuring a control's
eyesight rather than asserting it.

## Findings

<!-- Seven frozen columns (verify.md:99), id ALONE in the first cell (ADR-001 §2). Reviewers reported
     these UNNUMBERED; the ids were allocated here, at landing (ADR-006). -->

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| **F-01** | FF-6602 was **green for the wrong reason**: its stripper removed block comments before line comments (TECH_DEBT item 24's trap order, copy 33), hiding 1,349 lines of `src/` from its own sweep. The "frozen five have ONE home" lane passed only because the stripper had deleted the second copy at `src/import/recovery.mjs:508-514` | defect | **high** | fixed — local copy deleted in favour of the one home (`test/support/source-slice.mjs`); second copy removed by deriving `normalizeStatus` from `VALID_STATUS`; non-vacuity witness added and measured at 4/4 | developer (66/00) | **closed** |
| **F-02** | FF-6601 could not see the copy shape most likely to arrive — an array of keyword strings plus `startsWith` over a variable, which is what the one home itself uses. Planted in a second module it classified as `recognisers: [] renderers: []` | defect | **high** | fixed — added the keyword-**table** shape (array *and* object literal), structural cuts replacing a 40-char lookback, and the shape added to the planted-defect lane; lane 2 narrowed so a UI label is neither | developer (66/00) | **closed** |
| **F-03** | The board's `/api/work/tasks` payload was widened — `scenarios[]` gained `verification` and `line` because `tasks.mjs` spread the parser's output unfiltered, against ADR-003 §1's "blast radius exactly one module". `line` had zero consumers repo-wide | defect | medium | fixed — `tasks.mjs` curates to `{name, outline, lane}` inside `parsedTask`, so both the local and streamed paths are restored | developer (66/00) | **closed** |
| **F-04** | `{ flag: "wx" }` turned a silent overwrite into a **whole-command abort**: two recovered tasks colliding on one scaffolded name aborted migrate with a raw `EEXIST`/`status: undefined`, against delivered contract `29/03_source-shape-tolerance.feature` | defect | **high** | fixed — collision removed upstream at `recoverSourceTasks` (deterministic `(number, source file name)` sort, slug-suffix de-duplication, one shared name derivation); the flag stays, so create-only remains structural | developer (66/00) | **closed** |
| **F-05** | The `VALID_STATUS` destructure in `recovery.mjs` made the frozen set's **iteration order load-bearing**, and the only test touching the order deliberately `.sort()`ed it away — reordering the literal would silently swap `blocked`↔`in-review` for every imported milestone with every suite green | defect | medium | fixed — ordered `deepEqual` against the frozen order, with the hazard named at both the pin and the destructure; probe confirms 1 + 8 red on a reorder | developer (66/00) | **closed** |
| **F-06** | FF-6602's replacement non-vacuity witness (export count) **overclaimed its reach** — measured, it fired on 2 of the 4 blinded modules and was silent on `import/recovery.mjs`, the module whose blinding caused F-01. The lane passed only because the walk happened to include two modules that lose exports | defect | medium | fixed — witness is now a code-line differential against the one home (4/4, 0 false positives); the lane asserts **each** blinded module individually; the comment states measured reach, not an absolute | developer (66/00) | **closed** |
| **F-07** | The `recovery.mjs` status derivation landed **unpinned by the repo** — zero `status` assertions existed in `test/import-recovery.test.mjs`; the equivalence evidence was a reviewer's session, not a test | test-gap | medium | fixed — 19 status rows + a closed-vocabulary test driven end-to-end through `recoverMilestone`, covering all four branches, all four both-match precedence cases and the fallbacks | developer (66/00) | **closed** |
| **F-08** | The reject table's caption in `tasks/00` claims every cited file is under a `done` milestone so "the citation cannot go stale" — **row 5 cites `53/01/tasks/04_gate-order-and-cap.feature`, which is under an `in-progress` milestone** and is the one live file this gate exists to make somebody fix. When they fix it, four tests go red at once | design-gap | medium | recorded here, in the accepting item — the `.feature` is this story's locked contract and was not edited (the m65/00 pattern). The tests carrying the claim were given task 02's re-measurement wording, so the future red reads "re-measure and record", not "the parser broke" | PO (recorded) | **accepted-with-note** |
| **F-09** | The `open→error / closed→warn` severity mapping that three rows of `tasks/01` describe has **no home in `src/`** — it exists only in two test copies, because ADR-009/E ships no doctor parse code. The rows fabricate a finding and assert the pre-existing m15 exit policy over it | design-gap | medium | **deferred to 66/02**, which imports the horizon: when the doctor rendering lands, the mapping must be homed in `src/acceptance-horizon.mjs` and the two test copies deleted | 66/02 | **open** |
| **F-10** | "A milestone record document follows the MILESTONE's status" is covered by a tautology — the assertion cannot fail given its two predecessors, and no shipped code path applies the horizon to a milestone record doc (`validateWork` applies it at `item.type === "story"`) | design-gap | low | deferred — the clause becomes real when a check first gates on a milestone record doc; assert it there | 66/02 | **open** |
| **F-11** | `src/feature-parse.mjs` admitted four constructs beyond the contract's boundary table (```` ``` ````, `Scenarios:`, `Scenario Template:`, `Rule:` — each measured 0 in the corpus), and the comment justifying the fence admission was **measurably false** ("carries fenced markdown as often as `\"\"\"`"; actual: 0 files vs 2) | defect | low | fixed — comment corrected with the measurement, all four admissions named in the header, and the unmatched-fence masking risk stated (a stray fence swallows the rest of the file and silently disables the gate below it) | developer (66/00) | **closed** |
| **F-12** | Mutation survivor: rewriting `EXAMPLES_RE` so it never matches left **0 of 156 tests red** — every row passed on the blank line preceding `Examples:`, never on the keyword branch | test-gap | low | fixed — a variant with `Examples:` directly under a step, no blank line; the probe now goes red | developer (66/00) | **closed** |
| **F-13** | The fixture churn silently defanged two tests — `work.test.mjs`'s well-formed-stream case and `work-validate.test.mjs`'s `depends:[99]` collateral guard both kept a `done` story, so their features were never read | defect | low | fixed — both fixtures open their story, so the clean-feature path is exercised again | developer (66/00) | **closed** |
| **F-14** | The god-node ratchet was pinned at the **old** value (`< 1212` against an actual 1209), so `work.mjs` could regain 32 lines and still pass | enhancement | low | fixed — pinned at `< 1210`, counted the way the cited numbers are | developer (66/00) | **closed** |
| **F-15** | Two pre-existing reds at HEAD, neither in this story's change set: `command-core-contract :: "the registry exposes exactly the known work commands"` (m51/m52 registry ids missing from the expected list) and `acd-no-new-silent-catch` (`board-worker-stream.mjs`: 1 site, baseline 0) | inherited | medium | out of scope — named here so "one pre-existing red" is not recorded as the whole picture (TECH_DEBT item 27's shape) | backlog | **open** |
| **F-16** | `work doctor --strict` is **permanently red** on this repo — 220 `mtime-ahead-of-updated` and 61 `doc-over-budget`, some on delivered records nobody may edit. Contract-consistent with `tasks/01`'s ruling that the face owns the exit, but the "gate nobody can clear" failure mode exists one layer up | design-gap | low | recorded for 66/02, which builds on the horizon | 66/02 | **open** |
| **F-17** | Two sibling unreachable fallbacks remain at `migrate-folder.mjs:128` (`|| "migrated"`) and `:142` (`` || `unit-${idx}` ``) — same species as the one this story removed | code-health | trivial | flagged rather than widening this story's scope | backlog | **open** |
| **F-18** | `test/` has **no interior structure and no ratchet** — 429 flat root `.test.mjs` siblings plus 289 in `test/arch/`, while `src/`'s flat root is ratcheted every milestone (item 10). It is exactly the surface TECH_DEBT items 17, 27, 39, 50 and 52 keep finding defects in, each found by a reviewer rather than by a control | code-health | medium | routed to `TECH_DEBT.md` as a proposed new entry (shape: extend item 10's measurement table to the test tier, then a per-milestone growth ratchet, with `test/support/` as the existing proof that interior structure is available and unused) | backlog | **open** |

### Story 66/01

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| **F-19** | **The id was silently TRUNCATED when a suffixed id was followed by prose** — the id alternation ended in a greedy `[A-Za-z0-9-]*` with no run-on guard, so the engine backtracked **into** the id until a hyphen inside it served as the separator. Live at HEAD: `\| **F-49-VER-b** (GAP-6) \|` declared `F-49-VER`, so `49/VERIFICATION.md:603-606` declared one id **four times** (a false `register-duplicate-id` for 66/02 on arrival) while `F-49-VER-b/-d/-e/-f` were declared nowhere | defect | **major** | fixed — `RUN_ON_GUARD = (?![A-Za-z0-9-])` built once by `declarationRe(forms)`, hand-transcription updated in the same edit. Blast radius reconciled across three measurements: **20** per-line flips corpus-wide (m47 ×14, m49 ×4, m45 ×2) but only **4 in-block**, so the genuine false-duplicate is m49's — m47's eleven-fold `F-47-V` was outside a register block and invisible to the check. **0** real declarations lost | developer (66/01) | **closed** |
| **F-20** | **The `(?!\.\d)` citing-side guard was WRONG, and review had endorsed it.** Raised as unfalsifiable ("2,365 with, 2,365 without — drops zero"); the builder contested with evidence and the reviewer **withdrew the ruling**: its measurement was a `node -e` escaping artifact that reduced the search string to `(?!.d)`, making `String.replace` a no-op that compared the regex against itself. Re-measured: the blanket guard drops **35** refs, of which **34 resolve** — 30 `ADR` + 4 `R` **clause pointers** (item 27's `ADR-006` clause 4; item 34's `R3` clause 2 — written apart per ADR-010/D, because joining a specimen plants it in this register as a real citation) whose base id is genuinely declared. It does not fabricate findings; it **hides 34 valid citations from `register-dangling-citation` permanently** — an unbounded silent coverage hole, the worse species for this milestone, not the lesser | defect | **major** | fixed — guard scoped per-branch to `FF`/`F`/`D` (a regex cannot ask which branch matched after the fact); drops exactly **1** ref, `4/F-06.5`, whose base `F-06` is undeclared. Ruled in **ADR-010** | developer + architect (66/01) | **closed** |
| **F-21** | **The per-branch guard unmasked a dot-joined item-ref artifact** — ROUND 3/2's class with `.` in place of `-`. `(?<![-\w])` refused a hyphen or word character before an item ref but not a dot, and a dot is an id-continuation character here: `R4.1/R4.3` → a citation of milestone `1`; `43/02/R4.4/R4.5` → one real citation plus one fabricated. **7 fabricated citations**, six resolving silently-wrong and one dangling — a false finding 66/02 would report | defect | **major** | fixed — one character, `(?<![-\w.])`: removes exactly those 7, drops no legitimate ref (2,400 → 2,393), and preserves the qualified forms — item 52's `ADR-007` with the `m` prefix, story 66/01's `F-3`, and item 27's `ADR-006` clause 4 (written apart, ADR-010/D). Pinned by a lane asserting every difference sits after a dot in its source file. Ruled in **ADR-010/D** | developer (66/01) | **closed** |
| **F-22** | **A reviewer's regex measurement taken through `node -e` is not evidence** — shell-plus-JS escaping silently produced a no-op `String.replace` and a false zero that would have shipped the blanket guard. Reproduced **twice more** while fixing it: once by the builder, and once by the architect writing the very ADR about it (a quoted heredoc dropped a backslash level, `\d` → `d`, all six matrix cells returning `refs 0`) | process-defect | **major** | fixed structurally — every counterpart grammar in FF-6603 is now built through a **checked replace** (the search string is asserted to occur in the shipped source, and the result asserted to differ), so the trap is a lane rather than a habit. Frozen as a ratchet in **ADR-010/E**, which also extends ADR-009/A's measure-against-HEAD rule to **reviewers** | developer + architect (66/01) | **closed** |
| **F-23** | `test/arch/acd-register-declaration-form.test.mjs` pinned milestone 66's own register to a **stored eight-id list** — the only stored equality in either suite, over a population that had already moved twice inside this milestone. A ninth closure ADR would redden a **66/01** lane inside 66/02's or 66/03's build | defect | medium | fixed — shape assertion (`/^FF-66\d\d$/`, count > 0) set-equal to the ids the register's own rows carry, read independently via a first-cell scan. ADR-010 landing as the tenth ADR proved the fix immediately | developer (66/01) | **closed** |
| **F-24** | `registerEntries` never honoured `ID_FORMS[].scope`, so `### R1 — a lesson` inside a frozen block would yield a **register** declaration of a document-scoped form — and ROUND 3/1's union would then declare that id twice, a false duplicate for 66/02. 0 in the corpus today | design-gap | medium | fixed — an internal `REGISTER_DECLARATION` over register-scoped forms drives the block walk, while `declaredIdOn` keeps all five so Outline 2's `## ADR-001:` still answers "declaration". Split confirmed clean; no 66/02 precondition needed | developer (66/01) | **closed** |
| **F-25** | FF-6603's union lane harvested `ADR`/`R` headings from **every** `.md`/`.feature`, while ROUND 3/1 says "memory's whole-document headings" and memory reads only `ARCHITECTURE.md`/`RETROSPECTIVE.md`. 66/02 will code `register-dangling-citation` against this lane as its reference | defect | low | fixed — filtered to `MEMORY_SOURCE_FILES`, cited to `local-indexing.mjs:648-657`. A precision fix: the ratio is unchanged | developer (66/01) | **closed** |
| **F-26** | **The heading anchor `^#{2,3}\s+` had a second home, four times, and it was dead code** — in the `headMatch ? … : header.replace(…)` fallback at `local-indexing.mjs:139,194` and `recovery.mjs:304,329`. Measured: 604 headings matched by the split, **the fallback reached 0 times** (the capture head is strictly more permissive). A second spelling of the grammar, in the story that gives it one home | code-health | low | fixed — all four deleted, `#{2,3}` added to `ID_PATTERN_SHAPES`, scan reports `declared-id.mjs` as its only home across 227 modules. The two `recovery.mjs` regexes hoisted to module scope so the leaf's own module-scope claim is true of both readers | developer (66/01) | **closed** |
| **F-27** | Feature 01's *"identical to its golden across all 13 fields"* was asserted at **three** fields, and *"recall answers the same as before, in the same order"* was a **self-comparison of the post-state** (the same query run twice after the extraction — run-to-run determinism, not before-versus-after) | test-gap | medium | fixed — an exported `goldenRecords` reimplementation driven by the `BEFORE` literals now `deepEqual`s the whole record and asserts `Object.keys(record).length === 13`; recall order ranks the pre-extraction golden through the shipped pure `rankRecords` and compares against the real `runMemory recall --json` | developer (66/01) | **closed** |
| **F-28** | **The story partition's independence claim is false.** `ARCHITECTURE.md:662` says 66/01 "shares no file with 66/00, 66/02 or 66/03" — but **both** stories edited `src/import/recovery.mjs`, and the two edits land in the **same hunk** (66/01's import directly beneath 66/00's at `:35-40`). Sequenced it was invisible; run concurrently **as the partition itself prescribes**, it is a merge conflict in the import block. The mechanism is the lesson: the partition was grounded in `aof graph impact`, and **an import graph cannot see a duplicated literal, because a copy creates no edge** — so the one coupling this milestone exists to remove is the one its own boundary instrument is blind to | design-gap | medium | recorded here, in the accepting item — the claim sits in an immutable document. Nothing is at risk: 66/02 `depends: [00, 01]` and inherits a settled file. **For the next partition: grep for the DERIVATIONS each story owns, not only the import edges** | PO (recorded) | **accepted-with-note** |
| **F-29** | Feature 00's stated in-block populations (67 `\| **F-NN`, 51 `\| F-NN`, 21 `### F-NN`) do not reproduce under the shipped recogniser — measured **55 / 42 / 21**. The `### F-NN` figure and ADR-001 §1's whole-corpus `\| F-NN` ×101 both reproduce exactly, so the instrument is sound and the two table-row figures were frozen without measurement. Feature 01's `records` column (259/340) is stale by construction and the feature says so in its own prose | defect | low | recorded here — prose annotations in an immutable contract; **not** edited (the m65/00 pattern). ADR-009/A's ratchet applies: a claim about this tree is a measurement | PO (recorded) | **accepted-with-note** |
| **F-30** | **`test/memory-integration.test.mjs:79` is red at HEAD** — `the lesson/adr split sums to the record count: 600 !== 727`, because memory's `status` partitions by only **2 of 5** record kinds. Confirmed pre-existing three ways (HEAD baseline capture, a stashed-tree re-run, and a detached-HEAD worktree at `24fc181` with its own `node_modules`). This is **m40/R3 recurring verbatim**, and its *"Carry: a follow-up"* was never discharged: the gap grew from `363 !== 370` (7 records) to `600 !== 727` (127 = capability 76 + gap 49 + summary 2) across 26 milestones, and it appears in no ledger — **item 27's list does not name it** | inherited | medium | out of scope for 66/01 (different subject; its own record set is provably unchanged). Routed to `TECH_DEBT.md` **item 27** as a new row. The systemic half is 66's own thesis from the retrospective side: **a lesson recorded, cited and never executed is the same defect class as a control declared and never run** | backlog / retro | **open** |
| **F-31** | `declaredIdOn` and the block walk now **deliberately disagree** for document-scoped forms, and the export names do not say so | design-gap | low | one line in 66/02's contract, not a code change | 66/02 | **open** |
| **F-32** | `QUALIFIED_REF`'s lookbehind admits `/` before the item ref, so a repository path parses as a citation (`wiki/work/52/ADR-007` → item `52`). Harmless while such refs resolve; it inflates 66/02's citation universe | design-gap | low | recorded for 66/02 | 66/02 | **open** |
| **F-33** | **ADR-010's own first draft broke a live, green fitness function.** Its specimen refs for the seven fabricated citations were written joined, so FF-6603's lane 9 — which asserts every fabricated ref sits after a dot in its source file — found a backtick instead; the draft also planted one genuinely dangling citation (item 2's `ADR-016`, written apart here for the same reason), taking unresolved pairs 24 → 25 | defect | low | fixed **in the document, not the test**: every specimen is now written apart (`item` + `id`, never joined), and ADR-010/D states why. After the fix, unresolved is back to the pre-ADR-010 figure — the ADR adds no dangling citation. Recorded because it is the dogfooding working as designed: the milestone's own architecture document is subject to the checks it ships | architect (66/01) | **closed** |
| **F-34** | **The QA lane damaged the working environment**: `git worktree remove --force` followed a directory junction at `head-tree/node_modules` and deleted the repo's `node_modules/` and `ui/`. Disclosed up front by the reviewer rather than left to surface as a later build failure | process-defect | medium | restored by the reviewer (`git checkout -- ui`, `npm ci`, `npm run ui:build`) and **independently verified by the PO**: working tree shows only the story's own changes, `ui/` matches HEAD, the CLI runs. Lesson: never create a junction to the live `node_modules` inside a throwaway worktree — `--force` deletes through it | QA (66/01) | **closed** |

### Story 66/02

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| **F-35** | **ADR-004 §3 named "the discharge, and the whole mechanism" without naming its SURFACE, and nothing carried it.** Measured: an unlanded control reports `warn` at **every** status; a warn does not gate without `--strict`; `verify.md:103` gates on `aof:validate`; `validate.md:30,61` says a warn-only doctor result does not fail the skill; `validateWork` never sees a control. **Nothing refused the transition at any status** — and aof has no transition hook at all, since a status is frontmatter an agent edits. The milestone's own `xfail` primitive was a time-boxed statement with no expiry, unexamined through three closure rounds | design-gap | **major** | fixed — **and the literal reading would have built the WRONG gate.** ADR-004 §3 gates on the *marker*; measured, m53's 13 unresolved declarations are **all unmarked**, so a marker-shaped gate refuses **0 of 13** at the accept it exists for, while on m66 it would refuse **8** when **1** is owed (seven stale markers on landed controls). Ruled in **ADR-011/E** as *a `done` item's register declares no UNRESOLVED control, marker or no marker*, carried by a fitness function — the only one of ACD's three gates that can hold a claim about a prospective state. Green on arrival (2 registers, 16 declarations, 0 violations), with non-vacuity floors so a green over an empty set is impossible | qa → architect → developer (66/02) | **closed** |
| **F-36** | **The two-path resolution rule was untested — the mutant survived all 53 tests.** Changing `missing.length > 0` to `missing.length === entry.controls.length` (resolve when *either* path resolves) passed every suite. The behavioural suite asserted only the extraction half, and the arch test carried the message *"resolves only when BOTH do"* on an assertion checking just the id list — **the sentence claimed more than the assertion** | test-gap | **major** | fixed — a new lane drives all four combinations, each naming exactly the missing path(s), plus leg-B suppression in all three failing combinations; and the overclaiming sentence is narrowed to what it checks, with ADR-009/J now driven over this register's own row. QA's exact mutant is killed by **two** assertions | developer (66/02) | **closed** |
| **F-37** | **`stagedControls` was attributed to every ENCLOSING item, so the horizon judged the wrong owner.** A milestone's subtree contains its stories', so one file yielded two findings — and `dedupe` keys on code+path+message **without severity**, so the first row won. Measured: milestone `in-progress` + story `done` emitted `severity: "error"` against a path under a `done` item (forbidden verbatim by ADR-002 §1 and ADR-009/F), and milestone `done` + story `in-progress` **silently lost an error inside the horizon**. Population 0 today, so latent — and no fixture placed a story under a milestone, so nothing saw it | defect | **major** | fixed — `ownedBy` attributes each staged path to its nearest owning item (the longest item dir containing it), so each file lands on exactly one row; four-status fixture added, asserting on the **snapshot itself** before de-dupe can hide anything. Generalised in **ADR-011/D**: a snapshot fact derived from a recursive walk belongs to the item that owns the path | architect → developer (66/02) | **closed** |
| **F-38** | **Two contract rows were INFEASIBLE, and one was unbuildable because of a scenario in its own story.** `01_a-register-declares-once.feature:79` places a bare id in a `STATE.md` — which is not in doctor's document set, so honouring it costs **62 new reads** and breaks the budget frozen by `00_one-lane…feature:86-90`. `:82` is reachable but would police free prose: **329 dangling pairs at the literal reading, 304 in `done` items**; at the tightest defensible narrowing still **135 / 131** — unclearable by any legal edit, which the same feature's settling scenario forbids. **Precision on the live milestone is 0% at every scoping** — not one of the 20 is a citation | design-gap | **major** | superseded by **ADR-011/A**. The developer flagged rather than edited, which was correct. The shipped substitute polices the one *structurally identified* bare position — a citing register entry, where position asserts whose id it is — ruled the honest mechanisation of ADR-009/D | architect (66/02) | **closed** |
| **F-39** | Three neighbouring bare-id rows (`01:78`, `:80`, `:81`) **pass vacuously** — all answer "none" because the lane polices no bare prose at all, not for the reasons their text gives; and `:78` lost its only discriminating partner when ADR-011/A superseded `:79` | test-gap | medium | fixed and ruled — **ADR-011/F** names all three rather than leaving them green (their verdicts stay true; what is withdrawn is the claim that they *discriminate*), and each row's assertion message now states the answer is "none" by ADR-011/A's scoping rather than by the contract's stated mechanism | architect → developer (66/02) | **closed** |
| **F-40** | **Milestone 66's own record docs planted five `register-dangling-citation` errors** — specimen refs written joined, which ADR-010/D forbids for exactly this reason. Three were in the PO's `VERIFICATION.md`, written **after** that rule existed, while describing the very defect | defect | medium | three fixed by the PO (specimens rewritten apart). Two remain in ADR-009/D's `Basis` cell — an **ADR body**, superseded-never-edited — so no legal act clears them: `error` while 66 is open, `warn` at `done`. Admitted as a named measured population in **ADR-011/C**. The cheap fix was **refused with its measurement**: treating a citation inside a code span as a specimen would blind the check to **778 of 1,746 citations (44.6%)** — the unbounded silent coverage hole ADR-010/B already refused | architect (66/02) | **accepted-with-note** |
| **F-41** | **A dangling citation inside the module that ships the dangling-citation check** — `src/work-doctor-controls.mjs:388` pointed at a `bareProseCitations` note that does not exist (1 occurrence, 0 definitions). Plus `src/work-doctor.mjs:294` cited `01_one-lane…` for a file named `00_…` | defect | low | both fixed; the first now carries ADR-011/A's discharge and its measurement | developer (66/02) | **closed** |
| **F-42** | `RED_PROBE_PLACEHOLDER`'s "one home" claim is **unenforceable across the JS/markdown boundary** — a template cannot import a constant, so the two literals are physically separate and will drift silently | design-gap | medium | routed to **66/03's FF-6608**, which must assert the shipped template's cell is byte-equal to the export. Named in the module rather than left implicit | 66/03 | **open** |
| **F-43** | Doctor's snapshot now retains the full text of every record document — **396 documents, ~12.6 MiB**, on every run, growing linearly with the stream. The controls lane is the only consumer and needs text only where a register opener occurs | code-health | medium | priced and accepted at refine, so not a regression — accretion worth scheduling. Fix shape: keep `docTexts[name]` only when `registerBlockKind` saw an opener (or the doc is a memory source), turning whole-corpus retention into per-register. Proposed `TECH_DEBT.md` entry | backlog | **open** |
| **F-44** | The PO recorded the day-one error count as **23** when the live figure is **20** — a pre-fix number carried into a post-fix record | defect | low | fixed here. Recorded because it is the same species the milestone refuses: a number asserted from a report rather than re-measured after the change that moved it | PO | **closed** |

### Story 66/03

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| **F-45** | **The shipped prose promised an accept refusal the machinery does not perform.** Driven at every status: with a `pending` marker `control-unresolved` is `warn` at **every** status including `done`; doctor exits 0; `validate.md:61-62` says in its own words that a warn-only doctor result does not fail the skill; so `verify.md` step 4's "require PASS" is satisfied and **the accept proceeds**. Four files claimed otherwise, three deriving it with an invalid *"so"* from `warn`, and one asserting *"the refusal arriving on time"*. **This milestone's own thesis — a control that depends on somebody remembering is a wish — shipped as a promise into every future project's templates** | defect | **high** | fixed — one byte-identical sentence now ships in **all five** files, with no derivation and the instrument named: *"Nothing refuses the transition for you: `aof work doctor <ref>` reports each one as `control-unresolved`, a standing `pending` marker downgrades it to `warn`, and a warn-only doctor result does not fail `aof:validate`."* `verify.md` step 4 now reads *"apply the accept rule yourself, because no gate applies it for you"* | qa → developer (66/03) | **closed** |
| **F-46** | **`aof-qa.md` contradicted the single-writer premise ADR-006's soundness argument rests on.** `:22` gave QA ownership of the `VERIFICATION.md` Findings log and `:36` write access — while this story ships *"a stale read is impossible when there is no second reader"* and a template header reading *"Owner: product-owner — the SINGLE WRITER"*. And `:34` told QA to author a `@finding-<id>`-tagged scenario **three lines after** forbidding QA to choose an id — two instructions agreeing literally and conflicting in effect, which is exactly the scenario's subject | defect | **high** | fixed — **no new ADR needed: ADR-006 decision 2 already rules it** (*"the product owner … already the sole author of record docs"*), so `aof-qa.md` was counter-evidence, not a competing decision. Blast radius checked: the string lived only in `aof-qa.md:36`, so narrowing supersedes no delivered contract. `:22` → report-not-own, `:36` → clause dropped, `:34` → *"(+ the `@finding-<id>` the writer allocated)"* | developer's `@manual` M3 → qa → architect → developer (66/03) | **closed** |
| **F-47** | **The template over-claimed, in the milestone's own voice** — *"indistinguishable from a broken one by every signal except **this cell**"*. The claim it is drawn from is about **a red probe, the act**; a record *cell* distinguishes nothing, and a fabricated cell is indistinguishable from an honest one — which the same comment concedes nine lines later. **The act swapped for the record, in the milestone whose whole subject is that distinction, in the artefact every future project inherits.** No assertion could catch it: it is prose, and every token-presence lane was green | defect | **high** | fixed — `except this cell` → `except a red probe`. **Found by the `@manual` reader in its own author's output.** Where a story ships prose, the reader-judgement lane is not a formality; it is the only control there is | developer's `@manual` M1 (self-caught) | **closed** |
| **F-48** | **A lane whose NAME asserted a reconciliation its BODY never read** — it checked that the prompt contains `@finding-<id>` and that the new frozen literal contains a substring of itself, never reading the **old routing sentence**. That is why F-46 shipped green and needed a human. Sixth instance of m45/R5 in this milestone, in the story shipping the cure | test-gap | **major** | fixed, and better than prescribed — a `TAG_ROUTING` table carries each agent's routing sentence **and its pre-fix wording**, both driven through `routingIsReconciled`, so the suite **proves the drift that shipped green** rather than merely preventing the next one (`aof-qa.md` pre-fix → `reconciled: false`) | architect → developer (66/03) | **closed** |
| **F-49** | `refine.md:51` still asked for the arch-test **file** at Decide — the requirement **ADR-004 §3 explicitly replaced** — sitting directly above the new block making the declaration the reviewable artifact. A top-down reader meets it first | defect | medium | fixed — *"+ the fitness functions DECLARED in its register (the arch-test file lands with its subject)"*. Needs no ADR record: the story was failing to land a decided thing | developer's `@manual` M2 → architect → developer (66/03) | **closed** |
| **F-50** | **8 of 14 frozen asks were polarity-blind fragments, and the one guarding the accept claim was the worst.** `accept-precondition` was a 7-word token that **both** *"It is fine to accept an item that declares a control that does not resolve"* and *"Nothing stops an accept when the register declares a control that does not resolve"* satisfy. A token-presence test passing on prose that says the opposite — in the story that ships the rules | test-gap | **major** | fixed — `accept-precondition`, the three `scope-limit-*` and `red-probe-ask` are now whole sentences carrying their own polarity, each with a reversed-polarity probe proving the fragment version passed and the sentence does not. **Two fragments deliberately remain** (`declaration-id-first`, `pending-token`) as a **named shrink-only baseline** (m47/R9), asserted **exact** so a fifteenth fails, with both holes **measured** rather than asserted: *"the id must NOT be ALONE in the first cell"* → satisfies; *"a landed control never carries the token `pending`"* → satisfies. Widening them would rewrite seven shipped sites — scoped out, not overlooked | qa → developer (66/03) | **closed** |
| **F-51** | **Milestone 66 was REFUSED BY ITS OWN GATE.** Its `ARCHITECTURE.md` carried two `register-dangling-citation` findings at `error` (ADR-009/D's `Basis` cell). ADR-009/C runs the check *before* the transition, so at accept they were errors; step 4 requires PASS; and the prompt's clearing acts — land the file, drop the declaration — apply to neither. **No waiver path existed and adding one was refused** | defect | **high** | fixed by **ADR-012/A**, on a stronger ground than proposed: **the two tokens quote nothing.** They trace to slash-joined ID *pairs* in two retrospectives, which the shipped lookbehind reads as `[]` — so the cell transcribed the **pre-ADR-010/D grammar's own output**, an artifact ADR-010/D had already withdrawn. Repair removed no evidence; legality was **mechanical** (declarations and entries byte-equal, `qualifiedRefsIn` loses exactly the repaired tokens and gains none, every lost token unresolved). Refs 41 → 39, tree-wide errors 17 → 15. The carve-out alternative was refused **with its number**: ADR bodies hold **917 of 2,421** citations (37.9%) vs the 34.6% code-span population ADR-011/C already refused | qa → architect | **closed** |
| **F-52** | **ADR-010/D's write-apart rule was frozen in an ADR and shipped to nobody** — 0 files in `src/bundle/` carried it. The five citation asks all said *"cite only ids that resolve"* and nothing about quoting one that does **not**, so the author of ADR-009/D had no rule to follow. **A gate with no ask — which ADR-007 §1 forbids — in the milestone that wrote ADR-007 §1** | design-gap | **major** | fixed — shipped as the **seventh ask**, byte-identical across three files, in `FROZEN_ASKS` with a whole-sentence polarity probe and on-disk probes P7a/b/c. `register-dangling-citation` now pairs with **both** halves. The guard's own positive control is built apart and **joined only at runtime**, because writing it joined in the guard's source would plant a citation in the guard that ships the rule. Three occurrences across three authors — ADR-010/D slipped twice drafting its own row, the architect once inside the ADR forbidding it — is what a rule with no ask looks like from the inside | architect → developer (66/03) | **closed** |
| **F-53** | **Two Examples tables were vacuous as to the pairing they assert.** QA re-ran the shipped assertions with deliberately wrong code→ask mappings (`staged-control` → the template, `verification-register-missing` → `aof-designer.md`, `control-unregistered` → `verify.md`) and with the place→ruling pairs **swapped** — all passed | test-gap | medium | fixed — `CODE_ASKED_BY` is now code → `{file, asks}` with `unpairedCodeAsks` checking the pairing and a lane driving QA's three wrong mappings; the place→ruling rows are cut on `refine.md`'s own list structure and require place and ruling in the **same** bullet, with every other row's ruling asserted absent from it | qa → developer (66/03) | **closed** |
| **F-54** | **ADR-005 §4's honesty boundary had a SECOND, unfrozen home** in `verify.md` (*"run on"* vs the template's *"performed on … actually shipped"*), so the one paragraph that must never inflate could drift with nothing red. Two shortened paraphrases of the citation-form rule shipped unguarded, and the accept rule shipped in **four wordings** with one guarded | defect | medium | fixed — spellings made identical and the `scope-limit-*` / `citation-form` / `accept-precondition` file lists extended (five files each) | qa → developer (66/03) | **closed** |
| **F-55** | `recordsARedProbe` returns **`true`** on the placeholder with one extra internal space, so a markdown reflow silently turns "missing probe" into "recorded probe". The shipped-template side is fully guarded; the author-side hole is real | design-gap | low | named as a **fourth silent hole** in the shipped scope note, per this milestone's own doctrine of naming holes rather than letting them be found | qa → developer (66/03) | **closed** |
| **F-56** | `pending` was called *"dated"* in `refine.md:73` and in a scenario title, and **nothing is dated** — no date is asked for, rendered or read | defect | low | fixed — *"bounded by the item's own accept rather than by a date — nothing here records or reads one"* | qa → developer (66/03) | **closed** |
| **F-57** | **The sixth ask (ADR-011/E) is shipped, guarded, and uncontracted** — no scenario in any task feature asks for it; the features enumerate five asks and stop. A reviewer reading only the `.feature` files would not know it was required. ADR-011 postdates the features, which explains it and does not fix it | design-gap | medium | recorded here, in the accepting item. The same now applies to the seventh ask (F-52). Both are covered by FF-6608 and by this record; neither is covered by a contract scenario | PO (recorded) | **accepted-with-note** |
| **F-58** | `aof-architect.md:29` landed *"never chosen by you"* **unscoped**, in the one agent file whose owner legitimately allocates `ADR-NNN`/`FF-NN` in its own register | design-gap | low | fixed — scoping clause added **outside** the frozen sentence (editing inside it would turn five FF-6608 lanes red) | developer's `@manual` M2 → architect → developer (66/03) | **closed** |
| **F-59** | **A measurement offered as the reason to SKIP an act was taken against the wrong artefact** — *"already 11 entries stale at HEAD"* was the **manifest's** staleness; the **installed copies** were 84 of 86 identical at HEAD and 69 of 87 after. The conclusion held; the justification was arithmetic about a different pair. **A number that licenses not doing something is a measurement too** | defect | low | justification restated with the right figures; the underlying drift ledgered as **TECH_DEBT item 54**, since nothing in the tree measures installed↔source at all. Leaving the copies stale is **correct** — they are `aof work update`'s output, and refreshing them mid-story rewrites the reviewers underneath the review | architect (66/03) | **closed** |

## Accept decision

**66/00 `contract-parses` — ACCEPTED, 2026-08-15.**

All 22 `@executable` scenarios green across 59 Examples rows; both declared controls green **with red
probes recorded above**; the scoped gate `aof work validate 66/00` exits 0; the whole-stream gate
reports exactly the one live file ADR-002 predicted and grandfathers the thirteen it may not touch.
Ten suites re-run independently at accept: 0 failures. No `@uat` scenario exists in this story, so no
human sign-off was required.

Structural verdict: **conforms.** Two review rounds; four blocking findings and three follow-on
findings, all closed at source — two of them (F-01, F-02) fixed *better* than prescribed, by reaching
for an existing shared home rather than writing another copy. Six findings remain open by decision:
three deferred to 66/02 (F-09, F-10, F-16), two to the backlog (F-15, F-17), one accepted with a note
recorded in this document (F-08). None is a red scenario or a blocker.

**66/01 `declaration-form` — ACCEPTED, 2026-08-16.**

All 10 `@executable` scenarios green over ~42 Examples rows; FF-6603 and FF-6604 green with red probes
recorded; `aof work validate 66/01` exits 0; 41 tests re-run independently by the PO at accept with 0
failures. The extraction moved no record — 727, byte-identical over all 13 fields, proven by three
independent measurements. No `@uat` scenario, so no human sign-off was required.

Structural verdict: **conforms**, and the story is a net simplification — eight literals across two
modules collapse into one zero-dependency leaf, and four dead heading-anchor fallbacks are deleted.
The architect ruled the unplanned `src/import/recovery.mjs` re-home **correct**, and stronger than
"does not breach 13/ADR-001": that ADR requires imports to materialise using the **exact** conventions
memory's parsers read, and two independently-maintained copies of the grammar is precisely how "exact"
could silently stop being true. One frozen leaf makes 13/ADR-001's own invariant structural instead of
coincidental — and the module graph now confirms `recovery.mjs` does not import `local-indexing.mjs`
at all.

Two review rounds; four blocking findings (F-19 – F-22) and ten follow-ons, all closed at source. Five
remain open by decision: two routed to 66/02 (F-31, F-32), one to the backlog and the retrospective
(F-30), and two accepted with notes recorded here (F-28, F-29). **ADR-010** was authored as the closure
ruling and lands at exactly the 700-line budget, paid for by compressing framing rather than growing
the document.

**The sharpest lesson of this story is that the REVIEWER was wrong, and the builder proved it.**
F-20 was raised as "a guard nobody has ever seen fail" — the right species of finding — but the
measurement behind it was a `node -e` escaping artifact comparing the regex against itself. Had the
builder complied instead of contesting, 66/01 would have shipped a guard that hides 34 valid citations
from the very check 66/02 exists to run: an unbounded silent coverage hole, created by the fix for an
unfalsifiable assertion. The same trap then caught the builder once and the architect once more, while
writing the ADR about it. It is now refused structurally by the checked-replace lane, and ADR-010/E
extends ADR-009/A's measure-against-HEAD ratchet to reviewers — because on this milestone a reviewer's
unmeasured claim is exactly as dangerous as a builder's.

**66/02 `the-controls-lane` — ACCEPTED, 2026-08-16.**

All 25 `@executable` scenarios green over 89 Examples rows; FF-6605, FF-6606 and FF-6607 green with
red probes recorded; `aof work validate 66/02` exits 0; 87 tests re-run independently by the PO at
accept with 0 failures. No `@uat` scenario, so no human sign-off was required.

Structural verdict: **conforms.** The lane is a true leaf — 2 direct imports, both zero-import
leaves, no edge back — so FF-6605's direct-plus-allowlist scoping is honest rather than convenient,
and the allowlist is closed by asserting each named leaf's zero-import property. Purity, the frozen
eight codes, the read budget, `scanItemTree`'s exact preservation of the freshness lane, and both
deliberately-distinct named holes all verified at source. Two review rounds; three blocking findings
and seven follow-ons. Two findings remain open by decision: F-42 (routed to 66/03's FF-6608) and
F-43 (accretion, backlogged).

**This story is where the milestone's thesis stopped being an argument.** Its own lane reported five
dangling citations against milestone 66 — three of them in the record document the PO had authored
*after* ADR-010/D froze the rule against them, while describing that very defect. No reviewer caught
those three; the check did. That is the whole case for mechanisation over recall, made by the
milestone against its own author.

**And the milestone's central mechanism was prose until this story.** ADR-004 §3 called the
accept-time refusal "the whole mechanism" but named no surface, and none of the three closure rounds
noticed that no surface could carry it. Worse, the literal reading would have built a gate on the
`pending` marker — which, measured, refuses **0 of 13** at m53's accept because every one of m53's
unresolved declarations is unmarked. The gate that ships asks the question that matters: does the
control resolve? Marker or no marker.

**66/03 `the-ask` — ACCEPTED, 2026-08-16.**

All `@executable` scenarios green (84 lanes across four suites) and **all three `@manual` scenarios
run and recorded above**; FF-6608 green with seven on-disk red probes, each restored and
sha256-verified. `aof work validate 66/03` exits 0. All 17 milestone-66 suites re-run independently
by the PO at accept: **263 tests, 0 failures**. **No `@uat` anywhere in the milestone**, so no human
sign-off was required.

Two review rounds; six blocking findings and nine follow-ons. Two remain open by decision, both
recorded rather than fixed (F-57: the sixth and seventh asks ship guarded but uncontracted; F-59's
underlying drift, ledgered as TECH_DEBT item 54).

**This story is the milestone's discharge of its own founding measurement.** The finding counted eight
falsifiability terms across `src/bundle/` at **0 files each** — the evidence that ACD had no
vocabulary for a control that can fail. All eight now ship, in the prompts and templates agents
actually read, with seven asks where there were none.

**And it is where the milestone learned what its own manual lane is for.** F-45 and F-47 are both
prose defects — a promise the machinery does not keep, and an act swapped for a record — in the
artefacts every future project inherits. **Neither was catchable by any assertion**, and both were
found by a reader: F-47 by the developer reading its own output. Set against F-48, where a lane's
*name* claimed a reconciliation its body never read and let a real conflict ship green, the pattern is
plain: **where a story ships prose, the reader-judgement lane is not ceremony, it is the only control
there is.**

## Accept decision — the milestone

**66 `Controls That Run` — ACCEPTED, 2026-08-16.** All four stories `done`; every declared control
green with a red probe recorded above; no `@uat` scenario exists in the milestone.

**The objective is met on its own terms.** SPEC asked whether an outsider could still land a fitness
function nothing runs, a contract no parser accepts, an id that collides with a sibling's, or an
assertion nobody has seen fail. Each is now a refusal with a named finding, and the milestone
demonstrated all four against **itself** before any other project saw them.

**The evidence that this is not a paper gate is that the milestone kept failing it.** Six times a
control here was wrong about the tree — a guard green because its own stripper had deleted the
evidence; two grammar claims no test could falsify; a reviewer's measurement that compared a regex
against itself; a lane whose name claimed more than its body read; a severity claim frozen without
running the accept it described; and, at the last, the milestone **refused by its own gate** over two
citations in its own architecture document. None was caught by intention. Each was caught by a
measurement, and each is recorded above with the number that caught it.

**What ships, stated at its real size.** ACD gained no test runner and executes nothing. It checks
that a control **exists where something else will run it** and that **someone has seen it fail** — a
smaller surface than "the controls work", and the shipped wording now says so in every file that
carries it. The named limits travel with it: a fabricated red probe is uncatchable by any declarative
model; leg B is an honest no-op until a project declares its runners, and this repo has not; and
TECH_DEBT item 50's hole — an imported-but-never-spread suite is invisible — survives, made no worse.

**Two follow-ons leave with the accept**, both ledgered rather than promised: the snapshot's ~12.6 MiB
text retention (F-43), and the installed-copy drift that nothing measures (F-59 → item 54). Milestone
53 is the first real subject of the accept gate, carrying **13 unmarked unresolved declarations** that
`aof work doctor` now names one by one.

---

**The milestone's own thesis was tested on itself and held — but only because a reviewer looked.**
F-01 is this milestone's exact failure mode, arriving inside one of its own deliverables: a control
that reports green while blind to the region containing the violation it exists to find. It was not
caught by the automated gate, by the `measured at HEAD` column the refine added as its countermeasure,
or by the build — it was caught by an architect re-running the guard with a corrected instrument.
That is the argument, recorded here rather than asserted later, for 66/02's resolution lane reaching
**ledgered-and-deferred** controls and not only declared-and-unlanded ones.
