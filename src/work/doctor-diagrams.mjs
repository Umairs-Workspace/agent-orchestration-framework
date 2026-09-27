// work:doctor — milestone 133 / story 03: THE DIAGRAMS LANE (ADR-006), the ninth `CHECK_GROUPS`
// entry. One pure `(snapshot, ctx) => Finding[]` group, appended; it edits no existing group.
//
// WHAT IT ASKS. An ADR that links a diagram makes a claim about the tree: the file is there, its
// exports are committed, and the picture sits under the ADR its name says it belongs to. A link
// that fails any of those is a broken record, and a `diagrams/` file nothing links is most likely a
// leftover from drawing iteratively inside the authoring beat.
//
//   diagram-link-missing    a `diagrams/…` link or image target is not in the listing
//   diagram-export-missing  a linked stem has no `.svg`, or no `.png` while PNG is owed
//   diagram-adr-mismatch    a link's stem names a different ADR from its section (or none)
//   diagram-orphan          a `diagrams/` file whose stem no link names — ALWAYS `warn`
//
// THIS LANE GATES, UNLIKE THE THREE ADVISORY LANES BEFORE IT. Its three link codes take the
// acceptance horizon (`severityFor`): `error` while the item is open, `warn` once it is `done`,
// because a delivered item's records may no longer be edited and an error there would be a
// permanent red no legal act clears. Its codes are therefore NOT exported as a `*_FINDING_CODES`
// array — that suffix is the advisory class's marker (FF-12402), and this lane is not in it.
//
// THE LANE READS NO DISK. `ARCHITECTURE.md`'s text already rides the snapshot as
// `docTexts["ARCHITECTURE.md"]`, and the engine's per-item enrichment adds the ONE new fact this
// lane needs: `diagramListing`, the item's `diagrams/` file names, or `null` when there is no
// folder. Every spelling — the folder, the stem, the link — is read through the layout's one home
// (FF-13302). What is owed is read through `resolveWorkDiagrams`: the SVG always, the PNG only when
// diagrams are on and `formats` asks for it.
import path from "node:path";
import { severityFor } from "../acceptance-horizon.mjs";
import { resolveWorkDiagrams } from "../config-inspect.mjs";
import { DIAGRAMS_DIR, parseDiagramLinks, stemAdr } from "../diagrams/layout.mjs";

export const DIAGRAM_LANE_CODES = Object.freeze([
  "diagram-link-missing",
  "diagram-export-missing",
  "diagram-adr-mismatch",
  "diagram-orphan",
]);

const ARCHITECTURE = "ARCHITECTURE.md";
const statusOf = (item) => item?.meta?.status ?? null;

const stemOfName = (name) => {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
};

export function diagramsGroup(snapshot, ctx = {}) {
  const findings = [];
  const owed = resolveWorkDiagrams(ctx.config ?? {});
  const owesPng = owed.enabled && owed.formats.includes("png");
  for (const item of snapshot?.items ?? []) {
    // A row this node does not hold on disk is another node's to report (ruling 4).
    if (typeof item?.dir !== "string" || item.dir === "") continue;
    const links = parseDiagramLinks(item.docTexts?.[ARCHITECTURE] ?? "");
    const listing = Array.isArray(item.diagramListing) ? item.diagramListing : null;
    if (links.length === 0 && listing == null) continue;

    const present = new Set(listing ?? []);
    const severity = severityFor(statusOf(item));
    const architecturePath = path.join(item.dir, ARCHITECTURE);
    const at = (link) => `${link.adr ?? "no ADR"}, ${ARCHITECTURE} line ${link.line}`;
    const push = (code, level, target, message) => findings.push({ code, severity: level, path: target, message: `${item.ref}: ${message}` });

    const linkedStems = new Map();
    for (const link of links) {
      const name = link.target.slice(DIAGRAMS_DIR.length + 1);
      if (!present.has(name)) {
        push("diagram-link-missing", severity, architecturePath, `${at(link)} links ${link.target}, which is not in the tree.`);
      }
      if (link.adr !== stemAdr(link.stem)) {
        const where = link.adr == null ? "sits under no ADR" : `sits under ${link.adr}`;
        push("diagram-adr-mismatch", severity, architecturePath, `${link.target} (${link.stem}) ${where} at ${ARCHITECTURE} line ${link.line}, but its name claims ${stemAdr(link.stem) ?? "no ADR"}.`);
      }
      if (!linkedStems.has(link.stem)) linkedStems.set(link.stem, link);
    }

    for (const [stem, link] of linkedStems) {
      const exports = [".svg", ...(owesPng ? [".png"] : [])];
      for (const ext of exports) {
        if (!present.has(`${stem}${ext}`)) {
          push("diagram-export-missing", severity, architecturePath, `${at(link)} links ${stem}, which has no committed ${DIAGRAMS_DIR}/${stem}${ext}.`);
        }
      }
    }

    for (const name of listing ?? []) {
      if (!linkedStems.has(stemOfName(name))) {
        push("diagram-orphan", "warn", path.join(item.dir, DIAGRAMS_DIR, name), `${DIAGRAMS_DIR}/${name} is linked from no ADR in ${ARCHITECTURE}.`);
      }
    }
  }
  return findings;
}
