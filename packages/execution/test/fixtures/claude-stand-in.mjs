#!/usr/bin/env node
// A STAND-IN `claude` for the one-shot model ask (201/01): it is launched in print mode, reads all
// of stdin, and prints the one JSON document `claude -p --output-format json` prints. The recall
// pick's suites name it through `AOF_RECALL_PICK_EXECUTABLE`, so no test starts the real one.
// Its behaviour is the environment's:
//
//   STAND_IN_LOG       a JSON-lines file: `start` (argv, cwd, env keys, pid) as soon as it runs,
//                      `stdin` (everything it was sent) once stdin closes, and `answered` at the end
//   STAND_IN_ANSWER    the result text (default "[1, 2, 3, 4, 5]", the first five cards in order)
//   STAND_IN_DELAY_MS  how long it waits before it answers (default 0)
//   STAND_IN_MODE      "answer" (the default), or one of the ways a real one goes wrong:
//                        not-json       exits 0 with output that is not JSON
//                        error-result   exits 0 with a result document marked as an error
//                        no-output      exits 0 with no output
//                        not-logged-in  prints "Not logged in" on stderr and exits 1
//                        signal         is ended by a signal before it answers
import { appendFileSync } from "node:fs";

const env = process.env;
const log = (entry) => { if (env.STAND_IN_LOG) appendFileSync(env.STAND_IN_LOG, `${JSON.stringify(entry)}\n`); };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

log({ start: { argv: process.argv.slice(2), cwd: process.cwd(), env: Object.keys(env).sort(), pid: process.pid } });

let stdin = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) stdin += chunk;
log({ stdin });

const mode = env.STAND_IN_MODE ?? "answer";
if (mode === "not-logged-in") {
  process.stderr.write("Not logged in · Please run /login\n");
  process.exit(1);
}
if (mode === "signal") process.kill(process.pid, "SIGKILL");
await sleep(Number(env.STAND_IN_DELAY_MS ?? 0));
if (mode === "not-json") process.stdout.write("Claude Code could not print a result.\n");
else if (mode === "error-result") process.stdout.write(`${JSON.stringify({ type: "result", subtype: "error_during_execution", is_error: true, result: "API Error: overloaded" })}\n`);
else if (mode !== "no-output") {
  process.stdout.write(`${JSON.stringify({ type: "result", subtype: "success", is_error: false, result: env.STAND_IN_ANSWER ?? "[1, 2, 3, 4, 5]", session_id: `stand-in-${process.pid}`, num_turns: 1 })}\n`);
}
log({ answered: mode });
