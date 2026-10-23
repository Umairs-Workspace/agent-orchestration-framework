import { defaultApplication as _aofApplication } from "aof/default-application";
// Fitness functions FF-16802 and FF-16803 for milestone 168 — "A PROTOTYPE STAYS LIGHT."
//
// A prototype is a top-level work item in the same numbered stream as the governed work, and it
// carries none of the governed work's weight: it is never scheduled, nothing waits on it
// (ADR-001), and it is held to its own two files and its own four status words rather than to the
// governed lifecycle (ADR-003, ADR-005), and it is built in the operator's own session (ADR-004).
//
//   FF-16802 — `isDriver` and `isDependTarget` answer false for a prototype, and `nextWork` over a
//              stream that holds only a prototype offers nothing.
//   FF-16803 — a well-formed prototype folder (PROTOTYPE.md and STATE.md, no `stories/`, `tasks/`,
//              `.feature` or VERIFICATION) passes `validateWork` and draws no doctor finding in each
//              of `active`, `paused`, `done` and `abandoned`.
//   FF-16804 — `packages/core/assets/commands/prototype.md` does not list `Agent` in `allowed-tools`,
//              and `packages/work/src/commands/prototype.mjs` imports no dispatch, worktree, lane or
//              git module (168/01 adds this leg).
//
// Both run the REAL engines over a REAL temp tree: "a prototype is clean" is a claim about the
// registered validate and doctor, not about a predicate nobody calls.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";
import { isDriver, isDependTarget } from "@aof/work/dependencies";
import { nextWork } from "@aof/work/readiness";
import { validateWork } from "@aof/work/validation";
import { PROTOTYPE_STATUS } from "@aof/work/lifecycle";

const doctorWork = _aofApplication.work.doctor.doctorWork;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const COMMAND = "packages/core/assets/commands/prototype.md";
const VERB = "packages/work/src/commands/prototype.mjs";
const FORBIDDEN_IMPORT = /dispatch|worktree|lane|(?:^|[/:])git(?:[-/.]|$)|child_process/u;

const PROTOTYPE = (status) => `---
type: prototype
number: 169
slug: csv-importer
title: "CSV importer"
status: ${status}
created: 2026-10-22
updated: 2026-10-22
schema: 1
---
# 169 · CSV importer

## Intent

Import a CSV of contacts.

## Wants

- 2026-10-22 · import a CSV of contacts

## Shortcuts

- no header detection
`;
const STATE = "---\ndoc: state\n---\n# 169 · CSV importer — State\n\n## Hand-off\n\nThe parser works.\n\n## Log\n\n- 2026-10-22 · started\n";

async function streamWith(status, run) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, "aof-prototype-light-"));
  try {
    const workDir = path.join(root, "wiki", "work");
    const dir = path.join(workDir, "169_prototype_csv-importer");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "PROTOTYPE.md"), PROTOTYPE(status));
    await writeFile(path.join(dir, "STATE.md"), STATE);
    // The files carry the fixture's own `updated:` day, so doctor's mtime check reads the same
    // stream on every day the suite runs rather than only on the day it was written.
    const written = new Date("2026-10-22T12:00:00Z");
    for (const file of ["PROTOTYPE.md", "STATE.md"]) await utimes(path.join(dir, file), written, written);
    await utimes(dir, written, written);
    await run({ root, workDir, dir });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export const archTests = [
  {
    name: "arch/FF-16802 (acd-prototype-stays-light): a prototype is neither a driver nor a depend target, and next offers nothing over a stream holding only one",
    run: async () => {
      const row = { ref: "169", number: "169", type: "prototype", slug: "csv-importer", parent: null };
      assert.equal(isDriver(row), false, "a prototype is not a driver (168/ADR-001 §2)");
      assert.equal(isDependTarget(row), false, "a prototype is not a depend target (168/ADR-001 §2)");
      // Non-vacuity: the same row shape as a chore IS both, so the predicates are being asked.
      assert.equal(isDriver({ ...row, type: "chore" }), true);
      assert.equal(isDependTarget({ ...row, type: "chore" }), true);

      await streamWith("active", async ({ workDir }) => {
        const result = await nextWork(workDir);
        assert.equal(result.state, "done", "a stream holding only a prototype has nothing to schedule");
        assert.deepEqual(result.readySet ?? [], [], "next offers no prototype");
        assert.equal(result.ref ?? null, null, "next names no item");
      });
    },
  },
  ...[...PROTOTYPE_STATUS].map((status) => ({
    name: `arch/FF-16803 (acd-prototype-stays-light): a well-formed prototype at "${status}" validates clean and draws no doctor finding`,
    run: () => streamWith(status, async ({ root, workDir, dir }) => {
      assert.deepEqual(await validateWork(workDir, {}), [], `validate is clean over a "${status}" prototype`);
      const findings = (await doctorWork(workDir, {}, undefined, { projectRoot: root }))
        .filter((finding) => String(finding.path ?? "").startsWith(dir));
      assert.deepEqual(findings, [], `doctor reports nothing on a "${status}" prototype`);
    }),
  })),
  {
    name: "arch/FF-16804 (acd-prototype-stays-light): the command lists no Agent tool and the verb imports no dispatch, worktree, lane or git module",
    run: async () => {
      const command = await readFile(path.join(repoRoot, COMMAND), "utf8");
      const tools = command.match(/^allowed-tools:\s*\[([^\]]*)\]/m);
      assert.ok(tools, `${COMMAND} declares its allowed-tools`);
      const listed = tools[1].split(",").map((tool) => tool.trim());
      assert.ok(listed.includes("Bash") && !listed.includes("Agent"), `${COMMAND} builds in the session: no Agent tool (got ${listed.join(", ")})`);

      const specifiers = importSpecifiers(stripComments(await readFile(path.join(repoRoot, VERB), "utf8")));
      assert.ok(specifiers.length > 0, `non-vacuity: ${VERB}'s imports were read`);
      const forbidden = specifiers.filter((specifier) => FORBIDDEN_IMPORT.test(specifier));
      assert.deepEqual(forbidden, [], `${VERB} builds inline (168/ADR-004 §1): no dispatch, worktree, lane or git import`);
      assert.match("../dispatch.mjs", FORBIDDEN_IMPORT, "non-vacuity: the pattern catches a dispatch import");
    },
  },
  {
    name: "arch/FF-16804 (acd-prototype-stays-light): E14/E17 — the command calls the verb for every move, carries none of the loop's machinery, and says the one main line",
    run: async () => {
      const text = await readFile(path.join(repoRoot, COMMAND), "utf8");
      for (const move of ['aof work prototype "<ask>"', 'aof work prototype <ref> ["<new ask>"]', "--stop", "--done", "--abandon", "--log"]) {
        assert.ok(text.includes(move), `${COMMAND} names the move ${move}`);
      }
      assert.match(text, /no branch and\s+no worktree, run no review lane and make no commit/, "no branch, worktree, review lane or commit");
      assert.match(text, /Spawn no agent/, "it spawns nothing");
      assert.match(text, /keep `## Shortcuts`/, "it keeps the shortcuts current");
      assert.match(text, /git branch --show-current/, "the start reads the current branch");
      assert.match(text, /If it is `main`, say once/, "on main it says so once");
      assert.match(text, /then build anyway/, "and builds whatever the branch");
    },
  },
  {
    name: "arch/FF-16803 (acd-prototype-stays-light): non-vacuity — the same prototype with a governed status word is not clean",
    run: () => streamWith("in-progress", async ({ workDir }) => {
      const findings = await validateWork(workDir, {});
      assert.equal(findings.length, 1, `exactly the status finding: ${JSON.stringify(findings)}`);
      assert.match(findings[0].problem, /active\|paused\|done\|abandoned/);
    }),
  },
];
