// Traceability wiring for story 137 / tasks/01_the-import-renders-through-the-template.feature —
// "the import renders every AOF.md through the template" (@executable).
//
// Drives the REAL writers (`writeColocatedDigest`, `materializeImport`) into throwaway folders and
// reads the written AOF.md back as text. The born-stamped scenario runs the REAL `validateWork`
// over a fixture stream, and the section-count rows run the REAL `parseAof`.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeColocatedDigest, materializeImport, AOF_FILE } from "../../src/import/materialize.mjs";
import { parseAof } from "../../src/memory/local-indexing.mjs";
import { validateWork, WORK_ITEM_SCHEMA_VERSION } from "../../src/work.mjs";
import { packageVersionString } from "../../src/asset-base.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const IMPORTED_AT = "2026-09-23";
const META = { slug: "calls", title: "Calls", status: "done" };
const OBJECTIVE = "  Route every inbound call to a queue.  ";
const SCOPE = "In: the queue. Out: the dialler.";
const DECISION = { id: "ADR-001", title: "Queue the calls" };
const OUTCOME = { id: "R1", title: "Keep it small" };
const FULL = { intent: { objective: OBJECTIVE, scope: SCOPE }, decisions: [DECISION], outcomes: [OUTCOME], meta: META };

async function withDir(body) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-137-digest-"));
  try {
    return await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeDigest(targetDir, recovered, { sourceSlug, importedAt = IMPORTED_AT } = {}) {
  await writeColocatedDigest({ targetDir, sourceSlug, milestoneRef: "03", recovered, importedAt });
  return readFile(path.join(targetDir, AOF_FILE), "utf8");
}

function frontmatterKeys(text) {
  const lines = text.split(/\r?\n/);
  return lines.slice(1, lines.indexOf("---", 1)).map((line) => line.split(":")[0]);
}

const headings = (text) => text.split(/\r?\n/).filter((line) => line.startsWith("## ")).map((line) => line.slice(3));

// `## Intent` → the body lines up to the next `## ` heading, trimmed.
function sectionBody(text, name) {
  const lines = text.split(/\r?\n/);
  const at = lines.indexOf(`## ${name}`);
  const rest = lines.slice(at + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
}

const KEY_ROWS = [
  { inputs: 'sourceSlug "legacy", importedAt set', options: { sourceSlug: "legacy" }, keys: "doc, milestone, slug, title, status, imported, importedBy, source, importedAt, schema, aofVersion" },
  { inputs: "no sourceSlug, importedAt set", options: {}, keys: "doc, milestone, slug, title, status, imported, importedBy, importedAt, schema, aofVersion" },
  { inputs: 'sourceSlug "legacy", no importedAt', options: { sourceSlug: "legacy", importedAt: null }, keys: "doc, milestone, slug, title, status, imported, importedBy, source, schema, aofVersion" },
];

const SECTION_ROWS = [
  { halves: "an objective only", recovered: { intent: { objective: OBJECTIVE, scope: null } }, headings: ["Intent"] },
  { halves: "an objective and a scope", recovered: { intent: { objective: OBJECTIVE, scope: SCOPE } }, headings: ["Intent", "Scope"] },
  { halves: "a scope only", recovered: { intent: { objective: null, scope: SCOPE } }, headings: ["Scope"] },
  { halves: "one decision only", recovered: { intent: null, decisions: [DECISION] }, headings: ["Decisions"] },
  { halves: "an objective and one outcome", recovered: { intent: { objective: OBJECTIVE }, outcomes: [OUTCOME] }, headings: ["Intent", "Lessons"] },
  { halves: "all four halves (FULL)", recovered: FULL, headings: ["Intent", "Scope", "Decisions", "Lessons"] },
  { halves: "nothing (intent null, no decisions/outcomes)", recovered: { intent: null, decisions: [], outcomes: [] }, headings: [] },
];

// Every `.mjs` under src/, recursively.
async function sourceFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await sourceFiles(full)));
    else if (entry.name.endsWith(".mjs")) out.push(full);
  }
  return out;
}

export const importDigestTemplateTests = [
  ...KEY_ROWS.map(({ inputs, options, keys }) => ({
    name: `137/01 import-digest: ${inputs} → frontmatter keys ${keys}`,
    run: () =>
      withDir(async (dir) => {
        const text = await writeDigest(dir, { ...FULL, meta: { ...META } }, options);
        assert.deepEqual(frontmatterKeys(text), keys.split(", "));
      }),
  })),

  {
    name: "137/01 import-digest: a fresh import is born-stamped, and validate names no finding against it",
    run: () =>
      withDir(async (root) => {
        const workDir = path.join(root, "work");
        const folder = path.join(workDir, "03_milestone_calls");
        await mkdir(folder, { recursive: true });
        await writeFile(path.join(folder, "SPEC.md"), "# Calls\n\n## Goal\n\nLegacy prose, no frontmatter.\n", "utf8");
        const text = await writeDigest(folder, FULL, { sourceSlug: "legacy" });
        assert.match(text, new RegExp(`^schema: ${WORK_ITEM_SCHEMA_VERSION}$`, "m"));
        assert.ok(text.split(/\r?\n/).includes(`aofVersion: ${packageVersionString()}`), "aofVersion is the running build's");
        const findings = await validateWork(workDir, { work: {} });
        const against = findings.filter((finding) => finding.path.replaceAll("\\", "/").endsWith("03_milestone_calls/AOF.md"));
        assert.deepEqual(against, [], `no finding names the fresh AOF.md: ${JSON.stringify(findings)}`);
      }),
  },

  ...SECTION_ROWS.map(({ halves, recovered, headings: expected }) => ({
    name: `137/01 import-digest: ${halves} → headings [${expected.join(", ")}], ${expected.length} summary record(s)`,
    run: () =>
      withDir(async (dir) => {
        const text = await writeDigest(dir, { ...recovered, meta: META });
        assert.deepEqual(headings(text), expected);
        const records = parseAof(text, { item: "03", itemSlug: "calls", workRelPath: "03_milestone_calls/AOF.md" });
        assert.equal(records.filter((record) => record.recordType === "summary").length, expected.length);
      }),
  })),

  {
    name: "137/01 import-digest: the recovered prose lands verbatim and a re-import is byte-identical",
    run: () =>
      withDir(async (dir) => {
        const first = await writeDigest(dir, FULL, { sourceSlug: "legacy" });
        const second = await writeDigest(dir, FULL, { sourceSlug: "legacy" });
        assert.equal(second, first, "two writes with the same inputs are byte-identical");
        assert.equal(sectionBody(first, "Intent"), OBJECTIVE.trim());
        assert.equal(sectionBody(first, "Decisions"), "- **ADR-001** Queue the calls");
      }),
  },

  // Review round 1 (craft): a source that yielded no title renders `title: ""` and the fallback
  // heading — never the template's own `<Milestone Title>` placeholder.
  {
    name: "137/01 import-digest: a recovered shape with no title renders title \"\" and the fallback heading, no template placeholder",
    run: () =>
      withDir(async (dir) => {
        const text = await writeDigest(dir, { intent: { objective: OBJECTIVE }, meta: {} });
        assert.ok(text.split(/\r?\n/).includes('title: ""'), `title is the empty string: ${text}`);
        assert.ok(text.split(/\r?\n/).includes("# Imported milestone 03 — Digest"), "the empty-title fallback heading");
        assert.ok(!/<[A-Za-z-]+( [A-Za-z]+)*>|YYYY-MM-DD|\bNN\b/.test(text), `no template placeholder survives the render: ${text}`);
      }),
  },

  {
    name: "137/01 import-digest: the co-located and the legacy-store digests come from the one renderer",
    run: () =>
      withDir(async (root) => {
        const intentOnly = { intent: { objective: OBJECTIVE, scope: SCOPE }, decisions: [], outcomes: [], meta: META };
        const colocated = await writeDigest(path.join(root, "colocated"), intentOnly);
        const out = await materializeImport({ projectRoot: path.join(root, "project"), sourceSlug: "legacy", milestoneRef: "03", recovered: intentOnly, importedAt: IMPORTED_AT });
        const legacy = await readFile(path.join(out.dir, AOF_FILE), "utf8");
        assert.deepEqual(frontmatterKeys(legacy), frontmatterKeys(colocated), "the same frontmatter key sequence");
        assert.deepEqual(headings(legacy), headings(colocated), "the same `## ` headings");

        const offenders = [];
        for (const file of await sourceFiles(path.join(repoRoot, "src"))) {
          if ((await readFile(file, "utf8")).includes('"doc: digest"')) offenders.push(path.relative(repoRoot, file));
        }
        assert.deepEqual(offenders, [], 'no .mjs under src/ hand-writes the literal "doc: digest"');
      }),
  },
];
