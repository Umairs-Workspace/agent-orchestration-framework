// THE THIRD READER of 119/ADR-004's resolver — a suite path cited in a DELIVERED `.feature`.
//
// WHY IT EXISTS, MEASURED AT 119/03. Moving the test tree into subject directories strands **489
// citations across 156 delivered `.feature` files**: an acceptance criterion that says "evidence:
// `test/work-loops-record.test.mjs`" names a path that no longer exists the moment the suite moves.
// Those documents are immutable — not annotable, not taggable — so there is no legal edit that
// repairs them, and ADR-004's two declared readers do not reach them: the doctor's control probe
// resolves paths cited in `## Fitness functions` REGISTERS, and FF-11903 sweeps **`src/`** path
// citations under `wiki/work/**`. A `test/…test.mjs` citation in a `.feature` BODY is neither.
//
// That is chore 106's own refusal test on an axis nobody measured — the price of a fold, in stranded
// citations, where the decay would be silent and permanent. ADR-004 broke exactly that pair of
// conditions for the `src/` axis by RESOLVING rather than rewriting, and this module applies the
// same medicine to the axis 119/03 needs. Nothing is repaired; the question is answered better.
//
// ONE RESOLVER, STILL. `resolveCitedPath` (`src/cited-path-resolve.mjs`) is imported and called —
// this module spells no rename rule of its own. What it adds is the impure edge the resolver
// deliberately does not carry: the `git log` read, taken ONCE per process and memoized, because a
// control that resolves a few hundred citations must not spawn git a few hundred times.
//
// THE MAP IS DERIVED AND CANNOT GO STALE, but it is only as current as the COMMIT: git records a
// rename when it is committed, so a move that is still in the working tree resolves nothing. That is
// the same structural fact 119/01 and 119/02 both recorded of FF-11903 — a move story's build cannot
// reach green before its own commit — and it is a property of the design working, not a defect.
import path from "node:path";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { RENAME_LOG_ARGS, buildRenameMap, parseRenameRecords, resolveCitedPath } from "../../../src/cited-path-resolve.mjs";

const execFileAsync = promisify(execFile);
const cache = new Map();

/** The rename map from this repository's own history, read once per process per root. */
export async function renameMapFromHistory(root) {
  if (cache.has(root)) return cache.get(root);
  const promise = (async () => {
    const { stdout } = await execFileAsync("git", [...RENAME_LOG_ARGS], {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
    });
    return buildRenameMap(parseRenameRecords(stdout));
  })();
  cache.set(root, promise);
  return promise;
}

/**
 * Does this cited suite path still name something? `{ resolved, at, throughRename }` — `at` is the
 * path it resolves to, which is the cited path itself when it still exists at HEAD.
 */
export async function resolveCitedSuite(cited, root) {
  const renameMap = await renameMapFromHistory(root);
  const answer = resolveCitedPath(cited, {
    existsAtHead: (rel) => existsSync(path.join(root, rel)),
    renameMap,
  });
  return { ...answer, throughRename: answer.resolved && answer.at !== cited };
}

/**
 * The non-vacuity leg every caller owes: a rename map that is EMPTY answers "unresolved" for every
 * moved path and would report the strand it is meant to clear. Callers assert on this so an empty
 * map fails loudly rather than reading as "nothing was renamed".
 */
export async function renameMapProblems(root, { floor = 1 } = {}) {
  const map = await renameMapFromHistory(root);
  if (map.size >= floor) return [];
  return [
    `the rename map derived from this repository's history holds ${map.size} entr(ies), below its floor of ${floor}. `
      + "A citation to a moved file resolves through that map, so an empty one reports every moved path as stranded — "
      + "which is indistinguishable from the decay this reader exists to prevent. If a move is staged but not committed, "
      + "commit it: git records a rename when it is committed (119/ADR-004).",
  ];
}
