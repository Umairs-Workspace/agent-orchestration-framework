// src/node-identity.mjs — deterministic node-id derivation + capability-descriptor
// assembly (milestone 22 / story 01 / ADR-003; PERSIST TARGET RE-POINTED milestone 33
// / story 00 / ADR-004, F-3203).
//
// A node advertises WHO it is and WHAT it can run as a DERIVED, REBUILDABLE record:
// a projection of the install's config + environment, regenerable at any time (the
// 10/13 rebuildable-index discipline). This module owns two pure-ish mechanics:
//
//   deriveNodeId    — the documented-default id derivation (ADR-003): an operator /
//                     previously-persisted mesh.nodeId wins verbatim; else the
//                     opaque node-<install-hash> (132 — never the hostname, so a run
//                     record's node key is safe to commit); a collision against
//                     another install's id widens that hash. The
//                     resolved id is PERSISTED — as of ADR-004, to the git-ignored
//                     PER-INSTALL SIDECAR `.aof/mesh/identity.json`, NEVER the
//                     committed config — on first derivation, so it is stable across
//                     publishes (a hostname rename never churns the id) and
//                     operator-overridable (a sidecar-pinned id, set directly, wins
//                     verbatim and is never auto-healed — node-identity.mjs:74-78).
//
//   assembleDescriptor — assembles the SEVEN-key capability descriptor (132/02 added
//                     `hostname`, the fabric join key). It READS
//                     config + environment and NEVER writes (only deriveNodeId's
//                     first-publish persist writes). Empty runtimes assemble as []
//                     (an honest minimal install), never absent / a crash.
//                     `skills` LEFT the descriptor in m34/story 02 by operator directive
//                     (see assembleDescriptor's own header for the reason); this summary
//                     still advertised seven keys and an empty `skills` array until 59/01
//                     re-armed the suite that would have contradicted it.
//
// White-box / INJECTABLE: hostname + salt are passed in so the derivation + collision
// scenarios are testable without touching the real machine (the
// Build-notes injectability requirement). The id stays deterministic and [a-z0-9-]-only.
//
// Persisting the sidecar routes through the ONE sidecar read-merge-write
// (writeSidecarPatch, below — 22/R2: one writer per config subtree), re-pointed from
// the committed config and widened to the { nodeId, salt, derivedFrom, pinned }
// schema (the task-03 self-heal discriminator): readSidecar → shallow-merge a patch →
// writeText (2-space + trailing \n), idempotent (a no-op patch never rewrites). Every
// sidecar writer (persistNodeId, migrateIdentity, commands/mesh-identity.mjs's
// resolveInstallSalt) shares this ONE function. The committed config is never touched
// by the sidecar persist (ADR-004.2/.3) — a fresh derive leaves it byte-unchanged.
import path from "node:path";
import crypto from "node:crypto";
import { readJson, writeText } from "./fs.mjs";

// The ONE sidecar-path builder (ADR-004.1): `.aof/mesh/identity.json`, anchored on
// the ALREADY-computed `aofDir` (work.mjs:57) — never a hard-coded machine path.
// Every caller that needs the sidecar location (loadWorkspace's hydration, the
// mesh:identity / mesh:heartbeat commands, the doctor migrate action) derives it
// from `aofDir` through this ONE function, so the path is never duplicated/drifted.
export function sidecarPathFor(aofDir) {
  return path.join(aofDir, "mesh", "identity.json");
}

// The ONE sidecar read (22/R2 — one read-merge-write helper per config subtree,
// applied to the sidecar too): tolerant, degrading a torn/absent/malformed sidecar to
// {} rather than throwing. Every reader of the sidecar (persistNodeId, migrateIdentity,
// resolveInstallSalt in commands/mesh-identity.mjs, loadWorkspace's hydration) goes
// through this SAME function — no second hand-rolled readJson/catch idiom.
export async function readSidecar(sidecarPath) {
  try {
    return await readJson(sidecarPath);
  } catch {
    return {};
  }
}

// The ONE sidecar read-merge-write (22/R2): reads the current sidecar, shallow-merges
// `patch` over it (a `undefined`-valued patch key DELETES that key — so a caller can
// retire e.g. `pinned` on a re-derive, mirroring persistNodeId's own `delete
// next.pinned`), and writes back ONLY if the resulting bytes actually differ
// (idempotent — a no-op patch never rewrites the file, the SAME guarantee every
// sidecar writer already promised individually). Returns the resulting (possibly
// unwritten) sidecar object either way, so a caller can read the merged state without
// a second disk round-trip. `persistNodeId`, `migrateIdentity`, and
// `resolveInstallSalt` (commands/mesh-identity.mjs) all route through this ONE
// function — a config subtree gets exactly one writer (22/R2 / 06/R2).
export async function writeSidecarPatch(sidecarPath, patch) {
  const sidecar = await readSidecar(sidecarPath);
  const next = { ...sidecar };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  const keys = new Set([...Object.keys(sidecar), ...Object.keys(next)]);
  let unchanged = true;
  for (const key of keys) {
    if (sidecar[key] !== next[key]) {
      unchanged = false;
      break;
    }
  }
  if (unchanged) return sidecar; // already matches — no rewrite.
  await writeText(sidecarPath, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

// Sanitize a raw hostname to a path-safe, human-readable stem (ADR-003): lowercase,
// strip the macOS mDNS `.local` suffix (F-3302, below), collapse every RUN of
// non-[a-z0-9-] characters to a SINGLE "-", trim leading / trailing "-". An all-illegal
// hostname sanitizes to "". digits + hyphens are preserved.
//
// Since 132 no caller turns a MACHINE's hostname into an id with this. It sanitizes an
// OPERATOR-supplied name (`aof mesh identity --name`) and answers isDerivationOf's
// legacy-format question.
//
// F-3302 (milestone 33 / story 01 verify): macOS `os.hostname()` carries the mDNS
// `.local` suffix (`Umamis-Mac-mini.local`), but Tailscale reports the SHORT machine
// name (`umamis-mac-mini`). Without stripping, the aof nodeId derives to
// `umamis-mac-mini-local` and the ADR-002.2 fabric peer→nodeId join (which matches the
// Tailscale HostName / DNSName label) leaves the mac UNJOINED — "see every node" breaks
// for macOS. Stripping a trailing `.local` makes the derived id match Tailscale's short
// name so the join holds on real cross-OS hardware.
export function sanitizeHostname(hostname) {
  return String(hostname ?? "")
    .toLowerCase()
    // Strip the macOS mDNS `.local` suffix so the id matches Tailscale's short HostName.
    .replace(/\.local$/, "")
    // Each run of illegal chars → a single "-"…
    .replace(/[^a-z0-9-]+/g, "-")
    // …then collapse any run of "-" (including pre-existing hyphens that now abut the
    // substituted ones, e.g. "--__--" → "-") to ONE "-", so a separator RUN is a
    // single "-" (the feature example `umami--__--desktop` → `umami-desktop`).
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

// A short, STABLE per-install hash, derived deterministically from the install-local
// salt, so two installs on one machine differ and a given install's id is stable across
// re-derivation. 4 hex chars is ample disambiguation for a small fleet and keeps the id
// legible. (Before 132 the same hash also suffixed a colliding hostname stem — the
// legacy form isDerivationOf still recognises.)
export function installHash(salt) {
  return saltDigest(salt).slice(0, 4);
}

// The SAME digest as installHash, widened to 8 hex chars — the collision arm (132/00):
// an opaque id already claimed by another install widens rather than reaching for the
// hostname, so the escape hatch never reintroduces the disclosure it replaced.
function widenedInstallHash(salt) {
  return saltDigest(salt).slice(0, 8);
}

function saltDigest(salt) {
  return crypto.createHash("sha256").update(String(salt ?? "")).digest("hex");
}

// The SHAPE of an opaque id — `node-` + 4 or 8 hex chars — with no salt to check it
// against. For a reader that sees ids from many installs (the run-record fitness
// function, 132/03); isOpaqueNodeId is the per-install answer.
export const OPAQUE_NODE_ID_SHAPE = /^node-(?:[0-9a-f]{4}|[0-9a-f]{8})$/;

// isOpaqueNodeId(nodeId, salt) — is this id one of the opaque forms deriveNodeId
// produces for THIS salt (132/01)? The narrow question "is this id safe to commit":
// neither form carries a machine stem. PURE over its two arguments.
export function isOpaqueNodeId(nodeId, salt) {
  return nodeId === `node-${installHash(salt)}` || nodeId === `node-${widenedInstallHash(salt)}`;
}

// isSameHost(a, b) — do two raw hostnames name the same machine, modulo case, the macOS
// `.local` suffix and separator runs? The self-heal's copied-.aof trigger compares the
// current machine against the sidecar's recorded derivation host with this, so the
// comparison lives beside the sanitizer it uses rather than in the caller (132/00 — no
// caller outside this module and the `--name` path sanitizes a hostname).
export function isSameHost(a, b) {
  return sanitizeHostname(a) === sanitizeHostname(b);
}

// isDerivationOf(nodeId, hostname, salt) — could `nodeId` have been derived for this
// hostname+salt, under the CURRENT rules or the ones before them? The self-heal's
// stale-format trigger asks exactly that, and re-derives only an id NO rule could have
// produced — e.g. a pre-F-3302 `umamis-mac-mini-local` after the `.local` strip landed.
//
// Two arms (132/01). CURRENT: the opaque forms (isOpaqueNodeId), whatever the host.
// LEGACY: the bare sanitized stem and the collision-suffixed `<stem>-<installHash>` that
// rule (2) produced until 132. The legacy arm is RECOGNITION, not derivation — no code
// path produces a stem-shaped id any more — and it exists so that retiring rule (2) does
// not make every live node read stale-format on its next load and silently re-identify
// mid-soak, orphaning the credentials keyed by its id. Moving a node to the opaque form
// is `aof mesh identity --reidentify`, a deliberate act.
export function isDerivationOf(nodeId, hostname, salt) {
  if (isOpaqueNodeId(nodeId, salt)) return true;
  const stem = sanitizeHostname(hostname);
  if (stem.length === 0) return false;
  return nodeId === stem || nodeId === `${stem}-${installHash(salt)}`;
}

// Derive THIS node's id under the ADR-003 documented-default rules, in precedence:
//   1. An operator-set / previously-persisted config.mesh.nodeId wins VERBATIM —
//      never re-derived, never overwritten (the derivation is a default, not a mandate;
//      persistence is what makes the id stable across a hostname rename). Post-ADR-004
//      this pin is read off `config.mesh.nodeId` exactly as before — the CALLER
//      (loadWorkspace's hydration) is what changes WHERE that value comes from (the
//      sidecar overlay, not the committed file); deriveNodeId's own precedence chain
//      is unchanged.
//   2. Else the OPAQUE form, node-<install-hash> — whatever the machine is called. Rule
//      (2) was "the sanitized hostname stem" until 132, which made every run record's
//      `node` a machine name; a derived id is now a function of the salt alone, and the
//      hostname is only RECORDED (derivedFrom, below), never spelled into the id.
//   3. (Retired with rule 2 — the empty-stem fallback is no longer a special case.)
//   4. A collision (the opaque id is already taken by a DIFFERENT install — supplied via
//      takenIds) → the SAME hash widened to 8 chars. Deterministic from salt, so stable.
//   5. The resolved id is persisted to the git-ignored PER-INSTALL SIDECAR (ADR-004.2),
//      NEVER the committed config, when a sidecarPath is supplied AND no id was already
//      pinned — so later derivations reuse it. (Persistence is skipped when no
//      sidecarPath is given — the in-memory derive.) The sidecar also records the
//      hostname the derivation RAN ON (derivedFrom) — the self-heal discriminator that
//      distinguishes a derived id from an operator-pinned one. It lives in the aof home
//      and reaches no commit.
//
// opts: { config, hostname, salt, takenIds?, sidecarPath? }. Returns the resolved id.
export async function deriveNodeId({ config = {}, hostname, salt, takenIds = [], sidecarPath } = {}) {
  // (1) A pinned id (operator-set or previously persisted) wins verbatim.
  const pinned = config?.mesh?.nodeId;
  if (typeof pinned === "string" && pinned.length > 0) {
    return pinned;
  }

  // (2) The opaque form; (4) a collision widens the same hash.
  let id = `node-${installHash(salt)}`;
  if (new Set(takenIds).has(id)) {
    id = `node-${widenedInstallHash(salt)}`;
  }

  // (5) Persist to the sidecar on first derivation so the id is stable across
  // publishes (a later hostname rename never churns it — the self-heal in task 03 is
  // the DELIBERATE exception, gated on a mismatch, not every load). Read-merge-write
  // the WHOLE sidecar object (the headroom idiom, re-pointed) — the committed config
  // is never touched here.
  if (sidecarPath) {
    await persistNodeId(sidecarPath, id, salt, { derivedFrom: hostname });
  }
  return id;
}

// Persist the resolved id + salt to the git-ignored sidecar via the ONE sidecar
// read-merge-write (writeSidecarPatch, ADR-004.1/.2 — re-pointed from the committed
// config, 22/R2 — one writer per subtree): mutates ONLY { nodeId, salt, derivedFrom }
// (preserving no unrelated sibling — the sidecar carries ONLY per-install identity,
// unlike the committed config's mesh subtree which also carries fleet-shared keys),
// re-serialised in the project's 2-space + trailing-newline style. Idempotent (via
// writeSidecarPatch): an already-matching { nodeId, salt, derivedFrom } is left
// untouched (so a re-derivation does not rewrite the sidecar). `derivedFrom` records
// the hostname the derivation RAN ON (not the resolved id) — task 03's self-heal
// discriminator; when supplied, it also RETIRES a stale `pinned` flag (undefined
// deletes the key via writeSidecarPatch) — a caller that pins an id directly (never
// through this fn) is unaffected when derivedFrom is omitted. Exported for white-box
// reuse / tests (mirrors persistNodeId's original injected-path precedent).
export async function persistNodeId(sidecarPath, id, salt, { derivedFrom } = {}) {
  await writeSidecarPatch(sidecarPath, {
    nodeId: id,
    salt,
    ...(typeof derivedFrom === "string" ? { derivedFrom, pinned: undefined } : {}),
  });
}

// migrateIdentity(configPath, sidecarPath) — milestone 33 / story 00 (ADR-004.4,
// F-3203's Definition-of-Done). Moves a LEGACY committed mesh.nodeId/mesh.salt to the
// git-ignored sidecar and STRIPS both keys from the committed config, turning the
// acd-mesh-identity-not-committed fitness green. A plain exported unit taking BOTH
// paths as injected args (mirrors persistNodeId's own injected-path precedent) — no
// prompt dependency, hermetic, callable directly by a test or a thin `work doctor
// --fix`-style CLI wrapper.
//
//   - COMMITTED-PRESENT (mesh.nodeId and/or mesh.salt on disk): merge them into the
//     sidecar (read-merge-write, preserving any sidecar sibling — derivedFrom/pinned
//     survive a migrate exactly as persistNodeId's read-merge-write would), then
//     STRIP only nodeId/salt from the committed config's mesh block — every FLEET-
//     SHARED sibling key (relay.controlNode, fabric, …) is preserved byte-equivalent
//     (the config-editor-whitelist hazard this story flags).
//   - ALREADY-MIGRATED (no committed identity, a sidecar already present) or ABSENT
//     (neither committed identity nor a sidecar): a clean, byte-level NO-OP — neither
//     file is rewritten (persistNodeId-style idempotence: only write when the
//     resulting bytes actually change).
//
// Returns { migrated: boolean } — true iff a rewrite actually happened (so a caller,
// e.g. a future `--fix` face, can report whether anything moved).
export async function migrateIdentity(configPath, sidecarPath) {
  let config = {};
  try {
    config = await readJson(configPath);
  } catch {
    config = {};
  }
  const mesh = config.mesh && typeof config.mesh === "object" ? config.mesh : {};
  const hasCommittedIdentity = "nodeId" in mesh || "salt" in mesh;
  if (!hasCommittedIdentity) {
    return { migrated: false }; // absence-tolerant: nothing to migrate, no-op.
  }

  // Merge the committed identity into the sidecar via the ONE sidecar read-merge-write
  // (writeSidecarPatch, 22/R2) — preserves any sidecar sibling (derivedFrom/pinned)
  // already present; only the keys the committed config actually carries are patched.
  const patch = {};
  if ("nodeId" in mesh) patch.nodeId = mesh.nodeId;
  if ("salt" in mesh) patch.salt = mesh.salt;
  await writeSidecarPatch(sidecarPath, patch);

  // Strip ONLY nodeId/salt from the committed config's mesh block — every fleet-
  // shared sibling key survives byte-equivalent.
  const { nodeId: _nodeId, salt: _salt, ...remainingMesh } = mesh;
  const nextConfig = { ...config, mesh: remainingMesh };
  await writeText(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`);
  return { migrated: true };
}

// migrateIdentityToGlobal(legacySidecarPath, globalIdentityPath) — milestone 34 / story
// Global identity migration: move a LEGACY per-workspace identity sidecar (.aof/mesh/identity.json under a
// project's aofDir, 33/ADR-004) UP into the machine-wide global identity home
// (globalMeshPaths().identityPath), so one identity is shared by every workspace on this
// machine. Idempotent and non-clobbering:
//   - the legacy sidecar carries an identity AND the global home does NOT yet: copy the
//     legacy { nodeId, salt, derivedFrom, pinned } into the global home (read-merge-write,
//     writeSidecarPatch) and REMOVE the legacy file (so it can never diverge from global);
//   - the global home ALREADY carries an identity: the global one WINS — just remove the
//     now-redundant legacy sidecar (never overwrite a machine identity from a per-project
//     copy that may have travelled on clone);
//   - no legacy identity present: a clean byte-level NO-OP (neither file touched).
// Returns { migrated: boolean } — true iff anything was written/removed.
export async function migrateIdentityToGlobal(legacySidecarPath, globalIdentityPath) {
  const legacy = await readSidecar(legacySidecarPath);
  const hasLegacyIdentity = typeof legacy.nodeId === "string" && legacy.nodeId.length > 0;
  if (!hasLegacyIdentity) return { migrated: false };

  const global = await readSidecar(globalIdentityPath);
  const globalHasIdentity = typeof global.nodeId === "string" && global.nodeId.length > 0;
  if (!globalHasIdentity) {
    // Copy the legacy identity up to the global home (only the identity keys it carries).
    const patch = {};
    for (const key of ["nodeId", "salt", "derivedFrom", "pinned"]) {
      if (key in legacy) patch[key] = legacy[key];
    }
    await writeSidecarPatch(globalIdentityPath, patch);
  }
  // Remove the now-redundant per-workspace sidecar (global is the single source now).
  const { rm } = await import("node:fs/promises");
  await rm(legacySidecarPath, { force: true });
  return { migrated: true };
}

// Assemble this node's descriptor — nodeId, host, os, runtimes, aofVersion, publishedAt.
// A REBUILDABLE projection: it READS config + environment and writes NOTHING. Empty
// runtimes assemble as [] (honest minimal install), never absent / a crash. publishedAt
// is an ISO-8601 UTC trailing-Z instant (now ?? new Date().toISOString()).
//
// 34/story 02 (operator directive): `skills` is REMOVED — the aof bundle's resource ids
// were advertised as node "skills", which is useless from a mesh-identity perspective
// (every node ships the same bundle; it says nothing about the node).
//
// The id is taken AS-GIVEN (the caller derives it via deriveNodeId first, which owns
// the first-publish persist) so assembly stays a pure projection with no write.
//
// 132/02 — `hostname` is an ADDITIVE key: the machine's real name as os.hostname()
// reports it (the `machineName` input), distinct from `host`, the advertised DIAL
// address (the `hostname` input — an `--address` override when pinned). The fabric join
// matches a peer's HostName against it now that an id no longer spells one. Always
// emitted, "" when unknown, so the shape is stable. Node records live in the aof home,
// never a checkout, which is why a machine name may sit here and not in a run record.
export function assembleDescriptor({ nodeId, hostname, machineName, platform, runtimes, aofVersion, now } = {}) {
  return {
    nodeId: String(nodeId ?? ""),
    host: String(hostname ?? ""),
    hostname: String(machineName ?? ""),
    os: String(platform ?? ""),
    runtimes: Array.isArray(runtimes) ? [...runtimes] : [],
    aofVersion: String(aofVersion ?? ""),
    publishedAt: now ?? new Date().toISOString(),
  };
}
