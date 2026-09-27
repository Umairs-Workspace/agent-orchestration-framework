// work:archive — THE VERBATIM MOVE (milestone 127 / ADR-004, story 03).
//
// An accepted item keeps its folder at the stream root beside the live ones, because its number
// is its identity (3,102 citations resolve by number — SPEC) and renumbering is not on the table.
// But identity is a number, not a location (ADR-002): `aof work archive <NN> | --done` moves a
// done driver's folder, name verbatim, under `<workDir>/archive/`, where 127/01's enumerator
// already finds it with `archived: true`. Every reader that resolves by ref still answers for it;
// only the walkers that answer "what is next" stop seeing it (ADR-002 §2-§3) — this verb adds the
// MOVE, not the visibility.
//
// THE FACE IS THIN. This module resolves, refuses, selects and renders. The MOVE and the link
// rewrite are `archiveItems` in `src/work/archive.mjs` (the engine, `reindex.mjs`'s twin — task
// 03 says why it is not in here: the seam imports its fact-writers and this module imports the
// seam, so a writer here would close a cycle), reached ONLY through the stream seam
// `transitionStreamArchived` (`src/effects/stream-transitions.mjs`: the item lock in front, the
// engine as the fact, `stream.archived` as the event, the publish as its one reactor). The verb
// runs no git command and spawns nothing; the renames it performs are what `git status` reports
// as renames afterwards.
//
// THE FLAG VOCABULARY IS ITS OWN — `done`, `yes`, and `force` as the alias of `yes` the whole
// family keeps — declared HERE, because `INSERT_FLAGS` lives in `insert-shared.mjs` and FF-12705
// forbids that import. So is the gate: `--done` without `--yes` lists what it would move and
// refuses (`archive-confirm-required`) — not `guardSlotOpenCount`, which counts a shift this verb
// never makes. `<NN>` is never gated: one named folder is already the confirmation.
//
// EVERY REFUSAL IS CODED (08/ADR-003) AND LANDS BEFORE ANY WRITE. Resolution and every check are
// pure reads, so a refused archive leaves the work tree byte-identical. The order, for `<NN>`:
// missing-ref → both-forms → not-found → not-a-driver → (ambiguous, when a free-text ref names
// several top-level items) → backlog-ref → already-archived → not-done → destination-exists →
// [seam: lock → move → event]. For `--done`: select → the gate → every candidate's destination →
// [seam over the whole set].
//
// FF-12705 holds the never-renumbers half structurally: this module imports neither
// `src/work/reindex.mjs` nor `src/commands/insert-shared.mjs`, writes no `number:` line, and
// calls the seam, never the engine.
import path from "node:path";
import { existsSync } from "node:fs";
import { findWork, listItems, isLiveStreamRow, ARCHIVE_ROOT } from "../work.mjs";
import { transitionStreamArchived } from "../effects/stream-transitions.mjs";
import { commandError } from "../command-error.mjs";

const USAGE = "aof work archive <NN> | --done [--yes] [--json]";
const slash = (value) => String(value).replaceAll("\\", "/");
const relOf = (workDir, dir) => slash(path.relative(workDir, dir));

// The verb's OWN flag vocabulary (see the header): declared here, never imported.
export const ARCHIVE_FLAGS = Object.freeze({
  done: Object.freeze({ type: "boolean", description: "archive every done driver at the stream root" }),
  yes: Object.freeze({ type: "boolean", description: "confirm a --done run without listing first" }),
  force: Object.freeze({ type: "boolean", description: "alias of --yes" }),
});

// ─────────────────────────────────────────────────────────────── resolution ──

// A `findWork` row's folder name — the enumerator's `name` is not on the find row, so it is the
// basename of the row's `dir`, which is the same string by construction.
const nameOf = (row) => path.basename(row.dir ?? "");

// resolveDriver(workDir, arg) — exactly one TOP-LEVEL numbered driver at the stream root, whose
// status is `done`. `findWork` is a RESOLVING reader (ADR-002 §3): an archived or backlog ref
// still answers, which is what lets each refusal NAME what it found. Whether a row is LIVE is the
// one predicate's answer over the enumerator's row for the same folder (`.archived` is read in
// `src/work.mjs` and nowhere else — FF-12706), so the enumeration is taken once and handed to
// `findWork` as its view.
async function resolveDriver(workDir, arg) {
  const items = await listItems(workDir);
  const rows = await findWork(workDir, arg, { view: { items } });
  const enumerated = (row) => items.find((item) => item.dir === row.dir) ?? null;
  const isLive = (row) => enumerated(row) != null && isLiveStreamRow(enumerated(row));
  if (rows.length === 0) {
    throw commandError(`No work item matches "${arg}" — nothing to archive.`, "archive-not-found", 404);
  }

  // A nested story ref (`NN/SS`) resolves to a story row; a story moves with its milestone.
  const nested = rows.find((row) => row.parent != null);
  if (nested != null && rows.every((row) => row.parent != null)) {
    throw commandError(
      `"${arg}" is a story under milestone ${nested.parent} — a story moves with its milestone. Archive the milestone instead: aof work archive ${nested.parent}.`,
      "archive-not-a-driver",
      400,
    );
  }

  // A number answers at most one LIVE row; a hand-made `archive/<name>` beside it enumerates as
  // a second, archived row for the same number, and that collision is `archive-destination-exists`'s
  // to name (below) — so the live row is the target and the archived twin is not an ambiguity.
  const drivers = rows.filter((row) => row.parent == null);
  const live = drivers.filter(isLive);
  const candidates = live.length > 0 ? live : drivers;
  if (candidates.length > 1) {
    const named = candidates.map((row) => `${row.ref} (${relOf(workDir, row.dir)})`).sort();
    throw commandError(`"${arg}" matches ${candidates.length} top-level items — name one exactly: ${named.join(", ")}.`, "archive-ambiguous", 409);
  }
  const row = candidates[0];

  if (row.number === null) {
    throw commandError(
      `"${arg}" is a backlog item (${relOf(workDir, row.dir)}) — it has no number and is not in the stream. Promote it first: aof work promote ${row.ref}.`,
      "archive-backlog-ref",
      400,
    );
  }
  if (!isLive(row)) {
    throw commandError(`"${row.ref}" is already archived at ${relOf(workDir, row.dir)}.`, "archive-already-archived", 409);
  }
  refuseUnlessDone(row);
  refuseIfDestinationTaken(workDir, row);
  return row;
}

// A driver is checked on its OWN status only: a done milestone's stories move with it whatever
// they say (the accept door already refuses a milestone `done` over an undone story — 96/ADR-008).
function refuseUnlessDone(row) {
  if (row.status === "done") return;
  const status = typeof row.status === "string" && row.status.length > 0 ? `\`${row.status}\`` : null;
  throw commandError(
    status == null
      ? `"${row.ref}" cannot be archived: its record doc carries no status, and only a \`done\` driver is archived.`
      : `"${row.ref}" is ${status}, not \`done\` — only an accepted driver is archived.`,
    "archive-not-done",
    409,
  );
}

// A hand-made `archive/<name>` while the row is still at the root is a collision the engine would
// refuse too — checked here so `--done` can refuse the WHOLE set before the first rename.
function refuseIfDestinationTaken(workDir, row) {
  const destination = path.join(workDir, ARCHIVE_ROOT, nameOf(row));
  if (!existsSync(destination)) return;
  throw commandError(
    `"${relOf(workDir, destination)}" already exists — refusing to archive "${row.ref}" onto it.`,
    "archive-destination-exists",
    409,
  );
}

// selectDoneDrivers(workDir) — `--done`'s selection: every top-level driver AT THE STREAM ROOT
// (never a backlog row, never a row already under `archive/`) whose status is `done`, in number
// order. The status is read from each record doc once, through the same `findWork` rows the
// listing uses — over the ONE enumeration (`view.items`), so the tree is walked once.
async function selectDoneDrivers(workDir) {
  const items = await listItems(workDir);
  const roots = items
    .filter(isLiveStreamRow)
    .filter((item) => item.parent == null)
    .sort((a, b) => Number(a.number) - Number(b.number));
  const selected = [];
  for (const item of roots) {
    const rows = await findWork(workDir, item.ref, { view: { items } });
    const row = rows.find((candidate) => candidate.parent == null && candidate.dir === item.dir);
    if (row != null && row.status === "done") selected.push(row);
  }
  return selected;
}

// ───────────────────────────────────────────────────────────────── the verb ──

// runArchive(ctx, { ref, done, yes }) — the verb. Both forms end in ONE seam call over the set of
// folder names, so a `--done` run is exactly a `<NN>` run iterated: every selected folder is in M
// together, and a link between two of them is left alone (task 01 rule (iii)).
export async function runArchive(ctx, { ref: rawRef, done = false, yes = false } = {}) {
  const workDir = ctx.workspace.workDir;
  const arg = typeof rawRef === "string" ? rawRef.trim() : "";

  if (arg === "" && !done) {
    throw commandError(`A driver ref or --done is required: ${USAGE}.`, "archive-missing-ref", 400);
  }
  if (arg !== "" && done) {
    throw commandError(`"${arg}" and --done are two forms of one verb — name a driver, or archive every done driver, not both: ${USAGE}.`, "archive-both-forms", 400);
  }

  let names;
  if (done) {
    const candidates = await selectDoneDrivers(workDir);
    if (candidates.length === 0) return { archived: [], rewritten: [] };
    if (!yes) {
      const listed = candidates.map((row) => `${row.ref} (${nameOf(row)})`).join(", ");
      const error = commandError(
        `--done would archive ${candidates.length} driver(s): ${listed} — re-run with --yes to confirm.`,
        "archive-confirm-required",
        400,
      );
      error.detail = { candidates: candidates.map((row) => ({ ref: row.ref, name: nameOf(row), type: row.type })) };
      throw error;
    }
    for (const row of candidates) refuseIfDestinationTaken(workDir, row);
    names = candidates.map(nameOf);
  } else {
    names = [nameOf(await resolveDriver(workDir, arg))];
  }

  // THE SEAM — lock → move → `stream.archived` → publish. The envelope is the engine's own.
  const { archived, rewritten } = await transitionStreamArchived(
    ctx.workspace,
    { names },
    { publisherOptions: ctx, journalOptions: ctx.effectsJournalOptions ?? {} },
  );
  return { archived, rewritten };
}

// ─────────────────────────────────────────────────────────────── the render ──

const countLine = (rewritten) => {
  const links = rewritten.reduce((sum, entry) => sum + entry.links, 0);
  return `${links} link(s) rewritten in ${rewritten.length} file(s)`;
};

export function renderArchive(result, faceCtx) {
  const { archived = [], rewritten = [] } = result ?? {};
  if (archived.length === 0) return "Nothing to archive: no done driver at the stream root.";
  const lines = archived.map((entry) => `Archived ${entry.ref} → ${ARCHIVE_ROOT}/${entry.name} (${countLine(rewritten)}).`);
  // `<NN>` archives one driver and its render is that one line; `--done` is the set, so it
  // closes with the count — an argv fact, read from the faceCtx every render receives.
  if (faceCtx?.options?.done === true) lines.push(`Archived ${archived.length} item(s).`);
  return lines.join("\n");
}

export const archiveCommand = {
  id: "work:archive",
  input: {
    type: "object",
    properties: {
      ref: { type: "string" },
      done: { type: "boolean" },
      yes: { type: "boolean" },
    },
    additionalProperties: false,
  },

  async run(input, ctx) {
    return await runArchive(ctx, { ref: input.ref, done: Boolean(input.done), yes: Boolean(input.yes) });
  },

  cli: {
    route: ["work", "archive"],
    spec: {
      usage: USAGE,
      flags: ARCHIVE_FLAGS,
    },

    argv: (positionals, options) => ({
      ref: positionals[0],
      done: Boolean(options.done),
      yes: Boolean(options.yes || options.force),
    }),

    render: renderArchive,

    // The stdout envelope is the in-process envelope with `from`/`to` forward-slashed (127/02's
    // rule for a path an operator pastes on any shell); `rewritten` is already forward-slashed
    // and work-dir-relative, and every other key is byte-identical.
    json: ({ archived = [], ...rest }) => ({
      ...rest,
      archived: archived.map((entry) => ({ ...entry, from: slash(entry.from), to: slash(entry.to) })),
    }),
  },
};
