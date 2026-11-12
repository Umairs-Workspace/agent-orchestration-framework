import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { access } from "node:fs/promises";
import { commandError } from "@aof/contracts/error";
import { MESH_WORKSPACE_FLAG, guardMeshPositionals } from "./face-shared.mjs";
import { SESSION_SPAWN_ACK_KIND, buildSessionEndFrame, buildSessionEndEnvelope } from "../session-spawn-directive.mjs";
import { launchSessionName } from "../session-spawn-handler.mjs";


// Core supplies configured services; constructing command definitions performs no I/O.
export function createMeshSessionCommands({ loadWorkspace, resolveInstallSalt, deriveNodeId, sidecarPathFor, startSession, pingSession, endSession, resolveWorkspaceId, reportDegrade }) {
// `aof session start|ping|end` — the assistant-agnostic CLI seam (milestone 38 /
// story 00, ADR-002; the id ladder added by milestone 48 / story 00, ADR-001) that is
// the SOLE producer of a per-(nodeId, workspaceId, assistant, sessionId) session
// record. A CLI-only nested verb group (the mesh-desktop.mjs /
// mesh-assign.mjs `← 1 cli.mjs` shape): kept out of cli.mjs's body so the parsing +
// identity resolution is unit-testable without spawning the CLI, and NOT registered
// as a mesh:* command (a session verb's identity resolution — stdin JSON /
// CLAUDE_SESSION_ID env — doesn't fit meshVerbCli's single-positional shape).
//
// Identity resolution (task 05, RESEARCH.md §2): a Claude Code hook delivers session
// identity over STDIN JSON (session_id/cwd/…) or, redundantly, via the
// CLAUDE_SESSION_ID env var. The CLI PREFERS the stdin payload, falls back to the env
// channel when the payload is absent/malformed, and refuses LOUDLY only when NEITHER
// channel yields identity — but `--workspace`/`--repo`/`--assistant` flags are the
// PRIMARY, assistant-agnostic argument shape (a human/CI caller never needs a hook
// payload at all); the stdin/env channel is consulted only to fill in an operator id
// the flags did not supply (today: nothing reads a nodeId off the hook payload — the
// node's own stable identity is resolved the SAME way mesh:heartbeat does).
// m42 item 3 — every former silent catch reports a coded degrade event.

// A calm coded refusal — the ONLY error shape this module throws for an expected
// input problem (never a stack trace).
function sessionError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// requireNonBlank(value, arg) — a missing OR whitespace-only value is refused with a
// stable coded exit (`session-arg-missing-<arg>`) — NO record is written (the
// sole-producer discipline never emits a half-formed record).
function requireNonBlank(value, arg) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw sessionError(`session-arg-missing-${arg}`, `--${arg} is required and must not be blank.`);
  }
  return value;
}

// ------------------------------------------------- session identity resolution ----

// nonBlank(value) — the ladder's rung test (48/ADR-001): a rung SUPPLIES an id only
// when it holds a non-blank string, and the value it supplies is the ORIGINAL bytes,
// never a trimmed copy. The id's only job is to match another system's id exactly, so
// this function may narrow WHICH rung wins but must never rewrite what it carries.
function nonBlank(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

// resolveSessionIdentity({ stdinText, env }) — PURE over its inputs (task 05): parses
// a well-formed JSON stdin payload; resolves the session id through the hook rungs of
// 48/ADR-001's ordered ladder — the payload's `session_id` first, then
// `env.CLAUDE_SESSION_ID` — and resolves to `{ sessionId: null }` when neither
// supplies one (the caller decides whether/how loudly to refuse — this function itself
// never throws). Never reads argv for identity (task 05's "no session identity is read
// from argv"); the `--session` flag that HEADS the ladder is applied by the CLI face
// below, where argv lives.
//
// 48/ADR-001: a payload that carries no `session_id` FALLS THROUGH to the env rung
// while still returning its `payload` — a real hook payload's `cwd` is what the F4
// workspace/repo derivation reads, and the id ladder and that derivation are
// independent. The id is READ, never made: no channel supplying one is `null`, and
// `null` is a first-class answer.
function resolveSessionIdentity({ stdinText, env } = {}) {
  const trimmed = typeof stdinText === "string" ? stdinText.trim() : "";
  let payload = null;
  if (trimmed.length > 0) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") payload = parsed;
    } catch (error) {
      // malformed JSON — fall through to the env channel.
      reportDegrade("commands-mesh-session", error); }
  }
  const payloadSessionId = nonBlank(payload?.session_id);
  if (payloadSessionId != null) return { source: "stdin", sessionId: payloadSessionId, payload };
  const envSessionId = nonBlank(env?.CLAUDE_SESSION_ID);
  if (envSessionId != null) return { source: "env", sessionId: envSessionId, payload };
  return { source: payload != null ? "stdin" : null, sessionId: null, payload };
}

// readStdinText() — the REAL, production stdin read (never called from a pure test):
// reads process.stdin to completion if it is piped, resolving "" immediately when
// stdin is a TTY (an interactive invocation carries no hook payload — never block
// waiting on a terminal that will never close its pipe).
async function readStdinText() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks.map((chunk) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))).toString("utf8");
}

// cwdIsAofWorkspace(ws) — true iff the ALREADY-loaded workspace's configPath is a
// real file on disk (never merely loadWorkspace's silent `{}` default for an absent
// config). This is the ONE predicate the F4 cwd-derivation fallback (below) uses to
// refuse LOUDLY rather than silently deriving a well-formed-looking (but bogus)
// workspaceId hash off a directory that was never an aof workspace at all —
// `workspaceIdFor` happily hashes ANY path, workspace or not, so an explicit
// existence check is load-bearing here, not cosmetic.
async function cwdIsAofWorkspace(ws) {
  try {
    await access(ws.configPath);
    return true;
  } catch {
    return false;
  }
}

// resolveNodeId(ws) — THIS node's stable id, the SAME way mesh:heartbeat resolves it
// (a pinned config.mesh.nodeId wins verbatim; a never-published node derives +
// persists a stable id to the git-ignored global sidecar) — heartbeat/session share
// one id.
async function resolveNodeId(ws) {
  const config = ws.config ?? {};
  const sidecarPath = ws.identityPath ?? sidecarPathFor(ws.aofDir);
  const salt = await resolveInstallSalt(sidecarPath, config);
  return deriveNodeId({ config, hostname: os.hostname(), salt, sidecarPath });
}

// ─────────────────────────────────────────────────────────────────────────────
// The CLI face: `aof session start|ping|end` (task 00_session-cli-record.feature +
// task 05's identity resolution). cli.mjs routes the WHOLE `session` command here
// via ONE additive top-level `command === "session"` branch (the mesh-desktop.mjs
// nested-verb precedent) — this module dispatches on its OWN inner verb.
// ─────────────────────────────────────────────────────────────────────────────

// `--session` (48/ADR-001) joins the assistant-agnostic flag trio as a REAL flag, not
// a test seam: it is how a caller with no hook payload at all — a human, CI, or
// milestone 50's launcher — supplies the session id, and it HEADS the ladder. Adding
// it must not soften the unknown-flag refusal: `--sessions`, `--sess` and
// `--session-id` are still `invalid-input`.
const SESSION_FLAGS = new Set(["json", "workspace", "repo", "assistant", "session"]);

function emitSessionEnvelope(asJson, ok, payload) {
  if (asJson) {
    const { message, ...jsonPayload } = payload;
    console.log(JSON.stringify({ ok, ...jsonPayload }, null, 2));
    if (!ok) process.exitCode = 1;
    return;
  }
  if (ok) {
    if (typeof payload.message === "string") console.log(payload.message);
    return;
  }
  console.error(payload.error);
  process.exitCode = 1;
}

function sessionFlagTokens(args) {
  return args
    .filter((arg) => typeof arg === "string" && arg.startsWith("--"))
    .map((arg) => arg.slice(2).split("=", 2)[0]);
}

// A tiny local option parser (mirrors mesh-desktop.mjs's own — no dependency on
// cli.mjs internals, keeping the `← 1 cli.mjs` graph edge one-directional).
function parseSessionOptions(args) {
  const options = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (typeof arg !== "string" || !arg.startsWith("--")) {
      options._.push(arg);
      continue;
    }
    // 143/02 — the inline value is everything after the FIRST `=` (`split("=", 2)` dropped the rest),
    // the same fix the one face parser took.
    const body = arg.slice(2);
    const equals = body.indexOf("=");
    const key = equals < 0 ? body : body.slice(0, equals);
    const inlineValue = equals < 0 ? undefined : body.slice(equals + 1);
    if (key === "json") {
      options[key] = true;
      continue;
    }
    options[key] = inlineValue ?? args[++index];
  }
  return options;
}

// meshSessionCommand(args, ctx) — the ONE export cli.mjs's `command === "session"`
// branch calls. `args` is everything after `session` (e.g.
// ["ping", "--workspace", "ws-1", "--repo", "my-repo", "--assistant", "claude-code"]).
// `ctx.env`/`ctx.readStdinText`/`ctx.now`/`ctx.loadWorkspace` are injected test seams;
// production supplies none of them (real process.env, real stdin, real clock, real
// loadWorkspace).
async function meshSessionCommand(args, ctx = {}) {
  const verb = typeof args[0] === "string" && !args[0].startsWith("--") ? args[0] : undefined;
  const rest = verb === undefined ? args : args.slice(1);

  const flagTokens = sessionFlagTokens(rest);
  const wantsJson = flagTokens.includes("json");
  const unknownFlag = flagTokens.find((flag) => !SESSION_FLAGS.has(flag));
  const options = parseSessionOptions(rest);
  if (wantsJson) options.json = true;

  if (unknownFlag) {
    emitSessionEnvelope(options.json, false, { error: `Unknown option "--${unknownFlag}".`, code: "invalid-input" });
    return;
  }

  if (verb === undefined) {
    emitSessionEnvelope(options.json, false, {
      error: "`aof session` needs a verb.\n\nUsage:\n  aof session start --workspace <id> --repo <name> --assistant <name> [--session <id>]\n  aof session ping  --workspace <id> --repo <name> --assistant <name> [--session <id>]\n  aof session end   --workspace <id> --assistant <name> [--session <id>]",
      code: "invalid-input",
    });
    return;
  }

  if (verb !== "start" && verb !== "ping" && verb !== "end") {
    emitSessionEnvelope(options.json, false, { error: `Unknown session verb "${verb}".`, code: "unknown-subcommand" });
    return;
  }

  // Identity resolution (task 05): prefer explicit --workspace/--repo/--assistant
  // flags; when a flag is absent, fall back to the hook-delivered stdin JSON / env
  // channel so a Claude Code hook that supplies only the payload still resolves.
  const readStdin = ctx.readStdinText ?? readStdinText;
  const stdinText = typeof ctx.stdinText === "string" ? ctx.stdinText : await readStdin();
  const env = ctx.env ?? process.env;
  const identity = resolveSessionIdentity({ stdinText, env });
  const payload = identity.payload;

  let workspaceId = options.workspace ?? payload?.workspace ?? null;
  let repo = options.repo ?? payload?.repo ?? null;
  const assistant = options.assistant ?? payload?.assistant ?? (identity.source != null ? "claude-code" : null);

  // 48/ADR-001's ORDERED id ladder, evaluated in this order and stopping at the first
  // NON-BLANK value: (1) the `--session` flag, (2) the hook payload's `session_id`,
  // (3) `env.CLAUDE_SESSION_ID`, (4) null. Rungs 2-3 live in resolveSessionIdentity
  // (which owns both hook channels); this line adds the flag that heads it. The value
  // is OPAQUE — no lowercasing, no UUID re-formatting, no hashing, no prefixing, no
  // truncation — because its only job is to match, byte for byte, the id the
  // assistant issued and the worker already captured off its transcript. An id that
  // no channel supplied is `null`, NEVER generated: a fabricated id would be stable,
  // unique, and unable to name the session the terminal mirror is already routing to.
  const sessionId = nonBlank(options.session) ?? identity.sessionId;

  // FINDING F4 fix (task 07): a REAL Claude Code hook payload NEVER carries
  // `workspace`/`repo` (RESEARCH.md §2.2, measured) — only `cwd` (+ session_id/
  // transcript_path/hook_event_name). When flags AND the payload's own fields both
  // leave workspace/repo unresolved, and an ACTUAL payload arrived (a hook fired —
  // this is deliberately gated on `payload != null`, never on a fully
  // flagless/payloadless call, which keeps its pre-existing
  // `session-arg-missing-*` refusal below untouched, task 05's own "(neither
  // channel)" contract), derive them from the payload's `cwd` — falling back to
  // ctx.cwd/process.cwd() only when the payload carries no usable `cwd`. The
  // workspace load moves EARLY (ahead of validation) so the SAME loaded workspace
  // backs both the derivation and the eventual record write (never two divergent
  // loads for one invocation).
  const payloadCwd = typeof payload?.cwd === "string" && payload.cwd.trim().length > 0 ? payload.cwd : null;
  const resolvedCwd = payloadCwd ?? ctx.cwd ?? process.cwd();
  const loadWs = ctx.loadWorkspace ?? loadWorkspace;
  const ws = await loadWs(resolvedCwd, ctx.config);

  let cwdDerivationFailed = false;
  if (payload != null && (workspaceId == null || repo == null)) {
    if (await cwdIsAofWorkspace(ws)) {
      const cfg = ws.config ?? {};
      // The CANONICAL idiom the presence publisher itself uses
      // (mesh-launcher.mjs:375, global-node-registry.mjs:42, `workspaceIdFor` from
      // global-work-store.mjs) — LOAD-BEARING, not cosmetic: a record keyed on a
      // non-canonical id would be invisible to ADR-003 presence aggregation and
      // would break ADR-004 run↔session subsumption.
      if (workspaceId == null) workspaceId = resolveWorkspaceId({ config: cfg, projectRoot: ws.projectRoot });
      // `repo` mirrors the SAME `name` field the workspace registry/descriptor
      // stores (global-work-store.mjs publishWorkspaceSnapshot, global-node-
      // registry.mjs assembleGlobalRegistrySnapshot: both read `config.name`).
      if (repo == null) repo = cfg.name ?? null;
    } else {
      // The sole-producer discipline (task 00) survives the fix: a cwd that cannot
      // resolve to a real aof workspace still refuses LOUDLY — never a silent
      // no-op, never a half-formed record. Flagged here (not thrown yet) so the
      // per-verb ladder below still decides WHICH still-unresolved field this
      // refusal is about.
      cwdDerivationFailed = true;
    }
  }

  try {
    if (cwdDerivationFailed && workspaceId == null) {
      throw sessionError("session-cwd-not-workspace", `The hook payload's cwd ("${resolvedCwd}") does not resolve to an aof workspace. Pass --workspace/--repo explicitly, or point the hook at a real aof workspace.`);
    }
    if (verb === "start" || verb === "ping") {
      requireNonBlank(workspaceId, "workspace");
      if (verb === "start") {
        if (cwdDerivationFailed && repo == null) {
          throw sessionError("session-cwd-not-workspace", `The hook payload's cwd ("${resolvedCwd}") does not resolve to an aof workspace. Pass --workspace/--repo explicitly, or point the hook at a real aof workspace.`);
        }
        requireNonBlank(repo, "repo");
      }
      requireNonBlank(assistant, "assistant");
    } else {
      requireNonBlank(workspaceId, "workspace");
      requireNonBlank(assistant, "assistant");
    }
  } catch (error) {
    emitSessionEnvelope(options.json, false, { error: error.message, code: error.code });
    return;
  }

  // NB: task 05's "(neither channel) → loud coded refusal, no record" outcome is
  // ALREADY fully covered by the per-arg requireNonBlank checks above — when
  // NEITHER the stdin JSON nor the CLAUDE_SESSION_ID env channel yields a value,
  // `payload` is null, so the cwd-derivation block above never runs and
  // workspaceId/repo/assistant are each still null, so the relevant
  // `session-arg-missing-<field>` refusal fires (and no record is written) before
  // ever reaching this point. There is no additional "both channels present but
  // still somehow unresolved" state to guard here — a distinct
  // `session-identity-unresolved` branch would be dead code (unreachable: every
  // required field's own requireNonBlank check already catches its absence).

  const nodeId = ctx.nodeId ?? (await resolveNodeId(ws));
  const now = typeof ctx.now === "function" ? ctx.now() : ctx.now;

  if (verb === "start") {
    const record = await startSession(ws, { nodeId, workspaceId, repo, assistant, sessionId, now });
    emitSessionEnvelope(options.json, true, { ...record, message: `Session started for ${record.assistant} on ${record.workspaceId} (${record.repo}).` });
    return;
  }
  if (verb === "ping") {
    const record = await pingSession(ws, { nodeId, workspaceId, repo, assistant, sessionId, now });
    emitSessionEnvelope(options.json, true, { ...record, message: `Session pinged for ${record.assistant} on ${record.workspaceId}.` });
    return;
  }
  // `end` names WHICH session it is ending: it removes only its own full 4-part leaf,
  // so a sibling session in the same repo is untouched (48/ADR-002).
  await endSession(ws, { nodeId, workspaceId, assistant, sessionId });
  emitSessionEnvelope(options.json, true, { message: `Session ended for ${assistant} on ${workspaceId}.` });
}


return { resolveSessionIdentity, meshSessionCommand, readStdinText, resolveNodeId };
}

// ═════════════════ 191/ADR-003, ADR-004 — `aof mesh session start|list|end` ═════════════════
//
// The REGISTERED session verbs, beside (never inside) the CLI-only `aof session start|ping|end`
// hook seam above: those write this node's own session record for a session that already exists;
// these ask the mesh to START one — `claude --remote-control` in a project, on the control or on a
// named node — list the live ones, and END one a node launched. They take the `mesh:` prefix, so
// the mesh CLI bijection gate covers them with no edit to its predicate (the `mesh:terminal-resume`
// precedent).
//
// FF-19103: `mesh:session-start` reaches the dispatch only through `planSessionStart`
// (session-start.mjs), the core the fleet route also uses, and pushes the envelope the plan hands
// it. It never builds the spawn frame or its envelope itself.

// The link a Remote Control session paints (RESEARCH Q1): the session URL, often inside an OSC-8
// hyperlink, so nothing is stripped before matching. The id class stops at the OSC-8 terminator,
// a `?` and whitespace alike.
export const SESSION_LINK_PATTERN = /https:\/\/claude\.ai\/code\/[A-Za-z0-9_-]+/;
// The mirror's discipline (ADR-003 §3): in memory, at most this many bytes of the session's output
// are ever scanned, however long the wait.
export const SESSION_LINK_SCAN_BYTES = 64 * 1024;
// The longest a start may be asked to wait. Discord asks 45 s (ADR-003 §3); a wait is a watch on
// one socket, so the bound only keeps a typo from holding a CLI open for an hour.
export const MAX_SESSION_START_WAIT_MS = 600_000;

// 191/ADR-004 §3 — how long an end waits for the session's record to leave its node's presence,
// and how often it looks. Presence is republished on a ticker of about 5 s, so 15 s is three
// cadences: long enough that a real end is seen, short enough to answer from a phone.
export const SESSION_END_CONFIRM_MS = 15_000;
export const SESSION_END_POLL_MS = 1_000;

// The wall clock an end waits on. A test hands its own through `ctx.sessionEndClock`, so the 15 s
// bound is asserted at the bound rather than waited out.
const WALL_CLOCK = Object.freeze({
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
});

// presenceOf(status, { nodeId, sessionId }) → "gone" | "listed" | "unreadable" — whether the NODE'S
// OWN presence record still carries the session (ADR-004 §4).
//
// It reads `nodes[].presence.sessions[]`, never the payload's `sessions[]` index. The index drops
// every session of a node that is no longer `live`, so a node that DIED mid-wait would read there
// as "the row is gone" and be answered as a confirmed end. A dead node's presence record is frozen
// with the session still in it, which is the truth: nothing removed it. Only the node removing its
// own record and republishing makes the row "gone". A node missing from the roster, or one whose
// presence carries no session array, states nothing either way.
function presenceOf(status, { nodeId, sessionId }) {
  const node = (status?.nodes ?? []).find((candidate) => candidate?.nodeId === nodeId);
  const sessions = node?.presence?.sessions;
  if (!Array.isArray(sessions)) return "unreadable";
  return sessions.some((entry) => entry?.sessionId === sessionId) ? "listed" : "gone";
}

// firstSessionLink(text) → the first link in `text` that is followed by at least one more
// character, or null. A match that runs to the very end of what has arrived may be a link cut
// mid-chunk; it is answered only once the byte after it arrives.
export function firstSessionLink(text) {
  if (typeof text !== "string" || text.length === 0) return null;
  for (const match of text.matchAll(new RegExp(SESSION_LINK_PATTERN.source, "g"))) {
    if (match.index + match[0].length < text.length) return match[0];
  }
  return null;
}

// Configured services are supplied by core; constructing the verbs performs no I/O.
export function createMeshSessionVerbs({
  queryGlobalMeshStatus,
  loadWorkspace,
  TERMINAL_FRAME_KIND,
  createTerminalRelayPushTransport,
  createTerminalMirrorSubscriberTransport,
  parseInboundTerminalFrame,
  isSessionLive,
  resolveSessionTtlSeconds,
  invokeRegistered,
  reportDegrade,
}) {
  const pathExists = existsSync;
  const pathBasename = (projectRoot) => path.basename(projectRoot);
  const statusOf = (ctx) => queryGlobalMeshStatus({ ...(ctx?.globalWorkStoreOptions ?? {}) });

  // The control's LOCAL projects: rows of the projection whose checkout is on this machine. Each
  // carries its folder name — the word an operator types from a phone (ADR-003 §2).
  const localProjects = (status) => (status?.workspaces ?? [])
    .filter((row) => typeof row?.projectRoot === "string" && row.projectRoot.length > 0 && pathExists(row.projectRoot))
    .map((row) => ({ row, folder: pathBasename(row.projectRoot) }));

  // resolveProject(status, project) → the ONE local project `project` names — by workspace id,
  // else by folder name — or a coded refusal that names what there is. Several folder matches are
  // ambiguous, never a first-wins pick.
  function resolveProject(status, project) {
    const local = localProjects(status);
    const byId = local.find((entry) => entry.row.workspaceId === project);
    if (byId) return byId;
    const byFolder = local.filter((entry) => entry.folder === project);
    if (byFolder.length === 1) return byFolder[0];
    if (byFolder.length > 1) {
      const ids = byFolder.map((entry) => entry.row.workspaceId).sort();
      throw commandError(
        `More than one project here is called "${project}" (${ids.join(", ")}) — name it by its workspace id.`,
        "session-project-ambiguous",
        409,
      );
    }
    const names = [...new Set(local.map((entry) => entry.folder))].sort();
    throw commandError(
      names.length > 0
        ? `No project here is called "${project}". The projects on this control are: ${names.join(", ")}.`
        : `No project here is called "${project}", and this control has no local projects.`,
      "session-project-unknown",
      404,
    );
  }

  // resolveItem(project, item, ctx) → the ref `item` names in that project, through `work:find`.
  // Only an exact ref or slug counts: a fuzzy hit is a typo the node would otherwise make a
  // worktree for (ADR-003 §2, E6).
  async function resolveItem(project, item, ctx) {
    const workspace = await loadWorkspace(project.row.projectRoot, undefined, { env: ctx?.globalWorkStoreOptions?.env });
    const found = await invokeRegistered("work:find", { query: item }, { ...ctx, workspace });
    const row = (found?.rows ?? []).find((candidate) => candidate?.ref === item || candidate?.slug === item);
    if (!row) {
      throw commandError(`No work item "${item}" in ${project.folder} — nothing was started.`, "session-item-unknown", 404);
    }
    return row.ref;
  }

  function parseWaitMs(value) {
    if (value == null) return 0;
    if (!Number.isInteger(value) || value < 0 || value > MAX_SESSION_START_WAIT_MS) {
      throw commandError(`"waitMs" must be a whole number of milliseconds from 0 to ${MAX_SESSION_START_WAIT_MS}.`, "invalid-input", 400);
    }
    return value;
  }

  // openWatch(subscriber, { nodeId, sessionId }) → { done: Promise<answer>, settle(answer) }.
  // Reads ONLY frames for the one (nodeId, sessionId) tuple: terminal bytes, scanned for the link
  // up to SESSION_LINK_SCAN_BYTES, and the worker's session-spawn-ack for a refusal. Nothing it
  // reads is written anywhere.
  function openWatch(subscriber, { nodeId, sessionId }) {
    let text = "";
    let scannedBytes = 0;
    let settle;
    const done = new Promise((resolve) => { settle = resolve; });
    let settled = false;
    const finish = (answer) => {
      if (settled) return;
      settled = true;
      settle(answer);
    };
    subscriber.onMessage((data) => {
      if (settled) return;
      try {
        const envelope = parseInboundTerminalFrame(data);
        if (envelope == null || envelope.nodeId !== nodeId) return;
        const signal = envelope.signal;
        if (signal == null || typeof signal !== "object" || signal.sessionId !== sessionId) return;
        if (envelope.kind === SESSION_SPAWN_ACK_KIND) {
          if (signal.ok !== true) finish({ outcome: "refused", code: typeof signal.code === "string" && signal.code.length > 0 ? signal.code : "session-spawn-refused" });
          return;
        }
        if (envelope.kind !== TERMINAL_FRAME_KIND || typeof signal.bytes !== "string") return;
        if (scannedBytes >= SESSION_LINK_SCAN_BYTES) return;
        let chunk = signal.bytes;
        const chunkBytes = Buffer.byteLength(chunk);
        if (scannedBytes + chunkBytes > SESSION_LINK_SCAN_BYTES) {
          chunk = Buffer.from(chunk).subarray(0, SESSION_LINK_SCAN_BYTES - scannedBytes).toString();
          scannedBytes = SESSION_LINK_SCAN_BYTES;
        } else {
          scannedBytes += chunkBytes;
        }
        text += chunk;
        const link = firstSessionLink(text);
        if (link != null) finish({ outcome: "started", link });
      } catch (error) {
        reportDegrade("mesh-session-start-watch", error);
      }
    });
    return { done, finish };
  }

  const meshSessionStartCommand = {
    id: "mesh:session-start",
    input: {
      type: "object",
      properties: {
        project: { type: "string" },
        node: { type: "string" },
        item: { type: "string" },
        waitMs: { type: "integer" },
      },
      required: ["project"],
      additionalProperties: false,
    },

    async run(input, ctx) {
      const projectArg = typeof input.project === "string" ? input.project.trim() : "";
      if (projectArg.length === 0) {
        throw commandError("A project is required: aof mesh session start <project>.", "invalid-input", 400);
      }
      const waitMs = parseWaitMs(input.waitMs);
      const status = await statusOf(ctx);
      const project = resolveProject(status, projectArg);
      const itemArg = typeof input.item === "string" ? input.item.trim() : "";
      const itemRef = itemArg.length > 0 ? await resolveItem(project, itemArg, ctx) : null;

      const issuer = ctx?.workspace?.config?.mesh?.nodeId ?? null;
      const nodeArg = typeof input.node === "string" ? input.node.trim() : "";
      // RESEARCH Q4: every project a channel serves is checked out on the control, so the control
      // is always a node that holds it, and is the default target.
      const nodeId = nodeArg.length > 0 ? nodeArg : issuer;
      const config = ctx?.workspace?.config;
      const push = createTerminalRelayPushTransport(config);
      // Both transports derive from the one loopback relay url; constructing either opens nothing.
      const subscriber = waitMs > 0 ? createTerminalMirrorSubscriberTransport(config) : null;
      try {
        // DEFERRED to the start (FF-16004): every CLI verb loads this module through the registry,
        // and only `mesh:session-start` needs the core.
        const { planSessionStart } = await import("../session-start.mjs");
        const plan = planSessionStart({
          status,
          workspaceId: project.row.workspaceId,
          nodeId,
          issuer,
          relayAvailable: push != null && (waitMs === 0 || subscriber != null),
          itemRef,
          launch: "claude-remote-control",
          at: new Date().toISOString(),
        });
        if (!plan.ok) throw commandError(plan.message, plan.code, plan.status);

        // SUBSCRIBE BEFORE THE PUSH (ADR-003 §3): a fast session paints its footer before a late
        // subscriber connects, and the relay keeps nothing for one.
        let watch = null;
        if (subscriber != null) {
          watch = openWatch(subscriber, { nodeId: plan.nodeId, sessionId: plan.sessionId });
          try {
            await subscriber.connect();
          } catch (error) {
            reportDegrade("mesh-session-start-watch", error);
            throw commandError("The session-spawn directive could not be handed to the mesh relay.", "session-dispatch-failed", 503);
          }
        }
        try {
          await push.push(plan.envelope);
        } catch (error) {
          // The transport's own message names the relay's host and port; it is logged, never answered.
          reportDegrade("mesh-session-start", error);
          throw commandError("The session-spawn directive could not be handed to the mesh relay.", "session-dispatch-failed", 503);
        }

        let answer = { outcome: "no-link" };
        if (watch != null) {
          const timer = setTimeout(() => watch.finish({ outcome: "no-link" }), waitMs);
          try {
            answer = await watch.done;
          } finally {
            clearTimeout(timer);
          }
        }
        const folder = project.row.name ?? project.folder;
        return {
          // A refusal is not a start: `ok` says so, and the CLI exits 1 on it (`cli.exit`).
          ok: answer.outcome !== "refused",
          outcome: answer.outcome,
          ...(answer.outcome === "refused" ? { code: answer.code } : {}),
          sessionId: plan.sessionId,
          nodeId: plan.nodeId,
          workspaceId: plan.workspaceId,
          project: project.folder,
          item: itemRef,
          // ADR-002 §3: the name the worker gives `--remote-control`, so the Claude app lists the
          // session under it whatever happens to the link.
          name: launchSessionName(folder, plan.sessionId),
          link: answer.outcome === "started" ? answer.link : null,
        };
      } finally {
        // Closed on EVERY exit, a throw included — a forgotten socket keeps the process alive.
        try { subscriber?.close?.(); } catch (error) { reportDegrade("mesh-session-start-watch", error); }
        try { push?.close?.(); } catch (error) { reportDegrade("mesh-session-start", error); }
      }
    },

    cli: {
      route: ["mesh", "session", "start"],
      spec: {
        usage: "aof mesh session start <project> [--node <id>] [--item <ref>] [--wait <ms>] [--workspace <path|id>] [--json]",
        flags: {
          node: { type: "string", description: "the node to start it on (default: this control)" },
          item: { type: "string", description: "a work item in the project to start it on" },
          wait: { type: "string", description: "how long to watch for the session's link, in ms (default 0)" },
          ...MESH_WORKSPACE_FLAG,
        },
      },

      argv: (positionals, options = {}) => {
        guardMeshPositionals("session start", positionals, { max: 1 });
        let waitMs;
        if (options.wait != null) {
          const text = String(options.wait).trim();
          if (!/^\d+$/.test(text)) {
            throw commandError(`--wait takes a whole number of milliseconds (got "${options.wait}").`, "invalid-input", 400);
          }
          waitMs = Number(text);
        }
        return {
          ...(typeof positionals[0] === "string" && positionals[0].length > 0 ? { project: positionals[0] } : {}),
          ...(typeof options.node === "string" && options.node.length > 0 ? { node: options.node } : {}),
          ...(typeof options.item === "string" && options.item.length > 0 ? { item: options.item } : {}),
          ...(waitMs === undefined ? {} : { waitMs }),
        };
      },

      render(result) {
        const where = `${result.project} on ${result.nodeId}${result.item ? `, item ${result.item}` : ""}`;
        if (result.outcome === "refused") {
          return `session NOT STARTED (${result.code}): ${where} — the node refused it before it began.`;
        }
        if (result.outcome === "started") {
          return [`session started: ${where}`, `open: ${result.link}`, `name: ${result.name}`].join("\n");
        }
        return [
          `session started: ${where} — no link yet.`,
          `In the Claude app, tap Code and look for: ${result.name}`,
        ].join("\n");
      },

      exit: (result) => (result.outcome === "refused" ? 1 : 0),

      json: (result) => result,
    },
  };

  const meshSessionListCommand = {
    id: "mesh:session-list",
    input: {
      type: "object",
      properties: { project: { type: "string" } },
      additionalProperties: false,
    },

    // READS ONLY (ADR-003 §5): the mesh status payload, filtered. No relay, no store write.
    async run(input, ctx) {
      const status = await statusOf(ctx);
      const projectArg = typeof input.project === "string" ? input.project.trim() : "";
      const projects = projectArg.length > 0 ? [resolveProject(status, projectArg)] : localProjects(status);
      const folderOf = new Map(projects.map((entry) => [entry.row.workspaceId, entry.folder]));
      // A presence record is a snapshot; a session in it may have passed its TTL since. The ONE
      // liveness predicate the mesh shares decides, never a second staleness rule here.
      const ttlMs = resolveSessionTtlSeconds(ctx?.workspace?.config) * 1000;
      const nowMs = Date.now();
      const sessions = (status?.sessions ?? [])
        .filter((entry) => folderOf.has(entry?.workspaceId))
        .filter((entry) => isSessionLive(entry, nowMs, ttlMs))
        .map((entry) => ({
          sessionId: entry.sessionId,
          nodeId: entry.nodeId,
          workspaceId: entry.workspaceId,
          project: folderOf.get(entry.workspaceId),
          // The presence wire states a start time only when its producer does; never invented.
          startedAt: typeof entry.startedAt === "string" ? entry.startedAt : null,
          lastPingAt: entry.lastPingAt ?? null,
          name: launchSessionName(entry.repo, entry.sessionId),
        }));
      return { ok: true, project: projectArg.length > 0 ? projects[0].folder : null, sessions };
    },

    cli: {
      route: ["mesh", "session", "list"],
      spec: {
        usage: "aof mesh session list [<project>] [--workspace <path|id>] [--json]",
        flags: { ...MESH_WORKSPACE_FLAG },
      },

      argv: (positionals) => {
        guardMeshPositionals("session list", positionals, { max: 1 });
        return typeof positionals[0] === "string" && positionals[0].length > 0 ? { project: positionals[0] } : {};
      },

      render(result) {
        if (result.sessions.length === 0) {
          return result.project ? `No live sessions in ${result.project}.` : "No live sessions.";
        }
        return result.sessions
          .map((entry) => `${entry.name}  ${entry.project} on ${entry.nodeId}  ${entry.startedAt ? `started ${entry.startedAt}` : `last seen ${entry.lastPingAt ?? "-"}`}  ${entry.sessionId}`)
          .join("\n");
      },

      json: (result) => result,
    },
  };

  // ── 191/ADR-004 §3 — `mesh:session-end` ────────────────────────────────────────────────────
  //
  // Asks the node holding a launched session to halt it, then answers whether it did. The relay
  // push returns nothing and there is no ack kind (§4), so the end is CONFIRMED FROM PRESENCE: the
  // node removes its own session record when its handler ends the session, and the verb reads that
  // node's presence until the record is gone or SESSION_END_CONFIRM_MS pass. An end it cannot
  // confirm is answered `ended: false` — the request was sent — and never as a success.
  //
  // WHICH SESSION. `session` is the session id, or the ADR-002 name `session list` prints. It must
  // be carried by a live presence row (the rows `session list` answers, under the one shared
  // liveness predicate); anything else refuses `session-not-found` BEFORE the relay is touched.
  // `node` narrows the rows to that node; it is never a way to send an end to a node whose
  // presence does not carry the session.
  function resolveLiveSession(status, sessionArg, nodeArg, ctx) {
    const ttlMs = resolveSessionTtlSeconds(ctx?.workspace?.config) * 1000;
    const nowMs = Date.now();
    const live = (status?.sessions ?? [])
      .filter((entry) => typeof entry?.sessionId === "string" && entry.sessionId.length > 0)
      .filter((entry) => nodeArg.length === 0 || entry.nodeId === nodeArg)
      .filter((entry) => isSessionLive(entry, nowMs, ttlMs));
    // The id is the address, so an exact id wins over a name that happens to spell another's.
    const byId = live.filter((entry) => entry.sessionId === sessionArg);
    const matches = byId.length > 0 ? byId : live.filter((entry) => launchSessionName(entry.repo, entry.sessionId) === sessionArg);
    if (matches.length === 0) {
      throw commandError(
        `No live session is called "${sessionArg}"${nodeArg.length > 0 ? ` on ${nodeArg}` : ""} — nothing was sent. \`aof mesh session list\` shows the live ones.`,
        "session-not-found",
        404,
      );
    }
    if (matches.length > 1) {
      const named = matches.map((entry) => `${entry.sessionId} on ${entry.nodeId}`).sort();
      throw commandError(
        `More than one live session is called "${sessionArg}" (${named.join(", ")}) — name it by its session id, with --node.`,
        "session-ambiguous",
        409,
      );
    }
    return matches[0];
  }

  const meshSessionEndCommand = {
    id: "mesh:session-end",
    input: {
      type: "object",
      properties: {
        session: { type: "string" },
        node: { type: "string" },
      },
      required: ["session"],
      additionalProperties: false,
    },

    async run(input, ctx) {
      const sessionArg = typeof input.session === "string" ? input.session.trim() : "";
      if (sessionArg.length === 0) {
        throw commandError("A session is required: aof mesh session end <session id or name>.", "invalid-input", 400);
      }
      const nodeArg = typeof input.node === "string" ? input.node.trim() : "";
      const row = resolveLiveSession(await statusOf(ctx), sessionArg, nodeArg, ctx);
      const { sessionId, nodeId } = row;
      const name = launchSessionName(row.repo, sessionId);

      const push = createTerminalRelayPushTransport(ctx?.workspace?.config);
      if (push == null) {
        throw commandError(
          "No mesh relay is configured on this control node, so a session cannot be ended from here (set config.mesh.relay.url).",
          "session-dispatch-unavailable",
          503,
        );
      }
      const clock = ctx?.sessionEndClock ?? WALL_CLOCK;
      try {
        const frame = buildSessionEndFrame(nodeId, { sessionId, at: new Date(clock.now()).toISOString() });
        await push.push(buildSessionEndEnvelope(nodeId, frame));
      } catch (error) {
        // The transport's own message names the relay's host and port; it is logged, never answered.
        reportDegrade("mesh-session-end", error);
        throw commandError("The session-end directive could not be handed to the mesh relay.", "session-dispatch-failed", 503);
      } finally {
        // Closed on every exit, a throw included — a forgotten socket keeps the process alive.
        try { push.close?.(); } catch (error) { reportDegrade("mesh-session-end", error); }
      }

      // CONFIRM AT THE SOURCE (§3–§4). One read per SESSION_END_POLL_MS until the node's own
      // presence no longer carries the session, or the window closes. A read that fails states
      // nothing, so it neither confirms the end nor stops the wait.
      const deadline = clock.now() + SESSION_END_CONFIRM_MS;
      let last = "listed";
      do {
        await clock.sleep(SESSION_END_POLL_MS);
        try {
          last = presenceOf(await statusOf(ctx), { nodeId, sessionId });
        } catch (error) {
          reportDegrade("mesh-session-end", error);
          last = "unreadable";
        }
        if (last === "gone") return { ok: true, ended: true, sessionId, nodeId, name };
      } while (clock.now() < deadline);

      return {
        // Not a confirmed end: `ok` says so, and the CLI exits 1 on it (`cli.exit`).
        ok: false,
        ended: false,
        code: "session-end-unconfirmed",
        // Whether the last read still carried the session — false only when that node's presence
        // could not be read at all.
        listed: last === "listed",
        sessionId,
        nodeId,
        name,
      };
    },

    cli: {
      route: ["mesh", "session", "end"],
      spec: {
        usage: "aof mesh session end <session> [--node <id>] [--workspace <path|id>] [--json]",
        flags: {
          node: { type: "string", description: "the node the session is on (default: the node its presence names)" },
          ...MESH_WORKSPACE_FLAG,
        },
      },

      argv: (positionals, options = {}) => {
        guardMeshPositionals("session end", positionals, { max: 1 });
        return {
          ...(typeof positionals[0] === "string" && positionals[0].length > 0 ? { session: positionals[0] } : {}),
          ...(typeof options.node === "string" && options.node.length > 0 ? { node: options.node } : {}),
        };
      },

      render(result) {
        if (result.ended) return `session ended: ${result.name} on ${result.nodeId}  ${result.sessionId}`;
        return result.listed
          ? `session NOT CONFIRMED ENDED: the request was sent to ${result.nodeId}, and ${result.name} is still listed after ${SESSION_END_CONFIRM_MS / 1000} s.\nCheck: \`aof mesh session list\`. A session \`claude\` started in a terminal was not launched by aof and cannot be ended from here.`
          : `session NOT CONFIRMED ENDED: the request was sent to ${result.nodeId}, but its presence could not be read to confirm ${result.name} ended.\nCheck: \`aof mesh session list\`.`;
      },

      exit: (result) => (result.ended ? 0 : 1),

      json: (result) => result,
    },
  };

  return { meshSessionStartCommand, meshSessionListCommand, meshSessionEndCommand };
}
