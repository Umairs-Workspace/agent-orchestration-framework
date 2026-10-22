// The board read-model derivations (DESIGN — "State & data plumbing").
//
// Everything here is computed CLIENT-SIDE from the flat /api/work/list array
// (ADR-002's 7-field contract). A milestone = type:milestone with parent null;
// its stories = items whose parent == the milestone's number; a uat gate =
// type:uat. Counts, progress and story-dots are derived — never fetched, never
// faked. Task counts are deliberately NOT surfaced (not in the contract).
import type { DocName, PrototypeStatus, WorkItem, WorkStatus } from "./api";
import type { StatusKind } from "./status";

export type Milestone = {
  item: WorkItem;
  // The milestone's plain ref/number (e.g. "03").
  num: string;
  stories: WorkItem[];
  // story-status tallies
  total: number;
  done: number;
  inReview: number;
  inProgress: number;
  blocked: number;
  notStarted: number;
};

export type Derived = {
  items: WorkItem[];
  milestones: Milestone[];
  uat: WorkItem[];
  // milestone 37/ADR-003: spike/chore are additive top-level drivers (ADR-001,
  // uat-shaped). Minimal board default — grouped here so they ride the SAME
  // existing driver placement uat already uses (BoardLanes' `all`-focus lane
  // bucket), never a new lane/column.
  otherDrivers: WorkItem[];
  // milestone 127 / ADR-006 §3 — the BACKLOG rows (`number === null`, the wire's own fact),
  // in wire order. Partitioned out BEFORE any card, gate bar or lane is derived: a backlog
  // milestone reaching the card sweep below would be painted as a card with its slug in the
  // ref slot and a `not-started` ring asserting a lifecycle it has not entered. The overview
  // shows them as quiet grouped rows (DESIGN §Surface 1); nothing else on the board sees them.
  backlog: WorkItem[];
  // `byRef` deliberately EXCLUDES backlog rows: `Board.tsx`'s hash deep-link resolves `#<ref>`
  // through it and would otherwise open a board for a backlog milestone. The board is
  // read-only on the backlog (DESIGN documented default 1), so `#search-the-fleet` lands on the
  // overview and opens nothing.
  byRef: Map<string, WorkItem>;
  // Stream-wide summary counts (overview chips).
  doneMilestones: number;
  activeMilestones: number;
  blockedGates: number;
  // The RENDERED milestones that carry `archived: true` — only ever non-zero while the list
  // was fetched with the include-archived parameter, since the default list cannot hold one.
  // `doneMilestones` counts them too (an archived card's own chip reads `✓ done`); this is the
  // subset, stated by its own chip so the two never contradict each other (DESIGN §Surface 2).
  archivedMilestones: number;
};

// A milestone's "number" key as referenced by a child's `parent` field. In the
// contract `parent` is the milestone's ref/number string (e.g. "03"). Stories
// carry `parent === milestone.ref` for milestones (the seed uses the 2-digit
// number); we also tolerate a bare numeric form ("3") by normalising.
function milestoneKey(item: WorkItem): string {
  return item.ref;
}

// Normalise a parent pointer to compare against a milestone ref. The seed writes
// parent as the milestone's number (e.g. "3" or "03"); milestone refs are the
// 2-digit form ("03"). Compare on the numeric value when both look numeric.
function sameMilestone(parent: string | null, milestoneRef: string): boolean {
  if (parent == null) return false;
  if (parent === milestoneRef) return true;
  const a = Number.parseInt(parent, 10);
  const b = Number.parseInt(milestoneRef, 10);
  return Number.isFinite(a) && Number.isFinite(b) && a === b;
}

// A backlog row, by the ONE fact the wire carries for it (127/ADR-006 §1): `number: null`.
// The key is PRESENT only on a backlog row — a live row and an archived row never carry it —
// so `=== null` is the whole test, and the ref's shape is never consulted.
const isBacklogRow = (item: WorkItem): boolean => item.number === null;

export function deriveBoard(items: WorkItem[]): Derived {
  // THE PARTITION, FIRST (127/ADR-006 §3): every derivation below runs over the remainder.
  const backlog = items.filter(isBacklogRow);
  const stream = items.filter((i) => !isBacklogRow(i));

  const byRef = new Map<string, WorkItem>();
  for (const item of stream) byRef.set(item.ref, item);

  const milestoneItems = stream.filter((i) => i.type === "milestone" && i.parent == null);
  const uat = stream.filter((i) => i.type === "uat");
  // milestone 168/ADR-007 §2: a prototype rides beside spike and chore, never a lane of its own.
  const otherDrivers = stream.filter((i) => i.type === "spike" || i.type === "chore" || i.type === "prototype");

  const milestones: Milestone[] = milestoneItems.map((item) => {
    const stories = stream.filter((s) => s.type === "story" && sameMilestone(s.parent, milestoneKey(item)));
    const tally = (status: WorkStatus) => stories.filter((s) => s.status === status).length;
    const total = stories.length;
    const done = tally("done");
    const inReview = tally("in-review");
    const inProgress = tally("in-progress");
    const blocked = tally("blocked");
    const notStarted = tally("not-started");
    return {
      item,
      num: item.ref,
      stories,
      total,
      done,
      inReview,
      inProgress,
      blocked,
      notStarted,
    };
  });

  const doneMilestones = milestones.filter((m) => m.item.status === "done").length;
  const activeMilestones = milestones.filter((m) => m.item.status === "in-progress").length;
  const blockedGates = uat.filter((u) => u.status === "blocked").length;
  const archivedMilestones = milestones.filter((m) => m.item.archived === true).length;

  return {
    items,
    milestones,
    uat,
    otherDrivers,
    backlog,
    byRef,
    doneMilestones,
    activeMilestones,
    blockedGates,
    archivedMilestones,
  };
}

// All stories under a milestone (used by the board lanes).
export function storiesOf(derived: Derived, milestoneRef: string): WorkItem[] {
  const m = derived.milestones.find((x) => x.num === milestoneRef);
  return m ? m.stories : [];
}

// The uat gate(s) that accept a given milestone, if derivable. The contract
// gives uat items a `parent`; when it points at the milestone we treat it as the
// gate for that milestone. (May be empty — that's fine, we then omit.)
export function gatesFor(derived: Derived, milestoneRef: string): WorkItem[] {
  return derived.uat.filter((u) => sameMilestone(u.parent, milestoneRef));
}

// The milestone a uat gate accepts (its parent), if derivable.
export function milestoneOfGate(derived: Derived, gate: WorkItem): Milestone | null {
  if (gate.parent == null) return null;
  return derived.milestones.find((m) => sameMilestone(gate.parent, m.num)) ?? null;
}

export function findMilestone(derived: Derived, ref: string): Milestone | null {
  return derived.milestones.find((m) => m.num === ref) ?? null;
}

// A PROTOTYPE'S WORD → ITS LANE (milestone 168 / ADR-007 §2) — the ONE mapping. The lanes are
// keyed on the frozen five, and `place` drops a card whose status has no lane, so a prototype's
// own four words each map to one: `active` → in-progress, `paused` → not-started, `done` and
// `abandoned` → done. Every governed word answers itself, so no governed card moves. The status
// ramp (`status.tsx`) reads the same mapping, so a prototype's ring agrees with its lane.
const PROTOTYPE_LANE: Readonly<Record<PrototypeStatus, WorkStatus>> = {
  active: "in-progress",
  paused: "not-started",
  done: "done",
  abandoned: "done",
};

export function laneStatus(status: WorkItem["status"] | undefined): WorkStatus | null {
  if (status == null) return null;
  return (PROTOTYPE_LANE as Readonly<Record<string, WorkStatus>>)[status] ?? (status as WorkStatus);
}

export function laneFor(item: WorkItem): StatusKind {
  return laneStatus(item.status) ?? "not-started";
}

// A top-level driver's card tag: its type, and for a prototype its own word too (ADR-007 §3), so
// `paused` and `abandoned` stay visible as themselves inside a shared lane.
export function driverTag(item: WorkItem): string {
  return item.type === "prototype" ? `prototype · ${item.status ?? "active"}` : item.type;
}

export type LaneCard = { item: WorkItem; tag: string };

// The lane buckets for a focus: every card in the lane its status maps to (`laneFor`). Under `all`
// the milestones, their in-review/blocked stories, the uat gates and the other drivers; under a
// milestone focus that milestone's stories and its gates. A prototype is never milestone work.
export function laneCards(derived: Derived, focus: "all" | string): Record<StatusKind, LaneCard[]> {
  const out: Record<StatusKind, LaneCard[]> = {
    "not-started": [],
    "in-progress": [],
    "in-review": [],
    blocked: [],
    done: [],
  };
  const place = (item: WorkItem, tag: string) => {
    const lane = laneFor(item);
    if (out[lane]) out[lane].push({ item, tag });
  };

  if (focus === "all") {
    for (const m of derived.milestones) place(m.item, "milestone");
    for (const m of derived.milestones) {
      for (const s of m.stories) {
        if (s.status === "in-review" || s.status === "blocked") place(s, `in ${m.num}`);
      }
    }
    for (const u of derived.uat) place(u, "uat");
    // milestone 37/ADR-003: spike/chore are additive top-level drivers
    // (ADR-001, uat-shaped) — placed via the SAME existing driver mechanism as
    // uat above (no new lane/column); the tag doubles as the type badge. A
    // prototype rides the same placement (168/ADR-007), tagged with its own word.
    for (const d of derived.otherDrivers) place(d, driverTag(d));
  } else {
    const m = derived.milestones.find((x) => x.num === focus);
    if (m) for (const s of m.stories) place(s, `in ${m.num}`);
    for (const u of gatesFor(derived, focus)) place(u, "uat");
  }
  return out;
}

export type Tab = DocName | "FINDINGS" | "TASKS" | "RUNS";

// Type-aware tab set (the ACD doc model). VERIFICATION/RETROSPECTIVE/Findings are
// MILESTONE-level; a story carries STORY.md plus its TASKS (its tasks/*.feature).
// RUNS is offered at the level that OWNS a runs/ log — both milestones and stories
// (m19 ADR-002) — and never on a uat gate (DESIGN surface 1). A prototype opens on its own two
// documents and has no RUNS: its verb mints no run record (168/ADR-004 §5).
export function tabsFor(item: WorkItem): Tab[] {
  if (item.type === "milestone") return ["SPEC", "ARCHITECTURE", "VERIFICATION", "RETROSPECTIVE", "RUNS", "FINDINGS"];
  if (item.type === "story") return ["STORY", "TASKS", "RUNS"];
  if (item.type === "uat") return ["FINDINGS"];
  if (item.type === "prototype") return ["PROTOTYPE", "STATE"];
  return ["SPEC"];
}


export const titleOf = (item: WorkItem): string => item.title ?? item.slug;

// A title-cased reading of a slug, for a heading's fallback when an item has no explicit
// title — "work-board-ui" → "Work Board Ui". ONE spelling for the board (127/04 moved it
// here from the detail panel, which keeps using it): the backlog row's title falls back to
// the same reading, so the two surfaces can never humanise a slug two ways.
export function humanizeSlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
