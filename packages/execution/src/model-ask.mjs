// THE ONE-SHOT MODEL ASK (milestone 201 / ADR-004 §4) — one `claude` process, one question, one
// answer.
//
// The caller hands over an executable, a model, an instruction, the text for stdin and a time
// limit. This module builds the launch, starts the child in a fresh empty directory under the OS
// temp directory, writes stdin, reads the one JSON document `--output-format json` prints, ends the
// child at the limit, and answers what happened. It knows nothing of memory: the recall pick is its
// first caller (core composes it), and the request and the reading of the answer are that caller's.
//
// - `modelAskArgs` is the ONE builder of the launch argv (FF-20103): print mode, JSON output, no
//   tools, no MCP servers, no slash commands, no session saved, no permission prompt. It never
//   passes `--bare`, which refuses the subscription sign-in, and never a permission bypass.
// - The instruction goes in on STDIN, ahead of the question, and the launch carries no
//   system-prompt flag of either form: aof never replaces a `claude` system prompt (70/FF-7004),
//   and the append form belongs to the loop's one launch seam (70/FF-7005).
// - `modelAskEnvironment` is the child's environment: the caller's, minus the keys that would
//   attach the child to the session that spawned it, plus the one that turns its auto-memory off.
// - The working directory is never the caller's. A `claude` started inside a project fires that
//   project's hooks, reads its CLAUDE.md, and leaves a transcript `aof work observe` would count as
//   an agent session.
//
// This is a different subject from `conversation-session.mjs`, which holds a long-lived
// stream-json session with tools. The two share only the session-attachment predicate.
import { execFile, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isSessionAttachmentKey } from "./session-model.mjs";

// What an ask can come to. `answered` carries `text`; `failed` carries a `reason`.
export const MODEL_ASK = Object.freeze({ answered: "answered", timeout: "timeout", failed: "failed", unreadable: "unreadable" });

const nonBlank = (value) => typeof value === "string" && value.trim() !== "";

// modelAskArgs({ model }) -> the argv after the executable. Neither the instruction nor the
// question is ever here: both go in on stdin, so neither can be read from a process listing.
export function modelAskArgs({ model } = {}) {
  const args = ["-p", "--output-format", "json", "--tools", "", "--no-session-persistence", "--strict-mcp-config", "--disable-slash-commands", "--permission-prompts", "none"];
  if (nonBlank(model)) args.push("--model", model);
  return args;
}

// What the child reads on stdin: the instruction, a blank line, then the question.
export function modelAskInput({ instruction, input = "" } = {}) {
  return nonBlank(instruction) ? `${instruction}\n\n${input}` : input;
}

// What the launch sets for itself, after the scrub. Auto-memory is off because a `claude` with it
// on creates `~/.claude/projects/<working directory>/memory` as it starts, and every ask has a
// working directory of its own: measured 2026-11-17 on 2.1.326, one empty directory per ask
// without this key and none with it.
const OWN_ENVIRONMENT = Object.freeze({ CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1" });

// The child's environment: the caller's minus the session-attachment keys, then the launch's own.
export function modelAskEnvironment(env = process.env) {
  return { ...Object.fromEntries(Object.entries(env).filter(([key]) => !isSessionAttachmentKey(key))), ...OWN_ENVIRONMENT };
}

// readModelAnswer(stdout) -> what the one JSON document says. A result marked as an error is a
// failure; anything that is not the document, or holds no text, is unreadable.
export function readModelAnswer(stdout) {
  let message;
  try {
    message = JSON.parse(String(stdout ?? "").trim());
  } catch {
    return { outcome: MODEL_ASK.unreadable };
  }
  // A later claude may print the turn's messages as an array; the result is the last of its kind.
  if (Array.isArray(message)) message = message.findLast((entry) => entry?.type === "result");
  if (message === null || typeof message !== "object") return { outcome: MODEL_ASK.unreadable };
  if (message.is_error === true || (typeof message.subtype === "string" && message.subtype !== "success")) {
    return { outcome: MODEL_ASK.failed, reason: typeof message.result === "string" ? message.result : `the result is marked ${message.subtype ?? "an error"}` };
  }
  if (typeof message.result !== "string") return { outcome: MODEL_ASK.unreadable };
  return { outcome: MODEL_ASK.answered, text: message.result };
}

// End the child and everything it started: `taskkill /T` on Windows, the process group elsewhere
// (the child is spawned detached, so it leads one). A child left running holds a subscription slot.
async function terminateTree(child) {
  if (child.exitCode !== null && child.exitCode !== undefined) return;
  const pid = Number.isSafeInteger(child.pid) && child.pid > 0 ? child.pid : null;
  if (process.platform === "win32" && pid !== null) {
    await new Promise((resolve) => execFile("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { timeout: 2000, windowsHide: true }, (error) => { if (error) child.kill("SIGKILL"); resolve(); }));
  } else if (pid !== null) {
    try { process.kill(-pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
  } else child.kill("SIGKILL");
}

// askModel({ executable, model, instruction, input, timeoutMs, env }) -> one of
//   { outcome: "answered", text }   the model's answer
//   { outcome: "timeout" }          no answer inside `timeoutMs`; the child was ended
//   { outcome: "failed", reason }   it could not start, exited non-zero, was ended by a signal, or
//                                   reported an error
//   { outcome: "unreadable" }       it exited 0 and printed no result document
// `executable` is `{ command, args }`: the program and any argv before the launch flags. It never
// throws: a caller's fallback is the answer to every one of these.
export async function askModel({ executable, model, instruction, input = "", timeoutMs, env = process.env, reportDegrade = () => {} } = {}) {
  if (!nonBlank(executable?.command)) return { outcome: MODEL_ASK.failed, reason: "no executable to launch" };
  // A missing limit would be a timer of zero: an ask that times out before it is asked.
  if (!(Number.isFinite(timeoutMs) && timeoutMs > 0)) return { outcome: MODEL_ASK.failed, reason: "no time limit" };
  let cwd;
  try {
    cwd = await mkdtemp(path.join(os.tmpdir(), "aof-model-ask-"));
  } catch (error) {
    return { outcome: MODEL_ASK.failed, reason: `no working directory: ${error.message}` };
  }
  try {
    return await launch({ executable, args: modelAskArgs({ model }), input: modelAskInput({ instruction, input }), timeoutMs, cwd, env: modelAskEnvironment(env) });
  } finally {
    try { await rm(cwd, { recursive: true, force: true }); } catch (error) { reportDegrade("model-ask", error); }
  }
}

function launch({ executable, args, input, timeoutMs, cwd, env }) {
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const settle = (outcome) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(outcome);
    };
    let child;
    try {
      child = spawn(executable.command, [...(executable.args ?? []), ...args], { cwd, env, stdio: ["pipe", "pipe", "pipe"], windowsHide: true, detached: process.platform !== "win32", shell: false });
    } catch (error) {
      settle({ outcome: MODEL_ASK.failed, reason: error.message });
      return;
    }
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => { stdout += chunk; });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk) => { if (stderr.length < 2000) stderr += chunk; });
    // A child that could not start, or that exits before it reads, breaks the pipe. Its `error`
    // or `close` event is what settles the ask; the pipe's own error only has to be heard.
    child.stdin?.on("error", (error) => { if (!stderr) stderr = error.message; });
    child.on("error", (error) => settle({ outcome: MODEL_ASK.failed, reason: error.message }));
    // `close`, not `exit`: the last of stdout is read before the answer is.
    child.on("close", (code, signal) => {
      if (signal) settle({ outcome: MODEL_ASK.failed, reason: `ended by ${signal}` });
      else if (code !== 0) settle({ outcome: MODEL_ASK.failed, reason: stderr.trim().split("\n")[0] || `exit code ${code}` });
      else settle(readModelAnswer(stdout));
    });
    // The limit ends the child, not only the wait. The outcome is settled first, so the `close`
    // the kill causes is not read as a failure.
    timer = setTimeout(() => {
      settle({ outcome: MODEL_ASK.timeout });
      void terminateTree(child);
    }, timeoutMs);
    child.stdin?.end(input);
  });
}
