// src/claude-trust.mjs — the ONE writer of claude's folder-TRUST fact.
//
// Extracted from mesh-worker-execution.mjs (2026-07-26) so BOTH spawn paths can share
// it: the mesh worker's per-assignment worktree AND the board's own local terminal.
// mesh-worker-execution.mjs already imports terminal-ws.mjs (for the node-pty spawn
// factory), so terminal-ws.mjs importing it back would be a cycle — this leaf module
// is the seam neither side has to reach through the other for. mesh-worker-execution
// re-exports it, so every existing importer is unchanged.
import os from "node:os";
import path from "node:path";
import { readFile, writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
// m42 item 3 — every former silent catch reports a coded degrade event.
import { reportDegrade } from "./degrade.mjs";

// ensureWorktreeTrusted(cwd, options) — milestone 38 / story 05 fix (live two-machine
// soak 2026-07-25, VERIFICATION F24). claude shows a one-time "Do you trust the files
// in this folder?" dialog the FIRST time it runs in a directory, and that dialog fires
// BEFORE it reads the system prompt — so a fresh per-assignment worktree HANGS the
// autonomous run forever with no human at the worker to accept it (measured: the run
// sat in `running`, no session, no transcript, nothing for the story-06 terminal view
// to bind to). Pre-write the SAME fact the dialog would set —
// projects[<absolute path>].hasTrustDialogAccepted — into the user's ~/.claude.json
// BEFORE the spawn, so the dialog never appears. This is the TRUST gate only; the
// session still runs in `--permission-mode auto`, so a genuine tool pause still
// surfaces as NEEDS_INPUT for a human. Trust is a per-machine, per-ABSOLUTE-PATH LOCAL
// fact (never repo-committable — a repo cannot declare itself trusted), keyed by the
// exact cwd, so EACH distinct cwd must be trusted individually. BEST-EFFORT: a missing
// / locked / malformed ~/.claude.json is swallowed and claude falls back to its own
// (blocking) dialog exactly as before — this never throws.
//
// milestone 70 / story 06 — the key must be spelled the way CLAUDE spells it, and on
// Windows it was not. See `claudeProjectKey` below. Measured on the operator's own
// ~/.claude.json at the time of the fix: 662 backslash-spelled keys, 661 of them
// carrying exactly ONE field (`hasTrustDialogAccepted` — this writer's, never read by
// claude) against 62 forward-slash keys each carrying 10-31 fields (claude's own). The
// pair was visible in the same file: the backslash spelling of this repo's test-bed
// (1 field) beside `C:/Source/umami/aof-test-repo` (29). So the pre-write missed on
// EVERY Windows run since milestone 38, the trust dialog fired anyway, and — because a
// modal dialog consumes keystrokes and repaints nothing for the ones it does not
// handle — it ate the directive AND its Enter. That is the mechanism behind
// `42_structural-overhaul/STATE.md` OPEN FINDING ("bytes reach the pty, claude does
// not react"): they reach it, and a dialog nobody could see is what reacts. POSIX is
// unaffected — a path with no backslash normalises to itself, byte-identically.
export function claudeProjectKey(cwd) {
  // The spelling claude uses for a `projects[]` key: the absolute cwd with path
  // separators normalised to "/". Measured against claude 2.1.241 (2026-08-24): a
  // session spawned with a BACKSLASH cwd wrote its own entry under the forward-slash
  // spelling. Drive-letter CASE is preserved exactly as given, never upper-cased — the
  // same config holds `c:/Source/umami/aof` and `C:/Source/umami/aof` as SEPARATE
  // entries — so this derives the key from the very string the spawn receives as its
  // cwd and re-cases nothing. Exported so a test can assert the spelling with no
  // real config.
  return String(cwd).split(String.fromCharCode(92)).join("/");
}

export async function ensureWorktreeTrusted(worktreeCwd, options = {}) {
  if (typeof worktreeCwd !== "string" || worktreeCwd.length === 0) return;
  const home = options.homedir ?? os.homedir();
  const cfgPath = path.join(home, ".claude.json");
  // The ONE key both this writer and claude's reader agree on.
  const key = claudeProjectKey(worktreeCwd);
  try {
    const cfg = JSON.parse(await readFile(cfgPath, "utf8"));
    cfg.projects = cfg.projects ?? {};
    if (cfg.projects[key]?.hasTrustDialogAccepted === true) return; // already trusted — no rewrite
    cfg.projects[key] = { ...(cfg.projects[key] ?? {}), hasTrustDialogAccepted: true };
    // temp-then-rename so a crash mid-write can never truncate the user's real config.
    const tmp = `${cfgPath}.aof-trust-${randomUUID()}`;
    await writeFile(tmp, JSON.stringify(cfg, null, 2));
    await rename(tmp, cfgPath);
  } catch (error) {
    // best-effort — leave claude's own dialog in place (the pre-fix behavior).
      reportDegrade("claude-trust", error); }
}
