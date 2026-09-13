// src/story-contract-derive.mjs — the DERIVATION of a story's read and write sets
// (milestone 96 / story 01, ADR-004): a PROPOSAL an author subtracts from, never a
// declaration a tool writes.
//
// WHY IT IS A NEW LEAF BESIDE THE PARSER, and not a function inside it (ADR-004 §1).
// `src/story-contract.mjs` imports NOTHING — measured at 96's refine, and both
// `src/commands/validate.mjs` and `src/ready-wave.mjs` depend on it. Putting a graph
// reader inside it would hand the gate and the wave partition a transitive dependency on
// an artifact reader, on the strength of a concern neither of them has. So the parser
// keeps its zero imports and the derivation sits next to it.
//
// WHAT IT IS FOR. The declaration works; the AUTHORING of it does not, and both facts are
// measured. Story 83's read contract cut cache-creation per agent spawn from 3,082,276 to
// 936,394 — and landed almost entirely on the reviewers, because a reviewer is handed the
// diff and the criteria. `aof-developer` did not move: 53% of milestone 63's subagent
// cache-creation, at 2,059,059 per run. A builder must reach whatever the work actually
// touches, so a short `reads:` is not a smaller context — it is an unplanned cold read at
// full price. 63/R4 records write-set and read-set escapes across four consecutive stories
// and names the fix: *"derive the sets from the contract's own citations, and treat a
// repeat species as a tooling gap rather than a lapse of care."*
//
// THE ASYMMETRY IS DELIBERATE (ADR-004 §5). It PROPOSES; the author subtracts. An
// over-broad proposal costs a serialised wave — `ready-wave.mjs` computes disjointness
// from `files:` — which is cheap and VISIBLE. A tool that silently narrowed an author's
// set would manufacture this milestone's own defect faster than hand-authoring did, with
// the author's confidence attached, and the cost would land later on a builder with
// nothing in the stream saying why. So there is no write path here at all, and no flag
// that could add one.
//
// THE GRAPH IS READ, NEVER BUILT (ADR-004 §2, 72/ADR-002 §1). A build is minutes even on
// the unchanged path, and a proposal that might cost minutes before it costs seconds is
// not one an author will run. The artifact is reached through the shipped
// `readGraph`/`normalizeGraph`/`computeImpact` and nowhere else — no second parse of a
// graph path, no child process. An absent or unreadable artifact is an ANSWER, not an
// empty set: the proposal says the coupling was unavailable, because "no coupling found"
// and "I could not learn the coupling" rendering identically is the falsehood-shaped-as-an-
// answer this family refuses elsewhere.
import path from "node:path";
import { readFileSync } from "node:fs";

import { graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph } from "./graph-normalize.mjs";
import { computeImpact } from "./graph-impact.mjs";
import { isSuiteFile } from "./work/test-select.mjs";

// THE CLOSED REASON SET (ADR-004 §3). Every proposed entry carries the reason it was
// proposed, because a proposal an author cannot audit is one they will accept wholesale.
// Frozen here so a further source is an edit with an ADR behind it rather than a string
// somebody passed — the same discipline `WIDENING_REASONS` applies one module over.
//
// The order is the RANK: when two sources propose one path, the earliest reason wins, so
// the same inputs always render the same proposal.
export const PROPOSAL_REASONS = Object.freeze([
  // The author's own subject — a path they already declared in `files:`.
  "subject",
  // The graph: the subject file imports or calls into this one.
  "graph-dependency",
  // The graph: this file imports or calls into the subject.
  "graph-dependent",
  // A `file:line` citation in the milestone's own SPEC or ADRs.
  "citation",
  // The repository's root-and-extension convention: the suite that owns a declared source
  // file. The one leg that is pure convention rather than graph coupling, and the leg a
  // downstream retrospective records missed three stories running.
  "test-lane",
]);

// The two ways to have no graph. They are reported separately because they have different
// repairs — one is `aof graph build`, the other is a corrupt artifact to delete.
export const GRAPH_UNAVAILABLE = Object.freeze(["absent", "unreadable"]);

// A `file:line` citation, as the SPEC and the ADRs actually write one:
// `src/mesh/session.mjs:49`, `work-observe.mjs:670-676`, `test/arch/x.test.mjs:78-80`.
// The LINE NUMBER IS REQUIRED — that is what makes it a citation rather than a mention,
// and it is what ADR-004 §3 names as the third source.
const CITATION = /((?:[\w.-]+\/)*[\w.-]+\.(?:mjs|cjs|mts|js|jsx|ts|tsx|json|md))(?::\d+(?:-\d+)?)/g;

const SOURCE_EXTENSIONS = [".mjs", ".cjs", ".mts", ".js", ".ts"];

const norm = (file) => String(file ?? "").replaceAll("\\", "/");

const rank = (reason) => {
  const index = PROPOSAL_REASONS.indexOf(reason);
  return index < 0 ? PROPOSAL_REASONS.length : index;
};

// A proposal entry: the path, the reason it was proposed, and whether the author has
// already declared it. `declared` is present-and-boolean on every entry, so a reader can
// tell "already yours" from "newly proposed" without comparing two lists.
function entry(file, reason, declaredSet) {
  return Object.freeze({ path: norm(file), reason, declared: declaredSet.has(norm(file)) });
}

// Collapse to one entry per path, keeping the highest-ranked reason, then order by path.
// Deterministic in both legs: the same inputs render the same proposal, which is what lets
// an author diff one derivation against the next.
function settle(entries) {
  const byPath = new Map();
  for (const candidate of entries) {
    const existing = byPath.get(candidate.path);
    if (existing == null || rank(candidate.reason) < rank(existing.reason)) byPath.set(candidate.path, candidate);
  }
  return Object.freeze([...byPath.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)));
}

// isSourceFile(file, sourceRoots) — a file this repository would expect a suite to own: a
// source-extension file under a declared source root that is not ITSELF a suite. The last
// clause is what stops one omission becoming an infinite regress of them.
function isSourceFile(file, sourceRoots, testRoots) {
  const normalized = norm(file);
  if (!SOURCE_EXTENSIONS.some((extension) => normalized.endsWith(extension))) return false;
  // What counts as a suite has ONE spelling, and it is the shipped predicate's.
  if (isSuiteFile(normalized, testRoots)) return false;
  return (sourceRoots ?? []).some((root) => normalized.startsWith(`${norm(root).replace(/\/+$/u, "")}/`));
}

// The suite that owns a source file, by the repository's own root-and-extension rule:
// `<base>.test.mjs` under a declared test root. An EXISTING suite with that basename wins
// over the conventional path — a story that writes an existing module must propose the
// suite that exists, never invent a second address for it.
function owningSuite(file, { testRoots, allSuites }) {
  const base = path.basename(norm(file)).replace(/\.[^.]+$/u, "");
  const wanted = `${base}.test.mjs`;
  const existing = (allSuites ?? [])
    .map(norm)
    .filter((suite) => path.posix.basename(suite) === wanted)
    .sort();
  if (existing.length > 0) return existing[0];
  const root = norm((testRoots ?? [])[0] ?? "test").replace(/\/+$/u, "");
  return `${root}/${wanted}`;
}

// Read the graph ONCE, through the shipped reader. Absent and unreadable are ANSWERS —
// each named, each with its own repair — never an empty edge set wearing the shape of a
// complete one.
function loadGraph(projectRoot) {
  const artifact = graphJsonPath(projectRoot);
  let raw;
  try {
    raw = readGraph(artifact);
  } catch (error) {
    return { graph: null, path: artifact, available: false, unavailable: error?.code === "ENOENT" ? "absent" : "unreadable", builtAt: null };
  }
  try {
    return { graph: normalizeGraph(raw), path: artifact, available: true, unavailable: null, builtAt: graphArtifactBuiltAt(artifact) };
  } catch {
    // A shape the normaliser refuses (a graphify format change) is UNREADABLE, not absent:
    // the file is there and says something this build cannot interpret.
    return { graph: null, path: artifact, available: false, unavailable: "unreadable", builtAt: null };
  }
}

// Every `file:line` citation in the given documents, in document order then path order.
// A document that cannot be read contributes nothing and is named, so "this milestone
// cites nothing" and "I could not read its SPEC" are different answers here too.
function citationsIn(documents) {
  const cited = [];
  const unreadable = [];
  for (const document of documents ?? []) {
    let text;
    try {
      text = typeof document?.text === "string" ? document.text : readFileSync(document?.path ?? document, "utf8");
    } catch {
      unreadable.push(norm(document?.path ?? document));
      continue;
    }
    for (const match of text.matchAll(CITATION)) cited.push(norm(match[1]));
  }
  return { cited: [...new Set(cited)].sort(), unreadable };
}

/**
 * deriveStoryContract(options) → a PROPOSAL. It reads; it never writes.
 *
 *   projectRoot  — where `graphify-out/graph.json` lives
 *   subjects     — the story's declared `files:` (the subject set the graph is asked about)
 *   declaredReads / declaredFiles — what the author has already written, so the proposal can
 *                  say what is already theirs without restoring anything they removed
 *   documents    — the milestone's own SPEC/ADRs, as `{ path, text }` or paths, for citations
 *   testRoots / sourceRoots — HANDED IN, never read from config (this module reads none)
 *   allSuites    — the suites that exist, so an existing one is proposed over an invented path
 *
 * Returns `{ reads, files, graph, unknownCoupling, complete, unreadableDocuments }`, where
 * `reads`/`files` are ordered, deduped entries of `{ path, reason, declared }`.
 */
export function deriveStoryContract({
  projectRoot,
  subjects = [],
  declaredReads = [],
  declaredFiles = [],
  documents = [],
  testRoots = ["test"],
  sourceRoots = ["src"],
  allSuites = [],
} = {}) {
  const declaredReadSet = new Set(declaredReads.map(norm));
  const declaredFileSet = new Set(declaredFiles.map(norm));
  const subjectPaths = subjects.map(norm);

  const loaded = loadGraph(path.resolve(projectRoot ?? "."));
  const readEntries = [];
  const unknownCoupling = [];

  if (loaded.available && subjectPaths.length > 0) {
    for (const impact of computeImpact(loaded.graph, subjectPaths)) {
      if (!impact.present) {
        // UNKNOWN, never uncoupled. A node the graph does not carry has coupling this build
        // could not learn; reporting it as "no dependents" is the same falsehood as reporting
        // an absent artifact as an empty proposal.
        unknownCoupling.push(norm(impact.file));
        continue;
      }
      for (const dependency of impact.dependencies) readEntries.push(entry(dependency, "graph-dependency", declaredReadSet));
      for (const dependent of impact.dependents) readEntries.push(entry(dependent, "graph-dependent", declaredReadSet));
    }
  }

  const { cited, unreadable } = citationsIn(documents);
  for (const citation of cited) readEntries.push(entry(citation, "citation", declaredReadSet));

  // THE TEST LANE (ADR-004 §4) — derived from the source set by the repository's own rule,
  // never inferred at build time by whoever is building. A story writing `src/x.mjs` whose
  // write set omits the suite that owns `src/x.mjs` has an incomplete write set, whatever
  // the author believed; a story that writes no source file owes no suite, which is what
  // keeps a documentation-only story honest rather than padded.
  const fileEntries = subjectPaths.map((subject) => entry(subject, "subject", declaredFileSet));
  for (const subject of subjectPaths) {
    if (!isSourceFile(subject, sourceRoots, testRoots)) continue;
    fileEntries.push(entry(owningSuite(subject, { testRoots, allSuites }), "test-lane", declaredFileSet));
  }

  return Object.freeze({
    reads: settle(readEntries),
    files: settle(fileEntries),
    graph: Object.freeze({
      available: loaded.available,
      unavailable: loaded.unavailable,
      path: loaded.path,
      builtAt: loaded.builtAt,
    }),
    unknownCoupling: Object.freeze([...new Set(unknownCoupling)].sort()),
    unreadableDocuments: Object.freeze(unreadable),
    // A proposal is COMPLETE only when the coupling behind it was actually learned. An
    // unavailable graph and a subject the graph does not carry each leave a proposal that is
    // honest about what it holds and honest about what it could not ask.
    complete: loaded.available && unknownCoupling.length === 0,
  });
}
