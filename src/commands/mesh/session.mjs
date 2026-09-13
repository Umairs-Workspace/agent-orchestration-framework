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
import os from "node:os";
import { access } from "node:fs/promises";
import { loadWorkspace } from "../../work.mjs";
import { resolveInstallSalt } from "./identity.mjs";
import { deriveNodeId, sidecarPathFor } from "../../node-identity.mjs";
import { startSession, pingSession, endSession } from "../../mesh/session.mjs";
import { resolveWorkspaceId } from "../../workspace-identity.mjs";
// m42 item 3 — every former silent catch reports a coded degrade event.
import { reportDegrade } from "../../degrade.mjs";

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
export function resolveSessionIdentity({ stdinText, env } = {}) {
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
    const [key, inlineValue] = arg.slice(2).split("=", 2);
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
export async function meshSessionCommand(args, ctx = {}) {
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

export { readStdinText, resolveNodeId };
