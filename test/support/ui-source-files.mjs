// WHAT COUNTS AS A `ui/src` SOURCE FILE — ONE predicate, two ratchets.
//
// `acd-ui-surface-file-budget` (m43/ADR-015/F2) meters the tree per FILE; `acd-ui-directory-budget`
// (m49/ADR-001, TECH_DEBT 28/33 fix (b)) meters it per DIRECTORY. They must never disagree about
// what a file IS, so the predicate is DECLARED here and imported by both rather than re-typed in
// each — a second copy is how the per-file gate would come to count 98 files while the
// directory gate counted 96, and a gate whose total a reviewer cannot reconcile is a gate a
// reviewer stops reading.
//
// THE PREDICATE, and every clause of it is load-bearing:
//   ·  `.ts` / `.tsx`  — components and typed modules.
//   ·  `.mjs`          — the framework-free logic every ADR-001-shaped surface keeps its
//                        decisions in.
//   ·  `.d.mts`        — matched by the `.mts` arm, and NOT obvious: milestone 49 alone adds
//                        roughly four of them, so a predicate that missed declaration siblings
//                        would under-count that milestone's growth by half.
//
// WHAT IS DELIBERATELY NOT A FILE HERE: `.css`, `.json`, `.md`, images and any other asset. It
// is why the directory gate totals 98 where 49/ARCHITECTURE §Codebase health quotes 99 — that
// figure counts `index.css` too. THE TWO NUMBERS DIFFER BY ONE and that is not pedantry: the
// difference is declared here, in the one place both gates read, rather than left for a
// reviewer to rediscover.
export const UI_SOURCE_FILE_RE = /\.(tsx?|mts|mjs)$/;

export function isUiSourceFile(name) {
  return typeof name === "string" && UI_SOURCE_FILE_RE.test(name);
}
