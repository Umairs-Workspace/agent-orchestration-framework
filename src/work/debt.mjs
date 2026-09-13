// src/work/debt.mjs — the PURE engine behind `work:debt`: parse the debt ledger, measure it
// against its budget, and compose the pruned text. No filesystem, no git, no clock — the
// `work-ratchet.mjs` / `commands/ratchet.mjs` split (57/ADR-004), for the same reason: the
// arch ratchet and the CLI face must measure with the SAME code, and a gate that has to build
// a fixture on disk to ask one question is a gate nobody runs.
//
// WHY THIS EXISTS. `wiki/work/TECH_DEBT.md` went 289 -> 4,836 lines in six weeks (2026-07-26 ->
// 2026-09-05), 91 entries averaging 53 lines, of which only 9 carried a closure status. Three
// mechanisms, all of them fixable here rather than by asking authors to remember:
//
//   1. The ledger was doing TWO jobs. Its own header called it "the evidence record" while the
//      roadmap was "the payment plan" — but an evidence record must never shrink and a backlog
//      must. Nothing ever removed a paid-down entry, so the closed half accumulated forever.
//      This module's `pruneResolved` is the second job leaving: git history and the closing
//      item's own ARCHITECTURE/VERIFICATION registers are where a discharged debt is recorded.
//   2. No entry budget. Entries grew into forensic essays (items 78-90 average 56 lines, with
//      tables and cross-milestone ADR history) because the writing prompt asked for three facts
//      and named no size. `DEBT_BUDGET.entryLines` is that number, in one home.
//   3. Nothing measured it. This repository ratchets file size, sibling counts and silent
//      catches; the one file that indicts unbounded growth was itself governed by nothing.
//
// THE RATCHET IS SHRINK-ONLY, AND THAT IS THE ONLY HONEST SHAPE HERE. An absolute cap would be
// red on 91 grandfathered entries from the day it landed, and a gate that is red on a clean tree
// is a gate that gets ignored (this tree's item 27, measured twice). So the budget records where
// the ledger IS and forbids growth: totals and the oversize-entry count may fall freely and may
// never rise. A new entry over `entryLines` raises the oversize count, so the cap binds on new
// writing without demanding a rewrite of the old.
//
// ONE THING THIS DELIBERATELY IS NOT, and `acd-ui-surface-file-budget`'s ADR-014/E3 warning is
// why it needs saying: that ceiling is "not satisfiable by deleting explanation", because there
// the explanation is load-bearing at its site. HERE, DELETING EXPLANATION IS THE FIX. A debt
// entry's forensics belong in the reviewing item's own registers, which are immutable and dated;
// the ledger holds the decision an operator schedules from. Moving prose out of this file to the
// record that owns it is the outcome, not an evasion of the number.

// The ledger's basename. Sibling to `ROADMAP.md` and `loops.md` at the work directory root
// (see `src/loop-document.mjs`'s note on tracked non-item files).
export const DEBT_LEDGER_BASENAME = "TECH_DEBT.md";

// The command a reader who finds the ledger over budget must run. ONE home for the string: the
// CLI face names it, the ratchet's failure message names it, neither spells it twice.
export const PRUNE_COMMAND = "aof work debt --prune --write";

export const DEBT_FINDING_CODES = Object.freeze([
  // An entry longer than the per-entry budget — forensics that belong in the reviewing item's
  // own ARCHITECTURE/VERIFICATION register rather than in the schedulable backlog.
  "debt-entry-oversize",
  // An entry with no `**Status:**` line at all: 34 of 91 entries had none on 2026-09-05, which
  // is what made the ledger unprunable by anything but a human reading all of it.
  "debt-entry-unstatused",
  // A resolved entry still occupying the ledger. Prunable — the closing item's ref is its record.
  "debt-entry-resolved",
  // The ledger as a whole is above its recorded ceiling.
  "debt-ledger-oversize",
  // More oversize entries than the recorded ceiling — the per-entry cap, ratcheted.
  "debt-oversize-count",
]);

// THE BUDGET, IN ONE HOME. `entryLines` is a judgement (what a schedulable backlog entry needs:
// what's wrong, how it bites, the shape of the fix, one citation — the four things the architect
// prompt now asks for, and nothing else). The two `max*` numbers are MEASUREMENTS, re-stamped
// downward as the ledger shrinks and never upward without an ADR — that is what makes this a
// ratchet rather than a limit.
export const DEBT_BUDGET = Object.freeze({
  entryLines: 12,
  // Re-stamp these DOWN with `aof work debt --json` after a prune. Raising either is a decision
  // that needs an ADR, not a diff — the whole point is that the next accretion has nowhere to go.
  //
  // Stamped 2026-09-05 from the measured ledger, after the header rewrite and the first prune
  // (91 entries / 4,836 lines -> 86 / 4,626; items 3, 5, 50, 70 and 72 discharged).
  //
  // RE-STAMPED 2026-09-05 at `aof:pay-debt` (86 / 4,626 -> 79 / 4,271). Items 11, 51 and 80 were
  // FIXED at that pass; 17, 60, 62 and 68 measured DEAD; 48 was compressed to the one half of it
  // that is still live. The five entries that pass touched and deferred each gained the `Status:`
  // line they had never carried, which is why the total fell less than the deletions did — an
  // unstatused entry is one nothing can ever discharge, and buying that costs lines. All 79
  // remaining entries are over `entryLines`, so the count ceiling sits AT the entry count — a new
  // entry within budget is free, and one over budget is red.
  //
  // RE-STAMPED again 2026-09-05, paying item 24 (79 / 4,271 -> 78 / 4,089): all 29 live
  // block-first comment strippers corrected, and `acd-comment-stripper-order` landed so the 30th
  // cannot arrive unseen.
  //
  // RE-STAMPED 2026-09-06: item 48 restored to the vocabulary 52/05's landed control pins,
  // and item 71 re-measured and refused (both its stated fixes are ADR-level). 4,089 -> 4,082.
  //
  // RE-STAMPED 2026-09-07 at `aof:verify 119` (78 / 4,082 -> 73 / 3,634). Items 10, 61, 63, 78 and
  // 84 DISCHARGED and deleted — milestone 119 gave `src/`, `src/commands/` and the test tree their
  // interiors, ruled the purity guard that forbade the fix, and moved the registry's per-command
  // prose into the command modules. Items 81 and 83 were the milestone's other two and are
  // deliberately KEPT: 83 is half split (seams 3 and 4 remain, `m119/F-37`), and 81's ruling landed
  // while its four NAMED carriers did not — and 119 found four further species the entry does not
  // name, so it is more alive than when it was written (`m119/F-02`). Measured with `aof work debt`.
  maxTotalLines: 3634,
  maxOversizeEntries: 72,
});

// A heading is the parse anchor and the ONE thing the ledger has always been consistent about:
// all 91 entries matched `## <n>. <title>` on 2026-09-05. Anything else at `##` is not an entry.
const ENTRY_HEADING = /^##\s+(\d+)\.\s+(.*)$/u;

// The status line, as every entry that has one writes it.
const STATUS_LINE = /^\*\*Status:\*\*\s*(.*)$/u;

// A `file:line` citation as entries actually spell one: backticked, forward-slashed, optionally
// carrying a `:123` or `:123-456` locator. Measured 2026-09-05: 74 of 86 entries cite at least one
// live path this way, which is what makes "what debt lives in the files I am reviewing?" a
// question the ledger can answer mechanically rather than by being read end to end.
const CITED_PATH = /`([A-Za-z0-9_@./-]+\.(?:mjs|tsx|ts|jsonc?|md|sh))(?::\d+(?:-\d+)?)?`/gu;

// Words that mean the debt is DISCHARGED. Matched at the head of the status text only, so
// "CLOSED 2026-09-03 by milestone 77 / story 04" resolves and a body sentence mentioning a
// closure elsewhere does not.
const RESOLVED_HEAD = /^(?:closed|addressed|paid\s+down|resolved|done|fixed|superseded|withdrawn)\b/iu;

// Qualifiers that REFUSE the resolution above. "largely addressed" and "partially addressed" are
// open debts wearing a closure word, and pruning them would delete live work. Conservative by
// construction: anything this rule cannot prove is discharged stays in the ledger.
const QUALIFIED = /^(?:largely|partially|mostly|nearly|substantially|effectively)\b/iu;

/**
 * Classify a `**Status:**` payload.
 * @returns {"open"|"resolved"} — `unstated` is the ABSENCE of the line and is reported by the
 * parser, never by this function.
 */
export function classifyStatus(statusText) {
  const text = String(statusText ?? "").trim();
  if (QUALIFIED.test(text)) return "open";
  return RESOLVED_HEAD.test(text) ? "resolved" : "open";
}

// Split preserving the file's OWN line ending. Item 74 is the scar this pays: a control that
// reads the working tree's line endings while git normalises them out of the diff flips its
// verdict invisibly. This module never decides what an EOL should be — it round-trips what it
// was handed, so a prune of a CRLF ledger emits CRLF and shows only the removed entries.
function detectEol(text) {
  return /\r\n/u.test(text) ? "\r\n" : "\n";
}

/**
 * Parse the ledger into its preamble and its numbered entries.
 *
 * The preamble is everything before the first `## <n>.` heading — the header prose and any
 * promotion notes. It is never an entry and is never pruned.
 */
export function parseDebtLedger(text) {
  const source = String(text ?? "");
  const eol = detectEol(source);
  const lines = source.split(/\r?\n/u);
  // A file ending in a newline splits to a trailing empty element. `wc -l` does not count it and
  // neither does a ceiling an operator re-stamps from `wc -l`, so the two numbers must agree or
  // the ratchet is off by one against the only tool anybody checks it with.
  const lineCount = lines.length > 0 && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;

  const entries = [];
  let preambleEnd = lines.length;

  for (let index = 0; index < lines.length; index += 1) {
    const match = ENTRY_HEADING.exec(lines[index]);
    if (!match) continue;
    if (entries.length === 0) preambleEnd = index;
    entries.push({
      number: Number(match[1]),
      title: match[2].trim(),
      // 1-based, as an editor and a `file:line` citation count.
      startLine: index + 1,
      startIndex: index,
    });
  }

  for (let position = 0; position < entries.length; position += 1) {
    const entry = entries[position];
    const nextIndex = entries[position + 1]?.startIndex ?? lines.length;
    const body = lines.slice(entry.startIndex, nextIndex);
    entry.endLine = nextIndex;
    entry.lines = body;
    // The heading itself counts. An entry IS its heading plus its body — that is what a reader
    // pays to scroll past, so it is what the budget measures.
    entry.lineCount = trimTrailingBlanks(body).length;

    const statusMatch = body.map((line) => STATUS_LINE.exec(line)).find(Boolean);
    entry.statusText = statusMatch ? statusMatch[1].trim() : null;
    entry.status = statusMatch ? classifyStatus(statusMatch[1]) : "unstated";

    // Only DIRECTORY-qualified citations count. A bare `work.mjs` in prose is ambiguous across a
    // tree with 315 modules, and matching it would attach entries to files they never named.
    entry.citedPaths = [...new Set([...body.join("\n").matchAll(CITED_PATH)].map((match) => match[1]).filter((cited) => cited.includes("/")))];
  }

  return {
    eol,
    preamble: lines.slice(0, preambleEnd),
    entries,
    totalLines: lineCount,
  };
}

// Blank lines and the `---` rules between entries are separators, not content, and counting them
// against the author would make the budget depend on the house style rather than on what was
// written. Trailing separators are dropped from the measured span only.
function trimTrailingBlanks(body) {
  let end = body.length;
  while (end > 0 && (body[end - 1].trim() === "" || body[end - 1].trim() === "---")) end -= 1;
  return body.slice(0, end);
}

/**
 * Measure a parsed ledger against the budget.
 *
 * Returns basis-neutral data: findings carry the entry number and the measured numbers, never a
 * rendered sentence — the CLI face and the arch ratchet phrase them differently and both are
 * entitled to.
 */
export function evaluateDebtLedger(parsed, budget = DEBT_BUDGET) {
  const findings = [];
  const oversize = [];
  const resolved = [];
  const unstated = [];

  for (const entry of parsed.entries) {
    if (entry.lineCount > budget.entryLines) {
      oversize.push(entry);
      findings.push({
        code: "debt-entry-oversize",
        level: "warn",
        number: entry.number,
        line: entry.startLine,
        measured: entry.lineCount,
        budget: budget.entryLines,
        title: entry.title,
      });
    }
    if (entry.status === "unstated") {
      unstated.push(entry);
      findings.push({
        code: "debt-entry-unstatused",
        level: "warn",
        number: entry.number,
        line: entry.startLine,
        title: entry.title,
      });
    }
    if (entry.status === "resolved") {
      resolved.push(entry);
      findings.push({
        code: "debt-entry-resolved",
        level: "warn",
        number: entry.number,
        line: entry.startLine,
        statusText: entry.statusText,
        title: entry.title,
      });
    }
  }

  // The two ratchet legs. These are ERRORS where the per-entry findings are warnings: an
  // oversize entry is a thing to fix at leisure, growth past the recorded ceiling is the
  // failure this whole module exists to make impossible.
  if (parsed.totalLines > budget.maxTotalLines) {
    findings.push({
      code: "debt-ledger-oversize",
      level: "error",
      measured: parsed.totalLines,
      budget: budget.maxTotalLines,
    });
  }
  if (oversize.length > budget.maxOversizeEntries) {
    findings.push({
      code: "debt-oversize-count",
      level: "error",
      measured: oversize.length,
      budget: budget.maxOversizeEntries,
    });
  }

  return {
    findings,
    summary: {
      entries: parsed.entries.length,
      totalLines: parsed.totalLines,
      open: parsed.entries.filter((entry) => entry.status === "open").length,
      resolved: resolved.length,
      unstated: unstated.length,
      oversize: oversize.length,
      longest: parsed.entries.reduce((worst, entry) => (entry.lineCount > (worst?.lineCount ?? 0) ? entry : worst), null)?.lineCount ?? 0,
      error: findings.filter((finding) => finding.level === "error").length,
      warn: findings.filter((finding) => finding.level === "warn").length,
    },
  };
}

// Compare two repo-relative paths the way a caller will actually supply them: OS separators from a
// shell completion, forward slashes from a citation, and sometimes an absolute path. Normalise
// both and match on the SUFFIX, so `src/work.mjs` finds an entry citing `src/work.mjs` whether the
// caller typed `src\work.mjs`, `./src/work.mjs` or the absolute path.
function normalizePath(value) {
  return String(value ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//u, "")
    .toLowerCase();
}

function pathsMatch(cited, queried) {
  const a = normalizePath(cited);
  const b = normalizePath(queried);
  if (a === b) return true;
  // Suffix match on a SEGMENT boundary only — `src/work.mjs` must not match `src/network.mjs`.
  return a.endsWith(`/${b}`) || b.endsWith(`/${a}`);
}

/**
 * The entries whose own citations name any of `paths`.
 *
 * THIS IS THE LEVER THAT MAKES THE LEDGER DRAINABLE BY ORDINARY WORK. The routing rule says fix
 * debt inside the item that touches it, but an architect could not act on that without reading
 * 4,626 lines to find out what debt lives in the files under review — so it never did, and the
 * ledger only ever grew. Asking the question by file turns "pay this down someday" into a
 * question with an answer at the moment somebody is already in the code.
 */
export function entriesTouching(parsed, paths) {
  const queries = (Array.isArray(paths) ? paths : [paths]).filter((value) => String(value ?? "").trim() !== "");
  if (queries.length === 0) return [];
  const touched = [];
  for (const entry of parsed.entries) {
    // Only the paths the caller ASKED about come back. Item 10 cites fifteen files; a reader who
    // asked about one of them wants to know it is named there, not to be handed the other
    // fourteen — reporting the whole citation list is how a narrowing face stops narrowing.
    const matchedPaths = entry.citedPaths.filter((cited) => queries.some((queried) => pathsMatch(cited, queried)));
    if (matchedPaths.length > 0) touched.push({ ...entry, matchedPaths });
  }
  return touched;
}

/**
 * Compose the ledger with every RESOLVED entry removed.
 *
 * NUMBERS ARE NEVER REASSIGNED. Item 47 is cited by name in four other entries and by `file:line`
 * from a dozen source comments; renumbering to close the gaps would invalidate every one of them
 * silently. The sequence is allowed to have holes — a hole is a discharged debt, and git blame on
 * this file is where it went.
 *
 * @returns {{ text: string, removed: Array, changed: boolean }}
 */
export function pruneResolved(parsed, originalText) {
  const source = String(originalText ?? "");
  const lines = source.split(/\r?\n/u);
  const removed = parsed.entries.filter((entry) => entry.status === "resolved");

  if (removed.length === 0) return { text: source, removed, changed: false };

  const drop = new Set();
  for (const entry of removed) {
    for (let index = entry.startIndex; index < entry.endLine; index += 1) drop.add(index);
  }

  const kept = lines.filter((_line, index) => !drop.has(index));
  const text = kept.join(parsed.eol);
  return { text, removed, changed: text !== source };
}
