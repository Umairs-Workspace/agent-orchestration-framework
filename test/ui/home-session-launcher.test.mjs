// milestone 50 / story 04 / task 01 — THE NEW-SESSION PICKER (@executable).
//
// Every Scenario and every Examples ROW of
// `wiki/work/50_milestone_session-launcher/stories/04_story_session-launcher-affordance/tasks/01_new-session-picker.feature`,
// driven against the SHIPPED `ui/src/home/session-launcher.mjs` with literal
// `/api/mesh/status` payloads. Every `Then` reads a RETURNED VALUE or the REQUEST BODY the
// module produces — no scenario reads a DOM node, a React state or a rendered string.
//
// ISOLATION. The module is pure — no store, no server, no clock, no port. Nothing here binds
// anything (:4181/:4182 are held by the live daemons on the control node), and the runner still
// hands every case a fresh `AOF_GLOBAL_HOME`.
import assert from "node:assert/strict";
import {
  LAUNCHER_DEPARTED_NOTE,
  LAUNCHER_FIELD_LIST,
  LAUNCHER_ITEM_DEPARTED_NOTE,
  LAUNCHER_ITEM_NEEDS_REPO_REASON,
  LAUNCHER_ITEM_ROOT_LABEL,
  LAUNCHER_LIVENESS_WORDS,
  LAUNCHER_NO_ITEMS_REASON,
  LAUNCHER_NO_NODES_REASON,
  LAUNCHER_NO_PAYLOAD_REASON,
  LAUNCHER_REPO_GROUP_ON,
  launcherItemOptions,
  launcherNodeOptions,
  launcherOpenDefaults,
  launcherReduce,
  launcherRepoGroupOff,
  launcherRepoOptions,
  launcherRequestBody,
  launcherResolveSelection,
  launcherRest,
  sessionLauncherView,
} from "../../ui/src/home/session-launcher.mjs";

// ── the payload, spelled the way the fleet face serves it ────────────────────────────────
const node = (nodeId, freshness = "live", workspaceIds = []) => ({
  nodeId,
  role: "worker",
  controlNode: false,
  host: `${nodeId}.local`,
  runtimes: ["node"],
  skills: [],
  freshness,
  workspaceIds,
});
const workspace = (workspaceId, name = null) => ({ workspaceId, projectRoot: `C:/src/${workspaceId}`, workDir: "wiki/work", name, meshEnabled: true });
const workItem = (workspaceId, ref, title = null) => ({ workspaceId, ref, type: "story", slug: "a-slug", status: "in-progress", title });
const payload = (parts = {}) => ({ nodes: [], workspaces: [], items: [], sessions: [], ...parts });

const optionValues = (options) => options.map((option) => option.value);

const opened = (status, selection = {}) => {
  let machine = launcherReduce(launcherRest(), { type: "open", defaults: launcherOpenDefaults(status) });
  for (const [field, value] of Object.entries(selection)) machine = launcherReduce(machine, { type: "choose", field, value });
  return machine;
};
const viewOf = (status, machine = opened(status), now = 0) => sessionLauncherView({ status, machine, now });
const fieldOf = (view, id) => view.panel.fields.find((field) => field.id === id);

// Every string anywhere in a returned value — the sweep the assistant clause is asserted with.
const stringsOf = (value, seen = new Set()) => {
  if (typeof value === "string") return [value];
  if (value == null || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  return Object.values(value).flatMap((child) => stringsOf(child, seen));
};

// The three-workspace fleet the F2/F3 scenarios are written against.
const FLEET = payload({
  nodes: [node("n1", "live", ["ws-aof", "ws-test"]), node("n2", "stale", ["ws-test"])],
  workspaces: [workspace("ws-aof"), workspace("ws-test"), workspace("ws-remote")],
  items: [workItem("ws-aof", "50/04", "The new-session affordance"), workItem("ws-aof", "49/02", null), workItem("ws-test", "12", "A test item")],
});

export const homeSessionLauncherPickerTests = [
  // ══ F1 · Scenario Outline: every node on the payload is an option, whatever its liveness ══
  {
    name: "50/04 task01 — F1: every node on the payload is an option in codepoint order, whatever its liveness, role, membership or capabilities",
    run: async () => {
      const rows = [
        { label: "one live worker", nodes: [node("n1", "live")], options: ["n1"] },
        { label: "live and stale together", nodes: [node("n2", "stale"), node("n1", "live")], options: ["n1", "n2"] },
        { label: "a never-beat node", nodes: [node("n1", "live"), node("n3", "unknown")], options: ["n1", "n3"] },
        { label: "the control node itself", nodes: [{ ...node("control", "live"), role: "control", controlNode: true }, node("n1", "live")], options: ["control", "n1"] },
        { label: "a node holding no workspaces", nodes: [node("n1", "live", [])], options: ["n1"] },
        { label: "an empty roster", nodes: [], options: [] },
        { label: "a malformed row beside a good one", nodes: [node("n1", "live"), "n2"], options: ["n1"] },
        { label: "a row with a blank nodeId", nodes: [node("n1", "live"), { ...node("x"), nodeId: "" }], options: ["n1"] },
      ];
      for (const row of rows) {
        const status = payload({ nodes: row.nodes });
        const options = launcherNodeOptions(status);
        assert.deepEqual(optionValues(options), row.options, `${row.label}: the options are exactly the roster, codepoint-ascending`);
        // The picker ANNOTATES; the route REFUSES. Nothing is dropped for a fact about it.
        const wellFormed = row.nodes.filter((candidate) => candidate != null && typeof candidate === "object" && candidate.nodeId !== "").length;
        assert.equal(options.length, wellFormed, `${row.label}: no node was dropped for its freshness, role, membership or capabilities`);
        for (const option of options) {
          const source = row.nodes.find((candidate) => candidate?.nodeId === option.value);
          assert.equal(option.freshness, source.freshness, `${row.label}: ${option.value} carries its own freshness verbatim`);
        }
        // …and the same options through the rendered field, so the panel cannot narrow them.
        if (row.options.length > 0) {
          assert.deepEqual(optionValues(fieldOf(viewOf(status), "node").options), row.options, `${row.label}: F1 renders the same list`);
        }
      }
    },
  },

  // ══ Scenario: node liveness borrows the three words the product already has ══════════════
  {
    name: "50/04 task01 — F1: liveness borrows the product's three words, `live` earns no mark, and no fourth word appears anywhere in the module's output",
    run: async () => {
      const status = payload({ nodes: [node("n1", "live"), node("n2", "stale"), node("n3", "unknown")], workspaces: [workspace("ws-aof")] });
      const options = launcherNodeOptions(status);
      const annotationOf = (value) => options.find((option) => option.value === value).annotation;
      assert.equal(annotationOf("n2"), "stale");
      assert.equal(annotationOf("n3"), "unknown");
      assert.equal(annotationOf("n1"), null, "`live` earns NO annotation — only a deviation is marked");

      // No fourth liveness word: every annotation the module can return is one of the three,
      // and the only word it ever renders for a node the payload did not describe is `unknown`.
      const annotations = new Set(launcherNodeOptions(payload({ nodes: [node("n1", "live"), node("n4", "sparkling"), { nodeId: "n5" }] })).map((option) => option.annotation));
      assert.deepEqual([...annotations].filter((word) => word != null && !LAUNCHER_LIVENESS_WORDS.includes(word)), [], "no fourth liveness word");
      assert.deepEqual([...LAUNCHER_LIVENESS_WORDS], ["live", "stale", "unknown"], "the three words are the product's own");
    },
  },

  // ══ Scenario Outline: the default selection depends only on how many nodes there are ═════
  {
    name: "50/04 task01 — F1: the default selection depends ONLY on how many nodes there are, and the submit action needs both F1 and F2",
    run: async () => {
      const rows = [
        { label: "one node", nodes: [node("n1")], chosen: "n1" },
        { label: "more than one node", nodes: [node("n1"), node("n2")], chosen: null },
        { label: "more than one, one live", nodes: [node("n1", "live"), node("n2", "stale")], chosen: null },
      ];
      for (const row of rows) {
        const status = payload({ nodes: row.nodes, workspaces: [workspace("ws-aof")] });
        const view = viewOf(status);
        assert.equal(fieldOf(view, "node").value, row.chosen, `${row.label}: F1's chosen value`);
        assert.equal(view.panel.actionDisabled, true, `${row.label}: the action is disabled until BOTH fields hold a value`);
      }
      // …and enabled the moment they both do, and not before.
      const status = payload({ nodes: [node("n1"), node("n2")], workspaces: [workspace("ws-aof")] });
      assert.equal(viewOf(status, opened(status, { node: "n1" })).panel.actionDisabled, true, "one field is not enough");
      assert.equal(viewOf(status, opened(status, { node: "n1", repo: "ws-aof" })).panel.actionDisabled, false, "both fields, and the action is enabled");
    },
  },

  // ══ F2 · Scenario: every workspace on the payload is an option, in two groups ════════════
  {
    name: "50/04 task01 — F2: every workspace is an option in two membership groups, ordered codepoint-ascending, with a null name still identified by its id",
    run: async () => {
      const options = launcherRepoOptions(FLEET, { nodeId: "n1" });
      assert.deepEqual(optionValues(options), ["ws-aof", "ws-test", "ws-remote"], "all three are options — membership groups the list, it never shortens it");
      const groupOf = (value) => options.find((option) => option.value === value).group;
      assert.equal(groupOf("ws-aof"), LAUNCHER_REPO_GROUP_ON);
      assert.equal(groupOf("ws-test"), LAUNCHER_REPO_GROUP_ON);
      assert.equal(groupOf("ws-remote"), launcherRepoGroupOff("n1"), "the second group's label names the chosen node");
      assert.equal(launcherRepoGroupOff("n1"), "not on n1");

      // Within each group: codepoint-ascending by workspaceId, never keyed on liveness,
      // recency or session count.
      const onNode = options.filter((option) => option.onNode === true).map((option) => option.value);
      const offNode = options.filter((option) => option.onNode === false).map((option) => option.value);
      assert.deepEqual(onNode, [...onNode].sort());
      assert.deepEqual(offNode, [...offNode].sort());

      // A workspace whose `name` is null still renders, identified by its workspaceId.
      const named = launcherRepoOptions(payload({ nodes: [node("n1")], workspaces: [workspace("ws-aof", null), workspace("ws-test", "The test repo")] }), { nodeId: "n1" });
      assert.deepEqual(named.map((option) => option.label), ["ws-aof", "The test repo"], "a null name renders the id, never the word `null`");
    },
  },

  // ══ Scenario: changing the node regroups the repos without resetting a valid choice ══════
  {
    name: "50/04 task01 — F2: changing the node REGROUPS the repos and keeps a still-valid choice; the body then carries the new node with the kept repo",
    run: async () => {
      const status = payload({
        nodes: [node("n1", "live", ["ws-aof"]), node("n2", "live", ["ws-test"])],
        workspaces: [workspace("ws-aof"), workspace("ws-test")],
      });
      let machine = opened(status, { node: "n1", repo: "ws-aof" });
      assert.equal(fieldOf(viewOf(status, machine), "repo").options.find((option) => option.value === "ws-aof").group, LAUNCHER_REPO_GROUP_ON);

      machine = launcherReduce(machine, { type: "choose", field: "node", value: "n2" });
      const view = sessionLauncherView({ status, machine, now: 0 });
      const repo = fieldOf(view, "repo");
      assert.equal(repo.value, "ws-aof", "F2 still holds ws-aof");
      assert.equal(repo.options.find((option) => option.value === "ws-aof").group, launcherRepoGroupOff("n2"), "…now in the `not on n2` group");
      assert.equal(repo.departed, false, "no field was cleared");
      assert.notEqual(view.panel, null, "and the panel did not close");
      assert.deepEqual({ ...view.panel.request }, { nodeId: "n2", workspaceId: "ws-aof" }, "the request body carries the new node with the kept repo");
    },
  },

  // ══ F3 · Scenario: the item field offers the chosen workspace's items ════════════════════
  {
    name: "50/04 task01 — F3: the repo-root row is always first, the rest are exactly the chosen repo's items, and there is no free-text input anywhere",
    run: async () => {
      const options = launcherItemOptions(FLEET, { workspaceId: "ws-aof" });
      assert.equal(options[0].label, LAUNCHER_ITEM_ROOT_LABEL, "the FIRST option is always the repo-root default");
      assert.equal(options[0].value, null);
      assert.equal(options[0].root, true);
      assert.deepEqual(optionValues(options.slice(1)), ["49/02", "50/04"], "the remaining options are exactly the ws-aof items");
      assert.deepEqual(options.slice(1).map((option) => option.label), ["49/02", "50/04 · The new-session affordance"], "a null title renders NOTHING, never the word `null`");
      assert.equal(options.some((option) => option.value === "12"), false, "no ws-test item appears");

      // The root row is present in EVERY state, including a repo with no items at all.
      for (const workspaceId of ["ws-remote", null, "no-such-repo"]) {
        assert.equal(launcherItemOptions(FLEET, { workspaceId })[0].label, LAUNCHER_ITEM_ROOT_LABEL, `the root row is present for ${workspaceId}`);
      }

      // NO FREE TEXT: every field the panel renders is a list of options, and a ref that is not
      // on the payload is not IN that list — it can only be chosen from it.
      const view = viewOf(FLEET, opened(FLEET, { node: "n1", repo: "ws-aof", item: "50/99" }));
      for (const field of view.panel.fields) assert.ok(Array.isArray(field.options), `${field.id} is a list of options, not a text box`);
      assert.equal(fieldOf(view, "item").options.some((option) => option.value === "50/99"), false, "a ref the payload never carried is not an option");
      assert.equal(fieldOf(view, "item").departed, true, "…and a value that is not an option says so rather than being coerced");

      // A ref the payload carried as a NUMBER is not offered as a string the payload never had.
      const numeric = launcherItemOptions(payload({ items: [{ workspaceId: "ws-aof", ref: 50, title: null }] }), { workspaceId: "ws-aof" });
      assert.deepEqual(optionValues(numeric), [null], "only the strings the payload itself carried become options");
    },
  },

  // ══ Scenario Outline: the request body carries exactly what the panel holds ══════════════
  {
    name: "50/04 task01 — the request body carries EXACTLY what the panel holds, has no `assistant` key, and every value is a string the payload itself carried",
    run: async () => {
      const status = payload({
        nodes: [node("n1", "live", ["ws-aof"]), node("n2", "stale", ["ws-aof"])],
        workspaces: [workspace("ws-aof"), workspace("ws-remote")],
        items: [workItem("ws-aof", "50/04", "The affordance"), workItem("ws-aof", "50", "A numeric-looking ref")],
      });
      const rows = [
        { label: "the default, no item", selection: { node: "n1", repo: "ws-aof" }, body: { nodeId: "n1", workspaceId: "ws-aof" } },
        { label: "an item chosen", selection: { node: "n1", repo: "ws-aof", item: "50/04" }, body: { nodeId: "n1", workspaceId: "ws-aof", itemRef: "50/04" } },
        { label: "a numeric-looking ref", selection: { node: "n1", repo: "ws-aof", item: "50" }, body: { nodeId: "n1", workspaceId: "ws-aof", itemRef: "50" } },
        { label: "a stale node, still posted", selection: { node: "n2", repo: "ws-aof" }, body: { nodeId: "n2", workspaceId: "ws-aof" } },
        { label: "a repo not on this node", selection: { node: "n1", repo: "ws-remote" }, body: { nodeId: "n1", workspaceId: "ws-remote" } },
      ];
      for (const row of rows) {
        const machine = opened(status, row.selection);
        const view = sessionLauncherView({ status, machine, now: 0 });
        assert.deepEqual({ ...view.panel.request }, row.body, `${row.label}: the body is exactly this`);
        assert.deepEqual(Object.keys(view.panel.request).sort(), Object.keys(row.body).sort(), `${row.label}: and nothing else`);
        assert.equal("assistant" in view.panel.request, false, `${row.label}: NO assistant key at all`);
        // Every value is a string the payload carried — no id constructed or trimmed into
        // existence: each one is `===` to a value on an option this payload produced.
        const carried = new Set([
          ...optionValues(launcherNodeOptions(status)),
          ...optionValues(launcherRepoOptions(status, { nodeId: row.selection.node })),
          ...optionValues(launcherItemOptions(status, { workspaceId: row.selection.repo })),
        ]);
        for (const value of Object.values(view.panel.request)) assert.ok(carried.has(value), `${row.label}: \`${value}\` is a string the payload itself carried`);
        // The same body through the standalone derivation — one function, two readers.
        assert.deepEqual({ ...launcherRequestBody(status, machine.selection) }, row.body, `${row.label}: the body derivation has ONE home`);
      }
      // …and the typed ref is a STRING even where the ref looks like a number.
      assert.equal(typeof launcherRequestBody(status, { nodeId: "n1", workspaceId: "ws-aof", itemRef: "50" }).itemRef, "string");
    },
  },

  // ══ Scenario: the panel has three fields and never claims to start an assistant ══════════
  {
    name: "50/04 task01 — the panel has exactly three fields and no returned string ever names an assistant or a provider",
    run: async () => {
      const view = viewOf(FLEET, opened(FLEET, { node: "n1", repo: "ws-aof", item: "50/04" }));
      assert.deepEqual(view.panel.fields.map((field) => field.id), ["node", "repo", "item"], "three fields, node/repo/item, and no fourth");
      assert.deepEqual([...LAUNCHER_FIELD_LIST], ["node", "repo", "item"]);

      const provider = /claude|codex|gemini|assistant/i;
      const swept = [
        ...stringsOf(view),
        ...stringsOf(sessionLauncherView({ status: null, machine: launcherRest(), now: 0 })),
        ...stringsOf(launcherRepoOptions(FLEET, { nodeId: "n1" })),
        ...stringsOf(launcherItemOptions(FLEET, { workspaceId: "ws-aof" })),
      ];
      assert.ok(swept.length > 20, `the sweep really swept: ${swept.length} strings`);
      assert.deepEqual(swept.filter((text) => provider.test(text)), [], "no returned string names a provider or the assistant field");

      // The wire's own default applies untouched: there is no way for a caller to set it.
      const forced = launcherRequestBody(FLEET, { nodeId: "n1", workspaceId: "ws-aof", assistant: "codex", itemRef: "50/04" });
      assert.deepEqual(Object.keys(forced).sort(), ["itemRef", "nodeId", "workspaceId"]);
      const machine = launcherReduce(opened(FLEET, { node: "n1", repo: "ws-aof" }), { type: "choose", field: "assistant", value: "codex" });
      assert.equal("assistant" in machine.selection, false, "there is no fourth field to choose into");
      assert.deepEqual({ ...sessionLauncherView({ status: FLEET, machine, now: 0 }).panel.request }, { nodeId: "n1", workspaceId: "ws-aof" });
    },
  },

  // ══ Scenario: the value the panel names is the value it posts, across a poll ═════════════
  {
    name: "50/04 task01 — DG-50-7: a chosen node that leaves the roster is NOT swapped — the rendered value and the posted value are the same string, and it says why",
    run: async () => {
      const before = payload({ nodes: [node("n1"), node("n2")], workspaces: [workspace("ws-aof")] });
      const machine = opened(before, { node: "n2", repo: "ws-aof" });
      const after = payload({ nodes: [node("n1")], workspaces: [workspace("ws-aof")] });

      const view = sessionLauncherView({ status: after, machine, now: 0 });
      const field = fieldOf(view, "node");
      assert.equal(field.value, view.panel.request.nodeId, "the rendered value and the posted value are the SAME string");
      assert.equal(field.value, "n2", "…and it is still n2 — the departed choice is not swapped to the first surviving option");
      assert.equal(field.departed, true);
      assert.equal(field.note, LAUNCHER_DEPARTED_NOTE, "the field says the value is no longer in the mesh and invites another");
      assert.equal(field.options.some((option) => option.value === "n2"), false, "n2 really did leave the payload");
      assert.equal(launcherResolveSelection(after, machine.selection).node.value, "n2", "nothing was auto-selected on the operator's behalf");
    },
  },

  // ══ Scenario: DG-50-7 at F3 — the departed ITEM, which is the one field that can be EMPTY ══
  //
  // The existing departed case above is F1's, where the list is the whole payload and the field
  // has other rows to offer. F3's list is narrowed to ONE repo and can hold nothing but its root
  // row — so `departed` and "this repo has no items" can be true AT ONCE, which is the state a
  // behavioural review measured (2026-08-14) rendering two sentences, one of them false, over a
  // DISABLED select the operator could not clear while its value still posted.
  {
    name: "50/04 task01 — DG-50-7 at F3: a ref the chosen repo does not carry keeps its field ENABLED so it can always be cleared, renders exactly ONE true sentence, and is still the string the body posts",
    run: async () => {
      const machine = opened(FLEET, { node: "n1", repo: "ws-aof", item: "50/04" });
      const moved = launcherReduce(machine, { type: "choose", field: "repo", value: "ws-remote" });
      const view = sessionLauncherView({ status: FLEET, machine: moved, now: 0 });
      const item = fieldOf(view, "item");
      assert.deepEqual(optionValues(item.options), [null], "ws-remote carries no items — only the repo-root row");
      assert.equal(item.value, "50/04", "the chosen ref is KEPT, never silently dropped");
      assert.equal(item.departed, true);
      assert.equal(item.disabled, false, "a field holding a value the operator must be able to CLEAR is never disabled");
      assert.equal(item.value, view.panel.request.itemRef, "the rendered value and the posted value are the SAME string");

      // ONE sentence, and a TRUE one: 50/04 is still in the mesh, under ws-aof.
      assert.equal(item.reason, null, "the no-items reason does not render a second sentence beside the note");
      assert.equal(item.note, LAUNCHER_ITEM_DEPARTED_NOTE);
      assert.notEqual(item.note, LAUNCHER_DEPARTED_NOTE, "F1/F2's list is the whole payload; F3's is one repo's");
      assert.equal(/mesh/.test(item.note), false, "…so it never claims a ref that IS in the mesh has left it");
      assert.equal([item.reason, item.note].filter((sentence) => sentence != null).length, 1, "exactly one sentence renders");

      // …and the remedy `session-worktree-failed` itself names — "start without an item to open
      // the repo root" — is reachable, because the root row can be chosen.
      const cleared = launcherReduce(moved, { type: "choose", field: "item", value: null });
      const after = sessionLauncherView({ status: FLEET, machine: cleared, now: 0 });
      assert.deepEqual({ ...after.panel.request }, { nodeId: "n1", workspaceId: "ws-remote" }, "cleared: the body carries no itemRef at all");
      assert.equal(fieldOf(after, "item").disabled, true, "…and an EMPTY field with nothing to offer is disabled with its reason again");
      assert.equal(fieldOf(after, "item").reason, LAUNCHER_NO_ITEMS_REASON);
      assert.equal(fieldOf(after, "item").note, null);

      // FROZEN still wins over all of it: a dispatch in flight disables every field.
      const dispatched = launcherReduce(moved, { type: "submit", at: 0, request: view.panel.request });
      const inFlight = sessionLauncherView({ status: FLEET, machine: dispatched, now: 0 });
      assert.deepEqual(inFlight.panel.fields.map((field) => field.disabled), [true, true, true], "a departed value is clearable, not exempt from the freeze");
    },
  },

  // ══ Scenario Outline: a poll changes nothing about an open panel ═════════════════════════
  {
    name: "50/04 task01 — DG-50-7: a poll changes nothing about an open panel — it stays open, every field holds its value, and no option row moves under the cursor",
    run: async () => {
      const base = payload({
        nodes: [node("n1", "live", ["ws-aof"])],
        workspaces: [workspace("ws-aof"), workspace("ws-test")],
        items: [workItem("ws-aof", "50/04", "The affordance"), workItem("ws-aof", "49/02", null)],
      });
      const rows = [
        { label: "a new node appears", field: "node", next: { ...base, nodes: [node("n0", "live", []), ...base.nodes] } },
        { label: "a node's freshness changes", field: "node", next: { ...base, nodes: [node("n1", "stale", ["ws-aof"])] } },
        { label: "a session count changes", field: "repo", next: { ...base, sessions: [1, 2, 3, 4].map((n) => ({ nodeId: "n1", sessionId: `s-${n}` })) } },
        { label: "a workspace appears", field: "repo", next: { ...base, workspaces: [workspace("ws-alpha"), ...base.workspaces] } },
        { label: "an item's status changes", field: "item", next: { ...base, items: [{ ...base.items[0], status: "done" }, base.items[1]] } },
        { label: "the payload is byte-identical", field: "node", next: { ...base } },
      ];
      const machine = opened(base, { node: "n1", repo: "ws-aof", item: "50/04" });
      const before = sessionLauncherView({ status: base, machine, now: 0 });
      for (const row of rows) {
        const after = sessionLauncherView({ status: row.next, machine, now: 0 });
        assert.notEqual(after.panel, null, `${row.label}: the panel is still open`);
        assert.deepEqual(after.panel.fields.map((field) => field.value), before.panel.fields.map((field) => field.value), `${row.label}: every field holds its value`);
        for (const id of ["node", "repo", "item"]) {
          const was = optionValues(fieldOf(before, id).options);
          const now = optionValues(fieldOf(after, id).options);
          const survivors = now.filter((value) => was.includes(value));
          assert.deepEqual(survivors, was.filter((value) => now.includes(value)), `${row.label}: ${id}'s order is unchanged for every option present in both polls`);
        }
        // …and the field the cursor is in did not move the chosen row's neighbours.
        const cursor = fieldOf(after, row.field);
        assert.equal(cursor.departed, false, `${row.label}: the cursor's field still holds a live value`);
      }
    },
  },

  // ══ Scenario Outline: an unavailable control explains itself rather than disappearing ════
  {
    name: "50/04 task01 — the four empty cases: every unavailable control states its own reason, and the disabled trigger stays reachable by the keyboard",
    run: async () => {
      // no payload yet, and the last fetch failed with no last-known payload — one fact, one
      // sentence: "we do not know" is not "there is nothing".
      for (const status of [null, undefined]) {
        const view = sessionLauncherView({ status, machine: launcherRest(), now: 0 });
        assert.equal(view.trigger.disabled, true);
        assert.equal(view.trigger.reason, LAUNCHER_NO_PAYLOAD_REASON);
        assert.equal(view.trigger.focusable, true, "an element the keyboard skips hides its explanation from the users who need it");
      }
      // a payload with no nodes
      const empty = sessionLauncherView({ status: payload({ workspaces: [workspace("ws-aof")] }), machine: launcherRest(), now: 0 });
      assert.equal(empty.trigger.disabled, true);
      assert.equal(empty.trigger.reason, LAUNCHER_NO_NODES_REASON);
      assert.equal(empty.trigger.focusable, true);

      // the node holds no workspaces — F2 offers ALL of them, all in the `not on n1` group.
      const noMembership = payload({ nodes: [node("n1", "live", [])], workspaces: [workspace("ws-aof"), workspace("ws-test"), workspace("ws-remote")] });
      const repo = fieldOf(viewOf(noMembership, opened(noMembership, { node: "n1" })), "repo");
      assert.deepEqual(optionValues(repo.options), ["ws-aof", "ws-remote", "ws-test"], "nothing is hidden");
      assert.deepEqual([...new Set(repo.options.map((option) => option.group))], [launcherRepoGroupOff("n1")], "…all in the `not on n1` group");
      assert.equal(repo.disabled, false);

      // the repo has no items — F3 disabled, showing only its repo-root row, with the reason.
      const item = fieldOf(viewOf(FLEET, opened(FLEET, { node: "n1", repo: "ws-remote" })), "item");
      assert.deepEqual(item.options.map((option) => option.label), [LAUNCHER_ITEM_ROOT_LABEL]);
      assert.equal(item.disabled, true);
      assert.equal(item.reason, LAUNCHER_NO_ITEMS_REASON, "the reason is IN the field — never merely greyed");

      // …and the case DESIGN does not enumerate: no repo chosen yet. Disabled, with a reason,
      // never silently greyed (routed to the designer as a copy gap).
      const noRepo = fieldOf(viewOf(FLEET, opened(FLEET, { node: "n1" })), "item");
      assert.equal(noRepo.disabled, true);
      assert.equal(noRepo.reason, LAUNCHER_ITEM_NEEDS_REPO_REASON);
    },
  },

  // ══ Scenario: with no payload the panel has no state of its own ══════════════════════════
  {
    name: "50/04 task01 — with no payload the panel cannot be opened at all: no options, no default selection, no submit-enabled answer",
    run: async () => {
      const machine = launcherReduce(launcherRest(), { type: "open", defaults: launcherOpenDefaults(null) });
      const view = sessionLauncherView({ status: null, machine, now: 0 });
      assert.equal(view.panel, null, "the panel cannot be opened at all");
      assert.equal(view.trigger.expanded, false);
      assert.deepEqual(launcherNodeOptions(null), []);
      assert.deepEqual(launcherRepoOptions(null, { nodeId: "n1" }), []);
      assert.deepEqual(launcherOpenDefaults(null), { nodeId: null }, "no default selection");
      assert.equal(launcherRequestBody(null, machine.selection), null, "no submit-enabled answer");
    },
  },

  // ══ Scenario Outline: the module is total — every payload answers, none throws ═══════════
  {
    name: "50/04 task01 — the module is TOTAL: every payload answers, none throws, and the request body is a complete pair or is withheld",
    run: async () => {
      const frozen = Object.freeze({
        nodes: Object.freeze([Object.freeze(node("n1", "live", Object.freeze(["ws-aof"])))]),
        workspaces: Object.freeze([Object.freeze(workspace("ws-aof"))]),
        items: Object.freeze([Object.freeze(workItem("ws-aof", "50/04"))]),
        sessions: Object.freeze([]),
      });
      const rows = [
        { label: "null", status: null },
        { label: "an empty object", status: {} },
        { label: "nodes is not an array", status: { nodes: "n1", workspaces: [], items: [] } },
        { label: "workspaces absent", status: { nodes: [node("n1")], items: [] } },
        { label: "items absent", status: { nodes: [node("n1")], workspaces: [workspace("ws-aof")] } },
        { label: "a node whose workspaceIds is null", status: { nodes: [{ nodeId: "n1", workspaceIds: null }] } },
        { label: "duplicate node ids", status: payload({ nodes: [node("n1", "live"), node("n1", "stale")], workspaces: [workspace("ws-aof")] }), nodes: ["n1"] },
        { label: "duplicate workspace ids", status: payload({ nodes: [node("n1")], workspaces: [workspace("ws-aof"), workspace("ws-aof", "second")] }), repos: ["ws-aof"] },
        { label: "a deeply frozen payload", status: frozen },
      ];
      for (const row of rows) {
        const selection = { nodeId: "n1", workspaceId: "ws-aof", itemRef: "50/04" };
        const nodes = launcherNodeOptions(row.status);
        const repos = launcherRepoOptions(row.status, selection);
        const items = launcherItemOptions(row.status, selection);
        for (const [label, options] of [["F1", nodes], ["F2", repos], ["F3", items]]) {
          assert.ok(Array.isArray(options), `${row.label}: ${label}'s options are an array`);
        }
        assert.deepEqual(launcherOpenDefaults(row.status).nodeId, nodes.length === 1 ? nodes[0].value : null, `${row.label}: the default selection answers`);
        const body = launcherRequestBody(row.status, selection);
        assert.ok(body === null || (typeof body.nodeId === "string" && typeof body.workspaceId === "string"), `${row.label}: a complete pair or nothing`);
        // …and the whole view, for the same payload, both open and closed.
        for (const machine of [launcherRest(), opened(row.status, {}), opened(row.status, { node: "n1", repo: "ws-aof" })]) {
          const view = sessionLauncherView({ status: row.status, machine, now: 0 });
          assert.ok(typeof view.trigger.label === "string" && view.trigger.label.length > 0, `${row.label}: the trigger always has a label`);
        }
        if (row.nodes) assert.deepEqual(optionValues(nodes), row.nodes, `${row.label}: duplicates resolve to ONE option per id`);
        if (row.repos) assert.deepEqual(optionValues(repos), row.repos, `${row.label}: duplicates resolve to ONE option per id`);
      }
    },
  },
];
