// milestone 133 / story 01 / task 03 — `aof diagram plan` answers from config whether to draw,
// where, and how (ADR-004 §2). Driven through the REAL CLI against a fixture project, with
// `AOF_GLOBAL_HOME` and a fixture home (`HOME` + `USERPROFILE`) in fresh temp directories, and every
// exit code read unpiped from the child.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatorIds } from "@aof/diagrams/generators";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const ID = generatorIds()[0];

const ARCHITECTURE = [
  "# 07 · Architecture",
  "",
  "## ADR-001 — no diagram",
  "",
  "Prose only.",
  "",
  "## ADR-002 — seam",
  "",
  "### Decision",
  "",
  "A seam.",
  "",
  "### Diagram",
  "",
  "Draw the seam.",
  "",
].join("\n");

async function fixture({ diagrams, style = false, status = "in-progress", registry = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-diagram-plan-"));
  const project = path.join(root, "P");
  const home = path.join(root, "H");
  const globalHome = path.join(root, "G");
  const work = path.join(project, "wiki", "work");
  await mkdir(path.join(project, ".aof"), { recursive: true });
  await mkdir(home, { recursive: true });
  await mkdir(globalHome, { recursive: true });
  const config = { name: "fixture", resources: [], work: { dir: "./wiki/work", ...(diagrams === undefined ? {} : { diagrams }) } };
  await writeFile(path.join(project, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const milestone = path.join(work, "07_milestone_m");
  await mkdir(milestone, { recursive: true });
  await writeFile(
    path.join(milestone, "SPEC.md"),
    `---\ntype: milestone\nnumber: 07\nslug: m\ntitle: m\nstatus: ${status}\nschema: 1\n---\n# 07 · m\n`,
    "utf8",
  );
  await writeFile(path.join(milestone, "ARCHITECTURE.md"), ARCHITECTURE, "utf8");
  const second = path.join(work, "08_milestone_n");
  await mkdir(second, { recursive: true });
  await writeFile(
    path.join(second, "SPEC.md"),
    "---\ntype: milestone\nnumber: 08\nslug: n\ntitle: n\nstatus: not-started\nschema: 1\n---\n# 08 · n\n",
    "utf8",
  );
  if (style) {
    await mkdir(path.join(project, ".aof", "diagrams"), { recursive: true });
    await writeFile(path.join(project, ".aof", "diagrams", "style.md"), "# style\n", "utf8");
  }
  let skill = null;
  if (registry) {
    const install = path.join(home, "cache", "install");
    skill = path.join(install, "skills", ID, "SKILL.md");
    await mkdir(path.dirname(skill), { recursive: true });
    await writeFile(skill, "# skill\n", "utf8");
    await mkdir(path.join(home, ".claude", "plugins"), { recursive: true });
    await writeFile(
      path.join(home, ".claude", "plugins", "installed_plugins.json"),
      JSON.stringify({ version: 2, plugins: { [`${ID}@${ID}`]: [{ scope: "project", installPath: install, lastUpdated: "2026-09-01T00:00:00Z" }] } }),
      "utf8",
    );
  }
  return { root, project, home, globalHome, skill };
}

function aof(fx, ...argv) {
  const result = spawnSync(process.execPath, [cliPath, ...argv], {
    cwd: fx.project,
    encoding: "utf8",
    env: { ...process.env, AOF_GLOBAL_HOME: fx.globalHome, HOME: fx.home, USERPROFILE: fx.home, NODE_NO_WARNINGS: "1" },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function json(result) {
  return JSON.parse(result.stdout);
}

// The project's files with their sizes — "nothing was written under P" compares two of these.
async function snapshot(dir) {
  const out = [];
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        out.push(`${path.relative(dir, full)}/`);
        await walk(full);
      } else {
        out.push(`${path.relative(dir, full)} ${(await stat(full)).size}`);
      }
    }
  };
  await walk(dir);
  return out.sort();
}

async function withFixture(options, fn) {
  const fx = await fixture(options);
  try {
    return await fn(fx);
  } finally {
    await rm(fx.root, { recursive: true, force: true });
  }
}

const ON = { generator: ID, style: ".aof/diagrams/style.md" };

export const diagramPlanCommandTests = [
  {
    name: "133/01 task 03: off is an answer, not a failure — absent and generator off",
    run: async () => {
      await withFixture({}, async (fx) => {
        const result = aof(fx, "diagram", "plan", "07", "ADR-002", "--slug", "generator-seam", "--json");
        assert.equal(result.status, 0, result.stderr);
        const envelope = json(result);
        assert.deepEqual(Object.keys(envelope).sort(), ["enabled", "reason"]);
        assert.equal(envelope.enabled, false);
        assert.match(envelope.reason, /work\.diagrams is unset/);
      });
      await withFixture({ diagrams: { generator: "off" } }, async (fx) => {
        const result = aof(fx, "diagram", "plan", "07", "ADR-002", "--slug", "generator-seam", "--json");
        assert.equal(result.status, 0, result.stderr);
        const envelope = json(result);
        assert.deepEqual(Object.keys(envelope).sort(), ["enabled", "reason"]);
        assert.equal(envelope.enabled, false);
        assert.match(envelope.reason, /work\.diagrams\.generator is "off"/);
      });
    },
  },
  {
    name: "133/01 task 03: off answers before any ADR check",
    run: async () => {
      await withFixture({}, async (fx) => {
        const result = aof(fx, "diagram", "plan", "07", "ADR-099", "--slug", "x", "--json");
        assert.equal(result.status, 0, result.stderr);
        assert.equal(json(result).enabled, false);
      });
    },
  },
  {
    name: "133/01 task 03: a missing generator is an answer the prose acts on",
    run: async () => {
      await withFixture({ diagrams: { generator: ID }, registry: false }, async (fx) => {
        const result = aof(fx, "diagram", "plan", "07", "ADR-002", "--slug", "generator-seam", "--json");
        assert.equal(result.status, 0, result.stderr);
        const envelope = json(result);
        assert.equal(envelope.enabled, true);
        assert.equal(envelope.available, false);
        assert.equal(envelope.code, "diagram-generator-missing");
        assert.ok(typeof envelope.fix === "string" && envelope.fix.length > 0);
      });
    },
  },
  {
    name: "133/01 task 03: the plan says where and how, and writes nothing",
    run: async () => {
      await withFixture({ diagrams: ON, style: true }, async (fx) => {
        const before = await snapshot(fx.project);
        const result = aof(fx, "diagram", "plan", "07", "ADR-002", "--slug", "generator-seam", "--json");
        assert.equal(result.status, 0, result.stderr);
        const envelope = json(result);
        assert.equal(envelope.enabled, true);
        assert.equal(envelope.available, true);
        assert.equal(envelope.generator, ID);
        assert.equal(envelope.item, "07");
        assert.equal(envelope.adr, "ADR-002");
        assert.equal(envelope.stem, "ADR-002-generator-seam");
        const dir = "wiki/work/07_milestone_m/diagrams";
        assert.deepEqual(envelope.paths, {
          dir,
          source: `${dir}/ADR-002-generator-seam.html`,
          svg: `${dir}/ADR-002-generator-seam.svg`,
          png: `${dir}/ADR-002-generator-seam.png`,
        });
        assert.equal(envelope.brief, "Draw the seam.");
        const realProject = realpathSync.native(fx.project);
        const inProject = (rel) => [path.join(fx.project, rel), path.join(realProject, rel)];
        assert.ok(inProject(envelope.paths.source).some((abs) => envelope.instructions.includes(abs)), "the absolute source path");
        assert.ok(inProject(path.join(".aof", "diagrams", "style.md")).some((abs) => envelope.instructions.includes(abs)), "the absolute style path");
        assert.deepEqual(await snapshot(fx.project), before, "a recursive listing of P is unchanged");
      });
    },
  },
  {
    name: "133/01 task 03: the human face prints the same decision",
    run: async () => {
      await withFixture({ diagrams: ON, style: true }, async (fx) => {
        const result = aof(fx, "diagram", "plan", "07", "ADR-002", "--slug", "generator-seam");
        assert.equal(result.status, 0, result.stderr);
        assert.ok(result.stdout.includes("ADR-002-generator-seam"), "the stem");
        assert.ok(result.stdout.includes("wiki/work/07_milestone_m/diagrams/ADR-002-generator-seam.html"), "the source path");
        assert.ok(result.stdout.includes(ID), "the generator");
        assert.ok(result.stdout.includes("Draw exactly one static diagram"), "the instructions text");
      });
    },
  },
  {
    name: "133/01 task 03: a malformed request is a coded refusal with a non-zero exit, and nothing is written",
    run: async () => {
      const rows = [
        [{ style: true }, "99", "ADR-002", "generator-seam", "ref-not-found"],
        [{ style: true }, "07", "ADR-2", "generator-seam", "diagram-adr-invalid"],
        [{ style: true }, "07", "ADR-005", "generator-seam", "diagram-adr-unknown"],
        [{ style: true }, "07", "ADR-001", "no-diagram", "diagram-brief-missing"],
        [{ style: true }, "07", "ADR-002", "Seam", "diagram-slug-invalid"],
        [{ style: true, status: "done" }, "07", "ADR-002", "generator-seam", "diagram-item-delivered"],
        [{ style: false }, "07", "ADR-002", "generator-seam", "diagram-style-missing"],
      ];
      for (const [state, ref, adr, slug, code] of rows) {
        await withFixture({ diagrams: ON, ...state }, async (fx) => {
          const before = await snapshot(fx.project);
          const result = aof(fx, "diagram", "plan", ref, adr, "--slug", slug, "--json");
          assert.notEqual(result.status, 0, `${code}: exits non-zero`);
          assert.equal(json(result).code, code, `${ref} ${adr} ${slug}`);
          assert.deepEqual(await snapshot(fx.project), before, `${code}: nothing written under P`);
        });
      }
    },
  },
  {
    name: "133/01 task 03: an item with no ARCHITECTURE.md has no ADR to draw",
    run: async () => {
      await withFixture({ diagrams: { generator: ID } }, async (fx) => {
        const result = aof(fx, "diagram", "plan", "08", "ADR-001", "--slug", "x", "--json");
        assert.notEqual(result.status, 0);
        assert.equal(json(result).code, "diagram-adr-unknown");
      });
    },
  },
  {
    name: "133/01 task 03: the family is reachable and says what it holds",
    run: async () => {
      await withFixture({}, async (fx) => {
        for (const argv of [["diagram"], ["diagram", "draw"]]) {
          const result = aof(fx, ...argv);
          assert.notEqual(result.status, 0, `${argv.join(" ")} exits non-zero`);
          assert.ok(result.stderr.includes("aof diagram plan"), `${argv.join(" ")} names plan`);
          assert.ok(result.stderr.includes("aof diagram export"), `${argv.join(" ")} names export`);
        }
      });
    },
  },
  // ── milestone 168 / story 02 task 00 — a prototype's diagram: its subject is its name ─────────
  {
    name: "168/02 E1 · a named brief plans into the prototype's diagrams folder",
    run: async () => {
      await withFixture({ diagrams: ON, style: true }, async (fx) => {
        await addPrototype(fx);
        const result = aof(fx, "diagram", "plan", "169", "data-flow", "--json");
        assert.equal(result.status, 0, result.stderr);
        const envelope = json(result);
        assert.deepEqual([envelope.available, envelope.name, envelope.stem, envelope.brief], [true, "data-flow", "data-flow", "statement rows flow into the ledger"]);
        const dir = "wiki/work/169_prototype_csv-importer/diagrams";
        assert.deepEqual(envelope.paths, { dir, source: `${dir}/data-flow.html`, svg: `${dir}/data-flow.svg`, png: `${dir}/data-flow.png` });
      });
    },
  },
  ...[
    ["E2", ["screens"], "diagram-name-unknown", "### screens"],
    ["E3", ["ADR-001"], "diagram-slug-invalid", "lowercase"],
    ["", ["empty"], "diagram-brief-missing", "### empty"],
    ["", ["data-flow", "--slug", "other"], "diagram-slug-not-applicable", "--slug"],
  ].map(([example, args, code, named]) => ({
    name: `168/02 ${example} plan ${args.join(" ")} on a prototype is refused as ${code}`,
    run: async () => {
      await withFixture({ diagrams: ON, style: true }, async (fx) => {
        await addPrototype(fx);
        const before = await snapshot(fx.project);
        const result = aof(fx, "diagram", "plan", "169", ...args, "--json");
        assert.notEqual(result.status, 0);
        const envelope = json(result);
        assert.equal(envelope.code, code, result.stdout);
        assert.ok(envelope.error.includes(named), `the refusal names ${named}: ${envelope.error}`);
        assert.deepEqual(await snapshot(fx.project), before, "nothing was written");
      });
    },
  })),
  {
    name: "168/02 E4 · the ADR path on a milestone is unchanged beside a prototype",
    run: async () => {
      await withFixture({ diagrams: ON, style: true }, async (fx) => {
        await addPrototype(fx);
        const envelope = json(aof(fx, "diagram", "plan", "07", "ADR-002", "--slug", "layout", "--json"));
        assert.equal(envelope.stem, "ADR-002-layout");
        assert.equal(envelope.paths.source, "wiki/work/07_milestone_m/diagrams/ADR-002-layout.html");
      });
    },
  },
  ...["active", "done"].map((status) => ({
    name: `168/02 E8 · a drawn prototype diagram plans again at "${status}"`,
    run: async () => {
      await withFixture({ diagrams: ON, style: true }, async (fx) => {
        const dir = await addPrototype(fx, status);
        await mkdir(path.join(dir, "diagrams"), { recursive: true });
        await writeFile(path.join(dir, "diagrams", "data-flow.svg"), "<svg/>", "utf8");
        const result = aof(fx, "diagram", "plan", "169", "data-flow", "--json");
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual([json(result).available, json(result).brief], [true, "statement rows flow into the ledger"]);
      });
    },
  })),
];

// A prototype in the fixture's work tree, its `## Diagrams` holding a `data-flow` brief and an empty
// `empty` heading (168/02's Background).
async function addPrototype(fx, status = "active") {
  const dir = path.join(fx.project, "wiki", "work", "169_prototype_csv-importer");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "PROTOTYPE.md"),
    `---\ntype: prototype\nnumber: 169\nslug: csv-importer\ntitle: csv importer\nstatus: ${status}\nschema: 1\n---\n# 169 · csv importer\n\n## Intent\n\nImport a CSV.\n\n## Diagrams\n\n### data-flow\n\nstatement rows flow into the ledger\n\n### empty\n`,
    "utf8",
  );
  return dir;
}

