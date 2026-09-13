// Traceability wiring for milestone 66 / story 00, task `01_the-acceptance-horizon`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/66_milestone_controls-that-run/stories/00_story_contract-parses/tasks/01_the-acceptance-horizon.feature
// against the LOCKED surfaces: the predicate `isOpen(status)` in
// ../src/acceptance-horizon.mjs, `validateWork` in ../src/work.mjs, and the two FACE
// exit adapters (`validateCommand.cli.exit`, `doctorCommand.cli.exit`).
//
// ON THE DOCTOR ROWS OF THE "two renderings" OUTLINE. ADR-009/E rules that there is
// no ninth code: the parse fact has NO doctor code, so the grandfathered files are
// silent in the gating lane by design. Those rows are therefore driven as what they
// are — the horizon's SEVERITY ruling (ADR-002 §2/§3: inside → error, outside → warn)
// composed with the FACE's exit policy (m15/ADR-002, pinned by
// test/arch/work/acd-doctor-strict-exit.test.mjs) — never by fabricating a doctor finding
// this milestone does not ship.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isOpen, severityFor, VALID_STATUS } from "../../src/acceptance-horizon.mjs";
import { validateWork, loadWorkspace } from "../../src/work.mjs";
import { doctorWork } from "../../src/work/doctor.mjs";
import { validateCommand } from "../../src/commands/validate.mjs";
import { doctorCommand } from "../../src/commands/doctor.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const srcWork = path.join(repoRoot, "src", "work.mjs");
const srcHorizon = path.join(repoRoot, "src", "acceptance-horizon.mjs");
const srcMigrate = path.join(repoRoot, "src", "commands", "migrate-folder.mjs");

const CONFIG = { name: "fixture", work: { dir: "./wiki/work", tags: { domains: ["@validate"] } } };

// A `.feature` carrying BOTH defects the two lanes are made of: free text in step
// position (a wrapped step continuation, line 6) AND a tag outside the closed
// vocabulary (@bogus).
const DOUBLY_DEFECTIVE_FEATURE =
  "@executable @bogus\n" +
  "Feature: Thing\n" +
  "\n" +
  "  Scenario: does a thing\n" +
  "    Given a wrapped step that runs onto\n" +
  "      a second indented line of prose\n" +
  "    Then y\n";

const frontmatter = (fields) =>
  `---\n${Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}\n---\n`;

// A repo whose ONE story holds ONE task feature. `milestoneStatus`/`storyStatus` are
// the only knobs — every fixture in this file differs from its pair in exactly one
// status word, which is what makes the horizon (and not something else) the cause.
async function fixture({ milestoneStatus = "in-progress", storyStatus = "in-progress", feature = DOUBLY_DEFECTIVE_FEATURE } = {}) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-horizon-"));
  const workDir = path.join(repo, "wiki", "work");
  const milestoneDir = path.join(workDir, "00_milestone_foundation");
  const storyDir = path.join(milestoneDir, "stories", "00_story_alpha");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(path.join(storyDir, "tasks"), { recursive: true });
  await writeFile(path.join(repo, ".aof", "aof.config.json"), JSON.stringify(CONFIG, null, 2), "utf8");
  await writeFile(
    path.join(milestoneDir, "SPEC.md"),
    frontmatter({ type: "milestone", number: "00", slug: "foundation", status: milestoneStatus, created: "2026-08-01", updated: "2026-08-01", schema: 1 }),
    "utf8",
  );
  await writeFile(
    path.join(storyDir, "STORY.md"),
    frontmatter({ type: "story", number: "00", slug: "alpha", status: storyStatus, parent: "00", created: "2026-08-01", updated: "2026-08-01", schema: 1 }),
    "utf8",
  );
  const featurePath = path.join(storyDir, "tasks", "00_thing.feature");
  await writeFile(featurePath, feature, "utf8");
  return { repo, workDir, milestoneDir, storyDir, featurePath };
}

async function withFixture(options, body) {
  const built = await fixture(options);
  try {
    return await body(built);
  } finally {
    await rm(built.repo, { recursive: true, force: true });
  }
}

const aboutFeature = (findings, featurePath) => findings.filter((f) => f.path === featurePath);

// The horizon's own severity ruling (ADR-002 §2/§3) is IMPORTED, not restated
// (F-09, closed by 66/02). It lived here as a local copy only because 66/00 shipped
// no code that emitted a severity; 66/02's controls lane is the doctor rendering the
// three rows below describe, so the mapping now has a home in `src/` and this file
// asserts over the shipped decision rather than over its own.

// ---------------------------------------------------------------------------
// Examples: the frozen five, plus the three ways a value arrives outside them.
const STATUS_ROWS = [
  { status: "not-started", horizon: "open", why: "nothing has been delivered, so nothing is immutable" },
  { status: "in-progress", horizon: "open", why: "the live case the gate exists for" },
  { status: "blocked", horizon: "open", why: "blocked is unfinished, never delivered" },
  { status: "in-review", horizon: "open", why: "review is exactly where a finding is still cheap to clear" },
  { status: "done", horizon: "closed", why: "delivered, immutable, therefore un-actionable" },
  { status: undefined, label: "absent (no key)", horizon: "open", why: "the horizon closes on the word itself, so a missing status never grandfathers" },
  { status: "Done", horizon: "open", why: "a case-insensitive match would let one capital letter silence a live record" },
  { status: "complete", horizon: "open", why: "outside the frozen five; validate reports the invalid value separately, as it does today" },
];

// Examples: one predicate, two renderings, and the face owns the exit.
const RENDERING_ROWS = [
  { horizon: "open", command: "aof work validate", finding: "reported — validate has no severity to express doubt", exit: "non-zero" },
  { horizon: "open", command: "aof work doctor", finding: 'severity: "error"', exit: "non-zero" },
  { horizon: "open", command: "aof work doctor --strict", finding: 'severity: "error", unchanged', exit: "non-zero" },
  { horizon: "closed", command: "aof work validate", finding: "not reported at all", exit: "0" },
  { horizon: "closed", command: "aof work doctor", finding: 'severity: "warn"', exit: "0 — advisory, so the fact survives without gating" },
  { horizon: "closed", command: "aof work doctor --strict", finding: 'severity: "warn", unchanged', exit: "non-zero — the m15 warn-gate at the face" },
];

export const acceptanceHorizonTests = [
  // =====================================================================
  // Scenario: the horizon has exactly one implementation
  //   → the source scan proving no SECOND implementation exists anywhere under
  //     `src/` is test/arch/grade/acd-acceptance-horizon-single-predicate.test.mjs
  //     (FF-6602). Asserted here: it is exported from exactly one module, and the
  //     caller reaches it by IMPORT.
  // =====================================================================
  {
    name: "66/00 horizon: the predicate is exported from one module and imported by its caller",
    run: async () => {
      assert.equal(typeof isOpen, "function", "the predicate is exported");
      const work = await readFile(srcWork, "utf8");
      assert.match(
        work,
        /import\s*\{[^}]*\bisOpen\b[^}]*\}\s*from\s*"\.\/acceptance-horizon\.mjs"/,
        "validate's home imports the predicate rather than re-deciding it",
      );
      // The leaf also took `VALID_STATUS`, so the five lifecycle words have ONE home
      // (it was a private const at src/work.mjs:49).
      assert.match(work, /import\s*\{[^}]*\bVALID_STATUS\b[^}]*\}\s*from\s*"\.\/acceptance-horizon\.mjs"/);
      assert.equal(
        /const\s+VALID_STATUS\s*=/.test(work),
        false,
        "no second copy of the frozen five is left behind in the god node",
      );
      // Zero imports — the property story 66/02's FF-6605 depends on.
      const leaf = (await readFile(srcHorizon, "utf8")).replace(/^\s*\/\/.*$/gm, "");
      assert.equal(/^import\s|require\(/m.test(leaf), false, "the horizon leaf imports nothing at all");
    },
  },

  // =====================================================================
  // Scenario Outline: the predicate closes on one word and on nothing else
  // =====================================================================
  ...STATUS_ROWS.map((row) => ({
    name: `66/00 horizon: status ${row.label ?? `\`${row.status}\``} → ${row.horizon} (${row.why})`,
    run: () => {
      assert.equal(isOpen(row.status), row.horizon === "open", row.why);
    },
  })),
  {
    name: "66/00 horizon: the frozen five are exactly the five, IN THE FROZEN ORDER (a consumer destructures it positionally)",
    run: () => {
      // ORDERED, not sorted. `src/import/recovery.mjs` destructures this set
      // positionally — `const [NOT_STARTED, IN_PROGRESS, BLOCKED, IN_REVIEW, DONE] =
      // [...VALID_STATUS]` — which is what keeps the five lifecycle words out of that
      // module. That makes the ITERATION ORDER load-bearing: reordering the literal in
      // the leaf is a legal-looking edit that would silently swap `blocked` and
      // `in-review` for every imported milestone. A sorted assertion sorts exactly that
      // hazard away, so this one pins the order the contract states
      // (`01_the-acceptance-horizon.feature`: not-started · in-progress · blocked ·
      // in-review · done).
      assert.deepEqual(
        [...VALID_STATUS],
        ["not-started", "in-progress", "blocked", "in-review", "done"],
        "the status vocabulary is frozen at five values AND at their order (ADR-009/F)",
      );
    },
  },

  // =====================================================================
  // Scenario Outline: one predicate, two renderings, and the face owns the exit
  // =====================================================================
  ...RENDERING_ROWS.map((row) => ({
    name: `66/00 horizon: ${row.horizon} + \`${row.command}\` → ${row.finding}; exit ${row.exit}`,
    run: async () => {
      const storyStatus = row.horizon === "open" ? "in-progress" : "done";
      if (row.command.startsWith("aof work validate")) {
        await withFixture({ storyStatus }, async ({ workDir, featurePath }) => {
          const findings = await validateWork(workDir, CONFIG, undefined);
          const mine = aboutFeature(findings, featurePath);
          if (row.horizon === "open") {
            assert.ok(mine.length > 0, "validate reports it — it has no severity to express doubt");
            assert.equal(validateCommand.cli.exit({ findings }), 1, "any finding is exit 1");
          } else {
            assert.deepEqual(mine, [], "not reported at all");
            assert.deepEqual(findings, [], "and the stream is otherwise clean, so the exit is 0");
            assert.equal(validateCommand.cli.exit({ findings }), 0);
          }
        });
        return;
      }
      // The doctor rows: the horizon owns the SEVERITY, the face owns the EXIT.
      const strict = row.command.endsWith("--strict");
      const severity = severityFor(storyStatus);
      assert.equal(severity, row.horizon === "open" ? "error" : "warn", "the horizon decides the severity");
      const result = { findings: [{ code: "fixture-finding", severity, path: path.join(repoRoot, "x"), message: "m" }] };
      const exit = doctorCommand.cli.exit(result, { options: { strict } });
      assert.equal(exit === 0 ? "0" : "non-zero", row.exit.startsWith("0") ? "0" : "non-zero", `${row.command} exit`);
      // …and the findings SET is byte-identical with and without `--strict`, because
      // the gate is the face and never the check.
      assert.deepEqual(
        doctorCommand.cli.json(result, { options: { strict: true } }).findings,
        doctorCommand.cli.json(result, { options: { strict: false } }).findings,
        "the findings set is byte-identical with and without --strict",
      );
    },
  })),

  // =====================================================================
  // Scenario: the deciding status belongs to the item that owns the record, and a
  // story is not its milestone
  // =====================================================================
  {
    name: "66/00 horizon: a task feature follows the STORY's status (ADR-009/F), not the milestone's",
    run: async () => {
      // A `done` story under an `in-progress` milestone is CLOSED — the state story
      // 66/00 itself enters at accept, while 66/02 is still building against it.
      await withFixture({ milestoneStatus: "in-progress", storyStatus: "done" }, async ({ workDir, featurePath }) => {
        const findings = await validateWork(workDir, CONFIG, undefined);
        assert.deepEqual(aboutFeature(findings, featurePath), [], "the story is done → closed, even though its milestone is open");
      });
      // A story that is NOT done under a `done` milestone is OPEN, so accepting a
      // parent never silences a record its own story never delivered.
      await withFixture({ milestoneStatus: "done", storyStatus: "in-progress" }, async ({ workDir, featurePath }) => {
        const findings = await validateWork(workDir, CONFIG, undefined);
        assert.ok(
          aboutFeature(findings, featurePath).length > 0,
          "the story is open → reported, even though its milestone is done",
        );
      });
    },
  },
  {
    name: "66/00 horizon: a milestone record document follows the MILESTONE's status — each item is asked about its own",
    run: () => {
      // The predicate is asked about the item that OWNS the record. With a `done`
      // milestone over an `in-progress` story, the two answers differ — which is the
      // whole content of "a story is not its milestone".
      assert.equal(isOpen("done"), false, "the milestone record doc of a done milestone is closed");
      assert.equal(isOpen("in-progress"), true, "its in-progress story's records are still open");
      assert.notEqual(isOpen("done"), isOpen("in-progress"), "so 66 stays open while 66/00 freezes at its own accept");
    },
  },

  // =====================================================================
  // Scenario: inside a closed item validate goes quiet about the whole file, not
  // merely about severity
  // =====================================================================
  {
    name: "66/00 horizon: inside a closed item validate reports NEITHER the parse finding NOR the tag finding",
    run: async () => {
      // Both facts are live under an open story…
      await withFixture({ storyStatus: "in-progress" }, async ({ workDir, featurePath }) => {
        const problems = aboutFeature(await validateWork(workDir, CONFIG, undefined), featurePath).map((f) => f.problem);
        assert.ok(problems.some((p) => p.includes("structural parse failure")), "the parse finding fires while open");
        assert.ok(problems.some((p) => p.includes('unknown tag "@bogus"')), "and so does the tag finding milestone 00 delivered");
      });
      // …and BOTH go silent once the owning story is done. The tag finding is
      // silenced along with the parse finding: a widening this contract states.
      await withFixture({ storyStatus: "done" }, async ({ workDir, featurePath }) => {
        const findings = await validateWork(workDir, CONFIG, undefined);
        assert.deepEqual(aboutFeature(findings, featurePath), [], "neither is reported");
        assert.deepEqual(findings, [], "the whole stream is quiet about the file");
      });
    },
  },
  {
    name: "66/00 horizon: neither fact resurfaces at `warn` under `aof work doctor` — this milestone lands no parse code there",
    run: async () => {
      await withFixture({ storyStatus: "done" }, async ({ repo, workDir, featurePath }) => {
        const { config } = await loadWorkspace(repo);
        const findings = await doctorWork(workDir, config, undefined, {
          now: Date.parse("2026-08-05T00:00:00Z"),
          staleWindow: 30 * 24 * 60 * 60 * 1000,
        });
        const aboutIt = findings.filter((f) => f.path === featurePath);
        assert.deepEqual(aboutIt, [], `doctor says nothing about the grandfathered file: ${JSON.stringify(aboutIt)}`);
        assert.equal(
          findings.some((f) => String(f.code).includes("parse") || String(f.message).includes("structural parse failure")),
          false,
          "there is no ninth code (ADR-009/E) — the cost this contract names is that an accepted defect is invisible to the gating lane forever",
        );
      });
    },
  },

  // =====================================================================
  // Scenario: the horizon is the lifecycle, never a date and never a hand-kept list
  // =====================================================================
  {
    name: "66/00 horizon: two items created on the same day differ only by `status` — no date, no path list",
    run: async () => {
      // Both fixtures carry created/updated 2026-08-01 on every record; only the
      // story's status differs.
      const open = await fixture({ storyStatus: "in-progress" });
      const closed = await fixture({ storyStatus: "done" });
      try {
        const openFindings = aboutFeature(await validateWork(open.workDir, CONFIG, undefined), open.featurePath);
        const closedFindings = aboutFeature(await validateWork(closed.workDir, CONFIG, undefined), closed.featurePath);
        assert.ok(openFindings.length > 0 && closedFindings.length === 0, "the answer follows `status` alone");
      } finally {
        await rm(open.repo, { recursive: true, force: true });
        await rm(closed.repo, { recursive: true, force: true });
      }
      // No exemption list of file paths is consulted: a list that can never be paid
      // down is a lifecycle fact wearing a baseline's clothes.
      const leaf = (await readFile(srcHorizon, "utf8")).replace(/^\s*\/\/.*$/gm, "");
      assert.equal(leaf.includes(".feature"), false, "the predicate names no file");
      assert.equal(/\d{4}-\d{2}-\d{2}/.test(leaf), false, "and no date");
      const work = (await readFile(srcWork, "utf8")).replace(/^\s*\/\/.*$/gm, "");
      assert.equal(
        /(EXEMPT|GRANDFATHER|BASELINE|ALLOWLIST)/i.test(work),
        false,
        "validate consults no hand-kept exemption list",
      );
    },
  },

  // =====================================================================
  // Scenario: ACD never rewrites a contract an author already wrote
  //   → the full enumeration of every `.feature` write site under `src/` is
  //     test/arch/grade/acd-acceptance-horizon-single-predicate.test.mjs (FF-6602).
  //     Asserted here: the single admitted site is create-only AT THE CALL.
  // =====================================================================
  {
    name: "66/00 horizon: the one admitted `.feature` write — the migrate scaffold — is create-only at the call (`{ flag: \"wx\" }`)",
    run: async () => {
      const migrate = await readFile(srcMigrate, "utf8");
      assert.match(
        migrate,
        /await writeFile\(\s*\n\s*path\.join\(tasksDir, taskFeatureName\(task\)\),\s*\n\s*renderTaskFeature\([^)]*\),\s*\n\s*\{ encoding: "utf8", flag: "wx" \}/,
        'the create-only scaffold declares `flag: "wx"` at the call — `writeFile(p,t,"utf8")` truncates, so without it no static gate can decide the claim',
      );
      // …and the name it writes to is de-duplicated where it is DERIVED, so create-only
      // never has to choose between overwriting an authored contract and aborting the
      // whole migrate (`29/03_source-shape-tolerance.feature`).
      assert.match(migrate, /function dedupeTaskNames\(/, "the collision the flag exposes is resolved at the name derivation");
    },
  },
];
