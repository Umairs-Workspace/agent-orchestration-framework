// FF-15901, FF-15902, FF-15903 — milestone 159 / story 01, ADR-001 + ADR-003.
//
//   FF-15901  A disabled source makes no external read; an enabled one yields deterministic, derived,
//             read-only records.
//   FF-15902  Only an ENABLED adapter record resolves, and only directly inside the selected memory
//             root; the existing containment for ordinary records is unchanged.
//   FF-15903  External content reaches neither graph extraction nor any mesh transport, and the
//             derived indexes stay git-ignored.
//
// EACH CONTROL IS PROVEN TO BITE. A detector that has only ever seen the correct source proves nothing,
// so the three required red probes are run for real: a PLANT is made by mutating the shipped module's
// text (the mutation must land exactly once), loading the mutated copy — its imports rewritten to the
// repository's own resolved modules — and running the SAME probe over it. The probe returns the
// violations it finds; the real module must return none and every plant must return some.
//   probe 1: introduce a read while disabled        → FF-15901
//   probe 2: accept a forged / escaping locator     → FF-15902
//   probe 3: stage an external canary for extraction → FF-15903
// All data is synthetic, under a temp CLAUDE_CONFIG_DIR; no fixture reaches a real home.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { readdir as realReaddir, readFile as realReadFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createLocalIndexing as realCreateLocalIndexing } from "@aof/knowledge/memory/local-indexing";
import { createGraphifyBackend as realCreateGraphifyBackend } from "@aof/knowledge/memory/graphify-backend";
import { AUTO_MEMORY_ITEM, createClaudeAutoMemory } from "@aof/knowledge/memory/claude-auto-memory";
import { AOF_GITIGNORE_ENTRIES } from "../../../packages/core/src/aof-gitignore.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const memoryDirOf = (packageSrc) => path.join(repoRoot, "packages", "knowledge", "src", "memory", packageSrc);
const CANARY = "CANARY-159-do-not-send";
const ENABLED = { backend: "local", sources: ["claude-auto-memory"] };

// ------------------------------------------------------------------ plants ----

// Load a module from the shipped source with a mutation applied. Every relative or bare import is
// rewritten to the URL it resolves to from the REAL file, so the mutated copy runs the real dependencies.
async function loadPlant(file, mutations) {
  let source = (await readFile(file, "utf8")).replace(/\r\n/g, "\n");
  for (const [from, to] of mutations) {
    assert.equal(source.split(from).length - 1, 1, `the plant lands exactly once: ${from.slice(0, 60)}`);
    source = source.replace(from, () => to);
  }
  const here = pathToFileURL(file).href;
  source = source.replace(/(from\s+)"([^"]+)"/g, (whole, head, spec) => {
    if (spec.startsWith("node:")) return whole;
    const target = spec.startsWith(".") ? new URL(spec, here).href : import.meta.resolve(spec);
    return `${head}"${target}"`;
  });
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-159-plant-"));
  const out = path.join(dir, path.basename(file));
  await writeFile(out, source);
  try {
    return await import(pathToFileURL(out).href);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// --------------------------------------------------------------- the fixture ----

const entry = (name, type = "feedback", body = `Why: ${CANARY}\nHow to apply: unlink first\n`) => `---\nname: ${name}\ndescription: "A reason"\nmetadata:\n  type: ${type}\n  originSessionId: s-1\n---\n${body}`;

async function withProject(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff159-"));
  try {
    const projectRoot = path.join(root, "project");
    const workDir = path.join(projectRoot, "wiki", "work");
    const dir = path.join(workDir, "45_milestone_junction");
    await mkdir(dir, { recursive: true });
    await mkdir(path.join(projectRoot, ".aof"), { recursive: true });
    await writeFile(path.join(dir, "SPEC.md"), "---\ntype: milestone\nnumber: 45\nslug: junction\ntitle: J\nstatus: done\n---\n");
    await writeFile(path.join(dir, "RETROSPECTIVE.md"), "## R13 · Junction\n- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer\n- **Lesson:** unlink the junction first.\n");
    const claudeHome = path.join(root, "claude");
    const memoryDir = path.join(claudeHome, "projects", projectRoot.replace(/[^A-Za-z0-9]/g, "-"), "memory");
    await mkdir(memoryDir, { recursive: true });
    await writeFile(path.join(memoryDir, "a.md"), entry("A"));
    await writeFile(path.join(memoryDir, "b.md"), entry("B", "project"));
    const env = { CLAUDE_CONFIG_DIR: claudeHome };
    const ctx = (...given) => ({ workDir, projectRoot, configMemory: given.length ? given[0] : ENABLED, env });
    await run({ root, projectRoot, workDir, memoryDir, env, ctx });
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await rm(root, { recursive: true, force: true });
  }
}

function leaf(p, reads = []) {
  return createClaudeAutoMemory({
    memoryDirFor: ({ env }) => path.join(env.CLAUDE_CONFIG_DIR, "projects", p.projectRoot.replace(/[^A-Za-z0-9]/g, "-"), "memory"),
    reportDegrade: () => {},
    fs: { readdir: async (...a) => (reads.push(a[0]), realReaddir(...a)), readFile: async (...a) => (reads.push(a[0]), realReadFile(...a)) },
  });
}

function indexer(create, p, autoMemory) {
  return create({
    listItemsCacheFirst: async () => [{ type: "milestone", parent: null, ref: "45", number: "45", slug: "junction", dir: path.join(p.workDir, "45_milestone_junction") }],
    localItemsOnly: (rows) => ({ items: rows, skipped: [] }),
    reportReachThroughSkips: () => {},
    ensureAofGitignore: async () => {},
    importStoreRoot: (projectRoot) => path.join(projectRoot, ".aof", "imports"),
    ARCHITECTURE_FILE: "ARCHITECTURE.md",
    RETROSPECTIVE_FILE: "RETROSPECTIVE.md",
    AOF_FILE: "AOF.md",
    autoMemory,
  });
}

// ------------------------------------------------------------------- probes ----

// FF-15901 — the violations of "a disabled source makes no external read".
async function probeDisabledReads(create) {
  const violations = [];
  await withProject(async (p) => {
    const reads = [];
    const { buildRecords } = indexer(create, p, leaf(p, reads));
    for (const memory of [undefined, {}, { backend: "local" }, { backend: "local", sources: [] }]) {
      const records = await buildRecords(null, p.ctx(memory));
      if (records.some((r) => r.item === AUTO_MEMORY_ITEM)) violations.push(`an operator record appeared for ${JSON.stringify(memory)}`);
    }
    if (reads.length > 0) violations.push(`${reads.length} read(s) while disabled: ${reads[0]}`);
  });
  return violations;
}

// FF-15902 — the violations of "only an enabled adapter record resolves, inside the selected root".
async function probeResolver(create) {
  const violations = [];
  await withProject(async (p) => {
    const indexing = indexer(create, p, leaf(p));
    const [record] = (await indexing.buildRecords(null, p.ctx())).filter((r) => r.item === AUTO_MEMORY_ITEM);
    const outside = path.join(p.root, "outside.md");
    await writeFile(outside, entry("Outside"));
    const accepts = (rec, ctx) => {
      try {
        indexing.resolveRecordSourcePath(rec, ctx);
        return true;
      } catch (error) {
        if (error.code !== "memory-source-outside-root") throw error;
        return false;
      }
    };
    if (!accepts(record, p.ctx())) violations.push("a genuine enabled adapter record no longer resolves");
    const forged = [`${outside}:1`, `${path.join(p.memoryDir, "..", "outside.md")}:1`, `${p.memoryDir}-evil${path.sep}a.md:1`, `${path.join(p.memoryDir, "a.md")}:1#/x`, `${path.join(p.memoryDir, "a.md")}:2`];
    for (const source of forged) if (accepts({ ...record, source }, p.ctx())) violations.push(`a forged locator resolved: ${source}`);
    if (accepts(record, p.ctx({ backend: "local", sources: [] }))) violations.push("a disabled source's record resolved");
    if (accepts({ item: "45", source: `${path.join(p.memoryDir, "a.md")}:1` }, p.ctx())) violations.push("an ordinary record resolved an absolute path");
    if (accepts({ item: "45", source: "../../outside.md:1" }, p.ctx())) violations.push("an ordinary traversal resolved");
    if (!accepts({ item: "45", source: "45_milestone_junction/RETROSPECTIVE.md:1" }, p.ctx())) violations.push("an ordinary work record no longer resolves");
  });
  return violations;
}

// FF-15903 — the violations of "external content reaches neither graph extraction nor staging".
async function probeExtraction(createBackend) {
  const violations = [];
  await withProject(async (p) => {
    const invocations = [];
    const localIndexing = indexer(realCreateLocalIndexing, p, leaf(p));
    const backend = createBackend({
      coreInvoke: async (name, args) => {
        invocations.push({ name, args });
        return { graphPath: path.join(p.root, "graph.json"), egress: "docs-media" };
      },
      loadWorkspace: async () => ({ config: {}, configPath: path.join(p.projectRoot, ".aof", "aof.config.json") }),
      buildRecords: localIndexing.buildRecords,
      ensureAofGitignore: async () => {},
      ensureGraphifyOutGitignore: async () => {},
    }).default;
    const result = await backend.reindex(null, { ...p.ctx({ backend: "graphify", sources: ["claude-auto-memory"] }), invoke: undefined });
    if (!result.records.some((r) => r.item === AUTO_MEMORY_ITEM)) violations.push("non-vacuity: the operator records were built");
    if (invocations.length === 0) violations.push("non-vacuity: the graph build was invoked");
    for (const { args } of invocations) {
      if (args.path !== p.workDir) violations.push(`extraction path is not the work stream: ${args.path}`);
      const sent = JSON.stringify(args);
      if (sent.includes(CANARY) || sent.includes(p.memoryDir.replace(/\\/g, "\\\\")) || sent.includes("claude-auto-memory")) violations.push(`the external source reached extraction: ${sent.slice(0, 120)}`);
    }
  });
  return violations;
}

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function walk(dir, out = []) {
  for (const entryDirent of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entryDirent.name);
    if (entryDirent.isDirectory()) await walk(full, out);
    else if (/\.mjs$/.test(entryDirent.name)) out.push(full);
  }
  return out;
}

const localIndexingFile = memoryDirOf("local-indexing.mjs");
const graphifyBackendFile = memoryDirOf("graphify-backend.mjs");

export const archTests = [
  {
    name: "arch/FF-15901 (159/ADR-001): a disabled source makes no external read — shipped code clean, a planted read caught",
    run: async () => {
      assert.deepEqual(await probeDisabledReads(realCreateLocalIndexing), []);
      const plant = await loadPlant(localIndexingFile, [["if (autoMemory && autoMemoryEnabled(ctx.configMemory)) {", "if (autoMemory) {"]]);
      const caught = await probeDisabledReads(plant.createLocalIndexing);
      assert.ok(caught.length > 0 && caught.some((line) => /read\(s\) while disabled|operator record appeared/.test(line)), `the probe caught the planted read: ${caught}`);
    },
  },
  {
    name: "arch/FF-15901 (159/ADR-001): enabled records are deterministic, derived and read-only — rebuild changes no source, a disabled rebuild leaves no trace",
    run: () => withProject(async (p) => {
      const { buildRecords } = indexer(realCreateLocalIndexing, p, leaf(p));
      const sources = async () => Object.fromEntries(await Promise.all((await readdir(p.memoryDir)).map(async (name) => [name, hash(await readFile(path.join(p.memoryDir, name)))])));
      const before = await sources();
      const first = await buildRecords(null, p.ctx());
      const second = await buildRecords(null, p.ctx());
      assert.deepEqual(first, second, "two builds over unchanged sources are identical");
      const operators = first.filter((r) => r.item === AUTO_MEMORY_ITEM);
      assert.deepEqual(operators.map((r) => r.id), ["a.md", "b.md"], "non-vacuity, in filename order");
      assert.deepEqual(first.slice(0, first.length - operators.length), await buildRecords(null, p.ctx({ backend: "local" })), "the baseline is the source-less index");
      assert.deepEqual(await sources(), before, "the sources are byte-identical after rebuilding");
      assert.deepEqual((await readdir(p.projectRoot)).sort(), [".aof", "wiki"], "nothing was written into the project");
      assert.deepEqual(await readdir(path.join(p.projectRoot, ".aof")), [], "no index, copy or staging was created by a build");
    }),
  },
  {
    name: "arch/FF-15901 (159/ADR-001): the adapter composes at the one record builder — no second index, no backend-specific copy",
    run: async () => {
      const indexing = (await readFile(localIndexingFile, "utf8")).replace(/\r\n/g, "\n");
      const graphify = await readFile(graphifyBackendFile, "utf8");
      assert.equal(indexing.split("autoMemory.autoMemoryRecords(").length - 1, 1, "one call site in the common builder");
      assert.match(indexing, /if \(autoMemory && autoMemoryEnabled\(ctx\.configMemory\)\) \{\n\s+records\.push\(\.\.\.\(await autoMemory\.autoMemoryRecords/, "the call sits behind the enabled check");
      assert.equal(/claude-auto-memory|autoMemory/i.test(graphify), false, "the graphify backend inherits the source and names nothing of it");
      assert.equal(/writeFile|writeText|mkdir|rename|unlink|rm\(/.test(await readFile(memoryDirOf("claude-auto-memory.mjs"), "utf8")), false, "the adapter has no write verb");
    },
  },
  {
    name: "arch/FF-15902 (159/ADR-003): only an enabled adapter record resolves inside the selected root — shipped code clean, a trusting resolver caught",
    run: async () => {
      assert.deepEqual(await probeResolver(realCreateLocalIndexing), []);
      const trustsLocator = await loadPlant(localIndexingFile, [["const root = autoMemory.memoryRootFor({ projectRoot, env });", "const root = path.dirname(path.resolve(absolute));"]]);
      const caught = await probeResolver(trustsLocator.createLocalIndexing);
      assert.ok(caught.some((line) => /forged locator resolved/.test(line)), `the probe caught a forged locator: ${caught}`);
      const noEnabledCheck = await loadPlant(localIndexingFile, [["if (!autoMemory || !projectRoot || !autoMemoryEnabled(configMemory)) return null;", "if (!autoMemory || !projectRoot) return null;"]]);
      assert.ok((await probeResolver(noEnabledCheck.createLocalIndexing)).some((line) => /disabled source/.test(line)), "the probe caught a disabled source resolving");
    },
  },
  {
    name: "arch/FF-15902 (159/ADR-003): the adapter reads regular entries directly inside the root only — no recursion, no link following, no write",
    run: async () => {
      const source = await readFile(memoryDirOf("claude-auto-memory.mjs"), "utf8");
      assert.match(source, /entry\.isFile\(\) && \/\\\.md\$\/i\.test\(entry\.name\)/, "regular .md files only (a dirent link or directory is not a file)");
      assert.equal(/recursive:\s*true|collectAofDigests|readdir\([^)]*recursive/.test(source), false, "no recursive walk");
      assert.equal(/https?:\/\/|\bfetch\(|child_process|node:(?:http|https|net|dgram)/.test(source), false, "no remote call or process");
    },
  },
  {
    name: "arch/FF-15903 (159/ADR-003): external content never reaches graph extraction — shipped code clean, a staged canary caught",
    run: async () => {
      assert.deepEqual(await probeExtraction(realCreateGraphifyBackend), []);
      const staged = await loadPlant(graphifyBackendFile, [["const graph = await attemptGraphBuild(ctx, extraction);", `const graph = await attemptGraphBuild({ ...ctx, workDir: path.dirname(store.records.find((r) => r.item === "${AUTO_MEMORY_ITEM}").source.replace(/:1$/, "")) }, extraction);`]]);
      const caught = await probeExtraction(staged.createGraphifyBackend);
      assert.ok(caught.some((line) => /extraction path is not the work stream|reached extraction/.test(line)), `the probe caught a staged source: ${caught}`);
    },
  },
  {
    name: "arch/FF-15903 (159/ADR-003): no mesh transport names the external source, and the derived indexes stay git-ignored",
    run: async () => {
      const scanned = [...await walk(path.join(repoRoot, "packages", "mesh", "src")), ...await walk(path.join(repoRoot, "packages", "messaging", "src"))];
      assert.ok(scanned.length > 10, `non-vacuity: ${scanned.length} transport modules scanned`);
      const NAMES = /claude-auto-memory|autoMemory|AUTO_MEMORY|operator:claude/;
      const offenders = [];
      for (const file of scanned) if (NAMES.test(await readFile(file, "utf8"))) offenders.push(path.relative(repoRoot, file));
      assert.deepEqual(offenders, []);
      // The detector bites: a transport module that mentioned the source would be reported.
      assert.ok(NAMES.test(`${await readFile(scanned[0], "utf8")}\nconst leak = AUTO_MEMORY_ITEM;`), "the detector trips on a planted reference");
      for (const store of ["aof.memory.index.json", "aof.memory.graphify.index.json"]) assert.ok(AOF_GITIGNORE_ENTRIES.includes(store), `${store} stays ignored`);
    },
  },
];
