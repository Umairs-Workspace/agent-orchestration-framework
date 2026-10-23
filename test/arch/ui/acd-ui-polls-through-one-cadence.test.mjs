// Fitness function FF-16703 · acd-ui-polls-through-one-cadence (milestone 167 / ADR-004).
//
//   Every interval poll in `apps/ui/src` is scheduled through `apps/ui/src/lib/poll-cadence.mjs`
//   (clock re-render ticks exempt).
//
// An open view used to poll every 5 s forever, minimised or not, changed or not, because each surface
// owned a bare `setInterval`. The pause-while-hidden and back-off rules live in ONE scheduler, and a
// surface that grew a `setInterval` of its own would quietly opt out of both. So, over the sources:
//   1. No `setInterval` in `apps/ui/src` outside the named exemptions — the clock ticks that only
//      re-render a relative time, and the session launcher's bounded wait for one spawn outcome.
//   2. Each surface that polls builds its polls from `createPoll`, and wires the user action that
//      returns its cadence to the base (167/02's outline): the board's detail panel, the Runs tab
//      mounting its poll, the fleet's scope and pending assign, the home page's own actions.
//   3. The scheduler itself is one `setTimeout` chain and arms no interval.
// Self-check: the detector trips on a planted interval and spares an exempt one.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const UI_SRC = path.join(repoRoot, "apps", "ui", "src");
const CADENCE = "apps/ui/src/lib/poll-cadence.mjs";

// file → the constants an exempt `setInterval` in it may be timed by.
const EXEMPT = Object.freeze({
  "apps/ui/src/board/Board.tsx": ["CLOCK_TICK_MS"], // the relative-time tick, fetches nothing
  "apps/ui/src/fleet/Fleet.tsx": ["CLOCK_MS"], // the freshness label's tick, fetches nothing
  "apps/ui/src/home/SessionLauncher.tsx": ["LAUNCHER_OUTCOME_POLL_MS", "pollEvery"], // one spawn outcome's bounded wait
});

const SURFACES = Object.freeze({
  "apps/ui/src/board/Board.tsx": [/listPoll\.current\?\.poke\(\)/u, /poll\.pin\(\)/u],
  "apps/ui/src/board/DetailPanel.tsx": [/createPoll\(\{ baseMs: RUNS_POLL_MS/u],
  "apps/ui/src/fleet/Fleet.tsx": [/statusPoll\.current\?\.pin\(\)/u, /statusPoll\.current\?\.unpin\(\)/u, /\[load, scope\]/u],
  "apps/ui/src/home/Home.tsx": [/onClickCapture=\{pokeFeed\}/u, /onChangeCapture=\{pokeFeed\}/u],
});

function stripComments(source) {
  return source.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1").replace(/\/\*[\s\S]*?\*\//g, "");
}

// Every `setInterval(…, <timing>)` call: the timing argument is the text after the last top-level comma.
export function intervalCalls(code) {
  const calls = [];
  for (const match of code.matchAll(/\bsetInterval\s*\(/g)) {
    let depth = 1, at = match.index + match[0].length, lastComma = -1;
    for (; at < code.length && depth > 0; at++) {
      const ch = code[at];
      if (ch === "(" || ch === "{" || ch === "[") depth++;
      else if (ch === ")" || ch === "}" || ch === "]") depth--;
      else if (ch === "," && depth === 1) lastComma = at;
    }
    calls.push({ timing: lastComma < 0 ? "" : code.slice(lastComma + 1, at - 1).trim() });
  }
  return calls;
}

async function sources(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await sources(full));
    else if (/\.(tsx?|mjs)$/u.test(entry.name) && !entry.name.endsWith(".d.mts")) out.push(full);
  }
  return out;
}
const rel = (file) => path.relative(repoRoot, file).split(path.sep).join("/");

export const archTests = [
  {
    name: "arch/167 FF-16703 (acd-ui-polls-through-one-cadence): no setInterval in apps/ui/src outside the clock ticks and the launcher's outcome wait",
    async run() {
      const files = await sources(UI_SRC);
      assert.ok(files.length > 50, `the UI sources were read (${files.length})`);
      const offenders = [];
      let exemptSeen = 0;
      for (const file of files) {
        const calls = intervalCalls(stripComments(await readFile(file, "utf8")));
        const allowed = EXEMPT[rel(file)] ?? [];
        for (const call of calls) {
          if (allowed.includes(call.timing)) exemptSeen++;
          else offenders.push(`${rel(file)}: setInterval(…, ${call.timing})`);
        }
      }
      assert.deepEqual(offenders, [], "schedule the poll through createPoll (apps/ui/src/lib/poll-cadence.mjs)");
      assert.equal(exemptSeen, 4, "the four exempt intervals are still where they were (non-vacuous)");
    },
  },
  {
    name: "167/02 the clock ticks and the launcher's outcome wait are not slowed",
    async run() {
      // They are exempt by construction: each is a bare interval on its own fixed constant, never a
      // createPoll, so neither visibility nor back-off can touch it.
      for (const [file, timings] of Object.entries(EXEMPT)) {
        const calls = intervalCalls(stripComments(await readFile(path.join(repoRoot, file), "utf8")));
        for (const timing of timings) assert.ok(calls.some((call) => call.timing === timing), `${file} still ticks on ${timing}`);
      }
    },
  },
  {
    name: "arch/167 FF-16703 (acd-ui-polls-through-one-cadence): each polling surface builds its polls from createPoll and wires its user action",
    async run() {
      for (const [file, wires] of Object.entries(SURFACES)) {
        const code = stripComments(await readFile(path.join(repoRoot, file), "utf8"));
        assert.match(code, /from "\.\.\/lib\/poll-cadence\.mjs"/u, `${file} imports the one cadence`);
        assert.match(code, /\b(?:createPoll|armPoll)\(/u, `${file} builds its poll from createPoll`);
        for (const wire of wires) assert.match(code, wire, `${file} wires ${wire}`);
      }
      const cadence = stripComments(await readFile(path.join(repoRoot, CADENCE), "utf8"));
      assert.equal(intervalCalls(cadence).length, 0, "the scheduler arms no interval");
      assert.match(cadence, /globalThis\.setTimeout\(/u, "…it is one setTimeout chain, read at call time");
    },
  },
  {
    name: "arch/167 FF-16703 (acd-ui-polls-through-one-cadence): the detector trips on a planted interval and spares an exempt one (non-vacuous)",
    run() {
      assert.deepEqual(intervalCalls("const poll = setInterval(() => void load({ silent: true }), POLL_MS);"), [{ timing: "POLL_MS" }]);
      assert.deepEqual(intervalCalls("setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)"), [{ timing: "CLOCK_TICK_MS" }]);
      assert.equal(intervalCalls(stripComments("// setInterval(() => x(), POLL_MS)\nconst a = 1;")).length, 0, "a comment is not a call");
    },
  },
];
