// Ref → item resolvers, shared by the work commands (ADR-002/003). Moved out of
// `board-ui.mjs` so the read-vs-write resolver distinction lives IN the command
// core and BOTH faces inherit it (neither face can weaken it).
//
// The load-bearing distinction (ADR-003): a READ (doc/tasks) may slug-match a
// free-text ref (`resolveItem`), but the WRITE (feedback) must resolve by EXACT
// ref only (`resolveItemExact`) — a typo'd/partial ref returns null rather than
// silently appending the bullet to the first free-text slug match (the wrong
// item). `findWork` already returns slug matches for free text, so the two
// resolvers differ only in their fallback.
//
// m43 / story 06 (ADR-005) — THE CHOKEPOINT. This file is stage 1 of the reader
// migration and it is the milestone's single largest behavioural change: eight
// command modules resolve through here (`continue`, `doc`, `feedback`,
// `run-complete`, `run-retry`, `run-start`, `run-status`, `tasks`), so moving these
// two functions onto the cache-first seam migrates all eight in ONE edit — and
// reverting them reverts all eight.
//
// TWO THINGS THE MIGRATION DELIBERATELY DOES NOT MOVE:
//   · THE RULE. The exact-vs-slug distinction above is untouched. Migrating the
//     SOURCE of the rows must never migrate the rule that decides which row a WRITE
//     is allowed to act on — a typo'd ref must still fail rather than reach a
//     plausible neighbour, and it must fail identically whichever side answered.
//   · THE PATH. A cache-answered row for a ref this node does not hold carries
//     `dir: null` (ADR-010/R6.4). The resolvers pass that through verbatim; deciding
//     what to do about it is each caller's own contract — the read doors mark the
//     answer as not-from-this-disk, the two WRITE doors refuse coded through
//     `requireLocalCheckout` below and write nothing.
import { findWorkCacheFirst } from "../work/read.mjs";
import { commandError } from "../command-error.mjs";
import { readRuns } from "../run-store.mjs";

// The command ctx carries both facts the seam needs — the workspace (its work dir and
// its mesh identity) and the store options a test threads through. Accepting the ctx
// rather than a bare `workDir` is what let the migration be one edit per call site.
const seamOptions = (ctx) => ({ globalWorkStoreOptions: ctx?.globalWorkStoreOptions ?? {} });

// Resolve an item by ref to its row (native-path `dir` + ref/type) via the cache-first
// seam — the canonical resolver. Returns null when nothing resolves. Used by the READ
// commands (doc/tasks/run-status/continue), where a free-text slug fallback is acceptable.
//
// The row carries `answeredFrom` ("cache" | "disk") and, when the cache answered,
// `reportedBy` + `syncedAt` — so every command below it can say whose view it returned
// without asking a second question.
export async function resolveItem(ctx, ref) {
  if (!ref) return null;
  const rows = await findWorkCacheFirst(ctx.workspace, ref, seamOptions(ctx));
  // Prefer an exact ref match; findWork can return slug matches for free text.
  return rows.find((row) => row.ref === ref) ?? rows[0] ?? null;
}

// EXACT-ref resolver for the WRITE commands (feedback/run-start/run-retry/run-complete):
// there is NO slug fallback, so a typo'd/partial ref returns null (→ ref-not-found)
// rather than appending the bullet to the first free-text slug match (the wrong item).
export async function resolveItemExact(ctx, ref) {
  if (!ref) return null;
  const rows = await findWorkCacheFirst(ctx.workspace, ref, seamOptions(ctx));
  return rows.find((row) => row.ref === ref) ?? null;
}

// requireLocalCheckout(item) — THE WRITE DOORS' guard (ADR-010/R6.4), stated once so the
// two doors cannot drift apart.
//
// Resolution now succeeds for a ref only the cache knows, which is the whole point — but
// such a row names a folder that is not on this node. A door that writes THROUGH `item.dir`
// must refuse LOUDLY and write nothing. It must NOT scaffold on demand: creating a folder
// here would mint a second authority for content another node owns — the disease this
// milestone exists to cure — race the item lock, and reproduce exactly how the control's
// stale disk became authoritative in the first place. The sanctioned path for a
// control-side change is the gate plus ADR-008's propagation.
export function requireLocalCheckout(item, ref) {
  if (typeof item?.dir === "string" && item.dir.length > 0) return item;
  const resolved = item?.ref ?? ref;
  const reporter = typeof item?.reportedBy === "string" && item.reportedBy.length > 0
    ? ` — it was last reported by ${item.reportedBy}`
    : "";
  const error = commandError(
    `"${resolved}" has no local checkout on this node${reporter}. It resolves from the mesh cache, so there is nothing here to write to; make the change where the item lives, or bring it home first.`,
    "item-not-local",
    409,
  );
  // The ONE structured-refusal channel (spine/face.mjs's `error.detail`, the same one the
  // item lock rides). The refusal ECHOES THE RESOLVED REF, which is the point: the door did
  // resolve — it declined to write — and a caller must be able to tell those two apart
  // without parsing prose. `reportedBy` names where the item actually lives.
  error.detail = { ref: resolved, reportedBy: item?.reportedBy ?? null, answeredFrom: item?.answeredFrom ?? null };
  throw error;
}

// resolveDrivenRun(ctx, item) — THE RUN THIS SESSION IS ALREADY RUNNING AS, when a
// driving shell owns it. Every driver (the loop shell through `work:drive-*`, a bare
// `aof work drive`, the mesh worker) mints the run BEFORE it spawns the session and
// exports `AOF_RUN_ID` + `AOF_RUN_ITEM_DIR` into that session's environment
// (agent-session-driver.mjs, the 69/01 heartbeat keys), then SETTLES the run itself
// once the session ends. The bundle prose, written for the un-driven regime where the
// agent is the only bookkeeper, tells the agent to `run-start` on entry and
// `run-complete` on exit — and with no `--run`, `run-complete` resolves "the item's
// single running run", which under a driver IS the driver's run. Measured
// 2026-09-12: the agent inside a 21-minute loop drive settled the loop's run `done`,
// the shell settled it again 30s later, and `illegal transition done -> done` took the
// whole loop down. The rule that closes it: THE PROCESS THAT MINTS A RUN SETTLES IT,
// and the two bookkeeping verbs YIELD to the driver for that run.
//
// Returns `{ runId, record }` when the environment names a run whose record this
// checkout can read AND that record belongs to `item` — the same ref, not the same
// directory, so a worktree resolving the item under its own path still recognises
// the primary checkout's record. Null otherwise: no driver, a record this checkout
// cannot see, or a DIFFERENT item's run — a milestone orchestrator driven under its
// own run legitimately mints and settles each story's run beneath it.
export async function resolveDrivenRun(ctx, item) {
  const env = ctx?.env ?? process.env;
  const runId = typeof env.AOF_RUN_ID === "string" ? env.AOF_RUN_ID : "";
  const itemDir = typeof env.AOF_RUN_ITEM_DIR === "string" ? env.AOF_RUN_ITEM_DIR : "";
  if (runId === "" || itemDir === "" || typeof item?.ref !== "string") return null;
  const record = (await readRuns({ dir: itemDir })).find((run) => run.runId === runId) ?? null;
  if (record == null || record.itemRef !== item.ref) return null;
  return { runId, record };
}
