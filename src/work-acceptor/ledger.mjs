// src/work-acceptor/ledger.mjs — THE ARITHMETIC (milestone 61 / ADR-006, ADR-001 §3).
//
// This is the leaf that TOTALS. It holds the ruling record's frozen key set, the W/L/T
// sequence in the order it happened, the e-value that sequence attained, whether any
// record still reachable inside the budget crosses, and the verdict. It imports
// nothing, reads no file and reads no clock: `now` arrives on the call, the rule
// arrives as data, and the rulings arrive already selected (ADR-006 §4).
//
// ── IT NEVER SEES A DIGEST, WHICH IS STRONGER THAN FORBIDDING IT TO SUM ACROSS TWO ──
//
// Which rulings were rendered under the criterion in force is a question about
// criterion IDENTITY, and it is answered in `criterion.mjs` by
// `rulingsUnderCurrentCriterion` (ADR-005 §1a). This module receives a list and totals
// the list. So "the accrual spanned a criterion change" is not a path that has to be
// checked for and refused here — it is NOT EXPRESSIBLE in the module that does the
// summing (ADR-006 §4a). Nothing below reads, compares or names a criterion's
// identity; the frozen key set carries the key as data, and the value is stored and
// handed back untouched.
//
// That is the whole shape of the reset: a criterion that moves resets the accrual by
// construction, against an editor, a script, a merge and a bypassed guard alike,
// because it does not depend on anything having observed the write.
//
// ── AND A LOSS MULTIPLIES ────────────────────────────────────────────────────────
//
// Wealth carries as the product of every pair so far. Two ways of handling a loss both
// look like rigour and both are wrong: resetting the run throws away every pair
// already paid for and attains exactly `2^-N`, and killing the proposal on its first
// loss drives the rate at which anything ever commits towards zero — the off switch
// this milestone exists to refuse. There is no code path below that zeroes a ledger or
// drops a proposal on a loss (ADR-001 §3).
//
// What CAN end a proposal is arithmetic. Once no record reachable inside the remaining
// budget crosses, the state is `budget-exhausted` and it is its own name: reporting it
// as `evidence-short` would be the machine lying about its own evidence, because no
// amount of further evidence can reach it (ADR-001 §3a).

// ── THE RULING RECORD (ADR-006 §3) ───────────────────────────────────────────────
//
// The frozen key set, and it is exactly SPIKE §6's missing "why". A record missing any
// of them is refused AT CONSTRUCTION and again AT ASSEMBLY rather than rendered blank
// — a blank in the record justifying a configuration change is precisely the missing
// "why" this ledger exists to supply.
//
// `dwell` AND `dwellFrom`, AND NO COMPUTED EXPIRY. The declaration as read plus the
// epoch the change landed at. Nothing in this system counts a cycle of the receiving
// loop, so an expiry would be a fabricated conversion from a cycle count to a clock —
// banned by name (ADR-010 §5, 52/ADR-006 §5). There is no `dwellExpiry` here and there
// is no arithmetic below that could produce one.
export const RULING_KEYS = Object.freeze([
  "key",
  "from",
  "to",
  "epochId",
  "criterion",
  "ledger",
  "evalue",
  "counterMetric",
  "dwell",
  "dwellFrom",
  "provenance",
  "verdict",
  "refusals",
]);

// The four things a pair can be. Spelled here AND in `rule.mjs`, because two
// zero-import leaves cannot share a constant (ADR-006 §4); the arch control asserts
// the two spellings are identical rather than trusting them to stay so.
export const PAIR_OUTCOMES = Object.freeze({
  FAVOURABLE: "favourable",
  UNFAVOURABLE: "unfavourable",
  TIE: "tie",
  UNMEASURABLE: "unmeasurable",
});

// ADR-010 §2's two states for a live proposal, and they are NEVER interchangeable.
export const EVIDENCE_SHORT = "evidence-short";
export const BUDGET_EXHAUSTED = "budget-exhausted";

export const VERDICTS = Object.freeze({ COMMIT: "commit", REPORT_ONLY: "report-only" });

export const RULING_INCOMPLETE = "ruling-incomplete";
export const LEDGER_INCOMPLETE = "ledger-incomplete";

// The e-process starts at 1 — no evidence yet, and no wealth won or lost. It is the
// level a proposal with nothing recorded reports, which is how "nothing recorded" is
// told apart from "everything lost".
export const INITIAL_WEALTH = 1;

export class LedgerError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "LedgerError";
    this.code = code;
    Object.assign(this, details);
  }
}

function refuse(code, message, details = {}) {
  throw new LedgerError(code, message, details);
}

// A part of the record is missing when it is absent, undefined or null. `null` counts
// as missing deliberately: a key present and blank is the blank this refuses.
function missingParts(fields) {
  return RULING_KEYS.filter((part) => !Object.hasOwn(fields ?? {}, part) || fields[part] === undefined || fields[part] === null);
}

// makeRuling(fields) — construction, refusing rather than warning. A warning here
// produces a record that a configuration change was justified by something nobody can
// read.
export function makeRuling(fields = {}) {
  const missing = missingParts(fields);
  if (missing.length > 0) {
    refuse(
      RULING_INCOMPLETE,
      `Refusing the ruling: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} missing. A ruling is the record justifying a configuration change, and a blank in it is the missing "why".`,
      { part: missing[0], parts: missing },
    );
  }
  const record = {};
  // Written key by key OFF THE FROZEN SET, so the record carries exactly those keys in
  // that order and no key of this module's choosing — and so no key is read by name.
  for (const part of RULING_KEYS) record[part] = fields[part];
  return Object.freeze(record);
}

// assembleLedger(rulings) — the SECOND refusal (ADR-006 §3). A record already on disk
// was not necessarily written through the constructor, so the same completeness is
// re-asserted at assembly, naming which ruling and which part.
export function assembleLedger(rulings = []) {
  const list = Array.isArray(rulings) ? rulings : [];
  const assembled = [];
  for (let at = 0; at < list.length; at += 1) {
    const missing = missingParts(list[at]);
    if (missing.length > 0) {
      refuse(
        LEDGER_INCOMPLETE,
        `Refusing to assemble the ledger: the ruling at position ${at} is missing ${missing.join(", ")}. It is not rendered with a blank in it.`,
        { at, part: missing[0], parts: missing, ruling: list[at] },
      );
    }
    assembled.push(list[at]);
  }
  return Object.freeze(assembled);
}

// ── THE SEQUENCE AND WHAT IT ATTAINED ────────────────────────────────────────────

const isDiscordant = (outcome) => outcome === PAIR_OUTCOMES.FAVOURABLE || outcome === PAIR_OUTCOMES.UNFAVOURABLE;

// The sequence IN THE ORDER IT WAS RECORDED. Nothing below sorts it: the order a
// proposal's evidence arrived in is part of the record, and a sorted sequence is a
// different record that happens to have the same totals.
export function tally(sequence = []) {
  const list = Array.isArray(sequence) ? [...sequence] : [];
  return Object.freeze({
    sequence: Object.freeze(list),
    wins: list.filter((outcome) => outcome === PAIR_OUTCOMES.FAVOURABLE).length,
    losses: list.filter((outcome) => outcome === PAIR_OUTCOMES.UNFAVOURABLE).length,
    ties: list.filter((outcome) => outcome === PAIR_OUTCOMES.TIE).length,
    unmeasurable: list.filter((outcome) => outcome === PAIR_OUTCOMES.UNMEASURABLE).length,
  });
}

// attained(counts, rule) — the wealth, and THE ONLY e-value derivation in `src/`.
//
// It is a function of the COUNTS rather than of the order, which is what makes
// "the order pairs arrived in does not change what they attained" a property of the
// arithmetic rather than a coincidence of floating-point associativity. Ties and
// unmeasurable pairs are absent from it by construction: a tie is discarded and an
// unmeasurable pair never happened.
export function attained({ wins = 0, losses = 0 } = {}, rule) {
  return Math.pow(rule.win, wins) * Math.pow(rule.loss, losses);
}

// The running wealth, pair by pair. The commit condition is tested after EVERY pair —
// that is what anytime-validity buys — so a run that clears the level at its eleventh
// pair commits there and is not held back until any fixed number of pairs is reached.
function traceOf(sequence, rule) {
  const trace = [];
  let wealth = INITIAL_WEALTH;
  let crossedAtPair = null;
  for (let at = 0; at < sequence.length; at += 1) {
    const outcome = sequence[at];
    if (outcome === PAIR_OUTCOMES.FAVOURABLE) wealth *= rule.win;
    else if (outcome === PAIR_OUTCOMES.UNFAVOURABLE) wealth *= rule.loss;
    trace.push(Object.freeze({ pair: at + 1, outcome, wealth }));
    if (crossedAtPair == null && wealth >= rule.level) crossedAtPair = at + 1;
  }
  return { trace: Object.freeze(trace), crossedAtPair };
}

// The first-crossing record at a given loss count, taken from the lattice the rule was
// derived with. A record beyond the lattice's last row is not reachable by definition —
// the budget cannot hold that many losses — and the report says so rather than
// inventing a row.
function crossingAt(rule, losses) {
  return rule.crossings.find((row) => row.losses === losses) ?? null;
}

// evaluateRun(input, rule, { now }) — the whole evaluation, from a sequence or from
// counts.
//
// THE BUDGET TRUNCATES; IT DOES NOT REFUSE. A run may be evaluated over as many
// discordant pairs as the budget declares and no more, and the pairs past it are
// reported as not admitted rather than silently folded in — extending a budget
// mid-flight to reach for a crossing is optional stopping in the budget dimension
// (ADR-001 §2).
export function evaluateRun(input = {}, rule, { now = null } = {}) {
  const supplied = Array.isArray(input) ? input : Array.isArray(input?.sequence) ? input.sequence : null;
  const sequence = supplied ?? countsToSequence(input);

  const admitted = [];
  const notAdmitted = [];
  let discordant = 0;
  for (const outcome of sequence) {
    if (isDiscordant(outcome) && discordant >= rule.budget) {
      notAdmitted.push(outcome);
      continue;
    }
    if (isDiscordant(outcome)) discordant += 1;
    admitted.push(outcome);
  }

  const counts = tally(admitted);
  const wealth = attained(counts, rule);
  const commits = wealth >= rule.level;
  const pairs = counts.wins + counts.losses;
  const budgetRemaining = rule.budget - pairs;
  const next = crossingAt(rule, counts.losses);
  // REACHABILITY, COMPUTED FROM THE LATTICE AND NEVER ASSERTED. Adding a loss only
  // pushes the crossing further out, so the best case is spending every remaining pair
  // on a win: the crossing at the CURRENT loss count is reachable exactly when the
  // wins it still needs fit inside the budget that is left.
  const winsStillNeeded = next == null ? null : Math.max(0, next.wins - counts.wins);
  const recoverable = next != null && winsStillNeeded <= budgetRemaining;
  const state = commits ? VERDICTS.COMMIT : recoverable ? EVIDENCE_SHORT : BUDGET_EXHAUSTED;
  const { trace, crossedAtPair } = traceOf(admitted, rule);

  return Object.freeze({
    ...counts,
    pairs,
    recorded: admitted.length,
    started: admitted.length > 0,
    record: `${counts.wins}-${counts.losses}`,
    wealth,
    startedFrom: INITIAL_WEALTH,
    level: rule.level,
    commits,
    verdict: commits ? VERDICTS.COMMIT : VERDICTS.REPORT_ONLY,
    state,
    refusals: Object.freeze(commits ? [] : [state]),
    recoverable,
    // A losing proposal is still a proposal. Nothing here drops one, and this says so
    // on the record rather than by the absence of a drop (ADR-001 §3).
    dropped: false,
    budget: rule.budget,
    budgetRemaining,
    admittedPairs: Object.freeze(admitted),
    notAdmitted: Object.freeze(notAdmitted),
    // The four quantities ADR-010 §2a requires of a live proposal, every one computed
    // from the lattice: the record, the attained wealth against the level, the next
    // record that would cross with the pair it falls at, and the pairs remaining.
    nextCrossing: next,
    winsStillNeeded,
    crossedAtPair,
    trace,
    observedTieRate: observedTieRate(counts),
    readAt: now,
  });
}

// Counts in, a canonical sequence out — LOSSES FIRST, which is the worst ordering a
// record of that shape could have had. It matters because the process is tested after
// every pair: a run that took its losses last may have crossed earlier and stopped, so
// a record that reached the ledger with that shape is one whose losses came early
// enough not to. Reading counts the other way would credit a crossing the record does
// not evidence.
function countsToSequence({ wins = 0, losses = 0, ties = 0, unmeasurable = 0 } = {}) {
  return [
    ...Array.from({ length: losses }, () => PAIR_OUTCOMES.UNFAVOURABLE),
    ...Array.from({ length: wins }, () => PAIR_OUTCOMES.FAVOURABLE),
    ...Array.from({ length: ties }, () => PAIR_OUTCOMES.TIE),
    ...Array.from({ length: unmeasurable }, () => PAIR_OUTCOMES.UNMEASURABLE),
  ];
}

// The tie rate ACTUALLY OBSERVED, over the pairs a comparison was performed on.
// Unmeasurable pairs are not in the denominator: no comparison was made on them, so
// they are neither ties nor non-ties.
export function observedTieRate({ wins = 0, losses = 0, ties = 0 } = {}) {
  const compared = wins + losses + ties;
  return Object.freeze({ ties, compared, rate: compared === 0 ? null : ties / compared });
}

// ── THE ACCRUAL ──────────────────────────────────────────────────────────────────

// accrue({ rulings, rule, now, open }) — the total over the rulings handed in.
//
// THE MILESTONE IS RECORDED AND REPORTED, AND IT IS NOT A FILTER (ADR-006 §1). A
// ledger scoped to one milestone would be the off switch wearing a discipline's
// clothes: at a measured yield below one discordant pair per milestone such a counter
// can never exceed one, so the acceptor could never fire and nobody would be able to
// see why. `open` is carried into the report as provenance and is consulted by
// nothing — there is no parameter here through which a currently-open milestone could
// reach the answer.
//
// `now` is likewise recorded and never arithmetic: the answer does not depend on when
// it is asked.
export function accrue({ rulings = [], rule = null, now = null, open = null } = {}) {
  const assembled = assembleLedger(rulings);
  const sequence = assembled.flatMap((ruling) => (Array.isArray(ruling.ledger) ? ruling.ledger : ruling.ledger?.sequence ?? []));
  const evaluation = rule == null ? null : evaluateRun(sequence, rule, { now });
  const counts = tally(sequence);
  const epochs = [...new Set(assembled.map((ruling) => ruling.epochId))];
  return Object.freeze({
    total: assembled.length,
    rulings: assembled,
    empty: assembled.length === 0,
    // Read, and read successfully. An empty ledger totals nothing and says so; it is
    // not a failure to read one, and the two must never render the same.
    read: true,
    epochs: Object.freeze(epochs),
    epochsCounted: epochs.length,
    open,
    // The sequence in the order it was recorded, across every ruling in the run.
    sequence: Object.freeze([...sequence]),
    ...counts,
    evaluation,
    held: counts.wins,
    crossesAt: evaluation?.nextCrossing?.wins ?? null,
    budgetRemaining: evaluation?.budgetRemaining ?? null,
    commits: evaluation?.commits ?? false,
    tieRate: Object.freeze({
      declared: rule?.tieRate ?? null,
      observed: observedTieRate(counts),
      // The FIRST ruling under a criterion records the rate that was observed, and the
      // declared one is reported beside it thereafter (ADR-002 §4). A declared rate
      // that survives its own contradiction is the p-hack one level up.
      first: assembled.length === 0 ? null : observedTieRate(tally(Array.isArray(assembled[0].ledger) ? assembled[0].ledger : assembled[0].ledger?.sequence ?? [])),
    }),
    readAt: now,
  });
}
