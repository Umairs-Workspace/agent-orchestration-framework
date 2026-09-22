// FF-13001 + FF-13003 — THE REQUEST HAS ONE HOME, AND THE VERB IS A PROBE-SHAPED WRITE THROUGH
// ONE FUNCTION (milestone 130 / story 05; ARCHITECTURE `## Fitness functions`, ADR-001 and
// ADR-002). Which of this directory's three subjects: the RECORD — the stop request is a file
// beside the loop's other home-side records, and these are the controls on who may spell its
// path, its state words and its write.
//
// FF-13001, structural. Over a comment-stripped sweep of `src/**` the segment literal
// `loop-stops` and the state literals `"requested"`/`"honoured"` — AS A STOP-REQUEST STATE —
// appear only in `src/loop/stop-request.mjs`; the four readers of the request (`src/loop/stop.mjs`,
// `src/commands/loop.mjs`, `src/mesh/declarations.mjs`, `src/mesh/presence.mjs`) each import that
// module by RESOLVED specifier (through `test/support/module-family.mjs`, FF-11901's one
// extractor) and contain no `path.join(` whose arguments name `meshRoot` beside a `loop`
// literal; the shell contains no `writeFile(` / `mkdir(` / `rename(` call form (FF-5307 cited)
// and registers no `process.once(`/`process.on(` for a signal; no `src/**` module matches
// `*loop*-store.mjs` (FF-5307's own pattern). NON-VACUOUS: the sweep finds the module and at
// least four importers, and reds when it finds none.
//
//   "AS A STOP-REQUEST STATE" is measured, not inferred: `"requested"` is a word this tree spells
//   in five unrelated vocabularies (a recover-push state, a resync state, a package state, a
//   continue-phase word — measured 2026-09-21), so the state sweep is scoped to the modules that
//   CARRY the request — the home and every module that imports it, or that spells the segment
//   literal — while `"honoured"` (a word only this vocabulary uses) is swept over the whole of
//   `src/**`. A consumer that reads `record.state === "honoured"` instead of `STOP_STATES.honoured`
//   is the defect this leg exists to name (130/01's review close, the reason `STOP_STATES` exists).
//
// FF-13003, fixture then structural. Over the loop fixture with a live declaration,
// `getCommand("work:loop").run({ scope, stop: true }, ctx)` leaves exactly ONE new file under
// `<home>/mesh/loop-stops/`, leaves the project tree unchanged, spawns nothing, and answers the
// seven-key document in its frozen order; a second call answers `request: "cancel"` and the file
// reads `level: 2`; a call with no declaration rejects with code `loop-stop-no-declaration`; the
// probe (`run({ scope })`) still answers its ten keys (FF-5304 cited). Structurally `stop` is a
// key of the closed input schema and of `cli.spec.flags`, appears in `cli.argv`'s body,
// `cli.launch`'s predicate names `options.stop`, and `stopLoop` is defined in `src/loop/stop.mjs`
// and imported by EXACTLY `src/commands/loop.mjs` and `src/mesh/ui-serve.mjs` — the CLI face and
// the fleet route reach one core below the command layer (38/ADR-012), and a route that
// re-implemented the read would be a second home for the resolution.
//
// Every sweep reports what it read (a rename, a moved directory or a truncated read must fail
// here rather than pass vacuously); every cut is on the language's own structure through
// `test/support/source-slice.mjs` (F-47-04-ARCH-2: no character windows, no sentinel ends).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCommand } from "../../../src/command-core.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";
import { matchedBraceBody, matchedParenSpan, stripComments, topLevelArguments } from "../../support/source-slice.mjs";
import {
  completingDriver,
  loopFixture,
  loopStopsFiles,
  resetLoopStops,
  treeFiles,
  writeDeclarationRun,
} from "../../loop/loop-command-probe.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const toPosix = (value) => String(value).split(path.sep).join("/");

// THE HOME, and the four readers ADR-001 names. The needle is the module's repo-relative path as
// a resolved specifier lands on it — misspell it and zero importers resolve, which the non-vacuity
// leg reds on rather than passing over.
const HOME = "src/loop/stop-request.mjs";
const SEGMENT = "loop-stops";
const READERS = Object.freeze(["src/loop/stop.mjs", "src/commands/loop.mjs", "src/mesh/declarations.mjs", "src/mesh/presence.mjs"]);
const SHELL = "src/commands/loop.mjs";
const CORE = "src/loop/stop.mjs";
const CORE_IMPORTERS = Object.freeze(["src/commands/loop.mjs", "src/mesh/ui-serve.mjs"]);
const STATE_WORDS = Object.freeze(['"requested"', '"honoured"', "'requested'", "'honoured'"]);
// The seven keys of the verb's document (ADR-002 §4) and the ten of the probe (FF-5304).
const DOCUMENT_KEYS = Object.freeze(["ok", "loopRunId", "scope", "live", "request", "state", "path"]);
const PROBE_KEYS = Object.freeze(["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven"]);
const STORE_PATTERN = /(?:^|[-/\\])loop(?:[-/\\].*)?[-]store\.mjs$/u; // FF-5307's own
const WRITE_CALL_FORM = /\b(?:writeFile|mkdir|rename)\s*\(/u; // FF-5307's own
const SIGNAL_LISTENER = /\bprocess\s*\.\s*(?:once|on)\s*\(\s*["'`]SIG/u;

function assertRead(what, count, floor, unit = "file(s)") {
  assert.ok(count >= floor, `NOTHING WAS READ: ${what} walked ${count} ${unit}, below its floor of ${floor} — a rename, a moved directory or a truncated read must fail here rather than pass vacuously over an empty sweep`);
}

// A specifier resolved against its importer, as a repo-relative posix path; a package or a
// builtin stays as spelled. `.mjs` is appended when the specifier omits it, so the two spellings
// of one module resolve to one needle.
function resolved(fromRel, specifier) {
  if (specifier.startsWith("node:") || !specifier.startsWith(".")) return specifier;
  const joined = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), specifier));
  return joined.endsWith(".mjs") ? joined : `${joined}.mjs`;
}

// ONE read of `src/**`, comment-stripped: `[{ rel, code, raw }]` with `rel` repo-relative posix.
async function srcUnits() {
  const units = [];
  for (const file of await readSrcFiles(repoRoot)) {
    const raw = await readFile(file.path, "utf8");
    units.push({ rel: `src/${toPosix(file.rel)}`, raw, code: stripComments(raw) });
  }
  return units;
}

// The modules whose resolved specifiers reach `target`, from the comment-stripped source (the
// extractor strips again, harmlessly). PURE over units, so the non-vacuity probe can misspell the
// needle and watch the answer go to zero.
export function importersOf(units, target) {
  return units
    .filter(({ rel, code }) => importSpecifiers(code).some(({ specifier }) => resolved(rel, specifier) === target))
    .map(({ rel }) => rel);
}

// Every `path.join(` call in `code` whose arguments name `meshRoot` beside a quoted literal that
// carries `loop` — the spelling a second home for the request would take. The call's arguments
// are cut by matching parens and split at depth-0 commas (never a regex over the call), so a
// nested call or an options object cannot hide or fake a match.
export function meshRootLoopJoins(code) {
  const found = [];
  for (const match of code.matchAll(/\bpath\s*\.\s*join\s*\(/gu)) {
    const span = matchedParenSpan(code, match.index);
    if (span == null) continue;
    const args = topLevelArguments(span.body);
    const namesMeshRoot = args.some((arg) => /\bmeshRoot\b/u.test(arg));
    const loopLiteral = args.some((arg) => /^["'`][^"'`]*loop[^"'`]*["'`]$/u.test(arg.trim()));
    if (namesMeshRoot && loopLiteral) found.push(`path.join(${span.body.trim()})`);
  }
  return found;
}

export const archTests = [
  {
    name: "arch/130 FF-13001 (acd-loop-stop-request-single-home): the request has ONE home — the segment literal and the state words are spelled in src/loop/stop-request.mjs and nowhere else under src/**, and no loop store exists",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const home = units.find(({ rel }) => rel === HOME);
      assert.ok(home != null && home.code.includes(SEGMENT), `NOT FOUND: ${HOME} does not exist or does not spell ${JSON.stringify(SEGMENT)} — the sweep must find the module before it can claim its home is the only one`);

      // THE SEGMENT LITERAL — once, in the home.
      const segmentSpellers = units.filter(({ code }) => code.includes(SEGMENT)).map(({ rel }) => rel);
      assert.deepEqual(segmentSpellers, [HOME], `the literal ${JSON.stringify(SEGMENT)} and the state literals "requested"/"honoured" (as a stop-request state) appear only in src/loop/stop-request.mjs — spelled by: ${segmentSpellers.join(", ")}. A module that composes the request's path itself is a second home for the request (ADR-001 §1); read the path through loopStopsDir()/stopRequestPath() instead`);

      // THE STATE WORDS — `"honoured"` anywhere in src/** is this vocabulary; `"requested"` is
      // measured only over the modules that carry the request (see the file comment).
      const carriers = new Set([HOME, ...importersOf(units, HOME), ...segmentSpellers]);
      const stateSpellers = [];
      for (const { rel, code } of units) {
        const spelled = STATE_WORDS.filter((word) => code.includes(word));
        if (spelled.length === 0 || rel === HOME) continue;
        const honoured = spelled.some((word) => word.includes("honoured"));
        if (honoured || carriers.has(rel)) stateSpellers.push(`${rel} spells ${spelled.join(" and ")}`);
      }
      assert.deepEqual(stateSpellers, [], `the literal ${JSON.stringify(SEGMENT)} and the state literals "requested"/"honoured" (as a stop-request state) appear only in src/loop/stop-request.mjs — ${stateSpellers.join("; ")}. Read the word through STOP_STATES (130/01's export) rather than spelling it`);

      // NO SIDECAR STORE — FF-5307's own pattern, over the same walk.
      const stores = units.filter(({ rel }) => STORE_PATTERN.test(rel)).map(({ rel }) => rel);
      assert.deepEqual(stores, [], `no src/** module matches *loop*-store.mjs — the request rides one file under the aof home, never a store (ADR-006 §2): ${stores.join(", ")}`);
    },
  },
  {
    name: "arch/130 FF-13001 (acd-loop-stop-request-single-home): the four readers import the home by RESOLVED specifier and compose no path of their own, and the shell writes nothing and listens for no signal",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const importers = importersOf(units, HOME);
      for (const reader of READERS) {
        assert.ok(importers.includes(reader), `${reader} imports src/loop/stop-request.mjs by RESOLVED specifier (through module-family.mjs) — importers found: ${importers.join(", ") || "none"}`);
      }
      // …and none of the four spells `meshRoot` beside a `loop` literal in a `path.join(`.
      for (const reader of READERS) {
        const unit = units.find(({ rel }) => rel === reader);
        assert.ok(unit != null, `NOT FOUND: ${reader}`);
        const joins = meshRootLoopJoins(unit.code);
        assert.deepEqual(joins, [], `${reader} contains no path.join( whose arguments name meshRoot beside a loop literal — found: ${joins.join(" | ")}. The request's path has one home (ADR-001 §1): loopStopsDir()`);
      }
      // SELF-CHECK — the join detector sees the planted spelling the register's red probe names,
      // and stays quiet on the home's own composition (a const segment, not a literal).
      assert.equal(meshRootLoopJoins('const p = path.join(globalMeshPaths().meshRoot, "loop-stops", id);').length, 1, "self-check: the planted `path.join(globalMeshPaths().meshRoot, \"loop-stops\", id)` is seen");
      assert.equal(meshRootLoopJoins('const p = path.join(globalMeshPaths({ env }).meshRoot, STOPS_SEGMENT);').length, 0, "self-check: the home's own `path.join(…meshRoot, STOPS_SEGMENT)` carries no literal and is not flagged");
      assert.equal(meshRootLoopJoins('const p = path.join(root, "loops", "x.md");').length, 0, "self-check: a loop literal WITHOUT meshRoot is another subject's path");

      // THE SHELL — no write call form (FF-5307 cited), no signal listener of its own (ADR-003).
      const shell = units.find(({ rel }) => rel === SHELL);
      assert.ok(shell != null, `NOT FOUND: ${SHELL}`);
      assert.doesNotMatch(shell.code, WRITE_CALL_FORM, "src/commands/loop.mjs contains no writeFile( / mkdir( / rename( call form — every write to the request goes through stop-request.mjs's exports (FF-5307's leg holds as written)");
      assert.doesNotMatch(shell.code, SIGNAL_LISTENER, "src/commands/loop.mjs contains no process.once( or process.on( whose first argument starts with SIG — the source owns the listeners (ADR-001 §5, ADR-003 §1)");
      assert.equal(SIGNAL_LISTENER.test('process.once("SIGINT", () => { interrupted = "SIGINT"; });'), true, "self-check: the pre-130 `process.once(\"SIGINT\"` shape is seen");
    },
  },
  {
    name: "arch/130 FF-13001 (acd-loop-stop-request-single-home): NON-VACUOUS — the sweep finds the module and at least four importers, and reds when it finds none",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const home = units.find(({ rel }) => rel === HOME);
      const importers = importersOf(units, HOME);
      assert.ok(
        home != null && importers.length >= READERS.length,
        `the sweep finds the module and at least four importers: ${HOME} ${home == null ? "was NOT found" : "found"}, ${importers.length} importer(s) resolved (${importers.join(", ") || "none"}) — a needle that resolves to nothing is a guard asserting over the empty set, not a clean tree`,
      );
      // The self-check drives the same function over a planted unit whose specifier misspells
      // the home, so the answer is shown to go to zero rather than assumed to.
      const planted = [{ rel: "src/x.mjs", code: 'import { readStopRequest } from "./loop/stop-requests.mjs";' }];
      assert.equal(importersOf(planted, HOME).length, 0, "self-check: a misspelled specifier resolves to no importer");
      assert.equal(importersOf([{ rel: "src/x.mjs", code: 'import { readStopRequest } from "./loop/stop-request.mjs";' }], HOME).length, 1, "self-check: the right specifier resolves");
    },
  },
  {
    name: "arch/130 FF-13003 (acd-loop-stop-request-single-home): fixture — run({ scope, stop: true }) is a probe-shaped write: one new file under <home>/mesh/loop-stops/, the project tree unchanged, zero spawns, the seven keys; a second call cancels; no declaration refuses by code; the probe keeps its ten keys",
    run: async () => {
      await resetLoopStops();
      const fx = await loopFixture({ mesh: { nodeId: "umamis-msi" } });
      try {
        await writeDeclarationRun(fx, { state: "running", at: new Date().toISOString() });
        const fake = completingDriver(fx);
        const ctx = { ...fx.ctx, agentSessionDriverOptions: fake.options };
        const before = await treeFiles(fx.projectRoot);
        assertRead(`the fixture tree at ${fx.projectRoot}`, before.length, 3);
        const stopsBefore = await loopStopsFiles();
        const command = getCommand("work:loop");

        const first = await command.run({ scope: "03", stop: true }, ctx);
        assert.deepEqual(Object.keys(first), [...DOCUMENT_KEYS], "the verb answers a document whose keys deep-equal the seven, in order");
        assert.equal(first.ok, true);
        assert.equal(first.loopRunId, "L1");
        assert.equal(first.live, true, "a running, fresh declaration is live");
        assert.equal(first.request, "drain", "the first request drains");
        assert.equal(first.state, "requested");
        const stopsAfter = await loopStopsFiles();
        assert.equal(stopsAfter.length - stopsBefore.length, 1, `exactly ONE new file under <home>/mesh/loop-stops/: before ${JSON.stringify(stopsBefore)}, after ${JSON.stringify(stopsAfter)}`);
        assert.deepEqual(stopsAfter, [...stopsBefore, "L1.json"], "…the request keyed by the loop's id");
        assert.deepEqual(await treeFiles(fx.projectRoot), before, "treeFiles(projectRoot) is unchanged — the verb mints and rewrites nothing under the project tree");
        assert.equal(fake.spawnCalls.length, 0, "the fake driver's spawnCalls stays at 0 — nothing launches");
        assert.ok(first.path.endsWith(`${path.sep}L1.json`) || first.path.endsWith("/L1.json"), `the document's path names the file: ${first.path}`);

        const second = await command.run({ scope: "03", stop: true }, ctx);
        assert.deepEqual(Object.keys(second), [...DOCUMENT_KEYS]);
        assert.equal(second.request, "cancel", "a second call answers request: cancel");
        const file = JSON.parse(await readFile(second.path, "utf8"));
        assert.equal(file.level, 2, "…and the file reads level: 2");
        assert.equal(file.state, "requested");
        assert.equal((await loopStopsFiles()).length - stopsBefore.length, 1, "the escalation rewrote the one file rather than adding a second");
        assert.deepEqual(await treeFiles(fx.projectRoot), before, "still nothing under the project tree");
        assert.equal(fake.spawnCalls.length, 0);

        // The PROBE is byte-identical in shape: `run({ scope })` still answers the ten keys.
        const probe = await command.run({ scope: "03" }, ctx);
        assert.deepEqual(Object.keys(probe), [...PROBE_KEYS], "run({ scope }) still answers the ten keys (FF-5304 cited)");
        assert.equal(fake.spawnCalls.length, 0);
      } finally {
        await fx.cleanup();
      }

      // NO DECLARATION — a fresh fixture with no run carrying one rejects by code, writes nothing.
      await resetLoopStops();
      const bare = await loopFixture({ mesh: { nodeId: "umamis-msi" } });
      try {
        const fake = completingDriver(bare);
        const ctx = { ...bare.ctx, agentSessionDriverOptions: fake.options };
        const before = await treeFiles(bare.projectRoot);
        await assert.rejects(
          getCommand("work:loop").run({ scope: "03", stop: true }, ctx),
          (error) => error?.code === "loop-stop-no-declaration",
          "a call with no declaration rejects with code loop-stop-no-declaration",
        );
        assert.deepEqual(await loopStopsFiles(), [], "…and writes no request");
        assert.deepEqual(await treeFiles(bare.projectRoot), before);
        assert.equal(fake.spawnCalls.length, 0);
      } finally {
        await bare.cleanup();
      }
    },
  },
  {
    name: "arch/130 FF-13003 (acd-loop-stop-request-single-home): structural — stop is a key of the closed schema and of cli.spec.flags, appears in cli.argv's body, and cli.launch's predicate names options.stop",
    run: async () => {
      const command = getCommand("work:loop");
      assert.deepEqual(command.input.properties.stop, { type: "boolean" }, "stop is a key of the closed input schema");
      assert.equal(command.input.additionalProperties, false, "…and the schema is closed");
      assert.equal(command.cli.spec.flags.stop?.type, "boolean", "stop is a key of cli.spec.flags");
      assert.deepEqual(command.cli.argv(["03"], { stop: true }), { scope: "03", stop: true }, "cli.argv maps the flag");
      assert.deepEqual(command.cli.argv(["03"], {}), { scope: "03" }, "…and only when it is passed");

      const shell = stripComments(await readFile(path.join(repoRoot, SHELL), "utf8"));
      const argvAt = shell.indexOf("argv: (positionals, options) =>");
      assert.ok(argvAt >= 0, `NOT FOUND: ${SHELL} — cli.argv's arrow header`);
      const argvBody = matchedBraceBody(shell, argvAt);
      assert.ok(argvBody != null, "cli.argv's body was cut structurally");
      assert.match(argvBody, /\boptions\s*\.\s*stop\b/u, "stop appears in cli.argv's body — the flag lands in all three homes or does not exist (126/ADR-002 §6)");

      // THE LAUNCH PREDICATE: the text of the arrow up to its `?` is the predicate, and it names
      // `options.stop` — a `--stop` never enters the foreground body (ADR-002 §1).
      const launchAt = shell.indexOf("launch: (options) =>");
      assert.ok(launchAt >= 0, `NOT FOUND: ${SHELL} — cli.launch's arrow header`);
      const ternaryAt = shell.indexOf("?", launchAt);
      assert.ok(ternaryAt > launchAt, "cli.launch is a ternary over its options");
      const predicate = shell.slice(launchAt, ternaryAt);
      assert.match(predicate, /\boptions\s*\.\s*stop\s*===\s*true\b/u, `cli.launch's predicate names options.stop — a --stop stays on the probe side exactly as --dry-run does (ADR-002 §1); the predicate reads: ${predicate.trim()}`);
      assert.equal(command.cli.launch({ stop: true }), null, "…and behaves so: launch({ stop: true }) answers null");
      assert.equal(command.cli.launch({ dryRun: true }), null);
      assert.equal(typeof command.cli.launch({}), "function");
      // `run` dispatches on the flag alone — the probe is not edited (ADR-002 §2).
      // 129 gate (2026-09-22): `async` admitted — command-core/00 pins every registered `run` as an AsyncFunction.
      assert.match(shell, /run:\s*(?:async\s+)?\(input,\s*ctx\)\s*=>\s*\(input\?\.stop === true \? stopLoopCommand\(input, ctx\) : probeLoop\(input, ctx\)\)/u, "run dispatches: stop: true is the verb, otherwise the byte-identical probe");
    },
  },
  {
    name: "arch/130 FF-13003 (acd-loop-stop-request-single-home): structural — stopLoop is defined in src/loop/stop.mjs and imported by exactly src/commands/loop.mjs and src/mesh/ui-serve.mjs",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const core = units.find(({ rel }) => rel === CORE);
      assert.ok(core != null, `NOT FOUND: ${CORE}`);
      assert.match(core.code, /\bexport\s+async\s+function\s+stopLoop\s*\(/u, "stopLoop is defined in src/loop/stop.mjs — the one core below the command layer (ADR-002 §3)");
      // THE IMPORTERS, by resolved specifier, each naming the binding: the command and the route.
      const importers = importersOf(units, CORE).filter((rel) => /\bstopLoop\b/u.test(units.find((unit) => unit.rel === rel).code)).sort();
      assert.deepEqual(
        importers,
        [...CORE_IMPORTERS].sort(),
        `stopLoop is defined in src/loop/stop.mjs and imported by exactly src/commands/loop.mjs and src/mesh/ui-serve.mjs — importers found: ${importers.join(", ") || "none"}. A face that re-implements the declaration read is a second home for the stop's resolution (38/ADR-012: a second CALLER of the SAME core, never a re-implementation)`,
      );
      // Neither face reaches the request's writer directly: the route composes no request.
      const route = units.find(({ rel }) => rel === "src/mesh/ui-serve.mjs");
      assert.doesNotMatch(route.code, /\b(?:requestLoopStop|readLoopDeclaration)\s*\(/u, "the fleet route calls stopLoop and never requestLoopStop( or readLoopDeclaration( itself");
    },
  },
];
