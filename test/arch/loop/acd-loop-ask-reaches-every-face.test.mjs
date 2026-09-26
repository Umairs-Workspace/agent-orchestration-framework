// FF-13106 + FF-13107 + FF-13108 + FF-13109 + FF-13110 — THE ASK REACHES EVERY FACE THROUGH ONE
// NOTIFIER, ONE FORM, ONE GUARDED ROUTE AND ONE AUTHORISED DOOR (milestone 131 / stories 06 and 09;
// ARCHITECTURE `## Fitness functions`, ADR-005, ADR-006 and ADR-007). Which of this directory's three subjects: the RECORD — the envelope the
// notifier sends, the form every face renders it in and the answer the board carries back are how
// the ask record is read and written outside the loop, and these are the controls on each face.
//
// FF-13106, structural then fixture — AMENDED at 131/09 (ADR-007): the credential is a bot token.
// The `work.notify` schema is closed and a channel names its Discord channel by `channelId` and its
// token override only by `tokenEnv`: no `url`, `webhook`, `token` or `urlEnv` property at any
// level. Neither `.aof/aof.config.json` nor `src/**` holds a `discord.com/api/webhooks` literal
// (the ban stands); inside `src/notify/` the token is read only as `env[<…tokenEnv>]` or — as
// amended at 131/08 — through `readMessagingSecret(`, called by `notify.mjs` alone; the `messaging`
// store segment is joined into a path only in `src/notify/secret.mjs`, and
// `src/commands/messaging/messaging.mjs` reaches the store only through it (its red probe: the verbs
// module joining the segment itself, run against the shipped detector). No degrade call's MESSAGE
// names the token — the redaction pass in `notify.mjs` is a backstop, so the fixture alone could
// never see a token interpolated into the message it redacts (the register's red probe; this is
// the leg that sees it). Fixture with a degrade-sink spy: `notify` against a fetch that throws,
// answers 500, answers 429 or hangs past the bound resolves `{ delivered: [], failed: [name] }`,
// never rejects, and no degrade message carries the token. `renderDiscord` over a 3,000-character
// ask with an open fence keeps line 1, the action line and the link inside 2,000 characters,
// balances the fence, allows no mention and sets no `username`.
//
// FF-13107, structural. Every `notify(` call under `src/` (comment-stripped, the definition in
// `src/notify/notify.mjs` excluded, calls of the imported binding only — task 00 ruling 7) is one
// of ADR-005 §4's six sites, enumerated by file and by the event literals its envelopes are built
// with; each site's module builds its envelope through `buildNotifyEnvelope`, whose keys
// deep-equal the eleven, and `EVENTS` holds seven. NON-VACUOUS: the sweep finds six sites. AMENDED at
// 131/12 (ADR-010 §4-§5): SEVEN sites — `session-needs-input` gains `announceWorkerAsk` in
// `src/mesh/park-resume.mjs` (the control's post of a worker's ask), and `session-answered` stays ONE
// call in `src/commands/resume.mjs`, serving both the local and the mesh leg.
//
// FF-13108, structural then fixture. `src/notify/form.mjs` imports nothing, and its direct importers
// are `src/loop/ask.mjs`, `src/notify/discord.mjs` and `ui/src/board/action.mjs` (task 00 ruling 3:
// the shell renders its ask block through `ask.mjs`'s `askBlockLines`, and spells no phrase of its
// own). `waiting on you` is spelled in no other comment-stripped `src/**` or `ui/src/**` module, and
// no module but `form.mjs` DEFINES `formatElapsed` (ruling 9: the register's red probe, a second
// ladder, imports nothing and need not spell the phrase). The one `ui/src/**` specifier that
// resolves outside `ui/src` is the board's import of the form. Fixture: `accountLine` and the
// Discord line 1 share a byte-identical `<ref> — <phrase> (<phase>, <elapsed>)`.
//
// FF-13109, structural then fixture. In `src/board-ui.mjs` every body read (`readJsonBody(`) is
// preceded, in its own branch, by `admitWriteRequest(`; the answer branch lifts exactly
// `body.ref`, `body.text` and `body.actor`. Both faces' `admitWriteRequest` call `isLoopbackHost(`,
// and a rebinding request (`Host: evil.example:1234`, its Origin matching) is refused
// `non-loopback-host` on the board and on the fleet. `ui/src/**` holds one
// `fetch("/api/work/answer"`, and `AskCard.tsx` renders no `Markdown`, sets no placeholder, keys on
// `item.ask` and holds its buttons under ruling 4: one SEND button, at most one clamp toggle.
//
// FF-13114, structural then fixture (131/12, ADR-010). `ask` rides an `assignment.reported` payload only
// on the running + needs-input park, and every other report's key set is unchanged.
// `announceWorkerAsk(` is called only from the `settle-assignment` reactor, behind the
// not-already-`needs-input` edge. Fixture: one park fact with `ask`, applied through the real
// reactor, writes the row's `ask`, projects `execution.ask`, gives the board row a non-null question
// and posts once with the worker's node; re-applying the same fact posts nothing.
//
// FF-13110, structural then fixture (131/09, ADR-007 §4). Over a comment-stripped sweep of
// `src/**`, a string that opens `Bot ` (the `Authorization` value) and the host `discord.com/api`
// are spelled only in `src/notify/discord.mjs`, whose `discordRequest` is their one builder;
// `src/discord/**` calls `fetch` nowhere and, when it exists, reaches Discord through
// `discordRequest`. NON-VACUOUS: the sweep finds `discord.mjs` and at least one `discordRequest(`
// call. `isDiscordBotToken` accepts a three-segment token whose first segment decodes to a snowflake
// and refuses a webhook URL, and it is the `discord` entry's `accepts`. Fixture: `sendDiscord`
// against a fetch answering 200 `{ id }` answers that `messageId`, `notify` answers it in
// `messages`, and 401 or 403 degrades `notify-delivery-failed` naming the status with no degrade
// message holding the token.
//
// Every sweep reports what it read; every cut is on the language's own structure through
// `test/support/source-slice.mjs`.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { computedDynamicImports, importSpecifiers } from "../../support/module-family.mjs";
import { functionBody, matchedBraceBody, matchedParenSpan, stripComments, topLevelArguments } from "../../support/source-slice.mjs";
import { withPublishedAssignFixture } from "../../support/mesh-ui-assign-fixture.mjs";
import { setDegradeSinkForTest } from "../../../src/degrade.mjs";
import { isDiscordBotToken, renderDiscord, sendDiscord } from "../../../src/notify/discord.mjs";
import { accountLine, cost, headline } from "../../../src/notify/form.mjs";
import { CHANNELS, EVENTS, buildNotifyEnvelope, notify } from "../../../src/notify/notify.mjs";
import { serveSetupUi } from "../../../src/setup-ui.mjs";
import { withMeshAssignFixture } from "../../support/mesh-assign-fixture.mjs";
import { reportAssignmentSettled } from "../../../src/effects/assignment-transitions.mjs";
import { effectsFor } from "../../../src/effects/table.mjs";
import { openGlobalWorkProjectionStore } from "../../../src/global-work-store.mjs";
import { readExecutionOverlay } from "../../../src/board-mesh-execution.mjs";
import { invoke } from "../../../src/command-core.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const toPosix = (value) => String(value).split(path.sep).join("/");

const NOTIFY_DIR = "src/notify/";
const NOTIFY = "src/notify/notify.mjs";
// FF-13106 as amended at 131/08: the machine-wide store's one home and the verbs that reach it.
const SECRET_STORE = "src/notify/secret.mjs";
// 131/10 (ADR-008 §4): the ask-message index reads its own records beside the store, never a secret.
const ASK_INDEX = "src/notify/ask-messages.mjs";
const MESSAGING_VERBS = "src/commands/messaging/messaging.mjs";
const STORE_SEGMENT = /^(["'`])messaging(?:\1|\/)/u;
const FORM = "src/notify/form.mjs";
const WEBHOOK_LITERAL = "discord.com/api/webhooks";
// Compared lowercased: `urlEnv` is the webhook-era override FF-13106 forbids since 131/09.
const FORBIDDEN_CHANNEL_KEYS = Object.freeze(["url", "webhook", "token", "urlenv"]);
// FF-13110 — the one authorised door (ADR-007 §4).
const DOOR = "src/notify/discord.mjs";
const API_HOST = "discord.com/api";
const BOT_FAMILY = "src/discord/";
// FF-13114 — a worker's ask rides the park fact (131/12, ADR-010).
const REACTOR_TABLE = "src/effects/table.mjs";
const REPORT_KEYS = Object.freeze(["assignmentId", "state", "runId", "sessionId", "branch", "code"]);
const WORKER_ASK = Object.freeze({ question: "Decision needed: split 35/00?", phase: "build", askedAt: "2026-09-25T11:48:00.000Z" });
const NOW_ISO = "2026-09-25T12:00:00.000Z";
// ADR-005 §4 — the six firing points: each `notify(` call by file, with the event(s) its envelope
// is built for. The death site builds one envelope whose event is `loop-relaunched` or `loop-died`.
const FIRING_SITES = Object.freeze([
  "src/commands/item-status.mjs milestone-accepted",
  "src/commands/loop.mjs loop-died/loop-relaunched",
  "src/commands/loop.mjs loop-halted",
  "src/commands/resume.mjs session-answered",
  "src/loop/ask.mjs session-needs-input",
  "src/loop/ask.mjs session-parked-unanswered",
  // 131/12 (ADR-010 §4) — the control's post of a worker's ask, on the edge into needs-input.
  "src/mesh/park-resume.mjs session-needs-input",
]);
const SEVEN = FIRING_SITES.length;
const ENVELOPE_KEYS = Object.freeze(["event", "ref", "at", "node", "phase", "elapsedMs", "question", "stop", "outcome", "answerPath", "link"]);
// Task 00 ruling 3: the form's direct importers — and, as amended at 131/11 (ADR-009 §5), the slash
// commands' renders, which read a waiting row exactly as the terminal and the posted message do.
const FORM_IMPORTERS = Object.freeze(["src/discord/commands.mjs", "src/loop/ask.mjs", "src/notify/discord.mjs", "ui/src/board/action.mjs"]);
const SHELL = "src/commands/loop.mjs";
const PHRASES = Object.freeze(["waiting on you", "answered by", "parked, unanswered", "loop halted", "loop died", "loop relaunched"]);
const THE_PHRASE = "waiting on you";
const UI_OUTSIDE = Object.freeze([{ file: "ui/src/board/action.mjs", specifier: "../../../src/notify/form.mjs" }]);
const UI_EXTENSIONS = /\.(?:mjs|mts|ts|tsx|js)$/u;
const BOARD = "src/board-ui.mjs";
const FLEET = "src/mesh/ui-serve.mjs";
const ANSWER_ROUTE = "/api/work/answer";
const ANSWER_FIELDS = Object.freeze(["actor", "ref", "text"]);
const ASK_CARD = "ui/src/board/AskCard.tsx";
const REBIND = "evil.example:1234";

function assertRead(what, count, floor, unit = "file(s)") {
  assert.ok(count >= floor, `NOTHING WAS READ: ${what} walked ${count} ${unit}, below its floor of ${floor} — a rename, a moved directory or a truncated read must fail here rather than pass vacuously over an empty sweep`);
}

function resolved(fromRel, specifier) {
  if (specifier.startsWith("node:") || !specifier.startsWith(".")) return specifier;
  const joined = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), specifier));
  return /\.[cm]?[jt]sx?$/u.test(joined) ? joined : `${joined}.mjs`;
}

async function srcUnits() {
  const units = [];
  for (const file of await readSrcFiles(repoRoot)) {
    const raw = await readFile(file.path, "utf8");
    units.push({ rel: `src/${toPosix(file.rel)}`, raw, code: stripComments(raw) });
  }
  return units;
}

// ONE read of `ui/src/**` script modules, comment-stripped, declaration files marked.
async function uiUnits() {
  const units = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (UI_EXTENSIONS.test(entry.name)) {
        const raw = await readFile(full, "utf8");
        units.push({ rel: toPosix(path.relative(repoRoot, full)), raw, code: stripComments(raw), declaration: /\.d\.[cm]?ts$/u.test(entry.name) });
      }
    }
  };
  await walk(path.join(repoRoot, "ui", "src"));
  return units;
}

const unitOf = (units, rel) => {
  const unit = units.find((entry) => entry.rel === rel);
  assert.ok(unit != null, `NOT FOUND: ${rel} was not read — the control cannot claim anything about a module it did not read`);
  return unit;
};

// Every call of the imported `notify` binding — `notify(` not preceded by a word character, `.` or
// `$`, and not the definition — as `"<file> <event>[/<event>]"`: the events are the quoted EVENTS in
// the first argument of the builder call that binds the envelope the call sends (`const e =
// buildNotifyEnvelope(…)`, or a local helper wrapping it, `ask.mjs`'s `envelopeAt`); an envelope
// that cannot be traced to a builder reads `?`. PURE, so the non-vacuity probe can misspell the needle.
export function notifySites(units, needle = "notify") {
  const re = new RegExp(`(?<![\\w$.])${needle}\\s*\\(`, "gu");
  const helperRe = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*\([^)]*\)\s*=>\s*buildNotifyEnvelope\s*\(/gu;
  const sites = [];
  for (const { rel, code } of units) {
    const builders = ["buildNotifyEnvelope", ...[...code.matchAll(helperRe)].map((match) => match[1])];
    for (const match of code.matchAll(re)) {
      if (/function\s*$/u.test(code.slice(Math.max(0, match.index - 16), match.index))) continue;
      const args = topLevelArguments(matchedParenSpan(code, match.index)?.body ?? "");
      const envelope = (args[1] ?? "").trim().replace(/[^\w$]/gu, "");
      const bindRe = new RegExp(`\\bconst\\s+${envelope}\\s*=\\s*(?:${builders.join("|")})\\s*\\(`, "gu");
      const bind = envelope === "" ? null : [...code.slice(0, match.index).matchAll(bindRe)].at(-1);
      const first = bind == null ? "" : topLevelArguments(matchedParenSpan(code, bind.index + bind[0].length - 1)?.body ?? "")[0] ?? "";
      const events = [...first.matchAll(/["']([a-z-]+)["']/gu)].map((literal) => literal[1]).filter((event) => EVENTS.includes(event)).sort();
      sites.push(`${rel} ${events.join("/") || "?"}`);
    }
  }
  return sites;
}

// The EXPRESSION text of one argument: every `${…}` interpolation, and the argument with its string
// and template literals removed — so a word in a message's prose ("no bot token") is not a use of the
// binding, while `${token}` and a bare `token` are.
function expressionsOf(arg) {
  const interpolated = [...arg.matchAll(/\$\{([^}]*)\}/gu)].map((match) => match[1]);
  const bare = arg.replace(/`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/gu, " ");
  return [bare, ...interpolated];
}

// Each `degrade(` / `reportDegrade(` call in `code` whose MESSAGE names the token (as amended at
// 131/09; the URL before it): every argument of `reportDegrade(`, and every argument but the third
// (the redaction input) of `degrade(`, read for the `token` binding as an expression.
export function degradeMessagesNamingToken(code) {
  const found = [];
  for (const match of code.matchAll(/(?<![\w$.])(reportDegrade|degrade)\s*\(/gu)) {
    if (/function\s*$/u.test(code.slice(Math.max(0, match.index - 16), match.index))) continue;
    const span = matchedParenSpan(code, match.index);
    if (span == null) continue;
    const args = topLevelArguments(span.body);
    const message = match[1] === "degrade" ? args.filter((_, index) => index !== 2) : args;
    if (message.some((arg) => expressionsOf(arg).some((text) => /(?<![\w$])token(?![\w$])/u.test(text)))) found.push(`${match[1]}(${span.body.trim().slice(0, 120)})`);
  }
  return found;
}

// storePathJoins(units) → the file of every `path.join(`/`path.resolve(` (or a bare imported
// `join(`/`resolve(`) whose top-level arguments hold the `messaging` store segment as a literal —
// one entry per join. Units are comment-stripped. The leg and its red probe both run THIS detector.
export function storePathJoins(units) {
  const found = [];
  for (const { rel, code } of units) {
    for (const match of code.matchAll(/(?:(?<![\w$.])path(?:\.posix|\.win32)?\.|(?<![\w$.]))(?:join|resolve)\s*\(/gu)) {
      const span = matchedParenSpan(code, match.index);
      if (span == null) continue;
      if (topLevelArguments(span.body).some((arg) => STORE_SEGMENT.test(arg))) found.push(rel);
    }
  }
  return found;
}

// wireSpellers(units) → per FF-13110 needle, the files whose comment-stripped code spells it: a
// string literal opening `Bot ` (the Authorization value), and the API host. PURE, so the red probe
// runs the shipped detector over a patched unit.
export function wireSpellers(units) {
  return {
    bot: units.filter(({ code }) => /["'`]Bot\s/u.test(code)).map(({ rel }) => rel),
    host: units.filter(({ code }) => code.includes(API_HOST)).map(({ rel }) => rel),
  };
}

// The start of the brace block that encloses `index`.
function enclosingBlockStart(code, index) {
  let depth = 0;
  for (let i = index; i >= 0; i -= 1) {
    if (code[i] === "}") depth += 1;
    else if (code[i] === "{") {
      if (depth === 0) return i;
      depth -= 1;
    }
  }
  return -1;
}

// Every body read in the board, each with its branch's name and whether `admitWriteRequest(` is
// called in that branch before the read. PURE over the stripped source.
export function bodyReads(code) {
  const reads = [];
  for (const match of code.matchAll(/(?<![\w$.])readJsonBody\s*\(/gu)) {
    if (/function\s*$/u.test(code.slice(Math.max(0, match.index - 16), match.index))) continue;
    const start = enclosingBlockStart(code, match.index);
    // The branch's name is whichever opener sits nearest above its block: a route test or a handler.
    const head = code.slice(0, start);
    const openers = [
      ...[...head.matchAll(/pathname\s*===\s*["']([^"']+)["']/gu)].map((opener) => ({ at: opener.index, name: opener[1] })),
      ...[...head.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*async\b/gu)].map((opener) => ({ at: opener.index, name: opener[1] })),
    ].sort((a, b) => a.at - b.at);
    const route = openers.at(-1)?.name ?? "<unnamed branch>";
    reads.push({ route, admitted: code.slice(start, match.index).includes("admitWriteRequest(") });
  }
  return reads;
}

// The `<button` elements of a TSX source, each with the calls its `onClick` makes.
export function buttonsOf(code) {
  const buttons = [];
  for (const match of code.matchAll(/<button\b/gu)) {
    let depth = 0;
    let end = match.index;
    for (let i = match.index; i < code.length; i += 1) {
      if (code[i] === "{") depth += 1;
      else if (code[i] === "}") depth -= 1;
      else if (code[i] === ">" && depth === 0) { end = i; break; }
    }
    const tag = code.slice(match.index, end);
    const at = tag.search(/\bonClick\s*=\s*\{/u);
    const handler = at === -1 ? "" : matchedBraceBody(tag, at) ?? "";
    const calls = [...handler.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/gu)].map((call) => call[1]);
    buttons.push({ calls });
  }
  return buttons;
}

function request(url, { route, host, origin }) {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const outgoing = http.request({ hostname: target.hostname, port: target.port, method: "POST", path: route, headers: { host, origin, "content-type": "application/json" } }, (response) => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { text += chunk; });
      response.on("end", () => {
        let body = null;
        try { body = JSON.parse(text); } catch { body = text; }
        resolve({ status: response.statusCode, body });
      });
    });
    outgoing.on("error", reject);
    outgoing.end("{}");
  });
}

// FF-13106's and FF-13110's delivery fixture: one discord channel reading its bot token from HOOK
// (a synthetic token whose third segment is what a leak check greps for).
const TOKEN_SEGMENT = "arch-secret-token";
const SECRET = `MTIzNDU2Nzg5MDEyMzQ1Njc4.AbCdEf.${TOKEN_SEGMENT}`;
const CHANNEL_ID = "123456789012345678";
const WORKSPACE = Object.freeze({ config: { work: { notify: { channels: { ops: { type: "discord", channelId: CHANNEL_ID, tokenEnv: "HOOK" } } } } } });
const NOW = () => new Date("2026-09-25T12:00:00.000Z");
const ASK_ENVELOPE = (fields = {}) => buildNotifyEnvelope("session-needs-input", { ref: "127/02", phase: "build", elapsedMs: 720000, question: "Move the residue?", ...fields }, {
  config: { mesh: { nodeId: "aof-wsl" }, work: { notify: { channels: { ops: { type: "discord" } }, link: "https://example.test/{ref}" } } },
  now: NOW,
});
const response = (status) => ({ status, ok: status >= 200 && status < 300, headers: { get: () => null }, json: async () => ({ retry_after: 1 }) });

export const archTests = [
  {
    name: "arch/131 FF-13106 (acd-loop-ask-reaches-every-face): structural, as amended at 131/09 — the work.notify schema is closed and a channel has channelId and tokenEnv, with no url, webhook, token or urlEnv property at any level",
    run: async () => {
      const schema = JSON.parse(await readFile(path.join(repoRoot, "schemas", "aof.schema.json"), "utf8"));
      const block = schema?.$defs?.work?.properties?.notify;
      assert.ok(block != null, "NOT FOUND: $defs.work.properties.notify — the block the control governs has moved");
      assert.equal(block.additionalProperties, false, "the work.notify schema is closed");
      const channel = block.properties?.channels?.additionalProperties;
      assert.equal(channel?.additionalProperties, false, "a channel is closed");
      assert.ok(channel?.properties?.channelId != null, "a channel has channelId");
      assert.ok(channel?.properties?.tokenEnv != null, "a channel has tokenEnv");
      const names = [];
      const walk = (node) => {
        if (node == null || typeof node !== "object") return;
        if (node.properties != null && typeof node.properties === "object") names.push(...Object.keys(node.properties));
        for (const value of Object.values(node)) walk(value);
      };
      walk(block);
      assertRead("the property names under work.notify", names.length, 4, "name(s)");
      const forbidden = names.filter((name) => FORBIDDEN_CHANNEL_KEYS.includes(name.toLowerCase()));
      assert.deepEqual(forbidden, [], `a channel has channelId and tokenEnv and no url, webhook, token or urlEnv property at any level — found ${forbidden.join(", ")}: the bot token is the credential (ADR-007 §3)`);
    },
  },
  {
    name: "arch/131 FF-13106 (acd-loop-ask-reaches-every-face): structural, as amended at 131/09 — no discord.com/api/webhooks literal in the config or src/**, the token is read only as env[tokenEnv] or through readMessagingSecret inside src/notify/, and no degrade message contains the token",
    run: async () => {
      const config = await readFile(path.join(repoRoot, ".aof", "aof.config.json"), "utf8");
      assert.ok(!config.includes(WEBHOOK_LITERAL), `.aof/aof.config.json contains no ${WEBHOOK_LITERAL} literal`);
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const literal = units.filter(({ raw }) => raw.includes(WEBHOOK_LITERAL)).map(({ rel }) => rel);
      assert.deepEqual(literal, [], `src/** contains no ${WEBHOOK_LITERAL} literal — found in ${literal.join(", ")}`);

      const family = units.filter(({ rel }) => rel.startsWith(NOTIFY_DIR));
      assertRead(`the ${NOTIFY_DIR} family`, family.length, 3);
      const reads = family.flatMap(({ rel, code }) => [...code.matchAll(/\benv\s*(?:\?\.)?\s*\[/gu)].map((match) => {
        const close = code.indexOf("]", match.index);
        return { rel, index: code.slice(match.index, close + 1) };
      }));
      assertRead(`the env[…] reads in ${NOTIFY_DIR}`, reads.length, 1, "read(s)");
      const stray = reads.filter(({ index }) => !/tokenEnv\s*\]$/u.test(index));
      assert.deepEqual(stray.map(({ rel, index }) => `${rel}: ${index}`), [], "inside src/notify/ the token is read only as env[<tokenEnv>]");
      // As amended at 131/08: the second read is the machine-wide store, called from the notifier
      // alone (the store module's own calls are its definition's neighbours, not a second read), and
      // the store's file is read by its own module alone.
      const storeReads = family.filter(({ rel }) => rel !== SECRET_STORE).flatMap(({ rel, code }) => [...code.matchAll(/(?<![\w$.])readMessagingSecret\s*\(/gu)]
        .filter((match) => !/function\s*$/u.test(code.slice(Math.max(0, match.index - 16), match.index)))
        .map(() => rel));
      assertRead(`the readMessagingSecret( calls in ${NOTIFY_DIR}`, storeReads.length, 1, "call(s)");
      assert.deepEqual([...new Set(storeReads)], [NOTIFY], `inside src/notify/ the stored token is read only by ${NOTIFY} through readMessagingSecret — found in ${storeReads.join(", ")}`);
      const fileReads = family.filter(({ code }) => /(?<![\w$.])readFile(?:Sync)?\s*\(/u.test(code)).map(({ rel }) => rel).sort();
      assert.deepEqual(fileReads, [ASK_INDEX, SECRET_STORE].sort(), `inside src/notify/ only ${SECRET_STORE} (the store) and ${ASK_INDEX} (the ask-message index, 131/10) read a file — found ${fileReads.join(", ")}`);
      const index = family.find(({ rel }) => rel === ASK_INDEX);
      assert.ok(index != null && !/\.secret\b|messagingSecretPath|readMessagingSecret/u.test(index.code), `${ASK_INDEX} reads its own records and never the secret`);
      const processEnv = family.filter(({ code }) => /\bprocess\s*\.\s*env\s*(?:\.|\?\.|\[)/u.test(code)).map(({ rel }) => rel);
      assert.deepEqual(processEnv, [], `src/notify/ reads no process.env member of its own — the env is handed in: ${processEnv.join(", ")}`);

      const naming = family.flatMap(({ rel, code }) => degradeMessagesNamingToken(code).map((call) => `${rel}: ${call}`));
      assert.deepEqual(naming, [], `no degrade message contains the token — a degrade call's message names it: ${naming.join(" | ")}. Name the channel and the cause, never the credential (ADR-007)`);
      assert.equal(degradeMessagesNamingToken("degrade(\"notify-delivery-failed\", `failed to deliver with ${token}`, token);").length, 1, "self-check: a token interpolated into the message is seen, whatever the redaction pass would do");
      assert.equal(degradeMessagesNamingToken("degrade(\"notify-delivery-failed\", `failed (${detail}) — no bot token`, token);").length, 0, "self-check: the token handed in for redaction, and the word in prose, are not a use");
    },
  },
  {
    name: "arch/131 FF-13106 (acd-loop-ask-reaches-every-face): structural, as amended at 131/08 — the messaging store segment is joined into a path only in src/notify/secret.mjs, and src/commands/messaging/messaging.mjs reaches the store only through it",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const joins = storePathJoins(units);
      assertRead("the messaging store path joins in src/**", joins.length, 1, "join(s)");
      assert.deepEqual([...new Set(joins)], [SECRET_STORE], `the messaging store's path is spelled only in ${SECRET_STORE} — a second home joins it in ${joins.filter((rel) => rel !== SECRET_STORE).join(", ")}`);
      const verbs = units.find(({ rel }) => rel === MESSAGING_VERBS);
      assert.ok(verbs != null, `NOT FOUND: ${MESSAGING_VERBS} — the module the leg governs has moved`);
      const reached = importSpecifiers(verbs.code).map(({ specifier }) => resolved(MESSAGING_VERBS, specifier));
      assert.ok(reached.includes(SECRET_STORE), `${MESSAGING_VERBS} reaches the store through ${SECRET_STORE} — it imports ${reached.join(", ")}`);
      assert.ok(!/\.secret\b/u.test(verbs.code), `${MESSAGING_VERBS} names no store file of its own`);
      // The red probe runs against the SHIPPED detector: the verbs module joining the segment itself.
      const probe = units.map((unit) => unit.rel === MESSAGING_VERBS
        ? { ...unit, code: `${unit.code}\nconst mine = path.join(defaultGlobalWorkspaceDir(), "messaging", "discord.secret");\n` }
        : unit);
      assert.deepEqual([...new Set(storePathJoins(probe))].sort(), [MESSAGING_VERBS, SECRET_STORE].sort(), "red probe: a second join of the segment is seen, by file");
    },
  },
  {
    name: "arch/131 FF-13106 (acd-loop-ask-reaches-every-face): fixture — notify against a fetch that throws, answers 500, answers 429 or hangs past the bound resolves { delivered: [], failed: [name] }, never rejects, and no degrade message contains the token",
    run: async () => {
      const events = [];
      try {
        for (const [label, fetch] of [
          ["throws", async () => { throw new TypeError(`fetch failed for ${SECRET}`); }],
          ["500", async () => response(500)],
          ["429", async () => response(429)],
          ["hangs", () => new Promise(() => {})],
        ]) {
          events.length = 0;
          // Re-armed per row: `reportDegrade` throttles per code, and a sink left armed would hide
          // this row's event behind the previous row's.
          setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
          let result;
          try {
            result = await notify(WORKSPACE, ASK_ENVELOPE(), { env: { HOOK: SECRET }, fetch, timeoutMs: 50 });
          } catch (error) {
            assert.fail(`${label}: notify never rejects — it rejected with ${error?.message}`);
          }
          assert.deepEqual({ delivered: result.delivered, failed: result.failed }, { delivered: [], failed: ["ops"] }, `${label}: notify resolves { delivered: [], failed: [name] }`);
          const seen = events.filter((event) => String(event.code).startsWith("notify-"));
          assertRead(`${label}: the degrade events`, seen.length, 1, "event(s)");
          const leaked = seen.filter((event) => JSON.stringify(event).includes(SECRET) || JSON.stringify(event).includes(TOKEN_SEGMENT));
          assert.deepEqual(leaked.map((event) => event.message), [], `${label}: no degrade message contains the token`);
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "arch/131 FF-13106 (acd-loop-ask-reaches-every-face): fixture — renderDiscord over a 3,000-character ask with an open fence keeps line 1, the action line and the link inside 2,000 characters, balances the fence, allows no mention and sets no username",
    run: () => {
      const question = `\`\`\`js\n${"x".repeat(194)}\n${"y ".repeat(1402)}`;
      assert.ok(question.length >= 3000, "the ask is 3,000 characters");
      const whole = renderDiscord(ASK_ENVELOPE({ question: "short" })).content.split("\n");
      const body = renderDiscord(ASK_ENVELOPE({ question }));
      const lines = body.content.split("\n");
      assert.ok(body.content.length <= 2000, `renderDiscord is at most 2,000 characters — ${body.content.length}`);
      assert.equal(lines[0], whole[0], "line 1 is kept");
      assert.equal(lines.at(-2), whole.at(-2), "the action line is kept");
      assert.equal(lines.at(-1), whole.at(-1), "the link is kept");
      assert.ok(lines.at(-2).includes("aof work answer 127/02"), `the action line is the answer command: ${lines.at(-2)}`);
      assert.equal((body.content.split("```").length - 1) % 2, 0, "the fence is balanced");
      assert.deepEqual(body.allowed_mentions, { parse: [] }, "allowed_mentions: { parse: [] }");
      assert.equal(Object.hasOwn(body, "username"), false, "a bot sets no username (ADR-007 §5)");
    },
  },
  {
    name: "arch/131 FF-13110 (acd-loop-ask-reaches-every-face): structural — the Bot authorization and the API host are spelled only in src/notify/discord.mjs, whose discordRequest is their builder, and src/discord/** calls fetch nowhere",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const door = unitOf(units, DOOR);
      const spelled = wireSpellers(units);
      assert.deepEqual(spelled.bot, [DOOR], `a string opening "Bot " (the Authorization value) is spelled only in ${DOOR} — found in ${spelled.bot.join(", ")}. Put the token on the wire through discordRequest (ADR-007 §4)`);
      assert.deepEqual(spelled.host, [DOOR], `the host ${API_HOST} is spelled only in ${DOOR} — found in ${spelled.host.join(", ")}. Reach Discord through discordRequest (ADR-007 §4)`);
      const builder = functionBody(door.code, "export async function discordRequest(");
      assert.ok(builder != null, `NOT FOUND: discordRequest in ${DOOR}`);
      assert.match(builder, /["'`]Bot\s/u, "discordRequest builds the Bot authorization itself");
      const calls = units.flatMap(({ rel, code }) => [...code.matchAll(/(?<![\w$.])discordRequest\s*\(/gu)]
        .filter((match) => !/function\s*$/u.test(code.slice(Math.max(0, match.index - 16), match.index)))
        .map(() => rel));
      assertRead("the discordRequest( calls in src/**", calls.length, 1, "call(s)");

      const family = units.filter(({ rel }) => rel.startsWith(BOT_FAMILY));
      const fetching = family.filter(({ code }) => /(?<![\w$.])fetch\s*\(/u.test(code)).map(({ rel }) => rel);
      assert.deepEqual(fetching, [], `${BOT_FAMILY}** calls fetch nowhere — it reaches Discord through discordRequest: ${fetching.join(", ")}`);
      if (family.length > 0) {
        const through = family.filter(({ rel, code }) => importSpecifiers(code).some(({ specifier }) => resolved(rel, specifier) === DOOR));
        assert.ok(through.length > 0, `${BOT_FAMILY}** reaches Discord through ${DOOR} — none of ${family.map(({ rel }) => rel).join(", ")} imports it`);
      }

      // The red probe runs the SHIPPED detector: notify.mjs building its own Authorization header.
      const probe = units.map((unit) => unit.rel === NOTIFY
        ? { ...unit, code: `${unit.code}\nconst headers = { authorization: \`Bot \${token}\` };\n` }
        : unit);
      assert.deepEqual(wireSpellers(probe).bot.sort(), [DOOR, NOTIFY].sort(), "red probe: a second Bot authorization is seen, by file");
    },
  },
  {
    name: "arch/131 FF-13110 (acd-loop-ask-reaches-every-face): isDiscordBotToken accepts a three-segment token whose first segment decodes to a snowflake, refuses a webhook URL, and is the discord entry's accepts",
    run: () => {
      assert.equal(isDiscordBotToken(SECRET), true, "the synthetic token is a bot token");
      assert.equal(isDiscordBotToken(["https://discord.com/api", "webhooks", "1", "t"].join("/")), false, "a webhook URL is not");
      assert.equal(isDiscordBotToken(`${Buffer.from("hello").toString("base64url")}.AbCdEf.${TOKEN_SEGMENT}`), false, "a first segment that is not a snowflake is not");
      assert.equal(CHANNELS.discord.accepts, isDiscordBotToken, "the discord entry's accepts is isDiscordBotToken");
    },
  },
  {
    name: "arch/131 FF-13110 (acd-loop-ask-reaches-every-face): fixture — sendDiscord answers the posted messageId, notify answers it in messages, and 401 or 403 degrades notify-delivery-failed naming the status without the token",
    run: async () => {
      const posted = { status: 200, headers: { get: (name) => (name === "content-type" ? "application/json; charset=utf-8" : null) }, json: async () => ({ id: "1234567890123456789" }) };
      const sent = await sendDiscord(SECRET, CHANNEL_ID, { content: "x" }, { fetch: async () => posted, timeoutMs: 50 });
      assert.equal(sent.messageId, "1234567890123456789", "sendDiscord answers the posted message's id");
      const answered = await notify(WORKSPACE, ASK_ENVELOPE(), { env: { HOOK: SECRET }, fetch: async () => posted, timeoutMs: 50 });
      assert.deepEqual(answered.messages, [{ channel: "ops", channelId: CHANNEL_ID, messageId: "1234567890123456789" }], "notify answers it in messages");
      const events = [];
      try {
        for (const status of [401, 403]) {
          events.length = 0;
          setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
          const result = await notify(WORKSPACE, ASK_ENVELOPE(), { env: { HOOK: SECRET }, fetch: async () => response(status), timeoutMs: 50 });
          assert.deepEqual(result.failed, ["ops"], `${status}: the channel failed`);
          const seen = events.filter((event) => String(event.code).startsWith("notify-"));
          assert.deepEqual(seen.map((event) => event.code), ["notify-delivery-failed"], `${status}: one notify-delivery-failed`);
          assert.ok(seen[0].message.includes(String(status)), `${status}: the degrade names the status — ${seen[0].message}`);
          assert.ok(!JSON.stringify(seen).includes(TOKEN_SEGMENT), `${status}: no degrade message holds the token`);
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "arch/131 FF-13107 (acd-loop-ask-reaches-every-face): structural, as amended at 131/12 — every notify( call under src/ is one of the seven sites (ADR-005 §4, ADR-010 §4), enumerated by file and event literal, and each builds its envelope through buildNotifyEnvelope",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const sites = notifySites(units).sort();
      const strays = sites.filter((site) => !FIRING_SITES.includes(site));
      assert.deepEqual(strays, [], `every notify( call under src/ is one of the seven sites (ADR-005 §4, ADR-010 §4) — not one: ${strays.join(", ")}`);
      assert.deepEqual(sites, [...FIRING_SITES], `the seven sites each fire once, by file and event literal — found ${sites.join(", ")}`);
      for (const rel of new Set(FIRING_SITES.map((site) => site.split(" ")[0]))) {
        assert.ok(importSpecifiers(unitOf(units, rel).code).some(({ specifier }) => resolved(rel, specifier) === NOTIFY), `${rel} imports buildNotifyEnvelope and notify from ${NOTIFY}`);
      }
      const covered = [...new Set(FIRING_SITES.flatMap((site) => site.split(" ")[1].split("/")))].sort();
      assert.deepEqual(covered, [...EVENTS].sort(), "the seven sites fire the seven events between them — session-needs-input from the owner and, for a worker's ask, the control");
    },
  },
  {
    name: "arch/131 FF-13107 (acd-loop-ask-reaches-every-face): the envelope's keys deep-equal the eleven and EVENTS holds seven",
    run: () => {
      assert.equal(EVENTS.length, 7, `EVENTS holds seven — it holds ${EVENTS.length}`);
      for (const event of EVENTS) {
        assert.deepEqual(Object.keys(buildNotifyEnvelope(event, { ref: "131" })), [...ENVELOPE_KEYS], `the ${event} envelope's keys deep-equal the eleven`);
      }
    },
  },
  {
    name: "arch/131 FF-13107 (acd-loop-ask-reaches-every-face): NON-VACUOUS — the sweep finds seven sites, and reds when it finds fewer",
    run: async () => {
      const units = await srcUnits();
      const sites = notifySites(units);
      assert.ok(sites.length >= SEVEN, `the sweep finds seven sites — it found ${sites.length} (${sites.join(", ") || "none"}): a needle that finds nothing is a guard asserting over the empty set`);
      assert.equal(notifySites([{ rel: "src/x.mjs", code: "await notify(ws, envelope);" }], "notfy").length, 0, "self-check: a misspelled needle finds no site");
      assert.deepEqual(notifySites([{ rel: "src/x.mjs", code: 'export async function notify(a) {}\nawait ctx.notify(x);\nconst e = buildNotifyEnvelope("loop-halted", {});\nawait notify(ws, e);' }]), ["src/x.mjs loop-halted"], "self-check: the definition and a member call are not sites; the binding's call is, with its envelope's event");
    },
  },
  {
    name: "arch/131 FF-13108 (acd-loop-ask-reaches-every-face): structural — form.mjs imports nothing, its direct importers are the three under ruling 3, and the shell spells no event phrase of its own",
    run: async () => {
      const units = [...await srcUnits(), ...await uiUnits()];
      const form = unitOf(units, FORM);
      assert.deepEqual(importSpecifiers(form.code), [], "src/notify/form.mjs has zero imports");
      assert.deepEqual(computedDynamicImports(form.code), [], "…and no computed dynamic import");
      const importers = units.filter((unit) => !unit.declaration && importSpecifiers(unit.code).some(({ specifier }) => resolved(unit.rel, specifier) === FORM)).map(({ rel }) => rel).sort();
      assert.deepEqual(importers, [...FORM_IMPORTERS].sort(), "src/notify/form.mjs's direct importers are ask.mjs, notify/discord.mjs and ui/src/board/action.mjs (ruling 3), and discord/commands.mjs (as amended at 131/11)");
      const shell = unitOf(units, SHELL);
      const phrases = PHRASES.filter((phrase) => shell.code.includes(phrase));
      assert.deepEqual(phrases, [], `${SHELL} spells no event phrase of its own — it renders the ask block through ask.mjs's askBlockLines: ${phrases.join(", ")}`);
      assert.match(shell.code, /\baskBlockLines\s*\(/u, `${SHELL} renders the ask block through askBlockLines`);
    },
  },
  {
    name: "arch/131 FF-13108 (acd-loop-ask-reaches-every-face): structural — waiting on you is spelled in form.mjs alone, formatElapsed is defined in no module but src/notify/form.mjs, and the one ui/src specifier that leaves ui/src is the board's import of the form",
    run: async () => {
      const src = await srcUnits();
      const ui = await uiUnits();
      assertRead("the src/** sweep", src.length, 150);
      assertRead("the ui/src/** sweep", ui.length, 50);
      const units = [...src, ...ui];
      const spellers = units.filter(({ code }) => code.includes(THE_PHRASE)).map(({ rel }) => rel);
      assert.deepEqual(spellers, [FORM], `the phrase "waiting on you" is spelled in no other comment-stripped src/** or ui/src/** module — spelled in ${spellers.join(", ")}`);

      const definers = units.filter(({ code }) => /(?<!declare\s+)\bfunction\s+formatElapsed\b|\b(?:const|let|var)\s+formatElapsed\s*=/u.test(code)).map(({ rel }) => rel);
      assert.deepEqual(definers, [FORM], `formatElapsed is defined in no module but src/notify/form.mjs — defined in ${definers.join(", ")}. The elapsed ladder has one home (ADR-006 §1)`);

      const outside = [];
      for (const unit of ui) {
        for (const { specifier } of importSpecifiers(unit.code)) {
          if (!specifier.startsWith(".")) continue;
          if (!resolved(unit.rel, specifier).startsWith("ui/src/")) outside.push({ file: unit.rel, specifier });
        }
      }
      assert.deepEqual(outside, [...UI_OUTSIDE], `the only import specifier in ui/src/** that resolves outside ui/src is ../../../src/notify/form.mjs in ui/src/board/action.mjs — found ${JSON.stringify(outside)}`);
    },
  },
  {
    name: "arch/131 FF-13108 (acd-loop-ask-reaches-every-face): fixture — for one envelope, accountLine and the Discord line 1 share a byte-identical <ref> — <phrase> (<phase>, <elapsed>)",
    run: () => {
      const envelope = ASK_ENVELOPE();
      const shared = `${headline(envelope)} ${cost(envelope)}`;
      assert.equal(shared, "127/02 — waiting on you (build, 12m)", "the shared part is <ref> — <phrase> (<phase>, <elapsed>)");
      assert.ok(accountLine(envelope).startsWith(shared), `accountLine carries it: ${accountLine(envelope)}`);
      const lineOne = renderDiscord(envelope).content.split("\n")[0];
      assert.ok(lineOne.replaceAll("**", "").startsWith(shared), `the Discord line 1 carries it byte-for-byte (bold marks aside): ${lineOne}`);
    },
  },
  {
    name: "arch/131 FF-13109 (acd-loop-ask-reaches-every-face): structural — every POST branch calls admitWriteRequest( before readJsonBody(, the answer branch reads exactly body.ref, body.text and body.actor, and both faces' admission calls isLoopbackHost(",
    run: async () => {
      const units = await srcUnits();
      const board = unitOf(units, BOARD);
      const reads = bodyReads(board.code);
      assertRead(`the body reads of ${BOARD}`, reads.length, 4, "branch(es)");
      const unadmitted = reads.filter(({ admitted }) => !admitted).map(({ route }) => route);
      assert.deepEqual(unadmitted, [], `every POST branch calls admitWriteRequest( before readJsonBody( — ${unadmitted.join(", ")} reads its body first`);
      assert.deepEqual(bodyReads('if (pathname === "/api/x") {\n const body = await readJsonBody(request);\n if (!admitWriteRequest(request, response)) return true;\n}'), [{ route: "/api/x", admitted: false }], "self-check: a body read above its admission is seen and named");

      const at = board.code.indexOf(`pathname === "${ANSWER_ROUTE}"`);
      assert.ok(at !== -1, `NOT FOUND: the ${ANSWER_ROUTE} branch`);
      const branch = matchedBraceBody(board.code, at) ?? "";
      const fields = [...new Set([...branch.matchAll(/\bbody\s*\.\s*([A-Za-z_$][\w$]*)/gu)].map((match) => match[1]))].sort();
      assert.deepEqual(fields, [...ANSWER_FIELDS], `the ${ANSWER_ROUTE} branch reads exactly body.ref, body.text and body.actor — it reads ${fields.map((field) => `body.${field}`).join(", ")}`);

      for (const rel of [BOARD, FLEET]) {
        const admit = functionBody(unitOf(units, rel).code, "function admitWriteRequest(");
        assert.ok(admit != null, `NOT FOUND: admitWriteRequest in ${rel}`);
        assert.match(admit, /\bisLoopbackHost\s*\(/u, `admitWriteRequest in ${rel} calls isLoopbackHost( — the rebinding page is refused on this face`);
      }
    },
  },
  {
    name: "arch/131 FF-13109 (acd-loop-ask-reaches-every-face): fixture — a request with Host: evil.example:1234 and a matching Origin is refused non-loopback-host on the board and on the fleet",
    run: async () => {
      const repo = await mkdtemp(path.join(os.tmpdir(), "aof-arch-131-board-"));
      try {
        await mkdir(path.join(repo, "wiki", "work"), { recursive: true });
        const { server, url } = await serveSetupUi(null, { projectDir: repo, port: 0 });
        try {
          const refused = await request(url, { route: ANSWER_ROUTE, host: REBIND, origin: `http://${REBIND}` });
          assert.equal(refused.status, 403, "the board refuses the rebinding page");
          assert.equal(refused.body?.code, "non-loopback-host", `the board refuses non-loopback-host — ${JSON.stringify(refused.body)}`);
        } finally {
          await new Promise((resolve) => server.close(resolve));
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
      await withPublishedAssignFixture(async ({ url }) => {
        const refused = await request(url, { route: "/api/mesh/loop-stop", host: REBIND, origin: `http://${REBIND}` });
        assert.equal(refused.status, 403, "the fleet refuses the rebinding page");
        assert.equal(refused.body?.code, "non-loopback-host", `the fleet refuses non-loopback-host — ${JSON.stringify(refused.body)}`);
      });
    },
  },
  {
    name: "arch/131 FF-13109 (acd-loop-ask-reaches-every-face): structural — ui/src holds exactly one fetch of the answer route, and AskCard renders no Markdown, sets no placeholder, keys on item.ask and holds its buttons under ruling 4",
    run: async () => {
      const ui = await uiUnits();
      assertRead("the ui/src/** sweep", ui.length, 50);
      const fetches = ui.flatMap(({ rel, code }) => [...code.matchAll(/\bfetch\s*\(\s*["'`]\/api\/work\/answer["'`]/gu)].map(() => rel));
      assert.deepEqual(fetches, ["ui/src/board/api.ts"], `ui/src/** holds exactly one fetch("/api/work/answer" — found in ${fetches.join(", ") || "nothing"}`);

      const card = unitOf(ui, ASK_CARD);
      const markdown = importSpecifiers(card.code).filter(({ specifier }) => /markdown/iu.test(specifier));
      assert.deepEqual(markdown, [], `AskCard.tsx imports no Markdown — the question is plain text: ${markdown.map(({ specifier }) => specifier).join(", ")}`);
      assert.doesNotMatch(card.code, /<Markdown\b/u, "AskCard.tsx renders no <Markdown>");
      assert.doesNotMatch(card.code, /\bplaceholder\b/u, "AskCard.tsx sets no placeholder — there is no default answer");
      assert.match(card.code, /\bitem\s*\.\s*ask\b/u, "AskCard.tsx keys on item.ask");
      assert.doesNotMatch(card.code, /\bitem\s*\.\s*execution\b/u, "…and never on item.execution (R7)");

      const buttons = buttonsOf(card.code);
      const sends = buttons.filter(({ calls }) => calls.includes("send"));
      const toggles = buttons.filter(({ calls }) => calls.length > 0 && calls.every((call) => call === "setExpanded"));
      const others = buttons.length - sends.length - toggles.length;
      assert.ok(
        sends.length === 1 && toggles.length <= 1 && others === 0,
        `AskCard renders one <button whose onClick reaches send(, and at most one other — the clamp toggle, whose onClick only calls setExpanded (ruling 4): ${sends.length} send, ${toggles.length} toggle, ${others} other`,
      );
      assert.equal(buttonsOf('<button onClick={() => void send()}>a</button><button onClick={() => setExpanded(!expanded)}>b</button><button onClick={() => void send()}>c</button>').filter(({ calls }) => calls.includes("send")).length, 2, "self-check: a second send button is seen");
    },
  },
  {
    name: "arch/131 FF-13114 (acd-loop-ask-reaches-every-face): structural — announceWorkerAsk( is called only from the settle-assignment reactor, behind the not-already-needs-input edge",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const callers = units.flatMap(({ rel, code }) => [...code.matchAll(/(?<![\w$.])announceWorkerAsk\s*\(/gu)]
        .filter((match) => !/function\s*$/u.test(code.slice(Math.max(0, match.index - 16), match.index)))
        .map((match) => ({ rel, index: match.index, code })));
      assertRead("the announceWorkerAsk( calls in src/**", callers.length, 1, "call(s)");
      assert.deepEqual([...new Set(callers.map(({ rel }) => rel))], [REACTOR_TABLE], `announceWorkerAsk( is called only from ${REACTOR_TABLE} — found in ${callers.map(({ rel }) => rel).join(", ")}`);
      const reactor = functionBody(unitOf(units, REACTOR_TABLE).code, "async function settleAssignment(");
      assert.ok(reactor != null && /\bannounceWorkerAsk\s*\(/u.test(reactor), "…from inside settleAssignment");
      assert.match(reactor, /if\s*\(\s*park\s*&&\s*!wasWaiting\b/u, "…and only behind the edge: the row was not already waiting (ADR-010 §4)");
    },
  },
  {
    name: "arch/131 FF-13114 (acd-loop-ask-reaches-every-face): fixture — ask rides only the park; one park fact writes the row, projects the ask, reaches the board and posts once with the worker's node, and its redelivery posts nothing",
    run: async () => {
      await withMeshAssignFixture(async ({ home, root, workspace, workspaceId }) => {
        const env = { AOF_GLOBAL_HOME: home };
        const journalOptions = { env };
        // The key sets: `ask` only on the running + needs-input park.
        const shipped = [];
        const send = async (envelope) => { shipped.push(envelope); return { sent: true }; };
        await reportAssignmentSettled({ assignmentId: "asg-keys", state: "done", ask: WORKER_ASK, now: NOW_ISO }, { journalOptions, sendEffectStep: send });
        assert.deepEqual(Object.keys(shipped.at(-1).payload), REPORT_KEYS, "the done payload's key set is unchanged — no ask on a report that is not the park");
        await reportAssignmentSettled({ assignmentId: "asg-keys", state: "running", code: "needs-input", ask: WORKER_ASK, now: NOW_ISO }, { journalOptions, sendEffectStep: send });
        assert.deepEqual(Object.keys(shipped.at(-1).payload), [...REPORT_KEYS, "ask"], "the park's payload carries ask");

        const config = { name: "demo", work: { dir: "./wiki/work", notify: { channels: { discord: { type: "discord", channelId: CHANNEL_ID } } } }, mesh: { nodeId: "control-a" } };
        await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
        const store = await openGlobalWorkProjectionStore({ env });
        try {
          store.db.prepare("INSERT INTO global_workspace_descriptors (workspace_id, project_root, work_dir, descriptor_path) VALUES (?, ?, ?, ?)")
            .run(workspaceId, root, path.join(root, "wiki", "work"), path.join(root, ".aof", "descriptor.json"));
          store.db.prepare("INSERT INTO global_assignments (assignment_id, item_ref, workspace_id, target_node_id, issuer, state, run_id, assigned_at, updated_at) VALUES ('asg-ff', '35/00', ?, 'node-2976', 'control-a', 'running', 'run-ff', ?, ?)")
            .run(workspaceId, NOW_ISO, NOW_ISO);
        } finally {
          store.close();
        }
        const posts = [];
        const fetch = async (url, init) => {
          posts.push(JSON.parse(init.body));
          return { status: 200, headers: { get: () => "application/json" }, json: async () => ({ id: "990000000000000003" }) };
        };
        const park = { assignmentId: "asg-ff", state: "running", runId: "run-ff", sessionId: "sess-ff", branch: null, code: "needs-input", ask: WORKER_ASK };
        const reactor = effectsFor("assignment.reported").find((entry) => entry.key === "settle-assignment");
        assert.ok(reactor != null, "NOT FOUND: the settle-assignment reactor");
        // The same fact applied through the real reactor, twice, as a redelivery applies it.
        const applyOnce = async () => {
          const applied = await openGlobalWorkProjectionStore({ env });
          try {
            await reactor.apply({ payload: park }, { store: applied, now: NOW_ISO, journalOptions, globalWorkStoreOptions: { env }, notifyOptions: { env: { AOF_DISCORD_BOT_TOKEN: SECRET }, fetch } });
          } finally {
            applied.close();
          }
        };
        await applyOnce();
        const check = await openGlobalWorkProjectionStore({ env });
        try {
          assert.deepEqual(JSON.parse(check.db.prepare("SELECT ask FROM global_assignments WHERE assignment_id = 'asg-ff'").get().ask), WORKER_ASK, "the row's ask");
        } finally {
          check.close();
        }
        assert.deepEqual((await readExecutionOverlay(workspace, { globalWorkStoreOptions: { env } })).get("35/00").ask, WORKER_ASK, "execution.ask");
        const rows = await invoke("work:list", { mesh: true }, { workspace, globalWorkStoreOptions: { env } });
        assert.equal(rows.find((row) => row.ref === "35/00").ask.question, WORKER_ASK.question, "the board row's question is non-null");
        assert.equal(posts.length, 1, "one post");
        // 131/13: the project sits between the cost and the node.
        assert.match(posts[0].content, /^\*\*35\/00 — waiting on you\*\* \(build, [^)]+\)(?: · [^·\n]+)? · node-2976\n/u, "naming the worker's node");
        await applyOnce();
        assert.equal(posts.length, 1, `the redelivered park posts nothing — found the second POST: ${JSON.stringify(posts.slice(1).map((post) => post.content.split("\n")[0]))}`);
      });
    },
  },
];
