// Fitness function: acd-test-suite-registration (m43 / ADR-014/E7, TECH_DEBT item 17;
// EXTENDED by m59/01, FF-5903, ADR-003 §2 — TECH_DEBT item 50 paid down).
//
//   "A test suite that no runner imports is not a weak gate. It is NO gate."
//   …and, a month later, at the cost of twenty-six suites: NOR IS ONE IT IMPORTS AND NEVER
//   SPREADS. The first sentence was policed by reading the runner's source text, which is a
//   claim about characters rather than about what CI will execute.
//
// WHY THIS EXISTS, measured rather than imagined (2026-08-03, 43/04's structural review).
// Both runners register their suites by EXPLICIT IMPORT (`scripts/test.mjs` and
// `scripts/test-unit.mjs`), and nothing checked that the set of imports covers the set of
// files on disk. Six suites were imported by neither — and FOUR of them are milestone
// 43/03's behavioural proof (38 scenarios), for a story that was reviewed, accepted and
// merged. They pass when run by hand; nothing would have said a word the day they stopped.
// A seventh (`mesh-ui-write-isolation-bounded`) has been RED and invisible since m25,
// testing a route that no longer exists.
//
// ── THE 59/01 EXTENSION: THE AUTHORITY MOVES FROM TEXT TO THE ASSEMBLED ARRAY ─────────────
//
// The lane above decided registration with `runners.includes(path.basename(rel))` — a
// substring search over the concatenated source of both runners. Spike 56 measured what that
// misses, twice and independently: **26 suites carrying 117 test entries were imported by
// `scripts/test.mjs` and never spread into the array it exports.** Every spread site vanished
// in ONE commit (`15e0a92`, 2026-07-26) with the imports left in place, so the files still
// looked registered — and this gate, the one whose entire job is to notice, read them as
// wired in for a month. Ledgered as TECH_DEBT item 50; paid down here.
//
// THE FIX IS NOT A SPREAD CHECK. That would be one more claim about text, and a commented
// `// ...someTests,` would satisfy it exactly as a comment satisfied the import lane — which
// is not hypothetical: four of the twenty-six were missed by the spike's own first census
// because each appears twice in the runner, once as an import and once inside a COMMENT, and
// the comments doing the shadowing assert liveness in prose that had been false for a month.
//
// So the rule is the one the runner itself would give. Lane 1 imports the ASSEMBLED `tests`
// array that `scripts/test.mjs` exports and asserts NAME-SET MEMBERSHIP for every suite on
// disk — the mechanism `acd-roundtrip-registration` (m04/00/03) has held for one family since
// milestone 4, widened here to the whole tree, with the walk RECURSING so `test/integration/**`
// stops sitting outside registration entirely. This is an EXTENSION of the guard already in
// service, not a sibling beside it: a new `acd-registration-membership.test.mjs` would be
// imported by neither runner, which by this file's own first invariant makes it no gate at all.
//
// THE DECIDER IS NOT DEFINED HERE. `registrationDecision()` lives in
// `src/work-audit/census.mjs`, so the CLI census and this gate cannot drift into two answers
// about the same suite, and so the shrink-only baseline has ONE home rather than one ledger
// and one loophole. ADR-003 §4 settles which of the two is the authority where they could
// disagree: THIS ONE — it runs inside the runner's own process, where every registered module
// is already loaded, so it decides by membership rather than by any text-level proxy. The
// census says so in its own findings.
//
// SHRINK-ONLY, with the baseline NAMED rather than counted, and every entry carrying its
// REASON and its ORIGIN. An entry leaves the list when the suite is registered (or retired);
// nothing is added without an ADR, because the whole point is that the next one fails. It
// carries exactly two suites today, and both are there because IMPORTING THEM TO DECIDE THEIR
// REGISTRATION WOULD EXECUTE THEM — `test/work/lifecycle/work-observe.test.mjs` is a `node:test` file, and
// `test/integration/cli-child-process.test.mjs` spawns the real CLI at module scope.
//
// PAID DOWN 2026-08-03, in the story that raised the ratchet (43/04), five of the six:
//   · m43/03's four (`artifact-sync-{drain,enqueue-hook,manifest}`, `claude-settings-merge`)
//     are now imported by scripts/test.mjs. They were green the day they were found — the
//     gap was registration, not correctness — so an ACCEPTED story's 38 scenarios now
//     actually gate CI. Re-measured on registration, per ADR-013/C5.
//   · the m25-era orphan `mesh-ui-write-isolation-bounded` was RETIRED, not repaired: its
//     subject (`POST /api/mesh/issue`) no longer exists, and its own siblings — including
//     `acd-mesh-issue-route-same-origin` — were parked in milestone 35's
//     reference/retired-dispatch-tests/ during m34's "global mesh only" correction. It was
//     missed then; it is there now, renamed `*.test.mjs` → `*.mjs` per that dir's convention
//     so no runner or glob picks it up.
//
// PAID DOWN 2026-08-29 (59/01): the twenty-six were re-spread, and the new rule's first run
// found a second population of the same species — six suites registered in
// `scripts/test-unit.mjs` alone, so `npm test` never assembled them. They were registered
// rather than baselined, because "it runs in the other lane" is exactly the reasoning this
// extension exists to make unavailable.
//
// ── SECOND SUBJECT, added 2026-08-12 (m47 / F-47-03-ARCH-4 → F-47-04-ARCH-2) ──────────────
//
// This file is the one place that asserts a property of THE FITNESS-FUNCTION SUITE ITSELF, and
// it now carries two of them. Lanes 1-2: a gate the runner does not assemble is no gate. Lanes
// 3-4: a gate that cuts source POSITIONALLY — a fixed character window, or a slice whose end is
// a second `indexOf` sentinel — is a gate that will eventually be wrong about the TREE rather
// than about the rule, and this repo has measured that six times.
//
// WHY HERE AND NOT IN A FILE OF ITS OWN, which is the tidier-looking answer and is refused by
// this file's own invariant: the runners are the only registration mechanism, a new
// `acd-arch-slice-structural.test.mjs` is imported by neither, and E7 says in terms that such a
// file "is green, red or deleted with identical effect on CI". Adding it to UNREGISTERED_BASELINE
// instead is forbidden above ("nothing is ever added without an ADR"), and the reviewing architect
// who wrote these lanes could not edit `scripts/`. If a later author prefers the dedicated file,
// the move is mechanical: lift lanes 3-4 out, register the new module in `scripts/test.mjs`
// (import + spread), and lanes 1-2 will confirm the registration on the next run.
//
// THE HISTORY, because the ratchet is the whole point. F-47-03-ARCH-4 was filed against ONE gate
// (`acd-mesh-ui-scope-visible`, which sliced `Fleet()` with a `+ 4000`-character window whose
// second marker sat 158 characters from the cutoff), remediated for that gate, and recorded as
// closing the SPECIES. It had not: the 47/04 structural review found a `+ 400` window in the gate
// ADR-011 rests on — markers at +169 and +157, margins of 231 and 243 — and a sweep of all 266
// gates then measured NINETEEN cuts across TWELVE files (five of them fixed windows), of which
// milestone 47 converted six in three gates. A finding filed against a FILE must not be closed as
// though filed against a SPECIES; the ledger below is what makes the difference mechanical.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { UNREGISTERED_BASELINE, baselineProblems, registrationDecision, runnerImportedSuites, walkSuiteFiles } from "../../../src/work-audit/census.mjs";
import { registrationSurface, suiteFilesBelow } from "../../support/registration/registration-surface.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
// The tree the walk covers, RECURSIVELY — the retired lane's TEST_DIRS was flat, which put
// `test/integration/**` outside registration entirely (56; ADR-003 §2).
const TEST_ROOT = "test";
// `scripts/test.mjs` imports this gate, so the assembled suite is resolved LAZILY inside run()
// (a deferred dynamic import) to avoid an eager import cycle that would read `tests` before the
// array literal has finished evaluating — the same reason `acd-roundtrip-registration` gives.
const runnerUrl = new URL("../../../scripts/test.mjs", import.meta.url).href;

// FLOORS, asserted BEFORE the membership claim rather than after it. A walk over a renamed root
// reads zero files and "no unregistered suite was found" becomes vacuously true — which is the
// exact failure milestone 59 exists for, and it would be a poor joke inside the gate that is
// this milestone's own subject. Each is a floor with headroom, never an equality: an equality
// would fail every legitimate addition, and a gate that reds for an unrelated reason is a gate
// that gets muted.
const WALKED_FLOOR = 300;
const ASSEMBLED_FLOOR = 500;
// The floor for the CLASSIFICATION read (see lane 1). It decides nothing; it only chooses which
// of two findings a miss is reported as — but a classification input read from an empty file
// would relabel every finding at once, so it carries a floor like every other read here.
const ASSEMBLED_IMPORT_FLOOR = 300;

// ── THE POSITIONAL-SLICE SPECIES (lanes 3-4) ──────────────────────────────────────────────
//
//   (A) A FIXED WINDOW — `code.slice(at, at + 400)`. The rules these instruments state are about
//       the ORDER or PRESENCE of things; the window measures the LENGTH of the region containing
//       them, which no rule mentions. It fails in BOTH directions and both have been measured on
//       real gates in this repo: a correct region that grows past the cutoff goes red with a
//       confident message about the rule, and a violation one character past it is invisible.
//   (B) A SENTINEL END — `code.slice(start, code.indexOf("\nexport ", start))`. A claim about
//       DECLARATION ORDER that nothing pins. Measured: move a declaration to the end of its file
//       and the "body" swallows every helper after it, so the defect the gate exists for reads
//       GREEN; make it the last of its kind and a later call is attributed to it, so a correct
//       tree reads RED.
//
// The cure is the ONE HOME — `test/support/source-slice.mjs`: `functionBody` for a declaration,
// `matchedBraceBody` for a block, `matchedParenSpan`/`enclosingParenGroup` for the call a callback
// belongs to, `blockOrStatementAfter` for the block a loop header owns. Each returns null when the
// cut cannot be made, and every caller then reports NOT FOUND rather than asserting over the wrong
// region.
const FIXED_WINDOW = /\.(?:slice|substring)\([^;\n]*?\+\s*(\d{2,})\s*\)/;
const SENTINEL_END = /\.(?:slice|substring)\([^;\n]*,\s*[^;\n]*(?:indexOf|search)\s*\(/;

// THE LEDGER — measured 2026-08-12 over `test/arch/*.test.mjs`, comments stripped, after milestone
// 47 converted its own five. Each entry is a CEILING, not an equality: a gate may hold fewer and
// may never hold more. A ceiling rather than an equality is deliberate — an exact match would fail
// a parallel agent's legitimate conversion, and a gate that reds for a reason unrelated to the
// change is the species this lane is about. Every entry names its debt; a number without a reason
// is how this species survived being closed once already.
const POSITIONAL_SLICE_LEDGER = new Map([
  ["acd-assignment-transition-seam.test.mjs", { max: 2, why: "applyAssignmentStatusFrame's body cut to the next `\\nexport ` — one declaration reorder from swallowing its neighbours" }],
  ["acd-control-stream-tailnet-only.test.mjs", { max: 5, why: "the worst survivor: the upgrade gate cut between two `indexOf` sentinels, and each door's body cut with a `+ 400` window" }],
  ["acd-cross-org-key-isolation.test.mjs", { max: 1, why: "`body.slice(nullCheckIdx, nullCheckIdx + 400)` — the same shape milestone 47 converted twice" }],
  ["acd-fact-projection-split.test.mjs", { max: 1, why: "a guard body cut to the next `\\n}`, which is a claim about indentation" }],
  ["acd-fleet-board-link-resolved.test.mjs", { max: 1, why: "DELIBERATE: the retired `+ 400` window, reconstructed inside a self-check so that gate re-proves on every run that the window reds on a CORRECT route. It is evidence, not an instrument the gate reasons with" }],
  ["acd-session-id-never-fabricated.test.mjs", { max: 1, why: "resolver body cut to the next `\\n}`" }],
  ["acd-session-leaf-per-session.test.mjs", { max: 1, why: "body cut to the next `\\n}`" }],
  ["acd-session-orphan-reaped.test.mjs", { max: 4, why: "four bodies cut to the next `\\n}`" }],
  ["acd-terminal-stream-transport-wired.test.mjs", { max: 1, why: "`launcherCode.slice(m.index, m.index + 300)` — a 300-character window over the launcher" }],
  ["acd-work-items-single-writer.test.mjs", { max: 1, why: "the `upsert.run(` call cut to the first `);`, which the first nested call breaks" }],
]);

function positionalSlices(source) {
  const hits = [];
  for (const line of stripComments(source).split(/\r?\n/)) {
    if (FIXED_WINDOW.test(line)) hits.push({ shape: "fixed window", line: line.trim() });
    if (SENTINEL_END.test(line)) hits.push({ shape: "sentinel end", line: line.trim() });
  }
  return hits;
}

export const archTests = [
  {
    name: "arch/43 ADR-014/E7 + 59 FF-5903 (acd-test-suite-registration): every test suite on disk contributes its tests to the ASSEMBLED runner suite — registration is runtime membership, and the unregistered set only ever shrinks",
    run: async () => {
      // ── FLOORS FIRST, THEN THE CLAIM ────────────────────────────────────────────────
      const files = await walkSuiteFiles(repoRoot, TEST_ROOT);
      assert.ok(files.length > WALKED_FLOOR, `the test tree was actually read (non-vacuous): ${files.length} suites, floor ${WALKED_FLOOR}`);
      // …and the walk RECURSED. A flat walk reads ~530 files and still clears the floor above
      // while leaving two whole roots unexamined, which is how `test/integration/**` sat outside
      // registration entirely until this extension.
      for (const root of ["test/arch/", "test/integration/"]) {
        assert.ok(files.some((rel) => rel.startsWith(root)), `the walk recursed into ${root} — a flat walk clears the file floor while never looking here`);
      }

      const { tests: assembledTests } = await import(runnerUrl);
      const assembled = new Set(assembledTests.map((entry) => entry.name));
      assert.ok(assembled.size > ASSEMBLED_FLOOR, `the ASSEMBLED suite was obtained and is non-vacuous: ${assembled.size} test entries, floor ${ASSEMBLED_FLOOR}`);
      assert.equal(assembled.size, assembledTests.length, "and the runner assembles no two tests under the same name — a duplicate would make one of them unobservable in a name-set membership check");

      // ── THE NAMES EACH SUITE EXPORTS ───────────────────────────────────────────────
      // Every file the runner registers is ALREADY in this process's module cache (the runner
      // imported it before this gate ran), so this is a re-read of loaded modules and not a
      // second evaluation of the tree. A file in the shrink-only baseline is deliberately NOT
      // imported: both entries there are carried precisely because importing them EXECUTES
      // them, and a gate that ran a CLI smoke to decide whether a smoke was registered would
      // be its own worst example.
      const carried = new Set(UNREGISTERED_BASELINE.map((entry) => entry.suite));
      const suiteNames = new Map();
      const unreadable = [];
      for (const rel of files) {
        if (carried.has(rel)) continue;
        try {
          const module = await import(pathToFileURL(path.join(repoRoot, rel)).href);
          const arrays = Object.values(module).filter((value) => Array.isArray(value) && value.every((entry) => entry != null && typeof entry === "object" && typeof entry.name === "string"));
          suiteNames.set(rel, arrays.flat().map((entry) => String(entry.name)));
        } catch (error) {
          unreadable.push(`${rel} — ${error?.message ?? String(error)}`);
        }
      }
      assert.deepEqual(unreadable, [], `every suite on disk could be read to learn the names it exports:\n  ${unreadable.join("\n  ")}\n\nA suite that cannot be imported cannot be registered either; convert it, or carry it in the shrink-only baseline with its reason and its origin.`);
      assert.ok(suiteNames.size >= files.length - carried.size, "the per-file name map covers every walked suite outside the baseline");

      // ── THE DECISION ──────────────────────────────────────────────────────────────
      //
      // `importedBy` is CLASSIFICATION, not decision, and the difference is the whole of this
      // file's argument. Registration is settled entirely by `assembled` above; the runner's
      // import text only chooses which of two findings a miss is REPORTED as — "imported and
      // never spread" (a gate that went dark, with its binding still in place) versus "no runner
      // names it" (a gate that was never wired in). Task 01 requires the report to tell those
      // apart, and review measured that this gate did not: with a spread commented out it
      // answered `audit-suite-unregistered … is registered by no runner`, while `scripts/test.mjs`
      // imports that suite on line 1520 and only the spread was missing. The census said it
      // correctly; the authority a developer actually hits said something false.
      //
      // Only `scripts/test.mjs` is read, and only for this: it is the runner whose assembled
      // array decided everything above, so it is the runner whose missing spread is the story.
      // The self-check below proves the concession is safe — the same tree decided WITH and
      // WITHOUT `importedBy` yields an identical registered set, and only the finding code moves.
      // 119/03 — the classification input is the whole registration SURFACE. `scripts/test.mjs`
      // names DIRECTORIES now and each index names its own suites, so the runner's text alone names
      // zero suite modules and every finding below would be relabelled. The decider is unchanged;
      // only the text handed to it is wider, and the floor is what made the narrowing loud.
      const runnerSource = await registrationSurface(repoRoot);
      assert.ok(runnerSource.length > 10000, `the registration surface was read for classification (${runnerSource.length} chars)`);
      const importedBy = runnerImportedSuites(runnerSource, "scripts/test.mjs");
      assert.ok(importedBy.size > ASSEMBLED_IMPORT_FLOOR, `and it names ${importedBy.size} suite modules, floor ${ASSEMBLED_IMPORT_FLOOR} — a classification input read from nothing would silently relabel every finding`);

      const decided = registrationDecision({ files, suiteNames, assembled, baseline: UNREGISTERED_BASELINE, importedBy });
      assert.deepEqual(
        decided.findings.map((finding) => `${finding.code}  ${finding.path}\n      ${finding.message}`),
        [],
        "a test suite whose exported tests are NOT members of the array `scripts/test.mjs` assembles is not a weak gate — it is no gate at all, and it is green, red or deleted with identical effect on CI (m43/ADR-014 E7 + 59/ADR-003 §2; TECH_DEBT items 17 and 50).\n"
          + "REGISTRATION IS MEMBERSHIP, NOT MENTION: an import with no spread satisfies a substring search over the runner's source and assembles nothing, which is how 26 suites carrying 117 test entries went dark in one commit and stayed dark for a month.\n"
          + "Spread the binding into the exported `tests` array — or, if the suite's subject is retired, move it under the owning milestone's reference/ directory. The baseline is SHRINK-ONLY and every entry names its reason and its origin.",
      );
      assert.deepEqual(
        decided.unregistered.map((entry) => entry.file).sort(),
        [...carried].sort(),
        "and the unregistered set is EXACTLY the shrink-only baseline — nothing absorbed, nothing quietly ticking",
      );
      assert.ok(decided.registered.length > WALKED_FLOOR, `${decided.registered.length} suites are registered by membership in what CI will execute`);
    },
  },
  {
    name: "arch/43 ADR-014/E7 + 59 FF-5903 (acd-test-suite-registration): self-check — no source-text registration lane survives in this file, the decider is blind to the runner's text, a suite the runner mentions but does not assemble is reported BY NAME, and a baseline entry with no subject or no reason is refused",
    run: async () => {
      // A SEPARATE LANE: lane 1 ends in a `deepEqual`, and evidence placed behind one stops
      // running the moment it fires — the vacuity trap this repository has filed twice.

      // (a) THE RETIRED LANE IS GONE FROM THIS FILE, not sitting beside its replacement. A
      // substring rule left in place would eventually be the one somebody reads.
      const self = stripComments(await readFile(fileURLToPath(import.meta.url), "utf8"));
      assert.ok(self.length > 2000, `this file was read and stripped to something real (${self.length} chars)`);
      assert.doesNotMatch(self, /runners\.includes\(/u, "the retired substring lane over the concatenated runner source is GONE from this file, not kept beside its replacement — a text rule left in place is eventually the one somebody reads");
      assert.doesNotMatch(self, /includes\(path\.basename/u, "and so is every other basename-in-the-runner-text form of it");
      assert.doesNotMatch(self, /readFile\([^)]*test-unit/u, "this gate never reads the FAST-LANE runner as text at all; it reads scripts/test.mjs for CLASSIFICATION only (lane 1), and clause (c2) below measures that the read cannot move a suite into or out of the registered set");

      // (b) THE DECIDER IS BLIND TO TEXT. `registrationDecision` takes no runner source at all,
      // so no future edit can reintroduce a text lane inside it by accident: there is nothing
      // to search.
      assert.equal(registrationDecision.length, 1, "the decider takes one options object");
      const decider = registrationDecision.toString();
      assert.doesNotMatch(decider, /runnerText|runnerSource|readFile/u, "and it holds no runner text, no source read, and therefore no substring to be blinded by a comment");

      // (c) NON-VACUITY, PLANTED. A suite the runner MENTIONS and does not assemble is exactly
      // the shape that survived for a month; the gate must name it.
      const planted = "test/arch/acd-planted-twelfth.test.mjs";
      const grown = registrationDecision({
        files: [planted],
        suiteNames: new Map([[planted, ["planted/one", "planted/two"]]]),
        assembled: new Set(["something/else"]),
        baseline: UNREGISTERED_BASELINE,
        importedBy: new Set([planted]),
      });
      assert.equal(grown.findings.length, 1, `the orphan set grows by exactly the planted file\n${grown.findings.map((finding) => finding.message).join("\n")}`);
      assert.ok(grown.findings[0].message.includes(planted), `IT IS NAMED: ${grown.findings[0].message}`);
      assert.ok(grown.findings[0].message.includes("planted/one"), "and a test of its that never reaches CI is named too, so the claim is checkable rather than assertive");
      assert.deepEqual(grown.registered, [], "and it is not registered");
      // The control: the same suite, assembled, is registered — so the lane above cannot pass
      // by rejecting everything.
      const armed = registrationDecision({
        files: [planted],
        suiteNames: new Map([[planted, ["planted/one", "planted/two"]]]),
        assembled: new Set(["planted/one", "planted/two"]),
        baseline: UNREGISTERED_BASELINE,
        importedBy: new Set([planted]),
      });
      assert.deepEqual(armed.registered, [planted], "a suite whose tests ARE assembled is registered — the detector distinguishes, it does not merely refuse");
      assert.deepEqual(armed.findings, [], "and raises nothing against it");

      // (c2) CLASSIFICATION CANNOT DECIDE. Lane 1 now hands the decider `importedBy`, read from
      // the runner's source text, so that a de-armed suite is reported as de-armed rather than as
      // never-registered (task 01). That is a text read inside the authority, and this file has
      // just spent eighty lines arguing against those — so the concession is bounded HERE, by
      // measurement rather than by intent: the same tree, decided with and without the text
      // input, yields an IDENTICAL registered set. Only the finding's code moves.
      const both = { files: [planted], suiteNames: new Map([[planted, ["planted/one"]]]), assembled: new Set(["something/else"]), baseline: UNREGISTERED_BASELINE };
      const withText = registrationDecision({ ...both, importedBy: new Set([planted]) });
      const withoutText = registrationDecision({ ...both, importedBy: new Set() });
      assert.deepEqual(withText.registered, withoutText.registered, "the text input cannot move a suite INTO the registered set");
      assert.deepEqual(withText.unregistered.map((row) => row.file), withoutText.unregistered.map((row) => row.file), "…nor out of the unregistered one");
      assert.equal(withText.findings[0].code, "audit-suite-imported-never-spread", "with the text: the miss is classified as a binding whose spread went missing");
      assert.equal(withoutText.findings[0].code, "audit-suite-unregistered", "without it: the same miss is classified as a suite no runner names");
      assert.notEqual(withText.findings[0].code, withoutText.findings[0].code, "so the text changes the LABEL and nothing else — a claim about registration is never resting on it");
      // …and the same suite, ASSEMBLED, is registered under both — so the concession cannot be
      // hiding a rule that only ever refuses.
      for (const importedBy of [new Set([planted]), new Set()]) {
        const green = registrationDecision({ ...both, assembled: new Set(["planted/one"]), importedBy });
        assert.deepEqual(green.registered, [planted], "membership decides, whatever the text says");
        assert.deepEqual(green.findings, [], "and raises nothing");
      }

      // (d) THE BASELINE'S OWN RATCHET. An entry naming a suite that is no longer on disk makes
      // the ledger guard a number that is not true (ADR-013/C5), and an entry with no reason is
      // a permission nobody had to justify.
      const files = await walkSuiteFiles(repoRoot, TEST_ROOT);
      assert.ok(files.length > WALKED_FLOOR, `the tree was walked before the baseline claim (${files.length} suites)`);
      assert.deepEqual(baselineProblems(UNREGISTERED_BASELINE, files), [], "every shrink-only baseline entry names a suite that exists, and carries both its reason and its origin");
      assert.ok(baselineProblems([{ suite: "test/gone.test.mjs", reason: "r", origin: "o" }], files).some((problem) => problem.code === "audit-baseline-stale"), "a ghost entry is a failure of its own");
      assert.ok(baselineProblems([{ suite: files[0], origin: "o" }], files).some((problem) => problem.code === "audit-baseline-unreasoned"), "and so is an entry carried without a reason");

      // (e) THE m43 ENTRY IS STILL CARRIED, BY NAME. It has been in this ledger since 43/04 and
      // it leaves it by being converted, never by being lost in a refactor of the ledger's home.
      assert.ok(
        UNREGISTERED_BASELINE.some((entry) => entry.suite === "test/work/lifecycle/work-observe.test.mjs"),
        "the m43/04 baseline entry `test/work/lifecycle/work-observe.test.mjs` is still carried — a shrink-only list that loses an entry silently is not shrink-only, it is untracked",
      );
      // …AND SO IS THE SECOND, BY NAME. The length check below cannot see a SWAP: replace one
      // entry with another and the count stays 2 and the ratchet passes. Both entries are
      // therefore pinned by the suite they name (raised at review).
      assert.ok(
        UNREGISTERED_BASELINE.some((entry) => entry.suite === "test/integration/cli-child-process.test.mjs"),
        "the 59/01 baseline entry `test/integration/cli-child-process.test.mjs` is still carried — the first suite the recursive walk reached in test/integration/, and one that cannot be imported to decide its own registration",
      );
      assert.equal(UNREGISTERED_BASELINE.length, 2, "and the ledger carries exactly two entries; a third is an ADR-level decision, not an edit");
    },
  },

  {
    name: "arch/47 F-47-04-ARCH-2 (acd-test-suite-registration): no fitness function grows a NEW positional slice over source text — a fixed character window, or a slice whose end is a second indexOf sentinel; the surviving instances are ledgered and may only shrink",
    run: async () => {
      const here = path.join(repoRoot, "test", "arch");
      const self = path.basename(fileURLToPath(import.meta.url));
      // SELF IS EXCLUDED, and the reason is stated rather than assumed: this file necessarily
      // carries both shapes, as regex text and as ledger prose. Its own cuts, if it ever needs
      // one, come from the one home like everyone else's.
      // 119/03 — recursive: the controls live in subject directories now, and a flat listing of
      // `test/arch/` returned none of them. The floor below is what made that a red.
      const files = (await suiteFilesBelow(here)).filter((rel) => rel.split("/").pop() !== self);
      assert.ok(files.length > 200, `test/arch/ was actually walked (non-vacuous): ${files.length} gates scanned`);

      const overBudget = [];
      const measured = new Map();
      for (const name of files) {
        const hits = positionalSlices(await readFile(path.join(here, name), "utf8"));
        if (hits.length === 0) continue;
        // Keyed by LEAF, like the ledger it is compared against.
        measured.set(name.split("/").pop(), hits.length);
        // 119/03 — the ledger is keyed by BASENAME and the walk yields subject-relative paths
        // now, so the lookup reads the leaf while the report keeps the full path. Keying the
        // ledger by path instead would have re-pointed 20-odd rows for nothing and made the
        // next move re-point them again.
        const allowed = POSITIONAL_SLICE_LEDGER.get(name.split("/").pop())?.max ?? 0;
        if (hits.length > allowed) {
          overBudget.push(
            `test/arch/${name} → ${hits.length} positional slice(s), ledgered for ${allowed}:\n`
              + hits.map((hit) => `      [${hit.shape}] ${hit.line.slice(0, 140)}`).join("\n"),
          );
        }
      }

      assert.deepEqual(
        overBudget,
        [],
        `these fitness functions cut source POSITIONALLY, beyond what the ledger allows:\n  ${overBudget.join("\n  ")}\n\n`
          + "A fixed character window measures the LENGTH of the region containing the thing the rule is about; an `indexOf` sentinel end assumes a DECLARATION ORDER nothing pins. Both have produced, in this repo, a confident red about a rule on a tree that honours it, and a silent green over a tree that does not — six instruments found wrong about the tree across milestones 45-47.\n"
          + "THE FIX IS THE ONE HOME — `test/support/source-slice.mjs`: `functionBody(code, header)` for a declaration, `matchedBraceBody(code, from)` for a block, `enclosingParenGroup(code, at)` for the call a callback belongs to, `blockOrStatementAfter(code, from)` for a loop body. Each returns null when the cut cannot be made, and the caller then reports NOT FOUND — loudly — instead of asserting over the wrong region.\n"
          + "If an instance is genuinely justified (a deliberate reconstruction of a retired instrument, say), add it to POSITIONAL_SLICE_LEDGER above WITH ITS REASON.",
      );

      // The ledger must not rot into a licence: an entry for a gate that no longer exists, or for
      // one that no longer holds the debt, hides the day the instance comes back.
      const leaves = new Set(files.map((rel) => rel.split("/").pop()));
      const stale = [...POSITIONAL_SLICE_LEDGER.keys()].filter((name) => !leaves.has(name));
      assert.deepEqual(stale, [], `these ledger entries name gates that no longer exist: ${stale.join(", ")} — a ledger entry is a permission, and a permission with no subject is how a converted gate quietly regains its window.`);
      const converted = [...POSITIONAL_SLICE_LEDGER.entries()]
        .filter(([name, entry]) => (measured.get(name) ?? 0) < entry.max)
        .map(([name, entry]) => `${name} (ledgered ${entry.max}, now ${measured.get(name) ?? 0})`);
      assert.deepEqual(
        converted,
        [],
        `GOOD NEWS, and it needs one edit: these gates now hold FEWER positional slices than the ledger allows — ${converted.join(", ")}. Lower (or delete) their entries in POSITIONAL_SLICE_LEDGER above so the ratchet keeps the ground it just gained. This is the only failure in this file that means something improved.`,
      );
    },
  },

  {
    name: "arch/47 F-47-04-ARCH-2 (acd-test-suite-registration): self-check — the positional-slice detector flags both planted shapes and stays silent on the one home's own structural cuts, on the converted gates' idioms, and on prose describing the species (non-vacuous)",
    run: async () => {
      // A SEPARATE LANE: the ratchet above is a `deepEqual`, and evidence placed behind it would
      // stop running the moment it fires — the vacuity trap this milestone filed twice.
      assert.equal(positionalSlices("const refusal = body.slice(found.index, found.index + 400);").length, 1, "self-check: a `+ 400` fixed window is flagged");
      assert.equal(positionalSlices("const region = launcherCode.slice(m.index, m.index + 300);").length, 1, "self-check: a `+ 300` fixed window is flagged");
      assert.equal(positionalSlices('const body = source.slice(start, source.indexOf("\\nexport ", start));').length, 1, "self-check: an indexOf-sentinel end is flagged");
      assert.equal(positionalSlices('const gate = raw.slice(raw.indexOf("a"), raw.indexOf("b"));').length, 1, "self-check: an indexOf/indexOf sentinel pair is flagged");

      // THE CASES THAT MUST STAY SILENT — the cure itself, and the idioms the converted cuts now
      // use. A ratchet that flagged these would push authors back to windows.
      for (const clean of [
        "return code.slice(open + 1, i);",
        "const body = functionBody(code, header);",
        "const refusal = matchedBraceBody(body, found.index);",
        "const group = enclosingParenGroup(code, inside);",
        "const region = blockOrStatementAfter(code, header.close + 1);",
        "const before = source.slice(0, match.index).split(/\\r?\\n/);",
        "const head = list.slice(0, 5);",
      ]) {
        assert.deepEqual(positionalSlices(clean), [], `self-check: the detector stays silent on \`${clean}\``);
      }

      // …and prose describing the species is history, not an instance — otherwise every gate that
      // documents its own conversion would be flagged for documenting it.
      assert.deepEqual(
        positionalSlices("// This was `code.slice(match.index, match.index + 400)`, a fixed window over source.\n"),
        [],
        "self-check: a COMMENT naming the retired shape is not an instance of it (the shared stripper, line comments first)",
      );

      // The one home is itself clean, which is what makes it the cure rather than a fourth copy.
      const home = await readFile(path.join(repoRoot, "test", "support", "source-slice.mjs"), "utf8");
      assert.deepEqual(positionalSlices(home), [], "self-check: test/support/source-slice.mjs holds no positional slice of its own");
    },
  },
];
