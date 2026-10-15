import { createDoctorServices } from "./support/doctor-services.mjs";
const _aofDoctor = createDoctorServices();
// 119/00 task 02 — `control-unresolved` keeps its exact meaning, end to end.
//
// The finding says "this register declares a control that does not exist". Before 119 it also said
// "somebody moved a file", because the probe was a bare `stat` at HEAD — and the registers that
// carry these citations belong to DONE items, where a delivered record is immutable and a `pending`
// marker is not admitted. A story that moves `test/arch/**` therefore left permanent findings that
// no legal edit could clear, which is why the moves in 119/01–119/04 were not admitted until this
// landed (119/ADR-004).
//
// Driven over a REAL git repository with a REAL recorded rename, through the shipped
// `readRenameMap` -> `buildSnapshot` -> `controlGroup` path. A fixture map would prove the plumbing
// and not the claim: the claim is that git's own history is what answers.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const buildSnapshot = _aofDoctor.buildSnapshot;
import { controlGroup } from "@aof/work/audit/controls";
import { createDoctorCommand } from "@aof/work/commands/doctor";
const readRenameMap = _aofDoctor.readRenameMap;

const execFileAsync = promisify(execFile);

const OLD_CONTROL = "test/arch/acd-fixture-old-name.test.mjs";
const NEW_CONTROL = "test/arch/acd-fixture-new-name.test.mjs";
const NEVER_EXISTED = "test/arch/acd-fixture-never-existed.test.mjs";

function register(rows) {
  return [
    "---",
    "doc: architecture",
    "---",
    "# fixture",
    "",
    "## Fitness functions",
    "",
    "| id | invariant | enforced by (arch-test) | from |",
    "|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

function spec(status) {
  return ["---", "type: milestone", "number: 01", "slug: fixture", `status: ${status}`, "schema: 1", "---", "# 01 · fixture", ""].join("\n");
}

// A checkout whose history records ONE rename, built rather than mocked.
// `history: false` hands over the bare checkout, its history never read: the edge memoizes a `log`
// answer per checkout and HEAD for the process, so a case that counts the walks must make the first read.
async function withRenamedControl(rows, run, { status = "done", history = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-doctor-rename-"));
  try {
    const git = async (...args) => execFileAsync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
    await git("init", "-q");
    await git("config", "user.email", "probe@example.invalid");
    await git("config", "user.name", "probe");
    await mkdir(path.join(root, "test", "arch"), { recursive: true });
    await writeFile(path.join(root, OLD_CONTROL), "export const archTests = [];\n", "utf8");
    await git("add", "-A");
    await git("commit", "-qm", "seed the control at its original path");
    await git("mv", OLD_CONTROL, NEW_CONTROL);
    await git("commit", "-qm", "move the control");

    const workDir = path.join(root, "wiki", "work");
    const itemDir = path.join(workDir, "01_milestone_fixture");
    await mkdir(itemDir, { recursive: true });
    await writeFile(path.join(itemDir, "SPEC.md"), spec(status), "utf8");
    await writeFile(path.join(itemDir, "ARCHITECTURE.md"), register(rows), "utf8");

    if (!history) return await run({ root, workDir });
    const renameMap = await readRenameMap(root).load();
    const snapshot = await buildSnapshot(workDir, { projectRoot: root, renameMap });
    return await run({ root, snapshot, renameMap, findings: controlGroup(snapshot, {}) });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const unresolved = (findings) => findings.filter((finding) => finding.code === "control-unresolved");

// The shipped history edge with its git port wrapped in a counter: every argv it spawns is recorded.
function countedHistory() {
  const calls = [];
  const { readRenameMap: read } = createDoctorCommand({
    execFileAsync: (file, args, options) => {
      calls.push(args);
      return execFileAsync(file, args, options);
    },
  });
  return { calls, readRenameMap: read };
}

export const workDoctorTests = [
  {
    name: "119/00 task02 — a register citing a control the repository RENAMED reports no finding, and the citation is never edited",
    run: async () => {
      await withRenamedControl([`| FF-0101 | an invariant | \`${OLD_CONTROL}\` | ADR-001 |`], ({ snapshot, findings, renameMap }) => {
        assert.ok(renameMap.size > 0, `the map is derived from git's own records and is non-empty (${renameMap.size})`);
        assert.equal(renameMap.get(OLD_CONTROL), NEW_CONTROL, "…and it really records THIS rename, so an empty map cannot read as a pass");
        assert.equal(snapshot.controlProbes[OLD_CONTROL], true, "the probe resolved the cited path through history");
        assert.deepEqual(unresolved(findings), [], "no finding: the control exists, it simply moved");
      });
    },
  },

  {
    name: "119/00 task02 — a control file that exists at HEAD reports no finding, and history is not consulted for it",
    run: async () => {
      await withRenamedControl([`| FF-0101 | an invariant | \`${NEW_CONTROL}\` | ADR-001 |`], ({ snapshot, findings }) => {
        assert.equal(snapshot.controlProbes[NEW_CONTROL], true, "leg A answered — the first branch is still the stat at HEAD");
        assert.deepEqual(unresolved(findings), [], "no finding");
      });
    },
  },

  {
    name: "119/00 task02 — `control-unresolved` still reports a control that NEVER existed, and stops meaning `somebody moved a file`",
    run: async () => {
      await withRenamedControl(
        [
          `| FF-0101 | a moved control | \`${OLD_CONTROL}\` | ADR-001 |`,
          `| FF-0102 | a control nobody wrote | \`${NEVER_EXISTED}\` | ADR-001 |`,
        ],
        ({ findings }) => {
          const reported = unresolved(findings);
          assert.equal(reported.length, 1, `exactly one finding: ${reported.map((f) => f.message).join(" | ")}`);
          assert.match(reported[0].message, /FF-0102/u, "…and it is the citation to the path that never existed");
          assert.match(reported[0].message, new RegExp(NEVER_EXISTED.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), "the finding names the path it could not resolve");
          assert.equal(reported.some((f) => f.message.includes("FF-0101")), false, "the moved control is NOT reported — that is the whole ruling");
        },
      );
    },
  },

  {
    name: "119/00 task02 — a control DELETED with no rename record still reports, and a register citing no path at all still reports",
    run: async () => {
      await withRenamedControl([`| FF-0101 | an invariant | \`test/arch/acd-fixture-deleted.test.mjs\` | ADR-001 |`], ({ findings }) => {
        assert.equal(unresolved(findings).length, 1, "a deleted control with no rename record is unresolved");
      });
      await withRenamedControl([`| FF-0101 | an invariant | enforced by review | ADR-001 |`], ({ findings }) => {
        const reported = unresolved(findings);
        assert.equal(reported.length, 1, "a declaration naming no path at all is unresolved");
        assert.match(reported[0].message, /declares no control path/u);
      });
    },
  },

  {
    name: "119/00 task02 — the fall-through is a fall-through: with NO rename map the probe answers exactly what leg A alone answered",
    run: async () => {
      await withRenamedControl([`| FF-0101 | an invariant | \`${OLD_CONTROL}\` | ADR-001 |`], async ({ root }) => {
        const workDir = path.join(root, "wiki", "work");
        const withoutHistory = await buildSnapshot(workDir, { projectRoot: root });
        assert.equal(withoutHistory.controlProbes[OLD_CONTROL], false, "a snapshot built without history resolves nothing through it");
        assert.equal(unresolved(controlGroup(withoutHistory, {})).length, 1, "…and reports exactly the finding it reported before 119");
        assert.equal(withoutHistory.renameMap, null, "the snapshot carries the map it was handed, and nothing it read itself");
      });
    },
  },
  // 160/06 task 00 — history is a LAZY source (160/ADR-007). The loader is driven through the shipped
  // `createDoctorCommand` edge with its git port wrapped in a counter, over the same built checkout.
  {
    name: "160/06 task00 Building the loader runs nothing",
    run: async () => {
      await withRenamedControl([`| FF-0101 | an invariant | \`${NEW_CONTROL}\` | ADR-001 |`], async ({ root }) => {
        const counted = countedHistory();
        const loader = counted.readRenameMap(root);
        assert.equal(typeof loader?.load, "function", "readRenameMap answers a loader for a checkout");
        assert.deepEqual(counted.calls, [], "no git process was started by building it");
        assert.equal(counted.readRenameMap(null), null, "…and no project root is still no history at all");
      }, { history: false });
    },
  },

  {
    name: "160/06 task00 Loading twice reads history once",
    run: async () => {
      await withRenamedControl([`| FF-0101 | an invariant | \`${NEW_CONTROL}\` | ADR-001 |`], async ({ root }) => {
        const counted = countedHistory();
        const loader = counted.readRenameMap(root);
        const [first, second] = [await loader.load(), await loader.load()];
        const ran = (test) => counted.calls.filter(test).length;
        assert.equal(ran((args) => args[0] === "log" && args.includes("--diff-filter=R")), 1, "the rename log walk ran once");
        assert.equal(ran((args) => args[0] === "log" && args.includes("--diff-filter=D")), 1, "the deleted-source log walk ran once");
        assert.equal(ran((args) => args[0] === "diff"), 1, "the working-tree diff ran once");
        assert.equal(first, second, "both calls answer the same map");
        assert.equal(first.get(OLD_CONTROL), NEW_CONTROL, "…and it is the map history records");
      }, { history: false });
    },
  },

  {
    name: "160/06 task00 FF-16007 the snapshot loads history only on a miss, and at most once",
    run: async () => {
      const both = [`| FF-0101 | an invariant | \`${OLD_CONTROL}\` | ADR-001 |`, `| FF-0102 | another | \`test/arch/acd-fixture-also-old.test.mjs\` | ADR-001 |`];
      await withRenamedControl(both, async ({ root }) => {
        const workDir = path.join(root, "wiki", "work");
        const loads = [];
        const history = { load: async () => { loads.push(1); return readRenameMap(root).load(); } };
        const snapshot = await buildSnapshot(workDir, { projectRoot: root, history });
        assert.equal(loads.length, 1, "two misses load history once");
        assert.equal(snapshot.controlProbes[OLD_CONTROL], true, "…and the renamed control resolves through it");
        assert.equal(snapshot.controlProbes["test/arch/acd-fixture-also-old.test.mjs"], false, "…while a path history never recorded stays a miss");
        assert.equal(snapshot.renameMap?.get(OLD_CONTROL), NEW_CONTROL, "the snapshot carries the map it loaded");
      }, { history: false });
      await withRenamedControl([`| FF-0101 | an invariant | \`${NEW_CONTROL}\` | ADR-001 |`], async ({ root }) => {
        const loads = [];
        const snapshot = await buildSnapshot(path.join(root, "wiki", "work"), { projectRoot: root, history: { load: async () => { loads.push(1); return new Map(); } } });
        assert.deepEqual(loads, [], "a register whose every control exists never loads history");
        assert.equal(snapshot.renameMap, null, "…and the snapshot then carries no map");
      }, { history: false });
    },
  },
];
