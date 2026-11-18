// Fitness function: acd-recall-pick-single-home — FF-20101 (201/ADR-002 §1, §2, §6).
//
// THE INVARIANT — the pick has one home, and no backend knows it. In comment-stripped runtime
// source, the shortlist size, the promoted-lesson filter, the pick's request and the reader of its
// answer are spelt only in `packages/knowledge/src/memory/recall-pick.mjs`. The ranker, the engine
// port and the three backends import nothing from it, and none of them reads a `block` option.
//
// WHY A CONTROL AND NOT A REVIEW NOTE. Thirty-one suites and both backends depend on the ranker,
// and the SPEC keeps the backend contract. A pick that leaked into a backend would differ by
// backend, and one that leaked into the ranker would reach `recurrence` and `status`, which must
// still see a promoted lesson (ADR-005 §4). Every behavioural test stays green through either
// leak, because the block it hands out is the same; only a sweep sees where the rule is written.
//
// Four legs, each with a red probe over planted source, so the detector is shown to fire:
//   (1) the pick-unaware modules import nothing from the leaf and name no `block`;
//   (2) the leaf's own vocabulary (its names, the miss codes, the announcement) is declared and
//       spelt nowhere else in runtime source;
//   (3) inside knowledge, only the leaf reads a lesson's promotion pointers;
//   (4) the leaf is imported only by the seam, its routed door, and core's command binding,
//       where 201/ADR-004 §4 composes the picker.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import { stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";
import * as leaf from "@aof/knowledge/memory/recall-pick";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const LEAF = "packages/knowledge/src/memory/recall-pick.mjs";
// The modules ADR-002 §2 keeps ignorant of the pick: the ranker, the port and every backend.
const UNAWARE = [
  "packages/knowledge/src/memory/local-retrieval.mjs",
  "packages/knowledge/src/engine.mjs",
  "packages/knowledge/src/memory/local-backend.mjs",
  "packages/knowledge/src/memory/graphify-backend.mjs",
  "packages/knowledge/src/memory/none-backend.mjs",
];
// Who may import the leaf: the seam, the routed door, and the binding that composes the picker.
const IMPORTERS = [
  "packages/knowledge/src/memory.mjs",
  "packages/knowledge/src/commands/memory.mjs",
  "packages/core/src/application/bindings/commands/work/memory.mjs",
];
const KNOWLEDGE_SRC = "packages/knowledge/src/";

const MISS_CODE_RE = /["'`]pick-(?:off|unwired|unavailable|timeout|failed|unreadable)["'`]/u;
const ANNOUNCEMENT_RE = /pick unavailable \(/u;
// An import of the leaf: a static or dynamic import whose specifier ends in its name. A string that
// merely ends the same way (`"invalid-memory-recall-pick"`, 201/01's refusal code) is not one.
const LEAF_IMPORT_RE = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)["'][^"']*\/recall-pick(?:\.mjs)?["']/u;

// A declaration of `name`: a function, or a const/let binding.
const declares = (code, name) => new RegExp(`\\bfunction\\s+${name}\\s*\\(|\\b(?:const|let|var)\\s+${name}\\s*=`, "u").test(code);

/**
 * THE SHIPPED DETECTOR. `sources` maps a repo-relative runtime path to its source text; `names`
 * is the leaf's export list. Returns one message per breach.
 */
export function recallPickHomeFailures(sources, names) {
  const failures = [];
  const code = new Map([...sources].map(([rel, source]) => [rel, stripComments(source)]));

  for (const rel of UNAWARE) {
    const text = code.get(rel);
    if (text == null) { failures.push(`${rel} is named pick-unaware by this control and is not in the tree`); continue; }
    if (LEAF_IMPORT_RE.test(text)) failures.push(`${rel} imports the recall-pick leaf: no ranker, port or backend may know the pick (ADR-002 §2)`);
    if (/\bblock\b/u.test(text)) failures.push(`${rel} names \`block\`: the pick is the seam's, and no ranker, port or backend reads a block option (ADR-002 §1)`);
  }

  for (const [rel, text] of code) {
    if (rel === LEAF) continue;
    for (const name of names) {
      if (declares(text, name)) failures.push(`${rel} declares \`${name}\`, which is the recall-pick leaf's (ADR-002 §6)`);
    }
    if (MISS_CODE_RE.test(text)) failures.push(`${rel} spells a pick miss code: the codes are PICK_MISS's, in the leaf (ADR-003 §2)`);
    if (ANNOUNCEMENT_RE.test(text)) failures.push(`${rel} spells the pick's announcement: the line is pickAnnouncement's, in the leaf (ADR-003 §3)`);
    if (rel.startsWith(KNOWLEDGE_SRC) && /\bpromotionPointers\b/u.test(text)) {
      failures.push(`${rel} reads a lesson's promotion pointers: the promoted-lesson filter has one home, the leaf (ADR-005 §1)`);
    }
    if (LEAF_IMPORT_RE.test(text) && !IMPORTERS.includes(rel)) {
      failures.push(`${rel} imports the recall-pick leaf: only the seam, its routed door and core's command binding may (ADR-002 §1, ADR-004 §4)`);
    }
  }
  return failures;
}

async function runtimeSources() {
  const sources = new Map();
  for (const file of await readRuntimeFiles(repoRoot, { runtime: "node" })) {
    sources.set(file.rel.replaceAll("\\", "/"), await readFile(file.path, "utf8"));
  }
  return sources;
}

const LEAF_NAMES = Object.keys(leaf);

// Plant `source` at `rel` over the real tree and answer what the detector says about it.
async function probe(rel, source) {
  const sources = await runtimeSources();
  sources.set(rel, `${sources.get(rel) ?? ""}\n${source}\n`);
  return recallPickHomeFailures(sources, LEAF_NAMES);
}

export const archTests = [
  {
    name: "arch/201 FF-20101: the pick has one home, and no ranker, port or backend knows it",
    run: async () => {
      const sources = await runtimeSources();
      // NON-VACUITY: the sweep saw the tree, the leaf and every module it holds ignorant.
      assert.ok(sources.size > 200, `the runtime tree was walked: ${sources.size} files`);
      for (const rel of [LEAF, ...UNAWARE, ...IMPORTERS]) assert.ok(sources.has(rel), `${rel} is in the swept tree`);
      assert.ok(LEAF_NAMES.includes("PICK_SHORTLIST_SIZE") && LEAF_NAMES.includes("readPickAnswer") && LEAF_NAMES.includes("shortlistRecords"), "the leaf exports its contract");
      assert.deepEqual(recallPickHomeFailures(sources, LEAF_NAMES), []);

      // The leaf itself holds what the rest may not: the sizes, the filter, the codes and the line.
      const own = stripComments(sources.get(LEAF));
      assert.match(own, /PICK_SHORTLIST_SIZE\s*=\s*20\b/u, "the shortlist size is written in the leaf");
      assert.match(own, /\bpromotionPointers\(/u, "the promoted-lesson filter is written in the leaf");
      assert.match(own, MISS_CODE_RE);
      assert.match(own, ANNOUNCEMENT_RE);
      // …and it is pure: one import, the vocabulary's, and no node builtin.
      const imports = importSpecifiers(own).map((entry) => entry.specifier);
      assert.deepEqual(imports, ["@aof/work/memory-vocabulary"], "the leaf imports the vocabulary and nothing else: no disk, no process");
    },
  },
  {
    name: "arch/201 FF-20101 (red probes): a backend that imports the leaf, a ranker that reads a block option, a second spelling of a miss code, a second promotion filter and a stray importer each fire",
    run: async () => {
      const cases = [
        { rel: "packages/knowledge/src/memory/local-backend.mjs", source: `import { shortlistRecords } from "./recall-pick.mjs";`, fires: /local-backend\.mjs imports the recall-pick leaf: no ranker/u },
        { rel: "packages/knowledge/src/memory/local-retrieval.mjs", source: `const cut = (opts) => (opts.block ? 20 : 5);`, fires: /local-retrieval\.mjs names `block`/u },
        { rel: "packages/knowledge/src/engine.mjs", source: `function shortlistRecords(records) { return records.slice(0, 20); }`, fires: /engine\.mjs declares `shortlistRecords`/u },
        { rel: "packages/knowledge/src/memory.mjs", source: `const missed = "pick-timeout";`, fires: /memory\.mjs spells a pick miss code/u },
        { rel: "packages/knowledge/src/commands/memory.mjs", source: "const line = (code) => `[memory] pick unavailable (${code})`;", fires: /commands\/memory\.mjs spells the pick's announcement/u },
        { rel: "packages/knowledge/src/memory.mjs", source: `const promoted = (record) => promotionPointers(record.status).length > 0;`, fires: /memory\.mjs reads a lesson's promotion pointers/u },
        { rel: "packages/work/src/memory-accounting.mjs", source: `import { PICK_MISS } from "@aof/knowledge/memory/recall-pick";`, fires: /memory-accounting\.mjs imports the recall-pick leaf: only the seam/u },
      ];
      for (const { rel, source, fires } of cases) {
        const failures = await probe(rel, source);
        assert.ok(failures.some((failure) => fires.test(failure)), `planting ${JSON.stringify(source)} in ${rel} fires ${fires} (got: ${JSON.stringify(failures)})`);
      }
      // A string that only ends in the leaf's name is not an import of it.
      assert.deepEqual(await probe("packages/knowledge/src/memory-config.mjs", `const code = "invalid-memory-recall-pick";`), []);
      assert.ok((await probe("packages/knowledge/src/memory-config.mjs", `const leaf = await import("./memory/recall-pick.mjs");`)).some((failure) => /memory-config\.mjs imports the recall-pick leaf/u.test(failure)), "a dynamic import is an import");
      // A comment that names the pick is not a spelling of it.
      assert.deepEqual(await probe("packages/knowledge/src/memory/local-retrieval.mjs", `// the block is picked elsewhere ("pick-timeout")`), []);
    },
  },
];
