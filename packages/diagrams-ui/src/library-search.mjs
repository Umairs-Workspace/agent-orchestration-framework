// LIBRARY SEARCH (milestone 171 / ADR-002) — pure: no React, no DOM, no SDK. The editor already holds
// every library item from both roots (the `libraries` action, a project file shadowing a global one);
// search is a filter over those items, by item name or library name, and a result is inserted
// through the SDK's own library drop so it carries exactly the elements — and the
// `customData.aof.lib` tag — that `libraryItemsFor` gives the Library panel.

// The SDK's library drag type (`MIME_TYPES.excalidrawlib`), the one its canvas drop handler reads.
export const LIBRARY_MIME = "application/vnd.excalidrawlib+json";
export const NO_LIBRARIES = "No libraries. Add .excalidrawlib files to ~/.aof/diagrams/libraries or .aof/diagrams/libraries.";
export const noMatch = (query) => `No item matches ${String(query ?? "").trim()}`;

const words = (query) => String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);

// The entries matching every word of the query in their item or library name, ignoring case: the
// items whose name starts with the query first, then the rest, each group in load order (library,
// then item). The empty query is every entry in load order. Each result keeps its `index` in the
// loaded list, which is the index of its Library-panel item in `libraryItemsFor(entries)`.
export function searchLibraries(entries, query) {
  const list = (Array.isArray(entries) ? entries : []).map((entry, index) => ({ entry, index }));
  const wanted = words(query);
  if (!wanted.length) return list;
  const phrase = wanted.join(" ");
  const matches = list.filter(({ entry }) => {
    const haystack = `${entry?.item ?? ""} ${entry?.library ?? ""}`.toLowerCase();
    return wanted.every((word) => haystack.includes(word));
  });
  const leads = ({ entry }) => String(entry?.item ?? "").toLowerCase().startsWith(phrase);
  return [...matches.filter(leads), ...matches.filter((result) => !leads(result))];
}

// What the search says above its results: where libraries go, the count, or that nothing matched.
export function searchSummary(entries, query, results) {
  if (!Array.isArray(entries) || entries.length === 0) return NO_LIBRARIES;
  if (!results.length) return noMatch(query);
  return `${results.length} item${results.length === 1 ? "" : "s"}`;
}

// A result's insertion: the Library panel's own item for it — never a re-tagged copy.
export function insertionFor(result, libraryItems) {
  return Array.isArray(libraryItems) ? libraryItems[result?.index] ?? null : null;
}

// The drag payload the SDK's drop handler reads, in the shape its `serializeLibraryAsJSON` writes.
export function libraryDrag(item, source) {
  return { type: LIBRARY_MIME, data: JSON.stringify({ type: "excalidrawlib", version: 2, source: String(source ?? ""), libraryItems: [item] }, null, 2) };
}
