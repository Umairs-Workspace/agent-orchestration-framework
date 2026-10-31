// Fitness function FF-17501 · acd-desktop-reaps-process-groups (milestone 175 / ADR-001).
//
//   On unix, every supervised spawn sets a process group, and the unix tree kill signals that
//   group, never a bare pid.
//
// `cargo test` reaches the reap ladder's decisions (`crates/core/src/reap.rs`), but the shell that
// carries them out lives in `crates/app`, which `apps/desktop/Cargo.toml`'s workspace EXCLUDES, so
// a Rust test beside it would never run. A green ladder cannot see a spawn that drops its group or
// a kill that goes back to the bare pid. So, over the source, four claims:
//   1. The supervised spawn (`supervise_child`) sets `process_group(0)` under `#[cfg(unix)]`, before
//      it spawns.
//   2. The unix tree kill and the unix immediate stop signal the group through the core's
//      `last_rung_kill`, and spawn nothing: no `Command::new` in either body.
//   3. No kill in the app crate reaches a bare pid off Windows: no `libc::kill(`, no
//      `Command::new("kill")`, and `start_kill` only inside a `#[cfg(windows)]` function.
//   4. Every exit reaches the reap: `RunEvent::Exit` calls `.reap()`, the unix reap steps the
//      core's `ReapPlan`, and the core's grace is the 5 s ADR-001 §2 fixes.
// Self-check (non-vacuous): a planted ungrouped spawn, a planted bare-pid kill and a planted `kill`
// spawn each trip the detector the real tree passes.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const desktop = (...parts) => path.join(repoRoot, "apps", "desktop", ...parts);
const SUPERVISOR = desktop("crates", "app", "src", "supervisor.rs");
const MAIN = desktop("crates", "app", "src", "main.rs");
const REAP = desktop("crates", "core", "src", "reap.rs");

const stripComments = (source) => source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

// Every definition of `fn name`, each with the `#[cfg(...)]` attribute directly above it (or null)
// and its body, by brace matching from the brace that opens the body.
function fnDefinitions(code, name) {
  const out = [];
  const head = new RegExp(`(#\\[cfg\\(([^\\]]*)\\)\\]\\s*)?(?:pub\\s+)?(?:async\\s+)?fn\\s+${name}\\s*[(<]`, "g");
  for (const match of code.matchAll(head)) {
    const open = code.indexOf("{", code.indexOf(")", match.index));
    let depth = 0;
    for (let index = open; index < code.length; index += 1) {
      if (code[index] === "{") depth += 1;
      else if (code[index] === "}" && --depth === 0) {
        out.push({ cfg: match[2] ?? null, body: code.slice(match.index, index + 1) });
        break;
      }
    }
  }
  return out;
}

// Claim 1: the supervised spawn leads its own group, set before the spawn.
function spawnGroupFindings(code) {
  const [spawn] = fnDefinitions(code, "supervise_child");
  if (!spawn) return ["supervise_child is not defined"];
  const grouped = spawn.body.search(/#\[cfg\(unix\)\]\s*cmd\.process_group\(\s*0\s*\)/);
  const spawned = spawn.body.search(/\bcmd\.spawn\(\)/);
  if (spawned < 0) return ["supervise_child spawns nothing"];
  if (grouped < 0) return ["supervise_child sets no `#[cfg(unix)] cmd.process_group(0)`"];
  if (grouped > spawned) return ["supervise_child sets the process group after it spawns"];
  return [];
}

// Claims 2 and 3: every unix kill is a group signal, and nothing kills a bare pid off Windows.
function killFindings(code) {
  const findings = [];
  for (const name of ["tree_kill", "kill_now"]) {
    const unix = fnDefinitions(code, name).filter((def) => def.cfg === "unix");
    if (unix.length !== 1) {
      findings.push(`${name} has ${unix.length} #[cfg(unix)] definitions`);
      continue;
    }
    if (!/\bsignal_group\s*\(\s*last_rung_kill\s*\(/.test(unix[0].body)) findings.push(`the unix ${name} does not signal last_rung_kill's group`);
    if (/\bCommand::new\b/.test(unix[0].body)) findings.push(`the unix ${name} spawns a process`);
  }
  if (/\blibc::kill\s*\(/.test(code)) findings.push("a bare-pid libc::kill");
  if (/Command::new\(\s*"kill"\s*\)/.test(code)) findings.push('a `kill` spawn');
  for (const match of code.matchAll(/\bstart_kill\s*\(/g)) {
    const owner = [...code.slice(0, match.index).matchAll(/(#\[cfg\(([^\]]*)\)\]\s*)?(?:pub\s+)?(?:async\s+)?fn\s+\w+/g)].pop();
    if (owner?.[2] !== "windows") findings.push("start_kill outside a #[cfg(windows)] function");
  }
  return findings;
}

export const archTests = [
  {
    name: "arch/175 FF-17501 (acd-desktop-reaps-process-groups): every supervised spawn leads its own process group on unix",
    run: async () => {
      const supervisor = stripComments(await readFile(SUPERVISOR, "utf8"));
      assert.deepEqual(spawnGroupFindings(supervisor), []);
    },
  },
  {
    name: "arch/175 FF-17501 (acd-desktop-reaps-process-groups): every unix kill signals the group through the core's last rung, never a bare pid, and spawns nothing",
    run: async () => {
      const supervisor = stripComments(await readFile(SUPERVISOR, "utf8"));
      const main = stripComments(await readFile(MAIN, "utf8"));
      assert.deepEqual(killFindings(supervisor), []);
      assert.deepEqual(killFindings(main).filter((f) => !/has 0 #\[cfg\(unix\)\]/.test(f)), [], "main.rs kills nothing by pid");
    },
  },
  {
    name: "arch/175 FF-17501 (acd-desktop-reaps-process-groups): every exit reaches the reap, which steps the core's plan with a 5 s grace",
    run: async () => {
      const supervisor = stripComments(await readFile(SUPERVISOR, "utf8"));
      const main = stripComments(await readFile(MAIN, "utf8"));
      const reap = stripComments(await readFile(REAP, "utf8"));
      assert.match(main, /RunEvent::Exit\s*=>\s*\{[\s\S]*?\.reaper\.reap\(\)/, "RunEvent::Exit calls the reaper");
      assert.match(main, /signal\(SignalKind::terminate\(\)\)[\s\S]*?\.exit\(0\)/, "a SIGTERM takes Quit's app.exit(0)");
      const unixReap = fnDefinitions(supervisor, "reap").filter((def) => def.cfg === "unix");
      assert.equal(unixReap.length, 1, "one unix reap");
      assert.match(unixReap[0].body, /\bReapPlan::new\(/, "the unix reap steps the core's plan");
      assert.match(unixReap[0].body, /\bplan\.step\(/, "the unix reap asks the plan each step");
      assert.match(reap, /pub const REAP_GRACE_MS: u64 = 5_000;/, "the grace is 5 s");
    },
  },
  {
    name: "arch/175 FF-17501 (acd-desktop-reaps-process-groups): self-check — a planted ungrouped spawn, bare-pid kill or kill spawn trips the detector",
    run: async () => {
      const grouped = "async fn supervise_child() { #[cfg(unix)] cmd.process_group(0); let c = cmd.spawn(); }";
      assert.deepEqual(spawnGroupFindings(grouped), []);
      assert.ok(spawnGroupFindings("async fn supervise_child() { let c = cmd.spawn(); }").length > 0, "no group trips");
      assert.ok(spawnGroupFindings("async fn supervise_child() { let c = cmd.spawn(); #[cfg(unix)] cmd.process_group(0); }").length > 0, "a late group trips");

      const kills = [
        "#[cfg(unix)] async fn tree_kill(pid: u32) { signal_group(last_rung_kill(pid)); }",
        "#[cfg(windows)] fn kill_now(child: &mut Child) { let _ = child.start_kill(); }",
        "#[cfg(unix)] fn kill_now(child: &mut Child) { if let Some(pid) = child.id() { signal_group(last_rung_kill(pid)); } }",
      ].join("\n");
      assert.deepEqual(killFindings(kills), []);
      assert.ok(killFindings(kills.replace("signal_group(last_rung_kill(pid));", "unsafe { libc::kill(pid as i32, 9); }")).length > 0, "a bare-pid kill trips");
      assert.ok(killFindings(kills.replace("signal_group(last_rung_kill(pid));", 'Command::new("kill").arg("-KILL");')).length > 0, "a kill spawn trips");
      assert.ok(killFindings(kills.replace("#[cfg(windows)] fn kill_now", "fn kill_now_any")).length > 0, "an unguarded start_kill trips");
    },
  },
];
