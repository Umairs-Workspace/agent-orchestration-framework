import path from "node:path";

import { loadLoops } from "../work/loops.mjs";
import {
  CHECK_IDS,
  checkActuatorArbitration,
  checkAnchorGrounding,
  checkGrounding,
  checkPairing,
  checkReferenceOwnership,
  checkTimescale,
} from "../work/loops-checks.mjs";

function displayPath(value) {
  return path.relative(process.cwd(), value) || ".";
}

const CHECKS = Object.freeze({
  grounding: checkGrounding,
  "anchor-grounding": checkAnchorGrounding,
  pairing: checkPairing,
  "reference-ownership": checkReferenceOwnership,
  "actuator-arbitration": checkActuatorArbitration,
  timescale: checkTimescale,
});

export const loopsValidateCommand = {
  id: "work:loops-validate",
  input: { type: "object", properties: {}, additionalProperties: false },

  async run(_input, ctx) {
    const model = await loadLoops(ctx.workspace);
    const findings = [...model.findings];
    const checks = {};
    for (const id of CHECK_IDS) {
      const ownFindings = model.present ? CHECKS[id](model) : [];
      checks[id] = { ran: model.present, findings: ownFindings.length };
      findings.push(...ownFindings);
    }
    return {
      source: model.source,
      present: model.present,
      findings,
      summary: {
        error: findings.filter((item) => item.severity === "error").length,
        warn: findings.filter((item) => item.severity === "warn").length,
        checks,
      },
    };
  },

  cli: {
    route: ["work", "loops", "validate"],
    spec: { usage: "aof work loops validate [--json]", flags: {} },
    argv: () => ({}),
    render(result) {
      const shownSource = displayPath(result.source);
      if (!result.present) return `No loop registry is declared at ${shownSource}.`;
      const lines = [`Loop registry findings: ${result.summary.error} error(s), ${result.summary.warn} warning(s).`];
      for (const item of result.findings) {
        lines.push(`${item.severity} · ${item.code} · ${displayPath(item.path)} · ${item.message}`);
      }
      return lines.join("\n");
    },
    json: (result) => ({
      ...result,
      source: displayPath(result.source),
      findings: result.findings.map((item) => ({
        ...item,
        path: displayPath(item.path),
      })),
    }),
    exit: (result) => (result.summary.error > 0 ? 1 : 0),
  },
};
