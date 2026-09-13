// Unit coverage for `src/work/debt.mjs` — the pure tech-debt ledger engine behind `work:debt`.
//
// Every case here is a defect the REAL ledger exhibited on 2026-09-05, when it stood at 4,836
// lines across 91 entries: inconsistent status wording (`open` / `CLOSED …` / `PAID DOWN …` /
// `largely addressed`), 34 entries with no status line at all, entries running to 193 lines, and
// CRLF throughout. The engine is pure, so these run against strings — no fixture repo, no clock.
import assert from "node:assert/strict";

import {
  DEBT_BUDGET,
  classifyStatus,
  entriesTouching,
  evaluateDebtLedger,
  parseDebtLedger,
  pruneResolved,
} from "../../../src/work/debt.mjs";

// A ledger built from parts, so each test states only what it is about. `eol` is a parameter
// because line endings are the one thing this engine must round-trip rather than decide (item 74).
function ledger(entries, { eol = "\n", preamble = "# tech debt\n\nKnown structural debt.\n" } = {}) {
  const body = entries
    .map(({ number, title, status, filler = 0 }) => {
      const lines = [`## ${number}. ${title}`, ""];
      if (status !== undefined) lines.push(`**Status:** ${status}`, "");
      for (let index = 0; index < filler; index += 1) lines.push(`Body line ${index + 1}.`);
      lines.push("", "---", "");
      return lines.join("\n");
    })
    .join("\n");
  return `${preamble}\n${body}`.split("\n").join(eol);
}

export const workDebtTests = [
  {
    name: "work-debt: every `## <n>. <title>` heading parses, and the preamble is not an entry",
    run: async () => {
      const parsed = parseDebtLedger(
        ledger([
          { number: 1, title: "First", status: "open" },
          { number: 2, title: "Second", status: "open" },
        ])
      );
      assert.equal(parsed.entries.length, 2, "two entries");
      assert.deepEqual(
        parsed.entries.map((entry) => entry.number),
        [1, 2]
      );
      assert.equal(parsed.entries[0].title, "First");
      assert.ok(parsed.preamble.join("\n").includes("Known structural debt"), "the header stays in the preamble");
    },
  },

  {
    name: "work-debt: a closure word at the head of the status resolves; a qualifier refuses it",
    run: async () => {
      // The real vocabulary, verbatim from the ledger.
      assert.equal(classifyStatus("open (raised 2026-07-26 by the operator)"), "open");
      assert.equal(classifyStatus("CLOSED 2026-09-03 by milestone 77 / story 04"), "resolved");
      assert.equal(classifyStatus("PAID DOWN 2026-08-29 by milestone 59 / story 01"), "resolved");
      assert.equal(classifyStatus("ADDRESSED (2026-07-26, milestone 42 wave (a))"), "resolved");
      // The conservative half, and the one that matters: a qualified closure is LIVE work, and
      // pruning it would delete a debt nobody discharged.
      assert.equal(classifyStatus("largely addressed (2026-07-26)"), "open");
      assert.equal(classifyStatus("partially addressed (2026-07-26)"), "open");
    },
  },

  {
    name: "work-debt: an entry with no `**Status:**` line reports `unstated`, never `open`",
    run: async () => {
      // 34 of the ledger's 91 entries were in exactly this state, which is what made it
      // unprunable by anything but a human reading all of it. Silently defaulting to `open`
      // would hide the schema gap; silently defaulting to `resolved` would delete live debt.
      const parsed = parseDebtLedger(ledger([{ number: 14, title: "No status here" }]));
      assert.equal(parsed.entries[0].status, "unstated");
      assert.equal(parsed.entries[0].statusText, null);

      const { findings, summary } = evaluateDebtLedger(parsed);
      assert.equal(summary.unstated, 1);
      assert.ok(
        findings.some((finding) => finding.code === "debt-entry-unstatused" && finding.number === 14),
        "the gap is a finding against the entry that has it"
      );
    },
  },

  {
    name: "work-debt: the per-entry budget measures heading + body, discounting trailing separators",
    run: async () => {
      const parsed = parseDebtLedger(
        ledger([
          { number: 1, title: "Short", status: "open", filler: 2 },
          { number: 2, title: "Long", status: "open", filler: 40 },
        ])
      );
      // heading + blank + status + blank + 2 body = 6, under the 12-line budget.
      assert.ok(parsed.entries[0].lineCount <= DEBT_BUDGET.entryLines, `short entry is ${parsed.entries[0].lineCount} lines`);
      assert.ok(parsed.entries[1].lineCount > DEBT_BUDGET.entryLines, `long entry is ${parsed.entries[1].lineCount} lines`);

      const { findings, summary } = evaluateDebtLedger(parsed);
      assert.equal(summary.oversize, 1, "only the long one is over");
      const oversize = findings.find((finding) => finding.code === "debt-entry-oversize");
      assert.equal(oversize.number, 2);
      assert.equal(oversize.budget, DEBT_BUDGET.entryLines);
      assert.equal(oversize.level, "warn", "an oversize entry is a thing to fix, not a build failure");
    },
  },

  {
    name: "work-debt: the two ratchet legs are ERRORS, and they gate on growth rather than on size",
    run: async () => {
      const parsed = parseDebtLedger(
        ledger([
          { number: 1, title: "One", status: "open", filler: 30 },
          { number: 2, title: "Two", status: "open", filler: 30 },
        ])
      );
      // At the recorded ceiling: green. This is the shape that keeps the gate runnable on a tree
      // carrying 91 grandfathered entries — a gate red on a clean tree is a gate nobody reads.
      const atCeiling = evaluateDebtLedger(parsed, {
        entryLines: 12,
        maxTotalLines: parsed.totalLines,
        maxOversizeEntries: 2,
      });
      assert.equal(atCeiling.summary.error, 0, "at the ceiling is green");

      // One line over, or one oversize entry more: red.
      const overLines = evaluateDebtLedger(parsed, { entryLines: 12, maxTotalLines: parsed.totalLines - 1, maxOversizeEntries: 2 });
      assert.ok(
        overLines.findings.some((finding) => finding.code === "debt-ledger-oversize" && finding.level === "error"),
        "growth past the line ceiling is an error"
      );
      const overCount = evaluateDebtLedger(parsed, { entryLines: 12, maxTotalLines: parsed.totalLines, maxOversizeEntries: 1 });
      assert.ok(
        overCount.findings.some((finding) => finding.code === "debt-oversize-count" && finding.level === "error"),
        "one more oversize entry than recorded is an error"
      );
    },
  },

  {
    name: "work-debt: prune removes discharged entries, keeps qualified and unstated ones, and never renumbers",
    run: async () => {
      const text = ledger([
        { number: 1, title: "Live", status: "open", filler: 3 },
        { number: 2, title: "Done", status: "CLOSED 2026-09-03 by milestone 77 / story 04", filler: 3 },
        { number: 3, title: "Half done", status: "largely addressed (2026-07-26)", filler: 3 },
        { number: 4, title: "Unmarked", filler: 3 },
      ]);
      const parsed = parseDebtLedger(text);
      const { text: pruned, removed, changed } = pruneResolved(parsed, text);

      assert.equal(changed, true);
      assert.deepEqual(
        removed.map((entry) => entry.number),
        [2],
        "only the unqualified closure goes"
      );

      const after = parseDebtLedger(pruned);
      assert.deepEqual(
        after.entries.map((entry) => entry.number),
        [1, 3, 4],
        "the numbers keep their holes — item 47 is cited by four other entries and a dozen source comments, so renumbering would invalidate every citation silently"
      );
      assert.ok(after.entries.every((entry) => entry.title !== "Done"), "the discharged body is gone, not just its heading");
      assert.ok(pruned.includes("Known structural debt"), "the preamble survives");
    },
  },

  {
    name: "work-debt: a prune with nothing discharged is a no-op that reports itself as one",
    run: async () => {
      const text = ledger([{ number: 1, title: "Live", status: "open", filler: 3 }]);
      const result = pruneResolved(parseDebtLedger(text), text);
      assert.equal(result.changed, false);
      assert.equal(result.removed.length, 0);
      assert.equal(result.text, text, "byte-identical when nothing is owed");
    },
  },

  {
    name: "work-debt: a CRLF ledger round-trips as CRLF — the engine never decides an EOL",
    run: async () => {
      // Item 74's scar: a control that reads the working tree's line endings while git normalises
      // them out of the diff flips its verdict invisibly. The real ledger is CRLF throughout, so a
      // prune that emitted LF would rewrite all 4,836 lines to remove one entry.
      const text = ledger(
        [
          { number: 1, title: "Live", status: "open", filler: 2 },
          { number: 2, title: "Done", status: "CLOSED 2026-09-03", filler: 2 },
        ],
        { eol: "\r\n" }
      );
      const parsed = parseDebtLedger(text);
      assert.equal(parsed.eol, "\r\n");

      const { text: pruned } = pruneResolved(parsed, text);
      assert.ok(pruned.includes("\r\n"), "CRLF survives the prune");
      assert.ok(!/(?<!\r)\n/u.test(pruned), "no bare LF is introduced anywhere");
    },
  },

  {
    name: "work-debt: the line count agrees with `wc -l` — a trailing newline is not a line",
    run: async () => {
      // The ceiling is a number an operator re-stamps from `wc -l`. If the engine counted the
      // trailing empty split element the two would disagree by one, and the ratchet would be off
      // by one against the only tool anybody checks it with.
      const parsed = parseDebtLedger("a\nb\nc\n");
      assert.equal(parsed.totalLines, 3);
      assert.equal(parseDebtLedger("a\nb\nc").totalLines, 3, "and a file with no trailing newline counts the same");
    },
  },

  {
    name: "work-debt: entriesTouching narrows by cited path, and returns only the paths asked about",
    run: async () => {
      // The lever that makes the ledger drainable by ordinary work. Built from the real shape:
      // item 10 cites fifteen files, item 83 cites one of the same ones.
      const text = [
        "# tech debt",
        "",
        "## 10. The god-file item",
        "",
        "**Status:** open",
        "",
        "It names `src/mesh/worker-execution.mjs` and `src/mesh/launcher.mjs` and `src/cli.mjs`.",
        "",
        "---",
        "",
        "## 83. The worker-execution item",
        "",
        "**Status:** open",
        "",
        "It names `src/mesh/worker-execution.mjs:2462` with a locator.",
        "",
        "---",
        "",
        "## 90. Unrelated",
        "",
        "**Status:** open",
        "",
        "It names `src/claude-settings.mjs` only.",
        "",
      ].join("\n");
      const parsed = parseDebtLedger(text);

      const hits = entriesTouching(parsed, ["src/mesh/worker-execution.mjs"]);
      assert.deepEqual(
        hits.map((entry) => entry.number),
        [10, 83],
        "both entries citing the file, neither of the others"
      );
      assert.deepEqual(
        hits[0].matchedPaths,
        ["src/mesh/worker-execution.mjs"],
        "item 10 cites three files; only the one asked about comes back"
      );
      // A `:line` locator on the citation must not defeat the match.
      assert.deepEqual(hits[1].matchedPaths, ["src/mesh/worker-execution.mjs"]);

      // Separator and prefix tolerance — a caller types what their shell completed.
      for (const spelling of ["src\\mesh\\worker-execution.mjs", "./src/mesh/worker-execution.mjs", "SRC/MESH/WORKER-EXECUTION.MJS"]) {
        assert.equal(entriesTouching(parsed, [spelling]).length, 2, `${spelling} resolves`);
      }

      // A suffix match must respect segment boundaries, never raw string endings.
      assert.equal(entriesTouching(parsed, ["execution.mjs"]).length, 0, "a partial filename is not a match");
      assert.equal(entriesTouching(parsed, ["src/settings.mjs"]).length, 0, "`settings.mjs` must not match `claude-settings.mjs`");

      // Nothing asked, nothing returned — the bare face is the full report, not an empty one.
      assert.deepEqual(entriesTouching(parsed, []), []);
      assert.deepEqual(entriesTouching(parsed, ["src/nonexistent.mjs"]), []);
    },
  },

  {
    name: "work-debt: only directory-qualified citations count as paths",
    run: async () => {
      // A bare `work.mjs` in prose is ambiguous across a tree of 315 modules, and matching it would
      // attach entries to files they never named.
      const parsed = parseDebtLedger(
        ["# tech debt", "", "## 1. Bare mention", "", "**Status:** open", "", "It mentions `work.mjs` with no directory.", ""].join("\n")
      );
      assert.deepEqual(parsed.entries[0].citedPaths, [], "no directory, no citation");
      assert.equal(entriesTouching(parsed, ["src/work.mjs"]).length, 0);
    },
  },

  {
    name: "work-debt: an empty or absent ledger parses to nothing rather than throwing",
    run: async () => {
      for (const input of ["", null, undefined]) {
        const parsed = parseDebtLedger(input);
        assert.equal(parsed.entries.length, 0);
        assert.equal(evaluateDebtLedger(parsed).summary.error, 0, "nothing accrued is the healthy state, not a failure");
      }
    },
  },
];
