// Shared fixture builder for the milestone 38 / story 04 fleet-face
// POST /api/mesh/assign suite (tasks 00-02) — the REAL serveMeshUi stood up on a
// loopback port over an isolated global-store seam (a temp AOF_GLOBAL_HOME v3
// projection), mirroring test/support/mesh-assign-fixture.mjs's CLI-verb fixture
// but wired through the HTTP face instead of calling assignWork directly.
//
// A resolvable work item "38/04" lives under a temp "38_milestone_demo"
// workspace (an isolated fixture, unrelated to the REAL milestone 38 folder in
// this repo's own wiki/work — the same convention the existing "35_milestone_
// demo" mesh-assign fixture already uses for milestone 35).
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { serveMeshUi, meshUiDist } from "../../src/mesh/ui-serve.mjs";
import { workspaceIdFor, openGlobalWorkProjectionStore, removeWorkspaceFromCache } from "../../src/global-work-store.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { publishGlobalRegistryDescriptorsToStore } from "../../src/global-node-registry.mjs";
import { publishNodeRecord } from "../../src/mesh/store.mjs";
import { updateAssignmentState } from "../../src/assignment-record.mjs";

export {
  seedTargetNode,
  seedAssignment,
  readAssignmentRows,
} from "./mesh-assign-fixture.mjs";

// countAllAssignmentRows({ home }) — the WHOLE table, unfiltered. A per-(workspace,
// ref) read can only prove "nothing landed where I looked"; F21 was precisely a
// mint landing somewhere nobody was looking, so a refusal lane asserts the total
// row count is unchanged as well.
export async function countAllAssignmentRows({ home }) {
  const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
  try {
    return store.db.prepare("SELECT COUNT(*) AS n FROM global_assignments").get().n;
  } finally {
    store.close();
  }
}

// advanceAssignmentState({ home }, assignmentId, state) — move a minted record
// along the m35 §4 ramp through its OWN sanctioned writer (assignment-record
// .mjs's `updateAssignmentState`, which validates the state against the frozen
// enum), never a raw UPDATE. Used to reproduce the soak's "sent, then failed
// 1.5s later" and prove the affordance never mirrors a lifecycle it no longer
// owns.
export async function advanceAssignmentState({ home }, assignmentId, state, options = {}) {
  const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
  try {
    return updateAssignmentState(store, assignmentId, state, options);
  } finally {
    store.close();
  }
}

// dropNodeFromRoster({ home }, nodeId) — make a published node LEAVE the picker
// while it stays ASSIGN-ELIGIBLE, by removing its registry DESCRIPTOR file at
// the exact path the real publisher recorded in `global_nodes.descriptor_path`
// (read back from the store — never a path this fixture rebuilds itself).
//
// This is the codebase's own documented asymmetry, not an invented one:
// `queryGlobalRegistry` (src/global-node-registry.mjs) silently SKIPS a
// `global_nodes` row whose descriptor does not resolve, so the node vanishes
// from GET /api/mesh/status.nodes — the roster the picker is fed — while
// `assignWork`'s node-known gate reads `global_nodes` DIRECTLY and still accepts
// it. That is what lets a long-lived monitor's picker change under a mounted
// row, and it is the producer for the QA-a regression (a row that NAMES one
// target and POSTs another).
export async function dropNodeFromRoster({ home }, nodeId) {
  const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
  try {
    const row = store.db.prepare("SELECT descriptor_path FROM global_nodes WHERE node_id = ?").get(nodeId);
    if (!row?.descriptor_path) throw new Error(`dropNodeFromRoster: "${nodeId}" has no global_nodes descriptor_path to remove`);
    await rm(row.descriptor_path, { force: true });
    return row.descriptor_path;
  } finally {
    store.close();
  }
}

// removeWorkspaceFromProjection({ home }, workspaceId) — make a published workspace LEAVE
// the global projection entirely, the way it does when an operator unregisters one between
// a page's poll and its click (m47/01 task 00 scenario 5, row 1).
//
// IT TAKES TWO REMOVALS, and that is the codebase's own shape rather than an invented one.
// `shapeGlobalStatus` builds `workspaces` as the UNION of the WORK projection's rows and the
// REGISTRY's descriptor rows (`global-mesh-query.mjs:185-205`) — a registry-only workspace
// still surfaces, deliberately, so a repo that has published its node snapshot but no work
// yet is not invisible. `removeWorkspaceFromCache` is the production door and it says in
// terms that it "deliberately does NOT touch the DISPATCH facts (assignments, branches,
// descriptors)", so on its own it leaves the workspace on the wire and the board-url route
// still resolves it. Measured, 2026-08-10: cache-removal alone answers 200 and launches a
// board. The descriptor row is dropped here beside it — the same direct-SQL liberty
// `settleAssignmentsFor` below already takes, and for the same reason (there is no named
// door for the half this fixture needs).
export async function removeWorkspaceFromProjection({ home }, workspaceId) {
  const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
  try {
    const removed = removeWorkspaceFromCache(store, workspaceId);
    const descriptors = store.db
      .prepare("DELETE FROM global_workspace_descriptors WHERE workspace_id = ?")
      .run(workspaceId).changes ?? 0;
    return { ...removed, descriptors };
  } finally {
    store.close();
  }
}

// settleAssignmentsFor({ home }, workspaceId, itemRef) — flip every active row for an
// item to `withdrawn`, the direct-SQL twin of dropNodeFromRoster above. It exists for
// m43/ADR-003: the item lock is symmetric over the execution scope, so a probe that
// needs a milestone's SCOPE free has to reach a gate first. Node-registry facts are
// untouched by it — which is precisely why an eligibility probe can use it.
export async function settleAssignmentsFor({ home }, workspaceId, itemRef) {
  const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
  try {
    store.db.prepare(
      "UPDATE global_assignments SET state = 'withdrawn' WHERE workspace_id = ? AND item_ref = ? AND state IN ('assigned','accepted','running')",
    ).run(workspaceId, itemRef);
  } finally {
    store.close();
  }
}

async function writeDist(dir) {
  await mkdir(path.join(dir, "assets"), { recursive: true });
  await writeFile(
    path.join(dir, "index.html"),
    "<!doctype html><html><head><script type=\"module\" src=\"/assets/index-abc123.js\"></script></head><body><div id=\"root\"></div></body></html>\n",
    "utf8",
  );
  await writeFile(path.join(dir, "assets", "index-abc123.js"), "export const x = 1;\n", "utf8");
}

// `storyStatus` (m47/04, ADR-014 — ONE additive option, in the same family as
// `name`) — the status of the fixture's own story, which is what decides whether
// region 5's attention cluster has TWO children or THREE.
//
// IT IS THE PRODUCER F-47-04-QA-9 SAYS NO FIXTURE HAD. `Fleet.tsx` renders a
// secondary token beside the chip whenever `inReview > 0 || isDone`, and
// `inReview` is a TALLY OF STORIES in the `in-review` status
// (`ui/src/fleet/scope.mjs`'s `milestoneCardModels`) — so with the shipped
// `not-started` story every mounted card on this fixture was a TWO-child cluster
// and the three-child row that ADR-014 measures could not be rendered at all.
// `storyStatus: "in-review"` publishes the same story in that status through the
// same real path, so the card the face serves carries `◔ 1 in review` beside its
// chip. Every existing caller omits it and sees exactly the fixture it saw.
async function writeWorkItem(root, { storyStatus = "not-started" } = {}) {
  const workDir = path.join(root, "wiki", "work");
  const milestoneDir = path.join(workDir, "38_milestone_demo");
  await mkdir(milestoneDir, { recursive: true });
  await writeFile(
    path.join(milestoneDir, "SPEC.md"),
    "---\ntype: milestone\nnumber: 38\nslug: demo\nstatus: in-progress\ntitle: Demo\n---\n",
    "utf8",
  );
  const storyDir = path.join(milestoneDir, "stories", "04_story_ui-driven-assignment");
  await mkdir(storyDir, { recursive: true });
  await writeFile(
    path.join(storyDir, "STORY.md"),
    `---\ntype: story\nnumber: 04\nslug: ui-driven-assignment\nparent: 38\nstatus: ${storyStatus}\ntitle: UI Driven Assignment\n---\n`,
    "utf8",
  );
}

// ── the wire's workspaceId, per running fixture server ───────────────────────
//
// milestone 38 / story 04 — ADR-012 AMENDMENT (2026-07-24, BLOCKER F21): the
// assign wire is `{ ref, nodeId, workspaceId }`, all three REQUIRED. Every
// fixture below registers, against its server's origin, the workspaceId of the
// workspace IT stood up — so a caller can SAY "this fixture's own workspace"
// without knowing the id.
//
// REVIEW FIX F-C (architect, 2026-07-24) — it is a SENTINEL a test spells out,
// `workspaceId: "OWN"`, NEVER a default. The earlier default inverted the
// convention: `undefined` (the natural spelling of "don't send it") meant "send
// the right one" and `null` meant "omit", so a future author probing the
// anti-fallback case with the intuitive spelling would have got a PASSING
// assign. The correct idiom already shipped two arguments over (`origin:
// "SAME"`); `workspaceId` now reads the same way. Omission means omission.
const OWN_WORKSPACE = "OWN";
const workspaceIdByOrigin = new Map();

function rememberFixtureWorkspace(url, workspaceId) {
  workspaceIdByOrigin.set(new URL(url).origin, workspaceId);
}

function forgetFixtureWorkspace(url) {
  try { workspaceIdByOrigin.delete(new URL(url).origin); } catch { /* the server never listened */ }
}

// withAssignRouteFixture(fn, opts) — stands up the REAL fleet face over an
// isolated AOF_GLOBAL_HOME v3 store + a resolvable "38/04" work item. Yields
// { server, url, home, root, workspaceId, globalStoreOptions }; `fn` gets the
// live server, torn down (+ every temp dir removed) once `fn` settles either way.
//
// The workspace snapshot is PUBLISHED into the projection here (not left to a
// later seedTargetNode) because the ADR-012 AMENDMENT route resolves the posted
// workspaceId through `queryGlobalMeshStatus → status.workspaces[] →
// projectRoot`: a fixture whose `workspaces` row carries no real project_root
// would be refused `workspace-not-local` before the verb's own gates ever ran.
// A published row is also the honest shape — the fleet face can only render a
// card for a workspace the projection carries. (seedTargetNode's later
// ON CONFLICT only touches last_published_at, so a `published:false` seed still
// expresses "never published" exactly as before.)
export async function withAssignRouteFixture(fn, { scope = "global" } = {}) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-mesh-assign-route-"));
  const home = path.join(tmp, "home");
  const root = path.join(tmp, "repo");
  const distRoot = path.join(tmp, "dist");
  try {
    await writeWorkItem(root);
    await mkdir(path.join(root, ".aof"), { recursive: true });
    await writeFile(
      path.join(root, ".aof", "aof.config.json"),
      `${JSON.stringify({ name: "demo", work: { dir: "./wiki/work" }, mesh: { nodeId: "control-a" } }, null, 2)}\n`,
      "utf8",
    );
    await writeDist(meshUiDist(distRoot));

    const globalStoreOptions = { env: { AOF_GLOBAL_HOME: home } };
    const workspaceId = workspaceIdFor(root);
    const workspace = await loadWorkspace(root, undefined, globalStoreOptions);
    const store = await openGlobalWorkProjectionStore(globalStoreOptions);
    try {
      await store.publishWorkspaceSnapshot(workspace, { now: "2026-07-18T09:05:00.000Z" });
    } finally {
      store.close();
    }

    const { server, url } = await serveMeshUi({ projectDir: root, port: 0, repoRoot: distRoot, scope, globalStoreOptions });
    rememberFixtureWorkspace(url, workspaceId);
    try {
      return await fn({ server, url, home, root, distRoot, workspaceId, globalStoreOptions });
    } finally {
      forgetFixtureWorkspace(url);
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// withPublishedAssignFixture(fn, { nodes }) — task 03's fixture: a REAL end-to-end
// publish (workspace snapshot + node registry), so a node seeded here is VISIBLE
// through the REAL GET /api/mesh/status registry read (unlike seedTargetNode's
// direct-SQL rows above, which the assignWork VERB's own gates read directly but
// which carry no real registry descriptor file — queryGlobalRegistry silently
// drops a `global_nodes` row whose descriptor file does not resolve). Publishing
// this way ALSO satisfies assignWork's own repo-availability gate (membership +
// `workspaces.last_published_at`) for free — a seeded node here is both VISIBLE
// on the read side and ELIGIBLE on the write side, no seedTargetNode needed.
// `nodes` is a list of nodeIds to publish local node records for before the
// registry snapshot runs; an empty/absent list publishes the workspace with a
// bare (node-less) registry snapshot — the empty-roster case.
//
// `name` (m47/04 build prerequisite, ONE additive option in the same family) — the
// workspace's own `.aof/aof.config.json` name, which is what `publishWorkspaceSnapshot`
// records as the projection row's `name` and what region 5 renders. It defaulted — and
// still defaults — to `demo`, four characters, INSIDE `REGION5_NAME_BUDGET_CH`, so before
// this option the tree could not render a workspace name LONGER than the budget on a card
// that also carried a real assignment: the `nameDropped === true` branch was unreachable
// through the real publish path, which is why the geometry suite has never had a lane on
// it (F-47-04-QA-1). Every existing caller omits it and sees exactly the fixture it saw
// before.
//
// `name: null` publishes a NAMELESS workspace — the key is left OFF the config, so
// `workspace.config?.name ?? null` records a null row name and the card falls back to the
// workspace id. It is the SAME option rather than a second one, and it is the producer for
// DG-47-5 clause 5's fallback ("naming the workspace id where the name would be").
// `storyStatus` (m47/04) — see `writeWorkItem`: `"in-review"` gives the card a
// SECONDARY attention token, i.e. region 5's THREE-child cluster, which is the
// arity ADR-014's ladder is derived for and the one F-47-04-QA-9 found no
// fixture reaching.
//
// `distRoot` (m47/04, F-47-04-QA-12/13) — serve a REAL built `ui/dist` instead of
// this file's stub bundle. It exists for the `@uat` render lanes and for nothing
// else: a headless lane reads the mounted component tree and never fetches the
// bundle, but an operator pointing a BROWSER at this face needs the real one.
// Absent ⇒ the stub, exactly as before.
export async function withPublishedAssignFixture(fn, { nodes = [], scope = "global", name = "demo", storyStatus = "not-started", distRoot: servedDist = null, port = 0 } = {}) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-mesh-assign-published-"));
  const home = path.join(tmp, "home");
  const root = path.join(tmp, "repo");
  const distRoot = servedDist ?? path.join(tmp, "dist");
  try {
    await writeWorkItem(root, { storyStatus });
    await mkdir(path.join(root, ".aof"), { recursive: true });
    await writeFile(
      path.join(root, ".aof", "aof.config.json"),
      `${JSON.stringify({ ...(name == null ? {} : { name }), work: { dir: "./wiki/work" }, mesh: { nodeId: "control-a" } }, null, 2)}\n`,
      "utf8",
    );
    if (servedDist == null) await writeDist(meshUiDist(distRoot));

    const globalStoreOptions = { env: { AOF_GLOBAL_HOME: home } };
    const workspace = await loadWorkspace(root, undefined, globalStoreOptions);
    for (const nodeId of nodes) {
      await publishNodeRecord(workspace, nodeId, {
        nodeId,
        host: nodeId,
        os: "linux",
        runtimes: [],
        skills: [],
        aofVersion: "0.1.0",
        publishedAt: "2026-07-18T09:00:00.000Z",
      });
    }

    let workspaceId;
    const store = await openGlobalWorkProjectionStore(globalStoreOptions);
    try {
      const published = await store.publishWorkspaceSnapshot(workspace, { now: "2026-07-18T09:05:00.000Z" });
      workspaceId = published.workspaceId;
      await publishGlobalRegistryDescriptorsToStore(store, workspace, { now: "2026-07-18T09:05:00.000Z" });
    } finally {
      store.close();
    }

    const { server, url } = await serveMeshUi({ projectDir: root, port, repoRoot: distRoot, scope, globalStoreOptions });
    rememberFixtureWorkspace(url, workspaceId);
    try {
      return await fn({ server, url, home, root, distRoot, workspaceId, globalStoreOptions });
    } finally {
      forgetFixtureWorkspace(url);
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// ── the TWO-workspace fleet face (milestone 38 / story 04 / task 05) ─────────
//
// BLOCKER F21's fixture. A single-workspace fixture STRUCTURALLY cannot express
// the failure: the server's own workspace is the only workspace there is, so the
// right answer and the wrong answer are the SAME value (STATE.md's F21 lesson —
// "producer-fed constrains the DATA, not the CONFIGURATION"). This fixture
// therefore stands the REAL fleet face on workspace A while workspace B — a
// DIFFERENT repo, on the same machine, in the SAME global projection — carries
// an item at the SAME ref, exactly as the live soak did (`ref 18` existed in
// both the control's `aof` repo and `lark-guard-portal`). A mis-target therefore
// returns a plausible `200` and mints, instead of erroring.
//
// A third workspace (`gone`) is published and then DELETED from disk — the
// ordinary shape of a row another machine published into a synced projection.
async function writeCollidingRepo(root, { name, milestones, meshEnabled = false }) {
  const workDir = path.join(root, "wiki", "work");
  // A repo with NO milestones still gets its work dir — that is what makes a QUIET workspace
  // a REAL published snapshot of a repo whose `wiki/work` is empty rather than a trimmed
  // payload (m47/03 build prerequisite; the two are indistinguishable on the wire and only
  // one of them proves production can reach the state).
  await mkdir(workDir, { recursive: true });
  for (const milestone of milestones) {
    const milestoneDir = path.join(workDir, `${milestone.number}_milestone_${milestone.slug}`);
    await mkdir(milestoneDir, { recursive: true });
    await writeFile(
      path.join(milestoneDir, "SPEC.md"),
      // `status` (2026-09-11) — a milestone may be written DONE so the fleet's default open-work view
      // has something real to hide; absent, it is in-progress as it always was.
      `---\ntype: milestone\nnumber: ${milestone.number}\nslug: ${milestone.slug}\nstatus: ${milestone.status ?? "in-progress"}\ntitle: ${milestone.title}\n---\n`,
      "utf8",
    );
    // `inReview` (m47/04, F-47-04-QA-9/10) — real stories in the `in-review`
    // status, which is what `milestoneCardModels` tallies into `inReview` and
    // therefore what gives THIS card's region 5 a secondary attention token, i.e.
    // a THREE-child cluster. Absent (the default) ⇒ no stories at all, exactly
    // the milestone every existing caller measures against.
    for (let n = 1; n <= (milestone.inReview ?? 0); n += 1) {
      const storyDir = path.join(milestoneDir, "stories", `0${n}_story_under-review`);
      await mkdir(storyDir, { recursive: true });
      await writeFile(
        path.join(storyDir, "STORY.md"),
        `---\ntype: story\nnumber: 0${n}\nslug: under-review\nparent: ${milestone.number}\nstatus: in-review\ntitle: Under Review ${n}\n---\n`,
        "utf8",
      );
    }
  }
  await mkdir(path.join(root, ".aof"), { recursive: true });
  // `mesh.enabled` decides whether the published registry descriptor reads `meshEnabled: true`
  // (global-node-registry.mjs:130), and THAT is what makes a workspace "disabled/skipped" in
  // the diagnostics strip (global-mesh-query.mjs:393-399 — a REAL derivable fact, never an
  // edited payload). It is absent by default, exactly as it always was here, so every existing
  // caller sees the shape it saw before.
  const mesh = meshEnabled ? { nodeId: "control-a", enabled: true } : { nodeId: "control-a" };
  await writeFile(
    path.join(root, ".aof", "aof.config.json"),
    `${JSON.stringify({ name, work: { dir: "./wiki/work" }, mesh }, null, 2)}\n`,
    "utf8",
  );
}

// withTwoWorkspaceAssignFixture(fn) — the REAL serveMeshUi bound to workspace A
// (the DAEMON's own launch dir) with workspace B + a vanished workspace live in
// the SAME global projection the face reads. `worker-a` is published from BOTH A
// and B, so it is VISIBLE on the read side (GET /api/mesh/status.nodes — what the
// picker is fed) and ELIGIBLE on the write side for EITHER workspace: a
// mis-targeted assign is not caught incidentally by the repo gate, it succeeds.
//
// MEASURED 2026-08-11, because the sentence above says less than a reader assumes and the
// difference is load-bearing for m47/03: a node RECORD is machine-global
// (`mesh-store.mjs`'s `publishNodeRecord` writes under the global home, not under the
// workspace), so every registry snapshot taken AFTER it exists enrols that node into the
// workspace it is taken for. On the default path `worker-a` therefore ends up a member of
// ALL FOUR workspaces, not two — which makes ADR-004 rule 2's membership narrowing
// unobservable here, since narrowing a roster where every node is a member of every repo
// removes nothing. `rosterMembership: "publishers"` is the opt-in that produces the shape
// the fixture's own header always described (see below); the default is left EXACTLY as it
// was so every pre-m47 caller measures against the payload it measured against before.
//
// Yields { url, home, root, workspaceIdA, workspaceIdB, workspaceIdGone, titles }.
// milestone 47 / story 03 — TWO OPT-IN SHAPES, both OFF by default so every existing caller
// sees the fixture it saw before (four workspaces, six milestones, one node):
//
//   `quiet: true`       — publishes a FIFTH workspace whose `wiki/work` is EMPTY. It is a REAL
//                         published snapshot of a real repo, which is the whole point: "the repo
//                         is on the mesh and quiet" (task 02 row 2) has no other producer, and a
//                         hand-cut status object would prove the copy and nothing about whether
//                         production can reach the state.
//   `diagnostics: true` — makes the compound region's two halves DIFFER. `control` and `portal`
//                         publish with `mesh.enabled: true` so they are NOT skipped, leaving
//                         exactly TWO skipped workspaces (`elsewhere`, `rekeyed`) in two
//                         DIFFERENT repos; and a fifth node `worker-x` is published and then has
//                         its registry descriptor removed, which is the producer for a REAL
//                         `descriptorErrors` row (global-node-registry.mjs:311-316 pushes the
//                         read failure) — a row that carries a descriptor PATH and no workspace,
//                         i.e. ADR-004's one declared machine-wide collection. The roster is
//                         unchanged by it: a node whose descriptor does not resolve is dropped
//                         from `nodes` in the same pass.
//
// …and ONE opt-in ROSTER SHAPE, for the same reason and off by default:
//
//   `rosterMembership:    — the roster's memberships follow the REAL publish ORDERING rather
//    "publishers"`         than the machine-global node store's accident, producing the two
//                          shapes ADR-010's §Consequences names and nothing else:
//                            · `worker-a` ∈ { control, portal } — the MULTI-WORKSPACE node,
//                              which is what this fixture's header has always claimed;
//                            · `worker-b` ∈ { portal } — the FOREIGN-WORKSPACE node, a member
//                              of a repo the SERVED workspace is not.
//                          It is achieved by taking each group's registry snapshot BEFORE the
//                          next node record exists on this machine — a real ordering, never an
//                          edited row or a predicate deleting inconvenient rows.
//
//                          BOTH ARE LOAD-BEARING AND THE SECOND IS THE ONE ADR-010 CALLS "the
//                          non-vacuity half and the one that matters" (F-47-03-QA-1). Without
//                          the first, a repo filter cannot be told from a passthrough on the
//                          roster (every node is a member of every repo) and the composed
//                          OUT-OF-SCOPE empty state is unreachable. Without the second, the
//                          PARTIAL intersection is proved only vacuously: at
//                          `?scope=local&repo=<portal>` a build implementing ADR-010's REJECTED
//                          clause 3 — gate the roster by the served `status.workspaceId` FIRST,
//                          then by repo — renders a BYTE-IDENTICAL page, because every survivor
//                          happens to be a member of the served workspace too. `worker-b` is
//                          the row that build drops and a correct one keeps.
//
//                          The default is `"all"`, and it publishes NEITHER shape, so every
//                          pre-m47 caller measures against exactly the payload it always did.
//
// …and ONE opt-in ATTENTION shape (m47/04, F-47-04-QA-9/10), off by default for the same
// reason:
//
//   `secondaryToken: true` — workspace A's ref-18 milestone (the collision pair's own card,
//                          the one a lane assigns to) publishes ONE story `in-review`, so
//                          that card's region 5 renders `◔ 1 in review` beside its chip and
//                          its attention cluster has THREE children while its neighbours
//                          keep two. It is the only way a lane about "every card on the
//                          page reads the same way" can mean it across ARITIES — and the
//                          arity is what ADR-014's whole ladder is derived for.
export async function withTwoWorkspaceAssignFixture(fn, { scope = "global", quiet = false, diagnostics = false, rosterMembership = "all", secondaryToken = false, finished = 0 } = {}) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-mesh-assign-two-ws-"));
  const home = path.join(tmp, "home");
  const rootA = path.join(tmp, "control-repo");
  const rootB = path.join(tmp, "portal-repo");
  const rootGone = path.join(tmp, "vanished-repo");
  const rootRekeyed = path.join(tmp, "rekeyed-repo");
  const rootQuiet = path.join(tmp, "quiet-repo");
  const distRoot = path.join(tmp, "dist");
  const titles = {
    // The soak's REAL collision, kept verbatim so the regression reads as what
    // actually happened: ref 18 is a DIFFERENT milestone in each workspace.
    A: "Per-folder integration descriptor",
    B: "Homedata Live Property Data",
  };
  try {
    await writeCollidingRepo(rootA, {
      name: "control",
      meshEnabled: diagnostics,
      milestones: [
        { number: 18, slug: "integration-descriptor", title: titles.A, inReview: secondaryToken ? 1 : 0 },
        { number: 31, slug: "control-only", title: "Control Only" },
        // `finished` (2026-09-11) — N DONE milestones in the control repo, for the status view.
        ...Array.from({ length: finished }, (_, i) => ({ number: 52 + i, slug: `shipped-${i}`, title: `Shipped ${i}`, status: "done" })),
      ],
    });
    await writeCollidingRepo(rootB, {
      name: "portal",
      meshEnabled: diagnostics,
      milestones: [
        { number: 18, slug: "homedata-live", title: titles.B },
        { number: 44, slug: "portal-only", title: "Portal Only" },
      ],
    });
    await writeCollidingRepo(rootGone, {
      name: "elsewhere",
      milestones: [{ number: 18, slug: "published-by-another-machine", title: "Published Elsewhere" }],
    });
    await writeCollidingRepo(rootRekeyed, {
      name: "rekeyed",
      milestones: [{ number: 18, slug: "re-keyed-checkout", title: "Re-keyed Checkout" }],
    });
    if (quiet) await writeCollidingRepo(rootQuiet, { name: "quiet-repo", milestones: [] });
    await writeDist(meshUiDist(distRoot));

    const globalStoreOptions = { env: { AOF_GLOBAL_HOME: home } };
    const workspaceA = await loadWorkspace(rootA, undefined, globalStoreOptions);
    const workspaceB = await loadWorkspace(rootB, undefined, globalStoreOptions);
    const workspaceGone = await loadWorkspace(rootGone, undefined, globalStoreOptions);
    const workspaceRekeyed = await loadWorkspace(rootRekeyed, undefined, globalStoreOptions);
    const workspaceQuiet = quiet ? await loadWorkspace(rootQuiet, undefined, globalStoreOptions) : null;
    const publishers = [workspaceA, workspaceB];
    const nonPublishers = [workspaceGone, workspaceRekeyed, ...(workspaceQuiet ? [workspaceQuiet] : [])];
    const publishNode = (workspace, nodeId) =>
      publishNodeRecord(workspace, nodeId, {
        nodeId,
        host: nodeId,
        os: "linux",
        runtimes: [],
        skills: [],
        aofVersion: "0.1.0",
        publishedAt: "2026-07-24T09:00:00.000Z",
      });

    const publishWorkerRecords = async () => {
      for (const workspace of publishers) await publishNode(workspace, "worker-a");
      // The descriptor-error producer (see the header): a REAL published node whose registry
      // descriptor is then removed. Published from `control` only, so its removal cannot change
      // any other repo's membership facts.
      if (diagnostics) await publishNode(workspaceA, "worker-x");
    };

    // THE ORDER IS THE ROSTER SHAPE, and it is a REAL ordering rather than an edited row: a
    // registry snapshot enrols whatever node records exist on this machine AT THE MOMENT IT IS
    // TAKEN. On the default path every record exists before any snapshot, so every workspace
    // gets every node.
    //
    // Under `rosterMembership: "publishers"` the snapshots are taken in THREE GROUPS, and each
    // boundary is one membership fact (see the header):
    //   1. the NON-publishers, while no node record exists at all  → they carry no members;
    //   2. `worker-a` (and `worker-x`), then CONTROL                → control carries worker-a;
    //   3. `worker-b`, then PORTAL                                  → portal carries BOTH.
    // So `worker-a` is the MULTI-WORKSPACE node and `worker-b` is the FOREIGN-WORKSPACE one —
    // a member of `portal`, which the served workspace is not. The third group exists because
    // the second alone leaves every survivor of `?scope=local&repo=<portal>` a member of the
    // served workspace too, and a build gating the roster by `status.workspaceId` (ADR-010's
    // REJECTED clause 3) would render an identical page.
    const publishersOnly = rosterMembership === "publishers";
    if (!publishersOnly) await publishWorkerRecords();

    const store = await openGlobalWorkProjectionStore(globalStoreOptions);
    const registry = (workspace) => publishGlobalRegistryDescriptorsToStore(store, workspace, { now: "2026-07-24T12:00:00.000Z" });
    try {
      for (const workspace of [...publishers, ...nonPublishers]) {
        await store.publishWorkspaceSnapshot(workspace, { now: "2026-07-24T12:00:00.000Z" });
      }
      if (publishersOnly) {
        for (const workspace of nonPublishers) await registry(workspace);
        await publishWorkerRecords();
        await registry(workspaceA);
        await publishNode(workspaceB, "worker-b");
        await registry(workspaceB);
      } else {
        for (const workspace of [...publishers, ...nonPublishers]) await registry(workspace);
      }
    } finally {
      store.close();
    }

    const workspaceIdA = workspaceIdFor(rootA);
    const workspaceIdB = workspaceIdFor(rootB);
    const workspaceIdGone = workspaceIdFor(rootGone);
    const workspaceIdRekeyed = workspaceIdFor(rootRekeyed);
    const workspaceIdQuiet = quiet ? workspaceIdFor(rootQuiet) : null;

    // …and the removal, AFTER the registry publish that wrote the descriptor file. The
    // `global_nodes` row survives, its descriptor does not, and `queryGlobalRegistry` records
    // the failed read as a `descriptorErrors` entry while dropping the node from the roster.
    if (diagnostics) await dropNodeFromRoster({ home }, "worker-x");

    // The vanished workspace's projection row survives its checkout; the path
    // does not — `workspace-not-local`'s producer, never a hand-built row.
    await rm(rootGone, { recursive: true, force: true });

    // The RE-KEYED checkout: its projection row still carries the path-derived
    // id it was published under, but the checkout now declares an explicit
    // `mesh.workspaceId` override. Resolution succeeds and the path exists — yet
    // the workspace object assignWork would be handed identifies itself as
    // something ELSE, so the mint would stamp a DIFFERENT id than the operator
    // clicked. That is F21's exact shape one level down, and it is what the
    // pre-mint identity assertion (inv.6) exists to make impossible. Produced by
    // re-writing the real config after the real publish — never a hand-built row.
    const rekeyedAs = "ffffffffffffffff";
    await writeFile(
      path.join(rootRekeyed, ".aof", "aof.config.json"),
      `${JSON.stringify({ name: "rekeyed", work: { dir: "./wiki/work" }, mesh: { nodeId: "control-a", workspaceId: rekeyedAs } }, null, 2)}\n`,
      "utf8",
    );

    const { server, url } = await serveMeshUi({ projectDir: rootA, port: 0, repoRoot: distRoot, scope, globalStoreOptions });
    // The DEFAULT for this fixture is deliberately the DAEMON's own workspace A:
    // a caller that forgets to name a workspace gets exactly the value F21 used
    // to assume, so a test that means "assign B's card" must SAY so.
    rememberFixtureWorkspace(url, workspaceIdA);
    try {
      return await fn({
        server, url, home, distRoot, globalStoreOptions, titles,
        rootA, rootB, rootGone, rootRekeyed, rootQuiet,
        workspaceIdA, workspaceIdB, workspaceIdGone, workspaceIdRekeyed, workspaceIdQuiet, rekeyedAs,
      });
    } finally {
      forgetFixtureWorkspace(url);
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// ── the two DEGENERATE faces every fleet lane eventually needs ────────────────
//
// withEmptyFleetFace(fn) — a REAL `serveMeshUi` over an isolated projection NOTHING has
// published into: the empty fleet, PRODUCED rather than painted. withRefusingFace(fn) — a face
// that answers `/api/mesh/status` with the coded 503 the global store mints when it is
// unavailable: the error state's own producer.
//
// Both are lifted here from `test/ui/fleet-boards-branch-deleted.test.mjs`, where 47/01 wrote them
// as file-local helpers, because m47/03's four task features need the same two faces in four
// more files and a fifth copy of "what an empty mesh looks like" is how two lanes start
// disagreeing about it. That suite's own copies are left untouched — this is an addition, not a
// migration.
//
// [F-47-03-ARCH-3, 2026-08-11] AND LEAVING THEM WAS THE FINDING: the sentence above treats a
// duplicate as harmless if nobody migrates it, and by the time the review read this file BOTH
// remaining copies of the refusal face had already drifted from this one on the same row — the
// 503's `path`. m47/03's own copy is deleted (its lane now calls `withRefusingFace` with the
// options below); 47/01's pair in `test/ui/fleet-boards-branch-deleted.test.mjs:129-169` is NOT
// touched here, because that file is another story's and 47/04 is editing its neighbours in
// parallel. It is the outstanding half of this finding and is reported as such, not silently
// tolerated: its `withRefusingFace` still mints a body with no `path`, so its error-state lanes
// measure a page the producer cannot serve.
export async function withEmptyFleetFace(fn) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-fleet-empty-"));
  const root = path.join(tmp, "repo");
  const distRoot = path.join(tmp, "dist");
  try {
    await mkdir(path.join(root, ".aof"), { recursive: true });
    await writeFile(
      path.join(root, ".aof", "aof.config.json"),
      `${JSON.stringify({ name: "quiet", work: { dir: "./wiki/work" } }, null, 2)}\n`,
      "utf8",
    );
    await writeDist(meshUiDist(distRoot));
    const home = path.join(tmp, "home");
    const { server, url } = await serveMeshUi({
      projectDir: root,
      port: 0,
      repoRoot: distRoot,
      globalStoreOptions: { env: { AOF_GLOBAL_HOME: home } },
    });
    try {
      return await fn({ url, home, root });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// THE REFUSAL BODY, MINTED ONCE (F-47-03-ARCH-3, must-fix, closed here). It is `sendApiError`'s
// shape for a global-store-unavailable read — INCLUDING the `path` row, which is not decoration:
// `errorPathFor` (`ui/src/fleet/scope.mjs`) prefers the thrown error's own `path` because a
// FIRST-LOAD failure leaves `status` null, so it is the only source for the error state's
// `Global mesh store: <path>` line. A body without it renders a strictly less honest page.
//
// It is a constant because it had already drifted twice: `test/ui/fleet-filter-address.test.mjs` and
// `test/ui/fleet-boards-branch-deleted.test.mjs` each re-typed this object inline and BOTH dropped
// `path`, so two lanes were asserting the error state over a payload the producer does not send.
// `test/ui/fleet-empty-states.test.mjs`'s "no way of arriving at nothing is dressed as a failure"
// lane is the behavioural pin on the row (it asserts `Global mesh store: ` is rendered), and it
// only holds for faces that read from HERE.
const GLOBAL_STORE_UNAVAILABLE_503 = {
  ok: false,
  error: "The global mesh store is unavailable.",
  code: "global-store-unavailable",
  path: "/tmp/aof/global-mesh.sqlite",
};

// withRefusingFace(fn, { refusals, proxyTo }) — the error state's own producer.
//
// By default it refuses EVERY request, which is what a face standing in for an unreachable global
// store does and is exactly the behaviour every existing caller measures against.
//
// `proxyTo` makes it refuse the FIRST `refusals` reads of `/api/mesh/status` and then PROXY that
// origin, which is the shape the Retry lane needs: "Retry must re-attempt WITH the filter in
// force" is only worth asserting if the retry meets a REAL payload rather than a fixture's idea
// of one. That lane used to stand up its own `http.createServer` for it, and paid the divergence
// above; the option is here because a second copy of "what a refusal looks like" is how two lanes
// start disagreeing about it (the same reason both faces were lifted into this file at all).
export async function withRefusingFace(fn, { refusals = Infinity, proxyTo = null } = {}) {
  let refused = 0;
  const server = http.createServer(async (request, response) => {
    const wantsStatus = String(request.url ?? "").startsWith("/api/mesh/status");
    // With no `proxyTo` there is nothing to fall through TO, so every request is refused — the
    // pre-existing behaviour, unchanged and not made conditional on the URL.
    if (proxyTo == null || (wantsStatus && refused < refusals)) {
      if (wantsStatus) refused += 1;
      response.writeHead(503, { "content-type": "application/json" });
      response.end(JSON.stringify(GLOBAL_STORE_UNAVAILABLE_503));
      return;
    }
    const upstream = await fetch(new URL(request.url, proxyTo));
    const body = await upstream.text();
    response.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") ?? "application/json" });
    response.end(body);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    // `refusalCount()` so a lane can prove its own premise — that the face really did refuse —
    // rather than inferring it from the page it produced.
    return await fn({ url: `http://127.0.0.1:${server.address().port}`, refusalCount: () => refused });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// publishRepoInto({ home, root }, { name, milestones }) — write and PUBLISH one more repo into
// an already-running fixture's projection, the way another machine's sync does while a page is
// open (m47/03 task 00's re-poll lane). It is the same real path the fixture itself takes —
// `writeCollidingRepo` → `loadWorkspace` → `publishWorkspaceSnapshot` +
// `publishGlobalRegistryDescriptorsToStore` — so what the next poll delivers is a real payload
// rather than an injected one. Returns the new workspace's id.
export async function publishRepoInto({ home, root }, { name, milestones = [], now = "2026-07-24T13:00:00.000Z" } = {}) {
  const globalStoreOptions = { env: { AOF_GLOBAL_HOME: home } };
  await writeCollidingRepo(root, { name, milestones });
  const workspace = await loadWorkspace(root, undefined, globalStoreOptions);
  const store = await openGlobalWorkProjectionStore(globalStoreOptions);
  try {
    await store.publishWorkspaceSnapshot(workspace, { now });
    await publishGlobalRegistryDescriptorsToStore(store, workspace, { now });
  } finally {
    store.close();
  }
  return workspaceIdFor(root);
}

// postAssign(url, opts) — the REAL same-origin JSON POST helper. `origin: "SAME"`
// resolves to this server's OWN origin (the exact string a same-origin browser
// fetch sends); any other string rides through verbatim (a cross-origin probe);
// `origin: undefined` (the default) sends NO Origin header at all (the bare/
// no-origin case). `rawBody`, when supplied, overrides the JSON-encoded
// { ref, nodeId, workspaceId } body entirely (a malformed/non-JSON-body probe).
//
// `workspaceId` (ADR-012 AMENDMENT — the REQUIRED third wire field; REVIEW FIX
// F-C — a sentinel, never a default):
//   - "OWN"    ⇒ this fixture server's OWN workspace id (the value a real card
//                carries for an item that belongs to it) — the caller SAYS it,
//                exactly as `origin: "SAME"` is said;
//   - a string ⇒ ridden verbatim, including "" (the blank-field probe);
//   - omitted / null ⇒ the field is left OFF the body entirely (the stale-client
//                / anti-fallback probe — it must be a coded 400, never a silent
//                fallback to the daemon's own workspace).
export async function postAssign(url, { ref, nodeId, workspaceId, origin, contentType = "application/json", rawBody } = {}) {
  const headers = {};
  if (origin !== undefined) headers.origin = origin === "SAME" ? new URL(url).origin : origin;
  if (contentType !== undefined) headers["content-type"] = contentType;
  const resolvedWorkspaceId = workspaceId === OWN_WORKSPACE
    ? workspaceIdByOrigin.get(new URL(url).origin)
    : workspaceId;
  if (workspaceId === OWN_WORKSPACE && resolvedWorkspaceId == null) {
    throw new Error(`postAssign: no fixture workspace is registered for ${url} — "OWN" cannot resolve`);
  }
  const payload = { ref, nodeId };
  if (resolvedWorkspaceId != null) payload.workspaceId = resolvedWorkspaceId;
  const body = rawBody !== undefined ? rawBody : JSON.stringify(payload);
  return fetch(new URL("/api/mesh/assign", url), { method: "POST", headers, body });
}

// sameOriginAssign(url, ref, nodeId, workspaceId) — the convenience happy-path
// caller: a same-origin, application/json POST carrying { ref, nodeId,
// workspaceId }. `workspaceId` is spelled out at every call site — "OWN" for
// this fixture's own workspace, or a real id (F-C: the fixture's own workspace
// is something a test SAYS, not something an omitted field means).
export function sameOriginAssign(url, ref, nodeId, workspaceId) {
  return postAssign(url, { ref, nodeId, workspaceId, origin: "SAME", contentType: "application/json" });
}

// ── THE `@uat` RENDER FACE (m47/04 — F-47-04-QA-12 / F-47-04-QA-13) ──────────
//
// WHY IT EXISTS, AND WHY IT IS NOT A SOAK READ. Story 04's whole benefit is that
// the target reads FURTHER once region 5 gives up its name column, and the form
// where that is visible is the ABBREVIATED one — `→ <target>` past the
// abbreviation point, on a card whose attention cluster has three children.
// NOTHING ON THE LIVE MESH REACHES EITHER: every node id on the soak is short
// enough that no rung fires, so the designer's render of the live fleet could
// only ever judge the unpressured row, and the `@uat` verdict would be taken on
// the one frame the contract is not about. That is the finding, and this is its
// remedy — the SAME fixture builder the headless lanes use, stood up on a real
// port over an isolated projection, with a REAL assignment minted through the
// REAL route so nothing on screen is painted.
//
//   node test/support/mesh-ui-assign-fixture.mjs [--port <n>] [--node <id>]
//
// It prints the two addresses the `@uat` scenarios name (unfiltered / repo=…)
// and holds the face open until interrupted. `ui/dist` must be BUILT — this face
// serves the real bundle, because a browser needs one; the headless lanes never
// fetch it and are unaffected either way.
//
// IT STARTS NOTHING ELSE AND TOUCHES NOTHING ELSE: its own temp AOF_GLOBAL_HOME,
// its own temp repo, its own port, removed when it exits. It is not the desktop
// app, not a daemon, and it is deliberately the operator's to run — a developer
// taking the render themselves is how a `@uat` verdict stops being a human's.
export async function uatRenderFace({ port = 4199, node = "umamis-mac-mini-build-agent-02", repoRoot = null } = {}) {
  // `distRoot` is a REPO ROOT (the fixture hands it to `serveMeshUi` as
  // `repoRoot`, which resolves `<root>/ui/dist` itself) — not the dist directory.
  // Measured the hard way: passing `meshUiDist(...)` here produced
  // `ui/dist/ui/dist` and a `ui-build-missing` refusal.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const servedDist = repoRoot ?? path.resolve(here, "..", "..");
  return new Promise((resolve, reject) => {
    withPublishedAssignFixture(
      async ({ url, workspaceId }) => {
        const minted = await sameOriginAssign(url, "38", node, "OWN");
        if (!minted.ok) throw new Error(`the fixture could not mint its assignment (${minted.status})`);
        // `serveMeshUi` hands back an origin WITH a trailing slash, so the join
        // is done through `URL` rather than by concatenation — a printed
        // `//fleet` is a link an operator would paste and a path the router does
        // not serve.
        const fleet = (search) => new URL(`/fleet?${search}`, url).href;
        process.stdout.write([
          "",
          `  region 5's @uat render face — workspace ${workspaceId}, target ${JSON.stringify(node)} (${node.length} characters)`,
          `  the card carries a REAL minted chip AND a secondary token, so its attention cluster has THREE children`,
          "",
          `  UNFILTERED   ${fleet("scope=global")}`,
          `  REPO-FILTERED ${fleet(`scope=global&repo=${workspaceId}`)}`,
          "",
          "  Take the widths the scenarios name (1280, 390, 768, 1440) in both addresses.",
          "  Ctrl-C to tear the face and its projection down.",
          "",
        ].join("\n"));
        await new Promise((stop) => {
          process.once("SIGINT", stop);
          process.once("SIGTERM", stop);
        });
      },
      { nodes: [node], name: "demo", storyStatus: "in-review", distRoot: servedDist, port },
    ).then(resolve, reject);
  });
}

// Runnable directly — the operator's door, and the reason this lives beside the
// fixture it stands up rather than in a script that would re-type it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (flag, fallback) => {
    const at = process.argv.indexOf(flag);
    return at > 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
  };
  await uatRenderFace({ port: Number(arg("--port", "4199")), node: arg("--node", undefined) });
}
