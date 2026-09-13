// Fitness function: acd-audit-travels-two-roots (milestone 77 / story 04, FF-7706;
// ADR-002 §1, §2, §2a, §3; ADR-007 §1; TECH_DEBT 70, 72).
//
//   "ONE word, ONE meaning; and the toolkit is never joined onto the subject."
//
// ── WHY THIS CONTROL EXISTS AT ALL ───────────────────────────────────────────────────────────
//
// In this repository the workspace under audit IS the aof checkout, so the two roots are one
// directory: every child program resolves, every register row runs, and the command is green. That
// green is not evidence — it is the single arrangement in which this defect cannot appear. What is
// owed is a control that drives the two roots APART, which is the one shape this repository cannot
// produce on its own, so every root claim below is driven over a SUBJECT root that is a temporary
// directory and a TOOLKIT root that is this install.
//
// ── WHAT IS PROVED HERE AND WHAT IS PROVED NEXT DOOR ─────────────────────────────────────────
//
// "The moved driver produces the results it produced before the move" is not restated here: it is
// `test/grade/evidence-re-run.test.mjs`, written before the move against the four outcomes the driver
// produces, passing unchanged after it. A second copy of that claim would be a worse copy, and the
// suite that was written first is the honest witness.
//
// Nor is the spawned-program ENUMERATION's own red probe restated. Its four failing shapes — a
// program the family starts that the enumeration omits, a member that is not on disk, a member a
// family module imports, and a member that starts a child of its own — are FF-5904's lanes, driven
// there against `SPAWNED_PROGRAMS` itself, which 77/04 extends by one member. The same goes for the
// shell clause: `acd-audit-never-imports-project-code` already refuses a `shell:` option anywhere
// in the closure, and a second copy here would be a second rule about one thing.
//
// ── THE WORD `baseline` KEEPS ONE MEANING (ADR-007 §1) ───────────────────────────────────────
//
// `UNREGISTERED_BASELINE` in `census.mjs` owns that word for the shrink-only exemption ledger, with
// its own two finding codes. The vocabulary leg is asserted over EVERY module milestone 77 adds and
// over the frozen code sets rather than over source text, so a rename cannot evade it. It is a
// RATCHET, green on arrival, and its red probe plants a second meaning and observes the message.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { withControlFixtureRepo } from "../../support/evidence-control-fixture.mjs";
import { spawnRouteProblems } from "./acd-audit-never-imports-project-code.test.mjs";
import { DEFAULT_DEADLINE_MS, runBounded } from "../../../src/work-audit/spawn.mjs";
import { TOOLKIT_PROGRAM_DIR, isToolkitRoot, toolkitProgram, toolkitProgramProblems, toolkitRoot } from "../../../src/work-audit/toolkit.mjs";
import { AUDIT_FINDING_CODES, LEDGER_PROJECT, PROBE_PROGRAM, UNREGISTERED_BASELINE, assembledSuite, ledgerApplies, runCensus } from "../../../src/work-audit/census.mjs";
import { DRIVE_PROGRAM, EVIDENCE_FINDING_CODES, driveControl, runEvidence } from "../../../src/work-audit/evidence.mjs";
import { PROMPT_LAYER_FINDING_CODES } from "../../../src/work-audit/prompt-layer.mjs";
import { HOOK_WIRING_FINDING_CODES } from "../../../src/work-audit/hook-wiring.mjs";
import { SEAM_LIVENESS_FINDING_CODES } from "../../../src/work-audit/seam-liveness.mjs";
import { DECLARED_BOUNDS_FINDING_CODES } from "../../../src/work-audit/declared-bounds.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The modules milestone 77 ADDS. The vocabulary leg's subject, and the reason it is a list rather
// than a directory sweep: `census.mjs` and `evidence.mjs` are 59's and legitimately spell the word.
const MILESTONE_MODULES = Object.freeze([
  "src/work-audit/prompt-layer.mjs",
  "src/work-audit/hook-wiring.mjs",
  "src/work-audit/seam-liveness.mjs",
  "src/work-audit/declared-bounds.mjs",
  "src/work-audit/toolkit.mjs",
  "src/harness-reference.mjs",
]);

// Every finding code milestone 77 adds, from the lanes' own frozen sets — never from a literal list
// here, so a renamed code is still censused.
const MILESTONE_CODES = Object.freeze([
  ...PROMPT_LAYER_FINDING_CODES,
  ...HOOK_WIRING_FINDING_CODES,
  ...SEAM_LIVENESS_FINDING_CODES,
  ...DECLARED_BOUNDS_FINDING_CODES,
]);

const THE_PROGRAMS = Object.freeze([
  Object.freeze({ rel: PROBE_PROGRAM, what: "the suite probe the census points at a runner" }),
  Object.freeze({ rel: DRIVE_PROGRAM, what: "the control driver the evidence lane points at a control" }),
]);

const read = (rel) => readFileSync(path.join(repoRoot, rel), "utf8");
const under = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
};

// ── THE DETECTORS, PURE ──────────────────────────────────────────────────────────────────────

/** A derivation of a root from the module's own URL, for the purpose of locating aof's programs. */
export function toolkitDerivations(rel, code) {
  const found = [];
  if (/fileURLToPath\s*\(\s*import\.meta\.url\s*\)/u.test(code) && /\.\.["'\s,)]/u.test(code)) {
    found.push(`${rel} derives a root from its own module URL`);
  }
  if (/\btoolkitRoot\s*(?::|=)/u.test(code) && !rel.endsWith("toolkit.mjs")) {
    found.push(`${rel} declares a second name for the toolkit root`);
  }
  return found;
}

/** A PROGRAM path joined onto the SUBJECT root — the shape TECH_DEBT 72 is made of. */
export function subjectRootProgramJoins(rel, code) {
  const found = [];
  const programs = ["work-audit-probe", "work-audit-drive", "drive-control", "audit-probe", "audit-drive"];
  for (const match of code.matchAll(/path\.(?:join|resolve)\(\s*(repoRoot[^)]*?)\)/gu)) {
    const argument = match[1];
    if (programs.some((program) => argument.includes(program)) || /\bdriveProgram\b|\bprobeProgram\b|PROGRAM\b/u.test(argument)) {
      found.push(`${rel} joins a program path onto the subject root: ${match[0]}`);
    }
  }
  return found;
}

/** The second meaning of the exemption ledger's word. */
export function baselineUses(rel, code) {
  return /baseline/iu.test(code) ? [`${rel} spells the exemption ledger's word`] : [];
}

export const archTests = [
  // ── (A) THE TWO ROOTS, DRIVEN APART ────────────────────────────────────────────────────────
  {
    name: "arch/77 FF-7706 (acd-audit-travels-two-roots): with the roots APART, every child program comes from the toolkit root and no path started resolves under the subject",
    async run() {
      const subject = path.join(repoRoot, "..", "aof-not-a-checkout-fixture");
      const started = [];
      const spawn = async ({ command, args, cwd, deadlineMs }) => {
        started.push({ command, args, cwd });
        return Object.freeze({
          command, args, cwd, attempted: "", outcome: "exited", exitCode: 1,
          stdout: "", stderr: "", deadlineMs: deadlineMs ?? DEFAULT_DEADLINE_MS, error: null,
        });
      };

      await assembledSuite({ repoRoot: subject, runner: "scripts/test.mjs", spawn });
      await driveControl({ repoRoot: subject, control: "test/arch/some.test.mjs", spawn });
      assert.equal(started.length, THE_PROGRAMS.length, `both lanes started a child (${started.length})`);

      for (const [at, { what }] of THE_PROGRAMS.entries()) {
        const program = started[at].args[0];
        assert.equal(under(toolkitRoot(), program), true, `${what}: the path it started resolves under the toolkit root (${program})`);
        assert.equal(under(subject, program), false, `${what}: and no path it started resolves under the subject root`);
      }

      // …AND THE SUBJECT IS NOT DRAGGED ALONG WITH THE TOOLKIT. The runner, the control and the
      // working directory each child is started in are the subject's, exactly as before.
      for (const [at, { what }] of THE_PROGRAMS.entries()) {
        const target = started[at].args[1];
        assert.equal(under(subject, target), true, `${what}: its target resolves under the subject root (${target})`);
        assert.equal(under(toolkitRoot(), target), false, `${what}: and not under the toolkit root`);
        assert.equal(started[at].cwd, subject, `${what}: and the child's working directory is the subject root`);
      }
    },
  },
  {
    name: "arch/77 FF-7706: `repoRoot` keeps its meaning — the register, the suite population and the item population stay the subject's",
    async run() {
      await withControlFixtureRepo(async (subject) => {
        // THE SUITE POPULATION the census walks is the subject's, and the fixture repo holds a
        // known set of controls under `test/arch/` and no aof source tree of its own.
        const census = await runCensus({ repoRoot: subject });
        const suiteRead = census.reads.find((entry) => entry.sweep === "suite-population");
        assert.notEqual(suiteRead, undefined, "the census declares its suite-population sweep");
        assert.equal(suiteRead.count > 0, true, `it walked the SUBJECT's suites (${suiteRead.count})`);
        assert.equal(under(subject, path.resolve(subject, suiteRead.root)), true, "…rooted under the subject");

        // A CONTROL A REGISTER ROW CITES, and the register it was read from, both the subject's.
        const control = "test/arch/green.test.mjs";
        const item = fixtureItem(subject, control);
        const report = await runEvidence({ repoRoot: subject, items: [item] });
        const [row] = report.rows;
        assert.notEqual(row, undefined, "the register row was read");
        assert.equal(row.control, control, "…citing the subject's own control");
        assert.equal(under(subject, path.join(subject, control)), true, "…which resolves under the subject root");
        assert.equal(existsSync(path.join(subject, control)), true, "…and is a file there");
        assert.equal(under(subject, item.dir), true, "…and the register it was read from is the subject's");
      });
    },
  },
  {
    name: "arch/77 FF-7706: a governed project that is not an aof checkout gets an audit of its own instruments",
    async run() {
      await withControlFixtureRepo(async (subject) => {
        // THE FIXTURE REPOSITORY CONTAINS NO DRIVER — that absence is the change's proof.
        assert.equal(existsSync(path.join(subject, DRIVE_PROGRAM)), false, "the fixture repository holds no copy of the driver");
        assert.equal(existsSync(path.join(subject, "scripts", "drive-control.mjs")), false, "…nor of its old home");

        const report = await runEvidence({ repoRoot: subject, items: [fixtureItem(subject, "test/arch/green.test.mjs")] });
        const [row] = report.rows;
        assert.equal(row.verdict, "confirmed", `the row it read carries a verdict produced by an execution: ${JSON.stringify(row)}`);
        assert.equal(row.observed?.cases > 0, true, "…having actually run its cases");
        for (const code of ["evidence-unrunnable", "evidence-none-reproduced"]) {
          assert.deepEqual(
            report.findings.filter((finding) => finding.code === code),
            [],
            `${code} is not reported for want of aof's own driver`,
          );
        }
        for (const finding of report.findings) {
          assert.equal(
            finding.message.includes(DRIVE_PROGRAM) && finding.message.includes(subject),
            false,
            `no finding names aof's own child program at a path under that workspace: ${finding.message}`,
          );
        }

        // …AND A CONTRADICTION IS STILL DECIDED BY THE CONTROL, not by aof's layout.
        const contradiction = await runEvidence({
          repoRoot: subject,
          items: [fixtureItem(subject, "test/arch/red.test.mjs")],
        });
        assert.equal(contradiction.rows[0].verdict, "contradicted", "a cited control that contradicts its recorded result is named as that contradiction");

        // …AND A CONTROL ABSENT FROM THAT WORKSPACE is that workspace's own missing control.
        const missing = await runEvidence({
          repoRoot: subject,
          items: [fixtureItem(subject, "test/arch/not-there.test.mjs")],
        });
        assert.equal(missing.rows[0].verdict, "unrunnable", "an absent control is unrunnable");
        assert.match(missing.findings.find((finding) => finding.code === "evidence-unrunnable").message, /not-there\.test\.mjs/u, "…naming that workspace's own control");

        // …AND AN ITEM WHOSE REGISTER CITES NOTHING closes on there being no rows, which is a
        // different sentence from "its controls all held".
        const noRows = await runEvidence({ repoRoot: subject, items: [{ ...fixtureItem(subject, "x"), docTexts: {} }] });
        assert.deepEqual(noRows.rows, [], "no row was read");
        assert.deepEqual(
          noRows.findings.filter((finding) => finding.code === "evidence-none-reproduced"),
          [],
          "…and a sweep with no rows is not closed as nothing reproduced",
        );
      });
    },
  },
  {
    name: "arch/77 FF-7706: the census decides registration for the suites a governed workspace walks, from a child started at the toolkit root",
    async run() {
      await withControlFixtureRepo(async (subject) => {
        // A GOVERNED WORKSPACE'S OWN RUNNER, in this repository's `{ name, run }` shape. The census
        // points its child at THIS runner — the subject's — while the child program itself comes
        // from the toolkit. Without the two roots apart, the probe would be looked for inside this
        // temporary directory and registration would be undecidable here for aof's own reasons.
        await mkdir(path.join(subject, "scripts"), { recursive: true });
        await writeFile(path.join(subject, "scripts", "test.mjs"), [
          'import { archTests as green } from "../test/arch/green.test.mjs";',
          "export const tests = [",
          "  ...green,",
          "];",
          "",
        ].join("\n"), "utf8");

        const assembled = await assembledSuite({ repoRoot: subject, runner: "scripts/test.mjs" });
        assert.equal(assembled.ok, true, `the probe ran against the subject's own runner: ${JSON.stringify(assembled).slice(0, 300)}`);
        assert.equal(assembled.names.length, 3, "…and registration is DECIDED for the suites it walked — the three cases that runner assembles");
        assert.equal(under(subject, assembled.result.args[1]), true, "the runner it was pointed at is the subject's");
        assert.equal(under(toolkitRoot(), assembled.result.args[0]), true, "…and the program that read it is the toolkit's");

        const census = await runCensus({ repoRoot: subject });
        for (const finding of census.findings) {
          assert.equal(
            finding.message.includes(PROBE_PROGRAM) && finding.message.includes(subject),
            false,
            `no finding names aof's own child program at a path under that workspace: ${finding.message}`,
          );
        }
        // AND WHAT REMAINS — the task's own scenario is titled "the toolkit root is not the whole
        // of what stops a strict audit elsewhere", so what remains is MEASURED here rather than
        // assumed away. Every remaining error is about the subject's own population, naming what it
        // swept, the count it got and the floor it missed.
        //
        // UPDATED BY CHORE 99 — which is exactly what the pin that stood here existed to force. The
        // exemption ledger was this control's known remaining exception: `UNREGISTERED_BASELINE` is
        // aof's hardcoded list of AOF's suites, and its existence check ran against the AUDITED
        // workspace's disk, so aof's own file layout reddened a governed project's audit at error —
        // TECH_DEBT 72's species one lane over. `runCensus` now applies that ledger only where its
        // subjects live: when the subject IS THE PROJECT the ledger describes, which is a different
        // question from whether it is the install's DIRECTORY — see the payload leg below for why.
        // Re-rooting the existence check was the chore's other stated option and was refused, because
        // it silences these two findings while still APPLYING aof's exemptions to somebody else's
        // suites — the same rot facing the other way, and invisible instead of loud.
        const errors = census.findings.filter((entry) => entry.severity === "error");
        assert.deepEqual(
          errors.filter((entry) => entry.code.startsWith("audit-baseline-")),
          [],
          "aof's own exemption ledger says NOTHING about a workspace that is not aof's",
        );
        for (const finding of errors) {
          assert.match(finding.message, /sweep read \d+ of a required \d+|registration|runner/u, `every remaining error is about the subject's own population: ${finding.code} — ${finding.message}`);
        }

        // DRIVEN FROM BOTH SIDES, so "the ledger emitted nothing" is never a detector that finds
        // nothing anywhere. The question itself answers differently for the two roots…
        assert.equal(isToolkitRoot(subject), false, "the subject is genuinely a different root from the install");
        assert.equal(isToolkitRoot(toolkitRoot()), true, "…and the install answers yes to the same question");
        assert.equal(await ledgerApplies(subject), false, "and aof's ledger does not apply to a workspace that is not aof's project");
        assert.equal(await ledgerApplies(toolkitRoot()), true, "…while it does apply to the install it describes");

        // THE PAYLOAD ARRANGEMENT, which is why the question is about the PROJECT and not about the
        // DIRECTORY. Under a payload install the toolkit root is `~/.aof/bin` — a copy of `src/` with
        // no `test/` at all — so a bare subject↔toolkit root comparison would withhold these
        // exemptions from aof's OWN repository whenever a deployed binary audits it, reddening aof's
        // own audit for two suites that are on the subject's disk with their reasons intact. A subject
        // that says whose project it is gets the ledger wherever it is checked out; one that does not,
        // does not; and a subject that cannot say withholds rather than grants.
        const elsewhere = path.join(subject, "not-the-install");
        await mkdir(elsewhere, { recursive: true });
        const manifest = (name) => writeFile(path.join(elsewhere, "package.json"), JSON.stringify({ name }), "utf8");
        await manifest(LEDGER_PROJECT);
        assert.equal(isToolkitRoot(elsewhere), false, "the aof project checked out somewhere that is not the install is not the install");
        assert.equal(await ledgerApplies(elsewhere), true, "…and it still gets the ledger, because the ledger describes that PROJECT rather than that directory");
        await manifest("somebody-elses-project");
        assert.equal(await ledgerApplies(elsewhere), false, "…a governed project of another name does not");
        await writeFile(path.join(elsewhere, "package.json"), "{ not json at all", "utf8");
        assert.equal(await ledgerApplies(elsewhere), false, "…and an unreadable manifest WITHHOLDS the exemption rather than granting it, because a wrongly-granted one is silent");

        // …and the ledger is not merely QUIET here, it is INAPPLICABLE: a governed project that
        // files a path aof exempts does not inherit the exemption for it. Under the arrangement this
        // chore replaces, the planted suite was a member of the ledger's set and was skipped from
        // the census's unmentioned sweep — silently exempted by a permission belonging to aof.
        const exempted = UNREGISTERED_BASELINE[0].suite;
        assert.equal(exempted.endsWith(".test.mjs"), true, `the ledger names a suite to plant (${exempted})`);
        await mkdir(path.dirname(path.join(subject, exempted)), { recursive: true });
        await writeFile(path.join(subject, exempted), 'export const archTests = [{ name: "planted", run: () => {} }];', "utf8");
        const planted = await runCensus({ repoRoot: subject });
        assert.equal(
          planted.findings.some((finding) => finding.path === exempted && finding.code === "audit-suite-unregistered"),
          true,
          `${exempted} in a governed project is decided on its own merits, not exempted by aof's ledger`,
        );
        assert.equal(
          planted.unregistered.some((row) => row.file === exempted && row.carried === true),
          false,
          "…and it is never reported as CARRIED, which is the silent half that re-rooting the existence check alone would have left standing",
        );
      });
    },
  },
  {
    name: "arch/77 FF-7706: the lane's answer over one workspace is the same answer twice, field for field",
    async run() {
      await withControlFixtureRepo(async (subject) => {
        const items = [fixtureItem(subject, "test/arch/green.test.mjs")];
        const first = await runEvidence({ repoRoot: subject, items });
        const second = await runEvidence({ repoRoot: subject, items });
        assert.deepEqual(second.findings, first.findings, "the findings, their codes, their severities, their paths and their order are identical");
        assert.deepEqual(second.reads, first.reads, "the read records, their counts and their floors are identical");
        assert.deepEqual(second.limits ?? null, first.limits ?? null, "the stated limits are identical");
        assert.deepEqual(second.rows, first.rows, "…and the two answers are equal field for field");
      });
    },
  },

  // ── (B) ONE DERIVATION, ONE HOME ───────────────────────────────────────────────────────────
  {
    name: "arch/77 FF-7706: the toolkit root has ONE derivation and ONE home, and a second is reported",
    async run() {
      const files = await readSrcFiles(repoRoot);
      assert.equal(files.length > 50, true, `src/** was walked (${files.length} modules)`);
      const derivations = [];
      for (const file of files) {
        const rel = `src/${file.rel}`;
        if (rel === "src/work-audit/toolkit.mjs") continue;
        const code = stripComments(await readFile(file.path, "utf8"));
        // Only the audit family is in scope: other families derive their own roots for their own
        // purposes, and a census over every module would be a census about the word `..`.
        if (!rel.startsWith("src/work-audit")) continue;
        derivations.push(...toolkitDerivations(rel, code));
      }
      assert.deepEqual(derivations, [], "no module of the family derives a toolkit root of its own");

      const home = stripComments(read("src/work-audit/toolkit.mjs"));
      assert.equal(toolkitDerivations("src/work-audit/toolkit.mjs", home).length > 0, true, "…and the ONE home does derive one, so the detector is reading something real");
      assert.equal((home.match(/import\.meta\.url/gu) ?? []).length, 1, "…exactly once");

      const plants = [
        ["src/work-audit/other.mjs", 'const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");', "a second module deriving a root from its own module URL"],
        ["src/work-audit/census.mjs", 'const program = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "work/audit-probe.mjs");', "a family module computing the toolkit root inline"],
        ["src/work-audit/evidence.mjs", "export const toolkitRoot = () => 1;", "a second exported name for the same root"],
      ];
      for (const [rel, planted, what] of plants) {
        assert.equal(toolkitDerivations(rel, planted).length > 0, true, `${what} is reported by the file that holds it`);
      }
    },
  },
  {
    name: "arch/77 FF-7706: no module in the family joins a program path onto the subject root",
    async run() {
      const files = (await readSrcFiles(repoRoot)).filter((file) => `src/${file.rel}`.startsWith("src/work-audit"));
      assert.equal(files.length >= 6, true, `the family was walked (${files.length} modules)`);
      const joins = [];
      for (const file of files) {
        joins.push(...subjectRootProgramJoins(`src/${file.rel}`, stripComments(await readFile(file.path, "utf8"))));
      }
      assert.deepEqual(joins, [], "no program path is joined onto the subject root");

      // …AND THE POSITIVE HALF: each lane names the toolkit resolver at the site that used to join.
      assert.match(stripComments(read("src/work-audit/census.mjs")), /toolkitProgram\(PROBE_PROGRAM\)/u, "the census resolves its probe through the one home");
      assert.match(stripComments(read("src/work-audit/evidence.mjs")), /toolkitProgram\(driveProgram\)/u, "the evidence lane resolves its driver through the one home");

      const plants = [
        ['const probe = path.join(repoRoot, "src", "work", "audit-probe.mjs");', "a join of the suite probe's path onto the subject root"],
        ['const program = path.resolve(repoRoot, "src/work/audit-drive.mjs");', "a join of the control driver's path onto the subject root"],
        ['const program = path.resolve(repoRoot ?? ".", driveProgram);', "a resolve of a program path against the subject root defaulting to the cwd"],
        ['const third = path.join(repoRoot, THIRD_PROGRAM);', "a join of a third program's path onto the subject root"],
      ];
      for (const [planted, what] of plants) {
        assert.equal(subjectRootProgramJoins("src/work-audit/census.mjs", planted).length > 0, true, `${what} is reported by the file that holds it`);
      }
    },
  },

  // ── (C) EVERY PROGRAM THE FAMILY STARTS TRAVELS WITH THE PAYLOAD ───────────────────────────
  {
    name: "arch/77 FF-7706: every program the family starts is under src/, is carried by the payload, and is named in one enumeration",
    run() {
      const installer = read("scripts/install-local.mjs");
      const copied = [...installer.matchAll(/cpSync\(path\.join\(repoRoot,\s*"([^"]+)"\)/gu)].map((match) => match[1]);
      assert.equal(copied.includes(TOOLKIT_PROGRAM_DIR), true, `the payload carries ${TOOLKIT_PROGRAM_DIR}/ (copies: ${copied.join(", ") || "none"})`);
      assert.equal(copied.includes("scripts"), false, "…and carries no scripts/ directory at all");

      for (const { rel, what } of THE_PROGRAMS) {
        assert.equal(rel.startsWith(`${TOOLKIT_PROGRAM_DIR}/`), true, `${what} resolves under ${TOOLKIT_PROGRAM_DIR}/ (${rel})`);
        assert.equal(existsSync(path.join(repoRoot, rel)), true, `…and is on disk`);
        assert.equal(toolkitProgram(rel), path.join(toolkitRoot(), ...rel.split("/")), "…and resolves from the toolkit root");
      }

      // THE ENUMERATION: the family's spawned-program ledger names both, read from the gate that
      // owns it rather than restated here.
      const ledger = read("test/arch/audit/acd-audit-never-imports-project-code.test.mjs");
      for (const { rel } of THE_PROGRAMS) {
        assert.match(ledger, new RegExp(`rel: "${rel.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}"`, "u"), `${rel} is named in SPAWNED_PROGRAMS`);
      }
      assert.equal(existsSync(path.join(repoRoot, "scripts", "drive-control.mjs")), false, "and the driver's old home under scripts/ is gone, so nothing can resolve it there");
    },
  },
  {
    name: "arch/77 FF-7706: a program the payload does not carry cannot be named as a spawn target",
    run() {
      const rows = [
        ["src/work/audit-drive.mjs", 0, "under src/, carried by the payload"],
        ["scripts/drive-control.mjs", 1, "under scripts/, which the payload does not carry"],
        [path.join(repoRoot, "src", "work", "audit-drive.mjs"), 1, "outside the toolkit root entirely (an absolute path)"],
        ["../elsewhere/drive.mjs", 2, "reaching outside the toolkit root"],
        ["", 1, "named at nothing at all"],
      ];
      for (const [target, count, what] of rows) {
        const problems = toolkitProgramProblems(target);
        assert.equal(problems.length, count, `${what}: ${count} refusal(s), got ${JSON.stringify(problems)}`);
        for (const problem of problems) {
          assert.equal(problem.length > 40, true, "…naming the path and the reason");
          if (target !== "") assert.equal(problem.includes(target), true, `…and naming the path itself: ${problem}`);
        }
        if (count > 0) assert.throws(() => toolkitProgram(target), /work-audit\/toolkit/u, `${what}: never silently attempted`);
      }

      // UNDER `src/` BUT ABSENT FROM DISK is a different answer: the target is admissible, and the
      // child that does not start says what it attempted.
      assert.deepEqual(toolkitProgramProblems("src/work-audit-no-such-program.mjs"), [], "a program under src/ that is absent from disk is admissible to name");
    },
  },
  {
    name: "arch/77 FF-7706: the change opens no second route to a child process, and the one seam always arms a deadline",
    async run() {
      const files = (await readSrcFiles(repoRoot)).filter((file) => `src/${file.rel}`.startsWith("src/work-audit"));
      const modules = [];
      for (const file of files) modules.push({ rel: `src/${file.rel}`, code: stripComments(await readFile(file.path, "utf8")) });
      assert.deepEqual(spawnRouteProblems(modules), [], "every child the family starts comes from the one bounded seam");

      const plants = [
        [{ rel: "src/work-audit/toolkit.mjs", code: 'spawnSync(command, args);' }, "a second call to the platform's process-starting API"],
        [{ rel: "src/work-audit/toolkit.mjs", code: 'import { spawn } from "node:child_process";' }, "an import of the process module by a family module other than the seam"],
        [{ rel: "src/work-audit/toolkit.mjs", code: 'const out = execSync("node x");' }, "a synchronous child-starting call in the family's closure"],
      ];
      for (const [planted, what] of plants) {
        assert.equal(spawnRouteProblems([planted]).length > 0, true, `${what} is reported by the file that holds it`);
      }

      // A DEADLINE IS ARMED WHATEVER THE CALLER SUPPLIED — including nothing, zero or a negative.
      for (const supplied of [undefined, 0, -1]) {
        const result = await runBounded({
          command: process.execPath,
          args: ["-e", "process.exit(0)"],
          cwd: repoRoot,
          ...(supplied === undefined ? {} : { deadlineMs: supplied }),
        });
        assert.equal(result.deadlineMs, DEFAULT_DEADLINE_MS, `a supplied ${String(supplied)} deadline is replaced by the seam's own bound`);
        assert.equal(result.outcome, "exited", "…and the child ran by argument vector");
      }
    },
  },

  // ── (D) ONE WORD, ONE MEANING ──────────────────────────────────────────────────────────────
  {
    name: "arch/77 FF-7706: no module milestone 77 adds spells the exemption ledger's word, and no code it adds contains it",
    run() {
      const found = [];
      for (const rel of MILESTONE_MODULES) {
        assert.equal(existsSync(path.join(repoRoot, rel)), true, `${rel} is on disk, so the census is reading something`);
        found.push(...baselineUses(rel, stripComments(read(rel))));
      }
      assert.deepEqual(found, [], "the second meaning arrives in none of milestone 77's modules");

      assert.equal(MILESTONE_CODES.length >= 7, true, `every code 77 adds was read from its lane's frozen set (${MILESTONE_CODES.length})`);
      for (const code of MILESTONE_CODES) {
        assert.equal(/baseline/iu.test(code), false, `${code} does not contain the word`);
      }
      // THE LEDGER KEEPS ITS OWN, unchanged and still naming suites.
      for (const code of ["audit-baseline-stale", "audit-baseline-unreasoned"]) {
        assert.equal(AUDIT_FINDING_CODES.includes(code), true, `the exemption ledger's ${code} is unchanged`);
      }
      assert.equal(EVIDENCE_FINDING_CODES.every((code) => !/baseline/iu.test(code)), true, "and the evidence lane's codes never carried it");

      // THE RED PROBE — the ratchet is armed.
      assert.equal(baselineUses("src/work-audit/toolkit.mjs", "export const REFERENCE_BASELINE = 1;").length > 0, true, "a planted second meaning is reported");
      assert.equal(baselineUses("src/work-audit/toolkit.mjs", "export const A = 1;").length, 0, "…and nothing planted reports nothing");
    },
  },
];

// A register citing one control of the fixture repository, in the shape a shipped `VERIFICATION.md`
// writes. Local to this file: the SUBJECT stays in the test, and no helper becomes the thing under
// test.
function fixtureItem(subject, control) {
  const architecture = [
    "# 99 · fixture",
    "",
    "## Fitness functions",
    "",
    "| id | invariant | enforced by (arch-test) | from |",
    "|---|---|---|---|",
    `| **FF-9901** | an invariant | \`${control}\` | ADR-001 |`,
    "",
  ].join("\n");
  const verification = [
    "# 99 · fixture — verification",
    "",
    "## Fitness functions",
    "",
    "| id | enforced by | result | red probe |",
    "|---|---|---|---|",
    `| **FF-9901** | \`${control}\` | **GREEN** — it holds | - |`,
    "",
  ].join("\n");
  return {
    number: "99",
    type: "milestone",
    slug: "fixture",
    name: "99_milestone_fixture",
    ref: "99",
    parent: null,
    dir: path.join(subject, "wiki", "work", "99_milestone_fixture"),
    meta: { status: "in-progress" },
    docTexts: { "ARCHITECTURE.md": architecture, "VERIFICATION.md": verification },
  };
}
