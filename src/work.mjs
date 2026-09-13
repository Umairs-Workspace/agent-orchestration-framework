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
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { findProjectConfig, globalMeshPaths, globalWorkspacePaths } from "./workspace.mjs";
import { readJson, writeText } from "./fs.mjs";
// milestone 33 / story 00 (ADR-004, F-3203) — the per-install identity hydration
// seam. sidecarPathFor is the ONE sidecar-path builder (never re-derived here);
// readSidecar is the ONE tolerant sidecar read (22/R2, shared with every other
// sidecar reader/writer in node-identity.mjs); sanitizeHostname + deriveNodeId are
// reused so the self-heal re-derive is the IDENTICAL precedence chain deriveNodeId
// itself uses, not a private re-derivation.
import { sidecarPathFor, readSidecar, sanitizeHostname, deriveNodeId, isDerivationOf } from "./node-identity.mjs";
// milestone 66 / story 00 (ADR-003 §1, ADR-002) — the ONE Gherkin reader, and the ONE
// acceptance-horizon predicate. Both are leaves this god-node now reaches by import
// rather than by a second hand-rolled copy: `checkFeature` below is a thin caller.
import { parseFeature } from "./feature-parse.mjs";
import { VALID_STATUS, isOpen, itemStatusEdges } from "./acceptance-horizon.mjs";

// milestone 62 gate (finding D-04) — "in-review" IS NOT SPELLED HERE, and only that word.
// This module has always carried four of the frozen five as literals and stayed under
// 66/FF-6602's leg (b), which fires on a file carrying ALL FIVE; the through-review walk
// added the fifth and made this a second home for the vocabulary.
//
// WHY THE FIX IS ONE LINE AND NOT A SWEEP. De-literalising the other sites LOOKS tidier and
// is wrong: `acd-status-rollback-bounded` reads `ROLLBACK_TARGETS` AS SOURCE TEXT and requires
// a literal Set, so a sweep trades one red control for another. The two controls are not in
// conflict — FF-6602 bans the complete vocabulary, not each word — and the honest fix is the
// word that crossed the line. Measured: with the sweep, `arch/status-rollback-bounded` goes red.
//
// Destructured in the order the contract freezes (`test/grade/acceptance-horizon.test.mjs` asserts
// `[...VALID_STATUS]` ORDERED, so a reorder in the leaf fails there, not silently here). Only
// the two words this one predicate needs are bound; the leading holes are the other three.
const [, , , IN_REVIEW, DONE] = [...VALID_STATUS];

// Work errors carry `.code`/`.status` (the command error contract) so a face maps
// them uniformly — matching src/command-error.mjs.
function workError(message, code, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

// `uat` is a top-level acceptance session: like a milestone it sits in the
// stream, carries `depends`, and gates downstream work — but it groups no
// stories (it references existing scenarios, it delivers no new behaviour).
// `spike` and `chore` (milestone 37 / ADR-001) are two more top-level DRIVERS,
// admitted the SAME way: they sit at the stream root, carry `depends`, group
// no stories, and are themselves the actionable unit — see `isDriver` and the
// `nextWork` item-is-the-work branch below.
// Exported (milestone 41 / ADR-001) — the ONE minimal touch of this god-node
// the whole 41 milestone requires: src/work/reindex.mjs consumes this SAME
// identity regex (never a re-derived copy) so a renamed folder it produces is
// guaranteed parseable by every one of work.mjs's 36 dependents. The value is
// unchanged; only the export keyword is added.
export const ITEM_RE = /^(\d+)_(milestone|story|task|uat|spike|chore)_([a-z0-9-]+)$/;
// milestone 127 / ADR-001 §2 — THE BACKLOG LEAF GRAMMAR, the second shape beside the item
// grammar and in the same home. An un-numbered driver under `backlog/**`: `<type>_<slug>`,
// identified by its slug (`findWork`'s free-text branch already admits it). `task` is
// deliberately absent — a task is never a backlog driver — and there is no number group, which
// is what keeps a numbered folder under `backlog/` a GROUP rather than an item (the walk below
// never consults ITEM_RE there). Exported for the same reason ITEM_RE is: doctor's orphan lane
// and the promote verb match against this binding, never a re-derived copy.
export const BACKLOG_ITEM_RE = /^(milestone|story|chore|spike|uat)_([a-z0-9-]+)$/;
// The two extra roots (127/ADR-001 §1), spelled ONCE. Neither name matches ITEM_RE, which is the
// whole of the compat story (§6): a pre-127 reader ignores both exactly as it ignores
// `TECH_DEBT.md` at the root today. Every other module that needs a root's name imports it —
// doctor's orphan lane, provenance's synchronous resolver — so a rename is one edit and the
// sweep in FF-12701 can hold "no other module carries the string".
export const BACKLOG_ROOT = "backlog";
export const ARCHIVE_ROOT = "archive";
const UNIVERSAL_TAGS = new Set(["@executable", "@manual", "@uat", "@bug", "@wip"]);
const FINDING_TAG_RE = /^@finding-[A-Za-z0-9-]+$/;
const MILESTONE_TAG_RE = /^@milestone-\d+$/i;

const sameNum = (a, b) => Number.parseInt(a, 10) === Number.parseInt(b, 10);

// THE STORY-GRAINED SCOPE — `NN/MM-PP`, the stories MM..PP (inclusive) of driver NN, and
// `NN/SS`, the one-story span `NN/SS-SS`. One parser, shared by the three surfaces that admit
// it: `findWork` (the ref an operator typed — which resolves `NN/SS` through its own earlier
// pair branch, so this parser never sees it there), `inRange`/`inSpan` (scoping `nextWork`'s
// walk) and `skippedEntries` (`src/commands/next.mjs`, resolving a scope to the ONE driver it
// names). Returns `{ driver, lo, hi }`, else null; a descending span parses and admits
// nothing, as `decideLoopScope` treats `53-52`.
//
// EXPORTED (story 86) so the command face shares this predicate rather than growing a fifth
// scope vocabulary of its own. An export costs `work.mjs` no new import, so the ADR-015 §5
// reach ceiling the module already sits at is untouched, and `parseStorySpan` is none of the
// four DISK READER symbols `acd-cache-read-surface-boundary` keeps off the control side.
//
// `NN/SS` IS A SPAN, admitted here at story 86: before it, `inRange` could not parse it and
// fell through to "no scope at all", so `aof work next 44/01` walked the WHOLE STREAM and
// answered with another milestone's stories. A bare story ref is the span of exactly itself —
// one rule, not a second narrowing beside the span's.
//
// NOT in `work-ref-scope.mjs` (the subtree-scope leaf) for two reasons: this module cannot
// import it — see `validateWork`'s comment on the ADR-015 §5 reach ceiling, which currently
// MEASURES its maximum — and that leaf serves validate/doctor/memory, whose scope vocabulary
// is deliberately not this one. A span is an EXECUTION scope; `work loop`'s own frozen guard
// (`LOOP_SCOPE_FORMS`) refuses story refs outright for the matching reason. The full argument
// is in `test/work/record/work-story-span-scope.test.mjs`.
export function parseStorySpan(ref) {
  const span = String(ref ?? "").trim().match(/^(\d+)\/(\d+)(?:-(\d+))?$/);
  if (!span) return null;
  const lo = Number.parseInt(span[2], 10);
  return {
    driver: Number.parseInt(span[1], 10),
    lo,
    hi: span[3] === undefined ? lo : Number.parseInt(span[3], 10),
  };
}

// STORY_GRAINED_RE — the shape that CLAIMS to be story-grained: a leading `NN/`. It is the
// refusal's reach in `inRange`, and it is deliberately narrower than "anything unparsed".
//
// The fall-through it guards is load-bearing for FREE-TEXT scopes (a slug), so refusing every
// string this module cannot parse would refuse legal scopes — the m59/R7 near-miss, where a
// refusal keyed on characters refused legal paths and would have failed every run rather than
// one. A slug is `[a-z0-9-]+` and carries no `/`, so nothing legal is inside this reach.
const STORY_GRAINED_RE = /^\d+\//;

// The admitted forms, named in the refusal so the operator can see what they typed instead of.
const ADMITTED_SCOPE_FORMS = "NN (a driver), NN-MM (a driver range), NN/SS (one story), NN/MM-PP (a story span), or a free-text slug";

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
  const hostnameChanged = sanitizeHostname(hostname) !== sanitizeHostname(sidecar.derivedFrom);
  // Trigger 2 (F-3302 — a derivation-RULE change self-migrates): the stored id is no
  // longer a valid derivation of its OWN recorded host under current rules (e.g. a
  // pre-`.local`-strip `umamis-mac-mini-local`). isDerivationOf recognises the
  // collision-suffixed / empty-stem forms, so a legitimate collision id is NOT churned
  // (the craft/architect regression). Self-terminating: after the heal the id IS a valid
  // derivation, so a second load is a keep.
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
  // hostname — measured: both answer `Umamis-MSI`). Resolving that name from either
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

async function readDirSafe(dir) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

// ------------------------------------------------------------ discovery ----

// THE OPTIONAL STREAM VIEW (milestone 43 / ADR-005) — the ONE seam through which the
// cache-first read module (`src/work/read.mjs`) reuses the four readers below instead of
// re-deriving their rules.
//
// `view` is PLAIN DATA built OUTSIDE this module — `{ items, meta }`, where `items` is a
// pre-built `listItems` set (the disk's items plus any the cache alone knows) and `meta` is
// a `Map<ref, { status?, title? }>` OVERLAY applied on top of each item's own frontmatter.
// This module imports NO cache module, opens no store and learns no wire vocabulary: the
// seam needs the readers, not the reverse (m41/ADR-001, reused verbatim — `work.mjs` is the
// 37-importer god-node and its blast radius must not grow). The `candidacyView` parameter
// on `nextWork` is the same device from milestone 26/ADR-005, and this is deliberately its
// twin rather than a second mechanism.
//
// ABSENT ⇒ BYTE-IDENTICAL. Every reader below behaves exactly as it did before this
// milestone when no view is passed, which is what the 37 unmigrated importers rely on and
// what 43/06 task 03 asserts behaviourally.

// ONE NUMBERED ROOT, walked flat with ITEM_RE — the stream root and (127/ADR-001 §4) the
// archive share this walk verbatim: a milestone's `stories/` is descended one level, nothing
// else is, and the row is `{ number, type, slug, name, dir, ref, parent }` in that order.
// `stamp` is the only thing the two roots differ by: `{}` at the root, so the row is
// byte-identical to what every reader froze before milestone 127, and `{ archived: true }`
// under the archive, where the location adds one flag and changes nothing else.
async function walkNumberedRoot(root, items, stamp) {
  for (const entry of await readDirSafe(root)) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(ITEM_RE);
    if (!match) continue;
    const [, number, type, slug] = match;
    const dir = path.join(root, entry.name);
    items.push({ number, type, slug, name: entry.name, dir, ref: number, parent: null, ...stamp });

    if (type === "milestone") {
      const storiesDir = path.join(dir, "stories");
      for (const child of await readDirSafe(storiesDir)) {
        if (!child.isDirectory()) continue;
        const sub = child.name.match(ITEM_RE);
        if (!sub) continue;
        const [, sNumber, sType, sSlug] = sub;
        items.push({
          number: sNumber,
          type: sType,
          slug: sSlug,
          name: child.name,
          dir: path.join(storiesDir, child.name),
          ref: `${number}/${sNumber}`,
          parent: number,
          ...stamp,
        });
      }
    }
  }
}

// THE BACKLOG WALK (127/ADR-001 §2) — recursive, and the type is in the folder name so no
// record doc is ever opened to classify. A directory that does NOT match the leaf grammar is
// a GROUP and is descended into; one that matches is a LEAF and is not (a backlog driver has
// no `stories/`, ADR-005 §4 — `promote` is the door into the stream, and a `stories/` under a
// leaf is doctor's orphan lane's to report). A group carries no semantics: it is the path
// shown in listings, forward-slashed on every platform so `--json` is byte-stable, `""` at
// the top. The row keeps the enumerator's seven keys — `number: null`, `ref: slug`,
// `parent: null` — and adds `backlog` and nothing else.
async function walkBacklogGroup(dir, group, items) {
  for (const entry of await readDirSafe(dir)) {
    if (!entry.isDirectory()) continue;
    const leaf = entry.name.match(BACKLOG_ITEM_RE);
    const child = path.join(dir, entry.name);
    if (!leaf) {
      await walkBacklogGroup(child, group === "" ? entry.name : `${group}/${entry.name}`, items);
      continue;
    }
    const [, type, slug] = leaf;
    items.push({ number: null, type, slug, name: entry.name, dir: child, ref: slug, parent: null, backlog: group });
  }
}

// Enumerate items by folder name only — no file reads. With a `view`, the pre-built item
// set REPLACES the disk scan (the view's builder has already done it, plus the merge).
//
// milestone 127 / ADR-001 §1 — THREE ROOTS, ONE FUNCTION, in this order: `<workDir>` (the
// live stream, rows byte-identical to before), `<workDir>/backlog/**` (un-numbered, grouped),
// `<workDir>/archive/` (numbered, out — flat, `ITEM_RE`, every row `archived: true`). Each root
// is walked only when it is a directory (`readDirSafe` answers `[]` for anything else), so a
// project with neither is byte-identical to today. This is the ONLY enumerator: a
// `listBacklog` beside it would be the third scanner ADR-001 exists to retire.
export async function listItems(workDir, { view } = {}) {
  if (Array.isArray(view?.items)) return view.items;
  const items = [];
  await walkNumberedRoot(workDir, items, {});
  // The root walk is total over whatever `readdir` refuses (a non-path, an absent dir — both
  // enumerate nothing), and the two sub-roots keep that contract: `path.join` throws on a
  // non-string where the walk used to answer `[]`, so the join is skipped rather than risked.
  const subRoot = (name) => (typeof workDir === "string" ? path.join(workDir, name) : null);
  await walkBacklogGroup(subRoot(BACKLOG_ROOT), "", items);
  await walkNumberedRoot(subRoot(ARCHIVE_ROOT), items, { archived: true });
  return items;
}

// THE ONE LIVE-ROW PREDICATE (127/ADR-002 §1) — the only place `number` and `archived` are
// read together as a SCHEDULING question. Defined over ENUMERATOR rows, which always carry
// `number` (null for a backlog row): a row is live when it has a number and is not archived.
// The walkers that answer "what is next" (`nextWork`, `listStream`'s default, `recent`
// through `work:list`) filter through it; the readers that answer "what is this ref"
// (`findWork`, validate, doctor, memory, depends resolution) do NOT — an archived item is
// still resolvable, still a `depends:` target, still validated. `!= null` is loose on
// purpose: `"00"` is a string and row 00 exists, so a truthiness test would drop it.
export function isLiveStreamRow(row) {
  return row.number != null && row.archived !== true;
}

// Resolve an item's record doc — the single file whose frontmatter carries the
// item's identity/status. For a milestone the flow is AOF.md-first: a milestone
// CONVERTED into aof (its pre-aof SPEC.md left untouched) is represented by an
// `AOF.md` digest, and that digest IS its record doc. A native milestone (no
// AOF.md) keeps SPEC.md. Stories/uat are unaffected — only milestones mint a
// digest. The validate schema is then chosen dynamically off the resolved doc
// (digest vs native — see validateWork).
export function recordDoc(item) {
  if (item.type === "milestone") {
    return existsSync(path.join(item.dir, "AOF.md")) ? "AOF.md" : "SPEC.md";
  }
  if (item.type === "story") return "STORY.md";
  if (item.type === "uat") return "SESSION.md";
  // milestone 37 / ADR-002 — spike/chore are single self-contained record docs
  // (no separate STATE.md, unlike milestone/uat). Neither is a milestone, so
  // these branches sit BEFORE the final `return null`.
  if (item.type === "spike") return "SPIKE.md";
  if (item.type === "chore") return "CHORE.md";
  return null;
}

// typeHasRecordDoc(type) — does an item of this TYPE carry a record doc at all? Derived
// from recordDoc above so the fact keeps one home: the types that carry none are exactly
// the ones whose branch there falls through to `null` (an adhoc top-level `task` is a
// folder holding one `.feature` — "a task has no status field"). A milestone's branch
// consults the folder for AOF.md-first, and always names one either way; every other
// branch is a pure type→filename map, so the folder is not needed to answer this.
export function typeHasRecordDoc(type) {
  return type === "milestone" || recordDoc({ type }) != null;
}

// Top-level "drivers" of the stream — items that sit at the root, carry
// `depends`, and participate in ordering/gating (milestones and uat sessions,
// and — milestone 37 / ADR-001 — spike and chore: same shape, they group no
// stories and are themselves the actionable unit).
const isDriver = (item) =>
  item.type === "milestone" || item.type === "uat" || item.type === "spike" || item.type === "chore";

// …and the set a `depends:` NUMBER may name, which is deliberately WIDER: a parentless story
// is a first-class top-level item, so `depends: [79]` naming one is a real edge. Written once
// and SHARED by every reader of that question — `validate` and the readiness walk disagreeing
// about which numbers resolve is how one reports a satisfied edge the other scores unmet.
// Separate from `isDriver` (which gates readiness and scheduling) on purpose: what a number
// can NAME and what drives a PHASE are different questions.
//
// EXPORTED (chore 104) because "written once and SHARED" was not reachable while it was a
// module-local `const`. `validate` and the readiness walk both live in this file and adopted it;
// doctor's coherence lane — the THIRD reader of the same question — could not share it even had
// it known to, so it kept asking `isDriver` and scored milestone 78's already-satisfied edge on
// the parentless story 79 as unmet. The doctor family takes it through the spine's re-export
// (`work-doctor.mjs`), which is how those lanes already receive item identity.
export const isDependTarget = (item) => isDriver(item) || (item.type === "story" && item.parent == null);

// Minimal frontmatter reader: `key: value`, inline lists `[a, b]`, quoted
// scalars. Block lists/maps are not needed — the only collection any record doc
// authors is `depends: [a, b]`. Inline FLOW MAPS `{ … }` are deliberately NOT
// parsed (18/ADR-007): routing intent lives in the per-folder `.integrations.json`
// descriptor, never milestone frontmatter, so this shared seam (the 14-importer
// god-node's parser) parses nothing brace-wrapped into an object.
export function parseFrontmatter(text) {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) return {};
  const out = {};
  for (const line of block[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    out[kv[1]] = parseScalarOrCollection(kv[2].trim());
  }
  return out;
}

// One frontmatter value: an inline list `[a, b]` or a quoted scalar. Nested
// collections are not parsed — one level of inline list is all the work stream
// authors. Inline FLOW MAPS `{ … }` are NOT parsed into an object (18/ADR-007 —
// the prior milestone-18 `notion: { parent: <key> }` extension was REVERTED): a
// brace-wrapped value is not a list, so it falls straight to the final
// quote-strip return and round-trips as its VERBATIM string (braces retained),
// routing nothing. This keeps the shared 14-importer seam minimal and de-risked.
function parseScalarOrCollection(value) {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((part) => part.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return value.replace(/^["']|["']$/g, "");
}

// One item's frontmatter, with the OPTIONAL view's overlay applied on top (ADR-005).
// Two shapes, and the difference matters:
//   · an item this node HAS on disk keeps its own frontmatter — `depends`, `created`,
//     everything — and the overlay replaces only the facts it carries (status/title). A
//     cache-authoritative status must never cost the driver its own `depends`, or a
//     migrated `next` would stop honouring gates it can read perfectly well.
//   · an item this node does NOT have (`dir == null` — a ref only the cache knows) has no
//     frontmatter to read, so the overlay IS the answer. No path is fabricated to go
//     looking for one.
async function readMeta(item, view) {
  const overlay = view?.meta?.get?.(item.ref);
  if (item.dir == null) return overlay ?? {};
  const doc = recordDoc(item);
  if (!doc) return overlay ?? {};
  let meta = {};
  try {
    meta = parseFrontmatter(await readFile(path.join(item.dir, doc), "utf8"));
  } catch {
    meta = {};
  }
  return overlay == null ? meta : { ...meta, ...overlay };
}

const asList = (value) => (Array.isArray(value) ? value : value == null || value === "" ? [] : [value]);

// ───────────────────────── milestone 65 / story 00 — A STORY'S `depends` IS DATA ────
//
// THE PROBLEM IT CURES, measured (65/RESEARCH.md). `depends` used to be built and
// validated only `if (isDriver(item))`, so a story's `depends` parsed and was discarded
// by BOTH readers. Story independence therefore lived only as italic prose in a
// milestone SPEC (`*(depends 00, 01)*`) and as ARCHITECTURE.md partition sections —
// nothing a command could read. With nothing recording what may safely run at once,
// one-at-a-time was the only SAFE order available, and vista-app-web's milestone 352
// paid 10h11m of a 25h12m span for it (six developer builds at 1.00× concurrency).
//
// A STORY'S `depends` NAMES A SIBLING — a story under the SAME parent — never a driver.
// Two spellings are accepted, and both mean the same edge:
//   · the bare two-digit sibling number, `depends: [00]`;
//   · the full ref, `depends: [40/01]`, whose milestone part MUST equal this story's
//     own parent. This spelling is not a concession: it is what every one of the twenty
//     story records already in this repo authors (`43/06 → [43/02, 43/03, 43/04]`), so
//     reading only the bare form would have flagged twenty correct records as dangling.
// A full ref naming ANOTHER milestone resolves to null — the edge is keyed WITHIN the
// parent, so a sibling number can never collide with a driver number.
//
// Returns the sibling's NUMBER (as authored text, compared with `sameNum`), or null when
// the text names something that is not a sibling of `parentNumber`. What each reader then
// DOES with a null is the whole design, and the two answers differ deliberately (the
// `next`/`item-lock` idiom, src/commands/next.mjs:8-14): `nextWork` IGNORES it, because a
// typo must never strand a milestone; `validateWork` REPORTS it, because a bad edge that
// nothing surfaces is how the typo survives. One rule, two renderings.
export function siblingDependencyNumber(dep, parentNumber) {
  const raw = String(dep ?? "").trim();
  if (raw === "") return null;
  const pair = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (pair) return sameNum(pair[1], parentNumber) ? pair[2] : null;
  return /^\d+$/.test(raw) ? raw : null;
}

// siblingGate(depends, story, siblings, statusOf) — one story's sibling edges, split into
// the two facts the two readers need: `unmet` (edges that resolve to a sibling that is not
// `done` — this story WAITS) and `unresolved` (edges that name no sibling at all).
// `statusOf(siblingItem)` is injected so `nextWork` can feed it the cache-overlaid status
// it already read, and `validateWork` — which only needs resolution — can ignore it.
export function siblingGate(depends, story, siblings, statusOf = () => null) {
  const unmet = [];
  const unresolved = [];
  for (const dep of asList(depends)) {
    const number = siblingDependencyNumber(dep, story.parent);
    const sibling = number == null ? null : siblings.find((candidate) => sameNum(candidate.number, number));
    if (sibling == null) {
      unresolved.push(String(dep));
      continue;
    }
    if (statusOf(sibling) !== "done") unmet.push(sibling.ref);
  }
  return { unmet, unresolved };
}

// storiesByParent(items) — the sibling index both readers resolve edges against, built
// once from the item set. Keyed by the parent's NUMERIC value (so "03" and "3" are one
// milestone), which is what makes "keyed within the parent" a property of the index
// rather than a rule each caller re-spells.
function storiesByParent(items) {
  const byParent = new Map();
  for (const item of items) {
    if (item.type !== "story" || item.parent == null || item.parent === "") continue;
    const key = String(Number.parseInt(item.parent, 10));
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(item);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10));
  }
  return byParent;
}

// -------------------------------------------------------- version model ----

// The current work-item record-doc schema (ADR-001, milestone 40) — the ONE
// exported integer constant declaring "the current document shape", mirroring
// GLOBAL_WORK_SCHEMA_VERSION's single-constant idiom (global-work-store.mjs:7).
// It lives HERE (not in a later registry module) because the reader/born-stamp
// (story 01) must consume it before the migration registry (story 02) exists.
// Bump this — and add a registered transform reaching it — when a migration
// changes the document shape.
export const WORK_ITEM_SCHEMA_VERSION = 1;

// Coerce a raw frontmatter `schema` scalar to a non-negative integer: a
// missing key or a non-numeric string reads as the pre-versioning baseline 0
// (ADR-003), mirroring readSchemaVersion's null/absent -> 0 treatment
// (global-work-store.mjs:80-87, parseInt + isFinite). Deliberately NOT clamped
// to WORK_ITEM_SCHEMA_VERSION: an item stamped AHEAD (schema: 2) must read 2,
// faithfully — story 03's staleness check depends on comparing the item's OWN
// schema against the current constant, not a clamped value.
function coerceSchemaVersion(raw) {
  if (raw === undefined || raw === null || raw === "") return 0;
  const version = Number.parseInt(String(raw), 10);
  // Non-negative by contract: a NaN or a malformed negative (never produced by
  // the born-stamp or a genuine older aof) both read as the baseline 0.
  return Number.isFinite(version) && version >= 0 ? version : 0;
}

// The version READER (ADR-001/ADR-003) — the public seam over readMeta's
// PRIVATE frontmatter read (`readMeta` itself stays unexported; `aof work list
// --json`'s 7-field shape is frozen and does not surface `schema`). Neither
// function widens `parseFrontmatter` (18/ADR-007 protected) — both keys
// already parse as raw scalars; the int coercion lives here, in the reader,
// not the shared parser.
//
// readItemSchema resolves the item's `schema` key to a non-negative integer
// (missing/non-integer -> the baseline 0).
export async function readItemSchema(item) {
  const meta = await readMeta(item);
  return coerceSchemaVersion(meta.schema);
}

// readItemVersion resolves the item's `aofVersion` key to a plain provenance
// STRING — never coerced to a number, never parsed for logic. Missing ->
// empty string (there is no numeric "baseline" concept for provenance).
export async function readItemVersion(item) {
  const meta = await readMeta(item);
  return typeof meta.aofVersion === "string" ? meta.aofVersion : "";
}

// ------------------------------------------------------ status lifecycle ----

// The lifecycle TABLE is not here: it lives in acceptance-horizon.mjs, beside the frozen
// five words whose keys it is (ADR-009/F — a second spelling of the vocabulary is a second
// home for it). THIS module is the item-frontmatter AUTHORITY: it owns the two guarded write
// faces below and the one surgical write they share, and it can never permit a move the
// imported table does not declare.

// The DOCUMENT's own fault code, raised by the one surgical writer below and shared by
// both faces (74/01). It is deliberately NOT either face's refusal: a caller that treats
// its own refusal as a sanctioned no-op must not thereby swallow a malformed record doc.
// Module-local, like ROLLBACK_TARGETS below — the code reaches callers as the thrown
// error's `code`, which is the channel every other refusal in this file already uses.
const RECORD_DOC_UNUSABLE = "record-doc-unusable";

// The legal rollback TARGETS (20/ADR-005): from in-progress, a transient reclaim
// rolls to not-started (the PRD's `in_progress → todo` map — re-offered by next); a
// genuine blocker rolls to blocked. Rolling FORWARD (→ in-review / → done) is the one
// move a failure/blocker rollback must never make (it would falsely accept un-done work).
const ROLLBACK_TARGETS = new Set(["not-started", "blocked"]);

// The FIRST programmatic item-frontmatter writer in the codebase (20/ADR-005) —
// work.mjs exported only READERS before this. A bounded status rollback the failed-run
// (work:run-complete --outcome failed) and reclaim (run-store:reclaimStaleRuns) paths
// CALL to leave the stream honest. Bounded HARD: it sets status ONLY from `in-progress`
// to not-started|blocked, NEVER to done/in-review; it touches ONLY the frontmatter
// `status` field (the record-doc body and every other frontmatter key — including
// `updated` — stay byte-identical); and it writes via the atomic fs.mjs:writeText
// temp+rename seam. It lives HERE, not in run-store — the 19/ADR-002 write-scope guard
// forbids the store writing any frontmatter; work.mjs is the item-frontmatter authority.
// `now` is accepted for caller-API symmetry but deliberately NOT written (bumping
// `updated` would violate the "only the status field changes" bound).
export async function rollbackItemStatus(item, toStatus, { now } = {}) { // eslint-disable-line no-unused-vars
  if (!ROLLBACK_TARGETS.has(toStatus)) {
    throw workError(`status rollback target must be not-started|blocked (got "${toStatus}")`, "forbidden-rollback", 400);
  }
  // Rollback fires ONLY from in-progress — the narrow reclaim/failure seam, not a
  // general status mutator. Any other from-state is left byte-unchanged, and
  // `updated` is never bumped (the "only the status field changes" bound).
  const written = await writeItemStatusLine(item, toStatus, {
    from: ["in-progress"],
    code: "rollback-not-applicable",
    notApplicable: (status) => `status rollback applies only from in-progress (item is "${status ?? "none"}")`,
    bumpUpdated: false,
  });
  // The frozen `{ ref, status }` result (20/ADR-005) — the shared writer's `from` is
  // dropped here rather than widening this face's contract: its from-state is a
  // constant (`in-progress`) and callers deep-equal the pair.
  return { ref: written.ref, status: written.status };
}

// setItemStatus(item, toStatus, { expectFrom, now }) — THE lifecycle-guarded item-status
// writer, and the forward half the stream never had. It shares ONE surgical write with
// the rollback face above (so there is still exactly one place that rewrites a status
// line) but takes its permission from ITEM_STATUS_EDGES rather than from the rollback's
// hard not-started|blocked bound. The two faces stay separate on purpose: the failure/
// reclaim path must be PROVABLY unable to write forward (a bug there would falsely accept
// un-done work), and a bound that lives in the general writer's argument list is a bound a
// caller can pass wrong.
//
// `expectFrom` narrows the door for a caller that knows which from-states its act
// legitimately covers — the `run.started` reactor advances only `not-started|blocked`, so
// a stray mint against an item already `in-review` cannot drag it back to the bench.
// Every refusal is CODED and writes nothing:
//   invalid-status              (400) the target is not one of the five lifecycle words
//   status-edge-not-applicable  (409) no legal edge from the item's current status —
//                                     including the self-edge an at-least-once redelivery
//                                     asks for, and an `expectFrom` miss
//   record-doc-unusable         (422) the DOCUMENT cannot carry a status line at all
//                                     (absent/unreadable/no frontmatter) — a fault, never
//                                     this face's refusal (74/01)
// Unlike the rollback face this DOES bump `updated:` (when the key exists), because a
// lifecycle move is a real event in the item's history and `work doctor`'s stale-updated
// check reads that field.
export async function setItemStatus(item, toStatus, { expectFrom = null, now } = {}) {
  if (!VALID_STATUS.has(toStatus)) {
    throw workError(`status must be one of ${[...VALID_STATUS].join("|")} (got "${toStatus}")`, "invalid-status", 400);
  }
  const allowed = expectFrom == null ? null : (Array.isArray(expectFrom) ? expectFrom : [expectFrom]);
  return await writeItemStatusLine(item, toStatus, {
    code: "status-edge-not-applicable",
    from: (status) => itemStatusEdges(status).includes(toStatus) && (allowed == null || allowed.includes(status)),
    notApplicable: (status) => {
      if (allowed != null && !allowed.includes(status)) {
        return `item ${item.ref} is "${status ?? "none"}" — this act moves an item to "${toStatus}" only from ${allowed.join("|")}`;
      }
      const edges = itemStatusEdges(status);
      return edges.length === 0
        ? `item ${item.ref} is "${status ?? "none"}" — it has no legal status move (asked for "${toStatus}")`
        : `item ${item.ref} is "${status ?? "none"}" — its legal moves are ${edges.join("|")} (asked for "${toStatus}")`;
    },
    bumpUpdated: true,
    now,
  });
}

// The ONE surgical status write both faces above share: read the record doc, check the
// from-state through the caller's own predicate, and replace ONLY the status line WITHIN
// the frontmatter block (plus `updated`, for the lifecycle face) — the body and every
// other key are reassembled byte-for-byte around it, via the atomic fs.mjs:writeText
// temp+rename seam. An item whose frontmatter carries no `status:` line at all cannot
// reach the write: a missing status has no legal from-state under either face's
// predicate, so it is refused rather than answered with a successful no-write.
//
// A DOC-SHAPE FAULT IS THE DOCUMENT'S, NOT THE TRANSITION'S (74/01, finding F-73-G). The
// three faults below — no record doc, unreadable, no frontmatter block — used to be thrown
// under the CALLER's code, so on the forward face a malformed record doc arrived as
// `status-edge-not-applicable` and on the rollback face as `rollback-not-applicable`. Both
// of those are their caller's SANCTIONED no-op (effects/table.mjs's two reactors), so the
// fault was absorbed as ordinary idempotence and never surfaced: a mint against an item
// whose STORY.md opens with the known `<!-- aof-generated: bundle -->` comment reported
// `{ skipped: true }` and moved nothing, forever. They raise `record-doc-unusable` instead
// — one code, from the one place that detects the fault, which fixes both faces at once and
// leaves each caller's own refusal vocabulary untouched.
async function writeItemStatusLine(item, toStatus, { from, code, notApplicable, bumpUpdated, now }) {
  const doc = recordDoc(item);
  if (!doc) {
    throw workError(`item ${item.ref} carries no record doc, so it has no status line to move`, RECORD_DOC_UNUSABLE, 422);
  }
  const docPath = path.join(item.dir, doc);
  let text;
  try {
    text = await readFile(docPath, "utf8");
  } catch {
    throw workError(`item ${item.ref}: its record doc ${doc} is absent or unreadable`, RECORD_DOC_UNUSABLE, 422);
  }
  const block = text.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!block) {
    // The frontmatter fence must be the FIRST line. The hand-authored trap worth naming by
    // itself is a doc whose fence is displaced by a LEADING COMMENT (the known
    // `<!-- aof-generated: bundle -->` copied off a template) or blank lines: its
    // frontmatter parses as nothing, which reads as "this item has no status" everywhere.
    // Bounded to exactly that shape — a `---` rule inside an ordinary body is not a
    // displaced fence, and must not be described as one.
    // Each alternative consumes at least one character, so the scan cannot loop on empty.
    const preamble = text.match(/^(?:\s|<!--[\s\S]*?-->)*/)[0];
    const displaced = preamble.length > 0 && /^---\r?\n/.test(text.slice(preamble.length));
    throw workError(
      displaced
        ? `item ${item.ref}: its record doc ${doc} opens with something before the frontmatter fence — the \`---\` must be the first line`
        : `item ${item.ref}: its record doc ${doc} has no frontmatter block`,
      RECORD_DOC_UNUSABLE,
      422,
    );
  }
  const status = parseFrontmatter(text).status;
  const permitted = typeof from === "function" ? from(status) : from.includes(status);
  if (!permitted) {
    const error = workError(notApplicable(status), code, 409);
    // The writer has just read the authoritative record doc. Carry that observed
    // state on a refusal so an idempotent command does not report the cache-first
    // resolver's older opinion as if it were the disk value that rejected the edge.
    error.detail = { status: status ?? null };
    throw error;
  }
  let rewritten = block[2].replace(/^(status:[ \t]*).*$/m, `$1${toStatus}`);
  if (bumpUpdated) rewritten = rewritten.replace(/^(updated:[ \t]*).*$/m, `$1${today(now)}`);
  const updated = block[1] + rewritten + block[3] + text.slice(block[0].length);
  await writeText(docPath, updated);
  return { ref: item.ref, status: toStatus, from: status ?? null };
}

// The record docs stamp DATES (`updated: 2026-06-30`), not timestamps — so an injected
// `now` (the established ISO-8601 test clock) is truncated to its date part rather than
// written whole, which would change the field's shape.
function today(now) {
  const iso = typeof now === "string" && now.length > 0 ? now : new Date().toISOString();
  return iso.slice(0, 10);
}

// ------------------------------------------------- frontmatter transforms --

// The transform-scoped frontmatter WRITER (ADR-004, milestone 40) — a SEPARATE
// export from rollbackItemStatus above, NOT a widening of it. rollbackItemStatus
// keeps its hard status-only, in-progress-> not-started|blocked bound untouched;
// this writer is the broader primitive a registered migration transform (story
// 02) calls to add/rename/re-value ANY frontmatter key.
//
// `mutate` receives the RAW inner frontmatter block text (the bytes between the
// `---` fences, exclusive) and returns the new raw block text — the SAME
// block-capture + slice idiom rollbackItemStatus uses above (`block[2]`
// in/out), never a parseFrontmatter+reserialize round-trip (that shared
// 14-importer parser drops comments/order/formatting — 18/ADR-007). The body —
// every byte after the closing `---` fence — and everything before the opening
// fence are reassembled byte-for-byte around the mutated block. `mutate` may be
// sync or async. Persists via the atomic fs.mjs:writeText temp+rename seam.
//
// It runs ONLY as the primitive a registered transform calls — it is not a
// public "edit any frontmatter" verb in its own right.
export async function applyItemFrontmatter(item, mutate) {
  const doc = recordDoc(item);
  if (!doc) {
    throw workError(`item ${item.ref} has no record doc to update`, "frontmatter-not-applicable", 409);
  }
  const docPath = path.join(item.dir, doc);
  let text;
  try {
    text = await readFile(docPath, "utf8");
  } catch {
    throw workError(`item ${item.ref} record doc is unreadable`, "frontmatter-not-applicable", 409);
  }
  const block = text.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!block) {
    throw workError(`item ${item.ref} record doc has no frontmatter`, "frontmatter-not-applicable", 409);
  }
  const rewrittenFrontmatter = await mutate(block[2]);
  // Reassembled byte-for-byte around the mutated block: the opening fence
  // (`block[1]`), the new block, the closing fence (`block[3]`), and every
  // byte of the body (`text.slice(block[0].length)`) are untouched by anything
  // other than the mutate callback itself.
  const updated = block[1] + rewrittenFrontmatter + block[3] + text.slice(block[0].length);
  await writeText(docPath, updated);
  return { ref: item.ref, doc };
}

// ----------------------------------------------------------------- find ----

// `query` is a structured ref (`NN`, `NN/SS`) or a free-text slug match.
// Semantic matching slots in at the lexical branch below.
export async function findWork(workDir, query, { view } = {}) {
  const items = await listItems(workDir, { view });
  const ref = (query ?? "").trim();
  let matches;

  if (/^\d+$/.test(ref)) {
    // A bare number is the top-level item at that slot — a milestone, a uat
    // session, or an adhoc story/task (numbers are unique among top-level items).
    matches = items.filter((item) => item.parent == null && sameNum(item.number, ref));
  } else {
    const pair = ref.match(/^(\d+)\/(\d+)$/);
    const span = pair ? null : parseStorySpan(ref);
    if (pair) {
      matches = items.filter(
        (item) => item.type === "story" && item.parent && sameNum(item.parent, pair[1]) && sameNum(item.number, pair[2]),
      );
    } else if (span) {
      // Sorted because a span is the one ref form resolving to MANY rows, and the caller
      // driving them needs the milestone walk's order, not the directory listing's.
      matches = items
        .filter((item) => item.type === "story"
          && item.parent
          && sameNum(item.parent, span.driver)
          && Number.parseInt(item.number, 10) >= span.lo
          && Number.parseInt(item.number, 10) <= span.hi)
        .sort((a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10));
    } else {
      const needle = ref.toLowerCase();
      // `name` is the on-disk FOLDER basename, so a ref only the cache knows has none —
      // and none is fabricated (ADR-010/R6.4). Its `slug` still matches free text.
      matches = items.filter(
        (item) => item.slug.toLowerCase().includes(needle) || (item.name ?? "").toLowerCase().includes(needle),
      );
    }
  }

  const rows = [];
  for (const item of matches) {
    const meta = await readMeta(item, view);
    const row = {
      ref: item.ref,
      type: item.type,
      slug: item.slug,
      status: meta.status ?? null,
      title: meta.title ?? null,
      parent: item.parent,
      dir: item.dir,
    };
    // 127/ADR-002 §3 — a resolving reader does NOT filter on the root: an archived ref still
    // answers, a backlog slug answers through the free-text branch above. The frozen seven
    // keys are widened ONLY on a row from a new root (DESIGN §facts): a live row is
    // byte-identical to before, so no consumer learns a second field name.
    if (item.number == null) {
      row.number = null;
      row.backlog = item.backlog ?? "";
    }
    if (item.archived === true) row.archived = true;
    rows.push(row);
  }
  return rows;
}

// ----------------------------------------------------------------- list ----

// The board's read model: the WHOLE stream serialised as a flat array, one
// element per `listItems` item, each carrying exactly the seven frozen contract
// fields `{ ref, type, slug, status, title, parent, dir }` (ARCHITECTURE
// ADR-002). Flat-with-`parent` — `parent` is the only tree edge (null at
// depth 0); the consumer (the board) derives the hierarchy from it.
//
// Order is deterministic depth-first preorder: top-level items sorted by number
// ascending, each milestone immediately followed by its stories sorted by
// number. `dir` is the absolute item directory, forward-slashed (the
// lock-manifest path convention) so the JSON is byte-stable across OSes.
//
// This is the single source of the `aof work list --json` contract; the board
// API (story 01) reuses it. Keep it a thin pass over `listItems` — no new
// traversal, no convenience fields.
//
// milestone 127 / ADR-002 §2, §5 — THE DEFAULT LISTING IS THE LIVE ROWS PLUS THE BACKLOG,
// and `all: true` appends the archive. "What is live" includes what is waiting, so a
// backlog row is in the default view; an archived row is not, and `--all` is the one door
// to it. The order is deterministic so `--json` is byte-stable: live rows as before (by
// number, a milestone followed by its stories), then backlog rows by group path then slug,
// then archived rows by number exactly as the live ones. The live path filters through
// `isLiveStreamRow` — the ONE predicate — rather than re-spelling the rule here.
export async function listStream(workDir, { view, all = false } = {}) {
  const items = await listItems(workDir, { view });

  const live = orderByNumber(items.filter(isLiveStreamRow));
  const backlog = items.filter((item) => item.number == null).sort(byGroupThenSlug);
  // An archived row is a NUMBERED row the predicate refuses — read that way round so the
  // flag is consulted in one place, and the listing cannot drift from the walkers' rule.
  const archived = all ? orderByNumber(items.filter((item) => item.number != null && !isLiveStreamRow(item))) : [];

  const rows = [];
  for (const item of [...live, ...backlog, ...archived]) {
    const meta = await readMeta(item, view);
    const row = {
      ref: item.ref,
      type: item.type,
      slug: item.slug,
      status: meta.status ?? null,
      title: meta.title ?? null,
      parent: item.parent,
      // A ref only the cache knows names a folder that is NOT on this node, so its `dir`
      // is null rather than a plausible-looking path nothing would resolve (ADR-010/R6.4).
      dir: item.dir == null ? null : item.dir.replaceAll("\\", "/"),
    };
    // The frozen seven keys, widened ONLY where the root is new (DESIGN §facts, ADR-006 §1):
    // `number: null` + `backlog` on a backlog row, `archived: true` on an archived one.
    if (item.number == null) {
      row.number = null;
      row.backlog = item.backlog ?? "";
    }
    if (item.archived === true) row.archived = true;
    rows.push(row);
  }
  return rows;
}

// The depth-first preorder over one NUMBERED root's rows: top-level items by number, each
// milestone immediately followed by its stories by number. Applied per root — the live rows
// and the archived rows separately — so a story never attaches to a same-numbered milestone
// across the archive line. Guards its own input: a row with no number is not in this order.
function orderByNumber(rows) {
  const numbered = rows.filter((row) => row.number != null);
  const byNum = (a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10);
  const ordered = [];
  for (const item of numbered.filter((row) => row.parent == null).sort(byNum)) {
    ordered.push(item);
    if (item.type === "milestone") {
      ordered.push(...numbered.filter((child) => child.parent === item.number).sort(byNum));
    }
  }
  return ordered;
}

// Backlog order (127/ADR-002 §5): group path, then slug — compared as PLAIN STRINGS in
// code-point order (`<`, never `localeCompare`), so the listing is byte-identical on every
// OS and locale. `""` (the top of the backlog) sorts before every named group.
function byGroupThenSlug(a, b) {
  if (a.backlog !== b.backlog) return a.backlog < b.backlog ? -1 : 1;
  if (a.slug !== b.slug) return a.slug < b.slug ? -1 : 1;
  return 0;
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

  for (const item of items) {
    const meta = recordDoc(item) ? await readMeta(item) : {};

    // A backlog driver is never a SOURCE either (127/ADR-003 §6): its `depends:` is a
    // planning note validated at promotion, so it enters no graph and gates nothing. Keying
    // it here would put a node at `NaN`.
    if (item.number != null && isDriver(item)) {
      const deps = asList(meta.depends).map((value) => Number.parseInt(value, 10));
      graph.set(Number.parseInt(item.number, 10), deps);
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

    // 3a. depends references resolve (to any top-level item). A backlog driver's entry is a
    //     planning note, not an edge (see the graph build above) — nothing is reported on it.
    if (item.number != null && isDriver(item)) {
      for (const dep of asList(meta.depends)) {
        if (!dependTargetNumbers.has(Number.parseInt(dep, 10))) {
          // The message names what is ACTUALLY admitted. It read "a milestone/uat item"
          // while spikes and chores had long been admitted too, so an author reading the
          // finding was told a narrower rule than the one being applied — and the fix it
          // implied (re-point at a milestone) was wrong for four of the five kinds.
          add(path.join(item.dir, recordDoc(item)), `depends "${dep}" does not resolve to a top-level item (a milestone, uat gate, spike, chore, or parentless story)`);
        }
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

// ----------------------------------------------------------------- next ----

function inRange(scopeRef) {
  if (!scopeRef) return () => true;
  const range = scopeRef.match(/^(\d+)-(\d+)$/);
  if (range) {
    const lo = Number.parseInt(range[1], 10);
    const hi = Number.parseInt(range[2], 10);
    return (num) => num >= lo && num <= hi;
  }
  if (/^\d+$/.test(scopeRef)) {
    const only = Number.parseInt(scopeRef, 10);
    return (num) => num === only;
  }
  // A STORY SPAN narrows the walk to the one driver it names; `inSpan` narrows its stories.
  // Placed AFTER the numeric forms so neither changes meaning: `44-46` is still a driver
  // range, `44` still one driver.
  const span = parseStorySpan(scopeRef);
  if (span) return (num) => num === span.driver;
  // A SCOPE THAT IS IGNORED WITHOUT SAYING SO IS WORSE THAN ONE THAT IS REFUSED (story 86,
  // TECH_DEBT item 49). The trailing fall-through below is the unscoped decision, and it used
  // to admit story-grained shapes it could not parse: `44/01-03x`, `44/`, and the en-dashed
  // `44/01–02` a document's auto-correct produces each walked the WHOLE STREAM and answered
  // with other milestones' stories, with no signal the scope had been dropped. `findWork`
  // answers `[]` for the same strings, so the two surfaces disagreed about what a
  // story-grained ref means — invisible until work had been done against the wrong one, and
  // the lane that consumes this answer dispatches worktrees and spawns developers.
  //
  // The refusal reaches EXACTLY the shapes claiming to be story-grained; a free-text scope
  // still falls through (see STORY_GRAINED_RE).
  if (STORY_GRAINED_RE.test(String(scopeRef).trim())) {
    throw workError(
      `scope "${scopeRef}" claims to be story-grained but is not a story ref or span — admitted forms: ${ADMITTED_SCOPE_FORMS}`,
      "invalid-scope",
      400,
    );
  }
  return () => true;
}

// The story half of a span scope: which of a driver's stories the walk may OFFER. Any other
// scope admits every story, so an unscoped/driver-scoped walk is byte-identical to before.
function inSpan(scopeRef) {
  const span = parseStorySpan(scopeRef);
  if (!span) return () => true;
  return (num) => num >= span.lo && num <= span.hi;
}

const ready = (item, status) => ({
  state: "ready",
  ref: item.ref,
  type: item.type,
  slug: item.slug,
  status: status ?? null,
  path: item.dir,
});

// The next actionable item, respecting `depends`: the first not-`done`
// top-level driver (milestone, uat session, spike, or chore) whose
// dependencies are all `done`. A milestone is drilled into its first not-`done`
// story; a uat session, spike, or chore is itself the actionable item (each
// groups no stories — running/resolving/ticking it IS the work; milestone 37 /
// ADR-001 treats spike/chore the uat way). Returns
// { state: "ready" | "blocked" | "done", ... }.
//
// The OPTIONAL third argument (milestone 26 / ADR-005, WIDENED milestone 27 /
// ADR-004 — mesh-aware next, INJECTED): `candidacyView` is a pre-computed,
// PLAIN-DATA view built OUTSIDE this module (the command layer composes it under
// its config gate, unifying the m26 lease view with the m27 routing verdict; this
// module imports NO mesh module) — a Map keyed by item ref, value
// { state?: "leased-live" | "leased-stale", holder?, routed?: "elsewhere" }; a ref
// absent from the map (or an absent map) is unleased/untargeted. ABSENT ⇒
// behaviour is byte-identical to the two-argument call (the mergePresence(disk,
// null) === disk idiom applied to next).
//
// THE PER-REF GUARD (ADR-004.2 — routing runs FIRST, the lease then arbitrates):
//   routed === "elsewhere"  ⇒ skipped (another node's work — never surfaced
//                              reclaimable here, short-circuits before the lease);
//   state === "leased-live" ⇒ skipped exactly as not-actionable (being worked, not
//                              here — the following candidate is offered);
//   state === "leased-stale"⇒ returned ready + { reclaimable: true, leasedBy }
//                              (next is a READ — the claim path reclaims, never next);
//   otherwise                ⇒ offered in its normal walk position (byte-identical
//                              to the pre-fold-in behaviour when no entry exists).
// A milestone whose every not-done story is skipped (routed-elsewhere OR
// lease-live) is NOT offered as ready-for-acceptance — the walk falls through to
// the honest nothing-actionable shape.
//
// milestone 27 / ADR-004.3 (the m26/ADR-007 fold-in) — the SAME guard now applies
// at EVERY ready-return: the uat driver return, the zero-story needs-break-down
// driver return, AND the story-loop returns (already candidacy-aware in m26). The
// milestone-ACCEPT fallthrough (all stories done) stays deliberately
// candidacy-BLIND — a genuinely-done milestone is not a claimable work ref, so a
// lease/directive entry for it is ignored (the carve-out).
export async function nextWork(workDir, scopeRef, { candidacyView, view, throughReview = false } = {}) {
  const items = await listItems(workDir, { view });
  // milestone 127 / ADR-002 §2 — THE WALK IS OVER LIVE ROWS. `next` answers "what is next",
  // and neither a backlog row (un-numbered, waiting for `promote`) nor an archived one (done
  // and moved out, whatever its status says) is ever proposed. The rule is the ONE predicate,
  // applied here rather than re-spelled: a status test standing in for it would be wrong —
  // an archived row is invisible to `next` regardless of its status.
  const drivers = items
    .filter(isLiveStreamRow)
    .filter(isDriver)
    .sort((a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10));

  // A `depends:` edge resolves over the DEPEND-TARGET set, never the driver set. Milestone 78
  // declares `depends: [52, 53, 79]`, and 79 is the parentless story `79_story_committed-loop-graph`:
  // resolving over `drivers` alone missed it, read its status as null, and scored an edge that was
  // already satisfied as unmet — blocking 78 on a story that was done. `validate` had been widened
  // for this exact pair and the walk had not, so the two answered differently about one edge.
  //
  // Deliberately NOT filtered through the predicate (127/ADR-002 §3): an archived dependency is
  // `done` and satisfies the edge it is named in — the archive is a location, not a status, and
  // the target's own status is what gates. Only a backlog row is excluded, and only because it
  // has no number for an edge to name.
  const dependTargets = items.filter((item) => item.number != null && isDependTarget(item));
  const statusCache = new Map();
  const dependTargetStatus = async (num) => {
    if (statusCache.has(num)) return statusCache.get(num);
    const item = dependTargets.find((d) => Number.parseInt(d.number, 10) === num);
    const status = item ? (await readMeta(item, view)).status ?? null : null;
    statusCache.set(num, status);
    return status;
  };

  const within = inRange(scopeRef);
  const scoped = drivers.filter((d) => within(Number.parseInt(d.number, 10)));
  // A span narrows WHICH STORIES may be offered and suppresses every driver-grained offer
  // below (accept, needs-break-down, item-is-the-work): it names a slice, not a milestone.
  const storyWithin = inSpan(scopeRef);
  const spanScoped = parseStorySpan(scopeRef) !== null;
  const siblingIndex = storiesByParent(items);
  let blocked = null;

  // m65/01 — THE READY SET. The walk no longer RETURNS at its first offer; it records
  // every offer it would have made and keeps walking. The head of `readySet` is therefore
  // BY CONSTRUCTION the item the pre-change walk returned (same order, same guards, same
  // annotations), and the answer stays that item's own keys with the set beside them —
  // additive, so a caller reading `result.ref` reads the same ref as before.
  const readySet = [];
  const offer = (answer) => { readySet.push(answer); };
  // …and the other half: what the walk STEPPED OVER, in the same five-key vocabulary the
  // command's held-scope report uses (ADR-010/R1.5), so the two merge into one `skipped`
  // list rather than two competing ones. Reported per MEMBER, not just for the head —
  // otherwise a set-shaped answer would silently drop everything it passed over.
  const skipped = [];
  const passOver = (ref, candidacy) => {
    skipped.push(candidacy?.routed === "elsewhere"
      ? { ref, state: "routed-elsewhere" }
      : { ref, state: "leased-live", holderNode: candidacy?.holder ?? null });
  };

  for (const driver of scoped) {
    const meta = await readMeta(driver, view);
    statusCache.set(Number.parseInt(driver.number, 10), meta.status ?? null);
    if (meta.status === "done") continue;

    const unmet = [];
    for (const dep of asList(meta.depends)) {
      if ((await dependTargetStatus(Number.parseInt(dep, 10))) !== "done") unmet.push(String(dep));
    }
    if (unmet.length > 0) {
      blocked ??= { state: "blocked", ref: driver.ref, type: driver.type, slug: driver.slug, status: meta.status ?? null, path: driver.dir, waitingOn: unmet };
      continue;
    }

    if (driver.type === "uat" || driver.type === "spike" || driver.type === "chore") {
      // A SPAN NAMES STORIES, so a driver grouping none admits nothing from one — otherwise
      // `32/01-03` offers driver 32 itself. Inside this branch, not beside it, so the
      // driver-type list stays written once.
      if (spanScoped) continue;
      // milestone 27 / ADR-004.3 — the uat driver return is now candidacy-aware
      // (before m27 this return was candidacy-BLIND — a peer's next double-offered
      // a live-leased/targeted-elsewhere uat ref). milestone 37 / ADR-001 (FF-3705,
      // honouring 26/ADR-007) — spike/chore are routed through this SAME
      // candidacy-guarded, item-is-the-work return, NOT a fresh unguarded one: they
      // group no stories, so the milestone drill-down path below would mis-classify
      // them as "needs break-down".
      const uatCandidacy = candidacyView?.get?.(driver.ref);
      if (uatCandidacy?.routed === "elsewhere" || uatCandidacy?.state === "leased-live") {
        passOver(driver.ref, uatCandidacy);
        continue; // another node's work, or being worked live — pass over, keep walking
      }
      if (uatCandidacy?.state === "leased-stale") {
        offer({ ...ready(driver, meta.status), reclaimable: true, leasedBy: uatCandidacy.holder });
        continue;
      }
      offer(ready(driver, meta.status)); // run the session
      continue;
    }

    // Live stories only — a live milestone's stories are live by construction, and the filter
    // is what keeps an archived story whose milestone happens to share this driver's number
    // (a `duplicate-driver-number` fault doctor reports) out of this walk.
    const stories = items
      .filter((item) => isLiveStreamRow(item) && item.type === "story" && item.parent === driver.number)
      .sort((a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10));

    if (stories.length === 0) {
      // Same rule as the guard above: a span asked for stories, so an un-broken-down
      // milestone answers with nothing rather than its own ref.
      if (spanScoped) continue;
      // milestone 27 / ADR-004.3 — the zero-story (needs-break-down) driver return
      // is now candidacy-aware (the SAME guard, applied at the SAME driver.ref key).
      const zeroStoryCandidacy = candidacyView?.get?.(driver.ref);
      if (zeroStoryCandidacy?.routed === "elsewhere" || zeroStoryCandidacy?.state === "leased-live") {
        passOver(driver.ref, zeroStoryCandidacy);
        continue;
      }
      if (zeroStoryCandidacy?.state === "leased-stale") {
        offer({ ...ready(driver, meta.status), reclaimable: true, leasedBy: zeroStoryCandidacy.holder });
        continue;
      }
      offer(ready(driver, meta.status)); // needs break-down
      continue;
    }

    // Every sibling's status, read ONCE up front — the m65/00 gate needs a story's
    // siblings' statuses, not just its own, and re-reading a record doc per edge would
    // turn an O(n) walk into an O(n²) one on a wide milestone.
    const storyMetas = new Map();
    for (const story of stories) storyMetas.set(story.ref, await readMeta(story, view));
    const siblings = siblingIndex.get(String(Number.parseInt(driver.number, 10))) ?? stories;
    // A continue walk ends at the Review gate, not acceptance. In that mode an
    // in-review sibling has completed the build contract: do not offer it again,
    // and let dependants build without waiting for the later verify/accept pass.
    const storyComplete = (status) => status === DONE || (throughReview && status === IN_REVIEW);
    const statusOf = (item) => {
      const status = storyMetas.get(item.ref)?.status ?? null;
      return storyComplete(status) ? "done" : status;
    };

    let candidacySkipped = false;
    let offeredHere = false;
    let firstWaiting = null;
    for (const story of stories) {
      // OUT OF SPAN — stepped over before any gate, so neither offered nor reported waiting.
      // What is deliberately NOT narrowed: `siblings`/`statusOf` above still see EVERY story,
      // so an in-span story depending on an out-of-span sibling still waits on it and is
      // still reported blocked naming it — the span picks what to build, never what the
      // milestone's `depends` edges mean.
      if (!storyWithin(Number.parseInt(story.number, 10))) continue;
      const storyMeta = storyMetas.get(story.ref);
      if (!storyComplete(storyMeta.status)) {
        // m65/00 — THE SIBLING GATE, and the IGNORING half of the split: an edge that
        // names no sibling (a typo, a renumber, a copied ref) resolves to nothing and is
        // stepped straight past, so it can never strand a milestone. `validate` reports
        // exactly that edge. An edge that DOES resolve to an unfinished sibling makes
        // this story wait — it is not offered, and it does not count as done.
        const gate = siblingGate(storyMeta.depends, story, siblings, statusOf);
        if (gate.unmet.length > 0) {
          firstWaiting ??= { story, meta: storyMeta, unmet: gate.unmet };
          continue;
        }
        const candidacy = candidacyView?.get?.(story.ref);
        if (candidacy?.routed === "elsewhere") {
          // Targeted at (or claimed to advertise) another node's capability — not
          // this node's work at all; short-circuits BEFORE the lease is even
          // consulted (never surfaced reclaimable here).
          candidacySkipped = true;
          passOver(story.ref, candidacy);
          continue;
        }
        if (candidacy?.state === "leased-live") {
          // Leased by a live peer — being worked, just not here: passed over exactly
          // as not-actionable; the flag guards the milestone-accept fallthrough below.
          candidacySkipped = true;
          passOver(story.ref, candidacy);
          continue;
        }
        if (candidacy?.state === "leased-stale") {
          // A stale peer's item is OFFERED in its normal walk position, annotated so
          // the caller knows a claim-path reclaim stands between it and the work.
          offer({ ...ready(story, storyMeta.status), reclaimable: true, leasedBy: candidacy.holder });
          offeredHere = true;
          continue;
        }
        offer(ready(story, storyMeta.status));
        offeredHere = true;
      }
    }
    // Any story offered here ⇒ the milestone is being worked, not accepted.
    if (offeredHere) continue;
    // m65/00 — A MUTUAL WAIT IS REPORTED, NEVER SILENTLY ACCEPTED. Every remaining story
    // waiting on a sibling (the degenerate case being a cycle) must NOT fall through to
    // the accept return: "everything here is waiting" and "everything here is done" are
    // different facts, and reporting the second over the first is how a cycle reads as a
    // finished milestone. It is `blocked`, at the STORY grain, naming the siblings.
    if (firstWaiting) {
      blocked ??= {
        state: "blocked",
        ref: firstWaiting.story.ref,
        type: "story",
        slug: firstWaiting.story.slug,
        status: firstWaiting.meta.status ?? null,
        path: firstWaiting.story.dir,
        waitingOn: firstWaiting.unmet,
      };
      continue;
    }
    // The false-accept guard: a candidacy-skipped story is NOT done — a milestone
    // whose remaining stories are all skipped (routed-elsewhere or leased) must not
    // be offered for acceptance.
    if (candidacySkipped) continue;
    // `--through-review` is the build-loop view. All stories reaching in-review
    // means this scoped walk is complete; offering the milestone here would cross
    // into acceptance, which belongs to `aof:verify`.
    if (throughReview) continue;
    // A SPAN NEVER ACCEPTS. In-span stories all done means the SLICE is finished, not the
    // milestone — stories outside it were never looked at, so offering the driver here would
    // send an operator to accept a milestone with unbuilt stories.
    if (spanScoped) continue;
    // The milestone-ACCEPT fallthrough (ADR-004.3 carve-out) stays candidacy-BLIND —
    // a genuinely-done milestone is not a claimable work ref; no lookup here.
    offer(ready(driver, meta.status)); // all stories done -- milestone needs accepting
  }

  // THE ANSWER IS ADDITIVE. The head's own keys are exactly what this function returned
  // before m65/01; `readySet`/`skipped` arrive beside them. `blocked` carries an EMPTY
  // set, so "blocked" can never be misread as "one thing is ready". `done` keeps its bare
  // `{ state: "done" }` shape verbatim — it is deep-equalled by m27's candidacy contract
  // (test/mesh/identity/mesh-candidacy-every-return.test.mjs), and there is nothing to act on anyway;
  // the command face normalises the two keys onto every state it emits.
  if (readySet.length > 0) return { ...readySet[0], readySet, skipped };
  if (blocked) return { ...blocked, readySet: [], skipped };
  return { state: "done" };
}
