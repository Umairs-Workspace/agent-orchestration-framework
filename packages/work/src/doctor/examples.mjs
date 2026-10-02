import path from "node:path";
import { severityFor } from "../lifecycle.mjs";
import {
  EXAMPLES_DOC,
  malformedLines,
  openBusinessQuestions,
  parseExampleMap,
  provenanceClaims,
  ruleCount,
  rulesWithoutExample,
} from "../examples/map.mjs";

// Application policy is supplied by core: the gate's one resolver.
export function createDoctorExamples({ examplesEnabledFromConfig }) {
// work:doctor — milestone 134 / story 04: THE EXAMPLES LANE (ADR-005 §1), the tenth `CHECK_GROUPS`
// entry. One pure `(snapshot, ctx) => Finding[]` group, appended; it edits no existing group.
//
// WHAT IT ASKS. A story's example map (ADR-001) makes two claims a builder will act on: that a
// business question is settled, and that an example was agreed by a person. Neither may rest on an
// agent's word. The lane checks both against code — the map through story 02's one parser and its
// queries, and the claims against the answers story 03's `collectAnswers` read from the harness:
//
//   example-question-open          a `business` question that is not `answered`
//   example-provenance-unanchored  a claim (`confirmed`, `stated Q<n>`, `answered`) whose token
//                                  no answer record carries
//   example-map-malformed          a line the grammar does not admit
//   example-rule-no-example        a rule with no example — ALWAYS `warn`
//   example-map-too-many-rules     more than four rules, once per map — ALWAYS `warn`
//
// THIS LANE GATES. Its three error codes take the acceptance horizon (`severityFor`): `error` while
// the story is open, `warn` once it is `done`, because a delivered map may no longer be edited (the
// diagrams lane's precedent, 133/ADR-006). Its codes are therefore NOT exported as a
// `*_FINDING_CODES` array — that suffix is the advisory class's marker (FF-12402).
//
// ONE JUDGEMENT, TWO CALLERS. `examplesFindings` judges one map; the lane calls it per story row
// and the continue door (`commands/continue.mjs`) calls it for the one story it opens, so the
// doctor and the door cannot disagree about a story (ADR-005 §4).
//
// THE LANE READS NO DISK. The map's text and its answers ride the snapshot as `examplesMap`, read
// at the engine's impure edge only when the gate is on and the file is there (ADR-005 §2). Every
// map pattern and label is read through `../examples/map.mjs` (FF-13402).

const EXAMPLE_LANE_CODES = Object.freeze([
  "example-question-open",
  "example-provenance-unanchored",
  "example-map-malformed",
  "example-rule-no-example",
  "example-map-too-many-rules",
]);

// The split signal is a constant, not config: at discovery there are no tasks to measure a story's
// size against (ADR-005 §1, PO ruling 6).
const RULE_LIMIT = 4;

function examplesFindings({ ref, status, dir, text, answers }) {
  const map = parseExampleMap(text);
  const severity = severityFor(status);
  const target = path.join(dir, EXAMPLES_DOC);
  const anchored = new Set((answers ?? []).map((record) => record?.token).filter((token) => typeof token === "string"));
  const findings = [];
  const push = (code, level, message) => findings.push({ code, severity: level, path: target, message: `${ref}: ${message}` });

  for (const entry of malformedLines(map)) {
    push("example-map-malformed", severity, `${EXAMPLES_DOC} line ${entry.line} is malformed (${entry.reason}): ${entry.text ?? ""}`);
  }
  for (const question of openBusinessQuestions(map)) {
    push("example-question-open", severity, `${question.id} (${EXAMPLES_DOC} line ${question.line}) is a business question still ${question.state} — a person must answer it before the build.`);
  }
  for (const claim of provenanceClaims(map, ref)) {
    if (anchored.has(claim.token)) continue;
    const claimed = claim.state ?? claim.provenance;
    push("example-provenance-unanchored", severity, `${claim.id} (${EXAMPLES_DOC} line ${claim.line}) is ${claimed}, but no person's answer carries the token "${claim.token}".`);
  }
  for (const rule of rulesWithoutExample(map)) {
    push("example-rule-no-example", "warn", `${rule.id} (${EXAMPLES_DOC} line ${rule.line}) has no example.`);
  }
  const rules = ruleCount(map);
  if (rules > RULE_LIMIT) {
    push("example-map-too-many-rules", "warn", `the map holds ${rules} rules, over the limit of ${RULE_LIMIT} — the story is likely too big.`);
  }
  return findings;
}

function examplesGroup(snapshot, ctx = {}) {
  if (!examplesEnabledFromConfig(ctx.config ?? {})) return [];
  const findings = [];
  for (const item of snapshot?.items ?? []) {
    // A row with no map is silent: the gate was off at the probe, the row is not a story, the story
    // holds no `EXAMPLES.md`, or another node holds it (PO ruling 5).
    const map = item?.examplesMap;
    if (item?.type !== "story" || map == null || typeof map.text !== "string") continue;
    if (typeof item.dir !== "string" || item.dir === "") continue;
    findings.push(...examplesFindings({
      ref: item.ref,
      status: item.meta?.status ?? null,
      dir: item.dir,
      text: map.text,
      answers: map.answers,
    }));
  }
  return findings;
}

return { EXAMPLE_LANE_CODES, examplesFindings, examplesGroup };
}
