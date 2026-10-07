// Version-specific public App Server shapes; lifecycle and policy live elsewhere.
export const CODEX_PROFILE = Object.freeze({
  name: "codex-app-server-v1", version: 1, supportedVersions: Object.freeze(["0.160.0"]),
  // Native event names from openai/codex rust-v0.160.0, codex-rs/hooks/src/lib.rs
  // (HOOK_EVENT_NAMES). A definition still needs native hook review/trust.
  hookEvents: Object.freeze(["PreToolUse", "PermissionRequest", "PostToolUse", "PreCompact", "PostCompact",
    "SessionStart", "SessionEnd", "UserPromptSubmit", "SubagentStart", "SubagentStop", "Stop", "Interrupt"]),
  frameBytes: 1024 * 1024, resultBytes: 65536, queuedMessages: 128,
  requestMs: 15000, interruptMs: 1000, closeMs: 1000,
});
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
