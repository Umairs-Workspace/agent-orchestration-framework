// work:doctor — milestone 124 / story 00: THE DEPENDS LANE, and the fourth `CHECK_GROUPS`
// entry of its kind. One pure `(snapshot, ctx) => Finding[]` group APPENDED to the engine's
// registry, in the shape `doctor-rubric.mjs` (54/04) and `doctor-loop-record.mjs` (78/03)
// each used before it. It edits no existing group and no spine control flow.
//
// WHAT IT ASKS. A `depends:` edge is a declaration that one item must land before another. The
// two contract sets a refined story already carries — `reads:` and `files:` — can WITNESS such
// an edge: if the dependent reads a path the dependency writes, the edge has a data-flow reason
// standing behind it. Nothing in this tree ever asked that question, so an edge authored by
// mistake, or one whose reason evaporated three milestones ago, is indistinguishable from a
// live one and silently serialises work forever.
//
// ───────────────────────────────────────────────────────────────────────────────────────────
// IT REPORTS WHAT IT MEASURED AND RENDERS NO VERDICT (ADR-001 §1, and `54/ADR-006`'s rule that
// an inference the instrument cannot make is *reported unjoined* rather than asserted).
//
// The code is `depends-edge-unwitnessed`, and **`phantom` is not a code, not a message and not
// an export of this module** — because the check genuinely cannot separate a false edge from
// legitimate capability ordering. `96/03 → 96/01` is exactly that shape and was spot-checked at
// refine: a real, deliberate edge whose sets are genuinely disjoint, because `96/03` READS
// `src/story-contract.mjs`, which `96/01` also only reads. An instrument that cannot tell those
// two apart and prints the more alarming word is an instrument nobody reads twice.
//
// IT REPORTS ITS DENOMINATOR (ADR-001 §2, §3). Measured over this stream at refine, 182 of 230
// resolved edges cannot be evaluated at all, and a report naming ten of them while staying
// silent about the rest describes 21% of the graph in a voice that sounds like all of it. So
// `depends-edges-unchecked` states the whole count — ONCE for the run, never once per edge (182
// warnings on day one is the wall of inherited red `78/ADR-007` refuses by name) — and keeps its
// two exclusion reasons APART, because they are two facts with two remedies:
//
//   · `type` — an endpoint that is not a story. `reads:`/`files:` exist only on `STORY.md`, so
//     every milestone / uat / spike / chore endpoint is out of domain PERMANENTLY, by
//     construction, and no amount of authoring will change it.
//   · `undeclared` — both endpoints are stories and at least one has declared no contract. That
//     is a debt time clears: 71 of this stream's 303 stories carry the keys today.
//
// The four counts are an IDENTITY over exactly the edge set `validateWork` resolves —
// `witnessed + unwitnessed + unchecked(type) + unchecked(undeclared) = considered` — not a
// summary. A census whose parts do not sum to its whole is one that can drop an edge class in
// silence, and the identity has already caught one: ADR-001's own table left `78 → 79` out and
// closed at 229 of 230.
// ───────────────────────────────────────────────────────────────────────────────────────────
//
// THE LANE READS NO DISK. Every contract set arrives as SNAPSHOT DATA, resolved at the engine's
// one impure edge (`src/work/doctor.mjs`'s per-item enrichment) exactly as the controls lane's
// runner texts and 54/04's report do — so every answer below is reproducible from a literal
// snapshot on any machine, from any working directory, with no filesystem at all. No
// `readFile`, no `stat`, no `process.cwd`, no `path.resolve`, no clock, no child process, no
// dynamic `import()`.
import path from "node:path";
// The item-identity vocabulary, taken through the spine's re-export exactly as every other lane
// takes it (chore 104's ruling: three readers of one question drifted apart when it was
// mirrored, and doctor's coherence lane scored a satisfied edge as unmet for it). `isDriver` and
// `isDependTarget` are the two halves of the driver-level rule, and `siblingDependencyNumber` is
// `validateWork`'s own story-level resolver — this module holds no second copy of either.
import { isDependTarget, isDriver, siblingDependencyNumber } from "./doctor.mjs";
// The coverage predicate, from ITS one home (124/ADR-003 §1). Reusing it is what keeps the wave
// and this lane reading ONE rule: were the intersection computed over raw declared strings here,
// the four 119-internal edges whose dependency authored `src/commands/` would be reported
// unwitnessed, and an advisory report with a 29% false-report rate is one nobody reads twice.
import { contractSetCovers } from "../story-contract.mjs";

// THE FROZEN CODES OF THIS LANE. A DIFFERENT array from `CONTROL_FINDING_CODES`, which is what
// makes them structurally incapable of reaching 54/02's doctor gate or the loop's
// `DOCTOR_GATE_CODES` (derived from that array by filter) — the mechanism 54/04 and 78/03 each
// used, and the reason FF-12402 can assert "never gates" of the CLASS rather than of this lane.
export const DEPENDS_FINDING_CODES = Object.freeze([
  "depends-edge-unwitnessed",
  "depends-edges-unchecked",
]);

// EVERY FINDING IS A WARNING (ADR-002 §1), and the severity is a module constant rather than a
// per-call argument so no later caller can harden one code without touching this line. The
// acceptance horizon is NOT consulted: `66/ADR-002`'s `severityFor` answers `error` inside it,
// which would turn every advisory warning into a blocker at exactly the moment nobody can clear
// one — an unwitnessed edge on a `done` story is a permanent red no legal act can remove.
const ADVISORY_SEVERITY = "warn";

// `node:path` for `join` ONLY — never `path.resolve`, which reads `process.cwd()` and would be a
// hidden impurity in a lane whose whole contract is that it is a function of the snapshot. The
// finding's path must be OS-NATIVE, because the engine filters findings to scope by path and a
// forward-slash join silently drops every finding it anchors on Windows (measured at 54/04's
// build — a correctly produced finding was filtered away unseen).
const finding = (code, target, message) => ({ code, severity: ADVISORY_SEVERITY, path: target, message });

// The dependent story's own record — where its `depends:` and its `reads:` are both authored,
// and therefore where a reader of the finding has to go. Anchoring INSIDE the dependent's folder
// is also what keeps a scoped run honest: `aof work doctor 119` reports 119's own unwitnessed
// edges, because the engine's scope filter admits a finding whose path sits under an in-scope
// item's directory. Named here rather than imported for the reason 78/03 names its own
// basename: an instrument that took the literal from the writer would change with the writer.
export const STORY_RECORD_BASENAME = "STORY.md";

// A frontmatter value that may be a list, a scalar or absent — `work.mjs`'s own `asList`
// (`:537`) shape. It is three lines of normalisation rather than a resolution rule, and this
// module cannot import it: `work.mjs` reaches `node:fs`, and a lane's contract is that it does
// not.
const asList = (value) => (Array.isArray(value) ? value : value == null || value === "" ? [] : [value]);

// Two authored numbers naming the same item — `work.mjs`'s module-private `sameNum` (`:74`), so
// that "03" and "3" are one item here exactly as they are there. Numeric comparison of an
// authored number is not a rule anybody can hold two opinions about; the resolution rules that
// ARE (`isDependTarget`, `siblingDependencyNumber`) are imported rather than mirrored.
const sameNum = (left, right) => Number.parseInt(left, 10) === Number.parseInt(right, 10);

// ---------------------------------------------------------------- the edge set ----

/**
 * The `depends:` edges of a stream, resolved EXACTLY as `validateWork` resolves them.
 *
 * There are two mechanisms and they are not interchangeable (`work.mjs:1184-1208`):
 *
 *   · DRIVER LEVEL — a milestone/uat/spike/chore's `depends:` number resolves against the wider
 *     set `isDependTarget` names: every driver PLUS every parentless story. That widening is
 *     milestone 78/79's, and `78 → 79` is the live edge that exists because of it.
 *   · STORY LEVEL — a child story's `depends:` resolves ONLY against its siblings under the same
 *     parent, through `siblingDependencyNumber`, which accepts a bare `NN` or a full `MM/NN`
 *     whose `MM` is the story's own parent. A full ref naming another milestone resolves to
 *     nothing, so a sibling number can never collide with a driver number.
 *
 * A PARENTLESS STORY IS A TARGET AND NEVER A SOURCE: `isDriver` excludes it from the first
 * branch and `item.parent != null` from the second, which is `validateWork`'s behaviour and not
 * an omission here.
 *
 * An edge that resolves to nothing is NOT in this set. `validateWork` already reports an
 * unresolvable `depends:` entry as a validity finding, and counting one here would put this
 * lane's denominator at odds with the graph the rest of the tree walks.
 */
export function resolvedDependsEdges(items) {
  const rows = Array.isArray(items) ? items : [];

  // The numbers a driver-level `depends:` may NAME. First writer of a number wins, which is the
  // same arbitrary-but-deterministic reading `validateWork` gets from a `Set`; a genuinely
  // duplicated number is `duplicate-driver-number`'s finding, not this lane's.
  // milestone 127 / ADR-002 §3 — a BACKLOG row (`number: null`) is neither a target nor,
  // below, a source: it has no number for an edge to name, and its own `depends:` is a
  // planning note validated at promotion. An ARCHIVED row is both, exactly as at the root.
  // The guard is `number != null` before the parse, so nothing is keyed at `NaN`.
  const byNumber = new Map();
  for (const item of rows) {
    if (item.number == null || !isDependTarget(item)) continue;
    const number = Number.parseInt(item.number, 10);
    if (!Number.isFinite(number) || byNumber.has(number)) continue;
    byNumber.set(number, item);
  }

  // …and the sibling index the story level resolves against, keyed WITHIN the parent.
  const bySibling = new Map();
  for (const item of rows) {
    if (item?.type !== "story" || item.parent == null || item.parent === "") continue;
    const key = `${Number.parseInt(item.parent, 10)}\0${Number.parseInt(item.number, 10)}`;
    if (!bySibling.has(key)) bySibling.set(key, item);
  }

  const edges = [];
  for (const item of rows) {
    if (item.number == null) continue; // a backlog row is never a source (see above)
    if (isDriver(item)) {
      for (const dep of asList(item?.meta?.depends)) {
        const target = byNumber.get(Number.parseInt(String(dep), 10));
        if (target != null) edges.push({ from: item, to: target });
      }
      continue;
    }
    if (item?.type !== "story" || item.parent == null || item.parent === "") continue;
    for (const dep of asList(item?.meta?.depends)) {
      const number = siblingDependencyNumber(dep, item.parent);
      if (number == null) continue;
      const sibling = bySibling.get(`${Number.parseInt(item.parent, 10)}\0${Number.parseInt(number, 10)}`);
      // `siblingDependencyNumber` answers with a NUMBER, not with an item, so the index lookup
      // is what makes an edge resolved. `sameNum` is asserted rather than assumed below because
      // the index was keyed by the same parse.
      if (sibling != null && sameNum(sibling.number, number)) edges.push({ from: item, to: sibling });
    }
  }
  return edges;
}

// ---------------------------------------------------------------- the four classes ----

/**
 * Every resolved edge, classified into the FOUR mutually exclusive classes whose counts are an
 * identity over `considered` (ADR-001 §3).
 *
 * `witnessed`   — both contract sets present, and at least one entry of the dependent's `reads:`
 *                 is COVERED by the dependency's `files:`. One shared entry is enough: the lane
 *                 asks whether a reason exists, never how much of a set intersects.
 * `unwitnessed` — both sets present, nothing covered. What was measured; not a verdict.
 * `unchecked` `type`       — an endpoint is not a story, so no contract field exists for it.
 * `unchecked` `undeclared` — both are stories and at least one declared no readable contract.
 *
 * COVERAGE, NOT EQUALITY, and the direction matters: the dependency's `files:` covers the
 * dependent's `reads:` entry. A dependency that authored `src/commands/` writes everything
 * beneath it, so a dependent reading `src/commands/test.mjs` IS witnessed — which is the
 * difference between the 14 an exact-string reading reports on this stream and the 10 that
 * survive the truthful one.
 */
export function classifyDependsEdges(snapshot) {
  const edges = resolvedDependsEdges(snapshot?.items);
  const witnessed = [];
  const unwitnessed = [];
  const uncheckedType = [];
  const uncheckedUndeclared = [];

  for (const edge of edges) {
    if (edge.from?.type !== "story" || edge.to?.type !== "story") {
      uncheckedType.push(edge);
      continue;
    }
    const reads = edge.from?.contract?.reads ?? null;
    const files = edge.to?.contract?.files ?? null;
    // `null` is the resolver's UNKNOWN — absent, malformed, an untouched scaffold, or a set one
    // unresolvable entry poisoned. It is deliberately not read as "declares nothing": a story
    // that has declared nothing and a story that has declared it touches nothing are different
    // facts, and only the second can be evaluated.
    if (reads == null || files == null) {
      uncheckedUndeclared.push(edge);
      continue;
    }
    if (reads.some((entry) => contractSetCovers(files, entry))) witnessed.push(edge);
    else unwitnessed.push(edge);
  }

  return { considered: edges.length, witnessed, unwitnessed, uncheckedType, uncheckedUndeclared };
}

// ---------------------------------------------------------------- the messages ----

// How many declared entries a message names before it stops. The finding has to carry both sets
// — an operator cannot judge an unwitnessed edge without seeing what each side declared — but
// this stream holds a 27-entry `files:` list, and a doctor line that long is a line nobody
// finishes. The remainder is COUNTED rather than dropped, so the message never implies a set is
// smaller than it is.
const NAMED_ENTRIES = 6;

const nameSet = (entries) => {
  const paths = entries.map((entry) => entry.path);
  if (paths.length === 0) return "(empty)";
  const shown = paths.slice(0, NAMED_ENTRIES).join(", ");
  return paths.length <= NAMED_ENTRIES ? shown : `${shown}, +${paths.length - NAMED_ENTRIES} more`;
};

// WHAT THIS MESSAGE MAY NOT SAY, stated where it is written. It reports that no declared entry
// witnesses the edge, and it stops there: it does not call the edge false, unnecessary or
// removable, because the instrument cannot see the difference between a mistake and capability
// ordering, and a reader who acts on the stronger claim deletes a real edge (`96/03 → 96/01`).
const unwitnessedMessage = (edge, reads, files) =>
  `${edge.from.ref} → ${edge.to.ref}: no entry in ${edge.from.ref}'s declared \`reads:\` is covered by `
  + `${edge.to.ref}'s declared \`files:\`, so this edge carries no data-flow witness in the two contracts. `
  + `reads: ${nameSet(reads)} — files: ${nameSet(files)}. `
  + "Capability ordering is a legitimate reason for an edge no contract witnesses; this reports what was "
  + "measured and renders no verdict on the edge.";

// THE DENOMINATOR, IN ONE MESSAGE, WITH THE TWO EXCLUSIONS APART. Their sum is deliberately not
// computed anywhere in this module: 182 reads as one problem, and a permanent design boundary
// and a shrinking authoring debt are not one problem.
const uncheckedMessage = (census) =>
  `this run considered ${census.considered} resolved \`depends:\` edge(s) — `
  + `${census.witnessed.length} witnessed by the two contracts, ${census.unwitnessed.length} unwitnessed, `
  + `${census.uncheckedType.length} unchecked because an endpoint is not a story, and `
  + `${census.uncheckedUndeclared.length} unchecked because a story has declared no contract. `
  + "An endpoint that is not a story can NEVER be evaluated — `reads:`/`files:` exist only on `STORY.md`, "
  + "so every milestone, uat, spike and chore endpoint is permanently outside this check's domain. "
  + "An undeclared contract CAN be evaluated, once that story declares `reads:`/`files:`; that count falls "
  + "as the convention spreads. The two are reported apart because they have different remedies.";

// ------------------------------------------------------------------- the lane ----

/**
 * dependsLane(snapshot) → Finding[]
 *
 * PURE over the snapshot it is handed. Two codes, both `warn`:
 *
 *   · one `depends-edge-unwitnessed` per unwitnessed edge, anchored at the DEPENDENT story's own
 *     `STORY.md` so a scoped run still reports it;
 *   · exactly ONE `depends-edges-unchecked` for the whole run, anchored at the work-stream root
 *     — the one path the engine's scope filter always passes through — so `aof work doctor 119`
 *     reads the whole denominator rather than a scoped fraction of it.
 *
 * A STREAM WITH NOTHING TO EXCLUDE SAYS NOTHING ABOUT EXCLUSIONS. The coverage finding is
 * emitted only when at least one edge went unevaluated, for the same reason `rubric-join-
 * unchecked` is: an honest no-op reports a leg that DID NOT RUN, and there is no such leg when
 * every edge was read. It is deliberately NOT made conditional on there being an unwitnessed
 * edge — that inversion is the red probe FF-12401 names, because it lets a stream with 182
 * unreadable edges and no findings read as fully covered.
 */
export function dependsLane(snapshot) {
  const census = classifyDependsEdges(snapshot);
  const findings = [];

  // The denominator comes FIRST, because it is the frame for everything after it: a reader who
  // sees the per-edge findings before the coverage statement has already formed the impression
  // ADR-001 exists to prevent.
  const excludedClasses = [census.uncheckedType, census.uncheckedUndeclared];
  if (excludedClasses.some((rows) => rows.length > 0) && typeof snapshot?.workDir === "string") {
    findings.push(finding("depends-edges-unchecked", snapshot.workDir, uncheckedMessage(census)));
  }

  for (const edge of census.unwitnessed) {
    findings.push(finding(
      "depends-edge-unwitnessed",
      path.join(edge.from.dir, STORY_RECORD_BASENAME),
      unwitnessedMessage(edge, edge.from.contract.reads, edge.to.contract.files),
    ));
  }

  return findings;
}
