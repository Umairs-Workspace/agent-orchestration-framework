// FF-13106 + FF-13107 + FF-13108 + FF-13109 — THE ASK REACHES EVERY FACE THROUGH ONE NOTIFIER, ONE
// FORM AND ONE GUARDED ROUTE (milestone 131 / story 06; ARCHITECTURE `## Fitness functions`,
// ADR-005 and ADR-006). Which of this directory's three subjects: the RECORD — the envelope the
// notifier sends, the form every face renders it in and the answer the board carries back are how
// the ask record is read and written outside the loop, and these are the controls on each face.
//
// FF-13106, structural then fixture. The `work.notify` schema is closed and a channel names its
// secret only by `urlEnv`: no `url`, `webhook` or `token` property at any level. Neither
// `.aof/aof.config.json` nor `src/**` holds a `discord.com/api/webhooks` literal; inside
// `src/notify/` the URL is read only as `env[<…urlEnv>]` or — as amended at 131/08 — through
// `readMessagingSecret(`, called by `notify.mjs` alone; the `messaging` store segment is joined
// into a path only in `src/notify/secret.mjs`, and `src/commands/messaging/messaging.mjs` reaches
// the store only through it (its red probe: the verbs module joining the segment itself, run
// against the shipped detector). No degrade call's MESSAGE names the
// URL — the redaction pass in `notify.mjs` is a backstop, so the fixture alone could never see a
// URL interpolated into the message it redacts (the register's red probe; this is the leg that
// sees it). Fixture with a degrade-sink spy: `notify` against a fetch that throws, answers 500,
// answers 429 or hangs past the bound resolves `{ delivered: [], failed: [name] }`, never rejects,
// and no degrade message carries the URL. `renderDiscord` over a 3,000-character ask with an open
// fence keeps line 1, the action line and the link inside 2,000 characters, balances the fence
// and allows no mention.
//
// FF-13107, structural. Every `notify(` call under `src/` (comment-stripped, the definition in
// `src/notify/notify.mjs` excluded, calls of the imported binding only — task 00 ruling 7) is one
// of ADR-005 §4's six sites, enumerated by file and by the event literals its envelopes are built
// with; each site's module builds its envelope through `buildNotifyEnvelope`, whose keys
// deep-equal the eleven, and `EVENTS` holds seven. NON-VACUOUS: the sweep finds six sites.
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
// Every sweep reports what it read; every cut is on the language's own structure through
// `test/support/source-slice.mjs`.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { computedDynamicImports, importSpecifiers } from "../../support/module-family.mjs";
import { functionBody, matchedBraceBody, matchedParenSpan, stripComments, topLevelArguments } from "../../support/source-slice.mjs";
import { withPublishedAssignFixture } from "../../support/mesh-ui-assign-fixture.mjs";
import { setDegradeSinkForTest } from "../../../src/degrade.mjs";
import { renderDiscord } from "../../../src/notify/discord.mjs";
import { accountLine, cost, headline } from "../../../src/notify/form.mjs";
import { EVENTS, buildNotifyEnvelope, notify } from "../../../src/notify/notify.mjs";
import { serveSetupUi } from "../../../src/setup-ui.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const toPosix = (value) => String(value).split(path.sep).join("/");

const NOTIFY_DIR = "src/notify/";
const NOTIFY = "src/notify/notify.mjs";
// FF-13106 as amended at 131/08: the machine-wide store's one home and the verbs that reach it.
const SECRET_STORE = "src/notify/secret.mjs";
const MESSAGING_VERBS = "src/commands/messaging/messaging.mjs";
const STORE_SEGMENT = /^(["'`])messaging(?:\1|\/)/u;
const FORM = "src/notify/form.mjs";
const WEBHOOK_LITERAL = "discord.com/api/webhooks";
const FORBIDDEN_CHANNEL_KEYS = Object.freeze(["url", "webhook", "token"]);
// ADR-005 §4 — the six firing points: each `notify(` call by file, with the event(s) its envelope
// is built for. The death site builds one envelope whose event is `loop-relaunched` or `loop-died`.
const FIRING_SITES = Object.freeze([
  "src/commands/item-status.mjs milestone-accepted",
  "src/commands/loop.mjs loop-died/loop-relaunched",
  "src/commands/loop.mjs loop-halted",
  "src/commands/resume.mjs session-answered",
  "src/loop/ask.mjs session-needs-input",
  "src/loop/ask.mjs session-parked-unanswered",
]);
const SIX = FIRING_SITES.length;
const ENVELOPE_KEYS = Object.freeze(["event", "ref", "at", "node", "phase", "elapsedMs", "question", "stop", "outcome", "answerPath", "link"]);
// Task 00 ruling 3: the form's direct importers.
const FORM_IMPORTERS = Object.freeze(["src/loop/ask.mjs", "src/notify/discord.mjs", "ui/src/board/action.mjs"]);
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

// Each `degrade(` / `reportDegrade(` call in `code` whose MESSAGE names the URL: every argument of
// `reportDegrade(`, and every argument but the third (the redaction input) of `degrade(`.
export function degradeMessagesNamingUrl(code) {
  const found = [];
  for (const match of code.matchAll(/(?<![\w$.])(reportDegrade|degrade)\s*\(/gu)) {
    if (/function\s*$/u.test(code.slice(Math.max(0, match.index - 16), match.index))) continue;
    const span = matchedParenSpan(code, match.index);
    if (span == null) continue;
    const args = topLevelArguments(span.body);
    const message = match[1] === "degrade" ? args.filter((_, index) => index !== 2) : args;
    if (message.some((arg) => /\burl\b/u.test(arg))) found.push(`${match[1]}(${span.body.trim().slice(0, 120)})`);
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

// FF-13106's delivery fixture: one discord channel reading its URL from HOOK.
const SECRET = "https://discord.com/api/webhooks/131/arch-secret-token";
const WORKSPACE = Object.freeze({ config: { work: { notify: { channels: { ops: { type: "discord", urlEnv: "HOOK" } } } } } });
const NOW = () => new Date("2026-09-25T12:00:00.000Z");
const ASK_ENVELOPE = (fields = {}) => buildNotifyEnvelope("session-needs-input", { ref: "127/02", phase: "build", elapsedMs: 720000, question: "Move the residue?", ...fields }, {
  config: { mesh: { nodeId: "aof-wsl" }, work: { notify: { channels: { ops: { type: "discord" } }, link: "https://example.test/{ref}" } } },
  now: NOW,
});
const response = (status) => ({ status, ok: status >= 200 && status < 300, headers: { get: () => null }, json: async () => ({ retry_after: 1 }) });

export const archTests = [
  {
    name: "arch/131 FF-13106 (acd-loop-ask-reaches-every-face): structural — the work.notify schema is closed and a channel names its secret only by urlEnv, with no url, webhook or token property at any level",
    run: async () => {
      const schema = JSON.parse(await readFile(path.join(repoRoot, "schemas", "aof.schema.json"), "utf8"));
      const block = schema?.$defs?.work?.properties?.notify;
      assert.ok(block != null, "NOT FOUND: $defs.work.properties.notify — the block the control governs has moved");
      assert.equal(block.additionalProperties, false, "the work.notify schema is closed");
      const channel = block.properties?.channels?.additionalProperties;
      assert.equal(channel?.additionalProperties, false, "a channel is closed");
      assert.ok(channel?.properties?.urlEnv != null, "a channel has urlEnv");
      const names = [];
      const walk = (node) => {
        if (node == null || typeof node !== "object") return;
        if (node.properties != null && typeof node.properties === "object") names.push(...Object.keys(node.properties));
        for (const value of Object.values(node)) walk(value);
      };
      walk(block);
      assertRead("the property names under work.notify", names.length, 4, "name(s)");
      const forbidden = names.filter((name) => FORBIDDEN_CHANNEL_KEYS.includes(name.toLowerCase()));
      assert.deepEqual(forbidden, [], `a channel has urlEnv and no url, webhook or token property at any level — found ${forbidden.join(", ")}: the URL is the credential (ADR-005 §1)`);
    },
  },
  {
    name: "arch/131 FF-13106 (acd-loop-ask-reaches-every-face): structural — no discord.com/api/webhooks literal in the config or src/**, the URL is read only as env[urlEnv] inside src/notify/, and no degrade message contains the URL",
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
      const stray = reads.filter(({ index }) => !/urlEnv\s*\]$/u.test(index));
      assert.deepEqual(stray.map(({ rel, index }) => `${rel}: ${index}`), [], "inside src/notify/ the URL is read only as env[<urlEnv>]");
      // As amended at 131/08: the second read is the machine-wide store, called from the notifier
      // alone (the store module's own calls are its definition's neighbours, not a second read), and
      // the store's file is read by its own module alone.
      const storeReads = family.filter(({ rel }) => rel !== SECRET_STORE).flatMap(({ rel, code }) => [...code.matchAll(/(?<![\w$.])readMessagingSecret\s*\(/gu)]
        .filter((match) => !/function\s*$/u.test(code.slice(Math.max(0, match.index - 16), match.index)))
        .map(() => rel));
      assertRead(`the readMessagingSecret( calls in ${NOTIFY_DIR}`, storeReads.length, 1, "call(s)");
      assert.deepEqual([...new Set(storeReads)], [NOTIFY], `inside src/notify/ the stored URL is read only by ${NOTIFY} through readMessagingSecret — found in ${storeReads.join(", ")}`);
      const fileReads = family.filter(({ code }) => /(?<![\w$.])readFile(?:Sync)?\s*\(/u.test(code)).map(({ rel }) => rel);
      assert.deepEqual(fileReads, [SECRET_STORE], `inside src/notify/ only ${SECRET_STORE} reads a file — found ${fileReads.join(", ")}`);
      const processEnv = family.filter(({ code }) => /\bprocess\s*\.\s*env\s*(?:\.|\?\.|\[)/u.test(code)).map(({ rel }) => rel);
      assert.deepEqual(processEnv, [], `src/notify/ reads no process.env member of its own — the env is handed in: ${processEnv.join(", ")}`);

      const naming = family.flatMap(({ rel, code }) => degradeMessagesNamingUrl(code).map((call) => `${rel}: ${call}`));
      assert.deepEqual(naming, [], `no degrade message contains the URL — a degrade call's message names it: ${naming.join(" | ")}. Name the channel and the cause, never the credential (ADR-005 §1)`);
      assert.equal(degradeMessagesNamingUrl("degrade(\"notify-delivery-failed\", `failed to deliver to ${url}`, url);").length, 1, "self-check: a URL interpolated into the message is seen, whatever the redaction pass would do");
      assert.equal(degradeMessagesNamingUrl("degrade(\"notify-delivery-failed\", `failed (${detail})`, url);").length, 0, "self-check: the URL handed in for redaction is not a message");
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
    name: "arch/131 FF-13106 (acd-loop-ask-reaches-every-face): fixture — notify against a fetch that throws, answers 500, answers 429 or hangs past the bound resolves { delivered: [], failed: [name] }, never rejects, and no degrade message contains the URL",
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
          assert.deepEqual(result, { delivered: [], failed: ["ops"] }, `${label}: notify resolves { delivered: [], failed: [name] }`);
          const seen = events.filter((event) => String(event.code).startsWith("notify-"));
          assertRead(`${label}: the degrade events`, seen.length, 1, "event(s)");
          const leaked = seen.filter((event) => JSON.stringify(event).includes(SECRET) || JSON.stringify(event).includes("arch-secret-token"));
          assert.deepEqual(leaked.map((event) => event.message), [], `${label}: no degrade message contains the URL`);
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "arch/131 FF-13106 (acd-loop-ask-reaches-every-face): fixture — renderDiscord over a 3,000-character ask with an open fence keeps line 1, the action line and the link inside 2,000 characters, balances the fence and allows no mention",
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
    },
  },
  {
    name: "arch/131 FF-13107 (acd-loop-ask-reaches-every-face): structural — every notify( call under src/ is one of the six sites in ADR-005 §4, enumerated by file and event literal, and each builds its envelope through buildNotifyEnvelope",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const sites = notifySites(units).sort();
      const strays = sites.filter((site) => !FIRING_SITES.includes(site));
      assert.deepEqual(strays, [], `every notify( call under src/ is one of the six sites in ADR-005 §4 — not one: ${strays.join(", ")}`);
      assert.deepEqual(sites, [...FIRING_SITES], "the six sites in ADR-005 §4 each fire once, by file and event literal");
      for (const rel of new Set(FIRING_SITES.map((site) => site.split(" ")[0]))) {
        assert.ok(importSpecifiers(unitOf(units, rel).code).some(({ specifier }) => resolved(rel, specifier) === NOTIFY), `${rel} imports buildNotifyEnvelope and notify from ${NOTIFY}`);
      }
      const covered = FIRING_SITES.flatMap((site) => site.split(" ")[1].split("/")).sort();
      assert.deepEqual(covered, [...EVENTS].sort(), "the six sites fire the seven events between them, each exactly once");
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
    name: "arch/131 FF-13107 (acd-loop-ask-reaches-every-face): NON-VACUOUS — the sweep finds six sites, and reds when it finds fewer",
    run: async () => {
      const units = await srcUnits();
      const sites = notifySites(units);
      assert.ok(sites.length >= SIX, `the sweep finds six sites — it found ${sites.length} (${sites.join(", ") || "none"}): a needle that finds nothing is a guard asserting over the empty set`);
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
      assert.deepEqual(importers, [...FORM_IMPORTERS].sort(), "src/notify/form.mjs's direct importers are ask.mjs, discord.mjs and ui/src/board/action.mjs (ruling 3)");
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
];
