// test/support/golden/baseline-writer.mjs — THE one writer of a golden baseline (203/ADR-004 §5).
// Imported by `scripts/golden.mjs` and by nothing else; FF-20302 asserts it. A test that wants a
// baseline runs the script.
//
// It stores a scenario's minimal delta (ADR-003 §3): a file only when its base lacks it or its
// normalised text differs. It syncs the scenario's directory to that delta — writing what
// changed, deleting what is no longer needed — and compares before writing, so an unchanged
// file keeps its bytes and its modification time.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REMOVED_FILE, STEPS_FILE, SUFFIX, scenarioDir } from "./baseline-store.mjs";

const byPath = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// The directory a scenario should hold, as Map<relative path, text>.
export function desiredDelta({ tree, steps }, baseTree = null) {
  const desired = new Map();
  for (const [key, text] of tree) {
    if (baseTree && baseTree.get(key) === text) continue;
    desired.set(`${key}${SUFFIX}`, text);
  }
  const removed = baseTree ? [...baseTree.keys()].filter((key) => !tree.has(key)).sort(byPath) : [];
  desired.set(REMOVED_FILE, removed.length ? `${removed.join("\n")}\n` : "");
  desired.set(STEPS_FILE, steps);
  return desired;
}

function filesUnder(dir) {
  const found = [];
  const walk = (current, segments) => {
    if (!existsSync(current)) return;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full, [...segments, entry.name]);
      else found.push([...segments, entry.name].join("/"));
    }
  };
  walk(dir, []);
  return found;
}

function pruneEmptyDirs(dir, keep) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) pruneEmptyDirs(path.join(dir, entry.name), false);
  }
  if (!keep && readdirSync(dir).length === 0) rmdirSync(dir);
}

// writeScenario({ root, laneId, scenarioId, actual, baseTree }) → { written, deleted }, each a
// sorted list of paths relative to `root`, "/"-joined.
export function writeScenario({ root, laneId, scenarioId, actual, baseTree = null }) {
  const dir = scenarioDir(root, laneId, scenarioId);
  const desired = desiredDelta(actual, baseTree);
  const written = [];
  const deleted = [];
  for (const rel of filesUnder(dir)) {
    if (desired.has(rel)) continue;
    unlinkSync(path.join(dir, ...rel.split("/")));
    deleted.push(`${laneId}/${scenarioId}/${rel}`);
  }
  for (const [rel, text] of [...desired].sort(([a], [b]) => byPath(a, b))) {
    const target = path.join(dir, ...rel.split("/"));
    if (existsSync(target) && readFileSync(target, "utf8") === text) continue;
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
    written.push(`${laneId}/${scenarioId}/${rel}`);
  }
  pruneEmptyDirs(dir, true);
  return { written, deleted: deleted.sort(byPath) };
}
