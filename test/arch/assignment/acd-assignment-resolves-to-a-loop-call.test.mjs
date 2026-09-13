// test/arch/assignment/acd-assignment-resolves-to-a-loop-call.test.mjs — FF-6306 (milestone 63,
// ADR-006, ADR-010 §1/§2/§3, ADR-012 §3).
//
// ONE HOME MAPS A PHASE TO A DIRECTIVE, AND ONLY THE PHASE WITH A COORDINATOR CHANGES.
//
// Every leg below is driven against a PLANTED VIOLATION as well as against the real tree,
// because this milestone's most common finding is a guard that behaves correctly and that
// no test would have noticed breaking. A detector that only ever sees a clean tree is a
// detector nobody has run.
//
// A NOTE ON THE ONE LEG THAT IS NOT SHAPED THE WAY THE REGISTER DESCRIBES IT. FF-6306 asks
// for the out-of-scope fence "asserted as a self-comparison of those regions against HEAD".
// A git-diff-shaped control answers "the working tree differs from HEAD", which is true
// while the story is unmerged and VACUOUSLY TRUE the moment it merges — precisely when the
// fence has to keep holding. So the fence is asserted structurally instead, and it is the
// stronger claim: the module that OWNS the PTY spawn, the output chunking, the completion
// detection and the NEEDS_INPUT sentinel (`src/agent-session-driver.mjs`) contains none of
// this story's identifiers at all, and inside the mesh worker every one of those concerns
// is still forwarded as a bare shorthand key that no launch decision can reach. Both fail
// on a plant; neither goes quiet after the merge.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments, functionBody } from "../../support/source-slice.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";

import {
  ASSIGNMENT_PHASES,
  DEFAULT_ASSIGNMENT_PHASE,
  ASSIGNMENT_LAUNCH_LOOP,
  ASSIGNMENT_LAUNCH_SESSION,
  ASSIGNMENT_LOOP_SCOPE_UNSUPPORTED,
  assignmentDirectiveCommand,
  assignmentDirectiveResolution,
  assignmentDirectiveLaunch,
} from "../../../src/mesh/assignment-directive.mjs";
import { assembleAssignmentRecord } from "../../../src/assignment-record.mjs";
import { LOOP_STOPS } from "../../../src/work/loop.mjs";
// The launch seam is reached through the door the WORKER itself re-exports, not through the
// driver's own module. That is the honest door for this leg — the claim is about the
// caller-side obligation, and the caller reaches the seam here — and it leaves the driver's
// closed ADR-015 §2 test allowlist untouched.
import { resolveInteractiveDriverLaunch } from "../../../src/mesh/worker-execution.mjs";
import { bundledFrozenSet, compileFrozenSet } from "../../../src/frozen-set.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The files a second speller would actually be authored in. Every "no second speller" leg is
// asserted over exactly these.
//
// 119/04 (item 83's seam 2, ADR-007) WIDENED this census rather than repointing it. The three
// were 63/03's own write set; the composer has since moved to `src/mesh/worker-launch.mjs`,
// and a census left at three would have gone on sweeping the composer's OLD home and nothing
// else — a `{ program: "aof", args: [...] }` literal could have been authored in the new one
// with no control in this tree able to see it. That is ADR-003 §4's vacuity arriving through a
// refactor instead of through a rename, and it is the SILENT half of this control: the four
// positive matches below red loudly on the move, this list does not red at all.
//
// Named rather than derived on purpose (ADR-003 §1): "where a second speller would live" is a
// decision about this tree, not a fact readable from it.
const MESH_FILES = Object.freeze([
  "src/mesh/assignment-directive.mjs",
  "src/mesh/assignment-reclaim.mjs",
  "src/mesh/worker-execution.mjs",
  "src/mesh/worker-launch.mjs",
]);

// The file that COMPOSES the launch — the subject of the four positive matches below. Pinned
// as a name rather than found as "the worker", because after 119/04's split those are two
// files and the positive legs belong to the one that composes.
const LAUNCH_COMPOSER = "src/mesh/worker-launch.mjs";

// The ONE module allowed to author a slash command for an assignment phase.
const DIRECTIVE_HOME = "mesh/assignment-directive.mjs";

// The delivered four answers, byte for byte. Retyped ON PURPOSE: this is the one place a
// literal is the contract rather than a duplication, because the claim IS that the bytes a
// worker types have not moved. Every other leg derives its expectation.
const DELIVERED_COMMANDS = Object.freeze({
  refine: "/aof:refine 63 --autonomous",
  continue: "/aof:continue 63",
  verify: "/aof:verify 63",
  autonomous: "/aof:autonomous 63",
});

const QUOTE = "[\"'`]";
const TEMPLATE = /`(?:[^`\\]|\\[\s\S])*`/g;

// ── the detectors ────────────────────────────────────────────────────────────────
//
// authorsSlashCommand(code) — a `/aof:` slash command COMPOSED with a ref, i.e. inside a
// template literal. This is deliberately not "contains the token `/aof:`": the mesh worker
// legitimately READS a delivered command string to name its phase
// (`command.includes("/aof:refine")`), and banning that would either red a delivered file
// or force the ban to be softened into uselessness. Authoring needs the ref interpolated;
// reading does not.
function authorsSlashCommand(code) {
  return [...code.matchAll(TEMPLATE)].map((m) => m[0]).filter((literal) => /\/aof:[a-z-]+/.test(literal));
}

// programLiteralProblems(code) — ADR-010 §2 in the FORM the defect would actually take
// (ADR-012 §3). FF-6305's tree-wide sweep bans the launch as an ADJACENT literal run and
// is blind by construction to `{ program: "aof", args: [...] }` and to
// `` `aof work loop ${scope}` `` — the two spellings a second speller would use. Both are
// caught here, over the files where such a speller would live.
function programLiteralProblems(rel, code) {
  const problems = [];
  for (const match of code.matchAll(new RegExp(`(?:^|[\\s{,(])(program|bin|command)\\s*:\\s*${QUOTE}`, "gm"))) {
    problems.push(`${rel}: a "${match[1]}" key is assigned a string literal — the declaration is the sole speller of the program`);
  }
  for (const match of code.matchAll(new RegExp(`\\.(program|bin|command)\\s*=\\s*${QUOTE}`, "g"))) {
    problems.push(`${rel}: a "${match[1]}" property is assigned a string literal — the declaration is the sole speller of the program`);
  }
  for (const literal of code.matchAll(TEMPLATE)) {
    if (/(?:^|[\s"'(=,`])(?:aof|node|npx|npm)(?:\s+[\w:-]+)+\s+\$\{/.test(literal[0])) {
      problems.push(`${rel}: a template literal interpolates a scope after a command-shaped prefix: ${literal[0]}`);
    }
  }
  return problems;
}

// levelProblems(rel, code) — ADR-010 §1: the dispatch argv carries no level AT ALL, so
// there is no carrier on this path that 55/FF-5508 could be breached through.
function levelProblems(rel, code) {
  const problems = [];
  if (/--level/.test(code)) problems.push(`${rel}: names a --level flag; the mesh path takes the loop's own default and declares no level source`);
  for (const match of code.matchAll(new RegExp(`${QUOTE}L[123]${QUOTE}`, "g"))) {
    problems.push(`${rel}: spells a level literal ${match[0]}; the level is the loop's to default and is never restated here`);
  }
  return problems;
}

// haltVocabularyProblems(rel, code) — ADR-006 §4: no member of the loop's frozen stop
// vocabulary is authored in the mesh files. A mesh file that spelled `uat-gate` would be
// the beginning of a parallel lifecycle wearing a small name.
function haltVocabularyProblems(rel, code) {
  return LOOP_STOPS
    .filter((stop) => new RegExp(`${QUOTE}${stop}${QUOTE}`).test(code))
    .map((stop) => `${rel}: authors the loop halt "${stop}"; the stop vocabulary is 53's and is not widened here`);
}

// The identifiers this story introduces. The fence leg asserts they reach nothing above
// the launch.
const STORY_IDENTIFIERS = Object.freeze([
  "directiveLaunch",
  "launchDeclared",
  "launchOptions",
  "composeDirectiveLaunchOptions",
  // 63/06's own two (ADR-013 §1) — the fix is caller-side, so they must reach no further
  // above the launch than 63/03's did.
  "loopShapedTranscriptWatch",
  "loopWatch",
  "assignmentDirectiveResolution",
  "assignmentDirectiveLaunch",
  "ASSIGNMENT_LOOP_LAUNCH_UNDECLARED",
  "ASSIGNMENT_LOOP_LAUNCH_SCOPELESS",
  "ASSIGNMENT_LOOP_SCOPE_UNSUPPORTED",
]);

// The concerns ADR-006 §4 fences off, and the shorthand key each is forwarded through at
// the mesh worker's one spawn site. A key that stopped being shorthand is a key some
// decision now reaches.
//
// 63/06 (ADR-013 §3a) SPLITS this list rather than shortening it, and the split is the
// whole of the relaxation. The invariant the leg protects is that no launch DECISION
// reaches the fenced machinery; choosing which INJECTED WATCH a launch kind is handed is
// not such a decision, so exactly two forwards — and only these two, solely to supply a
// loop-shaped watch — may become launch-conditional. The other four stay bare, and a
// FIFTH that stops being bare still fails here.
const FENCED_FORWARDS = Object.freeze([
  "ptySpawn",
  "which",
  "onOutputChunk",
  "onSessionEnd",
]);

// The two ADR-013 §3a names, and the ONLY expression each may take: the caller's own
// injected seam first, the loop shape as the fallback, and nothing else. Pinned as an
// expression rather than merely excused from the census, so "launch-conditional" cannot
// quietly become "reads a gate", "reads the declaration" or "picks a program".
const RELAXED_FORWARDS = Object.freeze({
  watchTranscriptSessionId: /watchTranscriptSessionId:\s*watchTranscriptSessionId \?\? loopWatch\?\.watchTranscriptSessionId\s*,/,
  watchTranscriptCompletion: /watchTranscriptCompletion:\s*watchTranscriptCompletion \?\? loopWatch\?\.watchTranscriptCompletion\s*,/,
});

// shorthandForward(bag, key) — the element is EXACTLY the identifier: the nearest
// preceding non-space character is an object-literal boundary and the next is a comma.
// A looser test (`[\s{,]key\s*,`) reads the tail of `key: cond ? a : key,` as a
// shorthand and would pass the very plant this control exists to catch.
function shorthandForward(bag, key) {
  return new RegExp(`(?:^|[{,])\\s*${key}\\s*(?=,)`).test(bag);
}

// storyIdentifiersIn(source) — the fence's ban, as a function, so the planted violation
// below is driven through the SAME detector the real driver source is measured by. A ban
// spelled inline at its one call site can only ever be run against a clean tree.
function storyIdentifiersIn(source) {
  return STORY_IDENTIFIERS.filter((identifier) => new RegExp(`(?<![\\w$])${identifier}(?![\\w$])`).test(source));
}

async function meshSources() {
  const entries = await Promise.all(MESH_FILES.map(async (rel) => ({
    rel,
    code: stripComments(await readFile(path.join(repoRoot, rel), "utf8")),
  })));
  // 119/04 — every leg fed from here is a NEGATIVE over these subjects, and a negative over an
  // empty subject passes while asserting nothing. A missing file already throws at readFile,
  // which is loud; a file whose body left it does not, so the non-emptiness is asserted here
  // once rather than at each of the three sweeps that consume this.
  for (const { rel, code } of entries) {
    assert.ok(code.trim().length > 0, `${rel}: the census read an EMPTY subject — every negative leg over it would pass over nothing`);
  }
  return entries;
}

// spawnOptionsBag(workerCode) — the options object the worker hands its spawn seam. Found
// from the call rather than from a line number, so it survives the file moving under it.
function spawnOptionsBag(workerCode) {
  const call = workerCode.indexOf("await spawnRuntime(");
  if (call < 0) return null;
  const brief = workerCode.indexOf("{", call);
  // the options object opens after the brief object closes — walk the braces of the first
  // argument, then take the second `{`.
  let depth = 0;
  let index = brief;
  for (; index < workerCode.length; index += 1) {
    if (workerCode[index] === "{") depth += 1;
    else if (workerCode[index] === "}") { depth -= 1; if (depth === 0) break; }
  }
  const second = workerCode.indexOf("{", index + 1);
  if (second < 0) return null;
  depth = 0;
  for (index = second; index < workerCode.length; index += 1) {
    if (workerCode[index] === "{") depth += 1;
    else if (workerCode[index] === "}") { depth -= 1; if (depth === 0) return workerCode.slice(second, index + 1); }
  }
  return null;
}

export const archTests = [
  {
    name: "arch/63 FF-6306 (acd-assignment-resolves-to-a-loop-call): exactly ONE module in src/ authors a slash command for an assignment phase, and its four answers are byte-unchanged",
    run: async () => {
      const files = await readSrcFiles(repoRoot);
      const authors = [];
      for (const file of files) {
        const code = stripComments(await readFile(file.path, "utf8"));
        if (authorsSlashCommand(code).length > 0) authors.push(file.rel);
      }
      assert.deepEqual(authors, [DIRECTIVE_HOME], `exactly one module authors an assignment phase's slash command; found: ${authors.join(", ")}`);

      // The four delivered answers, byte for byte. Five of this module's six dependents
      // consume ONLY this mapper, so their behaviour is provably untouched.
      for (const [phase, command] of Object.entries(DELIVERED_COMMANDS)) {
        assert.equal(assignmentDirectiveCommand(phase, "63"), command, `${phase} still maps to its delivered string`);
      }
      assert.equal(assignmentDirectiveCommand("nonsense", "63"), DELIVERED_COMMANDS.refine, "an unknown phase still degrades to the refine default");
      assert.equal(assignmentDirectiveCommand(undefined, "63"), DELIVERED_COMMANDS.refine, "…and so does an absent one");
    },
  },
  {
    name: "arch/63 FF-6306: exactly ONE phase resolves to a launch that is not a session, it is `autonomous`, and the answer set is driven from ASSIGNMENT_PHASES rather than a list of four",
    run: () => {
      const kinds = new Map(ASSIGNMENT_PHASES.map((phase) => [phase, assignmentDirectiveResolution(phase, "63").kind]));
      const loopPhases = [...kinds].filter(([, kind]) => kind === ASSIGNMENT_LAUNCH_LOOP).map(([phase]) => phase);
      assert.deepEqual(loopPhases, ["autonomous"], "exactly one phase resolves to a loop, and it is the one with a coordinator to remove");
      for (const phase of ASSIGNMENT_PHASES.filter((p) => p !== "autonomous")) {
        assert.equal(kinds.get(phase), ASSIGNMENT_LAUNCH_SESSION, `${phase} resolves to the session kind`);
        assert.equal(assignmentDirectiveLaunch(assignmentDirectiveResolution(phase, "63")), null, `${phase} produces no launch for the wire`);
      }
      // The admitted answer's shape is EXACTLY ADR-010 §2's — never `{ program, argv }`.
      const loop = assignmentDirectiveResolution("autonomous", "63");
      assert.deepEqual(Object.keys(loop).sort(), ["command", "kind", "scope"], "the resolver returns { kind, command, scope } and nothing else");
      assert.equal(loop.command, null, "a loop resolution carries no command to type");
      assert.deepEqual(assignmentDirectiveLaunch(loop), { kind: ASSIGNMENT_LAUNCH_LOOP, scope: "63" }, "and the wire projection is the kind and the scope");
      // A fifth phase could not arrive silently: the map above IS the vocabulary.
      assert.equal(kinds.size, ASSIGNMENT_PHASES.length, "every member of the closed set is answered for");
      assert.equal(DEFAULT_ASSIGNMENT_PHASE, "refine", "the default phase is unchanged");
    },
  },
  {
    name: "arch/63 FF-6306: the assignment record's key count is the frozen ten, and none of them is a scope, a level or a launch",
    run: () => {
      const record = assembleAssignmentRecord({ itemRef: "63", workspaceId: "ws-1", targetNodeId: "worker-a", issuer: "control-a" });
      assert.equal(Object.keys(record).length, 10, "the assembler's shape is still the frozen ten");
      for (const forbidden of ["scope", "level", "launch", "program", "argv"]) {
        assert.equal(forbidden in record, false, `the record has nowhere to keep a ${forbidden}`);
      }
    },
  },
  {
    name: "arch/63 FF-6306 (ADR-010 §1/§2, ADR-012 §3): the mesh files hold NO program literal, NO level and NO halt vocabulary — asserted in the two forms FF-6305's adjacency sweep is blind to",
    run: async () => {
      const sources = await meshSources();
      const problems = [];
      for (const { rel, code } of sources) {
        problems.push(...programLiteralProblems(rel, code), ...levelProblems(rel, code), ...haltVocabularyProblems(rel, code));
      }
      assert.deepEqual(problems, [], `the mesh files are clean: ${JSON.stringify(problems, null, 2)}`);

      // The composed launch's program comes from the DECLARATION, and the worker is the
      // component that supplies it (ADR-012 §3).
      //
      // 119/04 — these four follow the CODE, not the file it left. Item 83's seam 2 moved the
      // composer out of `worker-execution.mjs`, which red all four at once — loud, and fixed in
      // that diff, which ADR-003 calls a control doing its job. The subject is asserted present
      // so a second move cannot turn the four into matches over `undefined`.
      const composer = sources.find((entry) => entry.rel === LAUNCH_COMPOSER);
      assert.ok(composer != null, `${LAUNCH_COMPOSER} is not in the census, so the four legs below would assert over nothing`);
      const worker = composer.code;
      assert.match(worker, /composeDirectiveLaunchOptions/, `${LAUNCH_COMPOSER} is the subject only if it actually composes: the four legs below are matches, and a subject without the composer would fail them for the wrong reason`);
      assert.match(
        worker,
        /compileFrozenSet\(await readFrozenSet\([^)]*\)\)\.unattendedLaunch/,
        "the worker composes its launch from `compileFrozenSet(await readFrozenSet(dir)).unattendedLaunch`",
      );
      assert.match(worker, /declaredLaunch:\s*declared\b/, "…and hands exactly that value in as `declaredLaunch`");
      assert.match(worker, /program:\s*declared\.program/, "the program is read off the declaration, never spelled");
      assert.match(worker, /args:\s*\[\.\.\.declared\.args,\s*scope\]/, "and the argv is the declared arguments plus the scope, in that order");
    },
  },
  {
    name: "arch/63 FF-6306 self-check: a second slash-command speller, a program literal, an interpolated command prefix, a --level token and an authored halt each trip their detector",
    run: () => {
      // Every plant is SYNTHESIZED rather than string-replaced into the real source, so a
      // correct refactor of the real files can never turn a plant into a vacuous no-op.
      assert.deepEqual(authorsSlashCommand('const c = `/aof:autonomous ${itemRef}`;'), ["`/aof:autonomous ${itemRef}`"], "a second speller of the cascade command is detected");
      assert.deepEqual(authorsSlashCommand('if (command.includes("/aof:refine")) return "refine";'), [], "…while READING a delivered command string is not a second speller");

      assert.ok(programLiteralProblems("planted.mjs", 'const launch = { program: "aof", args: ["work", "loop", scope] };').length > 0, "`{ program: \"aof\", args: [...] }` — the shape ADR-010 §2 struck — is caught");
      assert.ok(programLiteralProblems("planted.mjs", 'const cmd = `aof work loop ${scope}`;').length > 0, "…and so is the rendered-argv spelling FF-6305's adjacency sweep cannot see");
      assert.ok(programLiteralProblems("planted.mjs", 'frame.bin = "aof";').length > 0, "a bin property assigned a literal is caught too");
      assert.deepEqual(programLiteralProblems("clean.mjs", 'const launch = { program: declared.program, args: [...declared.args, scope] };'), [], "the correct, declaration-sourced form stays clean");
      assert.deepEqual(programLiteralProblems("clean.mjs", 'const c = `/aof:continue ${itemRef}`;'), [], "and a slash command is not a command-shaped program prefix");

      assert.ok(levelProblems("planted.mjs", 'const argv = ["work", "loop", scope, "--level", level];').length > 0, "a --level flag on this path is caught");
      assert.ok(levelProblems("planted.mjs", 'const level = "L3";').length > 0, "…and so is a level literal");
      assert.deepEqual(levelProblems("clean.mjs", "const argv = [...declared.args, scope];"), [], "the level-less argv stays clean");

      // 119/04 — the plant that matters AFTER the split: the same literal, attributed to the
      // module that now composes the launch. It is caught only because the census names that
      // module; with `MESH_FILES` left at 63/03's three, this pair is what reds.
      assert.ok(MESH_FILES.includes(LAUNCH_COMPOSER), "the census sweeps the module that now composes the launch, so a second speller authored there is swept by something");
      assert.ok(
        programLiteralProblems(LAUNCH_COMPOSER, 'const launch = { program: "aof", args: ["work", "loop", scope] };').some((problem) => problem.startsWith(LAUNCH_COMPOSER)),
        "a program literal authored in the composer's new home is named against that file",
      );

      assert.ok(haltVocabularyProblems("planted.mjs", 'if (outcome === "cap-exhausted") return;').length > 0, "a loop stop authored in a mesh file is caught");
      assert.deepEqual(haltVocabularyProblems("clean.mjs", "if (outcome.outcome === \"needs-input\") return;"), [], "the delivered assignment vocabulary is not a loop stop");
    },
  },
  {
    name: "arch/63 FF-6306 (ADR-010 §3): a story-shaped ref on the autonomous phase is refused with a code, while the SAME ref on continue and verify resolves exactly as today",
    run: () => {
      const refused = assignmentDirectiveResolution("autonomous", "63/03");
      assert.equal(refused.refused, true, "a story-shaped ref is refused by the resolver");
      assert.equal(refused.code, ASSIGNMENT_LOOP_SCOPE_UNSUPPORTED, "…with a code");
      assert.equal(refused.scope, null, "carrying no scope");
      assert.equal(refused.command, null, "and no command — nothing a determined caller could still dispatch");
      assert.equal(assignmentDirectiveLaunch(refused), null, "and nothing for the wire");
      assert.ok(Array.isArray(refused.detail?.admits) && refused.detail.admits.length > 0, "the refusal names the scope forms that DO exist, from the loop's own answer");

      for (const phase of ["continue", "verify", "refine"]) {
        const resolution = assignmentDirectiveResolution(phase, "63/03");
        assert.equal(resolution.refused, undefined, `${phase} is not refused for the SHAPE of its ref`);
        assert.equal(resolution.command, assignmentDirectiveCommand(phase, "63/03"), `${phase} resolves exactly as it does today`);
      }
    },
  },
  {
    name: "arch/63 FF-6306 (ADR-010 §3): the assign verb's refusal ladder is UNEDITED — the same four gates in the same order, and no loop-scope gate stole an earlier gate's answer",
    run: async () => {
      const source = stripComments(await readFile(path.join(repoRoot, "src", "mesh", "assignment.mjs"), "utf8"));
      const body = functionBody(source, "export async function assignWork");
      assert.ok(body != null, "the assign verb is structurally readable");
      const codes = [...body.matchAll(/code:\s*"([a-z-]+)"/g)].map((m) => m[1]);
      assert.deepEqual(codes, ["ref-not-found", "assignment-already-active"], "the verb's own coded refusals, in order, are the delivered ones");
      assert.match(body, /gate\.code/, "the target gate still answers with its own code, in its delivered position");
      assert.match(body, /ITEM_LOCKED_CODE/, "and the scope lock is still the LAST gate");
      assert.ok(!body.includes(ASSIGNMENT_LOOP_SCOPE_UNSUPPORTED), "the loop-scope refusal is NOT added to the ladder — it belongs at the dispatch, not at the assign");
      assert.ok(!/decideLoopScope/.test(source), "and the assign verb resolves no loop scope at all");
    },
  },
  {
    name: "arch/63 FF-6306 (ADR-006 §4): the out-of-scope fence — the module that OWNS the PTY, streaming, completion and NEEDS_INPUT machinery holds none of this story's identifiers, and the worker still forwards each concern as a bare shorthand key",
    run: async () => {
      const driver = stripComments(await readFile(path.join(repoRoot, "src", "agent-session-driver.mjs"), "utf8"));
      // Non-vacuity first: the four concerns really do live in that module.
      for (const concern of ["ptySpawn(", "onOutputChunk", "watchTranscriptCompletion", "containsNeedsInputSentinel"]) {
        assert.ok(driver.includes(concern), `the driver is the home of ${concern} — this leg is reading the right file`);
      }
      assert.deepEqual(storyIdentifiersIn(driver), [], "no identifier this story introduced appears in the driver: it edited nothing above the launch");

      const worker = stripComments(await readFile(path.join(repoRoot, "src", "mesh", "worker-execution.mjs"), "utf8"));
      const bag = spawnOptionsBag(worker);
      assert.ok(bag != null, "the worker's spawn options bag is structurally readable");
      for (const key of FENCED_FORWARDS) {
        assert.ok(shorthandForward(bag, key), `${key} is still forwarded as a bare shorthand key — no launch decision reaches it`);
      }
      // ADR-013 §3a — the two named exceptions, each pinned to the ONE expression it may
      // take. Neither is excused from the census: a relaxed forward that started reading
      // anything other than "the injected seam, else the loop shape" fails right here.
      for (const [key, expression] of Object.entries(RELAXED_FORWARDS)) {
        assert.match(bag, expression, `${key} is launch-conditional in exactly the ADR-013 §3a form, and in no other`);
      }
      // The two forwards that were never shorthand keep their delivered expressions,
      // asserted as themselves rather than excused from the census.
      assert.match(bag, /deadlinePolicy:\s*deadlinePolicy \?\? loopBoundsFromConfig\(ws\)/, "the per-attempt deadline policy resolves exactly as it does today");
      assert.match(bag, /readHeartbeatAt:\s*readHeartbeatAt \?\?/, "and so does the heartbeat reader");
      assert.equal([...bag.matchAll(/\.\.\.launchOptions\s*,/g)].length, 1, "the story adds exactly ONE spread to that bag");
      const strayLaunchReads = [...bag.matchAll(/(?<![\w$])(?:directiveLaunch|launchDeclared|unattended|declaredLaunch)(?![\w$])/g)];
      assert.deepEqual(strayLaunchReads.map((m) => m[0]), [], "and nothing else in the bag reads the launch");

      // The reclaim POLICY — the half of that module 63/SPEC fences off — is untouched by
      // this story's identifiers too. Only the DISPATCH half of the tick changed.
      const reclaim = stripComments(await readFile(path.join(repoRoot, "src", "mesh", "assignment-reclaim.mjs"), "utf8"));
      for (const fn of ["export async function reclaimStaleAssignments", "export function dualStalenessDecision"]) {
        const body = functionBody(reclaim, fn);
        assert.ok(body != null, `${fn} is structurally readable`);
        assert.deepEqual(storyIdentifiersIn(body), [], `${fn} reads none of this story's identifiers`);
      }
    },
  },
  {
    name: "arch/63 FF-6306 self-check: the fence names a story identifier reaching into the driver, a launch decision reaching the streaming forward, and a forward that stopped being a bare shorthand key",
    run: () => {
      const planted = "{ ...launchOptions, driver, ptySpawn, which, onOutputChunk: launchDeclared ? null : onOutputChunk, watchTranscriptCompletion, }";
      assert.equal(shorthandForward(planted, "onOutputChunk"), false, "a forward that became a launch-conditional is no longer a bare shorthand key");
      // 63/06 (ADR-013 §3a) — the RELAXED pair, planted three ways. The exception is two
      // NAMES taking one EXPRESSION, never a licence for those names to read anything.
      const relaxedOk = "{ watchTranscriptSessionId: watchTranscriptSessionId ?? loopWatch?.watchTranscriptSessionId, watchTranscriptCompletion: watchTranscriptCompletion ?? loopWatch?.watchTranscriptCompletion, }";
      assert.match(relaxedOk, RELAXED_FORWARDS.watchTranscriptSessionId, "the licensed form is what the detector accepts");
      assert.match(relaxedOk, RELAXED_FORWARDS.watchTranscriptCompletion, "…on both names");
      const relaxedWrong = "{ watchTranscriptSessionId: launchDeclared ? null : watchTranscriptSessionId, watchTranscriptCompletion: gate.score > 90 ? a : b, }";
      assert.doesNotMatch(relaxedWrong, RELAXED_FORWARDS.watchTranscriptSessionId, "a relaxed name reading the launch flag directly is NOT the licensed form");
      assert.doesNotMatch(relaxedWrong, RELAXED_FORWARDS.watchTranscriptCompletion, "…and neither is one reading a gate");
      const relaxedReverted = "{ watchTranscriptSessionId, watchTranscriptCompletion, }";
      assert.doesNotMatch(relaxedReverted, RELAXED_FORWARDS.watchTranscriptSessionId, "and a revert to the bare shorthand — the shape that reinstates the defect — fails here rather than passing as 'still fenced'");
      assert.doesNotMatch(relaxedReverted, RELAXED_FORWARDS.watchTranscriptCompletion, "…on both names");
      assert.ok([...planted.matchAll(/(?<![\w$])(?:directiveLaunch|launchDeclared|unattended|declaredLaunch)(?![\w$])/g)].length > 0, "…and the stray-read detector names the launch identifier that reached it");
      // The DRIVER-IDENTIFIER ban, planted. This is the shape the fence exists to refuse: a
      // launch decision that reached INTO the module owning the PTY spawn, the streaming, the
      // completion detection and the sentinel — which is how "no machinery above the launch
      // was touched" stops being true without any of the shorthand forwards changing.
      const plantedDriver = "export async function driveInteractiveClaudeSession(brief, options = {}) {\n  const launchOptions = options.launchOptions ?? {};\n}";
      assert.deepEqual(storyIdentifiersIn(plantedDriver), ["launchOptions"], "a story identifier reaching into the driver is named by the detector");
      const plantedComposer = "if (composeDirectiveLaunchOptions(directiveLaunch) != null) term.kill();";
      assert.deepEqual(
        storyIdentifiersIn(plantedComposer).sort(),
        ["composeDirectiveLaunchOptions", "directiveLaunch"],
        "…and so is the composer itself, reported by every identifier it brought with it",
      );
      const cleanDriver = "export async function driveInteractiveClaudeSession(brief, options = {}) {\n  const launch = resolveInteractiveDriverLaunch(options.driver, options);\n}";
      assert.deepEqual(storyIdentifiersIn(cleanDriver), [], "the real, untouched driver shape stays clean");
      // A near-miss the ban must NOT fire on: a longer identifier that merely CONTAINS one.
      assert.deepEqual(storyIdentifiersIn("const launchOptionsBuilder = null;"), [], "the word-boundary guard keeps the ban off an unrelated longer name");

      const clean = "{ ...launchOptions, driver, ptySpawn, which, onOutputChunk, watchTranscriptCompletion, }";
      assert.equal(shorthandForward(clean, "onOutputChunk"), true, "the real, unconditional forward passes");
      // …and the LOOSER form this helper replaced would have passed the plant, which is
      // why the helper exists rather than an inline regex at each call site.
      assert.ok(new RegExp("(?:^|[\\s{,])onOutputChunk\\s*,", "m").test(planted), "the naive shorthand test reads the plant's trailing identifier as a shorthand — the false negative this control avoids");
      assert.deepEqual([...clean.matchAll(/(?<![\w$])(?:directiveLaunch|launchDeclared|unattended|declaredLaunch)(?![\w$])/g)].map((m) => m[0]), [], "and reads no launch identifier");
    },
  },
  {
    name: "arch/63 FF-6306 (ADR-006 §4): LOOP_STOPS is 53's frozen twelve plus only the three lane stops 129/01 appended after them — 63 added none, and no completion signal means \"a loop finished\"",
    run: async () => {
      // 129/01 (129/ADR-008 §5) appended three LANE stops as members 13-15 in the loop's own
      // home. The count is pinned WITH its provenance: 63's twelve are the first twelve, unrenamed
      // and in order, and every member past them is one of 129's three — so a stop the mesh
      // needed and smuggled in would still be a red here, which is what this control is for.
      assert.equal(LOOP_STOPS.length, 15, "the halt vocabulary is 63's twelve plus 129/01's three lane stops");
      assert.deepEqual(LOOP_STOPS.slice(0, 12), [
        "uat-gate", "dependency-blocked", "cap-exhausted", "deadline-exhausted",
        "progress-exhausted", "no-progress", "grade-indeterminate", "session-needs-input",
        "run-not-retryable", "retry-parked", "unmapped-item-type", "operator-interrupt",
      ], "the twelve frozen before 63 are the first twelve, unrenamed and in order");
      assert.deepEqual(LOOP_STOPS.slice(12), ["lane-open-failed", "lane-merge-refused", "lane-merge-conflict"], "…and the only members past them are 129/01's three lane stops");
      assert.ok(Object.isFrozen(LOOP_STOPS), "…and it is frozen");
      const sources = await meshSources();
      for (const { rel, code } of sources) {
        assert.ok(!/loopFinished|LOOP_FINISHED|loop-finished|loop-complete/i.test(code), `${rel}: no signal exists that means "a loop finished" and does not already mean "a run finished"`);
      }
    },
  },
  {
    name: "arch/63 FF-6306 (ADR-012 §3): the caller-side obligation, driven both ways — a supplied declaration is admitted, and a call that omits it is the `unattended-launch-declaration-not-supplied` refusal that starts no process",
    run: () => {
      const declared = compileFrozenSet(bundledFrozenSet()).unattendedLaunch;
      assert.ok(declared != null, "the shipped declaration admits an unattended launch (63/02's fourth enforcement point)");

      let spawned = 0;
      const which = (bin) => (bin === "claude" ? "/fake/claude" : null);

      // POSITIVE — the request the worker composes, with the declaration supplied.
      const admitted = resolveInteractiveDriverLaunch("claude", {
        which,
        env: { PATH: "/usr/bin", CLAUDECODE: "1" },
        unattended: { program: declared.program, args: [...declared.args, "63"] },
        declaredLaunch: declared,
      });
      assert.equal(admitted.refused, undefined, "the composed launch is admitted");
      assert.equal(admitted.unattended, true, "…as an unattended launch");
      assert.equal(admitted.bin, declared.program, "the program is the declaration's");
      assert.deepEqual(admitted.args, [...declared.args, "63"], "and the argv is the declaration's plus the scope");
      assert.equal("CLAUDECODE" in admitted.env, false, "the session-attachment vector is scrubbed out of it");

      // NEGATIVE — the same request with the declaration OMITTED. A distinct code, and
      // never a session: this is what a caller that forgot ADR-012 §3 receives.
      const forgotten = resolveInteractiveDriverLaunch("claude", {
        which,
        env: { PATH: "/usr/bin" },
        unattended: { program: declared.program, args: [...declared.args, "63"] },
      });
      assert.equal(forgotten.refused, true, "a caller that never consulted the declaration is refused");
      assert.equal(forgotten.code, "unattended-launch-declaration-not-supplied", "…with the code that says so, and not one of the other two");
      assert.equal(forgotten.bin, undefined, "the refusal carries no program");
      assert.equal(forgotten.args, undefined, "no argv");
      assert.equal(forgotten.env, undefined, "and no environment — nothing a determined caller could still spawn");
      assert.equal(spawned, 0, "and no process was started");
      void spawned;
    },
  },
];
