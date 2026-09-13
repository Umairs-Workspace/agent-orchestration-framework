import assert from "node:assert/strict";

import {
  RATCHET_CODES,
  classifyAssertion,
  countExecutableContract,
  evaluateRatchet,
} from "../../../src/work/ratchet.mjs";
import { observeRatchet, ratchetCommand, resolveRatchetBase } from "../../../src/commands/ratchet.mjs";

const feature = ({ lane = "executable", name = "criterion", rows = [] } = {}) => `@${lane}
Feature: governed contract

  Scenario Outline: ${name}
    Given <value>

    Examples: cases
      | value |
${rows.map((row) => `      | ${row} |`).join("\n")}
`;

const observation = (overrides = {}) => ({
  baseCommit: "a".repeat(40),
  baseSource: "resolved",
  base: { featureTexts: {}, files: {} },
  head: { featureTexts: {}, files: {} },
  baseArchitectureText: "",
  citationsByPath: {},
  owningItemRef: "57",
  ...overrides,
});

const leg = (result, id) => result.legs.find((candidate) => candidate.id === id);

export const workRatchetTests = [
  {
    name: "57/03 task 00: base resolution uses the earliest first-parent in-progress record and never guesses",
    run: async () => {
      const calls = [];
      const records = {
        c1: "---\nstatus: not-started\n---\n",
        c2: "---\nstatus: in-progress\n---\n",
        c3: "---\nstatus: blocked\n---\n",
        c4: "---\nstatus: in-progress\n---\n",
      };
      const gitOutput = async (_root, args) => {
        calls.push(args);
        if (args[0] === "rev-parse" && args[1] === "--is-shallow-repository") return "false\n";
        if (args[0] === "rev-list") return "c1\nc2\nc3\nc4\n";
        if (args[0] === "show") return records[args[1].split(":")[0]];
        throw new Error(`unexpected git call ${args.join(" ")}`);
      };
      assert.deepEqual(
        await resolveRatchetBase({ projectRoot: "repo", recordPath: "item/STORY.md" }, { gitOutput }),
        { commit: "c2", source: "resolved" },
      );
      assert.deepEqual(calls[1], ["rev-list", "--first-parent", "--reverse", "HEAD", "--", "item/STORY.md"]);
      assert.equal(calls.some((args) => args.includes("HEAD~1")), false);

      const shallow = await resolveRatchetBase(
        { projectRoot: "repo", recordPath: "item/STORY.md" },
        { gitOutput: async () => "true\n" },
      );
      assert.equal(shallow, null);

      const never = await resolveRatchetBase(
        { projectRoot: "repo", recordPath: "item/STORY.md" },
        { gitOutput: async (_root, args) => args[0] === "rev-parse" ? "false\n" : "c1\n" },
      );
      assert.equal(never, null);

      const supplied = await resolveRatchetBase(
        { projectRoot: "repo", recordPath: "item/STORY.md", suppliedBase: "named-base" },
        { gitOutput: async (_root, args) => {
          assert.deepEqual(args, ["rev-parse", "--verify", "named-base^{commit}"]);
          return `${"b".repeat(40)}\n`;
        } },
      );
      assert.deepEqual(supplied, { commit: "b".repeat(40), source: "supplied" });

      assert.deepEqual(evaluateRatchet(), {
        ok: false,
        code: RATCHET_CODES.BASE_UNRESOLVED,
        base: null,
        legs: [],
      });
    },
  },
  {
    name: "57/03 task 01: executable scenarios and Examples rows form one item-wide non-shrinking contract",
    run: () => {
      const twoRows = feature({ rows: ["one", "two"] });
      assert.deepEqual(countExecutableContract({ "tasks/00.feature": twoRows }), {
        scenarios: 1,
        examplesRows: 2,
        total: 3,
      });

      const shrunk = evaluateRatchet(observation({
        base: { featureTexts: { "tasks/00.feature": twoRows }, files: {} },
        head: { featureTexts: { "tasks/00.feature": feature({ rows: ["one"] }) }, files: {} },
      }));
      assert.equal(leg(shrunk, "contract").disposition, "fired");
      assert.deepEqual([leg(shrunk, "contract").before.total, leg(shrunk, "contract").after.total], [3, 2]);

      const moved = evaluateRatchet(observation({
        base: { featureTexts: { "tasks/00.feature": twoRows }, files: {} },
        head: { featureTexts: { "tasks/01.feature": twoRows }, files: {} },
      }));
      assert.equal(leg(moved, "contract").disposition, "clear");

      const added = evaluateRatchet(observation({
        base: { featureTexts: { "tasks/00.feature": twoRows }, files: {} },
        head: { featureTexts: { "tasks/00.feature": twoRows, "tasks/01.feature": feature({ name: "new", rows: [] }) }, files: {} },
      }));
      assert.equal(leg(added, "contract").disposition, "clear");

      const retagged = evaluateRatchet(observation({
        base: { featureTexts: { "tasks/00.feature": twoRows }, files: {} },
        head: { featureTexts: { "tasks/00.feature": feature({ lane: "manual", rows: ["one", "two"] }) }, files: {} },
      }));
      assert.equal(leg(retagged, "contract").disposition, "fired");
    },
  },
  {
    name: "57/03 task 02: only closed-to-open fires, same-file compensation clears, and unknown stays unclassified",
    run: () => {
      const closed = "assert.deepEqual(actual, [\"a\", \"b\"]);";
      const open = "assert.ok(actual.includes(\"a\"));";
      assert.equal(classifyAssertion(closed), "closed");
      assert.equal(classifyAssertion("assert.equal(actual.length, 2);"), "closed");
      assert.equal(classifyAssertion("assert.equal(actual.size, 2);"), "closed");
      assert.equal(classifyAssertion("assert.deepEqual(actual, new Set([\"a\", \"b\"]));"), "closed");
      assert.equal(classifyAssertion("assert.ok([\"a\", \"b\"].every((value) => actual.includes(value)));"), "closed");
      assert.equal(classifyAssertion("assert.ok(actual.length > 0);"), "open");
      assert.equal(classifyAssertion("assert.ok(actual.length);"), "open");
      assert.equal(classifyAssertion("assert.ok(actual.some(Boolean));"), "open");
      assert.equal(classifyAssertion(open), "open");

      const fired = evaluateRatchet(observation({
        base: { featureTexts: {}, files: { "test/a.test.mjs": closed } },
        head: { featureTexts: {}, files: { "test/a.test.mjs": open } },
      }));
      assert.equal(leg(fired, "closed-set").disposition, "fired");
      assert.equal(leg(fired, "closed-set").findings[0].path, "test/a.test.mjs");

      const compensated = evaluateRatchet(observation({
        base: { featureTexts: {}, files: { "test/a.test.mjs": closed } },
        head: { featureTexts: {}, files: { "test/a.test.mjs": `${open}\nassert.deepEqual(kinds, [\"a\", \"b\"]);` } },
      }));
      assert.equal(leg(compensated, "closed-set").disposition, "clear");
      assert.equal(leg(compensated, "compensating-assertion").applied, true);

      const differentFile = evaluateRatchet(observation({
        base: { featureTexts: {}, files: { "test/a.test.mjs": closed, "test/b.test.mjs": "assert.ok(true);" } },
        head: { featureTexts: {}, files: {
          "test/a.test.mjs": open,
          "test/b.test.mjs": "assert.ok(true);\nassert.deepEqual(kinds, [\"a\"]);",
        } },
      }));
      assert.equal(leg(differentFile, "closed-set").disposition, "fired");

      const unknown = evaluateRatchet(observation({
        base: { featureTexts: {}, files: { "test/a.test.mjs": closed } },
        head: { featureTexts: {}, files: { "test/a.test.mjs": "assert.matchesContract(actual);" } },
      }));
      assert.equal(leg(unknown, "closed-set").disposition, "unclassified");

      const newFile = evaluateRatchet(observation({
        base: { featureTexts: {}, files: {} },
        head: { featureTexts: {}, files: { "test/new.test.mjs": open } },
      }));
      assert.equal(leg(newFile, "closed-set").findings.length, 0);
    },
  },
  {
    name: "57/03 task 03: skip, only and todo additions fire only on tests that existed at base",
    run: () => {
      for (const marker of ["skip", "only", "todo"]) {
        const result = evaluateRatchet(observation({
          base: { featureTexts: {}, files: { "test/a.test.mjs": "test(\"kept\", () => {});" } },
          head: { featureTexts: {}, files: { "test/a.test.mjs": `test.${marker}(\"kept\", () => {});\ntest.todo(\"new plan\");\n// test.skip(\"comment\", () => {});\n/*\ntest.skip(\"block comment\", () => {});\n*/` } },
        }));
        const markerLeg = leg(result, "marker");
        assert.equal(markerLeg.disposition, "fired", marker);
        assert.deepEqual(markerLeg.findings.map((finding) => [finding.test, finding.marker]), [["kept", marker]]);
      }

      const removed = evaluateRatchet(observation({
        base: { featureTexts: {}, files: { "test/a.test.mjs": "test.skip(\"kept\", () => {});" } },
        head: { featureTexts: {}, files: { "test/a.test.mjs": "test(\"kept\", () => {});" } },
      }));
      assert.equal(leg(removed, "marker").disposition, "clear");
    },
  },
  {
    name: "57/03 task 04: discharge resolves only a cited owning-register ADR from the base observation",
    run: () => {
      const before = "assert.deepEqual(actual, [\"a\"]);";
      const after = "assert.ok(actual.includes(\"a\"));";
      const base = { featureTexts: {}, files: { "test/a.test.mjs": before } };
      const head = { featureTexts: {}, files: { "test/a.test.mjs": after } };
      const discharged = evaluateRatchet(observation({
        base,
        head,
        baseArchitectureText: "## ADR-007: pre-existing authority\n",
        citationsByPath: { "test/a.test.mjs": ["57/ADR-007"] },
      }));
      assert.equal(leg(discharged, "closed-set").disposition, "discharged");
      assert.equal(leg(discharged, "closed-set").findings[0].authority, "ADR-007");

      for (const row of [
        { architecture: "", citations: ["ADR-007"] },
        { architecture: "## ADR-007: authority\n", citations: [] },
        { architecture: "A comment mentions ADR-007 but this is not a register heading.\n", citations: ["ADR-007"] },
      ]) {
        const result = evaluateRatchet(observation({
          base,
          head,
          baseArchitectureText: row.architecture,
          citationsByPath: { "test/a.test.mjs": row.citations },
        }));
        assert.equal(leg(result, "closed-set").disposition, "fired");
      }

      const rendered = ratchetCommand.cli.render(discharged);
      assert.doesNotMatch(rendered, /precision|detection rate|89%/iu);
    },
  },
  {
    name: "57/03 task 05: the citation is read at the base commit and must name the owning item",
    run: async () => {
      const before = "assert.deepEqual(actual, [\"a\"]);";
      const after = "assert.ok(actual.includes(\"a\"));";
      const architecture = "## ADR-007: pre-existing authority\n";
      const fire = (citations, owningItemRef = "57") => evaluateRatchet(observation({
        base: { featureTexts: {}, files: { "test/a.test.mjs": before } },
        head: { featureTexts: {}, files: { "test/a.test.mjs": after } },
        baseArchitectureText: architecture,
        citationsByPath: { "test/a.test.mjs": citations },
        owningItemRef,
      }));

      for (const [citation, outcome] of [
        ["57/ADR-007", "discharged"],
        ["m57/ADR-007", "discharged"],
        ["ADR-007", "fired"],
        ["35/ADR-007", "fired"],
        ["57/ADR-999", "fired"],
      ]) {
        assert.equal(leg(fire([citation]), "closed-set").disposition, outcome, citation);
      }
      assert.equal(leg(fire(["57/ADR-007"]), "closed-set").findings[0].authority, "ADR-007");
      assert.equal(leg(fire(["57/ADR-007"], null), "closed-set").disposition, "fired");

      // The boundary is the half that decides WHICH text the citations come from,
      // so the base-commit rule is asserted over the real observation builder: the
      // citation lives only in a comment added with the weakening, and at base the
      // file cites the owning item's ADR.
      const baseText = "// milestone 57 (57/ADR-007)\nassert.deepEqual(actual, [\"a\"]);";
      const headText = "// milestone 57 (57/ADR-007)\n// relaxed under 57/ADR-004\nassert.ok(actual.includes(\"a\"));";
      const tree = { "test/a.test.mjs": { base: baseText, head: headText } };
      const gitOutput = async (_root, args) => {
        if (args[0] === "ls-tree") return "";
        if (args[0] === "diff") return "test/a.test.mjs\0";
        if (args[0] === "ls-files") return "";
        if (args[0] === "show") {
          const file = args[1].split(":").slice(1).join(":");
          // Only the MILESTONE carries a register, as in the real tree — the walk
          // climbs past the story folder, and the ref it yields is that milestone's.
          if (file.endsWith("ARCHITECTURE.md")) {
            if (!/57_milestone_paired-loops\/ARCHITECTURE\.md$/u.test(file)) throw new Error("no register here");
            return "## ADR-007: pre-existing\n## ADR-004: also pre-existing\n";
          }
          return tree[file]?.base ?? "";
        }
        throw new Error(`unexpected git call ${args.join(" ")}`);
      };
      const workspace = { projectRoot: process.cwd(), workDir: `${process.cwd()}/wiki/work` };
      const item = { dir: `${process.cwd()}/wiki/work/57_milestone_paired-loops/stories/03_story_x` };
      const observed = await observeRatchet(workspace, item, { commit: "c1", source: "resolved" }, { gitOutput });
      assert.equal(observed.owningItemRef, "57");
      assert.deepEqual(observed.citationsByPath["test/a.test.mjs"], ["57/ADR-007"]);
    },
  },
];
