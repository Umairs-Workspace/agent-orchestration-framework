// Traceability wiring for milestone 49 / story 07
// tasks/00_the-bundle-wires-claude-session-hooks.feature — "the bundle wires the
// Claude session lifecycle, so a workspace aof provisioned records Claude sessions
// the way it already records Codex ones".
//
// WHY A SUITE OF ITS OWN. The feature's own "WHERE IT LANDS" note sanctions one
// ("If a NEW suite is created it MUST be registered in scripts/test.mjs"), and it is
// registered there. `test/mesh/mesh-assistant-hook-wiring.test.mjs` is m38/story-00 task
// 05's traceability file and stays that; `test/bundle/bundle.test.mjs` keeps the membership
// COUNTS. This file owns the eight scenarios of THIS task and nothing else.
//
// WHAT IS DRIVEN, NOT ASSERTED AS A STRING. A wiring story whose invocation was never
// executed ships a typo, so scenarios 5, 7 and 8 read the command string OFF the
// bundle member and SPAWN it through the real CLI (`src/cli.mjs`) with a hook-shaped
// payload on stdin — never a hand-typed argv, and never a re-implementation of the
// verb. Scenarios 1, 3 and 4 drive the REAL co-authored settings merge
// (`applyClaudeSettingsMerge`) against the REAL bundle descriptor, with a project
// config that declares NO hooks — so a declaration that appears can only have come
// from the bundle (the shape test/bundle/artifact-sync-enqueue-hook.test.mjs uses;
// test/bundle/claude-settings-merge.test.mjs is deliberately blind here, it passes
// `bundleHooks: []`).
//
// ISOLATION. Every scenario that writes a settings file or a session record runs in a
// fresh temp workspace under a fresh AOF_GLOBAL_HOME — the child CLI's env pins it
// explicitly, and scenario 5 asserts the operator's REAL global mesh store never saw
// the fixture id. No server is started and no port is bound anywhere in this file.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, readFile, writeFile, stat, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readDescriptor, loadBundle, loadBundleHooks, renderBundleOutputs } from "../../src/work/bundle.mjs";
import { applyClaudeSettingsMerge, AOF_HOOK_MARKER } from "../../src/claude-settings.mjs";
import { bundledFrozenSet, compileFrozenSet } from "../../src/frozen-set.mjs";
import { readSessionRecordsForNode } from "../../src/mesh/session.mjs";
import { readLiveSessions } from "../../src/mesh/presence.mjs";
import { buildSessionIndex } from "../../src/global-mesh-query.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { defaultGlobalWorkspaceDir } from "../../src/paths.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "src", "cli.mjs");
const bundleHooksDir = path.join(repoRoot, "src", "bundle", "hooks");

// The three members this story adds, and the codex sibling occupying the same
// lifecycle POSITION. `mirrorsExactly: false` on the third row is the measured,
// DECIDED divergence (the codex third member is `Stop → aof session ping`, so
// "mirror the codex three exactly" and the PO's `start|ping|end` list cannot both
// hold) — pinned as data so it can never become accidental.
const MEMBER_ROWS = [
  {
    case: "a session opens",
    id: "claude-session-start",
    event: "SessionStart",
    verb: "start",
    codexSibling: "codex-session-start",
    codexSiblingEvent: "SessionStart",
    codexSiblingCommand: "aof session start --assistant codex",
    mirrorsExactly: true,
  },
  {
    case: "the operator sends a prompt",
    id: "claude-session-prompt-ping",
    event: "UserPromptSubmit",
    verb: "ping",
    codexSibling: "codex-session-prompt-ping",
    codexSiblingEvent: "UserPromptSubmit",
    codexSiblingCommand: "aof session ping --assistant codex",
    mirrorsExactly: true,
  },
  {
    case: "the session closes",
    id: "claude-session-end",
    event: "SessionEnd",
    verb: "end",
    codexSibling: "codex-session-stop-ping",
    codexSiblingEvent: "Stop",
    codexSiblingCommand: "aof session ping --assistant codex",
    mirrorsExactly: false,
  },
];

const CLAUDE_SESSION_MEMBER_IDS = MEMBER_ROWS.map((row) => row.id);
const CODEX_SESSION_MEMBER_IDS = MEMBER_ROWS.map((row) => row.codexSibling);

// The codex members' own bundle files, pinned VERBATIM (scenario 3's "byte-identical
// to before this story"). `.gitattributes` pins `src/bundle/** text eol=lf`, so this
// is a true byte pin on every platform. It is shrink-only in effect: any edit to a
// codex session hook file fails here naming m49/07, which is exactly the guard the
// scenario asks for — this story does not touch them.
const CODEX_HOOK_FILE_BYTES = {
  "codex-session-start.json": '{\n  "event": "SessionStart",\n  "matcher": "startup|resume|clear",\n  "type": "command",\n  "command": "aof session start --assistant codex"\n}\n',
  "codex-session-prompt-ping.json": '{\n  "event": "UserPromptSubmit",\n  "type": "command",\n  "command": "aof session ping --assistant codex"\n}\n',
  "codex-session-stop-ping.json": '{\n  "event": "Stop",\n  "type": "command",\n  "command": "aof session ping --assistant codex"\n}\n',
};

// ------------------------------------------------------------------ helpers ----

function descriptorMember(id) {
  return readDescriptor().members.find((member) => member.id === id) ?? null;
}

// The member's declaration as the LOADER hands it to the settings merge — never a
// re-read of the raw file, so the test and production read the same object.
function bundleHook(id) {
  return loadBundleHooks().find((hook) => hook.id === id) ?? null;
}

// THE DECLARED INVOCATION, read off the member rather than typed. Everything that
// runs a session verb below goes through this, so a typo in the shipped hook is a
// red test rather than a silent no-op in every provisioned workspace.
function declaredCommand(id) {
  const hook = bundleHook(id);
  assert.ok(hook != null, `bundle declares a hook member "${id}"`);
  return hook.command;
}

function lf(text) {
  return String(text).replaceAll("\r\n", "\n");
}

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// A workspace directory with a REAL aof config (a pinned nodeId, so the record leaf
// is deterministic) plus its own throwaway global home.
async function makeWorkspace(label) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), `aof-m49s07-${label}-`));
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(home, { recursive: true });
  const config = { name: "fixture-repo", work: { dir: "./wiki/work" }, mesh: { nodeId: "node-m49s07" } };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return { tmp, root, home, nodeId: "node-m49s07" };
}

// Run a declared hook invocation THROUGH THE REAL CLI. The command string is split
// into argv; `aof` is asserted to be the program (the hook declares a bare
// executable, never a shell string) and the remaining argv is handed to this repo's
// own `src/cli.mjs`. Returns { status, stdout }.
function runDeclaredInvocation(command, { workspace, payload }) {
  const argv = String(command).trim().split(/\s+/);
  assert.equal(argv[0], "aof", `the declared invocation runs the \`aof\` program: ${command}`);
  const env = { ...process.env, AOF_GLOBAL_HOME: workspace.home };
  delete env.CLAUDE_SESSION_ID;
  let status = 0;
  let stdout = "";
  try {
    stdout = execFileSync(process.execPath, [cliPath, ...argv.slice(1)], {
      cwd: workspace.root,
      env,
      input: typeof payload === "string" ? payload : JSON.stringify(payload),
      encoding: "utf8",
    });
  } catch (error) {
    status = typeof error?.status === "number" ? error.status : 1;
    stdout = `${error?.stdout ?? ""}${error?.stderr ?? ""}`;
  }
  return { status, stdout };
}

async function workspaceHandle(workspace) {
  return loadWorkspace(workspace.root, undefined, { env: { AOF_GLOBAL_HOME: workspace.home } });
}

async function sessionRecords(workspace) {
  return readSessionRecordsForNode(await workspaceHandle(workspace), workspace.nodeId);
}

// Every aof-marked entry installed on one event, with the group that carries it.
function aofEntriesOn(settings, event) {
  const groups = Array.isArray(settings?.hooks?.[event]) ? settings.hooks[event] : [];
  const found = [];
  for (const group of groups) {
    for (const entry of Array.isArray(group?.hooks) ? group.hooks : []) {
      if (entry != null && typeof entry === "object" && Object.prototype.hasOwnProperty.call(entry, AOF_HOOK_MARKER)) {
        found.push({ group, entry });
      }
    }
  }
  return found;
}

async function readSettingsFile(dir) {
  return JSON.parse(await readFile(path.join(dir, ".claude", "settings.json"), "utf8"));
}

// TECH_DEBT 24: LINE comments first, BLOCK comments second. The other order lets a
// line comment containing `/*` eat the rest of the file, which on an absence sweep is
// a silent PASS.
function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

async function srcModules(dir = path.join(repoRoot, "src"), acc = []) {
  for (const name of (await readdir(dir, { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "bundle") continue; // shipped assets, not src code
      await srcModules(full, acc);
    } else if (name.isFile() && full.endsWith(".mjs")) {
      acc.push(full);
    }
  }
  return acc;
}

// Claude Code's SessionStart matcher semantics: an ABSENT or EMPTY matcher admits
// every source; otherwise the matcher is a regular expression over the source token.
// Asserted anchored (the strict reading) — both candidate matchers in this tree
// (`""` and `startup|resume|clear`) admit the pinned floor under either reading, so
// the strict one is the honest test.
function matcherAdmits(matcher, source) {
  if (matcher == null || matcher === "") return true;
  return new RegExp(`^(?:${matcher})$`).test(source);
}

// Every `command` the codex door renders, with the event it renders under.
// `.codex/hooks.json` is `{ hooks: { <event>: [ { matcher?, hooks: [ { type, command } ] } ] } }`
// — a WHOLE-FILE render that carries NO member id anywhere (there is no `aofManaged`
// on this door; that marker belongs to the co-authored claude merge). That is exactly
// why the clauses below read the rendered DOCUMENT and never an id.
function codexDoorCommands(document) {
  const out = [];
  for (const [event, groups] of Object.entries(document?.hooks ?? {})) {
    for (const group of Array.isArray(groups) ? groups : []) {
      for (const entry of Array.isArray(group?.hooks) ? group.hooks : []) {
        if (typeof entry?.command === "string") out.push({ event, command: entry.command });
      }
    }
  }
  return out;
}

// codexDoorViolations(document) — THE DETECTOR, fed BOTH the shipped render and the
// plant below so it is shown to fire and shown to stay quiet (a detector only ever
// shown quiet is one mutation from asserting nothing).
//
// F-49-07-g: the clauses this replaces could not fail. `!codexText.includes(<member
// id>)` is unfalsifiable on a door that emits no ids at all; and the `||` clause was
// rescued by its own second disjunct, because the codex sibling's `--assistant codex`
// command is legitimately present whether or not a bare one leaked beside it. QA
// proved it by setting `claude-session-start` to `runtimes: ["claude","codex"]` — a
// real leak of a bare `aof session start` into the codex door — and scenario 3 PASSED.
//
// Three independent clauses over the rendered document:
//   (a) `SessionEnd` is CLAUDE'S EVENT ALONE. No codex member declares it, so its
//       presence on this door means a claude member leaked. (`SessionStart` and
//       `UserPromptSubmit` are shared event NAMES and cannot be tested by presence.)
//   (b) EVERY rendered `aof session …` command names `--assistant codex`. This is the
//       clause that catches a leak onto a SHARED event, which (a) structurally cannot.
//       A bare invocation here would write `claude-code` records from a codex session.
//   (c) EXACTLY THREE `aof session` commands are rendered — the codex three. A leak
//       that somehow satisfied (a) and (b) still changes the count.
function codexDoorViolations(document) {
  const problems = [];
  if (document?.hooks?.SessionEnd != null) {
    problems.push("`.codex/hooks.json` declares SessionEnd — no codex member declares that event, so a claude session member leaked into the codex door");
  }
  const commands = codexDoorCommands(document);
  for (const { event, command } of commands) {
    if (!command.startsWith("aof session ")) continue;
    if (!command.endsWith("--assistant codex")) {
      problems.push(`\`.codex/hooks.json\` renders \`${command}\` under ${event} — an \`aof session\` invocation on the codex door that does not name \`--assistant codex\` writes a claude-code-labelled record from a codex session`);
    }
  }
  const sessionCommands = commands.filter(({ command }) => command.startsWith("aof session "));
  if (sessionCommands.length !== 3) {
    problems.push(`\`.codex/hooks.json\` renders ${sessionCommands.length} \`aof session\` commands (${sessionCommands.map((c) => `${c.event}:${c.command}`).join(", ")}) — the codex door carries exactly THREE, the codex session members`);
  }
  return problems;
}

// The REAL codex render of a hook set. `hooks` defaults to the shipped bundle's; the
// plant hands a mutated COPY, so nothing on disk is ever touched.
function renderCodexDoor(hooks, targetDir) {
  const bundle = loadBundle();
  const outputs = renderBundleOutputs({ ...bundle, hooks: hooks ?? bundle.hooks }, { runtimes: ["codex"], targetDir });
  const output = outputs.find((candidate) => String(candidate.path).replaceAll("\\", "/").endsWith(".codex/hooks.json"));
  return { output, document: output == null ? null : JSON.parse(output.content) };
}

export const bundleClaudeSessionHookTests = [
  // ════════════════════════════════════════════════════════════════════════
  // SCENARIO 1 — a freshly provisioned workspace comes out with the Claude
  // session lifecycle wired
  // ════════════════════════════════════════════════════════════════════════
  {
    name: "m49/07 scenario 1 — a freshly provisioned workspace comes out with the Claude session lifecycle wired",
    run: async () => {
      const workspace = await makeWorkspace("provision");
      try {
        assert.equal(existsSync(path.join(workspace.root, ".claude", "settings.json")), false, "the workspace has no `.claude/settings.json` of its own");

        // The REAL merge, with a project config declaring NO hooks — so anything
        // that appears came from the bundle alone.
        const result = await applyClaudeSettingsMerge(workspace.root, { name: "fresh" });
        assert.equal(result.action, "created", "the merge created the settings file");

        const settings = await readSettingsFile(workspace.root);
        assert.ok(settings != null && typeof settings === "object", "`.claude/settings.json` exists and parses as JSON");

        for (const row of MEMBER_ROWS) {
          const entries = aofEntriesOn(settings, row.event);
          assert.equal(entries.length, 1, `exactly one aof-marked entry under ${row.event}`);
          assert.equal(entries[0].entry.command, `aof session ${row.verb}`, `${row.event} invokes \`aof session ${row.verb}\``);
        }

        // ADDS members, replaces none: both PostToolUse consumers are installed.
        const postToolUse = aofEntriesOn(settings, "PostToolUse");
        assert.equal(postToolUse.length, 2, "artifact-sync and run-heartbeat PostToolUse entries are present");
        const artifact = postToolUse.find(({ entry }) => entry[AOF_HOOK_MARKER] === "claude-artifact-sync");
        const heartbeat = postToolUse.find(({ entry }) => entry[AOF_HOOK_MARKER] === "claude-run-heartbeat");
        assert.equal(artifact.group.matcher, "Write|Edit|NotebookEdit", "artifact-sync keeps its matcher");
        assert.deepEqual(artifact.entry.args, ["${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/artifact-sync-enqueue.mjs"]);
        assert.equal(heartbeat.group.matcher, ".*", "run heartbeat observes every completed tool");
        assert.deepEqual(heartbeat.entry.args, ["${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/run-heartbeat-enqueue.mjs"]);
      } finally {
        await rm(workspace.tmp, { recursive: true, force: true });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // SCENARIO 2 (Scenario Outline) — one test per Examples row
  // ════════════════════════════════════════════════════════════════════════
  ...MEMBER_ROWS.map((row) => ({
    name: `m49/07 scenario 2 [${row.case}] — ${row.id}: ${row.event} → \`aof session ${row.verb}\`, claude-only, marked, codex sibling ${row.codexSibling}`,
    run: async () => {
      const member = descriptorMember(row.id);
      assert.ok(member != null, `the descriptor declares "${row.id}"`);
      assert.equal(member.kind, "hook", `${row.id} is a hook member`);

      const hook = bundleHook(row.id);
      assert.equal(hook.event, row.event, `${row.id} declares event ${row.event}`);
      assert.deepEqual(hook.runtimes, ["claude"], `${row.id} declares runtimes exactly ["claude"]`);

      // ONE `aof session <verb>` call and nothing else.
      assert.equal(hook.command, `aof session ${row.verb}`, `${row.id} invokes \`aof session ${row.verb}\``);
      assert.ok(/^aof session (start|ping|end)$/.test(hook.command), "a single unchained `aof session <verb>` invocation");
      assert.ok(!/[&|;<>`$(){}[\]*?~#!\n]/.test(hook.command), "no shell metacharacter of any kind in the invocation");
      assert.equal(hook.type, "command", `${row.id} is an exec-form command hook`);

      // The entry the MERGE installs carries the ownership marker set to the member id.
      const workspace = await makeWorkspace("marker");
      try {
        await applyClaudeSettingsMerge(workspace.root, { name: "fresh" });
        const settings = await readSettingsFile(workspace.root);
        const entries = aofEntriesOn(settings, row.event);
        assert.equal(entries.length, 1, `one installed entry on ${row.event}`);
        assert.equal(entries[0].entry[AOF_HOOK_MARKER], row.id, `the installed entry is marked \`${AOF_HOOK_MARKER}: "${row.id}"\``);
      } finally {
        await rm(workspace.tmp, { recursive: true, force: true });
      }

      // The codex sibling for the same lifecycle POSITION — named, and not touched.
      const sibling = bundleHook(row.codexSibling);
      assert.ok(sibling != null, `the codex sibling "${row.codexSibling}" exists`);
      assert.equal(sibling.event, row.codexSiblingEvent, `${row.codexSibling} still declares event ${row.codexSiblingEvent}`);
      assert.equal(sibling.command, row.codexSiblingCommand, `${row.codexSibling} still invokes \`${row.codexSiblingCommand}\``);
      assert.deepEqual(sibling.runtimes, ["codex"], `${row.codexSibling} is codex-only`);

      // The DECIDED divergence, pinned so it cannot become accidental: rows 1-2
      // mirror their sibling's event exactly; row 3 deliberately does not.
      if (row.mirrorsExactly) {
        assert.equal(hook.event, sibling.event, `${row.id} mirrors ${row.codexSibling}'s event exactly`);
      } else {
        assert.notEqual(
          hook.event,
          sibling.event,
          `${row.id} DIVERGES from ${row.codexSibling} by decision (SessionEnd → \`end\` REMOVES the record; the codex sibling's Stop → \`ping\` only re-pings one). If this ever becomes an equality, the divergence was "harmonised" without a ruling.`,
        );
      }
    },
  })),

  // ════════════════════════════════════════════════════════════════════════
  // SCENARIO 3 — the runtime split, in both directions
  // ════════════════════════════════════════════════════════════════════════
  {
    name: "m49/07 scenario 3 — the new members are claude-only, and the codex three are left exactly as they were",
    run: async () => {
      const workspace = await makeWorkspace("split");
      try {
        for (const id of CLAUDE_SESSION_MEMBER_IDS) {
          assert.ok(bundleHook(id) != null, `the bundle carries the claude session member ${id}`);
        }

        // ── the codex door: the REAL render of `.codex/hooks.json` ──
        const { output: codexHooksOutput, document: codexHooks } = renderCodexDoor(null, workspace.root);
        assert.ok(codexHooksOutput != null, "the codex runtime config renders a `.codex/hooks.json`");

        // THE SHIPPED DOOR IS CLEAN — the detector shown QUIET on the real tree.
        assert.deepEqual(codexDoorViolations(codexHooks), [], ".codex/hooks.json carries NONE of the three claude session members");

        // AND THE DETECTOR IS SHOWN TO FIRE, on QA's own plant (F-49-07-g): the ONE
        // mutation that genuinely leaks a bare claude invocation into the codex door —
        // `claude-session-start` declaring `runtimes: ["claude","codex"]`. The previous
        // clauses here PASSED on exactly this input, which is what made them no gate.
        // A synthesized in-memory copy; the real descriptor is never written.
        const plantedHooks = loadBundle().hooks.map((hook) => (
          hook.id === "claude-session-start" ? { ...hook, runtimes: ["claude", "codex"] } : hook
        ));
        const planted = renderCodexDoor(plantedHooks, workspace.root);
        assert.notEqual(planted.output.content, codexHooksOutput.content, "the plant LANDED — the codex door really renders differently with a claude member declared for codex");
        const plantedProblems = codexDoorViolations(planted.document);
        assert.ok(plantedProblems.length > 0, "the detector FIRES on a claude session member leaked into the codex door");
        assert.ok(
          plantedProblems.some((problem) => problem.includes("aof session start")),
          `…and it names the bare invocation it found, not merely a count — got ${JSON.stringify(plantedProblems)}`,
        );

        // …and all three codex members survive with their events and commands.
        const flatCodex = JSON.stringify(codexHooks);
        for (const row of MEMBER_ROWS) {
          assert.ok(flatCodex.includes(row.codexSiblingEvent), `.codex/hooks.json still declares ${row.codexSiblingEvent}`);
          assert.ok(flatCodex.includes(row.codexSiblingCommand), `.codex/hooks.json still invokes \`${row.codexSiblingCommand}\``);
        }
        assert.ok(flatCodex.includes("Stop"), "the third codex member keeps its `Stop` event");

        // ── the claude door: the REAL surgical merge on the same workspace ──
        await applyClaudeSettingsMerge(workspace.root, { name: "fresh" });
        const settingsText = await readFile(path.join(workspace.root, ".claude", "settings.json"), "utf8");
        for (const id of CODEX_SESSION_MEMBER_IDS) {
          assert.ok(!settingsText.includes(id), `.claude/settings.json contains NONE of the codex session members (found ${id})`);
        }
        assert.ok(!settingsText.includes("--assistant codex"), ".claude/settings.json never carries a `--assistant codex` invocation");
        const settings = JSON.parse(settingsText);
        assert.equal(Array.isArray(settings.hooks?.Stop) ? settings.hooks.Stop.length : 0, 0, "the codex-only `Stop` event is not installed into the claude door");

        // ── the codex members' own bundle files are byte-identical ──
        for (const [file, expected] of Object.entries(CODEX_HOOK_FILE_BYTES)) {
          const actual = lf(await readFile(path.join(bundleHooksDir, file), "utf8"));
          assert.equal(
            sha256(actual),
            sha256(expected),
            `src/bundle/hooks/${file} is byte-identical to before m49/07 — this story adds members, it edits none. If this is red, a codex session hook was changed; that is a separate, unrelated behaviour change and it does not belong in this milestone's last-landing story.`,
          );
        }
      } finally {
        await rm(workspace.tmp, { recursive: true, force: true });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // SCENARIO 4 — co-authorship and idempotence
  // ════════════════════════════════════════════════════════════════════════
  {
    name: "m49/07 scenario 4 — applying twice adds nothing, and an operator's own entry on the same event survives untouched",
    run: async () => {
      const workspace = await makeWorkspace("coauthor");
      try {
        // A co-authored file: the operator's OWN unmarked SessionStart entry, plus
        // the top-level keys a real one carries.
        const operatorSessionStart = {
          matcher: "startup",
          hooks: [{ type: "command", command: "my-own-telemetry --on-session-start" }],
        };
        const original = {
          permissions: { deny: ["Bash(rm -rf:*)"] },
          sandbox: { filesystem: { allow: ["./"] } },
          enabledPlugins: { "some-marketplace": ["a-plugin"] },
          hooks: {
            SessionStart: [operatorSessionStart],
            PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "my-own-guard" }] }],
          },
        };
        const settingsPath = path.join(workspace.root, ".claude", "settings.json");
        await mkdir(path.dirname(settingsPath), { recursive: true });
        await writeFile(settingsPath, `${JSON.stringify(original, null, 2)}\n`, "utf8");

        const first = await applyClaudeSettingsMerge(workspace.root, { name: "fresh" });
        assert.equal(first.action, "updated", "the first apply updates the co-authored file");
        const second = await applyClaudeSettingsMerge(workspace.root, { name: "fresh" });
        assert.equal(second.action, "skipped", "the second apply changes nothing");
        assert.equal(second.written, false, "…and writes nothing");

        const settings = await readSettingsFile(workspace.root);

        // Exactly ONE aof-marked entry on each of the three session events.
        for (const row of MEMBER_ROWS) {
          const entries = aofEntriesOn(settings, row.event);
          assert.equal(entries.length, 1, `exactly one aof-marked entry on ${row.event} after two applies`);
          assert.equal(entries[0].entry[AOF_HOOK_MARKER], row.id, `…and it is ${row.id}`);
        }

        // The operator's unmarked SessionStart entry: byte-identical AND still first.
        const sessionStartGroups = settings.hooks.SessionStart;
        assert.equal(JSON.stringify(sessionStartGroups[0]), JSON.stringify(operatorSessionStart), "the operator's own SessionStart entry is byte-identical");
        assert.equal(sessionStartGroups.length, 2, "…and aof's entry was APPENDED beside it, in its own group");

        // Every unrelated top-level key is byte-identical. Permissions are now
        // co-authored array-wise by 55/04: the operator's rule stays first and every
        // declaration-owned rule appends after it, once each.
        //
        // THE AOF-OWNED TAIL IS DERIVED, NOT TYPED. This scenario is about the OPERATOR's
        // rule surviving in its own position; which rules the frozen-set declaration owns
        // is the declaration's business and `test/bundle/frozen-set-compiled.test.mjs`'s census.
        // Typing them here made this suite go red on 61/ADR-005 §3's sixth member for a
        // reason that has nothing to do with what it tests.
        for (const key of ["sandbox", "enabledPlugins"]) {
          assert.equal(JSON.stringify(settings[key]), JSON.stringify(original[key]), `top-level \`${key}\` is byte-identical`);
        }
        const declarationOwnedRules = compileFrozenSet(bundledFrozenSet()).permissions.map((entry) => entry.rule);
        assert.ok(declarationOwnedRules.length > 0, "non-vacuity: the declaration really owns some permission denials");
        assert.deepEqual(settings.permissions.deny, ["Bash(rm -rf:*)", ...declarationOwnedRules]);
        assert.equal(JSON.stringify(settings.hooks.PreToolUse[0]), JSON.stringify(original.hooks.PreToolUse[0]), "the operator's PreToolUse group is byte-identical and keeps its position");
        // Story 87 withdrew the `test-isolation` member, so nothing framework-authored
        // joins the operator's own PreToolUse group any more. The assertion is re-aimed to
        // the absence rather than dropped: a re-introduced hook would otherwise land here
        // unnoticed, beside a group this scenario has just proved is byte-identical.
        assert.deepEqual(aofEntriesOn(settings, "PreToolUse"), [], "the framework appends no PreToolUse entry beside the operator's own");

        // A third apply reports no change and rewrites no bytes.
        const beforeStat = await stat(settingsPath);
        const beforeBytes = await readFile(settingsPath, "utf8");
        const third = await applyClaudeSettingsMerge(workspace.root, { name: "fresh" });
        const afterStat = await stat(settingsPath);
        assert.equal(third.action, "skipped", "a third apply reports no change");
        assert.equal(third.written, false, "…writes nothing");
        assert.equal(await readFile(settingsPath, "utf8"), beforeBytes, "…and the bytes on disk are identical");
        assert.equal(afterStat.mtimeMs, beforeStat.mtimeMs, "…the file was not rewritten at all (mtime unchanged)");
      } finally {
        await rm(workspace.tmp, { recursive: true, force: true });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // SCENARIO 5 — the declared invocation really records a session when it runs
  // ════════════════════════════════════════════════════════════════════════
  {
    name: "m49/07 scenario 5 — the declared invocation really records a session when it is run (start records, end removes)",
    run: async () => {
      const workspace = await makeWorkspace("cli");
      const sessionId = `m49s07-${process.pid}-${Date.now()}`;
      try {
        const payload = JSON.stringify({
          session_id: sessionId,
          cwd: workspace.root,
          hook_event_name: "SessionStart",
          source: "startup",
        });

        const started = runDeclaredInvocation(declaredCommand("claude-session-start"), { workspace, payload });
        assert.equal(started.status, 0, `the \`claude-session-start\` invocation exits zero — got ${started.status}: ${started.stdout}`);

        const afterStart = await sessionRecords(workspace);
        assert.equal(afterStart.length, 1, "exactly one session record exists for this node");
        assert.equal(afterStart[0].sessionId, sessionId, "…carrying the payload's session id VERBATIM");
        assert.equal(afterStart[0].repo, "fixture-repo", "…and the workspace's own repo name");

        const ended = runDeclaredInvocation(declaredCommand("claude-session-end"), { workspace, payload });
        assert.equal(ended.status, 0, `the \`claude-session-end\` invocation exits zero — got ${ended.status}: ${ended.stdout}`);

        const afterEnd = await sessionRecords(workspace);
        assert.equal(afterEnd.length, 0, "no session record for that session remains — a closed session leaves, it does not linger");

        // NO RECORD ANYWHERE OUTSIDE THE FRESH AOF_GLOBAL_HOME. Two independent
        // checks: the fixture home is where the store resolved to, and the
        // operator's REAL global mesh store never saw this fixture's unique id.
        assert.equal(
          defaultGlobalWorkspaceDir({ AOF_GLOBAL_HOME: workspace.home }),
          path.resolve(workspace.home),
          "the session store resolves to the fixture's own AOF_GLOBAL_HOME",
        );
        const realSessionsDir = path.join(defaultGlobalWorkspaceDir({}), "mesh", "sessions");
        if (existsSync(realSessionsDir)) {
          const leaked = (await readdir(realSessionsDir)).filter((leaf) => leaf.includes(sessionId));
          assert.deepEqual(leaked, [], `no record leaked into the operator's real global mesh store (${realSessionsDir})`);
        }
        assert.equal(existsSync(path.join(workspace.root, ".aof", "mesh")), false, "and nothing was written into the workspace's own `.aof/` tree");
      } finally {
        await rm(workspace.tmp, { recursive: true, force: true });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // SCENARIO 6 — a session these hooks record is FREE: listed and addressable,
  // and nothing in this story will ever feed it
  // ════════════════════════════════════════════════════════════════════════
  {
    name: "m49/07 scenario 6 — a session these hooks record is FREE: in the index, addressable, `workItem: null`, and no new relay producer",
    run: async () => {
      const workspace = await makeWorkspace("free");
      const sessionId = `m49s07-free-${process.pid}-${Date.now()}`;
      try {
        const payload = JSON.stringify({ session_id: sessionId, cwd: workspace.root, hook_event_name: "SessionStart", source: "startup" });
        const started = runDeclaredInvocation(declaredCommand("claude-session-start"), { workspace, payload });
        assert.equal(started.status, 0, "the recorded session exists to reason about");

        // A live node whose presence carries exactly that session — assembled by the
        // SAME projection the presence publisher uses, never a hand-built row.
        const handle = await workspaceHandle(workspace);
        const sessions = await readLiveSessions(handle, workspace.nodeId);
        assert.equal(sessions.length, 1, "the node's presence carries exactly the recorded session");
        assert.equal(sessions[0].sessionId, sessionId, "…addressed by the id the hook payload carried");

        const nodes = [{ nodeId: workspace.nodeId, freshness: "live", presence: { sessions } }];
        // NO assignment anywhere owns that (nodeId, sessionId) tuple.
        const index = buildSessionIndex({ nodes, assignments: [] });

        assert.equal(index.sessions.length, 1, "the index contains that session");
        const entry = index.lookup(workspace.nodeId, sessionId);
        assert.ok(entry != null, "…addressable by its `(nodeId, sessionId)` tuple");
        assert.equal(entry.sessionId, sessionId, "…resolving to the same session");
        assert.equal(entry.workItem, null, "…and its `workItem` is null — the row a browser reads as having NO PRODUCER");

        // Nothing in this story's diff changes what feeds the relay.
        const producers = [];
        for (const file of await srcModules()) {
          const source = stripComments(await readFile(file, "utf8"));
          const count = (source.match(/\.sendTerminalFrame\(/g) ?? []).length;
          for (let i = 0; i < count; i += 1) producers.push(path.relative(repoRoot, file).replaceAll("\\", "/"));
        }
        assert.deepEqual(
          producers,
          ["src/mesh/launcher.mjs", "src/mesh/launcher.mjs", "src/mesh/launcher.mjs"],
          "the relay has exactly three frame producers in mesh-launcher (fresh execution, terminal bridge, and parked-session resume); this hook story adds none",
        );
      } finally {
        await rm(workspace.tmp, { recursive: true, force: true });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // SCENARIO 7 — one assistant, one spelling
  // ════════════════════════════════════════════════════════════════════════
  {
    name: "m49/07 scenario 7 — a session recorded through the BUNDLED hook carries the SAME assistant label as one recorded through the HAND-WIRED hook",
    run: async () => {
      const workspace = await makeWorkspace("spelling");
      try {
        // Both invocations are READ from their real sources — the bundle member on
        // one side, this repo's own hand-authored `.claude/settings.json` on the
        // other — so a divergence in either is a red test, not a passing tautology.
        //
        // F-49-07-h: the hand-wired side EXCLUDED aof-marked entries explicitly and did not rest
        // on array position, reading the reference out of this repo's own unmarked `SessionStart`
        // block.
        //
        // THAT BLOCK IS GONE, and its removal was the point of milestone 72 / story 03: the
        // unmarked entry was command-EQUIVALENT to the marked one beside it, so `aof session ping`
        // shelled twice on every prompt. 72/ADR-005 §5 records the supersession rather than editing
        // 49/07/00's delivered `.feature`, which is immutable — the criterion's PREMISE (that this
        // repo's settings carry a hand-authored `aof session start`) no longer holds, and a
        // delivered contract is not rewritten to match the tree.
        //
        // THE REPAIR IS TO PIN THE LITERAL, and the two alternatives were both refused on the
        // record. Re-pointing this at the MARKED entry is the bundled-vs-bundled tautology the
        // comment below already forbids — it would assert a string against itself and detect
        // nothing. Guard-if-present is indicted by 72/ADR-005 §2 and TECH_DEBT 36(c): a lane that
        // skips itself when its subject is missing is a lane that reports green on its own absence.
        // The literal is the invocation an editor hook actually fires, and a bundle member that
        // drifts away from it still reds here — which is the whole job of this lane.
        const bundled = declaredCommand("claude-session-start");
        const handWired = "aof session start";
        assert.ok(typeof handWired === "string", "the drift-detection reference for the bundled member is the pinned hand-wired invocation (72/ADR-005 §5)");

        const bundledId = `m49s07-bundled-${process.pid}-${Date.now()}`;
        const handWiredId = `m49s07-handwired-${process.pid}-${Date.now()}`;
        const payloadFor = (id) => JSON.stringify({ session_id: id, cwd: workspace.root, hook_event_name: "SessionStart", source: "startup" });

        const a = runDeclaredInvocation(bundled, { workspace, payload: payloadFor(bundledId) });
        assert.equal(a.status, 0, `the bundled invocation exits zero: ${a.stdout}`);
        const b = runDeclaredInvocation(handWired, { workspace, payload: payloadFor(handWiredId) });
        assert.equal(b.status, 0, `the hand-wired invocation exits zero: ${b.stdout}`);

        const records = await sessionRecords(workspace);
        const bundledRecord = records.find((record) => record.sessionId === bundledId);
        const handWiredRecord = records.find((record) => record.sessionId === handWiredId);
        assert.ok(bundledRecord != null, "the bundled invocation wrote a record");
        assert.ok(handWiredRecord != null, "the hand-wired invocation wrote a record");

        assert.equal(
          bundledRecord.assistant,
          handWiredRecord.assistant,
          `both records carry the identical assistant value — a second spelling of one runtime would split the fleet's own grouping (bundled: ${bundledRecord.assistant}, hand-wired: ${handWiredRecord.assistant})`,
        );
        assert.equal(typeof bundledRecord.assistant, "string", "…and that value is a string");
        assert.ok(bundledRecord.assistant.length > 0, "…a single NON-EMPTY string — never null, never empty");
      } finally {
        await rm(workspace.tmp, { recursive: true, force: true });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // SCENARIO 8 (Scenario Outline) — one test per Examples row
  // ════════════════════════════════════════════════════════════════════════
  ...[
    { case: "a fresh launch", source: "startup" },
    { case: "a resumed conversation", source: "resume" },
    { case: "a cleared conversation", source: "clear" },
  ].map((row) => ({
    name: `m49/07 scenario 8 [${row.case}] — a session that starts with source \`${row.source}\` is admitted by the installed matcher and is recorded`,
    run: async () => {
      const workspace = await makeWorkspace(`matcher-${row.source}`);
      try {
        // The INSTALLED entry from a freshly provisioned workspace — not the
        // descriptor's raw field.
        await applyClaudeSettingsMerge(workspace.root, { name: "fresh" });
        const settings = await readSettingsFile(workspace.root);
        const installed = aofEntriesOn(settings, "SessionStart").find((found) => found.entry[AOF_HOOK_MARKER] === "claude-session-start");
        assert.ok(installed != null, "the freshly provisioned workspace carries the installed SessionStart entry");

        assert.ok(
          matcherAdmits(installed.group.matcher, row.source),
          `the installed matcher (${JSON.stringify(installed.group.matcher)}) admits the \`${row.source}\` source — a narrower matcher than this table is a session the terminals home never sees`,
        );

        // …so `aof session start` is invoked, and a record exists afterwards.
        const sessionId = `m49s07-${row.source}-${process.pid}-${Date.now()}`;
        const result = runDeclaredInvocation(installed.entry.command, {
          workspace,
          payload: JSON.stringify({ session_id: sessionId, cwd: workspace.root, hook_event_name: "SessionStart", source: row.source }),
        });
        assert.equal(result.status, 0, `the invocation the entry declares exits zero: ${result.stdout}`);

        const records = await sessionRecords(workspace);
        assert.equal(records.length, 1, `a session record exists for the \`${row.source}\` session afterwards`);
        assert.equal(records[0].sessionId, sessionId, "…carrying its id");
      } finally {
        await rm(workspace.tmp, { recursive: true, force: true });
      }
    },
  })),
];
