import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultSessionHooks as _aofHooks } from "aof/session-hooks";
// Fitness function: acd-run-node-path-single-builder (milestone 26 / story 00 /
// ADR-001 / fitness #1) — "One run-path builder."
//
//   "runNodeRecordPath is defined ONCE, in packages/core/src/run-store.mjs (built FROM runsDir,
//    the frozen m22 shape byte-identical: join(runsDir(item), node, runId + '.json'));
//    packages/core/src/mesh/store.mjs RE-EXPORTS it (no local redefinition); no other module joins
//    runsDir + a node segment itself; the persist path routes through the builder."
//
// The strongest re-export proof is FUNCTION IDENTITY (the same object reference from
// both modules), plus output shape-equality against the frozen m22 convention, plus
// a comment-stripped source scan of ALL of src/ for a second node-segment join of
// runsDir. Non-vacuous per the m03 lesson: each matcher is self-checked against a
// planted violation.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC = path.join(repoRoot, "packages", "core", "src");
const RUN_STORE = path.join(repoRoot, "packages/execution/src/runs.mjs");
const MESH_STORE = path.join(repoRoot, "packages/mesh/src/store.mjs");

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}


// Every `join(runsDir(...), …)` call in a comment-stripped source, with its
// top-level argument count — a call with 3+ arguments joins a segment BETWEEN
// runsDir and the leaf, i.e. it builds a node-partitioned run path.
function runsDirJoinCalls(code) {
  const calls = [];
  const re = /(?:path\s*\.\s*)?join\s*\(\s*runsDir\s*\(/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    // Balanced scan of the OUTER join(...) argument list.
    const open = code.indexOf("(", m.index + m[0].indexOf("join"));
    let depth = 0;
    let args = 1;
    let end = -1;
    for (let i = open; i < code.length; i += 1) {
      const ch = code[i];
      if (ch === "(" || ch === "[" || ch === "{") depth += 1;
      else if (ch === ")" || ch === "]" || ch === "}") {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      } else if (ch === "," && depth === 1) args += 1;
    }
    if (end === -1) continue;
    calls.push({ args, text: code.slice(m.index, end + 1) });
  }
  return calls;
}

export const archTests = [
  {
    name: "arch/run-node-path-single-builder: runNodeRecordPath is defined once in run-store.mjs and mesh-store.mjs RE-EXPORTS it (function identity — the same reference from both modules)",
    run: async () => {
      const runStore = await Promise.resolve(Object.freeze({
  COST_SOURCES: _aofApplication.execution.runs.COST_SOURCES,
  DEFAULT_PARK_MINUTES: _aofApplication.execution.runs.DEFAULT_PARK_MINUTES,
  EXIT_REASONS: _aofApplication.execution.runs.EXIT_REASONS,
  PRICE_TABLE_VERSION: _aofApplication.execution.runs.PRICE_TABLE_VERSION,
  SPEND_ENVELOPE_KEYS: _aofApplication.execution.runs.SPEND_ENVELOPE_KEYS,
  TOKEN_BUCKET_KEYS: _aofApplication.execution.runs.TOKEN_BUCKET_KEYS,
  answerRunAsk: _aofApplication.execution.runs.answerRunAsk,
  applyTransition: _aofApplication.execution.runs.applyTransition,
  completeRun: _aofApplication.execution.runs.completeRun,
  heartbeat: _aofApplication.execution.runs.heartbeat,
  isLegalTransition: _aofApplication.execution.runs.isLegalTransition,
  isRetryable: _aofApplication.execution.runs.isRetryable,
  isRunning: _aofApplication.execution.runs.isRunning,
  isStale: _aofApplication.execution.runs.isStale,
  mapVendorTokensToBuckets: _aofApplication.execution.runs.mapVendorTokensToBuckets,
  openRunAsk: _aofApplication.execution.runs.openRunAsk,
  parkRunAsk: _aofApplication.execution.runs.parkRunAsk,
  parseResumeAfter: _aofApplication.execution.runs.parseResumeAfter,
  priceVendorTokens: _aofApplication.execution.runs.priceVendorTokens,
  pruneRun: _aofApplication.execution.runs.pruneRun,
  readRuns: _aofApplication.execution.runs.readRuns,
  reclaimRun: _aofApplication.execution.runs.reclaimRun,
  reclaimStaleRuns: _aofApplication.execution.runs.reclaimStaleRuns,
  recordAnchorReading: _aofApplication.execution.runs.recordAnchorReading,
  recordAnswers: _aofApplication.execution.runs.recordAnswers,
  recordSessionId: _aofApplication.execution.runs.recordSessionId,
  retryReadiness: _aofApplication.execution.runs.retryReadiness,
  retryRun: _aofApplication.execution.runs.retryRun,
  rewriteRunItemRef: _aofApplication.execution.runs.rewriteRunItemRef,
  runNodeRecordPath: _aofApplication.execution.runs.runNodeRecordPath,
  runRecordPath: _aofApplication.execution.runs.runRecordPath,
  runsDir: _aofApplication.execution.runs.runsDir,
  settleRun: _aofApplication.execution.runs.settleRun,
  settleRunFromVendor: _aofApplication.execution.runs.settleRunFromVendor,
  staleRunningRuns: _aofApplication.execution.runs.staleRunningRuns,
  startRun: _aofApplication.execution.runs.startRun,
  shouldRetry: _aofApplication.execution.runs.shouldRetry,
}));
      const meshStore = await Promise.resolve(Object.freeze({
  aofHome: _aofHooks.meshStore.aofHome,
  meshDir: _aofHooks.meshStore.meshDir,
  nodeRecordPath: _aofHooks.meshStore.nodeRecordPath,
  presenceRecordPath: _aofHooks.meshStore.presenceRecordPath,
  publishNodeRecord: _aofHooks.meshStore.publishNodeRecord,
  readNodeRecord: _aofHooks.meshStore.readNodeRecord,
  readNodeRecords: _aofHooks.meshStore.readNodeRecords,
  runsDir: _aofApplication.execution.runs.runsDir,
  runRecordPath: _aofApplication.execution.runs.runRecordPath,
  runNodeRecordPath: _aofApplication.execution.runs.runNodeRecordPath,
}));
      assert.equal(typeof runStore.runNodeRecordPath, "function", "run-store.mjs exports runNodeRecordPath (the builder's authority home)");
      assert.equal(
        meshStore.runNodeRecordPath,
        runStore.runNodeRecordPath,
        "mesh-store.mjs re-exports run-store's runNodeRecordPath — the SAME function reference, so there is exactly ONE builder"
      );
      // …and mesh-store holds NO local redefinition (the m22 local definition was
      // replaced by the re-export — a home change, not a contract change).
      const meshCode = stripComments(await readFile(MESH_STORE, "utf8"));
      assert.ok(
        !/function\s+runNodeRecordPath\s*\(/.test(meshCode),
        "mesh-store.mjs defines NO local runNodeRecordPath (it re-exports run-store's)"
      );
      // Self-check (non-vacuous): the matcher DOES catch a local redefinition.
      assert.ok(
        /function\s+runNodeRecordPath\s*\(/.test("export function runNodeRecordPath(item, node, runId) {"),
        "the redefinition matcher catches a real local definition"
      );
    },
  },
  {
    name: "arch/run-node-path-single-builder: the builder's output is byte-identical to the frozen m22 shape — join(runsDir(item), node, runId + '.json'), the run-id leaf unchanged",
    run: async () => {
      const { runNodeRecordPath, runRecordPath, runsDir } = await Promise.resolve(Object.freeze({
  COST_SOURCES: _aofApplication.execution.runs.COST_SOURCES,
  DEFAULT_PARK_MINUTES: _aofApplication.execution.runs.DEFAULT_PARK_MINUTES,
  EXIT_REASONS: _aofApplication.execution.runs.EXIT_REASONS,
  PRICE_TABLE_VERSION: _aofApplication.execution.runs.PRICE_TABLE_VERSION,
  SPEND_ENVELOPE_KEYS: _aofApplication.execution.runs.SPEND_ENVELOPE_KEYS,
  TOKEN_BUCKET_KEYS: _aofApplication.execution.runs.TOKEN_BUCKET_KEYS,
  answerRunAsk: _aofApplication.execution.runs.answerRunAsk,
  applyTransition: _aofApplication.execution.runs.applyTransition,
  completeRun: _aofApplication.execution.runs.completeRun,
  heartbeat: _aofApplication.execution.runs.heartbeat,
  isLegalTransition: _aofApplication.execution.runs.isLegalTransition,
  isRetryable: _aofApplication.execution.runs.isRetryable,
  isRunning: _aofApplication.execution.runs.isRunning,
  isStale: _aofApplication.execution.runs.isStale,
  mapVendorTokensToBuckets: _aofApplication.execution.runs.mapVendorTokensToBuckets,
  openRunAsk: _aofApplication.execution.runs.openRunAsk,
  parkRunAsk: _aofApplication.execution.runs.parkRunAsk,
  parseResumeAfter: _aofApplication.execution.runs.parseResumeAfter,
  priceVendorTokens: _aofApplication.execution.runs.priceVendorTokens,
  pruneRun: _aofApplication.execution.runs.pruneRun,
  readRuns: _aofApplication.execution.runs.readRuns,
  reclaimRun: _aofApplication.execution.runs.reclaimRun,
  reclaimStaleRuns: _aofApplication.execution.runs.reclaimStaleRuns,
  recordAnchorReading: _aofApplication.execution.runs.recordAnchorReading,
  recordAnswers: _aofApplication.execution.runs.recordAnswers,
  recordSessionId: _aofApplication.execution.runs.recordSessionId,
  retryReadiness: _aofApplication.execution.runs.retryReadiness,
  retryRun: _aofApplication.execution.runs.retryRun,
  rewriteRunItemRef: _aofApplication.execution.runs.rewriteRunItemRef,
  runNodeRecordPath: _aofApplication.execution.runs.runNodeRecordPath,
  runRecordPath: _aofApplication.execution.runs.runRecordPath,
  runsDir: _aofApplication.execution.runs.runsDir,
  settleRun: _aofApplication.execution.runs.settleRun,
  settleRunFromVendor: _aofApplication.execution.runs.settleRunFromVendor,
  staleRunningRuns: _aofApplication.execution.runs.staleRunningRuns,
  startRun: _aofApplication.execution.runs.startRun,
  shouldRetry: _aofApplication.execution.runs.shouldRetry,
}));
      const item = { ref: "26", dir: path.join("C:", "repo", "wiki", "work", "26_milestone_x") };
      const node = "umami-desktop";
      const runId = "20260702T100000000Z-0000";
      const built = runNodeRecordPath(item, node, runId);
      assert.equal(
        built,
        path.join(runsDir(item), node, runId + ".json"),
        "the built path equals the frozen shape join(runsDir(item), node, runId + '.json') byte-identically"
      );
      // The convention is 19's runRecordPath with ONE <node>/ segment inserted
      // before the leaf — leaf byte-identical.
      const flat = runRecordPath(item, runId);
      assert.equal(built, path.join(path.dirname(flat), node, path.basename(flat)), "the shape is runRecordPath with one <node>/ segment inserted");
      assert.equal(path.basename(built), path.basename(flat), "the run-id leaf is byte-identical to the flat leaf");
    },
  },
  {
    name: "arch/run-node-path-single-builder: no second node-segment join of runsDir exists anywhere in src/ (the ONE 3-arg join(runsDir…, node, leaf) site is runNodeRecordPath in run-store.mjs)",
    run: async () => {
      const offenders = [];
      let builderSites = 0;
      for (const { path: file } of await readRuntimeFiles(repoRoot)) {
        const code = stripComments(await readFile(file, "utf8"));
        for (const call of runsDirJoinCalls(code)) {
          if (call.args < 3) continue; // a 2-arg join (dir + leaf / dir + subdir) is not a node builder
          if (file === RUN_STORE) {
            builderSites += 1;
          } else {
            offenders.push(`${path.relative(repoRoot, file)}: ${call.text}`);
          }
        }
      }
      assert.deepEqual(offenders, [], `no module outside run-store.mjs joins runsDir + a node segment itself — found: ${offenders.join("; ")}`);
      assert.equal(builderSites, 1, `run-store.mjs holds exactly ONE node-segment join of runsDir (the runNodeRecordPath definition) — found ${builderSites}`);
      // Self-checks (non-vacuous): the scanner counts args correctly on both forms.
      const planted = runsDirJoinCalls('const p = path.join(runsDir(item), node, runId + ".json");');
      assert.ok(planted.length === 1 && planted[0].args === 3, "the scanner catches a planted 3-arg node-segment join");
      const flat = runsDirJoinCalls('const p = path.join(runsDir(item), runId + ".json");');
      assert.ok(flat.length === 1 && flat[0].args === 2, "the scanner does NOT flag the 2-arg flat join");
    },
  },
  {
    name: "arch/run-node-path-single-builder: the persist path routes through the builders (record.node ⇒ runNodeRecordPath, null ⇒ runRecordPath — record → path, one direction)",
    run: async () => {
      const code = stripComments(await readFile(RUN_STORE, "utf8"));
      const match = /function\s+persist\s*\(/.exec(code);
      assert.ok(match, "persist is defined in run-store.mjs");
      const open = code.indexOf("{", match.index);
      let depth = 1;
      let body = "";
      for (let i = open + 1; i < code.length && depth > 0; i += 1) {
        const ch = code[i];
        if (ch === "{") depth += 1;
        else if (ch === "}") { depth -= 1; if (depth === 0) break; }
        body += ch;
      }
      assert.ok(/runNodeRecordPath\s*\(/.test(body), "persist routes the node-partitioned write through runNodeRecordPath (the builder, never an inline join)");
      assert.ok(/\brunRecordPath\s*\(/.test(body), "persist routes the flat write through runRecordPath");
      assert.ok(/record\s*\.\s*node/.test(body), "the placement derives FROM the record's node key (record → path)");
    },
  },
];
