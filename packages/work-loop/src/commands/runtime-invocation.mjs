// The loop's runtime invocation boundary: grammar and pinned resolution, never phase sequencing.
import { commandError } from '@aof/contracts/error';
import { loopRuntimeSettingFromConfig, loopPhaseRuntimesSettingFromConfig, executionRuntimes, executionForPhase, parseRuntimeChoices } from '@aof/contracts/loop-bounds';
import { validateNativeAssets } from './runtime-assets.mjs';

export const phaseRetryKey = (ref, phase) => `${ref}:${phase}`;

// A native permission halt (156): the unattended adapter declined an approval, so the run is not
// retryable and a bare --resume cannot help. The halt carries this remedy instead of a resume command.
const PERMISSION_HALT_REMEDY = "This run recorded a native permission failure. Current Codex drives delegate task-related approvals to native automatic review. After automatic-review setup is available, start a new loop with the same model flags (omit --resume). A bare --resume cannot retry this historical run; native policy denials remain in force.";
export function notePermissionHalt(act, details) {
  if (act?.producer === "run-store:not-retryable" && details.failureReason === "operator_action_required") act.remedy = PERMISSION_HALT_REMEDY;
}
export function permissionHaltLine(state) {
  if (state.act.remedy == null || state.act.producer !== "run-store:not-retryable") return null;
  return `${state.scope} — halted on ${state.act.stop} at ${state.act.ref ?? state.scope} (producer ${state.act.producer}). ${state.act.remedy}`;
}

// The loop's `sessions` table speaks 143/03's provenance words: a value read from configuration is
// `config`. The execution envelope keeps the exact config path it came from (154/ADR-002); only the
// table the loop declares and probes is mapped back, so neither record loses what it promised.
const tableSource = (source) => (typeof source === "string" && source.startsWith("work.agents.") ? "config" : source);
export const loopSessionTable = (phases) => Object.fromEntries(Object.entries(phases).map(([phase, entry]) =>
  [phase, { ...entry, modelSource: tableSource(entry.modelSource), effortSource: tableSource(entry.effortSource) }]));

// Old loops could relabel a repair retry as verify while keeping its Claude
// envelope. Preserve that failed record, but start a correctly selected phase.
export function compatiblePhaseRetry(entry, phase, execution) {
  const record = entry?.prior;
  if (record?.brief?.loop?.phase !== phase) return null;
  if (execution != null && record.execution != null) {
    const wanted = executionForPhase(execution, phase);
    const prior = executionForPhase(record.execution, phase);
    const choice = phase === 'repair' || phase === 'review' ? 'continue' : phase;
    if (wanted.runtime !== prior.runtime || ['model', 'effort'].some(key => wanted.phases[choice][key] !== prior.phases[choice][key])) return null;
  }
  return entry;
}

// Internal mesh transport, consumed only by the CLI launch context. It is not a setting.
export function decodeExecutionHandoff(text, resolveExecutionResume) {
  if (text === undefined) return null;
  if (typeof text !== "string" || Buffer.byteLength(text) > 65536) throw commandError("Invalid mesh execution transport", "invalid-record", 409);
  let value;
  try { value = JSON.parse(text); } catch { throw commandError("Invalid mesh execution transport", "invalid-record", 409); }
  return resolveExecutionResume({ execution: value });
}

export function createRuntimeInvocation({ claudeModelFamily, configuredSessionModels, normalizeEffort, parseSessionChoices, resolveExecution, resolveExecutionResume, runtimeSession, validateAssets = validateNativeAssets }) {
  const flagValues = (value) => (Array.isArray(value) ? value : typeof value === "string" && value.length > 0 ? [value] : []);
  function requestedSessions(input, native = false) {
    const model = flagValues(input?.model);
    const thinking = flagValues(input?.thinking);
    const effortLevels = native ? [...new Set(["low", "medium", "high", "xhigh", "max", ...thinking.map(value => value.split("=").at(-1)), ...model.filter(value => value.includes(":")).map(value => value.split(":").at(-1)).filter(value => /^[a-z][a-z-]*$/.test(value))])] : undefined;
    const parsed = parseSessionChoices({ model, thinking }, effortLevels == null ? {} : { effortLevels });
    if (parsed.refusal) throw commandError(parsed.refusal.message, parsed.refusal.code, 400);
    const unphased = thinking.find((value) => typeof value === "string" && !value.includes("="));
    return { choices: parsed.choices, explicit: model.length + thinking.length > 0, thinking: unphased === undefined ? null : normalizeEffort(unphased) };
  }


  // 156 widens the effort words for Codex's own levels. Only a model that is not a Claude alias or id
  // (flagged or configured) can route a phase to Codex, so a Claude-only request keeps 143/03's door:
  // an unknown level is refused before any registered read.
  function codexEligibleModels(input, ctx) {
    const flagged = Object.values(requestedSessions(input, true).choices).map(choice => choice.model);
    const configured = Object.values(configuredSessionModels(ctx.workspace.config));
    return [...flagged, ...configured].some(model => typeof model === "string" && model.trim() !== "" && !claudeModelFamily(model));
  }

  function requestedRuntimeSessions(input, ctx) {
    const flags = parseRuntimeChoices(input.runtime);
    const native = Object.values(flags).includes("codex") || Object.values(loopPhaseRuntimesSettingFromConfig(ctx.workspace).value ?? {}).includes("codex")
      || codexEligibleModels(input, ctx)
      || executionRuntimes(ctx.executionHandoff).includes("codex") || loopRuntimeSettingFromConfig(ctx.workspace).value === "codex" || input.resume === true;
    return requestedSessions(input, native);
  }

  async function resolveRuntimeInvocation({ input, ctx, resume, resolved, sessionRequest }) {
    const configured = loopRuntimeSettingFromConfig(ctx.workspace);
    const hasRuntime = input.runtime !== undefined || configured.present || loopPhaseRuntimesSettingFromConfig(ctx.workspace).value !== undefined
      || Object.values(sessionRequest.choices).some(choice => choice.model !== undefined) || Object.keys(configuredSessionModels(ctx.workspace.config)).length > 0;
    if (input.resume === true && resume.lastDeclaration != null) {
      const pinned = resolveExecutionResume?.(resume.lastDeclaration, { runtime: input.runtime, choices: sessionRequest.choices, ...(ctx.executionHandoff == null ? {} : { execution: ctx.executionHandoff }) });
      if (pinned != null) { resolved.execution = pinned; resolved.sessions = loopSessionTable(pinned.phases); }
    } else if (ctx.executionHandoff != null) {
      const pinned = resolveExecutionResume({ execution: ctx.executionHandoff }, { runtime: input.runtime, choices: sessionRequest.choices });
      resolved.execution = pinned; resolved.sessions = loopSessionTable(pinned.phases);
    } else if (hasRuntime) {
      const preview = resolveExecution(ctx.workspace.config, { runtime: input.runtime, choices: sessionRequest.choices, allowUnproven: true });
      let capabilities = {};
      try {
        if (executionRuntimes(preview).includes("codex")) capabilities = { codex: await runtimeSession.inspectCapabilities("codex", { ...(ctx.agentSessionDriverOptions ?? {}), cwd: ctx.workspace.projectRoot }) };
      } catch (error) {
        if (["runtime_unavailable", "unsupported_profile"].includes(error.code)) throw commandError(error.message, error.code, 409);
        throw error;
      }
      resolved.execution = resolveExecution(ctx.workspace.config, { runtime: input.runtime, choices: sessionRequest.choices, capabilities });
      resolved.sessions = loopSessionTable(resolved.execution.phases);
    }
    for (const phase of ["refine", "continue", "verify"]) {
      if (resolved.execution != null && executionForPhase(resolved.execution, phase).runtime === "codex") await validateAssets(ctx.workspace.projectRoot, phase);
    }
  }
  return Object.freeze({ requestedSessions, requestedRuntimeSessions, resolveRuntimeInvocation });
}
