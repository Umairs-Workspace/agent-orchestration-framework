#!/usr/bin/env node
// aof-generated: bundle. PreToolUse on the human-input tool must never block the session: this hook
// derives no workspace identity, opens no aof store, imports no framework module, writes no output,
// and exits successfully on every path (136/ADR-004). Claude Code writes a pending AskUserQuestion
// call to the transcript only once it is answered, so a driven session's question is recorded here,
// before the picker draws, for the run's owner to read.
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  try {
    const itemDir = process.env.AOF_RUN_ITEM_DIR;
    const runId = process.env.AOF_RUN_ID;
    if (typeof itemDir !== "string" || itemDir.length === 0 || typeof runId !== "string" || runId.length === 0) return;
    const event = JSON.parse(input);
    if (typeof event?.session_id !== "string" || typeof event?.tool_use_id !== "string") return;
    const runsDir = join(itemDir, "runs");
    mkdirSync(runsDir, { recursive: true });
    const record = { runId, sessionId: event.session_id, toolUseId: event.tool_use_id, name: event.tool_name ?? null, input: event.tool_input ?? null, at: new Date().toISOString() };
    appendFileSync(join(runsDir, ".asks-pending.ndjson"), `${JSON.stringify(record)}\n`, "utf8");
  } catch {
    // Recording a pending question cannot turn the question into a hook failure.
  }
});
