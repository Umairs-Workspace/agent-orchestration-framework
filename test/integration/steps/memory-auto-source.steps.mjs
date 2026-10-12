// Steps for memory-auto-source.feature (159/01). Entries are written into a synthetic Claude home
// (CLAUDE_CONFIG_DIR) exactly where the real adapter looks — `<home>/projects/<slug of the project root>/memory/`
// — and the work stream the CLI indexes is a temp project under an isolated AOF_GLOBAL_HOME. The REAL CLI
// ingests and recalls; records are read back from the store the backend wrote. The runner resolves this
// module by convention from the feature's basename.
//
// A GRAPHIFY INGEST NEVER BUILDS A GRAPH HERE: every CLI run gets a PATH holding only node's own directory,
// and a graphify ingest asserts the graph was skipped as absent. The scenarios that need an INJECTED read
// failure (a CLI child cannot be made to fail a read portably) run the knowledge indexer in process with a
// failing reader and a diagnostic spy, over the same synthetic folder.
import assert from "node:assert/strict";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import { defaultApplication } from "aof/default-application";
import { createLocalIndexing } from "@aof/knowledge/memory/local-indexing";
import { AUTO_MEMORY_ITEM, createClaudeAutoMemory } from "@aof/knowledge/memory/claude-auto-memory";
import { createStepRegistry } from "../support/step-registry.mjs";
import { cliPath, splitCommand } from "../support/cli-context.mjs";
import { spawnCliSync } from "../../support/cli-spawn.mjs";

const registry = createStepRegistry();
const STORE = { local: path.join(".aof", "aof.memory.index.json"), graphify: path.join(".aof", "aof.memory.graphify.index.json") };
const expectedVersion = defaultApplication.knowledge.memory.localIndexing.INDEX_VERSION;

// ------------------------------------------------------------------- project ----

async function project(context) {
  if (context.ready) return context;
  context.ready = true;
  await mkdir(path.join(context.projectDir, ".aof"), { recursive: true });
  await mkdir(path.join(context.projectDir, "wiki", "work"), { recursive: true });
  context.projectRoot = realpathSync.native(context.projectDir);
  context.claudeHome = path.join(context.root, "claude");
  context.memory = { backend: "local" };
  context.baselineMade = false;
  context.denied = new Set();
  await mkdir(memoryDir(context), { recursive: true });
  return context;
}

const slugOf = (root) => root.replace(/[^A-Za-z0-9]/g, "-");
const memoryDir = (context, root = context.projectRoot) => path.join(context.claudeHome, "projects", slugOf(root), "memory");
const workDir = (context) => path.join(context.projectDir, "wiki", "work");

async function put(file, text) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text, "utf8");
}

const frontmatter = (fields) => `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n`;

// The work stream the baseline scenarios share: a lesson on 45, a lesson on 68, an ADR on 72 and a
// co-located imported digest — every one of them mentioning "junction", so a recall sees all sources.
async function baseline(context) {
  await project(context);
  if (context.baselineMade) return;
  context.baselineMade = true;
  const milestone = async (number, slug) => {
    const dir = path.join(workDir(context), `${number}_milestone_${slug}`);
    await put(path.join(dir, "SPEC.md"), `${frontmatter({ type: "milestone", number: `"${number}"`, slug, status: "done", title: `"M${number}"`, created: "2026-06-19", updated: "2026-06-19" })}# M${number}\n`);
    return dir;
  };
  const lesson = (id) => `## ${id} · Junction cleanup\n- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer\n- **What happened:** a junction was cleaned recursively.\n- **Why:** the link crossed into the source.\n- **Lesson:** unlink the junction before removing a worktree.\n`;
  await put(path.join(await milestone("45", "junction"), "RETROSPECTIVE.md"), lesson("R13"));
  await put(path.join(await milestone("68", "links"), "RETROSPECTIVE.md"), lesson("R10"));
  await put(path.join(await milestone("72", "tree"), "ARCHITECTURE.md"), "## ADR-007: Junction handling\n\n**Status:** Accepted\n\n**Decision.** Never follow a junction when cleaning a worktree.\n");
  await put(path.join(workDir(context), "foreign", "AOF.md"), "---\nimported: true\n---\n# Foreign\n\n## Intent\n\nAn imported digest about a junction.\n");
}

// ------------------------------------------------------------------- entries ----

const bodyOf = (text) => String(text ?? "").replace(/ \/\/ /g, "\n\n");

function entryText({ type, name, description, body = "", extra = "", nl = "\n", bom = false, rawDescription, topType }) {
  const lines = [
    "---",
    ...(name == null ? [] : [`name: ${JSON.stringify(name)}`]),
    ...(rawDescription !== undefined ? [`description: ${rawDescription}`] : description == null ? [] : [`description: ${JSON.stringify(description)}`]),
    ...(topType ? [`type: ${topType}`] : []),
    ...(extra ? [extra] : []),
    "metadata:",
    "  node_type: memory",
    ...(type == null ? [] : [`  type: ${type}`]),
    "  originSessionId: SESSION-NOT-SEARCHABLE",
    "---",
    body,
  ];
  return `${bom ? "﻿" : ""}${lines.join("\n").replace(/\n/g, nl)}`;
}

async function writeEntry(context, file, options) {
  await project(context);
  await put(path.join(memoryDir(context), file), entryText(options));
  context.lastFile = file;
}

async function writeEligible(context, count) {
  await project(context);
  for (let i = 1; i <= count; i += 1) {
    await put(path.join(memoryDir(context), `entry-${String(i).padStart(2, "0")}.md`), entryText({ type: i % 2 ? "feedback" : "project", name: `Entry ${i}`, description: `Reason ${i}`, body: `Why: reason ${i}\nHow to apply: apply ${i}\n` }));
  }
}

// ------------------------------------------------------------------- the CLI ----

function writeConfig(context) {
  return writeFile(path.join(context.projectDir, ".aof", "aof.config.json"), `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, memory: context.memory }, null, 2)}\n`, "utf8");
}

async function cli(context, command, { cwd } = {}) {
  await project(context);
  await writeConfig(context);
  const result = spawnCliSync(process.execPath, ["--no-warnings", cliPath, ...splitCommand(command)], {
    cwd: cwd ?? context.projectDir,
    env: {
      ...process.env,
      PATH: path.dirname(process.execPath),
      AOF_DATA_DIR: context.dataDir,
      AOF_GLOBAL_HOME: context.globalDir,
      CLAUDE_CONFIG_DIR: context.claudeHome,
      NODE_NO_WARNINGS: "1",
    },
    encoding: "utf8",
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

async function readStore(context) {
  const backend = context.memory.backend === "graphify" ? "graphify" : "local";
  try {
    return JSON.parse(await readFile(path.join(context.projectDir, STORE[backend]), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function ingest(context, command = "work memory ingest --all --json", options = {}) {
  const result = await cli(context, command, options);
  assert.equal(result.status, 0, `${command} exits 0 (stderr: ${result.stderr})`);
  context.summary = result.stdout.trim().startsWith("{") ? JSON.parse(result.stdout) : null;
  if (context.memory.backend === "graphify") assert.equal(context.summary?.graph?.binaryAbsent, true, "the graph build was skipped, never run");
  context.store = await readStore(context);
  context.records = context.store?.records ?? [];
  return context.records;
}

// A fresh ingest under a different memory block, restoring the scenario's own afterwards.
async function ingestWith(context, memory) {
  const previous = context.memory;
  context.memory = memory;
  try {
    return await ingest(context);
  } finally {
    context.memory = previous;
  }
}

const operators = (records) => records.filter((record) => record.item === AUTO_MEMORY_ITEM);
const workRecords = (records) => records.filter((record) => record.item !== AUTO_MEMORY_ITEM);

async function recall(context, query, { kind, owner, item, limit } = {}) {
  const flags = [kind && `--kind ${kind}`, owner && `--owner ${owner}`, item && `--item ${item}`, limit && `--limit ${limit}`].filter(Boolean).join(" ");
  const result = await cli(context, `work memory recall "${query}" ${flags} --json`);
  assert.equal(result.status, 0, `recall exits 0 (stderr: ${result.stderr})`);
  return JSON.parse(result.stdout);
}

function parseSources(raw) {
  return raw.trim() === "absent" ? undefined : JSON.parse(raw);
}

function setMemory(context, backend, sources) {
  context.memory = { backend, ...(sources === undefined ? {} : { sources }) };
}

// -------------------------------------------------------------------- in process ----

// The knowledge indexer over the synthetic folder with an INJECTED reader and a diagnostic spy.
async function ingestInProcess(context) {
  await project(context);
  const degrades = [];
  const denied = context.denied;
  const real = { readdir, readFile };
  const fs = {
    readdir: async (...args) => {
      if (context.dirDenied) throw Object.assign(new Error("EACCES: permission denied, scandir"), { code: "EACCES" });
      return real.readdir(...args);
    },
    readFile: async (file, ...rest) => {
      if (denied.has(path.basename(String(file)))) throw Object.assign(new Error("EACCES: permission denied, open"), { code: "EACCES" });
      return real.readFile(file, ...rest);
    },
  };
  const autoMemory = createClaudeAutoMemory({
    memoryDirFor: ({ env }) => path.join(env.CLAUDE_CONFIG_DIR, "projects", slugOf(context.projectRoot), "memory"),
    reportDegrade: (code, error, extra) => degrades.push({ code, message: error.message, ...extra }),
    fs,
  });
  const items = [];
  for (const name of await readdir(workDir(context))) {
    const found = name.match(/^(\d+)_milestone_(.+)$/);
    if (found) items.push({ type: "milestone", parent: null, ref: found[1], number: found[1], slug: found[2], dir: path.join(workDir(context), name) });
  }
  const { buildRecords } = createLocalIndexing({
    listItemsCacheFirst: async () => items,
    localItemsOnly: (rows) => ({ items: rows, skipped: [] }),
    reportReachThroughSkips: () => {},
    ensureAofGitignore: async () => {},
    importStoreRoot: (projectRoot) => path.join(projectRoot, ".aof", "imports"),
    ARCHITECTURE_FILE: "ARCHITECTURE.md",
    RETROSPECTIVE_FILE: "RETROSPECTIVE.md",
    AOF_FILE: "AOF.md",
    autoMemory,
  });
  context.records = await buildRecords(null, { workDir: workDir(context), projectRoot: context.projectRoot, configMemory: context.memory, env: { CLAUDE_CONFIG_DIR: context.claudeHome } });
  context.degrades = degrades;
}

// ================================================================== GIVEN ====

registry.define("a workspace with existing lesson, ADR and imported records", async (context) => {
  await baseline(context);
});

registry.define("an isolated corpus with the junction auto-memory lesson and matching work records", async (context) => {
  await baseline(context);
  await writeEntry(context, "worktree-node-modules-junction-destroys-source.md", { type: "feedback", name: "Junction cleanup destroys source", description: "Never junction node_modules into a worktree", body: "Why: removing the worktree follows the junction.\n\nHow to apply: unlink the junction first.\n" });
});

registry.define(/^the work records have identities "([^"]+)", "([^"]+)" and "([^"]+)"$/, async (context, ...identities) => {
  context.identities = identities;
});

registry.define(/^its selected Claude project memory contains (\d+) eligible entries$/, async (context, count) => {
  context.compareToMovedAway = true;
  await writeEligible(context, Number(count));
});

registry.define(/^the selected Claude project has (\d+|two) eligible entries$/, async (context, count) => {
  await writeEligible(context, count === "two" ? 2 : Number(count));
});

registry.define(/^a workspace with backend "(\w+)" and memory\.sources (.+)$/, async (context, backend, sources) => {
  await project(context);
  setMemory(context, backend, parseSources(sources));
});

registry.define(/^memory\.sources is (.+?)(?: and the backend is "(\w+)")?$/, async (context, sources, backend) => {
  await project(context);
  context.rawSources = sources;
  setMemory(context, backend ?? context.memory.backend, parseSources(sources));
});

registry.define(/^the selected Claude project has "([^"]+)" of type "([^"]+)" and "([^"]+)" of type "([^"]+)"$/, async (context, fileA, typeA, fileB, typeB) => {
  await writeEntry(context, fileA, { type: typeA, name: fileA, description: `About ${fileA}`, body: `Why: ${fileA}\n` });
  await writeEntry(context, fileB, { type: typeB, name: fileB, description: `About ${fileB}`, body: `Why: ${fileB}\n` });
});

registry.define("the selected project's auto-memory directory does not exist on this node", async (context) => {
  await project(context);
  await rm(memoryDir(context), { recursive: true, force: true });
});

registry.define("the workspace root is project A and the command runs from a subdirectory of A", async (context) => {
  await project(context);
  context.subdir = path.join(context.projectDir, "wiki", "work");
});

registry.define("CLAUDE_CONFIG_DIR points to a synthetic Claude home", async (context) => {
  await project(context);
  assert.ok(context.claudeHome.startsWith(context.root));
});

registry.define("that home has one eligible entry for A and a different eligible entry for project B", async (context) => {
  await writeEntry(context, "a-entry.md", { type: "feedback", name: "A entry", description: "Belongs to A", body: "Why: A\n" });
  await put(path.join(memoryDir(context, path.join(context.root, "project-b")), "b-entry.md"), entryText({ type: "feedback", name: "B entry", description: "Belongs to B", body: "Why: B\n" }));
});

registry.define(/^the memory entry "([^"]+)" is a "([^"]+)" entry named "([^"]*)" described "([^"]*)" with body "([^"]*)"$/, async (context, file, type, name, description, body) => {
  await writeEntry(context, file, { type, name, description, body: `${bodyOf(body)}\n` });
});

registry.define(/^the memory entry "([^"]+)" is a "([^"]+)" entry whose prose calls the event "([^"]+)" and whose unknown metadata declares kind "([^"]+)", owner "([^"]+)" and stage "([^"]+)"$/, async (context, file, type, word, kind, owner, stage) => {
  await writeEntry(context, file, { type, name: file, description: `The event was a ${word}`, body: `This was a ${word}.\n`, extra: `kind: ${kind}\nowner: ${owner}\nstage: ${stage}` });
});

registry.define(/^the memory index "([^"]+)" has no frontmatter$/, async (context, file) => {
  await project(context);
  await put(path.join(memoryDir(context), file), "# Memory index\n\n- [Junction](junction.md) — a pointer\n");
});

registry.define(/^the memory entry "([^"]+)" has a top-level type feedback and no metadata\.type$/, async (context, file) => {
  await writeEntry(context, file, { type: null, topType: "feedback", name: "T", description: "D", body: "B\n" });
});

registry.define(/^the memory entry "([^"]+)" has nested type feedback and a top-level type reference$/, async (context, file) => {
  await writeEntry(context, file, { type: "feedback", topType: "reference", name: "T", description: "D", body: "B\n" });
});

registry.define(/^the memory entry "([^"]+)" has no type$/, async (context, file) => {
  await writeEntry(context, file, { type: null, name: "T", description: "D", body: "B\n" });
});

registry.define(/^the memory entry "([^"]+)" has metadata\.type feedback with name and description absent$/, async (context, file) => {
  await writeEntry(context, file, { type: "feedback", body: "" });
});

registry.define(/^the first nonblank body line is "([^"]+)"$/, async (context, line) => {
  await writeEntry(context, context.lastFile, { type: "feedback", body: `\n${line}\nanother line\n` });
});

registry.define(/^an enabled feedback entry uses "(LF|CRLF)" newlines and (no BOM|a UTF-8 BOM)$/, async (context, nl, bom) => {
  context.form = { nl: nl === "CRLF" ? "\r\n" : "\n", bom: bom !== "no BOM" };
});

registry.define(/^its description scalar is (.+)$/, async (context, scalar) => {
  const raw = scalar.startsWith('"') ? scalar : scalar;
  await writeEntry(context, "form.md", { type: "feedback", name: "Form", rawDescription: raw, body: "Body text.\n", ...context.form });
});

const PROBLEMS = {
  "an unterminated frontmatter block": () => "---\nname: Bad\nmetadata:\n  type: feedback\nPRIVATE-BODY never closes\n",
  "a duplicate metadata.type key": () => "---\nname: Bad\nmetadata:\n  type: feedback\n  type: project\n---\nPRIVATE-BODY\n",
  "an unterminated quoted description": () => '---\nname: Bad\ndescription: "PRIVATE-BODY\nmetadata:\n  type: feedback\n---\nbody\n',
  "a non-string metadata.type value": () => "---\nname: Bad\nmetadata:\n  type: {kind: PRIVATE-BODY}\n---\nbody\n",
  "feedback type but blank name, description and body": () => "---\nmetadata:\n  type: feedback\n---\n  \n",
  "an injected permission-denied read failure": () => entryText({ type: "feedback", name: "Denied", description: "PRIVATE-BODY", body: "x\n" }),
};

registry.define(/^"([^"]+)" has ((?:an unterminated|a duplicate|a non-string|feedback type but|an injected).+)$/, async (context, file, problem) => {
  assert.ok(PROBLEMS[problem], `known problem: ${problem}`);
  await project(context);
  await put(path.join(memoryDir(context), file), PROBLEMS[problem]());
  if (problem === "an injected permission-denied read failure") context.denied.add(file);
});

registry.define("the source is enabled and reading its directory returns permission denied", async (context) => {
  await project(context);
  context.dirDenied = true;
});

registry.define(/^whole-stream ingest indexed "([^"]+)" and "([^"]+)" from the enabled source$/, async (context, keep, remove) => {
  await writeEntry(context, keep, { type: "feedback", name: "Keep", description: "Stays", body: "Why: keep\n" });
  await writeEntry(context, remove, { type: "feedback", name: "Remove", description: "Goes", body: "Why: remove\n" });
  const records = await ingest(context);
  assert.deepEqual(operators(records).map((record) => record.id).sort(), [keep, remove].sort(), "non-vacuity: both were indexed");
});

registry.define("whole-stream ingest indexed eligible operator entries beside baseline work records", async (context) => {
  await writeEligible(context, 2);
  context.disabledBaseline = await ingestWith(context, { backend: context.memory.backend, sources: [] });
  const records = await ingest(context);
  assert.equal(operators(records).length, 2, "non-vacuity: operator records were indexed");
});

registry.define(/^"([^"]+)" was indexed as a feedback reminder containing "([^"]+)"$/, async (context, file, text) => {
  await writeEntry(context, file, { type: "feedback", name: "Reminder", description: "A reminder", body: `${text}\n` });
  context.entryFile = file;
  const records = await ingest(context);
  assert.ok(operators(records).find((record) => record.id === file)?.text.includes(text), "non-vacuity: the original text was indexed");
});

// =================================================================== WHEN ====

registry.define(/^I ingest the whole stream(?: with the local backend)?$/, async (context) => {
  if (context.compareToMovedAway) {
    // E1: the baseline is the same project with its memory folder moved away.
    const away = `${memoryDir(context)}.away`;
    await rename(memoryDir(context), away);
    context.baselineRecords = await ingest(context);
    await rename(away, memoryDir(context));
  }
  await ingest(context, "work memory ingest --all --json", context.subdir ? { cwd: context.subdir } : {});
});

registry.define("I ingest the whole stream in process", async (context) => {
  await ingestInProcess(context);
});

registry.define(/^I run "aof (.+)"$/, async (context, command) => {
  const result = await cli(context, command);
  context.result = result;
  if (result.status === 0 && /\bingest\b/.test(command)) {
    context.summary = result.stdout.trim().startsWith("{") ? JSON.parse(result.stdout) : null;
    context.store = await readStore(context);
    context.records = context.store?.records ?? [];
  }
});

registry.define(/^I ingest and recall "([^"]+)" as JSON$/, async (context, query) => {
  await ingest(context);
  context.recalled = await recall(context, query);
});

registry.define(/^I ingest and recall "([^"]+)" with kind "([^"]+)" and owner "([^"]+)"$/, async (context, query, kind, owner) => {
  await ingest(context);
  context.recalled = await recall(context, query, { kind, owner });
});

registry.define(/^I ingest and recall "([^"]+)" without an item filter and with limit (\d+)$/, async (context, query, limit) => {
  await ingest(context);
  context.recalled = await recall(context, query, { limit });
});

registry.define("I ingest and inspect memory status as JSON", async (context) => {
  await ingest(context);
  const result = await cli(context, "work memory status --json");
  assert.equal(result.status, 0, result.stderr);
  context.status = JSON.parse(result.stdout);
});

registry.define("I ingest and inspect memory status against the source-less baseline", async (context) => {
  const status = async () => {
    const result = await cli(context, "work memory status --json");
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  await ingestWith(context, { backend: context.memory.backend, sources: [] });
  context.statusBefore = await status();
  await ingest(context);
  context.status = await status();
});

registry.define("AOF validates the workspace configuration", async (context) => {
  await project(context);
  await writeFile(path.join(context.projectDir, ".aof", "aof.config.json"), `${JSON.stringify({ name: "fixture", resources: [], memory: { backend: "local", sources: JSON.parse(context.rawSources) } }, null, 2)}\n`, "utf8");
  context.diagnostics = await defaultApplication.assets.configInspect.validateConfig(context.projectDir);
  const schema = JSON.parse(await readFile(new URL("../../../schemas/aof.schema.json", import.meta.url), "utf8"));
  const Ajv2020 = (await import("ajv/dist/2020.js")).default;
  context.schemaAccepts = new Ajv2020({ strict: false }).compile(schema)({ name: "fixture", resources: [], memory: { backend: "local", sources: JSON.parse(context.rawSources) } });
});

registry.define(/^"([^"]+)" is deleted and I ingest the whole stream again$/, async (context, file) => {
  await rm(path.join(memoryDir(context), file));
  await ingest(context);
});

registry.define("memory.sources becomes [] and I ingest the whole stream again", async (context) => {
  setMemory(context, context.memory.backend, []);
  await ingest(context);
});

registry.define(/^its source changes to (feedback|project|reference) with body "([^"]+)" and I ingest again$/, async (context, type, body) => {
  await writeEntry(context, context.entryFile, { type, name: "Reminder", description: "A reminder", body: `${body}\n` });
  await ingest(context);
});

// =================================================================== THEN ====

const orderedWithoutOperators = (records) => workRecords(records).map((record) => `${record.item}|${record.recordType}|${record.id}`);

registry.define("the ordered records equal the baseline with no auto-memory source", (context) => {
  assert.ok(context.baselineRecords.length > 0, "non-vacuity: the baseline holds records");
  assert.deepEqual(context.records, context.baselineRecords);
  assert.equal(operators(context.records).length, 0);
});

registry.define("the existing index version is unchanged", (context) => {
  assert.equal(context.store.version, expectedVersion);
  assert.equal(context.store.version, 3);
});

registry.define("the result includes one operator lesson from each file beside the existing work records", (context) => {
  assert.deepEqual(operators(context.records).map((record) => record.id).sort(), ["feedback.md", "project.md"]);
  assert.ok(workRecords(context.records).length >= 4, "the work records are still there");
  assert.equal(context.summary.recordCount, context.records.length);
});

registry.define("the backend reports its existing no-op result", (context) => {
  assert.equal(context.result.status, 0, context.result.stderr);
  const summary = JSON.parse(context.result.stdout);
  assert.deepEqual(summary, { recordCount: 0 });
});

registry.define("no memory index is created", async (context) => {
  for (const store of Object.values(STORE)) await assert.rejects(stat(path.join(context.projectDir, store)), { code: "ENOENT" });
});

registry.define(/^exactly (\d+) operator lessons are present$/, (context, count) => {
  assert.equal(operators(context.records).length, Number(count));
});

registry.define("all baseline work records remain in their original relative order", async (context) => {
  const withoutSource = await ingestWith(context, { backend: context.memory.backend });
  assert.ok(withoutSource.length > 0, "non-vacuity: the baseline holds records");
  assert.deepEqual(workRecords(context.records), withoutSource);
});

registry.define("validation rejects memory.sources", (context) => {
  assert.deepEqual(context.diagnostics.map((entry) => [entry.severity, entry.code]), [["error", "invalid-memory-sources"]]);
  assert.match(context.diagnostics[0].path, /^memory\.sources/);
  assert.equal(context.schemaAccepts, false, "the JSON schema agrees");
});

registry.define("no ingest is performed", async (context) => {
  const result = await cli(context, "work memory ingest --all --json");
  assert.notEqual(result.status, 0, "an invalid source list stops the verb");
  assert.match(`${result.stderr}${result.stdout}`, /memory\.sources|Unsupported memory source|source/i);
  for (const store of Object.values(STORE)) await assert.rejects(stat(path.join(context.projectDir, store)), { code: "ENOENT" });
});

registry.define("only A's entry is added", (context) => {
  assert.deepEqual(operators(context.records).map((record) => record.id), ["a-entry.md"]);
});

registry.define("its source cites the file in the selected synthetic Claude home", (context) => {
  const [record] = operators(context.records);
  assert.equal(record.source, `${path.join(memoryDir(context), "a-entry.md")}:1`);
  assert.ok(record.source.startsWith(context.claudeHome));
});

registry.define("the baseline work records are indexed successfully", (context) => {
  assert.ok(workRecords(context.records).length >= 4);
});

registry.define("no operator lesson is fabricated", (context) => {
  assert.equal(operators(context.records).length, 0);
});

registry.define(/^a lesson has owner "([^"]+)" and id "([^"]+)"$/, (context, owner, id) => {
  const hits = context.recalled.filter((record) => record.id === id);
  assert.equal(hits.length, 1);
  context.subject = hits[0];
  assert.equal(context.subject.owner, owner);
  assert.equal(context.subject.recordType, "lesson");
});

registry.define(/^its item and itemSlug are "([^"]+)"$/, (context, value) => {
  assert.deepEqual([context.subject.item, context.subject.itemSlug], [value, value]);
});

registry.define(/^its title is "([^"]*)" and summary is "([^"]*)"$/, (context, title, summary) => {
  assert.deepEqual([context.subject.title, context.subject.summary], [title, summary]);
});

registry.define("its text contains both complete body instructions", (context) => {
  assert.ok(context.subject.text.includes("Why: recursive cleanup crosses the link"), context.subject.text);
  assert.ok(context.subject.text.includes("How to apply: unlink first"), context.subject.text);
  assert.equal(context.subject.text.includes("SESSION-NOT-SEARCHABLE"), false);
});

registry.define('its source is the entry\'s absolute path followed by ":1"', (context) => {
  assert.equal(context.subject.source, `${path.join(memoryDir(context), context.subject.id)}:1`);
  assert.ok(path.isAbsolute(context.subject.source.slice(0, -2)));
});

registry.define("the entry is an operator-owned lesson", (context) => {
  const record = context.records.find((entry) => entry.id === "aof-acd-project.md");
  assert.deepEqual([record.owner, record.recordType, record.item], ["operator", "lesson", AUTO_MEMORY_ITEM]);
  context.subject = record;
});

registry.define("the lesson is counted in the procedural layer", (context) => {
  assert.equal(context.status.layers.procedural, context.records.filter((record) => record.recordType === "lesson").length);
  assert.ok(context.status.layers.procedural >= 1);
});

registry.define("no new record type or layer field is added", (context) => {
  assert.deepEqual(Object.keys(context.status.layers).sort(), ["episodic", "procedural", "semantic"]);
  assert.deepEqual([...new Set(context.records.map((record) => record.recordType))], ["lesson"]);
  assert.equal("layer" in context.subject, false);
  assert.equal(context.store.version, expectedVersion);
});

registry.define("neither file produces a lesson", (context) => {
  assert.equal(operators(context.records).length, 0);
});

registry.define(/^that entry contributes (\d+) lessons$/, (context, count) => {
  assert.equal(operators(context.records).length, Number(count));
});

registry.define(/^its summary is "([^"]*)"$/, (context, summary) => {
  const [record] = operators(context.records);
  assert.equal(record.summary, summary);
  assert.equal(record.tags[0], "feedback");
});

registry.define(/^the lesson title is "([^"]*)"$/, (context, title) => {
  context.subject = operators(context.records)[0];
  assert.equal(context.subject.title, title);
});

registry.define(/^"([^"]+)" contributes one lesson and "([^"]+)" contributes none$/, (context, good, bad) => {
  assert.deepEqual(operators(context.records).map((record) => record.id), [good]);
  assert.equal(operators(context.records).some((record) => record.id === bad), false);
});

registry.define(/^a diagnostic identifies "([^"]+)" and the failure category "([^"]+)" without its body$/, (context, file, category) => {
  const hits = context.degrades.filter((entry) => entry.message.includes(file));
  assert.equal(hits.length, 1, JSON.stringify(context.degrades));
  assert.equal(hits[0].category, category);
  assert.match(hits[0].message, new RegExp(category));
  assert.equal(JSON.stringify(context.degrades).includes("PRIVATE-BODY"), false);
});

registry.define("the baseline work records remain available", (context) => {
  assert.ok(workRecords(context.records).length >= 4, `${workRecords(context.records).length} work records`);
  assert.equal(operators(context.records).length, 0);
});

registry.define("a diagnostic identifies the auto-memory source as unreadable", (context) => {
  assert.equal(context.degrades.length, 1);
  assert.equal(context.degrades[0].code, "memory-auto-memory-unreadable");
  assert.match(context.degrades[0].message, /claude-auto-memory source is unreadable/);
});

registry.define(/^the lesson is returned with kind "([^"]+)" and tags (\[.+\])$/, (context, kind, tags) => {
  assert.equal(context.recalled.length, 1, JSON.stringify(context.recalled.map((record) => record.id)));
  context.subject = context.recalled[0];
  assert.equal(context.subject.kind, kind);
  assert.deepEqual(context.subject.tags, JSON.parse(tags));
  assert.equal(context.subject.owner, "operator");
});

registry.define("its area, stage and status are empty strings", (context) => {
  assert.deepEqual([context.subject.area, context.subject.stage, context.subject.status], ["", "", ""]);
});

registry.define('its kind remains "near-miss", owner remains "operator" and stage remains empty', (context) => {
  assert.equal(context.recalled.length, 1, JSON.stringify(context.recalled.map((record) => record.id)));
  context.subject = context.recalled[0];
  assert.deepEqual([context.subject.kind, context.subject.owner, context.subject.stage], ["near-miss", "operator", ""]);
});

registry.define(/^its tags are (\[.+\])$/, (context, tags) => {
  assert.deepEqual(context.subject.tags, JSON.parse(tags));
});

registry.define('recalling "junction" with owner "operator" returns only the operator lesson', async (context) => {
  const records = await recall(context, "junction", { owner: "operator" });
  assert.deepEqual(records.map((record) => record.item), [AUTO_MEMORY_ITEM]);
});

registry.define('recalling "junction" with item "45" returns only the work-item lesson', async (context) => {
  const records = await recall(context, "junction", { item: "45" });
  assert.deepEqual(records.map((record) => `${record.item}/${record.id}`), ["45/R13"]);
});

registry.define('recalling "junction" with kind "mistake" and owner "operator" returns no operator lesson', async (context) => {
  assert.deepEqual(await recall(context, "junction", { kind: "mistake", owner: "operator" }), []);
});

registry.define("lesson and procedural counts each increase by 2", (context) => {
  assert.equal(context.status.lessons - context.statusBefore.lessons, 2);
  assert.equal(context.status.layers.procedural - context.statusBefore.layers.procedural, 2);
});

registry.define("the blank-area and blank-stage lesson counts each increase by 2", (context) => {
  assert.equal(context.status.conformance.area.blank - context.statusBefore.conformance.area.blank, 2);
  assert.equal(context.status.conformance.stage.blank - context.statusBefore.conformance.stage.blank, 2);
});

registry.define("blank-kind, non-enum-kind and blank-owner counts do not increase", (context) => {
  const was = context.statusBefore.conformance;
  const now = context.status.conformance;
  assert.deepEqual([now.kind.blank, now.kind.nonEnum, now.owner.blank], [was.kind.blank, was.kind.nonEnum, was.owner.blank]);
});

registry.define("all four distinct records appear", (context) => {
  const seen = context.recalled.map((record) => `${record.item}/${record.id}`);
  for (const identity of context.identities) assert.ok(seen.includes(identity), `${identity} in ${seen}`);
  assert.equal(seen.filter((identity) => identity.startsWith(AUTO_MEMORY_ITEM)).length, 1);
  assert.equal(new Set(seen).size, seen.length);
  assert.equal(seen.length >= 4, true);
});

registry.define("the operator record cites its absolute source while the work records retain their own sources", (context) => {
  const operator = context.recalled.find((record) => record.item === AUTO_MEMORY_ITEM);
  assert.equal(operator.source, `${path.join(memoryDir(context), operator.id)}:1`);
  for (const record of context.recalled.filter((entry) => entry.item !== AUTO_MEMORY_ITEM && /^(45|68|72)$/.test(entry.item))) {
    assert.match(record.source, /^\d+_milestone_[a-z]+\/(RETROSPECTIVE|ARCHITECTURE)\.md:\d+$/, record.source);
  }
});

registry.define(/^"([^"]+)" has no record and "([^"]+)" still has one$/, (context, gone, kept) => {
  const ids = operators(context.records).map((record) => record.id);
  assert.equal(ids.includes(gone), false);
  assert.equal(ids.includes(kept), true);
});

registry.define("existing work records remain", (context) => {
  assert.ok(workRecords(context.records).length >= 4);
});

registry.define("no operator auto-memory record remains", (context) => {
  assert.equal(operators(context.records).length, 0);
});

registry.define("the ordered baseline records equal the source-disabled baseline", (context) => {
  assert.ok(context.disabledBaseline.length > 0);
  assert.deepEqual(context.records, context.disabledBaseline);
});

registry.define(/^the source contributes (\d+) records$/, (context, count) => {
  assert.equal(operators(context.records).length, Number(count));
});

registry.define("the same id cites the updated text without old instruction", (context) => {
  const [record] = operators(context.records);
  assert.equal(record.id, context.entryFile);
  assert.ok(record.text.includes("new instruction"));
  assert.equal(record.text.includes("old instruction"), false);
});

registry.define(/^the same id has tags (\[.+\]) and kind "([^"]+)"$/, (context, tags, kind) => {
  const [record] = operators(context.records);
  assert.equal(record.id, context.entryFile);
  assert.deepEqual(record.tags, JSON.parse(tags));
  assert.equal(record.kind, kind);
});

registry.define(/^no operator record for "([^"]+)" remains$/, (context, file) => {
  assert.equal(operators(context.records).some((record) => record.id === file), false);
});

registry.define("only work-item 45 records are indexed", (context) => {
  assert.equal(context.result.status, 0, context.result.stderr);
  assert.ok(context.records.length > 0, "non-vacuity");
  assert.deepEqual([...new Set(context.records.map((record) => record.item))], ["45"]);
});

registry.define("no operator auto-memory record or work-item 68 record is included", (context) => {
  assert.equal(context.records.some((record) => record.item === AUTO_MEMORY_ITEM || record.item === "68"), false);
});

export async function runStep(context, step) {
  return registry.run(context, step);
}
