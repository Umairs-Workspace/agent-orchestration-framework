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

import { buildSnapshot } from "../../../src/work/doctor.mjs";
import { controlGroup } from "../../../src/work/doctor-controls.mjs";
import { readRenameMap } from "../../../src/commands/doctor.mjs";

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
async function withRenamedControl(rows, run, { status = "done" } = {}) {
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

    const renameMap = await readRenameMap(root);
    const snapshot = await buildSnapshot(workDir, { projectRoot: root, renameMap });
    return await run({ root, snapshot, renameMap, findings: controlGroup(snapshot, {}) });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const unresolved = (findings) => findings.filter((finding) => finding.code === "control-unresolved");

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
];
