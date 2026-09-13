// Fitness function: acd-declared-program-single-speller (milestone 72 / story 00, FF-7201;
// ADR-001 §1, §2, §3, §5, §5a, §6, ADR-007 §5, ADR-008 §1, §2).
//
//   "A guessed program is a program nobody declared."
//
// This control carries four claims and one behavioural ratchet, and each of the four is a CENSUS
// because the failure it prevents is a default that lives as TEXT rather than as a branch:
//
//   1. NO PROGRAM NAME IN AN EXECUTABLE POSITION. A `"npm"`, `"vitest"`, `"pytest"`, `"yarn"` or
//      `"pnpm"` literal handed to the seam as the command is a default waiting for a caller, so
//      the claim is a census and not merely a behavioural check of one path.
//   2. ONE READER PER KEY. `work.test.*` resolved in two places is two answers that agree until
//      they do not — the species `src/loop-bounds.mjs` exists to prevent for `work.loop.*`.
//   3. ONE WAY TO START A CHILD PROCESS, over this milestone's own family. `59/FF-5904` makes the
//      same clauses over the audit family and does not reach this one: 72's modules IMPORT the
//      seam, they are not reached FROM it, so this is a new subject rather than a second copy.
//   4. THE EXPANSION IS ONE RULE, and a run that produced no verdict is never green.
//
// ── THE CENSUS SCOPE IS THE MILESTONE'S DECLARED MODULE SET, NOT THIS STORY'S ONE MODULE ──────
//
// ADR-008 §1 names three modules across three stories, and the FF row fixes this reading because
// the row and the story's feature stated it two ways. Under the narrow reading ("the modules this
// story adds") 72/01 and 72/02 would each have to write into THIS file to add themselves, which
// ADR-008 §2 forbids. So the set is declared here, restricted to what exists on disk when the
// control runs, with a non-vacuity floor of at least one — a walk that resolves nothing must not
// pass.
//
// AND IT IS DELIBERATELY NOT WIDENED TREE-WIDE. 23 modules under `src/` import the process module
// today and four carry a `shell:` option, none of them 72's; `src/frameworks.mjs:66` builds an
// `["npx", …]` vector and spawns it with a shell on win32, which is milestone 12's installer. A
// tree-wide census would red on arrival, and a census that reds on correct code is a census
// somebody switches off.
//
// ── THE ADMIT IS A SHAPE, NEVER A FILE ALLOWLIST ─────────────────────────────────────────────
//
// A five-name literal is admitted unless it is the `command` handed to the seam. Stated as a
// shape, a future `runBounded({ command: "npm" })` planted in a file somebody once allowlisted
// still fails; stated as an allowlist, it would not. The shapes measured at HEAD that must stay
// admitted are driven positively below, against those files' REAL contents.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";
// The sibling control's detector, REUSED rather than re-derived — seven of this row's eight plant
// shapes are exactly the ones it already refuses over the audit family. What is extended locally
// is the eighth: `OTHER_SPAWN_APIS` omits bare `exec`, and editing that constant is a write
// outside this story's set.
import { spawnRouteProblems } from "../audit/acd-audit-never-imports-project-code.test.mjs";
import {
  TEST_RUNNER_DECLARATION_INVALID,
  TEST_RUNNER_UNDECLARED,
  TEST_RUNNER_UNRESOLVABLE,
  TOOLCHAIN_CONFIG_KEYS,
  launchRunner,
  resolveTestToolchain,
  selectionArgs,
} from "../../../src/work/toolchain.mjs";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

// ADR-008 §1's declared module set for this milestone. Restricted at run time to what exists.
const MILESTONE_MODULES = Object.freeze([
  "src/work/toolchain.mjs",
  "src/work/test-select.mjs",
  "src/work/test-changed.mjs",
  "src/commands/test.mjs",
]);

const MODULE_FLOOR = 1;

// The five names a `work.test` declaration may supply. Frozen deliberately at five: widening them
// to "package-manager names" would pull in `npx`, which milestone 12's installer spells in an
// executable position and which this milestone does not own.
const FROZEN_PROGRAM_NAMES = Object.freeze(["npm", "vitest", "pytest", "yarn", "pnpm"]);

// The keys this milestone's toolchain module owns. Read from the module's own exported list so the
// census and the module cannot drift into two vocabularies, with the six the contract names pinned
// separately below so a silent shrink of the exported list cannot shrink the census with it.
const CONTRACTED_KEYS = Object.freeze([
  "work.test.command",
  "work.test.args",
  "work.test.selectArgs",
  "work.test.roots",
  "work.test.deadlineMs",
  "work.worktree.prepare",
]);

const KEY_OWNER = "src/work/toolchain.mjs";

// ── PURE CENSORS, so every plant drives without touching a real file ─────────────────────────

// EXECUTABLE POSITION, as a shape: the literal is the `command`/`program` a call is given, or it
// is the first argument of a call that starts a child. Everything else — an enum member, a
// `npm:` source prefix, an `npm_config_*` environment key, a sentence addressed to a human — is a
// name being TALKED ABOUT rather than being run, and is admitted.
const SPAWNING_CALLEES = "runBounded|launch|spawn|spawnSync|exec|execFile|execFileSync|execSync|fork";

function executablePositionPatterns(name) {
  const literal = `(["'\`])${name}\\1`;
  return [
    new RegExp(`\\b(?:command|program)\\s*:\\s*${literal}`, "u"),
    new RegExp(`\\b(?:${SPAWNING_CALLEES})\\s*\\(\\s*${literal}`, "u"),
  ];
}

export function programNameProblems(modules) {
  const problems = [];
  for (const { rel, code } of modules) {
    const source = stripComments(code);
    for (const name of FROZEN_PROGRAM_NAMES) {
      if (executablePositionPatterns(name).some((pattern) => pattern.test(source))) {
        problems.push(`${rel} spells the program name "${name}" in an executable position — the declaration is the only speller of the program, and a default that lives as text is a default waiting for a caller. Read it from work.test instead.`);
      }
    }
  }
  return problems;
}

// A CONFIGURATION KEY, read. The dotted path is matched with optional chaining between segments,
// which also matches the key as a string literal — the two spellings a module can legitimately use
// to reach it. Comments are stripped first, so naming a key in prose is not reading it.
function keyPattern(key) {
  return new RegExp(`\\b${key.split(".").join("\\s*\\??\\.\\s*")}\\b`, "u");
}

export function keyReaderProblems(key, modules, owner) {
  const pattern = keyPattern(key);
  const readers = modules.filter(({ code }) => pattern.test(stripComments(code))).map(({ rel }) => rel);
  if (readers.length === 1 && readers[0] === owner) return [];
  if (readers.length === 0) {
    return [`${key} has no reader at all — the census resolved nothing, so "exactly one reader" would be vacuously true.`];
  }
  return readers
    .filter((rel) => rel !== owner)
    .map((rel) => `${rel} reads ${key}, and ${owner} is the one home for it — two readers of one key are two answers that agree until they do not.`);
}

// The eighth plant shape. `spawnRouteProblems` covers the other seven and omits bare `exec`.
export function bareExecProblems(modules) {
  return modules
    .filter(({ code }) => /\bexec\s*\(/u.test(stripComments(code)))
    .map(({ rel }) => `${rel} calls \`exec(\` — a second way to start a process. There is one.`);
}

export function processRouteProblems(modules) {
  const stripped = modules.map(({ rel, code }) => ({ rel, code: stripComments(code) }));
  return [...spawnRouteProblems(stripped), ...bareExecProblems(stripped)];
}

// ── THE TREE ─────────────────────────────────────────────────────────────────────────────────

async function readIfPresent(rel) {
  try {
    return { rel, code: await readFile(path.join(repoRoot, rel), "utf8") };
  } catch {
    return null;
  }
}

async function milestoneModules() {
  const present = await Promise.all(MILESTONE_MODULES.map((rel) => readIfPresent(rel)));
  return present.filter(Boolean);
}

// Every `.mjs` under `src/`, recursively. The walk is what makes the one-reader claim a claim about
// the tree rather than about the handful of files somebody remembered.
async function sourceModules() {
  const modules = [];
  const walk = async (relative) => {
    for (const entry of await readdir(path.join(repoRoot, relative), { withFileTypes: true })) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) await walk(child);
      else if (entry.name.endsWith(".mjs")) modules.push({ rel: child, code: await readFile(path.join(repoRoot, child), "utf8") });
    }
  };
  await walk("src");
  return modules;
}

const SOURCE_MODULE_FLOOR = 200;

export const archTests = [
  {
    name: "arch/72 FF-7201 (acd-declared-program-single-speller): no program name a declaration may supply is spelled in an executable position anywhere in this milestone's module set",
    run: async () => {
      const modules = await milestoneModules();
      assert.ok(
        modules.length >= MODULE_FLOOR,
        `the milestone's declared module set was walked and is non-vacuous: ${modules.length} of ${MILESTONE_MODULES.length} present, floor ${MODULE_FLOOR}`,
      );
      assert.ok(modules.some((module) => module.rel === KEY_OWNER), `${KEY_OWNER} is in the set the census read`);

      const problems = programNameProblems(modules);
      assert.deepEqual(problems, [], `a guessed default cannot exist as text:\n  ${problems.join("\n  ")}`);
    },
  },

  {
    name: "arch/72 FF-7201 (acd-declared-program-single-speller): self-check — each of the five names planted as the command handed to the seam fails the census and names the file, and the shapes that merely SPELL a name stay admitted",
    run: async () => {
      // (a) THE RED THIS CENSUS OWES — one plant per name, in the position that matters.
      for (const name of FROZEN_PROGRAM_NAMES) {
        const planted = { rel: "src/planted-runner.mjs", code: `await runBounded({ command: "${name}", args: ["test"], deadlineMs: 1000 });` };
        const problems = programNameProblems([planted]);
        assert.equal(problems.length, 1, `"${name}" planted as the command handed to the bounded spawn seam fails the census`);
        assert.ok(problems[0].includes("src/planted-runner.mjs"), `…and it names the file the literal was planted in: ${problems[0]}`);
        assert.ok(problems[0].includes(name), `…and the name it found`);
      }
      // …in the other shape too: the literal as the first argument of a call that starts a child.
      const positional = programNameProblems([{ rel: "src/planted-positional.mjs", code: 'spawn("pnpm", ["install"]);' }]);
      assert.equal(positional.length, 1, "the name as argv[0] of a spawning call is the same defect wearing a different syntax");

      // (b) THE SHAPES MEASURED AT HEAD THAT MUST STAY ADMITTED — driven against those files' REAL
      // contents, so the row is a claim about this tree and not about a paraphrase of it.
      const admitted = [
        { rel: "src/packages.mjs", shape: 'holds "npm" as a member of the package source-type enum', token: '"npm"', stripped: true },
        { rel: "src/frameworks.mjs", shape: "builds an npm: package-source string", token: '"npm:"', stripped: true },
        { rel: "src/frameworks.mjs", shape: "sets npm_config_* environment keys", token: "npm_config_", stripped: true },
        { rel: "src/work/observe.mjs", shape: "names runners in a comment about what it must not match", token: "vitest", stripped: false },
        { rel: "src/board-serve.mjs", shape: "prints an npm --prefix instruction inside a message to a human", token: "npm --prefix", stripped: false },
      ];
      for (const row of admitted) {
        const module = await readIfPresent(row.rel);
        assert.ok(module != null, `${row.rel} is on disk, so this row measures the tree as it stands`);
        // NON-VACUITY FIRST: the occurrence has to be there, or "not reported" means nothing.
        assert.ok(module.code.includes(row.token), `${row.rel} ${row.shape} — the occurrence this row is about is present`);
        const problems = programNameProblems([module]);
        assert.deepEqual(problems, [], `${row.rel} ${row.shape}: the census passes and that occurrence is not reported`);
        if (row.stripped) assert.ok(stripComments(module.code).includes(row.token), `${row.rel}: and it survives comment-stripping, so the pass is not an artefact of the stripper`);
      }
    },
  },

  {
    name: "arch/72 FF-7201 (acd-declared-program-single-speller): each configuration key this module owns has exactly one reader in the source tree",
    run: async () => {
      const modules = await sourceModules();
      assert.ok(modules.length > SOURCE_MODULE_FLOOR, `the source tree was actually walked (non-vacuous): ${modules.length} modules, floor ${SOURCE_MODULE_FLOOR}`);
      assert.ok(modules.some((module) => module.rel === KEY_OWNER), "…and the walk recursed far enough to reach the owner");
      assert.ok(modules.some((module) => module.rel.startsWith("src/commands/")), "…and into src/commands/, which a flat walk would miss");

      for (const key of CONTRACTED_KEYS) {
        const problems = keyReaderProblems(key, modules, KEY_OWNER);
        assert.deepEqual(problems, [], `${key} is read in ${KEY_OWNER} and nowhere else:\n  ${problems.join("\n  ")}`);
        assert.ok(TOOLCHAIN_CONFIG_KEYS.includes(key), `${key} is one the module itself declares it owns — the census and the module share one vocabulary`);
      }
      // The exported list may grow (a key nobody has consumed yet is still owned); it may not
      // silently lose one the contract names, which is what pins the census's floor.
      assert.ok(TOOLCHAIN_CONFIG_KEYS.length >= CONTRACTED_KEYS.length, "the module's own key list covers the contracted set");
    },
  },

  {
    name: "arch/72 FF-7201 (acd-declared-program-single-speller): self-check — the one-reader census is drivable, a mention is not a read, and the config file, the tests and the contracts are not censused as source modules",
    run: async () => {
      const owner = { rel: KEY_OWNER, code: 'export const KEYS = ["work.test.command"];' };

      const second = { rel: "src/planted-second-reader.mjs", code: "const declared = config.work.test.command;" };
      const flagged = keyReaderProblems("work.test.command", [owner, second], KEY_OWNER);
      assert.equal(flagged.length, 1, "a second module that READS the key fails the census");
      assert.ok(flagged[0].includes("src/planted-second-reader.mjs"), `…naming that second module: ${flagged[0]}`);

      const mentioned = { rel: "src/planted-second-reader.mjs", code: "// work.test.command is resolved in src/work/toolchain.mjs\nconst declared = null;" };
      assert.deepEqual(keyReaderProblems("work.test.command", [owner, mentioned], KEY_OWNER), [], "the same key named in that module's comment is a mention, not a read");

      // …and the optional-chained spelling is the same read, so a module cannot slip through by
      // guarding its own access.
      const chained = { rel: "src/planted-chained.mjs", code: "const declared = config?.work?.test?.command;" };
      assert.equal(keyReaderProblems("work.test.command", [owner, chained], KEY_OWNER).length, 1, "an optional-chained read is a read");

      // A census that resolved NOTHING must not pass: an absence over an empty set is free.
      const vacuous = keyReaderProblems("work.test.command", [{ rel: "src/nothing.mjs", code: "export const x = 1;" }], KEY_OWNER);
      assert.equal(vacuous.length, 1, "a key with no reader at all is its own failure, not a silent pass");

      // THE SUBJECT IS `src/`. These three files all carry the key text and none of them is a
      // source module — asserted from both ends, so the exclusion is measured rather than assumed.
      const modules = await sourceModules();
      const outside = [
        ".aof/aof.config.json",
        "test/work/work-toolchain-declaration.test.mjs",
        "wiki/work/72_milestone_inner-loop/stories/00_story_the-declared-toolchain/tasks/00_the-runner-is-declared-or-there-is-no-run.feature",
      ];
      for (const rel of outside) {
        assert.equal(modules.some((module) => module.rel === rel), false, `${rel} is not censused as a source module`);
      }
      const contract = await readFile(path.join(repoRoot, ...outside[2].split("/")), "utf8");
      assert.ok(keyPattern("work.test.command").test(contract), "…and the contract does carry the key, so the exclusion is doing work");
      const suite = await readFile(path.join(repoRoot, "test", "work", "work-toolchain-declaration.test.mjs"), "utf8");
      assert.ok(keyPattern("work.test.command").test(suite), "…as does the behavioural suite");
      for (const module of modules) assert.ok(module.rel.startsWith("src/"), `the walk stayed inside src/: ${module.rel}`);
    },
  },

  {
    name: "arch/72 FF-7201 (acd-declared-program-single-speller): every child process this milestone starts comes from the one bounded seam — no second way, and no shell",
    run: async () => {
      const modules = await milestoneModules();
      assert.ok(modules.length >= MODULE_FLOOR, `the module set was read before this claim: ${modules.length} module(s)`);

      const problems = processRouteProblems(modules);
      assert.deepEqual(problems, [], `there is ONE way to start a process in this family:\n  ${problems.join("\n  ")}`);

      // …and the import that reaches the seam is present, so the claim is "one seam", not "none".
      const owner = modules.find((module) => module.rel === KEY_OWNER);
      assert.match(owner.code, /from\s+"(?:\.\.?\/)+work-audit\/spawn\.mjs"/u, `${KEY_OWNER} reaches the shared bounded seam by import`);
      assert.doesNotMatch(stripComments(owner.code), /from\s+"node:child_process"/u, "…and reaches the process module directly nowhere");
    },
  },

  {
    name: "arch/72 FF-7201 (acd-declared-program-single-speller): self-check — all eight second-door shapes fail the census, and the seam this story reuses is not itself the finding",
    run: async () => {
      const planted = [
        { planted: "an import of node:child_process", code: 'import { spawn } from "node:child_process";' },
        { planted: "a use of exec", code: 'exec("a-program");' },
        { planted: "a use of execFile", code: 'execFile("a-program", []);' },
        { planted: "a use of execSync", code: 'execSync("a-program");' },
        { planted: "a use of spawnSync", code: 'spawnSync("a-program", []);' },
        { planted: "a use of fork", code: 'fork("./child.mjs");' },
        { planted: "a spawn option requesting a shell", code: 'await runBounded({ command: "a-program", args: [], shell: true });' },
        { planted: "a spawn option naming a shell path", code: 'await runBounded({ command: "a-program", args: [], shell: "/bin/sh" });' },
      ];
      for (const row of planted) {
        const problems = processRouteProblems([{ rel: "src/work/toolchain.mjs", code: row.code }]);
        assert.ok(problems.length >= 1, `${row.planted} planted in a module this story adds fails the census`);
        assert.ok(problems.every((problem) => problem.includes("src/work/toolchain.mjs")), `…naming that module: ${problems.join(" | ")}`);
      }

      // THE SEAM IS NOT THE FINDING. Its own import of the process module is exactly what is
      // expected of it, and it is not a module this story adds…
      const seam = await readIfPresent("src/work-audit/spawn.mjs");
      assert.ok(seam != null, "the shared seam is on disk");
      assert.match(seam.code, /from\s+"node:child_process"/u, "…and it does import the process module, which is its whole job");
      assert.deepEqual(processRouteProblems([seam]), [], "the seam's own import is not reported, because that seam is not a module this story adds");

      // …and importing its bounded entry point is not a spawn of its own.
      assert.deepEqual(
        processRouteProblems([{ rel: KEY_OWNER, code: 'import { runBounded } from "./work-audit/spawn.mjs";\nawait runBounded({ command: program, args, deadlineMs });' }]),
        [],
        "importing the seam's bounded entry point is not reported as a spawn of its own",
      );
    },
  },

  {
    name: "arch/72 FF-7201 (acd-declared-program-single-speller): an absent, faulty or unresolvable declaration is a coded refusal with NO spawn, each refusal carrying a distinct code",
    run: async () => {
      let launched = 0;
      const launch = async () => {
        launched += 1;
        return { outcome: "exited", exitCode: 0 };
      };
      const nowhere = { env: { PATH: "" }, platform: "linux", projectRoot: repoRoot, isFile: () => false, launch };

      const empty = resolveTestToolchain({}, nowhere);
      const noCommand = resolveTestToolchain({ work: { test: { args: [], deadlineMs: 1000 } } }, nowhere);
      const unresolvable = resolveTestToolchain({ work: { test: { command: "a-program-on-no-path-entry", args: [], deadlineMs: 1000 } } }, nowhere);

      for (const [label, result] of [["an empty config", empty], ["a config missing command", noCommand], ["a command that resolves nowhere", unresolvable]]) {
        assert.equal(result.ok, false, `${label} is a coded refusal`);
        assert.equal(typeof result.code, "string", `${label} carries a code`);
        assert.equal(typeof result.message, "string", `${label} says what to repair`);
      }
      assert.equal(empty.code, TEST_RUNNER_UNDECLARED, "absence is test-runner-undeclared, and the message names the key");
      assert.ok(empty.message.includes("work.test"), "…by name");
      assert.equal(noCommand.code, TEST_RUNNER_DECLARATION_INVALID, "a declaration that does not compile has its own code");
      assert.equal(unresolvable.code, TEST_RUNNER_UNRESOLVABLE, "a command that resolves nowhere has a third");
      assert.equal(new Set([empty.code, noCommand.code, unresolvable.code]).size, 3, "three repairs, three codes");
      assert.equal(launched, 0, "and NO spawn was attempted for any of them — resolution happens in front of the door");
    },
  },

  {
    name: "arch/72 FF-7201 (acd-declared-program-single-speller): the template expansion is ONE rule over zero, one and three files, and no second placeholder is honoured",
    run: () => {
      for (const template of [["{file}"], ["--only", "{file}"]]) {
        assert.deepEqual([...selectionArgs(template, [])], [], `${JSON.stringify(template)} over zero files selects nothing, so no flag is left dangling`);
        const one = [...selectionArgs(template, ["a.test.mjs"])];
        assert.equal(one.filter((entry) => entry === "a.test.mjs").length, 1, `${JSON.stringify(template)} over one file expands the token once`);
        const three = [...selectionArgs(template, ["a", "b", "c"])];
        for (const file of ["a", "b", "c"]) assert.equal(three.filter((entry) => entry === file).length, 1, `${JSON.stringify(template)} over three files expands once per file`);
        assert.equal(three.filter((entry) => entry === "--only").length, template.includes("--only") ? 1 : 0, "…and the template itself is not repeated");
      }
      // No other placeholder is honoured, and none is silently dropped either.
      assert.deepEqual([...selectionArgs(["{root}", "--only", "{file}", "{suite}"], ["a"])], ["{root}", "--only", "a", "{suite}"], "only {file} expands");
    },
  },

  {
    name: "arch/72 FF-7201 (acd-declared-program-single-speller): a deadline expiry and a failure to start are reported as themselves and exit non-zero, never folded into a pass",
    run: async () => {
      const compiled = resolveTestToolchain(
        { work: { test: { command: "runner", args: [], selectArgs: ["{file}"], deadlineMs: 900000 } } },
        { env: { PATH: "/usr/bin" }, platform: "linux", projectRoot: repoRoot, isFile: (candidate) => candidate === path.posix.join("/usr/bin", "runner") },
      );
      assert.equal(compiled.ok, true, `the toolchain compiles before the outcomes are driven — ${compiled.message ?? ""}`);

      const stub = (outcome, exitCode) => async (call) => ({
        outcome,
        command: call.command,
        args: call.args,
        attempted: `${call.command} ${call.args.join(" ")}`,
        deadlineMs: call.deadlineMs,
        exitCode,
        stdout: "",
        stderr: "",
        error: outcome === "exited" ? null : "the reason the seam gave",
      });

      const expired = await launchRunner(compiled.toolchain, ["a.test.mjs"], { launch: stub("deadline-expired", null) });
      const unstarted = await launchRunner(compiled.toolchain, ["a.test.mjs"], { launch: stub("not-started", null) });
      const passed = await launchRunner(compiled.toolchain, ["a.test.mjs"], { launch: stub("exited", 0) });
      const failed = await launchRunner(compiled.toolchain, ["a.test.mjs"], { launch: stub("exited", 1) });

      assert.equal(expired.outcome, "deadline-expired", "the expiry is named as itself");
      assert.equal(expired.status, 1, "…and exits non-zero");
      assert.equal(expired.verdict, null, "…carrying no verdict, because the run produced none");
      assert.ok(expired.message.includes("900000"), "…with the bound applied");
      assert.equal(unstarted.outcome, "not-started", "the failure to start is named as itself");
      assert.equal(unstarted.status, 1, "…and exits non-zero");
      assert.equal(unstarted.verdict, null, "…carrying no verdict either");
      assert.equal(passed.status, 0, "only a run that exited 0 is a pass");
      assert.equal(passed.verdict, "passed", "…and it is the only one with that verdict");
      assert.equal(failed.status, 1, "a run that exited non-zero fails");
      assert.equal(new Set([expired.outcome, unstarted.outcome, failed.outcome]).size, 3, "and the three non-passing answers are three different findings");
    },
  },
];
