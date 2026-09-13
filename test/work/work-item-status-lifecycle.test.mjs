// The ITEM STATUS LIFECYCLE (2026-08-16) — the forward half the stream never had.
//
// THE DEFECT. Nothing in the codebase could write a status forward: `rollbackItemStatus`
// wrote BACK on failure, `migrate` inferred one at import, and every other transition was
// prose in the command bundles ("set `STORY.md` frontmatter `status`: in-progress when
// build starts") filed under bookkeeping AFTER the process steps. So an item read
// `not-started` for the entire time it was being built — a lie the board, the fleet and
// `aof work next` all consumed — and the failure rollback was a permanent no-op, because it
// refuses any from-state that is not `in-progress` and nothing ever put an item there.
//
// What is proved here, in four groups:
//   (a) THE WRITER (work.mjs:setItemStatus) — every declared edge succeeds and touches only
//       `status` + `updated`; an undeclared edge, the self-edge an at-least-once redelivery
//       asks for, a `done` (terminal) from-state, an `expectFrom` miss and an unknown word
//       are each refused CODED, writing nothing.
//   (b) THE RUN MINT (effects/table.mjs's run.started reactor) — minting a run moves the
//       item to in-progress with no prose and no caller cooperation, and a second mint's
//       redelivery is idempotent. This is the automatic start.
//   (c) THE DOOR (work:status) — the read face reports status + legal moves; the write face
//       moves one edge, refuses an illegal one, and refuses a typo'd ref rather than
//       writing to a plausible neighbour.
//   (d) THE PHASE DOOR (work:continue/refine) — opening a LOCAL act starts the item, and
//       `verify` does not (its move is the acceptance judgement at the END of its phase).
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setItemStatus, rollbackItemStatus, loadWorkspace } from "../../src/work.mjs";
// The lifecycle TABLE lives with the frozen five words it keys on (ADR-009/F); work.mjs is
// the writer that imports it.
import { itemStatusEdges, ITEM_STATUS_EDGES } from "../../src/acceptance-horizon.mjs";
import { transitionRunStart } from "../../src/effects/run-transitions.mjs";
import { invoke } from "../../src/command-core.mjs";

// A multi-key record doc with `status` and `updated` as INTERIOR keys, so "only these two
// lines change" is exercised against neighbours on both sides.
function specDoc(status, { updated = "2026-08-01" } = {}) {
  return [
    "---",
    "type: milestone",
    "number: 70",
    "slug: lifecycle",
    'title: "Lifecycle"',
    `status: ${status}`,
    `updated: ${updated}`,
    "created: 2026-08-01",
    "depends: []",
    "---",
    "# 70 · Lifecycle",
    "",
    "Body line one — must stay byte-identical.",
    "Body line two.",
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

// A hermetic fixture: its own AOF_GLOBAL_HOME (the withItemLockFixture discipline — the
// projection store AND the effects journal live under it, so no lane ever writes into the
// real `~/.aof`), a real workspace, and a milestone with one story.
async function buildFixture({ status = "not-started", storyStatus = "not-started" } = {}) {
  // realpath the root: macOS's os.tmpdir() is a symlink, and a path-derived workspaceId
  // must agree with every other derivation of it.
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-status-lifecycle-")));
  const home = path.join(tmp, "home");
  const root = path.join(tmp, "repo");
  const aofDir = path.join(root, ".aof");
  const workDir = path.join(root, "wiki", "work");
  const mDir = path.join(workDir, "70_milestone_lifecycle");
  const sDir = path.join(mDir, "stories", "00_story_lane");
  await mkdir(home, { recursive: true });
  await mkdir(aofDir, { recursive: true });
  await mkdir(sDir, { recursive: true });
  await writeFile(
    path.join(aofDir, "aof.config.json"),
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
    workspace,
    // The command ctx every face gets from the registry, pinned at the fixture's home.
    ctx: { workspace, globalWorkStoreOptions: { env }, effectsJournalOptions: { env } },
    mDir,
    sDir,
    specPath: path.join(mDir, "SPEC.md"),
    storyPath: path.join(sDir, "STORY.md"),
    item: { ref: "70", dir: mDir, type: "milestone" },
    story: { ref: "70/00", dir: sDir, type: "story" },
  };
}

function frontmatterPairs(text) {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) return [];
  return block[1].split(/\r?\n/).map((line) => {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    return kv ? [kv[1], kv[2]] : ["", line];
  });
}

function bodyOf(text) {
  const block = text.match(/^---\r?\n[\s\S]*?\r?\n---/);
  return block ? text.slice(block[0].length) : text;
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
}

export const workItemStatusLifecycleTests = [
  // ══════════════════════════════════════════════════════════ (a) THE WRITER ══
  {
    name: "item-status/writer: every declared lifecycle edge succeeds, changing ONLY the status and updated lines",
    async run() {
      for (const [from, targets] of Object.entries(ITEM_STATUS_EDGES)) {
        for (const to of targets) {
          const { root, item, specPath } = await buildFixture({ status: from });
          try {
            const before = await readFile(specPath, "utf8");
            const result = await setItemStatus(item, to, { now: "2026-08-16T10:00:00.000Z" });
            assert.deepEqual(result, { ref: "70", status: to, from }, `${from} → ${to} returns the move`);

            const after = await readFile(specPath, "utf8");
            const beforePairs = frontmatterPairs(before);
            const afterPairs = frontmatterPairs(after);
            assert.equal(afterPairs.length, beforePairs.length, "no key is added or removed");
            for (const [index, [key, value]] of afterPairs.entries()) {
              const [beforeKey, beforeValue] = beforePairs[index];
              assert.equal(key, beforeKey, "key order is preserved");
              if (key === "status") assert.equal(value, to, "the status line carries the target");
              else if (key === "updated") assert.equal(value, "2026-08-16", "updated is stamped with the move's DATE");
              else assert.equal(value, beforeValue, `${key} is byte-unchanged`);
            }
            assert.equal(bodyOf(after), bodyOf(before), "the body is byte-unchanged");
            // Atomic write: no temp artefact is left behind.
            const leftovers = (await readdir(path.dirname(specPath))).filter((name) => name.includes(".tmp-"));
            assert.deepEqual(leftovers, [], "the write leaves no .tmp- artefact");
          } finally {
            await rm(root, { recursive: true, force: true });
          }
        }
      }
    },
  },
  {
    name: "item-status/writer: an undeclared edge, the self-edge and a done from-state are each refused status-edge-not-applicable, writing nothing",
    async run() {
      // not-started → in-review skips the build; done is terminal; the self-edge is what an
      // at-least-once redelivery asks for and is how idempotence is expressed.
      for (const [from, to] of [
        ["not-started", "in-review"],
        // The guard that matters: an item nobody started, and a blocked one, cannot be
        // accepted by a single move. (in-progress → done IS legal — a milestone, uat, spike
        // or chore is accepted without ever being authored `in-review`.)
        ["not-started", "done"],
        ["blocked", "done"],
        ["blocked", "in-review"],
        ["done", "in-progress"],
        ["done", "not-started"],
        ["in-progress", "in-progress"],
        ["done", "done"],
      ]) {
        const { root, item, specPath } = await buildFixture({ status: from });
        try {
          const before = await readFile(specPath, "utf8");
          await assertRejectsWithCode(() => setItemStatus(item, to), "status-edge-not-applicable");
          assert.equal(await readFile(specPath, "utf8"), before, `${from} → ${to} wrote nothing`);
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "item-status/writer: a word outside the lifecycle vocabulary is refused invalid-status, and the refusal names the legal values",
    async run() {
      const { root, item, specPath } = await buildFixture({ status: "not-started" });
      try {
        const before = await readFile(specPath, "utf8");
        let caught = null;
        try {
          await setItemStatus(item, "started");
        } catch (error) {
          caught = error;
        }
        assert.equal(caught?.code, "invalid-status");
        for (const word of ["not-started", "in-progress", "blocked", "in-review", "done"]) {
          assert.ok(caught.message.includes(word), `the refusal names "${word}"`);
        }
        assert.equal(await readFile(specPath, "utf8"), before, "an invalid target wrote nothing");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/writer: expectFrom narrows the door — a caller's act cannot drag an item back from a state it does not cover",
    async run() {
      // The run.started reactor's own bound: in-progress only from not-started|blocked, so a
      // mint against an item already in-review must not reopen it.
      const { root, item, specPath } = await buildFixture({ status: "in-review" });
      try {
        const before = await readFile(specPath, "utf8");
        await assertRejectsWithCode(
          () => setItemStatus(item, "in-progress", { expectFrom: ["not-started", "blocked"] }),
          "status-edge-not-applicable",
        );
        assert.equal(await readFile(specPath, "utf8"), before, "the expectFrom miss wrote nothing");
        // …while the SAME move without the narrowing is a declared edge and succeeds.
        await setItemStatus(item, "in-progress");
        assert.match(await readFile(specPath, "utf8"), /^status: in-progress$/m);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/writer: the rollback face keeps its hard bound — it cannot write forward, and its result contract is unchanged",
    async run() {
      const { root, item, specPath } = await buildFixture({ status: "in-progress" });
      try {
        await assertRejectsWithCode(() => rollbackItemStatus(item, "in-review"), "forbidden-rollback");
        await assertRejectsWithCode(() => rollbackItemStatus(item, "done"), "forbidden-rollback");
        assert.match(await readFile(specPath, "utf8"), /^status: in-progress$/m, "a forbidden target wrote nothing");
        const before = await readFile(specPath, "utf8");
        assert.deepEqual(await rollbackItemStatus(item, "not-started"), { ref: "70", status: "not-started" });
        // The rollback does NOT stamp `updated` (its "only the status field changes" bound).
        const after = await readFile(specPath, "utf8");
        assert.equal(after, before.replace("status: in-progress", "status: not-started"), "only the status line moved");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/writer: itemStatusEdges answers the legal moves, and done is terminal",
    async run() {
      assert.deepEqual(itemStatusEdges("not-started"), ["in-progress", "blocked"]);
      assert.deepEqual(itemStatusEdges("done"), [], "done is terminal");
      assert.deepEqual(itemStatusEdges(undefined), [], "an item with no status has no legal move");
      assert.deepEqual(itemStatusEdges("nonsense"), [], "an unknown status has no legal move");
    },
  },

  // ═══════════════════════════════════════════════════════ (b) THE RUN MINT ══
  {
    name: "item-status/run-mint: minting a run moves its item not-started → in-progress through the ledger, with no caller cooperation",
    async run() {
      const { root, ctx, story, storyPath } = await buildFixture();
      try {
        assert.match(await readFile(storyPath, "utf8"), /^status: not-started$/m, "the fixture starts not-started");
        const { record, effects } = await transitionRunStart(
          story,
          { sessionId: "sess-lifecycle", brief: {}, now: "2026-08-16T11:00:00.000Z" },
          { workspace: ctx.workspace, journalOptions: ctx.effectsJournalOptions, publisherOptions: ctx },
        );
        assert.equal(record.state, "running", "the run is minted running");
        assert.match(await readFile(storyPath, "utf8"), /^status: in-progress$/m, "the item is in-progress the moment the run exists");
        const advance = effects.find((effect) => effect.key === "advance-status");
        assert.ok(advance, "the run.started cascade includes the advance-status step");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/run-mint: a mint against an item already in-progress is a no-op, not a second write (at-least-once idempotence)",
    async run() {
      const { root, ctx, story, storyPath } = await buildFixture({ storyStatus: "in-progress" });
      try {
        const before = await readFile(storyPath, "utf8");
        await transitionRunStart(
          story,
          { sessionId: "sess-again", brief: {}, now: "2026-08-16T11:05:00.000Z" },
          { workspace: ctx.workspace, journalOptions: ctx.effectsJournalOptions, publisherOptions: ctx },
        );
        assert.equal(await readFile(storyPath, "utf8"), before, "the record doc is byte-unchanged");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ══════════════════════════════════════════════════════════ (c) THE DOOR ══
  {
    name: "item-status/door: `work:status <ref>` reads the current status and the item's legal next moves",
    async run() {
      const { root, ctx } = await buildFixture({ status: "in-progress" });
      try {
        const result = await invoke("work:status", { ref: "70" }, ctx);
        assert.equal(result.status, "in-progress");
        assert.deepEqual(result.edges, ["in-review", "done", "blocked", "not-started"]);
        assert.ok(!result.moved, "the read face moves nothing");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/door: `work:status <ref> <status>` moves one legal edge and reports the from-state; an illegal move is refused coded",
    async run() {
      const { root, ctx, storyPath } = await buildFixture({ storyStatus: "in-progress" });
      try {
        const moved = await invoke("work:status", { ref: "70/00", status: "in-review", now: "2026-08-16T12:00:00.000Z" }, ctx);
        assert.equal(moved.moved, true);
        assert.equal(moved.from, "in-progress");
        assert.equal(moved.status, "in-review");
        assert.match(await readFile(storyPath, "utf8"), /^status: in-review$/m);
        assert.match(await readFile(storyPath, "utf8"), /^updated: 2026-08-16$/m, "the move stamps updated");

        // in-review → not-started is not a declared edge: refused, nothing written.
        const before = await readFile(storyPath, "utf8");
        await assertRejectsWithCode(() => invoke("work:status", { ref: "70/00", status: "not-started" }, ctx), "status-edge-not-applicable");
        assert.equal(await readFile(storyPath, "utf8"), before, "the refused move wrote nothing");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "item-status/door: the WRITE resolves by exact ref — a typo'd/partial ref is refused rather than moving a plausible neighbour",
    async run() {
      const { root, ctx, specPath, storyPath } = await buildFixture({ status: "in-progress", storyStatus: "in-progress" });
      try {
        const specBefore = await readFile(specPath, "utf8");
        const storyBefore = await readFile(storyPath, "utf8");
        // "lifecycle" is a slug the READ resolver would happily match.
        await assertRejectsWithCode(() => invoke("work:status", { ref: "lifecycle", status: "in-review" }, ctx), "ref-not-found");
        assert.equal(await readFile(specPath, "utf8"), specBefore, "the milestone is untouched");
        assert.equal(await readFile(storyPath, "utf8"), storyBefore, "the story is untouched");
        // …while the same free text IS resolvable by the read face.
        assert.equal((await invoke("work:status", { ref: "lifecycle" }, ctx)).ref, "70");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══════════════════════════════════════════════════ (d) THE PHASE DOOR ══
  {
    name: "item-status/phase-door: opening a LOCAL continue/refine starts the item; verify does not (its move is the acceptance judgement)",
    async run() {
      for (const { phase, expected } of [
        { phase: "continue", expected: "in-progress" },
        { phase: "refine", expected: "in-progress" },
        { phase: "verify", expected: "in-review" },
      ]) {
        const { root, ctx, storyPath } = await buildFixture({ storyStatus: phase === "verify" ? "in-review" : "not-started" });
        try {
          const result = await invoke(`work:${phase}`, { ref: "70/00" }, ctx);
          assert.equal(result.where, "local", "an item with no prior run continues here");
          assert.match(await readFile(storyPath, "utf8"), new RegExp(`^status: ${expected}$`, "m"), `${phase} left the item ${expected}`);
          if (phase !== "verify") assert.equal(result.statusMoved, true, `${phase} reports the move it made`);
          else assert.equal(result.statusMoved, undefined, "verify makes no status move at the door");
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "item-status/phase-door: a status that cannot move never fails the act — the door still answers WHERE",
    async run() {
      const { root, ctx, storyPath } = await buildFixture({ storyStatus: "in-review" });
      try {
        const result = await invoke("work:continue", { ref: "70/00" }, ctx);
        assert.equal(result.where, "local", "the act is still answered");
        assert.equal(result.statusMoved, false, "the refused move is reported as data, not thrown");
        assert.equal(result.statusCode, "status-edge-not-applicable");
        assert.match(await readFile(storyPath, "utf8"), /^status: in-review$/m, "an in-review item is not dragged back to the bench");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
];
