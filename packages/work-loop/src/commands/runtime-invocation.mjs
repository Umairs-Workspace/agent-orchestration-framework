// The loop's runtime invocation boundary: grammar and pinned resolution, never phase sequencing.
import { commandError } from '@aof/contracts/error';
import { loopRuntimeSettingFromConfig } from '@aof/contracts/loop-bounds';

// Internal mesh transport, consumed only by the CLI launch context. It is not a setting.
export function decodeExecutionHandoff(text, resolveExecutionResume) {
  if (text === undefined) return null;
  if (typeof text !== "string" || Buffer.byteLength(text) > 65536) throw commandError("Invalid mesh execution transport", "invalid-record", 409);
  let value;
  try { value = JSON.parse(text); } catch { throw commandError("Invalid mesh execution transport", "invalid-record", 409); }
  return resolveExecutionResume({ execution: value });
}

export function createRuntimeInvocation({ normalizeEffort, parseSessionChoices, resolveExecution, resolveExecutionResume, runtimeSession }) {
  const flagValues = (value) => (Array.isArray(value) ? value : typeof value === "string" && value.length > 0 ? [value] : []);
  function requestedSessions(input, native = false) {
    const model = flagValues(input?.model);
    const thinking = flagValues(input?.thinking);
    const effortLevels = native ? [...new Set(["low", "medium", "high", "xhigh", "max", ...thinking.map(value => value.split("=").at(-1)), ...model.filter(value => value.includes(":")).map(value => value.split(":").at(-1))])] : undefined;
    const parsed = parseSessionChoices({ model, thinking }, effortLevels == null ? {} : { effortLevels });
    if (parsed.refusal) throw commandError(parsed.refusal.message, parsed.refusal.code, 400);
    const unphased = thinking.find((value) => typeof value === "string" && !value.includes("="));
    return { choices: parsed.choices, explicit: model.length + thinking.length > 0, thinking: unphased === undefined ? null : normalizeEffort(unphased) };
  }


  async function resolveRuntimeInvocation({ input, ctx, resume, resolved, sessionRequest }) {
    const configured = loopRuntimeSettingFromConfig(ctx.workspace);
    const hasRuntime = input.runtime !== undefined || configured.present;
    if (input.resume === true && resume.lastDeclaration != null) {
      const pinned = resolveExecutionResume?.(resume.lastDeclaration, { runtime: input.runtime, choices: sessionRequest.choices, ...(ctx.executionHandoff == null ? {} : { execution: ctx.executionHandoff }) });
      if (pinned != null) { resolved.execution = pinned; resolved.sessions = pinned.phases; }
    } else if (ctx.executionHandoff != null) {
      const pinned = resolveExecutionResume({ execution: ctx.executionHandoff }, { runtime: input.runtime, choices: sessionRequest.choices });
      resolved.execution = pinned; resolved.sessions = pinned.phases;
    } else if (hasRuntime) {
      const runtime = input.runtime ?? configured.value;
      const capabilities = runtime === "codex" ? { codex: await runtimeSession.inspectCapabilities("codex", { ...(ctx.agentSessionDriverOptions ?? {}), cwd: ctx.workspace.projectRoot }) } : {};
      resolved.execution = resolveExecution(ctx.workspace.config, { runtime: input.runtime, choices: sessionRequest.choices, capabilities });
      resolved.sessions = resolved.execution.phases;
    }

  }
  return Object.freeze({ requestedSessions, resolveRuntimeInvocation });
}
