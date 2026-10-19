// Fitness function FF-16402 · acd-cache-answers-single-predicate (milestone 164 / ADR-005).
//
//   `buildStreamView`'s overlay and doctor's `overlayFor` both decide "does the cache answer"
//   through the one `cacheAnswers` predicate; neither overlays a row unconditionally.
//
// Before 164 both overlaid every cached row, whoever reported it, so a stale copy of this node's
// own item hid the edit just made. Measured, three claims:
//   1. `cacheAnswers` is declared once, in the local-change leaf.
//   2. Each of the two overlay sites calls it, and imports it from that leaf.
//   3. Neither site reaches its cache-sourced answer before asking it: in `buildStreamView` the
//      call precedes the `"cache"` stamp of a disk item; in `overlayFor` it precedes the
//      `statusFrom: "cache"` return.
// Self-check (non-vacuous): planted sources trip each detector.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LEAF = "packages/work/src/local-change.mjs";
const SITES = [
  { rel: "packages/work/src/read.mjs", fn: "buildStreamView", cacheAnswer: /answeredFrom\.set\(item\.ref,\s*"cache"\)/ },
  { rel: "packages/work/src/doctor/index.mjs", fn: "overlayFor", cacheAnswer: /statusFrom:\s*"cache"/ },
];

function stripComments(source) {
  // Line comments first, then blocks (TECH_DEBT item 24): a line comment holding a block opener
  // must never blind the scan.
  return source.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1").replace(/\/\*[\s\S]*?\*\//g, "");
}

function bodyOf(code, name) {
  const start = code.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  if (start < 0) return null;
  let depth = 0;
  for (let index = code.indexOf("{", code.indexOf(")", start)); index < code.length; index += 1) {
    if (code[index] === "{") depth += 1;
    else if (code[index] === "}" && --depth === 0) return code.slice(start, index + 1);
  }
  return null;
}

// The call must come before the cache-sourced answer it gates.
function asksBeforeAnswering(body, cacheAnswer) {
  const ask = body.search(/\bcacheAnswers\s*\(/);
  const answer = body.search(cacheAnswer);
  return ask >= 0 && answer >= 0 && ask < answer;
}

export const archTests = [
  {
    name: "arch/164 FF-16402 (acd-cache-answers-single-predicate): cacheAnswers is declared once, in the local-change leaf",
    async run() {
      const declaring = [];
      for (const file of await readRuntimeFiles(repoRoot)) {
        const code = stripComments(await readFile(file.path, "utf8"));
        if (/\bfunction\s+cacheAnswers\b|\b(?:const|let)\s+cacheAnswers\s*=/.test(code)) declaring.push(path.relative(repoRoot, file.path).split(path.sep).join("/"));
      }
      assert.deepEqual(declaring, [LEAF]);
    },
  },
  {
    name: "arch/164 FF-16402 (acd-cache-answers-single-predicate): the stream view and doctor's overlay both ask cacheAnswers before answering from the cache",
    async run() {
      for (const site of SITES) {
        const code = stripComments(await readFile(path.join(repoRoot, site.rel), "utf8"));
        assert.match(code, /import\s*\{[^}]*\bcacheAnswers\b[^}]*\}\s*from\s*["'](?:\.\.?\/)+local-change\.mjs["']/, `${site.rel} imports cacheAnswers from the leaf`);
        const body = bodyOf(code, site.fn);
        assert.ok(body, `${site.fn} is found in ${site.rel}`);
        assert.ok(asksBeforeAnswering(body, site.cacheAnswer), `${site.fn} asks cacheAnswers before it answers from the cache`);
      }
    },
  },
  {
    name: "arch/164 FF-16402 (acd-cache-answers-single-predicate): self-check — an unconditional overlay trips, a gated one passes",
    run() {
      const unconditional = "async function buildStreamView(w) { for (const item of items) { answeredFrom.set(item.ref, \"cache\"); } }";
      const gated = "async function buildStreamView(w) { if (!cacheAnswers(row, ctx)) return; answeredFrom.set(item.ref, \"cache\"); }";
      assert.equal(asksBeforeAnswering(bodyOf(unconditional, "buildStreamView"), SITES[0].cacheAnswer), false);
      assert.equal(asksBeforeAnswering(bodyOf(gated, "buildStreamView"), SITES[0].cacheAnswer), true);
    },
  },
];
