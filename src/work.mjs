// `aof work` — deterministic mechanics over an ACD work stream.
//
// The work stream is a tree of `NN_type_slug` folders. The folder NAME is the
// index: identity (number/type/slug) is parseable without opening a file, so
// resolution and listing never need to read content — that is the whole point
// of this module (it replaces the agent improvising `**/*.md` globs).
//
// Structure handled (the lark-guard convention):
//   work/NN_milestone_slug/SPEC.md
//   work/NN_milestone_slug/stories/SS_story_slug/STORY.md
//   work/NN_milestone_slug/stories/SS_story_slug/tasks/*.feature
//   work/NN_uat_slug/SESSION.md          (an acceptance session over a span of delivery)
//   work/backlog/[<group>/…/]<type>_slug/ (milestone 127 — un-numbered, in; its ref is its slug)
//   work/archive/NN_type_slug/           (milestone 127 — numbered, out; name verbatim, `archived: true`)
import path from "node:path";
import os from "node:os";
import { readFile } from "node:fs/promises";
import { findProjectConfig, globalMeshPaths, globalWorkspacePaths } from "./workspace.mjs";
import { readJson } from "./fs.mjs";
// milestone 33 / story 00 (ADR-004, F-3203) — the per-install identity hydration
// seam. sidecarPathFor is the ONE sidecar-path builder (never re-derived here);
// readSidecar is the ONE tolerant sidecar read (22/R2, shared with every other
// sidecar reader/writer in node-identity.mjs); isSameHost + deriveNodeId are
// reused so the self-heal re-derive is the IDENTICAL precedence chain deriveNodeId
// itself uses, not a private re-derivation.
import { sidecarPathFor, readSidecar, isSameHost, deriveNodeId, isDerivationOf } from "./node-identity.mjs";
// milestone 66 / story 00 (ADR-003 §1, ADR-002) — the ONE Gherkin reader, and the ONE
// acceptance-horizon predicate. Both are leaves this god-node now reaches by import
// rather than by a second hand-rolled copy: `checkFeature` below is a thin caller.
import { parseFeature } from "./feature-parse.mjs";
import { VALID_STATUS, isOpen } from "./acceptance-horizon.mjs";
import {
  recordDoc, parseFrontmatter, WORK_ITEM_SCHEMA_VERSION, readItemMeta as readMeta, coerceSchemaVersion,
} from "@aof/work/records";
export {
  recordDoc, typeHasRecordDoc, parseFrontmatter, WORK_ITEM_SCHEMA_VERSION,
  readItemSchema, readItemVersion, rollbackItemStatus, setItemStatus, applyItemFrontmatter,
} from "@aof/work/records";
import { ITEM_RE, BACKLOG_ROOT, sameNumber as sameNum } from "@aof/work/identity";
export { ITEM_RE, BACKLOG_ITEM_RE, BACKLOG_ROOT, ARCHIVE_ROOT, parseStorySpan } from "@aof/work/identity";
import { listItems, readWorkDirectory as readDirSafe } from "@aof/work/discovery";
export { listItems, isLiveStreamRow, findWork, listStream } from "@aof/work/discovery";
import { isDriver, isDependTarget, asList, storiesByParent, siblingGate, siblingDependencyNumber, isDependNumber } from "@aof/work/dependencies";
export { isDependTarget, siblingDependencyNumber, siblingGate, isDependNumber, rewriteRefEntry, rewriteDependsEntries } from "@aof/work/dependencies";
export { nextWork } from "@aof/work/readiness";
import { digestFindings } from "./work/digest-template.mjs";

const UNIVERSAL_TAGS = new Set(["@executable", "@manual", "@uat", "@bug", "@wip"]);
const FINDING_TAG_RE = /^@finding-[A-Za-z0-9-]+$/;
const MILESTONE_TAG_RE = /^@milestone-\d+$/i;

// ---------------------------------------------------------------- config ----


function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function mergePlainObjects(base, overlay) {
  const merged = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = mergePlainObjects(merged[key], value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

async function readGlobalMeshConfig(env) {
  const paths = globalWorkspacePaths({ env });
  try {
    const globalConfig = await readJson(paths.configPath);
    return isPlainObject(globalConfig?.mesh) ? globalConfig.mesh : {};
  } catch {
    return {};
  }
}

// milestone 33 / story 00 (ADR-004.5, F-3203) — the self-heal STEP, factored out of
// loadWorkspace so it is directly unit-testable over an injected sidecar object +
// current hostname (+ an optional takenIds roster for the collision-preserving
// scenario) without needing a full fixture project. Returns the (possibly healed)
// sidecar object; loadWorkspace calls this THEN persists+overlays. Fires when the
// sidecar is hostname-DERIVED (sidecar.derivedFrom is a string, sidecar.pinned is not
// true — an old pre-schema sidecar with NEITHER key is "unknown origin, never churned")
// AND EITHER (1) the CURRENT machine's sanitized hostname no longer matches the RECORDED
// DERIVATION hostname, sidecar.derivedFrom (the copied-.aof symptom) — compared against
// derivedFrom, NEVER the resolved nodeId: a collision-suffixed id (e.g.
// nodeId:"shared-host-c4f8", derivedFrom:"shared-host") would never equal its own bare
// sanitized stem, so comparing against nodeId would churn a stable, collision-resolved
// id on EVERY load (craft/architect review finding) — OR (2) the stored id is no longer
// a valid derivation of its own recorded host under CURRENT rules (F-3302: a
// derivation-rule change like the `.local` strip self-migrates), detected via
// isDerivationOf, which recognises the collision-suffixed form so a legitimate collision
// id is never churned. Re-derives via
// deriveNodeId itself — the SAME precedence/collision chain, the sidecar's OWN salt
// (so the install hash never churns) — and returns the sidecar merged with the healed
// { nodeId, derivedFrom }; every other case returns the sidecar UNCHANGED (byte-
// identical object reference is not guaranteed, but the persisted bytes are, because
// persistNodeId's own idempotence check short-circuits the write).
export async function healIdentitySidecar({ sidecar = {}, hostname, sidecarPath, takenIds = [] } = {}) {
  const isHostnameDerived = sidecar.pinned !== true && typeof sidecar.derivedFrom === "string";
  if (!isHostnameDerived) return sidecar; // pinned or unknown-origin — never churned.
  // Trigger 1 (the copied-.aof symptom): the CURRENT machine's sanitized hostname no
  // longer matches the RECORDED derivation host (compared derivedFrom-vs-hostname, never
  // the resolved nodeId — a collision-suffixed id never equals its own bare stem).
  const hostnameChanged = !isSameHost(hostname, sidecar.derivedFrom);
  // Trigger 2 (F-3302 — a derivation-RULE change self-migrates): the stored id is no
  // longer a valid derivation of its OWN recorded host under current rules (e.g. a
  // pre-`.local`-strip `umamis-mac-mini-local`). isDerivationOf recognises the
  // opaque forms AND the legacy hostname-stem forms (132/01), so neither a legitimate
  // collision id nor a pre-132 stem id is churned — moving a legacy id to the opaque form
  // is `aof mesh identity --reidentify`, never a load. Self-terminating: after the heal
  // the id IS a valid derivation, so a second load is a keep.
  const staleFormat = !isDerivationOf(sidecar.nodeId, sidecar.derivedFrom, sidecar.salt);
  if (!hostnameChanged && !staleFormat) {
    return sidecar; // still on the recorded derivation host with a valid-format id.
  }
  const healedId = await deriveNodeId({
    config: {}, // never a pinned config — a derived sidecar is re-derived fresh
    hostname,
    salt: sidecar.salt,
    takenIds,
    sidecarPath,
  });
  return { ...sidecar, nodeId: healedId, derivedFrom: hostname };
}

// chore 94 — WHAT A PRESENT-BUT-UNREADABLE CONFIG MEANS, and why it is recorded rather
// than thrown. `{ config: {} }` is the honest answer for a project with NO config, and it
// was also the answer for a config with a JSON typo — the two were indistinguishable, so a
// trailing comma silently disabled every OPTIONAL declaration (work.worktree.prepare,
// work.test, work.rubric, the loop bounds, the whole `config.x ?? default` family) with no
// warning anywhere: each reader saw an absent key and took its default, correctly.
//
// The fix is NOT to throw. Every daemon, board face and CLI door loads through here, and a
// door that crashes on a torn config takes the fleet down with it (board-ui maps a
// loadWorkspace throw to a 500 for exactly this reason) — the degrade to {} is deliberate
// and stays. What changes is that the DISTINCTION survives the degrade: the returned
// workspace carries `configFault` (null on the clean and the no-config paths alike), and a
// caller that cares — `work:doctor`, the health lane — turns it into a finding that names
// the file and the parse error. Absent is NOT a fault: an unconfigured project is a
// legitimate state, and warning about it would fire on every repo that never opted in.
function configFaultFrom(configPath, error, { explicit = false } = {}) {
  // The read leg's own errno reaches us untouched (fs.readJson only codes the parse leg).
  //
  // chore 113 — AN ABSENT CONFIG IS NOT ALWAYS THE NO-CONFIG CASE. Reading every ENOENT as
  // "this project never opted in" is right for a config DISCOVERED by walking up from the
  // cwd, and wrong for one the operator NAMED: they asked for that file, it is not there,
  // and the run proceeds on defaults with nothing said — the same silence a torn config was
  // rescued from, arriving through the other errno. `explicit` is the discriminator
  // loadWorkspace already holds (it knows which of the two paths produced configPath), so
  // the discovered case stays silent and only the named one faults. ENOTDIR rides with
  // ENOENT because it is the same fact through a different errno — a named path whose
  // parent is a file is just as absent as one whose parent is empty.
  const absent = error?.code === "ENOENT" || error?.code === "ENOTDIR";
  if (absent && !explicit) return null;
  if (absent) {
    return {
      path: configPath,
      code: "missing-config",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  return {
    path: configPath,
    code: error?.code === "malformed-json" ? "malformed-json" : "unreadable-config",
    message: error instanceof Error ? error.message : String(error),
  };
}

// milestone 33 / story 00 (ADR-004.3/.4/.5, F-3203) — loadWorkspace HYDRATES
// config.mesh.nodeId/salt from the git-ignored PER-INSTALL SIDECAR
// (.aof/mesh/identity.json) before returning, so every downstream config.mesh reader
// (mesh-relay.mjs, mesh-presence.mjs, issuance, lease, the mesh-gate) sees the
// per-install id with ZERO code change. PRECEDENCE: sidecar > committed-fallback >
// hostname-derive (hydration OVERLAYS; it never derives — a workspace with neither
// leaves config.mesh.nodeId absent, for a later deriveNodeId call to mint).
//
// THE ONE SANCTIONED LOAD-TIME WRITE (ADR-004.5 self-heal, task 03's carve-out): a
// sidecar whose id was HOSTNAME-DERIVED (sidecar.derivedFrom is a string, sidecar.pinned
// is not true) but whose CURRENT hostname no longer sanitizes to the same value as the
// sidecar's RECORDED derivation hostname (sidecar.derivedFrom — never the resolved
// nodeId, which may carry a collision suffix) — the copied-.aof symptom — re-derives
// from THIS machine's CURRENT hostname (via deriveNodeId itself, so the heal reuses
// the identical precedence/collision chain) and REWRITES the sidecar. Every OTHER load
// (no sidecar, a sidecar still on its recorded derivation host — collision suffix and
// all, an operator-PINNED sidecar, or an old pre-schema sidecar with neither
// derivedFrom nor pinned — "unknown origin, never churned") is a PURE READ: this is
// the ONLY exception to "loadWorkspace writes no file" (ADR-004.3), narrowly
// discriminated by the sidecar schema, never the common overlay path.
//
// `hostname` is the injectable current-hostname override (mirrors deriveNodeId's own
// injected-hostname seam) — production supplies os.hostname() when absent; tests drive
// the mismatch deterministically with two fixture strings.
export async function loadWorkspace(cwd = process.cwd(), explicitConfig, { hostname, env } = {}) {
  const configPath = await findProjectConfig(cwd, explicitConfig);
  let config = {};
  let configFault = null;
  try {
    config = await readJson(configPath);
  } catch (error) {
    config = {};
    configFault = configFaultFrom(configPath, error, { explicit: Boolean(explicitConfig) });
  }
  const configDir = path.dirname(configPath);
  const projectRoot = path.basename(configDir) === ".aof" ? path.dirname(configDir) : configDir;
  const workDir = path.resolve(projectRoot, config.work?.dir ?? "./wiki/work");
  // The .aof config-home dir. The mesh substrate anchors HERE (not under workDir):
  // mesh is aof config/runtime state — a cross-cutting, extensible concept (planning,
  // not only work) — so it lives beside aof's config/lock, git-tracked (28/verify
  // decision superseding 22/ADR-002+003's work-stream-co-location).
  const aofDir = path.basename(configDir) === ".aof" ? configDir : path.join(projectRoot, ".aof");

  const globalMeshConfig = await readGlobalMeshConfig(env);
  if (Object.keys(globalMeshConfig).length > 0) {
    const localMeshConfig = isPlainObject(config.mesh) ? config.mesh : {};
    config = { ...config, mesh: mergePlainObjects(globalMeshConfig, localMeshConfig) };
  }
  // The per-install identity (34/story 00) — read from the MACHINE-WIDE GLOBAL home
  // (globalMeshPaths().identityPath, honoring AOF_GLOBAL_HOME) so one identity is shared
  // by every workspace on this machine and the global work store keyed on nodeId is
  // coherent. Read via the ONE tolerant sidecar read (readSidecar, 22/R2) — an absent/
  // torn/malformed file degrades to {} and never crashes loadWorkspace. Back-compat: a
  // machine that has not migrated still carries a LEGACY per-workspace sidecar
  // (.aof/mesh/identity.json under aofDir); when the global identity is absent we read
  // that as a fallback (read-only — the migrate up to global is a `work doctor` action,
  // never a silent load-time write into the global home). Precedence: global > legacy
  // per-workspace sidecar > committed config.mesh > absent (a later deriveNodeId mints
  // to the global home).
  const globalMesh = globalMeshPaths({ env });
  const globalIdentityPath = globalMesh.identityPath;
  let sidecarPath = globalIdentityPath;
  let sidecar = await readSidecar(globalIdentityPath);
  if (!(typeof sidecar.nodeId === "string" && sidecar.nodeId.length > 0)) {
    const legacyPath = sidecarPathFor(aofDir);
    const legacy = await readSidecar(legacyPath);
    if (typeof legacy.nodeId === "string" && legacy.nodeId.length > 0) {
      sidecar = legacy;
      sidecarPath = legacyPath;
    }
  }

  // Self-heal (ADR-004.5) — see healIdentitySidecar's own header for the predicate;
  // this is the ONE sanctioned load-time identity write (task 03's carve-out from
  // "loadWorkspace writes no file"), narrowly discriminated by the sidecar schema, and
  // it rewrites WHICHEVER identity we read (the global home, or a legacy sidecar still
  // in place). On the common path — same machine, same hostname — it is a pure read.
  const currentHostname = typeof hostname === "string" ? hostname : os.hostname();
  sidecar = await healIdentitySidecar({ sidecar, hostname: currentHostname, sidecarPath });

  // Overlay the sidecar's identity onto config.mesh in the RETURNED object ONLY — a
  // pure in-memory merge, no further disk write here. Precedence: sidecar > committed
  // (already read into config above) > absent (a later deriveNodeId call mints it).
  // nodeId and salt are overlaid INDEPENDENTLY (craft/architect review finding): a
  // nodeId-only sidecar must NOT clobber a present committed config.mesh.salt with
  // undefined — each key's own precedence (sidecar > committed-fallback > absent)
  // holds regardless of whether the OTHER key is present in the sidecar.
  if (typeof sidecar.nodeId === "string" && sidecar.nodeId.length > 0) {
    const meshOverlay = { ...config.mesh, nodeId: sidecar.nodeId };
    if (typeof sidecar.salt === "string" && sidecar.salt.length > 0) {
      meshOverlay.salt = sidecar.salt;
    }
    config = { ...config, mesh: meshOverlay };
  }
  // The ADVERTISED ADDRESS override (2026-07-27, the `direct` fabric's identity leg) —
  // overlaid on its OWN precedence, deliberately NOT nested under the nodeId branch
  // above: `mesh.address` is machine reachability, not identity derivation, so a node
  // that pinned only an address must still get it. It is the ONE home for the override
  // (mesh-fabric's selfAddress reads config.mesh.address; mesh:identity publishes the
  // SAME value as the descriptor's `host`), so the two never drift.
  //
  // WHY it exists: on `direct` a peer is found by resolving its advertised host, and a
  // guest can INHERIT its host machine's name (a WSL2 distro defaults to the Windows
  // hostname — measured: both answer `Win-Host-A`). Resolving that name from either
  // side returns the HOST, so without an explicit address the guest is unreachable and
  // its nodeId collides. `aof mesh identity --name <id> --address <ip>` breaks both.
  if (typeof sidecar.address === "string" && sidecar.address.length > 0) {
    config = { ...config, mesh: { ...config.mesh, address: sidecar.address } };
  }

  // Expose the MACHINE-WIDE identity write target (34/story 00) so every minting caller
  // (mesh:identity / mesh:heartbeat / the launcher) persists the id+salt to the SAME
  // global home this hydration read from — resolved with the SAME env, so a test that
  // injects AOF_GLOBAL_HOME through loadWorkspace gets a hermetic, machine-shared identity
  // for free. It is ALWAYS the global path (never the legacy sidecar); the legacy sidecar
  // is a read-only fallback here and is migrated up by `work doctor`, not by a mint.
  return { configPath, config, configFault, projectRoot, workDir, aofDir, identityPath: globalIdentityPath, globalMeshRoot: globalMesh.meshRoot };
}

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
export async function validateWork(workDir, config, scopeRef) {
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
        for (const problem of digestFindings(meta, await readFile(docPath, "utf8"))) add(docPath, problem);
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
