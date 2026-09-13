// Traceability wiring for milestone 61 / story 02 — the observation census.
//
// Covers EVERY @executable scenario and EVERY Examples row in the one task feature:
//   tasks/00_the-census-says-what-it-filtered.feature
//
// It exercises the REAL `src/work-acceptor/observations.mjs` against the REAL
// `src/effects/journal.mjs` (a genuine SQLite journal in a temp fixture, written through
// `appendEvent` — never a hand-rolled row), and composes every dispatch-worktree path
// through the REAL `src/mesh/worktree.mjs` seam rather than spelling the convention here.
//
// One test object per scenario, one per Examples ROW, each name tracing to feature +
// scenario. `{ name, run }` so it spreads into the runner's tests array like every other
// suite. node:assert/strict.
//
// THE FIXTURE ROOTS ARE INJECTED, and that is deliberate rather than incidental: this
// suite's own temp directory is under the machine's temp root, so a census that derived
// its fixture roots from the ambient environment would classify this suite's PRODUCTION
// paths as fixtures and pass for the wrong reason. The production paths below therefore
// live under a synthetic root that is not the injected fixture root.
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { appendEvent, openEffectsJournal } from "../../src/effects/journal.mjs";
import { dispatchWorktreeSlug, meshDispatchWorktreePath } from "../../src/mesh/worktree.mjs";
import {
  OBSERVATION_FINDING_CODES,
  OBSERVATION_SWEEPS,
  classifyObservation,
  countPopulation,
  observationCensus,
  readObservationCensus,
} from "../../src/work-acceptor/observations.mjs";

// The workspace this census is for, and a second one that is not it. Synthetic absolute
// paths (never the machine's temp root — see the header), resolved so Windows and POSIX
// compare the same way the module does.
const WORKSPACE = path.resolve("/aof-census-workspace");
const OTHER_WORKSPACE = path.resolve("/aof-census-other-workspace");
const ITEM_REF = "61/02";
// The dispatch worktree is composed by the FRAMEWORK'S OWN dispatch path seam, so this
// suite cannot pass by agreeing with a hand-spelled convention that production does not use.
const DISPATCH_WORKTREE = meshDispatchWorktreePath(WORKSPACE, ITEM_REF);

// The one sweep the drives below use. It is the REAL registry's entry — floors and all —
// so nothing here is measured against a floor invented for the test.
const RUN_SWEEP = OBSERVATION_SWEEPS[0];
const JOURNAL_ROOT = path.resolve("/aof-census-workspace/journal.sqlite");

async function withFixtureRoot(body) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-census-fixture-"));
  try {
    return await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// One observation, as the effects journal stores it: the two payload fields that say where
// it was written (`src/effects/run-transitions.mjs` writes both on every run event).
const observation = (workspaceRoot, itemDir = workspaceRoot == null ? null : path.join(workspaceRoot, "wiki", "work", "61")) => ({
  name: RUN_SWEEP.event,
  payload: { workspaceRoot, itemDir },
});

const production = (n, root = WORKSPACE) => Array.from({ length: n }, () => observation(root));
const fixtures = (n, fixtureRoot) => Array.from({ length: n }, (_, index) =>
  observation(path.join(fixtureRoot, `aof-cli-${index}`), path.join(fixtureRoot, `aof-cli-${index}`, "wiki", "work", "61")));

const census = (events, fixtureRoot, options = {}) =>
  countPopulation(RUN_SWEEP, events, { workspaceRoot: WORKSPACE, root: JOURNAL_ROOT, roots: [fixtureRoot], ...options });

export const acceptorObservationsTests = [
  // ── Scenario Outline: where an observation was written decides how it is counted ──────
  // One entry per Examples row: the two traps the store sets, and the two answers.
  {
    name: "61/02 task 00 — outline row: an observation written under a temporary fixture directory is not counted",
    async run() {
      await withFixtureRoot(async (fixtureRoot) => {
        const events = [...fixtures(3, fixtureRoot), ...production(2)];
        const seen = classifyObservation(events[0], { workspaceRoot: WORKSPACE, roots: [fixtureRoot] });
        assert.equal(seen.disposition, "fixture", "an observation written under a temp fixture directory is classified as a fixture");
        assert.equal(seen.workspace, null, "a fixture is attributed to no workspace at all");

        const population = census(events, fixtureRoot);
        assert.equal(population.count, 2, "the count excludes every fixture observation");
        assert.equal(population.excluded.fixtures, 3, "and says how many it excluded as fixtures");
        assert.equal(Object.keys(population.byWorkspace).length, 1, "a fixture directory never becomes a workspace of the census");
      });
    },
  },
  {
    name: "61/02 task 00 — outline row: an observation written under a dispatch worktree of this workspace is counted once, under the parent workspace",
    async run() {
      await withFixtureRoot(async (fixtureRoot) => {
        const event = observation(DISPATCH_WORKTREE);
        const seen = classifyObservation(event, { workspaceRoot: WORKSPACE, roots: [fixtureRoot] });
        assert.equal(seen.disposition, "counted", "work done in a dispatch worktree of this workspace is this workspace's work");
        assert.equal(seen.workspace, WORKSPACE, "…attributed to the PARENT workspace, not to the worktree");
        assert.equal(seen.folded, true, "…and the record says it was folded");

        const population = census([event], fixtureRoot);
        assert.equal(population.count, 1, "counted ONCE — folding is not doubling");
        assert.deepEqual(population.byWorkspace, { [WORKSPACE]: 1 }, "the worktree contributes to the parent's tally alone");
        assert.equal(population.folded.worktrees, 1, "one worktree folded");
        assert.equal(population.folded.events, 1, "one observation folded");
      });
    },
  },
  {
    name: "61/02 task 00 — outline row: an observation written under this workspace's own root is counted",
    async run() {
      await withFixtureRoot(async (fixtureRoot) => {
        const event = observation(WORKSPACE);
        const seen = classifyObservation(event, { workspaceRoot: WORKSPACE, roots: [fixtureRoot] });
        assert.equal(seen.disposition, "counted", "an observation under this workspace's own root is counted");
        assert.equal(seen.workspace, WORKSPACE, "…for this workspace");
        assert.equal(seen.folded, false, "…with nothing folded");

        const population = census([event], fixtureRoot);
        assert.equal(population.count, 1, "the population counts it");
      });
    },
  },
  {
    name: "61/02 task 00 — outline row: an observation written under a different workspace's root is counted for that workspace, not this one",
    async run() {
      await withFixtureRoot(async (fixtureRoot) => {
        const event = observation(OTHER_WORKSPACE);
        const seen = classifyObservation(event, { workspaceRoot: WORKSPACE, roots: [fixtureRoot] });
        assert.equal(seen.disposition, "other-workspace", "another workspace's observation is not this workspace's");
        assert.equal(seen.workspace, OTHER_WORKSPACE, "…but it IS counted, for the workspace that wrote it");

        const population = census([event, observation(WORKSPACE)], fixtureRoot);
        assert.equal(population.count, 1, "this workspace's count holds only its own");
        assert.equal(population.byWorkspace[OTHER_WORKSPACE], 1, "…while the other workspace's tally still carries it");
        assert.equal(population.excluded.otherWorkspace, 1, "…and the report says one was excluded as another workspace's");
      });
    },
  },

  // ── Scenario: the number reported is the filtered one ─────────────────────────────────
  {
    name: "61/02 task 00 — the number reported is the filtered one, over a REAL effects journal",
    async run() {
      await withFixtureRoot(async (fixtureRoot) => {
        // A population in the store's own measured proportions: the great majority of the
        // events were written by test fixtures (SPIKE §Lane A — 3,848 of 3,926).
        const journal = await openEffectsJournal({ databasePath: path.join(fixtureRoot, "journal.sqlite") });
        try {
          const events = [...fixtures(43, fixtureRoot), ...production(3)];
          for (const [index, event] of events.entries()) {
            appendEvent(journal, { ...event, now: new Date(Date.UTC(2026, 7, 30, 0, 0, index)).toISOString() });
          }
          const report = readObservationCensus(journal, { workspaceRoot: WORKSPACE, roots: [fixtureRoot] });
          const population = report.populations.find((entry) => entry.sweep === RUN_SWEEP.id);

          assert.equal(population.excluded.unfilteredTotal, 46, "the journal really did hold 46 run-start events");
          assert.equal(population.count, 3, "the count it leads with excludes every fixture event");
          assert.equal(population.read.count, 3, "…and the read record carries that same filtered number");
          assert.equal(population.excluded.fixtures, 43, "…with the 43 fixtures named as what was excluded");

          // THE UNFILTERED TOTAL APPEARS ONLY AS PART OF WHAT WAS EXCLUDED. Nothing else on
          // the record — and nothing in the report's headline counts — carries 46.
          const outside = Object.entries(population).filter(([key]) => key !== "excluded");
          for (const [key, value] of outside) {
            assert.notEqual(value, 46, `the unfiltered total is not presented as \`${key}\``);
            if (value != null && typeof value === "object") {
              for (const [inner, innerValue] of Object.entries(value)) {
                assert.notEqual(innerValue, 46, `the unfiltered total is not presented as \`${key}.${inner}\``);
              }
            }
          }
          assert.equal(report.counts[RUN_SWEEP.id], 3, "the report's headline count is the filtered one");
        } finally {
          journal.close();
        }
      });
    },
  },

  // ── Scenario: a dispatch worktree does not become a second workspace ──────────────────
  {
    name: "61/02 task 00 — a dispatch worktree does not become a second workspace",
    async run() {
      await withFixtureRoot(async (fixtureRoot) => {
        const events = [...production(4), ...production(5, DISPATCH_WORKTREE), ...production(2, OTHER_WORKSPACE)];
        const population = census(events, fixtureRoot);

        const workspaces = Object.keys(population.byWorkspace);
        assert.deepEqual(workspaces.sort(), [WORKSPACE, OTHER_WORKSPACE].sort(), "two workspaces in the population, not three");
        assert.equal(workspaces.includes(DISPATCH_WORKTREE), false, "the worktree is not counted as a workspace of its own");
        assert.equal(population.byWorkspace[WORKSPACE], 9, "its observations are counted under the workspace it was dispatched from");
        assert.equal(population.count, 9, "…and that is the number the census leads with");
      });
    },
  },

  // ── Scenario: the folding follows the worktrees the framework actually creates ────────
  {
    name: "61/02 task 00 — the folding follows the worktrees the framework actually creates",
    async run() {
      await withFixtureRoot(async (fixtureRoot) => {
        // Composed through the framework's OWN dispatch path seam, for a real item ref.
        const worktree = meshDispatchWorktreePath(WORKSPACE, ITEM_REF);
        const deeper = path.join(worktree, "wiki", "work", "61", "stories");
        for (const written of [worktree, deeper]) {
          const seen = classifyObservation(observation(written), { workspaceRoot: WORKSPACE, roots: [fixtureRoot] });
          assert.equal(seen.workspace, WORKSPACE, `${written} folds into the parent workspace`);
          assert.equal(seen.folded, true, `${written} is recorded as folded`);
          // The worktree the fold names is the one the framework MINTS for this ref — the
          // slug comes from `mesh-worktree.mjs`, so nothing here is spelled by hand.
          assert.deepEqual(seen.worktrees.map((entry) => entry.slug), [dispatchWorktreeSlug(ITEM_REF)], "the folded worktree is named by the lane's own slug");
          assert.equal(seen.worktrees[0].minted, true, "…and is recognised as one the dispatch lane minted");
        }

        // A path that is NOT under a dispatch root is not folded, so the fold is a property
        // of the framework's convention rather than of any path with a similar shape.
        const lookalike = path.join(WORKSPACE, "dispatch-61-02");
        const plain = classifyObservation(observation(lookalike), { workspaceRoot: WORKSPACE, roots: [fixtureRoot] });
        assert.equal(plain.folded, false, "a directory that merely looks like a worktree is not folded");
        assert.equal(plain.disposition, "other-workspace", "…it is simply a different root");

        // A ref this census has never seen folds the same way, because the fold asks the lane
        // rather than matching a shape it was taught.
        const unseen = meshDispatchWorktreePath(WORKSPACE, "999/47");
        const stranger = classifyObservation(observation(unseen), { workspaceRoot: WORKSPACE, roots: [fixtureRoot] });
        assert.equal(stranger.workspace, WORKSPACE, "a worktree for a ref never seen before folds identically");

        // AND THE FOLDING DID NOT DEPEND ON THE PATH BEING SPELLED OUT BY HAND: the census
        // carries no copy of the convention, only the module that owns it. (FF-6107 asserts the
        // same fact across the whole of src/; this is the scenario's own leg.)
        const source = await readFile(new URL("../../src/work-acceptor/observations.mjs", import.meta.url), "utf8");
        const code = source.split(/\r?\n/u).filter((line) => !line.trim().startsWith("//")).join("\n");
        assert.equal(code.includes("dispatch-worktrees"), false, "the census spells the worktree directory nowhere in its code");
        assert.match(code, /from "\.\.\/mesh\/worktree\.mjs"/u, "…it reads the module that owns the convention instead");
      });
    },
  },

  // ── Scenario: every population says what it read ──────────────────────────────────────
  {
    name: "61/02 task 00 — every population says what it read",
    async run() {
      await withFixtureRoot(async (fixtureRoot) => {
        const journal = await openEffectsJournal({ databasePath: path.join(fixtureRoot, "journal.sqlite") });
        try {
          for (const [index, sweep] of OBSERVATION_SWEEPS.entries()) {
            appendEvent(journal, {
              name: sweep.event,
              payload: { workspaceRoot: DISPATCH_WORKTREE, itemDir: path.join(DISPATCH_WORKTREE, "wiki") },
              now: new Date(Date.UTC(2026, 7, 30, 0, index)).toISOString(),
            });
            appendEvent(journal, {
              name: sweep.event,
              payload: { workspaceRoot: path.join(fixtureRoot, "fx"), itemDir: path.join(fixtureRoot, "fx", "wiki") },
              now: new Date(Date.UTC(2026, 7, 30, 1, index)).toISOString(),
            });
          }
          const report = readObservationCensus(journal, { workspaceRoot: WORKSPACE, roots: [fixtureRoot] });

          assert.deepEqual(
            report.populations.map((entry) => entry.sweep),
            OBSERVATION_SWEEPS.map((sweep) => sweep.id),
            "every declared population is reported — the census is driven from the registry",
          );
          for (const population of report.populations) {
            const sweep = OBSERVATION_SWEEPS.find((entry) => entry.id === population.sweep);
            // It names the sweep it ran, the root it walked, and the floor it expected.
            assert.equal(population.read.sweep, sweep.id, `${sweep.id}: names the sweep it ran`);
            assert.equal(population.read.root, journal.databasePath, `${sweep.id}: names the root it walked`);
            assert.equal(population.read.floor, sweep.floor, `${sweep.id}: names the floor it expected`);
            assert.ok(population.read.floor > 0, `${sweep.id}: the floor is a real floor`);
            assert.equal(typeof population.read.what, "string", `${sweep.id}: says what its population is`);
            assert.equal(typeof population.read.count, "number", `${sweep.id}: a clean result is not expressible without a count`);
            // And it names how many events it excluded as fixtures and how many worktrees
            // it folded.
            assert.equal(population.excluded.fixtures, 1, `${sweep.id}: names how many events it excluded as fixtures`);
            assert.equal(population.folded.worktrees, 1, `${sweep.id}: names how many worktrees it folded`);
            assert.deepEqual(population.folded.slugs, [dispatchWorktreeSlug(ITEM_REF)], `${sweep.id}: …and which`);
          }
        } finally {
          journal.close();
        }
      });
    },
  },

  // ── Scenario: a population declaring no floor is refused rather than reported ─────────
  {
    name: "61/02 task 00 — a population declaring no floor is refused rather than reported",
    async run() {
      await withFixtureRoot(async (fixtureRoot) => {
        const undeclared = { id: "observations:no-floor", event: "run.started", root: "<journal>", what: "a population with no floor", basis: "runtime" };
        let report = "the census returned a report";
        assert.throws(
          () => {
            report = observationCensus({
              eventsFor: () => production(9),
              workspaceRoot: WORKSPACE,
              root: JOURNAL_ROOT,
              sweeps: [OBSERVATION_SWEEPS[0], undeclared],
              roots: [fixtureRoot],
            });
          },
          (error) => {
            assert.ok(error instanceof TypeError, "the refusal is a construction-time refusal");
            assert.match(error.message, /observations:no-floor/u, "the run is refused NAMING that population");
            assert.match(error.message, /floor/u, "…and saying what it lacked");
            return true;
          },
          "a population declaring no floor is refused",
        );
        assert.equal(report, "the census returned a report", "no report is produced that states its count without a floor");

        // The refusal is not a quirk of the whole-census door: a single population is
        // refused the same way, so no path reaches a count without a floor.
        assert.throws(() => countPopulation(undeclared, production(9), { workspaceRoot: WORKSPACE, roots: [fixtureRoot] }), /observations:no-floor/u);
      });
    },
  },

  // ── Scenario: a count below its floor is a finding, not a silent zero ─────────────────
  {
    name: "61/02 task 00 — a count below its floor is a finding, not a silent zero",
    async run() {
      await withFixtureRoot(async (fixtureRoot) => {
        const population = census([...fixtures(30, fixtureRoot), ...production(2)], fixtureRoot);
        assert.ok(population.count < population.read.floor, "the filtered count really is below the declared floor");

        const finding = population.findings.find((entry) => entry.code === OBSERVATION_FINDING_CODES[0]);
        assert.ok(finding, "it carries a finding that the acceptor ran on nothing");
        assert.equal(finding.code, "acceptor-ran-on-nothing", "…the acceptor's own code, not the auditor's");
        assert.ok(finding.message.includes(RUN_SWEEP.id), "the finding names the sweep");
        assert.match(finding.message, /read 2 of a required 27/u, "…the count it got and the floor it missed");
        assert.ok(finding.message.includes(JOURNAL_ROOT), "…and the root it walked");
        assert.equal(finding.path, JOURNAL_ROOT, "…which is also where the finding points");
      });
    },
  },

  // ── Scenario: a census that filtered nothing at all is a finding, not a count ─────────
  {
    name: "61/02 task 00 — a census that filtered nothing at all is a finding, not a count",
    async run() {
      await withFixtureRoot(async (fixtureRoot) => {
        // Above its floor, and nothing excluded, nothing folded.
        const report = observationCensus({
          eventsFor: (sweep) => (sweep.id === RUN_SWEEP.id ? production(30) : []),
          workspaceRoot: WORKSPACE,
          root: JOURNAL_ROOT,
          roots: [fixtureRoot],
        });
        const population = report.populations.find((entry) => entry.sweep === RUN_SWEEP.id);
        assert.equal(population.excluded.fixtures + population.excluded.otherWorkspace + population.excluded.unlocated, 0, "the sweep excluded no event");
        assert.equal(population.folded.worktrees, 0, "…and folded no worktree");
        assert.equal(population.filtered, false, "…so it did not filter");

        const finding = report.findings.find((entry) => entry.code === OBSERVATION_FINDING_CODES[1]);
        assert.ok(finding, "it carries a finding");
        assert.equal(finding.sweep, RUN_SWEEP.id, "…naming that population");
        assert.match(finding.message, /excluded no event and folded no worktree/u, "…and saying what did not happen");
        assert.equal(Object.hasOwn(report.counts, RUN_SWEEP.id), false, "its number is not presented as a filtered count");
        assert.ok(population.count >= population.read.floor, "…and this is NOT the below-floor case wearing another name");
        assert.equal(population.findings.some((entry) => entry.code === OBSERVATION_FINDING_CODES[0]), false, "…the ran-on-nothing finding is absent here");
      });
    },
  },

  // ── Scenario: what was filtered is reported even when the count is healthy ────────────
  {
    name: "61/02 task 00 — what was filtered is reported even when the count is healthy",
    async run() {
      await withFixtureRoot(async (fixtureRoot) => {
        const events = [...production(28), ...production(2, DISPATCH_WORKTREE), ...fixtures(11, fixtureRoot), ...production(4, OTHER_WORKSPACE)];
        const population = census(events, fixtureRoot);

        assert.ok(population.count > population.read.floor, "the filtered count is well above its floor");
        assert.equal(population.count, 30, "…and it is the filtered number");
        assert.equal(population.findings.length, 0, "a healthy, filtered population carries no finding");
        // It STILL states what it excluded and what it folded.
        assert.deepEqual(population.excluded, { unfilteredTotal: 45, fixtures: 11, otherWorkspace: 4, unlocated: 0 }, "it still states what it excluded");
        assert.equal(population.folded.worktrees, 1, "it still states what it folded");
        assert.equal(population.folded.events, 2, "…including how many observations that folding moved");
        assert.deepEqual(population.folded.slugs, [dispatchWorktreeSlug(ITEM_REF)], "…and which worktree it was");
      });
    },
  },
];
