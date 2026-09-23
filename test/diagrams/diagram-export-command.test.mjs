// milestone 133 / story 02 / task 02 — `aof diagram export` writes the SVG first, then the PNG, and
// hands back the block to paste (ADR-004 §3, ADR-005 §4).
//
// Ruling 5: a CLI child cannot spawn a fake browser script on Windows, so every row that reaches the
// PNG step runs `diagram:export` in-process through `invoke`, with the rasterizer's spawn and clock
// injected through the command context. The rows that start no browser (the refusals, the
// missing-renderer row, the SVG-only project) run the REAL CLI, which pins the exit codes.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCommand, invoke, loadWorkspace } from "../../src/command-core.mjs";
import { generatorFor, generatorIds } from "../../src/diagrams/generators.mjs";
import { renderDiagramBlock } from "../../src/diagrams/layout.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");
const ID = generatorIds()[0];
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 7, 7, 7]);
const DIR = "wiki/work/07_milestone_m/diagrams";
const SVG = `${DIR}/ADR-002-generator-seam.svg`;
const PNG_PATH = `${DIR}/ADR-002-generator-seam.png`;
const SOURCE = (title = "Seam") => `<!doctype html><html><body><svg viewBox="0 0 1000 480"><title>${title}</title><rect/></svg></body></html>`;

async function fixture({ diagrams = "on", status = "in-progress", sources = { "ADR-002-generator-seam.html": SOURCE() } } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-diagram-export-"));
  const project = path.join(root, "P");
  const globalHome = path.join(root, "G");
  const browser = path.join(root, "bin", "chrome.exe");
  await mkdir(path.dirname(browser), { recursive: true });
  await writeFile(browser, "stand-in", "utf8");
  await mkdir(globalHome, { recursive: true });
  const block = diagrams === "on" ? { generator: ID, browser } : diagrams === "none" ? undefined : diagrams;
  const config = { name: "fixture", resources: [], work: { dir: "./wiki/work", ...(block === undefined ? {} : { diagrams: block }) } };
  await mkdir(path.join(project, ".aof"), { recursive: true });
  await writeFile(path.join(project, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const milestone = path.join(project, "wiki", "work", "07_milestone_m");
  await mkdir(path.join(milestone, "diagrams"), { recursive: true });
  await writeFile(path.join(milestone, "SPEC.md"), `---\ntype: milestone\nnumber: 07\nslug: m\ntitle: m\nstatus: ${status}\nschema: 1\n---\n# 07 · m\n`, "utf8");
  await writeFile(path.join(milestone, "ARCHITECTURE.md"), "# 07\n\n## ADR-002 — the generator seam\n\nProse.\n", "utf8");
  for (const [name, text] of Object.entries(sources)) await writeFile(path.join(milestone, "diagrams", name), text, "utf8");
  return { root, project, globalHome, browser, milestone };
}

async function withFixture(options, fn) {
  const fx = await fixture(options);
  const previous = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = fx.globalHome;
  try {
    return await fn(fx);
  } finally {
    if (previous === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = previous;
    await rm(fx.root, { recursive: true, force: true });
  }
}

function cli(fx, ...argv) {
  const result = spawnSync(process.execPath, [cliPath, ...argv], {
    cwd: fx.project,
    encoding: "utf8",
    env: { ...process.env, AOF_GLOBAL_HOME: fx.globalHome, NODE_NO_WARNINGS: "1" },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

// A fake browser + clock handed to the rasterizer through the command context.
function rasterizer(behaviour) {
  let clock = 0;
  const acts = [];
  const spawned = [];
  const spawn = (file, args) => {
    const child = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => {};
    const out = args.find((arg) => arg.startsWith("--screenshot=")).slice("--screenshot=".length);
    spawned.push({ file, args });
    behaviour({ child, out, at: (ms, fn) => acts.push({ at: ms, fn, done: false }) });
    return child;
  };
  const sleep = async (ms) => {
    clock += ms;
    for (const act of acts) if (!act.done && act.at <= clock) { act.done = true; act.fn(); }
  };
  return { injected: { spawn, now: () => clock, sleep }, spawned };
}

const WRITES = ({ child, out, at }) => at(0, () => { writeFileSync(out, PNG); child.emit("exit", 0); });
const NEVER_WRITES = ({ child, at }) => at(0, () => child.emit("exit", 0));
const FAILS = ({ child, at }) => at(0, () => { child.stderr.emit("data", "crashed"); child.emit("exit", 1); });

async function exportInProcess(fx, fake) {
  const workspace = await loadWorkspace(fx.project);
  return invoke("diagram:export", { ref: "07", adr: "ADR-002" }, { workspace, diagramRasterizer: fake.injected, env: {} });
}

const exitOf = (result) => getCommand("diagram:export").cli.exit(result);

async function snapshot(dir) {
  const out = [];
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.push(`${path.relative(dir, full)} ${(await stat(full)).size}`);
    }
  };
  await walk(dir);
  return out.sort();
}

const BLOCK = (formats) => renderDiagramBlock({ adrId: "ADR-002", title: "the generator seam", stem: "ADR-002-generator-seam", sourceExt: ".html", formats });

export const diagramExportCommandTests = [
  {
    name: "133/02 task 02: the happy path writes both exports and returns the block",
    run: async () => {
      await withFixture({}, async (fx) => {
        const architecture = await readFile(path.join(fx.milestone, "ARCHITECTURE.md"));
        const fake = rasterizer(WRITES);
        const result = await exportInProcess(fx, fake);
        assert.equal(exitOf(result), 0, "it exits 0");
        const svgText = await readFile(path.join(fx.project, SVG), "utf8");
        assert.equal(svgText, generatorFor(ID).toSvg(SOURCE()));
        assert.ok(statSync(path.join(fx.project, PNG_PATH)).size > 0);
        assert.deepEqual(result.written, [SVG, PNG_PATH]);
        assert.equal(result.block, BLOCK(["svg", "png"]));
        assert.deepEqual(await readFile(path.join(fx.milestone, "ARCHITECTURE.md")), architecture, "ARCHITECTURE.md is byte-identical");
        assert.equal(fake.spawned[0].file, fx.browser, "the configured browser rendered it");
        assert.ok(fake.spawned[0].args.at(-1).endsWith("ADR-002-generator-seam.svg"), "the committed SVG, not the HTML");
      });
    },
  },
  {
    name: "133/02 task 02: an SVG-only project writes no PNG and starts no browser",
    run: async () => {
      await withFixture({ diagrams: { generator: ID, formats: ["svg"], browser: path.join(os.tmpdir(), "no-such-browser.exe") } }, async (fx) => {
        const result = cli(fx, "diagram", "export", "07", "ADR-002", "--json");
        assert.equal(result.status, 0, result.stderr);
        const envelope = JSON.parse(result.stdout);
        assert.deepEqual(envelope.written, [SVG]);
        assert.equal(existsSync(path.join(fx.project, PNG_PATH)), false);
        assert.equal(envelope.block.includes("· PNG:"), false);
        assert.equal("png" in envelope, false, "no browser step was taken (a missing browser would have answered)");
      });
    },
  },
  {
    name: "133/02 task 02: a PNG miss keeps the SVG and says what is missing — renderer missing (real CLI)",
    run: async () => {
      await withFixture({ diagrams: { generator: ID, browser: path.join(os.tmpdir(), "no-such-browser.exe") } }, async (fx) => {
        const result = cli(fx, "diagram", "export", "07", "ADR-002", "--json");
        assert.notEqual(result.status, 0, "exits non-zero");
        const envelope = JSON.parse(result.stdout);
        assert.ok(existsSync(path.join(fx.project, SVG)));
        assert.equal(existsSync(path.join(fx.project, PNG_PATH)), false);
        assert.deepEqual(envelope.written, [SVG]);
        assert.equal(envelope.block, BLOCK(["svg", "png"]));
        assert.equal(envelope.png.code, "diagram-png-renderer-missing");
      });
    },
  },
  {
    name: "133/02 task 02: a PNG miss keeps the SVG and says what is missing — timeout and render failure",
    run: async () => {
      for (const [behaviour, code] of [[NEVER_WRITES, "diagram-png-render-timeout"], [FAILS, "diagram-png-render-failed"]]) {
        await withFixture({}, async (fx) => {
          const result = await exportInProcess(fx, rasterizer(behaviour));
          assert.notEqual(exitOf(result), 0, `${code}: exits non-zero`);
          assert.ok(existsSync(path.join(fx.project, SVG)));
          assert.equal(existsSync(path.join(fx.project, PNG_PATH)), false);
          assert.deepEqual(result.written, [SVG]);
          assert.equal(result.block, BLOCK(["svg", "png"]));
          assert.equal(result.png.code, code);
        });
      }
    },
  },
  {
    name: "133/02 task 02: a coded refusal writes nothing",
    run: async () => {
      const rows = [
        [{ diagrams: "none" }, "07", "diagram-disabled"],
        [{ diagrams: { generator: "off" } }, "07", "diagram-disabled"],
        [{}, "99", "ref-not-found"],
        [{ sources: { "ADR-003-other.html": SOURCE() } }, "07", "diagram-source-missing"],
        [{ sources: { "ADR-002-a.html": SOURCE(), "ADR-002-b.html": SOURCE() } }, "07", "diagram-source-ambiguous"],
        [{ sources: { "ADR-002-generator-seam.html": "<p>no picture</p>" } }, "07", "diagram-source-no-svg"],
        [{ sources: { "ADR-002-generator-seam.html": "<svg width=\"1\"><rect/></svg>" } }, "07", "diagram-svg-no-viewbox"],
        [{ status: "done" }, "07", "diagram-item-delivered"],
      ];
      for (const [options, ref, code] of rows) {
        await withFixture(options, async (fx) => {
          const before = await snapshot(fx.project);
          const result = cli(fx, "diagram", "export", ref, "ADR-002", "--json");
          assert.notEqual(result.status, 0, `${code}: exits non-zero`);
          assert.equal(JSON.parse(result.stdout).code, code);
          assert.deepEqual(await snapshot(fx.project), before, `${code}: no .svg or .png was written`);
        });
      }
    },
  },
  {
    name: "133/02 task 02: an ambiguous source names every candidate",
    run: async () => {
      await withFixture({ sources: { "ADR-002-a.html": SOURCE(), "ADR-002-b.html": SOURCE() } }, async (fx) => {
        const envelope = JSON.parse(cli(fx, "diagram", "export", "07", "ADR-002", "--json").stdout);
        assert.equal(envelope.code, "diagram-source-ambiguous");
        assert.ok(envelope.error.includes("ADR-002-a.html") && envelope.error.includes("ADR-002-b.html"));
      });
    },
  },
  {
    name: "133/02 task 02: re-exporting an open item overwrites both exports",
    run: async () => {
      await withFixture({}, async (fx) => {
        await exportInProcess(fx, rasterizer(WRITES));
        const png = path.join(fx.project, PNG_PATH);
        const old = new Date(Date.now() - 60_000);
        await utimes(png, old, old);
        await writeFile(path.join(fx.milestone, "diagrams", "ADR-002-generator-seam.html"), SOURCE("Seam, redrawn"), "utf8");
        await exportInProcess(fx, rasterizer(WRITES));
        assert.ok((await readFile(path.join(fx.project, SVG), "utf8")).includes("<title>Seam, redrawn</title>"));
        assert.ok(statSync(png).mtimeMs > old.getTime(), "the PNG was rewritten");
      });
    },
  },
  {
    name: "133/02 task 02: the human face prints the block ready to paste",
    run: async () => {
      await withFixture({ diagrams: { generator: ID, formats: ["svg"] } }, async (fx) => {
        const result = cli(fx, "diagram", "export", "07", "ADR-002");
        assert.equal(result.status, 0, result.stderr);
        assert.ok(result.stdout.includes(SVG), "names each written file");
        assert.ok(result.stdout.trimEnd().endsWith(BLOCK(["svg"])), "ends with the block, verbatim");
      });
    },
  },
];
