import { bundleFixtureRoot, installedBundlePath, readBundleProse } from "../support/cli-spawn.mjs";
import { defaultApplication as _aofApplication } from "aof/default-application";
// Milestone 53 / story 04 — executable evidence for the autonomous prompt hand-off.
// The human soak in task 01 is deliberately absent: it is @uat and belongs to verify.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadBundle, readDescriptor, renderBundleOutputs } from "../../packages/core/src/work/bundle.mjs";
import {
  generateBundleManifest,
  manifestPath,
  readShippedManifest,
  serializeBundleManifest,
} from "../../packages/core/src/work/bundle-manifest.mjs";
import { hashContent } from "../../packages/core/src/lock.mjs";
import { executeApplyActions, planApplyActions } from "../../packages/core/src/render-plan.mjs";
import { markedRegion } from "../support/source-slice.mjs";
const readRuns = _aofApplication.execution.runs.readRuns;

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const cliPath = fileURLToPath(new URL("../../packages/core/bin/aof.mjs", import.meta.url));
const promptPath = path.join(repoRoot, "packages", "core", "assets", "commands", "autonomous.md");
const renderedPath = ".claude/commands/aof/autonomous.md";
const mappedSkillPath = ".agents/skills/aof-autonomous/SKILL.md";
const autonomousPreStoryHashes = new Map([
  [renderedPath, "sha256:7e54cc8968803780629bb321877a872b6aa40f498e0b4df16547989940c8316b"],
  [mappedSkillPath, "sha256:63ed9dc4565106057cd3ae490461628ca5b910f3263c0f4a4cfa9a4b8e51e0fd"],
]);
// The 94-entry residue's content address. RE-CAPTURED 2026-08-20 at milestone 53's
// gate: closing VERIFICATION F-18 stamped the nine `.aof/loops/*.md` records with the
// `# aof-generated:` line ADR-005 requires of a rendered asset, which moves nine hashes
// INSIDE this residue. The claim this constant protects is unchanged and still true —
// 53/04's own diff moved exactly the two named autonomous addresses and no third — but
// the constant is a snapshot of the rest of the tree, so any later legitimate change to
// any other member necessarily invalidates it. Re-capture it with the diff that moves
// the tree, and say which change moved it, or the next reader debugs the wrong story.
// Previous value (pre-F-18): sha256:b3b614299963a0d8d8916adb3762bb34cbd4d67a2bcbb404c8b835e58ac3f6af
const preStoryManifestResidueHash = "sha256:5e90cb38b3e02e763808b7268493d9c834c65cff0f9dad5ef46a0d168ae35d52";
// The sibling phase commands 53/04 must not have disturbed. Held as IDS, not as frozen
// addresses — see the loop that reads them for why the addresses had to go.
const phaseIds = ["continue", "refine", "verify"];
const commandIdsBeforeStory = [
  // `add-diagram` ADDED AT 151, in the descriptor's own order (after `add-chore`): the
  // `/aof:add-diagram` wrapper over `aof diagram plan|export <ref> <ADR-NNN>`, refine's diagram step
  // run after the fact.
  "add-chore", "add-diagram", "add-milestone", "add-spike", "add-story", "add-task", "add-uat",
  // `explain` ADDED AT 150, WITH the diff that lands it, in the descriptor's own order (after
  // `delegate`): the read-only `/aof:explain` command, composed of the existing read verbs.
  // `code-review` REMOVED AT 149, with the diff that deletes it: its review half is `aof:review`,
  // and its shipping half went with `--ship` and `work.codeReview.autoComplete`.
  "assimilate-code", "autonomous", "continue", "delegate", "explain", "feedback",
  // `loop-diagram` ADDED AT 145, in the descriptor's own order (after `insert-uat`): the
  // `/aof:loop-diagram` wrapper over `aof diagram plan|export <ref> loop` — the same species as
  // `promote` and `archive`, repaired at `aof:verify 145`.
  "init", "insert-chore", "insert-milestone", "insert-story", "insert-uat", "loop-diagram", "migrate",
  // `pay-debt` ADDED AT 119/03, and late: the command shipped with the tech-debt ledger work and
  // this list — the control that says the pre-existing member set is COMPLETE and undisturbed —
  // was not updated with it, so the leg has been red on this branch since. It surfaced here
  // because 119/03 is the run that had to get the whole tree green, not because 119 touched it.
  // `promote` ADDED AT 127/02, WITH the diff that lands it — the one verb that mints a number
  // (127/ADR-003 §1) ships `packages/core/assets/commands/promote.md` as a `/aof:promote` wrapper, so the
  // pre-existing member set this leg calls COMPLETE grew by one. Recorded here the same way
  // `pay-debt` had to be, and for the same reason the residue pins above were retired: a literal
  // census only tells the truth if the diff that moves the tree moves it too.
  // `archive` ADDED AT 127/03, in the descriptor's own order (after `promote`), at the milestone door:
  // `packages/core/assets/commands/archive.md` is the `/aof:archive` wrapper over the one move verb (127/ADR-004),
  // and it landed outside the story's declared write set — the same species as `promote`, repaired
  // at `aof:verify 127`.
  // `repair` ADDED AT 147 (after `refine`, the descriptor's own order): the `/aof:repair` session a
  // loop hands a lane halt to. `review` ADDED AT 149 (after `retrospective`): `/aof:review` reviews
  // the operator's own build.
  "observe", "pay-debt", "promote", "archive", "recent", "refine", "repair", "retrospective", "review", "shatter", "validate", "verify",
];
const delegatedCommandRows = [
  ["c01", "/aof:autonomous 03", "aof work loop 03 --level L2"],
  ["c02", "/aof:autonomous 03-05", "aof work loop 03-05 --level L2"],
  ["c03", "/aof:autonomous 03 --max-attempts 5", "aof work loop 03 --level L2 --cap 5"],
  ["c04", "/aof:autonomous 03 --solo", "aof work loop 03 --level L2"],
  // c05 and c06 carried `--ship`, removed at 149; c06 keeps its two surviving flags together.
  ["c06", "/aof:autonomous 03 --solo --max-attempts 5", "aof work loop 03 --level L2 --cap 5"],
];
const CHILD_ROWS = ["b01", "b02", "b03", "b04"];
const REPORT_ROWS = ["h01", "h02", "h03"];

function bundleFacts() {
  const bundle = loadBundle();
  const member = bundle.resources.find((entry) => entry.id === "autonomous");
  const rendered = renderBundleOutputs(bundle, { runtimes: ["claude"] })
    .find((entry) => entry.resource.id === "autonomous");
  assert.ok(member && rendered, "the loaded and rendered autonomous members exist");
  return { bundle, member, rendered };
}

function flattened(value) {
  return String(value).replace(/<!--[^]*?-->/g, " ").replace(/\s+/g, " ").trim();
}

function spawnCli(cwd, globalHome, ...argv) {
  const result = spawnSync(process.execPath, [cliPath, ...argv, "--json"], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, AOF_GLOBAL_HOME: globalHome, NODE_NO_WARNINGS: "1" },
  });
  assert.equal(result.status, 0, `${argv.join(" ")} exits zero: ${result.error?.stack ?? result.stderr ?? "no child diagnostics"}`);
  return JSON.parse(result.stdout);
}

async function directiveFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-autonomous-prompt-"));
  const globalHome = path.join(root, "global-home");
  const milestone = path.join(root, "wiki", "work", "03_milestone_fixture");
  const story = path.join(milestone, "stories", "01_story_fixture");
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await mkdir(path.join(story, "tasks"), { recursive: true });
  await writeFile(
    path.join(root, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, runtimes: ["claude"] }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(milestone, "SPEC.md"),
    "---\ntype: milestone\nnumber: 03\nslug: fixture\nstatus: not-started\n---\n# 03\n",
    "utf8",
  );
  await writeFile(
    path.join(story, "STORY.md"),
    "---\ntype: story\nnumber: 01\nslug: fixture\nparent: 03\nstatus: not-started\n---\n# 03/01\n",
    "utf8",
  );
  return { root, globalHome };
}

function delegatedCommand(invocation) {
  const args = invocation.split(/\s+/u).slice(1);
  const range = args[0];
  const capAt = args.indexOf("--max-attempts");
  return `aof work loop ${range} --level L2${capAt < 0 ? "" : ` --cap ${args[capAt + 1]}`}`;
}

async function snapshotTree(root) {
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else files.push([path.relative(root, absolute).replaceAll("\\", "/"), (await readFile(absolute)).toString("base64")]);
    }
  }
  await walk(root);
  return files.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
}

async function executable(file, content) {
  await writeFile(file, content, "utf8");
  if (process.platform !== "win32") await chmod(file, 0o755);
}

async function launcherFixture(kind) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-autonomous-launch-"));
  const projectRoot = path.join(root, "project");
  const workDir = path.join(projectRoot, "wiki", "work");
  const shimDir = path.join(root, "bin");
  const globalHome = path.join(root, "global-home");
  const providerLog = path.join(root, "provider.log");
  const claudeHome = path.join(root, "claude-home");
  await mkdir(path.join(projectRoot, ".aof"), { recursive: true });
  await mkdir(shimDir, { recursive: true });
  await writeFile(path.join(projectRoot, ".aof", "aof.config.json"), `${JSON.stringify({
    name: "fixture",
    work: {
      dir: "./wiki/work",
      agents: { mode: "solo" },
      autonomous: { maxAttempts: 1 },
      // 131/03 (ADR-001): a session that prints NEEDS_INPUT now WAITS for an answer, bounded by
      // `scheduleToCloseMs` counted from the ask, where it used to halt at once. The story fixture's
      // provider asks and nobody answers, so an unbounded wait here is this suite's 60s hang guard
      // firing on the behaviour, not a hang. A 1 ms bound parks it at the wait's first check.
      ...(kind === "story" ? { loop: { scheduleToCloseMs: 1 } } : {}),
    },
    memory: { backend: "none" },
    runtimes: ["claude", "codex"],
  }, null, 2)}\n`);

  let storyDir = null;
  let milestoneFile = null;
  if (kind === "uat") {
    const uatDir = path.join(workDir, "04_uat_fixture");
    await mkdir(uatDir, { recursive: true });
    await writeFile(path.join(uatDir, "SESSION.md"), "---\ntype: uat\nnumber: 4\nslug: fixture\ntitle: Fixture\nstatus: not-started\ndepends: []\ncreated: 2026-08-17\nupdated: 2026-08-17\nschema: 1\naofVersion: 0.1.0\n---\n# Fixture\n");
  } else {
    const milestoneDir = path.join(workDir, "03_milestone_fixture");
    storyDir = path.join(milestoneDir, "stories", "01_story_fixture");
    milestoneFile = path.join(milestoneDir, "SPEC.md");
    await mkdir(path.join(storyDir, "tasks"), { recursive: true });
    await writeFile(milestoneFile, `---\ntype: milestone\nnumber: 3\nslug: fixture\ntitle: Fixture\nstatus: in-progress\ndepends: []\ncreated: 2026-08-17\nupdated: 2026-08-17\nschema: 1\naofVersion: 0.1.0\n---\n# Fixture\n`);
    await writeFile(path.join(storyDir, "STORY.md"), `---\ntype: story\nnumber: 1\nslug: fixture\ntitle: Fixture\nparent: 3\nstatus: ${kind === "milestone-verify" ? "done" : "in-progress"}\ndepends: []\ncreated: 2026-08-17\nupdated: 2026-08-17\nschema: 1\naofVersion: 0.1.0\n---\n# Fixture\n`);
    await writeFile(path.join(storyDir, "tasks", "00_fixture.feature"), "@executable\nFeature: Fixture\n  Scenario: fixture\n    Given a fixture\n    When it runs\n    Then it passes\n");
  }

  const providerModule = path.join(shimDir, "provider.mjs");
  await writeFile(providerModule, `import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdout.write("provider-ready\\r\\n");
// A PASTE-AWARE receiver, which is what this stands in for. aof wraps the directive in
// bracketed paste (70/06) because that is the only way a multi-line brief crosses ConPTY
// as ONE input; \`claude\` opts into the mode itself at startup and consumes the markers as
// protocol (measured: the live transcript holds the directive with no ESC byte in it).
// This shim must model the same contract, or it asserts on bytes no real TUI ever sees.
const ESC = String.fromCharCode(27);
// …and, like \`claude\`, it ANNOUNCES the mode and then DRAWS its input box: \`❯\` at column 0 between
// two full-width rules, the cursor on the \`❯\` row. A real launch reads that box off the screen
// (138/ADR-002 §1) and, with no screen model, falls back to paste-ON-then-drawn (cf10030). A shim
// that draws a bare \`> \` satisfies only the fallback, so the screen gate waits out its 60 s cap and
// nothing is typed (m138/F-18).
const RULE = "─".repeat(80);
process.stdout.write(ESC + "[?2004h" + ESC + "[2J" + ESC + "[1;1H" + RULE + ESC + "[2;1H❯ " + ESC + "[3;1H" + RULE + ESC + "[2;3H");
const stripPaste = (s) => s.split(ESC + "[200~").join("").split(ESC + "[201~").join("");
process.stdin.on("data", (chunk) => {
  input += chunk;
  if (!/[\\r\\n]/u.test(input)) return;
  const command = stripPaste(input).replace(/[\\r\\n].*$/su, "").trim();
  appendFileSync(process.env.AOF_TEST_PROVIDER_LOG, command + "\\n");
  if (process.env.AOF_TEST_STATUS_FILE && command === process.env.AOF_TEST_STATUS_TRIGGER) {
    const file = process.env.AOF_TEST_STATUS_FILE;
    writeFileSync(file, readFileSync(file, "utf8").replace(/^status: .*$/mu, "status: done"));
  }
  if (process.env.AOF_TEST_NEEDS_INPUT === "1") {
    process.stdout.write("NEEDS_INPUT\\r\\n", () => process.exit(0));
    return;
  }
  process.exit(0);
});
`);
  if (process.platform === "win32") {
    await writeFile(path.join(shimDir, "aof.cmd"), `@echo off\r\n"${process.execPath}" "${cliPath}" %*\r\n`);
    await writeFile(path.join(shimDir, "claude.cmd"), `@echo off\r\n"${process.execPath}" "${providerModule}"\r\n`);
  } else {
    await executable(path.join(shimDir, "aof"), `#!/bin/sh\nexec "${process.execPath}" "${cliPath}" "$@"\n`);
    await executable(path.join(shimDir, "claude"), `#!/bin/sh\nexec "${process.execPath}" "${providerModule}"\n`);
  }
  const env = {
    ...process.env,
    AOF_GLOBAL_HOME: globalHome,
    AOF_TEST_PROVIDER_LOG: providerLog,
    CLAUDE_CONFIG_DIR: claudeHome,
    NODE_NO_WARNINGS: "1",
    PATH: `${shimDir}${path.delimiter}${process.env.PATH ?? ""}`,
    ...(kind === "story" ? { AOF_TEST_NEEDS_INPUT: "1" } : {}),
    ...(kind === "milestone-verify" ? {
      AOF_TEST_STATUS_FILE: milestoneFile,
      AOF_TEST_STATUS_TRIGGER: "/aof:verify 03",
    } : {}),
  };
  return {
    root,
    projectRoot,
    storyDir,
    providerLog,
    env,
    cleanup: () => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }),
  };
}

function runSourceLocalAof(fixture, ...args) {
  const result = spawnSync("aof", args, {
    cwd: fixture.projectRoot,
    encoding: "utf8",
    env: fixture.env,
    shell: process.platform === "win32",
    // milestone 124 / story 01 raised this from 20s. The budget was sized for a range that ENDED
    // at its first cap exhaustion; a unit that exhausts is now handed back to its plan for one
    // refine before the walk terminates, so the `03` fixture below drives one more real phase
    // than it used to. That extra drive is the behaviour this suite's subject now has, not a
    // regression to bound — the guard is here to catch a HANG, and 60s still catches one.
    timeout: 60_000,
  });
  assert.equal(result.status, 0, `source-local aof ${args.join(" ")} exits zero: ${result.error?.stack ?? result.stderr}`);
  return result;
}

async function providerCalls(file) {
  try {
    return (await readFile(file, "utf8")).split(/\r?\n/u).filter(Boolean);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export const autonomousShellOutPromptTests = [
  {
    name: "autonomous-shell-out/body: one shell command owns the drive and all five loop responsibilities are explicitly refused here",
    run: () => {
      const { member } = bundleFacts();
      const text = flattened(`${member.description} ${member.body}`);
      assert.match(text, /Run `aof work loop <range> --level L2`/);
      assert.doesNotMatch(text, /aof work loop <range> --level L2 --json/);
      assert.match(text, /The `--json` form is a read-only probe and never launches work; do not add it to this command\./);
      assert.match(text, /Do not re-implement the loop, the phase mapping, the gate, the retry or the stop conditions; they are the shell's\./);
      assert.equal((text.match(/aof work loop/g) ?? []).length, 2, "the family appears only as the drive and resume forms");
      assert.doesNotMatch(text, /aof work (?:next|run-start|run-complete|run-retry|validate|refine|continue|verify)\b/);
      assert.doesNotMatch(text, /\/aof:(?:refine|continue|verify|loop|drive-)/);
      const commandFamilies = [...text.matchAll(/`(aof(?: work)?[^`]+|aof:[^`]+)`/g)]
        .map((match) => match[1])
        .filter((value) => value.startsWith("aof work") || value.startsWith("aof:"));
      assert.deepEqual(
        [...new Set(commandFamilies.map((value) => value.startsWith("aof work loop") ? "aof work loop" : value))].sort(),
        ["aof work loop"],
        "the shell is the only command family — aof:code-review left it at 149",
      );
    },
  },
  {
    name: "autonomous-shell-out/arguments: c01-c04 and c06 delegate the exact no-json command and only max-attempts adds cap",
    run: () => {
      const exercised = new Set();
      for (const [row, invocation, expected] of delegatedCommandRows) {
        const actual = delegatedCommand(invocation);
        assert.equal(actual, expected, `${row}: exact delegated command`);
        assert.equal(actual.includes("--json"), false, `${row}: human launcher, never the probe`);
        exercised.add(row);
      }
      assert.deepEqual([...exercised], delegatedCommandRows.map(([row]) => row));
    },
  },
  {
    name: "autonomous-shell-out/black-box: b01-b04 and h01-h03 prove source-local human drive, halt, accepted milestone and inert JSON probe",
    run: async () => {
      const childRows = new Set();
      const reportRows = new Set();

      const drive = await launcherFixture("story");
      try {
        const result = runSourceLocalAof(drive, "work", "loop", "03", "--level", "L2");
        const calls = await providerCalls(drive.providerLog);
        const runs = await readRuns({ ref: "03/01", dir: drive.storyDir });
        assert.ok(calls.length >= 1, "b01: the real provider path received a phase directive");
        assert.ok(runs.length >= 1, "b01: the real run store minted a run for 03/01");
        assert.match(result.stdout, /Driven 03\/01 — (?:refine|continue|verify) \((?:done|failed|needs-input)\)\./u);
        childRows.add("b01");
        reportRows.add("h01");
      } finally { await drive.cleanup(); }

      const halt = await launcherFixture("uat");
      try {
        const before = await snapshotTree(halt.projectRoot);
        const result = runSourceLocalAof(halt, "work", "loop", "04", "--level", "L2");
        assert.deepEqual(await providerCalls(halt.providerLog), [], "b02: a uat halt calls no provider");
        assert.deepEqual(await snapshotTree(halt.projectRoot), before, "b02: the halt mints no run and rewrites nothing");
        assert.match(result.stdout, /halted on uat-gate at 04/u);
        assert.match(result.stdout, /aof work loop 04 --resume/u);
        assert.doesNotMatch(result.stdout, /^\s*\{/u, "b02: stdout is the human report, not JSON");
        childRows.add("b02");
        reportRows.add("h03");
      } finally { await halt.cleanup(); }

      const probe = await launcherFixture("story");
      try {
        const before = await snapshotTree(probe.projectRoot);
        const result = runSourceLocalAof(probe, "work", "loop", "03", "--level", "L2", "--json");
        const document = JSON.parse(result.stdout);
        assert.deepEqual(document.driven, []);
        assert.equal(document.act.act, "drive");
        assert.deepEqual(await providerCalls(probe.providerLog), [], "b03: JSON calls no provider");
        assert.deepEqual(await snapshotTree(probe.projectRoot), before, "b03: JSON is byte-inert");
        childRows.add("b03");
      } finally { await probe.cleanup(); }

      const completed = await launcherFixture("milestone-verify");
      try {
        const result = runSourceLocalAof(completed, "work", "loop", "03", "--level", "L2");
        const calls = await providerCalls(completed.providerLog);
        const runs = await readRuns({ ref: "03", dir: path.dirname(path.dirname(completed.storyDir)) });
        assert.deepEqual(calls, ["/aof:verify 03"], "b04: exactly one real verify provider call");
        assert.equal(runs.length, 1, "b04: one completed verify run is recorded on the milestone");
        assert.equal(runs[0].state, "done");
        assert.match(result.stdout, /Driven 03 — verify \(done\)\./u);
        assert.match(result.stdout, /Accepted milestone 03\./u);
        childRows.add("b04");
        reportRows.add("h02");
      } finally { await completed.cleanup(); }

      assert.deepEqual([...childRows].sort(), [...CHILD_ROWS].sort());
      assert.deepEqual([...reportRows].sort(), [...REPORT_ROWS].sort());
    },
  },
  {
    name: "autonomous-shell-out/body: reports driven items and halt fields verbatim, with no prose phase map, run ledger, stop list, or reader-owned progress",
    run: () => {
      const { member } = bundleFacts();
      const text = flattened(member.body);
      for (const phrase of [
        "Report the items the shell says it drove",
        "the shell's stop id",
        "the ref where it halted",
        "the exact resume command it printed",
        "first item still needing a human",
        "quote its output rather than calculating a second account",
      ]) assert.ok(text.includes(phrase), `report contract retains: ${phrase}`);
      for (const removed of [
        "Loop until", "aof work next", "aof work run-start", "run-retry", "maxAttempts",
        "heartbeatStaleMs", "retry-parked", "dependency-blocked", "session-needs-input",
        "unmapped-item-type", "go back", "repeat an earlier", "spike", "chore",
        "self-triggering", "duplicate-run",
      ]) assert.ok(!text.includes(removed), `old loop-shell token is absent: ${removed}`);
      assert.doesNotMatch(text, /milestone with no stories|story whose tasks|story with tasks|uat session \(ready\)/i);
      assert.match(text, /Do not infer a phase, retry, gate result, stop reason, or progress position independently/);
    },
  },
  {
    name: "autonomous-shell-out/survivors: range, solo and max-attempts keep their admitted effects while prompt-owned config names the loop surface and its twins (149 E13: no --ship)",
    run: () => {
      const { member } = bundleFacts();
      assert.equal(
        member.argumentHint,
        '"<range — NN-MM or NN> [--max-attempts N] [--solo]"',
        "149 E13: the advertised argument contract lost --ship and nothing else",
      );
      const text = flattened(member.body);
      for (const value of ["NN-MM", "single `NN`", "--max-attempts N", "--solo"]) {
        assert.ok(text.includes(value), `argument effect is stated: ${value}`);
      }
      assert.match(text, /--max-attempts N.*forward `N` to the shell as `--cap N`/);
      assert.match(text, /work\.agents\.mode/);
      assert.match(text, /governs only the roles this session plays itself/);
      assert.match(text, /does not reach the sessions the shell drives/);
      for (const gone of ["--ship", "aof:code-review", "work.codeReview.autoComplete"]) assert.ok(!text.includes(gone), `149 E13: the body names no ${gone}`);
      const configKeys = [...text.matchAll(/work\.[A-Za-z.]+/g)].map((match) => match[0]);
      assert.deepEqual([...new Set(configKeys)].sort(), ["work.agents", "work.agents.mode", "work.dispatch.concurrency", "work.loop.agents.continue.mode", "work.loop.agents.refine.mode", "work.loop.concurrency", "work.loop.dispatch.concurrency"], "129/07: the loop's three keys and their two workspace twins join the mode; 149 removed work.codeReview.autoComplete");
    },
  },
  {
    name: "autonomous-shell-out/door: identity, namespace, invocation and complete pre-existing command-member set are unchanged; no rival loop or drive door exists",
    run: () => {
      const descriptor = readDescriptor();
      const autonomous = descriptor.members.find((entry) => entry.id === "autonomous");
      const { variants, ...commonAutonomous } = autonomous;
      assert.ok(variants.codex, "154/05 supplies the native variant separately");
      assert.deepEqual(commonAutonomous, {
        id: "autonomous",
        kind: "command",
        file: "commands/autonomous.md",
        runtimes: ["claude", "opencode"],
        commandNamespace: "aof",
      });
      const commands = descriptor.members.filter((entry) => entry.kind === "command").map((entry) => entry.id);
      assert.deepEqual(commands, commandIdsBeforeStory);
      assert.ok(!commands.includes("loop"));
      assert.ok(!commands.some((id) => id.startsWith("drive-")));
      const { rendered } = bundleFacts();
      assert.equal(rendered.path.replaceAll("\\", "/"), renderedPath);
      assert.match(rendered.content, /^aof-invocation: \/aof:autonomous$/m);
    },
  },
  {
    name: "autonomous-shell-out/distribution: derived manifest carries both autonomous runtime addresses and a clean render writes the edited body",
    run: async () => {
      const { member, rendered } = bundleFacts();
      const shippedBytes = readFileSync(manifestPath(), "utf8");
      assert.equal(serializeBundleManifest(generateBundleManifest()), shippedBytes, "the shipped manifest is regenerated, never hand-maintained");
      const shipped = readShippedManifest();
      const runtimeRenders = renderBundleOutputs(loadBundle(), { runtimes: ["claude", "codex"] })
        .filter((item) => item.resource.id === "autonomous" || item.resource.id === "aof-autonomous");
      assert.deepEqual(
        runtimeRenders.map((item) => item.path.replaceAll("\\", "/")).sort(),
        [...autonomousPreStoryHashes.keys(), ".agents/skills/aof-autonomous/agents/openai.yaml"].sort(),
        "one authored command produces the two primary renders and the native invocation policy",
      );
      for (const runtimeRender of runtimeRenders) {
        const runtimePath = runtimeRender.path.replaceAll("\\", "/");
        const entry = shipped.entries.find((item) => item.path === runtimePath);
        assert.ok(entry, `manifest carries the autonomous render at ${runtimePath}`);
        assert.equal(entry.hash, hashContent(runtimeRender.content), `${runtimePath} has a true content address`);
        assert.notEqual(entry.hash, autonomousPreStoryHashes.get(runtimePath), `${runtimePath} moved from its pre-story address`);
      }
      // THE SIBLING PHASES ARE CHECKED FOR SOUNDNESS, NOT FROZEN. This loop compared
      // `continue`/`refine`/`verify` against addresses captured before 53/04 — a claim
      // about THAT story's diff ("it touched no sibling phase"), which is permanently
      // true and no longer measurable: `continue.md` has legitimately changed since, so
      // the pin reported a correct edit as a defect. Measured: it was red at `HEAD`
      // before this branch, `5e09633b` against a pinned `b2a34c2b`.
      //
      // What is durable is that each sibling's manifest entry is a TRUE CONTENT ADDRESS
      // of the member it names — which is what a reader of this manifest relies on, and
      // which no later edit can quietly break.
      for (const id of phaseIds) {
        const entry = shipped.entries.find((item) => item.resource.id === id);
        assert.ok(entry, `the manifest carries the ${id} phase command`);
        const rendered = renderBundleOutputs(loadBundle(), { runtimes: ["claude"], targetDir: repoRoot })
          .find((item) => item.resource.id === id && item.path.replaceAll("\\", "/").endsWith(`/aof/${id}.md`));
        assert.ok(rendered, `the ${id} phase command renders`);
        assert.equal(entry.hash, hashContent(rendered.content), `${id}'s manifest address is a true content address of its render`);
      }

      const target = await mkdtemp(path.join(os.tmpdir(), "aof-autonomous-render-"));
      try {
        const cleanRender = renderBundleOutputs(loadBundle(), { runtimes: ["claude"], targetDir: target })
          .find((item) => item.resource.id === "autonomous");
        const actions = await planApplyActions([cleanRender], null, { targetDir: target });
        assert.deepEqual(actions.map((item) => item.action), ["create"]);
        await executeApplyActions(actions);
        assert.equal(await readFile(cleanRender.absolutePath, "utf8"), cleanRender.content);
        assert.equal(cleanRender.body, member.body, "the rendered member's body is the edited source body");
      } finally {
        await rm(target, { recursive: true, force: true });
      }
    },
  },
  {
    name: "autonomous-shell-out/distribution: exactly the named Claude and Codex content-addresses move, and no third",
    run: () => {
      const entries = readShippedManifest().entries;
      // THE TWO WHOLE-TREE PINS ARE RETIRED, and this test's own comment predicted why:
      // the residue constant "is a snapshot of the rest of the tree, so any later
      // legitimate change to any other member necessarily invalidates it", with each
      // future author asked to re-capture it. Nobody did — the same instrument, and the
      // same outcome, as the bundle census literal that was told to move five times and
      // moved by its causing diff zero times. A 96-entry membership count and a hash of
      // "everything except my two files" are claims about 53/04's diff, permanently true
      // and unmeasurable from today's tree.
      //
      // Retired rather than re-captured, because re-capturing buys one more release of
      // the same false confidence. What they were reaching for — that the manifest is
      // sound for every member — IS measured, per member and content-derived, by
      // `bundle/manifest: each entry hash equals hashContent of the re-rendered member`
      // and `arch/ADR-002`'s membership equality against the rendered set. Those cannot
      // go stale, because they DERIVE the expectation instead of storing it.
      //
      // What stays here is the claim this story can still make: its two named renders
      // exist, and both moved off their pre-story addresses.
      assert.ok(entries.length > 0, "non-vacuity: the shipped manifest was read");
      const current = entries.filter((entry) => autonomousPreStoryHashes.has(entry.path));
      assert.equal(current.length, autonomousPreStoryHashes.size, "neither named runtime output was deleted");
      const moved = current
        .filter((entry) => entry.hash !== autonomousPreStoryHashes.get(entry.path))
        .map((entry) => entry.path)
        .sort();
      assert.deepEqual(
        moved,
        [...autonomousPreStoryHashes.keys()].sort(),
        "exactly the Claude command and mapped Codex skill moved from their recorded pre-story addresses",
      );
    },
  },
  {
    name: "autonomous-shell-out/directive: spawned CLI keeps milestone continue on autonomous, story continue and refine/verify single-phase, and unresolved refs degrading safely",
    run: async () => {
      const fixture = await directiveFixture();
      try {
        assert.equal(spawnCli(fixture.root, fixture.globalHome, "work", "continue", "03").command, "/aof:autonomous 03");
        assert.equal(spawnCli(fixture.root, fixture.globalHome, "work", "continue", "03/01").command, "/aof:continue 03/01");
        assert.equal(spawnCli(fixture.root, fixture.globalHome, "work", "refine", "03").command, "/aof:refine 03");
        assert.equal(spawnCli(fixture.root, fixture.globalHome, "work", "verify", "03").command, "/aof:verify 03");
        assert.equal(spawnCli(fixture.root, fixture.globalHome, "work", "continue", "99").command, "/aof:continue 99");
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "autonomous-shell-out/wiring: every story-04 executable case is present in the assembled runner",
    run: async () => {
      const { tests } = await import("../../scripts/test.mjs");
      const registered = new Set(tests.map((test) => test.name));
      for (const test of autonomousShellOutPromptTests) {
        assert.ok(registered.has(test.name), `registered: ${test.name}`);
      }
    },
  },
  // ── 129/07 task 02 — the prompts carry the surface ───────────────────────────
  //
  // `…/07_story_the-loop-settings-are-self-contained/tasks/02_the-drive-carries-the-phase-mode.feature`
  // — the prompt-side rows (the drive's rows are in `drive-command-phase-drivers`). The row's
  // "falling back to `work.agents.mode`" clause is superseded by 140/00, whose cases follow.
  ...["refine", "continue"].map((prompt) => ({
    name: `129/07 task02 ${prompt}.md parses --orchestrated as --solo's twin and names its loop key`,
    run: () => {
      const bundle = loadBundle();
      const member = bundle.resources.find((entry) => entry.id === prompt);
      assert.ok(member, `${prompt} is a bundle member`);
      assert.match(member.argumentHint, /--solo \| --orchestrated/u, "the argument hint names both, as one choice");
      const text = flattened(member.body);
      // continue.md carries two <config> blocks; the execution-mode paragraph is read off the whole body.
      const config = text;
      assert.match(config, /`--orchestrated` OVERRIDES a solo config to orchestrated for this run/u);
      assert.match(config, /The two together are contradictory: STOP before any role runs/u);
      assert.match(config, new RegExp(`work\\.loop\\.agents\\.${prompt}\\.mode`, "u"), "the loop key the drive composes the flag from is named");
      assert.match(config, /packages\/contracts\/src\/loop-bounds\.mjs/u, "…and its home");
      for (const runtime of ["claude", "codex", "opencode"]) {
        const rendered = renderBundleOutputs(bundle, { runtimes: [runtime] }).find((entry) => entry.resource.id === prompt || entry.resource.id === `aof-${prompt}`);
        assert.ok(rendered, `${prompt} renders for ${runtime}`);
        const onDisk = readBundleProse(rendered.path, repoRoot);
        assert.ok(onDisk.includes("--orchestrated"), `${rendered.path} on disk carries --orchestrated`);
        assert.ok(onDisk.includes(`work.loop.agents.${prompt}.mode`), `${rendered.path} on disk names the key`);
      }
    },
  })),
  {
    name: "129/07 task02 the autonomous prompt names the three keys and their fallbacks beside the mode, states no cardinal for them, and its key set is the seven (149 removed work.codeReview.autoComplete)",
    run: async () => {
      const { member } = bundleFacts();
      const text = flattened(member.body);
      const paragraphs = String(member.body).replace(/<!--[^]*?-->/g, " ").split(/\n\s*\n/u).map((p) => p.replace(/\s+/g, " ").trim());
      const paragraph = paragraphs.filter((p) => p.includes("work.loop.concurrency"));
      assert.equal(paragraph.length, 1, "exactly one paragraph names the mode");
      for (const key of ["work.loop.dispatch.concurrency", "work.loop.agents.refine.mode", "work.loop.agents.continue.mode", "work.dispatch.concurrency", "work.agents.mode"]) {
        assert.ok(paragraph[0].includes(key), `the paragraph names ${key}`);
      }
      assert.match(paragraph[0], /falls back to its workspace twin/u);
      const { sentences, statedValues, unitOf } = await import("../arch/command/acd-prompt-bounds-name-their-home.test.mjs");
      for (const sentence of sentences(paragraph[0])) {
        for (const key of ["work.loop.dispatch.concurrency", "work.loop.agents.refine.mode", "work.loop.agents.continue.mode"]) {
          if (sentence.includes(key)) assert.deepEqual(statedValues(sentence, unitOf(key)), [], `no cardinal is stated for ${key}: ${sentence}`);
        }
      }
      assert.equal((text.match(/aof work loop/g) ?? []).length, 2, "the family count is unchanged");
      const configKeys = [...text.matchAll(/work\.[A-Za-z.]+/g)].map((match) => match[0]);
      assert.deepEqual([...new Set(configKeys)].sort(), [
        "work.agents", "work.agents.mode", "work.dispatch.concurrency",
        "work.loop.agents.continue.mode", "work.loop.agents.refine.mode", "work.loop.concurrency", "work.loop.dispatch.concurrency",
      ]);
    },
  },
  // ── 140/00 — each prompt states its own default ──────────────────────────────
  //
  // `140_story_refine-defaults-to-solo/tasks/00_each-prompt-states-its-own-default.feature`.
  // Supersedes 129/07 task 02's "…falling back to `work.agents.mode`" prompt rows.
  ...[
    ["refine", "solo", "orchestrated"],
    ["continue", "orchestrated", "solo"],
  ].map(([prompt, fallback, other]) => ({
    name: `140/00 an unset work.agents.mode resolves to the command's own default [${prompt}: unset → ${fallback}, "${other}" → ${other}]`,
    run: () => {
      const config = configBlocksOf(prompt);
      assert.match(config, new RegExp(`An unset \`work\\.agents\\.mode\` resolves to ${fallback}\\b`, "u"), `${prompt}: the unset default`);
      assert.match(config, new RegExp(`\`work\\.agents\\.mode: "${other}"\` resolves to ${other}\\b`, "u"), `${prompt}: the set value still governs`);
    },
  })),
  ...["refine", "continue"].map((prompt) => ({
    name: `140/00 ${prompt}.md names what the loop composes, and no fallback to work.agents.mode`,
    run: () => {
      const config = configBlocksOf(prompt);
      assert.match(config, new RegExp(`The loop composes a flag on every ${prompt} it drives: \`work\\.loop\\.agents\\.${prompt}\\.mode\` when set, \`--solo\` when unset`, "u"));
      assert.match(config, new RegExp(`A loop-driven ${prompt} therefore never reads \`work\\.agents\\.mode\``, "u"));
      assert.doesNotMatch(config, /composes nothing when it is unset/u);
      assert.match(config, /the loop's own default, whose home is `packages\/contracts\/src\/loop-bounds\.mjs`/u);
    },
  })),
  {
    name: "140/00 an orchestrated refine gives each story one QA agent",
    run: () => {
      const body = flattened(loadBundle().resources.find((entry) => entry.id === "refine").body);
      const start = body.indexOf("**story — Contract (Three Amigos):**");
      assert.ok(start >= 0, "the story Contract step is found");
      const step = body.slice(start, body.indexOf("**Gate check (before authoring):**", start));
      assert.match(step, /Under orchestrated mode, one `aof-qa` writes the Examples tables for all of the story's tasks/u);
      assert.match(step, /The QA pass is never split into one agent per task/u);
    },
  },
  {
    name: "140/00 the schema describes the per-command default and the loop's own key",
    run: () => {
      const schema = JSON.parse(readFileSync(path.join(repoRoot, "schemas", "aof.schema.json"), "utf8"));
      const description = schema.$defs.work.properties.agents.properties.mode.description;
      assert.match(description, /An unset key resolves to each command's own default: refine runs solo, and every other role-spawning command runs orchestrated\./u);
      assert.match(description, /a loop-driven session reads work\.loop\.agents\.<phase>\.mode, never this key/u);
    },
  },
  {
    name: "140/00 the renders, the manifest and the lock agree with the source",
    run: () => {
      const dry = spawnSync(process.execPath, [cliPath, "work", "update", "--dry-run", "--json"], { cwd: bundleFixtureRoot(repoRoot), encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" } });
      assert.equal(dry.status, 0, dry.stderr);
      const { summary } = JSON.parse(dry.stdout);
      assert.deepEqual({ created: summary.created, updated: summary.updated, deleted: summary.deleted, drift: summary["drift-warning"] }, { created: 0, updated: 0, deleted: 0, drift: 0 });
      const bundle = loadBundle();
      for (const [prompt, fallback] of [["refine", "solo"], ["continue", "orchestrated"]]) {
        const renders = renderBundleOutputs(bundle, { runtimes: ["claude", "codex", "opencode"] }).filter((entry) => (entry.resource.id === prompt || entry.resource.id === `aof-${prompt}`) && entry.resource.artifact !== "associated-file");
        assert.equal(renders.length, 3, `${prompt}: one render per runtime`);
        for (const render of renders) {
          const onDisk = flattened(readBundleProse(render.path, repoRoot));
          assert.match(onDisk, new RegExp(`An unset \`work\\.agents\\.mode\` resolves to ${fallback}\\b`, "u"), `${render.path} states the unset default`);
        }
      }
      assert.equal(serializeBundleManifest(generateBundleManifest()), readFileSync(manifestPath(), "utf8"), "the shipped manifest is regenerated");
    },
  },
  // ── 140/01 — the autonomous prompt names the loop's default beside the mode ────
  {
    name: "140/01 the autonomous prompt names the loop's default beside the mode, and the lane bound's fallback",
    run: async () => {
      const { bundle, member } = bundleFacts();
      const loopParagraph = (body) => String(body).replace(/<!--[^]*?-->/g, " ").split(/\n\s*\n/u).map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => p.includes("work.loop.concurrency"));
      const modes = /`work\.loop\.agents\.refine\.mode` and `work\.loop\.agents\.continue\.mode` \([^)]*\) default to `solo` when unset and do not fall back to `work\.agents\.mode`/u;
      const bound = /`work\.loop\.dispatch\.concurrency` — [^—]*— which falls back to its workspace twin `work\.dispatch\.concurrency` when unset/u;
      const [paragraph, ...more] = loopParagraph(member.body);
      assert.equal(more.length, 0, "exactly one paragraph names the mode");
      assert.match(paragraph, modes);
      assert.match(paragraph, bound);
      const { sentences, statedValues, unitOf } = await import("../arch/command/acd-prompt-bounds-name-their-home.test.mjs");
      const keys = ["work.loop.dispatch.concurrency", "work.loop.agents.refine.mode", "work.loop.agents.continue.mode"];
      for (const sentence of sentences(paragraph)) {
        for (const key of keys.filter((k) => sentence.includes(k))) assert.deepEqual(statedValues(sentence, unitOf(key)), [], `no value is stated for ${key}: ${sentence}`);
      }
      const configKeys = [...flattened(member.body).matchAll(/work\.[A-Za-z.]+/g)].map((match) => match[0]);
      assert.deepEqual([...new Set(configKeys)].sort(), [
        "work.agents", "work.agents.mode", "work.dispatch.concurrency",
        "work.loop.agents.continue.mode", "work.loop.agents.refine.mode", "work.loop.concurrency", "work.loop.dispatch.concurrency",
      ]);
      const renders = renderBundleOutputs(bundle, { runtimes: ["claude", "codex", "opencode"] }).filter((entry) => (entry.resource.id === "autonomous" || entry.resource.id === "aof-autonomous") && entry.resource.artifact !== "associated-file");
      assert.equal(renders.length, 3, "three rendered files");
      for (const render of renders) {
        const [onDisk] = loopParagraph(readFileSync(installedBundlePath(render.path, repoRoot), "utf8"));
        assert.match(onDisk ?? "", modes, `${render.path} carries the modes' default`);
        assert.match(onDisk ?? "", bound, `${render.path} carries the lane bound's fallback`);
      }
    },
  },
  // ── 149/00 — a manual continue hands the operator a guide instead of a build ────
  //
  // `149_story_continue-manual-mode-guides-the-operator/tasks/00_a-manual-continue-hands-the-operator-a-guide.feature`,
  // and the two prompt rows of task 01 (E5, E6). Read off the marked `<manual_mode>` region, so a
  // renumbered step cannot move these controls.
  {
    name: "149/00 E1 · a manual continue spawns no builder, writes nothing outside the item's folder, prints the guide and stops",
    run: () => {
      const region = manualRegionOf();
      assert.match(region, /No `aof-developer` is spawned, in solo and in orchestrated mode alike/u);
      assert.match(region, /no file outside the item's own folder is written/u);
      assert.match(region, /Close the run with `aof work run-complete <ref> --outcome done` after the guide is printed\*\*, then stop\./u);
    },
  },
  {
    name: "149/00 E2 · the guide names everything the operator needs before touching code, in order",
    run: () => {
      const region = manualRegionOf();
      const parts = [
        "the scenarios still red, by name",
        "the user story",
        "each task file with its scenario names, read from `aof work tasks <ref> --json`",
        "every `reads:` entry and every `files:` entry, each with one line on why it matters",
        "the test files among `files:`, and the command `aof test --scope impacted --story <ref>`",
        "the build plan's mechanism and known traps, when the story has a `PLAN.md`",
        "an order to take the tasks in, with the reason for it",
      ];
      const guide = region.slice(region.indexOf("Print the guide"));
      const at = parts.map((part) => guide.indexOf(part));
      parts.forEach((part, i) => assert.ok(at[i] >= 0, `the guide names: ${part}`));
      assert.deepEqual([...at].sort((a, b) => a - b), at, "the parts are named in the guide's order");
    },
  },
  {
    name: "149/00 E3 · a manual continue starts the story through its run, and writes no status move of its own",
    run: () => {
      const region = manualRegionOf();
      const mint = region.indexOf("Mint the run with `aof work run-start <ref> --json` before the guide is printed");
      const guide = region.indexOf("Print the guide");
      const close = region.indexOf("Close the run with `aof work run-complete <ref> --outcome done` after the guide is printed");
      assert.ok(mint >= 0 && guide > mint && close > guide, "mint, then the guide, then the close");
      assert.match(region, /The session writes no status move of its own/u);
    },
  },
  {
    name: "149/00 E4 · a re-run prints the guide again, headed by what is still red",
    run: () => {
      const region = manualRegionOf();
      assert.match(region, /Every manual run runs `aof test --scope impacted --story <ref>` once, before the guide/u);
      assert.match(region, /The guide is printed in the terminal only\*\*, and no guide file is written to the story folder/u);
      assert.match(region, /When every scenario is green the guide says so, and names `aof:review <ref>` as the next step/u);
    },
  },
  ...[
    [/A story whose `reads:` is absent, or whose tasks are thin or untagged, halts and sends the operator to `aof:refine <ref>`/u, "an unrefined story halts to aof:refine"],
    [/Read the story exactly as the story lane's step 1 reads it, and no wider/u, "the read is step 1's, no wider"],
    [/No gate ladder is walked and no reviewer is spawned/u, "no gate ladder and no reviewer"],
    [/The hand-back is `guided: <ref> is yours to build`, and it names `aof:review <ref>` next — never `aof:verify`/u, "the hand-back names aof:review, never aof:verify"],
  ].map(([rule, label]) => ({
    name: `149/00 the manual region holds each rule a manual continue needs [${label}]`,
    run: () => assert.match(manualRegionOf(), rule),
  })),
  {
    name: "149/00 the output section names the manual outcome",
    run: () => {
      const body = String(loadBundle().resources.find((entry) => entry.id === "continue").body);
      const output = flattened(markedRegion(body, "<output>", "</output>") ?? "");
      assert.match(output, /\*\*guided: `<ref>` is yours to build\*\* — [^-]*Next: `aof:review <ref>`/u);
    },
  },
  {
    name: "149/00 the argument hint and every render carry --manual, and the renders are current",
    run: () => {
      const bundle = loadBundle();
      const member = bundle.resources.find((entry) => entry.id === "continue");
      assert.equal(member.argumentHint, '"<item ref, or a NN/MM-PP story span> [--solo | --orchestrated | --manual] [--thinking <level>]"');
      const renders = [".claude/commands/aof/continue.md", ".agents/skills/aof-continue/SKILL.md", ".opencode/commands/aof/continue.md"];
      for (const render of renders) assert.ok(readBundleProse(render, repoRoot).includes("<manual_mode>"), `${render} and its own declared procedure carry <manual_mode>`);
      const dry = spawnSync(process.execPath, [cliPath, "work", "update", "--dry-run", "--json"], { cwd: bundleFixtureRoot(repoRoot), encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" } });
      assert.equal(dry.status, 0, dry.stderr);
      const actions = new Map(JSON.parse(dry.stdout).actions.map((entry) => [entry.path.replaceAll("\\", "/"), entry.action]));
      for (const render of renders) assert.equal(actions.get(render), "skip", `${render} is current`);
    },
  },
  {
    name: "149/01 E5 · --manual with --solo or --orchestrated is stopped as contradictory, before any role runs or any run is minted",
    run: () => {
      const config = configBlocksOf("continue");
      assert.match(config, /\*\*`--manual` together with `--solo` or `--orchestrated` is contradictory too\*\*/u);
      assert.match(config, /STOP before any role runs and before any run is minted, and report it/u);
    },
  },
  {
    name: "149/01 E6 · a manual continue on a milestone or span is refused before any run is minted, naming its ready stories",
    run: () => {
      const region = manualRegionOf();
      assert.match(region, /A milestone or a `NN\/MM-PP` span is refused before any run is minted/u);
      assert.match(region, /run `aof work next <ref> --json` and name the ready stories it answers, to take one at a time/u);
    },
  },
];

// The `<manual_mode>` region of the bundled continue prompt, flattened (149/00).
function manualRegionOf() {
  const member = loadBundle().resources.find((entry) => entry.id === "continue");
  assert.ok(member, "continue is a bundle member");
  const region = markedRegion(String(member.body), "<manual_mode>", "</manual_mode>");
  assert.ok(region != null, "continue.md: NOT FOUND — the <manual_mode> region could not be cut");
  return flattened(region);
}

// The `<config>` blocks of a bundled prompt, flattened — continue.md carries two.
function configBlocksOf(prompt) {
  const member = loadBundle().resources.find((entry) => entry.id === prompt);
  assert.ok(member, `${prompt} is a bundle member`);
  const blocks = [...String(member.body).matchAll(/<config>([^]*?)<\/config>/gu)].map((match) => match[1]);
  assert.ok(blocks.length > 0, `${prompt}: a <config> block`);
  return flattened(blocks.join("\n"));
}
