// src/integrations/routing.mjs — the per-folder `.integrations.json` routing reader
// (milestone 18 / story 00 — the AUTHORING SPINE; ADR-001/002/003/006).
//
// A work item's external-tool routing (which Notion board, which parent page) is
// AUTHORED intent committed BESIDE the item, not milestone frontmatter and not the
// git-ignored sidecar. It lives in a discrete dotfile `.integrations.json` at the
// item's RECORD-DOC folder (a sibling of SPEC.md/AOF.md/STORY.md), machine-managed by
// the `associate` verb (notion-associate.mjs). This module is the NEW shared seam both
// the authoring side (associate, the write) and the consumption side (story 01's
// projection, the read) go through.
//
//   <item.dir>/.integrations.json   shape (provider-namespaced):
//     { "notion": { "board"?: <board-key>, "parent"?: <page-id|key> }, "<other>"?: … }
//
//   readRouting(item)                         → the parsed descriptor object ({} on absent/corrupt)
//   classifyParent(value) / isPageId(value)   → "raw page-id" vs "key" (by UUID shape, ADR-001)
//   resolveNotionRouting(item, notionConfig)  → { board, parentPageId|null, reason? } (combines descriptor + boards registry)
//   writeRouting(item, next) / clearing       → the associate mutation (ADR-004)
//
// It reads the file with `JSON.parse` ONLY — it has NO `parseFrontmatter` import or
// dependency (R4 (m18): extending the shared frontmatter parser is a blast-radius
// hazard, so routing is a discrete JSON file; FF-B enforces this). Its only imports
// are `node:fs`, `node:path`, and `recordDoc` from `../work.mjs` — no Notion spawn
// seam is imported (ADR-006, the no-read invariant holds by construction).
import path from "node:path";
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { recordDoc } from "./records.mjs";
// m42 item 3 — every former silent catch reports a coded degrade event.


// The descriptor file name (folder-rooted — a sibling of the record doc).
export const INTEGRATIONS_FILE = ".integrations.json";

export function createIntegrationRouting({ reportDegrade }) {

// Resolve the descriptor's absolute path: it lives in the item's RECORD-DOC folder
// (recordDoc semantics — AOF.md-first for a converted milestone, else SPEC.md), so an
// imported AOF.md-class milestone is first-class (the carried-forward BLOCKER fix).
// The descriptor is folder-rooted, so in practice "the folder" is `item.dir`; tying it
// to recordDoc keeps the doc-class first-classness explicit.
function descriptorPath(item) {
  // recordDoc returns the record-doc FILENAME; the descriptor is its sibling. We only
  // need the folder, which is item.dir — calling recordDoc keeps the tie honest and
  // future-proofs a record doc that ever moves out of item.dir.
  recordDoc(item);
  return path.join(item.dir, INTEGRATIONS_FILE);
}

// Read the item's routing descriptor. An absent, unreadable, or corrupt file ⇒ `{}`
// ("no routing"), NEVER an exception (mirrors readMapping's absent-file tolerance,
// mapping.mjs:41-57) — an unrouted item is the common case (the m17 default-board /
// top-level path depends on this). The descriptor is provider-namespaced; this reader
// returns the WHOLE parsed object so a caller reads `notion` and ignores peers (FF-E:
// an unknown provider block is tolerated, never a hard failure).
function readRouting(item) {
  let raw;
  try {
    raw = readFileSync(descriptorPath(item), "utf8");
  } catch {
    // Absent or unreadable ⇒ no routing. Never throws (ADR-003).
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    // A non-object payload (e.g. a bare array/string) is treated as no routing — the
    // descriptor is a machine-managed object; a re-associate rewrites it.
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    // A corrupt descriptor is "no routing" rather than a throw — it is a
    // machine-managed file a re-associate rewrites (sidecar-style tolerance).
    return {};
  }
}

// Write (or clear) the item's `.integrations.json` — the associate verb's ONLY
// mutation (ADR-004). `next` is the WHOLE descriptor object to persist; an EMPTY
// descriptor (no provider blocks) is REMOVED from disk (the file is deleted) so it
// round-trips to "absent ⇒ defaults" (an empty `{}` is never left lingering). Returns
// the descriptor as persisted ({} when cleared).
function writeRouting(item, next) {
  const filePath = descriptorPath(item);
  const isEmpty = !next || typeof next !== "object" || Object.keys(next).length === 0;
  if (isEmpty) {
    // Clearing the whole descriptor removes the file (round-trips to "no routing").
    try {
      rmSync(filePath, { force: true });
    } catch (error) {
      // A best-effort remove of an absent file is a no-op.
      reportDegrade("integrations-routing", error); }
    return {};
  }
  writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

// Does the item's descriptor file exist on disk? (The associate verb consults this to
// distinguish "clearing an already-clear item" — an unchanged no-write — from a
// genuine clear.)
function hasRouting(item) {
  return existsSync(descriptorPath(item));
}


return { readRouting, writeRouting, hasRouting };
}
