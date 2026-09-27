// THE ONE HOME of a diagram's place and spelling (milestone 133, ADR-003; FF-13302). Three parties
// must agree on it — the writer (`aof diagram plan` / `export`), the reader (the doctor lane) and
// the architect who pastes the link block — so the `diagrams` folder segment, the `ADR-NNN-<slug>`
// stem grammar, the paths, the brief reader, the block writer and the link parser all live here,
// and no other `src/` module re-derives any of them.
//
// PURE over text and paths: nothing here reads the disk. The markdown and the listing come in as
// arguments, which is what lets the doctor lane stay a pure lane and the console stay independent.
import { commandError } from "../command-error.mjs";
// The ADR id's SHAPE has one home (66/ADR-001 §7, FF-6604); this module narrows it, never re-spells
// it. The stem takes the ADR's own three digits (ADR-003 §1), so an id here is the declared form
// AND exactly `ADR-` plus three digits long.
import { headingCaptureRe, idForm } from "../declared-id.mjs";

export const DIAGRAMS_DIR = "diagrams";

const ADR_FORM = idForm("ADR").id;
const ADR_ID = new RegExp(`^${ADR_FORM}$`);
const ADR_ID_LENGTH = "ADR-".length + 3;
const SLUG = /^[a-z0-9][a-z0-9-]{0,47}$/;
// An ADR heading is matched on its id only: `## ADR-002 — anything` is ADR-002, `## ADR-2` is not.
const ADR_HEADING = new RegExp(`^##\\s+(${ADR_FORM})`);
const H2 = /^##\s/;
const H2_OR_H3 = /^###?\s/;
const DIAGRAM_HEADING = /^###\s+Diagram\s*$/;
const FENCE = /^\s*(```|~~~)/;
// A diagram link: an image `![…](diagrams/…)` or a plain link `[…](diagrams/…)`.
const DIAGRAM_LINK = new RegExp(`(!?)\\[[^\\]]*\\]\\((${DIAGRAMS_DIR}/[^)\\s]+)\\)`, "g");

export function isAdrId(value) {
  return typeof value === "string" && value.length === ADR_ID_LENGTH && ADR_ID.test(value);
}

export function assertAdrId(adr) {
  if (!isAdrId(adr)) {
    throw commandError(`"${adr}" is not an ADR id — expected ADR-NNN (three digits, e.g. ADR-002).`, "diagram-adr-invalid", 400);
  }
}

export function assertSlug(slug) {
  if (typeof slug !== "string" || !SLUG.test(slug)) {
    throw commandError(
      `"${slug}" is not a diagram slug — expected lowercase letters, digits and hyphens, starting with a letter or digit, at most 48 characters.`,
      "diagram-slug-invalid",
      400,
    );
  }
}

// The stem grammar: `ADR-<NNN>-<slug>`.
export function diagramStem(adr, slug) {
  assertAdrId(adr);
  assertSlug(slug);
  return `${adr}-${slug}`;
}

// The ADR a stem names — its leading `ADR-NNN` — or null when the stem does not start with one.
export function stemAdr(stem) {
  const adr = String(stem).slice(0, ADR_ID_LENGTH);
  return isAdrId(adr) && (stem.length === ADR_ID_LENGTH || stem[ADR_ID_LENGTH] === "-") ? adr : null;
}

// Project-root-relative, forward-slash paths whatever the host OS: they are compared across
// nodes and pasted into markdown. `png` is present only when `formats` asks for it.
export function diagramsDir(itemDir) {
  return `${String(itemDir).replace(/\\/g, "/").replace(/\/+$/, "")}/${DIAGRAMS_DIR}`;
}

export function diagramPaths(itemDir, stem, sourceExt, formats) {
  const dir = diagramsDir(itemDir);
  const paths = { dir, source: `${dir}/${stem}${sourceExt}` };
  if (formats.includes("svg")) paths.svg = `${dir}/${stem}.svg`;
  if (formats.includes("png")) paths.png = `${dir}/${stem}.png`;
  return paths;
}

// The one file a reader may ask an item's `diagrams/` folder for (133/VERIFICATION F-133-02): a bare
// `ADR-NNN-<slug>` stem plus one of the three extensions export writes. Anything else — a path, a
// `..`, another extension, a stem with no ADR or no slug — is null, so a request can never name a
// file outside the folder. `path` is forward-slashed like every path here.
export const DIAGRAM_FILE_EXTS = Object.freeze([".html", ".svg", ".png"]);

export function diagramFile(itemDir, name) {
  const base = String(name ?? "");
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || !DIAGRAM_FILE_EXTS.includes(base.slice(dot))) return null;
  const stem = base.slice(0, dot);
  const adr = stemAdr(stem);
  if (adr == null || !SLUG.test(stem.slice(adr.length + 1))) return null;
  return { name: base, stem, ext: base.slice(dot), path: `${diagramsDir(itemDir)}/${base}` };
}

function linesOf(markdown) {
  return String(markdown ?? "").split(/\r?\n/);
}

// The line range [start, end) of one ADR's section: its `## ADR-NNN` heading to the next `## `
// heading or the end of the file. Null when the heading is absent.
function adrSection(lines, adrId) {
  const start = lines.findIndex((line) => ADR_HEADING.exec(line)?.[1] === adrId);
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && !H2.test(lines[end])) end += 1;
  return { start, end };
}

export function hasAdrSection(markdown, adrId) {
  return adrSection(linesOf(markdown), adrId) != null;
}

// The ADR heading's title — its text after the id and the dash — or null when the heading is absent.
// `## ADR-002 — The generator seam` gives `The generator seam`.
export function readAdrTitle(markdown, adrId) {
  const lines = linesOf(markdown);
  const section = adrSection(lines, adrId);
  if (section == null) return null;
  return (headingCaptureRe("ADR").exec(lines[section.start])?.[2] ?? "").trim();
}

// The diagram sources for one ADR in a `diagrams/` listing: `ADR-NNN-<slug><sourceExt>` whose slug
// is legal, each with the stem its file name gives. Pure over the listing (names, not paths).
export function findDiagramSources(names, adrId, sourceExt) {
  const prefix = `${adrId}-`;
  return names
    .filter((name) => name.startsWith(prefix) && name.endsWith(sourceExt))
    .map((name) => ({ name, stem: name.slice(0, name.length - sourceExt.length) }))
    .filter(({ stem }) => SLUG.test(stem.slice(prefix.length)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// The brief is the prose under the ADR's own `### Diagram` heading, up to the first line that
// links into `diagrams/` or the next `##`/`###` heading. Trimmed; empty is null.
export function readDiagramBrief(markdown, adrId) {
  const lines = linesOf(markdown);
  const section = adrSection(lines, adrId);
  if (section == null) return null;
  let at = section.start + 1;
  while (at < section.end && !DIAGRAM_HEADING.test(lines[at])) at += 1;
  if (at >= section.end) return null;
  const brief = [];
  for (at += 1; at < section.end; at += 1) {
    const line = lines[at];
    if (H2_OR_H3.test(line) || line.includes(`](${DIAGRAMS_DIR}/`)) break;
    brief.push(line);
  }
  const text = brief.join("\n").trim();
  return text === "" ? null : text;
}

// The block the architect pastes under the ADR (ADR-003 §3): the SVG as an image, then the source
// and — when exported — the PNG as links.
export function renderDiagramBlock({ adrId, title, stem, sourceExt, formats }) {
  const source = `${stem}${sourceExt}`;
  const links = [`Source: [${source}](${DIAGRAMS_DIR}/${source})`];
  if (formats.includes("png")) links.push(`PNG: [${stem}.png](${DIAGRAMS_DIR}/${stem}.png)`);
  return `![${adrId} — ${title}](${DIAGRAMS_DIR}/${stem}.svg)\n\n${links.join(" · ")}`;
}

// Every image or link target under `diagrams/`, with the `## ADR-NNN` section it sits in (null
// outside any ADR — reported, not dropped, so the gate can see it), its stem and 1-based line.
// Fenced code and inline code spans are skipped: an ADR that SHOWS the block has not linked a diagram.
export function parseDiagramLinks(markdown) {
  const links = [];
  let adr = null;
  let fenced = false;
  linesOf(markdown).forEach((line, index) => {
    if (FENCE.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    if (H2.test(line)) {
      adr = ADR_HEADING.exec(line)?.[1] ?? null;
      return;
    }
    // An inline code span QUOTES a link rather than making one (this milestone's own measured-facts
    // table does exactly that), so each span is blanked before the match.
    for (const match of line.replace(/`[^`]*`/g, (span) => " ".repeat(span.length)).matchAll(DIAGRAM_LINK)) {
      const target = match[2];
      const base = target.slice(target.lastIndexOf("/") + 1);
      const dot = base.lastIndexOf(".");
      links.push({
        adr,
        stem: dot > 0 ? base.slice(0, dot) : base,
        target,
        line: index + 1,
        kind: match[1] === "!" ? "image" : "link",
      });
    }
  });
  return links;
}
