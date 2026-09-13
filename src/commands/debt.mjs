// src/commands/debt.mjs — `work:debt`, the maintenance face on the tech-debt ledger.
//
// THE BARE FACE IS A READ. It parses `wiki/work/TECH_DEBT.md`, measures it against the budget in
// `src/work/debt.mjs` and reports; `--write` is the only door to the filesystem. That is the
// `work:grade` / `work:loop-document` idiom (`--run`/`--write` as the sole execution door,
// 54/ADR-003 §2, 78/ADR-002) and it is load-bearing for the same reason it is there: the CLI
// bijection gate spawns every registered verb as a REAL subprocess from inside this repository,
// so a writing bare face would have the suite rewrite this repo's own ledger on every run.
//
// WHY A COMMAND AND NOT A PROMPT INSTRUCTION. The ledger grew 289 -> 4,836 lines under a prompt
// that asked authors to be brief. Prompts do not measure, and a rule nothing measures is a rule
// that decays — this tree's item 27 is the general case. The budget lives in code, the arch
// ratchet and this face read the SAME module, and the number an operator re-stamps after a prune
// is the number the gate enforces. No second copy to drift.
//
// THE VERB IS THE INSTRUMENT; `/aof:pay-debt` IS THE SESSION. This command measures and prunes —
// both mechanical acts with a right answer. Deciding whether an entry is still true, and whether
// its fix belongs in the item at hand, is judgement, and that lives in the bundle command that
// drives this verb (`src/bundle/commands/pay-debt.md`). The split matters: a prompt cannot
// measure and a command cannot judge, and the ledger reached 4,836 lines because the measuring
// half did not exist and the judging half was one bullet in a review prompt.
//
// `--touching <path>...` IS THE LEVER FOR THE LOOP. The routing rule says debt is fixed inside the
// item that touches it, but nobody could act on that while answering "what debt lives in these
// files?" meant reading the whole ledger. Narrowing by path turns a someday-backlog into a
// question with an answer at the moment somebody is already in the code.
//
// BOARD-DEFERRED. No UI affordance is asked for: the ledger is a committed markdown file the
// operator already has open, and the one act that changes it is a reviewable diff.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   work:debt — the maintenance face on `wiki/work/TECH_DEBT.md`. A READ bare face with `--write`
//   as the only door to disk (the `work:loop-document` idiom), registered here so the arch ratchet
//   and the CLI measure the ledger with one module and one budget. CLI-only and BOARD-DEFERRED by
//   decision — see the module header.
import { readFile } from "node:fs/promises";
import path from "node:path";

import { writeText } from "../fs.mjs";
import {
  DEBT_BUDGET,
  DEBT_LEDGER_BASENAME,
  PRUNE_COMMAND,
  entriesTouching,
  evaluateDebtLedger,
  parseDebtLedger,
  pruneResolved,
} from "../work/debt.mjs";

function displayPath(value) {
  return path.relative(process.cwd(), value) || ".";
}

// The ledger's path is DERIVED from the configured work directory and is never a caller-supplied
// argument — one home, so the ratchet and the face can never be pointed at different files.
function debtLedgerPath(workspace) {
  const workDir = typeof workspace === "string" ? workspace : workspace?.workDir;
  if (!workDir) throw new TypeError("work:debt requires a workspace with a work directory");
  return path.join(workDir, DEBT_LEDGER_BASENAME);
}

export const debtCommand = {
  id: "work:debt",

  // `additionalProperties: false` makes the absent options a REFUSAL rather than a convention.
  // There is deliberately no caller-supplied path and no caller-supplied budget: both would be a
  // second home for a number whose whole value is that there is exactly one of it.
  input: {
    type: "object",
    properties: {
      prune: { type: "boolean" },
      write: { type: "boolean" },
      // The files to ask about. Given, the report NARROWS to the entries citing them — the
      // question an architect asks at the moment it is cheap to act on the answer.
      paths: { type: "array", items: { type: "string" } },
    },
    additionalProperties: false,
  },

  async run(input, ctx) {
    const target = debtLedgerPath(ctx.workspace);

    let text = null;
    try {
      text = await readFile(target, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    // A workspace with no ledger is the HEALTHY state, not a refusal: most repositories have
    // never accrued one, and a verb that errored here could not be run by the bijection gate's
    // bare fixture. `present: false` is the honest answer and exits clean.
    if (text === null) {
      return {
        path: target,
        present: false,
        pruned: false,
        written: false,
        removed: [],
        findings: [],
        touching: null,
        queried: [],
        summary: { entries: 0, totalLines: 0, open: 0, resolved: 0, unstated: 0, oversize: 0, longest: 0, error: 0, warn: 0 },
        budget: DEBT_BUDGET,
      };
    }

    const parsed = parseDebtLedger(text);
    const evaluated = evaluateDebtLedger(parsed, DEBT_BUDGET);

    // The narrowing face. `touching` is reported ALONGSIDE the full summary rather than replacing
    // it, so a caller asking about three files still sees whether the ledger as a whole is over
    // budget — the two questions are both true at once and answering only one hides the other.
    const paths = Array.isArray(input?.paths) ? input.paths.filter((value) => String(value ?? "").trim() !== "") : [];
    const touching =
      paths.length === 0
        ? null
        : entriesTouching(parsed, paths).map((entry) => ({
            number: entry.number,
            title: entry.title,
            line: entry.startLine,
            lineCount: entry.lineCount,
            status: entry.status,
            statusText: entry.statusText,
            matchedPaths: entry.matchedPaths,
          }));

    const prune = input?.prune === true;
    const write = input?.write === true;

    let removed = [];
    let after = null;
    if (prune) {
      const result = pruneResolved(parsed, text);
      removed = result.removed;
      // `--prune` WITHOUT `--write` is the dry run, and it reports the same numbers the write
      // would produce — the operator sees what a discharge costs before spending it.
      after = evaluateDebtLedger(parseDebtLedger(result.text), DEBT_BUDGET).summary;
      // `writeText` is atomic by construction (temp + rename, temp reclaimed on the failure path
      // that created it — m42/F26), so a write that cannot complete leaves the previous ledger
      // with its previous bytes and strands nothing beside it.
      if (write && result.changed) await writeText(target, result.text);
    }

    return {
      path: target,
      present: true,
      pruned: prune,
      touching,
      queried: paths,
      written: prune && write && removed.length > 0,
      removed: removed.map((entry) => ({
        number: entry.number,
        title: entry.title,
        line: entry.startLine,
        lineCount: entry.lineCount,
        statusText: entry.statusText,
      })),
      findings: evaluated.findings,
      summary: evaluated.summary,
      after,
      budget: DEBT_BUDGET,
    };
  },

  cli: {
    route: ["work", "debt"],
    spec: {
      usage: "aof work debt [<path>...] [--prune] [--write] [--json]",
      flags: {
        prune: {
          type: "boolean",
          description: "drop every entry whose status records it as discharged (bare: a dry run reporting what would go)",
        },
        write: {
          type: "boolean",
          description: "with --prune, write the pruned ledger back (the only door to the filesystem)",
        },
      },
    },

    argv: (positionals = [], options = {}) => {
      const input = {};
      if (positionals.length > 0) input.paths = [...positionals];
      if (options.prune) input.prune = true;
      if (options.write) input.write = true;
      return input;
    },

    render(result) {
      if (!result.present) {
        return `No ${DEBT_LEDGER_BASENAME} at ${displayPath(result.path)} — nothing accrued.`;
      }

      // THE NARROWED FACE ANSWERS FIRST AND BRIEFLY. A caller who asked about three files is
      // mid-review and wants the entries, not the ledger's global health — that rides underneath.
      if (result.touching !== null) {
        const asked = result.queried.join(", ");
        if (result.touching.length === 0) {
          return `No debt entry cites ${asked}. (${result.summary.entries} entries in ${displayPath(result.path)}.)`;
        }
        const rows = result.touching.map((entry) => {
          const status = entry.status === "unstated" ? "no status" : entry.status;
          return [
            `  item ${entry.number} (line ${entry.line}, ${entry.lineCount} lines, ${status}) — ${entry.title}`,
            `      cites: ${entry.matchedPaths.join(", ")}`,
          ].join("\n");
        });
        return [
          `${result.touching.length} debt entr${result.touching.length === 1 ? "y cites" : "ies cite"} ${asked}:`,
          ...rows,
          "",
          "Fix what fits this item; defer only what is its own story or bigger, and say why.",
        ].join("\n");
      }

      const { summary, budget } = result;
      const lines = [
        `${displayPath(result.path)} — ${summary.entries} entr${summary.entries === 1 ? "y" : "ies"}, ${summary.totalLines} lines ` +
          `(ceiling ${budget.maxTotalLines}); ${summary.open} open, ${summary.resolved} discharged, ${summary.unstated} unstatused.`,
        `${summary.oversize} entr${summary.oversize === 1 ? "y is" : "ies are"} over the ${budget.entryLines}-line budget ` +
          `(ceiling ${budget.maxOversizeEntries}); longest is ${summary.longest} lines.`,
      ];

      // WORST-FIRST, because compaction is the work this report exists to drive and an operator
      // asking "where do I start" wants the ten entries that hold the most lines, not entry 1.
      const heaviest = result.findings
        .filter((finding) => finding.code === "debt-entry-oversize")
        .sort((a, b) => b.measured - a.measured)
        .slice(0, 10);
      if (heaviest.length > 0) {
        lines.push("", "Heaviest entries — move the forensics to the reviewing item's own register:");
        for (const finding of heaviest) {
          lines.push(`  ${String(finding.measured).padStart(4)} lines  item ${finding.number} (line ${finding.line}) — ${finding.title}`);
        }
      }

      const unstated = result.findings.filter((finding) => finding.code === "debt-entry-unstatused");
      if (unstated.length > 0) {
        lines.push(
          "",
          `${unstated.length} entr${unstated.length === 1 ? "y carries" : "ies carry"} no **Status:** line, so no prune can reason about ` +
            `${unstated.length === 1 ? "it" : "them"}: ${unstated.map((finding) => finding.number).join(", ")}.`
        );
      }

      if (result.pruned) {
        lines.push("");
        if (result.removed.length === 0) {
          lines.push("Nothing to prune — no entry records itself as discharged.");
        } else {
          const verb = result.written ? "Removed" : "Would remove";
          lines.push(`${verb} ${result.removed.length} discharged entr${result.removed.length === 1 ? "y" : "ies"}:`);
          for (const entry of result.removed) {
            lines.push(`  item ${entry.number} (${entry.lineCount} lines) — ${entry.title}`);
          }
          if (result.after) {
            lines.push(`${result.written ? "Ledger is now" : "Ledger would be"} ${result.after.totalLines} lines across ${result.after.entries} entries.`);
          }
          if (!result.written) lines.push(`Run \`${PRUNE_COMMAND}\` to apply.`);
        }
      } else if (summary.resolved > 0) {
        lines.push("", `${summary.resolved} discharged entr${summary.resolved === 1 ? "y is" : "ies are"} still here — \`${PRUNE_COMMAND}\`.`);
      }

      if (summary.error > 0) {
        lines.push("", `${summary.error} error-level finding(s): the ledger is ABOVE a recorded ceiling. It may fall, never rise.`);
      }

      return lines.join("\n");
    },

    json: (result) => ({
      ...result,
      path: displayPath(result.path),
      prune: PRUNE_COMMAND,
    }),

    // A recorded ceiling breached is a FAILING gate, not a note — the same exit contract
    // `work:validate` and `work:doctor` carry, and what lets CI run this verb directly.
    exit: (result) => (result.summary.error > 0 ? 1 : 0),
  },
};
