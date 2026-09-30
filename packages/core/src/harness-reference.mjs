// THE REFERENCE CORPUS — WHAT EVERYONE ELSE SHIPS, WRITTEN DOWN ONCE (milestone 77 / story 03).
// ADR-007 §1, §2, §2a, §2b.
//
// ── WHY THIS IS DATA AND NOT A RESEARCH TASK ─────────────────────────────────────────────────
//
// "Everyone else caps at N steps" is either a claim somebody can check or a rumour with the
// citation missing. Re-derived per diagnosis it is a research task, and a research task's answer
// depends on the day it ran: two reviewers asking one question a week apart get two answers and no
// way to tell which moved, the world or the search. Written down once, with a source and a date on
// every row, the same question becomes a JOIN — a diff in a pull request, read in the same pass as
// the code that moved.
//
// So every row states WHERE it came from and WHEN it was last checked. A row with no source is an
// assertion; a row with no date is an assertion that was true once. Both are refused at the row
// rather than caveated in prose, because a corpus that admits one unsourced row admits all of them.
//
// ── WHY IT LIVES UNDER `src/`, WHICH IS NOT A FILING PREFERENCE ──────────────────────────────
//
// Measured at the decision point: `scripts/install-local.mjs` copies `src/` recursively into the
// payload and copies no `wiki/` and no `scripts/` at all. A corpus filed under `wiki/` is readable
// in this repository and in no governed project — which would make the bounds rule the one rule in
// this milestone that cannot travel, in the milestone whose whole thesis is that the rules travel.
// `wiki/reference/harness-baselines.md` still exists, as a GENERATED VIEW that nothing parses
// (ADR-007 §2b); this module is the only home.
//
// Being a module also means it is reached by MODULE RESOLUTION rather than by joining a path onto
// somebody's root, so it needs neither the audited project's root nor the toolkit's. That is why
// this file derives no root, reads no file, and IMPORTS NOTHING: loading it drags no closure behind
// it, and two governed projects sharing one payload read one corpus.
//
// ── HOW THE ROWS GOT HERE, AND HOW THEY MOVE ─────────────────────────────────────────────────
//
// Each row records a default the named system SHIPS, with the document that states it. They are
// re-confirmed by `scripts/refresh-harness-reference.mjs` — a hand-run program that no registered
// command names and that the audit family's import closure cannot reach (ADR-007 §3), because a
// rule that silently fetches is a rule whose result depends on the day it ran. Nothing on the audit
// path touches the network; the `source` values below are DATA, and the only thing that dereferences
// one is the refresh, by hand.
//
// The vocabulary note that ADR-007 §1 exists for: nothing here is a `baseline`. That word already
// means the census's shrink-only exemption ledger, one directory over, with its own two finding
// codes. A table of what other systems ship has nothing in common with that but the letters.

// The six fields, and no seventh. A row that carried a seventh would be a row whose extra fact no
// reader of this corpus is obliged to render, which is how a second, quieter vocabulary starts.
export const REFERENCE_ROW_FIELDS = Object.freeze(["id", "bound", "value", "system", "source", "checked"]);

// NON-VACUITY, ASSERTED RATHER THAN ASSUMED. A corpus that emptied would pass every check it has
// while comparing nothing — the same failure a sweep with no floor has, one file over.
export const REFERENCE_ROW_FLOOR = 1;

// The bound a row measures is a NAME CARRYING ITS UNIT, because the join compares a declared number
// against these numbers and a comparison across units is a bug with a plausible-looking value. Two
// systems' rows meet only where their units already agree.
// <<< reference rows — rendered by scripts/refresh-harness-reference.mjs; edit the sources, not this block
export const HARNESS_REFERENCE_ROWS = Object.freeze([
  Object.freeze({
    id: "langchain-agent-executor-max-iterations",
    bound: "agent step ceiling (steps)",
    value: 15,
    system: "LangChain AgentExecutor",
    source: "https://raw.githubusercontent.com/langchain-ai/langchain/master/libs/langchain/langchain_classic/agents/agent.py",
    checked: "2026-09-04",
  }),
  Object.freeze({
    id: "openai-agents-runner-max-turns",
    bound: "agent step ceiling (steps)",
    value: 10,
    system: "OpenAI Agents SDK Runner",
    source: "https://raw.githubusercontent.com/openai/openai-agents-python/main/src/agents/run_config.py",
    checked: "2026-09-04",
  }),
  Object.freeze({
    id: "github-actions-job-timeout-minutes",
    bound: "job wall-clock ceiling (minutes)",
    value: 360,
    system: "GitHub Actions",
    source: "https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions",
    checked: "2026-09-04",
  }),
  Object.freeze({
    id: "kubernetes-job-backoff-limit",
    bound: "retry attempt ceiling (attempts)",
    value: 6,
    system: "Kubernetes Job",
    source: "https://kubernetes.io/docs/concepts/workloads/controllers/job/",
    checked: "2026-09-04",
  }),
  Object.freeze({
    id: "temporal-workflow-task-timeout-seconds",
    bound: "task wall-clock ceiling (seconds)",
    value: 10,
    system: "Temporal",
    source: "https://docs.temporal.io/encyclopedia/detecting-workflow-failures",
    checked: "2026-09-04",
  }),
  Object.freeze({
    id: "aws-step-functions-standard-execution-days",
    bound: "execution wall-clock ceiling (days)",
    value: 365,
    system: "AWS Step Functions (Standard Workflows)",
    source: "https://docs.aws.amazon.com/step-functions/latest/dg/service-quotas.html",
    checked: "2026-09-04",
  }),
]);
// >>> reference rows

// An ISO calendar date that ROUND-TRIPS. `new Date("2026-02-31")` is not an error in JavaScript and
// `Date.parse` admits a great deal that no reader would call a date, so the admitted form is stated
// and the parse is checked against it rather than trusted.
export function parseCheckedDate(raw) {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(raw)) return null;
  const ms = Date.parse(`${raw}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10) === raw ? ms : null;
}

// A source is an address a reader can open. A bare word is a note to self.
function isSourceUrl(raw) {
  return typeof raw === "string" && /^https?:\/\/\S+$/u.test(raw);
}

/**
 * PURE. The problems with a set of reference rows — one per row that cannot be checked, plus the
 * non-vacuity floor. Every message names the row's own id and the field that failed, because a
 * corpus refusal a reader cannot act on is a refusal they will delete.
 */
export function referenceCorpusProblems(rows) {
  if (!Array.isArray(rows)) {
    return ["the reference corpus is not a list of rows — a corpus that states nothing states nothing checkably"];
  }
  const problems = [];
  if (rows.length < REFERENCE_ROW_FLOOR) {
    problems.push(`the reference corpus read ${rows.length} row(s) of a required ${REFERENCE_ROW_FLOOR} — an emptied corpus passes every check it has while comparing nothing`);
  }
  const seen = new Map();
  for (const [position, row] of rows.entries()) {
    const id = typeof row?.id === "string" && row.id.length > 0 ? row.id : `<row ${position}>`;
    if (typeof row?.id !== "string" || row.id.length === 0) {
      problems.push(`${id} declares no id, so a finding citing it could not name it`);
    } else if (seen.has(row.id)) {
      problems.push(`the id "${row.id}" names two rows (positions ${seen.get(row.id)} and ${position}) — an id names exactly one row, so a finding that cites one cites one thing`);
    } else {
      seen.set(row.id, position);
    }
    if (typeof row?.bound !== "string" || row.bound.length === 0) {
      problems.push(`${id} declares no bound, so there is nothing for a declared value to be joined against`);
    }
    if (typeof row?.value !== "number" || !Number.isFinite(row.value)) {
      problems.push(`${id} declares no value — a reference row with nothing to compare is a citation with no claim in it`);
    }
    if (typeof row?.system !== "string" || row.system.length === 0) {
      problems.push(`${id} declares no system, so the row says what is shipped without saying who ships it`);
    }
    if (!isSourceUrl(row?.source)) {
      problems.push(`${id} declares no usable source (${JSON.stringify(row?.source ?? null)}) — a row with no source URL is an assertion, and a corpus that admits one unsourced row admits all of them`);
    }
    if (parseCheckedDate(row?.checked) == null) {
      problems.push(`${id} declares no parseable checked date (${JSON.stringify(row?.checked ?? null)}) — a row with no date is an assertion that was true once`);
    }
    const extra = row == null || typeof row !== "object" ? [] : Object.keys(row).filter((key) => !REFERENCE_ROW_FIELDS.includes(key));
    if (extra.length > 0) {
      problems.push(`${id} carries ${extra.map((key) => `\`${key}\``).join(", ")}, which is outside the six fields a row may declare`);
    }
  }
  return problems;
}

/**
 * The check as an ANSWER rather than a boolean: it says how many rows it read, so "the corpus is
 * fine" and "the corpus is empty and therefore uncontradicted" cannot render the same way.
 */
export function checkReferenceCorpus(rows = HARNESS_REFERENCE_ROWS) {
  const problems = referenceCorpusProblems(rows);
  return Object.freeze({
    admitted: problems.length === 0,
    count: Array.isArray(rows) ? rows.length : 0,
    floor: REFERENCE_ROW_FLOOR,
    problems: Object.freeze(problems),
  });
}

/** The distinct bounds the corpus carries, in the order the rows declare them. */
export function referenceBounds(rows = HARNESS_REFERENCE_ROWS) {
  const bounds = [];
  for (const row of rows) if (typeof row?.bound === "string" && !bounds.includes(row.bound)) bounds.push(row.bound);
  return Object.freeze(bounds);
}
