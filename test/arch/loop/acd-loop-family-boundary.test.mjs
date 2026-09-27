// Fitness function: acd-loop-family-boundary (milestone 129 / story 05; FF-12902 and FF-12906;
// ADR-005 §5 and ADR-001 §3) —
//
//   FF-12902  "A lane drive is a child process."
//   FF-12906  "The wave is read, never recomputed."
//
// THE FAMILY is `src/commands/loop.mjs` plus every `src/loop/*.mjs`, and both controls are
// boundaries on what it may reach — measured over DIRECT imports (`importSpecifiers`, resolved
// against the importing module; never a closure walk, because `src/commands/loop.mjs`'s static
// closure already reaches the session driver through the registry and a closure leg would be
// red on the shipped tree for a reason that is not this invariant's).
//
// FF-12902, three legs. IMPORT — no family module imports `agent-session-driver.mjs`, `node-pty`
// or `claude-trust.mjs`: three loop deaths on 2026-09-12 happened at the driver's kill of a
// finished session inside the loop's own process, and N drivers in one process would multiply
// that surface by N. SPAWN — `src/loop/child-drive.mjs` is the ONLY module under `src/loop/` that
// reaches `runBounded` or `node:child_process` (the exclusivity leg is the family's alone —
// `src/commands/loop.mjs`'s own git `execFile` is pre-existing and outside it, VERIFICATION F-17),
// its spawn command is `process.execPath`, and its argument vector takes both branches of
// ADR-005 §1's amendment: under Node the first element resolves to `src/cli.mjs`; under a SEA,
// flipped through `setSeaSentinelForTest`, the verb words are the whole argv. SHELL — no `shell:`
// option anywhere under `src/loop/`. NON-VACUOUS: the spawn leg must FIND the `runBounded(` call.
//
// FF-12906, two legs. IMPORT — the family imports neither `src/ready-wave.mjs` nor
// `src/story-contract.mjs`: the partition is `work:next`'s (71/ADR-006), and a loop that could
// reach the partitioner could recompute it. WAVE-READ — every `.wave` / `.heldSet` read in the
// family is guarded by an `invokeRegistered("work:next"` call in its enclosing function (the
// enclosing-function rule FF-12702 uses, through `classifySites`), and every `work:next` ask in
// `src/loop/wave.mjs` carries `throughReview: true` — the walk that sees the wave (ADR-001 §3).
// `brief.wave` is the run record's declaration of what the loop DISPATCHED, not the partition,
// and is not a site. NON-VACUOUS: the leg must FIND the `work:next` asks before it judges them.
//
// Red probes (VERIFICATION.md's register): import `driveInteractiveClaudeSession` into
// `wave.mjs`; pass `shell: true` in `child-drive.mjs`'s `runBounded(` options; import and call
// `partitionReadySetByDeclaredFiles` from `wave.mjs`.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NESTED_FUNCTION_DECLARATION_RE, classifySites, matchedParenSpan, stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SHELL = "src/commands/loop.mjs";
const FAMILY_DIR = "src/loop";
const SPAWN_SEAM = "src/loop/child-drive.mjs";
const WAVE = "src/loop/wave.mjs";

// The modules a lane drive must never run inside the loop's process (ADR-005 §5).
export const DRIVER_MODULES = Object.freeze(["agent-session-driver.mjs", "claude-trust.mjs"]);
export const DRIVER_PACKAGES = Object.freeze(["node-pty"]);
// The modules that own the partition (ADR-001 §3, 71/ADR-006).
export const PARTITION_MODULES = Object.freeze(["ready-wave.mjs", "story-contract.mjs"]);

// A member access, never a spread: `[...wave.members]` carries `.wave` as the spread's third dot.
const SITE_RE = /(?<!\bbrief\??)(?<!\.)\.(?:wave|heldSet)\b/gu;
const GUARD_RE = /invokeRegistered\(\s*"work:next"/u;

const toPosix = (value) => String(value).split(path.sep).join("/");

// A specifier resolved against its importer, as a repo-relative posix path; a package or a
// builtin stays as spelled.
function resolved(fromRel, specifier) {
  if (specifier.startsWith("node:") || !specifier.startsWith(".")) return specifier;
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), specifier));
}

// PURE — over `[{ rel, code }]` (raw source; `importSpecifiers` strips comments itself).
export function driverImportProblems(units) {
  const problems = [];
  for (const { rel, code } of units) {
    for (const { specifier } of importSpecifiers(code)) {
      const target = resolved(rel, specifier);
      const leaf = target.split("/").pop();
      if (DRIVER_MODULES.includes(leaf) || DRIVER_PACKAGES.includes(target)) {
        problems.push(`${rel} imports ${specifier} (→ ${target}) — the loop family never loads the session driver; a lane's drive is a child process through src/loop/child-drive.mjs (129/ADR-005 §5)`);
      }
    }
  }
  return problems;
}

export function partitionImportProblems(units) {
  const problems = [];
  for (const { rel, code } of units) {
    for (const { specifier } of importSpecifiers(code)) {
      const target = resolved(rel, specifier);
      if (PARTITION_MODULES.includes(target.split("/").pop())) {
        problems.push(`${rel} imports ${specifier} (→ ${target}) — the wave is read off work:next's answer and never recomputed (129/ADR-001 §3, 71/ADR-006)`);
      }
    }
  }
  return problems;
}

// PURE — which modules of the family reach a process at all, and how.
export function spawnRouteProblems(units) {
  const problems = [];
  const reaching = [];
  for (const { rel, code } of units) {
    const stripped = stripComments(code);
    const viaSeam = /\brunBounded\s*\(/u.test(stripped);
    const viaBuiltin = importSpecifiers(code).some(({ specifier }) => specifier === "node:child_process" || specifier === "child_process");
    if (viaSeam || viaBuiltin) reaching.push(rel);
    if (rel !== SPAWN_SEAM && (viaSeam || viaBuiltin)) {
      problems.push(`${rel} reaches ${viaSeam ? "runBounded(" : "node:child_process"} — ${SPAWN_SEAM} is the family's one spawn seam (129/ADR-005 §1)`);
    }
    if (/\bshell\s*:/u.test(stripped)) {
      problems.push(`${rel} passes a \`shell:\` option — the seam takes an argument vector and no shell reads it (129/ADR-005 §1: no shell, ever)`);
    }
  }
  return { problems, reaching };
}

// PURE — the seam's own spawn: `runBounded({ command: process.execPath, … })`, found or not.
export function seamSpawnFacts(code) {
  const stripped = stripComments(code);
  const at = stripped.indexOf("runBounded(");
  if (at < 0) return { found: false, execPath: false };
  const span = matchedParenSpan(stripped, at);
  if (span == null) return { found: false, execPath: false };
  return { found: true, execPath: /\bcommand\s*:\s*process\.execPath\b/u.test(span.body), body: span.body };
}

// PURE — every `work:next` ask in the wave, with whether it carries `throughReview: true`.
export function waveAsks(code) {
  const stripped = stripComments(code);
  const asks = [];
  for (const match of stripped.matchAll(/invokeRegistered\(\s*"work:next"/gu)) {
    const span = matchedParenSpan(stripped, match.index);
    asks.push({ at: match.index, throughReview: span != null && /\bthroughReview\s*:\s*true\b/u.test(span.body) });
  }
  return asks;
}

export function waveReadSites(code) {
  return classifySites(code, { siteRe: SITE_RE, guardRe: GUARD_RE, declarationRe: NESTED_FUNCTION_DECLARATION_RE });
}

async function familyUnits() {
  const rels = [SHELL];
  for (const entry of (await readdir(path.join(repoRoot, FAMILY_DIR), { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.isFile() && entry.name.endsWith(".mjs")) rels.push(`${FAMILY_DIR}/${entry.name}`);
  }
  const units = [];
  for (const rel of rels) units.push({ rel, code: await readFile(path.join(repoRoot, toPosix(rel)), "utf8") });
  return units;
}

const familyOnly = (units) => units.filter((unit) => unit.rel.startsWith(`${FAMILY_DIR}/`));

export const archTests = [
  {
    name: "arch/129/05 FF-12902 import leg: src/commands/loop.mjs and every src/loop/*.mjs import neither the session driver, node-pty nor claude-trust (direct specifiers, resolved)",
    run: async () => {
      const units = await familyUnits();
      assert.ok(units.length >= 4, `the family was read: ${units.map((unit) => unit.rel).join(", ")}`);
      assert.ok(units.every((unit) => importSpecifiers(unit.code).length > 0), "every family module imports something — the specifier reader is reading");
      const problems = driverImportProblems(units);
      assert.deepEqual(problems, [], `no PTY driver in the loop family:\n${problems.join("\n")}`);
    },
  },
  {
    name: "arch/129/05 FF-12902 spawn leg: src/loop/child-drive.mjs is the only module under src/loop/ reaching runBounded or node:child_process; its command is process.execPath and its argv takes the Node and the SEA branch",
    run: async () => {
      const units = familyOnly(await familyUnits());
      const seam = units.find((unit) => unit.rel === SPAWN_SEAM);
      assert.ok(seam != null, `${SPAWN_SEAM}: NOT FOUND — the family has no spawn seam`);
      const facts = seamSpawnFacts(seam.code);
      assert.ok(facts.found, `${SPAWN_SEAM}: NOT FOUND — no runBounded( call; the seam spawns nothing this leg can judge`);
      assert.ok(facts.execPath, `${SPAWN_SEAM}: runBounded is given \`command: process.execPath\` — the drive is this interpreter's own CLI (129/ADR-005 §1)`);
      assert.match(stripComments(seam.code), /new URL\(\s*"\.\.\/cli\.mjs"\s*,\s*import\.meta\.url\s*\)/u, `${SPAWN_SEAM}: the Node branch resolves the entry from this module's own location`);
      assert.match(stripComments(seam.code), /\bisPackaged\(\)/u, `${SPAWN_SEAM}: the branch is decided by interpreter identity (isPackaged), never by file presence`);

      const route = spawnRouteProblems(units);
      assert.deepEqual(route.reaching, [SPAWN_SEAM], `exactly one module of src/loop/ reaches a process: ${route.reaching.join(", ") || "none"}`);
      assert.deepEqual(route.problems.filter((problem) => !problem.includes("`shell:`")), [], `the family's one spawn seam:\n${route.problems.join("\n")}`);

      // THE ARGUMENT VECTOR, both branches, through the seam's injectable child — no process.
      const { spawnLaneDrive } = await import("../../../src/loop/child-drive.mjs");
      const { setSeaSentinelForTest } = await import("../../../src/asset-base.mjs");
      const { EventEmitter } = await import("node:events");
      const calls = [];
      const spawnChild = (command, args, options) => {
        const child = new EventEmitter();
        child.stdout = Object.assign(new EventEmitter(), { setEncoding() {} });
        child.stderr = Object.assign(new EventEmitter(), { setEncoding() {} });
        child.stdin = { end() {} };
        child.kill = () => {};
        calls.push({ command, args, options });
        setImmediate(() => {
          child.stdout.emit("data", JSON.stringify({ ref: "07/01", phase: "continue", outcome: "done", sessionId: "s" }));
          child.emit("close", 0, null);
        });
        return child;
      };
      const lane = { ref: "07/01", phase: "continue", runId: "r1", lane: path.join(repoRoot, ".aof", "mesh", "dispatch-worktrees", "dispatch-07-01"), spawnChild };
      await spawnLaneDrive(lane);
      assert.equal(calls.length, 1, "the Node branch spawned once");
      assert.equal(calls[0].command, process.execPath, "the command is process.execPath");
      assert.equal(path.resolve(calls[0].args[0]), path.resolve(repoRoot, "src", "cli.mjs"), "under Node the argv's first element resolves to src/cli.mjs");
      assert.deepEqual(calls[0].args.slice(1, 3), ["work", "drive"], "…followed by the verb words");
      assert.equal("shell" in (calls[0].options ?? {}), false, "no shell option reaches the child");
      setSeaSentinelForTest(true);
      try {
        await spawnLaneDrive(lane);
      } finally {
        setSeaSentinelForTest(undefined);
      }
      assert.equal(calls.length, 2, "the SEA branch spawned once");
      assert.equal(calls[1].command, process.execPath, "under a SEA the exe is the CLI");
      assert.deepEqual(calls[1].args.slice(0, 2), ["work", "drive"], "under a SEA the verb words are the whole argv — no entry element");
      assert.equal(calls[1].args.some((arg) => String(arg).endsWith("cli.mjs")), false, "nothing ending in cli.mjs under a SEA");
    },
  },
  {
    name: "arch/129/05 FF-12902 shell leg: no `shell:` option appears anywhere under src/loop/",
    run: async () => {
      const units = familyOnly(await familyUnits());
      assert.ok(units.some((unit) => unit.rel === SPAWN_SEAM), `${SPAWN_SEAM}: NOT FOUND`);
      const shells = spawnRouteProblems(units).problems.filter((problem) => problem.includes("`shell:`"));
      assert.deepEqual(shells, [], `no shell in the loop family:\n${shells.join("\n")}`);
    },
  },
  {
    name: "arch/129/05 FF-12906 import leg: the loop family imports neither src/ready-wave.mjs nor src/story-contract.mjs — the partition is work:next's",
    run: async () => {
      const units = await familyUnits();
      assert.ok(units.some((unit) => unit.rel === WAVE), `${WAVE}: NOT FOUND`);
      const problems = partitionImportProblems(units);
      assert.deepEqual(problems, [], `the wave is read, never recomputed:\n${problems.join("\n")}`);
    },
  },
  {
    name: "arch/129/05 FF-12906 wave-read leg: every .wave / .heldSet read in the family is bound off an invokeRegistered(\"work:next\" answer in its enclosing function, and every work:next ask in src/loop/wave.mjs carries throughReview: true",
    run: async () => {
      const units = await familyUnits();
      const wave = units.find((unit) => unit.rel === WAVE);
      assert.ok(wave != null, `${WAVE}: NOT FOUND`);
      const asks = waveAsks(wave.code);
      assert.ok(asks.length > 0, `${WAVE}: NOT FOUND — no invokeRegistered("work:next" call; the wave asks nothing this leg can judge`);
      assert.ok(asks.every((ask) => ask.throughReview), `${WAVE}: every work:next ask carries throughReview: true — the walk that sees the wave (129/ADR-001 §3); ${asks.filter((ask) => !ask.throughReview).length} of ${asks.length} do not`);

      let sites = 0;
      const unguarded = [];
      for (const unit of units) {
        for (const site of waveReadSites(unit.code)) {
          sites += 1;
          if (!site.guarded) unguarded.push(`${unit.rel}:${site.line} reads \`${site.text}\` in ${site.fn} with no invokeRegistered("work:next" ask above it in that function — the wave is read off the answer, never recomputed or carried in from elsewhere`);
        }
      }
      assert.ok(sites > 0, `${WAVE}: NOT FOUND — no .wave / .heldSet read anywhere in the family; the classifier is reading the wrong tree`);
      assert.deepEqual(unguarded, [], `every wave read is off a work:next answer:\n${unguarded.join("\n")}`);
    },
  },
  {
    name: "arch/129/05 FF-12902 / FF-12906 self-check: each planted defect is caught by the detector the real tree is measured by",
    run: async () => {
      const units = await familyUnits();
      const planted = (rel, mutate) => units.map((unit) => (unit.rel === rel ? { ...unit, code: mutate(unit.code) } : unit));

      const driver = driverImportProblems(planted(WAVE, (code) => `import { driveInteractiveClaudeSession } from "../agent-session-driver.mjs";\n${code}`));
      assert.ok(driver.some((problem) => problem.includes(WAVE) && problem.includes("agent-session-driver")), `the driver import is named:\n${driver.join("\n")}`);
      const pty = driverImportProblems(planted(SHELL, (code) => `${code}\nconst pty = await import("node-pty");\n`));
      assert.ok(pty.some((problem) => problem.includes(SHELL) && problem.includes("node-pty")), "a dynamic node-pty import is named");

      const shell = spawnRouteProblems(familyOnly(planted(SPAWN_SEAM, (code) => code.replace("stdin: \"pipe\",", "stdin: \"pipe\",\n    shell: true,"))));
      assert.ok(shell.problems.some((problem) => problem.includes(SPAWN_SEAM) && problem.includes("shell:")), `shell: true is named:\n${shell.problems.join("\n")}`);
      const second = spawnRouteProblems(familyOnly(planted(WAVE, (code) => `import { runBounded } from "../work-audit/spawn.mjs";\n${code}\nexport const plant = () => runBounded({});\n`)));
      assert.deepEqual(second.reaching.sort(), [SPAWN_SEAM, WAVE].sort(), "a second module reaching runBounded is found");
      assert.ok(second.problems.some((problem) => problem.includes(WAVE) && problem.includes("runBounded(")), "…and named");

      const seam = units.find((unit) => unit.rel === SPAWN_SEAM);
      assert.equal(seamSpawnFacts(seam.code.replace(/runBounded\(/u, "runElsewhere(")).found, false, "with the runBounded( call removed the spawn leg is NOT FOUND");
      assert.equal(seamSpawnFacts(seam.code.replace(/command:\s*process\.execPath/u, "command: \"node\"")).execPath, false, "a command that is not process.execPath is caught");

      const partition = partitionImportProblems(planted(WAVE, (code) => `import { partitionReadySetByDeclaredFiles } from "../ready-wave.mjs";\n${code}\nexport const plant = (set) => partitionReadySetByDeclaredFiles(set);\n`));
      assert.ok(partition.some((problem) => problem.includes(WAVE) && problem.includes("ready-wave")), `the partitioner import is named:\n${partition.join("\n")}`);

      const wave = units.find((unit) => unit.rel === WAVE);
      const noAsk = waveAsks(wave.code.replace(/invokeRegistered\(\s*"work:next"/gu, 'invokeRegistered("work:list"'));
      assert.equal(noAsk.length, 0, "with the asks removed the wave-read leg is NOT FOUND");
      const notThrough = waveAsks(wave.code.replace(/throughReview:\s*true/gu, "throughReview: false"));
      assert.ok(notThrough.length > 0 && notThrough.every((ask) => !ask.throughReview), "an ask without throughReview: true is seen");
      const recomputed = waveReadSites(`${wave.code}\nasync function plant(answer) {\n  return answer.wave.length + answer.heldSet.length;\n}\n`);
      const unguarded = recomputed.filter((site) => !site.guarded);
      assert.deepEqual(unguarded.map((site) => [site.fn, site.text]), [["plant", ".wave"], ["plant", ".heldSet"]], "a wave read with no work:next ask in its function is unguarded — and the shipped reads all are");
      assert.deepEqual(waveReadSites("function ok(record) {\n  return record.brief?.wave == null && record.brief.wave;\n}\n"), [], "brief.wave is the run's declaration, not a partition read");
    },
  },
];
