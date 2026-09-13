// THE ONE RESOLVER for "does this cited path still name something?" — 119/ADR-004.
//
// WHY IT EXISTS, MEASURED. `src/work/doctor.mjs`'s control probe resolves every path cited in every
// item's `## Fitness functions` register with a bare `stat(path.join(projectRoot, control))`. Any
// story that moves `test/arch/**` therefore turns every one of those citations into a
// `control-unresolved` finding — and those registers belong to DONE items, where a delivered record
// is immutable and a `pending` marker is not admitted. There is no legal edit that clears them.
//
// The same gap one universe over and worse: NO gate in this tree resolves a `src/` path citation at
// all. That is chore 106's second limb, and it is why folding `src/mesh-*` and `src/work-*` into
// families would decay silently and permanently.
//
// THE RULING. A path cited in a delivered document resolves if it exists at HEAD **or** if the
// repository's own history records a rename from it. One resolver, in `src/`, with TWO readers:
//   1. `src/work/doctor.mjs`'s control probe, so `control-unresolved` keeps its exact meaning —
//      "this register declares a control that does not exist" — and stops meaning "somebody moved a
//      file";
//   2. FF-11903's sweep over `src/**.mjs` citations in `wiki/work/**`, the universe no gate has
//      ever covered.
//
// THE MAP IS DERIVED, NEVER STORED. It comes from git's own rename records, which are history and
// therefore cannot go stale. No `MOVES.md`, no hand-kept redirect table — that would be 119/ADR-003
// species 1 at the scale of 8,000 citations. And it is nearly EMPTY today: `git log --diff-filter=R
// -M --name-status --format= | grep -c '^R'` returns 20 rename records in the whole reachable
// history, two of them under `src/`. So a resolver that answered "no renames, ever" would pass every
// leg of its control silently, which is why the readers assert the map's own non-vacuity.
//
// THIS MODULE IS PURE. It spawns nothing and reads nothing: the git output is taken at the impure
// command edge (`src/commands/doctor.mjs`) and handed in as data, exactly as `projectRoot` already
// is. The doctor's spine may not name a spawn door — `test/arch/audit/acd-controls-never-execute.test.mjs`
// asserts that — and this module's NAME is load-bearing for the same reason: that control also pins
// the spine's `./work-doctor-*.mjs` imports against a closed roster, so a `work-doctor-` name here
// would red a delivered control while `cited-path-resolve.mjs` does not.

// The argv the rename map is built from, exported so the command edge does not spell its own and a
// control can assert the two are the same read. `--format=` empties the commit header, leaving only
// the `R<score>\t<from>\t<to>` name-status lines; `-M` is what makes git detect renames at all.
export const RENAME_LOG_ARGS = Object.freeze(["log", "--diff-filter=R", "-M", "--name-status", "--format="]);

// A citation may carry a `:line` or `:from-to` locator, and the locator is dropped for resolution:
// the question this module answers is whether the FILE is still reachable.
//
// THE GRAMMAR IS NOT SPELLED HERE. `src/work/doctor-controls.mjs` has owned it since milestone 66
// (`LOCATOR_SUFFIX` + `splitPathLocator`), and a second copy in the story that RULES one-home would
// be this milestone's own defect committed while ruling it — the two had already diverged in
// drafting, one accepting `#L12` anchors and the other not. That module is a pure function of text
// with no filesystem and no spawn door, so importing it keeps this resolver pure.
import { splitPathLocator } from "./work/doctor-controls.mjs";

export function splitLocator(cited) {
  const raw = String(cited ?? "").trim();
  const { path: file, line } = splitPathLocator(raw);
  if (line == null) return { path: file, locator: null };
  // The locator is read back off the RAW text rather than by subtracting the normalized path:
  // `splitPathLocator` also strips a leading `./` or `../`, so a length subtraction would slice the
  // wrong end of a relative citation.
  const at = raw.lastIndexOf(":");
  return { path: file, locator: at >= 0 ? raw.slice(at) : null };
}

// `R100\tfrom\tto` name-status lines. Anything else in the stream is ignored rather than guessed at.
export function parseRenameRecords(stdout) {
  const records = [];
  for (const line of String(stdout ?? "").split(/\r?\n/u)) {
    const match = /^R\d*\t([^\t]+)\t(.+)$/u.exec(line);
    if (match == null) continue;
    records.push({ from: match[1].trim(), to: match[2].trim() });
  }
  return records;
}

// ONE HOP PER OLD PATH, newest first. `git log` prints newest-first, so the FIRST record naming a
// path as `from` is its most recent rename; a later (older) record for the same `from` is a previous
// life of that name and must not overwrite it.
export function buildRenameMap(records) {
  const map = new Map();
  for (const { from, to } of records ?? []) {
    if (typeof from !== "string" || typeof to !== "string" || from === "" || to === "") continue;
    if (!map.has(from)) map.set(from, to);
  }
  return map;
}

// FOLLOW THE CHAIN. A path renamed twice resolves to its FINAL path, with a cycle guard so a
// pathological history cannot hang a gate. Returns null when the map records no rename from here.
export function resolveThroughRenames(citedPath, renameMap) {
  if (!(renameMap instanceof Map) || renameMap.size === 0) return null;
  const seen = new Set();
  let current = String(citedPath ?? "");
  let hops = 0;
  while (renameMap.has(current) && !seen.has(current)) {
    seen.add(current);
    current = renameMap.get(current);
    hops += 1;
  }
  return hops === 0 ? null : current;
}

// THE ONE ANSWER BOTH READERS TAKE.
//
//   · `existsAtHead` supplied → the whole question is answered here: `via: "head"` when the path is
//     on disk now, `via: "rename"` when history redirects it to a path that IS on disk now, and
//     `resolved: false` otherwise — including a rename whose TARGET has since been deleted.
//   · `existsAtHead` omitted → the HEAD half has already been answered by the caller (the doctor's
//     spine, whose leg A `stat` is pinned by a delivered control), and this reports only where
//     history says the path went. `at` is then the candidate the caller probes.
export function resolveCitedPath(cited, { existsAtHead = null, renameMap = null } = {}) {
  const { path: file, locator } = splitLocator(cited);
  const renamed = resolveThroughRenames(file, renameMap);
  if (typeof existsAtHead !== "function") {
    return { cited: String(cited ?? ""), path: file, locator, resolved: renamed != null, at: renamed, via: renamed == null ? null : "rename" };
  }
  if (existsAtHead(file)) return { cited: String(cited ?? ""), path: file, locator, resolved: true, at: file, via: "head" };
  if (renamed != null && existsAtHead(renamed)) {
    return { cited: String(cited ?? ""), path: file, locator, resolved: true, at: renamed, via: "rename" };
  }
  return { cited: String(cited ?? ""), path: file, locator, resolved: false, at: null, via: null };
}
