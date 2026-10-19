// The planner BRIEF — the one self-contained message `/aof:hyperplan` sends to the Hyperagent AOF
// Planner over MCP (`create_thread`). Deterministic: the same inputs always compose the same text, so
// the procedure never improvises the hand-off and a test can pin what the planner is told.
//
// The planner cannot see the operator's session, so the brief carries everything: the repository and
// base branch, which planning step(s) to run, the operator's request, the project's work layout and
// tag vocabulary, the delivery rules, and the RESULT BLOCK the planner must end with — the machine
// contract `parsePlanResult` reads back.
import { isSafeBranch } from "./config.mjs";

export const PLAN_MODES = Object.freeze(["plan", "prd", "shatter", "refine"]);

export const RESULT_BLOCK_MARKER = "AOF-PLAN-RESULT";

const MODE_STEPS = Object.freeze({
  plan: "Run `aof-prd` on the request, then run `aof-shatter` on the PRD you wrote — both in this thread, on the same branch, in one pull request.",
  prd: "Run `aof-prd` on the request. Do not shatter it; the operator reviews the PRD first.",
  shatter: "Run `aof-shatter` on the PRD named below. Do not write a new PRD.",
  refine: "Run `aof-refine` on the numbered item named below. A backlog (un-numbered) item is a stop: report it and write nothing."
});

// owner/repo from a git remote URL (https, ssh or scp-form, GitHub only). Null when it is not GitHub.
export function parseGitRemote(url) {
  const text = String(url ?? "").trim();
  const match = /^(?:https?:\/\/(?:[^@/]+@)?github\.com\/|ssh:\/\/git@github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(text);
  return match ? { owner: match[1], repo: match[2] } : null;
}

// A kebab slug for the plan branch, from the request (or the target when there is no request).
export function planSlug(text, { max = 40 } = {}) {
  const slug = String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return slug || "plan";
}

export function briefError(message, code) {
  return Object.assign(new Error(message), { code });
}

// composeBrief(input) → { agent, mode, branch, message }.
//   mode        one of PLAN_MODES
//   request     the operator's words (required for plan / prd; optional context otherwise)
//   target      the PRD path (shatter) or the item ref (refine)
//   repo        { owner, repo }
//   baseBranch  the branch the plan branches from
//   workDir     the project-relative work dir (e.g. "wiki/work")
//   tags        { layers, refinements, domains }
//   settings    readHyperagentConfig(...).value
export function composeBrief({ mode, request, target, repo, baseBranch, workDir, tags, settings }) {
  if (!PLAN_MODES.includes(mode)) throw briefError(`Unknown hyperplan mode "${mode}". Expected one of: ${PLAN_MODES.join(", ")}.`, "hyperagent-mode-unknown");
  const words = String(request ?? "").trim();
  const subject = String(target ?? "").trim();
  if ((mode === "plan" || mode === "prd") && words === "") throw briefError(`Mode "${mode}" needs the request — what should be planned?`, "hyperagent-request-missing");
  if ((mode === "shatter" || mode === "refine") && subject === "") throw briefError(`Mode "${mode}" needs its target — ${mode === "shatter" ? "the PRD path" : "the item ref (NN or NN/SS)"}.`, "hyperagent-target-missing");
  if (!repo?.owner || !repo?.repo) throw briefError("The GitHub repository could not be resolved — pass --repo <owner/name>.", "hyperagent-repo-unresolved");
  if (!isSafeBranch(baseBranch)) throw briefError(`"${baseBranch}" is not a usable base branch.`, "hyperagent-base-invalid");

  const branch = `${settings.branchPrefix}${planSlug(words || subject)}`;
  const vocabulary = ["layers", "refinements", "domains"]
    .map((group) => `${group}: ${(Array.isArray(tags?.[group]) && tags[group].length > 0) ? tags[group].join(" ") : "(none configured)"}`)
    .join("; ");

  const lines = [
    `You are being asked to plan work for an AOF (Agent Orchestration Framework) repository. This brief was sent by AOF's hyperplan command from the operator's coding session; the operator cannot see this thread until you finish, so work from this brief alone and ask only what it cannot answer.`,
    "",
    "## Task",
    "",
    MODE_STEPS[mode],
    "",
    ...(words ? ["**Request (the operator's words):**", "", ...words.split(/\r?\n/).map((line) => `> ${line}`), ""] : []),
    ...(mode === "shatter" ? [`**PRD:** \`${subject}\``, ""] : []),
    ...(mode === "refine" ? [`**Item:** \`${subject}\``, ""] : []),
    "## Repository",
    "",
    `- GitHub: \`${repo.owner}/${repo.repo}\` — use the connected GitHub integration for this repository.`,
    `- Base branch: \`${baseBranch}\`. Write only to the branch \`${branch}\` (create it from the base; reuse it if it already exists for this plan).`,
    `- Work directory: \`${workDir}\`. Every driver you create is written un-numbered in \`${workDir}/backlog/\`; numbers are minted later by the operator.`,
    `- Closed tag vocabulary (work.tags): ${vocabulary}.`,
    "",
    "## Rules",
    "",
    "- Follow the AOF skills you were given (`aof-prd`, `aof-shatter`, `aof-refine`, `aof-validate`) and their Hyperagent execution contract.",
    "- Never write the default branch, never merge, never write source code or tests, never claim to have run an `aof` command.",
    "- Apply the validate checklist before every push, then open (or update) one **draft** pull request against the base branch whose body lists the files, the open questions and the operator's next commands.",
    "- If a business question blocks you, ask it in this thread and wait — the operator's session relays it and sends the answer back. Never invent the answer.",
    "",
    "## Finish with the result block",
    "",
    "End your final message with exactly this block (no other text after it):",
    "",
    "```",
    RESULT_BLOCK_MARKER,
    "status: delivered | blocked",
    "pr: <the pull request URL, or none>",
    `branch: ${branch}`,
    "open-questions: <number of open questions listed in the pull request>",
    "```"
  ];

  return { agent: settings.agent, mode, branch, message: `${lines.join("\n")}\n` };
}
