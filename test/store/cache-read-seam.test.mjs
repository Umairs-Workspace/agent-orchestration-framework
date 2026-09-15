// Traceability wiring for milestone 43 / story 06 (the readers migrate), task
//   .../06_story_cache-read-surface/tasks/00_seam-answers-cache-first-with-reported-fallback.feature
//
// ADR-005 STAGE 0: the cache-first read seam EXISTS and is proven against a fixture. It
// exposes cache-first equivalents of `work.mjs`'s four disk readers, each returning rows
// stamped with provenance, each falling back to disk EXPLICITLY when the cache cannot answer.
//
// THE LITMUS, as the task's header sets it: every Then is confirmable from (a) the seam
// call's own returned rows — their `answeredFrom` / `reportedBy` / `syncedAt` — or (b) the
// durable degrade sink's coded entries, an artefact the system WROTE. No source is read.
//
// ONE DEVIATION, DECLARED RATHER THAN HIDDEN. Two Thens in this feature are conditioned on
// the build being AT stage 0 — "a fresh `aof work find 02 --json` still resolves nothing (no
// call site has moved at stage 0)" and the whole zero-blast-radius scenario. This story
// delivers stages 0 THROUGH 3 in one build, so at HEAD those call sites HAVE moved and the
// CLI answers from the cache by design (task 02 requires exactly that of the same commands).
// The two claims are therefore asserted here in the form that is TRUE of the delivered
// build and that carries the same guarantee — the seam is purely ADDITIVE: `work.mjs`'s
// four disk readers, called directly, still see the disk and only the disk, cache or no
// cache. Flagged to the PO, not papered over.
//
// THE ORDERING HALF IS PROVED BY MUTATION, AND THE MUTATION IS RE-RUNNABLE (m43/ADR-016/G9 —
// "a mutation nobody can re-run is an assertion"). The harness is checked in, names its two
// mutations, aborts if either target has moved, and restores the source byte-for-byte with a
// sha256 check:
//
//     node wiki/work/43_milestone_mesh-artifact-authority/reference/staging-mutations.mjs
//
// It reverts ONE migrated call site at a time and prints the mutant's answers beside the
// unmutated baseline's. Measured 2026-08-04, from the repo root:
//
//     BASELINE (stage 3)          work find 02 → 1 row | work list holds 02: true  | work doc 02: present
//     MUTANT stage0-leaf-find     work find 02 → 0 rows| work list holds 02: true  | work doc 02: present
//     MUTANT stage1-leaves-unmoved work find 02 → 1 row| work list holds 02: FALSE | work doc 02: present
//
// Row 2 is task 00's staging Then ("no call site has moved at stage 0" ⇒ `work find 02`
// resolves nothing); row 3 is task 01's ("at stage 1 the leaves have not moved" ⇒ the leaf
// misses 02 while the CHOKEPOINT already answers for it). Neither state can coexist with
// stage 3 in one tree, which is why they are here rather than in a lane below.
import assert from "node:assert/strict";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  withCacheReadFixture, withDegradeCapture, plantCacheRow, runCommand,
  removeStore, tearStore, writeItem, stream,
  CONTROL_NODE, WORKER_NODE, SYNCED_AT,
} from "../support/cache-read-fixture.mjs";
import { spawnCliSync } from "../support/cli-spawn.mjs";
import { loadWorkspace } from "../../src/command-core.mjs";
import {
  listItemsCacheFirst, findWorkCacheFirst, listStreamCacheFirst, nextWorkCacheFirst,
  DEGRADE_CACHE_MISS, DEGRADE_CACHE_UNAVAILABLE,
  withoutAnsweringSide, ANSWERING_SIDE_KEYS,
} from "../../src/work/read.mjs";
import { listItems, findWork, listStream, nextWork, isLiveStreamRow } from "../../src/work.mjs";
// 127/04 task 01 — the OWNING node's disk projection is what its cache reports, so the
// remote-node fixture below projects 127/01's three-root fixture through the real own-disk
// read and streams the rows through the real frame door.
import { readWorkspaceProjectionItems } from "../../src/global-work-store.mjs";
import { buildThreeRootFixture } from "../work/stream/work-backlog-archive-enumerate.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

// The Background's stream: this node's own disk holds milestones "00" and "01" ONLY.
const DISK_STREAM = [{ number: "00", stories: [] }, { number: "01", stories: [] }];

// The seam takes a workspace + the fixture's hermetic store options.
async function seamCtx(fx) {
  return {
    workspace: await loadWorkspace(fx.root, undefined, { env: fx.env }),
    options: { globalWorkStoreOptions: { env: fx.env } },
  };
}

// The Background, once: disk 00/01; the cache holds "02" reported by the REMOTE node and
// "01" reported by this control node.
async function background(fx) {
  await plantCacheRow(fx, "02", { status: "in-progress", title: "Remote milestone", node: WORKER_NODE, at: SYNCED_AT });
  // "…the cache also holds a row for 01 last reported by this control node, MATCHING ITS
  // DISK" — the title/status are the disk's own, which is what makes a later assertion that
  // the two answers differ only by the stamp a real assertion rather than a coincidence.
  await plantCacheRow(fx, "01", { status: "not-started", title: "Milestone 01", node: CONTROL_NODE, at: SYNCED_AT });
}

const rowFor = (rows, ref) => rows.find((row) => row.ref === ref) ?? null;

// ── 127/04 task 01: the remote-node fixture ────────────────────────────────────
// The instant the owning node reported its whole stream.
const REMOTE_AT = "2026-09-15T09:00:00.000Z";

// writeRootItem(workDir, folder, fields) — one record doc at the stream root in the three-root
// fixture's own spelling (127/01's `writeItem`), so this node's live items are byte-identical
// to the owning node's copies of them.
async function writeRootItem(workDir, folder, { type, number, slug, status = "not-started", title, parent }) {
  const dir = path.join(workDir, ...folder.split("/"));
  await mkdir(dir, { recursive: true });
  const doc = { milestone: "SPEC.md", story: "STORY.md", chore: "CHORE.md", spike: "SPIKE.md", uat: "SESSION.md" }[type];
  const fields = { type, number, slug, status, title: `"${title ?? slug}"`, parent, created: "2026-09-11", updated: "2026-09-11", schema: 1 };
  const lines = Object.entries(fields).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}: ${value}`);
  await writeFile(path.join(dir, doc), `---\n${lines.join("\n")}\n---\n`, "utf8");
  return dir;
}

// withRemoteNode(body) — "a workspace whose disk holds only 10_milestone_alpha and 11_chore_beta,
// and a hermetic store whose rows for this workspace are the three-root fixture's full projection
// reported by node aof-wsl". The owning node is a SECOND three-root fixture on disk; its rows are
// read through the REAL own-disk projection and arrive through the REAL snapshot frame door
// under the node id the connection authenticated as — exactly a worker's first report.
async function withRemoteNode(body) {
  return withCacheReadFixture(async (fx) => {
    await writeRootItem(fx.workDir, "10_milestone_alpha", { type: "milestone", number: "10", slug: "alpha", status: "in-progress", title: "Alpha" });
    await writeRootItem(fx.workDir, "10_milestone_alpha/stories/00_story_alpha-one", { type: "story", number: "00", slug: "alpha-one", parent: "10", title: "Alpha one" });
    await writeRootItem(fx.workDir, "11_chore_beta", { type: "chore", number: "11", slug: "beta", title: "Beta" });
    const owner = await buildThreeRootFixture();
    try {
      const projected = await readWorkspaceProjectionItems({ config: { name: "owner", work: { dir: "./wiki/work" } }, projectRoot: owner.root, workDir: owner.work });
      assert.deepEqual(projected.errors, [], "the owning node's projection is clean");
      const landed = await stream(fx, WORKER_NODE, projected.rows, { kind: "snapshot", at: REMOTE_AT });
      assert.equal(landed.upserted, projected.rows.length, `every row the owner reported landed (${JSON.stringify(landed.skippedRows)})`);
    } finally {
      await rm(owner.root, { recursive: true, force: true });
    }
    return body(fx);
  }, { stream: [] });
}

// cliJson(fx, argv) — `aof work <argv> --json` as a child process from the workspace root, the
// fixture's store selected through its AOF_GLOBAL_HOME.
function cliJson(fx, argv) {
  const result = spawnCliSync(process.execPath, [cliPath, "work", ...argv, "--json"], {
    cwd: fx.root,
    encoding: "utf8",
    env: { ...process.env, AOF_GLOBAL_HOME: fx.home, NODE_NO_WARNINGS: "1" },
  });
  assert.equal(result.status, 0, `aof work ${argv.join(" ")} --json exits 0 (stderr: ${result.stderr})`);
  return JSON.parse(result.stdout);
}

export const cacheReadSeamTests = [
  // ==========================================================================
  // HEADLINE, Scenario Outline ×4: each seam reader answers a cache-known ref
  // this node's disk has NEVER seen, stamped with its author
  // ==========================================================================
  ...[
    {
      reader: "listItems-equivalent",
      call: async (ws, options) => listItemsCacheFirst(ws, options),
      pick: (result) => rowFor(result, "02"),
    },
    {
      reader: "findWork-equivalent",
      call: async (ws, options) => findWorkCacheFirst(ws, "02", options),
      pick: (result) => rowFor(result, "02"),
    },
    {
      // `nextWork` answers with ONE item, so the ref is reached by SCOPING the walk to
      // driver 02 — the reader's own scope argument, not a fixture contrivance.
      reader: "nextWork-equivalent",
      call: async (ws, options) => nextWorkCacheFirst(ws, "02", options),
      pick: (result) => (result?.ref === "02" ? result : null),
    },
    {
      reader: "listStream-equivalent",
      call: async (ws, options) => listStreamCacheFirst(ws, options),
      pick: (result) => rowFor(result, "02"),
    },
  ].map(({ reader, call, pick }) => ({
    name: `cache-read/00 the seam's ${reader} answers a cache-known ref the control's disk has never seen, stamped with its author`,
    run: () => withCacheReadFixture(async (fx) => {
      await background(fx);
      const { workspace, options } = await seamCtx(fx);

      const row = pick(await call(workspace, options));
      assert.ok(row != null, `the ${reader} result includes a row for ref "02"`);
      assert.equal(row.answeredFrom, "cache", "that row reports answeredFrom cache");
      assert.equal(row.reportedBy, WORKER_NODE, "that row reports reportedBy aof-wsl");
      assert.equal(row.syncedAt, SYNCED_AT, "that row carries the syncedAt the cache holds for it, UNMODIFIED");

      // The zero-blast-radius half, in the form that is true of the delivered build (see the
      // header): the DISK reader this seam is built on still resolves nothing for "02" — the
      // seam added a capability beside work.mjs and changed nothing inside it.
      assert.deepEqual(await findWork(fx.workDir, "02"), [], "work.mjs's own findWork still resolves nothing for a cache-only ref");
    }, { stream: DISK_STREAM }),
  })),

  // ==========================================================================
  // Cache-FIRST, not cache-only: a ref held by BOTH sides is answered from the
  // cache, and the row still says so
  // ==========================================================================
  {
    name: "cache-read/00 a ref held by both sides is answered from the cache, and says so — the two sides never blend",
    run: () => withCacheReadFixture(async (fx) => {
      await background(fx);
      // The cache's row for "01" reads `done` while this node's disk frontmatter reads
      // `in-progress` — a genuine disagreement, which is the only way to tell which side won.
      await writeItem(fx, "01", { status: "in-progress" });
      await plantCacheRow(fx, "01", { status: "done", title: "Item 01", node: CONTROL_NODE, at: SYNCED_AT });
      const { workspace, options } = await seamCtx(fx);

      const row = rowFor(await findWorkCacheFirst(workspace, "01", options), "01");
      assert.ok(row != null, "the seam resolves 01");
      assert.equal(row.status, "done", "the returned row reports the CACHE's status");
      assert.equal(row.answeredFrom, "cache", "…and reports that the cache answered it");
      assert.equal(row.reportedBy, CONTROL_NODE, "…and names this control node as the reporter");
      // Non-vacuity: the disk really does say something else, so "done" cannot have come from it.
      assert.equal((await findWork(fx.workDir, "01"))[0].status, "in-progress", "the DISK says in-progress — the two sides genuinely disagree");
    }, { stream: DISK_STREAM }),
  },

  // ==========================================================================
  // The FALLBACK is a designed path, proven in both directions
  // ==========================================================================
  {
    name: "cache-read/00 a ref the cache has no row for falls back to disk, reports the fallback, fabricates no syncedAt, and lands ONE coded entry naming the miss and the ref",
    run: () => withCacheReadFixture(async (fx) => {
      await background(fx); // the cache holds 01 and 02 — and NOT 00
      const { workspace, options } = await seamCtx(fx);

      await withDegradeCapture(async (sink) => {
        const row = rowFor(await findWorkCacheFirst(workspace, "00", options), "00");
        assert.ok(row != null, "the seam still answers for 00");
        // …and the row IS the control disk's row for 00.
        const disk = (await findWork(fx.workDir, "00"))[0];
        assert.equal(row.status, disk.status, "the returned row is the control disk's row for 00");
        assert.equal(row.dir, disk.dir, "…including its own real folder");
        assert.equal(row.answeredFrom, "disk", "the returned row reports answeredFrom disk");
        assert.ok(!("syncedAt" in row), "the returned row carries NO syncedAt — an unobserved freshness is never fabricated");
        assert.ok(!("reportedBy" in row), "…and no author either");

        const misses = sink.of(DEGRADE_CACHE_MISS);
        assert.equal(misses.length, 1, `the durable degrade sink gained ONE coded entry (got ${JSON.stringify(sink.codes())})`);
        assert.match(misses[0].message, /\b00\b/, "…and the entry NAMES the ref it degraded on");
      });
    }, { stream: DISK_STREAM }),
  },

  // ==========================================================================
  // QA case matrix: whatever state the cache is in, the seam still answers, and
  // always says which side answered
  // ==========================================================================
  ...[
    {
      state: "present, holding the \"02\" row",
      prepare: async (fx) => background(fx),
      expectRefs: ["00", "01", "02"],
      expectSide: (ref) => (ref === "00" ? "disk" : "cache"),
      expectCode: DEGRADE_CACHE_MISS,
    },
    {
      state: "absent — a fresh workspace that never published",
      prepare: async (fx) => { await background(fx); await removeStore(fx); },
      expectRefs: ["00", "01"],
      expectSide: () => "disk",
      expectCode: DEGRADE_CACHE_UNAVAILABLE,
    },
    {
      state: "present but holding no row for this workspace",
      prepare: async () => {}, // the store exists (the fixture registered a descriptor) and holds no work_items row
      expectRefs: ["00", "01"],
      expectSide: () => "disk",
      expectCode: DEGRADE_CACHE_UNAVAILABLE,
    },
    {
      state: "present but TORN / unreadable",
      prepare: async (fx) => { await background(fx); await tearStore(fx); },
      expectRefs: ["00", "01"],
      expectSide: () => "disk",
      expectCode: DEGRADE_CACHE_UNAVAILABLE,
    },
  ].map(({ state, prepare, expectRefs, expectSide, expectCode }) => ({
    name: `cache-read/00 whatever state the cache is in (${state}), the seam still answers and always says which side answered`,
    run: () => withCacheReadFixture(async (fx) => {
      await prepare(fx);
      const { workspace, options } = await seamCtx(fx);

      await withDegradeCapture(async (sink) => {
        // "the call succeeds" — a read seam that could refuse to answer would be strictly
        // worse than the disk reader it replaces, so a throw here is the failure.
        const rows = await listItemsCacheFirst(workspace, options);
        assert.deepEqual(rows.map((row) => row.ref).sort(), [...expectRefs].sort(), `the rows it returns are ${expectRefs.join("/")}`);
        for (const row of rows) {
          assert.equal(row.answeredFrom, expectSide(row.ref), `${row.ref} reports its own answering side`);
        }
        assert.ok(sink.of(expectCode).length >= 1, `the durable degrade sink has gained a ${expectCode} entry (got ${JSON.stringify(sink.codes())})`);
      });
    }, { stream: DISK_STREAM }),
  })),

  // ==========================================================================
  // The degrade is reported ONCE per class, not once per row
  // ==========================================================================
  {
    name: "cache-read/00 a read that falls back for many refs reports the degrade as ONE coded class, not once per row",
    run: () => withCacheReadFixture(async (fx) => {
      await removeStore(fx);
      const { workspace, options } = await seamCtx(fx);

      await withDegradeCapture(async (sink) => {
        const rows = await listStreamCacheFirst(workspace, options);
        assert.equal(rows.length, 12, "all twelve rows are returned");
        for (const row of rows) assert.equal(row.answeredFrom, "disk", `${row.ref} reports answeredFrom disk`);
        assert.equal(
          sink.entries.length, 1,
          `the sink holds ONE coded entry for that read, not twelve (got ${sink.entries.length}: ${JSON.stringify(sink.codes())})`,
        );
        assert.equal(sink.entries[0].code, DEGRADE_CACHE_UNAVAILABLE, "…and it names the unavailable cache");
      });
    }, { stream: Array.from({ length: 12 }, (_, i) => ({ number: String(i).padStart(2, "0"), stories: [] })) }),
  },

  // ==========================================================================
  // ZERO BLAST RADIUS — asserted in the form that is TRUE of the delivered
  // build (see this file's header): the seam is purely ADDITIVE
  // ==========================================================================
  {
    name: "cache-read/00 the seam is purely additive — work.mjs's own readers answer exactly as they did before it existed, and every migrated command's answer differs by the answering-side stamp alone",
    run: () => withCacheReadFixture(async (fx) => {
      await background(fx);
      const { workspace, options } = await seamCtx(fx);

      // (a) the disk readers, untouched — they see the disk's 00/01 and nothing else.
      const diskRows = await listStream(fx.workDir);
      assert.deepEqual(diskRows.map((row) => row.ref), ["00", "01"], "listStream is the control disk's 00 and 01 alone");
      for (const row of diskRows) {
        for (const key of ["answeredFrom", "reportedBy", "syncedAt"]) {
          assert.ok(!(key in row), `no disk-reader row carries ${key}`);
        }
      }

      // (b) the migrated command's rows are the SAME values plus the stamp — nothing renamed,
      // nothing dropped, nothing retyped. That is the guarantee "answers exactly as before"
      // encodes, held over the build that actually ships.
      const listed = await runCommand(fx, "work:list", {});
      const stripped = listed
        .filter((row) => row.ref !== "02")
        .map(({ answeredFrom, reportedBy, syncedAt, ...rest }) => { void answeredFrom; void reportedBy; void syncedAt; return rest; });
      assert.deepEqual(stripped, diskRows, "every disk-known row is byte-identical once the stamp is removed");

      // (c) …and calling the seam has NO side effect on the disk readers' later answers.
      await listStreamCacheFirst(workspace, options);
      assert.deepEqual(await listStream(fx.workDir), diskRows, "the disk readers answer identically after the seam has run");
    }, { stream: DISK_STREAM }),
  },

  // ==========================================================================
  // The dependency direction, in its only observable form
  // ==========================================================================
  {
    name: "cache-read/00 work.mjs's disk readers are unchanged — they see the disk only, cache or no cache, and no provenance field appears on a disk-reader row",
    run: () => withCacheReadFixture(async (fx) => {
      await background(fx);
      // The cache holds "02" (which the disk does not) and a status for "01" that DIFFERS.
      await plantCacheRow(fx, "01", { status: "done", node: CONTROL_NODE, at: SYNCED_AT });
      await writeItem(fx, "01", { status: "in-progress" });

      const items = await listItems(fx.workDir);
      assert.deepEqual(items.map((item) => item.ref).sort(), ["00", "01"], "listItems returns exactly the disk's 00 and 01");
      for (const item of items) {
        for (const key of ["answeredFrom", "reportedBy", "syncedAt"]) {
          assert.ok(!(key in item), `no returned item carries ${key}`);
        }
      }
      const found = await findWork(fx.workDir, "01");
      assert.equal(found[0].status, "in-progress", "findWork for 01 reports the DISK's status, not the cache's");
      assert.deepEqual(await findWork(fx.workDir, "02"), [], "…and the cache-only ref is invisible to it");
      // nextWork too — the fourth reader, and the one whose DECISION the cache would change.
      const next = await nextWork(fx.workDir, "01");
      assert.equal(next.state, "ready", "nextWork still offers 01 from disk");
      assert.equal(next.status, "in-progress", "…at the DISK's status");
      assert.ok(!("answeredFrom" in next), "…carrying no answering-side stamp");
    }, { stream: DISK_STREAM }),
  },
  // ============================================================================
  // milestone 127 / story 04 / task 01 —
  //   tasks/01_a-remote-node-answers-for-a-backlog-or-archived-item.feature (@executable)
  //
  // A node whose disk does not hold the item answers `aof work find` for a backlog slug or an
  // archived number EXACTLY as the owning node does. The seam rebuilds a cache-only row in the
  // enumerator's shape off the store's FACTS (`backlog`'s presence, `archived: true`), never off
  // the ref's spelling; every cache-first reader and the CLI agree row for row; and a checkout
  // that still holds the folder keeps its own location (the overlay rule, a documented default).
  //
  // THE REMOTE-NODE FIXTURE: this node's disk holds only 127/01's two live items; the cache
  // holds the three-root fixture's FULL projection, reported by `aof-wsl` through the REAL
  // frame door (`applyStreamFrame` — the same door a worker's snapshot arrives through).
  // ============================================================================
  {
    name: "cache-read/127-04-01 the seam rebuilds a cache-only backlog row and a cache-only archived row in the enumerator's shape — number null + backlog, or the numbered shape plus archived: true — and isLiveStreamRow answers the same as it would on the owning node",
    run: () => withRemoteNode(async (fx) => {
      const { workspace, options } = await seamCtx(fx);
      const items = await listItemsCacheFirst(workspace, options);
      const byRef = new Map(items.map((item) => [item.ref, item]));

      assert.deepEqual(byRef.get("gamma"), {
        number: null, type: "chore", slug: "gamma", name: null, dir: null, ref: "gamma", parent: null, backlog: "",
        answeredFrom: "cache", reportedBy: WORKER_NODE, syncedAt: REMOTE_AT,
      }, "the top-of-backlog row is rebuilt in the enumerator's own shape, with number null off the store's backlog fact");
      assert.equal(byRef.get("epsilon").backlog, "ideas/later", "a grouped row carries its group path");
      assert.deepEqual(byRef.get("05"), {
        number: "05", type: "milestone", slug: "zeta", name: null, dir: null, ref: "05", parent: null, archived: true,
        answeredFrom: "cache", reportedBy: WORKER_NODE, syncedAt: REMOTE_AT,
      }, "an archived driver is the numbered shape plus archived: true");
      assert.equal(byRef.get("05/00").parent, "05");
      assert.equal(byRef.get("05/00").archived, true, "…and its story carries the flag with its parent");

      for (const ref of ["gamma", "delta", "epsilon", "05", "05/00", "06"]) {
        assert.equal(isLiveStreamRow(byRef.get(ref)), false, `${ref} is not a live stream row here, exactly as on the owning node`);
      }
      for (const ref of ["10", "10/00", "11"]) {
        assert.equal(isLiveStreamRow(byRef.get(ref)), true, `${ref} is live`);
        const disk = (await listItems(fx.workDir)).find((item) => item.ref === ref);
        assert.ok(disk?.dir && disk?.name, "the disk holds the folder");
        assert.deepEqual(byRef.get(ref), { ...disk, answeredFrom: "cache", reportedBy: WORKER_NODE, syncedAt: REMOTE_AT }, `${ref} is the DISK's own row (dir and name set), stamped cache-answered — byte-identical to what the seam answered before this task`);
      }
    }),
  },
  ...[
    {
      reader: 'findWorkCacheFirst(ws, "gamma")',
      call: (ws, options) => findWorkCacheFirst(ws, "gamma", options),
      then: (rows) => {
        assert.equal(rows.length, 1, "exactly one row");
        assert.equal(rows[0].ref, "gamma");
        assert.equal(rows[0].number, null);
        assert.equal(rows[0].backlog, "");
        assert.equal(rows[0].dir, null);
        assert.equal(rows[0].answeredFrom, "cache");
      },
    },
    {
      reader: 'findWorkCacheFirst(ws, "delta")',
      call: (ws, options) => findWorkCacheFirst(ws, "delta", options),
      then: (rows) => {
        assert.equal(rows.length, 1, "exactly one row");
        assert.equal(rows[0].ref, "delta");
        assert.equal(rows[0].type, "milestone");
        assert.equal(rows[0].backlog, "ideas");
      },
    },
    {
      reader: 'findWorkCacheFirst(ws, "05")',
      call: (ws, options) => findWorkCacheFirst(ws, "05", options),
      then: (rows) => {
        assert.equal(rows.length, 1, "exactly one row");
        assert.equal(rows[0].ref, "05");
        assert.equal(rows[0].archived, true);
        assert.equal(rows[0].status, "done");
        assert.equal(rows[0].dir, null);
      },
    },
    {
      reader: 'findWorkCacheFirst(ws, "05/00")',
      call: (ws, options) => findWorkCacheFirst(ws, "05/00", options),
      then: (rows) => {
        assert.equal(rows.length, 1, "exactly one row");
        assert.equal(rows[0].ref, "05/00");
        assert.equal(rows[0].parent, "05");
        assert.equal(rows[0].archived, true);
      },
    },
    {
      reader: "listStreamCacheFirst(ws)",
      call: (ws, options) => listStreamCacheFirst(ws, options),
      then: (rows) => {
        assert.deepEqual(rows.map((row) => row.ref), ["10", "10/00", "11", "gamma", "delta", "epsilon"], "the default listing: the live rows, then the backlog, and no archived row");
        const gamma = rowFor(rows, "gamma");
        assert.equal(gamma.number, null);
        assert.equal(gamma.backlog, "");
      },
    },
    {
      reader: "listStreamCacheFirst(ws, { all: true })",
      call: (ws, options) => listStreamCacheFirst(ws, { ...options, all: true }),
      then: (rows) => {
        assert.deepEqual(rows.map((row) => row.ref), ["10", "10/00", "11", "gamma", "delta", "epsilon", "05", "05/00", "06"], "with all: true the archive follows, after the live and backlog rows (ADR-002 §5's order)");
        for (const ref of ["05", "05/00", "06"]) assert.equal(rowFor(rows, ref).archived, true, `${ref} carries archived: true`);
      },
    },
    {
      reader: 'nextWorkCacheFirst(ws, "05")',
      call: (ws, options) => nextWorkCacheFirst(ws, "05", options),
      then: (result) => assert.equal(result.state, "done", "an archived driver is finished, never proposed"),
    },
    {
      reader: "nextWorkCacheFirst(ws)",
      call: (ws, options) => nextWorkCacheFirst(ws, undefined, options),
      then: (result) => {
        const never = new Set(["05", "05/00", "06", "gamma", "delta", "epsilon"]);
        assert.ok(!never.has(result.ref), `the unscoped walk never returns an archived or backlog ref (got ${result.ref})`);
        for (const member of result.readySet ?? []) assert.ok(!never.has(member.ref), `the ready set holds none of them (has ${member.ref})`);
      },
    },
  ].map(({ reader, call, then }) => ({
    name: `cache-read/127-04-01 ${reader} answers, from a disk that has neither, what the owning node would answer`,
    run: () => withRemoteNode(async (fx) => {
      const { workspace, options } = await seamCtx(fx);
      then(await call(workspace, options));
    }),
  })),
  ...[
    {
      argv: ["find", "gamma"],
      then: (doc, fx) => {
        assert.equal(doc.length, 1, "one document");
        const { syncedAt, ...rest } = doc[0];
        assert.deepEqual(rest, {
          ref: "gamma", type: "chore", slug: "gamma", status: "not-started", title: "Gamma", parent: null, dir: null,
          number: null, backlog: "", answeredFrom: "cache", reportedBy: WORKER_NODE,
        }, `the document carries the rebuilt row and its stamp (fixture root ${fx.root})`);
        assert.equal(syncedAt, REMOTE_AT);
      },
    },
    {
      argv: ["find", "05"],
      then: (doc) => {
        assert.equal(doc.length, 1, "one document");
        assert.equal(doc[0].ref, "05");
        assert.equal(doc[0].archived, true);
        assert.equal(doc[0].dir, null);
        assert.equal(doc[0].answeredFrom, "cache");
      },
    },
    {
      argv: ["list"],
      then: (rows) => {
        assert.deepEqual(rows.map((row) => row.ref), ["10", "10/00", "11", "gamma", "delta", "epsilon"]);
        for (const ref of ["10", "10/00", "11"]) {
          assert.deepEqual(Object.keys(rowFor(rows, ref)), ["ref", "type", "slug", "status", "title", "parent", "dir"], `${ref}: the frozen seven keys and nothing else — the frozen face strips the stamp`);
        }
        for (const ref of ["gamma", "delta", "epsilon"]) {
          const row = rowFor(rows, ref);
          assert.equal(row.number, null, `${ref}: number null`);
          assert.equal(typeof row.backlog, "string", `${ref}: a backlog group`);
          assert.ok(!("answeredFrom" in row), `${ref}: no answeredFrom key on the frozen face`);
        }
      },
    },
    {
      argv: ["list", "--all"],
      then: (rows) => {
        assert.deepEqual(rows.map((row) => row.ref), ["10", "10/00", "11", "gamma", "delta", "epsilon", "05", "05/00", "06"], "the archive follows epsilon");
        for (const ref of ["05", "05/00", "06"]) assert.equal(rowFor(rows, ref).archived, true, `${ref}: archived: true`);
      },
    },
    {
      argv: ["next"],
      then: (doc) => {
        assert.ok(!["05", "06", "gamma", "delta", "epsilon"].includes(doc.ref), `next never proposes an archived or backlog ref (got ${doc.ref})`);
      },
    },
  ].map(({ argv, then }) => ({
    name: `cache-read/127-04-01 the CLI on the remote node agrees with the seam — aof work ${argv.join(" ")} --json`,
    run: () => withRemoteNode(async (fx) => {
      then(cliJson(fx, argv), fx);
    }),
  })),
  {
    name: "cache-read/127-04-01 a checkout that still holds the folder at the root keeps its own location when the cache says archived — status is the cache's, location is the disk's, doctor reports no divergence; once the folder moves on this disk too, the reads answer archived",
    run: () => withCacheReadFixture(async (fx) => {
      // This checkout: `12_milestone_theta` at the stream root, done.
      const theta = await writeRootItem(fx.workDir, "12_milestone_theta", { type: "milestone", number: "12", slug: "theta", status: "done", title: "Theta" });
      // The cache: 12 reported by the CONTROL node (this node's own id) as archived, from under archive/.
      await stream(fx, CONTROL_NODE, [{
        ref: "12", type: "milestone", slug: "theta", status: "done", title: "Theta", parent: null,
        sourcePath: "/elsewhere/wiki/work/archive/12_milestone_theta/SPEC.md", archived: true,
      }], { kind: "delta", at: SYNCED_AT });

      const { workspace, options } = await seamCtx(fx);
      const found = await findWorkCacheFirst(workspace, "12", options);
      assert.equal(found.length, 1);
      assert.equal(found[0].dir, theta, "the row's dir is THIS checkout's folder — never a path under an archive/ it does not have");
      assert.ok(!("archived" in found[0]), "NO archived key — a location fact is never overlaid from the cache");
      assert.equal(found[0].status, "done", "status is the cache's (it agrees)");
      assert.equal(found[0].answeredFrom, "cache");
      const listed = await listStreamCacheFirst(workspace, options);
      assert.ok(listed.some((row) => row.ref === "12" && !("archived" in row)), "the default listing includes 12 as a live done row");

      const { findings } = await runCommand(fx, "work:doctor", {});
      const about12 = findings.filter((finding) => String(finding.path ?? "").includes("12_milestone_theta"));
      assert.ok(!about12.some((finding) => finding.code === "cache-status-divergence"), "no cache-status-divergence — status agrees");
      assert.ok(!about12.some((finding) => /archive|location/i.test(String(finding.problem ?? finding.message ?? ""))), `no finding about its location (${JSON.stringify(about12)})`);

      // The folder moves on THIS disk too: the disk leads, the cache agrees.
      await mkdir(path.join(fx.workDir, "archive"), { recursive: true });
      await rename(theta, path.join(fx.workDir, "archive", "12_milestone_theta"));
      const moved = await findWorkCacheFirst(workspace, "12", options);
      assert.equal(moved.length, 1);
      assert.equal(moved[0].archived, true, "now archived");
      assert.ok(moved[0].dir.replaceAll("\\", "/").includes("/archive/12_milestone_theta"), "…with a dir under archive/");
      assert.ok(!(await listStreamCacheFirst(workspace, options)).some((row) => row.ref === "12"), "…and out of the default listing");
      assert.ok((await listStreamCacheFirst(workspace, { ...options, all: true })).some((row) => row.ref === "12" && row.archived === true), "…but in the --all listing");
    }, { stream: [] }),
  },
  {
    name: "cache-read/127-04-01 the seam's own guarantees are unchanged by the two new shapes — a disk-answered row carries answeredFrom disk and nothing else, withoutAnsweringSide strips exactly ANSWERING_SIDE_KEYS, and work.mjs imports nothing new",
    run: () => withRemoteNode(async (fx) => {
      const { workspace, options } = await seamCtx(fx);
      await removeStore(fx);
      const rows = await withDegradeCapture(async () => listStreamCacheFirst(workspace, options));
      assert.ok(rows.length > 0);
      for (const row of rows) {
        assert.equal(row.answeredFrom, "disk", `${row.ref}: answered from disk with no cache`);
        assert.ok(!("reportedBy" in row) && !("syncedAt" in row), `${row.ref}: …and nothing else`);
      }
      const stamped = { ref: "x", answeredFrom: "cache", reportedBy: "n", syncedAt: "t", number: null, backlog: "", archived: true };
      assert.deepEqual(withoutAnsweringSide(stamped), { ref: "x", number: null, backlog: "", archived: true }, "the strip removes exactly the answering-side keys and leaves the two shapes");
      assert.deepEqual([...ANSWERING_SIDE_KEYS], ["answeredFrom", "reportedBy", "syncedAt"]);

      // work.mjs's four disk readers keep their exact return shape over a stream with neither
      // root — and the module imports nothing new for the seam's sake (it consumes the
      // enumerator's row and isLiveStreamRow; the seam re-derives neither).
      const source = await readFile(path.join(repoRoot, "src", "work.mjs"), "utf8");
      const imports = [...source.matchAll(/^import .* from "([^"]+)";$/gm)].map((match) => match[1]).filter((spec) => spec.startsWith("."));
      assert.ok(!imports.some((spec) => spec.includes("read.mjs") || spec.includes("cache-read") || spec.includes("global-work-store") || spec.includes("item-row")), `work.mjs imports no cache module (${imports.join(", ")})`);
    }),
  },
];
