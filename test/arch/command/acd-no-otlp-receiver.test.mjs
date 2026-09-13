// Fitness function: acd-no-otlp-receiver (milestone 68 / story 01 / 68/ADR-005 §2 +
// ADR-008 / FF-6808) — "aof ships no OTLP receiver."
//
//   "No module in src/** opens a listening socket for, parses, or serves an OTLP
//    payload; the OTel surface is env-set-at-spawn only."
//
// The OTel half of attribution (68/ADR-005 §2) is an EXPORT COURTESY: aof sets
// OTEL_RESOURCE_ATTRIBUTES + telemetry enablement at the spawn seam so a project that
// runs its OWN collector is correctly attributed for free. aof builds NO receiver —
// a hosted observability stack is a project choice, and a receiver would put a daemon
// dependency between aof and its own numbers. Every figure this milestone produces is
// correct with no collector running anywhere.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC = path.join(root, "src");

async function modulesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await modulesUnder(target));
    else if (entry.name.endsWith(".mjs")) out.push(target);
  }
  return out;
}

export const archTests = [
  {
    name: "arch/68 FF-6808 (acd-no-otlp-receiver): no src module opens a listening socket for, parses, or serves an OTLP payload",
    run: async () => {
      const modules = await modulesUnder(SRC);
      assert.ok(modules.length > 150, `src was actually walked: ${modules.length} modules`);
      const offenders = [];
      for (const file of modules) {
        const code = (await readFile(file, "utf8")).replace(/\r\n/gu, "\n");
        // A RECEIVER speaks OTLP AND listens/decodes/serves — env-set-at-spawn never
        // does either. Any src module that references OTLP and also creates a server /
        // binds a socket / decodes a payload is a receiver.
        if (
          /otlp/i.test(code) &&
          /createServer|\.listen\(|net\.createServer|createWebSocketServer|grpc|protobuf|\.decode\(|parseOtlp|otlpPayload/i.test(code)
        ) {
          offenders.push(path.relative(root, file));
        }
      }
      assert.deepEqual(offenders, [], `no src module receives OTLP — the OTel surface is env-set-at-spawn only (offenders: ${offenders.join("; ")})`);
    },
  },
  {
    name: "arch/68 FF-6808 (acd-no-otlp-receiver): the OTel env surface is a SET, never a receiver read — no src module that references the OTel env keys also opens a listener or decodes a payload",
    run: async () => {
      const modules = await modulesUnder(SRC);
      const offenders = [];
      for (const file of modules) {
        const code = (await readFile(file, "utf8")).replace(/\r\n/gu, "\n");
        // The env-set surface (the attribution leaf's constants + the spawn seam's
        // assignment) is legitimate; a module that ALSO creates a server / binds a
        // socket / decodes an OTLP payload is a receiver.
        if (
          /OTEL_RESOURCE_ATTRIBUTES|CLAUDE_CODE_ENABLE_TELEMETRY/.test(code) &&
          /createServer|\.listen\(|net\.createServer|createWebSocketServer|grpc|protobuf|\.decode\(|parseOtlp|otlpPayload/i.test(code)
        ) {
          offenders.push(path.relative(root, file));
        }
      }
      assert.deepEqual(offenders, [], `the OTel surface is env-set-at-spawn only — no module that references it receives OTLP (offenders: ${offenders.join("; ")})`);
    },
  },
];
