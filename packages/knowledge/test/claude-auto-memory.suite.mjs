// Traceability wiring for milestone 159 / story 01 (recall-operator-auto-memory) — the knowledge-owned
// units for the opt-in auto-memory source: the entry grammar, the leaf's diagnostics, the indexer's
// composition and the resolver's adapter branch. The task features are bound end to end in
// `test/integration/features/memory-auto-source.feature`; FF-15901..FF-15903 are
// `test/arch/memory/acd-auto-memory-source.test.mjs`. This suite owns the parser/error edge tables the
// integration runner cannot expand, and every collaborator is injected so a permission failure is
// portable and no fixture reaches the operator's real Claude home or AOF home.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { readdir as realReaddir, readFile as realReadFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { defaultApplication as app } from "aof/default-application";
import { createLocalIndexing } from "@aof/knowledge/memory/local-indexing";
import { inspectMemoryConfiguration } from "@aof/knowledge/memory";
import {
  AUTO_MEMORY_ITEM, createClaudeAutoMemory, parseAutoMemoryEntry, parseAutoMemoryLocator, resolveMemorySources,
} from "@aof/knowledge/memory/claude-auto-memory";

const seam = app.knowledge.work.memory;
const ENABLED = { backend: "local", sources: ["claude-auto-memory"] };
const test = (name, run) => ({ name: `159/01 ${name}`, run });

const entry = ({ name = "Avoid junction cleanup", description = "Keep source intact", type = "feedback", body = "Why: the link crosses.\n\nHow to apply: unlink first.\n", nl = "\n", bom = false, rawDescription } = {}) => {
  const lines = ["---", ...(name === null ? [] : [`name: ${name}`]), ...(rawDescription !== undefined ? [`description: ${rawDescription}`] : description === null ? [] : [`description: ${JSON.stringify(description)}`]), "metadata:", "  node_type: memory", ...(type === null ? [] : [`  type: ${type}`]), "  originSessionId: SECRET-SESSION", "---", body];
  return `${bom ? "\uFEFF" : ""}${lines.join("\n").replace(/\n/g, nl)}`;
};

// A project whose Claude home is synthetic and whose AOF home is never touched.
async function withProject(run, { baseline = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-159-01-"));
  try {
    const projectRoot = path.join(root, "project");
    const workDir = path.join(projectRoot, "wiki", "work");
    const dir = path.join(workDir, "45_milestone_junction");
    await mkdir(dir, { recursive: true });
    await mkdir(path.join(projectRoot, ".aof"), { recursive: true });
    await writeFile(path.join(dir, "SPEC.md"), "---\ntype: milestone\nnumber: 45\nslug: junction\ntitle: J\nstatus: done\n---\n");
    if (baseline) await writeFile(path.join(dir, "RETROSPECTIVE.md"), "## R13 · Junction\n- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer\n- **What happened:** a junction was cleaned.\n- **Why:** links cross.\n- **Lesson:** unlink the junction first.\n");
    const claudeHome = path.join(root, "claude");
    const memoryDir = path.join(claudeHome, "projects", projectRoot.replace(/[^A-Za-z0-9]/g, "-"), "memory");
    await mkdir(memoryDir, { recursive: true });
    const env = { CLAUDE_CONFIG_DIR: claudeHome };
    const ctx = (...given) => ({ workDir, projectRoot, configMemory: given.length ? given[0] : ENABLED, env });
    const put = (file, text) => writeFile(path.join(memoryDir, file), text);
    await run({ root, projectRoot, workDir, memoryDir, env, ctx, put });
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await rm(root, { recursive: true, force: true });
  }
}

// The indexer built from stubbed work services and a given adapter, so a read or a failure is injectable.
function indexerFor(p, autoMemory) {
  return createLocalIndexing({
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

function leafFor(p, { fs, degrades = [] } = {}) {
  return createClaudeAutoMemory({
    memoryDirFor: ({ env }) => path.join(env.CLAUDE_CONFIG_DIR, "projects", p.projectRoot.replace(/[^A-Za-z0-9]/g, "-"), "memory"),
    reportDegrade: (code, error, extra) => degrades.push({ code, message: error.message, ...extra }),
    ...(fs ? { fs } : {}),
  });
}

const operators = (records) => records.filter((r) => r.item === AUTO_MEMORY_ITEM);
const sha = (text) => createHash("sha256").update(text).digest("hex");

export const claudeAutoMemoryTests = [
  // ---------------------------------------------------------------- the grammar ----
  test('R2 outline "Only the measured nested type admits a source entry"', () => {
    const shapes = [
      ["metadata.type user", entry({ type: "user" }), 0],
      ["metadata.type unsupported", entry({ type: "invented" }), 0],
      ["top-level type feedback without metadata.type", "---\nname: n\ntype: feedback\n---\nbody\n", 0],
      ["metadata.type feedback and top-level type reference", "---\nname: n\ntype: reference\nmetadata:\n  type: feedback\n---\nbody\n", 1],
      ["no type", entry({ type: null }), 0],
      ["metadata.type reference", entry({ type: "reference" }), 0],
    ];
    for (const [shape, text, count] of shapes) assert.equal(parseAutoMemoryEntry(text, "a.md") === null ? 0 : 1, count, shape);
    assert.equal(parseAutoMemoryEntry("# MEMORY\n- [a](a.md)\n", "MEMORY.md"), null, "an index without frontmatter is not an entry");
  }),
  test('R2 outline "Measured scalar and newline forms are readable"', () => {
    const forms = [
      ["LF", false, '"Reason: keep the source"'],
      ["CRLF", true, "'Reason: keep the source'"],
      ["LF", false, "Reason: keep the source"],
      ["CRLF", false, "Reason: keep the source  # trailing comment"],
    ];
    for (const [nl, bom, rawDescription] of forms) {
      const parsed = parseAutoMemoryEntry(entry({ nl: nl === "CRLF" ? "\r\n" : "\n", bom, rawDescription }), "a.md");
      assert.equal(parsed.summary, "Reason: keep the source", `${nl} ${bom} ${rawDescription}`);
      assert.equal(parsed.type, "feedback");
    }
    assert.equal(parseAutoMemoryEntry(entry({ rawDescription: "'it''s kept'" }), "a.md").summary, "it's kept");
    assert.equal(parseAutoMemoryEntry(entry({ rawDescription: '"say \\"hi\\""' }), "a.md").summary, 'say "hi"');
  }),
  test("R2 the body survives whole, metadata is excluded and the title falls back to the filename", () => {
    const parsed = parseAutoMemoryEntry(entry({ name: "Avoid junction cleanup", body: "Why: recursive cleanup crosses the link\n\nHow to apply: unlink first\n" }), "j.md");
    assert.ok(parsed.text.includes("Why: recursive cleanup crosses the link\n\nHow to apply: unlink first"));
    assert.ok(parsed.text.includes("Avoid junction cleanup") && parsed.text.includes("Keep source intact"));
    assert.equal(parsed.text.includes("SECRET-SESSION"), false, "origin-session metadata is not searchable");
    const bare = parseAutoMemoryEntry("---\nmetadata:\n  type: feedback\n---\n\nRemember to check the result\nsecond line\n", "remember.md");
    assert.equal(bare.title, "remember.md");
    assert.equal(bare.summary, "Remember to check the result");
    const empty = parseAutoMemoryEntry(entry({ body: "" }), "empty.md");
    assert.equal(empty.title, "Avoid junction cleanup", "an empty body is valid when a name exists");
  }),
  test('R2 outline "Bad entries produce a diagnosis" — category per problem', () => {
    const problems = [
      ["unterminated-frontmatter", "---\nname: n\nmetadata:\n  type: feedback\nbody never closes\n"],
      ["duplicate-key", "---\nname: n\nmetadata:\n  type: feedback\n  type: project\n---\nb\n"],
      ["duplicate-key", "---\nname: a\nname: b\nmetadata:\n  type: feedback\n---\nb\n"],
      ["malformed-value", '---\nname: n\ndescription: "never closed\nmetadata:\n  type: feedback\n---\nb\n'],
      ["malformed-value", "---\nname: n\nmetadata:\n  type: [feedback]\n---\nb\n"],
      ["malformed-value", "---\nname: n\nmetadata:\n  type: 42\n---\nb\n"],
      ["malformed-value", '---\nname: n\ndescription: "closed" trailing\nmetadata:\n  type: feedback\n---\nb\n'],
      ["unusable-entry", "---\nmetadata:\n  type: feedback\n---\n\n   \n"],
    ];
    for (const [category, text] of problems) assert.throws(() => parseAutoMemoryEntry(text, "bad.md"), { category }, `${category}: ${text.slice(0, 40)}`);
  }),
  test("R3 an unknown key, kind, owner or stage in the source never reclassifies the lesson", async () => {
    await withProject(async (p) => {
      await p.put("a.md", "---\nname: n\nkind: blocker\nowner: developer\nstage: verify\nmetadata:\n  type: project\n  kind: mistake\n---\nThe event was a misunderstanding and a mistake.\n");
      const [record] = await leafFor(p).autoMemoryRecords({ projectRoot: p.projectRoot, env: p.env });
      assert.deepEqual([record.kind, record.owner, record.stage, record.area, record.status, record.tags], ["near-miss", "operator", "", "", "", ["project"]]);
      assert.equal(record.item, "operator:claude-auto-memory");
      assert.equal(record.itemSlug, "operator:claude-auto-memory");
      assert.equal(record.recordType, "lesson");
    });
  }),

  // ------------------------------------------------------------- configuration ----
  test("R1 memory.sources: absent and empty are inert; anything else outside the admitted set is refused", () => {
    assert.deepEqual(resolveMemorySources({}), []);
    assert.deepEqual(resolveMemorySources(undefined), []);
    assert.deepEqual(resolveMemorySources({ sources: [] }), []);
    assert.deepEqual(resolveMemorySources({ sources: ["claude-auto-memory"] }), ["claude-auto-memory"]);
    for (const sources of ["claude-auto-memory", ["unknown-memory"], ["claude-auto-memory", "claude-auto-memory"], [null], null, {}, [1], [""]]) {
      assert.throws(() => resolveMemorySources({ sources }), { code: "invalid-memory-sources", path: /^memory\.sources/ }, JSON.stringify(sources));
    }
  }),
  test("R1 outline: an invalid source setting is refused by validation AND by the seam before any ingest", async () => {
    await withProject(async (p) => {
      for (const sources of ["claude-auto-memory", ["unknown-memory"], ["claude-auto-memory", "claude-auto-memory"], [null]]) {
        const config = { memory: { backend: "local", sources } };
        assert.throws(() => inspectMemoryConfiguration(config), { code: "invalid-memory-sources" });
        await assert.rejects(seam.runMemory(["ingest", "--all"], { config, ctx: p.ctx(config.memory) }), { code: "invalid-memory-sources" });
        await assert.rejects(() => readFile(path.join(p.projectRoot, ".aof", "aof.memory.index.json")), { code: "ENOENT" }, "no index was written");
      }
      assert.equal(inspectMemoryConfiguration({ memory: ENABLED }).backend, "local");
    });
  }),

  // --------------------------------------------------------------- composition ----
  test("R1 E1 + FF-15901: an absent or empty setting makes NO read of the auto-memory folder", async () => {
    await withProject(async (p) => {
      await p.put("a.md", entry());
      const reads = [];
      const fs = { readdir: async (...a) => (reads.push(["readdir", a[0]]), realReaddir(...a)), readFile: async (...a) => (reads.push(["readFile", a[0]]), realReadFile(...a)) };
      const { buildRecords } = indexerFor(p, leafFor(p, { fs }));
      const baseline = await buildRecords(null, p.ctx({}));
      for (const memory of [undefined, {}, { sources: [] }, { backend: "local" }]) assert.deepEqual(await buildRecords(null, p.ctx(memory)), baseline);
      assert.deepEqual(reads, [], "a disabled source read nothing");
      assert.equal(operators(baseline).length, 0);
      assert.equal(baseline.length, 1, "the repository lesson is indexed");
    });
  }),
  test("R1 E2 + R4: opt-in appends deterministic operator lessons AFTER the existing records, in filename order", async () => {
    await withProject(async (p) => {
      await p.put("b-project.md", entry({ name: "B", type: "project" }));
      await p.put("a-feedback.md", entry({ name: "A" }));
      await p.put("c-ref.md", entry({ name: "C", type: "reference" }));
      await p.put("MEMORY.md", "- [A](a-feedback.md)\n");
      await p.put("notes.txt", entry());
      const { buildRecords } = indexerFor(p, leafFor(p));
      const baseline = await buildRecords(null, p.ctx({}));
      const on = await buildRecords(null, p.ctx());
      assert.deepEqual(on.slice(0, baseline.length), baseline, "baseline records keep their order");
      assert.deepEqual(on.slice(baseline.length).map((r) => [r.id, r.title, r.tags]), [["a-feedback.md", "A", ["feedback"]], ["b-project.md", "B", ["project"]]]);
      assert.deepEqual(await buildRecords(null, p.ctx()), on, "deterministic");
      for (const record of operators(on)) assert.equal(record.source, `${path.join(p.memoryDir, record.id)}:1`);
    });
  }),
  test("R4 scoped rebuild contains no operator record; deleting an entry and disabling the source both drop it", async () => {
    await withProject(async (p) => {
      await p.put("keep.md", entry({ name: "Keep" }));
      await p.put("remove.md", entry({ name: "Remove" }));
      const { buildRecords } = indexerFor(p, leafFor(p));
      assert.equal(operators(await buildRecords("45", p.ctx())).length, 0, "--item/--only scope is work-stream only");
      assert.deepEqual(operators(await buildRecords(null, p.ctx())).map((r) => r.id), ["keep.md", "remove.md"]);
      await rm(path.join(p.memoryDir, "remove.md"));
      assert.deepEqual(operators(await buildRecords(null, p.ctx())).map((r) => r.id), ["keep.md"]);
      const disabled = await buildRecords(null, p.ctx({ backend: "local", sources: [] }));
      assert.deepEqual(disabled, await buildRecords(null, p.ctx({})), "disabling restores exactly the source-less index");
    });
  }),
  test("R4 outline: an edited entry keeps its id and drops its stale text; a changed type drops or retags it", async () => {
    await withProject(async (p) => {
      const { buildRecords } = indexerFor(p, leafFor(p));
      await p.put("entry.md", entry({ body: "old instruction\n" }));
      const before = operators(await buildRecords(null, p.ctx()));
      assert.ok(before[0].text.includes("old instruction"));
      await p.put("entry.md", entry({ body: "new instruction\n" }));
      const edited = operators(await buildRecords(null, p.ctx()));
      assert.deepEqual([edited.length, edited[0].id], [1, "entry.md"]);
      assert.ok(edited[0].text.includes("new instruction") && !edited[0].text.includes("old instruction"));
      await p.put("entry.md", entry({ type: "project", body: "new instruction\n" }));
      const retyped = operators(await buildRecords(null, p.ctx()));
      assert.deepEqual([retyped[0].tags, retyped[0].kind], [["project"], "near-miss"]);
      await p.put("entry.md", entry({ type: "reference", body: "old instruction\n" }));
      assert.equal(operators(await buildRecords(null, p.ctx())).length, 0);
    });
  }),
  test("R1 a node with no auto-memory directory still indexes its work and fabricates nothing", async () => {
    await withProject(async (p) => {
      await rm(p.memoryDir, { recursive: true });
      const degrades = [];
      const { buildRecords } = indexerFor(p, leafFor(p, { degrades }));
      const records = await buildRecords(null, p.ctx());
      assert.equal(records.length, 1);
      assert.equal(operators(records).length, 0);
      assert.deepEqual(degrades, [], "an absent folder is the ordinary case, not a diagnostic");
    });
  }),
  test("R1 the selected project and CLAUDE_CONFIG_DIR decide discovery — another project's folder is never read", async () => {
    await withProject(async (p) => {
      const other = path.join(path.dirname(p.memoryDir), "..", "C--other-project", "memory");
      await mkdir(other, { recursive: true });
      await writeFile(path.join(other, "b.md"), entry({ name: "B" }));
      await p.put("a.md", entry({ name: "A" }));
      const { buildRecords } = indexerFor(p, leafFor(p));
      assert.deepEqual(operators(await buildRecords(null, p.ctx())).map((r) => r.title), ["A"]);
      // The folder lives under the SELECTED Claude home: a second home with the same slug is not consulted.
      const elsewhere = { ...p.ctx(), env: { CLAUDE_CONFIG_DIR: path.join(p.root, "nowhere") } };
      assert.equal(operators(await buildRecords(null, elsewhere)).length, 0);
    });
  }),

  // ------------------------------------------------------------------ diagnostics ----
  test('R2 outline "Bad entries …" through the leaf: a diagnosis names the file and category, never the body, and valid siblings survive', async () => {
    const cases = [
      ["an unterminated frontmatter block", "---\nname: n\nmetadata:\n  type: feedback\nPRIVATE-BODY\n", "unterminated-frontmatter"],
      ["a duplicate metadata.type key", "---\nname: n\nmetadata:\n  type: feedback\n  type: project\n---\nPRIVATE-BODY\n", "duplicate-key"],
      ["an unterminated quoted description", '---\nname: n\ndescription: "PRIVATE-BODY\nmetadata:\n  type: feedback\n---\nb\n', "malformed-value"],
      ["a non-string metadata.type value", "---\nname: n\nmetadata:\n  type: {a: PRIVATE-BODY}\n---\nb\n", "malformed-value"],
      ["feedback type but blank name, description and body", "---\nmetadata:\n  type: feedback\n---\n  \n", "unusable-entry"],
    ];
    for (const [problem, text, category] of cases) {
      await withProject(async (p) => {
        await p.put("good.md", entry({ name: "Good", type: "project" }));
        await p.put("bad.md", text);
        const degrades = [];
        const records = await leafFor(p, { degrades }).autoMemoryRecords({ projectRoot: p.projectRoot, env: p.env });
        assert.deepEqual(records.map((r) => r.id), ["good.md"], problem);
        assert.equal(degrades.length, 1, problem);
        assert.equal(degrades[0].category, category, problem);
        assert.ok(degrades[0].message.includes("bad.md") && degrades[0].message.includes(category), degrades[0].message);
        assert.equal(JSON.stringify(degrades).includes("PRIVATE-BODY"), false, "no raw content in a diagnostic");
      });
    }
  }),
  test("R2 an injected permission-denied read skips that entry only; an unreadable directory is visible and keeps the work records", async () => {
    await withProject(async (p) => {
      await p.put("good.md", entry({ name: "Good" }));
      await p.put("denied.md", entry({ name: "Denied" }));
      const denied = Object.assign(new Error("EACCES: permission denied, open PRIVATE-PATH"), { code: "EACCES" });
      const degrades = [];
      const fs = { readdir: realReaddir, readFile: async (file, ...rest) => { if (String(file).endsWith("denied.md")) throw denied; return realReadFile(file, ...rest); } };
      const records = await leafFor(p, { fs, degrades }).autoMemoryRecords({ projectRoot: p.projectRoot, env: p.env });
      assert.deepEqual(records.map((r) => r.id), ["good.md"]);
      assert.deepEqual(degrades.map((d) => d.category), ["unreadable-entry"]);
      assert.equal(JSON.stringify(degrades).includes("PRIVATE-PATH"), false);

      const dirDegrades = [];
      const { buildRecords } = indexerFor(p, leafFor(p, { fs: { readdir: async () => { throw denied; }, readFile: realReadFile }, degrades: dirDegrades }));
      const built = await buildRecords(null, p.ctx());
      assert.equal(built.length, 1, "the repository lesson survives");
      assert.equal(dirDegrades.length, 1);
      assert.equal(dirDegrades[0].code, "memory-auto-memory-unreadable");
      assert.match(dirDegrades[0].message, /claude-auto-memory source is unreadable/);
    });
  }),
  test("R2 diagnostics are bounded: a folder of bad entries reports a capped number plus one summary", async () => {
    await withProject(async (p) => {
      for (let i = 0; i < 30; i += 1) await p.put(`bad-${String(i).padStart(2, "0")}.md`, "---\nname: n\nmetadata:\n  type: feedback\nnever closes\n");
      const degrades = [];
      await leafFor(p, { degrades }).autoMemoryRecords({ projectRoot: p.projectRoot, env: p.env });
      assert.equal(degrades.length, 21);
      assert.equal(degrades.at(-1).category, "diagnostics-suppressed");
    });
  }),
  test("R2 only regular files directly in the folder are entries — a subfolder, a link and a non-Markdown file are not", async () => {
    await withProject(async (p) => {
      await mkdir(path.join(p.memoryDir, "nested.md"), { recursive: true });
      await writeFile(path.join(p.memoryDir, "nested.md", "deep.md"), entry());
      await p.put("a.md", entry({ name: "A" }));
      await p.put("a.txt", entry());
      let linked = true;
      try {
        await symlink(path.join(p.root, "outside.md"), path.join(p.memoryDir, "link.md"));
      } catch {
        linked = false;
      }
      const records = await leafFor(p).autoMemoryRecords({ projectRoot: p.projectRoot, env: p.env });
      assert.deepEqual(records.map((r) => r.id), ["a.md"], `link created: ${linked}`);
    });
  }),

  // ------------------------------------------------------------------- resolver ----
  test("FF-15902 locator grammar: the exact terminal :1 form only, drive colons and # are literal", () => {
    assert.equal(parseAutoMemoryLocator("C:\\claude\\memory\\a.md:1"), "C:\\claude\\memory\\a.md");
    assert.equal(parseAutoMemoryLocator("/home/u/memory/a#b.md:1"), "/home/u/memory/a#b.md");
    for (const bad of ["a.md:1", "/m/a.md:2", "/m/a.md", "/m/a.md:1#/p", "/m/a.md:1#", "/m/a.txt:1", "", null]) assert.equal(parseAutoMemoryLocator(bad), null, String(bad));
  }),
  test("FF-15902 resolver: an enabled adapter record resolves inside the memory folder; everything else is refused", async () => {
    await withProject(async (p) => {
      await p.put("a.md", entry({ name: "A" }));
      await p.put("with#hash.md", entry({ name: "H" }));
      const indexing = indexerFor(p, leafFor(p));
      const records = operators(await indexing.buildRecords(null, p.ctx()));
      for (const record of records) {
        const resolved = indexing.resolveRecordSourcePath(record, p.ctx());
        assert.equal(resolved.line, 1);
        assert.equal(resolved.absPath, path.join(p.memoryDir, record.id));
        assert.ok((await indexing.readRecordSourceValue(record, p.ctx())).startsWith("---"));
      }
      const forge = (source) => ({ ...records[0], source });
      const outside = path.join(p.root, "outside.md");
      await writeFile(outside, entry());
      const refused = [
        `${outside}:1`, // an absolute path outside the folder
        `${path.join(p.memoryDir, "..", "outside.md")}:1`, // traversal
        `${p.memoryDir}-evil${path.sep}a.md:1`, // sibling-prefix trick
        `${path.join(p.memoryDir, "nested", "a.md")}:1`, // a descendant folder
        `${path.join(p.memoryDir, "a.md")}:1#/x`, // a JSON pointer
        `${path.join(p.memoryDir, "a.md")}:2`, // not the exact :1 form
        "a.md:1", // relative
      ];
      for (const source of refused) assert.throws(() => indexing.resolveRecordSourcePath(forge(source), p.ctx()), { code: "memory-source-outside-root" }, source);
      // Disabled or unselected: the same record is just an absolute path, and the existing guard refuses it.
      for (const memory of [{ backend: "local" }, { backend: "local", sources: [] }, undefined]) {
        assert.throws(() => indexing.resolveRecordSourcePath(records[0], p.ctx(memory)), { code: "memory-source-outside-root" });
      }
      // An ordinary record never gains the branch by naming an absolute path.
      assert.throws(() => indexing.resolveRecordSourcePath({ item: "45", source: `${path.join(p.memoryDir, "a.md")}:1` }, p.ctx()), { code: "memory-source-outside-root" });
      // A link out of the folder is refused where the platform allows creating one.
      try {
        await symlink(outside, path.join(p.memoryDir, "escape.md"));
        assert.throws(() => indexing.resolveRecordSourcePath(forge(`${path.join(p.memoryDir, "escape.md")}:1`), p.ctx()), { code: "memory-source-outside-root" });
      } catch (error) {
        if (error.code !== "EPERM" && error.code !== "EACCES") throw error;
      }
    });
  }),

  // ------------------------------------------------------ the seam, both backends ----
  test("R1 outline: both backends share the source selection, E3: backend none stays inert, and the source files are never changed", async () => {
    await withProject(async (p) => {
      await p.put("a.md", entry({ name: "A" }));
      await p.put("b.md", entry({ name: "B", type: "project" }));
      const before = sha(await readFile(path.join(p.memoryDir, "a.md"), "utf8") + await readFile(path.join(p.memoryDir, "b.md"), "utf8"));
      const invocations = [];
      const graphCtx = (memory) => ({ ...p.ctx(memory), invoke: async (name, args) => { invocations.push({ name, args }); const error = new Error("graphify binary not found"); error.code = "graphify-missing"; throw error; }, loadWorkspace: async () => ({ config: { name: "f", memory }, configPath: path.join(p.projectRoot, ".aof", "aof.config.json"), projectRoot: p.projectRoot, workDir: p.workDir }) });
      const rows = [["local", [], 0], ["local", ["claude-auto-memory"], 2], ["graphify", undefined, 0], ["graphify", [], 0], ["graphify", ["claude-auto-memory"], 2]];
      for (const [backend, sources, count] of rows) {
        const memory = { backend, ...(sources ? { sources } : {}) };
        const result = await seam.runMemory(["ingest", "--all"], { config: { memory }, ctx: graphCtx(memory) });
        assert.equal(operators(result.result.records).length, count, `${backend} ${JSON.stringify(sources)}`);
        assert.equal(result.result.records.filter((r) => r.item !== AUTO_MEMORY_ITEM).length, 1, "the baseline record keeps its place");
      }
      const none = await seam.runMemory(["ingest", "--all"], { config: { memory: { backend: "none", sources: ["claude-auto-memory"] } }, ctx: p.ctx() });
      assert.equal(none.result.recordCount, 0);
      assert.equal(sha(await readFile(path.join(p.memoryDir, "a.md"), "utf8") + await readFile(path.join(p.memoryDir, "b.md"), "utf8")), before, "the source is read-only");
      assert.ok(invocations.every(({ args }) => !JSON.stringify(args).includes(p.memoryDir)), "the graph build never receives the source");
    });
  }),
  test("R3 recall keeps the hard filters: owner, item and kind still separate operator and work-item lessons", async () => {
    await withProject(async (p) => {
      await p.put("junction.md", entry({ name: "Junction reminder", body: "Why: junction links cross.\nHow to apply: unlink the junction.\n" }));
      const config = { memory: ENABLED };
      const ingested = await seam.runMemory(["ingest", "--all"], { config, ctx: p.ctx() });
      assert.equal(ingested.result.recordCount, 2);
      const recall = async (...flags) => (await seam.runMemory(["recall", "junction", ...flags], { config, ctx: p.ctx() })).result.records;
      assert.deepEqual((await recall("--owner", "operator")).map((r) => r.id), ["junction.md"]);
      assert.deepEqual((await recall("--item", "45")).map((r) => r.id), ["R13"]);
      assert.deepEqual(await recall("--kind", "mistake", "--owner", "operator"), []);
      const operator = (await recall("--kind", "near-miss", "--owner", "operator"))[0];
      assert.deepEqual([operator.kind, operator.tags, operator.area, operator.stage, operator.status], ["near-miss", ["feedback"], "", "", ""]);
    });
  }),
  test("R3 status counts operator lessons in the procedural layer and reports blank metadata honestly", async () => {
    await withProject(async (p) => {
      await p.put("a.md", entry({ name: "A" }));
      await p.put("b.md", entry({ name: "B", type: "project" }));
      const status = async (memory) => (await seam.runMemory(["status"], { config: { memory }, ctx: p.ctx(memory) })).result;
      await seam.runMemory(["ingest", "--all"], { config: { memory: { backend: "local" } }, ctx: p.ctx({ backend: "local" }) });
      const before = await status({ backend: "local" });
      await seam.runMemory(["ingest", "--all"], { config: { memory: ENABLED }, ctx: p.ctx() });
      const after = await status(ENABLED);
      assert.equal(after.lessons - before.lessons, 2);
      assert.equal(after.layers.procedural - before.layers.procedural, 2);
      const { conformance: was } = before;
      const { conformance: now } = after;
      assert.equal(now.area.blank - was.area.blank, 2);
      assert.equal(now.stage.blank - was.stage.blank, 2);
      assert.deepEqual([now.kind.blank, now.kind.nonEnum, now.owner.blank], [was.kind.blank, was.kind.nonEnum, was.owner.blank]);
    });
  }),
];
