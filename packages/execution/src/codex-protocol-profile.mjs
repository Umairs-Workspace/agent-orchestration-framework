// Version-specific public App Server shapes; lifecycle and policy live elsewhere.
export const CODEX_PROFILE = Object.freeze({
  name: "codex-app-server-v1", version: 1, minimumVersion: "0.160.0",
  // Native event names from openai/codex rust-v0.160.0, codex-rs/hooks/src/lib.rs
  // (HOOK_EVENT_NAMES). A definition still needs native hook review/trust.
  hookEvents: Object.freeze(["PreToolUse", "PermissionRequest", "PostToolUse", "PreCompact", "PostCompact",
    "SessionStart", "SessionEnd", "UserPromptSubmit", "SubagentStart", "SubagentStop", "Stop", "Interrupt"]),
  frameBytes: 1024 * 1024, resultBytes: 65536, queuedMessages: 128,
  requestMs: 15000, interruptMs: 1000, closeMs: 1000,
});
// The floor is a stable release. Newer prereleases qualify; prereleases of the
// floor itself do not. Build metadata does not affect version precedence.
export function isSupportedCodexVersion(version) {
  if (typeof version !== "string") return false;
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u.exec(version);
  if (!match || match[4]?.split(".").some(part => /^0\d+$/u.test(part))) return false;
  const minimum = CODEX_PROFILE.minimumVersion.split(".").map(BigInt);
  for (let i = 0; i < 3; i++) {
    const actual = BigInt(match[i + 1]);
    if (actual !== minimum[i]) return actual > minimum[i];
  }
  return match[4] === undefined;
}
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const named = value => typeof value === "string" && value.trim().length > 0;
const closed = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
export const CODEX_RESULT_SCHEMA = Object.freeze({ type: "object", additionalProperties: false,
  required: ["status", "question", "failureReason"], properties: {
    status: { type: "string", enum: ["complete", "needs_input", "failed"] },
    question: { anyOf: [{ type: "null" }, { type: "object", additionalProperties: false,
      required: ["token", "text", "choices"], properties: { token: { type: "string" }, text: { type: "string" }, choices: { type: "array", items: { type: "string" } } } }] },
    failureReason: { anyOf: [{ type: "null" }, { type: "string", enum: ["phase_failed", "operator_action_required"] }] },
  } });
export function parseCodexPhaseResult(text) {
  if (typeof text !== "string" || Buffer.byteLength(text) > CODEX_PROFILE.resultBytes) return null;
  let value; try { value = JSON.parse(text); } catch { return null; }
  if (!closed(value, ["status", "question", "failureReason"])) return null;
  if (value.status === "complete" && value.question === null && value.failureReason === null) return value;
  if (value.status === "failed" && value.question === null && ["phase_failed", "operator_action_required"].includes(value.failureReason)) return value;
  if (value.status === "needs_input" && value.failureReason === null && closed(value.question, ["token", "text", "choices"])
    && named(value.question.token) && named(value.question.text) && Array.isArray(value.question.choices) && value.question.choices.every(named)) return value;
  return null;
}
export function permissionReply(method) {
  if (["item/commandExecution/requestApproval", "item/fileChange/requestApproval"].includes(method)) return { decision: "decline" };
  if (method === "item/permissions/requestApproval") return { permissions: {}, scope: "turn" };
  return null;
}
export const CODEX_AUTO_REVIEW = Object.freeze({ approvalsReviewer: "auto_review", approvalPolicy: "on-request" });
export const CODEX_REVIEW_METHODS = Object.freeze(["item/autoApprovalReview/started", "item/autoApprovalReview/completed"]);
const timestamp = value => Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000;
const strings = value => Array.isArray(value) && value.every(v => typeof v === "string");
function permissionProfile(value) {
  if (!object(value) || Object.keys(value).some(k => !["network", "fileSystem"].includes(k))) return false;
  if (value.network != null && (!object(value.network) || (value.network.enabled != null && typeof value.network.enabled !== "boolean"))) return false;
  const fs = value.fileSystem;
  return fs == null || (object(fs) && ["read", "write"].every(k => fs[k] == null || strings(fs[k]))
    && (fs.entries == null || (Array.isArray(fs.entries) && fs.entries.every(e => object(e) && ["read", "write", "deny"].includes(e.access) && object(e.path)
      && ((e.path.type === "path" && named(e.path.path)) || (e.path.type === "glob_pattern" && named(e.path.pattern)) || (e.path.type === "special" && object(e.path.value) && named(e.path.value.kind)))))));
}
export function validPermissionRequest(method, params, sessionId, turnId) {
  if (!named(sessionId) || !named(turnId) || params?.threadId !== sessionId || params.turnId !== turnId
    || !named(params.itemId) || !timestamp(params.startedAtMs)) return false;
  if (method === "item/permissions/requestApproval") return named(params.cwd) && permissionProfile(params.permissions);
  return permissionReply(method) != null;
}
function reviewAction(action) {
  if (!object(action)) return false;
  switch (action.type) {
    case "command": return typeof action.command === "string" && named(action.cwd) && ["shell", "unifiedExec"].includes(action.source);
    case "execve": return named(action.program) && strings(action.argv) && named(action.cwd) && ["shell", "unifiedExec"].includes(action.source);
    case "writeStdin": return [action.approvalId, action.processId, action.cwd].every(named) && typeof action.stdin === "string";
    case "applyPatch": return named(action.cwd) && strings(action.files);
    case "networkAccess": return named(action.host) && named(action.target) && ["http", "https", "socks5Tcp", "socks5Udp"].includes(action.protocol) && Number.isInteger(action.port) && action.port >= 0 && action.port <= 65535;
    case "mcpToolCall": return named(action.server) && named(action.toolName);
    case "requestPermissions": return permissionProfile(action.permissions);
    default: return false;
  }
}
// Validate the required native review wire shape on every admitted version. Project metadata only.
export function nativeReview(method, params, sessionId, turnId) {
  if (params?.threadId !== sessionId || params?.turnId !== turnId) {
    if (named(params?.threadId) && named(params?.turnId)) return null;
    throw Object.assign(new Error("Invalid native review identity"), { code: "native_review_invalid" });
  }
  const completed = method === CODEX_REVIEW_METHODS[1];
  if (!CODEX_REVIEW_METHODS.includes(method) || !named(params.reviewId) || !timestamp(params.startedAtMs)
    || (params.targetItemId != null && !named(params.targetItemId)) || !reviewAction(params.action)
    || !(completed ? ["approved", "denied", "timedOut", "aborted"] : ["inProgress"]).includes(params.review?.status)
    || (completed && (!timestamp(params.completedAtMs) || params.completedAtMs < params.startedAtMs || params.decisionSource !== "agent"))) {
    throw Object.assign(new Error("Invalid native review evidence"), { code: "native_review_invalid" });
  }
  return { kind: "permission-review", sessionId, turnId, reviewId: params.reviewId, targetItemId: params.targetItemId ?? null,
    actionType: params.action.type, status: params.review.status, startedAtMs: params.startedAtMs,
    ...(completed ? { completedAtMs: params.completedAtMs, decisionSource: params.decisionSource } : {}) };
}
export function nativeQuestion(params, sessionId) {
  if (!named(sessionId) || params?.threadId !== sessionId || params?.isBlocking !== true || !named(params.itemId)
    || !Array.isArray(params.questions) || !params.questions.length) return null;
  if (Buffer.byteLength(JSON.stringify(params.questions)) > CODEX_PROFILE.resultBytes) return null;
  if (params.questions.some(q => !object(q) || !named(q.id) || !named(q.question) || !named(q.header)
    || (q.options != null && (!Array.isArray(q.options) || q.options.some(o => !named(o?.label) || typeof o.description !== "string"))))) return null;
  if (new Set(params.questions.map(q => q.id)).size !== params.questions.length) return null;
  const questions = structuredClone(params.questions);
  return { token: questions.length === 1 ? questions[0].id : params.itemId,
    text: questions.map(q => q.question).join("\n\n"), choices: questions.length === 1 ? structuredClone(questions[0].options ?? []) : [],
    questions, sessionId };
}
export function nativeUsage(params, sessionId, turnId) {
  if (params?.threadId !== sessionId || params?.turnId !== turnId || !object(params.tokenUsage)) return null;
  const usage = params.tokenUsage;
  for (const part of ["total", "last"]) {
    if (!object(usage[part])) return null;
    for (const key of ["inputTokens", "cachedInputTokens", "outputTokens", "reasoningOutputTokens", "totalTokens"]) {
      if (!Number.isSafeInteger(usage[part][key]) || usage[part][key] < 0) return null;
    }
  }
  const result = { sessionId, turnId, total: {}, last: {} };
  for (const part of ["total", "last"]) for (const [key, value] of Object.entries(usage[part])) {
    if (["inputTokens", "cachedInputTokens", "cacheWriteInputTokens", "outputTokens", "reasoningOutputTokens", "totalTokens"].includes(key)
      && Number.isSafeInteger(value) && value >= 0) result[part][key] = value;
  }
  if (usage.modelContextWindow === null || (Number.isSafeInteger(usage.modelContextWindow) && usage.modelContextWindow >= 0)) result.modelContextWindow = usage.modelContextWindow;
  return result;
}
