// src/work/doctor/sync.mjs — THE SYNC LANE (milestone 164 / story 03, ADR-006; Q1 put the surface in
// doctor). Whether the global store is current or quietly behind used to be learnt from a stale
// fleet card. This lane states, per workspace: what is owed and for how long, after how many
// attempts and why it fails, when it last synced, and — for the workspace doctor runs in — how
// many of its records changed since they were last synced.
//
// PURE, like every lane: the facts arrive on the snapshot as plain data, read at the command edge
// (`commands/doctor.mjs`): the owed `publish-projection` journal steps and each workspace's last
// successful sync on this node; the per-record "changed since synced" bit is the snapshot builder's,
// asked of the one change predicate. Nothing is stored for this surface.
//
// Both findings are WARN: a store that is behind delays a change, it never loses one, and a sync
// lane that could fail `validate` would turn a locked store into a red build.

export const SYNC_FAILING = "sync-failing";
export const SYNC_BEHIND = "sync-behind";

// durationLabel(ms) — "40m", "2h", "3d": the coarse age an operator reads at a glance.
export function durationLabel(ms) {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

// syncSummary(snapshot, now) → one entry per workspace, or [] when no sync facts were read:
//   { workspaceId, name, current, lastSyncedAt, owed, owedSince, owedForMs, attempts, lastError, changed }
// `changed` is counted for the workspace doctor runs in only (its records are the ones on this
// disk); it is null for every other workspace.
export function syncSummary(snapshot, now) {
  const sync = snapshot?.sync;
  if (sync == null) return [];
  const at = Number.isFinite(now) ? now : null; // the lane reads no clock: an absent `now` leaves ages unknown
  const byId = new Map();
  const entry = (workspaceId) => {
    if (!byId.has(workspaceId)) byId.set(workspaceId, { workspaceId, name: null, current: workspaceId === sync.workspaceId, lastSyncedAt: null, steps: [] });
    return byId.get(workspaceId);
  };
  if (sync.workspaceId != null) entry(sync.workspaceId).name = sync.name ?? null;
  for (const row of sync.workspaces ?? []) {
    const target = entry(row.workspaceId);
    target.name = target.name ?? row.name ?? null;
    target.lastSyncedAt = row.lastSyncedAt ?? null;
  }
  for (const step of sync.owed ?? []) if (step.workspaceId != null) entry(step.workspaceId).steps.push(step);

  return [...byId.values()].map(({ steps, ...base }) => {
    const owed = steps.length > 0;
    const since = owed ? steps.map((step) => step.createdAt).sort()[0] : null;
    const worst = owed ? steps.reduce((a, b) => ((b.attempts ?? 0) > (a.attempts ?? 0) ? b : a)) : null;
    return {
      ...base,
      name: base.name ?? base.workspaceId,
      owed,
      owedSince: since,
      owedForMs: since == null || at == null ? null : Math.max(0, at - Date.parse(since)),
      attempts: worst?.attempts ?? 0,
      lastError: worst?.lastError ?? null,
      changed: base.current ? (snapshot.items ?? []).filter((item) => item.changedSinceSync === true).length : null,
    };
  });
}

// syncLine(entry, now) — the text report's one line per workspace.
export function syncLine(entry, now) {
  const synced = entry.lastSyncedAt == null ? "never synced on this node" : `last synced ${entry.lastSyncedAt}`;
  if (entry.owed) {
    const error = entry.lastError ? `, last error: ${entry.lastError}` : "";
    return `sync: ${entry.name} — owed ${durationLabel(entry.owedForMs ?? 0)}, ${entry.attempts} attempts${error}; ${synced}`;
  }
  if (entry.changed > 0) {
    const ago = entry.lastSyncedAt == null || !Number.isFinite(now) ? "" : ` (${durationLabel(now - Date.parse(entry.lastSyncedAt))} ago)`;
    return `sync: ${entry.name} — ${entry.changed} record(s) changed and not yet synced; ${synced}${ago}`;
  }
  return `sync: ${entry.name} — in sync; ${synced}`;
}

// syncGroup(snapshot, ctx) — the lane's findings, anchored on the work dir doctor runs over (a
// workspace-level fact, so a scoped run keeps it), each naming its workspace in the message.
export function syncGroup(snapshot, ctx = {}) {
  const findings = [];
  for (const entry of syncSummary(snapshot, ctx.now)) {
    if (entry.owed && entry.attempts > 0) {
      findings.push({
        code: SYNC_FAILING,
        severity: "warn",
        path: snapshot.workDir,
        message: `${entry.name}: its sync to the global store has been owed for ${durationLabel(entry.owedForMs ?? 0)} after ${entry.attempts} failed attempt(s)${entry.lastError ? ` — last error: ${entry.lastError}` : ""}`,
      });
    }
    if (entry.current && entry.changed > 0) {
      findings.push({
        code: SYNC_BEHIND,
        severity: "warn",
        path: snapshot.workDir,
        message: `${entry.name}: ${entry.changed} record(s) changed since they were last synced to the global store (${entry.lastSyncedAt == null ? "never synced on this node" : `last synced ${entry.lastSyncedAt}`})`,
      });
    }
  }
  return findings;
}
