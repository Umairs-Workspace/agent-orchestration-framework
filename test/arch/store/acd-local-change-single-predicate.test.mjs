// Fitness function FF-16401 · acd-local-change-single-predicate (milestone 164 / ADR-002).
//
//   "Changed since observed" is computed by ONE exported predicate over the ADR-002 fingerprint;
//   the publisher, the detector and both read overlays import it and none re-derives a fingerprint.
//
// Measured, three claims:
//   1. `rowFingerprint` and `locallyChanged` are DECLARED in exactly one runtime module, the pure
//      leaf `packages/work/src/local-change.mjs`.
//   2. Every runtime module that reads the observation baseline (it queries the
//      `work_item_observations` table or calls the store's `readObservations(store, …)`) imports that leaf — a reader
//      holding a baseline with no predicate in hand would have to compare by hand.
//   3. No other runtime module hashes a fingerprint of its own: a module that names `fingerprint`
//      in code and calls `createHash(` is a second derivation.
// Self-check (non-vacuous): planted sources trip each detector.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const HOME = "packages/work/src/local-change.mjs";
const IMPORT = /from\s+["']@aof\/work\/local-change["']/;

function stripComments(source) {
  // Line comments first, then blocks (TECH_DEBT item 24): a line comment holding a block opener
  // must never blind the scan.
  return source.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1").replace(/\/\*[\s\S]*?\*\//g, "");
}

const declares = (code) => /\bfunction\s+(rowFingerprint|locallyChanged)\b|\b(?:const|let)\s+(rowFingerprint|locallyChanged)\s*=/.test(code);
const readsBaseline = (code) => /\bFROM\s+work_item_observations\b|\breadObservations\s*\(\s*store\b/.test(code);
const derivesFingerprint = (code) => /\bfingerprint\b/i.test(code) && /\bcreateHash\s*\(/.test(code);

async function runtimeSources() {
  const out = [];
  for (const file of await readRuntimeFiles(repoRoot)) {
    out.push({ rel: path.relative(repoRoot, file.path).split(path.sep).join("/"), code: stripComments(await readFile(file.path, "utf8")) });
  }
  return out;
}

export const archTests = [
  {
    name: "arch/164 FF-16401 (acd-local-change-single-predicate): rowFingerprint and locallyChanged are declared only in the local-change leaf",
    async run() {
      const sources = await runtimeSources();
      assert.ok(sources.some(({ rel }) => rel === HOME), "the leaf is scanned (non-vacuous)");
      assert.deepEqual(sources.filter(({ code }) => declares(code)).map(({ rel }) => rel), [HOME]);
    },
  },
  {
    name: "arch/164 FF-16401 (acd-local-change-single-predicate): every module that reads the observation baseline imports the one predicate",
    async run() {
      const readers = (await runtimeSources()).filter(({ rel, code }) => rel !== HOME && readsBaseline(code));
      assert.ok(readers.some(({ rel }) => rel === "packages/mesh/src/projection-store.mjs"), "the store (the writer and the detector) reads the baseline (non-vacuous)");
      assert.deepEqual(readers.filter(({ code }) => !IMPORT.test(code)).map(({ rel }) => rel), [], "a baseline reader without the predicate would compare by hand");
    },
  },
  {
    name: "arch/164 FF-16401 (acd-local-change-single-predicate): no other module derives a fingerprint of its own",
    async run() {
      const offenders = (await runtimeSources()).filter(({ rel, code }) => rel !== HOME && derivesFingerprint(code)).map(({ rel }) => rel);
      assert.deepEqual(offenders, []);
    },
  },
  {
    name: "arch/164 FF-16401 (acd-local-change-single-predicate): self-check — a planted declaration, a planted bare baseline reader and a planted hash all trip",
    run() {
      assert.ok(declares("export function locallyChanged(a, b) { return a !== b; }"));
      assert.ok(readsBaseline("db.prepare('SELECT fingerprint FROM work_item_observations')") && readsBaseline("const b = readObservations(store, id, node);") && !IMPORT.test("import x from './y.mjs';"));
      assert.ok(!readsBaseline("work_item_observations: Object.freeze({ class: 'fact' })") && !readsBaseline("readObservations(items, cwd)"), "a classification entry and an unrelated reader are not baseline reads");
      assert.ok(derivesFingerprint("const fingerprint = createHash('sha256').update(row.status).digest('hex');"));
      assert.ok(!declares("import { locallyChanged } from \"@aof/work/local-change\";"), "an import is not a declaration");
    },
  },
];
