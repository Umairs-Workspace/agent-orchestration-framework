import path from "node:path";
import { readFile } from "node:fs/promises";
import { commandError } from "@aof/contracts/error";
import { writeText } from "@aof/foundation/fs";
import { listItems } from "../discovery.mjs";
import { parseFrontmatter } from "../records.mjs";

// Core supplies the one mint, exact ref resolution and the item-status transition seam.
export function createPrototypeCommand({ runInsertTopLevel, resolveItemExact, requireLocalCheckout, transitionItemStatus }) {
// work:prototype — THE MECHANICAL HALF OF A PROTOTYPE'S FOUR MOVES (milestone 168 / ADR-004). It
// writes numbers, dates, status moves and Log lines; the `/aof:prototype` command writes the prose
// (the intent's wording past the ask, the hand-off, the shortcuts) and builds (m41/ADR-002).
//
//   start            `<ask>`              scaffold through the one mint, Intent + first Want + `started`
//   continue / add   `<ref> ["<addition>"]` append a dated Want + `want added`; reopen a stopped one
//   log              `<ref> --log "<line>"` one dated Log line, nothing else
//   stop / complete  `<ref> --stop|--done|--abandon` refuse on the template hand-off, move the
//                    status, and quote the hand-off into the Log under the move's dated line
//
// THE POSITIONAL GRAMMAR (§1). All digits, or the slug of an existing prototype, is a REF; anything
// else is the ASK. An all-digit argument that resolves to nothing is refused — never started as a
// prototype named "168".
//
// BUILDS INLINE (§1, FF-16804). This module imports no dispatch, worktree, lane or git module: a
// prototype is built in the operator's session on the current branch. It mints no run record and
// writes no time of day (§5) — every line carries the date, and `--today` overrides it.

const MOVES = Object.freeze({ stop: ["paused", "stopped"], done: ["done", "done"], abandon: ["abandoned", "abandoned"] });
// The words a slug never starts with — the filler an ask opens on ("build me a …").
const LEADING_FILLER = new Set(["a", "an", "the", "build", "make", "create", "write", "me", "us", "please", "some"]);
const SLUG_WORDS = 6;

function slugFromAsk(ask) {
  const words = String(ask ?? "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  while (words.length > 0 && LEADING_FILLER.has(words[0])) words.shift();
  return words.slice(0, SLUG_WORDS).join("-");
}

// A section body: the lines between `## <heading>` and the next `#`/`##` heading.
function sectionRange(rows, heading) {
  const start = rows.findIndex((row) => row.trimEnd() === `## ${heading}`);
  if (start < 0) return null;
  const next = rows.findIndex((row, index) => index > start && /^#{1,2} /.test(row));
  return { start, end: next < 0 ? rows.length : next };
}

const isPlaceholder = (line) => /^(?:[-*]\s+)?<[^>]*>\s*$/.test(line.trim());

// The section's content with HTML comments and blank edges removed — what the session wrote.
function sectionContent(text, heading) {
  const rows = text.split(/\r?\n/);
  const range = sectionRange(rows, heading);
  if (range == null) return null;
  return rows.slice(range.start + 1, range.end).join("\n").replace(/<!--[\s\S]*?-->/g, "").split("\n")
    .map((line) => line.trimEnd()).join("\n").trim();
}

function missingSection(file, heading) {
  return commandError(`${file} has no "## ${heading}" section — run \`aof work validate\` to see what the prototype is missing.`, "prototype-section-missing", 422);
}

// Append lines at the end of a section (before its trailing blank lines), keeping the file's EOL.
function appendToSection(text, heading, lines, file) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const rows = text.split(/\r?\n/);
  const range = sectionRange(rows, heading);
  if (range == null) throw missingSection(file, heading);
  let last = range.end;
  while (last > range.start + 1 && rows[last - 1].trim() === "") last--;
  const body = rows.slice(range.start + 1, last);
  const lead = body.length === 0 ? [""] : [];
  const rest = rows.slice(range.end);
  const out = [...rows.slice(0, range.start + 1), ...body, ...lead, ...lines, "", ...rest];
  // A file that ended on the section keeps exactly one trailing newline.
  while (rest.length === 0 && out.length > 1 && out.at(-1) === "" && out.at(-2) === "") out.pop();
  return out.join(eol);
}

// Replace the section's template placeholder line with `line` (the start move's fill).
function fillSection(text, heading, line, file) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const rows = text.split(/\r?\n/);
  const range = sectionRange(rows, heading);
  if (range == null) throw missingSection(file, heading);
  const at = rows.findIndex((row, index) => index > range.start && index < range.end && isPlaceholder(row));
  if (at < 0) return appendToSection(text, heading, [line], file);
  rows[at] = line;
  return rows.join(eol);
}

async function readDoc(dir, file) {
  return await readFile(path.join(dir, file), "utf8");
}

const today = (input) => (typeof input === "string" && input !== "" ? input : new Date().toISOString().slice(0, 10));

async function resolvePrototype(ctx, arg) {
  if (/^\d+$/.test(arg)) {
    const item = await resolveItemExact(ctx, arg);
    if (item == null) throw commandError(`No item resolves to ref "${arg}" — an all-digit argument is a ref, never an ask.`, "prototype-ref-unknown", 404);
    if (item.type !== "prototype") throw commandError(`Item ${item.ref} is a ${item.type}, not a prototype.`, "prototype-not-a-prototype", 409);
    return requireLocalCheckout(item, arg);
  }
  const rows = (await listItems(ctx.workspace.workDir)).filter((row) => row.type === "prototype" && row.number != null && row.slug === arg);
  return rows.length === 1 ? rows[0] : null;
}

async function statusOf(item) {
  return parseFrontmatter(await readDoc(item.dir, "PROTOTYPE.md")).status ?? null;
}

async function moveTo(ctx, item, toStatus, date) {
  await transitionItemStatus(
    { ref: item.ref, dir: item.dir, type: "prototype" },
    { toStatus, now: date },
    { workspace: ctx.workspace, publisherOptions: ctx, journalOptions: ctx.effectsJournalOptions ?? {} },
  );
}

async function appendLog(item, lines) {
  const statePath = path.join(item.dir, "STATE.md");
  let state;
  try {
    state = await readFile(statePath, "utf8");
  } catch {
    throw commandError(`${item.ref} has no STATE.md beside its PROTOTYPE.md.`, "prototype-section-missing", 422);
  }
  await writeText(statePath, appendToSection(state, "Log", lines, "STATE.md"));
}

async function start(ctx, { ask, slug, date }) {
  const { created } = await runInsertTopLevel(ctx, { type: "prototype", slug: slug ?? slugFromAsk(ask), append: true, today: date });
  const docPath = path.join(created.dir, "PROTOTYPE.md");
  let doc = await readFile(docPath, "utf8");
  doc = fillSection(doc, "Intent", ask, "PROTOTYPE.md");
  doc = fillSection(doc, "Wants", `- ${date} · ${ask}`, "PROTOTYPE.md");
  await writeText(docPath, doc);
  await appendLog(created, [`- ${date} · started`]);
  return { move: "start", ref: created.ref, slug: created.slug, dir: created.dir, status: "active", from: null };
}

async function stopOrComplete(ctx, item, flag, date) {
  const [toStatus, word] = MOVES[flag];
  const handOff = sectionContent(await readDoc(item.dir, "STATE.md").catch(() => ""), "Hand-off");
  if (handOff == null || handOff === "" || handOff.split("\n").every((line) => line.trim() === "" || isPlaceholder(line))) {
    throw commandError(
      `${item.ref}'s "## Hand-off" still holds the template's placeholder — write what works, where it stopped and what is next before --${flag}.`,
      "prototype-handoff-missing",
      409,
    );
  }
  const from = await statusOf(item);
  await moveTo(ctx, item, toStatus, date);
  await appendLog(item, [`- ${date} · ${word}`, ...handOff.split("\n").map((line) => (line === "" ? ">" : `> ${line}`))]);
  return { move: flag, ref: item.ref, slug: item.slug, dir: item.dir, status: toStatus, from };
}

async function continueWith(ctx, item, addition, date) {
  const from = await statusOf(item);
  const wanted = typeof addition === "string" && addition.trim() !== "";
  if (from === "active" && !wanted) return { move: "continue", ref: item.ref, slug: item.slug, dir: item.dir, status: from, from, wrote: false };
  const log = [];
  if (from !== "active") {
    await moveTo(ctx, item, "active", date);
    log.push(`- ${date} · reopened`);
  }
  if (wanted) {
    const docPath = path.join(item.dir, "PROTOTYPE.md");
    await writeText(docPath, appendToSection(await readFile(docPath, "utf8"), "Wants", [`- ${date} · ${addition.trim()}`], "PROTOTYPE.md"));
    log.push(`- ${date} · want added: ${addition.trim()}`);
  }
  await appendLog(item, log);
  return { move: "continue", ref: item.ref, slug: item.slug, dir: item.dir, status: "active", from, wrote: true };
}

const prototypeCommand = {
  id: "work:prototype",
  input: {
    type: "object",
    properties: {
      arg: { type: "string" },
      addition: { type: "string" },
      slug: { type: "string" },
      log: { type: "string" },
      stop: { type: "boolean" },
      done: { type: "boolean" },
      abandon: { type: "boolean" },
      today: { type: "string" },
    },
    additionalProperties: false,
  },

  async run(input, ctx) {
    const flags = Object.keys(MOVES).filter((flag) => input[flag] === true);
    const logged = typeof input.log === "string";
    const acts = [...flags.map((flag) => `--${flag}`), ...(logged ? ["--log"] : [])];
    // A new ask is a move of its own: beside a stop or a log line it would be dropped unwritten.
    const asked = typeof input.addition === "string" && input.addition.trim() !== "";
    const combined = asked && acts.length > 0 ? ["a new ask", ...acts] : acts;
    if (combined.length > 1) throw commandError(`${combined.join(" and ")} cannot be combined — one move per call.`, "prototype-one-move", 400);
    const arg = typeof input.arg === "string" ? input.arg.trim() : "";
    if (arg === "") throw commandError("An ask or a prototype ref is required.", "prototype-ask-required", 400);
    const date = today(input.today);

    const item = await resolvePrototype(ctx, arg);
    if (item == null) {
      if (acts.length > 0) throw commandError(`${acts[0]} needs a prototype ref, and "${arg}" names no prototype.`, "prototype-ref-unknown", 404);
      return await start(ctx, { ask: arg, slug: input.slug, date });
    }
    if (logged) {
      if (input.log.trim() === "") throw commandError("--log needs a line to write.", "prototype-log-empty", 400);
      await appendLog(item, [`- ${date} · ${input.log.trim()}`]);
      return { move: "log", ref: item.ref, slug: item.slug, dir: item.dir, status: await statusOf(item), from: null };
    }
    if (flags.length === 1) return await stopOrComplete(ctx, item, flags[0], date);
    return await continueWith(ctx, item, input.addition, date);
  },

  cli: {
    route: ["work", "prototype"],
    spec: {
      usage: 'aof work prototype "<ask>" [--slug <slug>] | <ref> ["<addition>"] | <ref> --log "<line>" | <ref> --stop|--done|--abandon [--today YYYY-MM-DD] [--json]',
      flags: {
        slug: { type: "string", description: "the folder slug for a new prototype (default: made from the ask)" },
        log: { type: "string", description: "append one dated line to STATE.md's ## Log and do nothing else" },
        stop: { type: "boolean", description: "pause the prototype, quoting the hand-off into the Log" },
        done: { type: "boolean", description: "mark the prototype done, quoting the hand-off into the Log" },
        abandon: { type: "boolean", description: "abandon the prototype, quoting the hand-off into the Log" },
        today: { type: "string", description: "the date written on every line (default: today)" },
      },
    },
    argv: (positionals, options) => ({
      arg: positionals[0],
      ...(positionals[1] != null ? { addition: positionals[1] } : {}),
      ...(options.slug != null ? { slug: options.slug } : {}),
      ...(options.log != null ? { log: String(options.log) } : {}),
      ...(options.stop ? { stop: true } : {}),
      ...(options.done ? { done: true } : {}),
      ...(options.abandon ? { abandon: true } : {}),
      ...(options.today != null ? { today: options.today } : {}),
    }),

    render(result) {
      if (result.move === "start") return `Started prototype ${result.ref} (${result.slug}) — active.`;
      if (result.move === "log") return `Logged on prototype ${result.ref}.`;
      if (result.move === "continue") {
        if (result.wrote === false) return `Prototype ${result.ref} is active — nothing to add.`;
        return result.from === "active" ? `Added a want to prototype ${result.ref}.` : `Reopened prototype ${result.ref} (${result.from} → active).`;
      }
      return `Prototype ${result.ref} — ${result.from} → ${result.status}; the hand-off is quoted in the Log.`;
    },

    json: (result) => result,
  },
};

return { prototypeCommand };
}
