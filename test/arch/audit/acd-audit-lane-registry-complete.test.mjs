// Fitness function: acd-audit-lane-registry-complete (milestone 77 / story 05, FF-7708;
// ADR-001 §2, ADR-008 §3, §5, ADR-010 §2, §4).
//
//   "Every registered lane executes as ITSELF, declares a floor and a limit, and starts no child."
//
// ── WHY THE REGISTRY IS THE SUBJECT, NEVER A LIST OF FOUR ────────────────────────────────────
//
// Every requirement below is driven FROM `REPORT_LANES`, over whatever is registered. That is the
// difference between a contract this milestone satisfies and one the next milestone inherits: a
// fifth lane cannot arrive without a runner of its own, a read record, a floor above zero and — if
// it reads TEXT — a statement of what it could not see, because the drive does not know how many
// lanes there are.
//
// ── THE FALL-THROUGH A FOURTH LANE WOULD HAVE HIT ────────────────────────────────────────────
//
// The registry was, until recently, a frozen description dispatched by a ternary chain whose final
// branch was the registry-checks lane. A fourth entry appended to it would have re-run the checks
// lane under its own name, duplicated every finding it raised, and reddened nothing. A fourth entry
// is exactly what this milestone added, so the two ways that failure appears are both driven here:
// an entry with NO runner, and two entries sharing ONE.
//
// ── AND WHAT THE FACE INJECTS, THE FAMILY MAY NOT REACH ──────────────────────────────────────
//
// `59/FF-5904` forbids `src/work-audit/**` from reaching outside `src/` or holding a clock. Three
// facts the rules need come from outside: the marker naming framework-authored hook entries, the
// audited project's resolved role routing, and the subject root. All three arrive as arguments at
// the impure boundary — and a fact read in two places has two expiry dates, so the ABSENCE of a
// second reader inside the family is asserted rather than assumed.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { functionBody, stripComments } from "../../support/source-slice.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import {
  REPORT_LANES,
  assertLaneLimits,
  assertLaneRead,
  assertLaneRunnersDistinct,
  runAudit,
} from "../../../src/work-audit/report.mjs";
import { sweepDeclarationProblems } from "../../../src/work-audit/reads.mjs";
import { PROMPT_LAYER_SWEEPS } from "../../../src/work-audit/prompt-layer.mjs";
import { HOOK_WIRING_SWEEPS } from "../../../src/work-audit/hook-wiring.mjs";
import { SEAM_LIVENESS_SWEEPS } from "../../../src/work-audit/seam-liveness.mjs";
import { DECLARED_BOUNDS_SWEEPS } from "../../../src/work-audit/declared-bounds.mjs";
import { auditCommand } from "../../../src/commands/audit.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The modules milestone 77 adds. A list rather than a directory sweep, because `census.mjs`,
// `evidence.mjs` and `spawn.mjs` are 59's and legitimately start children.
const MILESTONE_MODULES = Object.freeze([
  "src/work-audit/prompt-layer.mjs",
  "src/work-audit/hook-wiring.mjs",
  "src/work-audit/seam-liveness.mjs",
  "src/work-audit/declared-bounds.mjs",
  "src/work-audit/toolkit.mjs",
  "src/harness-reference.mjs",
]);

// Every sweep registry milestone 77 adds, so the floor claim is made over declarations rather than
// over one run's output.
const MILESTONE_SWEEPS = Object.freeze([
  ...PROMPT_LAYER_SWEEPS,
  ...HOOK_WIRING_SWEEPS,
  ...SEAM_LIVENESS_SWEEPS,
  ...DECLARED_BOUNDS_SWEEPS,
]);

const read = (over = {}) => ({
  sweep: "a-sweep",
  root: "the-root",
  what: "the population it walked",
  basis: "disk",
  count: 3,
  floor: 1,
  ...over,
});

const limit = (over = {}) => ({
  sweep: "a-sweep",
  basis: "text",
  question: "what could this run not see?",
  answeredBy: null,
  consequence: "it under-reports where it cannot read, and says so",
  authority: null,
  ...over,
});

const source = (rel) => stripComments(readFileSync(path.join(repoRoot, rel), "utf8"));

// ── THE DETECTORS, PURE ──────────────────────────────────────────────────────────────────────

const CHILD_PROCESS_APIS = Object.freeze(["exec", "execFile", "execFileSync", "execSync", "spawnSync", "fork"]);

/** Every route to a child process a module could hold, including the family's own bounded seam. */
export function childProcessRoutes(rel, code) {
  const found = [];
  if (/from\s+"node:child_process"/u.test(code)) found.push(`${rel} imports node:child_process`);
  for (const api of CHILD_PROCESS_APIS) {
    // NOT PRECEDED BY A DOT: `regex.exec(text)` is a string read, and flagging it would make this
    // clause a rule about regular expressions. The call being refused is the bare one.
    if (new RegExp(`(?<![.\\w])${api}\\s*\\(`, "u").test(code)) found.push(`${rel} calls ${api}`);
  }
  if (/\brunBounded\s*\(|from\s+"\.\/spawn\.mjs"/u.test(code)) found.push(`${rel} reaches the family's bounded spawn seam`);
  return found;
}

/** A second route to a fact the face injects — the shapes that would make the family read it itself. */
export function injectionBypasses(rel, code) {
  const found = [];
  if (/from\s+"[^"]*claude-settings\.mjs"/u.test(code)) found.push(`${rel} imports the settings module`);
  if (/AOF_HOOK_MARKER/u.test(code)) found.push(`${rel} imports or names the marker key rather than taking a parameter`);
  if (/["'`]aof["'`]\s*\]\s*=|["'`]aofHook["'`]/u.test(code)) found.push(`${rel} spells the marker key as a literal`);
  if (/work\?\.\s*agents|work\.agents|\bagents\?\.\s*(?:productOwner|mode)/u.test(code)) found.push(`${rel} reads the role-routing configuration key`);
  if (/readFile\s*\([^)]*settings\.json/u.test(code)) found.push(`${rel} reads the audited settings file from disk`);
  if (/Date\.now\s*\(\)|new Date\s*\(\s*\)/u.test(code)) found.push(`${rel} reads a wall clock`);
  if (/import\.meta\.url/u.test(code) && !rel.endsWith("toolkit.mjs")) found.push(`${rel} derives a root from its own location`);
  return found;
}

export const archTests = [
  // ── (A) EVERY ENTRY EXECUTES AS ITSELF ─────────────────────────────────────────────────────
  {
    name: "arch/77 FF-7708 (acd-audit-lane-registry-complete): every registry entry carries its OWN runner, and neither a missing one nor a shared one can run",
    run() {
      assert.ok(REPORT_LANES.length >= 7, `the registry was read (${REPORT_LANES.length} lanes)`);
      assert.deepEqual(
        REPORT_LANES.filter((lane) => typeof lane.run !== "function").map((lane) => lane.id),
        [],
        "no entry lacks a runner",
      );
      const runners = new Set(REPORT_LANES.map((lane) => lane.run));
      assert.equal(runners.size, REPORT_LANES.length, "no two entries share a runner — each reports under its own name");
      assert.equal(new Set(REPORT_LANES.map((lane) => lane.id)).size, REPORT_LANES.length, "…and each id is distinct");
      assert.doesNotThrow(() => assertLaneRunnersDistinct(REPORT_LANES), "the shipped registry is executable as written");

      // BOTH FALL-THROUGH SHAPES, PLANTED, each refused BY NAME.
      assert.throws(
        () => assertLaneRunnersDistinct([{ id: "runner-less" }, ...REPORT_LANES]),
        /"runner-less" lane declares no runner/u,
        "an entry declaring no runner is refused, naming that entry",
      );
      const shared = () => ({ findings: [], reads: [read()] });
      assert.throws(
        () => assertLaneRunnersDistinct([{ id: "one", run: shared }, { id: "two", run: shared }]),
        /"one" and "two" lanes declare the same runner/u,
        "two entries sharing one runner are refused, naming both",
      );
    },
  },
  {
    name: "arch/77 FF-7708: a lane whose read record is not declared is refused, never degraded to a clean pass",
    run() {
      // The obligation is checked FROM THE REGISTRY'S OWN VALIDATOR, so a fifth lane meets the same
      // bar as the seven registered ones.
      assert.doesNotThrow(() => assertLaneRead("a-lane", [read()]), "a complete read record is admitted");
      const rows = [
        [undefined, /returned no read record/u, "no read record at all"],
        [[read({ floor: undefined })], /declares no floor/u, "a sweep declaring no floor"],
        [[read({ floor: 0 })], /declares no floor/u, "a sweep declaring a floor of zero"],
        [[read({ root: "" })], /declares no root/u, "a sweep declaring no root"],
        [[read({ basis: undefined })], /declares no basis/u, "a sweep that does not say how the population was read"],
        [[read({ count: undefined })], /declares no count/u, "a read record carrying no count"],
      ];
      for (const [reads, expected, what] of rows) {
        assert.throws(() => assertLaneRead("a-lane", reads), expected, `${what} is refused, naming the lane`);
        assert.throws(() => assertLaneRead("a-lane", reads), /a-lane/u, `${what}: …by name`);
      }
    },
  },
  {
    name: "arch/77 FF-7708: a TEXT sweep owes a limit, and one that cannot be rendered is refused rather than blanked",
    run() {
      const textRead = [read({ basis: "text" })];
      const diskRead = [read({ basis: "disk" })];
      const rows = [
        [textRead, [limit()], null, "a limit stating its question, what answered it and the consequence"],
        [textRead, [limit({ question: "" })], /declares no question/u, "a limit that states no question"],
        [textRead, [limit({ consequence: "" })], /declares no consequence/u, "a limit that states no consequence"],
        [textRead, undefined, /read TEXT[\s\S]*stated no limit/u, "no limit at all, over a text sweep"],
        [textRead, [], /read TEXT[\s\S]*stated no limit/u, "an empty limit list, over a text sweep"],
        [diskRead, undefined, null, "no limit at all, over a disk sweep"],
      ];
      for (const [reads, limits, expected, what] of rows) {
        if (expected == null) {
          assert.doesNotThrow(() => assertLaneLimits("a-lane", limits, reads), `${what}: the run completes`);
          continue;
        }
        assert.throws(() => assertLaneLimits("a-lane", limits, reads), expected, `${what}: the run is refused`);
        assert.throws(() => assertLaneLimits("a-lane", limits, reads), /a-lane/u, `${what}: …naming the lane`);
      }
    },
  },
  {
    name: "arch/77 FF-7708: every sweep this milestone registers declares a floor above zero and says how it read",
    run() {
      assert.ok(MILESTONE_SWEEPS.length >= 6, `every sweep registry this milestone adds was read (${MILESTONE_SWEEPS.length})`);
      assert.deepEqual(sweepDeclarationProblems(MILESTONE_SWEEPS), [], "each is declared by the same validator every lane's is");
      for (const sweep of MILESTONE_SWEEPS) {
        assert.ok(sweep.floor > 0, `${sweep.id} declares a floor above zero (${sweep.floor})`);
      }
      // AND A TEXT SWEEP IS PRESENT, so the limit obligation above is not a rule with no subject.
      assert.ok(MILESTONE_SWEEPS.some((sweep) => sweep.basis === "text"), "at least one of them reads TEXT, which is what makes the limit obligation load-bearing");
    },
  },
  {
    name: "arch/77 FF-7708: a further lane arriving without a runner, a read record or a limit cannot complete a run",
    async run() {
      const base = {
        repoRoot,
        model: { present: false, source: null, nodes: [], findings: [] },
        items: [],
        now: 0,
        anchorWindowMs: 1,
      };
      const good = Object.freeze({
        id: "further",
        what: "a further lane",
        scoped: false,
        instrument: "module:nowhere#none",
        whyUnscoped: "it is a fixture",
        population: null,
        codes: ["audit-further"],
        run: () => ({ findings: [], reads: [read()], limits: [] }),
      });
      const report = await runAudit({ ...base, lanes: [good] });
      assert.equal(report.lanes[0].ran, true, "a well-formed further lane runs, driven through the real registry path");
      assert.equal(report.summary.lanes, 1, "…and is counted");

      const bad = [
        [{ ...good, run: () => ({ findings: [], reads: [] }) }, /returned no read record/u, "no read record"],
        [{ ...good, run: () => ({ findings: [], reads: [read({ floor: 0 })] }) }, /declares no floor/u, "a floor of zero"],
        [{ ...good, run: () => ({ findings: [], reads: [read({ basis: "text" })] }) }, /stated no limit/u, "a text sweep with no limit"],
        [{ ...good, run: () => ({ findings: [], reads: [read({ basis: "text" })], limits: [limit({ consequence: "" })] }) }, /declares no consequence/u, "a limit withholding its consequence"],
      ];
      for (const [lane, expected, what] of bad) {
        await assert.rejects(() => runAudit({ ...base, lanes: [lane] }), expected, `a further lane with ${what} cannot complete a run`);
      }
    },
  },

  // ── (B) NO LANE THIS MILESTONE ADDS STARTS A CHILD ─────────────────────────────────────────
  {
    name: "arch/77 FF-7708: no module this milestone adds starts a child process, by any route",
    run() {
      const found = [];
      for (const rel of MILESTONE_MODULES) found.push(...childProcessRoutes(rel, source(rel)));
      assert.deepEqual(found, [], "these lanes start none — the class is closed by construction, not by today's contents");

      const plants = [
        ['import { spawn } from "node:child_process";', "an import of the child-process module"],
        ["const out = exec(command);", "a call to exec"],
        ["const out = execFile(command, args);", "a call to execFile"],
        ["const out = execSync(command);", "a call to execSync"],
        ["const out = spawnSync(command, args);", "a call to spawnSync"],
        ["const child = fork(program);", "a call to fork"],
        ["const result = await runBounded({ command, args });", "a child started through the family's own bounded seam"],
      ];
      for (const [planted, what] of plants) {
        assert.ok(childProcessRoutes("src/work-audit/declared-bounds.mjs", planted).length > 0, `${what} is reported by the file that holds it`);
      }
    },
  },

  // ── (C) THE FACE INJECTS WHAT THE FAMILY MAY NOT IMPORT ────────────────────────────────────
  {
    name: "arch/77 FF-7708: the marker key, the role routing, the settings file, the clock and the subject root are all INJECTED",
    async run() {
      const found = [];
      for (const rel of MILESTONE_MODULES) found.push(...injectionBypasses(rel, source(rel)));
      assert.deepEqual(found, [], "no module this milestone adds holds a second route to a fact the face supplies");

      // …AND NO OTHER MODULE OF THE FAMILY GREW ONE EITHER.
      const family = (await readSrcFiles(repoRoot)).filter((file) => `src/${file.rel}`.startsWith("src/work-audit/"));
      assert.ok(family.length >= 8, `the family was walked (${family.length} modules)`);
      for (const file of family) {
        const rel = `src/${file.rel}`;
        const code = stripComments(await readFile(file.path, "utf8"));
        assert.equal(/from\s+"[^"]*claude-settings\.mjs"/u.test(code), false, `${rel} does not import the settings module`);
        assert.equal(/work\.agents/u.test(code), false, `${rel} does not read the role-routing configuration key`);
      }

      // THE POSITIVE HALF: the face resolves both and hands them in.
      const face = source("src/commands/audit.mjs");
      assert.match(face, /markerKey: AOF_HOOK_MARKER/u, "the face injects the marker key");
      assert.match(face, /roleRouting: resolveRoleRouting\(ctx\.workspace\.config\)/u, "…and the resolved role routing");
      assert.match(face, /declaredBoundValues: declaredBoundValues\(ctx\.workspace\)/u, "…and what this project declares for each reference bound");
      assert.match(face, /const \{ settings, settingsPath \} = await readAuditedSettings\(repoRoot\)/u, "…and it reads the audited settings object once, at the boundary");
      assert.match(face, /^\s*settings,$/mu, "…handing the object in");
      assert.match(face, /^\s*settingsPath,$/mu, "…with the path it was read from");

      const plants = [
        ['import { AOF_HOOK_MARKER } from "../claude-settings.mjs";', "an import of the settings module"],
        ["const key = AOF_HOOK_MARKER;", "an import of the marker key rather than a parameter carrying it"],
        ['const routing = config.work.agents.productOwner;', "a second reader of the role-routing configuration key"],
        ['const raw = await readFile(".claude/settings.json", "utf8");', "a read of the audited settings file from disk"],
        ["const at = Date.now();", "a wall-clock read"],
        ["const root = path.dirname(import.meta.url);", "a subject root derived from the module's own location"],
      ];
      for (const [planted, what] of plants) {
        assert.ok(injectionBypasses("src/work-audit/declared-bounds.mjs", planted).length > 0, `${what} is reported by the file that holds it`);
      }
    },
  },
  {
    name: "arch/77 FF-7708: --strict changes the EXIT CODE and nothing else",
    run() {
      const face = source("src/commands/audit.mjs");
      // CUT ON THE LANGUAGE'S OWN STRUCTURE, never positionally — F-47-04-ARCH-2's rule and the one
      // home it prescribes. A `slice` to the next declaration would assume an order nothing pins.
      const runBody = functionBody(face, "async run(input, ctx)");
      assert.notEqual(runBody, null, "the command's run() was found and cut on matching braces");
      assert.ok(runBody.length > 200, `…and it is a real region (${runBody.length} chars)`);
      assert.equal(/strict/u.test(runBody), false, "run() never reads the strict setting, so the finding set cannot depend on it");
      assert.match(face, /strict: \{ type: "boolean"/u, "…and the flag is declared on the face");

      // AND THE FACE'S OWN ADAPTERS AGREE: one report, two readings.
      const result = {
        scope: { requested: null, applied: false, matched: [], audited: [], nothingMatched: false },
        lanes: [], reads: [], limits: [], escalation: null, auditors: [], registry: { source: null, present: false },
        findings: [{ code: "audit-bound-undeclared", severity: "error", path: "p", message: "m", about: null, to: [] }],
        summary: { error: 1, warn: 0, escalated: 0, lanes: 0 },
      };
      const lenient = auditCommand.cli.json(result, { options: { strict: false } });
      const strict = auditCommand.cli.json(result, { options: { strict: true } });
      assert.deepEqual(strict.findings, lenient.findings, "both readings carry the same findings, each at the same severity");
      assert.equal(auditCommand.cli.exit(result, { options: { strict: false } }), 0, "without the strict setting an error exits zero");
      assert.notEqual(auditCommand.cli.exit(result, { options: { strict: true } }), 0, "…and with it, non-zero");

      const clean = { ...result, findings: [], summary: { error: 0, warn: 0, escalated: 0, lanes: 0 } };
      assert.equal(auditCommand.cli.exit(clean, { options: { strict: true } }), 0, "a clean report exits zero under the strict setting");
      const warned = {
        ...result,
        findings: [{ ...result.findings[0], severity: "warn" }],
        summary: { error: 0, warn: 1, escalated: 0, lanes: 0 },
      };
      assert.equal(auditCommand.cli.exit(warned, { options: { strict: true } }), 0, "…and warnings alone do not gate");
    },
  },
];
