// Fitness function: acd-session-verb-boots-no-registry (milestone 72 / story 03, FF-7205;
// ADR-005 §1, §2).
//
//   "A presence ping fires on every prompt an operator types. It writes a small record and exits."
//
// What it used to cost was the entire command surface. Measured at HEAD before this story:
// `src/cli.mjs` took 363–384 ms to import, of which `src/command-core.mjs` alone was 324–351 ms,
// because that module statically imports all 88 command modules; the whole process was 0.609 s
// against 0.150 s for the session module alone. `src/spine/face.mjs` goes with it for the same
// reason and no other — it reaches the registry and measures the same. `src/work.mjs` STAYS: 16 ms,
// and moving it would be churn dressed as a fix.
//
// ── THE INVARIANT IS THE CLOSURE, AND DELIBERATELY NOT A DURATION ────────────────────────────
//
// A wall-clock leg reds on a slow machine and says nothing about the tree, so there is none here —
// and its ABSENCE is asserted, so the next author reaching for a timing assertion finds a stated
// reason instead of a gap. The milliseconds above are the evidence for the DECISION; the test is
// structural. (`engines` is `node >=20` and `module.registerHooks` — the only exact runtime probe —
// landed in 22.15, so a behavioural leg would be guard-if-present, which TECH_DEBT 36(c) already
// measured what a gate calls green.)
//
// ── THE LAZY IMPORT IS THE FIX, AND WHERE IT SITS IS HALF OF IT ──────────────────────────────
//
// Deferring the registry behind a dynamic import satisfies a closure walk and changes NOTHING at
// runtime if the hot path then awaits it: the same 88 modules, the same milliseconds, a different
// spelling. So the dynamic import is not forbidden — it IS the fix — and what is enumerated instead
// is where it may sit: never in the session module's closure, and never awaited before the session
// arm has dispatched. Both halves are driven against planted sources, so the matrix is real rows
// rather than one shipped file inspected twice.
//
// ── THE WALK IS PROVEN NON-VACUOUS, TWO-SIDED ────────────────────────────────────────────────
//
// An absence over an empty set is free, and a closure walker with a broken resolver — a wrong path
// join, an unhandled `export … from`, a Windows separator — returns the empty set and passes every
// absence row in silence. So each closure is additionally asserted to CONTAIN a module known to be
// in it, to clear a size floor, and the walker itself is driven against a planted fixture whose
// closure is known exactly.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { functionBody, stripComments } from "../../support/source-slice.mjs";
// THE CLOSURE WALKER IS REUSED, NOT RE-DERIVED. `importClosure` ships one directory over as an
// EXPORTED, injectable function over `(roots, load)` — the technique ADR-005 §2 names, already
// written, already proven, and already driven against planted input by its own gate. Re-deriving it
// here would be the duplication species this very milestone exists to indict, one control over: two
// walkers that agree until the day one of them learns about `export … from` and the other does not.
import { importClosure } from "../audit/acd-audit-never-imports-project-code.test.mjs";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const selfPath = fileURLToPath(import.meta.url);

const CLI_ENTRY = "src/cli.mjs";
const SESSION_MODULE = "src/commands/mesh/session.mjs";
const REGISTRY = "src/command-core.mjs";
const FACE = "src/spine/face.mjs";
const WORKSPACE = "src/work.mjs";

// Floors, not equalities. The CLI entry's closure measured 25 modules after this story (277 before)
// and the session module's 20; a ceiling would red on any story that adds a leaf, and a floor is
// what actually catches a walker that resolved nothing.
const CLI_CLOSURE_FLOOR = 5;
const SESSION_CLOSURE_FLOOR = 5;

// ── THE CLOSURE, THROUGH THE SHIPPED WALKER ──────────────────────────────────────────────────

// Static RELATIVE imports only, followed recursively wherever the modules live, and NOT a directory
// sweep — all of which `importClosure` already does. What this adds is the two things this control
// needs and that one does not owe it: a `load` that answers `null` for a specifier that is not a
// file of ours (a `.json` a module imports, say), and the entry dropped from its own closure.
//
// `export … from` is a static import too — a re-export pulls the module in exactly as an import
// does — and the shipped specifier reader matches it. The planted row below proves that rather than
// assuming it, because that is precisely the clause a second, private walker would have got wrong.
async function closureOf(entry, { root = repoRoot } = {}) {
  const { closure } = await importClosure([entry], async (rel) => {
    try { return await readFile(path.join(root, rel), "utf8"); } catch { return null; }
  });
  const out = new Set(closure.keys());
  out.delete(entry);
  return out;
}

// ── THE LAZY-IMPORT CENSORS, PURE OVER SUPPLIED SOURCES ──────────────────────────────────────

// A dynamic import of the registry or the face, however the specifier is spelled relative to the
// module doing it. Matched on the module NAME rather than on one relative path, because `../` and
// `./` are the same reach from two directories.
const DYNAMIC_REGISTRY = /\bimport\s*\(\s*["'][^"']*(?:command-core|spine\/face)\.mjs["']\s*\)/u;

// PURE — `[{ rel, code }]` in, the modules that lazily reach the registry out. Used over the
// SESSION module and everything its closure reaches, where a deferred registry is the same cost
// with a different spelling.
export function lazyRegistryProblems(sources) {
  return sources
    .filter(({ code }) => DYNAMIC_REGISTRY.test(stripComments(code)))
    .map(({ rel }) => `${rel} reaches the command registry through a dynamic import — a lazy path that awaits the registry on the session hot path costs the same 88 modules as a static one, and satisfies a closure walk while doing it.`);
}

// Every way `run()` touches the registry, as offsets into its own body. The two module specifiers
// are the reach itself; the four bindings are uses of what that reach returns; `helpText(` is a
// use because it is REGISTRY-DERIVED, which is exactly the trap that made "above the route table"
// the wrong position to hoist to.
const REGISTRY_USES = Object.freeze([
  { label: "an import of the registry", token: "command-core.mjs" },
  { label: "an import of the generic face", token: "spine/face.mjs" },
  { label: "resolveRoute", token: "resolveRoute(" },
  { label: "runCommandFace", token: "runCommandFace(" },
  { label: "getCommand", token: "getCommand(" },
  { label: "listCommands", token: "listCommands(" },
  { label: "helpText", token: "helpText(" },
]);

const SESSION_ARM = 'command === "session"';

// PURE — the CLI entry's own text in, the registry uses sitting ABOVE the session arm out. Cut
// STRUCTURALLY through `functionBody` from the one home (`test/support/source-slice.mjs`), never by
// a positional window: `test/arch/testing/acd-test-suite-registration.test.mjs`'s ledger is shrink-only and
// an unledgered file is allowed zero, which is the correct budget for a file landing today.
export function sessionArmProblems(cliCode) {
  const text = stripComments(cliCode);
  const body = functionBody(text, "export async function run(");
  if (body == null) return ["NOT FOUND — `export async function run(` owns no cuttable body, so the dispatch order cannot be read. A proof against a stale entry point is no proof."];
  const arm = body.indexOf(SESSION_ARM);
  if (arm < 0) return [`NOT FOUND — run() carries no \`${SESSION_ARM}\` arm to position anything against.`];

  const problems = [];
  for (const use of REGISTRY_USES) {
    const at = body.indexOf(use.token);
    if (at >= 0 && at < arm) {
      problems.push(`src/cli.mjs reaches the registry (${use.label}) before the session arm dispatches — a presence ping that fires on every prompt would pay the whole command surface for a code path that touches none of it.`);
    }
  }
  return problems;
}

// ── THE NO-WALL-CLOCK CENSUS, SPELLED IN PIECES ──────────────────────────────────────────────
//
// This lane reads its OWN source, so a detector table holding the literal it hunts for would red on
// itself — the self-reference the story's notes warn about. Each token is therefore assembled from
// fragments that never form the spelling anywhere in this file.
const CLOCK_TOKENS = Object.freeze([
  { label: "a clock reading", token: ["Date", "now"].join(".") },
  { label: "a monotonic clock reading", token: ["performance", "now"].join(".") },
  { label: "a high-resolution clock reading", token: ["process", "hrtime"].join(".") },
  { label: "a date construction", token: ["new", "Date"].join(" ") },
]);

const DURATION_WORDS = Object.freeze(["elapsed", "duration", "millis"]);

// PURE — the three timing spellings the feature enumerates, over supplied text.
export function wallClockProblems(source) {
  const text = stripComments(source);
  const problems = [];
  for (const clock of CLOCK_TOKENS) {
    if (text.includes(clock.token)) problems.push(`${clock.label} (\`${clock.token}\`) appears — this control asserts no wall-clock duration, because a timing leg reds on a slow machine and proves nothing structural.`);
    if (new RegExp(`${clock.token.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s*\\(\\s*\\)\\s*-`, "u").test(text)) {
      problems.push(`an elapsed-time subtraction over ${clock.label} appears — same reason.`);
    }
  }
  for (const word of DURATION_WORDS) {
    if (new RegExp(`\\b${word}\\w*\\s*[<>]=?`, "iu").test(text)) {
      problems.push(`a measured duration is compared to a bound (\`${word}\`) — same reason.`);
    }
  }
  return problems;
}

// The planted fixture, INJECTED rather than written to disk: `importClosure` takes its own `load`,
// so a Map is a complete filesystem for this row. a -> b -> deep/c -> deep/e, plus a re-EXPORT of
// deep/d, and one orphan nothing imports. The expected closure is known exactly.
const PLANTED = new Map([
  ["a.mjs", 'import { b } from "./b.mjs";\nexport const a = b;\n'],
  ["b.mjs", 'import { c } from "./deep/c.mjs";\nexport * from "./deep/d.mjs";\nexport const b = c;\n'],
  ["deep/c.mjs", 'import { e } from "./e.mjs";\nexport const c = e;\n'],
  ["deep/d.mjs", "export const d = 1;\n"],
  ["deep/e.mjs", "export const e = 1;\n"],
  ["orphan.mjs", "export const orphan = 1;\n"],
]);

const plantedLoad = async (rel) => PLANTED.get(rel) ?? null;

export const archTests = [
  {
    name: "arch/72 FF-7205 (acd-session-verb-boots-no-registry): the registry and the generic face are absent from BOTH static import closures, and the walk still finds what must be there",
    async run() {
      const cli = await closureOf(CLI_ENTRY);
      const session = await closureOf(SESSION_MODULE);

      // The absence rows — the two modules that reach the registry, out of both closures.
      assert.equal(cli.has(REGISTRY), false, `${REGISTRY} is absent from ${CLI_ENTRY}'s static closure — importing it pulls all 88 command modules onto a path that touches none of them`);
      assert.equal(cli.has(FACE), false, `${FACE} is absent from ${CLI_ENTRY}'s static closure — it reaches the registry, and it measures the same`);
      assert.equal(session.has(REGISTRY), false, `${REGISTRY} is absent from ${SESSION_MODULE}'s static closure`);
      assert.equal(session.has(FACE), false, `${FACE} is absent from ${SESSION_MODULE}'s static closure`);

      // THE TWO-SIDED ROWS: what the SAME walk must still find, so an empty walk cannot pass.
      assert.equal(cli.has(WORKSPACE), true, `${WORKSPACE} is still in ${CLI_ENTRY}'s closure — 16 ms, and moving it would be churn dressed as a fix`);
      assert.equal(cli.has(SESSION_MODULE), true, `${SESSION_MODULE} is in ${CLI_ENTRY}'s closure — the session verb is what this file still loads`);
      assert.equal(session.has(WORKSPACE), true, `${WORKSPACE} is in ${SESSION_MODULE}'s closure`);

      assert.ok(cli.size >= CLI_CLOSURE_FLOOR, `${CLI_ENTRY}'s closure cleared the non-vacuity floor: ${cli.size} modules`);
      assert.ok(session.size >= SESSION_CLOSURE_FLOOR, `${SESSION_MODULE}'s closure cleared the non-vacuity floor: ${session.size} modules`);
    },
  },

  {
    name: "arch/72 FF-7205 (acd-session-verb-boots-no-registry): the walk is TRANSITIVE, driven against a planted fixture whose closure is known exactly",
    async run() {
      const { closure, unresolved } = await importClosure(["a.mjs"], plantedLoad);
      const reached = new Set(closure.keys());
      reached.delete("a.mjs");

      // `deep/c.mjs` and `deep/e.mjs` are reached only through intermediates, and `deep/d.mjs`
      // only through an `export … from` — a re-export pulls a module in exactly as an import does,
      // and a walker that reads only `import` lines misses it.
      assert.deepEqual([...reached].sort(), ["b.mjs", "deep/c.mjs", "deep/d.mjs", "deep/e.mjs"], "the closure is exactly the modules the entry reaches, transitively");

      // …and the walk does not invent members: a module nothing imports is not in it.
      assert.equal(reached.has("orphan.mjs"), false, "a module nothing imports is not in the closure — the walk is not a directory sweep");
      assert.deepEqual(unresolved, [], "…and nothing in the fixture failed to load, so the row measures the walk rather than a gap in the fixture");
    },
  },

  {
    name: "arch/72 FF-7205 (acd-session-verb-boots-no-registry): where a dynamic import of the registry may sit — the session closure holds none, and none is awaited above the session arm",
    async run() {
      // THE SHIPPED HALF: no module in the session module's closure lazily reaches the registry.
      const sources = [];
      for (const rel of [SESSION_MODULE, ...(await closureOf(SESSION_MODULE))]) {
        sources.push({ rel, code: await readFile(path.join(repoRoot, rel), "utf8") });
      }
      assert.ok(sources.length > SESSION_CLOSURE_FLOOR, `the session closure resolved (non-vacuous): ${sources.length} modules read`);
      const lazy = lazyRegistryProblems(sources);
      assert.deepEqual(lazy, [], `no module on the session path defers the registry rather than dropping it:\n  ${lazy.join("\n  ")}`);

      const cliCode = await readFile(path.join(repoRoot, CLI_ENTRY), "utf8");
      const shipped = sessionArmProblems(cliCode);
      assert.deepEqual(shipped, [], `src/cli.mjs dispatches the session arm above every registry use:\n  ${shipped.join("\n  ")}`);

      // THE MATRIX, driven against PLANTED sources so each row is a row rather than one shipped
      // file inspected five times.
      assert.equal(lazyRegistryProblems([{ rel: SESSION_MODULE, code: 'const { invoke } = await import("../command-core.mjs");' }]).length, 1, "a lazy registry import IN the session module fails, naming that module");
      assert.equal(lazyRegistryProblems([{ rel: "src/mesh-session-store.mjs", code: 'const face = await import("./spine/face.mjs");' }]).length, 1, "…and one in a module its closure reaches fails, naming that module");
      assert.deepEqual(lazyRegistryProblems([{ rel: SESSION_MODULE, code: '// await import("../command-core.mjs") is what we must NOT do\nexport const x = 1;' }]), [], "…while the same words inside a comment are prose, not a reach");

      const armed = (bodyLines) => `export async function run(argv) {\n  const [command, ...rest] = argv;\n${bodyLines}\n}\n`;
      const above = armed('  const { resolveRoute } = await import("./spine/face.mjs");\n  if (command === "session") { return; }');
      assert.equal(sessionArmProblems(above).length, 1, "a registry import in the CLI entry AWAITED above the session arm fails, naming the CLI entry");
      const below = armed('  if (command === "session") { return; }\n  const { resolveRoute } = await import("./spine/face.mjs");\n  resolveRoute(argv);');
      assert.deepEqual(sessionArmProblems(below), [], "…on a dispatch arm BELOW the session arm it passes");
      const helpOnly = `${armed('  if (command === "session") { return; }\n  console.log(await helpText());')}async function helpText() {\n  const { listCommands } = await import("./command-core.mjs");\n  return listCommands().length;\n}\n`;
      assert.deepEqual(sessionArmProblems(helpOnly), [], "…and inside the help listing, which run() reaches only below the arm, it passes");

      // The cut itself is proven to fail LOUDLY rather than vacuously, because a control that
      // cannot find its subject and says nothing is worse than one that is absent.
      assert.match(sessionArmProblems("export const nothing = 1;\n")[0], /NOT FOUND/u, "a runner with no run() body is NOT FOUND, never silently clean");
      assert.match(sessionArmProblems("export async function run(argv) {\n  return argv;\n}\n")[0], /NOT FOUND/u, "…and a run() with no session arm is NOT FOUND too");
    },
  },

  {
    name: "arch/72 FF-7205 (acd-session-verb-boots-no-registry): this control asserts NO wall-clock duration, and the census that says so is not vacuous",
    async run() {
      const own = await readFile(selfPath, "utf8");
      const problems = wallClockProblems(own);
      assert.deepEqual(problems, [], `this control contains no timing assertion — a wall-clock leg reds on a slow machine and proves nothing structural:\n  ${problems.join("\n  ")}`);

      // NON-VACUOUS, driven three ways — one per spelling the feature enumerates.
      // Each planted spelling is ASSEMBLED, for the same reason the detector table is: a literal
      // here would be a timing spelling in this control's own source, and this control censuses
      // its own source.
      for (const planted of [
        `const t = ${["Date", "now"].join(".")}();`,
        `const spent = ${["performance", "now"].join(".")}() - started;`,
        `assert.ok(${["elapsed", "Ms"].join("")} < 200);`,
      ]) {
        assert.ok(wallClockProblems(planted).length > 0, `the census catches a planted timing spelling: ${planted}`);
      }
      assert.deepEqual(wallClockProblems("const budget = 200;\nassert.ok(modules.size >= 5);"), [], "…and admits a structural bound, which is not a duration");
    },
  },
];
