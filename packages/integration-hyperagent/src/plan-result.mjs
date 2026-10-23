// Read the planner's answer back: the RESULT BLOCK the brief asks the planner to end with
// (`AOF-PLAN-RESULT` … in a fenced block), falling back to the first GitHub pull-request URL and the
// first plan branch named in the text when the block is missing or partial. Pure; never throws.
import { RESULT_BLOCK_MARKER } from "./brief.mjs";
import { isSafeBranch } from "./config.mjs";

const PR_URL = /https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)/;

// A branch quoted in prose drops the sentence's trailing punctuation, by index: an anchored
// `[.,;:)]+$` backtracks polynomially on a long run of `)` (CodeQL js/polynomial-redos).
function trimTrailingPunctuation(value) {
  if (value == null) return value;
  let end = value.length;
  while (end > 0 && ".,;:)".includes(value[end - 1])) end -= 1;
  return value.slice(0, end);
}

export function parsePlanResult(text, { branchPrefix = "aof/plan/" } = {}) {
  const body = String(text ?? "");
  const fields = {};
  const at = body.lastIndexOf(RESULT_BLOCK_MARKER);
  if (at !== -1) {
    for (const line of body.slice(at + RESULT_BLOCK_MARKER.length).split(/\r?\n/)) {
      if (line.trim().startsWith("```")) break;
      // `key: value`, split at the first colon by index rather than one anchored regex with `\s*`
      // on both sides, which backtracks polynomially on a planner's reply (CodeQL js/polynomial-redos).
      const colon = line.indexOf(":");
      if (colon === -1) continue;
      const key = line.slice(0, colon).trim();
      if (/^[a-z-]+$/.test(key)) fields[key] = line.slice(colon + 1).trim();
    }
  }

  const prSource = fields.pr && PR_URL.test(fields.pr) ? fields.pr : body;
  const pr = PR_URL.exec(prSource);
  const branchFromBlock = isSafeBranch(fields.branch) ? fields.branch : null;
  const escaped = branchPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const branchInText = trimTrailingPunctuation(new RegExp(`(?:^|[\\s\`'"(])(${escaped}[A-Za-z0-9._/-]+)`).exec(body)?.[1]);
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
