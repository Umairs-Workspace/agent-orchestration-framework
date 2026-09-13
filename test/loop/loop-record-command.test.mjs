// Traceability wiring for milestone 78 / story 02 — the record command: a read face, one door to
// disk, and a signature that survives.
//
// Covers EVERY @executable scenario in
//   wiki/work/78_milestone_loop-execution-record/stories/02_story_the-record-command/tasks/00_the-read-face.feature
//   wiki/work/78_milestone_loop-execution-record/stories/02_story_the-record-command/tasks/01_the-writer.feature
// (task 02's registration/deferral scenarios are mechanised by FF-7807's gate,
// `test/arch/loop/acd-loop-record-board-deferred.test.mjs`, and by the two frozen-list controls it reads.)
//
// It exercises the REAL `src/commands/loop-record.mjs` against a temp fixture project (mkdtemp →
// build a registry, an item and its run records → run → rm in finally), through the REAL
// `loadWorkspace` and the REAL ref resolver, so the configured `work.dir` and the item's own
// `runs/` directory are genuinely read rather than assumed. One test object per @executable
// scenario, each name tracing to feature + scenario. node:assert/strict.
//
// EVERY "TOUCHES NOTHING" CLAIM IS A TREE SNAPSHOT, never a trust of the flag: a writer that
// ignored `--write` would pass a narrower check. `snapshot` is imported from story 79's fixture
// rather than re-authored — one home for "every file below here, keyed by path, valued by content".
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadWorkspace } from "../../src/work.mjs";
import {
  EXECUTION_RECORD_BASENAME,
  SIGNOFF_DIVIDER,
  SIGNOFF_HEADER,
  SIGNOFF_HEADING,
  SIGNOFF_PLACEHOLDER,
  loopRecordCommand,
} from "../../src/commands/loop-record.mjs";
import { spawnCliSync } from "../support/cli-spawn.mjs";
import { record, snapshot, writeRegistry } from "../support/loop-document-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

// ---------------------------------------------------------------- the fixture ----

// THE ITEM UNDER TEST IS A MILESTONE, and its ref is what the command is handed. `runs/` sits inside
// the item's own folder (19/ADR-002), which is also where `EXECUTION.md` lands — so the write-scope
// claim and the read are about the same directory, as they are in production.
export const ITEM_REF = "03";
const ITEM_DIR = "03_milestone_board";

// THE FIXTURE REGISTRY, and its ceilings are the reason it is not story 79's. That module's `loop()`
// spells `ceiling: [uncapped]` — an INLINE LIST — and the loader admits a sentinel ceiling only as a
// SCALAR (`src/work/loops.mjs`: an inline `ceiling` entry goes through `pointerField`, so a bare word
// there is a bad value and the field is never parsed at all). A fixture built on it therefore carries
// loop records with NO ceiling, which the projection reports as `unknown` — and every ceiling
// assertion over it would pass for the wrong reason. That is m77/R8 exactly ("the fixture was written
// against a belief about the loader"), so the shapes here are PINNED by
// `loopRecordFixtureShapeTests` below rather than believed.
//
// The two loops declare two DIFFERENT ceiling states on purpose (ADR-004): a `config:` pointer that
// resolves to a real bound, and the `uncapped` sentinel. A capped loop and an uncapped one must not
// produce the same record, so the fixture must be able to tell them apart.
const CEILING_KEY = "work.loop.buildNoProgressRounds";
// The number that key resolves to for a config that does not set it — the bound the machinery would
// really enforce, which is what the projection reports (`src/loop-bounds.mjs` owns it, and the pin
// below asserts this constant against that resolver rather than trusting the literal).
export const CEILING_BOUND = 2;

const loop = (id, title, extra = {}) => record({
  id,
  kind: "loop",
  title,
  controlled: "the fixture's controlled variable",
  reference: ["prose:docs/fixture.md"],
  measurement: ["prose:docs/fixture.md"],
  actuator: ["prose:docs/fixture.md"],
  cadence: "event:per-phase",
  owner: "actor:operator",
  optimizing: "true",
  layer: "operational",
  ...extra,
});

// The record FILENAME must be the id's local part (`loop-id-mismatch`), which is why these keys are
// spelled the way they are.
export const RECORDS = {
  "operator.md": record({ id: "actor:operator", kind: "actor", title: "Operator", ground: "exogenous", "target-setting": ["loop:build-to-green"] }),
  "build-to-green.md": loop("loop:build-to-green", "Build to green", { ceiling: [`config:${CEILING_KEY}`] }),
  "review-fix.md": loop("loop:review-fix", "Review, fix, re-review", { ceiling: "uncapped" }),
};

// The `brief.loop` envelope, in the shape `buildLoopDeclaration` mints — plus the `id` the producer
// does NOT yet write (the join hole recorded in 78/STATE.md), which the projection requires. Named
// here so the gap stays visible in the fixture rather than hidden behind a passing test.
export const declaration = ({ id, loopRunId, phase = "continue", cycle = 1, startedAt = "2026-09-01T00:00:00.000Z", ...rest }) => ({
  loopRunId,
  id,
  scope: ITEM_REF,
  level: "L1",
  cap: 3,
  phase,
  cycle,
  startedAt,
  ...rest,
});

// A run record in the shape `run-store.mjs` writes, which is the shape `readRuns` normalises.
export const runRecord = ({ runId, createdAt, loop = null, state = "done", outcome = "done", failureReason = null, retryOf = null, attempt = 1 }) => ({
  runId,
  itemRef: ITEM_REF,
  state,
  attempt,
  outcome,
  sessionId: null,
  brief: loop ? { loop } : {},
  createdAt,
  updatedAt: createdAt,
  failureReason,
  heartbeatAt: null,
  retryOf,
  reclaimedAt: null,
  node: "test-node",
});

// Two engagements of two different loops, so the ordinary fixture exercises a multi-row sign-off
// block. `loop:build-to-green` runs three cycles; `loop:review-fix` runs one.
export const ENGAGED_RUNS = [
  runRecord({ runId: "lr-a-0000", createdAt: "2026-09-01T00:00:00.000Z", loop: declaration({ id: "loop:build-to-green", loopRunId: "lr-a", cycle: 1 }) }),
  runRecord({ runId: "lr-a-0001", createdAt: "2026-09-01T00:01:00.000Z", loop: declaration({ id: "loop:build-to-green", loopRunId: "lr-a", cycle: 2 }) }),
  runRecord({ runId: "lr-a-0002", createdAt: "2026-09-01T00:02:00.000Z", loop: declaration({ id: "loop:build-to-green", loopRunId: "lr-a", cycle: 3 }) }),
  runRecord({ runId: "lr-b-0000", createdAt: "2026-09-01T01:00:00.000Z", loop: declaration({ id: "loop:review-fix", loopRunId: "lr-b", phase: "verify" }) }),
];

// Run records carrying NO declaration — the ordinary case in this repository today (0 of 61 run
// records carry `brief.loop`), and therefore the case the zero-coverage scenarios are about.
export const BARE_RUNS = [
  runRecord({ runId: "20260901T000000000Z-0000", createdAt: "2026-09-01T00:00:00.000Z" }),
  runRecord({ runId: "20260901T000100000Z-0000", createdAt: "2026-09-01T00:01:00.000Z" }),
];

export async function seedRuns(repo, runs) {
  const dir = path.join(repo.itemDir, "runs");
  await rm(dir, { recursive: true, force: true });
  if (runs.length === 0) return dir;
  await mkdir(dir, { recursive: true });
  for (const record of runs) {
    await writeFile(path.join(dir, `${record.runId}.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  }
  return dir;
}

export async function makeRepo({ workDir = "./wiki/work", registry = RECORDS, runs = ENGAGED_RUNS } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-loop-record-"));
  const aofDir = path.join(root, ".aof");
  await mkdir(aofDir, { recursive: true });
  await writeFile(
    path.join(aofDir, "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: workDir } }, null, 2)}\n`,
    "utf8",
  );
  if (registry) await writeRegistry({ aofDir }, registry);

  const resolvedWorkDir = path.resolve(root, workDir);
  const itemDir = path.join(resolvedWorkDir, ITEM_DIR);
  await mkdir(itemDir, { recursive: true });
  // The item's OTHER record documents, so "only EXECUTION.md is written" is measured against a
  // folder that has something to leave alone.
  // SCHEMA-CURRENT ON PURPOSE. 78/03's contract asks that `aof work validate` be GREEN over a stream
  // whose only findings come from the loop-record lane, and a `schema: 0` record doc is a validate
  // finding of its own — so a fixture missing it would make that scenario assert against a red stream
  // for a reason having nothing to do with the lane.
  await writeFile(
    path.join(itemDir, "SPEC.md"),
    "---\ntype: milestone\nnumber: 03\nslug: board\nstatus: in-progress\ntitle: \"Board\"\ncreated: 2026-06-19\nupdated: 2026-06-19\nschema: 1\naofVersion: 0.1.0\n---\n# 03 · Board\n",
    "utf8",
  );
  await writeFile(path.join(itemDir, "STATE.md"), "# 03 · State\n", "utf8");
  await writeFile(path.join(itemDir, "VERIFICATION.md"), "# 03 · Verification\n\n## Accept decision\n\nOpen.\n", "utf8");
  await writeFile(path.join(resolvedWorkDir, "ROADMAP.md"), "# Roadmap\n", "utf8");

  const repo = { root, aofDir, workDir: resolvedWorkDir, itemDir, recordPath: path.join(itemDir, EXECUTION_RECORD_BASENAME) };
  await seedRuns(repo, runs);
  return repo;
}

export async function withRepo(options, fn) {
  const repo = await makeRepo(options);
  try {
    return await fn(repo);
  } finally {
    await rm(repo.root, { recursive: true, force: true });
  }
}

export const ctxFor = async (repo) => ({ workspace: await loadWorkspace(repo.root) });

const runCommand = async (repo, input) => await loopRecordCommand.run({ ref: ITEM_REF, ...input }, await ctxFor(repo));

// A signed row for a loop, in the frozen four-cell shape.
export const signedRow = (loop, signer = "Umami", date = "2026-09-03", verdict = "accepted") =>
  `| ${loop} | ${signer} | ${date} | ${verdict} |`;

// Replace one sign-off row (matched by its loop id) in a document's text — the way an operator
// signing the record by hand edits it.
export function signInPlace(text, loop, row = signedRow(loop)) {
  const lines = text.split("\n");
  const at = lines.findIndex((line) => line.startsWith(`| ${loop} |`));
  assert.notEqual(at, -1, `the document carries a sign-off row for ${loop}`);
  lines[at] = row;
  return lines.join("\n");
}

// The rendered sign-off rows of a document — the table lines beneath the frozen divider. ONE home,
// imported by FF-7804's gate rather than spelled a second time there: two readers of a frozen shape
// is how one of them ends up asserting against a stale idea of it.
export const signoffRowsOf = (text) => {
  const lines = text.split("\n");
  return lines.slice(lines.indexOf(SIGNOFF_DIVIDER) + 1).filter((line) => line.startsWith("|"));
};

// THE FIXTURE PIN (m77/R8, and 78/00's own suite carries the same guard for the same reason). Two of
// five fixture rows in an earlier milestone passed for the wrong reason because the fixture was
// written against a BELIEF about the loader; the belief that bit this story was that a sentinel
// ceiling may be spelled as an inline list. So the registry above is asserted against what the REAL
// `loadLoops` makes of it, before any behaviour is asserted over it.
export const loopRecordFixtureShapeTests = [
  {
    name: "loop-record-command/fixture the real loader parses this registry's two ceiling states",
    async run() {
      const { loadLoops } = await import("../../src/work/loops.mjs");
      const { LOOP_BOUND_CONFIG_RESOLVERS } = await import("../../src/loop-bounds.mjs");
      await withRepo({}, async (repo) => {
        const registry = await loadLoops((await ctxFor(repo)).workspace);
        assert.equal(registry.present, true, "the fixture registry is found where 53/07 puts one");
        const byId = new Map(registry.nodes.map((node) => [node.id, node]));
        assert.deepEqual([...byId.keys()].sort(), ["actor:operator", "loop:build-to-green", "loop:review-fix"]);

        // A `config:` POINTER, parsed as one — not silently dropped, which is the failure mode that
        // would make every ceiling assertion in this file vacuous.
        assert.deepEqual(byId.get("loop:build-to-green").fields.ceiling, [
          { key: "ceiling", raw: `config:${CEILING_KEY}`, kind: "pointer", pointer: { scheme: "config", operand: CEILING_KEY } },
        ]);
        // And the SENTINEL, parsed as its own kind.
        assert.deepEqual(byId.get("loop:review-fix").fields.ceiling, [{ key: "ceiling", raw: "uncapped", kind: "uncapped" }]);

        // No record is unparseable and no id mismatches its filename — the two errors a hand-built
        // registry fixture actually produces.
        const errors = registry.findings.filter((finding) => finding.severity === "error");
        assert.deepEqual(errors, [], `the fixture registry loads without error: ${JSON.stringify(errors)}`);

        // The bound this fixture's assertions quote is the resolver's own answer, not a literal
        // somebody copied out of `loop-bounds.mjs` and then let drift.
        assert.equal(LOOP_BOUND_CONFIG_RESOLVERS[CEILING_KEY]({ config: {} }), CEILING_BOUND);
      });
    },
  },
];

export const loopRecordCommandTests = [
  // ===========================================================================
  // 00_the-read-face.feature — resolve, project, emit, touch nothing
  // ===========================================================================
  {
    name: "loop-record-command/00 the bare face emits the model and writes nothing",
    async run() {
      await withRepo({}, async (repo) => {
        const before = await snapshot(repo.root);
        const result = await runCommand(repo, {});

        // THE EXECUTION MODEL IS EMITTED — the engagements, not merely a document that mentions
        // them: this is the `--json` contract the SPEC binds to the milestone-08 spine, and the
        // rendered markdown is a face over it.
        assert.deepEqual(result.engagements.map((engagement) => engagement.loop), ["loop:build-to-green", "loop:review-fix"]);
        assert.ok(result.text.includes("```mermaid"), "and the rendered document comes with it");
        assert.equal(result.written, false, "it reports that it wrote nothing");
        assert.deepEqual(await snapshot(repo.root), before, "no file under the item is created or modified");
      });
    },
  },
  {
    name: "loop-record-command/00 `--json` carries the model, the coverage and the gaps",
    async run() {
      await withRepo({}, async (repo) => {
        // Through the CLI's own json projection, so the assertion is about the document a consumer
        // actually receives rather than about the run() return it is derived from.
        const document = loopRecordCommand.cli.json(await runCommand(repo, {}));

        const build = document.engagements.find((engagement) => engagement.loop === "loop:build-to-green");
        assert.equal(build.cycles, 3, "each engagement carries its cycles");
        assert.equal(build.ceiling.state, "bounded", "its ceiling state");
        assert.equal(build.ceiling.bound, CEILING_BOUND, "resolved to the bound in effect");
        assert.equal(build.ceiling.comparison, "over", "and compared against it");
        assert.deepEqual(build.phases, ["continue"], "its phases");
        assert.equal(build.attempts, 3, "its attempts");
        assert.equal(build.outcome, "done", "and its outcome");

        // The OTHER engagement declares a different ceiling state, so the two are distinguishable —
        // ADR-004's requirement, exercised by the fixture rather than only by the renderer's own gate.
        assert.equal(document.engagements.find((engagement) => engagement.loop === "loop:review-fix").ceiling.state, "uncapped");

        assert.equal(document.coverage.runsFound, 4, "the join coverage names the runs found");
        assert.equal(document.coverage.runsCarryingDeclaration, 4, "and how many carried a declaration");

        // THE THREE GAP CLASSES, EACH UNDER ITS OWN KEY (ADR-005) — three and not one bucket
        // because they have three different remedies.
        assert.deepEqual(Object.keys(document.gaps), ["ran-undeclared", "declared-never-ran", "authority-unresolved"]);
      });
    },
  },
  {
    name: "loop-record-command/00 the zero-coverage answer is a successful answer",
    async run() {
      await withRepo({ runs: BARE_RUNS }, async (repo) => {
        // No throw IS the exit-0 claim at this layer; the CLI's own exit code is asserted as a real
        // subprocess in the byte-identity gate and the bijection control.
        const result = await runCommand(repo, {});
        assert.equal(result.coverage.runsFound, 2, "it reports the runs found");
        assert.equal(result.coverage.runsCarryingDeclaration, 0, "and zero carrying a declaration");
        assert.deepEqual(result.engagements, [], "and it reports no engagements");
        // ZERO IS A MEASUREMENT, NEVER AN ABSENCE (ADR-003): the document says so in words, so a
        // reader can tell it apart from a rendering that failed to run.
        assert.match(result.text, /2 runs found for this item, 0 carrying a loop declaration \(0%\)\./);
        assert.match(result.text, /^No loop ran for this item\.$/m);
      });
    },
  },
  {
    name: "loop-record-command/00 an item with no run records at all is still answerable",
    async run() {
      await withRepo({ runs: [] }, async (repo) => {
        await assert.rejects(stat(path.join(repo.itemDir, "runs")), "the item genuinely has no runs/ directory");
        const result = await runCommand(repo, {});
        assert.equal(result.coverage.runsFound, 0, "it reports zero runs found");
        assert.deepEqual(result.engagements, []);
      });
    },
  },
  {
    name: "loop-record-command/00 a ref that does not resolve is refused, and nothing is written",
    async run() {
      await withRepo({}, async (repo) => {
        const before = await snapshot(repo.root);
        await assert.rejects(
          runCommand(repo, { ref: "99" }),
          (error) => {
            assert.equal(error.code, "ref-not-found", "a TYPED error, not a bare throw");
            assert.match(error.message, /"99"/, "naming the unresolved ref");
            return true;
          },
        );
        assert.deepEqual(await snapshot(repo.root), before, "no file is created anywhere under the work directory");
      });
    },
  },
  {
    name: "loop-record-command/00 the registry is left byte-identical",
    async run() {
      await withRepo({}, async (repo) => {
        const registry = path.join(repo.aofDir, "loops");
        const before = await snapshot(registry);
        assert.ok(Object.keys(before).length > 0, "the fixture registry is non-vacuous");
        await runCommand(repo, {});
        assert.deepEqual(await snapshot(registry), before, "every file in the registry directory is byte-identical to before");
      });
    },
  },
  {
    name: "loop-record-command/00 the model reaches consumers through the command, never through the document",
    async run() {
      await withRepo({}, async (repo) => {
        // A rendered record on disk, then its FACT lines tampered with. The command's answer must be
        // unmoved by them — the model is projected from the run records every time, and the only
        // thing read back out of the document is the sign-off (FF-7805). A command that recovered a
        // fact from these bytes would report the tampered number.
        await runCommand(repo, { write: true });
        const tampered = (await readFile(repo.recordPath, "utf8"))
          .replace(/^- 4 runs found.*$/m, "- 999 runs found for this item, 999 carrying a loop declaration (100%).")
          .replace(/^- \*\*loop:build-to-green\*\*.*$/m, "- **loop:build-to-green** (`lr-a`) — 999 cycles, ceiling `none`; 1 attempt; in flight.");
        await writeFile(repo.recordPath, tampered, "utf8");

        const result = await runCommand(repo, {});
        assert.equal(result.coverage.runsFound, 4, "the facts come from the run records, not from the document");
        assert.equal(result.engagements.find((engagement) => engagement.loop === "loop:build-to-green").cycles, 3);
        assert.ok(!result.text.includes("999"), "and a regeneration re-derives every tampered line away");
      });
    },
  },

  // ===========================================================================
  // 01_the-writer.feature — one door, byte-identical regeneration, a surviving signature
  // ===========================================================================
  {
    name: "loop-record-command/01 `--write` creates the record in the item's own folder",
    async run() {
      await withRepo({}, async (repo) => {
        await assert.rejects(stat(repo.recordPath), "the item starts with no EXECUTION.md");
        const result = await runCommand(repo, { write: true });

        assert.equal(result.path, repo.recordPath, "the record lands in that item's own folder");
        assert.equal(await readFile(repo.recordPath, "utf8"), result.text, "its contents are the rendered document");
        // And it is the document for THIS item's execution model — not an empty or stale rendering.
        assert.match(result.text, /^item: 03$/m);
        assert.match(result.text, /^- 4 runs found for this item, 4 carrying a loop declaration \(100%\)\.$/m);
        assert.match(result.text, new RegExp(`^- \\*\\*loop:build-to-green\\*\\* \\(\`lr-a\`\\) — 3 cycles against a declared ceiling of ${CEILING_BOUND}, over the bound`, "m"));
        assert.match(result.text, /^- \*\*loop:review-fix\*\* \(`lr-b`\) — 1 cycle, ceiling `uncapped`/m);
        assert.ok(result.text.includes(SIGNOFF_HEADING), "and it carries the frozen sign-off block");
      });
    },
  },
  {
    name: "loop-record-command/01 regeneration on unchanged inputs is byte-identical",
    async run() {
      await withRepo({}, async (repo) => {
        const first = await runCommand(repo, { write: true });
        const second = await runCommand(repo, { write: true });
        assert.equal(await readFile(repo.recordPath, "utf8"), first.text, "the file's bytes are unchanged");
        assert.equal(second.text, first.text);
        assert.equal(second.changed, false, "and the writer reports honestly that nothing moved");
      });
    },
  },
  {
    name: "loop-record-command/01 regeneration is byte-identical across separate processes",
    async run() {
      await withRepo({}, async (repo) => {
        const env = { ...process.env, AOF_GLOBAL_HOME: repo.root };
        const bytes = [];
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const spawned = spawnCliSync(process.execPath, [cliPath, "work", "loop-record", ITEM_REF, "--write"], { cwd: repo.root, encoding: "utf8", env });
          assert.equal(spawned.status, 0, `process ${attempt} wrote it: ${spawned.stderr}`);
          bytes.push(await readFile(repo.recordPath, "utf8"));
        }
        assert.equal(bytes[1], bytes[0], "two fresh processes produce byte-identical records");
      });
    },
  },
  {
    name: "loop-record-command/01 a changed input changes the file, and only where the input changed",
    async run() {
      await withRepo({}, async (repo) => {
        const before = (await runCommand(repo, { write: true })).text;

        // A NEW RUN RECORD carrying a declaration lands for the item — a fourth cycle of the
        // engagement that was already there.
        await seedRuns(repo, [
          ...ENGAGED_RUNS,
          runRecord({ runId: "lr-a-0003", createdAt: "2026-09-01T00:03:00.000Z", loop: declaration({ id: "loop:build-to-green", loopRunId: "lr-a", cycle: 4 }) }),
        ]);
        const after = (await runCommand(repo, { write: true })).text;
        assert.notEqual(after, before, "the file differs");

        // AND THE DIFFERENCE IS CONFINED TO THE FACTS THAT CHANGED. Line-for-line, the only moved
        // lines are the coverage count and that one engagement's own line; the graph, the gap
        // sections and the sign-off block are untouched.
        const from = before.split("\n");
        const to = after.split("\n");
        assert.equal(from.length, to.length, "no line is added or removed");
        const moved = to.filter((line, index) => line !== from[index]);
        assert.equal(moved.length, 2, `exactly two lines moved: ${JSON.stringify(moved)}`);
        assert.match(moved[0], /^- 5 runs found for this item, 5 carrying a loop declaration \(100%\)\.$/);
        assert.match(moved[1], /^- \*\*loop:build-to-green\*\* \(`lr-a`\) — 4 cycles/);
        assert.equal(
          after.slice(after.indexOf(SIGNOFF_HEADING)),
          before.slice(before.indexOf(SIGNOFF_HEADING)),
          "and the sign-off block is byte-unchanged",
        );
      });
    },
  },
  {
    name: "loop-record-command/01 a signed row survives regeneration verbatim",
    async run() {
      await withRepo({}, async (repo) => {
        const written = (await runCommand(repo, { write: true })).text;
        // The operator's own hand-edit, with their own spacing: a writer that re-rendered the row
        // from parsed cells would normalise this and change bytes it promised not to touch.
        const row = "|  loop:build-to-green  |  Umair B.  |  2026-09-03  |  accepted  |";
        await writeFile(repo.recordPath, signInPlace(written, "loop:build-to-green", row), "utf8");

        const result = await runCommand(repo, { write: true });
        const rows = signoffRowsOf(result.text);
        assert.ok(rows.includes(row), `the signed row is present byte-identically, name, date and verdict included: ${JSON.stringify(rows)}`);
        assert.equal(result.signedCarried, 1, "and the writer reports carrying it forward");

        // EVERY OTHER LINE HAS BEEN RE-DERIVED — asserted by tampering with one of them first and
        // finding it restored, which a writer that merely left the whole file alone would fail.
        assert.equal(
          result.text.replace(row, `| loop:build-to-green | ${SIGNOFF_PLACEHOLDER} | ${SIGNOFF_PLACEHOLDER} | ${SIGNOFF_PLACEHOLDER} |`),
          written,
          "and the rest of the document is exactly the freshly derived rendering",
        );
      });
    },
  },
  {
    name: "loop-record-command/01 signatures survive even when the facts they signed have changed",
    async run() {
      await withRepo({}, async (repo) => {
        const written = (await runCommand(repo, { write: true })).text;
        await writeFile(repo.recordPath, signInPlace(written, "loop:build-to-green"), "utf8");

        // The engagement gains a cycle AFTER it was signed.
        await seedRuns(repo, [
          ...ENGAGED_RUNS,
          runRecord({ runId: "lr-a-0003", createdAt: "2026-09-01T00:03:00.000Z", loop: declaration({ id: "loop:build-to-green", loopRunId: "lr-a", cycle: 4 }) }),
        ]);
        const result = await runCommand(repo, { write: true });

        assert.ok(signoffRowsOf(result.text).includes(signedRow("loop:build-to-green")), "the signed row is still carried forward verbatim");
        assert.match(result.text, /^- \*\*loop:build-to-green\*\* \(`lr-a`\) — 4 cycles/m, "and the execution facts above it show the new cycle count");
      });
    },
  },
  {
    name: "loop-record-command/01 an unsigned row is re-derived rather than preserved",
    async run() {
      await withRepo({}, async (repo) => {
        const written = (await runCommand(repo, { write: true })).text;
        // A HALF-FILLED row is unsigned: a name and a date with no verdict is half a claim, and the
        // writer needs an unambiguous answer before it can decide what to preserve.
        await writeFile(repo.recordPath, signInPlace(written, "loop:review-fix", `| loop:review-fix | Umami | 2026-09-03 | ${SIGNOFF_PLACEHOLDER} |`), "utf8");

        // …and the OTHER engagement's runs leave the item, so its row has nothing left to be about.
        await seedRuns(repo, ENGAGED_RUNS.filter((record) => record.brief.loop.loopRunId === "lr-b"));
        const result = await runCommand(repo, { write: true });

        const rows = signoffRowsOf(result.text);
        assert.deepEqual(
          rows,
          [`| loop:review-fix | ${SIGNOFF_PLACEHOLDER} | ${SIGNOFF_PLACEHOLDER} | ${SIGNOFF_PLACEHOLDER} |`],
          "the half-filled row is re-derived from the model, and no stale unsigned row survives for an engagement that no longer exists",
        );
        assert.equal(result.signedCarried, 0, "nothing was carried forward, and the writer says so");
      });
    },
  },
  {
    name: "loop-record-command/01 nothing but the record is written",
    async run() {
      await withRepo({}, async (repo) => {
        const before = await snapshot(repo.root);
        await runCommand(repo, { write: true });
        const after = await snapshot(repo.root);

        const moved = Object.keys(after).filter((key) => after[key] !== before[key]).sort();
        const removed = Object.keys(before).filter((key) => !(key in after));
        assert.deepEqual(moved, [`wiki/work/${ITEM_DIR}/${EXECUTION_RECORD_BASENAME}`], "only EXECUTION.md is created or modified");
        assert.deepEqual(removed, [], "and nothing is removed");
        // The item's SPEC.md, STATE.md, VERIFICATION.md and runs/ are all present in the snapshot
        // above and all unmoved, which is what makes this assertion about a folder with something
        // in it to leave alone.
        assert.ok(Object.keys(before).some((key) => key.endsWith(`${ITEM_DIR}/VERIFICATION.md`)), "the fixture's other record docs are non-vacuous");
        assert.ok(!moved.some((key) => key.startsWith(".aof/loops/")), "no file under the loop registry directory is written");
      });
    },
  },
  {
    name: "loop-record-command/01 a malformed existing record refuses rather than silently discarding a signature",
    async run() {
      await withRepo({}, async (repo) => {
        const written = (await runCommand(repo, { write: true })).text;
        // The header row edited — the exact shape a hand-edit produces, and the one that would make
        // a loose parser drop the signature beneath it.
        const broken = written.replace(SIGNOFF_HEADER, "| loop | who | when | verdict |");
        await writeFile(repo.recordPath, broken, "utf8");

        await assert.rejects(
          runCommand(repo, { write: true }),
          (error) => {
            assert.equal(error.code, "loop-record-malformed", "a TYPED error");
            assert.match(error.message, new RegExp(EXECUTION_RECORD_BASENAME), "naming the document");
            assert.match(error.message, /table header row/, "and what could not be parsed");
            return true;
          },
        );
        assert.equal(await readFile(repo.recordPath, "utf8"), broken, "and the existing file is left untouched");
      });
    },
  },
  {
    name: "loop-record-command/01 `--write` reports what it did",
    async run() {
      await withRepo({}, async (repo) => {
        const created = loopRecordCommand.cli.json(await runCommand(repo, { write: true }));
        assert.equal(created.path, path.relative(process.cwd(), repo.recordPath), "the result names the path written");
        assert.equal(created.written, true);
        assert.equal(created.changed, true, "it reports that the file changed");
        assert.equal(created.signedCarried, 0, "and how many signed rows were carried forward");

        await writeFile(repo.recordPath, signInPlace(await readFile(repo.recordPath, "utf8"), "loop:review-fix"), "utf8");
        const signed = loopRecordCommand.cli.json(await runCommand(repo, { write: true }));
        assert.equal(signed.changed, false, "an unchanged regeneration reports changed:false");
        assert.equal(signed.signedCarried, 1, "and the carried-signature count is the real one");
        assert.match(loopRecordCommand.cli.render(signed), /1 signed row\(s\) carried forward\./, "and the human face says the same");
      });
    },
  },
];
