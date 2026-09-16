// Traceability wiring for milestone 66 / story 00, task `00_one-gherkin-parser`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/66_milestone_controls-that-run/stories/00_story_contract-parses/tasks/00_one-gherkin-parser.feature
// against the LOCKED surface `parseFeature(text)` in ../src/feature-parse.mjs — the
// ONE Gherkin reader under `src/` after this story (ADR-003 §1).
//
// The Examples rows of the free-text outline cite REAL files at REAL line numbers, and
// are driven against the actual files on disk rather than against a paraphrase of them.
//
// FIVE OF THE SIX CITATIONS CANNOT GO STALE — their files are under `done` milestones,
// so they are immutable. THE SIXTH CAN, and it is meant to: row 5 cites
// `53/01/tasks/04_gate-order-and-cap.feature`, which sits under an **in-progress**
// milestone (the contract's own caption calls all six `done`; the correction is
// recorded in the accepting item, never by editing the delivered feature). It is the
// ONE live file this gate exists to make somebody fix — and when they fix it, the four
// tests that read it go red TOGETHER. That red means "the live file was repaired,
// re-measure and record the new population", not "the parser broke", and each of those
// four says so in its own failure message.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFeature } from "../../src/feature-parse.mjs";
import { validateWork } from "../../src/work.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const workDir = path.join(repoRoot, "wiki", "work");
const srcWork = path.join(repoRoot, "src", "work.mjs");
const srcParser = path.join(repoRoot, "src", "feature-parse.mjs");

// ---------------------------------------------------------------------------
// The parser as it stood at HEAD before this story (src/feature-parse.mjs:18-55),
// held as a LOCAL constant. A test is code; the "one home under src/" invariant is
// scoped to `src/` (and asserted by test/arch/acd-feature-parser-single-home), so a
// frozen copy here is the differential's other half — the only way to prove the
// return shape is additive VALUE-for-value over the whole corpus rather than merely
// key-for-key. (The same instrument m66/FF-6604 uses for memory's re-home.)
const LEGACY_VERIFICATION_TAGS = new Set(["@executable", "@manual", "@uat"]);
function legacyParseFeature(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  let feature = null;
  let featureTags = [];
  let pending = [];
  const scenarios = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("@")) {
      const tags = line.split(/\s+/).filter((token) => token.startsWith("@"));
      pending.push(...tags);
      continue;
    }
    if (/^Feature:/.test(line)) {
      feature = line.replace(/^Feature:\s*/, "").trim() || null;
      featureTags = pending;
      pending = [];
      continue;
    }
    const scenarioMatch = /^Scenario( Outline)?:/.exec(line);
    if (scenarioMatch) {
      const outline = Boolean(scenarioMatch[1]);
      const name = line.replace(/^Scenario( Outline)?:\s*/, "").trim();
      const effective = [...featureTags, ...pending];
      const verification = effective.filter((tag) => LEGACY_VERIFICATION_TAGS.has(tag));
      const lane = verification.length === 1 ? verification[0].slice(1) : null;
      scenarios.push({ name, outline, lane });
      pending = [];
      continue;
    }
  }
  return { feature, scenarios };
}

// The keys `src/commands/tasks.mjs` reads, and nothing else.
const consumerView = (parsed) => ({
  feature: parsed.feature,
  scenarios: parsed.scenarios.map((s) => ({ name: s.name, outline: s.outline, lane: s.lane })),
});

async function everyFeatureFile(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await everyFeatureFile(full, out);
    else if (entry.isFile() && entry.name.endsWith(".feature")) out.push(full);
  }
  return out;
}

const isStructural = (finding) => finding.problem.includes("structural parse failure");
const isTagFinding = (finding) =>
  finding.problem.includes("unknown tag") ||
  finding.problem.includes("milestone membership is structural") ||
  finding.problem.includes("verification tags");

const frontmatter = (fields) =>
  `---\n${Object.entries(fields)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? `[${value.join(", ")}]` : value}`)
    .join("\n")}\n---\n`;

// A stream holding ONE OPEN story (status in-progress — inside the acceptance
// horizon) with one task feature, so a finding on the feature is reportable.
async function withOpenStory(featureText, body, config = { work: { tags: { domains: ["@validate"] } } }) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-parse-strict-"));
  const work = path.join(root, "work");
  const milestone = path.join(work, "00_milestone_foundation");
  const story = path.join(milestone, "stories", "00_story_alpha");
  await mkdir(path.join(story, "tasks"), { recursive: true });
  await writeFile(
    path.join(milestone, "SPEC.md"),
    frontmatter({ type: "milestone", number: "00", slug: "foundation", status: "in-progress", created: "2026-01-01", updated: "2026-01-02", schema: 1 }),
  );
  await writeFile(
    path.join(story, "STORY.md"),
    frontmatter({ type: "story", number: "00", slug: "alpha", status: "in-progress", parent: "00", created: "2026-01-01", updated: "2026-01-02", schema: 1 }),
  );
  const featurePath = path.join(story, "tasks", "00_thing.feature");
  await writeFile(featurePath, featureText);
  try {
    return await body({ work, featurePath, findings: await validateWork(work, config, undefined) });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Examples: every row is a real line in `wiki/work` at HEAD. Five cited files are
// under `done` milestones and are therefore immutable; `live: true` marks the sixth,
// which is under an in-progress milestone and is expected to be repaired.
// | shape | file | line | free-text lines |
const FREE_TEXT_ROWS = [
  {
    shape: "a `Given` in a `Background:` wrapped onto a second indented line",
    file: "archive/00_milestone_work-cli/stories/00_story_resolve-items/tasks/00_resolve-by-ref.feature",
    line: 8,
    freeTextLines: 2,
  },
  {
    shape: "a `When` inside a scenario wrapped onto a second indented line",
    file: "archive/49_milestone_terminals-home/stories/01_story_repo-said-once/tasks/00_the-line-deduplicates-and-counts.feature",
    line: 195,
    freeTextLines: 1,
  },
  {
    shape: "a step whose keyword carries a comma, so `And,` is never the keyword `And `",
    file: "archive/04_milestone_round-trip-proof/stories/02_story_loop-proof/tasks/02_roundtrip-signoff.feature",
    line: 36,
    freeTextLines: 1,
  },
  {
    shape: "a narrative sentence in the Feature description beginning `And `",
    file: "archive/52_milestone_loop-registry-and-graph/stories/00_story_loop-model-and-loader/tasks/02_field-value-grammar.feature",
    line: 12,
    freeTextLines: 4,
  },
  // REMOVED 2026-08-28, and this note is the record the contract asks for. This row's
  // subject was the ONE LIVE file — the single unparseable contract under an open item,
  // the one the gate existed to make somebody fix. It was fixed:
  // `53/01/tasks/04_gate-order-and-cap.feature` now parses with `structural: []`, and
  // milestone 53 has since been accepted. A row asserting that a repaired file still
  // fails is not coverage, it is a stale pin, so it goes — the re-measured population is
  // recorded in `work-validate-contract-parses` (13 grandfathered files, 0 reported).
  //
  // The SHAPE it carried is not lost. Its sibling row above measures the same narrative
  // shape over a live file, and the long-region variant this one uniquely covered — a
  // narrative that swallows many lines rather than one or two — is preserved as a
  // synthetic case in LONG_REGION below, where it cannot be repaired out from under the
  // suite again.
  {
    shape: "steps at file level under a comment block, with no `Scenario:`/`Background:`",
    file: "archive/27_milestone_work-issuance-routing/stories/02_story_fleet-ui-issue-affordance/tasks/02_assign-affordance.feature",
    line: 113,
    freeTextLines: 3,
  },
];

// LONG_REGION — the variant the removed live row uniquely carried: a narrative
// beginning with a step keyword that swallows MANY following lines, not one or two.
// The distinction is not decorative. Every remaining real-file row measures a region of
// 1-4 lines; the parser's contract is that ONE finding is produced per file naming the
// line that OPENED the region, and a long region is where "one finding, not one per
// line" actually earns its keep. Held as a synthetic fixture rather than pinned to
// somebody's contract file, because the last one was repaired — correctly — and took
// the coverage with it.
const LONG_REGION = [
  "Feature: a narrative that runs on",
  "",
  "  Given the milestone has been accepted, this sentence is narrative prose and not a",
  ...Array.from({ length: 17 }, (_, n) => `  continuation line ${n + 1} of that same narrative, still in step position`),
  "",
  "  Scenario: a real scenario after it",
  "    Given a step",
].join("\n");

// Examples: false-positive protection — the construct each row would break, drawn
// from the corpus (665 files measured 2026-08-15), never from imagination.
const CONSTRUCT_ROWS = [
  {
    construct: "a Feature narrative block of free prose sentences",
    text: "@executable\nFeature: Thing\n\n  A narrative paragraph that runs on for a while and says nothing\n  a parser should ever judge.\n\n  Scenario: does a thing\n    When x\n    Then y\n",
  },
  {
    construct: "a blank line anywhere",
    text: "@executable\nFeature: Thing\n\n\n  Scenario: does a thing\n\n    When x\n\n    Then y\n\n",
  },
  {
    construct: "a `Background:` and its steps",
    text: "@executable\nFeature: Thing\n\n  Background:\n    Given a stream\n    And a story\n\n  Scenario: does a thing\n    When x\n    Then y\n",
  },
  {
    construct: "a `Scenario Outline:` with its `Examples:` table",
    text: "@executable\nFeature: Thing\n\n  Scenario Outline: rows\n    When I pass <input>\n    Then I get <output>\n\n    Examples: the matrix\n      | input | output |\n      | a     | b      |\n",
    // …and the SAME construct with NO blank line between the last step and `Examples:`.
    // Without this variant the `Examples:` branch of the parser is never the reason a
    // row passes — every other fixture is carried by the preceding blank line, so
    // breaking the keyword leaves the whole suite green (a mutation survivor found at
    // 66/00's review).
    variants: [
      "@executable\nFeature: Thing\n\n  Scenario Outline: rows\n    When I pass <input>\n    Then I get <output>\n    Examples: the matrix\n      | input | output |\n      | a     | b      |\n",
    ],
  },
  {
    construct: "a data table under a step",
    text: "@executable\nFeature: Thing\n\n  Scenario: does a thing\n    Given the rows\n      | name | value |\n      | a    | 1     |\n    Then y\n",
  },
  {
    construct: "a comment line",
    text: "@executable\nFeature: Thing\n\n  # a comment, anywhere\n  Scenario: does a thing\n    When x\n    # another, mid-scenario\n    Then y\n",
  },
  {
    construct: "a comment line beginning with a step keyword, as `# When the pin ...`",
    text: "@executable\nFeature: Thing\n\n  Scenario: does a thing\n    When x\n    # When the pin is read this line is still a comment\n    Then y\n",
  },
  {
    construct: 'a `"""` docstring holding markdown headings and blank lines',
    text: '@executable\nFeature: Thing\n\n  Scenario: does a thing\n    Given the payload\n      """\n      # A heading\n\n      And a line that would be a step outside this docstring\n      """\n    Then y\n',
  },
  {
    construct: "a `But` step",
    text: "@executable\nFeature: Thing\n\n  Scenario: does a thing\n    When x\n    Then y\n    But not z\n",
  },
  {
    construct: "a feature-level tag line above `Feature:`",
    text: "@executable @cli @work\nFeature: Thing\n\n  Scenario: does a thing\n    When x\n    Then y\n",
  },
  {
    construct: "an indented scenario-level tag line",
    text: "Feature: Thing\n\n  @executable\n  Scenario: does a thing\n    When x\n    Then y\n",
  },
  {
    construct: "CRLF line endings",
    text: "@executable\r\nFeature: Thing\r\n\r\n  Scenario: does a thing\r\n    When x\r\n    Then y\r\n",
  },
  {
    construct: "LF line endings",
    text: "@executable\nFeature: Thing\n\n  Scenario: does a thing\n    When x\n    Then y\n",
  },
];

// Examples: each measured 0 times in the corpus, so each row is a DECISION this
// contract makes rather than a fact it records.
const BOUNDARY_ROWS = [
  {
    input: "an empty file",
    text: "",
    finding: false,
    why: "an empty contract is not free text in step position",
  },
  {
    input: "tag lines and no `Feature:` line",
    text: "@executable @cli\n@work\n",
    finding: false,
    why: "outside this rule's scope, stated so it is never read as covered",
  },
  {
    input: "a `Feature:` line and no scenario at all",
    text: "@executable\nFeature: Thing\n\n  Some narrative and nothing else.\n",
    finding: false,
    why: "for the same reason",
  },
  {
    input: 'a narrative line whose first word merely starts with a keyword, "Whenever"',
    text: "@executable\nFeature: Thing\n\n  Whenever the pin is read, this line is narrative prose.\n\n  Scenario: does a thing\n    When x\n    Then y\n",
    finding: false,
    why: "the keyword needs its trailing space",
    // …and the SAME position with the real keyword DOES fire, so the row is not
    // vacuously green: it is the trailing space that decides.
    pairedText: "@executable\nFeature: Thing\n\n  When the pin is read, this line is in step position.\n\n  Scenario: does a thing\n    When x\n    Then y\n",
    pairedFinding: true,
  },
  {
    input: "a narrative line carrying a step keyword mid-sentence",
    text: "@executable\nFeature: Thing\n\n  the pin is read When the caller asks, which is mid-sentence\n\n  Scenario: does a thing\n    When x\n    Then y\n",
    finding: false,
    why: "position decides, never presence",
    // The same words in the OTHER narrative position the corpus uses — after an
    // `Examples:` table — are silent too.
    pairedText:
      "@executable\nFeature: Thing\n\n  Scenario Outline: rows\n    When I pass <input>\n    Then I get <output>\n\n    Examples: the matrix\n      | input | output |\n      | a     | b      |\n\n  the pin is read When the caller asks, which is mid-sentence\n",
  },
  {
    input: 'a step keyword inside a `"""` docstring body',
    text: '@executable\nFeature: Thing\n\n  Scenario: does a thing\n    Given the payload\n      """\n      Given this line is data\n      """\n    Then y\n',
    finding: false,
    why: "a docstring body is data",
  },
  {
    input: "a step keyword inside a table cell",
    text: "@executable\nFeature: Thing\n\n  Scenario: does a thing\n    Given the rows\n      | step            | note |\n      | Given a thing   | data |\n    Then y\n",
    finding: false,
    why: "a table row is data",
  },
];

export const featureParseStrictTests = [
  {
    name: "66/00 parse: a narrative swallowing a long run of lines is still ONE finding, naming the line that opened it",
    run: () => {
      const parsed = parseFeature(LONG_REGION);
      assert.equal(parsed.structural.length, 1, "one finding for the file, never one per swallowed line");
      const [finding] = parsed.structural;
      assert.equal(finding.line, 3, "it names the line that OPENED the region, not the last one in it");
      assert.equal(finding.freeTextLines, 18, "and it counts the whole region it swallowed");
      assert.match(finding.problem, /\bline 3\b/u, "the opening line is named in the finding itself");
      // The scenario BELOW the region is still recognised — a long free-text region
      // must not swallow the rest of the file's structure.
      assert.deepEqual(parsed.scenarios.map((s) => s.name), ["a real scenario after it"], "structure after the region still parses");
    },
  },
  // =====================================================================
  // Scenario: the Gherkin grammar has exactly one home under src/
  //   → proven structurally by test/arch/work/acd-feature-parser-single-home.test.mjs
  //     (FF-6601). The half asserted HERE is the consequence the contract names:
  //     `src/work.mjs` reaches the grammar only by IMPORTING it.
  // =====================================================================
  {
    name: "66/00 parse: `src/work.mjs` reaches the Gherkin grammar only by importing the one parser",
    run: async () => {
      const source = await readFile(srcWork, "utf8");
      assert.match(
        source,
        /import\s*\{[^}]*\bparseFeature\b[^}]*\}\s*from\s*"\.\/feature-parse\.mjs"/,
        "work.mjs imports parseFeature from the one leaf",
      );
      assert.equal(
        /\/\^?(Feature|Scenario|Background|Examples):/.test(source),
        false,
        "work.mjs carries no Feature:/Scenario: recogniser of its own",
      );
    },
  },

  // =====================================================================
  // Scenario: parseFeature keeps every key its consumer already reads
  // =====================================================================
  {
    name: "66/00 parse: every key `src/commands/tasks.mjs` reads carries the SAME value, for every file in the corpus",
    run: async () => {
      const files = await everyFeatureFile(workDir);
      assert.ok(files.length > 600, `non-vacuity: the corpus is real (${files.length} .feature files)`);
      let scenarioCount = 0;
      for (const file of files) {
        const text = await readFile(file, "utf8");
        const parsed = parseFeature(text);
        scenarioCount += parsed.scenarios.length;
        assert.deepEqual(
          consumerView(parsed),
          legacyParseFeature(text),
          `the consumer's view of ${path.relative(workDir, file)} changed`,
        );
      }
      assert.ok(scenarioCount > 1000, `non-vacuity: scenarios were actually compared (${scenarioCount})`);
    },
  },
  {
    name: "66/00 parse: the structural findings arrive under a NEW key, so no consumer changes to keep working",
    run: () => {
      const parsed = parseFeature("@executable\nFeature: Thing\n\n  Scenario: does a thing\n    When x\n    Then y\n");
      assert.deepEqual(Object.keys(parsed).sort(), ["feature", "scenarios", "structural", "tags"]);
      assert.deepEqual(parsed.structural, [], "a clean file carries an empty findings list, never a missing key");
      // The consumer's own read still resolves.
      assert.equal(parsed.feature, "Thing");
      assert.deepEqual(parsed.scenarios.map((s) => [s.name, s.outline, s.lane]), [["does a thing", false, "executable"]]);
    },
  },

  // =====================================================================
  // Scenario: a file that does not parse still answers the board
  // =====================================================================
  {
    name: "66/00 parse: a file that does NOT parse still returns the scenarios it could recognise, with names and lanes",
    run: () => {
      const text =
        "@executable\nFeature: Thing\n\n  Scenario: first\n    Given a wrapped step that runs onto\n      a second indented line of prose\n    Then y\n\n  @manual\n  Scenario: second\n    When x\n    Then y\n";
      const parsed = parseFeature(text);
      assert.equal(parsed.structural.length, 1, "the file does not parse");
      assert.deepEqual(
        parsed.scenarios.map((s) => ({ name: s.name, lane: s.lane })),
        [
          { name: "first", lane: "executable" },
          { name: "second", lane: null },
        ],
        "the scenarios it can recognise are still returned, with their names and lanes",
      );
      assert.equal(parsed.feature, "Thing", "and the feature name with them");
    },
  },

  // =====================================================================
  // Scenario: the tag rules are preserved exactly, and stay in validate's vocabulary
  // =====================================================================
  {
    name: "66/00 parse: the three tag findings are still reported, with their wording unchanged",
    run: async () => {
      await withOpenStory(
        "@executable @bogus\n@milestone-03\nFeature: Thing\n\n  @manual\n  Scenario: does a thing\n    When x\n    Then y\n",
        ({ findings }) => {
          const problems = findings.map((f) => f.problem);
          assert.ok(
            problems.includes('unknown tag "@bogus" (outside the closed vocabulary)'),
            `unknown-tag wording unchanged: ${JSON.stringify(problems)}`,
          );
          assert.ok(
            problems.includes('tag "@milestone-03" — milestone membership is structural, not a tag'),
            `milestone-membership wording unchanged: ${JSON.stringify(problems)}`,
          );
          assert.ok(
            problems.includes(
              'scenario "does a thing" carries 2 verification tags (need exactly 1): [@executable, @manual]',
            ),
            `verification-count wording unchanged: ${JSON.stringify(problems)}`,
          );
        },
      );
    },
  },
  {
    name: "66/00 parse: the tag vocabulary is still sourced from `config.work.tags`, the one config key validate reads",
    run: async () => {
      const feature = "@executable\nFeature: Thing\n\n  @validate\n  Scenario: does a thing\n    When x\n    Then y\n";
      await withOpenStory(feature, ({ findings }) => {
        assert.deepEqual(findings, [], "a configured domain tag is accepted");
      });
      await withOpenStory(
        feature,
        ({ findings }) => {
          assert.ok(
            findings.some((f) => f.problem.includes('unknown tag "@validate"')),
            "the SAME tag is unknown when the config does not declare it — the vocabulary is config-sourced",
          );
        },
        { work: { tags: { domains: ["@other"] } } },
      );
    },
  },

  // =====================================================================
  // Scenario: the god node gets shorter, and its 243 dependents are untouched
  // =====================================================================
  {
    name: "66/00 parse: the god node has not regained the scanning this story moved to the leaf",
    run: async () => {
      // THE LINE-COUNT RATCHET IS RETIRED, and what it was for is asserted directly.
      //
      // It pinned `src/work.mjs` under 1,210 lines — what 66/00 left behind after moving
      // the Gherkin scanning out. As a claim about THIS story's diff that is permanently
      // true and no longer measurable: the file is shared by 262 dependents, and every
      // later milestone that legitimately extends it moved the number (1,424 today).
      // Milestone 68 alone added two verbs. A shrink-only mark on a module other
      // milestones must extend is a gate that reds for reasons its owner cannot control,
      // and this one had been red long enough to be read as background.
      //
      // The MEANING survives, and it is stronger than a line count ever was: the scanning
      // must not come back. A regained parser is caught by shape rather than by size —
      // the leg below in this file asserts `work.mjs` reaches the grammar only by
      // IMPORTING the leaf, and `arch/FF-6601` asserts it carries no recogniser at all.
      // A hundred lines of unrelated growth never tripped the old mark's intent; ten
      // lines of re-inlined lexer would, and those two legs catch it.
      //
      // NAMED, NOT ABSORBED: a general growth ratchet on the god node is a real and
      // separate concern, and no gate now owns it. That is a gap this story cannot fill
      // — it can only speak for the scanning it removed — and it is recorded here rather
      // than implied by a mark that measured size and claimed to mean structure.
      const source = await readFile(srcWork, "utf8");
      assert.match(
        source,
        /import\s*\{[^}]*\bparseFeature\b[^}]*\}\s*from\s*"\.\/feature-parse\.mjs"/u,
        "the god node reaches the grammar by importing the one leaf",
      );
      for (const keyword of ["Given ", "When ", "Then ", "Scenario:", "Feature:", "Examples:"]) {
        assert.ok(
          !source.includes(`"${keyword}`) && !source.includes(`'${keyword}`),
          `the god node regained a Gherkin keyword literal ("${keyword}") — the scanning this story moved to the leaf is coming back`,
        );
      }
    },
  },
  {
    name: "66/00 parse: no exported signature of `src/work.mjs` is added, removed, renamed or re-typed (243 dependents)",
    run: async () => {
      const source = await readFile(srcWork, "utf8");
      const exported = [...source.matchAll(/^export\s+(?:async\s+)?(?:function|const|class|let)\s+([A-Za-z0-9_$]+)/gm)].map(
        (m) => m[1],
      );
      // The exported surface measured at HEAD before 66/00 (`git show HEAD:src/work.mjs`).
      const AT_HEAD = [
        "ITEM_RE",
        "WORK_ITEM_SCHEMA_VERSION",
        "applyItemFrontmatter",
        "findWork",
        "healIdentitySidecar",
        "listItems",
        "listStream",
        "loadWorkspace",
        "nextWork",
        "parseFrontmatter",
        "readItemSchema",
        "readItemVersion",
        "recordDoc",
        "rollbackItemStatus",
        "siblingDependencyNumber",
        "siblingGate",
        "validateWork",
      ];
      // SUBSET, NOT EQUALITY — the invariant this row's own message names is that the
      // 243 dependents are UNAFFECTED, and a dependent is unaffected by an ADDITION. It
      // breaks on a removal, a rename or a re-type, and those are what this now refuses.
      //
      // Equality froze the god node's public surface at 66/00's snapshot forever, so a
      // later milestone adding a verb failed a milestone-66 test about a diff it had
      // nothing to do with. Milestone 68 added `setItemStatus` and `typeHasRecordDoc`
      // (8167486) and this gate has been red since, naming a "net deletion" claim that
      // was true of 66/00 and was never a claim about the future.
      const missing = AT_HEAD.filter((name) => !exported.includes(name));
      assert.deepEqual(
        missing,
        [],
        "an export 66/00 INHERITED is gone from src/work.mjs — removed, renamed or re-typed. That is what breaks the 243 dependents; additions by later milestones do not",
      );
    },
  },

  // =====================================================================
  // Scenario: the parser stays pure, so it is testable without a filesystem
  // =====================================================================
  {
    name: "66/00 parse: the parser imports no `node:fs`, spawns no process and reads no clock",
    run: async () => {
      const source = await readFile(srcParser, "utf8");
      const body = source.replace(/^\s*\/\/.*$/gm, "");
      assert.equal(/^import\s|require\(/m.test(body), false, "the one parser imports nothing at all");
      for (const impurity of ["node:fs", "node:child_process", "node:process", "Date.now", "Math.random", "spawn("]) {
        assert.equal(body.includes(impurity), false, `the parser must not reach ${impurity}`);
      }
    },
  },
  {
    name: "66/00 parse: the same text yields byte-identical output on every call",
    run: async () => {
      const text = await readFile(
        path.join(workDir, FREE_TEXT_ROWS[0].file.replaceAll("/", path.sep)),
        "utf8",
      );
      assert.equal(JSON.stringify(parseFeature(text)), JSON.stringify(parseFeature(text)));
      assert.deepEqual(parseFeature(text), parseFeature(text));
    },
  },

  // =====================================================================
  // Scenario Outline: free text in step position is ONE structural finding,
  // naming the line that opened it — one test per Examples row, driven against
  // the REAL cited file.
  // =====================================================================
  ...FREE_TEXT_ROWS.map((row) => ({
    name: `66/00 parse: ${row.shape} → ONE finding naming line ${row.line} (${row.file})`,
    run: async () => {
      // A row whose file is LIVE (under an open item) is expected to be repaired one
      // day; when it is, this test is a re-measurement notice, not a parser defect.
      const whenRed = row.live
        ? ` — ${row.file} is the ONE LIVE file this gate exists to make somebody fix. If it has been repaired, this red means RE-MEASURE AND RECORD the new population (task 02's per-milestone table moves with it); it does NOT mean the parser broke.`
        : "";
      const file = path.join(workDir, row.file.replaceAll("/", path.sep));
      const parsed = parseFeature(await readFile(file, "utf8"));
      assert.equal(parsed.structural.length, 1, `exactly one structural finding for ${row.file}${whenRed}`);
      const [finding] = parsed.structural;
      assert.equal(finding.line, row.line, `it names line ${row.line}, not the whole file${whenRed}`);
      assert.equal(finding.freeTextLines, row.freeTextLines, `and the free-text line count the contract measured${whenRed}`);
      assert.match(finding.problem, new RegExp(`\\bline ${row.line}\\b`), "the line is named in the finding itself");
      // Distinguishable from a tag finding, because the two are fixed differently.
      assert.ok(isStructural({ problem: finding.problem }), "reads as a structural parse failure");
      assert.equal(isTagFinding({ problem: finding.problem }), false, "and never as a tag-vocabulary failure");
    },
  })),

  // =====================================================================
  // Scenario Outline: a construct the corpus already uses is never a structural
  // finding — one test per Examples row.
  // =====================================================================
  ...CONSTRUCT_ROWS.map((row) => ({
    name: `66/00 parse: ${row.construct} → no structural finding`,
    run: () => {
      for (const text of [row.text, ...(row.variants ?? [])]) {
        const parsed = parseFeature(text);
        assert.deepEqual(parsed.structural, [], `${row.construct} must never be a finding: ${JSON.stringify(text)}`);
        assert.deepEqual(
          consumerView(parsed),
          legacyParseFeature(text),
          "and its scenarios, their names and their lanes are reported exactly as they are today",
        );
      }
    },
  })),

  // =====================================================================
  // Scenario Outline: the boundary is decided here rather than discovered later
  // =====================================================================
  ...BOUNDARY_ROWS.map((row) => ({
    name: `66/00 parse: ${row.input} → ${row.finding ? "a" : "no"} structural finding (${row.why})`,
    run: () => {
      const parsed = parseFeature(row.text);
      assert.equal(parsed.structural.length, row.finding ? 1 : 0, `${row.input}: ${row.why}`);
      if (row.pairedText != null) {
        assert.equal(
          parseFeature(row.pairedText).structural.length,
          row.pairedFinding ? 1 : 0,
          "the paired shape — the same line, one property changed — settles the row rather than leaving it vacuous",
        );
      }
    },
  })),

  // The one boundary the corpus DOES force, and the keyword case, both decided here.
  {
    name: "66/00 parse: a step keyword on a line after an `Examples:` table, inside the same scenario → no structural finding (admitted deliberately)",
    run: async () => {
      const text =
        "@executable\nFeature: Thing\n\n  Scenario Outline: rows\n    When I pass <input>\n    Then I get <output>\n\n    Examples: the matrix\n      | input | output |\n      | a     | b      |\n    And every row above holds for the whole outline\n";
      assert.deepEqual(parseFeature(text).structural, [], "a live aof authoring idiom, admitted though real Gherkin rejects it");
      // The 8 lines the contract measured, in two REAL files under a `done` milestone.
      for (const file of [
        "archive/49_milestone_terminals-home/stories/03_story_pane-declaration-and-invariant-4/tasks/00_the-fourth-host.feature",
        "archive/49_milestone_terminals-home/stories/03_story_pane-declaration-and-invariant-4/tasks/02_invariant-4-amended.feature",
      ]) {
        const parsed = parseFeature(await readFile(path.join(workDir, file.replaceAll("/", path.sep)), "utf8"));
        assert.deepEqual(parsed.structural, [], `${file} carries the idiom and stays silent`);
      }
    },
  },
  // The two rows below are ONE differential: the same narrative line, in the same
  // position, differing only in the case of its first word. 46 files in the corpus
  // carry a narrative line beginning `and …`; folding case takes the population from
  // 16 files / 47 lines to 67 / 492.
  {
    name: "66/00 parse: a narrative line beginning `and ` in lower case → no structural finding (the match is CASE-SENSITIVE)",
    run: () => {
      const text = "@executable\nFeature: Thing\n\n  and the same words, in the case Gherkin does NOT reserve\n  more narrative\n\n  Scenario: does a thing\n    When x\n    Then y\n";
      assert.deepEqual(parseFeature(text).structural, [], "folding case would fire on ~18 live files instead of one");
    },
  },
  {
    name: "66/00 parse: a narrative line beginning `And ` in title case → a structural finding (the case Gherkin reserves)",
    run: () => {
      const text = "@executable\nFeature: Thing\n\n  And the same words, in the case Gherkin does NOT reserve\n  more narrative\n\n  Scenario: does a thing\n    When x\n    Then y\n";
      const parsed = parseFeature(text);
      assert.equal(parsed.structural.length, 1, "the same words, in the case Gherkin reserves");
      assert.equal(parsed.structural[0].line, 4);
    },
  },
];
