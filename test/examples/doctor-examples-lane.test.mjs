import { defaultSessionDriver as _aofSessions } from "aof/session-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 134 / story 04 — the examples doctor lane and its snapshot probe.
//
// Covers EVERY @executable scenario in
//   tasks/00_the-examples-lane-reports-the-map-a-person-has-not-answered.feature
//   tasks/01_the-snapshot-reads-a-story-map-and-budgets-it-only-when-the-gate-is-on.feature
// and, for milestone 135 / story 01 (the practice moved into its own package), in
//   tasks/01_nothing-a-user-can-see-changes.feature
//
// The lane is asked over LITERAL snapshots whose story dirs name a directory that does not exist,
// so a lane that reached the disk would see nothing. The probe, the budget row and the doctor's
// exit code are driven over a fixture project in a fresh temp directory — its global home, its
// Claude config directory (the transcript store) and its run records all temp too — through the
// engine's own `buildSnapshot`/`doctorWork` and the real CLI. Nothing reads the real `~/.aof` or
// `~/.claude`.
//
// The contract names the lane `src/work/doctor-examples.mjs` and the row `src/work`; since 142 the
// lane was `packages/work/src/doctor/examples.mjs`, and since 135/01 it is
// `packages/specification-by-example/src/doctor-lane.mjs` (assembled as
// `application.work.doctorExamples`), its map riding the row as `extensions.examples`. One test
// object per @executable scenario, Scenario Outline rows folded into one entry. node:assert/strict,
// `{ name, run }` shape.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXAMPLES_DOC, MALFORMED_REASONS, parseExampleMap } from "@aof/specification-by-example/map";
import { budgetKeyFor } from "@aof/work/doctor/budget";
import { EXAMPLES_BUDGET_ROWS } from "@aof/specification-by-example/story-probe";

const CHECK_GROUPS = _aofApplication.work.doctor.CHECK_GROUPS;
const buildSnapshot = _aofApplication.work.doctor.buildSnapshot;
const doctorWork = _aofApplication.work.doctor.doctorWork;
const budgetsFromConfig = _aofApplication.work.doctor.budgetsFromConfig;
const diagramsGroup = _aofApplication.work.doctorDiagrams.diagramsGroup;
const { EXAMPLE_LANE_CODES, examplesFindings, examplesGroup } = _aofApplication.work.doctorExamples;
const { startRun, completeRun, recordAnswers, readRuns } = _aofApplication.execution.runs;
const claudeProjectsDir = _aofSessions.workObserve.claudeProjectsDir;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const LANE_SOURCE = path.join(repoRoot, "packages", "specification-by-example", "src", "doctor-lane.mjs");
const GHOST = path.join(os.tmpdir(), "aof-examples-lane-no-such-dir", "04_story_the-gate");
const ON = Object.freeze({ work: { examples: { enabled: true } } });
const AT = "2026-09-24T10:00:00.000Z";

// ── the map, written line by line ────────────────────────────────────────────────────────────────
export const E = (n, label = "[proposed]") => `- E${n} · example ${n} ${label}`;
export const R = (n, ...examples) => [`## R${n} · rule ${n}`, ...examples];
export const Q = (n, cls, state) => `- Q${n} · ${cls} · ${state} · question ${n}?`;
export const QUESTIONS = (...questions) => ["## Questions", ...questions];
export const NOT_APPLICABLE = "Not applicable: a rename with no rule a person owns.";
export const mapOf = (...parts) => ["# 134/04 · the map", ...parts.flat()].join("\n") + "\n";
// "an answer for T" — a record of story 03's shape.
export const answerFor = (token, answer = "Yes.") => ({
  token, question: `${token} · question?`, answer, toolUseId: `toolu_${token.replace(/\W/g, "")}`, sessionId: "sess-1", at: AT, entrypoint: "cli",
});
export const answersFor = (...tokens) => tokens.map((token) => answerFor(token));

const row = ({ text, answers = [], status = "in-progress", ref = "134/04", dir = GHOST, map = true }) => ({
  ref, type: "story", dir, meta: { status }, extensions: map ? { examples: { text, answers } } : null,
});
const lane = (rows, config = ON) => examplesGroup({ items: [].concat(rows) }, { config });
const shape = (findings) => findings.map((finding) => [finding.code, finding.severity]).sort();
const named = (findings, code) => findings.filter((finding) => finding.code === code);

// ── the fixture project ──────────────────────────────────────────────────────────────────────────
const ABSENT = Symbol("absent");
const storyDoc = (number, slug, status, parent = "134") => `---\ntype: story\nnumber: ${number}\nslug: ${slug}\ntitle: ${slug}\nparent: ${parent}\ndepends: []\nstatus: ${status}\ncreated: 2026-09-23\nupdated: 2026-09-24\nschema: 1\n---\n# ${number} · ${slug}\n`;

// A project `P` holding milestone `134` and its stories `134/02` and `134/04`, all `in-progress`,
// with its own global home and its own Claude config directory (the fixture transcript store).
// `milestone` and `story` renumber the milestone and the gate story (135/01 names its story `7/2`).
export async function examplesProject({ examples = ABSENT, budgets = null, status04 = "in-progress", mesh = null, milestone: number = "134", story = "04" } = {}) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-examples-gate-")));
  const project = path.join(root, "P");
  const globalHome = path.join(root, "G");
  const claudeDir = path.join(root, "C");
  const workDir = path.join(project, "wiki", "work");
  const milestone = { ref: number, dir: path.join(workDir, `${number}_milestone_discovery`) };
  const s02 = { ref: `${number}/02`, dir: path.join(milestone.dir, "stories", "02_story_the-map") };
  const s04 = { ref: `${number}/${story}`, dir: path.join(milestone.dir, "stories", `${story}_story_the-gate`) };
  for (const dir of [s02.dir, s04.dir, path.join(project, ".aof"), globalHome, claudeDir]) await mkdir(dir, { recursive: true });
  const config = {
    name: "examples-fixture",
    resources: [],
    ...(mesh ? { mesh } : {}),
    work: {
      dir: "./wiki/work",
      ...(examples === ABSENT ? {} : { examples }),
      ...(budgets ? { doctor: { budgets } } : {}),
    },
  };
  await writeFile(path.join(project, ".aof", "aof.config.json"), JSON.stringify(config, null, 2), "utf8");
  await writeFile(path.join(milestone.dir, "SPEC.md"), `---\ntype: milestone\nnumber: ${number}\nslug: discovery\ntitle: discovery\nstatus: in-progress\ncreated: 2026-09-23\nupdated: 2026-09-24\nschema: 1\n---\n# ${number} · discovery\n`, "utf8");
  await writeFile(path.join(s02.dir, "STORY.md"), storyDoc("02", "the-map", "in-progress", number), "utf8");
  await writeFile(path.join(s04.dir, "STORY.md"), storyDoc(story, "the-gate", status04, number), "utf8");
  const env = { ...process.env, AOF_GLOBAL_HOME: globalHome, CLAUDE_CONFIG_DIR: claudeDir, NODE_NO_WARNINGS: "1" };
  const projectsDir = claudeProjectsDir({ cwd: project, env: { CLAUDE_CONFIG_DIR: claudeDir } });
  const cli = (...args) => {
    const result = spawnSync(process.execPath, [cliPath, ...args], { cwd: project, encoding: "utf8", env });
    let json = null;
    try { json = JSON.parse(result.stdout); } catch { json = null; }
    return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", json };
  };
  return {
    root, project, workDir, milestone, s02, s04, config, globalHome, claudeDir, projectsDir, env, cli,
    writeMap: (item, text) => writeFile(path.join(item.dir, EXAMPLES_DOC), text, "utf8"),
    // A settled run of `item`, stamped with `answers` when given.
    settled: async (item, answers = null, sessionId = "sess-settled") => {
      const run = await startRun(item, { sessionId, now: AT });
      await completeRun(item, { runId: run.runId, outcome: "done", now: AT });
      if (answers) await recordAnswers(item, { runId: run.runId, answers });
      return run;
    },
    done: () => rm(root, { recursive: true, force: true }),
  };
}

export async function withExamplesProject(options, body) {
  const fx = await examplesProject(options);
  try {
    return await body(fx);
  } finally {
    await fx.done();
  }
}

// The snapshot `doctorWork` builds for a config: the config the story probe resolves the gate from
// through its one resolver, and the transcript directory the caller names (task 01, developer
// ruling 3).
export const snapshotOf = (fx, config = fx.config) => buildSnapshot(fx.workDir, {
  projectRoot: fx.project,
  config,
  projectsDir: fx.projectsDir,
});
const rowOf = (snapshot, ref) => snapshot.items.find((item) => item.ref === ref);
const lines = (count) => mapOf(Array.from({ length: count - 1 }, (_, index) => `<!-- line ${index + 2} -->`));
const exampleFindingsOf = (json, ref = "134/04") => (json?.findings ?? []).filter((finding) => finding.code.startsWith("example-") && finding.message.startsWith(`${ref}:`));

export const doctorExamplesLaneTests = [
  // ══ 00_the-examples-lane-reports-the-map-a-person-has-not-answered.feature ══
  {
    name: "examples/134-04 00 the lane's codes are exactly ADR-005's five, frozen, and it is the tenth lane",
    run: async () => {
      assert.deepEqual([...EXAMPLE_LANE_CODES], ["example-question-open", "example-provenance-unanchored", "example-map-malformed", "example-rule-no-example", "example-map-too-many-rules"]);
      assert.ok(Object.isFrozen(EXAMPLE_LANE_CODES));
      assert.equal(CHECK_GROUPS.at(-1), examplesGroup, "examplesGroup is the last entry of CHECK_GROUPS");
      assert.equal(CHECK_GROUPS.at(-2), diagramsGroup, "…directly after diagramsGroup");
      const module = await import("@aof/specification-by-example/doctor-lane");
      const exported = [...Object.keys(module), ...Object.keys(_aofApplication.work.doctorExamples)];
      assert.deepEqual(exported.filter((name) => name.endsWith("_FINDING_CODES")), []);
      assert.equal((await readFile(LANE_SOURCE, "utf8")).includes("_FINDING_CODES ="), false, "no *_FINDING_CODES array is declared");
    },
  },
  {
    name: "examples/134-04 00 an open story's map is judged line by line (outline: 10 cases)",
    run: () => {
      const cases = [
        ["a clean map", mapOf(R(1, E(1), E(2, "[confirmed]")), QUESTIONS(Q(1, "business", "answered"))), answersFor("134/04 E2", "134/04 Q1"), []],
        ["an open business question", mapOf(R(1, E(1)), QUESTIONS(Q(1, "business", "open"))), [], [["example-question-open", "Q1"]]],
        ["a defaulted business question", mapOf(R(1, E(1)), QUESTIONS(Q(1, "business", "defaulted ADR-004"))), [], [["example-question-open", "Q1"]]],
        ["a technical open question", mapOf(R(1, E(1)), QUESTIONS(Q(1, "technical", "open"))), [], []],
        ["a misspelt provenance", mapOf(R(1, E(1), E(2, "[confirmd]"))), [], [["example-map-malformed", "line 4", "bad-provenance"]]],
        ["a bad class, open", mapOf(R(1, E(1)), QUESTIONS(Q(1, "policy", "open"))), [], [["example-map-malformed", "bad-class"], ["example-question-open", "Q1"]]],
        ["a bad class, answered, no answer", mapOf(R(1, E(1)), QUESTIONS(Q(1, "policy", "answered"))), [], [["example-map-malformed", "bad-class"], ["example-provenance-unanchored", "Q1"]]],
        ["a bad class, answered and anchored", mapOf(R(1, E(1)), QUESTIONS(Q(1, "policy", "answered"))), answersFor("134/04 Q1"), [["example-map-malformed", "bad-class"]]],
        ["a bad state", mapOf(R(1, E(1)), QUESTIONS(Q(1, "business", "Answered"))), answersFor("134/04 Q1"), [["example-map-malformed", "bad-state"], ["example-question-open", "Q1"]]],
        ["a stated example naming no question", mapOf(R(1, E(1, "[stated Q9]"))), [], [["example-map-malformed", "stated-names-no-question"], ["example-provenance-unanchored", "E1", "134/04 Q9"]]],
      ];
      for (const [label, text, answers, expected] of cases) {
        const found = lane(row({ text, answers }));
        assert.deepEqual(shape(found), expected.map(([code]) => [code, "error"]).sort(), label);
        for (const [code, ...words] of expected) {
          const [finding] = named(found, code);
          for (const word of words) assert.ok(finding.message.includes(word), `${label}: ${code} names ${word} — ${finding.message}`);
        }
      }
    },
  },
  {
    name: "examples/134-04 00 every reason in MALFORMED_REASONS is one gating error",
    run: () => {
      const maps = {
        "unknown-line": [R(1, E(1)), "a line the grammar does not admit"],
        "bad-id": [R(1, E(1), "- E01 · example [proposed]")],
        "duplicate-id": [R(1, E(1), E(1))],
        "bad-provenance": [R(1, E(1), E(2, "[confirmd]"))],
        "stated-names-no-question": [R(1, E(1), E(2, "[stated Q9]"))],
        "bad-class": [R(1, E(1)), QUESTIONS(Q(1, "policy", "open"))],
        "bad-state": [R(1, E(1)), QUESTIONS(Q(1, "business", "Answered"))],
        "misplaced-example": [E(1), R(1, E(2))],
        "misplaced-question": [R(1, E(1), Q(1, "business", "open"))],
        "duplicate-section": [R(1, E(1)), QUESTIONS(Q(1, "technical", "open")), QUESTIONS(Q(2, "technical", "open"))],
        "bad-not-applicable": ["Not applicable:"],
        "not-applicable-with-rules": [R(1, E(1)), NOT_APPLICABLE],
        "empty-map": null,
      };
      assert.deepEqual(Object.keys(maps).sort(), [...MALFORMED_REASONS].sort(), "a map for every reason");
      for (const reason of MALFORMED_REASONS) {
        const text = maps[reason] == null ? "" : mapOf(...maps[reason]);
        const parsed = parseExampleMap(text).malformed;
        assert.deepEqual(parsed.map((entry) => entry.reason), [reason], `${reason}: the map's parse carries exactly one malformed entry of that reason`);
        const malformed = named(examplesFindings({ ref: "134/04", status: "in-progress", dir: GHOST, text, answers: [] }), "example-map-malformed");
        assert.equal(malformed.length, 1, reason);
        assert.equal(malformed[0].severity, "error", reason);
        assert.ok(malformed[0].message.includes(reason), reason);
        assert.ok(malformed[0].message.includes(`line ${parsed[0].line}`), `${reason}: names the entry's line`);
      }
    },
  },
  {
    name: "examples/134-04 00 a claim is anchored only by an answer for its own token (outline: 11 rows)",
    run: () => {
      const cases = [
        [[E(1, "[confirmed]")], [Q(1, "business", "answered")], answersFor("134/04 Q1"), [["E1", "134/04 E1"]]],
        [[E(1, "[confirmed]")], [Q(1, "business", "answered")], answersFor("134/04 E1", "134/04 Q1"), []],
        [[E(1, "[confirmed]")], [Q(1, "business", "answered")], [answerFor("134/04 E1", "No, that is wrong"), answerFor("134/04 Q1")], []],
        [[E(1, "[confirmed]")], [Q(1, "business", "answered")], answersFor("134/02 E1", "134/04 Q1"), [["E1", "134/04 E1"]]],
        [[E(1, "[confirmed]")], [Q(1, "business", "answered")], answersFor("134 E1", "134/04 Q1"), [["E1", "134/04 E1"]]],
        [[E(1, "[stated Q1]")], [Q(1, "business", "answered")], answersFor("134/04 Q1"), []],
        [[E(1, "[stated Q1]")], [Q(1, "business", "answered")], answersFor("134/02 Q1"), [["E1", "134/04 Q1"], ["Q1", "134/04 Q1"]]],
        [[E(1)], [Q(1, "business", "answered")], [], [["Q1", "134/04 Q1"]]],
        [[E(1)], [Q(1, "technical", "answered")], [], [["Q1", "134/04 Q1"]]],
        [[E(1)], [Q(1, "business", "open")], [], []],
        [[E(1, "[confirmed]"), E(2, "[stated Q2]")], [Q(1, "business", "answered"), Q(2, "business", "answered")], answersFor("134/04 Q2"), [["E1", "134/04 E1"], ["Q1", "134/04 Q1"]]],
      ];
      for (const [index, [examples, questions, answers, expected]] of cases.entries()) {
        const text = mapOf(R(1, ...examples), QUESTIONS(...questions));
        const unanchored = named(examplesFindings({ ref: "134/04", status: "in-progress", dir: GHOST, text, answers }), "example-provenance-unanchored");
        assert.equal(unanchored.length, expected.length, `row ${index + 1}: ${JSON.stringify(unanchored.map((f) => f.message))}`);
        for (const [id, token] of expected) {
          assert.ok(unanchored.some((finding) => finding.message.includes(`${id} (`) && finding.message.includes(`"${token}"`)), `row ${index + 1}: names ${id} and ${token}`);
        }
      }
    },
  },
  {
    name: "examples/134-04 00 the warn codes signal a rule not understood and a story too big (outline: 7 cases)",
    run: () => {
      const rules = (count, withExample = count) => Array.from({ length: count }, (_, i) => (i < withExample ? R(i + 1, E(i + 1)) : R(i + 1)));
      const cases = [
        ["a rule with no example", mapOf(R(1, E(1)), R(2)), [["example-rule-no-example", "warn", "R2"]]],
        ["a rule whose one example is misspelt", mapOf(R(1, E(1, "[confirmd]"))), [["example-rule-no-example", "warn", "R1"], ["example-map-malformed", "error"]]],
        ["four rules", mapOf(...rules(4)), []],
        ["five rules", mapOf(...rules(5)), [["example-map-too-many-rules", "warn", "5 rules", "limit of 4"]]],
        ["six rules", mapOf(...rules(6)), [["example-map-too-many-rules", "warn", "6 rules", "limit of 4"]]],
        ["five rules, two with no example", mapOf(...rules(5, 3)), [["example-map-too-many-rules", "warn"], ["example-rule-no-example", "warn", "R4"], ["example-rule-no-example", "warn", "R5"]]],
        ["questions and no rule", mapOf(QUESTIONS(Q(1, "technical", "open"))), []],
      ];
      for (const [label, text, expected] of cases) {
        const found = lane(row({ text }));
        assert.deepEqual(shape(found), expected.map(([code, severity]) => [code, severity]).sort(), label);
        for (const [code, , ...words] of expected) {
          for (const word of words) assert.ok(named(found, code).some((finding) => finding.message.includes(word)), `${label}: ${code} names ${word}`);
        }
      }
    },
  },
  {
    name: "examples/134-04 00 the lane is silent where it has no map to judge (outline: 4 cases)",
    run: () => {
      const open = mapOf(QUESTIONS(Q(1, "business", "open")));
      assert.deepEqual(lane(row({ text: open }), {}), [], "the gate off");
      assert.deepEqual(lane(row({ text: open }), { work: { examples: { enabled: "true" } } }), [], "the gate mistyped");
      assert.deepEqual(lane(row({ text: open, map: false })), [], "an absent map");
      assert.deepEqual(lane(row({ text: mapOf(NOT_APPLICABLE) })), [], "not applicable");
    },
  },
  {
    name: "examples/134-04 00 a delivered map's errors fall to warn, and its warns stay warn (outline: 4 statuses)",
    run: () => {
      const text = mapOf(R(1, E(1, "[confirmed]"), "- E2 · x [confirmd]"), R(2), QUESTIONS(Q(1, "business", "open")));
      for (const [status, severity] of [["not-started", "error"], ["in-progress", "error"], ["in-review", "error"], ["done", "warn"]]) {
        const found = lane(row({ text, status }));
        for (const code of ["example-question-open", "example-provenance-unanchored", "example-map-malformed"]) {
          assert.deepEqual(named(found, code).map((finding) => finding.severity), [severity], `${status}: ${code}`);
        }
        assert.deepEqual(named(found, "example-rule-no-example").map((finding) => finding.severity), ["warn"], status);
      }
    },
  },
  {
    name: "examples/134-04 00 a finding points at the file and the line a person must fix",
    run: () => {
      // Line 1 is the title; lines 2-6 hold R1 and E1 with comments, so Q1 lands on line 9.
      const text = ["# 134/04 · the map", "<!-- 2 -->", ...R(1, E(1)), "<!-- 5 -->", "<!-- 6 -->", "<!-- 7 -->", "## Questions", Q(1, "business", "open")].join("\n");
      const [finding] = lane(row({ text }));
      assert.equal(finding.path, path.join(GHOST, EXAMPLES_DOC));
      for (const word of ["134/04", "Q1", "9"]) assert.ok(finding.message.includes(word), word);
      assert.match(finding.message, /line 9\b/);
    },
  },
  {
    name: "examples/134-04 00 the lane and the door ask the same function",
    run: () => {
      const text = mapOf(R(1, E(1, "[confirmed]")), R(2), QUESTIONS(Q(1, "business", "open")));
      const answers = answersFor("134/02 E1");
      const viaLane = lane(row({ text, answers, status: "in-review" }));
      const direct = examplesFindings({ ref: "134/04", status: "in-review", dir: GHOST, text, answers });
      assert.ok(direct.length >= 3);
      assert.deepEqual(viaLane, direct);
    },
  },
  {
    name: "examples/134-04 00 the lane is pure and deterministic",
    run: async () => {
      const stories = [1, 2, 3].map((n) => row({
        ref: `134/0${n}`, dir: path.join(GHOST, String(n)),
        text: mapOf(R(1, E(1, "[confirmed]")), R(2), QUESTIONS(Q(1, "business", "open"))),
        answers: answersFor(`134/0${n} E1`),
      }));
      assert.deepEqual(lane(stories), lane(stories));
      assert.ok(lane(stories).length > 0, "non-vacuity");
      const source = await readFile(LANE_SOURCE, "utf8");
      for (const banned of ["node:fs", "node:fs/promises", "node:child_process"]) {
        assert.equal(source.includes(`"${banned}"`), false, `imports ${banned}`);
      }
      assert.equal(/\bDate\b/.test(source), false, "reads no Date");
    },
  },

  // ══ 01_the-snapshot-reads-a-story-map-and-budgets-it-only-when-the-gate-is-on.feature ══
  {
    name: "examples/134-04 01 the probe reads a map only for a story, with the gate on, when the file is there (outline: 10 cases)",
    run: async () => {
      const MAP = mapOf(R(1, E(1)));
      const cases = [
        ["on, story, present", { enabled: true }, async (fx) => fx.writeMap(fx.s04, MAP), (rows) => {
          assert.deepEqual(rows["134/04"].extensions?.examples ?? null, { text: MAP, answers: [] });
          assert.deepEqual(rows["134/04"].docSizes[EXAMPLES_DOC], { lines: 3 });
        }],
        ["on, story, absent", { enabled: true }, async () => {}, (rows) => {
          for (const item of Object.values(rows)) {
            assert.equal(item.extensions?.examples ?? null, null, item.ref);
            assert.equal(EXAMPLES_DOC in item.docSizes, false, item.ref);
          }
        }],
        ["on, milestone", { enabled: true }, async (fx) => writeFile(path.join(fx.milestone.dir, EXAMPLES_DOC), MAP, "utf8"), (rows) => {
          assert.equal(rows["134"].extensions?.examples ?? null, null);
          assert.equal(EXAMPLES_DOC in rows["134"].docSizes, false);
        }],
        ["on, one story of two", { enabled: true }, async (fx) => fx.writeMap(fx.s04, MAP), (rows) => {
          assert.notEqual(rows["134/04"].extensions?.examples ?? null, null);
          assert.equal(rows["134/02"].extensions?.examples ?? null, null);
        }],
        ["on, empty file", { enabled: true }, async (fx) => fx.writeMap(fx.s04, ""), (rows) => {
          assert.deepEqual(rows["134/04"].extensions?.examples ?? null, { text: "", answers: [] });
          assert.deepEqual(rows["134/04"].docSizes[EXAMPLES_DOC], { lines: 0 });
        }],
        ["on, a file in tasks/", { enabled: true }, async (fx) => {
          await mkdir(path.join(fx.s04.dir, "tasks"), { recursive: true });
          await writeFile(path.join(fx.s04.dir, "tasks", EXAMPLES_DOC), MAP, "utf8");
        }, (rows) => assert.equal(rows["134/04"].extensions?.examples ?? null, null)],
        ...[["off", ABSENT], ["off, false", { enabled: false }], ["off, mistyped", { enabled: "yes" }], ["off, misspelt key", { enable: true }]].map(([label, gate]) => [label, gate, async (fx) => fx.writeMap(fx.s04, MAP), (rows) => {
          assert.equal(rows["134/04"].extensions?.examples ?? null, null, label);
          assert.equal(EXAMPLES_DOC in rows["134/04"].docSizes, false, label);
        }]),
      ];
      for (const [label, gate, place, expect] of cases) {
        await withExamplesProject({ examples: gate }, async (fx) => {
          await place(fx);
          const snapshot = await snapshotOf(fx);
          expect(Object.fromEntries(snapshot.items.map((item) => [item.ref, item])));
        }).catch((error) => { error.message = `${label}: ${error.message}`; throw error; });
      }
    },
  },
  {
    name: "examples/134-04 01 the row carries the story's own answers, read through the one collector",
    run: () => withExamplesProject({ examples: { enabled: true } }, async (fx) => {
      await fx.writeMap(fx.s04, mapOf(R(1, E(1))));
      await fx.settled(fx.s04, answersFor("134/04 Q1"));
      await fx.settled(fx.s02, answersFor("134/02 Q1"));
      const s04 = rowOf(await snapshotOf(fx), "134/04");
      assert.deepEqual(s04.extensions.examples.answers.map((record) => record.token), ["134/04 Q1"]);
    }),
  },
  {
    name: "examples/134-04 01 EXAMPLES.md is budgeted as the examples kind (outline: 7 rows)",
    run: async () => {
      const cases = [
        [50, null, null],
        [51, null, 50],
        [51, { examples: 60 }, null],
        [61, { examples: 60 }, 60],
        [51, { examples: 0 }, 50],
        [51, { examples: "sixty" }, 50],
        [51, { plan: 200 }, 50],
      ];
      for (const [count, budgets, budget] of cases) {
        await withExamplesProject({ examples: { enabled: true }, budgets }, async (fx) => {
          await fx.writeMap(fx.s04, lines(count));
          const { json } = fx.cli("work", "doctor", "134/04", "--json");
          const over = (json?.findings ?? []).filter((finding) => finding.code === "doc-over-budget" && finding.path.endsWith(EXAMPLES_DOC));
          const label = `${count} lines, budgets ${JSON.stringify(budgets)}`;
          if (budget == null) {
            assert.deepEqual(over, [], label);
          } else {
            assert.equal(over.length, 1, label);
            assert.equal(over[0].severity, "warn", label);
            for (const word of [EXAMPLES_DOC, `${count} lines`, `${budget}-line budget`]) assert.ok(over[0].message.includes(word), `${label}: ${word}`);
          }
        });
      }
    },
  },
  {
    name: "examples/134-04 01 at the accepting door an over-budget map is an error",
    run: () => withExamplesProject({ examples: { enabled: true } }, async (fx) => {
      await fx.writeMap(fx.s04, lines(51));
      const findings = await doctorWork(fx.workDir, fx.config, "134/04", { acceptingRef: "134/04", projectRoot: fx.project, now: Date.parse(AT) });
      const over = findings.filter((finding) => finding.code === "doc-over-budget" && finding.path === path.join(fx.s04.dir, EXAMPLES_DOC));
      assert.deepEqual(over.map((finding) => finding.severity), ["error"]);
    }),
  },
  {
    name: "examples/134-04 01 the examples kind resolves beside the plan kind",
    run: () => {
      assert.deepEqual(budgetsFromConfig({}), { spec: 300, architecture: 700, story: 150, feature: 300, plan: 80, examples: 50 });
      assert.equal(budgetKeyFor("EXAMPLES.md", EXAMPLES_BUDGET_ROWS), "examples");
      assert.equal(budgetKeyFor("EXAMPLES.md"), undefined, "the map is budgeted only through the row the package injects");
    },
  },
  {
    name: "examples/134-04 01 the doctor reports the gate's findings end to end",
    run: () => withExamplesProject({ examples: { enabled: true } }, async (fx) => {
      await fx.writeMap(fx.s04, mapOf(R(1, E(1, "[confirmed]")), QUESTIONS(Q(1, "business", "open"))));
      const { status, json } = fx.cli("work", "doctor", "134/04", "--json");
      const found = exampleFindingsOf(json);
      assert.deepEqual(shape(found), [["example-provenance-unanchored", "error"], ["example-question-open", "error"]]);
      assert.ok(named(found, "example-question-open")[0].message.includes("Q1"));
      assert.ok(named(found, "example-provenance-unanchored")[0].message.includes("E1"));
      for (const finding of found) assert.ok(finding.path.replace(/\\/g, "/").endsWith("04_story_the-gate/EXAMPLES.md"), finding.path);
      assert.notEqual(status, 0, "an error-severity finding fails the doctor");
    }),
  },
  {
    name: "examples/134-04 01 a map with warnings only does not change the doctor's exit code",
    run: () => withExamplesProject({ examples: { enabled: true } }, async (fx) => {
      await fx.writeMap(fx.s04, mapOf(R(1, E(1)), R(2)));
      const withMap = fx.cli("work", "doctor", "134/04", "--json");
      const found = exampleFindingsOf(withMap.json);
      assert.deepEqual(shape(found), [["example-rule-no-example", "warn"]]);
      await rm(path.join(fx.s04.dir, EXAMPLES_DOC));
      const withoutMap = fx.cli("work", "doctor", "134/04", "--json");
      assert.equal(withMap.status, withoutMap.status);
    }),
  },
  {
    // 135/01 moved the lane into @aof/specification-by-example: the doctor row states both the raise
    // 134/04 made and the shrink the move gave back, and the lane is the package's own module.
    name: "examples/134-04 01 the tenth lane is a stated raise of the packages/work/src/doctor row",
    run: async () => {
      const budget = await readFile(path.join(repoRoot, "test", "arch", "testing", "acd-source-directory-budget.test.mjs"), "utf8");
      const line = budget.split(/\r?\n/).find((text) => text.includes('"directory":"packages/work/src/doctor"'));
      assert.ok(line, "the row exists");
      const rowData = JSON.parse(line.trim().replace(/^Object\.freeze\(/, "").replace(/\),?$/, ""));
      const children = (await readdir(path.join(repoRoot, "packages", "work", "src", "doctor"))).length;
      assert.equal(children, 10);
      assert.equal(rowData.ceiling, 10);
      assert.match(rowData.why, /tenth doctor lane/);
      assert.match(rowData.why, /10 -> 11/);
      assert.match(rowData.why, /11 -> 10/);
      assert.match(rowData.why, /@aof\/specification-by-example/);
      await readFile(LANE_SOURCE, "utf8");
    },
  },

  // ══ 135/01 · 01_nothing-a-user-can-see-changes.feature ══
  // The Background: a project with the gate on and a story `7/2` whose map holds an open business
  // question Q1 and a `confirmed` example E2 no answer carries — through the assembled application
  // and the real CLI, with the practice composed in by core.
  {
    name: "examples/135-01 01 the doctor reports the same example findings through the assembled application",
    run: () => withSeventwo(ON.work.examples, async (fx) => {
      const { json } = fx.cli("work", "doctor", "7/2", "--json");
      const found = exampleFindingsOf(json, "7/2");
      assert.deepEqual(shape(found), [["example-provenance-unanchored", "error"], ["example-question-open", "error"]]);
      assert.ok(named(found, "example-question-open")[0].message.includes("Q1"));
      const unanchored = named(found, "example-provenance-unanchored")[0].message;
      assert.ok(unanchored.includes("E2") && unanchored.includes('"7/2 E2"'), unanchored);
      // The CLI prints a path relative to the project.
      for (const finding of found) assert.equal(path.resolve(fx.project, finding.path), path.join(fx.s04.dir, EXAMPLES_DOC));
    }),
  },
  {
    name: "examples/135-01 01 the map is still budgeted at one screen",
    run: () => withSeventwo(ON.work.examples, async (fx) => {
      await fx.writeMap(fx.s04, lines(51));
      const { json } = fx.cli("work", "doctor", "7/2", "--json");
      const over = (json?.findings ?? []).filter((finding) => finding.code === "doc-over-budget" && path.resolve(fx.project, finding.path) === path.join(fx.s04.dir, EXAMPLES_DOC));
      assert.equal(over.length, 1, JSON.stringify(json?.findings));
      assert.match(over[0].message, /EXAMPLES\.md is 51 lines, over the 50-line budget/);
    }),
  },
  {
    name: "examples/135-01 01 the continue door still refuses the story",
    run: () => withSeventwo(ON.work.examples, async (fx) => {
      const door = fx.cli("work", "continue", "7/2", "--json");
      assert.equal(door.json?.code, "examples-question-open", door.stdout || door.stderr);
      const { error } = await inProcessContinue(fx, "7/2");
      assert.equal(error?.code, "examples-question-open");
      assert.equal(error?.status, 409);
      assert.deepEqual(error.detail.findings.map((finding) => finding.code).sort(), ["example-provenance-unanchored", "example-question-open"]);
    }),
  },
  {
    name: "examples/135-01 01 a person's tokened answer is still stamped onto the run at settle",
    run: () => withSeventwo(ON.work.examples, async (fx) => {
      const sessionId = "sess-7-2";
      const run = await startRun(fx.s04, { sessionId, now: AT });
      await mkdir(fx.projectsDir, { recursive: true });
      await writeFile(path.join(fx.projectsDir, `${sessionId}.jsonl`), answeredTranscript(sessionId, "7/2 Q1 · Does a reserved book count?", "No."), "utf8");
      await completeRun(fx.s04, { runId: run.runId, outcome: "done", now: AT, projectsDir: fx.projectsDir });
      const record = (await readRuns(fx.s04)).find((entry) => entry.runId === run.runId);
      assert.deepEqual((record.brief?.answers ?? []).map((answer) => answer.token), ["7/2 Q1"]);
    }),
  },
  {
    name: "examples/135-01 01 off is still today (outline: 3 settings)",
    run: async () => {
      for (const [label, examples] of [["absent", ABSENT], ['{ "enabled": false }', { enabled: false }], ['{ "enabled": "true" }', { enabled: "true" }]]) {
        await withSeventwo(examples, async (fx) => {
          const { json } = fx.cli("work", "doctor", "7/2", "--json");
          assert.deepEqual((json?.findings ?? []).filter((finding) => finding.code.startsWith("example-")), [], label);
          const door = fx.cli("work", "continue", "7/2", "--json");
          assert.notEqual(door.json?.code, "examples-question-open", `${label}: ${door.stdout || door.stderr}`);
        });
      }
    },
  },
];

// 135/01's Background, on story 04's fixture renumbered to milestone 7 and story 2.
const SEVEN_TWO_MAP = mapOf(R(1, E(1), E(2, "[confirmed]")), QUESTIONS(Q(1, "business", "open")));
async function withSeventwo(examples, body) {
  return withExamplesProject({ ...(examples === ABSENT ? {} : { examples }), milestone: "7", story: "2" }, async (fx) => {
    assert.equal(fx.s04.ref, "7/2");
    await fx.writeMap(fx.s04, SEVEN_TWO_MAP);
    return body(fx);
  });
}

// The continue door in process, for the status code the CLI's envelope leaves out.
async function inProcessContinue(fx, ref) {
  const workspace = await _aofApplication.loadWorkspace(fx.project, undefined, { env: fx.env });
  try {
    return { result: await _aofApplication.invoke("work:continue", { ref }, { workspace, globalWorkStoreOptions: { env: fx.env }, effectsJournalOptions: { env: fx.env } }) };
  } catch (error) {
    return { error };
  }
}

// A transcript in 134/RESEARCH R1's line shapes: the asking `tool_use` and the harness's answer.
function answeredTranscript(sessionId, question, text) {
  const id = "toolu_seven_two";
  return [
    JSON.stringify({ type: "assistant", sessionId, timestamp: AT, message: { role: "assistant", content: [{ type: "tool_use", id, name: "AskUserQuestion", input: { questions: [{ question, header: "Q", options: [{ label: "a", description: "a" }], multiSelect: false }] } }] } }),
    JSON.stringify({ type: "user", sessionId, timestamp: AT, entrypoint: "cli", message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: "answered" }] }, toolUseResult: { questions: [{ question }], answers: { [question]: text } } }),
  ].join("\n") + "\n";
}

// Exported for FF-13403 and the door's suite, which judge the same fixture: the mtime pin.
export async function pinMtimes(dir, at) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) await pinMtimes(target, at);
    await utimes(target, at, at);
  }
}
