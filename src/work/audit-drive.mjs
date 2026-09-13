// THE AUDIT'S CONTROL DRIVER — milestone 59 / story 02, ADR-002 §3, ADR-004 §3.
//
// The evidence lane re-RUNS a fitness control instead of reading the row that certifies it, and
// 66/ADR-004 §2 forbids doing that inside the aof process ("importing executes its module scope").
// So the import happens HERE, in a child the family starts through `src/work-audit/spawn.mjs`'s
// one bounded seam, and never by an `import()` anywhere under `src/work-audit/`.
//
// ── WHY THIS IS NOT `node --test <control>` ──────────────────────────────────────────────────
//
// Because that is a SILENT FALSE PASS in this repository and spike 56 measured exactly how big:
// a `node --test` sweep over all drivable suites reports "# tests 883, pass 883, fail 0", and
// 862 of 864 files report exactly one test — the wrapper — so none of the tree's 7,145 test
// entries executes. Thirty-two suites read GREEN that way while being RED when driven by import.
// An evidence lane built on that oracle would confirm every recorded row it was asked about,
// which is the one outcome this milestone exists to make impossible.
//
// This repository's suites register by exporting an array of `{ name, run }`. DRIVING one means
// importing the module and calling every `run` — the shape `scripts/test.mjs` itself uses.
//
// ── WHY IT IS NOT A MODE OF `scripts/test.mjs` ───────────────────────────────────────────────
//
// CORRECTED AT REVIEW (2026-08-30), because the first version of this header gave the wrong
// reason and the wrong number, and milestone 77 inherits this file as the record of why the
// command is shaped the way it is.
//
// What it said: evaluating the runner's module graph costs 47 s, so a `scripts/test.mjs` mode
// would blow the seam's 60 s deadline. The 47 s was real but it was a COLD first run on a fresh
// worktree, measured once. Re-measured warm, four times:
// `node src/work/audit-probe.mjs scripts/test.mjs` takes 3179 / 3051 / 3132 / 3118 ms — about 5%
// of the deadline, not 78%. Cost is a reason to prefer this program (driving one control here
// takes 67-216 ms, so the runner's graph would be a 15-45x tax per row) but it is NOT the reason
// the mode is refused.
//
// THE REASON IT IS REFUSED IS CROSS-CONTAMINATION. `scripts/test.mjs` statically imports ~880
// suite modules, so a mode of it would evaluate 880 module SCOPES into the very process that then
// drives one control — module-level state, registered handles, warmed caches and any top-level
// side effect, all live around the control under test. That is precisely what the per-case
// isolation below exists to prevent, and an audit whose oracle is a failure message cannot afford
// a message produced by a neighbour. This program imports the ONE control it was given and
// nothing else.
//
// ── WHY IT IS NOT UNDER `src/work-audit/` ────────────────────────────────────────────────────
//
// FF-5904 freezes that directory: no dynamic import, no require, no static import of a path
// outside `src/`. This program's whole job is a dynamic import of a path outside `src/`. It lives
// beside the family, as a PROGRAM the family spawns rather than a module the family loads —
// `src/work/audit-probe.mjs`'s own reasoning, one story on.
//
// ── AND WHY IT MOVED HERE FROM `scripts/` (milestone 77 / story 04, ADR-002 §2) ──────────────
//
// It used to live at `scripts/drive-control.mjs`, and that is what made `aof work audit --strict`
// fail in every governed project. The evidence lane resolved this program against the AUDITED
// root, so anywhere but this checkout it named a file that was never going to be there. Deriving a
// toolkit root is only half the fix and TECH_DEBT 72's own prescription stopped there: the payload
// is a copy of `src/` and carries no `scripts/` directory at all, so a root derived from a module's
// URL still points at a directory this program was never copied into. It had to move to where the
// copy goes.
//
// The move closes an enumeration hole as a side effect. FF-5904 clause (E) skips a named `.mjs`
// path that does not resolve under `src/` — on the sound ground that the runner the census points a
// child at is an arbitrary SUBJECT — so a program under `scripts/` was enumerated by nobody: it
// could start children of its own, be imported by the family, or vanish, with the gate green
// through all three. Under `src/` it is inside that discovery and is named in `SPAWNED_PROGRAMS`.
//
// ── ISOLATION IS PER CASE, AND THAT IS A MEASUREMENT, NOT A HABIT ────────────────────────────
//
// Spike 56, Lane B: "`scripts/test.mjs` sets a fresh `AOF_GLOBAL_HOME` PER TEST; item 27's
// documented focused-run recipe sets one per FILE. Per-file isolation produced 13 FALSE REDS."
// An audit whose oracle is the failure message cannot afford thirteen manufactured messages, so
// this driver reproduces the sanctioned per-case isolation exactly, rooted under `~/.aof-test`
// (never `~/.aof`, the real machine's global home) like the runner it mirrors.
//
// CONTRACT — one sentinel-prefixed line of JSON on stdout, so a control that prints is not
// mistaken for the answer and a truncated read is detectable rather than silently partial:
//
//   node src/work/audit-drive.mjs <control-path>
//     -> AOF_DRIVE_RESULT {"ok":true,"control":"<abs>","cases":[{name,ok,message}],"count":N}
//        exit 0 — THE CONTROL WAS DRIVEN. Whether its cases passed is in the cases, never in the
//        exit code: "it failed" and "it could not be run" are two findings and this program does
//        not conflate them.
//     -> AOF_DRIVE_RESULT {"ok":false,"control":"<abs>","error":"…"}
//        exit 1 — the control could NOT be driven.
//
// `count` is the number of cases that ACTUALLY EXECUTED, appended as each one finishes. It is
// never the length of an array read from the file's text, because a register's recorded size is
// compared against it (03_the-count-recorded-is-the-count-observed.feature).
import os from "node:os";
import path from "node:path";
import { rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

// ONE HOME FOR THE SENTINEL, AND IT CANNOT BE IMPORTED ACROSS THE SEAM. `src/work-audit/`
// may not statically import a path outside `src/` (FF-5904), so the consumer holds its own
// copy and `test/arch/grade/acd-evidence-oracle-is-a-message.test.mjs` asserts the two are
// byte-identical — the answer 66/F-42 reached for `RED_PROBE_PLACEHOLDER` across the
// JS/markdown seam, applied to a JS/JS seam a structural rule keeps apart.
// NOT EXPORTED, and that is 77/04's own consequence rather than tidiness. Nothing can import this
// copy — the family may not (FF-5904) and a test that did would execute the program — so the
// `export` bought nothing and cost something once this file moved under `src/`: 77/02's seam rule
// reports a module that exports a name the code graph gives no dependent, and its one DERIVED
// suppression is that a file exporting NOTHING is a program rather than a seam. A program that
// exports one unimportable constant is precisely the shape that rule would report and be wrong
// about, so the program stops exporting it. The byte-identity claim against the lane's copy is
// unchanged and still asserted at `test/arch/grade/acd-evidence-oracle-is-a-message.test.mjs`.
const DRIVE_RESULT_SENTINEL = "AOF_DRIVE_RESULT ";

// A control is DRIVABLE when it exports an array of `{ name, run() }`. Stricter than
// `src/work/audit-probe.mjs`'s shape check, which only needs a name to report: this program has
// to CALL something, so an entry with no `run` is not a case it can execute.
function isDrivable(value) {
  return Array.isArray(value)
    && value.length > 0
    && value.every((entry) => entry != null && typeof entry === "object" && typeof entry.name === "string" && typeof entry.run === "function");
}

const EXPORTED_ARRAY_KEYS = ["archTests", "tests", "default"];

function drivableFrom(module) {
  for (const key of EXPORTED_ARRAY_KEYS) {
    if (isDrivable(module?.[key])) return module[key];
  }
  for (const value of Object.values(module ?? {})) {
    if (isDrivable(value)) return value;
  }
  return null;
}

// The message a failed case produced, never a tally of how many did.
function messageOf(error) {
  if (error == null) return "the case failed and produced no message";
  const text = typeof error === "string" ? error : (error.message ?? String(error));
  const trimmed = String(text).trim();
  return trimmed === "" ? "the case failed and produced no message" : trimmed;
}

function emit(payload) {
  process.stdout.write(`${DRIVE_RESULT_SENTINEL}${JSON.stringify(payload)}\n`);
}

async function main() {
  const target = process.argv[2];
  if (typeof target !== "string" || target.length === 0) {
    emit({ ok: false, control: null, error: "no control path was given — usage: node src/work/audit-drive.mjs <control-path>" });
    process.exitCode = 1;
    return;
  }
  const control = path.resolve(target);

  let module;
  try {
    module = await import(pathToFileURL(control).href);
  } catch (error) {
    emit({ ok: false, control, error: `the control could not be loaded: ${messageOf(error)}` });
    process.exitCode = 1;
    return;
  }

  const drivable = drivableFrom(module);
  if (drivable == null) {
    emit({
      ok: false,
      control,
      error: "the control exports no drivable array of { name, run() } entries — it cannot be re-run, and a control that cannot be re-run is reported rather than assumed green",
    });
    process.exitCode = 1;
    return;
  }

  // Per-case hermetic global home, exactly as `scripts/test.mjs` does it (34/story 00), for the
  // reason spike 56 measured: per-FILE isolation manufactures failures that are not the
  // control's, and a lane whose oracle is the message must not read thirteen invented ones.
  const homeRoot = path.join(os.homedir(), ".aof-test", `drive-${process.pid}`);
  const previousHome = process.env.AOF_GLOBAL_HOME;
  const cases = [];
  let index = 0;
  for (const entry of drivable) {
    process.env.AOF_GLOBAL_HOME = path.join(homeRoot, `c-${index}`);
    index += 1;
    try {
      await entry.run();
      cases.push({ name: entry.name, ok: true, message: null });
    } catch (error) {
      cases.push({ name: entry.name, ok: false, message: messageOf(error) });
    }
  }
  if (previousHome === undefined) delete process.env.AOF_GLOBAL_HOME;
  else process.env.AOF_GLOBAL_HOME = previousHome;
  try {
    rmSync(homeRoot, { recursive: true, force: true });
  } catch (error) {
    // Best-effort cleanup, REPORTED rather than swallowed. The drive's verdict never depends on
    // it, and a cleanup failure is not a control failure — conflating the two is the species this
    // whole lane refuses. But saying NOTHING is the other species, and moving this program under
    // `src/` (77/04) brought it inside `arch/m42-item-3`'s census, where an empty catch is a NEW
    // silent catch against a baseline of zero. So the fault is emitted, and the channel is forced:
    // stdout carries the sentinel-prefixed result line and NOTHING else — a second line there
    // would corrupt the seam's one-line protocol — while stderr is already the channel
    // `evidence.mjs` reads back when a drive fails. One coded line, on the only channel open to it.
    process.stderr.write(`AOF_DRIVE_CLEANUP_FAILED ${homeRoot}: ${error?.message ?? String(error)}\n`);
  }

  // `count` is what RAN. `cases` is built by appending one entry per executed case above, so it
  // cannot drift from the file's declared shape without the run itself changing.
  emit({ ok: true, control, cases, count: cases.length });
}

const invokedDirectly = process.argv[1] != null && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  await main();
}
