// Traceability wiring for story 137 / tasks/02_validate-holds-a-digest-to-the-template.feature —
// "validate holds an AOF.md record doc to the template" (@executable).
//
// Every row runs the REAL `validateWork` over a throwaway stream holding one milestone folder
// whose record doc is an AOF.md, and compares the findings anchored at that doc EXACTLY — so a
// row that expects one finding also proves no second one rode along. The last scenario parses
// the shipped template independently here and compares it with what the contract module exposes.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateWork } from "../../../src/work.mjs";
import { digestContract } from "../../../src/work/digest-template.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const TEMPLATE = path.join(repoRoot, "src", "bundle", "templates", "milestone", "AOF.md");
const CONFIG = { work: {} };
const ORDER = "Intent, Scope, Decisions, Lessons";

const CONFORMING = [
  ["doc", "digest"],
  ["milestone", "00"],
  ["slug", "foundation"],
  ["title", '"Foundation"'],
  ["status", "done"],
  ["imported", "true"],
  ["importedBy", "aof"],
  ["source", "legacy"],
  ["importedAt", "2026-09-23"],
  ["schema", "1"],
  ["aofVersion", "0.1.0"],
];

const without = (...names) => CONFORMING.filter(([key]) => !names.includes(key));
const plus = (key, value) => [...CONFORMING, [key, value]];

function digestText(pairs, sections) {
  const frontmatter = pairs.map(([key, value]) => `${key}: ${value}`).join("\n");
  const body = sections.map((name) => `## ${name}\n\nRecovered ${name.toLowerCase()}.\n`).join("\n");
  return `---\n${frontmatter}\n---\n# 00 · Foundation — Digest\n\n${body}`;
}

// The problems validate anchors at the digest, in emission order.
async function findingsFor(text) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-137-validate-"));
  try {
    const work = path.join(root, "work");
    const dir = path.join(work, "00_milestone_foundation");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "AOF.md"), text, "utf8");
    const findings = await validateWork(work, CONFIG);
    return findings
      .filter((finding) => finding.path.replaceAll("\\", "/").endsWith("00_milestone_foundation/AOF.md"))
      .map((finding) => finding.problem);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const missing = (key) => `digest frontmatter is missing "${key}" (the AOF.md template requires it)`;
const unknown = (key) => `digest frontmatter key "${key}" is not in the AOF.md template`;

const FRONTMATTER_ROWS = [
  { change: "without `title`", pairs: without("title"), finding: [missing("title")] },
  { change: "without `importedBy`", pairs: without("importedBy"), finding: [missing("importedBy")] },
  { change: "without `imported`", pairs: without("imported"), finding: [missing("imported")] },
  { change: "plus `owner: product-owner`", pairs: plus("owner", "product-owner"), finding: [unknown("owner")] },
  { change: "plus `type: milestone`", pairs: plus("type", "milestone"), finding: [unknown("type")] },
  { change: "without `source`", pairs: without("source"), finding: [] },
  { change: "without `importedAt`", pairs: without("importedAt"), finding: [] },
  { change: "without `source` or `importedAt`", pairs: without("source", "importedAt"), finding: [] },
];

const SECTION_ROWS = [
  { sections: ["Intent", "Notes"], finding: [`digest section "Notes" is not in the AOF.md template (${ORDER})`] },
  { sections: ["Scope", "Intent"], finding: [`digest section "Intent" is out of the AOF.md template's order (${ORDER})`] },
  { sections: ["Intent", "Intent"], finding: ['digest section "Intent" appears more than once'] },
  { sections: ["Lessons"], finding: [] },
  { sections: ["Intent", "Decisions", "Lessons"], finding: [] },
  { sections: [], finding: [] },
];

const PRIOR_SHAPES = [
  { shape: "an import that stamped `source` and `importedAt` (the archived milestone 42 digest's keys)", pairs: CONFORMING },
  { shape: "an import that predates `source` (`importedAt`, `schema`, `aofVersion`, no `source`)", pairs: without("source") },
];

export const workValidateDigestTemplateTests = [
  {
    name: "137/02 validate-digest: a conforming digest validates clean",
    run: async () => assert.deepEqual(await findingsFor(digestText(CONFORMING, ["Intent", "Scope"])), []),
  },

  ...FRONTMATTER_ROWS.map(({ change, pairs, finding }) => ({
    name: `137/02 validate-digest: CONFORMING ${change} → ${finding.length ? finding[0] : "no finding"}`,
    run: async () => assert.deepEqual(await findingsFor(digestText(pairs, ["Intent", "Scope"])), finding),
  })),

  ...SECTION_ROWS.map(({ sections, finding }) => ({
    name: `137/02 validate-digest: sections [${sections.join(", ") || "none"}] → ${finding.length ? finding[0] : "no finding"}`,
    run: async () => assert.deepEqual(await findingsFor(digestText(CONFORMING, sections)), finding),
  })),

  ...PRIOR_SHAPES.map(({ shape, pairs }) => ({
    name: `137/02 validate-digest: ${shape} stays green`,
    run: async () => assert.deepEqual(await findingsFor(digestText(pairs, ["Intent", "Scope"])), []),
  })),

  {
    name: "137/02 validate-digest: the enforced key and section sets are the template's, and a native SPEC.md is held to none of them",
    run: async () => {
      const lines = (await readFile(TEMPLATE, "utf8")).split(/\r?\n/);
      const keyLines = lines.slice(1, lines.indexOf("---", 1)).filter((line) => /^[A-Za-z0-9_-]+:/.test(line));
      const isOmit = (line) => /\bOMIT\b/.test(line.match(/\s+#.*$/)?.[0] ?? "");
      const name = (line) => line.split(":")[0];
      const contract = digestContract();
      assert.deepEqual([...contract.requiredKeys], keyLines.filter((line) => !isOmit(line)).map(name));
      assert.deepEqual([...contract.optionalKeys], keyLines.filter(isOmit).map(name));
      assert.deepEqual(
        [...contract.sections],
        lines.filter((line) => line.startsWith("## ")).map((line) => line.slice(3).trim()),
      );

      // A native milestone carrying a key and a section the digest template would refuse.
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-137-native-"));
      try {
        const work = path.join(root, "work");
        const dir = path.join(work, "00_milestone_foundation");
        await mkdir(dir, { recursive: true });
        await writeFile(
          path.join(dir, "SPEC.md"),
          "---\ntype: milestone\nnumber: 00\nslug: foundation\nstatus: done\nowner: product-owner\ncreated: 2026-01-01\nupdated: 2026-01-02\nschema: 1\n---\n# 00 · Foundation\n\n## Objective\n\nNative.\n",
          "utf8",
        );
        const findings = await validateWork(work, CONFIG);
        assert.deepEqual(findings.filter((finding) => /^digest /.test(finding.problem)), [], `no digest rule reaches a native SPEC.md: ${JSON.stringify(findings)}`);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
];
