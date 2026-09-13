// Traceability wiring for milestone 48 / story 00
// tasks/00_the-id-ladder.feature — "the routable session id is READ from the
// assistant through one ordered ladder, and never invented".
//
// Every @executable scenario (and every Scenario Outline Examples row) below is
// asserted against the REAL CLI face (src/commands/mesh-session.mjs's
// meshSessionCommand) over a hermetic fixture repo + a fixture AOF_GLOBAL_HOME (no
// real machine state touched) — real fs, in-process, with the ctx seams the module
// already exposes (env / stdinText / now / loadWorkspace / nodeId / cwd). No
// hand-rolled fixture stands in for the CLI and no scenario calls
// startSession/pingSession directly. One test object per scenario, each name tracing
// to feature + scenario. node:assert/strict.
//
// The STRUCTURAL half of this task ("no id GENERATOR exists anywhere on the path") is
// deliberately NOT here — it is the fitness function
// test/arch/session/acd-session-id-never-fabricated.test.mjs (ARCHITECTURE §Fitness #1). This
// file only asserts the OBSERVABLE consequence.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { meshSessionCommand } from "../../../src/commands/mesh/session.mjs";
import { readSessionRecord, readSessionRecordsForNode, sessionRecordPath } from "../../../src/mesh/session.mjs";
import { loadWorkspace } from "../../../src/work.mjs";

const NODE_ID = "node-a";
const NOW = "2026-08-10T12:00:00.000Z";

async function makeFixture() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-session-id-ladder-"));
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const config = { name: "demo", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID } };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const env = { AOF_GLOBAL_HOME: home };
  return { tmp, root, home, env, sessionsDir: path.join(home, "mesh", "sessions"), ws: await loadWorkspace(root, undefined, { env }) };
}

// A ctx that pins cwd/env/nodeId so the CLI face never touches real machine state.
// `env` defaults to a CLAUDE_SESSION_ID-free environment: an ambient one would make
// every "no id on any channel" row a lie.
function ctxFor(fixture, { stdinText = "", claudeSessionId, now = NOW, cwd } = {}) {
  return {
    cwd: cwd ?? fixture.root,
    env: claudeSessionId == null ? {} : { CLAUDE_SESSION_ID: claudeSessionId },
    nodeId: NODE_ID,
    stdinText,
    now: () => now,
    loadWorkspace: (workingDir, config) => loadWorkspace(workingDir, config, { env: fixture.env }),
  };
}

// Drive the REAL command, capturing its envelope off stdout/stderr and its exit code
// (the CLI reports failure through process.exitCode, never by throwing).
async function runCommand(args, ctx) {
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalExitCode = process.exitCode;
  process.exitCode = undefined;
  console.log = (message) => logs.push(message);
  console.error = (message) => errors.push(message);
  try {
    await meshSessionCommand(args, ctx);
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  const exitCode = process.exitCode;
  process.exitCode = originalExitCode;
  let envelope = null;
  try {
    envelope = JSON.parse(logs[logs.length - 1]);
  } catch {
    envelope = null;
  }
  return { logs, errors, exitCode, envelope };
}

const keyFor = (sessionId, workspaceId = "ws-1") => ({ nodeId: NODE_ID, workspaceId, assistant: "claude-code", sessionId });

export const meshSessionIdLadderTests = [
  // ══ Scenario Outline: the first channel that supplies an id wins ══
  {
    name: "mesh-session-id-ladder/00 the first channel that supplies an id wins, and the ones below it do not get a vote (Examples)",
    async run() {
      const rows = [
        { case: "a non-hook caller supplies it directly", flag: "id-flag", payload: null, env: null, stored: "id-flag" },
        { case: "flag beats a payload that disagrees", flag: "id-flag", payload: { session_id: "id-payload" }, env: "id-env", stored: "id-flag" },
        { case: "the real Claude Code hook shape", flag: null, payload: { session_id: "id-payload" }, env: null, stored: "id-payload" },
        { case: "payload beats env when both are present", flag: null, payload: { session_id: "id-payload" }, env: "id-env", stored: "id-payload" },
        { case: "a malformed payload falls through to env", flag: null, payloadText: "not json at all", env: "id-env", stored: "id-env" },
        { case: "a payload with no session_id falls through", flag: null, payload: { cwd: "<the workspace dir>" }, env: "id-env", stored: "id-env" },
        { case: "the env-only channel", flag: null, payload: null, env: "id-env", stored: "id-env" },
      ];
      for (const row of rows) {
        const fixture = await makeFixture();
        try {
          const payload = row.payload?.cwd === "<the workspace dir>" ? { ...row.payload, cwd: fixture.root } : row.payload;
          const stdinText = row.payloadText ?? (payload == null ? "" : JSON.stringify(payload));
          const args = ["start", "--workspace", "ws-1", "--repo", "demo", "--assistant", "claude-code", ...(row.flag == null ? [] : ["--session", row.flag])];
          const { exitCode } = await runCommand(args, ctxFor(fixture, { stdinText, claudeSessionId: row.env }));
          assert.notEqual(exitCode, 1, `${row.case}: the command succeeds`);

          const record = await readSessionRecord(fixture.ws, keyFor(row.stored));
          assert.ok(record, `${row.case}: a record exists under the winning id`);
          assert.strictEqual(record.sessionId, row.stored, `${row.case}: the stored id is exactly ${row.stored}`);

          // "The record was written once — a losing channel neither wrote a second
          // record nor rewrote this one": exactly ONE file exists for this node.
          const all = await readSessionRecordsForNode(fixture.ws, NODE_ID);
          assert.equal(all.length, 1, `${row.case}: exactly one record was written — no losing channel wrote a second`);
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
    },
  },

  // ══ Row 6's own claim, isolated: the id ladder and the F4 cwd derivation are INDEPENDENT ══
  {
    name: "mesh-session-id-ladder/00 a payload can lose the id rung and still resolve the workspace — the ladder and the cwd derivation are independent",
    async run() {
      const fixture = await makeFixture();
      try {
        // The REAL measured payload shape carries session_id AND cwd (RESEARCH §1).
        // Here it carries only `cwd`: the env wins the id rung, and the payload still
        // does the job the F4 fix gave it — deriving workspace/repo from `cwd` with no
        // flags at all.
        const { exitCode } = await runCommand(["start"], ctxFor(fixture, { stdinText: JSON.stringify({ cwd: fixture.root, hook_event_name: "SessionStart" }), claudeSessionId: "id-env" }));
        assert.notEqual(exitCode, 1, "the flagless hook invocation succeeds");

        const records = await readSessionRecordsForNode(fixture.ws, NODE_ID);
        assert.equal(records.length, 1, "exactly one record");
        assert.strictEqual(records[0].sessionId, "id-env", "the env rung supplied the id");
        assert.equal(records[0].repo, "demo", "…while the payload's cwd still resolved the repo");
        assert.ok(typeof records[0].workspaceId === "string" && records[0].workspaceId.length > 0, "…and the workspaceId");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: no channel supplies an id, so the record says so rather than inventing one ══
  {
    name: "mesh-session-id-ladder/00 no channel supplies an id, so the record says so rather than inventing one",
    async run() {
      const fixture = await makeFixture();
      try {
        const first = await runCommand(["start", "--workspace", "ws-1", "--repo", "demo", "--assistant", "claude-code"], ctxFor(fixture));
        assert.notEqual(first.exitCode, 1, "the command succeeds — an anonymous session is a valid session, not a refusal");

        const record = await readSessionRecord(fixture.ws, keyFor(null));
        assert.ok(record, "the record exists");
        assert.ok(Object.hasOwn(record, "sessionId"), "the record on disk has the key `sessionId` PRESENT");
        assert.strictEqual(record.sessionId, null, "its value is exactly `null` — the JSON null");
        for (const forbidden of ["null", "undefined", "", "claude-code", "ws-1", "demo"]) {
          assert.notStrictEqual(record.sessionId, forbidden, `never the string ${JSON.stringify(forbidden)}`);
        }
        assert.equal(typeof record.sessionId, "object", "not a generated UUID and not a hash — a JSON null is an object typeof");

        const second = await runCommand(["start", "--workspace", "ws-1", "--repo", "demo", "--assistant", "claude-code"], ctxFor(fixture, { now: "2026-08-10T12:00:30.000Z" }));
        assert.notEqual(second.exitCode, 1);
        const again = await readSessionRecord(fixture.ws, keyFor(null));
        assert.strictEqual(again.sessionId, null, "running the identical command a second time stores `null` again — an absent id is stable, not a value that varies per invocation");
        const all = await readSessionRecordsForNode(fixture.ws, NODE_ID);
        assert.equal(all.length, 1, "…and it is the SAME record, not a second one keyed by a freshly minted id");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario Outline: a supplied id is stored byte-identical ══
  {
    name: "mesh-session-id-ladder/00 a supplied id is stored byte-identical — no case change, no trim, no hash, no truncation (Examples)",
    async run() {
      const rows = [
        { case: "the real Claude Code UUID shape", id: "3f2b9c14-8a7e-4d61-9f03-1c5ea77b42d9" },
        { case: "mixed case must survive", id: "3F2b9C14-8a7E-4d61-9F03-1c5EA77B42d9" },
        { case: "leading/trailing space is not trimmed", id: "  spaced-id  " },
        { case: "the leaf separator inside the value", id: "weird~id~here" },
        { case: "a long id is not truncated", id: "L".repeat(200), platformBounded: true },
      ];
      for (const row of rows) {
        const fixture = await makeFixture();
        try {
          const args = ["start", "--workspace", "ws-1", "--repo", "demo", "--assistant", "claude-code"];
          const ctx = ctxFor(fixture, { stdinText: JSON.stringify({ session_id: row.id }) });

          if (row.platformBounded) {
            // ───────────────────────────────────────────────────────────────────
            // THE RULED DISCHARGE OF THIS ROW — 48/ADR-011 (R6 + R8), accepted
            // 2026-08-11. NOT an unexplained deviation and NOT a .feature edit:
            // read the ADR as the ruling.
            //
            // R6: the row's CLAIM ("a long id is not truncated") is real and
            // binding; its PREMISE ("any 200-character id is persistable") was never
            // in contract. ADR-002 deliberately put the key in a FILENAME, and a
            // filename is a bounded resource — the bound is on the COMPOSED LEAF,
            // never on any one input, and an id that cannot compose a storable leaf
            // is NOT STORED: never shortened, never hashed, never half-written.
            //
            // MEASURED (2026-08-10, re-derived independently in ADR-011 with the
            // arithmetic agreeing exactly): `writeText` (src/fs.mjs:22) composes its
            // atomic temp as `.tmp-<basename>-<pid>-<Date.now()>-<randomUUID()>` —
            // a constant 62 characters ahead of the real basename — and every
            // filesystem in this fleet (NTFS, ext4, APFS) caps ONE path component at
            // 255. With this fixture's `node-a~ws-1~claude-code~` prefix the budget
            // for the id is 255 − 62 − 29 = 164, and the real producer measures 164
            // OK / 165 refused. Every producer this milestone measured emits a
            // 36-character UUID, so the budget is ~4.5× the real world.
            //
            // R7: the unbounded temp basename is a REAL defect (it silently converts
            // "your target name is legal" into "your name plus 62 must be legal"),
            // it lives in TWO homes (src/fs.mjs:22 and src/lock.mjs:55), and it is
            // OUT OF SCOPE for m48 — 52 dependents on the atomic write path, mid-
            // build, owned by no story. It is TECH_DEBT item 34, with its invariant
            // and both homes written down there. (ADR-011's paste-ready block says
            // "item 29"; that number was already taken, so it landed as 34.)
            //
            // What this row asserts is the CLAIM, in both worlds, exhaustively.
            // ───────────────────────────────────────────────────────────────────
            let failure = null;
            try {
              await runCommand(args, ctx);
            } catch (error) {
              failure = error;
            }
            const records = await readSessionRecordsForNode(fixture.ws, NODE_ID);
            const entries = await readdir(fixture.sessionsDir).catch(() => []);

            // ADR-011 R8 / TIGHTENING 1 — the two worlds are EXHAUSTIVE and
            // EXCLUSIVE. The third world (the command neither threw nor wrote — a
            // swallowed error reported as success) is the WORST outcome available,
            // and the earlier form passed it VACUOUSLY by asserting nothing. It now
            // fails here: `failure == null` OWES exactly one byte-identical record.
            if (failure == null) {
              assert.equal(records.length, 1, "world A (the write succeeded): exactly ONE record exists — a silent no-op is not a success");
              assert.strictEqual(records[0].sessionId, row.id, "world A: the stored id is byte-identical — never truncated");
              assert.equal(records[0].sessionId.length, row.id.length, "world A: same length");
            } else {
              assert.equal(records.length, 0, "world B (the write refused): NO record was written — never a truncated one");
              // ADR-011 R8 / TIGHTENING 2 — assert MEMBERSHIP in the name-too-long
              // family, never one platform's spelling: Windows surfaces this as
              // ENOENT while Linux and macOS surface it as ENAMETOOLONG, so pinning
              // either one ships green here and reds the first time this suite runs
              // on the WSL worker or the Mac.
              assert.ok(
                ["ENAMETOOLONG", "ENOENT"].includes(failure.code),
                `world B: the failure is the filesystem's component-length limit, not an id transformation (got ${failure.code}: ${failure.message})`,
              );
            }

            // ADR-011 R8 / TIGHTENING 3 — the outcome was ATOMIC. `writeText`
            // reclaims its temp on the failure path (src/fs.mjs:32); without this,
            // "wrote no record" and "left a 200-character orphan that nothing sweeps
            // for an hour" are indistinguishable, and the second is m38-F26 returning
            // through the very door this row opens. It binds hardest in world B and
            // must hold in both.
            assert.deepEqual(
              entries.filter((name) => name.startsWith(".tmp-")),
              [],
              "no `.tmp-*` orphan was left in the sessions directory — the write was atomic in whichever world held",
            );
            continue;
          }

          const { exitCode } = await runCommand(args, ctx);
          assert.notEqual(exitCode, 1, `${row.case}: the command succeeds`);

          const record = await readSessionRecord(fixture.ws, keyFor(row.id));
          assert.ok(record, `${row.case}: the record is keyed by the id exactly as supplied`);
          assert.strictEqual(record.sessionId, row.id, `${row.case}: byte-identical`);
          assert.equal(record.sessionId.length, row.id.length, `${row.case}: same length`);

          const secondRead = await readSessionRecord(fixture.ws, keyFor(row.id));
          assert.strictEqual(secondRead.sessionId, row.id, `${row.case}: reading the record back a second time yields the same bytes again`);
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
    },
  },

  // ══ Scenario Outline: start, ping and end each carry the id through the same ladder ══
  {
    name: "mesh-session-id-ladder/00 start, ping and end each carry the id through the same ladder (Examples)",
    async run() {
      const rows = [
        { case: "start via the flag", verb: "start", channel: "flag" },
        { case: "ping via the payload", verb: "ping", channel: "payload" },
        { case: "end via the flag", verb: "end", channel: "flag" },
        { case: "ping via the environment", verb: "ping", channel: "env" },
      ];
      for (const row of rows) {
        const fixture = await makeFixture();
        try {
          const id = "sess-abc";
          const channel = {
            flag: { args: ["--session", id], ctx: {} },
            payload: { args: [], ctx: { stdinText: JSON.stringify({ session_id: id }) } },
            env: { args: [], ctx: { claudeSessionId: id } },
          }[row.channel];

          // `end` needs something to end: seed the SAME session through the same id,
          // plus a sibling that must be untouched by the verb under test.
          if (row.verb === "end") {
            await runCommand(["start", "--workspace", "ws-1", "--repo", "demo", "--assistant", "claude-code", "--session", id], ctxFor(fixture));
            await runCommand(["start", "--workspace", "ws-1", "--repo", "demo", "--assistant", "claude-code", "--session", "sess-other"], ctxFor(fixture));
          }

          const args = [row.verb, "--workspace", "ws-1", ...(row.verb === "end" ? [] : ["--repo", "demo"]), "--assistant", "claude-code", ...channel.args];
          const { exitCode, logs } = await runCommand(args, ctxFor(fixture, channel.ctx));
          assert.notEqual(exitCode, 1, `${row.case}: the command succeeds with its normal envelope for that verb`);
          assert.ok(logs.length > 0 && typeof logs[logs.length - 1] === "string", `${row.case}: an envelope was emitted`);

          if (row.verb === "end") {
            assert.equal(await readSessionRecord(fixture.ws, keyFor(id)), null, `${row.case}: the record removed is the one keyed by \`${id}\``);
            assert.ok(await readSessionRecord(fixture.ws, keyFor("sess-other")), `${row.case}: and only that one`);
          } else {
            const record = await readSessionRecord(fixture.ws, keyFor(id));
            assert.ok(record, `${row.case}: the record written is the one keyed by \`${id}\``);
            assert.strictEqual(record.sessionId, id);
          }
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
    },
  },

  // ══ Scenario Outline: adding `--session` does not disturb one existing coded refusal ══
  {
    name: "mesh-session-id-ladder/00 adding `--session` does not disturb one existing coded refusal (Examples)",
    async run() {
      const rows = [
        { case: "`start` with no `--workspace` and no payload", args: ["start", "--repo", "demo", "--assistant", "claude-code"], code: "session-arg-missing-workspace" },
        { case: "`start` with a workspace but no `--repo`", args: ["start", "--workspace", "ws-1", "--assistant", "claude-code"], code: "session-arg-missing-repo" },
        { case: "`start` with no `--assistant` resolvable", args: ["start", "--workspace", "ws-1", "--repo", "demo"], code: "session-arg-missing-assistant" },
        { case: "an unrecognised flag is passed", args: ["start", "--workspace", "ws-1", "--repo", "demo", "--assistant", "claude-code", "--sessions", "x"], code: "invalid-input" },
        { case: "an unrecognised flag is passed (--sess)", args: ["start", "--workspace", "ws-1", "--repo", "demo", "--assistant", "claude-code", "--sess", "x"], code: "invalid-input" },
        { case: "an unrecognised flag is passed (--session-id)", args: ["start", "--workspace", "ws-1", "--repo", "demo", "--assistant", "claude-code", "--session-id", "x"], code: "invalid-input" },
        { case: "a hook payload whose `cwd` is not a workspace", args: ["start"], code: "session-cwd-not-workspace", nonWorkspaceCwd: true },
      ];
      for (const row of rows) {
        const fixture = await makeFixture();
        try {
          let ctxOptions = {};
          if (row.nonWorkspaceCwd) {
            const stranger = path.join(fixture.tmp, "not-a-workspace");
            await mkdir(stranger, { recursive: true });
            ctxOptions = { stdinText: JSON.stringify({ session_id: "sid-1", cwd: stranger, hook_event_name: "SessionStart" }), cwd: stranger };
          }
          const { exitCode, envelope, errors } = await runCommand([...row.args, "--json"], ctxFor(fixture, ctxOptions));
          assert.equal(exitCode, 1, `${row.case}: it fails`);
          assert.ok(envelope, `${row.case}: a JSON envelope was emitted`);
          assert.equal(envelope.ok, false, `${row.case}: the envelope reports failure`);
          assert.equal(envelope.code, row.code, `${row.case}: the coded error is ${row.code}`);
          assert.ok(typeof envelope.error === "string" && !envelope.error.includes("\n    at "), `${row.case}: a calm one-line message, never a stack trace`);
          assert.deepEqual(errors, [], `${row.case}: nothing was written to stderr in --json mode`);

          const all = await readSessionRecordsForNode(fixture.ws, NODE_ID);
          assert.equal(all.length, 0, `${row.case}: NO session record is written`);
          assert.deepEqual(await readdir(fixture.sessionsDir).catch(() => []), [], `${row.case}: not even an empty half-formed leaf`);
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
    },
  },

  // ══ The `--session` flag's own inertness on the refusal ladder ══
  {
    name: "mesh-session-id-ladder/00 `--session` is a real flag: supplying it never substitutes for a missing required argument",
    async run() {
      const fixture = await makeFixture();
      try {
        const { exitCode, envelope } = await runCommand(["start", "--session", "sess-abc", "--json"], ctxFor(fixture));
        assert.equal(exitCode, 1, "an id alone resolves no workspace — the refusal ladder is untouched");
        assert.equal(envelope.code, "session-arg-missing-workspace");
        assert.equal((await readSessionRecordsForNode(fixture.ws, NODE_ID)).length, 0, "no record");

        // …and the flag IS parsed as a value-bearing flag, not a boolean: the token
        // after it is consumed, never treated as a positional.
        const ok = await runCommand(["start", "--session", "sess-abc", "--workspace", "ws-1", "--repo", "demo", "--assistant", "claude-code"], ctxFor(fixture));
        assert.notEqual(ok.exitCode, 1);
        const record = await readSessionRecord(fixture.ws, keyFor("sess-abc"));
        assert.strictEqual(record.sessionId, "sess-abc");
        assert.ok((await readdir(fixture.sessionsDir)).includes(path.basename(sessionRecordPath(fixture.ws, keyFor("sess-abc")))), "the leaf on disk is the one the key composes");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
];
