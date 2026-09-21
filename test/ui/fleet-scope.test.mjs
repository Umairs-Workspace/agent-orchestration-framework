// Traceability wiring for milestone 34 / story 03 — ui/src/fleet/scope.mjs, the
// pure render-decision helper Fleet.tsx imports for the two @executable UI task
// features. There is NO React test harness in this repo (no vitest/testing-
// library) — per the house pattern (terminal-dock.test.mjs / action.test.mjs),
// render-logic node:test exercises the PURE .mjs module directly, headlessly.
//
//   02_fleet-ui-scope-rendering.feature (@executable):
//     - the scope control shows Global/Local as active;
//     - switching scope updates the URL (scope=<local|global>) without a remount;
//     - a local-populated payload filters out any other workspace's data;
//     - loading keeps the required regions "stable" (the state selector never
//       throws on a null/pending status, and its result names a real state);
//     - no rendered field carries a credential-shaped key ("relayAuth", "token",
//       "secret", "credential") — node id/role/host/last-seen/fabric address
//       still surface.
//   03_empty-error-and-health-states.feature (@executable):
//     - a global empty payload reads "empty" (never "error") with copy that does
//       NOT call the mesh broken/failed and DOES name "published";
//     - local stays usable/populated independent of a global error;
//     - diagnostics summarise projection freshness + skipped workspace/descriptor
//       error counts without dropping the healthy node/workspace data.
//
//   milestone 130 / story 03 — EXTENDED (test/ui is at its ceiling) with:
//     03_the-line-and-the-button-are-pure.feature (@executable) — fleetLoopLines,
//       loopStopAffordance, rememberStopRung (runs.mjs) and nodeWorkRegion (scope.mjs),
//       driven headlessly, with fleetCurrentWorkLines / nodeCurrentWork byte-identical;
//     04_the-card-renders-and-repins.feature (@executable lanes) — the REAL <Fleet/> mounted
//       through the fleet app harness against a REAL serveMeshUi fixture: the loop rows, the
//       one button on this node's card, the click through the real route, the hold, the rung
//       memory, the refusal slot, the budgets and the FF-5307 re-pin.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fleetCurrentWorkLines, fleetLoopLines, loopStopAffordance, rememberStopRung } from "../../ui/src/fleet/runs.mjs";
import { POLL_MS, ASSIGN_SENT_HOLD_MS, ASSIGN_TIMEOUT_MS } from "../../ui/src/fleet/assign-affordance.mjs";
import { removeWorkspaceFromProjection, withPublishedAssignFixture } from "../support/mesh-ui-assign-fixture.mjs";
import { withFleetApp, findAll, textOf } from "../support/fleet-app-harness.mjs";
import { assemblePresenceRecord, publishPresenceRecord } from "../../src/mesh/presence.mjs";
import { globalMeshPaths } from "../../src/workspace.mjs";
import { loopStopsDir } from "../../src/loop/stop-request.mjs";
import { serveMeshUi, meshUiDist } from "../../src/mesh/ui-serve.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { openGlobalWorkProjectionStore } from "../../src/global-work-store.mjs";
import { publishGlobalRegistryDescriptorsToStore } from "../../src/global-node-registry.mjs";
import { publishNodeRecord } from "../../src/mesh/store.mjs";
// FF-11902 — "no new file under ui/src/fleet/" is the directory budget's ceiling, read from its ONE
// home rather than retyped here as a count the next story to move a file would pay for.
import { UI_DIRECTORY_BUDGETS } from "../arch/testing/acd-ui-directory-budget.test.mjs";
import {
  VALID_SCOPES,
  scopeLabel,
  isValidScope,
  withScopeParam,
  scopeFromSearch,
  pageState,
  isEmptyStatus,
  emptyStateCopy,
  filterToWorkspace,
  withoutCredentialFields,
  isCredentialField,
  nodePanelFacts,
  nodeCurrentWork,
  nodeWorkRegion,
  diagnosticsSummary,
  errorPathFor,
  milestoneListItems,
  milestoneCardModels,
  repoFromSearch,
  withRepoParam,
  isEmptyView,
  resolvedRepoName,
  DEFAULT_WORK_STATUS_FILTER,
  WORK_STATUS_FILTERS,
  workStatusFilterLabel,
  workStatusFromSearch,
  withWorkStatusParam,
  workStatusAdmits,
  filterToWorkStatus,
  hiddenMilestoneCount,
  workStatusSummaryTail,
} from "../../ui/src/fleet/scope.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ── milestone 130 / story 03 fixtures ─────────────────────────────────────────────────────

// The DESIGN's pinned classes (§Surface 1's button table; the message slot).
const STOP_MUTED = "shrink-0 rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-50";
const STOP_DESTRUCTIVE = "shrink-0 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive transition disabled:cursor-not-allowed disabled:opacity-50";
const MESSAGE_CLASS = "mono min-w-0 shrink truncate text-[10.5px] text-destructive";
const LOOP_ROW_CLASS = "flex items-center gap-2 text-[13px] font-semibold text-primary";

// The task-03 loop entry, with overrides.
function E1(overrides = {}) {
  return { loopRunId: "L1", workspaceId: "w1", scope: "129", level: "L2", cap: 3, phase: "continue", cycle: 1, ref: "129/04", runId: "r1", supervised: false, stop: null, ...overrides };
}

const className = (node) => (typeof node?.props?.className === "string" ? node.props.className : "");

// The node card that names `nodeId` — the rounded-lg bg-card div whose identity row carries it.
function nodeCard(app, nodeId) {
  return findAll(app.tree(), (node) =>
    node.type === "div"
    && className(node).includes("rounded-lg border border-border bg-card")
    && findAll(node, (inner) => inner.type === "span" && className(inner).includes("font-bold") && textOf(inner) === nodeId).length > 0)[0] ?? null;
}

// The current-work region's PINNED lines: the text-[13px] <p>s that are not loop rows.
function regionLines(card) {
  return findAll(card, (node) => node.type === "p" && className(node).startsWith("text-[13px]"));
}

// The loop rows: the flex-row <p>s the DESIGN pins.
function loopRows(card) {
  return findAll(card, (node) => node.type === "p" && className(node) === LOOP_ROW_CLASS);
}

const rowText = (row) => (row.children ?? []).find((child) => child && child.type === "span" && className(child) === "min-w-0 truncate") ?? null;
const rowButton = (row) => (row.children ?? []).find((child) => child && child.type === "button") ?? null;
const rowMessage = (row) => (row.children ?? []).find((child) => child && child.type === "span" && className(child).includes("text-destructive")) ?? null;
const stopButtons = (tree) => findAll(tree, (node) => node.type === "button" && ["Stop", "Stop now"].includes(textOf(node)));
const clickEvent = () => ({ stopPropagation() {}, preventDefault() {} });

async function filesBelow(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ["node_modules", "dist"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await filesBelow(full));
    else if (/\.(?:mjs|js|ts|tsx|mts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Stream 129 with item 129/04 under `root`'s work dir, carrying ONE run record `r1` — running,
// a usable brief.loop under L1 over scope 129, a fresh heartbeat — the record the route's verb
// reads. `node` / `brief` rearrange it for a refusal lane.
async function writeLoopStream129(root, { state = "running", node = "control-a", brief } = {}) {
  const milestoneDir = path.join(root, "wiki", "work", "129_milestone_loop");
  const storyDir = path.join(milestoneDir, "stories", "04_story_wave");
  await mkdir(path.join(storyDir, "runs"), { recursive: true });
  await writeFile(path.join(milestoneDir, "SPEC.md"), "---\ntype: milestone\nnumber: 129\nslug: loop\nstatus: in-progress\ntitle: Loop\n---\n", "utf8");
  await writeFile(path.join(storyDir, "STORY.md"), "---\ntype: story\nnumber: 04\nslug: wave\nparent: 129\nstatus: in-progress\ntitle: Wave\n---\n", "utf8");
  const now = new Date().toISOString();
  const record = {
    runId: "r1", itemRef: "129/04", state, attempt: 1, outcome: state === "running" ? null : state, sessionId: null,
    brief: brief ?? { loop: { loopRunId: "L1", scope: "129", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: "2026-09-13T00:00:00.000Z", id: "loop-id", supervised: false } },
    createdAt: "2026-09-13T00:00:00.000Z", updatedAt: now, failureReason: null, heartbeatAt: now, retryOf: null, reclaimedAt: null, node,
  };
  await writeFile(path.join(storyDir, "runs", "r1.json"), JSON.stringify(record, null, 2), "utf8");
}

// Publish a node's presence record into the fixture home's mesh root — what the REAL registry
// read serves on the next poll. `loops: undefined` publishes no key (the omitted-when-empty rule).
async function publishPresence(home, nodeId, { activeRuns = ["r1"], loops } = {}) {
  const presenceWorkspace = { globalMeshRoot: globalMeshPaths({ env: { AOF_GLOBAL_HOME: home } }).meshRoot };
  await publishPresenceRecord(presenceWorkspace, nodeId, assemblePresenceRecord({ nodeId, heartbeatAt: new Date().toISOString(), activeRuns, sessions: [], aofVersion: "0.1.0", loops }));
}

// A serving face whose repo commits NO mesh.nodeId (the unconfigured machine), with the same two
// node records and its workspace published — the row-3 fixture of the local-only scenario.
async function withUnconfiguredFace(fn) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-fleet-loop-unconfigured-"));
  const home = path.join(tmp, "home");
  const root = path.join(tmp, "repo");
  const distRoot = path.join(tmp, "dist");
  let server;
  try {
    await mkdir(path.join(root, "wiki", "work"), { recursive: true });
    await mkdir(path.join(root, ".aof"), { recursive: true });
    await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "demo", work: { dir: "./wiki/work" }, mesh: { enabled: true } }, null, 2)}\n`, "utf8");
    await mkdir(path.join(meshUiDist(distRoot), "assets"), { recursive: true });
    await writeFile(path.join(meshUiDist(distRoot), "index.html"), "<!doctype html><html><head><script type=\"module\" src=\"/assets/index-abc123.js\"></script></head><body><div id=\"root\"></div></body></html>\n", "utf8");
    await writeFile(path.join(meshUiDist(distRoot), "assets", "index-abc123.js"), "export const x = 1;\n", "utf8");
    const globalStoreOptions = { env: { AOF_GLOBAL_HOME: home } };
    const workspace = await loadWorkspace(root, undefined, globalStoreOptions);
    for (const nodeId of ["control-a", "umamis-mac-mini"]) {
      await publishNodeRecord(workspace, nodeId, { nodeId, host: nodeId, os: "linux", runtimes: [], skills: [], aofVersion: "0.1.0", publishedAt: "2026-09-13T00:00:00.000Z" });
    }
    let workspaceId;
    const store = await openGlobalWorkProjectionStore(globalStoreOptions);
    try {
      workspaceId = (await store.publishWorkspaceSnapshot(workspace, { now: "2026-09-13T00:05:00.000Z" })).workspaceId;
      await publishGlobalRegistryDescriptorsToStore(store, workspace, { now: "2026-09-13T00:05:00.000Z" });
    } finally {
      store.close();
    }
    ({ server } = await serveMeshUi({ projectDir: root, port: 0, repoRoot: distRoot, scope: "global", globalStoreOptions }));
    const url = `http://127.0.0.1:${server.address().port}/`;
    return await fn({ url, root, home, workspaceId, globalStoreOptions });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await rm(tmp, { recursive: true, force: true });
  }
}

// withLoopFleet({ loops, activeRuns, unconfigured, requestFirst }, fn) — the published assign
// fixture (nodes control-a + umamis-mac-mini; the serving node is control-a, or NONE when
// `unconfigured`), stream 129's running run written under its work dir, both nodes' presence
// published (`loops(E)` decides the entries; `() => undefined` publishes none), the request
// file at level 1 when `requestFirst` (a real same-origin POST through the route), and the REAL
// <Fleet/> mounted over it. `fn` gets `{ app, url, root, home, workspaceId, publish, E }`;
// `publish(nodeId, { activeRuns, loops })` re-publishes a node's presence to stand in for its
// tick. The ONE home's request files are cleared before and after.
async function withLoopFleet({ loops, activeRuns = ["r1"], unconfigured = false, requestFirst = false } = {}, fn) {
  await rm(loopStopsDir(), { recursive: true, force: true });
  const body = async ({ url, root, home, workspaceId }) => {
    const E = (overrides = {}) => E1({ workspaceId, ...overrides });
    await writeLoopStream129(root);
    const entries = loops ? loops(E) : [E()];
    for (const nodeId of ["control-a", "umamis-mac-mini"]) await publishPresence(home, nodeId, { activeRuns, loops: entries });
    if (requestFirst) {
      const response = await fetch(new URL("/api/mesh/loop-stop", url), { method: "POST", headers: { origin: new URL(url).origin, "content-type": "application/json" }, body: JSON.stringify({ scope: "129", workspaceId }) });
      assert.equal(response.status, 200, "the level-1 request was placed through the real route (premise)");
    }
    const publish = (nodeId, options) => publishPresence(home, nodeId, options);
    return withFleetApp({ url }, (app) => fn({ app, url, root, home, workspaceId, publish, E }));
  };
  try {
    if (unconfigured) return await withUnconfiguredFace(body);
    return await withPublishedAssignFixture(body, { nodes: ["control-a", "umamis-mac-mini"] });
  } finally {
    await rm(loopStopsDir(), { recursive: true, force: true });
  }
}

export const fleetScopeTests = [
  // ----------------------------------------------------- scope + URL ---------
  {
    name: "fleet-scope/00 scopeLabel renders \"Global\"/\"Local\" as the active scope, defaulting to Global for anything else",
    run() {
      assert.equal(scopeLabel("global"), "Global");
      assert.equal(scopeLabel("local"), "Local");
      assert.equal(scopeLabel(undefined), "Global");
      assert.equal(scopeLabel("bogus"), "Global");
    },
  },
  {
    name: "fleet-scope/00 isValidScope recognises exactly the two scopes",
    run() {
      assert.equal(isValidScope("global"), true);
      assert.equal(isValidScope("local"), true);
      assert.equal(isValidScope("workspace"), false);
      assert.equal(isValidScope(null), false);
      assert.deepEqual(VALID_SCOPES, ["global", "local"]);
    },
  },
  {
    name: "fleet-scope/02 switching scope updates the URL's scope param (task 02 scenario 3)",
    run() {
      assert.equal(withScopeParam("", "local"), "?scope=local");
      assert.equal(withScopeParam("?scope=global", "local"), "?scope=local");
      assert.equal(withScopeParam("?group=fleet", "local"), "?group=fleet&scope=local");
      assert.equal(scopeFromSearch("?scope=local"), "local");
      assert.equal(scopeFromSearch("?scope=global"), "global");
      assert.equal(scopeFromSearch(""), "global", "an absent scope param defaults to global");
      assert.equal(scopeFromSearch("?scope=bogus"), "global", "an invalid scope param falls back to global, never throws");
    },
  },

  // --------------------------------------------------- page state ------------
  {
    name: "fleet-scope/02 pageState is \"loading\" while pending, keeping the region selector stable (task 02 scenario 4)",
    run() {
      assert.equal(pageState({ loading: true, error: null, status: null }), "loading");
    },
  },
  {
    name: "fleet-scope/03 pageState is \"error\" only when an error is present (never confused with empty)",
    run() {
      assert.equal(pageState({ loading: false, error: "boom", status: null }), "error");
    },
  },
  {
    name: "fleet-scope/03 pageState is \"empty\" for an all-empty status, distinct from \"error\" (task 03 scenario 1)",
    run() {
      const emptyGlobal = { scope: "global", workspaces: [], items: [], nodes: [] };
      assert.equal(pageState({ loading: false, error: null, status: emptyGlobal }), "empty");
      assert.equal(isEmptyStatus(emptyGlobal), true);
      assert.equal(isEmptyStatus(null), true, "no status yet reads empty, not populated");
    },
  },
  {
    name: "fleet-scope/03 pageState is \"populated\" once any workspace/item/node/board is present",
    run() {
      assert.equal(pageState({ loading: false, error: null, status: { workspaces: [{ workspaceId: "a" }], items: [], nodes: [] } }), "populated");
      assert.equal(pageState({ loading: false, error: null, status: { nodes: [], boards: [{ ref: "b" }] } }), "populated", "the local mesh:status shape (boards) also reads populated");
    },
  },
  {
    name: "fleet-scope/03 the global empty-state copy names publishing and never calls the mesh broken or failed",
    run() {
      const copy = emptyStateCopy({ scope: "global" }).body; // m47/02: the return grew to { heading, body }; THE STRING IS UNCHANGED
      assert.match(copy, /published/i);
      assert.doesNotMatch(copy, /broken|failed/i);
    },
  },
  {
    name: "fleet-scope/03 the local empty-state copy keeps the pre-existing enrol guidance",
    run() {
      const copy = emptyStateCopy({ scope: "local" }).body; // m47/02: same amendment, same string
      assert.match(copy, /enrol/i);
      assert.doesNotMatch(copy, /broken|failed/i);
    },
  },

  // --------------------------------------------------- diagnostics -----------
  {
    name: "fleet-scope/03 diagnosticsSummary surfaces projection freshness and skipped/error counts without dropping healthy data (task 03 scenario 4)",
    run() {
      const status = {
        scope: "global",
        workspaces: [{ workspaceId: "alpha" }],
        nodes: [{ nodeId: "node-a" }],
        diagnostics: {
          projectedAt: "2026-07-04T10:05:00.000Z",
          skippedWorkspaces: [{ workspaceId: "gamma", reason: "mesh-global-disabled" }],
          descriptorErrors: [{ id: "node-b", code: "descriptor-unparseable" }],
        },
      };
      const summary = diagnosticsSummary(status);
      assert.equal(summary.projectedAt, "2026-07-04T10:05:00.000Z");
      assert.equal(summary.skippedWorkspaceCount, 1);
      assert.equal(summary.descriptorErrorCount, 1);
      // the healthy workspace/node data is untouched by reading diagnostics
      assert.equal(status.workspaces.length, 1);
      assert.equal(status.nodes.length, 1);
    },
  },
  {
    name: "fleet-scope/03 diagnosticsSummary degrades cleanly (all zero/null) for the local shape, which carries no diagnostics block",
    run() {
      const summary = diagnosticsSummary({ scope: "local", nodes: [], boards: [] });
      assert.equal(summary.projectedAt, null);
      assert.equal(summary.skippedWorkspaceCount, 0);
      assert.equal(summary.descriptorErrorCount, 0);
    },
  },

  // --------------------------------------------------- error path (P0.5) -----
  {
    name: "fleet-scope/03 errorPathFor prefers the thrown error's path (a first-load 503 has no prior status to attach it to)",
    run() {
      const error = new Error("The global mesh work store is unavailable");
      error.path = "C:\\Users\\Umami\\.aof\\mesh\\work\\projection.sqlite";
      assert.equal(errorPathFor(error, null), error.path);
    },
  },
  {
    name: "fleet-scope/03 errorPathFor falls back to a path already carried on a stale status payload",
    run() {
      const error = new Error("boom"); // no .path on this error
      const status = { path: "C:\\Users\\Umami\\.aof\\mesh\\work\\projection.sqlite" };
      assert.equal(errorPathFor(error, status), status.path);
    },
  },
  {
    name: "fleet-scope/03 errorPathFor is null when neither the error nor the status carries a path — never throws on a shapeless input",
    run() {
      assert.equal(errorPathFor(new Error("boom"), null), null);
      assert.equal(errorPathFor(null, null), null);
      assert.equal(errorPathFor(undefined, undefined), null);
    },
  },

  // ------------------------------------------------- local filtering ---------
  {
    name: "fleet-scope/02 filterToWorkspace drops every OTHER workspace's data (task 02 scenario 2: \"no workspace or work item from beta is rendered\")",
    run() {
      const status = {
        scope: "global",
        workspaces: [{ workspaceId: "alpha" }, { workspaceId: "beta" }],
        items: [{ ref: "34", workspaceId: "alpha" }, { ref: "35/00", workspaceId: "beta" }],
        nodes: [{ nodeId: "node-a", workspaceIds: ["alpha"] }, { nodeId: "node-b", workspaceIds: ["beta"] }],
      };
      const filtered = filterToWorkspace(status, "alpha");
      assert.deepEqual(filtered.workspaces.map((w) => w.workspaceId), ["alpha"]);
      assert.deepEqual(filtered.items.map((i) => i.ref), ["34"]);
      assert.deepEqual(filtered.nodes.map((n) => n.nodeId), ["node-a"]);
    },
  },
  {
    name: "fleet-scope/02 filterToWorkspace is a no-op when workspaceId is absent (unfiltered global view)",
    run() {
      const status = { workspaces: [{ workspaceId: "alpha" }], items: [], nodes: [] };
      assert.deepEqual(filterToWorkspace(status, null), status);
    },
  },
  {
    name: "fleet-scope/02 milestoneListItems keeps the global mesh UI at milestone level, never story/task rows",
    run() {
      const items = [
        { ref: "34", type: "milestone", workspaceId: "alpha", title: "Global mesh work store", status: "in-progress" },
        { ref: "34/00", type: "story", workspaceId: "alpha", title: "Global work propagation", status: "done" },
        { ref: "34/00/00", type: "task", workspaceId: "alpha", title: "Projection delta", status: "done" },
        { ref: "35", type: "milestone", workspaceId: "beta", title: "Next milestone", status: "not-started" },
      ];
      const milestones = milestoneListItems(items);
      assert.deepEqual(milestones.map((item) => item.ref), ["34", "35"]);
      assert.ok(milestones.every((item) => item.type === "milestone"), "only milestone rows render in the global list");
      assert.ok(milestones.every((item) => !item.ref.includes("/")), "nested story/task refs do not render as milestone cards");
    },
  },
  {
    name: "fleet-scope/02 milestoneCardModels derives board-style story counts per workspace",
    run() {
      const items = [
        { ref: "34", type: "milestone", workspaceId: "alpha", title: "Alpha mesh", status: "in-progress", parent: null },
        { ref: "34/00", type: "story", workspaceId: "alpha", title: "Alpha done", status: "done", parent: "34" },
        { ref: "34/01", type: "story", workspaceId: "alpha", title: "Alpha review", status: "in-review", parent: "34" },
        { ref: "34", type: "milestone", workspaceId: "beta", title: "Beta mesh", status: "not-started", parent: null },
        { ref: "34/00", type: "story", workspaceId: "beta", title: "Beta blocked", status: "blocked", parent: "34" },
      ];
      const cards = milestoneCardModels(items);
      const alpha = cards.find((card) => card.item.workspaceId === "alpha");
      const beta = cards.find((card) => card.item.workspaceId === "beta");
      assert.deepEqual(cards.map((card) => `${card.item.workspaceId}:${card.num}`), ["alpha:34", "beta:34"]);
      assert.ok(alpha, "alpha milestone card exists");
      assert.ok(beta, "beta milestone card exists");
      assert.equal(alpha.total, 2);
      assert.equal(alpha.done, 1);
      assert.equal(alpha.inReview, 1);
      assert.deepEqual(alpha.stories.map((story) => story.workspaceId), ["alpha", "alpha"]);
      assert.equal(beta.total, 1);
      assert.equal(beta.blocked, 1);
      assert.deepEqual(beta.stories.map((story) => story.workspaceId), ["beta"]);
    },
  },
  // ── RETIRED 2026-08-10 by milestone 47 / story 01 ────────────────────────────
  // `fleet-scope/02 global milestone cards remain clickable drill-ins` lived here and
  // asserted the board drill-in by REGEX OVER `Fleet.tsx`'s own text — `/<button\b/`,
  // `/onClick=\{onOpen\}/`, `/fleetApi\.boardUrl\(m\.item\.workspaceId, m\.item\.ref\)/`,
  // `/window\.location\.assign\(url\)/`, `/Open board →/`. That is a source read wearing
  // a behavioural suite's clothes: every one of those patterns stays green for a build
  // that calls the resolver with the WRONG workspace id, that navigates to a url it never
  // received, or that resolves on every render — and none of them can see whether the
  // operator lands anywhere that works.
  //
  // It is RETIRED rather than reduced because nothing it owned is left unowned. Its two
  // replacements were written in the same change, and between them they assert strictly
  // more:
  //   · `test/ui/fleet-board-drill-in.test.mjs` — the RUNTIME half (m47/01 task 00). The
  //     REAL <Fleet/> over the REAL two-workspace face: exactly ONE `/api/mesh/board-url`
  //     request per click, carrying that CARD's own workspaceId and ref (the F21 shape a
  //     single-workspace fixture cannot see), the app's ONE navigation read off
  //     `driver.navigations()`, and a real GET proving the origin it landed on serves the
  //     board's stream.
  //   · `test/arch/ui/acd-fleet-board-link-resolved.test.mjs` — the PLACEMENT half
  //     (m47/ADR-006(a)): no hard-coded board address anywhere in `ui/src/fleet/`, and
  //     `api.ts`/`Fleet.tsx` on the ONE resolver route. A "the source contains no relative
  //     href" assertion is a fitness function, and that is where it now lives.
  // This module keeps what it is FOR: the pure, headless render-decision helpers.

  // ------------------------------------------------- credential guard --------
  {
    name: "fleet-scope/02 withoutCredentialFields strips relayAuth/token/secret/credential-shaped keys but keeps operational fields",
    run() {
      const descriptor = {
        nodeId: "node-a",
        role: "worker",
        host: "alpha",
        lastSeenAt: "2026-07-04T10:01:00.000Z",
        fabric: { address: "ws://alpha.tailnet:7007", online: true },
        relayAuth: "plaintext-should-never-render",
        token: "also-should-never-render",
        secret: "nope",
        credential: "nope",
      };
      const safe = withoutCredentialFields(descriptor);
      assert.deepEqual(Object.keys(safe).sort(), ["fabric", "host", "lastSeenAt", "nodeId", "role"]);
      assert.equal(safe.nodeId, "node-a");
      assert.equal(safe.host, "alpha");
    },
  },
  {
    name: "fleet-scope/02 isCredentialField flags relayAuth/token/secret/credential by name",
    run() {
      for (const key of ["relayAuth", "token", "secret", "credential", "authToken", "inviteCode"]) {
        assert.equal(isCredentialField(key), true, `${key} is flagged credential-shaped`);
      }
      for (const key of ["nodeId", "host", "role", "lastSeenAt", "fabricAddress"]) {
        assert.equal(isCredentialField(key), false, `${key} is NOT flagged credential-shaped`);
      }
    },
  },
  {
    name: "fleet-scope/02 nodePanelFacts surfaces node id, role, host, last seen, capabilities, and fabric address, and NEVER a credential field (task 02 scenario 5)",
    run() {
      const node = {
        nodeId: "node-a",
        role: "control",
        host: "alpha",
        lastSeenAt: "2026-07-04T10:01:00.000Z",
        runtimes: ["claude"],
        skills: ["aof-refine"],
        fabric: { address: "ws://alpha.tailnet:7007", online: true },
        freshness: "live",
        relayAuth: "plaintext-should-never-render",
      };
      const facts = nodePanelFacts(node);
      assert.equal(facts.nodeId, "node-a");
      assert.equal(facts.role, "control");
      assert.equal(facts.host, "alpha");
      assert.equal(facts.lastSeenAt, "2026-07-04T10:01:00.000Z");
      assert.deepEqual(facts.capabilities, ["claude", "aof-refine"]);
      assert.equal(facts.fabricAddress, "ws://alpha.tailnet:7007");
      assert.ok(!("relayAuth" in facts), "no credential-shaped key survives into the rendered facts");
      assert.ok(!Object.values(facts).includes("plaintext-should-never-render"), "the credential VALUE never survives into any rendered fact either");
    },
  },
  {
    name: "fleet-scope/02 nodePanelFacts degrades cleanly for the local mesh:status node shape (presence + stale, no fabric/role)",
    run() {
      const localNode = {
        nodeId: "local-node",
        host: "local-node",
        runtimes: ["claude"],
        skills: [],
        presence: { nodeId: "local-node", heartbeatAt: "2026-07-04T10:00:00.000Z", activeRuns: [], aofVersion: "1.0.0" },
        stale: false,
        local: true,
      };
      const facts = nodePanelFacts(localNode);
      assert.equal(facts.nodeId, "local-node");
      assert.equal(facts.role, "this node");
      assert.equal(facts.lastSeenAt, "2026-07-04T10:00:00.000Z");
      assert.equal(facts.fabricAddress, null);
      assert.equal(facts.freshness, "live");
    },
  },

  // ════════════════════════════════════════════════════════════════════════════════════
  // MILESTONE 47 / STORY 02 — THE REPO FILTER AS A PURE MODULE.
  //
  // Three @executable task features, driven exactly the way each one's own Background
  // specifies: "ui/src/fleet/scope.mjs imported directly by node:test under plain node —
  // no bundler, no DOM, no React". This repo has no React harness at all, which is why the
  // narrowing lives in the pure module and why these are the ONLY channel through which
  // its decisions are confirmable.
  //
  //   tasks/00_repo-url-contract.feature          — the ?repo= URL contract (ADR-003)
  //   tasks/01_narrowing-completeness.feature     — every collection narrows (ADR-004)
  //   tasks/02_scope-composition-and-copy.feature — scope × repo, and the copy
  //                                                 (ADR-005 / ADR-007 / ADR-009)
  //
  // Each lane below names its feature and its scenario; each Examples table is transcribed
  // as a row array so a failure reports the row's own `case` label, not just a value.
  // ════════════════════════════════════════════════════════════════════════════════════

  // ───────────────────────────── task 00 — the URL contract ──────────────────────────
  {
    name: "fleet-scope/47-02-00 a `repo` value is read back VERBATIM — the id is opaque, never validated and never normalised (task 00 scenario 1)",
    run() {
      const rows = [
        ["the id shape this repo actually publishes (workspaceIdFor, 16 hex)", "?repo=9db1fd84f5895e38", "9db1fd84f5895e38"],
        ["the filter beside a live ?scope= deep link", "?scope=local&repo=9db1fd84f5895e38", "9db1fd84f5895e38"],
        ["the filter BEFORE scope — position in the query is not meaning", "?repo=alpha&scope=local", "alpha"],
        ["the filter between two parameters this module has never heard of", "?group=fleet&repo=alpha&utm_source=x", "alpha"],
        ["a percent-encoded slash — a value is opaque text, never a path", "?repo=owner%2Fname", "owner/name"],
        ["a `+`, which IS a space in query text", "?repo=a+b", "a b"],
        ["a percent-encoded space", "?repo=a%20b", "a b"],
        ["a non-ASCII value", "?repo=caf%C3%A9", "café"],
        ["a value that looks like markup — carried as text, never interpreted", "?repo=%3Cscript%3E", "<script>"],
        ["MIXED CASE — an id is compared exactly, so it is never case-folded", "?repo=AlPhA", "AlPhA"],
        ["a search with no leading \"?\" — the tolerance scopeFromSearch ships", "repo=alpha", "alpha"],
        ["a leading \"&\" before the first key", "?&repo=alpha", "alpha"],
      ];
      for (const [label, search, expected] of rows) {
        assert.equal(repoFromSearch(search), expected, label);
        assert.equal(repoFromSearch(search), expected, `${label} — the second call answers the same: no memo, no hidden state, no dependence on call order`);
      }
    },
  },
  {
    name: "fleet-scope/47-02-00 absent, blank and near-miss are NO FILTER — the answer is `null`, never \"\" (task 00 scenario 2)",
    run() {
      const rows = [
        ["no query string at all — the default, which must not change", ""],
        ["a null search, from a caller that read location.search too early", null],
        ["an undefined search", undefined],
        ["a search naming only OTHER keys", "?scope=local&group=alpha"],
        ["the key present with an EMPTY value — a cleared control", "?repo="],
        ["the key present with NO `=` at all — a hand-edited URL", "?repo"],
        ["a percent-encoded whitespace-only value", "?repo=%20%20"],
        ["a `+`-only value, which decodes to a single space", "?repo=+"],
        ["tab-and-space, which decodes to whitespace", "?repo=%09%20"],
        ["whitespace-only beside a real scope — the scope is untouched either way", "?scope=local&repo=%20"],
        ["the key in the WRONG CASE — query keys are case-sensitive", "?REPO=alpha"],
        ["a near-miss key", "?repos=alpha"],
        ["a doubled question mark, which makes the key literally \"?repo\"", "??repo=alpha"],
      ];
      for (const [label, search] of rows) {
        let answer;
        assert.doesNotThrow(() => { answer = repoFromSearch(search); }, `${label} — the call does not throw`);
        // `null` EXACTLY. `new URLSearchParams("?repo=").get("repo")` is `""`, and
        // filterToWorkspace's no-op branch tests `workspaceId == null`, which "" does not
        // satisfy — so handing the raw .get() result on turns "no filter" into "a filter
        // nothing matches": every region empty, on the address ADR-003 rules is the default.
        assert.equal(answer, null, `${label} — the answer is NO FILTER`);
        assert.ok(answer !== "", `${label} — and it is null EXACTLY, not the empty string`);
        assert.ok(answer !== undefined, `${label} — not undefined either`);
      }
      // The whitespace row leaves the OTHER narrowing alone, either way.
      assert.equal(scopeFromSearch("?scope=local&repo=%20"), "local");
    },
  },
  {
    name: "fleet-scope/47-02-00 a repeated `repo` takes the FIRST, and blank-is-absent is applied to THAT value (task 00 scenario 3)",
    run() {
      // TWO RULES, IN THAT ORDER — never one merged rule that hunts for the first USABLE
      // value: `getAll("repo").find(Boolean)` answers "b" on row 5 and passes every other
      // row here. ADR-003's rule is "the FIRST wins", full stop.
      const rows = [
        ["two values — the first wins", "?repo=a&repo=b", "a"],
        ["three values", "?repo=a&repo=b&repo=c", "a"],
        ["the repeats separated by another key", "?repo=a&scope=local&repo=b", "a"],
        ["the SECOND is blank — the first still wins", "?repo=a&repo=", "a"],
        ["the FIRST is blank — first still wins, so the answer is NO FILTER", "?repo=&repo=b", null],
        ["the first is whitespace-only and the second is real — still none", "?repo=%20&repo=b", null],
      ];
      for (const [label, search, expected] of rows) assert.equal(repoFromSearch(search), expected, label);
    },
  },
  {
    name: "fleet-scope/47-02-00 writing the filter touches the `repo` key and NOTHING else (task 00 scenario 4)",
    run() {
      const rows = [
        ["no query at all — the first filter an operator ever sets", "", "alpha", "?repo=alpha"],
        ["a null search", null, "alpha", "?repo=alpha"],
        ["beside a scope deep link — scope keeps its value AND its position", "?scope=local", "alpha", "?scope=local&repo=alpha"],
        ["replacing an existing filter IN PLACE — the key does not move", "?scope=local&group=x&repo=beta", "alpha", "?scope=local&group=x&repo=alpha"],
        ["a repeated `repo` COLLAPSES to one on write", "?repo=a&repo=b", "alpha", "?repo=alpha"],
        ["a repeated OTHER key survives — both copies, in order", "?tag=a&tag=b", "alpha", "?tag=a&tag=b&repo=alpha"],
        ["a parameter this codebase has never heard of", "?utm_source=slack", "alpha", "?utm_source=slack&repo=alpha"],
        // `?debug` comes back as `debug=` and `%20` comes back as `+`: URLSearchParams
        // RE-SERIALISES, so "unmangled" cannot mean byte-identical and does not — every
        // surviving key and value DECODES to the same text, in the same order and count.
        ["a key with NO value at all", "?debug", "alpha", "?debug=&repo=alpha"],
        ["a percent-encoded space in ANOTHER parameter's value", "?q=a%20b", "alpha", "?q=a+b&repo=alpha"],
        ["a value carrying a slash is encoded on the way out", "", "owner/name", "?repo=owner%2Fname"],
        ["a non-ASCII value", "", "café", "?repo=caf%C3%A9"],
        // QA F-7 — the markup value on the WRITE side. The read side and the copy both
        // carry it; the writer must encode it rather than sanitise it, because this
        // function is not a sanitiser and must not become one: what a surface does with
        // the value is that surface's contract.
        ["a value that looks like markup — encoded, never stripped or escaped away", "", "<script>", "?repo=%3Cscript%3E"],
      ];
      for (const [label, search, repo, expected] of rows) {
        const result = withRepoParam(search, repo);
        assert.equal(result, expected, label);
        assert.equal(repoFromSearch(result), repo, `${label} — reading the answer back yields the value written`);
        assert.equal((result.match(/(?:^\?|&)repo=/g) ?? []).length, 1, `${label} — the answer names the key \`repo\` exactly once`);
      }
      // Every other parameter survives with the same DECODED text, order and count.
      const survivors = [...new URLSearchParams(withRepoParam("?tag=a&tag=b&q=a%20b&debug", "alpha"))];
      assert.deepEqual(survivors, [["tag", "a"], ["tag", "b"], ["q", "a b"], ["debug", ""], ["repo", "alpha"]]);
    },
  },
  {
    name: "fleet-scope/47-02-00 clearing DELETES the key, and an emptied query is the EMPTY STRING — never a bare \"?\" (task 00 scenario 5)",
    run() {
      // F-47-02-QA-1: clearing is `withRepoParam(search, null)`. There is NO third export —
      // a `clearRepoParam` would pass every fitness function and give the URL write two doors.
      const rows = [
        ["the filter was the only parameter — the address loses its query", "?repo=alpha", null, ""],
        ["cleared with the empty string, which is what a cleared control has", "?repo=alpha", "", ""],
        ["cleared with undefined", "?repo=alpha", undefined, ""],
        ["a whitespace-only value CLEARS rather than writing blanks", "?repo=alpha", "   ", ""],
        ["scope survives the clear — neither control clears the other", "?scope=local&repo=alpha", null, "?scope=local"],
        ["EVERY repeated copy goes, not just the first", "?repo=a&repo=b", null, ""],
        ["clearing a filter that was never set is a no-op", "?scope=local", null, "?scope=local"],
        ["clearing an already-empty search", "", null, ""],
      ];
      for (const [label, search, cleared, expected] of rows) {
        const result = withRepoParam(search, cleared);
        assert.equal(result, expected, label);
        assert.ok(!result.includes("repo"), `${label} — the answer contains no occurrence of the text "repo"`);
        assert.equal(repoFromSearch(result), null, `${label} — and it reads back as NO FILTER`);
        assert.notEqual(result, "?", `${label} — an emptied query is "" and never a bare "?"`);
      }
    },
  },
  {
    name: "fleet-scope/47-02-00 the round trip is a FIXPOINT — re-writing the value already in force yields a byte-identical address (task 00 scenario 6)",
    run() {
      const rows = [
        ["the first filter, from a bare address", "", "alpha"],
        ["a filter set beside an existing scope", "?scope=local", "9db1fd84f5895e38"],
        ["a filter REPLACING an existing one", "?repo=beta", "alpha"],
        ["a filter beside parameters nothing here knows", "?tag=a&tag=b&debug", "alpha"],
        ["a value that must be percent-encoded", "?scope=global", "owner/name"],
        ["a non-ASCII value", "", "café"],
      ];
      for (const [label, search, repo] of rows) {
        const once = withRepoParam(search, repo);
        const twice = withRepoParam(once, repo);
        // The STRING-level fixpoint is what makes ADR-003's "setting the filter to the value
        // it already carries writes NOTHING" cheap for story 47/03: the caller compares the
        // answer to the address it already has and skips the pushState.
        assert.equal(twice, once, `${label} — the second write is byte-identical to the first`);
        // …and the VALUE-level round trip says the two helpers agree about encoding.
        assert.equal(repoFromSearch(once), repo, `${label} — read(write(v)) === v`);
        assert.equal(withRepoParam(once, null), withRepoParam(search, null), `${label} — set-then-clear leaves no residue`);
      }
    },
  },
  {
    name: "fleet-scope/47-02-00 writing one narrowing never disturbs the other, in EITHER direction (task 00 scenario 7)",
    run() {
      const rows = [
        ["setting a repo onto a scoped address", withRepoParam("?scope=local", "alpha"), "local", "alpha"],
        ["setting a scope onto a filtered address — withScopeParam is UNCHANGED by this story", withScopeParam("?repo=alpha", "local"), "local", "alpha"],
        ["switching the scope while a filter stands", withScopeParam("?scope=global&repo=alpha", "local"), "local", "alpha"],
        ["switching the filter while a scope stands", withRepoParam("?scope=local&repo=alpha", "beta"), "local", "beta"],
        ["clearing the filter — the scope the operator chose survives", withRepoParam("?scope=local&repo=alpha", null), "local", null],
        // An ABSENT scope still yields the documented default: a --local-started server
        // narrows with no ?scope= in the URL at all, so "no scope key" is a real shipped
        // address and the repo filter must not give it a new meaning.
        ["a filter on an address with no scope at all — scope defaults, it is not invented", withRepoParam("?repo=alpha", "beta"), "global", "beta"],
      ];
      for (const [label, answer, scope, repo] of rows) {
        assert.equal(scopeFromSearch(answer), scope, `${label} — scope`);
        assert.equal(repoFromSearch(answer), repo, `${label} — repo`);
      }
    },
  },
  {
    name: "fleet-scope/47-02-00 the fragment is not this contract's input, and the address the operator is left on keeps it (task 00 scenario 8)",
    run() {
      const url = new URL("http://127.0.0.1:4181/fleet?scope=local&repo=alpha#42/03");
      assert.equal(url.pathname, "/fleet");
      assert.equal(url.search, "?scope=local&repo=alpha", "a location.search EXCLUDES the fragment");
      assert.equal(url.hash, "#42/03");
      assert.equal(repoFromSearch(url.search), "alpha");
      assert.equal(scopeFromSearch(url.search), "local");

      const next = withRepoParam(url.search, "beta");
      assert.equal(next, "?scope=local&repo=beta");
      assert.ok(!next.includes("#"), "this module returns a SEARCH string and never an address — there is nothing here that could drop, reorder or re-encode a fragment");
      assert.equal(`${url.origin}${url.pathname}${next}${url.hash}`, "http://127.0.0.1:4181/fleet?scope=local&repo=beta#42/03");
      assert.equal(new URL(`${url.origin}${url.pathname}${next}${url.hash}`).hash, "#42/03", "a story ref's slash survives the re-assembly — the fragment never becomes part of the path");
      // The caller bug this module must NOT grow a rule for: handing the WHOLE address in
      // glues the fragment onto the value. A build that "helpfully" truncated at "#" would
      // be inventing a rule no document states, and would corrupt a legitimate value.
      assert.equal(new URLSearchParams("?repo=a#18").get("repo"), "a#18");
    },
  },
  {
    name: "fleet-scope/47-02-00 a shapeless or hostile input ANSWERS rather than throws — a throw here is a blank page (task 00 scenario 9)",
    run() {
      const rows = [
        ["a value that is not a string at all", 42],
        ["an object", {}],
        ["an array", []],
        // Rows 4 and 5 are the ones a hand-rolled decodeURIComponent fails: it throws
        // URIError on both, where URLSearchParams answers "%zz" and a replacement character.
        ["a malformed percent escape", "?repo=%zz"],
        ["a truncated multi-byte percent escape", "?repo=%E0%A4%A"],
        ["an `=` inside the value", "?repo=a=b"],
        ["a value 4,000 characters long", `?repo=${"x".repeat(4000)}`],
        ["a search that is only separators", "?&&&"],
        ["a search that is only the question mark", "?"],
      ];
      for (const [label, search] of rows) {
        let answer;
        assert.doesNotThrow(() => { answer = repoFromSearch(search); }, `${label} — the call does not throw`);
        assert.ok(answer === null || typeof answer === "string", `${label} — a string or null, never undefined, an object or NaN`);
        assert.ok(!Number.isNaN(answer), `${label} — never NaN`);
      }
      assert.equal(repoFromSearch("?repo=a=b"), "a=b");
      assert.equal(repoFromSearch(`?repo=${"x".repeat(4000)}`)?.length, 4000);
    },
  },

  // ───────────────────── task 01 — the completeness rule (ADR-004) ────────────────────
  {
    name: "fleet-scope/47-02-01 every collection whose rows carry a workspace identity narrows to the filtered repo, in the payload's own order (task 01 scenario 1)",
    run() {
      const status = m47Payload();
      const filtered = filterToWorkspace(status, "alpha");

      assert.deepEqual(filtered.workspaces.map((w) => w.workspaceId), ["alpha"], "the workspaces summary — rows carry workspaceId (clause 1)");
      const ofType = (rows, type) => rows.filter((row) => row.type === type).map((row) => row.ref);
      // Three rows of one array, listed separately because a build that narrowed only what
      // it could see rendered would filter milestones and forget the rest — and
      // milestoneCardModels reads its stories out of the SAME array, so a half-narrowed
      // `items` produces a card for alpha carrying beta's story counts.
      assert.deepEqual(ofType(filtered.items, "milestone"), ["47"], "the milestone rows the card list projects from");
      assert.deepEqual(ofType(filtered.items, "story"), ["47/02", "47/01"], "the STORY rows in that same array");
      assert.deepEqual(ofType(filtered.items, "task"), ["47/02/00"], "the TASK rows in that same array — the stream is complete and stays so");
      assert.deepEqual(filtered.nodes.map((n) => n.nodeId), ["only-alpha", "both", "stale-alpha", "never-beat-alpha"], "the node roster — rows carry a workspaceIds membership list (clause 2)");

      for (const dropped of ["beta"]) {
        assert.ok(!filtered.workspaces.some((w) => w.workspaceId === dropped));
        assert.ok(!filtered.items.some((row) => row.workspaceId === dropped));
      }
      assert.ok(!filtered.nodes.some((n) => ["only-beta", "never-published", "older-descriptor", "case-alpha"].includes(n.nodeId)));

      // The narrowing SELECTS rows — it never sorts, dedupes or rebuilds them. DESIGN's
      // picker renders one row per workspace IN THE PAYLOAD'S OWN ORDER, and every region
      // renders the array it is handed.
      const order = (rows, kept) => assert.deepEqual(rows, status[kept].filter((row) => rows.includes(row)), `${kept} keeps the payload's own order`);
      order(filtered.items, "items");
      order(filtered.nodes, "nodes");
      order(filtered.workspaces, "workspaces");
    },
  },
  {
    name: "fleet-scope/47-02-01 a surviving row is the SAME row, with every attached fact intact (task 01 scenario 2)",
    run() {
      const status = m47Payload();
      const filtered = filterToWorkspace(status, "alpha");

      const milestone = filtered.items.find((row) => row.ref === "47");
      const source = status.items.find((row) => row.ref === "47");
      assert.equal(milestone, source, "the surviving row is the SAME object — the narrowing selects, it does not project rows down to their identity");
      assert.deepEqual(milestone.assignment, source.assignment);
      assert.equal(milestone.reportedBy, "node-a");
      assert.equal(milestone.syncedAt, "2026-08-10T09:02:00.000Z");
      assert.equal(milestone.parent, null);

      const node = filtered.nodes.find((n) => n.nodeId === "only-alpha");
      const nodeSource = status.nodes.find((n) => n.nodeId === "only-alpha");
      assert.deepEqual(node.presence, nodeSource.presence);
      assert.deepEqual(node.assignments, nodeSource.assignments);
      assert.deepEqual(node.fabric, nodeSource.fabric);
      assert.deepEqual(Object.keys(node), Object.keys(nodeSource), "no surviving row has gained a key it did not have");
      assert.deepEqual(Object.keys(milestone), Object.keys(source), "no surviving row has gained a key it did not have");

      // Asserted THROUGH the two existing projections rather than field by field: they are
      // what the surface actually calls, so the claim survives a field being added later.
      const cardOf = (items) => milestoneCardModels(items).find((card) => card.item.workspaceId === "alpha");
      const before = cardOf(status.items);
      const after = cardOf(filtered.items);
      assert.deepEqual(after, before, "milestoneCardModels yields the same card for alpha — same story total, same done/in-review/blocked tallies");
      assert.deepEqual(nodePanelFacts(node), nodePanelFacts(nodeSource), "nodePanelFacts yields the same facts it yields before the filter");
    },
  },
  {
    name: "fleet-scope/47-02-01 a node is kept by MEMBERSHIP, and liveness is never part of the question (task 01 scenario 3)",
    run() {
      const filtered = filterToWorkspace(m47Payload(), "alpha");
      const kept = filtered.nodes.map((n) => n.nodeId);
      const rows = [
        ["a member of alpha only", "only-alpha", true],
        ["a member of alpha AND beta — membership, not exclusivity", "both", true],
        ["a member of beta only", "only-beta", false],
        ["a node that is a member of nothing — an enrolled machine that has published no workspace", "never-published", false],
        ["a node row carrying NO workspaceIds key at all — an older descriptor", "older-descriptor", false],
        // Rows 6 and 7 keep this a FILTER and not a health check: a stale or never-beat
        // machine that IS a member is exactly the machine an operator filtering for this
        // repo is looking for.
        ["a STALE member — freshness is not membership", "stale-alpha", true],
        ["a NEVER-BEAT member, carrying no presence key", "never-beat-alpha", true],
        ["a member whose id differs from alpha's only in case", "case-alpha", false],
      ];
      for (const [label, nodeId, verdict] of rows) {
        assert.equal(kept.includes(nodeId), verdict, `${label} — ${verdict ? "kept" : "dropped"}`);
      }
    },
  },
  {
    name: "fleet-scope/47-02-01 the response's own SCALARS ride through unchanged — a narrowing that relabelled `scope` would make the payload lie (task 01 scenario 4)",
    run() {
      for (const status of [m47Payload(), m47LocalPayload()]) {
        const filtered = filterToWorkspace(status, "alpha");
        assert.equal(filtered.scope, status.scope, "which SCOPE produced this payload — the client never rewrites the server's answer");
        assert.equal(filtered.workspaceId, status.workspaceId, "the workspace the SERVER narrowed to, when it narrowed");
        assert.equal(filtered.stalenessSeconds, status.stalenessSeconds, "the cache-freshness WINDOW the whole payload is read against");
      }
      // stalenessSeconds IS on the wire (global-mesh-query.mjs:278) and is deliberately NOT
      // on GlobalMeshStatus — it is the scalar most likely to be lost by a build that
      // rebuilt the envelope from the TYPE instead of spreading the payload.
      assert.equal(filterToWorkspace(m47Payload(), "alpha").stalenessSeconds, 900);
    },
  },
  {
    name: "fleet-scope/47-02-01 the DIAGNOSTICS compound narrows where its rows carry a workspace and stays machine-wide where they do not (task 01 scenario 5)",
    run() {
      const status = m47Payload();
      const filtered = filterToWorkspace(status, "alpha");
      const diagnostics = filtered.diagnostics;

      assert.ok(diagnostics != null, "the diagnostics block itself is still present — a filtered view is never left unable to say whether its own data is fresh");
      assert.deepEqual(diagnostics.skippedWorkspaces.map((row) => row.workspaceId), ["alpha"], "rows carry workspaceId — clause 1, narrowed");
      assert.deepEqual(diagnostics.projectionErrors.map((row) => row.workspaceId), ["alpha"], "rows carry workspaceId — clause 1, narrowed");
      // descriptorErrors rows carry a descriptor `path` and a NODE id, never a workspace —
      // clause 3(a), machine-wide. Pinned so a build satisfying the two rows above cannot
      // over-reach: DESIGN's amended R4 strip renders `<N> descriptor errors` WITHOUT an
      // `<n> of <N>` precisely because it did not move.
      assert.deepEqual(diagnostics.descriptorErrors, status.diagnostics.descriptorErrors, "machine-wide: every row survives, unchanged");
      assert.equal(diagnostics.projectedAt, status.diagnostics.projectedAt, "machine-wide: byte-identical");
      assert.equal(diagnostics.databasePath, status.diagnostics.databasePath, "machine-wide: byte-identical");
      assert.equal(diagnostics.generatedAt, status.diagnostics.generatedAt, "machine-wide: byte-identical");

      const summary = diagnosticsSummary(filtered);
      assert.equal(summary.skippedWorkspaceCount, 1, "the narrowed skipped-workspace count");
      assert.equal(summary.projectionErrorCount, 1, "the narrowed projection-error count");
      assert.equal(summary.descriptorErrorCount, diagnosticsSummary(status).descriptorErrorCount, "the UN-narrowed descriptor-error count");
      // The defect this closes, stated as the measurement that found it: the block used to
      // ride through BY REFERENCE, so diagnosticsSummary reported the WHOLE MESH's counts
      // under a filter.
      assert.notEqual(filtered.diagnostics, status.diagnostics, "the block is no longer passed through by reference");
      assert.equal(diagnosticsSummary(status).skippedWorkspaceCount, 2, "…and the un-narrowed payload still reports both");
    },
  },
  {
    name: "fleet-scope/47-02-01 a filter naming NOTHING on the payload narrows every collection to zero — never a silent fallback to the whole mesh (task 01 scenario 6)",
    run() {
      const rows = [
        ["an id from another mesh, or a workspace that has been deleted", "no-such-workspace"],
        ["the workspace's NAME instead of its id — why ADR-003 refuses the mutable name", "lark-guard"],
        ["the workspace's projectRoot — why ADR-003 refuses the machine-local path", "C:/Source/umami/aof"],
        ["a real id differing only in case — ids are compared exactly", "ALPHA"],
        ["a real id with a trailing character, as a truncated paste produces", "alphax"],
      ];
      for (const [label, value] of rows) {
        const status = m47Payload();
        // The case-variant node (`workspaceIds: ["ALPHA"]`) is scenario 3's boundary row and
        // it makes "ALPHA" a value this payload genuinely CARRIES, in a membership list —
        // which is not what this scenario is about ("a filter naming NOTHING on the
        // payload"). Dropped here so the row tests the claim it states.
        status.nodes = status.nodes.filter((node) => node.nodeId !== "case-alpha");
        const before = JSON.parse(JSON.stringify(status));
        const filtered = filterToWorkspace(status, value);
        assert.deepEqual([filtered.workspaces.length, filtered.items.length, filtered.nodes.length], [0, 0, 0], `${label} — every collection empty`);
        assert.equal(filtered.scope, "global", `${label} — the scalars still ride through, so the page still knows which scope produced it`);
        assert.equal(isEmptyStatus(filtered), true, `${label} — and the shipped emptiness predicate answers true`);
        assert.deepEqual(status, before, `${label} — the payload handed in is unchanged`);
      }
    },
  },
  {
    name: "fleet-scope/47-02-01 the degenerate inputs ANSWER rather than throw, and none of them half-applies (task 01 scenario 7)",
    run() {
      const twoWorkspace = m47Payload();
      const before = JSON.parse(JSON.stringify(twoWorkspace));

      assert.equal(filterToWorkspace(twoWorkspace, null), twoWorkspace, "NO FILTER — a total no-op, and the SAME object back");
      assert.equal(filterToWorkspace(twoWorkspace, undefined), twoWorkspace, "an undefined filter — the same no-op");
      // THE BOUNDARY VALUE TASK 00 EXISTS TO PREVENT. "" is not a no-op and must never
      // become one — the fix belongs at the READ side, where repoFromSearch answers null.
      const blank = filterToWorkspace(twoWorkspace, "");
      assert.deepEqual([blank.workspaces.length, blank.items.length, blank.nodes.length], [0, 0, 0], "\"\" is a filter nothing matches, not \"no filter\"");
      assert.equal(filterToWorkspace(null, "alpha"), null, "no payload yet — before the first load lands");
      assert.equal(filterToWorkspace(undefined, "alpha"), undefined, "an undefined payload");

      // A partial wire: the answer has MORE keys than the input, and that is the right
      // behaviour — every region is handed an ARRAY rather than `undefined` to map over.
      const partial = filterToWorkspace({ scope: "global", workspaces: [{ workspaceId: "alpha" }, { workspaceId: "beta" }] }, "alpha");
      assert.deepEqual(partial.workspaces.map((w) => w.workspaceId), ["alpha"]);
      assert.deepEqual(partial.items, []);
      assert.deepEqual(partial.nodes, []);

      assert.deepEqual(filterToWorkspace({ scope: "global", nodes: [{ nodeId: "n" }] }, "alpha").nodes, [], "a payload whose node rows carry no workspaceIds");

      // The honest statement of this function's limit, and why the arch ratchet is not
      // redundant with this file: a collection nobody narrowed rides through silently, and
      // no BEHAVIOURAL test can know it should not have — only the wire TYPE can.
      const widgets = [{ workspaceId: "beta", id: "w1" }];
      assert.deepEqual(filterToWorkspace({ scope: "global", workspaces: [], items: [], nodes: [], widgets }, "alpha").widgets, widgets, "an unknown collection rides through UNCHANGED — the gap the ratchet exists to catch before it ships");

      assert.deepEqual(twoWorkspace, before, "the poll loop re-narrows the same object shape on every tick — a mutating narrowing would corrupt the payload it was handed");
    },
  },

  // ───────── task 02 — composition, view-emptiness and the copy (ADR-005/007/009) ─────
  {
    // ARCHITECT F1 (MUST-FIX, closed here). The module used to hold TWO definitions of "no
    // filter": `emptyStateCopy` treated a blank repo as NO FILTER while `isEmptyView` and
    // `filterToWorkspace` treated it as A FILTER. Measured at `repo = ""` over a populated
    // payload: narrowed to w=0 i=0 n=0, `pageState` "empty", and the copy answering "No
    // mesh-enabled workspaces have published yet" — a FALSE STATEMENT ABOUT THE MESH
    // produced by a filter, i.e. ADR-009's own defect class inside the module built to
    // remove it. Latent rather than live (`repoFromSearch` never returns ""), and closed by
    // ruling rather than by patching: blankness is a URL-BOUNDARY concept, owned by
    // `repoFromSearch` and `withRepoParam`; downstream, "no filter" is `repo == null` and
    // nothing else. Task 01 scenario 7 row 3 already ruled that for the narrowing.
    name: "fleet-scope/47-02-02 the module holds ONE definition of \"no filter\", and blankness stops at the URL boundary (architect F1)",
    run() {
      const populated = m47Payload();
      for (const blank of ["", "   ", "\t"]) {
        const narrowed = filterToWorkspace(populated, blank);
        assert.deepEqual(
          [narrowed.workspaces.length, narrowed.items.length, narrowed.nodes.length],
          [0, 0, 0],
          `filterToWorkspace treats ${JSON.stringify(blank)} as a filter that matches nothing`,
        );
        assert.equal(isEmptyView(narrowed, blank), true, `isEmptyView agrees ${JSON.stringify(blank)} is a filter`);
        assert.equal(pageState({ loading: false, error: null, status: narrowed, repo: blank }), "empty");
        // …and so does the copy. THE MESH-EMPTY SENTENCE IS UNREACHABLE UNDER A FILTER.
        const copy = emptyStateCopy({
          scope: narrowed.scope,
          workspaceId: narrowed.workspaceId,
          repo: blank,
          resolved: resolvedRepoName(narrowed, blank),
        });
        assert.notEqual(copy.body, emptyStateCopy({ scope: "global", repo: null }).body, `${JSON.stringify(blank)} never selects the unfiltered mesh-empty body`);
        assert.doesNotMatch(copy.body, /No mesh-enabled workspaces have published yet/, "the false statement about the mesh is gone");
      }
      // The boundary itself is unchanged and is where blankness is still answered: a blank
      // never leaves the URL layer as a filter in the first place, so the case above is
      // latent rather than live — which is why it is fixed by agreement, not by a guard.
      for (const search of ["?repo=", "?repo=%20%20", "?repo"]) assert.equal(repoFromSearch(search), null, `${search} is NO FILTER at the read boundary`);
      assert.equal(withRepoParam("?repo=alpha", "   "), "", "…and the write boundary clears rather than writing one");
      // And an ABSENT filter is still, everywhere, the total no-op.
      assert.equal(filterToWorkspace(populated, null), populated);
      assert.equal(isEmptyView(populated, null), isEmptyStatus(populated));
      assert.equal(emptyStateCopy({ scope: "global", repo: null }).heading, "No mesh-enabled workspaces yet");
    },
  },
  {
    name: "fleet-scope/47-02-02 `scope` and `repo` intersect PER COLLECTION — a collection the server declined to narrow can survive alone (task 02 scenario 1, ADR-010)",
    run() {
      // ROW 1 — the ordinary global case.
      const global = m47Payload();
      const ordinary = filterToWorkspace(global, "alpha");
      assert.ok(ordinary.items.length > 0 && ordinary.nodes.length > 0, "row 1 — alpha's rows only, in every collection");
      assert.ok(ordinary.items.every((row) => row.workspaceId === "alpha"), "row 1 — no foreign row survives");
      assert.equal(ordinary.scope, "global");

      // ROW 2 — `?scope=local&repo=<the daemon's own>` is NOT a no-op. The server never
      // narrowed the roster, so the repo filter is the FIRST narrowing it receives: the
      // server-narrowed collections are unchanged AND the machine-wide roster narrows.
      const local = m47LocalPayload();
      const ownRepo = filterToWorkspace(local, "alpha");
      assert.deepEqual(ownRepo.workspaces, local.workspaces, "row 2 — the collections the SERVER already narrowed are unchanged");
      assert.deepEqual(ownRepo.items, local.items, "row 2 — …items too");
      assert.deepEqual(ownRepo.diagnostics.skippedWorkspaces, local.diagnostics.skippedWorkspaces, "row 2 — …and the workspace-carrying diagnostics rows");
      assert.deepEqual(
        ownRepo.nodes.map((n) => n.nodeId),
        ["only-alpha", "both", "stale-alpha", "never-beat-alpha"],
        "row 2 — the MACHINE-WIDE roster narrows to alpha's members: the repo filter is the first and only narrowing the roster receives",
      );
      assert.ok(ownRepo.nodes.length < local.nodes.length, "row 2 — which means rows were dropped; ADR-005's \"no-op intersection\" was false of the payload the producer actually emits");

      // ROW 3 — a DIFFERENT workspace, roster HAS members of it. The surviving rows ARE the
      // answer to "which machines are working on beta", so the page is `populated`.
      const otherRepo = filterToWorkspace(local, "beta");
      assert.deepEqual([otherRepo.workspaces.length, otherRepo.items.length], [0, 0], "row 3 — workspaces and items are empty");
      assert.deepEqual(otherRepo.diagnostics.skippedWorkspaces, [], "row 3 — and so are the narrowed diagnostics rows");
      assert.deepEqual(otherRepo.nodes.map((n) => n.nodeId), ["both", "only-beta"], "row 3 — the roster carries beta's member nodes");
      assert.equal(pageState({ loading: false, error: null, status: otherRepo, repo: "beta" }), "populated", "row 3 — `populated`, not `empty`: forcing empty would hide the very rows answering the filter");

      // ROW 4 — the same address over a roster with NO beta member. The nodes are removed
      // AT THE LANE and by name, because that is the only honest way to reach this state:
      // a fixture-level predicate would apply it silently to every other lane too.
      const noBetaMember = m47LocalPayload();
      noBetaMember.nodes = noBetaMember.nodes.filter((node) => !(node.workspaceIds ?? []).includes("beta"));
      const outOfScope = filterToWorkspace(noBetaMember, "beta");
      assert.deepEqual([outOfScope.workspaces.length, outOfScope.items.length, outOfScope.nodes.length], [0, 0, 0], "row 4 — every collection empty");
      assert.equal(pageState({ loading: false, error: null, status: outOfScope, repo: "beta" }), "empty", "row 4 — the page state is `empty`");
      const outOfScopeCopy = emptyStateCopy({ scope: outOfScope.scope, workspaceId: outOfScope.workspaceId, repo: "beta", resolved: resolvedRepoName(outOfScope, "beta") });
      assert.equal(outOfScopeCopy.heading, "Nothing matches Local scope and this repo", "row 4 — the OUT-OF-SCOPE copy (E5)");
      assert.doesNotMatch(outOfScopeCopy.body, /Nothing on this mesh publishes as/, "row 4 — NEVER the unknown-value one: a scope-narrowed payload was never served the mesh and cannot speak for it");

      // ROW 5 — the global payload is the ONLY place the unknown-value accusation is
      // permitted, because only there was the client served the whole mesh.
      const unknown = filterToWorkspace(global, "zzz");
      assert.deepEqual([unknown.workspaces.length, unknown.items.length, unknown.nodes.length], [0, 0, 0], "row 5 — every collection empty");
      assert.equal(unknown.workspaceId, null, "row 5 — no served narrowing");
      assert.match(
        emptyStateCopy({ scope: unknown.scope, workspaceId: unknown.workspaceId, repo: "zzz", resolved: resolvedRepoName(unknown, "zzz") }).body,
        /^Nothing on this mesh publishes as zzz\./,
        "row 5 — and the accusation is permitted here",
      );

      // ROW 6 — a --local-STARTED server narrows with NO ?scope= in the URL, so the URL's
      // scope reads back as the documented default while the PAYLOAD is labelled "local". A
      // client that composed by comparing the two URL parameters would get this exactly
      // backwards; one that narrows whatever it was served gets it right without knowing the
      // first narrowing happened — and it behaves exactly as rows 3 and 4 do.
      assert.deepEqual(filterToWorkspace(local, "beta").nodes.map((n) => n.nodeId), ["both", "only-beta"], "row 6 — `populated` when the roster carries a beta member");
      assert.deepEqual(filterToWorkspace(noBetaMember, "beta").nodes, [], "row 6 — `empty` with the OUT-OF-SCOPE copy when it does not");

      // …and for every row: the scope scalar is untouched, and neither narrowing has been
      // dropped from the address.
      const addresses = [
        ["?scope=global&repo=alpha", "global", "alpha"],
        ["?scope=local&repo=alpha", "local", "alpha"],
        ["?scope=local&repo=beta", "local", "beta"],
        ["?scope=global&repo=zzz", "global", "zzz"],
        ["?repo=beta", "global", "beta"],
      ];
      for (const [search, scopeBack, repoBack] of addresses) {
        assert.equal(scopeFromSearch(search), scopeBack, `${search} — the scope narrowing is still readable off the address`);
        assert.equal(repoFromSearch(search), repoBack, `${search} — and so is the repo narrowing`);
      }
      for (const [payload, filtered] of [[global, ordinary], [local, ownRepo], [local, otherRepo], [global, unknown]]) {
        assert.equal(filtered.scope, payload.scope, "the client never relabels which scope produced what it was given");
      }
    },
  },
  {
    name: "fleet-scope/47-02-02 a repo filter can only ever narrow FURTHER — it never widens a scoped payload (task 02 scenario 2)",
    run() {
      for (const payload of [m47Payload(), m47LocalPayload()]) {
        for (const repo of ["alpha", "beta", "zzz", null]) {
          const answer = filterToWorkspace(payload, repo);
          if (repo == null) {
            assert.equal(answer, payload, "narrowing by null yields the payload itself");
            continue;
          }
          for (const key of ["workspaces", "items", "nodes"]) {
            for (const row of answer[key]) {
              // SUBSET, SAME OBJECTS — what makes "intersection" a checkable word rather
              // than a description. A narrowing that re-fetched, merged or back-filled from
              // a previous payload would break it.
              assert.ok(payload[key].includes(row), `${key} row survived by identity, never by reconstruction (repo=${repo})`);
            }
            assert.ok(answer[key].length <= payload[key].length, `${key} never grows (repo=${repo})`);
          }
        }
      }
      // THE THIRD THEN, as amended under ADR-010: narrowing the local payload by alpha
      // leaves the SERVER-NARROWED collections exactly as they were, and narrows the
      // MACHINE-WIDE roster to alpha's members — the first narrowing that roster has
      // received. It is emphatically not "yields exactly the rows it already had".
      const local = m47LocalPayload();
      const narrowed = filterToWorkspace(local, "alpha");
      assert.deepEqual(narrowed.workspaces, local.workspaces, "the server-narrowed workspaces are exactly as they were");
      assert.deepEqual(narrowed.items, local.items, "…and so are the items");
      assert.deepEqual(narrowed.diagnostics.projectionErrors, local.diagnostics.projectionErrors, "…and the workspace-carrying diagnostics rows");
      assert.deepEqual(narrowed.nodes.map((n) => n.nodeId), ["only-alpha", "both", "stale-alpha", "never-beat-alpha"], "…and the machine-wide roster narrows to alpha's members");
      assert.ok(narrowed.nodes.every((node) => local.nodes.includes(node)), "every surviving node is one the payload already carried");
    },
  },
  {
    name: "fleet-scope/47-02-02 the empty-state HEADING names every narrowing in force (task 02 scenario 3)",
    run() {
      // "BOTH narrowings in force" is carried by the SERVED narrowing, not by the scope
      // label: `workspaceId` is set exactly when the server narrowed (ADR-010 clause 5), so
      // a "scope + repo" row passes it and a "repo only" row does not. DESIGN §Surface 2's
      // E1–E7 table is the source of every string below.
      const rows = [
        ["E1 · nothing has published anywhere, no narrowing at all", { scope: "global", repo: null }, "No mesh-enabled workspaces yet"],
        ["E2 · scope only — the pre-existing local empty state, unchanged", { scope: "local", workspaceId: "alpha", repo: null }, "No nodes in the group yet"],
        ["E6 · the repo is ON the mesh and quiet", { scope: "global", workspaceId: null, repo: "alpha", resolved: "lark-guard" }, "Nothing published for this repo yet"],
        ["E4 · the payload carries nothing that publishes as this value", { scope: "global", workspaceId: null, repo: "zzz", resolved: null }, "No repo matches this filter"],
        ["E5 · BOTH narrowings, and they do not intersect", { scope: "local", workspaceId: "alpha", repo: "beta", resolved: null }, "Nothing matches Local scope and this repo"],
      ];
      for (const [label, narrowings, heading] of rows) assert.equal(emptyStateCopy(narrowings).heading, heading, label);

      // Row 6 — E7, the other composed case. DESIGN now pins the string (it did not when
      // this lane was first written, and the word order it chose is not the one a build
      // would guess), so the exemplar is asserted AND the property it exists to satisfy.
      const composed = emptyStateCopy({ scope: "local", workspaceId: "alpha", repo: "alpha", resolved: "lark-guard" }).heading;
      assert.equal(composed, "Nothing published in Local scope for this repo yet", "E7 · BOTH narrowings, and the repo IS the daemon's own quiet workspace");
      assert.match(composed, /Local scope/, "…the heading names the Local scope");
      assert.match(composed, /this repo/i, "…and it names the repo");

      // E3 COMPOSES WITH NOTHING (DESIGN composition rule 4) — it is the one heading that
      // names no narrowing, under ANY scope and ANY served narrowing, because neither
      // narrowing produced that nothing and both inputs are read off a payload that has not
      // landed. A composed E3 heading could only be built from the URL's guess.
      for (const narrowings of [
        { scope: "global", workspaceId: null, repo: "zzz" },
        { scope: "local", workspaceId: "alpha", repo: "zzz" },
      ]) {
        assert.equal(emptyStateCopy(narrowings).heading, "Nothing from the mesh yet", "E3 names no narrowing at all");
      }

      // `scope: "global"` IS NOT A NARROWING and never appears in a heading — announcing it
      // would be announcing the ABSENCE of a narrowing (the covert-signal shape DG-20 forbids).
      for (const narrowings of [{ scope: "global", repo: null }, { scope: "global", repo: "zzz", resolved: null }, { scope: "global", repo: "a", resolved: "n" }]) {
        assert.doesNotMatch(emptyStateCopy(narrowings).heading, /global/i, "no heading announces the global scope");
      }
    },
  },
  {
    name: "fleet-scope/47-02-02 the empty-state BODY says the one true thing, and names the value the operator typed (task 02 scenario 4)",
    run() {
      // Rows 1 and 2 are the shipped strings, byte-for-byte — they move home in this story
      // and do not change a character.
      assert.equal(
        emptyStateCopy({ scope: "global", repo: null }).body,
        "No mesh-enabled workspaces have published yet. Enable mesh on a workspace (config.mesh.enabled) and it will appear here.",
      );
      assert.equal(
        emptyStateCopy({ scope: "local", repo: null }).body,
        "No nodes in the group yet. Enrol a machine to bring it onto the mesh.",
      );
      // Row 3 (E6) USES THE RESOLVED NAME and row 4 (E4) USES THE RAW VALUE — ADR-003's cost
      // being repaid: "9db1fd84f5895e38 is on the mesh" would be true and useless, and
      // inventing a name for an unresolved value would be a lie. The row-3 cell was amended
      // at build (PO, 2026-08-10) from the pre-ADR-006 "no milestones, nodes or boards".
      assert.equal(
        emptyStateCopy({ scope: "global", workspaceId: null, repo: "alpha", resolved: "lark-guard" }).body,
        "lark-guard is on the mesh but has published no milestones and no nodes. The rest of the fleet is still there.",
      );
      assert.equal(
        emptyStateCopy({ scope: "global", workspaceId: null, repo: "zzz", resolved: null }).body,
        "Nothing on this mesh publishes as zzz. It may not have published yet, or the id may belong to another mesh.",
      );
      // E7's body is E6's, UNCHANGED — DESIGN's composition rule 1: a body varies by CASE,
      // never by NARROWING, and the scope is carried by the heading. Six bodies, seven
      // headings.
      assert.equal(
        emptyStateCopy({ scope: "local", workspaceId: "alpha", repo: "alpha", resolved: "lark-guard" }).body,
        emptyStateCopy({ scope: "global", workspaceId: null, repo: "alpha", resolved: "lark-guard" }).body,
        "E7's body is E6's, unchanged",
      );
      // Row 5 (E5) — DESIGN pins the exemplar as of 2026-08-11. It names BOTH narrowings,
      // says the INTERSECTION is what is empty rather than either half of it, and is NOT the
      // unknown-value body verbatim OR in substance: a scope-narrowed payload was never
      // served the mesh and may not speak for it (ADR-010 clause 5).
      const composed = emptyStateCopy({ scope: "local", workspaceId: "alpha", repo: "beta", resolved: null }).body;
      assert.equal(
        composed,
        "Local scope narrowed this view to one workspace, and beta is not it. The two narrowings have nothing in common, and a view of one workspace cannot say what the rest of the mesh holds.",
      );
      assert.match(composed, /Local scope/, "the composed body names the scope narrowing");
      assert.match(composed, /beta/, "…and the raw value");
      assert.match(composed, /have nothing in common/, "…and says the INTERSECTION is what is empty");
      assert.doesNotMatch(composed, /Nothing on this mesh publishes as/, "…and never makes the mesh-wide accusation");
    },
  },
  {
    name: "fleet-scope/47-02-02 the four copies are genuinely FOUR, and none of them says anything untrue (task 02 scenario 5)",
    run() {
      const unfiltered = emptyStateCopy({ scope: "global", repo: null });
      const quiet = emptyStateCopy({ scope: "global", workspaceId: null, repo: "alpha", resolved: "lark-guard" });
      const unknown = emptyStateCopy({ scope: "global", workspaceId: null, repo: "zzz", resolved: null });
      const composed = emptyStateCopy({ scope: "local", workspaceId: "alpha", repo: "beta", resolved: null });
      const four = [unfiltered, quiet, unknown, composed];

      assert.equal(new Set(four.map((copy) => copy.heading)).size, 4, "their four headings are pairwise distinct");
      assert.equal(new Set(four.map((copy) => copy.body)).size, 4, "their four bodies are pairwise distinct");

      // THE SUBSTITUTION CLAUSE (ADR-010 clause 6). Pairwise distinctness read off four
      // copies each carrying a DIFFERENT value is satisfied by one rule wearing four coats:
      // the composed and unknown bodies were byte-identical, and the lane passed only
      // because one happened to be shown "beta" and the other "zzz". Held to the SAME RAW
      // VALUE, they must still differ — and E4 must be structurally unavailable to a
      // scope-narrowed payload.
      for (const value of ["zzz", "beta", "9db1fd84f5895e38"]) {
        const asUnknown = emptyStateCopy({ scope: "global", workspaceId: null, repo: value, resolved: null });
        const asComposed = emptyStateCopy({ scope: "local", workspaceId: "alpha", repo: value, resolved: null });
        assert.notEqual(asComposed.body, asUnknown.body, `the composed body differs from the unknown body FOR THE SAME RAW VALUE (${value})`);
        assert.notEqual(asComposed.heading, asUnknown.heading, `…and so do their headings (${value})`);
        assert.doesNotMatch(asComposed.body, /Nothing on this mesh publishes as/, `a scope-narrowed payload never asserts the mesh-wide accusation (${value})`);
      }
      assert.equal(unfiltered.body, "No mesh-enabled workspaces have published yet. Enable mesh on a workspace (config.mesh.enabled) and it will appear here.");
      assert.equal(emptyStateCopy({ scope: "local", repo: null }).body, "No nodes in the group yet. Enrol a machine to bring it onto the mesh.");

      for (const copy of [...four, emptyStateCopy({ scope: "local", repo: null })]) {
        for (const sentence of [copy.heading, copy.body]) {
          // m34's rule extended rather than re-decided: a filter matching nothing is a true
          // and ordinary answer, not a fault.
          assert.doesNotMatch(sentence, /broken|failed/i, `"${sentence}" never calls the mesh broken or failed`);
          // A sentence that describes its own presentation goes stale in the next redesign.
          assert.doesNotMatch(sentence, /\b(red|green|amber|colour|color|icon|glyph|badge|chip|banner|button|dropdown|sidebar|panel|column|top|bottom|left-hand|right-hand|above|below|header|footer)\b/i, `"${sentence}" names no colour, glyph, control position or page region`);
        }
      }
      for (const copy of [quiet, unknown, composed]) {
        // The false statement about the MESH that DG-47-3 exists to prevent.
        assert.notEqual(copy.body, unfiltered.body);
        assert.doesNotMatch(copy.body, /nothing has published (yet|anywhere)/i, "no filtered copy claims that nothing has published anywhere");
        assert.doesNotMatch(copy.body, /no mesh-enabled workspaces have published/i);
      }
      assert.doesNotMatch(quiet.body, /publishes as|belong to another mesh/i, "the quiet-repo copy does not claim the value is unknown");
      assert.doesNotMatch(quiet.heading, /no repo matches/i);
      assert.doesNotMatch(unknown.body, /is on the mesh but/i, "the unknown-value copy does not claim the repo is quiet");

      // THE VERBATIM-VALUE CLAUSE, over the four spellings task 00's tables prove can
      // arrive. It is asserted against the value each copy is ABOUT: the RAW value for the
      // unresolved/unknown copies, and the RESOLVED NAME for the quiet one — the asymmetry
      // scenario 4's own comment rules on ("Row 3 saying `9db1fd84f5895e38 is on the mesh`
      // would be true and useless"). Neither is ever truncated, escaped or ellipsised.
      for (const value of ["9db1fd84f5895e38", "owner/name", "café", "<script>"]) {
        assert.ok(emptyStateCopy({ scope: "global", workspaceId: null, repo: value, resolved: null }).body.includes(value), `the unknown copy carries ${value} verbatim`);
        assert.ok(emptyStateCopy({ scope: "local", workspaceId: "alpha", repo: value, resolved: null }).body.includes(value), `the out-of-scope copy carries ${value} verbatim`);
        assert.ok(emptyStateCopy({ scope: "global", workspaceId: null, repo: value, resolved: "x" }).body.includes("x"), `the quiet copy carries the resolved name verbatim (${value} is not what that sentence is about)`);
        assert.ok(emptyStateCopy({ scope: "global", workspaceId: null, repo: "x", resolved: value }).body.includes(value), `the quiet copy carries the resolved name ${value} verbatim`);
      }
    },
  },
  {
    name: "fleet-scope/47-02-02 the FOUR NOTHINGS all read \"empty\" — the quiet-but-known repo and the out-of-scope repo among them (task 02 scenario 6)",
    run() {
      // Every answer is reached from THE NARROWED PAYLOAD AND THE NARROWINGS ALONE: the
      // scope label, the SERVED narrowing and the resolution are all read off the payload
      // the seam already holds. No second fetch, no un-narrowed payload, no `window`.
      const ask = (payload, repo) => {
        const narrowed = filterToWorkspace(payload, repo);
        return {
          state: pageState({ loading: false, error: null, status: narrowed, repo }),
          copy: emptyStateCopy({
            scope: narrowed?.scope ?? "global",
            workspaceId: narrowed?.workspaceId ?? null,
            repo,
            resolved: resolvedRepoName(narrowed, repo),
          }),
        };
      };

      const idle = ask({ scope: "global", workspaces: [], items: [], nodes: [] }, null);
      assert.equal(idle.state, "empty", "an idle mesh — nothing has published anywhere");
      assert.equal(idle.copy.body, emptyStateCopy({ scope: "global", repo: null }).body, "the unfiltered copy for that scope");

      const unknown = ask(m47Payload(), "zzz");
      assert.equal(unknown.state, "empty", "the filter names a value the payload does not carry");
      assert.equal(unknown.copy.heading, "No repo matches this filter");
      assert.match(unknown.copy.body, /Nothing on this mesh publishes as zzz\./);

      // THE GAP. The workspace the operator filtered TO is itself a row in `workspaces`, so
      // the narrowed payload is never all-empty and the shipped predicate answered
      // "populated" — one card above two empty regions, exactly where DG-47-3 requires the
      // filtered-empty card. It is the worse of the two traps because it renders a page that
      // looks like it is working.
      const quiet = ask(m47QuietPayload(), "alpha");
      assert.equal(quiet.state, "empty", "the filter names a KNOWN workspace that is on the mesh and has published nothing");
      assert.equal(quiet.copy.heading, "Nothing published for this repo yet");
      assert.match(quiet.copy.body, /^lark-guard is on the mesh/, "the quiet-repo copy, naming lark-guard");
      // …and the payload underneath it is exactly the shape that used to read populated.
      const narrowedQuiet = filterToWorkspace(m47QuietPayload(), "alpha");
      assert.deepEqual([narrowedQuiet.workspaces.length, narrowedQuiet.items.length, narrowedQuiet.nodes.length], [1, 0, 0]);
      assert.equal(isEmptyStatus(narrowedQuiet), false, "the SHIPPED predicate still answers false for it — which is why the narrowing had to become part of the question");

      // GUARD — the SAME payload shape with no filter in force stays POPULATED. This is why
      // "just make the predicate ignore workspaces" is not a free answer.
      const unfilteredQuiet = ask(m47QuietPayload(), null);
      assert.equal(unfilteredQuiet.state, "populated", "an un-narrowed mesh carrying one published workspace, no items and no nodes");
      // GUARD — the non-vacuity half: without it, "answer empty whenever a repo filter is in
      // force" passes every row above and turns every filtered page into an empty state.
      assert.equal(ask(m47Payload(), "beta").state, "populated", "a filter naming a workspace that DOES carry work");

      // ROW 6 — THE FOURTH NOTHING (ADR-010 clause 5). Rows 1-5 are all GLOBAL-payload
      // cases, so between them they never exercise the one state where "zero workspace rows
      // survived" is AMBIGUOUS: under `scope=local` the SERVER already removed every other
      // row, so it collapses *the scope excluded it* and *the mesh does not have it*. The
      // discriminator is no longer the surviving row alone — it is the served narrowing.
      const scopeNarrowed = m47LocalPayload();
      scopeNarrowed.nodes = scopeNarrowed.nodes.filter((node) => !(node.workspaceIds ?? []).includes("beta"));
      const outOfScope = ask(scopeNarrowed, "beta");
      assert.equal(outOfScope.state, "empty", "a SCOPE-narrowed payload filtered to a repo it does not reach");
      assert.equal(outOfScope.copy.heading, "Nothing matches Local scope and this repo", "the OUT-OF-SCOPE copy (E5)");
      assert.doesNotMatch(outOfScope.copy.body, /Nothing on this mesh publishes as/, "and NEVER the unknown-value copy — the measured false statement ADR-010 clause 5 removes");
      assert.notEqual(outOfScope.copy.body, unknown.copy.body, "…the two nothings carry two different sentences");
      // The narrowed payload really does look identical to the unknown case in `workspaces`
      // — which is exactly why the surviving-row discriminator alone was unsound.
      const narrowedOutOfScope = filterToWorkspace(scopeNarrowed, "beta");
      assert.deepEqual([narrowedOutOfScope.workspaces.length, narrowedOutOfScope.items.length, narrowedOutOfScope.nodes.length], [0, 0, 0]);
      assert.equal(resolvedRepoName(narrowedOutOfScope, "beta"), null, "resolvedRepoName keeps its three values and its meaning — the COPY stopped over-reading it");
      assert.equal(narrowedOutOfScope.workspaceId, "alpha", "…and the served narrowing is what tells the two apart");
    },
  },
  {
    name: "fleet-scope/47-02-02 the four page states and the three empty sentences survive the filtered-emptiness answer (task 02 scenario 7)",
    run() {
      const states = new Set();
      for (const repo of [null, "alpha", "beta", "zzz"]) {
        for (const payload of [null, m47Payload(), m47QuietPayload(), { scope: "global", workspaces: [], items: [], nodes: [] }]) {
          for (const [loading, error] of [[true, null], [false, "boom"], [false, null]]) {
            states.add(pageState({ loading, error, status: filterToWorkspace(payload, repo), repo }));
          }
        }
      }
      assert.deepEqual([...states].sort(), ["empty", "error", "loading", "populated"], "this milestone adds no fifth state and renames none of the four");

      assert.equal(pageState({ loading: false, error: null, status: m47QuietPayload() }), "populated", "the unfiltered mesh still reads populated, exactly as the shipped build reads it today");
      // The Then a "filter-aware predicate" most easily breaks: a payload that never arrived.
      assert.equal(pageState({ loading: false, error: null, status: null }), "empty", "a null status with nothing loading and no error still reads empty, as it does today");
      assert.equal(pageState({ loading: false, error: null, status: null, repo: "alpha" }), "empty", "…and so does one that never arrived under a filter");

      const three = [
        emptyStateCopy({ scope: "global", repo: null }),
        emptyStateCopy({ scope: "global", repo: "alpha", resolved: "lark-guard" }),
        emptyStateCopy({ scope: "global", repo: "zzz", resolved: null }),
      ];
      assert.equal(new Set(three.map((c) => c.heading)).size, 3, "three different headings");
      assert.equal(new Set(three.map((c) => c.body)).size, 3, "three different bodies");
      assert.equal(three[0].body, "No mesh-enabled workspaces have published yet. Enable mesh on a workspace (config.mesh.enabled) and it will appear here.");
      assert.doesNotMatch(three[1].body, /no mesh-enabled workspaces/i, "the quiet-but-known copy does not say the mesh is empty");
      assert.doesNotMatch(three[2].body, /is on the mesh but/i, "the unknown-value copy does not say the repo is quiet");
    },
  },
  {
    name: "fleet-scope/47-02-02 a filter whose payload has not landed is UNRESOLVED, never UNKNOWN (task 02 scenario 8)",
    run() {
      const unknownCopy = emptyStateCopy({ scope: "global", workspaceId: null, repo: "zzz", resolved: null });

      // Row 1 — no payload has landed. Reachable, not theoretical: pageState with a null
      // status answers "empty", so the empty card renders over a payload that never arrived.
      // A boolean `resolved` would collapse this into row 2 and accuse a perfectly valid
      // filter of being unknown for as long as the first fetch takes.
      const notYet = filterToWorkspace(null, "zzz");
      assert.equal(resolvedRepoName(notYet, "zzz"), undefined, "no payload ⇒ NOT YET KNOWN, which is absent and never null");
      const unresolved = emptyStateCopy({ scope: "global", workspaceId: null, repo: "zzz", resolved: resolvedRepoName(notYet, "zzz") });
      assert.equal(unresolved.heading, "Nothing from the mesh yet", "E3");
      assert.equal(unresolved.body, "Nothing has arrived from the mesh yet, so whether it carries zzz is not yet known.");
      assert.notDeepEqual(unresolved, unknownCopy, "NOT the unknown-value copy");
      assert.doesNotMatch(unresolved.body, /publishes as/i, "it does not state that nothing on this mesh publishes as that value");
      assert.ok(unresolved.body.includes("zzz"), "…and it still names the value in force");
      // QA F-7 — the unresolved copy against the four hostile spellings task 00 proves can
      // arrive. The value is carried verbatim here too: never truncated, escaped or
      // ellipsised, whatever it is spelled like.
      for (const value of ["9db1fd84f5895e38", "owner/name", "café", "<script>"]) {
        const copy = emptyStateCopy({ scope: "global", workspaceId: null, repo: value, resolved: undefined });
        assert.ok(copy.body.includes(value), `the unresolved copy carries ${value} verbatim`);
        assert.doesNotMatch(copy.body, /publishes as/i, `…and still never accuses ${value}`);
      }

      // Row 2 — a payload landed, does not carry the id, AND IT IS THE WHOLE MESH. The
      // accusation is true only here: a scope-narrowed payload gets the OUT-OF-SCOPE copy,
      // because it was never served the mesh it would be speaking for (ADR-010 clause 5).
      const landed = filterToWorkspace(m47Payload(), "zzz");
      assert.equal(landed.workspaceId, null, "the global payload carries NO served narrowing");
      assert.equal(resolvedRepoName(landed, "zzz"), null);
      assert.deepEqual(emptyStateCopy({ scope: "global", workspaceId: landed.workspaceId, repo: "zzz", resolved: resolvedRepoName(landed, "zzz") }), unknownCopy);

      // Row 3 — a payload landed and carries the id, which has published nothing.
      const quiet = filterToWorkspace(m47QuietPayload(), "alpha");
      assert.equal(resolvedRepoName(quiet, "alpha"), "lark-guard");
      assert.deepEqual(
        emptyStateCopy({ scope: "global", workspaceId: quiet.workspaceId, repo: "alpha", resolved: resolvedRepoName(quiet, "alpha") }),
        emptyStateCopy({ scope: "global", workspaceId: null, repo: "alpha", resolved: "lark-guard" }),
        "the quiet-repo copy",
      );
      // A row with no `name` falls back to the id rather than inventing one.
      assert.equal(resolvedRepoName({ workspaces: [{ workspaceId: "alpha", name: null }] }, "alpha"), "alpha");
    },
  },
  {
    name: "fleet-scope/47-02-02 clearing from a non-intersecting view returns the operator to the view they had, MINUS the filter (task 02 scenario 9)",
    run() {
      // The "AND WHOSE PAGE IS EMPTY" premise was dropped from this scenario at build under
      // ADR-010 — the page is NOT empty when the machine-wide roster carries a beta member.
      // This scenario is about THE ADDRESS, and every assertion below holds either way,
      // which is checked explicitly at the end rather than assumed.
      const search = "?scope=local&repo=beta";
      const copy = emptyStateCopy({ scope: "local", workspaceId: "alpha", repo: repoFromSearch(search), resolved: null });
      assert.match(copy.heading, /Local scope/, "the copy for that state names both narrowings");
      assert.match(copy.body, /beta/);

      const cleared = withRepoParam(search, null);
      assert.equal(cleared, "?scope=local", "the scope narrowing the operator chose SURVIVES the clear");
      assert.equal(repoFromSearch(cleared), null, "the narrowing is a no-op, so the payload renders exactly as scope=local renders it");
      assert.equal(scopeFromSearch(cleared), "local");
      assert.equal(
        emptyStateCopy({ scope: "local", repo: repoFromSearch(cleared) }).body,
        "No nodes in the group yet. Enrol a machine to bring it onto the mesh.",
        "the copy for the resulting state, if it is still empty, is the UNFILTERED local copy — byte-identical to what the shipped build answers today",
      );
      assert.ok(!cleared.includes("repo"), "nothing in that search names `repo`, in any form");
      assert.notEqual(cleared, "?", "no bare \"?\"");
      // The narrowing itself is a no-op once cleared: the payload the operator gets back is
      // the one scope=local served, object-for-object — INCLUDING the machine-wide roster,
      // which the clear hands back untouched.
      const local = m47LocalPayload();
      assert.equal(filterToWorkspace(local, repoFromSearch(cleared)), local);
      assert.equal(filterToWorkspace(local, repoFromSearch(cleared)).nodes.length, local.nodes.length);
      // …and the recovery is identical whether the pre-clear page was empty or populated,
      // which is why the dropped premise cost this scenario nothing.
      const populatedBefore = filterToWorkspace(local, "beta");
      const emptyBefore = filterToWorkspace({ ...local, nodes: local.nodes.filter((n) => !(n.workspaceIds ?? []).includes("beta")) }, "beta");
      assert.equal(pageState({ loading: false, error: null, status: populatedBefore, repo: "beta" }), "populated");
      assert.equal(pageState({ loading: false, error: null, status: emptyBefore, repo: "beta" }), "empty");
      assert.equal(withRepoParam(search, null), cleared, "the clear is the same address from either state");
    },
  },
  // ------------------------------------- the THIRD narrowing: work status (2026-09-11) ---
  {
    name: "fleet-scope/status the address round-trip: absent, blank and unknown read as the default (open); the default deletes the key; a named status writes only its own key",
    run() {
      assert.equal(DEFAULT_WORK_STATUS_FILTER, "open");
      for (const [label, search] of [["absent", ""], ["blank", "?status="], ["unknown", "?status=bogus"], ["a repo only", "?repo=alpha"]]) {
        assert.equal(workStatusFromSearch(search), "open", `${label} reads as the default`);
      }
      for (const filter of WORK_STATUS_FILTERS) {
        assert.equal(workStatusFromSearch(withWorkStatusParam("?repo=alpha", filter)), filter, `${filter} reads back what was written`);
      }
      assert.equal(withWorkStatusParam("?repo=alpha&status=done", "open"), "?repo=alpha", "the default DELETES the key and leaves the repo narrowing untouched");
      assert.equal(withWorkStatusParam("?status=done", "open"), "", "…and an address with nothing else left is empty, never a bare `?`");
      assert.equal(withWorkStatusParam("?repo=alpha", "done"), "?repo=alpha&status=done", "a named status writes only its own key");
      assert.equal(withWorkStatusParam("", "all"), "?status=all", "`all` is a value: it widens the default and must survive a refresh");
      assert.equal(withWorkStatusParam("?status=done", "bogus"), "", "an unknown value is the default, so it clears");
      assert.ok(WORK_STATUS_FILTERS.includes("open") && WORK_STATUS_FILTERS.includes("all") && WORK_STATUS_FILTERS.includes("done"));
      assert.equal(workStatusFilterLabel("in-progress"), "In progress");
      assert.equal(workStatusFilterLabel("bogus"), workStatusFilterLabel("open"), "an unknown filter is labelled as the default");
    },
  },
  {
    name: "fleet-scope/status `open` admits everything that is not done — including a row with NO status — `all` admits everything, a named status admits only itself",
    run() {
      for (const status of ["not-started", "in-progress", "in-review", "blocked", null, undefined, "weird"]) {
        assert.equal(workStatusAdmits("open", status), true, `open admits ${String(status)}`);
      }
      assert.equal(workStatusAdmits("open", "done"), false);
      for (const status of ["done", "in-progress", null]) assert.equal(workStatusAdmits("all", status), true);
      assert.equal(workStatusAdmits("done", "done"), true);
      assert.equal(workStatusAdmits("done", "in-progress"), false);
      assert.equal(workStatusAdmits("blocked", null), false, "a named status never admits a missing one");
      assert.equal(workStatusAdmits("bogus", "done"), false, "an unknown filter behaves as the default");
    },
  },
  {
    name: "fleet-scope/status the narrowing removes MILESTONE rows only and leaves every other collection — and the stories — standing, so card tallies do not move",
    run() {
      const payload = {
        ...m47Payload(),
        items: [
          { workspaceId: "alpha", ref: "01", type: "milestone", slug: "finished", status: "done", parent: null },
          { workspaceId: "alpha", ref: "02", type: "milestone", slug: "live", status: "in-progress", parent: null },
          { workspaceId: "alpha", ref: "02/00", type: "story", slug: "shipped", status: "done", parent: "02" },
          { workspaceId: "alpha", ref: "02/01", type: "story", slug: "building", status: "in-progress", parent: "02" },
          { workspaceId: "beta", ref: "03", type: "milestone", slug: "stuck", status: "blocked", parent: null },
          { workspaceId: "beta", ref: "04", type: "chore", slug: "tidy", status: "done", parent: null },
        ],
      };
      const open = filterToWorkStatus(payload, "open");
      assert.deepEqual(open.items.map((row) => row.ref), ["02", "02/00", "02/01", "03", "04"], "only the done MILESTONE left; the done story and the done chore stay");
      assert.equal(open.workspaces, payload.workspaces, "every other collection rides through by reference");
      assert.equal(open.nodes, payload.nodes);
      assert.equal(open.diagnostics, payload.diagnostics);
      assert.equal(open.scope, payload.scope, "scalars ride through");
      const cards = milestoneCardModels(open.items);
      assert.deepEqual(cards.map((card) => [card.num, card.done, card.total]), [["02", 1, 2], ["03", 0, 0]], "the surviving card still counts its done story: 1 of 2");
      assert.equal(filterToWorkStatus(payload, "all"), payload, "`all` is the identity, object-for-object");
      assert.deepEqual(filterToWorkStatus(payload, "blocked").items.filter((row) => row.type === "milestone").map((row) => row.ref), ["03"]);
      assert.equal(filterToWorkStatus(null, "open"), null, "total over an absent payload");
      assert.deepEqual(filterToWorkStatus({ scope: "global" }, "open").items, [], "…and over a payload with no items");
      assert.equal(hiddenMilestoneCount(payload, open), 1);
      assert.equal(hiddenMilestoneCount(payload, filterToWorkStatus(payload, "blocked")), 2);
      assert.equal(hiddenMilestoneCount(payload, payload), 0);
    },
  },
  {
    name: "fleet-scope/status the header tail is EMPTY when nothing is hidden — so the accepted `6 milestones` / `2 of 6 milestones` heads are untouched — and names what was hidden otherwise",
    run() {
      assert.equal(workStatusSummaryTail("open", 0), "");
      assert.equal(workStatusSummaryTail("all", 0), "");
      assert.equal(workStatusSummaryTail("done", 0), "");
      assert.equal(workStatusSummaryTail("open", -1), "", "a negative count is not a statement");
      assert.equal(workStatusSummaryTail("open", 123), " · 123 done hidden");
      assert.equal(workStatusSummaryTail("blocked", 4), " · 4 hidden, blocked only");
      assert.equal(workStatusSummaryTail("in-progress", 1), " · 1 hidden, in progress only");
    },
  },
  {
    name: "fleet-scope/status the three narrowings compose through copy-and-set: each writes only its own key, in any order, and clearing one leaves the other two",
    run() {
      let search = withScopeParam("", "local");
      search = withRepoParam(search, "alpha");
      search = withWorkStatusParam(search, "done");
      assert.equal(scopeFromSearch(search), "local");
      assert.equal(repoFromSearch(search), "alpha");
      assert.equal(workStatusFromSearch(search), "done");
      const noRepo = withRepoParam(search, null);
      assert.equal(workStatusFromSearch(noRepo), "done", "clearing the repo keeps the status");
      assert.equal(scopeFromSearch(noRepo), "local");
      const noStatus = withWorkStatusParam(search, "open");
      assert.equal(repoFromSearch(noStatus), "alpha", "clearing the status keeps the repo");
      assert.ok(!noStatus.includes("status"), "nothing in that search names `status`");
    },
  },
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // milestone 130 / story 03 / task 03 — tasks/03_the-line-and-the-button-are-pure.feature
  // (@executable): fleetLoopLines, loopStopAffordance and rememberStopRung in runs.mjs and
  // nodeWorkRegion in scope.mjs — every fact the card renders, computed in modules node:test
  // drives without React, with fleetCurrentWorkLines / nodeCurrentWork byte-identical (the
  // Rust drift pin). 130/ADR-005 §5; DESIGN §Surface 1.
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // ══ Scenario Outline: fleetLoopLines renders the anatomy from the entry's fields ══
  {
    name: "the-line-and-the-button-are-pure/03 fleetLoopLines renders the anatomy from the entry's fields — the state word second, phase+ref only when both stand, cycle/cap fail-closed, level and supervised in the title only (Examples)",
    async run() {
      const rows = [
        { entry: E1(), line: "loop 129 · continue 129/04 · cycle 1 of 3", title: "loop 129 · continue 129/04 · cycle 1 of 3 · L2", stop: null },
        { entry: E1({ stop: "drain" }), line: "loop 129 · stopping · continue 129/04 · cycle 1 of 3", title: "loop 129 · stopping · continue 129/04 · cycle 1 of 3 · L2", stop: "drain" },
        { entry: E1({ stop: "cancel" }), line: "loop 129 · cancelling · continue 129/04 · cycle 1 of 3", title: "loop 129 · cancelling · continue 129/04 · cycle 1 of 3 · L2", stop: "cancel" },
        { entry: E1({ stop: "halt" }), line: "loop 129 · continue 129/04 · cycle 1 of 3", title: "loop 129 · continue 129/04 · cycle 1 of 3 · L2", stop: null },
        { entry: E1({ ref: null }), line: "loop 129 · cycle 1 of 3", title: "loop 129 · cycle 1 of 3 · L2", stop: null },
        { entry: E1({ phase: null }), line: "loop 129 · cycle 1 of 3", title: "loop 129 · cycle 1 of 3 · L2", stop: null },
        { entry: E1({ phase: "refine", ref: "129/01" }), line: "loop 129 · refine 129/01 · cycle 1 of 3", title: "loop 129 · refine 129/01 · cycle 1 of 3 · L2", stop: null },
        { entry: E1({ phase: "verify", ref: "129" }), line: "loop 129 · verify 129 · cycle 1 of 3", title: "loop 129 · verify 129 · cycle 1 of 3 · L2", stop: null },
        { entry: E1({ cap: null }), line: "loop 129 · continue 129/04 · cycle 1", title: "loop 129 · continue 129/04 · cycle 1 · L2", stop: null },
        { entry: E1({ cap: 0 }), line: "loop 129 · continue 129/04 · cycle 1", title: "loop 129 · continue 129/04 · cycle 1 · L2", stop: null },
        { entry: E1({ cycle: null }), line: "loop 129 · continue 129/04", title: "loop 129 · continue 129/04 · L2", stop: null },
        { entry: E1({ stop: "drain", ref: null, cap: null }), line: "loop 129 · stopping · cycle 1", title: "loop 129 · stopping · cycle 1 · L2", stop: "drain" },
        { entry: E1({ level: "L3", supervised: true }), line: "loop 129 · continue 129/04 · cycle 1 of 3", title: "loop 129 · continue 129/04 · cycle 1 of 3 · L3 · supervised", stop: null },
      ];
      for (const row of rows) {
        const lines = fleetLoopLines({ activeRuns: [], sessions: [], loops: [row.entry] });
        assert.equal(lines.length, 1, `${row.line}: one entry`);
        const [entry] = lines;
        assert.equal(entry.line, row.line, `line for ${JSON.stringify(row.entry)}`);
        assert.equal(entry.title, row.title, `title for ${row.line}`);
        assert.equal(entry.key, "loop:L1");
        assert.equal(entry.loopRunId, "L1");
        assert.equal(entry.scope, "129");
        assert.equal(entry.workspaceId, "w1");
        assert.equal(entry.stop, row.stop, `stop for ${row.line}`);
      }
    },
  },

  // ══ Scenario Outline: the entries are ordered and an absent key is empty ══
  {
    name: "the-line-and-the-button-are-pure/03 the entries are ordered by scope then loopRunId on the plain codepoint comparison, and an absent, empty or null loops key is [] — never a throw (Examples)",
    async run() {
      const rows = [
        { label: "absent", loops: undefined, order: [] },
        { label: "[]", loops: [], order: [] },
        { label: "null", loops: null, order: [] },
        { label: "131 then 129", loops: [E1({ scope: "131" }), E1({ scope: "129" })], order: ["129", "131"] },
        { label: "ties by loopRunId", loops: [E1({ loopRunId: "Lb" }), E1({ loopRunId: "La" })], order: ["129", "129"], ids: ["La", "Lb"] },
        { label: "9, 10, 01-05", loops: [E1({ scope: "9" }), E1({ scope: "10" }), E1({ scope: "01-05" })], order: ["01-05", "10", "9"] },
      ];
      for (const row of rows) {
        const presence = { activeRuns: [], sessions: [] };
        if (row.loops !== undefined) presence.loops = row.loops;
        const lines = fleetLoopLines(presence);
        assert.deepEqual(lines.map((entry) => entry.scope), row.order, `${row.label}: scopes in order`);
        if (row.ids) assert.deepEqual(lines.map((entry) => entry.loopRunId), row.ids, `${row.label}: loopRunIds in order`);
      }
    },
  },

  // ══ Scenario Outline: the affordance is local-only and climbs the rung ladder ══
  {
    name: "the-line-and-the-button-are-pure/03 the affordance is local-only and climbs the rung ladder — max(wire, remembered) for the same drive, null after rung 2, a strict === on the node id, and no button at all with no localNodeId (Examples)",
    async run() {
      const STOP = { rung: 1, label: "Stop", title: "Stop loop 129 — the current drive finishes first", tone: "muted" };
      const STOP_NOW = { rung: 2, label: "Stop now", title: "Stop loop 129 now — cancels the in-flight session", tone: "destructive" };
      const rows = [
        { wire: null, remembered: undefined, node: "umamis-msi", local: "umamis-msi", button: STOP, remote: false },
        { wire: "drain", remembered: undefined, node: "umamis-msi", local: "umamis-msi", button: STOP_NOW, remote: false },
        { wire: null, remembered: { rung: 1, runId: "r1" }, node: "umamis-msi", local: "umamis-msi", button: STOP, remote: false },
        { wire: null, remembered: { rung: 2, runId: "r1" }, node: "umamis-msi", local: "umamis-msi", button: STOP_NOW, remote: false },
        { wire: "drain", remembered: { rung: 1, runId: "r1" }, node: "umamis-msi", local: "umamis-msi", button: STOP_NOW, remote: false },
        { wire: "cancel", remembered: undefined, node: "umamis-msi", local: "umamis-msi", button: null, remote: false },
        { wire: "drain", remembered: { rung: 3, runId: "r1" }, node: "umamis-msi", local: "umamis-msi", button: null, remote: false },
        { wire: null, remembered: { rung: 3, runId: "r1" }, node: "umamis-msi", local: "umamis-msi", button: null, remote: false },
        { wire: null, remembered: { rung: 3, runId: "r0" }, node: "umamis-msi", local: "umamis-msi", button: STOP, remote: false },
        { wire: "drain", remembered: { rung: 2, runId: "r0" }, node: "umamis-msi", local: "umamis-msi", button: STOP_NOW, remote: false },
        { wire: null, remembered: undefined, node: "umamis-mac-mini", local: "umamis-msi", button: null, remote: true },
        { wire: null, remembered: undefined, node: "umamis-msi", local: "ghost", button: null, remote: true },
        { wire: null, remembered: undefined, node: "umamis-msi", local: null, button: null, remote: false },
        { wire: null, remembered: undefined, node: "umamis-msi", local: "", button: null, remote: false },
        { wire: null, remembered: undefined, node: "Umamis-MSI", local: "umamis-msi", button: null, remote: true },
      ];
      for (const row of rows) {
        const label = `wire=${row.wire} remembered=${JSON.stringify(row.remembered)} node=${row.node} local=${JSON.stringify(row.local)}`;
        const answer = loopStopAffordance({ loop: E1({ stop: row.wire }), node: { nodeId: row.node }, localNodeId: row.local, remembered: row.remembered });
        assert.deepEqual(answer, { button: row.button, remote: row.remote }, label);
      }
    },
  },

  // ══ Scenario Outline: the remote tail says why there is no button, and the local line has none ══
  {
    name: "the-line-and-the-button-are-pure/03 the remote tail says why there is no button — composed by nodeWorkRegion, a remote node's title ends `· remote — stop from <nodeId>'s own console` and a local one carries no `remote` (Examples)",
    async run() {
      const remote = nodeWorkRegion({ nodeId: "umamis-mac-mini", presence: { activeRuns: [], sessions: [], loops: [E1()] } }, "umamis-msi");
      assert.ok(remote.loops[0].title.endsWith("· L2 · remote — stop from umamis-mac-mini's own console"), `the remote tail — got ${remote.loops[0].title}`);
      assert.equal(loopStopAffordance({ loop: remote.loops[0], node: { nodeId: "umamis-mac-mini" }, localNodeId: "umamis-msi" }).button, null, "…and no button");
      const local = nodeWorkRegion({ nodeId: "umamis-msi", presence: { activeRuns: [], sessions: [], loops: [E1()] } }, "umamis-msi");
      assert.ok(local.loops[0].title.endsWith("· L2"), `the local title ends with the level — got ${local.loops[0].title}`);
      assert.ok(!local.loops[0].title.includes("remote"), "…and contains no `remote`");
    },
  },

  // ══ Scenario Outline: the rung memory never lowers for the same drive, never expires on a timer, and is replaced by a new drive ══
  {
    name: "the-line-and-the-button-are-pure/03 the rung memory answers a NEW Map, never lowers a rung for the same drive, never expires, and a new drive starts a new memory; every other key rides through (Examples)",
    async run() {
      const rows = [
        { before: undefined, rung: 1, runId: "r1", after: { rung: 1, runId: "r1" } },
        { before: { rung: 1, runId: "r1" }, rung: 2, runId: "r1", after: { rung: 2, runId: "r1" } },
        { before: { rung: 1, runId: "r1" }, rung: 1, runId: "r1", after: { rung: 1, runId: "r1" } },
        { before: { rung: 2, runId: "r1" }, rung: 1, runId: "r1", after: { rung: 2, runId: "r1" } },
        { before: { rung: 3, runId: "r1" }, rung: 1, runId: "r1", after: { rung: 3, runId: "r1" } },
        { before: { rung: 3, runId: "r1" }, rung: 1, runId: "r2", after: { rung: 1, runId: "r2" } },
        { before: { rung: 2, runId: "r1" }, rung: 2, runId: "r2", after: { rung: 2, runId: "r2" } },
        { before: { rung: 2, runId: "r1" }, rung: 3, runId: "r1", after: { rung: 3, runId: "r1" }, other: { rung: 1, runId: "x" } },
      ];
      for (const row of rows) {
        const memory = new Map();
        if (row.before) memory.set("L1", row.before);
        if (row.other) memory.set("L2", row.other);
        const snapshot = new Map(memory);
        const next = rememberStopRung(memory, "L1", row.rung, row.runId);
        const label = `before=${JSON.stringify(row.before)} rung=${row.rung} runId=${row.runId}`;
        assert.notEqual(next, memory, `${label}: a NEW Map`);
        assert.deepEqual(next.get("L1"), row.after, `${label}: the memory for L1`);
        assert.deepEqual([...memory], [...snapshot], `${label}: the original Map is unchanged`);
        if (row.other) assert.deepEqual(next.get("L2"), row.other, `${label}: L2 still holds its own memory`);
      }
    },
  },

  // ══ Scenario Outline: nodeWorkRegion composes the pinned lines with the loop entries ══
  {
    name: "the-line-and-the-button-are-pure/03 nodeWorkRegion composes the pinned lines with the loop entries — idle dropped when a loop exists, the token primary, the entries ordered, the line never gated by locality (Examples)",
    async run() {
      const live = { sessionId: "s1", workspaceId: "w2", repo: "aof", assistant: "claude", lastPingAt: "2026-09-13T00:00:00.000Z", workspaceHasRun: false, relaying: false };
      const rows = [
        { label: "nothing", node: { nodeId: "umamis-msi", presence: { activeRuns: [], sessions: [] } }, local: "umamis-msi", lines: ["idle"], token: "muted", count: 0 },
        { label: "no presence at all", node: { nodeId: "umamis-msi" }, local: "umamis-msi", lines: ["idle"], token: "muted", count: 0 },
        { label: "a run, no loops", node: { nodeId: "umamis-msi", presence: { activeRuns: ["r1"] } }, local: "umamis-msi", lines: ["running 1 run"], token: "primary", count: 0 },
        { label: "a run and a loop", node: { nodeId: "umamis-msi", presence: { activeRuns: ["r1"], loops: [E1()] } }, local: "umamis-msi", lines: ["running 1 run"], token: "primary", count: 1 },
        { label: "a loop alone", node: { nodeId: "umamis-msi", presence: { activeRuns: [], sessions: [], loops: [E1()] } }, local: "umamis-msi", lines: [], token: "primary", count: 1 },
        { label: "a session and a loop", node: { nodeId: "umamis-msi", presence: { activeRuns: [], sessions: [live], loops: [E1()] } }, local: "umamis-msi", lines: ["working · aof (session)"], token: "primary", count: 1 },
        { label: "two loops", node: { nodeId: "umamis-msi", presence: { activeRuns: [], sessions: [], loops: [E1(), E1({ scope: "9", loopRunId: "L2" })] } }, local: "umamis-msi", lines: [], token: "primary", count: 2, order: ["129", "9"] },
        { label: "no localNodeId", node: { nodeId: "umamis-msi", presence: { activeRuns: [], sessions: [], loops: [E1()] } }, local: null, lines: [], token: "primary", count: 1 },
      ];
      for (const row of rows) {
        const region = nodeWorkRegion(row.node, row.local);
        assert.deepEqual(region.lines, row.lines, `${row.label}: lines`);
        assert.equal(region.token, row.token, `${row.label}: token`);
        assert.equal(region.loops.length, row.count, `${row.label}: loop entries`);
        if (row.order) assert.deepEqual(region.loops.map((entry) => entry.scope), row.order, `${row.label}: ordered`);
      }
    },
  },

  // ══ Scenario: the pinned projections are byte-identical ══
  {
    name: "the-line-and-the-button-are-pure/03 the pinned projections are byte-identical — fleetCurrentWorkLines over the captured producer fixtures answers the Rust-pinned lines, and nodeCurrentWork(node) equals fleetCurrentWorkLines(node.presence) for every fixture node, one with loops included",
    async run() {
      const rust = await readFile(path.join(repoRoot, "app", "desktop", "crates", "core", "src", "view_model.rs"), "utf8");
      const fixtures = [...rust.matchAll(/const\s+([A-Z0-9_]*REAL_CAPTURED[A-Z0-9_]*)\s*:\s*&str\s*=\s*r#"([\s\S]*?)"#;/g)].map((match) => ({ name: match[1], doc: JSON.parse(match[2]) }));
      assert.ok(fixtures.length > 0, "the captured producer fixtures were read (non-vacuous)");
      let nodesSeen = 0;
      for (const fixture of fixtures) {
        for (const node of fixture.doc.nodes ?? []) {
          nodesSeen += 1;
          assert.deepEqual(nodeCurrentWork(node), fleetCurrentWorkLines(node.presence ?? {}), `${fixture.name}/${node.nodeId}: nodeCurrentWork is the pinned projection`);
          if (node.local !== true) continue;
          for (const line of fleetCurrentWorkLines(node.presence ?? {}).lines) {
            assert.ok(rust.includes(`"${line.replace(/·/g, "\\u{b7}")}"`), `${fixture.name}: the Rust surface pins ${JSON.stringify(line)}`);
          }
        }
      }
      assert.ok(nodesSeen > 0, "at least one captured node was driven");
      // …and a presence carrying `loops` changes NOTHING about the pinned lines: the loop
      // entries are a sibling projection, never a line inside this one.
      const withLoops = { nodeId: "umamis-msi", presence: { activeRuns: ["r1"], sessions: [], loops: [E1()] } };
      assert.deepEqual(nodeCurrentWork(withLoops), fleetCurrentWorkLines(withLoops.presence), "nodeCurrentWork still equals fleetCurrentWorkLines with loops present");
      assert.deepEqual(fleetCurrentWorkLines(withLoops.presence), fleetCurrentWorkLines({ activeRuns: ["r1"], sessions: [] }), "…and the loops key is invisible to the pinned projection");
    },
  },

  // ══ Scenario: the projections never mutate their input ══
  {
    name: "the-line-and-the-button-are-pure/03 the projections never mutate their input — frozen presence and node in, none throws, inputs deep-equal after",
    async run() {
      const presence = Object.freeze({ activeRuns: Object.freeze(["r1"]), sessions: Object.freeze([]), loops: Object.freeze([Object.freeze(E1())]) });
      const node = Object.freeze({ nodeId: "umamis-msi", presence });
      const before = JSON.parse(JSON.stringify(node));
      const memory = new Map([["L1", { rung: 2, runId: "r1" }]]);
      assert.doesNotThrow(() => fleetLoopLines(presence));
      assert.doesNotThrow(() => fleetLoopLines(presence, memory));
      assert.doesNotThrow(() => loopStopAffordance({ loop: presence.loops[0], node, localNodeId: "umamis-msi", remembered: memory.get("L1") }));
      assert.doesNotThrow(() => nodeWorkRegion(node, "umamis-msi"));
      assert.doesNotThrow(() => nodeWorkRegion(node, "umamis-msi", memory));
      assert.deepEqual(JSON.parse(JSON.stringify(node)), before, "the inputs are what they were");
    },
  },

  // ══ Scenario: the type declarations name the four exports ══
  {
    name: "the-line-and-the-button-are-pure/03 the type declarations name the four exports — runs.d.mts declares fleetLoopLines, loopStopAffordance and rememberStopRung with their shapes; scope.d.mts declares nodeWorkRegion",
    async run() {
      const runs = await readFile(path.join(repoRoot, "ui", "src", "fleet", "runs.d.mts"), "utf8");
      assert.match(runs, /export declare function fleetLoopLines\(/);
      assert.match(runs, /export declare function loopStopAffordance\(/);
      assert.match(runs, /export declare function rememberStopRung\(/);
      assert.match(runs, /export type FleetLoopLine = \{[\s\S]*?key: string;[\s\S]*?line: string;[\s\S]*?title: string;[\s\S]*?loopRunId: string;[\s\S]*?scope: string;[\s\S]*?workspaceId: string \| null;[\s\S]*?stop: null \| "drain" \| "cancel";[\s\S]*?\};/, "the line entry's shape");
      assert.match(runs, /export type LoopStopButton = \{[\s\S]*?rung: 1 \| 2;[\s\S]*?label: "Stop" \| "Stop now";[\s\S]*?title: string;[\s\S]*?tone: "muted" \| "destructive";[\s\S]*?\};/, "the button's shape");
      assert.match(runs, /button: LoopStopButton \| null;[\s\S]*?remote: boolean;/, "the affordance's shape");
      assert.match(runs, /export type StopRungMemory = Map<string, RememberedStopRung>;/, "the memory's shape");
      const scope = await readFile(path.join(repoRoot, "ui", "src", "fleet", "scope.d.mts"), "utf8");
      assert.match(scope, /export declare function nodeWorkRegion\(/);
      assert.match(scope, /export type NodeWorkRegion = \{[\s\S]*?lines: string\[\];[\s\S]*?token: "primary" \| "muted";[\s\S]*?loops: FleetLoopLine\[\];[\s\S]*?\};/, "the region's shape");
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // milestone 130 / story 03 / task 04 — tasks/04_the-card-renders-and-repins.feature: the
  // @executable lanes. The REAL <Fleet/> mounted headlessly (fleet-app-harness over
  // react-app-harness) against a REAL serveMeshUi over the published assign fixture — every
  // answer PRODUCED: the card renders from presence records the test publishes into the
  // fixture's mesh root, the route answers from run records under the fixture's work dir (the
  // verb reads them), and in-flight / timeout states come from a hold plus the clock. The
  // serving node is `control-a` (the fixture's committed id); the remote node is a second
  // published node `umamis-mac-mini`. The 1280 render the designer judges is @uat and not here.
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // ══ Scenario: with no loops the region is byte-identical to today ══
  {
    name: "the-card-renders/04 with no loops the region is byte-identical to today — one <p> per pinned line with today's class string and title, no flex-row <p>, and no Stop button anywhere",
    async run() {
      await withLoopFleet({ loops: () => undefined }, async ({ app }) => {
        for (const nodeId of ["control-a", "umamis-mac-mini"]) {
          const card = nodeCard(app, nodeId);
          assert.ok(card, `${nodeId}: the card renders`);
          const lines = regionLines(card);
          assert.deepEqual(lines.map((line) => textOf(line)), ["running 1 run"], `${nodeId}: exactly one line`);
          assert.equal(lines[0].props.className, "text-[13px] font-semibold text-primary", `${nodeId}: today's class string`);
          assert.equal(lines[0].props.title, "running 1 run", `${nodeId}: title is the line`);
          assert.deepEqual(loopRows(card), [], `${nodeId}: no flex-row <p>`);
        }
        assert.deepEqual(stopButtons(app.tree()), [], "no Stop / Stop now button anywhere on the page");
      });
    },
  },

  // ══ Scenario Outline: the loop line renders with a button only on this node's card ══
  {
    name: "the-card-renders/04 the loop line renders with a button only on this node's card — Stop with the DESIGN's muted classes and aria-label on control-a, none on umamis-mac-mini (remote tail in the title), none anywhere when localNodeId is null (Examples)",
    async run() {
      // Rows 1 + 2: the published fixture serves as control-a.
      await withLoopFleet({}, async ({ app, workspaceId }) => {
        const local = nodeCard(app, "control-a");
        assert.deepEqual(regionLines(local).map((line) => textOf(line)), ["running 1 run"], "control-a: `running 1 run` first");
        const [row] = loopRows(local);
        assert.ok(row, "control-a: one flex-row <p>");
        assert.equal(row.props.className, "flex items-center gap-2 text-[13px] font-semibold text-primary", "control-a: the DESIGN's row classes");
        const text = rowText(row);
        assert.equal(text.props.className, "min-w-0 truncate", "control-a: the text span truncates");
        assert.equal(textOf(text), "loop 129 · continue 129/04 · cycle 1 of 3", "control-a: the line");
        assert.equal(text.props.title, "loop 129 · continue 129/04 · cycle 1 of 3 · L2", "control-a: the whole value plus the level tail in title");
        const button = rowButton(row);
        assert.ok(button, "control-a: ONE button");
        assert.equal(button.props.type, "button");
        assert.equal(textOf(button), "Stop");
        assert.equal(button.props["aria-label"], "Stop loop 129 — the current drive finishes first");
        assert.equal(button.props.title, "Stop loop 129 — the current drive finishes first");
        assert.equal(button.props.className, STOP_MUTED, "control-a: the DESIGN's muted classes");
        assert.equal(rowMessage(row), null, "control-a: no message span");
        assert.equal(loopRows(local).length, 1, "control-a: exactly one row");
        void workspaceId;

        const remote = nodeCard(app, "umamis-mac-mini");
        const [remoteRow] = loopRows(remote);
        assert.ok(remoteRow, "umamis-mac-mini: the line renders");
        assert.equal(textOf(rowText(remoteRow)), "loop 129 · continue 129/04 · cycle 1 of 3");
        assert.ok(rowText(remoteRow).props.title.endsWith("· L2 · remote — stop from umamis-mac-mini's own console"), `umamis-mac-mini: the remote tail — got ${rowText(remoteRow).props.title}`);
        assert.equal(rowButton(remoteRow), null, "umamis-mac-mini: no button");
        assert.equal(rowMessage(remoteRow), null, "umamis-mac-mini: no message span");
      });
      // Row 3: an UNCONFIGURED serving node — this file's own repo commits no mesh.nodeId, so
      // the payload names no node and no card shows a button, control-a's included.
      await withLoopFleet({ unconfigured: true }, async ({ app }) => {
        const status = app.requestsMatching("/api/mesh/status").length;
        assert.ok(status > 0, "the fleet loaded");
        const local = nodeCard(app, "control-a");
        const [row] = loopRows(local);
        assert.ok(row, "control-a: the line renders");
        assert.equal(rowText(row).props.title, "loop 129 · continue 129/04 · cycle 1 of 3 · L2", "control-a: no tail — neither local nor remote");
        assert.equal(rowButton(row), null, "control-a: no button with localNodeId null");
        assert.equal(rowMessage(row), null, "control-a: no message span");
      });
    },
  },

  // ══ Scenario: two loops on one card are two rows, each with its own button, in scope order ══
  {
    name: "the-card-renders/04 two loops on one card are two rows in scope order, each with its own Stop whose aria-label names its scope, and the region holds no idle line",
    async run() {
      await withLoopFleet({ loops: (E) => [E(), E({ scope: "131", loopRunId: "L2", ref: "131/00" })], activeRuns: [] }, async ({ app }) => {
        const card = nodeCard(app, "control-a");
        const rows = loopRows(card);
        assert.deepEqual(rows.map((row) => textOf(rowText(row))), ["loop 129 · continue 129/04 · cycle 1 of 3", "loop 131 · continue 131/00 · cycle 1 of 3"], "two rows, 129 before 131");
        assert.deepEqual(rows.map((row) => rowButton(row)?.props["aria-label"]), ["Stop loop 129 — the current drive finishes first", "Stop loop 131 — the current drive finishes first"], "each with its own Stop naming its scope");
        assert.deepEqual(regionLines(card), [], "no pinned line at all — and never `idle` while a loop exists");
        assert.ok(!textOf(card).includes("idle"), "the region holds no idle line");
      });
    },
  },

  // ══ Scenario: pressing Stop POSTs the route and climbs to rung two under the hold ══
  {
    name: "the-card-renders/04 pressing Stop POSTs the route once and climbs to rung two under the hold — disabled + aria-busy while held, no second request, then `stopping` + `Stop now` (destructive) disabled for exactly ASSIGN_SENT_HOLD_MS, the memory never decaying across later polls",
    async run() {
      await withLoopFleet({}, async ({ app, workspaceId, publish, E }) => {
        const held = app.holdNext("/api/mesh/loop-stop");
        const first = rowButton(loopRows(nodeCard(app, "control-a"))[0]);
        const pending = first.props.onClick(clickEvent());
        await app.renderOnly();
        const sent = app.requestsMatching("/api/mesh/loop-stop");
        assert.equal(sent.length, 1, "exactly one request was sent");
        assert.equal(sent[0].method, "POST");
        assert.deepEqual(sent[0].body, { scope: "129", workspaceId }, "the body is exactly { scope, workspaceId }");
        assert.ok(held.claimed(), "…and its answer is held");
        const inFlight = loopRows(nodeCard(app, "control-a"))[0];
        assert.equal(rowButton(inFlight).props.disabled, true, "while held the button is disabled");
        assert.equal(rowButton(inFlight).props["aria-busy"], "true", "…with aria-busy");
        assert.equal(textOf(rowButton(inFlight)), "Stop", "…still reading Stop");
        assert.equal(textOf(rowText(inFlight)), "loop 129 · continue 129/04 · cycle 1 of 3", "…and the line is unchanged");
        // A second click while held sends nothing: the button is disabled, and even a forced
        // click reaches an orchestration that is already in flight.
        assert.equal(rowButton(inFlight).props.disabled, true);
        assert.equal(app.requestsMatching("/api/mesh/loop-stop").length, 1, "no second request");

        await held.answered();
        held.release();
        await pending;
        await app.flush();
        const after = loopRows(nodeCard(app, "control-a"))[0];
        assert.equal(textOf(rowText(after)), "loop 129 · stopping · continue 129/04 · cycle 1 of 3", "on the 2xx the line reads stopping");
        assert.equal(textOf(rowButton(after)), "Stop now", "…and the button reads Stop now");
        assert.equal(rowButton(after).props["aria-label"], "Stop loop 129 now — cancels the in-flight session");
        assert.equal(rowButton(after).props.className, STOP_DESTRUCTIVE, "…in the DESIGN's destructive classes");
        assert.equal(rowButton(after).props.disabled, true, "…disabled under the hold");
        assert.equal(rowMessage(after), null, "no message span");

        await app.advance(ASSIGN_SENT_HOLD_MS - 1);
        assert.equal(rowButton(loopRows(nodeCard(app, "control-a"))[0]).props.disabled, true, "disabled one millisecond before the hold elapses");
        await app.advance(1);
        assert.equal(rowButton(loopRows(nodeCard(app, "control-a"))[0]).props.disabled, false, "enabled at ASSIGN_SENT_HOLD_MS");
        assert.equal(textOf(rowButton(loopRows(nodeCard(app, "control-a"))[0])), "Stop now", "…still Stop now");

        // A later poll whose presence still says `stop: null` (the propagation gap) keeps the
        // held word and the rung — the memory never decays on a timer.
        await publish("control-a", { loops: [E()] });
        await app.advance(POLL_MS);
        const gap = loopRows(nodeCard(app, "control-a"))[0];
        assert.equal(textOf(rowText(gap)), "loop 129 · stopping · continue 129/04 · cycle 1 of 3", "the propagation gap keeps stopping");
        assert.equal(textOf(rowButton(gap)), "Stop now", "…and Stop now");
        // …and once the wire carries `drain`, nothing moves.
        await publish("control-a", { loops: [E({ stop: "drain" })] });
        await app.advance(POLL_MS);
        const caughtUp = loopRows(nodeCard(app, "control-a"))[0];
        assert.equal(textOf(rowText(caughtUp)), "loop 129 · stopping · continue 129/04 · cycle 1 of 3", "the wire caught up — same line");
        assert.equal(textOf(rowButton(caughtUp)), "Stop now", "…same button");
        assert.equal(rowButton(caughtUp).props.disabled, false);
      });
    },
  },

  // ══ Scenario: pressing Stop now cancels and the button is gone ══
  {
    name: "the-card-renders/04 pressing Stop now cancels and the button is gone — `cancelling`, no button, no message; a later poll that no longer lists the loop removes the line and the region reads idle in the same render",
    async run() {
      await withLoopFleet({ loops: (E) => [E({ stop: "drain" })], requestFirst: true }, async ({ app, publish }) => {
        const [row] = loopRows(nodeCard(app, "control-a"));
        assert.equal(textOf(rowButton(row)), "Stop now", "the card is at rung 2 (the premise)");
        await rowButton(row).props.onClick(clickEvent());
        await app.flush();
        const answered = app.requestsMatching("/api/mesh/loop-stop");
        assert.equal(answered.length, 1, "one POST");
        const cancelled = loopRows(nodeCard(app, "control-a"))[0];
        assert.equal(textOf(rowText(cancelled)), "loop 129 · cancelling · continue 129/04 · cycle 1 of 3", "the line reads cancelling");
        assert.equal(rowButton(cancelled), null, "the row holds no button");
        assert.equal(rowMessage(cancelled), null, "…and no message span");
        // The loop halts: the next poll's presence lists no loop and no run.
        await publish("control-a", { activeRuns: [], loops: undefined });
        await app.advance(POLL_MS);
        const card = nodeCard(app, "control-a");
        assert.deepEqual(loopRows(card), [], "the line is gone");
        assert.deepEqual(regionLines(card).map((line) => textOf(line)), ["idle"], "…and the region reads idle in the same render");
      });
    },
  },

  // ══ Scenario Outline: after a cancel the card follows the drive, not the clock ══
  {
    name: "the-card-renders/04 after a cancel the card follows the drive, not the clock — the same runId with stop: null keeps cancelling with no button; a new runId reads as a fresh loop line with Stop (Examples)",
    async run() {
      const rows = [
        { runId: "r1", line: "loop 129 · cancelling · continue 129/04 · cycle 1 of 3", button: null },
        { runId: "r2", line: "loop 129 · continue 129/04 · cycle 1 of 3", button: "Stop" },
      ];
      for (const row of rows) {
        await withLoopFleet({ loops: (E) => [E({ stop: "drain" })], requestFirst: true }, async ({ app, publish, E }) => {
          const [before] = loopRows(nodeCard(app, "control-a"));
          await rowButton(before).props.onClick(clickEvent());
          await app.flush();
          assert.equal(rowButton(loopRows(nodeCard(app, "control-a"))[0]), null, "rung 2's 2xx passed (the premise)");
          await publish("control-a", { loops: [E({ stop: null, runId: row.runId })] });
          await app.advance(POLL_MS);
          const [after] = loopRows(nodeCard(app, "control-a"));
          assert.equal(textOf(rowText(after)), row.line, `runId ${row.runId}: the line`);
          assert.equal(rowButton(after) ? textOf(rowButton(after)) : null, row.button, `runId ${row.runId}: the button`);
        });
      }
    },
  },

  // ══ Scenario Outline: a refusal renders in the message slot and the button keeps its rung ══
  {
    name: "the-card-renders/04 a refusal renders in the message slot and the button keeps its rung — not local / no loop / the server sentence for an unmapped code / timed out; no hold, the line unchanged, a second click sends again (Examples)",
    async run() {
      const rows = [
        { label: "not local", rung: 1, arrange: async ({ root }) => writeLoopStream129(root, { node: "umamis-mac-mini" }), word: "not local", title: (title) => title.includes("umamis-mac-mini") && title.includes("control-a") },
        { label: "no loop at rung 1", rung: 1, arrange: async ({ root }) => writeLoopStream129(root, { brief: {} }), word: "no loop", title: (title) => /no loop to stop/i.test(title) },
        { label: "no loop at rung 2", rung: 2, arrange: async ({ root }) => writeLoopStream129(root, { brief: {} }), word: "no loop", title: (title) => /no loop to stop/i.test(title) },
        { label: "workspace removed", rung: 1, arrange: async ({ home, workspaceId }) => removeWorkspaceFromProjection({ home }, workspaceId), word: (workspaceId) => `Workspace "${workspaceId}" is not in the mesh projection.`, title: (title, workspaceId) => title === `Workspace "${workspaceId}" is not in the mesh projection.` },
        { label: "timed out", rung: 1, hold: true, word: "timed out", title: (title) => /10s|two poll intervals/.test(title) && /may still have landed/.test(title) && !/failed/.test(title) },
      ];
      for (const row of rows) {
        const loops = row.rung === 2 ? (E) => [E({ stop: "drain" })] : undefined;
        await withLoopFleet({ ...(loops ? { loops, requestFirst: true } : {}) }, async ({ app, root, home, workspaceId }) => {
          const before = rowButton(loopRows(nodeCard(app, "control-a"))[0]);
          const priorLabel = textOf(before);
          assert.equal(priorLabel, row.rung === 2 ? "Stop now" : "Stop", `${row.label}: the rung (premise)`);
          if (row.arrange) await row.arrange({ root, home, workspaceId });
          if (row.hold) {
            const held = app.holdNext("/api/mesh/loop-stop");
            const pending = before.props.onClick(clickEvent());
            await app.renderOnly();
            await held.answered();
            await app.advanceHeld(ASSIGN_TIMEOUT_MS);
            const timedOut = loopRows(nodeCard(app, "control-a"))[0];
            assert.equal(textOf(rowMessage(timedOut)), "timed out", `${row.label}: the message word`);
            assert.ok(row.title(rowMessage(timedOut).props.title), `${row.label}: the title names the wait and says it may still have landed — got ${rowMessage(timedOut).props.title}`);
            assert.equal(rowMessage(timedOut).props.className, MESSAGE_CLASS);
            assert.equal(textOf(rowButton(timedOut)), priorLabel, `${row.label}: the button reads its prior label`);
            assert.equal(rowButton(timedOut).props.disabled, false, `${row.label}: …and is enabled at once — no hold`);
            held.release();
            await pending;
            await app.flush();
            return;
          }
          await before.props.onClick(clickEvent());
          await app.flush();
          const refused = loopRows(nodeCard(app, "control-a"))[0];
          const message = rowMessage(refused);
          assert.ok(message, `${row.label}: the message span renders`);
          const word = typeof row.word === "function" ? row.word(workspaceId) : row.word;
          assert.equal(textOf(message), word, `${row.label}: the message word`);
          assert.ok(row.title(message.props.title, workspaceId), `${row.label}: the title carries the server sentence — got ${message.props.title}`);
          assert.equal(message.props.className, MESSAGE_CLASS, `${row.label}: the DESIGN's message classes`);
          assert.equal(textOf(rowButton(refused)), priorLabel, `${row.label}: the button keeps its prior label`);
          assert.equal(rowButton(refused).props.disabled, false, `${row.label}: …enabled at once — no hold`);
          assert.equal(textOf(rowText(refused)), textOf(rowText(loopRows(nodeCard(app, "control-a"))[0])), `${row.label}: the line is unchanged`);
          // A second click after the refusal sends a second request and the message follows.
          await rowButton(refused).props.onClick(clickEvent());
          await app.flush();
          assert.equal(app.requestsMatching("/api/mesh/loop-stop").length, 2, `${row.label}: a second click sends a second request`);
          assert.ok(rowMessage(loopRows(nodeCard(app, "control-a"))[0]), `${row.label}: …and the message reads the new outcome`);
        });
      }
    },
  },

  // ══ Scenario: the one fetch and the budgets ══
  {
    name: "the-card-renders/04 the one fetch and the budgets — exactly api.ts fetches /api/mesh/loop-stop inside fleetApi.loopStop and throws the coded envelope on a non-2xx; ui/src/fleet holds exactly 20 files; Fleet.tsx is at most 1560 lines; no loops-* token anywhere under ui/",
    async run() {
      const uiSrc = path.join(repoRoot, "ui", "src");
      const files = await filesBelow(uiSrc);
      const fetching = [];
      for (const file of files) {
        if ((await readFile(file, "utf8")).includes('fetch("/api/mesh/loop-stop"')) fetching.push(path.relative(repoRoot, file).replaceAll("\\", "/"));
      }
      assert.deepEqual(fetching, ["ui/src/fleet/api.ts"], "exactly one file fetches the route");
      const api = await readFile(path.join(uiSrc, "fleet", "api.ts"), "utf8");
      const loopStop = /async loopStop\(scope: string, workspaceId: string\)[\s\S]*?\n  \},/.exec(api);
      assert.ok(loopStop, "fleetApi.loopStop(scope, workspaceId) is declared");
      assert.match(loopStop[0], /fetch\("\/api\/mesh\/loop-stop"/, "…and it is where the fetch lives");
      assert.match(loopStop[0], /if \(!response\.ok\) throw await safeError\(response\);/, "…throwing the coded envelope on a non-2xx as assign does");
      const fleetFiles = (await readdir(path.join(uiSrc, "fleet"), { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name);
      const fleetBudget = UI_DIRECTORY_BUDGETS.find((row) => row.directory === "fleet");
      assert.ok(fleetBudget, "ui/src/fleet has a directory-budget row (the ceiling's one home)");
      for (const touched of ["api.ts", "runs.mjs", "runs.d.mts", "scope.mjs", "scope.d.mts", "Fleet.tsx"]) {
        assert.ok(fleetFiles.includes(touched), `the walk reached the directory (non-vacuous): ${touched} is a member`);
      }
      assert.ok(fleetFiles.length <= fleetBudget.ceiling + fleetBudget.allowance, `no new file under ui/src/fleet/ — ${fleetFiles.length} members against the directory budget's ceiling of ${fleetBudget.ceiling} (acd-ui-directory-budget: ${fleetBudget.why.slice(0, 60)}…)`);
      const fleet = await readFile(path.join(uiSrc, "fleet", "Fleet.tsx"), "utf8");
      assert.ok(fleet.split(/\r?\n/).length <= 1560, `Fleet.tsx is at most 1560 lines — measured ${fleet.split(/\r?\n/).length}`);
      const forbidden = /work[-/]loops|loops-show|loops-graph|loops-groundedness|loops-validate|work:loops-/;
      for (const file of await filesBelow(path.join(repoRoot, "ui"))) {
        assert.doesNotMatch(await readFile(file, "utf8"), forbidden, `${path.relative(repoRoot, file)} carries no loops-* token (FF-5202)`);
      }
    },
  },

  // ══ Scenario: FF-5307 is re-pinned with the measurement, or not at all ══
  {
    name: "the-card-renders/04 FF-5307 is re-pinned with the measurement — the ui/ hash comment names milestone 130, every fleet file git diff reports, nothing under ui/src/board/ and board-ui.mjs's unchanged digest; the store and board pins are unmoved; the control is green over the delivered tree",
    async run() {
      const gate = await readFile(path.join(repoRoot, "test", "arch", "loop", "acd-loop-state-rides-the-run-record.test.mjs"), "utf8");
      const rePin = /RE-PINNED by 130\/03[\s\S]*?assert\.equal\(hash\.digest\("hex"\)/.exec(gate);
      assert.ok(rePin, "the ui/ hash assertion carries a 130/03 re-pin comment directly above it");
      for (const file of ["api.ts", "runs.mjs", "runs.d.mts", "scope.mjs", "scope.d.mts", "Fleet.tsx", "assign-affordance.mjs", "assign-affordance.d.mts"]) {
        assert.ok(rePin[0].includes(file), `the re-pin names ${file}`);
      }
      assert.match(rePin[0], /nothing under `ui\/src\/board\/`/i, "…says nothing under ui/src/board/ moved");
      assert.match(rePin[0], /src\/board-ui\.mjs/, "…and that src/board-ui.mjs's digest is unchanged");
      assert.match(gate, /\["src\/run-store\.mjs", "f18e5080e3e3d9990c1495ff2ec477729ef583f1220ece318e49c62ea615293d"\]/, "the run-store pin is the digest it was before this story");
      assert.match(gate, /\["src\/board-ui\.mjs", "959ebf96fc19bd207654f3f4cbf2f02b093ecf0d28d548c714ed6ffb60f07518"\]/, "the board-ui pin is the digest it was before this story");
      const { archTests } = await import("../arch/loop/acd-loop-state-rides-the-run-record.test.mjs");
      const control = archTests.find((test) => /frozen store and board read surfaces/.test(test.name));
      assert.ok(control, "the FF-5307 digest control exists");
      await control.run();
    },
  },
];

// ══════════════════════ m47 / story 02 — the task-01 and task-02 payload fixtures ══════
//
// Declared AFTER the array on purpose: function declarations hoist, and moving them above
// it would shift the lane ADR-009 pins by line number (test/ui/fleet-scope.test.mjs:100-105).
// The shape is the one `shapeGlobalStatus` (src/global-mesh-query.mjs:269-291) actually
// emits — `scope`, `workspaceId`, `stalenessSeconds`, `workspaces[]`, `items[]`, `nodes[]`
// and a `diagnostics` block. Each call returns a FRESH object so a lane asserting
// non-mutation cannot be fooled by a previous lane's leftovers.

// Two published workspaces, alpha ("lark-guard") and beta, each with a milestone and story
// rows, and a node roster spanning both — plus the membership boundary cases task 01
// scenario 3 enumerates.
function m47Payload() {
  return {
    scope: "global",
    workspaceId: null,
    stalenessSeconds: 900,
    workspaces: [
      { workspaceId: "alpha", projectRoot: "/src/alpha", workDir: "wiki/work", name: "lark-guard", lastPublishedAt: "2026-08-10T09:00:00.000Z", meshEnabled: true, controlNode: "node-a" },
      { workspaceId: "beta", projectRoot: "/src/beta", workDir: "wiki/work", name: "beta-repo", lastPublishedAt: "2026-08-10T09:05:00.000Z", meshEnabled: true, controlNode: "node-b" },
    ],
    items: [
      {
        workspaceId: "alpha", ref: "47", type: "milestone", slug: "fleet-repo-filter", status: "in-progress",
        title: "/fleet with a repo filter", parent: null, sourcePath: "wiki/work/47_milestone_fleet-repo-filter/SPEC.md",
        assignment: { assignmentId: "as-1", state: "running", targetNodeId: "only-alpha", issuer: "node-a", runId: "r-1", assignedAt: "2026-08-10T09:01:00.000Z", updatedAt: "2026-08-10T09:01:30.000Z", reclaimedAt: null },
        reportedBy: "node-a", syncedAt: "2026-08-10T09:02:00.000Z",
      },
      { workspaceId: "beta", ref: "12", type: "milestone", slug: "beta-milestone", status: "not-started", title: "Beta", parent: null, sourcePath: "wiki/work/12/SPEC.md" },
      { workspaceId: "alpha", ref: "47/02", type: "story", slug: "repo-filter-model", status: "in-review", title: "The repo filter as a pure module", parent: "47", sourcePath: "…/STORY.md" },
      { workspaceId: "beta", ref: "12/00", type: "story", slug: "beta-story", status: "done", title: "Beta story", parent: "12", sourcePath: "…/STORY.md" },
      { workspaceId: "alpha", ref: "47/02/00", type: "task", slug: "repo-url-contract", status: "not-started", title: "The URL contract", parent: "47/02", sourcePath: "…/00.feature" },
      { workspaceId: "beta", ref: "12/00/00", type: "task", slug: "beta-task", status: "done", title: "Beta task", parent: "12/00", sourcePath: "…/00.feature" },
      { workspaceId: "alpha", ref: "47/01", type: "story", slug: "dead-branch", status: "done", title: "The deletion", parent: "47", sourcePath: "…/STORY.md" },
    ],
    nodes: [
      {
        nodeId: "only-alpha", role: "control", host: "alpha-host", workspaceIds: ["alpha"], freshness: "live",
        runtimes: ["claude"], skills: ["aof-refine"], fabric: { address: "ws://alpha.tailnet:7007", online: true },
        presence: { nodeId: "only-alpha", heartbeatAt: "2026-08-10T09:04:00.000Z", activeRuns: [], aofVersion: "0.1.0" },
        assignments: [{ assignmentId: "as-1", state: "running", targetNodeId: "only-alpha", issuer: "node-a", runId: "r-1", assignedAt: "2026-08-10T09:01:00.000Z", updatedAt: "2026-08-10T09:01:30.000Z", reclaimedAt: null }],
      },
      { nodeId: "both", role: "worker", host: "both-host", workspaceIds: ["alpha", "beta"], freshness: "live" },
      { nodeId: "only-beta", role: "worker", host: "beta-host", workspaceIds: ["beta"], freshness: "live" },
      { nodeId: "never-published", role: "worker", host: "new-host", workspaceIds: [], freshness: "live" },
      { nodeId: "older-descriptor", role: "worker", host: "old-host", freshness: "unknown" },
      { nodeId: "stale-alpha", role: "worker", host: "stale-host", workspaceIds: ["alpha"], freshness: "stale" },
      { nodeId: "never-beat-alpha", role: "worker", host: "quiet-host", workspaceIds: ["alpha"], freshness: "unknown" },
      { nodeId: "case-alpha", role: "worker", host: "case-host", workspaceIds: ["ALPHA"], freshness: "live" },
    ],
    diagnostics: {
      projectedAt: "2026-08-10T09:06:00.000Z",
      generatedAt: "2026-08-10T09:06:30.000Z",
      databasePath: "C:/Users/Umami/.aof/mesh/work/projection.sqlite",
      skippedWorkspaces: [
        { workspaceId: "alpha", reason: "mesh-global-disabled", message: "alpha is skipped" },
        { workspaceId: "beta", reason: "mesh-global-disabled", message: "beta is skipped" },
      ],
      descriptorErrors: [{ id: "node-x", path: "C:/Users/Umami/.aof/mesh/nodes/node-x.json", code: "descriptor-unparseable", message: "bad json" }],
      projectionErrors: [
        { workspaceId: "alpha", sourcePath: "wiki/work/47/SPEC.md", code: null, message: "alpha projection error" },
        { workspaceId: "beta", sourcePath: "wiki/work/12/SPEC.md", code: null, message: "beta projection error" },
      ],
    },
  };
}

// The payload a `?scope=local` (or a --local-started) server serves: the SAME shape, already
// narrowed by the SERVER to the daemon's own workspace, with `scope` relabelled "local".
//
// THE ROSTER RIDES THROUGH MACHINE-WIDE, and that is the whole point of this fixture.
// The real server does not narrow the roster at all under `?scope=local` —
// global-node-registry.mjs:170-172, the seam's own comment at mesh-ui-serve.mjs:552-554,
// and the green behavioural pin in acd-mesh-ui-local-filter-preserves-status:94 — so a
// roster carrying a beta member is a real shape and its answer under `repo=beta` is that
// member, not nothing. This fixture used to apply an `alphaOnly` roster predicate, which
// deleted precisely the rows that would have falsified task 02 scenario 1's old rows 2 and
// 3; ADR-010 ruled on it and the predicate is GONE. **A lane that needs a beta-free roster
// removes the named nodes AT THE LANE, visibly** — never here, where the removal would
// apply silently to every lane and turn a gate into a rehearsal.
//
// WHAT THE SERVER *DOES* NARROW STAYS NARROWED, verified at source: `workspaces` and
// `items`, and the two workspace-carrying `diagnostics` members
// (global-mesh-query.mjs:228 for `skippedWorkspaces`, :241 for `projectionErrors`).
// Only the `nodes` line was ever wrong.
function m47LocalPayload() {
  const global = m47Payload();
  return {
    ...global,
    scope: "local",
    // The SERVED narrowing (ADR-010 clause 5). Set exactly when the server narrowed, and
    // it is what tells an out-of-scope filter from an unknown one.
    workspaceId: "alpha",
    workspaces: global.workspaces.filter((w) => w.workspaceId === "alpha"),
    items: global.items.filter((row) => row.workspaceId === "alpha"),
    nodes: global.nodes,
    diagnostics: {
      ...global.diagnostics,
      skippedWorkspaces: global.diagnostics.skippedWorkspaces.filter((row) => row.workspaceId === "alpha"),
      projectionErrors: global.diagnostics.projectionErrors.filter((row) => row.workspaceId === "alpha"),
    },
  };
}

// A mesh carrying ONE published-but-QUIET workspace — on the mesh, published, and with no
// work items and no nodes. Un-narrowed it is POPULATED (a real and common state: every
// fresh install); narrowed to alpha it is the DG-47-3 gap ADR-009 rules on.
function m47QuietPayload() {
  return {
    scope: "global",
    workspaceId: null,
    stalenessSeconds: 900,
    workspaces: [{ workspaceId: "alpha", projectRoot: "/src/alpha", workDir: "wiki/work", name: "lark-guard", lastPublishedAt: "2026-08-10T09:00:00.000Z", meshEnabled: true, controlNode: null }],
    items: [],
    nodes: [],
    diagnostics: { projectedAt: "2026-08-10T09:06:00.000Z", generatedAt: "2026-08-10T09:06:30.000Z", databasePath: "C:/Users/Umami/.aof/mesh/work/projection.sqlite", skippedWorkspaces: [], descriptorErrors: [], projectionErrors: [] },
  };
}
