// Fitness function FF-16403 · acd-sync-rides-the-effects-journal (milestone 164 / ADR-003).
//
//   Sync state lives only in `journal.sqlite` and `projection.sqlite`; no package source opens or
//   creates any other database or ledger file under the global mesh root.
//
// The operator's "global ledger" already exists — the effects journal — so a sync mark is an
// event in it and a baseline is a table beside the rows (extend the existing surface, never add
// a sibling). Measured, three claims:
//   1. A SQLite database is constructed (`new …DatabaseSync(`) in exactly the two openers:
//      the effects journal's and the projection store's.
//   2. The only database file names runtime source spells are those two.
//   3. The sync modules (the pass, the predicate leaf) construct no database and spell no
//      database or ledger file at all: they reach both stores through the existing openers.
// Self-check (non-vacuous): planted sources trip each detector.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OPENERS = ["packages/effects/src/journal-open.mjs", "packages/mesh/src/projection-store.mjs"];
const DATABASE_NAMES = ["journal.sqlite", "projection.sqlite"];
const SYNC_MODULES = ["packages/mesh/src/publisher.mjs", "packages/work/src/local-change.mjs"];

function stripComments(source) {
  // Line comments first, then blocks (TECH_DEBT item 24): a line comment holding a block opener
  // must never blind the scan.
  return source.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1").replace(/\/\*[\s\S]*?\*\//g, "");
}

const constructsDatabase = (code) => /\bnew\s+[\w.]*DatabaseSync\s*\(/.test(code);
const databaseNames = (code) => [...code.matchAll(/["'`]([\w.-]+\.(?:sqlite|sqlite3|db))["'`]/g)].map((match) => match[1]);
const ledgerNames = (code) => [...code.matchAll(/["'`]([\w.-]*\.(?:sqlite|sqlite3|db|jsonl|ndjson))["'`]/g)].map((match) => match[1]);

async function runtimeSources() {
  const out = [];
  for (const file of await readRuntimeFiles(repoRoot)) {
    out.push({ rel: path.relative(repoRoot, file.path).split(path.sep).join("/"), code: stripComments(await readFile(file.path, "utf8")) });
  }
  return out;
}

export const archTests = [
  {
    name: "arch/164 FF-16403 (acd-sync-rides-the-effects-journal): a SQLite database is constructed only by the journal's and the projection store's openers",
    async run() {
      const constructors = (await runtimeSources()).filter(({ code }) => constructsDatabase(code)).map(({ rel }) => rel).sort();
      assert.deepEqual(constructors, [...OPENERS].sort());
    },
  },
  {
    name: "arch/164 FF-16403 (acd-sync-rides-the-effects-journal): the only database files runtime source names are journal.sqlite and projection.sqlite",
    async run() {
      const named = new Set((await runtimeSources()).flatMap(({ code }) => databaseNames(code)));
      assert.ok(named.has("journal.sqlite") && named.has("projection.sqlite"), "both stores are named (non-vacuous)");
      assert.deepEqual([...named].filter((name) => !DATABASE_NAMES.includes(name)), []);
    },
  },
  {
    name: "arch/164 FF-16403 (acd-sync-rides-the-effects-journal): the sync pass and the predicate open no database and name no ledger of their own",
    async run() {
      const sources = new Map((await runtimeSources()).map(({ rel, code }) => [rel, code]));
      for (const rel of SYNC_MODULES) {
        const code = sources.get(rel);
        assert.ok(code != null, `${rel} is scanned (non-vacuous)`);
        assert.equal(constructsDatabase(code), false, `${rel} constructs no database`);
        assert.deepEqual(ledgerNames(code), [], `${rel} names no database or ledger file`);
      }
      assert.match(sources.get("packages/mesh/src/publisher.mjs"), /\bopenEffectsJournal\b/, "the pass reaches the journal through its existing opener");
    },
  },
  {
    name: "arch/164 FF-16403 (acd-sync-rides-the-effects-journal): self-check — a planted database, a planted file name and a planted ledger all trip",
    run() {
      assert.ok(constructsDatabase("const db = new sqlite.DatabaseSync(path.join(root, 'sync.sqlite'));"));
      assert.deepEqual(databaseNames("path.join(root, \"sync-marks.sqlite\")"), ["sync-marks.sqlite"]);
      assert.deepEqual(ledgerNames("path.join(root, 'ledger.jsonl')"), ["ledger.jsonl"]);
    },
  },
];
