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
import { findProjectConfig, globalMeshPaths, globalWorkspacePaths } from "./workspace.mjs";
import { readJson } from "./fs.mjs";
// milestone 33 / story 00 (ADR-004, F-3203) — the per-install identity hydration
// seam. sidecarPathFor is the ONE sidecar-path builder (never re-derived here);
// readSidecar is the ONE tolerant sidecar read (22/R2, shared with every other
// sidecar reader/writer in node-identity.mjs); isSameHost + deriveNodeId are
// reused so the self-heal re-derive is the IDENTICAL precedence chain deriveNodeId
// itself uses, not a private re-derivation.
import { sidecarPathFor, readSidecar, isSameHost, deriveNodeId, isDerivationOf } from "./node-identity.mjs";
export {
  recordDoc, typeHasRecordDoc, parseFrontmatter, WORK_ITEM_SCHEMA_VERSION,
  readItemSchema, readItemVersion, rollbackItemStatus, setItemStatus, applyItemFrontmatter,
} from "@aof/work/records";
export { ITEM_RE, BACKLOG_ITEM_RE, BACKLOG_ROOT, ARCHIVE_ROOT, parseStorySpan } from "@aof/work/identity";
export { listItems, isLiveStreamRow, findWork, listStream } from "@aof/work/discovery";
export { isDependTarget, siblingDependencyNumber, siblingGate, isDependNumber, rewriteRefEntry, rewriteDependsEntries } from "@aof/work/dependencies";
export { nextWork } from "@aof/work/readiness";
import { digestContract } from "./work/digest-template.mjs";
import { validateWork as validateRecords } from "@aof/work/validation";

export function validateWork(workDir, config, scopeRef) {
  return validateRecords(workDir, config, scopeRef, { getDigestContract: digestContract });
}

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
