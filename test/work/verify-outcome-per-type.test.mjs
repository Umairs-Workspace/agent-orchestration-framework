// Traceability wiring for story 80 /
// tasks/01_verify-authors-one-per-delivering-type.feature — ONLY the @executable
// scenarios. The @manual ones (Accept authors one per delivering type; a milestone's
// outcome states milestone-level state; the product-state-vs-motive Examples) are
// agent-run at aof:verify, exactly as milestone 39's own authoring scenarios are:
// judging prose is not something the executable suite can do.
//
// THREE TYPES DELIVER; TWO DO NOT, AND BOTH HALVES ARE DECISIONS. An omission reads
// as an oversight and gets "fixed" by the next person to notice it, so the exclusions
// are asserted to be PRESENT IN THE PROMPT — with a reason — not merely absent from a
// list. And ONE WRITER PER DOCUMENT is untouched: 39/ADR-004 widened only in WHICH
// items get an outcome, never in who authors one.
import assert from "node:assert/strict";
import { readFile, readdir, mkdtemp, mkdir, writeFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recordDoc, validateWork } from "../../src/work.mjs";
import { doctorWork } from "../../src/work/doctor.mjs";
import { parseOutcome } from "../../src/memory/local-indexing.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BUNDLE = path.join(repoRoot, "src", "bundle");
const VERIFY_PROMPT = path.join(BUNDLE, "commands", "verify.md");
const DEVELOPER_AGENT = path.join(BUNDLE, "agents", "aof-developer.md");

// "instructs someone to author an OUTCOME.md" — the SAME shape
// test/arch/run/acd-outcome-authored-by-verify.test.mjs uses for the developer agent, so
// the two surfaces are judged by one rule. A prompt that merely NAMES the document
// (continue.md: "`VERIFICATION.md`/`OUTCOME.md` authorship … belong to `aof:verify`")
// is not an instruction to author one — the verb must PRECEDE the filename.
const AUTHORING_INSTRUCTION = /\b(write|author|fill|edit|instantiate)[^\n]{0,60}OUTCOME\.md/i;

async function bundlePromptFiles() {
  const files = [];
  for (const sub of ["commands", "agents"]) {
    const dir = path.join(BUNDLE, sub);
    for (const name of await readdir(dir)) {
      if (name.endsWith(".md")) files.push(path.join(dir, name));
    }
  }
  const skillsRoot = path.join(BUNDLE, "skills");
  for (const entry of await readdir(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skill = path.join(skillsRoot, entry.name, "SKILL.md");
    if (await stat(skill).then(() => true, () => false)) files.push(skill);
  }
  return files;
}

function frontmatter(fields) {
  const body = Object.entries(fields)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? `[${value.join(", ")}]` : value}`)
    .join("\n");
  return `---\n${body}\n---\n`;
}

const OUTCOME_BODY = `# 80 · Sample — Outcome

## Delivered

### Sample capability
The system now does the sample thing.

## Assumptions

- **A precondition** — the condition the capability rests on.

## Gaps

### An unfilled surface
- **Status:** open
- **Discharge condition:** a producer exists.
The gap statement.
`;

export const verifyOutcomePerTypeTests = [
  // ==================================================================
  // Scenario: the verify prompt names each type's answer explicitly
  // ==================================================================
  {
    name: "80/01 verify-outcome: the verify prompt names milestone, story and chore as the types it authors an OUTCOME.md for",
    run: async () => {
      const src = await readFile(VERIFY_PROMPT, "utf8");
      for (const type of ["milestone", "story", "chore"]) {
        assert.match(
          src,
          new RegExp(`\\*\\*\`${type}\`\\*\\*[^\\n]*—[^\\n]*authored`, "i"),
          `the verify prompt names "${type}" as a type it authors an OUTCOME.md for`,
        );
      }
    },
  },
  {
    name: "80/01 verify-outcome: the verify prompt names spike and uat as types that carry NONE, each with its reason",
    run: async () => {
      const src = await readFile(VERIFY_PROMPT, "utf8");

      // The EXCLUSION itself — written, not omitted.
      assert.match(src, /\*\*`spike`\*\*[^\n]*\*\*none\.\*\*/i, 'the prompt states that a spike carries **none**');
      assert.match(src, /\*\*`uat`\*\*[^\n]*\*\*none\.\*\*/i, 'the prompt states that a uat carries **none**');

      // ...and the REASON for each, which is what stops the next reader "fixing" it.
      // A spike delivers knowledge (SPIKE.md ## Finding); a uat a verdict over items
      // that already carry their own outcomes.
      const spikeReason = src.match(/\*\*`spike`\*\*[\s\S]{0,320}/i)?.[0] ?? "";
      assert.match(spikeReason, /SPIKE\.md/, "the spike exclusion cites SPIKE.md `## Finding` as where its deliverable lives");
      assert.match(spikeReason, /knowledge, not system state/i, "the spike exclusion states WHY: knowledge, not system state");

      const uatReason = src.match(/\*\*`uat`\*\*[\s\S]{0,320}/i)?.[0] ?? "";
      assert.match(uatReason, /SESSION\.md/, "the uat exclusion cites SESSION.md as where its verdict lives");
      assert.match(uatReason, /twice|second time/i, "the uat exclusion states WHY: it would index the same capability twice");

      // The spike's own dispatch block says it too — a `spike` never reaches the
      // <process> steps, so the decision has to be readable where the spike lands.
      assert.match(
        src,
        /A spike carries NO\s*\n?\s*`OUTCOME\.md`/,
        "the <spike-chore> dispatch block also states that a spike carries no OUTCOME.md",
      );
    },
  },
  {
    name: '80/01 verify-outcome: the verify prompt instantiates the template from ".aof/templates/work/shared/OUTCOME.md" and from no per-type path',
    run: async () => {
      const src = await readFile(VERIFY_PROMPT, "utf8");
      assert.match(src, /\.aof\/templates\/work\/shared\/OUTCOME\.md/, "the prompt names the type-agnostic template path");
      for (const type of ["milestone", "story", "chore", "spike", "uat", "task"]) {
        assert.ok(
          !src.includes(`.aof/templates/work/${type}/OUTCOME.md`),
          `the prompt does not instantiate an OUTCOME.md from the per-type path .aof/templates/work/${type}/OUTCOME.md`,
        );
      }
      // The chore branches to <spike-chore> BEFORE <process>, so the instantiation
      // must be reachable there too — otherwise a chore's outcome is never authored.
      const spikeChore = src.match(/<spike-chore>[\s\S]*?<\/spike-chore>/)?.[0] ?? "";
      assert.match(
        spikeChore,
        /\.aof\/templates\/work\/shared\/OUTCOME\.md/,
        "the chore's own dispatch block instantiates the shared template — a chore never reaches <process>",
      );
    },
  },
  {
    name: "80/01 verify-outcome: no shipped bundle prompt OUTSIDE the accepting govern commands instructs anyone to author an OUTCOME.md",
    run: async () => {
      // AMENDED BY STORY 85, AND THE DELIVERED CRITERION IS NOT EDITED. 80/01's `.feature`
      // says "no other shipped bundle prompt instructs anyone to author an OUTCOME.md", and
      // the rule it was protecting is 39/ADR-004's — whose threat model names a SUBAGENT with
      // `Write` that clobbers records and fabricates decisions. "Only verify.md" was that
      // rule's IMPLEMENTATION, and the two came apart the moment a SECOND main-session govern
      // command reached `status: done` without meeting verify: `aof:assimilate-code` accepted
      // story 84 and could not author the record every other accepted item carries.
      //
      // So the admitted set is the commands that ACCEPT — discovered from the accept move
      // itself, never a hard-coded pair of filenames — and the subagent refusal is untouched
      // and asserted separately below. Story 85's own contract states the widened rule
      // (`tasks/00`, "the one-writer contract admits the govern commands and still refuses
      // every subagent"); `records-follow-the-story.test.mjs` is its wiring.
      const accepting = new Set();
      for (const name of await readdir(path.join(BUNDLE, "commands"))) {
        if (!name.endsWith(".md")) continue;
        const file = path.join(BUNDLE, "commands", name);
        if (/aof work status <(?:ref|NN)> done/.test(await readFile(file, "utf8"))) accepting.add(path.resolve(file));
      }
      assert.ok(accepting.has(path.resolve(VERIFY_PROMPT)), "verify.md is one of the accepting commands");

      const offenders = [];
      for (const file of await bundlePromptFiles()) {
        if (accepting.has(path.resolve(file))) continue;
        const src = await readFile(file, "utf8");
        const hit = src.match(AUTHORING_INSTRUCTION);
        if (hit) offenders.push(`${path.relative(repoRoot, file)}: ${hit[0]}`);
      }
      assert.deepEqual(offenders, [], `only an accepting govern command authors OUTCOME.md; got ${JSON.stringify(offenders)}`);

      // Non-vacuity: verify.md itself DOES match the rule the others must not.
      const verifySrc = await readFile(VERIFY_PROMPT, "utf8");
      assert.match(verifySrc, AUTHORING_INSTRUCTION, "sanity: verify.md is the prompt that authors OUTCOME.md");
    },
  },

  // ==================================================================
  // Scenario: the developer agent is still never instructed to author one.
  // 39/ADR-004 is widened in WHICH items get an outcome, never in who writes one.
  // ==================================================================
  {
    name: "80/01 verify-outcome: the shipped aof-developer agent carries no instruction to write, author, fill or edit an OUTCOME.md",
    run: async () => {
      const src = await readFile(DEVELOPER_AGENT, "utf8");
      assert.doesNotMatch(
        src,
        /\b(write|author|fill|edit)[^\n]{0,60}OUTCOME\.md/i,
        "the developer/evidence subagent is never instructed to author an OUTCOME.md (verify owns record docs)",
      );
    },
  },

  // ==================================================================
  // Scenario Outline: an item's primary record doc is its identity doc —
  // never OUTCOME.md. Re-asserted here because THIS story is the one that
  // widens which items carry an outcome; recordDoc must not move with it.
  // ==================================================================
  ...[
    ["milestone", "SPEC.md"],
    ["story", "STORY.md"],
    ["uat", "SESSION.md"],
    ["spike", "SPIKE.md"],
    ["chore", "CHORE.md"],
  ].map(([type, record]) => ({
    name: `80/01 verify-outcome: recordDoc("${type}") is "${record}" and never "OUTCOME.md", with an OUTCOME.md co-present on disk`,
    run: async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), `aof-80-recorddoc-${type}-`));
      try {
        // The co-present OUTCOME.md is the point: an item that CARRIES one must
        // still resolve its identity record, not the additional artifact.
        await writeFile(path.join(dir, "OUTCOME.md"), OUTCOME_BODY, "utf8");
        const resolved = recordDoc({ type, dir });
        assert.equal(resolved, record, `record doc for "${type}" is "${record}"; got "${resolved}"`);
        assert.notEqual(resolved, "OUTCOME.md", `record doc for "${type}" never resolves to OUTCOME.md`);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  })),

  // ==================================================================
  // Scenario Outline: a delivering item carrying an OUTCOME.md still validates
  // on its identity record — and removing the OUTCOME.md changes neither result.
  // ==================================================================
  ...[
    { type: "story", folder: "80_story_sample", record: "STORY.md" },
    { type: "chore", folder: "81_chore_sample", record: "CHORE.md" },
  ].map(({ type, folder, record }) => ({
    name: `80/01 verify-outcome: a ${type} carrying an OUTCOME.md validates clean on ${record}, and removing the OUTCOME.md changes neither validate nor doctor`,
    run: async () => {
      const projectRoot = await mkdtemp(path.join(os.tmpdir(), `aof-80-validate-${type}-`));
      try {
        const workDir = path.join(projectRoot, "wiki", "work");
        const dir = path.join(workDir, folder);
        await mkdir(dir, { recursive: true });
        await mkdir(path.join(projectRoot, ".aof"), { recursive: true });
        const number = folder.slice(0, 2);
        await writeFile(
          path.join(dir, record),
          frontmatter({
            type,
            number,
            slug: "sample",
            title: '"Sample"',
            status: "done",
            created: "2026-08-20",
            updated: "2026-08-20",
            depends: [],
            schema: 1,
          }) + `# ${number} · Sample\n`,
          "utf8",
        );

        const outcomePath = path.join(dir, "OUTCOME.md");
        await writeFile(outcomePath, OUTCOME_BODY, "utf8");

        const withOutcome = await validateWork(workDir, {}, null);
        assert.deepEqual(
          withOutcome.filter((f) => f.path && f.path.startsWith(dir)),
          [],
          `the ${type} validates clean with a co-present OUTCOME.md; got ${JSON.stringify(withOutcome)}`,
        );
        assert.deepEqual(
          withOutcome.filter((f) => f.path && f.path.includes("OUTCOME.md")),
          [],
          "no finding names OUTCOME.md as an unexpected or unrecognised artifact",
        );
        const doctorWith = await doctorWork(workDir, {}, null, { projectRoot });
        assert.deepEqual(
          doctorWith.filter((f) => f.path && f.path.includes("OUTCOME.md")),
          [],
          `no doctor finding is anchored at the ${type}'s OUTCOME.md; got ${JSON.stringify(doctorWith)}`,
        );

        // ...and removing it changes VALIDATE not at all — the artifact is additive to the
        // identity record, which is the whole of 80/ADR-004 and is untouched.
        await rm(outcomePath);
        const without = await validateWork(workDir, {}, null);
        assert.deepEqual(without, withOutcome, "removing the OUTCOME.md changes the validate result not at all");

        // DOCTOR IS AMENDED BY STORY 85, AND ONLY FOR A `done` STORY. 80/01's delivered
        // criterion says removing the OUTCOME.md "changes neither result"; that was true when
        // nothing anywhere asked whether a delivered item carried one, and it stopped being
        // true when story 84 reached `done` carrying neither record and nothing said so.
        // Story 85's own contract states the superseding rule (`tasks/01`, "a done story
        // missing a record is named, and the missing one is named with it"), so the delivered
        // `.feature` is not edited and this assertion narrows to what 80 was actually
        // protecting: the artifact is additive, and its absence is now ALSO reportable — at
        // `warn`, by one advisory lane, against a story and nothing else.
        const doctorWithout = await doctorWork(workDir, {}, null, { projectRoot });
        const amended = (findings) => findings.filter((finding) => finding.code !== "story-record-missing");
        assert.deepEqual(
          amended(doctorWithout),
          amended(doctorWith),
          "removing the OUTCOME.md changes no doctor finding outside story 85's delivered-records lane",
        );
        const key = (finding) => `${finding.code}\0${finding.path}\0${finding.message}`;
        const before = new Set(doctorWith.map(key));
        const introduced = doctorWithout.filter((finding) => !before.has(key(finding)));
        assert.deepEqual(
          introduced.map((finding) => finding.code),
          type === "story" ? ["story-record-missing"] : [],
          `only a done ${type === "story" ? "story" : type} is judged on the records it carries; got ${JSON.stringify(introduced)}`,
        );
        for (const finding of introduced) {
          assert.equal(finding.severity, "warn", "the delivered-records lane is advisory");
          assert.equal(finding.path, dir, "and is anchored at the item's folder, never at the absent OUTCOME.md");
        }
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  })),

  // ==================================================================
  // Scenario: a chore's outcome is admitted with Delivered ALONE. ADR-003 keeps a
  // chore ceremony-light; the outcome adds one statement, not a story's ceremony.
  // ==================================================================
  {
    name: "80/01 verify-outcome: a chore OUTCOME.md filling only `## Delivered` yields one capability record, no gap record, and no error",
    run: () => {
      const choreOutcome = [
        "# 81 · Pin the rendered tree — Outcome",
        "",
        "## Delivered",
        "",
        "### Byte-stable rendered tree",
        "The rendered tree is byte-stable across platforms.",
        "",
        "## Assumptions",
        "",
        "## Gaps",
        "",
      ].join("\n");

      const records = parseOutcome(choreOutcome, { item: "81", itemSlug: "pin-eol", workRelPath: "81_chore_pin-eol/OUTCOME.md" });
      const capabilities = records.filter((r) => r.recordType === "capability");
      const gaps = records.filter((r) => r.recordType === "gap");
      assert.equal(capabilities.length, 1, `exactly one capability record; got ${JSON.stringify(records)}`);
      assert.equal(gaps.length, 0, `no gap record; got ${JSON.stringify(gaps)}`);
      assert.equal(capabilities[0].title, "Byte-stable rendered tree");
    },
  },
];
