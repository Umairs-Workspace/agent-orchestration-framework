// src/mesh/worker-repo-admission.mjs — SEAM 1 of item 83's four (119/04, ADR-007; ADR-005;
// ADR-003 §4; ADR-002).
//
// REPO ADMISSION: one question, asked once — *may this worker run this workspace's work, and
// where?* — answered by the marker/membership join, then by clone-on-miss when the join misses,
// then by pointing the workspace at the assigned workspace's own scoped checkout.
//
// WHY IT IS A MODULE NOW. `worker-execution.mjs` was 2,482 lines with 56 dependents against 30
// imports, and this was its largest single block — 551 lines, 253 code against 256 comment. A hub
// with high fan-in AND high fan-out has no side you can change cheaply; a change to how a worker
// admits a repo should not be a change to the single point every mesh worker behaviour passes
// through.
//
// THIS MODULE IS A LEAF (ADR-007). It reaches nothing in `worker-execution.mjs` — not directly, and
// not through a third module — and every collaborator that could point back at the parent
// (`resolveWorkspaceCloneUrl`, the clone exec, the credential and clone-url pulls, the clock, and
// the fault reporter) arrives as an INJECTED seam rather than as an import. The split is only a
// split if the dependency runs one way.
//
// THE ENTRY POINTS ANSWER; THEY DO NOT REPORT. The handler's admission block closed over eight
// injected seams and reassigned its `ws` twice — the in-memory published-marker overlay after a
// clone, and the foreign-workspace repoint — so a void call could not have carried the decision
// out. Both entry points answer in `composeDirectiveLaunchOptions`'s own delivered idiom:
//
//     { ws }                          // admitted, carrying the workspace it resolved
//     { refused: true, code, detail } // never anything a caller could still act on
//
// and `reportAssignmentFailure` / `reportSettled` stay the handler's alone. That is what keeps
// every coded outcome identical while the decision moves.
//
// WHY TWO ENTRY POINTS AND NOT ONE. The `accepted` frame the worker streams sits BETWEEN the two:
// it is sent once the guard passes and BEFORE the scoped-checkout repoint, so a repoint that fails
// settles `accepted -> failed` on the wire today. Folding both decisions into one call would either
// move that send into this module — a wire status is not this module's concern — or reorder it, and
// `assignment-checkout-unresolved` would stop being preceded by an `accepted`. The seam is cut where
// the wire order already is.
//
// THE CREDENTIAL DISCIPLINE TRAVELLED WITH THE CLONE, AND SO MUST ITS CONTROLS (ADR-003 §4). The
// two delivered security controls over this code — `acd-worker-clone-target-scoped` and
// `acd-worker-clone-no-credential-persisted` — assert NEGATIVES over a module's source text, and a
// negative over a subject that no longer contains a clone passes while asserting nothing. Both now
// name this file and both assert they read a subject that actually clones.
//
// `buildAskpassShim` and `redactCredentialFromText` are exported for the PUSH path, which stays in
// the parent as seam 3: it imports them inward from here. Copying them would be two spellings of one
// credential discipline, which is the named failure mode of this cut.
import path from "node:path";
import { execFile } from "node:child_process";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { loadWorkspace } from "../work.mjs";
import { globalMeshPaths } from "../workspace.mjs";
import { openGlobalWorkProjectionStore } from "../global-work-store.mjs";
import { resolveWorkspaceId } from "../workspace-identity.mjs";
import { isPlainObject, isWellFormedCloneUrl, writeRepoPublishedMarker } from "./repo-marker.mjs";
// m42 wave (b) / item 4 — the clone-time identity pin writes through the ONE atomic write seam
// (temp+rename, failure reclaims its temp).
import { writeText } from "../fs.mjs";


// -------------------------------------------------- the repo-availability guard ----

// localMeshRepoPublished(ws, workspaceId) — the LOCAL half of the join: the
// `mesh.repo.published` marker (`mesh-repo-marker.mjs`'s writeRepoPublishedMarker writes it;
// `ws.config.mesh.repo.published` is the SAME on-disk marker `loadWorkspace` already
// hydrates), AND that this marker was written for THIS workspaceId.
function localMeshRepoPublished(ws, workspaceId) {
  const repo = ws?.config?.mesh?.repo;
  if (!isPlainObject(repo)) return false;
  if (repo.published !== true) return false;
  // The marker records the workspaceId it was published for — a published marker for
  // a DIFFERENT workspaceId is not "this workspace's repo is available".
  if (typeof repo.workspaceId === "string" && repo.workspaceId.length > 0) {
    return repo.workspaceId === workspaceId;
  }
  // A pre-workspaceId marker (published:true, no workspaceId key) is tolerated as a
  // proceed — absence-is-benign for an additive key, never a stricter regression.
  return true;
}

// localNodeWorkspaceMembership(nodeId, workspaceId, options) — the WORKER's OWN local
// `global_node_workspaces` fact: the worker's machine-wide global store (the SAME
// `AOF_GLOBAL_HOME` its own launcher already publishes into on every local mutation,
// `global-work-publisher.mjs`'s `publishGlobalRegistryDescriptorsToStore`) is queried
// LOCALLY — no network call, no control-node roundtrip. `options.openStore` is the
// INJECTED store opener (default `openGlobalWorkProjectionStore`); a missing/
// unreachable local store degrades to `false` (never a thrown fault out of the guard).
async function localNodeWorkspaceMembership(nodeId, workspaceId, options = {}) {
  const openStore = options.openStore ?? openGlobalWorkProjectionStore;
  const storeOptions = options.globalWorkStoreOptions ?? {};
  let store;
  try {
    store = await openStore({ ...storeOptions, paths: storeOptions.paths ?? globalMeshPaths(storeOptions) });
  } catch {
    return false;
  }
  try {
    const row = store.db.prepare("SELECT 1 FROM global_node_workspaces WHERE node_id = ? AND workspace_id = ?").get(nodeId, workspaceId);
    return Boolean(row);
  } catch {
    return false;
  } finally {
    store.close?.();
  }
}

// workerHasRepo(ws, workspaceId, nodeId, options) — task 01's worker-side guard
// (defensive re-check; the control-side gate is Story 00's `resolveTarget`). THE JOIN
// (STORY.md build notes: "use the LOCAL marker joined with the node-workspace
// mapping") — availability is TRUE only when BOTH facts hold: the local
// `mesh.repo.published` marker for this workspaceId, AND this node's OWN local
// `global_node_workspaces` membership row for (nodeId, workspaceId) — either fact
// missing is a coded miss (the decision-table join, task 01 Examples). Unlike the
// control-side gate (which has no filesystem access to a remote worker's config and
// must proxy via `global_node_workspaces` + `workspaces.last_published_at`, STATE.md
// Feedback), the WORKER-side check reads its OWN local marker AND its OWN local
// registry table directly — both genuine per-node facts, not a workspace-level proxy.
export async function workerHasRepo(ws, workspaceId, nodeId, options = {}) {
  if (!localMeshRepoPublished(ws, workspaceId)) return false;
  return localNodeWorkspaceMembership(nodeId, workspaceId, options);
}

// ============================================================================
// MILESTONE 38 / STORY 01 — worker-repo-checkout (ADR-005/006, tasks 00-03)
// ============================================================================

// -------------------------------------------------- task 00: clone SOURCE ----

// The clone-URL SHAPE rule itself (`isWellFormedCloneUrl`) lives in
// mesh-repo-marker.mjs and is imported above (m42 wave (d) leg d1): it is shared
// with the published marker that validates against it, and keeping it here made
// this module and commands/mesh-repo.mjs import each other — the tree's one
// confirmed cycle. Every caller still reads the shape ONE way.

// resolveCloneUrl(ws) — THE RAW OPTIONAL-CHAIN read (ADR-005, the m22 story-01
// lesson): reads config.mesh.repo.cloneUrl directly, NEVER round-tripping through the
// config-editor whitelist (which would drop an unknown sibling mesh key on rewrite).
// Returns the well-formed URL string, or null for absent/blank/malformed/wrong-type —
// the caller treats null as "stay the loud coded assignment-repo-unavailable failed".
export function resolveCloneUrl(ws) {
  const cloneUrl = ws?.config?.mesh?.repo?.cloneUrl;
  return isWellFormedCloneUrl(cloneUrl) ? cloneUrl.trim() : null;
}

// -------------------------------------------- milestone 38 / story 02 (ADR-010) ----

// parseRepoFromCloneUrl(cloneUrl, config) — LAYERS ON `isWellFormedCloneUrl`'s OWN
// acceptance surface (RESEARCH §3.5's measured parser): extracts `{ host, owner,
// repo, apiBaseUrl }` from a well-formed clone URL — https/ssh scheme-form AND
// scp-style `git@host:owner/repo(.git)`. `.git` suffix / trailing slash / query /
// hash are stripped from the repo segment (never from `owner`, never a case-fold on
// the path — only the HOST is lower-cased, matching `new URL()`'s own normalization
// and RESEARCH's measured table). A `< 2`-path-segment URL (or anything
// `isWellFormedCloneUrl` itself rejects) parses to `null` — the caller THROWS, never
// guesses.
//
// The host -> API-base RULE (RESEARCH §3.5's "the REAL gap", not a parsing edge
// case): `github.com` -> `https://api.github.com`; anything else -> the GHES
// convention `https://<host>/api/v3` (using `url.host`, INCLUDING the port, per the
// measured edge case — a GHES instance's API can sit behind a non-default port),
// UNLESS `config.mesh.repo.credential.githubApp.apiBaseUrl` (raw optional-chain) is
// configured, which wins outright (an operator's explicit override for an API host/
// port that diverges from the git-clone host).
export function parseRepoFromCloneUrl(cloneUrl, config = null) {
  if (!isWellFormedCloneUrl(cloneUrl)) return null;
  const trimmed = cloneUrl.trim();

  let hostname; // never includes a port — used ONLY for the github.com check
  let hostForApiBase; // includes a port when present — used to build a GHES API base
  let pathSegments;

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch {
      return null;
    }
    hostname = parsed.hostname.toLowerCase();
    // Craft R1 (defensive) — the URL's port is preserved into `hostForApiBase` ONLY
    // for an http(s)-scheme clone URL (the legitimate GHES-behind-a-non-default-port
    // case, e.g. `https://ghe.example.com:8443/...`). For any OTHER scheme (ssh, git,
    // ...) the port is the SSH/clone port, never the forge's REST API port — the mint
    // always talks HTTPS, so that port must NEVER leak into apiBaseUrl (a
    // `ssh://host:22/...` clone URL must resolve to `https://host/api/v3`, not
    // `https://host:22/api/v3`).
    hostForApiBase = parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.host.toLowerCase() : hostname;
    pathSegments = parsed.pathname.split("/").filter(Boolean);
  } else {
    // scp-style shorthand: user@host:path (git@git.example.com:acme/secret.git).
    const match = /^[\w.-]+@([\w.-]+):(.+)$/.exec(trimmed);
    if (!match) return null;
    hostname = match[1].toLowerCase();
    hostForApiBase = hostname;
    pathSegments = match[2].split("?")[0].split("#")[0].split("/").filter(Boolean);
  }

  if (pathSegments.length < 2) return null;
  const owner = pathSegments[0];
  const repo = pathSegments[1].replace(/\.git$/i, "");
  if (owner.length === 0 || repo.length === 0) return null;

  const configuredApiBase = config?.mesh?.repo?.credential?.githubApp?.apiBaseUrl;
  let apiBaseUrl;
  if (typeof configuredApiBase === "string" && configuredApiBase.length > 0) {
    apiBaseUrl = configuredApiBase;
  } else if (hostname === "github.com") {
    apiBaseUrl = "https://api.github.com";
  } else {
    apiBaseUrl = `https://${hostForApiBase}/api/v3`;
  }

  return { host: hostname, owner, repo, apiBaseUrl };
}

// ------------------------------------------------ task 01: clone TARGET seam ----

// meshCheckoutsRoot(options) / meshCheckoutPath(workspaceId, options) — THE ONE SEAM
// (fitness F1 acd-worker-clone-target-scoped) a clone target is EVER built from.
// Mirrors mesh-worktree.mjs's meshWorktreesRoot/meshWorktreePath shape almost
// verbatim, but rooted at the GLOBAL mesh home (globalMeshPaths(...).meshRoot,
// honoring AOF_GLOBAL_HOME) rather than the repo's own .aof/ — a checkout is a
// machine-wide fact (like identity/presence), never per-repo. Composed from
// `workspaceId` ONLY (a store-canonical id, never directive/ref text) — a traversal
// id constructs no escaping path (isUnderMeshCheckoutsRoot below is the same
// prefix-child check mesh-worktree.mjs keeps for its own root).
export function meshCheckoutsRoot(options = {}) {
  return path.join(globalMeshPaths(options).meshRoot, "checkouts");
}

export function meshCheckoutPath(workspaceId, options = {}) {
  return path.join(meshCheckoutsRoot(options), String(workspaceId));
}

// Admission is TWO questions and only the first was asked: does the path escape the root,
// AND is it usable as one directory name. Measured on Windows, `C:\Windows` as a
// workspaceId joins to `<root>\C:\Windows` — lexically under the root, so admitted — then
// `mkdir` refuses it (a drive letter cannot appear mid-path): an opaque ENOENT four frames
// deep, where every other path here is a coded refusal. On POSIX the same id is a harmless
// relative segment, so the hole read as a Windows flake. A real workspaceId is a hex digest
// — one segment, always — so requiring one segment makes both platforms answer alike.
export function isUnderMeshCheckoutsRoot(candidatePath, options = {}) {
  const root = path.resolve(meshCheckoutsRoot(options));
  const normalized = path.resolve(candidatePath);
  const relative = path.relative(root, normalized);
  return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative) && !relative.includes(path.sep);
}

// ----------------------------------------- task 03: credential env + askpass ----

// resolveCloneExec(options) — the INJECTED clone-exec seam (mirroring mesh-worktree.
// mjs's options.exec idiom): (args, { cwd, env? }) => Promise<{ stdout, stderr,
// status }>. Argv-form via execFile, NEVER a shell string. Default is a real `git`
// spawn; @executable tests inject a FAKE that records argv + env + returns a scripted
// status — no real forge, no real credential, no network.
function defaultCloneExec(args, { cwd, env, timeoutMs = 5 * 60 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, env, timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
      if (error && (error.code === "ENOENT" || error.killed || error.signal)) {
        reject(error);
        return;
      }
      resolve({ stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), status: error ? (typeof error.code === "number" ? error.code : 1) : 0 });
    });
  });
}

function resolveCloneExec(options) {
  return typeof options?.cloneExec === "function" ? options.cloneExec : defaultCloneExec;
}

// buildAskpassShim(scriptsRoot, token) — the GIT_ASKPASS one-shot plumbing (RESEARCH
// §1.1/A4 measured: GIT_ASKPASS leaves NO trace in .git/config, cleanest of the four
// surveyed mechanisms). GIT_ASKPASS names ONE executable, not "command + args" — on
// Windows a `node <script>` pointer does not work directly, so this writes a
// generated one-shot `.cmd` shim (POSIX: a shell script) that internally execs a tiny
// node helper. The token itself is embedded ONLY in this one-shot, scoped-directory
// file — never process.env, never argv of the clone itself — and the whole shim
// directory is removed in a `finally` by the caller. NEVER os.tmpdir() (F1) — the
// shim lives under the SAME scoped checkouts root, in a dedicated `.askpass/` sibling
// never itself treated as a checkout target.
//
// MILESTONE 38 / STORY 02 (ADR-010 decision 4) — PROMPT-AWARE. RESEARCH §3.4 measured
// that git passes the ASKPASS program a distinguishing prompt string as argv (`
// "Username for '...'"` vs `"Password for '...'"`) — the shim now FORWARDS that argv
// (`%*` / `"$@"`) to the helper, which answers the literal, public, non-secret
// constant `x-access-token` on a Username prompt, and the real token on every OTHER
// prompt (Password, or none — the legacy no-argv invocation some hermetic tests still
// use, which stays the token-emitting default). This is GitHub's DOCUMENTED App
// installation-token form (`x-access-token:<TOKEN>@`), not the previously-shipped
// same-value-for-both-prompts shim that rested on undocumented, App-token-unconfirmed
// leniency. The token is STILL never the username, still never process.env/argv of
// the clone itself, still removed with the whole one-shot directory in the caller's
// `finally` (story-01 F2 stays green — the token's own handling is unchanged on every
// axis F2 pins; only WHICH prompt gets the token, vs the public `x-access-token`
// constant, is new).
const ASKPASS_USERNAME_CONSTANT = "x-access-token";

export async function buildAskpassShim(scriptsRoot, token) {
  const dir = path.join(scriptsRoot, ".askpass", randomUUID());
  await mkdir(dir, { recursive: true });
  const isWindows = process.platform === "win32";
  const helperPath = path.join(dir, "askpass.mjs");
  const shimPath = path.join(dir, isWindows ? "askpass.cmd" : "askpass.sh");
  // The token is written into a file that lives ONLY inside this one-shot, scoped
  // directory — read once by the helper, then the whole directory is removed.
  const tokenPath = path.join(dir, "token");
  await writeFile(
    helperPath,
    [
      "import { readFileSync } from 'node:fs';",
      "const tokenPath = process.argv[2];",
      "const prompt = process.argv.slice(3).join(' ');",
      `process.stdout.write(/^Username/i.test(prompt) ? ${JSON.stringify(ASKPASS_USERNAME_CONSTANT)} : readFileSync(tokenPath, 'utf8'));`,
      "",
    ].join("\n"),
    "utf8",
  );
  await writeFile(tokenPath, token, "utf8");
  if (isWindows) {
    await writeFile(shimPath, `@echo off\r\nnode "${helperPath}" "${tokenPath}" %*\r\n`, "utf8");
  } else {
    await writeFile(shimPath, `#!/bin/sh\nexec node "${helperPath}" "${tokenPath}" "$@"\n`, "utf8");
    await import("node:fs/promises").then((fsp) => fsp.chmod(shimPath, 0o700));
  }
  return { shimPath, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

// redactCredentialFromText(text, credential) — the redaction discipline (SECURITY T3
// / acd-global-node-descriptors-redact-secrets) applied to a clone failure's surfaced
// text: any occurrence of the literal credential value is replaced, never forwarded
// raw into a log/error/status frame.
export function redactCredentialFromText(text, credential) {
  if (typeof text !== "string" || typeof credential !== "string" || credential.length === 0) return text;
  return text.split(credential).join("[redacted]");
}

// ------------------------------------------- task 01/02/03: the clone orchestration ----

// writeNodeWorkspaceMembership(nodeId, workspaceId, options) — the WORKER's OWN
// NARROW single-row upsert. ⚠ The only EXISTING writer of global_node_workspaces
// (global-node-registry.mjs's publishGlobalRegistryDescriptorsToStore) DELETEs every
// row for a workspace_id first (a fabric-sync flow) — calling it here would wipe
// OTHER nodes' membership rows for a shared workspace. This is a deliberately
// separate, minimal INSERT OR REPLACE keyed on the table's own (node_id,
// workspace_id) PRIMARY KEY — NO DELETE, ever.
async function writeNodeWorkspaceMembership(nodeId, workspaceId, options = {}) {
  const openStore = options.openStore ?? openGlobalWorkProjectionStore;
  const storeOptions = options.globalWorkStoreOptions ?? {};
  const store = await openStore({ ...storeOptions, paths: storeOptions.paths ?? globalMeshPaths(storeOptions) });
  try {
    store.db.prepare("INSERT OR REPLACE INTO global_node_workspaces (node_id, workspace_id) VALUES (?, ?)").run(nodeId, workspaceId);
  } finally {
    store.close?.();
  }
}

// overlayRepoPublishedMarker(ws, { workspaceId, now }) — writeRepoPublishedMarker
// (reused verbatim) writes the marker to DISK only; it never mutates the caller's
// in-memory workspace.config. Without this overlay, the handler's immediate
// workerHasRepo re-check (right after a successful clone, same tick, same in-memory
// `ws`) would read the STALE pre-clone config and see `published` still absent —
// the guard would never actually pass post-clone. Mirrors commands/mesh-repo.mjs's
// own withRepoMarker overlay idiom (never mutates the argument).
function overlayRepoPublishedMarker(ws, { workspaceId, now }) {
  const mesh = isPlainObject(ws.config?.mesh) ? ws.config.mesh : {};
  const repo = isPlainObject(mesh.repo) ? mesh.repo : {};
  return {
    ...ws,
    config: {
      ...ws.config,
      mesh: { ...mesh, repo: { ...repo, published: true, publishedAt: now, workspaceId } },
    },
  };
}

// cloneRepoForWorkspace(ws, { workspaceId, nodeId, assignmentId, cloneUrl, now, options }) —
// the clone-on-miss PREFIX (ADR-005): clones `cloneUrl` into the ONE scoped
// meshCheckoutPath(workspaceId) seam, argv-form/shell-less, credential (if any) on a
// per-invocation env for THIS exec call ONLY — never process.env. On success, writes
// BOTH repo-availability facts (writeRepoPublishedMarker verbatim + the narrow
// global_node_workspaces upsert) so a subsequent workerHasRepo re-check passes. On
// failure, writes NEITHER fact (no half-state) and throws a coded, credential-
// redacted error — the caller streams the loud coded `failed`.
//
// MILESTONE 38 / STORY 01 task 05 (ADR-009, finding F12) — the credential is PULLED,
// per-clone, from `options.requestCloneCredential({ assignmentId, workspaceId,
// cloneUrl }) => Promise<string|null>`, called HERE, on the clone-miss path only,
// BEFORE any exec call — so a resolution failure (refused / timed out / a
// blank-or-absent reply) is thrown before `checkoutPath` is ever touched by git: no
// partial checkout is left behind. There is NO static credential option — a static
// string is per-HANDLER (one per worker process) and therefore structurally cannot
// be per-clone (SECURITY T4); the async resolver is the ONLY way a credential ever
// enters this function, with no precedence branch and no escape hatch. A caller
// supplying no resolver at all makes no resolution attempt — no request is ever
// sent — exactly today's public-repo behaviour.
export async function cloneRepoForWorkspace(ws, { workspaceId, nodeId, assignmentId, cloneUrl, now, options = {} }) {
  const exec = resolveCloneExec(options);
  const checkoutPath = meshCheckoutPath(workspaceId, options.globalWorkStoreOptions ?? {});

  // TASK 01 / SECURITY T5(b) — a traversal/`..`-laden/absolute workspaceId must
  // construct NO escaping path. path.join alone collapses `..` segments (a plain
  // path.join(root, "../etc") DOES escape the root) — so the constructed path is
  // re-verified against the scoped root BEFORE any mkdir/clone: an id that resolves
  // outside <meshRoot>/checkouts/ is REJECTED here (no clone, no directory created),
  // never silently written outside the dedicated root.
  if (!isUnderMeshCheckoutsRoot(checkoutPath, options.globalWorkStoreOptions ?? {})) {
    const error = new Error(`workspaceId "${workspaceId}" resolves to a checkout path outside the dedicated checkouts root — refused, cloning nothing.`);
    error.code = "assignment-repo-unavailable";
    throw error;
  }

  await mkdir(meshCheckoutsRoot(options.globalWorkStoreOptions ?? {}), { recursive: true });

  // ADR-009 — resolve the credential BEFORE any exec call (see doc comment above).
  // The ONLY entry point: an async per-clone resolver. No static option exists.
  let credential = null;
  if (typeof options.requestCloneCredential === "function") {
    try {
      const resolved = await options.requestCloneCredential({ assignmentId, workspaceId, cloneUrl });
      credential = typeof resolved === "string" && resolved.length > 0 ? resolved : null;
    } catch (error) {
      // The resolver's own thrown error never carries a raw credential value (it
      // reports refusal/timeout/malformed-reply CODES only) — nothing to redact here,
      // but the coded assignment-repo-unavailable shape is applied uniformly so the
      // caller's existing failure handling needs no special case for this path.
      const wrapped = new Error(`clone credential request failed for workspace "${workspaceId}": ${String(error?.message ?? error)}`);
      wrapped.code = "assignment-repo-unavailable";
      throw wrapped;
    }
  }
  let askpass = null;
  try {
    // The credential env is a DISTINCT object passed to ONLY this exec call — it is
    // NEVER assigned onto process.env / merged via Object.assign (SECURITY T2). git
    // still needs PATH/SystemRoot to run at all, so the scoped env spreads
    // ...process.env and adds ONLY the GIT_ASKPASS pointer (when a credential exists).
    //
    // SECURITY T7 / finding F14 (High) — GIT_ASKPASS alone is NOT authoritative: git
    // consults a configured `credential.helper` FIRST, and only falls back to askpass
    // when no helper supplies a credential. MEASURED (stock Git-for-Windows: system
    // helper `manager` + global `wincred`): with a helper configured, the helper WINS
    // and GIT_ASKPASS is never even invoked — so (1) the relay-minted, short-lived,
    // scoped token is silently BYPASSED in favour of the operator's broad ambient
    // keychain PAT, and the clone still SUCCEEDS, so nobody notices T4 evaporated;
    // and (2) on a successful clone git runs the helper's `approve` -> `store`,
    // persisting a credential into the OS keychain — the durable secret store this
    // milestone explicitly refused (T1/R2). Every scoped clone therefore ALWAYS —
    // credentialled or not — resets the helper chain (`-c credential.helper=`, an
    // empty value clears the list, MEASURED to make GIT_ASKPASS authoritative and to
    // suppress the store-on-success) and disables the interactive fallback
    // (`GIT_TERMINAL_PROMPT=0`, so a missing/rejected credential FAILS LOUDLY rather
    // than hanging on a prompt or being silently rescued by an ambient helper). This
    // applies on the PUBLIC / no-credential path too: a private repo whose relay
    // token never arrived must fail loudly, never succeed via the machine's own
    // keychain.
    // Craft R2 (locale-robust shim) — git LOCALIZES its askpass prompt text (gettext);
    // the generated helper's `/^Username/i` match (buildAskpassShim above) only
    // recognises the ENGLISH prompt. Pinning LC_ALL/LANG to the POSIX "C" locale on
    // this per-invocation env (never process.env) makes git emit the English prompt
    // regardless of the host machine's own locale, so the match stays reliable.
    const cloneEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C", LANG: "C" };
    if (typeof credential === "string" && credential.length > 0) {
      askpass = await buildAskpassShim(meshCheckoutsRoot(options.globalWorkStoreOptions ?? {}), credential);
      cloneEnv.GIT_ASKPASS = askpass.shimPath;
    }

    const result = await exec(["-c", "credential.helper=", "clone", cloneUrl, checkoutPath], { env: cloneEnv });
    if (result.status !== 0) {
      const message = redactCredentialFromText(`git clone failed for workspace "${workspaceId}": ${result.stderr || result.stdout}`, credential);
      const error = new Error(message);
      error.code = "assignment-repo-unavailable";
      throw error;
    }
  } catch (error) {
    if (error?.code !== "assignment-repo-unavailable") {
      error.message = redactCredentialFromText(String(error?.message ?? error), credential);
      error.code = error.code ?? "assignment-repo-unavailable";
    }
    throw error;
  } finally {
    await askpass?.cleanup?.();
  }

  // Success — write BOTH facts (ADR-005: the join workerHasRepo reads). A fault
  // writing either fact leaves NO half-registered state readable as available (the
  // re-check below would still fail the join), matching the "neither fact on
  // failure" invariant task 02 pins.
  await writeRepoPublishedMarker({ configPath: ws.configPath, workspaceId, now });
  await writeNodeWorkspaceMembership(nodeId, workspaceId, options);
  // m42 wave (b) / item 4 — CLONE-TIME IDENTITY PIN. The checkout's identity used
  // to be re-derived from ITS OWN path on this machine (a different id per machine
  // for the same repo — the class that refused the worker's launch-workspace frames
  // and spammed workspace-workdir-unresolvable every 5s, forever). The id the
  // assignment arrived under IS the fleet's canonical id for this repo; pin it into
  // the checkout's own config so resolveWorkspaceId answers it on every machine.
  await pinWorkspaceIdInCheckout(checkoutPath, workspaceId);

  return checkoutPath;
}

// pinWorkspaceIdInCheckout(checkoutPath, workspaceId) — m42 wave (b) / item 4: write
// `mesh.workspaceId` into the scoped checkout's `.aof/aof.config.json`, merging with
// whatever the repo committed (an absent/torn config pins into a fresh `{ mesh }` —
// the pin is the fact that matters). Atomic via writeText; a fault propagates (a
// checkout whose identity could not be pinned would silently regress to the
// per-machine derivation — the exact bug this exists to end).
export async function pinWorkspaceIdInCheckout(checkoutPath, workspaceId) {
  const configPath = path.join(checkoutPath, ".aof", "aof.config.json");
  let config = {};
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch {
    config = {}; // absent or unparseable committed config — pin into a fresh one
  }
  const mesh = config?.mesh != null && typeof config.mesh === "object" && !Array.isArray(config.mesh) ? config.mesh : {};
  const next = { ...config, mesh: { ...mesh, workspaceId } };
  await writeText(configPath, `${JSON.stringify(next, null, 2)}\n`);
}

// ────────────────────────────────────── the entry points ──────────────────────────────────────

// admitWorkspaceRepo(ws, seams) — the guard and its clone-on-miss prefix, moved out of
// createMeshWorkerExecutionHandler verbatim. Every coded outcome it had there it has here, in the
// same order, and it still creates no worktree on any refusing path.
//
// The seams are the eight the handler's block closed over, plus `reportFault` — the clone-url PULL
// below REPORTS a fault and then falls through to tier 3 rather than aborting, so it needs a way to
// say so that is not a refusal. Reporting is otherwise the handler's, and settling always is.
export async function admitWorkspaceRepo(ws, {
  workspaceId,
  nodeId,
  assignmentId,
  openStore,
  globalWorkStoreOptions,
  cloneExec,
  requestCloneCredential,
  requestCloneUrl,
  resolveWorkspaceCloneUrl,
  resolveNow,
  reportFault,
} = {}) {
  // task 01 — THE REPO GUARD, FIRST. Before ANY git worktree add: re-check this
  // worker actually holds the repo for workspaceId. A miss answers a structured
  // coded refusal (never an opaque throw) and creates NO worktree — the guard
  // PRECEDES the `git worktree add` call site (fitness #7 / SEC F3).
  let hasRepo = await workerHasRepo(ws, workspaceId, nodeId, { openStore, globalWorkStoreOptions });

  // milestone 38 / story 01 — CLONE-ON-MISS (ADR-005), a PREFIX to the existing
  // guard, not a rewrite of it. On a miss, resolve the clone SOURCE from the
  // committed config.mesh.repo.cloneUrl (task 00); an unresolvable source keeps the
  // EXISTING loud coded `assignment-repo-unavailable` refusal below (nothing
  // cloned). A resolvable source clones into the scoped meshCheckoutPath seam
  // (task 01), then registers BOTH repo-availability facts and RE-CHECKS
  // workerHasRepo (task 02) so the caller's fall-through is the UNCHANGED m35 flow.
  let resolvedCloneUrl = null;
  if (!hasRepo) {
    // Gap A extended (review fix, live soak 2026-07-17/18): resolveCloneUrl(ws)
    // only ever reads THIS worker's own launch-workspace config — for a
    // workspaceId that is NOT the launch workspace (precisely the clone-on-miss
    // case, by definition), that read is always null. Three tiers, in order:
    //   1. this worker's own local config (resolveCloneUrl) — fastest, no I/O.
    //   2. a live PULL to the control node (requestCloneUrl, ADR-009's precedent)
    //      — the tier that ACTUALLY closes the gap: confirmed live (2026-07-18)
    //      that a fresh worker's own registry copy has no row for a workspace it
    //      has never itself published, so tier 3 alone can never resolve this.
    //   3. this worker's own local registry (resolveWorkspaceCloneUrl) — kept as
    //      a last-resort for a deployment where it DOES happen to have relevant
    //      local knowledge; effectively a no-op in the common cross-machine case.
    // A PULL fault (refusal, timeout, no transport) is REPORTED and falls through
    // to tier 3 rather than aborting the clone attempt outright — the SAME
    // "never let one collaborator's fault become a hard stop" discipline every
    // other optional resolver in this handler already keeps.
    let pulledCloneUrl = null;
    if (resolveCloneUrl(ws) == null && typeof requestCloneUrl === "function") {
      try {
        pulledCloneUrl = await requestCloneUrl({ assignmentId, workspaceId });
      } catch (error) {
        reportFault?.(error?.code ?? "clone-url-request-failed", `clone-url PULL to control failed, falling through to local registry: ${String(error?.message ?? error)}`);
      }
    }
    resolvedCloneUrl = resolveCloneUrl(ws)
      ?? pulledCloneUrl
      ?? await resolveWorkspaceCloneUrl(workspaceId, { openStore, globalWorkStoreOptions });
    const cloneUrl = resolvedCloneUrl;
    if (cloneUrl != null) {
      try {
        const cloneNow = resolveNow();
        await cloneRepoForWorkspace(ws, {
          workspaceId,
          nodeId,
          assignmentId,
          cloneUrl,
          now: cloneNow,
          options: { cloneExec, requestCloneCredential, openStore, globalWorkStoreOptions },
        });
        // writeRepoPublishedMarker (inside cloneRepoForWorkspace) writes to DISK
        // only — overlay the SAME fact onto the in-memory `ws` this call answers
        // with so the immediate re-check below (same tick) sees it, not a stale
        // pre-clone config (mirrors commands/mesh-repo.mjs's own overlay idiom).
        ws = overlayRepoPublishedMarker(ws, { workspaceId, now: cloneNow });
        hasRepo = await workerHasRepo(ws, workspaceId, nodeId, { openStore, globalWorkStoreOptions });
      } catch (error) {
        return { refused: true, code: error?.code ?? "assignment-repo-unavailable", detail: String(error?.message ?? error) };
      }
    }
  }

  if (!hasRepo) {
    return {
      refused: true,
      code: "assignment-repo-unavailable",
      detail: `workerHasRepo still false for workspace ${workspaceId} after clone-on-miss (cloneUrl ${resolvedCloneUrl != null ? `"${resolvedCloneUrl}" resolved but did not result in a usable repo` : "unresolved — neither this worker's own config.mesh.repo.cloneUrl nor the synced registry's clone_url is set for this workspace"})`,
    };
  }

  return { ws };
}

// resolveScopedCheckout(ws, { workspaceId, globalWorkStoreOptions }) — milestone 38 / story 01 fix,
// live two-machine soak 2026-07-24 (VERIFICATION F23). The repo the worker RUNS is scoped by
// workspaceId, NOT by the daemon's launch cwd. The `ws` handed in is the LAUNCHER's OWN launch
// workspace (mesh-launcher.mjs wires `loadWs = () => ws`); for a FOREIGN workspace (any workspaceId
// that is not this launcher's own) the repo lives at the clone-on-miss seam
// `meshCheckoutPath(workspaceId)` — never `ws.projectRoot`. Running the downstream flow against
// `ws.projectRoot` either (a) fails "not a git repository" when the daemon was launched outside a
// repo (the loud soak symptom), or (b) WORSE, adds a worktree of the launcher's OWN repo and runs
// the WRONG work off a correct-looking assignment. This answers with the workspace every downstream
// seam (addWorktree / resolveRefInWorktree / findWork / pushWorktreeBranch / removeWorktree) is to
// operate on. It covers BOTH the cloned-this-run case AND a checkout already present from a prior
// run (workerHasRepo can pass without cloning). The launcher's own-workspace assignment is
// untouched: its projectRoot already IS its repo and it has no scoped clone.
export async function resolveScopedCheckout(ws, { workspaceId, globalWorkStoreOptions } = {}) {
  const ownWorkspaceId = resolveWorkspaceId(ws);
  if (workspaceId === ownWorkspaceId) return { ws };
  const checkoutPath = meshCheckoutPath(workspaceId, globalWorkStoreOptions ?? {});
  try {
    return { ws: await loadWorkspace(checkoutPath, undefined, { env: globalWorkStoreOptions?.env }) };
  } catch (error) {
    return {
      refused: true,
      code: "assignment-checkout-unresolved",
      detail: `the scoped checkout for foreign workspace ${workspaceId} at ${checkoutPath} could not be loaded: ${String(error?.message ?? error)}`,
    };
  }
}
