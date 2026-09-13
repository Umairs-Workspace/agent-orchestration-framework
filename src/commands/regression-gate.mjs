// `aof work regression-gate <ref>` — THE GATE RUN (milestone 96 / story 04, ADR-008 §1, §2).
// FF-9606 is its control.
//
// THIS IS NOT A NEW TEST RUN. `aof test --scope all` already computes the gate boolean
// (`scope === "all" && widened.length === 0`, `src/commands/test.mjs`) and then discards it. This
// verb composes that same command body, records what it proved, and hands the door in
// `src/commands/item-status.mjs` something durable to read. Two seams already existed and this
// story rebuilds neither: the run is `runTest`'s, and the document's shape is
// `src/regression-record.mjs`'s.
//
// IT REFUSES A TREE IT CANNOT TRUST, AND THAT IS THE POINT OF THE VERB (ADR-008 §2). A downstream
// retrospective records two agents red-probing on one checkout and getting silently unreliable
// results; another records worktrees isolating source but not derived artefacts, the database or the
// git index. A gate that runs inside whichever lane happens to hold the tree measures that lane, not
// the milestone — so a dirty checkout is a coded refusal naming what is dirty, and the row names the
// commit the run actually ran against.
//
// THE GIT READS ARE THIS MODULE'S OWN, AND `laneChanges` IS DELIBERATELY NOT REUSED. That helper
// exists for the sweep, where a git fault must not delete a lane, so it swallows a non-zero status
// and answers `[]` — which HERE would render a broken git as a clean tree and let the gate run
// against a checkout nobody measured. Same command, opposite failure direction: this one fails
// CLOSED. The seam is injected all the same, so every row of the contract drives without a
// repository.
//
// THE RECORD'S OWN FILE IS EXCLUDED FROM THE DIRTINESS READ, and it has to be: the gate WRITES
// `REGRESSION.md` as its last act, so a second run would find the tree dirty because of the first
// run's evidence and refuse forever. A gate blocked by its own output is a gate that gets deleted.
// Nothing else is excluded — an untracked file under a source root can change what the suite
// contains, which is exactly the tree state this verb exists to refuse.
//
// PURE OVER ITS SEAMS, in `runTest`'s own idiom: every impure edge is injected and defaults to the
// shipped one, so each row of the contract drives without a repository or a child process and the
// SAME code path runs in production. `deps` is deliberately not part of the input schema — a seam is
// not something a caller of the CLI gets to choose.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 96 / story 04 (ADR-008 §1, §2) — THE REGRESSION GATE'S RUN, the other half of the
//   door `work:status` above now holds. It composes the existing `aof test --scope all` body, refuses a
//   dirty checkout, and appends the run to the milestone's own `REGRESSION.md` — durability over a
//   boolean the test command already computed and discarded.
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";

import { commandError } from "../command-error.mjs";
import { writeText } from "../fs.mjs";
import { headCommit } from "../mesh/worktree.mjs";
import {
  COMMIT_UNKNOWN,
  GATE_SCOPE,
  appendRegressionRow,
  detailCell,
  gateInstant,
  regressionRecordPath,
  satisfiesDoor,
  scopeCell,
} from "../regression-record.mjs";
import { requireLocalCheckout, resolveItemExact } from "./resolve.mjs";
import { runTest } from "./test.mjs";

// THE VERB'S OWN REFUSAL, and the only one it adds: commit your work, or run the gate somewhere
// clean. It is not a test result, so nothing is recorded — a row is written only for a run that
// actually happened. The second refusal it can raise, `COMMIT_UNKNOWN`, belongs to the RECORD (both
// writers meet the same fact), so it is imported from there rather than spelled — or re-exported —
// a second time here.
export const DIRTY_TREE = "regression-gate-dirty-tree";

// ── THE GIT SEAM ─────────────────────────────────────────────────────────────────────────────

function defaultGit(args, { cwd, timeoutMs = 30000 } = {}) {
  return new Promise((resolve) => {
    execFile("git", args, { cwd, timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) =>
      resolve({
        stdout: String(stdout ?? ""),
        stderr: String(stderr ?? ""),
        status: error ? (typeof error.code === "number" ? error.code : 1) : 0,
      }));
  });
}

const posix = (value) => String(value).split(path.sep).join("/");

// Every path `git status --porcelain` reports, forward-slashed on every platform. A non-zero status
// — or a throw — is NOT an empty list here: it is `null`, and the caller refuses on it.
async function dirtyPaths(git, cwd) {
  let result;
  try {
    result = await git(["status", "--porcelain"], { cwd });
  } catch {
    return null;
  }
  if (result?.status !== 0) return null;
  return String(result.stdout ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    // porcelain v1: `XY <path>`, and a rename is `XY <old> -> <new>` — the NEW path is the one the
    // tree now holds. `??` marks an untracked file, which counts: a new suite file changes what the
    // run contains, and a gate that ignored it would be measuring a tree it did not have.
    .map((line) => line.slice(2).trim().split(" -> ").pop().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

// ── THE BODY ─────────────────────────────────────────────────────────────────────────────────

/**
 * Run the gate for one item and append its row.
 *
 *   input — `{ ref, now }`; `now` (ISO-8601 UTC-Z) is the established injected clock, never a flag
 *   deps  — `{ projectRoot, config, resolve, git, runSuite, read, write }`, every one defaulted to
 *           the shipped seam by the command below
 *
 * The order is load-bearing: the tree is checked BEFORE the commit is resolved and the commit
 * BEFORE the suite runs, so the hash the row names and the state the suite saw are one fact, and a
 * refusal costs nothing rather than a whole suite.
 */
export async function runRegressionGate(input, deps = {}) {
  const {
    projectRoot,
    config,
    resolve,
    git = defaultGit,
    runSuite = runTest,
    read = readFile,
    write = writeText,
  } = deps;

  const ref = typeof input?.ref === "string" ? input.ref.trim() : "";
  if (ref === "") throw commandError("A work ref is required.", "missing-ref", 400);

  // THE EXACT RESOLVER, and the local-checkout refusal behind it. A gate is evidence about a tree
  // this node holds; a ref answered from the mesh cache names a folder that is not here, and there
  // is no honest way to record a run against a checkout you do not have.
  const item = await resolve(ref);
  if (!item) throw commandError(`No item resolves to ref "${ref}".`, "ref-not-found", 404);
  requireLocalCheckout(item, ref);

  const target = regressionRecordPath(item.dir);
  const ownPath = posix(path.relative(projectRoot, target));

  // (1) THE TREE, BEFORE ANYTHING ELSE.
  const dirty = await dirtyPaths(git, projectRoot);
  if (dirty == null) {
    throw commandError(
      `The regression gate could not read the state of ${projectRoot} — \`git status\` did not answer, so this checkout cannot be shown to be clean. A gate that ran here would be measuring a tree nobody measured.`,
      DIRTY_TREE,
      409,
    );
  }
  const offending = dirty.filter((file) => file !== ownPath);
  if (offending.length > 0) {
    const error = commandError(
      `The regression gate refuses a dirty checkout: ${offending.join(", ")}. `
        + "The gate runs where nothing else is writing (ADR-008 §2) — a run inside whichever lane "
        + "happens to hold the tree measures that lane, not the milestone. Commit or stash the "
        + "above, or run the gate in a clean checkout.",
      DIRTY_TREE,
      409,
    );
    error.detail = { ref: item.ref, dirty: offending };
    throw error;
  }

  // (2) THE COMMIT THE ROW WILL NAME, from the tree just shown to be clean.
  // `headCommit` is the SHIPPED read (`src/mesh/worktree.mjs`) — the same one the control side
  // stamps onto every dispatched directive, over the same injected exec seam. Its `null` on a fault
  // is exactly the answer this door wants: a checkout that cannot name its HEAD cannot produce a
  // readable row, so there is nothing here to soften.
  const commit = await headCommit(projectRoot, { exec: git });
  if (commit == null) {
    throw commandError(
      `The regression gate could not resolve HEAD in ${projectRoot}, so a run here could not name the commit it ran against — and a row without a commit is a row the record refuses to read back.`,
      COMMIT_UNKNOWN,
      409,
    );
  }

  // (3) THE RUN — the shipped command body, asked for the whole tree. Nothing about the selection is
  // re-decided here; `scope` and `widened` come back as `aof test` computed them.
  const outcome = await runSuite({ scope: GATE_SCOPE }, { projectRoot, config, resolveStory: resolve });

  // (4) THE ROW. A refusal from the run is recorded as RED rather than swallowed: the suite did not
  // answer, and "the toolchain is undeclared" is a thing the milestone's history should carry.
  const failures = outcome.report?.failures ?? [];
  const green = outcome.refusal == null && outcome.exit === 0 && failures.length === 0;
  const row = {
    commit,
    instant: gateInstant(input?.now),
    scope: scopeCell({ scope: outcome.scope, widened: outcome.widened ?? [] }),
    result: green ? "green" : "red",
    detail: green ? null : detailCell(failureDetail(outcome, failures)),
  };

  // (5) THE APPEND — read-modify-write through the atomic seam. A malformed existing document stops
  // the write with its own coded refusal rather than being overwritten: the repair is by hand, and a
  // writer that truncated past it would destroy the history it exists to keep.
  let existing = null;
  try {
    existing = await read(target, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await write(target, appendRegressionRow(existing, row, displayPath(target)));

  return Object.freeze({
    ref: item.ref,
    path: target,
    commit: row.commit,
    instant: row.instant,
    scope: row.scope,
    result: row.result,
    detail: row.detail,
    // The DOOR's own predicate, reported rather than re-derived by the caller — so an operator can
    // see, in this run's own output, whether the row it just wrote will satisfy the accept door.
    satisfiesDoor: satisfiesDoor(row),
    appended: true,
    exit: green ? 0 : 1,
  });
}

function failureDetail(outcome, failures) {
  if (outcome.refusal != null) return `${outcome.refusal.code}: ${outcome.refusal.message}`;
  if (failures.length > 0) return failures.map((failure) => failure.case).join(", ");
  return `the runner exited ${outcome.runner?.exitCode ?? "with no verdict"} and enumerated no failure`;
}

// ── THE COMMAND ──────────────────────────────────────────────────────────────────────────────

export const regressionGateCommand = {
  id: "work:regression-gate",

  // NO CALLER-SUPPLIED OUTPUT PATH and no scope flag, and `additionalProperties: false` makes both
  // refusals rather than conventions. The record's home is the item's own folder (ADR-008 §1), and
  // the run's scope is `all` by definition — a gate that could be asked to run a subset would be a
  // partial run wearing a gate's name, which is the shape §1 exists to keep out of the document.
  input: {
    type: "object",
    properties: {
      ref: { type: "string" },
      now: { type: "string" },
    },
    required: ["ref"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    return await runRegressionGate(input, {
      projectRoot: ctx.workspace.projectRoot,
      config: ctx.workspace.config,
      // THE EXACT RESOLVER, bound here — the command layer's job, and the one `runTest` is handed
      // for `--story` for the same reason: a slug fallback would record a near-miss story's run
      // under this item's name.
      resolve: (ref) => resolveItemExact(ctx, ref),
    });
  },

  cli: {
    route: ["work", "regression-gate"],
    spec: {
      usage: "aof work regression-gate <ref> [--json]",
      flags: {},
    },

    argv: (positionals) => ({ ref: positionals[0] }),

    render: (result) =>
      `${result.result === "green" ? "ok" : "not ok"} - regression gate ${result.ref} @ ${result.commit} `
        + `(scope ${result.scope}) — ${result.satisfiesDoor ? "may stand as the accept gate" : "does NOT satisfy the accept door"}`
        + `${result.detail == null ? "" : `\n${result.detail}`}`
        + `\nAppended to ${displayPath(result.path)}.`,

    json: (result) => ({ ...result, path: displayPath(result.path) }),
    exit: (result) => result.exit,
  },
};

function displayPath(value) {
  return path.relative(process.cwd(), value) || ".";
}
