// Fitness function: acd-capability-gap-cites-a-code-span (milestone 77 / story 00, FF-7701;
// ADR-003 §1-§5).
//
//   "A capability finding cites a CODE SPAN through a closed declared map, and under-reports
//    rather than guesses."
//
// ── WHY THE GATES ARE THIS NARROW, MEASURED ──────────────────────────────────────────────────
//
// The naive detector was built first and run over this repository's whole prompt corpus: any code
// span whose first token is a program name, attributed to any role word in the sentence. It
// produced SEVENTEEN findings, of which ZERO were the true one. The product-owner agent id matches
// a program prefix; a slash command is not a program; and "spawn <the designer>" is an instruction
// to the orchestrator, not to the designer. A lint with that precision is the lint 77/STATE
// forbids, so every clause of ADR-003 exists to remove one of those seventeen BY CONSTRUCTION.
//
// This control is what keeps them structural. Each leg below is a way the design has a measured
// route back to seventeen:
//
//   (A) THE TWO MAPS ARE CLOSED EXPORTED CONSTANTS, not literals at a comparison site. A second
//       program row — a bare tool-name token such as `Edit` in prose, the shape chore 76 already
//       closed — is the single change that would undo the whole design, and a token compared
//       inline is a change no reviewer sees. So every program token and every role word is
//       asserted to appear in ITS OWN DECLARATION and nowhere else in the module's code.
//
//   (B) ATTRIBUTION IS DRIVEN FROM BOTH SIDES. One bolded role word attributes; zero and two do
//       not. A control that only drove the positive would pass over a rule that attributed
//       everything.
//
//   (C) THE THREE REFUSED SHAPES ARE PLANTED AND REQUIRED SILENT — an agent id, a slash command,
//       and a bare tool-name span in a NEGATIVE prose construction ("has no `Bash`"). Those are
//       three of the seventeen, and each is refused by the SPACE-AND-ARGUMENT rule rather than by
//       an exception list, which is what this leg proves is still true.
//
//   (D) A CODE SPAN WRAPPED ACROSS LINES IS SEEN. The only true positive in the corpus breaks
//       between two of its own tokens, so a line-oriented reader finds nothing at all. Driven with
//       the exact shape measured at `refine.md:102-109`.
//
//   (E) CLAUSES SPLIT AT `. ! ? ;`. The live instance shares ONE SENTENCE with the architect's
//       instruction; at sentence granularity two role words appear, the ambiguity rule fires, and
//       the one true finding is dropped. Driven by putting both instructions in one sentence and
//       requiring the SECOND to be attributed.
//
//   (F) THE GRANT HAS ONE HOME. It is the agent document's own `tools:` frontmatter and there is
//       no mirrored list — driven by planting a second document that lists `Bash` for the role and
//       requiring the finding to stand.
//
// EVERY LANE ASSERTS ITS FLOOR BEFORE ITS CLAIM. A census over a renamed export reads nothing and
// every "no offender found" claim below it becomes vacuously true — which would be a poor joke
// inside this milestone.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { matchedBraceBody, stripComments } from "../../support/source-slice.mjs";
import {
  CAPABILITY_PROGRAMS,
  ROLE_WORDS,
  runPromptLayer,
} from "../../../src/work-audit/prompt-layer.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MODULE_REL = "src/work-audit/prompt-layer.mjs";
const moduleSource = () => readFileSync(path.join(repoRoot, MODULE_REL), "utf8");

// The floors. Below these the census is not reading the module, and every absence claim under it
// would be vacuous.
const SOURCE_FLOOR = 2000;
const PROGRAM_FLOOR = 8;
const ROLE_FLOOR = 8;

// ── FIXTURES ─────────────────────────────────────────────────────────────────────────────────
//
// A synthetic installed layer on disk with no aof checkout behind it: this rule's whole claim is
// that it travels, and a control that drove it against this repository would be asserting the one
// case it is guaranteed to work in.

function project(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), "aof-ff7701-"));
  for (const [rel, text] of Object.entries(files)) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return root;
}

async function gapsIn(files) {
  const root = project(files);
  try {
    const result = await runPromptLayer({ root });
    return result.findings.filter((finding) => finding.code === "audit-agent-capability-gap");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const agentDoc = (name, tools, body = "") =>
  `---\nname: ${name}\n${tools == null ? "" : `tools: ${tools}\n`}---\n\n${body}\n`;

const PO_NO_BASH = agentDoc("aof-product-owner", "Read, Grep, Glob, Write, Edit");
const ARCHITECT_WITH_BASH = agentDoc("aof-architect", "Read, Grep, Glob, Bash, Write, Edit");

// The declaration a constant lives in, cut on the language's own braces rather than by a byte
// window — the positional-slice species this repository has been bitten by five times.
function declarationBody(code, header) {
  const at = code.indexOf(header);
  assert.notEqual(at, -1, `${header} is declared in ${MODULE_REL} — a renamed export would make every claim below vacuous`);
  const body = matchedBraceBody(code, at);
  assert.notEqual(body, null, `${header}'s object literal was cut by matching braces`);
  assert.equal(body.length > 10, true, `${header}'s declaration is non-empty (${body.length} chars)`);
  return body;
}

export const archTests = [
  {
    name: "acd-capability-gap-cites-a-code-span: the program map and the role map are CLOSED exported constants, never literals at a comparison site",
    run() {
      const code = stripComments(moduleSource());
      assert.equal(code.length > SOURCE_FLOOR, true, `${MODULE_REL} was read and stripped to something real (${code.length} chars, floor ${SOURCE_FLOOR})`);

      // CLOSED: the maps and every collection inside them are frozen, so a caller cannot widen the
      // vocabulary at run time — which is the same escape as a second row, taken later.
      assert.equal(Object.isFrozen(CAPABILITY_PROGRAMS), true, "the program map is frozen");
      assert.equal(Object.isFrozen(ROLE_WORDS), true, "the role map is frozen");
      for (const [capability, programs] of Object.entries(CAPABILITY_PROGRAMS)) {
        assert.equal(Object.isFrozen(programs), true, `the program list for ${capability} is frozen`);
      }
      for (const [role, words] of Object.entries(ROLE_WORDS)) {
        assert.equal(Object.isFrozen(words), true, `the word list for ${role} is frozen`);
      }

      // ONE ROW. ADR-003 §2's whole point: there is no tool-name-token row, so a bare `Edit` in
      // prose is not evidence and cannot become evidence without this control seeing it.
      assert.deepEqual(Object.keys(CAPABILITY_PROGRAMS), ["Bash"], "the program map has exactly ONE row");

      const programs = Object.values(CAPABILITY_PROGRAMS).flat();
      const roleWords = Object.values(ROLE_WORDS).flat();
      assert.equal(programs.length >= PROGRAM_FLOOR, true, `the program set is non-vacuous: ${programs.length} programs, floor ${PROGRAM_FLOOR}`);
      assert.equal(Object.keys(ROLE_WORDS).length >= ROLE_FLOOR, true, `the role map is non-vacuous: ${Object.keys(ROLE_WORDS).length} roles, floor ${ROLE_FLOOR}`);

      // DECLARED IN ONE PLACE. Each token is asserted to sit inside its own declaration and to
      // appear NOWHERE ELSE in the module's code as a string literal — which is the structural
      // form of "not a literal at a comparison site".
      const programBody = declarationBody(code, "export const CAPABILITY_PROGRAMS");
      const roleBody = declarationBody(code, "export const ROLE_WORDS");
      const elsewhere = code.split(programBody).join(" ").split(roleBody).join(" ");
      assert.equal(elsewhere.length > SOURCE_FLOOR / 2, true, "the module outside the two declarations is still substantial, so the claim below is not cut away");

      for (const token of programs) {
        assert.equal(programBody.includes(`"${token}"`), true, `the program \`${token}\` is declared in CAPABILITY_PROGRAMS`);
        for (const quote of ['"', "'"]) {
          assert.equal(elsewhere.includes(`${quote}${token}${quote}`), false, `the program \`${token}\` is spelled nowhere else in ${MODULE_REL}`);
        }
      }
      for (const token of [...roleWords, ...Object.keys(ROLE_WORDS)]) {
        assert.equal(roleBody.includes(`"${token}"`), true, `the role token \`${token}\` is declared in ROLE_WORDS`);
        for (const quote of ['"', "'"]) {
          assert.equal(elsewhere.includes(`${quote}${token}${quote}`), false, `the role token \`${token}\` is spelled nowhere else in ${MODULE_REL}`);
        }
      }
    },
  },
  {
    name: "acd-capability-gap-cites-a-code-span: attribution is driven positively AND negatively — one bolded role word attributes, zero and two do not",
    async run() {
      const corpus = (clause) => ({
        ".claude/agents/aof-product-owner.md": PO_NO_BASH,
        ".claude/agents/aof-developer.md": agentDoc("aof-developer", "Read, Grep, Glob, Write, Edit"),
        ".claude/commands/order.md": clause,
      });

      const one = await gapsIn(corpus("The **PO** runs `aof work audit` at the close."));
      assert.equal(one.length, 1, "one bolded role word plus a program span yields a finding");
      assert.match(one[0].message, /`aof-product-owner`/u, "…naming that role");
      assert.match(one[0].message, /does not grant `Bash`/u, "…and the capability its grant omits");

      assert.equal(
        (await gapsIn(corpus("Somebody runs `aof work audit` at the close."))).length,
        0,
        "a clause with ZERO role words yields none — a rule that attributed those would attribute everything",
      );
      assert.equal(
        (await gapsIn(corpus("The **PO** and the **developer** run `aof work audit` at the close."))).length,
        0,
        "a clause with TWO role words yields none — ambiguity reports nothing rather than guessing",
      );
    },
  },
  {
    name: "acd-capability-gap-cites-a-code-span: the three measured false-positive shapes are planted and required SILENT",
    async run() {
      const rows = [
        ["The **PO** runs the `aof-designer` agent for the surface.", "an agent id in a code span — no space, no argument"],
        ["The **PO** runs `aof:verify` at the close.", "a slash-command span — no space, no argument"],
        ["The **PO** has no `Bash`; the **PO** is structurally read-only and runs nothing.", "a bare tool-name span in a NEGATIVE prose construction"],
      ];
      for (const [clause, why] of rows) {
        const found = await gapsIn({
          ".claude/agents/aof-product-owner.md": PO_NO_BASH,
          ".claude/agents/aof-designer.md": agentDoc("aof-designer", "Read, Grep, Glob, Write, Edit"),
          ".claude/commands/order.md": clause,
        });
        assert.deepEqual(found, [], `${why}: refused by the space-and-argument rule, not by an exception list`);
      }

      // The converse, so the three above are not silent because the rule sees nothing at all.
      const live = await gapsIn({
        ".claude/agents/aof-product-owner.md": PO_NO_BASH,
        ".claude/commands/order.md": "The **PO** runs `aof work audit` at the close.",
      });
      assert.equal(live.length, 1, "and the rule is awake — a genuine program span in the same position IS reported");
    },
  },
  {
    name: "acd-capability-gap-cites-a-code-span: a code span wrapped across two source lines is SEEN",
    async run() {
      // The exact shape measured at `refine.md:102-109`: the span breaks between `memory` and
      // `recall`, which a line-oriented reader never joins.
      const wrapped = await gapsIn({
        ".claude/agents/aof-product-owner.md": PO_NO_BASH,
        ".claude/commands/refine.md": [
          "the **PO**, before the break-down, runs a recall keyed to the milestone's domain —",
          "`aof work memory",
          "     recall \"<milestone objective keywords>\" --item <ref> --block`.",
        ].join("\n"),
      });
      assert.equal(wrapped.length, 1, "the wrapped span is one span, and the only true positive in this corpus is found");
      assert.match(wrapped[0].message, /`aof-product-owner`/u, "…attributed to the product owner");

      const flat = await gapsIn({
        ".claude/agents/aof-product-owner.md": PO_NO_BASH,
        ".claude/commands/refine.md": "the **PO**, before the break-down, runs a recall keyed to the milestone's domain — `aof work memory recall \"<milestone objective keywords>\" --item <ref> --block`.",
      });
      assert.equal(flat.length, 1, "and the same instruction on one line is the same one finding");
      const clauseOf = (finding) => finding.message.slice(finding.message.indexOf("The clause:"));
      assert.equal(clauseOf(wrapped[0]), clauseOf(flat[0]), "…character for character, which is paragraph normalisation doing the work");
    },
  },
  {
    name: "acd-capability-gap-cites-a-code-span: clauses split at . ! ? ; — two role-scoped instructions in ONE sentence, and the second is attributed",
    async run() {
      const files = (separator) => ({
        ".claude/agents/aof-architect.md": ARCHITECT_WITH_BASH,
        ".claude/agents/aof-product-owner.md": PO_NO_BASH,
        ".claude/commands/order.md":
          `The **architect** runs \`aof graph build .\`${separator} the **PO** runs \`aof work memory recall "x" --block\`.`,
      });

      for (const separator of [";", ".", "?", "!"]) {
        const found = await gapsIn(files(separator));
        assert.equal(found.length, 1, `separated by ${JSON.stringify(separator)}: the sentence is two clauses, and the second is attributed`);
        assert.match(found[0].message, /`aof-product-owner`/u, "…to the product owner");
        assert.equal(found.some((finding) => finding.message.includes("`aof-architect`")), false, "…and no finding names the architect, whose clause was satisfied");
      }

      for (const separator of [",", " —"]) {
        assert.deepEqual(
          await gapsIn(files(separator)),
          [],
          `separated by ${JSON.stringify(separator)}: one clause carrying two role words, so the ambiguity rule fires`,
        );
      }
    },
  },
  {
    name: "acd-capability-gap-cites-a-code-span: the grant is the agent document's own tools: frontmatter, and there is no mirrored list",
    async run() {
      const clause = "The **PO** runs `aof work audit` at the close.";

      assert.equal(
        (await gapsIn({ ".claude/agents/aof-product-owner.md": agentDoc("aof-product-owner", "Read, Grep, Glob, Bash, Write, Edit"), ".claude/commands/order.md": clause })).length,
        0,
        "a `tools:` frontmatter granting Bash satisfies the instruction",
      );
      assert.equal(
        (await gapsIn({ ".claude/agents/aof-product-owner.md": PO_NO_BASH, ".claude/commands/order.md": clause })).length,
        1,
        "…and one that omits it does not",
      );

      // THE MIRRORED LIST, PLANTED. A second document declaring the grant must not satisfy it: one
      // home, or the rule reads whichever copy happens to be there.
      const mirrored = await gapsIn({
        ".claude/agents/aof-product-owner.md": agentDoc("aof-product-owner", null),
        ".claude/rules/grants.md": "The **PO** is granted `Bash`, `Read` and every other tool in the box.",
        ".claude/commands/order.md": clause,
      });
      assert.equal(mirrored.length, 1, "a second document listing Bash for that role does NOT grant it — the grant has one home");
      assert.match(mirrored[0].message, /does not grant `Bash`/u, "…and the finding still names Bash");

      // And structurally: the frontmatter key is read in exactly one place.
      const code = stripComments(moduleSource());
      const reads = code.split('get("tools")').length - 1;
      assert.equal(reads, 1, `the \`tools:\` key is read in exactly ONE place in ${MODULE_REL} (found ${reads})`);
    },
  },
];
