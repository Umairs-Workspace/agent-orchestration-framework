// STORY 74 — A REFUSED STATUS MOVE IS DATA, NOT A FAILURE (2026-08-20).
//
// THE DEFECT. The item-status door and the phase door disagreed about what a refusal is.
// The phase door (`startedHere`, src/commands/continue.mjs) treats it as DATA — it returns
// `{ statusMoved: false, statusCode }` and the act still succeeds, under a bound its own
// comment calls NEVER FATAL. The write door (`work:status`) throws: a
// `status-edge-not-applicable` is a 409 and a non-zero exit. Same refusal, two answers —
// and the refusal is the COMMON case on the path the prompts describe, because anything
// the phase door or the `run.started` reactor already started arrives at "mark it started"
// already started. So the only thing between an unattended run and a spurious failure was
// a sentence of prose telling the agent to carry on.
//
// What is proved here, in two groups:
//   (a) THE FLAG (task 00) — `--if-applicable` makes THAT refusal data (exit 0, a plain
//       statement of where the item already is, `{ moved: false, code, status, edges }`),
//       narrows EXACTLY that one code, leaves an applicable move untouched, and leaves the
//       bare verb throwing exactly as it does today.
//   (b) THE DOCUMENT'S OWN FAULT (task 01, finding F-73-G) — the three doc-shape faults get
//       their own `record-doc-unusable` code at the shared writer, so neither the flag nor
//       the two reactors' sanctioned no-ops can swallow a malformed record doc.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, unlink, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setItemStatus, rollbackItemStatus, loadWorkspace } from "../../src/work.mjs";
import { itemStatusEdges } from "../../src/acceptance-horizon.mjs";
import { transitionRunStart, transitionRunComplete } from "../../src/effects/run-transitions.mjs";
import { openEffectsJournal, readEvents } from "../../src/effects/journal.mjs";
import { invoke, getCommand } from "../../src/command-core.mjs";
import { runCommandFace } from "../../src/spine/face.mjs";
import { publishGlobalWorkSnapshot } from "../../src/global-work-publisher.mjs";

function specDoc(status) {
  return [
    "---",
    "type: milestone",
    "number: 70",
    "slug: lifecycle",
    'title: "Lifecycle"',
    `status: ${status}`,
    "updated: 2026-08-01",
    "created: 2026-08-01",
    "depends: []",
    "---",
    "# 70 · Lifecycle",
    "",
    "Body line one — must stay byte-identical.",
    "",
  ].join("\n");
}

function storyDoc(status) {
  return [
    "---",
    "type: story",
    "number: 00",
    "slug: lane",
    "parent: 70",
    'title: "Lane"',
    `status: ${status}`,
    "created: 2026-08-01",
    "updated: 2026-08-01",
    "---",
    "# 70/00 · Lane",
    "",
  ].join("\n");
}

// The hermetic fixture (the work-item-status-lifecycle discipline): its own
// AOF_GLOBAL_HOME, so the projection store AND the effects journal live under it and no
// lane ever writes into the real `~/.aof`.
async function buildFixture({ status = "not-started", storyStatus = "not-started" } = {}) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-status-if-applicable-")));
  const home = path.join(tmp, "home");
  const root = path.join(tmp, "repo");
  const aofDir = path.join(root, ".aof");
  const mDir = path.join(root, "wiki", "work", "70_milestone_lifecycle");
  const sDir = path.join(mDir, "stories", "00_story_lane");
  await mkdir(home, { recursive: true });
  await mkdir(aofDir, { recursive: true });
  await mkdir(sDir, { recursive: true });
  const configPath = path.join(aofDir, "aof.config.json");
  await writeFile(
    configPath,
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(path.join(mDir, "SPEC.md"), specDoc(status), "utf8");
  await writeFile(path.join(sDir, "STORY.md"), storyDoc(storyStatus), "utf8");
  const env = { AOF_GLOBAL_HOME: home };
  const workspace = await loadWorkspace(root, undefined, { env });
  return {
    root: tmp,
    env,
    configPath,
    workspace,
    ctx: { workspace, globalWorkStoreOptions: { env }, effectsJournalOptions: { env } },
    mDir,
    sDir,
    specPath: path.join(mDir, "SPEC.md"),
    storyPath: path.join(sDir, "STORY.md"),
    item: { ref: "70", dir: mDir, type: "milestone" },
    story: { ref: "70/00", dir: sDir, type: "story" },
  };
}

async function assertRejectsWithCode(fn, code) {
  let caught = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, `expected a thrown error with code "${code}"`);
  assert.equal(caught.code, code, `the error carries code "${code}" (got "${caught?.code}": ${caught?.message})`);
  return caught;
}

// The effects journal is the "did an announcement happen" oracle: a refused move must
// append NOTHING (facts precede announcements — a refusal is not a fact).
async function statusChangedEvents(env) {
  const journal = await openEffectsJournal({ env });
  try {
    return readEvents(journal, { name: "item-status.changed", limit: 50 });
  } finally {
    journal.close();
  }
}

// The face's exit-code + channel oracle. `runCommandFace` is the ONE place the exit code
// is decided (a throw ⇒ stderr + exit 1; a returned result ⇒ render + exit 0), so
// "exits 0" and "no error envelope" are only honestly assertable through it.
async function captureFace(args) {
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalExitCode = process.exitCode;
  console.log = (...parts) => logs.push(parts.join(" "));
  console.error = (...parts) => errors.push(parts.join(" "));
  let threw = null;
  let exitCode = 0;
  try {
    // CLEARED BEFORE THE RUN, and that is the fix rather than hygiene. The exit code a
    // command face sets is `process.exitCode` — a PROCESS GLOBAL — and this harness read
    // it after the call while only ever restoring it after. So it inherited whatever any
    // earlier test in the shared runner had left set: alone this row passed, and inside
    // the full suite it read `1 !== 0` for a command that had exited cleanly, blaming
    // the code under test for a neighbour's residue.
    process.exitCode = undefined;
    await runCommandFace(getCommand("work:status"), args);
    exitCode = process.exitCode ?? 0;
  } catch (error) {
    threw = error;
    exitCode = 1;
  } finally {
    console.log = originalLog;
    console.error = originalError;
    process.exitCode = originalExitCode;
  }
  return { logs, errors, threw, exitCode };
}

export const workItemStatusIfApplicableTests = [
  // ═════════════════════════════════════════════════════════════ (a) THE FLAG ══
  {
    name: "item-status/if-applicable: an inapplicable move reports where the item already is, moves nothing, and announces nothing",
    async run() {
      // Row 1 is THE case the prompts hit — already started by the phase door or the
      // run-mint reactor, so the self-edge is refused rather than re-written. The rest
      // prove the narrowing is the CODE's, not one hard-coded pair's.
      for (const [from, to] of [
        ["in-progress", "in-progress"],
        ["in-review", "in-review"],
        ["done", "in-progress"],
        ["not-started", "done"],
        ["in-review", "not-started"],
        ["blocked", "done"],
      ]) {
        const { root, env, ctx, storyPath } = await buildFixture({ storyStatus: from });
        try {
          const before = await readFile(storyPath, "utf8");
          const result = await invoke("work:status", { ref: "70/00", status: to, ifApplicable: true }, ctx);

          assert.equal(result.moved, false, `${from} → ${to}: the result says nothing moved`);
          assert.equal(result.status, from, "it reports the item's ACTUAL status");
          assert.equal(result.code, "status-edge-not-applicable", "it carries the refusal's code");
          assert.deepEqual(result.edges, itemStatusEdges(from), "it reports the legal moves from there");
          assert.equal(result.from, undefined, "no from-state is claimed — a from-state means a move happened");

          const rendered = getCommand("work:status").cli.render(result);
          assert.doesNotMatch(rendered, /→/, "the render does not claim a move was made");
          assert.match(rendered, new RegExp(`already ${from}`), "the render states where the item already is");

          assert.equal(await readFile(storyPath, "utf8"), before, "the record doc is byte-unchanged");
          assert.deepEqual(await statusChangedEvents(env), [], "no item-status.changed event was appended");
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "item-status/if-applicable: a refusal reports the writer's disk state when the cache-first resolver is stale",
    async run() {
      const fx = await buildFixture({ storyStatus: "not-started" });
      try {
        await writeFile(
          fx.configPath,
          `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, mesh: { enabled: true, nodeId: "control" } }, null, 2)}\n`,
          "utf8",
        );
        const workspace = await loadWorkspace(path.dirname(path.dirname(fx.configPath)), undefined, { env: fx.env });
        const ctx = { workspace, globalWorkStoreOptions: { env: fx.env }, effectsJournalOptions: { env: fx.env } };
        await publishGlobalWorkSnapshot(workspace, { globalWorkStoreOptions: { env: fx.env }, now: "2026-08-20T09:00:00.000Z" });
        await writeFile(fx.storyPath, storyDoc("done"), "utf8");

        const result = await invoke("work:status", { ref: "70/00", status: "in-progress", ifApplicable: true }, ctx);
        assert.equal(result.moved, false);
        assert.equal(result.status, "done", "the record doc value that refused the edge wins over cache not-started");
        assert.deepEqual(result.edges, itemStatusEdges("done"));
      } finally {
        await rm(fx.root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/if-applicable: --json reports the refusal as a RESULT and exits 0; the same run without the flag is an error envelope and exits 1",
    async run() {
      const { root, configPath } = await buildFixture({ storyStatus: "in-progress" });
      try {
        const withFlag = await captureFace(["70/00", "in-progress", "--if-applicable", "--json", "--config", configPath]);
        assert.equal(withFlag.threw, null, "the flagged run does not throw");
        assert.equal(withFlag.exitCode, 0, "the flagged run exits 0");
        assert.deepEqual(withFlag.errors, [], "no error envelope is emitted on stderr");
        assert.equal(withFlag.logs.length, 1, "exactly one document on stdout");
        const parsed = JSON.parse(withFlag.logs[0]);
        assert.equal(parsed.moved, false, "the JSON carries moved: false");
        assert.equal(parsed.code, "status-edge-not-applicable", "…and the refusal's code");
        assert.equal(parsed.status, "in-progress", "…and the item's current status");
        assert.deepEqual(parsed.edges, itemStatusEdges("in-progress"), "…and its legal moves");
        assert.equal(parsed.ok, undefined, "it is a result, not an { ok: false } envelope");

        // …and on the RENDER path, which is what an unattended shell actually runs: the
        // scenario's "the command exits 0" is about this face, not only the machine one.
        const rendered = await captureFace(["70/00", "in-progress", "--if-applicable", "--config", configPath]);
        assert.equal(rendered.exitCode, 0, "the plain (non --json) flagged run exits 0");
        assert.deepEqual(rendered.errors, [], "…and writes nothing to stderr");
        assert.equal(rendered.logs.length, 1, "…printing one line");
        assert.match(rendered.logs[0], /already in-progress/, "…stating where the item already is");
        assert.doesNotMatch(rendered.logs[0], /→/, "…and never claiming a move");

        const bare = await captureFace(["70/00", "in-progress", "--json", "--config", configPath]);
        assert.equal(bare.exitCode, 1, "without the flag the same refusal exits non-zero");
        const envelope = JSON.parse(bare.logs[0]);
        assert.equal(envelope.ok, false, "…and IS the error envelope");
        assert.equal(envelope.code, "status-edge-not-applicable");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/if-applicable: the flag changes nothing about a move that IS applicable",
    async run() {
      const { root, env, ctx, storyPath } = await buildFixture({ storyStatus: "not-started" });
      try {
        const result = await invoke(
          "work:status",
          { ref: "70/00", status: "in-progress", ifApplicable: true, now: "2026-08-20T10:00:00.000Z" },
          ctx,
        );
        assert.equal(result.moved, true, "the result carries moved: true");
        assert.equal(result.from, "not-started", "…and names the from-state it moved out of");
        assert.equal(result.status, "in-progress");
        assert.equal(result.code, undefined, "an applicable move carries no refusal code");

        const after = await readFile(storyPath, "utf8");
        assert.match(after, /^status: in-progress$/m, "the frontmatter status moved");
        assert.match(after, /^updated: 2026-08-20$/m, "its updated line carries the move's date");

        const events = await statusChangedEvents(env);
        assert.equal(events.length, 1, "item-status.changed is raised exactly as it is without the flag");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/if-applicable: without the flag the same refusal fails exactly as it does today",
    async run() {
      const { root, ctx, storyPath } = await buildFixture({ storyStatus: "in-review" });
      try {
        const before = await readFile(storyPath, "utf8");
        const error = await assertRejectsWithCode(
          () => invoke("work:status", { ref: "70/00", status: "not-started" }, ctx),
          "status-edge-not-applicable",
        );
        assert.match(error.message, /in-review/, "the refusal names the item's actual status");
        for (const edge of itemStatusEdges("in-review")) {
          assert.ok(error.message.includes(edge), `the refusal names the legal move "${edge}"`);
        }
        assert.equal(await readFile(storyPath, "utf8"), before, "the record doc is byte-unchanged");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/if-applicable: EVERY OTHER refusal still fails under the flag — the narrowing is one code, and no more",
    async run() {
      const { root, ctx, specPath, storyPath } = await buildFixture({ status: "in-progress", storyStatus: "not-started" });
      try {
        const specBefore = await readFile(specPath, "utf8");
        const storyBefore = await readFile(storyPath, "utf8");
        const rows = [
          // a word outside the lifecycle vocabulary
          [{ ref: "70/00", status: "started" }, "invalid-status"],
          // a ref that resolves to no item in this checkout
          [{ ref: "99/07", status: "in-progress" }, "ref-not-found"],
          // free text only the READ face's slug fallback would match — the write never does
          [{ ref: "lifecycle", status: "in-progress" }, "ref-not-found"],
        ];
        for (const [input, code] of rows) {
          await assertRejectsWithCode(() => invoke("work:status", { ...input, ifApplicable: true }, ctx), code);
        }
        assert.equal(await readFile(specPath, "utf8"), specBefore, "nothing on disk is changed");
        assert.equal(await readFile(storyPath, "utf8"), storyBefore, "nothing on disk is changed");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/if-applicable: the no-local-checkout refusal is not narrowed either — an item this node does not hold still fails under the flag",
    async run() {
      // 74/00's Examples name this refusal `no-local-checkout`; the code the door has
      // raised since m43/ADR-010 R6.4 is `item-not-local` (commands/resolve.mjs's
      // requireLocalCheckout). Same refusal, and the contract's requirement is what is
      // asserted here: it FAILS under the flag, writing nothing.
      const { requireLocalCheckout } = await import("../../src/commands/resolve.mjs");
      // The cache-answered row's shape (ADR-010/R6.4): resolvable, but `dir: null`.
      assert.throws(
        () => requireLocalCheckout({ ref: "70/00", dir: null, reportedBy: "aof-wsl" }, "70/00"),
        (error) => {
          assert.equal(error.code, "item-not-local", "the door's own no-local-checkout refusal");
          assert.notEqual(
            error.code,
            "status-edge-not-applicable",
            "…and it is NOT the one code the flag narrows, so no flag can swallow it",
          );
          return true;
        },
      );
    },
  },
  {
    name: "item-status/if-applicable: on the READ face the flag is inert — same answer, same render, nothing moved",
    async run() {
      const { root, ctx, storyPath } = await buildFixture({ storyStatus: "in-progress" });
      try {
        const before = await readFile(storyPath, "utf8");
        const plain = await invoke("work:status", { ref: "70/00" }, ctx);
        const flagged = await invoke("work:status", { ref: "70/00", ifApplicable: true }, ctx);
        assert.deepEqual(flagged, plain, "the read answers identically with and without the flag");
        const command = getCommand("work:status");
        assert.equal(command.cli.render(flagged), command.cli.render(plain), "…and renders identically");
        assert.equal(flagged.moved, undefined, "the read face claims no move either way");
        assert.equal(await readFile(storyPath, "utf8"), before, "nothing is moved");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/if-applicable: the flag is declared on the verb's own usage, discoverable without reading source",
    async run() {
      const spec = getCommand("work:status").cli.spec;
      const flag = spec.flags?.ifApplicable;
      assert.ok(flag, "--if-applicable is declared on work:status");
      assert.equal(flag.type, "boolean", "…as a boolean flag");
      assert.ok(typeof flag.description === "string" && flag.description.length > 0, "…with a description");
      assert.match(spec.usage, /--if-applicable/, "the usage line names it");
      assert.match(
        spec.usage,
        /<status>[^\]]*--if-applicable/,
        "…on the MOVE form (inside the optional <status> group), which is the only form it acts on",
      );
    },
  },

  // ══════════════════════════════════════════════ (b) THE DOCUMENT'S OWN FAULT ══
  {
    name: "item-status/record-doc: a doc-shape fault is refused record-doc-unusable on BOTH faces of the shared writer",
    async run() {
      // Each fault must be NAMED, not merely coded: "which fault it hit" is the difference
      // between a fixable report and a shrug.
      const faults = {
        absent: {
          apply: async (storyPath) => { await unlink(storyPath); },
          names: /absent or unreadable/,
        },
        "no frontmatter block": {
          apply: async (storyPath) => { await writeFile(storyPath, "# 70/00 · Lane\n\nno frontmatter here.\n", "utf8"); },
          names: /has no frontmatter block/,
        },
        "a comment before the frontmatter fence": {
          apply: async (storyPath) => {
            await writeFile(storyPath, `<!-- aof-generated: bundle -->\n${storyDoc("not-started")}`, "utf8");
          },
          names: /opens with something before the frontmatter fence/,
        },
      };
      const faces = {
        // The lifecycle face's own move, and the rollback face's — the fault is the
        // DOCUMENT's, so it cannot honestly borrow either caller's refusal vocabulary.
        "the lifecycle writer": (story) => setItemStatus(story, "in-progress"),
        "the rollback writer": (story) => rollbackItemStatus(story, "not-started"),
      };
      for (const [fault, { apply, names }] of Object.entries(faults)) {
        for (const [face, move] of Object.entries(faces)) {
          const { root, story, storyPath, specPath } = await buildFixture({ storyStatus: "in-progress" });
          try {
            await apply(storyPath);
            const docBefore = await readFile(storyPath, "utf8").catch(() => null);
            const specBefore = await readFile(specPath, "utf8");
            const error = await assertRejectsWithCode(() => move(story), "record-doc-unusable");
            assert.match(error.message, /70\/00/, `${face}/${fault}: the message names the item's ref`);
            assert.match(error.message, /STORY\.md/, `${face}/${fault}: …and the document it could not use`);
            assert.match(error.message, names, `${face}/${fault}: …and which fault it hit`);
            assert.equal(await readFile(storyPath, "utf8").catch(() => null), docBefore, "no status line is rewritten");
            assert.equal(await readFile(specPath, "utf8"), specBefore, "…and no OTHER item's is either");
          } finally {
            await rm(root, { recursive: true, force: true });
          }
        }
      }
    },
  },
  {
    name: "item-status/record-doc: an item type that carries no record doc at all is the same fault, not a lifecycle refusal",
    async run() {
      const { root, sDir } = await buildFixture();
      try {
        // `recordDoc` answers null for a type with no record doc — the third of the three
        // doc-shape faults the story names, and it must not wear the caller's code either.
        await assertRejectsWithCode(
          () => setItemStatus({ ref: "70/00/01", dir: sDir, type: "task" }, "in-progress"),
          "record-doc-unusable",
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/record-doc: a mint against an item TYPE that carries no record doc is skipped, not reported as a document fault",
    async run() {
      // The regression the narrowing would otherwise introduce. An adhoc top-level `task`
      // is a folder holding one `.feature` — "a task has no status field" (add-task) — so
      // there is no status to advance and no fault in there not being one. The writer is
      // still right to refuse; it is the REACTOR that was never owed the move.
      const { root, ctx, sDir } = await buildFixture();
      try {
        const task = { ref: "70/00/01", dir: sDir, type: "task" };
        const { record, effects } = await transitionRunStart(
          task,
          { sessionId: "sess-task", brief: {}, now: "2026-08-20T14:00:00.000Z" },
          { workspace: ctx.workspace, journalOptions: ctx.effectsJournalOptions, publisherOptions: ctx },
        );
        const advance = effects.find((effect) => effect.key === "advance-status");
        assert.equal(advance.status, "done", "the step completes — nothing was owed");
        assert.deepEqual(advance.detail, { skipped: true, reason: "type-has-no-record-doc" }, "…and says why");
        assert.equal(record.state, "running");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/record-doc: the lifecycle refusals keep their OWN codes, unchanged — the re-coding narrowed the fault OUT, it did not move the refusal",
    async run() {
      for (const [from, to, code] of [
        ["done", "in-progress", "status-edge-not-applicable"],
        ["in-progress", "in-progress", "status-edge-not-applicable"],
        ["not-started", "started", "invalid-status"],
      ]) {
        const { root, story, storyPath } = await buildFixture({ storyStatus: from });
        try {
          const before = await readFile(storyPath, "utf8");
          await assertRejectsWithCode(() => setItemStatus(story, to), code);
          assert.equal(await readFile(storyPath, "utf8"), before, `${from} → ${to}: the record doc is byte-unchanged`);
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "item-status/record-doc: a USABLE doc carrying no status line is still the lifecycle's refusal, not a doc fault (story 73's clause, unmoved)",
    async run() {
      const { root, story, storyPath } = await buildFixture();
      try {
        // Frontmatter present and parseable — the document is usable. A missing `status:`
        // simply has no legal from-state, which is the LIFECYCLE's answer.
        await writeFile(
          storyPath,
          ["---", "type: story", "number: 00", "parent: 70", "---", "# 70/00 · Lane", ""].join("\n"),
          "utf8",
        );
        const before = await readFile(storyPath, "utf8");
        await assertRejectsWithCode(() => setItemStatus(story, "in-progress"), "status-edge-not-applicable");
        assert.equal(await readFile(storyPath, "utf8"), before, "the record doc is byte-unchanged");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/record-doc: the run-mint reactor's sanctioned no-op stays narrow — a malformed doc is surfaced, not absorbed as idempotence",
    async run() {
      const { root, ctx, story, storyPath } = await buildFixture();
      try {
        await writeFile(storyPath, "# 70/00 · Lane\n\nno frontmatter here.\n", "utf8");
        const { record, effects } = await transitionRunStart(
          story,
          { sessionId: "sess-malformed", brief: {}, now: "2026-08-20T11:00:00.000Z" },
          { workspace: ctx.workspace, journalOptions: ctx.effectsJournalOptions, publisherOptions: ctx },
        );
        const advance = effects.find((effect) => effect.key === "advance-status");
        assert.ok(advance, "the run.started cascade still includes the advance-status step");
        assert.notEqual(
          advance.detail?.reason,
          "status-edge-not-applicable",
          "the fault is NOT reported as the sanctioned status-edge-not-applicable skip",
        );
        assert.equal(advance.status, "failed", "the fault is surfaced as a failed step");
        assert.match(String(advance.error), /record doc|STORY\.md/, "…naming the document that cannot be used");
        assert.equal(record.state, "running", "the mint itself is not failed by it");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/record-doc: a mint against a WELL-FORMED item already in-progress still reports the sanctioned skip",
    async run() {
      const { root, ctx, story, storyPath } = await buildFixture({ storyStatus: "in-progress" });
      try {
        const before = await readFile(storyPath, "utf8");
        const { effects } = await transitionRunStart(
          story,
          { sessionId: "sess-again", brief: {}, now: "2026-08-20T11:05:00.000Z" },
          { workspace: ctx.workspace, journalOptions: ctx.effectsJournalOptions, publisherOptions: ctx },
        );
        const advance = effects.find((effect) => effect.key === "advance-status");
        assert.equal(advance.status, "done", "ordinary idempotence is still a completed step");
        assert.deepEqual(
          advance.detail,
          { skipped: true, reason: "status-edge-not-applicable" },
          "…reported as the sanctioned skip",
        );
        assert.equal(await readFile(storyPath, "utf8"), before, "the record doc is byte-unchanged");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/record-doc: the failure rollback's sanctioned no-op stays narrow too",
    async run() {
      const { root, ctx, story, storyPath } = await buildFixture();
      try {
        const started = await transitionRunStart(
          story,
          { sessionId: "sess-rollback", brief: {}, now: "2026-08-20T12:00:00.000Z" },
          { workspace: ctx.workspace, journalOptions: ctx.effectsJournalOptions, publisherOptions: ctx },
        );
        // The doc goes missing between the mint and the failure — the fault the rollback
        // face used to absorb as `rollback-not-applicable`.
        await unlink(storyPath);
        const { effects } = await transitionRunComplete(
          story,
          { runId: started.record.runId, outcome: "failed", now: "2026-08-20T12:10:00.000Z" },
          { workspace: ctx.workspace, journalOptions: ctx.effectsJournalOptions, publisherOptions: ctx },
        );
        const rollback = effects.find((effect) => effect.key === "rollback-status");
        assert.ok(rollback, "the run.completed cascade includes the rollback-status step");
        assert.notEqual(rollback.detail?.reason, "rollback-not-applicable", "the fault is NOT the sanctioned skip");
        assert.equal(rollback.status, "failed", "the fault is surfaced");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/record-doc: a rollback against a WELL-FORMED item that is not in-progress still reports the sanctioned skip",
    async run() {
      const { root, ctx, story, storyPath } = await buildFixture();
      try {
        const started = await transitionRunStart(
          story,
          { sessionId: "sess-skip", brief: {}, now: "2026-08-20T13:00:00.000Z" },
          { workspace: ctx.workspace, journalOptions: ctx.effectsJournalOptions, publisherOptions: ctx },
        );
        // The mint started it; a judgement moved it on — so the rollback no longer applies.
        await writeFile(storyPath, storyDoc("in-review"), "utf8");
        const { effects } = await transitionRunComplete(
          story,
          { runId: started.record.runId, outcome: "failed", now: "2026-08-20T13:10:00.000Z" },
          { workspace: ctx.workspace, journalOptions: ctx.effectsJournalOptions, publisherOptions: ctx },
        );
        const rollback = effects.find((effect) => effect.key === "rollback-status");
        assert.equal(rollback.status, "done", "ordinary inapplicability is still a completed step");
        assert.deepEqual(rollback.detail, { skipped: true, reason: "rollback-not-applicable" }, "…the sanctioned skip");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/record-doc: --if-applicable does not swallow a doc fault",
    async run() {
      const { root, ctx, storyPath } = await buildFixture();
      try {
        // The known hand-authored trap: a leading `<!-- aof-generated: bundle -->` comment,
        // whose frontmatter parses as nothing at all.
        await writeFile(storyPath, `<!-- aof-generated: bundle -->\n${storyDoc("not-started")}`, "utf8");
        await assertRejectsWithCode(
          () => invoke("work:status", { ref: "70/00", status: "in-progress", ifApplicable: true }, ctx),
          "record-doc-unusable",
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
];
