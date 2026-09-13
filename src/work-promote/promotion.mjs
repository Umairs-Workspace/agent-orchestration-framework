// The promotion ENGINE — milestone 71 / story 01, ADR-004.
//
// One engine, two faces. This module owns the promotion mechanics both `work:promote-gap` and
// `work:promote-finding` share: the slug derivation, the append position, the idempotence scan, and
// the orchestration that calls the chore insert seam and seeds the record it writes. The faces own
// only their own provenance and their own refusals.
//
// THE LAYERING IS FIXED (ADR-009): this family imports NOTHING from `../commands/`, and that is a
// deliberate boundary rather than an accident of what it happened to need. `src/work-tune/`,
// `src/work-audit/` and `src/work-acceptor/` contain zero such imports between them, and ADR-004
// would have made `src/work-promote/` the first. So the engine owns the seeding, the
// back-reference, the idempotence scan and the append position OVER DATA HANDED TO IT, and the two
// FACES call `runInsertTopLevel` themselves. The scaffold call is a face's act; everything the
// scaffold cannot know is this engine's.
//
// THE LOOP'S CREATION AUTHORITY IS ONE TYPE IN ONE PLACE (ADR-003). `PROMOTED_TYPE` is the one home
// for the literal both faces pass, so neither spells it and no third value can enter through either.
// That is load-bearing rather than belt-and-braces: `runInsertTopLevel` performs no type validation
// of its own — a wrong type reaches `scaffoldBacklogDriver` (127/02), which refuses it as
// `insert-invalid-type`, a generic refusal that names no face. FF-7103 is what keeps the literal ONE.
import path from "node:path";
import { readFile } from "node:fs/promises";
import { listItems } from "../work.mjs";
import { writeText } from "../fs.mjs";
import { seedChoreContent } from "./chore-seed.mjs";

// The ONE type a promotion can emit, stated once so no call site spells it twice.
export const PROMOTED_TYPE = "chore";

// "warnings_delivered field" -> "warnings-delivered-field" — the SAME kebab-case a slug must
// satisfy (insert-shared.mjs's normalizeSlug), derived from the promoted thing's OWN title so this
// works for any title rather than a hardcoded one.
export function slugifyTitle(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// The default target position when the caller names none: after every existing top-level item, so
// `shifted === 0` and no ref in flight is invalidated. A renumber mid-walk would break every ref the
// walk is holding, which is why the LOOP never chooses a position (ADR-009 §1).
//
// DERIVED FROM THE HIGHEST NUMBER, NOT FROM THE COUNT — and that difference is a defect this story
// found rather than a preference. `selectAffected` (`src/work/reindex.mjs:53`) selects what an insert
// shifts by comparing each item's NUMBER with `at`, so over a stream with gaps a count-derived
// position lands BELOW existing items and renumbers them. Measured on this repository's own stream,
// which `aof work doctor` reports as missing numbers 29, 30, 31, 42, 65, 73, 74, 79, 80 and 81: the
// count is ten short of the next number, so a promotion would have shifted ten top-level items and
// invalidated every ref in flight — the exact failure ADR-003's append-only bound exists to prevent.
// Over a contiguous stream the two agree, which is why 39/03's suite never saw it.
//
// milestone 127 / ADR-002 §2, §4 — OVER EVERY NUMBERED ROW, LIVE AND ARCHIVED, and never
// through `isLiveStreamRow`. A number is never retired (SPEC): over live rows alone,
// archiving the highest-numbered item would re-mint its number for the next promotion.
// What the mint excludes is the BACKLOG row — it has no number, so it moves neither the
// highest nor the count floor (`topLevel.length` below), and `number != null` is the guard
// before the parse rather than an `isFinite` after it. This is also what makes the mint
// answer `0` over a backlog with nothing numbered: three un-numbered rows are not three
// numbers, and `00` is the first.
export async function appendPosition(workDir) {
  const topLevel = (await listItems(workDir)).filter((item) => item.parent == null && item.number != null);
  const highest = topLevel.reduce((max, item) => {
    const number = Number.parseInt(item.number, 10);
    return Number.isSafeInteger(number) && number > max ? number : max;
  }, -1);
  return Math.max(highest + 1, topLevel.length);
}

// ── idempotence ──────────────────────────────────────────────────────────────
// The key is the PAIR (reviewed item ref + finding title), normalized so that case and surrounding
// whitespace do not make two promotions of one finding look like two findings. It is written into
// the chore's own `## Notes` by `findingBackReference`, so the scan reads the record rather than a
// side index that could drift from it.
// BACKTICKS ARE STRIPPED, and that is a correctness fix rather than tidiness. The key is written
// into the chore's `## Notes` inside a backtick span, so a finding title carrying one — and review
// findings carry them constantly ("`routeFinding` is called twice per row") — would close the span
// early, and the scan would read back a truncated key, match nothing, and promote the same finding
// a second time. Removing them also makes the right two titles equal: "`routeFinding` is slow" and
// "routeFinding is slow" are one finding, not two.
export function normalizeFindingTitle(title) {
  return String(title ?? "").replaceAll("`", "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function promotionKey(ref, title) {
  return `finding:${String(ref ?? "").trim()}:${normalizeFindingTitle(title)}`;
}

const KEY_LINE_RE = /^-\s+\*\*Promotion key:\*\*\s+`([^`]+)`\s*$/;

// Every top-level chore already carrying `key`, or null. Reads the records themselves and filters by
// nothing else — a chore that has since been CLOSED still answers, because the finding it schedules
// was already scheduled and promoting it again would create a duplicate of finished work.
export async function findPromotedChore(workDir, key) {
  for (const item of await listItems(workDir)) {
    if (item.parent != null || item.type !== PROMOTED_TYPE) continue;
    // A top-level chore with no readable record is not a promotion this key can match. It is
    // skipped rather than thrown on: the scan runs BEFORE a write, and a malformed neighbour must
    // not be able to refuse an unrelated promotion.
    let text;
    try {
      text = await readFile(path.join(item.dir, "CHORE.md"), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      const match = KEY_LINE_RE.exec(line.trim());
      if (match && match[1] === key) return { ref: item.ref, slug: item.slug, dir: item.dir };
    }
  }
  return null;
}

// ── the seed, written into the record the face's scaffold call already wrote ──
// The ONE thing the generic scaffold cannot know: this chore's own close criterion and where the
// work came from. The face hands over the insert engine's OWN `created.dir` rather than re-deriving
// `${ref}_chore_${slug}` — that duplicated the naming convention and risked an ENOENT after a
// reindex shift.
export async function seedPromotedChore(dir, { definitionOfDone, backReference } = {}) {
  const chorePath = path.join(dir, "CHORE.md");
  const raw = await readFile(chorePath, "utf8");
  await writeText(chorePath, seedChoreContent(raw, { definitionOfDone, backReference }));
  return chorePath;
}
