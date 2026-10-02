import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 134 / story 04 — the continue door refuses a story while a
// business question stands.
//
// Covers EVERY @executable scenario in
//   tasks/02_continue-refuses-a-story-while-a-business-question-stands.feature
//
// Driven through the real CLI over story 04's fixture project (`doctor-examples-lane.test.mjs`):
// its global home, its Claude config directory (the fixture transcript store, handed in as
// `CLAUDE_CONFIG_DIR`) and its run records are all fresh temp directories. The 409 the `--json`
// envelope does not print is read from the same door invoked in process. The cache-only row is
// planted through the cache-read fixture's own store writer. One test object per @executable
// scenario, Scenario Outline rows folded into one entry. node:assert/strict, `{ name, run }` shape.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { countAssignments } from "../support/item-lock-fixture.mjs";
import { withCacheReadFixture, plantCacheRow, runCommand, WORKER_NODE } from "../support/cache-read-fixture.mjs";
import { E, Q, QUESTIONS, R, NOT_APPLICABLE, answersFor, mapOf, withExamplesProject } from "./doctor-examples-lane.test.mjs";

const invoke = _aofApplication.invoke;
const loadWorkspace = _aofApplication.loadWorkspace;
const startRun = _aofApplication.execution.runs.startRun;

const CODE = "examples-question-open";
const OPEN_Q1 = mapOf(R(1, E(1)), QUESTIONS(Q(1, "business", "open")));

// The door in process, for the status code the CLI's envelope leaves out.
async function inProcess(fx, ref, phase = "continue") {
  const workspace = await loadWorkspace(fx.project, undefined, { env: fx.env });
  try {
    return { result: await invoke(`work:${phase}`, { ref }, { workspace, globalWorkStoreOptions: { env: fx.env }, effectsJournalOptions: { env: fx.env } }) };
  } catch (error) {
    return { error };
  }
}

// A transcript in RESEARCH R1's line shapes: the asking `tool_use` and the harness's answer.
function answeredTranscript(sessionId, question, text) {
  const id = "toolu_live";
  const at = "2026-09-24T10:00:00.000Z";
  return [
    JSON.stringify({ type: "assistant", sessionId, timestamp: at, message: { role: "assistant", content: [{ type: "tool_use", id, name: "AskUserQuestion", input: { questions: [{ question, header: "Q", options: [{ label: "a", description: "a" }], multiSelect: false }] } }] } }),
    JSON.stringify({ type: "user", sessionId, timestamp: at, entrypoint: "cli", message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: "answered" }] }, toolUseResult: { questions: [{ question }], answers: { [question]: text } } }),
  ].join("\n") + "\n";
}

const refusedWith = (outcome, ...words) => {
  assert.notEqual(outcome.status, 0, "the CLI exits non-zero");
  assert.equal(outcome.json?.code, CODE, outcome.stdout || outcome.stderr);
  for (const word of words) assert.ok(outcome.json.error.includes(word), `the refusal names ${word}: ${outcome.json.error}`);
};
const notRefused = (outcome, label) => assert.notEqual(outcome.json?.code, CODE, `${label}: ${outcome.stdout || outcome.stderr}`);

export const continueDoorExamplesTests = [
  {
    name: "examples/134-04 02 continue on a story is judged by its map (outline: 14 cases)",
    run: async () => {
      const cases = [
        ["an open business question", OPEN_Q1, null, ["refused", "134/04", "Q1"]],
        ["every question answered and anchored", mapOf(R(1, E(1, "[stated Q1]")), QUESTIONS(Q(1, "business", "answered"))), (fx) => fx.settled(fx.s04, answersFor("134/04 Q1")), ["local"]],
        ["an asked business question", mapOf(R(1, E(1)), QUESTIONS(Q(1, "business", "asked"))), null, ["refused", "134/04", "Q1"]],
        ["a defaulted business question", mapOf(R(1, E(1)), QUESTIONS(Q(1, "business", "defaulted ADR-004"))), null, ["refused", "134/04", "Q1"]],
        ["a technical question left open", mapOf(R(1, E(1)), QUESTIONS(Q(1, "technical", "open"))), null, ["local"]],
        ["an unanchored confirmed example", mapOf(R(1, E(1, "[confirmed]"))), null, ["refused", "134/04", "E1", "example-provenance-unanchored"]],
        ["an answer stamped on the milestone's run", mapOf(R(1, E(1, "[confirmed]"))), (fx) => fx.settled(fx.milestone, answersFor("134/04 E1")), ["local"]],
        ["an answer read live from a running run", mapOf(R(1, E(1)), QUESTIONS(Q(1, "business", "answered"))), async (fx) => {
          await startRun(fx.s04, { sessionId: "sess-live" });
          await mkdir(fx.projectsDir, { recursive: true });
          await writeFile(path.join(fx.projectsDir, "sess-live.jsonl"), answeredTranscript("sess-live", "134/04 Q1 · who may borrow?", "Members only."), "utf8");
        }, ["not-refused"]],
        ["an answer for another story's token", mapOf(R(1, E(1)), QUESTIONS(Q(1, "business", "answered"))), (fx) => fx.settled(fx.s04, answersFor("134/02 Q1")), ["refused", "134/04", "Q1", "example-provenance-unanchored"]],
        ["a misspelt label", mapOf(R(1, E(1), E(2, "[confirmd]"))), null, ["refused", "134/04", "line 4", "example-map-malformed"]],
        ["a bad class, answered and anchored", mapOf(R(1, E(1)), QUESTIONS(Q(1, "policy", "answered"))), (fx) => fx.settled(fx.s04, answersFor("134/04 Q1")), ["refused", "134/04", "line 5", "example-map-malformed"]],
        ["an empty map", "", null, ["refused", "134/04", "example-map-malformed"]],
        ["warnings only", mapOf(R(1, E(1)), R(2, E(2)), R(3, E(3)), R(4, E(4)), R(5)), null, ["local"]],
        ["not applicable", mapOf(NOT_APPLICABLE), null, ["local"]],
      ];
      for (const [label, map, given, [outcome, ...words]] of cases) {
        await withExamplesProject({ examples: { enabled: true } }, async (fx) => {
          await fx.writeMap(fx.s04, map);
          if (given) await given(fx);
          const answer = fx.cli("work", "continue", "134/04", "--json");
          if (outcome === "refused") {
            refusedWith(answer, ...words);
            const { error } = await inProcess(fx, "134/04");
            assert.equal(error?.code, CODE, label);
            assert.equal(error?.status, 409, `${label}: status 409`);
          } else if (outcome === "local") {
            assert.equal(answer.json?.ok, true, `${label}: ${answer.stdout || answer.stderr}`);
            assert.equal(answer.json.where, "local", label);
          } else {
            notRefused(answer, label);
          }
        }).catch((error) => { error.message = `${label}: ${error.message}`; throw error; });
      }
    },
  },
  {
    name: "examples/134-04 02 a refused continue moves nothing and mints nothing (outline: 2 flag sets)",
    run: async () => {
      for (const flags of [[], ["--node", "node-remote"]]) {
        await withExamplesProject({ examples: { enabled: true }, status04: "not-started" }, async (fx) => {
          await fx.writeMap(fx.s04, OPEN_Q1);
          const storyPath = path.join(fx.s04.dir, "STORY.md");
          const before = await readFile(storyPath);
          const answer = fx.cli("work", "continue", "134/04", "--json", ...flags);
          refusedWith(answer);
          const { error } = await inProcess(fx, "134/04");
          assert.equal(error?.status, 409);
          assert.ok((await readFile(storyPath)).equals(before), `${flags.join(" ")}: STORY.md is byte-identical`);
          assert.equal(await countAssignments({ env: fx.env }), 0, "no assignment");
          for (const item of [fx.s04, fx.milestone]) assert.equal(existsSync(path.join(item.dir, "runs")), false, `${item.ref}: no run record`);
        });
      }
    },
  },
  {
    name: "examples/134-04 02 the door stands open where it has nothing to refuse (outline: 6 cases)",
    run: async () => {
      const cases = [
        ["a milestone continue over a blocked story", { examples: { enabled: true } }, OPEN_Q1, "134"],
        ["the gate off", {}, OPEN_Q1, "134/04"],
        ["the gate false", { examples: { enabled: false } }, OPEN_Q1, "134/04"],
        ["the gate mistyped", { examples: { enabled: "yes" } }, OPEN_Q1, "134/04"],
        ["no map", { examples: { enabled: true } }, null, "134/04"],
        ["a delivered story", { examples: { enabled: true }, status04: "done" }, OPEN_Q1, "134/04"],
      ];
      for (const [label, options, map, ref] of cases) {
        await withExamplesProject(options, async (fx) => {
          if (map != null) await fx.writeMap(fx.s04, map);
          const answer = fx.cli("work", "continue", ref, "--json");
          assert.equal(answer.json?.ok, true, `${label}: ${answer.stdout || answer.stderr}`);
        });
      }
    },
  },
  {
    name: "examples/134-04 02 a story this node holds no folder for is not judged here",
    run: () => withCacheReadFixture(async (fx) => {
      const configPath = path.join(fx.root, ".aof", "aof.config.json");
      const config = JSON.parse(await readFile(configPath, "utf8"));
      config.work = { ...config.work, examples: { enabled: true } };
      await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
      await plantCacheRow(fx, "134/05", { type: "story", parent: "134", status: "in-progress", node: WORKER_NODE });
      const tree = await readdir(fx.workDir, { recursive: true });
      assert.equal(tree.some((entry) => /05_story_/.test(entry)), false, "this project holds no 134/05 folder");
      let refusal = null;
      try {
        await runCommand(fx, "work:continue", { ref: "134/05" });
      } catch (error) {
        refusal = error;
      }
      // Whatever the dispatch decision answers, it is a coded answer of its own — never the
      // examples refusal, and never a crash on a row whose `dir` is null.
      if (refusal) assert.equal(typeof refusal.code, "string", `a coded refusal, not a crash: ${refusal.stack}`);
      assert.notEqual(refusal?.code, CODE);
    }, { stream: [{ number: "134", stories: [] }] }),
  },
  {
    name: "examples/134-04 02 only the continue phase is refused (outline: 2 phases)",
    run: () => withExamplesProject({ examples: { enabled: true } }, async (fx) => {
      await fx.writeMap(fx.s04, OPEN_Q1);
      for (const phase of ["refine", "verify"]) {
        notRefused(fx.cli("work", phase, "134/04", "--json"), phase);
        const { error } = await inProcess(fx, "134/04", phase);
        assert.notEqual(error?.code, CODE, phase);
      }
      refusedWith(fx.cli("work", "continue", "134/04", "--json"), "Q1");
    }),
  },
  {
    name: "examples/134-04 02 the door and the doctor agree on one story",
    run: () => withExamplesProject({ examples: { enabled: true } }, async (fx) => {
      await fx.writeMap(fx.s04, mapOf(R(1, E(1, "[confirmed]")), QUESTIONS(Q(1, "business", "open"))));
      const doctor = fx.cli("work", "doctor", "134/04", "--json");
      const errors = (doctor.json?.findings ?? []).filter((finding) => finding.code.startsWith("example-") && finding.severity === "error");
      const door = fx.cli("work", "continue", "134/04", "--json");
      refusedWith(door);
      const pairs = (findings) => findings.map((finding) => [finding.code, finding.message]).sort();
      assert.equal(errors.length, 2, "non-vacuity: one open question and one unanchored example");
      assert.deepEqual(pairs(door.json.findings), pairs(errors));
    }),
  },
];
