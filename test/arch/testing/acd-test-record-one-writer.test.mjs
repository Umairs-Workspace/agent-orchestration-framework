import { defaultApplication as _aofApplication } from "aof/default-application";
// Fitness functions: acd-test-record-one-writer (milestone 190 / story 00, FF-19001 and FF-19004;
// ADR-001 §1, §2).
//
//   FF-19001 · A TEST RECORD HAS ONE WRITER. Only `packages/work/src/testing/record.mjs` writes
//   under `<git common dir>/aof/test-records/`, and no command's input schema carries a field that
//   supplies a result, a failure or a record to be written.
//
//   FF-19004 · THE CONTENT KEY HAS ONE PRODUCER. No module outside `record.mjs` spawns
//   `git write-tree` or sets `GIT_INDEX_FILE`.
//
// A record stands in for a run only while the party that ran the suite is the party that wrote
// it. The first leg keeps a second writer out of the store — the store's directory name is the
// one spelling any writer would need — and the second keeps a caller from handing a verdict in
// through a command's input. A key stands in for content only while one module computes it: two
// producers that disagree by one flag (ignored files, a HEAD-based start) answer one tree from
// another's record, which is m167/01 R1's near-miss one level up.
//
// ── THE BASELINE IS NAMED AND SHRINK-ONLY ────────────────────────────────────────────────────
//
// Two modules spelled the key's mechanism before this control existed, and both are named here
// with their reason rather than silently admitted:
//   · `packages/work-loop/src/commands/loop.mjs` — `readBuildBaseline` snapshots the whole visible
//     worktree into a tree id to scope the review diff. It IS a second producer of this key, found
//     at 190/00's build; routing it through `record.mjs` is outside 190/00's write set and is
//     recorded as a finding in 190's STATE.md.
//   · `packages/integration-hyperagent/src/check.mjs` — sets `GIT_INDEX_FILE` to EXTRACT a plan
//     branch's tree (`read-tree` + `checkout-index`). It computes no key; it is admitted for the
//     variable, not for `write-tree`, which it does not spawn.
// A baselined module that no longer matches fails too, so the list can only shrink.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const RECORD_MODULE = "packages/work/src/testing/record.mjs";

// The fields an input could carry a verdict in (FF-19001's second leg).
const VERDICT_FIELDS = Object.freeze(["result", "failures", "record"]);

const KEY_BASELINE = Object.freeze({
  "packages/work-loop/src/commands/loop.mjs": "the build baseline's worktree snapshot — a second producer of the key, recorded as a 190 finding",
  "packages/integration-hyperagent/src/check.mjs": "extracts a plan branch through a private index; computes no key",
});

// ── PURE CENSORS ─────────────────────────────────────────────────────────────────────────────

// PURE — `[{ rel, code }]` in, the modules other than the record leaf that name the store.
export function storeWriterProblems(sources) {
  return sources
    .filter(({ rel }) => rel !== RECORD_MODULE)
    .filter(({ code }) => /test-records/u.test(stripComments(code)))
    .map(({ rel }) => `${rel} names the test-record store — a record has one writer, ${RECORD_MODULE} (FF-19001)`);
}

// PURE — commands in, every input property that could carry a verdict.
export function verdictInputProblems(commands) {
  const problems = [];
  for (const command of commands) {
    for (const field of Object.keys(command?.input?.properties ?? {})) {
      if (VERDICT_FIELDS.includes(field)) {
        problems.push(`${command.id} takes \`${field}\` as input — a result is produced by the party that ran the suite, never handed in (FF-19001)`);
      }
    }
  }
  return problems;
}

const KEY_SHAPES = Object.freeze([
  { label: "spawns `git write-tree`", pattern: /(["'`])write-tree\1/u },
  { label: "sets `GIT_INDEX_FILE`", pattern: /\bGIT_INDEX_FILE\b/u },
]);

// PURE — the modules other than the record leaf that spell the key's mechanism, and which shape.
export function keyProducers(sources) {
  const found = new Map();
  for (const { rel, code } of sources) {
    if (rel === RECORD_MODULE) continue;
    const stripped = stripComments(code);
    const shapes = KEY_SHAPES.filter((shape) => shape.pattern.test(stripped)).map((shape) => shape.label);
    if (shapes.length > 0) found.set(rel, shapes);
  }
  return found;
}

// Every runtime module, plus the repository's own scripts — the sharded runner and the gate's
// helpers live there, and they are the likeliest second writer.
async function productionSources() {
  const sources = [];
  for (const file of await readRuntimeFiles(repoRoot)) {
    if (!file.rel.endsWith(".mjs")) continue;
    sources.push({ rel: file.rel, code: await readFile(file.path, "utf8") });
  }
  for (const name of await readdir(path.join(repoRoot, "scripts"))) {
    if (name.endsWith(".mjs")) sources.push({ rel: `scripts/${name}`, code: await readFile(path.join(repoRoot, "scripts", name), "utf8") });
  }
  return sources;
}

export const archTests = [
  {
    name: "arch/190 FF-19001 (acd-test-record-one-writer): a test record has one writer",
    run: async () => {
      const sources = await productionSources();
      assert.equal(sources.some(({ rel }) => rel === RECORD_MODULE), true, "the census reaches the record leaf itself");
      assert.deepEqual(storeWriterProblems(sources), []);
      // It fails on a second writer, and on a verdict field in a command's input.
      assert.equal(storeWriterProblems([{ rel: "packages/work/src/commands/x.mjs", code: 'const dir = path.join(common, "aof", "test-records");' }]).length, 1);
      assert.deepEqual(storeWriterProblems([{ rel: "packages/work/src/commands/x.mjs", code: "// the test-records store is not touched here\n" }]), [], "prose is not a writer");
      const commands = _aofApplication.listCommands();
      assert.equal(commands.length > 50, true, "the registry is read, not an empty list");
      assert.deepEqual(verdictInputProblems(commands), []);
      for (const field of VERDICT_FIELDS) {
        assert.equal(verdictInputProblems([{ id: "planted", input: { properties: { [field]: { type: "string" } } } }]).length, 1, `a planted \`${field}\` input is named`);
      }
    },
  },
  {
    name: "arch/190 FF-19004 (acd-test-record-one-writer): the content key has one producer",
    run: async () => {
      const sources = await productionSources();
      const found = keyProducers(sources);
      const unexpected = [...found.keys()].filter((rel) => !(rel in KEY_BASELINE));
      assert.deepEqual(unexpected, [], `a module outside ${RECORD_MODULE} produces the content key`);
      for (const rel of Object.keys(KEY_BASELINE)) {
        assert.equal(found.has(rel), true, `${rel} no longer spells the key's mechanism — drop it from the baseline, which only shrinks`);
      }
      assert.deepEqual(found.get("packages/integration-hyperagent/src/check.mjs"), ["sets `GIT_INDEX_FILE`"], "the extraction is admitted for the variable only");
      const record = sources.find(({ rel }) => rel === RECORD_MODULE);
      assert.equal(keyProducers([{ ...record, rel: "packages/work/src/x.mjs" }]).get("packages/work/src/x.mjs").length, 2, "the record leaf's own mechanism is what the census sees");
      assert.equal(keyProducers([{ rel: "packages/work/src/x.mjs", code: 'await git(["write-tree"]);' }]).size, 1, "a planted write-tree is named");
    },
  },
];
