import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCommand, listCommands } from "../../../src/command-core.mjs";
import { deriveRouteTable, resolveRoute } from "../../../src/spine/face.mjs";
import { completingDriver, loopFixture } from "../../loop/loop-command-probe.test.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DOOR = "src/commands/continue.mjs";
const DRIVER = "src/commands/drive.mjs";

// THE TOKENS ARE MATCHED BARE, not with their call parens: task 04 :35 names `ptySpawn`,
// `term.write` and `driveInteractiveClaudeSession`, and the Examples rows plant the `(` forms, which
// a bare match catches along with an aliased or re-exported spelling of the same name.
const DOOR_TOKENS = Object.freeze(["ptySpawn", "term.write", "driveInteractiveClaudeSession"]);
// 119/01 — the sink is `mesh/worker-execution.mjs` now.
const DRIVER_IMPORT = /from\s+["']([^"']*(?:agent-session-driver|mesh[-/]worker-execution)\.mjs)["']/u;
const DRIVER_DECISIONS = Object.freeze([
  ["`assignWork(`", /\bassignWork\s*\(/u],
  ["a `where` field on a driver's return", /\bwhere\s*:/u],
  ["a `node` decision branch", /\bnode\s*(?:===|==|\?)/u],
]);

// EVERY TOKEN ROW IN THIS GATE'S EXAMPLES TABLE REPORTS "the token AND ITS LINE", and a whole-file
// `assert.doesNotMatch` can report neither — it names the rule and leaves the maintainer to find the
// occurrence (one of the three did not even carry a message). So the sweep is a PURE reporter over
// comment-stripped lines, and the shipped files AND the planted violations are driven through the
// same one: an empty answer on the shipped tree is then a measurement rather than a regex that has
// never matched anything.
function lineHits(rel, code, reasons) {
  const hits = [];
  code.split("\n").forEach((line, index) => {
    for (const reason of reasons(line)) hits.push(`${rel}:${index + 1} — ${reason}: ${line.trim().slice(0, 110)}`);
  });
  return hits;
}

function doorProblems(rel, source) {
  return lineHits(rel, stripComments(source), (line) => {
    const found = DOOR_TOKENS.filter((token) => line.includes(token)).map((token) => `\`${token}\` turns a where-decision into an executor`);
    const imported = DRIVER_IMPORT.exec(line);
    if (imported) found.push(`imports the driver module \`${imported[1]}\``);
    return found;
  });
}

function driverProblems(rel, source) {
  return lineHits(rel, stripComments(source), (line) => DRIVER_DECISIONS
    .filter(([, pattern]) => pattern.test(line))
    .map(([what]) => `${what} makes a where/node assignment decision, which is the door's job and never a driver's`));
}

// THE PLANTED FIXTURES ARE BUILT FROM A BODY LINE, and both of these helpers exist to keep every
// plant BRACE-BALANCED on its own physical source line. This file is read comment-stripped by
// FF-5311, whose member-literal cut balances braces from the one home: a fixture string carrying a
// stray `{` or `}` moves that cut onto the wrong region, and a literal `//` or `/* … */` inside a
// string is stripped outright, taking the rest of the physical line — and the fixture's closing
// brace — with it. Measured 2026-08-20 on the sibling gate: the cut then failed as NOT FOUND.
// So the braces live here, balanced, once; the plants below contribute a single body line each,
// which is always source line 4 of the fixture.
const door = (body) => `export const continueCommand = {\n  id: "work:continue",\n  run: async (brief, options) => {\n${body}\n  },\n};\n`;
const driver = (body) => `export const driveContinueCommand = {\n  id: "work:drive-continue",\n  run: async (args, ctx) => {\n${body}\n  },\n};\n`;
const SLASHES = `${"/"}${"/"}`;
const block = (text) => `${"/"}*${text}*${"/"}`;

export const archTests = [
  {
    name: "arch/53 FF-5303 (acd-phase-door-not-a-driver): the shipped phase door has no spawn path or driver import, reported file:line",
    run: async () => {
      const source = await readFile(path.join(root, DOOR), "utf8");
      // …and the gate REPORTS THE FILE IT READ (task 04 :37): a moved, renamed or truncated door
      // fails here as "not found" rather than sweeping a short string and passing.
      assert.ok(source.length > 1000, `NOT FOUND: ${DOOR} read ${source.length} characters — the shipped door has moved, been renamed or was truncated, and no spawn path was measured`);
      assert.deepEqual(doorProblems(DOOR, source), []);
    },
  },
  {
    name: "arch/53 FF-5303 (acd-phase-door-not-a-driver): each planted spawn token and driver import is caught by that same sweep, naming the token and its line, while a stripped comment is not",
    run: async () => {
      for (const { row, text, line, names } of [
        { row: "`ptySpawn(` in the shipped door", text: door('    await ptySpawn("claude", []);'), line: 4, names: "ptySpawn" },
        { row: "`term.write(` in the shipped door", text: door('    term.write("/aof:continue");'), line: 4, names: "term.write" },
        { row: "`driveInteractiveClaudeSession(` in the shipped door", text: door("    return driveInteractiveClaudeSession(brief, options);"), line: 4, names: "driveInteractiveClaudeSession" },
        { row: "an import of `agent-session-driver.mjs` into the door", text: `import { driveInteractiveClaudeSession } from "../agent-session-driver.mjs";\n${door("    return null;")}`, line: 1, names: "../agent-session-driver.mjs" },
        { row: "an import of `mesh/worker-execution.mjs` into the door", text: `import { runAssignment } from "./mesh/worker-execution.mjs";\n${door("    return null;")}`, line: 1, names: "./mesh/worker-execution.mjs" },
      ]) {
        const found = doorProblems(DOOR, text);
        assert.ok(found.length > 0, `${row}: the sweep reported nothing — this row plants a violation`);
        assert.ok(found.some((hit) => hit.startsWith(`${DOOR}:${line} `)), `${row}: the report names the file AND line ${line} — found ${JSON.stringify(found)}`);
        assert.ok(found.some((hit) => hit.includes(names)), `${row}: the report names \`${names}\` — found ${JSON.stringify(found)}`);
      }
      // task 04 :44 — the same token inside a stripped comment does not fail it.
      const commented = door(`    ${SLASHES} await ptySpawn("claude", []); never — the door decides WHERE\n    ${block(' term.write() and driveInteractiveClaudeSession() belong to the driver ')}`);
      assert.deepEqual(doorProblems(DOOR, commented), [], "a spawn token inside a stripped comment reports nothing — code, not prose");
    },
  },
  {
    name: "arch/53 FF-5303 (acd-phase-door-not-a-driver): shipped doors remain decision-shaped while local drivers remain three-word executors",
    run: async () => {
      const fx = await loopFixture();
      try {
        const fake = completingDriver(fx);
        const ctx = { ...fx.ctx, agentSessionDriverOptions: fake.options };
        for (const phase of ["refine", "continue", "verify"]) {
          const door = getCommand(`work:${phase}`);
          assert.deepEqual(door.cli.route, ["work", phase]);
          const answer = await door.run({ ref: "03/01" }, ctx);
          assert.equal(typeof answer.command, "string");
          assert.ok(Object.hasOwn(answer, "where"), `${phase}: local decision carries where`);
          assert.equal(answer.where, "local");
          const driver = getCommand(`work:drive-${phase}`);
          assert.deepEqual(driver.cli.route, ["work", "drive", phase]);
          const dry = await driver.run({ ref: "03/01", dryRun: true }, ctx);
          assert.deepEqual(dry, { ref: "03/01", phase, command: `/aof:${phase} 03/01` });
        }
        assert.equal(fake.spawnCalls.length, 0, "all three dry-run driver probes make zero spawn calls through the declared seam");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "arch/53 FF-5303 (acd-phase-door-not-a-driver): the registry-derived route table keeps all seven phase doors collision-free, and a second claimant fails naming BOTH ids",
    run: async () => {
      const commands = listCommands();
      const table = deriveRouteTable(commands);
      assert.ok(table.size > 50, `the full registry was walked: ${table.size} routes`);
      for (const words of [["work", "loop"], ["work", "refine"], ["work", "continue"], ["work", "verify"], ["work", "drive", "refine"], ["work", "drive", "continue"], ["work", "drive", "verify"]]) {
        assert.equal(resolveRoute(words, commands)?.command?.id, words[1] === "drive" ? `work:drive-${words[2]}` : `work:${words[1]}`);
      }
      // task 04 :79 and its Examples row: the failure travels "through the derivation's own collision
      // error, NAMING BOTH IDS". `/collision/iu` proves only that something threw with that word in
      // it — an error naming neither claimant satisfies it, and the row is about WHICH two
      // commands collided.
      let collision = null;
      try {
        deriveRouteTable([...commands, { id: "planted:second-claimant", cli: { route: ["work", "drive", "continue"] } }]);
      } catch (error) {
        collision = error;
      }
      assert.ok(collision != null, "a second command claiming `work drive continue` must not derive silently");
      assert.match(collision.message, /collision/iu, "the derivation's own collision error is what refuses it");
      for (const id of ["work:drive-continue", "planted:second-claimant"]) {
        assert.ok(collision.message.includes(id), `the collision error names \`${id}\` — found ${JSON.stringify(collision.message)}`);
      }
      assert.match(collision.message, /work drive continue/u, "…and the three-word route both of them claimed");
    },
  },
  {
    name: "arch/53 FF-5303 (acd-phase-door-not-a-driver): the local driver module makes no where/node decision, and each planted decision is reported at its line",
    run: async () => {
      const driverSource = await readFile(path.join(root, DRIVER), "utf8");
      assert.ok(driverSource.length > 500, `NOT FOUND: ${DRIVER} read ${driverSource.length} characters — the driver module has moved, been renamed or was truncated, and no where/node decision was measured`);
      assert.deepEqual(driverProblems(DRIVER, driverSource), []);
      for (const { row, text, line, names } of [
        { row: "`assignWork(` in `src/commands/drive.mjs`", text: driver("    return assignWork(args.ref, ctx);"), line: 4, names: "assignWork" },
        { row: "a `where` field on a driver's return", text: driver('    return { where: "mesh", command: "/aof:continue" };'), line: 4, names: "where" },
        { row: "a `node` decision branch", text: driver('    if (args.node === "mac") return dispatch(args);'), line: 4, names: "node" },
      ]) {
        const found = driverProblems(DRIVER, text);
        assert.ok(found.length > 0, `${row}: the sweep reported nothing — this row plants a violation`);
        assert.ok(found.some((hit) => hit.startsWith(`${DRIVER}:${line} `)), `${row}: the report names the file AND line ${line} — found ${JSON.stringify(found)}`);
        assert.ok(found.some((hit) => hit.includes(names)), `${row}: the report names \`${names}\` — found ${JSON.stringify(found)}`);
      }
      assert.deepEqual(
        driverProblems(DRIVER, driver(`    ${SLASHES} return assignWork(args.ref, ctx); — the door decides where, never this`)),
        [],
        "a decision token inside a stripped comment reports nothing — code, not prose",
      );
    },
  },
];
