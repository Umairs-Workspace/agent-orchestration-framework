#!/usr/bin/env node
// aof-generated: bundle. PostToolUse must never block the session: this hot hook
// derives no workspace identity, opens no aof store, imports no framework module,
// writes no output, and exits successfully on every path.
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

try {
  const itemDir = process.env.AOF_RUN_ITEM_DIR;
  const runId = process.env.AOF_RUN_ID;
  if (typeof itemDir === "string" && itemDir.length > 0 && typeof runId === "string" && runId.length > 0) {
    const runsDir = join(itemDir, "runs");
    mkdirSync(runsDir, { recursive: true });
    appendFileSync(join(runsDir, ".heartbeats.ndjson"), `${JSON.stringify({ runId, at: new Date().toISOString() })}\n`, "utf8");
  }
} catch {
  // Liveness bookkeeping cannot turn a completed tool call into a hook failure.
}
