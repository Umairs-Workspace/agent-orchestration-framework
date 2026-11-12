import { defaultApplication as _aofApplication } from "aof/default-application";
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
// `invoke(` in `packages/core/src/discord/commands.mjs` names an allowed verb (`work:list` or `work:loop` as first
// written; FF-19106 below widens the set); the `loop-resumes` segment is
// spelled only in `packages/core/src/loop/stop-request.mjs`; and `handOffLoop` writes the resume request and imports
// no `child_process`. Fixture over injected fakes: each command sends its `type: 5`
// callback before any `invoke`, the views with `flags: 64`; an autocomplete interaction (type 4,
// 191/05) is not a command: it is never deferred and is answered by one `type: 8` callback, and a
// `project` offer dispatches no verb; a user not in `allow` gets
// `discord-command-not-allowed` and nothing is invoked; `decideSupervisedDeclarations` yields a
// done-latest supervised declaration's row only when it is in `resumeRequested`.
//
// FF-19106 (191/06, 191/ADR-006 §5) — FF-13113 AS AMENDED, on purpose: the commands' verb set grows
// from two to exactly six. Every `invoke(` in `packages/messaging/src/discord-commands.mjs` names
// `work:list`, `work:loop`, `mesh:session-start`, `mesh:session-list`, `mesh:session-end` or
// `mesh:status`, and each of the six is named by at least one — a verb allowed and never reached is a
// hole in the list, not headroom. The `child_process` leg is unchanged: starting a session is a
// directive the node acts on, never a process the bot owns. The fixture runs EVERY command the table
// registers, read from `COMMANDS` itself so a new row cannot escape it: each sends its `type: 5`
// callback before its first `invoke`, a view privately and an action in the channel.
//
// FF-19107, structural then fixture (191/07, ADR-007's invariant) — a leg in this family's control,
// beside FF-13113. `packages/messaging/src/discord-buttons.mjs` imports no `child_process` and every
// `invoke(` in it names `work:answer`, `work:loop` or `mesh:session-start`; only that module spells a
// `custom_id` prefix ("aof:answer:", "aof:resume", "aof:session") in `packages/messaging/src/`; and a
// tap whose `custom_id` carries extra segments naming another project dispatches into the index
// record's workspace, never the id's. FF-13112's one answer call becomes two: the reply's and the
// button's, each `via: "discord"`.
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
const handleInteraction = _aofApplication.messaging.discord.commands.handleInteraction;
import { decideSupervisedDeclarations } from "../../../packages/work-loop/src/engine.mjs";
const isRunning = _aofApplication.execution.runs.isRunning;
const isStale = _aofApplication.execution.runs.isStale;
const retryReadiness = _aofApplication.execution.runs.retryReadiness;
const startGateway = _aofApplication.messaging.discord.gateway.startGateway;
const handleReply = _aofApplication.messaging.discord.replies.handleReply;
const COMMANDS = _aofApplication.messaging.discord.commands.COMMANDS;
import { ALLOWED, SESSION_ID, SESSION_NAME, STRANGER, TOKEN, degradeSink, fakeClock, fakeGateway, fakeVerbs, flush, ready, releaseDegradeSink, reply, withReplyWorld } from "../../discord/discord-fixture.mjs";

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
// FF-13113 (131/11, ADR-009), amended by FF-19106 (191/06, 191/ADR-006 §5): exactly these six.
const COMMANDS_MODULE = "packages/messaging/src/discord-commands.mjs";
const ALLOWED_VERBS = Object.freeze(["work:list", "work:loop", "mesh:session-start", "mesh:session-list", "mesh:session-end", "mesh:status"]);
// Where each registered command answers, keyed `<command> <subcommand>`: 64 a private view, null an
// action the channel sees. A row of the table with no entry here fails the fixture by name.
const COMMAND_FLAGS = Object.freeze({
  status: 64,
  asks: 64,
  "loop stop": null,
  "loop resume": null,
  "loop start": null,
  "session start": 64,
  "session list": 64,
  "session end": null,
});
const STOP_HOME = "packages/work-loop/src/stop-request.mjs";
const STOP_CORE = "packages/work-loop/src/stop.mjs";
const RESUME_SEGMENT = "loop-resumes";
// FF-19107 (191/07, ADR-007).
const BUTTONS_MODULE = "packages/messaging/src/discord-buttons.mjs";
const BUTTON_VERBS = Object.freeze(["work:answer", "work:loop", "mesh:session-start"]);
const BUTTON_ID_PREFIXES = Object.freeze(["aof:answer:", "aof:resume", "aof:session"]);
const MESSAGING_SRC = "packages/messaging/src/";

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

// verbCensus(code) → FF-19106's two answers over the commands module's code: `strays`, the verbs an
// `invoke(` names outside `ALLOWED_VERBS`, and `unreached`, the allowed verbs no `invoke(` names.
// PURE, so the red probes run this shipped detector over patched code.
export function verbCensus(code) {
  const dispatched = commandDispatches(code);
  return {
    dispatched,
    strays: dispatched.filter((id) => !ALLOWED_VERBS.includes(id)),
    unreached: ALLOWED_VERBS.filter((id) => !dispatched.includes(id)),
  };
}

// buttonIdSpellers(units) → every `packages/messaging/src/` module whose comment-stripped code spells
// a `custom_id` prefix as a string literal, by file. PURE, so the red probe runs it over a patched unit.
export function buttonIdSpellers(units) {
  return units
    .filter(({ rel, code }) => rel.startsWith(MESSAGING_SRC) && BUTTON_ID_PREFIXES.some((prefix) => code.includes(`"${prefix}`) || code.includes(`'${prefix}`) || code.includes(`\`${prefix}`)))
    .map(({ rel }) => rel);
}

// FF-13113's fixture: a command's context over fakes, every request and invoke in one sequence, and
// one served project (id `ws-alpha`) whose channel allows user 222…. The verbs are the shared fakes
// (191/06), holding one live session in that project so `/session end` has one to end.
function commandWorld() {
  const sequence = [];
  const workspace = { projectRoot: "/tmp/aof-ff-13113/alpha", config: { mesh: { workspaceId: "ws-alpha" }, work: { notify: { channels: { discord: { type: "discord", channelId: "111111111111111111", allow: ["222222222222222222"] } } } } } };
  const session = { sessionId: SESSION_ID, nodeId: "node-a", workspaceId: "ws-alpha", project: "alpha", startedAt: null, lastPingAt: null, name: SESSION_NAME };
  const verbs = fakeVerbs({
    sessions: [session],
    start: { ok: true, outcome: "no-link", ...session, item: null, link: null },
    end: { ok: true, ended: true, sessionId: SESSION_ID, nodeId: "node-a", name: SESSION_NAME },
    loop: { ok: true, request: "drain", state: "requested", handedOff: true, requested: true },
  });
  return {
    sequence,
    context: {
      request: async (method, route, body) => { sequence.push({ kind: "request", method, route, body }); return { ok: true, status: 200, json: null }; },
      invoke: async (id, input, ctx) => { sequence.push({ kind: "invoke", id }); return await verbs(id, input, ctx); },
      servedWorkspaces: async () => [workspace],
      now: () => new Date("2026-09-25T12:00:00.000Z"),
    },
  };
}
// One runnable interaction `data` per command the table registers — a subcommand each where a
// command has them — with every REQUIRED option filled, as `[key, data]`, the key `COMMAND_FLAGS`'s.
const REQUIRED_VALUES = Object.freeze({ scope: "131", project: "alpha", session: SESSION_NAME });
function registeredCommands() {
  const filled = (options) => options.filter((option) => option.required === true).map((option) => {
    assert.ok(Object.hasOwn(REQUIRED_VALUES, option.name), `NO VALUE: the fixture has nothing to fill the required option "${option.name}" with — give it one in REQUIRED_VALUES`);
    return { type: option.type, name: option.name, value: REQUIRED_VALUES[option.name] };
  });
  return COMMANDS.flatMap((command) => {
    const subs = command.options.filter((option) => option.type === 1);
    if (subs.length === 0) return [[command.name, { name: command.name, options: filled(command.options) }]];
    return subs.map((sub) => [`${command.name} ${sub.name}`, { name: command.name, options: [{ type: 1, name: sub.name, options: filled(sub.options) }] }]);
  });
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
      // 191/07: a button's answer is the second door, through the same verb and via (ADR-007 §5).
      assert.deepEqual([...calls].sort((x, y) => x.rel.localeCompare(y.rel)), [{ rel: BUTTONS_MODULE, via: "discord" }, { rel: REPLIES, via: "discord" }], `the family's answer calls are invoke("work:answer", …) in ${BUTTONS_MODULE} and ${REPLIES}, each carrying via: "discord" — found ${JSON.stringify(calls)}`);

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
    name: "arch/131 FF-13113 + arch/191 FF-19106 (acd-loop-ask-answered-from-discord): structural — src/discord/** imports no node:child_process, every invoke( in discord-commands.mjs names one of exactly six verbs and each of the six is named, the resume segment has one home, and the hand-off spawns nothing",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const commands = units.find(({ rel }) => rel === COMMANDS_MODULE);
      assert.ok(commands != null, `NOT FOUND: ${COMMANDS_MODULE} — the module the control governs has moved`);
      const spawners = childProcessImporters(units);
      assert.deepEqual(spawners, [], `packages/core/src/discord/** imports no node:child_process — found in ${spawners.join(", ")}. A command dispatches a registered verb and starts no process (ADR-009's invariant)`);
      // FF-19106: exactly the six of 191/ADR-006 §5 — none other named, and none of them unnamed.
      assert.deepEqual([...ALLOWED_VERBS], ["work:list", "work:loop", "mesh:session-start", "mesh:session-list", "mesh:session-end", "mesh:status"], "ALLOWED_VERBS is exactly the six verbs of 191/ADR-006 §5");
      const { dispatched, strays, unreached } = verbCensus(commands.code);
      assertRead(`the invoke( calls in ${COMMANDS_MODULE}`, dispatched.length, ALLOWED_VERBS.length, "call(s)");
      assert.deepEqual(strays, [], `every invoke( in ${COMMANDS_MODULE} names one of ${ALLOWED_VERBS.join(", ")} — it also names ${strays.join(", ")}. A command dispatches only a verb 191/ADR-006 §5 lists; widening the list is an ADR, not an edit here`);
      assert.deepEqual(unreached, [], `each of the six verbs is named by at least one invoke( in ${COMMANDS_MODULE} — none names ${unreached.join(", ")}. Drop a verb no command reaches from ALLOWED_VERBS, with the ADR that allowed it`);

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
      // FF-19106's red probes, over the shipped module's own code: a seventh verb is a stray, a verb
      // the module no longer names is unreached, and a verb named by a variable is not a named verb.
      assert.deepEqual(verbCensus(`${commands.code}\nawait context.invoke("work:drive", {}, { workspace });`).strays, ["work:drive"], "red probe: a seventh verb is seen, by name");
      assert.deepEqual(verbCensus(commands.code.replaceAll('"mesh:status"', '"work:list"')).unreached, ["mesh:status"], "red probe: an allowed verb no command reaches is seen, by name");
      assert.deepEqual(verbCensus(`${commands.code}\nawait context.invoke(verbId, {}, { workspace });`).strays, ["?"], "red probe: a verb that is not a literal is a stray");
    },
  },
  {
    name: "arch/131 FF-13113 + arch/191 FF-19106 (acd-loop-ask-answered-from-discord): fixture — every command the table registers is deferred before any dispatch, a view privately and an action in the channel; an autocomplete is no command and is never deferred; a user not in allow reaches nothing; a handed-back done declaration yields its row",
    run: async () => {
      // EVERY command of the table, read from the table (FF-19106): a row added later is run here
      // too, and must say in COMMAND_FLAGS where it answers.
      const registered = registeredCommands();
      assertRead("the commands the table registers", registered.length, 8, "command(s)");
      assert.deepEqual(registered.map(([key]) => key).sort(), Object.keys(COMMAND_FLAGS).sort(), "COMMAND_FLAGS says where each registered command answers, and names no command the table lacks");
      for (const [key, command] of registered) {
        const label = `/${key}`;
        const flags = COMMAND_FLAGS[key];
        const world = commandWorld();
        await handleInteraction(interactionOf(command, "222222222222222222"), world.context);
        const firstInvoke = world.sequence.findIndex((entry) => entry.kind === "invoke");
        const callback = world.sequence.findIndex((entry) => entry.kind === "request" && entry.route.endsWith("/callback"));
        assert.ok(callback === 0 && firstInvoke > callback, `${label} dispatched before its type 5 callback — the deferral must be the first thing sent (ADR-009 §4): ${world.sequence.map((entry) => entry.kind === "invoke" ? `invoke ${entry.id}` : `${entry.method} ${entry.route}`).join(" → ")}`);
        assert.equal(world.sequence[callback].body.type, 5, `${label}: a type 5 callback`);
        assert.equal(world.sequence[callback].body.data?.flags ?? null, flags, `${label}: ${flags == null ? "in-channel" : "ephemeral"}`);
      }
      // 191/05: an AUTOCOMPLETE interaction is not a command. It is never deferred (Discord allows no
      // deferral for type 4) and dispatches no verb: its one request is the type 8 callback.
      const typing = commandWorld();
      await handleInteraction({ ...interactionOf({ name: "status", options: [{ type: 3, name: "project", value: "", focused: true }] }, "222222222222222222"), type: 4 }, typing.context);
      assert.deepEqual(typing.sequence.map((entry) => entry.kind === "invoke" ? `invoke ${entry.id}` : `${entry.method} ${entry.route} type ${entry.body?.type}`), ["POST /interactions/700000000000000001/t/callback type 8"], "an autocomplete sends one type 8 callback: no type 5, no verb");

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
  {
    name: "arch/191 FF-19107 (acd-loop-ask-answered-from-discord): structural — discord-buttons.mjs reaches only work:answer, work:loop and mesh:session-start and imports no child_process, and only it spells a custom_id",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const buttons = units.find(({ rel }) => rel === BUTTONS_MODULE);
      assert.ok(buttons != null, `NOT FOUND: ${BUTTONS_MODULE} — the module FF-19107 governs has moved`);
      const dispatched = commandDispatches(buttons.code);
      assertRead(`the invoke( calls in ${BUTTONS_MODULE}`, dispatched.length, 3, "call(s)");
      const strays = dispatched.filter((id) => !BUTTON_VERBS.includes(id));
      assert.deepEqual(strays, [], `every invoke( in ${BUTTONS_MODULE} names ${BUTTON_VERBS.join(", ")} — it also names ${strays.join(", ")}. A button reaches what a reply or a command reaches (ADR-007's invariant)`);
      assert.deepEqual([...new Set(dispatched)].sort(), [...BUTTON_VERBS].sort(), "and each of the three is reached");
      assert.deepEqual(childProcessImporters([buttons]), [], `${BUTTONS_MODULE} imports no child_process`);

      const spellers = buttonIdSpellers(units);
      assert.deepEqual(spellers, [BUTTONS_MODULE], `a custom_id prefix (${BUTTON_ID_PREFIXES.join(", ")}) is spelled only in ${BUTTONS_MODULE} — spelled in ${spellers.join(", ")}. Build an id with buttonId(), read one with parseButtonId() (ADR-007 §4)`);
      for (const prefix of BUTTON_ID_PREFIXES) assert.ok(buttons.code.includes(`"${prefix}"`), `NON-VACUOUS: ${BUTTONS_MODULE} spells "${prefix}"`);

      // The red probes run the SHIPPED detectors over patched units.
      const spawning = units.map((unit) => unit.rel === BUTTONS_MODULE ? { ...unit, code: `import { spawn } from "node:child_process";\n${unit.code}` } : unit);
      assert.deepEqual(childProcessImporters(spawning).filter((rel) => rel === BUTTONS_MODULE), [BUTTONS_MODULE], "red probe: a child_process import in the buttons module is seen");
      assert.deepEqual(commandDispatches(`${buttons.code}\nawait context.invoke("work:drive", {}, {});`).filter((id) => !BUTTON_VERBS.includes(id)), ["work:drive"], "red probe: a fourth verb is seen, by name");
      const respelled = units.map((unit) => unit.rel === "packages/messaging/src/discord.mjs" ? { ...unit, code: `${unit.code}\nconst id = "aof:resume";\n` } : unit);
      assert.deepEqual(buttonIdSpellers(respelled).sort(), [BUTTONS_MODULE, "packages/messaging/src/discord.mjs"].sort(), "red probe: a second spelling is seen, by file");
    },
  },
  {
    name: "arch/191 FF-19107 (acd-loop-ask-answered-from-discord): fixture — a custom_id carrying extra segments naming another project dispatches into the index record's workspace, never the id's",
    run: async () => {
      const handleButton = _aofApplication.messaging.discord.buttons.handleButton;
      const recordAskMessage = _aofApplication.messaging.askMessages.recordAskMessage;
      const os = await import("node:os");
      const { mkdtemp, rm } = await import("node:fs/promises");
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-ff-19107-"));
      const previous = process.env.AOF_GLOBAL_HOME;
      process.env.AOF_GLOBAL_HOME = path.join(tmp, "home");
      try {
        const channel = "111111111111111111";
        const home = { projectRoot: path.join(tmp, "alpha"), config: { work: { notify: { channels: { discord: { type: "discord", channelId: channel, allow: ["222222222222222222"] } } } } } };
        const other = { projectRoot: path.join(tmp, "beta"), config: home.config };
        await recordAskMessage({ messageId: "900100000000000001", channelId: channel, event: "loop-halted", ref: "191/02", workspaceId: "ws-a", projectRoot: home.projectRoot, scope: "191", nodeId: "node-a" });
        const dispatched = [];
        const context = {
          request: async () => ({ ok: true, status: 200, json: null }),
          invoke: async (id, input, ctx) => { dispatched.push({ id, input, root: ctx?.workspace?.projectRoot }); return { ok: true, nodeId: "node-a", name: "alpha · s1", link: null }; },
          loadWorkspace: async (root) => (root === home.projectRoot ? home : root === other.projectRoot ? other : { projectRoot: root, config: {} }),
          answerContext: {},
        };
        const press = (customId) => handleButton({
          id: "600000000000000001", token: "t", application_id: "800000000000000000", type: 3, channel_id: channel,
          member: { user: { id: "222222222222222222", username: "umami" } },
          message: { id: "900100000000000001", channel_id: channel }, data: { custom_id: customId },
        }, context);
        await press(`aof:resume:${other.projectRoot}:ws-b:999`);
        await press("aof:session:ws-b:192/00:node-b");
        assert.deepEqual(dispatched.map(({ id, input, root }) => ({ id, input, root })), [
          { id: "work:loop", input: { scope: "191", handOff: true }, root: home.projectRoot },
          { id: "mesh:session-start", input: { project: "ws-a", item: "191/02", node: "node-a", waitMs: 45000 }, root: home.projectRoot },
        ], "the scope, item, node, project and workspace are the index record's — nothing from the id's extra segments");
      } finally {
        if (previous === undefined) delete process.env.AOF_GLOBAL_HOME;
        else process.env.AOF_GLOBAL_HOME = previous;
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },
];
