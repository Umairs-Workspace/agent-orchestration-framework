// Fitness function FF-12606 (milestone 126 / ADR-006) — "The supervised set is SUPPLIED,
// not matched, and Rust learns no completion semantics."
//
// Seven claims, over `app/desktop/**/*.rs` with Rust comments stripped:
//
//   1. No `match`/`if` on `is_control_node` selects a supervised SET. The role latch's
//      single server start remains, asserted as THE ONE NAMED EXEMPTION — so a second
//      cannot arrive silently.
//   2. No loop/scope/phase/run DECISION vocabulary appears in the crate, with one named
//      exemption: the token `loop` may appear only as the second element of the admitted
//      `["work", "loop"]` argv literal — the runtime gate (ADR-006 contract-beat §5).
//      The other half of §8's roster is enforced in `acd-desktop-read-only-fleet.test.mjs`
//      (this control's sibling clause, extended in that control's OWN file), which is
//      why the Rust tree holds the gate and not a second copy of the roster.
//   3. `SupervisorState` carries NO per-child signal field — its signals resolve by id
//      through ONE map — and the six `main.rs` consumers still resolve.
//   4. The reconcile is a PURE function in `crates/core` with its `#[cfg(test)]` beside
//      `supervision.rs`'s existing tests. `scripts/test.mjs` runs `cargo test` over
//      `app/desktop/Cargo.toml`, whose workspace EXCLUDES `crates/app`, so a decision
//      written beside the spawning code would never run — asserted off the manifest, not
//      remembered. The reconcile reads no clock, spawns nothing and opens no file, and
//      the shell holds no reconcile decision of its own.
//   5. ONE struct describes a supervised child, ONE function spawns one, every spawn it
//      makes joins the Job Object, and the working directory comes from the child's own
//      `cwd` and from nowhere else (task 02).
//   6. ONE poll interval and no second cadence: the role latch still starts the server
//      once, a declaration row never does, and the UI daemon is still started immediately.
//   7. ADR-005 §6 (AMENDED) — a reconcile runs only on an ANSWER. `ok: false` and a
//      missing `declarations` key both leave the supervised set alone, because an
//      unreadable store read as "this node declares nothing" would stop everything.
//
// WHAT THIS CONTROL DOES NOT RESTATE. `acd-desktop-{no-mesh-logic,single-data-path,
// trusted-spawn}` hold "the app runs no mesh logic / reads one data path / spawns a
// trusted absolute argv"; ADR-006 §8 depends on all three rather than copying them. The
// reconcile's BEHAVIOUR (start/stop/retain, the hold, the level-triggered restart) is
// driven by `cargo test` in `crates/core`, which is the only Rust lane that runs — this
// file asserts the absences a running test cannot see.
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DESKTOP_DIR = path.join(repoRoot, "app", "desktop");
const CORE_SUPERVISION = path.join(DESKTOP_DIR, "crates", "core", "src", "supervision.rs");
const SHELL_SUPERVISOR = path.join(DESKTOP_DIR, "crates", "app", "src", "supervisor.rs");
const SHELL_MAIN = path.join(DESKTOP_DIR, "crates", "app", "src", "main.rs");
const WORKSPACE_MANIFEST = path.join(DESKTOP_DIR, "Cargo.toml");

function stripRustComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

async function dirExists(dir) {
  try { return (await stat(dir)).isDirectory(); } catch { return false; }
}

async function collectRustFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "target") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collectRustFiles(full)));
    else if (entry.isFile() && entry.name.endsWith(".rs")) out.push(full);
  }
  return out;
}

/** Every `.rs` file in the subtree, comment-stripped, keyed by repo-relative path. */
async function rustSources() {
  const files = await collectRustFiles(DESKTOP_DIR);
  const out = new Map();
  for (const file of files) {
    out.set(path.relative(repoRoot, file), stripRustComments(await readFile(file, "utf8")));
  }
  return out;
}

/**
 * The braced block that FOLLOWS `index` in `source` — from the next `{` to its matching
 * `}`. Used to ask what a conditional actually DOES, rather than pattern-matching one
 * line of it.
 */
export function blockAfter(source, index) {
  const open = source.indexOf("{", index);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return source.slice(open);
}

/** The `fn <name>` body in `source`, or `""` when it holds none. */
export function functionBody(source, name) {
  const at = source.search(new RegExp(`fn\\s+${name}\\s*[(<]`));
  return at < 0 ? "" : blockAfter(source, at);
}

/** The `struct <name>` body in `source`, or `""`. */
export function structBody(source, name) {
  const at = source.search(new RegExp(`struct\\s+${name}\\b`));
  return at < 0 ? "" : blockAfter(source, at);
}

// A branch that STARTS a supervised child — the vocabulary the shell uses to do it.
const STARTS_A_CHILD = /set_desired\s*\(\s*true|supervise_child\s*\(|SupervisedChild::/;

/**
 * Every `if`/`match` conditioned on `is_control…`, paired with what its block does.
 * The claim under test is about which of these SELECTS A SET, so the block is read
 * rather than the line.
 */
export function roleConditionedBranches(source) {
  const branches = [];
  const re = /\b(?:if|match)\b[^\n{]*\bis_control\w*/g;
  for (const match of source.matchAll(re)) {
    const block = blockAfter(source, match.index + match[0].length);
    branches.push({ head: match[0].trim(), startsAChild: STARTS_A_CHILD.test(block), block });
  }
  return branches;
}

/** Every occurrence of the exact quoted token, with a little context either side. */
function quotedTokenHits(source, token) {
  const hits = [];
  const re = new RegExp(`"${token}"`, "g");
  for (const match of source.matchAll(re)) {
    hits.push({ index: match.index, before: source.slice(Math.max(0, match.index - 32), match.index) });
  }
  return hits;
}

/** True when a `"loop"` occurrence is the SECOND element of a `["work", "loop"]` literal. */
export function isAdmittedLoopToken(before) {
  return /"work"\s*(?:\.to_string\(\))?\s*,\s*$/.test(before);
}

export const archTests = [
  {
    name: "arch/126 FF-12606: the supervised set is COMPOSED, not matched — `supervision_set` is gone, the set-composing module names no role, and the role latch's single server start is the ONE named exemption",
    run: async () => {
      if (!(await dirExists(DESKTOP_DIR))) {
        assert.equal(await dirExists(DESKTOP_DIR), false, "app/desktop/ absent (pre-build)");
        return;
      }
      const sources = await rustSources();
      assert.ok(sources.size > 0, "the Rust subtree was actually walked (non-vacuous)");

      // The superseded `match` (36/ADR-002 d1) is gone from the tree, not merely unused.
      for (const [file, source] of sources) {
        assert.doesNotMatch(source, /\bfn\s+supervision_set\b/, `${file} holds no role-matched supervision_set`);
      }

      // The module that composes the set reads no role at all.
      const supervision = sources.get(path.relative(repoRoot, CORE_SUPERVISION));
      assert.ok(supervision, "the core supervision module was scanned");
      assert.match(supervision, /\bpub fn compose_supervised_set\b/, "the set is composed by a named function");
      assert.doesNotMatch(supervision, /is_control/, "the set-composing module never reads isControlNode");

      // Tree-wide: exactly ONE role-conditioned branch starts a supervised child, and it
      // is the role latch. A second would be the `match` arriving one level down.
      const starting = [];
      for (const [file, source] of sources) {
        for (const branch of roleConditionedBranches(source)) {
          if (branch.startsAChild) starting.push({ file, head: branch.head });
        }
      }
      assert.equal(
        starting.length,
        1,
        `exactly one role-conditioned branch starts a supervised child (the role latch), got: ${JSON.stringify(starting)}`
      );
      assert.equal(
        starting[0].file,
        path.relative(repoRoot, SHELL_SUPERVISOR),
        "and it is the shell's poll-loop role latch"
      );
      const latch = roleConditionedBranches(sources.get(starting[0].file)).find((b) => b.startsAChild);
      assert.match(
        latch.block,
        /MESH_SERVE_ID/,
        "the named exemption starts the RESERVED server id and nothing else — it selects no set"
      );
    },
  },
  {
    name: "arch/126 FF-12606: no loop/scope/phase/run DECISION vocabulary crosses into the crate — `loop` only as the second element of the admitted `[\"work\", \"loop\"]` argv, and the runtime gate has ONE home",
    run: async () => {
      if (!(await dirExists(DESKTOP_DIR))) return;
      const sources = await rustSources();

      // Tokens that are never transported and never decided on.
      for (const token of ["phase", "run-status"]) {
        for (const [file, source] of sources) {
          assert.deepEqual(
            quotedTokenHits(source, token).map(() => file),
            [],
            `${file} names no \`${token}\` — no policy leaks across the boundary`
          );
        }
      }

      // `loop`: admitted ONLY as the argv's second element. Every occurrence is checked,
      // so a use as a decision word — a `kind == "loop"`, a `"loop"` match arm — reds.
      let admitted = 0;
      const offenders = [];
      for (const [file, source] of sources) {
        for (const hit of quotedTokenHits(source, "loop")) {
          if (isAdmittedLoopToken(hit.before)) admitted += 1;
          else offenders.push({ file, before: hit.before.trim().slice(-40) });
        }
      }
      assert.deepEqual(offenders, [], `every \`loop\` token is the admitted verb's NAME, got: ${JSON.stringify(offenders)}`);
      assert.ok(admitted > 0, "the admitted argv literal is actually present (non-vacuous)");

      // `scope` is DISPLAY-ONLY on the wire and the supervisor interprets none of it —
      // so it is never read out of a row at all, which is stronger than "never branched
      // on". The gate reads exactly the four keys a row must have to be spawnable.
      const status = sources.get(path.join("app", "desktop", "crates", "core", "src", "status.rs"));
      assert.ok(status, "the status module was scanned");
      const gate = functionBody(status, "declaration_child");
      assert.ok(gate.length > 0, "the parse's one gate is a named function");
      assert.deepEqual(
        [...gate.matchAll(/\.get\("([\w-]+)"\)/g)].map((m) => m[1]).sort(),
        ["argv", "cwd", "id", "label"],
        "the gate reads id, argv, cwd and label — never scope, level or cap, which it does not interpret"
      );

      // The runtime gate's admitted prefix has ONE home, and the gate is its only reader
      // — a second admission rule at the spawn would give a refused row two homes.
      const declaringFiles = [...sources].filter(([, s]) => /const\s+DECLARATION_ARGV_PREFIX/.test(s));
      // ONE HOME, spelled as the floor plus a declared ceiling, never as a retyped count (FF-11902).
      assert.ok(declaringFiles.length >= 1, "the Rust subtree declares the admitted argv prefix somewhere");
      assert.ok(declaringFiles.length <= 1, `the admitted argv prefix is declared exactly once — found: ${declaringFiles.map(([file]) => file).join(", ")}`);
      assert.equal(declaringFiles[0][0], path.relative(repoRoot, CORE_SUPERVISION), "and it lives in the core crate");
      const readers = [...sources].filter(([file, s]) => s.includes("DECLARATION_ARGV_PREFIX") && file !== declaringFiles[0][0]);
      assert.deepEqual(
        readers.map(([file]) => file),
        [path.join("app", "desktop", "crates", "core", "src", "status.rs")],
        "the parse is its only reader — nothing downstream re-tests a row"
      );
    },
  },
  {
    name: "arch/126 FF-12606: `SupervisorState` carries no per-child signal field — the signals resolve by id through ONE map, and every `main.rs` consumer still resolves",
    run: async () => {
      if (!(await dirExists(DESKTOP_DIR))) return;
      const sources = await rustSources();
      const supervisor = sources.get(path.relative(repoRoot, SHELL_SUPERVISOR));
      const main = sources.get(path.relative(repoRoot, SHELL_MAIN));
      assert.ok(supervisor && main, "the shell crate was scanned");

      const state = structBody(supervisor, "SupervisorState");
      assert.ok(state.length > 0, "SupervisorState was found");
      assert.doesNotMatch(state, /\bserver_signal\s*:/, "no per-child server signal FIELD");
      assert.doesNotMatch(state, /\bui_signal\s*:/, "no per-child UI signal FIELD");
      assert.match(state, /\bsignals\s*:\s*BTreeMap</, "the signals are one map");
      assert.match(
        supervisor,
        /fn server_signal\(&self\)[\s\S]{0,200}MESH_SERVE_ID/,
        "the server signal is an ACCESSOR resolving the reserved id through that map"
      );
      assert.match(
        supervisor,
        /fn ui_signal\(&self\)[\s\S]{0,200}MESH_UI_ID/,
        "the UI signal likewise"
      );

      // Every consumer reads through the accessors — a surviving bare field read would
      // not compile, so what this asserts is that none was replaced by a NEW field.
      const consumers = [...main.matchAll(/\b(?:server_signal|ui_signal)\(\)/g)];
      assert.ok(
        consumers.length >= 6,
        `the six main.rs consumers still resolve, each asking for the id it already asked for (found ${consumers.length} reads)`
      );
      assert.doesNotMatch(main, /\.(?:server_signal|ui_signal)\s*[,;=)}\]]/, "no consumer reads a bare signal FIELD");

      // The commands are id-addressed and each places a hold.
      assert.match(supervisor, /enum SupervisorCommand[\s\S]{0,160}Start\(String\)/, "Start carries a declaration id");
      assert.match(supervisor, /enum SupervisorCommand[\s\S]{0,160}Stop\(String\)/, "Stop carries a declaration id");
      assert.doesNotMatch(supervisor, /StartServer|StopServer|StartUi|StopUi/, "no command names a fixed child");
      const dispatch = functionBody(supervisor, "engine_main");
      assert.match(dispatch, /ctl\.hold\(\)/, "an operator command sets that controller's hold, the flag the reconcile reads");

      // Nothing clears a hold but the row disappearing — the retire path.
      const clears = [...supervisor.matchAll(/held\.store\(\s*(\w+)/g)].map((m) => m[1]);
      assert.deepEqual(clears, ["true"], "a hold is only ever SET; no path clears it, so a tick cannot");
    },
  },
  {
    name: "arch/126 FF-12606: the reconcile is a PURE function in `crates/core`, cargo-tested where the lane actually runs, and the shell holds no reconcile decision of its own",
    run: async () => {
      if (!(await dirExists(DESKTOP_DIR))) return;
      const sources = await rustSources();
      const supervision = sources.get(path.relative(repoRoot, CORE_SUPERVISION));
      const supervisor = sources.get(path.relative(repoRoot, SHELL_SUPERVISOR));

      const reconcile = functionBody(supervision, "reconcile");
      assert.ok(reconcile.length > 0, "the reconcile is a named function in the core crate");
      for (const [what, pattern] of [
        ["reads no clock", /SystemTime|Instant::|now\(\)/],
        ["spawns nothing", /Command::|spawn\(/],
        ["opens no file", /\bfs::|File::|read_to_string/],
      ]) {
        assert.doesNotMatch(reconcile, pattern, `the reconcile ${what}`);
      }

      // Its INPUT carries no exit code, no failure reason and no scope — the property
      // that makes an exit-code rule unaddable rather than merely absent.
      const live = structBody(supervision, "LiveController");
      assert.ok(live.length > 0, "the reconcile's live-controller input was found");
      assert.deepEqual(
        [...live.matchAll(/pub (\w+)\s*:/g)].map((m) => m[1]).sort(),
        ["desired", "held", "id"],
        "the plan is told the id, whether the child is desired and whether it is held, and nothing else"
      );

      // The decision lives where `cargo test` reaches it — asserted off the manifest,
      // because `crates/app` is EXCLUDED from the workspace and a test written beside the
      // spawning code would never run.
      const manifest = await readFile(WORKSPACE_MANIFEST, "utf8");
      assert.match(manifest, /members\s*=\s*\[[^\]]*"crates\/core"/, "the cargo lane's workspace includes crates/core");
      assert.match(manifest, /exclude\s*=\s*\[[^\]]*"crates\/app"/, "and excludes crates/app, where nothing would run a test");
      assert.match(supervision, /#\[cfg\(test\)\]/, "the reconcile's tests sit beside it, in the crate that runs");
      assert.match(supervision, /fn the_plan_for_one_supplied_declaration_id/, "and they drive the plan's table");

      // The shell APPLIES a plan; it decides none.
      assert.doesNotMatch(supervisor, /\bfn\s+reconcile\b/, "the shell holds no reconcile of its own");
      assert.match(supervisor, /reconcile\(rows, &live\)/, "it calls the core's, on values it hands over");
      assert.match(supervisor, /use mesh_desktop_core::supervision::\{[\s\S]{0,240}reconcile/, "imported from the core crate");
    },
  },
  {
    name: "arch/126 FF-12606: ONE struct describes a supervised child, ONE function spawns one, and every spawn it makes joins the Job Object with the working directory the child itself carries",
    run: async () => {
      if (!(await dirExists(DESKTOP_DIR))) return;
      const sources = await rustSources();

      // Task 00: "the Rust source carries no second struct describing a supervised child".
      // A second wire-shaped struct beside `SupervisedChild` is two shapes for one thing,
      // and it is what the opaque-rows-plus-one-accessor idiom exists to avoid — so the
      // test is for the SHAPE, not the name: no other struct in the tree carries both an
      // `argv` and a `cwd`.
      const describing = [];
      for (const [file, source] of sources) {
        for (const match of source.matchAll(/struct\s+(\w+)/g)) {
          const body = blockAfter(source, match.index);
          if (/\bargv\s*:/.test(body) && /\bcwd\s*:/.test(body)) describing.push(`${file}:${match[1]}`);
        }
      }
      assert.deepEqual(
        describing,
        [`${path.relative(repoRoot, CORE_SUPERVISION)}:SupervisedChild`],
        `exactly one struct describes a supervised child, got: ${JSON.stringify(describing)}`
      );

      // Task 02: "one spawn site, and every child joins the same Job Object".
      const supervisor = sources.get(path.relative(repoRoot, SHELL_SUPERVISOR));
      const spawners = [];
      for (const [file, source] of sources) {
        for (const match of source.matchAll(/(?:async\s+)?fn\s+(\w+)/g)) {
          const body = blockAfter(source, match.index);
          if (/\bctl\.spec\b/.test(body) && /\.spawn\(\)/.test(body)) spawners.push(`${file}:${match[1]}`);
        }
      }
      assert.deepEqual(
        spawners,
        [`${path.relative(repoRoot, SHELL_SUPERVISOR)}:supervise_child`],
        `exactly one function spawns a supervised child, got: ${JSON.stringify(spawners)}`
      );

      const spawn = functionBody(supervisor, "supervise_child");
      assert.match(spawn, /assign_to_job\(&job, &child\)/, "it assigns every child it spawns to the Job Object");
      // The working directory comes from the child's own `cwd` and from NOWHERE else — no
      // install-dir default, no `process` cwd, no fallback. `spawn.cwd` is the form's
      // field, which `form_child_spawn` fills from the child alone.
      const currentDirCalls = [...spawn.matchAll(/current_dir\(([^)]*)\)/g)].map((m) => m[1].trim());
      assert.deepEqual(
        currentDirCalls,
        ["dir"],
        "one working-directory call, and its argument is the spawn form's own value"
      );
      assert.match(spawn, /if let Some\(dir\) = &spawn\.cwd/, "and that value is the child's `cwd`, set only when the child carries one");

      // The spawn program is a resolved VALUE, never a bare name — depended on from
      // `acd-desktop-trusted-spawn`, and asserted here only as "still the form's program".
      assert.match(spawn, /Command::new\(&spawn\.program\)/, "the program is the resolved path the core's spawn form carries");
    },
  },
  {
    name: "arch/126 FF-12606: ONE poll interval and no second cadence — the role latch still starts the server once, a declaration row never does, and the UI daemon is still started immediately",
    run: async () => {
      if (!(await dirExists(DESKTOP_DIR))) return;
      const sources = await rustSources();
      const supervisor = sources.get(path.relative(repoRoot, SHELL_SUPERVISOR));

      // ONE interval. A second `tokio::time::interval` is the second cadence 36/ADR-004
      // forbids and 126/ADR-005 §2 gets the same effect without.
      const intervals = [...supervisor.matchAll(/tokio::time::interval\(/g)];
      assert.equal(intervals.length, 1, `the shell constructs exactly one poll interval, found ${intervals.length}`);
      for (const [file, source] of sources) {
        if (file === path.relative(repoRoot, SHELL_SUPERVISOR)) continue;
        assert.doesNotMatch(source, /tokio::time::interval\(/, `${file} constructs no second interval`);
      }

      // The flag rides that ONE interval's tick rather than a loop of its own.
      const poll = functionBody(supervisor, "poll_loop");
      assert.ok(poll.length > 0, "the poll loop was found");
      assert.match(poll, /FleetDataCommand::for_tick\(tick\)/, "the declarations flag is a per-tick decision on the existing cadence");
      assert.match(poll, /interval\.tick\(\)\.await/, "and it rides that interval's tick");

      // The server is started once by the ROLE LATCH, and by nothing else — in particular
      // never by a declaration row, which the reconcile could not name anyway (the reserved
      // ids are its blind spot) but which is asserted here as the shell's property too.
      const latchStarts = [...poll.matchAll(/set_desired\(true\)/g)];
      assert.equal(latchStarts.length, 1, "the poll starts exactly one child, once");
      assert.match(poll, /if !server\.held\(\)[\s\S]{0,120}server\.hold\(\)/, "and it latches, so a manual Stop is never overridden by the next poll");

      // The UI daemon is still started immediately, at engine start, off no poll at all.
      const engine = functionBody(supervisor, "engine_main");
      assert.match(
        engine,
        /ui\.desired\.store\(true, Ordering::SeqCst\)/,
        "the user-interface daemon is still started immediately"
      );
      assert.match(engine, /SupervisedChild::mesh_ui\(\)/, "from the seeded daemon, not from a supplied row");
      assert.match(engine, /SupervisedChild::mesh_serve\(\)/, "and the server is seeded too, never supplied");
    },
  },
  {
    name: "arch/126 ADR-005 §6 (AMENDED): a reconcile runs only on an ANSWER — an unreadable store and an older aof both leave the supervised set alone rather than stopping everything",
    run: async () => {
      if (!(await dirExists(DESKTOP_DIR))) return;
      const sources = await rustSources();
      const status = sources.get(path.join("app", "desktop", "crates", "core", "src", "status.rs"));
      const supervisor = sources.get(path.relative(repoRoot, SHELL_SUPERVISOR));

      // `ok` is READ, not merely carried — `{ ok: false, rows: [] }` and
      // `{ ok: true, rows: [] }` are byte-identical to a parser that ignores it.
      assert.match(structBody(status, "Declarations"), /\bpub ok\s*:\s*bool/, "the key's `ok` is modelled");
      assert.match(status, /pub fn declarations_answered\(&self\)[\s\S]{0,160}self\.declarations\.ok/, "and exposed as the question a reconcile must ask first");

      // The poll GATES the reconcile on it.
      const poll = functionBody(supervisor, "poll_loop");
      assert.match(
        poll,
        /if status\.declarations_answered\(\)/,
        "the supplied set is taken only from a document that answered"
      );
      // And there is exactly one place a reconcile is reached at all, so the gate cannot be
      // bypassed by a second caller.
      assert.equal(
        [...supervisor.matchAll(/apply_plan\(/g)].length,
        2,
        "the plan is applied at one call site, from its one definition"
      );
    },
  },
  {
    name: "arch/126 FF-12606: self-check — a planted exit-code rule, a second role-conditioned start, a bare `loop` decision token and a per-child signal field each trip their OWN detector (non-vacuous)",
    run: async () => {
      // RED PROBE 1 — a second role-conditioned branch that starts a child.
      const planted = 'if is_control_node { server.set_desired(true); }\nif is_control_node { ui.set_desired(true); }\n';
      assert.equal(
        roleConditionedBranches(planted).filter((b) => b.startsAChild).length,
        2,
        "a second role-conditioned start is seen — the exemption cannot arrive twice silently"
      );
      assert.equal(
        roleConditionedBranches('if is_control_node { Role::Control } else { Role::Worker }').filter((b) => b.startsAChild).length,
        0,
        "a role BADGE read is not a set selection"
      );

      // RED PROBE 2 — `loop` as a decision word rather than the admitted verb's name.
      assert.ok(isAdmittedLoopToken('argv: &["work", '), "the admitted argv literal reads as admitted");
      assert.ok(isAdmittedLoopToken('vec!["work".to_string(), '), "including in its owned form");
      assert.ok(!isAdmittedLoopToken('if kind == '), "a `kind == \"loop\"` decision does NOT");
      assert.ok(!isAdmittedLoopToken('match phase { '), "nor a match arm");

      // RED PROBE 3 — a per-child signal field returning to the shared state.
      const withField = 'pub struct SupervisorState {\n  pub server_signal: &\'static str,\n  pub signals: BTreeMap<String, &\'static str>,\n}\n';
      assert.match(structBody(withField, "SupervisorState"), /\bserver_signal\s*:/, "a planted per-child field is seen");

      // RED PROBE 4 — an exit-code rule reaching the plan's input.
      const withCode = "pub struct LiveController {\n  pub id: String,\n  pub desired: bool,\n  pub held: bool,\n  pub exit_code: i32,\n}\n";
      assert.deepEqual(
        [...structBody(withCode, "LiveController").matchAll(/pub (\w+)\s*:/g)].map((m) => m[1]).sort(),
        ["desired", "exit_code", "held", "id"],
        "a planted exit code in the reconcile's input is seen — the field list is the assertion"
      );

      // The block reader itself is honest about nesting.
      assert.equal(blockAfter("if x { a { b } c }", 0), "{ a { b } c }", "the block reader matches braces rather than the first close");
      assert.equal(functionBody("fn f() { 1 }\nfn g() { 2 }", "g"), "{ 2 }", "and finds the function it was asked for");
    },
  },
];
