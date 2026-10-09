// The ACD orchestrator-model SURFACE — pick which model the main (orchestrating)
// session runs on.
//
// In orchestrated mode the main session is the ACD orchestrator: it spawns the
// role sub-agents (whose per-role models live in `work.agents.models`, story 30)
// and does the top-level planning/routing itself. THIS surface sets the model the
// orchestrator itself runs on. It is stored at `settings.claude.model`, the one
// field aof splices into `.claude/settings.json` as `{ "model": ... }` — the key
// Claude Code reads to pick a session's default model. So the choice is FUNCTIONAL:
// `aof work update` (or `aof work init` / `aof assets apply`) SPLICES the key into
// the co-authored settings file through `claude-settings.mjs`'s surgical merge, and
// the next orchestrator session launches on it.
//
// m43 / ADR-002 AC11: the whole-file renderer this comment used to name
// (`runtime-config.claudeSettingsJson`) is GONE. `.claude/settings.json` is
// co-authored — an operator's hooks, permissions and sandbox live in it — so aof
// merges its own keys in and never renders the file whole.
//
// The command is a config-only read-merge-write of `.aof/aof.config.json`,
// following the established `useHeadroom` idiom:
//   readConfig(configPath) -> mutate ONLY settings.claude.model -> writeConfig
//   (2-space + trailing newline). The lock is never touched.
//
// Scope (per the framework owner's request): the two offered orchestrators are
// Fable 5 and Opus 4.8 ONLY, and BOTH stay fully selectable at any time. Fable 5
// is the strongest all-round model; it counts against token usage, so the choice
// is surfaced explicitly rather than hard-defaulted — pick Fable 5 when the extra
// quality is worth the spend, Opus 4.8 when you'd rather not spend Fable tokens.
// Neither is deprecated: this is a switch, not a fallback. A different value
// hand-written into the config is left intact (this surface only ever writes one
// of the two), and per-role sub-agent models remain independent via
// `work.agents.models`.
import { existsSync } from "node:fs";
import { readJson, writeText } from "@aof/foundation/fs";
import { findProjectConfig } from "../workspace.mjs";
import { resolveExecution } from "@aof/execution/runtime-selection";
import { reviewRoundsFromConfig } from "@aof/contracts/loop-bounds";
import { readDelegation } from "./delegation.mjs";
import { loadBundle, projectBundleResources } from "./bundle.mjs";
import { resolveBundleVariant } from "./bundle-runtime.mjs";

// Host integration seam: native providers supply the actual role launch operation
// and advertised model catalog. The caller lends the dispatch envelope's resolved
// bound; this does not choose another concurrency setting or shell out to a CLI.
export function createWorkflowRoleLauncher(config, { profiles, bound, bundle = loadBundle() }) {
  const refuse = (code, message) => { throw Object.assign(new Error(message), { code }); };
  if (!Number.isSafeInteger(bound) || bound < 1) refuse("invalid-role-bound", "A native role launcher requires the resolved dispatch bound.");
  let active = 0;
  return async function launch({ primary, role, phase = "continue", crossRuntime, delegationRequested = false, reviewRound = 1, independent = true, prompt }) {
    if (!["claude", "codex"].includes(primary)) refuse("unsupported-runtime", `Unknown primary runtime ${primary}.`);
    const runtime = crossRuntime ?? primary;
    if (runtime !== primary && (!delegationRequested || readDelegation(config) !== "on")) {
      refuse("cross-assistant-delegation-disabled", "Cross-assistant work requires a separate request and enabled delegation.");
    }
    const profile = profiles?.[runtime];
    if (!profile || typeof profile.launch !== "function" || (independent && (profile.independentRoles !== true || !profile.roles?.includes(role)))) {
      refuse("native-role-capability-unavailable", `${runtime} cannot supply an independent ${role}; inline self-review is not independent review.`);
    }
    const rounds = reviewRoundsFromConfig({ config });
    if (!Number.isSafeInteger(reviewRound) || reviewRound < 1 || reviewRound > rounds) refuse("role-review-bound", `Review round ${reviewRound} exceeds the configured bound ${rounds}.`);
    if (active >= bound) refuse("role-concurrency-bound", `Native roles have reached the dispatch bound ${bound}.`);
    const roles = bundle.resources.filter(member => member.kind === "agent").map(member => member.id);
    if (!roles.includes(role)) refuse("unknown-workflow-role", `Unknown AOF role ${role}.`);
    const authored = resolveBundleVariant(projectBundleResources(bundle.resources, config).find(resource => resource.id === role && resource.kind === "agent"), runtime);
    // Preserve an authored role default (e.g. Claude's researcher uses sonnet),
    // while Codex's native variant explicitly inherits. Compatibility stays with
    // the existing execution resolver; no alias is translated at this seam.
    const modelPinned = config?.work?.agents?.runtimes?.[runtime]?.models?.[role]
      ?? (runtime === "claude" ? config?.work?.agents?.models?.[role] : null);
    const defaultModel = modelPinned ? null : authored.model;
    const effective = defaultModel ? { ...config, work: { ...config?.work, agents: { ...config?.work?.agents,
      runtimes: { ...config?.work?.agents?.runtimes, [runtime]: { ...config?.work?.agents?.runtimes?.[runtime],
        models: { ...config?.work?.agents?.runtimes?.[runtime]?.models, [role]: defaultModel }
      } }
    } } } : config;
    const execution = resolveExecution(effective, { runtime, capabilities: { [runtime]: profile.capabilities ?? {} }, roles });
    const inherited = execution.phases[phase];
    if (!inherited) refuse("unsupported-role-phase", `Unknown role phase ${phase}.`);
    const selected = execution.roles[role];
    const model = selected.model ?? inherited.model;
    const effort = selected.effort ?? inherited.effort;
    // The provider must explicitly support sending each chosen native setting.
    // There is no silent model translation or effort drop at this seam.
    if ((model && profile.modelSelection !== true) || (effort && profile.effortSelection !== true)) {
      refuse("native-role-setting-unsupported", `${runtime} cannot pass the selected model/effort to ${role}.`);
    }
    active += 1;
    try { return await profile.launch({ runtime, role, model, effort, independent, prompt, reviewRound, bound,
      modelSource: defaultModel ? "bundle-role-default" : selected.modelSource,
      effortSource: selected.effortSource }); }
    finally { active -= 1; }
  };
}

// A core never prints: it REPORTS through the collector its caller injects, and the
// face turns the collected lines into the one stdout document (m42 wave (d) leg d1,
// the confine-console.log item). This no-op is the default so an un-injected call is
// silent-by-contract rather than a second printer.
const NO_PRINT = () => {};


// The two orchestrator choices. `id` is the model alias written to the config
// (family aliases, consistent with the agent frontmatter `opus`/`sonnet` style);
// `label` is the human name; `note` is the one-line trade-off shown at the prompt.
export const ORCHESTRATOR_CHOICES = [
  {
    id: "fable",
    label: "Fable 5",
    note: "strongest all-round (highest intelligence + taste); counts against token usage, so pick it when the extra quality is worth the spend"
  },
  {
    id: "opus",
    label: "Opus 4.8",
    note: "strong intelligence + taste; the lighter-cost choice when you'd rather not spend Fable tokens"
  }
];

export const ORCHESTRATOR_IDS = ORCHESTRATOR_CHOICES.map((choice) => choice.id);

// Read the current config (or {} on a fresh project) WITHOUT touching the lock,
// resolving the path with the established idiom. Mirrors work-headroom.readConfig.
export async function readConfig(targetDir) {
  const configPath = await findProjectConfig(targetDir);
  let config = {};
  if (existsSync(configPath)) {
    config = await readJson(configPath);
  }
  return { configPath, config };
}

// Write the config back in the project's 2-space + trailing-newline JSON style —
// the SAME write the other config-only surfaces use.
export async function writeConfig(configPath, config) {
  await writeText(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

// The orchestrator model currently recorded in a config object, or null when
// unset. The accessor both the command and any surfacing (validate/doctor) read,
// so the path is never re-walked by hand.
export function readOrchestratorModel(config) {
  const model = config?.settings?.claude?.model;
  return typeof model === "string" && model.trim() !== "" ? model : null;
}

// Set the orchestrator model on a config object IN PLACE, deep-merging so every
// settings.* and settings.claude.* sibling survives (we set ONLY
// settings.claude.model, never reassign settings or settings.claude wholesale).
// Idempotent. Returns the mutated config (same reference).
export function setOrchestratorModel(config, model) {
  if (!config.settings || typeof config.settings !== "object" || Array.isArray(config.settings)) {
    config.settings = {};
  }
  if (!config.settings.claude || typeof config.settings.claude !== "object" || Array.isArray(config.settings.claude)) {
    config.settings.claude = {};
  }
  config.settings.claude.model = model;
  return config;
}

// Resolve the requested model to a canonical choice id. Accepts a choice id
// ("fable"/"opus"), a case-insensitive label ("Fable 5"), or a leading token
// ("fable-5", "opus-4.8", "opus4.8"). Returns null when it matches neither.
export function resolveOrchestratorModel(requested) {
  if (typeof requested !== "string") return null;
  const value = requested.trim().toLowerCase();
  if (value === "") return null;
  for (const choice of ORCHESTRATOR_CHOICES) {
    if (value === choice.id) return choice.id;
    if (value === choice.label.toLowerCase()) return choice.id;
    // "fable", "fable-5", "fable 5" -> fable; "opus", "opus-4.8" -> opus.
    if (value.startsWith(choice.id)) return choice.id;
  }
  return null;
}

// Interactive picker. Test seam: AOF_ORCHESTRATOR_INPUT short-circuits the TTY
// prompt (mirrors prompt.mjs's AOF_TEST_* stubs) so the flow is exercised in CI.
// EXPORTED for the work:orchestrator / work:delegation cli.argv adapters (m42
// wave (d) leg d1): prompting is a FACE concern — the argv adapter completes a
// missing model interactively, so run() stays headless for every other face.
export async function promptOrchestratorModel() {
  if (process.env.AOF_ORCHESTRATOR_INPUT !== undefined) {
    const resolved = resolveOrchestratorModel(process.env.AOF_ORCHESTRATOR_INPUT);
    if (!resolved) {
      throw new Error(
        `AOF_ORCHESTRATOR_INPUT "${process.env.AOF_ORCHESTRATOR_INPUT}" is not one of: ${ORCHESTRATOR_IDS.join(", ")}.`
      );
    }
    return resolved;
  }

  if (!process.stdin.isTTY) {
    throw new Error(
      `Cannot prompt for an orchestrator model without an interactive terminal. Pass one explicitly, e.g. \`aof work orchestrator fable\` (one of: ${ORCHESTRATOR_IDS.join(", ")}).`
    );
  }

  // Lazy import so the CLI's non-interactive paths never load the prompt library.
  const { select } = await import("@inquirer/prompts");
  return select({
    message: "Which orchestrator model should the main ACD session use?",
    choices: ORCHESTRATOR_CHOICES.map((choice) => ({
      name: `${choice.label} — ${choice.note}`,
      value: choice.id
    }))
  });
}

// `aof work orchestrator [model]` — set the orchestrator (main-session) model in
// `.aof/aof.config.json` (config-only; never the lock). When `model` is absent
// the user is prompted to choose Fable 5 or Opus 4.8. opts:
//   { targetDir, model?, log? }. Returns { configPath, config, model, previous, changed }.
export async function selectOrchestratorModel({ targetDir = process.cwd(), model, log = NO_PRINT } = {}) {
  let chosen;
  if (model !== undefined && model !== null && String(model).trim() !== "") {
    chosen = resolveOrchestratorModel(model);
    if (!chosen) {
      throw new Error(
        `"${model}" is not a supported orchestrator model. Choose one of: ${ORCHESTRATOR_IDS.join(", ")} (Fable 5 or Opus 4.8).`
      );
    }
  } else {
    chosen = await promptOrchestratorModel();
  }

  const { configPath, config } = await readConfig(targetDir);
  const previous = readOrchestratorModel(config);
  setOrchestratorModel(config, chosen);
  await writeConfig(configPath, config);

  const label = ORCHESTRATOR_CHOICES.find((choice) => choice.id === chosen)?.label ?? chosen;
  log(`Orchestrator model set to ${label} (settings.claude.model = "${chosen}") in ${configPath}`);
  log("Run `aof work update` to splice the model into .claude/settings.json so the next session picks it up (your own hooks and permissions in that file are preserved — aof merges, never re-renders).");

  return { configPath, config, model: chosen, previous, changed: previous !== chosen };
}

// `aof work orchestrator --show` — report the current orchestrator model without
// mutating anything. opts: { targetDir, log? }.
export async function showOrchestratorModel({ targetDir = process.cwd(), log = NO_PRINT } = {}) {
  const { configPath, config } = await readConfig(targetDir);
  const current = readOrchestratorModel(config);
  if (current) {
    const label = ORCHESTRATOR_CHOICES.find((choice) => choice.id === current)?.label ?? current;
    log(`Orchestrator model: ${label} (settings.claude.model = "${current}")`);
  } else {
    log(`Orchestrator model: not set. Choose one with \`aof work orchestrator\` (${ORCHESTRATOR_IDS.join(" | ")}).`);
  }
  return { configPath, config, model: current };
}
