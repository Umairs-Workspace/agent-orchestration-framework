// Fitness function: acd-loop-pane-read-only (FF-16202, 162/ADR-002 + ADR-003) —
//
//   "A session row whose `loopRunId` is anything but null or absent never mounts interactive, on
//    any surface, and the quiet threshold and loop line have exactly one home that both surfaces
//    import."
//
// TWO HALVES, ONE STORY. A loop's session streams (ADR-001), so its feed axis reads
// `producer-known` — the one input that used to make a pane typeable. Typing into it would race the
// driver's own directive and nudge, so the posture's one author narrows it: interactive only with no
// driving loop. A malformed `loopRunId` (a number, an empty string, an object) is a driving loop as
// far as the keyboard is concerned — the rule fails CLOSED. The fleet's mount is read-only by
// literal already; it is driven here too, so "on any surface" is measured rather than assumed.
//
// And the progress the operator reads beside it — `active 5 s ago` / `quiet 14 min` — has ONE home,
// `apps/ui/src/components/loop-line.mjs`, imported by the fleet and the home alike: a copy in the
// home (the fleet is unimportable there, 49/ADR-001) would give the ten-minute rule two homes that
// drift. The sweep finds every definition of the line and the threshold under `apps/ui/src/`.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { homeSessionMount, LOOP_DRIVEN_REASON } from "../../../apps/ui/src/home/session-mount.mjs";
import { fleetTerminalMount } from "../../../apps/ui/src/fleet/terminal-mount.mjs";
import { POSTURE_INTERACTIVE, POSTURE_READ_ONLY } from "../../../apps/ui/src/terminal/input-policy.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const UI_SRC = path.join(repoRoot, "apps", "ui", "src");
const LOOP_LINE = "apps/ui/src/components/loop-line.mjs";
const SURFACE_IMPORTERS = Object.freeze(["apps/ui/src/fleet/runs.mjs", "apps/ui/src/home/page-state.mjs"]);

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

async function listUiSources(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await listUiSources(full)));
    else if (/\.(?:mjs|tsx?)$/.test(entry.name) && !entry.name.endsWith(".d.mts")) found.push(full);
  }
  return found;
}

async function readUiSources() {
  const sources = new Map();
  for (const file of await listUiSources(UI_SRC)) {
    sources.set(path.relative(repoRoot, file).split(path.sep).join("/"), stripComments((await readFile(file, "utf8")).replace(/\r\n/g, "\n")));
  }
  return sources;
}

// oneHomeProblems(sources) — the second half, over a Map<repo path, comment-stripped source>.
export function oneHomeProblems(sources) {
  const problems = [];
  const definers = (pattern) => [...sources].filter(([, source]) => pattern.test(source)).map(([file]) => file);
  const lineHomes = definers(/\bfunction\s+fleetLoopLines\s*\(/);
  if (lineHomes.length !== 1 || lineHomes[0] !== LOOP_LINE) problems.push(`the loop line is defined in ${JSON.stringify(lineHomes)} — exactly one home, ${LOOP_LINE}`);
  const progressHomes = definers(/\bfunction\s+loopProgress\s*\(/);
  if (progressHomes.length !== 1 || progressHomes[0] !== LOOP_LINE) problems.push(`the progress segment is defined in ${JSON.stringify(progressHomes)} — exactly one home, ${LOOP_LINE}`);
  const thresholdHomes = definers(/\bLOOP_QUIET_AFTER_MS\s*=/);
  if (thresholdHomes.length !== 1 || thresholdHomes[0] !== LOOP_LINE) problems.push(`the quiet threshold is declared in ${JSON.stringify(thresholdHomes)} — exactly one exported constant, in ${LOOP_LINE}`);
  if (!/export\s+const\s+LOOP_QUIET_AFTER_MS\s*=\s*10\s*\*\s*60\s*\*\s*1000\s*;/.test(sources.get(LOOP_LINE) ?? "")) problems.push("LOOP_QUIET_AFTER_MS is not the exported ten minutes (EXAMPLES Q3)");
  for (const importer of SURFACE_IMPORTERS) {
    if (!/from\s+"\.\.\/components\/loop-line\.mjs"/.test(sources.get(importer) ?? "")) problems.push(`${importer} does not import the shared loop line — both surfaces compose it from the one home`);
  }
  return problems;
}

// The rows ADR-002 §3 rules on, all relayed, so the axis alone would say `producer-known`.
const LOOP_RUN_IDS = Object.freeze([
  { label: "a run id", value: "20261017T081933836Z-0000", posture: POSTURE_READ_ONLY },
  { label: "the number 42", value: 42, posture: POSTURE_READ_ONLY },
  { label: "an empty string", value: "", posture: POSTURE_READ_ONLY },
  { label: "an object", value: { runId: "x" }, posture: POSTURE_READ_ONLY },
  { label: "false", value: false, posture: POSTURE_READ_ONLY },
  { label: "null", value: null, posture: POSTURE_INTERACTIVE },
  { label: "absent", value: undefined, posture: POSTURE_INTERACTIVE },
]);

function row(loopRunId) {
  const base = { nodeId: "node-7297", sessionId: "89b1d500", workspaceId: "w1", repo: "aof", assistant: "claude-code", lastPingAt: "2026-10-17T10:00:00.000Z", workspaceHasRun: true, workItem: null, relaying: true };
  return loopRunId === undefined ? base : { ...base, loopRunId };
}

export const archTests = [
  {
    name: "arch/162 FF-16202 (acd-loop-pane-read-only): a relayed row whose loopRunId is anything but null or absent mounts read-only with the loop's reason — on the home AND the fleet — while its stream still binds",
    async run() {
      for (const { label, value, posture } of LOOP_RUN_IDS) {
        const mount = homeSessionMount(row(value));
        assert.equal(mount.posture, posture, `home, loopRunId ${label}`);
        assert.equal(mount.bound, true, `home, loopRunId ${label}: the stream still binds — the bytes are real`);
        if (posture === POSTURE_READ_ONLY) assert.equal(mount.reason, LOOP_DRIVEN_REASON, `home, loopRunId ${label}: the reason names the loop`);
        const fleet = fleetTerminalMount({ nodeId: "node-7297", sessionId: "89b1d500", state: "running", loopRunId: value }, { itemRef: "162", assignmentId: "a1" });
        assert.equal(fleet.posture, POSTURE_READ_ONLY, `fleet, loopRunId ${label}: read-only by literal`);
      }
      assert.equal(LOOP_DRIVEN_REASON, "read-only — a loop drives this session; answer it with aof work answer");
    },
  },
  {
    name: "arch/162 FF-16202 (acd-loop-pane-read-only): the loop line, its progress segment and the ten-minute quiet threshold each have exactly one home under apps/ui/src/, and the fleet and the home both import it",
    async run() {
      const sources = await readUiSources();
      assert.ok(sources.size > 50 && sources.has(LOOP_LINE), "the apps/ui/src sweep read the tree and the shared module (non-vacuous)");
      assert.deepEqual(oneHomeProblems(sources), []);
    },
  },
  {
    name: "arch/162 FF-16202 (acd-loop-pane-read-only) red probes: a second loop line in the home, a re-typed threshold, a surface that stops importing the shared module, and a posture line that forgets the loop each trip",
    async run() {
      const sources = await readUiSources();
      const plant = (file, transform) => {
        const next = new Map(sources);
        const planted = transform(next.get(file) ?? "");
        assert.notEqual(planted, next.get(file) ?? "", `the plant in ${file} landed`);
        next.set(file, planted);
        return oneHomeProblems(next);
      };
      assert.ok(plant("apps/ui/src/home/page-state.mjs", (s) => `${s}\nfunction fleetLoopLines(presence) { return []; }\n`).some((p) => /loop line is defined in/.test(p)), "a home copy of the line trips");
      assert.ok(plant("apps/ui/src/home/Home.tsx", (s) => `${s}\nconst LOOP_QUIET_AFTER_MS = 600000;\n`).some((p) => /quiet threshold/.test(p)), "a re-typed threshold trips");
      assert.ok(plant("apps/ui/src/fleet/runs.mjs", (s) => s.replaceAll("../components/loop-line.mjs", "./loop-line-copy.mjs")).some((p) => /does not import the shared loop line/.test(p)), "a surface off the shared module trips");

      // The posture's one line, read as code: drop the loop clause and the malformed rows go typeable.
      const mountSource = (await readFile(path.join(UI_SRC, "home", "session-mount.mjs"), "utf8")).replace(/\r\n/g, "\n");
      const forgetful = mountSource.replace("axis === FEED_PRODUCER_KNOWN && !loopDriven ? POSTURE_INTERACTIVE", "axis === FEED_PRODUCER_KNOWN ? POSTURE_INTERACTIVE");
      assert.notEqual(forgetful, mountSource, "the posture plant landed");
      assert.ok(/axis === FEED_PRODUCER_KNOWN && !loopDriven \? POSTURE_INTERACTIVE/.test(mountSource), "the shipped posture line carries the loop clause — the behavioural rows above are what it buys");
    },
  },
];
