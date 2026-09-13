// Behavioural evidence for milestone 77 / story 00 — the prompt layer.
//
//   tasks/00_a-capability-gap-cites-a-code-span-and-under-reports.feature
//   tasks/01_a-duplicated-instruction-is-exact-and-aggregated-per-file-pair.feature
//   tasks/02_the-lane-declares-what-it-read-and-states-what-it-cannot-see.feature
//
// The census rows of those features — the closed constants, the absent similarity computation, the
// absent runtime-path literal — are the controls', and live in
// `acd-capability-gap-cites-a-code-span.test.mjs` and
// `acd-duplication-rule-states-its-blindness.test.mjs`.
//
// EVERY CORPUS HERE IS A REAL DIRECTORY ON DISK, written into a temp project root that holds no aof
// checkout, no `src/` tree, no configuration file and no git repository. That is the milestone's own
// thesis driven rather than asserted: these rules must run in a repository that is not this one, and
// handing the lane an already-assembled document list would skip the two things most likely to be
// wrong — that the installed layer is FOUND through the declared runtimes and resource kinds, and
// that a directory the project does not install is an absence rather than a crash.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { readFinding, sweepDeclarationProblems } from "../../../src/work-audit/reads.mjs";
import {
  CAPABILITY_PROGRAMS,
  PROMPT_LAYER_SWEEPS,
  ROLE_WORDS,
  SENTENCE_FLOOR,
  runPromptLayer,
} from "../../../src/work-audit/prompt-layer.mjs";

// ── FIXTURES ─────────────────────────────────────────────────────────────────────────────────

function project(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), "aof-prompt-"));
  for (const [rel, text] of Object.entries(files)) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return root;
}

const withProject = async (files, run) => {
  const root = project(files);
  try {
    return await run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

// An agent document. `tools` of null writes NO `tools:` key at all, which is a different answer from
// an empty grant and is driven as such.
const agentDoc = (name, tools, body = "") =>
  `---\nname: ${name}\n${tools == null ? "" : `tools: ${tools}\n`}---\n\n${body}\n`;

const PO = "aof-product-owner";
const ARCHITECT = "aof-architect";

// The grant every fixture that is not ABOUT the grant uses: the role is spawned and holds no Bash.
const poWithoutBash = (body = "") => agentDoc(PO, "Read, Grep, Glob, Write, Edit", body);
const poWithBash = (body = "") => agentDoc(PO, "Read, Grep, Glob, Bash, Write, Edit", body);

const capability = (result) => result.findings.filter((finding) => finding.code === "audit-agent-capability-gap");
const duplication = (result) => result.findings.filter((finding) => finding.code === "audit-instruction-duplicated");

// A clause ordering the product owner to run `span`, in a command document. One bolded role word,
// one form of `run`, one code span — everything the rule needs and nothing it does not.
const orders = (span) => `The **PO** runs \`${span}\` before the break-down.`;

// Exactly `bytes` bytes of sentence, terminator included, with real word breaks in it so a
// reflow-invariance row has somewhere to put a line break.
function sentenceOfBytes(bytes, seed = "alpha") {
  let text = seed;
  while (text.length < bytes - 1) text += ` ${seed}`;
  text = text.slice(0, bytes - 1);
  if (text.endsWith(" ")) text = `${text.slice(0, -1)}x`;
  return `${text}.`;
}

const OVER_FLOOR = sentenceOfBytes(SENTENCE_FLOOR + 40, "graphify");
const clauseOf = (message) => message.slice(message.indexOf("The clause:"));

export const promptLayerTests = [
  // ── TASK 00 — THE CAPABILITY GAP ───────────────────────────────────────────────────────────
  {
    name: "prompt-layer: the live shape — a role ordered to run a program its grant never included",
    async run() {
      // The paragraph shape measured in `refine.md:102-109`, reproduced: the PO's instruction shares
      // one sentence with the architect's, and the code span wraps across two source lines.
      await withProject({
        ".claude/agents/aof-product-owner.md": poWithoutBash(),
        ".claude/commands/refine.md": [
          "**Recall prior lessons first** Role-scoped, run unconditionally: the **architect**,",
          "before writing an ADR, runs `aof work memory recall \"<the decision>\" --area architecture",
          "--block`; the **PO**, before the break-down, runs a recall keyed to the milestone's",
          "domain — `aof work memory recall \"<milestone objective keywords>\" --item <ref> --block`.",
        ].join("\n"),
      }, async (root) => {
        const result = await runPromptLayer({ root });
        const found = capability(result);
        assert.equal(found.length, 1, `one capability finding is returned: ${JSON.stringify(found.map((f) => f.message))}`);
        assert.equal(found[0].path, `${root.split(path.sep).join("/")}/.claude/commands/refine.md`, "it names the document carrying the instruction");
        assert.match(found[0].message, /The clause: "the \*\*PO\*\*, before the break-down, runs a recall/u, "it carries the clause that ordered the run");
        assert.match(found[0].message, /`aof-product-owner`/u, "it names the role the instruction was attributed to");
        assert.match(found[0].message, /does not grant `Bash`/u, "it names Bash as the capability that role's grant does not include");
      });
    },
  },
  {
    name: "prompt-layer: the program map is closed, and a first token outside it names no capability",
    async run() {
      const rows = [
        ["aof work memory recall \"…\" --block", 1],
        ["npm test", 1],
        ["npx playwright test", 1],
        ["node scripts/test.mjs", 1],
        ["git status", 1],
        ["bash scripts/deploy-wsl.sh", 1],
        ["pwsh -Command \"…\"", 1],
        ["sh -c \"…\"", 1],
        ["docker compose up", 0],
        ["make check", 0],
        ["curl https://example.test", 0],
      ];
      for (const [span, expected] of rows) {
        await withProject({
          ".claude/agents/aof-product-owner.md": poWithoutBash(),
          ".claude/commands/order.md": orders(span),
        }, async (root) => {
          const found = capability(await runPromptLayer({ root }));
          assert.equal(found.length, expected, `\`${span}\` yields ${expected} finding(s), got ${found.length}`);
        });
      }
      assert.deepEqual(Object.keys(CAPABILITY_PROGRAMS), ["Bash"], "the map has exactly one row, which is what keeps a tool-name token out of it");
    },
  },
  {
    name: "prompt-layer: only a backticked span shaped like a program plus an argument, in a clause ordering a run, is evidence",
    async run() {
      const rows = [
        ["The **PO** runs `aof work audit` at the close.", 1, "a code span in a clause ordering the reader to run it"],
        ["The **PO** runs the agent `aof-designer` for the surface.", 0, "an agent id, no space and no argument"],
        ["The **PO** runs `aof:verify` at the close.", 0, "a slash command, no space and no argument"],
        ["The **PO** runs `aof` at the close.", 0, "a program name with no argument after it"],
        ["The **PO** has no `Bash`; the **PO** is structurally read-only and runs nothing.", 0, "a tool-name span in a negative prose construction"],
        ["The **PO** runs aof work audit at the close.", 0, "the words written as prose, with no backticks at all"],
        ["The **PO** may consult `git log` for the history.", 0, "a clause that mentions it and orders no run"],
      ];
      for (const [body, expected, why] of rows) {
        await withProject({
          ".claude/agents/aof-product-owner.md": poWithoutBash(),
          ".claude/commands/order.md": body,
        }, async (root) => {
          const found = capability(await runPromptLayer({ root }));
          assert.equal(found.length, expected, `${why}: expected ${expected}, got ${found.length} — ${JSON.stringify(found.map((f) => f.message))}`);
        });
      }
    },
  },
  {
    name: "prompt-layer: attribution admits exactly one bolded role word from the declared role map",
    async run() {
      const rows = [
        ["The **PO** runs `aof work audit` now.", 1, "one bolded word naming a role in the declared map"],
        ["Someone runs `aof work audit` now.", 0, "no role word at all"],
        ["The PO runs `aof work audit` now.", 0, "one role word from the declared map, not bolded"],
        ["The **release manager** runs `aof work audit` now.", 0, "one bolded word naming no role in the declared map"],
        ["The **PO** and the **developer** run `aof work audit` now.", 0, "two bolded words naming roles in the declared map"],
        ["The **PO**, the **developer** and the **researcher** run `aof work audit` now.", 0, "three bolded words naming roles"],
      ];
      for (const [body, expected, why] of rows) {
        await withProject({
          // Every role named in these clauses is granted no Bash, so only attribution decides.
          ".claude/agents/aof-product-owner.md": poWithoutBash(),
          ".claude/agents/aof-developer.md": agentDoc("aof-developer", "Read, Grep, Glob, Write, Edit"),
          ".claude/agents/aof-researcher.md": agentDoc("aof-researcher", "Read, Grep, Glob, Write"),
          ".claude/commands/order.md": body,
        }, async (root) => {
          const found = capability(await runPromptLayer({ root }));
          assert.equal(found.length, expected, `${why}: expected ${expected}, got ${found.length}`);
          if (expected === 1) assert.match(found[0].message, /`aof-product-owner`/u, "…naming that role");
        });
      }
      assert.equal(Object.keys(ROLE_WORDS).length, 8, "the role map is the declared eight rows");
    },
  },
  {
    name: "prompt-layer: an agent's own document attributes to itself, with no role word in the clause",
    async run() {
      const clause = "Before the break-down, run `aof work audit` over the stream.";
      await withProject({
        ".claude/agents/aof-product-owner.md": poWithoutBash(clause),
      }, async (root) => {
        const found = capability(await runPromptLayer({ root }));
        assert.equal(found.length, 1, "one capability finding is returned");
        assert.match(found[0].message, /`aof-product-owner`/u, "it names that agent as the role");
      });

      await withProject({
        ".claude/agents/aof-product-owner.md": poWithoutBash(),
        ".claude/commands/order.md": clause,
      }, async (root) => {
        const found = capability(await runPromptLayer({ root }));
        assert.equal(found.length, 0, "the same clause in a command document that names no role yields no finding");
      });
    },
  },
  {
    name: "prompt-layer: a code span broken across two source lines is one span",
    async run() {
      const wrapped = await withProject({
        ".claude/agents/aof-product-owner.md": poWithoutBash(),
        ".claude/commands/order.md": "The **PO** runs `aof work memory\n     recall \"…\" --block` before the break-down.",
      }, async (root) => capability(await runPromptLayer({ root })));

      assert.equal(wrapped.length, 1, "one capability finding is returned for the wrapped span");
      assert.match(wrapped[0].message, /`aof-product-owner`/u, "naming that role");
      assert.match(wrapped[0].message, /does not grant `Bash`/u, "…and Bash");

      const flat = await withProject({
        ".claude/agents/aof-product-owner.md": poWithoutBash(),
        ".claude/commands/order.md": "The **PO** runs `aof work memory recall \"…\" --block` before the break-down.",
      }, async (root) => capability(await runPromptLayer({ root })));

      assert.equal(flat.length, 1, "the same corpus with that span on a single line returns the same one finding");
      assert.equal(clauseOf(wrapped[0].message), clauseOf(flat[0].message), "…and it is the same clause, character for character");
    },
  },
  {
    name: "prompt-layer: a clause ends at a sentence terminator or a semicolon, and nowhere else",
    async run() {
      const rows = [
        [";", 1, "a semicolon"],
        [".", 1, "a full stop"],
        ["?", 1, "a question mark"],
        ["!", 1, "an exclamation mark"],
        [",", 0, "a comma"],
        [" —", 0, "an em dash"],
      ];
      for (const [separator, expected, why] of rows) {
        await withProject({
          // The architect IS granted Bash; the product owner is not.
          ".claude/agents/aof-architect.md": agentDoc(ARCHITECT, "Read, Grep, Glob, Bash, Write, Edit"),
          ".claude/agents/aof-product-owner.md": poWithoutBash(),
          ".claude/commands/order.md":
            `The **architect** runs \`aof graph build .\`${separator} the **PO** runs \`aof work memory recall "x" --block\`.`,
        }, async (root) => {
          const found = capability(await runPromptLayer({ root }));
          assert.equal(found.length, expected, `${why}: expected ${expected}, got ${found.length} — ${JSON.stringify(found.map((f) => f.message))}`);
          if (expected === 1) assert.match(found[0].message, /`aof-product-owner`/u, "…naming the product owner");
          assert.equal(found.some((finding) => finding.message.includes(`\`${ARCHITECT}\``)), false, "no finding names the architect, whose clause was satisfied");
        });
      }
    },
  },
  {
    name: "prompt-layer: the grant is the agent document's own tools: frontmatter and nothing else",
    async run() {
      const clause = "Before the break-down, run `aof work audit` over the stream.";
      const rows = [
        [{ ".claude/agents/aof-product-owner.md": poWithBash(clause) }, 0, "a tools: frontmatter listing Bash among others"],
        [{ ".claude/agents/aof-product-owner.md": poWithoutBash(clause) }, 1, "a tools: frontmatter listing Read, Grep, Glob and Write, and no Bash"],
        [{ ".claude/agents/aof-product-owner.md": agentDoc(PO, null, clause) }, 1, "no tools: key in the frontmatter at all"],
        [{
          ".claude/agents/aof-product-owner.md": agentDoc(PO, null, `${clause}\n\nThis role may run shell commands as needed.`),
        }, 1, "no tools: key, and a prose sentence in the body saying the role may run commands"],
        [{
          ".claude/agents/aof-product-owner.md": agentDoc(PO, null, clause),
          ".claude/rules/grants.md": "The **PO** is granted `Bash` and every other tool.",
        }, 1, "no tools: key, and a second document elsewhere in the corpus listing Bash for that role"],
      ];
      for (const [files, expected, why] of rows) {
        await withProject(files, async (root) => {
          const found = capability(await runPromptLayer({ root }));
          assert.equal(found.length, expected, `${why}: expected ${expected}, got ${found.length}`);
          if (expected === 1) assert.match(found[0].message, /does not grant `Bash`/u, "…naming Bash");
        });
      }
    },
  },
  {
    name: "prompt-layer: severity follows the audited configuration's routing for the role the finding names",
    async run() {
      for (const [routing, severity] of [["agent", "error"], ["inline", "warn"]]) {
        await withProject({
          ".claude/agents/aof-product-owner.md": poWithoutBash(),
          ".claude/commands/order.md": orders("aof work audit"),
        }, async (root) => {
          const found = capability(await runPromptLayer({ root, roleRouting: { [PO]: routing } }));
          assert.equal(found.length, 1, "the gap is found whichever way the role is routed");
          assert.equal(found[0].severity, severity, `routed ${routing} → ${severity}`);
        });
      }
    },
  },
  {
    name: "prompt-layer: a corpus whose every instruction is satisfied yields no capability finding",
    async run() {
      await withProject({
        ".claude/agents/aof-product-owner.md": poWithBash(),
        ".claude/agents/aof-architect.md": agentDoc(ARCHITECT, "Read, Grep, Glob, Bash, Write, Edit"),
        ".claude/commands/order.md": orders("aof work audit"),
        ".claude/commands/second.md": "The **architect** runs `npm test` before the review.",
      }, async (root) => {
        const result = await runPromptLayer({ root });
        assert.deepEqual(capability(result), [], "no capability finding is returned");
        assert.equal(result.reads.length > 0, true, "a read record is returned all the same");
        for (const read of result.reads) {
          assert.equal(read.count, 4, "and that count is the number of documents the corpus holds");
        }
      });
    },
  },

  // ── TASK 01 — THE DUPLICATED INSTRUCTION ───────────────────────────────────────────────────
  {
    name: "prompt-layer: one sentence, byte-identical in two documents, is one finding about that pair",
    async run() {
      await withProject({
        ".claude/commands/refine.md": `Some preamble here. ${OVER_FLOOR} And a tail.`,
        ".claude/commands/review.md": `A different preamble. ${OVER_FLOOR} And another tail.`,
      }, async (root) => {
        const found = duplication(await runPromptLayer({ root }));
        assert.equal(found.length, 1, "one duplication finding is returned");
        assert.match(found[0].message, /refine\.md/u, "it names the first document");
        assert.match(found[0].message, /review\.md/u, "…and the second");
        assert.match(found[0].message, new RegExp(`${Buffer.byteLength(OVER_FLOOR, "utf8")} redundant bytes`, "u"), "it reports the redundant byte total those documents share");
        assert.equal(found[0].message.includes(OVER_FLOOR), true, "it carries the duplicated sentence");
      });
    },
  },
  {
    name: "prompt-layer: the match is exact over the normalised sentence, and the floor is a boundary",
    async run() {
      const atFloor = sentenceOfBytes(SENTENCE_FLOOR, "bravo");
      const overFloor = sentenceOfBytes(SENTENCE_FLOOR + 1, "bravo");
      const underFloor = sentenceOfBytes(SENTENCE_FLOOR - 1, "bravo");
      const wrapped = overFloor.replace(/ /gu, (space, index) => (index % 37 === 0 ? "\n" : space));

      const rows = [
        [overFloor, overFloor, 1, "a byte-identical sentence one byte longer than the declared floor"],
        [atFloor, atFloor, 1, "a byte-identical sentence exactly the declared floor in length"],
        [underFloor, underFloor, 0, "a byte-identical sentence one byte shorter than the declared floor"],
        [overFloor, wrapped, 1, "the same sentence, wrapped to a different line width in each document"],
        [overFloor, `      ${overFloor}`, 1, "the same sentence, indented differently in each document"],
        [`${overFloor}   `, `${overFloor}      `, 1, "the same sentence, followed by a different number of spaces in each"],
        [overFloor, sentenceOfBytes(SENTENCE_FLOOR + 1, "charlie"), 0, "the same rule stated in different words in each document"],
        [overFloor, overFloor.replace("bravo", "delta"), 0, "the same sentence with a single word changed in the second document"],
        [overFloor, `**${overFloor}**`, 0, "the same sentence with different emphasis markers in the second document"],
      ];
      for (const [left, right, expected, why] of rows) {
        await withProject({
          ".claude/commands/a.md": left,
          ".claude/commands/b.md": right,
        }, async (root) => {
          const found = duplication(await runPromptLayer({ root }));
          assert.equal(found.length, expected, `${why}: expected ${expected}, got ${found.length}`);
        });
      }
    },
  },
  {
    name: "prompt-layer: four paraphrased copies of one rule are invisible to this detector, and that is the design",
    async run() {
      // One rule, four wordings, no sentence shared between them — the measured shape of the
      // graph-grounding block, which exact BLOCK matching finds zero of.
      const paraphrases = {
        ".claude/commands/one.md": "Graphify extraction replaces the single project graph, so never target a package subtree — doing that evicts every file outside it and the answer you get back is silently partial.",
        ".claude/commands/two.md": "Never point an extraction at `src` alone: the whole project graph is replaced each time, and every file beyond the subtree you named disappears from it without a word.",
        ".claude/agents/three.md": "Because a build overwrites the one graph the project keeps, aiming it at a package leaves you holding a graph that has quietly forgotten most of the repository.",
        ".claude/rules/four.md": "Targeting a subtree is the mistake: extraction is wholesale, and everything outside the target is evicted from the graph rather than merged into what was there.",
      };
      await withProject(paraphrases, async (root) => {
        const result = await runPromptLayer({ root });
        assert.deepEqual(duplication(result), [], "no duplication finding is returned");
        assert.equal(result.limits.length > 0, true, "a limit record is returned all the same");
        assert.equal(
          result.limits.some((limit) => /different words|paraphrase|INVISIBLE/iu.test(limit.consequence)),
          true,
          "…saying a rule restated in different words is invisible to this rule",
        );
      });

      await withProject({
        ...paraphrases,
        ".claude/commands/one.md": `${paraphrases[".claude/commands/one.md"]} ${OVER_FLOOR}`,
        ".claude/commands/two.md": `${paraphrases[".claude/commands/two.md"]} ${OVER_FLOOR}`,
      }, async (root) => {
        const found = duplication(await runPromptLayer({ root }));
        assert.equal(found.length, 1, "adding one byte-identical sentence above the floor to two of those documents returns one finding for that pair");
      });
    },
  },
  {
    name: "prompt-layer: a sentence repeated inside one document is not a pair",
    async run() {
      await withProject({
        ".claude/commands/a.md": `${OVER_FLOOR} Some other text. ${OVER_FLOOR}`,
        ".claude/commands/b.md": "A document sharing nothing at all with the first one.",
      }, async (root) => {
        assert.deepEqual(duplication(await runPromptLayer({ root })), [], "no duplication finding is returned");
      });

      await withProject({
        ".claude/commands/a.md": `${OVER_FLOOR} Some other text.`,
        ".claude/commands/b.md": `A different opening. ${OVER_FLOOR}`,
      }, async (root) => {
        const found = duplication(await runPromptLayer({ root }));
        assert.equal(found.length, 1, "moving the second copy into a second document returns one finding");
        assert.match(found[0].message, /a\.md/u, "naming the first document");
        assert.match(found[0].message, /b\.md/u, "…and the second");
      });
    },
  },
  {
    name: "prompt-layer: findings are one per file pair, ranked by the bytes they cost",
    async run() {
      const shared = [225, 225, 225, 225].map((bytes, index) => sentenceOfBytes(bytes, `echo${index}`));
      const single = sentenceOfBytes(200, "foxtrot");
      await withProject({
        ".claude/commands/a.md": `${shared.join(" ")} ${single}`,
        ".claude/commands/b.md": shared.join(" "),
        ".claude/commands/c.md": single,
      }, async (root) => {
        const found = duplication(await runPromptLayer({ root }));
        assert.equal(found.length, 2, `two duplication findings are returned, not five: ${JSON.stringify(found.map((f) => f.message.slice(0, 80)))}`);

        const ab = found.find((finding) => finding.message.includes("b.md"));
        const ac = found.find((finding) => finding.message.includes("c.md"));
        assert.match(ab.message, /900 redundant bytes/u, "the finding naming A and B reports 900 redundant bytes");
        assert.match(ac.message, /200 redundant bytes/u, "the finding naming A and C reports 200 redundant bytes");
        assert.equal(found[0], ab, "the finding reporting the larger byte total is returned before the other");
      });
    },
  },
  {
    name: "prompt-layer: the run reports the floor it used, including when it found nothing",
    async run() {
      const files = {
        ".claude/commands/a.md": "One document with nothing in common with the other.",
        ".claude/commands/b.md": "A second document, equally unrelated to the first.",
      };
      await withProject(files, async (root) => {
        const result = await runPromptLayer({ root });
        assert.deepEqual(duplication(result), [], "no duplication finding is returned");
        assert.equal(
          result.limits.some((limit) => limit.consequence.includes(String(SENTENCE_FLOOR))),
          true,
          "the run's output states the sentence floor this run applied, as the value it used",
        );
        assert.equal(SENTENCE_FLOOR > 0, true, "and that floor is greater than zero");

        // The same corpus, literally, at a higher floor.
        const raised = await runPromptLayer({ root, sentenceFloor: SENTENCE_FLOOR * 3 });
        assert.equal(
          raised.limits.some((limit) => limit.consequence.includes(String(SENTENCE_FLOOR * 3))),
          true,
          "the same corpus run with a higher floor supplied reports the higher value",
        );
        assert.deepEqual(duplication(raised), [], "…and returns no finding");
      });

      // And again over a corpus that DOES duplicate, so "returns no finding" is a claim with
      // content rather than a tautology about a corpus that had nothing to hide.
      await withProject({
        ".claude/commands/a.md": OVER_FLOOR,
        ".claude/commands/b.md": OVER_FLOOR,
      }, async (root) => {
        const higher = Buffer.byteLength(OVER_FLOOR, "utf8") + 10;
        const result = await runPromptLayer({ root, sentenceFloor: higher });
        assert.equal(
          result.limits.some((limit) => limit.consequence.includes(String(higher))),
          true,
          "the same corpus run with a higher floor supplied reports the higher value",
        );
        assert.deepEqual(duplication(result), [], "…and returns no finding");
      });
    },
  },
  {
    name: "prompt-layer: the byte total ranks a finding and never changes its severity",
    async run() {
      const corpora = [
        { ".claude/commands/a.md": OVER_FLOOR, ".claude/commands/b.md": OVER_FLOOR },
        {
          ".claude/commands/a.md": [225, 225, 225, 225].map((b, i) => sentenceOfBytes(b, `golf${i}`)).join(" "),
          ".claude/commands/b.md": [225, 225, 225, 225].map((b, i) => sentenceOfBytes(b, `golf${i}`)).join(" "),
        },
        Object.fromEntries(Array.from({ length: 18 }, (_, pair) => [
          [`.claude/commands/p${pair}a.md`, sentenceOfBytes(291, `hotel${pair}`)],
          [`.claude/commands/p${pair}b.md`, sentenceOfBytes(291, `hotel${pair}`)],
        ]).flat()),
      ];
      for (const [index, files] of corpora.entries()) {
        await withProject(files, async (root) => {
          const found = duplication(await runPromptLayer({ root }));
          assert.equal(found.length > 0, true, `corpus ${index} carries duplication to judge`);
          for (const finding of found) {
            assert.equal(finding.severity, "warn", "every duplication finding returned is at warn");
            assert.notEqual(finding.severity, "error", "…and none is returned at error");
          }
        });
      }
    },
  },
  {
    name: "prompt-layer: the corpus is the installed prompt layer, discovered through the declared runtimes and resource kinds",
    async run() {
      const rows = [
        [".claude/agents", 1, "the Claude runtime's local root, under the agents kind"],
        [".claude/commands", 1, "the Claude runtime's local root, under the commands kind"],
        [".claude/rules", 1, "the Claude runtime's local root, under the rules kind"],
        [".claude/skills", 1, "the Claude runtime's local root, under the skills kind"],
        [".codex/agents", 1, "the Codex runtime's local root, under the agents kind"],
        [".opencode/commands", 1, "the OpenCode runtime's local root, under the commands kind"],
        ["src/bundle/agents", 0, "a src/bundle/agents directory in the same project"],
        ["docs", 0, "a docs/ directory of ordinary project markdown"],
      ];
      for (const [location, expected, why] of rows) {
        await withProject({
          [`${location}/one.md`]: OVER_FLOOR,
          [`${location}/two.md`]: OVER_FLOOR,
        }, async (root) => {
          const found = duplication(await runPromptLayer({ root }));
          assert.equal(found.length, expected, `${why}: expected ${expected}, got ${found.length}`);
        });
      }
    },
  },
  {
    name: "prompt-layer: an audited project whose installed layer drifts from its own bundle is judged on what is installed",
    async run() {
      await withProject({
        ".claude/commands/installed-one.md": "An installed document with nothing shared.",
        ".claude/commands/installed-two.md": "A second installed document, also unshared.",
        "src/bundle/commands/installed-one.md": OVER_FLOOR,
        "src/bundle/commands/installed-two.md": OVER_FLOOR,
      }, async (root) => {
        assert.deepEqual(duplication(await runPromptLayer({ root })), [], "no finding is returned for a duplicate that exists only in the bundle copy");
      });

      await withProject({
        ".claude/commands/installed-one.md": OVER_FLOOR,
        ".claude/commands/installed-two.md": OVER_FLOOR,
        "src/bundle/commands/installed-one.md": OVER_FLOOR,
      }, async (root) => {
        const found = duplication(await runPromptLayer({ root }));
        assert.equal(found.length, 1, "the same sentence appearing in two installed documents returns one finding");
        assert.equal(found[0].message.includes("src/bundle"), false, "…naming the installed paths, never the bundle copy");
      });
    },
  },

  // ── TASK 02 — THE READ RECORD, THE LIMIT, AND PURITY ───────────────────────────────────────
  {
    name: "prompt-layer: every read record the lane returns says what was walked and what would be too little",
    async run() {
      await withProject({ ".claude/commands/a.md": "A single document." }, async (root) => {
        const { reads } = await runPromptLayer({ root });
        assert.equal(reads.length > 0, true, "the lane returns read records");
        for (const read of reads) {
          assert.equal(typeof read.sweep === "string" && read.sweep.length > 0, true, "`sweep` is a non-empty name a finding can cite");
          assert.equal(read.root, root.split(path.sep).join("/"), "`root` names the directory that sweep walked");
          assert.equal(typeof read.what === "string" && read.what.length > 0, true, "`what` describes the population in words");
          assert.equal(["disk", "text", "runtime"].includes(read.basis), true, "`basis` is one of disk, text and runtime");
          assert.equal(Number.isFinite(read.floor) && read.floor > 0, true, "`floor` is a finite number greater than zero");
          assert.equal(Number.isFinite(read.count), true, "`count` is a finite number, so a clean result cannot omit how much it read");
        }
      });
    },
  },
  {
    name: "prompt-layer: the lane returns one read record for each of its two sweeps",
    async run() {
      await withProject({ ".claude/commands/a.md": "A single document." }, async (root) => {
        const { reads } = await runPromptLayer({ root });
        assert.equal(reads.length, 2, "two read records are returned");
        const names = reads.map((read) => read.sweep);
        assert.equal(new Set(names).size, 2, "no two of them carry the same sweep name");
        const duplicationRead = reads.find((read) => read.sweep.includes("duplication"));
        assert.notEqual(duplicationRead, undefined, "one is the duplication sweep");
        assert.notEqual(reads.find((read) => read.sweep.includes("capability")), undefined, "…and one the capability sweep");
        assert.equal(duplicationRead.basis, "text", "the duplication sweep's basis is text, which is what obliges it to state a limit");
      });
    },
  },
  {
    name: "prompt-layer: an incomplete sweep declaration is refused rather than defaulted",
    async run() {
      const alter = (mutate) => PROMPT_LAYER_SWEEPS.map((sweep, index) => {
        const copy = { ...sweep };
        if (index === 0) mutate(copy);
        return copy;
      });
      const rows = [
        [(sweep) => { delete sweep.id; }, true, "its id is removed"],
        [(sweep) => { delete sweep.root; }, true, "its root is removed"],
        [(sweep) => { delete sweep.what; }, true, "its what is removed"],
        [(sweep) => { delete sweep.basis; }, true, "its basis is removed"],
        [(sweep) => { sweep.basis = "text-and-disk"; }, true, "its basis reads text-and-disk"],
        [(sweep) => { delete sweep.floor; }, true, "its floor is removed"],
        [(sweep) => { sweep.floor = 0; }, true, "its floor reads 0"],
        [(sweep) => { sweep.floor = -1; }, true, "its floor reads -1"],
        [() => {}, false, "nothing is altered"],
        [(sweep) => { sweep.floor = 1; }, false, "its floor reads 1"],
      ];
      for (const [mutate, refuses, why] of rows) {
        const problems = sweepDeclarationProblems(alter(mutate));
        if (refuses) {
          assert.equal(problems.length > 0, true, `${why}: the shared validator refuses that sweep`);
          const named = problems.some((problem) => problem.includes(PROMPT_LAYER_SWEEPS[0].id) || problem.includes("could not name it"));
          assert.equal(named, true, `${why}: the refusal names the sweep — ${JSON.stringify(problems)}`);
        } else {
          assert.deepEqual(problems, [], `${why}: the validator admits every sweep`);
        }
      }
    },
  },
  {
    name: "prompt-layer: the lane states what it could not see on every run, clean or not",
    async run() {
      const gap = {
        ".claude/agents/aof-product-owner.md": poWithoutBash(),
        ".claude/commands/order.md": orders("aof work audit"),
      };
      const pair = {
        ".claude/rules/one.md": OVER_FLOOR,
        ".claude/rules/two.md": OVER_FLOOR,
      };
      const rows = [
        [{ ...gap, ...pair }, 2, "carries one capability gap and one duplicated pair"],
        [gap, 1, "carries one capability gap and no duplication"],
        [pair, 1, "carries one duplicated pair and no capability gap"],
        [{ ".claude/commands/plain.md": "Nothing of interest here at all." }, 0, "carries neither"],
        [{
          ".claude/agents/aof-product-owner.md": poWithBash(),
          ".claude/commands/order.md": orders("aof work audit"),
        }, 0, "holds documents whose every instruction is satisfied"],
      ];
      for (const [files, expected, why] of rows) {
        await withProject(files, async (root) => {
          const result = await runPromptLayer({ root });
          assert.equal(result.findings.length, expected, `${why}: expected ${expected} finding(s), got ${result.findings.length}`);
          assert.equal(result.limits.length > 0, true, `${why}: a limit record is returned all the same`);
          for (const limit of result.limits) {
            assert.equal(typeof limit.question === "string" && limit.question.length > 0, true, "the limit carries a non-empty question");
            assert.equal(typeof limit.consequence === "string" && limit.consequence.length > 0, true, "…and a non-empty consequence");
            for (const key of ["sweep", "basis", "answeredBy", "authority"]) {
              assert.equal(limit[key] === null || (typeof limit[key] === "string" && limit[key].length > 0), true, `…and \`${key}\` is a non-empty string or an explicit null`);
            }
          }
        });
      }
    },
  },
  {
    name: "prompt-layer: the limit names each blindness the two rules were designed to have",
    async run() {
      await withProject({ ".claude/commands/plain.md": "Nothing of interest here at all." }, async (root) => {
        const { limits } = await runPromptLayer({ root });
        const said = limits.map((limit) => limit.consequence).join(" ");
        const rows = [
          [new RegExp(`floor of ${SENTENCE_FLOOR} bytes`, "u"), "the sentence floor this run applied, as the value it used"],
          [/different words is INVISIBLE/u, "that a rule restated in different words is invisible to the duplication rule"],
          [/written in prose rather than a code span/u, "that an instruction written in prose rather than a code span is not detected"],
          [/naming a role without bold/u, "that an instruction naming a role without bold is not attributed"],
          [/capability other than `Bash`/u, "that a required capability other than Bash is not detected"],
        ];
        for (const [pattern, why] of rows) {
          assert.match(said, pattern, `the limits state ${why}`);
        }
      });
    },
  },
  {
    name: "prompt-layer: a sweep that read less than its floor is a shortfall, not a clean result",
    async run() {
      const withFloor = (floor) => PROMPT_LAYER_SWEEPS.map((sweep) => Object.freeze({ ...sweep, floor }));
      const docs = (count) => Object.fromEntries(Array.from({ length: count }, (_, index) => [`.claude/commands/d${index}.md`, "A document."]));
      const rows = [
        [docs(0), PROMPT_LAYER_SWEEPS, "below", true, "no prompt documents at all"],
        [docs(2), withFloor(3), "below", true, "fewer documents than the sweep's floor"],
        [docs(3), withFloor(3), "at or above", false, "exactly as many documents as the sweep's floor"],
        [docs(4), withFloor(3), "at or above", false, "more documents than the sweep's floor"],
        [docs(0), PROMPT_LAYER_SWEEPS, "below", true, "an empty layer, driven again through the shared rule"],
      ];
      for (const [files, sweeps, relation, shortfall, why] of rows) {
        // A project with zero documents still needs a root, so an unrelated file is written.
        await withProject({ "README.md": "not a prompt document", ...files }, async (root) => {
          const { reads } = await runPromptLayer({ root, sweeps });
          for (const read of reads) {
            if (relation === "below") assert.equal(read.count < read.floor, true, `${why}: the read record reports a count below its declared floor`);
            else assert.equal(read.count >= read.floor, true, `${why}: the read record reports a count at or above its declared floor`);

            const finding = readFinding(read);
            if (!shortfall) {
              assert.equal(finding, null, `${why}: the shared floor rule yields nothing`);
              continue;
            }
            assert.notEqual(finding, null, `${why}: the shared floor rule yields a shortfall`);
            assert.equal(finding.code, "audit-ran-on-nothing", "…named audit-ran-on-nothing");
            assert.match(finding.message, new RegExp(`"${read.sweep}" sweep`, "u"), "…naming the sweep");
            assert.equal(finding.message.includes(read.root), true, "…the root it walked");
            assert.match(finding.message, new RegExp(`read ${read.count} of a required ${read.floor}`, "u"), "…the count it got and the floor it missed");
          }
        });
      }
    },
  },
  {
    name: "prompt-layer: an empty corpus is never reported as a clean pass",
    async run() {
      await withProject({ "README.md": "a project with no installed prompt layer at all" }, async (root) => {
        const result = await runPromptLayer({ root });
        assert.deepEqual(capability(result), [], "the lane returns no capability finding");
        assert.deepEqual(duplication(result), [], "…and no duplication finding");
        assert.equal(result.reads.length > 0, true, "it returns a read record");
        for (const read of result.reads) assert.equal(read.count < read.floor, true, "…whose count is below its floor");
        assert.equal(result.limits.length > 0, true, "it returns a limit record");
        // The result cannot be expressed without its reads: `reads` is not optional on the shape.
        assert.equal(Object.hasOwn(result, "reads"), true, "no result is returned that carried an empty finding list and no read record beside it");
      });
    },
  },
  {
    name: "prompt-layer: the lane is a pure function over the inputs it is handed",
    async run() {
      const corpusA = {
        ".claude/agents/aof-product-owner.md": poWithoutBash(),
        ".claude/commands/order.md": orders("aof work audit"),
      };
      const corpusB = {
        ".claude/rules/one.md": OVER_FLOOR,
        ".claude/rules/two.md": OVER_FLOOR,
      };

      await withProject(corpusA, async (root) => {
        const first = await runPromptLayer({ root });
        const second = await runPromptLayer({ root });
        assert.deepEqual(second.findings, first.findings, "twice in one process over the same inputs: the two results are equal, finding for finding");
        assert.deepEqual(second.limits, first.limits, "…and limit for limit");
      });

      const rootA = project(corpusA);
      const rootB = project(corpusB);
      try {
        const a1 = await runPromptLayer({ root: rootA });
        const b1 = await runPromptLayer({ root: rootB });
        assert.equal(capability(b1).length, 0, "over corpus A and then over corpus B: the second answers from B rather than repeating A");
        assert.equal(duplication(b1).length, 1, "…returning B's own finding");

        const b2 = await runPromptLayer({ root: rootB });
        const a2 = await runPromptLayer({ root: rootA });
        assert.equal(duplication(a2).length, 0, "over corpus B and then over corpus A: the second answers from A rather than repeating B");
        assert.equal(capability(a2).length, 1, "…returning A's own finding");
        assert.deepEqual(a2.findings, a1.findings, "and A's answer is the same both times it was asked");
        assert.deepEqual(b2.findings, b1.findings, "…as is B's");
      } finally {
        rmSync(rootA, { recursive: true, force: true });
        rmSync(rootB, { recursive: true, force: true });
      }

      // The injected inputs come back untouched — the routing and the sweeps by value, and the
      // DOCUMENT TEXT by reading the corpus back off disk: the lane audits a project's prompt
      // layer, and a lane that rewrote what it read would be editing the thing it is judging.
      await withProject(corpusA, async (root) => {
        const routing = { [PO]: "agent" };
        const sweeps = PROMPT_LAYER_SWEEPS;
        const before = JSON.stringify({ routing, sweeps });
        const textBefore = Object.fromEntries(Object.keys(corpusA).map((rel) => [rel, readFileSync(path.join(root, rel), "utf8")]));

        const result = await runPromptLayer({ root, roleRouting: routing, sweeps });
        assert.equal(JSON.stringify({ routing, sweeps }), before, "once, and the injected inputs are read afterwards: no sweep or routing was mutated");
        for (const [rel, text] of Object.entries(textBefore)) {
          assert.equal(readFileSync(path.join(root, rel), "utf8"), text, `…and no document text was mutated (${rel})`);
        }

        // A caller that modifies what it was handed cannot change the next answer.
        try {
          result.findings.push({ code: "planted" });
        } catch { /* frozen — which is the stronger outcome, and either way the next run is unaffected */ }
        try {
          result.findings[0].severity = "planted";
        } catch { /* likewise */ }
        const again = await runPromptLayer({ root, roleRouting: routing, sweeps });
        assert.equal(again.findings.length, 1, "a second run over the same inputs returns the original findings");
        assert.equal(again.findings[0].severity, "error", "…unchanged by the caller's edit");
      });
    },
  },
  {
    name: "prompt-layer: no clock is read — the instant arrives with the inputs",
    async run() {
      await withProject({
        ".claude/agents/aof-product-owner.md": poWithoutBash(),
        ".claude/commands/order.md": orders("aof work audit"),
      }, async (root) => {
        const instant = new Date("2026-09-03T00:00:00.000Z");
        const first = await runPromptLayer({ root, now: instant });
        await new Promise((resolve) => { setTimeout(resolve, 25); });
        const second = await runPromptLayer({ root, now: instant });
        assert.deepEqual(second, first, "the two results are equal with real time passing between the two calls");
      });
    },
  },
  {
    name: "prompt-layer: the lane runs against a repository that is not this one",
    async run() {
      const corpus = {
        ".claude/agents/aof-product-owner.md": poWithoutBash(),
        ".claude/commands/order.md": orders("aof work audit"),
        ".claude/rules/one.md": OVER_FLOOR,
        ".claude/rules/two.md": OVER_FLOOR,
      };
      const rootA = project(corpus);
      const rootB = project(corpus);
      try {
        const a = await runPromptLayer({ root: rootA });
        assert.equal(a.findings.length, 2, "it returns findings for that project");
        assert.equal(a.reads.length, 2, "…read records");
        assert.equal(a.limits.length, 2, "…and limit records");

        const posixA = rootA.split(path.sep).join("/");
        for (const finding of a.findings) {
          assert.equal(finding.path.startsWith(posixA), true, `every path it names lies beneath the root it was given: ${finding.path}`);
        }

        const b = await runPromptLayer({ root: rootB });
        const posixB = rootB.split(path.sep).join("/");
        const rebased = b.findings.map((finding) => JSON.stringify(finding).split(posixB).join(posixA));
        assert.deepEqual(rebased, a.findings.map((finding) => JSON.stringify(finding)), "the same corpus under a different root returns the same findings, differing only in the paths they name");
      } finally {
        rmSync(rootA, { recursive: true, force: true });
        rmSync(rootB, { recursive: true, force: true });
      }
    },
  },
];
