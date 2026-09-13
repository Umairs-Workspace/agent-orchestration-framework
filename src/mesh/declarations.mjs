// THE DECLARATIONS PRODUCER (126/02, ADR-005 §2, §5-§8) — which declarations should be running on
// this node now, composed into rows a supervisor can act on.
//
// WHY IT IS ITS OWN MODULE, rather than sitting in `src/commands/mesh/identity.mjs` where it began.
// Two delivered controls put it here, and both are about cost rather than taste:
//
//   · `72/FF-7205` (`acd-session-verb-boots-no-registry`) forbids a dynamic import of the command
//     registry in the session module OR ANYTHING ITS STATIC CLOSURE REACHES — "a lazy path that
//     awaits the registry on the session hot path costs the same 88 modules as a static one, and
//     satisfies a closure walk while doing it". `identity.mjs` is in that closure. This module is
//     reached only through a dynamic import from inside the `--declarations` branch, so it is in
//     no static closure and the registry read it performs is paid for only when asked for.
//   · `69/FF-6901` / `53/FF-5310` (`acd-loop-cap-single-home`) hold `work.autonomous.maxAttempts`
//     to four resolution sites. A fifth is a second home for the bound whether or not it supplies
//     a default, so the ceiling is read through `resolveAttemptCeiling` — an ADMITTED resolver —
//     rather than re-derived here.
//
// The split is also the honest one on its own terms: which loops should be running is not a fact
// about node identity, and `mesh:status` carries the answer because 36/ADR-004 §2 gives the
// supervisor exactly one data command — not because this belongs to that command's module.
//
// DISK IS THE AUTHORITY for a local run: TECH_DEBT item 19 measures a cached row that read
// `running` for two days after its run finished, so the records come from `readRuns` and no
// cached-row reader is consulted.
import { resolveNodeWorkspaces } from "./presence.mjs";
import { decideSupervisedDeclarations } from "../work/loop.mjs";
import { isRunning, isStale, readRuns, retryReadiness } from "../run-store.mjs";
import { heartbeatFromConfig, scheduleToCloseFromConfig } from "../loop-bounds.mjs";
import { resolveAttemptCeiling } from "../commands/run-retry.mjs";
import { listItems, loadWorkspace } from "../work.mjs";
import { argvFor } from "../loop-argv.mjs";

export async function supervisedDeclarations(ws, localId, nowIso, ctx) {
  const resolved = await resolveNodeWorkspaces(localId, {
    globalWorkStoreOptions: ctx?.globalWorkStoreOptions ?? {},
  });
  // `ok: false` means the resolver could not answer AT ALL — the projection store would not open,
  // or the query threw — and it returns empty workspaces AND empty skips in that case. That is
  // exactly why it must not degrade into the standalone fallback: dressing a resolver that did not
  // answer as a node with one workspace would report this node's own tree as the fleet's whole
  // truth.
  if (resolved.ok !== true) {
    return Object.freeze({ ok: false, rows: Object.freeze([]), skipped: Object.freeze([]) });
  }

  // A resolver that ANSWERED with no members is a standalone node, and its one workspace is the
  // calling command's own. `skipped` is carried verbatim either way, so a workspace that could not
  // be resolved is never readable as an empty node.
  const members = resolved.workspaces.length > 0
    ? resolved.workspaces
    : [{ workspaceId: ws.config?.mesh?.workspaceId ?? null, workDir: ws.workDir, projectRoot: ws.projectRoot }];

  const workspaces = [];
  for (const member of members) {
    const items = [];
    for (const item of await listItems(member.workDir)) {
      items.push({ ref: item.ref, runs: await readRuns(item) });
    }
    // EACH MEMBER'S OWN COMPUTE CEILING (2026-09-11) — a declaration is measured for relaunch
    // against `scheduleToClose` from the config of the workspace it lives in, which is the config
    // its resumed loop actually runs against. Reading only the supervising node's ceiling made a
    // node whose own config raised the ceiling relaunch a MEMBER workspace's already-exhausted
    // lineage every poll, each relaunch halting in under a second on the member's own lower
    // ceiling — an infinite deadline-exhausted storm (measured on aof-test-repo, whose 2h ceiling
    // the node's raised 12h masked). Best-effort: a member whose config cannot be read carries no
    // ceiling and the engine falls back to the node's, exactly as before.
    let ceilingMs = null;
    try {
      const memberWs = member.projectRoot ? await loadWorkspace(member.projectRoot) : null;
      if (memberWs != null) ceilingMs = scheduleToCloseFromConfig(memberWs);
    } catch {
      ceilingMs = null;
    }
    workspaces.push({ workspaceId: member.workspaceId, projectRoot: member.projectRoot, items, ...(ceilingMs == null ? {} : { ceilingMs }) });
  }

  const { rows } = decideSupervisedDeclarations({
    workspaces,
    maxAttempts: resolveAttemptCeiling(ws.config),
    ceilingMs: scheduleToCloseFromConfig(ws),
    stalenessMs: heartbeatFromConfig(ws),
    now: nowIso,
    isRunning,
    isStale,
    retryReadiness,
  });

  // The route is read off `work:loop`'s own registration through a DEFERRED import — 63/ADR-001's
  // rule, and the reason the leaf takes the route as a parameter: the argv's leading tokens ARE
  // the command the registry answers for. Being reachable only through this module's own dynamic
  // import, the registry is loaded when an operator asks for declarations and at no other time.
  const { getCommand } = await import("../command-core.mjs");
  const route = getCommand("work:loop")?.cli?.route ?? [];

  return Object.freeze({
    ok: true,
    rows: Object.freeze(rows.map((row) => Object.freeze({
      id: row.loopRunId,
      label: `loop ${row.scope}`,
      // A supervised relaunch is always a RESUME: the declaration it is relaunching already
      // exists, and a fresh one would reset the total budget and make a bounded loop unbounded
      // (`SPEC §Scope` refuses that by name).
      argv: argvFor(route, { scope: row.scope, level: row.level }, { resume: true }),
      // Without this a login-autostarted supervisor spawns from `C:\WINDOWS\system32` —
      // TECH_DEBT item 4's measured shape, and workspace identity is still partly cwd-derived.
      cwd: row.projectRoot,
      scope: row.scope,
      level: row.level,
      cap: row.cap,
    }))),
    skipped: Object.freeze(resolved.skipped),
  });
}
