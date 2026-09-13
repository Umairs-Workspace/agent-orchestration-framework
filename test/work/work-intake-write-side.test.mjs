// Traceability wiring for milestone 127 / story 02 / task 04 —
//   wiki/work/127_milestone_backlog-and-archive/stories/02_story_promote-mints-the-number/
//     tasks/04_intake-is-the-write-side-default.feature
//
// TWO of that task's scenarios live here, and they are the two that need a STREAM rather than a
// config:
//
//  (a) A PHASE DOOR REFUSES A BACKLOG REF (ADR-003 §1, ADR-005 §2). `aof work refine|continue|
//      verify <ref>` decides WHERE a phase runs and may dispatch it to a worker. A number is
//      minted by ONE verb, where the operator is — a promote inside a dispatched run would mint
//      from the worker's copy of the stream, and two nodes can mint the same number. So a ref that
//      resolves, through the door's OWN exact resolver, to a row with `number: null` is refused up
//      front as `phase-backlog-ref` (409), before the overlay is read, before a status moves and
//      before an assignment exists. The door's resolution stays EXACT: `DELTA`, `delt` and
//      `ideas/delta` are no row's ref and answer exactly as they did before this story.
//  (b) THE READ SIDE ANSWERS THE SAME under `work.intake: "backlog"`, under `"stream"` and when the
//      key is absent (ADR-005 §2, the leg FF-12704 holds textually): list / find / next / validate
//      over three copies of the same tree, byte-identical `dir` values aside.
//
// THE OTHER HALVES OF THE TASK ARE ELSEWHERE, deliberately: the WRITE (`work.intake` into a config
// `init-config` CREATES, the `intakeWritten` envelope) is asserted beside chore 51's own engine in
// `test/work/work-init-config.test.mjs`; `promote`'s one read of the key (its refusal text) is
// driven in the story's promote suite; the textual allow-list is FF-12704.
//
// THE FIXTURE IS IMPORTED, never re-spelled: `buildThreeRootFixture` / `withThreeRoots` are 127/01's
// (test/work/stream/work-backlog-archive-enumerate.test.mjs), so the door and the read side are
// driven over THE three-root tree the whole milestone reasons about.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { invoke } from "../../src/command-core.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { spawnCliSync } from "../support/cli-spawn.mjs";
import { buildThreeRootFixture, withThreeRoots } from "./stream/work-backlog-archive-enumerate.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

const DOOR_CODE = "phase-backlog-ref";
// A ref no root has ever held — the CONTROL for "answers exactly as before this story". The door's
// answer for a near-miss ref (`DELTA`, `delt`, `ideas/delta`) must be the answer for ANY text that
// resolves to no row, which is the observable form of "this story added no rule for it".
const UNKNOWN_CONTROL = "zzz-no-such-row";

function runCli(root, args) {
  const result = spawnCliSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

const doorEnvelope = async (root, phase, ref) => {
  const workspace = await loadWorkspace(root);
  return invoke(`work:${phase}`, { ref }, { workspace });
};

// The refusal, as data: the code, the 409 and the one sentence. Returned rather than asserted so a
// caller can also read the message.
async function doorRefusal(root, phase, ref) {
  try {
    const answer = await doorEnvelope(root, phase, ref);
    return { refused: false, answer };
  } catch (error) {
    return { refused: true, code: error?.code ?? null, status: error?.status ?? null, message: error?.message ?? "" };
  }
}

// `work.intake` written into the fixture's own config (the three copies of scenario (b)). `null`
// leaves the key ABSENT, which is the row that matters most — it reads as "stream".
async function setIntake(root, value) {
  const configPath = path.join(root, ".aof", "aof.config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  if (value == null) delete config.work.intake;
  else config.work.intake = value;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

// Every answer, with the one difference the scenario allows — the fixture's own root — folded out.
// A STRING comparison, because "byte-identical" is the claim.
function normalise(root, value) {
  const forward = root.split(path.sep).join("/");
  return JSON.stringify(value, null, 2)
    .split(JSON.stringify(root).slice(1, -1)).join("<ROOT>")
    .split(forward).join("<ROOT>")
    .split(root).join("<ROOT>");
}

// The five read answers of scenario (b), through the registered commands (never a second walk).
async function readAnswers(root) {
  const workspace = await loadWorkspace(root);
  const ctx = { workspace };
  return {
    list: await invoke("work:list", {}, ctx),
    findGamma: await invoke("work:find", { query: "gamma" }, ctx),
    findFive: await invoke("work:find", { query: "05" }, ctx),
    next: await invoke("work:next", {}, ctx),
    validate: await invoke("work:validate", {}, ctx),
  };
}

export const workIntakeWriteSideTests = [
  // ==========================================================================
  // Scenario: a phase door refuses a backlog ref before it decides where to run
  // ==========================================================================
  {
    name: "work/intake 127/02: `aof work refine delta --json` is refused phase-backlog-ref naming `aof work promote delta`, exits 1 through the generic face, and the backlog doc is untouched; continue/verify refuse the same; a numbered ref is unchanged",
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        const specPath = path.join(work, "backlog", "ideas", "milestone_delta", "SPEC.md");
        const before = await readFile(specPath, "utf8");

        const refused = runCli(root, ["work", "refine", "delta", "--json"]);
        assert.equal(refused.status, 1, "the refusal exits 1 through the generic face");
        const envelope = JSON.parse(refused.stdout);
        assert.equal(envelope.ok, false);
        assert.equal(envelope.code, DOOR_CODE, "the code is phase-backlog-ref");
        assert.match(envelope.error, /`aof work promote delta`/u, "the message names the one verb that mints");
        assert.match(envelope.error, /is a backlog item/u);
        assert.match(envelope.error, /a mint is never dispatched/u);

        // Nothing moved: no overlay read, no status move, no assignment — the doc is byte-identical.
        assert.equal(await readFile(specPath, "utf8"), before, "the backlog record doc is byte-identical");
        assert.match(before, /status: not-started/u, "…and it still reads status: not-started");

        // The other two doors, same code.
        for (const [phase, ref] of [["continue", "gamma"], ["verify", "epsilon"]]) {
          const answer = await doorRefusal(root, phase, ref);
          assert.equal(answer.refused, true, `work:${phase} ${ref} is refused`);
          assert.equal(answer.code, DOOR_CODE, `work:${phase} ${ref} carries the same code`);
          assert.equal(answer.status, 409, "…as a 409");
          assert.match(answer.message, new RegExp(`\`aof work promote ${ref}\``, "u"));
        }

        // And a NUMBERED ref answers exactly as before this story.
        const numbered = runCli(root, ["work", "refine", "10", "--json"]);
        assert.equal(numbered.status, 0, "a numbered ref is not refused");
        const answer = JSON.parse(numbered.stdout);
        assert.equal(answer.where, "local");
        assert.equal(answer.command, "/aof:refine 10");
      }),
  },

  // ==========================================================================
  // Scenario: the door is refused even when the slug also matches a live item by
  // substring — the EXACT-slug backlog row is what the ref names
  // ==========================================================================
  {
    name: "work/intake 127/02: with a live 13_milestone_delta-lake beside it, `work:refine delta` is still refused phase-backlog-ref — the exact-slug backlog row is what the ref names",
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        const live = path.join(work, "13_milestone_delta-lake");
        await mkdir(live, { recursive: true });
        await writeFile(
          path.join(live, "SPEC.md"),
          [
            "---",
            "type: milestone",
            "number: 13",
            "slug: delta-lake",
            'title: "Delta lake"',
            "status: not-started",
            "created: 2026-09-11",
            "updated: 2026-09-11",
            "schema: 1",
            "---",
            "# 13 · Delta lake",
            "",
          ].join("\n"),
          "utf8",
        );

        // The live row matches `delta` by SUBSTRING; the backlog row matches it EXACTLY.
        const rows = await invoke("work:find", { query: "delta" }, { workspace: await loadWorkspace(root) });
        assert.deepEqual(rows.rows.map((row) => row.ref).sort(), ["13", "delta"], "both rows match the free text");

        const answer = await doorRefusal(root, "refine", "delta");
        assert.equal(answer.refused, true);
        assert.equal(answer.code, DOOR_CODE);
        assert.match(answer.message, /`aof work promote delta`/u);
      }),
  },

  // ==========================================================================
  // Scenario Outline: the door refuses exactly the refs that resolve, exactly,
  // to a backlog row — every Examples row
  // ==========================================================================
  ...[
    { door: "continue", ref: "epsilon", expect: "refused", why: "a leaf two groups deep, through the door a spike has instead of refine" },
    { door: "verify", ref: "gamma", expect: "refused", why: "the third door" },
    { door: "refine", ref: "DELTA", expect: "as-before", why: "the door resolves EXACTLY — DELTA is no row's ref" },
    { door: "refine", ref: "delt", expect: "as-before", why: "a substring is not an exact ref" },
    { door: "refine", ref: "ideas/delta", expect: "as-before", why: "a group path is not a ref" },
    { door: "continue", ref: "10/00", expect: "local", why: "a story ref is a live row" },
    { door: "verify", ref: "10/00-00", expect: "local", why: "a span is live scope, never a backlog row" },
    { door: "refine", ref: "05", expect: "local", why: "an archived ref is numbered — this story adds no rule for it" },
    { door: "refine", ref: "12", expect: "as-before", why: "a number nothing holds resolves to no row, and no row is not a backlog row" },
    { door: "refine", ref: "nothing-here", expect: "as-before", why: "unknown free text resolves to no row" },
  ].map(({ door, ref, expect, why }) => ({
    name: `work/intake 127/02: the door refuses exactly the backlog refs — \`work:${door} ${ref}\` ${expect === "refused" ? "is refused phase-backlog-ref" : expect === "local" ? "answers where local, as before" : "answers exactly as any unresolvable ref does"} (${why})`,
    run: () =>
      withThreeRoots({}, async ({ root }) => {
        const answer = await doorRefusal(root, door, ref);

        if (expect === "refused") {
          assert.equal(answer.refused, true, `${ref} IS a backlog row's ref`);
          assert.equal(answer.code, DOOR_CODE);
          assert.match(answer.message, new RegExp(`\`aof work promote ${ref}\``, "u"));
          return;
        }

        assert.equal(answer.refused, false, `${ref} is not a backlog row's ref, so the new rule does not meet it`);
        assert.equal(answer.answer.where, "local", "the door's own answer, unchanged");
        assert.equal(answer.answer.command, `/aof:${door} ${ref}`);

        if (expect !== "as-before") return;
        // "Exactly as before this story", as a property rather than a remembered literal: a
        // near-miss ref answers what ANY ref resolving to no row answers. The control is run in
        // its OWN copy of the fixture so the two calls cannot see each other's writes.
        const control = await withThreeRoots({}, ({ root: other }) => doorEnvelope(other, door, UNKNOWN_CONTROL));
        assert.deepEqual(
          answer.answer,
          { ...control, ref, command: `/aof:${door} ${ref}` },
          `${ref} answers exactly as an unknown ref does — the door learned no rule for it`,
        );
      }),
  })),

  // ==========================================================================
  // Scenario: the read side answers the same under either setting and when the
  // key is absent (ADR-005 §2)
  // ==========================================================================
  {
    name: "work/intake 127/02: over three copies of the three-root fixture (intake absent, \"stream\", \"backlog\") list/find gamma/find 05/next/validate answer byte-identically — the read side is mode-less",
    run: async () => {
      const copies = [];
      try {
        for (const intake of [null, "stream", "backlog"]) {
          const built = await buildThreeRootFixture({});
          await setIntake(built.root, intake);
          copies.push({ intake, ...built });
        }

        const baseline = copies[0];
        const baselineAnswers = normalise(baseline.root, await readAnswers(baseline.root));

        // Non-vacuity: the baseline really does carry the backlog rows, a backlog gamma and an
        // archived 05 — an answer that held none of those would compare equal for nothing.
        assert.match(baselineAnswers, /"ref": "gamma"/u, "the backlog rows are in the answer");
        assert.match(baselineAnswers, /"number": null/u, "…as backlog rows (number: null)");
        assert.match(baselineAnswers, /"archived": true/u, "…and the archived row resolves too");

        for (const copy of copies.slice(1)) {
          assert.equal(
            normalise(copy.root, await readAnswers(copy.root)),
            baselineAnswers,
            `work.intake: ${JSON.stringify(copy.intake)} answers exactly as an absent key does (dir values aside) — no reader branches on the setting`,
          );
        }
      } finally {
        for (const copy of copies) await rm(copy.root, { recursive: true, force: true });
      }
    },
  },
];
