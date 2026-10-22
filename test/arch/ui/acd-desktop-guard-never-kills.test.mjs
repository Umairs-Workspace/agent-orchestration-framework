// Fitness function FF-16704 · acd-desktop-guard-never-kills (milestone 167 / ADR-006).
//
//   The desktop guard has no path to stop, restart or kill a supervised daemon. An overrun is
//   shown and logged; the operator decides.
//
// `cargo test` reaches the guard's judgement (`crates/core/src/guard.rs`), but the shell that acts
// on it lives in `crates/app`, which `apps/desktop/Cargo.toml`'s workspace EXCLUDES, so a Rust test
// beside it would never run. A passing guard test cannot see a kill added to the shell's guard
// path. So, over the source, three claims:
//   1. The guard module, the OS sampler and the shell's guard tick (`observe_daemons` and the
//      log append it calls) name no stop, restart or kill: no `kill`/`start_kill`/`tree_kill`/
//      `taskkill`/`TerminateProcess`, no `set_desired`/`retire`/`hold`, no `SupervisorCommand`, no
//      `Command::new`.
//   2. The sampler opens a process for QUERY only — `PROCESS_QUERY_LIMITED_INFORMATION`, never a
//      right that could end it.
//   3. The guard tick reads each controller for its pid and nothing else.
// Self-check (non-vacuous): a planted kill, a planted terminate right and a planted desired flip
// each trip the detector the real tree passes.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const desktop = (...parts) => path.join(repoRoot, "apps", "desktop", ...parts);
const GUARD = desktop("crates", "core", "src", "guard.rs");
const SAMPLER = desktop("crates", "app", "src", "cpu_sample.rs");
const SUPERVISOR = desktop("crates", "app", "src", "supervisor.rs");

const stripComments = (source) => source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

// Every way the shell could stop, restart or kill a child, as it spells them today.
const ACTS = [
  /\bstart_kill\b/, /\bkill\s*\(/, /\btree_kill\b/, /\btaskkill\b/i, /\bTerminateProcess\b/,
  /\bset_desired\b/, /\.retire\s*\(/, /\.hold\s*\(/, /\bSupervisorCommand\b/, /\bCommand::new\b/, /\bPROCESS_TERMINATE\b/,
];
const actsIn = (code) => ACTS.filter((pattern) => pattern.test(code)).map(String);

// The body of `fn name(...) { ... }`, by brace matching from the brace that opens the body.
function fnBody(code, name) {
  const start = code.search(new RegExp(`\\bfn\\s+${name}\\s*[(<]`));
  if (start < 0) return null;
  const open = code.indexOf("{", code.indexOf(")", start));
  let depth = 0;
  for (let index = open; index < code.length; index += 1) {
    if (code[index] === "{") depth += 1;
    else if (code[index] === "}" && --depth === 0) return code.slice(start, index + 1);
  }
  return null;
}

async function guardPath() {
  const supervisor = stripComments(await readFile(SUPERVISOR, "utf8"));
  const tick = fnBody(supervisor, "observe_daemons");
  const append = fnBody(supervisor, "append_degrade_line");
  return { supervisor, tick, append };
}

export const archTests = [
  {
    name: "arch/167 FF-16704 (acd-desktop-guard-never-kills): the guard, its sampler and the shell's guard tick name no stop, restart or kill",
    async run() {
      const guard = stripComments(await readFile(GUARD, "utf8"));
      const sampler = stripComments(await readFile(SAMPLER, "utf8"));
      const { supervisor, tick, append } = await guardPath();
      assert.ok(guard.includes("fn observe") && sampler.includes("GetProcessTimes"), "the guard and the sampler were read (non-vacuous)");
      assert.ok(tick && append, "observe_daemons and append_degrade_line are found");
      assert.match(supervisor, /\bobserve_daemons\s*\(\s*&mut watch\b/, "the poll tick runs the guard tick");
      for (const [where, code] of [["guard.rs", guard], ["cpu_sample.rs", sampler], ["observe_daemons", tick], ["append_degrade_line", append]]) {
        assert.deepEqual(actsIn(code), [], `${where} has no path to stop, restart or kill a daemon`);
      }
    },
  },
  {
    name: "arch/167 FF-16704 (acd-desktop-guard-never-kills): the sampler opens a process for query only, and the guard tick reads only each controller's pid",
    async run() {
      const sampler = stripComments(await readFile(SAMPLER, "utf8"));
      const opens = [...sampler.matchAll(/\bOpenProcess\s*\(\s*([^,]+),/g)].map((match) => match[1].trim());
      assert.deepEqual(opens, ["PROCESS_QUERY_LIMITED_INFORMATION"], "one open, for query only");
      const { tick } = await guardPath();
      const reads = [...tick.matchAll(/\bctl\.(\w+)\s*\(/g)].map((match) => match[1]);
      assert.ok(reads.length > 0, "the tick reads the controllers (non-vacuous)");
      assert.deepEqual([...new Set(reads)], ["pid"], "each controller is read for its pid and nothing else");
    },
  },
  {
    name: "arch/167 FF-16704 (acd-desktop-guard-never-kills): self-check — a planted kill, terminate right or desired flip trips the detector",
    run() {
      assert.ok(actsIn("fn observe_daemons() { let _ = child.start_kill(); }").length > 0);
      assert.ok(actsIn("OpenProcess(PROCESS_TERMINATE, 0, pid)").length > 0);
      assert.ok(actsIn("ctl.set_desired(false);").length > 0);
      assert.deepEqual(actsIn("let share = cpu_ms / wall_ms; ctl.pid();"), []);
      assert.match(fnBody("fn observe_daemons(a: u32) { if a > 0 { x(); } }", "observe_daemons"), /x\(\)/);
    },
  },
];
