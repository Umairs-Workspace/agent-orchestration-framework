import { existsSync } from "node:fs";
import path from "node:path";
import { commandError } from "@aof/contracts/error";
import { GRAPHIFY_BACKENDS } from "./graphify-backends.mjs";
import { computeImpact } from "./graph-impact.mjs";
import { hashTree, inputsCurrent, listCloneFiles, stampInputs } from "./graph-bundle.mjs";
import { graphArtifactBuiltAt as artifactBuiltAt, graphJsonPath as artifactPath, normalizeGraph as normalizeArtifact, readGraph as readArtifact } from "./graph-normalize.mjs";
import { createKnowledgeEngine } from "./engine.mjs";

// The graphify CODE backend (milestone 179, ADR-002) — the one module that builds the code graph,
// reads its edges and reports its absence, behind the knowledge-engine port. It declares
// `code: ["ingest", "relations", "status"]` and nothing else: query and triage stay graphify's own
// verbs outside the port, and `recall("code")` is unserved.
//
//   ingest("code", input, ctx)  today's `graph:build` body, moved: the offline guard, binary
//                               resolution, the one spawn through `runGraphifyBuild` (09/ADR-002's
//                               sole spawn site), the artifact honesty check and egress from the one
//                               backend table. It writes `<outRoot>/graphify-out/.gitignore` on every
//                               build, which closes 149's gap. Its result is the BuildResult.
//   relations(paths, ctx)       the structured edge read: the artifact read on every call, then
//                               `computeImpact`. Nothing is cached (72/ADR-002).
//   status("code", ctx)         the binary and the artifact, from the same availability check.
//
// ONE DEGRADE PATH. `graphify-missing` (binary), `no-graph` (artifact absent) and `graph-unreadable`
// (artifact does not parse) are produced here and nowhere else. An unavailable answer carries
// `cause`: the read error's `code`, else its message — the words seam liveness quotes.
//
// SHARE IS NOT HERE. 174's share wrapping is transport and stays in the `graph:build` face. The one
// seam it needs is `input.onMiss`: on a code-only whole-root build whose inputs are not current, the
// build calls it before spawning; a note it returns ends the build as unchanged with that note as
// stdout, and null lets the build run.
//
// THE RETIRING WART (ADR-002). The graphify memory backend invokes `graph:build` with
// `outRoot: .aof/memory-graph`, so that call rides this ingest and builds a work-stream graph for
// one caller until `retire-graphify-memory-backend` deletes it.

// Backend classification (RESEARCH §F). A NETWORK backend reaches a remote API
// (claude/gemini/openai/kimi/deepseek/claude-cli); ollama is LOCAL (runs on-box).
// The distinction drives the ADR-001 offline guard ONLY — it is NOT the egress
// field: egress reports whether the doc/media HOP ran, regardless of locality
// (ADR-005).
//
// `claude-cli` is graphify's native credential-local default (10/ADR-003): it
// shells the user's logged-in `claude -p` (no metered ANTHROPIC_API_KEY; billed to
// the plan). It is registered here BY KNOWLEDGE so the classification is by
// enumeration, not by the unknown-name network fall-through: billed-to-plan is
// orthogonal to egress — the prose IS still sent to Anthropic for inference, so it
// DOES cross the network (isNetworkBackend === true). It is NOT data-local; `ollama`
// remains the ONLY data-resident (on-box) backend. Both still egress "docs-media"
// (the doc/media hop ran) — locality is a separate privacy property (ADR-005).
const NETWORK_BACKENDS = new Set(GRAPHIFY_BACKENDS.filter(entry => entry.network).map(entry => entry.backend));
const LOCAL_BACKENDS = new Set(GRAPHIFY_BACKENDS.filter(entry => !entry.network).map(entry => entry.backend));

// True when `backend` names a backend that crosses the network (a remote API).
// null/absent/local (ollama) → false. A KNOWN network backend (NETWORK_BACKENDS,
// claude-cli INCLUDED — 10/ADR-003) is classified network by ENUMERATION, never by
// accident. An UNKNOWN name still falls closed to NETWORK (an unrecognised backend
// is assumed to egress until proven local) — but the known set is the by-knowledge
// path, so adding claude-cli to NETWORK_BACKENDS makes its classification a
// deliberate fact, not a fall-through the moment the default ever changes.
export function isNetworkBackend(backend) {
  if (backend == null) return false;
  if (LOCAL_BACKENDS.has(backend)) return false;
  if (NETWORK_BACKENDS.has(backend)) return true;
  return true; // fail-closed: unknown names are assumed to egress until proven local
}

// True when `backend` is a KNOWN network backend (registered in NETWORK_BACKENDS),
// i.e. its network classification is BY KNOWLEDGE, not by the unknown-name
// fall-through. `isNetworkBackend` returns true for BOTH a known-network name and an
// unknown one (fail-closed); this distinguishes them so the 10/ADR-003 contract —
// "claude-cli is network by enumeration" — is observable, not merely incidental.
export function isKnownNetworkBackend(backend) {
  return backend != null && NETWORK_BACKENDS.has(backend);
}

// classifyEgress(backend) → the egress field for a BuildResult (ADR-001/ADR-005).
// "none" when NO backend ran (code/AST only, fully local); "docs-media" when ANY
// --backend drove the doc/media hop — ollama INCLUDED, because the hop RAN even
// though it ran locally. Locality is a SEPARATE privacy property, never folded
// into egress; aof reports "the hop ran", never re-classifies by reachability.
export function classifyEgress(backend) {
  return backend == null ? "none" : "docs-media";
}

// The code corpus's ignore policy (the SPEC puts it on the port). `*` alone ignores the ignore file
// too, so a build leaves `git status` clean: nothing under graphify-out/ is meant to be committed,
// the graph being derived. The memory backend's variant keeps `!.gitignore` to stay
// self-documenting; it retires with that backend.
const CODE_GRAPH_IGNORE = Object.freeze(["*"]);

const INPUTS_UNCHANGED = "aof: no file this graph was built from has changed since it was built — graphify was not run.";

// Configured application services are supplied by core; construction performs no I/O.
export function createGraphifyCodeBackend({ resolveGraphifyBinary, runGraphifyBuild, readGraph, normalizeGraph, graphJsonPath, graphArtifactBuiltAt, isCodeOnlyWholeRootBuild, git, ensureGraphifyOutGitignore }) {
  // readBuiltGraph(graphPath) — the normalizing read of the artifact a build just
  // verified, and the build's LAST honesty check. Exported pure (the graphifyBuildArgs /
  // classifyEgress idiom) so the failure path is drivable without the live binary: a real
  // spawn would simply overwrite any corrupt fixture, so this cannot be reached through
  // `invoke` at all.
  //
  // The driver can only see THAT a file exists. Here we find out whether it is a graph. A
  // zero exit over a truncated, corrupt or unparseable artifact is a failed build however
  // cheerful the process was — and this is the honest remnant of the artifact-unchanged
  // guard it replaces: it asserts a USABLE graph, rather than guessing at staleness from
  // mtimes graphify deliberately does not update. Structured, so the caller sees a build
  // failure instead of a SyntaxError escaping as a stack trace.
  function readBuiltGraph(graphPath) {
    try {
      return normalizeGraph(readGraph(graphPath));
    } catch (error) {
      throw commandError(
        `graphify exited successfully but ${graphPath} is not a readable graph: ${error.message}`,
        "graphify-no-persist",
        424
      );
    }
  }

  //   input  { path, backend?, tokenBudget?, offline?, outRoot?, onMiss? }
  //   result BuildResult { graphPath, projectRoot, nodeCount, edgeCount,
  //                        hyperedgeCount, builtAt, backend, egress, unchanged, stdout }
  //
  // Paths are RAW ABSOLUTE (basis-neutral, 08/ADR-002); the CLI face relativises for display.
  // When the binary is absent, it throws a structured graphify-missing error BEFORE any spawn.
  async function ingest(_corpus, input, ctx) {
    const projectRoot = ctx.projectRoot;
    // The artifact root: the directory whose graphify-out/graph.json this build writes
    // and reports. Defaults to projectRoot — the CODEBASE graph every graph:impact /
    // graph:query read resolves. An in-process caller building a DIFFERENT graph over
    // the same repo (the memory backend's work-stream graph) passes its own root so the
    // replacing extraction cannot evict the codebase graph (#756).
    const outRoot = input.outRoot ?? projectRoot;
    const backend = input.backend ?? null;

    // ADR-001 enforcement: offline:true FORBIDS a network backend. Reject BEFORE
    // any spawn (and before the binary check) with a structured conflict error.
    // offline:true + ollama (local) or + no backend is allowed — the hop, if any,
    // never leaves the box. An unknown backend is treated as network (fail-closed).
    if (input.offline === true && isNetworkBackend(backend)) {
      throw commandError(
        `offline:true forbids the network backend "${backend}" (only the local "ollama" backend or no backend may run offline).`,
        "offline-backend-conflict",
        409
      );
    }

    const request = { path: input.path, backend, tokenBudget: input.tokenBudget };
    const codeOnly = isCodeOnlyWholeRootBuild(request, outRoot, projectRoot);

    // Guard the binary-absent path BEFORE any spawn (ADR-002/004): surface a
    // clear, guidance-bearing failure (the install hint), never an opaque ENOENT.
    const resolved = resolveGraphifyBinary();
    if (!resolved.found) {
      throw commandError(resolved.hint, "graphify-missing", 424);
    }

    // A code-only whole-root build is skipped when nothing it read has changed since the graph was
    // stamped (166 F-01: `graphify update` re-extracts everything, every time). The tree is
    // snapshotted BEFORE the spawn, so an edit made while graphify runs is never stamped as read.
    const graphPath = graphJsonPath(outRoot);
    const outDir = path.dirname(graphPath);
    const tree = codeOnly ? await snapshotTree(projectRoot) : null;

    // egress: "none" when no backend ran (code/AST only); "docs-media" when ANY
    // --backend drove the doc/media hop (ADR-001/005). ollama is still
    // "docs-media" — the hop RAN; locality is a separate privacy property.
    const egress = classifyEgress(backend);

    const current = () => Boolean(tree) && inputsCurrent({ outDir, ...tree, graphifyVersion: resolved.version });
    const unchanged = async (stdout) => {
      const normalized = readBuiltGraph(graphPath);
      await ensureGraphifyOutGitignore(outRoot, CODE_GRAPH_IGNORE);
      return buildResult({ graphPath, projectRoot, backend, egress, normalized, builtAt: graphArtifactBuiltAt(graphPath), unchanged: true, stdout });
    };
    if (current()) return unchanged(INPUTS_UNCHANGED);

    // A miss: the caller may lay an artifact down first (the face's share fetch), and a note it
    // returns means that artifact is current, so the build ends there.
    if (tree && typeof input.onMiss === "function") {
      const note = await input.onMiss({ current });
      if (note) return unchanged(note);
    }

    // Spawn the pinned binary via the sole driver seam (cwd = projectRoot, #756;
    // the artifact lands under outRoot).
    const built = runGraphifyBuild(request, { projectRoot, outRoot });

    // Counts come from graph.json (ADR-001 invariant), never from stdout.
    const normalized = readBuiltGraph(built.graphPath);
    if (tree) stampInputs(outDir, tree, resolved.version);
    // The nested ignore on every build (149's gap): a bare `aof graph build .` never leaves the
    // artifact untracked in the repository it was built in.
    await ensureGraphifyOutGitignore(outRoot, CODE_GRAPH_IGNORE);

    return buildResult({ graphPath, projectRoot, backend, egress, normalized, builtAt: built.builtAt, unchanged: built.unchanged, stdout: built.stdout });
  }

  const { availability, relations } = createCodeGraphReader({ readGraph, normalizeGraph, graphJsonPath, graphArtifactBuiltAt });

  //   result { binary: "present" | "graphify-missing", artifact, builtAt, unavailable[, cause] }
  async function status(_corpus, ctx) {
    const { graph: _graph, available: _available, ...answer } = availability(ctx.projectRoot);
    const binary = resolveGraphifyBinary().found ? "present" : "graphify-missing";
    return { binary, ...answer };
  }

  // The git-visible files and their content hashes, or null when git cannot list them (no stamp is
  // then read or written, and every build runs graphify as before).
  async function snapshotTree(projectRoot) {
    const visible = await listCloneFiles(git, projectRoot);
    return visible ? { visible, hashes: hashTree(projectRoot, visible) } : null;
  }

  const graphifyCodeBackend = Object.freeze({
    name: "graphify",
    corpora: Object.freeze({ code: Object.freeze(["ingest", "relations", "status"]) }),
    ingest,
    relations,
    status,
  });

  return { graphifyCodeBackend, readBuiltGraph };
}

// THE READ HALF — availability and `relations` — needs the normalizer and the edge walk, and no
// driver: reading the code graph never resolves, starts or spawns graphify.
function createCodeGraphReader({ readGraph, normalizeGraph, graphJsonPath, graphArtifactBuiltAt }) {
  // The one availability check `relations` and `status` share. The artifact is read on every
  // call; `cause` is the read error's code, else its message.
  function availability(projectRoot) {
    const artifact = graphJsonPath(projectRoot);
    if (!existsSync(artifact)) return { available: false, unavailable: "no-graph", cause: "ENOENT", artifact, builtAt: null, graph: null };
    try {
      const graph = normalizeGraph(readGraph(artifact));
      return { available: true, unavailable: null, artifact, builtAt: graphArtifactBuiltAt(artifact), graph };
    } catch (error) {
      return { available: false, unavailable: "graph-unreadable", cause: error?.code ?? error?.message ?? "unreadable", artifact, builtAt: null, graph: null };
    }
  }

  //   result { served: true, available, unavailable, artifact, builtAt, files[, cause] }
  //   files[i] { file, present, dependencies, dependents }
  async function relations(paths, ctx) {
    const { graph, cause, ...answer } = availability(ctx.projectRoot);
    if (!answer.available) return { served: true, ...answer, cause, files: [] };
    return { served: true, ...answer, files: computeImpact(graph, paths) };
  }

  return { availability, relations };
}

// The code readers' port (179/ADR-004): test selection, contract derivation and seam liveness ask
// `relations` and nothing else, so they are handed a port over the read half alone — composed
// here from the normalizer's own functions, with no driver behind it. A process the audit family
// reaches is one it can start (59/FF-5904); this port reaches none.
export function createCodeRelations() {
  const { relations } = createCodeGraphReader({ readGraph: readArtifact, normalizeGraph: normalizeArtifact, graphJsonPath: artifactPath, graphArtifactBuiltAt: artifactBuiltAt });
  const reader = Object.freeze({ name: "graphify", corpora: Object.freeze({ code: Object.freeze(["relations"]) }), relations });
  return createKnowledgeEngine({ backends: [reader] }).relations;
}

function buildResult({ graphPath, projectRoot, backend, egress, normalized, builtAt, unchanged, stdout }) {
  return {
    graphPath,
    projectRoot,
    nodeCount: normalized.nodes.length,
    edgeCount: normalized.edges.length,
    hyperedgeCount: normalized.hyperedges.length,
    builtAt,
    backend,
    egress,
    // true when the artifact was left untouched — by graphify finding nothing to change, or by
    // aof finding nothing it read had changed — a SUCCESS meaning "the graph is already current",
    // not a soft failure. Surfaced so a caller can tell it from a rebuild without re-stat'ing.
    unchanged,
    stdout,
  };
}
