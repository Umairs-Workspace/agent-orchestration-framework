// work:promote — THE ONE MINT (milestone 127 / ADR-003, story 02).
//
// A backlog item is born with no number (ADR-001 §2: `number: null`, `ref: <slug>`,
// `backlog: <group>`), and `aof work promote <slug> [--at P]` is the moment it gets one and enters
// the stream. Two places minted before this story — the `aof:add-*` prompts' "max NN + 1" and
// `appendPosition` — and after it the only minting CODE PATH is this module; every other minter is
// a caller of the SAME `appendPosition` (`src/work-promote/promotion.mjs`, whose src callers are
// exactly this module, the two `promote-*-to-chore` faces and `migrate-folder.mjs`).
//
// WHAT THIS MODULE OWNS, AND WHAT IT BORROWS. It computes ONE thing for itself: the
// archived-number check (below), and that decides only whether to REFUSE. Everything that changes
// the tree is borrowed:
//   · the default position is `appendPosition`, unchanged — the highest number ever minted plus
//     one, over live AND archived rows (ADR-003 §2 as amended by 127/01: a number is never
//     retired, so archiving the highest-numbered item must not re-mint its number);
//   · `--at P` opens the slot through the EXISTING transition seam (`transitionStreamReindexed`,
//     `space: "top-level"` — the item lock in front, `reindexForInsert` as the fact,
//     `stream.reindexed` with its remap as the event). This story adds no engine, no second
//     slot-open and no second event, and this module NEVER imports `src/work/reindex.mjs`: the
//     count it gates on comes through `insert-shared.mjs`'s exported gate (FF-12703 leg (d) —
//     the engine's src importers stay `{ insert-shared.mjs, effects/stream-transitions.mjs }`);
//   · the confirm gate is the INSERT gate verbatim (`guardSlotOpenCount`): one threshold, one
//     `insert-confirm-required` code, one message shape. It is consulted ONLY when `--at` is
//     given — an append opens no slot, so no count is taken and a `confirmThreshold` of 0 cannot
//     touch it.
//
// THE MOVE IS A RENAME, NEVER A COPY, so a folder's `runs/`, `tasks/` and every other file travel
// verbatim; the `backlog:` group was a path and is written nowhere (ADR-003 §3). The stamp is the
// SURGICAL single-line frontmatter discipline (41/ADR-001): ONE `number:` line replaced or
// inserted, nothing reserialised through `parseFrontmatter`, `updated:` NOT bumped (promotion is
// placement, not authorship), and one bounded prose courtesy on the first H1 of the record doc and
// of a `STATE.md` beside it. No other file in the folder is opened.
//
// EVERY REFUSAL LANDS BEFORE ANY WRITE. The order is: resolve → numeric-ref → record doc usable →
// destination free → depends → archived-number → gate → [seam: lock → shift → event] → rename →
// stamp. Everything before the seam is a pure read, so a refused promote leaves the backlog leaf,
// its group and the stream byte-identical.
//
// THE ALIASES LIVE HERE TOO (ADR-003 §4, task 03). `runInsertTopLevel` — `insert-milestone`,
// `insert-chore`, `insert-uat` and the two loop promotion faces — keeps its delivered signature and
// envelope and is now a COMPOSITION of two things: `scaffoldBacklogDriver` (the un-numbered write
// side, in `insert-shared.mjs`) and `promote --at P` over the leaf it just wrote. It is defined
// here rather than in `insert-shared.mjs` because the other import direction would be a cycle.
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, rename, rm } from "node:fs/promises";
import { listItems, findWork, parseFrontmatter, recordDoc, isLiveStreamRow, isDependTarget, BACKLOG_ROOT } from "../work.mjs";
import { appendPosition } from "../work-promote/promotion.mjs";
import { transitionStreamReindexed } from "../effects/stream-transitions.mjs";
import { writeText } from "../fs.mjs";
import { commandError } from "../command-error.mjs";
import {
  INSERT_FLAGS,
  guardSlotOpenCount,
  normalizeSlug,
  parseDependsInput,
  parsePosition,
  scaffoldBacklogDriver,
} from "./insert-shared.mjs";

// Local `asList` mirror — work.mjs's own helper is not exported, and `src/work/reindex.mjs` mirrors
// it for the same reason: a one-line helper is cheaper to mirror than to widen the 36-importer
// god-node's public surface for (m41/ADR-001).
const asList = (value) => (Array.isArray(value) ? value : value == null || value === "" ? [] : [value]);
const sameNum = (a, b) => Number.parseInt(a, 10) === Number.parseInt(b, 10);
const slash = (value) => String(value).replaceAll("\\", "/");

// ─────────────────────────────────────────────────────────────── resolution ──

// A live or archived row, labelled so a refusal is legible in BOTH vocabularies the operator might
// be holding: the ref they would reach it by, and the folder they can see. `05 (archive/…)` says
// "already in the stream, and over there" in one phrase.
function streamLabel(workDir, row) {
  const dir = row.dir == null ? null : slash(path.relative(workDir, row.dir));
  return dir ? `${row.ref} (${dir})` : String(row.ref);
}

// A backlog row as `<group>/<name>` — the spelling ADR-001 §2 gives a backlog leaf, and the one
// that tells two same-slug leaves apart (the group is the only thing that differs).
function backlogLabel(row) {
  const name = path.basename(row.dir ?? "");
  const group = row.backlog ?? "";
  return group === "" ? name : `${group}/${name}`;
}

// `work.intake` IS READ EXACTLY ONCE IN THIS MODULE, and only to explain a refusal (ADR-005 §1,
// FF-12704). Absent reads as `"stream"`, and only the exact string `"backlog"` selects the backlog
// — so a project that was never migrated gets the sentence that tells it why nothing resolved, and
// a project already on the backlog gets no mention of the key at all. Nothing else here branches on
// it: the read side is mode-less, and so is the verb (a stray backlog leaf in a `"stream"` project
// still promotes).
function intakeIsStream(config) {
  return config?.work?.intake !== "backlog";
}

// The free-text resolution, narrowed to exactly one backlog row (ADR-003 §1).
//
// `findWork`'s free-text branch matches by SUBSTRING over `slug` and `name`, so `promote delta` can
// answer `delta`, `delta-two` and a live `14_milestone_delta-lake` at once. Keep only the rows with
// `number: null`, then prefer the row whose `slug` EQUALS the argument — exactly one such row is
// the target. An exact match is needed only to BREAK A TIE: one substring match is one row.
async function resolveBacklogRow(workDir, config, arg) {
  const rows = await findWork(workDir, arg);
  const backlog = rows.filter((row) => row.number === null);
  const inStream = rows.filter((row) => row.number !== null);

  if (backlog.length === 0) {
    const named = inStream.map((row) => streamLabel(workDir, row)).sort();
    const already = named.length > 0 ? ` Already in the stream: ${named.join(", ")}.` : "";
    const intake = intakeIsStream(config)
      ? ' Nothing is born in the backlog under `work.intake: "stream"` — set it to "backlog", or add the item under backlog/ by hand.'
      : "";
    throw commandError(`no backlog item matches "${arg}".${already}${intake}`, "promote-not-found", 404);
  }

  if (backlog.length === 1) return backlog[0];

  const needle = arg.toLowerCase();
  const exact = backlog.filter((row) => row.slug.toLowerCase() === needle);
  if (exact.length === 1) return exact[0];

  // Two or more backlog rows and no single exact match — including two rows whose slug BOTH equal
  // the argument (one slug in two groups, or two types), which is the same ambiguity.
  const candidates = (exact.length > 1 ? exact : backlog).map(backlogLabel).sort();
  throw commandError(
    `"${arg}" matches ${candidates.length} backlog items — name one exactly: ${candidates.join(", ")}.`,
    "promote-ambiguous",
    409,
  );
}

// ──────────────────────────────────────────────── the surgical single-line stamp ──

// 41/ADR-001, applied to the one line promotion owns. Returns the stamped text, or null when the
// record doc has no locatable frontmatter block or no insert point — in which case the promote is
// refused BEFORE the rename, because the stamp must not be able to fail after it.
//
// The block is matched anchored at byte 0 with no /m flag, which is the whole of 41/ADR-001's
// "a fence that is not line 1 is not a block": a `<!-- aof-generated: bundle -->` line above the
// opening `---`, an unclosed block and an empty file are all "no block".
//
// WHICHEVER ONE LINE EXISTS: a `number:` line is REPLACED (whatever value it held — the folder
// grammar made the row a backlog row, not the doc, so the old value is replaced and never read);
// with none, ONE `number: NN` line is inserted directly after the `type:` line, terminated with the
// doc's own line ending. `number:` is matched as a WHOLE KEY, so `numbers: [1]` is not one. A block
// carrying neither line has no insert point.
export function stampNumber(text, padded) {
  const block = String(text ?? "").match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!block) return null;
  const fm = block[2];
  const newline = block[1].includes("\r\n") ? "\r\n" : "\n";

  let stamped;
  if (/^number:/m.test(fm)) {
    // `[^\r\n]*` rather than `.*$`: with /m, `$` matches before `\n` only, so `.*` would eat a CRLF
    // doc's `\r` and silently convert the one line it is meant to leave byte-aligned.
    stamped = fm.replace(/^(number:)[ \t]*[^\r\n]*/m, `$1 ${padded}`);
  } else if (/^type:/m.test(fm)) {
    stamped = fm.replace(/^(type:[ \t]*[^\r\n]*)/m, `$1${newline}number: ${padded}`);
  } else {
    return null;
  }

  // Reassembled byte-for-byte around the one changed line: the fences and every byte of the body
  // are untouched by anything other than the heading courtesy below.
  return block[1] + stamped + block[3] + prefixFirstHeading(text.slice(block[0].length), padded);
}

// THE HEADING COURTESY, bounded to one prefix on one heading. The FIRST first-level heading —
// wherever it sits, so a `## Context` above it is not it — gains the stream's `# NN · ` prefix
// when it does not already begin with a number. "Begins with a number" is the whole test: `# 07 ·`
// (a stale number is the operator's to fix) and `# 12 Delta` are both left alone, and a doc with no
// H1 gains none.
export function prefixFirstHeading(text, padded) {
  const match = String(text ?? "").match(/^#(?!#)[ \t]+([^\r\n]*)/m);
  if (!match) return text;
  const heading = match[1];
  if (/^\d/.test(heading)) return text;
  return text.slice(0, match.index) + `# ${padded} · ${heading}` + text.slice(match.index + match[0].length);
}

// ──────────────────────────────────────────────────────── depends at promotion ──

// ADR-003 §6 — a backlog item's `depends:` is a planning note until promotion checks it, so this is
// where the note becomes an edge. Entries are read as `parseFrontmatter` hands them (quotes and
// surrounding spaces stripped, an empty entry dropped, a duplicate kept) and checked against the
// PRE-shift stream: the operator wrote them against the numbers that exist now, and the engine's
// own rewrite carries them across a shift.
//
//   · an all-digit entry must name a NUMBERED top-level item `isDependTarget` admits — LIVE OR
//     ARCHIVED. An archived target is satisfied, not missing (ADR-002 §3: the archive is a
//     location, not a status), and `sameNum` makes `5` and `05` one number.
//   · an entry naming a BACKLOG slug (exact, case-sensitive — a slug is lowercase by grammar) is
//     `promote-depends-backlog`: numbers are minted in the order the operator promotes, so a
//     backlog → backlog edge cannot be written as a number yet.
//   · anything else is `promote-depends-unresolved`.
//
// EVERY offending entry comes back, in the order written, so the operator fixes the note once.
export function classifyDepends(entries, items) {
  const targets = items.filter((item) => item.number != null && item.parent == null && isDependTarget(item));
  const backlogSlugs = new Set(items.filter((item) => item.number == null).map((item) => item.slug));
  const offenders = [];
  for (const raw of entries) {
    const entry = String(raw);
    if (/^\d+$/.test(entry)) {
      if (!targets.some((item) => sameNum(item.number, entry))) {
        offenders.push({ entry, code: "promote-depends-unresolved" });
      }
      continue;
    }
    offenders.push({ entry, code: backlogSlugs.has(entry) ? "promote-depends-backlog" : "promote-depends-unresolved" });
  }
  return offenders;
}

function dependsRefusal(slug, offenders) {
  const lines = offenders.map(({ entry, code }) =>
    code === "promote-depends-backlog"
      ? `\`${entry}\` is a backlog item — a planning note, not a gate. Promote \`${entry}\` first, or drop the entry.`
      : `\`${entry}\` resolves to no numbered item in the stream or the archive.`);
  const error = commandError(
    `"${slug}" cannot be promoted as its \`depends:\` is written:\n- ${lines.join("\n- ")}`,
    offenders[0].code,
    409,
  );
  error.detail = { entries: offenders };
  return error;
}

// ─────────────────────────────────────────────────── the archived-number check ──

// ADR-003 §4 / ADR-002 §2 — the one thing promote computes for itself, and it decides only whether
// to refuse. The engine shifts LIVE rows only (`selectAffected`), so archived numbers stand still —
// and a promotion that wrote a number an archived driver holds would put two folders on one number,
// in two roots. The numbers a promotion WRITES are `P` itself and `n + 1` for every live top-level
// `n >= P`; an enumeration of exactly those, through the ONE predicate over `listItems` rather than
// a second derivation of "which rows move".
export function numbersWritten(items, at) {
  const written = new Set([at]);
  for (const item of items.filter(isLiveStreamRow)) {
    if (item.parent != null) continue;
    const number = Number.parseInt(item.number, 10);
    if (Number.isSafeInteger(number) && number >= at) written.add(number + 1);
  }
  return written;
}

// Every archived top-level row holding one of those numbers, ascending — an archived row is a
// NUMBERED row the predicate refuses, read that way round so the flag is consulted in one place.
export function archivedCollisions(workDir, items, at) {
  const written = numbersWritten(items, at);
  return items
    .filter((item) => item.number != null && item.parent == null && !isLiveStreamRow(item))
    .filter((item) => written.has(Number.parseInt(item.number, 10)))
    .map((item) => ({ number: item.number, folder: slash(path.relative(workDir, item.dir)) }))
    .sort((a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10));
}

// ───────────────────────────────────────────────────────────────── the verb ──

// The stream's own zero-pad width: the FIRST numbered top-level row BY NUMBER — live or archived,
// because the archive holds numbers too — and the documented 2-digit default over a stream that
// holds no numbered row at all (an empty one, or one holding nothing but a backlog).
function streamWidth(items) {
  const numbered = items
    .filter((item) => item.parent == null && item.number != null)
    .sort((a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10));
  return numbered[0]?.number.length ?? 2;
}

// promoteRow(ctx, row, { at, atGiven, yes }) — the promotion over an ALREADY-RESOLVED backlog row.
// Split from `runPromote` so the aliases can hand over the leaf they just scaffolded rather than an
// argument: the resolver's refusals (`promote-not-found`, `promote-ambiguous`, `promote-numeric-ref`)
// then cannot fire on an alias, and `insert-chore 12 --at 1` still yields `01_chore_12`.
async function promoteRow(ctx, row, { at: namedAt, atGiven, yes } = {}) {
  const workDir = ctx.workspace.workDir;
  const items = await listItems(workDir);

  // (1) THE RECORD DOC IS USABLE — checked before anything moves, so the stamp cannot fail after
  //     the rename. A pure read: the text is re-read after the shift, which may have rewritten its
  //     `depends:`, and stamped then.
  const doc = recordDoc(row);
  const docPath = doc == null ? null : path.join(row.dir, doc);
  let docText = "";
  if (docPath != null) {
    try {
      docText = await readFile(docPath, "utf8");
    } catch {
      docText = "";
    }
  }
  if (docPath == null || stampNumber(docText, "00") == null) {
    throw commandError(
      `"${docPath == null ? row.dir : slash(path.relative(workDir, docPath))}" has no frontmatter block with a \`number:\` or \`type:\` line — there is nowhere to stamp the minted number.`,
      "promote-record-doc-unusable",
      422,
    );
  }

  // (2) THE POSITION. Default is `appendPosition`, unchanged; `--at P` is the caller's.
  const at = atGiven ? namedAt : await appendPosition(workDir);
  const padded = String(at).padStart(streamWidth(items), "0");
  const destination = path.join(workDir, `${padded}_${row.type}_${row.slug}`);

  // (3) THE DESTINATION IS FREE. A DIRECTORY of that name would be a row `listItems` enumerates
  //     (so the mint would have stepped past it); a stray FILE would not, which is the case this
  //     refusal exists for.
  if (existsSync(destination)) {
    throw commandError(
      `"${slash(path.relative(workDir, destination))}" already exists — refusing to promote onto it.`,
      "promote-destination-exists",
      409,
    );
  }

  // (4) `depends:` (task 02), against the PRE-shift stream.
  const meta = parseFrontmatter(docText);
  const offenders = classifyDepends(asList(meta.depends), items);
  if (offenders.length > 0) throw dependsRefusal(row.slug, offenders);

  // (5) THE ARCHIVED-NUMBER CHECK — before the lock, the gate and any rename.
  const collisions = archivedCollisions(workDir, items, at);
  if (collisions.length > 0) {
    const named = collisions.map(({ number, folder }) => `${number} (${folder})`).join(", ");
    const error = commandError(
      `promoting "${row.slug}" at ${at} would write ${collisions.length === 1 ? "a number" : "numbers"} an archived item already holds: ${named}. An archived number is never re-minted — choose another position.`,
      "promote-number-archived",
      409,
    );
    error.detail = { collisions };
    throw error;
  }

  // (6) THE GATE — the INSERT gate, and only when a slot is being opened. An append shifts
  //     nothing, so no count is taken and a threshold of 0 cannot refuse it.
  // (7) THE SEAM — the existing slot-open: lock → shift → `stream.reindexed` with its remap.
  let shifted = 0;
  let space = "top-level";
  if (atGiven) {
    await guardSlotOpenCount(workDir, ctx.workspace.config, { at, space: "top-level", yes });
    const reindexed = await transitionStreamReindexed(
      ctx.workspace,
      { at, space: "top-level" },
      { publisherOptions: ctx, journalOptions: ctx.effectsJournalOptions ?? {} },
    );
    shifted = reindexed.shifted;
    space = reindexed.space;
  }

  // (8) THE MOVE — a RENAME, so `runs/`, `tasks/` and every other file travel verbatim.
  await rename(row.dir, destination);

  // (9) THE STAMP — re-read, because the shift's `rewriteReferences` pass may have rewritten this
  //     doc's own `depends:` before it moved.
  const movedDocPath = path.join(destination, doc);
  const stamped = stampNumber(await readFile(movedDocPath, "utf8"), padded);
  await writeText(movedDocPath, stamped);

  // …and the same courtesy on a `STATE.md` directly in the folder, whatever the type. No other
  // file is opened.
  const statePath = path.join(destination, "STATE.md");
  if (doc !== "STATE.md" && existsSync(statePath)) {
    const stateText = await readFile(statePath, "utf8");
    const prefixed = prefixFirstHeading(stateText, padded);
    if (prefixed !== stateText) await writeText(statePath, prefixed);
  }

  const created = { ref: padded, type: row.type, slug: row.slug, parent: null, dir: destination };
  // `created.depends` is the POST-promotion value of the doc's own `depends:` line, as numbers,
  // present iff the line exists — the identity echo the insert family reports (41/ADR-006), which
  // is why the aliases can return it verbatim with no arithmetic of their own.
  const stampedMeta = parseFrontmatter(stamped);
  if ("depends" in stampedMeta) {
    created.depends = asList(stampedMeta.depends).map((entry) => Number.parseInt(entry, 10)).filter(Number.isInteger);
  }

  return {
    shifted,
    at,
    space,
    created,
    from: { ref: row.slug, backlog: row.backlog ?? "", dir: row.dir },
  };
}

// runPromote(ctx, { slug, at, yes }) — the verb. `at` absent ⇒ append; `at` present and unusable ⇒
// `promote-invalid-at`, refused before any read of the stream.
export async function runPromote(ctx, { slug: rawSlug, at: rawAt, yes } = {}) {
  const workDir = ctx.workspace.workDir;
  const arg = typeof rawSlug === "string" ? rawSlug.trim() : "";
  // A blank substring matches every row, so an empty argument is refused before `findWork` is
  // asked rather than answered as "ambiguous".
  if (arg === "") {
    throw commandError("A backlog item's slug is required: aof work promote <slug> [--at <P>].", "promote-missing-slug", 400);
  }

  const atGiven = rawAt != null;
  let at = null;
  if (atGiven) {
    // The insert family's own `parsePosition` (`Number.parseInt`), so `2.5` reads as 2 exactly as
    // it does for `insert-milestone` — a lenient parser, shared rather than re-decided.
    at = parsePosition(rawAt);
    if (at == null) {
      throw commandError("--at must be a non-negative integer position.", "promote-invalid-at", 400);
    }
  }

  // An all-digit argument never reaches `findWork`'s free-text branch — `findWork("12")` is the
  // NUMBERED space — so it is refused up front. This is also where a backlog folder named
  // `milestone_12` (127/01's "unreachable slug") gets its answer.
  if (/^\d+$/.test(arg)) {
    throw commandError(
      `"${arg}" is a number, not a slug — a backlog item is promoted by its slug. An all-digit slug is unreachable through the numbered space: rename its folder.`,
      "promote-numeric-ref",
      400,
    );
  }

  const row = await resolveBacklogRow(workDir, ctx.workspace.config, arg);
  return await promoteRow(ctx, row, { at, atGiven, yes });
}

// ──────────────────────────────────────────── the insert-* aliases (ADR-003 §4) ──

// runInsertTopLevel(ctx, { type, slug, at, yes, today, dependsInput }) — the delivered signature and
// the delivered envelope (`{ shifted, at, space, created }`), now a COMPOSITION: scaffold into the
// backlog, then `promote --at P` over the LEAF it just wrote.
//
// `--at` stays REQUIRED on the alias (`insert-invalid-at` when omitted or unusable, the alias's own
// code — only bare `promote` appends) and the slug is normalised as it always was.
//
// THE ROLLBACK IS THE WHOLE REASON THIS READS THE WAY IT DOES. `promote-depends-*`,
// `promote-destination-exists`, `promote-number-archived` and the confirm gate are checks promote
// runs OVER THE LEAF, so they can only fire once it exists. Cheap pre-flights run first (slug,
// `--at`, every template read, `insert-backlog-exists`); then the leaf is written and promote runs
// inside a rollback that removes the leaf it wrote — and the `backlog/` root when the alias itself
// created it — ON REFUSAL AND ON SUCCESS alike. The leaf is never left behind: a delivered cache
// suite counts the work root's directories after an insert, and the transient root would be one of
// them.
export async function runInsertTopLevel(ctx, { type, slug: rawSlug, at: rawAt, yes, today, dependsInput } = {}) {
  const workDir = ctx.workspace.workDir;

  const slug = normalizeSlug(rawSlug);
  if (!slug) throw commandError("A valid kebab-case slug is required.", "insert-invalid-slug", 400);

  const at = parsePosition(rawAt);
  if (at == null) throw commandError("A target position (--at) is required and must be a non-negative integer.", "insert-invalid-at", 400);

  // A uat's `--depends` is written INTO the leaf as the operator gave it (current numbers) and
  // comes out post-shift because the engine's rewrite reaches the backlog before the leaf moves.
  const depends = type === "uat" ? parseDependsInput(dependsInput) : null;

  const backlogRoot = path.join(workDir, BACKLOG_ROOT);
  const rootExisted = existsSync(backlogRoot);
  const leaf = await scaffoldBacklogDriver(ctx.workspace, {
    type,
    slug,
    today: today ?? new Date().toISOString().slice(0, 10),
    depends,
  });

  try {
    const result = await promoteRow(
      ctx,
      { ref: slug, type, slug, parent: null, dir: leaf.dir, number: null, backlog: "" },
      { at, atGiven: true, yes },
    );
    return { shifted: result.shifted, at: result.at, space: result.space, created: result.created };
  } catch (error) {
    await rm(leaf.dir, { recursive: true, force: true });
    throw error;
  } finally {
    if (!rootExisted) await rm(backlogRoot, { recursive: true, force: true });
  }
}

export const promoteCommand = {
  id: "work:promote",
  input: {
    type: "object",
    properties: {
      slug: { type: "string" },
      at: { type: ["number", "string"] },
      yes: { type: "boolean" },
    },
    required: ["slug"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    return await runPromote(ctx, { slug: input.slug, at: input.at, yes: Boolean(input.yes) });
  },

  cli: {
    route: ["work", "promote"],
    spec: {
      usage: "aof work promote <slug> [--at <P>] [--yes] [--json]",
      // The SHARED insert-verb flag vocabulary, so `--force` stays the alias of `--yes` it is
      // everywhere else in this family.
      flags: INSERT_FLAGS,
    },

    argv: (positionals, options) => ({
      slug: positionals[0],
      at: options.at,
      yes: Boolean(options.yes || options.force),
    }),

    // The two renders the contract names. Whether the operator NAMED a position is an argv fact,
    // not an envelope fact (the envelope is frozen), so it is read from the `faceCtx` every render
    // already receives rather than smuggled onto the result.
    render(result, faceCtx) {
      const named = faceCtx?.options?.at != null;
      return named
        ? `Promoted "${result.created.slug}" to ${result.created.ref} (at ${result.at}, shifted ${result.shifted} item(s)).`
        : `Promoted "${result.created.slug}" to ${result.created.ref} (appended).`;
    },

    // The stdout envelope is the in-process envelope with its two `dir` values forward-slashed
    // (task 00: "stdout is the envelope above, `dir` values forward-slashed") — a path the
    // operator can paste on any shell. Every OTHER key is byte-identical: the in-process envelope
    // keeps native paths for its callers, and `created.depends`, when present, is untouched.
    json: (result) => ({
      ...result,
      created: { ...result.created, dir: slash(result.created.dir) },
      from: { ...result.from, dir: slash(result.from.dir) },
    }),
  },
};
