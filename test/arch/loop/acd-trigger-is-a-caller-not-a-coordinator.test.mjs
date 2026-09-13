// FF-6301 — the trigger layer is a CALLER, not a coordinator (63/ADR-001, ADR-003 §2, ADR-007 §3,
// ADR-011 §2).
//
// The failure this control exists to refuse is easy to name and easy to build by accident: a
// trigger layer that grows a scheduler, then a dispatcher, then a policy for what to do when two
// triggers fire at once — fleet-level orchestration arriving one noun at a time. So the claim is
// asserted as FOUR ABSENCES and ONE OUTPUT SHAPE, over `src/work-trigger/**` AND the face
// together, because the family only coordinates if some member of it does.
//
// ITS SIBLING IS A SEPARATE FILE ON PURPOSE. `acd-trigger-holds-no-clock` asks whether the family
// holds a clock or writes; this one asks whether it coordinates. The two fail for different
// reasons and their red probes mutate different things, so on one file one probe's red would be
// indistinguishable from the other's.
//
// EVERY BAN BELOW IS DRIVEN AGAINST A PLANTED VIOLATION in the same test that asserts it. A
// detector nobody has seen fire is a detector nobody knows works, and this milestone has already
// paid for a control that reported as enforced while holding nothing.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { functionBody, stripComments } from "../../support/source-slice.mjs";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
// The family and its import closure are ONE derivation, owned by the sibling row that walks it
// (`acd-trigger-holds-no-clock`) and read here. Sharing the derivation is not merging the claims:
// the two rows keep their own files and their own assertions, and a probe that reds one still
// leaves the other legible. A second brace-and-import walker written beside that one would be
// TECH_DEBT 24 and 57's species, in the milestone that indicts it.
import { CLOSURE, familySource } from "./acd-trigger-holds-no-clock.test.mjs";
import { getCommand, listCommands } from "../../../src/command-core.mjs";
import { resolveTriggerLevel } from "../../../src/work-trigger/level.mjs";
import { ASSIGNMENT_PHASES } from "../../../src/mesh/assignment-directive.mjs";
import { RESOLVED_TRIGGER_KEYS, LOOP_INPUT_KEYS, LEVEL_FLAG } from "../../../src/commands/trigger.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));

// The FAMILY: the face and every module under `src/work-trigger/`. Discovered by reading the
// directory rather than by a list kept here, so a fifth leaf cannot arrive uncovered.
const { readdirSync } = await import("node:fs");
const FAMILY = [
  "src/commands/trigger.mjs",
  ...readdirSync(`${root}/src/work-trigger`)
    .filter((name) => name.endsWith(".mjs"))
    .sort()
    .map((name) => `src/work-trigger/${name}`),
];

const sourceOf = (file) => stripComments(readFileSync(`${root}/${file}`, "utf8"));
const FAMILY_TEXT = FAMILY.map((file) => sourceOf(file)).join("\n");

const LOOP_ID = "work:loop";
const BOARD_UI = `${root}/src/board-ui.mjs`;
const ROUTE_COVERAGE = `${root}/test/arch/work/acd-work-command-route-coverage.test.mjs`;

// The three commands the family may reach, plus its own id. A `work:` literal outside this set is
// a phase driven, a slash command composed or a second door opened — all four of the things this
// row forbids, caught by one census rather than by four greps that each miss a spelling.
const PERMITTED_COMMAND_IDS = ["work:trigger", "work:loop", "work:doctor", "work:loops-groundedness"];

// Each ban, with the PLANT that proves the detector can fire. The plant is the shape a reasonable
// implementer would actually write, not a token chosen to match the regex.
const ABSENCES = [
  {
    what: "a process spawn or exec of any spelling",
    pattern: /\b(?:child_process|spawnSync|spawn|execFileSync|execFile|execSync|exec|fork)\b|node-pty/u,
    plants: [
      'import { spawn } from "node:child_process";',
      'const child = execFile("aof", argv);',
      'import { spawn } from "node-pty";',
    ],
  },
  {
    what: "the gate's threshold, or a groundedness component verdict this family decided for itself",
    pattern: /\b(?:100|L3_SCORE_THRESHOLD)\b|["'](?:self-referential|exogenous-only)["']/u,
    plants: [
      "if (loopReady.score >= 100) return admitted;",
      "const cleared = reading.score === L3_SCORE_THRESHOLD;",
      'const failing = components.filter((row) => row.verdict === "self-referential");',
    ],
  },
  {
    what: "a slash-command literal — the one spelling that would make a trigger a prompt author",
    pattern: /\/aof:/u,
    plants: ['const command = `/aof:autonomous ${ref}`;', 'return "/aof:refine " + ref;'],
  },
  {
    what: "a level literal, which is what an admission decided here would have needed",
    pattern: /["'](?:L1|L2|L3)["']/u,
    plants: ['if (level === "L3") return refused;', 'return { level: "L2" };'],
  },
];

// SPAWNING NEEDS A DOOR, and over the CLOSURE the door is what is banned rather than the word.
// The family's own four files carry the broad ban above — `\\bexec\\b` and every sibling spelling —
// because none of them holds a regex. The closure cannot: `src/feature-parse.mjs:183` and
// `src/work/loop.mjs:388` legitimately call `RegExp.prototype.exec`, so a word ban over eighteen
// files would red two modules that spawn nothing. What no spawn can do without is the IMPORT, and
// a bare call is the other half; both are asserted, and each is driven against a plant.
const CLOSURE_SPAWN = [
  {
    what: "a child-process or pty import — the door every spawn needs",
    pattern: /["'](?:node:)?child_process["']|["']node-pty["']/u,
    plants: ['import { spawnSync } from "node:child_process";', 'const cp = require("child_process");', 'import { spawn } from "node-pty";'],
  },
  {
    what: "a bare spawn, exec or fork call",
    pattern: /(?<![.\w$])(?:spawnSync|spawn|execFileSync|execFile|execSync|fork|exec)\s*\(/u,
    plants: ["const child = spawnSync(bin, args);", "execFile(bin, args, cb);", "const out = exec(cmd);"],
    // …and it must stay blind to the regex method, which is why the ban is not on the word.
    silentOn: ["const match = SCENARIO_RE.exec(line);", "/^(\\d+)/.exec(ref)?.[1]"],
  },
];

// The preload that turns "no process was started by it" into an OBSERVATION. A regex ban is a
// claim about text; this is a claim about what a run did. It patches every spawning entry point on
// the `child_process` module object BEFORE the CLI's own modules load, and appends a line per
// call — measured to be visible to `import { spawnSync } from "node:child_process"` as well as to
// `cp.spawnSync`, so a plain unobfuscated spawn in any module the face reaches is recorded.
const SPAWN_PRELOAD = `const cp = require("node:child_process");
const fs = require("node:fs");
const marker = process.env.AOF_TRIGGER_SPAWN_MARKER;
for (const name of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"]) {
  const original = cp[name];
  cp[name] = function patched(...args) {
    fs.appendFileSync(marker, name + " " + String(args[0]) + "\\n");
    return original.apply(this, args);
  };
}
`;

// --- a minimum JSON-schema check, for the ONE schema this row cares about ---------------------
// `work:loop`'s input declares `additionalProperties: false`, so the question "would this object
// be accepted" is answerable without a validator library: the required keys are present, every
// key is declared, and every value carries its declared type.
function validateAgainst(schema, value) {
  const problems = [];
  if (value === null || typeof value !== "object" || Array.isArray(value)) return ["not an object"];
  for (const key of schema.required ?? []) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) problems.push(`missing required key ${key}`);
  }
  for (const key of Object.keys(value)) {
    const declared = schema.properties?.[key];
    if (declared === undefined) {
      if (schema.additionalProperties === false) problems.push(`additional key ${key}`);
      continue;
    }
    const actual = Array.isArray(value[key]) ? "array" : typeof value[key];
    if (declared.type !== undefined && declared.type !== actual) problems.push(`${key} is ${actual}, not ${declared.type}`);
  }
  return problems;
}

// The `const BOARD_DEFERRED = new Set([ … ])` literal, cut on matching brackets rather than on a
// character window (TECH_DEBT item 24's species; `test/support/source-slice.mjs` is the one home
// for a structural cut and this file authors no second stripper).
function boardDeferredMembers() {
  const source = stripComments(readFileSync(ROUTE_COVERAGE, "utf8"));
  const at = source.indexOf("BOARD_DEFERRED");
  assert.notEqual(at, -1, "the route-coverage control declares BOARD_DEFERRED");
  const open = source.indexOf("[", at);
  const close = source.indexOf("]", open);
  assert.ok(open > 0 && close > open, "its member list is a bracketed literal");
  return source.slice(open + 1, close).split(",").map((entry) => entry.trim().replace(/^["']|["']$/gu, "")).filter(Boolean);
}

// EVERY ORDERING THE FAMILY PERFORMS, AS A CLOSED CENSUS. Gate arithmetic is a score put in an
// order — against a threshold, against another reading, against anything. So rather than guess at
// the spellings a score comparison could take, this reads every relational operator in the family
// and asserts what its left operand ENDS IN. Three tails are legitimate and they are the three the
// family actually has: an array length, a duration in milliseconds and a scope ordinal, both of
// the last two being operands `parseCadence` already carries for ADR-002 §3a's contradiction
// check. `if (loopReady.score > 90)` adds a fourth and fails, with no ban list to keep in step.
const ORDERABLE_TAILS = ["length", "ms", "scopeRank"];
const RELATIONAL = /(?<![=!<>])(<=?|>=?)(?!=)/gu;

function orderedOperands(text) {
  const tails = [];
  for (const match of text.matchAll(RELATIONAL)) {
    const before = text.slice(Math.max(0, match.index - 60), match.index);
    const path = /([A-Za-z_$][\w$.?[\]]*)\s*$/u.exec(before)?.[1] ?? before.trim().slice(-20);
    tails.push({ operator: match[1], path, tail: path.split(".").pop() });
  }
  return tails;
}

export const archTests = [
  {
    name: "architecture: FF-6301 the family is discovered rather than listed, and covers the face and every leaf",
    run: () => {
      // NON-VACUITY FIRST: every leg below is over `FAMILY_TEXT`, so a control reading an empty
      // or truncated family would pass every ban while holding nothing.
      assert.ok(FAMILY.length >= 4, `the family holds the face and every leaf (got ${FAMILY.join(", ")})`);
      assert.ok(FAMILY.includes("src/commands/trigger.mjs"), "the face is in the family");
      assert.ok(FAMILY.some((file) => file.startsWith("src/work-trigger/")), "and so are the leaves");
      for (const file of FAMILY) assert.ok(sourceOf(file).length > 200, `${file} has real source to assert over`);
    },
  },
  {
    name: "architecture: FF-6301 the family spawns nothing, holds no threshold or component verdict, authors no slash command and spells no level",
    run: () => {
      for (const ban of ABSENCES) {
        assert.doesNotMatch(FAMILY_TEXT, ban.pattern, `no module in the trigger family contains ${ban.what}`);
        // …and the detector fires on the shape a builder would actually have written.
        for (const plant of ban.plants) {
          assert.match(plant, ban.pattern, `the detector for ${ban.what} sees a planted "${plant}"`);
        }
      }
    },
  },
  {
    name: "architecture: FF-6301 every ordering the family performs is over a length, a duration or a scope ordinal — never over a gate reading",
    run: () => {
      const ordered = orderedOperands(FAMILY_TEXT);
      assert.ok(ordered.length >= 4, `the census found the orderings it asserts over (${ordered.length})`);
      for (const entry of ordered) {
        assert.ok(
          ORDERABLE_TAILS.includes(entry.tail),
          `\`${entry.path} ${entry.operator}\` orders a ${ORDERABLE_TAILS.join(", a ")} and nothing else — a gate reading put in an order is this row's whole subject`,
        );
      }
      // The detector fires on the shape a builder would actually write, in each of its plausible
      // spellings, so a green census is a census that could have gone red.
      for (const plant of [
        "if (facts.loopReady.score >= threshold) return admitted;",
        "const passes = reading.score > 99;",
        "if (gate.groundedness.components.failing >= 1) return refused;",
      ]) {
        const [entry] = orderedOperands(plant);
        assert.ok(entry != null, `the census sees the ordering in "${plant}"`);
        assert.equal(ORDERABLE_TAILS.includes(entry.tail), false, `and refuses it: ${entry.path}`);
      }
    },
  },
  {
    name: "architecture: FF-6301 nothing in the family's whole import CLOSURE can reach a process — no door, no call",
    run: () => {
      // The delivered ban was scoped to the family's own four files, which a spawn moved one
      // import away walks straight past: a new module the face imports needs no obfuscation at
      // all. The claim is therefore made over the closure the sibling row already walks.
      assert.ok(CLOSURE.length > FAMILY.length, `the closure walk really walked (${CLOSURE.length} files from ${FAMILY.length})`);
      for (const file of FAMILY) assert.ok(CLOSURE.includes(file), `${file} is inside the closure this leg asserts over`);
      for (const ban of CLOSURE_SPAWN) {
        for (const file of CLOSURE) {
          assert.doesNotMatch(familySource(file), ban.pattern, `${file} holds ${ban.what}`);
        }
        for (const plant of ban.plants) assert.match(plant, ban.pattern, `the detector for ${ban.what} sees a planted "${plant}"`);
        for (const quiet of ban.silentOn ?? []) assert.doesNotMatch(quiet, ban.pattern, `and stays blind to the regex method it must not ban: "${quiet}"`);
      }
    },
  },
  {
    name: "architecture: FF-6301 a real run of the face starts NO process — observed, not grepped",
    async run() {
      // "No process was started by it" is task 00's central claim and a static ban is not a
      // proof of it: a ban is a claim about text, and a path assembled from a variable resolves
      // somewhere no reader can see. So the CLI is run for real, under a preload that records
      // every child-process entry point the run touches, and the recording must be empty.
      const directory = await mkdtemp(path.join(os.tmpdir(), "aof-trigger-spawn-"));
      try {
        const preload = path.join(directory, "record-spawns.cjs");
        const marker = path.join(directory, "spawns.log");
        await writeFile(preload, SPAWN_PRELOAD, "utf8");
        await writeFile(marker, "", "utf8");
        const result = spawnCliSync(process.execPath, ["--require", preload, path.join(root, "bin", "aof.mjs"), "work", "trigger", "--json"], {
          cwd: root,
          encoding: "utf8",
          env: { ...process.env, NODE_NO_WARNINGS: "1", AOF_TRIGGER_SPAWN_MARKER: marker },
        });
        assert.equal(result.status, 0, `the run answers cleanly under the preload (stderr: ${result.stderr})`);
        const document = JSON.parse(result.stdout ?? "");
        assert.ok(document.resolved.length > 0, "and it really did resolve something, so the observation is over a run that did the work");
        const recorded = (await readFile(marker, "utf8")).split("\n").filter((line) => line.trim() !== "");
        assert.deepEqual(recorded, [], `no process was started by it — recorded: ${recorded.join(" | ")}`);

        // NON-VACUITY: the same preload, over a run that DOES spawn, records it. Without this the
        // empty log above would be indistinguishable from a preload that never loaded.
        const control = path.join(directory, "control.cjs");
        await writeFile(control, 'require("node:child_process").spawnSync(process.execPath, ["-e", "0"]);\n', "utf8");
        await writeFile(marker, "", "utf8");
        spawnCliSync(process.execPath, ["--require", preload, control], { cwd: directory, encoding: "utf8", env: { ...process.env, AOF_TRIGGER_SPAWN_MARKER: marker } });
        const seen = (await readFile(marker, "utf8")).split("\n").filter((line) => line.trim() !== "");
        assert.equal(seen.length, 1, `the preload records a spawn when one happens (got ${seen.length})`);
        assert.match(seen[0], /^spawnSync /u, "and names the entry point it saw");
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  },
  {
    name: "architecture: FF-6301 no phase is driven, and the family's command-id census is closed",
    run: () => {
      // A phase drive would spell a phase or reach `work:drive-<phase>`. Both are caught by one
      // closed census over the `work:` ids the family spells, read from the module that DECLARES
      // the phase vocabulary rather than retyped here.
      const ids = [...new Set([...FAMILY_TEXT.matchAll(/["'](work:[a-z:-]+)["']/gu)].map((match) => match[1]))].sort();
      assert.deepEqual(ids, [...PERMITTED_COMMAND_IDS].sort(), "the family spells its own id and the three commands it reaches, and no other");
      for (const phase of ASSIGNMENT_PHASES) {
        assert.doesNotMatch(FAMILY_TEXT, new RegExp(`["']${phase}["']`, "u"), `no member of the phase vocabulary is used as a directive (${phase})`);
        assert.doesNotMatch(FAMILY_TEXT, new RegExp(`work:drive-${phase}`, "u"), `and no phase driver is reached (${phase})`);
      }
      // The census is non-vacuous: it really did find ids, and a planted fifth would fail it.
      assert.ok(ids.length >= 4, "the census found the ids it asserts over");
      const planted = [...new Set([...`${FAMILY_TEXT}\nawait invoke("work:drive-verify", {}, ctx);`.matchAll(/["'](work:[a-z:-]+)["']/gu)].map((match) => match[1]))].sort();
      assert.notDeepEqual(planted, ids, "a planted phase-driver reach changes the census");
    },
  },
  {
    name: "architecture: FF-6301 the object the FACE projects carries the loop's input, the argv and ONE identity key",
    async run() {
      const { buildTriggerReport } = await import("../../../src/commands/trigger.mjs");
      const report = await buildTriggerReport({}, {
        workspace: { projectRoot: `${root}`, workDir: `${root}/wiki/work`, config: {} },
        trigger: {
          declaration: { version: 1, members: [{ id: "probe", protects: "a claim", source: "cron", scope: "63", level: "L1" }] },
          registry: { getCommand, invoke: async () => { throw new Error("no reading should be needed"); } },
        },
      });
      assert.equal(report.resolved.length, 1, "the probe resolves");
      const [row] = report.resolved;
      // POSITIVELY AND EXHAUSTIVELY: every key is `scope`, `level`, the argv carrying them, or the
      // one identity key naming the declaring member.
      assert.deepEqual(Object.keys(row).sort(), [...RESOLVED_TRIGGER_KEYS].sort(), "every key a resolved trigger emits is enumerated");
      const identityKeys = Object.keys(row).filter((key) => ![...LOOP_INPUT_KEYS, "argv"].includes(key));
      assert.deepEqual(identityKeys, ["trigger"], "exactly ONE identity key, and no other");
      assert.deepEqual(Object.keys(row.trigger).sort(), ["id", "source"], "it names the declaring member and carries no verdict");
      // The argv's leading tokens are the loop's own route, so a resolution that reached any other
      // command fails here rather than at review.
      const route = getCommand(LOOP_ID).cli.route;
      assert.deepEqual(row.argv.slice(0, route.length), [...route], "the argv's leading tokens are the loop's own route");
      assert.deepEqual([...route], ["work", "loop"], "which is `work loop`");

      // AND THE PROJECTION VALIDATES AGAINST `work:loop`'s OWN DECLARED INPUT.
      const projection = Object.fromEntries(LOOP_INPUT_KEYS.map((key) => [key, row[key]]));
      const schema = getCommand(LOOP_ID).input;
      assert.equal(schema.additionalProperties, false, "the loop's input is closed, which is what makes this leg decisive");
      assert.deepEqual(validateAgainst(schema, projection), [], "the projected object is one work:loop would accept");

      // …and the leaf's PRE-FLIGHT answer is not, which is why the face projects rather than
      // passing it through. Four of its keys are rejected by the schema before any gate runs.
      const leafAnswer = resolveTriggerLevel({ id: "probe", level: "L1" }, {});
      const rejected = validateAgainst(schema, leafAnswer);
      assert.ok(rejected.length >= 4, `the leaf's answer is rejected on four keys or more (${rejected.join("; ")})`);
      for (const key of ["triggerId", "resolved", "preflight", "resolvedFor", "gatedAgainAt"]) {
        assert.ok(rejected.some((problem) => problem.includes(key)), `the leaf's ${key} is an additional property work:loop refuses`);
      }
      // An anonymous resolved row could not answer the `--json` claim either.
      assert.equal(typeof row.trigger.id, "string", "and `--json` can say which trigger produced this argv");

      // EVERY FLAG TOKEN IS ONE `work:loop` DECLARES. The face's module comment claimed this pin
      // before it existed: renaming the loop's declared `level` flag left the face composing
      // `--level` — an argv the loop's own CLI refuses — with every control in this milestone
      // green. It is asserted in BOTH vocabularies, because they are two declarations that can
      // move independently: the flag the face spells must be a flag the loop's CLI parses, and
      // the key it carries must be a key the loop's input declares.
      const flags = getCommand(LOOP_ID).cli.spec.flags;
      const flagKey = (token) => token.slice(2).replace(/-([a-z])/gu, (_, letter) => letter.toUpperCase());
      assert.ok(LEVEL_FLAG.startsWith("--"), "the level flag is spelled as a flag");
      assert.ok(
        Object.prototype.hasOwnProperty.call(flags, flagKey(LEVEL_FLAG)),
        `${LEVEL_FLAG} is a flag work:loop declares — its vocabulary is {${Object.keys(flags).join(", ")}}`,
      );
      const tokens = row.argv.filter((token) => token.startsWith("--"));
      assert.ok(tokens.length > 0, "the composed argv really does carry a flag, so this leg has a subject");
      for (const token of tokens) {
        assert.ok(Object.prototype.hasOwnProperty.call(flags, flagKey(token)), `${token} is a flag work:loop declares`);
        assert.ok(Object.prototype.hasOwnProperty.call(schema.properties, flagKey(token)), `${token} carries a key work:loop's input declares`);
      }
      // NON-VACUITY: a token the loop declares neither is refused by the same reading.
      assert.equal(Object.prototype.hasOwnProperty.call(flags, flagKey("--wake-level")), false, "a flag the loop does not declare fails this reading");
    },
  },
  {
    name: "architecture: FF-6301 the gate readings are handed over UNCOERCED — no default stands between the registry's answer and the leaf",
    run: () => {
      // ADR-011 §3's whole subject, and it is asserted STRUCTURALLY because today it cannot be
      // asserted any other way: `src/work-trigger/level.mjs:145` reads `undefined`, `null` and
      // absent as one answer, so `value ?? null` at this seam changes no observable outcome — it
      // passed the entire suite when it was planted. The day ADR-010 §11's distinction is taught
      // to the leaf, a face quietly written back to `?? null` sits on the wrong side of the exit
      // boundary with nothing red. So the hand-over is pinned as the statement it must be.
      const face = sourceOf("src/commands/trigger.mjs");
      const gather = functionBody(face, "async function gatherGateReadings(");
      assert.ok(gather != null, "gatherGateReadings is where the two readings are obtained, and its body was found");
      const normalised = gather.replace(/\s+/gu, " ");
      const HANDOVER = "const value = reading.read(answer); facts[reading.fact] = value;";
      assert.ok(
        normalised.includes(HANDOVER),
        `the reading is handed over exactly as it came back — expected "${HANDOVER}" in the gather`,
      );
      // …and the two accessors that produce that value carry no default of their own.
      const table = /const GATE_READINGS = freeze\(\[([\s\S]*?)\]\);/u.exec(face)?.[1];
      assert.ok(table != null, "the GATE_READINGS table was found");
      assert.equal((table.match(/read:/gu) ?? []).length, 2, "it declares exactly the two readings work:loop gathers");
      assert.doesNotMatch(table, /\?\?|\|\|/u, "and neither accessor defaults the reading it returns");

      // DRIVEN AGAINST PLANTS — every shape the species takes at this seam, including the two
      // that were measured to pass the whole suite.
      for (const plant of [
        "const value = reading.read(answer); facts[reading.fact] = value ?? null;",
        "const value = reading.read(answer); facts[reading.fact] = value || {};",
        "const value = reading.read(answer); facts[reading.fact] = value === undefined ? null : value;",
        "const value = reading.read(answer);",
      ]) {
        assert.equal(plant.includes(HANDOVER), false, `the pin refuses "${plant}"`);
      }
      for (const plant of ["read: (answer) => answer?.loopReady ?? null,", "read: (answer) => answer ?? {},"]) {
        assert.match(plant, /\?\?|\|\|/u, `the accessor ban sees a planted "${plant}"`);
      }
    },
  },
  {
    name: "architecture: FF-6301 work:trigger declares no cli.launch and is a documented BOARD_DEFERRED member",
    run: () => {
      const command = getCommand("work:trigger");
      assert.ok(command != null, "work:trigger is registered");
      // Asserted from the registered command OBJECT rather than from source text: a launcher body
      // is a property of the registration, and a comment saying there is none is not a control.
      assert.equal(Object.prototype.hasOwnProperty.call(command.cli, "launch"), false, "work:trigger declares no cli.launch");
      assert.equal(command.cli.launch, undefined, "so the face's launcher seam is never consulted for it");
      // …and it is board-deferred, which is what keeps a page load from walking the work tree.
      assert.ok(boardDeferredMembers().includes("trigger"), "trigger is a documented BOARD_DEFERRED member");
      assert.doesNotMatch(stripComments(readFileSync(BOARD_UI, "utf8")), /\/api\/work\/trigger/u, "and no /api/work/trigger route is served");
      // Non-vacuity for the deferral read: the set really was parsed, and it holds its siblings.
      for (const sibling of ["acceptor", "audit", "grade", "tune"]) {
        assert.ok(boardDeferredMembers().includes(sibling), `the parsed set holds ${sibling}, so it is the real one`);
      }
      // The registry's other launcher verbs still declare theirs, so "no launch" is a fact about
      // this command rather than about how the assertion is written.
      assert.ok(listCommands().some((entry) => typeof entry.cli?.launch === "function"), "other commands do declare a launcher body");
    },
  },
  {
    name: "architecture: FF-6301 no family module statically imports the registry, proven one FRESH PROCESS per module",
    run: () => {
      // The static-import ban covers the WHOLE family, not the face alone: a leaf closes the
      // registry ring exactly as well as a face does (62/ADR-013 §2). A fresh process per module
      // is the only probe that sees this class, because every suite in this tree reaches these
      // modules through a warmed cache.
      assert.doesNotMatch(FAMILY_TEXT, /^import[^\n]*command-core\.mjs/mu, "no family module imports the registry at module scope");
      assert.match(sourceOf("src/commands/trigger.mjs"), /await import\("\.\.\/command-core\.mjs"\)/u, "the face reaches it through a deferred dynamic import");
      for (const file of [...FAMILY, "src/command-core.mjs"]) {
        const url = pathToFileURL(`${root}/${file}`).href;
        const child = spawnSync(process.execPath, ["--input-type=module", "--eval", `await import(${JSON.stringify(url)})`], {
          cwd: root,
          encoding: "utf8",
        });
        assert.equal(child.status, 0, `${file} imports cleanly in a fresh process: ${child.stderr}`);
      }
    },
  },
];
