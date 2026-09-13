// Traceability wiring for milestone 61 / story 03 — no executed consumer, no proposal.
//
// Covers EVERY @executable scenario and EVERY Examples row in all three task features:
//   tasks/00_a-bound-nothing-consumes-refuses-its-proposal.feature
//   tasks/01_the-check-is-fail-closed-while-the-harness-is-a-prompt.feature
//   tasks/02_the-tunable-set-is-the-registrys.feature
//
// One test object per scenario, one per Examples ROW, each name tracing to feature +
// scenario. `{ name, run }` so it spreads into the runner's tests array like every other
// suite. node:assert/strict.
//
// TWO KINDS OF FIXTURE, AND THE DIFFERENCE MATTERS.
//
//   * The SYNTHETIC knob (`work.fixture.roundsAllowed`) exercises the rule. It is a key this
//     repository does not have and no record really declares, which is the point: the rule is
//     general, and a suite that could only demonstrate it on the three keys shipped today
//     would be indistinguishable from a rule with three cases in it. The last scenario of
//     feature 00 asserts exactly that — a knob declared tunable later is judged by the same
//     rule, with no case added for it by name.
//   * The REAL tree and the REAL registry (`loadLoops` over the shipped bundle, every
//     `src/**/*.mjs` read from disk) answer the scenarios that are about THIS repository as
//     it stands: every declared knob refused today, the count reported, and the declaration
//     consulted where it actually lives.
//
// The units are `{ rel, code }` — the same shape `test/arch/acd-progress-ledger-consumed`
// already feeds its ceiling-consumption predicate, so the production analysis is exercised
// here against planted programs and there against the real one, from one implementation.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ADMITTED_KEYS, EDGE_KEYS, ENDPOINT_SCHEMES, loadLoops } from "../../src/work/loops.mjs";
import {
  ADMISSIBILITY_RAN_ON_NOTHING,
  DISPOSITIONS,
  HARNESS_CONDITIONS,
  HARNESS_KINDS,
  HARNESS_NOT_INTROSPECTABLE,
  HARNESS_OF_RECORD,
  KEY_OUTSIDE_DECLARED_SET,
  NOT_ADMISSIBLE,
  REFUSAL_ORDER,
  TUNING_EDGE,
  assessProposal,
  assessTunableSet,
  consumptionReport,
  harnessRefusal,
  tunableSet,
} from "../../src/work-acceptor/admissibility.mjs";
import { readSrcFiles } from "../support/read-src-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ── THE SYNTHETIC KNOB ───────────────────────────────────────────────────────────────────
const KEY = "work.fixture.roundsAllowed";
const OTHER_KEY = "work.fixture.retriesAllowed";
const HOME = "fixture-bounds.mjs";

// The declaring home: it resolves the bound, composes it into a policy, and — deliberately —
// decides with it INSIDE ITSELF. A module is not its own consumer, so this home never
// satisfies the check no matter what it does with the value.
const declaringHome = () => ({
  rel: HOME,
  code: [
    "const fixtureConfig = (workspace) => workspace?.config?.work?.fixture;",
    "export function roundsAllowedFromConfig(workspace) {",
    "  return positiveInteger(fixtureConfig(workspace)?.roundsAllowed, 2);",
    "}",
    "export function fixturePolicyFromConfig(workspace) {",
    "  return Object.freeze({ roundsAllowed: roundsAllowedFromConfig(workspace) });",
    "}",
    "export function selfCheck(workspace, taken) {",
    "  const allowed = roundsAllowedFromConfig(workspace);",
    "  return taken >= allowed ? \"stop\" : \"go\";",
    "}",
    "",
  ].join("\n"),
});

const unrelated = () => ({ rel: "commands/unrelated.mjs", code: "export const go = () => 1;\n" });

const consumer = (rel = "commands/drive.mjs") => ({
  rel,
  code: [
    "import { roundsAllowedFromConfig } from \"../fixture-bounds.mjs\";",
    "export function drive(workspace, taken) {",
    "  const allowed = roundsAllowedFromConfig(workspace);",
    "  if (taken >= allowed) return \"stop\";",
    "  return \"go\";",
    "}",
    "",
  ].join("\n"),
});

// Resolved on a path that runs, and then thrown away: the value is logged and the function
// returns something that does not depend on it.
const discarder = () => ({
  rel: "commands/discard.mjs",
  code: [
    "import { roundsAllowedFromConfig } from \"../fixture-bounds.mjs\";",
    "export function drive(workspace) {",
    "  const allowed = roundsAllowedFromConfig(workspace);",
    "  report(allowed);",
    "  return \"go\";",
    "}",
    "",
  ].join("\n"),
});

// Composed into a policy object several decisions read — none of which reads THIS field.
const composer = () => ({
  rel: "commands/compose.mjs",
  code: [
    "import { roundsAllowedFromConfig } from \"../fixture-bounds.mjs\";",
    "export function build(workspace) {",
    "  const policy = { roundsAllowed: roundsAllowedFromConfig(workspace), limit: 3 };",
    "  return policy;",
    "}",
    "export function decide(policy, taken) {",
    "  if (taken >= policy.limit) return \"stop\";",
    "  return policy.limit > 0 ? \"go\" : \"stop\";",
    "}",
    "",
  ].join("\n"),
});

const diagnosticOnly = () => ({
  rel: "commands/diagnose.mjs",
  code: [
    "export function fail() {",
    "  throw new Error(\"work.fixture.roundsAllowed is unset — call roundsAllowedFromConfig(workspace)\");",
    "}",
    "",
  ].join("\n"),
});

// A shipped ASSET that would be a consumer if it were running code. It is not: `src/bundle/**`
// is what gets installed into a project, and an asset naming a bound is not the program.
const shippedAsset = () => ({
  rel: "bundle/hooks/guard.mjs",
  code: [
    "import { roundsAllowedFromConfig } from \"../../fixture-bounds.mjs\";",
    "export function guard(workspace, taken) {",
    "  const allowed = roundsAllowedFromConfig(workspace);",
    "  if (taken >= allowed) return \"stop\";",
    "  return \"go\";",
    "}",
    "",
  ].join("\n"),
});

// ── A REGISTRY DECLARATION, IN THE SHAPE `loadLoops` PRODUCES ────────────────────────────
const endpoint = (key) => ({ raw: `config:${key}`, scheme: "config", operand: key, resolved: null });
const declaration = (keys, { nodeId = "arbiter:fixture-trade-off" } = {}) => ({
  nodes: [
    {
      id: "loop:fixture-build",
      kind: "loop",
      path: ".aof/loops/fixture-build.md",
      fields: { ceiling: keys.map((key) => ({ kind: "pointer", pointer: { scheme: "config", operand: key } })) },
      edges: {},
    },
    {
      id: nodeId,
      kind: "arbiter",
      path: ".aof/loops/fixture-trade-off.md",
      fields: {},
      edges: keys.length > 0 ? { [TUNING_EDGE]: keys.map(endpoint) } : {},
    },
  ],
});

// The harness in each of its declared shapes. `prose` is what the harness of record really
// is today: a policy stated in a sentence, with no configuration key in it.
const prose = () => ({
  kind: HARNESS_KINDS.prompt,
  document: "src/bundle/commands/continue.md",
  text: "Review runs once by default. Three rounds is the hard cap; never start a fourth round.\n",
});
const namesTheKey = (key = KEY) => ({
  ...prose(),
  text: `${prose().text}Read \`${key}\` and stop when the completed rounds reach it.\n`,
});
const readableCodePath = () => ({ kind: HARNESS_KINDS.code, document: "src/commands/loop.mjs" });
const unreadable = () => ({ kind: HARNESS_KINDS.prompt, document: "src/bundle/commands/continue.md", text: null });

// The context the outline rows share: the knob IS declared tunable and the harness is one
// whose decisions can be read, so the only thing that varies is what the program does.
const decidableContext = (units) => ({
  model: declaration([KEY]),
  units,
  harness: readableCodePath(),
});

// ── THE REAL TREE, READ ONCE ─────────────────────────────────────────────────────────────
let realFixture = null;
async function repository() {
  if (realFixture == null) {
    const files = await readSrcFiles(root);
    const units = await Promise.all(files.map(async (file) => ({
      rel: file.rel,
      code: await readFile(file.path, "utf8"),
    })));
    const model = await loadLoops(path.join(root, "src", "bundle"));
    const harness = {
      ...HARNESS_OF_RECORD,
      text: await readFile(path.join(root, ...HARNESS_OF_RECORD.document.split("/")), "utf8"),
    };
    realFixture = { units, model, harness };
  }
  return realFixture;
}

const refusalFor = (proposal, code) => proposal.refusals.find((refusal) => refusal.code === code) ?? null;

export const acceptorAdmissibilityTests = [
  // ── FEATURE 00 — what the program does with a bound decides the verdict ────────────────
  {
    name: "61/03 task 00 — outline row: a bound the program never resolves anywhere is refused, naming the bound",
    run: () => {
      const proposal = assessProposal({ key: KEY }, decidableContext([declaringHome(), unrelated()]));
      assert.equal(proposal.admitted, false);
      assert.deepEqual(proposal.codes, [NOT_ADMISSIBLE]);
      assert.equal(refusalFor(proposal, NOT_ADMISSIBLE).key, KEY);
      assert.match(refusalFor(proposal, NOT_ADMISSIBLE).message, new RegExp(KEY.replaceAll(".", "\\."), "u"));
    },
  },
  {
    name: "61/03 task 00 — outline row: a bound resolved only inside the module that declares it is refused",
    run: () => {
      // The home resolves it AND decides with it — `selfCheck` compares the resolved value.
      // A declaration is not its own caller, so the verdict is unchanged.
      const units = [declaringHome(), unrelated()];
      const report = consumptionReport(KEY, units);
      assert.equal(report.declaringHome, HOME, "the declaring home is derived from the tree");
      assert.deepEqual([...report.consumers], []);
      const proposal = assessProposal({ key: KEY }, decidableContext(units));
      assert.equal(proposal.admitted, false);
      assert.deepEqual(proposal.codes, [NOT_ADMISSIBLE]);
    },
  },
  {
    name: "61/03 task 00 — outline row: a bound resolved on a path that runs and then discarded is refused",
    run: () => {
      const units = [declaringHome(), discarder()];
      const report = consumptionReport(KEY, units);
      assert.deepEqual(report.sites.map((site) => site.disposition), [DISPOSITIONS.discarded]);
      assert.equal(assessProposal({ key: KEY }, decidableContext(units)).admitted, false);
    },
  },
  {
    name: "61/03 task 00 — outline row: a bound composed into a policy nothing reads it back out of is refused",
    run: () => {
      const units = [declaringHome(), composer()];
      const report = consumptionReport(KEY, units);
      assert.deepEqual(report.sites.map((site) => site.disposition), [DISPOSITIONS.composed]);
      assert.equal(assessProposal({ key: KEY }, decidableContext(units)).admitted, false);
    },
  },
  {
    name: "61/03 task 00 — outline row: a bound named only inside a diagnostic message it prints is refused",
    run: () => {
      const units = [declaringHome(), diagnosticOnly()];
      const report = consumptionReport(KEY, units);
      assert.deepEqual([...report.sites], [], "a quoted key is a diagnostic, not a read");
      assert.equal(assessProposal({ key: KEY }, decidableContext(units)).admitted, false);
    },
  },
  {
    name: "61/03 task 00 — outline row: a bound named only in a shipped asset rather than in running code is refused",
    run: () => {
      const units = [declaringHome(), shippedAsset()];
      const report = consumptionReport(KEY, units);
      assert.deepEqual([...report.sites], [], "an asset that names a bound is not the program acting on it");
      assert.equal(assessProposal({ key: KEY }, decidableContext(units)).admitted, false);
      // NON-VACUITY: the same body IS a consumer when it is running code rather than an asset.
      const asProduction = [declaringHome(), { ...shippedAsset(), rel: "commands/guard.mjs" }];
      assert.equal(consumptionReport(KEY, asProduction).consumed, true);
    },
  },
  {
    name: "61/03 task 00 — outline row: a bound whose resolved value decides something it governs is admitted for consideration",
    run: () => {
      const units = [declaringHome(), consumer()];
      const report = consumptionReport(KEY, units);
      assert.deepEqual(report.consumers.map((site) => site.rel), ["commands/drive.mjs"]);
      const proposal = assessProposal({ key: KEY }, decidableContext(units));
      assert.equal(proposal.admitted, true);
      assert.deepEqual(proposal.codes, []);
      assert.equal(proposal.considered, true);
    },
  },
  {
    name: "61/03 task 00 — a refused proposal costs no evidence at all",
    run: () => {
      // The context carries everything a priced trial would need, behind GETTERS that record
      // being touched. A refusal that read one of them would be a refusal that cost evidence.
      const touched = [];
      const context = decidableContext([declaringHome(), discarder()]);
      for (const name of ["observations", "evidence", "ledger", "priceTrial", "basket"]) {
        Object.defineProperty(context, name, {
          enumerable: true,
          get() { touched.push(name); return {}; },
        });
      }
      const proposal = assessProposal({ key: KEY }, context);
      assert.equal(proposal.admitted, false);
      assert.deepEqual(touched, [], "nothing observation-shaped was read to reach the refusal");
      assert.equal(proposal.evidenceRead, false);
      assert.equal(proposal.trialPriced, false);
      assert.equal(proposal.accruesTowardsCommit, false);
    },
  },
  {
    name: "61/03 task 00 — the refusal names the bound, the record that declares it a ceiling, and tells resolution apart from consumption",
    run: () => {
      const proposal = assessProposal({ key: KEY }, decidableContext([declaringHome(), discarder()]));
      const refusal = refusalFor(proposal, NOT_ADMISSIBLE);
      assert.equal(refusal.key, KEY);
      assert.deepEqual([...refusal.records], ["loop:fixture-build"], "the ceiling record is named from the registry");
      assert.match(refusal.message, /loop:fixture-build/u);
      assert.match(refusal.message, /RESOLVES/u);
      assert.match(refusal.message, /Resolution is not consumption/u);
      assert.match(refusal.message, /a pointer that resolves is a declaration, not a caller/u);
    },
  },
  {
    name: "61/03 task 00 — the module that declares a bound is not accepted as its own consumer",
    run: () => {
      const units = [declaringHome(), unrelated()];
      const report = consumptionReport(KEY, units);
      assert.equal(report.consumed, false);
      assert.equal(report.consumers.some((site) => site.rel === HOME), false);
      assert.equal(report.sites.some((site) => site.rel === HOME), false);
      assert.equal(report.resolvedIn.includes(HOME), false);
      assert.equal(assessProposal({ key: KEY }, decidableContext(units)).admitted, false);
    },
  },
  {
    name: "61/03 task 00 — composing a value into a policy is not consuming it, and the composing site is not a consumer",
    run: () => {
      const units = [declaringHome(), composer()];
      const report = consumptionReport(KEY, units);
      // The policy object IS read by decisions — just never for this bound's field.
      assert.match(composer().code, /policy\.limit/u);
      assert.deepEqual(report.consumers.map((site) => site.rel), []);
      assert.deepEqual(report.sites.map((site) => `${site.rel}:${site.disposition}`), [
        `commands/compose.mjs:${DISPOSITIONS.composed}`,
      ]);
      assert.equal(assessProposal({ key: KEY }, decidableContext(units)).admitted, false);
    },
  },
  {
    name: "61/03 task 00 — every knob the registry declares tunable is refused today, and the count is reported",
    run: async () => {
      const { units, model, harness } = await repository();
      const report = assessTunableSet({ model, units, harness });
      assert.ok(report.considered >= 3, `the shipped registry declared knobs to consider: ${report.considered}`);
      assert.equal(report.admittedCount, 0);
      assert.equal(report.refusedCount, report.considered);
      for (const proposal of report.proposals) {
        assert.ok(
          proposal.codes.includes(NOT_ADMISSIBLE),
          `${proposal.key}: refused for want of an executed consumer (${proposal.codes.join(", ")})`,
        );
      }
      // A COUNT, not an absence of findings.
      assert.ok(report.refusals.length >= report.considered);
      assert.equal(report.ranOnNothing, false);
    },
  },
  {
    name: "61/03 task 00 — the assessment reports how many bounds it considered, and one that considered none says it ran on nothing",
    run: async () => {
      const { units, model, harness } = await repository();
      const declared = tunableSet(model);
      assert.equal(assessTunableSet({ model, units, harness }).considered, declared.keys.length);

      const empty = assessTunableSet({ model: declaration([]), units, harness });
      assert.equal(empty.considered, 0);
      assert.equal(empty.ranOnNothing, true);
      assert.equal(empty.notice.code, ADMISSIBILITY_RAN_ON_NOTHING);
      assert.match(empty.notice.message, /ran on nothing/u);
      assert.equal(empty.refusedCount, 0, "running on nothing is not the same as refusing something");
    },
  },
  {
    name: "61/03 task 00 — a knob declared tunable later is judged by the same rule, with no case added for it by name",
    run: async () => {
      const units = [declaringHome(), discarder()];
      const context = { model: declaration([KEY, OTHER_KEY]), units, harness: readableCodePath() };
      const first = assessProposal({ key: KEY }, context);
      const second = assessProposal({ key: OTHER_KEY }, context);
      assert.deepEqual(second.codes, first.codes, "the newly declared knob is refused by the same rule");
      assert.equal(refusalFor(second, NOT_ADMISSIBLE).key, OTHER_KEY);

      // AND THE RULE HAS NO CASES IN IT: the module names no knob, in code, in a string or
      // in a comment. There is nothing in it to add a case to.
      const source = await readFile(path.join(root, "src", "work-acceptor", "admissibility.mjs"), "utf8");
      for (const key of [KEY, OTHER_KEY, "work.loop", "work.autonomous"]) {
        assert.equal(source.includes(key), false, `the acceptor spells no knob key: ${key}`);
      }
    },
  },

  // ── FEATURE 01 — fail-closed while the harness is a prompt ─────────────────────────────
  {
    name: "61/03 task 01 — outline row: a prompt stating its policy in prose and naming no config key refuses the proposal",
    run: () => {
      const refusal = harnessRefusal(KEY, prose());
      assert.equal(refusal.code, HARNESS_NOT_INTROSPECTABLE);
      assert.equal(refusal.condition, HARNESS_CONDITIONS.namesNoKey);
      const proposal = assessProposal({ key: KEY }, {
        model: declaration([KEY]),
        units: [declaringHome(), consumer()],
        harness: prose(),
      });
      assert.equal(proposal.admitted, false);
      assert.deepEqual(proposal.codes, [HARNESS_NOT_INTROSPECTABLE]);
    },
  },
  {
    name: "61/03 task 01 — outline row: a prompt that names the knob's configuration key does not apply",
    run: () => {
      assert.equal(harnessRefusal(KEY, namesTheKey()), null);
      const proposal = assessProposal({ key: KEY }, {
        model: declaration([KEY]),
        units: [declaringHome(), consumer()],
        harness: namesTheKey(),
      });
      assert.equal(proposal.admitted, true, "with a consumer and an introspectable harness, nothing refuses it");
    },
  },
  {
    name: "61/03 task 01 — outline row: a path whose decisions can be read without a prompt does not apply",
    run: () => {
      assert.equal(harnessRefusal(KEY, readableCodePath()), null);
    },
  },
  {
    name: "61/03 task 01 — outline row: a document that is declared but cannot be read refuses the proposal",
    run: () => {
      const refusal = harnessRefusal(KEY, unreadable());
      assert.equal(refusal.code, HARNESS_NOT_INTROSPECTABLE);
      assert.equal(refusal.condition, HARNESS_CONDITIONS.unreadable);
      assert.equal(refusal.harness, unreadable().document, "the report names the document it could not read");
    },
  },
  {
    name: "61/03 task 01 — outline row: a harness not declared at all refuses the proposal",
    run: () => {
      for (const undeclared of [undefined, null]) {
        const refusal = harnessRefusal(KEY, undeclared);
        assert.equal(refusal.code, HARNESS_NOT_INTROSPECTABLE);
        assert.equal(refusal.condition, HARNESS_CONDITIONS.undeclared);
      }
      const proposal = assessProposal({ key: KEY }, {
        model: declaration([KEY]),
        units: [declaringHome(), consumer()],
      });
      assert.deepEqual(proposal.codes, [HARNESS_NOT_INTROSPECTABLE]);
    },
  },
  {
    name: "61/03 task 01 — while the ground applies it refuses every proposal alike, for no reason particular to any knob",
    run: () => {
      const keys = [KEY, OTHER_KEY, "work.fixture.pausesAllowed"];
      const context = {
        model: declaration(keys),
        // One knob HAS a consumer and the others do not: the fall-back refuses all three
        // regardless, which is what makes it a switch rather than a judgement.
        units: [declaringHome(), consumer()],
        harness: prose(),
      };
      const report = assessTunableSet(context);
      assert.equal(report.considered, 3);
      assert.equal(report.refusedCount, 3);
      const grounds = report.proposals.map((proposal) => refusalFor(proposal, HARNESS_NOT_INTROSPECTABLE));
      assert.equal(grounds.every(Boolean), true, "every one of them is refused on this ground");
      assert.equal(new Set(grounds.map((refusal) => refusal.message)).size, 1, "one reason, not one per knob");
      assert.equal(new Set(grounds.map((refusal) => refusal.condition)).size, 1);
      assert.equal(new Set(grounds.map((refusal) => refusal.harness)).size, 1);
    },
  },
  {
    name: "61/03 task 01 — evidence does not outvote a fail-closed refusal",
    run: () => {
      const context = {
        model: declaration([KEY]),
        units: [declaringHome(), consumer()],
        harness: prose(),
      };
      const bare = assessProposal({ key: KEY }, context);
      const withEvidence = assessProposal({ key: KEY }, {
        ...context,
        // Enough discordant pairs to cross any threshold this milestone could declare.
        evidence: { wins: 40, losses: 0, ties: 0, eValue: 1e9 },
      });
      assert.equal(bare.admitted, false);
      assert.equal(withEvidence.admitted, false);
      assert.deepEqual(withEvidence, bare, "the evidence changed nothing about the outcome");
    },
  },
  {
    name: "61/03 task 01 — the report names the ground it fell back on, and it is distinguishable from a want of consumer",
    run: () => {
      const refusal = harnessRefusal(KEY, prose());
      assert.equal(refusal.harness, prose().document, "it names the harness of record it consulted");
      assert.equal(refusal.fallback, true, "…as a fall-back rather than a finding about this knob");
      assert.equal(refusal.discriminating, false);
      assert.match(refusal.message, /switch that applies to every proposal alike, not a finding about this knob/u);
      assert.notEqual(refusal.code, NOT_ADMISSIBLE);
      assert.equal(REFUSAL_ORDER.includes(refusal.code) && REFUSAL_ORDER.includes(NOT_ADMISSIBLE), true);
    },
  },
  {
    name: "61/03 task 01 — a proposal failing on both grounds is told both, and closing either one still leaves it refused",
    run: () => {
      const model = declaration([KEY]);
      const both = assessProposal({ key: KEY }, { model, units: [declaringHome(), discarder()], harness: prose() });
      assert.deepEqual(both.codes, [NOT_ADMISSIBLE, HARNESS_NOT_INTROSPECTABLE]);

      const harnessClosed = assessProposal({ key: KEY }, {
        model,
        units: [declaringHome(), discarder()],
        harness: namesTheKey(),
      });
      assert.equal(harnessClosed.admitted, false);
      assert.deepEqual(harnessClosed.codes, [NOT_ADMISSIBLE]);

      const consumerClosed = assessProposal({ key: KEY }, {
        model,
        units: [declaringHome(), consumer()],
        harness: prose(),
      });
      assert.equal(consumerClosed.admitted, false);
      assert.deepEqual(consumerClosed.codes, [HARNESS_NOT_INTROSPECTABLE]);
    },
  },
  {
    name: "61/03 task 01 — naming the key in the harness re-opens the question with nothing else edited",
    run: () => {
      const model = declaration([KEY]);
      const units = [declaringHome(), discarder()];
      const before = assessProposal({ key: KEY }, { model, units, harness: prose() });
      assert.deepEqual(before.codes, [NOT_ADMISSIBLE, HARNESS_NOT_INTROSPECTABLE]);

      // ONLY the harness document changes — the same model object, the same units array.
      const after = assessProposal({ key: KEY }, { model, units, harness: namesTheKey() });
      assert.equal(refusalFor(after, HARNESS_NOT_INTROSPECTABLE), null, "the undecidable ground no longer refuses it");
      assert.deepEqual(after.codes, [NOT_ADMISSIBLE], "…and it is judged on whether the knob has an executed consumer");
      assert.equal(after.judgedOnItsOwnMerits, true);
      assert.equal(prose().document, namesTheKey().document, "the document that changed is the harness, and only its text");
      assert.deepEqual(
        assessProposal({ key: KEY }, { model, units: [declaringHome(), consumer()], harness: namesTheKey() }).codes,
        [],
        "with the harness readable, the consumer question is the only one left to answer",
      );
    },
  },
  {
    name: "61/03 task 01 — the surface does not dress a switch as a discriminating control",
    run: () => {
      const report = assessTunableSet({
        model: declaration([KEY, OTHER_KEY]),
        units: [declaringHome(), consumer()],
        harness: prose(),
      });
      assert.equal(report.refusedCount, 2, "the fall-back is refusing every proposal");
      assert.equal(report.fallback.applied, true);
      assert.equal(report.fallback.appliedToEveryProposal, true);
      assert.equal(report.fallback.discriminating, false);
      assert.match(report.fallback.statement, /applied to every one of the 2 proposal\(s\) alike/u);
      assert.match(report.fallback.statement, /no knob here was judged on its own merits/u);
      for (const proposal of report.proposals) assert.equal(proposal.judgedOnItsOwnMerits, false);
    },
  },

  // ── FEATURE 02 — the tunable set is the registry's ─────────────────────────────────────
  {
    name: "61/03 task 02 — outline row: a key the registry declares tunable is considered, and judged on the other grounds",
    run: async () => {
      const { units, model, harness } = await repository();
      const key = tunableSet(model).keys[0];
      const proposal = assessProposal({ key }, { model, units, harness });
      assert.equal(proposal.considered, true);
      assert.equal(proposal.codes.includes(KEY_OUTSIDE_DECLARED_SET), false);

      // JUDGED ON THE OTHER GROUNDS — which is the row's criterion, and is NOT the same claim as
      // "carries both of them today". The literal `[NOT_ADMISSIBLE, HARNESS_NOT_INTROSPECTABLE]`
      // this row used to assert was a snapshot of a tree where `continue.md` named no config key,
      // and milestone 71/00 (FF-7101) ended that: the prompt now states each round bound beside
      // its own key, so the harness ground has lifted for the keys it names and this key carries
      // one ground rather than two. The lift is the acceptor working — the same event
      // `acd-progress-ledger-consumed`'s FF-6109 leg was written to anticipate — so the row is
      // stated against the RULE instead, and no longer re-reddens the day the prompt names another
      // key. Both grounds are still exercised in full by feature 01's own scenarios.
      assert.equal(proposal.admitted, false);
      assert.deepEqual(
        proposal.codes.filter((code) => code !== NOT_ADMISSIBLE && code !== HARNESS_NOT_INTROSPECTABLE),
        [],
        "every ground it is judged on is one of the other two — membership is not among them",
      );
      assert.equal(proposal.codes.includes(NOT_ADMISSIBLE), true, "want of an executed consumer, which this tree still fails for every declared knob");

      // …and the harness ground applies exactly when the harness of record does not name the key.
      // Read off the document's own TEXT rather than from `harnessRefusal`, so this is a check on
      // the verdict rather than the verdict agreeing with itself.
      const namedInHarness = new RegExp(`(?<![\\w.$-])${key.replaceAll(".", "\\.")}(?![\\w.])`, "u").test(harness.text);
      assert.equal(
        proposal.codes.includes(HARNESS_NOT_INTROSPECTABLE),
        !namedInHarness,
        `${key}: the fail-closed ground applies iff ${HARNESS_OF_RECORD.document} names no such key`,
      );
    },
  },
  {
    name: "61/03 task 02 — outline row: a real bound that no record declares tunable is refused as outside the declared set",
    run: async () => {
      const { units, model, harness } = await repository();
      // A bound that really exists in this repository, deliberately NOT claimed by the
      // arbiter record — which is the registry's decision, and not this machinery's.
      const key = "work.loop.progressMaxResets";
      assert.equal(tunableSet(model).keys.includes(key), false);
      const proposal = assessProposal({ key }, { model, units, harness });
      assert.deepEqual(proposal.codes, [KEY_OUTSIDE_DECLARED_SET]);
      assert.equal(proposal.considered, false);
    },
  },
  {
    name: "61/03 task 02 — outline row: a key that names no bound at all is refused as outside the declared set",
    run: async () => {
      const { units, model, harness } = await repository();
      const proposal = assessProposal({ key: "work.nothing.atAll" }, { model, units, harness });
      assert.deepEqual(proposal.codes, [KEY_OUTSIDE_DECLARED_SET]);
    },
  },
  {
    name: "61/03 task 02 — outline row: a declared key differing only in case or surrounding space is refused as outside the declared set",
    run: async () => {
      const { units, model, harness } = await repository();
      const declared = tunableSet(model).keys[0];
      for (const near of [declared.toUpperCase(), declared.toLowerCase(), ` ${declared}`, `${declared} `]) {
        if (near === declared) continue;
        assert.deepEqual(
          assessProposal({ key: near }, { model, units, harness }).codes,
          [KEY_OUTSIDE_DECLARED_SET],
          `${JSON.stringify(near)} is not ${JSON.stringify(declared)}`,
        );
      }
    },
  },
  {
    name: "61/03 task 02 — a key added to the declaration becomes proposable with nothing else edited",
    run: () => {
      const units = [declaringHome(), consumer()];
      const harness = readableCodePath();
      const before = assessProposal({ key: OTHER_KEY }, { model: declaration([KEY]), units, harness });
      assert.deepEqual(before.codes, [KEY_OUTSIDE_DECLARED_SET]);

      const after = assessProposal({ key: OTHER_KEY }, { model: declaration([KEY, OTHER_KEY]), units, harness });
      assert.equal(after.codes.includes(KEY_OUTSIDE_DECLARED_SET), false);
      assert.equal(after.considered, true);
    },
  },
  {
    name: "61/03 task 02 — a key dropped from the declaration stops being proposable",
    run: () => {
      const units = [declaringHome(), consumer()];
      const harness = readableCodePath();
      assert.equal(assessProposal({ key: KEY }, { model: declaration([KEY]), units, harness }).considered, true);
      assert.deepEqual(
        assessProposal({ key: KEY }, { model: declaration([OTHER_KEY]), units, harness }).codes,
        [KEY_OUTSIDE_DECLARED_SET],
      );
    },
  },
  {
    name: "61/03 task 02 — an empty declaration admits nothing rather than falling back on a built-in set",
    run: () => {
      const model = declaration([]);
      assert.deepEqual([...tunableSet(model).keys], [], "no knob is offered in the declaration's place");
      const units = [declaringHome(), consumer()];
      for (const key of [KEY, OTHER_KEY, "work.loop.reviewRounds"]) {
        assert.deepEqual(
          assessProposal({ key }, { model, units, harness: readableCodePath() }).codes,
          [KEY_OUTSIDE_DECLARED_SET],
          `${key} is refused with an empty declaration`,
        );
      }
      const report = assessTunableSet({ model, units, harness: readableCodePath() });
      assert.equal(report.admittedCount, 0);
      assert.equal(report.considered, 0);
    },
  },
  {
    name: "61/03 task 02 — what may be proposed and what the registry declares are the same set",
    run: async () => {
      const { model } = await repository();
      // Read the declaration a second way — straight off the nodes' edges — and require the
      // two to agree. The set the acceptor offers cannot be larger, smaller or reordered.
      const declaredOnRecords = model.nodes
        .flatMap((node) => (node.edges?.[TUNING_EDGE] ?? []))
        .filter((entry) => entry.scheme === "config")
        .map((entry) => entry.operand);
      const proposable = tunableSet(model).keys;
      assert.deepEqual([...proposable], declaredOnRecords);
      assert.ok(proposable.length >= 3, `the shipped declaration is non-vacuous: ${proposable.length}`);
      for (const key of ["work.loop.progressMaxResets", "work.rubric.report.floor", "mesh.presence.stalenessSeconds"]) {
        assert.equal(proposable.includes(key), false, `${key} is not proposable — no record declares it tunable`);
      }
    },
  },
  {
    name: "61/03 task 02 — the refusal names the key and the declaration it is absent from, and is distinguishable from a want of consumer",
    run: async () => {
      const { units, model, harness } = await repository();
      const proposal = assessProposal({ key: "work.nothing.atAll" }, { model, units, harness });
      const refusal = refusalFor(proposal, KEY_OUTSIDE_DECLARED_SET);
      assert.match(refusal.message, /work\.nothing\.atAll/u, "it names the key that was proposed");
      assert.equal(refusal.edge, TUNING_EDGE);
      assert.deepEqual([...refusal.declaredBy], [...tunableSet(model).declaredBy]);
      for (const nodeId of refusal.declaredBy) {
        assert.ok(refusal.message.includes(nodeId), `the refusal names the declaration it consulted: ${nodeId}`);
      }
      assert.notEqual(refusal.code, NOT_ADMISSIBLE);
      assert.equal(refusal.fallback, false);
    },
  },
  {
    name: "61/03 task 02 — a key quoted in a refusal is a diagnostic, not a claim of membership",
    run: async () => {
      const { units, model, harness } = await repository();
      const quoted = "work.nothing.atAll";
      const refusal = refusalFor(assessProposal({ key: quoted }, { model, units, harness }), KEY_OUTSIDE_DECLARED_SET);
      assert.match(refusal.message, /work\.nothing\.atAll/u);
      const after = tunableSet(model);
      assert.equal(after.keys.includes(quoted), false, "the quoted key is not a member");
      assert.deepEqual([...after.keys], [...tunableSet(model).keys], "the set is still exactly what the registry declares");
    },
  },
  {
    name: "61/03 task 02 — consulting the declaration asks nothing new of the registry",
    run: async () => {
      const { model } = await repository();
      // The edge is the loader's OWN vocabulary, admitted on the kind that declares it, and
      // the endpoints are the loader's own pointer shape. Nothing here is a new field, a new
      // key or a new scheme — the record is read exactly as it was already written.
      assert.equal(EDGE_KEYS.has(TUNING_EDGE), true, "the edge consulted is existing loop-record vocabulary");
      assert.equal(ADMITTED_KEYS.arbiter.has(TUNING_EDGE), true, "…admitted on the kind that declares it");
      const declaring = model.nodes.filter((node) => (node.edges?.[TUNING_EDGE] ?? []).length > 0);
      assert.ok(declaring.length > 0, "the shipped registry really declares one");
      for (const node of declaring) {
        for (const entry of node.edges[TUNING_EDGE]) {
          assert.equal(ENDPOINT_SCHEMES.has(entry.scheme), true, `${entry.raw}: an existing endpoint scheme`);
          assert.deepEqual(Object.keys(entry).sort(), ["operand", "raw", "resolved", "scheme"], `${entry.raw}: the loader's own endpoint shape`);
        }
      }
      // AND THE LOADER READ THE RECORD CLEANLY: an unknown key or an unadmitted one would
      // mean the consultation had asked for something the vocabulary does not carry.
      const paths = new Set(declaring.map((node) => node.path));
      const complaints = model.findings.filter((finding) => paths.has(finding.path)
        && ["loop-unknown-key", "loop-key-not-admitted-for-kind", "loop-bad-value"].includes(finding.code));
      assert.deepEqual(complaints, []);
    },
  },
];
