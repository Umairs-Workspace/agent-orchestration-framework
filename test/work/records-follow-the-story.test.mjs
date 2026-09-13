// Traceability wiring for story 85 /
// tasks/00_assimilate-authors-the-outcome.feature — ONLY the @executable scenarios. The
// @manual one (an assimilated story is indistinguishable from a verified one in its record
// set) is agent-run at aof:verify, exactly as story 80's own authoring scenarios are:
// comparing two real folders is not something the executable suite can do.
//
// ONE RULE, BOTH DOORS. A story arrives through the forward loop (`aof:add-story` → refine →
// continue → `aof:verify`) or through assimilation (`aof:assimilate-code`, which drives the
// item to `status: done` in its own step and never hands off to verify). Both must leave the
// same two records behind, in the story's OWN folder.
//
// THE ONE-WRITER RULE IS KEPT, NOT REPEALED. 39/ADR-004 exists to stop a developer/evidence
// subagent with `Write` from clobbering records and fabricating decisions — the template says
// so in its own header. That threat model names a SUBAGENT; story 80's contract test
// implemented it as "only verify.md". The two are not the same statement, and this suite
// pins the reconciliation: an accepting main-session govern command may author, and an agent
// prompt may not, ever.
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BUNDLE = path.join(repoRoot, "src", "bundle");
const COMMANDS = path.join(BUNDLE, "commands");
const AGENTS = path.join(BUNDLE, "agents");
const VERIFY_PROMPT = path.join(COMMANDS, "verify.md");
const ASSIMILATE_PROMPT = path.join(COMMANDS, "assimilate-code.md");
const RETROSPECTIVE_PROMPT = path.join(COMMANDS, "retrospective.md");

// The doors, by the name the feature's Examples table uses.
const DOORS = [
  { example: "assimilate-code command", file: ASSIMILATE_PROMPT },
  { example: "verify command", file: VERIFY_PROMPT },
];

// PROSE IS MATCHED ON FLATTENED WHITESPACE, and that is the whole reason this suite does not
// re-use story 80's `[^\n]{0,60}` shape unchanged. A prompt is wrapped to 100 columns by hand,
// so the distance between a verb and the filename it governs is decided by where the line
// broke — a rule keyed on `[^\n]` silently stops holding the first time someone reflows a
// paragraph, which is a gate that fails open. Flattening asks the question the rule actually
// means: does this sentence instruct it?
const flatten = (text) => text.replace(/\s+/g, " ");

// "instructs someone to author an OUTCOME.md" — story 80's rule, on flattened text. The verb
// must PRECEDE the filename: a prompt that merely NAMES the document (continue.md:
// "`VERIFICATION.md`/`OUTCOME.md` authorship … belong to `aof:verify`") is not an instruction
// to author one. `[^.]` keeps the match inside one sentence, which is what stops a verb in one
// clause reaching a filename two sentences later.
const OUTCOME_AUTHORING = /\b(write|author|fill|edit|instantiate)\b[^.]{0,80}OUTCOME\.md/i;
const RETROSPECTIVE_AUTHORING = /\b(write|author|fill|edit|instantiate|distil)\w*\b[^.]{0,120}RETROSPECTIVE\.md/i;
// The record is the STORY's, in the story's own folder — either order, one sentence.
const OWN_FOLDER = /RETROSPECTIVE\.md[^.]{0,200}own folder|own folder[^.]{0,200}RETROSPECTIVE\.md/i;

const SHARED_TEMPLATE = ".aof/templates/work/shared/OUTCOME.md";

// The lifecycle move that makes a prompt a DOOR: it drives an item to the terminal state
// itself. This is the predicate, not a hard-coded pair of filenames — "which prompts may
// author a record doc" has to be answerable from what a prompt DOES, or the next accepting
// command is admitted by someone editing a list.
const ACCEPT_MOVE = /aof work status <(?:ref|NN)> done/;

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

// The prompts that ACCEPT — a command (never an agent, never a skill) carrying the accept
// move. Discovered from disk, so a third accepting command inherits the permission and the
// obligation together rather than one of them.
async function acceptingCommands() {
  const found = [];
  for (const name of (await readdir(COMMANDS)).sort()) {
    if (!name.endsWith(".md")) continue;
    const file = path.join(COMMANDS, name);
    if (ACCEPT_MOVE.test(await readFile(file, "utf8"))) found.push(file);
  }
  return found;
}

const TYPES = ["milestone", "story", "chore", "spike", "uat"];

// Each type's answer as the prompt states it: "authored", "none", or absent. Read off the
// `**`type`**` row of the prompt's own table, so the two doors are compared on what they say
// rather than on a list this test holds.
// A ROW ENDS WHERE THE NEXT TYPE'S ROW BEGINS, never at a fixed character count. A window
// wide enough for the longest row reaches into the row after the shortest one — measured
// here: a 200-char window over the assimilate prompt read the `chore` row's answer off the
// `spike` row below it and reported "none" for a type the prompt says is authored.
function typeAnswersIn(source) {
  const flat = flatten(source);
  const answers = {};
  for (const type of TYPES) {
    const label = `**\`${type}\`**`;
    const marker = flat.indexOf(label);
    if (marker === -1) continue;
    const rest = flat.slice(marker + label.length, marker + label.length + 400);
    const boundaries = TYPES.map((other) => rest.indexOf(`**\`${other}\`**`)).filter((at) => at >= 0);
    const row = boundaries.length > 0 ? rest.slice(0, Math.min(...boundaries)) : rest;
    answers[type] = /\*\*none\.\*\*/i.test(row) ? "none" : /authored/i.test(row) ? "authored" : "unstated";
  }
  return answers;
}

export const recordsFollowTheStoryTests = [
  // ==================================================================
  // Scenario Outline: each door that accepts a story instructs both records
  // ==================================================================
  ...DOORS.map(({ example, file }) => ({
    name: `85/00 records-follow-the-story: the shipped ${example} instructs both records and names the same delivering types`,
    run: async () => {
      const src = await readFile(file, "utf8");
      const flat = flatten(src);

      // …it instructs the session to instantiate an OUTCOME.md from the shared template.
      assert.match(flat, OUTCOME_AUTHORING, `${example}: instructs the session to author an OUTCOME.md`);
      assert.ok(
        src.includes(SHARED_TEMPLATE),
        `${example}: instantiates it from the type-agnostic shared template "${SHARED_TEMPLATE}"`,
      );
      for (const type of [...TYPES, "task"]) {
        assert.ok(
          !src.includes(`.aof/templates/work/${type}/OUTCOME.md`),
          `${example}: does not instantiate an OUTCOME.md from the per-type path .aof/templates/work/${type}/OUTCOME.md`,
        );
      }

      // …and it instructs the session to author a RETROSPECTIVE.md for the story, in the
      // story's own folder. Nesting is not a reason to skip it: measured before this story,
      // 57 RETROSPECTIVE.md at driver level and ZERO under `stories/`.
      assert.match(flat, RETROSPECTIVE_AUTHORING, `${example}: instructs the session to author a RETROSPECTIVE.md`);
      assert.match(flat, OWN_FOLDER, `${example}: says the story's own folder carries it`);

      // …and it names the same delivering types the verify prompt names. The expected
      // partition is READ OFF verify.md, never held here, so the two doors cannot come to
      // disagree about a spike inside one milestone while this test still passes.
      const expected = typeAnswersIn(await readFile(VERIFY_PROMPT, "utf8"));
      assert.deepEqual(
        typeAnswersIn(src),
        expected,
        `${example}: names the same delivering types, with the same answer each, as the verify prompt`,
      );
    },
  })),

  // Non-vacuity for the comparison above: verify.md's own table is the three-authored /
  // two-excluded partition story 80 legislated, so "the same as verify" is a real claim.
  {
    name: "85/00 records-follow-the-story: the verify prompt's type table is the partition the comparison rests on (milestone/story/chore authored; spike/uat none)",
    run: async () => {
      assert.deepEqual(typeAnswersIn(await readFile(VERIFY_PROMPT, "utf8")), {
        milestone: "authored",
        story: "authored",
        chore: "authored",
        spike: "none",
        uat: "none",
      });
    },
  },

  // ==================================================================
  // Scenario: a spike and a uat still carry no outcome, from whichever door.
  // The exclusions travel WITH the permission — and each states its reason,
  // because an omission reads as an oversight and gets "fixed".
  // ==================================================================
  ...DOORS.map(({ example, file }) => ({
    name: `85/00 records-follow-the-story: the ${example} authors no outcome for a spike or a uat, and states the reason for each`,
    run: async () => {
      const flat = flatten(await readFile(file, "utf8"));

      const spikeRow = flat.slice(flat.indexOf("**`spike`**"), flat.indexOf("**`spike`**") + 320);
      assert.match(spikeRow, /\*\*none\.\*\*/i, `${example}: states that a spike carries **none**`);
      assert.match(spikeRow, /SPIKE\.md/, `${example}: cites SPIKE.md \`## Finding\` as where the spike's deliverable lives`);
      assert.match(spikeRow, /knowledge, not system state/i, `${example}: states WHY a spike carries none`);

      const uatRow = flat.slice(flat.indexOf("**`uat`**"), flat.indexOf("**`uat`**") + 320);
      assert.match(uatRow, /\*\*none\.\*\*/i, `${example}: states that a uat carries **none**`);
      assert.match(uatRow, /SESSION\.md/, `${example}: cites SESSION.md as where the uat's verdict lives`);
      assert.match(uatRow, /twice|second time/i, `${example}: states WHY a uat carries none`);
    },
  })),

  // ==================================================================
  // Scenario: the one-writer contract admits the govern commands and still
  // refuses every subagent
  // ==================================================================
  {
    name: "85/00 records-follow-the-story: only a command that ACCEPTS an item may instruct anyone to author an OUTCOME.md",
    run: async () => {
      const accepting = new Set((await acceptingCommands()).map((file) => path.resolve(file)));
      const offenders = [];
      for (const file of await bundlePromptFiles()) {
        if (accepting.has(path.resolve(file))) continue;
        const hit = flatten(await readFile(file, "utf8")).match(OUTCOME_AUTHORING);
        if (hit) offenders.push(`${path.relative(repoRoot, file)}: ${hit[0]}`);
      }
      assert.deepEqual(offenders, [], `only an accepting command authors OUTCOME.md; got ${JSON.stringify(offenders)}`);
    },
  },
  {
    name: "85/00 records-follow-the-story: NO agent prompt carries a record-authoring instruction — the subagent refusal is untouched",
    run: async () => {
      const offenders = [];
      for (const name of await readdir(AGENTS)) {
        if (!name.endsWith(".md")) continue;
        const src = flatten(await readFile(path.join(AGENTS, name), "utf8"));
        for (const [record, rule] of [["OUTCOME.md", OUTCOME_AUTHORING], ["RETROSPECTIVE.md", RETROSPECTIVE_AUTHORING]]) {
          const hit = src.match(rule);
          if (hit) offenders.push(`agents/${name} (${record}): ${hit[0]}`);
        }
      }
      assert.deepEqual(offenders, [], `no agent prompt authors a record doc; got ${JSON.stringify(offenders)}`);
    },
  },
  {
    name: "85/00 records-follow-the-story: the scan is non-vacuous — the accepting commands are exactly verify + assimilate-code, and BOTH match the rule the others must not",
    run: async () => {
      const accepting = await acceptingCommands();
      // A POLICY ALLOWLIST with its floor (FF-11902): the two govern commands are named AMONG what
      // the scan found, and every accepting prompt found is one of them.
      const GOVERN_COMMANDS = ["assimilate-code.md", "verify.md"];
      const names = accepting.map((file) => path.basename(file)).sort();
      for (const name of GOVERN_COMMANDS) assert.ok(names.includes(name), `${name} carries the accept move — the scan of the commands must find it`);
      for (const name of names) assert.ok(GOVERN_COMMANDS.includes(name), `${name} carries the accept move and is not one of the two govern commands`);
      for (const file of accepting) {
        assert.match(
          flatten(await readFile(file, "utf8")),
          OUTCOME_AUTHORING,
          `sanity: ${path.basename(file)} is a prompt that authors OUTCOME.md`,
        );
      }
    },
  },

  // ==================================================================
  // Scenario: a nested story carries both records in its own folder
  // ==================================================================
  {
    name: "85/00 records-follow-the-story: the accept path states that a nested story's own folder carries BOTH records — no milestone above it satisfies either",
    run: async () => {
      const verify = flatten(await readFile(VERIFY_PROMPT, "utf8"));
      const retro = flatten(await readFile(RETROSPECTIVE_PROMPT, "utf8"));

      // The retrospective half: every story gets its own, nesting notwithstanding…
      assert.match(verify, /nesting is not a reason to skip it/i, "the verify prompt states that nesting is not a reason to skip a story's retrospective");
      assert.match(verify, OWN_FOLDER, "the verify prompt says the story's own folder carries it");

      // …and the session that writes it takes a STORY ref and writes into the story's folder.
      assert.match(retro, /nesting is not a reason to skip it/i, "the retrospective session states the same rule");
      assert.match(retro, /stories\/<SS>_story_<slug>\/RETROSPECTIVE\.md/, "the retrospective session names the story's own path as where a nested story's retro lands");
      assert.match(retro, /NN\/SS/, "the retrospective session admits a nested story's NN/SS ref as a target");

      // The outcome half: authored for a story whether it is nested or parentless.
      assert.match(
        verify,
        /\*\*`story`\*\*[^.]{0,160}whether it sits under a milestone or is parentless/i,
        "the verify prompt authors a story's outcome whether it is nested or parentless",
      );
    },
  },
];
