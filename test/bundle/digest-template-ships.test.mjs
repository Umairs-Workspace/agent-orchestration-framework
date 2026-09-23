// Traceability wiring for story 137 / tasks/00_the-digest-template-ships-with-the-set.feature —
// "the AOF.md digest template ships with the record-doc set" (@executable).
//
// Follows the OUTCOME precedent (test/run/outcome-template-shared-home.test.mjs): the REAL
// descriptor, the REAL bundle root and the REAL shipped manifest. The template's frontmatter and
// headings are read line by line HERE, independently of `src/work/digest-template.mjs`, so a
// defect in the contract module cannot also hide the defect in the file it reads. The @manual
// `aof work update` scenario is not wired here.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBundle, renderBundleTemplateOutputs, TEMPLATE_STAMP } from "../../src/work/bundle.mjs";
import { readShippedManifest } from "../../src/work/bundle-manifest.mjs";
import { scaffoldBacklogDriver } from "../../src/commands/insert-shared.mjs";
import { BACKLOG_ROOT } from "../../src/work.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = path.join(repoRoot, "src", "bundle", "templates", "milestone", "AOF.md");
const RENDER_PATH = ".aof/templates/work/milestone/AOF.md";

const normalize = (p) => String(p).replaceAll("\\", "/");

async function frontmatterLines() {
  const lines = (await readFile(SOURCE, "utf8")).split(/\r?\n/);
  assert.equal(lines[0], "---", "the template opens on a frontmatter fence");
  return lines.slice(1, lines.indexOf("---", 1));
}

const KEY_ROWS = [
  ["doc", false],
  ["milestone", false],
  ["slug", false],
  ["title", false],
  ["status", false],
  ["imported", false],
  ["importedBy", false],
  ["source", true],
  ["importedAt", true],
  ["schema", false],
  ["aofVersion", false],
];

const SCAFFOLD_ROWS = [
  { type: "milestone", docs: ["SPEC.md", "STATE.md"] },
  { type: "uat", docs: ["SESSION.md", "STATE.md"] },
  { type: "chore", docs: ["CHORE.md"] },
];

export const digestTemplateShipsTests = [
  {
    name: `137/00 digest-template: the bundle renders AOF.md to "${RENDER_PATH}", marker-stamped, and the shipped manifest carries it as template "milestone"`,
    run: async () => {
      const outputs = renderBundleTemplateOutputs(loadBundle(), { runtimes: ["claude"] }).filter(
        (output) => normalize(output.path) === RENDER_PATH,
      );
      assert.equal(outputs.length, 1, "exactly one rendered output has the milestone AOF.md path");
      const source = (await readFile(SOURCE, "utf8")).replace(/^﻿/, "");
      assert.equal(outputs[0].content, `${TEMPLATE_STAMP}\n\n${source}`, "the bundle marker, then the template body");

      const entries = readShippedManifest().entries.filter((entry) => normalize(entry.path) === RENDER_PATH);
      assert.equal(entries.length, 1, `the shipped manifest carries one entry for ${RENDER_PATH}`);
      assert.deepEqual(entries[0].resource, { id: "milestone", kind: "template" });
    },
  },

  ...KEY_ROWS.map(([key, omit], index) => ({
    name: `137/00 digest-template: frontmatter line ${index + 1} declares "${key}" and ${omit ? "carries" : "does not carry"} the # OMIT annotation`,
    run: async () => {
      const line = (await frontmatterLines())[index] ?? "";
      assert.match(line, new RegExp(`^${key}:`), `line ${index + 1} declares the key "${key}"; got ${JSON.stringify(line)}`);
      const comment = line.match(/\s+#.*$/)?.[0] ?? "";
      assert.equal(/\bOMIT\b/.test(comment), omit, `line ${index + 1} ${omit ? "carries" : "does not carry"} # OMIT: ${JSON.stringify(line)}`);
    },
  })),

  {
    name: "137/00 digest-template: the frontmatter declares exactly 11 keys and `doc` is `digest`",
    run: async () => {
      const keyed = (await frontmatterLines()).filter((line) => /^[A-Za-z0-9_-]+:/.test(line));
      assert.equal(keyed.length, 11, `exactly 11 keys; got ${JSON.stringify(keyed)}`);
      assert.equal(keyed.find((line) => line.startsWith("doc:")), "doc: digest");
    },
  },

  {
    name: "137/00 digest-template: the `## ` headings are Intent, Scope, Decisions, Lessons, in that order",
    run: async () => {
      const headings = (await readFile(SOURCE, "utf8"))
        .split(/\r?\n/)
        .filter((line) => line.startsWith("## "))
        .map((line) => line.slice(3).trim());
      assert.deepEqual(headings, ["Intent", "Scope", "Decisions", "Lessons"]);
    },
  },

  ...SCAFFOLD_ROWS.map(({ type, docs }) => ({
    name: `137/00 digest-template: a ${type} scaffolded through the shipped templates holds ${docs.join(", ")} and no AOF.md`,
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), `aof-137-scaffold-${type}-`));
      try {
        const aofDir = path.join(root, ".aof");
        const workDir = path.join(root, "wiki", "work");
        await mkdir(path.join(workDir, BACKLOG_ROOT), { recursive: true });
        for (const output of renderBundleTemplateOutputs(loadBundle(), { runtimes: ["claude"] })) {
          const target = path.join(root, output.path);
          await mkdir(path.dirname(target), { recursive: true });
          await writeFile(target, output.content, "utf8");
        }
        const { dir } = await scaffoldBacklogDriver({ aofDir, workDir }, { type, slug: "probe", today: "2026-09-23" });
        const held = (await readdir(dir)).sort();
        assert.deepEqual(held, [...docs].sort(), `the scaffolded ${type} holds exactly ${docs.join(", ")}`);
        assert.ok(!held.includes("AOF.md"), "a native scaffold never writes a digest");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  })),
];
