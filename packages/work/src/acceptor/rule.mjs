// src/work-acceptor/rule.mjs — THE RULE: ONE COMMIT CONDITION, DERIVED FROM THE
// CRITERION'S OWN INPUTS (milestone 61 / ADR-001, ADR-002, ADR-003).
//
// The whole defensibility of this rule is that there is ONE condition: the wealth
// clears the commit level. Eight favourable pairs is not a second rule bolted onto
// the sequential test — it is the EARLIEST CROSSING that test can reach, the top row
// of a lattice this module derives. Saying so is what stops the number reading as a
// preference, and it is why nothing here types an 8.
//
// SO NOTHING HERE IS TYPED. The commit level is `1 / alpha`, a favourable pair
// multiplies by `1 + lambda`, an unfavourable one by `1 - lambda`, and the earliest
// crossing at `l` losses is the smallest `w` solving
//
//     w * ln(1 + lambda) - l * ln(1 / (1 - lambda))  >=  ln(1 / alpha)
//
// A literal 8, 1.5 or 20 in here would be a number that SURVIVES a change to either
// input — and SPIKE §Lane C is explicit that `lambda` rests on an attribution that
// could not be independently verified, so if it is wrong `N` must be re-derived
// rather than re-asserted (ADR-001 §2). Revise the bet and the whole lattice moves.
//
// WHAT IS CHOSEN RATHER THAN DERIVED IS THE BUDGET, and it is declared, checked
// against the earliest crossing and frozen by `criterion.mjs` — extending a budget
// mid-flight to reach for a crossing is optional stopping in the budget dimension,
// the same p-hack as moving the yardstick, one axis over (ADR-001 §2).
//
// ── THIS MODULE IMPORTS NOTHING, AND EVERY DEPENDENCY ARRIVES AS AN ARGUMENT ──────
//
// The e-value arithmetic is `ledger.mjs`'s and the criterion's identity is
// `criterion.mjs`'s (ADR-006 §4). Composition happens at the command boundary, which
// is what keeps all three leaves zero-import and every scenario plantable. Two
// consequences are deliberate and worth stating rather than discovering:
//
//   • THE RANGE IS ASKED, NEVER LOOKED UP. A knob's floor and ceiling live in that
//     knob's own resolver (`src/loop-bounds.mjs`, ADR-009 §2), so the probe is handed
//     in as `bounds` and a missing probe is a refusal rather than a default. A table
//     of ranges here would be a second home for a number that already has one.
//   • THE METRIC IS A POINTER, NEVER A NAME. `deriveMetricRegistry` builds the
//     resolution registry FROM THE CALLABLES a module namespace exports — never a
//     parallel allow-list, which could name a metric nobody computes (ADR-002 §5,
//     69/ADR-001's own rule for `LOOP_BOUND_CONFIG_RESOLVERS`). No metric name is
//     spelled anywhere below.
//
// And it holds no knob key: the tunable set is the registry's (ADR-008 §4).

// ── THE REFUSALS ─────────────────────────────────────────────────────────────────
//
// TWO VOCABULARIES, KEPT APART ON PURPOSE. ADR-010 §2's frozen seven are what the
// SURFACE reports about a knob; `metric-unmeasurable` and `trial-unaffordable` below
// are this module's two members of that set, spelled identically so a ruling needs no
// translation table (the same reasoning `admissibility.mjs` gives for
// `not-admissible`). The rest are refusals about the SHAPE OF A PROPOSAL — what a
// step may name and what a knob may be priced from — and ADR-001 §5 declares
// `not-an-ordinal-knob` as exactly that. Collapsing the two axes would hide which of
// three different things an operator has to do about it (ADR-001 §4/§5).
export const METRIC_UNMEASURABLE = "metric-unmeasurable";
export const TRIAL_UNAFFORDABLE = "trial-unaffordable";

export const METRIC_UNRESOLVABLE = "metric-unresolvable";
export const COUNTER_METRIC_UNRESOLVABLE = "counter-metric-unresolvable";
export const COUNTER_METRIC_MISSING = "counter-metric-missing";
export const NOT_AN_ORDINAL_KNOB = "not-an-ordinal-knob";
export const STEP_IS_MORE_THAN_ONE_NOTCH = "step-is-more-than-one-notch";
export const NO_STEP_PROPOSED = "no-step-proposed";
export const TRIAL_UNIT_UNDECLARED = "trial-unit-undeclared";
export const RANGE_PROBE_MISSING = "range-probe-missing";
export const CRITERION_NOT_SUPPLIED = "criterion-not-supplied";

// The four things a pair of arm readings can be. THE THIRD OUTCOME IS THE ONE WORTH
// ARGUING (ADR-002 §6): an arm nobody could measure is neither a tie nor a favourable
// pair, because calling it a tie discards evidence that was never gathered and
// calling it favourable fabricates it.
//
// It is spelled here AND in `ledger.mjs` because two zero-import leaves cannot share
// a constant, and the arch control asserts the two spellings are identical rather
// than trusting them to stay so.
export const PAIR_OUTCOMES = Object.freeze({
  FAVOURABLE: "favourable",
  UNFAVOURABLE: "unfavourable",
  TIE: "tie",
  UNMEASURABLE: "unmeasurable",
});

// The readings ADR-001 §6 requires, as ids rather than as prose: the surface renders
// them, and both are driven by the arithmetic below rather than by a second table.
export const EVIDENCE_READINGS = Object.freeze({
  NEVER: "no-test-in-the-family-could-commit",
  AGGRESSIVE_BET_ONLY: "sufficient-only-under-a-maximally-aggressive-bet",
  CLEARED: "the-shipped-bets-commit-level-is-cleared",
});

// A paired trial runs BOTH arms. The mean is used rather than the median for the same
// reason (SPIKE §Conventions: a reader taking the single-arm/median reading gets a
// figure ~4x low).
export const TRIAL_ARMS = 2;

// `lambda` is refused at construction unless `0 < lambda < 1` — `lambda = 1` makes the
// loss multiplier zero and annihilates wealth on a loss, the hard reset ADR-001 §3
// rejects, admitted through the parameter. So the supremum of the favourable
// multiplier over the whole family of bets is `1 + LAMBDA_CEILING`, and that bound —
// not a typed 2 — is what "a maximally aggressive bet" means below.
const LAMBDA_CEILING = 1;
const MAXIMAL_BET_MULTIPLIER = 1 + LAMBDA_CEILING;

// The one pointer scheme. `module:<path>#<symbol>` — a path this repository can hold
// and a symbol that module actually exports.
const POINTER_SCHEME = "module:";

export class RuleError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RuleError";
    this.code = code;
    Object.assign(this, details);
  }
}

function refuse(code, message, details = {}) {
  throw new RuleError(code, message, details);
}

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

// ── THE DERIVED QUANTITIES ───────────────────────────────────────────────────────

// `1 / alpha` — the level the wealth must clear, and the ONLY leg of the commit
// condition (ADR-001 §1). There is no second condition on the record's shape.
export function commitLevel(criterion) {
  return 1 / criterion.alpha;
}

// `1 + lambda` on a favourable pair, `1 - lambda` on an unfavourable one. A loss
// MULTIPLIES; it never resets. A hard reset attains `2^-N` and throws the Ville
// guarantee's whole point away (ADR-001 §3), and `lambda = 1` — which would make the
// loss multiplier zero and annihilate wealth — is refused by the criterion at
// construction so that reset cannot arrive through the parameter.
export function winMultiplier(criterion) {
  return 1 + criterion.lambda;
}

export function lossMultiplier(criterion) {
  return 1 - criterion.lambda;
}

// crossingRecord(criterion, losses) — the FIRST record that crosses at that many
// unfavourable pairs: the smallest `w` with `(1+l)^w * (1-l)^losses >= 1/alpha`,
// solved in logs so no wealth product is formed here (the e-value has one home, and
// it is `ledger.mjs` — ADR-006 §4).
//
// `at` is `w + losses`, the pair the record falls at. Because a loss can never carry
// a run over the level, every first crossing lands on a favourable pair, and the set
// of `at` values IS the set of pair counts at which any path can first cross. That is
// why no path crosses at 9 or 10 pairs under the shipped criterion — not a rule, an
// absence in this table (ADR-001 §1a, SPIKE §Lane C).
export function crossingRecord(criterion, losses = 0) {
  const need = Math.log(commitLevel(criterion)) + losses * Math.log(1 / lossMultiplier(criterion));
  const wins = Math.ceil(need / Math.log(winMultiplier(criterion)));
  const at = wins + losses;
  return Object.freeze({
    losses,
    wins,
    at,
    record: `${wins}-${losses}`,
    reachable: Number.isInteger(criterion?.B) ? at <= criterion.B : null,
  });
}

// The whole lattice, one row per loss count the budget can hold — plus the rows just
// past it, because a proposal the budget can no longer rescue must still be able to
// NAME the record that would have crossed (ADR-001 §3a). A row is `reachable` when it
// falls inside the budget; refusing to compute the unreachable ones is how a machine
// ends up reporting "short of evidence" for a state no evidence can reach.
export function crossingLattice(criterion, { maxLosses = null } = {}) {
  const last = Number.isInteger(maxLosses) ? maxLosses : criterion.B;
  const rows = [];
  for (let losses = 0; losses <= last; losses += 1) rows.push(crossingRecord(criterion, losses));
  return Object.freeze(rows);
}

// `N` — the earliest crossing any path can reach, and therefore the top row. It is the
// same fact as "a run that commits at N pairs is all-favourable", not a second rule:
// a 7-1 record reaching only 8.54 is a different row of the lattice, never a near miss
// (ADR-001 §1a).
export function earliestCrossing(criterion) {
  return crossingRecord(criterion, 0);
}

// The smallest evidence any bet in the family could commit on. As `lambda` approaches
// its own ceiling the favourable multiplier approaches 2, so `w` pairs can attain at
// most `2^w` — STRICTLY, because `lambda < 1` is enforced. Four perfect wins reach at
// most 16 against a level of 20 and therefore cannot commit under ANY test in the
// family, which is SPIKE §Lane C's combinatorial floor arriving as arithmetic rather
// than as a second table (ADR-001 §6).
export function minimumPairsUnderAnyBet(criterion) {
  return Math.floor(Math.log(commitLevel(criterion)) / Math.log(MAXIMAL_BET_MULTIPLIER)) + 1;
}

// What a ledger of a given size can say AT ALL — the three readings of ADR-001 §6,
// each a comparison against a quantity derived just above rather than a row looked up.
export function evidenceReading(pairsHeld, criterion) {
  const floor = minimumPairsUnderAnyBet(criterion);
  const shipped = earliestCrossing(criterion).wins;
  const id = pairsHeld < floor
    ? EVIDENCE_READINGS.NEVER
    : pairsHeld < shipped
      ? EVIDENCE_READINGS.AGGRESSIVE_BET_ONLY
      : EVIDENCE_READINGS.CLEARED;
  return Object.freeze({
    pairsHeld,
    reading: id,
    minimumUnderAnyBet: floor,
    earliestCrossing: shipped,
  });
}

// deriveRule(criterion) — every quantity the rule runs on, in one object, all of it
// arithmetic over the criterion's own inputs. Nothing here is a preference and nothing
// here is a name: no metric, no knob key, no digest.
export function deriveRule(criterion) {
  if (criterion == null || typeof criterion !== "object") {
    refuse(CRITERION_NOT_SUPPLIED, "Refusing to derive the rule: no criterion was supplied.");
  }
  const crossings = crossingLattice(criterion);
  return Object.freeze({
    alpha: criterion.alpha,
    lambda: criterion.lambda,
    level: commitLevel(criterion),
    win: winMultiplier(criterion),
    loss: lossMultiplier(criterion),
    pairCount: criterion.N,
    budget: criterion.B,
    tieRate: criterion.tieRate,
    rawPairs: rawPairsFor(criterion),
    trialCeilingUsd: criterion.trialCeilingUsd,
    arms: TRIAL_ARMS,
    minimumUnderAnyBet: minimumPairsUnderAnyBet(criterion),
    earliest: crossings[0],
    crossings,
  });
}

// ── THE BASKET (ADR-003) ─────────────────────────────────────────────────────────

// rawPairsFor(criterion) — `ceil(B * d / (d - n))` over the DECLARED RATIONAL tie
// rate, in integer arithmetic, because this exact computation has already produced a
// wrong number once. SPIKE §Corrections: `8 / (1 - 0.90)` is 80 raw pairs, not 81 —
// the 81 was an IEEE-754 artefact, in a document about numeric discipline. The
// artefact is in the SUBTRACTION (`1 - 0.9` is 0.09999999999999998), so no rate ever
// becomes a float here: the terms stay integers and `ceil(p/q)` is spelled as the
// exact integer form `floor((p + q - 1) / q)` (ADR-003 §2a).
//
// The quantity purchased is the BUDGET, never the earliest crossing. A trial must be
// funded for the longest run it may legitimately take; funding only the floor buys a
// trial that cannot reach its own second crossing — ADR-001's corrected error,
// arriving through the budget (ADR-003 §2).
export function rawPairsFor(criterion) {
  const rate = criterion?.tieRate;
  if (rate == null || !Number.isInteger(rate.n) || !Number.isInteger(rate.d) || rate.d <= 0 || rate.n < 0 || rate.n >= rate.d) {
    refuse(TRIAL_UNIT_UNDECLARED, `Refusing to size the trial: the tie rate must be a rational n/d with integer terms (got ${JSON.stringify(rate)}).`, { part: "tieRate" });
  }
  const numerator = criterion.B * rate.d;
  const denominator = rate.d - rate.n;
  return Math.floor((numerator + denominator - 1) / denominator);
}

// What a commit requires, and it is the SAME for every knob whatever the knob costs
// (ADR-003 §1). Scaling the evidence per knob would make the error guarantee per knob
// — the multiple-testing failure this milestone exists to refuse.
export function commitRequirement(criterion) {
  return Object.freeze({
    crossings: crossingLattice(criterion),
    earliest: earliestCrossing(criterion),
    budget: criterion.B,
    pairCount: criterion.N,
  });
}

// basketFor(knob, criterion) — `rawPairs * 2 arms * meanUnitUsd(trialUnit)`.
//
// THE PRICE OF A KNOB IS ITS UNIT'S PRICE, NOT A PREFERENCE. The trial unit is the
// smallest measured unit whose outcome that knob's change can alter; for a knob that
// nothing below a whole milestone build responds to, that unit IS the milestone build
// — which prices it out. That is the honest answer rather than a defect in the sizing,
// and the knob stays on the report with the price it would cost (ADR-003 §3, §5).
//
// A knob with no declared trial unit is REFUSED rather than priced by default: a
// default price is a number nobody chose standing in for one somebody must.
export function basketFor(knob, criterion) {
  const rawPairs = rawPairsFor(criterion);
  const unit = knob?.trialUnit ?? null;
  const mean = unit?.meanUsd;
  const ceiling = criterion.trialCeilingUsd;
  const base = {
    key: knob?.key ?? null,
    trialUnit: unit?.unit ?? null,
    rawPairs,
    arms: TRIAL_ARMS,
    funds: criterion.B,
    ceilingUsd: ceiling,
  };
  if (unit == null || !isFiniteNumber(mean) || mean <= 0) {
    return Object.freeze({
      ...base,
      meanUnitUsd: null,
      usd: null,
      dollars: null,
      admitted: false,
      accrues: false,
      refusal: TRIAL_UNIT_UNDECLARED,
      message: `Refusing to price ${base.key ?? "the knob"}: no trial unit is declared beside it, and no price is assumed on its behalf.`,
    });
  }
  const usd = rawPairs * TRIAL_ARMS * mean;
  const admitted = usd <= ceiling;
  return Object.freeze({
    ...base,
    meanUnitUsd: mean,
    usd,
    dollars: Math.round(usd),
    admitted,
    accrues: admitted,
    refusal: admitted ? null : TRIAL_UNAFFORDABLE,
    message: admitted
      ? null
      : `${base.key ?? "the knob"} is priced at ${Math.round(usd)} against a trial ceiling of ${ceiling}: it is listed with its basket and the ceiling it exceeded, and it contributes no pairs.`,
  });
}

// The spread between the dearest and the cheapest basket is a RATIO OF UNIT MEANS: the
// raw pairs and the arms cancel, so it is invariant to the budget and to the tie rate.
// That invariance is the consistency check against the spike's independently measured
// figure; the dollar column is not (ADR-003 §3).
export function basketSpread(knobs, criterion) {
  const priced = knobs.map((knob) => basketFor(knob, criterion)).filter((basket) => basket.usd != null);
  const values = priced.map((basket) => basket.usd);
  const dearest = Math.max(...values);
  const cheapest = Math.min(...values);
  return Object.freeze({ baskets: Object.freeze(priced), dearest, cheapest, ratio: dearest / cheapest });
}

// ── THE STEP (ADR-001 §4, §5) ────────────────────────────────────────────────────

// A knob is ORDINAL when its values are a ladder rather than a set. A map from roles
// to models is a set of choices, so `+1` has no meaning on it — that knob is not
// expensive or unaffordable, it is not steppable AT ALL, permanently, and the refusal
// says so by name rather than inventing a range for it (ADR-001 §5).
//
// It is decided from the values themselves, never from a list of knob names: a name
// list here would be a second home for the tunable set (ADR-008 §4).
const isNotch = (value) => Number.isInteger(value);

// THREE ANSWERS, NOT TWO, and the third is why. "Its values have no ordering" and
// "nothing was declared about its values" are different facts, and collapsing them
// would report a knob nobody has described yet as permanently unsteppable — the same
// species as 61/00's `no-declared-range`, where silence and an answer are kept apart.
export const ORDINALITY = Object.freeze({ ORDINAL: "ordinal", UNORDERED: "unordered", UNDECLARED: "undeclared" });

export function ordinalityOf(knob) {
  const values = knob?.values;
  if (Array.isArray(values)) return values.length > 0 && values.every(isNotch) ? ORDINALITY.ORDINAL : ORDINALITY.UNORDERED;
  if (values !== undefined && values !== null) return ORDINALITY.UNORDERED;
  if (knob?.from === undefined && knob?.to === undefined) return ORDINALITY.UNDECLARED;
  return isNotch(knob.from) && isNotch(knob.to) ? ORDINALITY.ORDINAL : ORDINALITY.UNORDERED;
}

// ladderFor(key, { bounds }) — the knob's own ladder, ASKED rather than looked up.
// Every candidate notch is put to the knob's own resolver, and a value the resolver
// returns unchanged is in range (ADR-009 §2). Nothing written down anywhere can widen
// a range, because there is nothing written down to edit.
export function ladderFor(key, { bounds = null, scanLimit = 1024 } = {}) {
  const probe = bounds?.rangeProbe;
  if (typeof probe !== "function") {
    refuse(RANGE_PROBE_MISSING, "Refusing to read the ladder: no range probe was supplied, and a range this module kept would be a second home for one that already exists.", { key });
  }
  const notches = [];
  for (let value = 0; value <= scanLimit; value += 1) {
    if (probe(key, value)?.admissible === true) notches.push(value);
    else if (notches.length > 0) break;
  }
  return Object.freeze({
    key,
    notches: Object.freeze(notches),
    floor: notches.length > 0 ? notches[0] : null,
    ceiling: notches.length > 0 ? notches[notches.length - 1] : null,
    steps: notches.length > 0 ? notches.length - 1 : 0,
  });
}

// What a whole ladder costs, STATED IN PAIRS rather than asserted. Floor-to-ceiling is
// `steps` steps; each needs the earliest crossing to commit and is funded for the
// budget (ADR-001 §4).
export function ladderPrice(key, criterion, { bounds = null } = {}) {
  const ladder = ladderFor(key, { bounds });
  return Object.freeze({
    ...ladder,
    pairsToEarliestCrossing: ladder.steps * earliestCrossing(criterion).at,
    pairsFunded: ladder.steps * criterion.B,
  });
}

// readStep(proposal, { bounds }) — one knob, one notch, and everything else a refusal
// with a name.
//
// A PROPOSAL NAMING TWO KNOBS IS REFUSED RATHER THAN SPLIT. Splitting it silently is
// worse than refusing: the operator asked for one trial and would get two they never
// priced, and whichever knob moved the metric both would be credited — the
// multiple-testing failure the whole rule exists to refuse, smuggled in as convenience
// (ADR-001 §4).
//
// The compound code is obtained from the injected refusal rather than re-spelled here:
// "two keys in one proposal" and "one key resolving to two bounds" are the same
// species — a write that moves more than one bound — and that species has one home
// (ADR-009 §4).
export function readStep(proposal, { bounds = null } = {}) {
  const compound = bounds?.compoundStepRefusal;
  if (typeof bounds?.rangeProbe !== "function" || typeof compound !== "function") {
    refuse(RANGE_PROBE_MISSING, "Refusing to read the step: no range probe was supplied.", { proposal });
  }
  const moves = Array.isArray(proposal?.moves)
    ? proposal.moves
    : proposal?.key == null ? [] : [{ key: proposal.key, from: proposal.from, to: proposal.to, values: proposal.values }];

  if (moves.length === 0) {
    return refusedStep(NO_STEP_PROPOSED, [], "The proposal names no knob at all, so there is no step to read.");
  }

  if (moves.length > 1) {
    const keys = moves.map((move) => move?.key ?? null);
    const refusal = compound({ key: keys.join(", "), bounds: keys });
    return Object.freeze({
      step: null,
      steps: Object.freeze([]),
      accepted: false,
      accrues: false,
      code: refusal?.code ?? null,
      keys: Object.freeze(keys),
      message: `The proposal names ${keys.length} knobs (${keys.join(", ")}). It is refused rather than split: one trial was asked for, and splitting it would silently buy two nobody priced.`,
    });
  }

  const [move] = moves;
  const key = move?.key ?? null;
  const ordinality = ordinalityOf(move);
  if (ordinality === ORDINALITY.UNDECLARED) {
    return refusedStep(NO_STEP_PROPOSED, [key], `${key ?? "the knob"} is named but no value is proposed for it, so there is no step to read.`);
  }
  if (ordinality === ORDINALITY.UNORDERED) {
    return refusedStep(
      NOT_AN_ORDINAL_KNOB,
      [key],
      `${key ?? "the knob"} has values with no ordering, so it has no next notch. It stays a human change, permanently — this is not an expensive step, it is not a step.`,
    );
  }
  if (move.from === move.to) {
    return refusedStep(NO_STEP_PROPOSED, [key], `${key ?? "the knob"} is named but its value is left where it was, so nothing was proposed.`);
  }
  const notches = move.to - move.from;
  if (Math.abs(notches) !== 1) {
    return refusedStep(
      STEP_IS_MORE_THAN_ONE_NOTCH,
      [key],
      `${key ?? "the knob"} is moved by ${Math.abs(notches)} notches. A step is one notch; a longer move is that many trials, each of which has to be paid for.`,
    );
  }
  const probed = bounds.rangeProbe(key, move.to);
  if (probed?.admissible !== true) {
    return refusedStep(probed?.code ?? null, [key], `${key ?? "the knob"} answered ${JSON.stringify(probed?.inEffect ?? null)} for a proposed ${JSON.stringify(move.to)}.`, { probe: probed });
  }
  const step = Object.freeze({ key, from: move.from, to: move.to, notch: notches, probe: probed });
  return Object.freeze({
    step,
    steps: Object.freeze([step]),
    accepted: true,
    accrues: true,
    code: null,
    keys: Object.freeze([key]),
    message: null,
  });
}

function refusedStep(code, keys, message, extra = {}) {
  return Object.freeze({
    step: null,
    steps: Object.freeze([]),
    accepted: false,
    // A REFUSED PROPOSAL ACCRUES NOTHING, and the refusal is reported rather than the
    // proposal disappearing (ADR-003 §5's discipline, applied to the step).
    accrues: false,
    code,
    keys: Object.freeze([...keys]),
    message,
    ...extra,
  });
}

// knobReport(knob, { bounds, criterion }) — what the surface says about a knob before
// any evidence exists. An unordered knob is reported as a HUMAN CHANGE rather than as
// evidence pending: listing it as awaiting evidence promises a proposal that will
// never come (ADR-001 §5).
export function knobReport(knob, { bounds = null, criterion = null } = {}) {
  const key = knob?.key ?? null;
  // Only a knob whose DECLARED values have no ordering is a permanent human change. A
  // knob that has declared nothing about its values has not answered the question, and
  // reporting it as unsteppable would be answering it on its behalf.
  if (ordinalityOf(knob) === ORDINALITY.UNORDERED) {
    return Object.freeze({
      key,
      steppable: false,
      humanChange: true,
      awaitingEvidence: false,
      proposal: null,
      refusals: Object.freeze([NOT_AN_ORDINAL_KNOB]),
      basket: null,
      message: `${key ?? "the knob"} has no ordering, so no step on it is meaningful. It is a human change, permanently.`,
    });
  }
  const basket = criterion == null ? null : basketFor(knob, criterion);
  // `trial-unit-undeclared` says the criterion could not price this knob, so no ruling
  // exists for it to explain. It stays on `basket.refusal`, where the construction
  // finding can render it, and never enters the ruling lane (61/ADR-013 §4).
  const refusals = basket?.refusal == null || basket.refusal === TRIAL_UNIT_UNDECLARED
    ? []
    : [basket.refusal];
  return Object.freeze({
    key,
    steppable: true,
    humanChange: false,
    awaitingEvidence: basket == null || basket.admitted,
    proposal: null,
    refusals: Object.freeze(refusals),
    basket,
    message: basket?.message ?? null,
  });
}

// ── THE METRIC (ADR-002) ─────────────────────────────────────────────────────────

// parsePointer — `module:<path>#<symbol>`, or null when the text is not a pointer at
// all. Nothing here knows what a metric is called.
export function parsePointer(pointer) {
  if (typeof pointer !== "string" || !pointer.startsWith(POINTER_SCHEME)) return null;
  const body = pointer.slice(POINTER_SCHEME.length);
  const hash = body.lastIndexOf("#");
  if (hash <= 0 || hash === body.length - 1) return null;
  return Object.freeze({ pointer, module: body.slice(0, hash), symbol: body.slice(hash + 1) });
}

// deriveMetricRegistry(namespaces) — the resolution registry, DERIVED FROM THE
// CALLABLES a module namespace exports. It is the same rule 69/ADR-001 applies to
// `LOOP_BOUND_CONFIG_RESOLVERS`: a parallel allow-list could name a metric nobody
// computes, and every control built on it would be decoration. A non-callable export
// is not a resolver and does not enter.
export function deriveMetricRegistry(namespaces = {}) {
  const registry = {};
  for (const [module, namespace] of Object.entries(namespaces ?? {})) {
    for (const [symbol, value] of Object.entries(namespace ?? {})) {
      if (typeof value !== "function") continue;
      registry[`${POINTER_SCHEME}${module}#${symbol}`] = value;
    }
  }
  return Object.freeze(registry);
}

// resolveTrial(criterion, registry) — both declarations must RESOLVE, and a pointer
// that resolves to nothing is refused when the criterion is built, never discovered at
// the moment a ruling was due (ADR-002 §5). The counter-metric is not optional: fewer
// rounds bought by accepting worse work is not an improvement, and a criterion that
// cannot tell those apart is refused before it can rule (ADR-002 §2).
export function resolveTrial(criterion, registry = {}) {
  const metricPointer = criterion?.metric;
  const counterPointer = criterion?.counter;
  if (typeof counterPointer !== "string" || counterPointer.length === 0) {
    refuse(COUNTER_METRIC_MISSING, "Refusing the criterion: it declares a metric and no counter-metric at all. Fewer rounds bought by accepting worse work is not an improvement.", { part: "counter" });
  }
  const metric = resolveOne(metricPointer, registry, METRIC_UNRESOLVABLE, "metric");
  const counter = resolveOne(counterPointer, registry, COUNTER_METRIC_UNRESOLVABLE, "counter");
  return Object.freeze({ metric, counter });
}

function resolveOne(pointer, registry, code, part) {
  const parsed = parsePointer(pointer);
  if (parsed == null) {
    refuse(code, `Refusing the criterion: ${JSON.stringify(pointer)} is not a declared pointer, so the ${part} names nothing that can be resolved.`, { part, pointer: pointer ?? null });
  }
  const resolve = Object.hasOwn(registry ?? {}, parsed.pointer) ? registry[parsed.pointer] : null;
  if (typeof resolve !== "function") {
    refuse(
      code,
      `Refusing the criterion: the ${part} ${JSON.stringify(parsed.pointer)} resolves to nothing — ${JSON.stringify(parsed.module)} exports no callable ${JSON.stringify(parsed.symbol)}. A criterion would otherwise rule on a comparison nobody can perform.`,
      { part, pointer: parsed.pointer, module: parsed.module, symbol: parsed.symbol },
    );
  }
  return Object.freeze({ ...parsed, resolve });
}

// makeTrial({ criterion, registry }) — the composed construction: an already-built
// criterion, its declarations resolved, and the rule derived from its own inputs. It
// produces nothing at all when either declaration does not hold up.
export function makeTrial({ criterion, registry = {} } = {}) {
  const resolved = resolveTrial(criterion, registry);
  return Object.freeze({ criterion, rule: deriveRule(criterion), ...resolved });
}

// readArm(trial, records) — the arm's reading, taken through the declared pointer. The
// reading declares its OWN polarity and its own comparable value, which is what keeps
// the direction of "better" out of this module (ADR-002 §5).
export function readArm(trial, records) {
  const reading = trial.metric.resolve(records);
  return Object.freeze({
    pointer: trial.metric.pointer,
    status: reading?.status ?? null,
    measured: reading?.status === "measured",
    value: reading?.value ?? null,
    better: reading?.better ?? null,
    reason: reading?.reason ?? null,
    reading,
  });
}

// countPair(a, b) — how a pair of arm readings is counted, and the third outcome is
// the point. An unmeasurable arm is in NEITHER total (ADR-002 §6).
export function countPair(a, b) {
  const unmeasurable = a?.measured !== true || b?.measured !== true;
  if (unmeasurable) {
    return Object.freeze({
      outcome: PAIR_OUTCOMES.UNMEASURABLE,
      counted: false,
      discarded: false,
      reason: a?.measured !== true ? a?.reason ?? null : b?.reason ?? null,
    });
  }
  if (a.value === b.value) {
    // A tie is discarded BY CONSTRUCTION — it moves no wealth and costs a raw pair,
    // which is exactly what the tie rate prices (ADR-003 §2).
    return Object.freeze({ outcome: PAIR_OUTCOMES.TIE, counted: false, discarded: true, reason: null });
  }
  const better = a.better ?? b.better;
  if (better !== a.better && b.better != null && a.better != null) {
    refuse(METRIC_UNRESOLVABLE, "Refusing to count the pair: the two arms were read under readings that disagree about which direction is better.", { a: a.better, b: b.better });
  }
  const aIsBetter = better === "lower" ? a.value < b.value : a.value > b.value;
  return Object.freeze({
    outcome: aIsBetter ? PAIR_OUTCOMES.FAVOURABLE : PAIR_OUTCOMES.UNFAVOURABLE,
    counted: true,
    discarded: false,
    reason: null,
  });
}

// counterMetricMovement(before, after) — the counter-metric reading and the direction
// it moved, carried on EVERY ruling whether or not the trial result was favourable
// (ADR-002 §2). A reading present only when it is convenient is not a control.
export function counterMetricMovement(before, after) {
  const readable = before?.status === "measured" && after?.status === "measured";
  if (!readable) {
    return Object.freeze({ before: before?.value ?? null, after: after?.value ?? null, direction: null, measured: false, reason: after?.reason ?? before?.reason ?? null });
  }
  const better = after.better ?? before.better;
  const improved = better === "lower" ? after.value < before.value : after.value > before.value;
  const direction = after.value === before.value ? "unchanged" : improved ? "better" : "worse";
  return Object.freeze({ before: before.value, after: after.value, direction, measured: true, reason: null });
}

// metricPopulation(trial, arms) — a population that CANNOT be measured is reported as
// such, not as zero evidence. Reporting "0 favourable pairs" for arms nobody could
// read says a comparison was made and came out even; naming the reading it could not
// take says what actually happened (ADR-002 §6). At HEAD every arm is unmeasurable and
// this is what makes the machinery say so.
export function metricPopulation(trial, arms = []) {
  const readings = arms.map((arm) => readArm(trial, arm));
  const measured = readings.filter((reading) => reading.measured);
  const unmeasurable = readings.filter((reading) => !reading.measured);
  const anyMeasured = measured.length > 0;
  return Object.freeze({
    pointer: trial.metric.pointer,
    arms: readings.length,
    measurable: anyMeasured,
    measuredArms: measured.length,
    unmeasurableArms: unmeasurable.length,
    // NULL, NEVER ZERO, IN BOTH DIRECTIONS. This object reports what could be READ,
    // not what was paired — pairing is `countPair`'s — so it has no favourable count to
    // give. Emitting 0 here would say a comparison was made and came out even, which is
    // precisely the lie ADR-002 §6 names.
    favourablePairs: null,
    readings: Object.freeze(readings),
    refusals: Object.freeze(anyMeasured ? [] : [METRIC_UNMEASURABLE]),
    unableToRead: anyMeasured
      ? null
      : Object.freeze({
        pointer: trial.metric.pointer,
        reasons: Object.freeze([...new Set(unmeasurable.map((reading) => reading.reason))]),
      }),
  });
}
