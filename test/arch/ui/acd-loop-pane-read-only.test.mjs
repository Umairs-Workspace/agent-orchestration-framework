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
import { POSTURE_INTERACTIVE, POSTURE_READ_ONLY, READ_ONLY_LABEL_TITLE, mountModelFor } from "../../../apps/ui/src/terminal/input-policy.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const UI_SRC = path.join(repoRoot, "apps", "ui", "src");
const LOOP_LINE = "apps/ui/src/components/loop-line.mjs";
const SURFACE_IMPORTERS = Object.freeze(["apps/ui/src/fleet/runs.mjs", "apps/ui/src/home/page-state.mjs"]);
// The two surfaces that RENDER the progress segment, each in the one warning tone (162 verify, F-03).
const TONE_RENDERERS = Object.freeze(["apps/ui/src/fleet/Fleet.tsx", "apps/ui/src/home/Home.tsx"]);

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
  const toneHomes = definers(/\bLOOP_QUIET_CLASS\s*=/);
  if (toneHomes.length !== 1 || toneHomes[0] !== LOOP_LINE) problems.push(`the quiet tone is declared in ${JSON.stringify(toneHomes)} — exactly one exported constant, in ${LOOP_LINE}`);
  if (!/export\s+const\s+LOOP_QUIET_CLASS\s*=\s*"text-amber-500"\s*;/.test(sources.get(LOOP_LINE) ?? "")) problems.push("LOOP_QUIET_CLASS is not the exported board warning colour `text-amber-500`");
  const retyped = definers(/\.quiet\s*\?\s*["'`]/);
  if (retyped.length > 0) problems.push(`the quiet tone is re-typed as a literal in ${JSON.stringify(retyped)} — render it as LOOP_QUIET_CLASS`);
  for (const renderer of TONE_RENDERERS) {
    if (!/loop\.quiet\s*\?\s*LOOP_QUIET_CLASS\b/.test(sources.get(renderer) ?? "")) problems.push(`${renderer} does not render a quiet progress segment in LOOP_QUIET_CLASS`);
  }
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

// 162 verify (F-01): the UI's span formatter and the loop's drive status line keep twins — the UI file
// is zero-import and the loop kernel may not import a sibling package — so they are held to agree here.
// Every rung edge, both sides of it, a negative span and a multi-hour one.
const SPANS_MS = Object.freeze([-5_000, 0, 999, 1_000, 59_999, 60_000, 599_999, 600_000, 3_599_999, 3_600_000, 3_900_000, 90_061_000]);

// spanDisagreements(ui, loop) → one line per span the two formatters spell differently.
export function spanDisagreements(ui, loop) {
  return SPANS_MS.filter((ms) => ui(ms) !== loop(ms)).map((ms) => `${ms} ms: the loop line reads "${ui(ms)}", the drive status line "${loop(ms)}"`);
}

export const archTests = [
  {
    name: "arch/162 FF-16202 (acd-loop-pane-read-only): the loop line's span formatter and the drive status line's twin spell every span identically, and a twin that drifts trips",
    async run() {
      const { formatLoopDuration } = await import("../../../apps/ui/src/components/loop-line.mjs");
      const { formatDriveDuration } = await import("../../../packages/work-loop/src/drive-status.mjs");
      assert.deepEqual(spanDisagreements(formatLoopDuration, formatDriveDuration), []);
      assert.equal(formatLoopDuration(3_900_000), "1 h 05 min", "the shared spelling, pinned once (E6's 65-min row)");
      const drifted = (ms) => formatDriveDuration(ms).replace(" min", "m");
      assert.ok(spanDisagreements(formatLoopDuration, drifted).length > 0, "a twin that abbreviates its minutes trips");
    },
  },
  {
    name: "arch/162 FF-16202 (acd-loop-pane-read-only): a relayed row whose loopRunId is anything but null or absent mounts read-only with the loop's reason — on the home AND the fleet — while its stream still binds",
    async run() {
      for (const { label, value, posture } of LOOP_RUN_IDS) {
        const mount = homeSessionMount(row(value));
        assert.equal(mount.posture, posture, `home, loopRunId ${label}`);
        assert.equal(mount.bound, true, `home, loopRunId ${label}: the stream still binds — the bytes are real`);
        if (posture === POSTURE_READ_ONLY) {
          assert.equal(mount.reason, LOOP_DRIVEN_REASON, `home, loopRunId ${label}: the reason names the loop`);
          // 162 verify (F-06): the reason reaches the read-only badge the operator hovers, not only the mount.
          assert.equal(mountModelFor({ mount: mount.posture, reason: mount.reason }).readOnlyLabelTitle, LOOP_DRIVEN_REASON, `home, loopRunId ${label}: the badge says a loop drives it`);
        }
        const fleet = fleetTerminalMount({ nodeId: "node-7297", sessionId: "89b1d500", state: "running", loopRunId: value }, { itemRef: "162", assignmentId: "a1" });
        assert.equal(fleet.posture, POSTURE_READ_ONLY, `fleet, loopRunId ${label}: read-only by literal`);
      }
      assert.equal(LOOP_DRIVEN_REASON, "read-only — a loop drives this session; answer it with aof work answer");
      assert.equal(mountModelFor({ mount: POSTURE_READ_ONLY }).readOnlyLabelTitle, READ_ONLY_LABEL_TITLE, "a read-only mount that states no cause keeps the generic title");
      assert.equal(mountModelFor({ mount: POSTURE_INTERACTIVE, reason: LOOP_DRIVEN_REASON }).readOnlyLabelTitle, null, "an interactive mount carries no read-only title");
    },
  },
  {
    name: "arch/162 FF-16202 (acd-loop-pane-read-only): the loop line, its progress segment and the ten-minute quiet threshold and the quiet tone each have exactly one home under apps/ui/src/, and the fleet and the home both import it",
    async run() {
      const sources = await readUiSources();
      assert.ok(sources.size > 50 && sources.has(LOOP_LINE), "the apps/ui/src sweep read the tree and the shared module (non-vacuous)");
      assert.deepEqual(oneHomeProblems(sources), []);
    },
  },
  {
    name: "arch/162 FF-16202 (acd-loop-pane-read-only) red probes: a second loop line in the home, a re-typed threshold, a surface that stops importing the shared module, a re-typed, dropped or re-coloured tone, and a posture line that forgets the loop each trip",
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
      assert.ok(plant("apps/ui/src/home/Home.tsx", (s) => s.replace("loop.quiet ? LOOP_QUIET_CLASS", "loop.quiet ? \"text-red-500\"")).some((p) => /re-typed as a literal/.test(p)), "a surface re-typing the tone trips");
      assert.ok(plant("apps/ui/src/fleet/Fleet.tsx", (s) => s.replace("loop.quiet ? LOOP_QUIET_CLASS : undefined", "undefined")).some((p) => /Fleet\.tsx does not render a quiet progress segment/.test(p)), "a surface dropping the tone trips");
      assert.ok(plant(LOOP_LINE, (s) => s.replace("LOOP_QUIET_CLASS = \"text-amber-500\"", "LOOP_QUIET_CLASS = \"text-slate-500\"")).some((p) => /board warning colour/.test(p)), "a re-coloured tone trips");

      // The posture's one line, read as code: drop the loop clause and the malformed rows go typeable.
      const mountSource = (await readFile(path.join(UI_SRC, "home", "session-mount.mjs"), "utf8")).replace(/\r\n/g, "\n");
      const forgetful = mountSource.replace("axis === FEED_PRODUCER_KNOWN && !loopDriven ? POSTURE_INTERACTIVE", "axis === FEED_PRODUCER_KNOWN ? POSTURE_INTERACTIVE");
      assert.notEqual(forgetful, mountSource, "the posture plant landed");
      assert.ok(/axis === FEED_PRODUCER_KNOWN && !loopDriven \? POSTURE_INTERACTIVE/.test(mountSource), "the shipped posture line carries the loop clause — the behavioural rows above are what it buys");
    },
  },
];
