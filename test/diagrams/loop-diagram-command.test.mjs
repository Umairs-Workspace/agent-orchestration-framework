import { defaultApplication as _aofApplication } from "aof/default-application";
// 145 / tasks 01-03 — the loop diagram through the one diagram engine. `aof diagram plan <ref> loop`
// writes the wave plan to `execution/loop-plan.json` and answers the generator's drawing
// instructions (or why not); `aof diagram export <ref> loop` writes the drawn source's SVG and PNG;
// `/aof:loop-diagram` is the bundle command the operator types.
//
// Driven through the REAL CLI against a fixture project, with `AOF_GLOBAL_HOME` and a fixture home
// in fresh temporary directories and every exit code read unpiped. The rows that reach the PNG step
// run `diagram:export` in-process with a fake browser, as 133's export suite does (its ruling 5: a
// CLI child cannot spawn a fake browser script on Windows).
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatorFor, generatorIds } from "../../packages/core/src/diagrams/generators.mjs";
import { renderDiagramBlock } from "@aof/work/diagrams/layout";
import { planLoopWaves } from "@aof/work/ready-wave";
const getCommand = _aofApplication.getCommand;
const invoke = _aofApplication.invoke;
const loadWorkspace = _aofApplication.loadWorkspace;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const ID = generatorIds()[0];
const MILESTONE = "wiki/work/07_milestone_m";
const EXECUTION = `${MILESTONE}/execution`;
const PLAN = `${EXECUTION}/loop-plan.json`;
const SOURCE_PATH = `${EXECUTION}/loop.html`;
const SVG = `${EXECUTION}/loop.svg`;
const PNG_PATH = `${EXECUTION}/loop.png`;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 7, 7, 7]);
const DRAWN = '<!doctype html><html><body><svg viewBox="0 0 1200 600"><title>Loop</title><rect/></svg></body></html>';
const ARCHITECTURE = "# 07\n\n## ADR-002 — seam\n\n### Diagram\n\nDraw the seam.\n";

const story = ({ number, status = "not-started", files = null, depends = null }) => [
  "---", "type: story", `number: ${number}`, `slug: s${number}`, `title: s${number}`, `status: ${status}`, "schema: 1",
  ...(files == null ? [] : [`files: ${files}`]),
  ...(depends == null ? [] : [`depends: ${depends}`]),
  "---", `# ${number}`, "",
].join("\n");

// `diagrams`: "on" (the generator, a stand-in browser), "none" (unset) or a literal block.
// `loop`: the `work.loop` block, or null for unset. `stories`: number → story options plus
// `tasks: false` for a story with no task. `registry: false` leaves the generator uninstalled.
async function fixture({ diagrams = "on", loop = { concurrency: "refine_first" }, milestoneStatus = "in-progress", stories, registry = true, others = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-loop-diagram-"));
  const project = path.join(root, "P");
  const home = path.join(root, "H");
  const globalHome = path.join(root, "G");
  const browser = path.join(root, "bin", "chrome.exe");
  await mkdir(path.dirname(browser), { recursive: true });
  await writeFile(browser, "stand-in", "utf8");
  await mkdir(home, { recursive: true });
  await mkdir(globalHome, { recursive: true });
  const block = diagrams === "on" ? { generator: ID, browser } : diagrams === "none" ? undefined : diagrams;
  const work = { dir: "./wiki/work", ...(block === undefined ? {} : { diagrams: block }), ...(loop == null ? {} : { loop }) };
  await mkdir(path.join(project, ".aof"), { recursive: true });
  await writeFile(path.join(project, ".aof", "aof.config.json"), `${JSON.stringify({ name: "fixture", resources: [], work }, null, 2)}\n`, "utf8");
  const milestone = path.join(project, MILESTONE);
  await mkdir(milestone, { recursive: true });
  await writeFile(path.join(milestone, "SPEC.md"), `---\ntype: milestone\nnumber: 07\nslug: m\ntitle: m\nstatus: ${milestoneStatus}\nschema: 1\n---\n# 07 · m\n`, "utf8");
  await writeFile(path.join(milestone, "ARCHITECTURE.md"), ARCHITECTURE, "utf8");
  const members = stories ?? { "01": { files: "[src/a.mjs]" }, "02": { files: "[src/b.mjs]" } };
  for (const [number, options] of Object.entries(members)) {
    const dir = path.join(milestone, "stories", `${number}_story_s${number}`);
    await mkdir(path.join(dir, "tasks"), { recursive: true });
    await writeFile(path.join(dir, "STORY.md"), story({ number, ...options }), "utf8");
    if (options.tasks !== false) await writeFile(path.join(dir, "tasks", "00_t.feature"), "@executable\nFeature: t\n\n  Scenario: s\n    Given a\n", "utf8");
  }
  if (others) {
    const standalone = path.join(project, "wiki", "work", "08_story_lone");
    await mkdir(path.join(standalone, "tasks"), { recursive: true });
    await writeFile(path.join(standalone, "STORY.md"), "---\ntype: story\nnumber: 08\nslug: lone\ntitle: lone\nstatus: not-started\nschema: 1\n---\n# 08\n", "utf8");
    const chore = path.join(project, "wiki", "work", "09_chore_tidy");
    await mkdir(chore, { recursive: true });
    await writeFile(path.join(chore, "CHORE.md"), "---\ntype: chore\nnumber: 09\nslug: tidy\ntitle: tidy\nstatus: not-started\nschema: 1\n---\n# 09\n\n## Definition of Done\n\n- [ ] tidy\n", "utf8");
  }
  if (registry) {
    const install = path.join(home, "cache", "install");
    const skill = path.join(install, "skills", ID, "SKILL.md");
    await mkdir(path.dirname(skill), { recursive: true });
    await writeFile(skill, "# skill\n", "utf8");
    await mkdir(path.join(home, ".claude", "plugins"), { recursive: true });
    await writeFile(
      path.join(home, ".claude", "plugins", "installed_plugins.json"),
      JSON.stringify({ version: 2, plugins: { [`${ID}@${ID}`]: [{ scope: "project", installPath: install, lastUpdated: "2026-09-01T00:00:00Z" }] } }),
      "utf8",
    );
  }
  return { root, project, home, globalHome, browser, milestone };
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

function aof(fx, ...argv) {
  const result = spawnSync(process.execPath, [cliPath, ...argv], {
    cwd: fx.project,
    encoding: "utf8",
    env: { ...process.env, AOF_GLOBAL_HOME: fx.globalHome, HOME: fx.home, USERPROFILE: fx.home, NODE_NO_WARNINGS: "1" },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

const json = (result) => JSON.parse(result.stdout);
const at = (fx, rel) => path.join(fx.project, rel);
const exists = (fx, rel) => existsSync(at(fx, rel));
const readPlan = async (fx) => JSON.parse(await readFile(at(fx, PLAN), "utf8"));
const waveRefs = (plan) => plan.waves.map((wave) => wave.members.map((member) => member.ref));

// A refusal's envelope: the code, and its message under whichever key the face prints it.
function refusal(result) {
  assert.notEqual(result.status, 0, `refused non-zero: ${result.stdout}`);
  const envelope = json(result);
  return { code: envelope.code, message: String(envelope.error ?? envelope.message ?? "") };
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

const WRITES = ({ child, out, at: when }) => when(0, () => { writeFileSync(out, PNG); child.emit("exit", 0); });

async function exportInProcess(fx, fake, adr = "loop") {
  const workspace = await loadWorkspace(fx.project);
  return invoke("diagram:export", { ref: "07", adr }, { workspace, diagramRasterizer: fake.injected, env: {} });
}

const exitOf = (result) => getCommand("diagram:export").cli.exit(result);

async function drawn(fx, text = DRAWN) {
  await mkdir(at(fx, EXECUTION), { recursive: true });
  await writeFile(at(fx, SOURCE_PATH), text, "utf8");
}

const git = (fx, ...args) => spawnSync("git", args, { cwd: fx.project, encoding: "utf8" });

export const loopDiagramCommandTests = [
  // ── task 01 · `aof diagram plan <ref> loop` ────────────────────────────────────────────────
  {
    name: "145/01 E1: a refined milestone under refine_first gets its plan and the drawing instructions",
    run: () => withFixture({ stories: { "01": { status: "in-review", files: "[src/a.mjs]" }, "02": { files: "[src/]" } } }, async (fx) => {
      const result = aof(fx, "diagram", "plan", "07", "loop", "--json");
      assert.equal(result.status, 0, result.stderr);
      const envelope = json(result);
      const plan = await readPlan(fx);
      assert.deepEqual(plan, await planLoopWaves(at(fx, "wiki/work"), "07", { projectRoot: fx.project, bound: plan.bound }), "the file holds the wave plan for 07");
      assert.deepEqual(waveRefs(plan), [["07/01"], ["07/02"]]);
      assert.equal(envelope.enabled, true);
      assert.equal(envelope.available, true);
      assert.equal(envelope.generator, ID);
      assert.deepEqual(envelope.paths, { dir: EXECUTION, plan: PLAN, source: SOURCE_PATH, svg: SVG, png: PNG_PATH });
      for (const needle of ["Wave 1: 07/01", "Wave 2: 07/02", "held out of wave 1: 07/02", "overlap 07/01", "[built — in-review]", `Lane bound: ${plan.bound}`]) {
        assert.ok(envelope.brief.includes(needle), `the brief names ${needle}:\n${envelope.brief}`);
      }
      assert.ok(envelope.instructions.includes(path.join(fx.home, "cache", "install", "skills", ID, "SKILL.md")), "the skill's path");
      assert.ok(envelope.instructions.includes(envelope.brief), "the brief");
      assert.ok(envelope.instructions.includes(path.resolve(fx.project, SOURCE_PATH)), "loop.html as the one file to write");
      assert.match(envelope.instructions, /write nothing else/);
    }),
  },
  {
    name: "145/01 E2: a project that does not refine upfront is stopped by name, writing nothing",
    run: () => withFixture({ loop: null }, async (fx) => {
      const { code, message } = refusal(aof(fx, "diagram", "plan", "07", "loop", "--json"));
      assert.equal(code, "loop-not-refine-first");
      assert.match(message, /work\.loop\.concurrency/);
      assert.match(message, /refine_first/);
      assert.equal(exists(fx, EXECUTION), false);
    }),
  },
  {
    name: "145/01 E3: a milestone with an unrefined story is stopped, naming the story",
    run: () => withFixture({ stories: { "01": { files: "[src/a.mjs]" }, "02": { files: "[src/b.mjs]", tasks: false } } }, async (fx) => {
      const { code, message } = refusal(aof(fx, "diagram", "plan", "07", "loop", "--json"));
      assert.equal(code, "loop-not-refined");
      assert.match(message, /07\/02/);
      assert.match(message, /aof:refine 07\/02/);
      assert.equal(exists(fx, EXECUTION), false);
    }),
  },
  {
    name: "145/01: a milestone that is not broken down is stopped as not refined",
    run: () => withFixture({ stories: {} }, async (fx) => {
      const { code, message } = refusal(aof(fx, "diagram", "plan", "07", "loop", "--json"));
      assert.equal(code, "loop-not-refined");
      assert.match(message, /07 has no stories/);
      assert.match(message, /aof:refine 07\b/);
      assert.equal(exists(fx, EXECUTION), false);
    }),
  },
  {
    name: "145/01 E11: an item that is not a milestone has no waves to draw (outline, three rows)",
    run: () => withFixture({ others: true }, async (fx) => {
      for (const [ref, dir] of [["08", "wiki/work/08_story_lone"], ["09", "wiki/work/09_chore_tidy"], ["07/01", `${MILESTONE}/stories/01_story_s01`]]) {
        const { code, message } = refusal(aof(fx, "diagram", "plan", ref, "loop", "--json"));
        assert.equal(code, "loop-not-a-milestone", ref);
        assert.match(message, /single item runs in one lane/, ref);
        assert.equal(exists(fx, `${dir}/execution`), false, ref);
      }
    }),
  },
  {
    name: "145/01: a done story without tasks does not stop the plan",
    run: () => withFixture({ stories: { "01": { files: "[src/a.mjs]" }, "02": { status: "done", files: "[src/b.mjs]", tasks: false } } }, async (fx) => {
      const result = aof(fx, "diagram", "plan", "07", "loop", "--json");
      assert.equal(result.status, 0, result.stderr);
      assert.equal(exists(fx, PLAN), true);
    }),
  },
  {
    name: "145/01: the plan is written even when the drawing step cannot run (outline, three rows)",
    run: async () => {
      const rows = [
        { options: { diagrams: "none" }, check: (envelope) => { assert.equal(envelope.enabled, false); assert.match(envelope.reason, /work\.diagrams/); } },
        { options: { diagrams: { generator: "off" } }, check: (envelope) => { assert.equal(envelope.enabled, false); assert.match(envelope.reason, /generator/); } },
        { options: { registry: false }, check: (envelope) => { assert.equal(envelope.available, false); assert.equal(envelope.code, "diagram-generator-missing"); } },
      ];
      for (const row of rows) {
        await withFixture(row.options, async (fx) => {
          const result = aof(fx, "diagram", "plan", "07", "loop", "--json");
          assert.equal(result.status, 0, result.stderr);
          const envelope = json(result);
          row.check(envelope);
          assert.equal(envelope.plan, PLAN, "the answer says where the plan was written");
          assert.equal(exists(fx, PLAN), true);
          assert.equal(exists(fx, SOURCE_PATH), false);
        });
      }
    },
  },
  {
    name: "145/01: a re-run replaces the plan and touches nothing else",
    run: () => withFixture({}, async (fx) => {
      for (const args of [["init", "-q"], ["add", "-A"], ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "fixture"]]) assert.equal(git(fx, ...args).status, 0);
      assert.equal(aof(fx, "diagram", "plan", "07", "loop", "--json").status, 0);
      assert.deepEqual(waveRefs(await readPlan(fx)), [["07/01", "07/02"]]);
      await writeFile(at(fx, `${MILESTONE}/stories/02_story_s02/STORY.md`), story({ number: "02", files: "[src/b.mjs]", depends: "[01]" }), "utf8");
      assert.equal(git(fx, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qam", "02 depends on 01").status, 0);
      const result = aof(fx, "diagram", "plan", "07", "loop", "--json");
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(waveRefs(await readPlan(fx)), [["07/01"], ["07/02"]], "07/02 is in wave 2");
      const dirty = git(fx, "status", "--porcelain", "--untracked-files=all").stdout.split("\n").filter(Boolean).map((line) => line.slice(3));
      assert.ok(dirty.length > 0 && dirty.every((file) => file.startsWith(`${EXECUTION}/`)), `only execution/ is dirty: ${dirty.join(", ")}`);
    }),
  },
  {
    name: "145/01: the ADR plan answers exactly as before, and writes no execution folder",
    run: () => withFixture({}, async (fx) => {
      const result = aof(fx, "diagram", "plan", "07", "ADR-002", "--slug", "seam", "--json");
      assert.equal(result.status, 0, result.stderr);
      const envelope = json(result);
      assert.deepEqual(Object.keys(envelope).sort(), ["adr", "available", "brief", "enabled", "generator", "instructions", "item", "paths", "stem"]);
      assert.equal(envelope.stem, "ADR-002-seam");
      assert.equal(envelope.brief, "Draw the seam.");
      assert.equal(envelope.paths.source, `${MILESTONE}/diagrams/ADR-002-seam.html`);
      assert.equal(exists(fx, EXECUTION), false);
    }),
  },
  {
    name: "145/01: an unknown subject is refused as the ADR id it is not",
    run: () => withFixture({}, async (fx) => {
      assert.equal(refusal(aof(fx, "diagram", "plan", "07", "loops", "--json")).code, "diagram-adr-invalid");
    }),
  },
  // ── task 02 · `aof diagram export <ref> loop` ──────────────────────────────────────────────
  {
    name: "145/02: a drawn loop diagram is exported beside its source, with no block",
    run: () => withFixture({}, async (fx) => {
      await drawn(fx);
      const fake = rasterizer(WRITES);
      const result = await exportInProcess(fx, fake);
      assert.equal(exitOf(result), 0);
      assert.equal(await readFile(at(fx, SVG), "utf8"), generatorFor(ID).toSvg(DRAWN));
      assert.ok((await readFile(at(fx, PNG_PATH))).length > 0);
      assert.deepEqual(result.written, [SVG, PNG_PATH]);
      assert.equal("block" in result, false);
      assert.ok(fake.spawned[0].args.at(-1).endsWith("loop.svg"), "the rasterizer rendered the SVG");
    }),
  },
  {
    name: "145/02: a PNG failure keeps the SVG and exits non-zero",
    run: () => withFixture({ diagrams: { generator: ID, browser: path.join(os.tmpdir(), "no-such-browser.exe") } }, async (fx) => {
      await drawn(fx);
      const result = aof(fx, "diagram", "export", "07", "loop", "--json");
      assert.notEqual(result.status, 0);
      const envelope = json(result);
      assert.equal(exists(fx, SVG), true);
      assert.equal(envelope.png.ok, false);
      assert.equal(envelope.png.code, "diagram-png-renderer-missing");
      assert.ok(typeof envelope.png.fix === "string" && envelope.png.fix.length > 0);
    }),
  },
  {
    name: "145/02: every refusal comes before the first write (outline, four rows)",
    run: async () => {
      const rows = [
        { options: { diagrams: "none" }, source: DRAWN, code: "diagram-disabled" },
        { options: {}, source: null, code: "diagram-source-missing" },
        { options: {}, source: "<!doctype html><html><body><p>no figure</p></body></html>", code: "diagram-source-no-svg" },
        { options: {}, source: "<html><body><svg><rect/></svg></body></html>", code: "diagram-svg-no-viewbox" },
      ];
      for (const row of rows) {
        await withFixture(row.options, async (fx) => {
          if (row.source != null) await drawn(fx, row.source);
          assert.equal(refusal(aof(fx, "diagram", "export", "07", "loop", "--json")).code, row.code);
          assert.equal(exists(fx, SVG), false, row.code);
        });
      }
    },
  },
  {
    name: "145/02: a done milestone's loop diagram can still be exported",
    run: () => withFixture({ milestoneStatus: "done" }, async (fx) => {
      await drawn(fx);
      const result = await exportInProcess(fx, rasterizer(WRITES));
      assert.equal(exitOf(result), 0);
      assert.equal(exists(fx, SVG), true);
    }),
  },
  {
    name: "145/02: the ADR export answers exactly as before, its block included",
    run: () => withFixture({}, async (fx) => {
      await mkdir(path.join(fx.milestone, "diagrams"), { recursive: true });
      await writeFile(path.join(fx.milestone, "diagrams", "ADR-002-seam.html"), DRAWN, "utf8");
      const fake = rasterizer(WRITES);
      const result = await exportInProcess(fx, fake, "ADR-002");
      assert.equal(exitOf(result), 0);
      const dir = `${MILESTONE}/diagrams`;
      assert.deepEqual(result, {
        written: [`${dir}/ADR-002-seam.svg`, `${dir}/ADR-002-seam.png`],
        block: renderDiagramBlock({ adrId: "ADR-002", title: "seam", stem: "ADR-002-seam", sourceExt: ".html", formats: ["svg", "png"] }),
        png: { ok: true, rung: result.png.rung, browser: fx.browser.replace(/\\/g, "/") },
      });
      assert.equal(exists(fx, EXECUTION), false);
    }),
  },
  // ── task 03 · `/aof:loop-diagram` ──────────────────────────────────────────────────────────
  {
    name: "145/03: the command runs the plan, stops on a stop, and exports only after drawing",
    run: async () => {
      const text = await readFile(path.join(repoRoot, "packages", "core", "assets", "commands", "loop-diagram.md"), "utf8");
      assert.match(text, /^argument-hint: "<milestone ref>"$/m);
      const plan = text.indexOf("aof diagram plan <ref> loop --json");
      const exported = text.indexOf("aof diagram export <ref> loop --json");
      assert.ok(plan >= 0, "it runs the plan");
      assert.ok(exported > plan, "it exports after the plan");
      for (const code of ["loop-not-refine-first", "loop-not-refined", "loop-not-a-milestone"]) assert.ok(text.includes(code), code);
      assert.match(text, /enabled: false/);
      assert.match(text, /available: false/);
      const follows = text.indexOf("follow the answer's `instructions`");
      assert.ok(follows > plan && follows < exported, "it follows the answer's instructions, after the plan and before the export");
      assert.match(text, /written/);
    },
  },
];
