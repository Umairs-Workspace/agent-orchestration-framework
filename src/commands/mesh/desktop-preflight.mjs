// The `mesh desktop` PREFLIGHT — the FOUR checks `install` and `run` REPORT and never
// repair (ADR-007 §4, AMENDED twice: 126/06 appended the fourth, and 126/06's post-hoc
// review moved the whole preflight out of `desktop.mjs` into this module).
//
// WHY IT IS ITS OWN MODULE. `src/commands/mesh/desktop.mjs` went 587 -> 1,053 (126/04)
// -> 1,167 (126/06) lines, +99% in one milestone, because a cross-cutting concern kept
// landing in the command module that reports it. The preflight is not part of installing
// or launching anything: it is a set of read-only probes over this node, whose one
// relationship to the two verbs is that they print it. Splitting it is what makes that
// separable — and what makes the arch control's "writes nothing on any path" sweep a
// statement about a WHOLE FILE rather than about a hand-maintained list of function
// headers inside a larger one, which is the exact defect the 126/06 review found (the
// list still named 126/04's five functions after 126/06 added four more).
//
// THE FOUR THINGS THAT HAVE BURNED RUNS, each checkable without spending a token. A probe
// that cannot answer reports `fail` naming the cause; it never reports `pass`, because the
// cost of this preflight being wrong is a silent green in front of a night of dead runs.
//
// The count was three when `126/04` shipped and its delivered scenarios say so; `126/06`
// added the fourth and supersedes that count. The delivered feature is not edited — it
// stays the true record of what `126/04` shipped.
import { access, constants as fsConstants, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { readBuildInfo } from "../../build-info.mjs";
import { resolveNodeWorkspaces } from "../../mesh/presence.mjs";
import { readSidecar } from "../../node-identity.mjs";
import { globalMeshPaths, workspacePaths } from "../../workspace.mjs";
import { AOF_HOOK_MARKER, CLAUDE_SETTINGS_RELPATH, claudeHookDeclarations, claudeSettingsPath } from "../../claude-settings.mjs";

export const PREFLIGHT_CHECKS = Object.freeze([
  "claude-authenticated",
  "payload-build",
  "workspace-identity-pinned",
  "heartbeat-hook-installed",
]);

// The bundle member whose registration this preflight asks after. The ID is spelled here
// because this check is ABOUT that one hook; its EVENT and the FILE it runs are not
// spelled here at all — they are read from the bundle's own declaration and from the
// registration found on disk, which is where each of those facts lives (ADR-008 §1).
export const HEARTBEAT_HOOK_ID = "claude-run-heartbeat";

// `markedEntry` (src/claude-settings.mjs) writes every argv element to be resolved at RUN
// TIME through this token, so the path in a settings file is never a checkout's absolute
// one. The check substitutes it exactly as the harness would.
const PROJECT_DIR_TOKEN = "${CLAUDE_PROJECT_DIR}";

// F-28's lesson applied to the list that actually EXPLODES. `126/06` bounded the SKIP
// list and left the offender list joined verbatim: measured 33,030 characters for 300
// offending workspaces, against a delivered suite whose fixture has one. Offenders are
// NAMED until this budget is spent and the remainder is COUNTED — so a node with three
// still names all three, and a node with three hundred still produces a verdict an
// operator can read. Per CLASS, so a long list of one kind cannot crowd out the other.
const OFFENDER_BUDGET = 400;

// The ONE child-process seam the desktop verbs share. It lives HERE because the preflight
// is the module whose every read must be injectable end to end — `claudeFn` is its
// default — and `desktop.mjs`'s three other callers (`findDesktopProcesses`,
// `stopDesktopApp`, `applyAutostart`) import this one rather than keeping a second copy.
// A third module for sixteen lines would be a `src/commands/mesh` sibling whose budget row
// asks growth to be a stated decision; two homes for one spawn would be the re-spelling
// this split exists to remove.
//
// `stderr` is ADDITIVE (126/04 task 01): `reg` reports on stderr, and "absent" and
// "broken" are one exit code apart — measured 2026-09-08, `reg query`/`reg delete` for an
// absent value BOTH print `ERROR: The system was unable to find the specified registry key
// or value.` on stderr, print nothing on stdout, and exit 1.
export function defaultRunner() {
  return async (file, args) =>
    await new Promise((resolve) => {
      const child = spawn(file, args, { windowsHide: true });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.on("error", () => resolve({ stdout: "", stderr: "", code: -1 }));
      child.on("close", (code) => resolve({ stdout, stderr, code }));
    });
}

function check(code, status, message) {
  return { code, status, message };
}

// ─────────────────────────────────────────────────────────────────────────────
// claude-authenticated
// ─────────────────────────────────────────────────────────────────────────────

// `claude auth status` prints JSON to STDOUT by DEFAULT and exits 0 (measured
// 2026-09-08: `{"loggedIn": true, "authMethod": "claude.ai", …}`). THE EXIT CODE IS NOT
// THE SIGNAL — it is 0 either way — which is the trap an obvious implementation falls
// into. `loggedIn` is what is read.
async function checkClaudeAuthenticated(claudeFn) {
  let answer;
  try {
    answer = await claudeFn("claude", ["auth", "status"]);
  } catch (error) {
    return check("claude-authenticated", "fail", `\`claude\` could not be run: ${error?.message ?? "unknown fault"}.`);
  }
  const code = answer?.code;
  const stderr = typeof answer?.stderr === "string" ? answer.stderr.trim() : "";
  if (code === -1 || code == null) {
    return check("claude-authenticated", "fail", "`claude` is not on this account's PATH — a supervised loop would start and die on auth.");
  }
  if (code !== 0) {
    return check("claude-authenticated", "fail", `\`claude auth status\` exited ${code}.${stderr ? ` ${stderr}` : ""}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(String(answer?.stdout ?? ""));
  } catch {
    return check("claude-authenticated", "fail", "The `claude auth status` output could not be read as JSON, so the auth state is unknown.");
  }
  if (parsed?.loggedIn === true) {
    const method = typeof parsed.authMethod === "string" && parsed.authMethod.length > 0 ? parsed.authMethod : "an unnamed method";
    return check("claude-authenticated", "pass", `\`claude\` is authenticated via ${method}.`);
  }
  return check("claude-authenticated", "fail", "This account is logged out of `claude` — run `claude` once interactively to sign in.");
}

// ─────────────────────────────────────────────────────────────────────────────
// payload-build
// ─────────────────────────────────────────────────────────────────────────────

// The installed payload's build, read the way the deploy rules already read it. An
// `embedded` mode means the launcher fell back to its compiled-in bundle, which is the
// stale-deploy shape `~/.aof/bin/aof.exe --version` exists to catch.
function checkPayloadBuild(buildInfoFn, env) {
  let info;
  try {
    info = buildInfoFn({ env });
  } catch (error) {
    return check("payload-build", "fail", `The installed build could not be read: ${error?.message ?? "unknown fault"}.`);
  }
  const mode = info?.mode;
  const buildId = typeof info?.buildId === "string" && info.buildId.length > 0 ? info.buildId : null;
  if (mode === "embedded") {
    return check("payload-build", "fail", "The launcher ran its compiled-in bundle (`embedded`) — the payload did not land, so this install is not the build you deployed.");
  }
  if (mode === "payload") {
    return buildId
      ? check("payload-build", "pass", `The installed build is payload ${buildId}.`)
      : check("payload-build", "fail", "This install carries no build stamp, so the payload's build cannot be named.");
  }
  if (mode === "source") {
    return buildId
      ? check("payload-build", "pass", `Running from a source checkout at ${buildId}.`)
      : check("payload-build", "fail", "The running build could not be named — a source checkout with no git build id.");
  }
  return check("payload-build", "fail", `The running build could not be named (mode ${mode == null ? "unset" : `\`${mode}\``}).`);
}

// ─────────────────────────────────────────────────────────────────────────────
// the roster — resolved ONCE, read by the two checks that need it
// ─────────────────────────────────────────────────────────────────────────────

// resolveRoster(options) -> { ok, kind, detail, workspaces[], skipped[] }.
//
// `resolveNodeWorkspaces` opens the projection store, `mkdir`s its directory into
// existence, migrates its schema and `stat`s every registered work dir. `126/06` called it
// TWICE per preflight — 334 rows enumerated twice on this node — on a verb whose register
// row says it "writes nothing on any path". One resolve fixes the cost, the write and the
// third thing nobody had named: two checks reading two DIFFERENT workspace sets, since
// nothing made the second answer equal the first.
//
// `workspaces` and `skipped` are normalised to arrays HERE, so a degraded answer is a
// short report rather than a `TypeError` out of a check.
async function resolveRoster({ nodeId, workspacesFn }) {
  if (typeof nodeId !== "string" || nodeId.length === 0) {
    return { ok: false, kind: "no-identity", detail: null, workspaces: [], skipped: [] };
  }
  let answer;
  try {
    answer = await workspacesFn(nodeId);
  } catch (error) {
    return { ok: false, kind: "threw", detail: error?.message ?? "unknown fault", workspaces: [], skipped: [] };
  }
  if (answer?.ok !== true) {
    return { ok: false, kind: "not-ok", detail: null, workspaces: [], skipped: [] };
  }
  return {
    ok: true,
    kind: null,
    detail: null,
    workspaces: Array.isArray(answer.workspaces) ? answer.workspaces : [],
    skipped: Array.isArray(answer.skipped) ? answer.skipped : [],
  };
}

// The three ways a node fails to answer, worded identically for both checks that ask.
function unenumerable(code, roster) {
  if (roster.kind === "threw") {
    return check(code, "fail", `This node's workspaces could not be enumerated: ${roster.detail}.`);
  }
  if (roster.kind === "no-identity") {
    return check(code, "fail", "This node's workspaces could not be enumerated — this install has no node identity yet.");
  }
  return check(code, "fail", "This node's workspaces could not be enumerated — the projection store did not answer.");
}

// A workspace row's own root, or null when the row names neither. A row that names neither
// cannot be read and cannot be repaired by a command run "in" it — so it is reported as
// unreadable rather than named "an unnamed root" beside a remedy that could not be typed.
function workspaceRoot(workspace) {
  for (const candidate of [workspace?.projectRoot, workspace?.workDir]) {
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return null;
}

function workspaceLabel(workspace) {
  const id = workspace?.workspaceId;
  return typeof id === "string" && id.length > 0 ? id : "an unnamed workspace";
}

// Offenders NAMED until the budget is spent, then COUNTED. At least one is always named:
// a verdict that names nothing is a verdict about nothing.
function nameOffenders(offenders) {
  const named = [];
  let spent = 0;
  for (const offender of offenders) {
    if (named.length > 0 && spent + offender.length > OFFENDER_BUDGET) break;
    named.push(offender);
    spent += offender.length + 2;
  }
  const rest = offenders.length - named.length;
  return `${named.join("; ")}${rest > 0 ? `; and ${rest} more not named` : ""}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// workspace-identity-pinned
// ─────────────────────────────────────────────────────────────────────────────

// TECH_DEBT item 4 stated as a CHECK, never as a repair. Three reads this must NOT
// make, each measured at the contract beat, each a false green or a write:
//   · NOT `resolveWorkspaceId` — an unpinned workspace falls through to the path
//     derivation and comes back with an id, so every workspace would read as pinned.
//     The KEY is what is read.
//   · NOT `loadWorkspace` — it merges the MACHINE-WIDE mesh config over the
//     workspace's own, and carries the one sanctioned load-time identity WRITE
//     (`healIdentitySidecar`), whose target can be a sidecar under a project root.
//   · NOT `deriveNodeId` with a sidecarPath — this node's id is READ, never minted.
async function checkWorkspaceIdentityPinned({ roster, workspaceConfigFn }) {
  if (!roster.ok) return unenumerable("workspace-identity-pinned", roster);

  const problems = [];
  for (const skip of roster.skipped) {
    problems.push(`${skip?.workspaceId ?? "an unnamed workspace"} was skipped (${skip?.reason ?? "no reason given"})`);
  }

  const workspaces = roster.workspaces;
  for (const workspace of workspaces) {
    const root = workspace?.projectRoot ?? workspace?.workDir ?? "an unnamed root";
    let config;
    try {
      config = await workspaceConfigFn(workspace?.projectRoot ?? workspace?.workDir);
    } catch (error) {
      problems.push(`${root}: its config could not be read (${error?.message ?? "unknown fault"})`);
      continue;
    }
    if (config == null) {
      problems.push(`${root}: its config could not be read`);
      continue;
    }
    const pinned = config?.mesh?.workspaceId;
    if (typeof pinned !== "string" || pinned.length === 0) {
      problems.push(`${root}: no \`mesh.workspaceId\` pinned in its own .aof/aof.config.json`);
    }
  }

  if (problems.length > 0) {
    return check("workspace-identity-pinned", "fail", `Workspace identity is not pinned everywhere — ${problems.join("; ")}.`);
  }
  if (workspaces.length === 0) {
    return check("workspace-identity-pinned", "pass", "No workspace is registered to this node.");
  }
  return check("workspace-identity-pinned", "pass", `All ${workspaces.length} registered workspace(s) pin their own \`mesh.workspaceId\`.`);
}

// The workspace's OWN config, by project root — `<projectRoot>/.aof/aof.config.json`,
// read directly, with no walk up to an ancestor's and no machine-wide merge.
async function defaultWorkspaceConfigFn(projectRoot) {
  if (typeof projectRoot !== "string" || projectRoot.length === 0) return null;
  const { configPath } = workspacePaths(projectRoot);
  return JSON.parse(await readFile(configPath, "utf8"));
}

// ─────────────────────────────────────────────────────────────────────────────
// heartbeat-hook-installed
// ─────────────────────────────────────────────────────────────────────────────

// The hook's OWN declaration, through the ONE resolver (`claudeHookDeclarations`,
// ADR-013/C1) rather than constants beside the check. Two facts come from it and neither
// is re-spelled here: which EVENT the hook is declared to fire on, and — via the
// registration it produces on disk — which FILE that registration runs.
function defaultBundleHookFn() {
  return claudeHookDeclarations(null).find((hook) => hook?.id === HEARTBEAT_HOOK_ID) ?? null;
}

// findRegistration(settings, hookId) -> { event, entry } | null.
//
// The marker is looked for INSIDE the `hooks` map, under the event key that dispatches it
// — never anywhere in the document. `126/06` walked the whole document, so a marker parked
// under any other key reported `pass`: exactly the silent-green this check exists to
// refuse, one level up from the one it was written for.
//
// The nesting BELOW an event is still WALKED rather than spelled, which is 126/06's own
// reason and it still holds: `spliceSettings` groups entries under
// `hooks[event][].hooks[]`, and that grouping is the bundle's business rather than this
// check's.
function findRegistration(settings, hookId) {
  const hooks = settings?.hooks;
  if (hooks == null || typeof hooks !== "object" || Array.isArray(hooks)) return null;
  for (const [event, groups] of Object.entries(hooks)) {
    const entry = findMarked(groups, hookId, new Set());
    if (entry != null) return { event, entry };
  }
  return null;
}

function findMarked(node, hookId, seen) {
  if (node == null || typeof node !== "object") return null;
  if (seen.has(node)) return null;
  seen.add(node);
  if (!Array.isArray(node) && node[AOF_HOOK_MARKER] === hookId) return node;
  for (const value of Array.isArray(node) ? node : Object.values(node)) {
    const found = findMarked(value, hookId, seen);
    if (found != null) return found;
  }
  return null;
}

// The registration NAMES ITS OWN FILE. `markedEntry` writes the script as the first argv
// element; the harness substitutes `${CLAUDE_PROJECT_DIR}` before spawning it. Probing a
// constant instead would false-FAIL an overridden declaration (a supported path —
// `claudeHookDeclarations` merges a project's own hook of the same id over the bundle's)
// and false-PASS a stale canonical file sitting beside a missing registered one.
function hookFileArg(entry) {
  const args = Array.isArray(entry?.args) ? entry.args : [];
  return args.find((arg) => typeof arg === "string" && arg.length > 0) ?? null;
}

function resolveHookPath(projectRoot, spelled) {
  return path.resolve(projectRoot, spelled.replaceAll(PROJECT_DIR_TOKEN, projectRoot));
}

function describeShape(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return `a ${typeof value}`;
}

// heartbeat-hook-installed (126/06) — every workspace on this node carries the
// `claude-run-heartbeat` hook, registered under the event it is declared for AND present
// on disk.
//
// WHY IT IS A CHECK AND NOT A REPAIR. Measured on this node 2026-09-10: a supervised loop
// declared in a workspace without the hook died after about a minute, wrote no
// `heartbeatAt`, and its attempt was billed from mint to the reclaim stamp 8½ hours later
// — `deadline-exhausted, elapsedMs=30851979` against a 7,200,000 ms ceiling, the
// declaration permanently unresumable. Nothing warned. `aof work update` installs the
// hook, so the condition was always fixable; only the report was missing.
//
// TWO CLASSES, REPORTED SEPARATELY. `aof work update` fixes a workspace that is MISSING
// the registration; it fixes nothing about a workspace that could not be READ at all —
// and three of this node's rows are transient temp-launcher roots whose settings will
// never be readable, so a single remedy sentence over both classes is permanently red with
// an inapplicable instruction.
async function checkHeartbeatHookInstalled({ roster, settingsFn, hookFileFn, bundleHookFn }) {
  const code = "heartbeat-hook-installed";
  if (!roster.ok) return unenumerable(code, roster);

  let declaration;
  try {
    declaration = await bundleHookFn();
  } catch (error) {
    return check(code, "fail", `This build's \`${HEARTBEAT_HOOK_ID}\` declaration could not be read: ${error?.message ?? "unknown fault"}.`);
  }
  const declaredEvent = typeof declaration?.event === "string" && declaration.event.length > 0 ? declaration.event : null;
  if (declaredEvent == null) {
    return check(code, "fail", `This build's bundle declares no \`${HEARTBEAT_HOOK_ID}\` hook, so no workspace can be checked against it.`);
  }

  const missing = [];
  const unreadable = [];
  const seen = new Set();

  for (const workspace of roster.workspaces) {
    const root = workspaceRoot(workspace);
    if (root == null) {
      unreadable.push(`${workspaceLabel(workspace)}: its row names neither a project root nor a work dir, so there is nothing to read`);
      continue;
    }
    // A workspace registered twice is one workspace: naming it twice reports one fault as
    // two and spends the offender budget saying the same thing.
    if (seen.has(root)) continue;
    seen.add(root);

    let settings;
    try {
      settings = await settingsFn(root);
    } catch (error) {
      unreadable.push(`${root}: its ${CLAUDE_SETTINGS_RELPATH} could not be read (${error?.message ?? "unknown fault"})`);
      continue;
    }
    // A document that parses but is not an object (`[]`, `"true"`, `7`, `true`) is an
    // UNREADABLE shape, not an absent registration: reporting it as "no hook registered"
    // sends the operator to `aof work update`, which will refuse to merge into it.
    if (settings == null || typeof settings !== "object" || Array.isArray(settings)) {
      unreadable.push(`${root}: its ${CLAUDE_SETTINGS_RELPATH} is ${describeShape(settings)} rather than a settings object`);
      continue;
    }

    let found;
    try {
      found = findRegistration(settings, HEARTBEAT_HOOK_ID);
    } catch (error) {
      unreadable.push(`${root}: its ${CLAUDE_SETTINGS_RELPATH} could not be searched (${error?.message ?? "unknown fault"})`);
      continue;
    }

    if (found == null) {
      const parked = findMarked(settings, HEARTBEAT_HOOK_ID, new Set()) != null;
      missing.push(parked
        ? `${root}: its \`${HEARTBEAT_HOOK_ID}\` marker sits outside the \`hooks\` map, where nothing dispatches it`
        : `${root}: no \`${HEARTBEAT_HOOK_ID}\` hook registered in its ${CLAUDE_SETTINGS_RELPATH}`);
      continue;
    }
    if (found.event !== declaredEvent) {
      missing.push(`${root}: registers \`${HEARTBEAT_HOOK_ID}\` under \`${found.event}\` rather than the declared \`${declaredEvent}\`, so it does not fire when the hook is declared to`);
      continue;
    }

    const spelled = hookFileArg(found.entry);
    if (spelled == null) {
      missing.push(`${root}: registers \`${HEARTBEAT_HOOK_ID}\` but its entry names no file to run`);
      continue;
    }
    let present;
    try {
      present = await hookFileFn(resolveHookPath(root, spelled), root);
    } catch (error) {
      unreadable.push(`${root}: its \`${HEARTBEAT_HOOK_ID}\` hook file could not be probed (${error?.message ?? "unknown fault"})`);
      continue;
    }
    if (present !== true) {
      missing.push(`${root}: registers \`${HEARTBEAT_HOOK_ID}\` but ${spelled} is not on disk`);
    }
  }

  // The skip list is COUNTED, never enumerated (126/VERIFICATION F-28): its sibling prints
  // one 16,827-character line on this node, which is a verdict no operator can read.
  const skipNote = roster.skipped.length > 0 ? ` (${roster.skipped.length} workspace(s) skipped and not checked)` : "";
  const unreadableNote = unreadable.length > 0
    ? ` ${unreadable.length} more could not be checked at all, which \`aof work update\` does not fix: ${nameOffenders(unreadable)}.`
    : "";

  if (missing.length > 0) {
    return check(
      code,
      "fail",
      `A supervised loop there would write no liveness and its whole compute budget would be billed to the reclaim — run \`aof work update\` in each: ${nameOffenders(missing)}.${unreadableNote}${skipNote}`,
    );
  }
  if (unreadable.length > 0) {
    return check(
      code,
      "fail",
      `${unreadable.length} of this node's workspace(s) could not be checked at all, so its liveness cannot be vouched for — and \`aof work update\` does not fix these: ${nameOffenders(unreadable)}.${skipNote}`,
    );
  }
  if (roster.workspaces.length === 0) {
    // GENUINELY NONE is a pass — there is nothing that could lose its liveness. ALL
    // SKIPPED is not: nothing was checked, and reporting `pass — No workspace is
    // registered to this node` on a node carrying 327 skipped rows is the silent green
    // this whole preflight exists to refuse. Its sibling already reports FAIL on that
    // identical answer.
    return roster.skipped.length === 0
      ? check(code, "pass", "No workspace is registered to this node.")
      : check(code, "fail", `No workspace on this node could be checked — all ${roster.skipped.length} registered row(s) were skipped, so nothing here says whether a supervised loop would record liveness.`);
  }
  return check(code, "pass", `All ${roster.workspaces.length} registered workspace(s) carry the \`${HEARTBEAT_HOOK_ID}\` hook${skipNote}.`);
}

async function defaultSettingsFn(projectRoot) {
  if (typeof projectRoot !== "string" || projectRoot.length === 0) return null;
  return JSON.parse(await readFile(claudeSettingsPath(projectRoot), "utf8"));
}

async function defaultHookFileFn(hookPath) {
  if (typeof hookPath !== "string" || hookPath.length === 0) return false;
  try {
    await access(hookPath, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// the verb-facing surface
// ─────────────────────────────────────────────────────────────────────────────

// FAILS CLOSED AT THE VERB, not one call wide. `126/06` wrapped exactly one call
// (`settingsFn`), so a throw from the registration search or from an injected `hookFileFn`
// escaped `runPreflight` into the face — and on `mesh:desktop-run` that lands AFTER the
// app has been spawned detached, enveloping a launch that succeeded as a refusal. Every
// check is run inside this, so the worst a broken probe can do is report itself.
async function guarded(code, run) {
  try {
    return await run();
  } catch (error) {
    return check(code, "fail", `This check could not be completed: ${error?.message ?? "unknown fault"}.`);
  }
}

// EVERY SEAM `runPreflight` READS, NAMED ONCE. `126/06` added `settingsFn` and
// `hookFileFn` and forwarded them from NEITHER face: both verbs listed six ctx keys by
// hand, so on the only path an operator or the bijection gate takes, the two new reads hit
// the real filesystem and no caller could displace them — while two suites passed those
// keys believing they injected. A new seam is now forwarded by construction rather than by
// remembering two call sites, and `FF-12607` asserts this list against what the function
// actually reads.
export const PREFLIGHT_SEAMS = Object.freeze([
  "env",
  "nodeId",
  "claudeFn",
  "buildInfoFn",
  "workspacesFn",
  "workspaceConfigFn",
  "settingsFn",
  "hookFileFn",
  "bundleHookFn",
]);

// An absent key is OMITTED rather than passed as `undefined`, because `nodeId`
// distinguishes "not supplied — read the sidecar" from "supplied as null — no identity".
export function preflightSeams(ctx = {}) {
  const seams = {};
  for (const key of PREFLIGHT_SEAMS) {
    if (ctx[key] !== undefined) seams[key] = ctx[key];
  }
  return seams;
}

// runPreflight(options) -> an ORDERED list of FOUR `{ code, status, message }`, in
// `PREFLIGHT_CHECKS`' order. It rides the SUCCESS answer of a verb only, so a verb that
// refuses carries its `{ ok, error, code }` envelope unchanged and no probe is spawned
// behind a refusal.
export async function runPreflight(options = {}) {
  const env = options.env ?? process.env;
  const claudeFn = typeof options.claudeFn === "function" ? options.claudeFn : defaultRunner();
  const buildInfoFn = typeof options.buildInfoFn === "function" ? options.buildInfoFn : readBuildInfo;
  const workspacesFn = typeof options.workspacesFn === "function" ? options.workspacesFn : resolveNodeWorkspaces;
  const workspaceConfigFn =
    typeof options.workspaceConfigFn === "function" ? options.workspaceConfigFn : defaultWorkspaceConfigFn;
  const settingsFn = typeof options.settingsFn === "function" ? options.settingsFn : defaultSettingsFn;
  const hookFileFn = typeof options.hookFileFn === "function" ? options.hookFileFn : defaultHookFileFn;
  const bundleHookFn = typeof options.bundleHookFn === "function" ? options.bundleHookFn : defaultBundleHookFn;

  // This node's id is READ, never minted: the sidecar at the GLOBAL identity path.
  let nodeId = options.nodeId;
  if (nodeId === undefined) {
    try {
      const sidecar = await readSidecar(globalMeshPaths({ env }).identityPath);
      nodeId = typeof sidecar?.nodeId === "string" ? sidecar.nodeId : null;
    } catch {
      nodeId = null;
    }
  }

  const roster = await resolveRoster({ nodeId, workspacesFn });

  return [
    await guarded("claude-authenticated", () => checkClaudeAuthenticated(claudeFn)),
    await guarded("payload-build", () => checkPayloadBuild(buildInfoFn, env)),
    await guarded("workspace-identity-pinned", () => checkWorkspaceIdentityPinned({ roster, workspaceConfigFn })),
    await guarded("heartbeat-hook-installed", () => checkHeartbeatHookInstalled({ roster, settingsFn, hookFileFn, bundleHookFn })),
  ];
}

// The preflight's render lines, shared by `install` and `run` so both say the same
// thing in the same words — a check nobody runs is prose, and two renders that drift
// are worse than one.
export function renderPreflight(preflight = []) {
  return preflight.map((entry) => `  ${entry.status === "pass" ? "ok" : "FAIL"}  ${entry.code} — ${entry.message}`);
}
