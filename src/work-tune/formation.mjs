// Milestone 62 / story 05 — pure, deterministic candidate formation.
//
// The criterion cuts one content-derived forest at different edge strengths. Because
// moving the criterion only adds or removes edges from that SAME forest, loosening can
// merge candidates but can never split one, and tightening can split but never merge.

export const FORMATION_REFUSAL_CODES = Object.freeze({
  CRITERION_OUT_OF_RANGE: "formation-criterion-out-of-range",
});

export const FORMATION_CRITERION = Object.freeze({
  name: "minimum-shared-metadata-fields",
  dimensions: Object.freeze(["kind", "area", "stage", "owner"]),
  range: Object.freeze({ loosest: 1, tightest: 4 }),
  // Three matched fields keeps the real lesson corpus usefully specific while still
  // joining records that differ only in who owned or raised the lesson.
  defaultValue: 3,
  tieBreak: "lexicographically-least-source-citation",
});

// Reproducible selection record over the tracked lesson corpus.
// `test/arch/planning/acd-candidate-formation-is-lossless.test.mjs` recomputes every row
// from the live tracked corpus. A corpus change therefore asks for an explicit
// re-measurement rather than silently inheriting this choice.
//
// RE-MEASURED 2026-09-01 at milestone 62's verify gate (finding D-01), and the
// re-measurement is the mechanism working rather than a correction to it. The rows
// below were taken on 2026-08-31, BEFORE 62/04 gave each lesson record `citations`
// and `target`. Those fields feed `stableValue`, so they feed the tie-break, so they
// move cluster boundaries — a record-SHAPE change moves this table even though the
// record COUNT (402) did not move at all, which is precisely the drift a stored
// figure hides and this one caught.
//
// The conclusion is unchanged and was re-derived, not assumed: at 3 the largest loose
// cluster still collapses (171 → 109), recurring multi-source classes are still
// retained against the loosest setting (3 → 15), and the tightest setting still
// fragments (315 candidates against 199). Default 3 stands on the new numbers.
export const FORMATION_DEFAULT_BASIS = Object.freeze({
  corpus: "tracked retrospective lesson records",
  measuredRecordCount: 402,
  measurements: Object.freeze([
    Object.freeze({ value: 1, candidates: 132, recurring: 2, largest: 270 }),
    Object.freeze({ value: 2, candidates: 152, recurring: 3, largest: 171 }),
    Object.freeze({ value: 3, candidates: 199, recurring: 15, largest: 109 }),
    Object.freeze({ value: 4, candidates: 315, recurring: 30, largest: 12 }),
  ]),
  selected: 3,
  tradeoff: "3 sharply reduces the largest loose cluster while retaining recurring multi-source classes and avoiding the tightest setting's fragmentation",
});

const freeze = (value) => Object.freeze(value);
const compareKeys = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

function stableValue(value, seen = new Set()) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (seen.has(value)) return '"<cycle>"';
  seen.add(value);
  if (Array.isArray(value)) {
    const answer = `[${value.map((entry) => stableValue(entry, seen)).join(",")}]`;
    seen.delete(value);
    return answer;
  }
  const answer = `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key], seen)}`).join(",")}}`;
  seen.delete(value);
  return answer;
}

function canonicalClone(value, seen = new Set()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "<cycle>";
  seen.add(value);
  if (Array.isArray(value)) {
    const answer = value.map((entry) => canonicalClone(entry, seen));
    seen.delete(value);
    return answer;
  }
  const answer = {};
  for (const key of Object.keys(value).sort()) answer[key] = canonicalClone(value[key], seen);
  seen.delete(value);
  return answer;
}

function scalar(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim().toLocaleLowerCase("en");
  }
  return "";
}

function metadata(record, dimension) {
  return scalar(record?.[dimension] ?? record?.meta?.[dimension]);
}

function citationsOn(record) {
  const values = [];
  const append = (value) => {
    if (typeof value === "string" && value.trim() !== "") values.push(value.trim());
  };
  const appendMany = (input) => {
    const entries = Array.isArray(input) ? input : input == null ? [] : [input];
    for (const value of entries) append(value?.citation ?? value?.ref ?? value?.locator ?? value);
  };
  appendMany(record?.citations);
  appendMany(record?.provenance);
  append(record?.citation);
  append(record?.source);
  append(record?.locator);
  return [...new Set(values)].sort();
}

function targetOn(record) {
  for (const value of [record?.target, record?.ref, record?.key, record?.brief?.target]) {
    if (value === null) return null;
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

function sourceKey(record) {
  const citations = citationsOn(record);
  return `${citations[0] ?? "\uffff"}\u0000${stableValue(record)}`;
}

function similarity(left, right) {
  let matches = 0;
  for (const field of FORMATION_CRITERION.dimensions) {
    const a = metadata(left, field);
    const b = metadata(right, field);
    // Missing metadata carries the record but does not manufacture similarity.
    if (a !== "" && a === b) matches += 1;
  }
  return matches;
}

function criterionValue(options) {
  if (typeof options === "number") return options;
  if (options != null && Object.prototype.hasOwnProperty.call(options, "criterion")) {
    const supplied = options.criterion;
    return typeof supplied === "object" && supplied != null ? supplied.value : supplied;
  }
  return FORMATION_CRITERION.defaultValue;
}

function assertCriterion(value) {
  const { loosest, tightest } = FORMATION_CRITERION.range;
  if (!Number.isInteger(value) || value < loosest || value > tightest) {
    const error = new RangeError(
      `${FORMATION_CRITERION.name} must be an integer in the admitted range ${loosest}..${tightest}; received ${JSON.stringify(value)}`,
    );
    error.code = FORMATION_REFUSAL_CODES.CRITERION_OUT_OF_RANGE;
    error.parameter = FORMATION_CRITERION.name;
    error.range = FORMATION_CRITERION.range;
    error.received = value;
    throw error;
  }
  return value;
}

function describeCriterion(value) {
  return freeze({
    name: FORMATION_CRITERION.name,
    value,
    defaultValue: FORMATION_CRITERION.defaultValue,
    range: FORMATION_CRITERION.range,
    dimensions: FORMATION_CRITERION.dimensions,
    tieBreak: FORMATION_CRITERION.tieBreak,
  });
}

function nodesFor(records) {
  return [...(records ?? [])]
    .map((source) => ({
      source,
      citations: citationsOn(source),
      target: targetOn(source),
      key: sourceKey(source),
      parent: null,
      strength: 0,
    }))
    .sort((left, right) => compareKeys(left.key, right.key));
}

// Each source chooses at most one earlier parent. Equal-strength choices resolve to
// the candidate whose root is its least citation, exactly as ADR-014 fixes. Grouping
// eligible parents at the edge's own strength matters: choosing the least matching
// SOURCE could otherwise choose a later-cited candidate over an earlier-cited one.
// The resulting forest is independent of the requested cut and of arrival order.
function buildForest(nodes) {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    let strength = 0;
    const eligible = [];
    for (let prior = 0; prior < index; prior += 1) {
      const candidate = nodes[prior];
      if (candidate.target !== node.target) continue;
      const measured = similarity(node.source, candidate.source);
      if (measured > strength) {
        strength = measured;
        eligible.length = 0;
        eligible.push(candidate);
      } else if (measured === strength && measured > 0) {
        eligible.push(candidate);
      }
    }
    if (strength > 0) {
      const byCandidate = new Map();
      for (const candidate of eligible) {
        const root = rootAt(candidate, strength);
        if (!byCandidate.has(root)) byCandidate.set(root, []);
        byCandidate.get(root).push(candidate);
      }
      const [, members] = [...byCandidate.entries()]
        .sort(([left], [right]) => compareKeys(left.key, right.key))[0];
      node.parent = members.sort((left, right) => compareKeys(left.key, right.key))[0];
      node.strength = strength;
    }
  }
  return nodes;
}

function rootAt(node, criterion) {
  let root = node;
  while (root.parent != null && root.strength >= criterion) root = root.parent;
  return root;
}

function candidateFrom(nodes) {
  const ordered = [...nodes].sort((left, right) => compareKeys(left.key, right.key));
  // Canonical clones preserve every source fact while fixing recursive property
  // order. Returning caller-owned objects would make byte output depend on how an
  // otherwise-identical object happened to be constructed.
  const sources = freeze(ordered.map((node) => freeze(canonicalClone(node.source))));
  const citations = freeze(ordered.flatMap((node) => node.citations));
  return freeze({ sources, citations, target: ordered[0]?.target ?? null });
}

/**
 * Form a lossless partition of the records handed in.
 *
 * Candidate objects deliberately carry exactly `sources`, `citations`, and `target`.
 * The criterion belongs to the enclosing result, not to each downstream candidate.
 */
export function formCandidates(records = [], options = {}) {
  const value = assertCriterion(criterionValue(options));
  const nodes = buildForest(nodesFor(records));
  const groups = new Map();
  for (const node of nodes) {
    const root = rootAt(node, value);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(node);
  }
  const candidates = [...groups.values()]
    .map(candidateFrom)
    .sort((left, right) => compareKeys(String(left.citations[0] ?? ""), String(right.citations[0] ?? "")));
  return freeze({ criterion: describeCriterion(value), candidates: freeze(candidates) });
}

export const formCandidateSet = formCandidates;

export function measureFormationCriteria(records = []) {
  return freeze(Array.from(
    { length: FORMATION_CRITERION.range.tightest - FORMATION_CRITERION.range.loosest + 1 },
    (_, offset) => FORMATION_CRITERION.range.loosest + offset,
  ).map((value) => {
    const candidates = formCandidates(records, { criterion: value }).candidates;
    const sizes = candidates.map((candidate) => candidate.sources.length);
    return freeze({
      value,
      candidates: candidates.length,
      recurring: sizes.filter((size) => size > 1).length,
      largest: sizes.length === 0 ? 0 : Math.max(...sizes),
    });
  }));
}
