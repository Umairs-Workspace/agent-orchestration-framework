#!/usr/bin/env node
// THE STAND-IN ARCHITECT (172/02) — the browser smoke's session, launched by the real board through
// `AOF_ARCHITECT_EXECUTABLE` (172/ADR-001 §5) so no paid session starts. It speaks the stream-json the
// headless `claude` speaks: one user message per stdin line, each answered in one turn — a tool use,
// the answer streamed in deltas, then one `result` line. Where a real architect would, it records its
// answer with the real `aof diagram scene --action respond`, so the editor sees the recorded turn
// replace the streamed one exactly as it would in production.
//
// It answers only the notes the smoke asks it to (`STAND_IN_RESPOND_TO`, a regular expression over the
// note's latest operator turn): the smoke's older checks record their own answers through the CLI, so
// a note they own is acknowledged in the stream and left open. Its environment:
//
//   STAND_IN_LOG          a JSON-lines file: each message received, and each answer recorded
//   STAND_IN_RESPOND_TO   which notes it answers and records (default: none)
//   STAND_IN_FIRST_MS     the wait before its first delta, so "Starting the architect…" can be seen
//   STAND_IN_STEP_MS      the wait between deltas
//   STAND_IN_EXIT_NOTED   exit after a turn it only acknowledged, so the next ask starts a fresh session
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "packages", "core", "bin", "aof.mjs");
const env = process.env;
const respondTo = env.STAND_IN_RESPOND_TO ? new RegExp(env.STAND_IN_RESPOND_TO, "u") : null;
const firstMs = Number(env.STAND_IN_FIRST_MS ?? 800);
const stepMs = Number(env.STAND_IN_STEP_MS ?? 120);
const log = (entry) => { if (env.STAND_IN_LOG) appendFileSync(env.STAND_IN_LOG, `${JSON.stringify(entry)}\n`); };
const out = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const scratch = mkdtempSync(path.join(os.tmpdir(), "aof-stand-in-architect-"));
process.on("exit", () => rmSync(scratch, { recursive: true, force: true }));

// The real scene command, as the review command runs it.
function scene(ref, file, action, input) {
  const args = [cli, "diagram", "scene", ref, file, "--action", action, "--json"];
  if (input) { const at = path.join(scratch, `${action}.json`); writeFileSync(at, JSON.stringify(input)); args.push("--input", at); }
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}
const tool = (command) => out({ type: "assistant", message: { content: [{ type: "tool_use", id: `t${Date.now()}`, name: "Bash", input: { command } }] } });
async function stream(requestText) {
  const words = requestText.split(/(?<= )/u);
  for (let at = 0; at < words.length; at += 3) {
    out({ type: "stream_event", event: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: words.slice(at, at + 3).join("") } } });
    await sleep(stepMs);
  }
}
// The answer it writes for a note: long enough to be seen growing over a couple of seconds.
const answerFor = (question) => `Stand-in answer to "${question}": the board watches the review folder and re-stamps when a record changes, because the writer is another process that the board never sees write. Re-stamping turns that file change into one event the editor reads.`;

async function turn(text) {
  log({ received: text });
  const [, ref, file, requestId] = /^\/aof:diagram-review (\S+) (\S+)(?: (\S+))?$/u.exec(text.trim()) ?? [];
  out({ type: "system", subtype: "status" });
  await sleep(firstMs);
  if (!ref || !requestId) {
    await stream(ref ? "Reviewing the open notes." : "Noted.");
    return out({ type: "result", subtype: "success", result: "", permission_denials: [] });
  }
  tool(`aof diagram scene ${ref} ${file} --action context --input context.json --json`);
  const context = scene(ref, file, "context", { requestId });
  const question = [...(context.thread ?? [])].reverse().find((item) => item.by === "operator")?.text ?? context.request ?? "";
  if (!respondTo?.test(question)) {
    await stream("Noted; this note is left for the smoke to answer.");
    out({ type: "result", subtype: "success", result: "", permission_denials: [] });
    if (env.STAND_IN_EXIT_NOTED) { await sleep(50); process.exit(0); }
    return undefined;
  }
  const answer = answerFor(question);
  await stream(answer);
  tool(`aof diagram scene ${ref} ${file} --action respond --input respond.json --json`);
  scene(ref, file, "respond", { requestId, answer });
  log({ recorded: requestId, answer });
  out({ type: "result", subtype: "success", result: answer, permission_denials: [] });
}

out({ type: "system", subtype: "init", session_id: `stand-in-architect-${process.pid}` });
const turns = [];
let working = false;
async function drain() {
  if (working) return;
  working = true;
  while (turns.length) {
    const text = turns.shift();
    try { await turn(text); }
    catch (error) { log({ failed: String(error?.message ?? error) }); out({ type: "result", subtype: "error_during_execution", result: "", permission_denials: [] }); }
  }
  working = false;
}
let partial = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  const lines = (partial + chunk).split("\n");
  partial = lines.pop();
  for (const line of lines.filter((entry) => entry.trim())) {
    const message = JSON.parse(line);
    turns.push(message?.message?.content?.find?.((block) => block.type === "text")?.text ?? "");
  }
  void drain();
});
process.stdin.on("end", async () => { while (working || turns.length) await sleep(10); process.exit(0); });
