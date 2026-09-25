// test/notify/notify-discord.test.mjs — milestone 131 / story 02, task 04
// (04_the-discord-message-keeps-its-headline-command-and-link.feature; ADR-005 §2, DESIGN §3).
//
// The Discord renderer is a pure function of the envelope, so every case here is one envelope from
// the one builder and one `renderDiscord` call — no network, no clock beyond the builder's injected
// one. The truncation rows are measured to the unit: line 1 is 50 units, the action line 36 and the
// link 27, so the body's room is 1,884 with the link and 1,912 without.
import assert from "node:assert/strict";
import { renderDiscord } from "../../src/notify/discord.mjs";
import { buildNotifyEnvelope } from "../../src/notify/notify.mjs";

const NOW = () => new Date("2026-09-23T17:00:00.000Z");
const LINK = "https://example.test/{ref}";
const configWith = ({ node = "aof-wsl", link = LINK } = {}) => ({
  ...(node == null ? {} : { mesh: { nodeId: node } }),
  ...(link == null ? {} : { work: { notify: { channels: { ops: { type: "discord" } }, link } } }),
});
// E(fields) — an envelope from the one builder, ref "127/02", node "aof-wsl", the link template.
const E = ({ event, ...fields }, options = {}) => buildNotifyEnvelope(event, { ref: "127/02", ...fields }, { config: configWith(options), now: NOW });
const ASK = (fields, options) => E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, ...fields }, options);
const LINE1 = "**127/02 — waiting on you** (build, 12m) · aof-wsl";
const ACTION = 'Answer: `aof work answer 127/02 "…"`';
const LINK_LINE = "https://example.test/127/02";
const TO_LINK = "… (continues at the link)";
const TO_TERMINAL = "… (continued in the terminal)";
const a = (n) => "a".repeat(n);
const b = (n) => "b".repeat(n);
const fences = (text) => text.split("```").length - 1;

export const notifyDiscordTests = [
  {
    name: "131/02 task04 — an ask posts four lines with no mentions allowed and no embed",
    run() {
      const body = renderDiscord(ASK({ question: "Move the residue? @everyone" }));
      assert.equal(body.content, [LINE1, "Move the residue? @everyone", ACTION, LINK_LINE].join("\n"));
      assert.equal(body.username, "aof");
      assert.deepEqual(body.allowed_mentions, { parse: [] });
      assert.ok(!("embeds" in body), "no embeds key");
      assert.equal([LINE1.length, ACTION.length, LINK_LINE.length].join(), "50,36,27", "the fixed lines the truncation rows are measured against");
    },
  },
  {
    name: "131/02 task04 — a 3,000-character ask with an open fence keeps line 1, the command and the link",
    run() {
      const question = `\`\`\`js\n${"x".repeat(194)}\n${"y ".repeat(1402)}`;
      assert.equal(question.length >= 3000, true);
      const { content } = renderDiscord(ASK({ question }));
      const lines = content.split("\n");
      assert.ok(content.length <= 2000, `${content.length} ≤ 2,000`);
      assert.equal(lines[0], LINE1);
      assert.equal(lines.at(-2), ACTION);
      assert.equal(lines.at(-1), LINK_LINE);
      const body = content.slice(LINE1.length + 1, content.length - ACTION.length - LINK_LINE.length - 2);
      assert.ok(body.endsWith(`\n\`\`\`${TO_LINK}`), "a closing fence, then the suffix");
      assert.equal(fences(content) % 2, 0, "an even number of fences in the whole content");
    },
  },
  {
    name: "131/02 task04 — an accept has a headline and a title and nothing else",
    run() {
      const e = buildNotifyEnvelope("milestone-accepted", { ref: "131", outcome: { title: "The human in the loop" } }, { config: {}, now: NOW });
      assert.equal(renderDiscord(e).content, "**131 — accepted**\nThe human in the loop");
    },
  },
  {
    name: "131/02 task04 — each event's message is its line 1, its body and its action line, parts omitted when absent (fourteen rows)",
    run() {
      const rows = [
        [E({ event: "session-answered", phase: "build", elapsedMs: 720000, outcome: { by: "umair", answer: "take b" } }), ["**127/02 — answered by umair** (build, 12m) · aof-wsl", "take b", "The session is resuming.", LINK_LINE]],
        [E({ event: "session-parked-unanswered", phase: "build", elapsedMs: 11400000, question: "Move?\nOptions: a, b" }), ["**127/02 — parked, unanswered** (build, 3h 10m) · aof-wsl", "Move? Options: a, b", 'Answer to resume: `aof work answer 127/02 "…"`', LINK_LINE]],
        [E({ ref: "127", event: "loop-halted", elapsedMs: 60000, stop: { id: "story-failed", remedy: "Fix the gate.", ref: "127/03" } }), ["**127 — loop halted on story-failed at 127/03** · aof-wsl", "Fix the gate.", "Resume: `aof work loop 127 --resume`", "https://example.test/127"]],
        [E({ ref: "127", event: "loop-halted", elapsedMs: 60000, stop: { id: "story-failed", remedy: "Fix the gate." } }), ["**127 — loop halted on story-failed** · aof-wsl", "Fix the gate.", "Resume: `aof work loop 127 --resume`", "https://example.test/127"]],
        [E({ ref: "127", event: "loop-died", elapsedMs: 60000, outcome: { cause: "SIGKILL" } }), ["**127 — loop died** · aof-wsl", "SIGKILL", "Resume: `aof work loop 127 --resume`", "https://example.test/127"]],
        [E({ ref: "127", event: "loop-died", elapsedMs: 60000 }), ["**127 — loop died** · aof-wsl", "Resume: `aof work loop 127 --resume`", "https://example.test/127"]],
        [E({ ref: "127", event: "loop-relaunched", elapsedMs: 60000, outcome: { cause: "host slept" } }), ["**127 — loop relaunched** · aof-wsl", "host slept", "https://example.test/127"]],
        [E({ ref: "127", event: "loop-relaunched" }, { node: null, link: null }), ["**127 — loop relaunched**"]],
        [E({ ref: "131", event: "milestone-accepted", outcome: { title: "The human in the loop" } }), ["**131 — accepted** · aof-wsl", "The human in the loop", "https://example.test/131"]],
        [ASK({ question: "  \n " }), [LINE1, ACTION, LINK_LINE]],
        [E({ event: "session-needs-input", question: "Q?" }), ["**127/02 — waiting on you** · aof-wsl", "Q?", ACTION, LINK_LINE]],
        [E({ event: "session-needs-input", phase: "build", question: "Q?" }), ["**127/02 — waiting on you** (build) · aof-wsl", "Q?", ACTION, LINK_LINE]],
        [ASK({ question: "A\n\nB" }), [LINE1, "A", "", "B", ACTION, LINK_LINE]],
        [E({ event: "session-answered", phase: "build", elapsedMs: 720000, outcome: { by: "umair", answer: 42 } }), ["**127/02 — answered by umair** (build, 12m) · aof-wsl", "The session is resuming.", LINK_LINE]],
      ];
      for (const [envelope, lines] of rows) {
        assert.equal(renderDiscord(envelope).content, lines.join("\n"), `${envelope.event}: ${lines[0]}`);
      }
    },
  },
  {
    name: "131/02 task04 — a mention stays in the text and pings no one",
    run() {
      for (const question of ["@everyone look", "@here now", "ping <@123456789012345678>", "ping <@&987654321098765432>"]) {
        const body = renderDiscord(ASK({ question }));
        assert.equal(body.content.split("\n")[1], question);
        assert.deepEqual(body.allowed_mentions, { parse: [] });
      }
    },
  },
  {
    name: "131/02 task04 — only the body yields, to the unit, and never mid-pair (twelve rows)",
    run() {
      const rows = [
        [a(1883), true, a(1883), 1999],
        [a(1884), true, a(1884), 2000],
        [a(1885), true, `${a(1859)}${TO_LINK}`, 2000],
        [a(3000), true, `${a(1859)}${TO_LINK}`, 2000],
        [`${a(1839)} ${b(200)}`, true, `${a(1839)}${TO_LINK}`, 1980],
        [`${a(1838)} ${b(200)}`, true, `${a(1838)} ${b(20)}${TO_LINK}`, 2000],
        [`${a(1850)}\n${b(200)}`, true, `${a(1850)}${TO_LINK}`, 1991],
        [`${a(1845)} \t ${b(200)}`, true, `${a(1845)}${TO_LINK}`, 1986],
        [`${a(1858)}😀${b(200)}`, true, `${a(1858)}${TO_LINK}`, 1999],
        [`${a(1857)}😀${b(200)}`, true, `${a(1857)}😀${TO_LINK}`, 2000],
        [a(1912), false, a(1912), 2000],
        [a(1913), false, `${a(1883)}${TO_TERMINAL}`, 2000],
      ];
      for (const [question, withLink, body, length] of rows) {
        const { content } = renderDiscord(ASK({ question }, withLink ? {} : { link: null }));
        const lines = content.split("\n");
        assert.equal(lines[0], LINE1, "line 1 is whole");
        const expected = [LINE1, body, ACTION, ...(withLink ? [LINK_LINE] : [])].join("\n");
        assert.equal(content, expected, `${question.length} units${withLink ? " with" : " without"} the link`);
        assert.equal(content.length, length);
      }
    },
  },
  {
    name: "131/02 task04 — a clipped body closes an open fence before the suffix, and only then; an unclipped open fence is left as written",
    run() {
      for (const [question, closes] of [
        [`\`\`\`js\n${a(3000)}`, true],
        [`\`\`\`\n\`\`\`\n\`\`\`\n${a(3000)}`, true],
        [`\`\`\`\nx\n\`\`\`\n${a(3000)}`, false],
        [`${a(3000)}\n\`\`\`\nx`, false],
      ]) {
        const { content } = renderDiscord(ASK({ question }));
        assert.ok(content.length <= 2000, `${content.length} ≤ 2,000`);
        const body = content.slice(LINE1.length + 1, content.indexOf(TO_LINK));
        const kept = closes ? body.slice(0, -"\n```".length) : body;
        assert.ok(question.startsWith(kept), "the kept text is a prefix of the question");
        assert.equal(body.endsWith("\n```"), closes, closes ? "a closing fence before …" : "no fence added");
      }
      const open = `\`\`\`\n${a(1000)}`;
      assert.equal(renderDiscord(ASK({ question: open })).content.split("\n").slice(1, 3).join("\n"), open, "left as written");
    },
  },
  {
    name: "131/02 task04 — when the fixed lines leave no room, the body goes and the fixed lines stay, and nothing throws",
    run() {
      const linkOf = (n) => `https://x.test/${"p".repeat(n - "https://x.test/".length - "127/02".length)}{ref}`;
      for (const [n, question, parts, length] of [
        [1886, a(3000), 4, 2000],
        [1887, a(3000), 3, 1975],
        [2000, "Q?", 3, 2088],
      ]) {
        const { content } = renderDiscord(ASK({ question }, { link: linkOf(n) }));
        const lines = content.split("\n");
        assert.equal(lines.length, parts, `link of ${n}: ${parts} lines`);
        assert.equal(content.length, length, `link of ${n}: ${length} units`);
        assert.equal(lines[0], LINE1);
        assert.equal(lines.at(-1).length, n, "the link is whole");
        if (parts === 4) assert.equal(lines[1], TO_LINK, "the body line is the suffix alone");
      }
    },
  },
];
