// Traceability wiring for milestone 192 / story 03 — a project sees its practices and hears of a
// stale render (192/ADR-006, ADR-007). Every @executable scenario and Examples row of
//   tasks/00_update-lists-the-optional-practices.feature
//   tasks/01_the-doctor-reports-a-key-changed-since-the-render.feature
//   tasks/02_an-install-with-no-record-is-told-once-to-update.feature
// is a case here, named by its task and scenario.
//
// THE FIXTURES are the features' own. "NEW" is a scratch project initialised from this checkout's
// shipped bundle (Claude, the cheapest render) with a config naming neither key; it is initialised
// ONCE and copied for every case, each copy with its own `AOF_GLOBAL_HOME`. "OFF" is NEW updated;
// "ON" is NEW with `work.examples.enabled` true, updated; "OLD" is NEW whose lock's `work` section
// has no `practices`. "runs" is this tree's own CLI entry, spawned in the project, so every case
// reads the faces an operator reads. A case that names a fixture practice (two keys, no practice)
// drives `updateWork` through its bundle seam and the update command's own render, or the lane's
// judgement directly, as the scenario says.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readDescriptor } from "../src/work/bundle.mjs";
import { PRACTICE_RENDER_STALE, PRACTICE_RENDER_UNRECORDED, practiceList, practiceRenderFindings, practiceStates } from "../src/work/bundle-compose.mjs";
import { updateWork } from "../src/work/update.mjs";
import { PRACTICES } from "../src/practices.mjs";
import { practiceLines } from "../src/application/bindings/commands/init-update.mjs";
import { assembleWorkDoctorPractices } from "../src/application/bindings/work/doctor-practices.mjs";
import { baseFixture, notesPractice, only } from "./bundle-compose.suite.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CLI = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const HEADER = "Optional practices (set every key to true in .aof/aof.config.json, then run `aof work update`):";
const RUN_UPDATE = "Run `aof work update`.";
const DISCOVERY_KEY = "work.examples.enabled";
const BRIEF_KEY = "work.plan.enabled";
const REFINE = ".claude/commands/aof/refine.md";
const LANE_CODES = new Set([PRACTICE_RENDER_STALE, PRACTICE_RENDER_UNRECORDED]);

// ── the scratch projects ───────────────────────────────────────────────────────────────────────

const scratchRoots = [];
process.once("exit", () => { for (const root of scratchRoots) rmSync(root, { recursive: true, force: true }); });

function scratch(prefix) {
  const root = mkdtempSync(path.join(os.tmpdir(), `aof-192-03-${prefix}-`));
  scratchRoots.push(root);
  const project = path.join(root, "project");
  const home = path.join(root, "home");
  mkdirSync(project);
  mkdirSync(home);
  return { root, project, home };
}

function aof(where, args, { cwd = where.project } = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd, encoding: "utf8", windowsHide: true,
    env: { ...process.env, AOF_GLOBAL_HOME: where.home, NODE_NO_WARNINGS: "1" },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function ok(where, args) {
  const result = aof(where, args);
  assert.equal(result.status, 0, `aof ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  return result;
}

const configPath = (where) => path.join(where.project, ".aof", "aof.config.json");
const lockPath = (where) => path.join(where.project, ".aof", "aof.lock.json");
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
// The project's config with `work` as given (undefined: no `work` at all).
const setWork = (where, work) => writeJson(configPath(where), { name: "p", resources: [], ...(work === undefined ? {} : { work }) });
const examplesSetTo = (value) => ({ examples: { enabled: value } });

let template = null;
function newTemplate() {
  if (template) return template;
  template = scratch("template");
  ok(template, ["work", "init", "--runtime", "claude", "--json"]);
  setWork(template);
  return template;
}

// NEW: a fresh copy of the initialised project, under its own home.
function NEW() {
  const where = scratch("new");
  cpSync(newTemplate().project, where.project, { recursive: true });
  return where;
}
function OFF() {
  const where = NEW();
  ok(where, ["work", "update"]);
  return where;
}
function ON() {
  const where = NEW();
  setWork(where, examplesSetTo(true));
  ok(where, ["work", "update"]);
  return where;
}
function OLD() {
  const where = NEW();
  const lock = readJson(lockPath(where));
  delete lock.work.practices;
  writeJson(lockPath(where), lock);
  return where;
}

function updateText(where, extra = []) {
  return ok(where, ["work", "update", ...extra]).stdout;
}
function updateJson(where, extra = []) {
  return JSON.parse(ok(where, ["work", "update", ...extra, "--json"]).stdout);
}
// The doctor's findings for the render. The doctor exits non-zero on any error, its own or another
// lane's (an empty stream is one), so its JSON is read whatever its status.
function doctor(where, scope = null, { cwd } = {}) {
  const result = aof(where, ["work", "doctor", ...(scope ? [scope] : []), "--json"], { cwd });
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new Error(`aof work doctor printed no JSON: ${result.stderr || result.stdout}`);
  }
  return parsed.findings.filter((finding) => LANE_CODES.has(finding.code));
}
const stale = (findings) => findings.filter((finding) => finding.code === PRACTICE_RENDER_STALE);
const unrecorded = (findings) => findings.filter((finding) => finding.code === PRACTICE_RENDER_UNRECORDED);

// The listed row of one practice: `{ state, line }`, read from the text face.
function listed(text, id) {
  const lines = text.split("\n");
  const start = lines.indexOf(HEADER);
  assert.ok(start !== -1, `the output holds the list:\n${text}`);
  const line = lines.slice(start + 1).find((row) => new RegExp(`^  (on|off) +${id} `, "u").test(row));
  assert.ok(line, `the list holds a row for "${id}":\n${text}`);
  return { state: /^ {2}(on|off) /u.exec(line)[1], line };
}

const declared = () => readDescriptor().practices;
const refineHoldsDiscovery = (where) => readFileSync(path.join(where.project, REFINE), "utf8").includes("example map");

// ── task 00 — update lists the optional practices ───────────────────────────────────────────────

const t00 = (name, run) => ({ name: `192/03 task 00 · ${name}`, run });

const listTests = [
  t00("E1 · this checkout sees both of its practices on", () => {
    const text = ok({ project: repoRoot, home: scratch("checkout").home }, ["work", "update", "--dry-run"]).stdout;
    const discovery = listed(text, "discovery");
    assert.equal(discovery.state, "on");
    assert.ok(discovery.line.endsWith(DISCOVERY_KEY), discovery.line);
    const brief = listed(text, "build-brief");
    assert.equal(brief.state, "on");
    assert.ok(brief.line.endsWith(BRIEF_KEY), brief.line);
  }),
  t00("E2 · a new project sees what it could turn on, and how", () => {
    const text = updateText(NEW());
    const lines = text.split("\n");
    const at = lines.indexOf(HEADER);
    assert.ok(at !== -1, "the line above the list says to set every key to true and run the update");
    for (const practice of declared()) {
      const row = listed(text, practice.id);
      assert.equal(row.state, "off", `${practice.id} is listed off`);
      assert.ok(row.line.includes(practice.summary), `${practice.id} is listed with its one-line summary`);
      assert.ok(row.line.endsWith(practice.keys.join(" + ")), `${practice.id} is listed with its key`);
    }
    assert.deepEqual(declared().map((practice) => practice.id).sort(), ["build-brief", "discovery"]);
  }),
  t00("E3 · the list is in the JSON output", () => {
    const { practices } = updateJson(NEW());
    assert.deepEqual(practices.map((practice) => practice.id).sort(), ["build-brief", "discovery"]);
    for (const practice of practices) {
      assert.deepEqual(Object.keys(practice).sort(), ["id", "keys", "on", "summary", "title"]);
      assert.equal(practice.on, false);
      assert.ok(practice.title && practice.summary && practice.keys.length > 0);
    }
  }),
  t00("the list follows the project's config", () => {
    const where = NEW();
    setWork(where, examplesSetTo(true));
    const text = updateText(where);
    assert.equal(listed(text, "discovery").state, "on");
    assert.equal(listed(text, "build-brief").state, "off");
  }),
  ...[
    ["true", true, "on", true],
    ["false", false, "off", false],
    ['"true"', "true", "off", false],
    ["1", 1, "off", false],
  ].map(([label, value, state, holds]) => t00(`the list and the render agree on what is on — ${label} is listed ${state}, and the refine command ${holds ? "holds" : "does not hold"} the discovery beat`, () => {
    const where = NEW();
    setWork(where, examplesSetTo(value));
    const text = updateText(where);
    assert.equal(listed(text, "discovery").state, state);
    assert.equal(refineHoldsDiscovery(where), holds);
  })),
  t00("a key set for the whole machine is not listed as on", () => {
    const where = NEW();
    writeJson(path.join(where.home, "aof.config.json"), { work: examplesSetTo(true) });
    setWork(where);
    assert.equal(listed(updateText(where), "discovery").state, "off");
  }),
  t00("a practice with two keys lists both", async () => {
    const where = scratch("two-keys");
    // The fixture practice "notes", re-keyed on two keys, through the update's bundle seam.
    const bundleOverride = (config) => {
      const bundle = only(baseFixture().load(config), "demo");
      const practices = bundle.practices.map((practice) => (practice.id === "notes" ? { ...practice, keys: ["work.notes.enabled", "work.notes.strict"] } : practice));
      return { ...bundle, practices };
    };
    setWork(where, { notes: { enabled: true } });
    writeJson(lockPath(where), { work: { runtimes: ["claude"], files: [] } });
    const result = await updateWork({ targetDir: where.project, bundleOverride, dryRun: true });
    const text = practiceLines(result.practices).join("\n");
    const row = listed(text, "notes");
    assert.equal(row.state, "off");
    assert.ok(row.line.endsWith("work.notes.enabled + work.notes.strict"), row.line);
  }),
  t00("the practices are listed in the order they are declared", () => {
    const { practices } = updateJson(NEW());
    const descriptor = declared();
    assert.deepEqual(practices.map((practice) => practice.id), descriptor.map((practice) => practice.id));
    // Core's come first, then each practice package's in registry order.
    const rank = (contributor) => (contributor === "core" ? -1 : PRACTICES.findIndex((entry) => entry.name === contributor));
    for (const practice of descriptor) {
      assert.ok(practice.contributor === "core" || rank(practice.contributor) !== -1, `${practice.id} comes from core or a registered practice package`);
    }
    const ranks = descriptor.map((practice) => rank(practice.contributor));
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), "core first, then registry order");
    assert.equal(descriptor[0].contributor, "core");
  }),
  t00("the list comes after the summary and before any warning", () => {
    const where = NEW();
    // A pre-190 test declaration over a staged suite its roots leave out: the update warns about it.
    writeJson(configPath(where), {
      name: "p", resources: [],
      work: { test: { command: "node", args: ["scripts/test.mjs"], selectArgs: ["--only", "{file}"], roots: ["test"], deadlineMs: 60000, report: { format: "tap" }, gate: { args: ["scripts/test-sharded.mjs"], jobsArgs: ["--jobs", "{jobs}"] } } },
    });
    const suite = path.join(where.project, "packages", "work", "test", "a.suite.mjs");
    mkdirSync(path.dirname(suite), { recursive: true });
    writeFileSync(suite, "// fixture\n");
    for (const args of [["init", "-q"], ["add", "--", "packages/work/test/a.suite.mjs"]]) {
      const git = spawnSync("git", args, { cwd: where.project, encoding: "utf8", windowsHide: true });
      assert.equal(git.status, 0, git.stderr);
    }
    const lines = updateText(where).split("\n");
    const summary = lines.findIndex((line) => line.startsWith("Updated ACD:"));
    const list = lines.indexOf(HEADER);
    const warning = lines.findIndex((line) => line.startsWith("warning:"));
    assert.ok(summary !== -1 && list !== -1 && warning !== -1, lines.join("\n"));
    assert.ok(summary < list && list < warning, `summary ${summary}, list ${list}, warning ${warning}`);
  }),
  t00("a bundle that declares no practice prints no list", async () => {
    const where = scratch("no-practice");
    setWork(where);
    writeJson(lockPath(where), { work: { runtimes: ["claude"], files: [] } });
    const bundleOverride = (config) => ({ ...only(baseFixture().load(config), "demo"), practices: [] });
    const result = await updateWork({ targetDir: where.project, bundleOverride, dryRun: true });
    assert.deepEqual(result.practices, []);
    assert.ok(!practiceLines(result.practices).some((line) => line.includes("Optional practices")));
  }),
  t00("a project that was never initialised is told to initialise, and nothing else", () => {
    const where = scratch("empty-update");
    const result = aof(where, ["work", "update"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /Run `aof work init` first/u);
    assert.ok(!result.stdout.includes("Optional practices"), result.stdout);
  }),
  t00("init does not print the list", () => {
    const where = scratch("empty-init");
    const text = ok(where, ["work", "init", "--runtime", "claude"]).stdout;
    assert.ok(text.includes("Initialised ACD:"), text);
    assert.ok(!text.includes("Optional practices"), text);
  }),
  t00("the reference says where a project sees its practices", () => {
    const text = readFileSync(path.join(repoRoot, "wiki", "reference", "practice-prose.md"), "utf8").replace(/\s+/gu, " ");
    assert.match(text, /`aof work update` lists each optional practice, whether it is on, and its keys/u);
    assert.match(text, /`aof work doctor` compares that record with the project's config and reports a key changed since the last update/u);
  }),
];

// ── task 01 — the doctor reports a key changed since the render ────────────────────────────────

const t01 = (name, run) => ({ name: `192/03 task 01 · ${name}`, run });

function E4() {
  const where = OFF();
  setWork(where, examplesSetTo(true));
  return where;
}

const staleTests = [
  t01("E4 · a practice turned on and not yet rendered is an error", () => {
    const findings = doctor(E4());
    assert.equal(findings.length, 1, JSON.stringify(findings));
    const [finding] = findings;
    assert.equal(finding.code, PRACTICE_RENDER_STALE);
    assert.equal(finding.severity, "error");
    assert.ok(finding.message.includes(DISCOVERY_KEY), finding.message);
    for (const named of ["the refine command", "aof-product-owner", "aof-architect", "aof-qa briefs"]) {
      assert.ok(finding.message.includes(named), `names ${named}: ${finding.message}`);
    }
    assert.ok(finding.message.endsWith(RUN_UPDATE), finding.message);
  }),
  t01("E5 · the update clears it", () => {
    const where = E4();
    ok(where, ["work", "update"]);
    assert.deepEqual(stale(doctor(where)), []);
  }),
  t01("E6 · a practice turned off and still rendered is a warning", () => {
    const where = ON();
    setWork(where);
    const findings = doctor(where);
    assert.equal(findings.length, 1, JSON.stringify(findings));
    const [finding] = findings;
    assert.equal(finding.code, PRACTICE_RENDER_STALE);
    assert.equal(finding.severity, "warn");
    assert.match(finding.message, /the commands still hold its prose/u);
    assert.ok(finding.message.includes(DISCOVERY_KEY), finding.message);
  }),
  t01('each practice is judged by itself — "work.plan.enabled" alone is one finding naming its key and the refine command', () => {
    const where = OFF();
    setWork(where, { plan: { enabled: true } });
    const findings = stale(doctor(where));
    assert.equal(findings.length, 1, JSON.stringify(findings));
    assert.ok(findings[0].message.includes(BRIEF_KEY));
    assert.ok(findings[0].message.includes("the refine command"));
    assert.ok(!findings[0].message.includes(DISCOVERY_KEY));
  }),
  t01("each practice is judged by itself — both keys are two findings, each key in its own", () => {
    const where = OFF();
    setWork(where, { examples: { enabled: true }, plan: { enabled: true } });
    const findings = stale(doctor(where));
    assert.equal(findings.length, 2, JSON.stringify(findings));
    assert.equal(findings.filter((finding) => finding.message.includes(DISCOVERY_KEY)).length, 1);
    assert.equal(findings.filter((finding) => finding.message.includes(BRIEF_KEY)).length, 1);
    assert.ok(findings.every((finding) => finding.severity === "error"));
  }),
  ...[["false", false], ['"true"', "true"], ["1", 1]].map(([label, value]) => t01(`a value that does not turn a key on is not a change — ${label}`, () => {
    const where = OFF();
    setWork(where, examplesSetTo(value));
    assert.deepEqual(stale(doctor(where)), []);
  })),
  t01("a key set for the whole machine is not a change", () => {
    const where = OFF();
    writeJson(path.join(where.home, "aof.config.json"), { work: examplesSetTo(true) });
    setWork(where);
    assert.deepEqual(stale(doctor(where)), []);
  }),
  t01("the finding is reported once, whatever the scope", () => {
    const where = E4();
    for (const [number, slug] of [["01", "first"], ["02", "second"]]) {
      const dir = path.join(where.project, "wiki", "work", `${number}_milestone_${slug}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, "SPEC.md"), `---\ntype: milestone\nnumber: ${number}\nslug: ${slug}\ntitle: ${slug}\nstatus: not-started\ncreated: 2026-11-13\nupdated: 2026-11-13\n---\n# ${slug}\n`);
    }
    assert.equal(stale(doctor(where)).length, 1, "the whole stream reports it once");
    assert.equal(stale(doctor(where, "01")).length, 1, "one milestone's scope reports it once");
  }),
  t01("a dry run neither records nor clears", () => {
    const where = E4();
    const before = readFileSync(lockPath(where), "utf8");
    ok(where, ["work", "update", "--dry-run"]);
    assert.equal(readFileSync(lockPath(where), "utf8"), before, "the lock's record is unchanged");
    assert.equal(stale(doctor(where)).length, 1, "the doctor still reports the finding");
  }),
  t01("each render records what it was built with", () => {
    const ids = declared().map((practice) => practice.id).sort();
    const off = readJson(lockPath(OFF())).work.practices;
    const on = readJson(lockPath(ON())).work.practices;
    for (const record of [off, on]) {
      assert.deepEqual(Object.keys(record).sort(), ids, "one entry for every declared practice");
      assert.ok(Object.values(record).every((value) => typeof value === "boolean"), "each a boolean");
    }
    assert.ok(Object.values(off).every((value) => value === false), "OFF's are all false");
    assert.deepEqual(Object.entries(on).filter(([, value]) => value).map(([id]) => id), ["discovery"], "ON's is true for discovery alone");
  }),
  t01("a project freshly initialised has a record and nothing to report", () => {
    const where = scratch("fresh");
    ok(where, ["work", "init", "--runtime", "claude"]);
    assert.ok(readJson(lockPath(where)).work.practices, "the lock's work section holds practices");
    assert.deepEqual(doctor(where), []);
  }),
  t01("a practice with two keys names both", () => {
    const practices = [notesPractice(["work.notes.enabled", "work.notes.strict"])];
    const config = { work: { notes: { enabled: true, strict: true } } };
    const facts = {
      installed: true,
      recorded: { notes: false },
      practices: practiceList(practices, practiceStates(practices, config)).map(({ id, keys, on }) => ({ id, keys, on, targets: ["command:demo"] })),
    };
    const findings = practiceRenderFindings(facts, "wiki/work");
    assert.equal(findings.length, 1);
    assert.ok(findings[0].message.includes("work.notes.enabled + work.notes.strict"), findings[0].message);
    assert.equal(findings[0].severity, "error");
  }),
];

// ── task 02 — an install with no record is told once to update ─────────────────────────────────

const t02 = (name, run) => ({ name: `192/03 task 02 · ${name}`, run });

const unrecordedTests = [
  t02("E7 · an install with no record gets one warning, and the update clears it", () => {
    const where = OLD();
    const findings = doctor(where);
    assert.equal(findings.length, 1, JSON.stringify(findings));
    const [finding] = findings;
    assert.equal(finding.code, PRACTICE_RENDER_UNRECORDED);
    assert.equal(finding.severity, "warn");
    assert.match(finding.message, /does not record which practices its commands were rendered with/u);
    assert.ok(finding.message.endsWith(RUN_UPDATE), finding.message);
    ok(where, ["work", "update"]);
    assert.deepEqual(unrecorded(doctor(where)), []);
  }),
  ...[["true", examplesSetTo(true)], ["absent", undefined]].map(([label, work]) => t02(`with no record, nothing is called stale — ${label}`, () => {
    const where = OLD();
    setWork(where, work);
    const findings = doctor(where);
    assert.equal(unrecorded(findings).length, 1);
    assert.deepEqual(stale(findings), []);
  })),
  t02("the warning does not fail the doctor", () => {
    const where = OLD();
    setWork(where, examplesSetTo(true));
    const findings = doctor(where);
    assert.ok(findings.length > 0);
    assert.deepEqual(findings.filter((finding) => finding.severity === "error"), []);
  }),
  t02("a project that never installed the bundle gets nothing", async () => {
    const where = scratch("never-installed");
    setWork(where, examplesSetTo(true));
    writeJson(lockPath(where), { planning: { runtime: "claude", plugins: [] } });
    assert.deepEqual(doctor(where), []);
    const facts = await assembleWorkDoctorPractices().readPracticeRenderFacts(where.project);
    assert.equal(facts.installed, false, "the lane had facts, and they say there is no install");
  }),
  t02("a record that names a practice the bundle no longer declares is ignored", () => {
    const where = OFF();
    const lock = readJson(lockPath(where));
    lock.work.practices = { ...lock.work.practices, retired: true };
    writeJson(lockPath(where), lock);
    assert.deepEqual(doctor(where).filter((finding) => finding.message.includes("retired")), []);
    assert.deepEqual(doctor(where), []);
  }),
  t02("a practice declared since the last render counts as rendered off", () => {
    const where = OFF();
    const lock = readJson(lockPath(where));
    lock.work.practices = { discovery: false };
    writeJson(lockPath(where), lock);
    setWork(where, { plan: { enabled: true } });
    const findings = doctor(where);
    assert.equal(findings.length, 1, JSON.stringify(findings));
    assert.equal(findings[0].code, PRACTICE_RENDER_STALE);
    assert.equal(findings[0].severity, "error");
    assert.ok(findings[0].message.includes(BRIEF_KEY));
  }),
  t02("this checkout has a record and nothing to report", () => {
    const lock = readJson(path.join(repoRoot, ".aof", "aof.lock.json"));
    assert.ok(lock.work?.practices, "this checkout's lock records its practices");
    assert.deepEqual(doctor({ project: repoRoot, home: scratch("checkout-doctor").home }), []);
  }),
];

// The lane's group, as the engine calls it: silent with no facts, anchored at the work directory.
const groupTests = [
  t01("the lane is silent when its facts are absent, and anchors every finding at the work directory", () => {
    const { practiceRenderGroup } = assembleWorkDoctorPractices();
    assert.deepEqual(practiceRenderGroup({ workDir: "/w" }, {}), []);
    assert.deepEqual(practiceRenderGroup({ workDir: "/w" }, { extensions: { practiceRender: null } }), []);
    const findings = practiceRenderGroup({ workDir: "/w" }, { extensions: { practiceRender: { installed: true, recorded: null, practices: [] } } });
    assert.deepEqual(findings.map((finding) => [finding.code, finding.path]), [[PRACTICE_RENDER_UNRECORDED, "/w"]]);
  }),
];

export const practiceRenderLaneTests = [...listTests, ...staleTests, ...unrecordedTests, ...groupTests];

