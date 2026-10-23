// `work.integrations.hyperagent` — the opt-in configuration for delegating planning to Hyperagent.
// Absent ⇒ the defaults below. Every field is optional; a wrong type falls back to its default and is
// reported in `problems`, never thrown, so `aof work integrations hyperagent doctor` can name it.
export const HYPERAGENT_MCP_URL = "https://hyperagent.com/api/mcp";

export const HYPERAGENT_DEFAULTS = Object.freeze({
  agent: "AOF Planner",
  baseBranch: null,
  branchPrefix: "aof/plan/",
  maxMinutes: 30,
  pollSeconds: 20
});

const BOUNDS = Object.freeze({ maxMinutes: [1, 240], pollSeconds: [5, 300] });

export function readHyperagentConfig(config) {
  const raw = config?.work?.integrations?.hyperagent;
  const configured = raw != null && typeof raw === "object" && !Array.isArray(raw);
  const source = configured ? raw : {};
  const problems = [];
  const value = { ...HYPERAGENT_DEFAULTS };

  for (const key of ["agent", "branchPrefix"]) {
    if (source[key] === undefined) continue;
    if (typeof source[key] === "string" && source[key].trim() !== "") value[key] = source[key].trim();
    else problems.push(`work.integrations.hyperagent.${key} must be a non-empty string`);
  }
  if (source.baseBranch !== undefined) {
    if (source.baseBranch === null || (typeof source.baseBranch === "string" && isSafeBranch(source.baseBranch))) value.baseBranch = source.baseBranch;
    else problems.push("work.integrations.hyperagent.baseBranch must be a branch name");
  }
  for (const [key, [min, max]] of Object.entries(BOUNDS)) {
    if (source[key] === undefined) continue;
    if (Number.isInteger(source[key]) && source[key] >= min && source[key] <= max) value[key] = source[key];
    else problems.push(`work.integrations.hyperagent.${key} must be an integer from ${min} to ${max}`);
  }
  if (!value.branchPrefix.endsWith("/")) value.branchPrefix = `${value.branchPrefix}/`;
  return { configured, value, problems };
}

// A ref name git accepts AND that can never be read as an option or a revision range.
export function isSafeBranch(name) {
  return typeof name === "string"
    && /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(name)
    && !name.includes("..")
    && !name.endsWith("/")
    && !name.endsWith(".lock")
    && !name.includes("//");
}
