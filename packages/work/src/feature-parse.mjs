// THE ONE GHERKIN READER UNDER `src/` (milestone 66 / ADR-003 §1).
//
// Until 66/00 this leaf mirrored a second hand-rolled parse in `work.mjs`'s
// `checkFeatureTags` — two readers of one artifact, with the duplication ledgered in
// a comment and never discharged. The derivation now lives HERE, in the coldest leaf
// in the tree, and `work.mjs` reaches the grammar only by importing it. The repo
// still deliberately hand-parses Gherkin rather than take a dependency:
// `@cucumber/gherkin` throws with no partial-result mode, and this contract requires
// a file that FAILS to parse to still return the scenarios it could recognise (the
// board's `/api/work/tasks` endpoint depends on that).
//
// parseFeature(text) → {
//   feature: string|null,
//   scenarios: [{ name, outline: boolean, lane: "executable"|"manual"|"uat"|null,
//                 verification: string[], line: number,
//                 examples: [{ header: string, rows: number, line: number }] }],
//   tags: [{ tag, line }],                       // every tag token, in file order
//   structural: [{ line, freeTextLines, problem }]   // 0 or 1 — see below
// }
//
// `feature` and `scenarios[].{name, outline, lane}` are UNCHANGED, key-for-key and
// value-for-value: the structural findings and the tag list arrive under NEW keys, so
// the one existing consumer (`src/commands/tasks.mjs`) keeps working untouched.
//
// A scenario's `lane` is whichever single verification tag (@executable / @manual /
// @uat) is in scope — feature-level tags plus the scenario's own pending tags. If
// exactly one applies it is the lane (without the leading `@`); otherwise (none, or
// more than one) the lane is null.
//
// THE STRUCTURAL RULE: free text in STEP POSITION.
// A `.feature` is rejected when its step position holds free text — a wrapped step
// continuation, or a narrative sentence beginning with a step keyword where no step
// may stand. It is NOT a style checker: it judges no wording, ordering, scenario
// count or narrative prose, and a Feature narrative block is not a step. Exactly ONE
// finding is produced per file, naming the line that OPENED the first free-text
// region — a verdict on a 90-line contract is not actionable.
//
// Two boundaries are decided by the contract rather than discovered (measured over
// 665 files in `wiki/work`, 2026-08-15):
//   • The keyword match is CASE-SENSITIVE and needs its trailing space. Folding case
//     takes the population from 16 files / 47 lines to 67 / 492, because 46 files
//     carry a narrative line beginning `and …`; "Whenever" is not "When ".
//   • A step keyword on a line AFTER an `Examples:` table, inside the same scenario,
//     is ADMITTED — a live aof authoring idiom (a trailing assertion applying to all
//     Examples rows) that real Gherkin rejects.
// Docstring bodies and table rows are DATA: a step keyword inside either is never a
// finding. Comments, tag lines, blank lines, `Background:`, `Examples:`, CRLF and LF
// are all legal and produce nothing.
//
// FOUR ADMISSIONS THIS READER MAKES BEYOND THE CONTRACT'S BOUNDARY TABLE, each
// measured 0 times across the 665 files in `wiki/work` (2026-08-15), so each is a
// forward-looking choice rather than a fact about the corpus — named here because an
// unstated admission in a gate is the shape this milestone exists to refuse:
//   • ``` as a docstring delimiter, beside `"""` — 0 files carry a ``` line, 2 carry
//     `"""`. It is admitted because Gherkin 6 admits it and because a fenced block is
//     how a `.feature` would carry markdown if one ever did. THE RISK, and it is real:
//     an UNMATCHED ``` (or `"""`) swallows the rest of the file as docstring data, so
//     the gate goes quiet below it. That failure is silent by construction — the file
//     still parses, it simply stops being read — and closing it wants a rule about
//     unbalanced delimiters that this story does not own.
//   • `Scenarios:` as the Gherkin synonym for `Examples:` — 0 files.
//   • `Scenario Template:` as the synonym for `Scenario Outline:` — 0 files. NOTE it
//     is admitted only as a STRUCTURAL header; `parseFeature`'s `outline` flag stays
//     true for it, matching `Scenario Outline:`.
//   • `Rule:` (Gherkin 6) as a header that returns to description state — 0 files.
//     Refusing it would make every step under a `Rule:` a false positive, which is the
//     more expensive error of the two.
//   • `Example:` (Gherkin 6) as the bare-scenario synonym for `Scenario:` — 0 files
//     (measured 2026-10-03, milestone 135 / ADR-003 §3). Without it an `Example:` after a
//     `Background:` produced no scenario and no finding: a scenario falling out of a
//     contract silently. `outline` stays false for it.
//
// milestone 135 / ADR-003 — `Rule:` IS A GROUPING THAT OWNS ITS SCENARIOS. Every change is
// an ADDITIVE KEY inside the `BEGIN/END 135/ADR-003 rules` markers, so the frozen parser
// (the source with both marker families removed) is the pre-135 reader and FF-5704 can keep
// comparing against it:
//   scenarios[].rule — `{ name, line }` of the `Rule:` the scenario sits under, or null.
//   rules            — `[{ name, line, tags }]`, in file order; a rule ends at the next
//                      `Rule:`, the next `Feature:` or the end of the file.
//   examples[].columns / examples[].cells — the header cells and one array of trimmed cell
//                      strings per data row (`rows` stays the count). `\|` is a literal pipe
//                      inside a cell and `\\` a literal backslash, as in Gherkin.
// A rule's tags have RULE SCOPE: the tags read before `Rule:` apply to every scenario in the
// rule (`effective = feature + rule + scenario`) instead of leaking onto the next scenario
// only. `tags` still lists every token once, so the vocabulary check is unchanged.
//
// Pure: no `node:fs`, no spawn, no clock — callers pass the file text, and the same
// text yields byte-identical output on every call.

const VERIFICATION_TAGS = new Set(["@executable", "@manual", "@uat"]);

// Case-sensitive, each with its trailing space — Gherkin's own answer, and the
// measured one (see the header). `*` is deliberately NOT admitted as a step keyword:
// it is unused in this corpus and would read a bullet list in a Feature narrative as
// a step.
const STEP_KEYWORDS = ["Given ", "When ", "Then ", "And ", "But "];

const isStepLine = (line) => STEP_KEYWORDS.some((keyword) => line.startsWith(keyword));

// A docstring body is data. Both delimiters Gherkin 6 admits are honoured — measured
// in this corpus: 2 files carry a `"""` line and 0 carry a ``` one, so the fence is a
// forward-looking admission, with the unmatched-delimiter risk named in the header.
const DOCSTRING_DELIMITERS = ["\"\"\"", "```"];
const docstringDelimiter = (line) => DOCSTRING_DELIMITERS.find((delimiter) => line.startsWith(delimiter)) ?? null;

let SCENARIO_RE = /^Scenario( Outline| Template)?:/;
// BEGIN 135/ADR-003 rules
SCENARIO_RE = /^(?:Scenario( Outline| Template)?|Example):/;

// One Examples table row's cells: split on unescaped `|`, drop the pieces outside the outer
// pipes, trim each. `\|` and `\\` unescape; any other `\x` is kept as written.
function tableCells(line) {
  const cells = [];
  let cell = "";
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\\" && (line[index + 1] === "|" || line[index + 1] === "\\")) {
      cell += line[index + 1];
      index += 1;
    } else if (char === "|") {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells.slice(1, -1).map((value) => value.trim());
}
// END 135/ADR-003 rules
const EXAMPLES_RE = /^(Examples|Scenarios):/;

export function parseFeature(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  let feature = null;
  let featureTags = [];
  let pending = [];
  const scenarios = [];
  const tags = [];

  // `preamble` — before `Feature:`; outside this rule's scope entirely.
  // `description` — the Feature (or Rule) narrative; free prose is legal, a STEP is not.
  // `steps` — inside a `Background:`/`Scenario:`; a step is legal, free text is not.
  let state = "preamble";
  let openDocstring = null;
  // The line that opened the current free-text region, or null when none is open.
  let regionAt = null;
  // Was the PREVIOUS line a step? Free text is only "in step position" when it
  // follows one — which is what keeps a prose paragraph between two scenarios, or
  // after an `Examples:` table, from being a finding.
  let afterStep = false;
  let firstViolation = null;
  let freeTextLines = 0;
  // BEGIN ADR-005 examples
  let currentScenario = null;
  let currentExamples = null;
  // END ADR-005 examples
  // BEGIN 135/ADR-003 rules
  let currentRule = null;
  const rules = [];
  // END 135/ADR-003 rules

  const openRegion = (line) => {
    if (regionAt == null) regionAt = line;
    if (firstViolation == null) firstViolation = line;
    freeTextLines += 1;
  };
  const closeRegion = () => {
    regionAt = null;
    afterStep = false;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index].trim();

    // ---- docstring bodies are DATA, never structure ------------------------
    if (openDocstring != null) {
      if (line.startsWith(openDocstring)) openDocstring = null;
      continue;
    }
    const opener = docstringDelimiter(line);
    if (opener != null) {
      // BEGIN ADR-005 examples
      currentExamples = null;
      // END ADR-005 examples
      openDocstring = opener;
      closeRegion();
      continue;
    }

    // ---- lines that carry no step position ---------------------------------
    if (line === "" || line.startsWith("#") || line.startsWith("|")) {
      // BEGIN ADR-005 examples
      if (line.startsWith("|") && currentExamples) {
        // BEGIN 135/ADR-003 rules
        if (currentExamples.hasColumnHeader) currentExamples.block.cells.push(tableCells(line));
        else currentExamples.block.columns = tableCells(line);
        // END 135/ADR-003 rules
        if (currentExamples.hasColumnHeader) currentExamples.block.rows += 1;
        else currentExamples.hasColumnHeader = true;
      }
      // END ADR-005 examples
      closeRegion();
      continue;
    }

    if (line.startsWith("@")) {
      // BEGIN ADR-005 examples
      currentExamples = null;
      // END ADR-005 examples
      const lineTags = line.split(/\s+/).filter((token) => token.startsWith("@"));
      for (const tag of lineTags) tags.push({ tag, line: lineNumber });
      pending.push(...lineTags);
      closeRegion();
      continue;
    }

    // ---- structural keywords -----------------------------------------------
    if (/^Feature:/.test(line)) {
      // BEGIN ADR-005 examples
      currentScenario = null;
      currentExamples = null;
      // END ADR-005 examples
      // BEGIN 135/ADR-003 rules
      currentRule = null;
      // END 135/ADR-003 rules
      feature = line.replace(/^Feature:\s*/, "").trim() || null;
      featureTags = pending;
      pending = [];
      state = "description";
      closeRegion();
      continue;
    }

    const scenarioMatch = SCENARIO_RE.exec(line);
    if (scenarioMatch) {
      const outline = Boolean(scenarioMatch[1]);
      const name = line.replace(SCENARIO_RE, "").trim();
      let effective = [...featureTags, ...pending];
      // BEGIN 135/ADR-003 rules
      effective = [...featureTags, ...(currentRule?.tags ?? []), ...pending];
      // END 135/ADR-003 rules
      const verification = effective.filter((tag) => VERIFICATION_TAGS.has(tag));
      const lane = verification.length === 1 ? verification[0].slice(1) : null;
      const scenario = { name, outline, lane, verification, line: lineNumber };
      // BEGIN ADR-005 examples
      scenario.examples = [];
      currentScenario = scenario;
      currentExamples = null;
      // END ADR-005 examples
      // BEGIN 135/ADR-003 rules
      // Copied, so the scenario's rule never aliases the `rules` entry that carries the tags.
      scenario.rule = currentRule ? { name: currentRule.name, line: currentRule.line } : null;
      // END 135/ADR-003 rules
      scenarios.push(scenario);
      pending = [];
      state = "steps";
      closeRegion();
      continue;
    }

    if (/^Background:/.test(line)) {
      // BEGIN ADR-005 examples
      currentScenario = null;
      currentExamples = null;
      // END ADR-005 examples
      state = "steps";
      closeRegion();
      continue;
    }

    if (/^Rule:/.test(line)) {
      // BEGIN ADR-005 examples
      currentScenario = null;
      currentExamples = null;
      // END ADR-005 examples
      // BEGIN 135/ADR-003 rules
      // The tags read above the rule are the rule's, not the next scenario's.
      currentRule = { name: line.replace(/^Rule:\s*/, "").trim(), line: lineNumber, tags: pending };
      rules.push(currentRule);
      pending = [];
      // END 135/ADR-003 rules
      state = "description";
      closeRegion();
      continue;
    }

    if (EXAMPLES_RE.test(line)) {
      // BEGIN ADR-005 examples
      currentExamples = null;
      if (currentScenario?.outline) {
        const block = {
          header: line.replace(EXAMPLES_RE, "").trim(),
          rows: 0,
          line: lineNumber,
        };
        // BEGIN 135/ADR-003 rules
        block.columns = [];
        block.cells = [];
        // END 135/ADR-003 rules
        currentScenario.examples.push(block);
        currentExamples = { block, hasColumnHeader: false };
      }
      // END ADR-005 examples
      closeRegion();
      continue;
    }

    // ---- everything else is prose or a step --------------------------------
    // BEGIN ADR-005 examples
    currentExamples = null;
    // END ADR-005 examples
    const step = isStepLine(line);

    if (state === "description") {
      // A step keyword in the Feature/Rule narrative is a step where no step may
      // stand — the shape a first instrument missed (`27/02/tasks/02_assign-affordance.feature:113`,
      // three steps at file level under a comment block). Once one opens the region
      // every following non-blank line belongs to it, prose and step alike.
      if (step || regionAt != null) openRegion(lineNumber);
      continue;
    }

    if (state === "steps") {
      if (step) {
        // A step CLOSES a free-text region: the wrapped continuation ended and the
        // author is back in the grammar.
        closeRegion();
        afterStep = true;
        continue;
      }
      if (afterStep || regionAt != null) {
        openRegion(lineNumber);
        continue;
      }
      // Prose that follows no step — between scenarios, or after an `Examples:`
      // table — is not in step position.
      continue;
    }
    // state === "preamble": before `Feature:` this rule does not reach (stated so it
    // is never read as covered).
  }

  const structural =
    firstViolation == null
      ? []
      : [
          {
            line: firstViolation,
            freeTextLines,
            problem:
              `structural parse failure: free text in step position at line ${firstViolation} ` +
              `(a wrapped step continuation, or a narrative sentence beginning "Given"/"When"/"Then"/"And"/"But")`,
          },
        ];

  let parsed = { feature, scenarios, tags, structural };
  // BEGIN 135/ADR-003 rules
  parsed = { feature, scenarios, tags, structural, rules: rules.map(({ name, line, tags: ruleTags }) => ({ name, line, tags: [...ruleTags] })) };
  // END 135/ADR-003 rules
  return parsed;
}
