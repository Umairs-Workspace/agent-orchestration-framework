import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { assetBase } from "../asset-base.mjs";
import { parseFrontmatter } from "../work.mjs";
import { resolvesLoopBoundConfigKey } from "../loop-bounds.mjs";

class FrozenSet {
  #values;

  constructor(values) {
    this.#values = new Set(values);
    Object.freeze(this);
  }

  get size() {
    return this.#values.size;
  }

  has(value) {
    return this.#values.has(value);
  }

  entries() {
    return this.#values.entries();
  }

  keys() {
    return this.#values.keys();
  }

  values() {
    return this.#values.values();
  }

  [Symbol.iterator]() {
    return this.#values[Symbol.iterator]();
  }

  forEach(callback, thisArg) {
    this.#values.forEach((value) => callback.call(thisArg, value, value, this));
  }

  add() {
    return this;
  }

  delete() {
    return false;
  }

  clear() {}
}

const frozenSet = (...values) => new FrozenSet(values);

// 59/ADR-001 §3 — `reporting` is the SIXTH edge key, declared OUTBOUND from an auditor to the node
// that should hear what it found. It is a sixth key and not a reuse of `monitoring` because
// `monitoring` already carries a settled meaning 57/01's independence legs read — *this node
// computes a counter-metric on that optimizer* — and overloading it would make an audit finding
// indistinguishable from a pairing.
export const EDGE_KEYS = frozenSet(
  "data-feed",
  "target-setting",
  "monitoring",
  "veto",
  "parameter-tuning",
  "reporting",
);

const IDENTITY_KEYS = ["id", "kind", "title"];
const CONTROL_KEYS = [
  "controlled",
  "reference",
  "measurement",
  "actuator",
  "cadence",
  "ceiling",
  "owner",
  "optimizing",
];

const LOOP_KEYS = frozenSet(...IDENTITY_KEYS, ...CONTROL_KEYS, "layer", ...EDGE_KEYS);
const ACTOR_KEYS = frozenSet(...IDENTITY_KEYS, "ground", ...EDGE_KEYS);
// 59/ADR-005 §2 — `checked:` is admitted on `kind: anchor` ALONE and is OPTIONAL, so it is absent
// from `REQUIRED_BY_KIND.anchor` below. An anchor that has never declared one is not stale; it is
// UNDATED, which is a third state and a real one.
const ANCHOR_KEYS = frozenSet(...IDENTITY_KEYS, "ground", "observes", "checked", ...EDGE_KEYS);
const WATCHER_KEYS = frozenSet(
  ...IDENTITY_KEYS,
  "counter",
  "determinism",
  "measurement",
  ...EDGE_KEYS,
);
// 58/ADR-003 §2/§3 — the arbiter's admitted keys are frozen HERE, and the four keys it omits
// are the point of the kind: no `actuator` (it may not declare that it acts on what it
// arbitrates), no `measurement` (it may not report a reading of the contest it judges), no
// `cadence` (it is not a cycle, so it has no place on ADR-002's timescale axis) and no `ground`
// (it may not issue itself the authority that grounds the graph). Each is refused by the loader's
// existing `loop-key-not-admitted-for-kind` with no new code and no new finding code.
const ARBITER_KEYS = frozenSet(...IDENTITY_KEYS, "resolves", "priority", "dwell", ...EDGE_KEYS);
// 59/ADR-001 §1/§2 — the auditor's admitted keys are frozen HERE, and the TEN keys it omits are the
// design rather than tidiness. Each omission names a specific way the audit could stop being
// independent, and each is refused by the loader's EXISTING `loop-key-not-admitted-for-kind` with
// no new code and no new finding code — the free enforcement 57 bought for the watcher's absent
// `actuator` and 58 repeated for four:
//
//   actuator                the audit fixes what it finds — it would become the maker of the thing
//                           it audits, and "reports to reference-owners" would mean nothing
//   optimizing              an optimizing auditor would need a watcher of its own; 57's regress has
//                           to stop somewhere, and the auditor is the node that REPORTS, permanently
//   controlled / reference  a setpoint is a thing an outer loop owns (58/ADR-001); an auditor that
//                           owned one would be SUPERVISING rather than reporting
//   ground                  the arbiter's rule verbatim (58/ADR-003 §2): a node may not issue itself
//                           the authority that grounds the graph
//   counter / determinism   a watcher pairs an OPTIMIZER with a counter-metric; the auditor's
//                           subject is the INSTRUMENT, including a watcher's own counter.
//                           `determinism` is deliberately NOT an enum here — it would have exactly
//                           one legal value — and the same guarantee is bought instead by refusing
//                           a `prose:` measurement, a rule on a field that already exists
//   layer                   it supervises nothing; 58's one-boundary-per-edge rule is about
//                           `target-setting`, and an auditor sets no target
//   owner / ceiling         `owner` is admitted on `kind: loop` alone (58/FF-5804) and stays there;
//                           the audit's bound is its cadence
const AUDITOR_KEYS = frozenSet(
  ...IDENTITY_KEYS,
  "audits",
  "measurement",
  "cadence",
  "escalation",
  ...EDGE_KEYS,
);
// 59/ADR-001 §5a — THE ONLY TWO EDGES AN AUDITOR MAY DECLARE. The keys stay ADMITTED for the kind
// (§1 freezes the auditor's set as its four declarations plus THE edge keys, and §2's omission table
// has no row for any of them), so the refusal is on the ENDPOINT: for `target-setting`, `veto`,
// `parameter-tuning` and `monitoring` no endpoint is admissible on a `kind: auditor` record, each
// entry is the loader's existing `loop-bad-value` naming the edge key, and nothing reaches
// `node.edges`. No new finding code, and no key removed from a frozen set.
//
// `monitoring` IS THE ONE THAT CLOSES A REAL HOLE, and it is why this is a rule and not a
// convention. `checkPairing` (`src/work/loops-checks.mjs:409-412`) adds EVERY source's `monitoring`
// endpoint to its `paired` set — the predicate reads the edge, not the source's kind — so an auditor
// declaring `monitoring: [loop:x]` would clear `loop-unpaired-optimizer` for that loop **by auditing
// it**. That code is a `GATING_CODES` member, so the audit would be buying a green gate for the very
// thing it is supposed to be reporting on, and FF-5910's "zero gating findings" would pass for the
// wrong reason. The other three are the same idea stated ahead of the hole: `target-setting` would
// make the auditor an owner of some loop's reference (§2's `controlled`/`reference` row), `veto` and
// `parameter-tuning` would make it an arbiter of what it audits.
const AUDITOR_EDGE_KEYS = frozenSet("data-feed", "reporting");
export const ADMITTED_KEYS = Object.freeze({
  all: frozenSet(
    ...LOOP_KEYS, ...ACTOR_KEYS, ...ANCHOR_KEYS, ...WATCHER_KEYS, ...ARBITER_KEYS, ...AUDITOR_KEYS,
  ),
  loop: LOOP_KEYS,
  actor: ACTOR_KEYS,
  anchor: ANCHOR_KEYS,
  watcher: WATCHER_KEYS,
  arbiter: ARBITER_KEYS,
  auditor: AUDITOR_KEYS,
});
// 59/ADR-001 §1 — the FOURTH additive widening of this enum: 55 took it from two to three, 57 to
// four, 58 to five, and this deletes nothing. An auditor is the node whose subject is the measuring
// apparatus itself, which is a kind of its own rather than a flag on a loop because a loop that
// audited itself would be the apparatus reporting on the apparatus.
export const NODE_KINDS = frozenSet("loop", "actor", "anchor", "watcher", "arbiter", "auditor");
const DETERMINISM_VALUES = frozenSet("counter", "judge");
export const POINTER_SCHEMES = frozenSet("module", "command", "config");
// 58/ADR-003 §6 — widened by the ARBITER ALONE, so `actor:operator --target-setting--> arbiter:x`
// is a declarable edge. `watcher` and `anchor` stay out: 58 widens this for the one edge it
// actually declares, and speculative widening for kinds nothing points at is refused.
// 59/ADR-001 §3 keeps this UNCHANGED, on 58/ADR-003 §6's precedent: widen the endpoint vocabulary
// only for an edge actually declared. Nothing in this registry points AT an auditor, so `auditor:`
// is not an admissible endpoint — an auditor is a SOURCE, never a target, which is the structural
// form of the claim that nothing in the machinery can supervise the audit into silence.
export const ENDPOINT_SCHEMES = frozenSet("loop", "actor", "item", "command", "config", "module", "arbiter");
export const SENTINEL_TOKENS = frozenSet("unknown", "uncapped", "none", "prose:");
export const CADENCE_KINDS = frozenSet("periodic:", "event:", "unknown");
export const PERIODIC_UNITS = frozenSet("ms", "s", "m", "h", "d");
export const EVENT_TRIGGERS = frozenSet("per-item", "per-phase", "per-milestone", "per-run-start");
// 58/ADR-002 §1/§2 — the second, ORDINAL axis. A duration and an ordinal are different things:
// `EVENT_TRIGGERS` stand in a real containment relation in this system (a run-start happens inside
// a phase, a phase inside an item, an item inside a milestone), so an ordinal over them can be
// computed where a duration cannot. Both maps live HERE and nowhere else — the checks are handed
// numbers on the parsed field rather than deriving a duration from a trigger, which is the
// fabricated conversion 52/ADR-006 §5 bans. Slower is higher; a rank is compared, never divided.
// PRIVATE, and deliberately so — 57 made the same call for `DETERMINISM_VALUES`. Milestone 52's
// delivered `00_frozen-vocabulary.feature:22` requires that "no twelfth set is exported", and a
// delivered acceptance criterion is immutable. `LAYER_VALUES` needs no importer: the checks are
// handed `fields.layer.rank` (§2) and must not spell a layer literal at all (FF-5802), and the
// face renders the raw. FF-5801 asserts these three literals against this line's source text,
// which is exactly how FF-5701 asserts the determinism enum.
const LAYER_VALUES = frozenSet("operational", "management", "governance");
const LAYER_RANKS = new Map([["operational", 0], ["management", 1], ["governance", 2]]);
// A clock says nothing about scope, so `periodic:` and `unknown` carry NO scope rank at all.
const SCOPE_RANKS = new Map([
  ["per-run-start", 0],
  ["per-phase", 0],
  ["per-item", 1],
  ["per-milestone", 2],
]);
export const GROUND_VALUES = frozenSet(
  "process-exit",
  "build-stamp",
  "landed-commit",
  "live-soak",
  "frozen-rule",
  "exogenous",
);
export const FIELD_KINDS = frozenSet(
  "pointer",
  "prose",
  "phrase",
  "unknown",
  "uncapped",
  "none",
  "periodic",
  "event",
  "ref",
  "flag",
  "enum",
  "cycles",
  // 59/ADR-005 §2 — a `checked:` date, carrying the epoch a window comparison is handed. The number
  // rides on the parsed field exactly as `ms` rides on a periodic cadence and `rank` on a layer, so
  // the checks are given a number rather than deriving one, and `src/work/loops-checks.mjs` can hold
  // no date literal and still stay the pure leaf that imports nothing (52/ADR-007, ADR-005 §4).
  "date",
);

export const LOADER_FINDING_CODES = Object.freeze([
  "loop-record-unparseable",
  "loop-missing-field",
  "loop-bad-value",
  "loop-expected-list",
  "loop-expected-scalar",
  "loop-empty-list",
  "loop-unknown-key",
  "loop-key-not-admitted-for-kind",
  "loop-malformed-frontmatter-line",
  "loop-id-mismatch",
  "loop-graph-dangling-endpoint",
  "loop-owner-unknown",
  "loop-cadence-unknown",
  "loop-ceiling-unknown",
  "loop-ceiling-uncapped",
  "loop-ceiling-pointer-unresolved",
  "loop-field-prose-only",
]);

const ALL_KEYS = ADMITTED_KEYS.all;
const LIST_KEYS = frozenSet("reference", "measurement", "actuator", "priority", "audits", ...EDGE_KEYS);
const SCALAR_KEYS = frozenSet(
  "id",
  "kind",
  "title",
  "controlled",
  "cadence",
  "owner",
  "optimizing",
  "ground",
  "observes",
  "counter",
  "determinism",
  "resolves",
  "dwell",
  "layer",
  "escalation",
  "checked",
);
const FIELD_LIST_KEYS = frozenSet("reference", "measurement", "actuator");
// The schemes whose operand NAMES A RECORD IN THIS REGISTRY, and therefore obeys one slug grammar
// (`splitUri`). `watcher` and `anchor` join for 59/ADR-001 §1's `audits:`, which admits a declared
// watcher or anchor id as an instrument. This does NOT make either an endpoint: an endpoint is
// parsed against `ENDPOINT_SCHEMES`, which 59 leaves closed, so the dangling-endpoint lane below
// still sees exactly the schemes it saw before.
const INTRA_REGISTRY_SCHEMES = frozenSet("loop", "actor", "arbiter", "watcher", "anchor");
// 59/ADR-001 §1 — what an auditor may name as an instrument: a module symbol, a registered command,
// a config key, or a declared loop / watcher / anchor id. An `item:` endpoint is deliberately NOT
// admissible, because a work item IS the work, and stating the subject is what makes "the audit does
// not review the work" checkable rather than promised.
const AUDITS_SCHEMES = frozenSet("module", "command", "config", "loop", "watcher", "anchor");
const AUDITS_NODE_SCHEMES = frozenSet("loop", "watcher", "anchor");
const REQUIRED_BY_KIND = Object.freeze({
  loop: Object.freeze([...IDENTITY_KEYS, ...CONTROL_KEYS]),
  actor: Object.freeze([...IDENTITY_KEYS]),
  anchor: Object.freeze([...IDENTITY_KEYS, "ground", "observes"]),
  watcher: Object.freeze([...IDENTITY_KEYS, "counter", "determinism", "measurement"]),
  // 59/ADR-001 §1 — all four are REQUIRED, and each closes a specific way the audit could quietly
  // become something else: what instruments it reads, how it reads them, that it is a CYCLE rather
  // than a thing somebody remembers, and the actor it can reach when the ordinary channel is the
  // thing that failed.
  auditor: Object.freeze([...IDENTITY_KEYS, "audits", "measurement", "cadence", "escalation"]),
  // 58/ADR-003 §2 — all three declarations are REQUIRED. An arbiter that does not say which
  // conflict it owns, in what order the contenders win, and how long an adjustment stands is a
  // veto edge with a title attached. `layer` is deliberately NOT required of a loop (ADR-002 §1).
  arbiter: Object.freeze([...IDENTITY_KEYS, "resolves", "priority", "dwell"]),
});
const KEY_ORDER = Object.freeze([
  ...IDENTITY_KEYS,
  ...CONTROL_KEYS,
  "layer",
  "ground",
  "observes",
  "counter",
  "determinism",
  "resolves",
  "priority",
  "dwell",
  "audits",
  "escalation",
  "checked",
  ...EDGE_KEYS,
]);
const KEY_RANK = new Map(KEY_ORDER.map((key, index) => [key, index]));
const UNIT_MS = Object.freeze({ ms: 1, s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 });
const RESERVED_FIELD_PREFIXES = Object.freeze(["module:", "command:", "config:", "prose:"]);
const EXISTING_CEILING_CONFIG_KEYS = frozenSet("work.autonomous.maxAttempts");
// THE PACKAGE ROOT IS ASKED FOR, NOT COUNTED (119/01, ADR-008). This was
// `path.dirname(path.dirname(fileURLToPath(import.meta.url)))`: two directory hops from
// `src/work-loops.mjs` to the repository root. From `src/work/loops.mjs` those same two hops land
// on `src/`, and every framework loop record's ceiling pointer would have stopped resolving on a
// move that changed nothing but this module's depth — the one behaviour change in the whole
// 71-module family, caused by arithmetic over a path. The answer now comes from `assetBase`, the
// tree's single asset-base seam (m28/ADR-003), which resolves the same directory in dev and the
// sidecar anchor under a SEA, and does not move when this module does.
function packageRoot() {
  return assetBase("version");
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function finding(code, severity, findingPath, message, order = {}) {
  return { code, severity, path: findingPath, message, _order: order };
}

function publicFinding(value) {
  return { code: value.code, severity: value.severity, path: value.path, message: value.message };
}

function rawFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

function malformedLines(text, recordPath) {
  const block = rawFrontmatter(text);
  if (block === null) return [];
  const findings = [];
  for (const [index, line] of block.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || /^\s/.test(line) || line.startsWith("-")) continue;
    if (/^([A-Za-z0-9_-]+):\s*(.*)$/.test(line)) continue;
    const lineNumber = index + 2;
    findings.push(
      finding(
        "loop-malformed-frontmatter-line",
        "error",
        recordPath,
        `Malformed frontmatter line ${lineNumber}: ${line}`,
        { lineNumber },
      ),
    );
  }
  return findings;
}

function isRepoRelative(value, { allowAnchor = false } = {}) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\")) return false;
  const candidate = allowAnchor ? value.split("#", 1)[0] : value;
  if (!candidate || candidate.startsWith("/") || /^[A-Za-z]:/.test(candidate)) return false;
  const segments = candidate.split("/");
  return !segments.some((segment) => !segment || segment === "." || segment === "..");
}

function splitUri(raw, schemes) {
  if (typeof raw !== "string") return null;
  const colon = raw.indexOf(":");
  if (colon <= 0) return null;
  const scheme = raw.slice(0, colon);
  const rest = raw.slice(colon + 1);
  if (!schemes.has(scheme) || !rest) return null;

  if (scheme === "module") {
    const hash = rest.indexOf("#");
    if (hash <= 0 || hash === rest.length - 1 || rest.indexOf("#", hash + 1) !== -1) return null;
    const operand = rest.slice(0, hash);
    const symbol = rest.slice(hash + 1);
    if (!isRepoRelative(operand) || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(symbol)) return null;
    return { scheme, operand, symbol };
  }

  if (rest.includes("#")) return null;
  if (scheme === "config" && !/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(rest)) return null;
  if (INTRA_REGISTRY_SCHEMES.has(scheme) && !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(rest)) return null;
  if (scheme === "item" && !/^\d+(?:\/\d+)?$/.test(rest)) return null;
  return { scheme, operand: rest };
}

const POINTER_TEXT_BOUNDARIES = new Set(["`", "[", "]", "(", ")", "{", "}", "<", ">", ",", ";", '"', "'"]);

/**
 * Extract declared loop pointers from prose without re-spelling any scheme's grammar.
 * Token boundaries only locate candidates; `splitUri` remains the one authority that
 * decides whether each candidate is a real module/command/config pointer.
 */
export function loopPointersIn(text) {
  const source = String(text ?? "");
  const found = new Map();
  for (let at = 0; at < source.length; at += 1) {
    const left = at === 0 ? null : source[at - 1];
    if (left != null && left.trim() !== "" && !POINTER_TEXT_BOUNDARIES.has(left)) continue;
    const scheme = [...POINTER_SCHEMES].find((entry) => source.startsWith(`${entry}:`, at));
    if (scheme == null) continue;
    let tokenEnd = at + scheme.length + 1;
    while (tokenEnd < source.length
      && source[tokenEnd].trim() !== ""
      && !POINTER_TEXT_BOUNDARIES.has(source[tokenEnd])) tokenEnd += 1;
    const raw = source.slice(at, tokenEnd);
    const pointer = splitUri(raw, POINTER_SCHEMES);
    if (pointer == null) continue;
    found.set(raw, Object.freeze({ raw, ...pointer }));
    at = tokenEnd - 1;
  }
  return Object.freeze([...found.values()]);
}

function pointerField(key, raw) {
  const pointer = splitUri(raw, POINTER_SCHEMES);
  return pointer ? { key, raw, kind: "pointer", pointer } : null;
}

// ONE SET, TWO KEYS. A loop's `owner:` and an auditor's `escalation:` are the same rule — a single
// endpoint that must be a PERSON — so they resolve through one scheme set rather than two copies.
// 59/ADR-001 §1: an escalation that terminated inside the machinery would not be a bypass at all.
const ACTOR_SCHEMES = frozenSet("actor");
const PRIORITY_SCHEMES = frozenSet("loop");

function refField(key, raw, schemes) {
  const parsed = splitUri(raw, schemes);
  return parsed ? { key, raw, kind: "ref", scheme: parsed.scheme, operand: parsed.operand } : null;
}

function proseField(key, raw) {
  if (typeof raw !== "string" || !raw.startsWith("prose:")) return null;
  const prosePath = raw.slice("prose:".length);
  if (!isRepoRelative(prosePath, { allowAnchor: true })) return null;
  return { key, raw, kind: "prose", path: prosePath };
}

function machineField(key, raw) {
  return pointerField(key, raw) ?? proseField(key, raw);
}

function hasReservedFieldPrefix(raw) {
  return RESERVED_FIELD_PREFIXES.some((prefix) => raw.startsWith(prefix));
}

/**
 * The cadence grammar, under a public name — 63/ADR-002 §3.
 *
 * IMPORTED, NEVER COPIED. `src/work-trigger/declaration.mjs` compiles a trigger's cadence and
 * `src/work/loops-checks.mjs`'s comparisons ride the same parsed field, so a second `periodic:`
 * regex or duration-unit table anywhere else would be the species 66/FF-6604 and TECH_DEBT item
 * 68 exist to refuse. This is the body that was `cadenceField`, moved verbatim and given a name:
 * every answer is byte-unchanged, including the `key` the loader's typed fields carry and the
 * `null` that a loop record reads as `loop-bad-value`.
 *
 * ADDITIVE, AND A FUNCTION — which is the whole reason it can exist. 52's delivered
 * `00_frozen-vocabulary.feature:22` freezes the loader at ELEVEN exported SETS, and a
 * `CADENCE_SOURCES` set would break a delivered acceptance criterion. 62/04 established the move
 * one milestone ago with `loopPointersIn`: the export census widens by one NAME, the eleven-set
 * claim is untouched, and `test/loop/work-loops-record.test.mjs` records the reading rather than
 * resolving it away.
 *
 * @param {unknown} raw the declared cadence string
 * @param {string} [key] the field name the parsed value reports itself under
 * @returns {{ key: string, raw: unknown, kind: string, ms?: number, trigger?: string, scopeRank?: number } | null}
 *          the parsed cadence, or `null` for a string this grammar does not admit
 */
export function parseCadence(raw, key = "cadence") {
  if (raw === "unknown") return { key, raw, kind: "unknown" };
  if (typeof raw !== "string") return null;

  const periodic = raw.match(/^periodic:(\d+)(ms|s|m|h|d)$/);
  if (periodic) {
    const amount = Number(periodic[1]);
    const ms = amount * UNIT_MS[periodic[2]];
    if (amount > 0 && Number.isSafeInteger(ms)) return { key, raw, kind: "periodic", ms };
    return null;
  }

  const event = raw.match(/^event:(.+)$/);
  // The scope ordinal rides on the parsed field exactly as `ms` rides on a periodic cadence, so a
  // comparison is handed a number instead of deriving one from a trigger token (ADR-002 §2).
  if (event && EVENT_TRIGGERS.has(event[1])) {
    return { key, raw, kind: "event", trigger: event[1], scopeRank: SCOPE_RANKS.get(event[1]) };
  }
  return null;
}

function cadenceField(key, raw) {
  return parseCadence(raw, key);
}

/**
 * 58/ADR-004 §3 — a dwell is a count of CYCLES OF THE RECEIVING LOOP, or explicitly `none`.
 * `unknown` is deliberately not admitted: the sentinel vocabulary exists for facts the repository
 * does not supply, and a dwell is not a discovered fact but a policy its author chooses — "no
 * dwell" already has a name. The boundary is one, not zero. A malformed value is the loader's
 * existing `loop-bad-value`, so `LOADER_FINDING_CODES` does not grow.
 */
function dwellField(key, raw) {
  if (raw === "none") return { key, raw, kind: "none" };
  if (typeof raw !== "string") return null;
  const cycles = raw.match(/^cycles:(\d+)$/);
  if (!cycles) return null;
  const count = Number(cycles[1]);
  return Number.isSafeInteger(count) && count >= 1 ? { key, raw, kind: "cycles", cycles: count } : null;
}

/**
 * 59/ADR-005 §2 — an anchor's `checked:` date. Optional, an ISO calendar date, and REFUSING every
 * `SENTINEL_TOKENS` member and every reserved field prefix: `checked: unknown` is the shape that
 * would let an anchor opt out of freshness while appearing to declare it, and `checked: prose:…`
 * would let a paragraph date a reading. Neither is a gap the repository failed to supply — either
 * the anchor was checked on a day or it has never declared one, and the second is ABSENCE.
 *
 * The epoch is carried on the field so a window comparison is handed a number (ADR-005 §4). A
 * malformed value is the loader's existing `loop-bad-value`, so `LOADER_FINDING_CODES` does not grow.
 */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;

function checkedField(key, raw) {
  if (typeof raw !== "string" || SENTINEL_TOKENS.has(raw) || hasReservedFieldPrefix(raw)) return null;
  const match = raw.match(ISO_DATE);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const ms = Date.UTC(year, month - 1, day);
  if (!Number.isSafeInteger(ms)) return null;
  // A REAL CALENDAR DATE, not merely ten characters shaped like one: `Date.UTC` rolls 2026-02-30
  // forward to March, so the round trip is what refuses it.
  const date = new Date(ms);
  const roundTrips = date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
  return roundTrips ? { key, raw, kind: "date", value: raw, ms } : null;
}

/**
 * 59/ADR-001 §1 — one entry of an auditor's `audits:`. A declared loop / watcher / anchor id is a
 * `ref` to a node of this registry; a `module:` / `command:` / `config:` operand is a `pointer` in
 * the three schemes 52 froze. `item:` and `prose:` are outside the set and are therefore refused by
 * `splitUri` with the loader's existing `loop-bad-value`, naming the `audits` key.
 */
function auditsField(key, raw) {
  const parsed = splitUri(raw, AUDITS_SCHEMES);
  if (!parsed) return null;
  return AUDITS_NODE_SCHEMES.has(parsed.scheme)
    ? { key, raw, kind: "ref", scheme: parsed.scheme, operand: parsed.operand }
    : { key, raw, kind: "pointer", pointer: parsed };
}

/**
 * 59/ADR-001 §1 — how an auditor may say it READ something. `measurement:` is reused from `loop` and
 * `watcher` verbatim (57/ADR-001 §6's reason: one field shape serves every reader, and the loader's
 * existing findings fire for free) with exactly one rule added — an auditor's measurement admits NO
 * `prose:` pointer. A prose authority means a person or a model read something and reported it,
 * which is the agent-as-judge auditing this milestone puts out of scope, wearing a machine's
 * clothes. A loop and a watcher keep the `prose:` they are allowed, and keep the `loop-field-prose-
 * only` WARNING it earns them; the auditor's is an ERROR, which is how a reader tells the two apart.
 */
function measurementValue(kind, key, raw) {
  return kind === "auditor" ? pointerField(key, raw) : machineField(key, raw);
}

/** 58/ADR-002 §2 — the declared layer, carrying the rank a comparison will use. */
function layerField(key, raw) {
  return LAYER_VALUES.has(raw)
    ? { key, raw, kind: "enum", value: raw, rank: LAYER_RANKS.get(raw) }
    : null;
}

function scalarField(key, raw) {
  if (key === "controlled") {
    return machineField(key, raw) ??
      (typeof raw === "string" && raw && !SENTINEL_TOKENS.has(raw) && !hasReservedFieldPrefix(raw)
        ? { key, raw, kind: "phrase" }
        : null);
  }
  // ONE BRANCH, NOT TWO COPIES (58/ADR-003 §4). A watcher's `counter` and an arbiter's `resolves`
  // are the same rule — a non-empty phrase that is neither a sentinel nor a pointer — because both
  // are the REVIEWABLE half of their node: a reader must see what is counted, or which standing
  // conflict is owned, without running anything and without opening another file. `controlled`
  // keeps its distinct pointer-or-phrase rule above and is no longer a model for either.
  if (key === "counter" || key === "resolves") {
    return typeof raw === "string" && raw && !SENTINEL_TOKENS.has(raw) && !hasReservedFieldPrefix(raw)
      ? { key, raw, kind: "phrase" }
      : null;
  }
  if (key === "dwell") return dwellField(key, raw);
  if (key === "checked") return checkedField(key, raw);
  if (key === "escalation") return refField(key, raw, ACTOR_SCHEMES);
  if (key === "layer") return layerField(key, raw);
  if (key === "cadence") return cadenceField(key, raw);
  if (key === "owner") {
    if (raw === "unknown") return { key, raw, kind: "unknown" };
    return refField(key, raw, ACTOR_SCHEMES);
  }
  if (key === "optimizing") {
    if (raw === "true" || raw === "false") return { key, raw, kind: "flag", value: raw === "true" };
    return null;
  }
  if (key === "ground") {
    return GROUND_VALUES.has(raw) ? { key, raw, kind: "enum", value: raw } : null;
  }
  if (key === "observes") return pointerField(key, raw);
  if (key === "determinism") {
    return DETERMINISM_VALUES.has(raw) ? { key, raw, kind: "enum", value: raw } : null;
  }
  return null;
}

function endpoint(raw) {
  const parsed = splitUri(raw, ENDPOINT_SCHEMES);
  return parsed ? { raw, ...parsed, resolved: null } : null;
}

function badValue(recordPath, key, raw, entryIndex = 0) {
  return finding(
    "loop-bad-value",
    "error",
    recordPath,
    `Invalid value for ${key}: ${String(raw)}`,
    { key, entryIndex },
  );
}

function ceilingPointerResolves(value) {
  if (value?.pointer?.scheme !== "config") return null;
  return EXISTING_CEILING_CONFIG_KEYS.has(value.pointer.operand)
    || resolvesLoopBoundConfigKey(value.pointer.operand);
}

function authorityRoot(workspace, source) {
  if (typeof workspace?.projectRoot === "string" && workspace.projectRoot.length > 0) {
    return path.resolve(workspace.projectRoot);
  }
  const registryHome = path.dirname(source);
  if (path.basename(registryHome) === ".aof") return path.dirname(registryHome);
  if (path.basename(registryHome) === "bundle" && path.basename(path.dirname(registryHome)) === "src") {
    return path.dirname(path.dirname(registryHome));
  }
  return registryHome;
}

function sourceExports(source, symbol) {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const declaration = new RegExp(
    `^[\\t ]*export[\\t ]+(?:async[\\t ]+)?(?:function|class|const|let|var)[\\t ]+${escaped}\\b`,
    "mu",
  );
  if (declaration.test(source)) return true;

  for (const match of source.matchAll(/^[\t ]*export[\t ]*\{([^}]*)\}/gmu)) {
    for (const entry of match[1].split(",")) {
      const parts = entry.trim().split(/\s+as\s+/u);
      if ((parts[1] ?? parts[0]) === symbol) return true;
    }
  }
  return false;
}

async function moduleCeilingPointerResolves(value, root) {
  const pointer = value?.pointer;
  if (pointer?.scheme !== "module") return null;
  try {
    const source = await readFile(path.resolve(root, pointer.operand), "utf8");
    return sourceExports(source, pointer.symbol);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "EISDIR") return false;
    throw error;
  }
}

async function ceilingAuthorityResolves(value, root) {
  const config = ceilingPointerResolves(value);
  if (config !== null) return config;
  const module = await moduleCeilingPointerResolves(value, root);
  return module ?? true;
}

function fieldHonestyFindings(recordPath, key, fields) {
  const entries = Array.isArray(fields) ? fields : [fields];
  if (key === "owner" && entries[0]?.kind === "unknown") {
    return [finding("loop-owner-unknown", "warn", recordPath, "owner is declared unknown", { key })];
  }
  if (key === "cadence" && entries[0]?.kind === "unknown") {
    return [finding("loop-cadence-unknown", "warn", recordPath, "cadence is declared unknown", { key })];
  }
  if (key === "ceiling" && entries[0]?.kind === "unknown") {
    return [finding("loop-ceiling-unknown", "warn", recordPath, "ceiling is declared unknown", { key })];
  }
  if (key === "ceiling" && entries[0]?.kind === "uncapped") {
    return [finding("loop-ceiling-uncapped", "warn", recordPath, "ceiling is declared uncapped", { key })];
  }
  if (entries.length > 0 && entries.every((entry) => entry.kind === "prose")) {
    const values = entries.map((entry) => entry.raw).join(", ");
    return [
      finding(
        "loop-field-prose-only",
        "warn",
        recordPath,
        `${key} is backed only by prose: ${values}`,
        { key },
      ),
    ];
  }
  return [];
}

function parseNode(text, recordPath, stem) {
  const meta = parseFrontmatter(text);
  const rawKind = meta.kind;
  const usableKind = typeof rawKind === "string" && NODE_KINDS.has(rawKind) ? rawKind : null;
  const node = {
    id: typeof meta.id === "string" ? meta.id : null,
    kind: usableKind,
    title: typeof meta.title === "string" ? meta.title : null,
    path: recordPath,
    fields: {},
    edges: {},
  };
  const findings = malformedLines(text, recordPath);

  const admitted = usableKind ? ADMITTED_KEYS[usableKind] : ALL_KEYS;
  for (const [key, raw] of Object.entries(meta)) {
    if (!ALL_KEYS.has(key)) {
      findings.push(
        finding("loop-unknown-key", "error", recordPath, `Unknown loop-record key: ${key}`, { key }),
      );
      continue;
    }
    if (!admitted.has(key)) {
      findings.push(
        finding(
          "loop-key-not-admitted-for-kind",
          "error",
          recordPath,
          `Key ${key} is not admitted for kind ${usableKind}`,
          { key },
        ),
      );
      continue;
    }

    const expectsList = LIST_KEYS.has(key);
    const expectsScalar = SCALAR_KEYS.has(key);
    if (expectsList && !Array.isArray(raw)) {
      findings.push(
        finding("loop-expected-list", "error", recordPath, `${key} must be an inline list`, { key }),
      );
      continue;
    }
    if (expectsScalar && Array.isArray(raw)) {
      findings.push(
        finding("loop-expected-scalar", "error", recordPath, `${key} must be a scalar`, { key }),
      );
      continue;
    }
    if (Array.isArray(raw) && raw.length === 0) {
      findings.push(finding("loop-empty-list", "error", recordPath, `${key} must not be empty`, { key }));
      continue;
    }

    if (key === "id") {
      if (typeof raw !== "string" || !raw) findings.push(badValue(recordPath, key, raw));
      else node.id = raw;
      continue;
    }
    if (key === "kind") {
      if (typeof raw !== "string" || !NODE_KINDS.has(raw)) findings.push(badValue(recordPath, key, raw));
      continue;
    }
    if (key === "title") {
      if (typeof raw !== "string" || !raw) findings.push(badValue(recordPath, key, raw));
      else node.title = raw;
      continue;
    }

    if (EDGE_KEYS.has(key)) {
      const parsed = [];
      const seen = new Set();
      raw.forEach((entry, entryIndex) => {
        // 59/ADR-001 §5a — an auditor declares `data-feed` and `reporting` and nothing else; see
        // `AUDITOR_EDGE_KEYS` above for why each of the other four is refused, and why the refusal
        // is on the endpoint rather than on the key.
        const admissible = usableKind !== "auditor" || AUDITOR_EDGE_KEYS.has(key);
        const value = admissible ? endpoint(entry) : null;
        if (!value) findings.push(badValue(recordPath, key, entry, entryIndex));
        else if (!seen.has(value.raw)) {
          seen.add(value.raw);
          parsed.push(value);
        }
      });
      if (parsed.length > 0) node.edges[key] = parsed;
      continue;
    }

    // 59/ADR-001 §1 — `audits:` is the auditor's SUBJECT: a non-empty list of instrument pointers.
    // An empty list is the loader's existing `loop-empty-list` (handled above), which is what stops
    // "no declared subject" being read as an auditor of everything.
    if (key === "audits") {
      const parsed = [];
      raw.forEach((entry, entryIndex) => {
        const value = auditsField(key, entry);
        if (!value) findings.push(badValue(recordPath, key, entry, entryIndex));
        else parsed.push(value);
      });
      if (parsed.length > 0) node.fields[key] = parsed;
      continue;
    }

    // 58/ADR-003 §5 — `priority` is an ORDERED list of `loop:` refs, most-important-first, carried
    // through exactly as declared. The loader passes no judgment on WHICH loops it names; binding
    // the order to the arbiter's own veto endpoint set is a check's question.
    if (key === "priority") {
      const parsed = [];
      raw.forEach((entry, entryIndex) => {
        const value = refField(key, entry, PRIORITY_SCHEMES);
        if (!value) findings.push(badValue(recordPath, key, entry, entryIndex));
        else parsed.push(value);
      });
      if (parsed.length > 0) node.fields[key] = parsed;
      continue;
    }

    if (FIELD_LIST_KEYS.has(key)) {
      const parsed = [];
      raw.forEach((entry, entryIndex) => {
        const value = key === "measurement"
          ? measurementValue(usableKind, key, entry)
          : machineField(key, entry);
        if (!value) findings.push(badValue(recordPath, key, entry, entryIndex));
        else parsed.push(value);
      });
      if (parsed.length > 0) {
        node.fields[key] = parsed;
        findings.push(...fieldHonestyFindings(recordPath, key, parsed));
      }
      continue;
    }

    if (key === "ceiling") {
      let parsed = null;
      if (Array.isArray(raw)) {
        const values = [];
        raw.forEach((entry, entryIndex) => {
          const value = pointerField(key, entry);
          if (!value) findings.push(badValue(recordPath, key, entry, entryIndex));
          else {
            values.push(value);
          }
        });
        if (values.length > 0) parsed = values;
      } else if (raw === "unknown" || raw === "uncapped" || raw === "none") {
        parsed = [{ key, raw, kind: raw }];
      } else {
        findings.push(badValue(recordPath, key, raw));
      }
      if (parsed) {
        node.fields[key] = parsed;
        findings.push(...fieldHonestyFindings(recordPath, key, parsed));
      }
      continue;
    }

    const parsed = scalarField(key, raw);
    if (!parsed) findings.push(badValue(recordPath, key, raw));
    else {
      node.fields[key] = parsed;
      findings.push(...fieldHonestyFindings(recordPath, key, parsed));
    }
  }

  const required = usableKind ? REQUIRED_BY_KIND[usableKind] : IDENTITY_KEYS;
  for (const key of required) {
    if (Object.hasOwn(meta, key)) continue;
    findings.push(
      finding("loop-missing-field", "error", recordPath, `Required field is missing: ${key}`, { key }),
    );
  }

  if (typeof meta.id === "string" && meta.id) {
    const colon = meta.id.indexOf(":");
    const scheme = colon < 0 ? "" : meta.id.slice(0, colon);
    const operand = colon < 0 ? meta.id : meta.id.slice(colon + 1);
    const stemMismatch = colon < 0 || operand !== stem;
    const schemeMismatch = usableKind !== null && scheme !== usableKind;
    if (stemMismatch || schemeMismatch) {
      findings.push(
        finding(
          "loop-id-mismatch",
          "error",
          recordPath,
          `id ${meta.id} must equal ${usableKind ?? "<kind>"}:${stem}`,
          { key: "id" },
        ),
      );
    }
  }

  return { node, findings, framework: /^# aof-generated: true\b/mu.test(text) };
}

function sortNodeFindings(left, right) {
  const leftMalformed = left.code === "loop-malformed-frontmatter-line";
  const rightMalformed = right.code === "loop-malformed-frontmatter-line";
  if (leftMalformed !== rightMalformed) return leftMalformed ? -1 : 1;
  if (leftMalformed) return (left._order.lineNumber ?? 0) - (right._order.lineNumber ?? 0);

  const leftRank = KEY_RANK.get(left._order.key) ?? KEY_ORDER.length;
  const rightRank = KEY_RANK.get(right._order.key) ?? KEY_ORDER.length;
  if (leftRank !== rightRank) return leftRank - rightRank;
  if (leftRank === KEY_ORDER.length) {
    const keyOrder = compareCodeUnits(left._order.key ?? "", right._order.key ?? "");
    if (keyOrder !== 0) return keyOrder;
  }
  return (left._order.entryIndex ?? 0) - (right._order.entryIndex ?? 0);
}

function loopsDirectory(workspace) {
  const value = typeof workspace === "string" ? workspace : workspace?.aofDir;
  if (!value) throw new TypeError("loadLoops requires an .aof directory path or a workspace");
  return path.resolve(value, "loops");
}

export async function loadLoops(workspace) {
  const source = loopsDirectory(workspace);
  const root = authorityRoot(workspace, source);
  let entries;
  try {
    entries = await readdir(source, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return { source, present: false, nodes: [], findings: [] };
    throw error;
  }

  const recordEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"));
  const parsedRecords = [];
  const unparseable = [];

  for (const entry of recordEntries) {
    const recordPath = path.join(source, entry.name);
    const text = await readFile(recordPath, "utf8");
    if (rawFrontmatter(text) === null) {
      unparseable.push(
        finding(
          "loop-record-unparseable",
          "error",
          recordPath,
          "Loop record must start with a frontmatter block",
        ),
      );
      continue;
    }
    parsedRecords.push(parseNode(text, recordPath, entry.name.slice(0, -3)));
  }

  for (const record of parsedRecords) {
    const ceilings = record.node.fields.ceiling ?? [];
    for (const [entryIndex, value] of ceilings.entries()) {
      const pointerRoot = record.framework ? packageRoot() : root;
      if (value.kind !== "pointer" || await ceilingAuthorityResolves(value, pointerRoot)) continue;
      record.findings.push(
        finding(
          "loop-ceiling-pointer-unresolved",
          "error",
          record.node.path,
          `Ceiling pointer has no resolver: ${value.raw}`,
          { key: "ceiling", entryIndex },
        ),
      );
    }
  }

  parsedRecords.sort((left, right) => {
    const byId = compareCodeUnits(left.node.id ?? "", right.node.id ?? "");
    return byId || compareCodeUnits(left.node.path, right.node.path);
  });
  const nodes = parsedRecords.map((record) => record.node);
  const declaredIds = new Set(nodes.map((node) => node.id).filter((id) => typeof id === "string" && id));

  for (const record of parsedRecords) {
    for (const [key, endpoints] of Object.entries(record.node.edges)) {
      endpoints.forEach((value, entryIndex) => {
        if (!INTRA_REGISTRY_SCHEMES.has(value.scheme)) return;
        value.resolved = declaredIds.has(value.raw);
        if (!value.resolved) {
          record.findings.push(
            finding(
              "loop-graph-dangling-endpoint",
              "error",
              record.node.path,
              `Endpoint does not name a declared node: ${value.raw}`,
              { key, entryIndex },
            ),
          );
        }
      });
    }
  }

  unparseable.sort((left, right) => compareCodeUnits(left.path, right.path));
  const ordered = [...unparseable];
  for (const record of parsedRecords) {
    record.findings.sort(sortNodeFindings);
    ordered.push(...record.findings);
  }

  return { source, present: true, nodes, findings: ordered.map(publicFinding) };
}
