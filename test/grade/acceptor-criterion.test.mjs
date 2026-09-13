// Traceability: milestone 61 / story 01 — the epoch and the frozen criterion.
//
//   tasks/00_an-epoch-closes-on-the-way-into-done.feature
//   tasks/01_the-criterion-is-frozen-inside-its-epoch.feature
//   tasks/02_a-criterion-move-resets-the-ledger-by-name.feature
//   tasks/03_only-the-operator-revises-at-a-boundary.feature
//
// Every scenario and every Examples row across the four is exercised here. The lifecycle
// rows are driven through the REAL writer (`setItemStatus`) over a real record doc, so
// "when the move is made" means the move the framework actually makes — and the row the
// lifecycle refuses is refused by the lifecycle rather than by a fixture pretending to be
// one. The declared-guard rows are driven through the REAL compiler over the REAL shipped
// declaration, so "the guard installed in a workspace" means the rules a workspace gets.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ITEM_STATUS_EDGES, closesEpoch, isOpen } from "../../src/acceptance-horizon.mjs";
import { setItemStatus } from "../../src/work.mjs";
import { bundledFrozenSet, compileFrozenSet, readFrozenSet, FROZEN_OWNERSHIP_MARKER } from "../../src/frozen-set.mjs";
import { initWork } from "../../src/work/init.mjs";
import { updateWork } from "../../src/work/update.mjs";
import {
  ACCEPTOR_EPOCH_CADENCE,
  ACCEPTOR_EPOCH_SPAN,
  CRITERION_BUDGET_BELOW_PAIR_COUNT,
  CRITERION_FROZEN_IN_EPOCH,
  CRITERION_PAIR_COUNT_DERIVED,
  CRITERION_RELPATH,
  CRITERION_REVISION_NOT_OPERATOR,
  EPOCH_SPAN_NOT_REQUESTABLE,
  FROZEN_CRITERION_KEYS,
  FROZEN_CRITERION_MEMBERS,
  LEDGER_RELPATH,
  REVISING_ACTOR,
  accrualReport,
  criterionDigest,
  criterionRevisionWindow,
  defaultCriterion,
  epochFor,
  makeCriterion,
  pairCountFor,
  readCriterion,
  reviseCriterion,
  rulingsUnderCurrentCriterion,
  writeCriterion,
} from "../../src/work-acceptor/criterion.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// The auditor's own record, read where a workspace carries it. Its `cadence:` is the other
// half of "the acceptor's epoch equals the cadence of the loop auditing its instruments":
// the two are compared, and neither is read out of the other's file.
const AUDITOR_RECORD = path.join(repoRoot, ".aof", "loops", "instrument-audit.md");

const CONFIG_RELPATH = ".aof/aof.config.json";

// ─── fixtures ──────────────────────────────────────────────────────────────────────────

async function scratch(body, prefix = "aof-61-01-") {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const frontmatter = (fields) =>
  `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n\n# fixture\n`;

// A real milestone record doc at `status`, so the writer has something to move.
async function milestoneAt(root, ref, status) {
  const dir = path.join(root, `${ref}_milestone_fixture`);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "SPEC.md"),
    frontmatter({ type: "milestone", number: ref, slug: "fixture", status, created: "2026-08-01", updated: "2026-08-01", schema: 1 }),
    "utf8",
  );
  return { ref, dir, type: "milestone" };
}

// The move the framework actually makes, then the boundary asked about its RESULT. The
// payload the seam raises carries `status` and `from` (`src/effects/item-transitions.mjs`),
// and this returns exactly that pair so the predicate is asked the payload's own question.
async function makeTheMove(root, ref, from, to) {
  const item = await milestoneAt(root, ref, from);
  const record = await setItemStatus(item, to, { now: new Date("2026-08-30T00:00:00.000Z") });
  return { record, boundary: closesEpoch(record.status), epoch: epochFor({ ref: record.ref, status: record.status, from: record.from }) };
}

// The workspace shape the declared guard arrives in: an installed project, carrying the
// project config the knob values live in. `aof work init` deliberately writes no
// `aof.config.json` of its own, so the fixture supplies the one an ordinary project has —
// the file whose ORDINARY edits this story must leave unrefused.
async function installedWorkspace(body) {
  return scratch(async (dir) => {
    await initWork({ targetDir: dir, runtimes: ["claude"] });
    await mkdir(path.join(dir, ".aof"), { recursive: true });
    await writeFile(
      path.join(dir, ...CONFIG_RELPATH.split("/")),
      `${JSON.stringify({ name: "fixture", work: { autonomous: { maxAttempts: 3 } } }, null, 2)}\n`,
      "utf8",
    );
    return await body(dir);
  }, "aof-61-01-ws-");
}

// ─── the declared guard, asked the way a workspace asks it ─────────────────────────────

// The compiled permission denials, as a workspace receives them. `deniedBy` answers the
// outline's question — is this operation over this path denied? — off the compiled rules
// rather than off a list written here beside them.
const compiledRules = (declaration) => compileFrozenSet(declaration).permissions.map((entry) => entry.rule);
const deniedBy = (rules, operation, subject) => rules.includes(`${operation}(${subject})`);

const acceptorMember = (declaration) => (declaration?.members ?? []).find((member) => member.id === "acceptor-criterion");

// ─── the ledger fixtures ───────────────────────────────────────────────────────────────

const IN_FORCE = defaultCriterion();
// A sibling criterion built by hand. `N` is dropped from the spread deliberately: it is
// DERIVED from alpha and lambda, so carrying the old one forward beside a new lambda is
// the disagreement `makeCriterion` refuses — which is asserted directly further down.
const variant = (patch) => {
  const { N, ...rest } = IN_FORCE;
  void N;
  return makeCriterion({ ...rest, ...patch });
};
// A criterion that has since moved: one frozen part different, everything else identical.
const SUPERSEDED = variant({ lambda: 0.4 });

let rulingSeq = 0;
const ruling = (criterion, extra = {}) => ({
  at: `2026-08-30T00:00:${String(rulingSeq++).padStart(2, "0")}.000Z`,
  criterion: criterionDigest(criterion),
  ...extra,
});

const ledgerOf = (...criteria) => criteria.map((criterion) => ruling(criterion));

const LEDGERS = {
  "five rulings under the criterion in force": ledgerOf(IN_FORCE, IN_FORCE, IN_FORCE, IN_FORCE, IN_FORCE),
  "five rulings under a criterion that has since moved": ledgerOf(SUPERSEDED, SUPERSEDED, SUPERSEDED, SUPERSEDED, SUPERSEDED),
  "five under a superseded criterion, then one under the one in force": ledgerOf(SUPERSEDED, SUPERSEDED, SUPERSEDED, SUPERSEDED, SUPERSEDED, IN_FORCE),
  "three under the one in force, then two superseded, then one under it": ledgerOf(IN_FORCE, IN_FORCE, IN_FORCE, SUPERSEDED, SUPERSEDED, IN_FORCE),
  "no rulings at all": [],
};

const COUNTS = { five: 5, none: 0, one: 1 };

// ─── the ten frozen quantities, each as the revision that touches it ───────────────────
//
// One row per Examples row of task 01, mapping the phrase to the patch that moves exactly
// that quantity. The pair count is revised THROUGH what it comes from — an N stated beside
// the alpha and lambda that give it — because a pair count pinned while those move is the
// drift ADR-004 §4 exists to refuse, and is asserted separately below.
const QUANTITIES = [
  ["the trial metric", { metric: "module:src/work/counters.mjs#roundsToFirstReview" }, "metric"],
  ["the paired counter-metric", { counter: "module:src/work/counters.mjs#countReviewRounds" }, "counter"],
  ["alpha", { alpha: 0.1 }, "alpha"],
  ["lambda", { lambda: 0.4 }, "lambda"],
  ["the pair count N those two give", { alpha: 0.05, lambda: 0.4, N: pairCountFor(0.05, 0.4) }, "lambda"],
  ["the pair budget B a run is truncated at", { B: 22 }, "B"],
  ["the membership of the knob set", { tunables: { "a.declared.knob": { floor: 1, ceiling: 3 } } }, "tunables"],
  ["a knob's floor or ceiling", { tunables: { "a.declared.knob": { floor: 1, ceiling: 4 } } }, "tunables"],
  ["the price ceiling a trial may not be above", { trialCeilingUsd: 900 }, "trialCeilingUsd"],
  ["the frozen set", { frozenSet: [...IN_FORCE.frozenSet, "a-seventh-member"] }, "frozenSet"],
];

const OPEN_EPOCH = criterionRevisionWindow({
  lastClose: { epochId: "60", at: "2026-08-29T00:00:00.000Z" },
  rulings: [{ at: "2026-08-29T12:00:00.000Z", criterion: criterionDigest(IN_FORCE) }],
});
const AT_A_BOUNDARY = criterionRevisionWindow({ lastClose: { epochId: "60", at: "2026-08-29T00:00:00.000Z" }, rulings: [] });

const WINDOWS = { open: OPEN_EPOCH, "at a boundary": AT_A_BOUNDARY };

export const acceptorCriterionTests = [
  // ══ task 00 — an epoch closes on the way INTO acceptance, whatever it came from ══════

  // Scenario Outline: the lifecycle move decides, and only its destination does.
  ...[
    ["in-progress", "done", "closes"],
    ["in-review", "done", "closes"],
    ["not-started", "in-progress", "does not close"],
    ["not-started", "blocked", "does not close"],
    ["in-progress", "in-review", "does not close"],
    ["in-progress", "blocked", "does not close"],
    ["in-progress", "not-started", "does not close"],
    ["in-review", "in-progress", "does not close"],
    ["in-review", "blocked", "does not close"],
    ["blocked", "in-progress", "does not close"],
    ["blocked", "not-started", "does not close"],
  ].map(([from, to, boundary], index) => ({
    name: `61/01/00 the lifecycle move decides — ${from} -> ${to}: an epoch ${boundary}`,
    run: async () => scratch(async (root) => {
      // Every row is a LEGAL move, asserted against the lifecycle's own table rather than
      // asserted about it — a row that stopped being legal would otherwise be tested as
      // though it were.
      assert.ok(ITEM_STATUS_EDGES[from].includes(to), `${from} -> ${to} is a legal move of the lifecycle`);
      const moved = await makeTheMove(root, `6${index}`, from, to);
      assert.equal(moved.record.status, to, "the move was really made");
      assert.equal(moved.boundary, boundary === "closes");
      assert.equal(moved.epoch.closed, boundary === "closes");
    }),
  })),

  {
    name: "61/01/00 an item accepted from review closes its epoch exactly as one accepted from build does",
    run: async () => scratch(async (root) => {
      const fromBuild = await makeTheMove(root, "70", "in-progress", "done");
      const fromReview = await makeTheMove(root, "71", "in-review", "done");
      assert.equal(fromBuild.boundary, true, "an acceptance from build closes an epoch");
      assert.equal(fromReview.boundary, true, "…and so does an acceptance from review");
      // Nothing about the outcome differs — including the epoch record, once the ref and
      // the provenance the two legitimately differ in are set aside.
      const shape = (moved) => ({ ...moved.epoch, epochId: null, milestone: null, from: null });
      assert.deepEqual(shape(fromReview), shape(fromBuild), "neither outcome differs from the other");
    }),
  },

  {
    name: "61/01/00 the state an item departed from is recorded and never consulted",
    run: async () => scratch(async (root) => {
      const moved = await makeTheMove(root, "72", "in-review", "done");
      assert.equal(moved.record.from, "in-review", "the acceptance states the state the milestone came from");
      assert.equal(moved.epoch.from, "in-review", "…and it is carried onto the epoch record as provenance");
      // That state made NO difference: the boundary is a function of one argument, so
      // every admitting from-state gives the identical answer.
      const departures = Object.entries(ITEM_STATUS_EDGES).filter(([, edges]) => edges.includes("done")).map(([status]) => status);
      assert.deepEqual(departures.sort(), ["in-progress", "in-review"], "two states reach acceptance, and both are exercised");
      assert.equal(closesEpoch.length, 1, "the predicate takes one argument, so a from-state cannot reach it");
      assert.deepEqual(
        [...new Set(departures.map((from) => closesEpoch("done")))],
        [true],
        "the answer is the same whatever the item departed from",
      );
    }),
  },

  {
    name: "61/01/00 a move the lifecycle refuses never reaches the boundary",
    run: async () => scratch(async (root) => {
      const item = await milestoneAt(root, "73", "not-started");
      let refusal = null;
      try {
        await setItemStatus(item, "done", { now: new Date("2026-08-30T00:00:00.000Z") });
      } catch (error) {
        refusal = error;
      }
      assert.ok(refusal != null, "the move is refused");
      assert.equal(refusal.code, "status-edge-not-applicable");
      // Nothing moved, so nothing was raised and no epoch closed: the record doc still
      // carries the status it had, and the boundary is never asked.
      const doc = await readFile(path.join(item.dir, "SPEC.md"), "utf8");
      assert.match(doc, /^status: not-started$/m, "the record doc did not move");
      assert.equal(closesEpoch("not-started"), false, "and no epoch closes");
    }),
  },

  {
    name: "61/01/00 the boundary is the acceptance word itself, not a destination that resembles it",
    run: () => {
      for (const resembling of ["Done", "DONE", "done ", " done", "done-ish", "completed", "complete", "accepted", "closed"]) {
        assert.equal(closesEpoch(resembling), false, `"${resembling}" merely resembles the acceptance word`);
      }
      assert.equal(closesEpoch("done"), true, "…and the word itself is the boundary");
    },
  },

  {
    name: "61/01/00 the span of an epoch is one milestone",
    run: () => {
      const epoch = epochFor({ ref: "61", status: "in-progress" });
      assert.equal(epoch.state, "open", "the epoch is identified while it is open");
      assert.equal(epoch.milestone, "61", "it names exactly one milestone");
      assert.equal(typeof epoch.milestone, "string", "…one, never a set of them");
      assert.equal(epoch.epochId, epoch.milestone, "and the id it is known by is that milestone's ref");
      assert.equal(epoch.span, ACCEPTOR_EPOCH_SPAN, "the span it covers is that milestone's");
      assert.equal(ACCEPTOR_EPOCH_SPAN, "milestone");
    },
  },

  {
    name: "61/01/00 the acceptor's epoch equals the cadence of the loop auditing its instruments",
    run: async () => {
      // Each side is read from its OWN declaration. The auditor's cadence comes off the
      // auditor's record; the acceptor's comes off the acceptor's module. Neither reads the
      // other, so this is a comparison rather than a tautology.
      const auditor = await readFile(AUDITOR_RECORD, "utf8");
      const declared = /^cadence:\s*(\S+)\s*$/m.exec(auditor);
      assert.ok(declared != null, "the auditor record declares a cadence");
      assert.equal(declared[1], ACCEPTOR_EPOCH_CADENCE, "the two agree");

      const acceptorSource = await readFile(path.join(repoRoot, "src", "work-acceptor", "criterion.mjs"), "utf8");
      assert.equal(
        /readFile\([^)]*instrument-audit/.test(acceptorSource) || acceptorSource.includes("loops/instrument-audit.md\""),
        false,
        "the acceptor does not read the auditor's record to define its own epoch",
      );
      assert.equal(auditor.includes("acceptor"), false, "and the auditor's record does not restate the acceptor's epoch inside itself");
    },
  },

  {
    name: "61/01/00 the span cannot be chosen at the moment of asking",
    run: () => {
      const request = { ref: "61", status: "done" };
      for (const offered of ["span", "epoch", "since", "until", "range", "cadence", "window"]) {
        assert.throws(
          () => epochFor(request, { [offered]: "periodic:30d" }),
          (error) => error.code === EPOCH_SPAN_NOT_REQUESTABLE && error.message.includes(offered),
          `a "${offered}" offered alongside the request is refused`,
        );
      }
      // …and with nothing offered, the epoch resolves from the declared unit alone.
      assert.equal(epochFor(request).span, ACCEPTOR_EPOCH_SPAN);
      assert.equal(epochFor(request, {}).cadence, ACCEPTOR_EPOCH_CADENCE);
    },
  },

  {
    name: "61/01/00 an epoch that has closed is distinguishable from one still open",
    run: async () => scratch(async (root) => {
      const reached = await makeTheMove(root, "74", "in-progress", "done");
      const notReached = await makeTheMove(root, "75", "not-started", "in-progress");
      assert.equal(reached.epoch.state, "closed", "the first is reported closed");
      assert.equal(notReached.epoch.state, "open", "and the second open");
      assert.notEqual(reached.epoch.state, notReached.epoch.state, "the two are distinguishable, never the same word");
    }),
  },

  // ══ task 01 — the yardstick is refused mid-epoch, and the refusal says which part ═════

  // Scenario Outline: what may be revised, and when — twenty rows, ten quantities x two
  // moments, each driven through the one writer seam.
  ...["open", "at a boundary"].flatMap((moment) =>
    QUANTITIES.map(([quantity, patch, part]) => ({
      name: `61/01/01 ${moment} — revising ${quantity} is ${moment === "open" ? "refused" : "accepted"}`,
      run: () => {
        const window = WINDOWS[moment];
        if (moment === "open") {
          assert.throws(
            () => reviseCriterion(IN_FORCE, patch, { window }),
            (error) => error.code === CRITERION_FROZEN_IN_EPOCH && error.parts.includes(part),
            `${quantity} is refused inside an open epoch, naming ${part}`,
          );
          return;
        }
        const outcome = reviseCriterion(IN_FORCE, patch, { window });
        assert.ok(outcome.moved.length > 0, `${quantity} really moved`);
        assert.ok(outcome.moved.some((entry) => entry.part === part), `…and it is ${part} that moved`);
        assert.notEqual(outcome.digest.digest, criterionDigest(IN_FORCE).digest, "…so the criterion in force is a different one");
      },
    })),
  ),

  {
    name: "61/01/01 the ten frozen quantities are exactly the criterion's four frozen members, and freezing three of four is not expressible",
    run: () => {
      // The four members of ADR-004 §4, exactly — and the union of what they cover is the
      // criterion's whole key set, so "the criterion moved" and "a frozen member moved"
      // cannot come apart.
      assert.deepEqual(
        FROZEN_CRITERION_MEMBERS.map((member) => member.id),
        ["trial-metric", "evidence-threshold", "tunable-set", "frozen-set"],
      );
      assert.deepEqual([...FROZEN_CRITERION_KEYS].sort(), Object.keys(IN_FORCE).sort(), "no criterion key sits outside a frozen member");
      const threshold = FROZEN_CRITERION_MEMBERS.find((member) => member.id === "evidence-threshold");
      for (const quantity of ["alpha", "lambda", "N", "B"]) {
        assert.ok(threshold.covers.includes(quantity), `${quantity} is inside the one member, so it cannot be frozen without its siblings`);
      }
      // Every one of the ten Examples rows lands on one of the four.
      for (const [quantity, , part] of QUANTITIES) {
        assert.ok(FROZEN_CRITERION_MEMBERS.some((member) => member.covers.includes(part)), `${quantity} is covered by a frozen member`);
      }
    },
  },

  {
    name: "61/01/01 the refusal names what was touched, the epoch it was touched in, and where it may be made",
    run: () => {
      let refusal = null;
      try {
        reviseCriterion(IN_FORCE, { alpha: 0.1 }, { window: OPEN_EPOCH });
      } catch (error) {
        refusal = error;
      }
      assert.ok(refusal != null, "a frozen part revised inside an open epoch is refused");
      assert.equal(refusal.part, "alpha", "the refusal names the part that was touched");
      assert.match(refusal.message, /alpha/, "…in its own sentence, not only in a field");
      assert.equal(refusal.member, "evidence-threshold", "…and the member it belongs to");
      assert.equal(refusal.openEpoch, OPEN_EPOCH.openEpoch, "it names the epoch that is open");
      assert.match(refusal.message, new RegExp(OPEN_EPOCH.openEpoch));
      assert.equal(refusal.boundary, OPEN_EPOCH.boundary, "it names the boundary at which the revision may be made");
      assert.match(refusal.message, /epoch boundary/);
      assert.equal(refusal.code, CRITERION_FROZEN_IN_EPOCH, "the refusal carries a code rather than only a sentence");
    },
  },

  {
    name: "61/01/01 a refusal is a refusal, not a warning",
    run: () => {
      const before = criterionDigest(IN_FORCE).digest;
      assert.throws(() => reviseCriterion(IN_FORCE, { lambda: 0.4 }, { window: OPEN_EPOCH }), { code: CRITERION_FROZEN_IN_EPOCH });
      assert.equal(criterionDigest(IN_FORCE).digest, before, "the criterion in force afterwards is the one in force before");
      assert.equal(IN_FORCE.lambda, 0.5, "…unchanged in every part, not merely in its digest");
      // Nothing about the attempt is advisory: the seam THROWS, so there is no return value
      // a caller could mistake for a completed revision carrying a warning.
      let returned = "not-reached";
      try {
        returned = reviseCriterion(IN_FORCE, { lambda: 0.4 }, { window: OPEN_EPOCH });
      } catch (error) {
        assert.equal(/warn|advisory|deprecat/i.test(error.message), false, "the refusal is not worded as advice");
        assert.equal(error.severity ?? null, null, "and it carries no severity that could downgrade it");
      }
      assert.equal(returned, "not-reached", "the seam returns nothing on a refusal");
    },
  },

  {
    name: "61/01/01 a derived quantity cannot be pinned while the quantities it comes from move",
    run: () => {
      // lambda is revised and the pair count is left as it was…
      const outcome = reviseCriterion(IN_FORCE, { lambda: 0.4 }, { window: AT_A_BOUNDARY });
      assert.equal(IN_FORCE.N, 8, "the criterion it came from stated 8");
      assert.equal(outcome.criterion.N, pairCountFor(0.05, 0.4), "…and the pair count in force is the one the revised lambda and alpha give");
      assert.equal(outcome.criterion.N, 9, "which is 9, not the 8 it was carrying");
      // …and a criterion whose STATED pair count disagrees with them is refused.
      assert.throws(
        () => makeCriterion({ ...IN_FORCE, lambda: 0.4, N: 8 }),
        (error) => error.code === CRITERION_PAIR_COUNT_DERIVED && error.stated === 8 && error.derived === 9,
        "a stated N that disagrees with alpha and lambda is refused",
      );
    },
  },

  {
    name: "61/01/01 the pair budget is frozen for the other reason, and a run cannot be lengthened",
    run: () => {
      // A proposal accruing inside an open epoch that has not yet reached a commit: five
      // pairs banked against a budget of 11 and a crossing it has not made.
      const accruing = { pairs: 5, budget: IN_FORCE.B };
      assert.ok(accruing.pairs < IN_FORCE.N, "the proposal has not reached a commit");
      assert.throws(
        () => reviseCriterion(IN_FORCE, { B: 22 }, { window: OPEN_EPOCH }),
        (error) => error.code === CRITERION_FROZEN_IN_EPOCH && error.parts.includes("B"),
        "the extension is refused",
      );
      assert.equal(IN_FORCE.B, 11, "the budget in force when it began is unmoved");
      assert.equal(accruing.budget, 11, "…so the proposal is still truncated at it");
      assert.equal(IN_FORCE.B - accruing.pairs, 6, "and what remains is computed against that budget, not against the one asked for");
    },
  },

  {
    name: "61/01/01 a pair budget below the earliest crossing is refused when the criterion is made",
    run: () => {
      let refusal = null;
      try {
        makeCriterion({ ...IN_FORCE, B: 5 });
      } catch (error) {
        refusal = error;
      }
      assert.ok(refusal != null, "it is refused");
      assert.equal(refusal.code, CRITERION_BUDGET_BELOW_PAIR_COUNT);
      assert.equal(refusal.budget, 5, "the refusal names the budget");
      assert.equal(refusal.pairCount, 8, "…and the pair count it falls below");
      assert.match(refusal.message, /\b5\b/);
      assert.match(refusal.message, /\b8\b/);
      // The boundary case is admitted rather than refused: B === N funds the earliest
      // crossing exactly.
      assert.equal(makeCriterion({ ...IN_FORCE, B: 8 }).B, 8);
    },
  },

  {
    name: "61/01/01 a knob's value may move mid-epoch, and is not treated as a criterion revision",
    run: async () => installedWorkspace(async (dir) => {
      const before = criterionDigest(await readCriterion(dir));
      const configPath = path.join(dir, ...CONFIG_RELPATH.split("/"));
      const config = JSON.parse(await readFile(configPath, "utf8"));
      config.work = { ...(config.work ?? {}), autonomous: { maxAttempts: 2 } };
      // The change is not refused — nothing stands between an operator and this file, by
      // design (ADR-005 §4): a knob move is what a commit IS.
      await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
      const rules = compiledRules(await readFrozenSet(dir));
      assert.equal(deniedBy(rules, "Edit", CONFIG_RELPATH), false, "no compiled rule denies editing the knob values");
      assert.equal(deniedBy(rules, "Write", CONFIG_RELPATH), false);
      assert.equal(rules.some((rule) => rule.includes("aof.config.json")), false, "…nor any rule naming that file at all");
      // And the criterion in force is unchanged.
      assert.deepEqual(criterionDigest(await readCriterion(dir)), before, "the criterion in force is unchanged");
    }),
  },

  {
    name: "61/01/01 a project that has never revised the criterion still has one",
    run: async () => installedWorkspace(async (dir) => {
      const criterion = await readCriterion(dir);
      assert.deepEqual(criterion, defaultCriterion(), "it is the framework's own");
      // Nothing had to be installed for that to be true: the record is absent from the
      // project, and absent from the bundle that installs into it.
      await assert.rejects(readFile(path.join(dir, ...CRITERION_RELPATH.split("/")), "utf8"), { code: "ENOENT" });
      const descriptor = JSON.parse(await readFile(path.join(repoRoot, "src", "bundle", "bundle.json"), "utf8"));
      assert.equal(
        descriptor.members.some((member) => String(member?.target ?? "").replaceAll("\\", "/") === CRITERION_RELPATH),
        false,
        "the criterion is not a bundle asset — defaults in code, revisions in the project, no third state",
      );
    }),
  },

  {
    name: "61/01/01 a boundary revision survives a framework refresh and is not reported as drift",
    run: async () => installedWorkspace(async (dir) => {
      const revised = await writeCriterion(dir, { trialCeilingUsd: 900 }, { window: AT_A_BOUNDARY });
      assert.equal(revised.criterion.trialCeilingUsd, 900);

      const refresh = await updateWork({ targetDir: dir });
      const named = (refresh.actions ?? []).filter((action) => String(action.path).replaceAll("\\", "/").endsWith(CRITERION_RELPATH));
      assert.deepEqual(named, [], "the refresh names no action over the criterion — neither drift nor tamper nor overwrite");
      // Neither drift nor tampering: the refresh classifies nothing at all here, so there
      // is no drift-warning to be raised over a file the installer does not own. (The
      // installed frozen-set declaration NAMES this path in its deny rules, which is why
      // the assertion is over the actions' own paths rather than over their text.)
      assert.equal(refresh.summary?.["drift-warning"] ?? 0, 0, "and the revision is reported as neither drift nor tampering");
      assert.deepEqual(
        (refresh.actions ?? []).filter((action) => (action.kind ?? action.action) !== "skip").map((action) => action.path),
        [],
        "…the refresh moved nothing at all",
      );
      assert.equal((await readCriterion(dir)).trialCeilingUsd, 900, "the revised criterion is still in force");
    }),
  },

  // ══ task 02 — evidence gathered under a criterion that has since moved counts for nothing ══

  // Scenario Outline: only the unbroken run of rulings sharing the criterion in force is
  // counted.
  ...Object.entries(LEDGERS).map(([ledger, rulings]) => {
    const expected = {
      "five rulings under the criterion in force": "five",
      "five rulings under a criterion that has since moved": "none",
      "five under a superseded criterion, then one under the one in force": "one",
      "three under the one in force, then two superseded, then one under it": "one",
      "no rulings at all": "none",
    }[ledger];
    return {
      name: `61/01/02 a ledger holding ${ledger} counts ${expected}`,
      run: () => {
        const counted = rulingsUnderCurrentCriterion(rulings, criterionDigest(IN_FORCE));
        assert.equal(counted.length, COUNTS[expected], `${expected} of them count`);
        assert.equal(accrualReport({ rulings, criterion: IN_FORCE }).counted, COUNTS[expected]);
      },
    };
  }),

  {
    name: "61/01/02 the superseded rulings stay in the ledger, they just stop counting",
    run: () => {
      const rulings = LEDGERS["five under a superseded criterion, then one under the one in force"];
      const before = rulings.length;
      const report = accrualReport({ rulings, criterion: IN_FORCE });
      assert.equal(rulings.length, before, "those rulings are still present");
      assert.equal(report.total, 6, "…and the report says how many the ledger holds");
      assert.equal(report.superseded, 5);
      assert.equal(report.counted, 1, "none of them contributes to the evidence toward a proposal");
      for (const superseded of rulings.slice(0, 5)) {
        assert.equal(report.rulings.includes(superseded), false, `a ruling under the superseded criterion is not counted`);
      }
    },
  },

  // Scenario Outline: how the criterion came to move makes no difference to the reset.
  ...[
    ["by hand in an editor", async (dir, next) => {
      await writeFile(path.join(dir, ...CRITERION_RELPATH.split("/")), `${JSON.stringify(next, null, 2)}\n`, "utf8");
    }],
    ["by a script writing the record", async (dir, next) => {
      // No comment header, minified — a script's shape, not a human's.
      await writeFile(path.join(dir, ...CRITERION_RELPATH.split("/")), JSON.stringify(next), "utf8");
    }],
    ["by a merge bringing it in", async (dir, next) => {
      // A merge writes the resolved file whole; conflict markers never survive one.
      await writeFile(path.join(dir, ...CRITERION_RELPATH.split("/")), `// merged\n${JSON.stringify(next, null, 2)}\n`, "utf8");
    }],
    ["with every guard over it bypassed", async (dir, next) => {
      // The declared guard denies an agent Edit/Write on this path. This route writes it
      // anyway, which is exactly the case layer 1 exists to survive.
      const rules = compiledRules(await readFrozenSet(dir));
      assert.ok(deniedBy(rules, "Write", CRITERION_RELPATH), "the guard really does deny this write");
      await writeFile(path.join(dir, ...CRITERION_RELPATH.split("/")), `${JSON.stringify(next, null, 2)}\n`, "utf8");
    }],
  ].map(([route, move]) => ({
    name: `61/01/02 the criterion changed ${route} — the evidence toward a proposal is reset`,
    run: async () => installedWorkspace(async (dir) => {
      const accruing = ledgerOf(IN_FORCE, IN_FORCE, IN_FORCE);
      assert.equal(accrualReport({ rulings: accruing, criterion: await readCriterion(dir) }).counted, 3, "the ledger really was accruing");

      await move(dir, SUPERSEDED);

      const after = await readCriterion(dir);
      const report = accrualReport({ rulings: accruing, criterion: after });
      assert.equal(report.counted, 0, "the evidence toward a proposal is reset");
      assert.equal(report.criterionMoved, true);
      // No total spans the change: the counted set is a suffix, so there is no arrangement
      // of these rulings that produces a number bridging the two criteria.
      assert.equal(report.counted + report.superseded, accruing.length);
      assert.equal(report.rulings.length, 0, "and nothing rendered under the old one is in the counted set");
    }),
  })),

  {
    name: "61/01/02 the surface says which part of the criterion moved",
    run: () => {
      const rulings = ledgerOf(SUPERSEDED, SUPERSEDED, IN_FORCE, IN_FORCE);
      // A ledger whose accrual was reset by a move: the two newest share the criterion in
      // force, the two oldest do not.
      const reset = accrualReport({ rulings: ledgerOf(SUPERSEDED, SUPERSEDED), criterion: IN_FORCE });
      assert.equal(reset.state, "reset", "it reports the count as reset…");
      assert.notEqual(reset.state, "never-started", "…rather than as never having started");
      assert.equal(reset.counted, 0);
      assert.deepEqual(reset.moved.map((entry) => entry.member), ["evidence-threshold"], "and it names the part of the criterion that moved");
      assert.match(reset.moved[0].describes, /lambda/, "…by what that member covers, not only by an id");
      // The never-started case really is a different word over the same number.
      const nothing = accrualReport({ rulings: [], criterion: IN_FORCE });
      assert.equal(nothing.counted, 0);
      assert.equal(nothing.state, "never-started");
      assert.equal(accrualReport({ rulings, criterion: IN_FORCE }).state, "reset");
    },
  },

  {
    name: "61/01/02 an unchanged criterion is reported as unchanged rather than assumed",
    run: () => {
      const report = accrualReport({ rulings: ledgerOf(IN_FORCE, IN_FORCE, IN_FORCE), criterion: IN_FORCE });
      assert.equal(report.criterionMoved, false, "it states that the criterion is unchanged");
      assert.equal(report.state, "carried-forward", "and it states that the count was carried forward");
      assert.equal(report.carriedForward, true);
      assert.equal(report.counted, 3);
      assert.deepEqual(report.moved, [], "nothing is named as moved, because nothing did");
    },
  },

  {
    name: "61/01/02 every report of accrued evidence answers the question either way",
    run: () => {
      const reports = [
        accrualReport({ rulings: ledgerOf(IN_FORCE, IN_FORCE), criterion: IN_FORCE }),
        accrualReport({ rulings: ledgerOf(SUPERSEDED, IN_FORCE), criterion: IN_FORCE }),
        accrualReport({ rulings: [], criterion: IN_FORCE }),
        accrualReport({ rulings: ledgerOf(SUPERSEDED, SUPERSEDED), criterion: IN_FORCE }),
      ];
      for (const report of reports) {
        assert.equal(typeof report.criterionMoved, "boolean", "it says whether the criterion moved since the oldest ruling it counted");
        assert.ok(Object.hasOwn(report, "criterionMoved"), "and that answer is present whether or not it moved");
        assert.ok(["reset", "carried-forward", "never-started"].includes(report.state));
      }
      assert.deepEqual(reports.map((report) => report.criterionMoved), [false, true, false, true], "both answers really occur");
    },
  },

  {
    name: "61/01/02 a knob whose value changed under an accruing ledger is reported by name",
    run: () => {
      const knob = "a.declared.knob";
      const rulings = [ruling(IN_FORCE, { key: knob, from: 3, to: 2 }), ruling(IN_FORCE, { key: knob, from: 3, to: 2 })];
      const report = accrualReport({ rulings, criterion: IN_FORCE, knobValues: { [knob]: 1 } });
      assert.deepEqual(report.knobChanges, [{ knob, from: 3, to: 1 }], "the knob is named");
      assert.equal(report.counted, 2, "the change is reported rather than absorbed into the accrual");
      assert.equal(report.criterionMoved, false, "…and it is not mistaken for a criterion move");
      // A knob standing still is not reported as having moved.
      assert.deepEqual(accrualReport({ rulings, criterion: IN_FORCE, knobValues: { [knob]: 3 } }).knobChanges, []);
    },
  },

  // ══ task 03 — only the human operator revises, and only at a boundary ════════════════

  // Scenario Outline: who may revise the criterion, and when. The operator's rows are the
  // writer seam's answer; the agent's rows are the DECLARED GUARD's, which is the layer
  // that binds an agent and the only layer that binds one.
  ...[
    ["open", "the operator", "refused"],
    ["at a boundary", "the operator", "accepted"],
    ["open", "an agent", "denied"],
    ["at a boundary", "an agent", "denied"],
  ].map(([moment, actor, outcome]) => ({
    name: `61/01/03 an epoch that is ${moment} — ${actor} revises the criterion: ${outcome}`,
    run: () => {
      const window = WINDOWS[moment];
      if (actor === "an agent") {
        // The guard binds an agent at EVERY moment, so the window is not consulted: the
        // rule is the same rule whichever moment it is asked in.
        const rules = compiledRules(bundledFrozenSet());
        assert.ok(deniedBy(rules, "Edit", CRITERION_RELPATH) && deniedBy(rules, "Write", CRITERION_RELPATH), "the agent is denied");
        // …and the seam refuses a non-operator actor too, at both moments.
        assert.throws(
          () => reviseCriterion(IN_FORCE, { alpha: 0.1 }, { window, actor: "agent:aof-developer" }),
          { code: CRITERION_REVISION_NOT_OPERATOR },
        );
        return;
      }
      if (outcome === "refused") {
        assert.throws(() => reviseCriterion(IN_FORCE, { alpha: 0.1 }, { window, actor: REVISING_ACTOR }), { code: CRITERION_FROZEN_IN_EPOCH });
        return;
      }
      const revised = reviseCriterion(IN_FORCE, { alpha: 0.1 }, { window, actor: REVISING_ACTOR });
      assert.equal(revised.criterion.alpha, 0.1, "the revision is accepted");
    },
  })),

  {
    name: "61/01/03 a revision away from a boundary is told where it may be made",
    run: () => {
      let refusal = null;
      try {
        reviseCriterion(IN_FORCE, { trialCeilingUsd: 900 }, { window: OPEN_EPOCH, actor: REVISING_ACTOR });
      } catch (error) {
        refusal = error;
      }
      assert.ok(refusal != null && refusal.code === CRITERION_FROZEN_IN_EPOCH, "the revision is refused");
      assert.equal(refusal.openEpoch, "since:60", "the refusal names the epoch that is open");
      assert.match(refusal.message, /since:60/);
      assert.match(refusal.message, /epoch boundary/, "and it names the boundary at which the revision may be made");
      assert.equal(refusal.boundary, OPEN_EPOCH.boundary);
    },
  },

  {
    name: "61/01/03 a revision at a boundary takes effect for the span that follows it",
    run: () => {
      // An epoch that has just closed: the ledger holds no ruling rendered after it.
      const justClosed = criterionRevisionWindow({ lastClose: { epochId: "61", at: "2026-08-30T12:00:00.000Z" }, rulings: LEDGERS["five rulings under the criterion in force"] });
      assert.equal(justClosed.atBoundary, true, "the window is open at the boundary");
      const scoredUnder = criterionDigest(IN_FORCE);

      const revised = reviseCriterion(IN_FORCE, { trialCeilingUsd: 900 }, { window: justClosed, actor: REVISING_ACTOR });
      assert.equal(revised.criterion.trialCeilingUsd, 900, "the revision is accepted");

      // The criterion in force for the NEXT epoch is the revised one…
      const next = criterionRevisionWindow({ lastClose: { epochId: "62", at: "2026-08-31T00:00:00.000Z" }, rulings: [] });
      assert.equal(next.atBoundary, true);
      assert.equal(revised.criterion.trialCeilingUsd, 900);
      // …and the criterion the CLOSED epoch was scored under is unchanged: its rulings
      // still carry the digest they were rendered under, and nothing rewrote them.
      assert.deepEqual(criterionDigest(IN_FORCE), scoredUnder, "the criterion under which the closed epoch was scored is unchanged");
      assert.equal(IN_FORCE.trialCeilingUsd, 1500);
      for (const past of LEDGERS["five rulings under the criterion in force"]) {
        assert.equal(past.criterion.digest, scoredUnder.digest, "every ruling of the closed epoch still names the criterion it was rendered under");
      }
    },
  },

  {
    name: "61/01/03 the guard is declared where this system's other guards are declared",
    run: async () => installedWorkspace(async (dir) => {
      const declaration = await readFrozenSet(dir);
      const member = acceptorMember(declaration);
      assert.ok(member != null, "one of the workspace's declared guards names the acceptor's records");
      assert.deepEqual(member.rule.deny, [
        `Edit(${CRITERION_RELPATH})`,
        `Write(${CRITERION_RELPATH})`,
        `Edit(${LEDGER_RELPATH})`,
        `Write(${LEDGER_RELPATH})`,
      ], "it names the criterion record and the evidence ledger");
      assert.match(member.protects, /criterion record/, "it states what it protects");
      assert.match(member.protects, /ledger/);
      assert.equal(member.enforcementPoint, "permission denials", "…and which enforcement point carries it");
      assert.equal(member[FROZEN_OWNERSHIP_MARKER], member.id, "and it is marked as the framework's to manage");
    }),
  },

  // Scenario Outline: what the declared guard covers, and what it deliberately does not.
  ...[
    ["edit", "the criterion record", "denied", "Edit", CRITERION_RELPATH],
    ["write", "the criterion record", "denied", "Write", CRITERION_RELPATH],
    ["edit", "the evidence ledger", "denied", "Edit", LEDGER_RELPATH],
    ["write", "the evidence ledger", "denied", "Write", LEDGER_RELPATH],
    ["edit", "the project's knob values", "allowed", "Edit", CONFIG_RELPATH],
  ].map(([operation, subject, outcome, tool, target]) => ({
    name: `61/01/03 the guard: an agent attempts to ${operation} ${subject} — ${outcome}`,
    run: async () => installedWorkspace(async (dir) => {
      const rules = compiledRules(await readFrozenSet(dir));
      assert.equal(deniedBy(rules, tool, target), outcome === "denied", `${tool}(${target}) is ${outcome}`);
    }),
  })),

  {
    name: "61/01/03 the guard arrives in a project by the same path the other guards arrive by",
    run: async () => installedWorkspace(async (dir) => {
      const declaration = await readFrozenSet(dir);
      assert.ok(acceptorMember(declaration) != null, "the guard over the acceptor's records is among the project's declared guards");
      // It arrived as the frozen-set declaration asset, exactly as the other five did —
      // one file, one installer, one diff.
      const installedText = await readFile(path.join(dir, ".aof", "frozen-set.jsonc"), "utf8");
      assert.ok(installedText.includes("acceptor-criterion"));
      // And no other declared guard changed: the five that were there are byte-identical
      // in their own positions.
      const shipped = bundledFrozenSet().members;
      assert.deepEqual(
        declaration.members.filter((member) => member.id !== "acceptor-criterion"),
        shipped.filter((member) => member.id !== "acceptor-criterion"),
        "no other declared guard changed",
      );
      assert.deepEqual(
        declaration.members.map((member) => member.id),
        ["locked-contract", "litmus", "tag-vocabulary", "gate-order", "anchors", "acceptor-criterion"],
        "…and the new one is appended rather than reordering them",
      );
    }),
  },

  {
    name: "61/01/03 the framework's own writes are not stopped by the guard, and that limit is stated",
    run: async () => installedWorkspace(async (dir) => {
      const rules = compiledRules(await readFrozenSet(dir));
      assert.ok(deniedBy(rules, "Write", CRITERION_RELPATH), "the guard is installed in the workspace");
      // The framework writes the criterion at a boundary, through its own process.
      const written = await writeCriterion(dir, { trialCeilingUsd: 1200 }, { window: AT_A_BOUNDARY, actor: REVISING_ACTOR });
      assert.equal(written.criterion.trialCeilingUsd, 1200, "the write succeeds");
      assert.equal((await readCriterion(dir)).trialCeilingUsd, 1200);
      // …and the limit is STATED rather than implied: the member declares it binds direct
      // agent edits, at an enforcement point whose whole reach is an agent's tools.
      const member = acceptorMember(await readFrozenSet(dir));
      assert.match(member.protects, /agent/, "the guard is described as binding agents rather than every writer");
      assert.equal(member.enforcementPoint, "permission denials");
    }),
  },

  {
    name: "61/01/03 an ordinary configuration edit is not refused by any of this",
    run: async () => installedWorkspace(async (dir) => {
      const rules = compiledRules(await readFrozenSet(dir));
      assert.equal(rules.some((rule) => rule.includes("aof.config.json")), false, "the edit is not denied");
      const configPath = path.join(dir, ...CONFIG_RELPATH.split("/"));
      const config = JSON.parse(await readFile(configPath, "utf8"));
      config.work = { ...(config.work ?? {}), autonomous: { maxAttempts: 2 } };
      await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
      assert.equal(JSON.parse(await readFile(configPath, "utf8")).work.autonomous.maxAttempts, 2, "…and it lands");
      // No criterion refusal is raised: the criterion carries no knob value, so a knob edit
      // is not a criterion revision and there is nothing for the seam to refuse.
      assert.deepEqual(criterionDigest(await readCriterion(dir)), criterionDigest(defaultCriterion()));
      assert.deepEqual(Object.keys(defaultCriterion().tunables), [], "the criterion holds no knob value to be moved");
    }),
  },

  // A standing sanity leg over the horizon this milestone extends: the boundary predicate
  // is the exact complement of the horizon on the frozen five, so the acceptor and the
  // record-immutability rule can never disagree about what `done` means.
  {
    name: "61/01/00 the boundary predicate and the acceptance horizon are one decision, complemented",
    run: () => {
      for (const status of ["not-started", "in-progress", "blocked", "in-review", "done"]) {
        assert.equal(closesEpoch(status), !isOpen(status), `${status}: the boundary closes exactly when the horizon does`);
      }
    },
  },
];
