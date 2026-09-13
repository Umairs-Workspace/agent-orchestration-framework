// FF-6107 — COUNTING OFF THE EFFECTS JOURNAL IS FILTERED AND COLLAPSED IN ONE HOME, AND THE
// READ RECORD IS IMPORTED RATHER THAN RESTATED.
//
// Milestone 61 / story 02. ADR-006 §5, §6.
//
// The store this acceptor counts over has no boundary between production and test: Spike 60
// measured 3,848 of 3,926 `run.started` events as test fixtures, `assignment.settled` at 245
// synthetic of 328, and dispatch worktrees registering as workspaces of their own — 15% of the
// measured verdict stream, and the reason the spike's own first pass reported 48 where the
// answer was 53. A count that filters neither is a different number wearing a truth's clothes.
//
// So this gate binds SIX things, and each of them is a way that number could quietly stop
// being what it claims:
//
//   (a) the classification has ONE home — no module outside `src/work-acceptor/observations.mjs`
//       decides that an `itemDir` is a fixture or that a path is a dispatch worktree;
//   (b) the dispatch case is DERIVED from `src/mesh/worktree.mjs`'s exported predicate and
//       slug, and `dispatch-worktrees` remains that module's only occurrence in `src/`;
//   (c) the read record and the floor discipline are IMPORTED from `src/work-audit/reads.mjs`
//       (`readRecord`, `sweepDeclarationProblems`, `SWEEP_BASES`), with no second copy here, so
//       the shape has one home and cannot drift (59/FF-5908's ratchet, paid rather than re-opened);
//   (d) `readFinding` is deliberately NOT imported — its code is the auditor's — and the
//       acceptor's finding differs from the audit's IN THE CODE STRING ALONE, asserted
//       key-by-key rather than by inspection;
//   (e) every population is emitted with a declared read record and a floor, DRIVEN FROM THE
//       LANE REGISTRY, so a lane added without a floor fails CI instead of reporting a count
//       with nothing to compare it against;
//   (f) a count below its floor emits `acceptor-ran-on-nothing` naming the sweep, the root
//       walked and the floor missed — and a census that filtered nothing at all is a finding
//       rather than a count.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { srcFilesContaining } from "../../support/read-src-files.mjs";
import * as reads from "../../../src/work-audit/reads.mjs";
import {
  dispatchWorktreeSlug,
  meshDispatchWorktreePath,
} from "../../../src/mesh/worktree.mjs";
import * as observations from "../../../src/work-acceptor/observations.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CENSUS_MODULE = "work-acceptor/observations.mjs";
const CENSUS_PATH = path.join(repoRoot, "src", "work-acceptor", "observations.mjs");
const WORKSPACE = path.resolve("/aof-ff6107-workspace");

// EVERY SCAN BELOW MEASURES CODE, NOT PROSE, and that is a decision rather than a
// convenience. `src/mesh/worker-execution.mjs` carries two comments reading "NEVER
// os.tmpdir()" — a rule ABOUT the call, not the call — and this census's own header explains
// at length why `dispatch-worktrees` is not spelled here and why `readFinding` is not
// imported. A text scan that could not tell those apart would report violations that do not
// exist AND would punish the module for explaining itself, which is the opposite of what this
// gate is for. The filter's limit is declared rather than hidden: it removes whole-line
// comments only, so a classification smuggled onto the tail of a code line is still seen.
const codeLines = (source) =>
  source.split(/\r?\n/u).filter((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
  }).join("\n");

const censusSource = async () => codeLines(await readFile(CENSUS_PATH, "utf8"));

// `srcFilesContaining` reads every src file once, shared with the other guards that need the
// same walk; this narrows its hits to the ones whose CODE carries the needle.
async function codeFilesContaining(needle, options = {}) {
  const hits = await srcFilesContaining(repoRoot, needle, options);
  const out = [];
  for (const file of hits) {
    if (codeLines(await readFile(path.join(repoRoot, "src", file), "utf8")).includes(needle)) out.push(file);
  }
  return out;
}

const event = (workspaceRoot, itemDir = workspaceRoot) => ({ payload: { workspaceRoot, itemDir } });

export const archTests = [
  {
    name: "arch/61 FF-6107: the fixture and dispatch classification has exactly one home in src/",
    run: async () => {
      // (b) THE DISPATCH LITERAL. `mesh-worktree.mjs` is the only module in `src/` that spells
      // the convention, and this milestone does not make it two.
      const spellsIt = await codeFilesContaining("dispatch-worktrees");
      assert.deepEqual(spellsIt, ["mesh/worktree.mjs"], "`dispatch-worktrees` is spelled in exactly one module under src/");

      // (a) THE FIXTURE DECISION. A module that derives the machine's temp roots AND reads an
      // event payload's `itemDir` is classifying an observation as a fixture. Exactly one does.
      const tempDerivers = await srcFilesContaining(repoRoot, "tmpdir(");
      const itemDirReaders = new Set(await srcFilesContaining(repoRoot, "itemDir"));
      const classifiers = [];
      for (const file of tempDerivers) {
        if (!itemDirReaders.has(file)) continue;
        const source = codeLines(await readFile(path.join(repoRoot, "src", file), "utf8"));
        if (source.includes("tmpdir(") && source.includes("itemDir")) classifiers.push(file);
      }
      assert.deepEqual(classifiers, [CENSUS_MODULE], "exactly one module under src/ decides that an observation's itemDir is a fixture");

      // …and the census's own vocabulary is not restated anywhere else either: a second module
      // emitting these codes would be a second census by another name.
      for (const code of observations.OBSERVATION_FINDING_CODES) {
        assert.deepEqual(await codeFilesContaining(code), [CENSUS_MODULE], `\`${code}\` is emitted from one module only`);
      }
    },
  },
  {
    name: "arch/61 FF-6107: the census derives the dispatch case from mesh-worktree.mjs rather than spelling it",
    run: async () => {
      const source = await censusSource();
      // TEXTUAL: it does not spell the literal, and it takes BOTH the predicate and the slug
      // from the module that owns the convention.
      assert.equal(source.includes("dispatch-worktrees"), false, "the census spells no dispatch-worktrees literal of its own");
      assert.match(source, /import \{[^}]*isUnderMeshDispatchWorktreesRoot[^}]*\} from "\.\.\/mesh\/worktree\.mjs"/su, "it imports the lane's own predicate");
      assert.match(source, /import \{[^}]*dispatchWorktreeSlug[^}]*\} from "\.\.\/mesh\/worktree\.mjs"/su, "…and the lane's own slug");

      // BEHAVIOURAL, because a textual import proves only that the name is present: a path
      // composed by the framework's OWN dispatch seam folds into its parent, and the fold names
      // the worktree by the slug that seam mints.
      const worktree = meshDispatchWorktreePath(WORKSPACE, "61/02");
      const fold = observations.foldDispatchWorktree(path.join(worktree, "wiki", "work"));
      assert.equal(fold.workspace, WORKSPACE, "a worktree the framework creates folds into the workspace it was dispatched from");
      assert.deepEqual(fold.worktrees.map((entry) => entry.slug), [dispatchWorktreeSlug("61/02")], "the fold names the worktree by the lane's own slug");
      assert.equal(fold.worktrees[0].minted, true, "…and recognises it as one the dispatch lane minted");

      // A worktree nested inside a worktree folds ALL the way home rather than half-way — the
      // fold is a rule, not a single-step string operation.
      const nested = meshDispatchWorktreePath(worktree, "61/03");
      assert.equal(observations.foldDispatchWorktree(nested).workspace, WORKSPACE, "a nested dispatch worktree folds all the way to the workspace");

      // THE SECOND FRAGMENTATION, AND IT IS ANSWERED IN THE SAME PLACE. Measured on the live
      // journal 2026-08-30: `C:\Source\umami\aof` and `c:\Source\umami\aof` were counted as two
      // workspaces, splitting 51 run-starts into 49 and 2. Windows compares paths
      // case-insensitively; POSIX does not, and there the case IS the identity, so this gate
      // asserts the platform's own answer rather than one convenient rule for both.
      const spelt = observations.countPopulation(
        observations.OBSERVATION_SWEEPS[0],
        [event(WORKSPACE), event(WORKSPACE.toUpperCase())],
        { workspaceRoot: WORKSPACE, root: "/journal", roots: [] },
      );
      if (process.platform === "win32") {
        assert.equal(spelt.count, 2, "on Windows two spellings of one root are one workspace");
        assert.equal(Object.keys(spelt.byWorkspace).length, 1, "…counted once, under the spelling the store used first");
        assert.equal(Object.keys(spelt.byWorkspace)[0], WORKSPACE, "…and the report never invents a path nobody wrote");
      } else {
        assert.equal(spelt.count, 1, "on POSIX two spellings are two directories, and the census does not merge them");
        assert.equal(Object.keys(spelt.byWorkspace).length, 2, "…they are two workspaces because the filesystem says so");
      }
    },
  },
  {
    name: "arch/61 FF-6107: the read record and the floor discipline are imported from work-audit/reads.mjs, with no second copy",
    run: async () => {
      const source = await censusSource();
      assert.match(
        source,
        /import \{ SWEEP_BASES, readRecord, sweepDeclarationProblems \} from "\.\.\/work-audit\/reads\.mjs"/u,
        "the three shape-owning exports are imported from their one home",
      );
      // NO SECOND COPY. A local definition of any of the three would re-open exactly the
      // divergence 59/ADR-004 §1a closed (three spellings, and the third did not obey the rule).
      for (const symbol of ["readRecord", "sweepDeclarationProblems", "SWEEP_BASES"]) {
        assert.equal(
          new RegExp(`(function|const|let|class)\\s+${symbol}\\b`, "u").test(source),
          false,
          `the census declares no second copy of \`${symbol}\``,
        );
      }
      // AND THE ACCEPTOR DOES NOT SPELL THE AUDIT'S CODE. Which modules emit
      // `audit-ran-on-nothing` is 59/FF-5908's business and is not re-litigated here; what this
      // gate owns is that the acceptor is not one of them.
      assert.equal(
        (await codeFilesContaining("audit-ran-on-nothing")).includes(CENSUS_MODULE),
        false,
        "the acceptor emits no copy of the audit's own finding code",
      );

      // The record the census emits IS the imported constructor's output, byte for byte.
      const sweep = observations.OBSERVATION_SWEEPS[0];
      const population = observations.countPopulation(sweep, [event(WORKSPACE)], { workspaceRoot: WORKSPACE, root: "/j", roots: [] });
      assert.deepEqual(population.read, reads.readRecord(sweep, 1, "/j"), "the emitted read record is the audit's constructor's own output");
      assert.deepEqual(
        Object.keys(population.read),
        ["sweep", "root", "what", "basis", "count", "floor"],
        "…keyed `sweep`, in the one shape, with no extra key and no missing one",
      );
      assert.ok(reads.SWEEP_BASES.includes(population.read.basis), "…declaring one of the shared bases");
    },
  },
  {
    name: "arch/61 FF-6107: readFinding is not imported, and the acceptor's finding differs from the audit's in the code string alone",
    run: async () => {
      const source = await censusSource();
      assert.equal(/\breadFinding\b/u.test(source), false, "`readFinding` is not imported — its code is the auditor's");

      const read = reads.readRecord(observations.OBSERVATION_SWEEPS[0], 0, "/walked");
      const mine = observations.observationFinding(read);
      const theirs = reads.readFinding(read);
      assert.deepEqual(Object.keys(mine), Object.keys(theirs), "the two findings carry the same keys, in the same order");
      for (const key of Object.keys(theirs)) {
        if (key === "code") continue;
        assert.deepEqual(mine[key], theirs[key], `\`${key}\` is identical between the acceptor's finding and the audit's`);
      }
      assert.equal(mine.code, "acceptor-ran-on-nothing", "the acceptor's code is its own");
      assert.equal(theirs.code, "audit-ran-on-nothing", "…and the auditor's is unchanged");
      assert.notEqual(mine.code, theirs.code, "the code string is the ONLY difference between them");

      // Above its floor there is no finding at all, on either side — the difference is the code
      // and never the trigger.
      const healthy = reads.readRecord(observations.OBSERVATION_SWEEPS[0], observations.OBSERVATION_SWEEPS[0].floor, "/walked");
      assert.equal(observations.observationFinding(healthy), null, "no finding above the floor");
      assert.equal(reads.readFinding(healthy), null, "…on either side of the boundary");
    },
  },
  {
    name: "arch/61 FF-6107: every population is emitted with a declared read record and a floor, driven from the lane registry",
    run: async () => {
      // The registry itself is declared, by the AUDIT's validator — one definition of
      // "declared", not two.
      assert.deepEqual(reads.sweepDeclarationProblems(observations.OBSERVATION_SWEEPS), [], "every registered population declares id, root, what, basis and floor");
      assert.ok(observations.OBSERVATION_SWEEPS.length > 0, "the registry is not empty — a census with no populations reports clean over nothing");

      // BIJECTION: the report's populations are exactly the registry's, so a lane cannot be
      // added to the registry and quietly skipped, nor reported without being registered.
      const report = observations.observationCensus({
        eventsFor: () => [event(WORKSPACE)],
        workspaceRoot: WORKSPACE,
        root: "/journal",
        roots: [],
      });
      assert.deepEqual(
        report.populations.map((population) => population.sweep),
        observations.OBSERVATION_SWEEPS.map((sweep) => sweep.id),
        "every declared population is reported, and only those",
      );
      for (const population of report.populations) {
        assert.equal(typeof population.read.floor, "number", `${population.sweep}: reports a floor`);
        assert.ok(population.read.floor > 0, `${population.sweep}: …a floor that can be missed`);
        assert.equal(population.read.root, "/journal", `${population.sweep}: names the root it actually walked, not its placeholder`);
        assert.equal(typeof population.excluded.fixtures, "number", `${population.sweep}: says how many events it excluded as fixtures`);
        assert.equal(typeof population.folded.worktrees, "number", `${population.sweep}: says how many worktrees it folded`);
      }

      // EVERY DECLARED DISPOSITION IS REACHABLE, so the vocabulary is what the census actually
      // does rather than a wish list — and every event lands in exactly one of them, which is
      // what makes the unfiltered total the sum of the count and what was excluded.
      const fixtureRoot = path.resolve("/aof-ff6107-fixtures");
      const reached = new Set([
        event(WORKSPACE),
        event(meshDispatchWorktreePath(WORKSPACE, "61/02")),
        event(path.resolve("/somewhere-else")),
        event(path.join(fixtureRoot, "aof-cli-9")),
        { payload: { workspaceRoot: null, itemDir: null } },
      ].map((entry) => observations.classifyObservation(entry, { workspaceRoot: WORKSPACE, roots: [fixtureRoot] }).disposition));
      assert.deepEqual([...reached].sort(), [...observations.OBSERVATION_DISPOSITIONS].sort(), "every declared disposition is reachable, and no undeclared one is produced");

      // A POPULATION THAT HIT ITS OWN CEILING says so, rather than presenting a ceiling as a
      // total — the same species as a count that does not say what it filtered.
      const capped = observations.countPopulation(observations.OBSERVATION_SWEEPS[0], [event(WORKSPACE), event(WORKSPACE)], { workspaceRoot: WORKSPACE, root: "/journal", roots: [], limit: 2 });
      assert.equal(capped.truncated, true, "a population that hit its sweep ceiling declares itself truncated");
      assert.equal(report.populations[0].truncated, false, "…and one well under it does not");

      // A LANE ADDED WITHOUT A FLOOR FAILS rather than reporting a count with nothing to compare
      // it to — and it fails NAMING itself.
      const undeclared = { id: "observations:undeclared", event: "run.started", root: "/journal", what: "a lane someone added", basis: "runtime" };
      assert.throws(
        () => observations.observationCensus({
          eventsFor: () => [],
          workspaceRoot: WORKSPACE,
          root: "/journal",
          sweeps: [...observations.OBSERVATION_SWEEPS, undeclared],
          roots: [],
        }),
        /observations:undeclared[\s\S]*floor/u,
        "a lane registered without a floor is refused, naming the lane",
      );
      // The same refusal guards the single-population door, so there is no route around it.
      assert.throws(() => observations.countPopulation(undeclared, [], { workspaceRoot: WORKSPACE }), /observations:undeclared/u);
    },
  },
  {
    name: "arch/61 FF-6107: below its floor the census reports a finding, and a census that filtered nothing is not a count",
    run: async () => {
      const sweep = observations.OBSERVATION_SWEEPS[0];
      const fixtureRoot = path.resolve("/aof-ff6107-fixtures");

      // BELOW FLOOR — naming the sweep, the root walked and the floor missed.
      const thin = observations.countPopulation(
        sweep,
        [event(WORKSPACE), event(path.join(fixtureRoot, "aof-cli-1"))],
        { workspaceRoot: WORKSPACE, root: "/journal", roots: [fixtureRoot] },
      );
      const ranOnNothing = thin.findings.find((finding) => finding.code === "acceptor-ran-on-nothing");
      assert.ok(ranOnNothing, "a count below its floor is a finding, not a silent zero");
      assert.ok(ranOnNothing.message.includes(sweep.id), "the finding names the sweep");
      assert.ok(ranOnNothing.message.includes("/journal"), "…the root it walked");
      assert.ok(ranOnNothing.message.includes(String(sweep.floor)), "…and the floor it missed");
      assert.equal(thin.count, 1, "the count it leads with is the FILTERED one");
      assert.equal(thin.excluded.unfilteredTotal, 2, "…and the unfiltered total sits inside what was excluded");

      // A CENSUS THAT FILTERED NOTHING is a finding, and its number is not offered as a count.
      const unfiltered = observations.observationCensus({
        eventsFor: (entry) => (entry.id === sweep.id ? Array.from({ length: sweep.floor + 1 }, () => event(WORKSPACE)) : []),
        workspaceRoot: WORKSPACE,
        root: "/journal",
        roots: [],
      });
      const population = unfiltered.populations.find((entry) => entry.sweep === sweep.id);
      assert.equal(population.filtered, false, "nothing was excluded and nothing was folded");
      assert.ok(population.count > population.read.floor, "…and this is not the below-floor case in disguise");
      assert.ok(
        unfiltered.findings.some((finding) => finding.code === "acceptor-census-unfiltered" && finding.sweep === sweep.id),
        "a census that filtered nothing carries a finding naming that population",
      );
      assert.equal(Object.hasOwn(unfiltered.counts, sweep.id), false, "…and its number is not presented as a filtered count");

      // THE HEALTHY, FILTERED CASE STILL STATES WHAT IT FILTERED — the two statements are not
      // alternatives, which is what stops "clean" from meaning "silent".
      const healthy = observations.countPopulation(
        sweep,
        [
          ...Array.from({ length: sweep.floor }, () => event(WORKSPACE)),
          event(path.join(fixtureRoot, "aof-cli-2")),
          event(meshDispatchWorktreePath(WORKSPACE, "61/02")),
        ],
        { workspaceRoot: WORKSPACE, root: "/journal", roots: [fixtureRoot] },
      );
      assert.deepEqual(healthy.findings, [], "a healthy filtered population carries no finding");
      assert.equal(healthy.excluded.fixtures, 1, "…and still states what it excluded");
      assert.equal(healthy.folded.worktrees, 1, "…and still states what it folded");
      assert.equal(healthy.count, sweep.floor + 1, "…with the folded observation counted under the parent workspace");
    },
  },
];
