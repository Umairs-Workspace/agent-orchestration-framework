// test/support/evidence-control-fixture.mjs — the shared fixture repository for milestone 59 /
// story 02's two suites: `test/grade/evidence-re-run.test.mjs` (the four task features) and
// `test/arch/grade/acd-evidence-oracle-is-a-message.test.mjs` (FF-5906).
//
// LIFTED HERE AT REVIEW (2026-08-30), because the two suites had each written their own copy and
// THE COPIES HAD ALREADY DIVERGED: `test/arch/green.test.mjs` was two cases in one and three in
// the other, so a size assertion written against one copy was silently about a different control
// in the other. That is the shape this repository keeps its shared fixtures in `test/support/` to
// avoid, and it is a particularly poor one to ship inside the milestone whose subject is
// instruments that quietly stop measuring what they claim.
//
// WHAT THIS IS FOR. The evidence lane's subject is EXECUTION: it resolves a cited control, starts
// a bounded child, and reads the failure message that child produced. So every case needs the same
// two things — a throwaway repository root, and a set of controls in this repository's own
// `{ name, run }` shape whose behaviour is known exactly. That is all this module does.
//
// IT USED TO NEED A THIRD (77/04, ADR-002 §2a): a real copy of the shipped driver planted at the
// path `DRIVE_PROGRAM` resolved INSIDE the fixture repository, because the lane resolved its own
// program against the AUDITED root. That arrangement is the defect 77/04 fixes, so the copy is
// gone and its absence is what proves the change: the driver now comes from the toolkit root, and
// a real one still runs.
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const NL = String.fromCharCode(10);

// THE CONTROL CORPUS. Written as TEXT rather than generated, so what a suite asserts about a
// control's size or message is checkable by reading the fixture — and so the one place they are
// defined is the one place they can change.
//
// The pair that carries `01_the-oracle-is-the-message.feature` is `red-a` / `red-b`: identical in
// SHAPE (two cases, one passing, one failing) and different only in the message. A pass/fail
// counter reads (1, 1) on both and reports that nothing happened.
export const CONTROL_SOURCES = Object.freeze({
  // THREE cases, all passing.
  "test/arch/green.test.mjs": [
    "export const archTests = [",
    '  { name: "green one", run: () => {} },',
    '  { name: "green two", run: () => {} },',
    '  { name: "green three", run: () => {} },',
    "];",
  ].join(NL),

  // TWO cases, ONE failing — the plain standing-red control.
  "test/arch/red.test.mjs": [
    'import assert from "node:assert/strict";',
    "export const archTests = [",
    '  { name: "a", run: () => {} },',
    '  { name: "b", run: () => { assert.fail("the invariant no longer holds"); } },',
    "];",
  ].join(NL),

  // TWO cases, ONE failing. Tally: (1 passing, 1 failing).
  "test/arch/red-a.test.mjs": [
    'import assert from "node:assert/strict";',
    "export const archTests = [",
    '  { name: "red a holds", run: () => { assert.ok(true); } },',
    '  { name: "red a breaks", run: () => { assert.fail("the gate is red for reason A"); } },',
    "];",
  ].join(NL),

  // The SAME tally as red-a and a DIFFERENT message.
  "test/arch/red-b.test.mjs": [
    'import assert from "node:assert/strict";',
    "export const archTests = [",
    '  { name: "red a holds", run: () => { assert.ok(true); } },',
    '  { name: "red a breaks", run: () => { assert.fail("the gate is red for reason B"); } },',
    "];",
  ].join(NL),

  // The same failure MOVED: a Windows separator and a shifted line number.
  "test/arch/red-moved.test.mjs": [
    'import assert from "node:assert/strict";',
    "export const archTests = [",
    '  { name: "red a breaks", run: () => { assert.fail("expected src\\\\work.mjs:412 to hold"); } },',
    "];",
  ].join(NL),

  // A control that never finishes inside any sane deadline.
  "test/arch/slow.test.mjs": [
    "export const archTests = [",
    '  { name: "slow one", run: () => new Promise((resolve) => { setTimeout(resolve, 30000); }) },',
    "];",
  ].join(NL),

  // DECLARED FOUR, EXECUTES TWO. The file's text names four cases; the run produces two.
  "test/arch/sized.test.mjs": [
    "const declared = [",
    '  { name: "sized one", run: () => {} },',
    '  { name: "sized two", run: () => {} },',
    '  { name: "sized three", run: () => {} },',
    '  { name: "sized four", run: () => {} },',
    "];",
    "export const archTests = declared.slice(0, 2);",
  ].join(NL),

  // On disk and green — the subject of the lane that asks whether any runner assembles it.
  "test/arch/unassembled.test.mjs": [
    "export const archTests = [",
    '  { name: "unassembled one", run: () => {} },',
    "];",
  ].join(NL),
});

// The number of cases each control EXECUTES, named here so a suite asserting an observed size does
// not restate a number the corpus above owns — the divergence that made this module necessary.
// `sized` is deliberately not its text's four.
export const EXECUTED_CASES = Object.freeze({
  "test/arch/green.test.mjs": 3,
  "test/arch/red.test.mjs": 2,
  "test/arch/red-a.test.mjs": 2,
  "test/arch/red-b.test.mjs": 2,
  "test/arch/red-moved.test.mjs": 1,
  "test/arch/sized.test.mjs": 2,
  "test/arch/unassembled.test.mjs": 1,
});

// A throwaway repository holding the corpus and a real copy of the shipped driver. Removed on the
// way out even when the body throws.
export async function withControlFixtureRepo(body) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-evidence-"));
  try {
    // NO DRIVER IS PLANTED HERE, and that absence is the proof (77/ADR-002 §2a). It used to copy
    // the shipped driver to the path `DRIVE_PROGRAM` resolved INSIDE this fixture repository,
    // because the lane resolved its program against the audited root — which is exactly the defect
    // 77/04 fixes. Now the driver comes from the TOOLKIT root, so a fixture repository with no
    // driver in it is the honest test, and the fixture's purpose is preserved exactly as written:
    // a real driver runs, never a stand-in — it is simply the shipped one, where it is installed.
    await mkdir(path.join(dir, "test", "arch"), { recursive: true });
    for (const [rel, source] of Object.entries(CONTROL_SOURCES)) {
      await writeFile(path.join(dir, rel), `${source}${NL}`, "utf8");
    }
    return await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
