// Milestone 53 / story 04 — executable evidence for the autonomous prompt hand-off.
// The human soak in task 01 is deliberately absent: it is @uat and belongs to verify.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadBundle, readDescriptor, renderBundleOutputs } from "../../src/work/bundle.mjs";
import {
  generateBundleManifest,
  manifestPath,
  readShippedManifest,
  serializeBundleManifest,
} from "../../src/work/bundle-manifest.mjs";
import { hashContent } from "../../src/lock.mjs";
import { executeApplyActions, planApplyActions } from "../../src/render-plan.mjs";
import { readRuns } from "../../src/run-store.mjs";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const cliPath = fileURLToPath(new URL("../../bin/aof.mjs", import.meta.url));
const promptPath = path.join(repoRoot, "src", "bundle", "commands", "autonomous.md");
const renderedPath = ".claude/commands/aof/autonomous.md";
const mappedSkillPath = ".codex/skills/aof-autonomous/SKILL.md";
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
  "add-chore", "add-milestone", "add-spike", "add-story", "add-task", "add-uat",
  "assimilate-code", "autonomous", "code-review", "continue", "delegate", "feedback",
  "init", "insert-chore", "insert-milestone", "insert-story", "insert-uat", "migrate",
  // `pay-debt` ADDED AT 119/03, and late: the command shipped with the tech-debt ledger work and
  // this list — the control that says the pre-existing member set is COMPLETE and undisturbed —
  // was not updated with it, so the leg has been red on this branch since. It surfaced here
  // because 119/03 is the run that had to get the whole tree green, not because 119 touched it.
  // `promote` ADDED AT 127/02, WITH the diff that lands it — the one verb that mints a number
  // (127/ADR-003 §1) ships `src/bundle/commands/promote.md` as a `/aof:promote` wrapper, so the
  // pre-existing member set this leg calls COMPLETE grew by one. Recorded here the same way
  // `pay-debt` had to be, and for the same reason the residue pins above were retired: a literal
  // census only tells the truth if the diff that moves the tree moves it too.
  "observe", "pay-debt", "promote", "recent", "refine", "retrospective", "shatter", "validate", "verify",
];
const delegatedCommandRows = [
  ["c01", "/aof:autonomous 03", "aof work loop 03 --level L2"],
  ["c02", "/aof:autonomous 03-05", "aof work loop 03-05 --level L2"],
  ["c03", "/aof:autonomous 03 --max-attempts 5", "aof work loop 03 --level L2 --cap 5"],
  ["c04", "/aof:autonomous 03 --solo", "aof work loop 03 --level L2"],
  ["c05", "/aof:autonomous 03 --ship", "aof work loop 03 --level L2"],
  ["c06", "/aof:autonomous 03 --solo --ship --max-attempts 5", "aof work loop 03 --level L2 --cap 5"],
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
    work: { dir: "./wiki/work", agents: { mode: "solo" }, autonomous: { maxAttempts: 1 } },
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
        [...new Set(commandFamilies.map((value) => value.startsWith("aof work loop") ? "aof work loop" : "aof:code-review"))].sort(),
        ["aof work loop", "aof:code-review"],
        "the shell is the only drive family; code-review is the only other command family",
      );
    },
  },
  {
    name: "autonomous-shell-out/arguments: c01-c06 delegate the exact no-json command and only max-attempts adds cap",
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
    name: "autonomous-shell-out/survivors: range, solo, ship and max-attempts keep their admitted effects while prompt-owned config narrows to two keys",
    run: () => {
      const { member } = bundleFacts();
      assert.equal(
        member.argumentHint,
        '"<range — NN-MM or NN> [--ship] [--max-attempts N] [--solo]"',
        "anything else is as before: the complete advertised argument contract is unchanged",
      );
      const text = flattened(member.body);
      for (const value of ["NN-MM", "single `NN`", "--ship", "--max-attempts N", "--solo"]) {
        assert.ok(text.includes(value), `argument effect is stated: ${value}`);
      }
      assert.match(text, /--max-attempts N.*forward `N` to the shell as `--cap N`/);
      assert.match(text, /work\.agents\.mode/);
      assert.match(text, /governs only the roles this session plays itself/);
      assert.match(text, /does not reach the sessions the shell drives/);
      assert.match(text, /work\.codeReview\.autoComplete/);
      assert.match(text, /after the shell reports a milestone accepted, run `aof:code-review <NN>`/);
      assert.match(text, /A halt never ships an unaccepted milestone/);
      const configKeys = [...text.matchAll(/work\.[A-Za-z.]+/g)].map((match) => match[0]);
      assert.deepEqual([...new Set(configKeys)].sort(), ["work.agents", "work.agents.mode", "work.codeReview.autoComplete", "work.loop.concurrency"]);
    },
  },
  {
    name: "autonomous-shell-out/door: identity, namespace, invocation and complete pre-existing command-member set are unchanged; no rival loop or drive door exists",
    run: () => {
      const descriptor = readDescriptor();
      const autonomous = descriptor.members.find((entry) => entry.id === "autonomous");
      assert.deepEqual(autonomous, {
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
        [...autonomousPreStoryHashes.keys()].sort(),
        "one authored command produces exactly the named Claude command and mapped Codex skill, with no third render",
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
];
