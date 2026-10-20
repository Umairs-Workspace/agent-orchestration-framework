// Fitness function FF-16404 · acd-store-never-writes-records (milestone 164 / ADR-001).
//
//   No module writes a record doc from a stored row or doc — no store read flows into a
//   `work.dir` write.
//
// A node's own record files are canonical in both directions: a record reaches a disk by the
// operator's hand, a verb, or git, and never by materialising what the store holds. Measured: no
// runtime module that READS stored rows, docs or runs also WRITES a file. That is the stronger
// structural property — a store reader with no file write cannot materialise anything — and it
// holds at HEAD with an empty offender list.
// Self-check (non-vacuous): a planted materialiser trips the detector.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function stripComments(source) {
  // Line comments first, then blocks (TECH_DEBT item 24): a line comment holding a block opener
  // must never blind the scan.
  return source.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1").replace(/\/\*[\s\S]*?\*\//g, "");
}

// What a stored row, doc or run is read through: the store's read accessors and its tables.
const readsStore = (code) => /\b(readWorkItemDoc|readWorkItemDocMembers|readWorkItemRuns|readWorkspaceItems)\s*\(|\b(work_item_docs|work_item_runs)\b|FROM\s+work_items\b/.test(code);
// What writing a file is.
const writesFiles = (code) => /\b(writeFile|writeFileSync|appendFile|appendFileSync|rename|renameSync|copyFile|copyFileSync|cp|cpSync|createWriteStream)\s*\(/.test(code);

export const archTests = [
  {
    name: "arch/164 FF-16404 (acd-store-never-writes-records): no runtime module that reads stored rows, docs or runs writes a file",
    async run() {
      const readers = [];
      const offenders = [];
      for (const file of await readRuntimeFiles(repoRoot)) {
        const code = stripComments(await readFile(file.path, "utf8"));
        if (!readsStore(code)) continue;
        const rel = path.relative(repoRoot, file.path).split(path.sep).join("/");
        readers.push(rel);
        if (writesFiles(code)) offenders.push(rel);
      }
      assert.ok(readers.includes("packages/mesh/src/projection-store.mjs"), "the store's own readers are scanned (non-vacuous)");
      assert.deepEqual(offenders, [], "a store reader that writes files could materialise a stored record onto a checkout");
    },
  },
  {
    name: "arch/164 FF-16404 (acd-store-never-writes-records): self-check — a planted materialiser trips the detector",
    run() {
      const planted = "const body = readWorkItemDoc(store, id, ref, 'STORY.md'); await writeFile(path.join(workDir, 'STORY.md'), body);";
      assert.ok(readsStore(planted) && writesFiles(planted));
      assert.ok(!writesFiles("await readFile(path)"), "a read is not a write");
    },
  },
];
