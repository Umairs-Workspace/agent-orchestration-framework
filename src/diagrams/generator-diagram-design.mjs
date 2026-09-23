// The ONE diagram-generator adapter (milestone 133, ADR-002). This file is the only place under
// `src/` that spells the generator's name (FF-13301): the registry builds its map from this
// object's own `id`, the config validator lists ids from the registry, and the architect prose
// names aof's verbs and never the tool. Swapping the generator is one config value plus one file
// like this one.
//
// THE CONTRACT is six keys, frozen: `{ id, sourceExt, locate, instructions, toSvg, readBack }`.
//   locate({ home })  → where the tool's skill lives, read from the Claude Code plugin registry
//                       under `home` (never `os.homedir()` here — the caller passes it, so suites
//                       steer it at a fixture home). It installs nothing.
//   instructions(…)   → the text the drawing agent follows. The skill is invoked BY PATH, not by
//                       the Skill tool: the architect has no Skill tool (frozen set), and Codex /
//                       OpenCode renderings have no Claude plugins at all (ADR-002 §3).
//   toSvg(text)       → the plugin's documented SVG export procedure, done in Node, pure and
//                       deterministic (ADR-005 §1).
//   readBack: null    → the reserved read-back direction (the SPEC's direction of travel). The key
//                       exists and holds null so a later item fills it without changing the shape.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { commandError } from "../command-error.mjs";

const ID = "diagram-design";
const PLUGIN_KEY = `${ID}@${ID}`;
const SKILL_REL = path.join("skills", ID, "SKILL.md");

// locate — the newest registered install of ANY scope whose SKILL.md exists, then the marketplace
// clone, else a coded miss. Measured at refine: the install here is project-scoped to ANOTHER repo,
// and that is fine — a skill at an absolute path is followable by anything that can Read.
// An unreadable or malformed registry is the same answer as an absent one (ruling 2): fall through.
function locate({ home }) {
  const pluginsDir = path.join(home, ".claude", "plugins");
  const installs = readInstalls(path.join(pluginsDir, "installed_plugins.json"))
    .filter((entry) => typeof entry?.installPath === "string" && entry.installPath.length > 0)
    .sort((a, b) => String(b.lastUpdated ?? "").localeCompare(String(a.lastUpdated ?? "")));
  for (const entry of installs) {
    const skill = path.resolve(entry.installPath, SKILL_REL);
    if (existsSync(skill)) return { ok: true, skill };
  }
  const clone = path.resolve(pluginsDir, "marketplaces", ID, SKILL_REL);
  if (existsSync(clone)) return { ok: true, skill: clone };
  return {
    ok: false,
    code: "diagram-generator-missing",
    fix: `The ${ID} Claude Code plugin is not installed. Install it with \`/plugin marketplace add cathrynlavery/${ID}\` and then \`/plugin install ${PLUGIN_KEY}\` (aof runs neither), or set work.diagrams.generator to "off".`,
  };
}

function readInstalls(registryPath) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(registryPath, "utf8"));
  } catch {
    // Absent, unreadable or not JSON: the same answer as no registry (ruling 2) — not a degrade.
    return [];
  }
  const entries = parsed?.plugins?.[PLUGIN_KEY];
  return Array.isArray(entries) ? entries : [];
}

// instructions — CONTENT is the contract (the skill path, the style or the no-style wording, the
// brief, the source path, write-nothing-else, do-not-export); the wording is this adapter's. The
// style gate (§0 of the skill) is pre-empted HERE rather than by a marker file, so aof writes
// nothing into another tool's home (ADR-002 §4).
function instructions({ brief, paths, style, skill }) {
  const styleLine = style
    ? `The effective style guide is ${style}. Use it as the style guide and skip the skill's §0 onboarding step and its profile resolution.`
    : "No project style is configured. Use the skill's shipped style guide as-is, and skip the skill's §0 onboarding step and its profile resolution.";
  return [
    `Read the diagram skill at ${skill} and follow it.`,
    styleLine,
    "The reader is not reachable during this step: do not pause for confirmation. Note any assumption you make beside the brief instead.",
    "Draw exactly one static diagram for this brief:",
    "",
    brief,
    "",
    `Write the self-contained HTML to ${paths.source} and write nothing else. Do not export it — aof exports the SVG and PNG itself.`,
  ].join("\n");
}

const SVG_NS = "http://www.w3.org/2000/svg";
const XML_PROLOG = '<?xml version="1.0" encoding="UTF-8"?>\n';

// toSvg — the plugin's §"SVG export procedure", step for step: the first <svg> block, xmlns
// ensured, viewBox required, the Google Fonts @import merged into ONE <defs> with `&` escaped,
// rgba()/transparent fill+stroke normalised, the XML prolog prepended. Pure over text.
function toSvg(sourceText) {
  const text = String(sourceText ?? "");
  const match = /<svg\b[\s\S]*?<\/svg>/i.exec(text);
  if (!match) {
    throw commandError("The diagram source holds no <svg> element to export.", "diagram-source-no-svg", 422);
  }
  let svg = match[0];
  const openTag = /^<svg\b[^>]*>/i.exec(svg)[0];
  if (!/\sviewBox\s*=/.test(openTag)) {
    throw commandError("The diagram's <svg> has no viewBox, so its size cannot be exported without guessing.", "diagram-svg-no-viewbox", 422);
  }
  if (!/\sxmlns\s*=/.test(openTag)) {
    svg = `${openTag.replace(/^<svg\b/i, `<svg xmlns="${SVG_NS}"`)}${svg.slice(openTag.length)}`;
  }

  const fontUrl = googleFontsHref(text);
  if (fontUrl != null) {
    const style = `<style>@import url('${xmlEscapeAmpersands(fontUrl)}');</style>`;
    const defs = /<defs\b[^>]*>/i.exec(svg);
    if (defs) {
      const at = defs.index + defs[0].length;
      svg = `${svg.slice(0, at)}${style}${svg.slice(at)}`;
    } else {
      const at = afterLeadingTitleDesc(svg);
      svg = `${svg.slice(0, at)}<defs>${style}</defs>${svg.slice(at)}`;
    }
  }

  svg = svg.replace(
    /(fill|stroke)="rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d*\.?\d+)\s*\)"/g,
    (_, attr, r, g, b, alpha) => `${attr}="#${hex(r)}${hex(g)}${hex(b)}" ${attr}-opacity="${alpha}"`,
  );
  svg = svg.replace(/(fill|stroke)="transparent"/g, '$1="none"');
  return `${XML_PROLOG}${svg}`;
}

function hex(channel) {
  return Number(channel).toString(16).padStart(2, "0");
}

function googleFontsHref(html) {
  for (const link of html.match(/<link\b[^>]*>/gi) ?? []) {
    const href = /\shref\s*=\s*"([^"]*)"|\shref\s*=\s*'([^']*)'/i.exec(link);
    const url = href?.[1] ?? href?.[2];
    if (url && /fonts\.googleapis\.com/i.test(url)) return url;
  }
  return null;
}

// `&amp;` already in the HTML is unescaped first, so the escape never doubles.
function xmlEscapeAmpersands(url) {
  return url.replace(/&amp;/g, "&").replace(/&/g, "&amp;");
}

// A new <defs> goes after a leading <title>/<desc>, so the accessible name stays the first child.
function afterLeadingTitleDesc(svg) {
  let at = /^<svg\b[^>]*>/i.exec(svg)[0].length;
  for (const tag of ["title", "desc"]) {
    const next = new RegExp(`^\\s*<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "i").exec(svg.slice(at));
    if (next) at += next[0].length;
  }
  return at;
}

export const diagramDesignGenerator = Object.freeze({
  id: ID,
  sourceExt: ".html",
  locate,
  instructions,
  toSvg,
  readBack: null,
});
