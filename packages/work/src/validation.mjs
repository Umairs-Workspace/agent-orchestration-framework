// Read-only work validation; core supplies the shipped digest contract when needed.
import path from "node:path";
import { readFile } from "node:fs/promises";
import { parseFeature } from "./feature-parse.mjs";
import { VALID_STATUS, isOpen } from "./lifecycle.mjs";
import { recordDoc, WORK_ITEM_SCHEMA_VERSION, readItemMeta as readMeta, coerceSchemaVersion } from "./records.mjs";
import { BACKLOG_ROOT, sameNumber as sameNum } from "./identity.mjs";
import { listItems, readWorkDirectory as readDirSafe } from "./discovery.mjs";
import { isDriver, isDependTarget, asList, storiesByParent, siblingGate, siblingDependencyNumber, isDependNumber } from "./dependencies.mjs";
import { digestFindings } from "./digest.mjs";

const UNIVERSAL_TAGS = new Set(["@executable", "@manual", "@uat", "@bug", "@wip"]);
const FINDING_TAG_RE = /^@finding-[A-Za-z0-9-]+$/;
const MILESTONE_TAG_RE = /^@milestone-\d+$/i;

// ------------------------------------------------------------- validate ----

// The task contract's two verdicts, over the ONE parser (66/00 · ADR-003 §1): it
// PARSES, and its tags are in the closed vocabulary. The line scanning left for
// `src/feature-parse.mjs` — the 37-line hand-rolled scanner this replaced was the
// second reader of one artifact — and the rules stayed here, beside the one config
// key validate reads. A file that does NOT parse still gets its tag verdicts (each is
// decided on a tag line by itself) but no verification-COUNT verdict, which rests on
// scenario boundaries the parse could not establish.
function checkFeature(text, relPath, projectTags, add) {
  const { tags, scenarios, structural } = parseFeature(text);
  const allowed = (tag) => UNIVERSAL_TAGS.has(tag) || projectTags.has(tag) || FINDING_TAG_RE.test(tag);

  for (const finding of structural) add(relPath, finding.problem);

  for (const { tag } of tags) {
    if (MILESTONE_TAG_RE.test(tag)) add(relPath, `tag "${tag}" — milestone membership is structural, not a tag`);
    else if (!allowed(tag)) add(relPath, `unknown tag "${tag}" (outside the closed vocabulary)`);
  }

  if (structural.length > 0) return;
  for (const { name, verification } of scenarios) {
    if (verification.length !== 1) {
      add(relPath, `scenario "${name}" carries ${verification.length} verification tags (need exactly 1): [${verification.join(", ")}]`);
    }
  }
}

function findCycle(graph) {
  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const color = new Map([...graph.keys()].map((node) => [node, WHITE]));
  const stack = [];
  let cycle = null;

  const visit = (node) => {
    color.set(node, GREY);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      if (!graph.has(next)) continue;
      if (color.get(next) === GREY) {
        cycle = [...stack.slice(stack.indexOf(next)), next];
        return true;
      }
      if (color.get(next) === WHITE && visit(next)) return true;
    }
    stack.pop();
    color.set(node, BLACK);
    return false;
  };

  for (const node of graph.keys()) {
    if (color.get(node) === WHITE && visit(node)) break;
  }
  return cycle;
}

// Deterministic checks only — folder↔frontmatter, the closed tag vocabulary,
// and the `depends` graph (resolves + acyclic). Test-traceability
// (@executable→green test) is the language-aware layer still to come.
export async function validateWork(workDir, config, scopeRef, { getDigestContract } = {}) {
  const items = await listItems(workDir);
  const findings = [];
  const add = (target, problem) => findings.push({ path: target, problem });

  // NOTE (story 80 / task 02): this closure is byte-for-byte the rule that now lives in
  // the zero-import leaf `work-ref-scope.mjs`, which `work-doctor.mjs`'s `inScope` and
  // memory's `--item`/`--only` scopes share. It is NOT folded in here, deliberately:
  // importing the leaf from this module raises the session driver's root-inclusive
  // reach past the ADR-015 §5 ceiling of 21 (measured — 21 -> 22, via
  // terminal-ws.mjs -> work.mjs), and FF-5301 says raising that ceiling requires an
  // ADR. Folding it belongs to whichever item pays that ADR — TECH_DEBT, not this one.
  const inScope = (item) => {
    if (!scopeRef) return true;
    const ref = scopeRef.trim();
    if (/^\d+$/.test(ref)) return sameNum(item.parent ?? item.number, ref);
    const pair = ref.match(/^(\d+)\/(\d+)$/);
    if (pair) return item.ref === `${pair[1]}/${pair[2]}` || item.ref === ref;
    return item.slug.includes(ref);
  };

  const tagConfig = config?.work?.tags ?? {};
  const projectTags = new Set([
    ...(tagConfig.layers ?? []),
    ...(tagConfig.refinements ?? []),
    ...(tagConfig.domains ?? []),
  ]);

  // 127/ADR-002 §3 — validate SEES all three roots (they arrive through `listItems`) and
  // filters on none of them: an archived milestone is still a `parent:` and a `depends:`
  // target, still checked. What it learns is what a BACKLOG row is: it has no number, so
  // it is never keyed into a numbered set — `number != null` is the guard at every one of
  // these builds, never an `isFinite` after the parse (which would swallow the NaN
  // ADR-002 §4 says no site swallows).
  const milestoneNumbers = new Set(
    items.filter((item) => item.number != null && item.type === "milestone").map((item) => Number.parseInt(item.number, 10)),
  );
  // `depends` may point at any TOP-LEVEL item: a milestone, a uat gate, a spike, a
  // chore — or a PARENTLESS STORY, which this set used to exclude.
  //
  // A parentless story is a first-class driver of the stream. It occupies a top-level
  // number, it is scheduled by `next` alongside milestones, and `aof:verify` states in
  // terms that one "delivers a capability with no milestone above it". The only thing it
  // could not do was be DEPENDED ON: item 78 declares `depends: [52, 53, 79]`, 79 is the
  // parentless story `79_story_committed-loop-graph`, and validate reported a real,
  // correctly-declared edge as unresolvable. The edge was right and the check was narrow.
  //
  // `isDriver` itself is deliberately NOT widened — it gates readiness and scheduling
  // elsewhere, and this is a question about what a NUMBER can name, not about what
  // drives a phase. The two sets are related and not the same, so they are written
  // separately rather than one being bent to serve the other.
  //
  // A backlog row is NEVER a target (127/ADR-001 §3, ADR-002 §3): it has no number for an
  // edge to name, and a numbered item declaring `depends: [<slug>]` is reported below exactly
  // as any unresolvable entry is. An archived row IS a target — the archive is a location,
  // not a status, and the edge is scored by the target's own status elsewhere.
  const dependTargetNumbers = new Set(
    items
      .filter((item) => item.number != null && isDependTarget(item))
      .map((item) => Number.parseInt(item.number, 10)),
  );
  const graph = new Map();
  // m65/00 — THE STORY GRAPH, one per parent milestone. Deliberately NOT folded into
  // `graph` above: that map is keyed by driver NUMBER, and a sibling numbered 00 under
  // milestone 43 is not milestone 00. Keying per parent (and by REF within it) is what
  // makes a sibling number incapable of colliding with a driver number — and it also
  // makes the cycle report name refs (`43/01 → 43/02 → 43/01`) rather than bare digits.
  const storyGraphs = new Map();
  const siblingIndex = storiesByParent(items);
  const milestoneDirs = new Map(
    items.filter((item) => item.number != null && item.type === "milestone").map((item) => [String(Number.parseInt(item.number, 10)), item.dir]),
  );
  const siblingsOf = (item) => siblingIndex.get(String(Number.parseInt(item.parent, 10))) ?? [];

  // Story 139 — THE BACKLOG'S SLUG EDGES. On a backlog row an all-digit entry is still the
  // operator's note (promotion checks it, the shift keeps it current); a SLUG entry is an edge to
  // another backlog item, and it must name one — a row whose `number` is null, at any group depth.
  // A slug that a numbered depend target carries is the one mistake worth a hint: that item is
  // named by its number. The lookup is over `isDependTarget` rows, so a nested story never
  // answers it.
  const backlogSlugs = new Set(items.filter((item) => item.number == null).map((item) => item.slug));
  const streamNumberBySlug = new Map();
  for (const item of items) {
    if (item.number != null && isDependTarget(item) && !streamNumberBySlug.has(item.slug)) streamNumberBySlug.set(item.slug, item.number);
  }
  const backlogEdges = [];

  for (const item of items) {
    const meta = recordDoc(item) ? await readMeta(item) : {};

    // A backlog driver is never a SOURCE either (127/ADR-003 §6): its `depends:` gates
    // nothing in the stream, so it enters no driver graph. Keying it here would put a node at
    // `NaN`. Only a NUMBER entry is an edge here (story 139): `10x-faster` is a slug, and
    // `Number.parseInt` would have graphed it as 10.
    if (item.number != null && isDriver(item)) {
      const deps = asList(meta.depends).filter(isDependNumber).map((value) => Number.parseInt(value, 10));
      graph.set(Number.parseInt(item.number, 10), deps);
    }

    // Story 139 — a BACKLOG row's slug entries are edges between backlog items, graphed in a
    // SEPARATE map keyed by slug, as the per-parent story graphs are. Collected for every
    // backlog row whatever the scope, and ordered by slug after the walk.
    if (item.number == null) {
      const edges = asList(meta.depends).filter((dep) => !isDependNumber(dep) && backlogSlugs.has(dep));
      backlogEdges.push([item.slug, edges]);
    }

    // m65/00 — a STORY's `depends` is graphed too, within its parent. Built for EVERY
    // story (not just the in-scope ones), exactly as the driver graph above is, so a
    // scope-narrowed validate still sees a whole cycle rather than an arc of one.
    if (item.type === "story" && item.parent != null && item.parent !== "") {
      const parentKey = String(Number.parseInt(item.parent, 10));
      if (!storyGraphs.has(parentKey)) storyGraphs.set(parentKey, new Map());
      const siblings = siblingsOf(item);
      const edges = [];
      for (const dep of asList(meta.depends)) {
        const number = siblingDependencyNumber(dep, item.parent);
        const sibling = number == null ? null : siblings.find((candidate) => sameNum(candidate.number, number));
        if (sibling != null) edges.push(sibling.ref);
      }
      storyGraphs.get(parentKey).set(item.ref, edges);
    }

    if (!inScope(item)) continue;

    // 1. folder ↔ frontmatter — the schema is chosen DYNAMICALLY off the doc
    //    type. A `doc: digest` record doc (an AOF.md for a converted milestone)
    //    carries digest-shaped frontmatter (`milestone`/`slug`/`status`, the
    //    legacy SPEC left untouched), NOT the native record shape — so it is
    //    held to the digest schema, not the SPEC/STORY/SESSION one.
    const doc = recordDoc(item);
    if (doc) {
      const docPath = path.join(item.dir, doc);
      if (Object.keys(meta).length === 0) {
        add(docPath, `missing or empty record doc (${doc})`);
      } else if (meta.doc === "digest") {
        // Imported/converted milestone digest (AOF.md). Identity comes from
        // `milestone` (the number) + `slug`; status from the closed vocabulary.
        // No `type`/`created`/`updated`/`parent` — those are native-only.
        if (item.type !== "milestone") add(docPath, `digest record doc (doc: digest) is only valid for a milestone, not a "${item.type}"`);
        if (!sameNum(meta.milestone ?? "", item.number)) add(docPath, `digest milestone "${meta.milestone ?? ""}" ≠ folder "${item.number}"`);
        if (meta.slug !== item.slug) add(docPath, `digest slug "${meta.slug ?? ""}" ≠ folder "${item.slug}"`);
        if (!VALID_STATUS.has(meta.status)) add(docPath, `invalid status "${meta.status ?? ""}"`);
        // Story 137 — the key set and the `## ` section set are the shipped AOF.md
        // template's, read through its one contract module rather than listed again here.
        // The headings need the doc text; only a digest pays for this second read.
        if (typeof getDigestContract !== "function") throw new TypeError("validateWork requires getDigestContract to validate a digest record");
        for (const problem of digestFindings(meta, await readFile(docPath, "utf8"), getDigestContract())) add(docPath, problem);
      } else {
        if (meta.type !== item.type) add(docPath, `frontmatter type "${meta.type ?? ""}" ≠ folder type "${item.type}"`);
        // 127/ADR-005 §3 — a BACKLOG record doc carries no `number:` until `promote` mints
        // one, so on a backlog row a PRESENT number is the finding (a bare `number:` with no
        // value carries none). At the root and in the archive the folder↔frontmatter rule is
        // unchanged.
        if (item.number == null) {
          if (meta.number != null && meta.number !== "") add(docPath, `frontmatter number "${meta.number}" on a backlog item — a backlog item carries no number until 'aof work promote' mints one`);
        } else if (!sameNum(meta.number ?? "", item.number)) {
          add(docPath, `frontmatter number "${meta.number ?? ""}" ≠ folder "${item.number}"`);
        }
        if (meta.slug !== item.slug) add(docPath, `frontmatter slug "${meta.slug ?? ""}" ≠ folder "${item.slug}"`);
        if (!VALID_STATUS.has(meta.status)) add(docPath, `invalid status "${meta.status ?? ""}"`);
        if (!meta.created) add(docPath, "missing created date");
        if (!meta.updated) add(docPath, "missing updated date");
        if (meta.parent != null && meta.parent !== "" && !milestoneNumbers.has(Number.parseInt(meta.parent, 10))) {
          add(docPath, `parent "${meta.parent}" does not resolve to a milestone`);
        }
      }

      // 1b. staleness (milestone 40 / story 03, ADR-005/ADR-006) — independent
      // of the digest/native branch above: an item's own `schema` (missing/
      // non-integer coerces to the baseline 0, ADR-003) compared against the
      // current WORK_ITEM_SCHEMA_VERSION. Only checked once the doc actually
      // parsed (a missing/empty record doc is already reported above; flagging
      // it stale too would be a misleading second finding for the same root
      // cause). Deliberately dep-01 only (work.mjs constants alone) — names
      // the remedy `aof upgrade` as a STRING LITERAL, never imports
      // work-upgrade.mjs, and never enumerates which transforms are pending
      // (that is `aof upgrade --dry-run`, story 02) so the message stays
      // deterministic and stable run-to-run.
      if (Object.keys(meta).length > 0) {
        const itemSchema = coerceSchemaVersion(meta.schema);
        if (itemSchema < WORK_ITEM_SCHEMA_VERSION) {
          add(
            docPath,
            `schema ${itemSchema} is behind the current schema ${WORK_ITEM_SCHEMA_VERSION} — run \`aof upgrade\` to update it`,
          );
        }
      }
    }

    // 3a. depends references resolve (to any top-level item), and only a NUMBER entry can —
    //     a slug on a numbered item, digit-led or not, is reported.
    if (item.number != null && isDriver(item)) {
      for (const dep of asList(meta.depends)) {
        if (!isDependNumber(dep) || !dependTargetNumbers.has(Number.parseInt(dep, 10))) {
          // The message names what is ACTUALLY admitted. It read "a milestone/uat item"
          // while spikes and chores had long been admitted too, so an author reading the
          // finding was told a narrower rule than the one being applied — and the fix it
          // implied (re-point at a milestone) was wrong for four of the five kinds.
          add(path.join(item.dir, recordDoc(item)), `depends "${dep}" does not resolve to a top-level item (a milestone, uat gate, spike, chore, or parentless story)`);
        }
      }
    }

    // 3a-ter. Story 139 — a backlog row's SLUG entry names a backlog item. Its numeric entries
    //     are not checked here (127/01 task 03's rows keep their answer).
    if (item.number == null && recordDoc(item)) {
      for (const dep of asList(meta.depends)) {
        if (isDependNumber(dep) || backlogSlugs.has(dep)) continue;
        const inStream = streamNumberBySlug.get(dep);
        add(
          path.join(item.dir, recordDoc(item)),
          inStream != null
            ? `depends "${dep}" names no backlog item — "${dep}" is ${inStream} in the stream, so the edge is written ${inStream}`
            : `depends "${dep}" names no backlog item — an edge to another backlog item is its slug, and an edge to a stream item is its number`,
        );
      }
    }

    // 3a-bis. m65/00 — a STORY's depends resolves to a SIBLING. THE SPLIT: validate
    // REPORTS an edge that names no sibling; `next` (below) IGNORES the same edge, so a
    // typo is surfaced here and can never strand a milestone there. This SUPERSEDES the
    // locked scenario "a story-level depends edge is not part of the graph"
    // (00/01/tasks/02_depends-graph.feature) — whose real intent, protecting a build from
    // a story's stray `depends`, now lives in that split rather than in blindness.
    if (item.type === "story" && item.parent != null && item.parent !== "" && item.dir != null) {
      const { unresolved } = siblingGate(meta.depends, item, siblingsOf(item));
      for (const dep of unresolved) {
        add(path.join(item.dir, recordDoc(item)), `depends "${dep}" does not resolve to a sibling`);
      }
    }

    // 2. the task contract, per `.feature` — it parses, and its tags are in the closed
    //    vocabulary — INSIDE THE ACCEPTANCE HORIZON (66/ADR-002, granularity ADR-009/F:
    //    a task feature's owning item is its STORY). A `done` story's features are
    //    delivered records: no edit, no annotation, no `@superseded` tag, so a finding
    //    on one is a permanent red no legal act can clear — and a gate nobody can clear
    //    is a gate that gets silenced. validate emits nothing at all against them, tag
    //    finding and parse finding alike.
    if (item.type === "story" && isOpen(meta.status)) {
      const tasksDir = path.join(item.dir, "tasks");
      for (const file of await readDirSafe(tasksDir)) {
        if (!file.isFile() || !file.name.endsWith(".feature")) continue;
        const featurePath = path.join(tasksDir, file.name);
        checkFeature(await readFile(featurePath, "utf8"), featurePath, projectTags, add);
      }
    }
  }

  // 3b. depends graph acyclic
  const cycle = findCycle(graph);
  if (cycle) add(workDir, `depends cycle: ${cycle.join(" → ")}`);

  // 3c. m65/00 — each parent's SIBLING graph acyclic, checked independently so a cycle
  // among milestone 43's stories is never reported against milestone 40's. The finding
  // is filed at the owning milestone's folder (not `workDir`) because a story cycle has
  // an owner and a scope-narrowed read should be able to attribute it. Wording is
  // deliberately the SAME "depends cycle: " prefix the driver check emits — one rule,
  // one vocabulary, whether the loop is between drivers or between siblings.
  for (const [parentKey, storyGraph] of storyGraphs) {
    const storyCycle = findCycle(storyGraph);
    if (storyCycle) add(milestoneDirs.get(parentKey) ?? workDir, `depends cycle: ${storyCycle.join(" → ")}`);
  }

  // 3c-bis. Story 139 — the backlog's slug graph acyclic. A cycle there is never resolvable:
  // every item on it waits on another item on it, so every promote on it is refused
  // `promote-depends-backlog` for ever. Built in SLUG order, so one backlog always names its
  // cycle the same way, and filed at `<work>/backlog` whatever the scope — like the driver cycle,
  // a stream-level fact a scoped run must not lose. The same "depends cycle: " prefix.
  const backlogGraph = new Map();
  for (const [slug, edges] of backlogEdges.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
    backlogGraph.set(slug, [...(backlogGraph.get(slug) ?? []), ...edges]);
  }
  const backlogCycle = findCycle(backlogGraph);
  if (backlogCycle) add(path.join(workDir, BACKLOG_ROOT), `depends cycle: ${backlogCycle.join(" → ")}`);

  // 3d. milestone 127 / ADR-001 §3 — `backlog-slug-duplicate`. A backlog ref IS its slug
  // (`findWork` resolves it by slug, and a group carries no semantics), so two leaves sharing
  // a slug anywhere in the backlog tree are one ref naming two folders — whatever their type
  // or group. ONE finding per slug, anchored at the backlog root, naming every folder
  // (relative to `backlog/`, sorted) — the same one-fact-per-collision shape as
  // `duplicate-driver-number`. A backlog slug equal to a NUMBERED item's slug is not a
  // collision: the numbered item resolves by number first. Like the cycle above this is a
  // stream-level fact, reported whatever the scope.
  const backlogBySlug = new Map();
  for (const item of items) {
    if (item.number != null) continue;
    const folder = item.backlog === "" ? item.name : `${item.backlog}/${item.name}`;
    if (!backlogBySlug.has(item.slug)) backlogBySlug.set(item.slug, []);
    backlogBySlug.get(item.slug).push(folder);
  }
  for (const [slug, folders] of [...backlogBySlug].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
    if (folders.length < 2) continue;
    const named = [...folders].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    add(path.join(workDir, BACKLOG_ROOT), `backlog slug "${slug}" names ${named.length} folders (${named.join(", ")}) — a backlog ref is its slug, so one must be renamed`);
  }

  // collapse identical (path, problem) duplicates — the same tag can recur
  // across scenarios in one file, but one report per issue is enough.
  const seen = new Set();
  return findings.filter((finding) => {
    const key = `${finding.path}${finding.problem}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
