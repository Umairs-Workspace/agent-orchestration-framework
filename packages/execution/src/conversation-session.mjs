// THE HEADLESS CONVERSATION (milestone 172 / ADR-001) — one stream-json `claude` per key, answering
// one turn at a time.
//
// A `claude -p --input-format stream-json --output-format stream-json --include-partial-messages`
// process holds ONE conversation across the user messages written to its stdin, streams each answer
// as text deltas, runs the tools it is allowed inside the turn and ends each turn with one `result`
// line (172/RESEARCH Q1). This module owns that process and nothing about what it is for: the caller
// says what to type, which tools to allow and where to run. It knows nothing of diagrams.
//
// - `readStreamJsonLine(state, line)` is the ONE reader of claude's stdout: a pure function from a
//   line to the few conversation events a caller forwards (`text`, `activity`, `turn-end`). Every
//   line type it does not use — `system`, `rate_limit_event`, a tool result, a type a later claude
//   adds — produces nothing.
// - `conversationLaunchArgs` is the ONE builder of the launch argv (FF-17201): `--permission-prompts
//   none` and an explicit `--allowedTools`, so anything outside the list is denied in the turn rather
//   than waiting on a prompt nobody can see, and never a permission bypass.
// - `createConversations` keys sessions: the first delivery for a key starts its process, a delivery
//   while a turn is in flight is queued and written when the turn's `result` arrives, and a session
//   with no subscriber and no turn in flight ends `idleMs` later. An ended session is never resumed:
//   the next delivery starts a fresh one.
import { execFile, spawn } from "node:child_process";
import { isSessionAttachmentKey } from "./session-model.mjs";

// 172/00 Q1 (the operator, 2026-10-27): a session outlives its last subscriber by ten minutes.
export const CONVERSATION_IDLE_MS = 10 * 60 * 1000;
export const CONVERSATION_UNAVAILABLE = "architect-session-unavailable";

// conversationLaunchArgs({ tools, model, effort }) -> the argv after the executable. `--allowedTools`
// comes last, followed by exactly the caller's tools, so nothing after it is read as a tool.
export function conversationLaunchArgs({ tools = [], model, effort } = {}) {
  const args = ["-p", "--input-format", "stream-json", "--output-format", "stream-json", "--include-partial-messages", "--verbose", "--permission-prompts", "none"];
  if (typeof model === "string" && model.trim() !== "") args.push("--model", model);
  if (typeof effort === "string" && effort.trim() !== "") args.push("--effort", effort);
  args.push("--allowedTools", ...tools);
  return args;
}

// The child's environment: the caller's minus the session-attachment keys the loop's driver scrubs.
export function conversationEnvironment(env = process.env) {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !isSessionAttachmentKey(key)));
}

// One stream-json user message, one line.
export const userMessageLine = (text) => `${JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "text", text }] } })}\n`;

// What a tool use is shown as: a command's first three words, then its `--action` when it names one;
// a file tool's path or pattern otherwise.
function activityLabel(name, input = {}) {
  if (typeof input?.command === "string") {
    const words = input.command.trim().split(/\s+/u);
    if (words.length <= 3) return words.join(" ");
    const at = words.indexOf("--action");
    return `${words.slice(0, 3).join(" ")} …${at >= 0 && words[at + 1] ? ` --action ${words[at + 1]}` : ""}`;
  }
  for (const key of ["file_path", "path", "pattern"]) if (typeof input?.[key] === "string") return input[key];
  return name;
}
const deniedInput = (input = {}) => (typeof input?.command === "string" ? input.command
  : typeof input?.file_path === "string" ? input.file_path : JSON.stringify(input ?? {}));

// readStreamJsonLine(state, line) -> { state, events }. `state.requestId` is the turn in flight's
// request (null for a batch review); `state.turn` says whether a turn is in flight at all.
export function readStreamJsonLine(state, line) {
  let message;
  try { message = JSON.parse(line); } catch { return { state, events: [] }; }
  if (message === null || typeof message !== "object" || Array.isArray(message)) return { state, events: [] };
  const requestId = state?.requestId ?? null;
  if (message.type === "stream_event") {
    const delta = message.event?.type === "content_block_delta" ? message.event.delta : null;
    if (delta?.type === "text_delta" && typeof delta.text === "string" && delta.text.length > 0) return { state, events: [{ type: "text", requestId, text: delta.text }] };
    return { state, events: [] };
  }
  if (message.type === "assistant") {
    const content = Array.isArray(message.message?.content) ? message.message.content : [];
    const events = content.filter((block) => block?.type === "tool_use" && typeof block.name === "string")
      .map((block) => ({ type: "activity", requestId, tool: block.name, label: activityLabel(block.name, block.input) }));
    return { state, events };
  }
  if (message.type === "result") {
    const denials = (Array.isArray(message.permission_denials) ? message.permission_denials : [])
      .filter((denial) => typeof denial?.tool_name === "string")
      .map((denial) => ({ tool: denial.tool_name, input: deniedInput(denial.tool_input) }));
    const outcome = message.subtype === "success" && message.is_error !== true ? "done" : "failed";
    return { state: { ...state, turn: false, requestId: null }, events: [{ type: "turn-end", requestId, outcome, denials }] };
  }
  return { state, events: [] };
}

// The process tree is ended the way codex-app-server ends its own: `taskkill /T` on Windows, the
// process group elsewhere (the child is spawned detached, so it leads one).
async function terminateTree(child) {
  if (child.exitCode !== null && child.exitCode !== undefined) return;
  if (process.platform === "win32" && Number.isSafeInteger(child.pid) && child.pid > 0) {
    await new Promise((resolve) => execFile("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { timeout: 2000, windowsHide: true }, (error) => { if (error) child.kill("SIGKILL"); resolve(); }));
  } else if (Number.isSafeInteger(child.pid) && child.pid > 0) {
    try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
  } else child.kill("SIGKILL");
}

const unavailable = (reason) => Object.assign(new Error(reason), { code: CONVERSATION_UNAVAILABLE, status: 503 });

// createConversations(...) -> { deliver, subscribe, snapshot, close }.
//
// `resolveExecutable()` answers `{ command, args }` — the program and any argv before the launch
// flags — or null when there is no `claude` to launch (or throws an `architect-session-unavailable`
// error carrying the reason). `launch(cwd)` answers `{ model, effort }` for
// the session (it may be async). `timers` is `{ setTimeout, clearTimeout }`, injected so a suite drives
// the idle clock by hand. Events reach a key's subscribers as `{ type, ... }`: `session` (`started`,
// `ended` with its reason), `turn` (a delivery written), `text`, `activity` and `turn-end`.
export function createConversations({
  resolveExecutable, launch = () => ({}), env = process.env, spawnChild = spawn, terminate = terminateTree,
  reportDegrade = () => {}, timers = { setTimeout, clearTimeout }, idleMs = CONVERSATION_IDLE_MS,
} = {}) {
  if (typeof resolveExecutable !== "function") throw new TypeError("createConversations: resolveExecutable is required");
  const sessions = new Map();
  const listeners = new Map();
  // Why each key's last session ended, kept until the next one starts, so a later snapshot says so.
  const endings = new Map();
  const subscriberCount = (key) => listeners.get(key)?.size ?? 0;
  const emit = (key, event) => {
    for (const listener of [...(listeners.get(key) ?? [])]) {
      try { listener(event); } catch (error) { reportDegrade("conversation-session", error); }
    }
  };

  const stopIdle = (session) => { if (session.idle) { timers.clearTimeout(session.idle); session.idle = null; } };
  // The idle clock runs only while nobody is subscribed and no turn is in flight.
  const armIdle = (session) => {
    stopIdle(session);
    if (session.ended || session.turn || session.queue.length > 0 || subscriberCount(session.key) > 0) return;
    session.idle = timers.setTimeout(() => { session.idle = null; void end(session, "idle"); }, idleMs);
  };

  function write(session, delivery) {
    session.turn = { requestId: delivery.requestId, text: "" };
    session.reader = { turn: true, requestId: delivery.requestId };
    emit(session.key, { type: "turn", requestId: delivery.requestId });
    try { session.child.stdin.write(userMessageLine(delivery.text)); } catch (error) { reportDegrade("conversation-session", error); }
  }
  function next(session) {
    if (session.ended || session.turn || !session.child) return;
    const delivery = session.queue.shift();
    if (delivery) write(session, delivery); else armIdle(session);
  }
  function onLine(session, line) {
    if (session.ended || !line.trim()) return;
    const { state, events } = readStreamJsonLine(session.reader, line);
    session.reader = state;
    for (const event of events) {
      if (event.type === "text" && session.turn) session.turn.text += event.text;
      if (event.type === "turn-end") session.turn = null;
      emit(session.key, event);
    }
    if (!session.turn) next(session);
  }

  // Ending closes stdin, then ends the process tree. A turn in flight ends as failed; a queued
  // delivery is dropped — its note is a record and stays open for the next ask.
  async function end(session, reason) {
    if (session.ended) return;
    session.ended = true;
    stopIdle(session);
    if (sessions.get(session.key) === session) { sessions.delete(session.key); endings.set(session.key, reason); }
    if (session.turn) emit(session.key, { type: "turn-end", requestId: session.turn.requestId, outcome: "failed", denials: [] });
    session.turn = null;
    session.queue.length = 0;
    emit(session.key, { type: "session", state: "ended", reason });
    const child = session.child;
    if (!child) return;
    try { child.stdin?.end(); } catch (error) { reportDegrade("conversation-session", error); }
    try { await terminate(child); } catch (error) { reportDegrade("conversation-session", error); }
  }

  async function start(session, cwd, tools) {
    let executable;
    try { executable = await resolveExecutable(); } catch (error) {
      // A resolver that says why there is no `claude` keeps its reason; any other failure is reported.
      if (error?.code === CONVERSATION_UNAVAILABLE) throw error;
      reportDegrade("conversation-session", error); executable = null;
    }
    if (!executable?.command) throw unavailable("No claude executable resolves on this server.");
    const { model, effort } = (await launch(cwd)) ?? {};
    const args = [...(executable.args ?? []), ...conversationLaunchArgs({ tools, model, effort })];
    const child = spawnChild(executable.command, args, { cwd, env: conversationEnvironment(env), stdio: ["pipe", "pipe", "pipe"], windowsHide: true, detached: process.platform !== "win32", shell: false });
    session.child = child;
    let partial = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      const lines = (partial + chunk).split("\n");
      partial = lines.pop();
      for (const line of lines) onLine(session, line);
    });
    child.stderr?.resume();
    child.stdin.on("error", (error) => reportDegrade("conversation-session", error));
    child.on("error", (error) => { reportDegrade("conversation-session", error); void end(session, "exited"); });
    // `close`, not `exit`: the last lines on stdout are read before the session is ended.
    child.on("close", () => { void end(session, "exited"); });
    emit(session.key, { type: "session", state: "started" });
  }

  // deliver(key, { cwd, text, requestId, tools }) -> { outcome: "started" | "sent" | "queued" }.
  // The first delivery for a key starts its session in `cwd` with `tools`; a later one joins it.
  async function deliver(key, { cwd, text, requestId = null, tools = [] } = {}) {
    if (typeof text !== "string" || text.length === 0) throw new TypeError("deliver: text is required");
    const delivery = { text, requestId: requestId ?? null };
    const live = sessions.get(key);
    if (live) {
      stopIdle(live);
      if (live.turn || live.queue.length > 0 || !live.child) { live.queue.push(delivery); return { outcome: "queued" }; }
      write(live, delivery);
      return { outcome: "sent" };
    }
    const session = { key, child: null, queue: [delivery], turn: null, reader: { turn: false, requestId: null }, idle: null, ended: false };
    sessions.set(key, session);
    endings.delete(key);
    try { await start(session, cwd, tools); }
    catch (error) {
      // A delivery queued while the session was starting was told `queued`; its subscribers learn here
      // that no session came, and its note stays open for the next ask.
      session.ended = true;
      if (sessions.get(key) === session) { sessions.delete(key); endings.set(key, "unavailable"); }
      session.queue.length = 0;
      emit(key, { type: "session", state: "ended", reason: "unavailable" });
      throw error;
    }
    next(session);
    return { outcome: "started" };
  }

  // subscribe(key, listener) -> unsubscribe. A subscriber stops the idle clock; the last one leaving
  // with no turn in flight starts it.
  function subscribe(key, listener) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(listener);
    const live = sessions.get(key);
    if (live) stopIdle(live);
    return () => {
      const set = listeners.get(key);
      if (!set?.delete(listener)) return;
      if (set.size === 0) listeners.delete(key);
      const current = sessions.get(key);
      if (current) armIdle(current);
    };
  }

  // snapshot(key) -> the session's state and the turn in flight with its text so far, so a subscriber
  // that arrives mid-answer catches up.
  function snapshot(key) {
    const live = sessions.get(key);
    if (!live) return endings.has(key)
      ? { type: "snapshot", state: "ended", reason: endings.get(key), requestId: null, text: "", queued: 0 }
      : { type: "snapshot", state: "none", requestId: null, text: "", queued: 0 };
    return { type: "snapshot", state: live.turn ? "answering" : live.child ? "idle" : "starting", requestId: live.turn?.requestId ?? null, text: live.turn?.text ?? "", queued: live.queue.length };
  }

  async function close() {
    await Promise.all([...sessions.values()].map((session) => end(session, "closed")));
  }

  return { deliver, subscribe, snapshot, close };
}
