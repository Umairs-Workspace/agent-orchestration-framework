// test/support/golden/baseline-store.mjs — read a committed baseline and say how a run differs
// from it (203/ADR-003, ADR-004). Read-only: the one writer is `baseline-writer.mjs`, imported by
// `scripts/golden.mjs` alone (FF-20302).
//
// A scenario's baseline is `<root>/<lane>/<scenario>/`: `project/<path>.golden` and
// `home/<path>.golden` for each file it adds or changes relative to its base, `removed.golden`
// listing the base paths it lacks, and `steps.golden`, its normalised step records. Its expected
// tree is its base's expected tree, minus `removed`, overlaid with its own files.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashContent } from "../../../packages/core/src/lock.mjs";
import { baseChain } from "./lanes.mjs";
import { unifiedDiff } from "./line-diff.mjs";
import { fillPlaceholders } from "./normalise.mjs";

export const DEFAULT_BASELINE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "golden", "baselines");
export const SUFFIX = ".golden";
export const REMOVED_FILE = "removed.golden";
export const STEPS_FILE = "steps.golden";
export const TREE_PREFIXES = Object.freeze(["project", "home"]);

const byPath = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const scenarioDir = (root, laneId, scenarioId) => path.join(root, laneId, scenarioId);

export const updateCommand = (laneId, scenarioId) => `node scripts/golden.mjs --lane ${laneId} --scenario ${scenarioId} --update`;

// The stored delta of one scenario, or null when it has no baseline directory.
export function readStored(root, laneId, scenarioId) {
  const dir = scenarioDir(root, laneId, scenarioId);
  if (!existsSync(path.join(dir, STEPS_FILE))) return null;
  const files = new Map();
  for (const prefix of TREE_PREFIXES) {
    const walk = (current, segments) => {
      if (!existsSync(current)) return;
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) walk(full, [...segments, entry.name]);
        else if (entry.isFile() && entry.name.endsWith(SUFFIX)) {
          files.set([prefix, ...segments, entry.name.slice(0, -SUFFIX.length)].join("/"), readFileSync(full, "utf8"));
        }
      }
    };
    walk(path.join(dir, prefix), []);
  }
  const removedText = existsSync(path.join(dir, REMOVED_FILE)) ? readFileSync(path.join(dir, REMOVED_FILE), "utf8") : "";
  const removed = removedText.split("\n").filter((line) => line !== "");
  return { files, removed, steps: readFileSync(path.join(dir, STEPS_FILE), "utf8") };
}

// materialise({ lanes, root, laneId, scenarioId }) → { tree, steps } or { missing } when a
// scenario on the chain has no baseline. A missing base and a cycle throw (ADR-003 §2).
export function materialise({ lanes, root = DEFAULT_BASELINE_ROOT, laneId, scenarioId }) {
  const chain = baseChain(lanes, laneId, scenarioId);
  const stored = [];
  for (const ref of chain) {
    const delta = readStored(root, ref.laneId, ref.scenarioId);
    if (!delta) {
      const name = ref.laneId === laneId ? ref.scenarioId : `${ref.laneId}/${ref.scenarioId}`;
      return { missing: ref === chain[0] ? `"${scenarioId}" has no baseline.` : `"${scenarioId}" builds on "${name}", which has no baseline.` };
    }
    stored.push(delta);
  }
  const tree = new Map();
  for (const delta of [...stored].reverse()) {
    for (const key of delta.removed) tree.delete(key);
    for (const [key, text] of delta.files) tree.set(key, text);
  }
  // Step records are never inherited: each scenario stores its own.
  return { tree: new Map([...tree].sort(([a], [b]) => byPath(a, b))), steps: stored[0].steps };
}

export function compareTrees(expected, actual) {
  const added = [...actual.tree.keys()].filter((key) => !expected.tree.has(key)).sort(byPath);
  const removed = [...expected.tree.keys()].filter((key) => !actual.tree.has(key)).sort(byPath);
  const changed = [...actual.tree.keys()].filter((key) => expected.tree.has(key) && expected.tree.get(key) !== actual.tree.get(key)).sort(byPath);
  const stepsChanged = expected.steps !== actual.steps;
  return { added, removed, changed, stepsChanged, passed: !added.length && !removed.length && !changed.length && !stepsChanged };
}

// The failure report (ADR-004 §2): the summary first, then a unified diff per file for the first
// `limit` files in path order, then the step records' diff, then the command that accepts it.
export function renderReport(difference, { expected, actual, laneId, scenarioId, limit = 20 }) {
  const lines = [];
  for (const [heading, paths] of [["added", difference.added], ["removed", difference.removed], ["changed", difference.changed]]) {
    if (!paths.length) continue;
    lines.push(`${paths.length} ${heading}`);
    for (const key of paths) lines.push(`  ${key}`);
  }
  if (difference.stepsChanged) lines.push("step records changed");
  const diffed = [...difference.added, ...difference.removed, ...difference.changed].sort(byPath);
  for (const key of diffed.slice(0, limit)) {
    lines.push("", unifiedDiff(expected.tree.get(key) ?? null, actual.tree.get(key) ?? null, { oldLabel: `baseline/${key}`, newLabel: `actual/${key}` }).trimEnd());
  }
  if (difference.stepsChanged) {
    lines.push("", unifiedDiff(expected.steps, actual.steps, { oldLabel: `baseline/${STEPS_FILE}`, newLabel: `actual/${STEPS_FILE}` }).trimEnd());
  }
  const left = diffed.length - Math.min(diffed.length, limit);
  if (left > 0) lines.push("", `${left} diffs were left out; node scripts/golden.mjs --lane ${laneId} --scenario ${scenarioId} prints them all.`);
  lines.push("", updateCommand(laneId, scenarioId));
  return lines.join("\n");
}

// ── The rebuild (203/ADR-006 §3, §4): a committed baseline back into a real tree ─────────────
//
// Materialisation plus rehydration. Every placeholder is filled with the running value, and every
// hash in aof's two install records is recomputed from the rebuilt file it names, with
// `hashContent`, the function that wrote it. The result is a tree `aof work update` accepts as its
// own output. It returns a Map and writes nothing.

export const INSTALL_RECORDS = Object.freeze(["project/.aof/aof.apply-journal.json", "project/.aof/aof.lock.json"]);
const HASH_PLACEHOLDER = "sha256:<hash>";

// The paths a scenario's own steps reported as drifted. The stored hashes are placeholders, so a
// drifted baseline is recognised by its step records (ADR-006 §3).
export function driftedPaths(stepsText) {
  const drifted = [];
  for (const step of JSON.parse(stepsText)) {
    const envelope = step.envelope ?? {};
    const named = (envelope.actions ?? []).filter((action) => action.action === "drift-warning").map((action) => action.path);
    if (named.length) drifted.push(...named);
    else if ((envelope.summary?.["drift-warning"] ?? 0) > 0) drifted.push("(a drift-warning its actions do not name)");
  }
  return drifted;
}

// A Codex hooks file's ownership is the hash of each aof group per event. The merge appends aof's
// groups after the user's (codex-settings.mjs `mergeHooks`), so aof's are the last N of each event.
function rehashOwnership(ownership, text, where) {
  if (ownership.kind !== "hooks") throw new Error(`golden: cannot rebuild ${where}: it records "${ownership.kind}" ownership, which the rebuild does not recompute`);
  const hooks = JSON.parse(text).hooks ?? {};
  const groups = {};
  for (const [event, hashes] of Object.entries(ownership.groups ?? {})) {
    const present = hooks[event] ?? [];
    if (present.length < hashes.length) throw new Error(`golden: cannot rebuild ${where}: it owns ${hashes.length} ${event} hook group(s) and the file holds ${present.length}`);
    groups[event] = present.slice(present.length - hashes.length).map((group) => hashContent(JSON.stringify(group)));
  }
  return { ...ownership, groups };
}

// rehash(tree, name) → a new tree whose install records hash the files they name. Entries keep
// their order: a re-sort would put a self-inflicted diff in every lock.
export function rehash(tree, name = "the tree") {
  const out = new Map(tree);
  for (const key of INSTALL_RECORDS) {
    if (!out.has(key)) continue;
    const record = JSON.parse(out.get(key));
    for (const entry of record.work?.files ?? record.files ?? []) {
      const file = `project/${entry.path}`;
      if (!out.has(file)) throw new Error(`golden: cannot rebuild ${name}: ${key} names ${entry.path}, which the baseline does not hold`);
      entry.hash = hashContent(out.get(file));
      if (entry.ownership) entry.ownership = rehashOwnership(entry.ownership, out.get(file), `${name} (${entry.path})`);
    }
    const text = `${JSON.stringify(record, null, 2)}\n`;
    if (text.includes(HASH_PLACEHOLDER)) throw new Error(`golden: cannot rebuild ${name}: ${key} holds a ${HASH_PLACEHOLDER} the rebuild could not recompute`);
    out.set(key, text);
  }
  return out;
}

// rebuild({ lanes, root, laneId, scenarioId, values }) → Map<"project/…" | "home/…", text>.
// `values` holds the running `project`, `home`, `version`, `buildId` and, optionally, `timestamp`.
// A scenario whose steps reported a drift-warning, or whose lock names a file it lacks, is refused.
export function rebuild({ lanes, root = DEFAULT_BASELINE_ROOT, laneId, scenarioId, values }) {
  const name = `${laneId}/${scenarioId}`;
  const expected = materialise({ lanes, root, laneId, scenarioId });
  if (expected.missing) throw new Error(`golden: cannot rebuild ${name}: ${expected.missing}`);
  const drifted = driftedPaths(expected.steps);
  if (drifted.length) throw new Error(`golden: cannot rebuild ${name}: its step records report drift, at ${drifted.join(", ")}`);
  const filled = { timestamp: new Date().toISOString(), ...values };
  const tree = new Map([...expected.tree].map(([key, text]) => [key, fillPlaceholders(text, filled)]));
  return rehash(tree, name);
}
