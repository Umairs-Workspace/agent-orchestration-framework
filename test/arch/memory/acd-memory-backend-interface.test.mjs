import { defaultApplication as _aofApplication } from "aof/default-application";
// Fitness function: acd-memory-backend-interface (ADR-003), amended as FF-17902 (179/ADR-003).
//
// Every registered backend module's default export provides EXACTLY
// { name, corpora, recall, reindex, status } (name a string, the rest async functions, and
// `corpora` the shared record declaration); the seam calls backends only through the
// knowledge-engine port and never reads a backend's index file directly; the `none` backend is a
// total no-op, and memory off is "served, empty" through the port, never `corpus-unserved`.
//
// No record backend declares the corpus `code` or the verb `relations`: records come from the
// parser leaves alone, so the port can never route an edge question to a record store.
//
// The check is exported so the red probe runs it over a planted backend with no declaration.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import os from "node:os";
const localBackend = _aofApplication.knowledge.memory.localBackend.default;

import noneBackend from "@aof/knowledge/memory/none-backend";
const runMemory = _aofApplication.knowledge.work.memory.runMemory;
const BACKEND_REGISTRY = _aofApplication.knowledge.work.memory.BACKEND_REGISTRY;
const { createKnowledgeEngine, RECORD_CORPORA } = _aofApplication.knowledge.engine;

const INTERFACE_KEYS = ["name", "corpora", "recall", "reindex", "status"];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The FF-17902 check over any backend: each failure names the backend and what it lacks.
export function backendInterfaceFailures(backend, label = backend?.name) {
  const failures = [];
  const keys = Object.keys(backend ?? {}).sort();
  for (const key of INTERFACE_KEYS) if (!keys.includes(key)) failures.push(`backend "${label}" lacks "${key}"`);
  for (const key of keys) if (!INTERFACE_KEYS.includes(key)) failures.push(`backend "${label}" exports the unexpected key "${key}"`);
  if (typeof backend?.name !== "string") failures.push(`backend "${label}": name is not a string`);
  for (const method of ["recall", "reindex", "status"]) {
    if (typeof backend?.[method] !== "function") failures.push(`backend "${label}": ${method} is not a function`);
  }
  if (backend?.corpora) {
    if (JSON.stringify(backend.corpora) !== JSON.stringify(RECORD_CORPORA)) failures.push(`backend "${label}": corpora is not the shared record declaration`);
    if (Object.hasOwn(backend.corpora, "code")) failures.push(`backend "${label}" declares the corpus "code"`);
    if (Object.values(backend.corpora).some((verbs) => verbs.includes("relations"))) failures.push(`backend "${label}" declares the verb "relations"`);
  }
  return failures;
}

function assertInterface(backend, label) {
  assert.deepEqual(backendInterfaceFailures(backend, label), [], `${label} default export must be exactly { name, corpora, recall, reindex, status } (05/ADR-003, 179/ADR-003)`);
}

// Every backend the registry holds, loaded through its own loader.
async function registryBackends() {
  return Promise.all(Object.entries(BACKEND_REGISTRY).map(async ([name, load]) => ({ name, backend: await load() })));
}

export const archTests = [
  {
    name: "arch/memory-backend-interface: the local backend exports exactly the frozen interface",
    run() {
      assertInterface(localBackend, "local backend");
      assert.equal(localBackend.name, "local");
    }
  },
  {
    name: "arch/memory-backend-interface: the none backend exports exactly the frozen interface",
    run() {
      assertInterface(noneBackend, "none backend");
      assert.equal(noneBackend.name, "none");
    }
  },
  {
    name: "arch/memory-backend-interface: the seam never reads the index file directly (only the backend does)",
    async run() {
      const seamSource = await readFile(new URL("../../../packages/core/src/application/bindings/work/memory.mjs", import.meta.url), "utf8");
      assert.ok(
        !seamSource.includes("aof.memory.index.json"),
        "the seam must not name the index file — the backend owns the store (ADR-003)"
      );
      assert.ok(
        !seamSource.includes("memoryIndexPath"),
        "the seam must not resolve the index path — it reaches the backend only through the interface"
      );
    }
  },
  {
    name: "arch/memory-backend-interface: the none backend is a total no-op across every verb",
    async run() {
      const recalled = await noneBackend.recall("anything", { area: "architecture" }, {}, {});
      assert.deepEqual(recalled.records, [], "none.recall returns an empty records array");
      assert.equal(typeof recalled.text, "string", "none.recall still returns a text projection");

      assert.deepEqual(await noneBackend.reindex(null, {}), { recordCount: 0 }, "none.reindex is a zero no-op");
      assert.deepEqual(await noneBackend.status({}), { backend: "none", recordCount: 0 }, "none.status reports zero");
    }
  },
  {
    name: "arch/memory-backend-interface: an unknown verb is gated before any backend method is invoked",
    async run() {
      const calls = [];
      const recordingBackend = {
        name: "stub",
        corpora: RECORD_CORPORA,
        async recall() { calls.push("recall"); return { query: "", scope: {}, records: [], text: "" }; },
        async reindex() { calls.push("reindex"); return { recordCount: 0 }; },
        async status() { calls.push("status"); return { backend: "stub", recordCount: 0 }; }
      };
      const outcome = await runMemory(["frobnicate"], {
        config: {},
        resolveBackend: () => recordingBackend,
        log: () => {}
      });
      assert.equal(outcome.ok, false, "an unknown verb fails");
      assert.notEqual(outcome.exitCode, 0, "an unknown verb exits non-zero");
      assert.deepEqual(calls, [], "no backend method is invoked for an unknown verb");
    }
  },
  {
    name: "arch/179/03 FF-17902: every backend the registry holds exports exactly the amended interface",
    async run() {
      const loaded = await registryBackends();
      assert.deepEqual(loaded.map((entry) => entry.name).sort(), ["graphify", "local", "none"], "the registry holds three backends");
      for (const { name, backend } of loaded) assertInterface(backend, name);
    },
  },
  {
    name: "arch/179/03 FF-17902: every registry backend declares the shared record corpora, and neither code nor relations",
    async run() {
      for (const { name, backend } of await registryBackends()) {
        assert.equal(backend.corpora, RECORD_CORPORA, `${name} spreads the one shared declaration`);
        assert.deepEqual(Object.keys(backend.corpora).sort(), ["imports", "operator", "work"]);
        for (const verbs of Object.values(backend.corpora)) assert.deepEqual([...verbs], ["ingest", "recall", "status"]);
        assert.ok(!Object.hasOwn(backend.corpora, "code"), `${name} declares no code corpus`);
        assert.ok(!Object.values(backend.corpora).flat().includes("relations"), `${name} declares no relations`);
      }
    },
  },
  {
    name: "arch/179/03: each registry backend composes into a port, and that port answers relations as corpus-unserved",
    async run() {
      for (const { name, backend } of await registryBackends()) {
        const port = createKnowledgeEngine({ backends: [backend] });
        const answer = await port.relations(["a.mjs"], {});
        assert.equal(answer.code, "corpus-unserved", `${name}'s port reports relations unserved`);
      }
    },
  },
  {
    name: "arch/179/03: memory off is served and empty, never unserved — `aof memory recall \"anything\" --json` answers []",
    async run() {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-179-03-off-"));
      try {
        await mkdir(path.join(root, ".aof"), { recursive: true });
        await mkdir(path.join(root, "wiki", "work"), { recursive: true });
        await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`);
        const result = spawnCliSync(process.execPath, [path.join(repoRoot, "packages", "core", "bin", "aof.mjs"), "memory", "recall", "anything", "--json"], {
          cwd: root, encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" },
        });
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout.trim(), "[]");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/179/03 FF-17902 red probe: a registry backend that drops its declaration fails, naming the backend and corpora",
    run() {
      const { corpora: _dropped, ...planted } = noneBackend;
      assert.ok(backendInterfaceFailures(planted, "none").includes('backend "none" lacks "corpora"'));
      assert.throws(() => createKnowledgeEngine({ backends: [planted] }), /backend "none" exports no "corpora" declaration/, "and the port refuses to compose it");
    },
  },
];
