import path from "node:path";
import { readFile } from "node:fs/promises";

// milestone 124 / story 00 (ADR-003 §1/§3) — THE SHARED HOME, adopted. The resolution of a
// declared key (its `present`/`malformed` answer, the untouched-scaffold rule and the
// unresolvable-entry poison) and the coverage question both live on the pure leaf now; this
// module holds neither a second copy. What it keeps is the one rule that is genuinely ITS
// OWN — `collisionKey` below.
import { contractSetCovers, resolveDeclaredSet } from "./story-contract.mjs";

function collisionKey(projectPath) {
  // A false overlap only serialises work; a missed case-only overlap can corrupt it on a
  // case-insensitive checkout. Case-folding is therefore the safe cross-node rule.
  //
  // AND IT STAYS HERE rather than moving into the shared predicate (ADR-003 §3). The census
  // that now shares that predicate is reporting on DECLARATIONS and wants them compared as
  // written; this module is protecting a DISK from two writers, where a case-only difference
  // is the same file on win32 and macOS. One rule, folded at the one call site that needs it.
  return projectPath.replaceAll("\\", "/").toLowerCase();
}

async function declaredWriteSet(member, { projectRoot, readText }) {
  if (member?.type !== "story" || typeof member.path !== "string") return null;
  const storyDir = path.resolve(member.path);
  let text;
  try {
    text = await readText(path.join(storyDir, "STORY.md"), "utf8");
  } catch {
    return null;
  }

  // `entries: null` is the shared resolver's UNKNOWN — an absent key, a malformed one, an
  // untouched scaffold, or a single entry nothing could resolve. Every one of those reaches
  // the conservative branch below exactly as it did before this adoption.
  const declared = resolveDeclaredSet(text, "files", { storyDir, projectRoot });
  if (declared.entries == null) return null;
  // The authored directory intent rides through the fold, because it is what the coverage
  // predicate reads; only the PATH is case-folded.
  return declared.entries.map((entry) => ({ path: collisionKey(entry.path), directory: entry.directory }));
}

// Greedy, stable partition over nextWork's already-deterministic readySet. The earliest
// member wins each collision. Unknown write sets are conservative: first runs alone;
// otherwise they are held. The original readySet is never reordered or reduced.
export async function partitionReadySetByDeclaredFiles(readySet, options = {}) {
  const candidates = Array.isArray(readySet) ? readySet : [];
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const readText = options.readText ?? readFile;
  const wave = [];
  const heldSet = [];
  // The claimed entries of every member already in the wave, kept as RESOLVED ENTRIES rather
  // than as a `Set` of strings: a `Set` can only answer equality, and equality is the exact
  // reading that let a story declaring `files: [src/commands/]` and a sibling declaring
  // `src/commands/test.mjs` into one wave, where they collide on disk (ADR-003's live defect).
  const occupied = [];
  let unknownSelected = false;
  const writeSets = await Promise.all(
    candidates.map((member) => declaredWriteSet(member, { projectRoot, readText })),
  );

  for (let index = 0; index < candidates.length; index += 1) {
    const member = candidates[index];
    const writes = writeSets[index];
    if (writes == null) {
      if (wave.length === 0) {
        wave.push(member);
        unknownSelected = true;
      } else {
        heldSet.push(member);
      }
      continue;
    }

    // THE COLLISION TEST IS THE SHARED PREDICATE, ASKED BOTH WAYS. Coverage is directional —
    // an authored directory covers what sits beneath it, and a file covers no directory — but
    // a write/write collision is not: whichever side authored the directory, two builders are
    // pointed at one path. Two calls to ONE predicate, never a second rule.
    const overlaps = unknownSelected
      || writes.some((entry) => contractSetCovers(occupied, entry))
      || occupied.some((entry) => contractSetCovers(writes, entry));
    if (overlaps) {
      heldSet.push(member);
      continue;
    }
    wave.push(member);
    for (const entry of writes) occupied.push(entry);
  }

  return { wave, heldSet };
}
