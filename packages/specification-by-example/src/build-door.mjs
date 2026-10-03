import path from "node:path";
import { readFile } from "node:fs/promises";
import { commandError } from "@aof/contracts/error";
import { EXAMPLES_DOC } from "./map.mjs";

// THE BUILD DOOR'S HALF OF THE READINESS GATE (milestone 134 / story 04, ADR-005 §4; moved here by
// 135 / ADR-001 §3). The doctor reports a story's open business question; this is where a story
// built on a rule nobody asked about is actually stopped. Core hands it to `@aof/work`'s phase doors
// as one `beforeBuild` entry, which the continue door awaits after its backlog refusal and before
// it reads the overlay: nothing moves, nothing is minted, nothing is dispatched.
//
// It judges the map with the doctor lane's own pure function over the same answers, so the door and
// `aof work doctor` cannot disagree, and it refuses on ANY error-severity finding — a map the parser
// cannot read is not a map whose questions are closed. Silent for everything it cannot judge here:
// the gate off, a row that is not a story, a row with no local folder (its own node's door meets it)
// and a story with no map.
export function createExamplesBuildDoor({ examplesEnabledFromConfig, examplesFindings, collectAnswers }) {
  async function refuseOpenExamples(ctx, row) {
    if (row?.type !== "story" || typeof row.dir !== "string" || row.dir === "") return;
    if (!examplesEnabledFromConfig(ctx.workspace?.config ?? {})) return;
    const dir = path.resolve(ctx.workspace?.projectRoot ?? "", row.dir);
    let text;
    try {
      text = await readFile(path.join(dir, EXAMPLES_DOC), "utf8");
    } catch {
      return;
    }
    const answers = await collectAnswers({ ...row, dir }, { workspace: ctx.workspace });
    const errors = examplesFindings({ ref: row.ref, status: row.status ?? null, dir, text, answers })
      .filter((finding) => finding.severity === "error");
    if (errors.length === 0) return;
    const error = commandError(
      [`\`${row.ref}\`'s example map has ${errors.length} open finding(s) — settle them in \`aof:refine ${row.ref}\` before the build:`,
        ...errors.map((finding) => `  ${finding.code}: ${finding.message}`)].join("\n"),
      "examples-question-open",
      409,
    );
    // The status door's `artifact-budget-exceeded` precedent: the findings ride the one structured
    // refusal channel, so `--json` prints them and a caller never parses prose.
    error.detail = { ref: row.ref, findings: errors };
    throw error;
  }

  return { refuseOpenExamples };
}
