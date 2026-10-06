import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, rename, rm } from "node:fs/promises";
import { listItems, findWork, isLiveStreamRow } from "../discovery.mjs";
import { parseFrontmatter, recordDoc } from "../records.mjs";
import { isDependNumber, rewriteDependsEntries } from "../dependencies.mjs";
import { BACKLOG_ROOT } from "../identity.mjs";
import { appendPosition } from "../promote/promotion.mjs";
import { classifyDepends, promotionCandidates } from "../promote/candidates.mjs";
import { writeText } from "@aof/foundation/fs";
import { commandError } from "@aof/contracts/error";

// Core supplies stream transitions, installed-version policy and composed insertion services.
export function createPromoteCommand({ transitionStreamReindexed, INSERT_FLAGS, guardSlotOpenCount, normalizeSlug, parseDependsInput, parsePosition, scaffoldBacklogDriver }) {
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
// stamp → rewire (the backlog edges this promotion satisfies, story 139). Everything before the
// seam is a pure read, so a refused promote leaves the backlog leaf, its group and the stream
// byte-identical.
//
// THE ALIASES LIVE HERE TOO (ADR-003 §4, task 03). `runInsertTopLevel` — `insert-milestone`,
// `insert-chore`, `insert-uat` and the two loop promotion faces — keeps its delivered signature and
// envelope and is now a COMPOSITION of two things: `scaffoldBacklogDriver` (the un-numbered write
// side, in `insert-shared.mjs`) and `promote --at P` over the leaf it just wrote. It is defined
// here rather than in `insert-shared.mjs` because the other import direction would be a cycle.

// Local `asList` mirror — work.mjs's own helper is not exported, and `src/work/reindex.mjs` mirrors
// it for the same reason: a one-line helper is cheaper to mirror than to widen the 36-importer
// god-node's public surface for (m41/ADR-001).
const asList = (value) => (Array.isArray(value) ? value : value == null || value === "" ? [] : [value]);
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
function stampNumber(text, padded) {
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
function prefixFirstHeading(text, padded) {
  const match = String(text ?? "").match(/^#(?!#)[ \t]+([^\r\n]*)/m);
  if (!match) return text;
  const heading = match[1];
  if (/^\d/.test(heading)) return text;
  return text.slice(0, match.index) + `# ${padded} · ${heading}` + text.slice(match.index + match[0].length);
}

// ──────────────────────────────────────────────────────── depends at promotion ──

// The gate itself (`classifyDepends`, ADR-003 §6) lives in `../promote/candidates.mjs` (story
// 152), so `--show-candidates` and `--next-item` ask the very rule a named promote asks.

function dependsRefusal(slug, offenders) {
  const lines = offenders.map(({ entry, code }) =>
    code === "promote-depends-backlog"
      ? `\`${entry}\` is still in the backlog — this item waits on it. Promote \`${entry}\` first, or drop the entry.`
      : `\`${entry}\` resolves to no numbered item in the stream or the archive.`);
  const error = commandError(
    `"${slug}" cannot be promoted as its \`depends:\` is written:\n- ${lines.join("\n- ")}`,
    offenders[0].code,
    409,
  );
  error.detail = { entries: offenders };
  return error;
}

// ─────────────────────────────────────────── the edges this promotion satisfies ──

// Story 139 — THE OTHER HALF OF THE GATE. A backlog item whose `depends:` names this item's slug
// was refused while it waited (`promote-depends-backlog`); now that the item has a number, every
// such entry is rewritten to it, so the dependent's next promote passes rather than dangling as
// `promote-depends-unresolved` until someone re-types the edge.
//
// Run AFTER the seam, the move and the stamp: the shift rewrites number entries, and `padded` is
// the number the item landed at, so an entry written before the seam would be carried one past
// it. Two bounds, both deliberate:
//   · BACKLOG rows only. A numbered item naming a slug is validate's finding, the operator's to fix.
//   · a UNIQUE slug only, judged over the PRE-move backlog (`before`). An `insert-*` alias
//     scaffolds a root leaf and promotes it directly, so a grouped leaf can share its slug — an
//     edge then names the leaf that is still in the backlog, and nothing is rewritten.
// The write is the shared per-entry rewriter in work.mjs (never `reindex.mjs`, FF-12703): an
// entry equal to the slug — exact and case-sensitive — becomes `padded`, keeping its spacing and
// quotes, and no other byte of the doc moves. Answers `{ ref, dir }` per doc written, ordered by
// backlog path.
async function resolveBacklogEdges(workDir, row, padded, before) {
  const sharing = before.filter((item) => item.number == null && item.slug === row.slug);
  if (sharing.length !== 1) return [];

  // Re-listed, because the promoted folder has moved and must not be read as its own dependent.
  const dependents = (await listItems(workDir)).filter((item) => item.number == null);
  const rewired = [];
  for (const dependent of dependents) {
    const doc = recordDoc(dependent);
    if (doc == null) continue;
    const docPath = path.join(dependent.dir, doc);
    let text;
    try {
      text = await readFile(docPath, "utf8");
    } catch {
      continue;
    }
    const updated = rewriteDependsEntries(text, (entry) => (entry === row.slug ? padded : null));
    if (updated === text) continue;
    await writeText(docPath, updated);
    rewired.push({ ref: dependent.slug, dir: dependent.dir, label: backlogLabel(dependent) });
  }
  return rewired
    .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0))
    .map(({ ref, dir }) => ({ ref, dir }));
}

// ─────────────────────────────────────────────────── the archived-number check ──

// ADR-003 §4 / ADR-002 §2 — the one thing promote computes for itself, and it decides only whether
// to refuse. The engine shifts LIVE rows only (`selectAffected`), so archived numbers stand still —
// and a promotion that wrote a number an archived driver holds would put two folders on one number,
// in two roots. The numbers a promotion WRITES are `P` itself and `n + 1` for every live top-level
// `n >= P`; an enumeration of exactly those, through the ONE predicate over `listItems` rather than
// a second derivation of "which rows move".
function numbersWritten(items, at) {
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
function archivedCollisions(workDir, items, at) {
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
    created.depends = asList(stampedMeta.depends).filter(isDependNumber).map((entry) => Number.parseInt(entry, 10));
  }

  // (10) THE EDGES THIS PROMOTION SATISFIES — last, after the seam, the move and the stamp.
  const rewired = await resolveBacklogEdges(workDir, row, padded, items);

  return {
    shifted,
    at,
    space,
    created,
    from: { ref: row.slug, backlog: row.backlog ?? "", dir: row.dir },
    // Present iff a doc was rewritten, so every promote that rewires nothing reports the
    // delivered envelope byte-for-byte (127/02 task 00).
    ...(rewired.length > 0 ? { rewired } : {}),
  };
}

// Story 152 — the three ways to call the verb are exclusive, and a conflict is refused before the
// work tree is read (Q5): a slug, `--next-item`, or `--show-candidates`, and the read-only
// `--show-candidates` takes neither `--at` nor `--yes`.
function refuseFlagConflict({ arg, nextItem, showCandidates, atGiven, yes }) {
  const modes = [arg !== "" && "a slug", nextItem && "--next-item", showCandidates && "--show-candidates"].filter(Boolean);
  const placed = showCandidates ? [atGiven && "--at", yes && "--yes"].filter(Boolean) : [];
  if (modes.length < 2 && placed.length === 0) return;
  const named = modes.length >= 2 ? modes.join(" and ") : `--show-candidates and ${placed.join(" and ")}`;
  throw commandError(
    `${named} cannot be combined: aof work promote <slug> | --next-item [--at <P>] [--yes] | --show-candidates.`,
    "promote-flag-conflict",
    400,
  );
}

// The sentence for a backlog with no candidate — the same words on the read and on the refusal.
function noCandidateSentence({ candidates, waiting }) {
  if (candidates.length > 0) return null;
  return waiting.length === 0 ? "The backlog is empty." : "No backlog item can be promoted yet.";
}

// runPromote(ctx, { slug, at, yes, showCandidates, nextItem }) — the verb. `at` absent ⇒ append;
// `at` present and unusable ⇒ `promote-invalid-at`, refused before any read of the stream.
// `--show-candidates` answers `{ candidates, waiting }` and writes nothing; `--next-item` hands
// the head of `candidates` to `promoteRow`, the path a named promote takes, and adds only the
// choice of row (`next`, which the JSON face does not print).
async function runPromote(ctx, { slug: rawSlug, at: rawAt, yes, showCandidates = false, nextItem = false } = {}) {
  const workDir = ctx.workspace.workDir;
  const arg = typeof rawSlug === "string" ? rawSlug.trim() : "";
  refuseFlagConflict({ arg, nextItem, showCandidates, atGiven: rawAt != null, yes });
  // A blank substring matches every row, so an empty argument is refused before `findWork` is
  // asked rather than answered as "ambiguous".
  if (arg === "" && !nextItem && !showCandidates) {
    throw commandError("A backlog item's slug is required: aof work promote <slug> [--at <P>].", "promote-missing-slug", 400);
  }

  // A flag the face does not know (`-h`) arrives as a positional, and the free-text resolver's
  // SUBSTRING match would promote whatever slug contains it. A slug never begins with `-`.
  if (arg.startsWith("-")) {
    throw commandError(
      `"${arg}" is a flag promote does not know, not a slug: aof work promote <slug> | --next-item [--at <P>] [--yes] | --show-candidates.`,
      "promote-flag-conflict",
      400,
    );
  }

  if (showCandidates) return await promotionCandidates(await listItems(workDir));

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

  if (nextItem) {
    const items = await listItems(workDir);
    const answer = await promotionCandidates(items);
    const empty = noCandidateSentence(answer);
    if (empty != null) {
      throw commandError(`${empty} Nothing was promoted — aof work promote --show-candidates names what each item waits on.`, "promote-no-candidates", 409);
    }
    const head = answer.candidates[0];
    const row = items.find((item) => item.number == null && item.dir === head.dir);
    const result = await promoteRow(ctx, row, { at, atGiven, yes });
    return { ...result, next: { slug: head.slug, type: head.type, unblocks: head.unblocks } };
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
async function runInsertTopLevel(ctx, { type, slug: rawSlug, at: rawAt, yes, today, dependsInput } = {}) {
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

const promoteCommand = {
  id: "work:promote",
  input: {
    type: "object",
    properties: {
      slug: { type: "string" },
      at: { type: ["number", "string"] },
      yes: { type: "boolean" },
      showCandidates: { type: "boolean" },
      nextItem: { type: "boolean" },
    },
    additionalProperties: false,
  },

  async run(input, ctx) {
    return await runPromote(ctx, {
      slug: input.slug,
      at: input.at,
      yes: Boolean(input.yes),
      showCandidates: Boolean(input.showCandidates),
      nextItem: Boolean(input.nextItem),
    });
  },

  cli: {
    route: ["work", "promote"],
    spec: {
      usage: "aof work promote <slug> | --next-item [--at <P>] [--yes] [--json] | --show-candidates [--json]",
      // The SHARED insert-verb flag vocabulary, so `--force` stays the alias of `--yes` it is
      // everywhere else in this family; story 152's two modes are spread beside it, never into it.
      flags: {
        ...INSERT_FLAGS,
        nextItem: { type: "boolean", description: "promote the first backlog item --show-candidates lists" },
        showCandidates: { type: "boolean", description: "list the backlog items that can be promoted now, in order, then those that wait; writes nothing" },
      },
    },

    argv: (positionals, options) => ({
      slug: positionals[0],
      at: options.at,
      yes: Boolean(options.yes || options.force),
      ...(options.showCandidates ? { showCandidates: true } : {}),
      ...(options.nextItem ? { nextItem: true } : {}),
    }),

    // The renders the contracts name. Whether the operator NAMED a position, or asked for the
    // candidates, is an argv fact, not an envelope fact (the envelope is frozen), so it is read
    // from the `faceCtx` every render already receives rather than smuggled onto the result.
    render(result, faceCtx) {
      if (faceCtx?.options?.showCandidates) return renderCandidates(result);
      const named = faceCtx?.options?.at != null;
      const promoted = named
        ? `Promoted "${result.created.slug}" to ${result.created.ref} (at ${result.at}, shifted ${result.shifted} item(s)).`
        : `Promoted "${result.created.slug}" to ${result.created.ref} (appended).`;
      // Story 152 — `--next-item` says which row it chose, on the line before.
      const chosen = result.next ? `Next candidate: ${result.next.slug} (${result.next.type}, unblocks ${result.next.unblocks}).\n` : "";
      // Story 139 — one more line, only when edges were resolved, naming them in envelope order.
      if (!Array.isArray(result.rewired) || result.rewired.length === 0) return `${chosen}${promoted}`;
      const slugs = result.rewired.map((entry) => entry.ref).join(", ");
      return `${chosen}${promoted}\nRewired ${result.rewired.length} backlog edge(s) to ${result.created.ref}: ${slugs}.`;
    },

    // The stdout envelope is the in-process envelope with its `dir` values forward-slashed
    // (task 00: "stdout is the envelope above, `dir` values forward-slashed") — a path the
    // operator can paste on any shell. Every OTHER key is byte-identical: the in-process envelope
    // keeps native paths for its callers, and `created.depends`, when present, is untouched.
    // `--next-item`'s `next` is the human render's, so its envelope keeps a named promote's keys.
    json: (result) => {
      if (Array.isArray(result.candidates)) {
        return {
          candidates: result.candidates.map((row) => ({ ...row, dir: slash(row.dir) })),
          waiting: result.waiting.map((row) => ({ ...row, dir: slash(row.dir) })),
        };
      }
      const { next, ...promoted } = result; // eslint-disable-line no-unused-vars
      return {
        ...promoted,
        created: { ...promoted.created, dir: slash(promoted.created.dir) },
        from: { ...promoted.from, dir: slash(promoted.from.dir) },
        ...(promoted.rewired ? { rewired: promoted.rewired.map((entry) => ({ ...entry, dir: slash(entry.dir) })) } : {}),
      };
    },
  },
};

// Story 152 — the `--show-candidates` human render: the candidates numbered in promotion order,
// then the waiting rows with what each waits on, then the way to promote the first.
function renderCandidates({ candidates, waiting }) {
  const label = (row) => (row.backlog === "" ? row.slug : `${row.backlog}/${row.slug}`);
  const lines = [];
  const empty = noCandidateSentence({ candidates, waiting });
  if (empty != null) lines.push(empty);
  else {
    lines.push(`Can be promoted now (${candidates.length}), in order:`);
    candidates.forEach((row, index) => lines.push(`  ${index + 1}. ${label(row)} (${row.type}, unblocks ${row.unblocks})`));
  }
  if (waiting.length > 0) {
    lines.push(`Waiting (${waiting.length}):`);
    for (const row of waiting) {
      const on = row.waitsOn
        .map(({ entry, code }) => `${entry} (${code === "promote-depends-backlog" ? "still in the backlog" : "unresolved"})`)
        .join(", ");
      lines.push(`  - ${label(row)} (${row.type}) waits on ${on}`);
    }
  }
  if (candidates.length > 0) {
    lines.push(`Promote the first with: aof work promote ${candidates[0].slug} — or aof work promote --next-item.`);
  }
  return lines.join("\n");
}

return { archivedCollisions, classifyDepends, numbersWritten, prefixFirstHeading, promoteCommand, runInsertTopLevel, runPromote, stampNumber };
}
