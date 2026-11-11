// FF-17803 — milestone 178 / ADR-002: over a built index of the live stream, every record carries an
// `origin` array, and every path in it is project-root-relative, forward-slashed and names an
// existing file inside the project root; `INDEX_VERSION === GRAPHIFY_INDEX_VERSION === 4`.
//
// WHY IN PLACE, NOT OVER A COPY. `buildIndex` is pure of disk side-effects (it is what
// `reindex` writes, built without writing), so it reads the live `wiki/` exactly as an ingest
// would and leaves it untouched. Copying 52 MB per run would buy nothing the build does not.
//
// THE COUNT IS INDEPENDENT. `status`'s `origin.unresolved` is checked against a second count made
// here from the record docs' raw text with a regex, never through the indexer's resolver, so a
// resolver that miscounts cannot agree with itself. Measured 2026-10-29: 6, all naming
// `RESEARCH-agent-loop-economics.md`, which moved to `wiki/planning/research/`.
//
// The check is exported so the red probe runs it over a planted record: a resolver that keeps an
// unresolved value is exactly a record citing a path that is not there.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultApplication } from "aof/default-application";
import { spawnCliSync } from "../../support/cli-spawn.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const workDir = path.join(root, "wiki", "work");
const RECORD_DOCS = new Set(["SPEC.md", "STORY.md", "SPIKE.md", "CHORE.md", "SESSION.md", "PROTOTYPE.md"]);

// The FF-17803 check over any record list: each failure names the record and the path.
export function originFailures(records, projectRoot) {
  const failures = [];
  for (const record of records) {
    const label = `${record.item}/${record.id}`;
    if (!Array.isArray(record.origin)) {
      failures.push(`${label}: origin is not an array`);
      continue;
    }
    for (const entry of record.origin) {
      if (typeof entry !== "string" || path.isAbsolute(entry) || entry.includes("\\") || entry.split("/").includes("..")) {
        failures.push(`${label}: ${JSON.stringify(entry)} is not a project-root-relative forward-slashed path`);
      } else if (!existsSync(path.join(projectRoot, entry)) || !statSync(path.join(projectRoot, entry)).isFile()) {
        failures.push(`${label}: ${entry} names no existing file`);
      }
    }
  }
  return failures;
}

// The independent count: every record doc's `origin:` values, read with a regex, that name no file
// from the doc's folder, the root, or (for an archived doc) the folder it stood in before archiving.
function independentUnresolved() {
  let unresolved = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!RECORD_DOCS.has(name)) continue;
      const front = readFileSync(full, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const line = front?.[1].match(/^origin:[ \t]*(.+)$/m);
      if (!line) continue;
      const raw = line[1].trim();
      const values = (raw.startsWith("[") ? raw.slice(1, -1).split(",") : [raw]).map((value) => value.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      const docDir = path.dirname(full);
      const archived = path.relative(path.join(workDir, "archive"), docDir);
      for (const value of values) {
        const tries = path.isAbsolute(value) ? [] : [path.join(root, value), path.join(docDir, value)];
        if (!path.isAbsolute(value) && !archived.startsWith("..") && archived !== "") tries.push(path.join(workDir, archived, value));
        const hit = tries.some((candidate) => !path.relative(root, candidate).startsWith("..") && existsSync(candidate) && statSync(candidate).isFile());
        if (!hit) unresolved += 1;
      }
    }
  };
  walk(workDir);
  return unresolved;
}

let built = null;
async function liveIndex() {
  built ??= defaultApplication.knowledge.memory.localIndexing.buildIndex(null, { workDir, projectRoot: root, configMemory: {} });
  return built;
}

export const archTests = [
  {
    name: "arch/178/03 FF-17803 (acd-record-origin-resolves) E9: over the live stream every record carries an origin array, every path in it is project-root-relative, forward-slashed and names an existing file, and the versions are 4 in lockstep",
    run: async () => {
      const { INDEX_VERSION } = defaultApplication.knowledge.memory.localIndexing;
      const { GRAPHIFY_INDEX_VERSION } = defaultApplication.knowledge.memory.graphifyBackend;
      assert.equal(INDEX_VERSION, 4);
      assert.equal(GRAPHIFY_INDEX_VERSION, 4);
      const index = await liveIndex();
      assert.deepEqual(originFailures(index.records, root), [], "every origin path resolves");
      const carried = index.records.filter((record) => record.origin.length > 0);
      assert.ok(carried.length > 100, `non-vacuous: ${carried.length} records carry an origin`);
    },
  },
  {
    name: "arch/178/03 E9: the index's origin.unresolved equals an independent count of the declared values that name no file",
    run: async () => {
      const index = await liveIndex();
      assert.equal(index.origin.unresolved, independentUnresolved(), "the resolver and an independent count agree");
    },
  },
  {
    name: "arch/178/03 FF-17803 red probe: a resolver that keeps an unresolved value fails, naming the record and the path",
    run: async () => {
      const [first] = (await liveIndex()).records;
      const planted = [{ ...first, origin: ["wiki/planning/RESEARCH-agent-loop-economics.md"] }];
      assert.deepEqual(originFailures(planted, root), [`${first.item}/${first.id}: wiki/planning/RESEARCH-agent-loop-economics.md names no existing file`]);
      assert.equal(originFailures([{ ...first, origin: ["../outside.md"] }], root).length, 1, "…and a path that climbs out of the root fails too");
    },
  },
  {
    name: "arch/178/03: no scope filters on origin — `aof memory recall x --origin <path>` is refused as an undeclared flag",
    run: () => {
      const result = spawnCliSync(process.execPath, [path.join(root, "packages", "core", "bin", "aof.mjs"), "memory", "recall", "x", "--origin", "wiki/planning/PRD-memory-engine.md"], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
      });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /^Unknown flag "--origin" for memory\./, result.stderr);
    },
  },
];
