// How an OUTSIDER reads the filtered fleet off the rendered tree (milestone 47 / story 03).
//
// The four task features share ONE channel — the headless mount harness — and they share these
// readers so that "the banner says X" means the same thing in all four. Everything here is a
// READ of what the REAL `<Fleet/>` rendered: its text, its `title`s, its accessible names and
// the handlers on its controls. Nothing here knows a component's name, an internal prop or a
// class that is not part of a DESIGN-pinned treatment, so a build is free to restructure and
// these keep working — which is the property that makes them assertions about the PRODUCT.
import { findAll, textOf } from "./fleet-app-harness.mjs";
import { visibleTextOf } from "./mini-react.mjs";

// ── the bar ──────────────────────────────────────────────────────────────────

// The repo picker's trigger, addressed the way an operator does: by its accessible name, which
// DESIGN pins as `Filter by repo` carrying the current value.
export function trigger(tree) {
  return findAll(tree, (node) => node.type === "button" && String(node.props?.["aria-label"] ?? "").startsWith("Filter by repo"))[0] ?? null;
}

// What the trigger READS — its label, with the disclosure caret dropped. The caret is
// `aria-hidden` decoration; the label is the fact.
export function triggerLabel(tree) {
  const node = trigger(tree);
  return node == null ? null : visibleTextOf(node).replace(/\s*▾\s*$/, "").trim();
}

// The picker's rows, in render order, once it is open. Each is `{ label, path, selected, mark,
// hint, node }` — the four signals DESIGN requires a row to carry, read off the tree.
export function pickerRows(tree) {
  const listbox = findAll(tree, (node) => node.props?.role === "listbox")[0] ?? null;
  if (listbox == null) return [];
  return findAll(listbox, (node) => node.props?.role === "option").map((node) => {
    // The row's READABLE lines: its leaf spans, minus the `aria-hidden` marks (the `✓`, the
    // `✦` and the mesh-enabled dot). Those are shape signals a screen reader is deliberately
    // not given, and counting them as lines would make the row's own words unassertable.
    const lines = findAll(
      node,
      (inner) => inner.type === "span" && inner.props?.["aria-hidden"] !== "true" && (inner.children ?? []).every((child) => typeof child !== "object"),
    );
    return {
      node,
      selected: node.props?.["aria-selected"] === true,
      text: visibleTextOf(node),
      title: node.props?.title ?? null,
      lines: lines.map((line) => textOf(line)).filter((text) => text.length > 0),
    };
  });
}

// Open (or close) the picker through its REAL click handler, then settle.
export async function togglePicker(app) {
  const node = trigger(app.tree());
  await node?.props?.onClick?.({ stopPropagation() {}, preventDefault() {} });
  await app.flush();
}

// Choose a row by the label an operator reads.
export async function pickRow(app, label) {
  const row = pickerRows(app.tree()).find((entry) => entry.text.includes(label));
  if (row == null) throw new Error(`no picker row reads ${JSON.stringify(label)} — rows: ${JSON.stringify(pickerRows(app.tree()).map((r) => r.text))}`);
  await row.node.props?.onClick?.({ stopPropagation() {}, preventDefault() {} });
  await app.flush();
}

// The accessible names inside the fleet's OWN slot contribution, in render order. Used when the
// fleet is mounted ALONE (with no shell the contribution renders in place); the shell-composed
// harness answers the same question through `slotControls()`.
export function slotControlNames(tree) {
  const slot = findAll(tree, (node) => String(node.props?.className ?? "") === "flex items-center gap-3 text-xs text-muted-foreground")[0] ?? null;
  if (slot == null) return [];
  const labelled = findAll(slot, (node) => typeof node.props?.["aria-label"] === "string");
  return labelled
    .filter((node) => !labelled.some((other) => other !== node && findAll(other, (inner) => inner === node).length > 0))
    .map((node) => node.props["aria-label"]);
}

// ── R0, the banner ───────────────────────────────────────────────────────────

// The banner is the page's ONE polite status region. Addressed by that role rather than by a
// class, because "it announces politely and is never an alert" is the contract.
export function banner(tree) {
  return findAll(tree, (node) => node.props?.role === "status")[0] ?? null;
}

// The chips in the banner, in render order, as an operator reads them — `scope · Local`,
// `repo · <name>`. The chip's clear affordance is not part of its text.
export function bannerChips(tree) {
  const node = banner(tree);
  if (node == null) return [];
  return findAll(node, (child) => child.type === "span" && String(child.props?.className ?? "").includes("rounded-md border"))
    .map((chip) => visibleTextOf(chip).replace(/\s*✕\s*$/, "").trim());
}

// R0-N — the partial-intersection notice. A `<p>` inside the banner, and the ONLY one.
export function bannerNotice(tree) {
  const node = banner(tree);
  if (node == null) return null;
  const notice = findAll(node, (child) => child.type === "p")[0] ?? null;
  return notice == null ? null : visibleTextOf(notice);
}

// The chip's inline clear — a real button whose accessible name says what it clears.
export function chipClear(tree) {
  return findAll(tree, (node) => node.type === "button" && String(node.props?.["aria-label"] ?? "").startsWith("Clear repo filter"))[0] ?? null;
}

export async function clickNode(app, node) {
  await node?.props?.onClick?.({ stopPropagation() {}, preventDefault() {} });
  await app.flush();
}

// ── the regions ──────────────────────────────────────────────────────────────

// Every region header on the page, in render order, as `{ label, summary }` — read off the
// `<h2>` and the sibling summary the real `RegionHeader` renders.
export function regionHeaders(tree) {
  return findAll(tree, (node) => node.type === "h2").map((heading) => {
    const row = findAll(tree, (candidate) => (candidate.children ?? []).includes(heading))[0] ?? null;
    const summary = row == null ? "" : (row.children ?? []).filter((child) => child !== heading).map((child) => visibleTextOf(child)).join(" ").trim();
    return { label: textOf(heading), summary };
  });
}

export function regionSummary(tree, label) {
  return regionHeaders(tree).find((region) => region.label === label)?.summary ?? null;
}

// The diagnostics strip's rendered facts, as one readable line.
export function diagnosticsStrip(tree) {
  const strip = findAll(tree, (node) => String(node.props?.className ?? "").includes("bg-card/60"))[0] ?? null;
  return strip == null ? null : visibleTextOf(strip);
}

// The loading state's four reserved region placeholders, by the label they carry.
export function placeholders(tree) {
  return findAll(tree, (node) => node.props?.["aria-busy"] === "true").map((node) => node.props?.["aria-label"] ?? "");
}

// ── the whole-page states ────────────────────────────────────────────────────

// The empty card — the ONE dashed primitive all five empty conditions share.
export function emptyCard(tree) {
  return findAll(tree, (node) => String(node.props?.className ?? "").includes("border-dashed border-border bg-card/50"))[0] ?? null;
}

// `{ heading, body, recovery }` off the empty card, or null when the page is not empty.
export function emptyState(tree) {
  const card = emptyCard(tree);
  if (card == null) return null;
  const heading = findAll(card, (node) => String(node.props?.className ?? "").includes("text-[15px] font-semibold"))[0] ?? null;
  const body = findAll(card, (node) => String(node.props?.className ?? "").includes("text-[12.5px]"))[0] ?? null;
  const recovery = findAll(card, (node) => node.type === "button")[0] ?? null;
  return {
    card,
    heading: heading == null ? null : textOf(heading),
    body: body == null ? null : textOf(body),
    recovery: recovery == null ? null : textOf(recovery).trim(),
    recoveryNode: recovery,
  };
}

// The page-level error state, by the one mark and label only it renders.
export function errorState(tree) {
  const pill = findAll(tree, (node) => String(node.props?.className ?? "").includes("border-accent/30"))[0] ?? null;
  const retry = findAll(tree, (node) => node.type === "button" && textOf(node).includes("Retry"))[0] ?? null;
  return pill == null && retry == null ? null : { pill: pill == null ? null : visibleTextOf(pill), retry: retry == null ? null : visibleTextOf(retry), retryNode: retry };
}

export function refreshControl(tree) {
  return findAll(tree, (node) => node.type === "button" && node.props?.["aria-label"] === "Refresh the fleet view")[0] ?? null;
}

// Which of the four page states is on screen, read the way an operator would tell them apart.
export function pageStateOf(tree) {
  if (placeholders(tree).length > 0) return "loading";
  if (errorState(tree) != null) return "error";
  if (emptyCard(tree) != null) return "empty";
  return "populated";
}

// ── the sweep ────────────────────────────────────────────────────────────────

// EVERY STRING THE DOCUMENT PUTS IN FRONT OF A READER — its text, its `title`s and its
// accessible names — as one haystack. This is the instrument task 00's headline scenario needs
// and the reason it can name no region: "not one of <never on screen> appears ANYWHERE in the
// rendered document" is a claim about the whole tree, so a region a later milestone adds is
// inside the sentence on the day it is added.
// Whether the document MENTIONS a fact, with the one boundary rule a naive substring sweep
// needs and does not have.
//
// MEASURED, and it is the "gate wrong about the tree rather than about the rule" species this
// milestone keeps catching: the fixture's publishing NODE is `control-a`, whose id CONTAINS the
// workspace name `control`, and the stale badge's `title` renders it verbatim ("Last synced from
// control-a"). A plain `includes("control")` therefore reports a workspace leak on a page whose
// only mention is a NODE id — a machine-wide fact that carries no workspace identity at all,
// which is precisely what the sweep's own wording exempts. The boundary treats `-` as part of a
// word, so `control` does not match inside `control-a` while `Portal Only` still matches its own
// text exactly. It is deliberately NOT a general softening: any occurrence of the whole token
// still fails.
export function mentionsFact(haystack, fact) {
  const escaped = fact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`).test(haystack);
}

export function documentFacts(tree) {
  const parts = [];
  const walk = (node) => {
    if (node == null || typeof node !== "object") {
      if (typeof node === "string") parts.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    for (const key of ["title", "aria-label", "aria-labelledby", "alt", "placeholder", "value", "href"]) {
      const value = node.props?.[key];
      if (typeof value === "string" && value.length > 0) parts.push(value);
    }
    for (const child of node.children ?? []) walk(child);
  };
  walk(tree);
  return parts.join(" ");
}
