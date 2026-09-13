// work:acceptor — THE DISCIPLINED ACCEPTOR'S REPORTING FACE (milestone 61 / story 06).
//
// The command composes the acceptor's leaves and renders their answer. It does not invent
// proposals, recount a population, or move a value unless an operator names an eligible
// proposal with `--commit`. A bare invocation is permanently report-only and exits on
// whether the command could run, never on whether every proposal was refused.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 61 / story 06 — work:acceptor, the report-only face over the criterion,
//   census, admissibility, rule and ledger. A bare run never commits; --commit names the
//   explicit exception. No strict flag: refusals are the command's honest steady state.
import path from "node:path";
import os from "node:os";
import { copyFile, mkdtemp, readdir, readFile, rm } from "node:fs/promises";

import { loadLoops } from "../work/loops.mjs";
import * as workCounters from "../work/counters.mjs";
import {
  HARNESS_OF_RECORD,
  KEY_OUTSIDE_DECLARED_SET,
  NOT_ADMISSIBLE,
  assessProposal,
  tunableSet,
} from "../work-acceptor/admissibility.mjs";
import {
  criterionDigest,
  readCriterion,
  rulingsUnderCurrentCriterion,
} from "../work-acceptor/criterion.mjs";
import {
  BUDGET_EXHAUSTED,
  EVIDENCE_SHORT,
  VERDICTS,
  evaluateRun,
} from "../work-acceptor/ledger.mjs";
import { readObservationCensus } from "../work-acceptor/observations.mjs";
import {
  METRIC_UNMEASURABLE,
  NOT_AN_ORDINAL_KNOB,
  NO_STEP_PROPOSED,
  TRIAL_UNAFFORDABLE,
  TRIAL_UNIT_UNDECLARED,
  deriveMetricRegistry,
  deriveRule,
  knobReport,
  makeTrial,
  metricPopulation,
  readStep,
} from "../work-acceptor/rule.mjs";
import {
  STEP_WOULD_BE_COMPOUND,
  compoundStepRefusal,
  rangeProbe,
} from "../loop-bounds.mjs";
import { effectsJournalPath, openEffectsJournal } from "../effects/journal.mjs";
import { readHarnessRulings, transitionHarnessRuled } from "../effects/harness-transitions.mjs";

export const YIELD_BOUND = "yield-bound";
export const DWELL_UNCOUNTED = "dwell-uncounted";

// The ruling lane is assembled from the constants at their declaring modules. The order
// is the contract: a discovery order is not stable enough to diff (ADR-013 §2).
export const RULING_REFUSAL_ORDER = Object.freeze([
  NOT_ADMISSIBLE,
  METRIC_UNMEASURABLE,
  TRIAL_UNAFFORDABLE,
  YIELD_BOUND,
  EVIDENCE_SHORT,
  BUDGET_EXHAUSTED,
  STEP_WOULD_BE_COMPOUND,
  NOT_AN_ORDINAL_KNOB,
]);

export const REFUSAL_REMOVALS = Object.freeze({
  [NOT_ADMISSIBLE]: "a consumer reading the resolved value at a decision site",
  [METRIC_UNMEASURABLE]: "an instrument writing the series its metric reads",
  [TRIAL_UNAFFORDABLE]: "the basket it needs and the budget ceiling it exceeded",
  [YIELD_BOUND]: "the epochs its observed yield needs to reach the floor",
  [EVIDENCE_SHORT]: "the number of rulings still to accrue",
  [BUDGET_EXHAUSTED]: "a fresh proposal, since a budget cannot grow in flight",
  [STEP_WOULD_BE_COMPOUND]: "the key ceasing to resolve to more than one bound, which is another milestone's work",
  [NOT_AN_ORDINAL_KNOB]: "the knob's values gaining an order, which is a redesign of the knob rather than a step on it",
});

const freeze = (values) => Object.freeze(values.map((value) => (
  value != null && typeof value === "object" ? Object.freeze({ ...value }) : value
)));
function orderedCodes(codes) {
  const unique = [...new Set(codes)];
  const unknown = unique.filter((code) => !RULING_REFUSAL_ORDER.includes(code));
  if (unknown.length > 0) {
    const error = new Error(`Refusing to render unknown ruling refusal(s): ${unknown.join(", ")}.`);
    error.code = "ruling-refusal-unknown";
    error.refusals = Object.freeze(unknown);
    throw error;
  }
  return Object.freeze(unique.sort((a, b) => RULING_REFUSAL_ORDER.indexOf(a) - RULING_REFUSAL_ORDER.indexOf(b)));
}

function refusalRecords(codes, details = {}) {
  return freeze(codes.map((code) => ({
    code,
    removal: REFUSAL_REMOVALS[code],
    ...(details[code] == null ? {} : { detail: details[code] }),
  })));
}

function construction(code, message, detail = {}) {
  return Object.freeze({ code, message, ...detail });
}

function valueAt(config, key) {
  const segments = typeof key === "string" ? key.split(".").filter(Boolean) : [];
  let cursor = config;
  for (const segment of segments) {
    if (cursor == null || typeof cursor !== "object") return null;
    cursor = cursor[segment];
  }
  return cursor === undefined ? null : cursor;
}

function declaredKnob(key, criterion, config, proposal = null) {
  const declared = criterion?.tunables?.[key];
  const metadata = declared != null && typeof declared === "object" && !Array.isArray(declared)
    ? declared
    : {};
  const current = valueAt(config, key);
  const knob = {
    ...metadata,
    ...(proposal ?? {}),
    key,
    current,
  };
  if (proposal != null) knob.from = proposal.from ?? current;
  return knob;
}

// THE EVIDENCE IS THE LEDGER'S, AND THE PROPOSAL SUPPLIES NONE OF IT (ADR-005 §1a).
// The face renders the lanes; a proposal that could hand in its own pair sequence would be
// a second source of evidence reaching the commit predicate, and it would arrive having
// skipped the digest suffix `rulingsUnderCurrentCriterion` applies — which is exactly the
// enforcement point ADR-005 says cannot be routed around. `input.proposals` is caller
// input; the ledger is read at the composition root. A proposal names a KEY and a STEP,
// and nothing about how much evidence stands behind it.
function evidenceFor(proposal, records, criterion, rule) {
  const matching = records.filter((record) => record?.key === proposal.key);
  const current = rulingsUnderCurrentCriterion(matching, criterionDigest(criterion));
  const sequence = current.flatMap((record) => Array.isArray(record?.ledger)
    ? record.ledger
    : Array.isArray(record?.ledger?.sequence) ? record.ledger.sequence : []);
  return evaluateRun(sequence, rule, { now: proposal.now ?? null });
}

function yieldReading(proposal, evidence, criterion) {
  const observed = proposal?.observedYield;
  if (typeof observed !== "number" || !Number.isFinite(observed) || observed >= 1) return null;
  const remaining = Math.max(0, criterion.N - evidence.pairs);
  return Object.freeze({
    observedPairsPerEpoch: Math.max(0, observed),
    epochsToFloor: observed <= 0 ? null : Math.ceil(remaining / observed),
    reachableAtObservedYield: observed > 0,
  });
}

function reportOne({ proposal, criterion, rule, model, units, harness, records, config, bounds, metricRegistry }) {
  const key = proposal.key;
  const knob = declaredKnob(key, criterion, config, proposal.proposed === true ? proposal : null);
  const rulingCodes = [];
  const details = {};
  const constructionRefusals = [];

  const admissibility = assessProposal({ key }, { model, units, harness });
  if (!admissibility.considered) {
    const refusal = admissibility.refusals.find((entry) => entry.code === KEY_OUTSIDE_DECLARED_SET);
    constructionRefusals.push(construction(refusal.code, refusal.message, { detail: refusal }));
  }

  let step = null;
  if (admissibility.considered && proposal.proposed === true) {
    if (proposal.to === undefined && (!Array.isArray(proposal.moves) || proposal.moves.length === 0)) {
      constructionRefusals.push(construction(NO_STEP_PROPOSED, "The proposal names no step, so no ruling can be constructed."));
    } else {
      step = readStep(proposal, { bounds });
      if (step.code != null && ![STEP_WOULD_BE_COMPOUND, NOT_AN_ORDINAL_KNOB].includes(step.code)) {
        constructionRefusals.push(construction(step.code, step.message, { detail: step }));
      }
    }
  }

  const knobState = admissibility.considered
    ? knobReport(knob, { bounds, criterion })
    : Object.freeze({ basket: null, refusals: Object.freeze([]), awaitingEvidence: false });
  if (knobState.basket?.refusal === TRIAL_UNIT_UNDECLARED) {
    constructionRefusals.push(construction(TRIAL_UNIT_UNDECLARED, knobState.basket.message, { basket: knobState.basket }));
  }

  let metric = null;
  if (admissibility.considered) {
    try {
      metric = metricPopulation(makeTrial({ criterion, registry: metricRegistry }), proposal.arms ?? []);
    } catch (error) {
      constructionRefusals.push(construction(error.code ?? "trial-construction-failed", error.message, { part: error.part ?? null }));
    }
  }

  let evidence = null;
  let yieldState = null;
  if (constructionRefusals.length === 0) {
    if (!admissibility.admitted) {
      rulingCodes.push(NOT_ADMISSIBLE);
      details[NOT_ADMISSIBLE] = Object.freeze({ grounds: admissibility.refusals });
    }
    if ([STEP_WOULD_BE_COMPOUND, NOT_AN_ORDINAL_KNOB].includes(step?.code)) rulingCodes.push(step.code);
    const compound = compoundStepRefusal(proposal);
    if (compound != null) rulingCodes.push(compound.code);
    if (knobState.refusals.includes(NOT_AN_ORDINAL_KNOB)) rulingCodes.push(NOT_AN_ORDINAL_KNOB);
    if (knobState.basket?.refusal === TRIAL_UNAFFORDABLE) rulingCodes.push(TRIAL_UNAFFORDABLE);
    if (metric?.refusals?.includes(METRIC_UNMEASURABLE)) rulingCodes.push(METRIC_UNMEASURABLE);

    evidence = evidenceFor(proposal, records, criterion, rule);
    yieldState = yieldReading(proposal, evidence, criterion);
    if (yieldState != null) rulingCodes.push(YIELD_BOUND);
    else if (!evidence.commits) rulingCodes.push(evidence.state);
  }

  const codes = orderedCodes(rulingCodes);
  const range = step?.step?.probe ?? (proposal.to !== undefined ? rangeProbe(key, proposal.to) : null);
  const distance = evidence == null
    ? null
    : yieldState != null
    ? Object.freeze({ unit: "epochs", value: yieldState.epochsToFloor, reachable: yieldState.reachableAtObservedYield })
    : Object.freeze({ unit: "rulings", value: evidence.recoverable ? Math.max(0, criterion.N - evidence.pairs) : null, reachable: evidence.recoverable });
  return Object.freeze({
    key,
    proposal: proposal.proposed === false ? null : Object.freeze({ from: proposal.from ?? knob.from ?? null, to: proposal.to ?? null }),
    range,
    verdict: evidence == null ? "construction-refused" : evidence.commits && codes.length === 0 ? "eligible" : VERDICTS.REPORT_ONLY,
    eligible: evidence?.commits === true && codes.length === 0,
    applied: false,
    evidence: evidence == null ? null : Object.freeze({
      count: evidence.pairs,
      threshold: criterion.N,
      record: evidence.record,
      wealth: evidence.wealth,
      level: evidence.level,
      nextCrossing: evidence.nextCrossing,
      budget: evidence.budget,
      budgetRemaining: evidence.budgetRemaining,
      sequence: evidence.admittedPairs,
    }),
    distance,
    basket: knobState.basket,
    metric,
    admissibility,
    refusals: refusalRecords(codes, details),
    constructionRefusals: freeze(constructionRefusals),
  });
}

/** Pure composition used by the command and by the executable acceptance tests. */
export function buildAcceptorReport({
  proposals = [],
  criterion,
  model,
  units = [],
  harness,
  census,
  ledger = [],
  config = {},
  bounds = { rangeProbe, compoundStepRefusal },
  metricRegistry = deriveMetricRegistry({ "src/work/counters.mjs": workCounters }),
} = {}) {
  const rule = deriveRule(criterion);
  const declared = tunableSet(model).keys;
  const offered = Array.isArray(proposals) ? proposals : [];
  const byKey = new Map(offered.filter((proposal) => typeof proposal?.key === "string").map((proposal) => [proposal.key, proposal]));
  const keys = [...declared, ...offered.map((proposal) => proposal?.key).filter((key) => typeof key === "string" && !declared.includes(key))];
  const rows = keys.map((key) => reportOne({
    proposal: { proposed: byKey.has(key), ...declaredKnob(key, criterion, config, byKey.get(key) ?? null) },
    criterion,
    rule,
    model,
    units,
    harness,
    records: ledger,
    config,
    bounds,
    metricRegistry,
  }));
  const findings = [...(census?.findings ?? []), ...rows.flatMap((row) => row.constructionRefusals.map((finding) => ({ key: row.key, ...finding })))];
  const structurallySilent = rows.length > 0 && rows.every((row) => row.refusals.some((refusal) => refusal.code === YIELD_BOUND));
  return Object.freeze({
    mode: "report-only",
    reportOnly: true,
    commitRequiresExplicitRequest: true,
    threshold: Object.freeze({ count: criterion.N, level: rule.level, budget: criterion.B }),
    vocabulary: RULING_REFUSAL_ORDER,
    census,
    proposals: Object.freeze(rows),
    structurallySilent,
    findings: freeze(findings),
    action: null,
  });
}

// No receiving-loop cycle counter exists. The declaration and the landing epoch can be
// recorded, but converting them into a date or an expiry would invent a unit conversion.
export function reversionDecision(record) {
  return Object.freeze({
    allowed: false,
    code: DWELL_UNCOUNTED,
    key: record?.key ?? null,
    dwell: record?.dwell ?? null,
    dwellFrom: record?.dwellFrom ?? null,
    expiry: null,
    message: "Reversion is refused because no counter exists for cycles of the receiving loop; the declared settling period cannot be shown discharged.",
  });
}

// Harm is a different path. It does not read dwell and restores exactly the value the
// committing ruling says preceded the change.
export function withdrawalOnHarm(record, movement) {
  const degraded = movement?.measured === true && movement?.direction === "worse";
  return Object.freeze({
    withdraw: degraded,
    key: record?.key ?? null,
    to: degraded ? record?.from ?? null : null,
    trigger: degraded ? movement : null,
    consultedDwell: false,
    wait: false,
  });
}

async function sourceUnits(root) {
  const units = [];
  async function walk(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile() && entry.name.endsWith(".mjs")) {
        units.push({ rel: path.relative(root, absolute).replaceAll("\\", "/"), code: await readFile(absolute, "utf8") });
      }
    }
  }
  await walk(path.join(root, "src"));
  return units;
}

// The journal opener owns migrations and therefore opens a write transaction. A report must
// not mutate its evidence source, so the face reads a private snapshot — the same discipline
// Spike 60 used while investigating the live store.
async function censusSnapshot(workspaceRoot, journalOptions = {}) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "aof-acceptor-census-"));
  const snapshot = path.join(temporary, "journal.sqlite");
  const source = effectsJournalPath(journalOptions);
  let journal = null;
  try {
    try {
      await copyFile(source, snapshot);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    journal = await openEffectsJournal({ ...journalOptions, databasePath: snapshot });
    return readObservationCensus({ ...journal, databasePath: source }, { workspaceRoot });
  } finally {
    journal?.close();
    await rm(temporary, { recursive: true, force: true });
  }
}

function dwellFrom(model) {
  const arbiter = (model?.nodes ?? []).find((node) => (node?.edges?.["parameter-tuning"] ?? []).length > 0);
  return arbiter?.fields?.dwell?.raw ?? null;
}

function render(result) {
  const lines = [
    `Acceptor: report-only — ${result.proposals.length} knob(s), threshold ${result.threshold.count}, commit requires an explicit request.`,
  ];
  for (const population of result.census?.populations ?? []) {
    lines.push(`  census ${population.sweep}: counted ${population.count}; excluded ${population.excluded.fixtures} fixture, ${population.excluded.otherWorkspace} other-workspace, ${population.excluded.unlocated} unlocated; folded ${population.folded.events} event(s).`);
  }
  for (const proposal of result.proposals) {
    const step = proposal.proposal == null ? "no pending step" : `step ${JSON.stringify(proposal.proposal.from)} → ${JSON.stringify(proposal.proposal.to)}`;
    if (proposal.evidence == null) {
      lines.push(`  ${proposal.key}: ${proposal.verdict}; ${step}; no ruling was produced and no evidence is accruing.`);
    } else {
      const evidence = `${proposal.evidence.count} rulings, threshold ${proposal.evidence.threshold}`;
      const distance = proposal.distance == null ? "no distance" : `${proposal.distance.value ?? "unreachable"} ${proposal.distance.unit}`;
      lines.push(`  ${proposal.key}: ${proposal.verdict}; ${step}; ${evidence}; distance ${distance}.`);
      lines.push(`    record ${proposal.evidence.record}; E ${proposal.evidence.wealth} against ${proposal.evidence.level}; next crossing ${proposal.evidence.nextCrossing.record} at ${proposal.evidence.nextCrossing.at} pairs; ${proposal.evidence.budgetRemaining} of ${proposal.evidence.budget} budget pairs remain.`);
    }
    if (proposal.range != null) lines.push(`    range: proposed ${JSON.stringify(proposal.range.proposed)}, in effect ${JSON.stringify(proposal.range.inEffect)}, admissible ${proposal.range.admissible === true}.`);
    for (const refusal of proposal.refusals) {
      lines.push(`    ${refusal.code} — remove with ${refusal.removal}.`);
      for (const ground of refusal.detail?.grounds ?? []) lines.push(`      ground ${ground.code}: ${ground.message}`);
    }
    for (const refusal of proposal.constructionRefusals) lines.push(`    ${refusal.code} — ${refusal.message}`);
  }
  if (result.structurallySilent) lines.push("  structural silence: every reported knob is yield-bound under its observed rate.");
  if (result.action != null) lines.push(`  action: ${result.action.requested} ${result.action.key} — ${result.action.applied ? "applied on request" : "refused"}.`);
  return lines.join("\n");
}

async function runCommand(input, ctx) {
  const workspace = ctx.workspace;
  const deps = ctx.acceptor ?? {};
  const criterion = deps.criterion ?? await readCriterion(workspace.projectRoot);
  const model = deps.model ?? await loadLoops(workspace);
  const units = deps.units ?? await sourceUnits(workspace.projectRoot);
  let harness = deps.harness;
  if (harness == null) {
    let text = null;
    try {
      text = await readFile(path.join(workspace.projectRoot, ...HARNESS_OF_RECORD.document.split("/")), "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    harness = { ...HARNESS_OF_RECORD, text };
  }
  const ledgerRead = deps.ledger == null ? await readHarnessRulings(workspace.projectRoot) : null;
  const ledger = deps.ledger ?? ledgerRead.records;
  let census;
  if (deps.census != null) census = deps.census;
  else census = await censusSnapshot(workspace.projectRoot, deps.journalOptions ?? {});

  let result = buildAcceptorReport({
    proposals: input?.proposals ?? deps.proposals ?? [],
    criterion,
    model,
    units,
    harness,
    census,
    ledger,
    config: workspace.config,
    bounds: deps.bounds,
    metricRegistry: deps.metricRegistry,
  });
  const requested = input?.commit;
  if (typeof requested === "string" && requested.length > 0) {
    const row = result.proposals.find((proposal) => proposal.key === requested);
    let action = { requested: "commit", key: requested, applied: false, refusals: row?.refusals ?? [] };
    if (row?.eligible === true) {
      const offered = (input?.proposals ?? deps.proposals ?? []).find((proposal) => proposal?.key === requested);
      if (offered?.counterMetric == null) {
        action = { ...action, constructionRefusal: { code: "counter-metric-missing", message: "An explicit commit needs the paired counter-metric reading." } };
      } else {
        const ruling = {
          key: requested,
          from: offered.from,
          to: offered.to,
          epochId: offered.epochId,
          criterion: criterionDigest(criterion),
          ledger: row.evidence.sequence,
          evalue: row.evidence.wealth,
          counterMetric: offered.counterMetric,
          dwell: dwellFrom(model),
          dwellFrom: offered.epochId,
          provenance: offered.provenance ?? "operator:work:acceptor",
          verdict: VERDICTS.COMMIT,
          refusals: [],
        };
        const transition = deps.transition ?? transitionHarnessRuled;
        const applied = await transition(ruling, { workspace, projectDir: workspace.projectRoot, journalOptions: deps.journalOptions });
        action = { requested: "commit", key: requested, applied: true, rulingId: applied.rulingId, write: applied.write };
      }
    }
    result = Object.freeze({ ...result, action: Object.freeze(action) });
  }
  return result;
}

export const acceptorCommand = {
  id: "work:acceptor",
  input: {
    type: "object",
    properties: {
      commit: { type: "string" },
      proposals: { type: "array", items: { type: "object" } },
    },
    additionalProperties: false,
  },
  run: runCommand,
  cli: {
    route: ["work", "acceptor"],
    spec: {
      usage: "aof work acceptor [--json] [--commit <key>]",
      flags: {
        commit: { type: "string", description: "commit one eligible proposal by key; omitted means report-only" },
      },
    },
    argv: (_positionals, options = {}) => ({ ...(options.commit ? { commit: options.commit } : {}) }),
    render,
    json: (result) => result,
    exit: () => 0,
  },
};
