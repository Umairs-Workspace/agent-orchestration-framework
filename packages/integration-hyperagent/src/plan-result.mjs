// Read the planner's answer back: the RESULT BLOCK the brief asks the planner to end with
// (`AOF-PLAN-RESULT` … in a fenced block), falling back to the first GitHub pull-request URL and the
// first plan branch named in the text when the block is missing or partial. Pure; never throws.
import { RESULT_BLOCK_MARKER } from "./brief.mjs";
import { isSafeBranch } from "./config.mjs";

const PR_URL = /https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)/;

export function parsePlanResult(text, { branchPrefix = "aof/plan/" } = {}) {
  const body = String(text ?? "");
  const fields = {};
  const at = body.lastIndexOf(RESULT_BLOCK_MARKER);
  if (at !== -1) {
    for (const line of body.slice(at + RESULT_BLOCK_MARKER.length).split(/\r?\n/)) {
      if (line.trim().startsWith("```")) break;
      const match = /^\s*([a-z-]+)\s*:\s*(.*?)\s*$/.exec(line);
      if (match) fields[match[1]] = match[2];
    }
  }

  const prSource = fields.pr && PR_URL.test(fields.pr) ? fields.pr : body;
  const pr = PR_URL.exec(prSource);
  const branchFromBlock = isSafeBranch(fields.branch) ? fields.branch : null;
  const escaped = branchPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const branchInText = new RegExp(`(?:^|[\\s\`'"(])(${escaped}[A-Za-z0-9._/-]+)`).exec(body)?.[1]?.replace(/[.,;:)]+$/, "");
  const branch = branchFromBlock ?? (isSafeBranch(branchInText) ? branchInText : null);
  const status = fields.status === "delivered" || fields.status === "blocked" ? fields.status : (pr ? "delivered" : "unknown");
  const openQuestions = /^\d+$/.test(fields["open-questions"] ?? "") ? Number(fields["open-questions"]) : null;

  return {
    found: at !== -1,
    status,
    pr: pr ? { url: pr[0], owner: pr[1], repo: pr[2], number: Number(pr[3]) } : null,
    branch,
    openQuestions
  };
}
