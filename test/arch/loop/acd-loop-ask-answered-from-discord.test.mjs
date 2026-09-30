// FF-13111 + FF-13112 + FF-13113 — AN ASK IS ANSWERED FROM DISCORD THROUGH ONE GATEWAY AND ONE
// ALLOWLISTED VERB, AND A COMMAND DEFERS, DISPATCHES A REGISTERED VERB AND STARTS NOTHING (milestone 131
// / stories 10 and 11; ARCHITECTURE `## Fitness functions`, ADR-008 and ADR-009). Which of this directory's
// three subjects: the RECORD — a Discord reply is one more face that writes the ask record, and
// these are the controls on that face: one connection that resumes rather than re-identifies, and an
// answer that enters only through `work:answer` after the ask's own allowlist. Story 11 appends
// FF-13113 here.
//
// FF-13111, structural then fixture. Over a comment-stripped sweep of `packages/core/src/**`, the gateway socket is
// constructed only in `packages/core/src/discord/gateway.mjs`: no other `packages/core/src/discord/**` module imports `ws` or
// calls `new WebSocket(`, and no other `packages/core/src/**` module spells the `/gateway/bot` route.
// `packages/core/src/mesh/launcher.mjs` reaches `packages/core/src/discord/bot.mjs` only by a deferred import inside its
// `if (issuanceAuthority)` branch, and imports nothing of `packages/core/src/discord/` statically. Fixture over the
// fake gateway (`test/discord/discord-fixture.mjs`): HELLO → IDENTIFY with intents 33280; a drop after
// READY → RESUME carrying the `session_id` and the last `seq`, with no second IDENTIFY; close 4014 →
// no reconnect and one `discord-intent-disallowed`; close 4004 → no reconnect and one
// `discord-token-rejected`; `session_start_limit.remaining` 5 → no IDENTIFY and one
// `discord-identify-budget`.
//
// FF-13112, structural then fixture. `packages/core/src/discord/**` imports no write export of
// `packages/core/src/loop/ask-request.mjs` and nothing from `packages/core/src/run-store.mjs`; its one answer call is
// `invoke("work:answer", …)` carrying `via: "discord"`. The index's `discord-asks` segment is spelled
// only in `packages/core/src/notify/ask-messages.mjs`, joined beneath `messagingStoreDir(`. Fixture over the reply
// background: a reply from an id not in `allow` leaves the ask `waiting` and posts one refusal; an
// allowed reply makes it `answered` with `by.via: "discord"` and `by.actor` `@<username>`, and puts
// one reaction; a reply to an unindexed message sends nothing and changes nothing; a second allowed
// reply is refused `ask-already-answered` and names the first answerer.
//
// FF-13113, structural then fixture (131/11). `packages/core/src/discord/**` imports no `node:child_process`; every
// `invoke(` in `packages/core/src/discord/commands.mjs` names `work:list` or `work:loop`; the `loop-resumes` segment is
// spelled only in `packages/core/src/loop/stop-request.mjs`; and `handOffLoop` writes the resume request and imports
// no `child_process`. Fixture over injected fakes: each of the four commands sends its `type: 5`
// callback before any `invoke`, the views with `flags: 64`; a user not in `allow` gets
// `discord-command-not-allowed` and nothing is invoked; `decideSupervisedDeclarations` yields a
// done-latest supervised declaration's row only when it is in `resumeRequested`.
//
// NON-VACUOUS (QA ruling 1): the sweep must find `packages/core/src/discord/gateway.mjs`, `packages/core/src/discord/replies.mjs`,
// `packages/core/src/discord/commands.mjs`, one `invoke("work:answer"` call and at least one command dispatch. Every
// sweep reports what it read.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import { dependencySpecifiers } from "../../support/workspace/configured-source.mjs";
import { functionBody, matchedBraceBody, matchedParenSpan, stripComments, topLevelArguments } from "../../support/source-slice.mjs";
import { handleInteraction } from "../../../packages/core/src/discord/commands.mjs";
import { decideSupervisedDeclarations } from "../../../packages/work-loop/src/engine.mjs";
import { isRunning, isStale, retryReadiness } from "../../../packages/core/src/run-store.mjs";
import { startGateway } from "../../../packages/core/src/discord/gateway.mjs";
import { handleReply } from "../../../packages/core/src/discord/replies.mjs";
import { ALLOWED, STRANGER, TOKEN, degradeSink, fakeClock, fakeGateway, flush, ready, releaseDegradeSink, reply, withReplyWorld } from "../../discord/discord-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const toPosix = (value) => String(value).split(path.sep).join("/");

const FAMILY = "packages/core/src/discord/";
const GATEWAY = "packages/messaging/src/gateway.mjs";
const REPLIES = "packages/messaging/src/replies.mjs";
const BOT = "packages/messaging/src/bot.mjs";
const LAUNCHER = "packages/mesh/src/launcher.mjs";
const ASK_REQUEST = "packages/work-loop/src/ask-request.mjs";
const RUN_STORE = "packages/execution/src/runs.mjs";
const INDEX = "packages/messaging/src/ask-messages.mjs";
// `ask-request.mjs`'s exports that write an ask file. A reader (`readAsk`, `readAsks`, `loopAsksDir`)
// is not one of them.
const ASK_WRITES = Object.freeze(["openAsk", "parkAsk", "clearAsk", "answerAsk"]);
// FF-13113 (131/11, ADR-009).
const COMMANDS_MODULE = "packages/messaging/src/discord-commands.mjs";
const ALLOWED_VERBS = Object.freeze(["work:list", "work:loop"]);
const STOP_HOME = "packages/work-loop/src/stop-request.mjs";
const STOP_CORE = "packages/work-loop/src/stop.mjs";
const RESUME_SEGMENT = "loop-resumes";

function assertRead(what, count, floor, unit = "file(s)") {
  assert.ok(count >= floor, `NOTHING WAS READ: ${what} walked ${count} ${unit}, below its floor of ${floor} — a rename, a moved directory or a truncated read must fail here rather than pass vacuously over an empty sweep`);
}

function inDiscordFamily(rel) {
  // Include the entire package so adding a new module cannot escape the old directory-wide rules.
  return rel.startsWith("packages/core/src/application/bindings/discord/") || rel.startsWith("packages/core/src/discord/") || rel.startsWith("packages/messaging/src/");
}

function resolved(fromRel, specifier) {
  const messaging = /^@aof\/messaging\/(.+)$/.exec(specifier);
  if (messaging) return `packages/messaging/src/${messaging[1]}.mjs`;
  const service = /^(?:@aof\/work-loop\/)(ask-request|stop-request|child-drive)$/.exec(specifier);
  if (service) return `packages/work-loop/src/${service[1]}.mjs`;
  if (specifier.startsWith("node:") || !specifier.startsWith(".")) return specifier;
  let joined = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), specifier));
  if (/^src\/loop\/(ask-request|stop-request|child-drive)\.mjs$/.test(joined)) joined = joined.replace("packages/core/src/loop/", "packages/work-loop/src/");
  return /\.[cm]?[jt]sx?$/u.test(joined) ? joined : `${joined}.mjs`;
}

async function srcUnits() {
  const units = [];
  for (const file of await readRuntimeFiles(repoRoot)) {
    const raw = await readFile(file.path, "utf8");
    units.push({ rel: toPosix(file.rel), raw, code: stripComments(raw) });
  }
  return units;
}

// gatewaySocketBuilders(units) → every module that builds the gateway socket: a `packages/core/src/discord/**`
// module importing `ws` or calling `new WebSocket(`, or any module spelling the `/gateway/bot`
// route. PURE, so the red probe runs this shipped detector over a patched unit.
export function gatewaySocketBuilders(units) {
  return units.filter(({ rel, code }) => {
    const inFamily = inDiscordFamily(rel) && (dependencySpecifiers(code).some(({ specifier }) => specifier === "ws") || /\bnew\s+WebSocket\s*\(/u.test(code));
    return inFamily || code.includes("/gateway/bot");
  }).map(({ rel }) => rel);
}

// answerCalls(units) → every `invoke(` call in `packages/core/src/discord/**` whose first argument is the literal
// `"work:answer"`, as `{ rel, via }`, `via` the literal its input carries (or null).
export function answerCalls(units) {
  const calls = [];
  for (const { rel, code } of units.filter((unit) => inDiscordFamily(unit.rel))) {
    for (const match of code.matchAll(/(?<![\w$.])invoke\s*\(/gu)) {
      const args = topLevelArguments(matchedParenSpan(code, match.index)?.body ?? "");
      if (!/^\s*["']work:answer["']\s*$/u.test(args[0] ?? "")) continue;
      const via = /\bvia\s*:\s*["']([a-z]+)["']/u.exec(args[1] ?? "")?.[1] ?? null;
      calls.push({ rel, via });
    }
  }
  return calls;
}

// ask-request write names a `packages/core/src/discord/**` module reaches, and anything it imports from the run
// store. The specifiers come from the one extractor (`importSpecifiers`, FF-11901); a module that
// imports `ask-request.mjs` is then read for each write export used as an identifier.
export function forbiddenWrites(units) {
  const found = [];
  for (const { rel, code } of units.filter((unit) => inDiscordFamily(unit.rel))) {
    const targets = dependencySpecifiers(code).map(({ specifier }) => resolved(rel, specifier));
    if (targets.includes(ASK_REQUEST)) {
      for (const name of ASK_WRITES) if (new RegExp(`(?<![\\w$.])${name}(?![\\w$])`, "u").test(code)) found.push(`${rel}: ${name} from ${ASK_REQUEST}`);
    }
    if (targets.includes(RUN_STORE)) found.push(`${rel}: ${RUN_STORE}`);
  }
  return found;
}

// The `packages/core/src/discord/**` modules that import `child_process`, by the one extractor.
export function childProcessImporters(units) {
  return units
    .filter(({ rel, code }) => inDiscordFamily(rel) && dependencySpecifiers(code).some(({ specifier }) => specifier === "child_process" || specifier === "node:child_process"))
    .map(({ rel }) => rel);
}

// commandDispatches(code) → the literal verb id of every `invoke(` call, bare or as a member
// (`context.invoke(`), in source order; a call whose first argument is not a literal reads `?`.
export function commandDispatches(code) {
  const ids = [];
  for (const match of code.matchAll(/(?<![\w$])invoke\s*\(/gu)) {
    if (/function\s*$/u.test(code.slice(Math.max(0, match.index - 16), match.index))) continue;
    const first = topLevelArguments(matchedParenSpan(code, match.index)?.body ?? "")[0] ?? "";
    ids.push(/^\s*["']([^"']+)["']\s*$/u.exec(first)?.[1] ?? "?");
  }
  return ids;
}

// FF-13113's fixture: a command's context over fakes, every request and invoke in one sequence, and
// one served project whose channel allows user 222….
function commandWorld() {
  const sequence = [];
  const workspace = { projectRoot: "/tmp/aof-ff-13113/alpha", config: { work: { notify: { channels: { discord: { type: "discord", channelId: "111111111111111111", allow: ["222222222222222222"] } } } } } };
  return {
    sequence,
    context: {
      request: async (method, route, body) => { sequence.push({ kind: "request", method, route, body }); return { ok: true, status: 200, json: null }; },
      invoke: async (id) => { sequence.push({ kind: "invoke", id }); return id === "work:list" ? [] : { ok: true, request: "drain", state: "requested", handedOff: true }; },
      servedWorkspaces: async () => [workspace],
      now: () => new Date("2026-09-25T12:00:00.000Z"),
    },
  };
}
const interactionOf = (data, userId) => ({
  id: "700000000000000001", token: "t", application_id: "800000000000000000", type: 2,
  channel_id: "111111111111111111", guild_id: "900000000000000000",
  member: { user: { id: userId, username: "umami" } }, data,
});

// A gateway over the fakes, started and flushed to its first frames.
async function gatewayWorld(limit) {
  const clock = fakeClock();
  const fake = fakeGateway(limit == null ? {} : { limit });
  const handle = startGateway({ token: TOKEN, onDispatch: () => {}, request: fake.request, socketFactory: fake.socketFactory, timers: clock.timers, random: () => 0.5 });
  await flush();
  return { clock, fake, handle };
}

export const archTests = [
  {
    name: "arch/131 FF-13111 (acd-loop-ask-answered-from-discord): structural — the gateway socket is built only in src/discord/gateway.mjs, and the launcher reaches bot.mjs only by a deferred import in its control branch",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const family = units.filter(({ rel }) => inDiscordFamily(rel)).map(({ rel }) => rel);
      for (const rel of [GATEWAY, REPLIES, BOT]) assert.ok(family.includes(rel), `NOT FOUND: ${rel} — the family the control governs has moved`);
      const builders = gatewaySocketBuilders(units);
      assert.deepEqual(builders, [GATEWAY], `the gateway socket is built only in ${GATEWAY} — built in ${builders.join(", ")}. One connection, one module (ADR-008 §2)`);

      const launcher = units.find(({ rel }) => rel === LAUNCHER);
      assert.ok(launcher != null, `NOT FOUND: ${LAUNCHER}`);
      const adapter = units.find(({ rel }) => rel === "packages/core/src/application/bindings/mesh/launcher.mjs");
      assert.ok(adapter);
      assert.match(adapter.code, /loadMessagingBot:\s*\(\)\s*=>\s*provideDiscordBot\(\)/u);
      const reaches = dependencySpecifiers(adapter.code).filter(({ specifier }) => inDiscordFamily(resolved(adapter.rel, specifier)));
      assert.deepEqual(reaches.map(({ specifier, dynamic }) => `${specifier}${dynamic ? " (deferred)" : ""}`), ["../discord/bot.mjs (deferred)"], `${LAUNCHER} reaches src/discord/ only by ONE deferred import of bot.mjs`);
      const branch = launcher.code.indexOf("if (issuanceAuthority)");
      assert.ok(branch !== -1, `NOT FOUND: the control-node branch in ${LAUNCHER}`);
      assert.ok((matchedBraceBody(launcher.code, branch) ?? "").includes('loadMessagingBot()'), "the deferred import sits inside the control-node branch");

      // The red probe runs the SHIPPED detector: replies.mjs constructing its own socket.
      const probe = units.map((unit) => unit.rel === REPLIES ? { ...unit, code: `import { WebSocket } from "ws";\n${unit.code}\nconst own = new WebSocket("wss://gateway.example.test");\n` } : unit);
      assert.deepEqual(gatewaySocketBuilders(probe).sort(), [GATEWAY, REPLIES].sort(), "red probe: a second socket builder is seen, by file");
      const added = "packages/messaging/src/planted.mjs";
      assert.deepEqual(gatewaySocketBuilders([...units, { rel: added, code: 'new WebSocket("wss://example.test");' }]).sort(), [GATEWAY, added].sort(), "a new package module is also inside the socket census");
    },
  },
  {
    name: "arch/131 FF-13111 (acd-loop-ask-answered-from-discord): fixture — HELLO → IDENTIFY with intents 33280, and a drop after READY → RESUME with the session and the last seq, with no second IDENTIFY",
    run: async () => {
      const { clock, fake, handle } = await gatewayWorld();
      try {
        assert.equal(fake.identifies().length, 1, "HELLO → one IDENTIFY");
        assert.equal(fake.identifies()[0].d.intents, 33280, "with intents 33280");
        ready(fake.current(), { sessionId: "s1", seq: 42 });
        fake.current().drop(1006);
        await clock.advance(2_000);
        assert.equal(fake.identifies().length, 1, `a drop after READY resumes: no second IDENTIFY — found ${fake.identifies().length} IDENTIFY frames`);
        assert.deepEqual(fake.current().sent.find((frame) => frame.op === 6)?.d, { token: TOKEN, session_id: "s1", seq: 42 }, "a drop after READY → RESUME carrying s1 and 42");
      } finally {
        handle.stop();
      }
    },
  },
  {
    name: "arch/131 FF-13111 (acd-loop-ask-answered-from-discord): fixture — close 4014 and close 4004 stop the connection with one degrade each, and a spent identify budget sends no IDENTIFY",
    run: async () => {
      for (const [code, degrade] of [[4014, "discord-intent-disallowed"], [4004, "discord-token-rejected"]]) {
        const events = degradeSink();
        const { clock, fake, handle } = await gatewayWorld();
        try {
          ready(fake.current());
          fake.current().drop(code);
          await clock.advance(120_000);
          assert.equal(fake.sockets.length, 1, `close ${code}: no reconnect`);
          assert.deepEqual(events.map((event) => event.code).filter((c) => c.startsWith("discord-")), [degrade], `close ${code}: one ${degrade}`);
        } finally {
          handle.stop();
          releaseDegradeSink();
        }
      }
      const events = degradeSink();
      const { fake, handle } = await gatewayWorld({ remaining: 5, reset_after: 60_000 });
      try {
        assert.equal(fake.identifies().length, 0, "remaining 5 → no IDENTIFY");
        assert.deepEqual(events.map((event) => event.code).filter((c) => c.startsWith("discord-")), ["discord-identify-budget"], "and one discord-identify-budget");
      } finally {
        handle.stop();
        releaseDegradeSink();
      }
    },
  },
  {
    name: "arch/131 FF-13112 (acd-loop-ask-answered-from-discord): structural — src/discord/** writes no ask file and no run record, its one answer call is invoke(\"work:answer\") via discord, and the index is joined beneath messagingStoreDir( only in ask-messages.mjs",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      assertRead("the src/discord/** family", units.filter(({ rel }) => inDiscordFamily(rel)).length, 3);
      const writes = forbiddenWrites(units);
      assert.deepEqual(writes, [], `packages/core/src/discord/** imports no write export of ${ASK_REQUEST} and nothing from ${RUN_STORE} — found ${writes.join(", ")}. An answer from Discord enters only through work:answer (ADR-008's invariant)`);
      const calls = answerCalls(units);
      assertRead(`the invoke("work:answer" calls in ${FAMILY}`, calls.length, 1, "call(s)");
      assert.deepEqual(calls, [{ rel: REPLIES, via: "discord" }], `packages/core/src/discord/**'s one answer call is invoke("work:answer", …) in ${REPLIES} carrying via: "discord" — found ${JSON.stringify(calls)}`);

      const spellers = units.filter(({ code }) => code.includes('"discord-asks"')).map(({ rel }) => rel);
      assert.deepEqual(spellers, [INDEX], `the discord-asks segment is spelled only in ${INDEX} — found ${spellers.join(", ")}`);
      const index = units.find(({ rel }) => rel === INDEX);
      assert.match(index.code, /path\.join\(\s*messagingStoreDir\(/u, `${INDEX} joins the index beneath messagingStoreDir(`);

      // The red probe runs the SHIPPED detector: replies.mjs answering the ask file itself.
      const probe = units.map((unit) => unit.rel === REPLIES ? { ...unit, code: `import { answerAsk } from "@aof/work-loop/ask-request";\n${unit.code}` } : unit);
      assert.deepEqual(forbiddenWrites(probe), [`${REPLIES}: answerAsk from ${ASK_REQUEST}`], "red probe: a direct write through ask-request.mjs is seen, by name");
    },
  },
  {
    name: "arch/131 FF-13112 (acd-loop-ask-answered-from-discord): fixture — a non-allowlisted reply changes nothing and is refused; an allowed one answers via discord and reacts; an unindexed one sends nothing; a second answer is refused naming the first answerer",
    run: async () => {
      degradeSink();
      try {
        await withReplyWorld(async ({ context, discord, askState }) => {
          const stranger = await handleReply(reply({ from: STRANGER, text: "do it" }), context);
          assert.equal((await askState()).state, "waiting", `the non-allowlisted user ${STRANGER} left the ask waiting`);
          assert.equal(stranger.action, "refused", `the non-allowlisted user ${STRANGER} was refused`);
          assert.equal(discord.filter((call) => call.method === "POST").length, 1, "and one refusal was posted");

          const unindexed = await handleReply(reply({ to: "900000000000000999", text: "x" }), context);
          assert.equal(unindexed.action, "ignored");
          assert.equal(discord.length, 1, "a reply to an unindexed message sends nothing to Discord");
          assert.equal((await askState()).state, "waiting", "and changes nothing");

          const allowed = await handleReply(reply({ from: ALLOWED, username: "umami", text: "take option B" }), context);
          assert.equal(allowed.action, "answered");
          const record = await askState();
          assert.equal(record.state, "answered");
          assert.equal(record.by.via, "discord");
          assert.equal(record.by.actor, "@umami");
          assert.equal(discord.filter((call) => call.method === "PUT").length, 1, "one reaction");

          const second = await handleReply(reply({ from: ALLOWED, username: "umami", text: "again" }), context);
          assert.equal(second.code, "ask-already-answered", "a second allowed reply is refused ask-already-answered");
          assert.match(discord.at(-1).body.content, /@umami/u, "and names the first answerer");
          assert.equal((await askState()).answer, "take option B", "the first answer stands");
        });
      } finally {
        releaseDegradeSink();
      }
    },
  },
  {
    name: "arch/131 FF-13113 (acd-loop-ask-answered-from-discord): structural — src/discord/** imports no node:child_process, every invoke( in commands.mjs names work:list or work:loop, the resume segment has one home, and the hand-off spawns nothing",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const commands = units.find(({ rel }) => rel === COMMANDS_MODULE);
      assert.ok(commands != null, `NOT FOUND: ${COMMANDS_MODULE} — the module the control governs has moved`);
      const spawners = childProcessImporters(units);
      assert.deepEqual(spawners, [], `packages/core/src/discord/** imports no node:child_process — found in ${spawners.join(", ")}. A command dispatches a registered verb and starts no process (ADR-009's invariant)`);
      const dispatched = commandDispatches(commands.code);
      assertRead(`the invoke( calls in ${COMMANDS_MODULE}`, dispatched.length, 1, "call(s)");
      const strays = dispatched.filter((id) => !ALLOWED_VERBS.includes(id));
      assert.deepEqual(strays, [], `every invoke( in ${COMMANDS_MODULE} names work:list or work:loop — it also names ${strays.join(", ")}`);

      const resumeSpellers = units.filter(({ code }) => code.includes(RESUME_SEGMENT)).map(({ rel }) => rel);
      assert.deepEqual(resumeSpellers, [STOP_HOME], `the literal "${RESUME_SEGMENT}" is spelled only in ${STOP_HOME} — spelled in ${resumeSpellers.join(", ")}. Read the path through loopResumesDir() (ADR-009 §6)`);
      const core = units.find(({ rel }) => rel === STOP_CORE);
      assert.ok(core != null && !dependencySpecifiers(core.code).some(({ specifier }) => /child_process/u.test(specifier)), `${STOP_CORE} imports no child_process`);
      const handOff = functionBody(core.code, "async function handOffLoop(");
      assert.ok(handOff != null && /\brequestLoopResume\s*\(/u.test(handOff), "handOffLoop writes the resume request through requestLoopResume(");

      // The red probes run the SHIPPED detectors over patched units.
      const spawning = units.map((unit) => unit.rel === COMMANDS_MODULE ? { ...unit, code: `import { spawn } from "node:child_process";\n${unit.code}` } : unit);
      assert.deepEqual(childProcessImporters(spawning), [COMMANDS_MODULE], "red probe: a child_process import is seen, by file");
      assert.deepEqual(commandDispatches('await context.invoke("work:drive", {}, { workspace });'), ["work:drive"], "red probe: a third verb is seen, by name");
    },
  },
  {
    name: "arch/131 FF-13113 (acd-loop-ask-answered-from-discord): fixture — each of the four commands is deferred before any dispatch, the views ephemerally; a user not in allow reaches nothing; a handed-back done declaration yields its row",
    run: async () => {
      for (const [label, command, flags] of [
        ["/status", { name: "status", options: [] }, 64],
        ["/asks", { name: "asks", options: [] }, 64],
        ["/loop stop", { name: "loop", options: [{ type: 1, name: "stop", options: [{ type: 3, name: "scope", value: "131" }] }] }, null],
        ["/loop resume", { name: "loop", options: [{ type: 1, name: "resume", options: [{ type: 3, name: "scope", value: "131" }] }] }, null],
      ]) {
        const world = commandWorld();
        await handleInteraction(interactionOf(command, "222222222222222222"), world.context);
        const firstInvoke = world.sequence.findIndex((entry) => entry.kind === "invoke");
        const callback = world.sequence.findIndex((entry) => entry.kind === "request" && entry.route.endsWith("/callback"));
        assert.ok(callback === 0 && firstInvoke > callback, `${label} dispatched before its type 5 callback — the deferral must be the first thing sent (ADR-009 §4): ${world.sequence.map((entry) => entry.kind === "invoke" ? `invoke ${entry.id}` : `${entry.method} ${entry.route}`).join(" → ")}`);
        assert.equal(world.sequence[callback].body.type, 5, `${label}: a type 5 callback`);
        assert.equal(world.sequence[callback].body.data?.flags ?? null, flags, `${label}: ${flags == null ? "in-channel" : "ephemeral"}`);
      }
      const stranger = commandWorld();
      await handleInteraction(interactionOf({ name: "status", options: [] }, "444444444444444444"), stranger.context);
      assert.equal(stranger.sequence.filter((entry) => entry.kind === "invoke").length, 0, "a user not in allow: invoke is never called");
      assert.match(stranger.sequence.at(-1).body.content, /discord-command-not-allowed/u);

      const done = [{
        runId: "run-1", retryOf: null, state: "done", attempt: 1, failureReason: null, resumeAfter: null, reclaimedAt: null,
        createdAt: "2026-09-25T11:00:00.000Z", heartbeatAt: null, updatedAt: "2026-09-25T11:30:00.000Z",
        brief: { loop: { loopRunId: "lr-1", scope: "131", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: "2026-09-25T11:00:00.000Z", id: "loop:autonomous-cascade", supervised: true } },
      }];
      const decide = (resumeRequested) => decideSupervisedDeclarations({
        workspaces: [{ workspaceId: "w", projectRoot: "C:/repo", items: [{ ref: "131", runs: done }] }],
        maxAttempts: 3, ceilingMs: 7_200_000, stalenessMs: 900_000, now: "2026-09-25T12:00:00.000Z", isRunning, isStale, retryReadiness,
        ...(resumeRequested ? { resumeRequested } : {}),
      }).rows.length;
      assert.equal(decide(new Set(["lr-1"])), 1, "a done-latest supervised declaration in resumeRequested yields its row");
      assert.equal(decide(null), 0, "and without it yields none");
    },
  },
];
