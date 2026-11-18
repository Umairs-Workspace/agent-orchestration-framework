// The recall pick's CONTRACT (milestone 201, ADR-002 §6). A `recall --block` is no longer the
// ranker's first five: the seam shortlists the best-ranked records in scope, hands them to an
// injected picker as numbered cards, and the block is what the picker chose, or nothing.
//
// Everything that is the pick's own lives here and nowhere else (FF-20101): the shortlist size, the
// promoted-lesson filter, the request a picker is handed, the reader of its answer, the miss codes
// and the line that announces a miss. The seam (`../memory.mjs`) only orchestrates: it asks the
// port for the ranking, calls the picker, and hands what came back to `settlePick`.
//
// PURE. This module touches no disk and starts no process (FF-20102). The picker is a capability
// core injects, so knowledge never learns which model answers, or that one does.
//
// THE PICKER'S CONTRACT. `pickRecords(request, { config, ctx })` resolves to one of:
//   { answer, model? }   the picker's raw answer text, read here by `readPickAnswer`
//   { code, model? }     a miss, one of PICK_MISS
// A picker that throws, or resolves to neither, is `pick-failed`. Recall never fails because of
// the pick (ADR-003): every miss leaves the first `cap` records of the shortlist.
import { promotionPointers } from "@aof/work/memory-vocabulary";

// How many of the best-ranked records in scope a picker is shown. 177 measured the pick over 20.
export const PICK_SHORTLIST_SIZE = 20;
// How much of a record's text a card carries. A long ADR would otherwise crowd out the other cards.
export const PICK_CARD_TEXT_LIMIT = 1500;

// Why a block is the lexical one (ADR-003 §2). `off` and `unwired` are the configured behaviour,
// not a failure, so they are never announced.
export const PICK_MISS = Object.freeze({
  off: "pick-off",
  unwired: "pick-unwired",
  unavailable: "pick-unavailable",
  timeout: "pick-timeout",
  failed: "pick-failed",
  unreadable: "pick-unreadable",
});
const MISS_CODES = new Set(Object.values(PICK_MISS));
const UNANNOUNCED = new Set([PICK_MISS.off, PICK_MISS.unwired]);

export const PICK_MODE = Object.freeze({ model: "model", lexical: "lexical" });

// A lesson already promoted to a control, a rule or a prompt is enforced or loaded without recall,
// so it spends a place in the block on something the agent cannot miss (ADR-005). Keyed on the
// record type first: an ADR's `status` is `Accepted` and a gap's is its lifecycle, and neither is a
// promotion whatever it says.
export function isPromotedLesson(record) {
  return record?.recordType === "lesson" && promotionPointers(record.status).length > 0;
}

// The records a picker is shown: the ranking with promoted lessons dropped, cut at the shortlist
// size, or at the cap when the caller asked for a larger block. The filter runs BEFORE the cut, so
// a dropped lesson frees its place. It stands down when the scope names `status`: that caller is
// asking by promotion (ADR-005 §3).
export function shortlistRecords(ranked, { scope = {}, cap = 0 } = {}) {
  const asksByStatus = scope?.status != null && scope.status !== "";
  const candidates = asksByStatus ? ranked : ranked.filter((record) => !isPromotedLesson(record));
  return candidates.slice(0, Math.max(PICK_SHORTLIST_SIZE, cap));
}

// The request a picker is handed (ADR-002 §7): the query, the cap, and one card per shortlisted
// record, numbered from 1 in rank order. A card is the record's block line and its text, cut.
// `lineOf` is the seam's block-line render, passed in so the line has one home there.
export function buildPickRequest({ query, shortlist, cap, lineOf }) {
  return {
    query: query ?? "",
    cap,
    cards: shortlist.map((record, index) => ({
      number: index + 1,
      line: lineOf(record),
      text: String(record.text ?? "").slice(0, PICK_CARD_TEXT_LIMIT),
    })),
  };
}

// What a model is told before it reads a request. Picking nothing is stated as a correct answer,
// because a model handed cards will otherwise pick some.
export const PICK_INSTRUCTION = [
  "You choose which memory records an agent reads before it makes a decision.",
  "You are given the agent's query and a list of numbered cards. Each card is one record: a header line, then the record's text.",
  "Pick a card only when its record would change what the agent does about this query: a lesson, a decision or a gap that bears on it directly.",
  "A card that only shares words with the query does not apply. If no card applies, pick none; an empty answer is a correct answer.",
  "Never pick more cards than the request allows, and put the most applicable first.",
  "Answer with a JSON array of card numbers and nothing else, for example [7, 2]. Answer [] when none applies.",
].join("\n");

// The request as the text a model reads: the query, the cap, then each card under its number.
export function renderPickRequest(request) {
  const cards = request.cards.map((card) => `[${card.number}] ${card.line}\n${card.text}`);
  return [`Query: ${request.query}`, `Pick at most ${request.cap} of the ${request.cards.length} cards below, or none.`, "", cards.join("\n\n"), ""].join("\n");
}

// The first JSON array in an answer that is not inside an object, or null. `Here: [2, 5]. Done.`
// holds one. `{ "cards": [1] }` does not: an array wrapped in an object is a different answer from
// the one asked for, and guessing at its meaning is how a wrong card gets picked.
function firstArray(answer) {
  let braces = 0;
  for (let at = 0; at < answer.length; at += 1) {
    const char = answer[at];
    if (char === "{") braces += 1;
    else if (char === "}") braces = Math.max(0, braces - 1);
    else if (char === "[" && braces === 0) {
      const parsed = arrayAt(answer, at);
      if (parsed !== null) return parsed;
    }
  }
  return null;
}

// The JSON array that opens at `from`, or null when the bracket there does not open one.
function arrayAt(answer, from) {
  let brackets = 0;
  for (let at = from; at < answer.length; at += 1) {
    if (answer[at] === "[") brackets += 1;
    else if (answer[at] === "]" && (brackets -= 1) === 0) {
      try {
        const parsed = JSON.parse(answer.slice(from, at + 1));
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        // A bracket in prose, not JSON: the caller carries on to the next one.
        return null;
      }
    }
  }
  return null;
}

// Read a picker's answer (ADR-002 §7) into card numbers, most applicable first: the first JSON
// array, with a number outside the cards and a repeat dropped, cut at the cap. `[]` is a pick of
// nothing. Null means unreadable: no array, or a non-empty array naming no card, which is never
// taken for an empty block.
export function readPickAnswer(answer, { cards, cap }) {
  if (typeof answer !== "string") return null;
  const array = firstArray(answer);
  if (array === null) return null;
  const numbers = [];
  for (const entry of array) {
    if (!Number.isInteger(entry) || entry < 1 || entry > cards || numbers.includes(entry)) continue;
    numbers.push(entry);
  }
  if (array.length > 0 && numbers.length === 0) return null;
  return numbers.slice(0, cap);
}

// Turn what the picker returned into the block's records and the report of how it was made
// (ADR-002 §4, §8; ADR-003 §1). `outcome` is the picker's resolution, or null when no picker was
// asked because the shortlist was empty.
export function settlePick({ shortlist, cap, outcome }) {
  const model = typeof outcome?.model === "string" ? outcome.model : null;
  const report = (mode, code) => ({ mode, code, shortlisted: shortlist.length, model });
  const lexical = (code) => ({ records: shortlist.slice(0, cap), pick: report(PICK_MODE.lexical, code) });
  if (shortlist.length === 0) return lexical(null);
  if (outcome === null || typeof outcome !== "object") return lexical(PICK_MISS.failed);
  if (outcome.code != null) return lexical(MISS_CODES.has(outcome.code) ? outcome.code : PICK_MISS.failed);
  if (typeof outcome.answer !== "string") return lexical(PICK_MISS.failed);
  const numbers = readPickAnswer(outcome.answer, { cards: shortlist.length, cap });
  if (numbers === null) return lexical(PICK_MISS.unreadable);
  return { records: numbers.map((number) => shortlist[number - 1]), pick: report(PICK_MODE.model, null) };
}

// The one stderr line an announced miss prints (ADR-003 §3), or null when there is nothing to
// say. It mirrors the graph-signal line, and names how many records the block holds.
export function pickAnnouncement(pick, blockSize) {
  if (pick?.mode !== PICK_MODE.lexical || pick.code == null || UNANNOUNCED.has(pick.code)) return null;
  return `[memory] pick unavailable (${pick.code}) — this block is the lexical top ${blockSize}; records intact.`;
}
