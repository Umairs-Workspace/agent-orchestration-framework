// Is this machine and project set up for `/aof:hyperplan`? Reads, never writes, never authenticates.
//
//   · Claude Code — a `hyperagent` MCP server (any name whose URL is Hyperagent's endpoint) in the
//     project's `.mcp.json`, or in `~/.claude.json` (user scope, or this project's local scope).
//   · Codex      — an `[mcp_servers.<name>]` table naming Hyperagent's endpoint in the project's
//     `.codex/config.toml` or `~/.codex/config.toml`.
//   · The planner skills — `.hyperagent/skills/*/SKILL.md` rendered in this repository (Hyperagent
//     imports them from GitHub; without them the planner has no AOF procedures).
//   · `work.integrations.hyperagent` — its effective values and any problems.
// OAuth state is not observable from files; registering is reported, signing in is the hint.
import path from "node:path";
import os from "node:os";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { HYPERAGENT_MCP_URL, readHyperagentConfig } from "./config.mjs";

const ENDPOINT = /hyperagent\.com\/api\/mcp/;

// An absent or unreadable file is "not registered there" — the answer, not a degrade to report.
async function readText(file) {
  return existsSync(file) ? readFile(file, "utf8").catch(() => null) : null;
}

function parseJson(text) {
  if (text == null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null; // an unparseable file holds no registration
  }
}

function serverIn(servers) {
  if (servers == null || typeof servers !== "object") return null;
  for (const [name, server] of Object.entries(servers)) {
    if (ENDPOINT.test(String(server?.url ?? ""))) return name;
  }
  return null;
}

async function claudeRegistration(projectRoot, homeDir) {
  const project = parseJson(await readText(path.join(projectRoot, ".mcp.json")));
  const projectName = serverIn(project?.mcpServers);
  if (projectName) return { registered: true, name: projectName, source: ".mcp.json" };
  const user = parseJson(await readText(path.join(homeDir, ".claude.json")));
  const userName = serverIn(user?.mcpServers) ?? serverIn(user?.projects?.[projectRoot]?.mcpServers);
  if (userName) return { registered: true, name: userName, source: "~/.claude.json" };
  return { registered: false, name: null, source: null };
}

export function codexServerName(toml) {
  let current = null;
  for (const line of String(toml ?? "").split(/\r?\n/)) {
    const table = /^\s*\[mcp_servers\.("?)([A-Za-z0-9_-]+)\1\]\s*$/.exec(line);
    if (table) { current = table[2]; continue; }
    if (/^\s*\[/.test(line)) { current = null; continue; }
    if (current && /^\s*url\s*=/.test(line) && ENDPOINT.test(line)) return current;
  }
  return null;
}

async function codexRegistration(projectRoot, homeDir) {
  for (const [file, source] of [[path.join(projectRoot, ".codex", "config.toml"), ".codex/config.toml"], [path.join(homeDir, ".codex", "config.toml"), "~/.codex/config.toml"]]) {
    const name = codexServerName(await readText(file));
    if (name) return { registered: true, name, source };
  }
  return { registered: false, name: null, source: null };
}

async function renderedSkills(projectRoot) {
  const root = path.join(projectRoot, ".hyperagent", "skills");
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && existsSync(path.join(root, entry.name, "SKILL.md"))).map((entry) => entry.name).sort();
}

export async function inspectHyperagentSetup({ projectRoot, config, homeDir = os.homedir() }) {
  const [claude, codex, skills] = await Promise.all([
    claudeRegistration(projectRoot, homeDir),
    codexRegistration(projectRoot, homeDir),
    renderedSkills(projectRoot)
  ]);
  const settings = readHyperagentConfig(config);
  const hints = [];
  if (!claude.registered && !codex.registered) {
    hints.push(`Register Hyperagent's MCP server in your assistant: \`claude mcp add --transport http hyperagent ${HYPERAGENT_MCP_URL}\` (then /mcp to sign in), or \`codex mcp add hyperagent --url ${HYPERAGENT_MCP_URL}\` then \`codex mcp login hyperagent\`.`);
  }
  // 169/ADR-005: the integration's files render only where `work.integrations.hyperagent` is present.
  if (!settings.configured) {
    hints.push("Enable the integration: add `\"hyperagent\": {}` under `work.integrations` in .aof/aof.config.json, then run `aof work update` to render /aof:hyperplan and .hyperagent/.");
  } else if (skills.length === 0) {
    hints.push("Render the planner skills with `aof work update`, push them, and import them in Hyperagent (Skills → Create skill → Import from GitHub).");
  }
  hints.push(`Make sure a Hyperagent agent named "${settings.value.agent}" exists with those skills and the GitHub integration (its instructions: .hyperagent/AGENT.md).`);
  for (const problem of settings.problems) hints.push(`Fix ${problem}.`);
  return {
    ready: settings.configured && (claude.registered || codex.registered) && skills.length > 0 && settings.problems.length === 0,
    claude,
    codex,
    skills,
    config: settings,
    hints
  };
}
