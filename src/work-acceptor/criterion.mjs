// src/work-acceptor/criterion.mjs — THE EPOCH, THE FROZEN CRITERION AND THE SELECTOR
// (milestone 61 / ADR-004, ADR-005).
//
// The criterion is everything the acceptor scores by. A criterion that can move while it
// is scoring makes every number after it uninterpretable — not wrong, worse: honest
// arithmetic over a ruler that changed length halfway. That is the p-hack one level up,
// where the number is honest and the yardstick is not.
//
// THREE LAYERS, AND THE LOAD-BEARING ONE IS ARITHMETIC (ADR-005). Each has a limit, and
// each limit is stated here rather than implied:
//
//   1. `rulingsUnderCurrentCriterion` — the maximal trailing run of rulings sharing the
//      criterion in force. A criterion that moves resets the accrual BY CONSTRUCTION:
//      there is no path that adds a ruling rendered under a different one, so evidence
//      straddling the change is not refused, it is unrepresentable. This holds against an
//      editor, a script, a merge and a bypassed guard alike, because it does not depend on
//      anything having observed the write. It lives HERE and not in the ledger because
//      *which rulings were rendered under the criterion in force* is a question about
//      criterion identity, not about e-value arithmetic — and an enforcement point homed
//      in another module's file is an enforcement point nobody owns (ADR-005 §1a).
//   2. `writeCriterion` — the one writer seam, refusing a mid-epoch write with
//      `criterion-frozen-in-epoch`. Its limit: it binds writes that come through the seam.
//   3. the sixth frozen-set member, `acceptor-criterion`, at `permission denials`
//      (`src/bundle/frozen-set.jsonc`). Its limit: it stops an AGENT, and only an agent.
//
// THE ACCEPTOR SPELLS NO LIFECYCLE LITERAL. The boundary resolves through `closesEpoch`
// in `src/acceptance-horizon.mjs`, the zero-import leaf that owns what the closed status
// means (ADR-004 §2). No status word appears anywhere in this file, which is what keeps
// 66/FF-6602's "the frozen five have ONE home" leg true from this milestone's side.
//
// AND IT SPELLS NO KNOB KEY. The tunable set is the REGISTRY's — the arbiter record's
// `parameter-tuning:` edge — never a list this module writes (ADR-008 §4, ADR-009 §5),
// and the floors and ceilings are each bound's own resolver's (ADR-009 §2). What the
// criterion freezes is a project's DECLARED overrides of them, which is why the
// framework's own default carries an empty `tunables` map rather than three key literals.
import path from "node:path";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { closesEpoch } from "../acceptance-horizon.mjs";
import { bundledFrozenSet, readFrozenSet } from "../frozen-set.mjs";

// The two acceptor records. Both are named by the sixth frozen-set member, and both are
// git-tracked beside the config they justify (ADR-006 §2).
export const CRITERION_RELPATH = ".aof/acceptor-criterion.jsonc";
export const LEDGER_RELPATH = ".aof/acceptor-ledger.jsonl";

// THE ACCEPTOR'S OWN DECLARATION OF ITS EPOCH, and the argument for the value.
//
// One epoch is one milestone, and that is not a convenience: an acceptor whose epoch
// differs from the cadence of the loop auditing its instruments is trusting instruments
// audited on a different clock (ADR-004 §3, SPIKE §8). The auditor declares
// `cadence: event:per-milestone` on its own record (`.aof/loops/instrument-audit.md`);
// this constant is the acceptor's own declaration of the same fact, and the two are
// COMPARED rather than one being read out of the other — a value restated inside the
// other's file is not a second declaration, it is a copy.
export const ACCEPTOR_EPOCH_SPAN = "milestone";
export const ACCEPTOR_EPOCH_CADENCE = "event:per-milestone";

// THE FOUR FROZEN MEMBERS (ADR-004 §4), each naming the criterion keys it covers.
//
// The distinction worth arguing is the second one. `alpha`, `lambda`, `N`, `B` and the
// declared tie rate are ONE member, not five, and they are one member for TWO reasons that
// both have to be carried:
//   • `N` is a function of `lambda` and `alpha`, so a criterion that froze `N` alone would
//     let it drift by re-choosing `lambda` — the guard would report as held while the bar
//     moved (SPIKE §8). The tie rate is in the same member for the same reason: the raw
//     pair budget is `ceil(B * d / (d - n))` over it (ADR-003 §2a).
//   • `B` is derived from nothing — it is a CHOICE — and lengthening a run mid-flight to
//     reach for a crossing it has not made is the same p-hack one axis over: optional
//     stopping in the budget dimension rather than in the yardstick (ADR-001 §2).
// Freezing three of four is therefore not expressible: they move together at a boundary or
// not at all.
export const FROZEN_CRITERION_MEMBERS = Object.freeze([
  Object.freeze({
    id: "trial-metric",
    covers: Object.freeze(["metric", "counter"]),
    describes: "the trial metric and its paired counter-metric",
  }),
  Object.freeze({
    id: "evidence-threshold",
    covers: Object.freeze(["alpha", "lambda", "N", "B", "tieRate"]),
    describes: "alpha, lambda, the pair count they give, the declared tie rate and the pair budget a run is truncated at",
  }),
  Object.freeze({
    id: "tunable-set",
    covers: Object.freeze(["tunables", "trialCeilingUsd"]),
    describes: "the membership of the knob set with its floors and ceilings, and the price ceiling a trial may not exceed",
  }),
  Object.freeze({
    id: "frozen-set",
    covers: Object.freeze(["frozenSet"]),
    describes: "the frozen set itself",
  }),
]);

// Every frozen quantity, flattened — and the criterion has NO key outside it, so "the
// criterion moved" and "a frozen member moved" are the same statement rather than two that
// have to be kept in step.
export const FROZEN_CRITERION_KEYS = Object.freeze(FROZEN_CRITERION_MEMBERS.flatMap((member) => [...member.covers]));

// The coded refusals. A refusal an operator cannot act on gets bypassed, and a bypassed
// guard is the state this story exists to leave — so every one of these names the part
// that was touched rather than reporting that something was.
export const CRITERION_FROZEN_IN_EPOCH = "criterion-frozen-in-epoch";
export const CRITERION_REVISION_NOT_OPERATOR = "criterion-revision-not-operator";
export const CRITERION_PAIR_COUNT_DERIVED = "criterion-pair-count-derived";
export const CRITERION_BUDGET_BELOW_PAIR_COUNT = "criterion-budget-below-pair-count";
export const CRITERION_INCOMPLETE = "criterion-incomplete";
export const EPOCH_SPAN_NOT_REQUESTABLE = "epoch-span-not-requestable";

// The revising actor (ADR-004 §5): the registry's sole exogenous contact with reality
// (`src/bundle/loops/operator.md`, `ground: exogenous`), which is what keeps the root
// reference outside the loop being tuned.
export const REVISING_ACTOR = "actor:operator";

// What the refusal points at. It carries no lifecycle word, deliberately: this module
// spells none (ADR-004 §2, FF-6104).
const BOUNDARY_DESCRIPTION = "the next epoch boundary — a milestone's transition into acceptance";

export class CriterionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "CriterionError";
    this.code = code;
    Object.assign(this, details);
  }
}

// pairCountFor(alpha, lambda) — `N = ceil(ln(1/alpha) / ln(1 + lambda))`, the earliest
// crossing any path can reach (ADR-001 §1a). It is COMPUTED, never typed: a literal 8 is a
// number that survives a change to either input, and SPIKE §Lane C's own caveat is that
// lambda rests on an attribution that could not be independently verified — if it is
// wrong, N must be re-derived rather than re-asserted.
export function pairCountFor(alpha, lambda) {
  return Math.ceil(Math.log(1 / alpha) / Math.log(1 + lambda));
}

// The framework's own criterion. DEFAULTS IN CODE, REVISIONS IN THE PROJECT, NO THIRD
// STATE (ADR-004 §6): shipping this as a bundle asset would make an operator's boundary
// revision read as install drift on the next `aof work update`, and 55/ADR-004 §5 makes
// drift on a frozen member a TAMPER. So nothing has to be installed into a project for it
// to have a criterion, and a project that revises one owns that file outright.
export function defaultCriterion() {
  return makeCriterion({
    // Pointers, never names in the engine (ADR-002 §5). Swapping either is an
    // epoch-boundary act, and it resets the ledger.
    metric: "module:src/work/counters.mjs#roundsToAccept",
    counter: "module:src/work/counters.mjs#countFindingEscapes",
    alpha: 0.05,
    lambda: 0.5,
    // The declared tie rate as a RATIONAL with integer terms — 50% (ADR-002 §3). The
    // rational is the point: `ceil(11 / 0.1)` is 111 in IEEE-754 and 110 in integers, and
    // this exact computation has already produced a wrong number once (ADR-003 §2a).
    tieRate: { n: 1, d: 2 },
    // `B` is the one number here that is a choice rather than a derivation: the smallest
    // budget at which a proposal that has lost a pair can still commit, so the wealth-carry
    // is operative rather than decorative (ADR-001 §2a).
    B: 11,
    // EMPTY BY CONSTRUCTION, not by omission. The membership is the arbiter record's
    // `parameter-tuning:` edge and the ranges are each bound's own resolver's; a default
    // spelling three knob keys here would make this module a second home for both
    // (ADR-008 §4, ADR-009 §2, ADR-009 §5). What a project declares here are its
    // OVERRIDES, and freezing them is freezing what it declared.
    tunables: {},
    trialCeilingUsd: 1500,
    // The frozen set is itself a frozen member (ADR-004 §4). It is carried as the member
    // ids the declaration ships, so a member arriving or leaving moves the criterion and
    // resets the accrual — which is the whole reason it is on this list.
    frozenSet: bundledFrozenSet().members.map((member) => member.id),
  });
}

function refuse(code, message, details = {}) {
  throw new CriterionError(code, message, details);
}

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

// makeCriterion(fields) — construction, with every refusal coded and every derived
// quantity derived. A criterion is refused rather than warned about: a warning here
// produces a record that a broken yardstick was used.
export function makeCriterion(fields = {}) {
  if (fields == null || typeof fields !== "object" || Array.isArray(fields)) {
    refuse(CRITERION_INCOMPLETE, "Refusing the criterion: it must be an object.");
  }
  const criterion = {};
  for (const key of ["metric", "counter"]) {
    if (typeof fields[key] !== "string" || fields[key].length === 0) {
      // ADR-002 §2: a criterion declaring a metric without a counter-metric is refused at
      // construction. Fewer rounds bought by accepting worse work is not an improvement.
      refuse(CRITERION_INCOMPLETE, `Refusing the criterion: "${key}" is required and must be a declared pointer.`, { part: key });
    }
    criterion[key] = fields[key];
  }
  for (const [key, ok] of [["alpha", (v) => isFiniteNumber(v) && v > 0 && v < 1], ["lambda", (v) => isFiniteNumber(v) && v > 0 && v < 1]]) {
    if (!ok(fields[key])) {
      // `lambda = 1` makes the loss multiplier `(1 - lambda)` zero and annihilates wealth
      // on a loss — the hard reset ADR-001 rejects, admitted through the parameter.
      refuse(CRITERION_INCOMPLETE, `Refusing the criterion: "${key}" must be a number strictly between 0 and 1 (got ${JSON.stringify(fields[key])}).`, { part: key });
    }
    criterion[key] = fields[key];
  }

  const rate = fields.tieRate;
  if (rate == null || typeof rate !== "object" || !Number.isInteger(rate.n) || !Number.isInteger(rate.d) || rate.d <= 0 || rate.n < 0 || rate.n >= rate.d) {
    refuse(CRITERION_INCOMPLETE, `Refusing the criterion: "tieRate" must be a rational n/d with integer terms and 0 <= n < d (got ${JSON.stringify(rate)}).`, { part: "tieRate" });
  }
  criterion.tieRate = Object.freeze({ n: rate.n, d: rate.d });

  // N IS DERIVED, AND A STATED N THAT DISAGREES IS REFUSED. Pinning a derived quantity
  // while the quantities it comes from move is exactly how a frozen bar drifts while the
  // guard reports it held.
  const derivedN = pairCountFor(criterion.alpha, criterion.lambda);
  if (Object.hasOwn(fields, "N") && fields.N !== derivedN) {
    refuse(
      CRITERION_PAIR_COUNT_DERIVED,
      `Refusing the criterion: it states a pair count of ${JSON.stringify(fields.N)}, but alpha ${criterion.alpha} and lambda ${criterion.lambda} give ${derivedN}. N is derived from those two and is never typed.`,
      { part: "N", stated: fields.N, derived: derivedN },
    );
  }
  criterion.N = derivedN;

  if (!Number.isInteger(fields.B) || fields.B <= 0) {
    refuse(CRITERION_INCOMPLETE, `Refusing the criterion: "B" must be a positive whole number of pairs (got ${JSON.stringify(fields.B)}).`, { part: "B" });
  }
  if (fields.B < derivedN) {
    // A budget below the earliest crossing funds a trial that cannot reach its own first
    // crossing — a rule that can never fire, which is the off switch SPIKE §5 names.
    refuse(
      CRITERION_BUDGET_BELOW_PAIR_COUNT,
      `Refusing the criterion: the pair budget B is ${fields.B}, below the pair count N of ${derivedN} that its confidence and bet fraction give. A run truncated at ${fields.B} pairs can never reach the earliest crossing at ${derivedN}.`,
      { part: "B", budget: fields.B, pairCount: derivedN },
    );
  }
  criterion.B = fields.B;

  const tunables = fields.tunables ?? {};
  if (tunables == null || typeof tunables !== "object" || Array.isArray(tunables)) {
    refuse(CRITERION_INCOMPLETE, "Refusing the criterion: \"tunables\" must be an object of declared knob ranges.", { part: "tunables" });
  }
  criterion.tunables = Object.freeze(structuredClone(tunables));

  if (!isFiniteNumber(fields.trialCeilingUsd) || fields.trialCeilingUsd <= 0) {
    refuse(CRITERION_INCOMPLETE, `Refusing the criterion: "trialCeilingUsd" must be a positive price ceiling (got ${JSON.stringify(fields.trialCeilingUsd)}).`, { part: "trialCeilingUsd" });
  }
  criterion.trialCeilingUsd = fields.trialCeilingUsd;

  if (!Array.isArray(fields.frozenSet) || fields.frozenSet.some((id) => typeof id !== "string" || id.length === 0)) {
    refuse(CRITERION_INCOMPLETE, "Refusing the criterion: \"frozenSet\" must be the list of frozen-set member ids in force.", { part: "frozenSet" });
  }
  criterion.frozenSet = Object.freeze([...fields.frozenSet]);

  return Object.freeze(criterion);
}

// Canonical JSON over the frozen keys, in sorted key order — so a digest is a property of
// the criterion's VALUES and not of how a writer happened to serialise them.
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value != null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

const sha = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);

// criterionDigest(criterion) — the identity every ruling is rendered under.
//
// It is an OBJECT, not a bare string, and that is the decision: it carries `digest` (the
// whole criterion's identity, which is what the accrual selects on) AND `members` (one
// digest per frozen member). The per-member digests are what let a surface say WHICH part
// moved, which the reporting half of ADR-005 §1 requires and a single opaque hash cannot
// supply. It adds no key to the ruling record — ADR-006 §3's `criterion` key carries it —
// so `RULING_KEYS` is untouched.
export function criterionDigest(criterion) {
  const members = {};
  for (const member of FROZEN_CRITERION_MEMBERS) {
    members[member.id] = sha(canonical(Object.fromEntries(member.covers.map((key) => [key, criterion?.[key] ?? null]))));
  }
  return Object.freeze({
    digest: sha(canonical(Object.fromEntries(FROZEN_CRITERION_KEYS.map((key) => [key, criterion?.[key] ?? null])))),
    members: Object.freeze(members),
  });
}

// A ruling may carry the digest object or a bare digest string. Both are read the same way
// here, so a record written by either shape selects identically.
export function digestValue(digest) {
  if (typeof digest === "string") return digest;
  return typeof digest?.digest === "string" ? digest.digest : null;
}

const memberDigests = (digest) => (digest != null && typeof digest === "object" ? digest.members ?? null : null);

// readCriterion(projectDir) — the project's record when it has one, the framework's own
// otherwise. `readFrozenSet`'s exact ENOENT shape (`src/frozen-set.mjs:42-58`), for the
// same reason: an absent file is a project that has never revised, not a fault.
export async function readCriterion(projectDir) {
  const file = path.join(projectDir, ...CRITERION_RELPATH.split("/"));
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    // A project that has never revised gets the framework's own criterion — carrying the
    // frozen set THAT PROJECT declares, because the frozen set is one of the four frozen
    // members (ADR-004 §4). Taking the bundle's list unconditionally would make that
    // member decorative in every project whose declaration has diverged from it — a
    // frozen quantity that cannot move is the structurally-silent shape this milestone
    // exists to refuse, installed one level down. `readFrozenSet` falls back to the
    // bundle, so an untouched project gets exactly `defaultCriterion()`.
    const declared = await readFrozenSet(projectDir);
    return makeCriterion({ ...defaultCriterion(), frozenSet: declared.members.map((member) => member.id) });
  }
  let parsed = null;
  try {
    parsed = JSON.parse(String(text).replace(/^\s*\/\/[^\r\n]*(?:\r?\n|$)/, ""));
  } catch {
    refuse(CRITERION_INCOMPLETE, `Refusing the criterion: ${file} is not parseable JSON.`, { path: file });
  }
  return makeCriterion(parsed);
}

// epochFor(milestone, request) — the epoch a milestone's close ends (ADR-004 §1b).
//
// `epochId` is the ref of that milestone, so it always resolves and is never a guess; the
// span is one milestone and is read from this module's own declaration.
//
// THE SPAN IS NOT A PARAMETER, AND THE SECOND ARGUMENT EXISTS TO REFUSE ONE. A window
// chosen at the moment of asking is p-hacking by choice of window — the same act this
// whole story refuses, one level up — so a request that offers a span of its own is a
// coded refusal rather than an override that silently wins (ADR-004 §3).
export function epochFor(milestone, request = {}) {
  const offered = ["span", "epoch", "since", "until", "range", "cadence", "window"]
    .filter((key) => request != null && Object.hasOwn(request, key));
  if (offered.length > 0) {
    refuse(
      EPOCH_SPAN_NOT_REQUESTABLE,
      `Refusing the ruling: a span was offered alongside the request (${offered.join(", ")}). The epoch resolves from the declared unit — one ${ACCEPTOR_EPOCH_SPAN} — and from nothing chosen at the moment of asking.`,
      { offered, span: ACCEPTOR_EPOCH_SPAN },
    );
  }
  const ref = typeof milestone === "string" ? milestone : milestone?.ref ?? null;
  const status = typeof milestone === "string" ? undefined : milestone?.status;
  const closed = closesEpoch(status);
  return Object.freeze({
    epochId: ref,
    milestone: ref,
    span: ACCEPTOR_EPOCH_SPAN,
    cadence: ACCEPTOR_EPOCH_CADENCE,
    closed,
    state: closed ? "closed" : "open",
    // Provenance, never a predicate: recorded because a reader wants to know, consulted by
    // nothing (ADR-004 §1).
    from: typeof milestone === "string" ? null : milestone?.from ?? null,
  });
}

// criterionRevisionWindow({ lastClose, rulings }) — is the criterion revisable right now?
//
// ADR-004 §1b, stated operationally: the window is open exactly while the ledger holds no
// ruling rendered after the most recent milestone close. You may re-choose the yardstick
// before you start measuring, and never after.
//
// IT IS COMPUTED FROM TWO RECORD SOURCES AND FROM NEITHER OF THE TEMPTING ONES. The
// milestone closes are facts in the effects journal and the rulings are the ledger's; both
// arrive as arguments, so this stays pure. The reading it replaces — identify the open
// epoch with the OPEN MILESTONES — is an off switch and the measurement says so: `isOpen`
// admits seven milestones in this repository today, so the criterion would be frozen
// permanently and "at a boundary" would be a zero-width window. There is no parameter here
// through which a set of open milestones could reach the answer.
export function criterionRevisionWindow({ lastClose = null, rulings = [] } = {}) {
  const closedAt = lastClose?.at ?? null;
  const since = (rulings ?? []).filter((ruling) => {
    if (ruling == null) return false;
    if (closedAt == null) return true;
    return String(ruling.at ?? "") > String(closedAt);
  });
  const atBoundary = since.length === 0;
  const closedEpochId = lastClose?.epochId ?? lastClose?.ref ?? null;
  return Object.freeze({
    atBoundary,
    rulingsSinceClose: since.length,
    // The epoch that ENDED at the last close — the one a ruling rendered here scores.
    closedEpoch: closedEpochId,
    // The epoch now running. It has no id of its own yet (it gets one when it closes), so
    // it is named by the close that opened it — a name a refusal can print and an operator
    // can act on.
    openEpoch: atBoundary ? null : `since:${closedEpochId ?? "origin"}`,
    boundary: BOUNDARY_DESCRIPTION,
  });
}

// The frozen parts that differ between two criteria, named. `[]` means unchanged — and
// that is reported rather than assumed, because an unchanged criterion nobody checked
// renders identically to one that did not move.
export function criterionDifference(before, after) {
  const moved = [];
  for (const member of FROZEN_CRITERION_MEMBERS) {
    for (const key of member.covers) {
      if (canonical(before?.[key] ?? null) === canonical(after?.[key] ?? null)) continue;
      moved.push(Object.freeze({ member: member.id, part: key, from: before?.[key] ?? null, to: after?.[key] ?? null }));
    }
  }
  return Object.freeze(moved);
}

// reviseCriterion(current, next, { window, actor }) — LAYER 2, the coded writer refusal.
//
// Its limit, stated rather than implied: it binds revisions that come through it, and
// nothing else. A permission cannot see a command writing through its own process, a
// script, a merge or a human in an editor — so this is not the enforcement, layer 1 is.
// What this buys is that the ordinary path is honest.
export function reviseCriterion(current, next = {}, { window = null, actor = REVISING_ACTOR } = {}) {
  if (actor !== REVISING_ACTOR) {
    refuse(
      CRITERION_REVISION_NOT_OPERATOR,
      `Refusing the criterion revision: "${actor}" may not revise the criterion. Only ${REVISING_ACTOR} may, and only at ${BOUNDARY_DESCRIPTION}.`,
      { actor, requiredActor: REVISING_ACTOR, boundary: BOUNDARY_DESCRIPTION },
    );
  }

  const merged = { ...current, ...next };
  // `N` is derived, so a revision that moves what it comes from and leaves it as it was
  // gets the pair count those two now give — never the stale one it was carrying. A
  // revision that STATES an N is checked against them by `makeCriterion` instead.
  if (!Object.hasOwn(next ?? {}, "N")) merged.N = pairCountFor(merged.alpha, merged.lambda);

  // THE FROZEN REFUSAL PRECEDES CONSTRUCTION, and the order is the decision. Inside an
  // open epoch the answer is "not here, and not yet" whatever the proposed values are, so
  // a revision that is BOTH mid-epoch and malformed must be told about the epoch: telling
  // an operator their arithmetic is wrong, and only that, invites them to fix the number
  // and re-submit into the same closed window.
  const proposed = criterionDifference(current, merged);
  if (proposed.length > 0 && window != null && window.atBoundary === false) {
    const parts = proposed.map((entry) => entry.part);
    const members = [...new Set(proposed.map((entry) => entry.member))];
    refuse(
      CRITERION_FROZEN_IN_EPOCH,
      `Refusing the criterion revision: ${parts.join(", ")} ${parts.length === 1 ? "is" : "are"} frozen inside the open epoch ${window.openEpoch}. It may be revised at ${window.boundary}, and not before.`,
      {
        part: parts[0],
        parts,
        member: members[0],
        members,
        openEpoch: window.openEpoch,
        boundary: window.boundary,
        moved: proposed,
      },
    );
  }

  const revised = makeCriterion(merged);
  return Object.freeze({ criterion: revised, moved: criterionDifference(current, revised), digest: criterionDigest(revised) });
}

// writeCriterion(projectDir, next, opts) — THE ONE WRITER SEAM. The refusal above is
// raised before any bytes move, so a refused revision leaves the criterion in force
// exactly as it was.
export async function writeCriterion(projectDir, next = {}, { window = null, actor = REVISING_ACTOR } = {}) {
  const current = await readCriterion(projectDir);
  const outcome = reviseCriterion(current, next, { window, actor });
  const file = path.join(projectDir, ...CRITERION_RELPATH.split("/"));
  const body = `// The acceptor's criterion, revised at an epoch boundary by ${REVISING_ACTOR}. Not a bundle asset: aof never overwrites it.\n${JSON.stringify(outcome.criterion, null, 2)}\n`;
  // The directory is created only AFTER the refusal above has not fired — a refused
  // revision leaves no trace at all, not even an empty parent.
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, "utf8");
  return Object.freeze({ ...outcome, path: file });
}

// rulingsUnderCurrentCriterion(rulings, digest) — THE ENFORCEMENT POINT (ADR-005 §1a).
//
// The maximal TRAILING RUN of rulings sharing the criterion in force, oldest-first input.
//
// IT IS A SUFFIX AND NOT A FILTER, and that distinction is the subtle half. A criterion
// revised and later revised BACK to an earlier value does not resurrect the rulings
// rendered under the first occurrence: the evidence in between was gathered under a
// different yardstick, and a filter on digest equality would splice the two runs together
// — the straddling commit this whole layer exists to make unrepresentable.
export function rulingsUnderCurrentCriterion(rulings, digest) {
  const current = digestValue(digest);
  const list = Array.isArray(rulings) ? rulings : [];
  if (current == null) return Object.freeze([]);
  let start = list.length;
  while (start > 0 && digestValue(list[start - 1]?.criterion) === current) start -= 1;
  return Object.freeze(list.slice(start));
}

// accrualReport({ rulings, criterion, knobValues }) — the accrual, and the two questions a
// surface must answer either way.
//
// "The count went to zero" and "the count is zero because nothing has happened yet" are the
// same number with opposite meanings, so `state` distinguishes them; and an unchanged
// criterion is STATED rather than assumed, because a criterion nobody checked renders
// identically to one that did not move.
export function accrualReport({ rulings = [], criterion, knobValues = {} } = {}) {
  const digest = criterionDigest(criterion);
  const list = Array.isArray(rulings) ? rulings : [];
  const counted = rulingsUnderCurrentCriterion(list, digest);
  const superseded = list.slice(0, list.length - counted.length);
  const criterionMoved = superseded.length > 0;

  // WHICH part moved, named from the newest superseded ruling's own member digests. A
  // ruling carrying only a bare digest string cannot answer this, and the report says
  // `unknown` rather than inventing a member.
  let moved = [];
  if (criterionMoved) {
    const previous = memberDigests(superseded[superseded.length - 1]?.criterion);
    moved = previous == null
      ? [Object.freeze({ member: "unknown", describes: "the superseded ruling carries no per-member digest" })]
      : FROZEN_CRITERION_MEMBERS
        .filter((member) => previous[member.id] !== digest.members[member.id])
        .map((member) => Object.freeze({ member: member.id, describes: member.describes }));
  }

  // A knob whose value changed UNDER the accruing ledger is reported by name rather than
  // absorbed (ADR-005 §4). A knob move is what a commit is; what the machinery owes is that
  // the move is visible, not that it be forbidden.
  const knobChanges = [];
  const seen = new Set();
  for (let index = counted.length - 1; index >= 0; index -= 1) {
    const ruling = counted[index];
    const knob = ruling?.key;
    if (typeof knob !== "string" || seen.has(knob)) continue;
    seen.add(knob);
    if (!Object.hasOwn(knobValues ?? {}, knob)) continue;
    if (canonical(knobValues[knob]) === canonical(ruling.from ?? null)) continue;
    knobChanges.push(Object.freeze({ knob, from: ruling.from ?? null, to: knobValues[knob] }));
  }

  return Object.freeze({
    digest,
    counted: counted.length,
    rulings: counted,
    total: list.length,
    superseded: superseded.length,
    criterionMoved,
    carriedForward: !criterionMoved && counted.length > 0,
    state: criterionMoved ? "reset" : list.length === 0 ? "never-started" : "carried-forward",
    moved: Object.freeze(moved),
    knobChanges: Object.freeze(knobChanges),
  });
}
