// Traceability wiring for milestone 127 / story 04 — the board shows the backlog and hides
// the archive, and the fleet partitions the backlog out:
//
//   tasks/03_the-overview-shows-the-backlog-as-rows.feature          (@executable)
//   tasks/04_one-toggle-reveals-the-archive-with-one-mark.feature    (@executable)
//   tasks/05_the-fleet-partitions-the-backlog-out.feature            (@executable)
//
// THE BASELINE IS THE CHECKLIST. No mock was elicited for 127 (STATE, default decision), so
// DESIGN.md §Surface 1 and §Surface 2's BINDING CHECKLISTS are the conformance source of truth
// (07/ADR-003), and the scenarios below are those checklists read region by region off the
// REAL `<Board/>` mounted against the REAL face (`withBoardFace` / `withBoardApp`, the m43
// harness) — never a rendering of a stand-in component. The fleet lanes mount the REAL
// `<Fleet/>` against the REAL mesh face over a store the REAL publisher wrote.
//
// WHAT THE WIRE CARRIES is 127/01's row shape (task 02): a backlog row is `number: null` +
// `backlog`, an archived row is `archived: true`, and a live row is the frozen seven keys. The
// board partitions on that fact (`number === null`) before any card is derived, and hides the
// archive by NOT ASKING for it: with the toggle OFF the list is requested without the
// include-archived parameter, so no `archived: true` row can exist on the page at all.
//
// THE FIXTURE'S STATUS. A backlog record doc scaffolded from the template carries
// `status: not-started` (the features spelled `status: null` for the same row); the board
// paints no ring, chip or number on a backlog row whatever its status says, which is the claim.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FRESHNESS_GLYPH } from "../../ui/src/board/freshness.mjs";
import { milestoneListItems, filterToWorkStatus, hiddenMilestoneCount, workStatusSummaryTail } from "../../ui/src/fleet/scope.mjs";
import { withBoardFace, DEFAULT_STREAM } from "../support/board-face-fixture.mjs";
import { withBoardApp, BOARD_EPOCH, isBadgeNode, findAll, visibleTextOf, textOf } from "../support/board-app-harness.mjs";
import { bundleSurface } from "../support/react-app-harness.mjs";
import { withFleetApp } from "../support/fleet-app-harness.mjs";
import { regionSummary, documentFacts, mentionsFact } from "../support/fleet-filter-readers.mjs";
import { serveMeshUi, meshUiDist } from "../../src/mesh/ui-serve.mjs";
import { openGlobalWorkProjectionStore } from "../../src/global-work-store.mjs";
import { publishGlobalRegistryDescriptorsToStore } from "../../src/global-node-registry.mjs";
import { loadWorkspace } from "../../src/work.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MODEL_TS = path.join(repoRoot, "ui", "src", "board", "model.ts");

const NODE = "umamis-mac-mini";
const at = (secondsFromNow) => new Date(BOARD_EPOCH + secondsFromNow * 1000).toISOString();

// ── the two streams the lanes mount against ─────────────────────────────────

// Task 03's backlog: one row per driver shape the backlog admits, in two groups plus the root.
// The wire order is `listStream`'s — group path then slug, code-point order (ADR-002 §5).
const BACKLOG_STREAM = {
  ...DEFAULT_STREAM,
  backlog: [
    { type: "milestone", slug: "search-the-fleet", title: "Search the fleet", group: "" },
    { type: "chore", slug: "prune-logs", group: "ops/later" },
    { type: "chore", slug: "rotate-keys", title: "Rotate keys", group: "ops" },
    { type: "story", slug: "field-notes", title: "Field notes", group: "" },
  ],
};
const BACKLOG_WIRE_ORDER = ["field-notes", "search-the-fleet", "rotate-keys", "prune-logs"];

// Task 04's archive: a done milestone with one done story, and a done uat gate.
const ARCHIVE_STREAM = {
  ...DEFAULT_STREAM,
  archived: [
    { type: "milestone", number: "12", slug: "theta", title: "Theta", status: "done", stories: [{ number: "00", slug: "theta-one", title: "Theta one", status: "done" }] },
    { type: "uat", number: "13", slug: "accept-theta", title: "Accept theta", status: "done" },
  ],
};

// ── the pinned class strings (DESIGN §Surface 1, §Surface 2) ─────────────────

const GATES_HEADING = "mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground";
const TYPE_LABEL = "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";
const SLUG_SLOT = "mono text-sm text-muted-foreground";
const TITLE_SLOT = "min-w-0 flex-1 truncate text-sm font-medium";
const ROW_RAMP = "rounded-lg border border-border bg-card px-3 py-2 text-sm";
const SUB_HEADING = "mono text-[11px] text-muted-foreground";
const PILL_CLASSES = "inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground";
const TOGGLE_BASE = "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition min-h-6";
const TOGGLE_OFF = "border-border bg-transparent text-muted-foreground";
const TOGGLE_ON = "border-primary/40 bg-primary/10 text-primary";
const CHIP_TOKENS = "rounded-full px-2.5 py-1 font-semibold";

// ── readers over the rendered tree ───────────────────────────────────────────

const className = (node) => String(node?.props?.className ?? "");
const elementChildren = (node) => (node?.children ?? []).flat(Infinity).filter((child) => child && typeof child === "object");
const isPill = (node) => node?.type === "span" && className(node) === PILL_CLASSES;
const pillsIn = (root) => findAll(root, isPill);

// The overview's header chips, in DOM order, as the reader reads them.
// A card's or bar's ref: its first mono span (the ring's glyph is text too, so never the first word).
const refOf = (node) => textOf(findAll(node, (inner) => inner.type === "span" && className(inner).includes("mono"))[0] ?? null).trim();
const chips = (tree) => findAll(tree, (node) => node.type === "span" && className(node).includes(CHIP_TOKENS)).map(visibleTextOf);
// The header sentence — `N milestone(s) · derived from project state…`.
const headerSentence = (tree) => textOf(findAll(tree, (node) => node.type === "p" && className(node) === "mt-1 text-sm text-muted-foreground")[0]);
// The overview's root and its regions in DOM order.
const overviewRoot = (tree) => findAll(tree, (node) => node.type === "div" && className(node).includes("max-w-[1180px]"))[0] ?? null;
const regionsOf = (tree) => elementChildren(overviewRoot(tree)).map((node) => ({
  type: node.type,
  heading: findAll(node, (inner) => inner.type === "h1" || inner.type === "h2").map(textOf)[0] ?? null,
}));
const backlogSection = (tree) => findAll(tree, (node) => node.type === "section" && findAll(node, (inner) => inner.type === "h2" && textOf(inner) === "Backlog").length > 0)[0] ?? null;
// The section's rows and sub-headings in document order — the flattened reading DESIGN's
// "children in DOM order" names (a row is an `<li>`, a sub-heading is the mono `<p>`).
const backlogSequence = (section) => findAll(section, (node) => node.type === "li" || (node.type === "p" && className(node).includes(SUB_HEADING)))
  .map((node) => (node.type === "li" ? { row: rowSlug(node) } : { group: textOf(node) }));
const rowSlug = (li) => textOf(elementChildren(li)[1] ?? null);
const backlogRow = (tree, slug) => findAll(backlogSection(tree) ?? tree, (node) => node.type === "li" && rowSlug(node) === slug)[0] ?? null;
const rowFacts = (li) => {
  const children = elementChildren(li);
  return {
    node: li,
    className: className(li),
    children,
    typeLabel: children[0] ?? null,
    slug: children[1] ?? null,
    title: children[2] ?? null,
    last: children.at(-1) ?? null,
    badges: findAll(li, isBadgeNode),
    buttons: findAll(li, (node) => node.type === "button" || node.type === "a"),
    interactive: Boolean(li.props?.onClick || li.props?.tabIndex != null || li.props?.role === "button"),
  };
};

// The top bar's surface slot (rendered in place with no shell present) and its children.
const surfaceSlot = (tree) => findAll(tree, (node) => node.type === "div" && className(node).includes("justify-end gap-4"))[0] ?? null;
const toggle = (tree) => findAll(tree, (node) => node.type === "button" && node.props?.["aria-label"] === "Show archived items")[0] ?? null;
const toggleFacts = (tree) => {
  const node = toggle(tree);
  return node && {
    node,
    pressed: node.props["aria-pressed"],
    busy: node.props["aria-busy"] ?? null,
    disabled: node.props.disabled === true,
    text: visibleTextOf(node),
    className: className(node),
  };
};
const listUrls = (app) => app.requestsMatching("/api/work/list").map((entry) => { const url = new URL(entry.url); return `${url.pathname}${url.search}`; });
async function clickToggle(app) {
  const node = toggle(app.tree());
  assert.ok(node, "the Show archived toggle is on the page");
  await node.props.onClick();
  await app.flush();
}
function clickToggleDetached(app) {
  const node = toggle(app.tree());
  assert.ok(node, "the Show archived toggle is on the page");
  const pending = node.props.onClick();
  return { async settle() { await pending; await app.flush(); } };
}

// VIEW 2: the milestone switcher and its rows.
const switcherButton = (tree) => findAll(tree, (node) => node.type === "button" && node.props?.["aria-haspopup"] === "listbox")[0] ?? null;
const switcherRows = (tree) => findAll(tree, (node) => node.type === "button" && node.props?.role === "option");
// The switcher positions its listbox off the wrapper's rect, so the headless mount binds host
// nodes and hands the wrapper a rect — the one browser fact the tree cannot supply.
async function openSwitcher(app) {
  const button = switcherButton(app.tree());
  assert.ok(button, "the milestone switcher is on the page");
  const wrapper = findAll(app.tree(), (node) => node.type === "div" && className(node) === "relative" && findAll(node, (inner) => inner === button).length > 0)[0];
  assert.ok(wrapper?.hostNode, "the switcher wrapper carries a bound host node (hostNodes: true)");
  wrapper.hostNode.getBoundingClientRect = () => ({ top: 0, bottom: 46, left: 8, right: 200, width: 192, height: 46 });
  await button.props.onClick();
  await app.flush();
}
const countLabel = (tree) => visibleTextOf(findAll(tree, (node) => node.type === "span" && className(node) === "mono text-muted-foreground")[0]);

// The legend's archived row: the row after the Freshness block whose first child is the pill.
const legendArchivedRow = (legend) => findAll(legend.panel, (node) => node.type === "span" && elementChildren(node)[0] && isPill(elementChildren(node)[0]))[0] ?? null;

// The board's read model, bundled from the REAL `model.ts` through the same esbuild instrument
// the mounted lanes use, so `deriveBoard` is the production derivation and not a re-spelling.
let model = null;
async function loadModel() {
  if (model) return model;
  const source = await bundleSurface({ entry: MODEL_TS, stubs: {}, resolve: [] });
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-board-model-"));
  try {
    const file = path.join(tmp, "model.mjs");
    await writeFile(file, source, "utf8");
    model = await import(pathToFileURL(file).href);
    return model;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// ── the fleet fixture (task 05) ──────────────────────────────────────────────
//
// The REAL mesh face over a store the REAL publisher wrote from a three-root stream on disk,
// in the shape `withPublishedAssignFixture` stands up (a served dist, a published snapshot, the
// registry descriptors) — spelled here because that fixture writes one fixed work item.
async function withFleetFixture(stream, fn) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-fleet-three-roots-"));
  const home = path.join(tmp, "home");
  const root = path.join(tmp, "repo");
  const workDir = path.join(root, "wiki", "work");
  const distRoot = path.join(tmp, "dist");
  try {
    await mkdir(workDir, { recursive: true });
    await mkdir(path.join(root, ".aof"), { recursive: true });
    await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "fleet-fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: "control-a" } }, null, 2)}\n`, "utf8");
    const record = { milestone: "SPEC.md", chore: "CHORE.md", uat: "SESSION.md", story: "STORY.md", spike: "SPIKE.md" };
    const write = async (dir, fields) => {
      await mkdir(dir, { recursive: true });
      const lines = Object.entries(fields).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}: ${value}`);
      await writeFile(path.join(dir, record[fields.type]), `---\n${lines.join("\n")}\n---\n`, "utf8");
    };
    for (const item of stream.live ?? []) await write(path.join(workDir, `${item.number}_${item.type}_${item.slug}`), { type: item.type, number: item.number, slug: item.slug, status: item.status, title: item.title });
    for (const item of stream.backlog ?? []) await write(path.join(workDir, "backlog", ...(item.group ? item.group.split("/") : []), `${item.type}_${item.slug}`), { type: item.type, slug: item.slug, status: "not-started", title: item.title });
    for (const item of stream.archived ?? []) await write(path.join(workDir, "archive", `${item.number}_${item.type}_${item.slug}`), { type: item.type, number: item.number, slug: item.slug, status: item.status ?? "done", title: item.title });
    const dist = meshUiDist(distRoot);
    await mkdir(path.join(dist, "assets"), { recursive: true });
    await writeFile(path.join(dist, "index.html"), "<!doctype html><html><head><script type=\"module\" src=\"/assets/index-abc123.js\"></script></head><body><div id=\"root\"></div></body></html>\n", "utf8");
    await writeFile(path.join(dist, "assets", "index-abc123.js"), "export const x = 1;\n", "utf8");

    const globalStoreOptions = { env: { AOF_GLOBAL_HOME: home } };
    const workspace = await loadWorkspace(root, undefined, globalStoreOptions);
    const store = await openGlobalWorkProjectionStore(globalStoreOptions);
    let workspaceId;
    try {
      ({ workspaceId } = await store.publishWorkspaceSnapshot(workspace, { now: "2026-09-15T09:05:00.000Z" }));
      await publishGlobalRegistryDescriptorsToStore(store, workspace, { now: "2026-09-15T09:05:00.000Z" });
    } finally {
      store.close();
    }
    const { server, url } = await serveMeshUi({ projectDir: root, port: 0, repoRoot: distRoot, scope: "global", globalStoreOptions });
    try {
      return await fn({ url, workspaceId, globalStoreOptions });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
const statusControl = (tree) => findAll(tree, (node) => node.type === "select" && node.props?.["aria-label"] === "Show work by status")[0] ?? null;
async function setStatusFilter(app, value) {
  const control = statusControl(app.tree());
  assert.ok(control, "the status control is in the slot");
  await control.props.onChange({ target: { value } });
  await app.flush();
}
const milestoneRowRefs = (tree) => findAll(tree, (node) => node.type === "select" && String(node.props?.["aria-label"] ?? "").startsWith("Assign "))
  .map((node) => node.props["aria-label"].replace(/^Assign (.*) to a worker node$/, "$1"));

export const boardBacklogAndArchiveTests = [
  // ══════════════════════════════════════════════════════════════════════════
  // task 03 — the overview shows the backlog as rows
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "board-backlog/03 a backlog milestone never reaches a card, a gate bar, a lane, the switcher or the detail panel — the partition happens before any card is derived, and the chips count the stream",
    run: async () => {
      await withBoardFace(async (face) => {
        const { deriveBoard } = await loadModel();
        const envelope = await (await fetch(`${face.url}/api/work/list`)).json();
        const derived = deriveBoard(envelope.items);
        assert.deepEqual(derived.backlog.map((row) => row.ref), BACKLOG_WIRE_ORDER, "deriveBoard(items).backlog is the four rows in wire order");
        for (const ref of BACKLOG_WIRE_ORDER) {
          assert.ok(!derived.milestones.some((m) => m.item.ref === ref), `${ref} reaches no milestone card`);
          assert.ok(!derived.uat.some((u) => u.ref === ref), `${ref} reaches no gate bar`);
          assert.ok(!derived.otherDrivers.some((d) => d.ref === ref), `${ref} reaches no lane`);
          assert.equal(derived.byRef.has(ref), false, `${ref} is not in byRef — the deep-link door is shut on it`);
        }

        await withBoardApp({ url: face.url, hostNodes: true, terminalEnvironment: true }, async (app) => {
          assert.deepEqual(app.overviewCards().map(refOf), ["43"], "the grid paints exactly one milestone card");
          assert.equal(app.gateBars().length, 1, "the gates strip paints exactly one bar");
          const interactive = findAll(app.tree(), (node) => (node.type === "button" || node.type === "a") && visibleTextOf(node).includes("search-the-fleet"));
          assert.deepEqual(interactive, [], "no <button> or <a> anywhere carries the backlog milestone's slug");
          assert.deepEqual(chips(app.tree()), ["✓ 0 done", "◐ 1 active", "! 1 blocked gate"], "the header chips count the stream — the backlog is not a lifecycle bucket");

          await app.openMilestone("43");
          assert.equal(app.screen(), "board");
          await openSwitcher(app);
          assert.deepEqual(switcherRows(app.tree()).map((row) => visibleTextOf(row).split(" ")[0]), ["✦", "43"], "the switcher lists All milestones and 43 only");
          const allRow = switcherRows(app.tree())[0];
          await allRow.props.onClick();
          await app.flush();
          for (const ref of BACKLOG_WIRE_ORDER) assert.equal(app.laneCard(ref), null, `no lane card under all focus carries ${ref}`);
        });

        await withBoardApp({ url: face.url, hash: "search-the-fleet" }, async (app) => {
          assert.equal(app.screen(), "overview", "the deep link lands on the overview");
          assert.equal(switcherButton(app.tree()), null, "no board is focused");
          assert.equal(app.detail(), null, "…and the detail panel is not rendered — the deep link opened nothing");
        });
      }, { stream: BACKLOG_STREAM });
    },
  },
  {
    name: "board-backlog/03 the Backlog region is last, absent when empty, and its heading carries the count and the door",
    run: async () => {
      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url }, async (app) => {
          assert.deepEqual(
            regionsOf(app.tree()),
            [{ type: "header", heading: "Work items" }, { type: "div", heading: null }, { type: "section", heading: "Acceptance gates" }, { type: "section", heading: "Backlog" }],
            "the regions in DOM order: header, grid, Acceptance gates, Backlog",
          );
          const section = backlogSection(app.tree());
          const heading = findAll(section, (node) => node.type === "h2")[0];
          assert.equal(className(heading), GATES_HEADING, "the h2 carries the gates heading's exact class string");
          const subline = findAll(section, (node) => node.type === "span" && className(node) === "text-xs text-muted-foreground")[0];
          assert.equal(visibleTextOf(subline), "4 items · un-numbered, not scheduled · promote with aof work promote <slug>", "the subline states the count and the door");
          const mono = findAll(subline, (node) => node.type === "span" && className(node) === "mono")[0];
          assert.equal(textOf(mono), "aof work promote <slug>", "…with the command in a mono span");
        });
      }, { stream: BACKLOG_STREAM });

      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url }, async (app) => {
          assert.equal(backlogSection(app.tree()), null, "with no backlog rows on the wire no h2 reads Backlog");
          assert.ok(!visibleTextOf(app.tree()).includes("un-numbered"), "…and no node carries the subline — the section is absent, not empty");
        });
      });
    },
  },
  {
    name: "board-backlog/03 rows are grouped by their verbatim path, root rows first, in code-point order, wire order within a group — the section re-sorts nothing",
    run: async () => {
      await withBoardFace(async (face) => {
        const envelope = await (await fetch(`${face.url}/api/work/list`)).json();
        assert.deepEqual(envelope.items.filter((row) => row.number === null).map((row) => row.ref), BACKLOG_WIRE_ORDER, "the wire's own order (the fixture's premise)");
        await withBoardApp({ url: face.url }, async (app) => {
          const section = backlogSection(app.tree());
          assert.deepEqual(
            backlogSequence(section),
            [{ row: "field-notes" }, { row: "search-the-fleet" }, { group: "ops" }, { row: "rotate-keys" }, { group: "ops/later" }, { row: "prune-logs" }],
            "root rows with no sub-heading, then each group's verbatim path above its rows",
          );
          for (const sub of findAll(section, (node) => node.type === "p")) {
            assert.equal(className(sub), `${SUB_HEADING} mt-3 mb-1`, "a sub-heading is the flat mono path");
            assert.ok(!/^\s|\t|[│├└]/.test(textOf(sub)), "…no indentation, no tree glyph");
          }
          assert.equal(findAll(section, (node) => node.type === "p" && textOf(node) === "").length, 0, "no sub-heading for the root");
        });
      }, { stream: BACKLOG_STREAM });
    },
  },
  ...[
    { slug: "search-the-fleet", type: "milestone", title: "Search the fleet" },
    { slug: "field-notes", type: "story", title: "Field notes" },
    { slug: "rotate-keys", type: "chore", title: "Rotate keys" },
    { slug: "prune-logs", type: "chore", title: "Prune Logs" },
  ].map(({ slug, type, title }) => ({
    name: `board-backlog/03 the row for ${slug} shows type, slug and title only (${type} · ${title}) and is not interactive`,
    run: async () => {
      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url }, async (app) => {
          const row = backlogRow(app.tree(), slug);
          assert.ok(row, `the row for ${slug} renders`);
          const facts = rowFacts(row);
          assert.equal(row.type, "li", "it is an <li>");
          assert.ok(facts.className.includes(ROW_RAMP) && facts.className.includes("gap-3"), `its class string carries the row ramp (${facts.className})`);
          assert.equal(facts.interactive, false, "no onClick, no tabIndex, no role=button");
          assert.deepEqual(facts.buttons, [], "no descendant <button> or <a>");
          assert.ok(className(facts.typeLabel).includes(TYPE_LABEL), "its first child is the type label in the uppercase idiom");
          assert.equal(textOf(facts.typeLabel), type);
          const width = className(facts.typeLabel).match(/\bw-\S+/)?.[0];
          assert.ok(width, "…inside a fixed-width column");
          for (const other of findAll(backlogSection(app.tree()), (node) => node.type === "li")) {
            assert.equal(className(rowFacts(other).typeLabel).match(/\bw-\S+/)?.[0], width, "…whose width every row shares");
          }
          assert.equal(className(facts.slug), SLUG_SLOT, "its second is the slug in the mono ref slot");
          assert.equal(textOf(facts.slug), slug);
          assert.equal(className(facts.title), TITLE_SLOT, "its third is the truncating title");
          assert.equal(textOf(facts.title), title);
          const text = visibleTextOf(row);
          assert.ok(!/Open|not started|in progress/.test(text), "no status text, no Open");
          assert.equal(findAll(row, (node) => node.props?.role === "img").length, 0, "no ring or dot");
          assert.equal(findAll(row, (node) => className(node).includes("rounded-full px-2.5")).length, 0, "no chip");
          assert.equal(findAll(row, (node) => /primary|accent|destructive/.test(className(node))).length, 0, "no primary, accent or destructive token");
          assert.ok(!className(row).match(/primary|accent|destructive/), "…on the row itself either");
        });
      }, { stream: BACKLOG_STREAM });
    },
  })),
  {
    name: "board-backlog/03 the stale badge and the provenance reading on a backlog row are 43's, unchanged — short form at the ml-auto end, nothing for a row never cache-published, and the crossing paints within one tick with no list request",
    run: async () => {
      await withBoardFace(async (face) => {
        await face.reportedBy(NODE, at(-301));
        await face.reportedRow("rotate-keys", { node: NODE, at: at(-299) });
        await face.unpublish("search-the-fleet");
        await withBoardApp({ url: face.url }, async (app) => {
          const stale = rowFacts(backlogRow(app.tree(), "prune-logs"));
          assert.equal(stale.badges.length, 1, "prune-logs ends in exactly one stale badge");
          assert.equal(className(stale.last), "ml-auto", "…at its ml-auto end");
          assert.ok(findAll(stale.last, isBadgeNode).length === 1, "…the badge is the last child's content");
          assert.equal(visibleTextOf(stale.badges[0]), `${FRESHNESS_GLYPH} stale`, "…in short form");
          const cardBadge = app.overviewCard("43").badge;
          assert.ok(cardBadge, "the milestone card carries a badge too (the whole workspace is 301s old)");
          assert.equal(className(stale.badges[0]), cardBadge.className, "…and the row's badge carries the same pinned class signature");
          assert.ok(!/\b(?:animate-[\w-]+|transition|aof-pending)\b/.test(className(stale.badges[0])), "no motion class");

          const never = rowFacts(backlogRow(app.tree(), "search-the-fleet"));
          assert.equal(never.badges.length, 0, "search-the-fleet carries no badge");
          assert.equal(never.children.length, 3, "…and ends in nothing — no fresh word, no placeholder");

          const fresh = rowFacts(backlogRow(app.tree(), "rotate-keys"));
          assert.equal(fresh.badges.length, 0, "rotate-keys (299s old) is fresh at mount");
          const requests = app.requestsMatching("/api/work/list").length;
          await app.advance(2000);
          assert.equal(rowFacts(backlogRow(app.tree(), "rotate-keys")).badges.length, 1, "…and its badge appears within one tick of the crossing");
          assert.equal(app.requestsMatching("/api/work/list").length, requests, "…with no list request issued");
        });
      }, { stream: BACKLOG_STREAM, stalenessSeconds: 300 });
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // task 04 — one toggle reveals the archive with one mark
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "board-archive/04 the toggle is in the top bar left of the legend, OFF by default, and the default list holds no archived row — no card, gate bar, chip or pill for 12, 12/00 or 13",
    run: async () => {
      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url }, async (app) => {
          const slot = surfaceSlot(app.tree());
          assert.ok(slot, "the surface slot renders in place");
          const children = elementChildren(slot);
          assert.deepEqual(children.map((node) => node.props?.["aria-label"] ?? findAll(node, (inner) => inner.props?.["aria-label"])[0]?.props?.["aria-label"]), ["Show archived items", "Status legend", "Sync work stream"], "children in DOM order: the toggle, the legend control, the sync button");
          const facts = toggleFacts(app.tree());
          assert.equal(facts.node.props.type, "button");
          assert.equal(facts.pressed, "false", "aria-pressed false");
          assert.equal(facts.disabled, false, "not disabled");
          assert.equal(facts.busy, null, "no aria-busy");
          assert.equal(facts.text, "Show archived", "the visible text is exactly Show archived — no digit");
          assert.ok(facts.className.includes(`${TOGGLE_BASE} ${TOGGLE_OFF}`), `the OFF class string (${facts.className})`);
          assert.deepEqual(listUrls(app), ["/api/work/list"], "the only list request so far carries no query string");
          const mentions = findAll(app.tree(), (node) => typeof node === "object" && (node.children ?? []).some((child) => typeof child === "string" && /archived/.test(child)));
          for (const node of mentions) {
            assert.ok(node === facts.node || findAll(facts.node, (inner) => inner === node).length > 0, `the word archived appears only in the toggle's own label (found in <${node.type} class="${className(node)}">)`);
          }
          assert.equal(app.overviewCard("12"), null, "no card for 12");
          assert.equal(app.gateBar("13"), null, "no gate bar for 13");
          assert.equal(pillsIn(app.tree()).length, 0, "no pill anywhere");
          assert.ok(!visibleTextOf(app.tree()).includes("12/00"), "no row for 12/00");
          assert.equal(headerSentence(app.tree()).startsWith("1 milestone ·"), true, "the header reads 1 milestone");
          assert.deepEqual(chips(app.tree()), ["✓ 0 done", "◐ 1 active", "! 1 blocked gate"]);
        });
      }, { stream: ARCHIVE_STREAM });
    },
  },
  {
    name: "board-archive/04 toggling ON refetches in place with the parameter — busy and still un-pressed while held, never the loading branch — then reveals the archive marked, states the count, and toggling OFF returns the bare list with no pill",
    run: async () => {
      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url }, async (app) => {
          const hold = app.holdNext("/api/work/list");
          const click = clickToggleDetached(app);
          await hold.answered();
          await app.renderOnly();
          assert.deepEqual(listUrls(app), ["/api/work/list", "/api/work/list?includeArchived=1"], "ONE request with the parameter flipped is recorded");
          const held = toggleFacts(app.tree());
          assert.equal(held.disabled, true, "the button is disabled while in flight");
          assert.equal(held.busy, "true", "…and aria-busy");
          assert.equal(held.pressed, "false", "…and STILL aria-pressed false — the state commits only when the rows land");
          assert.deepEqual(app.overviewCards().map(refOf), ["43"], "the grid still paints exactly the 43 card");
          assert.notEqual(app.screen(), "loading", "the tree never entered the loading branch");
          hold.release();
          await click.settle();

          const on = toggleFacts(app.tree());
          assert.equal(on.pressed, "true");
          assert.equal(on.disabled, false);
          assert.equal(on.busy, null);
          assert.ok(on.className.includes(TOGGLE_ON), "the ON tint");
          assert.ok(!on.className.includes("bg-primary "), "…and no teal fill");

          assert.deepEqual(app.overviewCards().map(refOf), ["43", "12"], "the grid paints 43 then 12 — the wire's order");
          const card = app.overviewCard("12");
          assert.ok(card.className.includes("bg-muted/40") && !card.className.includes("bg-card"), "12's card takes bg-muted/40 in place of bg-card");
          assert.ok(!/opacity|border-dashed/.test(card.className), "no opacity, no dashed border");
          // `textOf` (the raw concatenation): the footer's "1 story" is two text nodes ("stor" + "y").
          assert.ok(textOf(card.node).includes("1 story") && card.text.includes("✓ accepted") && card.text.includes("Open board →"), "its footer is intact");
          const cluster = findAll(card.node, (node) => node.type === "span" && className(node) === "ml-auto flex items-center gap-1.5")[0];
          const clusterChildren = elementChildren(cluster);
          assert.equal(clusterChildren.length, 2, "the row-1 cluster holds exactly two children (no stale badge — none is reported)");
          assert.ok(isPill(clusterChildren[0]), "…the archived pill first");
          assert.equal(visibleTextOf(clusterChildren[1]), "✓ done", "…then the status chip ✓ done");
          const pill = clusterChildren[0];
          assert.equal(className(pill), PILL_CLASSES, "the pill's class string is exactly the pinned one");
          const glyph = elementChildren(pill)[0];
          assert.equal(glyph.type, "span");
          assert.equal(glyph.props["aria-hidden"], "true", "its first child is the aria-hidden glyph");
          assert.equal(textOf(glyph), "▤");
          assert.equal(visibleTextOf(pill), "▤ archived");
          assert.equal(pillsIn(app.overviewCard("43").node).length, 0, "the 43 card carries no such span");

          assert.deepEqual(app.gateBars().map(refOf), ["44", "13"], "the gates strip paints 44 then 13");
          const bar = app.gateBar("13");
          const barCluster = findAll(bar.node, (node) => node.type === "span" && className(node) === "ml-auto flex items-center gap-1.5")[0];
          const barChildren = elementChildren(barCluster);
          assert.ok(isPill(barChildren[0]) && visibleTextOf(barChildren[1]) === "✓ done", "13's bar holds the pill immediately left of its ✓ done chip");
          assert.equal(pillsIn(app.gateBar("44").node).length, 0);

          assert.ok(headerSentence(app.tree()).startsWith("2 milestones ·"), "the header reads 2 milestones");
          assert.deepEqual(chips(app.tree()), ["✓ 1 done", "◐ 1 active", "! 1 blocked gate", "▤ 1 archived"], "the chips, in order, with ▤ 1 archived last");
          const archivedChip = findAll(app.tree(), (node) => node.type === "span" && className(node).includes(CHIP_TOKENS) && visibleTextOf(node) === "▤ 1 archived")[0];
          assert.ok(className(archivedChip).includes("bg-muted text-muted-foreground"), "the archived chip is muted");
          assert.equal(elementChildren(archivedChip)[0].props["aria-hidden"], "true", "…with its glyph decorative");

          await clickToggle(app);
          assert.equal(listUrls(app).at(-1), "/api/work/list", "the request with no query is recorded");
          const off = toggleFacts(app.tree());
          assert.equal(off.pressed, "false");
          assert.ok(off.className.includes(TOGGLE_OFF));
          assert.deepEqual(app.overviewCards().map(refOf), ["43"], "the grid paints only 43");
          assert.equal(pillsIn(app.tree()).length, 0, "no pill exists anywhere");
          assert.ok(!chips(app.tree()).some((chip) => chip.includes("archived")), "the ▤ chip is absent");
        });
      }, { stream: ARCHIVE_STREAM });
    },
  },
  {
    name: "board-archive/04 the archived chip is present even at zero while ON, and absent while OFF",
    run: async () => {
      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url }, async (app) => {
          assert.ok(!chips(app.tree()).some((chip) => chip.includes("archived")), "OFF: no chip's text contains archived");
          await clickToggle(app);
          assert.deepEqual(chips(app.tree()), ["✓ 0 done", "◐ 1 active", "! 1 blocked gate", "▤ 0 archived"], "ON over a stream with no archive: the zero is stated");
          assert.equal(toggleFacts(app.tree()).pressed, "true");
        });
      });
    },
  },
  {
    name: "board-archive/04 an archived milestone's board is a done milestone's board plus the mark — the switcher button and row, the lane card under all focus and the detail header carry it; its stories carry none",
    run: async () => {
      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url, hostNodes: true, terminalEnvironment: true }, async (app) => {
          await clickToggle(app);
          await app.openMilestone("12");
          assert.equal(app.screen(), "board");
          const button = switcherButton(app.tree());
          const buttonChildren = elementChildren(button);
          assert.equal(buttonChildren[0].props?.role, "img", "the switcher button's first child is the status dot");
          assert.equal(className(buttonChildren[1]), "mono", "…then the mono label");
          assert.equal(textOf(buttonChildren[1]), "12 · Theta");
          assert.ok(isPill(buttonChildren[2]), "…then the archived pill");
          assert.equal(textOf(buttonChildren[3]), "▾", "…then ▾");
          assert.equal(countLabel(app.tree()), "1 story", "the count label reads 1 story");

          await openSwitcher(app);
          const rows = switcherRows(app.tree());
          assert.deepEqual(rows.map((row) => visibleTextOf(row).split(" ")[0]), ["✦", "43", "12"], "the rows: All milestones, 43, 12");
          const trailing = (row) => findAll(row, (node) => node.type === "span" && className(node) === "ml-2 shrink-0 text-xs text-muted-foreground")[0];
          assert.equal(visibleTextOf(trailing(rows[1])), "in progress", "43's trailing text");
          assert.equal(visibleTextOf(trailing(rows[2])), "done · archived", "12's trailing text carries the mark as a word, in the same span");
          assert.equal(pillsIn(rows[2]).length, 0, "…and no pill in a row");
          // Re-choosing 12 keeps the focus and closes the listbox (the switcher's own door).
          await rows[2].props.onClick();
          await app.flush();

          const story = app.laneCard("12/00");
          assert.ok(story, "the lanes bucket 12/00");
          const doneLane = findAll(app.tree(), (node) => node.type === "div" && className(node).includes("space-y-2 overflow-y-auto") && findAll(node, (inner) => inner === story.node).length > 0)[0];
          assert.ok(doneLane, "…under a lane");
          assert.equal(pillsIn(story.node).length, 0, "the story's lane card carries NO pill");
          assert.ok(!story.className.includes("bg-muted/40"), "…and no bg-muted/40");

          await app.selectCard("12/00");
          const detail = app.detail();
          assert.equal(detail.title, "Theta one");
          assert.equal(pillsIn(detail.panel).length, 0, "the detail panel's header cluster holds NO pill for the story");
          assert.deepEqual(detail.clusterChildren.map((node) => visibleTextOf(node)), ["✓ done"], "…only its status chip");
          assert.deepEqual(app.actionsStrip().buttons, ["+ Add feedback", "✓ Validate", "→ Next"], "the actions strip is that of a done story, unchanged");
          assert.ok(findAll(detail.panel, (node) => node.type === "button" && visibleTextOf(node).includes("Run agent"))[0], "…and its primary action is the ad-hoc Run agent");

          const allRow = (await (async () => { await openSwitcher(app); return switcherRows(app.tree())[0]; })());
          await allRow.props.onClick();
          await app.flush();
          assert.equal(countLabel(app.tree()), "2 milestones · full stream", "the count label under all focus counts what is rendered");
          const card = app.laneCard("12");
          assert.equal(card.type, "button");
          assert.ok(card.className.includes("bg-muted/40"), "12's lane card takes bg-muted/40");
          const meta = findAll(card.node, (node) => node.type === "span" && className(node) === "ml-auto flex items-center gap-1.5")[0];
          assert.ok(meta && isPill(elementChildren(meta).at(-1)), "…and carries the pill at the meta line's right end, where the stale badge would sit beside it");
          assert.equal(pillsIn(app.laneCard("43").node).length, 0, "43's card carries no pill");

          await app.selectCard("12");
          const milestoneDetail = app.detail();
          assert.equal(milestoneDetail.clusterChildren.length, 2, "the detail-panel header cluster holds exactly two children");
          assert.ok(isPill(milestoneDetail.clusterChildren[0]), "…the archived pill");
          assert.equal(visibleTextOf(milestoneDetail.clusterChildren[1]), "✓ done", "…then ✓ done");
          const primary = findAll(milestoneDetail.panel, (node) => node.type === "button" && visibleTextOf(node).includes("Run agent"))[0];
          assert.ok(primary, "the primary action is the quiet ad-hoc Run agent a done milestone offers");
          assert.deepEqual(app.actionsStrip().buttons, ["+ Add feedback", "✓ Validate", "→ Next"], "…and feedback, validate and next are those of a done milestone, unchanged");
        });

        // A story of 12 reported stale: the lane card's badge appears and still no pill; the
        // milestone's own card under all focus shows [stale][archived] in that order.
        await face.reportedBy(NODE, at(-301));
        await withBoardApp({ url: face.url, hostNodes: true, terminalEnvironment: true }, async (app) => {
          await clickToggle(app);
          await app.openMilestone("12");
          const story = app.laneCard("12/00");
          assert.ok(story.badge, "the story's lane card ends in a stale badge");
          assert.equal(findAll(story.node, isBadgeNode).length, 1, "…exactly one");
          assert.equal(pillsIn(story.node).length, 0, "…and still no pill");
          await openSwitcher(app);
          await switcherRows(app.tree())[0].props.onClick();
          await app.flush();
          const card = app.laneCard("12");
          const meta = findAll(card.node, (node) => node.type === "span" && className(node) === "ml-auto flex items-center gap-1.5")[0];
          const metaChildren = elementChildren(meta);
          assert.equal(metaChildren.length, 2);
          assert.ok(isBadgeNode(metaChildren[0]), "[◌ stale …]");
          assert.ok(isPill(metaChildren[1]), "…then [▤ archived], in that order");
        });
      }, { stream: ARCHIVE_STREAM, stalenessSeconds: 300 });
    },
  },
  {
    name: "board-archive/04 a failed toggle refetch reverts the toggle and reports through the existing toast; the list is untouched, the page-level branches are never entered, and a later click commits",
    run: async () => {
      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url }, async (app) => {
          face.failListWith(503, "cache locked");
          await clickToggle(app);
          assert.equal(listUrls(app).at(-1), "/api/work/list?includeArchived=1", "the request with the parameter was recorded");
          const facts = toggleFacts(app.tree());
          assert.equal(facts.pressed, "false", "the toggle reads its prior aria-pressed");
          assert.equal(facts.disabled, false);
          assert.equal(facts.busy, null);
          assert.deepEqual(app.overviewCards().map(refOf), ["43"], "the grid still paints the previous response's rows");
          const toast = findAll(app.tree(), (node) => node.props?.role === "status")[0];
          assert.ok(toast, "a role=status toast is rendered");
          assert.ok(className(toast).includes("border-accent"), "…with the error tint");
          assert.ok(visibleTextOf(toast).includes("cache locked"), "…naming the failure");
          const dismiss = findAll(toast, (node) => node.type === "button" && textOf(node).trim() === "dismiss")[0];
          assert.ok(dismiss, "…with a dismiss button");
          assert.equal(app.screen(), "overview", "the page-level error branch was never entered");
          await dismiss.props.onClick();
          await app.flush();
          assert.equal(findAll(app.tree(), (node) => node.props?.role === "status").length, 0, "dismiss removes it");

          face.healList();
          await clickToggle(app);
          assert.equal(toggleFacts(app.tree()).pressed, "true", "the toggle commits ON");
          assert.ok(pillsIn(app.overviewCard("12").node).length === 1, "…and 12 renders marked");
        });
      }, { stream: ARCHIVE_STREAM });
    },
  },
  {
    name: "board-archive/04 the committed state rides every later list request — sync and the executing-item re-poll — and never a reload: a fresh mount is OFF, and a hash deep-link to an archived ref lands on the overview with no include-archived request",
    run: async () => {
      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url }, async (app) => {
          await clickToggle(app);
          await app.sync();
          assert.equal(listUrls(app).at(-1), "/api/work/list?includeArchived=1", "⟳ sync carries the committed state");
          assert.ok(app.overviewCard("12"), "…and 12 stays rendered");

          await face.dispatched("43/04", { node: NODE, state: "running", at: at(0) });
          await app.sync();
          const before = listUrls(app).length;
          await app.advance(5000);
          const during = listUrls(app).slice(before);
          assert.ok(during.length > 0, "the executing-item re-poll ran");
          assert.ok(during.every((url) => url.endsWith("?includeArchived=1")), `every list request in the window carries includeArchived=1 (${during.join(", ")})`);
        });

        await withBoardApp({ url: face.url }, async (app) => {
          assert.equal(toggleFacts(app.tree()).pressed, "false", "a fresh mount is OFF");
          assert.deepEqual(listUrls(app), ["/api/work/list"], "…its first request has no query string");
          assert.equal(app.overviewCard("12"), null, "…and 12 is not rendered");
        });

        await withBoardApp({ url: face.url, hash: "12" }, async (app) => {
          assert.equal(app.screen(), "overview", "#12 with the toggle OFF lands on the overview");
          assert.equal(toggleFacts(app.tree()).pressed, "false", "…toggle OFF");
          assert.equal(switcherButton(app.tree()), null, "…no board focused");
          assert.ok(listUrls(app).every((url) => !url.includes("includeArchived")), "…and no include-archived request was made");
        });
      }, { stream: ARCHIVE_STREAM });
    },
  },
  {
    name: "board-archive/04 the legend documents the pill by painting the real one — one row after the Freshness block, byte-identical to the card's — and the fleet's legend has gained no row",
    run: async () => {
      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url }, async (app) => {
          await clickToggle(app);
          const cardPill = pillsIn(app.overviewCard("12").node)[0];
          const legend = await app.openLegend();
          assert.ok(legend, "the legend opens");
          const freshnessIndex = legend.blocks.findIndex((block) => block.text.startsWith("Freshness"));
          assert.ok(freshnessIndex >= 0, "the Freshness block is there");
          const after = legend.blocks.slice(freshnessIndex + 1);
          assert.equal(after.length, 2, "the Freshness block's own rows follow its heading, and then exactly ONE more block");
          assert.ok(after[0].text.startsWith(FRESHNESS_GLYPH), "…the Freshness rows first");
          assert.ok(after[1].text.startsWith("▤ archived —"), "…and the archived row LAST");
          const row = legendArchivedRow(legend);
          assert.ok(row, "…a row whose first child is the pill");
          const [pill, text] = elementChildren(row);
          assert.equal(className(pill), className(cardPill), "the legend's pill is byte-identical in class string to the card's");
          assert.deepEqual(elementChildren(pill).map((node) => [node.type, node.props?.["aria-hidden"], textOf(node)]), elementChildren(cardPill).map((node) => [node.type, node.props?.["aria-hidden"], textOf(node)]), "…and in children");
          assert.equal(textOf(pill), textOf(cardPill));
          assert.equal(textOf(text), "— done and moved to archive/; shown only with \"Show archived\"", "…followed by the documenting text");
        });
      }, { stream: ARCHIVE_STREAM });

      await withFleetFixture({ live: [{ type: "milestone", number: "43", slug: "alpha", status: "in-progress", title: "Alpha" }] }, async ({ url }) => {
        await withFleetApp({ url, search: "?mode=fleet&scope=global" }, async (app) => {
          const panel = findAll(app.tree(), (node) => className(node).includes("bg-popover") && className(node).includes("group-hover:block"))[0];
          assert.ok(panel, "the fleet's legend panel renders");
          assert.equal(pillsIn(panel).length, 0, "the fleet's legend paints no pill");
          assert.ok(!visibleTextOf(panel).includes("archived"), "…and has gained no archived row");
        });
      });
    },
  },
  {
    name: "board-archive/04 accessibility — the words carry the meaning and the toggle is a real toggle; no backlog row or archived card gained a tabIndex, and the archived card is still the single button it was",
    run: async () => {
      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url }, async (app) => {
          await clickToggle(app);
          for (const pill of pillsIn(app.tree())) {
            const [glyph, ...words] = pill.children ?? [];
            assert.equal(glyph.props?.["aria-hidden"], "true", "the glyph span is aria-hidden");
            assert.equal(String(words.join("")).trim(), "archived", "…and the word archived is not hidden — the pill's accessible text is the word");
          }
          const facts = toggleFacts(app.tree());
          assert.equal(facts.node.props["aria-label"], "Show archived items", "the toggle's accessible name");
          assert.ok(facts.className.includes("min-h-6"), "…and its hit target");
          assert.equal(facts.pressed, "true");
          const card = app.overviewCard("12");
          assert.ok(card.text.includes("archived") && card.text.includes("✓ done"), "the card conveys archived by the word, never by colour or glyph alone");
          assert.equal(card.node.props.tabIndex, undefined, "the archived card gained no tabIndex");
          assert.deepEqual(card.buttons, [], "…and is still the single <button> it was");
          for (const row of findAll(app.tree(), (node) => node.type === "li")) assert.equal(row.props?.tabIndex, undefined, "no backlog row gained a tabIndex");
        });
      }, { stream: { ...ARCHIVE_STREAM, backlog: BACKLOG_STREAM.backlog } });
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // task 05 — the fleet partitions the backlog out
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "fleet-backlog/05 a backlog milestone on the fleet payload is neither listed, counted nor assignable — under the default open filter and under all",
    run: async () => {
      await withFleetFixture({
        live: [{ type: "milestone", number: "43", slug: "alpha", status: "in-progress", title: "Alpha" }],
        backlog: [{ type: "milestone", slug: "search-the-fleet", title: "Search the fleet", group: "" }, { type: "chore", slug: "prune-logs", title: "Prune logs", group: "ops/later" }],
      }, async ({ url }) => {
        const status = await (await fetch(`${url}/api/mesh/status?scope=global`)).json();
        const backlogRows = status.items.filter((item) => item.number === null);
        assert.deepEqual(backlogRows.map((item) => [item.ref, item.backlog]), [["prune-logs", "ops/later"], ["search-the-fleet", ""]], "the payload carries the two backlog rows (the premise)");
        assert.deepEqual(milestoneListItems(status.items).map((item) => item.ref), ["43"], "milestoneListItems(status.items) is exactly 43's row");
        await withFleetApp({ url, search: "?mode=fleet&scope=global" }, async (app) => {
          assert.deepEqual(milestoneRowRefs(app.tree()), ["43"], "the region paints one milestone row, and the only assign control is 43's");
          assert.equal(regionSummary(app.tree(), "Milestones"), "1 milestone", "the header's total is 1 with no hidden-count tail");
          const facts = documentFacts(app.tree());
          assert.ok(!mentionsFact(facts, "search-the-fleet") && !mentionsFact(facts, "prune-logs"), "no node in the tree carries a backlog slug");
          assert.equal(app.affordance("search-the-fleet"), null, "no AssignAffordance exists for the backlog milestone");
          await setStatusFilter(app, "all");
          assert.deepEqual(milestoneRowRefs(app.tree()), ["43"], "under all the list is still exactly 43 — the partition is not a status");
        });
      });
    },
  },
  ...[
    ["open", ["43"], " · 1 done hidden"],
    ["all", ["43", "12"], ""],
    // The feature's Examples row spelled an EMPTY tail here; the fleet's DELIVERED rule
    // (`workStatusSummaryTail`, unchanged by this task as the task requires) names the
    // in-progress 43 it hid under `done`. Asserted as the fleet answers it; flagged in STATE.
    ["done", ["12"], " · 1 hidden, done only"],
  ].map(([filter, rows, hidden]) => ({
    name: `fleet-backlog/05 an archived milestone follows the fleet's existing status filter, unmarked — ${filter}: ${rows.join(", ")}${hidden ? ` (${hidden.trim()})` : ""}`,
    run: async () => {
      await withFleetFixture({
        live: [{ type: "milestone", number: "43", slug: "alpha", status: "in-progress", title: "Alpha" }],
        archived: [{ type: "milestone", number: "12", slug: "theta", status: "done", title: "Theta" }],
      }, async ({ url }) => {
        await withFleetApp({ url, search: `?mode=fleet&scope=global${filter === "open" ? "" : `&status=${filter}`}` }, async (app) => {
          assert.deepEqual(milestoneRowRefs(app.tree()).sort(), [...rows].sort(), `the Milestones region lists exactly ${rows.join(", ")}`);
          assert.equal(regionSummary(app.tree(), "Milestones"), `${rows.length} milestone${rows.length === 1 ? "" : "s"}${hidden}`, "the header's tail");
          const facts = documentFacts(app.tree());
          assert.ok(!mentionsFact(facts, "archived") && !facts.includes("▤"), "no node anywhere carries the text archived or the glyph ▤");
        });
        const status = await (await fetch(`${url}/api/mesh/status?scope=global`)).json();
        const narrowed = filterToWorkStatus(status, filter);
        assert.equal(workStatusSummaryTail(filter, hiddenMilestoneCount(status, narrowed)), hidden, "the pure helpers agree with the rendered tail");
      });
    },
  })),
  {
    name: "fleet-backlog/05 the partition drops rows and rewrites none — number absent is numbered, number null is not, and type still decides; the wire type carries the three keys",
    run: async () => {
      const rows = [{ type: "milestone", number: null, ref: "x" }, { type: "milestone", ref: "12", archived: true }, { type: "story", ref: "12/00" }];
      const listed = milestoneListItems(rows);
      assert.deepEqual(listed, [{ type: "milestone", ref: "12", archived: true }], "exactly the 12 row");
      assert.equal(listed[0], rows[1], "…the same object — the filter rewrites nothing");
      const source = await readFile(path.join(repoRoot, "ui", "src", "fleet", "api.ts"), "utf8");
      const type = source.slice(source.indexOf("export type GlobalWorkItem = {"), source.indexOf("export type GlobalNode"));
      for (const key of ["number?: null;", "backlog?: string;", "archived?: true;"]) assert.ok(type.includes(key), `GlobalWorkItem declares ${key}`);
    },
  },
];
