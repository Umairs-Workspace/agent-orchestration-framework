// Fitness function: acd-audit-never-imports-project-code (milestone 59 / story 01, FF-5904;
// ADR-002 §3, honouring 66/ADR-004 §2).
//
//   "A dynamic import() of a cited module EXECUTES ITS MODULE SCOPE — which is aof running a
//    project's test code inside its own process."
//
// That refusal is one milestone old and it is not weakened here. Milestone 59's whole value is
// that it RE-RUNS things instead of reading about them, and the two are reconciled by moving
// the execution somewhere it can be bounded: out of this process, into a child, through ONE
// seam. This gate is what makes that structural rather than conventional.
//
// ── THE SUBJECT IS THE IMPORT CLOSURE, NOT A DIRECTORY (corrected at review, 2026-08-29) ──
//
// The first version of this gate swept `readdir("src/work-audit")` — flat, and scoped to a
// PATH. Both review lanes measured the same hole from opposite sides, and both plants passed
// all five lanes:
//
//   · QA planted `src/work-audit/lanes/qa-nested.mjs` holding a `node:child_process` import, a
//     static import of a test file, and `execSync(…, { shell: true })`. A non-recursive
//     `readdir` never saw it: a second door, project code in the aof process, and a shell — the
//     exact three things this gate exists to refuse — all green.
//   · The architect planted the escape one level up: clause (A) admits any static import that
//     resolves under `src/`, so `census.mjs` could import `../work-audit-loader.mjs`, which no
//     directory sweep covers, and a dynamic `import()` inside THAT runs project code with this
//     gate green.
//
// Both are the same defect: a freeze scoped to where a file SITS rather than to what the family
// can REACH. So the subject is now the family's **import closure** — every module reachable
// from `src/work-audit/**` (walked recursively) by following static relative imports, wherever
// it lives. A module the family can load is a module the family is answerable for; there is no
// longer a directory to step out of. Ledgered by the architect as TECH_DEBT item 70, closed
// here. 59/02 is the next story to add a module to this family, which is why it could not ship
// open.
//
// FOUR CLAUSES, each a way the boundary has been lost before:
//
//   (A) NOTHING IN THE CLOSURE REACHES PROJECT CODE. No dynamic `import()`, no `require`, no
//       `createRequire`, and every static import is either a `node:` builtin or a relative path
//       that resolves INSIDE `src/` — and, because the closure follows those imports, the
//       resolved module is then swept by this same clause.
//
//   (B) EVERY CHILD PROCESS IN THE FAMILY COMES FROM ONE SEAM. `node:child_process` is imported
//       by `src/work-audit/spawn.mjs` and by nothing else in the closure, and no module in it
//       names any other process-starting API — `exec`, `execFile`, `execSync`, `spawnSync`,
//       `fork`. A bound one caller can route around is not a bound, which is the same argument
//       `acd-grade-bounded-single-spawn` makes for `work:grade`.
//
//   (C) THE SEAM IS ACTUALLY BOUNDED. It carries a deadline, it kills on expiry, and it hands
//       back the exit code it observed. A seam that took a `deadlineMs` and armed nothing would
//       satisfy every naming check and bound nothing — so the clause is asserted over the seam's
//       OWN structure (a timer, the kill INSIDE its callback, a terminal `deadline-expired`
//       outcome) and re-proved behaviourally in `test/audit/audit-spawn-bounded.test.mjs`.
//
//   (D) NO SHELL. `shell:` appears in no spawn option in the closure, because a shell re-reads
//       the argument vector and this repo has already paid for that twice — once in
//       `acd-enroll-git-argv-no-shell`, and once in `wsl.exe` re-serialising its argv.
//
// (E) THE SPAWNED PROGRAMS ARE ENUMERATED, AND THE ENUMERATION IS DISCOVERED RATHER THAN
// TRUSTED. `src/work/audit-probe.mjs` exists to dynamically import a runner — that is its entire
// job — so it cannot live inside the closure without either breaking clause (A) or forcing (A)
// to grow an exemption, and an exemption is how a structural rule decays into a convention. It
// is a PROGRAM the family spawns, never a module the family loads. The first version of this
// clause hardcoded that one path, so a SECOND sibling program would have been unpoliced; now
// every `.mjs` under `src/` that the closure NAMES but does not IMPORT must appear in
// `SPAWNED_PROGRAMS`, and every member is asserted to exist, to be imported by nothing in the
// closure, and to start no child of its own.
//
// EVERY LANE ASSERTS ITS FLOOR BEFORE ITS CLAIM. A sweep over a renamed directory reads zero
// files and every "no offender found" claim below it becomes vacuously true — which is the
// exact failure ADR-004 §1 exists for, and it would be a poor joke inside this milestone.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchedParenSpan, stripComments } from "../../support/source-slice.mjs";
import { SPAWN_OUTCOMES } from "../../../src/work-audit/spawn.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FAMILY_ROOT = "src/work-audit";
// The seam is named by PATH, not by basename: a nested `lanes/spawn.mjs` would otherwise
// inherit the one exemption this gate grants.
const SEAM = "src/work-audit/spawn.mjs";

// The programs the family SPAWNS rather than imports. Shrink-or-justify: a member is added only
// with the reason it cannot be a module, and clause (E) refuses any `src/` program the closure
// names that is not here.
const SPAWNED_PROGRAMS = Object.freeze([
  Object.freeze({
    rel: "src/work/audit-probe.mjs",
    why: "its whole job is a dynamic import() of a runner, which clause (A) refuses inside the closure — so it is a program the family starts, not a module the family loads",
  }),
  // ADDED BY 77/04, AND THE ADDITION IS THE POINT (ADR-002 §3). This program was
  // `scripts/drive-control.mjs`, and clause (E) skips a named path that does not resolve under
  // `src/` — so it was enumerated by NOBODY: it could have started children of its own, been
  // imported by the family, or vanished, with this gate green through all three. Under `src/` it is
  // inside clause (E)'s discovery, and TECH_DEBT item 70's remaining hole closes with it.
  Object.freeze({
    rel: "src/work/audit-drive.mjs",
    why: "its whole job is a dynamic import() of a cited control, which clause (A) refuses inside the closure — so it is a program the family starts, not a module the family loads, and it lives under src/ because that is the only directory a payload install carries",
  }),
]);

// The floor for the closure sweep. Two modules ship in 59/01 (`census.mjs`, `spawn.mjs`) and
// 59/02 adds `evidence.mjs`; the floor is the number below which the sweep is not reading the
// family at all, never an equality that would fail a later story's legitimate addition.
const FAMILY_FLOOR = 2;

// PROCESS-STARTING APIS. `spawn` is the seam's own and is checked separately by importer; the
// rest may appear nowhere in the closure at all.
const OTHER_SPAWN_APIS = ["execFile", "execFileSync", "execSync", "spawnSync", "fork"];

// ── PURE HELPERS, so the recursion itself is drivable against a synthetic tree ────────────
//
// The defect this gate shipped with was in its WALK, not in its rules, and a walk that is only
// ever run over the real tree is a walk nobody can plant against. Each of these takes its
// input as an argument.

export function staticImportSpecifiers(code) {
  return importSpecifiers(String(code)).filter((entry) => !entry.dynamic).map((entry) => entry.specifier);
}

// A relative specifier resolved against the importing module's repo-relative path. `node:` and
// bare package specifiers return null: they are not files of ours to sweep, and clause (A)
// refuses the package case separately rather than silently skipping it.
export function resolveSpecifier(rel, specifier) {
  if (specifier.startsWith("node:") || !specifier.startsWith(".")) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(rel), specifier));
}

// THE IMPORT CLOSURE, over an injected `load(rel) -> code | null`. Breadth-first from the
// family's own modules, following every relative static import, so a module one directory up is
// swept exactly as a module inside the directory is.
export async function importClosure(roots, load) {
  const closure = new Map();
  const unresolved = [];
  const queue = [...roots];
  while (queue.length > 0) {
    const rel = queue.shift();
    if (closure.has(rel)) continue;
    const code = await load(rel);
    if (code == null) {
      unresolved.push(rel);
      continue;
    }
    closure.set(rel, code);
    for (const specifier of staticImportSpecifiers(code)) {
      const resolved = resolveSpecifier(rel, specifier);
      if (resolved != null) queue.push(resolved);
    }
  }
  return { closure, unresolved };
}

// PURE — comment-stripped source in, the reasons it reaches project code out.
export function projectCodeReaches(rel, code) {
  const problems = [];
  if (/\bimport\s*\(/u.test(code)) {
    problems.push(`${rel} contains a dynamic \`import()\` — importing a project module EXECUTES ITS MODULE SCOPE inside the aof process, which is 66/ADR-004 §2's refusal. Execution goes through src/work-audit/spawn.mjs, in a child.`);
  }
  if (/\brequire\s*\(/u.test(code) || /createRequire/u.test(code)) {
    problems.push(`${rel} reaches \`require\` — same refusal, older syntax.`);
  }
  for (const specifier of staticImportSpecifiers(code)) {
    if (specifier.startsWith("node:")) continue;
    if (!specifier.startsWith(".")) {
      problems.push(`${rel} statically imports the package "${specifier}" — the audit family imports node builtins and its own siblings, nothing else.`);
      continue;
    }
    const resolved = resolveSpecifier(rel, specifier);
    if (!resolved.startsWith("src/")) {
      problems.push(`${rel} statically imports "${specifier}", which resolves to ${resolved} — outside src/. A static import of project code executes its module scope exactly as a dynamic one does.`);
    }
  }
  return problems;
}

// PURE — the second-way-to-start-a-process detector, over `[{ rel, code }]`.
export function spawnRouteProblems(modules) {
  const problems = [];
  for (const module of modules) {
    if (/from\s+"node:child_process"/u.test(module.code) && module.rel !== SEAM) {
      problems.push(`${module.rel} imports node:child_process directly — every child process in this family comes from ${SEAM}, because a bound one caller can route around is not a bound.`);
    }
    for (const api of OTHER_SPAWN_APIS) {
      if (new RegExp(`\\b${api}\\s*\\(`, "u").test(module.code)) {
        problems.push(`${module.rel} calls \`${api}(\` — a second way to start a process. There is one.`);
      }
    }
    if (/\bshell\s*:/u.test(module.code)) {
      problems.push(`${module.rel} passes a \`shell:\` option — the seam takes an ARGUMENT VECTOR and no shell reads it. A shell re-splits the vector, which is an injection surface and a correctness bug at once.`);
    }
  }
  return problems;
}

// PURE — clause (E)'s DISCOVERY half. Every `.mjs` the closure names as a string, resolved
// against the `src/` tree; anything that resolves to one of our own files and is not itself in
// the closure is a program the family starts, and must be declared.
//
// A named path that does NOT resolve under `src/` is deliberately ignored: `"scripts/test.mjs"`
// is the SUBJECT the census points its child at, and the subject is arbitrary by design.
export function undeclaredProgramProblems(closure, srcFilesByLeaf, declared) {
  const declaredRels = new Set(declared.map((entry) => entry.rel));
  const problems = [];
  for (const [rel, code] of closure) {
    for (const match of code.matchAll(/"([^"]*\.mjs)"/gu)) {
      const named = match[1];
      const leaf = named.split("/").pop();
      const candidate = named.includes("/") ? named : srcFilesByLeaf.get(leaf) ?? null;
      if (candidate == null || !candidate.startsWith("src/")) continue;
      if (closure.has(candidate) || declaredRels.has(candidate)) continue;
      problems.push(`${rel} names the program "${named}" (→ ${candidate}), which the family neither imports nor declares in SPAWNED_PROGRAMS — a second spawned program that nothing polices is exactly the hole clause (E) shipped with.`);
    }
  }
  return [...new Set(problems)];
}

// ── THE REAL-TREE READS ──────────────────────────────────────────────────────────────────

async function walkMjs(relDir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(path.join(repoRoot, relDir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const child = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...await walkMjs(child));
    else if (entry.name.endsWith(".mjs")) out.push(child);
  }
  return out;
}

async function loadStripped(rel) {
  try {
    return stripComments(await readFile(path.join(repoRoot, rel), "utf8"));
  } catch {
    return null;
  }
}

// The family's closure as `[{ rel, code }]`, sorted, plus the roots it started from.
async function familyClosure() {
  const roots = (await walkMjs(FAMILY_ROOT)).sort();
  const { closure, unresolved } = await importClosure(roots, loadStripped);
  const modules = [...closure.entries()].map(([rel, code]) => ({ rel, code })).sort((a, b) => (a.rel < b.rel ? -1 : 1));
  return { roots, modules, closure, unresolved };
}

async function srcIndexByLeaf() {
  const index = new Map();
  for (const rel of await walkMjs("src")) index.set(rel.split("/").pop(), rel);
  return index;
}

export const archTests = [
  {
    name: "arch/59 FF-5904 (acd-audit-never-imports-project-code): nothing in the audit family's IMPORT CLOSURE reaches project code — no dynamic import(), no require, and every static import is a node builtin or resolves inside src/",
    run: async () => {
      const { roots, modules, unresolved } = await familyClosure();
      assert.ok(roots.length >= FAMILY_FLOOR, `the family directory was walked RECURSIVELY and is non-vacuous: ${roots.length} module(s) under ${FAMILY_ROOT}, floor ${FAMILY_FLOOR}`);
      assert.ok(modules.length >= roots.length, `the closure covers at least the directory it started from: ${modules.length} module(s) reachable from ${roots.length} root(s)`);
      assert.deepEqual(unresolved, [], `every relative import in the family resolves to a file this gate could read: ${unresolved.join(", ")} — a specifier the sweep cannot load is a hole in the freeze, not a detail`);
      for (const module of modules) {
        assert.ok(module.code.length > 200, `${module.rel} was read and stripped to something real (${module.code.length} chars) — a stripper that ate the file would make every claim below vacuous`);
      }

      const problems = modules.flatMap((module) => projectCodeReaches(module.rel, module.code));
      assert.deepEqual(
        problems,
        [],
        `the audit must not run project code inside its own process:\n  ${problems.join("\n  ")}\n\n`
          + "66/ADR-004 §2 refused this one milestone ago and 59/ADR-002 §3 honours it: every execution goes through src/work-audit/spawn.mjs, in a bounded child, and the family's own imports stay inside src/ — where this same clause then sweeps them.",
      );

      // The seam itself imports exactly one thing from outside its own directory, and it is a
      // builtin — stated as a positive so the clause above cannot pass by reading nothing.
      const seam = modules.find((module) => module.rel === SEAM);
      assert.ok(seam != null, `${SEAM} exists — it is the one seam this whole gate is about`);
      assert.match(seam.code, /from\s+"node:child_process"/u, "and it is the module that reaches node:child_process");
    },
  },

  {
    name: "arch/59 FF-5904 (acd-audit-never-imports-project-code): every child process in the closure comes from the ONE seam — no second spawn helper, no other process API, and no shell anywhere",
    run: async () => {
      const { roots, modules } = await familyClosure();
      assert.ok(roots.length >= FAMILY_FLOOR, `the family was walked before this claim: ${roots.length} root module(s)`);
      assert.ok(modules.length >= FAMILY_FLOOR, `and its closure was built: ${modules.length} module(s)`);

      const importers = modules.filter((module) => /from\s+"node:child_process"/u.test(module.code)).map((module) => module.rel);
      assert.deepEqual(importers, [SEAM], `exactly one module in the audit family's closure starts processes, and it is ${SEAM} — got: ${importers.join(", ") || "none"}`);

      const problems = spawnRouteProblems(modules);
      assert.deepEqual(problems, [], `there is ONE way to start a process in this family:\n  ${problems.join("\n  ")}`);

      // …and the seam's own export surface is the only one a caller could reach: a second
      // exported runner would be a second way to start a process wearing the seam's name.
      const seam = modules.find((module) => module.rel === SEAM);
      const exportedFunctions = [...seam.code.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gmu)].map((match) => match[1]).sort();
      assert.deepEqual(
        exportedFunctions,
        ["argumentVectorProblem", "attemptedCommand", "runBounded"],
        `the seam exports one runner and two pure helpers; a second exported runner is a second door: ${exportedFunctions.join(", ")}`,
      );
    },
  },

  {
    name: "arch/59 FF-5904 (acd-audit-never-imports-project-code): the seam is actually bounded — it arms a timer, kills the child inside it, reports a terminal deadline-expired outcome and hands back the observed exit code",
    run: async () => {
      const { modules } = await familyClosure();
      const seam = modules.find((module) => module.rel === SEAM);
      assert.ok(seam != null && seam.code.length > 200, "the seam was read");

      // A `deadlineMs` parameter that arms nothing would satisfy every naming check and bound
      // nothing at all — which is the vacuity species this milestone exists to catch.
      assert.match(seam.code, /setTimeout\(/u, "the seam arms a timer");
      assert.match(seam.code, /\.kill\(/u, "and kills the child");
      // The cut is STRUCTURAL, from the one home (`test/support/source-slice.mjs`): the timer's
      // own balanced argument group, never a fixed character window and never a slice ending at
      // a second `indexOf` sentinel. Both of those shapes have made instruments in this repo
      // confidently wrong about the TREE rather than about the rule (m45-47, nineteen cuts).
      const timer = matchedParenSpan(seam.code, seam.code.indexOf("setTimeout("));
      assert.ok(timer != null, "the timer's argument group could be cut — a NOT FOUND here is reported rather than asserted around");
      assert.match(timer.body, /\.kill\(/u, "and the KILL is what the timer does, not something a caller has to ask for separately");
      assert.match(seam.code, /clearTimeout\(/u, "and it disarms the timer when the child settles, so a finished child is never reported as expired");

      assert.match(seam.code, /exitCode/u, "the result carries an exit code");
      assert.match(seam.code, /stdout/u, "the output the child produced");
      assert.match(seam.code, /stderr/u, "including stderr — ADR-004 §3's oracle is the message, and a seam that dropped it would leave every consumer reasoning from a count");
      // 129/02 (ADR-005 §1) widened the vocabulary by exactly one: `aborted`, the caller's own
      // cancel (stdin end → grace → kill), which is neither the deadline's kill nor a failure.
      assert.deepEqual([...SPAWN_OUTCOMES], ["exited", "deadline-expired", "not-started", "aborted"], "the four terminal outcomes are frozen: a kill, a failure, a missing executable and a cancel are four findings, never one");

      // The default is a bound, not the absence of one: an unbounded call must not be reachable
      // by omitting an argument.
      assert.match(seam.code, /deadlineMs = DEFAULT_DEADLINE_MS/u, "a caller that names no deadline still gets one");
      assert.doesNotMatch(seam.code, /timeout\s*:\s*(?:0|null|undefined)/u, "and nothing disables the bound by passing a falsy timeout");
    },
  },

  {
    name: "arch/59 FF-5904 (acd-audit-never-imports-project-code): every spawned PROGRAM is enumerated, imported by nothing in the closure, and starts no child of its own — and a program the family names but does not declare is refused",
    run: async () => {
      const { modules, closure } = await familyClosure();
      const srcByLeaf = await srcIndexByLeaf();
      assert.ok(srcByLeaf.size > 50, `the src/ tree was indexed before this claim (${srcByLeaf.size} modules) — a walk that read nothing would make "no undeclared program" vacuously true`);
      assert.ok(SPAWNED_PROGRAMS.length >= 1, "the family declares at least one spawned program; it is how the census asks a runner what it assembled");

      // (i) DISCOVERY: nothing the closure names is unaccounted for.
      const undeclared = undeclaredProgramProblems(closure, srcByLeaf, SPAWNED_PROGRAMS);
      assert.deepEqual(undeclared, [], `every program the audit family names is declared:\n  ${undeclared.join("\n  ")}`);

      // (ii) EACH DECLARED PROGRAM, on its own terms.
      for (const program of SPAWNED_PROGRAMS) {
        assert.ok(program.why.length > 30, `${program.rel} declares WHY it is a program rather than a module — an enumeration without reasons is a list of exemptions`);
        assert.ok(!closure.has(program.rel), `${program.rel} is NOT in the family's import closure. Its whole job is a dynamic import; loading it into this process is precisely what spawning it avoids.`);
        for (const module of modules) {
          assert.doesNotMatch(
            module.code,
            new RegExp(`from\\s+"[^"]*${program.rel.split("/").pop().replace(".", "\\.")}"`, "u"),
            `${module.rel} imports ${program.rel} — see above`,
          );
        }

        const raw = await readFile(path.join(repoRoot, program.rel), "utf8");
        const code = stripComments(raw);
        assert.ok(code.length > 200, `${program.rel} exists and was read (${code.length} chars)`);
        assert.match(code, /await import\(/u, `${program.rel} DOES dynamically import — that is why it lives outside the closure rather than inside it with an exemption`);
        assert.doesNotMatch(code, /node:child_process/u, `${program.rel} starts no child of its own: it is a leaf of the process tree, not a second seam one directory up`);
        for (const api of [...OTHER_SPAWN_APIS, "spawn"]) {
          assert.doesNotMatch(code, new RegExp(`\\b${api}\\s*\\(`, "u"), `${program.rel} does not call \`${api}(\``);
        }
      }

      // (iii) …and the census does NAME its program, so clause (i) is not passing over silence.
      const census = modules.find((module) => module.rel === "src/work-audit/census.mjs");
      assert.ok(census != null, "the census ships");
      assert.match(census.code, /work\/audit-probe\.mjs/u, "and it names the probe as a path it hands to a child — a filename, not a module specifier");
    },
  },

  {
    name: "arch/59 FF-5904 (acd-audit-never-imports-project-code): self-check — the closure RECURSES and follows imports out of the directory, the detectors fire on every planted shape, and they stay silent on the family's real idioms (non-vacuous)",
    run: async () => {
      // A SEPARATE LANE: the sweeps above end in `deepEqual([], …)`, and evidence placed behind
      // one stops running the moment it fires — the vacuity trap this repository has filed
      // twice. Everything here is driven against a SYNTHETIC module map, so the two holes review
      // found are re-proved closed on every run without planting a file in the real tree.

      // (a) THE NESTED PLANT — QA's `src/work-audit/lanes/qa-nested.mjs`. A flat `readdir` never
      // saw it. The recursive walk is real-tree; the closure's job here is to still SWEEP it.
      const nested = {
        "src/work-audit/census.mjs": 'import { runBounded } from "./spawn.mjs";\nimport { deep } from "./lanes/qa-nested.mjs";\n',
        "src/work-audit/spawn.mjs": 'import { spawn } from "node:child_process";\n',
        "src/work-audit/lanes/qa-nested.mjs": 'import { execSync } from "node:child_process";\nimport { archTests } from "../../../test/arch/acd-thing.test.mjs";\nconst out = execSync("x", { shell: true });\n',
      };
      const nestedClosure = await importClosure(["src/work-audit/census.mjs", "src/work-audit/spawn.mjs"], async (rel) => nested[rel] ?? null);
      assert.ok(nestedClosure.closure.has("src/work-audit/lanes/qa-nested.mjs"), "the closure reaches a NESTED module — the flat readdir this gate shipped with did not");
      const nestedModules = [...nestedClosure.closure.entries()].map(([rel, code]) => ({ rel, code }));
      const nestedProblems = [...nestedModules.flatMap((module) => projectCodeReaches(module.rel, module.code)), ...spawnRouteProblems(nestedModules)];
      assert.ok(nestedProblems.some((problem) => problem.includes("outside src/")), `the nested plant's import of a test file is caught:\n${nestedProblems.join("\n")}`);
      assert.ok(nestedProblems.some((problem) => problem.includes("node:child_process directly")), "…and its second door");
      assert.ok(nestedProblems.some((problem) => problem.includes("execSync")), "…and its second process API");
      assert.ok(nestedProblems.some((problem) => problem.includes("shell:")), "…and its shell");

      // (b) THE OUT-OF-DIRECTORY PLANT — the architect's `../work-audit-loader.mjs`. A
      // directory-scoped freeze never swept it; a closure does, because it followed the import
      // that reached it.
      const sideways = {
        "src/work-audit/census.mjs": 'import { load } from "../work-audit-loader.mjs";\n',
        "src/work-audit-loader.mjs": "export async function load(cited) { return await import(cited); }\n",
      };
      const sidewaysClosure = await importClosure(["src/work-audit/census.mjs"], async (rel) => sideways[rel] ?? null);
      assert.ok(sidewaysClosure.closure.has("src/work-audit-loader.mjs"), "the closure follows an import OUT of the family directory — the freeze is on what the family can reach, not on where a file sits");
      const sidewaysProblems = [...sidewaysClosure.closure.entries()].flatMap(([rel, code]) => projectCodeReaches(rel, code));
      assert.equal(sidewaysProblems.length, 1, `and the dynamic import one directory up is caught:\n${sidewaysProblems.join("\n")}`);
      assert.match(sidewaysProblems[0], /dynamic `import\(\)`/u, sidewaysProblems[0]);

      // (c) A SPECIFIER THE SWEEP CANNOT LOAD IS REPORTED, never skipped — otherwise a rename is
      // a silent hole rather than a red.
      const dangling = await importClosure(["src/work-audit/census.mjs"], async (rel) => (rel === "src/work-audit/census.mjs" ? 'import { x } from "./gone.mjs";\n' : null));
      assert.deepEqual(dangling.unresolved, ["src/work-audit/gone.mjs"], "an unreadable member of the closure is named");

      // (d) THE POINT DETECTORS, planted one shape at a time.
      const plants = [
        ["const mod = await import(cited);", /dynamic `import\(\)`/u],
        ['const { readFile } = require("node:fs");', /reaches `require`/u],
        ['import { createRequire } from "node:module";', /reaches `require`/u],
        ['import { archTests } from "../../test/arch/acd-thing.test.mjs";', /outside src\//u],
        ['import ws from "ws";', /statically imports the package/u],
      ];
      for (const [planted, expected] of plants) {
        const problems = projectCodeReaches("src/work-audit/planted.mjs", planted);
        assert.equal(problems.length, 1, `the detector fires exactly once on: ${planted}\n${problems.join("\n")}`);
        assert.match(problems[0], expected, `and says why: ${problems[0]}`);
      }

      // THE CASES THAT MUST STAY SILENT — the family's own idioms. A detector that flagged
      // these would push the next author into a workaround, which is how a guard gets disabled.
      for (const clean of [
        'import path from "node:path";',
        'import { readFile, readdir } from "node:fs/promises";',
        'import { runBounded, DEFAULT_DEADLINE_MS } from "./spawn.mjs";',
        'import { spawn as spawnChildProcess } from "node:child_process";',
        "const suites = files.filter((rel) => rel.endsWith(\".test.mjs\"));",
      ]) {
        assert.deepEqual(projectCodeReaches("src/work-audit/census.mjs", clean), [], `the detector stays silent on \`${clean}\``);
      }

      // (e) THE SEAM'S ONE EXEMPTION IS KEYED ON ITS PATH, not on its basename — a nested
      // `lanes/spawn.mjs` must not inherit it.
      assert.deepEqual(spawnRouteProblems([{ rel: SEAM, code: 'import { spawn } from "node:child_process";' }]), [], "the SEAM importing node:child_process is exactly what is expected of it");
      assert.equal(
        spawnRouteProblems([{ rel: "src/work-audit/lanes/spawn.mjs", code: 'import { spawn } from "node:child_process";' }]).length,
        1,
        "a nested module named `spawn.mjs` does NOT inherit the seam's exemption — the exemption is a path, not a filename",
      );

      // (f) CLAUSE (E)'s DISCOVERY, planted: a SECOND sibling program the family names and
      // nobody declared. The version this gate shipped with hardcoded one path and would have
      // missed it entirely.
      const index = new Map([["work/audit-probe.mjs", "src/work/audit-probe.mjs"], ["work-audit-second.mjs", "src/work-audit-second.mjs"]]);
      const named = new Map([["src/work-audit/census.mjs", 'const probe = path.join(root, "src", "work-audit-second.mjs");\n']]);
      const second = undeclaredProgramProblems(named, index, SPAWNED_PROGRAMS);
      assert.equal(second.length, 1, `a second spawned program the family names and nobody declared is refused:\n${second.join("\n")}`);
      assert.match(second[0], /work-audit-second\.mjs/u, second[0]);
      assert.deepEqual(
        undeclaredProgramProblems(new Map([["src/work-audit/census.mjs", 'const probe = "work/audit-probe.mjs";\n']]), index, SPAWNED_PROGRAMS),
        [],
        "…and the declared one is not",
      );
      assert.deepEqual(
        undeclaredProgramProblems(new Map([["src/work-audit/census.mjs", 'const runner = "scripts/test.mjs";\n']]), index, SPAWNED_PROGRAMS),
        [],
        "…and the SUBJECT the census points a child at is not a program of ours: it resolves outside src/ and is arbitrary by design",
      );

      // A comment naming a retired shape is history, not an instance — otherwise every module
      // that documents why it does not do a thing would be flagged for documenting it.
      assert.deepEqual(
        projectCodeReaches("src/work-audit/census.mjs", stripComments('// never `await import(runner)` from here — that evaluates 880 modules in this process\nconst x = 1;\n')),
        [],
        "a comment describing the refused shape is not an instance of it (the shared stripper, line comments first)",
      );
    },
  },
];
