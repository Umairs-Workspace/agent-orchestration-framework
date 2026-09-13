// Traceability wiring for milestone 38 / story 04 / task 07 —
// tasks/07_assign-row-geometry-holds.feature (@executable).
//
// DG-13 / F-38.04g, from the REAL-assign render of 2026-07-24 (§Surface 2's
// first real verdict: GAPS at 1280). DESIGN §Surface 2 "Amendment 2026-07-24
// (b) — F-38.04g / F-38.04f, judged from the REAL-assign render", five binding
// clauses; the AMENDED A10 ("'Rhythm' is binding geometry"); DG-13 in the
// design-gap list, with DG-11 re-scoped into clause 5.
//
// WHAT THE PIXELS SHOWED:
//   - in the REFUSED frame the picker (`flex-1 min-w-0 truncate`) collapsed to a
//     BARE CHEVRON — ~26px, down from ~284px — while the inline error took the
//     row, so the operator could not see which node was selected at the exact
//     moment they had to re-aim, and the error truncated before naming the
//     holder (`Item "18" already has an active assignment …`);
//   - in the SUCCESS frame the action narrowed 67px -> 44px on the `Sent` label
//     swap and the picker absorbed the difference — the row reflowed on every
//     state change;
//   - region 5's chip target truncated in EVERY frame that had one
//     (`→ umamis-m…`, `→ aaa-firs…`).
//
// HOW THESE LANES ARE DRIVEN, AND WHAT THEY CAN PROVE. Every clause is asserted
// off the REAL, unmodified production <Fleet/> mounted headlessly against the
// REAL fleet face (test/support/fleet-app-harness.mjs), reading the RENDERED
// props/classNames the component actually emits — the house idiom for a render
// fact. That makes each clause a CLASS/STRUCTURE fact:
//   - "the action's reserved width is the SAME value in every state, and it is
//     derived from the longest label";
//   - "the picker carries a minimum width, and carries no `min-w-0`";
//   - "the message slot is the shrinking/truncating element and carries the full
//     text in `title`";
//   - "region 5 is a YIELD order — the name is dropped whole, `Open board →`
//     degrades to its abbreviated form, and the target yields LAST".
//
// AMENDED 2026-07-24 by §Surface 2's SECOND real verdict — the re-render taken
// after this file was first written. It closed DG-14 and GAP-S2-3 outright and
// closed DG-13 as filed, but opened three successors, all built and asserted
// here: DG-15 (the target's `shrink-0` OVERPRINTED `Open board →` — clause 5
// gains "no two elements in region 5 may occupy the same pixels", and priority
// becomes a YIELD order, never a paint order), DG-16 (the workspace name STUBBED
// to `l…` instead of dropping — full or nothing), and DG-17 (clause 4's own
// exemplar copy could not fit the row clauses 1+2 leave — the holder is atomic
// and the copy steps down a ladder).
// It does NOT make them a PIXEL verdict. Whether the reserved width really does
// contain `Assigning…` at 11px semibold, whether the floor really does show
// fourteen characters beside the chevron, whether the row's height is still 38px
// and whether the wider action still reads as A2's quiet carve-out are all
// claims about pixels, and only a render can settle them. That render is owed to
// the designer and is NOT claimed here.
//
// ── AMENDED 2026-08-11 by milestone 47 / story 04 ────────────────────────────
// It gains ELEVEN lanes and loses none, for the two task features of
// `stories/04_story_assign-row-relief/`:
//   - `tasks/00_filtered-row-yield-order.feature` (ADR-008, DG-47-2) — under a repo
//     filter region 5 drops the workspace-name column UNCONDITIONALLY, yielding the
//     row the surface already renders when the name is dropped by its fit budget;
//   - `tasks/01_drill-in-unavailable-treatment.feature` (DG-47-5) — the drill-in's
//     two NON-REST states put back on that same ladder: the words on the same
//     abbreviation gate, the pinned `→` surviving, the house dashed/muted absent
//     mark spent vertically, no `aria-disabled`, and an accessible name that names
//     the remedy.
// Every pre-existing lane's expected value is UNCHANGED, and `LANES_BEFORE_47_04`
// below turns "loses none" into an assertion rather than a hope.
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ASSIGN_ACTION_LABELS,
  ASSIGN_ACTION_WIDTH_CH,
  ASSIGN_PICKER_FLOOR_CH,
  ASSIGN_PICKER_CHROME,
  ASSIGN_LABEL_REST,
  ASSIGN_LABEL_SENDING,
  ASSIGN_LABEL_SENT,
  ASSIGN_REFUSAL_COPY,
  ASSIGN_MESSAGE_BUDGET_CH,
  ASSIGN_REFUSAL_SHORT_OUTCOME,
  REGION5_NAME_BUDGET_CH,
  REGION5_CHIP_SLOT_BUDGET_CH,
  REGION5_DRILLIN_ABBREV_AT_CH,
  REGION5_ROW_FLOOR_PX,
  region5NameDropped,
  region5RowLadder,
  assignAffordanceView,
  assignRefused,
  assignRefusalLadder,
} from "../../ui/src/fleet/assign-affordance.mjs";
import {
  withPublishedAssignFixture,
  withTwoWorkspaceAssignFixture,
  sameOriginAssign,
  seedTargetNode,
} from "../support/mesh-ui-assign-fixture.mjs";
import { withFleetApp, findAll, textOf } from "../support/fleet-app-harness.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FLEET_API_TS = path.join(repoRoot, "ui", "src", "fleet", "api.ts");
const FLEET_TSX = path.join(repoRoot, "ui", "src", "fleet", "Fleet.tsx");

// The four phases the row ever renders. Kept here (not derived from the view) so
// a phase quietly dropped from the state machine would be noticed rather than
// silently un-asserted.
const EVERY_PHASE = ["rest", "sending", "sent", "refused"];

// codedRefusalFromRoute(url, request) — a REAL refusal, taken from the REAL
// route, rebuilt into the Error the REAL api client throws. `ui/src/fleet/api
// .ts`'s safeError lifts `error`/`code` and (after this pass) the verb's own
// extra fields `holder`/`target` onto the Error; this mirrors that lift exactly,
// so `assignRefused` is fed the same envelope production feeds it. The lift
// itself is asserted structurally against api.ts in its own lane below, which is
// what joins the two halves.
async function codedRefusalFromRoute(url, { ref, nodeId, workspaceId }) {
  const response = await fetch(new URL("/api/mesh/assign", url), {
    method: "POST",
    headers: { origin: new URL(url).origin, "content-type": "application/json" },
    body: JSON.stringify({ ref, nodeId, workspaceId }),
  });
  assert.ok(!response.ok, `the route really refused this dispatch — got ${response.status}`);
  const body = await response.json();
  const error = new Error(body.error ?? `Request failed (${response.status})`);
  error.code = body.code;
  error.status = response.status;
  if (typeof body.holder === "string") error.holder = body.holder;
  if (typeof body.target === "string") error.target = body.target;
  return { error, body };
}

// The card's REGION 5 — the footer row: the workspace name, then the attention
// cluster (the m35 chip + the secondary token) and the right-aligned drill-in.
// Addressed STRUCTURALLY (never by index), so a layout change fails loudly.
function region5(card) {
  const footer = findAll(
    card,
    (node) =>
      node.type === "div"
      && typeof node.props?.className === "string"
      && node.props.className.includes("justify-between")
      && node.props.className.includes("border-t"),
  )[0] ?? null;
  assert.ok(footer, "the card renders its region-5 footer row");
  const children = (footer.children ?? []).filter(Boolean);
  // Addressed by IDENTITY, not position: DG-16 makes the workspace name a
  // CONDITIONAL child (dropped whole once the attention cluster needs the row),
  // so a positional `[workspaceName, cluster]` would silently hand back the
  // cluster the moment the name is absent — and the assertion "the name is gone"
  // would pass against the wrong element. The name is the direct-child span in
  // the `mono` ramp; the cluster wrapper carries no ramp of its own.
  const workspaceName = children.find(
    (node) => node && node.type === "span" && typeof node.props?.className === "string" && /\bmono\b/.test(node.props.className),
  ) ?? null;
  const cluster = children.find((node) => node && node !== workspaceName) ?? null;
  // The drill-in is addressed by its `title`, not its TEXT: DG-19's last clause
  // makes the words a conditional child, so a text match would stop finding the
  // element in exactly the abbreviated state that most needs asserting.
  const drillIn = findAll(
    footer,
    (node) => node.type === "span" && typeof node.props?.title === "string" && /^Open(ing)? board|^Open failed/.test(node.props.title),
  )[0] ?? null;
  // The chip's mono text slot is addressed by the ONE fact that identifies it
  // without assuming the very classes this file is here to assert: it is the
  // element carrying the whole `→ <target> · <when> · <note>` string as its
  // native `title`. Its two children are the target half and the tail half.
  const chipText = findAll(
    footer,
    (node) => node.type === "span" && typeof node.props?.title === "string" && node.props.title.startsWith("→ "),
  )[0] ?? null;
  const [target = null, tail = null] = chipText ? (chipText.children ?? []).filter((child) => child && typeof child === "object") : [];
  return { footer, children, workspaceName, cluster, drillIn, target, chipText, tail };
}

// ═══ m47/04 — the filtered row (ADR-008/DG-47-2) and the drill-in's three states
//     (DG-47-5). Everything below this line was added by story 04; nothing above it
//     was edited. ══════════════════════════════════════════════════════════════

// The address the surface is mounted at. `pathname` matters because m45 made the
// fleet a PATH; the `search` is the ONLY input that decides whether the view is
// repo-filtered, and it is story 02's contract used here as an INPUT (never a claim).
const FLEET = "/fleet";
const UNFILTERED = "?scope=global";
const filteredTo = (workspaceId) => `?scope=global&repo=${workspaceId}`;
const RESOLVER = "/api/mesh/board-url";

// The drill-in's three renderings, pinned verbatim by 47/01 task 00 and NOT changed
// by DG-47-5 ("the words are NOT changed"). They are the WORDS; the pinned `→` is a
// separate child, which is the whole of clause 2.
const WORDS_REST = "Open board";
const WORDS_IN_FLIGHT = "Opening board...";
const WORDS_FAILED = "Open failed";
const GLYPH = " →";

const classTokens = (node) => String(node?.props?.className ?? "").split(/\s+/).filter(Boolean);
const hasToken = (node, token) => classTokens(node).includes(token);
const elementChildren = (node) => (node?.children ?? []).filter((child) => child && typeof child === "object");

// The attention cluster's OWN children, FLATTENED — the shape a browser lays out.
// `attention` is a Fragment (`<><AssignmentChip/>{secondary}</>`), which the
// renderer keeps as a nested ARRAY while CSS flattens it into the flex container:
// so `elementChildren(cluster)` reports TWO children for a row that has three flex
// items, and every arity claim taken through it is a claim about the wrong tree.
// That is the reading F-47-04-QA-10 found: a `justify-between` token means what
// DG-22 says only for the arity the reader assumed.
const clusterChildren = (node) => {
  const out = [];
  const walk = (child) => {
    if (Array.isArray(child)) { for (const inner of child) walk(inner); return; }
    if (child && typeof child === "object") out.push(child);
  };
  for (const child of node?.children ?? []) walk(child);
  return out;
};

// m47/04 (ADR-014) — the ONE ladder, driven directly. ADR-008 asks the suite to
// drive the DECISION rather than infer it from a rendered class name, and after
// ADR-014 that is the only way to state a rung's arithmetic without re-typing the
// number the rung is derived from.
const ladderFor = ({ node, secondary = false }) =>
  region5RowLadder({ assignment: { targetNodeId: node, assignedAt: new Date().toISOString() }, secondary });

// A STRUCTURAL SIGNATURE of a rendered subtree — the shape scenario 3's equivalence
// is compared on. It carries exactly the facts the headless channel can honestly
// see (element order, class list, native `title`, aria, rendered text) and nothing
// it cannot (no pixel, no box). Components are already flattened into host elements
// by the renderer, so a signature taken from two SEPARATE mounts is comparable.
function signature(node) {
  if (node == null || node === false || node === true) return null;
  if (typeof node !== "object") return String(node);
  return {
    type: node.type,
    className: node.props?.className ?? null,
    title: node.props?.title ?? null,
    ariaLabel: node.props?.["aria-label"] ?? null,
    ariaHidden: node.props?.["aria-hidden"] ?? null,
    style: node.props?.style ?? null,
    children: (node.children ?? []).map(signature).filter((child) => child !== null && child !== ""),
  };
}

// "renders WHOLE — no stub, no prefix and no ellipsised fragment of a workspace
// name anywhere in region 5" (task 00 scenario 1). A dropped name's PREFIX is the
// DG-16 defect this clause exists to catch, and it is checked positively rather
// than by trusting the element's absence.
function assertNoFragmentOf(footer, name) {
  const text = textOf(footer);
  assert.ok(!/…/.test(text), `nothing in region 5 is ellipsised to a fragment — got ${JSON.stringify(text)}`);
  for (let length = 3; length <= name.length; length += 1) {
    const prefix = name.slice(0, length);
    assert.ok(
      !text.includes(prefix),
      `no stub of the dropped workspace name survives in region 5 — found ${JSON.stringify(prefix)} in ${JSON.stringify(text)}`,
    );
  }
}

// mintAndRead({ name, node, ... }) — one fixture, one REAL minted assignment (from a
// REAL click, never a hand-seeded row), read back through as many ADDRESSES as the
// row needs. `views` is a map of label -> search string builder; each is a separate
// mount over the SAME published data, which is what makes a filtered/unfiltered
// comparison an equivalence rather than two anecdotes.
// `secondary` (m47/04, ADR-014 / F-47-04-QA-9) — publish the fixture's story
// `in-review`, so the card renders a SECONDARY attention token beside its chip
// and region 5's cluster has THREE children. It is the arity ADR-014's whole
// derivation is about and the one no fixture in this suite could reach.
async function mintAndRead({ name = "demo", node = "worker-a", assign = true, secondary = false, views }) {
  const out = {};
  await withPublishedAssignFixture(async ({ url, workspaceId }) => {
    if (assign) {
      // The mint is a REAL click through the REAL route, taken in its own mount so
      // every view below reads the SAME published row rather than re-minting.
      await withFleetApp({ url, search: UNFILTERED, pathname: FLEET }, async (app) => {
        await app.affordance("38").click();
        assert.ok(app.affordance("38").cardText.includes(`→ ${node}`), `the chip really minted for ${node}`);
      });
    }
    for (const [label, search] of Object.entries(views)) {
      await withFleetApp({ url, search: search(workspaceId), pathname: FLEET }, async (app) => {
        const cards = app.cards();
        assert.equal(cards.length, 1, `${label}: the fixture renders its one milestone card`);
        out[label] = { r5: region5(cards[0]), card: cards[0], workspaceId };
      });
    }
    out.workspaceId = workspaceId;
  }, { nodes: [node], name, storyStatus: secondary ? "in-review" : "not-started" });
  return out;
}

// THE THREE STATES OF THE DRILL-IN, on ONE card, in ONE mount (DG-47-5).
//
// The FAILED producer is the one DESIGN names for this exact cell (F-47-04-QA-7),
// and it is REAL rather than painted: mint the assignment on a LOCAL workspace by a
// REAL click, then DELETE that checkout. The projection row survives, the path does
// not, and ADR-011's probe answers `409 workspace-not-local` on a card that is still
// rendering its chip — which is the only way to reach the abbreviated failed state,
// since `abbreviateDrillIn` opens with `!!assignment` while the ASSIGN route refuses
// the same rows the board-url route does. No flag is hand-set at any point.
//
// The IN-FLIGHT frame is the REAL request HELD between the click and its delivery,
// never a hand-set flag. Because the checkout is already gone the resolve is doomed,
// which is exactly why the same sequence yields all three states with one click and
// launches no board server.
// `secondary` (m47/04, F-47-04-QA-9) — the card's own story published `in-review`,
// so the row's attention cluster has THREE children. It is one of the two shapes
// QA proved no fixture in this suite reached; the other is the ABBREVIATED form,
// which is reached through `node`.
async function threeDrillInStates({ node = "worker-a", name = "demo", assign = true, secondary = false, search = () => UNFILTERED } = {}) {
  const seen = {};
  await withPublishedAssignFixture(async ({ url, root, workspaceId }) => {
    await withFleetApp({ url, search: search(workspaceId), pathname: FLEET }, async (app) => {
      if (assign) {
        await app.affordance("38").click();
        assert.ok(app.affordance("38").cardText.includes(`→ ${node}`), `the chip really minted for ${node}`);
      }
      await rm(root, { recursive: true, force: true });

      const read = () => {
        const card = app.cards()[0];
        const drill = app.drillInIn(card);
        assert.ok(drill, "the drill-in is addressable in this state");
        return { card, drill, button: drill.button, label: drill.label, r5: region5(card) };
      };

      seen.rest = read();
      const held = app.holdNext(RESOLVER);
      const pending = seen.rest.drill.clickDetached();
      await app.renderOnly();
      seen.inFlight = read();
      await held.answered();
      held.release();
      await pending.settle();
      seen.failed = read();

      assert.deepEqual(app.navigations(), [], "the refused resolve navigated nowhere — the operator is still on the fleet");
      assert.equal(seen.inFlight.r5.drillIn?.props?.title, WORDS_IN_FLIGHT, "the held frame really is the IN-FLIGHT state");
      assert.equal(seen.failed.r5.drillIn?.props?.title, WORDS_FAILED, "…and the settled frame really is the FAILED state");
      seen.workspaceId = workspaceId;
    });
  }, { nodes: assign ? [node] : [], name, storyStatus: secondary ? "in-review" : "not-started" });
  return seen;
}

// THE SUITE AS IT STOOD BEFORE m47/04 — eleven lanes, of which exactly two assert on
// region 5 and neither renders a non-rest drill-in. Frozen here so "the geometry
// contract gains a lane and LOSES none" is a Then an outsider can check off the run
// (task 00 scenario 5, task 01 scenario 6) rather than a claim about a diff.
const LANES_BEFORE_47_04 = Object.freeze([
  "fleet-assign-row-geometry/07 DG-13 clause 1: the action reserves the SAME width in EVERY state — rest, in-flight, `Sent` and refused — and it is sized to the LONGEST label the action ever reads",
  "fleet-assign-row-geometry/07 DG-13 clause 1: the DISABLED empty-roster action reserves the same width on the REAL rendered tree — `in every state including disabled`",
  "fleet-assign-row-geometry/07 DG-13 clause 2: the picker keeps a FLOOR of ≥14ch of the node id PLUS the chevron in every state, carries no `min-w-0`, and still names its target under a long refusal — a bare chevron is FORBIDDEN",
  "fleet-assign-row-geometry/07 DG-13 clause 3: the message slot is the element that yields — it truncates, it carries the FULL server sentence in its native `title`, and neither the picker nor the action is what gives way",
  "fleet-assign-row-geometry/07 DG-17 (supersedes DG-13 clause 4): the holder is an ATOMIC substring — the copy steps DOWN a ladder to keep it whole, and never leads with the ref region 1 already shows",
  "fleet-assign-row-geometry/07 DG-17: the ladder NEVER renders a partial holder — every rung names the holder whole, and when even the shortest cannot fit, the holder is OMITTED rather than mutilated",
  "fleet-assign-row-geometry/07 DG-13 clause 4 (Outline): every verb refusal whose sentence leads with a fact another region already carries is shaped outcome-first from the CODED envelope, and keeps its full sentence in the `title`",
  "fleet-assign-row-geometry/07 DG-13 clause 4: the api client carries the verb's CODED envelope onto the thrown error — without `holder` on the wire and on the Error, the affordance could not name the holder at all",
  "fleet-assign-row-geometry/07 DG-13 + A10: the fixed width adds NO element to the row — its children stay picker · action · (message), the sizing shell lives INSIDE the action, and the row keeps the card's own divider+padding idiom",
  "fleet-assign-row-geometry/07 DG-13 clause 5 + DG-15/DG-16: region 5 is a YIELD order — the name is dropped whole rather than stubbed, `Open board →` gives way next, and the target yields LAST and never overprints",
  "fleet-assign-row-geometry/07 DG-19: at maximum pressure the chip's tail is DROPPED WHOLE, never ellipsised to a fragment — the target keeps the room and nothing partial renders",
]);

export const fleetAssignRowGeometryTests = [
  // ══ clause 1 — the action's width is FIXED ══
  {
    name: "fleet-assign-row-geometry/07 DG-13 clause 1: the action reserves the SAME width in EVERY state — rest, in-flight, `Sent` and refused — and it is sized to the LONGEST label the action ever reads",
    async run() {
      // The derivation, asserted where it lives: the reserved width comes from
      // the label SET, so renaming or adding a label cannot leave it behind.
      assert.deepEqual(
        [...ASSIGN_ACTION_LABELS].sort(),
        [ASSIGN_LABEL_REST, ASSIGN_LABEL_SENDING, ASSIGN_LABEL_SENT].sort(),
        "the label set the width is sized from is the label set the action renders",
      );
      assert.equal(
        ASSIGN_ACTION_WIDTH_CH,
        Math.max(...ASSIGN_ACTION_LABELS.map((label) => label.length)),
        "the reserved width is the LONGEST label's, derived — not a number chosen beside them",
      );
      assert.equal(ASSIGN_ACTION_WIDTH_CH, ASSIGN_LABEL_SENDING.length, "…which is `Assigning…`, exactly as the design says");

      // …and phase-independence, asserted at the derivation: there is no phase
      // for which the view yields a different width.
      const widths = new Set(EVERY_PHASE.map((phase) => assignAffordanceView({ phase, hasOptions: true, selected: "worker-a" }).actionWidth));
      assert.equal(widths.size, 1, `the reserved width does not vary with the phase — got ${JSON.stringify([...widths])}`);
      // …including the DISABLED empty-roster row, whose action carries no target.
      assert.equal(
        assignAffordanceView({ phase: "rest", hasOptions: false, selected: "" }).actionWidth,
        [...widths][0],
        "…nor with the roster: the disabled empty-roster action reserves the same width (clause 1 says `in every state including disabled`)",
      );

      // Now the same fact READ OFF THE REAL RENDERED TREE, state by state.
      await withPublishedAssignFixture(async ({ url }) => {
        await withFleetApp({ url }, async (app) => {
          const seen = new Map();
          const record = (label, view) => {
            assert.ok(view.actionSizerStyle?.width, `${label}: the action renders a reserved width`);
            seen.set(label, view.actionSizerStyle.width);
          };

          record(`rest (${app.affordance("38").actionLabel})`, app.affordance("38"));

          // in-flight, read between the click's own state change and the answer
          const held = app.holdNext("/api/mesh/assign");
          const inFlight = app.affordance("38").clickDetached();
          await app.renderOnly();
          assert.equal(app.affordance("38").actionLabel, ASSIGN_LABEL_SENDING);
          record("in-flight (Assigning…)", app.affordance("38"));
          held.release();
          await inFlight.settle();

          assert.equal(app.affordance("38").actionLabel, ASSIGN_LABEL_SENT);
          record("acknowledged (Sent)", app.affordance("38"));

          // …and a REAL refusal: the verb's own single-runner gate refuses the
          // second dispatch of the same item.
          await app.advance(6000);
          await app.affordance("38").click();
          assert.ok(app.affordance("38").message, "the second dispatch is really refused");
          record("refused (Assign →, with a message beside it)", app.affordance("38"));

          const distinct = new Set(seen.values());
          assert.equal(
            distinct.size,
            1,
            `the action's reserved width must be IDENTICAL in every state — a label swap may not move another element. Got ${JSON.stringify([...seen])}`,
          );
          assert.equal([...distinct][0], `${ASSIGN_ACTION_WIDTH_CH}ch`, "…and it is the derived, longest-label width");
        });
      }, { nodes: ["worker-a"] });
    },
  },

  // ══ clause 1 — including the DISABLED empty-roster row, on the real tree ══
  {
    name: "fleet-assign-row-geometry/07 DG-13 clause 1: the DISABLED empty-roster action reserves the same width on the REAL rendered tree — `in every state including disabled`",
    async run() {
      await withPublishedAssignFixture(async ({ url }) => {
        await withFleetApp({ url }, async (app) => {
          const empty = app.affordance("38");
          assert.equal(empty.actionDisabled, true, "the empty-roster action is disabled");
          assert.equal(empty.actionSizerStyle?.width, `${ASSIGN_ACTION_WIDTH_CH}ch`, "…and still reserves the longest label's width");
        });
      });
    },
  },

  // ══ clause 2 — the picker has a FLOOR and never goes anonymous ══
  {
    name: "fleet-assign-row-geometry/07 DG-13 clause 2: the picker keeps a FLOOR of ≥14ch of the node id PLUS the chevron in every state, carries no `min-w-0`, and still names its target under a long refusal — a bare chevron is FORBIDDEN",
    async run() {
      assert.ok(ASSIGN_PICKER_FLOOR_CH >= 14, `the floor renders at least fourteen characters of the node id — got ${ASSIGN_PICKER_FLOOR_CH}`);
      const floors = new Set(EVERY_PHASE.map((phase) => assignAffordanceView({ phase, hasOptions: true, selected: "worker-a" }).pickerMinWidth));
      assert.equal(floors.size, 1, `the floor does not vary with the phase — got ${JSON.stringify([...floors])}`);
      assert.equal(
        [...floors][0],
        `calc(${ASSIGN_PICKER_FLOOR_CH}ch + ${ASSIGN_PICKER_CHROME})`,
        "the chevron's own room is ADDED to the floor, not eaten out of it (`box-sizing: border-box` counts the select's padding, border and chevron inside a width)",
      );

      await withPublishedAssignFixture(async ({ url }) => {
        // The item already has an active assignment, so the very next click
        // draws the REAL refusal — the frame the render caught collapsing.
        const first = await sameOriginAssign(url, "38", "worker-a", "OWN");
        assert.equal(first.status, 200);

        await withFleetApp({ url }, async (app) => {
          const rest = app.affordance("38");
          assert.ok(rest.selectStyle?.minWidth, "the picker renders a minimum width at rest");
          assert.ok(
            !/\bmin-w-0\b/.test(rest.selectClassName),
            `the picker carries NO min-w-0 — that is the class that let the real render collapse it to a bare chevron. Got ${JSON.stringify(rest.selectClassName)}`,
          );

          await app.affordance("38").click();
          const refused = app.affordance("38");
          assert.ok(refused.message, "the refusal really rendered");
          assert.equal(
            refused.selectStyle?.minWidth,
            rest.selectStyle?.minWidth,
            "the picker's floor is UNCHANGED under a refusal — it never yields to the message",
          );
          assert.equal(
            refused.selectedNode,
            "worker-a",
            "…and the picker still NAMES its target at the exact moment the operator must re-aim it",
          );
          assert.deepEqual(refused.options, ["worker-a"], "…with the roster still rendered as options, not swallowed");
        });
      }, { nodes: ["worker-a"] });
    },
  },

  // ══ clause 3 — the message slot is the element that YIELDS ══
  {
    name: "fleet-assign-row-geometry/07 DG-13 clause 3: the message slot is the element that yields — it truncates, it carries the FULL server sentence in its native `title`, and neither the picker nor the action is what gives way",
    async run() {
      await withPublishedAssignFixture(async ({ url }) => {
        const first = await sameOriginAssign(url, "38", "worker-a", "OWN");
        assert.equal(first.status, 200);

        await withFleetApp({ url }, async (app) => {
          await app.affordance("38").click();
          const refused = app.affordance("38");

          assert.match(refused.messageClassName, /\btruncate\b/, "the message slot truncates");
          assert.match(refused.messageClassName, /\bmin-w-0\b/, "…and may shrink to nothing (min-w-0 belongs HERE, on the yielding element)");
          assert.match(refused.messageClassName, /\bshrink\b/, "…it is the shrinking element of the row");
          assert.ok(!/\bshrink-0\b/.test(refused.messageClassName), "…and is emphatically not shrink-0");

          assert.ok(refused.messageTitle, "the slot carries a native title attribute");
          assert.match(
            refused.messageTitle,
            /already has an active assignment/,
            `the title carries the FULL server sentence, whole — nothing is discarded, only ranked. Got ${JSON.stringify(refused.messageTitle)}`,
          );
          assert.ok(
            refused.messageTitle.length > refused.message.length,
            "…and it is longer than what the row shows, which is the point of the idiom (the same one DG-10 uses for the session id)",
          );

          // …and the two elements that must NOT give way.
          assert.match(refused.actionClassName, /\bshrink-0\b/, "the action does not give way");
          assert.match(refused.selectClassName, /\bflex-1\b/, "the picker GROWS into free space rather than yielding out of it");
          assert.ok(refused.selectStyle?.minWidth, "…and is floored besides");
        });
      }, { nodes: ["worker-a"] });
    },
  },

  // ══ clause 4, as SUPERSEDED by DG-17 — the holder is ATOMIC ══
  //
  // The 2026-07-24 re-render judged clause 4 "CLOSED IN COPY, NOT IN PIXELS":
  // the string was exactly `already assigned → umamis-msi` and it still rendered
  // `already assigned → uma…`. The arithmetic proved the rule unsatisfiable —
  // clause 2's picker floor + clause 1's fixed action leave ~137px of a 360.66px
  // row, while clause 4's OWN exemplar needs ~197px. The RULE changed: the
  // holder renders WHOLE or is omitted, chosen by a graduated LADDER, never by
  // handing one long string to CSS `truncate`.
  {
    name: "fleet-assign-row-geometry/07 DG-17 (supersedes DG-13 clause 4): the holder is an ATOMIC substring — the copy steps DOWN a ladder to keep it whole, and never leads with the ref region 1 already shows",
    async run() {
      await withPublishedAssignFixture(async ({ url }) => {
        const first = await sameOriginAssign(url, "38", "worker-a", "OWN");
        assert.equal(first.status, 200, "the item already has an active assignment held by worker-a");

        await withFleetApp({ url }, async (app) => {
          await app.affordance("38").click();
          const refused = app.affordance("38");

          // `already assigned → worker-a` is 27ch against the 22ch budget, so the
          // ladder steps down ONE rung rather than cutting the id.
          assert.equal(
            refused.message,
            "refused · worker-a",
            `the ladder picks the longest rung that FITS, keeping the holder whole. Got ${JSON.stringify(refused.message)}`,
          );
          // DG-21: and the rung it picked still NAMES THE OUTCOME. A rung that
          // dropped the outcome word left the row reading `held by umamis-msi`
          // in red beside region 5's `assigned → umamis-msi` — the same node id
          // twice, with only the colour distinguishing "someone else holds this"
          // from "your assign succeeded". A9/S4: colour and label always travel
          // together, never colour alone.
          assert.match(
            refused.message,
            /refused|already assigned/,
            "…and EVERY rung names the outcome — the destructive tint may never be the only thing carrying it",
          );
          assert.ok(
            refused.message.length <= ASSIGN_MESSAGE_BUDGET_CH,
            "…and the rung it picked really does fit the slot's budget — otherwise CSS would cut it anyway",
          );
          assert.ok(
            !refused.message.startsWith("Item "),
            "…it does NOT lead with the ref: region 1 already shows it, and the raw sentence truncates the holder away spending width on it",
          );
          assert.ok(!refused.message.includes("38"), "…the ref does not appear in the message at all");
          assert.ok(
            refused.message.includes("worker-a"),
            "…and the HOLDER does, WHOLE: it is the only fact no other region on this card carries",
          );
          assert.ok(
            refused.messageTitle.includes("38") && refused.messageTitle.includes("worker-a"),
            "the server's own sentence — ref and all — is not discarded; it is exactly what the `title` carries",
          );
        });
      }, { nodes: ["worker-a"] });
    },
  },

  // ══ DG-17 — the ladder itself, over the holder lengths that decide it ══
  {
    name: "fleet-assign-row-geometry/07 DG-17: the ladder NEVER renders a partial holder — every rung names the holder whole, and when even the shortest cannot fit, the holder is OMITTED rather than mutilated",
    async run() {
      const outcome = ASSIGN_REFUSAL_COPY["assignment-already-active"];
      const rows = [
        // holder, expected copy, why
        ["msi", `${outcome} → msi`, "a short holder fits the top rung verbatim — DESIGN's own worked example shape"],
        ["worker-a", "refused · worker-a", "27ch does not fit, so it steps to `refused · <holder>` (18ch)"],
        ["umamis-mac-mini", outcome, "`refused · …` is 25ch — the holder is OMITTED, never cut"],
        ["umamis-mac-mini-build-agent-02", outcome, "a long holder cannot ride any rung — the outcome stands alone"],
      ];

      for (const [holder, expected, why] of rows) {
        assert.equal(assignRefusalLadder(outcome, holder), expected, `${holder}: ${why}`);

        const rendered = assignRefusalLadder(outcome, holder);
        assert.ok(
          rendered.length <= ASSIGN_MESSAGE_BUDGET_CH,
          `${holder}: every rung the ladder can pick fits the slot — the ladder is what sizes the copy, not CSS`,
        );
        // The atomicity clause, stated as the property that matters: the holder
        // is present WHOLE or absent ENTIRELY. A prefix is the forbidden state —
        // three glyphs of a node id are indistinguishable from three other node
        // ids on the same roster, which is worse than saying nothing.
        const partial = holder.slice(0, Math.max(1, holder.length - 1));
        assert.ok(
          rendered.includes(holder) || !rendered.includes(partial),
          `${holder}: the holder is atomic — whole, or gone; never a prefix`,
        );
        // DG-21 — the rail the first ladder broke: the OUTCOME never leaves the
        // string, at any rung. Without it the row said `held by <node>` in red
        // beside region 5's `assigned → <node>`: the same id twice, and only the
        // colour telling the operator which one was the refusal.
        assert.ok(
          rendered.startsWith(outcome) || rendered.startsWith(ASSIGN_REFUSAL_SHORT_OUTCOME),
          `${holder}: every rung leads with an outcome word — colour is never the only carrier`,
        );
      }

      // No holder at all ⇒ the outcome stands alone, at every budget.
      assert.equal(assignRefusalLadder(outcome, null), outcome, "no holder ⇒ the outcome alone");
      assert.equal(assignRefusalLadder(outcome, ""), outcome, "a blank holder is no holder");

      // The budget is a parameter, not a hidden constant — a future row width
      // widens the copy without touching the ladder.
      assert.equal(
        assignRefusalLadder(outcome, "umamis-mac-mini", 40),
        `${outcome} → umamis-mac-mini`,
        "given a wider slot the ladder climbs BACK to the top rung — it is width-driven, not a downgrade",
      );
    },
  },

  // ══ clause 4 — the Scenario Outline, over REAL coded refusals ══
  {
    name: "fleet-assign-row-geometry/07 DG-13 clause 4 (Outline): every verb refusal whose sentence leads with a fact another region already carries is shaped outcome-first from the CODED envelope, and keeps its full sentence in the `title`",
    async run() {
      await withPublishedAssignFixture(async ({ url, home, workspaceId }) => {
        // A node that is KNOWN to the verb but holds no published repo for this
        // workspace — the producer for `assignment-repo-unavailable`, seeded
        // through the fixture's own seam rather than hand-built.
        await seedTargetNode({ home }, { nodeId: "stranded-node", workspaceId, member: false, published: true });

        const first = await sameOriginAssign(url, "38", "worker-a", "OWN");
        assert.equal(first.status, 200, "…so the next dispatch of 38 is refused already-active");

        const rows = [
          {
            code: "assignment-already-active",
            request: { ref: "38", nodeId: "worker-a", workspaceId },
            // DG-17: the ladder steps down one rung to keep `worker-a` whole.
            message: "refused · worker-a",
            sentenceCarries: /already has an active assignment/,
          },
          {
            code: "assignment-target-unknown",
            request: { ref: "38/04", nodeId: "ghost-node", workspaceId },
            message: ASSIGN_REFUSAL_COPY["assignment-target-unknown"],
            sentenceCarries: /not a known node in this mesh/,
          },
          {
            code: "assignment-repo-unavailable",
            request: { ref: "38/04", nodeId: "stranded-node", workspaceId },
            message: ASSIGN_REFUSAL_COPY["assignment-repo-unavailable"],
            sentenceCarries: /does not hold a published repo/,
          },
          {
            code: "ref-not-found",
            request: { ref: "99/99", nodeId: "worker-a", workspaceId },
            message: ASSIGN_REFUSAL_COPY["ref-not-found"],
            sentenceCarries: /No work item resolves for ref/,
          },
        ];

        for (const row of rows) {
          const { error, body } = await codedRefusalFromRoute(url, row.request);
          assert.equal(body.code, row.code, `${row.code}: the REAL route raised the code this row is about`);

          const state = assignRefused(error);
          assert.equal(state.phase, "refused", `${row.code}: it lands in the refused state`);
          assert.equal(state.error, row.message, `${row.code}: the row renders the shaped, outcome-first copy`);
          assert.equal(state.detail, body.error, `${row.code}: the title carries the server's own sentence, byte-for-byte`);
          assert.match(state.detail, row.sentenceCarries, `${row.code}: …which really is the verb's sentence`);
          assert.ok(
            state.error.length < state.detail.length,
            `${row.code}: the shaped copy is shorter than the sentence it ranks — otherwise there is nothing for the title to do`,
          );

          const view = assignAffordanceView({ ...state, hasOptions: true, selected: "worker-a" });
          assert.equal(view.message, row.message, `${row.code}: …and that is what the view hands the row`);
          assert.equal(view.messageTitle, body.error, `${row.code}: …with the sentence in the title`);
          assert.equal(view.messageTone, "destructive", `${row.code}: in the token the refused state already uses`);
        }

        // An UNMAPPED code keeps the server's own sentence rather than being
        // re-worded on a guess — the route's workspace/identity codes already
        // lead with their outcome.
        const workspaceMiss = await codedRefusalFromRoute(url, { ref: "38/04", nodeId: "worker-a", workspaceId: "0000000000000000" });
        assert.equal(workspaceMiss.body.code, "workspace-not-found");
        const unmapped = assignRefused(workspaceMiss.error);
        assert.equal(unmapped.error, workspaceMiss.body.error, "an unmapped code renders the server's sentence, unshaped");
        assert.equal(unmapped.detail, workspaceMiss.body.error, "…and the title carries the same, so the slot still truncates against the whole of it");
      }, { nodes: ["worker-a"] });
    },
  },

  // ══ clause 4 — the client half: the envelope must REACH the affordance ══
  {
    name: "fleet-assign-row-geometry/07 DG-13 clause 4: the api client carries the verb's CODED envelope onto the thrown error — without `holder` on the wire and on the Error, the affordance could not name the holder at all",
    async run() {
      const source = (await readFile(FLEET_API_TS, "utf8")).replace(/\/\/[^\n]*/g, "");
      assert.match(source, /error\.holder = body\.holder/, "api.ts lifts the verb's `holder` onto the thrown Error");
      assert.match(source, /error\.target = body\.target/, "…and its `target`");
      assert.match(source, /error\.code = body\.code/, "…beside the code the copy is keyed on");

      // …and end-to-end, through the REAL route: the field really is on the wire.
      await withPublishedAssignFixture(async ({ url, workspaceId }) => {
        const first = await sameOriginAssign(url, "38", "worker-a", "OWN");
        assert.equal(first.status, 200);
        const { body } = await codedRefusalFromRoute(url, { ref: "38", nodeId: "worker-a", workspaceId });
        assert.equal(body.code, "assignment-already-active");
        assert.equal(body.holder, "worker-a", "the route forwards the verb's own `holder` field verbatim — the fact the copy is built from");
      }, { nodes: ["worker-a"] });
    },
  },

  // ══ A10 — the row's membership and rhythm are unchanged ══
  {
    name: "fleet-assign-row-geometry/07 DG-13 + A10: the fixed width adds NO element to the row — its children stay picker · action · (message), the sizing shell lives INSIDE the action, and the row keeps the card's own divider+padding idiom",
    async run() {
      await withPublishedAssignFixture(async ({ url }) => {
        await withFleetApp({ url }, async (app) => {
          const rest = app.affordance("38");
          assert.deepEqual(rest.rowChildTypes, ["select", "button"], "at rest the row is picker · action, and nothing else");
          assert.ok(rest.actionSizerClassName, "the reserved width lives on a shell INSIDE the action…");
          assert.equal(
            findAll(rest.row, (node) => node.type === "span" && node.props?.style?.width != null).length,
            1,
            "…and there is exactly one such shell in the whole row — it is a sizing shell, not a fourth element",
          );

          const held = app.holdNext("/api/mesh/assign");
          const inFlight = app.affordance("38").clickDetached();
          await app.renderOnly();
          assert.deepEqual(app.affordance("38").rowChildTypes, ["select", "button"], "in flight: unchanged membership");
          held.release();
          await inFlight.settle();
          assert.deepEqual(app.affordance("38").rowChildTypes, ["select", "button"], "acknowledged: unchanged membership — `Sent` is a label swap inside the existing control");

          await app.advance(6000);
          await app.affordance("38").click();
          const refused = app.affordance("38");
          assert.ok(refused.message);
          assert.deepEqual(
            refused.rowChildTypes,
            ["select", "button", "span"],
            "refused: the message slot is the ONLY element any state adds, and it is appended after the action — the picker and the action do not move in the order",
          );

          const rowClasses = (refused.row?.props?.className ?? "").split(/\s+/);
          for (const idiom of ["mt-3", "border-t", "border-border", "pt-3", "gap-2", "text-xs", "items-center"]) {
            assert.ok(rowClasses.includes(idiom), `the row keeps the card's own divider+padding rhythm idiom: ${idiom} (got ${JSON.stringify(rowClasses)})`);
          }
        });
      }, { nodes: ["worker-a"] });
    },
  },

  // ══ clause 5, as AMENDED by DG-15/DG-16 — a YIELD order, never a paint order ══
  //
  // The re-render caught clause 5's headline MET (the target rendered in full,
  // 30 characters of it) and its MECHANISM broken twice: the target's `shrink-0`
  // inside a `min-w-0` wrapper overflowed and PAINTED OVER `Open board →` — the
  // id's trailing glyph and the action's leading glyph on the same pixels,
  // destroying both (DG-15) — while the workspace name STUBBED to `l…` instead
  // of dropping (DG-16, which also falsified DG-11's "does not reproduce" note).
  // Clause 5 therefore gains a SIXTH clause: no two elements in region 5 may
  // occupy the same pixels. Priority is expressed as who yields FIRST, and every
  // element can yield — the target last, and inside its own box.
  {
    name: "fleet-assign-row-geometry/07 DG-13 clause 5 + DG-15/DG-16: region 5 is a YIELD order — the name is dropped whole rather than stubbed, `Open board →` gives way next, and the target yields LAST and never overprints",
    async run() {
      const longNode = "umamis-mac-mini-worker";
      await withPublishedAssignFixture(async ({ url }) => {
        await withFleetApp({ url }, async (app) => {
          // A REAL minted record, from a REAL click — never a hand-seeded
          // assignment (the milestone's earned lesson: a seeded fixture judges
          // the chrome and never the feature).
          const before = region5(app.affordance("38").card);
          assert.ok(before.workspaceName, "BEFORE any chip, region 5 renders the workspace name in full");
          assert.ok(
            !/\bhidden\b/.test(before.workspaceName.props?.className ?? ""),
            "…there is room for it, so it is present — the drop is pressure-driven, not unconditional",
          );
          // THE UNPRESSURED FRAME IS WHERE THE WORDS' OWN STRUCTURE IS ASSERTED
          // (amended by ADR-014). With no chip on the row nothing is under
          // pressure, so this is the frame in which the drill-in renders its
          // words at all — and asserting them HERE rather than after the click
          // turns "`Open board →` gives way next" into a BEFORE/AFTER comparison
          // on one card instead of a class read on one frame.
          const restingParts = elementChildren(before.drillIn);
          assert.equal(restingParts.length, 2, "…and the drill-in is TWO parts — the shrinkable words and the pinned glyph");
          assert.match(String(restingParts[0].props?.className ?? ""), /\bmin-w-0\b/, "the WORDS are what give way");
          assert.match(String(restingParts[0].props?.className ?? ""), /\btruncate\b/, "…truncating inside their own box, never over a neighbour");
          assert.equal(textOf(restingParts[0]), WORDS_REST, "…and they are the label's words alone");
          assert.match(String(restingParts[1].props?.className ?? ""), /\bshrink-0\b/, "the `→` glyph is PINNED");
          assert.equal(textOf(before.drillIn), "Open board →", "…so the un-pressed label is byte-identical to what it always read");

          await app.affordance("38").click();
          const card = app.affordance("38").card;
          assert.ok(card, "the clicked card is in the tree");

          const r5 = region5(card);
          assert.ok(r5.target, "region 5 renders the chip's `→ <target>`");
          assert.equal(textOf(r5.target), `→ ${longNode}`, "…naming the node in FULL");

          // ── DG-16 + DG-20: the name is FULL or GONE, and the gate is FIT.
          // `flex-1 truncate` does not drop — it stubs, and a one-to-three-glyph
          // workspace name communicates nothing while spending the row's
          // scarcest resource. A workspace name's PREFIX carries no meaning, so
          // it is the one element never truncated. But the gate may not be mere
          // chip-presence either (DG-20): that would make absence-of-name an
          // accidental second signal for "this card has an assignment", which
          // the chip already states. This fixture's workspace is `demo` — short
          // enough to fit — so it must STILL RENDER beside the chip.
          assert.ok(
            r5.workspaceName,
            "a name that FITS keeps rendering beside the chip — the gate is fit, not the chip's mere presence (DG-20)",
          );
          assert.equal(textOf(r5.workspaceName), "demo", "…and it renders WHOLE — never a stub of itself");
          assert.ok(
            "demo".length <= REGION5_NAME_BUDGET_CH,
            "…which is exactly why: it is inside region 5's derived name budget",
          );

          // ── DG-19: the placeholder `·` leaves once the chip occupies the
          // cluster. `·` stands in for an ABSENT token so the row is not empty;
          // with a chip present the row is not empty, and §2a already says the
          // chip replaces it. Rendering both left a lone `·` floating between
          // the chip and the drill-in, spending width the yield order then had
          // to claw back from higher-priority elements.
          //
          // F-47-04-QA-11 (PROVED VACUOUS, re-pointed here): this used to match
          // a `·` at END OF STRING against the whole cluster's text. The
          // drill-in is always the cluster's LAST child, so the cluster's text
          // always ends in `→` and a re-introduced placeholder could never be at
          // the end — the assertion could not fail. It is now a claim about the
          // ELEMENT rather than about a string's tail: no child of the cluster
          // is the bare `·` placeholder. Element-wise is also the only reading
          // that survives the chip's own `·` separators, which a text scan would
          // have to special-case.
          assert.deepEqual(
            clusterChildren(r5.cluster).filter((child) => textOf(child).trim() === "·").map((child) => child.props?.className ?? ""),
            [],
            `the placeholder \`·\` is gone once the chip speaks — no child of the cluster renders it (cluster text: ${JSON.stringify(textOf(r5.cluster))})`,
          );

          // ── DG-15: `Open board →` is the next to yield, and it really CAN —
          // but it yields to its ABBREVIATED form, never to nothing. The words
          // shrink (their prefix still reads as "Open board", unlike a workspace
          // name's); the `→` glyph is pinned, so the affordance is never
          // invisible. The first cut of this fix let it collapse to zero width,
          // which trades an overprint for a vanished control.
          assert.ok(r5.drillIn, "the drill-in still renders");
          const drillIn = r5.drillIn.props?.className ?? "";
          assert.ok(!/\bshrink-0\b/.test(drillIn), "`Open board →` is NO LONGER pinned — a pinned neighbour is what forced the overprint");
          assert.match(drillIn, /\bshrink-1000\b/, "…absorbing essentially ALL the pressure before anything else moves");
          assert.ok(r5.drillIn.props?.title, "…with its label recoverable in the native `title`");
          // DG-19: and it carries an EXPLICIT floor sized to the arrow — the
          // picker-floor idiom (clause 2) one element to the right. Both
          // alternatives are defects, and both were measured, not reasoned:
          // `min-w-0` let the box shrink to ZERO while its own pinned `→`
          // overflowed it and sat outside the card's content box (the
          // shrink-0-inside-min-w-0 shape that caused DG-15); no min-width at
          // all made `min-width:auto` resolve to the box's FULL content width,
          // so it never yielded and the chip's target truncated instead.
          assert.ok(!/\bmin-w-0\b/.test(drillIn), "…never `min-w-0`: that lets the pinned `→` escape the card's content box");
          assert.match(
            drillIn,
            /\bmin-w-\d/,
            "…it carries an EXPLICIT floor instead — small enough to yield its words, large enough to hold its arrow (DG-19)",
          );

          // …AND THE SAME ELEMENT, ONE CLICK LATER, HAS YIELDED (ADR-014). A
          // 22-character node id needs 24ch and the two-child row's rung-2
          // budget is 12, so the words go WHOLE and the pinned glyph carries the
          // affordance — the drop this lane has always claimed, now reached at
          // the width the row actually has rather than at 31ch, which needed a
          // row 428px wide and no card on this surface is ever that.
          const drillInParts = (r5.drillIn.children ?? []).filter((child) => child && typeof child === "object");
          assert.equal(drillInParts.length, 1, "the drill-in has GIVEN WAY — its words are dropped WHOLE and one child remains");
          const [glyph] = drillInParts;
          assert.match(glyph.props?.className ?? "", /\bshrink-0\b/, "the `→` glyph is PINNED — the abbreviated form the rule asks for");
          assert.equal(textOf(glyph), " →", "…so the affordance survives as `→` when the words cannot fit");
          assert.equal(r5.drillIn.props?.title, WORDS_REST, "…with the words it gave up recoverable in the native `title`");
          assert.equal(
            region5RowLadder({ assignment: { targetNodeId: longNode }, secondary: false }).drillInWords,
            false,
            "…and the ONE ladder answers the same way the tree rendered — the decision is driven, not inferred from a class name",
          );

          // ── The tail — DG-47-7 (2026-08-12) retired it from the row. It was
          // the one occupant here with no degraded-in-place form (DG-19 forbade
          // `· just…`), so its state set was {whole, absent} and its own
          // PRESENCE became a signal for the length of a node id — DG-20's
          // error. It is asserted ABSENT rather than left unmentioned, and its
          // whole string is still in the chip's `title` two assertions below.
          assert.equal(r5.tail, null, "the `· <when> · <note>` tail renders no element at all");
          assert.equal(
            findAll(r5.footer, (node) => /\bshrink-1000000\b/.test(String(node.props?.className ?? ""))).length,
            0,
            "…and the shrink weight it carried left with it — nothing in region 5 is weighted to yield before the drill-in any more",
          );

          // ── The target: still the highest-priority element, but no longer
          // able to overprint. It yields LAST, and inside its own box.
          const target = r5.target.props?.className ?? "";
          assert.ok(
            !/\bshrink-0\b/.test(target),
            "the `→ <target>` is NOT `shrink-0`: that is exactly what let it overflow its `min-w-0` wrapper and paint over its neighbour (DG-15)",
          );
          assert.match(target, /\bmin-w-0\b/, "…it can shrink within its own box");
          assert.match(target, /\btruncate\b/, "…so an id that cannot fit is CLIPPED, never overprinted — no two elements share pixels");

          // The ORDER is the rule, and what survives of it is still readable off
          // the shrink factors: the drill-in (999) yields before the target (1).
          // The target is last precisely because it is the fact the chip exists
          // to say. The tail's own factor is gone with the tail, which is the
          // assertion two above rather than a missing rung here.
          const factor = (className, fallback) => {
            const match = /\bshrink-(\d+)\b/.exec(className);
            return match ? Number(match[1]) : fallback;
          };
          const drillInFactor = factor(drillIn, 1);
          const targetFactor = factor(target, 1);
          assert.ok(
            drillInFactor > targetFactor,
            `the yield order is drill-in > target — got ${drillInFactor} / ${targetFactor}`,
          );

          // …and NOTHING IS LOST: the chip's own `title` carries the whole
          // `→ <target> · <when>` it always did, and after DG-47-7 it is the
          // SOLE carrier of the assignment's age.
          assert.match(
            String(r5.chipText?.props?.title ?? ""),
            new RegExp(`^→ ${longNode} · `),
            "the chip's `title` still reads `→ <target> · <when>` — the tail's retirement changed the geometry, not a character of the copy",
          );
          assert.equal(textOf(r5.chipText), `→ ${longNode}`, "…while the row itself renders the target and nothing after it");
        });
      }, { nodes: [longNode] });
    },
  },

  // ══ DG-19's substance — at maximum pressure the tail DROPS, it does not stub ══
  //
  // The fourth verdict closed DG-19's box and its annihilated-affordance halves
  // and left this one open: the render still showed `· just…` — the LOWEST
  // priority element surviving as an ellipsised fragment — while the drill-in's
  // words, ranked ABOVE it, rendered zero glyphs. Shrink factors, however
  // lopsided, are a squeeze, and a squeeze cannot express a terminal drop. The
  // instrument is the derived budget this surface already uses twice.
  {
    name: "fleet-assign-row-geometry/07 DG-19: at maximum pressure the chip's tail is DROPPED WHOLE, never ellipsised to a fragment — the target keeps the room and nothing partial renders",
    // AMENDED 2026-08-12 by DG-47-7, and it is a STRENGTHENING rather than a
    // loosening: where this lane asserted "the tail drops at MAXIMUM pressure",
    // it now asserts NO ROW RENDERS A TAIL AT ANY BUDGET — over the short target
    // and the long one, the two-child cluster and the three-child one, filtered
    // and unfiltered. Nothing that renders today stops rendering, because
    // ADR-014's own arithmetic already put the tail out of reach at every width
    // (12ch of slot, 10 for `· 18d ago`, 2 for `→ `, and the target outranks
    // it). The designer's ruling makes that structural instead of arithmetical.
    async run() {
      const veryLongNode = "umamis-mac-mini-build-agent-02";
      // NON-VACUITY, from both ends. The budget really is exceeded (so this is
      // still the maximum-pressure frame it was), AND the rung is real: driven
      // with a tail short enough to ride, the ladder's own slot answers that it
      // would have — so "no tail renders" is a fact about the ROW, not about a
      // rung that cannot fire.
      assert.ok(
        `→ ${veryLongNode} · just now`.length > REGION5_CHIP_SLOT_BUDGET_CH,
        "the fixture really does exceed the slot's budget — otherwise this lane proves nothing",
      );
      assert.ok(
        `→ x · 1m`.length <= REGION5_CHIP_SLOT_BUDGET_CH,
        `the slot's budget is a real number a short string could fit inside (${REGION5_CHIP_SLOT_BUDGET_CH}ch) — the tail is retired by DESIGN, not by an unreachable threshold`,
      );

      const rows = [
        { case: "MAXIMUM PRESSURE — a 30-character target, two-child cluster", node: veryLongNode, secondary: false },
        { case: "…and the SHORTEST real target, where the old 41ch budget kept the tail", node: "worker-a", secondary: false },
        { case: "THE THREE-CHILD CLUSTER — a chip AND `◔ 1 in review` on one row", node: "worker-a", secondary: true },
      ];

      for (const row of rows) {
        await withPublishedAssignFixture(async ({ url, workspaceId }) => {
          for (const [view, search] of [["unfiltered", UNFILTERED], ["repo-filtered", filteredTo(workspaceId)]]) {
            await withFleetApp({ url, search, pathname: FLEET }, async (app) => {
              await app.affordance("38").click();
              const r5 = region5(app.affordance("38").card);
              const label = `${row.case} (${view})`;

              assert.equal(
                r5.tail,
                null,
                `${label}: the tail is GONE from the flow — not a \`· just…\` fragment, which is the DG-16 stub defect at a third address`,
              );
              assert.equal(
                textOf(r5.chipText),
                `→ ${row.node}`,
                `${label}: …and the target — the fact the chip exists to say — renders WHOLE in the room the tail gave up`,
              );
              assert.ok(!/…/.test(textOf(r5.chipText)), `${label}: …with nothing ellipsised anywhere in the slot`);
              assert.ok(
                !/·\s*(just now|\d+[smhd] ago|yesterday)/.test(textOf(r5.footer)),
                `${label}: …and NO part of region 5 renders a \`· <when>\` anywhere — got ${JSON.stringify(textOf(r5.footer))}`,
              );
              // Nothing is LOST: the `title` still carries the whole string, the same
              // idiom clause 3 uses for the server sentence, and after DG-47-7 it is
              // the only carrier there is.
              assert.match(
                r5.chipText.props?.title ?? "",
                /· just now/,
                `${label}: the \`when\` is not discarded — the wrapper's native \`title\` still carries the whole \`→ <target> · <when>\``,
              );
              // …and the three-child row really is three, or the row above it is
              // proving the two-child case twice.
              assert.equal(
                clusterChildren(r5.cluster).length,
                row.secondary ? 3 : 2,
                `${label}: the attention cluster really has ${row.secondary ? "THREE" : "TWO"} children`,
              );
            });
          }
        }, { nodes: [row.node], storyStatus: row.secondary ? "in-review" : "not-started" });
      }
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // m47/04 task 00 — THE RELIEF (ADR-008 · DG-47-2)
  // `stories/04_story_assign-row-relief/tasks/00_filtered-row-yield-order.feature`
  // ══════════════════════════════════════════════════════════════════════════

  // ══ scenario 1 — the drop itself, over the three things that decide it ══
  //
  // The unfiltered rows are the CONTROL: they are the behaviour that ships, they
  // must be unchanged, and without them the filtered rows prove only that
  // something drops names. Rows 3 and 4 pin the budget from BOTH sides (a build
  // that changed `>` to `>=` while it was in the expression would pass every other
  // row). Rows 7 and 10 are DG-20's covert signal, caught: the cheapest possible
  // edit — `!!assignment && (filtered || over budget)`, which ADR-008 REJECTS BY
  // NAME — passes every row but those two.
  {
    name: "fleet-assign-row-geometry/47-04 DG-47-2 (Outline): whether region 5 renders the workspace name, repo-FILTERED and unfiltered, either side of the 8-character budget — and the filtered drop is UNCONDITIONAL",
    async run() {
      assert.equal(REGION5_NAME_BUDGET_CH, 8, "the budget this table is written against has not moved");
      const rows = [
        { case: "TODAY, UNCHANGED — a short name fits beside a chip (DG-20's fit gate)", workspace: "demo", assign: true, filtered: false, present: true },
        { case: "TODAY, UNCHANGED — no chip, no pressure, so no drop", workspace: "demo", assign: false, filtered: false, present: true },
        { case: "TODAY, UNCHANGED — the budget's boundary, INCLUSIVE", workspace: "demo-app", assign: true, filtered: false, present: true },
        { case: "TODAY, UNCHANGED — one character past it, dropped whole (DG-16)", workspace: "demo-apps", assign: true, filtered: false, present: false },
        { case: "TODAY, UNCHANGED — a long name with NO chip still renders", workspace: "lark-guard-portal", assign: false, filtered: false, present: true },
        { case: "THE CHANGE — a name that fits is dropped anyway under the filter", workspace: "demo", assign: true, filtered: true, present: false },
        { case: "THE CHANGE, AND THE DG-20 RAIL — no chip on the card, still dropped", workspace: "demo", assign: false, filtered: true, present: false },
        { case: "THE BUDGET IS NOT CONSULTED — the boundary stops mattering", workspace: "demo-app", assign: true, filtered: true, present: false },
        { case: "ALREADY DROPPED, AND STILL DROPPED — the filter adds no new outcome", workspace: "lark-guard-portal", assign: true, filtered: true, present: false },
        { case: "ALREADY DROPPED FOR A NEW REASON — long name, no chip, now absent", workspace: "lark-guard-portal", assign: false, filtered: true, present: false },
      ];
      // The lengths the table's own prose claims, checked rather than trusted.
      for (const [workspace, length] of [["demo", 4], ["demo-app", 8], ["demo-apps", 9], ["lark-guard-portal", 17]]) {
        assert.equal(workspace.length, length, `the fixture name ${JSON.stringify(workspace)} really is ${length} characters`);
      }

      // One fixture per (workspace, chip) pair; each is READ at whichever addresses
      // its rows need, so a filtered/unfiltered pair is the SAME published data.
      const groups = new Map();
      for (const row of rows) {
        const key = `${row.workspace}|${row.assign}`;
        if (!groups.has(key)) groups.set(key, { workspace: row.workspace, assign: row.assign, rows: [] });
        groups.get(key).rows.push(row);
      }

      for (const group of groups.values()) {
        const views = {};
        for (const row of group.rows) {
          if (row.filtered) views.filtered = filteredTo;
          else views.unfiltered = () => UNFILTERED;
        }
        const read = await mintAndRead({ name: group.workspace, node: "worker-a", assign: group.assign, views });

        for (const row of group.rows) {
          const label = `${row.case} [${row.workspace}, ${row.assign ? "chip" : "no chip"}, ${row.filtered ? "filtered" : "unfiltered"}]`;
          const r5 = read[row.filtered ? "filtered" : "unfiltered"].r5;
          // The chip really is (or is not) there — otherwise "dropped beside a chip"
          // and "dropped with none" are the same row wearing two labels.
          assert.equal(
            r5.chipText != null,
            row.assign,
            `${label}: the card's assignment state is what the row says it is`,
          );

          if (row.present) {
            assert.ok(r5.workspaceName, `${label}: the workspace name is PRESENT in region 5`);
            assert.equal(textOf(r5.workspaceName), row.workspace, `${label}: …and it renders WHOLE — never a stub of itself`);
            assert.deepEqual(
              r5.children.map((child) => child.type),
              ["span", "span"],
              `${label}: …so the footer is [name, cluster]`,
            );
          } else {
            assert.equal(r5.workspaceName, null, `${label}: the workspace name is ABSENT from region 5`);
            assert.equal(
              r5.children.length,
              1,
              `${label}: …and the separator that would have followed it leaves with it — the footer's only child is the attention cluster`,
            );
            assertNoFragmentOf(r5.footer, row.workspace);
          }

          // ADR-008 asks that the suite drive the DECISION rather than infer it from
          // a rendered class name. This is that read, beside the rendered fact it
          // must agree with — never instead of it.
          assert.equal(
            region5NameDropped({ assignment: row.assign ? { targetNodeId: "worker-a" } : null, workspaceName: row.workspace, repoFiltered: row.filtered }),
            !row.present,
            `${label}: the ONE predicate answers the same way the tree rendered`,
          );
        }
      }
    },
  },

  // ══ scenario 2 — the absence is a property of the PAGE, not of a card ══
  //
  // DG-20's discharge rests on that, and it is a claim about several cards at once
  // — the one thing a single-card fixture structurally cannot express (BLOCKER
  // F21's own lesson, at a second address).
  {
    name: "fleet-assign-row-geometry/47-04 DG-47-2 + DG-20's discharge: under a repo filter EVERY card on the page reads the same way, and absence-of-name identifies no individual card",
    async run() {
      // `secondaryToken` (F-47-04-QA-10) — the ASSIGNED card's own milestone
      // carries one story `in-review`, so on this page ONE card's attention
      // cluster has THREE children and the other has two. Without it every claim
      // below is taken at one arity, which is the reading the finding is about.
      await withTwoWorkspaceAssignFixture(async ({ url, workspaceIdA, titles }) => {
        const ASSIGNED = titles.A;              // ref 18, workspace A ("control", 7ch — INSIDE the budget)
        const UNASSIGNED = "Control Only";      // ref 31, the same repo, no chip

        await withFleetApp({ url, search: filteredTo(workspaceIdA), pathname: FLEET }, async (app) => {
          const before = app.cards();
          assert.equal(before.length, 2, "the filter leaves this repo's TWO cards — one that can carry a chip and one that will not");

          // A REAL mint by a REAL click, on ONE of the two.
          const affordance = app.cardByTitle(ASSIGNED);
          await affordance.choose("worker-a");
          await affordance.click();
          assert.ok(app.cardByTitle(ASSIGNED).cardText.includes("→ worker-a"), "the chip really minted on that card");

          const cards = app.cards();
          const byTitle = (title) => cards.find((card) => textOf(card).includes(title));
          const assigned = region5(byTitle(ASSIGNED));
          const unassigned = region5(byTitle(UNASSIGNED));

          assert.equal(
            cards.filter((card) => region5(card).workspaceName != null).length,
            0,
            "NO card renders a workspace name — the count of workspace-name elements across the page's cards is zero",
          );
          assert.equal(
            assigned.workspaceName,
            unassigned.workspaceName,
            "the assigned card and the unassigned card are INDISTINGUISHABLE in that respect: absence-of-name identifies neither",
          );
          assert.ok(assigned.chipText, "the assigned card is still the only one carrying an assignment chip…");
          assert.equal(unassigned.chipText, null, "…the chip remains the single, sufficient statement of that fact");

          // THE TWO ARITIES ARE BOTH ON THIS PAGE, which is what makes every
          // claim below a claim about the page rather than about one shape of
          // row (F-47-04-QA-10).
          assert.equal(clusterChildren(assigned.cluster).length, 3, "the assigned card's cluster is the THREE-child one — chip, `◔ 1 in review`, drill-in");
          assert.equal(clusterChildren(unassigned.cluster).length, 2, "…and its neighbour's is the two-child one, on the same page, at the same moment");
          assert.match(textOf(assigned.cluster), /◔ 1 in review/, "…the third child really is the secondary token, rendered whole at this target's length");

          // DG-22, AMENDED 2026-08-12 — FINDING F-47-04-QA-10 (medium), closed
          // here. This Then used to be a match on the `justify-between` TOKEN,
          // and a token means what DG-22 claims only for the arity the reader
          // assumed: with TWO flex items `justify-between` is exactly "the
          // leading group left, the drill-in right", and with THREE it spreads
          // the middle one as well. The clause's own subject is that the
          // footer's LEADING EDGE — "the column the eye scans for what state
          // this card is in" — does not drift card to card, and that is an
          // arity-independent fact about POSITION, so it is asserted as one:
          // the same alignment on every card, the CHIP first in every cluster
          // and the DRILL-IN last. The token is kept beside it, because it is
          // what produces the position and a build that changed it would owe an
          // explanation; it is no longer asked to carry the claim alone.
          const alignments = new Set(cards.map((card) => classTokens(region5(card).cluster).filter((token) => token.startsWith("justify-")).join(" ")));
          assert.equal(alignments.size, 1, `DG-22: every card's cluster takes the SAME alignment, so the footer's leading edge cannot drift card to card — got ${JSON.stringify([...alignments])}`);
          assert.deepEqual([...alignments], ["justify-between"], "…and it is the leading-group alignment, not the `justify-end` the row takes while a name holds the edge");
          for (const card of cards) {
            const r5 = region5(card);
            const children = clusterChildren(r5.cluster);
            assert.ok(children.length >= 2, `DG-22: the cluster really has children to order (${children.length})`);
            assert.equal(children[children.length - 1], r5.drillIn, "DG-22: the drill-in is the LAST child of the cluster — the only element pushed to the trailing edge");
            const leading = children[0];
            assert.notEqual(leading, r5.drillIn, "…and it is not also the first: something else holds the leading edge");
            assert.ok(
              textOf(leading).trim().length > 0,
              `…which is a rendered element rather than an empty box — the leading edge is a fact the eye can find (got ${JSON.stringify(textOf(leading))})`,
            );
          }

          // DG-19: the unassigned card's footer is still a legible ROW, not an empty one.
          assert.match(textOf(unassigned.cluster), /·/, "the UNASSIGNED card still carries the muted `·` placeholder, standing in for the token it has not got");
          assert.ok(unassigned.drillIn, "…and its right-aligned drill-in");
        });

        // THE NON-VACUITY CHECK for the whole scenario: this fixture's workspace name
        // is INSIDE the budget, so if the unfiltered render did not show it the
        // filtered render's absence would be proving nothing at all.
        await withFleetApp({ url, search: UNFILTERED, pathname: FLEET }, async (app) => {
          for (const title of [ASSIGNED, UNASSIGNED]) {
            const card = app.cards().find((candidate) => textOf(candidate).includes(title));
            assert.ok(card, `the unfiltered page still renders the card titled ${JSON.stringify(title)}`);
            const r5 = region5(card);
            assert.ok(r5.workspaceName, `the same page rendered UNFILTERED renders the workspace name on ${JSON.stringify(title)}`);
            assert.equal(textOf(r5.workspaceName), "control", "…in full, because it fits");
          }
        });
      }, { secondaryToken: true });
    },
  },

  // ══ scenario 3 — "byte-identical to today's `nameDropped === true` geometry",
  //    PROVED BY COMPARISON rather than asserted one side at a time ══
  //
  // FINDING F-47-04-QA-1: before this lane, `nameDropped === true` was an
  // UNEXERCISED branch on the rendered tree — every mounting lane ran over the
  // 4-character `demo` workspace and the two region-5 lanes assert the OPPOSITE
  // case on purpose. So the milestone's central equivalence had no lane behind it.
  // Row 3 is what stops rows 1 and 2 being satisfied by a build that never renders
  // a name at all.
  {
    name: "fleet-assign-row-geometry/47-04 ADR-008 (Outline): the repo-FILTERED row and the budget-dropped row are the SAME row — one geometry reached two ways, and the only difference the filter makes is the one it is supposed to make",
    async run() {
      const long = await mintAndRead({ name: "lark-guard-portal", node: "worker-a", views: { unfiltered: () => UNFILTERED, filtered: filteredTo } });
      const short = await mintAndRead({ name: "demo", node: "worker-a", views: { unfiltered: () => UNFILTERED, filtered: filteredTo } });

      // Non-vacuity, both directions: the long name really is dropped by the BUDGET
      // unfiltered, and the short one really is RENDERED unfiltered.
      assert.equal(long.unfiltered.r5.workspaceName, null, "a 17-character name is dropped by its own fit budget, unfiltered");
      assert.ok(short.unfiltered.r5.workspaceName, "…and a 4-character one is not — the control that keeps the rows below non-vacuous");

      // "THE SAME TAIL TREATMENT, ABSENT IN BOTH" (task 00 scenario 3, amended by
      // DG-47-7). The equivalence below would hold just as well if BOTH footers
      // carried a tail, so the amended Then is stated positively here rather than
      // left to the comparison — an equivalence proves sameness, never which of
      // the two states the pair is in.
      for (const [label, read] of [["the budget-dropped row", long], ["the repo-filtered row", short]]) {
        for (const view of ["filtered", "unfiltered"]) {
          assert.equal(read[view].r5.tail, null, `${label} (${view}): no tail element — absent in BOTH, which is what makes the equivalence a statement about the row DG-47-7 leaves`);
        }
      }

      // ROW 1 — one fixture, one dataset, two addresses: there is NO difference.
      assert.deepEqual(
        signature(long.filtered.r5.footer),
        signature(long.unfiltered.r5.footer),
        "THE EQUIVALENCE: for a name already dropped by the budget, the filtered footer and the unfiltered footer are the same element by element — same children in the same order, same alignment, same drill-in split, same tail, same rendered text",
      );

      // ROW 2 — the equivalence ACROSS THE TWO REASONS TO DROP.
      assert.deepEqual(
        signature(short.filtered.r5.footer),
        signature(long.unfiltered.r5.footer),
        "ONE GEOMETRY, REACHED TWO WAYS: a 4-character name dropped by the FILTER renders the same region 5 as a 17-character name dropped by the BUDGET",
      );

      // ROW 3 — THE DELTA, and it is exactly one.
      const rendered = signature(short.unfiltered.r5.footer);
      const dropped = signature(short.filtered.r5.footer);
      assert.equal(rendered.children.length, dropped.children.length + 1, "EXACTLY ONE element differs: render A carries the workspace-name element and render B does not");
      const [nameChild, ...restOfA] = rendered.children;
      assert.match(String(nameChild.className), /\bmono\b/, "…and the element that left is the workspace name, not something else");
      assert.equal(nameChild.children.join(""), "demo", "…carrying the name it rendered");
      assert.match(String(restOfA[0].className), /\bjustify-end\b/, "…the cluster's alignment differs accordingly (DG-22): right-aligned while the name holds the leading edge…");
      assert.match(String(dropped.children[0].className), /\bjustify-between\b/, "…and the LEADING group once the name is gone");
      restOfA[0] = { ...restOfA[0], className: String(restOfA[0].className).replace("justify-end", "justify-between") };
      assert.deepEqual(restOfA, dropped.children, "…and NOTHING else does: with the name removed and the one alignment token normalised, the two footers are identical");
    },
  },

  // ══ scenario 4 — the yield order is NOT touched, and no threshold moved ══
  //
  // This is the half of ADR-008 where nothing is supposed to happen: the filter
  // frees width and the freed width goes where the ladder already sends it. A build
  // that "helped" by loosening a threshold now that there is room would be
  // re-tuning a MEASURED number for an UNMEASURED reason.
  {
    name: "fleet-assign-row-geometry/47-04 DG-47-2 (Outline): under the repo filter the row yields in the stated order — the tail first, then the drill-in's words, then the target LAST — and every threshold answers exactly as it does unfiltered",
    async run() {
      // RUNG 3'S OWN BOUNDARY, PROBED FROM THE LADDER RATHER THAN TYPED. Every
      // other threshold on this row is a `_CH` constant a lane can read back;
      // rung 3's is not, because ADR-014 returns the three-child budgets from the
      // derivation instead of exporting four more literals that could drift. So
      // the two boundary fixtures are FOUND — the shortest target that fires the
      // rung, and the one character before it — which keeps them aimed through
      // any re-derivation AND makes them sensitive to the whole arithmetic rather
      // than to one term. That sensitivity is not decorative: a first cut of this
      // lane used a 10-character target and a 30-character one, and DELETING THE
      // CLUSTER-GAP TERM FROM THE ARITY SUBTRAHEND LEFT IT GREEN — 12px is not
      // enough to move a character boundary unless the fixture sits on one.
      const rung3Boundary = (() => {
        for (let length = 1; length <= 60; length += 1) {
          if (ladderFor({ node: "w".repeat(length), secondary: true }).secondaryAbbreviated) return length;
        }
        throw new Error("rung 3 never fires at any target length — the boundary this table is written against does not exist");
      })();
      assert.ok(rung3Boundary > 1, `rung 3 has a real boundary to sit either side of (the first target that fires it is ${rung3Boundary} characters)`);
      // …AND THE PROBE IS ANCHORED, because a fixture derived from the thing it
      // tests moves WITH it: a probe alone proves the rung fires SOMEWHERE, never
      // that it fires where the measurement put it. This is ADR-014's own table —
      // "three children · secondary abbreviates when `→ <target>` > 13ch" — so the
      // first target that fires it is a 12-character node id. (Measured: without
      // this line, deleting the cluster-gap term from the arity subtrahend moved
      // the threshold to 15ch and the whole table followed it, silently.)
      assert.equal(
        rung3Boundary,
        12,
        `rung 3 fires where ADR-014's derivation puts it — once \`→ <target>\` passes 13ch, i.e. from a 12-character node id (got ${rung3Boundary})`,
      );
      const AT_RUNG3 = "w".repeat(rung3Boundary - 1);
      const PAST_RUNG3 = "w".repeat(rung3Boundary);
      assert.equal(ladderFor({ node: AT_RUNG3, secondary: true }).secondaryAbbreviated, false, "…and the fixture one character short of it really keeps the secondary's words");

      // AMENDED 2026-08-12 (ADR-014 + DG-47-7), and the amendment is monotone in
      // the drop direction — no element that dropped before this renders after
      // it. The abbreviation point moved DOWN, 31 → 12, because 31 was derived
      // from the 360.66px row the card takes at exactly one viewport and needed a
      // row 428px wide; the boundary fixtures move with it, from 29/30 characters
      // to 10/11. The `tail` column is gone rather than re-valued: DG-47-7 retired
      // the element from the row, and the lane above asserts that over every
      // arity and both views.
      // THE SEAM'S TWO FIXTURES ARE SIZED FROM THE CONSTANT, and their absolute
      // lengths are what the feature's Examples quote rather than the reverse
      // (the PO's own instruction at the amendment): the node id AT the seam is
      // the budget minus the `→ ` the target carries, and its twin is one
      // character longer. They spell out to `worker-abc` (10) and `worker-abcd`
      // (11) today, byte-for-byte the table's ids — and if the budget is ever
      // re-derived they move with it and the TABLE is what needs amending, which
      // is the honest direction of travel for a number the ADR derives.
      const seamNodeLength = REGION5_DRILLIN_ABBREV_AT_CH - "→ ".length;
      const AT_SEAM = "worker-abcdefghij".slice(0, seamNodeLength);
      const PAST_SEAM = "worker-abcdefghij".slice(0, seamNodeLength + 1);
      assert.equal(`→ ${AT_SEAM}`.length, REGION5_DRILLIN_ABBREV_AT_CH, "the seam fixture's target is exactly the budget");
      assert.deepEqual([AT_SEAM, PAST_SEAM], ["worker-abc", "worker-abcd"], "…and it spells out to the ids the feature's Examples name (if this line ever fails, the TABLE follows the fixture)");

      const rows = [
        { case: "room for everything — the ordinary row", node: "worker-a", words: true },
        { case: "THE SEAM — `→ <target>` is exactly 12", node: AT_SEAM, words: true },
        { case: "ONE PAST THE SEAM — `→ <target>` is 13, so the words go", node: PAST_SEAM, words: false },
        { case: "FAR PAST THE SEAM, TWO CHILDREN — the shipped DG-19 fixture, 32ch", node: "umamis-mac-mini-build-agent-02", words: false },
        { case: "THE THIRD CHILD — arity ALONE takes the words, from a target that FITS at two children", node: "worker-a", words: false, secondary: true, secondaryWords: true, subtrahend: true },
        { case: `RUNG 3'S BOUNDARY, INCLUSIVE — a ${AT_RUNG3.length}-character target keeps the secondary's words`, node: AT_RUNG3, words: false, secondary: true, secondaryWords: true },
        { case: `RUNG 3, ONE CHARACTER PAST IT — ${PAST_RUNG3.length} characters, and the secondary gives its words up`, node: PAST_RUNG3, words: false, secondary: true, secondaryWords: false },
        { case: "RUNG 3 AT THE ADR'S OWN WORST FRAME — a 30-character target on a three-child row", node: "umamis-mac-mini-build-agent-02", words: false, secondary: true, secondaryWords: false },
      ];

      for (const row of rows) {
        // THE ARITHMETIC IS THE CONTRACT'S OWN, checked against the fixture rather
        // than assumed: the words drop once `→ <target>` alone passes the
        // two-child budget… and row 5 is the one that cannot be read off that
        // budget at all, because ARITY changes the number the rung is compared
        // against. Its expectation is driven from the ladder rather than from a
        // constant, which is the whole of ADR-014 clause 1.
        const targetLength = `→ ${row.node}`.length;
        if (!row.secondary) {
          assert.equal(
            targetLength <= REGION5_DRILLIN_ABBREV_AT_CH,
            row.words,
            `${row.case}: the fixture really sits on the side of the abbreviation point this row claims (\`→ ${row.node}\` is ${targetLength}ch against ${REGION5_DRILLIN_ABBREV_AT_CH})`,
          );
        } else {
          if (row.subtrahend) {
            assert.equal(
              targetLength <= REGION5_DRILLIN_ABBREV_AT_CH,
              true,
              `${row.case}: the SAME target is INSIDE the two-child budget — which is what makes the third child, and nothing about the target, the cause`,
            );
            assert.equal(
              ladderFor({ node: row.node, secondary: false }).drillInWords,
              true,
              "…and the ladder says so: at TWO children this very target keeps the drill-in's words",
            );
          }
          assert.equal(ladderFor({ node: row.node, secondary: true }).slotBudgetCh, 0, `${row.case}: at three children the row's budget is ZERO — 297px reserved against a 286px floor`);
          assert.equal(
            ladderFor({ node: row.node, secondary: true }).secondaryAbbreviated,
            !row.secondaryWords,
            `${row.case}: …and rung 3 fires exactly when the ladder says it does`,
          );
        }
        assert.equal(
          ladderFor({ node: row.node, secondary: row.secondary === true }).drillInWords,
          row.words,
          `${row.case}: the ONE ladder answers what this row claims`,
        );

        const read = await mintAndRead({ name: "demo", node: row.node, secondary: row.secondary === true, views: { filtered: filteredTo, unfiltered: () => UNFILTERED } });

        for (const [view, r5] of [["repo-filtered", read.filtered.r5], ["unfiltered", read.unfiltered.r5]]) {
          const label = `${row.case} (${view})`;
          assert.equal(r5.tail, null, `${label}: the chip's \`· <when>\` tail renders no element (DG-47-7 — retired from the row, kept whole in the chip's \`title\`)`);
          assert.equal(
            clusterChildren(r5.cluster).length,
            row.secondary ? 3 : 2,
            `${label}: the attention cluster has the arity this row is about`,
          );

          // ── RUNG 3, RENDERED (ADR-014's one new rung). The secondary token
          // gives up its WORDS and keeps its glyph AND ITS COUNT — it is never
          // dropped whole, because absence would become a covert signal for
          // "this card's node id is long", which is DG-20's error at a fourth
          // address. Both forms are asserted, and so is the wrap fix: an element
          // on this row renders whole or takes its discrete drop, and one that
          // can WRAP absorbs the squeeze in the one dimension A10 forbids —
          // measured at h=32 against 14.66–22 for every sibling, which is what
          // made region 5 a 45px two-line row at every width.
          if (row.secondary) {
            const token = clusterChildren(r5.cluster)[1];
            assert.equal(
              textOf(token),
              row.secondaryWords ? "◔ 1 in review" : "◔ 1",
              `${label}: the secondary token renders ${row.secondaryWords ? "WHOLE" : "its glyph and its COUNT, its words dropped"}`,
            );
            assert.equal(
              token.props?.title,
              row.secondaryWords ? undefined : "◔ 1 in review",
              `${label}: …with the dropped words in a \`title\` it carries in the ABBREVIATED form alone (a tooltip repeating a readable label is DG-47-5's own named defect)`,
            );
            assert.ok(hasToken(token, "shrink-0"), `${label}: …pinned, in BOTH forms — it may not absorb the squeeze`);
            assert.ok(hasToken(token, "whitespace-pre"), `${label}: …and unable to WRAP, which is the same rule spent on the row's HEIGHT (A10)`);
            assert.ok(textOf(token).startsWith("◔"), `${label}: …the glyph is pinned, so the mark's shape is never itself a signal`);
            assert.match(textOf(token), /◔ 1\b/, `${label}: …and the COUNT survives the drop — it is the fact the token exists to report`);
          } else {
            // The table's own "— (no secondary token)" cell, asserted rather than
            // implied: the cluster is exactly [chip, drill-in] and nothing sits
            // between them. Without this, a two-child row's arity claim rests on a
            // count a stray child could satisfy from the other side.
            const [first, second] = clusterChildren(r5.cluster);
            assert.equal(second, r5.drillIn, `${label}: the cluster's SECOND child is the drill-in itself`);
            assert.ok(findAll(first, (node) => node === r5.chipText).length > 0, `${label}: …and its FIRST is the chip, so there is no secondary token between them`);
          }

          const parts = elementChildren(r5.drillIn);
          assert.equal(parts.length, row.words ? 2 : 1, `${label}: the drill-in renders ${row.words ? "its full words plus the pinned `→`" : "the pinned `→` ALONE, its words in `title`"}`);
          assert.equal(textOf(parts[parts.length - 1]), GLYPH, `${label}: …and the pinned glyph is there either way`);
          if (row.words) assert.equal(textOf(parts[0]), WORDS_REST, `${label}: …with the label's words whole`);
          else assert.equal(r5.drillIn.props?.title, WORDS_REST, `${label}: …with the dropped words recoverable in the native \`title\``);

          assert.equal(textOf(r5.target), `→ ${row.node}`, `${label}: the chip's \`→ <target>\` renders the node id IN FULL, and it is the LAST element to give way`);
          assert.ok(!/…/.test(textOf(r5.footer)), `${label}: nothing anywhere in region 5 has been ellipsised to a fragment`);
          assert.match(
            String(r5.chipText?.props?.title ?? ""),
            new RegExp(`^→ ${row.node} · just now`),
            `${label}: the chip's own \`title\` still carries the whole \`→ <target> · <when>\` — nothing is discarded, only ranked`,
          );
        }

        // …and the two views agreed on all three answers, which is the row's last
        // Then said as a comparison rather than as two separate readings.
        assert.deepEqual(
          [read.filtered.r5.tail != null, elementChildren(read.filtered.r5.drillIn).length, textOf(read.filtered.r5.target)],
          [read.unfiltered.r5.tail != null, elementChildren(read.unfiltered.r5.drillIn).length, textOf(read.unfiltered.r5.target)],
          `${row.case}: the SAME data rendered UNFILTERED yields the SAME three answers — the filter frees width, it does not move a threshold`,
        );
        // …including the new rung's own answer, which is the one an arity change
        // could move without touching any of the three above.
        assert.equal(
          textOf(read.filtered.r5.cluster),
          textOf(read.unfiltered.r5.cluster),
          `${row.case}: …and the cluster reads byte-identically in both views, secondary token and all`,
        );
      }
    },
  },

  // ══ DG-47-7 (RULED 2026-08-12) — THE TAIL'S SOLE SURVIVING CARRIER ══
  //
  // The designer retired the `· <when> · <note>` tail from the row: it was the one
  // occupant with no degraded-in-place form (DG-19 forbade `· just…`), so its state
  // set was {whole, absent} and its own PRESENCE became a signal for the length of a
  // node id — DG-20's error. The ruling's whole compensation is that the chip's
  // native `title` carries the string in full, UNCONDITIONALLY, and this lane is
  // that half. It is routed `@executable` rather than to the render because an
  // attribute's presence and value are exactly what the headless channel CAN see.
  //
  // It is not a restatement of the lanes above. They assert the tail is ABSENT from
  // the flow; a build satisfying them by deleting the whole mono slot, or by making
  // the `title` conditional on the same budget the element used to consult, passes
  // every one of them and loses the assignment's age from the product entirely.
  {
    name: "fleet-assign-row-geometry/47-04 DG-47-7: the chip's `title` carries `→ <target> · <when>` WHOLE on every card, unconditionally — after the tail's retirement it is the sole carrier of the assignment's age",
    async run() {
      const rows = [
        { case: "a target that leaves the row room to spare", node: "worker-a", secondary: false },
        { case: "a target past the abbreviation point", node: "umamis-mac-mini-build-agent-02", secondary: false },
        { case: "the THREE-child cluster, where no rung of the ladder is left unfired", node: "worker-a", secondary: true },
      ];
      for (const row of rows) {
        await withPublishedAssignFixture(async ({ url, workspaceId }) => {
          for (const [view, search] of [["unfiltered", UNFILTERED], ["repo-filtered", filteredTo(workspaceId)]]) {
            await withFleetApp({ url, search, pathname: FLEET }, async (app) => {
              await app.affordance("38").click();
              const r5 = region5(app.affordance("38").card);
              const label = `${row.case} (${view})`;
              const title = String(r5.chipText?.props?.title ?? "");

              assert.match(
                title,
                new RegExp(`^→ ${row.node} · just now$`),
                `${label}: the \`title\` is the WHOLE string — target, separator and age — and it is present whether or not a tail could ever have fitted`,
              );
              // …and it is strictly MORE than the row shows, which is the point of
              // the idiom (the same one DG-13 clause 3 uses for the server sentence).
              assert.ok(
                title.length > textOf(r5.chipText).length,
                `${label}: …carrying more than the row renders (${JSON.stringify(title)} vs ${JSON.stringify(textOf(r5.chipText))})`,
              );
              assert.ok(
                !textOf(r5.footer).includes("just now"),
                `${label}: …and the age is nowhere in region 5's rendered text, so the \`title\` really is its only carrier`,
              );
            });
          }
        }, { nodes: [row.node], storyStatus: row.secondary ? "in-review" : "not-started" });
      }
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // m47/04 task 01 — THE DRILL-IN'S TWO NON-REST STATES (DG-47-5 · ADR-008)
  // `stories/04_story_assign-row-relief/tasks/01_drill-in-unavailable-treatment.feature`
  // ══════════════════════════════════════════════════════════════════════════

  // ══ scenario 1 — the two inversions, killed in one table ══
  //
  // Today's build fails rows 6 and 9 on the WORDS (the abbreviation gate was
  // `abbreviateDrillIn && !opening && !openError`, so the two states that render the
  // LONGEST strings kept them at every width) and rows 4-9 on the GLYPH (it was
  // rendered only at rest). Row 9 is the cell the whole gap is about: at the
  // abbreviated width a failed drill-in that drops both renders NOTHING AT ALL.
  {
    name: "fleet-assign-row-geometry/47-04 DG-47-5 (Outline): the drill-in's NON-REST states keep the abbreviation ladder and the pinned glyph — words and `→` in each of the three states, either side of the abbreviation point",
    async run() {
      // AMENDED 2026-08-12 (ADR-014): the abbreviation point is DERIVED rather
      // than picked, and it moved DOWN 31 → 12 — so the two boundary fixtures
      // move with it, 29/30 characters → 10/11. The rows' CLAIMS are untouched:
      // one fixture exactly AT the point (words survive), one exactly one
      // character past (words go), asserted in all three states. They are sized
      // FROM the constant rather than to a literal, so the next re-derivation
      // re-aims them without an edit here.
      assert.equal(REGION5_DRILLIN_ABBREV_AT_CH, 12, "the abbreviation point this table is written against is ADR-014's derived 12");
      const AT_POINT = "w".repeat(REGION5_DRILLIN_ABBREV_AT_CH - 2);      // `→ ` + 10 = 12, INCLUSIVE
      const PAST_POINT = "w".repeat(REGION5_DRILLIN_ABBREV_AT_CH - 1);    // `→ ` + 11 = 13, past it
      assert.equal(`→ ${AT_POINT}`.length, REGION5_DRILLIN_ABBREV_AT_CH, "the boundary fixture sits exactly AT the abbreviation point");
      assert.equal(`→ ${PAST_POINT}`.length, REGION5_DRILLIN_ABBREV_AT_CH + 1, "…and its twin exactly one character past it");

      const producers = [
        { target: "worker-a (8 characters)", node: "worker-a", assign: true, words: true },
        { target: `a ${AT_POINT.length}-character node id — the abbreviation point, INCLUSIVE`, node: AT_POINT, assign: true, words: true },
        { target: `a ${PAST_POINT.length}-character node id — one past it`, node: PAST_POINT, assign: true, words: false },
        { target: "a 30-character node id — far past it (the shipped DG-19 fixture)", node: "umamis-mac-mini-build-agent-02", assign: true, words: false },
        { target: "no assignment — no chip, no pressure, so no abbreviation in ANY state", node: null, assign: false, words: true },
      ];
      const expectedWords = { rest: WORDS_REST, inFlight: WORDS_IN_FLIGHT, failed: WORDS_FAILED };

      for (const producer of producers) {
        const states = await threeDrillInStates({ node: producer.node ?? "worker-a", assign: producer.assign });
        for (const state of ["rest", "inFlight", "failed"]) {
          const label = `${producer.target} · ${state}`;
          const span = states[state].r5.drillIn;
          assert.ok(span, `${label}: region 5 renders its drill-in`);
          const parts = elementChildren(span);

          if (producer.words) {
            assert.equal(parts.length, 2, `${label}: its words are PRESENT, beside the pinned glyph`);
            assert.equal(
              textOf(parts[0]),
              expectedWords[state],
              `${label}: …and whatever words it renders it renders WHOLE — never a prefix, a stub or an ellipsised fragment`,
            );
            assert.match(String(parts[0].props?.className ?? ""), /\bmin-w-0\b/, `${label}: …the WORDS are what give way, inside their own box`);
            assert.match(String(parts[0].props?.className ?? ""), /\btruncate\b/, `${label}: …truncating inside it, never over a neighbour`);
          } else {
            assert.equal(
              parts.length,
              1,
              `${label}: when the words are dropped they are dropped WHOLE — the drill-in has exactly ONE child`,
            );
            assert.equal(span.props?.title, expectedWords[state], `${label}: …with the dropped words recoverable in the native \`title\``);
          }

          const glyph = parts[parts.length - 1];
          assert.equal(textOf(glyph), GLYPH, `${label}: its pinned \`→\` is PRESENT, and its text is byte-identical in every state — one glyph, three states, three treatments`);
          assert.match(String(glyph.props?.className ?? ""), /\bshrink-0\b/, `${label}: …and the glyph itself is the pinned child`);

          // Clause 1's structural half — the floor is what keeps the arrow inside
          // the card's content box, and it may not be dropped by whichever branch
          // now renders the class list.
          assert.match(String(span.props?.className ?? ""), /\bshrink-1000\b/, `${label}: the element still carries its shrink weight in this state`);
          assert.match(String(span.props?.className ?? ""), /\bmin-w-\d/, `${label}: …and its EXPLICIT minimum-width floor`);
          assert.ok(!hasToken(span, "shrink-0"), `${label}: …and carries neither \`shrink-0\`…`);
          assert.ok(!hasToken(span, "min-w-0"), `${label}: …nor \`min-w-0\` itself`);
        }
      }
    },
  },

  // ══ scenario 2 — three treatments, and the failed one buys its mark with
  //    HEIGHT rather than WIDTH ══
  //
  // Region 5's horizontal width is the resource DG-13…DG-22 fought over; a dashed
  // BOX, a ring or a scrap of padding would buy the "absent" reading with the exact
  // currency ADR-008 forbids spending — and would do it invisibly, because no budget
  // would move and no lane would notice.
  {
    name: "fleet-assign-row-geometry/47-04 DG-47-5 clauses 2+3: the drill-in's three NON-REST-and-rest states take three treatments, and the failed one buys its absent mark with height rather than width",
    // AMENDED 2026-08-12 — FINDING F-47-04-QA-9 (major), closed here. Every claim
    // below used to be laned in the UNABBREVIATED form ALONE, and three mutations
    // stayed green at 38/38 because of it — including one in which THE ABBREVIATED
    // FAILED DRILL-IN RENDERED IDENTICALLY TO A HEALTHY ONE, which is the exact
    // cell DG-47-5 clause 2 exists for: at the abbreviated width the tone and the
    // rule beneath are ALL there is, so a treatment keyed to the form would be
    // invisible to a lane that never renders that form.
    //
    // So the whole table runs in BOTH forms. Form 2 is deliberately also a
    // THREE-child cluster (ADR-014's own worst frame — a chip, `◔ 1 in review`
    // and the drill-in on one row): the two dimensions are exercised together
    // because NEITHER may change this element's treatment, and if either does,
    // form 2 goes red and says which state it went red in.
    async run() {
      const forms = [
        { form: "UNABBREVIATED — the words render beside the glyph", node: "worker-a", secondary: false, words: true },
        { form: "ABBREVIATED, THREE-CHILD — the glyph and its tone are ALL there is", node: "umamis-mac-mini-build-agent-02", secondary: true, words: false },
      ];
      for (const shape of forms) {
      const states = await threeDrillInStates({ node: shape.node, secondary: shape.secondary });
      // THE FORM'S OWN NON-VACUITY, in every state: without it "the abbreviated
      // form takes the same treatment" could be satisfied by a build that never
      // abbreviates, which is precisely the state this suite shipped for a day.
      for (const state of ["rest", "inFlight", "failed"]) {
        assert.equal(
          elementChildren(states[state].r5.drillIn).length,
          shape.words ? 2 : 1,
          `${shape.form} [${state}]: the fixture really renders the form this table claims`,
        );
        assert.equal(
          clusterChildren(states[state].r5.cluster).length,
          shape.secondary ? 3 : 2,
          `${shape.form} [${state}]: …and the cluster really has the arity it claims`,
        );
      }
      const rows = [
        { case: "TODAY, UNCHANGED — at rest is the live-action token", state: "rest", primary: true, pulse: false, dashed: false },
        { case: "THE CHANGE (F-47-04-QA-4) — in flight is the product's one motion", state: "inFlight", primary: true, pulse: true, dashed: false },
        { case: "THE CHANGE, AND THE HEART OF DG-47-5 — failed is the house absent mark", state: "failed", primary: false, pulse: false, dashed: true },
      ];

      for (const row of rows) {
        const span = states[row.state].r5.drillIn;
        const label = `${shape.form} · ${row.case} [${row.state}]`;
        const tokens = classTokens(span);

        // TONE. Row 1 is the NON-VACUITY CHECK for rows 2 and 3: without it, "the
        // failed state is not `primary`" would be satisfied by a build that made the
        // whole drill-in muted in every state — DG-47-5 inverted.
        assert.equal(tokens.includes("text-primary"), row.primary, `${label}: its tone is ${row.primary ? "the `primary` token" : "NOT `primary`"}`);
        assert.equal(tokens.includes("text-muted-foreground"), !row.primary, `${label}: …and ${row.primary ? "not muted" : "IS the `muted-foreground` token"}`);
        assert.ok(tokens.includes("font-semibold"), `${label}: …semibold in every state, as it always was`);

        // THE RULE BENEATH, and the hover pair. Both halves of row 3's hover cell
        // are load-bearing: a build that adds `group-hover:border-solid` and leaves
        // `group-hover:underline` in place paints TWO horizontal lines under one
        // element — the defect clause 3 names, produced by the cheapest edit.
        assert.equal(tokens.includes("border-b"), row.dashed, `${label}: what sits beneath it is ${row.dashed ? "a dashed bottom rule" : "nothing"}`);
        assert.equal(tokens.includes("border-dashed"), row.dashed, `${label}: …dashed, in the muted ramp`);
        assert.equal(tokens.includes("border-muted-foreground/40"), row.dashed, `${label}: …at the house absent primitive's own weight`);
        assert.equal(tokens.includes("group-hover:underline"), !row.dashed, `${label}: its hover treatment ${row.dashed ? "DROPS the underline" : "is the underline it has today"}`);
        assert.equal(tokens.includes("group-hover:border-solid"), row.dashed, `${label}: …and ${row.dashed ? "the dashed rule becomes SOLID — one line, never two" : "adds no second rule"}`);

        // MOTION — the one cell a designer's correction can strike without touching
        // anything else in this contract.
        assert.equal(tokens.includes("animate-pulse"), row.pulse, `${label}: ${row.pulse ? "in flight carries the product's motion token" : "nothing but the in-flight state carries motion"}`);

        // THE THINGS NO STATE MAY DO.
        assert.ok(!tokens.some((token) => token.includes("destructive")), `${label}: in NO state does it carry a \`destructive\` token — a board that did not resolve is ABSENT, not broken`);
        assert.ok(!tokens.some((token) => token.includes("accent")), `${label}: in NO state does it carry an \`accent\` token — this state is asking for no attention colour`);
        assert.ok(!tokens.some((token) => /^p[xlr]?-/.test(token)), `${label}: …and gains no horizontal padding — the mark costs height, never width`);
        assert.ok(!tokens.some((token) => /^ring(-|$)/.test(token)), `${label}: …no ring`);
        assert.ok(
          !tokens.some((token) => token === "border" || /^border-[tlrxy]$/.test(token)),
          `${label}: …and no border on any edge but the bottom (got ${JSON.stringify(tokens)})`,
        );
      }

      // THE LAST THEN IS WHAT KEEPS THIS A TREATMENT CHANGE. If reaching the failed
      // treatment adds, removes or reorders an element in region 5, the row's yield
      // order has been re-opened by a styling ruling — which is what ADR-008 refuses.
      const frameOf = (state) => signature(states[state].r5.footer);
      // THE WORDS ARE A FOURTH DIFFERENCE, and the Then names only three (tone, rule,
      // accessible name). DESIGN §DG-47-5's own states table gives each state its own
      // words — `Open board` / `Opening board...` / `Open failed` — and the sibling lane
      // above asserts exactly that, so a strip that compared rendered text would put two
      // lanes of this suite in contradiction. The clause's INTENT is stated twice in its
      // own comment and is unambiguous: no element added, removed or reordered. So the
      // state-varying words are normalised to one sentinel and everything else is
      // compared literally — including the ` →`, which keeps a words↔glyph REORDER
      // detectable. Flagged for retro in STATE §Feedback; the feature's Then is corrected
      // to name the words rather than the lane being quietly widened.
      const STATE_WORDS = new Set(["Open board", "Opening board...", "Open failed"]);
      const strip = (node) => {
        if (typeof node === "string") return STATE_WORDS.has(node) ? "<the state's own words>" : node;
        if (typeof node !== "object" || node === null) return node;
        return { ...node, className: null, title: null, children: node.children.map(strip) };
      };
      assert.deepEqual(strip(frameOf("failed")), strip(frameOf("rest")), `${shape.form}: the element's children, their order and their identities are the SAME in the failed state as at rest: only the tone, the rule and the accessible name differ`);
      assert.deepEqual(strip(frameOf("inFlight")), strip(frameOf("rest")), `${shape.form}: …and the same in flight`);
      }
    },
  },

  // ══ scenario 3 — marked ABSENT, never DISABLED. The second click is the retry ══
  //
  // This is the deliberate departure from the nav treatment m45 fixed: the nav's
  // unavailable item has no destination at all; this one has a destination that did
  // not resolve THIS TIME. A build that emits `aria-disabled="true"` while still
  // firing its handler passes every one of 47/01's behavioural Thens and breaks
  // clause 4 outright — and the a11y lane is OFF, so nothing else would catch it.
  {
    name: "fleet-assign-row-geometry/47-04 DG-47-5 clause 4: the failed drill-in is marked ABSENT, never disabled — no `aria-disabled` in any state, and one card's failure is one card's",
    async run() {
      await withTwoWorkspaceAssignFixture(async ({ url, titles }) => {
        // The fixture's own `Published Elsewhere` card: a REAL publish followed by a
        // REAL `rm -rf`, so ADR-011's probe refuses it 409 `workspace-not-local`.
        const FAILING = "Published Elsewhere";

        await withFleetApp({ url, search: UNFILTERED, pathname: FLEET }, async (app) => {
          const assertLiveControl = (state) => {
            const drill = app.drillInByTitle(FAILING);
            assert.ok(drill, `${state}: the control is addressable`);
            assert.equal(drill.button.props?.["aria-disabled"], undefined, `${state}: it carries NO \`aria-disabled\` — the attribute is not emitted at all`);
            assert.notEqual(drill.button.props?.disabled, true, `${state}: …and no \`disabled\` property either — the failed state changes the mark, never the affordance`);
            assert.equal(typeof drill.button.props?.onClick, "function", `${state}: …it still carries its activation handler`);
            assert.equal(drill.button.type, "button", `${state}: …and it is the SAME element it was at rest: same node type`);
            return drill;
          };

          const atRest = assertLiveControl("at rest");
          const restPosition = elementChildren(region5(app.cards().find((card) => textOf(card).includes(FAILING))).footer).indexOf(region5(app.cards().find((card) => textOf(card).includes(FAILING))).cluster);

          const held = app.holdNext(RESOLVER);
          const pending = atRest.clickDetached();
          await app.renderOnly();
          assertLiveControl("in flight");
          await held.answered();
          held.release();
          await pending.settle();

          const failed = assertLiveControl("failed");
          assert.equal(failed.r5, undefined, "…(the accessor exposes the control, not the region — read the region off the card)");
          const failedCard = app.cards().find((card) => textOf(card).includes(FAILING));
          const r5 = region5(failedCard);
          assert.match(String(r5.drillIn?.props?.className ?? ""), /\bborder-dashed\b/, "the card really is in the failed state — it took the dashed absent mark");
          assert.equal(
            elementChildren(r5.footer).indexOf(r5.cluster),
            restPosition,
            "…and the control is in the SAME position in region 5 it was at rest — same identity, same place",
          );

          // ONE CARD'S FAILURE IS ONE CARD'S.
          for (const card of app.cards()) {
            if (textOf(card).includes(FAILING)) continue;
            const sibling = region5(card).drillIn;
            assert.ok(!hasToken(sibling, "border-dashed"), `no sibling card's drill-in has taken any part of this treatment (card: ${JSON.stringify(textOf(card).slice(0, 32))})`);
            assert.ok(hasToken(sibling, "text-primary"), "…they are all still the live-action token");
          }
          assert.ok(app.cards().length >= 3, `there really were sibling cards to compare against (${app.cards().length})`);
          assert.ok(titles.A, "…including the fixture's own collision pair");
        });
      });
    },
  },

  // ══ scenario 4 — the accessible name names the REMEDY ══
  //
  // Today's `title` was the visible label repeated: a tooltip that tells the
  // operator what they can already read and names no command. `title="Open failed"`
  // passes any test that only asks whether a title exists — so the clause that kills
  // it is "NOT the visible label repeated", and this lane reads the name and the
  // label together rather than in two lanes.
  {
    name: "fleet-assign-row-geometry/47-04 DG-47-5 clause 5 (Outline): the drill-in's accessible name is the CONTROL's, in two channels that cannot drift, and the failed one names the remedy rather than restating the words",
    async run() {
      const named = await threeDrillInStates({ node: "worker-a", name: "demo" });
      const abbreviated = await threeDrillInStates({ node: "umamis-mac-mini-build-agent-02", name: "demo" });
      const nameless = await threeDrillInStates({ assign: false, name: null });

      const nameOf = (capture, state) => {
        const button = capture[state].button;
        const title = button.props?.title ?? null;
        const aria = button.props?.["aria-label"] ?? null;
        assert.equal(
          typeof aria,
          "string",
          `[${state}] the accessible name is read off the control an operator actually activates — the <button>, never the decorative span`,
        );
        assert.equal(aria, title, `[${state}] \`title\` and \`aria-label\` carry the SAME string — one name, two channels, never two spellings of one fact`);
        // ARIA prohibits naming a generic element, so the span must carry none.
        assert.equal(
          capture[state].r5.drillIn?.props?.["aria-label"],
          undefined,
          `[${state}] …and the drill-in <span> carries NO \`aria-label\`: an ignored attribute that looks correct is worse than an absent one`,
        );
        return aria;
      };

      // ROWS 1 + 2 — TODAY, UNCHANGED. In flight is not a failure and does not read
      // as one.
      assert.equal(nameOf(named, "rest"), "Open board for demo", "at rest the name is the affordance and the repo, exactly as it does today");
      assert.equal(nameOf(named, "inFlight"), nameOf(named, "rest"), "in flight it is UNCHANGED from the at-rest name");

      // ROW 3 — THE CHANGE.
      const failed = nameOf(named, "failed");
      assert.match(failed, /Could not open a board/, "the failed name states that a board could NOT be opened");
      assert.match(failed, /\bdemo\b/, "…names the repo by that name");
      assert.ok(failed.includes("aof work ui"), "…and names the remedy command `aof work ui` VERBATIM — a command is a fact of the system, not a phrase");
      assert.notEqual(failed, WORDS_FAILED, "…and it is NOT the visible label repeated");
      assert.ok(!failed.startsWith(WORDS_FAILED), "…not even as a prefix of it");
      assert.equal(named.failed.r5.drillIn?.props?.title, WORDS_FAILED, "the span meanwhile KEEPS its state-varying `title` — recovering the words the abbreviation drops is DG-19's own idiom, and a different job from naming the control");

      // …and the name does not depend on whether the words were abbreviated: the
      // ABBREVIATED failed drill-in, whose only visible glyph is `→`, carries
      // exactly the same name as the unabbreviated one.
      assert.equal(elementChildren(abbreviated.failed.r5.drillIn).length, 1, "the abbreviated failed drill-in really renders its glyph ALONE");
      assert.equal(nameOf(abbreviated, "failed"), failed, "…and carries exactly the same accessible name as the unabbreviated one");

      // ROW 4 — THE FALLBACK. A remedy that names an empty repo is a remedy that
      // names nothing, so the sentence takes the workspace id where the name would
      // be. Produced through the REAL publish path (a config carrying no `name`),
      // never a hand-built row.
      const fallback = nameOf(nameless, "failed");
      assert.match(nameless.workspaceId, /^[0-9a-f]{16}$/, "the nameless fixture really published a workspace identified only by its id");
      assert.equal(
        fallback,
        failed.replace("demo", nameless.workspaceId),
        "the SAME sentence, naming the workspace id where the name would be — the fact is identifiable either way",
      );
    },
  },

  // ══ scenario 5 — the treatment is a property of the ELEMENT, not of the VIEW ══
  //
  // The intersection nobody else renders: the WIDEST state of the drill-in, on the
  // row that just gave up its name column. It is written as an EQUIVALENCE so it is
  // green whether or not the filtered drop has landed — if a build ever keys the
  // treatment, the abbreviation or the name to the view, this is what says so.
  {
    name: "fleet-assign-row-geometry/47-04 DG-47-5 + ADR-008: the drill-in's treatment is a property of the element, not of the view — a repo-FILTERED row reads its failed, abbreviated drill-in exactly as an unfiltered one does",
    async run() {
      const node = "umamis-mac-mini-build-agent-02";
      const seen = {};
      await withPublishedAssignFixture(async ({ url, root, workspaceId }) => {
        const failAndRead = async (label, search) => {
          await withFleetApp({ url, search, pathname: FLEET }, async (app) => {
            const cards = app.cards();
            assert.equal(cards.length, 1, `${label}: the card is on the page`);
            if (label === "unfiltered") {
              await app.affordance("38").click();
              assert.ok(app.affordance("38").cardText.includes(`→ ${node}`), "the chip really minted");
              await rm(root, { recursive: true, force: true });
            }
            await app.drillInIn(app.cards()[0]).click();
            const card = app.cards()[0];
            seen[label] = { r5: region5(card), button: app.drillInIn(card).button };
            assert.equal(seen[label].r5.drillIn?.props?.title, WORDS_FAILED, `${label}: the drill-in really is in the FAILED state`);
            assert.deepEqual(app.navigations(), [], `${label}: …and nothing navigated`);
          });
        };
        await failAndRead("unfiltered", UNFILTERED);
        await failAndRead("filtered", filteredTo(workspaceId));
        // The filter really did what the other task's lanes say it does — otherwise
        // this equivalence is being taken over two renders of the same view.
        assert.ok(seen.unfiltered.r5.workspaceName, "the unfiltered row still carries its (short) workspace name…");
        assert.equal(seen.filtered.r5.workspaceName, null, "…and the filtered one does not: the two renders really are the two views");
      }, { nodes: [node], name: "demo" });

      assert.deepEqual(
        signature(seen.filtered.r5.drillIn),
        signature(seen.unfiltered.r5.drillIn),
        "the two drill-ins are IDENTICAL: the same children in the same order, the same tone, the same rule beneath, the same pinned glyph and the same abbreviation decision",
      );
      assert.equal(
        seen.filtered.button.props?.["aria-label"],
        seen.unfiltered.button.props?.["aria-label"],
        "…and the same accessible name",
      );

      // The filtered row's YIELD ORDER is unchanged by the failure.
      assert.equal(seen.filtered.r5.tail, null, "the chip's tail renders no element (DG-47-7), so nothing below the drill-in's words is occupying the row");
      assert.equal(elementChildren(seen.filtered.r5.drillIn).length, 1, "…the drill-in's words are gone, on the same gate as ever");
      assert.equal(textOf(seen.filtered.r5.target), `→ ${node}`, "…and the chip's `→ <target>` still renders IN FULL and still yields LAST");
      for (const view of ["filtered", "unfiltered"]) {
        assert.ok(!/…/.test(textOf(seen[view].r5.footer)), `nothing in region 5 has been ellipsised to a fragment in the ${view} render`);
      }
      assert.deepEqual(
        [REGION5_NAME_BUDGET_CH, REGION5_CHIP_SLOT_BUDGET_CH, REGION5_DRILLIN_ABBREV_AT_CH],
        [8, 12, 12],
        "reading the three region-5 budgets back from the module that exports them gives the same three numbers in both renders — the failure consulted no threshold of its own and relaxed none (ADR-014 re-derived the last two from the grid's own floor and both moved DOWN, 41 → 12 and 31 → 12)",
      );
    },
  },

  // ══ scenario 6's prerequisite clause — F-47-04-QA-3, wearing a Then ══
  //
  // It is the one prerequisite that fails SILENTLY in the direction of a FALSE
  // GREEN: both harnesses addressed the drill-in by a property this change removes,
  // and `""` is what an assertion about an ABSENT label is most likely to be
  // compared against. This lane asserts BOTH halves — that the two old identities
  // really are gone in the failed state (non-vacuity), and that the element is still
  // addressable in all three states through one that no clause removes.
  {
    name: "fleet-assign-row-geometry/47-04 F-47-04-QA-3: the drill-in stays ADDRESSABLE in all three of its states through an identity no clause of DG-47-5 removes — not the hover class clause 3 drops, and not the `title` clause 5 rewrites",
    async run() {
      const states = await threeDrillInStates({ node: "worker-a", name: "demo" });

      // NON-VACUITY: the two identities the harness used to address it by are REALLY
      // gone in the failed state. Without this the lane below could pass against a
      // build that never took the treatment at all.
      assert.ok(
        !hasToken(states.failed.r5.drillIn, "group-hover:underline"),
        "clause 3 really drops the hover underline in the failed state — the class `drillInIn()` used to find the label span by",
      );
      assert.ok(
        !String(states.failed.button.props?.title ?? "").startsWith("Open board for "),
        "clause 5 really rewrites the button's `title` in the failed state — the prefix `drillIns()` used to match on",
      );

      for (const state of ["rest", "inFlight", "failed"]) {
        const span = states[state].r5.drillIn;
        assert.match(String(span?.props?.className ?? ""), /\bshrink-1000\b/, `[${state}] the surviving identity: the element carrying \`shrink-1000\`…`);
        assert.match(String(span?.props?.className ?? ""), /\bmin-w-\d/, `[${state}] …and its explicit floor, both of which ADR-008 forbids relaxing`);
        assert.ok(states[state].drill, `[${state}] the harness finds the control through it`);
        assert.ok(
          states[state].label.length > 0,
          `[${state}] …and reads a NON-EMPTY label off it — \`""\` is the false green this finding exists to stop (got ${JSON.stringify(states[state].label)})`,
        );
        assert.equal(states[state].button.type, "button", `[${state}] …and the control it hands back is the button that contains that span`);
      }

      // The words an operator reads are still there, whole, inside whatever the
      // element renders — the fact 47/01's lanes are about.
      assert.ok(states.rest.label.includes(WORDS_REST), `at rest the label still reads ${JSON.stringify(WORDS_REST)} (got ${JSON.stringify(states.rest.label)})`);
      assert.ok(states.inFlight.label.includes(WORDS_IN_FLIGHT), `in flight it still reads ${JSON.stringify(WORDS_IN_FLIGHT)} (got ${JSON.stringify(states.inFlight.label)})`);
      assert.ok(states.failed.label.includes(WORDS_FAILED), `failed it still reads ${JSON.stringify(WORDS_FAILED)} (got ${JSON.stringify(states.failed.label)})`);
    },
  },

  // ══ THE REGRESSION HALF, for BOTH task features (00 scenario 5, 01 scenario 6) ══
  //
  // SPEC and STORY name the same single forbidden outcome: a silent divergence
  // between the render and the suite. That deserves a Then, not a hope — and one an
  // outsider can confirm without a diff. The budgets are READ BACK rather than
  // inspected: a filtered row that fits because someone raised 41 to 48 would look
  // exactly like a filtered row that fits because the name left.
  {
    name: "fleet-assign-row-geometry/47-04 ADR-008: the geometry contract GAINS lanes and loses none, and no budget moved to collect the freed width",
    async run() {
      const names = fleetAssignRowGeometryTests.map((test) => test.name);
      assert.equal(new Set(names).size, names.length, "every lane in this suite is uniquely named");
      assert.equal(LANES_BEFORE_47_04.length, 11, "the suite stood at ELEVEN lanes before this change, of which two asserted on region 5");
      const lost = LANES_BEFORE_47_04.filter((lane) => !names.includes(lane));
      assert.deepEqual(lost, [], `every lane name that existed before still exists — none was renamed or removed: ${lost.join(" | ")}`);
      assert.ok(names.length > LANES_BEFORE_47_04.length, `the suite has GAINED lanes (${LANES_BEFORE_47_04.length} → ${names.length}) — the amendment is visible in the run, not only in the file`);

      // …and the gained lanes SAY what they are about, which is what makes "the
      // amendment is visible in the run" checkable rather than decorative.
      const gained = names.filter((lane) => !LANES_BEFORE_47_04.includes(lane));
      assert.ok(
        gained.some((lane) => /repo-FILTERED|repo filter/.test(lane)),
        `at least one new lane's name says it is about the FILTERED row: ${gained.join(" | ")}`,
      );
      assert.ok(
        gained.some((lane) => /NON-REST/.test(lane)),
        `…and at least one says it is about the drill-in's NON-REST states: ${gained.join(" | ")}`,
      );

      // THE BUDGETS, READ BACK from the module that exports them. "No budget is
      // relaxed" is ADR-008's own wording, and this is the one clause that would go
      // quietly wrong.
      //
      // AMENDED 2026-08-12 by ADR-014, and the amendment is the ratchet DOING ITS
      // JOB rather than being loosened: 41 and 31 were derived from the 360.66px
      // row this card takes at exactly one viewport — 41ch needs a row of 428px and
      // no card on this surface is ever that wide, so the constant was never
      // satisfiable. Both are now the FORMULA's outputs against the grid's own
      // floor and both moved DOWN. Every direction of travel here is a TIGHTENING;
      // the thing this lane exists to stop — a budget RAISED so a filtered row fits
      // — is asserted below, on the derivation rather than on the number.
      assert.equal(REGION5_NAME_BUDGET_CH, 8, "the region-5 name budget is still 8 — ADR-014 does not move it");
      assert.equal(REGION5_CHIP_SLOT_BUDGET_CH, 12, "…the chip slot is ADR-014's derived 12 (was 41, a number the row could never satisfy)");
      assert.equal(REGION5_DRILLIN_ABBREV_AT_CH, 12, "…and the drill-in abbreviation point likewise 12 (was 31)");
      assert.ok(
        REGION5_CHIP_SLOT_BUDGET_CH <= 41 && REGION5_DRILLIN_ABBREV_AT_CH <= 31 && REGION5_NAME_BUDGET_CH <= 8,
        "…and every one of the three is at or BELOW the number it carried before this milestone: no budget was relaxed to collect the width the filter frees",
      );

      // …AND THE FOUR BUDGETS THAT ARE *NOT* CONSTANTS. ADR-014 returns the
      // three-child budgets and the target's own from the derivation rather than
      // exporting four more literals, "because they are one derivation and four
      // constants could drift apart" — which leaves them with no read-back handle
      // unless one is made here. This is the ADR's own output table, and it is
      // where a change to the ARITHMETIC (as opposed to a change to a constant)
      // has to show up.
      const budgetsOf = (node, secondary) => {
        const answer = ladderFor({ node, secondary });
        return [answer.slotBudgetCh, answer.targetBudgetCh];
      };
      assert.deepEqual(
        {
          "two children, everything whole": budgetsOf("worker-a", false),
          "two children, words dropped": budgetsOf("umamis-mac-mini-build-agent-02", false),
          "three children, secondary whole": budgetsOf("worker-a", true),
          "three children, secondary abbreviated": budgetsOf("umamis-mac-mini-build-agent-02", true),
        },
        {
          // [the slot the rungs fire on, the target's own budget in the final state]
          "two children, everything whole": [12, 12],
          "two children, words dropped": [12, 28],
          "three children, secondary whole": [0, 13],
          "three children, secondary abbreviated": [0, 20],
        },
        "ADR-014's derivation still yields ADR-014's numbers: 12ch of slot at two children and ZERO at three (297px reserved against a 286px floor), 28ch for the target once the drill-in's words go, and 20ch once the secondary's do",
      );

      // ── GATE B (ADR-014, routed here rather than to a fifth arch file) ────────
      //
      // `REGION5_ROW_FLOOR_PX` is meaningless if the grid's track floor moves
      // without it, and the ADR's whole re-derivation rests on that one number:
      // 286 = the grid's own `minmax(320px, 1fr)` MINUS the card's border and
      // padding. It is asserted by READING BOTH FILES rather than by re-typing
      // either — the subtrahend comes out of the same card's own className, so a
      // card that gains padding fails here instead of quietly making every rung
      // 4 characters too generous. This couples a constant to the CSS fact it was
      // derived from, which is ADR-014's own answer to the code comment that
      // asserted an invariant ("viewport-INVARIANT by construction … a ~300–370px
      // band") the CSS does not provide.
      // The grid is found by WHAT IT RENDERS, never by a character window — three
      // of this milestone's bad gates were positional slices (F-47-03-ARCH-4), and
      // `Fleet.tsx` declares THREE `minmax()` grids. Each declaration owns the
      // source up to the next one; the milestone grid is the one whose span
      // contains `<GlobalMilestoneCard`, and there must be exactly one.
      const fleetSource = await readFile(FLEET_TSX, "utf8");
      const grids = [...fleetSource.matchAll(/grid-cols-\[repeat\(auto-fill,minmax\((\d+)px,1fr\)\)\]/g)];
      assert.ok(grids.length >= 2, `Fleet.tsx really declares several auto-fill grids, so naming the right one matters (found ${grids.length})`);
      const milestoneGrids = grids.filter((match, index) =>
        fleetSource.slice(match.index, grids[index + 1]?.index ?? fleetSource.length).includes("<GlobalMilestoneCard"));
      assert.equal(milestoneGrids.length, 1, `exactly one of Fleet.tsx's grids renders <GlobalMilestoneCard> (found ${milestoneGrids.length})`);
      const track = Number(milestoneGrids[0][1]);
      const card = /<div className="group flex min-w-0 flex-col rounded-\[10px\] ([^"]*)"/.exec(fleetSource);
      assert.ok(card, "…and so is the card whose padding and border are subtracted from it");
      const padding = /\bp-(\d+)\b/.exec(card[1]);
      assert.ok(padding, `the card declares its own padding (got ${JSON.stringify(card[1])})`);
      assert.ok(/(^|\s)border(\s|$)/.test(card[1]), "…and its own 1px border");
      // Tailwind's spacing unit is 4px, and `border` with no width is 1px. Both
      // are read off the card rather than assumed for it.
      const chrome = 2 * 1 + 2 * (Number(padding[1]) * 4);
      assert.equal(chrome, 34, `the card's own chrome is border×2 + p-${padding[1]}×2 = ${chrome}px`);
      assert.equal(
        track - chrome,
        REGION5_ROW_FLOOR_PX,
        `region 5's ladder is derived from a ${REGION5_ROW_FLOOR_PX + chrome}px track; the grid now says ${track}px — re-derive the budgets (ADR-014) rather than moving one number`,
      );

      // The region-6 lanes are untouched in EXPECTATION (their names are still here,
      // unedited) and in OUTCOME (this run is the evidence).
      // DERIVED FROM THE GIVEN'S OWN ARITHMETIC — "eleven lanes, of which two assert on
      // region 5" — rather than from a hand count of a name regex. The hand count said
      // EIGHT and the regex selects NINE; the regex was right and the number was a
      // miscount, which is this milestone's sixth gate-wrong-about-the-tree (STATE
      // §Feedback). Subtracting the named region-5 pair cannot drift the way a second
      // tally of the same list can, and it fails loudly if either lane is renamed.
      const region5Before = LANES_BEFORE_47_04.filter((lane) => /clause 5 \+ DG-15|DG-19/.test(lane));
      assert.equal(region5Before.length, 2, `the Given's own arithmetic: exactly two of the eleven assert on region 5 (got ${region5Before.length})`);
      const region6 = LANES_BEFORE_47_04.filter((lane) => !region5Before.includes(lane));
      assert.equal(region6.length, 9, "…and the other NINE are the assign affordance's own region-6 lanes — the fixed action width (×2), the picker floor, the message ladder (×3), the coded refusals (×2) and A10 — all still named here");
      assert.deepEqual(region6.filter((lane) => !names.includes(lane)), [], "…and every one of them is still in the suite, unedited");
    },
  },
];
