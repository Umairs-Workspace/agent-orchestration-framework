// Traceability: 69/00/tasks/02_registry-declares-the-ceiling.feature.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_REVIEW_ROUNDS } from "../../src/loop-bounds.mjs";
import { initWork } from "../../src/work/init.mjs";
import { loadLoops } from "../../src/work/loops.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const bundleAof = path.join(root, "src", "bundle");

function record(stem, ceiling) {
  return `---\nid: loop:${stem}\nkind: loop\ntitle: ${stem}\ncontrolled: state\nreference: [prose:README.md]\nmeasurement: [prose:README.md]\nactuator: [prose:README.md]\ncadence: event:per-item\nceiling: ${ceiling}\nowner: unknown\noptimizing: false\n---\n# ${stem}\n`;
}

async function withRecord(ceiling, run, setup = null) {
  const temp = await mkdtemp(path.join(os.tmpdir(), "aof-resolved-ceiling-"));
  try {
    await mkdir(path.join(temp, "loops"));
    if (setup) await setup(temp);
    await writeFile(path.join(temp, "loops", "subject.md"), record("subject", ceiling));
    return await run(await loadLoops(temp));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

const grammarRows = [
  ["none", "none", true, null],
  ["a config pointer that resolves", "[config:work.loop.reviewRounds]", true, null],
  // 129/01/tasks/00_the-mode-has-one-home.feature — Scenario: the registry loader accepts the key
  // as a ceiling pointer. The mode joined `LOOP_BOUND_CONFIG_RESOLVERS`, so `resolvesLoopBoundConfigKey`
  // admits it here exactly as it admits `reviewRounds` one row up; the number it does NOT carry
  // is the projection's business (`loop-record-projection.test.mjs`), never the loader's.
  ["the concurrency mode as a config pointer (129/01)", "[config:work.loop.concurrency]", true, null],
  ["a module pointer that resolves", "[module:src/loop-bounds.mjs#resolveReviewRounds]", true, null],
  ["uncapped", "uncapped", false, "loop-ceiling-uncapped"],
  ["unknown", "unknown", false, "loop-ceiling-unknown"],
  ["a config pointer that resolves to nothing", "[config:work.loop.noSuchBound]", false, "loop-ceiling-pointer-unresolved"],
];

export const workLoopsResolvedCeilingsTests = [
  {
    name: "69/00 registry/02 no framework loop record declares an uncapped ceiling",
    async run() {
      const model = await loadLoops(bundleAof);
      assert.ok(model.nodes.filter((node) => node.kind === "loop").length > 0);
      assert.equal(model.nodes.some((node) => node.fields.ceiling?.some?.((entry) => entry.kind === "uncapped")), false);
      assert.equal(model.findings.some((finding) => finding.code === "loop-ceiling-uncapped"), false);
    },
  },
  {
    name: "69/00 registry/02 build-to-green points at failure-to-progress rather than a numeric iteration count",
    async run() {
      const model = await loadLoops(bundleAof);
      const node = model.nodes.find((entry) => entry.id === "loop:build-to-green");
      assert.deepEqual(node.fields.ceiling.map((entry) => entry.raw), ["config:work.loop.buildNoProgressRounds"]);
      const source = await readFile(path.join(root, "src", "bundle", "loops", "build-to-green.md"), "utf8");
      const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1] ?? "";
      assert.doesNotMatch(frontmatter.match(/^ceiling:.*$/mu)?.[0] ?? "", /\d/u);
    },
  },
  {
    name: "69/00 registry/02 review loop points at configured rounds and the number lives in the config authority",
    async run() {
      const model = await loadLoops(bundleAof);
      const node = model.nodes.find((entry) => entry.id === "loop:review-fix-rereview");
      assert.deepEqual(node.fields.ceiling.map((entry) => entry.raw), ["config:work.loop.reviewRounds"]);
      assert.equal(DEFAULT_REVIEW_ROUNDS, 1);
      const recordSource = await readFile(path.join(root, "src", "bundle", "loops", "review-fix-rereview.md"), "utf8");
      assert.doesNotMatch(recordSource.match(/^ceiling:.*$/mu)?.[0] ?? "", /\b1\b/u);
    },
  },
  {
    name: "69/00 registry/02 unresolved config ceiling is refused and the finding names its pointer",
    run: () => withRecord("[config:work.loop.absent]", async (model) => {
      const finding = model.findings.find((entry) => entry.code === "loop-ceiling-pointer-unresolved");
      assert.equal(finding.severity, "error");
      assert.match(finding.message, /config:work\.loop\.absent/u);
    }),
  },
  {
    name: "69/00 registry/02 module ceiling requires an existing module path",
    run: () => withRecord("[module:src/missing.mjs#authority]", async (model) => {
      const finding = model.findings.find((entry) => entry.code === "loop-ceiling-pointer-unresolved");
      assert.match(finding.message, /module:src\/missing\.mjs#authority/u);
    }),
  },
  {
    name: "69/00 registry/02 module ceiling requires the named exported symbol",
    run: () => withRecord("[module:src/authority.mjs#missing]", async (model) => {
      const finding = model.findings.find((entry) => entry.code === "loop-ceiling-pointer-unresolved");
      assert.match(finding.message, /module:src\/authority\.mjs#missing/u);
    }, async (temp) => {
      await mkdir(path.join(temp, "src"));
      await writeFile(path.join(temp, "src", "authority.mjs"), "export const present = 1;\n");
    }),
  },
  {
    name: "69/00 registry/02 module ceiling accepts an existing exported symbol through the production loader",
    run: () => withRecord("[module:src/authority.mjs#authority]", async (model) => {
      assert.equal(model.findings.some((entry) => entry.code === "loop-ceiling-pointer-unresolved"), false);
    }, async (temp) => {
      await mkdir(path.join(temp, "src"));
      await writeFile(path.join(temp, "src", "authority.mjs"), "const implementation = 1;\nexport { implementation as authority };\n");
    }),
  },
  ...grammarRows.map(([label, ceiling, declared, findingCode]) => ({
    name: `69/00 registry/02 ceiling grammar row — ${label}`,
    run: () => withRecord(ceiling, async (model) => {
      if (label === "a module pointer that resolves") {
        assert.equal(model.findings.some((entry) => entry.code === "loop-ceiling-pointer-unresolved"), false);
      }
      // The record PARSED with this ceiling (m77/R8): a record the loader dropped would also carry
      // no `loop-ceiling*` finding, and that is the wrong reason for a `declared` row to be green.
      assert.ok(model.nodes.some((node) => node.id === "loop:subject"), `guard: the record parsed — ${ceiling}`);
      const relevant = model.findings.filter((entry) => entry.code.startsWith("loop-ceiling"));
      assert.equal(relevant.length === 0, declared);
      if (findingCode !== null) assert.ok(relevant.some((entry) => entry.code === findingCode));
    }, label === "a module pointer that resolves" ? async (temp) => {
      await mkdir(path.join(temp, "src"));
      await writeFile(path.join(temp, "src", "loop-bounds.mjs"), "export const resolveReviewRounds = (value) => value;\n");
    } : null),
  })),
  {
    name: "69/00 registry/02 fresh install inherits resolved ceilings and project records face the same rule",
    async run() {
      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-resolved-install-"));
      try {
        await initWork({ targetDir: temp, runtimes: ["claude", "codex"] });
        const clean = await loadLoops(path.join(temp, ".aof"));
        assert.equal(clean.findings.some((entry) => entry.code === "loop-ceiling-uncapped"), false);
        assert.equal(clean.findings.some((entry) => entry.code === "loop-ceiling-pointer-unresolved"), false);
        await writeFile(path.join(temp, ".aof", "loops", "project-loop.md"), record("project-loop", "[config:project.noResolver]"));
        const authored = await loadLoops(path.join(temp, ".aof"));
        assert.ok(authored.findings.some((entry) => entry.path.endsWith("project-loop.md") && entry.code === "loop-ceiling-pointer-unresolved"));
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    },
  },
];
