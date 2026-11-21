#!/usr/bin/env node
// scripts/golden.mjs — run golden scenarios outside the test runner, and the ONE way a baseline
// is written (203/ADR-004 §4, §5).
//
//   node scripts/golden.mjs [--lane <id>] [--scenario <id>] [--update]
//
// Without --update it reports exactly as the suite does, except that it prints every diff rather
// than the first 20. With --update it writes each selected scenario's minimal delta, removes the
// files it no longer needs, and prints what it wrote. Updating a base re-derives every scenario
// whose chain includes it, base first. No environment variable turns a test run into an update.
//
// `--root <dir>` and `--lane-module <file>` (repeatable) exist for the harness's own self-test:
// a baseline root outside the repository, and lanes outside the registry.
import { compareScenario, captureScenario } from "../test/support/golden/harness.mjs";
import { DEFAULT_BASELINE_ROOT, materialise } from "../test/support/golden/baseline-store.mjs";
import { writeScenario } from "../test/support/golden/baseline-writer.mjs";
import { LANES, baseChain, loadLaneModule, refName } from "../test/support/golden/lanes.mjs";

const USAGE = "usage: node scripts/golden.mjs [--lane <id>] [--scenario <id>] [--update]";

function parseArgs(argv) {
  const options = { lane: null, scenario: null, update: false, root: DEFAULT_BASELINE_ROOT, laneModules: [] };
  const valued = { "--lane": "lane", "--scenario": "scenario", "--root": "root" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--update") options.update = true;
    else if (arg === "--lane-module" && index + 1 < argv.length) options.laneModules.push(argv[++index]);
    else if (Object.hasOwn(valued, arg) && index + 1 < argv.length) options[valued[arg]] = argv[++index];
    else throw new Error(`golden: unknown argument "${arg}"\n${USAGE}`);
  }
  return options;
}

// The scenarios to run, base-first. Under --update, every scenario whose chain includes a
// selected one joins the set, so a base change re-derives its dependents. A base always has a
// shorter chain than anything built on it, so ordering by chain length is a topological order.
function selectScenarios(lanes, options) {
  const lanesNamed = options.lane ? lanes.filter((lane) => lane.id === options.lane) : lanes;
  if (options.lane && !lanesNamed.length) {
    throw new Error(`golden: no lane "${options.lane}". Lanes: ${lanes.map((lane) => lane.id).join(", ") || "(none registered)"}`);
  }
  const all = lanes.flatMap((lane) => lane.scenarios.map((scenario) => ({ laneId: lane.id, scenarioId: scenario.id })));
  const selected = lanesNamed.flatMap((lane) =>
    lane.scenarios.filter((scenario) => !options.scenario || scenario.id === options.scenario).map((scenario) => ({ laneId: lane.id, scenarioId: scenario.id })),
  );
  if (options.scenario && !selected.length) {
    const named = lanesNamed.flatMap((lane) => lane.scenarios.map((scenario) => refName({ laneId: lane.id, scenarioId: scenario.id })));
    throw new Error(`golden: no scenario "${options.scenario}"${options.lane ? ` in lane "${options.lane}"` : ""}. Scenarios: ${named.join(", ") || "(none)"}`);
  }
  const chains = new Map(all.map((ref) => [refName(ref), baseChain(lanes, ref.laneId, ref.scenarioId).map(refName)]));
  const chosen = new Set(selected.map(refName));
  const run = options.update ? all.filter((ref) => chains.get(refName(ref)).some((name) => chosen.has(name))) : selected;
  return run.sort((a, b) => chains.get(refName(a)).length - chains.get(refName(b)).length);
}

function update(lanes, refs, root) {
  let touched = 0;
  for (const ref of refs) {
    const lane = lanes.find((candidate) => candidate.id === ref.laneId);
    const scenario = lane.scenarios.find((candidate) => candidate.id === ref.scenarioId);
    const actual = captureScenario(lane, scenario);
    let baseTree = null;
    if (scenario.base) {
      const [, baseRef] = baseChain(lanes, ref.laneId, ref.scenarioId);
      const base = materialise({ lanes, root, ...baseRef });
      if (base.missing) throw new Error(`golden: cannot write ${refName(ref)}: ${base.missing}`);
      baseTree = base.tree;
    }
    const { written, deleted } = writeScenario({ root, ...ref, actual, baseTree });
    for (const rel of written) console.log(`wrote ${rel}`);
    for (const rel of deleted) console.log(`removed ${rel}`);
    if (!written.length && !deleted.length) console.log(`${refName(ref)}: already current`);
    touched += written.length + deleted.length;
  }
  if (touched === 0) console.log(`golden: every baseline was already current (${refs.length} scenario${refs.length === 1 ? "" : "s"})`);
  return 0;
}

function compare(lanes, refs, root) {
  let drifted = 0;
  for (const ref of refs) {
    const { passed, report } = compareScenario({ lanes, ...ref, root, limit: Infinity });
    if (passed) {
      console.log(`${refName(ref)}: matches its baseline`);
      continue;
    }
    drifted += 1;
    console.log(`${refName(ref)}: drifted\n${report}`);
  }
  if (drifted) console.log(`golden: ${drifted} of ${refs.length} scenario${refs.length === 1 ? "" : "s"} drifted`);
  return drifted ? 1 : 0;
}

async function main(argv) {
  const options = parseArgs(argv);
  const lanes = [...LANES];
  for (const file of options.laneModules) lanes.push(await loadLaneModule(file));
  const refs = selectScenarios(lanes, options);
  return options.update ? update(lanes, refs, options.root) : compare(lanes, refs, options.root);
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
