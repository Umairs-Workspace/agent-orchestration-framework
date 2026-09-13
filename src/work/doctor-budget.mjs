// work:doctor — milestone 16: the DOC-BLOAT / CONTEXT-BUDGET check-group. A single
// PURE `(snapshot, ctx) => Finding[]` function APPENDED to the engine's CHECK_GROUPS
// registry (milestone 16 / ADR-001) — it edits no existing group and no spine control
// flow. The module NAME (`work-doctor-budget.mjs`) is load-bearing: it puts the group
// under the `work-doctor*.mjs` determinism glob so the no-wall-clock invariant
// auto-covers it (ADR-001, ADR-003).
//
// PURITY (ADR-002): the group reads ONLY the per-artifact line counts the snapshot
// already recorded (`item.docSizes`, measured from text the snapshot already read) and
// the RESOLVED budgets handed in on `ctx.budgets` (ADR-005). It performs NO filesystem
// read of its own and reads NO wall-clock. The budget NUMBERS live ONLY in the
// `budgetsFromConfig` resolver (work-doctor.mjs) — this body holds no budget literal.
//
// Code + severity (ADR-004, fixed in the task .feature Examples):
//   doc-over-budget (warn) — fired ONCE per over-budget artifact, anchored at the
//   over-budget FILE's raw absolute path, naming the artifact + measured lines + budget.
import path from "node:path";

// Each budgeted artifact filename → the `ctx.budgets` key for its kind. SESSION.md
// (uat) is deliberately absent — it is not a budgeted long-form context doc.
// The story build brief's basename, EXPORTED so the snapshot's probe and this map name the same
// file once rather than twice (milestone 96 / ADR-006 §1 — one row, and one spelling of it).
export const PLAN_BASENAME = "PLAN.md";

const BUDGET_KEY = {
  "SPEC.md": "spec",
  "ARCHITECTURE.md": "architecture",
  "STORY.md": "story",
  // milestone 96 / ADR-006 §1 — the story build brief joins the family as ONE ROW. It arrives with
  // no check, no finding code and no severity of its own: a second length rule would be a second
  // authority over the same question, and the first thing that happens to two authorities is that
  // one of them is updated. A story carrying no PLAN.md contributes no docSizes entry, so it is
  // SILENT here rather than measured as zero-length.
  [PLAN_BASENAME]: "plan",
};

// Task contracts are budgeted by EXTENSION, not by name — a story holds arbitrarily
// many `tasks/<slug>.feature`, each budgeted individually against the `feature` kind.
// The snapshot keys them `tasks/<name>`, which is also the finding's anchor suffix.
//
// EXPORTED (story 80 / task 00) so "which filenames are budgeted" is READABLE as a
// fact rather than inferred from a finding's absence. OUTCOME.md is deliberately not
// among them for ANY type: the Accept-time artifact a story or chore now carries too
// adds no `doc-over-budget` finding — it RELIEVES the one a parentless story fires by
// giving delivered-state somewhere to live other than STORY.md.
export function budgetKeyFor(docName) {
  if (BUDGET_KEY[docName]) return BUDGET_KEY[docName];
  return docName.endsWith(".feature") ? "feature" : undefined;
}

// doc-over-budget: for each item, each recorded per-artifact line count that is
// STRICTLY GREATER THAN the resolved budget for that artifact kind fires one finding,
// anchored at that artifact's own file (so a milestone with both SPEC.md and
// ARCHITECTURE.md over budget yields two distinct findings). A doc AT its budget is
// healthy (the strictly-greater convention). Within budget ⇒ silent (no "ok" rows).
export function budgetGroup(snapshot, ctx) {
  const budgets = ctx?.budgets ?? {};
  const findings = [];

  for (const item of snapshot.items) {
    const docSizes = item.docSizes ?? {};
    for (const [docName, size] of Object.entries(docSizes)) {
      const key = budgetKeyFor(docName);
      const budget = budgets[key];
      const lines = size?.lines;
      if (key == null || budget == null || lines == null) continue;
      if (lines > budget) {
        // ADR-007: the measurement is always visible as a warning. It becomes a
        // refusal ONLY in the accepting item's scoped preflight, identified by the
        // exact ref injected by the status door. A stream sweep never supplies it;
        // a done item can never reach that door again.
        const accepting = ctx?.acceptingRef === item.ref;
        findings.push({
          code: "doc-over-budget",
          severity: accepting ? "error" : "warn",
          path: path.join(item.dir, docName),
          message: `${docName} is ${lines} lines, over the ${budget}-line budget for ${item.type} ${item.ref}`,
        });
      }
    }
  }

  return findings;
}
