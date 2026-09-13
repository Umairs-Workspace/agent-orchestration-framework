// THE SEAM LIVENESS — milestone 77 / story 02. ADR-006, ADR-010 §3.
//
// A bound that exists only in prose is what this rule exists to catch. `dispatchReadySet` with no
// caller, and a run-store heartbeat behind an eight-day zombie run, were both found by a research
// arc a quarter after they stopped being reached. A command can ask the same question on every run,
// for the price of reading an artifact something else already built.
//
// ── IT READS THE ARTIFACT AND NEVER BUILDS ONE ───────────────────────────────────────────────
//
// `72/ADR-002 §1` settled the analogous question for test selection and its reasons transfer
// intact: a build is minutes even on the unchanged path, and a command that might cost minutes
// before it costs seconds is not one an agent runs without thinking about it. So the artifact is
// read through the SHIPPED reader and nowhere else — no second reader, no second parse of a graph
// path, no build invocation in any form, and no child process.
//
// ── WHY THE INDEX IS INVERTED HERE RATHER THAN ASKED PER FILE (ADR-006 §1a) ──────────────────
//
// The shipped `computeImpact` is O(paths × (nodes + edges)) BY DESIGN and its own header prices it:
// ~80 ms for one path and ~400 ms for fifty against the live 17 MB artifact. Asked once per
// candidate over ~150 of them that is ~12 s inside a command that has to stay cheap. Handing it the
// whole candidate list does not help — it re-walks every edge once per path in its own map.
//
// So the edges are walked ONCE, and the dependents of every candidate fall out of that single pass.
// ADR-006 §1a names this exactly: *a different composition of the same shipped readers, not a
// second reader*. The artifact-reaching functions are still the shipped ones and this module adds
// none; what it does not do is ask the per-path question 150 times.
//
// ── AN UNKNOWN IS A STATED LIMIT, NEVER A CLEAN SEAM ─────────────────────────────────────────
//
// Three absences produce silence and all three are ordinary: there is no artifact, because graphify
// is an OPTIONAL integration most projects never install; there is one that cannot be read or does
// not parse; and there is a candidate the graph does not hold. The last is the dangerous one,
// because an empty dependents list on an ABSENT node looks exactly like an empty one on a present
// node, and rendering the first as "no dependents" is the precise mistake this rule exists to
// prevent. Each yields zero findings and a stated limit: not a finding, because no unwired seam was
// observed; not silence, because no wired one was either.
//
// And the FLOOR is the second half of the same honesty. `audit-ran-on-nothing` is an `error`, so a
// lane whose population were "modules the graph covers" would red a build in every project that
// never installed an optional tool. The population is SOURCE MODULES ON DISK, where a floor greater
// than zero is always satisfiable, and an absent graph costs a limit rather than a failure.
//
// ── BOTH FALSE-POSITIVE SHAPES ARE DERIVED, NEVER LEDGERED ───────────────────────────────────
//
// The naive filter returned 3 of 148 top-level modules — one genuine and two false. The obvious
// remedy is a list of two names, and it is refused: a control that STORES a fact about the tree
// sends its next bill to a stranger, and the bill here is exact. The ledger is right on the day it
// is written, the third false positive arrives without an entry, and an entry for a module that has
// since GAINED a caller suppresses a real finding forever.
//
//   · A file with ZERO exports is not a seam. It cannot strand an export it does not have, and the
//     shape is decidable from the file itself with nothing remembered about it.
//   · A file named by a RESOLVABLE relative dynamic-import literal is referenced. Two measurements
//     fix how that sweep works. It runs over `src/**` and not one directory level, because the two
//     live instances sit one directory down and a top-level sweep reports two real modules falsely.
//     And resolution is RELATIVE, never by basename: one module imports `"./sync.mjs"` from a
//     subdirectory, and a basename match would suppress the repository's only genuine finding and
//     leave the rule vacuous while looking cleaner than the correct one.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph } from "../graph-normalize.mjs";
import { TEST_ROOTS } from "./census.mjs";
import { limitRecord, readRecord } from "./reads.mjs";

// ── THE FROZEN VOCABULARY ────────────────────────────────────────────────────────────────────

// ONE code at ONE severity. The finding is `warn` and no graph output feeds a gate: `09/ADR-004`
// holds, `--strict` is unaffected, and no status, accept, merge or loop door reads this lane.
export const SEAM_LIVENESS_FINDING_CODES = Object.freeze(["audit-seam-unwired"]);

// ── THE SWEEP REGISTRY ───────────────────────────────────────────────────────────────────────

export const SEAM_LIVENESS_SWEEPS = Object.freeze([
  Object.freeze({
    id: "seam-source",
    what: "every source module on disk under the subject's src tree, read for the exports it declares and the dynamic-import literals that reference it",
    root: "<the audited project's source tree>",
    floor: 1,
    basis: "text",
    question: "does a caller this sweep could not read still reach one of these exports?",
    blindness: () => "The candidate set and its suppressions are read as TEXT. A dynamic import whose argument is a variable, a template holding an interpolation, or an element of an array is INVISIBLE to this rule, so a module reached only that way is reported as unwired. A caller reached by any route the code graph does not carry as an edge is invisible in the same way. Under-reporting is not the direction here — this rule OVER-reports where it cannot read, and says so rather than suppressing on a guess.",
  }),
]);

// ── THE SOURCE SWEEP ─────────────────────────────────────────────────────────────────────────

const SRC_DIR = "src";
const toPosix = (value) => value.split(path.sep).join("/").split("\\").join("/");

// Every `.mjs` under the subject's source tree, as `{ rel, text }` with `rel` project-root-relative
// and forward-slashed — so two machines report one string, whichever separator each of them uses.
async function readSourceModules(root) {
  const out = [];
  async function walk(dir, prefix) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // a project with no source tree is an absence, not an error
    }
    for (const entry of entries) {
      const rel = `${prefix}/${entry.name}`;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full, rel);
      else if (entry.name.endsWith(".mjs")) out.push({ rel, text: await readFile(full, "utf8") });
    }
  }
  await walk(path.join(root, SRC_DIR), SRC_DIR);
  out.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return out;
}

// The names a module exports, in source order. A module exporting NOTHING is a PROGRAM, and a
// program cannot be an unwired seam — that is the whole predicate, decidable from the file itself
// with nothing remembered about it.
// ONE alternation in ONE pass, so the names come back in SOURCE ORDER. Read per category they come
// back grouped by category instead, and the finding then lists a module's exports in an order that
// matches nothing a reader can see in the file — which is a small dishonesty in the one sentence
// the reader is being asked to act on.
const EXPORT_DECLARATION = /^[ \t]*export\s+(?:(default)\b|(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|class\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)|\{([^}]*)\})/gmu;

export function exportedNames(text) {
  const names = [];
  const add = (name) => { if (name && !names.includes(name)) names.push(name); };

  for (const match of text.matchAll(EXPORT_DECLARATION)) {
    const [, isDefault, fn, cls, binding, clauses] = match;
    if (isDefault != null) add("default");
    else if (clauses != null) {
      for (const clause of clauses.split(",")) {
        const exposed = /(?:\bas\s+)?([A-Za-z_$][\w$]*)\s*$/u.exec(clause.trim());
        if (exposed != null) add(exposed[1]);
      }
    } else add(fn ?? cls ?? binding);
  }
  return names;
}

// Every module a RESOLVABLE relative dynamic-import literal names, resolved against the file that
// HOLDS it. Swept over `src/**` at every depth — a one-level sweep misses the two live instances one
// directory down and reports two real modules falsely — and never by basename, which would suppress
// this repository's only genuine finding.
function dynamicallyImported(modules) {
  const onDisk = new Set(modules.map((module) => module.rel));
  const referenced = new Set();
  for (const module of modules) {
    const holder = path.posix.dirname(module.rel);
    for (const match of module.text.matchAll(/\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/gu)) {
      const literal = match[2];
      // Only a RELATIVE literal is resolvable against its holder. A bare specifier names a package,
      // and a basename alone names nothing in particular — matching either would be the basename
      // trap wearing a different hat.
      if (!literal.startsWith("./") && !literal.startsWith("../")) continue;
      const resolved = path.posix.normalize(path.posix.join(holder, literal));
      if (!resolved.startsWith(`${SRC_DIR}/`)) continue;
      if (onDisk.has(resolved)) referenced.add(resolved);
    }
  }
  return referenced;
}

// ── THE GRAPH, READ ONCE ─────────────────────────────────────────────────────────────────────

// The dependents of every file, from ONE pass over the edges. `graph.edges` is touched exactly
// once however many candidates are asked about, which is ADR-006 §1a's whole point.
export function dependentsIndex(graph) {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const dependents = new Map();
  const present = new Set();
  for (const node of graph.nodes) {
    if (node.sourceFile) present.add(toPosix(node.sourceFile));
  }
  for (const edge of graph.edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source?.sourceFile || !target?.sourceFile) continue;
    const from = toPosix(source.sourceFile);
    const into = toPosix(target.sourceFile);
    if (from === into) continue;
    // An edge ARRIVING at a file makes its source a DEPENDENT of that file. The other direction is
    // a dependency, and a dependency wires nothing — which matters because the graph's observed
    // noise points exactly that way.
    if (!dependents.has(into)) dependents.set(into, new Set());
    dependents.get(into).add(from);
  }
  return { dependents, present };
}

// A dependent under a declared test root does not wire a seam: the requirement's own words are
// "an exported function with no non-test caller". The roots come from `./census.mjs`, which is
// their one home — a second spelling here is how the two would come to disagree.
const underTestRoot = (file, testRoots) => testRoots.some((testRoot) => file === testRoot || file.startsWith(`${testRoot}/`));

// ── THE LANE ─────────────────────────────────────────────────────────────────────────────────

/**
 * PURE over its inputs and the subject root. Returns `{ findings, reads, limits, builtAt }`.
 *
 * `builtAt` is the ARTIFACT's own recorded instant, taken from the artifact and never from a clock
 * read at the moment of the call — which is the only defence left to a lane that reads a graph it
 * refuses to build. It is null on every absence path, and the limit says why.
 */
export async function runSeamLiveness({
  root,
  testRoots = TEST_ROOTS,
  sweeps = SEAM_LIVENESS_SWEEPS,
  now = null,
} = {}) {
  void now;
  const subjectRoot = toPosix(String(root ?? ""));
  const modules = await readSourceModules(root);

  const artifact = graphJsonPath(root ?? "");
  let graph = null;
  let unavailable = null;
  try {
    graph = normalizeGraph(readGraph(artifact));
  } catch (error) {
    unavailable = error?.code === "ENOENT"
      ? "no code graph was available — the artifact is not on disk, and this project may never have built one"
      : `the code graph could not be read (${error?.code ?? error?.message ?? "unreadable"})`;
  }
  const builtAt = graph == null ? null : graphArtifactBuiltAt(artifact);

  // The candidate set: a module that exports something. A module exporting nothing is a program.
  const candidates = modules
    .map((module) => ({ rel: module.rel, exports: exportedNames(module.text) }))
    .filter((module) => module.exports.length > 0);
  const referenced = dynamicallyImported(modules);

  const findings = [];
  const unresolved = [];
  if (graph != null) {
    const { dependents, present } = dependentsIndex(graph);
    for (const candidate of candidates) {
      if (referenced.has(candidate.rel)) continue;
      // A candidate the graph does not hold is an UNKNOWN. It is counted in the limit and never
      // rendered as "no dependents" — an empty list on an absent node looks exactly like an empty
      // list on a present one, and reading the first as a clean seam is this rule's own worst bug.
      if (!present.has(candidate.rel)) {
        unresolved.push(candidate.rel);
        continue;
      }
      const wiring = [...(dependents.get(candidate.rel) ?? [])].filter((file) => !underTestRoot(file, testRoots));
      if (wiring.length > 0) continue;
      findings.push(Object.freeze({
        code: "audit-seam-unwired",
        severity: "warn",
        path: candidate.rel,
        message: `${candidate.rel} exports ${candidate.exports.map((name) => `\`${name}\``).join(", ")} and the code graph gives it no dependent outside the declared test roots (${testRoots.join(", ")}) — a seam nothing in production reaches is a bound that exists only in prose. Graph built ${builtAt ?? "at an unrecorded time"}.`,
      }));
    }
  }

  const reads = sweeps.map((sweep) => readRecord(sweep, modules.length, subjectRoot));

  const limits = sweeps.map((sweep) => limitRecord({
    sweep: sweep.id,
    basis: sweep.basis,
    question: sweep.question,
    answeredBy: null,
    consequence: sweep.blindness(),
    authority: null,
  }));

  // THE GRAPH'S OWN LIMIT, on every run. On the absence paths it is the whole answer; on the
  // success path it carries the artifact's instant and the candidates whose coupling stayed unknown.
  limits.push(limitRecord({
    sweep: sweeps[0]?.id ?? null,
    basis: "disk",
    question: "was every candidate's coupling actually resolvable from the code graph?",
    answeredBy: null,
    consequence: unavailable != null
      ? `${unavailable}. No module's coupling could be resolved, so NOTHING in this result is a claim that a seam is wired, and there is no build time to report. The graph is read and never built here: a build is minutes even when nothing changed.`
      : `The code graph was read at its recorded build time ${builtAt ?? "(unrecorded)"} and was not rebuilt. ${unresolved.length} candidate(s) whose coupling could not be resolved were counted here and reported as nothing${unresolved.length > 0 ? `: ${unresolved.join(", ")}` : ""}.`,
    authority: null,
  }));

  return Object.freeze({
    findings: Object.freeze(findings),
    reads: Object.freeze(reads),
    limits: Object.freeze(limits),
    builtAt,
  });
}
