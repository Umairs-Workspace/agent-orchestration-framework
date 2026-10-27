#!/usr/bin/env node
// A STAND-IN `claude` that speaks stream-json (172/00) — the conversation suite's session, and the
// browser check's through `AOF_ARCHITECT_EXECUTABLE`. It reads one stream-json user message per stdin
// line and answers each, one at a time, in the shapes 172/RESEARCH Q1 measured: a `system` init, a
// `rate_limit_event`, text deltas, an `assistant` line holding a tool use, and one `result` line.
// Its behaviour is the environment's:
//
//   STAND_IN_LOG       a JSON-lines file: `start` (argv, cwd, env keys), each `received` message's
//                      text the moment it arrives, and each `result` written
//   STAND_IN_TEXT      the answer, streamed in chunks of a few characters (default "Answered.")
//   STAND_IN_DELAY_MS  how long each turn takes before its result (default 20)
//   STAND_IN_HOLD_DIR  each turn waits for `<dir>/release` (and removes it) before its result
//   STAND_IN_EXIT      "mid-turn": exit with code 1 after the first delta
//   STAND_IN_DENY      a Bash command the turn reports as a permission denial
import { appendFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";

const env = process.env;
const log = (entry) => { if (env.STAND_IN_LOG) appendFileSync(env.STAND_IN_LOG, `${JSON.stringify(entry)}\n`); };
const out = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sessionId = `stand-in-${process.pid}`;

log({ start: { argv: process.argv.slice(2), cwd: process.cwd(), env: Object.keys(env).sort(), pid: process.pid } });
out({ type: "system", subtype: "init", session_id: sessionId });

const turns = [];
let working = false;
async function answer() {
  if (working) return;
  working = true;
  while (turns.length > 0) {
    const text = turns.shift();
    out({ type: "rate_limit_event" });
    out({ type: "stream_event", event: { type: "message_start" } });
    const reply = env.STAND_IN_TEXT ?? "Answered.";
    const chunks = reply.match(/.{1,8}/gsu) ?? [];
    for (const [index, chunk] of chunks.entries()) {
      out({ type: "stream_event", session_id: sessionId, event: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: chunk } } });
      if (index === 0 && env.STAND_IN_EXIT === "mid-turn") process.exit(1);
    }
    out({ type: "assistant", session_id: sessionId, message: { content: [{ type: "tool_use", id: "t1", name: "Bash", input: { command: "aof diagram scene 171 X.excalidraw --action context --input c.json --json" } }] } });
    out({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t1", content: "ok" }] } });
    await sleep(Number(env.STAND_IN_DELAY_MS ?? 20));
    if (env.STAND_IN_HOLD_DIR) {
      const release = path.join(env.STAND_IN_HOLD_DIR, "release");
      while (!existsSync(release)) await sleep(10);
      rmSync(release, { force: true });
    }
    const denials = env.STAND_IN_DENY ? [{ tool_name: "Bash", tool_use_id: "t2", tool_input: { command: env.STAND_IN_DENY } }] : [];
    log({ result: text });
    out({ type: "result", subtype: "success", is_error: false, result: reply, session_id: sessionId, permission_denials: denials });
  }
  working = false;
}

let partial = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  const lines = (partial + chunk).split("\n");
  partial = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    const message = JSON.parse(line);
    const text = message?.message?.content?.find?.((block) => block.type === "text")?.text ?? "";
    log({ received: text });
    turns.push(text);
  }
  void answer();
});
// A stream-json session exits at the end of its input, once the turn in hand is answered.
process.stdin.on("end", async () => { while (working || turns.length > 0) await sleep(5); process.exit(0); });
