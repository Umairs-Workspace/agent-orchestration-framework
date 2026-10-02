// The ONE answer to "does this module's source declare `symbol` as a member of its surface?" —
// shared by the loader's ceiling pointers and the groundedness anchors, so a `module:<path>#<symbol>`
// pointer cannot resolve for one reader and be stale for the other.
//
// A symbol is declared when the module EXPORTS it (`export function|class|const|let|var X`, or
// `export { X }` / `export { y as X }`), or when it is a member of the surface the module's factory
// RETURNS (`return Object.freeze({ …, X, … })` / `return { …, X, … }`). The second form is how a
// workspace implementation composes its services, so a pointer that names such a member is honest.
// Pure over text: it reads nothing and runs nothing.

function escapeSymbol(symbol) {
  return symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function moduleDeclares(source, symbol) {
  if (typeof source !== "string" || typeof symbol !== "string" || symbol.length === 0) return false;
  const declaration = new RegExp(
    `^[\\t ]*export[\\t ]+(?:default[\\t ]+)?(?:async[\\t ]+)?(?:function|class|const|let|var)[\\t ]+${escapeSymbol(symbol)}\\b`,
    "mu",
  );
  if (declaration.test(source)) return true;

  for (const match of source.matchAll(/^[\t ]*export[\t ]*\{([^}]*)\}/gmu)) {
    for (const entry of match[1].split(",")) {
      const parts = entry.trim().split(/\s+as\s+/u);
      if ((parts[1] ?? parts[0]) === symbol) return true;
    }
  }

  for (const match of source.matchAll(/\breturn\s+(?:Object\.freeze\(\s*)?\{([^}]*)\}/gu)) {
    for (const entry of match[1].split(",")) {
      if (entry.trim().split(/\s*:/u)[0] === symbol) return true;
    }
  }
  return false;
}
