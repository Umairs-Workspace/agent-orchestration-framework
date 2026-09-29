// src/otel-attribution.mjs — the OTel spawn attribution surface (68/ADR-005 §2,
// milestone 68 / story 01).
//
// aof ships NO OTLP receiver (FF-6808, ADR-005 §2): the whole OTel surface is
// env-set-at-spawn only, so a project that runs its OWN collector is correctly
// attributed for free while every figure this milestone produces is correct with no
// collector running anywhere. This module is the PURE half — the resource-attribute
// builder and the two env keys — imported by the spawn seam (agent-session-driver.mjs),
// which sets the environment. Kept as a separate leaf so the spawn module's own
// frozen export contract is untouched.
export const OTEL_TELEMETRY_ENV_KEY = "CLAUDE_CODE_ENABLE_TELEMETRY";
export const OTEL_RESOURCE_ATTRIBUTES_ENV_KEY = "OTEL_RESOURCE_ATTRIBUTES";

// The resource-attribute vocabulary (68/ADR-005 §2): run.id, story.id, milestone.id,
// phase (read from the loop's declaration, ADR-002 — NEVER fabricated), machine.id,
// worktree.id. PURE over its input: an absent fact contributes no attribute, so a run
// with no declared phase reports no `phase`, and a milestone item (not a story)
// carries no `story.id`. Values are emitted verbatim (OTel key=value pairs joined by
// commas); a fact that is not a non-empty string is simply absent.
export function buildOtelResourceAttributes(attribution = {}) {
  const { runId, storyId, milestoneId, phase, machineId, worktreeId } = attribution;
  const entries = [];
  if (typeof runId === "string" && runId.length > 0) entries.push(["run.id", runId]);
  if (typeof storyId === "string" && storyId.length > 0) entries.push(["story.id", storyId]);
  if (typeof milestoneId === "string" && milestoneId.length > 0) entries.push(["milestone.id", milestoneId]);
  if (typeof phase === "string" && phase.length > 0) entries.push(["phase", phase]);
  if (typeof machineId === "string" && machineId.length > 0) entries.push(["machine.id", machineId]);
  if (typeof worktreeId === "string" && worktreeId.length > 0) entries.push(["worktree.id", worktreeId]);
  return entries.map(([key, value]) => `${key}=${value}`).join(",");
}

// buildRunAttribution(item, facts) — derive the attribution FACTS for one run from the
// item it belongs to, so the ref→{milestone,story} split has ONE home rather than a copy
// in each production caller (F-09, 2026-08-21: both callers had built this object inline
// with the same `ref.split("/")[0]` logic, and the sink's copy is what pushed
// `mesh-worker-execution.mjs` past its FF-5302 shrink-only ceiling).
//
// PURE, like its sibling above: an absent fact stays absent, and `phase` is passed in by
// the caller from the loop's own declaration (ADR-002) — NEVER derived here, because a
// fabricated phase is exactly what FF-6802's single authority forbids.
export function buildRunAttribution(item, { runId, phase, machineId, worktreeId } = {}) {
  const ref = typeof item?.ref === "string" ? item.ref : "";
  return {
    runId,
    milestoneId: ref.length > 0 ? ref.split("/")[0] : undefined,
    storyId: item?.type === "story" && ref.length > 0 ? ref : undefined,
    phase,
    machineId,
    worktreeId,
  };
}
