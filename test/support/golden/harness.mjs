// test/support/golden/harness.mjs — run a golden scenario and compare it (203/ADR-001, ADR-004).
//
// A scenario's steps run as child processes, one Node start each, in a temp project with a temp
// `AOF_GLOBAL_HOME`, so the command door's own writes are captured and the real `~/.aof` is never
// touched. Afterwards both trees are walked into `Map<"project/…" | "home/…", Buffer>`, and the
// temp root is removed whichever way the scenario ended.
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../cli-spawn.mjs";
import { normaliseContext, normaliseSteps, normaliseTree } from "./normalise.mjs";
import { DEFAULT_BASELINE_ROOT, compareTrees, materialise, renderReport, updateCommand } from "./baseline-store.mjs";
import { findScenario } from "./lanes.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const AOF_BIN = path.join(repoRoot, "packages/core/bin/aof.mjs");

// Every file under `dir`, dotfiles included, keyed `<prefix>/<relative path>` with "/" between
// segments whatever the platform.
function captureTree(dir, prefix, into) {
  const walk = (current, segments) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const key = [prefix, ...segments, entry.name].join("/");
      if (entry.isDirectory()) walk(full, [...segments, entry.name]);
      else if (entry.isFile()) into.set(key, readFileSync(full));
      // A symlink or other special entry is output too; leaving it out would hide it from the baseline.
      else throw new Error(`golden: "${key}" is neither a file nor a directory, so the harness cannot capture it`);
    }
  };
  walk(dir, []);
  return into;
}

function parseEnvelope(stdout) {
  const text = stdout.trim();
  if (text === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// runScenario(lane, scenario) → { tree, steps, ctx, root }. `tree` holds raw bytes; `ctx` is the
// normaliser's context, built while the temp paths still exist. A step whose exit is not the one
// declared throws, naming the step and its argv and showing its stderr; `error.steps` holds the
// records of the steps that ran.
export function runScenario(lane, scenario, { tempParent = os.tmpdir() } = {}) {
  const parent = path.resolve(tempParent);
  const root = mkdtempSync(path.join(parent, "aof-golden-"));
  // Checked before the `try`, as `bundleFixtureRoot` does: a root that escaped is refused, never removed.
  if (path.dirname(path.resolve(root)) !== parent) throw new Error(`golden: temp root ${root} escaped its parent ${parent}`);
  try {
    const project = path.join(root, "project");
    const home = path.join(root, "home");
    mkdirSync(project);
    mkdirSync(home);
    const ctx = normaliseContext({ project, home });
    // Starting files may be a function of the run's own values, which is how a lane starts from a
    // rebuilt baseline (203/ADR-006 §2, §3).
    const files = typeof scenario.files === "function" ? scenario.files({ project, home, version: ctx.version, buildId: ctx.buildId }) : (scenario.files ?? {});
    for (const [rel, content] of Object.entries(files)) {
      const target = path.join(project, ...rel.split("/"));
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
    const command = lane.command ?? [AOF_BIN];
    const steps = [];
    for (const [index, step] of scenario.steps.entries()) {
      const declared = step.exit ?? 0;
      const result = spawnCliSync(process.execPath, [...command, ...step.argv], {
        cwd: project,
        encoding: "utf8",
        windowsHide: true,
        env: { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1" },
      });
      steps.push({ argv: step.argv, exit: result.status, envelope: parseEnvelope(result.stdout ?? "") });
      if (result.status !== declared) {
        const error = new Error(
          `golden: ${lane.id}/${scenario.id} step ${index + 1} (${step.argv.join(" ")}) exited ${result.status ?? result.signal}, where ${declared} is declared.\n` +
            `stderr:\n${result.stderr || "(empty)"}${result.error ? `\nspawn error: ${result.error.message}` : ""}`,
        );
        error.steps = steps;
        throw error;
      }
    }
    const tree = new Map();
    captureTree(project, "project", tree);
    captureTree(home, "home", tree);
    return { tree, steps, ctx, root };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// The normalised actual of one scenario: `{ tree: Map<key, string>, steps: string }`.
export function captureScenario(lane, scenario, options = {}) {
  const run = runScenario(lane, scenario, options);
  return { tree: normaliseTree(run.tree, run.ctx), steps: normaliseSteps(run.steps, run.ctx), root: run.root };
}

// compareScenario({ lanes, laneId, scenarioId, root, limit }) → { passed, report }. The expected
// tree is read first, so a scenario with no baseline fails without running its steps.
export function compareScenario({ lanes, laneId, scenarioId, root = DEFAULT_BASELINE_ROOT, limit = 20 }) {
  const found = findScenario(lanes, laneId, scenarioId);
  if (!found) throw new Error(`golden: lane "${laneId}" has no scenario "${scenarioId}"`);
  const expected = materialise({ lanes, root, laneId, scenarioId });
  if (expected.missing) {
    return { passed: false, report: `${expected.missing}\n${updateCommand(laneId, scenarioId)}` };
  }
  const actual = captureScenario(found.lane, found.scenario);
  const difference = compareTrees(expected, actual);
  if (difference.passed) return { passed: true, report: "" };
  return { passed: false, report: renderReport(difference, { expected, actual, laneId, scenarioId, limit }) };
}

// The suite's form: throws the report, so the runner prints it as the failure.
export function assertScenarioMatches(options) {
  const { passed, report } = compareScenario(options);
  if (!passed) throw new Error(report);
}
